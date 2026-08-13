# Frontend Change-Log

Frontend-only. See [`dev-notes/README.md`](../README.md) for what this
file is, why it's separate from the backend log, and the conventions
below.

Append-only. Never edit or delete a past entry — if something changes
again, add a new entry underneath. Newest entry at the bottom.

Each entry:

```
## YYYY-MM-DD HH:MM — <short title>

**What was wrong / why this was needed**
...

**What changed**
...

**Files touched**
- path/to/file.tsx
```

---

## 2026-08-12 14:00 — Seat detection on upload/preview: shared DOM-based parser

**What was wrong / why this was needed**

Seat/room ids in an uploaded floor-plan SVG were extracted with
`/<g\s+id="([^"]+)"/g` — this only matched when `id` was literally the
first attribute on the tag. A real upload (`Frame 3.svg`) had **zero**
`<g>` elements at all (a flat export with seat ids on `<path>`/`<rect>`
directly), so "No seats detected" was silently correct-looking but
undiagnosable — the old code gave no signal about *why* it found nothing.
The same fragile regex was duplicated verbatim in three files.

**What changed**

- New `frontend/src/lib/svg/extractSeatIds.ts` — parses with `DOMParser`
  and scans every element with an `id` attribute (any tag, not just `<g>`),
  sidestepping attribute order/quoting entirely. Falls back to an
  attribute-order-tolerant regex only if `DOMParser` itself fails. Logs
  (`console.log`, not `console.debug` — Chrome hides `debug` under a
  "Verbose" filter that's off by default) a breakdown of elements found by
  tag, plus matched vs. rejected ids, so a future "0 seats detected" report
  is diagnosable from the browser console alone instead of requiring a
  back-and-forth to get the actual file.
- `LayoutForm.tsx` (upload), `LayoutPreview.tsx` (manage-layout preview),
  `SvgFloorMapPage.tsx` (booking map) — all three now import the shared
  function instead of their own copy of the regex.

**Files touched**

- `frontend/src/lib/svg/extractSeatIds.ts` (new)
- `frontend/src/features/uploadlayouts/components/LayoutForm.tsx`
- `frontend/src/features/managelayout/components/LayoutPreview.tsx`
- `frontend/src/features/book/components/SvgFloorMapPage.tsx`

---

## 2026-08-12 15:00 — Stage seat edits on an already-published layout until Publish/Discard

**What was wrong / why this was needed**

Editing a seat's configuration (single or bulk) wrote to the database
immediately regardless of whether the layout was a DRAFT or the currently
live PUBLISHED layout for its floor. For a published layout this meant
every edit took effect with no review step and no way to back out of an
in-progress editing session — the user explicitly wanted edits to a live
layout to stay frontend-only until an explicit Publish (with confirmation)
or Discard.

**What changed**

- `store/seatStore.ts` — added `dirtyMappingIds: Set<string>` (which
  `layout_seat_mapping_id`s were edited locally since the last
  publish/discard) alongside the existing `isDirty` boolean, plus
  `markSeatDirty`.
- `features/managelayout1/hooks/Usemanageseats.ts` — `saveSeat`/`saveBulk`
  branch on `layout?.is_published`. DRAFT/ARCHIVED: unchanged, writes
  immediately. Already PUBLISHED: no network write at all — applies the
  edit to local state via the existing `updateSeat()` store action and
  marks the mapping id dirty. `saveBulk`'s local-only branch deliberately
  skips the `fetchSeats()` refetch it normally does after a real write,
  since a refetch here would overwrite the just-applied local edits with
  stale server data. Added `discardChanges` (re-fetches from the server —
  nothing was ever written, so this is just restoring true state + clearing
  the dirty markers).
- `features/managelayout/hooks/useLayoutDetails.ts` (`usePublishLayout`) —
  `publishLayout` flushes staged edits before activating (see the
  2026-08-12 17:00 entry below for how this flush call evolved).
- `features/managelayout1/types/seat.types.ts`,
  `features/managelayout1/components/SeatTable.tsx`,
  `features/managelayout/components/LayoutPreview.tsx` — added
  `has_unpublished_changes` on `Seat`; a "Pending" badge in the seat table
  and an orange highlight on the map for seats staged-but-not-yet-published.
- `app/(main)/admin/layouts/manage-seats/page.tsx`, new
  `components/ui/confirm-dialog.tsx` — Publish now opens a confirmation
  dialog instead of firing immediately; added an error banner that
  explicitly reassures the admin their pending edits are still safe if a
  publish attempt fails.
- **App-wide unsaved-changes navigation guard** (new, since there was no
  prior art for this in the codebase at all): `store/useNavigationGuardStore.ts`,
  `hooks/useUnsavedChangesGuard.ts`, `components/layout/UnsavedChangesDialog.tsx`,
  mounted once in `app/(main)/layout.tsx`. Guards sidebar navigation
  (`components/layout/AppSidebar.tsx`), the manage-seats page's own Back
  button, tab close/refresh (`beforeunload`), and browser back/forward (a
  `pushState`/`popstate` trap — Next.js App Router has no built-in
  route-blocking API, so this is the standard best-effort SPA technique,
  not a true block; verify the single-back-press case manually rather than
  trusting it from code review alone).
  - **Follow-up fix, same day**: the nav guard originally only ran the
    queued navigation on "Discard & Leave" — it never actually cleared the
    pending seat edits, so a standalone "Discard Changes" button on the
    page (since removed) could reappear after supposedly discarding.
    `useNavigationGuardStore` now also carries an `onDiscard` callback
    (registered via `useUnsavedChangesGuard`'s third argument) that
    `confirmLeave()` runs before navigating. There is intentionally **no**
    separate Discard button on the page anymore — discard only happens
    through this one shared leave-confirmation dialog, per explicit user
    request ("only in the confirmation dialog box is enough").

**Explicitly out of scope / notes for later**

- This entire flush-then-activate design was written **before** the
  backend's 2026-08-11 bulk-configuration redesign
  (`dev-notes/backend/CHANGELOG.md`) had been reviewed on the frontend
  side — see the 2026-08-12 17:00 entry below, which replaces the
  flush mechanism this entry describes with the new contract. Left this
  entry as originally written (append-only) rather than editing it, per
  the dev-notes convention — the reasoning for staging edits locally at
  all is still current and unaffected by the later flush-mechanism change.

**Files touched**

- `frontend/src/store/seatStore.ts`
- `frontend/src/features/managelayout1/hooks/Usemanageseats.ts`
- `frontend/src/features/managelayout/hooks/useLayoutDetails.ts`
- `frontend/src/features/managelayout1/types/seat.types.ts`
- `frontend/src/features/managelayout1/components/SeatTable.tsx`
- `frontend/src/features/managelayout/components/LayoutPreview.tsx`
- `frontend/src/app/(main)/admin/layouts/manage-seats/page.tsx`
- `frontend/src/components/ui/confirm-dialog.tsx` (new)
- `frontend/src/store/useNavigationGuardStore.ts` (new)
- `frontend/src/hooks/useUnsavedChangesGuard.ts` (new)
- `frontend/src/components/layout/UnsavedChangesDialog.tsx` (new)
- `frontend/src/app/(main)/layout.tsx`
- `frontend/src/components/layout/AppSidebar.tsx`

---

## 2026-08-12 16:00 — Booking map: unavailable rooms were a solid grey block, not a transparent overlay

**What was wrong / why this was needed**

Cabin/conference/meeting-room seats (svg id containing `CBN`/`CFR`/`MR`)
already had special handling on the employee booking map
(`SvgFloorMapPage.tsx`): available/best-match/partial-match/selected rooms
keep their original artwork, no flood-fill. But an unavailable/booked room
fell into the same fallback path as a regular seat icon — replacing
*every* `fill` inside its `<g>` with one flat color. A room is full
illustrated artwork (table, chairs, plants), not a single-shape chair icon,
so this wiped out all detail and rendered as one opaque grey blob instead
of a dimmed version of the room. Reported directly from a screenshot: "its
completely blocking make it transparent gray."

**What changed**

- `recolorSeat` in `SvgFloorMapPage.tsx` — added an `isGreyedRoom` case
  (room, not in the available/selected family) that skips the fill
  replacement entirely — original artwork colors stay untouched — and
  instead sets `opacity: 0.45` plus `filter: grayscale(1) saturate(0.5)`
  on the whole group. The room's real artwork is still visible, just
  desaturated and dimmed, instead of replaced.

**Files touched**

- `frontend/src/features/book/components/SvgFloorMapPage.tsx`

---

## 2026-08-12 16:30 — Booking form: stale conflict error stuck on screen until a fresh availability search

**What was wrong / why this was needed**

The booking conflict/error banner (`useBookingForm`'s `error` state) was
only cleared by: retrying "Find Available Seats", retrying submit, the
manual (X) dismiss button, or `resetForm`. Every other action a user would
naturally take after seeing an error — picking a different seat, changing
the date, switching office/building/floor, toggling a preference, or
clicking Back — left the banner sitting on screen with no connection to
what the user was actually doing next. Reported directly: the error "is
being stayed in the screen" until specifically re-running availability
search.

**What changed**

- `features/book/hooks/Usebookingform.ts` — added `setError(null)` to
  `setSiteId`, `setBuildingId`, `setFloorId`, `setFromDate`, `setToDate`,
  `togglePreference`, `selectSeat`, and `goBack`. The error now clears as
  soon as the user changes anything about the request, not only when they
  go back to Step 1 and re-run availability search.

**Files touched**

- `frontend/src/features/book/hooks/Usebookingform.ts`

---

## 2026-08-12 17:00 — Adopted the new bulk-configuration contract; republish no longer calls activate

**What was wrong / why this was needed**

The 2026-08-12 15:00 entry above built the publish flow against the *old*
`/layout-seats/bulk-configuration` shape (`{layout_seat_mapping_ids: [...],
...one shared config}`) and, on Publish, flushed staged edits via that
endpoint **then separately called `activateLayout`** to sync the live
`seats` table — grouping dirty seats by identical resulting payload since
the old shape couldn't express per-seat differences in one call. This
predated review of the backend's actual 2026-08-11 redesign
(`dev-notes/backend/CHANGELOG.md`, 15:30 entry): the endpoint's request
shape had already changed to `{defaults?, seats: [{layout_seat_mapping_id,
...}]}`, and — critically — it now cascades into `seats`/`seat_amenities`
itself, in the same transaction, whenever the parent layout is already
`PUBLISHED`. Calling `activateLayout` afterward for that case had become
redundant (and per `dev-notes/backend/CURRENT.md`, activate is a pure
no-op when already published anyway).

**What changed**

- `features/managelayout1/services/seatService.ts` — `bulkConfigureSeats`
  rewritten to the new contract: `{defaults?: Partial<SeatConfigPayload>,
  seats: SeatBulkEntry[]}`, one call, response mapped back to `Seat[]`.
- `features/managelayout1/hooks/Usemanageseats.ts` — `saveBulk`'s
  DRAFT/ARCHIVED (immediate-write) branch updated to the new shape: shared
  config goes in `defaults`, each entry only carries its mapping id.
- `features/managelayout/hooks/useLayoutDetails.ts` (`publishLayout`) —
  restructured: for an already-published layout with staged edits, sends
  **one** `bulkConfigureSeats({ seats: [...] })` call with each dirty
  seat's own fields (no more grouping-by-identical-payload — the new shape
  allows per-seat overrides in a single request) and does **not** call
  `activateLayout` at all for this case. `activateLayout` is now only
  called for the genuine DRAFT/ARCHIVED -> PUBLISHED promotion path.
- `backend/services/floor_layout_service.py::activate_floor_layout` —
  reverted the already-published branch back to a pure no-op (see
  `dev-notes/backend/CHANGELOG.md`, 2026-08-12 17:00 entry) now that the
  bulk-configuration endpoint owns the cascade.

**Explicitly out of scope**

- Auto-configuring remaining *unconfigured* seats as part of Publish (i.e.
  relaxing the `allConfigured` gate on `canPublish` by sending
  still-unconfigured seats through `defaults`) was **not** implemented —
  this pass only changes *which* endpoint carries staged edits for seats
  the admin actually touched. Revisit if that turns out to be the actual
  intent behind "so all the unconfigured seats will be configured."

**Files touched**

- `frontend/src/features/managelayout1/services/seatService.ts`
- `frontend/src/features/managelayout1/hooks/Usemanageseats.ts`
- `frontend/src/features/managelayout/hooks/useLayoutDetails.ts`
- `backend/services/floor_layout_service.py`

---

## 2026-08-13 10:00 — Admin layout list: "Last Updated Details" went stale after a republish

**What was wrong / why this was needed**

Direct fallout from the entry immediately above. `LayoutTable.tsx`'s "Last
Updated Details" column unconditionally showed `published_by_name`/
`published_at` for any row where `status === PUBLISHED`. Those two fields
are only ever written by `activateLayout`'s underlying repo call — but the
2026-08-12 17:00 change made republishing an already-published layout's
edits go through `bulk-configuration` only, which stamps `updated_at`/
`updated_by_user_id` instead and never calls `activateLayout` at all. So
after republishing, the column kept showing whoever/whenever the layout
was *originally* published, never the person who just republished it —
reported directly: "why the last updated detail is still showing old data
not the current one."

**What changed**

- `features/adminlayouts1/components/LayoutTable.tsx` — the published-row
  branch now compares `updated_at` vs. `published_at` and shows whichever
  is actually more recent (falling back to published info when
  `updated_at` is null/older, which is the normal case for a layout that's
  never been edited since its original publish). Non-published rows are
  unaffected — they always showed `updated_by_name`/`updated_at` already.

**Files touched**

- `frontend/src/features/adminlayouts1/components/LayoutTable.tsx`
