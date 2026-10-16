from __future__ import annotations

from fastapi import Header, HTTPException, status

from app.config import settings


async def require_admin_token(x_admin_token: str = Header("", alias="X-Admin-Token")):
    """Protect admin endpoints when ADMIN_API_TOKEN is configured."""
    if not settings.ADMIN_API_TOKEN:
        return
    if x_admin_token != settings.ADMIN_API_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin token.",
        )
