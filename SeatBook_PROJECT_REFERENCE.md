# SeatBook / Workforce Management — Reference

Seat booking and hybrid-workplace management system (floors, seats, amenities, teams, guest visits) with an integrated chatbot assistant mounted inside the same backend/frontend (no separate service, no second login). Repo name on GitHub is `Workforce_Management`; local folder is `Seat_Management`. Remote: `https://github.com/vedanthsahu/Workforce_Management.git` (also a `personal` remote pointing at `workforce-management.git`, lowercase — check which is actually canonical before pushing if both exist).

*Verified by three successive direct-source-read passes against the actual backend code (not reasoned from portfolio notes). Known gaps are stated once, plainly, at the end of this document — not scattered as inline "earlier pass said X" asides.*

## The Real Flow (read this before the component breakdown)
Everything below this section is a component inventory. This section is what actually *happens*, in order, for the handful of flows worth being able to narrate from memory in an interview. A human-readable walkthrough of these same flows (plus the "why," told as stories) lives in `SeatBook_LEARNING_GUIDE.md` next to this file.

### Flow 1 — Microsoft SSO login, end to end (two entry paths)
There are genuinely **two** login entry points, not one:
```
PATH A (direct):                          PATH B (gateway):
User clicks "Log in with Microsoft"       User goes through apps.solugenix.com
        ↓                                         ↓
Redirect to Microsoft OAuth               Gateway redirects to its own
        ↓                                  callback with an HS256 wrapper
Microsoft redirects back with a code      token this backend CANNOT verify
        ↓                                  the signature of (no shared secret)
exchange_code_for_token() → access       ↓
   + id_token                            decode_gateway_token() extracts the
        ↓                                 Graph access token EMBEDDED inside
verify_id_token(): RS256 signature        the wrapper, without trusting the
   checked against Microsoft's live       wrapper's own claims
   JWKS keys, audience + tenant checked          ↓
        ↓                                 Trust established the honest way:
                                           that embedded Graph token is only
                                           acted on once Microsoft itself
                                           accepts it on a real Graph call —
                                           a forged wrapper would carry a
                                           token Microsoft rejects outright
        └──────────────────┬──────────────────────┘
                            ↓
Microsoft Graph API calls: current user profile, reporting manager,
   distribution-list / group membership
                            ↓
Distribution-list membership determines the enterprise role —
   no manual admin assignment; the org's own directory decides
                            ↓
First login → create the AppUsers row (auto-provisioning, Flow 2); returning
   user → department/team re-synced on this login (role is NOT re-checked
   here — role drift is caught only by the background sync thread in Flow 2)
                            ↓
Generate JWT access + refresh tokens  →  set as cookies
                            ↓
Redirect to frontend, authenticated
```
Why this shape: it removes manual account administration entirely — the enterprise directory is the one source of truth for who exists and what they're allowed to do, re-checked continuously rather than fixed at creation time. The gateway path's trust model is worth stating precisely: the wrapper token's signature is never verified by this service (it can't be — different signing secret) — trust is established downstream, by requiring the Graph token embedded inside it to actually work against Microsoft.

**The Graph→profile hydration itself is hand-written, not SDK/ORM-driven** (`backend/api/routes/sso.py` `_provision_first_time_user()` / `_sync_existing_user_department_team()`, `backend/repositories/user_repository.py`). There is no Microsoft Graph SDK model binding and no auto-mapping — every field is pulled out of the raw `/me` and `/me/manager` JSON by hand (`_resolve_email`, `_resolve_display_name`, `_resolve_full_name`, `_resolve_optional_graph_text`, …) and written via plain parameterized SQL to **three separate tables**, each with a different purpose:
- `app_users` — the flat, queryable profile columns the rest of the app reads (`create_app_user_from_graph`, an `INSERT … ON CONFLICT (tenant_id, microsoft_object_id) DO UPDATE`). Most fields are unconditionally overwritten from Graph on every sync, but `mobile_phone` and `office_location` use `COALESCE(app_users.<col>, EXCLUDED.<col>)` — once a user (or an admin) has a value there, Graph can no longer blank it out, it can only fill it in if it was empty.
- `user_graph_profiles` — a second, wider table (`upsert_user_graph_profile`) holding the full enriched Graph payload (givenName, surname, businessPhones, city/state/country, manager's Graph object id, and the raw JSON itself) that `app_users` doesn't carry — kept separate so the narrow hot-path table isn't bloated with fields almost nothing queries.
- `auth_identities` — the provider-identity link row (`create_auth_identity_for_user`), `ON CONFLICT (provider, provider_user_id) DO NOTHING` on first creation only, plus the raw Graph profile JSON stored again here as `raw_profile` for audit/debugging.

So "hydration" means exactly that: a manual, field-by-field copy from Microsoft's API response into Postgres on every login (full provisioning on first login, a narrower department-only resync on every return visit) — not a background sync job, not a Graph SDK's object mapper, and not something an ORM does implicitly.

**Once a session exists, staying logged in doesn't mean a database write on every request either.** `extend_session_activity()` (`backend/repositories/token_repository.py`, called from `backend/api/deps.py`'s `get_auth_context` on every authenticated request) pushes a session's expiry forward — but only writes the row when the session's `last_used_at` is already more than `SESSION_ACTIVITY_TOUCH_INTERVAL_SECONDS` (60s) stale. Without that throttle, a user clicking around the app would turn into a `UPDATE user_sessions` on literally every API call; with it, an active burst of requests costs one write per minute instead of one write per request, while a genuinely idle user's session still gets extended the moment they come back. It's also fail-open by design: if the touch write itself errors, the error is caught, the transaction rolled back, and the request proceeds anyway with the claims it already had — a session-extension failure must never turn into a failed, otherwise-valid request.

### Flow 2 — Identity & team lifecycle: intake, update, maintain (a full account-lifecycle engine, not a side effect of login)
What's built here is a three-phase account-lifecycle engine — automatic intake, automatic update, and continuous background maintenance — plus two separate manual override paths, all converging on the same `app_users`/`teams`/`team_members` tables with deliberately non-conflicting write rules. Verified against `backend/api/routes/sso.py`, `backend/services/auth_service.py`, `backend/services/user_management_service.py`, `backend/repositories/user_repository.py`, `backend/core/config.py`, and the three scheduler functions in `backend/main.py`.

**1. Intake — first login, fully automatic, zero admin action required.**
- Role is decided *before* the user row is even created: `determine_graph_onboarding_role()` checks live Graph group membership (with configurable retries + backoff — `graph_role_lookup_retries`, `graph_role_lookup_backoff_seconds`), returning `FACILITATOR` or `EMPLOYEE`. If no group is configured, everyone defaults to `EMPLOYEE` — nobody is silently provisioned with elevated access by a missing setting.
- The manager relationship is resolved opportunistically: `/me/manager`'s Graph object id is looked up against `app_users` — if the manager has logged in before and already exists, `manager_user_id` is set immediately; if not, the relationship is only recorded as a Graph object id (in `user_graph_profiles`) until the manager eventually logs in themself.
- Department drives **automatic team assignment**, not just a profile field: `sync_department_team_for_user()` does a case-insensitive match against existing `teams.team_name`; if one already matches, it's reused (regardless of whether it was originally hand-created or Graph-created); if none matches, a new team is minted with `source = 'GRAPH'` so auto-created teams are distinguishable from admin-created ones in the data itself. Either way, any other team row the user currently belongs to in this tenant is deleted first, so a department move relocates the user rather than accumulating stale memberships.

**2. Update — every subsequent login, intentionally narrower than intake.**
- `_sync_existing_user_department_team()` only touches **department and team membership** on a returning login — it does not re-check role, and does not rewrite every profile field. The precise claim: department/team sync happens on every login; role only changes via the background sync thread or a manual admin override, never by logging in.
- It's explicitly best-effort/fail-open: any Graph or database error here is caught, logged, and swallowed — a stale department sync must never turn into a failed login.

**3. Maintain — three always-on daemon threads, started once at `backend/main.py`'s FastAPI `startup` event, independent of anyone logging in at all:**
| Thread | What it does | Default state | Default interval |
|---|---|---|---|
| `_graph_role_sync_loop` | App-only Graph token (client-credentials flow) → paginated full group-member listing → scans every user in every active tenant → promotes/demotes **only** `EMPLOYEE ↔ FACILITATOR` (the two Graph-managed roles; `MANAGER`/`FRONT_OFFICE`/`TENANT_ADMIN` are never touched by this thread) | `graph_role_sync_enabled = False` | `graph_role_sync_interval_minutes = 60` |
| `_graph_team_sync_loop` | App-only token → paginated full tenant `/users?$select=id,department` listing → diffs and updates department+team for every Graph-linked user, catching drift even for people who haven't logged in in months | `graph_team_sync_enabled = False` | `graph_team_sync_interval_minutes = 60` |
| `_layout_cutover_loop` | Unrelated domain (floor layouts, see Flow 4) but identical thread machinery | `layout_cutover_enabled = True` | `layout_cutover_interval_minutes = 5` |

Every one of the three shares the same careful lifecycle plumbing: `daemon=True` threads so they never block process exit; an idempotent start guard (`is_alive()` checked before spawning, so a duplicate `startup` call can't double-launch); a `threading.Event.wait(interval)` instead of a plain `sleep()`, so `shutdown` can interrupt the wait immediately rather than waiting out the remainder of an hour-long sleep; a fresh DB connection opened per cycle rather than one held for the thread's whole life; and a per-cycle try/except so one bad cycle (a transient Graph outage, say) is logged and skipped rather than permanently killing the thread.

**Any role change — automatic or manual — forces re-authentication, never just a silent permission flip.** Both `sync_graph_managed_roles()` (background thread) and `admin_update_user_access_service()` (manual admin path, below) call `revoke_all_user_sessions()` plus write an audit event (`GRAPH_ROLE_PROMOTED`/`GRAPH_ROLE_DEMOTED` + `GRAPH_ROLE_SYNC` for the automated path, `ACCESS_CHANGED` for the manual one) on every change. A stale JWT carrying an old role claim can never outlive the change — the user is logged out and must re-authenticate to pick up new permissions.

**4. Manual admin override — a deliberately separate, narrower path onto the same table.** A Tenant Admin can hand-set `role_name`/`status` via `admin_update_user_access_service()`, with three guardrails:
- `PRODUCT_ADMIN` can never be a target of this endpoint at all — "no in-app flow for managing it," by design, regardless of caller.
- Only an explicit allowlist (`EMPLOYEE`, `MANAGER`, `FACILITATOR`, `FRONT_OFFICE`, `TENANT_ADMIN`) can be assigned through it.
- **The tenant can never be left with zero active Tenant Admins.** Before any change that would demote or deactivate the last active admin, `count_active_tenant_admins()` runs; if the result would be zero, the change is rejected (409) and a `DENIED`/`last_admin_required` audit row is written instead of silently failing.

**5. Self-service profile edit — a third writer onto the same `app_users` columns, with a deliberately opposite COALESCE direction from Graph sync.** `update_user_profile()` lets a user edit their own `full_name`/`display_name`/`mobile_phone`/`office_location`/`bio`/`skills`. For the shared fields (`mobile_phone`, `office_location`), Graph sync writes `COALESCE(existing, new)` — it can only fill a blank, never overwrite a set value — while self-service edit writes `COALESCE(new, existing)` — an explicit user edit always wins once made. Put together: **the directory can only fill in what's missing; the user's own edit always takes precedence over the directory.** `bio`/`skills` go further, using an explicit "was this field provided" flag rather than COALESCE, so a user can deliberately clear a bio to empty — something COALESCE alone could never express.

**One legacy wart worth being direct about:** the `FRONT_OFFICE` role is stored in the database as the literal string `"FRONT OFFICE"` (with a space), because the `chk_app_users_role` check constraint was never updated to the `SCREAMING_SNAKE_CASE` convention every other role and every other layer of the app uses. `normalize_role_name()` / `_role_name_for_storage()` paper over this at every read/write boundary so the rest of the codebase can do plain `==` comparisons — a small, real piece of technical debt, handled consistently rather than left to bite someone at a random call site.

**Why this subsystem is worth narrating as one system, not scattered facts:** it replaces what would otherwise be a permanently manual HR/IT process (someone provisions an account, someone assigns a role, someone keeps the org chart in sync, someone remembers to revoke access when a role changes) with a design where the enterprise directory is the one source of truth, re-checked continuously rather than fixed at creation time, with explicit, auditable guardrails everywhere a human could otherwise lock themselves out or a stale permission could otherwise survive a change it shouldn't.

### Flow 3 — Booking create/modify through the idempotency ledger (the one to know cold)
```
Frontend sends the request with an `Idempotency-Key` header
   (generated client-side, rotated whenever the booking's identifying
   inputs change, cleared again after a successful submit)
        ↓
begin_idempotent_operation() looks up that key:
   • never seen            → claim it (own immediate commit), proceed
   • seen, same payload     → REPLAY the stored response, no new work
   • seen, different payload → reject (payload mismatch)
   • seen, still running    → report "in progress" (409)
   • seen, previously failed → report the known failure, don't blindly retry
   • seen, abandoned/stale (> 60s) → reconciliation logic runs
        ↓
Acquire TWO separate Postgres advisory locks, in this fixed order
   (`backend/repositories/booking_repository.py:acquire_booking_slot_locks`):
   1. seat+date lock, 2. subject(person)+date lock — always seat-first,
   so two requests racing on different (seat, person) pairs can never
   deadlock on each other. Both are pg_advisory_xact_lock calls:
   transaction-scoped, no extra row, released automatically on
   commit/rollback. There is no database constraint backing this up —
   the advisory-lock pair is the sole mechanism preventing the
   double-booking race, not a second line of defense behind a
   unique/exclusion constraint (the code's own comment says so explicitly)
        ↓
Run the actual business logic (booking-window check, availability,
   business rules) — same transaction as the ledger claim
        ↓
Success → mark_idempotent_operation_succeeded() commits together with
   the business write, atomically (both happened, or neither did)
        ↓
Failure → roll back the business write, THEN
   mark_idempotent_operation_failed() runs as a fresh, SEPARATELY
   COMMITTED statement — so "this attempt failed" survives even though
   the attempt itself was rolled back
        ↓
Response returned to frontend
```
Fail-closed by design: a reclaimed/abandoned row is never handed back to the caller to blindly re-execute. Only a genuinely fresh key with no prior row returns a real claim; everything else resolves to a replay or an explicit error. A plain **GET** on the operation's status can itself trigger this same reconciliation if it finds a stale `PENDING` row — a documented, intentional side effect (a read endpoint acquiring a lock and writing a `FAILED` outcome), not an accident.

**The fencing guard that protects the final commit.** The step that actually marks an operation SUCCEEDED is a conditional update — "update this row, but only if it still has the exact version-stamp seen when it was claimed." If a reconciler reclaimed that same row out from under a slow, still-running original request, that update affects zero rows, and the original request's booking write gets rolled back instead of being committed after the fact. The code's own comment: this conditional update is "the real ownership check — not the earlier claim — because it's the last thing that runs before commit."

### Flow 4 — Floor layout lifecycle (draft → published → archived, and a scheduled cutover)
```
Admin uploads/edits a floor layout (SVG + seat mapping)
        ↓
Saved as DRAFT — doesn't touch live bookings yet
        ↓
validate_svg_file() parses with defusedxml against an explicit
   element/attribute ALLOWLIST (not a denylist regex — the earlier
   denylist had known bypasses: onbegin=, <animate> abuse,
   entity-encoded javascript: URIs)
        ↓
suggest_seat_type() infers seat_type (CABIN / CONFERENCE_ROOM) and,
   for conference rooms, numeric capacity, straight from each SVG
   element's id naming convention (e.g. "HYD-PRV-F11-MR-C6-01") at
   insert time — a newly uploaded cabin/meeting/training room lands
   with the right seat_type immediately, no manual per-seat edit pass
   required afterward (backend/core/seat_categorization.py)
        ↓
Admin publishes the draft — OR schedules it to auto-publish at a future
   time instead of clicking publish now
        ↓
Backend flips state: this layout becomes ACTIVE for its floor; any
   previously-published layout for that floor is implicitly superseded
        ↓
Only the currently-published layout participates in seat booking — a
   draft or archived layout is invisible to the booking flow entirely
```
Publishing is not always a manual click: a `_layout_cutover_loop` daemon thread, started at app startup, periodically scans for any DRAFT layout whose scheduled cutover time has arrived and promotes it automatically (`promote_scheduled_floor_layouts`) — so "who published this layout" does not always have a human answer.

**The seat-type inference has a real counterpart worth naming:** `frontend/src/lib/svg/seatCategories.ts` implements the identical `CBN`/`CFR`/`MR`/`TR` naming-convention parsing, independently, purely to compute the "N seats, N cabins, N meeting rooms" summary text shown in the upload preview before anything is saved. The two implementations are kept in sync by convention and comment ("mirrors ... categorizeSvgId") rather than by any shared code or schema — a real, if small, cross-stack consistency risk: a convention change on one side that isn't mirrored on the other would make the upload preview's counts disagree with what actually gets stored.

### Flow 5 — Blocked seats: a seat-maintenance subsystem, independent of the floor layout itself
A seat isn't just bookable-or-not — it can be put into `blocked_seats` for a date range (`block_type` = Operational block / Restricted / Exclusive, plus a free-text reason), which removes it from the bookable pool for that window without touching the floor layout itself. Verified against `backend/repositories/blocked_seat_repository.py`, `backend/services/blocked_seat_service.py`, `backend/api/routes/admin_blocked_seats.py`.
```
Admin selects seats + a date range + a block_type + reason
        ↓
_ensure_within_block_window(): reject any date beyond today + the
   TENANT'S CONFIGURED max-advance-days (a business rule, not a
   hardcoded constant — see Flow 6)
        ↓
fetch_conflicting_booking_seat_codes(): check for existing bookings
   in that window before blocking — blocking doesn't silently cancel
   a booking someone already holds
        ↓
insert_blocked_seats() (bulk, execute_values) → queue_blocked_seats_created_notification()
   fires a BackgroundTasks email to every tenant admin (see Flow 7),
   not inline in the request
        ↓
Seat is excluded from the bookable pool for that window until CANCELLED
   or the window passes; list view buckets every block into
   active / today / upcoming / expiring / expired — each threshold
   itself a tenant-configurable business rule, not a hardcoded "+3 days"
```
Non-bookable seats (meeting rooms, etc.) can still be deliberately blocked, but only by `PRODUCT_ADMIN`/`TENANT_ADMIN` (`_can_use_non_bookable_seat`) — a narrower allowance than ordinary seat-blocking.

### Flow 6 — Business rules: a per-tenant key/value policy catalog, not scattered hardcoded constants
`backend/services/business_rule_service.py` + `repositories/business_rule_repository.py`. Every one of these used to be a hardcoded constant somewhere in the codebase; the module's own comments name exactly which constant each key replaced:
```
booking.max_advance_days.employee / .guest    — how far ahead a booking can be made
blocked_seats.max_advance_days                — how far ahead a seat block can be set
floor_layouts.min_advance_days.buffer          — safety gap before a scheduled layout cutover
floor_layouts.visibility_days.{draft,archived,deleted} — how long each state stays visible
blocked_seats.{upcoming,expiring_soon,expired_window}_days — list-view bucket thresholds
activity.recent_record_count                   — admin dashboard "recent activity" row count
chatbot.employee_access_enabled                — tenant-level chatbot kill switch
```
**The one genuinely clever piece of this design**: the floor-layout scheduling minimum gap is deliberately *not* stored as its own rule. It's computed live, on every use, from two independent rules (`booking.max_advance_days.employee` + `floor_layouts.min_advance_days.buffer`) — specifically so the two can never drift out of sync the way a third, separately-stored, cascade-written value could silently do. The buffer's floor (`MIN_LAYOUT_SCHEDULING_BUFFER_DAYS = 1`) is enforced in **two places at once, on purpose**: an app-level check here, and a matching Postgres `CHECK` constraint (`chk_business_rules_scheduling_buffer_min` / `chk_tenant_business_rules_scheduling_buffer_min`) — belt-and-suspenders against a zero/negative buffer letting a layout cut over the same day an employee's booking is still pending, defeating the entire point of the gap. Every rule also ships a hardcoded fallback default used only if the tenant catalog hasn't been seeded yet, so the system degrades gracefully instead of hard-failing on missing config rows.

### Flow 7 — Notifications: SES + Jinja2, built once and reused everywhere, not copy-pasted per event
`backend/services/notification_service.py`. One `NotificationService` class renders filesystem Jinja2 templates (`select_autoescape` on, `StrictUndefined` — a template with a missing variable fails loudly at render time instead of silently emailing a blank field) and sends through Amazon SES, wrapped in the same `aws_retry` decorator used for S3 uploads. Three pieces are deliberately shared/centralized rather than reimplemented per call site:
- `format_notification_value()` / `format_person()` / `booking_notification_details()` — one definition of "how a date, a missing value, or a 'Name (email)' pair renders in an email," reused identically by booking, guest, and floor-layout notifications, so no two emails format the same fact differently.
- `resolve_admin_notification_recipients()` — "every tenant admin" is defined exactly once (a static settings-level override list + a live query for active `TENANT_ADMIN` users) and reused by every "notify all admins" event (floor-layout publish, blocked-seat creation) — the module's own comment calls this out explicitly as avoiding duplicate, driftable definitions of "who counts as an admin."
- Dispatch goes through FastAPI `BackgroundTasks`, so a request that triggers a notification (blocking a seat, publishing a layout) doesn't block its own HTTP response on an SES round-trip.

### Flow 8 — Floor-layout storage: a private S3 bucket, versioned keys, and presigned URLs generated fresh on every read
`backend/core/storage.py`. A real "defense in depth" pattern, not just "upload to S3":
```
Upload: validate_svg_file() sanitizes (see Flow 4's allowlist parser) →
   object key is tenant/site/building/floor/layouts/v{version_no}/layout.svg
   (versioned by key, not just by a DB row) → uploaded via aws_retry-wrapped
   s3_client.upload_fileobj() of the SANITIZED bytes, never the original
        ↓
Storage writes a plain {public_base_url}/{key} string to the DB — looks
   like a public URL, but the bucket itself is private
        ↓
Every read path resolves that stored value through resolve_layout_file_url(),
   wired in as a Pydantic field_validator on every response schema that
   carries a layout_file_url (not scattered per-call-site) — it generates a
   FRESH, time-limited presigned GET url (s3_presigned_url_ttl_seconds) on
   every single response, rather than ever handing out a long-lived link
        ↓
If presigning itself fails, it fails open to the raw stored value rather
   than breaking the response — logged, not raised
```
Why this shape: a private bucket plus presigned, short-TTL URLs means access can't be exfiltrated as a permanent link and never needs active revocation — it just stops working when the TTL expires. The same `aws_retry` wrapper is used for S3 uploads and SES sends (Flow 7), but it only retries a specific allowlist of transient AWS error codes (throttling, `RequestTimeout`, `ServiceUnavailable`, 5xx) plus `BotoCoreError`/`S3UploadFailedError` — a 4xx client error (bad input, permissions) is never blindly retried, since retrying it would just waste time reproducing the same failure. Secrets used anywhere in this chain (e.g. SES/S3 credentials pulled from AWS Secrets Manager) go through `backend/core/runtime_secrets.py`'s `get_json_secret()`, which `lru_cache`s both the Secrets Manager client and the fetched secret itself — a deliberate avoidance of a Secrets Manager API round-trip on every single call site that needs a credential, at the cost of a secret rotation not being picked up until the process restarts.

### Flow 9 — Audit logging: a dual-write, with redaction on the way back out
`backend/repositories/audit_repository.py` + `services/audit_service.py`. Every audited action writes to **two** places, deliberately decoupled: `write_audit_log()` emits a structured JSON event via `structlog` (→ stdout → CloudWatch Insights) **and** inserts a row into `audit_logs`, with the structlog emission wrapped in its own bare `try/except: pass` specifically so a logging failure can never take down the actual DB write — the database row is the record of truth; CloudWatch is a secondary, best-effort copy. Per-request context (IP, user agent, request id) is bound once by HTTP middleware via `structlog` contextvars and picked up automatically here — call sites never pass that context manually. On the read side, `audit_service.py` applies a **recursive key-name redaction** (`_redact_sensitive_values`) over every `old_values`/`new_values` payload before it's ever returned to an admin UI — anything whose key contains `password`, `token`, `secret`, `cookie`, `credential`, `api_key`, etc. is replaced with `[REDACTED]` wherever it appears, at any nesting depth — plus `failure_code`/`failure_reason`/`metadata` are stripped from the normal admin-facing response entirely (kept only for internal/technical investigation), and a denied/failed action is summarized to a generic human sentence rather than echoing the raw internal reason back to the UI. The same "full detail stays server-side, the client gets a generic message" rule shows up again at a completely different layer: `backend/core/error_diagnostics.py`'s exception-chain printer is explicitly terminal-only, never fed into an API response or an audit payload, and SSO's own `_error_response()` (Flow 1) logs the full provider error server-side while redirecting the browser to a generic `?error=<code>` query param — the same boundary decision, independently applied at three different layers of the stack.

### Flow 10 — Guest visit and guest booking (two linked lifecycles, not one)
```
A guest visit is created (who's coming, when)
        ↓
A guest booking may or may not be attached to that visit (the actual
   seat reservation)
        ↓
On any change, business rules decide:
   does only the VISIT change? only the BOOKING? both? does cancelling
   the visit cancel the booking, or can the booking survive without it?
        ↓
A modification produces a NEW linked row — the same chain-of-custody
   idea as booking modification below, not an in-place overwrite
```

### Flow 11 — Booking modification: a linked chain, not cancel + recreate
```
Naive approach: cancel the old booking, create a brand-new one —
loses the fact that "this is the same booking, just changed" versus a
genuinely new, unrelated booking.

Decision taken instead:

   OLD BOOKING  →  NEW BOOKING
   linked via ONE column: modified_from_booking_id (FK on the new
   row, pointing back at the old one — there is no second,
   "modified_to" column; the forward direction is just the reverse
   lookup of this same FK)

A booking's history is traced BACKWARD via that column (or forward by
querying "which row names me as its modified_from_booking_id") — useful
for audit, and for resolving "what is this booking's current active
state" without ambiguity.
```
The admin-facing activity feed (`admin_dashboard_service.py`'s `_apply_modified_display_status`) applies the identical display rule a second time, independently, for the dashboard's combined booking/guest-visit activity view — a row whose `modified_from_*` column is set is shown as `"MODIFIED"` regardless of its real underlying status, mirroring `booking_service`'s own same-named function rather than sharing it. Two call sites implementing the same display rule by convention, not by a shared function — low risk today, but a future change to one without the other would make the two UIs disagree about which bookings look "modified."

### Flow 12 — The chatbot, and a real architecture problem that was already fixed
```
User opens the chat widget inside the SeatBook UI (same login, no
   second account)
        ↓
Every chatbot route uses the IDENTICAL Depends(get_current_user) and
   Depends(get_db) every other route in the app uses — same auth
   dependency, same single per-request psycopg2 connection, not a
   second pool and not a second auth path
        ↓
chat_engine.py orchestrates: text_normalizer → intent_matcher /
   entity_extractor → confidence_service
        ↓
If the chatbot needs to actually DO something to a booking, it calls
   the MAIN app's own service functions DIRECTLY, as in-process
   function calls — NOT over HTTP
        ↓
memory_service / conversation_log_service / session_service persist
   ChatbotSession/ChatbotMessage rows through that SAME shared
   connection, via plain psycopg2 ("the same way every other
   repository in this codebase does" — direct code comment)
```
This is a strong before/after story worth knowing both halves of. `seatbook_identity()`'s own docstring in `backend/chatbot/deps/seatbook_auth.py` says explicitly: "This used to mint a short-lived JWT and open an httpx client so the chatbot could call back into this same application over a real HTTP request... That network round-trip is gone — `seat_backend_api_service` now calls the main app's service functions directly." So the HTTP-callback-to-itself design did exist at some point, and is exactly the kind of design that would cause duplicated/out-of-sync auth logic and (if its session machinery used a separate pool) connection competition — but it has been replaced. This is a problem that existed and was fixed, not one still open.

---

## Decisions, Trade-offs, and the Intent Behind Them
(The "why," for the same flows above. The human-readable version of this — told as stories — is in `SeatBook_LEARNING_GUIDE.md`.)

### Decision 1 — Raw psycopg2 repositories at runtime; SQLAlchemy only for schema/Alembic
- **Problem**: this app has heavy business-rule validation plus a hand-built concurrency system (advisory locks, precise transaction boundaries for the idempotency ledger). An ORM's abstractions (lazy loading, implicit session/transaction management) make it harder to know exactly when a lock is held and exactly what SQL is running.
- **Decision**: repositories issue raw SQL directly via psycopg2 for every runtime read/write; SQLAlchemy models exist only to define/manage schema through Alembic.
- **Trade-off accepted**: more verbose repository code — no auto-generated queries, no free relationship traversal — in exchange for exact control over transaction boundaries and lock timing, which matters once correctness depends on knowing precisely when a lock starts and ends.

### Decision 2 — Idempotency ledger's separately-committed failure path
- **Problem**: if a booking attempt fails and its transaction rolls back, the record that "this attempt failed" would roll back with it — the ledger would remember nothing, and a client retrying with the same key would see "never seen before" instead of an informative failure.
- **Decision**: `mark_idempotent_operation_failed()` deliberately runs as a fresh, separately-committed statement *after* the rollback — the same pattern used for audit-log write safety — so "record that it happened" survives even when "the thing itself" didn't.
- **Trade-off accepted**: a small window where the failure-record write could itself fail independently of the already-rolled-back business write — accepted because no failure record at all is worse for a system whose entire point is safe retry behavior.

### Decision 3 — Fail-closed concurrency, never fail-open (and the opposite choice, deliberately, elsewhere)
- **Problem**: when an operation's true state is ambiguous (crashed mid-flight, reclaimed from a stale row), guessing wrong in either direction is bad — guessing "succeeded" when it didn't creates a phantom booking; guessing "failed" when it actually succeeded risks a duplicate.
- **Decision**: never guess. An ambiguous/reclaimed operation reports "still in progress" or UNKNOWN rather than resolving to a clean yes/no.
- **Trade-off accepted**: worse UX in the ambiguous case (the user sees "please wait/retry" instead of a definite answer) in exchange for never silently double-booking or silently losing a booking.
- **Worth contrasting directly**: this fail-closed posture is specific to money-shaped correctness (a seat, a booking). Elsewhere in the same codebase the choice deliberately runs the other way — department/team sync on login, the session-activity touch, and CloudWatch audit logging are all fail-open, because the cost of *that* kind of operation failing silently (a profile field staying one sync cycle stale, a session not getting its expiry pushed, a log line missing from CloudWatch) is low and recoverable, while blocking a login or a request over it would not be. The direction isn't inconsistency; it's the same judgment ("what does failure actually cost here") applied twice and landing on opposite answers because the two situations have different costs.

### Decision 4 — A GET endpoint with an intentional side effect
- **Problem**: a stuck/abandoned `PENDING` idempotency row needs to get cleaned up eventually, or it blocks every future retry with that key forever.
- **Decision**: `get_operation_status()` — a plain GET — deliberately triggers the same reconciliation logic when it finds a stale `PENDING` row: acquiring business locks and writing a `FAILED` outcome as a side effect of what looks like a read.
- **Trade-off accepted**: violates the normal expectation that a GET has no side effects — worth volunteering this fact directly rather than letting it be discovered and mistaken for a bug — accepted because it means an ordinary polling GET self-heals stuck state instead of needing a separate cleanup job.

### Decision 5 — Seat-lock-before-subject-lock ordering invariant
The real, documented invariant, per `acquire_booking_slot_locks`'s own docstring: the seat+date advisory lock is always acquired before the subject(person)+date advisory lock, in both the live request path and the reconciler.
- **Problem**: two different requests racing for two different (seat, person) combinations could grab the two locks in opposite orders under concurrency — the classic deadlock setup.
- **Decision**: one fixed order, enforced everywhere both locks are taken: seat lock first, subject lock second.
- **Trade-off accepted**: no real downside once established, but it's a discipline every future code path touching both locks has to keep — easy to violate by accident without knowing the invariant exists.
- **Separately, the idempotency claim itself happens *before* either advisory lock is taken** — `begin_idempotent_operation()` runs, then (once past that) `acquire_booking_slot_locks()` runs. This is a sequencing fact, not a stated deadlock-avoidance invariant the way the seat-then-subject order is.

### Decision 6 — RBAC → ReBAC redesign: role as eligibility, group as permission (in progress)
- **Problem**: today, authorization checks hard-coded role-name strings directly. `Roles`/`Permissions`/`RolePermissions`/`Groups` tables exist in the schema and the first two are actually read today (`fetch_permissions_for_role()`, surfaced as `user.permissions` on login — see Authorization section) — but that read path feeds the frontend's rendering decisions only; it isn't wired into backend enforcement. The naive fix ("just wire the existing tables into enforcement as-is") would let a role automatically grant whatever permissions get attached to it later.
- **Decision**: redesign so a role only decides *which groups a user is eligible to receive*; the groups themselves carry the actual permissions. Role → permission inheritance is explicitly rejected.
- **Why reject direct inheritance**: if a role automatically grants a permission, broadening what a role means later (or assigning that role for an unrelated reason) silently broadens what that person can do — an accidental privilege-escalation path. Decoupling "who can receive which group" from "what a group can do" closes it.
- **Two more decisions bundled into this redesign**: (a) UI permission (can this button/tab render) is kept explicitly separate from backend permission (is this API call actually authorized) — trusting the frontend's rendering choice as a security boundary is exactly the mistake "never trust the frontend" exists to prevent; (b) data scope (own / direct_reports / assigned_site / tenant / any) is a dimension independent of the permission itself, so "can approve bookings" and "whose bookings can this person approve" stay two separate questions instead of one baked-in permission string.
- **Privilege-escalation guard on the feature itself**: someone able to create/assign groups must not thereby be able to grant privileges beyond their own — the admin tooling for managing permissions has to defend against the exact escalation pattern the whole redesign exists to prevent.

### Decision 7 — Booking modification as a linked chain, not cancel + recreate
Covered in Flow 11. **Trade-off accepted**: reading "what is this booking's current state" now requires walking the chain instead of one row lookup, in exchange for a full, auditable history and never losing the "this was always the same underlying booking" relationship.

### Decision 8 — Guest visit and guest booking as two separate, linked entities
- **Problem**: a guest's visit (are they coming, when) and their seat reservation aren't always the same lifecycle — a visit can be rescheduled without touching the booking, or vice versa.
- **Decision**: model them as separate entities connected by explicit business rules, not one merged "guest reservation" object.
- **Trade-off accepted**: more complex modification logic (deciding which entity, or both, actually changes) in exchange for representing real cases a merged model couldn't (visit changes, seat stays the same, and vice versa).

### Decision 9 — Chatbot calls the main app in-process, not over HTTP (already implemented, not a plan)
Covered in Flow 12. **Trade-off accepted**: none remaining to describe as "planned" — this is the live design today. The interesting trade-off is historical: the earlier HTTP-callback design would have been easier to reason about as "two independent services" but cost real correctness risk (auth logic that could drift, connection competition); the in-process design is more entangled (the chatbot's auth/DB lifecycle is now inseparable from the main request's) but removes that entire class of problem.

### Decision 10 — Single shared Alembic migration role (by design, not a gap)
A single shared database role runs all Alembic migrations, deliberately not per-developer migration roles. Already a considered decision from prior sessions — don't propose per-dev roles as a "fix."

### Decision 11 — Throttled session-activity touch instead of a write per request
- **Problem**: a sliding-expiration session needs its `expires_at` pushed forward on activity, or an active user gets logged out mid-use once the original TTL lapses. The naive version — update the row on every authenticated request — turns every single API call in the entire app into a database write.
- **Decision**: `extend_session_activity()` only performs the write when the session's `last_used_at` is already more than 60 seconds stale; everything in between is a no-op read-through.
- **Trade-off accepted**: the session's recorded `last_used_at` is accurate to within that 60-second window rather than to the millisecond — irrelevant for the only thing it's actually used for (keeping an active session alive), and a clearly worthwhile trade against turning every request in the app into a write.

### Decision 12 — Seat-type inferred from a naming convention at upload, duplicated once across the stack
- **Problem**: after uploading a new floor layout, every cabin/meeting/training room would otherwise need a manual per-seat edit to set its `seat_type` correctly before it displays right anywhere in the app.
- **Decision**: parse the convention already embedded in each SVG element's id (`CBN`, `CFR`, `MR`, `TR`, plus a capacity segment for rooms) and assign `seat_type` automatically at insert time.
- **Trade-off accepted**: the exact same parsing logic is implemented a second time, independently, in the frontend (TypeScript, for the upload preview's live count) — there's no shared schema or shared code enforcing the two definitions stay identical, just a comment pointing from one to the other. A convention change on either side without updating its counterpart would make the preview and the stored data quietly disagree.

### Decision 13 — AWS operations retry only what's actually transient, and secrets are cached, not re-fetched
- **Problem**: blindly retrying every AWS SDK failure wastes time retrying errors that will never succeed (bad permissions, malformed input), and fetching a credential from Secrets Manager on every call site that needs one adds a network round-trip nobody benefits from.
- **Decision**: `backend/core/retry.py`'s `aws_retry` decorator only retries a specific allowlist of transient error codes (throttling variants, `RequestTimeout`, `ServiceUnavailable`) plus 5xx responses and known transient exception types — never a 4xx. `backend/core/runtime_secrets.py`'s `get_json_secret()` wraps both the Secrets Manager client and the fetched secret itself in `lru_cache`.
- **Trade-off accepted**: a rotated secret isn't picked up until the process restarts (the cache has no TTL or invalidation) — acceptable because secret rotation in this system is an infrequent, planned event, not something that needs to propagate mid-process.

---

## State Management — the Full Picture
There is **one** session/auth system, not two: `ChatbotSessions`/`ChatbotMessages` are real tables, but they're read and written through the exact same per-request connection and the exact same `get_current_user` auth dependency as every other route (Flow 12).

1. **Login session state** — JWT access + refresh tokens, cookie-based. Session validity tracked via `UserSessions`; revocation events tracked via `AuthTokenEvents`. Kept alive by a throttled touch (Decision 11) rather than a write per request. This is the system of record for "is this user actually still logged in," and the chatbot routes are subject to it the same as any other route, because they use the same dependency.
2. **Chatbot conversation state** — `ChatbotSessions` / `ChatbotMessages`, real tables, but persisted via the same shared per-request psycopg2 connection as everything else, not a separate store or separate pool.
3. **Idempotency ledger state** — `idempotent_operations`, scoped to ONE operation attempt, keyed by `Idempotency-Key`. Separate from identity/session state — this is request-level dedup state. Claim → replay → reconcile is its own state machine, unrelated to whether the user is logged in.
4. **Floor layout state** — a draft/published/archived status field decides which layout is "live," plus an optional scheduled-cutover time a background thread acts on (Flow 4).
5. **Booking state** — not a single mutable row once modified; a backward-linked chain via the single `modified_from_booking_id` column (Flow 11).
6. **Background-sync state** — role sync and team/department sync (Flow 2) are not request-triggered at all; they're continuously-running daemon threads on their own intervals, started once at process boot.
7. **Blocked-seat state** — a seat-maintenance status per (seat, date range), entirely independent of floor-layout state (Flow 5).
8. **Business-rule state** — a per-tenant key/value catalog (Flow 6) that other state machines *read from* rather than hardcoding; falls back to a safe default if a key hasn't been seeded yet.
9. **Audit-log state** — every sensitive action writes one `audit_logs` row (the record of truth) plus a best-effort structured log line to CloudWatch (Flow 9), deliberately decoupled so a logging failure can never block or lose the actual DB write.

---

## When Each Piece Is Actually Invoked (quick reference)
| Piece | Invoked when | Not invoked when |
|---|---|---|
| Idempotency ledger | Booking create/modify calls that include an `Idempotency-Key` header | Calls without the header — legacy/unkeyed behavior, unchanged, intentional no-op |
| Advisory locks (`pg_advisory_xact_lock` ×2) | Inside booking create/modify, AFTER the idempotency claim, seat-lock then subject-lock, in that order | Released automatically on commit/rollback — never held outside that one transaction |
| Session-activity touch write | Any authenticated request whose session's `last_used_at` is already > 60s stale | Every other authenticated request — a throttled no-op |
| SVG allowlist validation + seat-type inference | Floor layout upload only | Any other upload path |
| CSRF check | State-changing requests only (`POST`/`PATCH`/`PUT`/`DELETE`) with `Origin` (or `Referer`) present | `GET` requests |
| Booking-window validation | Both create **and** modify; runs BEFORE the idempotency claim | — |
| Chatbot auth/session check | Every chatbot request — same `get_current_user` dependency as every other route, so the same revocation check applies | — |
| Graph role/team background sync | On their own independent intervals, for the life of the process | When the corresponding feature flag is disabled |
| Layout scheduled cutover | When a background scan finds a DRAFT layout whose scheduled time has passed | Manual-publish layouts with no scheduled time set |
| `get_operation_status()` reconciliation | Only when it finds a stale (> 60s) `PENDING` row | A fresh or already-completed row — plain read, no side effect |

---

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
├── core/                             # config, auth, authorization, CSRF, storage, SSO, enums, retry, security, secrets, seat_categorization
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
Each domain has a matching `services/<x>_service.py` + `repositories/<x>_repository.py` pair (booking, guest, guest_visit, blocked_seat, floor_layout, location, team, user_management, business_rule, dashboard, admin_dashboard, audit, preferences, notification, idempotency, auth). `repositories/permission_repository.py` and `repositories/token_repository.py` have no matching top-level service file — they're used directly by auth/authorization code instead. `preferences_service.py`'s `get_preferences_for_user()` (used to pre-fill a delegated booking for a facilitator/admin booking on someone else's behalf) deliberately replaced an older, heavier `GET /dashboard/employee/{user_id}` endpoint that built a full dashboard payload (profile, days-in-office, team rank, manager, favourite seats) just to read this one field off it — a narrowing of an over-broad endpoint down to what its one real caller actually needed.

### Chatbot (`backend/chatbot/`)
Self-contained sub-app: `models/chatbot.py`, `schemas/chat.py`, and a `services/` layer with real breadth — `chat_engine.py` (orchestration), `intent_matcher.py`, `entity_extractor.py`, `confidence_service.py`, `free_text_service.py`, `input_guard_service.py` (abuse/injection guarding on free text), `text_normalizer_service.py`, `navigation_service.py`, `menu_service.py`, `booking_edit_service.py` (lets the chatbot actually modify bookings, not just answer questions), `seat_backend_api_service.py` (calls back into the main booking API rather than duplicating booking logic), `memory_service.py` + `conversation_log_service.py` + `session_service.py` (per-session conversation state), `chat_adapter_service.py`, `telemetry_service.py`. This is a rules/intent-matching + guided-menu chatbot architecture (menu_service, navigation_service, intent_matcher) rather than a pure LLM-RAG chatbot like AskGenix — worth keeping that distinction in mind when comparing the two projects.

See `CHATBOT_SESSION_FOLLOWUPS.md` at repo root for open chatbot-session work items (session issue was part of recent idempotency/session fix commits).

## Database
36-table Alembic baseline now lives at `backend/db/migrations/` (brought in as an additive-only commit from `feature/alembic-schema-baseline` — no service-code changes alongside it). **This is not yet the system of record for applying schema changes** — README explicitly warns not to assume migrations run automatically anywhere; check `db/migrations/`'s own files before assuming otherwise. There's also a `backend/migrations/` directory at a different path — confirm which one is actually current before touching schema.

Key tables: `AppUsers`, `AuthIdentities`, `AuthTokenEvents`, `UserSessions` (auth/identity); `Bookings`, `Seats`, `FloorLayouts`, `Floors`, `Buildings`, `Sites`, `LayoutSeatMappings`, `BlockedSeats` (booking/space domain); `Amenities`, `AmenityCategories`, `SeatAmenities`, `UserPreferredAmenities` (amenities); `Teams`, `TeamMembers` (org structure); `GuestVisits`, `Guests` (visitor domain); `Roles`, `Permissions`, `RolePermissions`, `Groups`, `GroupPermissions`, `RoleGroups`, `UserGroups` (a full RBAC catalog exists in schema — see Authorization below for why it isn't fully used yet); `BusinessRules`, `TenantBusinessRules`, `Tenants` (multi-tenant business-rule config); `AuditLogs`; `ChatbotSessions`, `ChatbotMessages`; `EmailLogs`; `UserGraphProfiles`, `UserWorkPreferences`.

**Migration access policy (by design, not a gap)**: a single shared database role is used for running Alembic migrations — deliberately not per-developer migration roles. Don't propose per-dev migration roles as a fix for anything; this was a considered decision.

## Authorization / roles
`backend/core/authorization.py` is not a flat role check; it's a **resource-ownership model** with one unconditional role-based bypass:
- Real role constants in this file: `TENANT_ADMIN`, `FACILITATOR`, `FRONT_OFFICE`, `EMPLOYEE`, and `MANAGER` (explicitly commented **"dormant: assignable, but carries no authority in this module"**). `PRODUCT_ADMIN` was not found anywhere in `core/` during this read — if it's referenced elsewhere, confirm its actual location before citing it.
- **For an existing resource**: `can_manage_resource()` grants access if the caller is `TENANT_ADMIN` (unconditional bypass — admins are never blocked from acting, even on something they didn't create and aren't the subject of), OR the caller actually created it, OR the caller is its subject. Everyone else's access to an existing resource comes only from one of those last two — there is no general facilitator bypass on existing resources.
- **Creating a resource for someone else** is a separate, role-based allowance (`can_create_for_user()` / `CAN_CREATE_FOR_OTHERS_ROLES = {TENANT_ADMIN, FACILITATOR}`) — there's no prior resource to "own" yet, so this isn't an ownership check at all.
- **Guest check-in/check-out** (`can_check_in_out_guest_visit()`) belongs to `FRONT_OFFICE` alone — not the visit's creator, not its host, not `TENANT_ADMIN`. Confirmed verbatim in the module's own docstring: "let's not give [facilitator] check in and check out, as this is front office person task."
- **The general guest-domain surface** (create/modify/cancel/list on guests, guest-visits, guest-bookings) is `GUEST_OPERATOR_ROLES = {TENANT_ADMIN, FACILITATOR}` only — `FRONT_OFFICE`'s only confirmed access anywhere in this module is the check-in/check-out line above.
- **Documented policy history, worth knowing it exists**: the module's docstring records that `TENANT_ADMIN`'s unconditional bypass was deliberately narrowed away at one point ("Admin can't change bookings unless he himself is the one who created or he is the acted upon"), then explicitly reversed back to unconditional on 2026-10-23. The current code is the *reversed* (unconditional-bypass) version — a live example of authorization policy changing direction based on an explicit decision, not a slow drift.

**Still an open gap — stated precisely, not over- or under-claimed**: every *enforcement* check above is a hard-coded comparison against role-name strings. But the `Roles`/`Permissions`/`RolePermissions` tables are **not** untouched dead schema — `backend/repositories/permission_repository.py:fetch_permissions_for_role()` does query them (`roles ⋈ role_permissions ⋈ permissions`, filtered to active rows), and `auth_service.attach_permissions_to_user()` calls it on every login/`/auth/me`, attaching the result as `user.permissions` in the response the frontend receives. So the catalog is read and shipped to the client today — it is just not what any backend authorization check actually gates on. That's the live version of the UI-permission/backend-permission split called out in Decision 6: the frontend can use `user.permissions` to decide what to render, but every real enforcement decision still runs through `core/authorization.py`'s hard-coded role comparisons, completely independent of that list. The accurate claim is "queried and exposed for UI use, not wired into enforcement" — not "nothing queries those tables."

## Idempotency ledger (`backend/services/idempotency_service.py` + `repositories/idempotency_repository.py`)
Concurrency-safe booking create/modify via a claim/replay/reconcile ledger, not simple locking:
1. `begin_idempotent_operation()` claims an `Idempotency-Key` (own immediate commit) or, if already claimed, replays the stored response / rejects a payload mismatch / reports in-progress / reports a known-failed outcome / reconciles an abandoned attempt.
2. The caller's business write and `mark_idempotent_operation_succeeded()` happen in the **same transaction**.
3. On failure, `mark_idempotent_operation_failed()` runs as a fresh, separately-committed statement after rollback (same pattern as the audit-log write-safety approach).
4. `get_operation_status()` — a GET — deliberately triggers the same reconciliation logic when it finds a stale `PENDING` row (documented as intentional, not an accidental side effect on a read endpoint).
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
- **Floor-layout files sit behind a private S3 bucket + fresh presigned URLs, not a public bucket** (Flow 8) — a fourth deliberate security property alongside the three above.
- **Full error detail never reaches a client response or an audit payload** — `error_diagnostics.py`'s exception printer is terminal-only, SSO's `_error_response()` logs full provider errors server-side while redirecting the browser to a generic error code, and `audit_service.py` redacts sensitive key names recursively before any audit detail reaches an admin UI. The same boundary decision, applied independently at three layers (Flow 9).

**Still open** (per README + audit doc): authorization via hard-coded role names rather than the Roles/Permissions/Groups catalog (see Authorization above), the SSO gateway's token-trust model, and the database runtime role's privilege scope.

## Known rough edges / things to check before relying on them
- `scripts/start-local.ps1` is stale — predates the chatbot being merged into the main app, still references a separate `efacility-chatbot/` service that no longer exists in this repo. Use the README's three-terminal process instead.
- Two migration-looking directories exist (`backend/db/migrations/` — the real Alembic baseline — and `backend/migrations/`) — confirm which is current before any schema work.
- `MANAGER` is dormant by design (assignable, no authority in `core/authorization.py`), not a half-implemented feature waiting to be finished. A `PRODUCT_ADMIN` role is referenced in a few places (e.g. blocked-seat non-bookable-seat allowance) but was not found defined anywhere in `core/authorization.py` during this read — confirm its actual source before repeating claims about its scope.
- `origin` vs `personal` git remotes point at differently-cased repo names (`Workforce_Management` vs `workforce-management`) — verify target before pushing.
- The frontend-side `seatCategories.ts` seat-naming parser (Flow 4/Decision 12) and the backend's `seat_categorization.py` are two independent implementations of the same convention — check both if the naming convention ever changes.

## Known unknowns — stated once, plainly
This documentation reflects multiple direct-source-read passes over the backend. As of the latest pass, still **not** read in full: the Next.js frontend's internal architecture (state management, routing, client-side auth handling — only the directory layout is known); `backend/repositories/dashboard_repository.py` / `services/dashboard_service.py` (the underlying SQL behind the admin analytics endpoints, as opposed to the service-layer validation already covered); `backend/repositories/team_repository.py` beyond the department-sync code already covered in Flow 2; `backend/repositories/preferences_repository.py`'s own SQL (the service layer calling it is covered); `backend/repositories/guest_repository.py` / `guest_visit_repository.py`'s own SQL beyond the lifecycle narrative in Flow 10; `backend/repositories/location_repository.py`; `backend/repositories/chatbot_repository.py`; `backend/repositories/layout_seat_mapping_repository.py`. Treat claims about those areas as unverified until read directly — this is not a hedge, it's the actual current boundary of what's been checked.

## Standing conventions for this repo (from prior sessions)
- Commit messages: single-line `[vedanth] ...`, no Co-Authored-By trailer, never commit unless explicitly asked.
- Always get explicit go-ahead immediately before any DB write/migration operation — never narrate-then-execute (migration credentials were revoked once over this).
- Repository-layer tests need at least one non-mocked `FakeCursor` test per function, not every test mocking the function away.
- Real bugs found during an audit/review should be fixed directly (git is the safety net), not just reported.
