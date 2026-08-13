# Backend — Current State

Read this before changing anything in `backend/locations`, floor layouts,
or seat configuration. See [`dev-notes/README.md`](../README.md) for what
this file is and how it differs from `CHANGELOG.md`/`EXECUTION-FLOW.md`.

This file is maintained as current truth, not history — if a rule below
changes, this file gets edited in place; the old reasoning lives in
`CHANGELOG.md` instead.

## Checkpoint: 2026-08-13 — seat-configuration write-path consistency + performance

Three real issues found and fixed in one investigation, all in the
`layout_seat_mappings` / `seats` / `floor_layouts` write paths. **No API
request or response contract changed in any of the three** — every fix is
internal to how the backend processes an already-existing request shape.
Full provenance (why, what was considered, verification) is in
`CHANGELOG.md`; this is the compressed "what's true now" version.

**1. `floor_layouts.updated_by_user_id`/`updated_at` went stale on 3 of 4 write paths.**
Only the bulk layout-seat-mapping endpoint stamped it. The single-mapping
endpoint and both direct-`seats`-edit endpoints (single + bulk) never
called `touch_floor_layout_updated_by`, so `updated_by` silently stopped
reflecting reality on any edit made through those three. Confirmed against
live data before fixing (several DRAFT layouts had `updated_by_user_id`
still `NULL` despite being edited days after creation). All four write
paths now stamp it — see the `floor_layouts.updated_by_user_id` section
below for current rules.

**2. The single-seat PATCH silently skipped the live cascade on a PUBLISHED layout.**
`PATCH /layout-seats/{id}/configuration` always wrote `layout_seat_mappings`
only, even when the parent layout was already `PUBLISHED`. A published
layout has no separate "push to live" step, so an edit against it must
land in `seats`/`seat_amenities` immediately — same as the bulk endpoint
already did correctly. Before this fix, editing one seat's status /
bookability / amenities on a live floor returned `200 OK` while the seat
data bookings actually check against never changed. This was a silent
correctness bug, not just a metadata gap. Fixed — see the endpoint section
below.

**3. Bulk layout-seat configuration did ~6 sequential SQL round trips per seat.**
Not a correctness bug, a scaling one: a 100-seat bulk save issued ~600
sequential statements on one DB connection (fetch → update → upsert →
delete+insert-per-amenity, per seat, in a Python loop). Correct and atomic,
but slow, and held row locks longer than necessary. Rewritten as a small
constant number of set-based SQL statements covering the whole batch
regardless of size — see the endpoint section below for the new shape.

**UI-facing takeaway:** nothing in the request or response JSON for any of
the affected endpoints changed. The only externally-visible differences
are (a) `updated_by_*` fields on floor-layout responses now populate
correctly on edits that previously left them stale, and (b) a single-seat
edit against a published layout now actually changes what's bookable,
where it silently didn't before. No frontend code changes are required to
adopt either fix — both are transparent to an existing caller of the
existing contract. The one standing recommendation (not a requirement):
whoever owns the caller of `PATCH /layout-seats/{id}/configuration` vs.
`PATCH /layout-seats/bulk-configuration` should prefer the real bulk
endpoint over N individual single-seat calls when saving more than a
handful of seats at once — the bulk endpoint is the one that got the
performance fix in point 3, and it's dramatically cheaper server-side at
that point (one request/transaction instead of N).

## `seats` is append-only, versioned per layout publish

- Unique key is **`(floor_id, seat_code, layout_id)`**, not
  `(floor_id, seat_code)`. Applied at the DB level directly (no migrations
  folder/tooling exists in this repo — schema changes are applied outside
  the repo and must be coordinated, not assumed).
- Rows are **never deleted**. When a floor's layout is republished,
  `reconcile_published_layout_seats` retires (does not delete) every seat
  still marked live under any other `layout_id` on that floor: single
  `UPDATE ... SET status='INACTIVE', is_bookable=FALSE, is_reserved=FALSE,
  live_until=NOW(), retired_reason='LAYOUT_REPUBLISHED' WHERE layout_id <>
  %s AND live_until IS NULL`. No per-seat booking/audit history check —
  retiring is always safe and always correct now.
- "Currently live" = `live_until IS NULL`.
- Publishing/republishing always inserts a fresh row per configured seat
  under the new `layout_id` (`upsert_operational_seat`'s
  `ON CONFLICT (floor_id, seat_code, layout_id)`), rather than overwriting
  the previous version's row. This is why a booking made against an old
  layout version still shows correctly — `bookings.seat_id` is a stable FK
  to one specific historical row, regardless of how many retired rows
  pile up later for the same `seat_code`.
- An upsert against the **same** `layout_id` (an in-version edit — see the
  bulk-configuration cascade below) updates that row in place; it's only
  a *different* `layout_id` that creates a new row.

## Every query resolving "the seats for a floor" must scope to the currently published layout

- Standard pattern: join/filter on
  `floor_layouts WHERE is_published = TRUE AND status = 'PUBLISHED' AND
  floor_layouts.id = seats.layout_id`. Reused via the
  `_SEAT_IN_PUBLISHED_LAYOUT_SQL` fragment in `location_repository.py`,
  and inlined equivalently in `booking_repository.py`
  (`fetch_available_seats`, `fetch_available_seats_by_range`) and
  `dashboard_repository.py`'s scoped/filtered-seats CTEs.
- **Exception:** anything joining `seats` via a stable foreign key
  (`bookings.seat_id`, `guest_visits` -> `bookings.seat_id`,
  `blocked_seats.seat_id`) never needs this — it already points at one
  exact historical row, live or retired.
- **Exception:** `fetch_seat_configuration` defaults to *not* scoping by
  published layout, because admin seat-management must still be able to
  find and fix a stale seat. Pass `require_current_layout=True` to opt in
  (used by the booking-eligibility path).

## `PATCH /layout-seats/{id}/configuration` and `/bulk-configuration` — both status-aware, both cascade the same way

- Two endpoints, one seat vs many. As of 2026-08-13 they apply
  **identical** rules for whether/how an edit lands in `seats`/
  `seat_amenities` and whether `floor_layouts` gets stamped — see
  Checkpoint above for what was inconsistent before that date.
- Bulk request shape: `{defaults?: {status?, is_bookable?, is_reserved?,
  seat_name?, seat_type?, amenity_ids?}, seats: [{layout_seat_mapping_id,
  ...same fields...}, ...]}`. Duplicate `layout_seat_mapping_id` across
  entries is rejected (`400`) at the schema layer. Per-field resolution,
  per seat: that seat's own value, else `defaults`, else the mapping's
  existing stored value. Never falls back to another seat's values. All
  seats in one bulk request must belong to the same `layout_id`, or the
  whole request is rejected (`400 mixed_layout_bulk_request`).
- Both endpoints always write `layout_seat_mappings` first — that table is
  always the draft/current-configuration source of truth, regardless of
  layout status.
- **If the parent layout's status is `PUBLISHED`**, both endpoints also
  cascade every edited mapping into `seats`/`seat_amenities` in the same
  transaction. **If `DRAFT`/`ARCHIVED`**, only `layout_seat_mappings` is
  touched (draft isolation — `seats` is never written).
- All-or-nothing per request: any failure rolls back everything written
  so far, including the `seats` cascade. For the bulk endpoint, validation
  (unknown mapping id, mixed layout_id) happens before any statement is
  issued, so an invalid batch never writes anything at all, not even
  partially.
- Both endpoints stamp `floor_layouts.updated_by_user_id`/`updated_at`
  (`touch_floor_layout_updated_by`) on every successful call, regardless
  of layout status.
- **Bulk endpoint internals (rewritten 2026-08-13):** no per-seat Python
  loop of DB round trips anymore. One transaction runs a fixed small
  number of set-based statements covering the whole batch, regardless of
  how many seats are in it:
  1. `fetch_layout_seat_mappings_by_ids` — one `SELECT ... WHERE id = ANY(%s)`.
  2. `update_layout_seat_mapping_configurations_bulk` — one multi-row
     `UPDATE layout_seat_mappings ... FROM (VALUES ...) AS v(...)`, same
     per-row `COALESCE(v.col, table.col)` "keep existing if not provided"
     semantics as the single-row version.
  3. If `PUBLISHED`: `upsert_operational_seats_bulk` — one multi-row
     `INSERT ... ON CONFLICT DO UPDATE` into `seats`, via psycopg2's
     `execute_values` (which auto-pages if a batch ever got very large).
  4. If `PUBLISHED`: `replace_seat_amenities_bulk` — one `DELETE ... WHERE
     seat_id = ANY(%s)` across every touched seat, then one multi-row
     `INSERT` (`execute_values`) for `seat_amenities`.
  A 100-seat request is ~6 statements total now, not ~600. The
  single-seat endpoint is unaffected by this rewrite — it still uses the
  original single-row repository functions
  (`update_layout_seat_mapping_configuration`, `upsert_operational_seat`,
  `replace_seat_amenities`) and does not share code with the bulk path's
  batched functions.

## Activate/Publish (`activate_floor_layout`) never carries seat data

- Purely a `DRAFT` -> `PUBLISHED` promotion for one `layout_id`. No seat
  payload, ever.
- **No-op if the layout is already `PUBLISHED`** — returns immediately,
  touches nothing.
- Reads whatever is currently in `layout_seat_mappings` (already written
  via prior configuration calls while the layout was `DRAFT`) and
  projects it into `seats`/`seat_amenities`
  (`publish_layout_seat_configurations` + `reconcile_published_layout_seats`).
- There is **no** "publish these pending edits" flow through this
  endpoint. Editing an already-published layout's seats always goes
  through the layout-seat-configuration endpoints above (single or bulk),
  never through activate.

## `floor_layouts.updated_by_user_id`

- Real DB column, not derived/mirrored from `uploaded_by_user_id`.
- **Nullable** — `NULL` until the layout has been edited at least once via
  any of the seat-configuration write paths (single-mapping edit, bulk
  edit, single direct-seat edit, or bulk direct-seat edit — all four call
  `touch_floor_layout_updated_by` as of 2026-08-13). A freshly uploaded,
  never-edited layout correctly has no "updated by" yet.
  `FloorLayoutResponse.updated_by_*` fields are typed `str | None`
  accordingly.
- Direct `seats`-table edits (`update_seat_configuration_metadata`,
  `update_seats_configuration_bulk` — the admin path that can touch a
  seat left over from a superseded layout, see
  `fetch_seat_configuration`'s `require_current_layout` below) stamp
  using **the seat's own `layout_id`**, even when that layout is no
  longer the currently-published one. This was a deliberate call, not an
  oversight: `updated_by` on a given `floor_layouts` row means "last
  edited," full stop, not "last edited while live."

## No migrations folder in this repo

- DB schema changes (e.g. the `seats` unique-constraint widening above)
  are applied directly against the database, outside version control.
  Don't assume a schema change exists in the DB just because the code
  wants it to — confirm with whoever owns the DB before writing code that
  depends on it.

---
Last reviewed: 2026-08-13 — derived from `CHANGELOG.md`/`EXECUTION-FLOW.md`
entries through that date.
