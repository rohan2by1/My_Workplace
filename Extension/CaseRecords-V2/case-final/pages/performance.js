import { send } from '../utils.js';

let chartByTypeInstance = null;
let chartTrendInstance = null;
let chartDetailedInstance = null;
let chartHourlyInstance = null;

let currentRange = null;
let currentTypeFilter = "";
let allData = { queue: [], history: [], caseTypes: [] };

// *** SHARED COLOR PALETTE ***
const CHART_COLORS = [
  'rgba(59, 130, 246, 0.8)',   // Blue
  'rgba(16, 185, 129, 0.8)',   // Green
  'rgba(251, 191, 36, 0.8)',   // Yellow
  'rgba(239, 68, 68, 0.8)',    // Red
  'rgba(139, 92, 246, 0.8)',   // Purple
  'rgba(236, 72, 153, 0.8)',   // Pink
  'rgba(20, 184, 166, 0.8)',   // Teal
  'rgba(249, 115, 22, 0.8)',   // Orange
  'rgba(34, 211, 238, 0.8)',   // Cyan
  'rgba(163, 230, 53, 0.8)',   // Lime
  'rgba(244, 114, 182, 0.8)',  // Rose
  'rgba(192, 132, 252, 0.8)',  // Violet
  'rgba(251, 146, 60, 0.8)',   // Amber
  'rgba(45, 212, 191, 0.8)',   // Emerald
  'rgba(96, 165, 250, 0.8)',   // Light Blue
  'rgba(74, 222, 128, 0.8)',   // Light Green
  'rgba(253, 224, 71, 0.8)',   // Light Yellow
  'rgba(248, 113, 113, 0.8)',  // Light Red
  'rgba(167, 139, 250, 0.8)',  // Light Purple
  'rgba(244, 114, 182, 0.8)',  // Light Pink
  'rgba(94, 234, 212, 0.8)',   // Light Teal
  'rgba(251, 146, 60, 0.8)',   // Light Orange
  'rgba(103, 232, 249, 0.8)',  // Sky
  'rgba(190, 242, 100, 0.8)',  // Yellow-Green
  'rgba(232, 121, 249, 0.8)',  // Fuchsia
  'rgba(129, 140, 248, 0.8)',  // Indigo
  'rgba(252, 165, 165, 0.8)',  // Salmon
  'rgba(134, 239, 172, 0.8)',  // Mint
  'rgba(253, 186, 116, 0.8)',  // Peach
  'rgba(165, 180, 252, 0.8)',  // Periwinkle
];

// Store type-to-color mapping for consistency
let typeColorMap = new Map();

function getTypeColor(type) {
  return typeColorMap.get(type) || CHART_COLORS[0];
}

// --- Utility Functions ---
function toDatetimeLocal(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatAHT(ms) {
  if (ms === 0) return "0s";
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- Range Functions ---
function inRange(ts) {
  if (!currentRange) return true;
  const t = typeof ts === "string" ? Date.parse(ts) : ts;
  return !Number.isNaN(t) && t >= currentRange.start && t <= currentRange.end;
}

function applyFilters(queue, history) {
  let filteredQueue = queue;
  let filteredHistory = history;
  
  if (currentRange) {
    filteredQueue = filteredQueue.filter(x => inRange(x.openedAt));
    filteredHistory = filteredHistory.filter(x => inRange(x.completedAt));
  }
  
  if (currentTypeFilter) {
    filteredQueue = filteredQueue.filter(x => (x.caseType || "").toLowerCase() === currentTypeFilter.toLowerCase());
    filteredHistory = filteredHistory.filter(x => (x.caseType || "").toLowerCase() === currentTypeFilter.toLowerCase());
  }
  
  return { queue: filteredQueue, history: filteredHistory };
}

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
      currentRange = null;
      document.getElementById("startRange").value = "";
      document.getElementById("endRange").value = "";
      updateRangeDisplay();
      load();
      document.querySelector(`[data-range="${range}"]`)?.classList.add('active');
      return;
  }
  
  currentRange = { start: start.getTime(), end: end.getTime() };
  document.getElementById("startRange").value = toDatetimeLocal(start);
  document.getElementById("endRange").value = toDatetimeLocal(end);
  document.querySelector(`[data-range="${range}"]`)?.classList.add('active');
  
  updateRangeDisplay();
  load();
}

function updateRangeDisplay() {
  const display = document.getElementById("rangeDisplay");
  if (!currentRange) {
    display.innerHTML = "<strong>All Time</strong>";
  } else {
    const start = new Date(currentRange.start);
    const end = new Date(currentRange.end);
    display.innerHTML = `<strong>${formatDate(start)}</strong> → <strong>${formatDate(end)}</strong>`;
  }
}

// --- Type Filter Dropdown ---
function renderTypeFilterDropdown(searchText = "") {
  const dropdown = document.getElementById("typeFilterDropdown");
  dropdown.innerHTML = "";
  
  const typeCounts = {};
  allData.history.forEach(item => {
    if (item.caseType) {
      typeCounts[item.caseType] = (typeCounts[item.caseType] || 0) + 1;
    }
  });
  
  const allTypes = [...new Set([...allData.caseTypes, ...Object.keys(typeCounts)])].sort();
  
  let filteredTypes = allTypes;
  if (searchText.length > 0) {
    filteredTypes = allTypes.filter(t => 
      t.toLowerCase().includes(searchText.toLowerCase())
    );
  }
  
  if (currentTypeFilter) {
    const clearItem = document.createElement("div");
    clearItem.className = "filter-item clear-option";
    clearItem.innerHTML = `✕ Clear filter (show all)`;
    clearItem.addEventListener("mousedown", (e) => {
      e.preventDefault();
      clearTypeFilter();
      dropdown.classList.remove("show");
    });
    dropdown.appendChild(clearItem);
  }
  
  if (!currentTypeFilter && searchText.length === 0) {
    const allItem = document.createElement("div");
    allItem.className = "filter-item";
    const totalCount = allData.history.length;
    allItem.innerHTML = `<span>All Case Types</span><span class="count">${totalCount}</span>`;
    allItem.addEventListener("mousedown", (e) => {
      e.preventDefault();
      clearTypeFilter();
      dropdown.classList.remove("show");
    });
    dropdown.appendChild(allItem);
  }
  
  filteredTypes.forEach((type, index) => {
    const item = document.createElement("div");
    item.className = "filter-item";
    
    if (index === 0 && searchText.length > 0) {
      item.classList.add("highlighted");
    }
    
    const count = typeCounts[type] || 0;
    let displayName = type;
    
    if (searchText.length > 0) {
      const regex = new RegExp(`(${escapeRegex(searchText)})`, 'gi');
      displayName = type.replace(regex, '<mark>$1</mark>');
    }
    
    item.innerHTML = `<span>${displayName}</span><span class="count">${count}</span>`;
    
    item.addEventListener("mousedown", (e) => {
      e.preventDefault();
      setTypeFilter(type);
      dropdown.classList.remove("show");
    });
    
    item.addEventListener("mouseenter", () => {
      dropdown.querySelectorAll('.filter-item').forEach(el => el.classList.remove('highlighted'));
      item.classList.add('highlighted');
    });
    
    dropdown.appendChild(item);
  });
  
  if (filteredTypes.length === 0 && searchText.length > 0) {
    const noResult = document.createElement("div");
    noResult.className = "filter-item";
    noResult.style.color = "var(--text-muted)";
    noResult.style.cursor = "default";
    noResult.textContent = "No matching types";
    dropdown.appendChild(noResult);
  }
}

function setTypeFilter(type) {
  currentTypeFilter = type;
  document.getElementById("typeFilter").value = "";
  
  const activeFilter = document.getElementById("activeTypeFilter");
  activeFilter.innerHTML = `
    <div class="active-filter">
      <span>${type}</span>
      <button class="clear-btn" title="Clear filter">✕</button>
    </div>
  `;
  activeFilter.querySelector(".clear-btn").addEventListener("click", clearTypeFilter);
  
  load();
}

function clearTypeFilter() {
  currentTypeFilter = "";
  document.getElementById("typeFilter").value = "";
  document.getElementById("activeTypeFilter").innerHTML = "";
  load();
}

// --- Stats Rendering ---
function renderStats(queue, history) {
  const el = document.getElementById("stats");
  
  const totalQueued = queue.length;
  const totalCompleted = history.length;
  const abortCount = history.filter(x => (x.caseType || "").toLowerCase().includes("abort")).length;
  const completedExcludingAbort = totalCompleted - abortCount;

  let totalDurationMs = 0;
  let minDuration = Infinity;
  let maxDuration = 0;
  let validCases = 0;

  history.forEach(item => {
    if ((item.caseType || "").toLowerCase().includes("abort")) return;
    if (item.openedAt && item.completedAt) {
      const start = new Date(item.openedAt).getTime();
      const end = new Date(item.completedAt).getTime();
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        const duration = end - start;
        totalDurationMs += duration;
        minDuration = Math.min(minDuration, duration);
        maxDuration = Math.max(maxDuration, duration);
        validCases++;
      }
    }
  });

  const averageMs = validCases > 0 ? totalDurationMs / validCases : 0;
  
  let casesPerHour = "-";
  if (currentRange && completedExcludingAbort > 0) {
    const hoursInRange = (currentRange.end - currentRange.start) / (1000 * 60 * 60);
    if (hoursInRange > 0) {
      casesPerHour = (completedExcludingAbort / hoursInRange).toFixed(1);
    }
  }

  el.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Queue Load</div>
        <div class="stat-value" style="color: var(--primary)">${totalQueued}</div>
        <div class="stat-sub">Currently pending</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Completed</div>
        <div class="stat-value" style="color: var(--success)">${completedExcludingAbort}</div>
        <div class="stat-sub ${abortCount > 0 ? 'negative' : ''}">${abortCount} aborted</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Avg Handle Time</div>
        <div class="stat-value" style="color: var(--warning)">${formatAHT(averageMs)}</div>
        <div class="stat-sub">${validCases} cases measured</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Fastest</div>
        <div class="stat-value" style="color: #22d3ee">${validCases > 0 ? formatAHT(minDuration) : '-'}</div>
        <div class="stat-sub">Minimum time</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Slowest</div>
        <div class="stat-value" style="color: #f87171">${validCases > 0 ? formatAHT(maxDuration) : '-'}</div>
        <div class="stat-sub">Maximum time</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Throughput</div>
        <div class="stat-value" style="color: #a78bfa">${casesPerHour}</div>
        <div class="stat-sub">Cases per hour</div>
      </div>
    </div>
  `;
}

// --- Chart Rendering ---
function renderByType(queue, history) {
  const map = new Map();
  
  const process = (list, key) => {
    list.forEach(x => {
      const k = x.caseType || "Unassigned";
      const v = map.get(k) || { queued: 0, completed: 0 };
      v[key]++;
      map.set(k, v);
    });
  };
  
  process(queue, 'queued');
  process(history, 'completed');

  // Sort by total volume descending
  const sortedData = Array.from(map.entries())
    .sort((a, b) => (b[1].queued + b[1].completed) - (a[1].queued + a[1].completed));
  
  const labels = sortedData.map(d => d[0]);
  const completedData = sortedData.map(d => d[1].completed);
  const queuedData = sortedData.map(d => d[1].queued);

  // Build color map based on sorted order (most common type gets first color)
  typeColorMap.clear();
  labels.forEach((label, i) => {
    typeColorMap.set(label, CHART_COLORS[i % CHART_COLORS.length]);
  });

  const bgColors = labels.map(label => getTypeColor(label));

  const ctx = document.getElementById("chartByType").getContext('2d');
  if (chartByTypeInstance) chartByTypeInstance.destroy();

  chartByTypeInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: completedData.map((c, i) => c + queuedData[i]),
        backgroundColor: bgColors,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#94a3b8',
            padding: 8,
            font: { size: 11 }
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const idx = ctx.dataIndex;
              return `${ctx.label}: ${completedData[idx]} completed, ${queuedData[idx]} queued`;
            }
          }
        }
      }
    }
  });
}

function renderTrend(history) {
  const counts = new Map();
  const dateKey = (ts) => new Date(ts).toLocaleDateString("en-CA");

  history.forEach(x => {
    if (!x.completedAt) return;
    const key = dateKey(x.completedAt);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  // Generate last 14 days
  const days = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(dateKey(d.toISOString()));
  }

  const values = days.map(k => counts.get(k) || 0);
  const displayLabels = days.map(d => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  });

  const ctx = document.getElementById("chartTrend").getContext('2d');
  if (chartTrendInstance) chartTrendInstance.destroy();

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 1)');

  chartTrendInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: displayLabels,
      datasets: [{
        label: 'Completed',
        data: values,
        backgroundColor: gradient,
        borderRadius: 4,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8', stepSize: 1 }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', maxRotation: 45, minRotation: 45 }
        }
      }
    }
  });
}

function renderDetailed(queue, history) {
  const map = new Map();
  
  const process = (list, key) => {
    list.forEach(x => {
      const k = x.caseType || "Unassigned";
      const v = map.get(k) || { queued: 0, completed: 0 };
      v[key]++;
      map.set(k, v);
    });
  };
  
  process(queue, 'queued');
  process(history, 'completed');

  const sortedData = Array.from(map.entries())
    .sort((a, b) => (a[1].queued + a[1].completed) - (b[1].queued + b[1].completed));

  const labels = sortedData.map(d => d[0]);
  const completedData = sortedData.map(d => d[1].completed);
  const queuedData = sortedData.map(d => d[1].queued);

  const itemCount = labels.length;
  
  // *** FIX: Calculate canvas height based on items ***
  // Each row needs ~30px, plus space for legend
  const rowHeight = 15;
  const legendHeight = 50;
  const canvasHeight = (itemCount * rowHeight) + legendHeight;
  
  const chartWrapper = document.getElementById("detailedChartWrapper");
  const canvas = document.getElementById("chartDetailed");
  
  // Set the canvas height directly
  if (canvas) {
    canvas.style.height = `${canvasHeight}px`;
  }
  
  // Set wrapper to auto so it expands
  if (chartWrapper) {
    chartWrapper.style.height = 'auto';
    chartWrapper.style.minHeight = `${canvasHeight}px`;
  }
  
  const chartCard = document.getElementById("detailedChartCard");
  if (chartCard) {
    chartCard.style.height = 'auto';
  }

  const ctx = canvas.getContext('2d');
  if (chartDetailedInstance) chartDetailedInstance.destroy();

  const barColors = labels.map(label => getTypeColor(label));
  const queuedColors = barColors.map(color => color.replace('0.8)', '0.4)'));

  chartDetailedInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Completed',
          data: completedData,
          backgroundColor: barColors,
          borderRadius: 2,
          barThickness: 8, // Bar width (appears as height in horizontal)
          barPercentage: 0.9,      // Bar width within category (0-1)
          categoryPercentage: 0.9
        },
        {
          label: 'Queued',
          data: queuedData,
          backgroundColor: queuedColors,
          borderRadius: 2,
          barThickness: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // *** IMPORTANT ***
      indexAxis: 'y', // Horizontal bars
      layout: {
        padding: { top: 5, bottom: 5, left: 5, right: 15 }
      },
      scales: {
        x: {
          beginAtZero: true,
          stacked: true,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8', stepSize: 1 }
        },
        y: {
          stacked: true,
          grid: { display: false },
          ticks: { 
            color: '#94a3b8',
            font: { size: 11 },
            autoSkip: false
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { 
            color: '#94a3b8', 
            padding: 10,
            boxWidth: 12,
            font: { size: 11 }
          }
        }
      }
    }
  });
}

function renderHourly(history) {
  const hourCounts = new Array(24).fill(0);
  
  history.forEach(x => {
    if (!x.completedAt) return;
    const hour = new Date(x.completedAt).getHours();
    hourCounts[hour]++;
  });

  const labels = hourCounts.map((_, i) => {
    const ampm = i >= 12 ? 'PM' : 'AM';
    const hour = i % 12 || 12;
    return `${hour}${ampm}`;
  });

  const ctx = document.getElementById("chartHourly").getContext('2d');
  if (chartHourlyInstance) chartHourlyInstance.destroy();

  const maxCount = Math.max(...hourCounts, 1);
  const bgColors = hourCounts.map(count => {
    const intensity = count / maxCount;
    return `rgba(139, 92, 246, ${0.2 + intensity * 0.6})`;
  });

  chartHourlyInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Cases Completed',
        data: hourCounts,
        backgroundColor: bgColors,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `${items[0].label}`,
            label: (ctx) => `${ctx.raw} cases completed`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8', stepSize: 1 }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8' }
        }
      }
    }
  });
}

// --- Main Load Function ---
async function load() {
  const r = await send({ type: "GET_DATA" });
  allData = {
    queue: r.queue || [],
    history: r.history || [],
    caseTypes: r.caseTypes || []
  };
  
  const filtered = applyFilters(allData.queue, allData.history);
  
  renderStats(filtered.queue, filtered.history);
  renderByType(filtered.queue, filtered.history);
  
  // Trend chart always uses ALL history, not filtered
  renderTrend(allData.history);
  
  renderDetailed(filtered.queue, filtered.history);
  renderHourly(filtered.history);
  renderTypeFilterDropdown();
  updateRangeDisplay();
}

// --- Event Listeners ---

// Quick range buttons
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setQuickRange(btn.dataset.range);
  });
});

// Apply custom range
document.getElementById("applyRange").addEventListener("click", () => {
  const startVal = document.getElementById("startRange").value;
  const endVal = document.getElementById("endRange").value;
  
  if (!startVal || !endVal) {
    alert("Please select both start and end dates.");
    return;
  }
  
  const s = new Date(startVal).getTime();
  const e = new Date(endVal).getTime();

  if (e >= s) {
    currentRange = { start: s, end: e };
    document.querySelectorAll('.quick-btn').forEach(btn => btn.classList.remove('active'));
    updateRangeDisplay();
    load();
  } else {
    alert("End time must be after start time.");
  }
});

// Type filter dropdown
const typeFilterInput = document.getElementById("typeFilter");
const typeFilterDropdown = document.getElementById("typeFilterDropdown");

typeFilterInput.addEventListener("focus", () => {
  renderTypeFilterDropdown("");
  typeFilterDropdown.classList.add("show");
});

typeFilterInput.addEventListener("blur", () => {
  setTimeout(() => {
    typeFilterDropdown.classList.remove("show");
  }, 150);
});

typeFilterInput.addEventListener("input", () => {
  const typed = typeFilterInput.value.trim();
  renderTypeFilterDropdown(typed);
  typeFilterDropdown.classList.add("show");
  
  // Auto-select if single match
  if (typed.length > 0) {
    const allTypes = [...new Set([...allData.caseTypes, ...Object.keys(getTypeCounts())])];
    const matches = allTypes.filter(t => t.toLowerCase().includes(typed.toLowerCase()));
    
    if (matches.length === 1) {
      setTypeFilter(matches[0]);
      typeFilterDropdown.classList.remove("show");
    }
  }
});

typeFilterInput.addEventListener("keydown", (e) => {
  const items = typeFilterDropdown.querySelectorAll('.filter-item:not(.clear-option)');
  const highlighted = typeFilterDropdown.querySelector('.filter-item.highlighted');
  let idx = Array.from(items).indexOf(highlighted);
  
  switch(e.key) {
    case "ArrowDown":
      e.preventDefault();
      idx = Math.min(idx + 1, items.length - 1);
      items.forEach(el => el.classList.remove('highlighted'));
      if (items[idx]) {
        items[idx].classList.add('highlighted');
        items[idx].scrollIntoView({ block: 'nearest' });
      }
      break;
    case "ArrowUp":
      e.preventDefault();
      idx = Math.max(idx - 1, 0);
      items.forEach(el => el.classList.remove('highlighted'));
      if (items[idx]) {
        items[idx].classList.add('highlighted');
        items[idx].scrollIntoView({ block: 'nearest' });
      }
      break;
    case "Enter":
      e.preventDefault();
      if (highlighted) {
        const type = highlighted.querySelector('span')?.textContent;
        if (type && type !== "All Case Types") {
          setTypeFilter(type);
        } else {
          clearTypeFilter();
        }
        typeFilterDropdown.classList.remove("show");
      }
      break;
    case "Escape":
      typeFilterDropdown.classList.remove("show");
      typeFilterInput.blur();
      break;
  }
});

function getTypeCounts() {
  const counts = {};
  allData.history.forEach(item => {
    if (item.caseType) {
      counts[item.caseType] = (counts[item.caseType] || 0) + 1;
    }
  });
  return counts;
}

// Initialize with "All Time" selected
function init() {
  currentRange = null;
  document.getElementById("startRange").value = "";
  document.getElementById("endRange").value = "";
  document.querySelector('[data-range="all"]')?.classList.add('active');
  load();
}

init();

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.queue || changes.history)) {
    load();
  }
});