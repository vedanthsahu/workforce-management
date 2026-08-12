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

No entries yet.

---

Relevant backend context for whoever picks up the frontend side of the
bulk seat-configuration work: see
[`dev-notes/backend/CHANGELOG.md`](../backend/CHANGELOG.md) (2026-08-11
entries) — the `/layout-seats/bulk-configuration` request contract
changed from one shared config + a flat id list to
`{defaults?, seats: [{layout_seat_mapping_id, ...}]}`, and the same
endpoint now writes straight into `seats` when the target layout is
already `PUBLISHED` (no separate "publish these edits" call needed).
