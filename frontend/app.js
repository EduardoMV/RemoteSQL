/**
 * app.js — Remote SQL Workbench frontend logic
 * Authors: Eduardo Martinez, Raschid Llamas
 *
 * Responsibilities:
 *   1. Check API health on load and update the connection indicator.
 *   2. Load the schema explorer from GET /api/schema.
 *   3. Send queries to POST /api/query and render results.
 *   4. Maintain a client-side query history.
 *   5. Provide CSV export for SELECT results.
 */

"use strict";

// ─── Configuration ────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:8000/api";

// ─── DOM references ───────────────────────────────────────────────────────────
const sqlInput          = document.getElementById("sql-input");
const btnExecute        = document.getElementById("btn-execute");
const btnClear          = document.getElementById("btn-clear");
const btnFormat         = document.getElementById("btn-format");
const btnSave           = document.getElementById("btn-save");
const saveDialog        = document.getElementById("save-dialog");
const saveNameInput     = document.getElementById("save-name-input");
const btnSaveConfirm    = document.getElementById("btn-save-confirm");
const btnSaveCancel     = document.getElementById("btn-save-cancel");
const btnExport         = document.getElementById("btn-export");
const btnRefreshSchema  = document.getElementById("btn-refresh-schema");
const statusBar         = document.getElementById("status-bar");
const statusIcon        = document.getElementById("status-icon");
const statusMessage     = document.getElementById("status-message");
const statusMeta        = document.getElementById("status-meta");
const resultsContainer  = document.getElementById("results-container");
const resultsCount      = document.getElementById("results-count");
const resultsTime       = document.getElementById("results-time");
const paginationBar     = document.getElementById("pagination-bar");
const pageLabel         = document.getElementById("page-label");
const btnPrevPage       = document.getElementById("btn-prev-page");
const btnNextPage       = document.getElementById("btn-next-page");
const schemaTree        = document.getElementById("schema-tree");
const historyList       = document.getElementById("history-list");
const savedList         = document.getElementById("saved-list");
const tabHistory        = document.getElementById("tab-history");
const tabSaved          = document.getElementById("tab-saved");
const btnClearHistory   = document.getElementById("btn-clear-history");
const loadingOverlay    = document.getElementById("loading-overlay");
const connectionStatus  = document.getElementById("connection-status");
const connectionLabel   = document.getElementById("connection-label");

// ─── CodeMirror editor ────────────────────────────────────────────────────────
const editor = CodeMirror.fromTextArea(sqlInput, {
  mode:           "text/x-sql",
  theme:          "dracula",
  lineNumbers:    true,
  indentWithTabs: false,
  tabSize:        2,
  placeholder:    "-- Type your SQL query here\nSELECT * FROM users LIMIT 10;",
  extraKeys: {
    "Ctrl-Enter": executeQuery,
    "Cmd-Enter":  executeQuery,
  },
});

// ─── State ───────────────────────────────────────────────────────────────────
let queryHistory     = [];      // Array of { sql, status, rowCount, timestamp }
let lastSelectResult = null;    // Last SELECT result (for CSV export)

// Pagination
const PAGE_SIZE      = 50;
let paginatedColumns = [];
let paginatedRows    = [];
let currentPage      = 0;

// ─── API Key helpers ──────────────────────────────────────────────────────────
const KEY_STORAGE = "remotesql_api_key";

function getApiKey() {
  return localStorage.getItem(KEY_STORAGE) || "";
}

function authHeaders() {
  const key = getApiKey();
  return key ? { "Content-Type": "application/json", "X-API-Key": key }
             : { "Content-Type": "application/json" };
}

function updateKeyIndicator() {
  const keyIcon  = document.getElementById("key-icon");
  const keyInput = document.getElementById("api-key-input");
  const saved    = getApiKey();
  if (keyInput) keyInput.value = saved;
  if (keyIcon)  keyIcon.className = saved ? "key-icon set" : "key-icon unset";
}

// ─── Saved Scripts ───────────────────────────────────────────────────────────
const SAVES_KEY = "remotesql_saved_scripts";

function getSaved() {
  try { return JSON.parse(localStorage.getItem(SAVES_KEY) || "[]"); }
  catch { return []; }
}
function setSaved(scripts) {
  localStorage.setItem(SAVES_KEY, JSON.stringify(scripts));
}

function showHistoryTab() {
  tabHistory.classList.add("active");
  tabSaved.classList.remove("active");
  historyList.classList.remove("hidden");
  savedList.classList.add("hidden");
  btnClearHistory.style.display = "";
}

function showSavedTab() {
  tabSaved.classList.add("active");
  tabHistory.classList.remove("active");
  savedList.classList.remove("hidden");
  historyList.classList.add("hidden");
  btnClearHistory.style.display = "none";
}

function renderSaved() {
  const scripts = getSaved();
  if (scripts.length === 0) {
    savedList.innerHTML = '<p class="sidebar-hint">No saved scripts yet.<br>Write a query and click &#128190; Save.</p>';
    return;
  }
  savedList.innerHTML = "";
  for (const script of scripts) {
    const item = document.createElement("div");
    item.className = "saved-item";
    item.innerHTML = `
      <div class="saved-item-header">
        <span class="saved-item-name">${escapeHtml(script.name)}</span>
        <button class="btn-icon saved-item-del" title="Delete script">&#10005;</button>
      </div>
      <div class="saved-item-sql">${escapeHtml(script.sql)}</div>
      <div class="saved-item-meta">${escapeHtml(script.savedAt)}</div>`;
    item.querySelector(".saved-item-del").addEventListener("click", (e) => {
      e.stopPropagation();
      setSaved(getSaved().filter(s => s.id !== script.id));
      renderSaved();
    });
    item.addEventListener("click", () => {
      editor.setValue(script.sql);
      editor.focus();
    });
    savedList.appendChild(item);
  }
}

function openSaveDialog() {
  saveDialog.classList.remove("hidden");
  saveNameInput.value = "";
  saveNameInput.focus();
}

function closeSaveDialog() {
  saveDialog.classList.add("hidden");
}

function commitSave() {
  const name = saveNameInput.value.trim();
  const sql  = editor.getValue().trim();
  if (!name || !sql) return;
  const scripts = getSaved();
  scripts.unshift({ id: Date.now(), name, sql, savedAt: new Date().toLocaleString() });
  setSaved(scripts);
  renderSaved();
  closeSaveDialog();
  showSavedTab();
}

// ─── 1. API Health Check ──────────────────────────────────────────────────────
async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      connectionStatus.className = "status-dot connected";
      connectionLabel.textContent = "Connected";
    } else {
      throw new Error("Non-OK response");
    }
  } catch {
    connectionStatus.className = "status-dot disconnected";
    connectionLabel.textContent = "Disconnected";
  }
}

// ─── 2. Schema Explorer ───────────────────────────────────────────────────────
async function loadSchema() {
  schemaTree.innerHTML = '<p class="sidebar-hint">Loading…</p>';
  try {
    const res  = await fetch(`${API_BASE}/schema`, { headers: authHeaders() });
    if (res.status === 401) {
      schemaTree.innerHTML = '<p class="sidebar-hint" style="color:var(--accent-red)">API key required — set it in the topbar.</p>';
      return;
    }
    const data = await res.json();

    if (!data.columns || !data.rows) {
      schemaTree.innerHTML = '<p class="sidebar-hint">No tables found.</p>';
      return;
    }

    // Group rows by table name
    const colIdx    = data.columns.indexOf("column_name");
    const tableIdx  = data.columns.indexOf("table_name");
    const typeIdx   = data.columns.indexOf("data_type");
    const tables    = {};

    for (const row of data.rows) {
      const tbl = row[tableIdx];
      if (!tables[tbl]) tables[tbl] = [];
      tables[tbl].push({ name: row[colIdx], type: row[typeIdx] });
    }

    // Build DOM
    schemaTree.innerHTML = "";
    for (const [tableName, columns] of Object.entries(tables)) {
      const item = document.createElement("div");
      item.className = "schema-table";

      const header = document.createElement("div");
      header.className = "schema-table-name";
      header.innerHTML = `
        <span class="arrow">▶</span>
        <span class="schema-table-icon">▦</span>
        <span>${tableName}</span>
      `;

      const colList = document.createElement("div");
      colList.className = "schema-columns";

      for (const col of columns) {
        const colEl = document.createElement("div");
        colEl.className = "schema-col";
        colEl.innerHTML = `<span class="col-name">${col.name}</span><span class="col-type" title="${col.type}">${abbreviateType(col.type)}</span>`;
        colList.appendChild(colEl);
      }

      // Toggle expand/collapse
      header.addEventListener("click", () => {
        const isOpen = colList.classList.toggle("visible");
        header.classList.toggle("open", isOpen);
      });

      // Double-click inserts a SELECT snippet into the editor
      header.addEventListener("dblclick", () => {
        editor.setValue(`SELECT * FROM ${tableName} LIMIT 20;`);
        editor.focus();
      });

      item.appendChild(header);
      item.appendChild(colList);
      schemaTree.appendChild(item);
    }
  } catch {
    schemaTree.innerHTML = '<p class="sidebar-hint">Failed to load schema.</p>';
  }
}

// ─── 3. Execute Query ─────────────────────────────────────────────────────────
async function executeQuery() {
  const sql = editor.getValue().trim();
  if (!sql) {
    showStatus("error", "✕", "Please enter a SQL query.", "");
    return;
  }

  setLoading(true);
  hideStatus();
  resultsContainer.innerHTML = "";
  resultsCount.textContent   = "";
  btnExport.style.display    = "none";
  lastSelectResult           = null;

  const startTime = Date.now();

  try {
    const res  = await fetch(`${API_BASE}/query`, {
      method:  "POST",
      headers: authHeaders(),
      body:    JSON.stringify({ query: sql }),
    });

    const data     = await res.json();
    const elapsed  = ((Date.now() - startTime) / 1000).toFixed(3);

    if (res.status === 401) {
      showStatus("error", "✕", "Unauthorized.", `Set a valid API key in the topbar. (${elapsed}s)`);
      renderError("Unauthorized", "API key is missing or incorrect. Enter it in the topbar and save.");
      pushHistory(sql, "err", null);
      return;
    }

    if (res.status === 429) {
      showStatus("error", "✕", "Rate limit exceeded.", `Too many requests — wait a moment. (${elapsed}s)`);
      renderError("Rate Limit", "Too many requests. Please wait before executing another query.");
      pushHistory(sql, "err", null);
      return;
    }

    if (!res.ok) {
      // API returned 400 or 500
      const detail = data.detail || data.error || "Unknown error.";
      showStatus("error", "✕", data.error || "Query failed.", detail + ` (${elapsed}s)`);
      renderError(data.error, detail);
      pushHistory(sql, "err", null);
      return;
    }

    if (data.type === "select") {
      const rowCount = data.row_count ?? data.rows.length;
      showStatus(
        "success", "✓",
        `Query returned ${rowCount} row${rowCount !== 1 ? "s" : ""}.`,
        `${elapsed}s`
      );
      resultsCount.textContent = `${rowCount} row${rowCount !== 1 ? "s" : ""}`;
      resultsTime.textContent  = `${elapsed}s`;
      paginatedColumns = data.columns;
      paginatedRows    = data.rows;
      renderPage(0);
      lastSelectResult = data;
      if (rowCount > 0) btnExport.style.display = "";
      pushHistory(sql, "ok", rowCount);

    } else if (data.type === "write") {
      const affected = data.affected_rows;
      showStatus("success", "✓", `${affected} row${affected !== 1 ? "s" : ""} affected.`, `${elapsed}s`);
      resultsTime.textContent = `${elapsed}s`;
      clearPagination();
      renderWriteResult(affected);
      pushHistory(sql, "ok", affected);
    }

  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
    showStatus("error", "✕", "Network error — is the API running?", `${elapsed}s`);
    renderError("Network Error", err.message);
    pushHistory(sql, "err", null);
  } finally {
    setLoading(false);
  }
}

// ─── 4. Render helpers ────────────────────────────────────────────────────────
function renderTable(columns, rows) {
  if (rows.length === 0) {
    resultsContainer.innerHTML = `
      <div class="results-empty">
        <span class="empty-icon">◫</span>
        <p>Query returned 0 rows.</p>
      </div>`;
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "result-table-wrapper";

  const table = document.createElement("table");
  table.className = "result-table";

  // Header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const col of columns) {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const cell of row) {
      const td = document.createElement("td");
      if (cell === null || cell === undefined) {
        td.textContent = "NULL";
        td.classList.add("cell-null");
      } else {
        td.textContent = String(cell);
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrapper.appendChild(table);
  resultsContainer.innerHTML = "";
  resultsContainer.appendChild(wrapper);
}

function renderWriteResult(affected) {
  resultsContainer.innerHTML = `
    <div class="write-result">
      <span class="wr-icon">✓</span>
      <span class="wr-count">${affected} row${affected !== 1 ? "s" : ""} affected</span>
    </div>`;
}

function renderError(title, detail) {
  resultsContainer.innerHTML = `
    <div class="results-empty" style="color:var(--accent-red)">
      <span class="empty-icon">⚠</span>
      <p><strong>${escapeHtml(title)}</strong></p>
      <p style="font-family:var(--font-mono);font-size:11px;max-width:560px;text-align:center;
                color:var(--text-secondary);margin-top:4px">${escapeHtml(detail)}</p>
    </div>`;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function renderPage(page) {
  currentPage = page;
  const start     = page * PAGE_SIZE;
  const pageRows  = paginatedRows.slice(start, start + PAGE_SIZE);
  renderTable(paginatedColumns, pageRows);

  const totalPages = Math.ceil(paginatedRows.length / PAGE_SIZE);
  if (totalPages > 1) {
    paginationBar.classList.remove("hidden");
    pageLabel.textContent   = `${currentPage + 1} / ${totalPages}`;
    btnPrevPage.disabled    = currentPage === 0;
    btnNextPage.disabled    = currentPage >= totalPages - 1;
  } else {
    paginationBar.classList.add("hidden");
  }
}

function clearPagination() {
  paginatedColumns = [];
  paginatedRows    = [];
  currentPage      = 0;
  paginationBar.classList.add("hidden");
}

// ─── 5. Status bar ───────────────────────────────────────────────────────────
function showStatus(type, icon, message, meta) {
  statusBar.className = `status-bar ${type}`;
  statusIcon.textContent    = icon;
  statusMessage.textContent = message;
  statusMeta.textContent    = meta;
}

function hideStatus() {
  statusBar.className = "status-bar hidden";
}

// ─── 6. History ──────────────────────────────────────────────────────────────
function pushHistory(sql, status, count) {
  const entry = {
    sql,
    status,
    count,
    timestamp: new Date().toLocaleTimeString(),
  };
  queryHistory.unshift(entry);
  renderHistory();
}

function renderHistory() {
  if (queryHistory.length === 0) {
    historyList.innerHTML = '<p class="sidebar-hint">No queries yet.</p>';
    return;
  }
  historyList.innerHTML = "";
  for (const entry of queryHistory.slice(0, 30)) {
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <div class="history-item-sql">${escapeHtml(entry.sql)}</div>
      <div class="history-item-meta">
        <span class="history-badge ${entry.status}">${entry.status}</span>
        <span>${entry.timestamp}</span>
        ${entry.count !== null ? `<span style="margin-left:auto">${entry.count} rows</span>` : ""}
      </div>`;
    item.addEventListener("click", () => {
      editor.setValue(entry.sql);
      editor.focus();
    });
    historyList.appendChild(item);
  }
}

// ─── 7. CSV Export ───────────────────────────────────────────────────────────
function exportCSV() {
  if (!lastSelectResult) return;
  const { columns, rows } = lastSelectResult;

  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const csv = [
    columns.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `results_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── 8. Simple SQL formatter ─────────────────────────────────────────────────
function formatSQL() {
  const keywords = [
    "SELECT", "FROM", "WHERE", "JOIN", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN",
    "ON", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "OFFSET",
    "INSERT INTO", "VALUES", "UPDATE", "SET", "WITH",
  ];
  let sql = editor.getValue();
  for (const kw of keywords) {
    const re = new RegExp(`\\b${kw}\\b`, "gi");
    sql = sql.replace(re, `\n${kw}`);
  }
  editor.setValue(sql.trim());
}

// ─── Utilities ────────────────────────────────────────────────────────────────
const PG_TYPE_ALIASES = {
  "character varying":              "varchar",
  "timestamp without time zone":    "timestamp",
  "timestamp with time zone":       "timestamptz",
  "double precision":               "float8",
  "integer":                        "int",
  "bigint":                         "int8",
  "smallint":                       "int2",
  "boolean":                        "bool",
  "character":                      "char",
};

function abbreviateType(t) {
  const lower = t.toLowerCase();
  return PG_TYPE_ALIASES[lower] ?? t;
}

function setLoading(on) {
  loadingOverlay.classList.toggle("hidden", !on);
  btnExecute.disabled = on;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Event listeners ─────────────────────────────────────────────────────────
btnExecute.addEventListener("click", executeQuery);
btnClear.addEventListener("click", () => {
  editor.setValue("");
  hideStatus();
  resultsContainer.innerHTML = `
    <div class="results-empty">
      <span class="empty-icon">◫</span>
      <p>Execute a query to see results here.</p>
    </div>`;
  resultsCount.textContent = "";
  resultsTime.textContent  = "";
  btnExport.style.display  = "none";
  lastSelectResult = null;
  clearPagination();
  editor.focus();
});
btnFormat.addEventListener("click", formatSQL);
btnExport.addEventListener("click", exportCSV);
btnRefreshSchema.addEventListener("click", loadSchema);
btnClearHistory.addEventListener("click", () => {
  queryHistory = [];
  renderHistory();
});

// Save dialog
btnSave.addEventListener("click", () => {
  saveDialog.classList.contains("hidden") ? openSaveDialog() : closeSaveDialog();
});
btnSaveConfirm.addEventListener("click", commitSave);
btnSaveCancel.addEventListener("click", closeSaveDialog);
saveNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter")  commitSave();
  if (e.key === "Escape") closeSaveDialog();
});

// Panel tabs
tabHistory.addEventListener("click", showHistoryTab);
tabSaved.addEventListener("click", showSavedTab);

// Pagination
btnPrevPage.addEventListener("click", () => renderPage(currentPage - 1));
btnNextPage.addEventListener("click", () => renderPage(currentPage + 1));

// API key save
document.getElementById("btn-save-key").addEventListener("click", () => {
  const val = document.getElementById("api-key-input").value.trim();
  if (val) {
    localStorage.setItem(KEY_STORAGE, val);
  } else {
    localStorage.removeItem(KEY_STORAGE);
  }
  updateKeyIndicator();
  loadSchema();   // reload schema with the new key
});

// ─── Initialization ───────────────────────────────────────────────────────────
(async () => {
  updateKeyIndicator();
  renderSaved();
  await checkHealth();
  await loadSchema();
  // Periodically refresh health indicator every 30 seconds
  setInterval(checkHealth, 30_000);
})();
