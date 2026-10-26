"""Adversarial tests for floor-plan SVG upload validation
(backend/core/storage.py ``validate_svg_file``).

The frontend injects uploaded SVG text into the page with
``dangerouslySetInnerHTML`` (8 call sites, e.g.
frontend/src/features/book/components/SvgFloorMapPage.tsx). Any script
that passes this validator therefore runs in the session of every user
who opens the floor map (stored XSS).

Each payload below is a known way to run script from SVG. A payload the
validator accepts is a confirmed bypass; those cases are marked
``xfail(strict=True)`` under finding QA-SEC-01.
"""

from __future__ import annotations

import io
import sys
import unittest
from pathlib import Path

import pytest
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.core.storage import validate_svg_file


def _upload(content: bytes, filename: str = "floor.svg", content_type: str = "image/svg+xml") -> UploadFile:
    return UploadFile(file=io.BytesIO(content), filename=filename, headers=Headers({"content-type": content_type}))


def _svg(inner: str) -> bytes:
    return f'<svg xmlns="http://www.w3.org/2000/svg">{inner}</svg>'.encode()


def _rejected(content: bytes) -> bool:
    try:
        validate_svg_file(_upload(content))
    except HTTPException as exc:
        return exc.status_code == 400
    return False


class BlockedPayloadTests(unittest.TestCase):
    """Payloads the current denylist does stop."""

    def test_plain_script_and_common_handlers_are_rejected(self) -> None:
        for inner in (
            "<script>alert(1)</script>",
            '<rect onload="alert(1)"/>',
            '<image href="x" onerror="alert(1)"/>',
            '<a href="javascript:alert(1)"><text>x</text></a>',
            "<foreignObject><iframe src='x'></iframe></foreignObject>",
            '<rect ONCLICK="alert(1)"/>',
        ):
            with self.subTest(payload=inner):
                self.assertTrue(_rejected(_svg(inner)))

    def test_valid_floor_plan_is_accepted(self) -> None:
        self.assertFalse(_rejected(_svg('<g id="SEAT-A-01"><rect width="10" height="10"/></g>')))

    def test_wrong_extension_or_content_type_is_rejected(self) -> None:
        for upload in (_upload(_svg(""), filename="floor.png"), _upload(_svg(""), content_type="text/html")):
            with self.subTest(upload=upload.filename):
                with self.assertRaises(HTTPException):
                    validate_svg_file(upload)


@pytest.mark.xfail(strict=True, reason="QA-SEC-01: denylist matches exact byte sequences; whitespace before '=' bypasses it")
class WhitespaceBeforeEqualsTests(unittest.TestCase):
    def test_space_before_equals_in_event_handler_is_rejected(self) -> None:
        self.assertTrue(_rejected(_svg('<rect onload ="alert(1)"/>')))


@pytest.mark.xfail(strict=True, reason="QA-SEC-01: event handlers outside the five listed names are not blocked")
class UnlistedEventHandlerTests(unittest.TestCase):
    def test_animation_begin_handler_is_rejected(self) -> None:
        self.assertTrue(_rejected(_svg('<animate attributeName="x" dur="1s" onbegin="alert(1)"/>')))


@pytest.mark.xfail(strict=True, reason="QA-SEC-01: character references hide 'javascript:' from a byte match")
class EncodedSchemeTests(unittest.TestCase):
    def test_entity_encoded_javascript_scheme_is_rejected(self) -> None:
        self.assertTrue(_rejected(_svg('<a href="&#106;avascript:alert(1)"><text>x</text></a>')))


@pytest.mark.xfail(strict=True, reason="QA-SEC-01: a UTF-16 file defeats byte-level pattern matching")
class Utf16EncodingTests(unittest.TestCase):
    def test_utf16_encoded_script_is_rejected(self) -> None:
        content = '<?xml version="1.0" encoding="UTF-16"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
        self.assertTrue(_rejected(content.encode("utf-16")))


if __name__ == "__main__":
    unittest.main()
