#!/usr/bin/env python3
"""
setup_database.py — One-shot FSMS database setup.

Creates the target Postgres database (if it doesn't already exist) and
restores the full schema + data from database/fsms_full_backup.dump — a
pg_dump custom-format snapshot of a fully migrated, seeded FSMS database.
This is the Python equivalent of running `npm run migrate && npm run seed`,
except it reproduces the exact current dataset instead of an empty schema.

Requires `pg_dump`'s sibling tool `pg_restore` to be on PATH — both ship
together in every Postgres install (Windows EDB installer, Homebrew, apt).

Usage:
    python scripts/setup_database.py
    python scripts/setup_database.py --database-url postgresql://localhost:5432/fsms_dev
    python scripts/setup_database.py --dump path/to/other.dump

Reads DATABASE_URL from .env (via python-dotenv) if --database-url isn't given.
"""

import argparse
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse

try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError:
    sys.exit("Missing dependency: run `pip install psycopg2-binary python-dotenv` first.")

try:
    from dotenv import dotenv_values
except ImportError:
    dotenv_values = None

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DUMP = PROJECT_ROOT / "database" / "fsms_full_backup.dump"


def resolve_database_url(cli_value: str | None) -> str:
    if cli_value:
        return cli_value
    env_path = PROJECT_ROOT / ".env"
    if dotenv_values and env_path.exists():
        value = dotenv_values(env_path).get("DATABASE_URL")
        if value:
            return value
    sys.exit(
        "DATABASE_URL not found. Pass --database-url, or create a .env file "
        "in the project root with a DATABASE_URL= line."
    )


def ensure_tool_on_path(tool: str) -> None:
    if shutil.which(tool) is None:
        sys.exit(
            f"'{tool}' was not found on PATH. It ships with every Postgres "
            "install (Windows: <PostgreSQL install dir>\\bin — usually added "
            "to PATH automatically by the installer)."
        )


def create_database_if_missing(database_url: str) -> None:
    parsed = urlparse(database_url)
    target_db = parsed.path.lstrip("/")
    if not target_db:
        sys.exit(f"Could not determine a database name from {database_url!r}")

    admin_conn_kwargs = {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
    }
    if parsed.username:
        admin_conn_kwargs["user"] = parsed.username
    if parsed.password:
        admin_conn_kwargs["password"] = parsed.password

    # Every standard Postgres install has a maintenance database to connect
    # to before the target database exists — but which one varies: the
    # official Windows/Linux installers ship a "postgres" database, while
    # Homebrew on macOS instead creates one named after the OS user and no
    # "postgres" database at all. Try the common case first, then fall back.
    try:
        conn = psycopg2.connect(dbname="postgres", **admin_conn_kwargs)
    except psycopg2.OperationalError:
        conn = psycopg2.connect(**admin_conn_kwargs)  # defaults to a DB named after the connecting user
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)  # CREATE DATABASE can't run inside a transaction
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (target_db,))
            if cur.fetchone():
                print(f"Database '{target_db}' already exists — skipping creation.")
            else:
                cur.execute(f'CREATE DATABASE "{target_db}"')
                print(f"Created database '{target_db}'.")
    finally:
        conn.close()


def restore_dump(database_url: str, dump_path: Path) -> None:
    if not dump_path.exists():
        sys.exit(f"Dump file not found: {dump_path}")

    print(f"Restoring {dump_path.name} into {database_url} ...")
    result = subprocess.run(
        [
            "pg_restore",
            "--clean",
            "--if-exists",
            "--no-owner",
            "--no-privileges",
            "--dbname", database_url,
            str(dump_path),
        ],
        capture_output=True,
        text=True,
    )
    # pg_restore routinely prints harmless "does not exist, skipping" notices
    # on a fresh database (from --if-exists) — only treat a non-zero exit as failure.
    if result.stdout:
        print(result.stdout)
    if result.returncode != 0:
        print(result.stderr, file=sys.stderr)
        sys.exit(f"pg_restore failed (exit code {result.returncode}).")
    if result.stderr:
        print(result.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--database-url", help="Target Postgres connection string. Defaults to DATABASE_URL in .env.")
    parser.add_argument("--dump", default=str(DEFAULT_DUMP), help=f"Path to the pg_dump custom-format file. Default: {DEFAULT_DUMP}")
    args = parser.parse_args()

    ensure_tool_on_path("pg_restore")

    database_url = resolve_database_url(args.database_url)
    dump_path = Path(args.dump)

    create_database_if_missing(database_url)
    restore_dump(database_url, dump_path)

    print("\nDatabase setup complete.")


if __name__ == "__main__":
    main()
