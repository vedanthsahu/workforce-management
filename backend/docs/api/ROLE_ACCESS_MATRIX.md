# Role and permission access matrix

This document describes effective access in the current code, not just menu visibility. It combines FastAPI dependencies, the tenant role-permission rows verified on 2026-10-23, service-level role checks, ownership rules, and tenant scoping.

## Role behavior

- `EMPLOYEE`: self-service booking, dashboard, team lookup, own profile/preferences, and other generally authenticated reads.
- `FACILITATOR`: employee abilities plus creating delegated employee bookings and operating guest profiles/visits. Existing resources still require creator/subject involvement unless explicitly stated.
- `FRONT_OFFICE`: reception role. It can view today's guest visits and is the only role allowed to check guests in or out. It is not a general guest operator.
- `MANAGER`: present in the schema and permission seed, but dormant in the core ownership module; it receives no implicit cross-user authority.
- `TENANT_ADMIN`: tenant-wide administrative role and the only currently seeded tenant role for most admin endpoints. It bypasses `require_any_permission`, but not bare `require_permission` or the FRONT_OFFICE-only check-in/out rule.
- `PRODUCT_ADMIN`: protected platform role. It bypasses `require_any_permission` gates but does not automatically bypass bare `require_permission` or every service-level rule.

## Current seeded permissions

These grants matched tenants 3 and 4 when audited. Since role permissions are tenant data, testers should confirm `/auth/me` when testing another database or tenant.

| Role | Active permission keys |
|---|---|
| `EMPLOYEE` | `booking:cancel_own`, `booking:view_own`, `dashboard:view`, `seat:book_self`, `teammate:view` |
| `FACILITATOR` | `booking:book_for_employee`, `booking:book_for_guest`, `booking:cancel_own`, `booking:view_own`, `dashboard:view`, `guest:invite_only`, `guest:manage`, `guest:view_visits`, `seat:book_self`, `teammate:view` |
| `FRONT_OFFICE` | `guest:check_in`, `guest:check_out`, `guest:view_visits` |
| `MANAGER` | `booking:cancel_own`, `booking:view_own`, `dashboard:view`, `seat:book_self`, `team:booking_view`, `teammate:view`, `team:occupancy_view`, `team:view` |
| `TENANT_ADMIN` | `admin_dashboard:view`, `amenities:manage`, `audit:view`, `booking:book_for_employee`, `booking:book_for_guest`, `booking:cancel_any`, `booking:cancel_own`, `booking:view_all`, `booking:view_own`, `dashboard:view`, `floor:manage`, `floor:view`, `guest:check_in`, `guest:check_out`, `guest:invite_only`, `guest:manage`, `guest:view_visits`, `layout:publish`, `layout:upload`, `occupancy:view`, `seat:block`, `seat:book_self`, `seat:create`, `seat:delete`, `seat:update`, `seat:view_all`, `user:manage`, `users:view`, `user:view` |

## Endpoint-by-endpoint effective access

| Method | Path | Route gate | Effective roles/conditions | Lifecycle |
|---|---|---|---|---|
| POST | `/auth/logout` | Refresh-token cookie is optional; cookies are always cleared | Any caller; an existing refresh session is revoked when present. | Active |
| POST | `/auth/refresh` | Refresh-token cookie | Any user with a valid, active refresh-token session. | Active |
| GET | `/auth/me` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | Active |
| GET | `/auth/login` | Public (SSO callbacks still validate OAuth state/tokens) | Public; no application role is required. | Active |
| GET | `/auth/callback` | Public (SSO callbacks still validate OAuth state/tokens) | Public; no application role is required. | Active |
| GET | `/auth/sso-gateway-callback` | Public (SSO callbacks still validate OAuth state/tokens) | Public; no application role is required. | Active |
| POST | `/bookings` | Bearer token or access-token cookie | Any authenticated role for a self-booking; TENANT_ADMIN and FACILITATOR may also originate a booking for another employee. | Active |
| GET | `/bookings/me/past` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. Results are restricted to the caller. | Active |
| GET | `/bookings/me/current` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. Results are restricted to the caller. | Active |
| GET | `/bookings/me/cancelled` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. Results are restricted to the caller. | Active |
| GET | `/bookings/me/future` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. Results are restricted to the caller. | Active |
| POST | `/bookings/{booking_id}/cancel` | Bearer token or access-token cookie | TENANT_ADMIN, or the booking creator/subject regardless of role. FACILITATOR has no blanket edit bypass. | Active |
| POST | `/bookings/{booking_id}/modify` | Bearer token or access-token cookie | TENANT_ADMIN, or the booking creator/subject regardless of role. FACILITATOR has no blanket edit bypass. | Active |
| POST | `/bookings/eligibility` | Bearer token or access-token cookie | Any authenticated role for a self-booking; TENANT_ADMIN and FACILITATOR may also originate a booking for another employee. | Active |
| GET | `/bookings/delegated/past` | Bearer token or access-token cookie | TENANT_ADMIN and FACILITATOR only. | Active |
| GET | `/bookings/delegated/current` | Bearer token or access-token cookie | TENANT_ADMIN and FACILITATOR only. | Active |
| GET | `/bookings/delegated/future` | Bearer token or access-token cookie | TENANT_ADMIN and FACILITATOR only. | Active |
| GET | `/bookings/delegated/cancelled` | Bearer token or access-token cookie | TENANT_ADMIN and FACILITATOR only. | Active |
| GET | `/business-rules/chatbot-policy` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | Active |
| GET | `/business-rules/booking-policy` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | Active |
| GET | `/business-rules/layout-policy` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | Active |
| GET | `/business-rules/activity-policy` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | Active |
| GET | `/business-rules/blocked-seat-policy` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | Active |
| POST | `/business-rules` | Bearer/access cookie + admin_dashboard:view | TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view (currently TENANT_ADMIN). | Active |
| POST | `/api/chat/session` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; sessions remain user- and tenant-owned. | Active |
| POST | `/api/chat/session/{session_id}/message` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; sessions remain user- and tenant-owned. | Active |
| GET | `/api/chat/session/{session_id}` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; sessions remain user- and tenant-owned. | Future scope |
| GET | `/guests` | Bearer token or access-token cookie | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | Active |
| POST | `/guests` | Bearer token or access-token cookie | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | Active |
| GET | `/guests/{guest_id}` | Bearer token or access-token cookie | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | Future scope |
| PATCH | `/guests/{guest_id}` | Bearer token or access-token cookie | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | Active |
| PATCH | `/guests/{guest_id}/status` | Bearer token or access-token cookie | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | Future scope |
| GET | `/guests/{guest_id}/visits` | Bearer token or access-token cookie | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | Future scope |
| GET | `/guest-visits` | Bearer/access cookie + guest:view_visits | Roles currently granted guest:view_visits: TENANT_ADMIN, FACILITATOR, and FRONT_OFFICE. FRONT_OFFICE is clamped to today's visits. | Active |
| POST | `/guest-visits` | Bearer token or access-token cookie | TENANT_ADMIN and FACILITATOR only. | Active |
| GET | `/guest-visits/{guest_visit_id}` | Bearer/access cookie + guest:view_visits | Roles currently granted guest:view_visits: TENANT_ADMIN, FACILITATOR, and FRONT_OFFICE. FRONT_OFFICE is clamped to today's visits. | Future scope |
| POST | `/guest-visits/{guest_visit_id}/check-in` | Bearer/access cookie + guest:check_in | FRONT_OFFICE only. This service-level rule overrides the broader permission data; TENANT_ADMIN and FACILITATOR are deliberately rejected. | Active |
| POST | `/guest-visits/{guest_visit_id}/check-out` | Bearer/access cookie + guest:check_out | FRONT_OFFICE only. This service-level rule overrides the broader permission data; TENANT_ADMIN and FACILITATOR are deliberately rejected. | Active |
| POST | `/guest-visits/{guest_visit_id}/workflow` | Bearer/access cookie + guest:manage | TENANT_ADMIN or FACILITATOR with guest:manage; FACILITATOR must also be the visit creator or host for existing-resource actions. | Active |
| GET | `/guest-bookings` | Bearer token or access-token cookie | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | Future scope |
| GET | `/guest-bookings/{booking_id}` | Bearer token or access-token cookie | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | Future scope |
| POST | `/guest-bookings/{booking_id}/cancel` | Bearer token or access-token cookie | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | Active |
| POST | `/guest-bookings/{booking_id}/modify` | Bearer token or access-token cookie | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | Active |
| GET | `/sites` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | Active |
| POST | `/sites` | Bearer/access cookie + location:manage | TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted location:manage; current tenant seed grants no non-admin role. | Active |
| GET | `/sites/{site_id}` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | Active |
| PATCH | `/sites/{site_id}` | Bearer/access cookie + location:manage | TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted location:manage; current tenant seed grants no non-admin role. | Active |
| GET | `/buildings` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | Active |
| POST | `/buildings` | Bearer/access cookie + location:manage | TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted location:manage; current tenant seed grants no non-admin role. | Active |
| PATCH | `/buildings/{building_id}` | Bearer/access cookie + location:manage | TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted location:manage; current tenant seed grants no non-admin role. | Active |
| GET | `/buildings/{building_id}/floors` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | Active |
| GET | `/floors` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | Active |
| POST | `/floors` | Bearer/access cookie + location:manage | TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted location:manage; current tenant seed grants no non-admin role. | Active |
| PATCH | `/floors/{floor_id}` | Bearer/access cookie + location:manage | TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted location:manage; current tenant seed grants no non-admin role. | Active |
| GET | `/floors/{floor_id}/seats` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | Active |
| PATCH | `/layout-seats/{layout_seat_mapping_id}/configuration` | Bearer/access cookie + location:manage or layout:upload | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted location:manage or layout:upload (currently TENANT_ADMIN). | Active |
| PATCH | `/layout-seats/bulk-configuration` | Bearer/access cookie + location:manage or layout:upload | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted location:manage or layout:upload (currently TENANT_ADMIN). | Active |
| GET | `/teams/me` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; returned data is caller/tenant scoped. | Active |
| GET | `/teams/members/search` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; returned data is caller/tenant scoped. | Active |
| GET | `/dashboard/me` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; returned data is caller/tenant scoped. | Active |
| GET | `/admin/dashboard/summary` | Bearer/access cookie + admin_dashboard:view | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view (currently TENANT_ADMIN). | Active |
| GET | `/admin/activities` | Bearer/access cookie + admin_dashboard:view | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view (currently TENANT_ADMIN). | Active |
| GET | `/admin/occupancy/date-range` | Bearer/access cookie + admin_dashboard:view or occupancy:view | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view or occupancy:view (currently TENANT_ADMIN). | Active |
| GET | `/admin/occupancy/hierarchy` | Bearer/access cookie + admin_dashboard:view or occupancy:view | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view or occupancy:view (currently TENANT_ADMIN). | Active |
| GET | `/admin/bookings` | Bearer/access cookie + booking:view_all or admin_dashboard:view | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted booking:view_all or admin_dashboard:view (currently TENANT_ADMIN). | Active |
| GET | `/admin/bookings/suggest/people` | Bearer/access cookie + booking:view_all or admin_dashboard:view | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted booking:view_all or admin_dashboard:view (currently TENANT_ADMIN). | Active |
| GET | `/admin/bookings/suggest/seats` | Bearer/access cookie + booking:view_all or admin_dashboard:view | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted booking:view_all or admin_dashboard:view (currently TENANT_ADMIN). | Active |
| GET | `/admin/blocked-seats` | Bearer/access cookie + seat:block or seat:view_all | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block or seat:view_all (currently TENANT_ADMIN). The list's view=conflicts mode additionally requires booking:view_all or admin_dashboard:view. | Active |
| POST | `/admin/blocked-seats` | Bearer/access cookie + seat:block | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block (currently TENANT_ADMIN). | Active |
| GET | `/admin/blocked-seats/summary` | Bearer/access cookie + seat:block or seat:view_all | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block or seat:view_all (currently TENANT_ADMIN). | Active |
| GET | `/admin/blocked-seats/{block_id}/history` | Bearer/access cookie + seat:block or seat:view_all | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block or seat:view_all (currently TENANT_ADMIN). | Active |
| PATCH | `/admin/blocked-seats/{block_id}` | Bearer/access cookie + seat:block | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block (currently TENANT_ADMIN). | Active |
| GET | `/admin/blocked-seats/floors/{floor_id}/layout-resources` | Bearer/access cookie + seat:block or seat:view_all | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block or seat:view_all (currently TENANT_ADMIN). | Active |
| POST | `/admin/blocked-seats/{block_id}/cancel` | Bearer/access cookie + seat:block | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block (currently TENANT_ADMIN). | Active |
| GET | `/admin/audit` | Bearer/access cookie + admin_dashboard:view (admin roles bypass) | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view (currently TENANT_ADMIN). | Active |
| GET | `/admin/audit/{audit_id}` | Bearer/access cookie + admin_dashboard:view (admin roles bypass) | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view (currently TENANT_ADMIN). | Active |
| GET | `/preferences/{user_id}` | Bearer token or access-token cookie | The same user, TENANT_ADMIN, or FACILITATOR; cross-user reads exist only to prefill delegated bookings. | Active |
| POST | `/preferences/me` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | Active |
| GET | `/amenities` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | Active |
| POST | `/amenities` | Bearer/access cookie + amenities:manage or location:manage | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted amenities:manage or location:manage (currently TENANT_ADMIN). | Active |
| GET | `/amenity-categories` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | Active |
| POST | `/amenity-categories` | Bearer/access cookie + amenities:manage or location:manage | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted amenities:manage or location:manage (currently TENANT_ADMIN). | Future scope |
| GET | `/amenity-categories/{category_id}` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | Future scope |
| PATCH | `/amenity-categories/{category_id}` | Bearer/access cookie + amenities:manage or location:manage | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted amenities:manage or location:manage (currently TENANT_ADMIN). | Future scope |
| GET | `/amenities/{amenity_id}` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | Future scope |
| PATCH | `/amenities/{amenity_id}` | Bearer/access cookie + amenities:manage or location:manage | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted amenities:manage or location:manage (currently TENANT_ADMIN). | Active |
| POST | `/admin/floor-layouts` | Bearer/access cookie + layout:upload | A role granted layout:upload; require_permission has no automatic admin bypass (currently TENANT_ADMIN). | Active |
| GET | `/admin/floor-layouts/floors/{floor_id}` | Bearer/access cookie + layout:upload | A role granted layout:upload; require_permission has no automatic admin bypass (currently TENANT_ADMIN). | Active |
| POST | `/admin/floor-layouts/{layout_id}/activate` | Bearer/access cookie + layout:publish | A role granted layout:publish; require_permission has no automatic admin bypass (currently TENANT_ADMIN). | Active |
| PATCH | `/admin/floor-layouts/{layout_id}/schedule` | Bearer/access cookie + layout:publish | A role granted layout:publish; require_permission has no automatic admin bypass (currently TENANT_ADMIN). | Active |
| DELETE | `/admin/floor-layouts/{layout_id}` | Bearer/access cookie + layout:publish | A role granted layout:publish; require_permission has no automatic admin bypass (currently TENANT_ADMIN). | Active |
| GET | `/admin/floor-layouts/{layout_id}/seats` | Bearer/access cookie + layout:upload | A role granted layout:upload; require_permission has no automatic admin bypass (currently TENANT_ADMIN). | Active |
| GET | `/admin/users` | Bearer/access cookie + admin_dashboard:view, users:view, or user:view | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view, users:view, or user:view (currently TENANT_ADMIN). | Active |
| GET | `/users` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; profile mutation is self-only. | Active |
| PATCH | `/users/me` | Bearer token or access-token cookie | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; profile mutation is self-only. | Active |
| GET | `/users/{user_id}` | Bearer token or access-token cookie | Self or TENANT_ADMIN only. | Active |
| GET | `/users/{user_id}/bookings` | Bearer/access cookie + admin_dashboard:view, users:view, user:view, or teammate:view; service then limits cross-user access to TENANT_ADMIN | Route permission plus service ownership: self or TENANT_ADMIN only. | Future scope |
| PATCH | `/admin/users/{user_id}/access` | Bearer/access cookie + user:manage | A role granted user:manage (currently TENANT_ADMIN); self-change and PRODUCT_ADMIN targets are blocked. | Active |
| GET | `/` | Public (SSO callbacks still validate OAuth state/tokens) | Public; no application role is required. | Active |
| GET | `/health` | Public (SSO callbacks still validate OAuth state/tokens) | Public; no application role is required. | Active |

## High-value authorization tests

1. Verify every protected endpoint returns 401 with no token and rejects a Microsoft Graph access token.
2. Verify a user cannot read or mutate another tenant's IDs.
3. Verify FACILITATOR can create for another employee but cannot edit an unrelated existing booking.
4. Verify TENANT_ADMIN can manage tenant bookings and guest workflows but cannot check guests in/out.
5. Verify only FRONT_OFFICE can check in/out, and its guest-visit reads are limited to today.
6. Verify `PATCH /admin/users/{user_id}/access` blocks self-change, PRODUCT_ADMIN targets, invalid roles, and removal of the last active tenant admin.
7. Verify routes using bare `require_permission` fail when a tenant is missing role seed data; admin role names alone do not bypass that dependency.
