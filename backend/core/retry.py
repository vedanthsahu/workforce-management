"""Reusable retry helpers for transient AWS operations."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import ParamSpec, TypeVar

from boto3.exceptions import S3UploadFailedError
from botocore.exceptions import BotoCoreError, ClientError
from tenacity import (
    RetryCallState,
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
)

P = ParamSpec("P")
R = TypeVar("R")

RETRYABLE_AWS_ERROR_CODES = {
    "RequestTimeout",
    "RequestTimeoutException",
    "ServiceUnavailable",
    "ThrottledException",
    "Throttling",
    "ThrottlingException",
    "TooManyRequestsException",
    "TooManyRequests",
    "PriorRequestNotComplete",
    "ProvisionedThroughputExceededException",
}


def is_retryable_aws_error(exc: BaseException) -> bool:
    """Return whether an AWS SDK exception is likely to be transient."""
    if isinstance(exc, S3UploadFailedError):
        return True

    if isinstance(exc, ClientError):
        response_metadata = exc.response.get("ResponseMetadata", {})
        status_code = response_metadata.get("HTTPStatusCode")
        error_code = str(exc.response.get("Error", {}).get("Code") or "")
        return (
            isinstance(status_code, int)
            and status_code >= 500
        ) or error_code in RETRYABLE_AWS_ERROR_CODES

    return isinstance(exc, BotoCoreError)


def aws_retry(
    *,
    logger: logging.Logger,
    operation_name: str,
    max_retries: int,
    initial_delay_seconds: float,
    max_delay_seconds: float,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """Create a tenacity retry decorator for transient AWS SDK failures."""
    max_attempts = max_retries + 1

    def log_before_sleep(retry_state: RetryCallState) -> None:
        exception = retry_state.outcome.exception() if retry_state.outcome else None
        sleep_seconds = (
            retry_state.next_action.sleep
            if retry_state.next_action is not None
            else None
        )
        logger.warning(
            (
                "aws.retry operation=%s attempt=%s max_attempts=%s "
                "sleep_seconds=%s error_type=%s error=%s"
            ),
            operation_name,
            retry_state.attempt_number,
            max_attempts,
            f"{sleep_seconds:.2f}" if sleep_seconds is not None else "-",
            type(exception).__name__ if exception is not None else "-",
            exception,
        )

    return retry(
        retry=retry_if_exception(is_retryable_aws_error),
        stop=stop_after_attempt(max_attempts),
        wait=wait_exponential(
            multiplier=initial_delay_seconds,
            max=max_delay_seconds,
        ),
        before_sleep=log_before_sleep,
        reraise=True,
    )
