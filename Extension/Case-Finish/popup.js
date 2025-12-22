document.getElementById('startBtn').addEventListener('click', async () => {
  const timerSeconds = parseInt(document.getElementById('timer').value);
  const statusDiv = document.getElementById('status');
  
  // Store the task info
  await chrome.storage.local.set({
    taskActive: true,
    timer: timerSeconds * 1000,
    waitingForNotification: false
  });
  
  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Check if we're on a case page
  if (tab.url.includes('paragon-na.amazon.com')) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'startTask',
      timer: timerSeconds * 1000
    });
    statusDiv.textContent = `Status: Timer started (${timerSeconds}s)...`;
    statusDiv.classList.add('active');
  } else {
    statusDiv.textContent = 'Status: Please open a Paragon case page first!';
  }
});

document.getElementById('stopBtn').addEventListener('click', async () => {
  await chrome.storage.local.set({
    taskActive: false,
    waitingForNotification: false
  });
  document.getElementById('status').textContent = 'Status: Stopped';
  document.getElementById('status').classList.remove('active');
  
  // Notify all tabs to stop
  const tabs = await chrome.tabs.query({ url: 'https://paragon-na.amazon.com/*' });
  tabs.forEach(tab => {
    chrome.tabs.sendMessage(tab.id, { action: 'stop' });
  });
});

// Update status from storage
async function updateStatusFromStorage() {
  const data = await chrome.storage.local.get(['taskActive', 'waitingForNotification', 'lastStatus']);
  const statusDiv = document.getElementById('status');
  
  if (data.lastStatus) {
    statusDiv.textContent = `Status: ${data.lastStatus}`;
  }
  
  if (data.taskActive || data.waitingForNotification) {
    statusDiv.classList.add('active');
  }
}

updateStatusFromStorage();

// Listen for status updates
chrome.storage.onChanged.addListener((changes) => {
  if (changes.lastStatus) {
    document.getElementById('status').textContent = `Status: ${changes.lastStatus.newValue}`;
  }
});
