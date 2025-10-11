// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "checkOrderId",
    title: "🔍 Check Order ID: %s",
    contexts: ["selection"]
  });
  
  console.log("Order ID Checker context menu created!");
});

// Handle clicks on menu item
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "checkOrderId") {
    // Clean the order ID - remove spaces, hyphens, dots
    const orderId = info.selectionText
      .trim()
      .replace(/[\s\-\.]/g, '')
      .toUpperCase();
    
    console.log('Original text:', info.selectionText);
    console.log('Cleaned Order ID:', orderId);
    
    // Build the URL (change to your real domain)
    const url = `https://checkorderid.com/${orderId}/india`;
    
    console.log('Opening URL in background:', url);
    
    // Open in new tab but keep focus on current page
    chrome.tabs.create({
      url: url,
      active: false  // Changed from true to false - stays in background
    });
  }
});
