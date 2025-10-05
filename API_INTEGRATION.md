# API Integration Guide - Money Tracker Extension

## Overview

The Money Tracker extension now includes purchase tracking functionality that integrates with your backend API. When users proceed with a purchase (after seeing the warning), the extension detects and stores the purchase event.

## Current Implementation

### 1. Purchase Detection

The extension detects purchases when:
- User clicks a checkout button (e.g., "Buy Now", "Proceed to Checkout")
- User sees the warning overlay
- User clicks "Proceed Anyway"

### 2. Data Flow

```
User clicks checkout → Warning shown → User proceeds → Purchase detected → Stored locally → Ready for API sync
```

### 3. Stored Data

When a purchase is detected, the extension stores:

```typescript
{
  id: string,              // Unique ID (timestamp)
  website: string,         // e.g., "amazon.com"
  url: string,            // Full URL of the page
  timestamp: number,      // Unix timestamp
  status: 'pending'       // Status indicator
}
```

## API Integration

### API Service Module

Location: `src/api.ts`

The extension includes an API service module with two main functions:

#### 1. Add Purchase

```typescript
import { addPurchase } from './api';

await addPurchase({
  item_name: "Wireless Headphones",
  price: 79.99,
  currency: "USD",
  website: "amazon.com",
  url: "https://amazon.com/product/12345",
  description: "Sony WH-1000XM4",
  purchase_date: "2025-10-05T08:23:56Z",
  metadata: {
    order_id: "112-1234567-1234567"
  }
});
```

#### 2. Get Purchases

```typescript
import { getPurchases } from './api';

const data = await getPurchases({
  limit: 20,
  offset: 0,
  category: 'fashion',
  sort: 'desc'
});
```

### Configuration

**Update API Base URL:**

Edit `src/api.ts` line 2:

```typescript
const API_BASE_URL = 'https://your-api-domain.com/api';
```

For local development:
```typescript
const API_BASE_URL = 'http://localhost:3000/api';
```

## Next Steps to Complete Integration

### Option 1: Automatic API Sync (Recommended)

Add automatic syncing to the background script:

```typescript
// In src/background.ts

import { addPurchase } from './api';

// Add this function
async function syncPurchaseToAPI(purchaseData: any) {
  try {
    const user = await chrome.storage.local.get(['user']);
    
    if (!user.user?.email) {
      console.log('User not authenticated, skipping sync');
      return;
    }

    // You'll need to extract price and item name from the page
    // For now, we'll create a placeholder purchase
    const result = await addPurchase({
      item_name: `Purchase from ${purchaseData.website}`,
      price: 0, // TODO: Extract from page
      website: purchaseData.website,
      url: purchaseData.url,
      purchase_date: new Date(purchaseData.timestamp).toISOString(),
      metadata: {
        detected_by: 'extension',
        purchase_id: purchaseData.id
      }
    });

    console.log('Purchase synced to API:', result);
    
    // Mark as synced
    const pending = await chrome.storage.local.get(['pendingPurchases']);
    const updated = pending.pendingPurchases.map((p: any) => 
      p.id === purchaseData.id ? { ...p, status: 'synced', apiId: result.purchase?.id } : p
    );
    await chrome.storage.local.set({ pendingPurchases: updated });
    
  } catch (error) {
    console.error('Failed to sync purchase:', error);
  }
}

// Update the PURCHASE_DETECTED handler
if (message.type === 'PURCHASE_DETECTED') {
  console.log('💸 Purchase detected:', message.data);
  
  const purchaseEvent = {
    ...message.data,
    id: Date.now().toString(),
    status: 'pending'
  };
  
  // Store locally
  chrome.storage.local.get(['pendingPurchases']).then((result) => {
    const pendingPurchases = result.pendingPurchases || [];
    pendingPurchases.push(purchaseEvent);
    chrome.storage.local.set({ pendingPurchases });
  });
  
  // Sync to API
  syncPurchaseToAPI(purchaseEvent);
  
  sendResponse({ success: true });
  return true;
}
```

### Option 2: Manual Sync from Popup

Add a "Sync to API" button in the popup:

```typescript
// In src/popup.ts

import { addPurchase } from './api';

// Add sync button to pending purchases section
html += `
  <button id="sync-purchases-btn" style="...">
    Sync to API
  </button>
`;

// Add handler
const syncBtn = document.getElementById('sync-purchases-btn');
syncBtn?.addEventListener('click', async () => {
  const response = await chrome.runtime.sendMessage({ type: 'GET_PENDING_PURCHASES' });
  const pendingPurchases = response || [];
  
  for (const purchase of pendingPurchases) {
    try {
      await addPurchase({
        item_name: `Purchase from ${purchase.website}`,
        price: 0,
        website: purchase.website,
        url: purchase.url,
        purchase_date: new Date(purchase.timestamp).toISOString()
      });
      console.log('Synced:', purchase);
    } catch (error) {
      console.error('Failed to sync:', error);
    }
  }
  
  alert('Purchases synced!');
});
```

## Extracting Purchase Details

To get actual purchase details (price, item name, etc.), you'll need to:

### 1. Add Page Scraping

Create a content script function to extract purchase data:

```typescript
// In src/content.ts

function extractPurchaseDetails(): any {
  // This is site-specific - you'll need to customize for each site
  
  // Example for Amazon
  if (window.location.hostname.includes('amazon.com')) {
    return {
      item_name: document.querySelector('#productTitle')?.textContent?.trim(),
      price: parseFloat(document.querySelector('.a-price-whole')?.textContent?.replace(',', '') || '0'),
      currency: 'USD',
      description: document.querySelector('#feature-bullets')?.textContent?.trim()
    };
  }
  
  // Example for generic sites
  return {
    item_name: document.title,
    price: 0,
    currency: 'USD'
  };
}

// Update the proceed button handler
proceedBtn?.addEventListener('click', () => {
  overlay.remove();
  console.log('💸 User proceeded with purchase');
  
  // Extract purchase details
  const purchaseDetails = extractPurchaseDetails();
  
  // Notify background script
  chrome.runtime.sendMessage({
    type: 'PURCHASE_DETECTED',
    data: {
      ...purchaseDetails,
      website: window.location.hostname,
      url: window.location.href,
      timestamp: Date.now()
    }
  }).catch(err => console.log('Could not notify background script:', err));
  
  // ... rest of the code
});
```

### 2. Use AI for Extraction (Advanced)

You could send the page HTML to your backend API for AI-powered extraction:

```typescript
// Send page content to your API for analysis
const pageContent = {
  html: document.documentElement.outerHTML,
  url: window.location.href,
  title: document.title
};

const response = await fetch('https://your-api.com/api/extract-purchase', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(pageContent)
});

const extractedData = await response.json();
```

## Testing

### 1. Test Purchase Detection

1. Navigate to any shopping site (e.g., Amazon)
2. Add item to cart
3. Go to checkout
4. Click "Proceed to Checkout" or similar button
5. See the warning overlay
6. Click "Proceed Anyway"
7. Open extension popup
8. Should see "Pending Purchases" section

### 2. Test API Connection

```typescript
import { testApiConnection } from './api';

const isConnected = await testApiConnection();
console.log('API connected:', isConnected);
```

### 3. Test Manual Purchase Add

```typescript
import { addPurchase } from './api';

const result = await addPurchase({
  item_name: "Test Item",
  price: 99.99,
  website: "test.com",
  currency: "USD"
});

console.log('Purchase added:', result);
```

## API Endpoints Used

### POST /api/purchases/add

Adds a new purchase to the database.

**Request:**
```json
{
  "item_name": "Wireless Headphones",
  "price": 79.99,
  "currency": "USD",
  "website": "amazon.com",
  "url": "https://amazon.com/product/12345",
  "userEmail": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "purchase": {
    "id": "507f1f77bcf86cd799439011",
    "item_name": "Wireless Headphones",
    "price": 79.99,
    "currency": "USD",
    "category": "entertainment",
    "website": "amazon.com"
  }
}
```

### GET /api/purchases/list

Retrieves user's purchases.

**Request:**
```
GET /api/purchases/list?limit=20&offset=0&sort=desc
```

**Response:**
```json
{
  "success": true,
  "purchases": [...],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "has_more": true
  },
  "statistics": {
    "total_purchases": 150,
    "total_spent": 5432.10
  }
}
```

## Authentication

The extension sends the user's email with each API request:

```typescript
const user = await chrome.storage.local.get(['user']);
const email = user.user?.email;

// Include in request
body: JSON.stringify({
  ...purchaseData,
  userEmail: email
})
```

Your backend should:
1. Verify the user exists
2. Associate the purchase with that user
3. Return the created purchase data

## Error Handling

The API module includes error handling:

```typescript
try {
  await addPurchase(data);
} catch (error) {
  console.error('Failed to add purchase:', error);
  // Handle error (show notification, retry, etc.)
}
```

## Future Enhancements

1. **Offline Support**: Queue purchases when offline, sync when online
2. **Smart Extraction**: Use AI to extract purchase details from any site
3. **Receipt Scanning**: OCR for receipt images
4. **Price Tracking**: Track price changes over time
5. **Budget Alerts**: Notify when spending exceeds budget
6. **Category Auto-detection**: Automatically categorize purchases

## Troubleshooting

### "User not authenticated" Error

- Make sure user is signed in via the webapp
- Check that localStorage has `moneyTrackerUser` with email field
- Verify extension has synced the user data

### API Connection Failed

- Check that API_BASE_URL is correct
- Verify your backend is running
- Check CORS settings on your backend
- Look at browser console for network errors

### Purchases Not Syncing

- Check browser console for errors
- Verify user email is being sent
- Test API endpoint directly with curl/Postman
- Check backend logs for errors

## Summary

The extension is now ready for API integration! You just need to:

1. ✅ Update `API_BASE_URL` in `src/api.ts`
2. ✅ Choose sync strategy (automatic or manual)
3. ✅ Optionally add purchase detail extraction
4. ✅ Test with your backend API
5. ✅ Deploy!

The basic infrastructure is in place - purchases are being detected and stored locally. You can now connect it to your backend whenever you're ready.
