"""AWS Lambda entry point for the FastAPI application."""

from __future__ import annotations

import os

from mangum import Mangum

from backend.main import app


def _api_gateway_base_path() -> str:
    """Return the named HTTP API stage path used outside local execution."""
    environment_name = os.getenv("ENVIRONMENT_NAME", "").strip().strip("/")
    return f"/{environment_name}" if environment_name else "/"


handler = Mangum(
    app,
    lifespan="off",
    api_gateway_base_path=_api_gateway_base_path(),
)
