# Code Signing Setup for Ploa

## Prerequisites

1. **Apple Developer Account** - You already have this ✓
2. **Developer ID Certificate** - Required for distribution outside App Store

## Getting a Developer ID Certificate

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/certificates/list)
2. Click the "+" button to create a new certificate
3. Select "Developer ID Application" (not "Apple Development")
4. Follow the instructions to create a Certificate Signing Request (CSR)
5. Download and install the certificate in Keychain Access

## Local Development Signing

Your Developer ID certificate is configured in `tauri.conf.json`:
- **Certificate**: Developer ID Application: David Bain (963VDG875L)
- **Team ID**: 963VDG875L

For local builds, Tauri will automatically use this certificate:

```bash
bun run tauri:build
```

The app will be signed and ready for distribution. No "damaged" error!

## GitHub Actions Signing

For CI/CD builds, you need to:

1. Export your Developer ID certificate and private key
2. Add them as GitHub Secrets:
   - `APPLE_CERTIFICATE` - Base64 encoded .p12 certificate
   - `APPLE_CERTIFICATE_PASSWORD` - Password for the certificate
   - `APPLE_TEAM_ID` - Your Apple Team ID (found in developer portal)

3. The workflow will automatically use these for signing

## Export Certificate for CI/CD

To enable signing in GitHub Actions, export your Developer ID certificate:

```bash
# Export your Developer ID certificate (replace PASSWORD with a secure password)
security export -k ~/Library/Keychains/login.keychain-db -t identities -f pkcs12 -P "PASSWORD" -o certificate.p12 "Developer ID Application: David Bain (963VDG875L)"

# Base64 encode it
base64 -i certificate.p12 -o certificate_base64.txt

# Then add to GitHub Secrets:
# - APPLE_CERTIFICATE: contents of certificate_base64.txt
# - APPLE_CERTIFICATE_PASSWORD: the PASSWORD you used above
# - APPLE_TEAM_ID: 963VDG875L
```

## Notarization (Optional but Recommended)

After signing, you can notarize the app for better user experience:

1. Get an App-Specific Password from [appleid.apple.com](https://appleid.apple.com)
2. Add as GitHub Secret: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`
3. The workflow will automatically notarize after signing

