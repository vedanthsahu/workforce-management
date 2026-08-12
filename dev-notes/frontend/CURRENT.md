# Frontend — Current State

Read this before changing anything in `frontend/`. See
[`dev-notes/README.md`](../README.md) for what this file is and how it
differs from `CHANGELOG.md`/`EXECUTION-FLOW.md`.

No frontend-side architectural decisions have been recorded in dev-notes
yet. This file will fill in as the frontend team documents its own
decisions here — see the backend side for what a filled-in `CURRENT.md`
looks like.

## Backend contract this side must account for

- `PATCH /layout-seats/bulk-configuration`'s request shape changed (full
  detail in [`../backend/CURRENT.md`](../backend/CURRENT.md)): it's now
  `{defaults?: {...}, seats: [{layout_seat_mapping_id, ...}, ...]}`, not
  one shared config object plus a flat list of ids. The layout editor's
  bulk-save call needs to send the new shape.
- For a layout that's already `PUBLISHED`, there is no separate "push
  these edits live" call — calling the same bulk-configuration endpoint
  is enough. The backend decides whether to also write the live `seats`
  table based on the layout's current status; the frontend doesn't need
  to know or care which case it's in.

---
Last reviewed: 2026-08-11.
