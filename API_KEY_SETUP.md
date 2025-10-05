# API Key Authentication Setup

## Overview

The extension now uses **API key authentication** instead of Clerk session cookies. This is more reliable for browser extensions.

## Setup Steps

### 1. Generate API Key

Run this command to generate a secure random key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Example output:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### 2. Add to Backend .env

Add this to your backend's `.env` file:

```env
EXTENSION_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

Replace with your actual generated key.

### 3. Update Extension API Key

Edit `src/api.ts` line 8:

```typescript
const API_KEY = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2';
```

Replace with the **same key** you added to your backend.

### 4. Rebuild Extension

```bash
npm run build
```

### 5. Reload Extension

Go to `chrome://extensions/` and click **Reload** on Money Tracker.

## What Changed

### Before (Clerk Session Cookies)
```javascript
fetch('/api/purchases/add', {
  credentials: 'include',  // Send cookies
  body: JSON.stringify({
    userEmail: 'user@example.com'
  })
});
```

**Problems:**
- ❌ Cookies don't work cross-origin from extensions
- ❌ CORS issues with chrome-extension:// origin
- ❌ Clerk middleware not processing API routes

### After (API Key)
```javascript
fetch('/api/purchases/add', {
  headers: {
    'x-api-key': 'your_api_key_here'
  },
  body: JSON.stringify({
    user_id: 'user_123'
  })
});
```

**Benefits:**
- ✅ Works from browser extensions
- ✅ No CORS issues
- ✅ Simple and reliable
- ✅ Backend validates API key

## How It Works

### 1. Extension Sends Request

```javascript
// In src/api.ts
const response = await fetch('http://localhost:3000/api/purchases/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY  // ← API key in header
  },
  body: JSON.stringify({
    user_id: userId,      // ← User ID from extension storage
    item_name: 'Product',
    price: 99.99,
    website: 'amazon.com'
  })
});
```

### 2. Backend Validates

Your backend checks:
1. Is `x-api-key` header present?
2. Does it match `EXTENSION_API_KEY` from .env?
3. Is `user_id` valid?

If all pass → Process purchase ✅
If any fail → Return 401 Unauthorized ❌

## Testing

### Test with cURL

```bash
# Windows (PowerShell)
curl "http://localhost:3000/api/purchases/add" `
  -H "Content-Type: application/json" `
  -H "x-api-key: your_api_key_here" `
  --data-raw '{\"user_id\":\"user_123\",\"item_name\":\"Test Product\",\"price\":29.99,\"website\":\"amazon.com\"}'

# Mac/Linux
curl "http://localhost:3000/api/purchases/add" \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key_here" \
  --data-raw '{"user_id":"user_123","item_name":"Test Product","price":29.99,"website":"amazon.com"}'
```

Expected response:
```json
{
  "success": true,
  "purchase": {
    "id": "...",
    "item_name": "Test Product",
    "price": 29.99,
    "category": "shopping",
    ...
  }
}
```

### Test with Extension

1. Make sure backend is running
2. Make sure API key matches in both places
3. Sign in to extension
4. Visit a product page
5. Click "Buy Now"
6. Click "Proceed Anyway"
7. Check console:
   ```
   🔄 Syncing purchase to API
   📤 API Payload: {user_id: "...", item_name: "...", price: 99.99}
   ✅ Purchase synced to API
   ```

## User ID Setup

The extension needs the user's ID (not email) to send to the API.

### Update Webapp Integration

When your webapp sets localStorage, include the user ID:

```javascript
// In your webapp after login
localStorage.setItem('moneyTrackerUser', JSON.stringify({
  id: user.id,           // ← IMPORTANT: Include Clerk user ID
  email: user.email,
  name: user.name,
  createdAt: Date.now()
}));
```

### Get User ID from Clerk

In your webapp:

```javascript
// Using Clerk React
import { useUser } from '@clerk/nextjs';

const { user } = useUser();
const userId = user?.id;  // This is the Clerk user ID

// Or from session
import { auth } from '@clerk/nextjs';
const { userId } = auth();
```

The user ID looks like: `user_2abc...` (Clerk format)

## Troubleshooting

### "User not authenticated - user ID not found"

**Problem:** Extension doesn't have user ID

**Solution:**
1. Check localStorage in webapp:
   ```javascript
   localStorage.getItem('moneyTrackerUser')
   ```
2. Should include `"id": "user_123..."`
3. Sign in to extension again to sync

### "Invalid API key" or 401 Error

**Problem:** API key doesn't match

**Solution:**
1. Check extension API key in `src/api.ts` line 8
2. Check backend .env `EXTENSION_API_KEY`
3. Make sure they're **exactly the same**
4. Rebuild extension: `npm run build`
5. Reload extension
6. Restart backend

### "Missing required fields"

**Problem:** user_id not being sent

**Solution:**
1. Check console for API payload:
   ```
   📤 API Payload: {...}
   ```
2. Should include `user_id` field
3. If missing, user ID not in storage
4. Sign in again to sync user data

### CORS Errors

**Problem:** Backend not allowing extension origin

**Solution:**
Add to your backend CORS config:
```javascript
app.use(cors({
  origin: '*',  // Or specific origins
  credentials: false  // Not needed with API key
}));
```

## Security Notes

### ✅ Good Practices

- API key is stored in extension code (not accessible to websites)
- API key is sent in header (not in URL)
- Backend validates API key on every request
- User ID is validated against your database

### ⚠️ Important

- **Don't commit API key to public repos**
- Use different keys for dev/production
- Rotate keys periodically
- Monitor API usage for abuse

### 🔒 Production Setup

For production:

1. Use environment variable for API key:
```typescript
// src/api.ts
const API_KEY = process.env.EXTENSION_API_KEY || 'fallback_key';
```

2. Build with environment:
```bash
EXTENSION_API_KEY=your_prod_key npm run build
```

3. Use different keys per environment:
```env
# .env.development
EXTENSION_API_KEY=dev_key_here

# .env.production
EXTENSION_API_KEY=prod_key_here
```

## Configuration Checklist

- [ ] Generated secure API key
- [ ] Added `EXTENSION_API_KEY` to backend .env
- [ ] Updated `API_KEY` in `src/api.ts`
- [ ] Keys match exactly
- [ ] Webapp includes user ID in localStorage
- [ ] Extension rebuilt: `npm run build`
- [ ] Extension reloaded in browser
- [ ] Backend restarted
- [ ] Tested with cURL
- [ ] Tested with extension
- [ ] No 401 errors
- [ ] Purchases syncing successfully

## API Endpoints

Both endpoints now use API key authentication:

### POST /api/purchases/add

**Headers:**
```
Content-Type: application/json
x-api-key: your_api_key_here
```

**Body:**
```json
{
  "user_id": "user_123",
  "item_name": "Product Name",
  "price": 99.99,
  "website": "amazon.com",
  "url": "https://...",
  "currency": "USD",
  "purchase_date": "2025-10-05T...",
  "metadata": {}
}
```

### GET /api/purchases/list

**Headers:**
```
Content-Type: application/json
x-api-key: your_api_key_here
```

**Query Params:**
```
?limit=20&offset=0&sort=desc
```

## Next Steps

1. ✅ Set up API key (this guide)
2. ✅ Update webapp to include user ID
3. ✅ Test with cURL
4. ✅ Test with extension
5. ⏳ Deploy to production
6. ⏳ Monitor API usage
7. ⏳ Set up rate limiting (optional)

---

**Ready!** Your extension now uses secure API key authentication. 🔐
