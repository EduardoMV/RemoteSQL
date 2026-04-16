# PostgreSQL Setup Guide
### For Windows 11 — RemoteSQL Project

---

## 1. Download PostgreSQL

Go to the official download page:
**https://www.enterprisedb.com/downloads/postgres-postgresql-downloads**

- Pick **PostgreSQL 16** (latest stable)
- Select **Windows x86-64**
- Click Download — you'll get an `.exe` installer (~300 MB)

> This is the official installer made by EDB (Enterprise DB), the company that maintains PostgreSQL for Windows. It's the standard way to install it on Windows.

---

## 2. Run the Installer

Double-click the `.exe` and follow these steps:

| Screen | What to do |
|--------|-----------|
| Installation Directory | Leave default: `C:\Program Files\PostgreSQL\16` |
| Select Components | Keep all checked (Server, pgAdmin 4, Stack Builder, Command Line Tools) |
| Data Directory | Leave default |
| **Password** |
| Port | Leave `5432` (default) |
| Locale | Leave default |

---

## 3. Verify the Installation

Open a new terminal (Command Prompt or PowerShell) and run:

```bash
psql --version
```

You should see something like:
```
psql (PostgreSQL) 16.x
```

If you get `'psql' is not recognized`, PostgreSQL's bin folder isn't in your PATH. Fix it:

1. Search for "Environment Variables" in the Start menu
2. Click "Environment Variables…"
3. Under **System variables**, find `Path` and click Edit
4. Click New and add: `C:\Program Files\PostgreSQL\16\bin`
5. Click OK and restart your terminal

---

## 4. Your Credentials

After installation your credentials are:

| Setting | Value |
|---------|-------|
| Host | `localhost` |
| Port | `5432` |
| Username | `postgres` |
| Password | *(the one you set during install)* |
| Database | `remotesql` *(you'll create this)* |

These go directly into `backend/.env`:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=remotesql
DB_USER=postgres
DB_PASSWORD=the_password_you_set
API_PORT=8000
```

---

## 5. Connect to PostgreSQL

Open a terminal and connect:

```bash
psql -U postgres
```

It will ask for your password. Type it and press Enter (the cursor won't move — that's normal).

You'll land in the PostgreSQL prompt:
```
postgres=#
```

Type `\q` to exit anytime.

---

## 6. Create the Project Database

While connected (at `postgres=#`), run:

```sql
CREATE DATABASE remotesql;
```

Then verify it was created:
```sql
\l
```

You should see `remotesql` in the list. Exit with `\q`.

---

## 7. Load the Schema and Seed Data

From the root of the project folder, run these two commands one at a time:

```bash
psql -U postgres -d remotesql -f database/schema.sql
```

```bash
psql -U postgres -d remotesql -f database/seed.sql
```

Each will prompt for your password. After both run you should see output ending with something like:
```
INSERT 0 12
INSERT 0 10
INSERT 0 5
...
```

---

## 8. Verify the Data Loaded

Connect directly to the project database:

```bash
psql -U postgres -d remotesql
```

Then run a quick check:

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM transactions;
\dt
```

`\dt` lists all tables. You should see: `categories`, `products`, `transactions`, `user_accounts`, `users`.

Exit with `\q`.

---

## 9. Using pgAdmin (Optional — Visual Interface)

PostgreSQL installs **pgAdmin 4** alongside it — a full visual database manager.

1. Search for **pgAdmin 4** in the Start menu and open it
2. It opens in your browser at `http://localhost:port`
3. In the left panel: **Servers → PostgreSQL 16 → Databases → remotesql**
4. Right-click any table → **View/Edit Data → All Rows** to browse data visually
5. Use the **Query Tool** (toolbar icon) to run SQL manually

pgAdmin is useful for visually confirming your tables look right before running the API.

---

## 10. Common Errors and Fixes

**`FATAL: password authentication failed for user "postgres"`**
→ You mistyped the password. Try again, or reset it:
```bash
psql -U postgres
# At the postgres=# prompt:
ALTER USER postgres WITH PASSWORD 'new_password';
```

**`could not connect to server: Connection refused`**
→ PostgreSQL isn't running. Open **Services** (search in Start menu), find **postgresql-x64-16**, right-click → Start.

**`psql: command not found`**
→ PATH isn't set. Follow step 3 above.

**`database "remotesql" does not exist`**
→ You skipped step 6. Create it first, then load the SQL files.

**`ERROR: relation "users" already exists`**
→ You already ran `schema.sql`. The `DROP TABLE IF EXISTS` at the top handles this — re-run it and it will reset cleanly.

---

## Quick Reference Card

```bash
# Start psql
psql -U postgres

# Connect to a specific database
psql -U postgres -d remotesql

# Run a .sql file
psql -U postgres -d remotesql -f path/to/file.sql

# Inside psql:
\l          → list databases
\dt         → list tables in current DB
\d users    → describe the users table
\q          → quit
```
