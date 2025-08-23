# Pocket Timelock Journal

A secure, mobile-first personal diary application with automatic timestamping and entry sealing functionality. Built as a Progressive Web App (PWA) for offline use and home screen installation.

## Features

### Core Functionality
- **Create & Edit Entries**: Write diary entries with optional titles and rich text content
- **Automatic Timestamping**: Every entry and edit is automatically timestamped
- **Entry Sealing**: Lock entries to make them permanently read-only with immutable timestamps
- **Autosave**: Automatic saving prevents loss of work
- **Local Storage**: All data stays on your device for complete privacy

### Security Features
- **PIN Protection**: Secure deletion of sealed entries with 4-digit PIN
- **User-Defined Security Questions**: Recover your PIN with personalized security questions
- **Cryptographic Hashing**: PIN and security answers are securely hashed using SHA-256
- **Protected Deletion**: Sealed entries require PIN verification before deletion

### Mobile Experience
- **Mobile-First Design**: Optimized for touch interfaces and mobile screens
- **Progressive Web App**: Install on your home screen like a native app
- **Offline Functionality**: Works completely offline with service worker caching
- **Responsive Design**: Adapts to different screen sizes and orientations

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Storage**: Browser LocalStorage API
- **Security**: Web Crypto API for secure hashing
- **PWA**: Service Worker, Web App Manifest
- **Fonts**: Inter (UI), Georgia (content)

## Getting Started

### Option 1: GitHub Pages Deployment

1. **Fork this repository** to your GitHub account
2. **Enable GitHub Pages**:
   - Go to repository Settings
   - Scroll to "Pages" section
   - Select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Click "Save"
3. **Access your app** at `https://yourusername.github.io/pocket-timelock-journal`

### Option 2: Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/pocket-timelock-journal.git
   cd pocket-timelock-journal
   ```

2. **Serve locally** (choose one method):
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   
   # Using PHP
   php -S localhost:8000
   ```

3. **Open in browser**: Navigate to `http://localhost:8000`

### Option 3: Deploy to Other Platforms

The app is a static site and can be deployed to any static hosting service:
- **Netlify**: Drag and drop the folder or connect your GitHub repo
- **Vercel**: Import your GitHub repository
- **Firebase Hosting**: Use `firebase deploy`
- **Surge.sh**: Run `surge` in the project directory

## Installation as PWA

### On Mobile (iOS/Android)
1. Open the app in your mobile browser
2. Look for "Add to Home Screen" option in browser menu
3. Follow the prompts to install
4. The app will appear as an icon on your home screen

### On Desktop (Chrome/Edge)
1. Open the app in Chrome or Edge
2. Look for the install icon in the address bar
3. Click to install the app
4. The app will be available in your applications menu

## Usage Guide

### Creating Your First Entry
1. Tap the "+" button to create a new entry
2. Add an optional title
3. Write your content in the main text area
4. The entry auto-saves as you type

### Sealing an Entry
1. Open an entry you want to preserve
2. Tap the lock icon in the header
3. Confirm the sealing action
4. The entry becomes read-only with a locked timestamp

### Setting Up PIN Protection
1. Go to Settings (gear icon)
2. Tap "Set Up PIN"
3. Enter and confirm a 4-digit PIN
4. Create a security question and answer
5. PIN protection is now active for sealed entries

### Recovering Your PIN
1. When prompted for PIN, tap "Forgot PIN?"
2. Answer your security question
3. PIN verification will be bypassed for that action

## Data Management

### Data Storage
- All data is stored locally in your browser's LocalStorage
- No data is sent to external servers
- Data persists between browser sessions
- Clearing browser data will delete all entries

### Export Your Data
1. Go to Settings
2. Tap "Export All Entries"
3. A JSON file will be downloaded with all your entries
4. Keep this file as a backup

### Privacy & Security
- **Local-Only**: All data stays on your device
- **No Tracking**: No analytics or tracking scripts
- **Secure Hashing**: PINs and security answers are hashed with SHA-256
- **Offline-First**: Works without internet connection

## Browser Compatibility

### Supported Browsers
- **Chrome/Chromium**: Full support including PWA features
- **Safari**: Full support on iOS 11.3+ and macOS 10.13+
- **Firefox**: Full support with PWA features
- **Edge**: Full support including PWA features

### Required Features
- LocalStorage API
- Web Crypto API (for PIN hashing)
- Service Workers (for offline functionality)
- CSS Grid and Flexbox

## File Structure

```
pocket-timelock-journal/
├── index.html          # Main HTML structure
├── style.css           # Styles and responsive design
├── script.js           # Application logic and functionality
├── sw.js              # Service worker for PWA features
├── manifest.json      # PWA manifest file
├── icon-192.png       # App icon (192x192)
├── icon-512.png       # App icon (512x512)
└── README.md          # This file
```

## Contributing

This is a personal diary application designed for individual use. If you'd like to suggest improvements:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Security Notice

While this application uses secure practices (local storage, cryptographic hashing), it's designed for personal use on trusted devices. For highly sensitive information, consider additional security measures at the device level.

## Support

For issues or questions:
1. Check the browser console for error messages
2. Ensure your browser supports required features
3. Try clearing browser cache and reloading
4. Create an issue on GitHub for bugs or feature requests

---

**Pocket Timelock Journal** - Preserve your thoughts, protect your memories.

