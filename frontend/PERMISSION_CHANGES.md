# Permission-gating changes — log for the UI team

Running record of every frontend permission-related change made in this pass.
Not a scratch file — keep this one, it's the handoff doc.

## Background

`usePermissions()` (`can`/`canAny`/`hasRole`) already existed and was correctly
wired to `/auth/me`, but every call site used placeholder permission keys that
didn't match the real backend catalog — every check silently evaluated to
`false` for everyone. That's fixed. This log covers everything since.

## Session 1 — nav-level fixes (done)

- Fixed wrong placeholder keys in: `AppSidebar.tsx`, `BookForSomeone.tsx`,
  `BookFormSomePage.tsx`, `DashboardPage.tsx`, `MyBookingsPage.tsx`.
  (`seat:book_self` → `booking:create_own`, `booking:book_for_employee` →
  `booking:create_for_employee`, `booking:book_for_guest` →
  `booking:create_for_guest`.)
- Added permission gates to Tenant Admin sidebar items that previously had
  none: offices, buildings, floors, layouts, amenities, bookings, users,
  role management, audit logs.
- Corrected `AppPermission`/`AppRole` type hints in `usePermissions.ts`
  (DX only — both already fell back to `string`, not a functional change).

## Session 2 — component-level gating (in progress)

### `users` feature

- **`UsersTable.tsx`** — "Change Role" row menu was always enabled for every
  user regardless of viewer permission or target role. Now disabled with an
  explanatory tooltip when: the viewer lacks `user:change_role` /
  `user:update_status`, OR the target user is `TENANT_ADMIN` (mirrors the
  backend's `PROTECTED_TARGET_ROLE_NAMES` — that target can never be changed
  through this endpoint, for anyone).
- **Real bug found and fixed — `useRoleChange.ts`**: the assignable-role
  dropdown only excluded `PRODUCT_ADMIN`, with a comment explaining that a
  Tenant Admin "can promote any user straight to TENANT_ADMIN" — that was
  written against a teammate's branch change that has since been **reverted**
  on the backend (see backend changelog / conversation history: self-
  escalation and unconditional admin-management were pulled back out).
  `TENANT_ADMIN` is now also excluded, matching the backend's
  `ASSIGNABLE_ROLE_NAMES` exactly. Before this fix, selecting Tenant Admin as
  a target role would always have failed server-side with a confusing error.
- **`ChangeRolePage.tsx`** — added a blocked-state panel for the direct-URL
  case (navigating straight to a Tenant Admin's change-role page, bypassing
  the row menu): shows a clear "can't be changed here" message instead of a
  form that would only fail on submit.

### `offices` feature

- **`OfficeTable.tsx`** — Edit (pencil) button, both mobile and desktop
  layouts, now only renders when the viewer has `office:update`. Previously
  visible and clickable for every Tenant Admin regardless of permission.
- **`offices/page.tsx`** — "Add Office" header button now only renders when
  the viewer has `office:create`.
- **`OfficeForm.tsx`** (the `/admin/offices/addoffice` page) — added a
  blocked-state panel for the direct-URL case (navigating straight to the
  add-office form, bypassing the now-hidden button): shows "You don't have
  permission to add an office" instead of a form that would only fail on
  submit. Edit has no equivalent direct-URL path — it's a modal opened from
  the now-gated table button, not a route, so no separate guard was needed.

### `building` feature (route folder: `admin/building`)

- **`buildingTable.tsx`** — Edit (pencil) button, mobile and desktop, now
  gated on `building:update`.
- **`admin/building/page.tsx`** — "Add Building" header link now gated on
  `building:create`.
- **`AddBuildingForm.tsx`** (`admin/building/add`) — direct-URL guard added,
  same pattern as offices: blocked-state panel instead of a form that would
  only fail on submit.

### `floor` feature (route folder: `admin/floors`)

- **`FloorTable.tsx`** — Edit (pencil) button, mobile and desktop, now gated
  on `floor:update`.
- **`admin/floors/page.tsx`** — "Add Floor" header link now gated on
  `floor:create`.
- **`FloorForm.tsx`** (`admin/floors/add`) — direct-URL guard added, same
  pattern as offices/buildings.

### `amenities` feature

- **`AmenitiesTable.tsx`** — Edit (pencil) button, mobile and desktop, now
  gated on `amenity:update`.
- **`admin/amenities/page.tsx`** — "Add Amenity" header button now gated on
  `amenity:create`.
- **`AmenityForm.tsx`** (`admin/amenities/add`) — direct-URL guard added,
  same pattern as offices/buildings/floors.

### `layouts` feature (route folder: `admin/layouts`, plus `adminlayouts1`/`managelayout`/`managelayout1`)

- **`LayoutTable.tsx`** (the floor-layouts list, 3-dot menu) — "Manage
  Layout" gated on `layout_seat:update`, "Discard" gated on `layout:delete`
  (was already DRAFT-only, now also permission-gated), preview modal's
  "Download SVG" gated on `layout:download`.
- **`FloorLayoutsPage.tsx`** — "Upload New Layout" button gated on
  `layout:create`.
- **`UploadLayoutPage.tsx`** (`admin/layouts/upload`) — direct-URL guard
  added (`layout:create`), same pattern as offices/buildings/floors/amenities.
- **`admin/layouts/manage-layout/page.tsx`** — direct-URL guard added
  (`layout_seat:update`) — this page has no gated entry point of its own
  otherwise (reached from the now-gated "Manage Layout" menu item).
- **`LayoutSidebar.tsx`** (rendered inside `manage-layout`) — "Manage Seats"
  quick-action tile now only rendered when the viewer has
  `layout_seat:update`; "Download file" (SVG) link now gated on
  `layout:download`.
- **`admin/layouts/manage-seats/page.tsx`** — direct-URL guard added
  (`layout_seat:update`) — this is the actual seat-editing screen (individual
  edit panel, bulk edit modal), reachable both from the sidebar quick action
  above and by direct URL, so it needed its own guard independent of that
  link. "Publish Layout" button additionally gated on the separate
  `layout:publish` permission (confirmed backend enforces this as a distinct
  permission from `layout_seat:update` on the publish endpoint —
  `floor_layouts.py`).

### `adminbookings` feature — explicitly skipped this pass

Row actions (Cancel, Modify Seat, Modify Visit) map to booking endpoints
that were explicitly deferred earlier as compound/scope-dependent (see
backend changelog: `bookings.py` create/cancel/modify and all `delegated/*`
routes were left ungranular pending the Scope Resolver work). Permission
keys already exist in the catalog (`booking:cancel_for_employee`,
`booking:cancel_for_guest`, `booking:cancel_any_employee`,
`booking:cancel_any_guest`, `booking:view_any_employee`,
`booking:view_any_guest`) but since the backend doesn't yet enforce this
granularity on these specific endpoints, gating the UI now would show/hide
actions based on permissions the server doesn't actually check — not done
deliberately, needs the backend scope work first.

### Confirmed no changes needed

- **`roles` feature** — read-only (no create/edit/delete UI), nav-level
  `role:view` gate from Session 1 is already sufficient.
- **`audit` feature** — read-only page, no buttons/actions at all beyond the
  nav-level `audit:view` gate from Session 1.
- **`configuration` feature** (`admin/configuration`) — checked and
  deliberately left alone: this whole page runs on hardcoded mock data
  (`INITIAL_CONFIGURATIONS`) with no service/API calls at all — "Save" just
  updates local React state. No `configuration:*` permission exists in the
  backend catalog (confirmed via `Trial_003_seed_permissions.sql`), and its
  sidebar nav entry is already `disabled: true`. Nothing to gate until this
  becomes a real, backend-connected feature.
- **`admin/page.tsx`** — not a real page, just an immediate
  `router.replace("/dashboard")`.

## Status

All Tenant-Admin-level feature folders with real, backend-enforced actions
now have component-level permission gating: `users`, `offices`, `building`,
`floor`, `amenities`, `layouts` (upload / list / manage-layout / manage-seats).
Skipped deliberately: `adminbookings` (needs backend scope work first),
`configuration` (not a real feature yet). Confirmed no-op: `roles`, `audit`.

