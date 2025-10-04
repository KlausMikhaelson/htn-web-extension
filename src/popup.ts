// Popup script for displaying current website information

interface WebsiteVisit {
  url: string;
  hostname: string;
  title: string;
  timestamp: number;
  tabId: number;
}

// Function to format timestamp
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Function to get website type icon
function getWebsiteIcon(hostname: string): string {
  const lower = hostname.toLowerCase();
  
  if (lower.includes('amazon') || lower.includes('ebay') || lower.includes('shop')) {
    return '🛒';
  }
  if (lower.includes('paypal') || lower.includes('bank') || lower.includes('chase')) {
    return '💳';
  }
  if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('youtube')) {
    return '📺';
  }
  
  return '🌐';
}

// Function to display current website information
async function displayCurrentWebsite(): Promise<void> {
  const contentDiv = document.getElementById('content');
  if (!contentDiv) return;

  try {
    // Get current active tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!activeTab || !activeTab.url) {
      contentDiv.innerHTML = `
        <div class="info-card">
          <div class="label">Status</div>
          <div class="value">No active tab detected</div>
        </div>
      `;
      return;
    }

    // Check if it's a chrome internal page
    if (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://')) {
      contentDiv.innerHTML = `
        <div class="info-card">
          <div class="label">Current Website</div>
          <div class="value">Chrome Internal Page</div>
          <span class="status">System Page</span>
        </div>
      `;
      return;
    }

    const url = new URL(activeTab.url);
    const icon = getWebsiteIcon(url.hostname);

    // Get stored website data
    const result = await chrome.storage.local.get(['currentWebsite', 'visitHistory']);
    const currentWebsite: WebsiteVisit | null = result.currentWebsite;
    const visitHistory: WebsiteVisit[] = result.visitHistory || [];

    // Count visits to this hostname
    const visitCount = visitHistory.filter(visit => 
      visit.hostname === url.hostname
    ).length;

    contentDiv.innerHTML = `
      <div class="info-card">
        <div class="label">Current Website</div>
        <div class="value">${icon} ${url.hostname}</div>
        <span class="status active">Active</span>
      </div>
      
      <div class="info-card">
        <div class="label">Page Title</div>
        <div class="value">${activeTab.title || 'Unknown'}</div>
      </div>
      
      <div class="info-card">
        <div class="label">Full URL</div>
        <div class="value" style="font-size: 12px; opacity: 0.9;">${activeTab.url}</div>
      </div>
      
      <div class="info-card">
        <div class="label">Visit Statistics</div>
        <div class="value">
          ${visitCount} visit${visitCount !== 1 ? 's' : ''} to this site
        </div>
        ${currentWebsite ? `
          <div style="font-size: 12px; opacity: 0.8; margin-top: 8px;">
            Last detected: ${formatTimestamp(currentWebsite.timestamp)}
          </div>
        ` : ''}
      </div>
    `;
  } catch (error) {
    console.error('Error displaying website info:', error);
    contentDiv.innerHTML = `
      <div class="info-card">
        <div class="label">Error</div>
        <div class="value">Could not load website information</div>
      </div>
    `;
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  displayCurrentWebsite();
  
  // Refresh every 2 seconds to keep info updated
  setInterval(displayCurrentWebsite, 2000);
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    displayCurrentWebsite();
  }
});

chrome.tabs.onActivated.addListener(() => {
  displayCurrentWebsite();
});
