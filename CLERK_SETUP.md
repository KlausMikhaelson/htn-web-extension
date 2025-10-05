# Clerk Authentication Setup Guide

This guide will help you integrate Clerk authentication with your Money Tracker extension.

## Prerequisites

- A Clerk account (sign up at https://clerk.com)
- Node.js and npm installed

## Step 1: Create a Clerk Application

1. Go to https://dashboard.clerk.com
2. Click "Add application" or select an existing application
3. Note your **Publishable Key** (starts with `pk_test_` or `pk_live_`)

## Step 2: Configure Your Extension

1. Open `src/auth.ts`
2. Replace the placeholder with your actual Clerk publishable key:

```typescript
const CLERK_PUBLISHABLE_KEY = 'pk_test_YOUR_ACTUAL_KEY_HERE';
```

## Step 3: Configure Clerk Dashboard

### Set up Allowed Origins

In your Clerk dashboard:

1. Go to **Settings** → **Domains**
2. Add the following to your allowed origins:
   - `chrome-extension://*` (for Chrome)
   - `moz-extension://*` (for Firefox)

### Configure Sign-In Options

1. Go to **User & Authentication** → **Email, Phone, Username**
2. Enable the authentication methods you want (Email, Google, etc.)
3. Customize the sign-in experience as needed

## Step 4: Build the Extension

```bash
npm run build
```

## Step 5: Load the Extension

### For Chrome:

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder from your project

### For Firefox:

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `manifest.json` file from your `dist` folder

## Step 6: Test Authentication

1. Click the extension icon in your browser
2. You should see a "Sign In" button
3. Click it to open the authentication page
4. Sign in with your preferred method
5. After successful authentication, you'll be redirected back to the extension

## Features

### User Session Management

- User sessions are stored in `chrome.storage.local`
- Sessions persist across browser restarts
- Token refresh is handled automatically by Clerk

### Sign Out

Users can sign out by clicking the "Sign Out" button in the extension popup.

### Protected Features

All extension features now require authentication:
- Tab tracking
- Visit history
- Money tracking features

## Troubleshooting

### "Failed to initialize authentication"

- Check that your Clerk publishable key is correct
- Verify that you've added the extension origin to Clerk's allowed domains

### Authentication page doesn't load

- Check browser console for errors
- Ensure Clerk SDK is properly bundled (check `node_modules/@clerk/clerk-js`)

### User session not persisting

- Check that the extension has `storage` permission in `manifest.json`
- Clear extension storage and try signing in again

## Security Notes

- Never commit your Clerk publishable key to public repositories
- Use environment variables for production builds
- The publishable key is safe to use in client-side code (it's designed for this)
- Sensitive operations should be handled by your backend API using Clerk's secret key

## Next Steps

### Add Backend API Integration

To sync user data to a backend:

1. Create a backend API with Clerk authentication
2. Use the session token to authenticate API requests:

```typescript
const token = await chrome.storage.local.get(['sessionToken']);
fetch('https://your-api.com/endpoint', {
  headers: {
    'Authorization': `Bearer ${token.sessionToken}`
  }
});
```

### Customize the Sign-In UI

Modify the Clerk component appearance in `src/auth.ts`:

```typescript
clerk.mountSignIn(clerkMount, {
  appearance: {
    variables: {
      colorPrimary: '#your-color',
      // ... other customizations
    }
  }
});
```

## Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk JavaScript SDK](https://clerk.com/docs/references/javascript/overview)
- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/)
