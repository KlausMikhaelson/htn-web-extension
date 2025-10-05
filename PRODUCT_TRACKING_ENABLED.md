# Product Tracking - Now Enabled! 🛍️

## What Changed

The extension now **automatically tracks product pages** as you browse and uses that data when you make a purchase!

## How It Works

### New Flow

```
User visits product page → Product info extracted & stored →
User navigates to checkout → Clicks "Proceed Anyway" →
Extension uses stored product data → Sends complete data to API
```

### What Gets Tracked

When you visit a product page, the extension extracts:
- **Item name** - Product title
- **Price** - Actual price (if found)
- **Currency** - USD (default)
- **Description** - Product description (if available)
- **URL** - Product page URL
- **Website** - Domain name

### Supported Sites

**Optimized for:**
- Amazon
- eBay
- Walmart

**Generic support for:**
- Target
- Best Buy
- Etsy
- Any site with standard product page elements

## What Gets Sent to API Now

### Complete Purchase Data

```json
{
  "item_name": "Sony WH-1000XM4 Wireless Headphones",
  "price": 279.99,
  "currency": "USD",
  "website": "amazon.com",
  "url": "https://amazon.com/dp/B0863TXGM3",
  "description": "Industry-leading noise canceling...",
  "purchase_date": "2025-10-05T11:26:00.000Z",
  "userEmail": "user@example.com",
  "metadata": {
    "detected_by": "extension",
    "purchase_id": "1728123456789"
  }
}
```

### Fallback Behavior

If product info isn't found:
- **Item name**: Uses page title
- **Price**: Defaults to 0
- **Currency**: Defaults to USD

## Testing

### 1. Reload Extension

```
chrome://extensions/ → Find "Money Tracker" → Click Reload
```

### 2. Visit a Product Page

1. Go to Amazon, eBay, or Walmart
2. Open any product page
3. Open browser console (F12)
4. Should see:
   ```
   📦 Product detected: {item_name: "...", price: 279.99, ...}
   ✅ Product info stored
   ```

### 3. Test Purchase Flow

1. **Visit product page first** (important!)
2. Click "Add to Cart" or "Buy Now"
3. Navigate to checkout
4. Click checkout button
5. See warning overlay
6. Click "Proceed Anyway"
7. Check console:
   ```
   💸 User proceeded with purchase
   📦 Using stored product info: {...}
   💸 Purchase detected: {...}
   🔄 Syncing purchase to API: {...}
   📤 API Payload: {item_name: "...", price: 279.99, ...}
   ✅ Purchase synced to API: {...}
   ```

### 4. Verify API Received Data

Check your backend logs - should see POST with complete data:
```json
{
  "item_name": "Actual Product Name",
  "price": 279.99,
  "website": "amazon.com",
  ...
}
```

## Console Messages

### When Visiting Product Page

```
📦 Product detected: {
  item_name: "Sony WH-1000XM4 Wireless Headphones",
  price: 279.99,
  currency: "USD",
  url: "https://amazon.com/dp/B0863TXGM3",
  website: "amazon.com",
  timestamp: 1728123456789
}
✅ Product info stored
```

### When Making Purchase

```
💸 User proceeded with purchase
📦 Using stored product info: {item_name: "...", price: 279.99}
💸 Purchase detected: {item_name: "...", price: 279.99, website: "amazon.com"}
Purchase event stored locally
🔄 Syncing purchase to API: {...}
📤 API Payload: {item_name: "...", price: 279.99, website: "amazon.com"}
✅ Purchase synced to API: {success: true, purchase: {...}}
```

### If No Product Info Found

```
💸 User proceeded with purchase
⚠️ No product info found, using fallback
💸 Purchase detected: {item_name: "Page Title", price: 0}
```

## How Product Detection Works

### 1. URL Pattern Matching

Checks if URL contains:
- `/dp/` (Amazon)
- `/gp/product/` (Amazon)
- `/itm/` (eBay)
- `/p/` (Walmart, Target)
- `/product/` (Generic)
- `/item/` (Generic)

### 2. Element Detection

Looks for:
- Product title elements (`h1`, `#productTitle`, etc.)
- Price elements (`[itemprop="price"]`, `.price`, etc.)

### 3. Site-Specific Extraction

**Amazon:**
```javascript
item_name: document.querySelector('#productTitle')
price: document.querySelector('.a-price-whole')
description: document.querySelector('#feature-bullets')
```

**eBay:**
```javascript
item_name: document.querySelector('h1.x-item-title__mainTitle')
price: document.querySelector('.x-price-primary')
```

**Walmart:**
```javascript
item_name: document.querySelector('h1[itemprop="name"]')
price: document.querySelector('[itemprop="price"]')
```

**Generic Sites:**
- Tries common selectors
- Falls back to page title

### 4. Storage

Stores:
- **Last 10 products** in `recentProducts`
- **Most recent product** in `lastViewedProduct`

## Viewing Stored Products

Open browser console and run:

```javascript
// See last viewed product
chrome.storage.local.get(['lastViewedProduct'], (result) => {
  console.log('Last viewed:', result.lastViewedProduct);
});

// See recent products
chrome.storage.local.get(['recentProducts'], (result) => {
  console.log('Recent products:', result.recentProducts);
});
```

## Debugging

### Product Not Detected

**Check console for:**
- `📦 Product detected` message
- If missing, product page wasn't recognized

**Solutions:**
1. Make sure you're on an actual product page
2. Wait 2 seconds after page load
3. Check if site is supported
4. Add custom selectors for your site

### Wrong Price Extracted

**Check console:**
```javascript
// See what was extracted
chrome.storage.local.get(['lastViewedProduct'], (result) => {
  console.log('Extracted price:', result.lastViewedProduct?.price);
});
```

**Solutions:**
1. Price selector might be wrong for that site
2. Add site-specific extraction in `content.ts`
3. Price defaults to 0 if not found (still valid)

### API Still Getting 400 Error

**Check background console:**
1. Go to `chrome://extensions/`
2. Click "service worker" under Money Tracker
3. Look for `📤 API Payload` message
4. Verify it has `item_name`, `price`, and `website`

**If payload is missing fields:**
- Product wasn't tracked before checkout
- Visit product page first, then checkout

## Adding Support for New Sites

Edit `src/content.ts` in the `extractProductInfo()` function:

```typescript
// Add your site
else if (hostname.includes('yoursite.com')) {
  productInfo.item_name = document.querySelector('.your-title-selector')?.textContent?.trim();
  
  const priceText = document.querySelector('.your-price-selector')?.textContent?.trim();
  if (priceText) {
    productInfo.price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
  }
  
  productInfo.currency = 'USD';
  productInfo.description = document.querySelector('.your-description')?.textContent?.trim();
}
```

Then rebuild:
```bash
npm run build
```

## Best Practices

### For Accurate Tracking

1. **Visit product page first** before checking out
2. **Wait for page to load** (extension waits 2 seconds)
3. **Check console** to verify product was detected
4. **Then proceed to checkout**

### Workflow

```
1. Browse products → Product info stored
2. Add to cart → Product info still stored
3. Go to checkout → Product info available
4. Click checkout → Warning shown
5. Proceed → Uses stored product info
6. API receives complete data ✅
```

## What's Stored

### In Chrome Storage

```javascript
{
  lastViewedProduct: {
    item_name: "Product Name",
    price: 279.99,
    currency: "USD",
    url: "https://...",
    website: "amazon.com",
    timestamp: 1728123456789
  },
  recentProducts: [
    // Last 10 products viewed
  ]
}
```

### Sent to API

```javascript
{
  item_name: "Product Name",  // ✅ From stored data
  price: 279.99,              // ✅ From stored data
  currency: "USD",            // ✅ From stored data
  website: "amazon.com",      // ✅ Always included
  url: "https://...",         // ✅ Always included
  description: "...",         // ✅ If available
  purchase_date: "2025-...",  // ✅ Always included
  userEmail: "user@...",      // ✅ From auth
  metadata: {...}             // ✅ Extension info
}
```

## Success Indicators

✅ Console shows "📦 Product detected" on product pages
✅ Console shows "✅ Product info stored"
✅ Console shows "📦 Using stored product info" on checkout
✅ API payload includes actual item name and price
✅ Backend receives complete purchase data
✅ No more 400 errors!

## Common Scenarios

### Scenario 1: Normal Flow ✅
```
Visit product page → Product detected → Go to checkout → 
Click "Proceed Anyway" → Uses stored data → API success
```

### Scenario 2: Direct Checkout ⚠️
```
Go directly to checkout (no product page visit) →
Click "Proceed Anyway" → Tries to extract from checkout page →
Falls back to page title if not found → API receives basic data
```

### Scenario 3: Multiple Products 📦
```
Visit Product A → Stored
Visit Product B → Stored (replaces A as "last viewed")
Checkout → Uses Product B data
```

## Next Steps

### Enhance Extraction

Add more site-specific extractors for better accuracy.

### Add Product History

Show recently viewed products in extension popup.

### Price Tracking

Track price changes over time for products.

### Smart Suggestions

Suggest cheaper alternatives when user tries to buy.

## Testing Checklist

- [ ] Extension reloaded
- [ ] Visit product page on Amazon/eBay/Walmart
- [ ] Console shows "📦 Product detected"
- [ ] Console shows "✅ Product info stored"
- [ ] Navigate to checkout
- [ ] Click checkout button
- [ ] See warning overlay
- [ ] Click "Proceed Anyway"
- [ ] Console shows "📦 Using stored product info"
- [ ] Console shows "✅ Purchase synced to API"
- [ ] Backend receives complete data with actual price
- [ ] No 400 errors!

---

**Ready to test!** Visit a product page first, then try checking out. The extension will use the stored product data! 🎉
