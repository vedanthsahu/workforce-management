# Postman guide for the Seat Management API

## Files to import

Import these two files into the Postman desktop application or a cloud workspace:

1. `seat-management.postman_collection.json`
2. `seat-management.postman_environment.json`

Select **Seat Management - Local QA** in the environment selector. There is nothing to compile: Postman reads the JSON collection directly. If Postman Local Mode offers to upgrade the files to v3 YAML, that conversion is optional; keep these v2.1 JSON source files so they remain portable and regeneratable.

## Start the backend

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload
```

The supplied `baseUrl` is `http://localhost:8000`. First send `GET /health`. If the API runs elsewhere, update `baseUrl` in the selected environment.

## Authenticate in Postman

The backend uses browser SSO and issues its own access/refresh tokens as HTTP-only cookies. A Microsoft token copied from Graph or browser storage will not work.

Preferred cookie flow:

1. Open `GET /auth/login` in a browser that shares Postman's cookie jar or use Postman's browser-based authorization flow.
2. Complete Microsoft sign-in and allow the callback to finish.
3. Confirm Postman's cookie manager contains `access_token` and `refresh_token` for the API host.
4. Send `GET /auth/me` and confirm the user, role, and permissions.

Bearer-token alternative:

1. Obtain a backend-issued access JWT from an authorized development/test login workflow or browser network response.
2. Paste only the token value into the environment's secret `accessToken` variable.
3. Keep collection authorization set to **Inherit auth from parent**.

Do not send access or refresh tokens to testers in the collection file. Each tester should authenticate with an approved test account.

## Where inputs and outputs appear

- Path IDs use environment variables such as `{{bookingId}}`, `{{guestVisitId}}`, and `{{sessionId}}`.
- Query inputs are under **Params**. Optional filters are intentionally disabled; tick the checkbox to use one.
- JSON inputs are under **Body > raw > JSON**.
- Floor-layout uploads use **Body > form-data**; select the local SVG file for the file field.
- After sending, the live output appears in the lower **Response** panel.
- Saved example outputs are available from the request's **Examples** menu. Each request contains a positive success example and applicable 401/403/404/422 negative examples.
- Detailed purpose, roles, tables, and scenarios appear in the request's **Documentation/Description** panel and in `API_REFERENCE.md`.

## Recommended execution order

1. Health and authentication: `/health`, `/auth/me`.
2. Read master data: `/sites`, `/buildings`, `/floors`, `/amenities`.
3. Create dedicated QA records before mutation tests. Save returned IDs into environment variables.
4. Run positive scenarios with a role that is expected to succeed.
5. Repeat protected requests with missing auth and with a role that must fail.
6. Run ownership and cross-tenant negative tests using approved isolated test data.
7. Run destructive/cancellation scenarios last because several workflows are stateful and not reversible.

## Sharing with another tester

Send the two JSON files plus the three Markdown documents. The tester imports the JSON files, chooses or edits the environment, starts/targets a backend, and signs in with their own test account. Environment values and cookies are local to their Postman installation unless they explicitly sync them.

## Troubleshooting

- **401 missing_access_token**: no backend JWT/cookie was sent, or the wrong environment is selected.
- **401 microsoft_token_not_accepted**: replace the Microsoft token with a backend-issued token.
- **401 session_revoked/inactive_user**: sign in again with an ACTIVE user.
- **403 insufficient_permissions**: inspect `/auth/me`; the role's tenant-scoped permission rows may differ from the documented seed.
- **404 using a sample ID**: replace the placeholder with an ID that exists in the authenticated tenant.
- **422 validation error**: compare Params/Body with the request schema and required fields in the documentation.
- **Callback fails when sent manually**: expected unless the matching OAuth state cookie and authorization code were created by `/auth/login`.
