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

## Project Structure

- `src/` - Frontend code (HTML/CSS/JavaScript or framework)
- `src-tauri/` - Rust backend code
- `src-tauri/src/` - Rust source files
- `src-tauri/tauri.conf.json` - Tauri configuration


