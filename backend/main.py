"""
main.py — FastAPI application entry point
Authors: Eduardo Martinez, Raschid Llamas

Endpoints:
  POST /api/query   — validate and execute a SQL statement
  GET  /api/health  — liveness probe
  GET  /api/schema  — returns table names for the connected DB
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env BEFORE any DB import
load_dotenv()

from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging

from security import validate_query
from database import execute_query

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("remotesql")

# ---------------------------------------------------------------------------
# Rate limiter  (30 req/min on /api/query, 60 req/min on /api/schema)
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address)

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Remote SQL Architect and Explorer — API",
    description="A secure proxy that executes validated SQL against a PostgreSQL database.",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Allow requests from the frontend (adjust origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],         # restrict to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# API Key authentication
# ---------------------------------------------------------------------------
_API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


def verify_api_key(api_key: str | None = Depends(_API_KEY_HEADER)) -> None:
    """
    If API_KEY is set in .env, every protected request must carry a matching
    X-API-Key header.  If API_KEY is empty, auth is disabled (open/dev mode).
    """
    expected = os.getenv("API_KEY", "").strip()
    if not expected:
        return  # open mode — no key configured
    if api_key != expected:
        logger.warning("Rejected request — invalid or missing API key")
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class QueryRequest(BaseModel):
    query: str = Field(
        ...,
        min_length=1,
        max_length=4_000,
        description="Raw SQL statement to execute.",
        examples=["SELECT * FROM users LIMIT 10;"],
    )


class ErrorResponse(BaseModel):
    error: str
    detail: str = ""


# ---------------------------------------------------------------------------
# Global exception handler
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error.", "detail": str(exc)},
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health", tags=["System"])
async def health():
    """Liveness probe — confirms the API is running."""
    return {"status": "ok", "service": "RemoteSQL API"}


@app.get("/api/schema", tags=["System"])
@limiter.limit("60/minute")
async def get_schema(request: Request, _: None = Depends(verify_api_key)):
    """
    Returns the names and column info of all user-created tables.
    Useful for the frontend's schema explorer panel.
    """
    try:
        result = execute_query(
            """
            SELECT
                t.table_name,
                c.column_name,
                c.data_type,
                c.is_nullable,
                c.column_default
            FROM information_schema.tables  t
            JOIN information_schema.columns c
              ON c.table_name = t.table_name
             AND c.table_schema = t.table_schema
            WHERE t.table_schema = 'public'
              AND t.table_type   = 'BASE TABLE'
            ORDER BY t.table_name, c.ordinal_position;
            """
        )
        return result
    except RuntimeError as exc:
        logger.warning("Schema fetch error: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"error": "Could not retrieve schema.", "detail": str(exc)},
        )


@app.post("/api/query", tags=["Query"])
@limiter.limit("30/minute")
async def run_query(request: Request, payload: QueryRequest, _: None = Depends(verify_api_key)):
    """
    Main endpoint.

    Flow:
      1. Receive the SQL string from the frontend.
      2. Run security validation (whitelist + blocklist).
      3. Execute against PostgreSQL via psycopg2.
      4. Return results (columns + rows) or write confirmation as JSON.

    Returns 400 for invalid queries, 422 for Pydantic validation errors,
    500 for database / server errors.
    """
    raw_sql = payload.query.strip()

    # --- Step 1: Security validation -----------------------------------------
    is_valid, rejection_reason = validate_query(raw_sql)
    if not is_valid:
        logger.warning("Query rejected | reason=%s | query=%.120s", rejection_reason, raw_sql)
        return JSONResponse(
            status_code=400,
            content={
                "error": "Query rejected by security filter.",
                "detail": rejection_reason,
            },
        )

    # --- Step 2: Execute against the database ---------------------------------
    logger.info("Executing query: %.120s", raw_sql)
    try:
        result = execute_query(raw_sql)
        logger.info(
            "Query successful | type=%s | rows=%s",
            result.get("type"),
            result.get("row_count", result.get("affected_rows", "n/a")),
        )
        return result

    except RuntimeError as exc:
        # Database-level error (syntax error, constraint violation, etc.)
        logger.warning("Database error: %s", exc)
        return JSONResponse(
            status_code=400,
            content={
                "error": "Database returned an error.",
                "detail": str(exc),
            },
        )


# ---------------------------------------------------------------------------
# Dev runner
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("API_PORT", 8000)),
        reload=True,
        log_level="info",
    )
