from __future__ import annotations

import logging
import re

from app.config import settings
from app.middleware.request_id import request_id_ctx


_SENSITIVE_PATTERNS = (
    (re.compile(r"(?i)(authorization[=:]\s*bearer\s+)[^\s,;]+"), r"\1[REDACTED]"),
    (re.compile(r"(?i)(bearer\s+)[A-Za-z0-9._~-]+"), r"\1[REDACTED]"),
    (re.compile(r"(?i)((?:access|refresh|session)_token[=:]\s*)[^\s,;]+"), r"\1[REDACTED]"),
    (re.compile(r"(?i)(cookie[=:]\s*)[^\n]+"), r"\1[REDACTED]"),
    (re.compile(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b"), "[REDACTED_JWT]"),
)


class ChatbotLogFormatter(logging.Formatter):
    """Adds request correlation and removes credentials from operational logs."""

    def format(self, record: logging.LogRecord) -> str:
        record.request_id = request_id_ctx.get() or "-"
        rendered = super().format(record)
        for pattern, replacement in _SENSITIVE_PATTERNS:
            rendered = pattern.sub(replacement, rendered)
        return rendered


def configure_logging() -> None:
    level_name = str(settings.LOG_LEVEL or "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    handler = logging.StreamHandler()
    handler.setFormatter(
        ChatbotLogFormatter(
            fmt=(
                "%(asctime)s level=%(levelname)s service=efacility-chatbot "
                "logger=%(name)s request_id=%(request_id)s %(message)s"
            ),
            datefmt="%Y-%m-%dT%H:%M:%S%z",
        )
    )
    logging.basicConfig(level=level, handlers=[handler], force=True)


def mask_identifier(value: object, visible_suffix: int = 4) -> str:
    text = str(value or "")
    if not text:
        return "-"
    return f"***{text[-visible_suffix:]}" if len(text) > visible_suffix else "***"
