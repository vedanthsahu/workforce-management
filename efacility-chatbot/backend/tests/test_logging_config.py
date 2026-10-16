import logging
import unittest

from app.logging_config import ChatbotLogFormatter, mask_identifier
from app.middleware.request_id import request_id_ctx


class ChatbotLoggingTests(unittest.TestCase):
    def test_formatter_adds_request_id_and_redacts_tokens(self):
        formatter = ChatbotLogFormatter(
            "request_id=%(request_id)s %(message)s"
        )
        token = request_id_ctx.set("request-123")
        try:
            record = logging.LogRecord(
                name="test",
                level=logging.INFO,
                pathname=__file__,
                lineno=1,
                msg="Authorization: Bearer secret-token access_token=secret-value",
                args=(),
                exc_info=None,
            )
            rendered = formatter.format(record)
        finally:
            request_id_ctx.reset(token)

        self.assertIn("request_id=request-123", rendered)
        self.assertNotIn("secret-token", rendered)
        self.assertNotIn("secret-value", rendered)
        self.assertIn("[REDACTED]", rendered)

    def test_identifier_mask_keeps_only_suffix(self):
        self.assertEqual(mask_identifier("919876543210"), "***3210")
        self.assertEqual(mask_identifier(""), "-")


if __name__ == "__main__":
    unittest.main()
