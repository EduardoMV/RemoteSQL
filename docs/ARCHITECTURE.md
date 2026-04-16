# Architecture — Remote SQL Architect and Explorer

**Authors:** Eduardo Martinez · Raschid Llamas  
**Course:** Aprendizaje Automático para Grandes Volúmenes de Datos  
**Professor:** Dr. Juan Carlos López Pimentel — Universidad Panamericana

---

## 1. System Overview

Remote SQL Architect and Explorer is a three-tier web application that allows a user to write and execute raw SQL against a remote PostgreSQL database through a browser-based workbench, without using any traditional database client (DBeaver, pgAdmin, psql).

The system is composed of three independent layers that communicate over standard HTTP:

```
┌──────────────────────────────────────────────────────────┐
│                    USER / BROWSER                        │
└────────────────────────┬─────────────────────────────────┘
                         │  opens static files
                         ▼
┌──────────────────────────────────────────────────────────┐
│              FRONTEND WORKBENCH                          │
│         HTML · CSS · Vanilla JavaScript                  │
└────────────────────────┬─────────────────────────────────┘
                         │  HTTP / JSON  (REST API)
                         │  Header: X-API-Key
                         ▼
┌──────────────────────────────────────────────────────────┐
│               FASTAPI BACKEND  (Python)                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Step 1 · API Key Authentication                   │  │
│  ├────────────────────────────────────────────────────┤  │
│  │  Step 2 · Rate Limiter  (slowapi)                  │  │
│  ├────────────────────────────────────────────────────┤  │
│  │  Step 3 · SQL Security Validator  (security.py)    │  │
│  ├────────────────────────────────────────────────────┤  │
│  │  Step 4 · Database Execution  (psycopg2)           │  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────────┬─────────────────────────────────┘
                         │  psycopg2  TCP :5432
                         ▼
┌──────────────────────────────────────────────────────────┐
│              POSTGRESQL 16 DATABASE                      │
│   users · categories · products                          │
│   user_accounts · transactions                           │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Components

### 2.1 Frontend Workbench

A set of three static files served directly to the browser. No framework, no build step.

| File | Responsibility |
|------|---------------|
| `index.html` | Page structure and layout |
| `styles.css` | Dark IDE theme (inspired by VS Code / DataGrip) |
| `app.js` | All interactive logic: editor, fetch calls, rendering |

**Key UI features:**

- **SQL Editor** — CodeMirror 5 with SQL syntax highlighting (keywords in pink, operators in cyan, strings in green). Supports Ctrl+Enter to execute and a Format button.
- **Schema Explorer** — Left sidebar. On load it calls `GET /api/schema` and renders all tables and columns as an expandable tree. Double-clicking a table inserts a `SELECT *` snippet into the editor.
- **Results Table** — Renders `SELECT` output as a scrollable table with sticky headers. Shows row count and execution time in the toolbar. Paginates at 50 rows per page. Supports CSV export.
- **Query History** — Right panel tab. Every executed query is logged with its status (ok/err) and row count. Clicking an entry reloads it into the editor.
- **Saved Scripts** — Second right panel tab. Users can name and save SQL scripts to `localStorage`. They persist across sessions and can be loaded or deleted at any time.
- **API Key input** — Topbar password field. The key is stored in `localStorage` and sent as `X-API-Key` on every request.

---

### 2.2 FastAPI Backend

A Python ASGI application (`main.py`) that acts as a secure proxy between the frontend and the database. It never exposes database credentials to the browser.

**Endpoints:**

| Method | Path | Auth required | Rate limit | Description |
|--------|------|:---:|:---:|-------------|
| `GET` | `/api/health` | No | None | Liveness probe — returns `{ status: "ok" }` |
| `GET` | `/api/schema` | Yes | 60/min | Returns all table and column metadata |
| `POST` | `/api/query` | Yes | 30/min | Validates and executes a SQL statement |

**Request body for `POST /api/query`:**
```json
{ "query": "SELECT * FROM users LIMIT 10;" }
```

**Success response (SELECT):**
```json
{
  "type": "select",
  "columns": ["id", "email", "first_name"],
  "rows": [[1, "ana.garcia@mail.com", "Ana"]],
  "row_count": 1
}
```

**Success response (INSERT / UPDATE):**
```json
{ "type": "write", "affected_rows": 3 }
```

**Error response:**
```json
{
  "error": "Query rejected by security filter.",
  "detail": "Statement type 'DROP' is not permitted."
}
```

---

### 2.3 Security Pipeline (in-process, before any DB access)

Every request to `POST /api/query` passes through four sequential gates inside the backend process:

#### Step 1 — API Key Authentication
`fastapi.security.APIKeyHeader` reads the `X-API-Key` header and compares it to the `API_KEY` environment variable. A mismatch returns **HTTP 401**. If `API_KEY` is empty the server runs in open mode (useful for local development).

#### Step 2 — Rate Limiting
`slowapi` (backed by in-memory counters, keyed by client IP) enforces:
- `POST /api/query` → **30 requests / minute**
- `GET /api/schema` → **60 requests / minute**

Exceeding the limit returns **HTTP 429 Too Many Requests**.

#### Step 3 — SQL Security Validator (`security.py`)
Runs five checks in order:

1. **Comment stripping** — removes `--` line comments and `/* */` block comments to defeat obfuscation attacks before any keyword check.
2. **Whitelist** — the first keyword of the normalized query must be one of `SELECT`, `INSERT`, `UPDATE`, `WITH`. Anything else returns **HTTP 400**.
3. **Blocklist** — scans the full query for forbidden keywords using word-boundary regex: `DROP`, `DELETE`, `TRUNCATE`, `ALTER`, `CREATE`, `REPLACE`, `GRANT`, `REVOKE`, `EXEC`, `EXECUTE`, `CALL`, `COPY`, `SLEEP`, `PG_SLEEP`, `BENCHMARK`, and others. Returns **HTTP 400** on match.
4. **Stacked-statement guard** — rejects any query containing more than one `;`, preventing `SELECT 1; DROP TABLE users;` style attacks.
5. **Length cap** — hard limit of **4,000 characters**.

#### Step 4 — Database Execution (`database.py`)
`psycopg2` opens a short-lived connection per request (`connect_timeout=5 s`). The validated query is executed inside a `try/except psycopg2.Error` block. On any database-level error the transaction is rolled back and a sanitized error message (no stack trace) is returned to the caller.

---

### 2.4 PostgreSQL Database

A relational database designed in **Third Normal Form (3NF)**.

**Entity Relationship summary:**

```
users ──────────< user_accounts >────────── products
                       │
                       │
                  transactions >──────────── categories
```

| Table | Rows (seed) | Purpose |
|-------|:-----------:|---------|
| `users` | 12 | Customer profiles (email, name, phone) |
| `categories` | 10 | Lookup table for transaction types (3NF: avoids repeating strings on every transaction) |
| `products` | 5 | Financial products: savings, checking, credit card, loan, investment |
| `user_accounts` | 14 | Junction table linking users to products; holds balance and account number |
| `transactions` | 15 | Financial movements referencing an account and a category |

**3NF justification:**

- `categories` is extracted from `transactions` so the category name string is stored in exactly one place.
- `products` is decoupled from `user_accounts` so multiple customers can share the same product type without data duplication.
- `user_accounts` holds `balance` and `account_number` as attributes of the *user–product relationship*, not of either entity alone — satisfying 2NF.
- No column in any table has a transitive dependency on a non-key column.

---

## 3. Communication Flow

### 3.1 SELECT query — full round trip

```
Browser
  │
  │  1. User types SQL, presses Ctrl+Enter
  │
  ▼
app.js (Frontend)
  │
  │  2. POST /api/query
  │     Headers: Content-Type: application/json
  │              X-API-Key: <stored in localStorage>
  │     Body:    { "query": "SELECT * FROM users;" }
  │
  ▼
main.py (FastAPI)
  │
  │  3. API key checked  →  401 if wrong
  │  4. Rate limit checked  →  429 if exceeded
  │  5. security.validate_query()  →  400 if rejected
  │  6. database.execute_query()
  │
  ▼
PostgreSQL
  │
  │  7. Query executed, result set returned to psycopg2
  │
  ▼
main.py
  │
  │  8. Rows serialized to JSON
  │     { type, columns, rows, row_count }
  │
  ▼
app.js (Frontend)
  │
  │  9. Response parsed
  │  10. Results table rendered
  │  11. Row count + execution time shown in toolbar
  │  12. Query logged to History panel
  │
  ▼
Browser (User sees the table)
```

### 3.2 Error paths

| Trigger | HTTP status | User-visible message |
|---------|:-----------:|----------------------|
| Missing / wrong API key | 401 | "API key is missing or incorrect" |
| Rate limit exceeded | 429 | "Too many requests — wait a moment" |
| Blocked keyword (`DROP`, etc.) | 400 | Security filter rejection detail |
| SQL syntax error | 400 | PostgreSQL error message (sanitized) |
| DB unreachable | 500 | "Internal server error" |
| API server down | — | "Network error — is the API running?" |

---

## 4. Technology Stack

| Layer | Technology | Version | Role |
|-------|-----------|---------|------|
| Frontend | HTML / CSS / JavaScript | — | UI, no framework |
| SQL Editor | CodeMirror | 5.65 | Syntax highlighting |
| HTTP Client | Fetch API (browser built-in) | — | API calls |
| Backend | FastAPI | 0.115 | REST API framework |
| ASGI Server | Uvicorn | 0.32 | Production-grade server |
| Auth / Security | fastapi.security + slowapi | — | API key + rate limiting |
| DB Driver | psycopg2-binary | 2.9 | PostgreSQL adapter |
| Validation | Pydantic | 2.9 | Request model validation |
| Database | PostgreSQL | 16 | Relational data store |
| Containerization | Docker + Docker Compose | — | One-command deployment |

---

## 5. Deployment

### Local (development)

```bash
# 1. Load schema and seed data
psql -d remotesql -f database/schema.sql
psql -d remotesql -f database/seed.sql

# 2. Configure credentials
cd backend && cp .env.example .env   # fill in DB_PASSWORD and API_KEY

# 3. Install dependencies and start API
pip install -r requirements.txt
python main.py

# 4. Open frontend/index.html in a browser
```

### Docker (one command)

```bash
docker compose up
```

`docker-compose.yml` spins up two containers:
- **`db`** — PostgreSQL 16; schema and seed are loaded automatically via `docker-entrypoint-initdb.d`.
- **`api`** — FastAPI backend; waits for the DB healthcheck before starting.

The frontend is still opened as a local static file pointing to `http://localhost:8000`.
