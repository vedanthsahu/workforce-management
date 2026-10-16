import unittest

from app.config import Settings


class SettingsTests(unittest.TestCase):
    def build_settings(self, **overrides):
        values = {
            "DB_HOST": "localhost",
            "DB_PORT": 5432,
            "DB_NAME": "chatbot",
            "DB_USER": "chatbot",
            "DB_PASSWORD": "password",
            "DB_SSLMODE": "disable",
            **overrides,
        }
        return Settings(_env_file=None, **values)

    def test_root_jwt_secret_is_used_for_integrated_chatbot_tokens(self):
        settings = self.build_settings(
            JWT_SECRET="shared-root-secret",
            MAIN_APP_JWT_SECRET="stale-chatbot-secret",
        )

        self.assertEqual(settings.MAIN_APP_JWT_SECRET, "shared-root-secret")

    def test_standalone_main_app_secret_remains_supported(self):
        settings = self.build_settings(
            JWT_SECRET="",
            MAIN_APP_JWT_SECRET="standalone-secret",
        )

        self.assertEqual(settings.MAIN_APP_JWT_SECRET, "standalone-secret")


if __name__ == "__main__":
    unittest.main()
