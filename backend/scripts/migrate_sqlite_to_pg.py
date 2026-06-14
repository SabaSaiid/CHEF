#!/usr/bin/env python3
"""
migrate_sqlite_to_pg.py — One-time data migration from SQLite → PostgreSQL

Usage:
    # 1. Make sure PostgreSQL is running (e.g. via docker-compose)
    # 2. Set your .env with the PostgreSQL URL:
    #      DATABASE_BACKEND=postgresql
    #      DATABASE_URL=postgresql://chef_user:chef_pass@localhost:5432/chef_db
    # 3. Run this script from the backend directory:
    #      python scripts/migrate_sqlite_to_pg.py

    The script reads from the local SQLite file and writes to the
    PostgreSQL database configured in .env. It migrates all 4 tables
    in dependency order.

Safety:
    - This script is READ-ONLY on SQLite (no data is modified or deleted)
    - Uses INSERT with conflict handling — safe to re-run
    - Prints a summary of rows transferred for each table
"""

import os
import sys

# Ensure the backend directory is on the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker


# ── Configuration ──────────────────────────────────────────────

# Source: SQLite (always reads from the local file)
SQLITE_PATH = os.environ.get("SQLITE_PATH", os.path.expanduser("~/chef.db"))
SQLITE_URL = f"sqlite:///{SQLITE_PATH}"

# Target: PostgreSQL (from .env or environment)
# Import settings to get the configured PG URL
from app.config import settings


def get_pg_url():
    """Build the PostgreSQL URL from app settings."""
    url = settings.DATABASE_URL
    if url.startswith("sqlite"):
        print("❌ DATABASE_URL is still set to SQLite.")
        print("   Set DATABASE_BACKEND=postgresql and DATABASE_URL=postgresql://... in .env")
        sys.exit(1)
    # Normalize for pg8000
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+pg8000://", 1)
    elif url.startswith("postgresql://") and "+pg8000" not in url:
        url = url.replace("postgresql://", "postgresql+pg8000://", 1)
    if "sslmode=require" in url:
        url = url.replace("?sslmode=require", "").replace("&sslmode=require", "")
    return url


def migrate():
    """Transfer all data from SQLite to PostgreSQL."""
    print("=" * 60)
    print("  CHEF — SQLite → PostgreSQL Data Migration")
    print("=" * 60)

    # ── Connect to both databases ──
    if not os.path.exists(SQLITE_PATH):
        print(f"❌ SQLite database not found at: {SQLITE_PATH}")
        print(f"   Set SQLITE_PATH environment variable if it's elsewhere.")
        sys.exit(1)

    print(f"\n📁 Source (SQLite): {SQLITE_PATH}")
    sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
    SqliteSession = sessionmaker(bind=sqlite_engine)

    pg_url = get_pg_url()
    print(f"🐘 Target (PostgreSQL): {pg_url.split('@')[-1] if '@' in pg_url else pg_url}")
    pg_engine = create_engine(pg_url, pool_pre_ping=True)
    PgSession = sessionmaker(bind=pg_engine)

    # ── Migrate tables in dependency order ──
    # (users first, then tables that reference users)
    tables = ["users", "saved_recipes", "meal_plans", "nutrition_logs"]
    total = 0

    print(f"\n{'Table':<20} {'Rows':>8}")
    print("-" * 30)

    for table_name in tables:
        sqlite_session = SqliteSession()
        pg_session = PgSession()

        try:
            # Read all rows from SQLite
            rows = sqlite_session.execute(text(f"SELECT * FROM {table_name}")).fetchall()
            columns = sqlite_session.execute(text(f"SELECT * FROM {table_name} LIMIT 0")).keys()
            col_names = list(columns)

            if not rows:
                print(f"{table_name:<20} {'0 (empty)':>8}")
                continue

            # Insert into PostgreSQL row by row (handles conflicts gracefully)
            for row in rows:
                row_dict = dict(zip(col_names, row))
                placeholders = ", ".join([f":{col}" for col in col_names])
                col_list = ", ".join(col_names)
                insert_sql = text(
                    f"INSERT INTO {table_name} ({col_list}) VALUES ({placeholders}) "
                    f"ON CONFLICT DO NOTHING"
                )
                pg_session.execute(insert_sql, row_dict)

            pg_session.commit()
            count = len(rows)
            total += count
            print(f"{table_name:<20} {count:>8}")

        except Exception as e:
            pg_session.rollback()
            print(f"{table_name:<20} {'ERROR':>8} — {e}")
        finally:
            sqlite_session.close()
            pg_session.close()

    print("-" * 30)
    print(f"{'TOTAL':<20} {total:>8}")
    print(f"\n✅ Migration complete!")
    print(f"   You can now set DATABASE_BACKEND=postgresql in your .env")
    print(f"   and restart the app to use PostgreSQL.\n")


if __name__ == "__main__":
    migrate()
