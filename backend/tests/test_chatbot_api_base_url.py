"""Regression coverage for chatbot calls back into a staged API Gateway."""

import os
from types import SimpleNamespace
from unittest.mock import patch

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("SYNC_DATABASE_URL", "postgresql://test:test@localhost/test")

from backend.api.routes.chatbot import _seatbook_api_base_url


def test_deployed_chatbot_base_url_includes_api_gateway_stage() -> None:
    request = SimpleNamespace(
        base_url="https://2beyvmpwxk.execute-api.ap-south-1.amazonaws.com/"
    )

    with patch.dict(os.environ, {"ENVIRONMENT_NAME": "dev"}):
        assert _seatbook_api_base_url(request) == (
            "https://2beyvmpwxk.execute-api.ap-south-1.amazonaws.com/dev"
        )


def test_local_chatbot_base_url_remains_unchanged() -> None:
    request = SimpleNamespace(base_url="http://127.0.0.1:8000/")

    with patch.dict(os.environ, {"ENVIRONMENT_NAME": ""}):
        assert _seatbook_api_base_url(request) == "http://127.0.0.1:8000"


def test_existing_stage_is_not_duplicated() -> None:
    request = SimpleNamespace(
        base_url="https://2beyvmpwxk.execute-api.ap-south-1.amazonaws.com/dev/"
    )

    with patch.dict(os.environ, {"ENVIRONMENT_NAME": "dev"}):
        assert _seatbook_api_base_url(request) == (
            "https://2beyvmpwxk.execute-api.ap-south-1.amazonaws.com/dev"
        )
