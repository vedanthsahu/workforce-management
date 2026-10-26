r"""Generate tester-facing API assets from the live FastAPI application.

Run from the repository root:

    .\.venv\Scripts\python.exe backend\docs\api\generate_api_assets.py

The generated OpenAPI and Postman files deliberately contain no secrets.
"""

from __future__ import annotations

import copy
import json
import re
import sys
from collections import OrderedDict
from pathlib import Path
from typing import Any

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
if str(REPOSITORY_ROOT) not in sys.path:
    sys.path.insert(0, str(REPOSITORY_ROOT))

from backend.main import app

OUTPUT_DIR = Path(__file__).resolve().parent
HTTP_METHODS = ("get", "post", "put", "patch", "delete")
PUBLIC_PATHS = {
    "/",
    "/health",
    "/auth/login",
    "/auth/callback",
    "/auth/sso-gateway-callback",
}
COOKIE_ONLY_PATHS = {"/auth/logout", "/auth/refresh"}

AUTH_BASELINE_TABLES = [
    "app_users",
    "user_sessions",
    "roles",
    "role_permissions",
    "permissions",
]

PATH_VARIABLE_EXAMPLES = {
    "amenity_id": "1",
    "audit_id": "1",
    "block_id": "1",
    "booking_id": "1",
    "building_id": "1",
    "category_id": "1",
    "floor_id": "1",
    "guest_id": "1",
    "guest_visit_id": "1",
    "layout_id": "1",
    "layout_seat_mapping_id": "1",
    "office_id": "1",
    "session_id": "00000000-0000-4000-8000-000000000001",
    "seat_id": "1",
    "site_id": "1",
    "user_id": "1",
}

FIELD_EXAMPLES: dict[str, Any] = {
    "action": "BOOKING_CREATED",
    "amenity_ids": [1],
    "booking_date": "{{qaDate}}",
    "blocked_from": "{{qaDate}}",
    "blocked_to": "{{qaEndDate}}",
    "building_id": 1,
    "category": "active",
    "channel": "browser",
    "code": "A-101",
    "display_name": "Test User",
    "date": "{{qaDate}}",
    "activityDate": "{{qaDate}}",
    "effective_date": "{{qaLayoutDate}}",
    "email": "tester@example.com",
    "end_date": "{{qaEndDate}}",
    "end_time": "18:00:00",
    "floor_id": 1,
    "full_name": "Test User",
    "guest_id": 1,
    "guest_visit_id": 1,
    "layout_name": "QA Floor Layout",
    "layout_metadata": '{"width": 1200, "height": 800}',
    "limit": 20,
    "mobile_phone": "+919876543210",
    "name": "QA Example",
    "message": "Show me available seats for next Monday",
    "notes": "Created during API testing",
    "page": 1,
    "phone": "+919876543210",
    "q": "test",
    "reason": "QA verification",
    "search": "test",
    "source_channel": "API",
    "seat_code": "A-101",
    "seat_id": 1,
    "site_id": 1,
    "start_date": "{{qaDate}}",
    "start_time": "09:00:00",
    "status": "ACTIVE",
    "updates": [
        {"id": "booking_policy.employee_max_advance_days", "value": 30}
    ],
    "user_id": 1,
    "visit_date": "{{qaDate}}",
}

USE_CASES = {
    (
        "POST",
        "/bookings",
    ): "An employee reserves a seat for themselves or, when allowed, for another employee.",
    (
        "POST",
        "/bookings/eligibility",
    ): "The booking UI checks policy and overlap rules before showing the final confirmation action.",
    (
        "GET",
        "/floors/{floor_id}/seats",
    ): "The seat picker loads availability, blocked dates, and amenity matches for a date range.",
    (
        "POST",
        "/guest-visits",
    ): "A host or reception user registers an upcoming guest visit.",
    (
        "POST",
        "/guest-bookings",
    ): "A host creates a guest visit together with a seat reservation.",
    (
        "POST",
        "/admin/floor-layouts",
    ): "An administrator uploads an SVG floor plan and maps its seat identifiers.",
    (
        "GET",
        "/admin/dashboard/summary",
    ): "An administrator loads KPI cards for occupancy, bookings, visits, and blocked seats.",
    (
        "GET",
        "/admin/audit",
    ): "An administrator investigates tenant activity using server-side filters and pagination.",
    (
        "PATCH",
        "/admin/users/{user_id}/access",
    ): "An authorized administrator changes a user's role or account status.",
    (
        "GET",
        "/health",
    ): "A load balancer, deployment check, or tester verifies that the API process is alive.",
}


ALL_AUTHENTICATED_ROLES = (
    "EMPLOYEE, MANAGER, FACILITATOR, FRONT_OFFICE, TENANT_ADMIN, and "
    "PRODUCT_ADMIN, provided the account is ACTIVE"
)

# These are explicitly marked "Future Scope API" in the route modules. They
# remain supported contracts, but the current frontend has no caller for them.
FUTURE_SCOPE: dict[tuple[str, str], str] = {
    ("GET", "/api/chat/session/{session_id}"): (
        "Planned chat-session resume feature; the current chat panel keeps "
        "session state client-side."
    ),
    ("GET", "/guests/{guest_id}"): "Planned guest-detail and overseer screen.",
    ("PATCH", "/guests/{guest_id}/status"): (
        "Planned guest blacklist/reactivation control; no UI exists yet."
    ),
    ("GET", "/guests/{guest_id}/visits"): (
        "Planned admin/facilitator guest visit-history view."
    ),
    ("GET", "/guest-visits/{guest_visit_id}"): (
        "Planned direct visit lookup from a guest or user profile."
    ),
    ("GET", "/guest-bookings"): (
        "Planned tenant-wide admin/facilitator guest-booking overseer view."
    ),
    ("GET", "/guest-bookings/{booking_id}"): (
        "Planned direct guest-booking lookup from a guest profile."
    ),
    ("GET", "/amenity-categories/{category_id}"): (
        "Planned category-management detail view."
    ),
    ("POST", "/amenity-categories"): "Planned category-management UI.",
    ("PATCH", "/amenity-categories/{category_id}"): (
        "Planned category-management UI."
    ),
    ("GET", "/amenities/{amenity_id}"): (
        "Planned standalone amenity-detail view; editing currently starts "
        "from list data."
    ),
    ("GET", "/users/{user_id}/bookings"): (
        "Planned admin/facilitator overseer view of a user's booking history."
    ),
}

UI_AREAS = {
    "auth": "authentication bootstrap, session refresh, profile loading, and logout",
    "SSO": "browser-based Microsoft/SSO sign-in and callback handling",
    "bookings": "Book a Seat, My Bookings, dashboard booking cards, and delegated-booking flows",
    "business-rules": "Admin Configuration and policy-aware booking/layout screens",
    "chat": "the authenticated employee chatbot panel",
    "guests": "guest directory and guest-management workflows",
    "guest-visits": "guest invitation, reception/security dashboard, and guest workflow actions",
    "guest-bookings": "guest booking actions surfaced from admin booking management",
    "locations": "booking location selectors and admin site/building/floor/layout management",
    "teams": "Find a Teammate and dashboard team-presence widgets",
    "dashboard": "the employee dashboard and preference prefill",
    "admin-dashboard": "admin KPI, activity, occupancy trend, and hierarchy screens",
    "admin-bookings": "tenant-wide Admin Bookings list and autocomplete filters",
    "admin-blocked-seats": "Admin Blocked Seats list, editor, conflict view, and history",
    "admin-audit": "Admin Audit Log list, filtering, and detail drawer",
    "preferences": "employee saved preferences and admin amenities screens",
    "floor-layouts": "floor-plan upload, scheduling, publishing, deletion, and seat mapping",
    "user-management": "admin user directory, user lookup, profile editing, and access management",
    "service": "service discovery and operational health checks",
}

# Snapshot verified against the current local roles/role_permissions data for
# tenants 3 and 4 on 2026-10-23. Permission grants are tenant data and may be
# changed independently, so endpoint entries also retain the literal gate.
CURRENT_ROLE_PERMISSIONS: dict[str, list[str]] = {
    "EMPLOYEE": [
        "booking:cancel_own", "booking:view_own", "dashboard:view",
        "seat:book_self", "teammate:view",
    ],
    "FACILITATOR": [
        "booking:book_for_employee", "booking:book_for_guest",
        "booking:cancel_own", "booking:view_own", "dashboard:view",
        "guest:invite_only", "guest:manage", "guest:view_visits",
        "seat:book_self", "teammate:view",
    ],
    "FRONT_OFFICE": ["guest:check_in", "guest:check_out", "guest:view_visits"],
    "MANAGER": [
        "booking:cancel_own", "booking:view_own", "dashboard:view",
        "seat:book_self", "team:booking_view", "teammate:view",
        "team:occupancy_view", "team:view",
    ],
    "TENANT_ADMIN": [
        "admin_dashboard:view", "amenities:manage", "audit:view",
        "booking:book_for_employee", "booking:book_for_guest",
        "booking:cancel_any", "booking:cancel_own", "booking:view_all",
        "booking:view_own", "dashboard:view", "floor:manage", "floor:view",
        "guest:check_in", "guest:check_out", "guest:invite_only",
        "guest:manage", "guest:view_visits", "layout:publish",
        "layout:upload", "occupancy:view", "seat:block", "seat:book_self",
        "seat:create", "seat:delete", "seat:update", "seat:view_all",
        "user:manage", "users:view", "user:view",
    ],
}

BUSINESS_RULE_IDS = [
    "booking_policy.employee_max_advance_days",
    "booking_policy.guest_max_advance_days",
    "layout_policy.buffer_days",
    "layout_policy.visibility_days.draft",
    "layout_policy.visibility_days.archived",
    "layout_policy.visibility_days.deleted",
    "activity_policy.record_count",
    "blocked_seat_policy.upcoming_days",
    "blocked_seat_policy.expiring_soon_days",
    "blocked_seat_policy.expired_window_days",
    "blocked_seat_policy.max_advance_days",
    "chatbot_policy.employee_access_enabled",
]


def camel_case(value: str) -> str:
    parts = re.split(r"[_\-\s]+", value)
    return parts[0] + "".join(part[:1].upper() + part[1:] for part in parts[1:])


def resolve_schema(
    schema: dict[str, Any], definitions: dict[str, Any]
) -> dict[str, Any]:
    if "$ref" in schema:
        return definitions[schema["$ref"].rsplit("/", 1)[-1]]
    return schema


def schema_label(schema: dict[str, Any] | None) -> str:
    if not schema:
        return "No response body"
    if "$ref" in schema:
        return schema["$ref"].rsplit("/", 1)[-1]
    if "anyOf" in schema:
        return " or ".join(schema_label(item) for item in schema["anyOf"])
    if schema.get("type") == "array":
        return f"array<{schema_label(schema.get('items', {}))}>"
    return str(schema.get("title") or schema.get("type") or "JSON value")


def sample_value(
    schema: dict[str, Any],
    definitions: dict[str, Any],
    *,
    field_name: str = "",
    depth: int = 0,
) -> Any:
    if depth > 15:
        return None
    if "$ref" in schema:
        return sample_value(
            resolve_schema(schema, definitions),
            definitions,
            field_name=field_name,
            depth=depth + 1,
        )
    for key in ("example", "default", "const"):
        if key in schema and schema[key] is not None:
            return schema[key]
    if schema.get("enum"):
        return schema["enum"][0]
    pattern = str(schema.get("pattern") or "")
    if "DRAFT|PUBLISHED" in pattern:
        return "DRAFT"
    for union_key in ("anyOf", "oneOf"):
        if union_key in schema:
            choices = [item for item in schema[union_key] if item.get("type") != "null"]
            return sample_value(
                choices[0] if choices else schema[union_key][0],
                definitions,
                field_name=field_name,
                depth=depth + 1,
            )
    if "allOf" in schema:
        merged: dict[str, Any] = {}
        for item in schema["allOf"]:
            value = sample_value(
                item, definitions, field_name=field_name, depth=depth + 1
            )
            if isinstance(value, dict):
                merged.update(value)
        return merged
    schema_type = schema.get("type")
    if field_name in FIELD_EXAMPLES:
        value = FIELD_EXAMPLES[field_name]
        if schema_type == "string" and not isinstance(value, str):
            return str(value)
        if schema_type == "integer" and not isinstance(value, int):
            return int(value)
        if schema_type == "object" and isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return {"value": value}
        return value
    if schema_type == "object" or "properties" in schema:
        return {
            name: sample_value(prop, definitions, field_name=name, depth=depth + 1)
            for name, prop in schema.get("properties", {}).items()
        }
    if schema_type == "array":
        return [
            sample_value(
                schema.get("items", {}),
                definitions,
                field_name=field_name,
                depth=depth + 1,
            )
        ]
    fmt = schema.get("format")
    if fmt == "date":
        return "2030-01-15"
    if fmt == "date-time":
        return "2030-01-15T09:00:00Z"
    if fmt == "time":
        return "09:00:00"
    if fmt in {"email", "idn-email"}:
        return "tester@example.com"
    if fmt == "uuid":
        return "00000000-0000-4000-8000-000000000001"
    if fmt in {"binary", "byte"} or schema.get("contentMediaType"):
        return "<select-file>"
    if schema_type == "integer":
        return max(int(schema.get("minimum", 1)), 1)
    if schema_type == "number":
        return 1.0
    if schema_type == "boolean":
        return False
    return "string"


def parameter_example(parameter: dict[str, Any], definitions: dict[str, Any]) -> str:
    name = parameter["name"]
    if name in FIELD_EXAMPLES:
        value = FIELD_EXAMPLES[name]
    elif name in PATH_VARIABLE_EXAMPLES:
        value = PATH_VARIABLE_EXAMPLES[name]
    else:
        value = sample_value(parameter.get("schema", {}), definitions, field_name=name)
    if isinstance(value, bool):
        return str(value).lower()
    if isinstance(value, (dict, list)):
        return json.dumps(value, separators=(",", ":"))
    return str(value)


def feature_tables(method: str, path: str) -> list[str]:
    write = method in {"POST", "PUT", "PATCH", "DELETE"}
    if path in {"/", "/health"}:
        return []
    if path.startswith("/auth/"):
        if path == "/auth/login":
            return []
        tables = ["user_sessions", "auth_token_events", "app_users", "tenants"]
        if "callback" in path:
            tables += [
                "auth_identities",
                "user_graph_profiles",
                "teams",
                "team_members",
                "audit_logs",
            ]
        elif path == "/auth/me":
            tables += ["roles", "role_permissions", "permissions"]
        elif path == "/auth/logout":
            tables += ["audit_logs"]
        return sorted(set(tables))
    if path.startswith("/graph/"):
        return []
    if path.startswith("/bookings"):
        tables = [
            "bookings",
            "seats",
            "sites",
            "buildings",
            "floors",
            "floor_layouts",
            "blocked_seats",
            "app_users",
        ]
        if write:
            tables.append("audit_logs")
        return tables
    if path.startswith("/business-rules"):
        return ["business_rules", "tenant_business_rules"]
    if path.startswith("/api/chat"):
        return ["chatbot_sessions", "chatbot_messages"]
    if path.startswith("/guests"):
        tables = ["guests"]
        if path.endswith("/visits"):
            tables += [
                "guest_visits",
                "bookings",
                "seats",
                "sites",
                "buildings",
                "floors",
                "app_users",
            ]
        if write:
            tables.append("audit_logs")
        return tables
    if path.startswith(("/guest-visits", "/guest-bookings")):
        tables = [
            "guest_visits",
            "guests",
            "bookings",
            "seats",
            "sites",
            "buildings",
            "floors",
            "app_users",
        ]
        if write:
            tables.append("audit_logs")
        return tables
    if path.startswith("/sites"):
        tables = ["sites", "buildings", "floors", "seats", "floor_layouts"]
        if write:
            tables.append("audit_logs")
        return tables
    if path.startswith(("/buildings", "/offices")):
        tables = ["buildings", "sites", "floors", "seats", "floor_layouts"]
        if write:
            tables.append("audit_logs")
        return tables
    if path.startswith("/floors"):
        if path.endswith("/seats"):
            return [
                "floors",
                "buildings",
                "sites",
                "seats",
                "floor_layouts",
                "bookings",
                "blocked_seats",
                "seat_amenities",
                "amenities",
            ]
        tables = ["floors", "buildings", "sites", "seats", "floor_layouts"]
        if write:
            tables.append("audit_logs")
        return tables
    if path.startswith("/seats"):
        return ["seats", "seat_amenities", "amenities", "floor_layouts", "audit_logs"]
    if path.startswith("/layout-seats"):
        return [
            "layout_seat_mappings",
            "seats",
            "seat_amenities",
            "amenities",
            "floor_layouts",
            "audit_logs",
        ]
    if path.startswith("/teams"):
        return [
            "teams",
            "team_members",
            "app_users",
            "bookings",
            "seats",
            "floors",
            "buildings",
            "seat_amenities",
            "amenities",
        ]
    if path.startswith("/dashboard"):
        return [
            "app_users",
            "tenants",
            "user_work_preferences",
            "user_preferred_amenities",
            "amenities",
            "bookings",
            "seats",
            "sites",
            "buildings",
            "floors",
            "floor_layouts",
        ]
    if path.startswith(("/admin/dashboard", "/admin/activities", "/admin/occupancy")):
        return [
            "bookings",
            "guest_visits",
            "guests",
            "blocked_seats",
            "seats",
            "floor_layouts",
            "sites",
            "buildings",
            "floors",
            "app_users",
            "business_rules",
            "tenant_business_rules",
        ]
    if path.startswith("/admin/bookings"):
        return [
            "bookings",
            "guest_visits",
            "guests",
            "seats",
            "sites",
            "buildings",
            "floors",
            "app_users",
        ]
    if path.startswith("/admin/blocked-seats"):
        return [
            "blocked_seats",
            "bookings",
            "seats",
            "floor_layouts",
            "sites",
            "buildings",
            "floors",
            "app_users",
            "guests",
            "audit_logs",
        ]
    if path.startswith("/admin/audit"):
        return ["audit_logs", "app_users"]
    if path.startswith("/preferences"):
        return [
            "user_work_preferences",
            "user_preferred_amenities",
            "amenities",
            "amenity_categories",
            "sites",
            "buildings",
            "floors",
        ]
    if path.startswith(("/amenities", "/amenity-categories")):
        return [
            "amenities",
            "amenity_categories",
            "seat_amenities",
            "seats",
            "floor_layouts",
        ] + (["audit_logs"] if write else [])
    if path.startswith("/admin/floor-layouts"):
        return [
            "floor_layouts",
            "layout_seat_mappings",
            "seats",
            "sites",
            "buildings",
            "floors",
            "app_users",
            "audit_logs",
        ]
    if path.startswith("/admin/users"):
        return [
            "app_users",
            "roles",
            "role_permissions",
            "permissions",
            "teams",
            "team_members",
            "audit_logs",
        ]
    if path.startswith("/users"):
        tables = ["app_users", "roles", "teams", "team_members"]
        if path.endswith("/bookings"):
            tables += [
                "bookings",
                "seats",
                "sites",
                "buildings",
                "floors",
                "floor_layouts",
                "layout_seat_mappings",
            ]
        if write:
            tables.append("audit_logs")
        return tables
    return []


def auth_requirement(method: str, path: str) -> str:
    if path in PUBLIC_PATHS:
        return "Public (SSO callbacks still validate OAuth state/tokens)"
    if path == "/auth/refresh":
        return "Refresh-token cookie"
    if path == "/auth/logout":
        return "Refresh-token cookie is optional; cookies are always cleared"
    if path.startswith("/admin/audit"):
        return "Bearer/access cookie + admin_dashboard:view (admin roles bypass)"
    if path.startswith("/admin/bookings"):
        return "Bearer/access cookie + booking:view_all or admin_dashboard:view"
    if path.startswith(("/admin/dashboard", "/admin/activities")):
        return "Bearer/access cookie + admin_dashboard:view"
    if path.startswith("/admin/occupancy"):
        return "Bearer/access cookie + admin_dashboard:view or occupancy:view"
    if path.startswith("/admin/blocked-seats"):
        if method == "GET":
            return "Bearer/access cookie + seat:block or seat:view_all"
        return "Bearer/access cookie + seat:block"
    if path.startswith("/admin/floor-layouts"):
        permission = (
            "layout:publish"
            if method in {"PATCH", "DELETE"} or path.endswith("/activate")
            else "layout:upload"
        )
        return f"Bearer/access cookie + {permission}"
    if path == "/admin/users":
        return "Bearer/access cookie + admin_dashboard:view, users:view, or user:view"
    if path.startswith("/admin/users/"):
        return "Bearer/access cookie + user:manage"
    if path == "/business-rules" and method == "POST":
        return "Bearer/access cookie + admin_dashboard:view"
    if path.startswith(("/sites", "/buildings", "/floors")) and method in {
        "POST",
        "PATCH",
        "DELETE",
    }:
        return "Bearer/access cookie + location:manage"
    if path.startswith(("/seats", "/layout-seats")) and method != "GET":
        return "Bearer/access cookie + location:manage or layout:upload"
    if path.startswith(("/amenities", "/amenity-categories")) and method in {
        "POST",
        "PATCH",
        "DELETE",
    }:
        return "Bearer/access cookie + amenities:manage or location:manage"
    if path.startswith("/guest-visits"):
        if path.endswith("/check-in"):
            return "Bearer/access cookie + guest:check_in"
        if path.endswith("/check-out"):
            return "Bearer/access cookie + guest:check_out"
        if path.endswith("/book-seat"):
            return "Bearer/access cookie + booking:book_for_guest"
        if method == "GET":
            return "Bearer/access cookie + guest:view_visits"
        if path != "/guest-visits":
            return "Bearer/access cookie + guest:manage"
    if path.endswith("/bookings") and path.startswith("/users/"):
        return "Bearer/access cookie + admin_dashboard:view, users:view, user:view, or teammate:view; service then limits cross-user access to TENANT_ADMIN"
    return "Bearer token or access-token cookie"


def role_access(method: str, path: str) -> str:
    """Human-readable effective access after route and service checks."""
    if path in PUBLIC_PATHS:
        return "Public; no application role is required."
    if path == "/auth/refresh":
        return "Any user with a valid, active refresh-token session."
    if path == "/auth/logout":
        return "Any caller; an existing refresh session is revoked when present."
    if path.startswith("/bookings/delegated/"):
        return "TENANT_ADMIN and FACILITATOR only."
    if path.startswith("/bookings"):
        if path.endswith(("/cancel", "/modify")):
            return (
                "TENANT_ADMIN, or the booking creator/subject regardless of role. "
                "FACILITATOR has no blanket edit bypass."
            )
        if method == "POST" and path in {"/bookings", "/bookings/eligibility"}:
            return (
                "Any authenticated role for a self-booking; TENANT_ADMIN and "
                "FACILITATOR may also originate a booking for another employee."
            )
        return f"{ALL_AUTHENTICATED_ROLES}. Results are restricted to the caller."
    if path.startswith(("/guests", "/guest-bookings")):
        return "TENANT_ADMIN and FACILITATOR only (service-enforced guest-operator rule)."
    if path == "/guest-visits" and method == "POST":
        return "TENANT_ADMIN and FACILITATOR only."
    if path.startswith("/guest-visits"):
        if path.endswith(("/check-in", "/check-out")):
            return (
                "FRONT_OFFICE only. This service-level rule overrides the broader "
                "permission data; TENANT_ADMIN and FACILITATOR are deliberately rejected."
            )
        if path.endswith("/workflow"):
            return (
                "TENANT_ADMIN or FACILITATOR with guest:manage; FACILITATOR must also "
                "be the visit creator or host for existing-resource actions."
            )
        return (
            "Roles currently granted guest:view_visits: TENANT_ADMIN, FACILITATOR, "
            "and FRONT_OFFICE. FRONT_OFFICE is clamped to today's visits."
        )
    if path == "/preferences/{user_id}":
        return (
            "The same user, TENANT_ADMIN, or FACILITATOR; cross-user reads exist only "
            "to prefill delegated bookings."
        )
    if path.startswith("/business-rules"):
        if method == "GET":
            return f"{ALL_AUTHENTICATED_ROLES}."
        return "TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view (currently TENANT_ADMIN)."
    if path.startswith("/api/chat"):
        return f"{ALL_AUTHENTICATED_ROLES}; sessions remain user- and tenant-owned."
    if path.startswith(("/sites", "/buildings", "/floors")):
        if method == "GET":
            return f"{ALL_AUTHENTICATED_ROLES}."
        return "TENANT_ADMIN and PRODUCT_ADMIN bypass, or a role granted location:manage; current tenant seed grants no non-admin role."
    if path.startswith("/layout-seats"):
        return "TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted location:manage or layout:upload (currently TENANT_ADMIN)."
    if path.startswith("/teams") or path == "/dashboard/me":
        return f"{ALL_AUTHENTICATED_ROLES}; returned data is caller/tenant scoped."
    if path.startswith(("/admin/dashboard", "/admin/activities")):
        return "TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view (currently TENANT_ADMIN)."
    if path.startswith("/admin/occupancy"):
        return "TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view or occupancy:view (currently TENANT_ADMIN)."
    if path.startswith("/admin/bookings"):
        return "TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted booking:view_all or admin_dashboard:view (currently TENANT_ADMIN)."
    if path.startswith("/admin/blocked-seats"):
        gate = "seat:block or seat:view_all" if method == "GET" else "seat:block"
        extra = (
            " The list's view=conflicts mode additionally requires booking:view_all "
            "or admin_dashboard:view."
            if method == "GET" and path == "/admin/blocked-seats"
            else ""
        )
        return f"TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted {gate} (currently TENANT_ADMIN).{extra}"
    if path.startswith("/admin/audit"):
        return "TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view (currently TENANT_ADMIN)."
    if path.startswith("/admin/floor-layouts"):
        permission = "layout:publish" if method in {"PATCH", "DELETE"} or path.endswith("/activate") else "layout:upload"
        return f"A role granted {permission}; require_permission has no automatic admin bypass (currently TENANT_ADMIN)."
    if path == "/admin/users":
        return "TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted admin_dashboard:view, users:view, or user:view (currently TENANT_ADMIN)."
    if path == "/admin/users/{user_id}/access":
        return "A role granted user:manage (currently TENANT_ADMIN); self-change and PRODUCT_ADMIN targets are blocked."
    if path == "/users/{user_id}/bookings":
        return "Route permission plus service ownership: self or TENANT_ADMIN only."
    if path == "/users/{user_id}":
        return "Self or TENANT_ADMIN only."
    if path.startswith("/users"):
        return f"{ALL_AUTHENTICATED_ROLES}; profile mutation is self-only."
    if path.startswith(("/amenities", "/amenity-categories")):
        if method == "GET":
            return f"{ALL_AUTHENTICATED_ROLES}."
        return "TENANT_ADMIN/PRODUCT_ADMIN bypass, or a role granted amenities:manage or location:manage (currently TENANT_ADMIN)."
    return f"{ALL_AUTHENTICATED_ROLES}."


def lifecycle(method: str, path: str) -> str:
    note = FUTURE_SCOPE.get((method, path))
    return f"FUTURE SCOPE — {note}" if note else "ACTIVE — used by the current application or operational tooling."


def ui_usage(method: str, path: str, tag: str) -> str:
    future = FUTURE_SCOPE.get((method, path))
    if future:
        return f"No current frontend caller. {future}"
    if path == "/":
        return "Service discovery/manual verification; not a product-screen call."
    if path == "/health":
        return "Deployment probes, load balancers, smoke tests, and tester setup checks."
    area = UI_AREAS.get(tag, UI_AREAS["service"])
    return f"Current application area: {area}."


def positive_scenarios(method: str, path: str) -> list[str]:
    scenarios = ["Send a valid request as an allowed user in the same tenant and verify the declared 2xx response shape."]
    if method == "GET":
        scenarios.append("Exercise supported filters/pagination and verify tenant-scoped, stable results.")
    else:
        scenarios.append("Submit boundary-valid values and verify the persisted change is visible through the corresponding read API.")
    if path.startswith(("/bookings", "/guest-bookings")):
        scenarios.append("Use an available seat/date and confirm booking status, ownership, and audit/notification side effects.")
    if path == "/guest-visits" and method == "POST":
        scenarios.append("Omit seat_id for visit-only creation, then include seat_id to verify atomic visit-plus-booking creation.")
    if path.endswith("/check-in"):
        scenarios.append("As FRONT_OFFICE, check in today's SCHEDULED visit and verify CHECKED_IN state.")
    if path.endswith("/check-out"):
        scenarios.append("As FRONT_OFFICE, check out a CHECKED_IN visit and verify CHECKED_OUT state.")
    if path == "/business-rules" and method == "POST":
        scenarios.append("Send one or several supported dotted setting IDs and verify the full resolved policy document is returned.")
    if path.startswith("/api/chat"):
        scenarios.append("Verify the session is usable only by its creating user and tenant and that messages persist in order.")
    return scenarios


def negative_scenarios(method: str, path: str) -> list[str]:
    scenarios: list[str] = []
    if path not in PUBLIC_PATHS:
        scenarios.append("Missing, expired, Microsoft-issued, or revoked backend access token returns 401.")
    if needs_forbidden_example(method, path):
        scenarios.append("Authenticated user without the required permission/role/ownership is rejected with 403.")
    scenarios.append("Invalid path, query, or body values are rejected (normally 422; business-rule validation may return 400).")
    if "{" in path:
        scenarios.append("Unknown or cross-tenant resource identifier returns 404 without exposing another tenant's data.")
    if method in {"POST", "PATCH", "DELETE"} and not (
        path == "/business-rules" and method == "POST"
    ):
        scenarios.append("Duplicate, conflicting, stale, or invalid-state mutation is rejected while preserving primary-resource consistency.")
    if path.startswith(("/bookings", "/guest-bookings")):
        scenarios.append("Unavailable/blocked seat, overlapping booking, or policy-window violation returns a deterministic 4xx conflict.")
    if path.endswith(("/check-in", "/check-out")):
        scenarios.append("Wrong visit date or invalid status transition is rejected; non-FRONT_OFFICE callers remain forbidden.")
    if path == "/business-rules" and method == "POST":
        scenarios.append("Unknown dotted setting ID or wrong value type returns 400; an empty updates list returns 422.")
        scenarios.append("A multi-item update is not atomic: if a later item fails, verify any earlier committed item remains applied and report that result clearly.")
    if path.startswith("/api/chat/session/{session_id}"):
        scenarios.append("Missing, expired, or another user's session returns 404.")
    return scenarios


def needs_forbidden_example(method: str, path: str) -> bool:
    auth = auth_requirement(method, path)
    roles = role_access(method, path).lower()
    restricted_markers = (
        "only", "granted", "creator", "subject", "same user", "self or",
        "may also", "service-enforced", "cross-user",
    )
    return "+" in auth or any(marker in roles for marker in restricted_markers)


# Re-declared to replace an older generated separator that was damaged by a
# Windows encoding conversion. Keep generated tester assets ASCII-safe.
def lifecycle(method: str, path: str) -> str:
    note = FUTURE_SCOPE.get((method, path))
    return (
        f"FUTURE SCOPE - {note}"
        if note
        else "ACTIVE - used by the current application or operational tooling."
    )


def normal_use_case(method: str, path: str, summary: str) -> str:
    if (method, path) in USE_CASES:
        return USE_CASES[(method, path)]
    clean = summary.rstrip(".")
    return f"The web/mobile client or a tester uses this operation to {clean[:1].lower() + clean[1:]}."


def operation_success(operation: dict[str, Any]) -> tuple[str, dict[str, Any] | None]:
    responses = operation.get("responses", {})
    codes = [code for code in responses if code.startswith("2")]
    code = min(codes) if codes else "200"
    response = responses.get(code, {})
    content = response.get("content", {})
    json_content = content.get("application/json") or next(iter(content.values()), {})
    return code, json_content.get("schema")


def body_info(operation: dict[str, Any]) -> tuple[str | None, dict[str, Any] | None]:
    content = operation.get("requestBody", {}).get("content", {})
    if not content:
        return None, None
    media_type = (
        "application/json" if "application/json" in content else next(iter(content))
    )
    return media_type, content[media_type].get("schema", {})


def clean_summary(operation: dict[str, Any]) -> str:
    summary = (
        operation.get("summary") or operation.get("operationId") or "API operation"
    )
    return re.sub(r"\s+Route$", "", summary).strip()


def build_enriched_openapi(source: dict[str, Any]) -> dict[str, Any]:
    schema = copy.deepcopy(source)
    schema["info"].update(
        {
            "title": "Seat Management API",
            "version": "1.0.0",
            "description": "Tester-facing API contract generated from the FastAPI routes. Import this file directly into Postman if preferred.",
        }
    )
    schema["servers"] = [
        {"url": "http://localhost:8000", "description": "Local development"}
    ]
    security_schemes = schema.setdefault("components", {}).setdefault(
        "securitySchemes", {}
    )
    security_schemes.update(
        {
            "bearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"},
            "accessCookie": {"type": "apiKey", "in": "cookie", "name": "access_token"},
            "refreshCookie": {
                "type": "apiKey",
                "in": "cookie",
                "name": "refresh_token",
            },
        }
    )
    for path, methods in schema["paths"].items():
        for method, operation in methods.items():
            if method not in HTTP_METHODS:
                continue
            upper = method.upper()
            operation["x-database-tables"] = feature_tables(upper, path)
            operation["x-auth-requirement"] = auth_requirement(upper, path)
            operation["x-effective-role-access"] = role_access(upper, path)
            operation["x-lifecycle"] = lifecycle(upper, path)
            operation["x-positive-scenarios"] = positive_scenarios(upper, path)
            operation["x-negative-scenarios"] = negative_scenarios(upper, path)
            if path in PUBLIC_PATHS:
                operation["security"] = []
            elif path in COOKIE_ONLY_PATHS:
                operation["security"] = [{"refreshCookie": []}]
            else:
                operation["security"] = [{"bearerAuth": []}, {"accessCookie": []}]
    return schema


def postman_url(
    path: str, parameters: list[dict[str, Any]], definitions: dict[str, Any]
) -> tuple[dict[str, Any], set[str]]:
    path_variables: set[str] = set()
    rendered_path = path
    url_variables: list[dict[str, str]] = []
    query: list[dict[str, Any]] = []
    for parameter in parameters:
        where = parameter.get("in")
        name = parameter["name"]
        if where == "path":
            variable = camel_case(name)
            path_variables.add(name)
            rendered_path = rendered_path.replace(
                "{" + name + "}", "{{" + variable + "}}"
            )
            url_variables.append(
                {"key": variable, "value": PATH_VARIABLE_EXAMPLES.get(name, "1")}
            )
        elif where == "query":
            query.append(
                {
                    "key": name,
                    "value": parameter_example(parameter, definitions),
                    "description": parameter.get("description", ""),
                    "disabled": not parameter.get("required", False),
                }
            )
    raw = "{{baseUrl}}" + rendered_path
    enabled_query = [item for item in query if not item.get("disabled")]
    if enabled_query:
        raw += "?" + "&".join(
            f"{item['key']}={item['value']}" for item in enabled_query
        )
    url: dict[str, Any] = {
        "raw": raw,
        "host": ["{{baseUrl}}"],
        "path": [part for part in rendered_path.split("/") if part],
    }
    if query:
        url["query"] = query
    if url_variables:
        url["variable"] = url_variables
    return url, path_variables


def postman_body(
    operation: dict[str, Any], definitions: dict[str, Any]
) -> dict[str, Any] | None:
    media_type, schema = body_info(operation)
    if not media_type or schema is None:
        return None
    resolved = resolve_schema(schema, definitions)
    if media_type == "application/json":
        return {
            "mode": "raw",
            "raw": json.dumps(sample_value(schema, definitions), indent=2),
            "options": {"raw": {"language": "json"}},
        }
    if media_type == "multipart/form-data":
        formdata = []
        required = set(resolved.get("required", []))
        for name, prop in resolved.get("properties", {}).items():
            is_file = bool(
                prop.get("contentMediaType") or prop.get("format") == "binary"
            )
            value = sample_value(prop, definitions, field_name=name)
            item: dict[str, Any] = {
                "key": name,
                "type": "file" if is_file else "text",
                "description": "Required" if name in required else "Optional",
            }
            if is_file:
                item["src"] = []
            elif isinstance(value, list):
                item["value"] = str(value[0]) if value else ""
            else:
                item["value"] = str(value)
            if name not in required:
                item["disabled"] = True
            formdata.append(item)
        return {"mode": "formdata", "formdata": formdata}
    return None


def postman_example_response(
    *,
    name: str,
    request: dict[str, Any],
    code: int,
    status_text: str,
    body: Any,
) -> dict[str, Any]:
    """Build one saved Postman response example without live credentials."""
    return {
        "name": name,
        "originalRequest": copy.deepcopy(request),
        "status": status_text,
        "code": code,
        "_postman_previewlanguage": "json",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "cookie": [],
        "body": (
            json.dumps(body, indent=2, ensure_ascii=False)
            if body is not None
            else ""
        ),
    }


def build_postman_collection(schema: dict[str, Any]) -> dict[str, Any]:
    definitions = schema.get("components", {}).get("schemas", {})
    folders: OrderedDict[str, list[dict[str, Any]]] = OrderedDict()
    path_vars: set[str] = set()
    for path, methods in schema["paths"].items():
        for method in HTTP_METHODS:
            if method not in methods:
                continue
            operation = methods[method]
            upper = method.upper()
            tag = (operation.get("tags") or ["service"])[0]
            summary = clean_summary(operation)
            params = operation.get("parameters", [])
            url, vars_for_request = postman_url(path, params, definitions)
            path_vars.update(vars_for_request)
            tables = feature_tables(upper, path)
            description = "\n\n".join(
                [
                    operation.get("description", "").strip() or summary,
                    f"Normal use case: {normal_use_case(upper, path, summary)}",
                    f"Authorization: {auth_requirement(upper, path)}",
                    "Feature tables: " + (", ".join(tables) if tables else "None"),
                    "See API_REFERENCE.md for the full contract and auth-baseline table note.",
                ]
            )
            request: dict[str, Any] = {
                "method": upper,
                "header": [
                    {"key": "Accept", "value": "application/json", "type": "text"},
                    {"key": "X-Source-Channel", "value": "API", "type": "text"},
                ],
                "description": description,
                "url": url,
            }
            if path in PUBLIC_PATHS or path in COOKIE_ONLY_PATHS:
                request["auth"] = {"type": "noauth"}
            body = postman_body(operation, definitions)
            if body:
                request["body"] = body
                if body["mode"] == "raw":
                    request["header"].append(
                        {
                            "key": "Content-Type",
                            "value": "application/json",
                            "type": "text",
                        }
                    )
            code, response_schema = operation_success(operation)
            response_body = (
                sample_value(response_schema, definitions) if response_schema else None
            )
            response = {
                "name": f"Expected {code}",
                "originalRequest": copy.deepcopy(request),
                "status": operation.get("responses", {})
                .get(code, {})
                .get("description", "Success"),
                "code": int(code) if code.isdigit() else 200,
                "_postman_previewlanguage": "json",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "cookie": [],
                "body": json.dumps(response_body, indent=2)
                if response_body is not None
                else "",
            }
            item = {
                "name": f"{upper} {path} — {summary}",
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "pm.test('Status is not a server error', function () {",
                                "    pm.expect(pm.response.code).to.be.below(500);",
                                "});",
                                "pm.test('Response time is under 5 seconds', function () {",
                                "    pm.expect(pm.response.responseTime).to.be.below(5000);",
                                "});",
                            ],
                        },
                    }
                ],
                "request": request,
                "response": [response],
            }
            folders.setdefault(tag, []).append(item)
    variables = [
        {"key": "baseUrl", "value": "http://localhost:8000", "type": "string"},
        {"key": "accessToken", "value": "", "type": "string"},
    ]
    for name in sorted(path_vars):
        variables.append(
            {
                "key": camel_case(name),
                "value": PATH_VARIABLE_EXAMPLES.get(name, "1"),
                "type": "string",
            }
        )
    return {
        "info": {
            "_postman_id": "8d8dc080-54f7-4ef4-b3ae-5ea7a9e00001",
            "name": "Seat Management API — Complete QA Collection",
            "description": (
                "Generated from backend.main:app. Import the companion environment, set baseUrl, "
                "then authenticate through SSO or paste a backend-issued JWT into accessToken. "
                "Cookies obtained by the SSO flow can also be used by Postman's cookie jar."
            ),
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "auth": {
            "type": "bearer",
            "bearer": [{"key": "token", "value": "{{accessToken}}", "type": "string"}],
        },
        "event": [],
        "variable": variables,
        "item": [{"name": tag, "item": items} for tag, items in folders.items()],
    }


def build_enhanced_postman_collection(schema: dict[str, Any]) -> dict[str, Any]:
    """Build the tester collection with runnable inputs and saved examples."""
    definitions = schema.get("components", {}).get("schemas", {})
    folders: OrderedDict[str, list[dict[str, Any]]] = OrderedDict()
    path_vars: set[str] = set()
    for path, methods in schema["paths"].items():
        for method in HTTP_METHODS:
            if method not in methods:
                continue
            operation = methods[method]
            upper = method.upper()
            tag = (operation.get("tags") or ["service"])[0]
            summary = clean_summary(operation)
            params = operation.get("parameters", [])
            url, vars_for_request = postman_url(path, params, definitions)
            path_vars.update(vars_for_request)
            tables = feature_tables(upper, path)
            positives = "\n".join(
                f"- {scenario}" for scenario in positive_scenarios(upper, path)
            )
            negatives = "\n".join(
                f"- {scenario}" for scenario in negative_scenarios(upper, path)
            )
            description = "\n\n".join([
                operation.get("description", "").strip()
                or normal_use_case(upper, path, summary),
                f"Lifecycle: {lifecycle(upper, path)}",
                f"Where used: {ui_usage(upper, path, tag)}",
                f"Effective role access: {role_access(upper, path)}",
                f"Route authentication/permission gate: {auth_requirement(upper, path)}",
                "Feature tables: " + (", ".join(tables) if tables else "None"),
                "Positive scenarios:\n" + positives,
                "Negative scenarios:\n" + negatives,
                "See API_REFERENCE.md for field-level schemas and business rules.",
            ])
            request: dict[str, Any] = {
                "method": upper,
                "header": [
                    {"key": "Accept", "value": "application/json", "type": "text"},
                    {"key": "X-Source-Channel", "value": "API", "type": "text"},
                ],
                "description": description,
                "url": url,
            }
            if path in PUBLIC_PATHS or path in COOKIE_ONLY_PATHS:
                request["auth"] = {"type": "noauth"}
            body = postman_body(operation, definitions)
            if body:
                request["body"] = body
                if body["mode"] == "raw":
                    request["header"].append({
                        "key": "Content-Type",
                        "value": "application/json",
                        "type": "text",
                    })

            code, response_schema = operation_success(operation)
            response_body = (
                sample_value(response_schema, definitions) if response_schema else None
            )
            responses = [postman_example_response(
                name=f"Positive - expected {code}",
                request=request,
                code=int(code) if code.isdigit() else 200,
                status_text=operation.get("responses", {}).get(code, {}).get(
                    "description", "Success"
                ),
                body=response_body,
            )]
            if path not in PUBLIC_PATHS:
                responses.append(postman_example_response(
                    name="Negative - 401 missing access token",
                    request=request,
                    code=401,
                    status_text="Unauthorized",
                    body={"error": {"code": "missing_access_token", "message": "Access token is missing.", "details": {}}},
                ))
            if needs_forbidden_example(upper, path):
                responses.append(postman_example_response(
                    name="Negative - 403 insufficient access",
                    request=request,
                    code=403,
                    status_text="Forbidden",
                    body={"error": {"code": "insufficient_permissions", "message": "The caller is not allowed to perform this operation.", "details": {}}},
                ))
            if "{" in path:
                responses.append(postman_example_response(
                    name="Negative - 404 resource not found",
                    request=request,
                    code=404,
                    status_text="Not Found",
                    body={"error": {"code": "resource_not_found", "message": "The tenant-scoped resource was not found.", "details": {}}},
                ))
            if params or body:
                responses.append(postman_example_response(
                    name="Negative - 422 validation failure",
                    request=request,
                    code=422,
                    status_text="Unprocessable Entity",
                    body={"detail": [{"type": "value_error", "loc": ["body", "field"], "msg": "Invalid value", "input": None}]},
                ))
            folders.setdefault(tag, []).append({
                "name": f"{upper} {path} - {summary}",
                "event": [{
                    "listen": "test",
                    "script": {
                        "type": "text/javascript",
                        "exec": [
                            "pm.test('Status is not a server error', function () {",
                            "    pm.expect(pm.response.code).to.be.below(500);",
                            "});",
                            "pm.test('Response time is under 5 seconds', function () {",
                            "    pm.expect(pm.response.responseTime).to.be.below(5000);",
                            "});",
                        ],
                    },
                }],
                "request": request,
                "response": responses,
            })

    variables = [
        {"key": "baseUrl", "value": "http://localhost:8000", "type": "string"},
        {"key": "accessToken", "value": "", "type": "string"},
        {"key": "qaDate", "value": "", "type": "string"},
        {"key": "qaEndDate", "value": "", "type": "string"},
        {"key": "qaLayoutDate", "value": "", "type": "string"},
    ]
    variables.extend({
        "key": camel_case(name),
        "value": PATH_VARIABLE_EXAMPLES.get(name, "1"),
        "type": "string",
    } for name in sorted(path_vars))
    return {
        "info": {
            "_postman_id": "8d8dc080-54f7-4ef4-b3ae-5ea7a9e00001",
            "name": "Seat Management API - Updated Complete QA Collection",
            "description": (
                "Generated from backend.main:app. Contains every active route, populated "
                "inputs, saved positive/negative response examples, effective role rules, "
                "database-table notes, lifecycle labels, and smoke tests. Import the companion "
                "environment, set baseUrl, then authenticate through SSO or paste a backend-issued "
                "JWT into accessToken. Microsoft Graph access tokens are not accepted."
            ),
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "auth": {
            "type": "bearer",
            "bearer": [{"key": "token", "value": "{{accessToken}}", "type": "string"}],
        },
        "event": [{
            "listen": "prerequest",
            "script": {
                "type": "text/javascript",
                "exec": [
                    "function isoDateAfter(days) {",
                    "    const value = new Date();",
                    "    value.setUTCDate(value.getUTCDate() + days);",
                    "    return value.toISOString().slice(0, 10);",
                    "}",
                    "pm.collectionVariables.set('qaDate', isoDateAfter(1));",
                    "pm.collectionVariables.set('qaEndDate', isoDateAfter(2));",
                    "pm.collectionVariables.set('qaLayoutDate', isoDateAfter(60));",
                ],
            },
        }],
        "variable": variables,
        "item": [{"name": tag, "item": items} for tag, items in folders.items()],
    }


def build_postman_environment(schema: dict[str, Any]) -> dict[str, Any]:
    path_vars = sorted(
        {name for path in schema["paths"] for name in re.findall(r"\{([^}]+)\}", path)}
    )
    values = [
        {
            "key": "baseUrl",
            "value": "http://localhost:8000",
            "type": "default",
            "enabled": True,
        },
        {"key": "accessToken", "value": "", "type": "secret", "enabled": True},
    ]
    values += [
        {
            "key": camel_case(name),
            "value": PATH_VARIABLE_EXAMPLES.get(name, "1"),
            "type": "default",
            "enabled": True,
        }
        for name in path_vars
    ]
    return {
        "id": "1b54441f-aa27-4f0b-a25d-5ea7a9e00002",
        "name": "Seat Management — Local QA",
        "values": values,
        "_postman_variable_scope": "environment",
        "_postman_exported_using": "Seat Management API asset generator",
    }


def markdown_type(schema: dict[str, Any]) -> str:
    if "$ref" in schema:
        return schema["$ref"].rsplit("/", 1)[-1]
    if "anyOf" in schema:
        return " | ".join(markdown_type(item) for item in schema["anyOf"])
    if schema.get("type") == "array":
        return f"array<{markdown_type(schema.get('items', {}))}>"
    return str(schema.get("type") or schema.get("title") or "any")


def json_block(value: Any) -> list[str]:
    return ["```json", json.dumps(value, indent=2, ensure_ascii=False), "```"]


def build_markdown(schema: dict[str, Any]) -> str:
    definitions = schema.get("components", {}).get("schemas", {})
    operations: list[tuple[str, str, dict[str, Any]]] = []
    for path, methods in schema["paths"].items():
        for method in HTTP_METHODS:
            if method in methods:
                operations.append((method.upper(), path, methods[method]))

    lines = [
        "# Seat Management API reference for QA",
        "",
        f"This document covers all **{len(operations)} operations across {len(schema['paths'])} paths** registered by `backend.main:app`. It was generated from the FastAPI OpenAPI model and cross-checked against the route/service/repository structure.",
        "",
        "## Package contents",
        "",
        "- `seat-management.postman_collection.json` — Postman Collection v2.1 with every request, sample bodies, variables, expected-response examples, and smoke tests.",
        "- `seat-management.postman_environment.json` — local environment with `baseUrl`, secret `accessToken`, and resource-ID variables.",
        "- `seat-management.openapi.json` — OpenAPI 3.1 contract; this can also be imported directly into Postman.",
        "- `generate_api_assets.py` — regenerates all three artifacts and this reference after API changes.",
        "",
        "## Quick start in Postman",
        "",
        "1. Import both Postman JSON files and select **Seat Management — Local QA** as the active environment.",
        "2. Start the API with `uvicorn backend.main:app --reload`; the default `baseUrl` is `http://localhost:8000`.",
        "3. Authenticate through `GET /auth/login` in a browser. The backend sets HTTP-only `access_token` and `refresh_token` cookies. Postman may use those cookies if login is completed in its browser/cookie jar.",
        "4. Alternatively, place a **backend-issued** JWT in the environment's secret `accessToken`. Microsoft Graph access tokens are intentionally rejected by backend APIs.",
        "5. Replace the sample ID variables and dates with records that exist in the test tenant. Optional query parameters are present but disabled in the collection; enable the ones needed for each test.",
        "",
        "> SSO login and callback requests are redirect/browser flows. Running the callback by itself without the matching OAuth state cookie and authorization code is expected to fail.",
        "",
        "## Shared conventions",
        "",
        "- Protected endpoints accept `Authorization: Bearer <backend JWT>` or the `access_token` cookie.",
        "- Authenticated dependency checks normally read `user_sessions`, `app_users`, `roles`, `role_permissions`, and `permissions`. To keep endpoint entries readable, these **auth-baseline tables** are not repeated unless they are part of the feature result itself.",
        "- IDs and database reads are tenant-scoped. Test data from another tenant should behave as not found/unauthorized.",
        "- `X-Source-Channel` may be `WEB`, `MOBILE`, `API`, `SYSTEM`, or `IMPORT`; the collection sends `API`.",
        '- Standard application errors use `{"error": {"code": "...", "message": "...", "details": {...}}}`. FastAPI request validation failures use HTTP 422.',
        "- Some list endpoints return a plain array when pagination is omitted and an `{items, pagination}` object when `page`/`limit` is supplied; the response schema below shows the declared union.",
        "- Notification emails and Microsoft Graph calls are external side effects, not database tables. Write operations may also append `audit_logs` rows where the service implements auditing.",
        "",
        "## Endpoint index",
        "",
        "| Method | Path | Purpose | Authorization | Feature tables |",
        "|---|---|---|---|---|",
    ]
    for method, path, operation in operations:
        summary = clean_summary(operation)
        tables = ", ".join(feature_tables(method, path)) or "None"
        lines.append(
            f"| {method} | `{path}` | {summary} | {auth_requirement(method, path)} | `{tables}` |"
        )

    current_tag = None
    lines += ["", "## Detailed endpoint contracts", ""]
    for method, path, operation in operations:
        tag = (operation.get("tags") or ["service"])[0]
        if tag != current_tag:
            lines += [f"### {tag}", ""]
            current_tag = tag
        summary = clean_summary(operation)
        lines += [f"#### `{method} {path}` — {summary}", ""]
        description = operation.get("description", "").strip()
        if description:
            lines += [description.replace("\n", " "), ""]
        lines += [
            f"- **Normal use case:** {normal_use_case(method, path, summary)}",
            f"- **Authorization:** {auth_requirement(method, path)}",
            f"- **Feature tables:** {', '.join(f'`{table}`' for table in feature_tables(method, path)) or 'None (static/external operation)'}",
            "",
        ]
        parameters = operation.get("parameters", [])
        if parameters:
            lines += [
                "Parameters:",
                "",
                "| In | Name | Required | Type | Example |",
                "|---|---|---:|---|---|",
            ]
            for parameter in parameters:
                lines.append(
                    f"| {parameter.get('in')} | `{parameter['name']}` | {'yes' if parameter.get('required') else 'no'} | `{markdown_type(parameter.get('schema', {}))}` | `{parameter_example(parameter, definitions)}` |"
                )
            lines.append("")
        else:
            lines += ["Parameters: none.", ""]

        media_type, request_schema = body_info(operation)
        if request_schema is not None:
            lines += [
                f"Request body (`{media_type}`, schema `{schema_label(request_schema)}`):",
                "",
            ]
            if media_type == "multipart/form-data":
                resolved = resolve_schema(request_schema, definitions)
                required = set(resolved.get("required", []))
                lines += ["| Field | Required | Type | Example |", "|---|---:|---|---|"]
                for name, prop in resolved.get("properties", {}).items():
                    example = sample_value(prop, definitions, field_name=name)
                    lines.append(
                        f"| `{name}` | {'yes' if name in required else 'no'} | `{markdown_type(prop)}` | `{example}` |"
                    )
                lines.append("")
            else:
                lines += json_block(sample_value(request_schema, definitions)) + [""]
        else:
            lines += ["Request body: none.", ""]

        code, response_schema = operation_success(operation)
        if path == "/auth/login":
            lines += [
                "Expected success: **302 redirect** to Microsoft or the configured SSO gateway, plus an OAuth state cookie for the direct Microsoft flow.",
                "",
            ]
        elif path in {"/auth/callback", "/auth/sso-gateway-callback"}:
            lines += [
                "Expected success: **302 redirect** to the frontend with backend authentication cookies set.",
                "",
            ]
        else:
            lines += [
                f"Expected success: **HTTP {code}**, response schema `{schema_label(response_schema)}`.",
                "",
            ]
            if response_schema:
                lines += (
                    ["Example response shape:", ""]
                    + json_block(sample_value(response_schema, definitions))
                    + [""]
                )
        failures = ["422 invalid path/query/body values"]
        if path not in PUBLIC_PATHS:
            failures.insert(0, "401 missing, expired, or revoked authentication")
        if "+" in auth_requirement(method, path) or "permission" in auth_requirement(
            method, path
        ):
            failures.append("403 insufficient permission")
        if any(
            token in path
            for token in (
                "{",
                "/me",
                "/sites",
                "/buildings",
                "/floors",
                "/users",
                "/guests",
            )
        ):
            failures.append("404 tenant-scoped resource not found (where applicable)")
        lines += ["Common checks: " + "; ".join(failures) + ".", ""]

    lines += [
        "## Regeneration and drift check",
        "",
        "From the repository root run:",
        "",
        "```powershell",
        ".\\.venv\\Scripts\\python.exe backend\\docs\\api\\generate_api_assets.py",
        "```",
        "",
        "The generator validates that the number of requests in the Postman collection matches the number of HTTP operations in FastAPI. Review table mappings when a route starts using a new repository/table because OpenAPI cannot infer SQL access automatically.",
        "",
    ]
    return "\n".join(lines)


def count_collection_requests(items: list[dict[str, Any]]) -> int:
    count = 0
    for item in items:
        if "request" in item:
            count += 1
        count += count_collection_requests(item.get("item", []))
    return count


def build_enhanced_markdown(schema: dict[str, Any]) -> str:
    """Create the long-form QA contract from the live OpenAPI document."""
    definitions = schema.get("components", {}).get("schemas", {})
    operations = [
        (method.upper(), path, methods[method])
        for path, methods in schema["paths"].items()
        for method in HTTP_METHODS
        if method in methods
    ]
    lines = [
        "# Seat Management API reference for QA",
        "",
        f"This reference covers all **{len(operations)} HTTP operations across {len(schema['paths'])} paths** currently registered by `backend.main:app`. The contract was generated from FastAPI and enriched by reviewing route dependencies, service authorization, repository SQL, current frontend callers, and explicit future-scope comments in the code.",
        "",
        "## What is in the package",
        "",
        "- `seat-management.postman_collection.json`: importable Postman Collection v2.1 with every request, populated inputs, descriptions, role rules, positive and negative saved examples, and smoke tests.",
        "- `seat-management.postman_environment.json`: local environment containing `baseUrl`, a secret `accessToken`, and variables for every path ID.",
        "- `seat-management.openapi.json`: enriched OpenAPI 3.1 source, also directly importable into Postman.",
        "- `POSTMAN_GUIDE.md`: tester setup, authentication, execution, and troubleshooting instructions.",
        "- `ROLE_ACCESS_MATRIX.md`: effective endpoint access matrix and the current seeded role-permission snapshot.",
        "- `generate_api_assets.py`: repeatable generator and operation-count drift check.",
        "",
        "## Authorization model testers must understand",
        "",
        "Authentication, route permissions, and service business rules are separate layers. Passing a permission dependency does not guarantee that the service will allow the action. Every endpoint below therefore shows both the literal route gate and the effective role/ownership rule.",
        "",
        "`require_any_permission(...)` automatically allows `TENANT_ADMIN` and `PRODUCT_ADMIN`. In contrast, `require_permission(...)` has no role bypass: the named permission must exist in the caller's tenant-scoped permission list. Hard-coded service rules apply after either dependency.",
        "",
        "The most important ownership rule is: an existing booking or guest resource can be managed by its creator, its subject/host, or `TENANT_ADMIN`. `FACILITATOR` may create for other people but receives no blanket edit access to resources created by somebody else. Guest check-in/check-out is an intentional exception: only `FRONT_OFFICE` may do it, even when another role has the database permission.",
        "",
        "## Shared request and response conventions",
        "",
        "- Protected APIs accept a backend-issued JWT as `Authorization: Bearer <token>` or an HTTP-only `access_token` cookie. Microsoft Graph tokens are rejected.",
        "- Authenticated calls normally also read `user_sessions`, `app_users`, `roles`, `role_permissions`, and `permissions`. These authentication-baseline tables are not repeated in every endpoint's feature-table list.",
        "- IDs and data access are tenant-scoped. A cross-tenant ID should not reveal the foreign record and normally behaves as not found or forbidden.",
        "- The collection sends `X-Source-Channel: API`; supported channels include `WEB`, `MOBILE`, `API`, `SYSTEM`, and `IMPORT`.",
        "- Application failures normally use an error code/message envelope. FastAPI input validation failures use HTTP 422 with a `detail` array.",
        "- Email notifications and Microsoft Graph calls are external side effects. Write routes may also append `audit_logs` rows even though the feature's primary tables are listed separately.",
        "- Optional query parameters are imported into Postman in a disabled state. Enable only the filters needed for a scenario.",
        "",
        "## Writable business-rule IDs",
        "",
        "`POST /business-rules` accepts an `updates` array. Each item contains a dotted `id` and a `value`; supported IDs are:",
        "",
    ]
    lines.extend(f"- `{setting_id}`" for setting_id in BUSINESS_RULE_IDS)
    lines += [
        "",
        "The chatbot setting requires a boolean value. The remaining settings require numeric values and are also checked against service-specific ranges and relationships.",
        "",
        "## Endpoint index",
        "",
        "| Method | Path | Lifecycle | Effective access | Feature tables |",
        "|---|---|---|---|---|",
    ]
    for method, path, operation in operations:
        tables = ", ".join(feature_tables(method, path)) or "None"
        short_lifecycle = "Future scope" if (method, path) in FUTURE_SCOPE else "Active"
        lines.append(
            f"| {method} | `{path}` | {short_lifecycle} | {role_access(method, path)} | `{tables}` |"
        )

    lines += ["", "## Detailed endpoint contracts", ""]
    current_tag: str | None = None
    for method, path, operation in operations:
        tag = (operation.get("tags") or ["service"])[0]
        if tag != current_tag:
            lines += [f"### {tag}", ""]
            current_tag = tag
        summary = clean_summary(operation)
        lines += [f"#### `{method} {path}` - {summary}", ""]
        route_description = operation.get("description", "").strip().replace("\n", " ")
        purpose = route_description or normal_use_case(method, path, summary)
        lines += [
            "**Purpose and behavior**",
            "",
            purpose,
            "",
            normal_use_case(method, path, summary),
            "",
            f"- **Lifecycle:** {lifecycle(method, path)}",
            f"- **Where used:** {ui_usage(method, path, tag)}",
            f"- **Effective role access:** {role_access(method, path)}",
            f"- **Route gate:** {auth_requirement(method, path)}",
            f"- **Primary feature tables:** {', '.join(f'`{table}`' for table in feature_tables(method, path)) or 'None; this is static, redirect-based, or operational.'}",
            "",
            "**Input contract**",
            "",
        ]
        parameters = operation.get("parameters", [])
        if parameters:
            lines += [
                "| Location | Field | Required | Type | Example | Declared constraints/description |",
                "|---|---|---:|---|---|---|",
            ]
            for parameter in parameters:
                parameter_schema = parameter.get("schema", {})
                constraints = []
                for key in ("minimum", "maximum", "minLength", "maxLength", "pattern"):
                    if key in parameter_schema:
                        constraints.append(f"{key}={parameter_schema[key]}")
                if parameter.get("description"):
                    constraints.append(str(parameter["description"]).replace("|", "\\|"))
                lines.append(
                    f"| {parameter.get('in')} | `{parameter['name']}` | {'yes' if parameter.get('required') else 'no'} | `{markdown_type(parameter_schema)}` | `{parameter_example(parameter, definitions)}` | {'; '.join(constraints) or '-'} |"
                )
            lines.append("")
        else:
            lines += ["No path or query parameters.", ""]

        media_type, request_schema = body_info(operation)
        if request_schema is None:
            lines += ["Request body: none.", ""]
        elif media_type == "multipart/form-data":
            resolved = resolve_schema(request_schema, definitions)
            required = set(resolved.get("required", []))
            lines += [
                f"Multipart request body, schema `{schema_label(request_schema)}`:",
                "",
                "| Field | Required | Type | Example |",
                "|---|---:|---|---|",
            ]
            for name, prop in resolved.get("properties", {}).items():
                example = sample_value(prop, definitions, field_name=name)
                lines.append(
                    f"| `{name}` | {'yes' if name in required else 'no'} | `{markdown_type(prop)}` | `{example}` |"
                )
            lines.append("")
        else:
            lines += [
                f"JSON request body, schema `{schema_label(request_schema)}`:",
                "",
                *json_block(sample_value(request_schema, definitions)),
                "",
            ]

        code, response_schema = operation_success(operation)
        lines += ["**Expected output**", ""]
        if path == "/auth/login":
            lines += [
                "Success is an HTTP 302 redirect to Microsoft or the configured SSO gateway. The direct Microsoft flow also creates an OAuth state cookie.",
                "",
            ]
        elif path in {"/auth/callback", "/auth/sso-gateway-callback"}:
            lines += [
                "Success is an HTTP 302 redirect to the frontend with backend access and refresh cookies set. The callback is not independently runnable without the matching OAuth state/code flow.",
                "",
            ]
        else:
            lines += [
                f"Success returns **HTTP {code}** using response schema `{schema_label(response_schema)}`.",
                "",
            ]
            if response_schema:
                lines += [
                    "Representative response shape:",
                    "",
                    *json_block(sample_value(response_schema, definitions)),
                    "",
                ]

        lines += ["**Positive scenarios**", ""]
        lines.extend(f"- {scenario}" for scenario in positive_scenarios(method, path))
        lines += ["", "**Negative scenarios**", ""]
        lines.extend(f"- {scenario}" for scenario in negative_scenarios(method, path))
        lines += ["", "---", ""]

    lines += [
        "## Regeneration and drift check",
        "",
        "Run from the repository root:",
        "",
        "```powershell",
        ".\\.venv\\Scripts\\python.exe backend\\docs\\api\\generate_api_assets.py",
        "```",
        "",
        "The generator fails if the number of Postman requests differs from the number of FastAPI operations. SQL table mappings and service-level role rules still require review whenever repositories or authorization logic change because OpenAPI cannot infer them.",
        "",
    ]
    return "\n".join(lines)


def build_role_access_matrix(schema: dict[str, Any]) -> str:
    operations = [
        (method.upper(), path, methods[method])
        for path, methods in schema["paths"].items()
        for method in HTTP_METHODS
        if method in methods
    ]
    lines = [
        "# Role and permission access matrix",
        "",
        "This document describes effective access in the current code, not just menu visibility. It combines FastAPI dependencies, the tenant role-permission rows verified on 2026-10-23, service-level role checks, ownership rules, and tenant scoping.",
        "",
        "## Role behavior",
        "",
        "- `EMPLOYEE`: self-service booking, dashboard, team lookup, own profile/preferences, and other generally authenticated reads.",
        "- `FACILITATOR`: employee abilities plus creating delegated employee bookings and operating guest profiles/visits. Existing resources still require creator/subject involvement unless explicitly stated.",
        "- `FRONT_OFFICE`: reception role. It can view today's guest visits and is the only role allowed to check guests in or out. It is not a general guest operator.",
        "- `MANAGER`: present in the schema and permission seed, but dormant in the core ownership module; it receives no implicit cross-user authority.",
        "- `TENANT_ADMIN`: tenant-wide administrative role and the only currently seeded tenant role for most admin endpoints. It bypasses `require_any_permission`, but not bare `require_permission` or the FRONT_OFFICE-only check-in/out rule.",
        "- `PRODUCT_ADMIN`: protected platform role. It bypasses `require_any_permission` gates but does not automatically bypass bare `require_permission` or every service-level rule.",
        "",
        "## Current seeded permissions",
        "",
        "These grants matched tenants 3 and 4 when audited. Since role permissions are tenant data, testers should confirm `/auth/me` when testing another database or tenant.",
        "",
        "| Role | Active permission keys |",
        "|---|---|",
    ]
    for role, permissions in CURRENT_ROLE_PERMISSIONS.items():
        lines.append(f"| `{role}` | {', '.join(f'`{p}`' for p in permissions)} |")
    lines += [
        "",
        "## Endpoint-by-endpoint effective access",
        "",
        "| Method | Path | Route gate | Effective roles/conditions | Lifecycle |",
        "|---|---|---|---|---|",
    ]
    for method, path, _operation in operations:
        state = "Future scope" if (method, path) in FUTURE_SCOPE else "Active"
        lines.append(
            f"| {method} | `{path}` | {auth_requirement(method, path)} | {role_access(method, path)} | {state} |"
        )
    lines += [
        "",
        "## High-value authorization tests",
        "",
        "1. Verify every protected endpoint returns 401 with no token and rejects a Microsoft Graph access token.",
        "2. Verify a user cannot read or mutate another tenant's IDs.",
        "3. Verify FACILITATOR can create for another employee but cannot edit an unrelated existing booking.",
        "4. Verify TENANT_ADMIN can manage tenant bookings and guest workflows but cannot check guests in/out.",
        "5. Verify only FRONT_OFFICE can check in/out, and its guest-visit reads are limited to today.",
        "6. Verify `PATCH /admin/users/{user_id}/access` blocks self-change, PRODUCT_ADMIN targets, invalid roles, and removal of the last active tenant admin.",
        "7. Verify routes using bare `require_permission` fail when a tenant is missing role seed data; admin role names alone do not bypass that dependency.",
        "",
    ]
    return "\n".join(lines)


def build_postman_guide() -> str:
    return """# Postman guide for the Seat Management API

## Files to import

Import these two files into the Postman desktop application or a cloud workspace:

1. `seat-management.postman_collection.json`
2. `seat-management.postman_environment.json`

Select **Seat Management - Local QA** in the environment selector. There is nothing to compile: Postman reads the JSON collection directly. If Postman Local Mode offers to upgrade the files to v3 YAML, that conversion is optional; keep these v2.1 JSON source files so they remain portable and regeneratable.

## Start the backend

From the repository root:

```powershell
.\\.venv\\Scripts\\python.exe -m uvicorn backend.main:app --reload
```

The supplied `baseUrl` is `http://localhost:8000`. First send `GET /health`. If the API runs elsewhere, update `baseUrl` in the selected environment.

## Authenticate in Postman

The backend uses browser SSO and issues its own access/refresh tokens as HTTP-only cookies. A Microsoft token copied from Graph or browser storage will not work.

Preferred cookie flow:

1. Open `GET /auth/login` in a browser that shares Postman's cookie jar or use Postman's browser-based authorization flow.
2. Complete Microsoft sign-in and allow the callback to finish.
3. Confirm Postman's cookie manager contains `access_token` and `refresh_token` for the API host.
4. Send `GET /auth/me` and confirm the user, role, and permissions.

Bearer-token alternative:

1. Obtain a backend-issued access JWT from an authorized development/test login workflow or browser network response.
2. Paste only the token value into the environment's secret `accessToken` variable.
3. Keep collection authorization set to **Inherit auth from parent**.

Do not send access or refresh tokens to testers in the collection file. Each tester should authenticate with an approved test account.

## Where inputs and outputs appear

- Path IDs use environment variables such as `{{bookingId}}`, `{{guestVisitId}}`, and `{{sessionId}}`.
- Query inputs are under **Params**. Optional filters are intentionally disabled; tick the checkbox to use one.
- JSON inputs are under **Body > raw > JSON**.
- Floor-layout uploads use **Body > form-data**; select the local SVG file for the file field.
- After sending, the live output appears in the lower **Response** panel.
- Saved example outputs are available from the request's **Examples** menu. Each request contains a positive success example and applicable 401/403/404/422 negative examples.
- Detailed purpose, roles, tables, and scenarios appear in the request's **Documentation/Description** panel and in `API_REFERENCE.md`.

## Recommended execution order

1. Health and authentication: `/health`, `/auth/me`.
2. Read master data: `/sites`, `/buildings`, `/floors`, `/amenities`.
3. Create dedicated QA records before mutation tests. Save returned IDs into environment variables.
4. Run positive scenarios with a role that is expected to succeed.
5. Repeat protected requests with missing auth and with a role that must fail.
6. Run ownership and cross-tenant negative tests using approved isolated test data.
7. Run destructive/cancellation scenarios last because several workflows are stateful and not reversible.

## Sharing with another tester

Send the two JSON files plus the three Markdown documents. The tester imports the JSON files, chooses or edits the environment, starts/targets a backend, and signs in with their own test account. Environment values and cookies are local to their Postman installation unless they explicitly sync them.

## Troubleshooting

- **401 missing_access_token**: no backend JWT/cookie was sent, or the wrong environment is selected.
- **401 microsoft_token_not_accepted**: replace the Microsoft token with a backend-issued token.
- **401 session_revoked/inactive_user**: sign in again with an ACTIVE user.
- **403 insufficient_permissions**: inspect `/auth/me`; the role's tenant-scoped permission rows may differ from the documented seed.
- **404 using a sample ID**: replace the placeholder with an ID that exists in the authenticated tenant.
- **422 validation error**: compare Params/Body with the request schema and required fields in the documentation.
- **Callback fails when sent manually**: expected unless the matching OAuth state cookie and authorization code were created by `/auth/login`.
"""


def main() -> None:
    source = app.openapi()
    enriched = build_enriched_openapi(source)
    collection = build_enhanced_postman_collection(enriched)
    environment = build_postman_environment(enriched)
    environment["name"] = "Seat Management - Local QA"
    operation_count = sum(
        1
        for methods in enriched["paths"].values()
        for method in methods
        if method in HTTP_METHODS
    )
    request_count = count_collection_requests(collection["item"])
    if request_count != operation_count:
        raise RuntimeError(
            f"Postman request count {request_count} != OpenAPI operation count {operation_count}"
        )

    outputs = {
        "seat-management.openapi.json": json.dumps(
            enriched, indent=2, ensure_ascii=False
        )
        + "\n",
        "seat-management.postman_collection.json": json.dumps(
            collection, indent=2, ensure_ascii=False
        )
        + "\n",
        "seat-management.postman_environment.json": json.dumps(
            environment, indent=2, ensure_ascii=False
        )
        + "\n",
        "API_REFERENCE.md": build_enhanced_markdown(enriched),
        "ROLE_ACCESS_MATRIX.md": build_role_access_matrix(enriched),
        "POSTMAN_GUIDE.md": build_postman_guide(),
    }
    for filename, content in outputs.items():
        (OUTPUT_DIR / filename).write_text(content, encoding="utf-8")
    print(
        f"Generated {len(outputs)} files with {operation_count} API operations in {OUTPUT_DIR}"
    )


if __name__ == "__main__":
    main()
