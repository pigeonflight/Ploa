#!/bin/bash

# Build script for macOS App Store
# Usage: ./build_mac_app_store.sh

echo "Building for macOS App Store..."

# Ensure dependencies are installed
bun install

# Build the app
# Note: For actual App Store submission, you need to have your signing identity set up.
# You can pass it via environment variable or let Tauri detect it if configured in keychain.
# Example: export TAURI_SIGNING_IDENTITY="3rd Party Mac Developer Application: Your Name (TEAMID)"

bun run tauri build --target universal-apple-darwin

echo "Build complete. Check src-tauri/target/universal-apple-darwin/release/bundle/ for the output."
