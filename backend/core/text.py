"""Shared text-normalization helpers."""

from __future__ import annotations


def titlecase_name(value: str) -> str:
    """Capitalize each space-separated word in a person's name.

    Splits strictly on whitespace (not every punctuation mark) so a
    hyphenated or apostrophe'd name keeps its internal casing untouched --
    only the first letter of each whitespace-delimited word is capitalized,
    the rest lowercased. str.split() with no argument also collapses
    repeated whitespace and strips the ends, which is the normalization a
    name typed by hand usually needs anyway.
    """
    return " ".join(word[:1].upper() + word[1:].lower() for word in value.split())
