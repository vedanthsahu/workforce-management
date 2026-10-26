# Seat Management API reference for QA

This reference covers all **100 HTTP operations across 88 paths** currently registered by `backend.main:app`. The contract was generated from FastAPI and enriched by reviewing route dependencies, service authorization, repository SQL, current frontend callers, and explicit future-scope comments in the code.

## What is in the package

- `seat-management.postman_collection.json`: importable Postman Collection v2.1 with every request, populated inputs, descriptions, role rules, positive and negative saved examples, and smoke tests.
- `seat-management.postman_environment.json`: local environment containing `baseUrl`, a secret `accessToken`, and variables for every path ID.
- `seat-management.openapi.json`: enriched OpenAPI 3.1 source, also directly importable into Postman.
- `POSTMAN_GUIDE.md`: tester setup, authentication, execution, and troubleshooting instructions.
- `ROLE_ACCESS_MATRIX.md`: effective endpoint access matrix and the current seeded role-permission snapshot.
- `generate_api_assets.py`: repeatable generator and operation-count drift check.

## Authorization model testers must understand

Authentication, route permissions, and service business rules are separate layers. Passing a permission dependency does not guarantee that the service will allow the action. Every endpoint below therefore shows both the literal route gate and the effective role/ownership rule.

`require_any_permission(...)` automatically allows `TENANT_ADMIN` and `PRODUCT_ADMIN`. In contrast, `require_permission(...)` has no role bypass: the named permission must exist in the caller's tenant-scoped permission list. Hard-coded service rules apply after either dependency.

The most important ownership rule is: an existing booking or guest resource can be managed by its creator, its subject/host, or `TENANT_ADMIN`. `FACILITATOR` may create for other people but receives no blanket edit access to resources created by somebody else. Guest check-in/check-out is an intentional exception: only `FRONT_OFFICE` may do it, even when another role has the database permission.

## Shared request and response conventions

- Protected APIs accept a backend-issued JWT as `Authorization: Bearer <token>` or an HTTP-only `access_token` cookie. Microsoft Graph tokens are rejected.
- Authenticated calls normally also read `user_sessions`, `app_users`, `roles`, `role_permissions`, and `permissions`. These authentication-baseline tables are not repeated in every endpoint's feature-table list.
- IDs and data access are tenant-scoped. A cross-tenant ID should not reveal the foreign record and normally behaves as not found or forbidden.
- The collection sends `X-Source-Channel: API`; supported channels include `WEB`, `MOBILE`, `API`, `SYSTEM`, and `IMPORT`.
- Application failures normally use an error code/message envelope. FastAPI input validation failures use HTTP 422 with a `detail` array.
- Email notifications and Microsoft Graph calls are external side effects. Write routes may also append `audit_logs` rows even though the feature's primary tables are listed separately.
- Optional query parameters are imported into Postman in a disabled state. Enable only the filters needed for a scenario.

## Writable business-rule IDs

`POST /business-rules` accepts an `updates` array. Each item contains a dotted `id` and a `value`; supported IDs are:

- `booking_policy.employee_max_advance_days`
- `booking_policy.guest_max_advance_days`
- `layout_policy.buffer_days`
- `layout_policy.visibility_days.draft`
- `layout_policy.visibility_days.archived`
- `layout_policy.visibility_days.deleted`
- `activity_policy.record_count`
- `blocked_seat_policy.upcoming_days`
- `blocked_seat_policy.expiring_soon_days`
- `blocked_seat_policy.expired_window_days`
- `blocked_seat_policy.max_advance_days`
- `chatbot_policy.employee_access_enabled`

The chatbot setting requires a boolean value. The remaining settings require numeric values and are also checked against service-specific ranges and relationships.

## Endpoint index

| Method | Path | Lifecycle | Effective access | Feature tables |
|---|---|---|---|---|
| POST | `/auth/logout` | Active | Any caller; an existing refresh session is revoked when present. | `app_users, audit_logs, auth_token_events, tenants, user_sessions` |
| POST | `/auth/refresh` | Active | Any user with a valid, active refresh-token session. | `app_users, auth_token_events, tenants, user_sessions` |
| GET | `/auth/me` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | `app_users, auth_token_events, permissions, role_permissions, roles, tenants, user_sessions` |
| GET | `/auth/login` | Active | Public; no application role is required. | `None` |
| GET | `/auth/callback` | Active | Public; no application role is required. | `app_users, audit_logs, auth_identities, auth_token_events, team_members, teams, tenants, user_graph_profiles, user_sessions` |
| GET | `/auth/sso-gateway-callback` | Active | Public; no application role is required. | `app_users, audit_logs, auth_identities, auth_token_events, team_members, teams, tenants, user_graph_profiles, user_sessions` |
| POST | `/bookings` | Active | Any authenticated role for a self-booking; TENANT_ADMIN and FACILITATOR may also originate a booking for another employee. | `bookings, seats, sites, buildings, floors, floor_layouts, blocked_seats, app_users, audit_logs` |
| GET | `/bookings/me/past` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. Results are restricted to the caller. | `bookings, seats, sites, buildings, floors, floor_layouts, blocked_seats, app_users` |
| GET | `/bookings/me/current` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. Results are restricted to the caller. | `bookings, seats, sites, buildings, floors, floor_layouts, blocked_seats, app_users` |
| GET | `/bookings/me/cancelled` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. Results are restricted to the caller. | `bookings, seats, sites, buildings, floors, floor_layouts, blocked_seats, app_users` |
| GET | `/bookings/me/future` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. Results are restricted to the caller. | `bookings, seats, sites, buildings, floors, floor_layouts, blocked_seats, app_users` |
| POST | `/bookings/{booking_id}/cancel` | Active | TENANT_ADMIN, or the booking creator/subject regardless of role. FACILITATOR has no blanket edit bypass. | `bookings, seats, sites, buildings, floors, floor_layouts, blocked_seats, app_users, audit_logs` |
| POST | `/bookings/{booking_id}/modify` | Active | TENANT_ADMIN, or the booking creator/subject regardless of role. FACILITATOR has no blanket edit bypass. | `bookings, seats, sites, buildings, floors, floor_layouts, blocked_seats, app_users, audit_logs` |
| POST | `/bookings/eligibility` | Active | Any authenticated role for a self-booking; TENANT_ADMIN and FACILITATOR may also originate a booking for another employee. | `bookings, seats, sites, buildings, floors, floor_layouts, blocked_seats, app_users, audit_logs` |
| GET | `/bookings/delegated/past` | Active | TENANT_ADMIN and FACILITATOR only. | `bookings, seats, sites, buildings, floors, floor_layouts, blocked_seats, app_users` |
| GET | `/bookings/delegated/current` | Active | TENANT_ADMIN and FACILITATOR only. | `bookings, seats, sites, buildings, floors, floor_layouts, blocked_seats, app_users` |
| GET | `/bookings/delegated/future` | Active | TENANT_ADMIN and FACILITATOR only. | `bookings, seats, sites, buildings, floors, floor_layouts, blocked_seats, app_users` |
| GET | `/bookings/delegated/cancelled` | Active | TENANT_ADMIN and FACILITATOR only. | `bookings, seats, sites, buildings, floors, floor_layouts, blocked_seats, app_users` |
| GET | `/business-rules/chatbot-policy` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | `business_rules, tenant_business_rules` |
| GET | `/business-rules/booking-policy` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | `business_rules, tenant_business_rules` |
| GET | `/business-rules/layout-policy` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | `business_rules, tenant_business_rules` |
| GET | `/business-rules/activity-policy` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | `business_rules, tenant_business_rules` |
| GET | `/business-rules/blocked-seat-policy` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | `business_rules, tenant_business_rules` |
| POST | `/business-rules` | Active | TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view (currently TENANT_ADMIN). | `business_rules, tenant_business_rules` |
| POST | `/api/chat/session` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; sessions remain user- and tenant-owned. | `chatbot_sessions, chatbot_messages` |
| POST | `/api/chat/session/{session_id}/message` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; sessions remain user- and tenant-owned. | `chatbot_sessions, chatbot_messages` |
| GET | `/api/chat/session/{session_id}` | Future scope | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; sessions remain user- and tenant-owned. | `chatbot_sessions, chatbot_messages` |
| GET | `/guests` | Active | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | `guests` |
| POST | `/guests` | Active | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | `guests, audit_logs` |
| GET | `/guests/{guest_id}` | Future scope | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | `guests` |
| PATCH | `/guests/{guest_id}` | Active | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | `guests, audit_logs` |
| PATCH | `/guests/{guest_id}/status` | Future scope | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | `guests, audit_logs` |
| GET | `/guests/{guest_id}/visits` | Future scope | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | `guests, guest_visits, bookings, seats, sites, buildings, floors, app_users` |
| GET | `/guest-visits` | Active | Roles currently granted guest:view_visits: TENANT_ADMIN, FACILITATOR, and FRONT_OFFICE. FRONT_OFFICE is clamped to today's visits. | `guest_visits, guests, bookings, seats, sites, buildings, floors, app_users` |
| POST | `/guest-visits` | Active | TENANT_ADMIN and FACILITATOR only. | `guest_visits, guests, bookings, seats, sites, buildings, floors, app_users, audit_logs` |
| GET | `/guest-visits/{guest_visit_id}` | Future scope | Roles currently granted guest:view_visits: TENANT_ADMIN, FACILITATOR, and FRONT_OFFICE. FRONT_OFFICE is clamped to today's visits. | `guest_visits, guests, bookings, seats, sites, buildings, floors, app_users` |
| POST | `/guest-visits/{guest_visit_id}/check-in` | Active | FRONT_OFFICE only. This service-level rule overrides the broader permission data; TENANT_ADMIN and FACILITATOR are deliberately rejected. | `guest_visits, guests, bookings, seats, sites, buildings, floors, app_users, audit_logs` |
| POST | `/guest-visits/{guest_visit_id}/check-out` | Active | FRONT_OFFICE only. This service-level rule overrides the broader permission data; TENANT_ADMIN and FACILITATOR are deliberately rejected. | `guest_visits, guests, bookings, seats, sites, buildings, floors, app_users, audit_logs` |
| POST | `/guest-visits/{guest_visit_id}/workflow` | Active | TENANT_ADMIN or FACILITATOR with guest:manage; FACILITATOR must also be the visit creator or host for existing-resource actions. | `guest_visits, guests, bookings, seats, sites, buildings, floors, app_users, audit_logs` |
| GET | `/guest-bookings` | Future scope | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | `guest_visits, guests, bookings, seats, sites, buildings, floors, app_users` |
| GET | `/guest-bookings/{booking_id}` | Future scope | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | `guest_visits, guests, bookings, seats, sites, buildings, floors, app_users` |
| POST | `/guest-bookings/{booking_id}/cancel` | Active | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | `guest_visits, guests, bookings, seats, sites, buildings, floors, app_users, audit_logs` |
| POST | `/guest-bookings/{booking_id}/modify` | Active | TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule). | `guest_visits, guests, bookings, seats, sites, buildings, floors, app_users, audit_logs` |
| GET | `/sites` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | `sites, buildings, floors, seats, floor_layouts` |
| POST | `/sites` | Active | TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted location:manage; current tenant seed grants no non-admin role. | `sites, buildings, floors, seats, floor_layouts, audit_logs` |
| GET | `/sites/{site_id}` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | `sites, buildings, floors, seats, floor_layouts` |
| PATCH | `/sites/{site_id}` | Active | TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted location:manage; current tenant seed grants no non-admin role. | `sites, buildings, floors, seats, floor_layouts, audit_logs` |
| GET | `/buildings` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | `buildings, sites, floors, seats, floor_layouts` |
| POST | `/buildings` | Active | TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted location:manage; current tenant seed grants no non-admin role. | `buildings, sites, floors, seats, floor_layouts, audit_logs` |
| PATCH | `/buildings/{building_id}` | Active | TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted location:manage; current tenant seed grants no non-admin role. | `buildings, sites, floors, seats, floor_layouts, audit_logs` |
| GET | `/buildings/{building_id}/floors` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | `buildings, sites, floors, seats, floor_layouts` |
| GET | `/floors` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | `floors, buildings, sites, seats, floor_layouts` |
| POST | `/floors` | Active | TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted location:manage; current tenant seed grants no non-admin role. | `floors, buildings, sites, seats, floor_layouts, audit_logs` |
| PATCH | `/floors/{floor_id}` | Active | TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted location:manage; current tenant seed grants no non-admin role. | `floors, buildings, sites, seats, floor_layouts, audit_logs` |
| GET | `/floors/{floor_id}/seats` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | `floors, buildings, sites, seats, floor_layouts, bookings, blocked_seats, seat_amenities, amenities` |
| PATCH | `/layout-seats/{layout_seat_mapping_id}/configuration` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted location:manage or layout:upload (currently TENANT_ADMIN). | `layout_seat_mappings, seats, seat_amenities, amenities, floor_layouts, audit_logs` |
| PATCH | `/layout-seats/bulk-configuration` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted location:manage or layout:upload (currently TENANT_ADMIN). | `layout_seat_mappings, seats, seat_amenities, amenities, floor_layouts, audit_logs` |
| GET | `/teams/me` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; returned data is caller/tenant scoped. | `teams, team_members, app_users, bookings, seats, floors, buildings, seat_amenities, amenities` |
| GET | `/teams/members/search` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; returned data is caller/tenant scoped. | `teams, team_members, app_users, bookings, seats, floors, buildings, seat_amenities, amenities` |
| GET | `/dashboard/me` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; returned data is caller/tenant scoped. | `app_users, tenants, user_work_preferences, user_preferred_amenities, amenities, bookings, seats, sites, buildings, floors, floor_layouts` |
| GET | `/admin/dashboard/summary` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view (currently TENANT_ADMIN). | `bookings, guest_visits, guests, blocked_seats, seats, floor_layouts, sites, buildings, floors, app_users, business_rules, tenant_business_rules` |
| GET | `/admin/activities` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view (currently TENANT_ADMIN). | `bookings, guest_visits, guests, blocked_seats, seats, floor_layouts, sites, buildings, floors, app_users, business_rules, tenant_business_rules` |
| GET | `/admin/occupancy/date-range` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view or occupancy:view (currently TENANT_ADMIN). | `bookings, guest_visits, guests, blocked_seats, seats, floor_layouts, sites, buildings, floors, app_users, business_rules, tenant_business_rules` |
| GET | `/admin/occupancy/hierarchy` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view or occupancy:view (currently TENANT_ADMIN). | `bookings, guest_visits, guests, blocked_seats, seats, floor_layouts, sites, buildings, floors, app_users, business_rules, tenant_business_rules` |
| GET | `/admin/bookings` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted booking:view_all or admin_dashboard:view (currently TENANT_ADMIN). | `bookings, guest_visits, guests, seats, sites, buildings, floors, app_users` |
| GET | `/admin/bookings/suggest/people` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted booking:view_all or admin_dashboard:view (currently TENANT_ADMIN). | `bookings, guest_visits, guests, seats, sites, buildings, floors, app_users` |
| GET | `/admin/bookings/suggest/seats` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted booking:view_all or admin_dashboard:view (currently TENANT_ADMIN). | `bookings, guest_visits, guests, seats, sites, buildings, floors, app_users` |
| GET | `/admin/blocked-seats` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block or seat:view_all (currently TENANT_ADMIN). The list's view=conflicts mode additionally requires booking:view_all or admin_dashboard:view. | `blocked_seats, bookings, seats, floor_layouts, sites, buildings, floors, app_users, guests, audit_logs` |
| POST | `/admin/blocked-seats` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block (currently TENANT_ADMIN). | `blocked_seats, bookings, seats, floor_layouts, sites, buildings, floors, app_users, guests, audit_logs` |
| GET | `/admin/blocked-seats/summary` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block or seat:view_all (currently TENANT_ADMIN). | `blocked_seats, bookings, seats, floor_layouts, sites, buildings, floors, app_users, guests, audit_logs` |
| GET | `/admin/blocked-seats/{block_id}/history` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block or seat:view_all (currently TENANT_ADMIN). | `blocked_seats, bookings, seats, floor_layouts, sites, buildings, floors, app_users, guests, audit_logs` |
| PATCH | `/admin/blocked-seats/{block_id}` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block (currently TENANT_ADMIN). | `blocked_seats, bookings, seats, floor_layouts, sites, buildings, floors, app_users, guests, audit_logs` |
| GET | `/admin/blocked-seats/floors/{floor_id}/layout-resources` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block or seat:view_all (currently TENANT_ADMIN). | `blocked_seats, bookings, seats, floor_layouts, sites, buildings, floors, app_users, guests, audit_logs` |
| POST | `/admin/blocked-seats/{block_id}/cancel` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block (currently TENANT_ADMIN). | `blocked_seats, bookings, seats, floor_layouts, sites, buildings, floors, app_users, guests, audit_logs` |
| GET | `/admin/audit` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view (currently TENANT_ADMIN). | `audit_logs, app_users` |
| GET | `/admin/audit/{audit_id}` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view (currently TENANT_ADMIN). | `audit_logs, app_users` |
| GET | `/preferences/{user_id}` | Active | The same user, TENANT_ADMIN, or FACILITATOR; cross-user reads exist only to prefill delegated bookings. | `user_work_preferences, user_preferred_amenities, amenities, amenity_categories, sites, buildings, floors` |
| POST | `/preferences/me` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | `user_work_preferences, user_preferred_amenities, amenities, amenity_categories, sites, buildings, floors` |
| GET | `/amenities` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | `amenities, amenity_categories, seat_amenities, seats, floor_layouts` |
| POST | `/amenities` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted amenities:manage or location:manage (currently TENANT_ADMIN). | `amenities, amenity_categories, seat_amenities, seats, floor_layouts, audit_logs` |
| GET | `/amenity-categories` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | `amenities, amenity_categories, seat_amenities, seats, floor_layouts` |
| POST | `/amenity-categories` | Future scope | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted amenities:manage or location:manage (currently TENANT_ADMIN). | `amenities, amenity_categories, seat_amenities, seats, floor_layouts, audit_logs` |
| GET | `/amenity-categories/{category_id}` | Future scope | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | `amenities, amenity_categories, seat_amenities, seats, floor_layouts` |
| PATCH | `/amenity-categories/{category_id}` | Future scope | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted amenities:manage or location:manage (currently TENANT_ADMIN). | `amenities, amenity_categories, seat_amenities, seats, floor_layouts, audit_logs` |
| GET | `/amenities/{amenity_id}` | Future scope | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. | `amenities, amenity_categories, seat_amenities, seats, floor_layouts` |
| PATCH | `/amenities/{amenity_id}` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted amenities:manage or location:manage (currently TENANT_ADMIN). | `amenities, amenity_categories, seat_amenities, seats, floor_layouts, audit_logs` |
| POST | `/admin/floor-layouts` | Active | A role granted layout:upload; require_permission has no automatic admin bypass (currently TENANT_ADMIN). | `floor_layouts, layout_seat_mappings, seats, sites, buildings, floors, app_users, audit_logs` |
| GET | `/admin/floor-layouts/floors/{floor_id}` | Active | A role granted layout:upload; require_permission has no automatic admin bypass (currently TENANT_ADMIN). | `floor_layouts, layout_seat_mappings, seats, sites, buildings, floors, app_users, audit_logs` |
| POST | `/admin/floor-layouts/{layout_id}/activate` | Active | A role granted layout:publish; require_permission has no automatic admin bypass (currently TENANT_ADMIN). | `floor_layouts, layout_seat_mappings, seats, sites, buildings, floors, app_users, audit_logs` |
| PATCH | `/admin/floor-layouts/{layout_id}/schedule` | Active | A role granted layout:publish; require_permission has no automatic admin bypass (currently TENANT_ADMIN). | `floor_layouts, layout_seat_mappings, seats, sites, buildings, floors, app_users, audit_logs` |
| DELETE | `/admin/floor-layouts/{layout_id}` | Active | A role granted layout:publish; require_permission has no automatic admin bypass (currently TENANT_ADMIN). | `floor_layouts, layout_seat_mappings, seats, sites, buildings, floors, app_users, audit_logs` |
| GET | `/admin/floor-layouts/{layout_id}/seats` | Active | A role granted layout:upload; require_permission has no automatic admin bypass (currently TENANT_ADMIN). | `floor_layouts, layout_seat_mappings, seats, sites, buildings, floors, app_users, audit_logs` |
| GET | `/admin/users` | Active | TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view, users:view, or user:view (currently TENANT_ADMIN). | `app_users, roles, role_permissions, permissions, teams, team_members, audit_logs` |
| GET | `/users` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; profile mutation is self-only. | `app_users, roles, teams, team_members` |
| PATCH | `/users/me` | Active | EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; profile mutation is self-only. | `app_users, roles, teams, team_members, audit_logs` |
| GET | `/users/{user_id}` | Active | Self or TENANT_ADMIN only. | `app_users, roles, teams, team_members` |
| GET | `/users/{user_id}/bookings` | Future scope | Route permission plus service ownership: self or TENANT_ADMIN only. | `app_users, roles, teams, team_members, bookings, seats, sites, buildings, floors, floor_layouts, layout_seat_mappings` |
| PATCH | `/admin/users/{user_id}/access` | Active | A role granted user:manage (currently TENANT_ADMIN); self-change and PRODUCT_ADMIN targets are blocked. | `app_users, roles, role_permissions, permissions, teams, team_members, audit_logs` |
| GET | `/` | Active | Public; no application role is required. | `None` |
| GET | `/health` | Active | Public; no application role is required. | `None` |

## Detailed endpoint contracts

### auth

#### `POST /auth/logout` - Logout

**Purpose and behavior**

The web/mobile client or a tester uses this operation to logout.

The web/mobile client or a tester uses this operation to logout.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: authentication bootstrap, session refresh, profile loading, and logout.
- **Effective role access:** Any caller; an existing refresh session is revoked when present.
- **Route gate:** Refresh-token cookie is optional; cookies are always cleared
- **Primary feature tables:** `app_users`, `audit_logs`, `auth_token_events`, `tenants`, `user_sessions`

**Input contract**

No path or query parameters.

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `MessageResponse`.

Representative response shape:

```json
{
  "message": "Show me available seats for next Monday"
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `POST /auth/refresh` - Refresh Token

**Purpose and behavior**

Rotate SSO-issued backend auth tokens from the refresh cookie.

The web/mobile client or a tester uses this operation to refresh Token.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: authentication bootstrap, session refresh, profile loading, and logout.
- **Effective role access:** Any user with a valid, active refresh-token session.
- **Route gate:** Refresh-token cookie
- **Primary feature tables:** `app_users`, `auth_token_events`, `tenants`, `user_sessions`

**Input contract**

No path or query parameters.

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `MessageResponse`.

Representative response shape:

```json
{
  "message": "Show me available seats for next Monday"
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `GET /auth/me` - Me

**Purpose and behavior**

Return the user represented by the backend access token.

The web/mobile client or a tester uses this operation to me.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: authentication bootstrap, session refresh, profile loading, and logout.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `app_users`, `auth_token_events`, `permissions`, `role_permissions`, `roles`, `tenants`, `user_sessions`

**Input contract**

No path or query parameters.

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `UserResponse`.

Representative response shape:

```json
{
  "user_id": "1",
  "tenant_id": "string",
  "tenant_name": "string",
  "email": "tester@example.com",
  "full_name": "Test User",
  "display_name": "Test User",
  "name": "QA Example",
  "microsoft_object_id": "string",
  "user_principal_name": "string",
  "mobile_phone": "+919876543210",
  "office_location": "string",
  "department": "string",
  "job_title": "string",
  "company_name": "string",
  "employee_id": "string",
  "manager_user_id": "string",
  "home_site_id": "string",
  "role": "string",
  "role_name": "string",
  "status": "ACTIVE",
  "graph_last_synced_at": "2030-01-15T09:00:00Z",
  "created_at": "2030-01-15T09:00:00Z",
  "updated_at": "2030-01-15T09:00:00Z",
  "bio": "string",
  "skills": [
    "string"
  ],
  "permissions": []
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

### SSO

#### `GET /auth/login` - Auth Login

**Purpose and behavior**

Start login. One entry point for both SSO paths -- decides direct-vs-gateway based on the EMAIL DOMAIN typed into the login form (there's one single deployed frontend; no separate sgxdev/solugenix URLs to route by).  Compares the submitted email's domain against GATEWAY_SSO_HOSTNAME: a match redirects into apps.solugenix.com's SSO gateway (tenant 4). Unset/empty GATEWAY_SSO_HOSTNAME (the default), or no/malformed email, falls through to the direct Microsoft OAuth flow below (tenant 3) -- safe-merged by default, separate only once that env var is set.  Future: this domain->flow decision is meant to move into the tenants table (one row per tenant, one email domain each) so adding a tenant is a DB insert, not a code change. GATEWAY_SSO_HOSTNAME is the interim, single-tenant version of that.

The web/mobile client or a tester uses this operation to auth Login.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: browser-based Microsoft/SSO sign-in and callback handling.
- **Effective role access:** Public; no application role is required.
- **Route gate:** Public (SSO callbacks still validate OAuth state/tokens)
- **Primary feature tables:** None; this is static, redirect-based, or operational.

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `email` | no | `string | null` | `tester@example.com` | - |

Request body: none.

**Expected output**

Success is an HTTP 302 redirect to Microsoft or the configured SSO gateway. The direct Microsoft flow also creates an OAuth state cookie.

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `GET /auth/callback` - Auth Callback

**Purpose and behavior**

The web/mobile client or a tester uses this operation to auth Callback.

The web/mobile client or a tester uses this operation to auth Callback.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: browser-based Microsoft/SSO sign-in and callback handling.
- **Effective role access:** Public; no application role is required.
- **Route gate:** Public (SSO callbacks still validate OAuth state/tokens)
- **Primary feature tables:** `app_users`, `audit_logs`, `auth_identities`, `auth_token_events`, `team_members`, `teams`, `tenants`, `user_graph_profiles`, `user_sessions`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `code` | no | `string | null` | `A-101` | - |
| query | `state` | no | `string | null` | `string` | - |
| query | `error` | no | `string | null` | `string` | - |
| query | `error_description` | no | `string | null` | `string` | - |

Request body: none.

**Expected output**

Success is an HTTP 302 redirect to the frontend with backend access and refresh cookies set. The callback is not independently runnable without the matching OAuth state/code flow.

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `GET /auth/sso-gateway-callback` - Auth Sso Gateway Callback

**Purpose and behavior**

Callback for apps.solugenix.com's SSO gateway (the redirectUI target).  The gateway wraps Microsoft sign-in behind its own HS256 token, signed with a secret this service does not hold. Trust is established downstream instead of by verifying that signature: the embedded Graph access token is only acted on after ``fetch_graph_me`` proves Microsoft itself accepts it, mirroring how ``auth_callback`` trusts Microsoft's own id_token signature rather than anything the client supplied.

The web/mobile client or a tester uses this operation to auth Sso Gateway Callback.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: browser-based Microsoft/SSO sign-in and callback handling.
- **Effective role access:** Public; no application role is required.
- **Route gate:** Public (SSO callbacks still validate OAuth state/tokens)
- **Primary feature tables:** `app_users`, `audit_logs`, `auth_identities`, `auth_token_events`, `team_members`, `teams`, `tenants`, `user_graph_profiles`, `user_sessions`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `token` | no | `string | null` | `string` | - |

Request body: none.

**Expected output**

Success is an HTTP 302 redirect to the frontend with backend access and refresh cookies set. The callback is not independently runnable without the matching OAuth state/code flow.

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

### bookings

#### `POST /bookings` - Create Booking

**Purpose and behavior**

An employee reserves a seat for themselves or, when allowed, for another employee.

An employee reserves a seat for themselves or, when allowed, for another employee.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Book a Seat, My Bookings, dashboard booking cards, and delegated-booking flows.
- **Effective role access:** Any authenticated role for a self-booking; TENANT_ADMIN and FACILITATOR may also originate a booking for another employee.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `bookings`, `seats`, `sites`, `buildings`, `floors`, `floor_layouts`, `blocked_seats`, `app_users`, `audit_logs`

**Input contract**

No path or query parameters.

JSON request body, schema `CreateBookingRequest`:

```json
{
  "site_id": 1,
  "building_id": 1,
  "floor_id": 1,
  "seat_id": 1,
  "booked_for_user_id": 1,
  "booking_date": "{{qaDate}}",
  "start_time": "09:00:00",
  "end_time": "18:00:00",
  "source_channel": "API"
}
```

**Expected output**

Success returns **HTTP 201** using response schema `BookingResponse`.

Representative response shape:

```json
{
  "activity_source": "string",
  "booking_id": "string",
  "tenant_id": "string",
  "booked_for_user_id": "string",
  "booked_for_guest_id": "string",
  "booked_by_user_id": "string",
  "booked_by_name": "string",
  "booked_by_email": "string",
  "booked_for_name": "string",
  "booked_for_email": "string",
  "booked_for_phone": "string",
  "booked_for_organization": "string",
  "guest_visit_id": "1",
  "booking_type": "EMPLOYEE",
  "seat_id": "1",
  "site_id": "1",
  "building_id": "1",
  "floor_id": "1",
  "seat_code": "A-101",
  "site_name": "string",
  "building_name": "string",
  "floor_name": "string",
  "booking_date": "{{qaDate}}",
  "booking_status": "string",
  "source_channel": "API",
  "check_in_at": "2030-01-15T09:00:00Z",
  "checked_out_at": "2030-01-15T09:00:00Z",
  "cancelled_at": "2030-01-15T09:00:00Z",
  "cancellation_reason": "string",
  "updated_user_id": "string",
  "updated_by_name": "string",
  "updated_by_email": "string",
  "modified_from_booking_id": "string",
  "modification_reason": "string",
  "is_modified": false,
  "created_at": "2030-01-15T09:00:00Z",
  "updated_at": "2030-01-15T09:00:00Z",
  "guest_name": "string",
  "guest_email": "string",
  "guest_phone": "string",
  "guest_organization": "string",
  "guest_type": "INTERVIEW_CANDIDATE",
  "purpose_of_visit": "INTERVIEW",
  "visit_status": "string",
  "host_user_id": "string",
  "host_name": "string",
  "host_email": "string",
  "start_time": "09:00:00",
  "end_time": "18:00:00",
  "desk_type": "string",
  "notes": "Created during API testing",
  "requires_seat": false,
  "amenities": [
    "string"
  ]
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.
- Use an available seat/date and confirm booking status, ownership, and audit/notification side effects.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.
- Unavailable/blocked seat, overlapping booking, or policy-window violation returns a deterministic 4xx conflict.

---

#### `GET /bookings/me/past` - Fetch My Past Bookings

**Purpose and behavior**

The web/mobile client or a tester uses this operation to fetch My Past Bookings.

The web/mobile client or a tester uses this operation to fetch My Past Bookings.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Book a Seat, My Bookings, dashboard booking cards, and delegated-booking flows.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. Results are restricted to the caller.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `bookings`, `seats`, `sites`, `buildings`, `floors`, `floor_layouts`, `blocked_seats`, `app_users`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `page` | no | `integer | null` | `1` | - |
| query | `limit` | no | `integer | null` | `20` | - |
| query | `seat_id` | no | `integer | null` | `1` | - |
| query | `booking_date` | no | `string | null` | `{{qaDate}}` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<BookingResponse> or PaginatedBookingResponse`.

Representative response shape:

```json
[
  {
    "activity_source": "string",
    "booking_id": "string",
    "tenant_id": "string",
    "booked_for_user_id": "string",
    "booked_for_guest_id": "string",
    "booked_by_user_id": "string",
    "booked_by_name": "string",
    "booked_by_email": "string",
    "booked_for_name": "string",
    "booked_for_email": "string",
    "booked_for_phone": "string",
    "booked_for_organization": "string",
    "guest_visit_id": "1",
    "booking_type": "EMPLOYEE",
    "seat_id": "1",
    "site_id": "1",
    "building_id": "1",
    "floor_id": "1",
    "seat_code": "A-101",
    "site_name": "string",
    "building_name": "string",
    "floor_name": "string",
    "booking_date": "{{qaDate}}",
    "booking_status": "string",
    "source_channel": "API",
    "check_in_at": "2030-01-15T09:00:00Z",
    "checked_out_at": "2030-01-15T09:00:00Z",
    "cancelled_at": "2030-01-15T09:00:00Z",
    "cancellation_reason": "string",
    "updated_user_id": "string",
    "updated_by_name": "string",
    "updated_by_email": "string",
    "modified_from_booking_id": "string",
    "modification_reason": "string",
    "is_modified": false,
    "created_at": "2030-01-15T09:00:00Z",
    "updated_at": "2030-01-15T09:00:00Z",
    "guest_name": "string",
    "guest_email": "string",
    "guest_phone": "string",
    "guest_organization": "string",
    "guest_type": "INTERVIEW_CANDIDATE",
    "purpose_of_visit": "INTERVIEW",
    "visit_status": "string",
    "host_user_id": "string",
    "host_name": "string",
    "host_email": "string",
    "start_time": "09:00:00",
    "end_time": "18:00:00",
    "desk_type": "string",
    "notes": "Created during API testing",
    "requires_seat": false,
    "amenities": [
      "string"
    ]
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.
- Use an available seat/date and confirm booking status, ownership, and audit/notification side effects.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unavailable/blocked seat, overlapping booking, or policy-window violation returns a deterministic 4xx conflict.

---

#### `GET /bookings/me/current` - Fetch My Current Bookings

**Purpose and behavior**

The web/mobile client or a tester uses this operation to fetch My Current Bookings.

The web/mobile client or a tester uses this operation to fetch My Current Bookings.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Book a Seat, My Bookings, dashboard booking cards, and delegated-booking flows.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. Results are restricted to the caller.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `bookings`, `seats`, `sites`, `buildings`, `floors`, `floor_layouts`, `blocked_seats`, `app_users`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `seat_id` | no | `integer | null` | `1` | - |
| query | `booking_date` | no | `string | null` | `{{qaDate}}` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<BookingResponse>`.

Representative response shape:

```json
[
  {
    "activity_source": "string",
    "booking_id": "string",
    "tenant_id": "string",
    "booked_for_user_id": "string",
    "booked_for_guest_id": "string",
    "booked_by_user_id": "string",
    "booked_by_name": "string",
    "booked_by_email": "string",
    "booked_for_name": "string",
    "booked_for_email": "string",
    "booked_for_phone": "string",
    "booked_for_organization": "string",
    "guest_visit_id": "1",
    "booking_type": "EMPLOYEE",
    "seat_id": "1",
    "site_id": "1",
    "building_id": "1",
    "floor_id": "1",
    "seat_code": "A-101",
    "site_name": "string",
    "building_name": "string",
    "floor_name": "string",
    "booking_date": "{{qaDate}}",
    "booking_status": "string",
    "source_channel": "API",
    "check_in_at": "2030-01-15T09:00:00Z",
    "checked_out_at": "2030-01-15T09:00:00Z",
    "cancelled_at": "2030-01-15T09:00:00Z",
    "cancellation_reason": "string",
    "updated_user_id": "string",
    "updated_by_name": "string",
    "updated_by_email": "string",
    "modified_from_booking_id": "string",
    "modification_reason": "string",
    "is_modified": false,
    "created_at": "2030-01-15T09:00:00Z",
    "updated_at": "2030-01-15T09:00:00Z",
    "guest_name": "string",
    "guest_email": "string",
    "guest_phone": "string",
    "guest_organization": "string",
    "guest_type": "INTERVIEW_CANDIDATE",
    "purpose_of_visit": "INTERVIEW",
    "visit_status": "string",
    "host_user_id": "string",
    "host_name": "string",
    "host_email": "string",
    "start_time": "09:00:00",
    "end_time": "18:00:00",
    "desk_type": "string",
    "notes": "Created during API testing",
    "requires_seat": false,
    "amenities": [
      "string"
    ]
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.
- Use an available seat/date and confirm booking status, ownership, and audit/notification side effects.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unavailable/blocked seat, overlapping booking, or policy-window violation returns a deterministic 4xx conflict.

---

#### `GET /bookings/me/cancelled` - Fetch My Cancelled Bookings

**Purpose and behavior**

The web/mobile client or a tester uses this operation to fetch My Cancelled Bookings.

The web/mobile client or a tester uses this operation to fetch My Cancelled Bookings.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Book a Seat, My Bookings, dashboard booking cards, and delegated-booking flows.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. Results are restricted to the caller.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `bookings`, `seats`, `sites`, `buildings`, `floors`, `floor_layouts`, `blocked_seats`, `app_users`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `page` | no | `integer | null` | `1` | - |
| query | `limit` | no | `integer | null` | `20` | - |
| query | `seat_id` | no | `integer | null` | `1` | - |
| query | `booking_date` | no | `string | null` | `{{qaDate}}` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<BookingResponse> or PaginatedBookingResponse`.

Representative response shape:

```json
[
  {
    "activity_source": "string",
    "booking_id": "string",
    "tenant_id": "string",
    "booked_for_user_id": "string",
    "booked_for_guest_id": "string",
    "booked_by_user_id": "string",
    "booked_by_name": "string",
    "booked_by_email": "string",
    "booked_for_name": "string",
    "booked_for_email": "string",
    "booked_for_phone": "string",
    "booked_for_organization": "string",
    "guest_visit_id": "1",
    "booking_type": "EMPLOYEE",
    "seat_id": "1",
    "site_id": "1",
    "building_id": "1",
    "floor_id": "1",
    "seat_code": "A-101",
    "site_name": "string",
    "building_name": "string",
    "floor_name": "string",
    "booking_date": "{{qaDate}}",
    "booking_status": "string",
    "source_channel": "API",
    "check_in_at": "2030-01-15T09:00:00Z",
    "checked_out_at": "2030-01-15T09:00:00Z",
    "cancelled_at": "2030-01-15T09:00:00Z",
    "cancellation_reason": "string",
    "updated_user_id": "string",
    "updated_by_name": "string",
    "updated_by_email": "string",
    "modified_from_booking_id": "string",
    "modification_reason": "string",
    "is_modified": false,
    "created_at": "2030-01-15T09:00:00Z",
    "updated_at": "2030-01-15T09:00:00Z",
    "guest_name": "string",
    "guest_email": "string",
    "guest_phone": "string",
    "guest_organization": "string",
    "guest_type": "INTERVIEW_CANDIDATE",
    "purpose_of_visit": "INTERVIEW",
    "visit_status": "string",
    "host_user_id": "string",
    "host_name": "string",
    "host_email": "string",
    "start_time": "09:00:00",
    "end_time": "18:00:00",
    "desk_type": "string",
    "notes": "Created during API testing",
    "requires_seat": false,
    "amenities": [
      "string"
    ]
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.
- Use an available seat/date and confirm booking status, ownership, and audit/notification side effects.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unavailable/blocked seat, overlapping booking, or policy-window violation returns a deterministic 4xx conflict.

---

#### `GET /bookings/me/future` - Fetch My Future Bookings

**Purpose and behavior**

The web/mobile client or a tester uses this operation to fetch My Future Bookings.

The web/mobile client or a tester uses this operation to fetch My Future Bookings.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Book a Seat, My Bookings, dashboard booking cards, and delegated-booking flows.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE. Results are restricted to the caller.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `bookings`, `seats`, `sites`, `buildings`, `floors`, `floor_layouts`, `blocked_seats`, `app_users`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `page` | no | `integer | null` | `1` | - |
| query | `limit` | no | `integer | null` | `20` | - |
| query | `seat_id` | no | `integer | null` | `1` | - |
| query | `booking_date` | no | `string | null` | `{{qaDate}}` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<BookingResponse> or PaginatedBookingResponse`.

Representative response shape:

```json
[
  {
    "activity_source": "string",
    "booking_id": "string",
    "tenant_id": "string",
    "booked_for_user_id": "string",
    "booked_for_guest_id": "string",
    "booked_by_user_id": "string",
    "booked_by_name": "string",
    "booked_by_email": "string",
    "booked_for_name": "string",
    "booked_for_email": "string",
    "booked_for_phone": "string",
    "booked_for_organization": "string",
    "guest_visit_id": "1",
    "booking_type": "EMPLOYEE",
    "seat_id": "1",
    "site_id": "1",
    "building_id": "1",
    "floor_id": "1",
    "seat_code": "A-101",
    "site_name": "string",
    "building_name": "string",
    "floor_name": "string",
    "booking_date": "{{qaDate}}",
    "booking_status": "string",
    "source_channel": "API",
    "check_in_at": "2030-01-15T09:00:00Z",
    "checked_out_at": "2030-01-15T09:00:00Z",
    "cancelled_at": "2030-01-15T09:00:00Z",
    "cancellation_reason": "string",
    "updated_user_id": "string",
    "updated_by_name": "string",
    "updated_by_email": "string",
    "modified_from_booking_id": "string",
    "modification_reason": "string",
    "is_modified": false,
    "created_at": "2030-01-15T09:00:00Z",
    "updated_at": "2030-01-15T09:00:00Z",
    "guest_name": "string",
    "guest_email": "string",
    "guest_phone": "string",
    "guest_organization": "string",
    "guest_type": "INTERVIEW_CANDIDATE",
    "purpose_of_visit": "INTERVIEW",
    "visit_status": "string",
    "host_user_id": "string",
    "host_name": "string",
    "host_email": "string",
    "start_time": "09:00:00",
    "end_time": "18:00:00",
    "desk_type": "string",
    "notes": "Created during API testing",
    "requires_seat": false,
    "amenities": [
      "string"
    ]
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.
- Use an available seat/date and confirm booking status, ownership, and audit/notification side effects.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unavailable/blocked seat, overlapping booking, or policy-window violation returns a deterministic 4xx conflict.

---

#### `POST /bookings/{booking_id}/cancel` - Cancel Booking

**Purpose and behavior**

The web/mobile client or a tester uses this operation to cancel Booking.

The web/mobile client or a tester uses this operation to cancel Booking.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Book a Seat, My Bookings, dashboard booking cards, and delegated-booking flows.
- **Effective role access:** TENANT_ADMIN, or the booking creator/subject regardless of role. FACILITATOR has no blanket edit bypass.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `bookings`, `seats`, `sites`, `buildings`, `floors`, `floor_layouts`, `blocked_seats`, `app_users`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `booking_id` | yes | `string` | `1` | - |

JSON request body, schema `CancelBookingRequest`:

```json
{
  "cancellation_reason": "string"
}
```

**Expected output**

Success returns **HTTP 200** using response schema `BookingResponse`.

Representative response shape:

```json
{
  "activity_source": "string",
  "booking_id": "string",
  "tenant_id": "string",
  "booked_for_user_id": "string",
  "booked_for_guest_id": "string",
  "booked_by_user_id": "string",
  "booked_by_name": "string",
  "booked_by_email": "string",
  "booked_for_name": "string",
  "booked_for_email": "string",
  "booked_for_phone": "string",
  "booked_for_organization": "string",
  "guest_visit_id": "1",
  "booking_type": "EMPLOYEE",
  "seat_id": "1",
  "site_id": "1",
  "building_id": "1",
  "floor_id": "1",
  "seat_code": "A-101",
  "site_name": "string",
  "building_name": "string",
  "floor_name": "string",
  "booking_date": "{{qaDate}}",
  "booking_status": "string",
  "source_channel": "API",
  "check_in_at": "2030-01-15T09:00:00Z",
  "checked_out_at": "2030-01-15T09:00:00Z",
  "cancelled_at": "2030-01-15T09:00:00Z",
  "cancellation_reason": "string",
  "updated_user_id": "string",
  "updated_by_name": "string",
  "updated_by_email": "string",
  "modified_from_booking_id": "string",
  "modification_reason": "string",
  "is_modified": false,
  "created_at": "2030-01-15T09:00:00Z",
  "updated_at": "2030-01-15T09:00:00Z",
  "guest_name": "string",
  "guest_email": "string",
  "guest_phone": "string",
  "guest_organization": "string",
  "guest_type": "INTERVIEW_CANDIDATE",
  "purpose_of_visit": "INTERVIEW",
  "visit_status": "string",
  "host_user_id": "string",
  "host_name": "string",
  "host_email": "string",
  "start_time": "09:00:00",
  "end_time": "18:00:00",
  "desk_type": "string",
  "notes": "Created during API testing",
  "requires_seat": false,
  "amenities": [
    "string"
  ]
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.
- Use an available seat/date and confirm booking status, ownership, and audit/notification side effects.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.
- Unavailable/blocked seat, overlapping booking, or policy-window violation returns a deterministic 4xx conflict.

---

#### `POST /bookings/{booking_id}/modify` - Modify Booking

**Purpose and behavior**

The web/mobile client or a tester uses this operation to modify Booking.

The web/mobile client or a tester uses this operation to modify Booking.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Book a Seat, My Bookings, dashboard booking cards, and delegated-booking flows.
- **Effective role access:** TENANT_ADMIN, or the booking creator/subject regardless of role. FACILITATOR has no blanket edit bypass.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `bookings`, `seats`, `sites`, `buildings`, `floors`, `floor_layouts`, `blocked_seats`, `app_users`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `booking_id` | yes | `string` | `1` | - |

JSON request body, schema `ModifyBookingRequest`:

```json
{
  "site_id": 1,
  "building_id": 1,
  "floor_id": 1,
  "seat_id": 1,
  "booking_date": "{{qaDate}}",
  "modification_reason": "USER_REQUEST"
}
```

**Expected output**

Success returns **HTTP 200** using response schema `BookingResponse`.

Representative response shape:

```json
{
  "activity_source": "string",
  "booking_id": "string",
  "tenant_id": "string",
  "booked_for_user_id": "string",
  "booked_for_guest_id": "string",
  "booked_by_user_id": "string",
  "booked_by_name": "string",
  "booked_by_email": "string",
  "booked_for_name": "string",
  "booked_for_email": "string",
  "booked_for_phone": "string",
  "booked_for_organization": "string",
  "guest_visit_id": "1",
  "booking_type": "EMPLOYEE",
  "seat_id": "1",
  "site_id": "1",
  "building_id": "1",
  "floor_id": "1",
  "seat_code": "A-101",
  "site_name": "string",
  "building_name": "string",
  "floor_name": "string",
  "booking_date": "{{qaDate}}",
  "booking_status": "string",
  "source_channel": "API",
  "check_in_at": "2030-01-15T09:00:00Z",
  "checked_out_at": "2030-01-15T09:00:00Z",
  "cancelled_at": "2030-01-15T09:00:00Z",
  "cancellation_reason": "string",
  "updated_user_id": "string",
  "updated_by_name": "string",
  "updated_by_email": "string",
  "modified_from_booking_id": "string",
  "modification_reason": "string",
  "is_modified": false,
  "created_at": "2030-01-15T09:00:00Z",
  "updated_at": "2030-01-15T09:00:00Z",
  "guest_name": "string",
  "guest_email": "string",
  "guest_phone": "string",
  "guest_organization": "string",
  "guest_type": "INTERVIEW_CANDIDATE",
  "purpose_of_visit": "INTERVIEW",
  "visit_status": "string",
  "host_user_id": "string",
  "host_name": "string",
  "host_email": "string",
  "start_time": "09:00:00",
  "end_time": "18:00:00",
  "desk_type": "string",
  "notes": "Created during API testing",
  "requires_seat": false,
  "amenities": [
    "string"
  ]
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.
- Use an available seat/date and confirm booking status, ownership, and audit/notification side effects.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.
- Unavailable/blocked seat, overlapping booking, or policy-window violation returns a deterministic 4xx conflict.

---

#### `POST /bookings/eligibility` - Booking Eligibility

**Purpose and behavior**

The booking UI checks policy and overlap rules before showing the final confirmation action.

The booking UI checks policy and overlap rules before showing the final confirmation action.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Book a Seat, My Bookings, dashboard booking cards, and delegated-booking flows.
- **Effective role access:** Any authenticated role for a self-booking; TENANT_ADMIN and FACILITATOR may also originate a booking for another employee.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `bookings`, `seats`, `sites`, `buildings`, `floors`, `floor_layouts`, `blocked_seats`, `app_users`, `audit_logs`

**Input contract**

No path or query parameters.

JSON request body, schema `BookingEligibilityRequest`:

```json
{
  "start_date": "{{qaDate}}",
  "end_date": "{{qaEndDate}}",
  "is_guest_booking": false,
  "booked_for_user_id": 1,
  "booked_for_guest_id": 1,
  "exclude_booking_id": "string",
  "seat_id": 1
}
```

**Expected output**

Success returns **HTTP 200** using response schema `BookingEligibilityResponse`.

Representative response shape:

```json
{
  "eligible": false,
  "message": "Show me available seats for next Monday"
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.
- Use an available seat/date and confirm booking status, ownership, and audit/notification side effects.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.
- Unavailable/blocked seat, overlapping booking, or policy-window violation returns a deterministic 4xx conflict.

---

#### `GET /bookings/delegated/past` - Fetch Delegated Past

**Purpose and behavior**

The web/mobile client or a tester uses this operation to fetch Delegated Past.

The web/mobile client or a tester uses this operation to fetch Delegated Past.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Book a Seat, My Bookings, dashboard booking cards, and delegated-booking flows.
- **Effective role access:** TENANT_ADMIN and FACILITATOR only.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `bookings`, `seats`, `sites`, `buildings`, `floors`, `floor_layouts`, `blocked_seats`, `app_users`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `page` | no | `integer | null` | `1` | - |
| query | `limit` | no | `integer | null` | `20` | - |
| query | `seat_id` | no | `integer | null` | `1` | - |
| query | `booking_date` | no | `string | null` | `{{qaDate}}` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<BookingResponse> or PaginatedBookingResponse`.

Representative response shape:

```json
[
  {
    "activity_source": "string",
    "booking_id": "string",
    "tenant_id": "string",
    "booked_for_user_id": "string",
    "booked_for_guest_id": "string",
    "booked_by_user_id": "string",
    "booked_by_name": "string",
    "booked_by_email": "string",
    "booked_for_name": "string",
    "booked_for_email": "string",
    "booked_for_phone": "string",
    "booked_for_organization": "string",
    "guest_visit_id": "1",
    "booking_type": "EMPLOYEE",
    "seat_id": "1",
    "site_id": "1",
    "building_id": "1",
    "floor_id": "1",
    "seat_code": "A-101",
    "site_name": "string",
    "building_name": "string",
    "floor_name": "string",
    "booking_date": "{{qaDate}}",
    "booking_status": "string",
    "source_channel": "API",
    "check_in_at": "2030-01-15T09:00:00Z",
    "checked_out_at": "2030-01-15T09:00:00Z",
    "cancelled_at": "2030-01-15T09:00:00Z",
    "cancellation_reason": "string",
    "updated_user_id": "string",
    "updated_by_name": "string",
    "updated_by_email": "string",
    "modified_from_booking_id": "string",
    "modification_reason": "string",
    "is_modified": false,
    "created_at": "2030-01-15T09:00:00Z",
    "updated_at": "2030-01-15T09:00:00Z",
    "guest_name": "string",
    "guest_email": "string",
    "guest_phone": "string",
    "guest_organization": "string",
    "guest_type": "INTERVIEW_CANDIDATE",
    "purpose_of_visit": "INTERVIEW",
    "visit_status": "string",
    "host_user_id": "string",
    "host_name": "string",
    "host_email": "string",
    "start_time": "09:00:00",
    "end_time": "18:00:00",
    "desk_type": "string",
    "notes": "Created during API testing",
    "requires_seat": false,
    "amenities": [
      "string"
    ]
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.
- Use an available seat/date and confirm booking status, ownership, and audit/notification side effects.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unavailable/blocked seat, overlapping booking, or policy-window violation returns a deterministic 4xx conflict.

---

#### `GET /bookings/delegated/current` - Fetch Delegated Current

**Purpose and behavior**

The web/mobile client or a tester uses this operation to fetch Delegated Current.

The web/mobile client or a tester uses this operation to fetch Delegated Current.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Book a Seat, My Bookings, dashboard booking cards, and delegated-booking flows.
- **Effective role access:** TENANT_ADMIN and FACILITATOR only.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `bookings`, `seats`, `sites`, `buildings`, `floors`, `floor_layouts`, `blocked_seats`, `app_users`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `page` | no | `integer | null` | `1` | - |
| query | `limit` | no | `integer | null` | `20` | - |
| query | `seat_id` | no | `integer | null` | `1` | - |
| query | `booking_date` | no | `string | null` | `{{qaDate}}` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<BookingResponse> or PaginatedBookingResponse`.

Representative response shape:

```json
[
  {
    "activity_source": "string",
    "booking_id": "string",
    "tenant_id": "string",
    "booked_for_user_id": "string",
    "booked_for_guest_id": "string",
    "booked_by_user_id": "string",
    "booked_by_name": "string",
    "booked_by_email": "string",
    "booked_for_name": "string",
    "booked_for_email": "string",
    "booked_for_phone": "string",
    "booked_for_organization": "string",
    "guest_visit_id": "1",
    "booking_type": "EMPLOYEE",
    "seat_id": "1",
    "site_id": "1",
    "building_id": "1",
    "floor_id": "1",
    "seat_code": "A-101",
    "site_name": "string",
    "building_name": "string",
    "floor_name": "string",
    "booking_date": "{{qaDate}}",
    "booking_status": "string",
    "source_channel": "API",
    "check_in_at": "2030-01-15T09:00:00Z",
    "checked_out_at": "2030-01-15T09:00:00Z",
    "cancelled_at": "2030-01-15T09:00:00Z",
    "cancellation_reason": "string",
    "updated_user_id": "string",
    "updated_by_name": "string",
    "updated_by_email": "string",
    "modified_from_booking_id": "string",
    "modification_reason": "string",
    "is_modified": false,
    "created_at": "2030-01-15T09:00:00Z",
    "updated_at": "2030-01-15T09:00:00Z",
    "guest_name": "string",
    "guest_email": "string",
    "guest_phone": "string",
    "guest_organization": "string",
    "guest_type": "INTERVIEW_CANDIDATE",
    "purpose_of_visit": "INTERVIEW",
    "visit_status": "string",
    "host_user_id": "string",
    "host_name": "string",
    "host_email": "string",
    "start_time": "09:00:00",
    "end_time": "18:00:00",
    "desk_type": "string",
    "notes": "Created during API testing",
    "requires_seat": false,
    "amenities": [
      "string"
    ]
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.
- Use an available seat/date and confirm booking status, ownership, and audit/notification side effects.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unavailable/blocked seat, overlapping booking, or policy-window violation returns a deterministic 4xx conflict.

---

#### `GET /bookings/delegated/future` - Fetch Delegated Future

**Purpose and behavior**

The web/mobile client or a tester uses this operation to fetch Delegated Future.

The web/mobile client or a tester uses this operation to fetch Delegated Future.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Book a Seat, My Bookings, dashboard booking cards, and delegated-booking flows.
- **Effective role access:** TENANT_ADMIN and FACILITATOR only.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `bookings`, `seats`, `sites`, `buildings`, `floors`, `floor_layouts`, `blocked_seats`, `app_users`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `page` | no | `integer | null` | `1` | - |
| query | `limit` | no | `integer | null` | `20` | - |
| query | `seat_id` | no | `integer | null` | `1` | - |
| query | `booking_date` | no | `string | null` | `{{qaDate}}` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<BookingResponse> or PaginatedBookingResponse`.

Representative response shape:

```json
[
  {
    "activity_source": "string",
    "booking_id": "string",
    "tenant_id": "string",
    "booked_for_user_id": "string",
    "booked_for_guest_id": "string",
    "booked_by_user_id": "string",
    "booked_by_name": "string",
    "booked_by_email": "string",
    "booked_for_name": "string",
    "booked_for_email": "string",
    "booked_for_phone": "string",
    "booked_for_organization": "string",
    "guest_visit_id": "1",
    "booking_type": "EMPLOYEE",
    "seat_id": "1",
    "site_id": "1",
    "building_id": "1",
    "floor_id": "1",
    "seat_code": "A-101",
    "site_name": "string",
    "building_name": "string",
    "floor_name": "string",
    "booking_date": "{{qaDate}}",
    "booking_status": "string",
    "source_channel": "API",
    "check_in_at": "2030-01-15T09:00:00Z",
    "checked_out_at": "2030-01-15T09:00:00Z",
    "cancelled_at": "2030-01-15T09:00:00Z",
    "cancellation_reason": "string",
    "updated_user_id": "string",
    "updated_by_name": "string",
    "updated_by_email": "string",
    "modified_from_booking_id": "string",
    "modification_reason": "string",
    "is_modified": false,
    "created_at": "2030-01-15T09:00:00Z",
    "updated_at": "2030-01-15T09:00:00Z",
    "guest_name": "string",
    "guest_email": "string",
    "guest_phone": "string",
    "guest_organization": "string",
    "guest_type": "INTERVIEW_CANDIDATE",
    "purpose_of_visit": "INTERVIEW",
    "visit_status": "string",
    "host_user_id": "string",
    "host_name": "string",
    "host_email": "string",
    "start_time": "09:00:00",
    "end_time": "18:00:00",
    "desk_type": "string",
    "notes": "Created during API testing",
    "requires_seat": false,
    "amenities": [
      "string"
    ]
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.
- Use an available seat/date and confirm booking status, ownership, and audit/notification side effects.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unavailable/blocked seat, overlapping booking, or policy-window violation returns a deterministic 4xx conflict.

---

#### `GET /bookings/delegated/cancelled` - Fetch Delegated Cancelled

**Purpose and behavior**

The web/mobile client or a tester uses this operation to fetch Delegated Cancelled.

The web/mobile client or a tester uses this operation to fetch Delegated Cancelled.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Book a Seat, My Bookings, dashboard booking cards, and delegated-booking flows.
- **Effective role access:** TENANT_ADMIN and FACILITATOR only.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `bookings`, `seats`, `sites`, `buildings`, `floors`, `floor_layouts`, `blocked_seats`, `app_users`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `page` | no | `integer | null` | `1` | - |
| query | `limit` | no | `integer | null` | `20` | - |
| query | `seat_id` | no | `integer | null` | `1` | - |
| query | `booking_date` | no | `string | null` | `{{qaDate}}` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<BookingResponse> or PaginatedBookingResponse`.

Representative response shape:

```json
[
  {
    "activity_source": "string",
    "booking_id": "string",
    "tenant_id": "string",
    "booked_for_user_id": "string",
    "booked_for_guest_id": "string",
    "booked_by_user_id": "string",
    "booked_by_name": "string",
    "booked_by_email": "string",
    "booked_for_name": "string",
    "booked_for_email": "string",
    "booked_for_phone": "string",
    "booked_for_organization": "string",
    "guest_visit_id": "1",
    "booking_type": "EMPLOYEE",
    "seat_id": "1",
    "site_id": "1",
    "building_id": "1",
    "floor_id": "1",
    "seat_code": "A-101",
    "site_name": "string",
    "building_name": "string",
    "floor_name": "string",
    "booking_date": "{{qaDate}}",
    "booking_status": "string",
    "source_channel": "API",
    "check_in_at": "2030-01-15T09:00:00Z",
    "checked_out_at": "2030-01-15T09:00:00Z",
    "cancelled_at": "2030-01-15T09:00:00Z",
    "cancellation_reason": "string",
    "updated_user_id": "string",
    "updated_by_name": "string",
    "updated_by_email": "string",
    "modified_from_booking_id": "string",
    "modification_reason": "string",
    "is_modified": false,
    "created_at": "2030-01-15T09:00:00Z",
    "updated_at": "2030-01-15T09:00:00Z",
    "guest_name": "string",
    "guest_email": "string",
    "guest_phone": "string",
    "guest_organization": "string",
    "guest_type": "INTERVIEW_CANDIDATE",
    "purpose_of_visit": "INTERVIEW",
    "visit_status": "string",
    "host_user_id": "string",
    "host_name": "string",
    "host_email": "string",
    "start_time": "09:00:00",
    "end_time": "18:00:00",
    "desk_type": "string",
    "notes": "Created during API testing",
    "requires_seat": false,
    "amenities": [
      "string"
    ]
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.
- Use an available seat/date and confirm booking status, ownership, and audit/notification side effects.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unavailable/blocked seat, overlapping booking, or policy-window violation returns a deterministic 4xx conflict.

---

### business-rules

#### `GET /business-rules/chatbot-policy` - Chatbot Policy

**Purpose and behavior**

The web/mobile client or a tester uses this operation to chatbot Policy.

The web/mobile client or a tester uses this operation to chatbot Policy.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Admin Configuration and policy-aware booking/layout screens.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `business_rules`, `tenant_business_rules`

**Input contract**

No path or query parameters.

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `ChatbotPolicyResponse`.

Representative response shape:

```json
{
  "employee_access_enabled": false
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `GET /business-rules/booking-policy` - Booking Policy

**Purpose and behavior**

The web/mobile client or a tester uses this operation to booking Policy.

The web/mobile client or a tester uses this operation to booking Policy.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Admin Configuration and policy-aware booking/layout screens.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `business_rules`, `tenant_business_rules`

**Input contract**

No path or query parameters.

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `BookingPolicyResponse`.

Representative response shape:

```json
{
  "employee_max_advance_days": 1,
  "guest_max_advance_days": 1
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `GET /business-rules/layout-policy` - Layout Policy

**Purpose and behavior**

The web/mobile client or a tester uses this operation to layout Policy.

The web/mobile client or a tester uses this operation to layout Policy.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Admin Configuration and policy-aware booking/layout screens.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `business_rules`, `tenant_business_rules`

**Input contract**

No path or query parameters.

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `LayoutPolicyResponse`.

Representative response shape:

```json
{
  "employee_max_advance_days": 1,
  "buffer_days": 1,
  "min_advance_days": 1,
  "visibility_days": {
    "draft": 1,
    "archived": 1,
    "deleted": 1
  }
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `GET /business-rules/activity-policy` - Activity Policy

**Purpose and behavior**

The web/mobile client or a tester uses this operation to activity Policy.

The web/mobile client or a tester uses this operation to activity Policy.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Admin Configuration and policy-aware booking/layout screens.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `business_rules`, `tenant_business_rules`

**Input contract**

No path or query parameters.

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `ActivityPolicyResponse`.

Representative response shape:

```json
{
  "record_count": 1
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `GET /business-rules/blocked-seat-policy` - Blocked Seat Policy

**Purpose and behavior**

The web/mobile client or a tester uses this operation to blocked Seat Policy.

The web/mobile client or a tester uses this operation to blocked Seat Policy.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Admin Configuration and policy-aware booking/layout screens.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `business_rules`, `tenant_business_rules`

**Input contract**

No path or query parameters.

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `BlockedSeatPolicyResponse`.

Representative response shape:

```json
{
  "upcoming_days": 1,
  "expiring_soon_days": 1,
  "expired_window_days": 1,
  "max_advance_days": 1
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `POST /business-rules` - Update Business Rules

**Purpose and behavior**

The web/mobile client or a tester uses this operation to update Business Rules.

The web/mobile client or a tester uses this operation to update Business Rules.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Admin Configuration and policy-aware booking/layout screens.
- **Effective role access:** TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + admin_dashboard:view
- **Primary feature tables:** `business_rules`, `tenant_business_rules`

**Input contract**

No path or query parameters.

JSON request body, schema `UpdateBusinessRulesRequest`:

```json
{
  "updates": [
    {
      "id": "booking_policy.employee_max_advance_days",
      "value": 30
    }
  ]
}
```

**Expected output**

Success returns **HTTP 200** using response schema `BusinessRulesResponse`.

Representative response shape:

```json
{
  "booking_policy": {
    "employee_max_advance_days": 1,
    "guest_max_advance_days": 1
  },
  "layout_policy": {
    "employee_max_advance_days": 1,
    "buffer_days": 1,
    "min_advance_days": 1,
    "visibility_days": {
      "draft": 1,
      "archived": 1,
      "deleted": 1
    }
  },
  "activity_policy": {
    "record_count": 1
  },
  "blocked_seat_policy": {
    "upcoming_days": 1,
    "expiring_soon_days": 1,
    "expired_window_days": 1,
    "max_advance_days": 1
  },
  "chatbot_policy": {
    "employee_access_enabled": false
  }
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.
- Send one or several supported dotted setting IDs and verify the full resolved policy document is returned.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown dotted setting ID or wrong value type returns 400; an empty updates list returns 422.
- A multi-item update is not atomic: if a later item fails, verify any earlier committed item remains applied and report that result clearly.

---

### chat

#### `POST /api/chat/session` - Create Session

**Purpose and behavior**

The web/mobile client or a tester uses this operation to create Session.

The web/mobile client or a tester uses this operation to create Session.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: the authenticated employee chatbot panel.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; sessions remain user- and tenant-owned.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `chatbot_sessions`, `chatbot_messages`

**Input contract**

No path or query parameters.

JSON request body, schema `CreateSessionRequest`:

```json
{
  "user_name": "string"
}
```

**Expected output**

Success returns **HTTP 201** using response schema `SessionOut`.

Representative response shape:

```json
{
  "session_id": "string",
  "user_name": "string",
  "current_node": "string",
  "state": "string",
  "initial_response": {
    "session_id": "string",
    "current_node": "string",
    "state": "string",
    "messages": [
      {
        "type": "TEXT",
        "text": "string",
        "options": [
          {
            "number": 1,
            "label": "string",
            "value": "string"
          }
        ],
        "form_card": {
          "title": "string",
          "subtitle": "string",
          "node": "string",
          "fields": [
            {
              "key": "string",
              "label": "string",
              "field_type": "string",
              "required": true,
              "options": [
                null
              ],
              "default_value": "string",
              "lookup_endpoint": "string",
              "depends_on": "string",
              "min_value": 1,
              "max_value": 1,
              "min_date": "string",
              "max_date": "string",
              "placeholder": "string"
            }
          ],
          "submit_label": "Continue"
        },
        "seat_list": {
          "seats": [
            {
              "id": 1,
              "seat_code": "A-101",
              "seat_type": "string",
              "seat_neighborhood": "string",
              "amenities": [],
              "is_available": true,
              "x": 1.0,
              "y": 1.0
            }
          ],
          "seat_catalog": [],
          "total": 1,
          "floor_name": "string",
          "building_name": "string",
          "headcount": 1
        },
        "confirmation": {
          "booking_date": "{{qaDate}}",
          "site_name": "string",
          "building_name": "string",
          "floor_name": "string",
          "seat_code": "A-101",
          "seat_type": "string",
          "headcount": 1,
          "amenities": [
            "string"
          ]
        },
        "success": {
          "booking_ref": "string",
          "booking_date": "{{qaDate}}",
          "seat_code": "A-101",
          "site_name": "string",
          "message": "Show me available seats for next Monday"
        },
        "quick_book": {
          "prompt": "string",
          "last_seat_code": "string",
          "last_site": "string",
          "last_building": "string",
          "last_floor": "string",
          "last_seat_type": "string"
        },
        "booking_list": {
          "bookings": [
            {
              "booking_id": "string",
              "booking_ref": "string",
              "booking_date": "{{qaDate}}",
              "site_name": "string",
              "building_name": "string",
              "floor_name": "string",
              "seat_code": "A-101",
              "seat_type": "string",
              "status": "ACTIVE",
              "can_modify": true,
              "can_cancel": true,
              "can_rebook": false
            }
          ],
          "total": 1,
          "mode": "upcoming"
        },
        "rebook_calendar": {
          "booking_id": "string",
          "seat_code": "A-101",
          "site_name": "string",
          "building_name": "string",
          "floor_name": "string",
          "month_start": "string",
          "previous_month_start": "string",
          "next_month_start": "string",
          "days": [
            {
              "date": "{{qaDate}}",
              "available": false,
              "selectable": true,
              "reserved": false,
              "reserved_seat_available": false
            }
          ]
        }
      }
    ]
  }
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.
- Verify the session is usable only by its creating user and tenant and that messages persist in order.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `POST /api/chat/session/{session_id}/message` - Send Message

**Purpose and behavior**

The web/mobile client or a tester uses this operation to send Message.

The web/mobile client or a tester uses this operation to send Message.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: the authenticated employee chatbot panel.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; sessions remain user- and tenant-owned.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `chatbot_sessions`, `chatbot_messages`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `session_id` | yes | `string` | `00000000-0000-4000-8000-000000000001` | - |

JSON request body, schema `UserMessage`:

```json
{
  "text": "string",
  "form_data": {},
  "message_type": "TEXT"
}
```

**Expected output**

Success returns **HTTP 200** using response schema `ChatResponse`.

Representative response shape:

```json
{
  "session_id": "string",
  "current_node": "string",
  "state": "string",
  "messages": [
    {
      "type": "TEXT",
      "text": "string",
      "options": [
        {
          "number": 1,
          "label": "string",
          "value": "string"
        }
      ],
      "form_card": {
        "title": "string",
        "subtitle": "string",
        "node": "string",
        "fields": [
          {
            "key": "string",
            "label": "string",
            "field_type": "string",
            "required": true,
            "options": [
              {}
            ],
            "default_value": "string",
            "lookup_endpoint": "string",
            "depends_on": "string",
            "min_value": 1,
            "max_value": 1,
            "min_date": "string",
            "max_date": "string",
            "placeholder": "string"
          }
        ],
        "submit_label": "Continue"
      },
      "seat_list": {
        "seats": [
          {
            "id": 1,
            "seat_code": "A-101",
            "seat_type": "string",
            "seat_neighborhood": "string",
            "amenities": [],
            "is_available": true,
            "x": 1.0,
            "y": 1.0
          }
        ],
        "seat_catalog": [],
        "total": 1,
        "floor_name": "string",
        "building_name": "string",
        "headcount": 1
      },
      "confirmation": {
        "booking_date": "{{qaDate}}",
        "site_name": "string",
        "building_name": "string",
        "floor_name": "string",
        "seat_code": "A-101",
        "seat_type": "string",
        "headcount": 1,
        "amenities": [
          "string"
        ]
      },
      "success": {
        "booking_ref": "string",
        "booking_date": "{{qaDate}}",
        "seat_code": "A-101",
        "site_name": "string",
        "message": "Show me available seats for next Monday"
      },
      "quick_book": {
        "prompt": "string",
        "last_seat_code": "string",
        "last_site": "string",
        "last_building": "string",
        "last_floor": "string",
        "last_seat_type": "string"
      },
      "booking_list": {
        "bookings": [
          {
            "booking_id": "string",
            "booking_ref": "string",
            "booking_date": "{{qaDate}}",
            "site_name": "string",
            "building_name": "string",
            "floor_name": "string",
            "seat_code": "A-101",
            "seat_type": "string",
            "status": "ACTIVE",
            "can_modify": true,
            "can_cancel": true,
            "can_rebook": false
          }
        ],
        "total": 1,
        "mode": "upcoming"
      },
      "rebook_calendar": {
        "booking_id": "string",
        "seat_code": "A-101",
        "site_name": "string",
        "building_name": "string",
        "floor_name": "string",
        "month_start": "string",
        "previous_month_start": "string",
        "next_month_start": "string",
        "days": [
          {
            "date": "{{qaDate}}",
            "available": false,
            "selectable": true,
            "reserved": false,
            "reserved_seat_available": false
          }
        ]
      }
    }
  ]
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.
- Verify the session is usable only by its creating user and tenant and that messages persist in order.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.
- Missing, expired, or another user's session returns 404.

---

#### `GET /api/chat/session/{session_id}` - Get Session

**Purpose and behavior**

The web/mobile client or a tester uses this operation to get Session.

The web/mobile client or a tester uses this operation to get Session.

- **Lifecycle:** FUTURE SCOPE - Planned chat-session resume feature; the current chat panel keeps session state client-side.
- **Where used:** No current frontend caller. Planned chat-session resume feature; the current chat panel keeps session state client-side.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; sessions remain user- and tenant-owned.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `chatbot_sessions`, `chatbot_messages`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `session_id` | yes | `string` | `00000000-0000-4000-8000-000000000001` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `SessionOut`.

Representative response shape:

```json
{
  "session_id": "string",
  "user_name": "string",
  "current_node": "string",
  "state": "string",
  "initial_response": {
    "session_id": "string",
    "current_node": "string",
    "state": "string",
    "messages": [
      {
        "type": "TEXT",
        "text": "string",
        "options": [
          {
            "number": 1,
            "label": "string",
            "value": "string"
          }
        ],
        "form_card": {
          "title": "string",
          "subtitle": "string",
          "node": "string",
          "fields": [
            {
              "key": "string",
              "label": "string",
              "field_type": "string",
              "required": true,
              "options": [
                null
              ],
              "default_value": "string",
              "lookup_endpoint": "string",
              "depends_on": "string",
              "min_value": 1,
              "max_value": 1,
              "min_date": "string",
              "max_date": "string",
              "placeholder": "string"
            }
          ],
          "submit_label": "Continue"
        },
        "seat_list": {
          "seats": [
            {
              "id": 1,
              "seat_code": "A-101",
              "seat_type": "string",
              "seat_neighborhood": "string",
              "amenities": [],
              "is_available": true,
              "x": 1.0,
              "y": 1.0
            }
          ],
          "seat_catalog": [],
          "total": 1,
          "floor_name": "string",
          "building_name": "string",
          "headcount": 1
        },
        "confirmation": {
          "booking_date": "{{qaDate}}",
          "site_name": "string",
          "building_name": "string",
          "floor_name": "string",
          "seat_code": "A-101",
          "seat_type": "string",
          "headcount": 1,
          "amenities": [
            "string"
          ]
        },
        "success": {
          "booking_ref": "string",
          "booking_date": "{{qaDate}}",
          "seat_code": "A-101",
          "site_name": "string",
          "message": "Show me available seats for next Monday"
        },
        "quick_book": {
          "prompt": "string",
          "last_seat_code": "string",
          "last_site": "string",
          "last_building": "string",
          "last_floor": "string",
          "last_seat_type": "string"
        },
        "booking_list": {
          "bookings": [
            {
              "booking_id": "string",
              "booking_ref": "string",
              "booking_date": "{{qaDate}}",
              "site_name": "string",
              "building_name": "string",
              "floor_name": "string",
              "seat_code": "A-101",
              "seat_type": "string",
              "status": "ACTIVE",
              "can_modify": true,
              "can_cancel": true,
              "can_rebook": false
            }
          ],
          "total": 1,
          "mode": "upcoming"
        },
        "rebook_calendar": {
          "booking_id": "string",
          "seat_code": "A-101",
          "site_name": "string",
          "building_name": "string",
          "floor_name": "string",
          "month_start": "string",
          "previous_month_start": "string",
          "next_month_start": "string",
          "days": [
            {
              "date": "{{qaDate}}",
              "available": false,
              "selectable": true,
              "reserved": false,
              "reserved_seat_available": false
            }
          ]
        }
      }
    ]
  }
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.
- Verify the session is usable only by its creating user and tenant and that messages persist in order.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Missing, expired, or another user's session returns 404.

---

### guests

#### `GET /guests` - Search Guest Records

**Purpose and behavior**

The web/mobile client or a tester uses this operation to search Guest Records.

The web/mobile client or a tester uses this operation to search Guest Records.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: guest directory and guest-management workflows.
- **Effective role access:** TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule).
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `guests`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `q` | yes | `string` | `test` | minLength=1 |
| query | `include_inactive` | no | `boolean` | `false` | - |
| query | `limit` | no | `integer` | `20` | minimum=1; maximum=100 |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<GuestResponse>`.

Representative response shape:

```json
[
  {
    "guest_id": "1",
    "tenant_id": "string",
    "full_name": "Test User",
    "email": "tester@example.com",
    "phone": "+919876543210",
    "organization": "string",
    "status": "ACTIVE",
    "created_at": "2030-01-15T09:00:00Z",
    "updated_at": "2030-01-15T09:00:00Z"
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `POST /guests` - Create Guest Record

**Purpose and behavior**

The web/mobile client or a tester uses this operation to create Guest Record.

The web/mobile client or a tester uses this operation to create Guest Record.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: guest directory and guest-management workflows.
- **Effective role access:** TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule).
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `guests`, `audit_logs`

**Input contract**

No path or query parameters.

JSON request body, schema `CreateGuestRequest`:

```json
{
  "full_name": "Test User",
  "email": "tester@example.com",
  "phone": "+919876543210",
  "organization": "string"
}
```

**Expected output**

Success returns **HTTP 201** using response schema `GuestResponse`.

Representative response shape:

```json
{
  "guest_id": "1",
  "tenant_id": "string",
  "full_name": "Test User",
  "email": "tester@example.com",
  "phone": "+919876543210",
  "organization": "string",
  "status": "ACTIVE",
  "created_at": "2030-01-15T09:00:00Z",
  "updated_at": "2030-01-15T09:00:00Z"
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `GET /guests/{guest_id}` - Fetch Guest Record

**Purpose and behavior**

The web/mobile client or a tester uses this operation to fetch Guest Record.

The web/mobile client or a tester uses this operation to fetch Guest Record.

- **Lifecycle:** FUTURE SCOPE - Planned guest-detail and overseer screen.
- **Where used:** No current frontend caller. Planned guest-detail and overseer screen.
- **Effective role access:** TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule).
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `guests`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `guest_id` | yes | `integer` | `1` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `GuestResponse`.

Representative response shape:

```json
{
  "guest_id": "1",
  "tenant_id": "string",
  "full_name": "Test User",
  "email": "tester@example.com",
  "phone": "+919876543210",
  "organization": "string",
  "status": "ACTIVE",
  "created_at": "2030-01-15T09:00:00Z",
  "updated_at": "2030-01-15T09:00:00Z"
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.

---

#### `PATCH /guests/{guest_id}` - Update Guest Record

**Purpose and behavior**

The web/mobile client or a tester uses this operation to update Guest Record.

The web/mobile client or a tester uses this operation to update Guest Record.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: guest directory and guest-management workflows.
- **Effective role access:** TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule).
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `guests`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `guest_id` | yes | `integer` | `1` | - |

JSON request body, schema `UpdateGuestRequest`:

```json
{
  "full_name": "Test User",
  "email": "tester@example.com",
  "phone": "+919876543210",
  "organization": "string"
}
```

**Expected output**

Success returns **HTTP 200** using response schema `GuestResponse`.

Representative response shape:

```json
{
  "guest_id": "1",
  "tenant_id": "string",
  "full_name": "Test User",
  "email": "tester@example.com",
  "phone": "+919876543210",
  "organization": "string",
  "status": "ACTIVE",
  "created_at": "2030-01-15T09:00:00Z",
  "updated_at": "2030-01-15T09:00:00Z"
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `PATCH /guests/{guest_id}/status` - Update Guest Status Record

**Purpose and behavior**

The web/mobile client or a tester uses this operation to update Guest Status Record.

The web/mobile client or a tester uses this operation to update Guest Status Record.

- **Lifecycle:** FUTURE SCOPE - Planned guest blacklist/reactivation control; no UI exists yet.
- **Where used:** No current frontend caller. Planned guest blacklist/reactivation control; no UI exists yet.
- **Effective role access:** TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule).
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `guests`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `guest_id` | yes | `integer` | `1` | - |

JSON request body, schema `UpdateGuestStatusRequest`:

```json
{
  "status": "ACTIVE",
  "cancel_future_bookings": false
}
```

**Expected output**

Success returns **HTTP 200** using response schema `GuestResponse`.

Representative response shape:

```json
{
  "guest_id": "1",
  "tenant_id": "string",
  "full_name": "Test User",
  "email": "tester@example.com",
  "phone": "+919876543210",
  "organization": "string",
  "status": "ACTIVE",
  "created_at": "2030-01-15T09:00:00Z",
  "updated_at": "2030-01-15T09:00:00Z"
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `GET /guests/{guest_id}/visits` - Fetch Guest Visit History Record

**Purpose and behavior**

The web/mobile client or a tester uses this operation to fetch Guest Visit History Record.

The web/mobile client or a tester uses this operation to fetch Guest Visit History Record.

- **Lifecycle:** FUTURE SCOPE - Planned admin/facilitator guest visit-history view.
- **Where used:** No current frontend caller. Planned admin/facilitator guest visit-history view.
- **Effective role access:** TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule).
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `guests`, `guest_visits`, `bookings`, `seats`, `sites`, `buildings`, `floors`, `app_users`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `guest_id` | yes | `integer` | `1` | - |
| query | `page` | no | `integer` | `1` | minimum=1 |
| query | `limit` | no | `integer` | `20` | minimum=1; maximum=100 |
| query | `include_cancelled` | no | `boolean` | `false` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `GuestVisitHistoryResponse`.

Representative response shape:

```json
{
  "guest": {
    "guest_id": "1",
    "tenant_id": "string",
    "full_name": "Test User",
    "email": "tester@example.com",
    "phone": "+919876543210",
    "organization": "string",
    "status": "ACTIVE",
    "created_at": "2030-01-15T09:00:00Z",
    "updated_at": "2030-01-15T09:00:00Z"
  },
  "summary": {
    "total_visits": 0,
    "total_bookings": 0,
    "scheduled": 0,
    "checked_in": 0,
    "checked_out": 0,
    "cancelled": 0,
    "modified": 0,
    "requires_seat_count": 0
  },
  "items": [
    {
      "guest_visit_id": "1",
      "visit_date": "{{qaDate}}",
      "visit_status": "SCHEDULED",
      "guest_type": "string",
      "purpose_of_visit": "string",
      "start_time": "09:00:00",
      "end_time": "18:00:00",
      "notes": "Created during API testing",
      "requires_seat": false,
      "checked_in_at": "2030-01-15T09:00:00Z",
      "checked_out_at": "2030-01-15T09:00:00Z",
      "cancelled_at": "2030-01-15T09:00:00Z",
      "cancellation_reason": "string",
      "host_user_id": "string",
      "host_name": "string",
      "host_email": "string",
      "site_id": "1",
      "site_name": "string",
      "building_id": "1",
      "building_name": "string",
      "floor_id": "1",
      "floor_name": "string",
      "booking_id": "string",
      "booking_status": "string",
      "seat_id": "1",
      "seat_code": "A-101",
      "booking_date": "{{qaDate}}"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "total_pages": 1
  }
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.

---

### guest-visits

#### `GET /guest-visits` - Get Guest Visits

**Purpose and behavior**

The web/mobile client or a tester uses this operation to get Guest Visits.

The web/mobile client or a tester uses this operation to get Guest Visits.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: guest invitation, reception/security dashboard, and guest workflow actions.
- **Effective role access:** Roles currently granted guest:view_visits: TENANT_ADMIN, FACILITATOR, and FRONT_OFFICE. FRONT_OFFICE is clamped to today's visits.
- **Route gate:** Bearer/access cookie + guest:view_visits
- **Primary feature tables:** `guest_visits`, `guests`, `bookings`, `seats`, `sites`, `buildings`, `floors`, `app_users`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `visit_scope` | no | `string` | `CURRENT` | - |
| query | `site_id` | no | `string | null` | `1` | - |
| query | `visit_status` | no | `string | null` | `string` | - |
| query | `requires_seat` | no | `boolean | null` | `false` | - |
| query | `search` | no | `string | null` | `test` | - |
| query | `limit` | no | `integer` | `20` | - |
| query | `offset` | no | `integer` | `0` | - |
| query | `page` | no | `integer | null` | `1` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `GuestVisitListResponse`.

Representative response shape:

```json
{
  "summary": {
    "total": 0,
    "scheduled": 0,
    "checked_in": 0,
    "checked_out": 0,
    "cancelled": 0,
    "modified": 0,
    "overdue": 2
  },
  "items": [
    {
      "guest_visit_id": "1",
      "visit_date": "{{qaDate}}",
      "start_time": "09:00:00",
      "end_time": "18:00:00",
      "visit_status": "SCHEDULED",
      "guest_type": "string",
      "purpose_of_visit": "string",
      "requires_seat": false,
      "checked_in_at": "2030-01-15T09:00:00Z",
      "checked_out_at": "2030-01-15T09:00:00Z",
      "modified_from_guest_visit_id": "string",
      "modification_reason": "string",
      "is_modified": false,
      "guest_id": "1",
      "guest_name": "string",
      "guest_email": "string",
      "guest_phone": "string",
      "host_user_id": "string",
      "host_name": "string",
      "host_email": "string",
      "host_phone": "string",
      "host_department": "string",
      "host_job_title": "string",
      "site_id": "1",
      "site_name": "string",
      "building_id": "1",
      "building_name": "string",
      "floor_id": "1",
      "floor_name": "string",
      "booking_id": "string",
      "booking_status": "string",
      "seat_id": "1",
      "seat_code": "A-101",
      "notes": "Created during API testing"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "total_pages": 1
  }
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `POST /guest-visits` - Create Guest Visit Record

**Purpose and behavior**

seat_id absent on the payload -> visit only. seat_id present -> visit + booking, atomically (replaces the old POST /guest-bookings).

A host or reception user registers an upcoming guest visit.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: guest invitation, reception/security dashboard, and guest workflow actions.
- **Effective role access:** TENANT_ADMIN and FACILITATOR only.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `guest_visits`, `guests`, `bookings`, `seats`, `sites`, `buildings`, `floors`, `app_users`, `audit_logs`

**Input contract**

No path or query parameters.

JSON request body, schema `CreateGuestVisitRequest`:

```json
{
  "guest_id": 1,
  "host_user_id": 1,
  "site_id": 1,
  "building_id": 1,
  "floor_id": 1,
  "visit_date": "{{qaDate}}",
  "guest_type": "INTERVIEW_CANDIDATE",
  "purpose_of_visit": "INTERVIEW",
  "start_time": "09:00:00",
  "end_time": "18:00:00",
  "notes": "Created during API testing",
  "seat_id": 1
}
```

**Expected output**

Success returns **HTTP 201** using response schema `GuestVisitResponse or BookingResponse`.

Representative response shape:

```json
{
  "guest_visit_id": "1",
  "tenant_id": "string",
  "guest_id": "1",
  "host_user_id": "string",
  "site_id": "1",
  "building_id": "1",
  "floor_id": "1",
  "visit_date": "{{qaDate}}",
  "guest_type": "INTERVIEW_CANDIDATE",
  "purpose_of_visit": "INTERVIEW",
  "start_time": "09:00:00",
  "end_time": "18:00:00",
  "notes": "Created during API testing",
  "requires_seat": false,
  "visit_status": "SCHEDULED",
  "created_by_user_id": "string",
  "modified_from_guest_visit_id": "string",
  "modification_reason": "string",
  "is_modified": false,
  "created_at": "2030-01-15T09:00:00Z",
  "updated_at": "2030-01-15T09:00:00Z"
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.
- Omit seat_id for visit-only creation, then include seat_id to verify atomic visit-plus-booking creation.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `GET /guest-visits/{guest_visit_id}` - Get Guest Visit

**Purpose and behavior**

The web/mobile client or a tester uses this operation to get Guest Visit.

The web/mobile client or a tester uses this operation to get Guest Visit.

- **Lifecycle:** FUTURE SCOPE - Planned direct visit lookup from a guest or user profile.
- **Where used:** No current frontend caller. Planned direct visit lookup from a guest or user profile.
- **Effective role access:** Roles currently granted guest:view_visits: TENANT_ADMIN, FACILITATOR, and FRONT_OFFICE. FRONT_OFFICE is clamped to today's visits.
- **Route gate:** Bearer/access cookie + guest:view_visits
- **Primary feature tables:** `guest_visits`, `guests`, `bookings`, `seats`, `sites`, `buildings`, `floors`, `app_users`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `guest_visit_id` | yes | `string` | `1` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `GuestVisitListItem`.

Representative response shape:

```json
{
  "guest_visit_id": "1",
  "visit_date": "{{qaDate}}",
  "start_time": "09:00:00",
  "end_time": "18:00:00",
  "visit_status": "SCHEDULED",
  "guest_type": "string",
  "purpose_of_visit": "string",
  "requires_seat": false,
  "checked_in_at": "2030-01-15T09:00:00Z",
  "checked_out_at": "2030-01-15T09:00:00Z",
  "modified_from_guest_visit_id": "string",
  "modification_reason": "string",
  "is_modified": false,
  "guest_id": "1",
  "guest_name": "string",
  "guest_email": "string",
  "guest_phone": "string",
  "host_user_id": "string",
  "host_name": "string",
  "host_email": "string",
  "host_phone": "string",
  "host_department": "string",
  "host_job_title": "string",
  "site_id": "1",
  "site_name": "string",
  "building_id": "1",
  "building_name": "string",
  "floor_id": "1",
  "floor_name": "string",
  "booking_id": "string",
  "booking_status": "string",
  "seat_id": "1",
  "seat_code": "A-101",
  "notes": "Created during API testing"
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.

---

#### `POST /guest-visits/{guest_visit_id}/check-in` - Check In Visit

**Purpose and behavior**

The web/mobile client or a tester uses this operation to check In Visit.

The web/mobile client or a tester uses this operation to check In Visit.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: guest invitation, reception/security dashboard, and guest workflow actions.
- **Effective role access:** FRONT_OFFICE only. This service-level rule overrides the broader permission data; TENANT_ADMIN and FACILITATOR are deliberately rejected.
- **Route gate:** Bearer/access cookie + guest:check_in
- **Primary feature tables:** `guest_visits`, `guests`, `bookings`, `seats`, `sites`, `buildings`, `floors`, `app_users`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `guest_visit_id` | yes | `string` | `1` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `GuestVisitStatusUpdateResponse`.

Representative response shape:

```json
{
  "guest_visit_id": "1",
  "visit_status": "SCHEDULED",
  "checked_in_at": "2030-01-15T09:00:00Z",
  "checked_out_at": "2030-01-15T09:00:00Z"
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.
- As FRONT_OFFICE, check in today's SCHEDULED visit and verify CHECKED_IN state.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.
- Wrong visit date or invalid status transition is rejected; non-FRONT_OFFICE callers remain forbidden.

---

#### `POST /guest-visits/{guest_visit_id}/check-out` - Check Out Visit

**Purpose and behavior**

The web/mobile client or a tester uses this operation to check Out Visit.

The web/mobile client or a tester uses this operation to check Out Visit.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: guest invitation, reception/security dashboard, and guest workflow actions.
- **Effective role access:** FRONT_OFFICE only. This service-level rule overrides the broader permission data; TENANT_ADMIN and FACILITATOR are deliberately rejected.
- **Route gate:** Bearer/access cookie + guest:check_out
- **Primary feature tables:** `guest_visits`, `guests`, `bookings`, `seats`, `sites`, `buildings`, `floors`, `app_users`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `guest_visit_id` | yes | `string` | `1` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `GuestVisitStatusUpdateResponse`.

Representative response shape:

```json
{
  "guest_visit_id": "1",
  "visit_status": "SCHEDULED",
  "checked_in_at": "2030-01-15T09:00:00Z",
  "checked_out_at": "2030-01-15T09:00:00Z"
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.
- As FRONT_OFFICE, check out a CHECKED_IN visit and verify CHECKED_OUT state.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.
- Wrong visit date or invalid status transition is rejected; non-FRONT_OFFICE callers remain forbidden.

---

#### `POST /guest-visits/{guest_visit_id}/workflow` - Guest Visit Workflow

**Purpose and behavior**

The web/mobile client or a tester uses this operation to guest Visit Workflow.

The web/mobile client or a tester uses this operation to guest Visit Workflow.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: guest invitation, reception/security dashboard, and guest workflow actions.
- **Effective role access:** TENANT_ADMIN or FACILITATOR with guest:manage; FACILITATOR must also be the visit creator or host for existing-resource actions.
- **Route gate:** Bearer/access cookie + guest:manage
- **Primary feature tables:** `guest_visits`, `guests`, `bookings`, `seats`, `sites`, `buildings`, `floors`, `app_users`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `guest_visit_id` | yes | `string` | `1` | - |

JSON request body, schema `GuestWorkflowRequest`:

```json
{
  "action": "MODIFY_VISIT_ONLY",
  "host_user_id": 1,
  "site_id": 1,
  "building_id": 1,
  "floor_id": 1,
  "visit_date": "{{qaDate}}",
  "guest_type": "INTERVIEW_CANDIDATE",
  "purpose_of_visit": "INTERVIEW",
  "start_time": "09:00:00",
  "end_time": "18:00:00",
  "notes": "Created during API testing",
  "seat_id": 1,
  "cancellation_reason": "string",
  "modification_reason": "USER_REQUEST"
}
```

**Expected output**

Success returns **HTTP 200** using response schema `GuestWorkflowResponse`.

Representative response shape:

```json
{
  "success": false,
  "action": "BOOKING_CREATED",
  "message": "Show me available seats for next Monday",
  "guest_visit": {
    "guest_visit_id": "1",
    "tenant_id": "string",
    "guest_id": "1",
    "host_user_id": "string",
    "site_id": "1",
    "building_id": "1",
    "floor_id": "1",
    "visit_date": "{{qaDate}}",
    "guest_type": "INTERVIEW_CANDIDATE",
    "purpose_of_visit": "INTERVIEW",
    "start_time": "09:00:00",
    "end_time": "18:00:00",
    "notes": "Created during API testing",
    "requires_seat": false,
    "visit_status": "SCHEDULED",
    "created_by_user_id": "string",
    "modified_from_guest_visit_id": "string",
    "modification_reason": "string",
    "is_modified": false,
    "created_at": "2030-01-15T09:00:00Z",
    "updated_at": "2030-01-15T09:00:00Z"
  },
  "booking": {
    "activity_source": "string",
    "booking_id": "string",
    "tenant_id": "string",
    "booked_for_user_id": "string",
    "booked_for_guest_id": "string",
    "booked_by_user_id": "string",
    "booked_by_name": "string",
    "booked_by_email": "string",
    "booked_for_name": "string",
    "booked_for_email": "string",
    "booked_for_phone": "string",
    "booked_for_organization": "string",
    "guest_visit_id": "1",
    "booking_type": "EMPLOYEE",
    "seat_id": "1",
    "site_id": "1",
    "building_id": "1",
    "floor_id": "1",
    "seat_code": "A-101",
    "site_name": "string",
    "building_name": "string",
    "floor_name": "string",
    "booking_date": "{{qaDate}}",
    "booking_status": "string",
    "source_channel": "API",
    "check_in_at": "2030-01-15T09:00:00Z",
    "checked_out_at": "2030-01-15T09:00:00Z",
    "cancelled_at": "2030-01-15T09:00:00Z",
    "cancellation_reason": "string",
    "updated_user_id": "string",
    "updated_by_name": "string",
    "updated_by_email": "string",
    "modified_from_booking_id": "string",
    "modification_reason": "string",
    "is_modified": false,
    "created_at": "2030-01-15T09:00:00Z",
    "updated_at": "2030-01-15T09:00:00Z",
    "guest_name": "string",
    "guest_email": "string",
    "guest_phone": "string",
    "guest_organization": "string",
    "guest_type": "INTERVIEW_CANDIDATE",
    "purpose_of_visit": "INTERVIEW",
    "visit_status": "string",
    "host_user_id": "string",
    "host_name": "string",
    "host_email": "string",
    "start_time": "09:00:00",
    "end_time": "18:00:00",
    "desk_type": "string",
    "notes": "Created during API testing",
    "requires_seat": false,
    "amenities": [
      "string"
    ]
  }
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

### guest-bookings

#### `GET /guest-bookings` - Fetch Guest Bookings

**Purpose and behavior**

The web/mobile client or a tester uses this operation to fetch Guest Bookings.

The web/mobile client or a tester uses this operation to fetch Guest Bookings.

- **Lifecycle:** FUTURE SCOPE - Planned tenant-wide admin/facilitator guest-booking overseer view.
- **Where used:** No current frontend caller. Planned tenant-wide admin/facilitator guest-booking overseer view.
- **Effective role access:** TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule).
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `guest_visits`, `guests`, `bookings`, `seats`, `sites`, `buildings`, `floors`, `app_users`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `guest_id` | no | `integer | null` | `1` | - |
| query | `booking_date` | no | `string | null` | `{{qaDate}}` | - |
| query | `booking_status` | no | `string | null` | `string` | - |
| query | `limit` | no | `integer` | `20` | minimum=1; maximum=100 |
| query | `page` | no | `integer | null` | `1` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<BookingResponse> or PaginatedBookingResponse`.

Representative response shape:

```json
[
  {
    "activity_source": "string",
    "booking_id": "string",
    "tenant_id": "string",
    "booked_for_user_id": "string",
    "booked_for_guest_id": "string",
    "booked_by_user_id": "string",
    "booked_by_name": "string",
    "booked_by_email": "string",
    "booked_for_name": "string",
    "booked_for_email": "string",
    "booked_for_phone": "string",
    "booked_for_organization": "string",
    "guest_visit_id": "1",
    "booking_type": "EMPLOYEE",
    "seat_id": "1",
    "site_id": "1",
    "building_id": "1",
    "floor_id": "1",
    "seat_code": "A-101",
    "site_name": "string",
    "building_name": "string",
    "floor_name": "string",
    "booking_date": "{{qaDate}}",
    "booking_status": "string",
    "source_channel": "API",
    "check_in_at": "2030-01-15T09:00:00Z",
    "checked_out_at": "2030-01-15T09:00:00Z",
    "cancelled_at": "2030-01-15T09:00:00Z",
    "cancellation_reason": "string",
    "updated_user_id": "string",
    "updated_by_name": "string",
    "updated_by_email": "string",
    "modified_from_booking_id": "string",
    "modification_reason": "string",
    "is_modified": false,
    "created_at": "2030-01-15T09:00:00Z",
    "updated_at": "2030-01-15T09:00:00Z",
    "guest_name": "string",
    "guest_email": "string",
    "guest_phone": "string",
    "guest_organization": "string",
    "guest_type": "INTERVIEW_CANDIDATE",
    "purpose_of_visit": "INTERVIEW",
    "visit_status": "string",
    "host_user_id": "string",
    "host_name": "string",
    "host_email": "string",
    "start_time": "09:00:00",
    "end_time": "18:00:00",
    "desk_type": "string",
    "notes": "Created during API testing",
    "requires_seat": false,
    "amenities": [
      "string"
    ]
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.
- Use an available seat/date and confirm booking status, ownership, and audit/notification side effects.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unavailable/blocked seat, overlapping booking, or policy-window violation returns a deterministic 4xx conflict.

---

#### `GET /guest-bookings/{booking_id}` - Fetch Guest Booking

**Purpose and behavior**

The web/mobile client or a tester uses this operation to fetch Guest Booking.

The web/mobile client or a tester uses this operation to fetch Guest Booking.

- **Lifecycle:** FUTURE SCOPE - Planned direct guest-booking lookup from a guest profile.
- **Where used:** No current frontend caller. Planned direct guest-booking lookup from a guest profile.
- **Effective role access:** TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule).
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `guest_visits`, `guests`, `bookings`, `seats`, `sites`, `buildings`, `floors`, `app_users`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `booking_id` | yes | `integer` | `1` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `BookingResponse`.

Representative response shape:

```json
{
  "activity_source": "string",
  "booking_id": "string",
  "tenant_id": "string",
  "booked_for_user_id": "string",
  "booked_for_guest_id": "string",
  "booked_by_user_id": "string",
  "booked_by_name": "string",
  "booked_by_email": "string",
  "booked_for_name": "string",
  "booked_for_email": "string",
  "booked_for_phone": "string",
  "booked_for_organization": "string",
  "guest_visit_id": "1",
  "booking_type": "EMPLOYEE",
  "seat_id": "1",
  "site_id": "1",
  "building_id": "1",
  "floor_id": "1",
  "seat_code": "A-101",
  "site_name": "string",
  "building_name": "string",
  "floor_name": "string",
  "booking_date": "{{qaDate}}",
  "booking_status": "string",
  "source_channel": "API",
  "check_in_at": "2030-01-15T09:00:00Z",
  "checked_out_at": "2030-01-15T09:00:00Z",
  "cancelled_at": "2030-01-15T09:00:00Z",
  "cancellation_reason": "string",
  "updated_user_id": "string",
  "updated_by_name": "string",
  "updated_by_email": "string",
  "modified_from_booking_id": "string",
  "modification_reason": "string",
  "is_modified": false,
  "created_at": "2030-01-15T09:00:00Z",
  "updated_at": "2030-01-15T09:00:00Z",
  "guest_name": "string",
  "guest_email": "string",
  "guest_phone": "string",
  "guest_organization": "string",
  "guest_type": "INTERVIEW_CANDIDATE",
  "purpose_of_visit": "INTERVIEW",
  "visit_status": "string",
  "host_user_id": "string",
  "host_name": "string",
  "host_email": "string",
  "start_time": "09:00:00",
  "end_time": "18:00:00",
  "desk_type": "string",
  "notes": "Created during API testing",
  "requires_seat": false,
  "amenities": [
    "string"
  ]
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.
- Use an available seat/date and confirm booking status, ownership, and audit/notification side effects.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Unavailable/blocked seat, overlapping booking, or policy-window violation returns a deterministic 4xx conflict.

---

#### `POST /guest-bookings/{booking_id}/cancel` - Cancel Guest Booking Record

**Purpose and behavior**

The web/mobile client or a tester uses this operation to cancel Guest Booking Record.

The web/mobile client or a tester uses this operation to cancel Guest Booking Record.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: guest booking actions surfaced from admin booking management.
- **Effective role access:** TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule).
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `guest_visits`, `guests`, `bookings`, `seats`, `sites`, `buildings`, `floors`, `app_users`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `booking_id` | yes | `integer` | `1` | - |

JSON request body, schema `CancelBookingRequest`:

```json
{
  "cancellation_reason": "string"
}
```

**Expected output**

Success returns **HTTP 200** using response schema `BookingResponse`.

Representative response shape:

```json
{
  "activity_source": "string",
  "booking_id": "string",
  "tenant_id": "string",
  "booked_for_user_id": "string",
  "booked_for_guest_id": "string",
  "booked_by_user_id": "string",
  "booked_by_name": "string",
  "booked_by_email": "string",
  "booked_for_name": "string",
  "booked_for_email": "string",
  "booked_for_phone": "string",
  "booked_for_organization": "string",
  "guest_visit_id": "1",
  "booking_type": "EMPLOYEE",
  "seat_id": "1",
  "site_id": "1",
  "building_id": "1",
  "floor_id": "1",
  "seat_code": "A-101",
  "site_name": "string",
  "building_name": "string",
  "floor_name": "string",
  "booking_date": "{{qaDate}}",
  "booking_status": "string",
  "source_channel": "API",
  "check_in_at": "2030-01-15T09:00:00Z",
  "checked_out_at": "2030-01-15T09:00:00Z",
  "cancelled_at": "2030-01-15T09:00:00Z",
  "cancellation_reason": "string",
  "updated_user_id": "string",
  "updated_by_name": "string",
  "updated_by_email": "string",
  "modified_from_booking_id": "string",
  "modification_reason": "string",
  "is_modified": false,
  "created_at": "2030-01-15T09:00:00Z",
  "updated_at": "2030-01-15T09:00:00Z",
  "guest_name": "string",
  "guest_email": "string",
  "guest_phone": "string",
  "guest_organization": "string",
  "guest_type": "INTERVIEW_CANDIDATE",
  "purpose_of_visit": "INTERVIEW",
  "visit_status": "string",
  "host_user_id": "string",
  "host_name": "string",
  "host_email": "string",
  "start_time": "09:00:00",
  "end_time": "18:00:00",
  "desk_type": "string",
  "notes": "Created during API testing",
  "requires_seat": false,
  "amenities": [
    "string"
  ]
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.
- Use an available seat/date and confirm booking status, ownership, and audit/notification side effects.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.
- Unavailable/blocked seat, overlapping booking, or policy-window violation returns a deterministic 4xx conflict.

---

#### `POST /guest-bookings/{booking_id}/modify` - Modify Guest Booking Record

**Purpose and behavior**

The web/mobile client or a tester uses this operation to modify Guest Booking Record.

The web/mobile client or a tester uses this operation to modify Guest Booking Record.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: guest booking actions surfaced from admin booking management.
- **Effective role access:** TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule).
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `guest_visits`, `guests`, `bookings`, `seats`, `sites`, `buildings`, `floors`, `app_users`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `booking_id` | yes | `integer` | `1` | - |

JSON request body, schema `ModifyBookingRequest`:

```json
{
  "site_id": 1,
  "building_id": 1,
  "floor_id": 1,
  "seat_id": 1,
  "booking_date": "{{qaDate}}",
  "modification_reason": "USER_REQUEST"
}
```

**Expected output**

Success returns **HTTP 200** using response schema `BookingResponse`.

Representative response shape:

```json
{
  "activity_source": "string",
  "booking_id": "string",
  "tenant_id": "string",
  "booked_for_user_id": "string",
  "booked_for_guest_id": "string",
  "booked_by_user_id": "string",
  "booked_by_name": "string",
  "booked_by_email": "string",
  "booked_for_name": "string",
  "booked_for_email": "string",
  "booked_for_phone": "string",
  "booked_for_organization": "string",
  "guest_visit_id": "1",
  "booking_type": "EMPLOYEE",
  "seat_id": "1",
  "site_id": "1",
  "building_id": "1",
  "floor_id": "1",
  "seat_code": "A-101",
  "site_name": "string",
  "building_name": "string",
  "floor_name": "string",
  "booking_date": "{{qaDate}}",
  "booking_status": "string",
  "source_channel": "API",
  "check_in_at": "2030-01-15T09:00:00Z",
  "checked_out_at": "2030-01-15T09:00:00Z",
  "cancelled_at": "2030-01-15T09:00:00Z",
  "cancellation_reason": "string",
  "updated_user_id": "string",
  "updated_by_name": "string",
  "updated_by_email": "string",
  "modified_from_booking_id": "string",
  "modification_reason": "string",
  "is_modified": false,
  "created_at": "2030-01-15T09:00:00Z",
  "updated_at": "2030-01-15T09:00:00Z",
  "guest_name": "string",
  "guest_email": "string",
  "guest_phone": "string",
  "guest_organization": "string",
  "guest_type": "INTERVIEW_CANDIDATE",
  "purpose_of_visit": "INTERVIEW",
  "visit_status": "string",
  "host_user_id": "string",
  "host_name": "string",
  "host_email": "string",
  "start_time": "09:00:00",
  "end_time": "18:00:00",
  "desk_type": "string",
  "notes": "Created during API testing",
  "requires_seat": false,
  "amenities": [
    "string"
  ]
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.
- Use an available seat/date and confirm booking status, ownership, and audit/notification side effects.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.
- Unavailable/blocked seat, overlapping booking, or policy-window violation returns a deterministic 4xx conflict.

---

### locations

#### `GET /sites` - Sites

**Purpose and behavior**

The web/mobile client or a tester uses this operation to sites.

The web/mobile client or a tester uses this operation to sites.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: booking location selectors and admin site/building/floor/layout management.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `sites`, `buildings`, `floors`, `seats`, `floor_layouts`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `page` | no | `integer` | `1` | minimum=1 |
| query | `limit` | no | `integer | null` | `20` | - |
| query | `search` | no | `string | null` | `test` | - |
| query | `status` | no | `string | null` | `ACTIVE` | - |
| query | `bookable_only` | no | `boolean` | `false` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<SiteResponse>`.

Representative response shape:

```json
[
  {
    "site_id": "1",
    "site_code": "string",
    "site_name": "string",
    "city": "string",
    "country": "string",
    "timezone": "string",
    "address_line1": "string",
    "address_line2": "string",
    "status": "ACTIVE",
    "building_count": 1,
    "floor_count": 1,
    "seat_count": 1,
    "active_seat_count": 1,
    "bookable_seat_count": 1
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `POST /sites` - Create Site

**Purpose and behavior**

The web/mobile client or a tester uses this operation to create Site.

The web/mobile client or a tester uses this operation to create Site.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: booking location selectors and admin site/building/floor/layout management.
- **Effective role access:** TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted location:manage; current tenant seed grants no non-admin role.
- **Route gate:** Bearer/access cookie + location:manage
- **Primary feature tables:** `sites`, `buildings`, `floors`, `seats`, `floor_layouts`, `audit_logs`

**Input contract**

No path or query parameters.

JSON request body, schema `CreateSiteRequest`:

```json
{
  "site_code": "string",
  "site_name": "string",
  "city": "string",
  "country": "string",
  "timezone": "string",
  "address_line1": "string",
  "address_line2": "string",
  "status": "ACTIVE"
}
```

**Expected output**

Success returns **HTTP 201** using response schema `SiteResponse`.

Representative response shape:

```json
{
  "site_id": "1",
  "site_code": "string",
  "site_name": "string",
  "city": "string",
  "country": "string",
  "timezone": "string",
  "address_line1": "string",
  "address_line2": "string",
  "status": "ACTIVE",
  "building_count": 1,
  "floor_count": 1,
  "seat_count": 1,
  "active_seat_count": 1,
  "bookable_seat_count": 1
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `GET /sites/{site_id}` - Site Details

**Purpose and behavior**

The web/mobile client or a tester uses this operation to site Details.

The web/mobile client or a tester uses this operation to site Details.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: booking location selectors and admin site/building/floor/layout management.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `sites`, `buildings`, `floors`, `seats`, `floor_layouts`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `site_id` | yes | `integer` | `1` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `SiteDetailsResponse`.

Representative response shape:

```json
{
  "site_id": "1",
  "site_code": "string",
  "site_name": "string",
  "city": "string",
  "country": "string",
  "timezone": "string",
  "address_line1": "string",
  "address_line2": "string",
  "status": "ACTIVE",
  "building_count": 1,
  "floor_count": 1,
  "seat_count": 1,
  "active_seat_count": 1,
  "bookable_seat_count": 1,
  "hierarchy_summary": {
    "building_count": 0,
    "floor_count": 0,
    "seat_count": 0,
    "active_seat_count": 0,
    "bookable_seat_count": 0
  }
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.

---

#### `PATCH /sites/{site_id}` - Update Site

**Purpose and behavior**

The web/mobile client or a tester uses this operation to update Site.

The web/mobile client or a tester uses this operation to update Site.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: booking location selectors and admin site/building/floor/layout management.
- **Effective role access:** TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted location:manage; current tenant seed grants no non-admin role.
- **Route gate:** Bearer/access cookie + location:manage
- **Primary feature tables:** `sites`, `buildings`, `floors`, `seats`, `floor_layouts`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `site_id` | yes | `integer` | `1` | - |

JSON request body, schema `UpdateSiteRequest`:

```json
{
  "site_name": "string",
  "city": "string",
  "country": "string",
  "timezone": "string",
  "address_line1": "string",
  "address_line2": "string",
  "status": "ACTIVE",
  "reactivate_building_ids": [
    1
  ],
  "reactivate_floor_ids": [
    1
  ]
}
```

**Expected output**

Success returns **HTTP 200** using response schema `SiteResponse`.

Representative response shape:

```json
{
  "site_id": "1",
  "site_code": "string",
  "site_name": "string",
  "city": "string",
  "country": "string",
  "timezone": "string",
  "address_line1": "string",
  "address_line2": "string",
  "status": "ACTIVE",
  "building_count": 1,
  "floor_count": 1,
  "seat_count": 1,
  "active_seat_count": 1,
  "bookable_seat_count": 1
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `GET /buildings` - Buildings

**Purpose and behavior**

The web/mobile client or a tester uses this operation to buildings.

The web/mobile client or a tester uses this operation to buildings.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: booking location selectors and admin site/building/floor/layout management.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `buildings`, `sites`, `floors`, `seats`, `floor_layouts`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `site_id` | no | `integer | null` | `1` | - |
| query | `page` | no | `integer` | `1` | minimum=1 |
| query | `limit` | no | `integer | null` | `20` | - |
| query | `search` | no | `string | null` | `test` | - |
| query | `status` | no | `string | null` | `ACTIVE` | - |
| query | `bookable_only` | no | `boolean` | `false` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<BuildingResponse>`.

Representative response shape:

```json
[
  {
    "building_id": "1",
    "site_id": "1",
    "site_name": "string",
    "building_code": "string",
    "building_name": "string",
    "status": "ACTIVE",
    "floor_count": 1,
    "seat_count": 1,
    "active_seat_count": 1,
    "bookable_seat_count": 1
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `POST /buildings` - Create Building

**Purpose and behavior**

The web/mobile client or a tester uses this operation to create Building.

The web/mobile client or a tester uses this operation to create Building.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: booking location selectors and admin site/building/floor/layout management.
- **Effective role access:** TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted location:manage; current tenant seed grants no non-admin role.
- **Route gate:** Bearer/access cookie + location:manage
- **Primary feature tables:** `buildings`, `sites`, `floors`, `seats`, `floor_layouts`, `audit_logs`

**Input contract**

No path or query parameters.

JSON request body, schema `CreateBuildingRequest`:

```json
{
  "site_id": 1,
  "building_code": "string",
  "building_name": "string",
  "status": "ACTIVE"
}
```

**Expected output**

Success returns **HTTP 201** using response schema `BuildingResponse`.

Representative response shape:

```json
{
  "building_id": "1",
  "site_id": "1",
  "site_name": "string",
  "building_code": "string",
  "building_name": "string",
  "status": "ACTIVE",
  "floor_count": 1,
  "seat_count": 1,
  "active_seat_count": 1,
  "bookable_seat_count": 1
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `PATCH /buildings/{building_id}` - Update Building

**Purpose and behavior**

The web/mobile client or a tester uses this operation to update Building.

The web/mobile client or a tester uses this operation to update Building.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: booking location selectors and admin site/building/floor/layout management.
- **Effective role access:** TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted location:manage; current tenant seed grants no non-admin role.
- **Route gate:** Bearer/access cookie + location:manage
- **Primary feature tables:** `buildings`, `sites`, `floors`, `seats`, `floor_layouts`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `building_id` | yes | `integer` | `1` | - |

JSON request body, schema `UpdateBuildingRequest`:

```json
{
  "building_name": "string",
  "status": "ACTIVE",
  "reactivate_floor_ids": [
    1
  ],
  "reactivate_office": false
}
```

**Expected output**

Success returns **HTTP 200** using response schema `BuildingResponse`.

Representative response shape:

```json
{
  "building_id": "1",
  "site_id": "1",
  "site_name": "string",
  "building_code": "string",
  "building_name": "string",
  "status": "ACTIVE",
  "floor_count": 1,
  "seat_count": 1,
  "active_seat_count": 1,
  "bookable_seat_count": 1
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `GET /buildings/{building_id}/floors` - Floors By Building

**Purpose and behavior**

The web/mobile client or a tester uses this operation to floors By Building.

The web/mobile client or a tester uses this operation to floors By Building.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: booking location selectors and admin site/building/floor/layout management.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `buildings`, `sites`, `floors`, `seats`, `floor_layouts`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `building_id` | yes | `integer` | `1` | - |
| query | `page` | no | `integer` | `1` | minimum=1 |
| query | `limit` | no | `integer | null` | `20` | - |
| query | `search` | no | `string | null` | `test` | - |
| query | `status` | no | `string | null` | `ACTIVE` | - |
| query | `bookable_only` | no | `boolean` | `false` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<FloorResponse>`.

Representative response shape:

```json
[
  {
    "floor_id": "1",
    "site_id": "1",
    "building_id": "1",
    "building_code": "string",
    "building_name": "string",
    "floor_code": "string",
    "floor_name": "string",
    "status": "ACTIVE",
    "seat_count": 1,
    "active_seat_count": 1,
    "bookable_seat_count": 1,
    "layout_count": 1,
    "published_layout_exists": false,
    "layout_id": "string",
    "layout_name": "QA Floor Layout",
    "layout_file_url": "string",
    "layout_status": "string",
    "layout_is_published": false,
    "layout_version_no": 1,
    "published_by_name": "string",
    "scheduled_layout": {
      "layout_id": "string",
      "layout_name": "QA Floor Layout",
      "layout_file_url": "string",
      "effective_from": "2030-01-15T09:00:00Z"
    },
    "layout_last_updated": "2030-01-15T09:00:00Z",
    "active_layout": {
      "layout_id": "string",
      "layout_name": "QA Floor Layout",
      "layout_file_url": "string"
    }
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.

---

#### `GET /floors` - Floors

**Purpose and behavior**

List floors for the tenant, optionally narrowed to one site and/or building.

The web/mobile client or a tester uses this operation to floors.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: booking location selectors and admin site/building/floor/layout management.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `floors`, `buildings`, `sites`, `seats`, `floor_layouts`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `site_id` | no | `integer | null` | `1` | - |
| query | `building_id` | no | `integer | null` | `1` | - |
| query | `page` | no | `integer` | `1` | minimum=1 |
| query | `limit` | no | `integer | null` | `20` | - |
| query | `search` | no | `string | null` | `test` | - |
| query | `status` | no | `string | null` | `ACTIVE` | - |
| query | `bookable_only` | no | `boolean` | `false` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<FloorResponse>`.

Representative response shape:

```json
[
  {
    "floor_id": "1",
    "site_id": "1",
    "building_id": "1",
    "building_code": "string",
    "building_name": "string",
    "floor_code": "string",
    "floor_name": "string",
    "status": "ACTIVE",
    "seat_count": 1,
    "active_seat_count": 1,
    "bookable_seat_count": 1,
    "layout_count": 1,
    "published_layout_exists": false,
    "layout_id": "string",
    "layout_name": "QA Floor Layout",
    "layout_file_url": "string",
    "layout_status": "string",
    "layout_is_published": false,
    "layout_version_no": 1,
    "published_by_name": "string",
    "scheduled_layout": {
      "layout_id": "string",
      "layout_name": "QA Floor Layout",
      "layout_file_url": "string",
      "effective_from": "2030-01-15T09:00:00Z"
    },
    "layout_last_updated": "2030-01-15T09:00:00Z",
    "active_layout": {
      "layout_id": "string",
      "layout_name": "QA Floor Layout",
      "layout_file_url": "string"
    }
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `POST /floors` - Create Floor

**Purpose and behavior**

The web/mobile client or a tester uses this operation to create Floor.

The web/mobile client or a tester uses this operation to create Floor.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: booking location selectors and admin site/building/floor/layout management.
- **Effective role access:** TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted location:manage; current tenant seed grants no non-admin role.
- **Route gate:** Bearer/access cookie + location:manage
- **Primary feature tables:** `floors`, `buildings`, `sites`, `seats`, `floor_layouts`, `audit_logs`

**Input contract**

No path or query parameters.

JSON request body, schema `CreateFloorRequest`:

```json
{
  "site_id": 1,
  "building_id": 1,
  "floor_code": "string",
  "floor_name": "string",
  "status": "ACTIVE"
}
```

**Expected output**

Success returns **HTTP 201** using response schema `FloorResponse`.

Representative response shape:

```json
{
  "floor_id": "1",
  "site_id": "1",
  "building_id": "1",
  "building_code": "string",
  "building_name": "string",
  "floor_code": "string",
  "floor_name": "string",
  "status": "ACTIVE",
  "seat_count": 1,
  "active_seat_count": 1,
  "bookable_seat_count": 1,
  "layout_count": 1,
  "published_layout_exists": false,
  "layout_id": "string",
  "layout_name": "QA Floor Layout",
  "layout_file_url": "string",
  "layout_status": "string",
  "layout_is_published": false,
  "layout_version_no": 1,
  "published_by_name": "string",
  "scheduled_layout": {
    "layout_id": "string",
    "layout_name": "QA Floor Layout",
    "layout_file_url": "string",
    "effective_from": "2030-01-15T09:00:00Z"
  },
  "layout_last_updated": "2030-01-15T09:00:00Z",
  "active_layout": {
    "layout_id": "string",
    "layout_name": "QA Floor Layout",
    "layout_file_url": "string"
  }
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `PATCH /floors/{floor_id}` - Update Floor

**Purpose and behavior**

The web/mobile client or a tester uses this operation to update Floor.

The web/mobile client or a tester uses this operation to update Floor.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: booking location selectors and admin site/building/floor/layout management.
- **Effective role access:** TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted location:manage; current tenant seed grants no non-admin role.
- **Route gate:** Bearer/access cookie + location:manage
- **Primary feature tables:** `floors`, `buildings`, `sites`, `seats`, `floor_layouts`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `floor_id` | yes | `integer` | `1` | - |

JSON request body, schema `UpdateFloorRequest`:

```json
{
  "floor_name": "string",
  "status": "ACTIVE",
  "reactivate_building": false,
  "reactivate_office": false
}
```

**Expected output**

Success returns **HTTP 200** using response schema `FloorResponse`.

Representative response shape:

```json
{
  "floor_id": "1",
  "site_id": "1",
  "building_id": "1",
  "building_code": "string",
  "building_name": "string",
  "floor_code": "string",
  "floor_name": "string",
  "status": "ACTIVE",
  "seat_count": 1,
  "active_seat_count": 1,
  "bookable_seat_count": 1,
  "layout_count": 1,
  "published_layout_exists": false,
  "layout_id": "string",
  "layout_name": "QA Floor Layout",
  "layout_file_url": "string",
  "layout_status": "string",
  "layout_is_published": false,
  "layout_version_no": 1,
  "published_by_name": "string",
  "scheduled_layout": {
    "layout_id": "string",
    "layout_name": "QA Floor Layout",
    "layout_file_url": "string",
    "effective_from": "2030-01-15T09:00:00Z"
  },
  "layout_last_updated": "2030-01-15T09:00:00Z",
  "active_layout": {
    "layout_id": "string",
    "layout_name": "QA Floor Layout",
    "layout_file_url": "string"
  }
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `GET /floors/{floor_id}/seats` - Available Seats

**Purpose and behavior**

The seat picker loads availability, blocked dates, and amenity matches for a date range.

The seat picker loads availability, blocked dates, and amenity matches for a date range.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: booking location selectors and admin site/building/floor/layout management.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `floors`, `buildings`, `sites`, `seats`, `floor_layouts`, `bookings`, `blocked_seats`, `seat_amenities`, `amenities`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `floor_id` | yes | `integer` | `1` | - |
| query | `start_date` | yes | `string` | `{{qaDate}}` | - |
| query | `end_date` | yes | `string` | `{{qaEndDate}}` | - |
| query | `booked_for_user_id` | no | `integer | null` | `1` | - |
| query | `amenity_ids` | no | `array<integer> | null` | `[1]` | - |
| query | `modifyBookingId` | no | `string | null` | `string` | - |
| query | `is_guest_booking` | no | `boolean` | `false` | - |
| query | `booked_for_guest_id` | no | `integer | null` | `1` | - |
| query | `calendar_mode` | no | `boolean` | `false` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `AvailableSeatListResponse`.

Representative response shape:

```json
{
  "summary": {
    "availableSeats": 1
  },
  "items": [
    {
      "seat_id": "1",
      "seat_code": "A-101",
      "tenant_id": "string",
      "site_id": "1",
      "building_id": "1",
      "floor_id": "1",
      "code": "A-101",
      "seat_type": "string",
      "seat_neighborhood": "string",
      "is_bookable": false,
      "x": 1.0,
      "y": 1.0,
      "w": 1.0,
      "h": 1.0,
      "rotation_angle": 1.0,
      "matched_amenities": [
        "string"
      ],
      "matched_amenity_count": 0,
      "requested_amenity_count": 0,
      "preference_match_status": "FULL_MATCH",
      "availability": {
        "status": "FULLY_AVAILABLE",
        "available_dates": [
          "2030-01-15"
        ],
        "unavailable_dates": [
          "2030-01-15"
        ],
        "booked_dates": [
          "2030-01-15"
        ],
        "blocked_dates": [
          "2030-01-15"
        ],
        "daily_statuses": [
          {
            "booking_date": "{{qaDate}}",
            "status": "AVAILABLE"
          }
        ],
        "total_requested_days": 1,
        "total_available_days": 1,
        "availability_percentage": 1.0
      }
    }
  ]
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.

---

#### `PATCH /layout-seats/{layout_seat_mapping_id}/configuration` - Update Layout Seat Configuration

**Purpose and behavior**

The web/mobile client or a tester uses this operation to update Layout Seat Configuration.

The web/mobile client or a tester uses this operation to update Layout Seat Configuration.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: booking location selectors and admin site/building/floor/layout management.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted location:manage or layout:upload (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + location:manage or layout:upload
- **Primary feature tables:** `layout_seat_mappings`, `seats`, `seat_amenities`, `amenities`, `floor_layouts`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `layout_seat_mapping_id` | yes | `integer` | `1` | - |

JSON request body, schema `LayoutSeatConfigurationUpdateRequest`:

```json
{
  "seat_name": "string",
  "seat_type": "string",
  "status": "ACTIVE",
  "is_bookable": false,
  "is_reserved": false,
  "amenity_ids": [
    1
  ],
  "capacity": 1
}
```

**Expected output**

Success returns **HTTP 200** using response schema `LayoutSeatConfigurationResponse`.

Representative response shape:

```json
{
  "layout_seat_mapping_id": "string",
  "seat_id": "1",
  "layout_id": "string",
  "floor_id": "1",
  "seat_code": "A-101",
  "seat_name": "string",
  "seat_type": "string",
  "status": "ACTIVE",
  "is_bookable": false,
  "is_reserved": false,
  "is_configured": false,
  "configuration_status": "string",
  "amenity_ids": [
    1
  ],
  "capacity": 1
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `PATCH /layout-seats/bulk-configuration` - Update Layout Seats Bulk Configuration

**Purpose and behavior**

The web/mobile client or a tester uses this operation to update Layout Seats Bulk Configuration.

The web/mobile client or a tester uses this operation to update Layout Seats Bulk Configuration.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: booking location selectors and admin site/building/floor/layout management.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted location:manage or layout:upload (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + location:manage or layout:upload
- **Primary feature tables:** `layout_seat_mappings`, `seats`, `seat_amenities`, `amenities`, `floor_layouts`, `audit_logs`

**Input contract**

No path or query parameters.

JSON request body, schema `BulkLayoutSeatConfigurationUpdateRequest`:

```json
{
  "defaults": {
    "seat_name": "string",
    "seat_type": "string",
    "status": "ACTIVE",
    "is_bookable": false,
    "is_reserved": false,
    "amenity_ids": [
      1
    ],
    "capacity": 1
  },
  "seats": [
    {
      "seat_name": "string",
      "seat_type": "string",
      "status": "ACTIVE",
      "is_bookable": false,
      "is_reserved": false,
      "amenity_ids": [
        1
      ],
      "capacity": 1,
      "layout_seat_mapping_id": 1
    }
  ]
}
```

**Expected output**

Success returns **HTTP 200** using response schema `array<LayoutSeatConfigurationResponse>`.

Representative response shape:

```json
[
  {
    "layout_seat_mapping_id": "string",
    "seat_id": "1",
    "layout_id": "string",
    "floor_id": "1",
    "seat_code": "A-101",
    "seat_name": "string",
    "seat_type": "string",
    "status": "ACTIVE",
    "is_bookable": false,
    "is_reserved": false,
    "is_configured": false,
    "configuration_status": "string",
    "amenity_ids": [
      1
    ],
    "capacity": 1
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

### teams

#### `GET /teams/me` - Get My Team

**Purpose and behavior**

If user_id is given, return only that teammate's entry; otherwise return the full (paginated) team member list.

The web/mobile client or a tester uses this operation to get My Team.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Find a Teammate and dashboard team-presence widgets.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; returned data is caller/tenant scoped.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `teams`, `team_members`, `app_users`, `bookings`, `seats`, `floors`, `buildings`, `seat_amenities`, `amenities`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `user_id` | no | `string | null` | `1` | - |
| query | `page` | no | `integer` | `1` | minimum=1 |
| query | `limit` | no | `integer` | `20` | minimum=1; maximum=100 |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `No response body`.

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `GET /teams/members/search` - Search Team Members

**Purpose and behavior**

Search within the caller's own team(s) only -- same contract as GET /users, just scoped to teammates instead of the whole tenant.

The web/mobile client or a tester uses this operation to search Team Members.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Find a Teammate and dashboard team-presence widgets.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; returned data is caller/tenant scoped.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `teams`, `team_members`, `app_users`, `bookings`, `seats`, `floors`, `buildings`, `seat_amenities`, `amenities`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `q` | yes | `string` | `test` | minLength=1 |
| query | `limit` | no | `integer` | `20` | minimum=1; maximum=100 |
| query | `include_inactive` | no | `boolean` | `false` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<UserSearchResponse>`.

Representative response shape:

```json
[
  {
    "user_id": "1",
    "tenant_id": "string",
    "full_name": "Test User",
    "email": "tester@example.com",
    "role_name": "string",
    "status": "ACTIVE",
    "employee_id": "string",
    "department": "string",
    "office_location": "string"
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

### dashboard

#### `GET /dashboard/me` - Dashboard Me

**Purpose and behavior**

The web/mobile client or a tester uses this operation to dashboard Me.

The web/mobile client or a tester uses this operation to dashboard Me.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: the employee dashboard and preference prefill.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; returned data is caller/tenant scoped.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `app_users`, `tenants`, `user_work_preferences`, `user_preferred_amenities`, `amenities`, `bookings`, `seats`, `sites`, `buildings`, `floors`, `floor_layouts`

**Input contract**

No path or query parameters.

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `DashboardMeResponse`.

Representative response shape:

```json
{
  "user_id": "1",
  "tenant_id": "string",
  "tenant_name": "string",
  "email": "tester@example.com",
  "full_name": "Test User",
  "display_name": "Test User",
  "department": "string",
  "title": "string",
  "job_title": "string",
  "mobile_phone": "+919876543210",
  "manager": {
    "user_id": "1",
    "email": "tester@example.com",
    "full_name": "Test User",
    "display_name": "Test User"
  },
  "office_info": {
    "office_location": "string",
    "home_site_id": "string",
    "home_site_code": "string",
    "home_site_name": "string",
    "city": "string",
    "country": "string",
    "timezone": "string"
  },
  "profile_metadata": {
    "status": "ACTIVE",
    "role_name": "string",
    "company_name": "string",
    "employee_id": "string",
    "microsoft_object_id": "string",
    "user_principal_name": "string",
    "graph_last_synced_at": "2030-01-15T09:00:00Z",
    "created_at": "2030-01-15T09:00:00Z",
    "updated_at": "2030-01-15T09:00:00Z"
  },
  "work_preferences": {
    "site_id": "1",
    "site_name": "string",
    "site_status": "string",
    "building_id": "1",
    "building_name": "string",
    "building_status": "string",
    "floor_id": "1",
    "floor_name": "string",
    "floor_status": "string",
    "seat_type": "string",
    "amenities": [
      {
        "id": "string",
        "key": "string",
        "name": "QA Example",
        "category": "active",
        "description": "string",
        "icon": "string",
        "applicable_seat_types": [
          "string"
        ]
      }
    ]
  },
  "favorite_seat": {
    "seat_id": "1",
    "seat_code": "A-101",
    "site_id": "1",
    "site_name": "string",
    "building_id": "1",
    "building_name": "string",
    "floor_id": "1",
    "floor_name": "string",
    "booking_count": 1
  },
  "second_favorite_seat": {
    "seat_id": "1",
    "seat_code": "A-101",
    "site_id": "1",
    "site_name": "string",
    "building_id": "1",
    "building_name": "string",
    "floor_id": "1",
    "floor_name": "string",
    "booking_count": 1
  },
  "third_favorite_seat": {
    "seat_id": "1",
    "seat_code": "A-101",
    "site_id": "1",
    "site_name": "string",
    "building_id": "1",
    "building_name": "string",
    "floor_id": "1",
    "floor_name": "string",
    "booking_count": 1
  },
  "days_in_office_total": 0,
  "days_in_office_current_month": 0,
  "days_in_office_current_year": 0,
  "team_rank_current_year": 1,
  "team_member_count": 0
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

### admin-dashboard

#### `GET /admin/dashboard/summary` - Get admin dashboard summary

**Purpose and behavior**

Return aggregated admin dashboard summary metrics.

An administrator loads KPI cards for occupancy, bookings, visits, and blocked seats.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: admin KPI, activity, occupancy trend, and hierarchy screens.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + admin_dashboard:view
- **Primary feature tables:** `bookings`, `guest_visits`, `guests`, `blocked_seats`, `seats`, `floor_layouts`, `sites`, `buildings`, `floors`, `app_users`, `business_rules`, `tenant_business_rules`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `date` | no | `string | null` | `{{qaDate}}` | - |
| query | `site_id` | no | `integer | null` | `1` | - |
| query | `floor_id` | no | `integer | null` | `1` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `AdminDashboardSummaryResponse`.

Representative response shape:

```json
{
  "total_offices": 0,
  "total_buildings": 0,
  "total_floors": 0,
  "total_seats": 0,
  "non_bookable_seats": 0,
  "booked_today": 0,
  "blocked_seats": 0,
  "booked_seats_today": 0,
  "blocked_seats_today": 0,
  "occupancy_percentage": 0.0,
  "total_bookings": 0,
  "employee_bookings_today": 0,
  "guest_bookings_today": 0,
  "guest_visit_today": 0,
  "guest_visit_booking_with_seat_today": 0,
  "unique_users_booked": 0,
  "booking_utilization_percentage": 0.0,
  "active_sites": 0,
  "inactive_sites": 0,
  "active_buildings": 0,
  "inactive_buildings": 0,
  "active_floors": 0,
  "inactive_floors": 0,
  "active_seats": 0,
  "inactive_seats": 0
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `GET /admin/activities` - List admin dashboard recent activities

**Purpose and behavior**

Return up to 100 tenant-scoped employee booking and guest visit activities for the selected date, ordered by creation time. Requires admin_dashboard:view or an admin role.

The web/mobile client or a tester uses this operation to list admin dashboard recent activities.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: admin KPI, activity, occupancy trend, and hierarchy screens.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + admin_dashboard:view
- **Primary feature tables:** `bookings`, `guest_visits`, `guests`, `blocked_seats`, `seats`, `floor_layouts`, `sites`, `buildings`, `floors`, `app_users`, `business_rules`, `tenant_business_rules`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `date` | no | `string | null` | `{{qaDate}}` | Activity date to list. Defaults to current date. |
| query | `siteId` | no | `integer | null` | `1` | Optional site filter. |
| query | `buildingId` | no | `integer | null` | `1` | Optional building filter. |
| query | `floorId` | no | `integer | null` | `1` | Optional floor filter. |
| query | `page` | no | `integer | null` | `1` | - |
| query | `limit` | no | `integer | null` | `20` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `AdminActivityListResponse`.

Representative response shape:

```json
{
  "items": [
    {
      "activityDate": "2026-05-22",
      "activityId": "booking-1001",
      "activityStatus": "CONFIRMED",
      "activityType": "EMPLOYEE_BOOKING",
      "bookedBy": {
        "email": "employee@example.com",
        "entityType": "EMPLOYEE",
        "id": "42",
        "name": "Employee One",
        "role": "EMPLOYEE"
      },
      "bookedFor": {
        "email": "employee@example.com",
        "entityType": "EMPLOYEE",
        "id": "42",
        "name": "Employee One",
        "role": "EMPLOYEE"
      },
      "bookingId": "1001",
      "building": {
        "buildingCode": "TWA",
        "buildingId": "11",
        "buildingName": "Tower A"
      },
      "createdAt": "2026-05-22T08:30:00Z",
      "floor": {
        "floorCode": "F1",
        "floorId": "101",
        "floorName": "Floor 1"
      },
      "hasBooking": true,
      "seat": {
        "seatCode": "A-101",
        "seatId": "501",
        "seatType": "STANDARD"
      },
      "site": {
        "siteCode": "BLR",
        "siteId": "1",
        "siteName": "Bangalore Campus"
      }
    }
  ]
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `GET /admin/occupancy/date-range` - Get date range occupancy

**Purpose and behavior**

Return tenant-scoped occupancy metrics for every date in a range. Requires admin_dashboard:view or occupancy:view, or an admin role.

The web/mobile client or a tester uses this operation to get date range occupancy.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: admin KPI, activity, occupancy trend, and hierarchy screens.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view or occupancy:view (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + admin_dashboard:view or occupancy:view
- **Primary feature tables:** `bookings`, `guest_visits`, `guests`, `blocked_seats`, `seats`, `floor_layouts`, `sites`, `buildings`, `floors`, `app_users`, `business_rules`, `tenant_business_rules`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `startDate` | yes | `string` | `2030-01-15` | Inclusive range start date. |
| query | `endDate` | yes | `string` | `2030-01-15` | Inclusive range end date. |
| query | `siteId` | no | `integer | null` | `1` | Optional site filter. |
| query | `buildingId` | no | `integer | null` | `1` | Optional building filter. |
| query | `floorId` | no | `integer | null` | `1` | Optional floor filter. |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<AdminDateOccupancyResponse>`.

Representative response shape:

```json
[
  {
    "availableSeats": 95,
    "blockedSeats": 5,
    "bookedSeats": 72,
    "date": "2026-05-12",
    "employeeBookedSeats": 50,
    "guestBookedSeats": 22,
    "occupancyRate": 75.79,
    "totalSeats": 100
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `GET /admin/occupancy/hierarchy` - Get hierarchy occupancy drilldown

**Purpose and behavior**

Return tenant-scoped occupancy grouped by sites, buildings, or floors. No filters groups by site; siteId groups by building; siteId and buildingId groups by floor.

The web/mobile client or a tester uses this operation to get hierarchy occupancy drilldown.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: admin KPI, activity, occupancy trend, and hierarchy screens.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view or occupancy:view (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + admin_dashboard:view or occupancy:view
- **Primary feature tables:** `bookings`, `guest_visits`, `guests`, `blocked_seats`, `seats`, `floor_layouts`, `sites`, `buildings`, `floors`, `app_users`, `business_rules`, `tenant_business_rules`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `date` | no | `string | null` | `{{qaDate}}` | Occupancy date. Defaults to current date. |
| query | `siteId` | no | `integer | null` | `1` | Optional site drilldown filter. |
| query | `buildingId` | no | `integer | null` | `1` | Optional building drilldown filter. |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<AdminHierarchyOccupancyResponse>`.

Representative response shape:

```json
[
  {
    "siteId": "string",
    "siteName": "string",
    "buildingId": "string",
    "buildingName": "string",
    "floorId": "string",
    "floorName": "string",
    "totalSeats": 1,
    "blockedSeats": 1,
    "availableSeats": 1,
    "bookedSeats": 1,
    "employeeBookedSeats": 1,
    "guestBookedSeats": 1,
    "occupancyRate": 1.0
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

### admin-bookings

#### `GET /admin/bookings` - Search employee and guest bookings tenant-wide

**Purpose and behavior**

Admin booking management listing: employee + guest bookings across the whole tenant with optional date range, site/building/floor, booking type, name/email search, seat code, booked-by, and status filters, plus a summary of counts over the filtered dataset. booking_status filters bookings.booking_status; visit_status filters guest_visits.visit_status for guest records. Requires booking:view_all or admin_dashboard:view.

The web/mobile client or a tester uses this operation to search employee and guest bookings tenant-wide.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: tenant-wide Admin Bookings list and autocomplete filters.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted booking:view_all or admin_dashboard:view (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + booking:view_all or admin_dashboard:view
- **Primary feature tables:** `bookings`, `guest_visits`, `guests`, `seats`, `sites`, `buildings`, `floors`, `app_users`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `startDate` | no | `string | null` | `2030-01-15` | Inclusive booking date range start. |
| query | `endDate` | no | `string | null` | `2030-01-15` | Inclusive booking date range end. |
| query | `siteId` | no | `integer | null` | `1` | - |
| query | `buildingId` | no | `integer | null` | `1` | - |
| query | `floorId` | no | `integer | null` | `1` | - |
| query | `bookingType` | no | `string | null` | `EMPLOYEE` | EMPLOYEE or GUEST; omit for both. |
| query | `bookingStatus` | no | `string | null` | `CONFIRMED` | Filters bookings.booking_status (employee + guest-with-seat rows). |
| query | `visitStatus` | no | `string | null` | `SCHEDULED` | Filters guest_visits.visit_status (guest rows only). |
| query | `search` | no | `string | null` | `test` | Partial, case-insensitive match on name/email. |
| query | `seatCode` | no | `string | null` | `string` | Partial seat_code match. |
| query | `bookedByUserId` | no | `integer | null` | `1` | - |
| query | `page` | no | `integer` | `1` | minimum=1 |
| query | `limit` | no | `integer` | `20` | minimum=1; maximum=100 |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `AdminBookingListResponse`.

Representative response shape:

```json
{
  "items": [
    {
      "activity_source": "string",
      "booking_id": "string",
      "tenant_id": "string",
      "booked_for_user_id": "string",
      "booked_for_guest_id": "string",
      "booked_by_user_id": "string",
      "booked_by_name": "string",
      "booked_by_email": "string",
      "booked_for_name": "string",
      "booked_for_email": "string",
      "booked_for_phone": "string",
      "booked_for_organization": "string",
      "guest_visit_id": "1",
      "booking_type": "EMPLOYEE",
      "seat_id": "1",
      "site_id": "1",
      "building_id": "1",
      "floor_id": "1",
      "seat_code": "A-101",
      "site_name": "string",
      "building_name": "string",
      "floor_name": "string",
      "booking_date": "{{qaDate}}",
      "booking_status": "string",
      "source_channel": "API",
      "check_in_at": "2030-01-15T09:00:00Z",
      "checked_out_at": "2030-01-15T09:00:00Z",
      "cancelled_at": "2030-01-15T09:00:00Z",
      "cancellation_reason": "string",
      "updated_user_id": "string",
      "updated_by_name": "string",
      "updated_by_email": "string",
      "modified_from_booking_id": "string",
      "modification_reason": "string",
      "is_modified": false,
      "created_at": "2030-01-15T09:00:00Z",
      "updated_at": "2030-01-15T09:00:00Z",
      "guest_name": "string",
      "guest_email": "string",
      "guest_phone": "string",
      "guest_organization": "string",
      "guest_type": "INTERVIEW_CANDIDATE",
      "purpose_of_visit": "INTERVIEW",
      "visit_status": "string",
      "host_user_id": "string",
      "host_name": "string",
      "host_email": "string",
      "start_time": "09:00:00",
      "end_time": "18:00:00",
      "desk_type": "string",
      "notes": "Created during API testing",
      "requires_seat": false,
      "amenities": [
        "string"
      ]
    }
  ],
  "summary": {
    "total_bookings": 0,
    "confirmed_bookings": 0,
    "cancelled_bookings": 0,
    "modified_bookings": 0,
    "completed_bookings": 0,
    "no_show_bookings": 0,
    "employee_bookings": 0,
    "guest_bookings": 0,
    "checked_in_bookings": 0,
    "checked_out_bookings": 0
  },
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "total_pages": 1
  }
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `GET /admin/bookings/suggest/people` - Search-as-you-type employee/guest names for the admin bookings filter

**Purpose and behavior**

Distinct people with bookings matching the text on name or email (empty text lists everyone), ranked: name starts with the text, then a name word starts with it, then email starts with it, then any other match.

The web/mobile client or a tester uses this operation to search-as-you-type employee/guest names for the admin bookings filter.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: tenant-wide Admin Bookings list and autocomplete filters.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted booking:view_all or admin_dashboard:view (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + booking:view_all or admin_dashboard:view
- **Primary feature tables:** `bookings`, `guest_visits`, `guests`, `seats`, `sites`, `buildings`, `floors`, `app_users`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `bookingType` | yes | `string` | `EMPLOYEE` | - |
| query | `q` | no | `string` | `test` | maxLength=100 |
| query | `limit` | no | `integer` | `20` | minimum=1; maximum=2000 |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<AdminPersonSuggestion>`.

Representative response shape:

```json
[
  {
    "name": "QA Example",
    "email": "tester@example.com"
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `GET /admin/bookings/suggest/seats` - Search-as-you-type seat codes for the admin bookings filter

**Purpose and behavior**

Distinct booked seat codes matching the text, ranked: code starts with the text, then a code segment starts with it, then any other match.

The web/mobile client or a tester uses this operation to search-as-you-type seat codes for the admin bookings filter.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: tenant-wide Admin Bookings list and autocomplete filters.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted booking:view_all or admin_dashboard:view (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + booking:view_all or admin_dashboard:view
- **Primary feature tables:** `bookings`, `guest_visits`, `guests`, `seats`, `sites`, `buildings`, `floors`, `app_users`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `q` | no | `string` | `test` | maxLength=100 |
| query | `limit` | no | `integer` | `20` | minimum=1; maximum=2000 |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<AdminSeatSuggestion>`.

Representative response shape:

```json
[
  {
    "seat_code": "A-101",
    "seat_type": "string"
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

### admin-blocked-seats

#### `GET /admin/blocked-seats` - Search blocked seats and summary counts

**Purpose and behavior**

The web/mobile client or a tester uses this operation to search blocked seats and summary counts.

The web/mobile client or a tester uses this operation to search blocked seats and summary counts.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Admin Blocked Seats list, editor, conflict view, and history.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block or seat:view_all (currently TENANT_ADMIN). The list's view=conflicts mode additionally requires booking:view_all or admin_dashboard:view.
- **Route gate:** Bearer/access cookie + seat:block or seat:view_all
- **Primary feature tables:** `blocked_seats`, `bookings`, `seats`, `floor_layouts`, `sites`, `buildings`, `floors`, `app_users`, `guests`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `category` | no | `string` | `active` | - |
| query | `search` | no | `string | null` | `test` | - |
| query | `siteId` | no | `integer | null` | `1` | - |
| query | `buildingId` | no | `integer | null` | `1` | - |
| query | `floorId` | no | `integer | null` | `1` | - |
| query | `blockType` | no | `string | null` | `Operational block` | - |
| query | `date` | no | `string | null` | `{{qaDate}}` | - |
| query | `startDate` | no | `string | null` | `2030-01-15` | - |
| query | `endDate` | no | `string | null` | `2030-01-15` | - |
| query | `page` | no | `integer` | `1` | minimum=1 |
| query | `limit` | no | `integer` | `20` | minimum=1; maximum=100 |
| query | `includeSummary` | no | `boolean` | `true` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `BlockedSeatListResponse`.

Representative response shape:

```json
{
  "items": [
    {
      "block_id": "string",
      "seat_id": "1",
      "seat_code": "A-101",
      "site_id": "1",
      "site_name": "string",
      "building_id": "1",
      "building_name": "string",
      "floor_id": "1",
      "floor_name": "string",
      "blocked_from": "{{qaDate}}",
      "blocked_to": "{{qaEndDate}}",
      "block_type": "Operational block",
      "reason": "QA verification",
      "display_status": "ACTIVE",
      "blocked_by": {
        "user_id": "1",
        "name": "QA Example"
      },
      "created_at": "2030-01-15T09:00:00Z"
    }
  ],
  "summary": {
    "active_blocks": 0,
    "seats_blocked_today": 0,
    "upcoming_blocks": 0,
    "expiring_soon": 0,
    "expired": 0
  },
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "total_pages": 1
  }
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `POST /admin/blocked-seats` - Block multiple seats

**Purpose and behavior**

The web/mobile client or a tester uses this operation to block multiple seats.

The web/mobile client or a tester uses this operation to block multiple seats.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Admin Blocked Seats list, editor, conflict view, and history.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + seat:block
- **Primary feature tables:** `blocked_seats`, `bookings`, `seats`, `floor_layouts`, `sites`, `buildings`, `floors`, `app_users`, `guests`, `audit_logs`

**Input contract**

No path or query parameters.

JSON request body, schema `CreateBlockedSeatsRequest`:

```json
{
  "seat_ids": [
    1
  ],
  "block_type": "Operational block",
  "blocked_from": "{{qaDate}}",
  "blocked_to": "{{qaEndDate}}"
}
```

**Expected output**

Success returns **HTTP 201** using response schema `CreateBlockedSeatsResponse`.

Representative response shape:

```json
{
  "message": "Show me available seats for next Monday",
  "created_count": 1,
  "items": [
    {
      "block_id": "string",
      "seat_id": "1",
      "seat_code": "A-101",
      "site_id": "1",
      "site_name": "string",
      "building_id": "1",
      "building_name": "string",
      "floor_id": "1",
      "floor_name": "string",
      "blocked_from": "{{qaDate}}",
      "blocked_to": "{{qaEndDate}}",
      "block_type": "Operational block",
      "reason": "QA verification",
      "display_status": "ACTIVE",
      "blocked_by": {
        "user_id": "1",
        "name": "QA Example"
      },
      "created_at": "2030-01-15T09:00:00Z"
    }
  ]
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `GET /admin/blocked-seats/summary` - Get blocked-seat summary counts

**Purpose and behavior**

The web/mobile client or a tester uses this operation to get blocked-seat summary counts.

The web/mobile client or a tester uses this operation to get blocked-seat summary counts.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Admin Blocked Seats list, editor, conflict view, and history.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block or seat:view_all (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + seat:block or seat:view_all
- **Primary feature tables:** `blocked_seats`, `bookings`, `seats`, `floor_layouts`, `sites`, `buildings`, `floors`, `app_users`, `guests`, `audit_logs`

**Input contract**

No path or query parameters.

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `BlockedSeatSummaryResponse`.

Representative response shape:

```json
{
  "active_blocks": 0,
  "seats_blocked_today": 0,
  "upcoming_blocks": 0,
  "expiring_soon": 0,
  "expired": 0
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `GET /admin/blocked-seats/{block_id}/history` - Get blocked-seat audit history

**Purpose and behavior**

The web/mobile client or a tester uses this operation to get blocked-seat audit history.

The web/mobile client or a tester uses this operation to get blocked-seat audit history.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Admin Blocked Seats list, editor, conflict view, and history.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block or seat:view_all (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + seat:block or seat:view_all
- **Primary feature tables:** `blocked_seats`, `bookings`, `seats`, `floor_layouts`, `sites`, `buildings`, `floors`, `app_users`, `guests`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `block_id` | yes | `integer` | `1` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `BlockedSeatHistoryResponse`.

Representative response shape:

```json
{
  "items": [
    {
      "id": "string",
      "action": "BOOKING_CREATED",
      "actor_name": "string",
      "actor_email": "string",
      "old_values": {},
      "new_values": {},
      "changed_fields": [
        "string"
      ],
      "occurred_at": "2030-01-15T09:00:00Z"
    }
  ]
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.

---

#### `PATCH /admin/blocked-seats/{block_id}` - Update an active seat block

**Purpose and behavior**

The web/mobile client or a tester uses this operation to update an active seat block.

The web/mobile client or a tester uses this operation to update an active seat block.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Admin Blocked Seats list, editor, conflict view, and history.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + seat:block
- **Primary feature tables:** `blocked_seats`, `bookings`, `seats`, `floor_layouts`, `sites`, `buildings`, `floors`, `app_users`, `guests`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `block_id` | yes | `integer` | `1` | - |

JSON request body, schema `UpdateBlockedSeatRequest`:

```json
{
  "block_type": "Operational block",
  "blocked_from": "{{qaDate}}",
  "blocked_to": "{{qaEndDate}}",
  "reason": "Operational requirements changed"
}
```

**Expected output**

Success returns **HTTP 200** using response schema `BlockedSeatResponse`.

Representative response shape:

```json
{
  "block_id": "string",
  "seat_id": "1",
  "seat_code": "A-101",
  "site_id": "1",
  "site_name": "string",
  "building_id": "1",
  "building_name": "string",
  "floor_id": "1",
  "floor_name": "string",
  "blocked_from": "{{qaDate}}",
  "blocked_to": "{{qaEndDate}}",
  "block_type": "Operational block",
  "reason": "QA verification",
  "display_status": "ACTIVE",
  "blocked_by": {
    "user_id": "1",
    "name": "QA Example"
  },
  "created_at": "2030-01-15T09:00:00Z"
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `GET /admin/blocked-seats/floors/{floor_id}/layout-resources` - Get the blockable floor layout for an effective date range

**Purpose and behavior**

The web/mobile client or a tester uses this operation to get the blockable floor layout for an effective date range.

The web/mobile client or a tester uses this operation to get the blockable floor layout for an effective date range.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Admin Blocked Seats list, editor, conflict view, and history.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block or seat:view_all (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + seat:block or seat:view_all
- **Primary feature tables:** `blocked_seats`, `bookings`, `seats`, `floor_layouts`, `sites`, `buildings`, `floors`, `app_users`, `guests`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `floor_id` | yes | `integer` | `1` | - |
| query | `blockedFrom` | yes | `string` | `2030-01-15` | - |
| query | `blockedTo` | yes | `string` | `2030-01-15` | - |
| query | `view` | no | `string` | `resources` | - |
| query | `page` | no | `integer` | `1` | minimum=1 |
| query | `limit` | no | `integer` | `20` | minimum=1; maximum=100 |
| query | `seatId` | no | `array<integer> | null` | `[1]` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `BlockableFloorLayoutResponse or FloorLayoutScheduleResponse`.

Representative response shape:

```json
{
  "layout_id": "string",
  "layout_name": "QA Floor Layout",
  "layout_file_url": "string",
  "effective_from": "2030-01-15T09:00:00Z",
  "effective_till": "2030-01-15T09:00:00Z",
  "resources": [
    {
      "resource_id": "string",
      "resource_code": "string",
      "resource_name": "string",
      "resource_type": "string",
      "svg_element_id": "string",
      "capacity": 1,
      "is_bookable": false,
      "is_active": false,
      "has_booking": false,
      "has_block": false
    }
  ],
  "conflicts": [
    {
      "booking_id": "string",
      "seat_id": "1",
      "site_id": "1",
      "building_id": "1",
      "floor_id": "1",
      "seat_code": "A-101",
      "booking_date": "{{qaDate}}",
      "booking_type": "string",
      "booking_status": "string",
      "booked_for_name": "string"
    }
  ],
  "has_more_conflicts": false
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.

---

#### `POST /admin/blocked-seats/{block_id}/cancel` - Cancel an active seat block

**Purpose and behavior**

The web/mobile client or a tester uses this operation to cancel an active seat block.

The web/mobile client or a tester uses this operation to cancel an active seat block.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Admin Blocked Seats list, editor, conflict view, and history.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted seat:block (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + seat:block
- **Primary feature tables:** `blocked_seats`, `bookings`, `seats`, `floor_layouts`, `sites`, `buildings`, `floors`, `app_users`, `guests`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `block_id` | yes | `integer` | `1` | - |

JSON request body, schema `CancelBlockedSeatRequest`:

```json
{
  "reason": "Maintenance completed"
}
```

**Expected output**

Success returns **HTTP 200** using response schema `CancelBlockedSeatResponse`.

Representative response shape:

```json
{
  "message": "Show me available seats for next Monday",
  "block_id": "string",
  "status": "CANCELLED"
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

### admin-audit

#### `GET /admin/audit` - Search the tenant-wide audit log

**Purpose and behavior**

Admin Audit Logs listing: tenant-scoped audit_logs rows with optional action, module, entity type, status, date range (or relative lastSeconds window), and actor-name search filters, plus sorting and pagination -- all applied server-side -- and a summary of counts (total/successful/failed events, unique actors) over the filtered dataset for the page's summary cards. lastSeconds, when given, takes precedence over startDate/endDate. Also returns filter_options -- every distinct (module, entity_type, action) triple that exists for the tenant (unaffected by the filters above), for the filter bar's cascading Module -> Entity -> Action dropdowns. Requires admin_dashboard:view or an admin role.

An administrator investigates tenant activity using server-side filters and pagination.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Admin Audit Log list, filtering, and detail drawer.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + admin_dashboard:view (admin roles bypass)
- **Primary feature tables:** `audit_logs`, `app_users`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `action` | no | `string | null` | `BOOKING_CREATED` | Exact match on audit_logs.action, e.g. 'building.created'. |
| query | `module` | no | `string | null` | `string` | Exact match on audit_logs.module, e.g. 'LOCATION'. |
| query | `entity` | no | `string | null` | `string` | Exact match on audit_logs.entity_type, e.g. 'building'. |
| query | `status` | no | `string | null` | `ACTIVE` | Exact match on audit_logs.event_status: SUCCESS, FAILURE, or DENIED. |
| query | `startDate` | no | `string | null` | `2030-01-15` | Inclusive occurred_at date range start. |
| query | `endDate` | no | `string | null` | `2030-01-15` | Inclusive occurred_at date range end. |
| query | `lastSeconds` | no | `integer | null` | `1` | Relative 'Last N seconds' quick filter (e.g. 300 for last 5 minutes, 7200 for last 2 hours) -- occurred_at >= NOW() - this many seconds. Takes precedence over startDate/endDate when provided. |
| query | `search` | no | `string | null` | `test` | Partial, case-insensitive match on actor name only -- for the type-ahead search box. |
| query | `sortBy` | no | `string` | `occurred_at` | Column to sort by. |
| query | `sortDir` | no | `string` | `desc` | - |
| query | `page` | no | `integer` | `1` | minimum=1 |
| query | `limit` | no | `integer` | `20` | minimum=1; maximum=100 |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `AuditLogListResponse`.

Representative response shape:

```json
{
  "filter_options": [
    {
      "action": "user.login",
      "entity_type": "session",
      "module": "AUTH"
    },
    {
      "action": "user.access_updated",
      "entity_type": "user",
      "module": "AUTH"
    },
    {
      "action": "building.created",
      "entity_type": "building",
      "module": "LOCATION"
    }
  ],
  "items": [
    {
      "action": "building.created",
      "actor_email": "ankitha.kulal@solugenix.com",
      "actor_name": "Ankitha Kulal",
      "actor_role": "TENANT_ADMIN",
      "actor_user_id": "7",
      "entity_id": "84",
      "entity_type": "building",
      "event_status": "SUCCESS",
      "id": "22",
      "module": "LOCATION",
      "occurred_at": "2026-07-21T09:16:01.072861Z",
      "request_method": "POST",
      "source_channel": "WEB"
    }
  ],
  "pagination": {
    "limit": 10,
    "page": 1,
    "total": 828,
    "total_pages": 83
  },
  "summary": {
    "failed_events": 115,
    "successful_events": 713,
    "total_events": 828,
    "unique_users": 21
  }
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `GET /admin/audit/{audit_id}` - Get one audit log entry

**Purpose and behavior**

Return the full detail of a single tenant-scoped audit_logs row -- including the old/new-values JSON diff, request metadata, IP address and user agent -- for the admin Audit Logs detail drawer. Requires admin_dashboard:view or an admin role.

The web/mobile client or a tester uses this operation to get one audit log entry.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: Admin Audit Log list, filtering, and detail drawer.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + admin_dashboard:view (admin roles bypass)
- **Primary feature tables:** `audit_logs`, `app_users`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `audit_id` | yes | `integer` | `1` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `AuditLogDetailResponse`.

Representative response shape:

```json
{
  "action": "building.created",
  "actor_email": "ankitha.kulal@solugenix.com",
  "actor_name": "Ankitha Kulal",
  "actor_role": "TENANT_ADMIN",
  "actor_user_id": "7",
  "created_at": "2026-07-21T09:16:01.072861Z",
  "entity_id": "84",
  "entity_type": "building",
  "event_status": "SUCCESS",
  "id": "22",
  "ip_address": "127.0.0.1",
  "module": "LOCATION",
  "new_values": {
    "building_code": "TEST BUILDING",
    "building_name": "TEST BUILDING",
    "site_id": "54",
    "site_name": "Test office1",
    "status": "ACTIVE"
  },
  "occurred_at": "2026-07-21T09:16:01.072861Z",
  "request_id": "51c9abcc",
  "request_method": "POST",
  "request_path": "/buildings",
  "source_channel": "WEB",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ..."
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.

---

### preferences

#### `GET /preferences/{user_id}` - Preferences For User

**Purpose and behavior**

A specific employee's saved preferences -- for a facilitator or admin pre-filling a delegated booking. Self, TENANT_ADMIN, and FACILITATOR only; see get_preferences_for_user.

The web/mobile client or a tester uses this operation to preferences For User.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: employee saved preferences and admin amenities screens.
- **Effective role access:** The same user, TENANT_ADMIN, or FACILITATOR; cross-user reads exist only to prefill delegated bookings.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `user_work_preferences`, `user_preferred_amenities`, `amenities`, `amenity_categories`, `sites`, `buildings`, `floors`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `user_id` | yes | `string` | `1` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `MyPreferencesResponse`.

Representative response shape:

```json
{
  "site_id": "1",
  "site_name": "string",
  "site_status": "string",
  "building_id": "1",
  "building_name": "string",
  "building_status": "string",
  "floor_id": "1",
  "floor_name": "string",
  "floor_status": "string",
  "seat_type": "string",
  "amenities": [
    {
      "id": "string",
      "key": "string",
      "name": "QA Example",
      "category": "active",
      "description": "string",
      "icon": "string",
      "applicable_seat_types": [
        "string"
      ]
    }
  ]
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.

---

#### `POST /preferences/me` - Update My Preferences

**Purpose and behavior**

The web/mobile client or a tester uses this operation to update My Preferences.

The web/mobile client or a tester uses this operation to update My Preferences.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: employee saved preferences and admin amenities screens.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `user_work_preferences`, `user_preferred_amenities`, `amenities`, `amenity_categories`, `sites`, `buildings`, `floors`

**Input contract**

No path or query parameters.

JSON request body, schema `UpdateMyPreferencesRequest`:

```json
{
  "site_id": 1,
  "building_id": 1,
  "floor_id": 1,
  "seat_type": "STANDARD",
  "amenity_ids": [
    1
  ]
}
```

**Expected output**

Success returns **HTTP 200** using response schema `MyPreferencesResponse`.

Representative response shape:

```json
{
  "site_id": "1",
  "site_name": "string",
  "site_status": "string",
  "building_id": "1",
  "building_name": "string",
  "building_status": "string",
  "floor_id": "1",
  "floor_name": "string",
  "floor_status": "string",
  "seat_type": "string",
  "amenities": [
    {
      "id": "string",
      "key": "string",
      "name": "QA Example",
      "category": "active",
      "description": "string",
      "icon": "string",
      "applicable_seat_types": [
        "string"
      ]
    }
  ]
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `GET /amenities` - Amenities

**Purpose and behavior**

The web/mobile client or a tester uses this operation to amenities.

The web/mobile client or a tester uses this operation to amenities.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: employee saved preferences and admin amenities screens.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `amenities`, `amenity_categories`, `seat_amenities`, `seats`, `floor_layouts`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `page` | no | `integer` | `1` | minimum=1 |
| query | `limit` | no | `integer` | `20` | minimum=1; maximum=200 |
| query | `search` | no | `string | null` | `test` | - |
| query | `status` | no | `string | null` | `ACTIVE` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `AmenityListResponse`.

Representative response shape:

```json
{
  "items": [
    {
      "amenity_id": "string",
      "amenity_key": "string",
      "amenity_name": "string",
      "description": "string",
      "icon_name": "string",
      "category_id": "string",
      "category_name": "string",
      "is_active": false,
      "assigned_seat_count": 0,
      "applicable_seat_types": [
        "string"
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "total_pages": 1,
  "total_amenities": 1,
  "active_amenities": 1,
  "inactive_amenities": 1,
  "assigned_amenities": 1
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `POST /amenities` - Create Amenity

**Purpose and behavior**

The web/mobile client or a tester uses this operation to create Amenity.

The web/mobile client or a tester uses this operation to create Amenity.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: employee saved preferences and admin amenities screens.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted amenities:manage or location:manage (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + amenities:manage or location:manage
- **Primary feature tables:** `amenities`, `amenity_categories`, `seat_amenities`, `seats`, `floor_layouts`, `audit_logs`

**Input contract**

No path or query parameters.

JSON request body, schema `CreateAmenityRequest`:

```json
{
  "amenity_name": "string",
  "category_id": 1,
  "description": "string",
  "icon_name": "string",
  "is_active": true,
  "applicable_seat_types": [
    "SEAT"
  ]
}
```

**Expected output**

Success returns **HTTP 201** using response schema `AdminAmenityResponse`.

Representative response shape:

```json
{
  "amenity_id": "string",
  "amenity_key": "string",
  "amenity_name": "string",
  "description": "string",
  "icon_name": "string",
  "category_id": "string",
  "category_name": "string",
  "is_active": false,
  "assigned_seat_count": 0,
  "applicable_seat_types": [
    "string"
  ]
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `GET /amenity-categories` - Amenity Categories

**Purpose and behavior**

The web/mobile client or a tester uses this operation to amenity Categories.

The web/mobile client or a tester uses this operation to amenity Categories.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: employee saved preferences and admin amenities screens.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `amenities`, `amenity_categories`, `seat_amenities`, `seats`, `floor_layouts`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `page` | no | `integer` | `1` | minimum=1 |
| query | `limit` | no | `integer` | `20` | minimum=1; maximum=200 |
| query | `search` | no | `string | null` | `test` | - |
| query | `status` | no | `string | null` | `ACTIVE` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `AmenityCategoryListResponse`.

Representative response shape:

```json
{
  "items": [
    {
      "category_id": "string",
      "category_key": "string",
      "category_name": "string",
      "description": "string",
      "search_keywords": [
        "string"
      ],
      "is_system_defined": false,
      "is_active": false,
      "amenity_count": 0,
      "active_amenity_count": 0
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "total_pages": 1,
  "active_categories": 1,
  "inactive_categories": 1,
  "system_categories": 1,
  "tenant_categories": 1
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `POST /amenity-categories` - Create Amenity Category

**Purpose and behavior**

The web/mobile client or a tester uses this operation to create Amenity Category.

The web/mobile client or a tester uses this operation to create Amenity Category.

- **Lifecycle:** FUTURE SCOPE - Planned category-management UI.
- **Where used:** No current frontend caller. Planned category-management UI.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted amenities:manage or location:manage (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + amenities:manage or location:manage
- **Primary feature tables:** `amenities`, `amenity_categories`, `seat_amenities`, `seats`, `floor_layouts`, `audit_logs`

**Input contract**

No path or query parameters.

JSON request body, schema `CreateAmenityCategoryRequest`:

```json
{
  "category_name": "string",
  "description": "string",
  "search_keywords": [
    "string"
  ],
  "is_active": true
}
```

**Expected output**

Success returns **HTTP 201** using response schema `AmenityCategoryResponse`.

Representative response shape:

```json
{
  "category_id": "string",
  "category_key": "string",
  "category_name": "string",
  "description": "string",
  "search_keywords": [
    "string"
  ],
  "is_system_defined": false,
  "is_active": false,
  "amenity_count": 0,
  "active_amenity_count": 0
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `GET /amenity-categories/{category_id}` - Amenity Category

**Purpose and behavior**

The web/mobile client or a tester uses this operation to amenity Category.

The web/mobile client or a tester uses this operation to amenity Category.

- **Lifecycle:** FUTURE SCOPE - Planned category-management detail view.
- **Where used:** No current frontend caller. Planned category-management detail view.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `amenities`, `amenity_categories`, `seat_amenities`, `seats`, `floor_layouts`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `category_id` | yes | `integer` | `1` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `AmenityCategoryResponse`.

Representative response shape:

```json
{
  "category_id": "string",
  "category_key": "string",
  "category_name": "string",
  "description": "string",
  "search_keywords": [
    "string"
  ],
  "is_system_defined": false,
  "is_active": false,
  "amenity_count": 0,
  "active_amenity_count": 0
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.

---

#### `PATCH /amenity-categories/{category_id}` - Update Amenity Category

**Purpose and behavior**

The web/mobile client or a tester uses this operation to update Amenity Category.

The web/mobile client or a tester uses this operation to update Amenity Category.

- **Lifecycle:** FUTURE SCOPE - Planned category-management UI.
- **Where used:** No current frontend caller. Planned category-management UI.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted amenities:manage or location:manage (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + amenities:manage or location:manage
- **Primary feature tables:** `amenities`, `amenity_categories`, `seat_amenities`, `seats`, `floor_layouts`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `category_id` | yes | `integer` | `1` | - |

JSON request body, schema `UpdateAmenityCategoryRequest`:

```json
{
  "category_name": "string",
  "description": "string",
  "search_keywords": [
    "string"
  ],
  "is_active": false
}
```

**Expected output**

Success returns **HTTP 200** using response schema `AmenityCategoryResponse`.

Representative response shape:

```json
{
  "category_id": "string",
  "category_key": "string",
  "category_name": "string",
  "description": "string",
  "search_keywords": [
    "string"
  ],
  "is_system_defined": false,
  "is_active": false,
  "amenity_count": 0,
  "active_amenity_count": 0
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `GET /amenities/{amenity_id}` - Amenity Detail

**Purpose and behavior**

The web/mobile client or a tester uses this operation to amenity Detail.

The web/mobile client or a tester uses this operation to amenity Detail.

- **Lifecycle:** FUTURE SCOPE - Planned standalone amenity-detail view; editing currently starts from list data.
- **Where used:** No current frontend caller. Planned standalone amenity-detail view; editing currently starts from list data.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `amenities`, `amenity_categories`, `seat_amenities`, `seats`, `floor_layouts`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `amenity_id` | yes | `integer` | `1` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `AdminAmenityResponse`.

Representative response shape:

```json
{
  "amenity_id": "string",
  "amenity_key": "string",
  "amenity_name": "string",
  "description": "string",
  "icon_name": "string",
  "category_id": "string",
  "category_name": "string",
  "is_active": false,
  "assigned_seat_count": 0,
  "applicable_seat_types": [
    "string"
  ]
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.

---

#### `PATCH /amenities/{amenity_id}` - Update Amenity

**Purpose and behavior**

The web/mobile client or a tester uses this operation to update Amenity.

The web/mobile client or a tester uses this operation to update Amenity.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: employee saved preferences and admin amenities screens.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted amenities:manage or location:manage (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + amenities:manage or location:manage
- **Primary feature tables:** `amenities`, `amenity_categories`, `seat_amenities`, `seats`, `floor_layouts`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `amenity_id` | yes | `integer` | `1` | - |

JSON request body, schema `UpdateAmenityRequest`:

```json
{
  "amenity_name": "string",
  "description": "string",
  "icon_name": "string",
  "category_id": 1,
  "is_active": false,
  "applicable_seat_types": [
    "SEAT"
  ]
}
```

**Expected output**

Success returns **HTTP 200** using response schema `AdminAmenityResponse`.

Representative response shape:

```json
{
  "amenity_id": "string",
  "amenity_key": "string",
  "amenity_name": "string",
  "description": "string",
  "icon_name": "string",
  "category_id": "string",
  "category_name": "string",
  "is_active": false,
  "assigned_seat_count": 0,
  "applicable_seat_types": [
    "string"
  ]
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

### floor-layouts

#### `POST /admin/floor-layouts` - Create Floor Layout

**Purpose and behavior**

An administrator uploads an SVG floor plan and maps its seat identifiers.

An administrator uploads an SVG floor plan and maps its seat identifiers.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: floor-plan upload, scheduling, publishing, deletion, and seat mapping.
- **Effective role access:** A role granted layout:upload; require_permission has no automatic admin bypass (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + layout:upload
- **Primary feature tables:** `floor_layouts`, `layout_seat_mappings`, `seats`, `sites`, `buildings`, `floors`, `app_users`, `audit_logs`

**Input contract**

No path or query parameters.

Multipart request body, schema `Body_create_floor_layout_route_admin_floor_layouts_post`:

| Field | Required | Type | Example |
|---|---:|---|---|
| `file` | yes | `string` | `<select-file>` |
| `site_id` | yes | `integer` | `1` |
| `building_id` | yes | `integer` | `1` |
| `floor_id` | yes | `integer` | `1` |
| `layout_name` | yes | `string` | `QA Floor Layout` |
| `status` | yes | `string` | `DRAFT` |
| `layout_metadata` | no | `string | null` | `{"width": 1200, "height": 800}` |
| `seat_ids` | yes | `array<string>` | `['string']` |

**Expected output**

Success returns **HTTP 201** using response schema `FloorLayoutResponse`.

Representative response shape:

```json
{
  "layout_id": "string",
  "tenant_id": "string",
  "site_id": "1",
  "building_id": "1",
  "floor_id": "1",
  "site_name": "string",
  "building_name": "string",
  "floor_name": "string",
  "layout_name": "QA Floor Layout",
  "layout_file_url": "string",
  "file_storage_provider": "string",
  "layout_type": "string",
  "version_no": 1,
  "is_published": false,
  "layout_metadata": {
    "width": 1200,
    "height": 800
  },
  "uploaded_by_user_id": "string",
  "uploaded_by_name": "string",
  "uploaded_by_email": "string",
  "uploaded_by_role": "string",
  "uploaded_by_department": "string",
  "uploaded_by_job_title": "string",
  "updated_by_user_id": "string",
  "updated_by_name": "string",
  "updated_by_email": "string",
  "updated_by_role": "string",
  "updated_by_department": "string",
  "updated_by_job_title": "string",
  "published_by_user_id": "string",
  "published_by_name": "string",
  "published_by_email": "string",
  "published_by_role": "string",
  "published_by_department": "string",
  "published_by_job_title": "string",
  "published_at": "2030-01-15T09:00:00Z",
  "status": "ACTIVE",
  "effective_from": "2030-01-15T09:00:00Z",
  "effective_till": "2030-01-15T09:00:00Z",
  "created_at": "2030-01-15T09:00:00Z",
  "updated_at": "2030-01-15T09:00:00Z"
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `GET /admin/floor-layouts/floors/{floor_id}` - List Floor Layouts

**Purpose and behavior**

The web/mobile client or a tester uses this operation to list Floor Layouts.

The web/mobile client or a tester uses this operation to list Floor Layouts.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: floor-plan upload, scheduling, publishing, deletion, and seat mapping.
- **Effective role access:** A role granted layout:upload; require_permission has no automatic admin bypass (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + layout:upload
- **Primary feature tables:** `floor_layouts`, `layout_seat_mappings`, `seats`, `sites`, `buildings`, `floors`, `app_users`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `floor_id` | yes | `integer` | `1` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<FloorLayoutResponse>`.

Representative response shape:

```json
[
  {
    "layout_id": "string",
    "tenant_id": "string",
    "site_id": "1",
    "building_id": "1",
    "floor_id": "1",
    "site_name": "string",
    "building_name": "string",
    "floor_name": "string",
    "layout_name": "QA Floor Layout",
    "layout_file_url": "string",
    "file_storage_provider": "string",
    "layout_type": "string",
    "version_no": 1,
    "is_published": false,
    "layout_metadata": {
      "width": 1200,
      "height": 800
    },
    "uploaded_by_user_id": "string",
    "uploaded_by_name": "string",
    "uploaded_by_email": "string",
    "uploaded_by_role": "string",
    "uploaded_by_department": "string",
    "uploaded_by_job_title": "string",
    "updated_by_user_id": "string",
    "updated_by_name": "string",
    "updated_by_email": "string",
    "updated_by_role": "string",
    "updated_by_department": "string",
    "updated_by_job_title": "string",
    "published_by_user_id": "string",
    "published_by_name": "string",
    "published_by_email": "string",
    "published_by_role": "string",
    "published_by_department": "string",
    "published_by_job_title": "string",
    "published_at": "2030-01-15T09:00:00Z",
    "status": "ACTIVE",
    "effective_from": "2030-01-15T09:00:00Z",
    "effective_till": "2030-01-15T09:00:00Z",
    "created_at": "2030-01-15T09:00:00Z",
    "updated_at": "2030-01-15T09:00:00Z"
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.

---

#### `POST /admin/floor-layouts/{layout_id}/activate` - Activate Floor Layout

**Purpose and behavior**

The web/mobile client or a tester uses this operation to activate Floor Layout.

The web/mobile client or a tester uses this operation to activate Floor Layout.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: floor-plan upload, scheduling, publishing, deletion, and seat mapping.
- **Effective role access:** A role granted layout:publish; require_permission has no automatic admin bypass (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + layout:publish
- **Primary feature tables:** `floor_layouts`, `layout_seat_mappings`, `seats`, `sites`, `buildings`, `floors`, `app_users`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `layout_id` | yes | `integer` | `1` | - |

JSON request body, schema `ActivateFloorLayoutRequest or null`:

```json
{
  "effective_date": "{{qaLayoutDate}}"
}
```

**Expected output**

Success returns **HTTP 200** using response schema `FloorLayoutResponse`.

Representative response shape:

```json
{
  "layout_id": "string",
  "tenant_id": "string",
  "site_id": "1",
  "building_id": "1",
  "floor_id": "1",
  "site_name": "string",
  "building_name": "string",
  "floor_name": "string",
  "layout_name": "QA Floor Layout",
  "layout_file_url": "string",
  "file_storage_provider": "string",
  "layout_type": "string",
  "version_no": 1,
  "is_published": false,
  "layout_metadata": {
    "width": 1200,
    "height": 800
  },
  "uploaded_by_user_id": "string",
  "uploaded_by_name": "string",
  "uploaded_by_email": "string",
  "uploaded_by_role": "string",
  "uploaded_by_department": "string",
  "uploaded_by_job_title": "string",
  "updated_by_user_id": "string",
  "updated_by_name": "string",
  "updated_by_email": "string",
  "updated_by_role": "string",
  "updated_by_department": "string",
  "updated_by_job_title": "string",
  "published_by_user_id": "string",
  "published_by_name": "string",
  "published_by_email": "string",
  "published_by_role": "string",
  "published_by_department": "string",
  "published_by_job_title": "string",
  "published_at": "2030-01-15T09:00:00Z",
  "status": "ACTIVE",
  "effective_from": "2030-01-15T09:00:00Z",
  "effective_till": "2030-01-15T09:00:00Z",
  "created_at": "2030-01-15T09:00:00Z",
  "updated_at": "2030-01-15T09:00:00Z"
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `PATCH /admin/floor-layouts/{layout_id}/schedule` - Reschedule Floor Layout

**Purpose and behavior**

The web/mobile client or a tester uses this operation to reschedule Floor Layout.

The web/mobile client or a tester uses this operation to reschedule Floor Layout.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: floor-plan upload, scheduling, publishing, deletion, and seat mapping.
- **Effective role access:** A role granted layout:publish; require_permission has no automatic admin bypass (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + layout:publish
- **Primary feature tables:** `floor_layouts`, `layout_seat_mappings`, `seats`, `sites`, `buildings`, `floors`, `app_users`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `layout_id` | yes | `integer` | `1` | - |

JSON request body, schema `RescheduleFloorLayoutRequest`:

```json
{
  "effective_date": "{{qaLayoutDate}}"
}
```

**Expected output**

Success returns **HTTP 200** using response schema `FloorLayoutResponse`.

Representative response shape:

```json
{
  "layout_id": "string",
  "tenant_id": "string",
  "site_id": "1",
  "building_id": "1",
  "floor_id": "1",
  "site_name": "string",
  "building_name": "string",
  "floor_name": "string",
  "layout_name": "QA Floor Layout",
  "layout_file_url": "string",
  "file_storage_provider": "string",
  "layout_type": "string",
  "version_no": 1,
  "is_published": false,
  "layout_metadata": {
    "width": 1200,
    "height": 800
  },
  "uploaded_by_user_id": "string",
  "uploaded_by_name": "string",
  "uploaded_by_email": "string",
  "uploaded_by_role": "string",
  "uploaded_by_department": "string",
  "uploaded_by_job_title": "string",
  "updated_by_user_id": "string",
  "updated_by_name": "string",
  "updated_by_email": "string",
  "updated_by_role": "string",
  "updated_by_department": "string",
  "updated_by_job_title": "string",
  "published_by_user_id": "string",
  "published_by_name": "string",
  "published_by_email": "string",
  "published_by_role": "string",
  "published_by_department": "string",
  "published_by_job_title": "string",
  "published_at": "2030-01-15T09:00:00Z",
  "status": "ACTIVE",
  "effective_from": "2030-01-15T09:00:00Z",
  "effective_till": "2030-01-15T09:00:00Z",
  "created_at": "2030-01-15T09:00:00Z",
  "updated_at": "2030-01-15T09:00:00Z"
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `DELETE /admin/floor-layouts/{layout_id}` - Delete Floor Layout

**Purpose and behavior**

The web/mobile client or a tester uses this operation to delete Floor Layout.

The web/mobile client or a tester uses this operation to delete Floor Layout.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: floor-plan upload, scheduling, publishing, deletion, and seat mapping.
- **Effective role access:** A role granted layout:publish; require_permission has no automatic admin bypass (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + layout:publish
- **Primary feature tables:** `floor_layouts`, `layout_seat_mappings`, `seats`, `sites`, `buildings`, `floors`, `app_users`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `layout_id` | yes | `integer` | `1` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `FloorLayoutResponse`.

Representative response shape:

```json
{
  "layout_id": "string",
  "tenant_id": "string",
  "site_id": "1",
  "building_id": "1",
  "floor_id": "1",
  "site_name": "string",
  "building_name": "string",
  "floor_name": "string",
  "layout_name": "QA Floor Layout",
  "layout_file_url": "string",
  "file_storage_provider": "string",
  "layout_type": "string",
  "version_no": 1,
  "is_published": false,
  "layout_metadata": {
    "width": 1200,
    "height": 800
  },
  "uploaded_by_user_id": "string",
  "uploaded_by_name": "string",
  "uploaded_by_email": "string",
  "uploaded_by_role": "string",
  "uploaded_by_department": "string",
  "uploaded_by_job_title": "string",
  "updated_by_user_id": "string",
  "updated_by_name": "string",
  "updated_by_email": "string",
  "updated_by_role": "string",
  "updated_by_department": "string",
  "updated_by_job_title": "string",
  "published_by_user_id": "string",
  "published_by_name": "string",
  "published_by_email": "string",
  "published_by_role": "string",
  "published_by_department": "string",
  "published_by_job_title": "string",
  "published_at": "2030-01-15T09:00:00Z",
  "status": "ACTIVE",
  "effective_from": "2030-01-15T09:00:00Z",
  "effective_till": "2030-01-15T09:00:00Z",
  "created_at": "2030-01-15T09:00:00Z",
  "updated_at": "2030-01-15T09:00:00Z"
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `GET /admin/floor-layouts/{layout_id}/seats` - Get Floor Layout Seats

**Purpose and behavior**

The web/mobile client or a tester uses this operation to get Floor Layout Seats.

The web/mobile client or a tester uses this operation to get Floor Layout Seats.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: floor-plan upload, scheduling, publishing, deletion, and seat mapping.
- **Effective role access:** A role granted layout:upload; require_permission has no automatic admin bypass (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + layout:upload
- **Primary feature tables:** `floor_layouts`, `layout_seat_mappings`, `seats`, `sites`, `buildings`, `floors`, `app_users`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `layout_id` | yes | `integer` | `1` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `LayoutSeatListResponse`.

Representative response shape:

```json
{
  "layout_id": "string",
  "total_seats": 1,
  "configured_seats": 1,
  "pending_seats": 1,
  "items": [
    {
      "layout_seat_mapping_id": "string",
      "layout_id": "string",
      "site_id": "1",
      "building_id": "1",
      "floor_id": "1",
      "seat_id": "1",
      "svg_element_id": "string",
      "seat_code": "A-101",
      "seat_name": "string",
      "seat_type": "string",
      "status": "ACTIVE",
      "configuration_status": "string",
      "is_bookable": false,
      "is_reserved": false,
      "is_configured": false,
      "notes": "Created during API testing",
      "amenity_ids": [],
      "capacity": 1,
      "created_at": "2030-01-15T09:00:00Z",
      "updated_at": "2030-01-15T09:00:00Z"
    }
  ]
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.

---

### user-management

#### `GET /admin/users` - Admin User Directory

**Purpose and behavior**

The web/mobile client or a tester uses this operation to admin User Directory.

The web/mobile client or a tester uses this operation to admin User Directory.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: admin user directory, user lookup, profile editing, and access management.
- **Effective role access:** TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view, users:view, or user:view (currently TENANT_ADMIN).
- **Route gate:** Bearer/access cookie + admin_dashboard:view, users:view, or user:view
- **Primary feature tables:** `app_users`, `roles`, `role_permissions`, `permissions`, `teams`, `team_members`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `role` | no | `string | null` | `string` | - |
| query | `roles` | no | `array<string> | null` | `["string"]` | - |
| query | `status` | no | `string | null` | `ACTIVE` | - |
| query | `page` | no | `integer | null` | `1` | - |
| query | `limit` | no | `integer | null` | `20` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `AdminUserDirectoryResponse`.

Representative response shape:

```json
{
  "summary": {
    "totalUsers": 1,
    "filteredUsers": 1,
    "activeUsers": 1,
    "inactiveUsers": 1
  },
  "roles": [
    {
      "roleId": 1,
      "roleName": "string",
      "roleDescription": "string",
      "userCount": 1,
      "permissionCount": 1,
      "permissions": [
        {
          "id": 1,
          "permissionKey": "string",
          "description": "string",
          "moduleName": "string"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "items": [
    {
      "id": "string",
      "employeeId": "string",
      "fullName": "string",
      "roleName": "string",
      "department": "string",
      "jobTitle": "string",
      "mobilePhone": "string",
      "officeLocation": "string",
      "status": "ACTIVE",
      "email": "tester@example.com"
    }
  ]
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `GET /users` - Search Users

**Purpose and behavior**

The web/mobile client or a tester uses this operation to search Users.

The web/mobile client or a tester uses this operation to search Users.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: admin user directory, user lookup, profile editing, and access management.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; profile mutation is self-only.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `app_users`, `roles`, `teams`, `team_members`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| query | `q` | yes | `string` | `test` | minLength=1 |
| query | `limit` | no | `integer` | `20` | minimum=1; maximum=100 |
| query | `include_inactive` | no | `boolean` | `false` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `array<UserSearchResponse>`.

Representative response shape:

```json
[
  {
    "user_id": "1",
    "tenant_id": "string",
    "full_name": "Test User",
    "email": "tester@example.com",
    "role_name": "string",
    "status": "ACTIVE",
    "employee_id": "string",
    "department": "string",
    "office_location": "string"
  }
]
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `PATCH /users/me` - Update Profile

**Purpose and behavior**

The web/mobile client or a tester uses this operation to update Profile.

The web/mobile client or a tester uses this operation to update Profile.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: admin user directory, user lookup, profile editing, and access management.
- **Effective role access:** EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and PRODUCT_ADMIN, provided the account is ACTIVE; profile mutation is self-only.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `app_users`, `roles`, `teams`, `team_members`, `audit_logs`

**Input contract**

No path or query parameters.

JSON request body, schema `UpdateMyProfileRequest`:

```json
{
  "bio": "string",
  "skills": [
    "string"
  ]
}
```

**Expected output**

Success returns **HTTP 200** using response schema `UserResponse`.

Representative response shape:

```json
{
  "user_id": "1",
  "tenant_id": "string",
  "tenant_name": "string",
  "email": "tester@example.com",
  "full_name": "Test User",
  "display_name": "Test User",
  "name": "QA Example",
  "microsoft_object_id": "string",
  "user_principal_name": "string",
  "mobile_phone": "+919876543210",
  "office_location": "string",
  "department": "string",
  "job_title": "string",
  "company_name": "string",
  "employee_id": "string",
  "manager_user_id": "string",
  "home_site_id": "string",
  "role": "string",
  "role_name": "string",
  "status": "ACTIVE",
  "graph_last_synced_at": "2030-01-15T09:00:00Z",
  "created_at": "2030-01-15T09:00:00Z",
  "updated_at": "2030-01-15T09:00:00Z",
  "bio": "string",
  "skills": [
    "string"
  ],
  "permissions": []
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

#### `GET /users/{user_id}` - Get User By Id

**Purpose and behavior**

The web/mobile client or a tester uses this operation to get User By Id.

The web/mobile client or a tester uses this operation to get User By Id.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: admin user directory, user lookup, profile editing, and access management.
- **Effective role access:** Self or TENANT_ADMIN only.
- **Route gate:** Bearer token or access-token cookie
- **Primary feature tables:** `app_users`, `roles`, `teams`, `team_members`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `user_id` | yes | `string` | `1` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `UserDetailsResponse`.

Representative response shape:

```json
{
  "id": "string",
  "email": "tester@example.com",
  "fullName": "string",
  "displayName": "string",
  "roleName": "string",
  "status": "ACTIVE",
  "employeeId": "string",
  "mobilePhone": "string",
  "officeLocation": "string",
  "jobTitle": "string",
  "department": "string",
  "companyName": "string",
  "managerUserId": "string",
  "homeSiteId": "string"
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.

---

#### `GET /users/{user_id}/bookings` - Get User Bookings

**Purpose and behavior**

The web/mobile client or a tester uses this operation to get User Bookings.

The web/mobile client or a tester uses this operation to get User Bookings.

- **Lifecycle:** FUTURE SCOPE - Planned admin/facilitator overseer view of a user's booking history.
- **Where used:** No current frontend caller. Planned admin/facilitator overseer view of a user's booking history.
- **Effective role access:** Route permission plus service ownership: self or TENANT_ADMIN only.
- **Route gate:** Bearer/access cookie + admin_dashboard:view, users:view, user:view, or teammate:view; service then limits cross-user access to TENANT_ADMIN
- **Primary feature tables:** `app_users`, `roles`, `teams`, `team_members`, `bookings`, `seats`, `sites`, `buildings`, `floors`, `floor_layouts`, `layout_seat_mappings`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `user_id` | yes | `string` | `1` | - |

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `UserBookingHistoryResponse`.

Representative response shape:

```json
{
  "user": {
    "id": "string",
    "email": "tester@example.com",
    "fullName": "string",
    "displayName": "string",
    "roleName": "string",
    "status": "ACTIVE",
    "employeeId": "string",
    "mobilePhone": "string",
    "officeLocation": "string",
    "jobTitle": "string",
    "department": "string",
    "companyName": "string",
    "managerUserId": "string",
    "homeSiteId": "string"
  },
  "hasTodayBooking": false,
  "todayBooking": {
    "activity_source": "string",
    "booking_id": "string",
    "tenant_id": "string",
    "booked_for_user_id": "string",
    "booked_for_guest_id": "string",
    "booked_by_user_id": "string",
    "booked_by_name": "string",
    "booked_by_email": "string",
    "booked_for_name": "string",
    "booked_for_email": "string",
    "booked_for_phone": "string",
    "booked_for_organization": "string",
    "guest_visit_id": "1",
    "booking_type": "EMPLOYEE",
    "seat_id": "1",
    "site_id": "1",
    "building_id": "1",
    "floor_id": "1",
    "seat_code": "A-101",
    "site_name": "string",
    "building_name": "string",
    "floor_name": "string",
    "booking_date": "{{qaDate}}",
    "booking_status": "string",
    "source_channel": "API",
    "check_in_at": "2030-01-15T09:00:00Z",
    "checked_out_at": "2030-01-15T09:00:00Z",
    "cancelled_at": "2030-01-15T09:00:00Z",
    "cancellation_reason": "string",
    "updated_user_id": "string",
    "updated_by_name": "string",
    "updated_by_email": "string",
    "modified_from_booking_id": "string",
    "modification_reason": "string",
    "is_modified": false,
    "created_at": "2030-01-15T09:00:00Z",
    "updated_at": "2030-01-15T09:00:00Z",
    "guest_name": "string",
    "guest_email": "string",
    "guest_phone": "string",
    "guest_organization": "string",
    "guest_type": "INTERVIEW_CANDIDATE",
    "purpose_of_visit": "INTERVIEW",
    "visit_status": "string",
    "host_user_id": "string",
    "host_name": "string",
    "host_email": "string",
    "start_time": "09:00:00",
    "end_time": "18:00:00",
    "desk_type": "string",
    "notes": "Created during API testing",
    "requires_seat": false,
    "amenities": [
      "string"
    ]
  },
  "bookings": {
    "items": [
      {
        "activity_source": "string",
        "booking_id": "string",
        "tenant_id": "string",
        "booked_for_user_id": "string",
        "booked_for_guest_id": "string",
        "booked_by_user_id": "string",
        "booked_by_name": "string",
        "booked_by_email": "string",
        "booked_for_name": "string",
        "booked_for_email": "string",
        "booked_for_phone": "string",
        "booked_for_organization": "string",
        "guest_visit_id": "1",
        "booking_type": "EMPLOYEE",
        "seat_id": "1",
        "site_id": "1",
        "building_id": "1",
        "floor_id": "1",
        "seat_code": "A-101",
        "site_name": "string",
        "building_name": "string",
        "floor_name": "string",
        "booking_date": "{{qaDate}}",
        "booking_status": "string",
        "source_channel": "API",
        "check_in_at": "2030-01-15T09:00:00Z",
        "checked_out_at": "2030-01-15T09:00:00Z",
        "cancelled_at": "2030-01-15T09:00:00Z",
        "cancellation_reason": "string",
        "updated_user_id": "string",
        "updated_by_name": "string",
        "updated_by_email": "string",
        "modified_from_booking_id": "string",
        "modification_reason": "string",
        "is_modified": false,
        "created_at": "2030-01-15T09:00:00Z",
        "updated_at": "2030-01-15T09:00:00Z",
        "guest_name": "string",
        "guest_email": "string",
        "guest_phone": "string",
        "guest_organization": "string",
        "guest_type": "INTERVIEW_CANDIDATE",
        "purpose_of_visit": "INTERVIEW",
        "visit_status": "string",
        "host_user_id": "string",
        "host_name": "string",
        "host_email": "string",
        "start_time": "09:00:00",
        "end_time": "18:00:00",
        "desk_type": "string",
        "notes": "Created during API testing",
        "requires_seat": false,
        "amenities": [
          "string"
        ]
      }
    ]
  }
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.

---

#### `PATCH /admin/users/{user_id}/access` - Update User Access

**Purpose and behavior**

An authorized administrator changes a user's role or account status.

An authorized administrator changes a user's role or account status.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Current application area: admin user directory, user lookup, profile editing, and access management.
- **Effective role access:** A role granted user:manage (currently TENANT_ADMIN); self-change and PRODUCT_ADMIN targets are blocked.
- **Route gate:** Bearer/access cookie + user:manage
- **Primary feature tables:** `app_users`, `roles`, `role_permissions`, `permissions`, `teams`, `team_members`, `audit_logs`

**Input contract**

| Location | Field | Required | Type | Example | Declared constraints/description |
|---|---|---:|---|---|---|
| path | `user_id` | yes | `string` | `1` | - |

JSON request body, schema `AdminUserAccessUpdateRequest`:

```json
{
  "role_name": "EMPLOYEE",
  "status": "ACTIVE"
}
```

**Expected output**

Success returns **HTTP 200** using response schema `UserResponse`.

Representative response shape:

```json
{
  "user_id": "1",
  "tenant_id": "string",
  "tenant_name": "string",
  "email": "tester@example.com",
  "full_name": "Test User",
  "display_name": "Test User",
  "name": "QA Example",
  "microsoft_object_id": "string",
  "user_principal_name": "string",
  "mobile_phone": "+919876543210",
  "office_location": "string",
  "department": "string",
  "job_title": "string",
  "company_name": "string",
  "employee_id": "string",
  "manager_user_id": "string",
  "home_site_id": "string",
  "role": "string",
  "role_name": "string",
  "status": "ACTIVE",
  "graph_last_synced_at": "2030-01-15T09:00:00Z",
  "created_at": "2030-01-15T09:00:00Z",
  "updated_at": "2030-01-15T09:00:00Z",
  "bio": "string",
  "skills": [
    "string"
  ],
  "permissions": []
}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.

**Negative scenarios**

- Missing, expired, Microsoft-issued, or revoked backend access token returns 401.
- Authenticated user without the required permission/role/ownership is rejected with 403.
- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).
- Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.
- Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.

---

### service

#### `GET /` - Index

**Purpose and behavior**

Expose a lightweight service descriptor for operators and developers.  Returns:     dict[str, object]: Static metadata describing the service name,     documentation location, and the major public endpoints currently     mounted on the application.  Side Effects:     None.  Failure Modes:     None expected under normal runtime conditions because the response is a     static in-memory structure.

The web/mobile client or a tester uses this operation to index.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Service discovery/manual verification; not a product-screen call.
- **Effective role access:** Public; no application role is required.
- **Route gate:** Public (SSO callbacks still validate OAuth state/tokens)
- **Primary feature tables:** None; this is static, redirect-based, or operational.

**Input contract**

No path or query parameters.

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `Response Index  Get`.

Representative response shape:

```json
{}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

#### `GET /health` - Health

**Purpose and behavior**

Report a minimal liveness signal for health checks.  Returns:     dict[str, str]: A static status payload indicating that the process is     running and able to serve requests.  Side Effects:     None.  Failure Modes:     None expected because no external dependencies are consulted here.

A load balancer, deployment check, or tester verifies that the API process is alive.

- **Lifecycle:** ACTIVE - used by the current application or operational tooling.
- **Where used:** Deployment probes, load balancers, smoke tests, and tester setup checks.
- **Effective role access:** Public; no application role is required.
- **Route gate:** Public (SSO callbacks still validate OAuth state/tokens)
- **Primary feature tables:** None; this is static, redirect-based, or operational.

**Input contract**

No path or query parameters.

Request body: none.

**Expected output**

Success returns **HTTP 200** using response schema `Response Health Health Get`.

Representative response shape:

```json
{}
```

**Positive scenarios**

- Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape.
- Exercise supported filters/pagination and verify tenant-scoped, stable results.

**Negative scenarios**

- Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).

---

## Regeneration and drift check

Run from the repository root:

```powershell
.\.venv\Scripts\python.exe backend\docs\api\generate_api_assets.py
```

The generator fails if the number of Postman requests differs from the number of FastAPI operations. SQL table mappings and service-level role rules still require review whenever repositories or authorization logic change because OpenAPI cannot infer them.
