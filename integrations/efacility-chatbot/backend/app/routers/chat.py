from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps.admin_auth import require_admin_token
from app.schemas.chat import (
    CreateSessionRequest, SessionOut, UserMessage, ChatResponse,
)
from app.services.chat_adapter_service import chat_adapter_service
from app.services.session_service import SessionService
from app.services.conversation_log_service import conversation_log_service
from app.services.memory_service import memory_service
from app.services.plugin_registry import plugin_registry
from app.services.seat_backend_api_service import seat_backend_api_service
from app.services.telemetry_service import telemetry_service
from app.deps.seatbook_auth import SeatBookIdentity, require_seatbook_identity

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/session", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
    identity: SeatBookIdentity = Depends(require_seatbook_identity),
):
    """Create a new chat session and return the welcome message."""
    return await chat_adapter_service.create_session(body, db, identity)


@router.post("/session/{session_id}/message", response_model=ChatResponse)
async def send_message(
    session_id: str,
    body: UserMessage,
    db: AsyncSession = Depends(get_db),
    identity: SeatBookIdentity = Depends(require_seatbook_identity),
):
    """Send a user message and get the bot response."""
    response = await chat_adapter_service.process_message(session_id, body, db, identity)
    if response is None:
        raise HTTPException(status_code=404, detail="Session not found or expired. Please start a new session.")
    return response


@router.get("/session/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    identity: SeatBookIdentity = Depends(require_seatbook_identity),
):
    """Get session status."""
    session = await SessionService.get(
        session_id,
        db,
        authenticated_user_id=identity.user_id,
        authenticated_tenant_id=identity.tenant_id,
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    return SessionOut(
        session_id=str(session.id),
        user_name=session.user_name,
        current_node=session.current_node,
        state=session.state,
    )


# ── Lookup endpoints (used by Angular form cards) ─────────────────────────────

from app.config import settings


@router.get("/lookup/sites")
async def lookup_sites(
    identity: SeatBookIdentity = Depends(require_seatbook_identity),
):
    """Return active sites from the seat management backend."""
    external_sites = await seat_backend_api_service.list_sites()
    if external_sites is None:
        raise HTTPException(status_code=503, detail="Seat backend API is unavailable or not authenticated.")
    return [
        {
            "value": str(site.get("site_id")),
            "label": f"{site.get('site_name')}{' (' + site.get('city') + ')' if site.get('city') else ''}",
            "city": site.get("city"),
        }
        for site in external_sites
        if site.get("site_id") and site.get("site_name")
    ]


@router.get("/lookup/buildings")
async def lookup_buildings(
    site_id: int,
    identity: SeatBookIdentity = Depends(require_seatbook_identity),
):
    """Return active buildings for a site from the seat management backend."""
    external_buildings = await seat_backend_api_service.list_buildings(site_id)
    if external_buildings is None:
        raise HTTPException(status_code=503, detail="Seat backend API is unavailable or not authenticated.")
    return [
        {"value": str(building.get("building_id")), "label": building.get("building_name")}
        for building in external_buildings
        if building.get("building_id") and building.get("building_name")
    ]


@router.get("/lookup/floors")
async def lookup_floors(
    building_id: int,
    identity: SeatBookIdentity = Depends(require_seatbook_identity),
):
    """Return active floors for a building from the seat management backend."""
    external_floors = await seat_backend_api_service.list_floors(building_id)
    if external_floors is None:
        raise HTTPException(status_code=503, detail="Seat backend API is unavailable or not authenticated.")
    return [
        {"value": str(floor.get("floor_id")), "label": floor.get("floor_name") or floor.get("floor_code") or floor.get("floor_id")}
        for floor in external_floors
        if floor.get("floor_id")
    ]


@router.get("/lookup/amenities")
async def lookup_amenities(
    identity: SeatBookIdentity = Depends(require_seatbook_identity),
):
    """Amenities are not collected in the current seat booking flow."""
    return []


@router.get("/admin/telemetry", dependencies=[Depends(require_admin_token)])
async def telemetry_snapshot():
    """Return in-memory confidence/performance telemetry."""
    return telemetry_service.snapshot()


@router.get("/admin/plugins", dependencies=[Depends(require_admin_token)])
async def plugins():
    """Return registered integration/plugin placeholders."""
    return {"plugins": plugin_registry.list_plugins()}


@router.get("/admin/feature-flags", dependencies=[Depends(require_admin_token)])
async def feature_flags():
    """Return effective runtime feature flags."""
    return {
        "ALLOW_MULTIPLE_SEATS": settings.ALLOW_MULTIPLE_SEATS,
        "MY_BOOKINGS_MAX_RESULTS": settings.MY_BOOKINGS_MAX_RESULTS,
        "PAST_BOOKINGS_PAGE_SIZE": settings.PAST_BOOKINGS_PAGE_SIZE,
        "ENABLE_FREE_TEXT": settings.ENABLE_FREE_TEXT,
        "ENABLE_VECTOR_INTENT": settings.ENABLE_VECTOR_INTENT,
        "ENABLE_TELEMETRY": settings.ENABLE_TELEMETRY,
        "ENABLE_QUICK_BOOK_EXACT_SEAT": settings.ENABLE_QUICK_BOOK_EXACT_SEAT,
        "ENABLE_BOOKING_ACTION_CONFIRMATION": settings.ENABLE_BOOKING_ACTION_CONFIRMATION,
        "ENABLE_SEAT_BACKEND_API": settings.ENABLE_SEAT_BACKEND_API,
        "SEAT_BACKEND_API_URL": settings.SEAT_BACKEND_API_URL,
        "SEAT_BACKEND_ACCESS_TOKEN_CONFIGURED": bool(settings.SEAT_BACKEND_ACCESS_TOKEN),
        "SEAT_BACKEND_REFRESH_TOKEN_CONFIGURED": bool(settings.SEAT_BACKEND_REFRESH_TOKEN),
        "SEAT_BACKEND_SESSION_TOKEN_CONFIGURED": bool(settings.SEAT_BACKEND_SESSION_TOKEN),
        "SEAT_BACKEND_AUTH_COOKIE_CONFIGURED": bool(settings.SEAT_BACKEND_AUTH_COOKIE),
        "SEAT_BACKEND_REFRESH_INTERVAL_SECONDS": settings.SEAT_BACKEND_REFRESH_INTERVAL_SECONDS,
        "ENABLE_REDIS_MEMORY": settings.ENABLE_REDIS_MEMORY,
        "ENABLE_ELK_CONVERSATION_LOGS": settings.ENABLE_ELK_CONVERSATION_LOGS,
    }


@router.get("/admin/infrastructure", dependencies=[Depends(require_admin_token)])
async def infrastructure_health():
    """Return production support service health."""
    return {
        "redis_memory": {
            "enabled": settings.ENABLE_REDIS_MEMORY,
            "healthy": await memory_service.ping(),
        },
        "elasticsearch_conversation_logs": {
            "enabled": settings.ENABLE_ELK_CONVERSATION_LOGS,
            "healthy": await conversation_log_service.health(),
            "index": settings.ELASTICSEARCH_CONVERSATION_INDEX,
        },
    }
