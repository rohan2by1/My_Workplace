let taskTimer = null;
let observer = null;
let pollInterval = null;

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Paragon Auto Click] Received:', message, 'on URL:', window.location.href);
  
  if (message.action === 'startTask') {
    startTask(message.timer);
  } else if (message.action === 'watchNotification') {
    watchForNotification();
  } else if (message.action === 'stop') {
    stopAll();
  }
});

// Check on page load if we should be watching
checkOnLoad();

async function checkOnLoad() {
  const data = await chrome.storage.local.get(['waitingForNotification']);
  const isLobbyPage = window.location.href.includes('/hz/lo');
  
  console.log('[Paragon Auto Click] Page loaded:', window.location.href, 'isLobby:', isLobbyPage, 'waiting:', data.waitingForNotification);
  
  if (data.waitingForNotification && isLobbyPage) {
    console.log('[Paragon Auto Click] Auto-starting notification watch...');
    setTimeout(() => watchForNotification(), 1500);
  }
}

function startTask(timerMs) {
  updateStatus(`Waiting ${timerMs/1000} seconds...`);
  console.log('[Paragon Auto Click] Starting timer for', timerMs/1000, 'seconds');
  
  taskTimer = setTimeout(() => {
    clickCompleteButton();
  }, timerMs);
}

function clickCompleteButton() {
  let clicked = false;
  
  // Method 1: Find kat-button with label="Complete"
  const katButton = document.querySelector('kat-button[label="Complete"]');
  if (katButton) {
    // Try clicking the shadow DOM button or inner button
    const shadowRoot = katButton.shadowRoot;
    if (shadowRoot) {
      const shadowButton = shadowRoot.querySelector('button');
      if (shadowButton) {
        shadowButton.click();
        clicked = true;
        console.log('[Paragon Auto Click] Clicked shadow DOM button');
      }
    }
    
    if (!clicked) {
      const innerButton = katButton.querySelector('button');
      if (innerButton) {
        innerButton.click();
        clicked = true;
        console.log('[Paragon Auto Click] Clicked inner button');
      } else {
        katButton.click();
        clicked = true;
        console.log('[Paragon Auto Click] Clicked kat-button directly');
      }
    }
  }
  
  // Method 2: Find button with text "Complete"
  if (!clicked) {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent.trim() === 'Complete') {
        btn.click();
        clicked = true;
        console.log('[Paragon Auto Click] Clicked button by text');
        break;
      }
    }
  }
  
  // Method 3: Find by class
  if (!clicked) {
    const primaryBtn = document.querySelector('button.primary');
    if (primaryBtn && primaryBtn.textContent.includes('Complete')) {
      primaryBtn.click();
      clicked = true;
      console.log('[Paragon Auto Click] Clicked button.primary');
    }
  }
  
  if (clicked) {
    updateStatus('Complete clicked! Waiting for notification on lobby...');
    chrome.storage.local.set({ 
      waitingForNotification: true,
      lastStatus: 'Waiting for notification on lobby...'
    });
  } else {
    updateStatus('ERROR: Complete button not found!');
    console.log('[Paragon Auto Click] Could not find Complete button');
    // Log all buttons for debugging
    console.log('[Paragon Auto Click] Available buttons:', document.querySelectorAll('button'));
    console.log('[Paragon Auto Click] Available kat-buttons:', document.querySelectorAll('kat-button'));
  }
}

function watchForNotification() {
  updateStatus('Watching for notification on lobby...');
  console.log('[Paragon Auto Click] Starting notification watch on:', window.location.href);
  
  // Disconnect previous observer
  if (observer) {
    observer.disconnect();
  }
  if (pollInterval) {
    clearInterval(pollInterval);
  }
  
  // First, check if notification already exists
  if (findAndClickNotification()) {
    return;
  }
  
  // Watch for new notifications using MutationObserver
  observer = new MutationObserver((mutations) => {
    if (findAndClickNotification()) {
      stopWatching();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });
  
  // Also poll every 500ms as backup
  pollInterval = setInterval(() => {
    console.log('[Paragon Auto Click] Polling for notification...');
    if (findAndClickNotification()) {
      stopWatching();
    }
  }, 500);
  
  // Stop after 2 minutes
  setTimeout(() => {
    if (pollInterval) {
      console.log('[Paragon Auto Click] Timeout - stopping notification watch');
      stopWatching();
      updateStatus('Timeout waiting for notification');
    }
  }, 120000);
}

function stopWatching() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function findAndClickNotification() {
  // Log all elements for debugging
  console.log('[Paragon Auto Click] Searching for notification elements...');
  
  // Common notification/toast selectors
  const notificationSelectors = [
    // Kat components (Amazon's component library)
    'kat-alert',
    'kat-toast',
    'kat-notification',
    'kat-modal',
    'kat-popover',
    
    // Generic selectors
    '.toast',
    '.notification',
    '.alert',
    '.snackbar',
    '.banner',
    '.flash',
    '.message',
    '.popup',
    
    // Class contains
    '[class*="toast"]',
    '[class*="notification"]',
    '[class*="alert"]',
    '[class*="snackbar"]',
    '[class*="banner"]',
    '[class*="popup"]',
    '[class*="modal"]',
    
    // Role based
    '[role="alert"]',
    '[role="alertdialog"]',
    '[role="dialog"]'
  ];
  
  for (const selector of notificationSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      
      for (const element of elements) {
        // Check if visible
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        
        if (rect.width === 0 || rect.height === 0) continue;
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
        
        console.log('[Paragon Auto Click] Found visible notification element:', selector, element);
        
        // Look for clickable elements inside
        const clickables = element.querySelectorAll('button, [role="button"], a, kat-button, .btn, .button, [clickable]');
        
        for (const clickable of clickables) {
          const clickableStyle = window.getComputedStyle(clickable);
          if (clickableStyle.display === 'none' || clickableStyle.visibility === 'hidden') continue;
          
          console.log('[Paragon Auto Click] Found clickable in notification:', clickable);
          
          // Click it
          clickable.click();
          
          // Also try clicking shadow DOM if it's a kat-button
          if (clickable.tagName === 'KAT-BUTTON' && clickable.shadowRoot) {
            const shadowBtn = clickable.shadowRoot.querySelector('button');
            if (shadowBtn) shadowBtn.click();
          }
          
          updateStatus('✅ Notification clicked! Task complete.');
          chrome.storage.local.set({ 
            waitingForNotification: false,
            taskActive: false,
            lastStatus: '✅ Task complete!'
          });
          
          return true;
        }
      }
    } catch (e) {
      console.log('[Paragon Auto Click] Error with selector', selector, e);
    }
  }
  
  // Debug: Log what we can see
  logPageElements();
  
  return false;
}

function logPageElements() {
  // This helps us debug what's on the page
  const allElements = document.querySelectorAll('*');
  const interestingElements = [];
  
  allElements.forEach(el => {
    const className = el.className?.toString() || '';
    const tagName = el.tagName?.toLowerCase() || '';
    
    if (tagName.startsWith('kat-') || 
        className.includes('notification') || 
        className.includes('toast') || 
        className.includes('alert') ||
        className.includes('banner') ||
        className.includes('modal') ||
        className.includes('popup')) {
      interestingElements.push({
        tag: tagName,
        class: className,
        id: el.id,
        visible: el.offsetParent !== null
      });
    }
  });
  
  if (interestingElements.length > 0) {
    console.log('[Paragon Auto Click] Interesting elements found:', interestingElements);
  }
}

function stopAll() {
  if (taskTimer) {
    clearTimeout(taskTimer);
    taskTimer = null;
  }
  stopWatching();
  updateStatus('Stopped');
  chrome.storage.local.set({ 
    waitingForNotification: false,
    taskActive: false 
  });
}

function updateStatus(status) {
  console.log('[Paragon Auto Click]', status);
  chrome.storage.local.set({ lastStatus: status });
}
