# SeatBook — Workforce Management Platform

> A full-stack workspace booking platform with Microsoft SSO, multi-tenant support, admin analytics, and visitor management.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Getting Started](#getting-started)
3. [Project Structure](#project-structure)
4. [Architecture Overview](#architecture-overview)
5. [Authentication Flow](#authentication-flow)
6. [Frontend Guide](#frontend-guide)
7. [Backend Guide](#backend-guide)
8. [API Reference](#api-reference)
9. [Database Schema](#database-schema)
10. [Permissions & Roles](#permissions--roles)
11. [Infrastructure](#infrastructure)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Zustand |
| Backend | FastAPI, Python 3.14+, Pydantic |
| Database | PostgreSQL (raw SQL via psycopg2, no ORM) |
| Auth | Microsoft Azure AD OAuth 2.0 → JWT (HttpOnly cookies) |
| Storage | AWS S3 (floor plan uploads) |
| Email | AWS SES (booking notifications) |
| Charts | Recharts |
| Forms | React Hook Form + Zod validation |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.14+
- PostgreSQL
- Azure AD app registration (for SSO)

### Backend

```bash
cd backend
pip install -r requirements.txt
# Configure .env (see Environment Variables section)
uvicorn backend.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### Environment Variables

**Backend (`.env`)**

| Variable | Description |
|----------|-------------|
| `db_host`, `db_name`, `db_user`, `db_password`, `db_port` | PostgreSQL connection |
| `db_sslmode` | SSL mode (e.g., `require`) |
| `jwt_secret` | Secret for signing JWT tokens |
| `jwt_algorithm` | HS256 (default) |
| `jwt_access_token_ttl` | Access token TTL in seconds |
| `jwt_refresh_token_ttl` | Refresh token TTL in seconds |
| `client_id`, `client_secret`, `tenant_id` | Azure AD OAuth credentials |
| `redirect_uri` | OAuth callback URL |
| `frontend_url` | Frontend origin for CORS |
| `aws_access_key_id`, `aws_secret_access_key`, `aws_region` | AWS credentials |
| `aws_s3_bucket_name`, `aws_s3_public_base_url` | S3 layout storage |
| `aws_ses_sender_email` | SES sender address |

**Frontend (`.env.local`)**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL (default: `http://localhost:8000`) |
| `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS` | Email domain whitelist for login |

---

## Project Structure

```
Workforce_Management/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── api/
│   │   ├── deps.py                # Dependency injection (auth, DB)
│   │   └── routes/                # 13 route modules
│   │       ├── auth.py            # SSO login, logout, refresh, /me
│   │       ├── bookings.py        # Employee seat bookings
│   │       ├── guest_bookings.py  # Guest seat bookings
│   │       ├── guest_visits.py    # Guest visit tracking
│   │       ├── guests.py          # Guest profile CRUD
│   │       ├── locations.py       # Sites, buildings, floors, seats
│   │       ├── floor_layouts.py   # Floor plan upload & management
│   │       ├── preferences.py     # Amenities & categories
│   │       ├── dashboard.py       # Employee dashboard
│   │       ├── admin_dashboard.py # Admin analytics
│   │       ├── user_management.py # User & role management
│   │       ├── teams.py           # Team overview
│   │       └── sso.py             # Azure OAuth helpers
│   ├── core/
│   │   ├── config.py              # Settings from env vars
│   │   ├── security.py            # JWT creation & validation
│   │   ├── sso.py                 # OAuth token exchange
│   │   ├── storage.py             # AWS S3 client
│   │   ├── enums.py               # Business enumerations
│   │   └── logging.py             # Structured logging
│   ├── db/
│   │   └── connection.py          # PostgreSQL connection pool
│   ├── schemas/                   # Pydantic request/response models
│   ├── services/                  # Business logic layer
│   └── repositories/              # Data access layer (raw SQL)
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx         # Root layout (providers)
│   │   │   ├── globals.css        # Tailwind v4 theme tokens
│   │   │   ├── (auth)/
│   │   │   │   └── login/page.tsx
│   │   │   └── (main)/
│   │   │       ├── layout.tsx     # Sidebar shell
│   │   │       ├── dashboard/page.tsx
│   │   │       ├── book/page.tsx
│   │   │       ├── book-for-someone/page.tsx
│   │   │       ├── mybookings/page.tsx
│   │   │       ├── profile/page.tsx
│   │   │       ├── admin/         # 13 admin pages
│   │   │       └── security/      # Security dashboard
│   │   ├── features/              # 19 feature modules
│   │   │   ├── auth/              # Login, AuthContext, SSO
│   │   │   ├── book/              # Seat booking wizard
│   │   │   ├── bookforsomeone/    # Guest/employee booking wizard
│   │   │   ├── bookings/          # My Bookings page
│   │   │   ├── dashboard/         # Employee dashboard
│   │   │   ├── admin/             # Admin dashboard
│   │   │   ├── security/          # Security visitor management
│   │   │   ├── offices/           # Office CRUD
│   │   │   ├── building/          # Building CRUD
│   │   │   ├── floor/             # Floor CRUD
│   │   │   ├── amenities/         # Amenity CRUD
│   │   │   ├── roles/             # Role management
│   │   │   ├── users/             # User management
│   │   │   ├── userProfile/       # Profile page
│   │   │   ├── managelayout/      # Visual layout editor
│   │   │   ├── managelayout1/     # Seat configuration table
│   │   │   ├── adminlayouts1/     # Floor layout listing
│   │   │   └── uploadlayouts/     # SVG upload flow
│   │   ├── components/
│   │   │   ├── ui/                # 30+ shadcn/ui primitives
│   │   │   └── layout/            # AppSidebar
│   │   ├── store/                 # Zustand stores
│   │   │   ├── seatStore.ts
│   │   │   ├── useBookForSomeoneStore.ts
│   │   │   └── useLayoutsStore.ts
│   │   ├── lib/
│   │   │   ├── http/axios.ts      # Axios instance + refresh interceptor
│   │   │   └── utils.ts           # cn() helper
│   │   ├── hooks/                 # Generic hooks (useIsMobile)
│   │   └── middleware.ts          # Auth/role redirects
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── package.json
```

---

## Architecture Overview

```
┌─────────────┐    cookies     ┌──────────────┐    SQL    ┌────────────┐
│   Next.js    │◄─────────────►│   FastAPI     │◄────────►│ PostgreSQL │
│  (Frontend)  │   axios +     │  (Backend)    │ psycopg2 │            │
│  Port 3000   │   auto-refresh│  Port 8000    │          │            │
└──────┬───────┘               └──────┬────────┘          └────────────┘
       │                              │
       │ SSO redirect                 │ OAuth callback
       ▼                              ▼
┌──────────────┐              ┌──────────────┐
│  Azure AD    │◄────────────►│ MS Graph API │
│  (OAuth 2.0) │              │ (user sync)  │
└──────────────┘              └──────────────┘
```

**Request flow:**
1. Frontend calls backend via `axiosInstance` (shared Axios with `withCredentials: true`)
2. Backend reads `access_token` from HttpOnly cookie, validates JWT
3. On 401 → Axios interceptor calls `/auth/refresh` → backend rotates tokens → retries original request
4. Backend queries PostgreSQL via repository layer (raw SQL, no ORM)
5. Notifications sent as FastAPI background tasks via AWS SES

---

## Authentication Flow

### SSO Login

```
User → "Continue" on /login
  → Browser redirect to Azure AD login
  → Azure AD authenticates user
  → Callback to backend /auth/callback with auth code
  → Backend exchanges code for Azure token
  → Backend creates/syncs user in DB (Graph API: name, department, manager)
  → Backend generates JWT access_token + refresh_token
  → Sets HttpOnly cookies (access_token, refresh_token, session_token)
  → Redirects browser to frontend / (root)
  → Middleware sees token → redirects to /dashboard
```

### Token Management

| Cookie | Purpose | TTL |
|--------|---------|-----|
| `access_token` | JWT for API auth (user_id, tenant_id, role, permissions) | Configurable |
| `refresh_token` | Token rotation | 30 days default |
| `session_token` | Microsoft Graph delegated access token | 3600s default |

### JWT Claims

```json
{
  "user_id": "string",
  "sub": "string",
  "tenant_id": "string",
  "email": "string",
  "role": "string",
  "session_id": "string",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Frontend Auth Architecture

- `AuthContext` (`features/auth/context/AuthContext.tsx`) — provides `user`, `isLoading`, `isAuthenticated`, `logout`
- `middleware.ts` — server-side route protection using `access_token` cookie
- `axios.ts` interceptor — client-side 401 handling with automatic token refresh and event dispatch (`auth:refresh-start`, `auth:refresh-end`)

---

## Frontend Guide

### Feature Module Convention

Each feature follows this structure:

```
features/<name>/
├── components/     # React components (pages, cards, modals)
├── hooks/          # Custom hooks (data fetching, state)
├── services/       # API calls via axiosInstance
├── types/          # TypeScript interfaces
├── utils/          # Helpers, constants
└── schemas/        # Zod validation schemas (if applicable)
```

### State Management

| Scope | Tool | Example |
|-------|------|---------|
| Local component | `useState` | Form fields, modals |
| Auth/session | `AuthContext` | User, isLoading, logout |
| Cross-route cache | Zustand | `seatStore`, `useBookForSomeoneStore`, `useLayoutsStore` |

### Routing

- **App Router** with route groups: `(auth)` for login, `(main)` for authenticated pages
- Two layouts: root (providers) and `(main)` (sidebar shell)
- `middleware.ts` handles:
  - No token + no refresh token → redirect to `/login`
  - Has token on `/login` → redirect to `/dashboard`
  - Non-admin on `/admin/*` → redirect to `/dashboard`
  - Non-security on `/security/*` → redirect to `/dashboard`

### Styling

- Tailwind v4 with CSS-first config
- Theme tokens in `globals.css` (`:root` / `.dark`)
- `cn()` from `lib/utils.ts` for conditional class merging
- shadcn/ui components with Tailwind theming

### Key Frontend Features

| Feature | Route | Description |
|---------|-------|-------------|
| Employee Dashboard | `/dashboard` | Stats, upcoming bookings, team info, favorite seats |
| Admin Dashboard | `/dashboard` (TENANT_ADMIN) | Occupancy charts, trend data, recent bookings |
| Security Dashboard | `/dashboard` (SECURITY) | Visitor check-in/out, stat cards, visitor table |
| Book a Seat | `/book` | 3-step wizard: workspace → select seat (SVG map) → confirm |
| Book for Someone | `/book-for-someone` | Guest/employee booking wizard with eligibility check |
| My Bookings | `/mybookings` | Tabs: My Bookings / Booked For Someone, cancel/modify |
| Profile | `/profile` | User info, seat preferences, booking history |
| Office Management | `/admin/offices` | CRUD for sites/offices |
| Building Management | `/admin/building` | CRUD for buildings |
| Floor Management | `/admin/floors` | CRUD for floors |
| Floor Layouts | `/admin/layouts` | Upload SVG, manage layout, configure seats |
| Amenities | `/admin/amenities` | CRUD for workspace amenities |
| User Management | `/admin/users` | Search users, change roles |
| Role Management | `/admin/roles` | View roles and permissions |

---

## Backend Guide

### Layer Architecture

```
Routes (API endpoints)
  → Services (business logic, validation)
    → Repositories (raw SQL queries)
      → PostgreSQL
```

### Route Modules

| Module | Prefix | Endpoints |
|--------|--------|-----------|
| `auth.py` | `/auth` | login, callback, logout, refresh, me |
| `bookings.py` | `/bookings` | CRUD, cancel, modify, eligibility, delegated |
| `guest_bookings.py` | `/guest-bookings` | Guest booking CRUD, cancel, modify |
| `guest_visits.py` | `/guest-visits` | Visit CRUD, check-in, check-out, cancel |
| `guests.py` | `/guests` | Guest profile search & create |
| `locations.py` | `/sites`, `/buildings`, `/floors`, `/seats` | Location hierarchy CRUD |
| `floor_layouts.py` | `/admin/floor-layouts` | Layout upload, activate, seat mapping |
| `preferences.py` | `/preferences`, `/amenities` | Amenity CRUD, categories |
| `dashboard.py` | `/dashboard` | Employee dashboard data |
| `admin_dashboard.py` | `/admin` | Summary, occupancy, booking analytics |
| `user_management.py` | `/users`, `/admin/users` | Search, profile update, role change |
| `teams.py` | `/teams` | Team overview |

### Dependency Injection

```python
# Database connection
db = Depends(get_db)

# Current authenticated user (validates JWT from cookie)
current_user = Depends(get_current_user)

# Permission check
_perm = Depends(require_any_permission("admin_dashboard:view", "occupancy:view"))
```

### Background Tasks

Booking creation, cancellation, and modification trigger background email notifications via AWS SES.

---

## API Reference

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/login` | No | Start Microsoft OAuth flow |
| GET | `/auth/callback` | No | OAuth callback (sets cookies) |
| POST | `/auth/logout` | Yes | Clear session & cookies |
| POST | `/auth/refresh` | Cookie | Rotate access/refresh tokens |
| GET | `/auth/me` | Yes | Get current user profile |

### Bookings (Employee)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/bookings` | Yes | Create booking |
| GET | `/bookings/me/current` | Yes | Current bookings |
| GET | `/bookings/me/future` | Yes | Upcoming bookings |
| GET | `/bookings/me/past` | Yes | Past bookings |
| GET | `/bookings/me/cancelled` | Yes | Cancelled bookings |
| GET | `/bookings/delegated/current` | Yes | Delegated current bookings |
| GET | `/bookings/delegated/future` | Yes | Delegated future bookings |
| GET | `/bookings/delegated/past` | Yes | Delegated past bookings |
| POST | `/bookings/{id}/cancel` | Yes | Cancel booking |
| POST | `/bookings/{id}/modify` | Yes | Modify booking |
| POST | `/bookings/eligibility` | Yes | Check booking eligibility |

**Create Booking Request:**
```json
{
  "site_id": 1,
  "building_id": 1,
  "floor_id": 1,
  "seat_id": 1,
  "booking_date": "2026-06-24",
  "booked_for_user_id": 2  // optional, for on-behalf bookings
}
```

### Guest Bookings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/guest-bookings` | Yes | Create guest booking (visit + seat) |
| GET | `/guest-bookings` | Yes | List guest bookings |
| GET | `/guest-bookings/{id}` | Yes | Get guest booking |
| POST | `/guest-bookings/{id}/cancel` | Yes | Cancel guest booking |
| POST | `/guest-bookings/{id}/modify` | Yes | Modify guest booking |

**Create Guest Booking Request:**
```json
{
  "guest_id": 1,
  "host_user_id": 2,
  "site_id": 1,
  "building_id": 1,
  "floor_id": 1,
  "seat_id": 1,
  "visit_date": "2026-06-24",
  "guest_type": "VISITOR",
  "purpose_of_visit": "MEETING",
  "start_time": "09:00",
  "end_time": "17:00",
  "notes": "Optional notes"
}
```

### Guest Visits

| Method | Path | Auth | Permission |Description |
|--------|------|------|-----------|-------------|
| POST | `/guest-visits` | Yes | — | Create visit (no seat) |
| GET | `/guest-visits` | Yes | `guest:view_visits` | List visits with filters |
| GET | `/guest-visits/{id}` | Yes | `guest:view_visits` | Get visit details |
| POST | `/guest-visits/{id}/check-in` | Yes | `guest:check_in` | Check in visitor |
| POST | `/guest-visits/{id}/check-out` | Yes | `guest:check_out` | Check out visitor |
| POST | `/guest-visits/{id}/book-seat` | Yes | `booking:book_for_guest` | Attach seat to visit |
| POST | `/guest-visits/{id}/cancel` | Yes | `guest:manage` | Cancel visit |
| PATCH | `/guest-visits/{id}` | Yes | `guest:manage` | Modify visit |

**Query parameters for GET `/guest-visits`:**
- `visit_scope`: CURRENT | UPCOMING | PAST
- `site_id`: Filter by site
- `visit_status`: SCHEDULED | CHECKED_IN | CHECKED_OUT | CANCELLED | NO_SHOW
- `search`: Search guest/host name
- `limit`, `offset`: Pagination

### Guests

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/guests?q=search` | Yes | Search guest profiles |
| POST | `/guests` | Yes | Create guest profile |
| GET | `/guests/{id}` | Yes | Get guest profile |

### Locations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/sites` | Yes | List sites (pagination, search, status filter) |
| POST | `/sites` | Yes | Create site |
| GET | `/sites/{id}` | Yes | Get site with hierarchy summary |
| PATCH | `/sites/{id}` | Yes | Update site |
| GET | `/buildings` | Yes | List buildings |
| POST | `/buildings` | Yes | Create building |
| PATCH | `/buildings/{id}` | Yes | Update building |
| GET | `/buildings/{id}/floors` | Yes | List floors by building |
| POST | `/floors` | Yes | Create floor |
| PATCH | `/floors/{id}` | Yes | Update floor |
| GET | `/floors/{id}/seats` | Yes | Get available seats for date range |

**Seat Availability Query Parameters:**
- `start_date`, `end_date` (required): Date range (max 31 days)
- `booked_for_user_id`: Check availability for specific user
- `is_guest_booking`: Boolean for guest booking context
- `booked_for_guest_id`: Check for specific guest
- `amenity_ids`: Filter seats by amenities
- `modifyBookingId`: Exclude existing booking from availability

### Floor Layouts

| Method | Path | Auth | Permission | Description |
|--------|------|------|-----------|-------------|
| POST | `/admin/floor-layouts` | Yes | `layout:upload` | Upload floor plan (multipart) |
| GET | `/admin/floor-layouts/floors/{id}` | Yes | `layout:upload` | List layouts for floor |
| POST | `/admin/floor-layouts/{id}/activate` | Yes | `layout:publish` | Publish layout |
| GET | `/admin/floor-layouts/{id}/seats` | Yes | `layout:upload` | Get layout seats |

### Amenities

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/preferences` | Yes | Get user-facing preferences |
| GET | `/amenities` | Yes | List amenities (pagination) |
| POST | `/amenities` | Yes | Create amenity |
| GET | `/amenities/{id}` | Yes | Get amenity |
| PATCH | `/amenities/{id}` | Yes | Update amenity |
| GET | `/amenity-categories` | Yes | List categories |
| POST | `/amenity-categories` | Yes | Create category |
| PATCH | `/amenity-categories/{id}` | Yes | Update category |

### Dashboard

| Method | Path | Auth | Permission | Description |
|--------|------|------|-----------|-------------|
| GET | `/dashboard/me` | Yes | — | Employee dashboard |
| GET | `/admin/dashboard/summary` | Yes | `admin_dashboard:view` | Admin summary stats |
| GET | `/admin/bookings` | Yes | `admin_dashboard:view` | Admin booking list |
| GET | `/admin/occupancy/date-range` | Yes | `admin_dashboard:view` | Occupancy over time |
| GET | `/admin/occupancy/hierarchy` | Yes | `admin_dashboard:view` | Occupancy by site/building/floor |

### User Management

| Method | Path | Auth | Permission | Description |
|--------|------|------|-----------|-------------|
| GET | `/users?q=search` | Yes | — | Search users |
| PATCH | `/users/me` | Yes | — | Update own profile |
| PATCH | `/admin/users/{id}/access` | Yes | `user:manage` | Change user role/status |

### Teams

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/teams/me` | Yes | Get team overview |

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Service descriptor |
| GET | `/health` | No | Health check |

---

## Database Schema

PostgreSQL with raw SQL (no ORM). Key tables:

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts (synced from Azure AD) |
| `tenants` | Multi-tenant organization data |
| `user_permissions` | Permission assignments |
| `refresh_tokens` | Active refresh token tracking |
| `sessions` | User session tracking |

### Location Hierarchy

| Table | Description |
|-------|-------------|
| `sites` | Office locations (city, country, timezone) |
| `buildings` | Buildings within sites |
| `floors` | Floors within buildings |
| `seats` | Individual seats on floors |
| `floor_layouts` | SVG floor plan files |
| `layout_seat_mappings` | Seat positions on floor plans |

### Booking Tables

| Table | Description |
|-------|-------------|
| `bookings` | Employee & guest seat reservations |
| `guest_profiles` | Guest contact information |
| `guest_visits` | Guest visit records (with/without seat) |

### Reference Tables

| Table | Description |
|-------|-------------|
| `amenities` | Workspace amenities (monitor, whiteboard, etc.) |
| `amenity_categories` | Amenity groupings |
| `user_preferences` | User seat preferences |

---

## Permissions & Roles

### Roles

| Role | Access |
|------|--------|
| `EMPLOYEE` | Book seats, view own bookings, profile |
| `MANAGER` | Employee access + team visibility |
| `TALENT` | Employee access + book for others (employees & guests) |
| `SECURITY` | Security dashboard, visitor check-in/check-out |
| `FACILITIES` | Facility management features |
| `TENANT_ADMIN` | Full admin access (bypasses permission checks) |

### Key Permissions

| Permission | Description |
|-----------|-------------|
| `admin_dashboard:view` | View admin dashboard analytics |
| `occupancy:view` | View occupancy reports |
| `booking:book_for_employee` | Book seats on behalf of employees |
| `booking:book_for_guest` | Book seats for guests |
| `booking:view_all` | View all bookings |
| `guest:view_visits` | View guest visit records |
| `guest:check_in` | Check in visitors |
| `guest:check_out` | Check out visitors |
| `guest:manage` | Cancel/modify guest visits |
| `layout:upload` | Upload floor plans |
| `layout:publish` | Publish floor layouts |
| `user:manage` | Manage user roles and status |

### Frontend Permission Checks

```typescript
// Hook usage
const { canAny } = usePermissions();
const canBookForSomeone = canAny("booking:book_for_employee", "booking:book_for_guest");

// Conditional rendering
{canBookForSomeone && <BookedForSomeoneTab />}
```

### Backend Permission Checks

```python
# Route-level dependency
@router.get("/admin/dashboard/summary")
async def get_summary(
    current_user = Depends(get_current_user),
    _perm = Depends(require_any_permission("admin_dashboard:view")),
):
    ...
```

---

## Infrastructure

### AWS Services

| Service | Usage |
|---------|-------|
| S3 | Floor plan SVG/image storage |
| SES | Booking notification emails |
| RDS | PostgreSQL database hosting |

### No CI/CD or Docker

The project currently runs in development mode without Docker containers or CI/CD pipelines.

### Development Servers

| Service | URL | Command |
|---------|-----|---------|
| Frontend | `http://localhost:3000` | `npm run dev` |
| Backend | `http://localhost:8000` | `uvicorn backend.main:app --reload` |

---

## Data Flow Examples

### Employee Books a Seat

```
1. User selects site → building → floor → date range
2. Frontend: GET /floors/{id}/seats?start_date=...&end_date=...
3. SVG floor map renders with available seats colored
4. User selects seat → reviews → confirms
5. Frontend: POST /bookings { site_id, building_id, floor_id, seat_id, booking_date }
6. Backend validates eligibility, creates booking, triggers email notification
7. Frontend navigates to /mybookings
```

### Guest Visit with Seat Booking

```
1. Talent user selects guest (search or create new)
2. Fills visit details: type, purpose, host, date, site/building/floor
3. Eligibility check: POST /bookings/eligibility
4. If seat required → redirects to /book with guest params
5. Frontend: POST /guest-bookings { guest_id, host_user_id, seat_id, visit_date, ... }
6. Backend creates guest_visit + booking in single transaction
7. Frontend navigates to /mybookings?tab=bookedForSomeone
```

### Security Check-In

```
1. Security user views /security/dashboard
2. GET /guest-visits?visit_scope=CURRENT&site_id=...
3. Sees today's expected visitors in table
4. Clicks "Check In" on a visitor row
5. POST /guest-visits/{id}/check-in
6. Visitor status updates to CHECKED_IN, stat cards refresh
```
