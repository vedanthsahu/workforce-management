# Atomic Permission Catalog — Derived From the Actual Codebase

**Method:** every permission below was derived by walking the frontend feature
modules (`frontend/src/features/**/services/*.ts` — the actual `axiosInstance`
calls the UI makes), then reading the full backend route + **service-layer**
implementation behind each one (`backend/api/routes/*.py`,
`backend/services/*.py`) to see not just *whether* a call is gated, but *how*
— including checks buried inside the service function instead of the route's
`Depends(...)`. Nothing here is copied from a hypothetical CRUD template.

This revision goes one level deeper than a first pass: instead of stopping at
one `view_all`/`manage` key per resource, each permission is checked against
the **actual scope logic in the code** — is it really "any record," or is it
"any record of this specific person-type," or "records belonging to people
who report to me"? Those turned out to be three genuinely different,
independently-code-enforced scopes, not a hypothetical fragmentation.

Legend for the **Status** column:
- **Keep** — already an atomic, correctly-scoped `permission_key`.
- **Rename** — same capability, key is misnamed or inconsistent with its family.
- **Split** — one key currently gates multiple independent operations or scopes.
- **New** — real, reachable capability with nothing (or the wrong thing) guarding it today.
- **Dead** — key exists in the current `permissions` table but no route or service checks it against anything reachable from the UI.

---

## 0. The scope pattern the code already has, informally, three times over

Before the per-module catalog: the same three-tier authorization shape shows
up independently in three different services, each hand-rolled with its own
role-name check instead of a shared permission. This is the strongest
evidence for how the new atomic permissions should be scoped, because it's
not a design opinion — it's the rule the application already enforces, just
not through `permissions`:

| Tier | Booking (`booking_service._can_book_for_user`) | User profile/bookings (`user_management_service._can_view_user_resource`) | Guest operations (`guest_service._require_guest_operator`) |
|---|---|---|---|
| **Self** | `current_user_id == booking_user.user_id` → always allowed | `current_user_id == target_user.id` → always allowed | n/a — guests aren't users, there's no "self" |
| **My direct reports** | role `MANAGER` **and** `booking_user.manager_user_id == current_user_id` | role `MANAGER` **and** `target_user.manager_user_id == current_user_id` | not modeled — `MANAGER` is absent from `GUEST_OPERATION_ROLES` |
| **Anyone (tenant-wide)** | role in `{TENANT_ADMIN, FACILITATOR}` | role in `{TENANT_ADMIN, FACILITATOR}` | role in `GUEST_OPERATION_ROLES = {TENANT_ADMIN, FACILITATOR, FRONT_OFFICE}` |

Three call sites, three copies of the same `if role == "TENANT_ADMIN" or role
== "FACILITATOR": return True` logic. This is exactly what the
`user → user_groups → group_permissions` model is supposed to replace — but
it means the atomic permissions below need **three scope tiers**
(`_own`, `_for_direct_reports`, `_for_employee`/`_any`), not two, wherever
this pattern applies.

---

## 1. Dashboard

| Permission key | Description | Evidence |
|---|---|---|
| `dashboard:view` | View own persona dashboard (Employee / Facilitator / Front Office landing page) | `GET /dashboard/me` (`dashboard.py`) — no permission gate, any authenticated user; treat as implicit for every base group |
| `admin_dashboard:view` | View the Tenant Admin dashboard (summary cards, recent activity) | `GET /admin/dashboard/summary` — gated `require_any_permission(["admin_dashboard:view"])` |

`GET /dashboard/employee/{user_id}` (view *someone else's* dashboard) exists
in `dashboard.py` and is **completely ungated** — not even the
self/manager/facilitator tiering from §0 is applied here. This is a real gap
worth flagging: today any authenticated employee can view any other
employee's dashboard by ID. Recommend gating it with the same
`dashboard:view_for_direct_reports` / `dashboard:view_any` split used for
bookings below, once groups exist.

`dashboard:view` does **not** need to fork into
`employee_dashboard:view`/`facilitator_dashboard:view` — confirmed the route
itself carries no role branching; the dashboard's *content* differs by role
only because the frontend composes different widgets, not because the API
enforces different views.

---

## 2. Booking — split by scope tier (self / direct reports / employee-any / guest-any)

This is the module where "make the difference for each" matters most,
because the code itself already differentiates **who** the booking is for
(an employee vs. a guest) and **whose** booking it is (mine / my report's /
anyone's) via two entirely separate mechanisms:

- **Employee vs. guest** is a hard data-model split — `bookings.booking_type`
  (`EMPLOYEE`/`GUEST`), confirmed directly in `AdminBookingListQuery.booking_type:
  AdminBookingType` (`schemas/booking.py`) and used as a real `WHERE` filter
  in `get_admin_bookings()` (`booking_service.py:2161`). Employee bookings go
  through `bookings.py`; guest bookings go through a **separate router**,
  `guest_bookings.py` — different endpoints, not just a query filter, for
  create/get/cancel/modify.
- **Own vs. reports vs. any** is the §0 tiering, enforced by
  `_can_book_for_user()`.

| Permission key | Old key | Status | Evidence |
|---|---|---|---|
| `booking:create_own` | `booking:book_self` / `seat:book_self` | Rename | `POST /bookings` with no `booked_for_user_id` (defaults to self) |
| `booking:view_own` | `booking:view_own` | Keep | `GET /bookings/me/{current,future,past,cancelled}` |
| `booking:update_own` | *(none declared)* | New | `POST /bookings/{id}/modify` — reachable from "My Bookings → Modify"; gated only by `_can_book_for_user`'s self-check |
| `booking:cancel_own` | `booking:cancel_own` | Keep (concept only — no declared permission key checks it; enforced by `_can_book_for_user`) | `POST /bookings/{id}/cancel` |
| `booking:create_for_direct_reports` | *(none)* | New | `POST /bookings` with `booked_for_user_id` set to a report — allowed for `MANAGER` **only** when `manager_user_id` matches; this is a distinct, narrower scope from `create_for_employee` below and must not be collapsed into it |
| `booking:view_for_direct_reports` | *(none)* | New | Same tiering applied inside whatever reads `booked_for_user_id` — not currently exposed as its own listing endpoint (see delegated-view caveat below) |
| `booking:update_for_direct_reports` | *(none)* | New | `POST /bookings/{id}/modify` on a report's booking — `MANAGER` tier of `_can_book_for_user` |
| `booking:cancel_for_direct_reports` | *(none)* | New | `POST /bookings/{id}/cancel` on a report's booking — same tier |
| `booking:create_for_employee` | `booking:book_for_employee` | Rename | `POST /bookings` with `booked_for_user_id` set to **any** employee — `TENANT_ADMIN`/`FACILITATOR` tier of `_can_book_for_user`. Old key `booking:book_for_someone` (id 9) is `is_active = false` in the current table — already recognized as superseded by `booking:book_for_employee`/`booking:book_for_guest`, confirming this split direction. |
| `booking:view_for_employee` | *(none)* | New — **not cleanly separable today** | `GET /bookings/delegated/{current,future,past,cancelled}` returns bookings *and* guest visits **combined in one response** (`get_delegated_future_bookings()` etc. in `booking_service.py:1994+` literally does `combined = bookings + guest_visits`). There is no `booking_type` filter on this endpoint (unlike the admin listing). So `view_for_employee` and `view_for_guest` describe two real scopes, but the backend cannot grant one without the other until this endpoint gets a type filter — flag as a backend change needed, not just a permission-catalog entry. |
| `booking:update_for_employee` | *(none)* | New | `POST /bookings/{id}/modify` on any employee's booking — cleanly separable today (different id space than guest bookings) |
| `booking:cancel_for_employee` | *(none)* | New | `POST /bookings/{id}/cancel` on any employee's booking |
| `booking:create_for_guest` | `booking:book_for_guest` | Keep | `POST /guest-bookings`, `POST /guest-visits/{id}/book-seat` — gated `require_permission("booking:book_for_guest")`, and internally re-checked by `_require_guest_operator` (`GUEST_OPERATION_ROLES`, which also includes `FRONT_OFFICE` — a broader set than the booking tier above) |
| `booking:view_for_guest` | *(none)* | New — same combined-endpoint caveat as `view_for_employee` | `GET /bookings/delegated/*` (mixed) or `GET /guest-bookings` (guest-only, but **not currently gated by any declared permission** — only `get_current_user`, no `_require_guest_operator` call either, unlike every other function in `guest_service.py`) |
| `booking:update_for_guest` | *(none)* | New | `POST /guest-bookings/{id}/modify` — gated by `_require_guest_operator` inside `modify_guest_booking()` |
| `booking:cancel_for_guest` | *(none)* | New | `POST /guest-bookings/{id}/cancel` — gated by `_require_guest_operator` inside `cancel_guest_booking()` |
| `booking:view_any_employee` | `booking:view_all` | **Split** | `GET /admin/bookings?bookingType=EMPLOYEE` — gated `require_any_permission(["booking:view_all", "admin_dashboard:view"])`. The `bookingType` query param is a first-class enum (`EMPLOYEE`/`GUEST`/omitted), not a UI-only filter — this is exactly the kind of real data-model distinction that (per §29 of the original brief) *should* be split, unlike "upcoming vs. past." |
| `booking:view_any_guest` | `booking:view_all` | **Split** | Same route, `?bookingType=GUEST` |
| `booking:update_any_employee` | *(none)* | New | Admin Bookings "Modify seat" action (`useAdminBookingActions.ts`) → `POST /bookings/{id}/modify` — same endpoint as the employee/facilitator flow, no admin-specific gate, works today only because `TENANT_ADMIN` already passes every tier |
| `booking:update_any_guest` | *(none)* | New | Same admin action on a guest row → `POST /guest-visits/{id}/workflow` (`MODIFY_VISIT_ONLY`/`MODIFY_VISIT_AND_BOOKING`) or `POST /guest-bookings/{id}/modify` |
| `booking:cancel_any_employee` | `booking:cancel_any` | **Split** | Admin Bookings "Cancel" on an employee row → `POST /bookings/{id}/cancel` |
| `booking:cancel_any_guest` | `booking:cancel_any` | **Split** | Same action on a guest row → `POST /guest-bookings/{id}/cancel` or `/guest-visits/{id}/workflow` (`CANCEL_BOOKING`/`CANCEL_VISIT`) |

**Why split `view/update/cancel_any` by person-type but not by date-range:**
the brief's own example (`booking:upcoming:view` etc.) is a *UI filter* over
one query — no code branches on it. `booking_type` is different: it selects
between two different repository queries
(`fetch_admin_bookings` vs. the guest-visit merge) and, for
update/cancel, between two different **routers**
(`bookings.py` vs. `guest_bookings.py`/`guest_visits.py`). That's a structural
split in the code, not a cosmetic one — the same bar the brief used to justify
splitting `booking:book_for_employee` from `booking:book_for_guest` in the
first place.

`booking:eligibility_check` (`POST /bookings/eligibility`) stays folded into
`booking:create_own`/`create_for_*` — it's a read-only pre-check inside the
booking wizards, not an independent capability (§29).

---

## 3. Guest (profile) — correction from the first pass

The first pass said guest-profile routes had "no authorization at all."
That's only true at the **route** layer. Reading `guest_service.py` in full
shows every single function — `create_guest_profile`, `get_guest_profile`,
`search_guest_profiles`, `update_guest_profile`, `update_guest_status`,
`get_guest_visit_history`, and every guest-visit/guest-booking function —
opens with `_require_guest_operator(current_user)`, which checks
`role in GUEST_OPERATION_ROLES = {TENANT_ADMIN, FACILITATOR, FRONT_OFFICE}`.
So it *is* authorized — just via one undifferentiated hardcoded role check
reused ~15 times, not via `permissions`, and not scoped by operation.

That role check being **one flat set for every operation** is itself the
finding worth acting on: today `FRONT_OFFICE` can create, edit, and
deactivate guest *profiles* through the API — identical rights to
`FACILITATOR` — even though the Front Office nav only exposes check-in/
check-out. Splitting the permission keys (below) is what makes it possible to
give Front Office `guest_visit:check_in`/`check_out` **without** also handing
them `guest:create`/`guest:update`/`guest:terminate`, which the current
single role-set check cannot express.

| Permission key | Status | Evidence |
|---|---|---|
| `guest:view` | Split (out of the flat `GUEST_OPERATION_ROLES` check) | `GET /guests`, `GET /guests/{id}`, `GET /guests/{id}/visits` |
| `guest:create` | Split | `POST /guests` |
| `guest:update` | Split | `PATCH /guests/{id}` |
| `guest:terminate` | Split | `PATCH /guests/{id}/status` → `{status: ACTIVE\|INACTIVE, cancel_future_bookings}`. Confirmed non-destructive: deactivates the record and optionally cascades to `cancel_future_guest_bookings_for_guest` + `cancel_future_guest_visits_for_guest` — never a SQL delete. |

No scope tiering applies here (no "my guests" concept — `created_by_user_id`
is stored but never filtered on in any query) — `guest:*` is inherently a
tenant-wide capability, correctly un-split by owner.

---

## 4. Guest Visit

| Permission key | Old key | Status | Evidence |
|---|---|---|---|
| `guest_visit:create` | *(none)* | New | `POST /guest-visits` — gated only by `_require_guest_operator` |
| `guest_visit:view` | `guest:view_visits` | Rename | `GET /guest-visits`, `GET /guest-visits/{id}` — gated `require_permission("guest:view_visits")` at the route (the one guest-visit route that *is* permission-gated declaratively, not just role-checked). No "own visits" scope exists — `list_guest_visits()` never filters by `host_user_id`, confirmed by reading the full function; it's tenant-wide by design regardless of who's asking, filtered only by `visit_scope`/`site_id`/`status`/`search`. |
| `guest_visit:update` | `guest:manage` | Split | `PATCH /guest-visits/{id}` |
| `guest_visit:cancel` | `guest:manage` | Split | `POST /guest-visits/{id}/cancel` |
| `guest_visit:workflow` | `guest:manage` | Split (kept as one key, implies both `update` and `cancel`) | `POST /guest-visits/{id}/workflow` — composite action used by both the employee "My Bookings" dialogs and the Admin Bookings table |
| `guest_visit:check_in` | `guest:check_in` | Rename | `POST /guest-visits/{id}/check-in` |
| `guest_visit:check_out` | `guest:check_out` | Rename | `POST /guest-visits/{id}/check-out` |
| `guest_visit:invite` | `guest:invite_only` | **Not yet implemented** | Frontend `security.service.ts` calls `POST /security/visitors/invite`; no such backend route exists anywhere in `backend/api/routes/`. Nav item is `disabled: true`. Reserve the key, don't assign it to any group yet. |

---

## 5. Seat / Layout-Seat Configuration

The old table's `seat:create` / `seat:update` / `seat:delete` / `seat:block`
/ `seat:view_all` (ids 2–6, 24) are all currently **dead** — no route or
service function checks any of them:

| Old key | Status | Reality in the code |
|---|---|---|
| `seat:view_all` | Dead | `GET /floors/{id}/seats` (availability search) is open to any authenticated user — needed by the booking flow itself. No route reads this key. |
| `seat:create` | Dead | Seat rows are created as a **side effect** of `POST /admin/floor-layouts` (`bulk_insert_layout_seat_mappings()` inside `create_floor_layout()`, `floor_layout_service.py:164`) — gated by `layout:create` (the layout, not the seat), never by a `seat:*` key. There is no standalone "create a seat" endpoint. |
| `seat:update` | Dead → superseded | The real seat-mutation endpoint is `PATCH /seats/{id}/configuration` / `PATCH /seats/bulk-configuration`, gated `require_any_permission(["location:manage", "layout:upload"])`. Map this to **`layout_seat:update`**, not `seat:update` — it sets label/capacity/**`amenity_ids`** for a seat inside a specific floor layout, which is a layout-scoped operation, not a standalone seat entity edit. |
| `seat:delete`, `seat:block` | Dead | No route anywhere deletes or blocks a seat. Admin nav marks "Seats" and "Seat Status" `disabled: true`. Don't resurrect these until the feature ships. |

Recommendation: retire `seat:create/update/delete/block/view_all` from the
active catalog (mark `is_active = false`, same treatment already given to
`booking:book_for_someone`) rather than porting them into `group_permissions`
— porting a permission that gates nothing just adds noise to every group
picker. Keep `layout_seat:update` as the one real seat-mutation permission.

---

## 6. Office (Site) / Building / Floor

The old table already shows one inconsistency worth preserving as a signal:
`floor:view` (id 23) exists as its own row, but there is **no**
`site:view`/`office:view` or `building:view` row — floor got a dedicated view
permission historically and the other two levels of the hierarchy didn't.
Confirmed against the actual routes: **none of the three levels' `GET`
routes are gated by anything** (`GET /sites`, `GET /buildings`, `GET
/buildings/{id}/floors`, `GET /offices/{id}/floors` — all just
`get_current_user`), so `floor:view` in the old table was already dead too,
just like the `seat:*` keys above.

| Permission key | Old key | Status | Evidence |
|---|---|---|---|
| `office:view` | *(none)* | Keep as concept, unenforced | `GET /sites`, `GET /sites/{id}` |
| `office:create` | `location:manage` | Split | `POST /sites` |
| `office:update` | `location:manage` | Split | `PATCH /sites/{id}` |
| `building:view` | *(none)* | Keep as concept, unenforced | `GET /buildings` |
| `building:create` | `location:manage` | Split | `POST /buildings` |
| `building:update` | `location:manage` | Split | `PATCH /buildings/{id}` |
| `floor:view` | `floor:view` | Dead (exists in DB, checked nowhere) | `GET /buildings/{id}/floors`, `GET /offices/{id}/floors` |
| `floor:create` | `location:manage` / `floor:manage` | Split | `POST /floors` |
| `floor:update` | `location:manage` / `floor:manage` | Split | `PATCH /floors/{id}` |

No delete route exists for sites, buildings, or floors — confirmed no delete
button in `offices`/`building`/`floor` frontend features either. Don't add
`*:delete`.

---

## 7. Floor Layout

| Permission key | Old key | Status | Evidence |
|---|---|---|---|
| `layout:create` | `layout:upload` | Rename | `POST /admin/floor-layouts` (multipart upload — this also creates the seat rows, see §5) |
| `layout:view` | `layout:upload` | **Split (bug)** | `GET /admin/floor-layouts/floors/{floor_id}`, `GET /admin/floor-layouts/{id}/seats` — both currently piggyback on the *upload* permission for a pure read |
| `layout:publish` | `layout:publish` | Keep | `POST /admin/floor-layouts/{id}/activate` |
| `layout:delete` | `layout:publish` | **Split (bug)** | `DELETE /admin/floor-layouts/{id}` — soft-delete (`soft_delete_floor_layout`, status → `DELETED`); `PUBLISHED` layouts are protected from delete at the service layer (`delete_floor_layout()` raises 409). Currently gated by `layout:publish`, bundling publish and delete under one key despite very different blast radius. |

`layout:unpublish` doesn't exist as an operation — retiring a live layout is
done by deleting it (blocked while `PUBLISHED`), not a separate unpublish
call. Don't invent it.

---

## 8. Amenities

| Permission key | Old key | Status | Evidence |
|---|---|---|---|
| `amenity:view` | *(none)* | Keep as concept, unenforced | `GET /amenities`, `GET /amenities/{id}` |
| `amenity:create` | `amenities:manage` | Split | `POST /amenities` — gated `require_any_permission(["amenities:manage", "location:manage"])` |
| `amenity:update` | `amenities:manage` | Split | `PATCH /amenities/{id}` |
| `amenity_category:view` | *(none)* | Keep as concept, unenforced | `GET /amenity-categories`, `GET /amenity-categories/{id}` |
| `amenity_category:create` | `amenities:manage` | Split | `POST /amenity-categories` |
| `amenity_category:update` | `amenities:manage` | Split | `PATCH /amenity-categories/{id}` |

No delete route for either resource. `seat_amenity:assign`/`remove` is
**not** a separate operation — amenity IDs travel as a field inside the
`layout_seat:update` payload (`amenity_ids` in
`managelayout1/services/seatService.ts`), confirmed by reading the seat
configuration schema — don't split it out.

---

## 9. Teams / Teammates — split by what the response actually contains

The old table already anticipated this split three ways
(`team:view`, `team:booking_view`, `team:occupancy_view`, plus a fourth
`teammate:view`) but **none of the four are checked anywhere in the code
today** — `teams.py`'s two routes use only `get_current_user`. Reading
`team_service.get_my_team_overview()` end-to-end shows it returns, in one
response, three genuinely different pieces of information the old table's
naming already separated:

1. **Roster** — `team_name`, `total_members`, each member's `user_id`/`full_name`/`email` → `team:view`
2. **Today's booking flag** — `has_booking_today` per member → folded into occupancy below, not its own key (it's one boolean on the same row, not a separate query — `team:booking_view` would duplicate `team:occupancy_view`)
3. **Seat/occupancy detail** — `seat_id`/`seat_code`/`floor_name`/`building_name`/`amenities` when `has_booking_today` is true → `team:occupancy_view`

| Permission key | Old key | Status | Evidence |
|---|---|---|---|
| `team:view` | `team:view` | Split out (currently dead — bundled, unchecked) | `GET /teams/me` — roster + counts portion |
| `team:occupancy_view` | `team:occupancy_view` | Split out (currently dead) | Same route — `seat`/`has_booking_today` portion of each member row |
| ~~`team:booking_view`~~ | `team:booking_view` | **Drop — duplicate** | `has_booking_today` is one field on the same row `team:occupancy_view` already covers; a separate permission can't actually gate less than `team:occupancy_view` does without the backend splitting the query, which nothing requires |
| `teammate:view` | `teammate:view` | Keep, but scoped differently | `GET /teams/members/search` — **not** the same data as `GET /teams/me`; explicitly "search within the caller's own team(s) only, same contract as `GET /users`" per the code comment. This is a lightweight directory search, not roster/occupancy — keep it as its own key (it already gates the `find` nav item correctly) rather than merging into `team:view`. |

No team create/update/delete exists (`teams.py` has exactly the two `GET`
routes) — don't add them.

---

## 10. Users (Admin) — the same three-tier pattern as booking

`GET /users/{user_id}` and `GET /users/{user_id}/bookings` both call
`_can_view_user_resource()` (`user_management_service.py:74`), which is the
**identical self / direct-reports / facilitator-or-admin tiering** described
in §0 — this was mischaracterized as "completely ungated" in the first pass;
it's role-tiered in the service layer, same pattern as bookings.

| Permission key | Old key | Status | Evidence |
|---|---|---|---|
| `user:view` | `users:view` + `user:view` (duplicate rows) | Rename/dedupe | `GET /admin/users` — directory list/search, gated `require_any_permission(["admin_dashboard:view", "users:view", "user:view", "teammate:view"])`. The old table has two rows (`users:view` id 20, `user:view` id 25) granting the exact same route — pure duplication. |
| `user:view_own_details` | *(none)* | New (self-serve, low value as a real permission) | `GET /users/{id}` where `id == self` — always allowed, don't gate |
| `user:view_for_direct_reports` | *(none)* | New | `GET /users/{id}`, `GET /users/{id}/bookings` where target's `manager_user_id == current_user_id` and caller role is `MANAGER` |
| `user:view_any` | *(folded into `users:view`/`user:view`/`teammate:view` at the route)* | Split out | `GET /users/{id}`, `GET /users/{id}/bookings` for any user — `TENANT_ADMIN`/`FACILITATOR` tier |
| `user:change_role` | `user:manage` | Split | `PATCH /admin/users/{id}/access` |
| `user:update_status` | `user:manage` | Split (see note) | Same endpoint. `ChangeRolePanel.tsx` bundles role **and** active/inactive status into one `UpdateUserAccessPayload{role_name, status}` save — a real product decision to revisit, not just a naming split: today these two capabilities cannot be authorized independently because one PATCH does both. Until the endpoint splits, treat the two permissions as required together (AND). |
| `user:profile_update_own` | *(none)* | New (self-serve, implicit) | `PATCH /users/me` — no gate, any authenticated user editing their own profile; don't make this a real checkable permission, same reasoning as `dashboard:view` |

**Business rule to carry into the group model, not just note:**
`user_management_service.py` defines `PROTECTED_TARGET_ROLE_NAMES =
{TENANT_ADMIN, PRODUCT_ADMIN}` — a target user holding either role **cannot**
have their role or status changed via `admin_update_user_access`, regardless
of who the caller is. This stops a `TENANT_ADMIN` from silently demoting or
deactivating another admin (or themselves). This safeguard has no equivalent
in a pure `user:change_role` permission grant — it must be preserved as
application logic (a check against the *target's* role) independent of
whatever group/permission the *caller* holds, or a compromised/malicious
Tenant Admin account could strip every other admin's access.

Also from the same file: `ASSIGNABLE_ROLE_NAMES = {EMPLOYEE, MANAGER,
FACILITATOR, FRONT_OFFICE}` — confirms **`MANAGER` is a real, currently
assignable role** via this exact screen, not a hypothetical. Separately,
`ADMIN_DIRECTORY_ROLES` includes a fifth value, `FACILITATOR_GUEST_COORDINATOR`
(also present in the frontend's `RoleKey` union in `roles.types.ts`) — it's
listed as a valid directory/filter role but is **absent** from
`ASSIGNABLE_ROLE_NAMES`, `GRAPH_MANAGED_ROLES`, and `ADMIN_ROLE_NAMES`. It
reads as a legacy or half-built role with no path to actually be assigned
today — confirm with the backend owner whether it should be retired or wired
up before deciding whether it gets a base group.

`user:create` / `user:delete` still don't exist —
`usersService.createUser()` explicitly throws `"Create user endpoint not
available yet."` Don't add the permission ahead of the endpoint.
`user:search` (`GET /users`, the typeahead used by Book-for-Someone/Find
Teammate/guest-visit host lookup) stays un-permissioned — it's ambient
directory lookup available to any authenticated user, not an admin capability
(§29 — don't split search out of view for a resource that was never
view-gated to begin with).

---

## 11. Roles / Groups (Admin)

Unchanged from the first pass — confirmed again while re-reading
`user_management.py` in full: there is still no `/admin/roles` route of any
kind. `rolesService.createRole()` → `POST /admin/roles` remains dead
frontend code. `role:view` still rides entirely on `GET /admin/users`'s
gate (`rolesService.getRoles()` literally delegates to
`usersService.getUsers()`). All `group:*`/`role:assign_group`/etc.
permissions are net-new — there's nothing to migrate them from.

---

## 12. Front Office (Security Desk)

| Front Office nav item | Permission(s) needed | Built? |
|---|---|---|
| Dashboard | `dashboard:view` | Yes |
| Today's Visitors / Checked-in / Visitor Search / Past Visits | `guest_visit:view` | **No** — `disabled: true` |
| Check-in / Check-out | `guest_visit:check_in`, `guest_visit:check_out` | Yes |
| Invite Guest | `guest_visit:invite` | **No** — nav disabled, backend route missing |

Per §3's finding: today's `GUEST_OPERATION_ROLES` role check also silently
grants Front Office `guest:create`/`guest:update`/`guest:terminate` even
though no Front Office UI surface exercises them — worth confirming whether
that's intentional (a receptionist correcting a guest's phone number) or
incidental (nobody scoped it down because it was a role check, not a
permission).

---

## 13. Reporting / Audit

| Permission key | Old key | Status | Evidence |
|---|---|---|---|
| `occupancy:view` | `occupancy:view` | Keep | `GET /admin/occupancy/date-range`, `GET /admin/occupancy/hierarchy` — gated `require_any_permission(["admin_dashboard:view", "occupancy:view"])`. No employee/guest split applies here — occupancy is about seats/space, not person-type. |
| `audit:view` | `audit:view` (id 21 — exists in the table but unused) | Split out of `admin_dashboard:view` | `GET /admin/activities` — today gated only by `admin_dashboard:view`. `_build_activity_item()`/`_build_activity_person()` (`admin_dashboard_service.py:357+`) return one unified feed mixing booking and guest-visit events in the same row shape (`guest_visit_id`, `guest_type` are just optional fields on a common row) — this is a single audit stream by design, not two resources, so **don't** further split `audit:view` into employee/guest variants the way booking was split. |

No export exists anywhere in `admin.service.ts` or the occupancy/activities
services — don't add `occupancy:export`/`audit:export`.

---

## 14. Feature-Level UI Audit (walking actual screenshots role by role)

The catalog above was built bottom-up from API calls. This pass goes
top-down: every visible element on the real Employee, Facilitator, Front
Office, and Admin dashboards, checked off against the catalog, using
`usePermissions()` call sites in the components themselves as ground truth
for what's actually gating what today.

### Employee / Facilitator Dashboard
`Book Now` → `booking:create_own`. `Modify`/`Cancel` on Upcoming Bookings →
`booking:update_own`/`cancel_own`. `Team Present` card, "1 teammate in
office" → `team:occupancy_view`. `Office Visits` / `#4 team rank` → derived
fields on `GET /dashboard/me`, part of `dashboard:view`, not separate
permissions. Date strip and filter chips are pure navigation.

**"Quick book" on the Favourite Seat card — the example given.** Traced
`FavouriteSeatCard.tsx` → `FavSeatBookingDialog.tsx` → `dashboard_service.py`.
The favourite seat itself is **read-only and derived**
(`fetch_favorite_seat()` — computed from booking history, no write/"star"
endpoint anywhere in the backend, despite the empty-state copy "Star a seat
when booking to save it here" implying a user action). "Quick book" itself
does an eligibility check (`POST /bookings/eligibility`) then falls straight
into the normal `POST /bookings` create flow. In code, the whole button is
gated by one boolean prop: `canBookSelf` — which is `can("booking:create_own")`
one level up in `DashboardPage.tsx`. **No new permission** — it was already
covered, it just wasn't named as a distinct feature in the first pass. This
is the right way to read "feature-level": name the UI affordance, then
confirm which permission key it actually resolves to, even when (as here)
the answer is "the one you already have."

### Book for Someone (Facilitator/Admin)
Confirmed directly in `BookFormSomePage.tsx`:
```
const canBookEmployee = can("booking:book_for_employee");
const canBookGuest = can("booking:book_for_guest");
const showTypeSelector = canBookEmployee && canBookGuest;
```
The "Internal Employee" vs "Visitor/Guest" radio **only renders when the
user holds both permissions**; with only one, the page auto-selects that
type and never shows the toggle. This is exact, code-level confirmation that
`create_for_employee`/`create_for_guest` is the right split — but it also
surfaces a **frontend gap the backend-only pass couldn't see**: this string
literal check, and the nav item's `anyPermission: ["booking:book_for_employee",
"booking:book_for_guest"]` in `AppSidebar.tsx`, are the *only* things gating
this entire page. Neither location currently checks (or has any way to
check) `booking:create_for_direct_reports`. So even after the backend grows
a `MANAGER_BASE` group with direct-reports booking rights, **a Manager still
can't reach this page or use this flow today** — the frontend gates need
`booking:create_for_direct_reports` added to both the nav's `anyPermission`
list and `showTypeSelector`'s logic (a Manager should default straight to
"internal", never see "visitor/guest", since guest booking isn't in
`GUEST_OPERATION_ROLES` for `MANAGER`). This is a concrete example of the
"rework" cost: the permission split isn't just a backend migration, every
frontend `can()`/`canAny()` call site keyed to the old permission strings has
to be updated in lockstep, or the UI silently stays on the old, coarser
grant.

### My Bookings (Facilitator)
`Upcoming`/`Completed`/`Team Today`/`Delegated` stat cards and the
`My Bookings`/`Booked For Someone` tabs are all already-covered
`view_own`/`view_for_employee`/`view_for_guest` reads — no new permission.
The `All`/`Confirmed`/`Modified`/`Pending` chips and the search box are
client-side filters over one already-permitted query, correctly left
un-split per the brief's own "don't fragment on UI filters" guidance.

### Front Office Dashboard
The office selector (`Atlanta Office`) is a plain `GET /sites` picker with
no per-user site assignment anywhere in the schema — it's a display filter
on `guest_visit:view`'s `site_id` query param, not a scope boundary. Every
stat card (`Expected Today`, `Checked In`, `Overdue Checkout`, `Cancelled /
No Show`) and its `View all` link reads from the same `guest_visit:view`
capability, filtered by `visit_status`. Table row actions are
`guest_visit:check_in`/`check_out`. Nothing new; every nav item besides
Dashboard is still `disabled: true` in this build, matching §12.

### Admin Dashboard
This screen is the one place that proves `occupancy:view` and `audit:view`
are **already live capabilities today**, not speculative future ones — the
Occupancy Trend chart, Top Offices by Occupancy, and Recent Activities table
are rendered right now on this page (`admin.service.ts` calls
`/admin/occupancy/date-range`, `/admin/occupancy/hierarchy`, and
`/admin/activities` in parallel with `/admin/dashboard/summary`), even
though the *standalone* nav pages for Occupancy/Utilization/Audit Logs are
still `disabled: true`. That has a real consequence for the permission
split: `/admin/occupancy/*` already accepts `admin_dashboard:view` **or**
`occupancy:view` (`require_any_permission`), so a future group holding only
`occupancy:view` can see that widget today without code changes. `/admin/
activities` currently accepts **only** `admin_dashboard:view` — splitting
`audit:view` out as its own group permission (as recommended in §13) is not
enough on its own; the route needs the same `require_any_permission(["admin_
dashboard:view", "audit:view"])` pattern occupancy already has, or a group
with `audit:view` but not full `admin_dashboard:view` will 403 on a widget
the catalog says they should see.

The `Blocked` stat card (reads 0 here) is a direct, visible confirmation of
§5's finding: there is no `seat:block` action anywhere — "blocked" is a
count derived from seats where `SeatConfigurationUpdateRequest.status`/
`is_bookable` was set via `layout_seat:update`. The stat card is proof this
field is real and used, not proof a separate block permission is needed.

`Recent Activities`' `Type` column (seen showing `Self` for every row in
this tenant's current data) is a **display column on one unified feed**, not
a second endpoint — consistent with §13's decision not to split `audit:view`
by person-type the way booking was split. Every other Admin sidebar item
(`Offices`, `Buildings`, `Floors`, `Floor Layouts`, `Amenities`, `Bookings`,
`Book for someone`, `Users`, `Role Management`) maps to permissions already
in the catalog; `Seats`, `Seat Status`, `Notifications`, `Occupancy` (nav
page), `Utilization`, `Audit Logs` (nav page), `Settings` are all still
`disabled: true`.

---

## 15. UI Permission Layer — corrected model (superseding an earlier, too-narrow pass)

**Correction:** an earlier version of this section treated the UI layer as
"dashboard widgets get their own permission." That was too narrow. The actual
requirement is broader and more mechanical: **every independently
controllable/renderable UI feature gets its own permission** — nav items,
tabs, sub-tabs, entry points, shortcuts, floating actions, panels, tables,
create/edit/action buttons — not just dashboard cards. And critically, this
layer lives in **its own namespace** (`ui:*`), separate from the operation
permissions catalogued in §1–14, connected only through an explicit mapping
table. Full detail (131 UI permissions, the mapping table, and the gap
analysis) is in a dedicated workbook: **[UI-Permission-Layer-Catalog.xlsx](UI-Permission-Layer-Catalog.xlsx)**.
What follows here is the model and the highlights.

### The two layers, and why they're separate tables/namespaces

```
User → Groups → UI Permissions (ui:*) → UI/Backend Mapping → Backend Permissions → API
```

- **UI permissions** (`ui:<screen>:<feature>`) control whether a component
  renders. Checked only by the frontend (`can("ui:dashboard:quick_book")`).
  Extremely granular by design — several can map to the identical backend
  permission, and that's expected, not a naming collision to clean up.
- **Backend permissions** (`booking:create_own`, etc. — everything in §1–14)
  control actual authorization, checked by the API. They must never depend
  on *which* UI feature a request claims to have come from — the backend
  cannot trust a client-supplied "I'm the Quick Book button," that's
  spoofable and adds no real security (this was the conclusion from the
  earlier "should the backend mirror the UI split" discussion — it still
  holds, and this layer is built to respect it).
- The two are joined **only** by an explicit `ui_backend_permission_map`
  (`ui_permission_id → backend_permission_id`, many-to-one or many-to-many).
  An admin building a group picks UI features by name ("Quick Book",
  "Favourite Seat card," "Book Now floating action") without needing to know
  which backend permissions those imply — the system derives the backend set
  from the mapping table.

### The example this model is built from

Five different UI entry points all ultimately call `POST /bookings` with no
`booked_for_user_id` (i.e. `booking:create_own`) — and each is its own `ui:`
permission, not one shared one, because each can plausibly be shown to one
group and hidden from another independent of the others:

| UI permission | Where |
|---|---|
| `ui:nav:book_a_seat` | Sidebar nav item |
| `ui:dashboard:banner_book_now` | "Book Now" button in the dashboard's greeting banner |
| `ui:dashboard:quick_book` | "Quick book →" shortcut inside the Favourite Seat card |
| `ui:mybookings:action_new_booking` | "New Booking" button on the My Bookings page header |
| `ui:book:wizard` | The booking wizard itself (kept as one feature — its 3 steps are sequential and not independently reachable, see the exclusion rule below) |

All five map to `booking:create_own` in the mapping table. None of them are
merged, even though they share a backend permission, a service, and a page —
per the requirement, sharing an API is not a reason to collapse UI
permissions.

### Exclusion rule (stated explicitly, so it's checkable)

Pure navigation/display *mechanics* of an already-permissioned view —
pagination, column-sort toggles, search boxes, date-range pickers, zoom/pan/
fit-to-view controls on the floor-map viewer, status-filter chips — are
**not** separate `ui:` permissions. They don't unlock different data or a
different capability, they're how you operate a view you already have. A
sequential wizard step is one feature, not N, because you can't reach step 2
without step 1 (not independently controllable). This line is a judgment
call in every case it's applied — flagged here so it can be challenged, not
asserted quietly.

### What the full pass found (131 `ui:*` permissions total)

The workbook's four sheets map directly onto what was asked for:

- **A/B — full catalog + mapping:** every screen from Global Nav through
  Admin Bookings, Users, and Role Management, each UI feature with its key,
  component, screen, description, and backend mapping. Nav items are
  modeled as their own UI permissions, separate from the in-page entry
  points and shortcuts that lead to the same screen (e.g. `ui:nav:
  admin_bookings` vs. `ui:adminbookings:action_book_for_someone_entry`, a
  second, independent entry point into the booking-for-someone wizard from
  inside the Admin Bookings page header).
- **C — UI with no real backend capability behind it:** the biggest one —
  `booking:create_own`/`update_own`/`cancel_own` (all 9 UI entry points
  built on them) are frontend gates sitting on top of a **backend no-op**:
  `_can_book_for_user()`'s self-branch is unconditional, so no
  `permission_key` is actually checked server-side for a self-booking today.
  Same for `guest:create/update/view` — `guests.py` has no
  `require_permission` at all, only the flat `_require_guest_operator` role
  check. Plus every disabled/"coming soon" nav item, the two dead
  Admin-Bookings header buttons (`Export`, `…`), and `ui:roles:
  action_add_role` (no UI trigger *and* no backend route — doubly dead).
- **D — backend capability with no UI at all:** the standout finding —
  **`layout:publish` has no button anywhere in the codebase.** Every
  component that touches a `Layout` object was read (`LayoutSidebar`,
  `ManageLayoutHeader`, `LayoutPreview`, `LayoutTable`, the manage-layout
  page assembly) — none of them call `POST /admin/floor-layouts/{id}/activate`.
  A layout can be uploaded and fully configured but never actually published
  through the UI as it exists today. Also: `amenity_category:create/update`
  (no "manage categories" screen, only a dropdown of existing ones), and the
  entire `MANAGER`/direct-reports scope from §0/§2 (confirmed again from the
  UI side — nothing references it).
- **E — dependency conflicts:** `ui:mybookings:tab_booked_for_someone` maps
  to `booking:view_for_employee` OR `booking:view_for_guest`, but
  `GET /bookings/delegated/*` returns both mixed with no type filter — a
  group holding only one of the two backend permissions cannot actually get
  an employee-only or guest-only version of that tab until the endpoint
  gains a filter (same finding as §2's Finding 3, now traced to its exact UI
  consequence). Also: `ui:dashboard:quick_book` depends on `ui:dashboard:
  card_favourite_seat` being enabled too — a UI-permission-to-UI-permission
  dependency, not just a UI-to-backend one, since Quick Book physically
  renders inside that card's component tree.
- **F — same backend op, deliberately separate UI permissions:** seven
  documented groups on the dedicated sheet, including the `booking:
  create_own` example above, the four Front-Office visitor stat cards (all
  reading `guest_visit:view`), and the six Admin-Bookings page elements
  (all reading `booking:view_any_employee/guest`) — each independently
  worth being able to show or hide.
- **G — currently bundled, should split once the backend allows it:**
  `ui:users:action_change_role` maps to **both** `user:change_role` and
  `user:update_status`, because `ChangeRolePanel.tsx` is one form with one
  Save button covering both (mirroring the single `PATCH /admin/users/{id}/
  access` endpoint from §10). Splitting the backend permission is necessary
  but not sufficient here — the panel itself needs to become two
  independently-rendered controls before a group could actually grant one
  without the other. The sheet also includes a **control case** — the
  Admin-Bookings row menu's Modify/Cancel × Employee/Guest actions — showing
  what "already correctly atomic, no further split needed" looks like, so
  the G-list isn't mistaken for "everything needs splitting."

### Base groups

Same principle as before, restated for the corrected model: because nothing
hides per-`ui:`-permission today, every base group in §10 implicitly holds
every `Live`-status UI permission for the screens that role already reaches.
The payoff is the same custom-group scenario, now expressible precisely: a
`FACILITATOR_LITE` group with `ui:nav:book_a_seat` and `ui:mybookings:
tab_my_bookings` but *not* `ui:dashboard:quick_book` — two Facilitators, same
role, different dashboard — composed entirely through group membership, with
zero backend code change, because the backend was never told which UI
feature made the call in the first place.

---

## 16. Full Component Pass — every feature folder, button by button

Following up on §14/§15, this pass read every component in every feature
folder (`offices`, `building`, `floor`, `adminlayouts1`, `managelayout`,
`managelayout1`, `uploadlayouts`, `amenities`, `adminbookings`, `admin`,
`users`, `roles`, `security`, `dashboard`, `book`, `bookforsomeone`,
`bookings`, `findteammate`, `userProfile`) — not just the screens already
sampled — specifically hunting for any clickable element that doesn't
already resolve to a cataloged permission. Two real ones came out of it
(`layout:download`, `layout_seat:bulk_update`, both added to §15) and one
dead button (`booking:export`, noted above). Everything else confirmed the
existing catalog exactly:

- **Offices/Buildings/Floors/Amenities admin CRUD**: every one of these follows
  the identical shape — a create page ("Save Office"/"Save Building"/"Save
  Floor"/"Save Amenity") and a pencil-icon edit modal ("Save Changes") with
  `status` (Active/Inactive) as one field inside that same modal, not a
  separate action. No delete anywhere. Confirms `office/building/floor/
  amenity:create` + `:update` exactly, nothing more granular needed.
- **`LayoutTable.tsx`'s row menu** ("View Layout" / "Manage Layout" /
  "Discard", DRAFT-only): confirms `layout:view`, the navigation gateway into
  `layout_seat:update`, and `layout:delete` precisely as cataloged in §7.
- **`AdminBookingsPage.tsx`'s row menu** (View Details / Modify Booking /
  Modify Visit / Cancel Booking / Cancel Visit, split by Employee vs. Guest):
  confirms the `booking:{view,update,cancel}_any_{employee,guest}` split from
  §2 at the exact UI level it was derived from.
- **`UsersTable.tsx`**: the "View" action is a disabled placeholder ("coming
  soon") — matches `user:view_own_details`/`view_any` not having a dedicated
  detail screen yet. "Change Role" is disabled with the tooltip *"Admin role
  not able to change"* for any `TENANT_ADMIN` row — this is the UI-visible
  face of `PROTECTED_TARGET_ROLE_NAMES` from §10, confirmed independently
  from the frontend side.
- **`ProfilePage.tsx`** (avatar upload, bio/skills edit, preference edit,
  booking history modal): all self-service, all already `PATCH /users/me` or
  `POST /preferences/me` under the hood — no new permission, consistent with
  `user:profile_update_own` being implicit/ungated by design.
- **`FindTeammatePage.tsx`**, **`AdminCharts.tsx`** (Today's Overview /
  Occupancy Trend / Top Offices): both confirm existing keys
  (`teammate:view`, `occupancy:widget_*`) exactly, no gaps.

---

## Migration Mapping (old catalog → new atomic catalog)

```
guest:manage
    → guest_visit:update
    → guest_visit:cancel
    (guest_visit:workflow implies both; NOT guest:create/update/terminate —
     those routes never checked this key, they were only ever reachable
     through the flat _require_guest_operator role check)

guest:view_visits    → guest_visit:view
guest:check_in         → guest_visit:check_in
guest:check_out        → guest_visit:check_out
guest:invite_only      → guest_visit:invite            (reserve only — route missing)

booking:book_self       → booking:create_own
seat:book_self            → booking:create_own          (duplicate of the above)
booking:book_for_someone  → superseded (already is_active=false in the DB) by
                             booking:create_for_employee + booking:create_for_guest
booking:book_for_employee → booking:create_for_employee   + booking:create_for_direct_reports
booking:book_for_guest     → booking:create_for_guest
booking:view_all            → booking:view_any_employee + booking:view_any_guest
booking:cancel_any            → booking:cancel_any_employee + booking:cancel_any_guest

seat:view_all, seat:create, seat:update, seat:delete, seat:block
    → DROP (all dead; seat mutation is layout_seat:update, seat creation is a
       side effect of layout:create — no standalone seat:* operation exists)

floor:view    → DROP (dead — no route checks it) or repurpose as the real
                 floor:view once GET /buildings/{id}/floors is actually gated
floor:manage    → floor:create, floor:update
location:manage   → office:create, office:update, building:create,
                     building:update, floor:create, floor:update,
                     layout_seat:update

layout:upload    → layout:create   (upload route)
                  → layout:view      (list/seats routes — was mis-gated under upload)
layout:publish     → layout:publish  (activate route)
                    → layout:delete    (delete route — was mis-gated under publish)

amenities:manage    → amenity:create, amenity:update,
                       amenity_category:create, amenity_category:update

team:view, team:booking_view, team:occupancy_view, teammate:view
    → team:view + team:occupancy_view (team:booking_view dropped as a
       duplicate of occupancy_view's has_booking_today field) + teammate:view
       kept separate (different endpoint, different data: directory search
       vs. roster/occupancy)

users:view + user:view (duplicate rows) → user:view
user:manage                                → user:change_role + user:update_status (AND,
                                               until PATCH /admin/users/{id}/access splits
                                               into two endpoints)

admin_dashboard:view (on /admin/activities) → audit:view (split out; id 21
                                                already exists in the table, just wire it up)
```

---

## Base Group Starting Point (derived from actual role gating, not guessed)

**`EMPLOYEE_BASE`**: `dashboard:view`, `booking:create_own`,
`booking:view_own`, `booking:update_own`, `booking:cancel_own`,
`teammate:view`

**`MANAGER_BASE`** *(new — confirmed real via `ASSIGNABLE_ROLE_NAMES` and two
independent `_can_book_for_user`/`_can_view_user_resource` role checks, but
has no base group today because groups don't exist yet)*: everything in
`EMPLOYEE_BASE`, plus `booking:create_for_direct_reports`,
`booking:update_for_direct_reports`, `booking:cancel_for_direct_reports`,
`user:view_for_direct_reports`, `team:view`, `team:occupancy_view`

**`FACILITATOR_BASE`**: everything in `EMPLOYEE_BASE`, plus
`booking:create_for_employee`, `booking:update_for_employee`,
`booking:cancel_for_employee`, `booking:create_for_guest`,
`booking:update_for_guest`, `booking:cancel_for_guest`, `guest:view`,
`guest:create`, `guest:update`, `guest:terminate`, `guest_visit:create`,
`guest_visit:view`, `guest_visit:update`, `guest_visit:cancel`,
`guest_visit:workflow`, `user:view_any`

**`FRONT_OFFICE_BASE`**: `dashboard:view`, `guest_visit:view`,
`guest_visit:check_in`, `guest_visit:check_out` (+ `guest_visit:invite` once
built). Deliberately **excludes** `guest:create`/`guest:update`/
`guest:terminate` even though the current flat role check would allow them —
this is the concrete payoff of splitting `guest:manage`'s role check into
real permissions.

**`TENANT_ADMIN_BASE`**: everything above, plus `admin_dashboard:view`,
`booking:view_any_employee`, `booking:view_any_guest`,
`booking:update_any_employee`, `booking:update_any_guest`,
`booking:cancel_any_employee`, `booking:cancel_any_guest`,
`office:create/update`, `building:create/update`, `floor:create/update`,
`layout:create/view/publish/delete`, `layout_seat:update`,
`amenity:create/update`, `amenity_category:create/update`, `user:view`,
`user:change_role`, `user:update_status`, `occupancy:view`, `audit:view`

`PRODUCT_ADMIN` remains a reserved cross-tenant bypass in `deps.py`
(`ADMIN_ROLE_NAMES`) with no user, route, or UI surface anywhere else in the
codebase — still needs a decision from whoever owns the backend before it
gets its own base group.

---

## Findings That Affect the Migration, Not Just the Catalog

1. **The self/direct-reports/anyone tiering is real and repeated three
   times** (`_can_book_for_user`, `_can_view_user_resource`,
   and `GUEST_OPERATION_ROLES`'s flatter version) — any permission model that
   only offers `_own`/`_any` will regress the `MANAGER` role's current
   direct-reports scope for bookings and user viewing. The atomic catalog
   above adds the missing middle tier explicitly.
2. **`guest:manage`'s flat role check is currently over-broad for
   `FRONT_OFFICE`** — splitting it is what makes it possible to give Front
   Office check-in/check-out without also handing them guest profile
   create/edit/terminate, which today's single `GUEST_OPERATION_ROLES` check
   cannot express.
3. **`booking:view_for_employee`/`view_for_guest` and
   `dashboard:view_for_*` can't be granted independently today** —
   `GET /bookings/delegated/*` and `GET /dashboard/employee/{id}` don't carry
   a type filter or any authorization at all respectively. Splitting the
   permission key is necessary but not sufficient; the query/route needs a
   parameter or gate added before the split is enforceable.
4. **`user:manage` bundles role-grant and activate/deactivate** behind one
   endpoint — same caveat as above, product decision not just naming.
5. **`PROTECTED_TARGET_ROLE_NAMES` is a target-side safeguard that has no
   permission-model equivalent** — it must survive the migration as explicit
   logic ("you may never change a `TENANT_ADMIN`/`PRODUCT_ADMIN` target's
   role or status through this action, no matter what group grants you
   `user:change_role`"), not get silently dropped because it "should" be
   handled by permissions now.
6. **Several old-table permissions are dead on arrival**:
   `seat:view_all/create/update/delete/block`, `floor:view`,
   `team:view/booking_view/occupancy_view`, `teammate:view`'s current
   route (unchecked) — none of them gate any route or service function
   reachable from the UI today. Carrying them into `group_permissions`
   unchanged would let an admin "grant" a capability that does nothing.
7. **Two frontend affordances have no backend behind them**: `POST
   /admin/roles` (Add Role) and `POST /security/visitors/invite` (Invite
   Guest) — don't let either leak into the permission catalog as if they
   were real, working capabilities.
8. **The permission split has a frontend half, not just a backend half.**
   `BookFormSomePage.tsx` and `AppSidebar.tsx` gate the entire "Book for
   Someone" flow on literal `can("booking:book_for_employee")`/
   `can("booking:book_for_guest")` string checks. Confirmed by reading the
   component: today nothing in the frontend can express
   `booking:create_for_direct_reports` (the `MANAGER` scope) — so shipping
   that permission on the backend alone does not give Managers the feature;
   the nav's `anyPermission` list and `showTypeSelector`'s condition both
   need the new key added, or Managers stay unable to reach the page at all.
9. **`/admin/activities` needs a route change, not just a catalog entry, to
   make `audit:view` independently useful.** It's currently gated only by
   `admin_dashboard:view`; `/admin/occupancy/*` already accepts
   `admin_dashboard:view` **or** `occupancy:view`. Splitting `audit:view` out
   in `group_permissions` without giving the route the same
   `require_any_permission(["admin_dashboard:view", "audit:view"])` treatment
   means a group with `audit:view` alone still 403s on the Recent Activities
   widget.
10. **`occupancy:view` and `audit:view` are already live, not speculative** —
    confirmed via the Admin Dashboard screenshot: the Occupancy Trend chart,
    Top Offices list, and Recent Activities table all render today on the
    main dashboard page by calling the real endpoints, even though their
    dedicated full-page nav items (`Occupancy`, `Utilization`, `Audit Logs`)
    are still `disabled: true`. Don't deprioritize these two permissions as
    "future" work — they gate something tenant admins see on every page load
    right now.
