# SeatBook - Workforce Management

Enterprise seat booking and workspace management system integrated with the eFACiLiTY chatbot. Users sign in to SeatBook once, then open the chatbot from the floating assistant button without a second login or name prompt.

## Technology

- Main frontend: Next.js 15, React 19, TypeScript
- Main backend: FastAPI, PostgreSQL, JWT authentication
- Chatbot frontend: Next.js 14, React 18
- Chatbot backend: FastAPI, PostgreSQL, optional Redis and Elasticsearch

## Project structure

```text
.
|-- backend/                              # Workforce Management API
|-- frontend/                             # Workforce Management UI
|-- integrations/
|   `-- efacility-chatbot/
|       |-- backend/                      # Chatbot API
|       `-- frontend/                     # Embedded chatbot UI
|-- .env                                  # Main backend configuration (local only)
|-- pyproject.toml
`-- requirements.txt
```

## Local ports

| Service | URL/port |
|---|---|
| Main application | `http://localhost:3000` |
| Main backend API | `http://localhost:8000` |
| Chatbot frontend | `http://localhost:4200` |
| Chatbot backend API | `http://localhost:8100` |
| Main database SSM tunnel | `localhost:15432` |
| Chatbot PostgreSQL | `localhost:5432` |
| Redis (when enabled) | `localhost:6379` |
| Elasticsearch (when enabled) | `localhost:9200` |

## Prerequisites

- Node.js and npm
- Python and the project virtual environments
- PostgreSQL for the chatbot database
- AWS CLI and the Session Manager plugin for the main database tunnel
- Access to the configured AWS account and SSM instance
- Redis and Elasticsearch when their chatbot feature flags are enabled

## First-time setup

### 1. Main backend

Create `.env` in the repository root and provide the database, Microsoft authentication, JWT, AWS, and application URL settings required by `backend/core/config.py`.

Install dependencies if the root virtual environment does not exist:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Main frontend

```powershell
Copy-Item frontend\.env.example frontend\.env.local
Set-Location frontend
npm install
Set-Location ..
```

The local frontend configuration should contain:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CHATBOT_URL=http://localhost:4200
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=solugenix.com,sgxdev.com
```

### 3. Chatbot backend

Copy the integration environment template into the chatbot backend directory:

```powershell
Copy-Item integrations\efacility-chatbot\.env.example integrations\efacility-chatbot\backend\.env
```

Update `integrations/efacility-chatbot/backend/.env` for the local database and optional services. These integration values are especially important:

```env
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:3000
SEAT_BACKEND_API_URL=http://localhost:8000
SEAT_BACKEND_TRUST_ENV=false
MAIN_APP_JWT_SECRET=<same value as JWT_SECRET in the root .env>
MAIN_APP_JWT_ALGORITHM=HS256
```

`MAIN_APP_JWT_SECRET` must match the main backend's `JWT_SECRET`. This lets the chatbot validate the signed-in SeatBook user locally and avoids a second login.

Install chatbot backend dependencies if its virtual environment does not exist:

```powershell
Set-Location integrations\efacility-chatbot\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Set-Location ..\..\..
```

### 4. Chatbot frontend

```powershell
Set-Location integrations\efacility-chatbot\frontend
npm install
Set-Location ..\..\..
```

The chatbot frontend uses `http://localhost:8100` as its API by default.

## Run the integrated application

### Recommended: one-command startup

After completing the first-time setup, open PowerShell in the repository root and run:

```powershell
.\scripts\start-local.ps1
```

The script checks the required files and ports, starts the database tunnel, both APIs, and both frontends, and waits for all health checks to pass. Runtime logs are written to the ignored `.local-run` directory.

To stop the complete local stack:

```powershell
.\scripts\stop-local.ps1
```

If PowerShell blocks local scripts, use the following command for the current invocation only:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

The commands below describe the equivalent manual startup process.

Run the services in the following order. Keep each command running in a separate PowerShell terminal.

### Terminal 1 - main database tunnel

Run from the repository root:

```powershell
aws ssm start-session `
  --target <ssm-instance-id> `
  --document-name AWS-StartPortForwardingSessionToRemoteHost `
  --parameters host=<database-host>,portNumber=5432,localPortNumber=15432 `
  --region ap-south-1
```

The target instance, database host, region, and AWS credentials must match the current development environment.

### Terminal 2 - main backend

```powershell
Set-Location <repository-root>
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

### Terminal 3 - chatbot backend

```powershell
Set-Location <repository-root>\integrations\efacility-chatbot\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8100
```

### Terminal 4 - main frontend

```powershell
Set-Location <repository-root>\frontend
npm run dev -- -H localhost -p 3000
```

### Terminal 5 - chatbot frontend

```powershell
Set-Location <repository-root>\integrations\efacility-chatbot\frontend
npm run start -- -H localhost -p 4200
```

Open `http://localhost:3000`, sign in to SeatBook, and use the floating assistant button to open the chatbot.

## Verify the services

```powershell
Invoke-WebRequest http://localhost:3000/login -UseBasicParsing
Invoke-WebRequest http://localhost:4200/?embedded=1 -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8000/health -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8100/health -UseBasicParsing
```

All four requests should return HTTP `200`.

To check the listening ports:

```powershell
netstat -ano | Select-String ':3000|:4200|:8000|:8100|:15432'
```

## Troubleshooting

### Main frontend does not load

Stop the process using port `3000`, delete only the generated `frontend/.next` directory, and start the main frontend again:

```powershell
Remove-Item -LiteralPath frontend\.next -Recurse -Force
Set-Location frontend
npm run dev -- -H localhost -p 3000
```

### Microsoft login reports `token_exchange_failed`

Check `HTTP_PROXY`, `HTTPS_PROXY`, and `ALL_PROXY`. A stale proxy such as `127.0.0.1:9` prevents the backend from reaching `login.microsoftonline.com`. Correct or remove the invalid proxy values before restarting the main backend.

### Chatbot opens but authentication is slow or fails

- Confirm `MAIN_APP_JWT_SECRET` equals the main application's `JWT_SECRET`.
- Confirm `SEAT_BACKEND_API_URL=http://localhost:8000`.
- Confirm both APIs are healthy.
- Restart the chatbot backend after changing its `.env` file.

### Chatbot button or panel is not visible

- Sign in through the main application rather than opening the chatbot directly.
- Confirm `NEXT_PUBLIC_CHATBOT_URL=http://localhost:4200` in `frontend/.env.local`.
- Confirm the chatbot frontend is running on port `4200`.
- Hard-refresh the browser after restarting either frontend.

## Production build

Main frontend:

```powershell
Set-Location frontend
npm run build
npm run start
```

Chatbot frontend:

```powershell
Set-Location integrations\efacility-chatbot\frontend
npm run build
npx next start -p 4200
```

Do not commit `.env` files, access tokens, refresh tokens, client secrets, or cloud credentials.
