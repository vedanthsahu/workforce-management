from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPOSITORY_ENV = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPOSITORY_ENV,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # No independent DB settings here -- the chatbot shares the main app's
    # single database connection (backend.db.connection) rather than
    # resolving its own credentials or URL.
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    ALLOWED_ORIGINS: str = "http://localhost:4200"
    DEFAULT_TENANT_ID: int = 3
    SESSION_TTL_MINUTES: int = 30
    ALLOW_MULTIPLE_SEATS: bool = False
    MY_BOOKINGS_MAX_RESULTS: int = 7
    PAST_BOOKINGS_PAGE_SIZE: int = 5
    ENABLE_FREE_TEXT: bool = True
    ENABLE_VECTOR_INTENT: bool = False
    ENABLE_TELEMETRY: bool = True
    ENABLE_QUICK_BOOK_EXACT_SEAT: bool = True
    ENABLE_BOOKING_ACTION_CONFIRMATION: bool = True
    ENABLE_REDIS_MEMORY: bool = False
    REDIS_URL: str = "redis://localhost:6379/0"
    ENABLE_ELK_CONVERSATION_LOGS: bool = False
    ELASTICSEARCH_URL: str = "http://localhost:9200"
    ELASTICSEARCH_CONVERSATION_INDEX: str = (
        "logs-efacility-chatbot-conversations-default"
    )
    ELASTICSEARCH_TIMEOUT_SECONDS: float = 2.0
    ADMIN_API_TOKEN: str = ""
    # Booking-domain calls go straight into the main app's own service
    # functions now (backend.chatbot.services.seat_backend_api_service) --
    # this is just a kill switch, not a remote-API toggle anymore.
    ENABLE_SEAT_BACKEND_API: bool = True
    WHATSAPP_ENABLED: bool = False
    WHATSAPP_VERIFY_TOKEN: str = ""
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_GRAPH_API_VERSION: str = "v25.0"
    WHATSAPP_USER_MAPPINGS: str = ""
    WHATSAPP_REQUIRE_ALLOWLIST: bool = True
    WHATSAPP_ALLOW_UNSIGNED_WEBHOOKS: bool = True
    WHATSAPP_MAX_WEBHOOK_BYTES: int = 262144
    WHATSAPP_RATE_LIMIT_PER_MINUTE: int = 30
    WHATSAPP_IP_RATE_LIMIT_PER_MINUTE: int = 300
    WHATSAPP_MAX_CONCURRENT_TASKS: int = 10
    WHATSAPP_SEND_MAX_RETRIES: int = 3
    WHATSAPP_RETRY_BACKOFF_SECONDS: float = 0.75
    WHATSAPP_MESSAGE_DEDUPE_TTL_SECONDS: int = 86400
    WHATSAPP_USE_FLOWS: bool = False
    WHATSAPP_BOOKING_FLOW_ID: str = ""
    WHATSAPP_BOOKING_FLOW_SCREEN: str = "BOOKING_FORM"
    WHATSAPP_BOOKING_FLOW_CTA: str = "Open booking form"
    NGROK_AUTHTOKEN: str = ""

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()
