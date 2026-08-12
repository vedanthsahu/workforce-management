from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://efacility:efacility123@localhost:5432/efacility_chatbot"
    SYNC_DATABASE_URL: str = "postgresql://efacility:efacility123@localhost:5432/efacility_chatbot"
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    MAIN_APP_JWT_SECRET: str = ""
    MAIN_APP_JWT_ALGORITHM: str = "HS256"
    ALLOWED_ORIGINS: str = "http://localhost:4200"
    DEFAULT_TENANT_ID: int = 3
    SESSION_TTL_MINUTES: int = 30
    ALLOW_MULTIPLE_SEATS: bool = False
    MY_BOOKINGS_MAX_RESULTS: int = 7
    PAST_BOOKINGS_PAGE_SIZE: int = 5
    ENABLE_FREE_TEXT: bool = True
    ENABLE_VECTOR_INTENT: bool = True
    ENABLE_TELEMETRY: bool = True
    ENABLE_QUICK_BOOK_EXACT_SEAT: bool = True
    ENABLE_BOOKING_ACTION_CONFIRMATION: bool = True
    ENABLE_REDIS_MEMORY: bool = True
    REDIS_URL: str = "redis://localhost:6379/0"
    ENABLE_ELK_CONVERSATION_LOGS: bool = True
    ELASTICSEARCH_URL: str = "http://localhost:9200"
    ELASTICSEARCH_CONVERSATION_INDEX: str = "logs-efacility-chatbot-conversations-default"
    ELASTICSEARCH_TIMEOUT_SECONDS: float = 2.0
    ADMIN_API_TOKEN: str = ""
    ENABLE_SEAT_BACKEND_API: bool = True
    SEAT_BACKEND_API_URL: str = "https://3284lwcmc1.execute-api.ap-south-1.amazonaws.com"
    SEAT_BACKEND_ACCESS_TOKEN: str = ""
    SEAT_BACKEND_REFRESH_TOKEN: str = ""
    SEAT_BACKEND_SESSION_TOKEN: str = ""
    SEAT_BACKEND_AUTH_COOKIE: str = ""
    SEAT_BACKEND_TOKEN_CACHE_PATH: str = ".seat_backend_tokens.json"
    SEAT_BACKEND_REFRESH_INTERVAL_SECONDS: int = 840
    SEAT_BACKEND_TIMEOUT_SECONDS: float = 10.0
    SEAT_BACKEND_TRUST_ENV: bool = False
    WHATSAPP_ENABLED: bool = False
    WHATSAPP_VERIFY_TOKEN: str = ""
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_GRAPH_API_VERSION: str = "v25.0"
    WHATSAPP_USER_MAPPINGS: str = ""
    WHATSAPP_SEND_MAX_RETRIES: int = 3
    WHATSAPP_RETRY_BACKOFF_SECONDS: float = 0.75
    WHATSAPP_MESSAGE_DEDUPE_TTL_SECONDS: int = 86400
    WHATSAPP_USE_FLOWS: bool = False
    WHATSAPP_BOOKING_FLOW_ID: str = ""
    WHATSAPP_BOOKING_FLOW_SCREEN: str = "BOOKING_FORM"
    WHATSAPP_BOOKING_FLOW_CTA: str = "Open booking form"
    NGROK_AUTHTOKEN: str = ""

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
