# SeatBook / Workforce Management — Reference

Seat booking and hybrid-workplace management system (floors, seats, amenities, teams, guest visits) with an integrated chatbot assistant mounted inside the same backend/frontend (no separate service, no second login). Repo name on GitHub is `Workforce_Management`; local folder is `Seat_Management`. Remote: `https://github.com/vedanthsahu/Workforce_Management.git` (also a `personal` remote pointing at `workforce-management.git`, lowercase — check which is actually canonical before pushing if both exist).

## Stack
- **Backend**: FastAPI + PostgreSQL, JWT auth, SSO (`backend/core/sso.py`), deployed via AWS (SAM template at `template.yaml`, Lambda entrypoint `backend/lambda_entrypoint.py` alongside the local `backend/main.py` uvicorn entrypoint).
- **Frontend**: Next.js 15, React 19, TypeScript, feature-folder structure under `frontend/src/features/`.
- **Local dev**: backend on `:8000`, frontend on `:3000`, Postgres reached through an AWS SSM port-forward tunnel on `:15432` — there is no local Postgres; dev always talks to a real AWS-hosted database through the tunnel. See README's three-terminal run order (tunnel → backend → frontend).

## Directory layout (backend)
```
backend/
├── main.py, lambda_entrypoint.py     # two entrypoints: local uvicorn vs AWS Lambda (same app)
├── api/routes/                       # FastAPI routers, one file per domain (listed below)
├── services/                         # business logic layer
├── repositories/                     # data-access layer (raw psycopg2, not an ORM at runtime — see DB section)
├── core/                             # config, auth, authorization, CSRF, storage, SSO, enums, retry, security
├── schemas/                          # Pydantic request/response models
├── chatbot/                          # the mounted chatbot sub-app (own models/schemas/services/deps)
├── db/
│   ├── connection.py                 # runtime DB connection handling
│   └── migrations/                   # Alembic baseline (36 tables) — see DB section, this is NOT yet wired as the live migration path
├── templates/email/                  # transactional email templates
├── docs/                             # Postman collections, API docs
└── tests/                            # one dir per domain (booking, auth, audit, floor_layouts, blocked_seats, admin_*, team, core, integration, api)
```

### API routes (`backend/api/routes/`)
`auth.py`, `sso.py` — login/session/SSO exchange
`bookings.py`, `guest_bookings.py`, `guest_visits.py`, `guests.py` — core booking domain, including guest (non-employee) visitor bookings
`admin_bookings.py`, `admin_dashboard.py`, `admin_audit.py`, `admin_blocked_seats.py` — admin-only surfaces
`dashboard.py` — regular-user dashboard
`floor_layouts.py` — SVG floor-plan upload/management (this is the route behind the SVG-upload XSS fix, see Security)
`locations.py` — buildings/sites/floors
`teams.py`, `user_management.py` — team membership, user/role administration
`business_rules.py`, `preferences.py`, `operations.py` — booking-window/business-rule config, user work preferences, misc ops
`chatbot.py` — thin mount point into `backend/chatbot/`

### Services / repositories
Each domain has a matching `services/<x>_service.py` + `repositories/<x>_repository.py` pair (booking, guest, guest_visit, blocked_seat, floor_layout, location, team, user_management, business_rule, dashboard, admin_dashboard, audit, preferences, notification, idempotency, auth). `repositories/permission_repository.py` and `repositories/token_repository.py` have no matching top-level service file — they're used directly by auth/authorization code instead.

### Chatbot (`backend/chatbot/`)
Self-contained sub-app: `models/chatbot.py`, `schemas/chat.py`, and a `services/` layer with real breadth — `chat_engine.py` (orchestration), `intent_matcher.py`, `entity_extractor.py`, `confidence_service.py`, `free_text_service.py`, `input_guard_service.py` (abuse/injection guarding on free text), `text_normalizer_service.py`, `navigation_service.py`, `menu_service.py`, `booking_edit_service.py` (lets the chatbot actually modify bookings, not just answer questions), `seat_backend_api_service.py` (calls back into the main booking API rather than duplicating booking logic), `memory_service.py` + `conversation_log_service.py` + `session_service.py` (per-session conversation state), `chat_adapter_service.py`, `telemetry_service.py`. This is a rules/intent-matching + guided-menu chatbot architecture (menu_service, navigation_service, intent_matcher) rather than a pure LLM-RAG chatbot like AskGenix — worth keeping that distinction in mind when comparing the two projects.

See `CHATBOT_SESSION_FOLLOWUPS.md` at repo root for open chatbot-session work items (session issue was part of recent idempotency/session fix commits).

## Database
36-table Alembic baseline now lives at `backend/db/migrations/` (brought in as an additive-only commit from `feature/alembic-schema-baseline` — no service-code changes alongside it). **This is not yet the system of record for applying schema changes** — README explicitly warns not to assume migrations run automatically anywhere; check `db/migrations/`'s own files before assuming otherwise. There's also a `backend/migrations/` directory at a different path — confirm which one is actually current before touching schema.

Key tables: `AppUsers`, `AuthIdentities`, `AuthTokenEvents`, `UserSessions` (auth/identity); `Bookings`, `Seats`, `FloorLayouts`, `Floors`, `Buildings`, `Sites`, `LayoutSeatMappings`, `BlockedSeats` (booking/space domain); `Amenities`, `AmenityCategories`, `SeatAmenities`, `UserPreferredAmenities` (amenities); `Teams`, `TeamMembers` (org structure); `GuestVisits`, `Guests` (visitor domain); `Roles`, `Permissions`, `RolePermissions`, `Groups`, `GroupPermissions`, `RoleGroups`, `UserGroups` (a full RBAC catalog exists in schema — see Authorization below for why it isn't fully used yet); `BusinessRules`, `TenantBusinessRules`, `Tenants` (multi-tenant business-rule config); `AuditLogs`; `ChatbotSessions`, `ChatbotMessages`; `EmailLogs`; `UserGraphProfiles`, `UserWorkPreferences`.

**Migration access policy (by design, not a gap)**: a single shared database role is used for running Alembic migrations — deliberately not per-developer migration roles. Don't propose per-dev migration roles as a fix for anything; this was a considered decision.

## Authorization / roles
`backend/core/authorization.py` defines role constants: `FACILITATOR`, `EMPLOYEE`, and `MANAGER` — the last one is explicitly commented **"dormant: assignable, but carries no authority in this module."** `PRODUCT_ADMIN` is similarly dormant elsewhere in the codebase. Both exist in code/schema but are intentionally unused/latent right now — treat them as such, not as bugs to "fix" by wiring them up.

Open audit finding (see Security below): authorization is currently decided by hard-coded role-name string comparisons (`role_name.strip().upper()` against constants like `FACILITATOR`/`ADMIN`) rather than by the `Roles`/`Permissions`/`RolePermissions`/`Groups` catalog that actually exists in the schema — the RBAC tables are present in the DB but not the live enforcement mechanism yet.

## Idempotency ledger (`backend/services/idempotency_service.py` + `repositories/idempotency_repository.py`)
Concurrency-safe booking create/modify via a claim/replay/reconcile ledger, not simple locking:
1. `begin_idempotent_operation()` claims an `Idempotency-Key` (own immediate commit) or, if already claimed, replays the stored response / rejects a payload mismatch / reports in-progress / reports a known-failed outcome / reconciles an abandoned attempt.
2. The caller's business write and `mark_idempotent_operation_succeeded()` happen in the **same transaction**.
3. On failure, `mark_idempotent_operation_failed()` runs as a fresh, separately-committed statement after rollback (same pattern as the audit-log write-safety approach).
4. `get_operation_status()` — a GET — deliberately triggers the same reconciliation logic when it finds a stale `PENDING` row (documented as intentional, not an accidental side effect on a read endpoint: a GET can acquire business locks and write a `FAILED` outcome).
5. **Fail-closed by design** (see `dev-notes/backend/idempotency_recovery_design.md`, decision 10): a reclaimed/abandoned row is never handed back to the caller to re-execute. Only a genuinely fresh key with no prior row returns a claim the caller acts on; everything else resolves to a replay or a raised error.
6. `STALE_AFTER_SECONDS = 60` — an operation pending longer than this is eligible for reconciliation.
7. A missing/empty `Idempotency-Key` is a no-op — unkeyed callers get unchanged legacy behavior.

`modify_booking` is wired into this ledger (not just `create`). Frontend sends the `Idempotency-Key` header on booking create/modify retries.

## Recent work (from commit history, most recent first)
- Alembic baseline (36 tables) brought in additively.
- Audit fixes **S-01/S-02/S-05**: stored XSS via SVG floor-layout upload, CSRF on cookie-authenticated mutations, booking-window bypass on modify (see Security below — these are the same three items the README documents as fixed).
- Guest-visit attribution fixes on booking changes; chatbot hidden on expired session.
- Idempotency ledger wired into `modify_booking`; cancel-retry false-rejection fix; CREATE reconciliation hardening + lock-order test coverage.
- Guest visit modification flow fixes (new linked row vs MODIFIED row semantics), cancelled-space row display, admin row action fixes, auto-set "To" date from "From" date.
- Amenity search alphabetical ordering; general search functionality.

## Security posture
A zero-trust API security audit was completed (full findings in `dev-notes/backend/api_security_audit.md` — kept out of version control, personal/engineering-context notes, not meant to be pushed). Fixed so far:
- **CSRF** (`backend/core/csrf_protection.py`): rejects state-changing requests (`POST`/`PATCH`/`PUT`/`DELETE`) whose `Origin` (falling back to `Referer`) is present and not an allowed frontend origin.
- **Stored XSS via SVG upload** (`backend/core/storage.py`, `validate_svg_file`): now parses with `defusedxml` and enforces an explicit element/attribute allowlist instead of a denylist regex that known bypasses (`onbegin=`, `<animate>` abuse, entity-encoded `javascript:` URIs) could route around.
- **Booking-window bypass on modify**: `validate_booking_window()` in `backend/services/booking_service.py` is now shared by create and modify (previously only create re-checked "not in the past"/max-advance-days).

**Still open** (per README + audit doc): authorization via hard-coded role names rather than the Roles/Permissions/Groups catalog (see Authorization above), the SSO gateway's token-trust model, and the database runtime role's privilege scope.

## Known rough edges / things to check before relying on them
- `scripts/start-local.ps1` is stale — predates the chatbot being merged into the main app, still references a separate `efacility-chatbot/` service that no longer exists in this repo. Use the README's three-terminal process instead.
- Two migration-looking directories exist (`backend/db/migrations/` — the real Alembic baseline — and `backend/migrations/`) — confirm which is current before any schema work.
- `MANAGER` and `PRODUCT_ADMIN` roles are dormant by design, not half-implemented features waiting to be finished.
- `origin` vs `personal` git remotes point at differently-cased repo names (`Workforce_Management` vs `workforce-management`) — verify target before pushing.

## Standing conventions for this repo (from prior sessions)
- Commit messages: single-line `[vedanth] ...`, no Co-Authored-By trailer, never commit unless explicitly asked.
- Always get explicit go-ahead immediately before any DB write/migration operation — never narrate-then-execute (migration credentials were revoked once over this).
- Repository-layer tests need at least one non-mocked `FakeCursor` test per function, not every test mocking the function away.
- Real bugs found during an audit/review should be fixed directly (git is the safety net), not just reported.
