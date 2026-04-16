# Remote SQL Architect and Explorer

**Authors:** Eduardo Martinez · Raschid Llamas  
**Course:** Aprendizaje Automático para Grandes Volúmenes de Datos  
**Professor:** Dr. Juan Carlos López Pimentel — Universidad Panamericana

---

## What is this?

A custom SQL workbench that lets you write and execute raw SQL against a remote PostgreSQL database through a secured REST API — no heavy clients like DBeaver or pgAdmin needed. You type SQL in the browser, hit Execute, and get results back as a table.

Think of it as a lightweight database IDE built from scratch.

---

## Project Structure

```
RemoteSQL/
├── backend/
│   ├── main.py          ← FastAPI app (routes, CORS, logging)
│   ├── security.py      ← Query validator (whitelist + blocklist)
│   ├── database.py      ← psycopg2 connection & result serialization
│   ├── requirements.txt
│   └── Dockerfile
│
├── database/
│   ├── schema.sql       ← CREATE TABLE statements (5 tables, 3NF)
│   ├── seed.sql         ← Base mock data
│   └── seed_extra.sql   ← Extended mock data (20 users, 34 accounts, 92 transactions)
│
├── frontend/
│   ├── index.html       ← Workbench layout
│   ├── styles.css       ← Dark IDE theme
│   └── app.js           ← All frontend logic
│
├── docs/
│   ├── ERD.pdf          ← Entity Relationship Diagram
│   └── Architecture.pdf ← Architecture and communication flow diagram
│
├── docker-compose.yml
└── README.md
```

---

## How to Run

There are two ways to run the project: **Docker** (recommended, one command) or **local** (manual setup).

---

### Option A — Docker (recommended)

**Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running.

```bash
docker compose up
```

That's it. Docker will:
1. Start a PostgreSQL 16 container and load the schema + all seed data automatically.
2. Build and start the FastAPI backend, waiting for the database to be ready.

Once running:
- Open `frontend/index.html` in your browser.
- Enter the API key `remotesql-dev-2026-edu` in the topbar and click **Save**.

To stop:
```bash
docker compose down
```

To do a full reset (wipes the database volume and reloads everything from scratch):
```bash
docker compose down -v && docker compose up
```

---

### Option B — Local Setup

**Requirements:** PostgreSQL, Python 3.10+, a browser.

#### Step 1 — Create the database

```bash
psql -U postgres -c "CREATE DATABASE remotesql;"
psql -U postgres -d remotesql -f database/schema.sql
psql -U postgres -d remotesql -f database/seed.sql
psql -U postgres -d remotesql -f database/seed_extra.sql
```

#### Step 2 — Configure environment variables

Create `backend/.env` with your credentials:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=remotesql
DB_USER=postgres
DB_PASSWORD=your_password_here
API_PORT=8000
API_KEY=remotesql-dev-2026-edu
```

#### Step 3 — Install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

#### Step 4 — Start the API

```bash
python main.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

#### Step 5 — Open the frontend

Open `frontend/index.html` in your browser. Enter the API key from your `.env` in the topbar and click **Save**.

> If you run into CORS issues opening the file directly, serve it with:
> ```bash
> cd frontend && python -m http.server 3000
> ```
> Then visit `http://localhost:3000`.

---

## Using the Workbench

| Feature | How to use |
|---------|-----------|
| **Run a query** | Type SQL in the editor, press **Execute** or `Ctrl+Enter` |
| **Browse tables** | Schema Explorer on the left — double-click a table to auto-fill a SELECT |
| **Save a script** | Click **Save**, enter a name, press Enter — appears in the **Saved** tab |
| **Load past query** | Click any entry in the **History** tab |
| **Export results** | Click **↓ Export CSV** after a SELECT |

---

## Example Queries

```sql
-- All users
SELECT * FROM users;

-- Transactions with JOIN across 4 tables
SELECT t.id, u.first_name, c.name AS category, t.amount, t.type, t.created_at
FROM transactions t
JOIN user_accounts ua ON ua.id = t.account_id
JOIN users u           ON u.id  = ua.user_id
JOIN categories c      ON c.id  = t.category_id
ORDER BY t.created_at DESC;

-- Net cash flow per account (CTE)
WITH flow AS (
    SELECT
        t.account_id,
        SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END) AS total_in,
        SUM(CASE WHEN t.type = 'debit'  THEN t.amount ELSE 0 END) AS total_out,
        COUNT(t.id) AS tx_count
    FROM transactions t
    GROUP BY t.account_id
)
SELECT
    u.first_name || ' ' || u.last_name AS customer,
    p.name                              AS product,
    ua.account_number,
    ua.balance,
    f.total_in,
    f.total_out,
    f.total_in - f.total_out            AS net_flow,
    f.tx_count
FROM flow f
JOIN user_accounts ua ON ua.id = f.account_id
JOIN users u           ON u.id = ua.user_id
JOIN products p        ON p.id = ua.product_id
ORDER BY net_flow DESC;

-- Customers above average balance with last transaction date (2 CTEs + CROSS JOIN)
WITH avg_bal AS (
    SELECT AVG(balance) AS overall_avg FROM user_accounts
),
last_tx AS (
    SELECT account_id, MAX(created_at) AS last_activity
    FROM transactions
    GROUP BY account_id
)
SELECT
    u.first_name || ' ' || u.last_name          AS customer,
    u.email,
    p.type                                       AS product_type,
    ua.account_number,
    ua.balance,
    ROUND((ua.balance - a.overall_avg)::numeric, 2) AS above_avg_by,
    lt.last_activity
FROM user_accounts ua
JOIN users u    ON u.id  = ua.user_id
JOIN products p ON p.id  = ua.product_id
LEFT JOIN last_tx lt ON lt.account_id = ua.id
CROSS JOIN avg_bal a
WHERE ua.balance > a.overall_avg
ORDER BY ua.balance DESC;
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/api/health` | No | Liveness check |
| `GET` | `/api/schema` | Yes | All tables and columns |
| `POST` | `/api/query` | Yes | Execute a SQL statement |

All protected endpoints require the `X-API-Key` header.

**Request:**
```json
{ "query": "SELECT * FROM users LIMIT 5;" }
```

**Success:**
```json
{
  "type": "select",
  "columns": ["id", "email", "first_name"],
  "rows": [[1, "ana.garcia@mail.com", "Ana"]],
  "row_count": 1
}
```

**Error:**
```json
{
  "error": "Query rejected by security filter.",
  "detail": "Statement type 'DROP' is not permitted."
}
```

---

## Security

Every query passes through a pipeline before touching the database:

1. **API Key check** — `X-API-Key` header must match the server's `API_KEY` env var. Returns `401` if wrong.
2. **Rate limiting** — `POST /api/query` capped at 30 req/min, `GET /api/schema` at 60 req/min. Returns `429` if exceeded.
3. **SQL Validator** — strips comments, checks the statement type against a whitelist (`SELECT`, `INSERT`, `UPDATE`, `WITH`), scans for blocked keywords, rejects stacked statements, and enforces a 4,000-character limit.
4. **Execution** — runs inside a `try/except` with automatic rollback on error. Only a sanitized message is returned to the client — no stack traces.

**Blocked keywords:** `DROP`, `DELETE`, `TRUNCATE`, `ALTER`, `CREATE`, `COPY`, `EXEC`, `EXECUTE`, `SLEEP`, `PG_SLEEP`, and others.

---

## Database Schema

Five tables in Third Normal Form (3NF):

```
users ──────────< user_accounts >────────── products
                       │
                  transactions >──────────── categories
```

| Table | Rows | Purpose |
|-------|:----:|---------|
| `users` | 20 | Customer profiles |
| `categories` | 10 | Transaction category lookup |
| `products` | 5 | Financial products (savings, checking, credit, loan, investment) |
| `user_accounts` | 34 | Links users to products; holds balance |
| `transactions` | 92 | Financial movements |

---

## Changelog

### v2.0.0 — 2026-04-16
- Added API key authentication (`X-API-Key` header) and rate limiting.
- SQL syntax highlighting in the editor (CodeMirror 5).
- Client-side pagination (50 rows/page) and execution time in results toolbar.
- Saved Scripts panel — name and persist queries in localStorage.
- Docker Compose support for one-command deployment.
- Extended seed data (20 users, 34 accounts, 92 transactions).

### v1.0.0 — 2026-04-14
- Initial build. All three phases (DB, API, Frontend) complete and functional.
- 5-table schema in 3NF with realistic fintech mock data.
- Security layer with whitelist/blocklist and comment stripping.
- Dark workbench UI with schema explorer, history, and CSV export.
