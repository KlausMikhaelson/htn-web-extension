// Authentication check script - checks for user data from webapp
// The webapp should set user data in localStorage which this extension will read

interface UserData {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string;
  createdAt: number;
}

// Function to show message
function showMessage(message: string, isError: boolean = false): void {
  const messageDiv = document.getElementById('message');
  if (messageDiv) {
    messageDiv.innerHTML = `<div class="${isError ? 'error' : 'success'}">${message}</div>`;
  }
}

// Function to check for user data in localStorage
async function checkUserData(): Promise<void> {
  const loadingDiv = document.getElementById('loading');
  const messageDiv = document.getElementById('message');
  
  try {
    // Check if user data exists in localStorage (set by webapp)
    const userDataStr = localStorage.getItem('moneyTrackerUser');
    
    if (!userDataStr) {
      if (loadingDiv) loadingDiv.style.display = 'none';
      showMessage('No user found. Please sign in on the webapp first.', true);
      return;
    }

    // Parse user data
    const userData: UserData = JSON.parse(userDataStr);
    
    // Validate email exists
    if (!userData.email) {
      if (loadingDiv) loadingDiv.style.display = 'none';
      showMessage('Invalid user data. Email is required.', true);
      return;
    }

    // Save to chrome storage for extension to use
    await chrome.storage.local.set({
      user: userData,
      isAuthenticated: true,
      lastSync: Date.now()
    });

    if (loadingDiv) loadingDiv.style.display = 'none';
    showMessage(`✓ Signed in as ${userData.email}`, false);
    
    console.log('User data synced:', userData);
    
    // Close this tab after 1 second
    setTimeout(() => {
      window.close();
    }, 1000);

  } catch (error) {
    console.error('Error checking user data:', error);
    if (loadingDiv) loadingDiv.style.display = 'none';
    showMessage('Failed to sync user data. Please try again.', true);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  checkUserData();
});
