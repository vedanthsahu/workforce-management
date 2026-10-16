"""
Regenerates models.py and schema_dump_<date>.json from a read-only scan
of the live database.

This is the one script allowed to introspect the database and emit the
SQLAlchemy model classes that Alembic (migrations/env.py in this same
folder) diffs against for autogenerate. Used once already to produce the
initial baseline from the current real schema (36 tables, no prefix).
Run it again any time models.py needs to be re-derived directly from the
database instead of hand-edited:

    python backend/db/migrations/refresh_models_from_db.py

It does not write anything to the database -- SELECT-only introspection
via information_schema, then local file output.
"""

import datetime
import json
import os

import psycopg2

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))

TYPE_MAP = {
    "bigint": "BigInteger",
    "integer": "Integer",
    "smallint": "SmallInteger",
    "boolean": "Boolean",
    "text": "Text",
    "date": "Date",
    "uuid": "UUID",
    "jsonb": "JSONB",
    "json": "JSON",
    "inet": "INET",
    "time without time zone": "Time",
}

# pg_constraint.confupdtype/confdeltype single-char codes -> the string
# SQLAlchemy's ForeignKeyConstraint(onupdate=/ondelete=) expects. 'a' (no
# action) is the SQLAlchemy default already, so it's omitted entirely
# rather than mapped -- leaving it out of FK_ACTION means .get() returns
# None and the generator skips rendering that kwarg.
FK_ACTION = {
    "r": "RESTRICT",
    "c": "CASCADE",
    "n": "SET NULL",
    "d": "SET DEFAULT",
}


def _load_env() -> dict[str, str]:
    values: dict[str, str] = {}
    with open(os.path.join(REPO_ROOT, ".env")) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            values[key.strip()] = value.strip()
    return values


def _connect():
    env = _load_env()
    # Read-only introspection -- the app's own runtime role is fine here,
    # no elevated privilege needed just to read information_schema.
    return psycopg2.connect(
        host=env["DB_HOST"],
        port=env["DB_PORT"],
        dbname=env["DB_NAME"],
        user=env["DB_USER"],
        password=env["DB_PASSWORD"],
        sslmode=env.get("DB_SSLMODE", "prefer"),
    )


def scan_schema(cur) -> dict:
    cur.execute("""
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT LIKE '\\_atv\\_%'
          AND tablename NOT IN ('alembic_version');
    """)
    tables = sorted(r[0] for r in cur.fetchall())

    schema = {}
    for t in tables:
        cur.execute(
            """
            SELECT column_name, data_type, udt_name, character_maximum_length,
                   numeric_precision, numeric_scale, is_nullable, column_default,
                   ordinal_position
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position;
        """,
            (t,),
        )
        columns = cur.fetchall()

        cur.execute(
            """
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema = 'public' AND tc.table_name = %s AND tc.constraint_type = 'PRIMARY KEY'
            ORDER BY kcu.ordinal_position;
        """,
            (t,),
        )
        pk = [r[0] for r in cur.fetchall()]

        # information_schema.constraint_column_usage is unreliable for
        # resolving the referenced column through referential_constraints
        # (silently returns zero rows rather than erroring) -- pg_catalog
        # directly, matching conkey[n] to confkey[n] by ordinal position,
        # handles composite FKs correctly and actually returns results.
        cur.execute(
            """
            SELECT a.attname AS column_name, ref.relname AS ref_table,
                   af.attname AS ref_column, con.conname AS fk_name,
                   con.confupdtype, con.confdeltype
            FROM pg_constraint con
            JOIN pg_class tbl ON tbl.oid = con.conrelid
            JOIN pg_class ref ON ref.oid = con.confrelid
            JOIN unnest(con.conkey) WITH ORDINALITY AS ck(attnum, n) ON true
            JOIN pg_attribute a ON a.attrelid = tbl.oid AND a.attnum = ck.attnum
            JOIN unnest(con.confkey) WITH ORDINALITY AS cfk(attnum, n) ON cfk.n = ck.n
            JOIN pg_attribute af ON af.attrelid = ref.oid AND af.attnum = cfk.attnum
            WHERE con.contype = 'f' AND tbl.relname = %s;
        """,
            (t,),
        )
        fks = cur.fetchall()

        cur.execute(
            """
            SELECT tc.constraint_name, array_agg(kcu.column_name ORDER BY kcu.ordinal_position)
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema = 'public' AND tc.table_name = %s AND tc.constraint_type = 'UNIQUE'
            GROUP BY tc.constraint_name;
        """,
            (t,),
        )
        uniques = cur.fetchall()

        # Standalone indexes only -- anything backing a PK/UNIQUE constraint
        # shares that constraint's name in Postgres and is already captured
        # above; declaring it again as an Index would be a duplicate and
        # would show up as permanent autogenerate noise.
        # pg_get_indexdef(..., column_no, true) rather than joining through
        # pg_attribute, specifically so a functional/expression index (e.g.
        # lower(email)) renders its real expression instead of silently
        # resolving to the nearest plain column -- a plain-attribute join
        # can't distinguish "this position is an expression" from "this
        # position is a normal column" and was producing a wrong match.
        cur.execute(
            """
            SELECT i.relname,
                   array_agg(pg_get_indexdef(ix.indexrelid, x.n, true) ORDER BY x.n) AS col_exprs,
                   ix.indisunique,
                   pg_get_expr(ix.indpred, ix.indrelid) AS where_clause,
                   array_agg((ix.indoption[x.n - 1] & 1) ORDER BY x.n) AS desc_flags
            FROM pg_index ix
            JOIN pg_class i ON i.oid = ix.indexrelid
            JOIN pg_class tbl ON tbl.oid = ix.indrelid
            JOIN generate_series(1, ix.indnatts) AS x(n) ON true
            WHERE tbl.relname = %s
              AND i.relname NOT IN (SELECT conname FROM pg_constraint WHERE conrelid = tbl.oid)
            GROUP BY i.relname, ix.indisunique, ix.indpred, ix.indrelid;
        """,
            (t,),
        )
        indexes = cur.fetchall()

        schema[t] = {
            "columns": columns,
            "pk": pk,
            "fks": fks,
            "uniques": uniques,
            "indexes": indexes,
        }

    return schema


def py_type(col) -> str:
    (
        name,
        data_type,
        udt_name,
        char_len,
        num_prec,
        num_scale,
        is_nullable,
        default,
        pos,
    ) = col
    if data_type in ("character varying", "character"):
        return f"String({char_len})" if char_len else "String"
    if data_type == "numeric":
        if num_prec is not None and num_scale is not None:
            return f"Numeric({num_prec}, {num_scale})"
        return "Numeric"
    if data_type == "timestamp with time zone":
        return "DateTime(timezone=True)"
    if data_type == "timestamp without time zone":
        return "DateTime(timezone=False)"
    if data_type == "ARRAY":
        inner = udt_name.lstrip("_")
        inner_map = {
            "text": "Text",
            "varchar": "String",
            "int4": "Integer",
            "int8": "BigInteger",
        }
        return f"ARRAY({inner_map.get(inner, 'Text')})"
    if data_type in TYPE_MAP:
        return TYPE_MAP[data_type]
    return f"String  # UNMAPPED data_type={data_type} udt={udt_name}"


def default_expr(default, is_pk: bool) -> str | None:
    if default is None:
        return None
    if is_pk and default.startswith("nextval("):
        return None
    escaped = default.replace("\\", "\\\\").replace('"', '\\"')
    return f'server_default=text("{escaped}")'


def classname(table_name: str) -> str:
    return "".join(p.capitalize() for p in table_name.split("_"))


def render(schema: dict) -> str:
    lines = []
    lines.append('"""')
    lines.append(
        f"REAL SCHEMA MODELS -- regenerated {datetime.date.today()} by refresh_models_from_db.py."
    )
    lines.append(
        "One class per real table (no prefix). This is what migrations/env.py diffs"
    )
    lines.append(
        "against for autogenerate. Do not hand-edit; rerun the generator instead, or"
    )
    lines.append(
        "edit directly if you are deliberately authoring the NEXT schema change before"
    )
    lines.append(
        "generating its migration -- see the workflow note in migrations/env.py."
    )
    lines.append('"""')
    lines.append("")
    lines.append("from sqlalchemy import (")
    lines.append(
        "    Column, BigInteger, Integer, SmallInteger, String, Text, Boolean,"
    )
    lines.append(
        "    DateTime, Date, Time, Numeric, ForeignKeyConstraint, UniqueConstraint,"
    )
    lines.append("    Index, ARRAY, text,")
    lines.append(")")
    lines.append("from sqlalchemy.dialects.postgresql import JSONB, JSON, UUID, INET")
    lines.append("from sqlalchemy.orm import declarative_base")
    lines.append("")
    lines.append("Base = declarative_base()")
    lines.append("")

    def _as_list(cols):
        # psycopg2 returns array_agg's result as a raw "{a,b}" string here
        # rather than a Python list (no typecaster registered for this
        # particular aggregate's anonymous array type) -- parse it.
        if isinstance(cols, str):
            return cols.strip("{}").split(",")
        return list(cols)

    for table, info in schema.items():
        pk_cols = set(info["pk"])
        # Named explicitly (not inline Column(ForeignKey(...))) so the
        # constraint name matches the real database exactly -- otherwise
        # autogenerate can't match an unnamed model-side FK to the real
        # named one and flags it as removed-then-re-added, every time.
        fk_constraints = [
            (
                fk_name,
                col,
                ref_table,
                ref_col,
                FK_ACTION.get(upd),
                FK_ACTION.get(delete),
            )
            for col, ref_table, ref_col, fk_name, upd, delete in info["fks"]
        ]
        single_unique_cols = set()
        multi_unique = []
        for cname, cols in info["uniques"]:
            cols = _as_list(cols)
            if len(cols) == 1:
                single_unique_cols.add(cols[0])
            else:
                multi_unique.append((cname, cols))

        lines.append("")
        lines.append(f"class {classname(table)}(Base):")
        lines.append(f'    __tablename__ = "{table}"')
        lines.append("")
        for col in info["columns"]:
            name = col[0]
            is_nullable = col[6] == "YES"
            default = col[7]
            is_pk = name in pk_cols
            parts = [py_type(col)]
            if is_pk:
                parts.append("primary_key=True")
            else:
                parts.append(f"nullable={is_nullable}")
            if name in single_unique_cols and not is_pk:
                parts.append("unique=True")
            d = default_expr(default, is_pk)
            if d:
                parts.append(d)
            # A handful of real columns are literally named "metadata",
            # which collides with the reserved Base.metadata attribute on
            # every declarative class. Keep the real column name via an
            # explicit first arg, rename only the Python-side attribute.
            if name in ("metadata", "registry"):
                parts.insert(0, f'"{name}"')
                lines.append(f"    {name}_ = Column({', '.join(parts)})")
            else:
                lines.append(f"    {name} = Column({', '.join(parts)})")

        table_args = []
        for cname, cols in multi_unique:
            col_list = ", ".join(f'"{c}"' for c in cols)
            table_args.append(f'UniqueConstraint({col_list}, name="{cname}")')
        for fk_name, col, ref_table, ref_col, on_update, on_delete in fk_constraints:
            fk_parts = [f'["{col}"]', f'["{ref_table}.{ref_col}"]', f'name="{fk_name}"']
            if on_update:
                fk_parts.append(f'onupdate="{on_update}"')
            if on_delete:
                fk_parts.append(f'ondelete="{on_delete}"')
            table_args.append(f"ForeignKeyConstraint({', '.join(fk_parts)})")
        for index_name, cols, is_unique, where_clause, desc_flags in info["indexes"]:
            cols = _as_list(cols)
            desc_flags = (
                [int(x or 0) for x in _as_list(desc_flags)]
                if desc_flags is not None
                else [0] * len(cols)
            )
            col_exprs = []
            for c, flag in zip(cols, desc_flags):
                expr = f"{c} DESC" if flag else c
                # A bare identifier can go in as a plain string; anything
                # else (a function call, a cast, "col DESC") is not a
                # column name SQLAlchemy would accept that way, so it has
                # to be an explicit SQL text() fragment instead.
                if expr.isidentifier():
                    col_exprs.append(f'"{expr}"')
                else:
                    escaped = expr.replace("\\", "\\\\").replace('"', '\\"')
                    col_exprs.append(f'text("{escaped}")')
            index_parts = [f'"{index_name}"', *col_exprs]
            if is_unique:
                index_parts.append("unique=True")
            if where_clause:
                escaped_where = where_clause.replace("\\", "\\\\").replace('"', '\\"')
                index_parts.append(f'postgresql_where=text("{escaped_where}")')
            table_args.append(f"Index({', '.join(index_parts)})")

        if table_args:
            lines.append("")
            lines.append("    __table_args__ = (")
            for arg in table_args:
                lines.append(f"        {arg},")
            lines.append("    )")
        lines.append("")

    return "\n".join(lines)


def main() -> None:
    conn = _connect()
    cur = conn.cursor()
    schema = scan_schema(cur)
    conn.close()

    code = render(schema)
    with open(os.path.join(HERE, "models.py"), "w") as f:
        f.write(code)

    today = datetime.date.today().isoformat()
    # Keep only today's dump alongside models.py, so stale dumps from a
    # previous regeneration don't linger and look like an older alternative.
    for f in os.listdir(HERE):
        if f.startswith("schema_dump_") and f.endswith(".json"):
            os.remove(os.path.join(HERE, f))
    with open(os.path.join(HERE, f"schema_dump_{today}.json"), "w") as f:
        json.dump(schema, f, indent=2, default=str)

    unmapped = "UNMAPPED" in code
    print(f"Regenerated models.py from {len(schema)} tables.")
    print(f"Unmapped column types present: {unmapped}")


if __name__ == "__main__":
    main()
