"""Console logging helpers for backend diagnostics."""

from __future__ import annotations

import logging
import sys
import threading
from pathlib import Path
from types import FrameType

LOGGER_NAME = "seat_management"

_FUNCTION_TRACE_ENABLED = False
_TRACE_DEPTH_BY_THREAD: dict[int, int] = {}


def configure_console_logging(level_name: str) -> None:
    """Configure app logs so they are visible in the command window."""
    level = _resolve_log_level(level_name)
    formatter = logging.Formatter(
        fmt="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    root_logger = logging.getLogger()
    if not root_logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(formatter)
        root_logger.addHandler(handler)
    else:
        for handler in root_logger.handlers:
            handler.setFormatter(formatter)

    root_logger.setLevel(level)
    logging.getLogger(LOGGER_NAME).setLevel(level)
    logging.getLogger("uvicorn").setLevel(level)
    logging.getLogger("uvicorn.access").setLevel(level)
    logging.getLogger("uvicorn.error").setLevel(level)


def enable_backend_function_trace() -> None:
    """Log every Python function call inside the backend package.

    This is intentionally opt-in because it is very noisy and can slow down
    development requests. Enable it with APP_TRACE_FUNCTIONS=true.
    """
    global _FUNCTION_TRACE_ENABLED
    if _FUNCTION_TRACE_ENABLED:
        return

    _FUNCTION_TRACE_ENABLED = True
    backend_root = Path(__file__).resolve().parents[1]
    logger = logging.getLogger(f"{LOGGER_NAME}.trace")

    def trace_calls(frame: FrameType, event: str, arg: object):
        if event not in {"call", "return", "exception"}:
            return trace_calls

        module_name = str(frame.f_globals.get("__name__") or "")
        if not module_name.startswith("backend."):
            return trace_calls
        if module_name == __name__:
            return trace_calls

        file_path = Path(frame.f_code.co_filename)
        try:
            relative_path = file_path.relative_to(backend_root)
        except ValueError:
            return trace_calls

        thread_id = threading.get_ident()
        depth = _TRACE_DEPTH_BY_THREAD.get(thread_id, 0)
        function_name = frame.f_code.co_name
        location = f"{relative_path}:{frame.f_lineno}"
        indent = "  " * min(depth, 20)

        if event == "call":
            logger.debug(
                "%sfunction.enter %s.%s at %s",
                indent,
                module_name,
                function_name,
                location,
            )
            _TRACE_DEPTH_BY_THREAD[thread_id] = depth + 1
        elif event == "return":
            _TRACE_DEPTH_BY_THREAD[thread_id] = max(depth - 1, 0)
            logger.debug(
                "%sfunction.exit %s.%s at %s",
                "  " * min(max(depth - 1, 0), 20),
                module_name,
                function_name,
                location,
            )
        elif event == "exception":
            exception_type, exception, _ = arg  # type: ignore[misc]
            logger.debug(
                "%sfunction.exception %s.%s at %s error=%s: %s",
                indent,
                module_name,
                function_name,
                location,
                getattr(exception_type, "__name__", str(exception_type)),
                exception,
            )

        return trace_calls

    sys.setprofile(trace_calls)
    threading.setprofile(trace_calls)
    logger.warning("Backend function tracing is enabled. Expect very verbose logs.")


def _resolve_log_level(level_name: str) -> int:
    normalized = str(level_name or "INFO").strip().upper()
    return getattr(logging, normalized, logging.INFO)
