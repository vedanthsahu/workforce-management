"""Secure, cached retrieval of JSON secrets from AWS Secrets Manager."""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

import boto3
from botocore.client import BaseClient
from botocore.exceptions import BotoCoreError, ClientError


class RuntimeSecretError(RuntimeError):
    """Raised when a required runtime secret cannot be loaded safely."""


@lru_cache
def get_secrets_manager_client() -> BaseClient:
    """Create one Secrets Manager client using Boto3's credential chain."""
    return boto3.client("secretsmanager")


@lru_cache(maxsize=4)
def get_json_secret(secret_arn: str) -> dict[str, Any]:
    """Retrieve and cache a JSON object from AWS Secrets Manager."""
    normalized_arn = str(secret_arn or "").strip()
    if not normalized_arn:
        raise RuntimeSecretError("A Secrets Manager secret ARN is required.")

    try:
        response = get_secrets_manager_client().get_secret_value(
            SecretId=normalized_arn,
        )
    except (BotoCoreError, ClientError) as exc:
        raise RuntimeSecretError(
            "Unable to retrieve a required runtime secret."
        ) from exc

    secret_string = response.get("SecretString")
    if not isinstance(secret_string, str) or not secret_string.strip():
        raise RuntimeSecretError(
            "The runtime secret must contain a non-empty SecretString."
        )

    try:
        payload = json.loads(secret_string)
    except json.JSONDecodeError as exc:
        raise RuntimeSecretError(
            "The runtime secret must contain valid JSON."
        ) from exc

    if not isinstance(payload, dict):
        raise RuntimeSecretError(
            "The runtime secret JSON must be an object."
        )

    return {str(key): value for key, value in payload.items()}