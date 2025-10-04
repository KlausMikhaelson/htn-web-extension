// Content script that runs on all web pages

interface WebsiteVisit {
  url: string;
  hostname: string;
  title: string;
  timestamp: number;
  tabId: number;
}

// Log when content script is loaded
console.log('Money Tracker content script loaded on:', window.location.hostname);

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'WEBSITE_DETECTED') {
    const websiteData: WebsiteVisit = message.data;
    console.log('Website detected:', websiteData);
    
    // You can add custom logic here to detect specific shopping sites
    // or financial websites for future money tracking features
    detectWebsiteType(websiteData);
    
    sendResponse({ received: true });
  }
  return true;
});

// Function to detect the type of website (for future money tracking features)
function detectWebsiteType(websiteData: WebsiteVisit): void {
  const hostname = websiteData.hostname.toLowerCase();
  
  // Shopping sites
  const shoppingSites = [
    'amazon.com', 'ebay.com', 'walmart.com', 'target.com', 
    'bestbuy.com', 'etsy.com', 'aliexpress.com', 'shopify.com'
  ];
  
  // Financial sites
  const financialSites = [
    'paypal.com', 'stripe.com', 'venmo.com', 'cashapp.com',
    'mint.com', 'chase.com', 'bankofamerica.com', 'wellsfargo.com'
  ];
  
  // Subscription services
  const subscriptionSites = [
    'netflix.com', 'spotify.com', 'hulu.com', 'disney.com',
    'youtube.com', 'twitch.tv', 'amazon.com/prime'
  ];
  
  let websiteType = 'general';
  
  if (shoppingSites.some(site => hostname.includes(site))) {
    websiteType = 'shopping';
    console.log('🛒 Shopping site detected:', hostname);
  } else if (financialSites.some(site => hostname.includes(site))) {
    websiteType = 'financial';
    console.log('💳 Financial site detected:', hostname);
  } else if (subscriptionSites.some(site => hostname.includes(site))) {
    websiteType = 'subscription';
    console.log('📺 Subscription service detected:', hostname);
  }
  
  // Store the website type for future use
  chrome.storage.local.get(['websiteTypes']).then((result) => {
    const websiteTypes = result.websiteTypes || {};
    websiteTypes[hostname] = websiteType;
    chrome.storage.local.set({ websiteTypes });
  });
}

// Notify background script that content script is ready
chrome.runtime.sendMessage({
  type: 'CONTENT_SCRIPT_READY',
  url: window.location.href,
  hostname: window.location.hostname
}).catch(() => {
  // Background script might not be ready yet
  console.log('Background script not ready');
});
