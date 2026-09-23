# SSO Gateway Integration & Multi-Tenant RBAC — Working Notes

Captured 2026-09-21. WIP code for the items below is stashed on `feature/ved/final_merge`
as `stash@{0}` ("WIP: SSO gateway integration ..."). This file is untracked scratch —
not meant to be committed as-is, just a durable record of what was discussed/decided
before pulling latest and fixing the CD lint failure.

## 1. SSO gateway integration (`apps.solugenix.com/sso/auth/login`)

**Status: working end-to-end in dev, stashed, not committed.**

- Discovered `apps.solugenix.com/sso/auth/login?redirectUI=<url>` is a separate internal
  SSO gateway (app "HireHub", appid `938e8782-a316-4cd1-a813-57d1681df958`) that wraps a
  real Microsoft login and redirects to `redirectUI` with an HS256 `?token=` wrapper.
  The wrapper embeds the user's Graph profile fields directly, plus a real RS256
  Microsoft Graph access token (`accessToken` field) and its own short `iat`/`exp` window
  (~30 min).
- Confirmed empirically: `redirectUI` is **not domain-restricted** — it happily redirected
  a live, MFA'd token to `http://localhost:8000/...`. This is worth flagging to whoever
  owns that gateway as an open-redirect-ish issue on their end, independent of anything
  we do.
- Trust model chosen: don't verify the outer wrapper's HS256 signature (we don't hold
  the secret). Instead, treat the embedded `accessToken` as the actual trust anchor —
  it's only acted on after `fetch_graph_me(access_token)` succeeds, i.e. after Microsoft
  itself validates it. A forged/tampered wrapper would carry a Graph token Microsoft
  rejects.
- Built (stashed):
  - `backend/core/sso.py`: `decode_gateway_token(token)` — unverified-decodes the
    wrapper, checks `exp`, pulls `accessToken`, decodes *that* token's unverified `tid`
    claim (safe to trust only because the prior Graph call already proved the signature
    is genuine).
  - `backend/api/routes/sso.py`: new `GET /auth/sso-gateway-callback` route — mirrors
    `auth_callback`'s tenant-resolution/provisioning/token-issuance logic, but sourced
    from the gateway token instead of a code-exchange id_token. Uses **strict**
    `fetch_tenant_by_azure_tenant_id` (no fallback-to-default-tenant) since, unlike
    `/auth/callback`, this flow's Microsoft login isn't scoped to our own tenant by
    Microsoft itself — our own tenant_key check is the only enforcement point.
  - Frontend: `authService.loginWithGateway()` in `auth.service.ts`, wired as the main
    login button's action in `useLogin.ts` (replaced the old direct-OAuth
    `loginWithEmail` call, which is now unused/removed).
- **Known open gaps, not yet addressed:**
  - No CSRF/state binding on this flow — the gateway doesn't echo back any
    caller-supplied param as far as we've tested, so there's no way to bind the
    callback to the browser session that initiated it. Still open question: does the
    gateway echo an arbitrary extra query param if we add one? Untested.
  - `/auth/callback` (the original direct-OAuth flow) is now unreferenced by the UI but
    still live in the backend — fine to leave, or remove later if the gateway path is
    the permanent one.

## 2. Multi-tenant RBAC gap (found while testing the gateway login)

**Status: diagnosed via full audit, not yet fixed.**

Logging in via the gateway auto-provisioned a new tenant (`id=4`,
`tenant_key='63bfb01f-2414-4914-bef3-bd1ee7be8c4e'`, name "Solugenix-Prod" — this is the
*real* corp Azure tenant; tenant `id=3` ("solugenix") is effectively the dev tenant).
Both represent the same real company, just dev vs. prod login paths — not different
customer orgs.

**Root cause of the reported bug:** `roles` and `role_permissions` are tenant-scoped
tables, seeded only for `tenant_id=3`. Tenant 4 has zero role rows, so
`fetch_permissions_for_role()` (`backend/repositories/permission_repository.py:10`)
returns `[]` for every role, `/auth/me` shows `permissions: []`, and every
`require_permission`-gated endpoint (e.g. `POST /admin/floor-layouts` →
`layout:upload`) 403s — including for the user's assigned `TENANT_ADMIN` role.

**A second, independent bug found along the way:** `backend/api/deps.py` has two
permission dependencies that behave inconsistently —
`require_permission()` (line ~267) does a flat list check with no admin bypass, while
`require_any_permission()` (line ~294) has an `ADMIN_ROLE_NAMES = {"PRODUCT_ADMIN",
"TENANT_ADMIN"}` short-circuit. So even with roles seeded correctly, a `TENANT_ADMIN`
missing one specific grant would 403 on `require_permission`-gated endpoints but sail
through `require_any_permission`-gated ones. This should be fixed regardless of the
tenant-seeding decision below.

**Other tables confirmed empty for tenant 4** (real gaps once permissions are fixed):
`amenity_categories`, `amenities`, `seats`, `floor_layouts`, `layout_seat_mappings`,
`seat_amenities`, `blocked_seats`. `tenant_business_rules` is also empty but degrades
gracefully via hardcoded fallback defaults in `business_rule_service.py`.

**Landmine (dormant, not currently active):** `backend/services/floor_layout_service.py`
hardcodes `LAYOUT_VISIBILITY_PILOT_FLOOR_IDS = frozenset({"9"})` — a bare tenant-3 floor
ID with no tenant scoping. Currently masked by `LAYOUT_VISIBILITY_APPLY_TO_ALL_FLOORS =
True`; would misbehave cross-tenant if that flag is ever flipped back.

**Unresolved / needs follow-up:** `groups` table (16 rows, tenant-3-only, columns
`group_name`/`group_tier`/`permission_set_hash`/`is_system`) looks like a second,
parallel RBAC/policy-tier mechanism. No active caller found in the routes checked so
far, but not confirmed dead either — needs a dedicated check before assuming it's safe
to ignore.

### Recommended fix direction (discussed, not yet actioned)

Make `roles` + `role_permissions` **global** (drop tenant scoping), since role
definitions are business logic that shouldn't differ between dev/prod tenants of the
same company. Keep everything operational (seats, bookings, floor layouts, amenities)
tenant-scoped as today.

Task list if we go this way:
1. Schema migration: drop/deprecate `tenant_id` on `roles`, dedupe the 5 existing
   tenant-3 rows into canonical global rows.
2. `permission_repository.py: fetch_permissions_for_role()` — drop the `tenant_id`
   filter from the query.
3. Sweep for every other call site that joins on `roles.tenant_id` (provisioning code,
   any role-management endpoints) — not yet fully enumerated.
4. Fix the `require_permission` vs `require_any_permission` inconsistency (see above).
5. Resolve the `groups` table question the same way (global vs. per-tenant) once
   confirmed live/dead.
6. Separately (not part of the RBAC fix): build or script tenant-4 seeding for
   `amenity_categories`, `amenities`, at least one real `floor_layouts` + `seats` row —
   still genuinely per-tenant, needed regardless of the roles decision.

**Fallback if per-tenant custom roles are ever wanted for a real distinct customer
tenant:** keep `tenant_id` on `roles`, but build a `provision_tenant()` step that copies
a canonical default role/permission set into any newly created tenant, and call it from
wherever tenant creation happens.

## 3. Housekeeping done alongside this

- Fixed `tenants` table data: row `id=4` currently `status=INACTIVE`
  (`tenant_key='63bfb01f-2414-4914-bef3-bd1ee7be8c4e'`, name "Solugenix-Prod") —
  deliberately kept inactive to avoid a second *active* tenant tripping
  `fetch_default_tenant_id()`'s "exactly one active tenant" fallback assumption, which
  the *old* `/auth/callback` flow still depends on for tenant resolution (row 3's
  `tenant_key` is literally the string `'solugenix'`, not a real GUID, so it never
  exact-matches and always relied on that single-active-tenant fallback). Reconciling
  this is part of item 2's fix, not yet done.
