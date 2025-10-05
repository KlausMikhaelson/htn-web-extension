# Webapp Integration Guide for Money Tracker Extension

## Overview

The Money Tracker browser extension reads user data from `localStorage` that your webapp sets. This allows seamless authentication between your webapp and the extension without complex OAuth flows.

## How It Works

1. User signs in on your webapp
2. Webapp stores user data in `localStorage` with key `moneyTrackerUser`
3. Extension reads this data from `localStorage` when needed
4. Extension uses the user's email as a reference for API calls

## Implementation in Your Webapp

### Step 1: After User Authentication

After a user successfully signs in to your webapp, store their data in localStorage:

```javascript
// After successful authentication in your webapp
const userData = {
  id: user.id,                    // Required: Unique user ID
  email: user.email,              // Required: User's email (used as reference)
  name: user.name,                // Optional: Full name
  firstName: user.firstName,      // Optional: First name
  lastName: user.lastName,        // Optional: Last name
  imageUrl: user.profileImage,    // Optional: Profile image URL
  createdAt: Date.now()           // Required: Timestamp
};

// Store in localStorage
localStorage.setItem('moneyTrackerUser', JSON.stringify(userData));

console.log('User data saved for Money Tracker extension');
```

### Step 2: User Data Schema

The extension expects the following data structure:

```typescript
interface UserData {
  id: string;                     // Required: Unique identifier
  email: string;                  // Required: User's email
  name?: string;                  // Optional: Full name
  firstName?: string;             // Optional: First name
  lastName?: string;              // Optional: Last name
  imageUrl?: string;              // Optional: Profile picture URL
  createdAt: number;              // Required: Unix timestamp
}
```

**Required Fields:**
- `id`: Unique user identifier (string)
- `email`: User's email address (string) - **This is the primary reference**
- `createdAt`: Timestamp when data was saved (number)

**Optional Fields:**
- `name`: User's full name
- `firstName`: User's first name
- `lastName`: User's last name
- `imageUrl`: URL to user's profile picture

### Step 3: Sign Out Handling

When a user signs out of your webapp, clear the localStorage:

```javascript
// On user sign out
localStorage.removeItem('moneyTrackerUser');
console.log('User data cleared from Money Tracker extension');
```

### Step 4: Check Extension Installation

Optionally, you can check if the extension is installed and show a prompt:

```javascript
// Check if extension is installed (optional)
function checkExtensionInstalled() {
  // Try to detect extension by checking for a specific element it might inject
  // Or use chrome.runtime.sendMessage if you have the extension ID
  
  const hasExtension = !!localStorage.getItem('moneyTrackerUser');
  
  if (!hasExtension) {
    // Show prompt to install extension
    showExtensionPrompt();
  }
}
```

## Complete Example

### React Example

```jsx
import { useEffect } from 'react';

function AuthProvider({ children }) {
  const handleLogin = async (credentials) => {
    try {
      // Your authentication logic
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      
      const user = await response.json();
      
      // Save to localStorage for extension
      const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.avatarUrl,
        createdAt: Date.now()
      };
      
      localStorage.setItem('moneyTrackerUser', JSON.stringify(userData));
      
      // Also save to your app's state
      setUser(user);
      
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  
  const handleLogout = () => {
    // Clear extension data
    localStorage.removeItem('moneyTrackerUser');
    
    // Clear your app's state
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{ handleLogin, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Vanilla JavaScript Example

```javascript
// login.js
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const user = await response.json();
    
    // Save for Money Tracker extension
    localStorage.setItem('moneyTrackerUser', JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: Date.now()
    }));
    
    // Redirect to dashboard
    window.location.href = '/dashboard';
    
  } catch (error) {
    console.error('Login error:', error);
    alert('Login failed');
  }
});

// logout.js
document.getElementById('logoutBtn').addEventListener('click', () => {
  // Clear extension data
  localStorage.removeItem('moneyTrackerUser');
  
  // Clear session
  fetch('/api/auth/logout', { method: 'POST' })
    .then(() => {
      window.location.href = '/login';
    });
});
```

### Next.js Example

```typescript
// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  
  // Your authentication logic
  const user = await authenticateUser(email, password);
  
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    createdAt: Date.now()
  });
}

// components/AuthProvider.tsx
'use client';

import { useEffect } from 'react';

export function AuthProvider({ user }) {
  useEffect(() => {
    if (user) {
      // Save to localStorage for extension
      localStorage.setItem('moneyTrackerUser', JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        createdAt: Date.now()
      }));
    } else {
      // Clear on logout
      localStorage.removeItem('moneyTrackerUser');
    }
  }, [user]);
  
  return null;
}
```

## Extension Behavior

### What the Extension Does

1. **Checks for User Data**: When the extension popup is opened, it checks `chrome.storage.local` for user data
2. **Syncs from localStorage**: If no user data exists in extension storage, clicking "Sign In" opens a sync page that reads from `localStorage`
3. **Uses Email as Reference**: The extension uses the user's email to send data to your APIs
4. **Persists Data**: User data persists in extension storage until sign out

### API Integration

When you set up your backend APIs, the extension will send the user's email in requests:

```javascript
// Example of how extension will call your API
const user = await chrome.storage.local.get(['user']);

fetch('https://your-api.com/track-spending', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userEmail: user.email,  // User reference
    websiteUrl: currentWebsite.url,
    timestamp: Date.now(),
    // ... other tracking data
  })
});
```

## Testing

### Test the Integration

1. **Set User Data Manually**:
```javascript
// In browser console on your webapp
localStorage.setItem('moneyTrackerUser', JSON.stringify({
  id: 'test-123',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: Date.now()
}));
```

2. **Open Extension**: Click the extension icon and click "Sign In"
3. **Verify**: Extension should show user info

### Clear Test Data

```javascript
// In browser console
localStorage.removeItem('moneyTrackerUser');
```

## Security Considerations

1. **localStorage is Domain-Specific**: Data stored in localStorage is only accessible from your webapp's domain
2. **No Sensitive Data**: Don't store passwords, tokens, or sensitive data in localStorage
3. **Email as Reference**: The extension only uses email as a reference - actual authentication should happen on your backend
4. **HTTPS Only**: Ensure your webapp uses HTTPS in production

## Troubleshooting

### Extension Shows "No User Found"

- Check that localStorage key is exactly `moneyTrackerUser`
- Verify data is valid JSON
- Ensure email field exists in the data
- Check browser console for errors

### User Data Not Syncing

- Make sure user is signed in on the webapp first
- Try clicking "Sign In" button in extension again
- Check that localStorage is not being cleared by other scripts
- Verify extension has proper permissions

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify localStorage data structure
3. Ensure extension is properly installed
4. Check that webapp and extension are on compatible domains
