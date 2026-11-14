"""
S3 storage helpers for floor layout uploads.
"""

from __future__ import annotations

import io
import logging
import re
from functools import lru_cache
from xml.etree.ElementTree import (
    Element,
    ParseError,
)

import boto3
from boto3.exceptions import S3UploadFailedError
from botocore.client import BaseClient
from botocore.exceptions import BotoCoreError, ClientError
from defusedxml.ElementTree import fromstring
from fastapi import HTTPException, UploadFile, status

from backend.core.app_logging import LOGGER_NAME
from backend.core.config import get_settings
from backend.core.retry import aws_retry

logger = logging.getLogger(f"{LOGGER_NAME}.storage")


@lru_cache
def get_s3_client() -> BaseClient:
    settings = get_settings()
    return boto3.client(
        "s3",
        region_name=settings.aws_region,
    )



# SVG is rendered inline by the frontend viewer (dangerouslySetInnerHTML), so
# any element/attribute capable of running script would execute in the
# context of an authenticated user's session (stored XSS). Rather than
# denylisting known-bad patterns -- which an attacker can route around with
# event handlers or elements not on the list -- this parses the SVG and keeps
# only an explicit allowlist of elements/attributes a floor-plan export from
# a design tool actually needs, dropping everything else.
_SVG_NS = "http://www.w3.org/2000/svg"

_ALLOWED_TAGS: frozenset[str] = frozenset(
    {
        "svg", "g", "defs", "title", "desc", "symbol", "style",
        "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
        "text", "tspan", "use", "linearGradient", "radialGradient", "stop",
        "clipPath", "mask", "pattern", "image",
    }
)

# Any attribute matching this is an event handler (onload, onclick, onbegin,
# onmouseenter, ...) -- there is no legitimate reason for a static floor-plan
# SVG to carry one.
_EVENT_ATTR_RE = re.compile(r"^on", re.IGNORECASE)

_HREF_ATTRS = frozenset({"href", "{http://www.w3.org/1999/xlink}href"})
_SAFE_HREF_RE = re.compile(r"^(#|data:image/)", re.IGNORECASE)


def _local_tag(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _check_element(element: Element) -> None:
    """Raise ValueError the moment anything not on the allowlist is found,
    anywhere in the tree. The upload is rejected outright rather than
    silently stripped, so an admin never ends up publishing a floor layout
    that silently renders differently than the file they picked."""
    if _local_tag(element.tag) not in _ALLOWED_TAGS:
        raise ValueError(f"disallowed element <{_local_tag(element.tag)}>")

    for attr_name, value in element.attrib.items():
        local = _local_tag(attr_name)
        if _EVENT_ATTR_RE.match(local):
            raise ValueError(f"disallowed event-handler attribute {local!r}")
        if attr_name in _HREF_ATTRS and not _SAFE_HREF_RE.match(value):
            raise ValueError(f"disallowed href value {value!r}")

    for child in element:
        _check_element(child)


def _sanitize_svg(content: bytes) -> bytes:
    """Parse `content` with a hardened XML parser (no external entities, no
    DTD expansion), reject it outright if anything outside the allowlist is
    present anywhere in the tree, and otherwise return it re-serialized from
    the parsed tree. Raises ValueError on unparseable or unsafe XML."""
    try:
        root = fromstring(content)
    except (ParseError, ValueError) as exc:
        raise ValueError("not well-formed XML") from exc

    if _local_tag(root.tag) != "svg":
        raise ValueError("root element is not <svg>")
    _check_element(root)

    from xml.etree.ElementTree import register_namespace, tostring

    register_namespace("", _SVG_NS)
    return tostring(root, encoding="utf-8", xml_declaration=True)


def validate_svg_file(file: UploadFile) -> bytes:
    """Validate and sanitize an uploaded SVG, returning the cleaned bytes
    that should actually be stored (never the caller's original bytes)."""
    filename = (file.filename or "").lower()

    if not filename.endswith(".svg"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_file_type",
                "message": "Only SVG files are allowed.",
            },
        )

    if file.content_type not in {
        "image/svg+xml",
        "application/svg+xml",
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_content_type",
                "message": "Invalid SVG content type.",
            },
        )

    file.file.seek(0)
    content = file.file.read()
    file.file.seek(0)

    try:
        return _sanitize_svg(content)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "unsafe_svg_content",
                "message": "The uploaded SVG could not be safely parsed or contains disallowed content.",
            },
        ) from None


def resolve_layout_file_url(stored_url: str | None) -> str | None:
    """Turn a stored floor-layout URL into a time-limited presigned S3 URL,
    generated fresh on every read.

    Storage still writes the plain `{aws_s3_public_base_url}/{key}` value
    at upload time (see upload_svg_to_s3 below) -- no DB migration or
    backfill needed, existing rows work unchanged. This only changes what
    a client is handed: the bucket is already private (see template.yaml),
    so that stored value was never directly fetchable on its own -- this
    is what actually makes it resolve, with access expiring on its own
    (s3_presigned_url_ttl_seconds) instead of needing to be revoked.

    Called from every response schema whose layout_file_url field carries
    one (a Pydantic field_validator, not scattered across call sites --
    see FloorLayoutResponse, FloorLayoutInfo, ScheduledFloorLayoutInfo,
    FloorResponse), so every read path gets this uniformly.
    """
    if not stored_url:
        return stored_url

    settings = get_settings()
    prefix = f"{settings.aws_s3_public_base_url}/"
    if not stored_url.startswith(prefix):
        # Unexpected shape (a raw key already, a different host, ...) --
        # hand it back rather than guess at how to parse it.
        return stored_url

    object_key = stored_url[len(prefix):]
    s3_client = get_s3_client()

    try:
        return s3_client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": settings.aws_s3_bucket_name,
                "Key": object_key,
            },
            ExpiresIn=settings.s3_presigned_url_ttl_seconds,
        )
    except (BotoCoreError, ClientError):
        logger.exception("s3.presign.failed key=%s", object_key)
        return stored_url


def build_layout_object_key(
    *,
    tenant_id: str,
    site_id: str,
    building_id: str,
    floor_id: str,
    version_no: int,
) -> str:
    return (
        f"tenant_{tenant_id}/"
        f"site_{site_id}/"
        f"building_{building_id}/"
        f"floor_{floor_id}/"
        f"layouts/"
        f"v{version_no}/"
        f"layout.svg"
    )


def upload_svg_to_s3(
    *,
    file: UploadFile,
    tenant_id: str,
    site_id: str,
    building_id: str,
    floor_id: str,
    version_no: int,
) -> str:
    sanitized_content = validate_svg_file(file)
    settings = get_settings()

    object_key = build_layout_object_key(
        tenant_id=tenant_id,
        site_id=site_id,
        building_id=building_id,
        floor_id=floor_id,
        version_no=version_no,
    )

    s3_client = get_s3_client()

    @aws_retry(
        logger=logger,
        operation_name="s3.upload_floor_layout_svg",
        max_retries=settings.aws_s3_max_retries,
        initial_delay_seconds=settings.aws_retry_initial_delay_seconds,
        max_delay_seconds=settings.aws_retry_max_delay_seconds,
    )
    def upload_with_retry() -> None:
        # Upload the sanitized bytes (see validate_svg_file / _sanitize_svg),
        # never the caller-supplied original content.
        s3_client.upload_fileobj(
            Fileobj=io.BytesIO(sanitized_content),
            Bucket=settings.aws_s3_bucket_name,
            Key=object_key,
            ExtraArgs={
                "ContentType": "image/svg+xml",
            },
        )

    logger.info(
        "s3.upload.start bucket=%s key=%s tenant_id=%s floor_id=%s version_no=%s",
        settings.aws_s3_bucket_name,
        object_key,
        tenant_id,
        floor_id,
        version_no,
    )

    try:
        upload_with_retry()
    except (BotoCoreError, ClientError, S3UploadFailedError):
        logger.exception(
            "s3.upload.failed bucket=%s key=%s tenant_id=%s floor_id=%s version_no=%s",
            settings.aws_s3_bucket_name,
            object_key,
            tenant_id,
            floor_id,
            version_no,
        )
        raise

    logger.info(
        "s3.upload.success bucket=%s key=%s tenant_id=%s floor_id=%s version_no=%s",
        settings.aws_s3_bucket_name,
        object_key,
        tenant_id,
        floor_id,
        version_no,
    )

    return f"{settings.aws_s3_public_base_url}/{object_key}"
