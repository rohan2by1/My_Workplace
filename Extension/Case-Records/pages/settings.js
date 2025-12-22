import { send, fmt, fmtDuration } from '../utils.js';

let allData = { queue: [], history: [], caseTypes: [] };
let currentRange = { start: null, end: null };
let draggedItem = null;

// --- Utility Functions ---
function toDatetimeLocal(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getTimestampFilename() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

function downloadCsv(name, rows) {
  if (!rows.length) {
    alert("No data found for the selected range.");
    return;
  }
  const keys = Object.keys(rows[0]);
  const escape = v => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes("\n") || s.includes("\"")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const header = keys.join(",");
  const body = rows.map(r => keys.map(k => escape(r[k])).join(",")).join("\n");
  const csv = header + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadJson(name, data) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function inRange(ts) {
  if (!ts) return false;
  if (!currentRange.start && !currentRange.end) return true;
  
  const t = new Date(ts).getTime();
  if (isNaN(t)) return false;

  if (currentRange.start && t < currentRange.start) return false;
  if (currentRange.end && t > currentRange.end) return false;
  
  return true;
}

// --- Load Data ---
async function loadData() {
  const r = await send({ type: "GET_DATA" });
  allData = {
    queue: r.queue || [],
    history: r.history || [],
    caseTypes: r.caseTypes || []
  };
  
  renderCaseTypes();
  renderStatsSummary();
}

// --- Render Case Types List ---
function renderCaseTypes() {
  const container = document.getElementById("caseTypeList");
  container.innerHTML = "";
  
  if (allData.caseTypes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📋</div>
        <div>No case types yet. Add your first one above!</div>
      </div>
    `;
    return;
  }
  
  allData.caseTypes.forEach((name, i) => {
    const item = document.createElement("div");
    item.className = "case-type-item";
    item.draggable = true;
    item.dataset.index = i;
    
    item.innerHTML = `
      <span class="drag-handle" title="Drag to reorder">⠿</span>
      <span class="index">${i + 1}</span>
      <div class="name">
        <input type="text" value="${escapeHtml(name)}" data-original="${escapeHtml(name)}">
      </div>
      <div class="actions">
        <button class="btn btn-danger btn-icon" title="Remove">✕</button>
      </div>
    `;
    
    // Edit functionality
    const input = item.querySelector('input');
    input.addEventListener('blur', async () => {
      const newName = input.value.trim();
      const originalName = input.dataset.original;
      
      if (newName && newName !== originalName) {
        await send({ type: "RENAME_CASE_TYPE", oldName: originalName, newName });
        await loadData();
      } else {
        input.value = originalName;
      }
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      } else if (e.key === 'Escape') {
        input.value = input.dataset.original;
        input.blur();
      }
    });
    
    // Remove functionality
    item.querySelector('.btn-danger').addEventListener('click', async () => {
      if (confirm(`Remove "${name}" from case types?`)) {
        await send({ type: "REMOVE_CASE_TYPE", name });
        await loadData();
      }
    });
    
    // Drag and drop
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    
    container.appendChild(item);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Drag and Drop Handlers ---
function handleDragStart(e) {
  draggedItem = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('.case-type-item').forEach(item => {
    item.classList.remove('drag-over');
  });
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  const item = this;
  if (item !== draggedItem) {
    item.classList.add('drag-over');
  }
}

async function handleDrop(e) {
  e.preventDefault();
  
  const fromIndex = parseInt(draggedItem.dataset.index);
  const toIndex = parseInt(this.dataset.index);
  
  if (fromIndex !== toIndex) {
    // Reorder array
    const newOrder = [...allData.caseTypes];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    
    await send({ type: "REORDER_CASE_TYPES", order: newOrder });
    await loadData();
  }
  
  this.classList.remove('drag-over');
}

// --- Render Stats Summary ---
function renderStatsSummary() {
  const container = document.getElementById("statsSummary");
  
  const queueCount = allData.queue.length;
  const historyCount = allData.history.length;
  const typesCount = allData.caseTypes.length;
  
  container.innerHTML = `
    <div class="stat">
      <span class="stat-value" style="color: var(--primary)">${queueCount}</span>
      <span class="stat-label">In Queue</span>
    </div>
    <div class="stat">
      <span class="stat-value" style="color: var(--success)">${historyCount}</span>
      <span class="stat-label">Completed</span>
    </div>
    <div class="stat">
      <span class="stat-value" style="color: var(--warning)">${typesCount}</span>
      <span class="stat-label">Case Types</span>
    </div>
  `;
}

// --- Quick Range Selection ---
function setQuickRange(range) {
  const now = new Date();
  let start, end;
  
  document.querySelectorAll('.quick-btn').forEach(btn => btn.classList.remove('active'));
  
  switch(range) {
    case 'today':
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      end = now;
      break;
    case 'yesterday':
      start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start = new Date(now);
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      end = now;
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
      break;
    case 'all':
      currentRange = { start: null, end: null };
      document.getElementById("exportStart").value = "";
      document.getElementById("exportEnd").value = "";
      document.querySelector(`[data-range="${range}"]`)?.classList.add('active');
      return;
  }
  
  currentRange = { start: start.getTime(), end: end.getTime() };
  document.getElementById("exportStart").value = toDatetimeLocal(start);
  document.getElementById("exportEnd").value = toDatetimeLocal(end);
  document.querySelector(`[data-range="${range}"]`)?.classList.add('active');
}

// --- Event Listeners ---

// Add case type
document.getElementById("addType").addEventListener("click", async () => {
  const input = document.getElementById("typeName");
  const name = input.value.trim();
  
  if (!name) {
    input.focus();
    return;
  }
  
  if (allData.caseTypes.includes(name)) {
    alert("This case type already exists.");
    return;
  }
  
  await send({ type: "ADD_CASE_TYPE", name });
  input.value = "";
  input.focus();
  await loadData();
});

// Enter key to add type
document.getElementById("typeName").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    document.getElementById("addType").click();
  }
});

// Quick range buttons
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setQuickRange(btn.dataset.range);
  });
});

// Custom range change
document.getElementById("exportStart").addEventListener("change", () => {
  const startVal = document.getElementById("exportStart").value;
  const endVal = document.getElementById("exportEnd").value;
  
  if (startVal) {
    currentRange.start = new Date(startVal).getTime();
  }
  if (endVal) {
    currentRange.end = new Date(endVal).getTime();
  }
  
  document.querySelectorAll('.quick-btn').forEach(btn => btn.classList.remove('active'));
});

document.getElementById("exportEnd").addEventListener("change", () => {
  const startVal = document.getElementById("exportStart").value;
  const endVal = document.getElementById("exportEnd").value;
  
  if (startVal) {
    currentRange.start = new Date(startVal).getTime();
  }
  if (endVal) {
    currentRange.end = new Date(endVal).getTime();
  }
  
  document.querySelectorAll('.quick-btn').forEach(btn => btn.classList.remove('active'));
});

// Export Queue
document.getElementById("exportQueue").addEventListener("click", async () => {
  const filtered = allData.queue.filter(x => inRange(x.openedAt));
  
  const rows = filtered.map(x => ({
    "URL": x.url,
    "Case Type": x.caseType || "",
    "Opened": fmt(x.openedAt)
  }));
  
  downloadCsv(`Queue-${getTimestampFilename()}.csv`, rows);
});

// Export History
document.getElementById("exportHistory").addEventListener("click", async () => {
  const filtered = allData.history.filter(x => inRange(x.completedAt || x.openedAt));
  
  const rows = filtered.map(x => ({
    "URL": x.url,
    "Case Type": x.caseType || "",
    "Opened": fmt(x.openedAt),
    "Completed": fmt(x.completedAt),
    "Time Taken": fmtDuration(x.openedAt, x.completedAt)
  }));
  
  downloadCsv(`History-${getTimestampFilename()}.csv`, rows);
});

// Backup All
document.getElementById("backupAll").addEventListener("click", async () => {
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      queue: allData.queue,
      history: allData.history,
      caseTypes: allData.caseTypes
    }
  };
  
  downloadJson(`CaseTracker-Backup-${getTimestampFilename()}.json`, backup);
});

// Restore Backup
document.getElementById("restoreBackup").addEventListener("click", () => {
  document.getElementById("importFile").click();
});

document.getElementById("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const backup = JSON.parse(text);
    
    if (!backup.data) {
      alert("Invalid backup file format.");
      return;
    }
    
    const confirmMsg = `This will replace all your current data with the backup from ${new Date(backup.exportedAt).toLocaleString()}.\n\nAre you sure?`;
    
    if (confirm(confirmMsg)) {
      await send({ type: "RESTORE_BACKUP", data: backup.data });
      await loadData();
      alert("Backup restored successfully!");
    }
  } catch (err) {
    alert("Failed to read backup file. Please make sure it's a valid JSON file.");
    console.error(err);
  }
  
  // Reset file input
  e.target.value = "";
});

// Clear Queue
document.getElementById("clearQueue").addEventListener("click", async () => {
  if (allData.queue.length === 0) {
    alert("Queue is already empty.");
    return;
  }
  
  if (confirm(`This will permanently delete ${allData.queue.length} pending cases. Are you sure?`)) {
    await send({ type: "CLEAR_QUEUE" });
    await loadData();
  }
});

// Clear History
document.getElementById("clearHistory").addEventListener("click", async () => {
  if (allData.history.length === 0) {
    alert("History is already empty.");
    return;
  }
  
  if (confirm(`This will permanently delete ${allData.history.length} completed cases. Are you sure?`)) {
    await send({ type: "CLEAR_HISTORY" });
    await loadData();
  }
});

// Reset All
document.getElementById("resetAll").addEventListener("click", async () => {
  const confirmText = "RESET";
  const input = prompt(`This will DELETE ALL DATA including queue, history, and case types.\n\nType "${confirmText}" to confirm:`);
  
  if (input === confirmText) {
    await send({ type: "RESET_ALL" });
    await loadData();
    alert("All data has been reset.");
  } else if (input !== null) {
    alert("Reset cancelled. Text did not match.");
  }
});

// Initialize
loadData();

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    loadData();
  }
});