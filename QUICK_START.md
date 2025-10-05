# Money Tracker Extension - Quick Start Guide

## 🚀 What's New

The extension now includes **purchase tracking** that integrates with your backend API!

## ✅ What's Working

1. **User Authentication** - Via localStorage from your webapp
2. **Tab Tracking** - Monitors all open browser tabs
3. **Purchase Detection** - Detects when users click checkout buttons
4. **Warning System** - Shows warning before purchases
5. **Purchase Storage** - Stores detected purchases locally
6. **API Ready** - Ready to sync with your backend

## 📦 Setup

### 1. Build the Extension

```bash
npm install
npm run build
```

### 2. Load in Browser

**Chrome/Edge:**
1. Go to `chrome://extensions/` or `edge://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder
5. Click the **Reload** button after any changes

### 3. Configure Your Webapp

Add this to your webapp's login flow:

```javascript
// After successful login
localStorage.setItem('moneyTrackerUser', JSON.stringify({
  id: user.id,
  email: user.email,
  name: user.name,
  createdAt: Date.now()
}));
```

See `WEBAPP_PROMPT.md` for detailed integration guide.

### 4. Sign In to Extension

1. Navigate to your webapp (where you set localStorage)
2. Open the extension popup
3. Click "Sign In"
4. Extension will sync your user data

## 🎯 How It Works

### Purchase Detection Flow

```
User browses → Clicks "Buy Now" → Warning shown → User proceeds → Purchase detected → Stored locally → Ready for API sync
```

### Current Features

✅ **Automatic Detection**
- Detects checkout buttons on any website
- Keywords: "Buy Now", "Proceed to Checkout", "Place Order", etc.

✅ **Warning Overlay**
- Full-screen warning when user tries to checkout
- "I'll Save" or "Proceed Anyway" options

✅ **Purchase Tracking**
- Stores website, URL, and timestamp
- Shows in extension popup under "Pending Purchases"

✅ **User Management**
- Sign in via webapp localStorage
- User email used as reference for API calls

## 🔌 API Integration

### Quick Setup

**1. Update API URL**

Edit `src/api.ts` line 2:

```typescript
const API_BASE_URL = 'https://your-api.com/api';
// or for local dev:
const API_BASE_URL = 'http://localhost:3000/api';
```

**2. Rebuild**

```bash
npm run build
```

**3. Reload Extension**

Click reload button in `chrome://extensions/`

### API Endpoints

The extension is ready to use these endpoints:

- `POST /api/purchases/add` - Add a purchase
- `GET /api/purchases/list` - Get user's purchases

See `API_INTEGRATION.md` for complete integration guide.

## 📱 Testing

### Test Purchase Detection

1. Go to any shopping site (Amazon, eBay, etc.)
2. Add item to cart
3. Go to checkout
4. Click checkout button
5. See the warning overlay
6. Click "Proceed Anyway"
7. Open extension popup
8. See "Pending Purchases" section

### Test User Authentication

1. Open browser console on your webapp
2. Run:
```javascript
localStorage.setItem('moneyTrackerUser', JSON.stringify({
  id: 'test-123',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: Date.now()
}));
```
3. Open extension popup
4. Click "Sign In"
5. Should show your user info

## 📊 Extension Popup Features

### When Signed In:

- **User Profile** - Shows name, email, profile picture
- **Open Tabs** - Lists all browser tabs with visit counts
- **Pending Purchases** - Shows detected purchases
- **Sign Out** - Clear user data

### Pending Purchases Section:

Shows:
- Website domain
- Full URL
- Timestamp
- "Clear All" button

## 🛠️ Development

### Watch Mode

```bash
npm run dev
```

Auto-rebuilds on file changes.

### File Structure

```
src/
├── api.ts          # API service (add/get purchases)
├── auth.ts         # User authentication sync
├── background.ts   # Background worker (tab tracking, purchase storage)
├── content.ts      # Content script (purchase detection, warnings)
├── popup.ts        # Popup UI
└── ...

public/
├── auth.html       # Auth sync page
├── popup.html      # Popup UI
├── manifest.json   # Extension config
└── ...
```

## 🔄 Next Steps

### Option 1: Automatic API Sync

Add automatic syncing when purchases are detected.

See `API_INTEGRATION.md` → "Option 1: Automatic API Sync"

### Option 2: Manual Sync Button

Add a "Sync to API" button in the popup.

See `API_INTEGRATION.md` → "Option 2: Manual Sync from Popup"

### Option 3: Enhanced Data Extraction

Extract actual purchase details (price, item name) from pages.

See `API_INTEGRATION.md` → "Extracting Purchase Details"

## 📚 Documentation

- **WEBAPP_INTEGRATION.md** - How to integrate with your webapp
- **WEBAPP_PROMPT.md** - Simple prompt for webapp developer
- **API_INTEGRATION.md** - Complete API integration guide
- **SETUP_INSTRUCTIONS.md** - Detailed setup instructions
- **FIX_APPLIED.md** - localStorage access fix details

## 🐛 Troubleshooting

### Extension Not Showing User

**Problem:** Popup shows "Authentication Required" even after signing in

**Solution:**
1. Make sure you're on the webapp when clicking "Sign In"
2. Check localStorage: `localStorage.getItem('moneyTrackerUser')`
3. Reload the extension
4. Try signing in again

### Purchases Not Detected

**Problem:** Clicking checkout doesn't show warning

**Solution:**
1. Check browser console for errors
2. Make sure content script is loaded (check console for "💰 Money Tracker content script loaded")
3. Try a different shopping site
4. Check if button text matches keywords (see `src/content.ts` line 180-198)

### API Connection Failed

**Problem:** Can't connect to backend API

**Solution:**
1. Verify `API_BASE_URL` in `src/api.ts`
2. Check backend is running
3. Check CORS settings on backend
4. Look at network tab in browser DevTools

## 🎨 Customization

### Add More Checkout Keywords

Edit `src/content.ts` line 180-198:

```typescript
const CHECKOUT_KEYWORDS = [
  'proceed to checkout',
  'buy now',
  'your custom keyword',
  // ... add more
];
```

### Change Warning Message

Edit `src/content.ts` line 260-264:

```typescript
<h1>Your Custom Title</h1>
<p>Your custom message</p>
```

### Update API URL

Edit `src/api.ts` line 2:

```typescript
const API_BASE_URL = 'https://your-domain.com/api';
```

## 🚀 Deployment Checklist

- [ ] Update `API_BASE_URL` to production URL
- [ ] Test with real backend API
- [ ] Test user authentication flow
- [ ] Test purchase detection on major sites
- [ ] Add error handling for API failures
- [ ] Consider adding retry logic
- [ ] Add analytics/logging
- [ ] Create user documentation
- [ ] Submit to Chrome Web Store (optional)

## 💡 Tips

1. **Development:** Use `npm run dev` for auto-rebuild
2. **Debugging:** Check browser console and extension background page console
3. **Testing:** Use `localStorage.setItem()` to test without webapp
4. **API Testing:** Use Postman/curl to test endpoints first
5. **Reload:** Always reload extension after rebuilding

## 🎉 You're Ready!

The extension is fully functional and ready to integrate with your backend API. Just:

1. ✅ Update the API URL
2. ✅ Integrate with your webapp
3. ✅ Choose your sync strategy
4. ✅ Test everything
5. ✅ Deploy!

For detailed guides, see the other documentation files.

---

**Need Help?** Check the documentation files or browser console for errors.
