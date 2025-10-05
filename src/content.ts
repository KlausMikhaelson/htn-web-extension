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
console.log('💰 URL:', window.location.href);

// Keywords that indicate checkout/buy buttons
const CHECKOUT_KEYWORDS = [
  // Checkout variations
  'proceed to checkout',
  'checkout',
  'go to checkout',
  'continue to checkout',
  
  // Buy variations
  'buy now',
  'buy it now',
  'buy',
  'purchase now',
  'purchase',
  
  // Order variations
  'place order',
  'place your order',
  'complete order',
  'order now',
  'submit order',
  'confirm order',
  
  // Payment variations
  'pay now',
  'proceed to payment',
  'continue to payment',
  'make payment',
  
  // Purchase variations
  'complete purchase',
  'confirm purchase',
  
  // Add to cart (sometimes triggers checkout)
  'add to cart',
  'add to bag'
];

// Function to check if text matches checkout keywords
function isCheckoutButton(text: string): boolean {
  const lowerText = text.toLowerCase().trim();
  
  // Must be a reasonable button text length (not entire page content)
  if (lowerText.length > 100) {
    return false;
  }
  
  // Remove extra whitespace and special characters for better matching
  const cleanText = lowerText.replace(/\s+/g, ' ').replace(/[^\w\s]/g, '');
  
  // Check if the text matches our keywords
  return CHECKOUT_KEYWORDS.some(keyword => {
    const cleanKeyword = keyword.replace(/\s+/g, ' ');
    
    // Exact match
    if (cleanText === cleanKeyword) {
      return true;
    }
    
    // Check if keyword appears as a complete phrase (with word boundaries)
    const regex = new RegExp(`\\b${cleanKeyword.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(cleanText)) {
      return true;
    }
    
    // Also check original text for cases where cleaning removed important chars
    const originalRegex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'i');
    return originalRegex.test(lowerText);
  });
}

// Install global interceptors IMMEDIATELY
console.log('💰 Installing global click interceptors...');

// IMMEDIATE global click interceptor - runs BEFORE everything else
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  let element: HTMLElement | null = target;
  
  while (element && element !== document.body) {
    const tagName = element.tagName;
    
    if (tagName === 'BUTTON' || tagName === 'A' || 
        element.getAttribute('role') === 'button' ||
        (tagName === 'INPUT' && (element as HTMLInputElement).type === 'button') ||
        (tagName === 'INPUT' && (element as HTMLInputElement).type === 'submit')) {
      
      const text = element.textContent || element.getAttribute('value') || element.getAttribute('aria-label') || '';
      
      // Log all button clicks for debugging
      if (text && text.trim().length > 0 && text.trim().length < 50) {
        console.log('🔘 Button clicked:', text.trim());
      }
      
      if (isCheckoutButton(text)) {
        console.log('🚫 INTERCEPTED checkout button:', text.trim());
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Show warning overlay
        showWarningOverlay(element);
        return false;
      }
    }
    
    element = element.parentElement;
  }
}, true); // Capture phase

// Also intercept mousedown
document.addEventListener('mousedown', (e) => {
  const target = e.target as HTMLElement;
  let element: HTMLElement | null = target;
  
  while (element && element !== document.body) {
    const tagName = element.tagName;
    
    if (tagName === 'BUTTON' || tagName === 'A' || 
        element.getAttribute('role') === 'button' ||
        (tagName === 'INPUT' && (element as HTMLInputElement).type === 'button') ||
        (tagName === 'INPUT' && (element as HTMLInputElement).type === 'submit')) {
      
      const text = element.textContent || element.getAttribute('value') || element.getAttribute('aria-label') || '';
      
      if (isCheckoutButton(text)) {
        console.log('🚫 INTERCEPTED mousedown on checkout button');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    }
    
    element = element.parentElement;
  }
}, true);

console.log('💰 Global interceptors installed!');

// Function to extract product information from the current page
function extractProductInfo(): any {
  const hostname = window.location.hostname.toLowerCase();
  let productInfo: any = {
    url: window.location.href,
    website: hostname,
    timestamp: Date.now()
  };

  // Amazon
  if (hostname.includes('amazon.com')) {
    productInfo.item_name = document.querySelector('#productTitle')?.textContent?.trim() || 
                            document.querySelector('h1.product-title')?.textContent?.trim();
    
    const priceWhole = document.querySelector('.a-price-whole')?.textContent?.replace(/[^0-9]/g, '');
    const priceFraction = document.querySelector('.a-price-fraction')?.textContent;
    if (priceWhole) {
      productInfo.price = parseFloat(`${priceWhole}.${priceFraction || '00'}`);
    }
    
    productInfo.currency = 'USD';
    productInfo.description = document.querySelector('#feature-bullets')?.textContent?.trim()?.substring(0, 500);
  }
  
  // eBay
  else if (hostname.includes('ebay.com')) {
    productInfo.item_name = document.querySelector('h1.x-item-title__mainTitle')?.textContent?.trim() ||
                            document.querySelector('.it-ttl')?.textContent?.trim();
    
    const priceText = document.querySelector('.x-price-primary')?.textContent?.trim() ||
                      document.querySelector('.notranslate')?.textContent?.trim();
    if (priceText) {
      const match = priceText.match(/[\d,]+\.?\d*/);
      if (match) {
        productInfo.price = parseFloat(match[0].replace(/,/g, ''));
      }
    }
    
    productInfo.currency = 'USD';
  }
  
  // Walmart
  else if (hostname.includes('walmart.com')) {
    productInfo.item_name = document.querySelector('h1[itemprop="name"]')?.textContent?.trim();
    
    const priceText = document.querySelector('[itemprop="price"]')?.textContent?.trim();
    if (priceText) {
      productInfo.price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
    }
    
    productInfo.currency = 'USD';
  }
  
  // Generic fallback - try common selectors
  else {
    // Try to find product name
    productInfo.item_name = document.querySelector('h1')?.textContent?.trim()?.substring(0, 200) ||
                            document.querySelector('.product-name')?.textContent?.trim() ||
                            document.querySelector('.product-title')?.textContent?.trim() ||
                            document.title;
    
    // Try to find price
    const priceSelectors = [
      '[itemprop="price"]',
      '.price',
      '.product-price',
      '[class*="price"]',
      '[id*="price"]'
    ];
    
    for (const selector of priceSelectors) {
      const priceEl = document.querySelector(selector);
      if (priceEl) {
        const priceText = priceEl.textContent?.trim();
        const match = priceText?.match(/[\d,]+\.?\d*/);
        if (match) {
          productInfo.price = parseFloat(match[0].replace(/,/g, ''));
          break;
        }
      }
    }
    
    productInfo.currency = 'USD';
  }

  // Only return if we found at least a name
  if (productInfo.item_name && productInfo.item_name.length > 0) {
    // Default price to 0 if not found
    if (!productInfo.price || isNaN(productInfo.price)) {
      productInfo.price = 0;
    }
    
    console.log('📦 Product detected:', productInfo);
    return productInfo;
  }

  return null;
}

// Function to detect if current page is a product page
function isProductPage(): boolean {
  const url = window.location.href.toLowerCase();
  const hostname = window.location.hostname.toLowerCase();
  
  // Check for common product page patterns
  const productPatterns = [
    '/dp/',           // Amazon
    '/gp/product/',   // Amazon
    '/itm/',          // eBay
    '/p/',            // Walmart, Target
    '/product/',      // Generic
    '/item/',         // Generic
  ];
  
  // Check if URL matches product patterns
  if (productPatterns.some(pattern => url.includes(pattern))) {
    return true;
  }
  
  // Check for shopping sites
  const shoppingSites = ['amazon', 'ebay', 'walmart', 'target', 'bestbuy', 'etsy'];
  if (shoppingSites.some(site => hostname.includes(site))) {
    // Check if page has product-like elements
    const hasProductTitle = document.querySelector('h1[itemprop="name"]') ||
                           document.querySelector('#productTitle') ||
                           document.querySelector('.product-title');
    const hasPrice = document.querySelector('[itemprop="price"]') ||
                    document.querySelector('.price') ||
                    document.querySelector('[class*="price"]');
    
    if (hasProductTitle || hasPrice) {
      return true;
    }
  }
  
  return false;
}

// Track product pages and store product info
function trackProductPage(): void {
  if (isProductPage()) {
    const productInfo = extractProductInfo();
    
    if (productInfo) {
      // Store product info in chrome storage
      chrome.storage.local.get(['recentProducts']).then((result) => {
        const recentProducts = result.recentProducts || [];
        
        // Add to recent products (keep last 10)
        recentProducts.unshift(productInfo);
        if (recentProducts.length > 10) {
          recentProducts.pop();
        }
        
        chrome.storage.local.set({ 
          recentProducts,
          lastViewedProduct: productInfo // Store the most recent one
        });
        
        console.log('✅ Product info stored');
      });
    }
  }
}

// Track product page on load
setTimeout(trackProductPage, 2000); // Wait 2 seconds for page to load

// Re-track if page changes (for SPAs)
let lastUrl = window.location.href;
setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    setTimeout(trackProductPage, 2000);
  }
}, 1000);

// Function to create floating pet button
function createFloatingPet(): void {
  // Check if pet already exists
  if (document.getElementById('money-tracker-pet')) {
    console.log('Pet already exists, skipping creation');
    return;
  }

  console.log('Creating floating pet button');

  // Create pet button
  const pet = document.createElement('div');
  pet.id = 'money-tracker-pet';
  pet.style.cssText = `
    position: fixed;
    right: 20px;
    bottom: 20px;
    width: 60px;
    height: 60px;
    background: #0a0a0a;
    border: 1px solid #1a1a1a;
    border-radius: 50%;
    z-index: 999998;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 28px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    transition: all 0.2s ease;
  `;

  pet.innerHTML = '💰';

  // Hover effect
  pet.addEventListener('mouseenter', () => {
    pet.style.transform = 'scale(1.1)';
    pet.style.background = '#111111';
  });

  pet.addEventListener('mouseleave', () => {
    pet.style.transform = 'scale(1)';
    pet.style.background = '#0a0a0a';
  });

  // Click to open widget
  pet.addEventListener('click', () => {
    console.log('Pet clicked, opening widget');
    pet.remove();
    createFloatingWidget();
  });

  document.body.appendChild(pet);
  console.log('Pet button added to page');
}

// Store interval ID for widget updates
let widgetUpdateInterval: number | null = null;

// Function to create floating widget
function createFloatingWidget(): void {
  // Check if widget already exists
  if (document.getElementById('money-tracker-widget')) {
    return;
  }

  // Create widget container
  const widget = document.createElement('div');
  widget.id = 'money-tracker-widget';
  widget.style.cssText = `
    position: fixed;
    right: 20px;
    bottom: 20px;
    width: 280px;
    background: #0a0a0a;
    border: 1px solid #1a1a1a;
    border-radius: 4px;
    padding: 16px;
    z-index: 999998;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    color: #ffffff;
  `;

  // Widget content
  widget.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <div style="font-size: 14px; font-weight: 500; color: #ffffff;">Money Tracker</div>
      <button id="money-tracker-widget-close" style="
        background: transparent;
        border: none;
        color: #666666;
        cursor: pointer;
        font-size: 18px;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">×</button>
    </div>
    <div id="money-tracker-widget-content" style="font-size: 12px; color: #888888;">
      <div style="margin-bottom: 8px;">
        <div style="color: #666666; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">Current Site</div>
        <div style="color: #ffffff; font-size: 13px;" id="widget-hostname">Loading...</div>
      </div>
      <div style="margin-bottom: 8px;">
        <div style="color: #666666; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">Open Tabs</div>
        <div style="color: #ffffff; font-size: 13px;" id="widget-tab-count">-</div>
      </div>
      <div>
        <div style="color: #666666; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">Status</div>
        <div style="color: #ffffff; font-size: 13px;">Monitoring</div>
      </div>
    </div>
  `;

  document.body.appendChild(widget);

  // Close button handler
  const closeBtn = document.getElementById('money-tracker-widget-close');
  closeBtn?.addEventListener('click', () => {
    // Clear the update interval
    if (widgetUpdateInterval !== null) {
      clearInterval(widgetUpdateInterval);
      widgetUpdateInterval = null;
    }
    
    // Remove widget
    widget.remove();
    
    // Show pet again
    console.log('Creating pet after widget close');
    createFloatingPet();
  });

  // Update widget content
  updateWidgetContent();
  
  // Update every 2 seconds
  widgetUpdateInterval = window.setInterval(updateWidgetContent, 2000);
}

// Function to update widget content
async function updateWidgetContent(): Promise<void> {
  const hostnameEl = document.getElementById('widget-hostname');
  const tabCountEl = document.getElementById('widget-tab-count');

  if (hostnameEl) {
    hostnameEl.textContent = window.location.hostname;
  }

  try {
    const result = await chrome.storage.local.get(['activeTabs']);
    const activeTabs = result.activeTabs || [];
    if (tabCountEl) {
      tabCountEl.textContent = `${activeTabs.length} tab${activeTabs.length !== 1 ? 's' : ''}`;
    }
  } catch (error) {
    console.error('Error updating widget:', error);
  }
}

// Function to create and show warning overlay
async function showWarningOverlay(buttonElement: HTMLElement): Promise<void> {
  // Check if overlay already exists
  if (document.getElementById('money-tracker-warning-overlay')) {
    return;
  }

  // Get product info to check spending
  const storage = await chrome.storage.local.get(['lastViewedProduct']);
  const productInfo = storage.lastViewedProduct;
  
  let spendingCheck: any = null;
  let isOverspending = false;
  
  // Check spending if we have product info
  if (productInfo && productInfo.item_name && productInfo.price > 0) {
    try {
      // Import checkSpending dynamically
      const { checkSpending } = await import(chrome.runtime.getURL('api.js'));
      spendingCheck = await checkSpending(productInfo.item_name, productInfo.price);
      isOverspending = spendingCheck.is_overspending;
      console.log('💰 Spending check:', spendingCheck);
    } catch (error) {
      console.error('Failed to check spending:', error);
      // Continue without spending check
    }
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
    background: #000000;
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease;
  `;

  // Create warning content
  const content = document.createElement('div');
  content.style.cssText = `
    background: #0a0a0a;
    padding: 50px 60px;
    border-radius: 4px;
    max-width: 600px;
    text-align: center;
    border: 1px solid ${isOverspending ? '#4a1a1a' : '#1a1a1a'};
    animation: ${isOverspending ? 'shake 0.5s ease, slideIn 0.3s ease' : 'slideIn 0.3s ease'};
  `;

  // Build content HTML
  let contentHTML = '';
  
  if (isOverspending && spendingCheck) {
    // Show roast message
    contentHTML = `
      <div style="font-size: 48px; margin-bottom: 16px;">🔥</div>
      <h1 style="color: #ff6b6b; font-size: 28px; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 500; letter-spacing: -0.5px;">
        Whoa there, big spender!
      </h1>
      
      <div style="background: #2a0a0a; border: 1px solid #4a1a1a; border-radius: 4px; padding: 16px; margin-bottom: 24px;">
        <p style="color: #ff6b6b; font-size: 14px; margin: 0; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${spendingCheck.roast_message || "You're about to overspend!"}
        </p>
      </div>
      
      <div style="background: #1a1a1a; border-radius: 4px; padding: 16px; margin-bottom: 24px; text-align: left;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #888888; font-size: 13px;">Spent today:</span>
          <span style="color: #ffffff; font-size: 13px; font-weight: 500;">$${spendingCheck.spent_today.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #888888; font-size: 13px;">This purchase:</span>
          <span style="color: #ffffff; font-size: 13px; font-weight: 500;">$${productInfo.price.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #888888; font-size: 13px;">New total:</span>
          <span style="color: #ff6b6b; font-size: 13px; font-weight: 500;">$${spendingCheck.new_total.toFixed(2)}</span>
        </div>
        <div style="height: 1px; background: #333333; margin: 12px 0;"></div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888888; font-size: 13px;">Daily limit:</span>
          <span style="color: #888888; font-size: 13px;">$${spendingCheck.daily_limit.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 8px;">
          <span style="color: #ff6b6b; font-size: 13px; font-weight: 500;">Over budget:</span>
          <span style="color: #ff6b6b; font-size: 13px; font-weight: 500;">$${(spendingCheck.overspend_amount || 0).toFixed(2)}</span>
        </div>
      </div>
    `;
  } else {
    // Show regular warning
    contentHTML = `
      <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 500; letter-spacing: -0.5px;">
        You need to save money
      </h1>
      <p style="color: #888888; font-size: 16px; margin: 0 0 40px 0; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 400;">
        Don't buy this right now
      </p>
    `;
  }
  
  contentHTML += `
    <div style="display: flex; gap: 12px; justify-content: center;">
      <button id="money-tracker-cancel" style="
        background: #ffffff;
        color: #000000;
        border: none;
        padding: 12px 24px;
        font-size: 14px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.15s;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        I'll Save
      </button>
      <button id="money-tracker-proceed" style="
        background: transparent;
        color: ${isOverspending ? '#ff6b6b' : '#666666'};
        border: 1px solid ${isOverspending ? '#4a1a1a' : '#333333'};
        padding: 12px 24px;
        font-size: 14px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.15s;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        ${isOverspending ? 'Buy Anyway' : 'Proceed Anyway'}
      </button>
    </div>
  `;
  
  content.innerHTML = contentHTML;

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
      from { transform: translateY(-10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
      20%, 40%, 60%, 80% { transform: translateX(10px); }
    }
    #money-tracker-cancel:hover {
      background: #e6e6e6 !important;
    }
    #money-tracker-proceed:hover {
      background: #1a1a1a !important;
      color: #888888 !important;
      border-color: #444444 !important;
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

  proceedBtn?.addEventListener('click', async () => {
    overlay.remove();
    console.log('💸 User proceeded with purchase');
    
    // Get the last viewed product info
    const storage = await chrome.storage.local.get(['lastViewedProduct']);
    const productInfo = storage.lastViewedProduct;
    
    // Prepare purchase data
    const purchaseData: any = {
      website: window.location.hostname,
      url: window.location.href,
      timestamp: Date.now()
    };
    
    // If we have product info, include it
    if (productInfo) {
      purchaseData.item_name = productInfo.item_name;
      purchaseData.price = productInfo.price || 0;
      purchaseData.currency = productInfo.currency || 'USD';
      purchaseData.description = productInfo.description;
      console.log('📦 Using stored product info:', productInfo);
    } else {
      // Try to extract from current page
      const currentProduct = extractProductInfo();
      if (currentProduct) {
        purchaseData.item_name = currentProduct.item_name;
        purchaseData.price = currentProduct.price || 0;
        purchaseData.currency = currentProduct.currency || 'USD';
        purchaseData.description = currentProduct.description;
        console.log('📦 Extracted product info from current page');
      } else {
        // Fallback to page title
        purchaseData.item_name = document.title || `Purchase from ${window.location.hostname}`;
        purchaseData.price = 0;
        purchaseData.currency = 'USD';
        console.log('⚠️ No product info found, using fallback');
      }
    }
    
    // Notify background script about purchase with product data
    chrome.runtime.sendMessage({
      type: 'PURCHASE_DETECTED',
      data: purchaseData
    }).catch(err => console.log('Could not notify background script:', err));
    
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

// Function to initialize the extension
function initializeExtension() {
  // Create floating pet button
  createFloatingPet();
  
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
