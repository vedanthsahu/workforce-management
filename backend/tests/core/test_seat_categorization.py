"""Tests for SVG-id based room metadata."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.core.seat_categorization import (
    capacity_from_svg_element_id,
    display_space_code,
)


def test_capacity_is_read_from_conference_room_svg_id() -> None:
    assert capacity_from_svg_element_id("HYD-PRV-F11-MR-C6-01") == 6
    assert capacity_from_svg_element_id("HYD-PRV-F11-CFR-C120-02") == 120
    assert capacity_from_svg_element_id("HYD-PRV-F11-TR_C30_01") == 30


def test_capacity_is_not_inferred_for_plain_seats_or_invalid_segments() -> None:
    assert capacity_from_svg_element_id("HYD-PRV-F11-C6-01") is None
    assert capacity_from_svg_element_id("HYD-PRV-F11-MR-C0-01") is None
    assert capacity_from_svg_element_id("HYD-PRV-F11-MR-01") is None


def test_display_code_hides_the_capacity_segment_for_rooms() -> None:
    assert display_space_code("HYD-PRV-F11-MR-C6-01") == "HYD-PRV-F11-MR-01"
    assert display_space_code("HYD-PRV-F11-CFR-C120-02") == "HYD-PRV-F11-CFR-02"
    assert display_space_code("HYD-PRV-F11-TR_C30_01") == "HYD-PRV-F11-TR_01"


def test_display_code_leaves_other_codes_untouched() -> None:
    assert display_space_code("HYD-PRV-F11-MR-01") == "HYD-PRV-F11-MR-01"
    assert display_space_code("HYD-PRV-F11-A-166") == "HYD-PRV-F11-A-166"
    assert display_space_code("HYD-PRV-F11-C6-01") == "HYD-PRV-F11-C6-01"
    assert display_space_code("") == ""
    assert display_space_code(None) == ""
