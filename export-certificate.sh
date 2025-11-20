#!/bin/bash

# Script to export Developer ID certificate for GitHub Actions
# Usage: ./export-certificate.sh [password]

CERT_NAME="Developer ID Application: David Bain (963VDG875L)"
TEAM_ID="963VDG875L"
OUTPUT_FILE="certificate.p12"
BASE64_FILE="certificate_base64.txt"

if [ -z "$1" ]; then
    echo "Usage: $0 <certificate-password>"
    echo ""
    echo "This script will:"
    echo "1. Export your Developer ID certificate to certificate.p12"
    echo "2. Base64 encode it to certificate_base64.txt"
    echo ""
    echo "Then add to GitHub Secrets:"
    echo "  - APPLE_CERTIFICATE: contents of certificate_base64.txt"
    echo "  - APPLE_CERTIFICATE_PASSWORD: the password you provided"
    echo "  - APPLE_TEAM_ID: $TEAM_ID"
    exit 1
fi

PASSWORD="$1"

echo "Exporting certificate..."
echo "Note: You may be prompted for your macOS login password to access the keychain."
security export -k ~/Library/Keychains/login.keychain-db -t identities -f pkcs12 -P "$PASSWORD" -o "$OUTPUT_FILE" "$CERT_NAME" 2>&1

if [ $? -ne 0 ]; then
    echo "Error: Failed to export certificate"
    exit 1
fi

echo "Base64 encoding certificate..."
base64 -i "$OUTPUT_FILE" -o "$BASE64_FILE"

if [ $? -ne 0 ]; then
    echo "Error: Failed to encode certificate"
    exit 1
fi

echo ""
echo "✓ Certificate exported successfully!"
echo ""
echo "Next steps:"
echo "1. Copy the contents of $BASE64_FILE"
echo "2. Go to: https://github.com/pigeonflight/Ploa/settings/secrets/actions"
echo "3. Add these secrets:"
echo "   - APPLE_CERTIFICATE: (paste contents of $BASE64_FILE)"
echo "   - APPLE_CERTIFICATE_PASSWORD: $PASSWORD"
echo "   - APPLE_TEAM_ID: $TEAM_ID"
echo ""
echo "For notarization (optional but recommended):"
echo "   - APPLE_ID: (your Apple ID email)"
echo "   - APPLE_APP_SPECIFIC_PASSWORD: (get from https://appleid.apple.com)"
echo ""
echo "⚠️  Keep $PASSWORD and $BASE64_FILE secure! Delete them after adding to GitHub Secrets."

