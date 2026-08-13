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

## 2026-08-12 17:00 — Reverted a stale patch to `activate_floor_layout`'s already-published no-op

**What was wrong**

Before the 2026-08-11 15:30 entry above landed (per-seat bulk config +
PUBLISHED cascade in `update_layout_seat_configurations_bulk`), a separate,
independent fix had been made directly to `activate_floor_layout`
(`backend/services/floor_layout_service.py`): instead of the documented
no-op when `layout.is_published is True and status == PUBLISHED`, it called
`publish_layout_seat_configurations` + `reconcile_published_layout_seats`
itself, on the theory that re-publishing an already-live layout needed
*some* endpoint to re-sync `layout_seat_mappings` into `seats`. That patch
was made in a frontend-facing session that hadn't seen the backend's own
redesign land yet, and the two changes never got reconciled — the code and
`CURRENT.md` disagreed (`CURRENT.md` said "no-op, touches nothing"; the code
didn't) until this entry.

**What changed**

- `backend/services/floor_layout_service.py::activate_floor_layout` —
  removed the `publish_layout_seat_configurations`/
  `reconcile_published_layout_seats` calls from the already-published
  branch. It's a pure no-op again, matching `CURRENT.md`. The frontend was
  updated in the same pass (see `dev-notes/frontend/CHANGELOG.md`,
  2026-08-12) to stop calling `POST .../activate` at all for an
  already-published layout's edits — it now only calls
  `PATCH /layout-seats/bulk-configuration`, which already does the
  `seats` cascade itself, in the same transaction as the edit. Re-running
  the sync a second time from `activate` would have been redundant, not
  incorrect, but leaving it in place kept the code and the documented
  contract visibly disagreeing.

**Files touched**

- `backend/services/floor_layout_service.py`

---

## 2026-08-13 10:15 — Single-seat config endpoint never stamped `floor_layouts.updated_by`

**What was wrong**

`touch_floor_layout_updated_by` (2026-08-11 15:30 entry) was only ever
called from `update_layout_seat_configurations_bulk`. The single-seat
endpoint, `update_layout_seat_configuration` (`PATCH
/layout-seats/{id}/configuration`, used whenever an admin edits exactly
one seat through the seat panel rather than Bulk Edit), never called it.
Net effect, visible directly in the admin layout list: a layout edited one
seat at a time — however many times — kept showing `—` for "Last Updated
Details" forever, while a layout touched even once via Bulk Edit showed
correct info. Not intentional; just an omission when the bulk path was
added.

**What changed**

- `backend/services/location_service.py::update_layout_seat_configuration` —
  now also calls `touch_floor_layout_updated_by` before commit, same as
  the bulk endpoint. Both seat-config write paths now consistently stamp
  `floor_layouts.updated_by_user_id`/`updated_at`.

**Files touched**

- `backend/services/location_service.py`
