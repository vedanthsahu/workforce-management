"""Runtime configuration loading for the backend service."""

from __future__ import annotations

from functools import lru_cache
from urllib.parse import urlparse

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_JWT_ALLOWED_CLAIMS = (
    "user_id",
    "sub",
    "email",
    "role",
    "tenant_id",
    "session_id",
    "iat",
    "exp",
)


def _is_https_url(url: str) -> bool:
    """Return whether a configured URL uses HTTPS."""
    return urlparse(url).scheme.lower() == "https"


def _parse_csv(value: str | tuple[str, ...] | list[str], *, field_name: str) -> tuple[str, ...]:
    if isinstance(value, tuple):
        values = tuple(str(item).strip() for item in value if str(item).strip())
    elif isinstance(value, list):
        values = tuple(str(item).strip() for item in value if str(item).strip())
    else:
        values = tuple(part.strip() for part in value.split(",") if part.strip())

    if not values:
        raise ValueError(f"{field_name} must contain at least one value")
    return values


class Settings(BaseSettings):
    """Environment-backed runtime settings shared across the backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        frozen=True,
    )

    db_host: str
    db_name: str
    db_user: str
    db_password: str
    db_port: int = 5432
    db_sslmode: str = "require"
    db_connect_timeout: int = 10

    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_ttl: int | None = None
    jwt_refresh_token_ttl: int = 30 * 24 * 60 * 60
    jwt_allowed_claims: str | tuple[str, ...] = DEFAULT_JWT_ALLOWED_CLAIMS
    jwt_expire_hours: int | None = Field(default=None, repr=False)

    auth_cookie_secure: bool | None = None
    auth_cookie_samesite: str = "lax"

    client_id: str
    client_secret: str
    tenant_id: str
    redirect_uri: str
    frontend_url: str
    session_ttl: int = 3600

    aws_access_key_id: str
    aws_secret_access_key: str
    aws_region: str
    aws_s3_bucket_name: str
    aws_s3_public_base_url: str
    aws_s3_max_retries: int = 3

    aws_ses_access_key_id: str
    aws_ses_secret_access_key: str
    aws_ses_sender_email: str
    aws_ses_max_retries: int = 3
    aws_retry_initial_delay_seconds: float = 1.0
    aws_retry_max_delay_seconds: float = 10.0

    email_template_dir: str = "templates/email"
    notification_admin_emails: str | tuple[str, ...] = ()

    graph_talent_group_id: str | None = None
    graph_role_lookup_retries: int = 2
    graph_role_lookup_backoff_seconds: float = 0.5
    graph_role_sync_enabled: bool = False
    graph_role_sync_interval_minutes: int = 60

    app_log_level: str = "INFO"
    app_trace_functions: bool = False

    @field_validator("frontend_url")
    @classmethod
    def _strip_frontend_url(cls, value: str) -> str:
        return value.rstrip("/")

    @field_validator("auth_cookie_samesite")
    @classmethod
    def _validate_cookie_samesite(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"lax", "strict", "none"}:
            raise ValueError("auth_cookie_samesite must be one of: lax, strict, none")
        return normalized

    @model_validator(mode="after")
    def _apply_derived_defaults(self) -> "Settings":
        access_token_ttl = self.jwt_access_token_ttl
        if access_token_ttl is None:
            access_token_ttl = (
                self.jwt_expire_hours * 3600
                if self.jwt_expire_hours is not None
                else 900
            )
            object.__setattr__(self, "jwt_access_token_ttl", access_token_ttl)

        if access_token_ttl <= 0:
            raise ValueError("jwt_access_token_ttl must be greater than zero")

        if self.jwt_refresh_token_ttl <= 0:
            raise ValueError("jwt_refresh_token_ttl must be greater than zero")

        if self.session_ttl <= 0:
            raise ValueError("session_ttl must be greater than zero")

        if self.auth_cookie_secure is None:
            object.__setattr__(
                self,
                "auth_cookie_secure",
                _is_https_url(self.frontend_url) or _is_https_url(self.redirect_uri),
            )

        object.__setattr__(
            self,
            "jwt_allowed_claims",
            _parse_csv(self.jwt_allowed_claims, field_name="jwt_allowed_claims"),
        )

        object.__setattr__(
            self,
            "notification_admin_emails",
            _parse_optional_csv(self.notification_admin_emails),
        )

        if self.aws_s3_max_retries < 0:
            raise ValueError("aws_s3_max_retries must be greater than or equal to zero")
        if self.aws_ses_max_retries < 0:
            raise ValueError("aws_ses_max_retries must be greater than or equal to zero")
        if self.aws_retry_initial_delay_seconds <= 0:
            raise ValueError("aws_retry_initial_delay_seconds must be greater than zero")
        if self.aws_retry_max_delay_seconds < self.aws_retry_initial_delay_seconds:
            raise ValueError(
                "aws_retry_max_delay_seconds must be greater than or equal to aws_retry_initial_delay_seconds"
            )
        if self.graph_role_lookup_retries < 0:
            raise ValueError("graph_role_lookup_retries must be greater than or equal to zero")
        if self.graph_role_lookup_backoff_seconds < 0:
            raise ValueError("graph_role_lookup_backoff_seconds must be greater than or equal to zero")
        if self.graph_role_sync_interval_minutes <= 0:
            raise ValueError("graph_role_sync_interval_minutes must be greater than zero")

        graph_group_id = str(self.graph_talent_group_id or "").strip()
        object.__setattr__(
            self,
            "graph_talent_group_id",
            graph_group_id or None,
        )

        return self

    @property
    def auth_url(self) -> str:
        return f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/authorize"

    @property
    def token_url(self) -> str:
        return f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"

    @property
    def jwks_url(self) -> str:
        return f"https://login.microsoftonline.com/{self.tenant_id}/discovery/v2.0/keys"

    @property
    def db_config(self) -> dict[str, object]:
        """Return connection arguments expected by ``psycopg2.connect``."""
        return {
            "host": self.db_host,
            "dbname": self.db_name,
            "user": self.db_user,
            "password": self.db_password,
            "port": self.db_port,
            "sslmode": self.db_sslmode,
            "connect_timeout": self.db_connect_timeout,
        }


def _parse_optional_csv(value: str | tuple[str, ...] | list[str]) -> tuple[str, ...]:
    if value == "" or value == ():
        return ()
    return _parse_csv(value, field_name="notification_admin_emails")


@lru_cache
def get_settings() -> Settings:
    """Build and cache the backend settings object."""
    return Settings()
