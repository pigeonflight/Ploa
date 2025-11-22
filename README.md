<div align="center">
  <img src="https://raw.githubusercontent.com/pigeonflight/Ploa/main/public/PloaCircle.svg" alt="Ploa Logo" width="176" height="176">
</div>

# Ploa - Plone REST API GUI

A Rust-based GUI application for interacting with Plone REST API sites, similar to ploneapi-shell but with a graphical interface.

## Features

- Interactive GUI for exploring Plone sites
- Navigate content hierarchy
- Manage tags and metadata
- Manipulate Plone 6 blocks
- Native macOS application with DMG packaging

## Development

### Prerequisites

- Rust (install via https://rustup.rs/)
- Bun (for Tauri frontend)
- macOS development tools (Xcode Command Line Tools)

### Setup

```bash
# Install Tauri CLI (optional, can use via bun)
# cargo install tauri-cli

# Install dependencies
bun install

# Run in development mode
bun run tauri:dev
```

### Build DMG

```bash
bun run tauri:build
```

The DMG will be created in `src-tauri/target/release/bundle/dmg/`

## Installation (macOS)

If you see a "damaged" or "cannot be opened" error when launching Ploa from the DMG, this is because the app is unsigned (macOS Gatekeeper security). To fix this:

**Option 1: Right-click to open (Recommended)**
1. Right-click on the Ploa.app in the DMG
2. Select "Open" from the context menu
3. Click "Open" in the security dialog
4. The app will now launch and be added to your exceptions list

**Option 2: Remove quarantine attribute**
Open Terminal and run:
```bash
xattr -cr /Applications/Ploa.app
```

**Note:** For production releases, the app should be code-signed with an Apple Developer certificate. Currently, Ploa is distributed unsigned for open-source releases.

## Project Structure

- `src/` - Frontend code (HTML/CSS/JavaScript or framework)
- `src-tauri/` - Rust backend code
- `src-tauri/src/` - Rust source files
- `src-tauri/tauri.conf.json` - Tauri configuration


