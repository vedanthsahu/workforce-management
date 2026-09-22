"""SVG-id based seat_type suggestion for newly uploaded layout seats.

Mirrors frontend/src/lib/svg/seatCategories.ts's categorizeSvgId, which
already runs client-side purely for the upload preview's "N seats, N cabins,
N meeting rooms" summary text -- that computation was never persisted
anywhere. This is the same convention (a "CBN"/"CFR"/"MR"/"TR" segment in the
svg id, e.g. "HYD-PRV-F11-CBN-04") applied at insert time so a newly
uploaded cabin/conference/meeting/training room lands with the right
seat_type immediately instead of needing a manual per-seat edit first.

Meeting and training rooms both map to CONFERENCE_ROOM, matching the flat
Manage Spaces category model (see frontend/.../utils/spaceCategory.ts) --
there are no sub-types under Conference Rooms.
"""

from __future__ import annotations

import re

_CATEGORY_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("CABIN", re.compile(r"(^|[-_])cbn([-_]|$)", re.IGNORECASE)),
    ("CONFERENCE_ROOM", re.compile(r"(^|[-_])cfr([-_]|$)", re.IGNORECASE)),
    ("CONFERENCE_ROOM", re.compile(r"(^|[-_])mr([-_]|$)", re.IGNORECASE)),
    ("CONFERENCE_ROOM", re.compile(r"(^|[-_])tr([-_]|$)", re.IGNORECASE)),
]


def suggest_seat_type(svg_element_id: str) -> str | None:
    """Returns "CABIN"/"CONFERENCE_ROOM" when the svg id matches one of
    those conventions, otherwise None -- a plain seat's seat_type is left
    unset at upload (unchanged behavior), since null already buckets
    correctly under Seats with no ambiguity to resolve."""
    for seat_type, pattern in _CATEGORY_PATTERNS:
        if pattern.search(svg_element_id):
            return seat_type
    return None
