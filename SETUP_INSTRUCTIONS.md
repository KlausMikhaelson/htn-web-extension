# Money Tracker Extension - Setup Instructions

## Overview

The Money Tracker extension has been updated to use a **simple localStorage-based authentication** instead of Clerk. The extension now reads user data that your webapp stores in localStorage.

## How It Works

1. **Webapp stores user data** → User signs in on your webapp → Webapp saves user info to `localStorage`
2. **Extension reads data** → User opens extension → Extension reads user data from `localStorage` via chrome storage
3. **Extension uses email** → Extension uses user's email as reference for API calls

## Quick Start

### 1. Build the Extension

```bash
npm install
npm run build
```

### 2. Load Extension in Browser

**Chrome:**
1. Go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `dist` folder

**Edge:**
1. Go to `edge://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder

### 3. Integrate with Your Webapp

Your webapp needs to store user data in localStorage when users sign in.

**Add this code after successful login:**

```javascript
// After user successfully authenticates
const userData = {
  id: user.id,
  email: user.email,        // REQUIRED - used as primary reference
  name: user.name,          // Optional
  firstName: user.firstName, // Optional
  lastName: user.lastName,   // Optional
  imageUrl: user.imageUrl,   // Optional
  createdAt: Date.now()      // REQUIRED
};

localStorage.setItem('moneyTrackerUser', JSON.stringify(userData));
```

**Add this code on logout:**

```javascript
localStorage.removeItem('moneyTrackerUser');
```

📄 **See `WEBAPP_INTEGRATION.md` for detailed integration guide**  
📄 **See `WEBAPP_PROMPT.md` for a simple prompt to give your webapp developer**

## Testing

### Test Without Webapp (Manual Testing)

1. Open your browser console (F12)
2. Run this command:

```javascript
localStorage.setItem('moneyTrackerUser', JSON.stringify({
  id: 'test-123',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: Date.now()
}));
```

3. Click the extension icon
4. Click "Sign In" button
5. Extension should show "✓ Signed in as test@example.com"

### Test With Webapp

1. Sign in to your webapp (after implementing localStorage integration)
2. Open browser console and verify data:
```javascript
console.log(localStorage.getItem('moneyTrackerUser'));
```
3. Open the extension
4. Should show your user info

## Extension Features

### Current Features

- ✅ Tracks all open browser tabs
- ✅ Records website visit history
- ✅ Displays current active website
- ✅ User authentication via localStorage
- ✅ User profile display in popup
- ✅ Sign out functionality

### Coming Soon (Ready for API Integration)

- 🔄 Send tracking data to your backend API
- 🔄 Sync spending data across devices
- 🔄 Real-time spending notifications
- 🔄 Website categorization (shopping, banking, etc.)

## File Structure

```
htn-web-extension/
├── src/
│   ├── auth.ts          # Checks localStorage for user data
│   ├── background.ts    # Background service worker (tab tracking)
│   ├── content.ts       # Content script (injected into pages)
│   ├── popup.ts         # Popup UI logic
│   └── ...
├── public/
│   ├── auth.html        # Auth sync page
│   ├── popup.html       # Extension popup UI
│   ├── manifest.json    # Extension manifest
│   └── ...
├── dist/                # Built extension (load this in browser)
├── WEBAPP_INTEGRATION.md    # Detailed webapp integration guide
├── WEBAPP_PROMPT.md         # Simple prompt for webapp developer
└── package.json
```

## User Flow

1. **First Time:**
   - User opens extension → Sees "Authentication Required"
   - Clicks "Sign In" → Opens auth sync page
   - If user is signed in on webapp → Data syncs automatically
   - If not → Shows "No user found" message

2. **After Sign In:**
   - Extension shows user profile
   - Displays all open tabs
   - Tracks website visits
   - Ready to send data to APIs

3. **Sign Out:**
   - User clicks "Sign Out" in extension
   - Clears extension storage
   - Next time requires sign in again

## API Integration (Next Steps)

When you're ready to connect to your backend APIs, the extension will send data like this:

```javascript
// Example: Send tracking data to your API
const user = await chrome.storage.local.get(['user']);

fetch('https://your-api.com/api/track', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userEmail: user.email,      // User reference
    websiteUrl: website.url,
    hostname: website.hostname,
    title: website.title,
    timestamp: Date.now(),
    tabId: website.tabId
  })
});
```

You can add API endpoints to:
- Track website visits
- Log spending events
- Sync data across devices
- Get user statistics
- etc.

## Development

### Watch Mode (Auto-rebuild)

```bash
npm run dev
```

This will watch for file changes and rebuild automatically.

### Type Checking

```bash
npm run type-check
```

## Troubleshooting

### Extension Shows "No user found"

**Solution:** Make sure your webapp is setting localStorage correctly:
```javascript
// Check in browser console
localStorage.getItem('moneyTrackerUser')
```

### Extension Not Loading

**Solution:** 
1. Check that you loaded the `dist` folder, not the root folder
2. Rebuild: `npm run build`
3. Click "Reload" button in browser extensions page

### User Data Not Syncing

**Solution:**
1. Make sure localStorage key is exactly `moneyTrackerUser`
2. Verify data includes `email` field
3. Try clicking "Sign In" button in extension again
4. Check browser console for errors

### TypeScript Errors

**Solution:**
```bash
npm install
npm run type-check
npm run build
```

## Security Notes

- ✅ No sensitive data stored in localStorage
- ✅ Email used as reference only (not for authentication)
- ✅ Actual authentication should happen on your backend
- ✅ Extension only reads localStorage, doesn't modify it
- ✅ Data is domain-specific (only accessible from your webapp's domain)

## Next Steps

1. ✅ Build extension: `npm run build`
2. ✅ Load extension in browser
3. ✅ Integrate with webapp (see `WEBAPP_INTEGRATION.md`)
4. ⏳ Test the flow
5. ⏳ Set up backend APIs for tracking data
6. ⏳ Connect extension to your APIs

## Support

If you encounter issues:
1. Check browser console for errors (F12)
2. Verify localStorage data structure
3. Ensure extension is properly loaded
4. Check that webapp is on HTTPS (in production)
5. Review `WEBAPP_INTEGRATION.md` for detailed examples

---

**Ready to go!** 🚀

The extension is now ready to use. Just integrate with your webapp and start tracking!
