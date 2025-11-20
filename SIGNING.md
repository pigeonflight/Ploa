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

For local builds, you can use your Apple Development certificate:

```bash
# The signing identity will be auto-detected from your keychain
# Or set it explicitly:
export TAURI_SIGNING_IDENTITY="Apple Development: David Bain (RHAKW9ZZ34)"
bun run tauri:build
```

## GitHub Actions Signing

For CI/CD builds, you need to:

1. Export your Developer ID certificate and private key
2. Add them as GitHub Secrets:
   - `APPLE_CERTIFICATE` - Base64 encoded .p12 certificate
   - `APPLE_CERTIFICATE_PASSWORD` - Password for the certificate
   - `APPLE_TEAM_ID` - Your Apple Team ID (found in developer portal)

3. The workflow will automatically use these for signing

## Export Certificate for CI/CD

```bash
# Export your Developer ID certificate
security find-identity -v -p codesigning | grep "Developer ID"
# Note the certificate name, then:
security export -k ~/Library/Keychains/login.keychain-db -t identities -f pkcs12 -P "your-password" -o certificate.p12 "Developer ID Application: Your Name (TEAMID)"

# Base64 encode it
base64 -i certificate.p12 -o certificate_base64.txt
```

## Notarization (Optional but Recommended)

After signing, you can notarize the app for better user experience:

1. Get an App-Specific Password from [appleid.apple.com](https://appleid.apple.com)
2. Add as GitHub Secret: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`
3. The workflow will automatically notarize after signing

