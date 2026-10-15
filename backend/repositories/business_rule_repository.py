"""
Repository helpers for tenant-configurable business rules.

`business_rules` holds the catalog: one row per rule, with a system-wide
default value. `tenant_business_rules` holds a tenant's override of that
default, if it has one. A rule with no tenant override falls back to the
catalog default -- there is no "unset" state once a rule exists in the
catalog.
"""

from __future__ import annotations

from typing import Any

from psycopg2.extensions import connection as PGConnection
from psycopg2.extras import RealDictCursor


def fetch_business_rule(
    conn: PGConnection,
    *,
    tenant_id: str,
    business_rule_key: str,
) -> dict[str, Any] | None:
    """Return one business rule's effective value for a tenant -- the
    tenant's override if one exists, otherwise the catalog default.

    Returns None if no rule with this key exists in the catalog at all.
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                br.id::text AS business_rule_id,
                br.business_rule_key,
                br.name,
                br.description,
                br.data_type,
                COALESCE(tbr.value, br.default_value) AS value,
                (tbr.id IS NOT NULL) AS is_tenant_override
            FROM business_rules AS br
            LEFT JOIN tenant_business_rules AS tbr
                ON tbr.business_rule_id = br.id
               AND tbr.tenant_id = %s
            WHERE br.business_rule_key = %s
            """,
            (tenant_id, business_rule_key),
        )
        row = cur.fetchone()

    return dict(row) if row else None


def _cast_business_rule_value(value: str, data_type: str) -> Any:
    dtype = data_type.strip().upper()
    if dtype in ("INTEGER", "INT"):
        return int(value)
    if dtype in ("DECIMAL", "FLOAT", "NUMBER", "NUMERIC"):
        return float(value)
    if dtype in ("BOOLEAN", "BOOL"):
        return value.strip().lower() in ("true", "1", "yes")
    return value


def fetch_business_rule_value(
    conn: PGConnection,
    *,
    tenant_id: str,
    business_rule_key: str,
    default: Any = None,
) -> Any:
    """Return one business rule's effective value, cast to its declared
    data_type (INTEGER -> int, DECIMAL -> float, BOOLEAN -> bool, else str).

    Returns `default` if the rule doesn't exist in the catalog -- callers
    should treat that as "not configured yet" and fall back to their own
    hardcoded default, not treat it as an error.
    """
    rule = fetch_business_rule(conn, tenant_id=tenant_id, business_rule_key=business_rule_key)
    if rule is None:
        return default
    return _cast_business_rule_value(rule["value"], rule["data_type"])


def upsert_tenant_business_rule(
    conn: PGConnection,
    *,
    tenant_id: str,
    business_rule_key: str,
    value: str,
    updated_by_user_id: str,
) -> None:
    """Create or update a tenant's override of one business rule, by key.

    Does not commit -- callers that need to update more than one rule
    together (e.g. a dependent pair) should call this once per rule and
    commit once at the end, so the set applies atomically.

    Raises LookupError if no rule with this key exists in the catalog.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO tenant_business_rules (
                tenant_id, business_rule_id, value, updated_by_user_id
            )
            SELECT %s, br.id, %s, %s
            FROM business_rules AS br
            WHERE br.business_rule_key = %s
            ON CONFLICT (tenant_id, business_rule_id) DO UPDATE
                SET value = EXCLUDED.value,
                    updated_at = NOW(),
                    updated_by_user_id = EXCLUDED.updated_by_user_id
            """,
            (tenant_id, value, updated_by_user_id, business_rule_key),
        )
        if cur.rowcount != 1:
            raise LookupError(f"No business rule with key '{business_rule_key}' exists.")
