# Desktop Application Build Instructions

This project is a complete standalone desktop application for Windows, Mac, and Linux that works 100% offline.

## Prerequisites

1. Install Node.js (v18 or higher)
2. Clone this repository
3. Run `npm install`

## Development

To run the app in desktop mode during development:

```bash
npm run electron:dev
```

This will start the Vite dev server and launch Electron.

## Building Desktop Installers

### Build for your current platform:

```bash
npm run electron:build
```

### Build for specific platforms:

**Windows:**
```bash
npm run electron:build:win
```

**Mac:**
```bash
npm run electron:build:mac
```

**Linux:**
```bash
npm run electron:build:linux
```

## Output

The installers will be created in the `release` directory:

- **Windows**: `.exe` installer and portable `.exe`
- **Mac**: `.dmg` installer and `.zip`
- **Linux**: `.AppImage` and `.deb` package

## Installation

After building, users can:

1. **Windows**: Run the `.exe` installer - it will guide through installation
2. **Mac**: Open the `.dmg` and drag the app to Applications folder
3. **Linux**: Run the `.AppImage` or install the `.deb` package

## Notes

- **This is a complete offline application** - no internet connection required
- All data is stored locally using browser localStorage
- First build may take several minutes
- Cross-platform builds may require additional setup (e.g., building Mac apps requires a Mac)
- The built application is fully standalone and portable

## Creating Distribution Package

After building, you can distribute the installers from the `release` directory. Users simply need to:
1. Download the appropriate installer for their OS
2. Install/run the application
3. Start using it immediately - no setup, no internet required

See INSTALLATION.md for end-user installation instructions.
