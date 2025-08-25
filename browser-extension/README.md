# Ginko Browser Extension

A Chrome extension that provides intelligent context management and session handoffs for Claude.ai users.

## Features

- **Sidebar Companion**: Opens as a side panel when you click the extension icon
- **Context Capture**: Captures your Claude.ai conversation context for later use
- **Session Handoffs**: Seamlessly resume conversations across sessions
- **ToS Compliant**: No automation - all actions are user-initiated
- **Privacy Focused**: All data stored locally, no external transmission

## Installation (Developer Mode)

1. Clone or download this extension to your local machine
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the `browser-extension` folder
5. The Ginko extension should now appear in your extension bar

## Usage

### Opening the Sidebar
1. Navigate to [Claude.ai](https://claude.ai)
2. Click the Ginko extension icon in your browser toolbar
3. The sidebar will open on the right side of your screen

### Capturing Context
1. Have an active conversation with Claude
2. Click "Capture Context" in the sidebar
3. Your conversation context will be saved locally

### Loading Handoffs
1. Click "Load Handoff" in the sidebar
2. Your most recent session context will be copied to your clipboard
3. Paste it into Claude to resume your previous conversation

### Quick Actions
- **Copy Session**: Copy current session data to clipboard
- **Export Context**: Export session data (coming soon)
- **Share Handoff**: Share session with others (coming soon) 
- **View History**: Browse previous sessions (coming soon)

## File Structure

```
browser-extension/
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js          # Service worker for background tasks
├── sidebar.html           # Sidebar HTML structure
├── sidebar.css            # Sidebar styling
├── sidebar.js             # Sidebar functionality
├── content.js             # Claude.ai page integration
├── content.css            # Content script styles
├── icons/                 # Extension icons (placeholder)
└── README.md             # This file
```

## Technical Details

### Permissions
- `storage`: For saving session data locally
- `sidePanel`: For the sidebar interface
- `clipboardWrite`: For copying session data
- `tabs`: For detecting Claude.ai tabs
- `activeTab`: For interacting with the current tab

### Host Permissions
- `https://claude.ai/*`: Required for integration with Claude.ai

### Chrome APIs Used
- **Side Panel API**: For the sidebar interface
- **Storage API**: For local data persistence
- **Tabs API**: For Claude.ai detection
- **Runtime API**: For message passing between components

## Privacy & Terms of Service Compliance

This extension is designed to be fully compliant with Chrome Web Store policies and Claude.ai's Terms of Service:

- **No Automation**: All actions require explicit user initiation
- **Read-Only Access**: Only observes Claude.ai content, never modifies it
- **Local Storage**: All data remains on your device
- **No External Transmission**: No data sent to external servers
- **User Control**: Users control all capture and export actions

## Development

### Local Testing
1. Make changes to the extension files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Ginko extension card
4. Test your changes

### Required Icons
The extension references these icon files (currently placeholders):
- `icons/icon-16.png` - Toolbar icon (16x16)
- `icons/icon-32.png` - Extension management (32x32)  
- `icons/icon-48.png` - Extension management (48x48)
- `icons/icon-128.png` - Chrome Web Store (128x128)

## Known Limitations

1. **Icons**: Currently using text placeholders - need actual icon files
2. **Export/Share**: Advanced features are not yet implemented
3. **Claude.ai Changes**: May need updates if Claude.ai interface changes
4. **Browser Support**: Currently Chrome-only (Manifest V3)

## Roadmap

- [ ] Add proper extension icons
- [ ] Implement export functionality
- [ ] Add session history browser
- [ ] Support for sharing handoffs
- [ ] Enhanced context analysis
- [ ] Support for other browsers

## Support

For issues or questions:
- Check the browser console for error messages
- Ensure you're using a supported version of Chrome
- Verify the extension has necessary permissions enabled

## License

Part of the Ginko project. See main project license for details.