"""Authenticated employee web-chat endpoints."""

import os
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import get_current_user
from backend.chatbot.deps.seatbook_auth import SeatBookIdentity, seatbook_identity
from backend.chatbot.schemas.chat import (
    ChatResponse,
    CreateSessionRequest,
    SessionOut,
    UserMessage,
)
from backend.chatbot.services.chat_adapter_service import chat_adapter_service
from backend.chatbot.services.session_service import SessionService
from backend.db.connection import get_db

router = APIRouter(prefix="/api/chat", tags=["chat"])


def _seatbook_api_base_url(request: Request) -> str:
    """Return the current API origin, including its named Gateway stage."""
    base_url = str(request.base_url).rstrip("/")
    environment_name = os.getenv("ENVIRONMENT_NAME", "").strip().strip("/")
    if environment_name and not base_url.endswith(f"/{environment_name}"):
        return f"{base_url}/{environment_name}"
    return base_url


def _identity(current_user: dict[str, Any]) -> SeatBookIdentity:
    return SeatBookIdentity(
        user_id=str(current_user["user_id"]),
        tenant_id=str(current_user["tenant_id"]),
        display_name=str(
            current_user.get("display_name")
            or current_user.get("full_name")
            or current_user.get("email")
        ),
    )


@router.post("/session", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: CreateSessionRequest,
    request: Request,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: PGConnection = Depends(get_db),
):
    identity = _identity(current_user)
    async with seatbook_identity(identity, base_url=_seatbook_api_base_url(request)):
        return await chat_adapter_service.create_session(body, db, identity)


@router.post("/session/{session_id}/message", response_model=ChatResponse)
async def send_message(
    session_id: str,
    body: UserMessage,
    request: Request,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: PGConnection = Depends(get_db),
):
    identity = _identity(current_user)
    async with seatbook_identity(identity, base_url=_seatbook_api_base_url(request)):
        response = await chat_adapter_service.process_message(
            session_id, body, db, identity
        )
    if response is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or expired. Please start a new session.",
        )
    return response


@router.get("/session/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: str,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: PGConnection = Depends(get_db),
):
    identity = _identity(current_user)
    session = await SessionService.get(
        session_id,
        db,
        authenticated_user_id=identity.user_id,
        authenticated_tenant_id=identity.tenant_id,
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or expired.",
        )
    return SessionOut(
        session_id=str(session.id),
        user_name=session.user_name,
        current_node=session.current_node,
        state=session.state,
    )
