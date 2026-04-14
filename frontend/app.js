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
const btnExport         = document.getElementById("btn-export");
const btnRefreshSchema  = document.getElementById("btn-refresh-schema");
const btnClearHistory   = document.getElementById("btn-clear-history");
const statusBar         = document.getElementById("status-bar");
const statusIcon        = document.getElementById("status-icon");
const statusMessage     = document.getElementById("status-message");
const statusMeta        = document.getElementById("status-meta");
const resultsContainer  = document.getElementById("results-container");
const resultsCount      = document.getElementById("results-count");
const schemaTree        = document.getElementById("schema-tree");
const historyList       = document.getElementById("history-list");
const loadingOverlay    = document.getElementById("loading-overlay");
const connectionStatus  = document.getElementById("connection-status");
const connectionLabel   = document.getElementById("connection-label");

// ─── State ───────────────────────────────────────────────────────────────────
let queryHistory = [];          // Array of { sql, status, rowCount, timestamp }
let lastSelectResult = null;    // Last SELECT result (for CSV export)

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
    const res  = await fetch(`${API_BASE}/schema`);
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
        colEl.innerHTML = `<span class="col-name">${col.name}</span><span class="col-type">${col.type}</span>`;
        colList.appendChild(colEl);
      }

      // Toggle expand/collapse
      header.addEventListener("click", () => {
        const isOpen = colList.classList.toggle("visible");
        header.classList.toggle("open", isOpen);
      });

      // Double-click inserts a SELECT snippet into the editor
      header.addEventListener("dblclick", () => {
        sqlInput.value = `SELECT * FROM ${tableName} LIMIT 20;`;
        sqlInput.focus();
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
  const sql = sqlInput.value.trim();
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
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ query: sql }),
    });

    const data     = await res.json();
    const elapsed  = ((Date.now() - startTime) / 1000).toFixed(3);

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
      resultsCount.textContent = `${rowCount} rows`;
      renderTable(data.columns, data.rows);
      lastSelectResult = data;
      if (rowCount > 0) btnExport.style.display = "";
      pushHistory(sql, "ok", rowCount);

    } else if (data.type === "write") {
      const affected = data.affected_rows;
      showStatus("success", "✓", `${affected} row${affected !== 1 ? "s" : ""} affected.`, `${elapsed}s`);
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
      sqlInput.value = entry.sql;
      sqlInput.focus();
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
  let sql = sqlInput.value;
  for (const kw of keywords) {
    const re = new RegExp(`\\b${kw}\\b`, "gi");
    sql = sql.replace(re, `\n${kw}`);
  }
  sqlInput.value = sql.trim();
}

// ─── Utilities ────────────────────────────────────────────────────────────────
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
  sqlInput.value = "";
  hideStatus();
  resultsContainer.innerHTML = `
    <div class="results-empty">
      <span class="empty-icon">◫</span>
      <p>Execute a query to see results here.</p>
    </div>`;
  resultsCount.textContent = "";
  btnExport.style.display  = "none";
  lastSelectResult = null;
  sqlInput.focus();
});
btnFormat.addEventListener("click", formatSQL);
btnExport.addEventListener("click", exportCSV);
btnRefreshSchema.addEventListener("click", loadSchema);
btnClearHistory.addEventListener("click", () => {
  queryHistory = [];
  renderHistory();
});

// Ctrl+Enter keyboard shortcut
sqlInput.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    executeQuery();
  }
});

// ─── Initialization ───────────────────────────────────────────────────────────
(async () => {
  await checkHealth();
  await loadSchema();
  // Periodically refresh health indicator every 30 seconds
  setInterval(checkHealth, 30_000);
})();
