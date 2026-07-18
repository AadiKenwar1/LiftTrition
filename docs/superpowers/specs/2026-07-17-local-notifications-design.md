# Local Notifications — Design Spec

**Date:** 2026-07-17
**Status:** Approved direction from brainstorming; awaiting implementation plan

## Summary

Add local-only notifications to PLATES using `expo-notifications`. No backend, no push tokens, no Edge Functions — iOS itself is the timer. Three notification categories in v1:

1. **Meal reminders** — "smart" daily reminders (breakfast/lunch/dinner) at user-chosen times, suppressed for meals already logged today.
2. **Streak nudge** — a morning notification when the user has an active logging streak.
3. **Re-engagement** — a static "come back" notification that fires only if the user hasn't opened the app for 3 days (sliding-window trick: rescheduled forward on every app open).

Everything is computed from local data at schedule time, consistent with the app's offline-first architecture.

## Explicitly Out of Scope (v1)

- Push notifications / server-triggered content (APNs, Expo Push, Supabase cron)
- Workout-day reminders (future extension; same builder pattern)
- Deep-linking a notification tap to a specific screen (tap opens the app)
- Syncing notification preferences across devices via PowerSync (prefs are device-local)

## Core Mechanism

**Recompute-and-reschedule on app foreground.** One idempotent routine:

```
app foreground (or prefs change)
  → read local state: prefs, today's logged meals, streak, permission status
  → cancelAllScheduledNotificationsAsync()
  → builders produce the full fresh batch
  → scheduleNotificationAsync() for each, staying well under iOS's ~64 pending cap
```

Because the batch is always rebuilt from scratch, scheduling is idempotent and never drifts from local data.

### Scheduling model per category

- **Meal reminders:** one-shot `DATE` triggers for the next 7 days × up to 3 meals (~21 pending). Today's reminder for a meal is skipped if (a) that meal is already logged, or (b) its time has passed. Using one-shot dates (not `DAILY` repeats) is what makes today "smart" while still covering days the user doesn't open the app. Meal-logged detection: a meal counts as logged if a nutrition entry exists whose `date` is today and whose `time` (epoch-ms creation timestamp, hour-of-day extracted) falls in that meal's window — breakfast = before 11:00, lunch = 11:00–15:59, dinner = 16:00 onward. Entries with `time === 0` (legacy rows) are ignored.
- **Streak nudge:** if current streak ≥ 3, schedule one `DATE` notification for tomorrow 09:00 ("N-day streak 🔥 — log a meal today to keep it going"). N is the streak value as of scheduling; acceptable staleness of at most one day. Streak source: **reuse `NutritionContext.nutritionStreak`** (`loggedToday`, `streakIncludingToday`, `streakThroughYesterday`) — no new streak computation. N = `streakIncludingToday` when `loggedToday`, else `streakThroughYesterday`.
- **Re-engagement:** one `DATE` notification for 3 days from now at 17:00 local (fixed hour so it never fires at odd times of night), static copy. Every foreground reschedule pushes it forward; it only ever fires after 3 quiet days.

**Budget:** worst case ≈ 21 + 1 + 1 = 23 pending notifications — comfortably under 64. A unit test asserts the batch size cap.

### Foreground behavior

`setNotificationHandler` configured to NOT show banners while the app is foregrounded (a reminder to open the app is noise if the app is already open).

## Architecture

Option B from brainstorming — **no new context provider**. Pure logic in `lib/`, one hook for wiring.

```
lib/notifications/
  types.ts          NotificationPrefs shape, category enum, NotificationSpec
  prefs.ts          load/save prefs via AsyncStorage (device-local)
  permissions.ts    check/request iOS permission; "denied" helpers
  builders.ts       pure: (prefs, todayState, streak, now) → NotificationSpec[]
  scheduler.ts      cancel-all + schedule batch; the only file that calls expo-notifications scheduling APIs
  __tests__/        builders + scheduler unit tests (expo-notifications mocked)

lib/hooks/
  useNotificationScheduler.ts   AppState foreground listener + initial run;
                                gathers data from useNutrition()/useWorkout()/useSettings(),
                                computes streak, calls scheduler

app/settingsScreens/
  notifications.tsx  master toggle, per-category toggles, meal time pickers,
                     permission prompt / "enable in iOS Settings" (Linking.openSettings)
                     when denied

components/devTest/
  NotificationsTest.tsx  Dev Hub page: preview each category's content, fire-in-10s
                         smoke test, dump currently scheduled batch
app/devTest/
  notifications.tsx      __DEV__-guarded route stub (existing pattern)
```

**Integration points (only three):**
1. `app.json` — `expo-notifications` plugin block (icon/color). Requires a new EAS build.
2. Mount `useNotificationScheduler()` once in `StackLayout` (inside all data providers, so it can read contexts).
3. One new row in the settings screen linking to `settingsScreens/notifications`.

## Preferences

Stored in AsyncStorage (not PowerSync) — notification prefs are device-specific by nature and the app is iOS-single-device today.

```ts
{
  enabled: boolean,                 // master, default false until permission granted
  meals: {
    breakfast: { enabled: boolean, hour: number, minute: number },  // default 09:00
    lunch:     { enabled: boolean, hour: number, minute: number },  // default 12:30
    dinner:    { enabled: boolean, hour: number, minute: number },  // default 18:30
  },
  streak: { enabled: boolean },     // default true
  reengagement: { enabled: boolean } // default true
}
```

First enable of the master toggle triggers the iOS permission prompt. If permission is denied, all scheduling is skipped and the settings screen shows an "enable in Settings" path.

## Error Handling

- Permission denied/undetermined → scheduler no-ops silently; settings screen is the only surface that talks about it.
- Scheduling API failure → caught and logged to Sentry; never blocks app load or UI. Notifications are best-effort by design.
- Prefs read failure → fall back to defaults (all off).
- Timezone/DST: all times built with local `Date` components and compared via `getDateKey`; the cancel-all-and-rebuild model self-heals any drift on next app open.

## Testing

1. **Jest (backbone):** `builders.ts` is pure — assert exact batches for scenarios: lunch already logged → no lunch reminder today; all categories on → batch ≤ 64 (and == expected count); streak < 3 → no streak notification; re-engagement date = now + 3 days; master off / permission denied → empty batch. `scheduler.ts` tested with `expo-notifications` mocked (cancel-all called before scheduling).
2. **Dev Hub (preview):** fire each category with a 10-second trigger; inspect pending batch.
3. **Manual smoke test (once):** real device — permission prompt flow, a 10-second notification lands on the lock screen, banner suppressed while foregrounded.
