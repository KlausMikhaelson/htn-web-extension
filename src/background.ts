// Background service worker for tracking website visits

interface WebsiteVisit {
  url: string;
  hostname: string;
  title: string;
  timestamp: number;
  tabId: number;
}

interface TabInfo {
  tabId: number;
  url: string;
  hostname: string;
  title: string;
  timestamp: number;
  isActive: boolean;
}

interface StoredData {
  currentWebsite: WebsiteVisit | null;
  visitHistory: WebsiteVisit[];
  activeTabs: TabInfo[];
}

// Listen for tab activation (when user switches tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('Tab activated:', activeInfo.tabId);
  await updateCurrentWebsite(activeInfo.tabId);
  await updateAllTabs();
});

// Listen for tab updates (when URL changes or page loads)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('Tab updated:', tabId, tab.url);
    if (tab.active) {
      await updateCurrentWebsite(tabId);
    }
    await updateAllTabs();
  }
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener(async (tabId) => {
  console.log('Tab removed:', tabId);
  await updateAllTabs();
});

// Listen for tab creation
chrome.tabs.onCreated.addListener(async (tab) => {
  console.log('Tab created:', tab.id);
  await updateAllTabs();
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

// Function to update all tabs information
async function updateAllTabs(): Promise<void> {
  try {
    const allTabs = await chrome.tabs.query({});
    const activeTabs: TabInfo[] = [];

    for (const tab of allTabs) {
      if (!tab.id || !tab.url) continue;
      
      // Skip chrome internal pages
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        continue;
      }

      try {
        const url = new URL(tab.url);
        const tabInfo: TabInfo = {
          tabId: tab.id,
          url: tab.url,
          hostname: url.hostname,
          title: tab.title || 'Unknown',
          timestamp: Date.now(),
          isActive: tab.active || false
        };
        activeTabs.push(tabInfo);
      } catch (error) {
        console.log('Error parsing tab URL:', tab.url);
      }
    }

    // Store all active tabs
    await chrome.storage.local.set({ activeTabs });
    console.log('Updated all tabs:', activeTabs.length, 'tabs');
  } catch (error) {
    console.error('Error updating all tabs:', error);
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
  
  if (message.type === 'GET_ALL_TABS') {
    chrome.storage.local.get(['activeTabs']).then((result) => {
      sendResponse(result.activeTabs || []);
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
  
  // Update all tabs
  await updateAllTabs();
});

console.log('Background service worker initialized');
