# Case Tracker Chrome Extension

![Version](https://img.shields.io/badge/version-1.0-blue) ![Manifest](https://img.shields.io/badge/manifest-v3-green)

A specialized productivity tool designed to track work case URLs, manage queues, and analyze performance metrics with a modern, dark-themed dashboard.

## 🚀 Features

### 1. Workflow Automation
* **Auto-Capture:** Automatically detects job details pages on `thejobcompany.in` and adds them to a processing queue.
* **Queue Management:** Replaces the Chrome "New Tab" page with your active Case Queue for immediate access.
* **Duplicate Prevention:** Smart logic prevents the same case link from being added twice.

### 2. Case Management
* **Actionable Queue:** Open cases directly from the dashboard.
* **History Tracking:** Logs every completed case with `Opened At` and `Completed At` timestamps.
* **Case Types:** Categorize cases (e.g., "Claim Reason", "Counterfeit", "Abort-PIV").

### 3. Performance Analytics (AHT)
* **Visual Dashboard:** Powered by **Chart.js**.
* **Metrics:** Tracks Queue Load, Total Completed, and **Average Handling Time (AHT)**.
* **Abort Logic:** Automatically detects and isolates "Abort" cases (e.g., "Abort-MULTI") from success metrics.
* **Trend Analysis:** Line chart showing completed cases over the last 14 days.
* **Date Range Filter:** Filter stats by specific dates (Default: Current Day).

### 4. Data Management
* **CSV Export:** Download full reports (`queue.csv` or `history.csv`) including calculated "Time Taken" durations.
* **Settings:** Add or remove custom Case Types dynamically.

---

## 🛠️ Installation Guide

Since this is a custom local extension, you must install it in **Developer Mode**.

### Prerequisites
1.  Ensure you have downloaded `chart.umd.js` (Chart.js v4.4.1) and placed it in the root folder (or alongside `performance.js`).

### Steps
1.  **Download/Clone** this project to a folder on your computer.
2.  Open Google Chrome and navigate to: `chrome://extensions/`
3.  Toggle **Developer mode** (top right corner).
4.  Click **Load unpacked**.
5.  Select the folder containing the `manifest.json` file.
6.  The extension is now active! The icon should appear in your toolbar.

---

## 📂 Project Structure

```text
/case-tracker-root
│
├── manifest.json            # Extension configuration
├── background.js            # Service worker (event handling)
├── chart.umd.js             # Chart.js library (Must be downloaded manually)
│
├── assets/                  # Icons
│   └── icon.png             # 128x128 icon
│
├── styles/
│   └── main.css             # Global Dark Slate theme & Glassmorphism
│
├── pages/                   # UI HTML Files
│   ├── queued.html          # (Default New Tab) Active queue
│   ├── history.html         # Completed cases log
│   ├── performance.html     # Charts & AHT Stats
│   └── settings.html        # Configuration & Export
│
├── scripts/                 # Logic JS Files
│   ├── queued.js
│   ├── history.js
│   ├── performance.js
│   └── settings.js
│
└── content/
    └── capture.js           # Script injected into target website
````

-----

## 🎨 UI & Design System

The extension uses a custom **Dark Slate** theme designed for long working hours.

  * **Font:** Inter (via Google Fonts).
  * **Colors:**
      * Background: `#0f172a` (Slate 900)
      * Surface: `#1e293b` (Slate 800)
      * Primary: `#3b82f6` (Blue 500)
      * Success: `#10b981` (Emerald 500)
      * Text: `#f8fafc` (Slate 50)
  * **Effects:** Glassmorphism on headers (Blur 12px) and subtle drop shadows.

-----

## 📊 CSV Export Format

When exporting data via the Settings page, the CSVs are formatted as follows:

**Queue Export:**
`URL, Case Type, Opened`

**History Export:**
`URL, Case Type, Opened, Completed, Time Taken`

> **Note:** "Time Taken" is calculated automatically as the duration between `Opened` and `Completed` timestamps.

-----

## 🔒 Permissions Explained

  * `tabs`: To open and manipulate case tabs.
  * `storage`: To save the queue and history locally on your machine.
  * `scripting`: To inject the capture script into the work website.
  * `host_permissions`: Strictly limited to `https://thejobcompany.in/*`.

-----

## 👤 Author

**Sk Md Rohan**
[LinkedIn Profile](https://www.linkedin.com/in/rohan2by1)
[Github](https://www.github.com/rohan2by1)

-----

**License:** Personal Use / Internal Tool.

import { send, fmt, openOrFocusTab } from '../utils.js';

async function load() {
  const r = await send({ type: "GET_DATA" });
  const tbody = document.querySelector("#table tbody");
  tbody.innerHTML = "";
  
  const list = r.queue || [];
  const types = r.caseTypes || []; 

  list.forEach((item, i) => {
    const tr = document.createElement("tr");
    
    // Index
    const tdIndex = document.createElement("td");
    tdIndex.textContent = String(i + 1);
    
    // Link
    const tdLink = document.createElement("td");
    const displayUrl = item.url.length > 50 ? "..." + item.url.slice(-47) : item.url;
    tdLink.textContent = displayUrl;
    tdLink.title = item.url;
    
    // Opened
    const tdOpened = document.createElement("td");
    tdOpened.textContent = fmt(item.openedAt);
    
    // --- SEARCHABLE DROPDOWN ---
    const tdType = document.createElement("td");
    tdType.className = "dropdown-cell";
    
    const wrapper = document.createElement("div");
    wrapper.className = "dropdown-wrapper";
    
    const input = document.createElement("input");
    input.className = "custom-input dropdown-input";
    input.value = item.caseType || "";
    input.placeholder = "Search case type...";
    input.autocomplete = "off";
    input.dataset.rowIndex = i;
    
    const dropdownList = document.createElement("div");
    dropdownList.className = "dropdown-list";
    dropdownList.style.display = "none";

    let btnComplete;
    let userTypedText = ""; // Track what user actually typed
    
    // Escape special regex characters
    function escapeRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Function to select a type and EXIT edit mode
    async function selectType(type) {
      userTypedText = ""; // Reset
      input.value = type;
      dropdownList.style.display = "none";
      
      if (btnComplete) btnComplete.disabled = false;
      await send({ type: "UPDATE_CASE_TYPE", url: item.url, caseType: type });
      
      // EXIT EDIT MODE - blur and move to next
      input.blur();
      
      const nextInput = document.querySelector(`input.dropdown-input[data-row-index="${i + 1}"]`);
      if (nextInput) {
        setTimeout(() => nextInput.focus(), 50);
      } else {
        setTimeout(() => btnComplete.focus(), 50);
      }
    }
    
    // Populate dropdown options (NO auto-select here)
    function renderOptions(filter = "") {
      dropdownList.innerHTML = "";
      
      const filtered = types.filter(t => 
        t.toLowerCase().includes(filter.toLowerCase())
      );
      
      if (filtered.length === 0) {
        const noResult = document.createElement("div");
        noResult.className = "dropdown-item no-result";
        noResult.textContent = "No matches found";
        dropdownList.appendChild(noResult);
        return filtered;
      }
      
      filtered.forEach((type, index) => {
        const option = document.createElement("div");
        option.className = "dropdown-item";
        option.dataset.value = type;
        
        if (index === 0) {
          option.classList.add('highlighted');
        }
        
        if (filter) {
          const regex = new RegExp(`(${escapeRegex(filter)})`, 'gi');
          option.innerHTML = type.replace(regex, '<mark>$1</mark>');
        } else {
          option.textContent = type;
        }
        
        option.addEventListener("mousedown", (e) => {
          // Use mousedown instead of click to fire before blur
          e.preventDefault();
          e.stopPropagation();
          selectType(type);
        });
        
        option.addEventListener("mouseenter", () => {
          dropdownList.querySelectorAll('.dropdown-item').forEach(el => el.classList.remove('highlighted'));
          option.classList.add('highlighted');
        });
        
        dropdownList.appendChild(option);
      });
      
      return filtered;
    }
    
    // Show dropdown on focus - show ALL options
    input.addEventListener("focus", () => {
      userTypedText = "";
      renderOptions("");
      dropdownList.style.display = "block";
      input.select();
    });
    
    // Handle typing - check for single match
    input.addEventListener("input", () => {
      userTypedText = input.value;
      const filtered = renderOptions(userTypedText);
      dropdownList.style.display = "block";
      
      if (btnComplete) {
        btnComplete.disabled = !types.includes(input.value);
      }
      
      // *** AUTO-SELECT: If exactly ONE match while typing ***
      if (filtered.length === 1 && userTypedText.length > 0) {
        selectType(filtered[0]);
      }
    });
    
    // Keyboard navigation
    input.addEventListener("keydown", (e) => {
      const items = dropdownList.querySelectorAll('.dropdown-item:not(.no-result)');
      const highlighted = dropdownList.querySelector('.dropdown-item.highlighted');
      let index = Array.from(items).indexOf(highlighted);
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (dropdownList.style.display === "none") {
          renderOptions("");
          dropdownList.style.display = "block";
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
        if (highlighted && highlighted.dataset.value) {
          selectType(highlighted.dataset.value);
        }
      } else if (e.key === "Escape") {
        dropdownList.style.display = "none";
        input.blur();
      } else if (e.key === "Tab") {
        if (highlighted && highlighted.dataset.value && dropdownList.style.display !== "none") {
          e.preventDefault();
          selectType(highlighted.dataset.value);
        }
      }
    });
    
    // Close dropdown when clicking outside
    input.addEventListener("blur", () => {
      // Delay to allow mousedown on options to fire first
      setTimeout(() => {
        dropdownList.style.display = "none";
      }, 200);
    });
    
    wrapper.appendChild(input);
    wrapper.appendChild(dropdownList);
    tdType.appendChild(wrapper);

    // Actions
    const tdActions = document.createElement("td");
    tdActions.className = "actions";

    const btnOpen = document.createElement("button");
    btnOpen.textContent = "Open";
    btnOpen.className = "btn btn-info"; 
    btnOpen.addEventListener("click", () => openOrFocusTab(item.url));

    btnComplete = document.createElement("button");
    btnComplete.textContent = "Complete";
    btnComplete.className = "btn btn-success";
    btnComplete.disabled = !item.caseType || !types.includes(item.caseType);
    
    btnComplete.addEventListener("click", async () => {
      if (input.value && types.includes(input.value)) {
        await send({ type: "UPDATE_CASE_TYPE", url: item.url, caseType: input.value });
        await send({ type: "MARK_COMPLETED", url: item.url });
        await load();
      } else {
        alert("Please select a valid Case Type.");
      }
    });
    
    const btnRemove = document.createElement("button");
    btnRemove.className = "btn btn-danger btn-icon"; 
    btnRemove.innerHTML = "&#10006;";
    btnRemove.title = "Remove from queue";
    
    btnRemove.addEventListener("click", async () => {
      if (confirm("Are you sure you want to remove this item?")) {
        await send({ type: "REMOVE_QUEUE_ITEM", url: item.url });
        await load();
      }
    });

    tdActions.appendChild(btnOpen);
    tdActions.appendChild(btnComplete);
    tdActions.appendChild(btnRemove);
    
    tr.appendChild(tdIndex);
    tr.appendChild(tdLink);
    tr.appendChild(tdOpened);
    tr.appendChild(tdType);
    tr.appendChild(tdActions);
    
    tbody.appendChild(tr);
  });

  // Auto-focus first empty input
  const emptyInput = Array.from(document.querySelectorAll(".dropdown-input")).find(inp => !inp.value);
  const firstInput = document.querySelector(".dropdown-input");
  
  if (emptyInput) {
    emptyInput.focus();
  } else if (firstInput) {
    firstInput.focus();
  }
}

document.getElementById("refresh").addEventListener("click", load);
load();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.queue || changes.caseTypes)) load();
});