"""user_repository.py Repository helpers for schema-native tenant, user, and Graph identity access."""

from __future__ import annotations

from typing import Any

from psycopg2.extras import Json, RealDictCursor
from psycopg2.extensions import connection as PGConnection

USER_SELECT_FIELDS = """
    au.id::text AS user_id,
    au.tenant_id::text AS tenant_id,
    au.external_user_id,
    au.email,
    au.full_name,
    au.display_name,
    au.mobile_phone,
    au.office_location,
    au.department,
    au.job_title,
    au.company_name,
    au.employee_id,
    au.microsoft_object_id,
    au.user_principal_name,
    au.manager_user_id::text AS manager_user_id,
    au.role_name AS role,
    au.role_name AS role_name,
    au.status,
    au.home_site_id::text AS home_site_id,
    au.graph_last_synced_at,
    au.created_at,
    au.updated_at
"""

USER_SELECT_FROM = """
    FROM app_users AS au
"""

USER_RETURNING_FIELDS = """
    id::text AS user_id,
    tenant_id::text AS tenant_id,
    external_user_id,
    email,
    full_name,
    display_name,
    mobile_phone,
    office_location,
    department,
    job_title,
    company_name,
    employee_id,
    microsoft_object_id,
    user_principal_name,
    manager_user_id::text AS manager_user_id,
    role_name AS role,
    role_name,
    status,
    home_site_id::text AS home_site_id,
    graph_last_synced_at,
    created_at,
    updated_at
"""

ROLE_NAMES = {
    "EMPLOYEE",
    "MANAGER",
    "FACILITATOR",
    "FRONT_OFFICE",
    "TENANT_ADMIN",
    "FACILITATOR_GUEST_COORDINATOR",
}


def normalize_role_name(value: str | None) -> str:
    """Canonicalize a role name read from an external source (DB row, JWT claim).

    Existing rows can carry a space instead of the SCREAMING_SNAKE_CASE form
    every role comparison in the codebase expects (e.g. "FRONT OFFICE" vs.
    "FRONT_OFFICE") — normalize once at read time so callers can keep doing
    plain `==` checks against the canonical constants.
    """
    return str(value or "").strip().upper().replace(" ", "_")

USER_STATUSES = {"ACTIVE", "INACTIVE", "LOCKED"}

ROLE_DISTRIBUTION_ORDER = (
    "EMPLOYEE",
    "FACILITATOR",
    "FRONT_OFFICE",
    "MANAGER",
    "TENANT_ADMIN",
    "FACILITATOR_GUEST_COORDINATOR",
)

GRAPH_MANAGED_ROLE_NAMES = ("EMPLOYEE", "FACILITATOR")

ADMIN_NOTIFICATION_ROLES = (
    "TENANT_ADMIN",
)


def _normalize_email(value: str) -> str:
    return value.strip().lower()


def _normalize_text(value: str | None, *, max_length: int | None = None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    if max_length is not None and len(normalized) > max_length:
        raise ValueError(f"Value exceeds schema limit of {max_length} characters.")
    return normalized


def _required_text(value: str | None, *, field_name: str, max_length: int) -> str:
    normalized = _normalize_text(value, max_length=max_length)
    if normalized is None:
        raise ValueError(f"{field_name} is required.")
    return normalized


def fetch_default_tenant_id(conn: PGConnection) -> str:
    """Resolve one active tenant when request-level tenant scoping is absent."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id::text
            FROM tenants
            WHERE status = 'ACTIVE'
            """
        )
        rows = cur.fetchall()

    if not rows:
        raise LookupError("No active tenant found.")
    if len(rows) > 1:
        raise LookupError(
            "Multiple active tenants exist; tenant cannot be resolved without an azure_tenant_id."
        )
    return rows[0][0]


def fetch_active_tenant_ids(conn: PGConnection) -> list[str]:
    """Fetch active tenant ids in deterministic order."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id::text
            FROM tenants
            WHERE status = 'ACTIVE'
            ORDER BY id
            """
        )
        rows = cur.fetchall()
    return [str(row[0]) for row in rows]


def fetch_tenant_by_azure_tenant_id(conn: PGConnection, azure_tenant_id: str) -> dict[str, Any] | None:
    """Fetch the active application tenant whose tenant_key maps to Azure tid."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id::text AS tenant_id,
                tenant_key,
                tenant_name,
                status,
                created_at,
                updated_at
            FROM tenants
            WHERE tenant_key = %s
              AND status = 'ACTIVE'
            """,
            (azure_tenant_id,),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def fetch_active_tenant_for_login(conn: PGConnection, *, azure_tenant_id: str) -> dict[str, Any] | None:
    """Resolve the tenant for SSO using tenant_key, falling back only if unambiguous."""
    tenant = fetch_tenant_by_azure_tenant_id(conn, azure_tenant_id)
    if tenant is not None:
        return tenant

    tenant_id = fetch_default_tenant_id(conn)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id::text AS tenant_id,
                tenant_key,
                tenant_name,
                status,
                created_at,
                updated_at
            FROM tenants
            WHERE id = %s
              AND status = 'ACTIVE'
            """,
            (tenant_id,),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def fetch_user_by_email(
    conn: PGConnection,
    email: str,
    *,
    tenant_id: str,
) -> dict[str, Any] | None:
    """Fetch one user record by email address within a tenant."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {USER_SELECT_FIELDS}
            {USER_SELECT_FROM}
            WHERE au.tenant_id = %s
              AND au.email = %s
            """,
            (tenant_id, _normalize_email(email)),
        )
        result = cur.fetchone()
    return dict(result) if result else None


def fetch_user_by_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
) -> dict[str, Any] | None:
    """Fetch one tenant-scoped user record by app_users.id."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {USER_SELECT_FIELDS}
            {USER_SELECT_FROM}
            WHERE au.tenant_id = %s
              AND au.id = %s
            """,
            (tenant_id, user_id),
        )
        result = cur.fetchone()
    return dict(result) if result else None


def fetch_tenant_name_by_id(
    conn: PGConnection,
    *,
    tenant_id: str,
) -> str | None:
    """Fetch the display name for one tenant."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT tenant_name
            FROM tenants
            WHERE id = %s
            """,
            (tenant_id,),
        )
        row = cur.fetchone()
    return str(row[0]) if row and row[0] is not None else None


def fetch_user_profile_context(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
) -> dict[str, Any] | None:
    """Fetch profile UI context for the authenticated user."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                au.id::text AS user_id,
                au.tenant_id::text AS tenant_id,
                t.tenant_name,
                au.email,
                au.full_name,
                au.display_name,
                au.mobile_phone,
                au.office_location,
                au.department,
                au.job_title,
                au.company_name,
                au.employee_id,
                au.microsoft_object_id,
                au.user_principal_name,
                au.manager_user_id::text AS manager_user_id,
                manager.email AS manager_email,
                manager.full_name AS manager_full_name,
                manager.display_name AS manager_display_name,
                au.role_name,
                au.status,
                au.home_site_id::text AS home_site_id,
                site.site_code AS home_site_code,
                site.site_name AS home_site_name,
                site.city AS home_site_city,
                site.country AS home_site_country,
                site.timezone AS home_site_timezone,
                au.graph_last_synced_at,
                au.created_at,
                au.updated_at
            FROM app_users AS au
            INNER JOIN tenants AS t
                ON t.id = au.tenant_id
            LEFT JOIN app_users AS manager
                ON manager.id = au.manager_user_id
               AND manager.tenant_id = au.tenant_id
            LEFT JOIN sites AS site
                ON site.id = au.home_site_id
               AND site.tenant_id = au.tenant_id
            WHERE au.tenant_id = %s
              AND au.id = %s
            """,
            (tenant_id, user_id),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def fetch_admin_notification_emails(
    conn: PGConnection,
    *,
    tenant_id: str,
) -> list[str]:
    """Fetch active tenant admins who can receive system notifications."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT au.email
            FROM app_users AS au
            WHERE au.tenant_id = %s
              AND au.status = 'ACTIVE'
              AND au.email IS NOT NULL
              AND au.email <> ''
              AND au.role_name = ANY(%s::text[])
            ORDER BY au.email
            """,
            (
                tenant_id,
                list(ADMIN_NOTIFICATION_ROLES),
            ),
        )
        rows = cur.fetchall()

    return [str(row[0]) for row in rows if row and row[0]]


def fetch_user_by_microsoft_object_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    microsoft_object_id: str,
) -> dict[str, Any] | None:
    """Fetch one user by the schema's Microsoft object id unique key."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {USER_SELECT_FIELDS}
            {USER_SELECT_FROM}
            WHERE au.tenant_id = %s
              AND au.microsoft_object_id = %s
            """,
            (tenant_id, _required_text(microsoft_object_id, field_name="microsoft_object_id", max_length=150)),
        )
        result = cur.fetchone()
    return dict(result) if result else None


def fetch_user_by_sso_identity(
    conn: PGConnection,
    *,
    tenant_id: str,
    provider: str,
    provider_user_id: str,
) -> dict[str, Any] | None:
    """Fetch one user through auth_identities within the resolved tenant."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {USER_SELECT_FIELDS}
            FROM auth_identities AS ai
            INNER JOIN app_users AS au
                ON au.tenant_id = ai.tenant_id
               AND au.id = ai.user_id
            WHERE ai.tenant_id = %s
              AND ai.provider = %s
              AND ai.provider_user_id = %s
            """,
            (
                tenant_id,
                _required_text(provider, field_name="provider", max_length=50),
                _required_text(provider_user_id, field_name="provider_user_id", max_length=150),
            ),
        )
        result = cur.fetchone()
    return dict(result) if result else None


def create_app_user_from_graph(
    conn: PGConnection,
    *,
    tenant_id: str,
    microsoft_object_id: str,
    email: str,
    full_name: str,
    user_principal_name: str | None,
    display_name: str | None,
    mobile_phone: str | None,
    office_location: str | None,
    job_title: str | None,
    department: str | None,
    company_name: str | None,
    employee_id: str | None,
    manager_user_id: str | None,
    role_name: str = "EMPLOYEE",
) -> dict[str, Any]:
    """Create a first-time SSO user in app_users using schema-valid fields."""
    normalized_email = _required_text(_normalize_email(email), field_name="email", max_length=200)
    normalized_role = _required_text(role_name, field_name="role_name", max_length=30).upper()
    normalized_status = "ACTIVE"

    if normalized_role not in ROLE_NAMES:
        raise ValueError("Default role_name is not allowed by chk_app_users_role.")
    if normalized_status not in USER_STATUSES:
        raise ValueError("Default status is not allowed by chk_app_users_status.")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            INSERT INTO app_users (
                tenant_id,
                email,
                full_name,
                role_name,
                status,
                microsoft_object_id,
                user_principal_name,
                display_name,
                mobile_phone,
                office_location,
                job_title,
                department,
                company_name,
                employee_id,
                manager_user_id,
                graph_last_synced_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (tenant_id, microsoft_object_id) DO UPDATE
            SET email = EXCLUDED.email,
                full_name = EXCLUDED.full_name,
                role_name = EXCLUDED.role_name,
                microsoft_object_id = EXCLUDED.microsoft_object_id,
                user_principal_name = EXCLUDED.user_principal_name,
                display_name = EXCLUDED.display_name,
                mobile_phone = COALESCE(app_users.mobile_phone, EXCLUDED.mobile_phone),
                office_location = COALESCE(app_users.office_location, EXCLUDED.office_location),
                job_title = EXCLUDED.job_title,
                department = EXCLUDED.department,
                company_name = EXCLUDED.company_name,
                employee_id = EXCLUDED.employee_id,
                manager_user_id = EXCLUDED.manager_user_id,
                graph_last_synced_at = NOW(),
                updated_at = NOW()
            RETURNING {USER_RETURNING_FIELDS}
            """,
            (
                tenant_id,
                normalized_email,
                _required_text(full_name, field_name="full_name", max_length=200),
                normalized_role,
                normalized_status,
                _required_text(microsoft_object_id, field_name="microsoft_object_id", max_length=150),
                _normalize_text(user_principal_name, max_length=200),
                _normalize_text(display_name, max_length=200),
                _normalize_text(mobile_phone, max_length=50),
                _normalize_text(office_location, max_length=200),
                _normalize_text(job_title, max_length=150),
                _normalize_text(department, max_length=150),
                _normalize_text(company_name, max_length=200),
                _normalize_text(employee_id, max_length=100),
                manager_user_id,
            ),
        )
        result = cur.fetchone()

    if result:
        return dict(result)

    existing = fetch_user_by_microsoft_object_id(
        conn,
        tenant_id=tenant_id,
        microsoft_object_id=microsoft_object_id,
    )
    if existing is None:
        raise LookupError("Unable to create or resolve the Microsoft SSO user.")
    return existing


def create_auth_identity_for_user(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
    provider: str,
    provider_tenant_id: str | None,
    provider_user_id: str,
    email: str,
    raw_profile: dict[str, Any],
) -> None:
    """Insert the provider identity row for a first-time SSO user."""
    normalized_provider = _required_text(provider, field_name="provider", max_length=50)
    normalized_provider_user_id = _required_text(provider_user_id, field_name="provider_user_id", max_length=150)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO auth_identities (
                tenant_id,
                user_id,
                provider,
                provider_tenant_id,
                provider_user_id,
                email,
                raw_profile
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (provider, provider_user_id) DO NOTHING
            """,
            (
                tenant_id,
                user_id,
                normalized_provider,
                _normalize_text(provider_tenant_id, max_length=100),
                normalized_provider_user_id,
                _required_text(_normalize_email(email), field_name="email", max_length=200),
                Json(raw_profile),
            ),
        )
        if cur.rowcount:
            return

        cur.execute(
            """
            SELECT tenant_id::text, user_id::text
            FROM auth_identities
            WHERE provider = %s
              AND provider_user_id = %s
            """,
            (normalized_provider, normalized_provider_user_id),
        )
        row = cur.fetchone()
    if row is None or str(row[0]) != str(tenant_id) or str(row[1]) != str(user_id):
        raise LookupError("Microsoft provider identity is already linked to a different user.")


def upsert_user_graph_profile(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
    graph_profile: dict[str, Any],
    manager_graph_object_id: str | None,
) -> None:
    """Store the enriched Microsoft Graph profile for a first-time SSO user."""
    graph_object_id = _required_text(str(graph_profile.get("id") or ""), field_name="graph_object_id", max_length=150)
    business_phones = graph_profile.get("businessPhones")
    if business_phones is not None and not isinstance(business_phones, list):
        raise ValueError("businessPhones must be a JSON array when present.")

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO user_graph_profiles (
                tenant_id,
                user_id,
                graph_object_id,
                user_principal_name,
                display_name,
                given_name,
                surname,
                mail,
                mobile_phone,
                business_phones,
                job_title,
                department,
                company_name,
                employee_id,
                office_location,
                city,
                state,
                country,
                manager_graph_object_id,
                raw_profile,
                synced_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (tenant_id, user_id) DO UPDATE
            SET graph_object_id = EXCLUDED.graph_object_id,
                user_principal_name = EXCLUDED.user_principal_name,
                display_name = EXCLUDED.display_name,
                given_name = EXCLUDED.given_name,
                surname = EXCLUDED.surname,
                mail = EXCLUDED.mail,
                mobile_phone = EXCLUDED.mobile_phone,
                business_phones = EXCLUDED.business_phones,
                job_title = EXCLUDED.job_title,
                department = EXCLUDED.department,
                company_name = EXCLUDED.company_name,
                employee_id = EXCLUDED.employee_id,
                office_location = EXCLUDED.office_location,
                city = EXCLUDED.city,
                state = EXCLUDED.state,
                country = EXCLUDED.country,
                manager_graph_object_id = EXCLUDED.manager_graph_object_id,
                raw_profile = EXCLUDED.raw_profile,
                synced_at = NOW(),
                updated_at = NOW()
            """,
            (
                tenant_id,
                user_id,
                graph_object_id,
                _normalize_text(graph_profile.get("userPrincipalName"), max_length=200),
                _normalize_text(graph_profile.get("displayName"), max_length=200),
                _normalize_text(graph_profile.get("givenName"), max_length=100),
                _normalize_text(graph_profile.get("surname"), max_length=100),
                _normalize_text(graph_profile.get("mail"), max_length=200),
                _normalize_text(graph_profile.get("mobilePhone"), max_length=50),
                Json(business_phones) if business_phones is not None else None,
                _normalize_text(graph_profile.get("jobTitle"), max_length=150),
                _normalize_text(graph_profile.get("department"), max_length=150),
                _normalize_text(graph_profile.get("companyName"), max_length=200),
                _normalize_text(graph_profile.get("employeeId"), max_length=100),
                _normalize_text(graph_profile.get("officeLocation"), max_length=200),
                _normalize_text(graph_profile.get("city"), max_length=100),
                _normalize_text(graph_profile.get("state"), max_length=100),
                _normalize_text(graph_profile.get("country"), max_length=100),
                _normalize_text(manager_graph_object_id, max_length=150),
                Json(graph_profile),
            ),
        )


def sync_graph_groups_for_user(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
    graph_groups: dict[str, Any],
) -> None:
    """Map Microsoft Graph groups to teams and team_members idempotently."""
    groups = graph_groups.get("value", [])
    if not isinstance(groups, list):
        raise ValueError("Graph groups payload must contain a list in 'value'.")

    for group in groups:
        if not isinstance(group, dict):
            continue
        odata_type = str(group.get("@odata.type") or "").strip()
        if odata_type and odata_type != "#microsoft.graph.group":
            continue

        team_key = _required_text(str(group.get("id") or ""), field_name="team_key", max_length=100)
        team_name = _normalize_text(group.get("displayName"), max_length=200) or team_key

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO teams (
                    tenant_id,
                    team_key,
                    team_name,
                    source
                )
                VALUES (%s, %s, %s, 'GRAPH')
                ON CONFLICT (tenant_id, team_key) DO UPDATE
                SET team_name = EXCLUDED.team_name,
                    source = EXCLUDED.source,
                    updated_at = NOW()
                RETURNING id::text AS team_id
                """,
                (tenant_id, team_key, team_name),
            )
            team = cur.fetchone()
            if team is None:
                raise LookupError(f"Graph team '{team_key}' could not be resolved.")

            cur.execute(
                """
                INSERT INTO team_members (
                    tenant_id,
                    team_id,
                    user_id,
                    member_role
                )
                VALUES (%s, %s, %s, 'MEMBER')
                ON CONFLICT (tenant_id, team_id, user_id) DO NOTHING
                """,
                (tenant_id, team["team_id"], user_id),
            )


def update_user_profile(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
    full_name: str | None = None,
    display_name: str | None = None,
    mobile_phone: str | None = None,
    office_location: str | None = None,
) -> dict[str, Any] | None:
    """Update self-editable profile fields."""

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE app_users
            SET
                full_name = COALESCE(%s, full_name),
                display_name = COALESCE(%s, display_name),
                mobile_phone = COALESCE(%s, mobile_phone),
                office_location = COALESCE(%s, office_location),
                updated_at = NOW()
            WHERE tenant_id = %s
              AND id = %s
            RETURNING {USER_RETURNING_FIELDS}
            """,
            (
                _normalize_text(full_name, max_length=200),
                _normalize_text(display_name, max_length=200),
                _normalize_text(mobile_phone, max_length=50),
                _normalize_text(office_location, max_length=200),
                tenant_id,
                user_id,
            ),
        )

        row = cur.fetchone()

    return dict(row) if row else None


def admin_update_user_access(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
    role_name: str | None = None,
    status: str | None = None,
) -> dict[str, Any] | None:
    """Update admin-managed access fields."""

    if role_name is not None and role_name not in ROLE_NAMES:
        raise ValueError("Invalid role_name.")

    if status is not None and status not in USER_STATUSES:
        raise ValueError("Invalid status.")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE app_users
            SET
                role_name = COALESCE(%s, role_name),
                status = COALESCE(%s, status),
                updated_at = NOW()
            WHERE tenant_id = %s
              AND id = %s
            RETURNING {USER_RETURNING_FIELDS}
            """,
            (
                role_name,
                status,
                tenant_id,
                user_id,
            ),
        )

        row = cur.fetchone()

    return dict(row) if row else None


def fetch_graph_managed_role_users(
    conn: PGConnection,
    *,
    tenant_id: str,
) -> list[dict[str, Any]]:
    """Fetch users whose role is controlled by Graph group membership."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {USER_SELECT_FIELDS}
            {USER_SELECT_FROM}
            WHERE au.tenant_id = %s
              AND au.role_name = ANY(%s::text[])
              AND au.microsoft_object_id IS NOT NULL
              AND au.microsoft_object_id <> ''
            ORDER BY au.id
            """,
            (
                tenant_id,
                list(GRAPH_MANAGED_ROLE_NAMES),
            ),
        )
        rows = cur.fetchall()
    return [dict(row) for row in rows]


def update_user_role(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
    role_name: str,
) -> dict[str, Any] | None:
    """Update one user's role_name and return the schema-native user row."""
    normalized_role = _required_text(role_name, field_name="role_name", max_length=30).upper()
    if normalized_role not in ROLE_NAMES:
        raise ValueError("Invalid role_name.")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE app_users
            SET role_name = %s,
                updated_at = NOW()
            WHERE tenant_id = %s
              AND id = %s
            RETURNING {USER_RETURNING_FIELDS}
            """,
            (
                normalized_role,
                tenant_id,
                user_id,
            ),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def sync_app_user_from_graph(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
    microsoft_object_id: str,
    email: str,
    full_name: str,
    user_principal_name: str | None,
    display_name: str | None,
    role_name: str,
    mobile_phone: str | None,
    office_location: str | None,
) -> dict[str, Any] | None:
    """Hydrate Graph-controlled fields while preserving user-maintained values."""
    normalized_role = _required_text(role_name, field_name="role_name", max_length=30).upper()
    if normalized_role not in ROLE_NAMES:
        raise ValueError("Invalid role_name.")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE app_users
            SET email = %s,
                full_name = %s,
                display_name = %s,
                role_name = %s,
                microsoft_object_id = %s,
                user_principal_name = %s,
                mobile_phone = COALESCE(mobile_phone, %s),
                office_location = COALESCE(office_location, %s),
                graph_last_synced_at = NOW(),
                updated_at = NOW()
            WHERE tenant_id = %s
              AND id = %s
            RETURNING {USER_RETURNING_FIELDS}
            """,
            (
                _required_text(_normalize_email(email), field_name="email", max_length=200),
                _required_text(full_name, field_name="full_name", max_length=200),
                _normalize_text(display_name, max_length=200),
                normalized_role,
                _required_text(microsoft_object_id, field_name="microsoft_object_id", max_length=150),
                _normalize_text(user_principal_name, max_length=200),
                _normalize_text(mobile_phone, max_length=50),
                _normalize_text(office_location, max_length=200),
                tenant_id,
                user_id,
            ),
        )
        row = cur.fetchone()
    return dict(row) if row else None

def fetch_favorite_seat(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    """Return the top two most-booked seats that exist in the current published layout.

    Returns a (first, second) tuple; either element may be None.
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                s.id::text AS seat_id,
                s.seat_code,
                s.site_id::text AS site_id,
                si.site_name,
                s.building_id::text AS building_id,
                bu.building_name,
                s.floor_id::text AS floor_id,
                fl.floor_name,
                COUNT(*) AS booking_count,
                MAX(b.booking_date) AS last_booked_date
            FROM bookings b
            JOIN seats s
                ON s.id = b.seat_id
                AND s.tenant_id = b.tenant_id
            LEFT JOIN sites si
                ON si.id = s.site_id
               AND si.tenant_id = s.tenant_id
            LEFT JOIN buildings bu
                ON bu.id = s.building_id
               AND bu.tenant_id = s.tenant_id
            LEFT JOIN floors fl
                ON fl.id = s.floor_id
               AND fl.tenant_id = s.tenant_id
            WHERE b.tenant_id = %s
              AND b.booked_for_user_id = %s
              AND b.booking_type = 'EMPLOYEE'
              AND b.booking_status = 'CONFIRMED'
              AND EXISTS (
                  SELECT 1
                  FROM floor_layouts fla
                  JOIN layout_seat_mappings lsm
                      ON lsm.layout_id = fla.id
                     AND lsm.tenant_id = fla.tenant_id
                     AND lsm.floor_id  = s.floor_id
                     AND lsm.seat_code = s.seat_code
                  WHERE fla.floor_id  = s.floor_id
                    AND fla.tenant_id = s.tenant_id
                    AND fla.is_published = TRUE
                    AND fla.status = 'PUBLISHED'
                    AND b.created_at >= fla.published_at
              )
            GROUP BY
                s.id,
                s.seat_code,
                s.site_id,
                si.site_name,
                s.building_id,
                bu.building_name,
                s.floor_id,
                fl.floor_name
            ORDER BY booking_count DESC, last_booked_date DESC, s.id
            LIMIT 2
            """,
            (tenant_id, user_id),
        )
        rows = cur.fetchall()
    first  = dict(rows[0]) if len(rows) > 0 else None
    second = dict(rows[1]) if len(rows) > 1 else None
    return first, second


def fetch_days_in_office(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(DISTINCT booking_date)
            FROM bookings
            WHERE tenant_id = %s
              AND booked_for_user_id = %s
              AND booking_type = 'EMPLOYEE'
              AND booking_status = 'CONFIRMED'
              AND booking_date <= CURRENT_DATE
            """,
            (tenant_id, user_id),
        )
        row = cur.fetchone()
    return int(row[0]) if row else 0
def fetch_days_in_office_current_month(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(DISTINCT booking_date)
            FROM bookings
            WHERE tenant_id = %s
              AND booked_for_user_id = %s
              AND booking_type = 'EMPLOYEE'
              AND booking_status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
              AND booking_date <= CURRENT_DATE
              AND DATE_TRUNC('month', booking_date)
                    = DATE_TRUNC('month', CURRENT_DATE)
            """,
            (tenant_id, user_id),
        )

        row = cur.fetchone()

    return int(row[0]) if row else 0
def fetch_days_in_office_current_year(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(DISTINCT booking_date)
            FROM bookings
            WHERE tenant_id = %s
              AND booked_for_user_id = %s
              AND booking_type = 'EMPLOYEE'
              AND booking_status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
              AND booking_date <= CURRENT_DATE
              AND DATE_TRUNC('year', booking_date)
                    = DATE_TRUNC('year', CURRENT_DATE)
            """,
            (tenant_id, user_id),
        )

        row = cur.fetchone()

    return int(row[0]) if row else 0
def fetch_team_rank_current_year(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
) -> dict[str, int | None]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            WITH primary_team AS (
                SELECT MIN(tm.team_id) AS team_id
                FROM team_members tm
                WHERE tm.tenant_id = %s
                  AND tm.user_id = %s
            ),
            yearly_counts AS (
                SELECT
                    tm.user_id::text AS user_id,
                    COUNT(DISTINCT b.booking_date) AS office_days
                FROM team_members tm
                CROSS JOIN primary_team pt
                LEFT JOIN bookings b
                    ON b.booked_for_user_id = tm.user_id
                   AND b.tenant_id = tm.tenant_id
                   AND b.booking_type = 'EMPLOYEE'
                   AND b.booking_status IN (
                        'CONFIRMED',
                        'CHECKED_IN',
                        'COMPLETED'
                   )
                   AND b.booking_date <= CURRENT_DATE
                   AND DATE_TRUNC('year', b.booking_date)
                        = DATE_TRUNC('year', CURRENT_DATE)
                WHERE tm.tenant_id = %s
                  AND tm.team_id = pt.team_id
                GROUP BY tm.user_id
            ),
            ranked AS (
                SELECT
                    user_id,
                    office_days,
                    RANK() OVER (
                        ORDER BY office_days DESC
                    ) AS team_rank
                FROM yearly_counts
            )
            SELECT
                team_rank,
                (
                    SELECT COUNT(*)
                    FROM yearly_counts
                ) AS team_member_count
            FROM ranked
            WHERE user_id = %s
            """,
            (
                tenant_id,
                user_id,
                tenant_id,
                user_id,
            ),
        )

        row = cur.fetchone()

    if row is None:
        return {
            "team_rank_current_year": None,
            "team_member_count": 0,
        }

    return {
        "team_rank_current_year": int(row["team_rank"]),
        "team_member_count": int(row["team_member_count"]),
    }



def search_users(
    conn: PGConnection,
    *,
    tenant_id: str,
    search_text: str,
    include_inactive: bool = False,
    limit: int = 20,
) -> list[dict[str, Any]]:
    search_text = search_text.strip().lower()

    status_clause = ""
    if not include_inactive:
        status_clause = "AND au.status = 'ACTIVE'"

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {USER_SELECT_FIELDS}
            {USER_SELECT_FROM}
            WHERE au.tenant_id = %s
            {status_clause}
              AND (
                    EXISTS (
                        SELECT 1
                        FROM unnest(
                            regexp_split_to_array(
                                lower(coalesce(au.full_name, '')),
                                '\s+'
                            )
                        ) AS name_part
                        WHERE name_part LIKE %s || '%%'
                    )
                 OR lower(coalesce(au.employee_id, ''))
                        LIKE %s || '%%'
                 OR coalesce(au.mobile_phone, '')
                        LIKE %s || '%%'
              )
            ORDER BY
                CASE
                    WHEN lower(coalesce(au.full_name, ''))
                         LIKE %s || '%%'
                    THEN 1
                    ELSE 2
                END,
                au.full_name,
                au.id
            LIMIT %s
            """,
            (
                tenant_id,

                # WHERE
                search_text,
                search_text,
                search_text,

                # ORDER BY
                search_text,

                limit,
            ),
        )

        rows = cur.fetchall()

    return [dict(row) for row in rows]


def build_admin_directory_pagination(
    *,
    page: int | None,
    limit: int | None,
    filtered_users: int,
) -> dict[str, Any] | None:

    if page is None or limit is None:
        return None

    total_pages = (
        filtered_users + limit - 1
    ) // limit

    return {
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1,
    }


def fetch_admin_user_directory(
    conn: PGConnection,
    *,
    tenant_id: str,
    role_name: str | None = None,
    role_names: list[str] | tuple[str, ...] | None = None,
    status: str | None = None,
    page: int | None = None,
    limit: int | None = None,
) -> dict[str, Any]:

    normalized_role_names: list[str] | None = None

    if role_names is not None:
        normalized_role_names = [
            _required_text(
                str(role),
                field_name="role_name",
                max_length=30,
            ).upper()
            for role in role_names
        ]

    elif role_name is not None:
        normalized_role_names = [
            _required_text(
                role_name,
                field_name="role_name",
                max_length=30,
            ).upper()
        ]

    params = {
        "tenant_id": tenant_id,
        "role_names": normalized_role_names,
        "status": status,
    }

    filtered_where = """
        WHERE au.tenant_id = %(tenant_id)s
          AND (
                %(role_names)s IS NULL
                OR au.role_name = ANY(
                    %(role_names)s::text[]
                )
          )
          AND (
                %(status)s IS NULL
                OR au.status = %(status)s
          )
    """

    pagination_clause = ""

    if page is not None or limit is not None:

        effective_page = page or 1
        effective_limit = limit or 20

        params["limit"] = effective_limit
        params["offset"] = (
            effective_page - 1
        ) * effective_limit

        pagination_clause = """
            LIMIT %(limit)s
            OFFSET %(offset)s
        """

    with conn.cursor(
        cursor_factory=RealDictCursor,
    ) as cur:

        # ---------------------------
        # summary
        # ---------------------------

        cur.execute(
            f"""
            SELECT
                (
                    SELECT COUNT(*)::integer
                    FROM app_users all_users
                    WHERE all_users.tenant_id = %(tenant_id)s
                ) AS total_users,

                COUNT(*)::integer AS filtered_users,

                COUNT(*) FILTER (
                    WHERE au.status = 'ACTIVE'
                )::integer AS active_users,

                COUNT(*) FILTER (
                    WHERE au.status = 'INACTIVE'
                )::integer AS inactive_users

            FROM app_users au
            {filtered_where}
            """,
            params,
        )

        summary = cur.fetchone()

        # ---------------------------
        # roles metadata
        # ---------------------------

        role_metadata = fetch_admin_role_metadata(
            conn,
            tenant_id=tenant_id,
        )

        # ---------------------------
        # users
        # ---------------------------

        cur.execute(
            f"""
            SELECT
                au.id::text AS id,
                au.employee_id,
                au.full_name,
                au.role_name,
                au.department,
                au.job_title,
                au.mobile_phone,
                au.status,
                au.email
            FROM app_users au
            {filtered_where}
            ORDER BY
                LOWER(au.full_name)
                    ASC NULLS LAST,
                au.id ASC
            {pagination_clause}
            """,
            params,
        )

        rows = cur.fetchall()

    summary_payload = (
        dict(summary)
        if summary
        else {
            "total_users": 0,
            "filtered_users": 0,
            "active_users": 0,
            "inactive_users": 0,
        }
    )

    pagination_payload = (
        build_admin_directory_pagination(
            page=page,
            limit=limit,
            filtered_users=summary_payload[
                "filtered_users"
            ],
        )
    )

    return {
        "summary": summary_payload,
        "roles": role_metadata,
        "pagination": pagination_payload,
        "items": [
            dict(row)
            for row in rows
        ],
    }



def fetch_user_details_by_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
) -> dict[str, Any] | None:

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT
            au.id::text AS id,
            au.email,
            au.full_name,
            au.display_name,
            au.role_name,
            au.status,
            au.employee_id,
            au.mobile_phone,
            au.office_location,
            au.job_title,
            au.department,
            au.company_name,
            au.manager_user_id::text,
            au.home_site_id::text
        FROM app_users au
        WHERE au.tenant_id = %s
        AND au.id = %s
        LIMIT 1
            """,
            (
                tenant_id,
                user_id,
            ),
        )

        row = cur.fetchone()

    return dict(row) if row else None

def fetch_admin_role_metadata(
    conn: PGConnection,
    *,
    tenant_id: str,
) -> list[dict[str, Any]]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                r.id AS role_id,
                r.role_name,
                r.description AS role_description,

                COUNT(DISTINCT au.id)::integer AS user_count,

                COUNT(DISTINCT p.id)::integer
                    AS permission_count,

                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'id', p.id,
                            'permission_key',
                                p.permission_key,
                            'description',
                                p.description,
                            'module_name',
                                p.module_name
                        )
                    )
                    FILTER (
                        WHERE p.id IS NOT NULL
                    ),
                    '[]'::json
                ) AS permissions

            FROM roles r

            LEFT JOIN app_users au
                ON UPPER(REPLACE(au.role_name, ' ', '_')) = UPPER(REPLACE(r.role_name, ' ', '_'))
                AND au.tenant_id = r.tenant_id

            LEFT JOIN role_permissions rp
                ON rp.role_id = r.id

            LEFT JOIN permissions p
                ON p.id = rp.permission_id
                AND p.is_active = TRUE

            WHERE r.tenant_id = %s
            AND r.is_active = TRUE

            GROUP BY
                r.id,
                r.role_name,
                r.description

            ORDER BY r.id
            """,
            (tenant_id,)
        )

        rows = cur.fetchall()

    return [dict(row) for row in rows]