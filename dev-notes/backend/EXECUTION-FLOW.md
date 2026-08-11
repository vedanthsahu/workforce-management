# Backend Execution-Flow Notes

Backend-only. See [`dev-notes/README.md`](../README.md) for what this file
is, why it's separate from the frontend log, and the conventions below.

Append-only. For each feature/change: what functions exist now, what got
added/removed, and how data actually flows end-to-end (route → service →
repository → table). Newest entry at the bottom.

---

## 2026-08-11 14:00 — Baseline: current bulk seat-configuration flow

Captured before any redesign, so future entries can diff against it.

### `PATCH /seats/bulk-configuration` (published/live seats)

```
locations.py: update_seats_bulk_configuration_route(payload: BulkSeatConfigurationUpdateRequest)
  -> require_any_permission(["location:manage", "layout:upload"])
  -> location_service.update_seats_configuration_bulk(conn, tenant_id, payload, current_user)
       payload = { status?, is_bookable?, seat_ids: [int, ...] }   # ONE config, N ids
       for seat_id in seat_ids:
           fetch_seat_configuration(seat_id)          -> repo SELECT on `seats`
           update_seat_configuration(seat_id, updates) -> repo UPDATE on `seats`
       conn.commit() once, all-or-nothing (any failure -> rollback, none applied)
       audit: SEAT_CONFIGURED, one row per call (resource_id = comma-joined seat_ids)
  -> response: list[SeatConfigurationResponse], one per seat_id, all identical config
```

Only touches `seats`. Used for seats already live under a PUBLISHED layout.

### `PATCH /layout-seats/bulk-configuration` (draft seats, pre-publish)

```
locations.py: update_layout_seats_bulk_configuration_route(payload: BulkLayoutSeatConfigurationUpdateRequest)
  -> require_any_permission(["location:manage", "layout:upload"])
  -> location_service.update_layout_seat_configurations_bulk(conn, tenant_id, payload, current_user)
       payload = { seat_name?, seat_type?, status?, is_bookable?, layout_seat_mapping_ids: [int, ...] }
       for mapping_id in layout_seat_mapping_ids:
           fetch_layout_seat_mapping_by_id(mapping_id)              -> repo SELECT on `layout_seat_mappings`
           update_layout_seat_mapping_configuration(mapping_id, ...) -> repo UPDATE on `layout_seat_mappings`
       conn.commit() once, all-or-nothing
  -> response: list[LayoutSeatConfigurationResponse], one per mapping_id, all identical config
```

Only touches `layout_seat_mappings` — "draft isolation" is explicit in the
docstring: this must never touch `seats`. `seats` is only ever rebuilt by
the activate/publish flow below.

### Publish flow (where `layout_seat_mappings` -> `seats` reconciliation happens today)

```
floor_layout_service.activate_floor_layout(layout_id)
  -> acquire_floor_publish_lock(floor_id)   # advisory lock, serializes concurrent publishes for the floor
  -> archive currently-PUBLISHED layout for the floor (if any)
  -> publish_layout_seat_configurations(layout_id)   # upserts layout_seat_mappings -> seats + seat_amenities
  -> reconcile_published_layout_seats(layout_id)     # retires/deletes seats no longer configured in this layout
  -> floor_layout_repository.activate_floor_layout(layout_id, published_by_user_id)
       UPDATE floor_layouts SET status='PUBLISHED', is_published=TRUE,
              published_at=NOW(), published_by_user_id=%s, updated_at=NOW()
```

This is the only place `layout_seat_mappings` and `seats` are reconciled
together today. There is currently no "hold edits client-side, push both
tables together on Publish, for arbitrary bulk seat edits made *after* a
layout is already PUBLISHED" path — that's new, not yet built.

### `floor_layouts.updated_by_user_id` — current (fake) read path

```
floor_layout_repository.py FLOOR_LAYOUT_SELECT_FIELDS:
    fl.uploaded_by_user_id::text AS updated_by_user_id   <- mirrors uploader, not a real updated-by
    au.full_name AS updated_by_name                       <- same `au` join as uploaded_by_* (join key: fl.uploaded_by_user_id)
    ...
FLOOR_LAYOUT_USER_JOINS:
    LEFT JOIN app_users au ON au.id = fl.uploaded_by_user_id  <- no join keyed on fl.updated_by_user_id exists
    LEFT JOIN app_users pub ON pub.id = fl.published_by_user_id
```

Used by both `fetch_floor_layouts_by_floor` and `_fetch_floor_layout_row`
(-> `fetch_floor_layout_by_id`), i.e. every floor-layout list/detail
response inherits this fake value. Real fix needs: a new `LEFT JOIN
app_users AS upd ON upd.id = fl.updated_by_user_id AND upd.tenant_id =
fl.tenant_id`, and the six `updated_by_*` SELECT columns repointed at
`fl.updated_by_user_id`/`upd.*` instead of `fl.uploaded_by_user_id`/`au.*`.
Still open: which write path should actually SET `fl.updated_by_user_id`
going forward (see CHANGELOG.md 2026-08-11 entry) — nothing does today.

---

## 2026-08-11 15:30 — New: per-seat bulk layout-seat configuration flow

### `PATCH /layout-seats/bulk-configuration` — new shape and flow

Request body changed from `{status?, is_bookable?, ..., layout_seat_mapping_ids: [int]}`
to:

```json
{
  "defaults": { "status": "ACTIVE", "is_bookable": true },   // optional
  "seats": [
    { "layout_seat_mapping_id": 1, "amenity_ids": [3, 9] },
    { "layout_seat_mapping_id": 2, "status": "INACTIVE" }
  ]
}
```

```
locations.py: update_layout_seats_bulk_configuration_route(payload: BulkLayoutSeatConfigurationUpdateRequest)
  -> require_any_permission(["location:manage", "layout:upload"])
  -> location_service.update_layout_seat_configurations_bulk(conn, tenant_id, payload, current_user)

       layout_id: str | None = None
       updated_mappings: list[dict] = []

       for entry in payload.seats:
           mapping = fetch_layout_seat_mapping_by_id(entry.layout_seat_mapping_id)
           if mapping is None: 404
           if layout_id is None: layout_id = mapping.layout_id
           elif layout_id != mapping.layout_id: 400 mixed_layout_bulk_request

           # per-seat field wins over payload.defaults wins over "leave as-is"
           merged_field = entry.<field> if entry.<field> is not None else defaults.<field>
           updated_mapping = update_layout_seat_mapping_configuration(
               mapping_id, seat_name=merged, seat_type=merged, status=merged,
               is_bookable=merged, is_reserved=merged, amenity_ids=merged,
               updated_by=current_user.user_id,
           )                                            -> repo UPDATE on `layout_seat_mappings`, COALESCE(%s, col)
           updated_mappings.append(updated_mapping)      # full row, RETURNING *

       # after all mappings are updated (still inside the same transaction):
       layout = fetch_floor_layout_by_id(layout_id)      -> repo SELECT on `floor_layouts`

       if layout.status == 'PUBLISHED':
           for mapping in updated_mappings:
               seat = upsert_operational_seat(mapping.*)         -> repo UPSERT on `seats` (ON CONFLICT floor_id, seat_code)
               replace_seat_amenities(seat.seat_id, mapping.amenity_ids)  -> repo DELETE+INSERT on `seat_amenities`
           # scoped to just the edited mappings -- NOT a full
           # reconcile_published_layout_seats pass, because nothing is
           # being removed from the layout by this endpoint, only
           # reconfigured. Reuses the exact same two repo functions
           # publish_layout_seat_configurations calls per-mapping.

       touch_floor_layout_updated_by(layout_id, current_user.user_id)   -> repo UPDATE floor_layouts SET updated_by_user_id, updated_at

       conn.commit()   # still all-or-nothing: any HTTPException/psycopg2.Error -> rollback, nothing written
  -> response: list[LayoutSeatConfigurationResponse], one per seat, each reflecting its own merged config
```

### Where this plugs into the existing publish flow

`floor_layout_service.activate_floor_layout` (the *first* publish of a
layout) still does the full `publish_layout_seat_configurations` +
`reconcile_published_layout_seats` pass over every configured mapping —
unchanged. The new PUBLISHED-cascade branch above only ever runs for a
layout that is *already* PUBLISHED and is being edited afterward (the "admin
comes back and changes five seats" scenario) — it reuses
`upsert_operational_seat`/`replace_seat_amenities` (the same two
repository functions, imported from `location_repository.py` into
`location_service.py`) but never touches `reconcile_published_layout_seats`,
since no seat is being removed from the layout by a configuration edit.

### `floor_layouts.updated_by_user_id` — now real

```
floor_layout_repository.py FLOOR_LAYOUT_SELECT_FIELDS (fixed):
    fl.updated_by_user_id::text AS updated_by_user_id   <- real column now
    upd.full_name AS updated_by_name                     <- new join alias `upd`, keyed on fl.updated_by_user_id
    ...
FLOOR_LAYOUT_USER_JOINS (fixed):
    LEFT JOIN app_users au  ON au.id  = fl.uploaded_by_user_id   (unchanged -- still backs uploaded_by_*)
    LEFT JOIN app_users pub ON pub.id = fl.published_by_user_id  (unchanged)
    LEFT JOIN app_users upd ON upd.id = fl.updated_by_user_id    (new)

floor_layout_repository.py: touch_floor_layout_updated_by(layout_id, updated_by_user_id)
    UPDATE floor_layouts SET updated_by_user_id = %s, updated_at = NOW() WHERE tenant_id=%s AND id=%s
    <- only caller today: update_layout_seat_configurations_bulk, after every successful bulk save
```

`schemas/floor_layout.py::FloorLayoutResponse.updated_by_user_id` is now
`str | None` (was a required `str` backed by the uploaded_by mirror) — a
layout that has never gone through a bulk seat-config save correctly
reports no updated_by yet instead of a fake uploader value.

---

## 2026-08-11 16:15 — `seats` append-only versioning: how a republish now flows

### Before (single row per floor_id + seat_code, overwritten in place)

```
activate_floor_layout(new_layout_id)
  -> archive_existing_published_layouts(floor_id)      # old floor_layouts row: PUBLISHED -> ARCHIVED
  -> publish_layout_seat_configurations(new_layout_id)
       for each configured layout_seat_mapping:
           upsert_operational_seat(...)                 # ON CONFLICT (floor_id, seat_code) DO UPDATE
                                                          #   -> same seats.id reused across every republish
           replace_seat_amenities(seat.id, ...)
  -> reconcile_published_layout_seats(floor_id, new_layout_id)
       find seats on this floor NOT referenced by new_layout_id's configured mappings (by seat_code)
       has_history = EXISTS booking/blocked_seat/audit_log referencing seat.id
       has_history ? UPDATE ... SET status='INACTIVE', live_until=NOW()   # retire
                    : DELETE FROM seats WHERE id = ...                     # <-- hard delete, no history
```

### After (one row per floor_id + seat_code + layout_id, never deleted)

```
activate_floor_layout(new_layout_id)
  -> archive_existing_published_layouts(floor_id)      # unchanged
  -> publish_layout_seat_configurations(new_layout_id)
       for each configured layout_seat_mapping:
           upsert_operational_seat(...)                 # ON CONFLICT (floor_id, seat_code, layout_id) DO UPDATE
                                                          #   -> new layout_id => always a NEW seats row
                                                          #   -> same layout_id (in-version edit) => updates in place
           replace_seat_amenities(seat.id, ...)
  -> reconcile_published_layout_seats(floor_id, new_layout_id)
       UPDATE seats
       SET status='INACTIVE', is_bookable=FALSE, is_reserved=FALSE,
           live_until=NOW(), retired_reason='LAYOUT_REPUBLISHED', updated_at=NOW()
       WHERE tenant_id=%s AND floor_id=%s AND layout_id <> %s AND live_until IS NULL
       -- no DELETE anywhere; no per-seat history lookup needed anymore --
       -- "stale" now just means "still live under a layout_id that isn't
       -- the one just published"
```

### Why read queries needed (almost) no changes

Every query that decides "which seats exist for this floor" for
booking/availability/stats already joined to `floor_layouts` and filtered
`fl.id = s.layout_id AND fl.is_published = TRUE AND fl.status = 'PUBLISHED'`
(a pre-existing pattern, see `_SEAT_IN_PUBLISHED_LAYOUT_SQL` in
`location_repository.py`, and the equivalent inline joins in
`booking_repository.py::fetch_available_seats(_by_range)` and
`dashboard_repository.py`'s `scoped_seats`/`filtered_seats` CTEs) — those
automatically stop seeing an old layout's seats the instant a new layout
publishes, with zero changes. Queries that join `seats` via a booking's
stable `seat_id` foreign key (`bookings`, `guest_visits`, `team_repository`,
dashboard activity feeds) never needed layout scoping at all -- they
already point at one specific historical row. The one query that DID need
a fix, `fetch_layout_seats_by_layout_id` (used by the layout editor to
show "does this draft mapping already have a live seat"), joined by
`floor_id + seat_code` only with no `layout_id` -- fixed by adding
`AND s.layout_id = lsm.layout_id` to the join.
