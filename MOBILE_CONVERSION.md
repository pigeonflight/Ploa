# Mobile App Conversion Guide

## Current Architecture

- **Frontend**: HTML/CSS/TypeScript (web-based)
- **Backend**: Rust (Tauri) - acts as HTTP client to Plone REST API
- **API Layer**: All calls go through Tauri `invoke()` commands
- **State**: Authentication tokens stored in Rust backend state

## Conversion Difficulty: **EASY** ⭐⭐⭐⭐⭐

The app is **very well-suited** for mobile conversion because:
1. Frontend is already web-based (HTML/CSS/JS)
2. Backend only does HTTP requests (no native desktop features)
3. All API calls are abstracted through `src/lib/api.ts`
4. No file system access or other desktop-specific features

## Recommended Approach: **Capacitor** (Easiest Path)

### Why Capacitor?

1. **Minimal Code Changes**: ~95% of frontend code can be reused
2. **Native Features**: Access to camera, file system, push notifications if needed
3. **Mature**: Well-established, used by Ionic, many production apps
4. **Single Codebase**: Same code for iOS and Android
5. **App Store Ready**: Can publish to both stores

### What Needs to Change

#### 1. Replace Tauri API Layer (1-2 hours)

Replace `src/lib/api.ts` to use `fetch()` instead of `invoke()`:

```typescript
// OLD (Tauri)
import { invoke } from "@tauri-apps/api/core";
const response = await invoke("login", { baseUrl, username, password });

// NEW (Capacitor/Mobile)
const response = await fetch(`${baseUrl}/@login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ login: username, password })
});
```

#### 2. Handle Authentication State (30 minutes)

- **Current**: Stored in Rust backend state
- **Mobile**: Store tokens in Capacitor Preferences or localStorage
- **Change**: Manage auth state in frontend instead of backend

#### 3. Remove Tauri-Specific Code (15 minutes)

- Remove `plugin:shell|open` calls (use Capacitor Browser plugin instead)
- Remove `get_app_version` if not needed
- Remove Tauri imports

#### 4. Add Responsive Design (2-4 hours)

- Current UI might need mobile-friendly adjustments
- Touch-friendly button sizes
- Mobile navigation patterns
- Responsive tree view

#### 5. Setup Capacitor (30 minutes)

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npx cap init
npx cap add ios
npx cap add android
```

### Estimated Total Time: **4-8 hours**

## Alternative: Progressive Web App (PWA)

### Pros:
- **Fastest**: Almost no code changes needed
- **No App Store**: Deploy as web app
- **Offline Support**: Can add service workers
- **Cross-Platform**: Works on all devices

### Cons:
- **Limited Native Features**: No push notifications, limited file access
- **Distribution**: Users need to "Add to Home Screen"
- **Performance**: Slightly slower than native

### Implementation: **1-2 hours**

Just add a `manifest.json` and service worker:

```json
{
  "name": "Ploa",
  "short_name": "Ploa",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFF8DE",
  "theme_color": "#8CA9FF"
}
```

## Alternative: Tauri Mobile (Future)

Tauri has mobile support in **alpha/beta**:
- Could potentially keep Rust backend
- Less mature, might have issues
- **Not recommended** for production yet

## Code Changes Breakdown

### Files That Need Changes:

1. **`src/lib/api.ts`** - Replace all `invoke()` calls with `fetch()`
2. **`src/main.ts`** - Remove Tauri-specific code (shell.open, etc.)
3. **`package.json`** - Remove Tauri deps, add Capacitor deps
4. **`src-tauri/`** - Can be removed entirely (or kept for desktop builds)

### Files That Stay the Same:

- **`src/main.ts`** - UI logic (95% unchanged)
- **`src/style.css`** - Styling (might need responsive tweaks)
- All HTML structure
- All business logic

## Migration Steps

### Step 1: Create Mobile API Layer
```typescript
// src/lib/api-mobile.ts
// Direct HTTP calls to Plone REST API
export async function login(baseUrl: string, username: string, password: string) {
  const response = await fetch(`${baseUrl}/@login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: username, password })
  });
  const data = await response.json();
  // Store token in Capacitor Preferences
  await Preferences.set({ key: 'plone_token', value: data.token });
  return data;
}
```

### Step 2: Add Auth Header Helper
```typescript
// src/lib/api-mobile.ts
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await Preferences.get({ key: 'plone_token' });
  return {
    'Authorization': `Bearer ${token.value}`,
    'Content-Type': 'application/json'
  };
}
```

### Step 3: Update All API Calls
Replace each `invoke()` call with equivalent `fetch()` call.

### Step 4: Test & Deploy
```bash
npx cap sync
npx cap open ios    # or android
```

## Recommendation

**Start with PWA** (1-2 hours) to validate mobile experience, then move to **Capacitor** (4-8 hours) if you need native features or app store distribution.

The codebase is **perfectly structured** for mobile - the abstraction layer in `api.ts` means you only need to change one file!

