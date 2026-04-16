# Remote SQL Architect and Explorer

**Authors:** Eduardo Martinez · Raschid Llamas
**Course:** Aprendizaje Automático para Grandes Volúmenes de Datos
**Professor:** Dr. Juan Carlos López Pimentel — Universidad Panamericana

---

## What is this?

A custom SQL workbench that lets you run raw SQL against a remote PostgreSQL database through a secured REST API: no heavy clients like DBeaver or pgAdmin needed. You type SQL in the browser, hit Execute, and get results back as a table.

Think of it as a lightweight version of a database IDE, built from scratch.

---

## Project Structure

```
RemoteSQL/
├── backend/
│   ├── main.py          ← FastAPI app (routes, CORS, logging)
│   ├── security.py      ← Query validator (whitelist + blocklist)
│   ├── database.py      ← psycopg2 connection & result serialization
│   └── requirements.txt
│
├── database/
│   ├── schema.sql       ← CREATE TABLE statements (5 tables, 3NF)
│   └── seed.sql         ← Mock data (12 users, 10 categories, 15 transactions…)
│
├── frontend/
│   ├── index.html       ← Workbench layout
│   ├── styles.css       ← Dark IDE theme
│   └── app.js           ← All frontend logic (fetch, render, history, export)
│
└── README.md
```

---

## Guides

Detailed step-by-step instructions are in the `/guides` folder:

- [guides/postgres-setup.md](guides/postgres-setup.md) — Download, install, and configure PostgreSQL on Windows 11

---

## How to Run (Step by Step)

### Prerequisites

- PostgreSQL installed and running locally (or remote)
- Python 3.10+
- A browser (Chrome/Firefox/Edge)

---

### Step 1 — Create the database

Open a terminal and run:

```bash
createdb remotesql
```

Then load the schema and seed data:

```bash
psql -d remotesql -f database/schema.sql
psql -d remotesql -f database/seed.sql
```

You should see the tables created and rows inserted with no errors.

> **Tip:** If `createdb` isn't on your PATH, use `psql -U postgres -c "CREATE DATABASE remotesql;"` instead.

---

### Step 2 — Configure environment variables

Open `.env` and fill in your PostgreSQL credentials:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=remotesql
DB_USER=postgres
DB_PASSWORD=your_password_here
API_PORT=8000
```

---

### Step 3 — Install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

---

### Step 4 — Start the API

```bash
python main.py
```

You should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

- API is live at `http://localhost:8000`
- Auto-generated Swagger docs at `http://localhost:8000/docs`

---

### Step 5 — Open the frontend

Just open `frontend/index.html` in your browser. No build step needed.

If you run into CORS issues serving it directly from the filesystem, spin up a tiny server:

```bash
cd frontend
python -m http.server 3000
```

Then visit `http://localhost:3000`.

---

### Quick test queries

Once everything is running, try these in the workbench:

```sql
-- See all users
SELECT * FROM users;

-- Transactions with category names (JOIN)
SELECT t.id, u.first_name, c.name AS category, t.amount, t.type, t.created_at
FROM transactions t
JOIN user_accounts ua ON ua.id = t.account_id
JOIN users u ON u.id = ua.user_id
JOIN categories c ON c.id = t.category_id
ORDER BY t.created_at DESC;

-- Total balance per user
SELECT u.first_name, u.last_name, SUM(ua.balance) AS total_balance
FROM users u
JOIN user_accounts ua ON ua.user_id = u.id
GROUP BY u.id
ORDER BY total_balance DESC;
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check if the API is alive |
| GET | `/api/schema` | Returns all tables and columns |
| POST | `/api/query` | Execute a SQL query |

**POST `/api/query` body:**
```json
{ "query": "SELECT * FROM users LIMIT 5;" }
```

**Success response:**
```json
{
  "type": "select",
  "columns": ["id", "email", "first_name"],
  "rows": [[1, "ana.garcia@mail.com", "Ana"]],
  "row_count": 1
}
```

**Error response:**
```json
{
  "error": "Query rejected by security filter.",
  "detail": "Statement type 'DROP' is not permitted."
}
```

---

## Security Rules

The API blocks anything dangerous before it reaches the database.

**Allowed statement types:** `SELECT`, `INSERT`, `UPDATE`, `WITH`

**Blocked keywords (anywhere in the query):**

| Keyword | Why |
|---------|-----|
| `DROP` | Would delete tables permanently |
| `DELETE` | Can wipe all rows without WHERE |
| `TRUNCATE` | Same as DELETE without control |
| `ALTER` | Modifies schema structure |
| `CREATE` | Prevents unauthorized table creation |
| `COPY` | Can read/write OS files in PostgreSQL |
| `SLEEP` / `PG_SLEEP` | Time-based injection attacks |
| `EXEC` / `EXECUTE` | Stored procedure abuse |

**Other protections:**
- Multiple statements separated by `;` are rejected
- SQL comments (`--`, `/* */`) are stripped before any check
- Max query length: 4,000 characters

---

## Roadmap

### Done ✓

- [x] Database schema (3NF, 5 tables with FK relationships)
- [x] Seed data (12 users, 10 categories, 5 products, 14 accounts, 15 transactions)
- [x] FastAPI backend with 3 endpoints
- [x] Query security layer (whitelist + blocklist + comment stripping)
- [x] Error handling (DB errors, network errors, validation errors)
- [x] Frontend workbench (dark IDE theme)
- [x] Schema explorer sidebar (expandable, double-click to query)
- [x] Query history panel (click to reload a past query)
- [x] CSV export for SELECT results
- [x] Ctrl+Enter keyboard shortcut
- [x] API health indicator (auto-refreshes every 30s)

### Done ✓ (continued)

- [x] ERD diagram → `docs/ERD.pdf` (generated by `generate_erd.py`)
- [x] Architecture diagram → `docs/Architecture.pdf` (generated by `generate_arch.py`)
- [x] API key auth (`X-API-Key` header) + rate limiting (slowapi)
- [x] Query execution time in results toolbar
- [x] Client-side pagination (50 rows/page)
- [x] Docker Compose (`docker-compose.yml` + `backend/Dockerfile`)

- [x] Query syntax highlighting (CodeMirror 5, SQL mode, dracula theme)
- [ ] Query syntax highlighting in the editor

### Nice to Have 💡

- [ ] Dark/light theme toggle
- [ ] Save named queries (localStorage)
- [ ] Table row count badges in the schema explorer
- [ ] Keyboard shortcut cheatsheet modal

---

## Known Issues

- If the API is not running, the schema sidebar shows "Failed to load schema" — this is expected. Start the backend first.
- `UPDATE` queries are allowed but there's no row-level confirmation dialog yet. Be careful.
- The frontend must be on the same machine as the browser (API is hardcoded to `localhost:8000`). Change `API_BASE` in `app.js` for remote deployments.

---

## Changelog

### v1.0.0 — 2026-04-14
- Initial build. All three phases (DB, API, Frontend) complete and functional.
- 5-table schema in 3NF with realistic fintech mock data.
- Security layer with whitelist/blocklist and comment-stripping.
- Dark workbench UI with schema explorer, history, and CSV export.
