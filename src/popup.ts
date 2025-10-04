// Popup script for displaying current website information

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

// Function to display all active tabs
async function displayAllTabs(): Promise<void> {
  const contentDiv = document.getElementById('content');
  if (!contentDiv) return;

  try {
    // Get all active tabs from storage
    const result = await chrome.storage.local.get(['activeTabs', 'visitHistory']);
    const activeTabs: TabInfo[] = result.activeTabs || [];
    const visitHistory: WebsiteVisit[] = result.visitHistory || [];

    if (activeTabs.length === 0) {
      contentDiv.innerHTML = `
        <div class="info-card">
          <div class="label">Status</div>
          <div class="value">No tabs detected</div>
        </div>
      `;
      return;
    }

    // Sort tabs: active first, then by title
    const sortedTabs = [...activeTabs].sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return a.title.localeCompare(b.title);
    });

    let html = `
      <div class="info-card" style="margin-bottom: 16px;">
        <div class="label">All Open Tabs</div>
        <div class="value">${activeTabs.length} tab${activeTabs.length !== 1 ? 's' : ''} open</div>
      </div>
    `;

    // Display each tab
    sortedTabs.forEach((tab) => {
      const icon = getWebsiteIcon(tab.hostname);
      const visitCount = visitHistory.filter(visit => 
        visit.hostname === tab.hostname
      ).length;

      html += `
        <div class="tab-card ${tab.isActive ? 'active-tab' : ''}">
          <div class="tab-header">
            <span class="tab-icon">${icon}</span>
            <span class="tab-hostname">${tab.hostname}</span>
            ${tab.isActive ? '<span class="active-badge">Active</span>' : ''}
          </div>
          <div class="tab-title">${tab.title}</div>
          <div class="tab-url">${tab.url}</div>
          <div class="tab-stats">
            <span>Tab ID: ${tab.tabId}</span>
            <span>•</span>
            <span>${visitCount} visit${visitCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      `;
    });

    contentDiv.innerHTML = html;
  } catch (error) {
    console.error('Error displaying tabs:', error);
    contentDiv.innerHTML = `
      <div class="info-card">
        <div class="label">Error</div>
        <div class="value">Could not load tab information</div>
      </div>
    `;
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  displayAllTabs();
  
  // Refresh every 2 seconds to keep info updated
  setInterval(displayAllTabs, 2000);
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    displayAllTabs();
  }
});

chrome.tabs.onActivated.addListener(() => {
  displayAllTabs();
});
