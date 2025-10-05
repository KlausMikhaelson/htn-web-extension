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

interface UserData {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string;
  imageUrl?: string;
  createdAt: number;
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

// Function to check authentication and redirect if needed
async function checkAuthentication(): Promise<boolean> {
  const response = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });
  return response.authenticated;
}

// Function to display authentication required screen
function displayAuthRequired(): void {
  const contentDiv = document.getElementById('content');
  if (!contentDiv) return;

  contentDiv.innerHTML = `
    <div class="info-card" style="text-align: center; padding: 30px 20px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🔒</div>
      <div class="label" style="margin-bottom: 8px;">Authentication Required</div>
      <div class="value" style="margin-bottom: 20px; font-size: 13px; color: #888888;">
        Please sign in to use Money Tracker
      </div>
      <button id="sign-in-btn" style="
        background: #ffffff;
        color: #000000;
        border: none;
        padding: 12px 24px;
        font-size: 14px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        Sign In
      </button>
    </div>
  `;

  const signInBtn = document.getElementById('sign-in-btn');
  signInBtn?.addEventListener('click', async () => {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.id) {
        alert('Unable to access current tab');
        return;
      }

      // Inject script to read localStorage from the webpage
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return localStorage.getItem('moneyTrackerUser');
        }
      });

      const userDataStr = results[0]?.result;

      if (!userDataStr) {
        alert('No user data found. Please sign in on your webapp first.');
        return;
      }

      // Parse and save user data
      const userData = JSON.parse(userDataStr);
      
      if (!userData.email) {
        alert('Invalid user data. Email is required.');
        return;
      }

      // Save to chrome storage
      await chrome.storage.local.set({
        user: userData,
        isAuthenticated: true,
        lastSync: Date.now()
      });

      // Refresh the popup
      displayAllTabs();
      
    } catch (error) {
      console.error('Error reading user data:', error);
      alert('Failed to read user data. Make sure you are on your webapp and signed in.');
    }
  });
}

// Function to display user info
async function displayUserInfo(): Promise<void> {
  const contentDiv = document.getElementById('content');
  if (!contentDiv) return;

  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_USER' });
    const user: UserData | null = response;

    if (!user) {
      displayAuthRequired();
      return;
    }

    const userName = user.name || 
      (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null) ||
      user.firstName || 
      user.email.split('@')[0];

    let html = `
      <div class="info-card" style="margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          ${user.imageUrl ? `<img src="${user.imageUrl}" alt="Profile" style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 1px solid #1a1a1a;
          ">` : `<div style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #1a1a1a;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
          ">👤</div>`}
          <div style="flex: 1;">
            <div style="font-size: 14px; font-weight: 500; color: #ffffff; margin-bottom: 2px;">
              ${userName}
            </div>
            <div style="font-size: 11px; color: #666666;">
              ${user.email}
            </div>
          </div>
        </div>
        <button id="sign-out-btn" style="
          background: transparent;
          color: #666666;
          border: 1px solid #333333;
          padding: 8px 16px;
          font-size: 12px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          width: 100%;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          Sign Out
        </button>
      </div>
    `;

    contentDiv.innerHTML = html;

    const signOutBtn = document.getElementById('sign-out-btn');
    signOutBtn?.addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ type: 'SIGN_OUT' });
      displayAuthRequired();
    });
  } catch (error) {
    console.error('Error displaying user info:', error);
  }
}

// Function to display all active tabs
async function displayAllTabs(): Promise<void> {
  const contentDiv = document.getElementById('content');
  if (!contentDiv) return;

  try {
    // Check authentication first
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
      displayAuthRequired();
      return;
    }

    // Display user info first
    await displayUserInfo();

    // Get all active tabs from storage
    const result = await chrome.storage.local.get(['activeTabs', 'visitHistory']);
    const activeTabs: TabInfo[] = result.activeTabs || [];
    const visitHistory: WebsiteVisit[] = result.visitHistory || [];

    if (activeTabs.length === 0) {
      contentDiv.innerHTML += `
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

    contentDiv.innerHTML += html;
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
