import unittest

from fastapi import HTTPException

from app.config import settings
from app.deps.admin_auth import require_admin_token


class AdminAuthTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.original_token = settings.ADMIN_API_TOKEN

    async def asyncTearDown(self):
        settings.ADMIN_API_TOKEN = self.original_token

    async def test_admin_token_disabled_when_not_configured(self):
        settings.ADMIN_API_TOKEN = ""

        await require_admin_token("")

    async def test_admin_token_rejects_bad_token(self):
        settings.ADMIN_API_TOKEN = "secret"

        with self.assertRaises(HTTPException) as ctx:
            await require_admin_token("bad")

        self.assertEqual(ctx.exception.status_code, 403)

    async def test_admin_token_accepts_matching_token(self):
        settings.ADMIN_API_TOKEN = "secret"

        await require_admin_token("secret")


if __name__ == "__main__":
    unittest.main()
