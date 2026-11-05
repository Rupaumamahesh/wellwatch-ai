"""Provision the project-local database using the isolated cluster administrator."""
import os
import secrets
from pathlib import Path
import psycopg
from psycopg import sql
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
user, password, database = (os.environ[name] for name in ("POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"))
admin_file = Path(__file__).resolve().parents[1] / ".local/postgres-admin-password"
# Upgrade older local clusters without changing the application password.
admin_password = admin_file.read_text() if admin_file.exists() else password
with psycopg.connect(host="127.0.0.1", port=os.environ["POSTGRES_PORT"], user="wellwatch_admin", password=admin_password, dbname="postgres", autocommit=True) as conn:
    if not admin_file.exists():
        admin_password = secrets.token_urlsafe(48)
        admin_file.write_text(admin_password)
        try:
            conn.execute(sql.SQL("ALTER ROLE wellwatch_admin PASSWORD {}").format(sql.Literal(admin_password)))
        except Exception:
            admin_file.unlink()
            raise
    if not conn.execute("SELECT 1 FROM pg_roles WHERE rolname=%s", (user,)).fetchone():
        # CREATEDB is local-only so Django can create its isolated test database.
        conn.execute(sql.SQL("CREATE ROLE {} LOGIN CREATEDB PASSWORD {}").format(sql.Identifier(user), sql.Literal(password)))
    if not conn.execute("SELECT 1 FROM pg_database WHERE datname=%s", (database,)).fetchone():
        conn.execute(sql.SQL("CREATE DATABASE {} OWNER {}").format(sql.Identifier(database), sql.Identifier(user)))
print("Local PostgreSQL database ready.")
