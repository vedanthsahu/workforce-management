# Backend — Current State

Read this before changing anything in `backend/locations`, floor layouts,
or seat configuration. See [`dev-notes/README.md`](../README.md) for what
this file is and how it differs from `CHANGELOG.md`/`EXECUTION-FLOW.md`.

This file is maintained as current truth, not history — if a rule below
changes, this file gets edited in place; the old reasoning lives in
`CHANGELOG.md` instead.

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

## `PATCH /layout-seats/bulk-configuration` — one endpoint, status-aware

- Request: `{defaults?: {status?, is_bookable?, is_reserved?, seat_name?,
  seat_type?, amenity_ids?}, seats: [{layout_seat_mapping_id, ...same
  fields...}, ...]}`. Duplicate `layout_seat_mapping_id` across entries is
  rejected (`400`) at the schema layer.
- Per-field resolution, per seat: that seat's own value, else `defaults`,
  else the mapping's existing stored value. Never falls back to another
  seat's values.
- Always writes `layout_seat_mappings` for every entry — that table is
  always the draft/current-configuration source of truth, regardless of
  layout status.
- **If the parent layout's status is `PUBLISHED`**, the same call also
  cascades every edited mapping into `seats`/`seat_amenities` in the same
  transaction (`upsert_operational_seat` + `replace_seat_amenities`).
  **If `DRAFT`/`ARCHIVED`**, only `layout_seat_mappings` is touched (draft
  isolation — `seats` is never written).
- All seats in one request must belong to the same `layout_id`, or the
  whole request is rejected (`400 mixed_layout_bulk_request`).
- All-or-nothing per request: any failure rolls back everything written
  so far, including the `seats` cascade.
- Also stamps `floor_layouts.updated_by_user_id`/`updated_at`
  (`touch_floor_layout_updated_by`) on every successful call, regardless
  of layout status.

## Activate/Publish (`activate_floor_layout`) never carries seat data

- Purely a `DRAFT` -> `PUBLISHED` promotion for one `layout_id`. No seat
  payload, ever.
- **No-op if the layout is already `PUBLISHED`** — returns immediately,
  touches nothing.
- Reads whatever is currently in `layout_seat_mappings` (already written
  via prior bulk-configuration calls while the layout was `DRAFT`) and
  projects it into `seats`/`seat_amenities`
  (`publish_layout_seat_configurations` + `reconcile_published_layout_seats`).
- There is **no** "publish these pending edits" flow through this
  endpoint. Editing an already-published layout's seats always goes
  through the bulk-configuration endpoint above, never through activate.

## `floor_layouts.updated_by_user_id`

- Real DB column, not derived/mirrored from `uploaded_by_user_id`.
- **Nullable** — `NULL` until the layout has been edited at least once via
  the bulk-configuration path. A freshly uploaded, never-edited layout
  correctly has no "updated by" yet. `FloorLayoutResponse.updated_by_*`
  fields are typed `str | None` accordingly.

## No migrations folder in this repo

- DB schema changes (e.g. the `seats` unique-constraint widening above)
  are applied directly against the database, outside version control.
  Don't assume a schema change exists in the DB just because the code
  wants it to — confirm with whoever owns the DB before writing code that
  depends on it.

---
Last reviewed: 2026-08-11 — derived from `CHANGELOG.md`/`EXECUTION-FLOW.md`
entries through that date.
