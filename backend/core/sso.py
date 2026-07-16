"""Microsoft SSO and Graph integration helpers.

This module encapsulates the OAuth authorization-code exchange with Microsoft,
ID token verification against tenant JWKS keys, and selected Microsoft Graph
API calls used by the backend's SSO flow.
"""

from __future__ import annotations

import logging
import secrets
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode

import requests
from jose import ExpiredSignatureError, JWTError, jwt

from backend.core.app_logging import LOGGER_NAME
from backend.core.config import get_settings

logger = logging.getLogger(f"{LOGGER_NAME}.sso")

MICROSOFT_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"
MICROSOFT_TOKEN_BASE_URL = "https://login.microsoftonline.com"
STATE_TTL_SECONDS = 600
MICROSOFT_SCOPES = (
    "openid",
    "profile",
    "email",
    "offline_access",
    "User.Read",
    "User.Read.All",
    "GroupMember.Read.All",
)


@dataclass(frozen=True)
class SSOError(Exception):
    """Structured exception used for OAuth and token-verification failures.

    The route layer converts this error directly into a public API response
    without needing to infer status codes or provider details from raw
    exceptions.
    """

    status_code: int
    code: str
    message: str
    details: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        """Serialize the error into the backend's public error shape.

        Returns:
            dict[str, Any]: Dictionary containing the stable error code,
            message, and optional detail payload.

        Side Effects:
            None.

        Failure Modes:
            None expected under normal runtime conditions.
        """
        payload: dict[str, Any] = {
            "code": self.code,
            "message": self.message,
        }
        if self.details:
            payload["details"] = self.details
        return payload


class GraphAPIError(SSOError):
    """Structured exception for Microsoft Graph request failures."""

    pass


def build_auth_url() -> tuple[str, str]:
    """Create the Microsoft authorization URL and CSRF state token.

    Returns:
        tuple[str, str]: The redirect URL for Microsoft login and the generated
        opaque state value that should be stored client-side.

    Side Effects:
        Uses cryptographically secure randomness and reads cached settings.

    Failure Modes:
        Propagates configuration-loading errors if required OAuth settings are
        missing or invalid.
    """
    settings = get_settings()
    state = secrets.token_urlsafe(32)
    query = urlencode(
        {
            "client_id": settings.client_id,
            "response_type": "code",
            "redirect_uri": settings.redirect_uri,
            "response_mode": "query",
            "scope": " ".join(MICROSOFT_SCOPES),
            "state": state,
            "prompt": "select_account",
        }
    )
    return f"{settings.auth_url}?{query}", state


def exchange_code_for_token(code: str) -> dict[str, str]:
    settings = get_settings()

    if not code:
        raise SSOError(
            status_code=400,
            code="missing_authorization_code",
            message="Microsoft callback did not include an authorization code.",
        )

    logger.debug("sso.token_exchange.request url=%s", settings.token_url)

    try:
        response = requests.post(
            settings.token_url,
            data={
                "client_id": settings.client_id,
                "client_secret": settings.client_secret,
                "code": code,
                "redirect_uri": settings.redirect_uri,
                "grant_type": "authorization_code",
                "scope": " ".join(MICROSOFT_SCOPES),
            },
            timeout=20,
        )

        logger.debug("sso.token_exchange.response status=%s", response.status_code)

    except Exception:
        logger.exception("sso.token_exchange.request_failed")
        raise

    payload = _safe_json(response)

    logger.debug("sso.token_exchange.payload_keys keys=%s", sorted(payload.keys()))

    if response.status_code != 200:
        logger.warning(
            "sso.token_exchange.failed status=%s error=%s",
            response.status_code,
            _provider_error_details(payload),
        )

        raise SSOError(
            status_code=400,
            code="token_exchange_failed",
            message="Microsoft token exchange failed.",
            details=_provider_error_details(payload),
        )

    access_token = payload.get("access_token")
    id_token = payload.get("id_token")

    if not access_token:
        raise SSOError(
            status_code=400,
            code="missing_access_token",
            message="Microsoft token response did not include an access_token.",
            details=_provider_error_details(payload),
        )

    if not id_token:
        raise SSOError(
            status_code=400,
            code="missing_id_token",
            message="Microsoft token response did not include an id_token.",
            details=_provider_error_details(payload),
        )

    return {
        "access_token": str(access_token),
        "id_token": str(id_token),
    }


def exchange_client_credentials_for_graph_token() -> str:
    """Fetch an app-only Microsoft Graph token for background role sync."""
    settings = get_settings()
    try:
        response = requests.post(
            f"{MICROSOFT_TOKEN_BASE_URL}/{settings.tenant_id}/oauth2/v2.0/token",
            data={
                "client_id": settings.client_id,
                "client_secret": settings.client_secret,
                "grant_type": "client_credentials",
                "scope": "https://graph.microsoft.com/.default",
            },
            timeout=20,
        )
    except requests.RequestException as exc:
        raise GraphAPIError(
            status_code=502,
            code="graph_token_request_failed",
            message="Microsoft Graph app token request failed.",
        ) from exc

    payload = _safe_json(response)
    if response.status_code != 200:
        raise GraphAPIError(
            status_code=502 if response.status_code >= 500 else response.status_code,
            code="graph_token_exchange_failed",
            message="Microsoft Graph app token exchange failed.",
            details=_provider_error_details(payload),
        )

    access_token = str(payload.get("access_token") or "").strip()
    if not access_token:
        raise GraphAPIError(
            status_code=502,
            code="missing_graph_app_token",
            message="Microsoft Graph app token response did not include an access_token.",
            details=_provider_error_details(payload),
        )
    return access_token

def verify_id_token(id_token: str) -> dict[str, Any]:
    """Validate a Microsoft ID token against tenant signing keys.

    Args:
        id_token: Encoded Microsoft ID token.

    Returns:
        dict[str, Any]: Decoded and verified token claims.

    Side Effects:
        Fetches the current tenant JWKS document over the network.

    Failure Modes:
        Raises ``SSOError`` when the token is missing, expired, invalid, signed
        with an unknown key, or issued for the wrong tenant.
    """
    settings = get_settings()
    if not id_token:
        raise SSOError(
            status_code=401,
            code="missing_id_token",
            message="Microsoft id_token is required.",
        )

    jwks = _fetch_jwks()
    signing_key = _resolve_signing_key(id_token, jwks)

    try:
        claims = jwt.decode(
            id_token,
            signing_key,
            algorithms=["RS256"],
            audience=settings.client_id,
            issuer=f"https://login.microsoftonline.com/{settings.tenant_id}/v2.0",
        )
    except ExpiredSignatureError as exc:
        raise SSOError(
            status_code=401,
            code="expired_id_token",
            message="Microsoft id_token has expired.",
        ) from exc
    except JWTError as exc:
        raise SSOError(
            status_code=401,
            code="invalid_id_token",
            message="Microsoft id_token validation failed.",
        ) from exc

    if str(claims.get("tid") or "") != settings.tenant_id:
        raise SSOError(
            status_code=401,
            code="tenant_mismatch",
            message="Microsoft id_token tenant did not match the configured tenant.",
        )

    return claims


def fetch_graph_me(access_token: str) -> dict[str, Any]:
    """Fetch the signed-in Microsoft user's profile from Graph.

    Args:
        access_token: Microsoft Graph bearer token.

    Returns:
        dict[str, Any]: Provider response for the ``/me`` endpoint.

    Side Effects:
        Performs an outbound HTTP GET to Microsoft Graph.

    Failure Modes:
        Raises ``GraphAPIError`` when the token is missing or the request
        cannot be completed successfully.
    """
    return _graph_get(
        access_token,
        "/me",
        params={
            "$select": (
                "id,displayName,givenName,surname,mail,userPrincipalName,"
                "mobilePhone,businessPhones,jobTitle,department,companyName,"
                "employeeId,officeLocation,city,state,country"
            ),
        },
    )


def fetch_graph_groups(access_token: str) -> dict[str, Any]:
    """Fetch Microsoft Graph group memberships for the signed-in user.

    Args:
        access_token: Microsoft Graph bearer token.

    Returns:
        dict[str, Any]: Provider response for the ``/me/memberOf`` endpoint.

    Side Effects:
        Performs an outbound HTTP GET to Microsoft Graph.

    Failure Modes:
        Raises ``GraphAPIError`` when the token is missing or the request
        cannot be completed successfully.
    """
    return _graph_get(
        access_token,
        "/me/memberOf",
        params={"$select": "id,displayName"},
    )


def check_graph_group_membership(
    access_token: str,
    *,
    group_id: str,
    microsoft_object_id: str,
) -> bool:
    """Return whether the current Microsoft user object belongs to a group."""
    group_id = str(group_id or "").strip()
    microsoft_object_id = str(microsoft_object_id or "").strip()
    if not group_id:
        raise GraphAPIError(
            status_code=500,
            code="missing_graph_group_id",
            message="GRAPH_FACILITATOR_GROUP_ID is required for Graph role lookup.",
        )
    if not microsoft_object_id:
        raise GraphAPIError(
            status_code=400,
            code="missing_microsoft_object_id",
            message="Microsoft object id is required for Graph role lookup.",
        )

    try:
        _graph_get(
            access_token,
            f"/groups/{group_id}/members/{microsoft_object_id}/$ref",
        )
    except GraphAPIError as exc:
        if exc.status_code == 404:
            return False
        raise
    return True


def fetch_graph_group_member_ids(access_token: str, *, group_id: str) -> set[str]:
    """Fetch all direct Graph member object IDs for a group."""
    group_id = str(group_id or "").strip()
    if not group_id:
        raise GraphAPIError(
            status_code=500,
            code="missing_graph_group_id",
            message="GRAPH_FACILITATOR_GROUP_ID is required for Graph role sync.",
        )

    member_ids: set[str] = set()
    url_or_path: str | None = f"/groups/{group_id}/members"
    params: dict[str, str] | None = {"$select": "id", "$top": "999"}
    while url_or_path:
        payload = _graph_get(access_token, url_or_path, params=params)
        members = payload.get("value", [])
        if not isinstance(members, list):
            raise GraphAPIError(
                status_code=502,
                code="invalid_graph_group_members_payload",
                message="Microsoft Graph group members response was invalid.",
            )
        for member in members:
            if not isinstance(member, dict):
                continue
            object_id = str(member.get("id") or "").strip()
            if object_id:
                member_ids.add(object_id)
        next_link = str(payload.get("@odata.nextLink") or "").strip()
        url_or_path = next_link or None
        params = None
    return member_ids


def fetch_graph_users_with_department(access_token: str) -> dict[str, str | None]:
    """Fetch {graph_object_id: department} for every user in the tenant directory.

    Used by the background department/team sync so drift can be detected for
    users who haven't logged in recently, mirroring the app-only, paginated
    listing pattern used for Graph group membership.
    """
    departments: dict[str, str | None] = {}
    url_or_path: str | None = "/users"
    params: dict[str, str] | None = {"$select": "id,department", "$top": "999"}
    while url_or_path:
        payload = _graph_get(access_token, url_or_path, params=params)
        users = payload.get("value", [])
        if not isinstance(users, list):
            raise GraphAPIError(
                status_code=502,
                code="invalid_graph_users_payload",
                message="Microsoft Graph users response was invalid.",
            )
        for user in users:
            if not isinstance(user, dict):
                continue
            object_id = str(user.get("id") or "").strip().lower()
            if object_id:
                departments[object_id] = str(user.get("department") or "").strip() or None
        next_link = str(payload.get("@odata.nextLink") or "").strip()
        url_or_path = next_link or None
        params = None
    return departments


def fetch_graph_manager(access_token: str) -> dict[str, Any]:
    """Fetch the signed-in user's manager relationship from Microsoft Graph.

    Args:
        access_token: Microsoft Graph bearer token.

    Returns:
        dict[str, Any]: Provider response for the ``/me/manager`` endpoint.

    Side Effects:
        Performs an outbound HTTP GET to Microsoft Graph.

    Failure Modes:
        Raises ``GraphAPIError`` when the token is missing or the request
        cannot be completed successfully.
    """
    return _graph_get(access_token, "/me/manager")


def _fetch_jwks():
    settings = get_settings()

    logger.debug("sso.jwks.request url=%s", settings.jwks_url)

    try:
        response = requests.get(
            settings.jwks_url,
            timeout=20,
        )

        logger.debug("sso.jwks.response status=%s", response.status_code)

        response.raise_for_status()

    except Exception:
        logger.exception("sso.jwks.fetch_failed")
        raise

    payload = _safe_json(response)

    logger.debug("sso.jwks.keys_loaded count=%s", len(payload.get("keys", [])))

    return payload


def _resolve_signing_key(id_token: str, jwks: dict[str, Any]) -> dict[str, Any]:
    """Select the JWKS entry matching the token's ``kid`` header.

    Args:
        id_token: Encoded Microsoft ID token.
        jwks: Previously fetched JWKS document.

    Returns:
        dict[str, Any]: Matching signing-key record from the JWKS payload.

    Side Effects:
        None.

    Failure Modes:
        Raises ``SSOError`` when the token header cannot be parsed or no
        corresponding signing key is found.
    """
    try:
        header = jwt.get_unverified_header(id_token)
    except JWTError as exc:
        raise SSOError(
            status_code=401,
            code="invalid_id_token_header",
            message="Microsoft id_token header is invalid.",
        ) from exc

    kid = str(header.get("kid") or "")
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key

    raise SSOError(
        status_code=401,
        code="signing_key_not_found",
        message="No matching Microsoft signing key was found for the id_token.",
    )


def _graph_get(
    access_token: str,
    path: str,
    *,
    params: dict[str, str] | None = None,
) -> dict[str, Any]:

    logger.debug("sso.graph.request path=%s", path)

    if not access_token:
        raise GraphAPIError(
            status_code=401,
            code="missing_access_token",
            message="Session is missing the Microsoft access token.",
        )

    try:
        url = path if path.startswith("https://") else f"{MICROSOFT_GRAPH_BASE_URL}{path}"
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
            timeout=20,
        )

        logger.debug("sso.graph.response path=%s status=%s", path, response.status_code)

    except requests.RequestException:
        logger.exception("sso.graph.request_failed path=%s", path)
        raise GraphAPIError(
            status_code=502,
            code="graph_request_unavailable",
            message="Microsoft Graph request could not be completed.",
        ) from exc

    payload = _safe_json(response)

    if response.status_code == 403:
        raise GraphAPIError(
            status_code=403,
            code="insufficient_privileges",
            message="The signed-in user or app does not have enough Microsoft Graph permissions.",
            details=_provider_error_details(payload),
        )

    if response.status_code == 404:
        raise GraphAPIError(
            status_code=404,
            code="graph_resource_not_found",
            message="The requested Microsoft Graph resource was not found.",
            details=_provider_error_details(payload),
        )

    if response.status_code >= 400:
        raise GraphAPIError(
            status_code=502 if response.status_code >= 500 else response.status_code,
            code="graph_request_failed",
            message="Microsoft Graph request failed.",
            details=_provider_error_details(payload),
        )

    logger.debug("sso.graph.success path=%s", path)

    return payload


def _safe_json(response: requests.Response) -> dict[str, Any]:
    """Parse a provider response body into a dictionary when possible.

    Args:
        response: HTTP response returned by ``requests``.

    Returns:
        dict[str, Any]: JSON object payload, wrapped non-dict JSON content, or
        an empty dictionary when the response body is empty or invalid JSON.

    Side Effects:
        Consumes the response body for JSON decoding.

    Failure Modes:
        None. Invalid JSON is treated as an empty payload.
    """
    if not response.content:
        return {}
    try:
        payload = response.json()
    except ValueError:
        return {}
    return payload if isinstance(payload, dict) else {"data": payload}


def _provider_error_details(payload: dict[str, Any]) -> dict[str, Any] | None:
    """Extract provider-specific error fields for downstream API responses.

    Args:
        payload: Parsed provider response payload.

    Returns:
        dict[str, Any] | None: Reduced error details when recognizable provider
        error fields exist, otherwise the original payload or ``None``.

    Side Effects:
        None.

    Failure Modes:
        None. Missing or partial fields simply produce a smaller detail object.
    """
    if not payload:
        return None

    details: dict[str, Any] = {}
    error = payload.get("error")
    error_description = payload.get("error_description")

    if isinstance(error, str) and error:
        details["provider_error"] = error
    elif isinstance(error, dict):
        if error.get("code"):
            details["provider_error"] = error["code"]
        if error.get("message"):
            details["provider_message"] = error["message"]

    if isinstance(error_description, str) and error_description:
        details["provider_message"] = error_description

    return details or payload
