# PLATES — OTA Update Guide

How to ship JS/asset changes to installed apps over the air (no App Store review), using **expo-updates** + EAS Update.

---

## TL;DR — the everyday loop

```bash
# 1. Make + commit your JS/asset changes as usual
# 2. Push them live to users:
eas update --branch production -m "Fix macro rounding bug"
```

Every production app picks it up on its **next cold start**. That's the whole workflow.

---

## Can I OTA this change?

| ✅ Ships over the air | ❌ Needs a native rebuild + App Store |
|---|---|
| Any code in `app/`, `components/`, `lib/`, `context/` | Adding / removing / upgrading a native module* |
| React components, screens, logic, styling | Editing native config in `app.json` (permissions, plugins, icon) |
| Images, fonts, other bundled assets | Upgrading Expo SDK or React Native |
| Copy / text fixes, bug fixes | Anything that changes the native fingerprint |

\* Native modules in this app: **PowerSync / quick-sqlite, RevenueCat, Sentry, expo-camera**. Touch any of these → rebuild, don't OTA.

**Rule of thumb:** only changed JS/assets? OTA is fine. Touched anything native? Rebuild.

---

## Branch ↔ Channel map

A build listens to one **channel** (set in `eas.json`); you publish to a **branch**; they link by matching name.

| Build profile | Channel | Publish with | Who gets it |
|---|---|---|---|
| `production` | `production` | `eas update --branch production` | Real App Store users |
| `preview` | `preview` | `eas update --branch preview` | TestFlight / internal testers |
| `development` | `development` | `eas update --branch development` | Dev client builds |

**Safe pattern:** push to `preview` first → verify on a device → push the same fix to `production`.

---

## Commands you'll actually use

```bash
# Publish an update
eas update --branch production -m "What changed"

# Publish using the current git branch/commit as the message
eas update --branch production --auto

# See what's live + full history for a branch
eas update:list --branch production

# Instantly revert to the previous update (no rebuild, no review)
eas update:rollback

# Inspect a specific update group
eas update:view <update-group-id>
```

---

## One-time setup (do this once, then never again)

The updater is a native module, so it only becomes active after **one native build** that includes it:

```bash
eas build --platform ios --profile production
```

Until that build ships, installed apps have no updater and OTA does nothing.
After it ships, all future JS changes go out with `eas update`.

> First build with `runtimeVersion: { policy: "fingerprint" }` locks in the native fingerprint as the runtime version. From then on, matching fingerprints = OTA-compatible.

---

## Two behaviors to remember

1. **Users are one launch behind.** Launch 1 downloads the update in the background; launch 2 runs it. (We intentionally skipped the optional JS that would force an immediate reload — fine for bug fixes.)

2. **The fingerprint gate is automatic.** If a change shifts the native fingerprint, EAS refuses to OTA it onto older binaries — it protects users from a JS bundle their native app can't run. When that happens, rebuild instead.

---

## ⚠️ PLATES-specific gotcha: local DB schema

The PowerSync schema (`lib/powersync/AppSchema.ts`) ships **inside the JS bundle**, so an OTA update *can* change it. That means an update can land on a device that already has local user data.

- Adding a column is safe (queries are `SELECT *`; existing rows backfill on next UPDATE).
- Any destructive or renaming schema change needs the same migration care as an App Store release — an OTA update is **not** a way to skip migration discipline.

---

## Pre-publish checklist

- [ ] Only changed JS / assets? (no native module or `app.json` native config changes)
- [ ] Typecheck + tests pass: `npm run typecheck && npm run test:ci`
- [ ] Schema change? Confirmed it's additive / migration-safe.
- [ ] Risky change? Pushed to `--branch preview` and verified on a device first.
- [ ] Publishing: `eas update --branch production -m "clear message"`
- [ ] Broke something? `eas update:rollback`

---

## Config reference (already set up)

- **`app.json`** → `updates.url` = `https://u.expo.dev/22572fc8-eb07-4d16-90bc-8ebd90b2a812`, `runtimeVersion.policy` = `fingerprint`
- **`eas.json`** → `channel` set on `development` / `preview` / `production`
- **`package.json`** → `expo-updates` (SDK 54 compatible)