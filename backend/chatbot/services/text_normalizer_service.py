from __future__ import annotations

import re
import unicodedata

TOKEN_REPLACEMENTS = {
    "bok": "book",
    "bokk": "book",
    "boook": "book",
    "buk": "book",
    "quik": "quick",
    "qik": "quick",
    "seet": "seat",
    "seta": "seat",
    "desck": "desk",
    "tomorow": "tomorrow",
    "tommorow": "tomorrow",
    "tmrw": "tomorrow",
    "tmr": "tomorrow",
    "todays": "today",
    "flor": "floor",
    "flooor": "floor",
    "flr": "floor",
    "hyderbad": "hyderabad",
    "banglore": "bangalore",
    "hitec": "hitech",
    "hi-tech": "hitech",
    "hi tech": "hitech",
    "bookig": "booking",
    "boooking": "booking",
    "wrkspace": "workspace",
    "windo": "window",
    "moniter": "monitor",
    "cancell": "cancel",
    "reshedule": "reschedule",
    "updte": "update",
    "resrvation": "reservation",
}


def normalize_message(message: str) -> str:
    text = unicodedata.normalize("NFKC", message or "").strip().lower()
    text = text.replace("hi-tech", "hitech").replace("hi tech", "hitech")
    text = re.sub(r"[^\w\s:/-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return ""

    words = [TOKEN_REPLACEMENTS.get(word, word) for word in text.split()]
    normalized = " ".join(words)
    normalized = normalized.replace("quick book", "quick book")
    return normalized
