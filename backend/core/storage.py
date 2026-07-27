"""
S3 storage helpers for floor layout uploads.
"""

from __future__ import annotations

import logging
from functools import lru_cache

import boto3
from boto3.exceptions import S3UploadFailedError
from botocore.client import BaseClient
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException, UploadFile, status

from backend.core.config import get_settings
from backend.core.app_logging import LOGGER_NAME
from backend.core.retry import aws_retry

logger = logging.getLogger(f"{LOGGER_NAME}.storage")


@lru_cache
def get_s3_client() -> BaseClient:
    settings = get_settings()
    return boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )



# SVG is rendered inline by the frontend viewer, so any of these constructs
# would execute in the context of an authenticated user's session (stored
# XSS). A legitimate floor-plan export from a design tool never needs them.
_DISALLOWED_SVG_PATTERNS: tuple[bytes, ...] = (
    b"<script",
    b"javascript:",
    b"<foreignobject",
    b"<iframe",
    b"<embed",
    b"<object",
    b"onload=",
    b"onerror=",
    b"onclick=",
    b"onmouseover=",
    b"onfocus=",
)


def validate_svg_file(file: UploadFile) -> None:
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

    lowered = content.lower()
    if any(pattern in lowered for pattern in _DISALLOWED_SVG_PATTERNS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "unsafe_svg_content",
                "message": "The uploaded SVG contains disallowed executable content.",
            },
        )


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
    validate_svg_file(file)
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
        file.file.seek(0)
        s3_client.upload_fileobj(
            Fileobj=file.file,
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
