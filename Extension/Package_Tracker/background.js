
// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Parent menu
  chrome.contextMenus.create({
    id: "trackParent",
    title: "📦 Track: %s",
    contexts: ["selection"]
  });
  
  // Child menu - USPS
  chrome.contextMenus.create({
    id: "usps",
    parentId: "trackParent",
    title: "🇺🇸 USPS",
    contexts: ["selection"]
  });
  
  // Child menu - UPS
  chrome.contextMenus.create({
    id: "ups",
    parentId: "trackParent",
    title: "🟤 UPS",
    contexts: ["selection"]
  });
  
  console.log("Package Tracker context menu created!");
});

// Handle clicks on menu items
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Clean the tracking number - remove spaces, hyphens, dots
  const trackingNumber = info.selectionText
    .trim()                      // Remove leading/trailing spaces
    .replace(/[\s\-\.]/g, '')    // Remove spaces, hyphens, dots
    .toUpperCase();              // Convert to uppercase
  
  console.log('Original text:', info.selectionText);
  console.log('Cleaned number:', trackingNumber);
  
  let url;
  
  // Just open the URL directly - no validation
  switch(info.menuItemId) {
    case "usps":
      url = `https://tools.usps.com/go/TrackConfirmAction?tRef=fullpage&tLc=2&text28777=&tLabels=${trackingNumber}%2C&tABt=false`;
      break;
      
    case "ups":
      url = `https://www.ups.com/track?tracknum=${trackingNumber}`;
      break;
  }
  
  if (url) {
    console.log('Opening URL:', url);
    chrome.tabs.create({
      url: url,
      active: true
    });
  }
});
