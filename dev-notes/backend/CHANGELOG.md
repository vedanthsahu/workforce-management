# Backend Change-Log

Backend-only. See [`dev-notes/README.md`](../README.md) for what this file
is, why it's separate from the frontend log, and the conventions below.

Append-only. Never edit or delete a past entry — if something changes again,
add a new entry underneath. Newest entry at the bottom.

Each entry:

```
## YYYY-MM-DD HH:MM — <short title>

**What was wrong / why this was needed**
...

**What changed**
...

**Files touched**
- path/to/file.py
```

---

## 2026-08-11 14:00 — Investigation: bulk seat configuration + `updated_by_user_id`

**Context**

Two related requests came in together:

1. Bulk seat configuration (`PATCH /seats/bulk-configuration` and
   `PATCH /layout-seats/bulk-configuration`) currently applies **one**
   config object to **every** id in the request — confirmed by reading
   `BulkSeatConfigurationUpdateRequest`/`BulkLayoutSeatConfigurationUpdateRequest`
   (`backend/schemas/location.py:327,387`) and the two service functions
   `update_layout_seat_configurations_bulk` /
   `update_seats_configuration_bulk` (`backend/services/location_service.py:397,988`).
   Real seats don't share one amenity/status/is_bookable value, so this
   needs to become per-seat. Also need to support: DRAFT/ARCHIVED layouts
   keep writing straight to `layout_seat_mappings` on save (current
   behavior); PUBLISHED layouts should hold edits client-side and push to
   both `layout_seat_mappings` and `seats` only on Publish, in one call
   (Lambda-hosted backend — minimizing round trips matters).

2. `floor_layouts.updated_by_user_id` now exists as a real DB column
   (confirmed via a live sample row, id 192, showing a real value of `7`).
   The API currently **fakes** this field: `FLOOR_LAYOUT_SELECT_FIELDS` in
   `backend/repositories/floor_layout_repository.py:67-72` selects
   `fl.uploaded_by_user_id AS updated_by_user_id` and joins on `au`
   (the *uploader*), not a real `updated_by_user_id` column/join. The
   schema (`backend/schemas/floor_layout.py:64-71`) has an explicit
   placeholder comment confirming this: *"floor_layouts has no updated_by
   column yet, so this mirrors uploaded_by until a real column/join is
   added."* This is the "patch work" that needs replacing now that the
   column is real.

   Open question found during investigation (not yet resolved): nothing
   in the codebase currently *writes* to `floor_layouts.updated_by_user_id`
   — not on INSERT (`backend/repositories/floor_layout_repository.py:409`
   insert list omits it) and not anywhere else. The only writers to
   `floor_layouts` today are create (insert), activate/publish, archive,
   soft-delete — none of which map to "an admin edited this layout's seat
   configuration." Likely candidate: the bulk layout-seat-configuration
   save path should stamp `floor_layouts.updated_by_user_id`/`updated_at`
   for the parent layout when it runs — which ties this fix directly to
   item 1's bulk-edit rework. Confirming with the product owner before
   implementing.

**What changed**

Nothing yet — investigation only. Design questions raised with the user
directly per their request.

**Files touched**

None yet.

---

## 2026-08-11 15:30 — Implemented: per-seat bulk layout-seat configuration + real `updated_by_user_id`

**Decisions confirmed with the user before implementing** (three
AskUserQuestion rounds, all three "recommended" options picked):

1. Bulk payload shape: array of per-seat objects (`seats: [{layout_seat_mapping_id, status?, is_bookable?, amenity_ids?, ...}]`), not
   index-aligned parallel arrays. Added an optional top-level `defaults`
   object applied to every seat first, so "same config for 50 seats" is
   still one call without repeating the object 50 times.
2. One endpoint, status-aware: `/layout-seats/bulk-configuration` now
   checks the parent layout's status inside the service function. DRAFT/
   ARCHIVED -> writes `layout_seat_mappings` only (unchanged draft
   isolation). PUBLISHED -> also cascades into `seats`/`seat_amenities`
   in the same transaction, since a published layout has no separate
   "click Publish" step for a later edit and the frontend must not make
   a second Lambda round trip.
3. `floor_layouts.updated_by_user_id`/`updated_at` are now stamped by
   this same bulk-save action (the only real "someone edited this
   layout" event that exists in the codebase today).

**What was wrong with the existing implementation**

- `BulkLayoutSeatConfigurationUpdateRequest` took ONE shared config
  (`status`, `is_bookable`, `amenity_ids`, ...) + a flat `layout_seat_mapping_ids: list[int]`
  and applied the identical config to every id — real seats don't share
  one amenity/status/is_bookable value, so a 50-seat bulk edit could only
  ever produce 50 identical seats.
- `floor_layouts.updated_by_user_id` was faked: `FLOOR_LAYOUT_SELECT_FIELDS`
  selected `fl.uploaded_by_user_id AS updated_by_user_id` and joined on
  the uploader (`au`), not a real `updated_by_user_id` column/join — the
  schema even had a comment admitting this was a placeholder. Confirmed
  via a live DB row (floor_layouts id 192, `updated_by_user_id = 7`) that
  the real column now exists. Nothing in the codebase wrote to it either
  (not even on INSERT).

**What changed**

- `backend/schemas/location.py` — replaced
  `BulkLayoutSeatConfigurationUpdateRequest`'s flat shape with
  `defaults: LayoutSeatConfigurationUpdateRequest | None` +
  `seats: list[LayoutSeatBulkConfigurationEntry]` (new class, extends the
  existing single-seat update schema with `layout_seat_mapping_id`).
  Duplicate `layout_seat_mapping_id` across entries is now rejected at
  the schema layer (`ValueError`) instead of being silently deduped —
  ambiguous which config should win.
- `backend/services/location_service.py::update_layout_seat_configurations_bulk` —
  rewritten. Merges each seat's own fields over `defaults` (per-seat wins,
  `None` falls through to `defaults`, still-`None` falls through to the
  mapping's stored value via the existing `COALESCE` in
  `update_layout_seat_mapping_configuration`). Rejects a request whose
  seats span more than one `layout_id` (`400 mixed_layout_bulk_request`).
  After the per-mapping loop, looks up the parent layout once; if
  `PUBLISHED`, replays each updated mapping through
  `upsert_operational_seat` + `replace_seat_amenities` (same primitives
  `publish_layout_seat_configurations` uses, just scoped to the edited
  mappings instead of the whole layout — nothing is being removed from
  the layout here, so no full reconcile pass is needed). Always calls the
  new `touch_floor_layout_updated_by` before commit.
- `backend/repositories/floor_layout_repository.py` — added
  `touch_floor_layout_updated_by(conn, tenant_id, layout_id, updated_by_user_id)`
  (plain `UPDATE floor_layouts SET updated_by_user_id=%s, updated_at=NOW()`).
  Fixed `FLOOR_LAYOUT_SELECT_FIELDS`/`FLOOR_LAYOUT_USER_JOINS`: added a
  real `LEFT JOIN app_users AS upd ON upd.id = fl.updated_by_user_id`,
  repointed the six `updated_by_*` SELECT columns at `fl.updated_by_user_id`/`upd.*`
  instead of `fl.uploaded_by_user_id`/`au.*`.
- `backend/schemas/floor_layout.py` — `FloorLayoutResponse.updated_by_user_id`
  (and the five sibling `updated_by_*` fields) changed from required `str`
  to `str | None` — a layout that has never been edited via the bulk-save
  path now correctly has no "updated by" yet, instead of a fake value.
- `backend/tests/floor_layouts/test_bulk_layout_seat_configuration.py` —
  rewritten for the new payload shape; added coverage for defaults vs.
  per-seat override precedence, duplicate-id rejection, mixed-layout
  rejection, draft-isolation (seats/seat_amenities never touched for
  DRAFT), and the new PUBLISHED cascade.

**Explicitly out of scope for this change** (flagged, not silently
skipped): `/seats/bulk-configuration` (`BulkSeatConfigurationUpdateRequest`,
operates directly on the live `seats` table) was left as one-shared-config
across many ids. It's a plausible standalone use case (e.g. bulk-marking
already-live seats OUT_OF_ORDER) distinct from the layout-editor bulk
config this request was about. Revisit if the same per-seat problem shows
up there too.

**Verified**

`./.venv/Scripts/python.exe -m pytest backend/tests -q` — all tests
touching this change pass. 13 pre-existing failures (admin_dashboard,
admin_management repo test, booking guest-migration/workflow tests,
`test_team_overview.py`, `DeleteFloorLayoutServiceTests` in
`test_floor_layout_service.py`) confirmed present on the unmodified
branch via `git stash` before/after comparison — unrelated to this
change, not touched.

**Files touched**

- `backend/schemas/location.py`
- `backend/schemas/floor_layout.py`
- `backend/services/location_service.py`
- `backend/repositories/floor_layout_repository.py`
- `backend/tests/floor_layouts/test_bulk_layout_seat_configuration.py`

**Still open / not done in this pass**

- Frontend (`frontend/src/features/adminlayouts1/...`) still calls the
  old flat payload shape and isn't updated here — this was a backend-only
  pass. The route's request contract has changed; the layout editor's
  bulk-save call needs updating to send `{defaults?, seats: [...]}`.
  `frontend/src/features/adminlayouts1/types/layout.types.ts` also still
  types `updated_by_user_id` — worth checking it already treats it as
  nullable given the schema change.
- No audit-log entry is written for `update_layout_seat_configurations_bulk`
  (pre-existing gap, not introduced here — `update_seats_configuration_bulk`
  does log via `SEAT_CONFIGURED`, this function never did).

---

## 2026-08-11 16:15 — Implemented: `seats` table is now append-only per layout version

**Context / what was wrong**

User asked me to confirm whether `seats` is already append-only (never
deleted) on republish, compensated by widening the unique key to
`(floor_id, seat_code, layout_id)`. Verified against the actual code
before answering:

- Good news (no change needed): almost every query that resolves "the
  seats for a floor" already scopes to the floor's *currently published*
  layout — `location_repository.py`'s shared `_SEAT_IN_PUBLISHED_LAYOUT_SQL`
  fragment (site/building/floor seat counts, floor-seats-for-booking
  listing), `booking_repository.py`'s `fetch_available_seats` /
  `fetch_available_seats_by_range` (`INNER JOIN floor_layouts fl ... AND
  fl.id = s.layout_id`), `dashboard_repository.py`'s `scoped_seats` /
  `filtered_seats` CTEs. All of these already had a dedicated regression
  test suite (`test_published_layout_seat_scoping.py`) proving this was a
  deliberate, pre-existing design decision, not something built today.
  Everything that joins `seats` via a booking/guest-visit's stable
  `seat_id` foreign key (`booking_repository.py`, `guest_visit_repository.py`,
  `team_repository.py`, `dashboard_repository.py`'s activity feeds) is
  also inherently safe — a booking always points at the exact historical
  seat row it was made against, regardless of how many retired rows pile
  up later for the same seat_code.
- Real gaps (fixed below): the DB unique constraint was still
  `(floor_id, seat_code)` only (confirmed via `upsert_operational_seat`'s
  `ON CONFLICT (floor_id, seat_code)`), so republishing overwrote the
  same row in place instead of versioning it. `reconcile_published_layout_seats`
  still had a real hard-delete path (seats with no booking/block/audit
  history got `DELETE FROM seats`). And one read query,
  `fetch_layout_seats_by_layout_id` (drives the layout editor's "does
  this draft mapping already have a live seat" view), joined `seats` to
  `layout_seat_mappings` by `floor_id + seat_code` only, with no
  `layout_id` — under append-only that would return duplicate rows the
  moment a floor has more than one historical layout version.

User confirmed the DB-side ALTER (unique constraint widened to
`floor_id, seat_code, layout_id`) was already applied directly against
the database before I touched any code.

**What changed**

- `backend/repositories/location_repository.py::upsert_operational_seat` —
  `ON CONFLICT (floor_id, seat_code)` -> `ON CONFLICT (floor_id, seat_code, layout_id)`.
  Dropped the now-redundant `layout_id = EXCLUDED.layout_id` from the
  `DO UPDATE SET` (it's part of the conflict key now). Net effect: an
  upsert against the *same* layout_id (in-version edits, e.g. the
  PUBLISHED-layout cascade added earlier today) updates in place; an
  upsert under a *new* layout_id (a fresh publish) always inserts a new
  row instead of overwriting the previous version's.
- `backend/repositories/floor_layout_repository.py::reconcile_published_layout_seats` —
  rewritten from a ~90-line has-history/delete-or-retire branch into a
  single unconditional `UPDATE seats SET status='INACTIVE', is_bookable=FALSE,
  ..., live_until=NOW() WHERE floor_id=%s AND layout_id <> %s AND
  live_until IS NULL`. No more per-seat history lookup, no more DELETE —
  "stale" is now simply "still live under some layout_id other than the
  one just published," since the upsert above already guarantees the new
  layout's rows are distinct from the old ones.
- `backend/repositories/floor_layout_repository.py::fetch_layout_seats_by_layout_id` —
  added `AND s.layout_id = lsm.layout_id` to the `LEFT JOIN seats` so it
  resolves the operational seat that belongs to *this* mapping's own
  layout version, not any historical one sharing the same seat_code.
- Tests: `test_published_layout_seat_scoping.py` — replaced
  `ReconcilePublishedLayoutSeatsHistoryCheckTests` (asserted the old
  audit_logs-based has-history check) with
  `ReconcilePublishedLayoutSeatsAppendOnlyTests` (asserts a single UPDATE,
  no DELETE, `layout_id <> %s AND live_until IS NULL`); added
  `UpsertOperationalSeatAppendOnlyTests` asserting the new 3-column
  conflict target.

**Explicitly checked and found NOT to need changes**: every other
`FROM seats`/`JOIN seats` occurrence in the codebase (grepped across all
7 files that touch the table) — either already layout_id-scoped, joined
via a stable `seat_id` foreign key, or already excluded retired rows via
`status = 'ACTIVE' AND is_bookable = TRUE` (which reconcile still sets
correctly on retire, so those continue to work unchanged).

**Verified**

`./.venv/Scripts/python.exe -m pytest backend/tests -q` — 176 passed
(up from 175; net +1 from the new upsert conflict-target test), same 13
pre-existing unrelated failures as before this change.

**Files touched**

- `backend/repositories/location_repository.py`
- `backend/repositories/floor_layout_repository.py`
- `backend/tests/floor_layouts/test_published_layout_seat_scoping.py`

**Still open**

- Frontend not touched (per instruction — different team working on it).
- Worth a follow-up sweep of any admin "seat inventory" or export-style
  screens for a stray `status='ACTIVE'`-less listing query I may not have
  found via grep, though the 7-file/full-grep audit above should have
  caught every SQL-level touchpoint.

---

## 2026-08-11 17:30 — Merge audit: `post-deployment-fixes` branch had already built the same append-only fix independently

**Context**

User pulled latest code and merged `post-deployment-fixes` into the
branch containing today's earlier work (merge commit `12c3ef0`, parents
`390fed6` = today's work, `d06f1e4` = tip of `post-deployment-fixes`).
Asked me to verify the merge for gaps.

Discovery: `post-deployment-fixes` already had an almost-identical fix
for the exact same seats-append-only problem, committed 5 days earlier
(`8eba57b`, 2026-08-06, "[vedanth] fixed constraint validation on Seats
upload. UNIQUE (floor_id, layout_id, seat_code)") on a branch I had no
visibility into during today's earlier work. It independently made the
same three changes I made today: `ON CONFLICT` widened to include
`layout_id` in `upsert_operational_seat`, `fetch_layout_seats_by_layout_id`'s
join gained `AND s.layout_id = lsm.layout_id`, and
`reconcile_published_layout_seats` was scoped by `layout_id` instead of
seat_code comparison (though their version kept the old has-history/
delete branching, mine replaced it with an unconditional retire — mine
is what survived the merge, see below).

**What was wrong (the actual merge gap)**

`fetch_layout_seats_by_layout_id`'s `LEFT JOIN seats` ended up with the
`AND s.layout_id = lsm.layout_id` condition **twice** — both branches
added the same line independently, in slightly different positions
relative to the existing `seat_code` condition, so git's merge kept both
insertions instead of recognizing them as the same fix. Harmless
(redundant condition, not incorrect), but sloppy and worth cleaning up.

**What changed**

- `backend/repositories/floor_layout_repository.py::fetch_layout_seats_by_layout_id` —
  removed the duplicate `AND s.layout_id = lsm.layout_id` line, keeping one.

**Verified**

- `ast.parse()` on every file touched by today's + the merged work — all
  clean, no syntax damage from the merge.
- Grepped for duplicate top-level `def`/`class` names across all 5 touched
  files — none (no silent shadowing from the merge).
- Grepped for leftover `<<<<<<<`/`=======`/`>>>>>>>` conflict markers
  repo-wide — none.
- Swept all touched files for adjacent duplicate lines (the actual
  merge-artifact signature) — only the one instance above, now fixed.
- `reconcile_published_layout_seats` (my unconditional-retire version)
  and `upsert_operational_seat`'s 3-column conflict target both survived
  the merge as my version, not the older `post-deployment-fixes` one —
  confirmed by direct read of current file content.
- `update_layout_seat_configurations_bulk` (today's full per-seat bulk
  redesign) survived the merge completely intact — confirmed by direct
  read.
- `./.venv/Scripts/python.exe -m pytest backend/tests -q` — **195 passed,
  0 failed** (up from 175 passed / 13 failed before this merge). The
  merge brought in independent fixes for all 13 previously-failing
  pre-existing tests I'd flagged as unrelated in the earlier session
  (admin_dashboard, admin_management repo test, booking guest-migration/
  workflow tests, `test_team_overview.py`, `DeleteFloorLayoutServiceTests`).

**Separate issue flagged to the user (not fixed without confirmation)**

`dev-notes/CHANGELOG.md` and `dev-notes/EXECUTION-FLOW.md` are tracked in
git (`git ls-files dev-notes/` lists both) and were committed in `390fed6`
and pushed — despite being listed in `.gitignore`. Once a file is already
tracked, adding it to `.gitignore` doesn't untrack it, only prevents
future `git add .`/`-A` from re-adding it if removed. These were almost
certainly staged before the `.gitignore` entry took effect in whatever
`git add` the user ran. They're now in the shared branch's history,
visible to "everyone" per the user's own framing of this branch. Flagged
directly in chat rather than silently `git rm --cached`-ing them, since
that's a decision the user should make (and history already has the
content regardless).

**Files touched**

- `backend/repositories/floor_layout_repository.py`

---

## 2026-08-13 10:00 — Fixed: `floor_layouts.updated_by_user_id` stale on 3 of 4 seat-configuration write paths

**Context**

User asked why `updated_by`/`uploaded_by`/`published_by` on
`GET /floors/{floor_id}` responses looked inconsistent, and asked for
diagnostic SQL to confirm from the DB side before any fix ("Database is
always the source of truth"). User ran the queries and returned results.

**What was wrong**

`touch_floor_layout_updated_by` (added in the 2026-08-11 15:30 entry
above) was wired into exactly one of the four write paths that mutate
`layout_seat_mappings`/`seats`:

- `update_layout_seat_configurations_bulk` (bulk layout-seat-mapping
  edit) — called it. Correct.
- `update_layout_seat_configuration` (single-mapping edit,
  `backend/services/location_service.py:333`) — did not.
- `update_seat_configuration_metadata` (single direct-`seats` edit,
  `location_service.py:1004`) — did not.
- `update_seats_configuration_bulk` (bulk direct-`seats` edit,
  `location_service.py:1073`) — did not.

Confirmed empirically from the user's query results before fixing: floors
189/190/191 had `updated_by_user_id` still `NULL` despite
`layout_seat_mappings` rows on them being edited days after the layout was
created — those edits went through the single-mapping endpoint, which
never stamped it.

`fetch_seat_configuration`/`update_seat_configuration`
(`backend/repositories/location_repository.py`) also didn't `SELECT`/
`RETURNING` a seat's `layout_id`, so the two direct-`seats`-edit service
functions had no way to know which `floor_layouts` row to stamp even if
they'd tried.

**What changed**

- `backend/repositories/location_repository.py` — `fetch_seat_configuration`
  now selects `layout_id::text AS layout_id`; `update_seat_configuration`
  now returns it in its `RETURNING` clause too.
- `backend/services/location_service.py` —
  `update_layout_seat_configuration`, `update_seat_configuration_metadata`,
  and `update_seats_configuration_bulk` all now call
  `touch_floor_layout_updated_by` on success. The two direct-`seats`-edit
  functions stamp using the seat's own `layout_id` — confirmed with the
  user this should apply even when that `layout_id` is a superseded,
  non-published layout (deliberate: "last edited" means last edited, not
  "last edited while live"). `update_seats_configuration_bulk` dedupes by
  `layout_id` before stamping, so N seats sharing one layout only issue
  one `UPDATE floor_layouts` instead of N.
- Added regression tests: `tests/floor_layouts/test_layout_seat_configuration_service.py`
  (single-mapping stamp), `tests/admin_management/test_admin_management_service.py`
  (single-seat stamp + skip-when-`layout_id`-is-`NULL`),
  `tests/admin_management/test_bulk_seat_configuration.py` (dedup-by-layout
  across a bulk seat batch).

**Verified**

`python -m pytest tests/ -q` — 201 passed (up from 199; +2 new tests).

**Files touched**

- `backend/repositories/location_repository.py`
- `backend/services/location_service.py`
- `backend/tests/floor_layouts/test_layout_seat_configuration_service.py`
- `backend/tests/admin_management/test_admin_management_service.py`
- `backend/tests/admin_management/test_bulk_seat_configuration.py`

---

## 2026-08-13 11:15 — Fixed: single-seat PATCH silently skipped the live `seats`/`seat_amenities` cascade on a PUBLISHED layout

**Context**

After the fix above, user asked whether a broader sweep would find other
places where a parent/summary table drifts out of sync because a
sync/cascade helper exists but isn't called from every write path that
should trigger it — the same bug *class* as the `updated_by_user_id` fix,
generalized. Delegated to an Explore agent to search `repositories/` and
`services/` for this pattern; it returned one high-confidence finding
(reported below) plus several checked-and-ruled-out candidates
(`reconcile_published_layout_seats`, count fields computed live via
`COUNT(*)` rather than stored, SSO department-sync helpers — all
single-entry-point or already comprehensively wired, no drift).

**What was wrong**

`update_layout_seat_configuration` (`backend/services/location_service.py:333`,
backing `PATCH /layout-seats/{id}/configuration`) always wrote
`layout_seat_mappings` only, with a comment claiming *"the `seats` table
is a published projection that is rebuilt exclusively by the layout
activate/publish flow."* That's true for DRAFT/ARCHIVED layouts, false for
PUBLISHED ones — `update_layout_seat_configurations_bulk` (the sibling
bulk endpoint) already cascades into `seats`/`seat_amenities` when the
layout is PUBLISHED, precisely because a published layout has no separate
"push to live" step for a later edit; the single-mapping endpoint's
comment and code disagreed with that sibling's own documented rationale.

Confirmed this was reachable, not theoretical: `PATCH
/layout-seats/{id}/configuration` has no layout-status gate at the route
or service level, and the "Manage Layout" admin action is available for
PUBLISHED layouts (only "Discard" is DRAFT-only in the admin layout
table). Practical effect: an admin editing one seat's status/bookability/
amenities on an already-live floor got a `200 OK` response while the
`seats` row that booking/availability queries actually read from stayed
unchanged — a silent correctness bug on live data, not just a metadata
gap.

**What changed**

- `backend/services/location_service.py::update_layout_seat_configuration` —
  after updating `layout_seat_mappings`, fetches the parent layout
  (`fetch_floor_layout_by_id`); if its status is `PUBLISHED`, cascades into
  `seats`/`seat_amenities` via the same `upsert_operational_seat` +
  `replace_seat_amenities` calls the bulk endpoint already used. Removed
  the now-incorrect "draft isolation" comment; draft isolation still holds
  for DRAFT/ARCHIVED, just not unconditionally.
- Added regression tests in
  `tests/floor_layouts/test_layout_seat_configuration_service.py`:
  PUBLISHED layout cascades into `seats`/`seat_amenities` with the right
  args; DRAFT layout still does not (draft isolation preserved).

**Explicitly out of scope, flagged not fixed**: two duplicate foreign-key
constraints (`floor_layouts_updated_by_user_id_fkey` and
`fk_layout_updated_by_user`, both on the same column) and two duplicate
indexes (`ix_floor_layouts_updated_by_user_id` /
`ix_layout_updated_by_user_id`) were spotted while reading `information_schema`
output the user supplied for the entry above. Harmless, likely a leftover
from the no-migrations-folder direct-DB-change workflow. Not touched —
out of scope for this fix, flagged to the user directly.

**Verified**

`python -m pytest tests/ -q` — 201 passed (2 new tests added, replacing
the count from the previous entry; net same total since one earlier test
in this file was extended rather than added-to separately).

**Files touched**

- `backend/services/location_service.py`
- `backend/tests/floor_layouts/test_layout_seat_configuration_service.py`

---

## 2026-08-13 14:30 — Fixed: bulk layout-seat configuration rewritten from a per-seat loop to set-based SQL

**Context**

User flagged that a 100-seat bulk-configure request doing one DB
round trip per seat "is bound to fail because of rate limiting or
anything" and asked for options. Confirmed the actual cost: even though
the whole request runs inside one DB connection/transaction, every
`cursor.execute()` in a Python loop is still its own network round trip
(send statement, DB parses/plans/executes, sends result back) — for 100
seats × ~6 statements each (fetch mapping, update mapping, upsert seat,
delete+insert-per-amenity), that's ~600 sequential round trips holding one
transaction/row-locks open the whole time. Not a connection-pool
exhaustion risk (one connection), but a real latency/lock-duration
problem that gets worse linearly with batch size. Recommended set-based
SQL (bulk `SELECT`/`UPDATE`/`INSERT` covering the whole batch in one
statement each) as the standard fix for exactly this shape of problem —
user agreed, with the explicit constraint that the request/response
schema (`BulkLayoutSeatConfigurationUpdateRequest`/
`LayoutSeatConfigurationResponse`) must not change, only the internal
implementation.

**What was wrong**

`update_layout_seat_configurations_bulk` looped over `payload.seats` in
Python, issuing one `fetch_layout_seat_mapping_by_id` SELECT and one
`update_layout_seat_mapping_configuration` UPDATE per seat; then, if the
layout was PUBLISHED, a second loop issuing one `upsert_operational_seat`
INSERT and one `replace_seat_amenities` DELETE+`executemany`-INSERT per
seat. `executemany` in psycopg2 does not batch on the wire by default —
it sends one INSERT per row, so "N amenities across M seats" was already
effectively N+M additional round trips beyond the per-seat count above.

**What changed**

Four new bulk repository functions added alongside their existing
single-row counterparts in `backend/repositories/location_repository.py`
(the single-row versions are untouched and still used by the single-seat
endpoint):

- `fetch_layout_seat_mappings_by_ids` — one `SELECT ... WHERE id = ANY(%s)`,
  returns a dict keyed by mapping id.
- `update_layout_seat_mapping_configurations_bulk` — one multi-row
  `UPDATE layout_seat_mappings AS lsm ... FROM (VALUES (...), (...), ...)
  AS v(...) WHERE lsm.id = v.id`, with the same per-row
  `COALESCE(v.col, lsm.col)` "None means keep existing" semantics the
  single-row version has via its own `COALESCE(%s, col)`.
- `upsert_operational_seats_bulk` — one multi-row `INSERT ... ON CONFLICT
  DO UPDATE` via `psycopg2.extras.execute_values` (auto-pages internally
  if a batch ever exceeded a safe single-statement size; not a concern at
  today's seat-per-floor scale but free correctness insurance). Returns a
  dict keyed by `source_layout_mapping_id` so results map straight back to
  the mapping each came from.
- `replace_seat_amenities_bulk` — one `DELETE FROM seat_amenities WHERE
  seat_id = ANY(%s)` across every touched seat, then one multi-row
  `INSERT` via `execute_values` (true multi-row insert, unlike the
  single-row version's `executemany`).

`backend/services/location_service.py::update_layout_seat_configurations_bulk`
rewritten to call these four instead of looping: bulk-fetch all mappings
up front (validating presence + single-`layout_id` constraint before
anything is written, so an invalid batch still writes nothing), bulk-
update, then — if PUBLISHED — bulk-upsert seats and bulk-replace
amenities, then the existing single `touch_floor_layout_updated_by` call.
Response order is reconstructed to match request order (`ORDER BY` isn't
guaranteed on a multi-row `UPDATE ... RETURNING`, so results are looked up
by id from a dict rather than assumed to come back in input order). Net:
~6 SQL statements total for a 100-seat request, not ~600. No change to
`BulkLayoutSeatConfigurationUpdateRequest`/`LayoutSeatConfigurationResponse`
or any other schema; no change to the single-seat endpoint or its cascade
(previous entry) — they don't share code with these new bulk functions.

Fully rewrote `tests/floor_layouts/test_bulk_layout_seat_configuration.py`
to mock the four new bulk repository functions instead of the old
per-loop single-row ones. Same behavioral assertions as before (response
order, 404/400 + rollback with nothing written, draft isolation, published
cascade, per-seat resolved values reaching the batched UPDATE correctly).

**Explicitly not done in this pass**: no live Postgres instance was
available in the working environment to execute the new multi-row SQL
against a real DB (no `docker`, no configured DB credentials) — validated
via `py_compile`, the mocked unit-test suite (201 passed), and manual
review of parameter-count/placeholder alignment only. **A manual smoke
test against a real dev DB is recommended before this is considered fully
verified**, given it rewrites the core seat-configuration write
transaction.

**Files touched**

- `backend/repositories/location_repository.py`
- `backend/services/location_service.py`
- `backend/tests/floor_layouts/test_bulk_layout_seat_configuration.py`
