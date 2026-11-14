# SeatBook

Seat booking and workspace management system with an integrated chatbot assistant. Users sign in once, then open the chatbot from the floating assistant button without a second login.

## Technology

- Frontend: Next.js 15, React 19, TypeScript
- Backend: FastAPI, PostgreSQL, JWT authentication
- Chatbot: mounted inside the same backend (`backend/chatbot`) and frontend — no separate service, no second login

## Project structure

```text
.
|-- backend/                              # API, including the mounted chatbot (backend/chatbot)
|-- frontend/                             # UI
|-- .env                                  # Backend configuration (local only)
|-- pyproject.toml
`-- requirements.txt
```

## Local ports

| Service | URL/port |
|---|---|
| Application | `http://localhost:3000` |
| Backend API | `http://localhost:8000` |
| Database SSM tunnel | `localhost:15432` |

## Prerequisites

- Node.js and npm
- Python and the project virtual environment
- AWS CLI and the Session Manager plugin for the database tunnel
- Access to the configured AWS account and SSM instance

## First-time setup

### 1. Backend

Create `.env` in the repository root and provide the database, SSO, JWT, AWS, and application URL settings required by `backend/core/config.py`.

Install dependencies if the virtual environment does not exist:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Frontend

```powershell
Copy-Item frontend\.env.example frontend\.env.local
Set-Location frontend
npm install
Set-Location ..
```

The local frontend configuration should contain:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=example.com
```

## Run the application

Open PowerShell in the repository root and run each in its own terminal, in order.

### Terminal 1 - database tunnel

```powershell
aws ssm start-session `
  --target <ssm-instance-id> `
  --document-name AWS-StartPortForwardingSessionToRemoteHost `
  --parameters host=<database-host>,portNumber=5432,localPortNumber=15432 `
  --region <aws-region>
```

The target instance, database host, region, and AWS credentials must match the current development environment.

### Terminal 2 - backend

```powershell
Set-Location <repository-root>
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

### Terminal 3 - frontend

```powershell
Set-Location <repository-root>\frontend
npm run dev -- -H localhost -p 3000
```

Open `http://localhost:3000`, sign in, and use the floating assistant button to open the chatbot.

> `scripts/start-local.ps1` predates the chatbot being merged into the main app and still references a separate `efacility-chatbot/` service that no longer exists in this repository — don't use it until it's updated to the three-step process above.

## Verify the services

```powershell
Invoke-WebRequest http://localhost:3000/login -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8000/health -UseBasicParsing
```

Both requests should return HTTP `200`.

To check the listening ports:

```powershell
netstat -ano | Select-String ':3000|:8000|:15432'
```

## Troubleshooting

### Frontend does not load

Stop the process using port `3000`, delete only the generated `frontend/.next` directory, and start the frontend again:

```powershell
Remove-Item -LiteralPath frontend\.next -Recurse -Force
Set-Location frontend
npm run dev -- -H localhost -p 3000
```

### SSO login reports `token_exchange_failed`

Check `HTTP_PROXY`, `HTTPS_PROXY`, and `ALL_PROXY`. A stale proxy prevents the backend from reaching the identity provider. Correct or remove the invalid proxy values before restarting the backend.

### Chatbot button or panel is not visible

- Sign in through the main application first.
- Confirm the backend is healthy (`/health`).
- Hard-refresh the browser after restarting the backend.

## Production build

```powershell
Set-Location frontend
npm run build
npm run start
```

## Security

A zero-trust API security audit was completed; see `dev-notes/backend/api_security_audit.md` (kept out of version control — personal/engineering-context notes, not meant to be pushed) for the full findings register. Fixed so far:

- **CSRF on cookie-authenticated mutations** — `backend/core/csrf_protection.py` rejects any `POST`/`PATCH`/`PUT`/`DELETE` whose `Origin` (falling back to `Referer`) is present and not an allowed frontend origin.
- **Stored XSS via uploaded floor-layout SVGs** — `backend/core/storage.py`'s `validate_svg_file` now parses uploads with a hardened XML parser (`defusedxml`) and rejects anything outside an explicit element/attribute allowlist, instead of pattern-matching a denylist that known bypasses (`onbegin=`, `<animate>` abuse, entity-encoded `javascript:` URIs) could route around.
- **Booking-window rules bypassed on modify** — creating a booking enforced "not in the past" and "within the max advance-days policy," but modifying one didn't re-check the *new* date. `validate_booking_window()` in `backend/services/booking_service.py` is now shared by both create and modify.

Still open (see the audit for full detail, evidence, and suggested fixes): authorization decided by hard-coded role names rather than the permission/group catalog, the SSO gateway's token-trust model, and the database runtime role's privilege scope.

Do not commit `.env` files, access tokens, refresh tokens, client secrets, or cloud credentials.
