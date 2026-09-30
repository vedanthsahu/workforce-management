"""Shared isolation for floor-layout service and repository unit tests."""

from collections.abc import Iterator
from unittest.mock import patch

import pytest


@pytest.fixture(autouse=True)
def bypass_layout_url_presigning() -> Iterator[None]:
    """Keep non-storage tests independent of runtime AWS configuration."""
    with patch(
        "backend.schemas.floor_layout.resolve_layout_file_url",
        side_effect=lambda value: value,
    ):
        yield
