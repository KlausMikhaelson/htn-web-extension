// Background service worker for tracking website visits

interface WebsiteVisit {
  url: string;
  hostname: string;
  title: string;
  timestamp: number;
  tabId: number;
}

interface StoredData {
  currentWebsite: WebsiteVisit | null;
  visitHistory: WebsiteVisit[];
}

// Listen for tab activation (when user switches tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('Tab activated:', activeInfo.tabId);
  await updateCurrentWebsite(activeInfo.tabId);
});

// Listen for tab updates (when URL changes or page loads)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    console.log('Tab updated:', tabId, tab.url);
    await updateCurrentWebsite(tabId);
  }
});

// Listen for window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    const [activeTab] = await chrome.tabs.query({ active: true, windowId });
    if (activeTab?.id) {
      await updateCurrentWebsite(activeTab.id);
    }
  }
});

// Function to update the current website information
async function updateCurrentWebsite(tabId: number): Promise<void> {
  try {
    const tab = await chrome.tabs.get(tabId);
    
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      console.log('Skipping chrome internal page');
      return;
    }

    const url = new URL(tab.url);
    const websiteVisit: WebsiteVisit = {
      url: tab.url,
      hostname: url.hostname,
      title: tab.title || 'Unknown',
      timestamp: Date.now(),
      tabId: tabId
    };

    // Store current website
    await chrome.storage.local.set({ currentWebsite: websiteVisit });
    
    // Add to visit history
    const result = await chrome.storage.local.get(['visitHistory']);
    const visitHistory: WebsiteVisit[] = result.visitHistory || [];
    visitHistory.push(websiteVisit);
    
    // Keep only last 100 visits to avoid storage issues
    if (visitHistory.length > 100) {
      visitHistory.shift();
    }
    
    await chrome.storage.local.set({ visitHistory });

    console.log('Updated current website:', websiteVisit);
    
    // Send message to content script
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'WEBSITE_DETECTED',
        data: websiteVisit
      });
    } catch (error) {
      // Content script might not be ready yet, that's okay
      console.log('Could not send message to content script:', error);
    }
  } catch (error) {
    console.error('Error updating current website:', error);
  }
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_CURRENT_WEBSITE') {
    chrome.storage.local.get(['currentWebsite']).then((result) => {
      sendResponse(result.currentWebsite || null);
    });
    return true; // Keep the message channel open for async response
  }
  
  if (message.type === 'GET_VISIT_HISTORY') {
    chrome.storage.local.get(['visitHistory']).then((result) => {
      sendResponse(result.visitHistory || []);
    });
    return true;
  }
});

// Initialize on extension install/update
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Money Tracker Extension installed');
  
  // Get the current active tab
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.id) {
    await updateCurrentWebsite(activeTab.id);
  }
});

console.log('Background service worker initialized');
