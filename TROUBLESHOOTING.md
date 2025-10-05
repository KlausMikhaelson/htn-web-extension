# Troubleshooting Guide

## Quick Checklist

### 1. Extension Reloaded?
- Go to `chrome://extensions/`
- Find "Money Tracker"
- Click the **Reload** button (🔄)

### 2. User Signed In?
- Open extension popup
- Should show your user info
- If not, click "Sign In" while on your webapp

### 3. Backend Running?
- Check if your backend is running on `http://localhost:3000`
- Test: Open `http://localhost:3000` in browser

### 4. API Key Configured?
- Check `src/api.ts` line 8
- Should have your actual API key (not 'your_secure_random_key_here')
- Must match `EXTENSION_API_KEY` in backend .env

### 5. User ID Available?
- Open browser console (F12)
- Run: `chrome.storage.local.get(['user'], (r) => console.log(r))`
- Should show user object with `id` field

## Common Issues

### Issue 1: "Buy Now" Button Not Intercepted

**Symptoms:**
- Clicking "Buy Now" goes straight to checkout
- No warning overlay appears

**Debug Steps:**
1. Open console (F12)
2. Look for: `💰 Money Tracker content script loaded`
3. If missing, content script didn't load

**Solutions:**
- Reload extension
- Refresh the webpage
- Check if button text matches keywords
- Try on different site (Amazon, eBay)

**Check Button Text:**
```javascript
// In console, hover over button and run:
$0.textContent
```

### Issue 2: No Roast Message / Regular Warning Only

**Symptoms:**
- Warning appears but no roast message
- No spending breakdown shown

**Debug Steps:**
1. Check console for: `💰 Spending check: {...}`
2. Look for `is_overspending: true`
3. Check if `roast_message` is present

**Solutions:**
- Product price might be 0 (not extracted)
- Backend API not responding
- Check network tab for `/api/purchases/check-spending` request

**Test Manually:**
```javascript
// In console
chrome.storage.local.get(['lastViewedProduct'], (r) => {
  console.log('Product:', r.lastViewedProduct);
});
```

### Issue 3: "I'll Save" Button Not Showing

**Symptoms:**
- Only see "I'll Save" and "Proceed Anyway" buttons
- No green "💰 I'll Save!" button

**Reasons:**
- Not overspending (within budget)
- Product price is 0 or not available
- Product wasn't tracked on product page

**Solutions:**
1. Visit product page first
2. Wait 2 seconds for tracking
3. Check console for: `📦 Product detected`
4. Then go to checkout

### Issue 4: API Errors

**Symptoms:**
- Console shows errors like "Failed to fetch"
- "User not authenticated" errors
- 401 Unauthorized errors

**Debug Steps:**
1. Check API key matches:
```javascript
// Extension: src/api.ts line 8
const API_KEY = 'abc123...';

// Backend: .env
EXTENSION_API_KEY=abc123...
```

2. Check user ID:
```javascript
chrome.storage.local.get(['user'], (r) => {
  console.log('User ID:', r.user?.id);
});
```

3. Test API directly:
```bash
curl -X POST http://localhost:3000/api/purchases/check-spending \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key_here" \
  -d '{"user_id":"user_123","item_name":"Test","price":150}'
```

**Solutions:**
- Update API key in extension
- Rebuild: `npm run build`
- Reload extension
- Restart backend

### Issue 5: Success Notification Not Showing

**Symptoms:**
- Click "💰 I'll Save!" but no notification appears
- Console shows error

**Debug Steps:**
1. Check console for errors
2. Look for: `✅ Savings added: {...}`
3. Check network tab for `/api/goals/add-savings` request

**Solutions:**
- User might not have savings goals
- Initialize goals: Sign out and sign in again
- Check backend has `/api/goals/add-savings` endpoint

## Step-by-Step Debug Process

### Test 1: Content Script Loading
```javascript
// Open any webpage
// Open console (F12)
// Should see:
💰 Money Tracker content script loaded on: amazon.com
💰 Script run at: complete
💰 URL: https://www.amazon.com/...
💰 Installing global click interceptors...
💰 Global interceptors installed!
```

### Test 2: Product Tracking
```javascript
// Visit a product page (e.g., Amazon product)
// Wait 2 seconds
// Check console:
📦 Product detected: {item_name: "...", price: 99.99, ...}
✅ Product info stored

// Verify:
chrome.storage.local.get(['lastViewedProduct'], (r) => {
  console.log(r.lastViewedProduct);
});
```

### Test 3: Button Interception
```javascript
// Click "Buy Now" button
// Should see:
🔘 Button clicked: Buy Now
💰 Spending check: {...}
🚫 INTERCEPTED checkout button: Buy Now
```

### Test 4: Spending Check
```javascript
// If overspending, should see:
💰 Spending check: {
  is_overspending: true,
  roast_message: "...",
  spent_today: 85,
  daily_limit: 100,
  new_total: 184.99
}
```

### Test 5: Savings
```javascript
// Click "💰 I'll Save!"
// Should see:
💰 User chose to save and add to goals!
✅ Savings added: {
  success: true,
  goals_updated: [...]
}
```

## Network Tab Debugging

### Check API Calls

1. Open DevTools (F12)
2. Go to **Network** tab
3. Click "Buy Now"
4. Look for these requests:

**Request 1: Check Spending**
```
POST /api/purchases/check-spending
Headers: x-api-key: ...
Body: {user_id: "...", item_name: "...", price: 99.99}
```

**Request 2: Add Savings** (if you click "I'll Save!")
```
POST /api/goals/add-savings
Headers: x-api-key: ...
Body: {user_id: "...", amount: 99.99, distribution: "equal"}
```

### Check Response Status

- **200 OK** - Success ✅
- **400 Bad Request** - Missing fields or invalid data
- **401 Unauthorized** - API key mismatch
- **404 Not Found** - Endpoint doesn't exist
- **500 Server Error** - Backend error

## Background Service Worker Console

To see background script logs:

1. Go to `chrome://extensions/`
2. Find "Money Tracker"
3. Click **"service worker"** link
4. Opens DevTools for background script
5. See API sync messages here

## Complete Test Flow

### 1. Setup
```bash
# Backend running?
curl http://localhost:3000

# API key set?
# Check src/api.ts line 8
# Check backend .env EXTENSION_API_KEY
```

### 2. Sign In
```
1. Go to your webapp
2. Sign in
3. Open extension popup
4. Click "Sign In"
5. Should see: ✅ Goals initialized for user
```

### 3. Test Product Tracking
```
1. Go to Amazon product page
2. Wait 2 seconds
3. Check console: 📦 Product detected
4. Verify: chrome.storage.local.get(['lastViewedProduct'])
```

### 4. Test Interception
```
1. Click "Buy Now" or "Add to Cart"
2. Should see warning overlay
3. Check if roast message appears (if overspending)
```

### 5. Test Savings
```
1. Click "💰 I'll Save!" (if available)
2. Should see success notification
3. Check console: ✅ Savings added
```

## Still Not Working?

### Collect Debug Info

Run this in console and share output:

```javascript
// Check extension state
chrome.storage.local.get(null, (data) => {
  console.log('=== Extension Storage ===');
  console.log('User:', data.user);
  console.log('Authenticated:', data.isAuthenticated);
  console.log('Last Product:', data.lastViewedProduct);
  console.log('Pending Purchases:', data.pendingPurchases);
});

// Check current page
console.log('=== Page Info ===');
console.log('URL:', window.location.href);
console.log('Hostname:', window.location.hostname);

// Check for content script
console.log('=== Content Script ===');
console.log('Overlay exists:', !!document.getElementById('money-tracker-warning-overlay'));
console.log('Pet exists:', !!document.getElementById('money-tracker-pet'));
```

### Common Fixes

1. **Clear extension storage:**
```javascript
chrome.storage.local.clear(() => {
  console.log('Storage cleared');
  // Sign in again
});
```

2. **Rebuild extension:**
```bash
npm run build
```

3. **Hard reload extension:**
- Remove extension
- Re-add from dist folder

4. **Check backend logs:**
- Look for incoming requests
- Check for errors

5. **Try incognito mode:**
- Enable extension in incognito
- Test there

## Contact Points

If still stuck, provide:
1. Console logs (both page and background)
2. Network tab screenshot
3. Extension storage dump
4. Backend logs
5. Which step fails

---

**Most common issue:** API key not matching between extension and backend!
