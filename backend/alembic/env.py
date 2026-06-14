"""
Alembic environment configuration for CHEF.

Key design decisions:
  - Database URL is loaded from `app.config.settings` (not from alembic.ini)
    so it always matches what the running FastAPI app uses.
  - `target_metadata` points to `app.database.Base.metadata` which includes
    all 4 ORM models: users, saved_recipes, meal_plans, nutrition_logs.
  - Supports both offline (SQL script generation) and online (live DB) modes.
"""

from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Load our app's config and models ──────────────────────────
# This import also triggers all models to register with Base.metadata
from app.config import settings
from app.database import Base, engine
import app.models  # noqa: F401 — ensures all models are imported

# Alembic Config object (from alembic.ini)
config = context.config

# Set the database URL dynamically from our app config
config.set_main_option("sqlalchemy.url", str(engine.url))

# Logging setup (from alembic.ini)
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Tell Alembic about our ORM metadata — this is what it compares
# against the actual database to auto-generate migration diffs.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode — generates SQL scripts
    without connecting to the database. Useful for review.

    Usage: alembic upgrade head --sql
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode — connects to the live database
    and applies changes directly.

    Usage: alembic upgrade head
    """
    # Use our pre-configured engine instead of creating a new one
    connectable = engine

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,        # Detect column type changes
            compare_server_default=True,  # Detect default value changes
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
