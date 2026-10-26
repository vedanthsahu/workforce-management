"""Failure-mode tests for booking e-mail (backend/services/notification_service.py).

An e-mail failure must never change the outcome of a committed booking,
and retries must not send the same e-mail twice. Amazon SES is replaced
by a mock; no network is used. ``xfail(strict=True)`` marks an open finding.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from botocore.exceptions import ClientError, EndpointConnectionError, ReadTimeoutError

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.core.config import get_settings
from backend.services.notification_service import NotificationService


def _service(ses: MagicMock) -> NotificationService:
    fast = get_settings().model_copy(update={
        "aws_ses_max_retries": 3,
        "aws_retry_initial_delay_seconds": 0.001,
        "aws_retry_max_delay_seconds": 0.001,
    })
    with patch.object(NotificationService, "_build_ses_client", return_value=ses):
        service = NotificationService(settings=fast)
    service.render_template = MagicMock(return_value="<p>Booking confirmed</p>")
    return service


def _client_error(code: str, status_code: int) -> ClientError:
    return ClientError({"Error": {"Code": code, "Message": code}, "ResponseMetadata": {"HTTPStatusCode": status_code}}, "SendEmail")


class NotificationFailureTests(unittest.TestCase):
    def _send(self, ses: MagicMock) -> None:
        _service(ses).send_email(["qa.employee@example.com"], "Seat booking confirmed", "booking_created.html", {})

    def test_successful_send_calls_ses_once(self) -> None:
        ses = MagicMock()
        ses.send_email.return_value = {"MessageId": "m-1"}
        self._send(ses)
        self.assertEqual(ses.send_email.call_count, 1)

    def test_permanent_rejection_is_not_retried_and_does_not_raise(self) -> None:
        ses = MagicMock()
        ses.send_email.side_effect = _client_error("MessageRejected", 400)
        self._send(ses)  # must not raise
        self.assertEqual(ses.send_email.call_count, 1)

    def test_throttling_is_retried_then_given_up_without_raising(self) -> None:
        ses = MagicMock()
        ses.send_email.side_effect = _client_error("Throttling", 400)
        self._send(ses)
        self.assertEqual(ses.send_email.call_count, 4)  # 1 try + 3 retries

    def test_connection_failure_is_retried_then_given_up_without_raising(self) -> None:
        ses = MagicMock()
        ses.send_email.side_effect = EndpointConnectionError(endpoint_url="https://email.ap-south-1.amazonaws.com")
        self._send(ses)
        self.assertEqual(ses.send_email.call_count, 4)

    def test_no_recipient_means_no_call(self) -> None:
        ses = MagicMock()
        _service(ses).send_email(["  "], "Seat booking confirmed", "booking_created.html", {})
        ses.send_email.assert_not_called()

    def test_duplicate_recipients_are_sent_one_message(self) -> None:
        ses = MagicMock()
        ses.send_email.return_value = {"MessageId": "m-1"}
        _service(ses).send_email(["A@example.com", "a@example.com"], "s", "booking_created.html", {})
        self.assertEqual(ses.send_email.call_args.kwargs["Destination"]["ToAddresses"], ["A@example.com"])

    @pytest.mark.xfail(strict=True, reason="QA-REL-03: a read timeout after SES accepted the message is retried, which can send duplicates")
    def test_ambiguous_read_timeout_is_not_retried(self) -> None:
        ses = MagicMock()
        ses.send_email.side_effect = ReadTimeoutError(endpoint_url="https://email.ap-south-1.amazonaws.com")
        self._send(ses)
        self.assertEqual(ses.send_email.call_count, 1)


if __name__ == "__main__":
    unittest.main()
