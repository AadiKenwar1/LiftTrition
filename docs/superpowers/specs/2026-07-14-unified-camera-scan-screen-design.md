# Unified Camera Scan Screen + Free Teaser — Design

Date: 2026-07-14
Origin: AUDIT_MAJOR.txt issue 15 ("Denying camera access once bricks the AI scan feature")

## Problem

Two distinct friction points around the AI scan (camera) entry:

1. **Permanent-denial dead end (the original bug).** After an iOS "Don't Allow",
   `requestPermission()` resolves without a prompt, so the "Grant Permission"
   button silently does nothing. No route to Settings. `pickFromLibrary` has the
   same dead end (`app/nutritionScreens/cameraScreen.tsx`).
2. **Free users are hard-bounced.** The camera FAB
   (`app/(tabs)/index.tsx:62`) routes non-premium users straight to
   `/settingsScreens/subscription` — they never see what they're paying for.

## Goals

- One camera screen that correctly handles all four states: free vs premium,
  crossed with granted vs not-granted.
- Free users get a static "glimpse" of the scan UI with an upgrade CTA instead of
  an unexplained paywall bounce.
- Fix the permanent-denial dead end (camera view + library picker) by deep-linking
  to iOS Settings when the OS will no longer prompt.

## Non-goals

- Food Database button (`index.tsx:67`) keeps its current instant bounce — out of
  scope.
- No change to the live-camera capture flow, preview, or analyze path.
- No removal of the premium permission priming screen (see Rationale).
- The free teaser never requests camera permission (no live viewfinder for free
  users).

## Constraints & rationale

- **iOS renders no live preview without granted camera permission.** So the
  "blurred camera" backdrop is a *static* asset, not a blurred live feed. This is
  what makes the states unifiable: in every non-granted state (free,
  undetermined, permanently-denied) the backdrop is identical; only the overlay
  prompt changes. The live `CameraView` appears only in the premium+granted state.
- **The iOS permission prompt can be shown exactly once.** A priming screen
  ("Camera Access Required…") before the system dialog raises the Allow rate and
  reduces the number of users who hit the permanent-denial path. Therefore the
  priming step is kept for premium users; we do NOT cold-auto-prompt on mount.
- **`hasPremium` is settled before this screen is reachable.** The route guard
  only renders `(tabs)` once all contexts (incl. billing) have loaded, so a
  premium user will not briefly flash the free teaser.

## Design

### State router (cameraScreen)

Inputs: `hasPremium` (`useBilling`) and `permission` (`useCameraPermissions`).

| State | Backdrop | Overlay |
| --- | --- | --- |
| Not premium | static | ScanPromptCard `upgrade` → `/settingsScreens/subscription` |
| Premium, permission loading (`!permission`) | static | none |
| Premium, not granted, `canAskAgain` | static | ScanPromptCard `grant` → `requestPermission` |
| Premium, not granted, `!canAskAgain` | static | ScanPromptCard `settings` → `openAppSettings()` |
| Premium, granted, `capturedPhoto` | — | existing photo preview (unchanged) |
| Premium, granted | live `CameraView` | existing controls (unchanged) |

`pickFromLibrary`'s denial `Alert` gains an "Open Settings" action via the same
helper.

Navigation: the upgrade CTA uses `router.replace('/settingsScreens/subscription')`,
not `push` — the subscription screen is a card-presentation route, and pushing a
card from inside the camera modal presents it as a second, undismissable modal
(no back chevron in its own presentation context, and swipe is globally
disabled). `replace` swaps the modal for the card in the root stack, arriving
with a working back button — the same pattern addNutritionModal uses for its
locked AI feature. After upgrading, the user backs out to tabs and reopens the
camera FAB, which now renders the permission/live path.

### Units

**New**

- `lib/utils/permissions.ts` — pure `nextPermissionAction(response) → 'request' |
  'settings'` (keyed on `canAskAgain`) + `openAppSettings()` wrapping
  `Linking.openSettings()`. Shared by camera view and library picker.
- `components/NutritionComponents/ScanBackdrop.tsx` — static scan chrome (frame
  corners, Meal/Item/Label pills, capture button) over a dark-gradient/blur
  placeholder. Non-interactive, decorative.
- `components/NutritionComponents/ScanPromptCard.tsx` — presentational card:
  `{ icon, title, message, ctaLabel, onPress, onGoBack? }` → icon circle + title +
  message + gradient CTA + optional "Go Back". Generalizes the existing permission
  view's card markup.

**Changed**

- `app/nutritionScreens/cameraScreen.tsx` — becomes the state router composing the
  above; live camera / preview / `takePicture` / mode+flash+facing state stay
  as-is. The three variant configs (icon/title/message/cta) live at the call site.
- `app/(tabs)/index.tsx` — camera FAB always `push('/nutritionScreens/cameraScreen')`;
  drop the `hasPremium ?` branch and `nutritionUnavailableFabButtons` on the
  camera button only (Food DB button unchanged).

### Chrome fidelity (deferred decision)

The static backdrop redraws the same chrome the live camera overlays. Start with an
*approximate* redraw; only extract the chrome (frame + pills) into a shared
component used by both backdrop and live camera if the transition "jump" on grant
is actually visible. YAGNI first.

### Asset note

Backdrop starts as a dark gradient + static frame — no new image asset. A blurred
sample-meal photo can be added later if the plain backdrop looks flat.

## Phasing

**Phase 0 — Dev Hub preview (build first).**
- Build `ScanBackdrop` + `ScanPromptCard` (real, shippable).
- `components/devTest/ScanScreenTest.tsx` renders them with `DevControls`
  (segmented state toggle: `upgrade` / `grant` / `settings` / `loading`) + a
  Light/Dark switch.
- Stub `app/devTest/scanScreen.tsx` (`__DEV__ ? require : null`); register in the
  `app/_layout.tsx` Stack and the `GROUPS` array in `DevHub.tsx`.
- Purpose: iterate on the look with zero risk to the real flow.

**Phase 1 — wire into real flow (after the look is approved).**
- `lib/utils/permissions.ts` (TDD on `nextPermissionAction`).
- `cameraScreen.tsx` state router + `pickFromLibrary` fix.
- `index.tsx` FAB change.

## Testing

- **TDD unit:** `nextPermissionAction` — `canAskAgain: true → 'request'`,
  `false → 'settings'`. `openAppSettings` — asserts `Linking.openSettings` called
  (mocked).
- **Manual (simulator):** `ScanBackdrop`, `ScanPromptCard`, and the assembled
  `cameraScreen` across all four states, in dark and light — consistent with the
  repo's existing view-testing approach (heavy provider trees are impractical
  under the current `react-test-renderer` setup). The Dev Hub page is the primary
  manual harness for the non-live states.

## Docs

- Extend AUDIT_MAJOR.txt issue 15's PLAN to describe this unified-screen redesign
  (teaser + backdrop + prompt-card variants); the original permission fix becomes
  the seed of it.

## Verification

- Dev Hub → Scan Screen: all prompt variants render correctly over the backdrop in
  light and dark.
- Real device: free user → teaser → Upgrade → subscription; upgrade → return →
  permission/live path. Premium first run → priming → prompt → camera. Permanent
  deny → "Open Settings" deep-links to the app's settings page; same for library
  picker.
