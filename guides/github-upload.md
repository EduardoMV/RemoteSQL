# GitHub Upload Guide
### Pushing the RemoteSQL Project for the First Time

---

## Prerequisites

- A GitHub account (https://github.com) — create one if you don't have it
- Git installed on your machine

**Check if Git is installed:**
```bash
git --version
```

If not installed, download it from **https://git-scm.com/download/win** and run the installer (all defaults are fine).

---

## 1. Create the Repository on GitHub

1. Go to **https://github.com/new**
2. Fill in:
   - **Repository name:** `remote-sql-workbench` (or whatever you want)
   - **Description:** `Remote SQL Architect and Explorer — UP Aprendizaje Automático`
   - **Visibility:** Private (since this is academic work — switch to Public only if you want it public)
   - **Do NOT check** "Add a README file" — you already have one
3. Click **Create repository**
4. GitHub will show you a page with setup commands — keep this page open

---

## 2. Create a .gitignore File

Before uploading anything, you need to tell Git which files to **never** commit.

Create the file at the root of the project:

**File: `RemoteSQL/.gitignore`**
```
# Python
__pycache__/
*.pyc
*.pyo
.venv/
venv/
env/

# Environment — NEVER commit this, it has your DB password
backend/.env

# OS junk
.DS_Store
Thumbs.db

# Editor folders
.vscode/
.idea/
```

> **Critical:** The `backend/.env` file contains your database password. If you accidentally push it to a public repo, change your password immediately.

---

## 3. Initialize Git in the Project

Open a terminal, navigate to the project root, and run these commands one at a time:

```bash
cd c:/Users/eduum/Documents/UP/Especialidad/AprendizajeAuto/RemoteSQL
```

```bash
git init
```

You should see: `Initialized empty Git repository in .../RemoteSQL/.git/`

---

## 4. Configure Your Identity (First Time Only)

Git needs to know who you are for commit authorship:

```bash
git config --global user.name "Eduardo Martinez"
git config --global user.email "your_email@example.com"
```

Use the same email as your GitHub account.

---

## 5. Stage All Files

```bash
git add .
```

This stages everything except what's in `.gitignore`. Verify what's about to be committed:

```bash
git status
```

You should see green files listed. Confirm that `backend/.env` is **NOT** in the list (it should be ignored). If it appears, stop and double-check your `.gitignore`.

---

## 6. Make the First Commit

```bash
git commit -m "Initial commit: database schema, FastAPI backend, workbench frontend"
```

You should see output like:
```
[main (root-commit) abc1234] Initial commit: ...
 10 files changed, 800 insertions(+)
```

---

## 7. Link to GitHub and Push

Go back to the GitHub page from Step 1. Copy the repository URL — it looks like:
```
https://github.com/your-username/remote-sql-workbench.git
```

Then run:

```bash
git remote add origin https://github.com/your-username/remote-sql-workbench.git
git branch -M main
git push -u origin main
```

Git will ask for your GitHub credentials:
- **Username:** your GitHub username
- **Password:** **not** your GitHub password — use a Personal Access Token (see next step)

---

## 8. Create a Personal Access Token (GitHub Password Alternative)

GitHub no longer accepts account passwords for Git push. You need a token.

1. Go to **https://github.com/settings/tokens/new** (Settings → Developer settings → Personal access tokens → Tokens classic)
2. Give it a name: `RemoteSQL project`
3. Expiration: 90 days (or No expiration for a school project)
4. Under **Scopes**, check **`repo`** (full control of private repositories)
5. Click **Generate token**
6. **Copy it immediately** — GitHub will never show it again

When Git asks for your password during `git push`, paste this token instead.

> **Tip:** To avoid typing it every time, run:
> ```bash
> git config --global credential.helper store
> ```
> The next push will save it and you won't be asked again on this machine.

---

## 9. Verify It Worked

Refresh your GitHub repository page. You should see all your files there:

```
remote-sql-workbench/
├── backend/
├── database/
├── frontend/
├── guides/
├── README.md
└── .gitignore
```

---

## 10. Pushing Future Changes

Every time you make changes and want to save them to GitHub:

```bash
# Stage only the files you changed (preferred)
git add backend/main.py frontend/app.js

# Or stage everything
git add .

# Commit with a descriptive message
git commit -m "Add pagination to results table"

# Push
git push
```

You don't need `-u origin main` after the first push — just `git push` is enough.

---

## Recommended Commit Message Style

Keep messages short and descriptive. Use the imperative tense ("Add", "Fix", "Update", not "Added" or "Adding"):

```bash
git commit -m "Add CSV export to workbench frontend"
git commit -m "Fix SLEEP keyword not being blocked in security layer"
git commit -m "Update seed data with more transaction rows"
git commit -m "Add Docker Compose setup"
```

---

## Collaborating with Raschid

To give Raschid access to the repository:

1. Go to the repo on GitHub → **Settings → Collaborators**
2. Click **Add people** and search for Raschid's GitHub username
3. He'll receive an email invitation — once he accepts, he can clone and push

**Raschid clones the repo:**
```bash
git clone https://github.com/your-username/remote-sql-workbench.git
cd remote-sql-workbench
```

**To pull each other's latest changes:**
```bash
git pull
```

---

## Common Errors and Fixes

**`remote: Support for password authentication was removed`**
→ Use a Personal Access Token instead of your password (Step 8).

**`error: failed to push some refs`**
→ Someone else pushed before you. Run `git pull` first, then `git push`.

**`fatal: not a git repository`**
→ You're in the wrong folder. Make sure you're inside `RemoteSQL/` when running git commands.

**Accidentally committed `.env`**
```bash
git rm --cached backend/.env
git commit -m "Remove .env from tracking"
git push
```
Then change your database password since it was exposed.

---

## Quick Reference Card

```bash
git status              → see what changed
git add .               → stage all changes
git add filename        → stage one file
git commit -m "msg"     → save a snapshot
git push                → upload to GitHub
git pull                → download latest from GitHub
git log --oneline       → see commit history
git diff                → see unstaged changes
```
