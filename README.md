# Money Tracker Browser Extension

A TypeScript-based browser extension that tracks which websites you visit, designed as a foundation for money management and spending tracking.

## Features

- **🛑 Checkout Interception**: Automatically blocks checkout/buy buttons and shows a warning to save money
- **All Tabs Tracking**: Displays all open tabs in real-time with active tab highlighting
- **Real-time Website Detection**: Automatically detects and tracks the current website you're on
- **Visit History**: Keeps track of your browsing history (last 100 visits)
- **Website Categorization**: Identifies shopping sites, financial sites, and subscription services
- **Beautiful UI**: Modern popup interface showing all tabs with visit statistics
- **TypeScript**: Fully typed codebase for better development experience

## Project Structure

```
htn-web-extension/
├── src/
│   ├── background.ts    # Background service worker for tracking
│   ├── content.ts       # Content script for website detection
│   └── popup.ts         # Popup UI logic
├── public/
│   ├── manifest.json    # Extension manifest
│   ├── popup.html       # Popup UI
│   └── icons/           # Extension icons
├── dist/                # Built files (generated)
├── package.json
├── tsconfig.json
└── webpack.config.js
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Extension

For development (with watch mode):
```bash
npm run dev
```

For production build:
```bash
npm run build
```

### 3. Create Extension Icons

Create three PNG icons in the `public/icons/` directory:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

You can use any image editor or online tool to create these. For now, you can use placeholder images.

### 4. Load the Extension in Chrome/Edge

1. Open your browser and navigate to:
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`

2. Enable "Developer mode" (toggle in top-right corner)

3. Click "Load unpacked"

4. Select the `dist` folder from this project

5. The extension should now appear in your extensions list!

## How to Use

1. Click the extension icon in your browser toolbar
2. The popup will show:
   - Total number of open tabs
   - List of all open tabs with:
     - Website icon (based on category)
     - Hostname
     - Page title
     - Full URL
     - Tab ID
     - Number of visits to each site
   - Active tab is highlighted with a green border

3. The extension automatically tracks:
   - All open tabs in real-time
   - Tab creation and removal
   - Tab switches
   - URL changes
   - Window focus changes

4. **Checkout Protection**:
   - When you click any button with text like "Buy Now", "Checkout", "Purchase", etc.
   - A full-screen warning appears: "Hold Up! 🛑 You need to save money, bro!"
   - Choose to save money (cancels the action) or proceed anyway (continues to checkout)
   - Works on all websites including Amazon, eBay, and other shopping sites

## Development

### Type Checking

```bash
npm run type-check
```

### Watch Mode

Keep webpack running in watch mode during development:
```bash
npm run dev
```

This will automatically rebuild when you make changes to the TypeScript files.

## Future Enhancements

This extension is designed as a foundation for money tracking features. Future additions could include:

- **Price Detection**: Automatically detect prices on shopping websites
- **Spending Analytics**: Track and visualize spending across different sites
- **Budget Alerts**: Set budgets and get notified when approaching limits
- **Transaction Logging**: Manual or automatic logging of purchases
- **Category-based Tracking**: Organize spending by categories
- **Export Data**: Export spending history to CSV or JSON
- **Sync Across Devices**: Cloud sync for multi-device tracking

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **TypeScript**: 5.3.3
- **Build Tool**: Webpack 5
- **Permissions**: tabs, activeTab, storage, all_urls

## Troubleshooting

### Extension not loading
- Make sure you've run `npm run build` first
- Check that the `dist` folder exists and contains the built files

### Popup not showing data
- Check the browser console for errors
- Make sure you've granted the necessary permissions
- Try reloading the extension

### Changes not reflecting
- If running `npm run dev`, webpack should auto-rebuild
- After changes, click the refresh icon on the extension card in `chrome://extensions/`

## License

MIT
