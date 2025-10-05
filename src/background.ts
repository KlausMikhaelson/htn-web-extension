// Background service worker for tracking website visits
import { addPurchase } from './api';

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

interface UserData {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string;
  imageUrl?: string;
  createdAt: number;
}

// Check if user is authenticated
async function isUserAuthenticated(): Promise<boolean> {
  const result = await chrome.storage.local.get(['isAuthenticated']);
  return result.isAuthenticated === true;
}

// Function to sync purchase to API
async function syncPurchaseToAPI(purchaseData: any): Promise<void> {
  try {
    // Check if user is authenticated
    const authenticated = await isUserAuthenticated();
    if (!authenticated) {
      console.log('User not authenticated, skipping API sync');
      return;
    }

    console.log('🔄 Syncing purchase to API:', purchaseData);

    // Prepare API payload
    const apiPayload: any = {
      item_name: purchaseData.item_name || `Purchase from ${purchaseData.website}`,
      price: purchaseData.price || 0,
      website: purchaseData.website,
      url: purchaseData.url,
      purchase_date: new Date(purchaseData.timestamp).toISOString(),
      metadata: {
        detected_by: 'extension',
        purchase_id: purchaseData.id
      }
    };

    // Add optional fields if present
    if (purchaseData.currency) {
      apiPayload.currency = purchaseData.currency;
    }
    if (purchaseData.description) {
      apiPayload.description = purchaseData.description;
    }

    console.log('📤 API Payload:', apiPayload);

    // Send to API
    const result = await addPurchase(apiPayload);

    console.log('✅ Purchase synced to API:', result);

    // Update purchase status to synced
    const pending = await chrome.storage.local.get(['pendingPurchases']);
    const updated = (pending.pendingPurchases || []).map((p: any) =>
      p.id === purchaseData.id ? { ...p, status: 'synced', apiId: result.purchase?.id } : p
    );
    await chrome.storage.local.set({ pendingPurchases: updated });

  } catch (error) {
    console.error('❌ Failed to sync purchase to API:', error);
    console.error('Error details:', error);
    // Keep as pending so it can be retried later
  }
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
  
  if (message.type === 'CHECK_AUTH') {
    isUserAuthenticated().then((authenticated) => {
      sendResponse({ authenticated });
    });
    return true;
  }
  
  if (message.type === 'GET_USER') {
    chrome.storage.local.get(['user']).then((result) => {
      sendResponse(result.user || null);
    });
    return true;
  }
  
  if (message.type === 'USER_AUTHENTICATED') {
    console.log('User authenticated:', message.user);
    // You can add additional logic here when user authenticates
    sendResponse({ success: true });
    return true;
  }
  
  if (message.type === 'SIGN_OUT') {
    chrome.storage.local.remove(['user', 'isAuthenticated', 'lastSync']).then(() => {
      console.log('User signed out');
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.type === 'PURCHASE_DETECTED') {
    console.log('💸 Purchase detected:', message.data);
    
    const purchaseEvent = {
      ...message.data,
      id: Date.now().toString(),
      status: 'pending'
    };
    
    // Store purchase event locally
    chrome.storage.local.get(['pendingPurchases']).then(async (result) => {
      const pendingPurchases = result.pendingPurchases || [];
      pendingPurchases.push(purchaseEvent);
      
      await chrome.storage.local.set({ pendingPurchases });
      console.log('Purchase event stored locally');
      
      // Sync to API automatically
      syncPurchaseToAPI(purchaseEvent);
    });
    
    sendResponse({ success: true });
    return true;
  }
  
  if (message.type === 'GET_PENDING_PURCHASES') {
    chrome.storage.local.get(['pendingPurchases']).then((result) => {
      sendResponse(result.pendingPurchases || []);
    });
    return true;
  }
  
  if (message.type === 'CLEAR_PENDING_PURCHASES') {
    chrome.storage.local.set({ pendingPurchases: [] }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.type === 'CHECK_SPENDING') {
    console.log('💰 Checking spending for:', message.data);
    
    // Import and call checkSpending
    import('./api').then(async (api) => {
      try {
        const result = await api.checkSpending(message.data.item_name, message.data.price);
        sendResponse(result);
      } catch (error) {
        console.error('Failed to check spending:', error);
        sendResponse({ is_overspending: false, error: String(error) });
      }
    });
    
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'ADD_SAVINGS') {
    console.log('💰 Adding savings:', message.data);
    
    // Import and call addSavings
    import('./api').then(async (api) => {
      try {
        const productDetails = message.data.productDetails || {};
        const result = await api.addSavings(
          message.data.amount,
          message.data.distribution,
          productDetails
        );
        sendResponse(result);
      } catch (error) {
        console.error('Failed to add savings:', error);
        sendResponse({ success: false, error: String(error) });
      }
    });
    
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'GET_ROAST') {
    console.log('🔥 Getting roast:', message.data);
    
    // Import and call getRoast
    import('./api').then(async (api) => {
      try {
        const result = await api.getRoast(
          message.data.items,
          message.data.amount,
          message.data.goals
        );
        sendResponse(result);
      } catch (error) {
        console.error('Failed to get roast:', error);
        sendResponse({ result: 'Unable to load roast message. Please try again.' });
      }
    });
    
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'GET_GOALS') {
    console.log('🎯 Getting goals');
    
    // Import and call getGoals
    import('./api').then(async (api) => {
      try {
        const result = await api.getGoals();
        sendResponse(result);
      } catch (error) {
        console.error('Failed to get goals:', error);
        sendResponse({ success: false, goals: [] });
      }
    });
    
    return true; // Keep channel open for async response
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
