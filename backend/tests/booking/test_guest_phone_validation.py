"""Country-aware validation for guest mobile numbers."""

import pytest
from pydantic import ValidationError

from backend.schemas.guest import CreateGuestRequest, UpdateGuestRequest


@pytest.mark.parametrize(
    ("submitted", "normalized"),
    [
        ("+91 98765 43210", "+919876543210"),
        ("+65 8123 4567", "+6581234567"),
        ("+971 50 123 4567", "+971501234567"),
        ("+1 (201) 555-0123", "+12015550123"),
    ],
)
def test_create_guest_normalizes_valid_mobile_numbers(
    submitted: str,
    normalized: str,
) -> None:
    payload = CreateGuestRequest(full_name="Guest User", phone=submitted)

    assert payload.phone == normalized


@pytest.mark.parametrize(
    "phone",
    [
        "+91 12345678",
        "+65 1234",
        "+971 123456789012345",
        "9876543210",
    ],
)
def test_create_guest_rejects_invalid_country_number(phone: str) -> None:
    with pytest.raises(ValidationError, match="valid mobile number"):
        CreateGuestRequest(full_name="Guest User", phone=phone)


def test_update_guest_normalizes_phone_number() -> None:
    payload = UpdateGuestRequest(phone="+91 98765 43210")

    assert payload.phone == "+919876543210"
