# SeatBook — Workforce Management

Enterprise seat booking and workspace management system: book seats, manage bookings, and administer offices/buildings/floors/layouts.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Zustand
- **Backend**: FastAPI (Python 3.14), PostgreSQL (via psycopg2), JWT-based auth

## Project Structure

```
.
├── backend/                  # FastAPI application
│   └── requirements.txt      # Lambda production dependencies
├── frontend/                 # Next.js application
├── pyproject.toml            # Backend Python project config
└── uv.lock                   # Backend dependency lockfile
```

## Getting Started

### Backend

```bash
uv sync                 # install dependencies (or: pip install -r backend/requirements.txt)
uvicorn backend.main:app --reload
```

Requires a `.env` file at the repo root with database connection details and JWT secret (see `backend/core/config.py` for required variables).

### Frontend

```bash
cd frontend
npm install
npm run dev          # development server (http://localhost:3000)
```

Set `NEXT_PUBLIC_API_URL` if the backend isn't on `http://localhost:8000`.

#### Production build

```bash
cd frontend
npm run build         # build for production
npx next start        # run the production build
```

