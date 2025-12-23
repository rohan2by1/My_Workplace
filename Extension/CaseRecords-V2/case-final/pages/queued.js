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
    //tdLink.style.cursor = "pointer";
    //tdLink.addEventListener("click", () => openOrFocusTab(item.url));
    
    // Opened
    const tdOpened = document.createElement("td");
    tdOpened.textContent = fmt(item.openedAt);
    
    // --- DROPDOWN ---
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
    
    function escapeRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Complete the case
    async function completeCase() {
      if (input.value && types.includes(input.value)) {
        await send({ type: "UPDATE_CASE_TYPE", url: item.url, caseType: input.value });
        await send({ type: "MARK_COMPLETED", url: item.url });
        await load();
      } else {
        alert("Please select a valid Case Type.");
        input.focus();
      }
    }
    
    // Select type and move focus to Complete button
    async function selectType(type) {
      input.value = type;
      dropdownList.style.display = "none";
      
      await send({ type: "UPDATE_CASE_TYPE", url: item.url, caseType: type });
      
      if (btnComplete) {
        btnComplete.disabled = false;
      }
      
      // *** FIX: Force focus to Complete button after small delay ***
      setTimeout(() => {
        input.blur();
        if (btnComplete) {
          btnComplete.focus();
        }
      }, 10);
    }
    
    // Render dropdown options
    function renderOptions(filter) {
      dropdownList.innerHTML = "";
      
      const filtered = types.filter(t => 
        t.toLowerCase().includes(filter.toLowerCase())
      );
      
      if (filtered.length === 0) {
        const noResult = document.createElement("div");
        noResult.className = "dropdown-item no-result";
        noResult.textContent = "No matches found";
        dropdownList.appendChild(noResult);
        return 0;
      }
      
      filtered.forEach((type, index) => {
        const option = document.createElement("div");
        option.className = "dropdown-item";
        option.dataset.value = type;
        
        if (index === 0) option.classList.add('highlighted');
        
        if (filter) {
          const regex = new RegExp(`(${escapeRegex(filter)})`, 'gi');
          option.innerHTML = type.replace(regex, '<mark>$1</mark>');
        } else {
          option.textContent = type;
        }
        
        // *** FIX: Use mousedown but handle focus manually ***
        option.addEventListener("mousedown", (e) => {
          e.preventDefault(); // Prevent blur
          e.stopPropagation();
          selectType(type);
        });
        
        option.addEventListener("mouseenter", () => {
          dropdownList.querySelectorAll('.dropdown-item').forEach(el => el.classList.remove('highlighted'));
          option.classList.add('highlighted');
        });
        
        dropdownList.appendChild(option);
      });
      
      return filtered.length;
    }
    
    // Focus: show all options
    input.addEventListener("focus", () => {
      renderOptions("");
      dropdownList.style.display = "block";
      input.select();
    });
    
    // Blur: hide dropdown (with delay for click to register)
    input.addEventListener("blur", () => {
      setTimeout(() => {
        dropdownList.style.display = "none";
      }, 200);
    });
    
    // Typing: filter and auto-select if single match
    input.addEventListener("input", () => {
      const typed = input.value.trim();
      const count = renderOptions(typed);
      dropdownList.style.display = "block";
      
      // Auto-select if exactly 1 match
      if (count === 1 && typed.length > 0) {
        const match = types.find(t => t.toLowerCase().includes(typed.toLowerCase()));
        if (match) {
          selectType(match);
        }
      }
      
      if (btnComplete) {
        btnComplete.disabled = !types.includes(input.value);
      }
    });
    
    // Keyboard navigation
    input.addEventListener("keydown", (e) => {
      const items = dropdownList.querySelectorAll('.dropdown-item:not(.no-result)');
      const highlighted = dropdownList.querySelector('.dropdown-item.highlighted');
      let idx = Array.from(items).indexOf(highlighted);
      
      switch(e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (dropdownList.style.display === "none") {
            renderOptions("");
            dropdownList.style.display = "block";
          } else {
            idx = Math.min(idx + 1, items.length - 1);
            items.forEach(el => el.classList.remove('highlighted'));
            if (items[idx]) {
              items[idx].classList.add('highlighted');
              items[idx].scrollIntoView({ block: 'nearest' });
            }
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
          if (dropdownList.style.display !== "none" && highlighted?.dataset.value) {
            selectType(highlighted.dataset.value);
          }
          break;
          
        case "Escape":
          dropdownList.style.display = "none";
          input.blur();
          break;
          
        case "Tab":
          if (highlighted?.dataset.value && dropdownList.style.display !== "none") {
            e.preventDefault();
            selectType(highlighted.dataset.value);
          }
          break;
      }
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
    
    btnComplete.addEventListener("click", completeCase);
    
    // Enter key on Complete button = Complete the case
    btnComplete.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        completeCase();
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

  // Focus first empty input, or first Complete button if all filled
  const allInputs = Array.from(document.querySelectorAll(".dropdown-input"));
  const emptyInput = allInputs.find(inp => !inp.value);
  
  if (emptyInput) {
    emptyInput.focus();
  } else if (allInputs.length > 0) {
    const firstCompleteBtn = document.querySelector(".btn-success:not([disabled])");
    if (firstCompleteBtn) {
      firstCompleteBtn.focus();
    }
  }
}

// Global keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Ctrl+Enter = Complete focused row
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    const focused = document.activeElement;
    
    if (focused.classList.contains("dropdown-input")) {
      const row = focused.closest("tr");
      const completeBtn = row?.querySelector(".btn-success");
      if (completeBtn && !completeBtn.disabled) {
        e.preventDefault();
        completeBtn.click();
      }
    } else if (focused.classList.contains("btn-success")) {
      e.preventDefault();
      focused.click();
    }
  }
  
  // Ctrl+R or F5 = Refresh
  if ((e.ctrlKey && e.key === "r") || e.key === "F5") {
    e.preventDefault();
    load();
  }
});

document.getElementById("refresh").addEventListener("click", load);
load();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.queue || changes.caseTypes)) load();
});