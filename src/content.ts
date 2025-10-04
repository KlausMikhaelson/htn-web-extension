// Content script that runs on all web pages

interface WebsiteVisit {
  url: string;
  hostname: string;
  title: string;
  timestamp: number;
  tabId: number;
}

// Log when content script is loaded
console.log('💰 Money Tracker content script loaded on:', window.location.hostname);
console.log('💰 Script run at:', document.readyState);

// Keywords that indicate checkout/buy buttons
const CHECKOUT_KEYWORDS = [
  'proceed to checkout',
  'checkout',
  'buy now',
  'purchase now',
  'place order',
  'complete order',
  'complete purchase',
  'pay now',
  'confirm order',
  'confirm purchase',
  'proceed to payment',
  'continue to checkout',
  'order now',
  'continue to payment',
  'go to checkout',
  'place your order',
  'submit order'
];

// Function to check if text matches checkout keywords
function isCheckoutButton(text: string): boolean {
  const lowerText = text.toLowerCase().trim();
  
  // Must be a reasonable button text length (not entire page content)
  if (lowerText.length > 100) {
    return false;
  }
  
  // Check if the text matches our keywords
  // Use exact match or word boundary matching to avoid false positives
  return CHECKOUT_KEYWORDS.some(keyword => {
    // Exact match
    if (lowerText === keyword) {
      return true;
    }
    
    // Check if keyword appears as a complete phrase (with word boundaries)
    const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'i');
    return regex.test(lowerText);
  });
}

// Function to create and show warning overlay
function showWarningOverlay(buttonElement: HTMLElement): void {
  // Check if overlay already exists
  if (document.getElementById('money-tracker-warning-overlay')) {
    return;
  }

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'money-tracker-warning-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease;
  `;

  // Create warning content
  const content = document.createElement('div');
  content.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40px;
    border-radius: 20px;
    max-width: 500px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    animation: slideIn 0.4s ease;
  `;

  content.innerHTML = `
    <div style="font-size: 80px; margin-bottom: 20px;">💰</div>
    <h1 style="color: white; font-size: 32px; margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      Hold Up! 🛑
    </h1>
    <p style="color: white; font-size: 20px; margin: 0 0 30px 0; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      You need to <strong>save money</strong>, bro!<br>
      Don't buy this right now. 💸
    </p>
    <div style="display: flex; gap: 15px; justify-content: center;">
      <button id="money-tracker-cancel" style="
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 2px solid white;
        padding: 15px 30px;
        font-size: 16px;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        ✅ You're Right, I'll Save
      </button>
      <button id="money-tracker-proceed" style="
        background: rgba(255, 59, 48, 0.8);
        color: white;
        border: 2px solid rgba(255, 59, 48, 1);
        padding: 15px 30px;
        font-size: 16px;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        ❌ I Still Want to Buy
      </button>
    </div>
  `;

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from { transform: translateY(-50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    #money-tracker-cancel:hover {
      background: rgba(255, 255, 255, 0.3) !important;
      transform: scale(1.05);
    }
    #money-tracker-proceed:hover {
      background: rgba(255, 59, 48, 1) !important;
      transform: scale(1.05);
    }
  `;
  document.head.appendChild(style);

  // Handle button clicks
  const cancelBtn = document.getElementById('money-tracker-cancel');
  const proceedBtn = document.getElementById('money-tracker-proceed');

  cancelBtn?.addEventListener('click', () => {
    overlay.remove();
    console.log('💰 User chose to save money!');
  });

  proceedBtn?.addEventListener('click', () => {
    overlay.remove();
    console.log('💸 User proceeded with purchase');
    
    // Restore original functionality and trigger it
    if (buttonElement.tagName === 'A') {
      const link = buttonElement as HTMLAnchorElement;
      const originalHref = link.getAttribute('data-original-href');
      if (originalHref) {
        window.location.href = originalHref;
      }
    } else if (buttonElement.tagName === 'BUTTON' || buttonElement.tagName === 'INPUT') {
      const button = buttonElement as HTMLButtonElement | HTMLInputElement;
      const originalType = button.getAttribute('data-original-type');
      if (originalType) {
        button.type = originalType;
      }
      
      // Restore onclick if it existed
      const originalOnclick = button.getAttribute('data-original-onclick');
      if (originalOnclick) {
        try {
          // eslint-disable-next-line no-eval
          eval(originalOnclick);
        } catch (e) {
          console.error('Error restoring onclick:', e);
        }
      }
      
      // Try to submit the form if it's a submit button
      if (originalType === 'submit') {
        const form = button.closest('form');
        if (form) {
          form.submit();
        }
      }
    }
  });

  // Close on Escape key
  const escapeHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

// Track which elements we've already processed
const processedElements = new WeakSet<HTMLElement>();

// Function to intercept button clicks
function interceptCheckoutButtons(): void {
  // Find all clickable elements (buttons, links, divs with click handlers)
  const clickableElements = document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');

  clickableElements.forEach((element) => {
    const htmlElement = element as HTMLElement;
    
    // Skip if already processed
    if (processedElements.has(htmlElement)) {
      return;
    }
    
    const text = htmlElement.textContent || htmlElement.getAttribute('value') || htmlElement.getAttribute('aria-label') || '';
    
    if (isCheckoutButton(text)) {
      console.log('🛒 Checkout button detected:', text.trim());
      
      // Mark as processed
      processedElements.add(htmlElement);
      
      // For links, remove href to prevent navigation
      if (htmlElement.tagName === 'A') {
        const link = htmlElement as HTMLAnchorElement;
        link.setAttribute('data-original-href', link.href);
        link.removeAttribute('href');
        link.style.cursor = 'pointer';
      }
      
      // Disable the button/input
      if (htmlElement.tagName === 'BUTTON' || htmlElement.tagName === 'INPUT') {
        const button = htmlElement as HTMLButtonElement | HTMLInputElement;
        button.setAttribute('data-original-type', button.type);
        button.type = 'button'; // Prevent form submission
      }
      
      // Add multiple event listeners to catch everything
      const interceptHandler = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        console.log('🚫 Intercepted checkout button click!');
        showWarningOverlay(htmlElement);
        
        return false;
      };
      
      // Add listeners for all event phases
      htmlElement.addEventListener('click', interceptHandler, true); // Capture phase
      htmlElement.addEventListener('click', interceptHandler, false); // Bubble phase
      htmlElement.addEventListener('mousedown', interceptHandler, true);
      htmlElement.addEventListener('mouseup', interceptHandler, true);
      
      // Override onclick if it exists
      if (htmlElement.onclick) {
        htmlElement.setAttribute('data-original-onclick', htmlElement.onclick.toString());
        htmlElement.onclick = null;
      }
    }
  });
}

// Global click interceptor - runs BEFORE everything else
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  
  // Check if the clicked element or any parent is a checkout button
  let element: HTMLElement | null = target;
  
  // Walk up the DOM tree to find if we clicked on or inside a checkout button
  // But only check clickable elements (buttons, links, etc.)
  while (element && element !== document.body) {
    const tagName = element.tagName;
    
    // Only check actual clickable elements
    if (tagName === 'BUTTON' || tagName === 'A' || 
        element.getAttribute('role') === 'button' ||
        (tagName === 'INPUT' && (element as HTMLInputElement).type === 'button') ||
        (tagName === 'INPUT' && (element as HTMLInputElement).type === 'submit')) {
      
      // Get the text from this specific element only
      const text = element.textContent || element.getAttribute('value') || element.getAttribute('aria-label') || '';
      
      if (isCheckoutButton(text)) {
        console.log('🚫 Global interceptor caught checkout button click!', text.trim());
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        showWarningOverlay(element);
        return false;
      }
    }
    
    element = element.parentElement;
  }
}, true); // Use capture phase to run FIRST

// Also intercept mousedown for extra safety
document.addEventListener('mousedown', (e) => {
  const target = e.target as HTMLElement;
  let element: HTMLElement | null = target;
  
  while (element && element !== document.body) {
    const tagName = element.tagName;
    
    // Only check actual clickable elements
    if (tagName === 'BUTTON' || tagName === 'A' || 
        element.getAttribute('role') === 'button' ||
        (tagName === 'INPUT' && (element as HTMLInputElement).type === 'button') ||
        (tagName === 'INPUT' && (element as HTMLInputElement).type === 'submit')) {
      
      const text = element.textContent || element.getAttribute('value') || element.getAttribute('aria-label') || '';
      
      if (isCheckoutButton(text)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    }
    
    element = element.parentElement;
  }
}, true);

// Function to initialize the extension
function initializeExtension() {
  // Run interception on page load
  interceptCheckoutButtons();

  // Re-run when DOM changes (for dynamically loaded buttons)
  const observer = new MutationObserver((mutations) => {
    let shouldRecheck = false;
    
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        shouldRecheck = true;
      }
    });
    
    if (shouldRecheck) {
      interceptCheckoutButtons();
    }
  });

  // Start observing
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

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
