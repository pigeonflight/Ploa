#!/bin/bash
# Regenerate Tauri app icons from PloaCircle.svg with transparent backgrounds

set -e

SVG_SOURCE="public/PloaCircle.svg"
ICONS_DIR="src-tauri/icons"

if [ ! -f "$SVG_SOURCE" ]; then
    echo "Error: SVG source file not found at $SVG_SOURCE"
    exit 1
fi

if [ ! -d "$ICONS_DIR" ]; then
    echo "Error: Icons directory not found at $ICONS_DIR"
    exit 1
fi

echo "Regenerating icons from $SVG_SOURCE with transparent backgrounds..."

# Create iconset directory for macOS
ICONSET_DIR="$ICONS_DIR/icon.iconset"
mkdir -p "$ICONSET_DIR"

# Function to generate padded icon
# Usage: generate_icon <size> <filename>
generate_icon() {
    local size=$1
    local filename=$2
    # Calculate padded size (75% of full size)
    local padded_size=$(($size * 75 / 100))
    
    magick -background none "$SVG_SOURCE" -resize ${padded_size}x${padded_size} -gravity center -background none -extent ${size}x${size} -define png:format=png32 "$ICONSET_DIR/$filename"
    echo "  Generated $filename ($size x $size)"
}

echo "Generating macOS iconset..."

# Standard sizes
generate_icon 16 "icon_16x16.png"
generate_icon 32 "icon_32x32.png"
generate_icon 128 "icon_128x128.png"
generate_icon 256 "icon_256x256.png"
generate_icon 512 "icon_512x512.png"

# Retina sizes (@2x)
generate_icon 32 "icon_16x16@2x.png"
generate_icon 64 "icon_32x32@2x.png"
generate_icon 256 "icon_128x128@2x.png"
generate_icon 512 "icon_256x256@2x.png"
generate_icon 1024 "icon_512x512@2x.png"

# Compile .icns file
echo "Compiling icon.icns..."
iconutil -c icns "$ICONSET_DIR" -o "$ICONS_DIR/icon.icns"
echo "✓ Generated icon.icns"

# Clean up iconset directory
rm -rf "$ICONSET_DIR"

# Generate standard PNGs and ICO for Tauri (Windows/Linux) using the same padding logic
echo "Generating standard Tauri icons..."

# 32x32
magick -background none "$SVG_SOURCE" -resize 24x24 -gravity center -background none -extent 32x32 -define png:format=png32 "$ICONS_DIR/32x32.png"
echo "✓ Generated 32x32.png"

# 128x128
magick -background none "$SVG_SOURCE" -resize 96x96 -gravity center -background none -extent 128x128 -define png:format=png32 "$ICONS_DIR/128x128.png"
echo "✓ Generated 128x128.png"

# 128x128@2x (256x256)
magick -background none "$SVG_SOURCE" -resize 192x192 -gravity center -background none -extent 256x256 -define png:format=png32 "$ICONS_DIR/128x128@2x.png"
echo "✓ Generated 128x128@2x.png"

# icon.ico (256x256)
magick -background none "$SVG_SOURCE" -resize 192x192 -gravity center -background none -extent 256x256 "$ICONS_DIR/icon.ico"
echo "✓ Generated icon.ico"

echo ""
echo "All icons regenerated successfully!"
echo " - src-tauri/icons/icon.icns (macOS)"
echo " - src-tauri/icons/*.png (Linux/Windows)"
echo " - src-tauri/icons/icon.ico (Windows)"

