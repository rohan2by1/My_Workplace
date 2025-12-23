(() => {
  // Guard clause to prevent duplicate execution
  if (window.hasCapturedLink) return;
  window.hasCapturedLink = true;

  const url = location.href;
  
  chrome.runtime.sendMessage({ 
    type: "CAPTURE_LINK", 
    url, 
    openedAt: new Date().toISOString() 
  });
})();