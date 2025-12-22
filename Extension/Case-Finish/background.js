// Listen for tab updates to detect when lobby page is focused/loaded
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Check for both EU and NA lobby URLs
  const isLobbyPage = tab.url?.includes('paragon-eu.amazon.com/hz/lo') || 
                      tab.url?.includes('paragon-na.amazon.com/hz/lo');
  
  if (changeInfo.status === 'complete' && isLobbyPage) {
    const data = await chrome.storage.local.get(['waitingForNotification']);
    
    if (data.waitingForNotification) {
      console.log('[Background] Lobby loaded, telling it to watch for notification');
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action: 'watchNotification' });
      }, 1000);
    }
  }
});

// Listen for tab activation (switching tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    
    const isLobbyPage = tab.url?.includes('paragon-eu.amazon.com/hz/lo') || 
                        tab.url?.includes('paragon-na.amazon.com/hz/lo');
    
    if (isLobbyPage) {
      const data = await chrome.storage.local.get(['waitingForNotification']);
      
      if (data.waitingForNotification) {
        console.log('[Background] Switched to lobby tab, watching for notification');
        chrome.tabs.sendMessage(activeInfo.tabId, { action: 'watchNotification' });
      }
    }
  } catch (e) {
    console.log('[Background] Error:', e);
  }
});

// Listen for tab close - when case tab closes, activate lobby
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const data = await chrome.storage.local.get(['waitingForNotification']);
  
  if (data.waitingForNotification) {
    // Find lobby tab and activate it
    const tabs = await chrome.tabs.query({ url: ['https://paragon-eu.amazon.com/hz/lo*', 'https://paragon-na.amazon.com/hz/lo*'] });
    
    if (tabs.length > 0) {
      console.log('[Background] Case tab closed, switching to lobby');
      chrome.tabs.update(tabs[0].id, { active: true });
      
      setTimeout(() => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'watchNotification' });
      }, 500);
    }
  }
});
