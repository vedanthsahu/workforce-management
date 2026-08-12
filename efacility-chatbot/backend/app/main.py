import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables
from app.logging_config import configure_logging
from app.middleware.request_id import RequestIdMiddleware
from app.routers import chat, whatsapp

configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("event=service_start environment=%s", settings.APP_ENV)
    await create_tables()
    logger.info("event=database_ready")
    yield
    logger.info("event=service_stop")


app = FastAPI(
    title="eFACiLiTY Seat Booking Chatbot API",
    description="Deterministic chatbot for seat booking.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIdMiddleware)

app.include_router(chat.router)
app.include_router(whatsapp.router, prefix="/api/whatsapp", tags=["whatsapp"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "efacility-chatbot"}
