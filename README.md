<div align="center">
  <img src="https://raw.githubusercontent.com/pigeonflight/Ploa/main/public/PloaCircle.svg" alt="Ploa Logo" width="176" height="176">
</div>

# Ploa - Your Plone Desktop Companion

A native desktop application that makes managing Plone sites faster and easier. Connect to your Plone site, browse content, manage tags, and edit blocks—all from a dedicated app that stays logged in and remembers your preferences.

## Features

- **Quick Access:** Instantly connect to your Plone site without browser clutter.
- **Remember Last Site:** Automatically reconnects to where you left off.
- **Fast Content Browsing:** Navigate folders and view item details quickly.
- **Tag Cleanup:** Find and merge duplicate tags across your site.
- **Visual Block Editing:** Drag-and-drop block management.
- **Native Experience:** Fast, responsive, and built for macOS.

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

## Installation

Download the latest release from the [Releases page](https://github.com/pigeonflight/Ploa/releases).

## Feedback & Support

Found a bug or have a suggestion? Please report it on our [GitHub Issues page](https://github.com/pigeonflight/Ploa/issues).

## Project Structure

- `src/` - Frontend code (HTML/CSS/JavaScript or framework)
- `src-tauri/` - Rust backend code
- `src-tauri/src/` - Rust source files
- `src-tauri/tauri.conf.json` - Tauri configuration


