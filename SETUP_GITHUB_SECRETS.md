# Setting Up GitHub Secrets for Code Signing

## Step 1: Export Your Certificate

You have a secure password saved in `.cert-password.txt`. To export your certificate:

### Option A: Run the script (may prompt for macOS password)

```bash
./export-certificate.sh "$(cat .cert-password.txt)"
```

When prompted, enter your **macOS login password** (not the certificate password).

### Option B: Manual export via Keychain Access

1. Open **Keychain Access** app
2. Find "Developer ID Application: David Bain (963VDG875L)"
3. Right-click → **Export "Developer ID Application: David Bain (963VDG875L)"**
4. Choose location and save as `certificate.p12`
5. When prompted, set a password (use the one from `.cert-password.txt`)
6. Enter your macOS login password when asked

Then encode it:
```bash
base64 -i certificate.p12 -o certificate_base64.txt
```

## Step 2: Add GitHub Secrets

1. Go to: https://github.com/pigeonflight/Ploa/settings/secrets/actions
2. Click "New repository secret" for each:

   **APPLE_CERTIFICATE**
   - Name: `APPLE_CERTIFICATE`
   - Value: Copy the entire contents of `certificate_base64.txt`

   **APPLE_CERTIFICATE_PASSWORD**
   - Name: `APPLE_CERTIFICATE_PASSWORD`
   - Value: `lQxk79MKKaDBOhMR+pbSNNSDZ2A3InjNjkGi07wjdHQ=` (from `.cert-password.txt`)

   **APPLE_TEAM_ID**
   - Name: `APPLE_TEAM_ID`
   - Value: `963VDG875L`

## Step 3: Optional - Notarization Setup

For notarization (recommended for better user experience):

1. Go to https://appleid.apple.com
2. Sign in with your Apple ID
3. Generate an App-Specific Password:
   - Go to "Sign-In and Security" → "App-Specific Passwords"
   - Click "Generate an app-specific password"
   - Name it "Ploa Notarization" or similar
   - Copy the password

4. Add GitHub Secrets:
   - **APPLE_ID**: Your Apple ID email address
   - **APPLE_APP_SPECIFIC_PASSWORD**: The app-specific password you just generated

## Step 4: Verify

After adding all secrets, the next release build will automatically:
- Sign the macOS app with your Developer ID certificate
- Notarize it (if APPLE_ID and APPLE_APP_SPECIFIC_PASSWORD are set)
- Users won't see the "damaged" error!

## Security Notes

⚠️ **Important:**
- Never commit `.cert-password.txt`, `certificate.p12`, or `certificate_base64.txt` to git
- These files are already in `.gitignore`
- Delete the exported files after adding to GitHub Secrets
- The certificate password is only for encrypting the export file

