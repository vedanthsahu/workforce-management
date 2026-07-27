from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.core import config, runtime_secrets, storage
from backend.core.runtime_secrets import RuntimeSecretError
from backend.services.notification_service import NotificationService


class AwsRuntimeSecurityTests(unittest.TestCase):
    def setUp(self) -> None:
        runtime_secrets.get_secrets_manager_client.cache_clear()
        runtime_secrets.get_json_secret.cache_clear()
        storage.get_s3_client.cache_clear()

    def tearDown(self) -> None:
        runtime_secrets.get_secrets_manager_client.cache_clear()
        runtime_secrets.get_json_secret.cache_clear()
        storage.get_s3_client.cache_clear()

    def test_secrets_manager_uses_default_iam_credential_chain(self) -> None:
        with patch(
            "backend.core.runtime_secrets.boto3.client"
        ) as boto_client:
            runtime_secrets.get_secrets_manager_client()

        boto_client.assert_called_once_with("secretsmanager")

    def test_s3_uses_default_iam_credential_chain(self) -> None:
        settings = SimpleNamespace(aws_region="ap-south-1")

        with (
            patch("backend.core.storage.get_settings", return_value=settings),
            patch("backend.core.storage.boto3.client") as boto_client,
        ):
            storage.get_s3_client()

        boto_client.assert_called_once_with(
            "s3",
            region_name="ap-south-1",
        )

    def test_ses_uses_default_iam_credential_chain(self) -> None:
        service = object.__new__(NotificationService)
        service._settings = SimpleNamespace(aws_region="ap-south-1")

        with patch(
            "backend.services.notification_service.boto3.client"
        ) as boto_client:
            service._build_ses_client()

        boto_client.assert_called_once_with(
            "ses",
            region_name="ap-south-1",
        )

    def test_json_secret_is_loaded_once_and_cached(self) -> None:
        client = MagicMock()
        client.get_secret_value.return_value = {
            "SecretString": '{"host":"db.example","port":5432}'
        }

        with patch(
            "backend.core.runtime_secrets.get_secrets_manager_client",
            return_value=client,
        ):
            first = runtime_secrets.get_json_secret("arn:aws:secretsmanager:test")
            second = runtime_secrets.get_json_secret("arn:aws:secretsmanager:test")

        self.assertEqual(first, {"host": "db.example", "port": 5432})
        self.assertEqual(second, first)
        client.get_secret_value.assert_called_once_with(
            SecretId="arn:aws:secretsmanager:test"
        )

    def test_runtime_settings_loads_required_values_from_both_secrets(self) -> None:
        database_secret = {
            "host": "db.example",
            "username": "seatbooking_runtime",
            "password": "database-password",
            "port": "5432",
        }
        application_secret = {
            "jwt_secret": "jwt-secret",
            "microsoft_client_secret": "microsoft-secret",
        }

        with (
            patch.dict(
                os.environ,
                {
                    "DATABASE_SECRET_ARN": "database-arn",
                    "APPLICATION_SECRET_ARN": "application-arn",
                },
                clear=True,
            ),
            patch(
                "backend.core.config.get_json_secret",
                side_effect=[database_secret, application_secret],
            ) as get_json_secret,
        ):
            values = config._runtime_secret_settings()

        self.assertEqual(values["db_host"], "db.example")
        self.assertEqual(values["db_user"], "seatbooking_runtime")
        self.assertEqual(values["db_password"], "database-password")
        self.assertEqual(values["db_port"], 5432)
        self.assertEqual(values["jwt_secret"], "jwt-secret")
        self.assertEqual(values["client_secret"], "microsoft-secret")
        self.assertEqual(
            get_json_secret.call_args_list[0].args,
            ("database-arn",),
        )
        self.assertEqual(
            get_json_secret.call_args_list[1].args,
            ("application-arn",),
        )

    def test_runtime_settings_rejects_partial_secret_configuration(self) -> None:
        with patch.dict(
            os.environ,
            {"DATABASE_SECRET_ARN": "database-arn"},
            clear=True,
        ):
            with self.assertRaises(RuntimeSecretError) as context:
                config._runtime_secret_settings()

        self.assertIn(
            "must both be configured",
            str(context.exception),
        )


if __name__ == "__main__":
    unittest.main()