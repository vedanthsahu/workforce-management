# Frontend — Current State

Read this before changing anything in `frontend/`. See
[`dev-notes/README.md`](../README.md) for what this file is and how it
differs from `CHANGELOG.md`/`EXECUTION-FLOW.md`.

## Seat editing on a PUBLISHED layout stages locally until Publish/Discard

- `useManageSeats().saveSeat`/`saveBulk` branch on `layout?.is_published`.
  DRAFT/ARCHIVED: writes immediately, same as always. Already PUBLISHED: no
  network call at all — the edit is applied to local state
  (`useSeatsStore.updateSeat`) and the mapping id is added to
  `useSeatsStore.dirtyMappingIds`. Nothing reaches the database until the
  admin explicitly clicks Publish (confirmation dialog) or the edit is
  dropped via Discard.
- There is **no standalone "Discard" button** on the manage-seats page by
  design — discard only happens through the shared unsaved-changes
  leave-confirmation dialog (see below). Don't re-add one without checking
  why it was removed (`dev-notes/frontend/CHANGELOG.md`, 2026-08-12 15:00
  entry).
- `usePublishLayout().publishLayout` — for an already-published layout with
  staged edits, sends everything currently in `dirtyMappingIds` through
  **one** `PATCH /layout-seats/bulk-configuration` call (per-seat entries,
  no `defaults`) and does **not** call `activateLayout`. `activateLayout`
  is only called for a genuine DRAFT/ARCHIVED -> PUBLISHED promotion (see
  backend contract below — activate never carries seat data and is a
  no-op if already published).
- Publishing does **not** auto-configure seats the admin never touched —
  `canPublish` still requires `allConfigured` (every seat configured)
  before the button is enabled at all. If that gate is ever meant to be
  relaxed (auto-defaulting remaining unconfigured seats via the bulk
  endpoint's `defaults`), that's a distinct, not-yet-made product decision
  — see the "Explicitly out of scope" note in the 2026-08-12 17:00
  changelog entry.

## App-wide unsaved-changes navigation guard

- `store/useNavigationGuardStore.ts` + `hooks/useUnsavedChangesGuard.ts` +
  `components/layout/UnsavedChangesDialog.tsx` (mounted once in
  `app/(main)/layout.tsx`). Any page with unsaved state calls
  `useUnsavedChangesGuard(isDirty, message, onDiscard)`; any in-app
  navigation trigger (currently: `AppSidebar`'s nav/profile/notifications,
  the manage-seats page's own Back button) must call
  `useNavigationGuardStore.getState().requestNavigation(() => ...)` instead
  of calling `router.push`/`router.back()` directly, or it will bypass the
  guard silently.
- Browser back/forward is intercepted via a `pushState`/`popstate` trap —
  this is a best-effort SPA technique (Next.js App Router has no built-in
  route-blocking API), not a guaranteed block. If you touch
  `useUnsavedChangesGuard`, re-test the single-back-press case manually.
- `onDiscard` (passed into `useUnsavedChangesGuard`) is what actually
  clears pending state when the user picks "Discard & Leave" — the guard
  only handles the navigation decision, not the discard side effect. A
  page that's dirty but doesn't pass `onDiscard` will navigate away
  without ever clearing its own state.

## Backend contract this side must account for

- `PATCH /layout-seats/bulk-configuration` — request shape is
  `{defaults?: {...}, seats: [{layout_seat_mapping_id, ...}, ...]}` (full
  detail in [`../backend/CURRENT.md`](../backend/CURRENT.md)). Implemented
  frontend-side as `bulkConfigureSeats` in
  `features/managelayout1/services/seatService.ts`.
- For a layout that's already `PUBLISHED`, there is no separate "push
  these edits live" call — calling `bulkConfigureSeats` is enough; the
  backend decides whether to also write the live `seats` table based on
  the layout's current status. The frontend must not call `activateLayout`
  for this case (it's a no-op there anyway).
- The single-seat endpoint (`PATCH /layout-seats/{id}/configuration`, used
  by `configureSeat` for immediate DRAFT-layout single-seat edits) does
  **not** have the PUBLISHED cascade — only the bulk endpoint does. Never
  use the single-seat endpoint to flush a published layout's staged edits,
  even for exactly one dirty seat — always go through `bulkConfigureSeats`.

## Seat detection from an uploaded/fetched SVG

- `lib/svg/extractSeatIds.ts` is the one shared implementation (upload
  form, manage-layout preview, booking map). Parses with `DOMParser` and
  scans every element with an `id` (any tag), not just `<g>` — don't
  reintroduce a `<g id="...">`-only regex, real exports aren't guaranteed
  to group seats in `<g>` at all. Logs via `console.log` (not
  `console.debug`, which Chrome hides by default) so a "0 seats detected"
  report is diagnosable from the console.

---
Last reviewed: 2026-08-12.
