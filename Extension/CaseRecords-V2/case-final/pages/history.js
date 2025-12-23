import { send, fmt, fmtDuration, openOrFocusTab } from '../utils.js';

let currentFilter = "";
let allHistory = [];
let caseTypes = [];

async function load() {
  const r = await send({ type: "GET_DATA" });
  allHistory = r.history || [];
  caseTypes = r.caseTypes || [];
  
  renderTable();
  renderFilterDropdown();
}

function renderTable() {
  const tbody = document.querySelector("#table tbody");
  tbody.innerHTML = "";
  
  let list = [...allHistory];
  
  // Apply filter
  if (currentFilter.length) {
    list = list.filter(x => (x.caseType || "").toLowerCase() === currentFilter.toLowerCase());
  }
  
  // Sort history newest first
  list.reverse(); 
  
  // Update results count
  const resultsCount = document.getElementById("resultsCount");
  if (currentFilter) {
    resultsCount.textContent = `Showing ${list.length} of ${allHistory.length} records`;
  } else {
    resultsCount.textContent = `${allHistory.length} total records`;
  }

  list.forEach((item, i) => {
    const tr = document.createElement("tr");
    
    const tdIndex = document.createElement("td");
    tdIndex.textContent = String(i + 1);
    
    // Link
    const tdLink = document.createElement("td");
    const displayUrl = item.url.length > 50 ? "..." + item.url.slice(-47) : item.url;
    tdLink.textContent = displayUrl;
    tdLink.title = item.url;
    // tdLink.style.cursor = "pointer";
    // tdLink.addEventListener("click", () => openOrFocusTab(item.url));
    
    const tdOpened = document.createElement("td");
    tdOpened.textContent = fmt(item.openedAt);
    
    const tdType = document.createElement("td");
    tdType.textContent = item.caseType || "";
    // Make case type clickable to filter
    if (item.caseType) {
      tdType.style.cursor = "pointer";
      tdType.style.color = "var(--primary)";
      tdType.title = "Click to filter by this type";
      tdType.addEventListener("click", () => {
        setFilter(item.caseType);
      });
    }
    
    const tdCompleted = document.createElement("td");
    tdCompleted.textContent = fmt(item.completedAt);
    
    const tdTimeTaken = document.createElement("td");
    tdTimeTaken.textContent = fmtDuration(item.openedAt, item.completedAt);
    
    const tdActions = document.createElement("td");
    tdActions.className = "actions";
    
    // Open Button
    const btnOpen = document.createElement("button");
    btnOpen.textContent = "Open";
    btnOpen.className = "btn btn-info";
    btnOpen.addEventListener("click", () => openOrFocusTab(item.url));
    
    // Remove Button
    const btnRemove = document.createElement("button");
    btnRemove.className = "btn btn-danger btn-icon"; 
    btnRemove.innerHTML = "&#10006;";
    btnRemove.title = "Permanently delete";
    
    btnRemove.addEventListener("click", async () => {
      if (confirm("Are you sure you want to permanently delete this record from history?")) {
        await send({ 
          type: "REMOVE_HISTORY_ITEM", 
          url: item.url, 
          openedAt: item.openedAt 
        });
        await load();
      }
    });

    tdActions.appendChild(btnOpen);
    tdActions.appendChild(btnRemove);
    
    tr.appendChild(tdIndex);
    tr.appendChild(tdLink);
    tr.appendChild(tdOpened);
    tr.appendChild(tdType);
    tr.appendChild(tdCompleted);
    tr.appendChild(tdTimeTaken);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });
}

function renderFilterDropdown(searchText = "") {
  const dropdown = document.getElementById("filterDropdown");
  dropdown.innerHTML = "";
  
  // Count occurrences of each case type in history
  const typeCounts = {};
  allHistory.forEach(item => {
    if (item.caseType) {
      typeCounts[item.caseType] = (typeCounts[item.caseType] || 0) + 1;
    }
  });
  
  // Get all types (from settings + any in history)
  const allTypes = [...new Set([...caseTypes, ...Object.keys(typeCounts)])].sort();
  
  // Filter types based on search
  let filteredTypes = allTypes;
  if (searchText.length > 0) {
    filteredTypes = allTypes.filter(t => 
      t.toLowerCase().includes(searchText.toLowerCase())
    );
  }
  
  // Add "Clear Filter" option if filter is active
  if (currentFilter) {
    const clearItem = document.createElement("div");
    clearItem.className = "filter-item clear-filter";
    clearItem.innerHTML = `✕ Clear filter`;
    clearItem.addEventListener("click", () => {
      clearFilter();
      dropdown.classList.remove("show");
    });
    dropdown.appendChild(clearItem);
  }
  
  // Add "Show All" option
  if (!currentFilter && searchText.length === 0) {
    const allItem = document.createElement("div");
    allItem.className = "filter-item";
    allItem.innerHTML = `<span>All Case Types</span><span class="count">${allHistory.length}</span>`;
    allItem.addEventListener("click", () => {
      clearFilter();
      dropdown.classList.remove("show");
    });
    dropdown.appendChild(allItem);
  }
  
  // Add filtered types
  filteredTypes.forEach((type, index) => {
    const item = document.createElement("div");
    item.className = "filter-item";
    
    if (type.toLowerCase() === currentFilter.toLowerCase()) {
      item.classList.add("selected");
    }
    
    if (index === 0 && searchText.length > 0) {
      item.classList.add("highlighted");
    }
    
    const count = typeCounts[type] || 0;
    let displayName = type;
    
    // Highlight matching text
    if (searchText.length > 0) {
      const regex = new RegExp(`(${escapeRegex(searchText)})`, 'gi');
      displayName = type.replace(regex, '<mark>$1</mark>');
    }
    
    item.innerHTML = `<span>${displayName}</span><span class="count">${count}</span>`;
    
    item.addEventListener("click", () => {
      setFilter(type);
      dropdown.classList.remove("show");
    });
    
    item.addEventListener("mouseenter", () => {
      dropdown.querySelectorAll('.filter-item').forEach(el => el.classList.remove('highlighted'));
      item.classList.add('highlighted');
    });
    
    dropdown.appendChild(item);
  });
  
  // No results message
  if (filteredTypes.length === 0 && searchText.length > 0) {
    const noResult = document.createElement("div");
    noResult.className = "filter-item";
    noResult.style.color = "var(--text-muted)";
    noResult.style.fontStyle = "italic";
    noResult.style.cursor = "default";
    noResult.textContent = "No matching case types";
    dropdown.appendChild(noResult);
  }
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function setFilter(type) {
  currentFilter = type;
  const filterInput = document.getElementById("filter");
  filterInput.value = "";
  
  // Show active filter badge
  const activeFilter = document.getElementById("activeFilter");
  activeFilter.innerHTML = `
    <div class="active-filter">
      <span>${type}</span>
      <button class="clear-btn" title="Clear filter">✕</button>
    </div>
  `;
  
  activeFilter.querySelector(".clear-btn").addEventListener("click", clearFilter);
  
  renderTable();
  renderFilterDropdown();
}

function clearFilter() {
  currentFilter = "";
  const filterInput = document.getElementById("filter");
  filterInput.value = "";
  
  const activeFilter = document.getElementById("activeFilter");
  activeFilter.innerHTML = "";
  
  renderTable();
  renderFilterDropdown();
}

// Event Listeners
const filterInput = document.getElementById("filter");
const filterDropdown = document.getElementById("filterDropdown");

filterInput.addEventListener("focus", () => {
  renderFilterDropdown(filterInput.value);
  filterDropdown.classList.add("show");
});

filterInput.addEventListener("input", () => {
  renderFilterDropdown(filterInput.value);
  filterDropdown.classList.add("show");
  
  // Auto-select if only one match
  const searchText = filterInput.value.trim();
  if (searchText.length > 0) {
    const allTypes = [...new Set([...caseTypes, ...Object.keys(getTypeCounts())])];
    const matches = allTypes.filter(t => 
      t.toLowerCase().includes(searchText.toLowerCase())
    );
    
    if (matches.length === 1) {
      setFilter(matches[0]);
      filterDropdown.classList.remove("show");
    }
  }
});

filterInput.addEventListener("keydown", (e) => {
  const items = filterDropdown.querySelectorAll('.filter-item:not(.clear-filter)');
  const highlighted = filterDropdown.querySelector('.filter-item.highlighted');
  let index = Array.from(items).indexOf(highlighted);
  
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!filterDropdown.classList.contains("show")) {
      filterDropdown.classList.add("show");
      renderFilterDropdown(filterInput.value);
      return;
    }
    index = Math.min(index + 1, items.length - 1);
    items.forEach(el => el.classList.remove('highlighted'));
    if (items[index]) {
      items[index].classList.add('highlighted');
      items[index].scrollIntoView({ block: 'nearest' });
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    index = Math.max(index - 1, 0);
    items.forEach(el => el.classList.remove('highlighted'));
    if (items[index]) {
      items[index].classList.add('highlighted');
      items[index].scrollIntoView({ block: 'nearest' });
    }
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (highlighted) {
      highlighted.click();
    }
  } else if (e.key === "Escape") {
    filterDropdown.classList.remove("show");
    filterInput.blur();
  }
});

// Helper function to get type counts
function getTypeCounts() {
  const typeCounts = {};
  allHistory.forEach(item => {
    if (item.caseType) {
      typeCounts[item.caseType] = (typeCounts[item.caseType] || 0) + 1;
    }
  });
  return typeCounts;
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest('.filter-wrapper')) {
    filterDropdown.classList.remove("show");
  }
});

document.getElementById("refresh").addEventListener("click", load);

document.getElementById("clearHistory").addEventListener("click", async () => {
  if (confirm("This will permanently clear all case history. Proceed?")) {
    await send({ type: "CLEAR_HISTORY" });
  }
});

load();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.history || changes.caseTypes)) load();
});