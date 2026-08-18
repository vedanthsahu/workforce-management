"""Small, generic text-normalization helpers shared across repositories."""

from __future__ import annotations

import re

# Capitalizes each run of letters, leaving whitespace/hyphens/apostrophes as
# separators -- "amit kumar" -> "Amit Kumar", "mary-jane o'brien" ->
# "Mary-Jane O'Brien". Collapsing repeated whitespace first keeps
# "kishore   nandan" from round-tripping with the extra spaces intact.
_NAME_WORD = re.compile(r"[^\s\-']+")


def titlecase_name(value: str | None) -> str | None:
    """Normalize a person's name to Title Case.

    Splits on whitespace/hyphens/apostrophes and capitalizes each token,
    so an all-lowercase or all-caps name from SSO or free-text input
    always renders consistently. Returns None unchanged so callers keep
    control over required-ness; returns an empty string unchanged too,
    since there's nothing to capitalize.
    """
    if value is None:
        return None
    normalized = " ".join(value.split())
    if not normalized:
        return normalized
    return _NAME_WORD.sub(lambda m: m.group(0).capitalize(), normalized)
