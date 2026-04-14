"""
database.py — Database connection and query execution
Authors: Eduardo Martinez, Raschid Llamas

Provides a single function `execute_query` that:
  - Opens a short-lived connection (connection-per-request pattern)
  - Executes the validated query inside a try/except block
  - Returns a dict with columns + rows for SELECT, or affected row count otherwise
  - Rolls back on any error so the DB state is never left dirty
"""

import os
import psycopg2
import psycopg2.extras
from typing import Any


def _get_connection() -> psycopg2.extensions.connection:
    """
    Build a psycopg2 connection from environment variables.
    Expected env vars (set in .env loaded by main.py):
        DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
    """
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 5432)),
        dbname=os.getenv("DB_NAME", "remotesql"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres"),
        connect_timeout=5,          # fail fast if the server is unreachable
        application_name="RemoteSQL",
    )


def execute_query(sql: str) -> dict[str, Any]:
    """
    Execute a validated SQL statement and return a serializable result dict.

    For SELECT / WITH … SELECT:
        {
          "type": "select",
          "columns": ["col1", "col2", ...],
          "rows": [[val, val, ...], ...],
          "row_count": <int>
        }

    For INSERT / UPDATE:
        {
          "type": "write",
          "affected_rows": <int>
        }

    On any database error:
        raises RuntimeError with a safe error message (no stack trace exposed).
    """
    conn = None
    cursor = None
    try:
        conn = _get_connection()
        # RealDictCursor returns rows as OrderedDicts — easy to serialize
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cursor.execute(sql)

        # Decide result shape based on whether the statement produced rows
        if cursor.description is not None:
            # SELECT or WITH...SELECT
            columns = [desc.name for desc in cursor.description]
            raw_rows = cursor.fetchall()

            # Convert each RealDictRow to a plain list (JSON-safe, preserves order)
            rows = [list(row.values()) for row in raw_rows]

            # Serialize any non-JSON-native types (Decimal, date, etc.)
            rows = _serialize_rows(rows)

            conn.commit()
            return {
                "type": "select",
                "columns": columns,
                "rows": rows,
                "row_count": len(rows),
            }
        else:
            # INSERT or UPDATE
            affected = cursor.rowcount
            conn.commit()
            return {
                "type": "write",
                "affected_rows": affected if affected >= 0 else 0,
            }

    except psycopg2.Error as exc:
        # Roll back to leave the DB in a clean state
        if conn:
            conn.rollback()
        # Expose only the psycopg2 error message, not the full traceback
        raise RuntimeError(str(exc)) from exc

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def _serialize_rows(rows: list) -> list:
    """
    Recursively convert values that are not natively JSON-serializable.
    Handles: Decimal → float, date/datetime → ISO string, bytes → hex string.
    """
    import decimal
    import datetime

    def convert(val: Any) -> Any:
        if isinstance(val, decimal.Decimal):
            return float(val)
        if isinstance(val, (datetime.datetime, datetime.date, datetime.time)):
            return val.isoformat()
        if isinstance(val, bytes):
            return val.hex()
        return val

    return [[convert(cell) for cell in row] for row in rows]
