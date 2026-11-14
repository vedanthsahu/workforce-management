"""Alembic environment for the real application schema.

Connects using a dedicated per-environment migrator role, never the app's
own runtime role (DB_USER / DB_PASSWORD) -- that role intentionally has no
CREATE on schema public, by design.

Which environment is picked via MIGRATE_TARGET (dev|uat, default dev),
reading DB_DEV_MIGRATE_USER/DB_DEV_MIGRATE_PASSWORD or
DB_UAT_MIGRATE_USER/DB_UAT_MIGRATE_PASSWORD from the repo-root .env
accordingly. Database name is derived as seatbooking_<target> rather than
a separate env var, matching the existing naming convention. Set
MIGRATE_TARGET=uat before running an alembic command to point at UAT
instead of dev:
  set MIGRATE_TARGET=uat

models.py (one folder up) describes all 36 real tables, no prefix, derived
directly from a live scan via ../refresh_models_from_db.py. This is the
real baseline -- autogenerate diffs against it directly, no table-name
filter, because every table here is real.
"""

import os
import sys
from logging.config import fileConfig
from urllib.parse import quote_plus

from alembic import context
from sqlalchemy import engine_from_config, pool

# Make models.py (one folder up from migrations/) importable.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import Base  # noqa: E402

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def _url_from_dotenv() -> str:
    """Build a SQLAlchemy URL from the repo-root .env, the same file
    backend/core/config.py reads DB_* from."""
    env_path = os.path.join(
        os.path.dirname(
            os.path.dirname(
                os.path.dirname(
                    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                )
            )
        ),
        ".env",
    )
    values: dict[str, str] = {}
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            values[key.strip()] = value.strip()

    target = os.environ.get("MIGRATE_TARGET", "dev").strip().lower()
    if target not in ("dev", "uat"):
        raise RuntimeError(f"MIGRATE_TARGET must be 'dev' or 'uat', got: {target!r}")

    user_key = f"DB_{target.upper()}_MIGRATE_USER"
    password_key = f"DB_{target.upper()}_MIGRATE_PASSWORD"

    required = ("DB_HOST", "DB_PORT", user_key, password_key)
    missing = [k for k in required if k not in values]
    if missing:
        raise RuntimeError(f".env at {env_path} is missing: {', '.join(missing)}")

    sslmode = values.get("DB_SSLMODE", "prefer")
    db_name = f"seatbooking_{target}"
    # User/password are URL-encoded since either can contain characters
    # (e.g. '@') that would otherwise be misread as part of the URL
    # structure itself.
    user = quote_plus(values[user_key])
    password = quote_plus(values[password_key])
    return (
        f"postgresql+psycopg2://{user}:{password}"
        f"@{values['DB_HOST']}:{values['DB_PORT']}/{db_name}?sslmode={sslmode}"
    )


url = os.environ.get("REAL_MIGRATIONS_DATABASE_URL") or _url_from_dotenv()
# Alembic's config is backed by configparser, which treats a bare '%' as the
# start of an interpolation directive. A URL-encoded password (e.g. '%40'
# for '@') would otherwise raise "invalid interpolation syntax" here --
# doubling it to '%%' is configparser's own escape for a literal '%', and
# get_section() below un-escapes it back to a single '%' automatically.
config.set_main_option("sqlalchemy.url", url.replace("%", "%%"))

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
