"""Terminal-only exception diagnostics, separate from API and audit payloads."""

import sys
import traceback


def print_error_diagnostic(exc: BaseException) -> None:
    """Show the original error and each abstraction boundary without frame locals."""
    seen: set[int] = set()
    lines: list[str] = []
    current: BaseException | None = exc
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        frames = traceback.extract_tb(current.__traceback__)
        location = "unknown location"
        if frames:
            frame = frames[-1]
            location = f"{frame.filename}:{frame.lineno} in {frame.name}"
        lines.append(f"{location}: {type(current).__name__}: {current}")
        # Even `raise ... from None` keeps context; it is useful in the terminal.
        current = current.__cause__ or current.__context__
    print("Unknown error: " + "\nCaused by: ".join(lines), file=sys.stderr, flush=True)
