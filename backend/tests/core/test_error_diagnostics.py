import unittest
from contextlib import redirect_stderr
from io import StringIO

from fastapi import HTTPException

from backend.core.error_diagnostics import print_error_diagnostic


class ErrorDiagnosticTests(unittest.TestCase):
    def test_reports_original_message_location_and_safe_abstraction(self):
        output = StringIO()
        try:
            try:
                raise RuntimeError("database operation failed precisely here")
            except RuntimeError as original:
                raise HTTPException(500, detail="Safe UI message") from original
        except HTTPException as error:
            with redirect_stderr(output):
                print_error_diagnostic(error)
            self.assertEqual(error.detail, "Safe UI message")
        text = output.getvalue()
        self.assertIn("Unknown error:", text)
        self.assertIn("test_error_diagnostics.py:", text)
        self.assertIn("RuntimeError: database operation failed precisely here", text)
        self.assertIn("Caused by:", text)

    def test_reports_suppressed_context_and_handles_cycles(self):
        output = StringIO()
        try:
            try:
                raise ValueError("original failure")
            except ValueError:
                raise RuntimeError("abstracted failure") from None
        except RuntimeError as error:
            error.__context__.__context__ = error
            with redirect_stderr(output):
                print_error_diagnostic(error)
        self.assertEqual(output.getvalue().count("ValueError: original failure"), 1)
