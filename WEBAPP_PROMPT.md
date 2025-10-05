# Prompt for Webapp Developer

## Task: Integrate Money Tracker Extension with Webapp

I need you to add localStorage integration for the Money Tracker browser extension to our webapp. When a user signs in, we need to store their data in localStorage so the extension can access it.

### Requirements

**On User Sign In (after successful authentication):**

Save user data to localStorage with this exact structure:

```javascript
const userData = {
  id: user.id,              // User's unique ID from your database
  email: user.email,        // User's email (REQUIRED - used as primary reference)
  name: user.name,          // Full name (optional)
  firstName: user.firstName, // First name (optional)
  lastName: user.lastName,   // Last name (optional)
  imageUrl: user.imageUrl,   // Profile picture URL (optional)
  createdAt: Date.now()      // Current timestamp (REQUIRED)
};

localStorage.setItem('moneyTrackerUser', JSON.stringify(userData));
```

**On User Sign Out:**

Clear the localStorage data:

```javascript
localStorage.removeItem('moneyTrackerUser');
```

### Important Notes

1. **localStorage Key**: Must be exactly `moneyTrackerUser` (case-sensitive)
2. **Required Fields**: `id`, `email`, and `createdAt` are required
3. **Email is Key**: The email will be used as the primary reference for API calls
4. **JSON Format**: Data must be stored as JSON string
5. **Timing**: Set localStorage AFTER successful authentication, BEFORE redirecting user

### Where to Implement

- Add to your authentication/login flow
- Add to your logout flow  
- If using session persistence, set on app initialization when user session exists

### Testing

After implementation, test by:
1. Sign in to the webapp
2. Open browser console and run: `localStorage.getItem('moneyTrackerUser')`
3. Should see the user data JSON string
4. Install the Money Tracker extension and click "Sign In"
5. Extension should show the user's email

### Example Implementations

**React/Next.js:**
```javascript
// In your auth context or login handler
const handleLogin = async (credentials) => {
  const user = await loginUser(credentials);
  
  // Store for extension
  localStorage.setItem('moneyTrackerUser', JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: Date.now()
  }));
  
  // Continue with your normal flow
  setUser(user);
  router.push('/dashboard');
};
```

**Vanilla JS:**
```javascript
// After successful login API call
fetch('/api/login', { /* ... */ })
  .then(res => res.json())
  .then(user => {
    localStorage.setItem('moneyTrackerUser', JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: Date.now()
    }));
    
    window.location.href = '/dashboard';
  });
```

### Questions?

- The extension only reads this data, it doesn't modify it
- This is safe to store in localStorage (no sensitive data like passwords)
- The extension will use the email to send tracking data to our APIs later
