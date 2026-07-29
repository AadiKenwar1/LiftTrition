# PLATES — OTA Update Guide

How to ship JS changes to installed apps over the air (no App Store review), using **expo-updates** + EAS Update.

---

## TL;DR — the everyday loop

```bash
# 1. Make your JS changes (commit them — the CLI bundles your working tree either way)
# 2. Push them live:
npx eas-cli update --branch production --platform ios -m "Fix macro rounding bug"

# 3. Confirm it landed:
npx eas-cli update:list --branch production
```

Two flags are not optional:

- **`--platform ios`** — without it the CLI also exports web, which crashes (see below).
- **`--branch production`** — must match the channel the build listens to.

Every production app on the matching version picks it up on its **second** cold start.

---

## Three gates an update must pass

An update only reaches a device if **all three** line up. Miss one and nothing happens — usually with no error.

| Gate | Where it's set | Current value |
|---|---|---|
| Update URL | `app.json` → `updates.url` | `https://u.expo.dev/22572fc8-eb07-4d16-90bc-8ebd90b2a812` |
| Channel ↔ branch name | `eas.json` channel vs `--branch` | `production` ↔ `production` |
| Runtime version | `app.json` → `version` (policy is `appVersion`) | `1.0.5` |

### ⚠️ The runtime version gate is the one that bites

`runtimeVersion.policy` is **`appVersion`** — the runtime version *is* the `version` string in `app.json`.

- An update published at runtime `1.0.5` reaches **only** devices running app version `1.0.5`.
- Users still on `1.0.4` get nothing. They are not broken, just not reachable — they need the store update.
- **Bumping `version` in `app.json` cuts every installed build off from OTA** until a new binary with that version ships and users install it. Only bump it when you're actually shipping a store release.

---

## Can I OTA this change?

| ✅ Ships over the air | ❌ Needs a native rebuild + App Store |
|---|---|
| Any code in `app/`, `components/`, `lib/`, `context/` | Adding / removing / upgrading a native module* |
| React components, screens, logic, styling | Native config in `app.json` (permissions, plugins, icon, splash, scheme) |
| Copy / text fixes, bug fixes | Upgrading Expo SDK or React Native |
| Pure-JS dependencies | **Any change to images, fonts, or other assets** (see next section) |

\* Native modules here: PowerSync / `@journeyapps/react-native-quick-sqlite`, RevenueCat (`react-native-purchases`), Sentry, `expo-camera`, `expo-image-picker`, `expo-notifications`, `expo-apple-authentication`, `expo-secure-store`, `expo-store-review`, Reanimated. Touch any of these → rebuild, don't OTA.

**Rule of thumb:** changed only JS? OTA. Touched an asset or anything native? Rebuild.

---

## ⚠️ Assets do not ship over the air on this project

`app.json` sets `updates.assetPatternsToBeBundled`. This controls which assets are eligible for OTA — it does **not** affect what gets embedded in the native binary, so every asset still ships in every build as normal.

**Why it exists:** the app statically requires 1,318 exercise PNGs from
`context/WorkoutContext/exerciseLibrary/dataV2/exerciseImgs/`. A publish attempted 1,404 assets and EAS rejected it outright. Without this setting, **no update can ever be published**.

**What it means in practice:** the update ships **zero assets**. Every image and font resolves from the copy already embedded in the installed binary. That works because the binary contains all of them.

> **Windows caveat.** Expo joins these patterns with `path.join`, which produces backslashes, and then matches with `minimatch`, which reads `\` as an escape character. On Windows *every* pattern matches nothing. That's why the count is zero rather than the ~65 the patterns describe. Publishing from macOS/Linux/WSL would match properly. Not worth a second toolchain — see the consequence below and plan around it.

**The consequence, stated plainly:**

- Changing a logo, icon, font weight, or any image → **rebuild**. An OTA update will not deliver it, and the app will keep rendering the old embedded copy.
- Adding new exercise PNGs to `exerciseImgs/` → **rebuild**. Running `node scripts/generateImageMap.js` and publishing an update is not enough; the new files won't exist on device.
- Importing a font weight not already in the binary → **rebuild**, or the text falls back.

Removing or renaming an asset that JS still references is the dangerous case: the require resolves against an embedded file that isn't there. Rebuild instead.

---

## Branch ↔ channel map

A build listens to one **channel** (set in `eas.json`); you publish to a **branch**; they link by matching name.

| Build profile | Channel | Publish with | Who gets it |
|---|---|---|---|
| `production` | `production` | `eas update --branch production --platform ios` | App Store users on the matching version |
| `preview` | `preview` | `eas update --branch preview --platform ios` | TestFlight / internal testers |
| `development` | `development` | `eas update --branch development --platform ios` | Dev client builds |

**No `preview` build currently exists.** Until one is made, there is no staging step — production is the first place an update lands. Your safety net is `eas update:rollback`. If you want a real staging step:

```bash
eas build --platform ios --profile preview
```

---

## Commands you'll actually use

```bash
# Publish an update
npx eas-cli update --branch production --platform ios -m "What changed"

# See what's live + history for a branch
npx eas-cli update:list --branch production

# What the channel is currently serving
npx eas-cli channel:view production

# Instantly revert to the previous update (no rebuild, no review)
npx eas-cli update:rollback

# Inspect a specific update group
npx eas-cli update:view <update-group-id>
```

---

## Two behaviors to remember

1. **Users are one launch behind.** Launch 1 downloads the update in the background; launch 2 runs it. (We intentionally skipped the JS that would force an immediate reload — fine for bug fixes.) When testing on a device, force-quit **twice**.

2. **The CLI bundles your working tree, not your last commit.** Uncommitted changes ship. Committed-but-unsaved-in-editor changes don't. Check `git status` before publishing.

---

## ⚠️ PLATES-specific gotcha: local DB schema

The PowerSync schema (`lib/powersync/AppSchema.ts`) ships **inside the JS bundle**, so an OTA update *can* change it. That means an update can land on a device that already has local user data.

- Adding a column is safe (queries are `SELECT *`; existing rows backfill on next UPDATE).
- Any destructive or renaming schema change needs the same migration care as an App Store release — an OTA update is **not** a way to skip migration discipline.

---

## Known failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `ReferenceError: window is not defined` in `expo-router/node/render.js`, export exits 7 | `web.output` is `"static"`, so the export prerenders routes in Node and Supabase auth touches `window` | Add `--platform ios`. (Permanent alternative: set `web.output` to `"single"`.) |
| `Each update is limited to a maximum of N assets (attempted to publish 1404)` | `assetPatternsToBeBundled` missing or not taking effect | Confirm the key is present under `updates` in `app.json` |
| Published fine, but the app doesn't change | Version mismatch, or only one cold start | Check `update:list` runtime version equals the installed app's version; force-quit twice |
| Published fine, but an image is missing/stale | Asset change shipped over the air | Assets don't OTA — rebuild |
| `channel:view production` shows `updateGroups: []` | Nothing has ever published successfully | Read the tail of the failed publish output; it exits non-zero |

---

## Pre-publish checklist

- [ ] Only JS changed? No assets, no native modules, no native `app.json` config.
- [ ] `version` in `app.json` untouched (bumping it orphans installed builds).
- [ ] `npm run typecheck && npm run test:ci` pass.
- [ ] Schema change? Confirmed additive / migration-safe.
- [ ] `git status` clean — the working tree is what ships.
- [ ] Publish with **both** flags: `npx eas-cli update --branch production --platform ios -m "clear message"`.
- [ ] Verify: `npx eas-cli update:list --branch production` shows the new group at the expected runtime version.
- [ ] Broke something? `npx eas-cli update:rollback`.

---

## Config reference (already set up)

- **`app.json`**
  - `updates.url` = `https://u.expo.dev/22572fc8-eb07-4d16-90bc-8ebd90b2a812`
  - `runtimeVersion.policy` = `appVersion` → runtime version is `version` (`1.0.5`)
  - `updates.assetPatternsToBeBundled` = set, to stay under the per-update asset limit
  - `web.output` = `"static"` → this is why `--platform ios` is required
- **`eas.json`** → `channel` set on `development` / `preview` / `production`; `appVersionSource: "remote"`, production `autoIncrement: true` (bumps build number, not `version`)
- **`package.json`** → `expo-updates` (SDK 54 compatible)
