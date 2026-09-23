"""Shared defaults for isolated booking-service unit tests."""

from collections.abc import Iterator
from unittest.mock import patch

import pytest


@pytest.fixture(autouse=True)
def default_booking_advance_rules() -> Iterator[None]:
    """Keep fake-connection tests independent of the business-rule table."""
    rules = {
        "employee_max_advance_days": 30,
        "guest_max_advance_days": 15,
    }
    with (
        patch(
            "backend.services.booking_service.resolve_booking_advance_days",
            return_value=rules,
        ),
        patch(
            "backend.services.guest_service.resolve_booking_advance_days",
            return_value=rules,
        ),
    ):
        yield
