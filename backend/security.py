"""
security.py — Query validation and sanitization layer
Authors: Eduardo Martinez, Raschid Llamas

Implements a whitelist-based approach:
  1. Strips comments and normalizes whitespace.
  2. Ensures the statement starts with an allowed keyword.
  3. Scans the full query for any blocked keyword.
  4. Enforces a hard length cap to prevent abuse.
"""

import re
from typing import Tuple

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Only these SQL statement types are permitted at the start of the query.
ALLOWED_STATEMENT_TYPES: set[str] = {"SELECT", "INSERT", "UPDATE", "WITH"}

# These keywords are dangerous regardless of where they appear.
# The check is applied after comment stripping.
BLOCKED_KEYWORDS: set[str] = {
    "DROP",
    "DELETE",
    "TRUNCATE",
    "ALTER",
    "CREATE",
    "REPLACE",
    "GRANT",
    "REVOKE",
    "EXEC",
    "EXECUTE",
    "CALL",
    "LOAD_FILE",
    "OUTFILE",
    "DUMPFILE",
    "SHUTDOWN",
    "SLEEP",       # used in time-based blind injection
    "BENCHMARK",   # used in time-based blind injection
    "PG_SLEEP",    # PostgreSQL time-based injection
    "PG_READ_FILE",
    "COPY",        # can read/write OS files in PostgreSQL
}

# Maximum allowed query length (characters).
MAX_QUERY_LENGTH: int = 4_000


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _strip_comments(query: str) -> str:
    """Remove SQL line comments (--) and block comments (/* */)."""
    # Block comments: /* ... */   (non-greedy, dot matches newline)
    query = re.sub(r"/\*.*?\*/", " ", query, flags=re.DOTALL)
    # Line comments: -- until end of line
    query = re.sub(r"--[^\n]*", " ", query)
    return query


def _normalize(query: str) -> str:
    """Strip comments and collapse whitespace to a single space."""
    return " ".join(_strip_comments(query).split())


def _extract_first_keyword(normalized: str) -> str:
    """Return the first word of the normalized query in uppercase."""
    parts = normalized.strip().split()
    return parts[0].upper() if parts else ""


def _find_blocked_keyword(normalized: str) -> str | None:
    """
    Scan the normalized query for any blocked keyword as a whole word.
    Returns the first match found, or None if clean.
    """
    upper = normalized.upper()
    for kw in BLOCKED_KEYWORDS:
        # Use word boundaries so 'CREATED' does not match 'CREATE'
        if re.search(rf"\b{re.escape(kw)}\b", upper):
            return kw
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def validate_query(raw_query: str) -> Tuple[bool, str]:
    """
    Validate a raw SQL query string.

    Returns
    -------
    (is_valid: bool, message: str)
        is_valid  – True if the query is safe to execute.
        message   – Human-readable explanation; empty string when valid.
    """
    # --- 1. Null / empty check -----------------------------------------------
    if not raw_query or not raw_query.strip():
        return False, "Query cannot be empty."

    # --- 2. Length guard -------------------------------------------------------
    if len(raw_query) > MAX_QUERY_LENGTH:
        return False, (
            f"Query exceeds the maximum allowed length of {MAX_QUERY_LENGTH} characters."
        )

    # --- 3. Normalize (strip comments, collapse whitespace) -------------------
    normalized = _normalize(raw_query)

    if not normalized:
        return False, "Query is empty after removing comments."

    # --- 4. Multiple statements guard (semicolons inside the query) -----------
    # A single trailing semicolon is acceptable; anything more suggests
    # stacked statements — a classic injection technique.
    stripped = normalized.rstrip(";").strip()
    if ";" in stripped:
        return False, (
            "Multiple statements detected. Only one SQL statement is allowed per request."
        )

    # --- 5. Allowed statement type check (whitelist) --------------------------
    first_kw = _extract_first_keyword(normalized)
    if first_kw not in ALLOWED_STATEMENT_TYPES:
        return False, (
            f"Statement type '{first_kw}' is not permitted. "
            f"Allowed types: {', '.join(sorted(ALLOWED_STATEMENT_TYPES))}."
        )

    # --- 6. Blocked keyword scan ----------------------------------------------
    blocked = _find_blocked_keyword(normalized)
    if blocked:
        return False, (
            f"Query contains the forbidden keyword '{blocked}'. "
            "Destructive or privileged operations are not allowed."
        )

    # --- 7. All checks passed -------------------------------------------------
    return True, ""
