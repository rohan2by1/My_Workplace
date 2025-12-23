const QUEUE_KEY = "queue";
const HISTORY_KEY = "history";
const TYPES_KEY = "caseTypes";

async function get(key) {
  const r = await chrome.storage.local.get([key]);
  return r[key] || null;
}

async function set(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

async function init() {
  const q = await get(QUEUE_KEY);
  const h = await get(HISTORY_KEY);
  const t = await get(TYPES_KEY);
  if (!Array.isArray(q)) await set(QUEUE_KEY, []);
  if (!Array.isArray(h)) await set(HISTORY_KEY, []);
  if (!Array.isArray(t)) await set(TYPES_KEY, ["Other", "Claim Reason", "Counterfeit", "Seller Status", "MSS Check", "ASIN Check", "Return Request", "Abort-PIV", "Abort-MULTI", "Abort-NEW" , "Abort-OTHER", "Investigation", "Escalation", "Appeal", "Follow-Up", "Documentation", "Refund", "Replacement", "Shipping Issue" , "Payment Issue", "Feedback Removal", "Account Health", "Policy Violation", "Seller Issue Refund", "General Inquiry"]);
}

function nowIso() {
  return new Date().toISOString();
}

async function addToQueueIfUnique(url, openedAt) {
  const [queue, history] = await Promise.all([get(QUEUE_KEY), get(HISTORY_KEY)]);
  const exists = (Array.isArray(queue) ? queue : []).some(x => x.url === url) || (Array.isArray(history) ? history : []).some(x => x.url === url);
  if (exists) return false;
  const item = { url, openedAt, caseType: "" };
  const next = (Array.isArray(queue) ? queue : []);
  next.push(item);
  await set(QUEUE_KEY, next);
  return true;
}

async function updateCaseType(url, caseType) {
  const queue = await get(QUEUE_KEY);
  const history = await get(HISTORY_KEY);
  let updated = false;
  if (Array.isArray(queue)) {
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].url === url) {
        queue[i].caseType = caseType;
        updated = true;
        break;
      }
    }
    if (updated) await set(QUEUE_KEY, queue);
  }
  if (!updated && Array.isArray(history)) {
    for (let i = 0; i < history.length; i++) {
      if (history[i].url === url) {
        history[i].caseType = caseType;
        updated = true;
        break;
      }
    }
    if (updated) await set(HISTORY_KEY, history);
  }
  return updated;
}

async function markCompleted(url) {
  const queue = await get(QUEUE_KEY);
  const history = await get(HISTORY_KEY);
  if (!Array.isArray(queue)) return false;
  const idx = queue.findIndex(x => x.url === url);
  if (idx === -1) return false;
  const item = queue[idx];
  if (!item.caseType || !item.caseType.trim()) return false;
  queue.splice(idx, 1);
  const completedAt = nowIso();
  const nextHistory = Array.isArray(history) ? history : [];
  nextHistory.push({ ...item, completedAt });
  await Promise.all([set(QUEUE_KEY, queue), set(HISTORY_KEY, nextHistory)]);
  return true;
}

async function removeQueueItem(url) {
  const queue = await get(QUEUE_KEY);
  if (!Array.isArray(queue)) return false;
  const next = queue.filter(x => x.url !== url);
  const changed = next.length !== queue.length;
  if (changed) await set(QUEUE_KEY, next);
  return changed;
}

async function removeHistoryItem(url, openedAt) {
  const history = await get(HISTORY_KEY);
  if (!Array.isArray(history)) return false;
  const next = history.filter(x => !(x.url === url && x.openedAt === openedAt));
  const changed = next.length !== history.length;
  if (changed) await set(HISTORY_KEY, next);
  return changed;
}

async function addCaseType(name) {
  const types = await get(TYPES_KEY);
  const arr = Array.isArray(types) ? types : [];
  if (arr.includes(name)) return false;
  arr.push(name);
  await set(TYPES_KEY, arr);
  return true;
}

async function removeCaseType(name) {
  const types = await get(TYPES_KEY);
  const arr = Array.isArray(types) ? types : [];
  const next = arr.filter(x => x !== name);
  const changed = next.length !== arr.length;
  if (changed) await set(TYPES_KEY, next);
  return changed;
}

// --- NEW: Rename Case Type ---
async function renameCaseType(oldName, newName) {
  const types = await get(TYPES_KEY);
  const queue = await get(QUEUE_KEY);
  const history = await get(HISTORY_KEY);
  
  const arr = Array.isArray(types) ? types : [];
  const idx = arr.indexOf(oldName);
  
  if (idx === -1) return false;
  if (arr.includes(newName)) return false; // Prevent duplicate
  
  // Update type name
  arr[idx] = newName;
  
  // Update queue items with this type
  if (Array.isArray(queue)) {
    queue.forEach(item => {
      if (item.caseType === oldName) {
        item.caseType = newName;
      }
    });
  }
  
  // Update history items with this type
  if (Array.isArray(history)) {
    history.forEach(item => {
      if (item.caseType === oldName) {
        item.caseType = newName;
      }
    });
  }
  
  await Promise.all([
    set(TYPES_KEY, arr),
    set(QUEUE_KEY, queue || []),
    set(HISTORY_KEY, history || [])
  ]);
  
  return true;
}

// --- NEW: Reorder Case Types ---
async function reorderCaseTypes(newOrder) {
  if (!Array.isArray(newOrder)) return false;
  await set(TYPES_KEY, newOrder);
  return true;
}

// --- NEW: Restore Backup ---
async function restoreBackup(data) {
  if (!data) return false;
  
  const promises = [];
  
  if (Array.isArray(data.queue)) {
    promises.push(set(QUEUE_KEY, data.queue));
  }
  if (Array.isArray(data.history)) {
    promises.push(set(HISTORY_KEY, data.history));
  }
  if (Array.isArray(data.caseTypes)) {
    promises.push(set(TYPES_KEY, data.caseTypes));
  }
  
  await Promise.all(promises);
  return true;
}

// --- NEW: Clear Queue ---
async function clearQueue() {
  await set(QUEUE_KEY, []);
  return true;
}

// --- NEW: Reset All Data ---
async function resetAll() {
  await Promise.all([
    set(QUEUE_KEY, []),
    set(HISTORY_KEY, []),
    set(TYPES_KEY, [])
  ]);
  return true;
}

chrome.runtime.onInstalled.addListener(() => {
  init();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handle = async () => {
    switch (message.type) {
      case "CAPTURE_LINK": {
        const url = message.url;
        const openedAt = message.openedAt || nowIso();
        const added = await addToQueueIfUnique(url, openedAt);
        return { ok: true, added };
      }
      
      case "UPDATE_CASE_TYPE": {
        const updated = await updateCaseType(message.url, message.caseType);
        return { ok: updated };
      }
      
      case "MARK_COMPLETED": {
        const done = await markCompleted(message.url);
        return { ok: done };
      }
      
      case "REMOVE_QUEUE_ITEM": {
        const done = await removeQueueItem(message.url);
        return { ok: done };
      }
      
      case "REMOVE_HISTORY_ITEM": {
        const done = await removeHistoryItem(message.url, message.openedAt);
        return { ok: done };
      }
      
      case "ADD_CASE_TYPE": {
        const ok = await addCaseType(message.name);
        return { ok };
      }
      
      case "REMOVE_CASE_TYPE": {
        const ok = await removeCaseType(message.name);
        return { ok };
      }
      
      // --- NEW MESSAGE HANDLERS ---
      
      case "RENAME_CASE_TYPE": {
        const ok = await renameCaseType(message.oldName, message.newName);
        return { ok };
      }
      
      case "REORDER_CASE_TYPES": {
        const ok = await reorderCaseTypes(message.order);
        return { ok };
      }
      
      case "RESTORE_BACKUP": {
        const ok = await restoreBackup(message.data);
        return { ok };
      }
      
      case "CLEAR_QUEUE": {
        const ok = await clearQueue();
        return { ok };
      }
      
      case "CLEAR_HISTORY": {
        await set(HISTORY_KEY, []);
        return { ok: true };
      }
      
      case "RESET_ALL": {
        const ok = await resetAll();
        return { ok };
      }
      
      case "GET_DATA": {
        const [queue, history, caseTypes] = await Promise.all([
          get(QUEUE_KEY),
          get(HISTORY_KEY),
          get(TYPES_KEY)
        ]);
        return { 
          queue: queue || [], 
          history: history || [], 
          caseTypes: caseTypes || [] 
        };
      }
      
      default:
        return { ok: false, error: "Unknown message type" };
    }
  };
  
  handle().then(r => sendResponse(r));
  return true;
});

chrome.action.onClicked.addListener(() => {
  const url = chrome.runtime.getURL("pages/queued.html");
  
  chrome.tabs.query({ url }, (tabs) => {
    if (tabs && tabs.length > 0) {
      const tab = tabs[0];
      chrome.tabs.update(tab.id, { active: true });
      chrome.windows.update(tab.windowId, { focused: true });
    } else {
      chrome.tabs.create({ url });
    }
  });
});