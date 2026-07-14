# Unified Camera Scan Screen (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the approved Phase-0 components (`ScanBackdrop`, `ScanPromptCard`) into the real camera flow so one screen handles free-teaser / grant / open-settings / live states, and fix the permanent-denial dead end (AUDIT_MAJOR issue 15).

**Architecture:** A pure decision helper (`nextPermissionAction`) picks 'request' vs 'settings' from `canAskAgain`. `cameraScreen.tsx` becomes a `hasPremium × permission` state router composing the existing presentational components; the live camera / preview code is untouched. The FAB always opens the camera screen.

**Tech Stack:** React Native / Expo 54, expo-camera (`useCameraPermissions`), expo-image-picker, Jest + jest-expo.

**Spec:** `docs/superpowers/specs/2026-07-14-unified-camera-scan-screen-design.md`. Phase 0 (components + Dev Hub page) is already built and user-approved.

## Global Constraints

- **NO git operations.** No commits, branches, or pushes — the user owns all version control. Where a normal TDD plan says "Commit", instead just proceed; all changes stay in the working tree.
- Repo conventions: no comments unless non-obvious; function components only; theme via `@/context/ThemeContext` tokens; `makeStyles(colors)` + `useMemo`.
- Copy strings must match the Phase-0 Dev Hub harness exactly (they were user-approved there):
  - Upgrade: title `Scan Meals with AI`, message `Snap a photo of any meal, item, or nutrition label and let AI log the macros for you. Upgrade to unlock scanning.`, CTA `Upgrade to Scan`
  - Grant: title `Camera Access Required`, message `We need access to your camera to take photos of your meals for nutrition tracking with AI analysis.`, CTA `Grant Permission`
  - Settings: title `Camera Access Denied`, message `Camera access is turned off for this app. Enable Camera in Settings to scan your meals.`, CTA `Open Settings`
  - Library alert: title `Photo Library Access`, message `Enable photo access in Settings to choose a meal photo.`, buttons `Cancel` / `Open Settings`
- The free (`!hasPremium`) branch must never call `requestPermission()`. (`useCameraPermissions()` stays mounted top-level — rules of hooks — but it only *reads* status; reading does not trigger the iOS prompt.)
- Pre-existing baseline: `npx jest --ci` has 6 failing suites / 64 failing tests unrelated to this work (supabase env + mock issues). Success = no NEW failures. `npx tsc --noEmit` has pre-existing errors; success = no errors mentioning the files this plan touches.

---

### Task 1: Permission decision helper (TDD)

**Files:**
- Create: `lib/utils/permissions.ts`
- Test: `lib/utils/__tests__/permissions.test.ts`

**Interfaces:**
- Consumes: `Linking` from react-native.
- Produces (Tasks 2 depends on these exact names):
  - `nextPermissionAction(p: { canAskAgain: boolean }): 'request' | 'settings'`
  - `openAppSettings(): void`

- [ ] **Step 1: Write the failing test**

Create `lib/utils/__tests__/permissions.test.ts`:

```ts
import { Linking } from 'react-native'
import { nextPermissionAction, openAppSettings } from '../permissions'

describe('nextPermissionAction', () => {
    it("returns 'request' while the OS can still show the prompt", () => {
        expect(nextPermissionAction({ canAskAgain: true })).toBe('request')
    })

    it("returns 'settings' after a permanent denial", () => {
        expect(nextPermissionAction({ canAskAgain: false })).toBe('settings')
    })
})

describe('openAppSettings', () => {
    it('deep-links to the app settings page', () => {
        const spy = jest.spyOn(Linking, 'openSettings').mockResolvedValue()
        openAppSettings()
        expect(spy).toHaveBeenCalledTimes(1)
        spy.mockRestore()
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/utils/__tests__/permissions.test.ts`
Expected: FAIL — `Cannot find module '../permissions'`

- [ ] **Step 3: Write minimal implementation**

Create `lib/utils/permissions.ts`:

```ts
import { Linking } from 'react-native'

export function nextPermissionAction(p: { canAskAgain: boolean }): 'request' | 'settings' {
    return p.canAskAgain ? 'request' : 'settings'
}

export function openAppSettings(): void {
    void Linking.openSettings()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/utils/__tests__/permissions.test.ts`
Expected: PASS (3 tests)

---

### Task 2: cameraScreen becomes the state router

**Files:**
- Modify: `app/nutritionScreens/cameraScreen.tsx` (imports; lines ~24-58 permission/loading views; `pickFromLibrary` denial alert; delete dead styles)

**Interfaces:**
- Consumes: `nextPermissionAction` / `openAppSettings` (Task 1), `ScanBackdrop` and `ScanPromptCard` (already exist in `components/NutritionComponents/`), `useBilling` from `@/context/BillingContext`.
- Produces: nothing new — screen behavior only.

- [ ] **Step 1: Update imports**

At the top of `cameraScreen.tsx`:
- Add:
```tsx
import ScanBackdrop from '@/components/NutritionComponents/ScanBackdrop'
import ScanPromptCard from '@/components/NutritionComponents/ScanPromptCard'
import { useBilling } from '@/context/BillingContext'
import { nextPermissionAction, openAppSettings } from '@/lib/utils/permissions'
```
- In the lucide import, add `Settings` and `Sparkles` (keep `Camera` — the grant card uses it).

- [ ] **Step 2: Add `hasPremium` and replace the loading + permission views**

Inside the component add (next to the other hooks):
```tsx
const { hasPremium } = useBilling()
```

Replace the two early-return blocks (`if (!permission) {...}` and `if (!permission.granted) {...}`, currently lines 24-58) with:

```tsx
if (!hasPremium) {
    return (
        <View style={styles.cameraContainer}>
            <View style={styles.handleContainerAbsolute}>
                <View style={styles.handle} />
            </View>
            <ScanBackdrop />
            <ScanPromptCard
                icon={Sparkles}
                title="Scan Meals with AI"
                message="Snap a photo of any meal, item, or nutrition label and let AI log the macros for you. Upgrade to unlock scanning."
                ctaLabel="Upgrade to Scan"
                onPress={() => router.push('/settingsScreens/subscription')}
                onGoBack={() => router.back()}
            />
        </View>
    )
}

if (!permission) {
    return (
        <View style={styles.cameraContainer}>
            <View style={styles.handleContainerAbsolute}>
                <View style={styles.handle} />
            </View>
            <ScanBackdrop />
        </View>
    )
}

if (!permission.granted) {
    const needsSettings = nextPermissionAction(permission) === 'settings'
    return (
        <View style={styles.cameraContainer}>
            <View style={styles.handleContainerAbsolute}>
                <View style={styles.handle} />
            </View>
            <ScanBackdrop />
            <ScanPromptCard
                icon={needsSettings ? Settings : Camera}
                title={needsSettings ? 'Camera Access Denied' : 'Camera Access Required'}
                message={
                    needsSettings ?
                        'Camera access is turned off for this app. Enable Camera in Settings to scan your meals.'
                    :   'We need access to your camera to take photos of your meals for nutrition tracking with AI analysis.'
                }
                ctaLabel={needsSettings ? 'Open Settings' : 'Grant Permission'}
                onPress={needsSettings ? openAppSettings : requestPermission}
                onGoBack={() => router.back()}
            />
        </View>
    )
}
```

Note: the upgrade branch intentionally comes FIRST so free users never reach any permission UI, and the `!permission` loading branch shows the backdrop instead of the old "Loading camera..." text.

- [ ] **Step 3: Fix `pickFromLibrary`'s denial dead end**

Replace (currently lines 89-92):
```tsx
            if (!permissionResult.granted) {
                Alert.alert('Permission Required', 'Please allow access to your photo library to choose a meal photo.')
                return
            }
```
with:
```tsx
            if (!permissionResult.granted) {
                if (nextPermissionAction(permissionResult) === 'settings') {
                    Alert.alert('Photo Library Access', 'Enable photo access in Settings to choose a meal photo.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: openAppSettings },
                    ])
                } else {
                    Alert.alert('Permission Required', 'Please allow access to your photo library to choose a meal photo.')
                }
                return
            }
```

- [ ] **Step 4: Delete the now-dead styles**

In `makeStyles`, the replaced views orphan these keys — delete them (typecheck will NOT flag unused StyleSheet keys, so do it by hand): `container`, `handleContainer`, `permissionContentWrapper`, `permissionContent`, `iconCircle`, `permissionTitle`, `permissionMessage`, `permissionText`, `permissionButtonTouchable`, `permissionButton`, `permissionButtonText`, `cancelButton`, `cancelButtonText`.

Keep `LinearGradient` imported (the photo-preview "Use Photo" button still uses it). Grep the file for each deleted key first to confirm zero remaining references.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -i "cameraScreen"`
Expected: no output.
Run: `npx jest --ci 2>&1 | grep -E "^Tests:"`
Expected: same failure count as the pre-existing baseline (64 failed), no new failures.

---

### Task 3: Camera FAB always opens the camera screen

**Files:**
- Modify: `app/(tabs)/index.tsx:62` (camera button only)

**Interfaces:**
- Consumes: nothing new. `hasPremium` stays imported/used by the Food Database button — do not remove it.
- Produces: nothing.

- [ ] **Step 1: Make the change**

Replace line 62:
```tsx
<TouchableOpacity activeOpacity={0.75} key="camera" style={[hasPremium ? styles.nutritionFabButtons : styles.nutritionUnavailableFabButtons]} onPress={() => (hasPremium ? router.push('/nutritionScreens/cameraScreen') : router.push('/settingsScreens/subscription'))}>
```
with:
```tsx
<TouchableOpacity activeOpacity={0.75} key="camera" style={[styles.nutritionFabButtons]} onPress={() => router.push('/nutritionScreens/cameraScreen')}>
```

The Food Database button (line ~67) keeps its `hasPremium` branch and `nutritionUnavailableFabButtons` style — OUT OF SCOPE, do not touch. Because Food DB still uses `nutritionUnavailableFabButtons`, do not delete that style.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -iE "tabs.index|\(tabs\)"`
Expected: no output.

---

### Task 4: Simplify, full verification, docs

**Files:**
- Possibly modify: files from Tasks 1-3 (simplifier output)
- Modify: `docs/AUDIT_MAJOR.txt` (issue 15 — only after device verification)

- [ ] **Step 1: Run code-simplifier**

Dispatch the `code-simplifier:code-simplifier` agent scoped to: `lib/utils/permissions.ts`, `lib/utils/__tests__/permissions.test.ts`, `app/nutritionScreens/cameraScreen.tsx`, `app/(tabs)/index.tsx`. Constraints for it: preserve behavior exactly; copy strings are user-approved verbatim; repo conventions apply; no git commands.

- [ ] **Step 2: Full verification**

Run: `npx jest --ci 2>&1 | grep -E "^(Tests|Test Suites):"`
Expected: 64 failed (pre-existing) + all new permission tests passing; no new suite failures.
Run: `npx tsc --noEmit 2>&1 | grep -iE "permissions|cameraScreen|ScanBackdrop|ScanPromptCard|\(tabs\)"`
Expected: no output.

- [ ] **Step 3: Manual device verification (user, on simulator/device)**

1. Free account → tap camera FAB → teaser renders (backdrop + Upgrade card) → Upgrade to Scan → subscription screen; Go Back closes.
2. Premium, first run → camera FAB → Grant card → Grant Permission fires the native iOS prompt → Allow → live camera.
3. Premium, deny the prompt → reopen → card shows Open Settings → deep-links to the app's iOS Settings page → enable Camera → return → live camera.
4. In live camera → library button; with library permanently denied → alert offers Cancel / Open Settings and the link works.
5. Dev Hub → Scan Screen page still renders all variants (components shared with prod path).

- [ ] **Step 4: After the user confirms device verification, update AUDIT_MAJOR.txt**

Per the file's own convention ("Delete entries as they get fixed"), delete the issue 15 entry (title through its PLAN block). Do NOT do this before Step 3 passes on a device.
