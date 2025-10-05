# Automatic API Sync - Now Enabled! 🚀

## What Changed

The extension now **automatically syncs purchases to your API** when users click "Proceed Anyway"!

## How It Works

### Flow

```
User clicks checkout → Warning shown → User clicks "Proceed Anyway" →
Purchase detected → Stored locally → API sync triggered automatically →
Success: marked as "synced" | Failure: stays "pending" for retry
```

### Code Changes

1. **Added API import** to `background.ts`
2. **Created `syncPurchaseToAPI()` function** - handles API calls
3. **Updated PURCHASE_DETECTED handler** - calls sync automatically
4. **Error handling** - keeps purchases as "pending" if API fails

## Testing

### 1. Make Sure Your API is Running

```bash
# If running locally
cd your-backend-folder
npm start
# Should be running on http://localhost:3000
```

### 2. Update API URL (if needed)

Edit `src/api.ts` line 3:

```typescript
const API_BASE_URL = 'http://localhost:3000/api';
// or your production URL:
// const API_BASE_URL = 'https://your-api.com/api';
```

If you changed it, rebuild:
```bash
npm run build
```

### 3. Reload Extension

1. Go to `chrome://extensions/`
2. Click **Reload** button on Money Tracker

### 4. Test Purchase Flow

1. **Sign in to the extension** (if not already)
   - Navigate to your webapp
   - Open extension popup
   - Click "Sign In"

2. **Go to a shopping site** (Amazon, eBay, etc.)

3. **Click a "Buy Now" button**
   - Warning overlay should appear

4. **Click "Proceed Anyway"**

5. **Open browser console** (F12) and look for:
   ```
   💸 Purchase detected: {website: "amazon.com", ...}
   Purchase event stored locally
   🔄 Syncing purchase to API: {...}
   ✅ Purchase synced to API: {success: true, purchase: {...}}
   ```

6. **Check your backend logs** - should see the POST request

### 5. Verify in Extension Popup

1. Open extension popup
2. Should see "Pending Purchases" section
3. Purchase should show `status: "synced"` (check in console)

## What Gets Sent to API

Currently sends:

```json
{
  "item_name": "Purchase from amazon.com",
  "price": 0,
  "website": "amazon.com",
  "url": "https://amazon.com/checkout",
  "purchase_date": "2025-10-05T11:21:00.000Z",
  "userEmail": "user@example.com",
  "metadata": {
    "detected_by": "extension",
    "purchase_id": "1728123456789"
  }
}
```

**Note:** `price` is currently `0` because we're not extracting it from the page yet.

## Console Messages

### Success Flow

```
💸 Purchase detected: {website: "amazon.com", url: "...", timestamp: 1728123456789}
Purchase event stored locally
🔄 Syncing purchase to API: {id: "1728123456789", website: "amazon.com", ...}
✅ Purchase synced to API: {success: true, purchase: {id: "507f...", category: "shopping", ...}}
```

### If User Not Authenticated

```
💸 Purchase detected: {...}
Purchase event stored locally
User not authenticated, skipping API sync
```

### If API Call Fails

```
💸 Purchase detected: {...}
Purchase event stored locally
🔄 Syncing purchase to API: {...}
❌ Failed to sync purchase to API: Error: Failed to add purchase
```

Purchase stays as `status: "pending"` and can be retried later.

## Debugging

### Check if API is Reachable

Open browser console and run:

```javascript
fetch('http://localhost:3000/api/purchases/add', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    item_name: "Test",
    price: 99.99,
    website: "test.com",
    userEmail: "test@example.com"
  })
})
.then(r => r.json())
.then(d => console.log('API Response:', d))
.catch(e => console.error('API Error:', e));
```

### Check CORS Settings

If you see CORS errors, make sure your backend allows:

```javascript
// In your backend
app.use(cors({
  origin: 'chrome-extension://*', // Allow extension
  credentials: true
}));
```

### Check Network Tab

1. Open DevTools (F12)
2. Go to **Network** tab
3. Click "Proceed Anyway" on a purchase
4. Look for POST request to `/api/purchases/add`
5. Check request/response details

### Common Issues

**"User not authenticated"**
- Make sure you signed in via the extension
- Check: `chrome.storage.local.get(['user'])` in console
- Should have `email` field

**"Failed to fetch"**
- API not running
- Wrong API URL in `src/api.ts`
- CORS not configured

**"Network error"**
- Check if API is on HTTPS (if extension is on HTTPS)
- Check firewall settings
- Try with `http://localhost:3000` instead of `127.0.0.1`

**No console messages**
- Extension not reloaded
- Content script not loaded
- Check background service worker console

## Viewing Background Console

To see the background script console (where API calls happen):

1. Go to `chrome://extensions/`
2. Find "Money Tracker"
3. Click "service worker" link (or "background page")
4. Opens DevTools for background script
5. You'll see the sync messages here

## Next Steps

### Extract Actual Purchase Data

Currently sending placeholder data. To extract real data:

1. **Add page scraping** to content script
2. **Send extracted data** with PURCHASE_DETECTED message
3. **Use real data** in API call

Example in `src/content.ts`:

```typescript
// Extract purchase details from page
function extractPurchaseDetails() {
  // Site-specific extraction
  if (window.location.hostname.includes('amazon.com')) {
    return {
      item_name: document.querySelector('#productTitle')?.textContent?.trim(),
      price: parseFloat(document.querySelector('.a-price-whole')?.textContent?.replace(',', '') || '0'),
      description: document.querySelector('#feature-bullets')?.textContent?.trim()
    };
  }
  
  return {
    item_name: document.title,
    price: 0
  };
}

// In proceed button handler
const purchaseDetails = extractPurchaseDetails();
chrome.runtime.sendMessage({
  type: 'PURCHASE_DETECTED',
  data: {
    ...purchaseDetails,  // Include extracted data
    website: window.location.hostname,
    url: window.location.href,
    timestamp: Date.now()
  }
});
```

### Add Retry Logic

For failed syncs, add a retry mechanism:

```typescript
// In background.ts
async function retryPendingPurchases() {
  const result = await chrome.storage.local.get(['pendingPurchases']);
  const pending = (result.pendingPurchases || []).filter((p: any) => p.status === 'pending');
  
  for (const purchase of pending) {
    await syncPurchaseToAPI(purchase);
  }
}

// Retry every 5 minutes
setInterval(retryPendingPurchases, 5 * 60 * 1000);
```

### Add Success Notification

Show a notification when purchase is synced:

```typescript
// After successful sync
chrome.notifications.create({
  type: 'basic',
  iconUrl: 'icons/logo128.png',
  title: 'Purchase Tracked',
  message: `Purchase from ${purchaseData.website} saved!`
});
```

## Testing Checklist

- [ ] Backend API is running
- [ ] API URL is correct in `src/api.ts`
- [ ] Extension rebuilt and reloaded
- [ ] User is signed in to extension
- [ ] Click "Buy Now" shows warning
- [ ] Click "Proceed Anyway"
- [ ] Console shows "🔄 Syncing purchase to API"
- [ ] Console shows "✅ Purchase synced to API"
- [ ] Backend receives POST request
- [ ] Purchase appears in database
- [ ] Extension popup shows purchase

## Success! 🎉

Your extension now automatically syncs purchases to your API!

**What happens now:**
1. User proceeds with purchase
2. Extension detects it
3. Stores locally (backup)
4. Sends to API immediately
5. Marks as synced if successful
6. Keeps as pending if failed (for retry)

---

**Ready to test!** Just make sure your API is running and reload the extension.
