# JCG Supply Chain Analytics - Standalone Desktop Application

## Complete Offline Installation Guide

This is a fully standalone desktop application that works completely offline without requiring any internet connection or external services.

## System Requirements

- **Windows**: Windows 10 or later
- **Mac**: macOS 10.13 (High Sierra) or later
- **Linux**: Ubuntu 18.04 or later, Fedora 32+, or Debian 10+
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: 500MB free disk space

## Installation Instructions

### Windows

1. Download the installer: `JCG-Supply-Chain-Analytics-Setup-[version].exe`
2. Double-click the downloaded file
3. Follow the installation wizard:
   - Choose installation directory
   - Select "Create desktop shortcut" (recommended)
   - Click "Install"
4. Launch from desktop shortcut or Start menu

**Portable Version**: Download `JCG-Supply-Chain-Analytics-[version]-portable.exe` to run without installation.

### Mac

1. Download the installer: `JCG-Supply-Chain-Analytics-[version].dmg`
2. Open the downloaded DMG file
3. Drag "JCG Supply Chain Analytics" to the Applications folder
4. Launch from Applications or Launchpad
5. If you see a security warning, go to System Preferences > Security & Privacy and click "Open Anyway"

### Linux

**AppImage (Recommended)**:
1. Download `JCG-Supply-Chain-Analytics-[version].AppImage`
2. Make it executable: `chmod +x JCG-Supply-Chain-Analytics-[version].AppImage`
3. Run: `./JCG-Supply-Chain-Analytics-[version].AppImage`

**Debian/Ubuntu (.deb)**:
1. Download `jcg-supply-chain-analytics_[version]_amd64.deb`
2. Install: `sudo dpkg -i jcg-supply-chain-analytics_[version]_amd64.deb`
3. Launch from applications menu or run `jcg-supply-chain-analytics`

## Features

This standalone application includes:

- **Demand Forecasting**: Advanced forecasting models with multiple scenarios
- **Green Field Analysis (GFA)**: Distribution center location optimization
- **Inventory Optimization**: Stock level optimization and simulation
- **Network Analysis**: Supply chain network optimization
- **Scenario Planning**: Multiple scenario analysis tools

All data is stored locally on your computer - no internet connection required.

## Data Storage

All your data is stored locally in:
- **Windows**: `%APPDATA%/jcg-supply-chain-analytics`
- **Mac**: `~/Library/Application Support/jcg-supply-chain-analytics`
- **Linux**: `~/.config/jcg-supply-chain-analytics`

## Troubleshooting

### Application won't start
- Ensure your system meets the minimum requirements
- Try running as administrator (Windows) or with sudo (Linux)
- Check if antivirus is blocking the application

### Data not persisting
- Check folder permissions for the data storage location
- Ensure you have write access to the application data folder

### Performance issues
- Close other heavy applications
- Ensure you have at least 4GB available RAM
- Check available disk space

## Uninstallation

### Windows
- Use "Add or Remove Programs" in Windows Settings
- Or run the uninstaller from the installation directory

### Mac
- Drag "JCG Supply Chain Analytics" from Applications to Trash
- Remove data folder: `~/Library/Application Support/jcg-supply-chain-analytics`

### Linux
- AppImage: Simply delete the .AppImage file
- .deb: `sudo apt remove jcg-supply-chain-analytics`

## Support

For issues or questions, refer to the built-in help documentation or contact support.

## Version Information

This is a complete standalone version with no external dependencies or cloud services required.
