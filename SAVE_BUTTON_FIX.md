# Save Button & Roast Integration Fix

## Issues Fixed
1. **Save button not working** - The button was not properly saving money to goals
2. **Static warning message** - The warning overlay showed generic messages instead of personalized roasts

## Changes Made

### 1. Integrated Roast Endpoint
The warning overlay now fetches personalized roast messages from the backend API:

**New API Functions** (`src/api.ts`):
- `getGoals()` - Fetches user's savings goals
- `getRoast(items, amount, goals)` - Gets personalized roast message from `/api/roast` endpoint

**New Message Handlers** (`src/background.ts`):
- `GET_GOALS` - Returns user's goals list
- `GET_ROAST` - Calls roast API and returns personalized message

### 2. Simplified Warning Flow
Removed the complex two-flow system (overspending vs regular) and unified it into a single flow:

**Single Warning Flow**:
- Shows personalized roast message from API
- Displays product info (item name and price)
- Two buttons:
  - **"💰 I'll Save!"** (green) - Saves money to goals and redirects to dashboard
  - **"Buy Anyway"** (red) - Proceeds with purchase

### 3. Fixed Save Button
The save button now properly:
1. Calls `ADD_SAVINGS` API with product details
2. Shows success notification with updated goal progress
3. Redirects to dashboard after 2 seconds
4. Handles errors gracefully with user feedback

## Code Changes

### Files Modified:
1. **`src/api.ts`**:
   - Added `getGoals()` function (lines 319-360)
   - Added `getRoast()` function (lines 362-354)

2. **`src/background.ts`**:
   - Added `GET_ROAST` message handler (lines 356-375)
   - Added `GET_GOALS` message handler (lines 377-392)

3. **`src/content.ts`**:
   - Rewrote `showWarningOverlay()` to fetch roast message (lines 604-652)
   - Simplified overlay HTML to single flow (lines 683-740)
   - Fixed save button handler (lines 783-826)
   - Removed cancel button (no longer needed)

## API Integration

The extension now calls the `/api/roast` endpoint with:
```json
{
  "items": "Product Name",
  "amount": 99.99,
  "goals": [
    {
      "name": "Emergency Fund",
      "target_amount": 5000,
      "current_amount": 1200
    }
  ]
}
```

The API returns a personalized roast message that's displayed in the warning overlay.

## Testing
1. **Reload the extension** in Chrome (`chrome://extensions/`)
2. **Visit a product page** (e.g., Amazon, eBay)
3. **Click a buy/checkout button**
4. **Verify**:
   - Personalized roast message appears (from API)
   - Product info is displayed correctly
   - Click "💰 I'll Save!" → Money is saved to goals
   - Success notification appears
   - Redirects to dashboard after 2 seconds

## Requirements
- Backend API must be running at `http://localhost:3000`
- `/api/roast` endpoint must be implemented
- `/api/goals/list` endpoint must be available
- User must be authenticated with goals set up

## Build
```bash
npm run build
```
