# Local Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Local-only iOS notifications (smart meal reminders, streak nudge, re-engagement) via `expo-notifications` — no backend.

**Architecture:** Pure decision logic in `lib/notifications/` (builders produce a `NotificationSpec[]` batch from prefs + local data), one thin hook (`useNotificationScheduler`) that re-runs an idempotent cancel-all-and-reschedule on app foreground / data change, one settings screen, one Dev Hub page. No new context provider. Spec: `docs/superpowers/specs/2026-07-17-local-notifications-design.md`.

**Tech Stack:** Expo SDK 54 `expo-notifications` (typed triggers: `SchedulableTriggerInputTypes.DATE` / `TIME_INTERVAL`), AsyncStorage for prefs, Jest + jest-expo.

## Global Constraints

- **No git operations** — do not commit, branch, or push. The user owns version control. End every task by reporting results, not committing.
- **No comments** in code unless non-obvious; function components only.
- Styling: `makeStyles(colors)` + `useMemo`; colors/fonts/radii ONLY from `@/context/ThemeContext` (`useColors()`, `fonts`, `radius`). Verify UI in both dark and light.
- Icons from `lucide-react-native`.
- Date keys via `getDateKey` / day math via `addDays` from `@/lib/utils/dateHelper` — never `toISOString()` for dates.
- All prefs device-local in AsyncStorage — do NOT touch PowerSync schema, the Connector, or sync rules.
- iOS pending-notification cap: batch must stay ≤ 64 (worst case here is 23).
- Meal windows: breakfast = hour < 11, lunch = 11 ≤ hour < 16, dinner = hour ≥ 16.
- Test runner is watch-mode by default: use `npx jest <file>` or `npm run test:ci`, never bare `npm test`.
- AsyncStorage is already mocked globally in `jest.setup.js` — do not re-mock it in test files.
- `npx tsc --noEmit` must pass at the end of every task.

---

### Task 1: Install `expo-notifications` + app config

**Files:**
- Modify: `package.json` (via `npx expo install`)
- Modify: `app.json` (plugins array)

**Interfaces:**
- Produces: the `expo-notifications` module importable everywhere; plugin registered for EAS builds.

- [ ] **Step 1: Install the package**

Run: `npx expo install expo-notifications`
Expected: `expo-notifications` appears in `package.json` dependencies at the SDK-54-compatible version (`~0.32.x`).

- [ ] **Step 2: Register the config plugin**

In `app.json`, add `"expo-notifications"` to the `plugins` array (string entry — iOS needs no icon/sound config; those options are Android-only or for custom sounds we don't use):

```json
"plugins": [
    "expo-router",
    "@react-native-community/datetimepicker",
    "expo-apple-authentication",
    "@journeyapps/react-native-quick-sqlite",
    "expo-font",
    "expo-notifications",
```

(Leave every existing plugin entry untouched; insert the new string after `"expo-font"`.)

- [ ] **Step 3: Verify config resolves**

Run: `npx expo config --type public | Select-String "expo-notifications"` (PowerShell) — expected: plugin listed without error.
Run: `npx tsc --noEmit` — expected: clean.

Note for the reporter: local notifications require a dev-client / EAS build to test on device — Expo Go on SDK 53+ does not support them. Existing dev-client builds must be rebuilt (`eas build --platform ios --profile preview`) before device testing. Jest tests and all remaining tasks are unaffected.

---

### Task 2: Prefs — types, defaults, AsyncStorage load/save

**Files:**
- Create: `lib/notifications/types.ts`
- Create: `lib/notifications/prefs.ts`
- Test: `lib/notifications/__tests__/prefs.test.ts`

**Interfaces:**
- Produces:
  - `type MealKey = 'breakfast' | 'lunch' | 'dinner'`
  - `interface MealReminderPref { enabled: boolean; hour: number; minute: number }`
  - `interface NotificationPrefs { enabled: boolean; meals: Record<MealKey, MealReminderPref>; streak: { enabled: boolean }; reengagement: { enabled: boolean } }`
  - `interface NotificationSpec { content: { title: string; body: string }; date: Date }`
  - `const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs` (master `enabled: false`; breakfast 9:00, lunch 12:30, dinner 18:30, all meal/streak/reengagement toggles `true`)
  - `loadNotificationPrefs(): Promise<NotificationPrefs>` — merges stored JSON over defaults, falls back to defaults on any error
  - `saveNotificationPrefs(prefs: NotificationPrefs): Promise<void>` — best-effort, never throws

- [ ] **Step 1: Write the failing test**

Create `lib/notifications/__tests__/prefs.test.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { loadNotificationPrefs, saveNotificationPrefs } from '../prefs'
import { DEFAULT_NOTIFICATION_PREFS } from '../types'

describe('notification prefs', () => {
    beforeEach(() => AsyncStorage.clear())

    it('returns defaults when nothing stored', async () => {
        const prefs = await loadNotificationPrefs()
        expect(prefs).toEqual(DEFAULT_NOTIFICATION_PREFS)
        expect(prefs.enabled).toBe(false)
        expect(prefs.meals.lunch).toEqual({ enabled: true, hour: 12, minute: 30 })
    })

    it('round-trips saved prefs', async () => {
        const next = {
            ...DEFAULT_NOTIFICATION_PREFS,
            enabled: true,
            meals: { ...DEFAULT_NOTIFICATION_PREFS.meals, dinner: { enabled: false, hour: 19, minute: 15 } },
        }
        await saveNotificationPrefs(next)
        expect(await loadNotificationPrefs()).toEqual(next)
    })

    it('merges partial stored shapes over defaults', async () => {
        await AsyncStorage.setItem('@notificationPrefs', JSON.stringify({ enabled: true, meals: { lunch: { hour: 13 } } }))
        const prefs = await loadNotificationPrefs()
        expect(prefs.enabled).toBe(true)
        expect(prefs.meals.lunch).toEqual({ enabled: true, hour: 13, minute: 30 })
        expect(prefs.meals.breakfast).toEqual(DEFAULT_NOTIFICATION_PREFS.meals.breakfast)
        expect(prefs.streak.enabled).toBe(true)
    })

    it('falls back to defaults on corrupt JSON', async () => {
        await AsyncStorage.setItem('@notificationPrefs', 'not json{')
        expect(await loadNotificationPrefs()).toEqual(DEFAULT_NOTIFICATION_PREFS)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/notifications/__tests__/prefs.test.ts`
Expected: FAIL — cannot resolve `../prefs` / `../types`.

- [ ] **Step 3: Implement types and prefs**

Create `lib/notifications/types.ts`:

```ts
export type MealKey = 'breakfast' | 'lunch' | 'dinner'

export interface MealReminderPref {
    enabled: boolean
    hour: number
    minute: number
}

export interface NotificationPrefs {
    enabled: boolean
    meals: Record<MealKey, MealReminderPref>
    streak: { enabled: boolean }
    reengagement: { enabled: boolean }
}

export interface NotificationSpec {
    content: { title: string; body: string }
    date: Date
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
    enabled: false,
    meals: {
        breakfast: { enabled: true, hour: 9, minute: 0 },
        lunch: { enabled: true, hour: 12, minute: 30 },
        dinner: { enabled: true, hour: 18, minute: 30 },
    },
    streak: { enabled: true },
    reengagement: { enabled: true },
}
```

Create `lib/notifications/prefs.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DEFAULT_NOTIFICATION_PREFS, type MealKey, type NotificationPrefs } from './types'

const STORAGE_KEY = '@notificationPrefs'
const MEAL_KEYS: MealKey[] = ['breakfast', 'lunch', 'dinner']

export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (!raw) return DEFAULT_NOTIFICATION_PREFS
        const parsed = JSON.parse(raw)
        const meals = {} as NotificationPrefs['meals']
        for (const key of MEAL_KEYS) {
            meals[key] = { ...DEFAULT_NOTIFICATION_PREFS.meals[key], ...parsed.meals?.[key] }
        }
        return {
            enabled: parsed.enabled ?? DEFAULT_NOTIFICATION_PREFS.enabled,
            meals,
            streak: { ...DEFAULT_NOTIFICATION_PREFS.streak, ...parsed.streak },
            reengagement: { ...DEFAULT_NOTIFICATION_PREFS.reengagement, ...parsed.reengagement },
        }
    } catch {
        return DEFAULT_NOTIFICATION_PREFS
    }
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {
        // best-effort: a failed prefs write only costs the user one settings change
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/notifications/__tests__/prefs.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. Do not commit — report results.

---

### Task 3: Builders — pure batch construction (the core logic)

**Files:**
- Create: `lib/notifications/builders.ts`
- Test: `lib/notifications/__tests__/builders.test.ts`

**Interfaces:**
- Consumes: `NotificationPrefs`, `NotificationSpec`, `MealKey`, `DEFAULT_NOTIFICATION_PREFS` from `./types`; `NutritionEntry`, `NutritionStreakState` from `@/context/NutritionContext/types`; `addDays`, `getDateKey` from `@/lib/utils/dateHelper`.
- Produces (used by Task 4's scheduler and Task 7's Dev Hub page):
  - `mealForHour(hour: number): MealKey`
  - `getLoggedMealsForToday(entries: NutritionEntry[], now: Date): Record<MealKey, boolean>`
  - `buildMealReminders(prefs: NotificationPrefs, loggedMeals: Record<MealKey, boolean>, now: Date): NotificationSpec[]`
  - `buildStreakNudge(prefs: NotificationPrefs, streak: NutritionStreakState, now: Date): NotificationSpec[]`
  - `buildReengagement(prefs: NotificationPrefs, now: Date): NotificationSpec[]`
  - `buildNotificationBatch(input: { prefs: NotificationPrefs; permissionGranted: boolean; entries: NutritionEntry[]; streak: NutritionStreakState; now: Date }): NotificationSpec[]`
  - Constants: `MEAL_REMINDER_DAYS = 7`, `STREAK_MIN = 3`, `REENGAGEMENT_DAYS = 3`, `IOS_PENDING_LIMIT = 64`

- [ ] **Step 1: Write the failing test**

Create `lib/notifications/__tests__/builders.test.ts`. `NutritionEntry` has many required fields — use a factory. Fixed `now` throughout (2026-07-17 is a Friday):

```ts
import type { NutritionEntry, NutritionStreakState } from '@/context/NutritionContext/types'
import {
    buildMealReminders,
    buildNotificationBatch,
    buildReengagement,
    buildStreakNudge,
    getLoggedMealsForToday,
    mealForHour,
} from '../builders'
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '../types'

const enabledPrefs: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS, enabled: true }

function makeEntry(overrides: Partial<NutritionEntry>): NutritionEntry {
    return {
        id: 'e1', userId: 'u1', name: 'Meal', date: new Date(2026, 6, 17), time: 0,
        protein: 0, carbs: 0, fats: 0, calories: 0, isPhoto: false, items: [],
        createdAt: new Date(2026, 6, 17), updatedAt: new Date(2026, 6, 17),
        ...overrides,
    }
}

function entryAt(hour: number, date = new Date(2026, 6, 17)): NutritionEntry {
    return makeEntry({ date, time: new Date(2026, 6, 17, hour, 0).getTime() })
}

const noStreak: NutritionStreakState = { loggedToday: false, streakIncludingToday: 0, streakThroughYesterday: 0 }
const noMeals = { breakfast: false, lunch: false, dinner: false }

describe('mealForHour', () => {
    it('maps hours to meal windows', () => {
        expect(mealForHour(8)).toBe('breakfast')
        expect(mealForHour(10)).toBe('breakfast')
        expect(mealForHour(11)).toBe('lunch')
        expect(mealForHour(15)).toBe('lunch')
        expect(mealForHour(16)).toBe('dinner')
        expect(mealForHour(23)).toBe('dinner')
    })
})

describe('getLoggedMealsForToday', () => {
    const now = new Date(2026, 6, 17, 10, 0)

    it('detects meals by entry time window, today only', () => {
        const entries = [entryAt(8), entryAt(20, new Date(2026, 6, 16))]
        expect(getLoggedMealsForToday(entries, now)).toEqual({ breakfast: true, lunch: false, dinner: false })
    })

    it('ignores legacy entries with time 0', () => {
        expect(getLoggedMealsForToday([makeEntry({ time: 0 })], now)).toEqual(noMeals)
    })
})

describe('buildMealReminders', () => {
    it('schedules 7 days x 3 meals when nothing logged and all times upcoming', () => {
        const now = new Date(2026, 6, 17, 7, 0)
        const specs = buildMealReminders(enabledPrefs, noMeals, now)
        expect(specs).toHaveLength(21)
        expect(specs[0].date).toEqual(new Date(2026, 6, 17, 9, 0))
        expect(specs[specs.length - 1].date).toEqual(new Date(2026, 6, 23, 18, 30))
    })

    it('skips today\'s logged meal', () => {
        const now = new Date(2026, 6, 17, 7, 0)
        const specs = buildMealReminders(enabledPrefs, { ...noMeals, lunch: true }, now)
        expect(specs).toHaveLength(20)
        expect(specs.some((s) => s.date.getTime() === new Date(2026, 6, 17, 12, 30).getTime())).toBe(false)
    })

    it('skips today\'s already-past meal times', () => {
        const now = new Date(2026, 6, 17, 13, 0)
        const specs = buildMealReminders(enabledPrefs, noMeals, now)
        expect(specs).toHaveLength(19)
    })

    it('omits disabled meals entirely', () => {
        const prefs = { ...enabledPrefs, meals: { ...enabledPrefs.meals, breakfast: { ...enabledPrefs.meals.breakfast, enabled: false } } }
        const specs = buildMealReminders(prefs, noMeals, new Date(2026, 6, 17, 7, 0))
        expect(specs).toHaveLength(14)
    })
})

describe('buildStreakNudge', () => {
    const now = new Date(2026, 6, 17, 10, 0)

    it('schedules tomorrow 9am with streakIncludingToday when logged today', () => {
        const specs = buildStreakNudge(enabledPrefs, { loggedToday: true, streakIncludingToday: 5, streakThroughYesterday: 4 }, now)
        expect(specs).toHaveLength(1)
        expect(specs[0].date).toEqual(new Date(2026, 6, 18, 9, 0))
        expect(specs[0].content.title).toContain('5')
    })

    it('uses streakThroughYesterday when not logged today', () => {
        const specs = buildStreakNudge(enabledPrefs, { loggedToday: false, streakIncludingToday: 0, streakThroughYesterday: 3 }, now)
        expect(specs[0].content.title).toContain('3')
    })

    it('returns nothing below the minimum streak', () => {
        expect(buildStreakNudge(enabledPrefs, { loggedToday: true, streakIncludingToday: 2, streakThroughYesterday: 1 }, now)).toEqual([])
    })

    it('returns nothing when disabled', () => {
        const prefs = { ...enabledPrefs, streak: { enabled: false } }
        expect(buildStreakNudge(prefs, { loggedToday: true, streakIncludingToday: 9, streakThroughYesterday: 8 }, now)).toEqual([])
    })
})

describe('buildReengagement', () => {
    it('schedules 3 days out at 17:00', () => {
        const specs = buildReengagement(enabledPrefs, new Date(2026, 6, 17, 2, 30))
        expect(specs).toHaveLength(1)
        expect(specs[0].date).toEqual(new Date(2026, 6, 20, 17, 0))
    })

    it('returns nothing when disabled', () => {
        expect(buildReengagement({ ...enabledPrefs, reengagement: { enabled: false } }, new Date())).toEqual([])
    })
})

describe('buildNotificationBatch', () => {
    const now = new Date(2026, 6, 17, 7, 0)
    const bigStreak: NutritionStreakState = { loggedToday: true, streakIncludingToday: 10, streakThroughYesterday: 9 }

    it('returns empty when master toggle is off', () => {
        expect(buildNotificationBatch({ prefs: DEFAULT_NOTIFICATION_PREFS, permissionGranted: true, entries: [], streak: bigStreak, now })).toEqual([])
    })

    it('returns empty without permission', () => {
        expect(buildNotificationBatch({ prefs: enabledPrefs, permissionGranted: false, entries: [], streak: bigStreak, now })).toEqual([])
    })

    it('worst case stays far under the iOS 64 pending cap', () => {
        const batch = buildNotificationBatch({ prefs: enabledPrefs, permissionGranted: true, entries: [], streak: bigStreak, now })
        expect(batch).toHaveLength(23)
        expect(batch.length).toBeLessThanOrEqual(64)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/notifications/__tests__/builders.test.ts`
Expected: FAIL — cannot resolve `../builders`.

- [ ] **Step 3: Implement builders**

Create `lib/notifications/builders.ts`:

```ts
import type { NutritionEntry, NutritionStreakState } from '@/context/NutritionContext/types'
import { addDays, getDateKey } from '@/lib/utils/dateHelper'
import type { MealKey, NotificationPrefs, NotificationSpec } from './types'

export const MEAL_REMINDER_DAYS = 7
export const STREAK_MIN = 3
export const REENGAGEMENT_DAYS = 3
export const IOS_PENDING_LIMIT = 64

const MEAL_ORDER: MealKey[] = ['breakfast', 'lunch', 'dinner']

const MEAL_CONTENT: Record<MealKey, { title: string; body: string }> = {
    breakfast: { title: 'Log your breakfast', body: 'Start the day on track — add what you ate this morning.' },
    lunch: { title: 'Log your lunch', body: 'Keep the day going — add what you had for lunch.' },
    dinner: { title: 'Log your dinner', body: 'Close out the day — log your dinner in PLATES.' },
}

export function mealForHour(hour: number): MealKey {
    if (hour < 11) return 'breakfast'
    if (hour < 16) return 'lunch'
    return 'dinner'
}

export function getLoggedMealsForToday(entries: NutritionEntry[], now: Date): Record<MealKey, boolean> {
    const todayKey = getDateKey(now)
    const logged: Record<MealKey, boolean> = { breakfast: false, lunch: false, dinner: false }
    for (const entry of entries) {
        if (!entry.time) continue
        if (getDateKey(new Date(entry.date)) !== todayKey) continue
        logged[mealForHour(new Date(entry.time).getHours())] = true
    }
    return logged
}

function atTime(day: Date, hour: number, minute: number): Date {
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0)
}

export function buildMealReminders(prefs: NotificationPrefs, loggedMeals: Record<MealKey, boolean>, now: Date): NotificationSpec[] {
    const specs: NotificationSpec[] = []
    for (let dayOffset = 0; dayOffset < MEAL_REMINDER_DAYS; dayOffset++) {
        const day = addDays(now, dayOffset)
        for (const meal of MEAL_ORDER) {
            const pref = prefs.meals[meal]
            if (!pref.enabled) continue
            const fireAt = atTime(day, pref.hour, pref.minute)
            if (dayOffset === 0 && (loggedMeals[meal] || fireAt.getTime() <= now.getTime())) continue
            specs.push({ content: MEAL_CONTENT[meal], date: fireAt })
        }
    }
    return specs
}

export function buildStreakNudge(prefs: NotificationPrefs, streak: NutritionStreakState, now: Date): NotificationSpec[] {
    if (!prefs.streak.enabled) return []
    const n = streak.loggedToday ? streak.streakIncludingToday : streak.streakThroughYesterday
    if (n < STREAK_MIN) return []
    return [{
        content: { title: `${n}-day streak 🔥`, body: 'Log a meal today to keep it going.' },
        date: atTime(addDays(now, 1), 9, 0),
    }]
}

export function buildReengagement(prefs: NotificationPrefs, now: Date): NotificationSpec[] {
    if (!prefs.reengagement.enabled) return []
    return [{
        content: { title: 'Your progress is waiting', body: 'It’s been a few days — check in and keep your goals moving.' },
        date: atTime(addDays(now, REENGAGEMENT_DAYS), 17, 0),
    }]
}

export function buildNotificationBatch(input: {
    prefs: NotificationPrefs
    permissionGranted: boolean
    entries: NutritionEntry[]
    streak: NutritionStreakState
    now: Date
}): NotificationSpec[] {
    const { prefs, permissionGranted, entries, streak, now } = input
    if (!prefs.enabled || !permissionGranted) return []
    const loggedMeals = getLoggedMealsForToday(entries, now)
    const specs = [
        ...buildMealReminders(prefs, loggedMeals, now),
        ...buildStreakNudge(prefs, streak, now),
        ...buildReengagement(prefs, now),
    ]
    return specs.slice(0, IOS_PENDING_LIMIT)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/notifications/__tests__/builders.test.ts`
Expected: PASS (all describe blocks).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. Do not commit — report results.

---

### Task 4: Permissions + scheduler (the only expo-notifications callers)

**Files:**
- Create: `lib/notifications/permissions.ts`
- Create: `lib/notifications/scheduler.ts`
- Test: `lib/notifications/__tests__/scheduler.test.ts`

**Interfaces:**
- Consumes: `buildNotificationBatch` (Task 3), `loadNotificationPrefs` (Task 2), `NotificationSpec` (Task 2).
- Produces (used by Task 5 hook, Task 6 settings screen, Task 7 Dev Hub):
  - `isPermissionGranted(): Promise<boolean>`
  - `requestPermission(): Promise<boolean>`
  - `initNotificationHandler(): void` — suppresses banners while app is foregrounded
  - `scheduleBatch(specs: NotificationSpec[]): Promise<void>` — cancel-all then schedule each
  - `runNotificationReschedule(entries: NutritionEntry[], streak: NutritionStreakState, now?: Date): Promise<void>` — full pipeline, never throws (Sentry-captured)

- [ ] **Step 1: Write the failing test**

Create `lib/notifications/__tests__/scheduler.test.ts`:

Mock factories must not reference outer `const`s (hoisted imports evaluate the factory before they initialize) — define the mocks inline, then read them back off the mocked module:

```ts
jest.mock('expo-notifications', () => ({
    cancelAllScheduledNotificationsAsync: jest.fn(),
    scheduleNotificationAsync: jest.fn(),
    setNotificationHandler: jest.fn(),
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
}))
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }))

import type { NutritionStreakState } from '@/context/NutritionContext/types'
import * as Sentry from '@sentry/react-native'
import * as Notifications from 'expo-notifications'
import { runNotificationReschedule, scheduleBatch } from '../scheduler'

const mockCancel = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock
const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock
const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock
const mockCapture = Sentry.captureException as jest.Mock

const bigStreak: NutritionStreakState = { loggedToday: true, streakIncludingToday: 10, streakThroughYesterday: 9 }

beforeEach(() => {
    jest.clearAllMocks()
    mockCancel.mockResolvedValue(undefined)
    mockSchedule.mockResolvedValue('id')
    mockGetPermissions.mockResolvedValue({ status: 'granted' })
})

describe('scheduleBatch', () => {
    it('cancels everything before scheduling the new batch', async () => {
        const date = new Date(2026, 6, 18, 9, 0)
        await scheduleBatch([{ content: { title: 'T', body: 'B' }, date }])
        expect(mockCancel).toHaveBeenCalledTimes(1)
        expect(mockSchedule).toHaveBeenCalledWith({
            content: { title: 'T', body: 'B' },
            trigger: { type: 'date', date },
        })
        expect(mockCancel.mock.invocationCallOrder[0]).toBeLessThan(mockSchedule.mock.invocationCallOrder[0])
    })

    it('still cancels when the batch is empty', async () => {
        await scheduleBatch([])
        expect(mockCancel).toHaveBeenCalledTimes(1)
        expect(mockSchedule).not.toHaveBeenCalled()
    })
})

describe('runNotificationReschedule', () => {
    it('schedules nothing when prefs are default (master off) but still clears pending', async () => {
        await runNotificationReschedule([], bigStreak, new Date(2026, 6, 17, 7, 0))
        expect(mockCancel).toHaveBeenCalledTimes(1)
        expect(mockSchedule).not.toHaveBeenCalled()
    })

    it('captures errors instead of throwing', async () => {
        mockCancel.mockRejectedValueOnce(new Error('boom'))
        await expect(runNotificationReschedule([], bigStreak)).resolves.toBeUndefined()
        expect(mockCapture).toHaveBeenCalledTimes(1)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/notifications/__tests__/scheduler.test.ts`
Expected: FAIL — cannot resolve `../scheduler`.

- [ ] **Step 3: Implement permissions and scheduler**

Create `lib/notifications/permissions.ts`:

```ts
import * as Notifications from 'expo-notifications'

export async function isPermissionGranted(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync()
    return status === 'granted'
}

export async function requestPermission(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
    })
    return status === 'granted'
}
```

Create `lib/notifications/scheduler.ts`:

```ts
import type { NutritionEntry, NutritionStreakState } from '@/context/NutritionContext/types'
import * as Sentry from '@sentry/react-native'
import * as Notifications from 'expo-notifications'
import { buildNotificationBatch } from './builders'
import { isPermissionGranted } from './permissions'
import { loadNotificationPrefs } from './prefs'
import type { NotificationSpec } from './types'

export function initNotificationHandler(): void {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: false,
            shouldShowList: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
        }),
    })
}

export async function scheduleBatch(specs: NotificationSpec[]): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync()
    for (const spec of specs) {
        await Notifications.scheduleNotificationAsync({
            content: spec.content,
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: spec.date },
        })
    }
}

export async function runNotificationReschedule(entries: NutritionEntry[], streak: NutritionStreakState, now: Date = new Date()): Promise<void> {
    try {
        const prefs = await loadNotificationPrefs()
        const permissionGranted = await isPermissionGranted()
        const batch = buildNotificationBatch({ prefs, permissionGranted, entries, streak, now })
        await scheduleBatch(batch)
    } catch (e) {
        Sentry.captureException(e)
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/notifications/__tests__/scheduler.test.ts`
Expected: PASS. If the SDK 54 `NotificationBehavior` type requires additional fields in `initNotificationHandler` (e.g. deprecated `shouldShowAlert`), satisfy the type — check the installed `expo-notifications` `.d.ts` rather than guessing.

- [ ] **Step 5: Typecheck + full suite**

Run: `npx tsc --noEmit` then `npm run test:ci`
Expected: both clean. Do not commit — report results.

---

### Task 5: `useNotificationScheduler` hook + mount in the app layout

**Files:**
- Create: `lib/hooks/useNotificationScheduler.ts`
- Modify: `app/_layout.tsx` (StackLayout function, ~line 115)

**Interfaces:**
- Consumes: `useNutrition()` (`nutritionData`, `nutritionStreak`, `loaded`), `initNotificationHandler` + `runNotificationReschedule` (Task 4).
- Produces: `useNotificationScheduler(): void` — mounted exactly once in `StackLayout`.

No new unit test: the hook is a thin binding over already-tested functions; behavior is verified via the Dev Hub page (Task 7) and the device smoke test (Task 8). Keep it logic-free.

- [ ] **Step 1: Implement the hook**

Create `lib/hooks/useNotificationScheduler.ts`:

```ts
import { useNutrition } from '@/context/NutritionContext'
import { initNotificationHandler, runNotificationReschedule } from '@/lib/notifications/scheduler'
import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'

const RESCHEDULE_DEBOUNCE_MS = 1500

export function useNotificationScheduler(): void {
    const { nutritionData, nutritionStreak, loaded } = useNutrition()
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        initNotificationHandler()
    }, [])

    useEffect(() => {
        if (!loaded) return
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => void runNotificationReschedule(nutritionData, nutritionStreak), RESCHEDULE_DEBOUNCE_MS)
        return () => {
            if (timer.current) clearTimeout(timer.current)
        }
    }, [loaded, nutritionData, nutritionStreak])

    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active' && loaded) void runNotificationReschedule(nutritionData, nutritionStreak)
        })
        return () => sub.remove()
    }, [loaded, nutritionData, nutritionStreak])
}
```

- [ ] **Step 2: Mount it in StackLayout**

In `app/_layout.tsx`, add the import:

```ts
import { useNotificationScheduler } from '@/lib/hooks/useNotificationScheduler'
```

Inside `function StackLayout()`, immediately after the existing hook calls (after `const colors = useColors()`), add:

```ts
useNotificationScheduler()
```

It must be called unconditionally (before the `if (!allContextsLoaded)` early return) — the hook no-ops internally until `loaded`.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` and `npm run test:ci`
Expected: both clean (existing `_layout` behavior untouched — the hook renders nothing). Do not commit — report results.

---

### Task 6: Notifications settings screen + navigation wiring

**Files:**
- Create: `app/settingsScreens/notifications.tsx`
- Modify: `app/_layout.tsx` (register the screen in the protected Stack, next to the other `settingsScreens/*` entries, ~line 198)
- Modify: `app/(tabs)/settings.tsx` (new "Preferences" section between Goals and Support)

**Interfaces:**
- Consumes: `loadNotificationPrefs`/`saveNotificationPrefs` (Task 2), `DEFAULT_NOTIFICATION_PREFS`, `NotificationPrefs`, `MealKey` (Task 2), `isPermissionGranted`/`requestPermission` (Task 4), `runNotificationReschedule` (Task 4), `useNutrition()`.
- Produces: route `/settingsScreens/notifications`.

- [ ] **Step 1: Create the screen**

Create `app/settingsScreens/notifications.tsx`:

```tsx
import { useNutrition } from '@/context/NutritionContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { isPermissionGranted, requestPermission } from '@/lib/notifications/permissions'
import { loadNotificationPrefs, saveNotificationPrefs } from '@/lib/notifications/prefs'
import { runNotificationReschedule } from '@/lib/notifications/scheduler'
import { type MealKey, type NotificationPrefs } from '@/lib/notifications/types'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useEffect, useMemo, useState } from 'react'
import { Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'

const MEAL_LABELS: Record<MealKey, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
}
const MEAL_KEYS: MealKey[] = ['breakfast', 'lunch', 'dinner']

export default function NotificationsScreen() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const { nutritionData, nutritionStreak } = useNutrition()
    const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
    const [granted, setGranted] = useState(true)

    useEffect(() => {
        void loadNotificationPrefs().then(setPrefs)
        void isPermissionGranted().then(setGranted)
    }, [])

    const update = (next: NotificationPrefs) => {
        setPrefs(next)
        void saveNotificationPrefs(next).then(() => runNotificationReschedule(nutritionData, nutritionStreak))
    }

    const toggleMaster = async (value: boolean) => {
        if (!prefs) return
        if (value) {
            const ok = (await isPermissionGranted()) || (await requestPermission())
            setGranted(ok)
            if (!ok) return
        }
        update({ ...prefs, enabled: value })
    }

    if (!prefs) return <View style={styles.screen} />

    const showDenied = prefs.enabled === false && !granted

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <View style={styles.card}>
                <View style={styles.row}>
                    <Text style={styles.rowLabel}>Enable notifications</Text>
                    <Switch value={prefs.enabled && granted} onValueChange={(v) => void toggleMaster(v)} />
                </View>
                {showDenied && (
                    <Text style={styles.deniedText} onPress={() => void Linking.openSettings()}>
                        Notifications are turned off for PLATES in iOS Settings. Tap here to open Settings and allow them.
                    </Text>
                )}
            </View>

            <Text style={styles.sectionTitle}>Meal reminders</Text>
            <View style={styles.card}>
                {MEAL_KEYS.map((meal) => {
                    const pref = prefs.meals[meal]
                    const pickerValue = new Date(2000, 0, 1, pref.hour, pref.minute)
                    return (
                        <View key={meal} style={styles.row}>
                            <Text style={styles.rowLabel}>{MEAL_LABELS[meal]}</Text>
                            <View style={styles.rowRight}>
                                {pref.enabled && (
                                    <DateTimePicker
                                        value={pickerValue}
                                        mode="time"
                                        display="compact"
                                        onChange={(_, date) => {
                                            if (!date) return
                                            update({ ...prefs, meals: { ...prefs.meals, [meal]: { ...pref, hour: date.getHours(), minute: date.getMinutes() } } })
                                        }}
                                    />
                                )}
                                <Switch
                                    value={pref.enabled}
                                    onValueChange={(v) => update({ ...prefs, meals: { ...prefs.meals, [meal]: { ...pref, enabled: v } } })}
                                />
                            </View>
                        </View>
                    )
                })}
                <Text style={styles.helpText}>Reminders skip meals you’ve already logged that day.</Text>
            </View>

            <Text style={styles.sectionTitle}>Motivation</Text>
            <View style={styles.card}>
                <View style={styles.row}>
                    <View style={styles.rowTextBlock}>
                        <Text style={styles.rowLabel}>Streak reminders</Text>
                        <Text style={styles.helpText}>A morning nudge when you’re on a logging streak</Text>
                    </View>
                    <Switch value={prefs.streak.enabled} onValueChange={(v) => update({ ...prefs, streak: { enabled: v } })} />
                </View>
                <View style={styles.row}>
                    <View style={styles.rowTextBlock}>
                        <Text style={styles.rowLabel}>Check-in reminders</Text>
                        <Text style={styles.helpText}>A gentle reminder if you haven’t opened the app in a few days</Text>
                    </View>
                    <Switch value={prefs.reengagement.enabled} onValueChange={(v) => update({ ...prefs, reengagement: { enabled: v } })} />
                </View>
            </View>
        </ScrollView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: colors.background,
        },
        content: {
            padding: 20,
            paddingBottom: 40,
        },
        sectionTitle: {
            fontSize: 13,
            color: colors.labelMuted,
            letterSpacing: 0.2,
            marginBottom: 10,
            marginLeft: 4,
            marginTop: 24,
            fontFamily: fonts.semibold,
        },
        card: {
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            paddingHorizontal: 16,
            paddingVertical: 4,
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 12,
        },
        rowRight: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        rowTextBlock: {
            flex: 1,
            marginRight: 12,
        },
        rowLabel: {
            fontSize: 16,
            color: colors.text,
            fontFamily: fonts.semibold,
        },
        helpText: {
            fontSize: 13,
            color: colors.labelMuted,
            lineHeight: 17,
            fontFamily: fonts.regular,
            paddingBottom: 10,
            marginTop: 2,
        },
        deniedText: {
            fontSize: 13,
            color: colors.labelMuted,
            lineHeight: 18,
            fontFamily: fonts.regular,
            paddingBottom: 12,
        },
    })
}
```

Note: if `tsc` flags any `Colors` key used above (`labelMuted`, `hairline`, `surface`, `chevron`), check `context/ThemeContext/colors.ts` for the actual key names and use those — do not add new color tokens.

- [ ] **Step 2: Register the route**

In `app/_layout.tsx`, inside the protected stack next to the other settings screens (after the `settingsScreens/howItWorks` line), add:

```tsx
<Stack.Screen name="settingsScreens/notifications" options={{ headerShown: true, title: 'Notifications', headerBackTitle: 'Back' }} />
```

- [ ] **Step 3: Add the settings row**

In `app/(tabs)/settings.tsx`:

Add `Bell` to the `lucide-react-native` import list.

After the `goalOptions` array, add:

```ts
const preferenceOptions: SettingsOption[] = [
    {
        icon: Bell,
        title: 'Notifications',
        subtitle: 'Meal reminders, streaks, and check-ins',
        onPress: () => router.push('/settingsScreens/notifications'),
    },
]
```

After the Goals section JSX block, add:

```tsx
{/* Preferences Section */}
<View style={styles.section}>
    <Text style={styles.sectionTitle}>Preferences</Text>
    {preferenceOptions.map(renderSettingItem)}
</View>
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` and `npm run test:ci`
Expected: both clean. Report that UI needs visual verification in both dark and light themes on device/simulator (Task 8 covers it). Do not commit — report results.

---

### Task 7: Dev Hub test page

**Files:**
- Create: `components/devTest/NotificationsTest.tsx`
- Create: `app/devTest/notifications.tsx`
- Modify: `app/_layout.tsx` (devTest Stack entries, ~line 231)
- Modify: `components/devTest/DevHub.tsx` (`GROUPS` array)

**Interfaces:**
- Consumes: `buildNotificationBatch` (Task 3), `loadNotificationPrefs` (Task 2), `isPermissionGranted`/`requestPermission` (Task 4), `runNotificationReschedule` (Task 4), `useNutrition()`, `expo-notifications` directly (dev-only page).
- Produces: route `/devTest/notifications`.

- [ ] **Step 1: Create the test page**

Create `components/devTest/NotificationsTest.tsx`:

```tsx
import { useNutrition } from '@/context/NutritionContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { buildNotificationBatch } from '@/lib/notifications/builders'
import { isPermissionGranted, requestPermission } from '@/lib/notifications/permissions'
import { loadNotificationPrefs } from '@/lib/notifications/prefs'
import { runNotificationReschedule } from '@/lib/notifications/scheduler'
import * as Notifications from 'expo-notifications'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'

export default function NotificationsTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const { nutritionData, nutritionStreak } = useNutrition()
    const [output, setOutput] = useState('Tap an action')

    const actions: { label: string; run: () => Promise<string> }[] = [
        {
            label: 'Check / request permission',
            run: async () => {
                const had = await isPermissionGranted()
                if (had) return 'Permission: granted'
                const ok = await requestPermission()
                return `Permission after request: ${ok ? 'granted' : 'denied'}`
            },
        },
        {
            label: 'Preview batch (live data)',
            run: async () => {
                const prefs = await loadNotificationPrefs()
                const batch = buildNotificationBatch({
                    prefs: { ...prefs, enabled: true },
                    permissionGranted: true,
                    entries: nutritionData,
                    streak: nutritionStreak,
                    now: new Date(),
                })
                return batch.map((s) => `${s.date.toLocaleString()} — ${s.content.title}`).join('\n') || 'Empty batch'
            },
        },
        {
            label: 'Reschedule now (respects prefs)',
            run: async () => {
                await runNotificationReschedule(nutritionData, nutritionStreak)
                const pending = await Notifications.getAllScheduledNotificationsAsync()
                return `Rescheduled. ${pending.length} pending.`
            },
        },
        {
            label: 'Fire test notification in 10s (background the app!)',
            run: async () => {
                await Notifications.scheduleNotificationAsync({
                    content: { title: 'PLATES test', body: 'Local notifications are working.' },
                    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10 },
                })
                return 'Scheduled for 10 seconds from now — background the app to see it.'
            },
        },
        {
            label: 'List pending',
            run: async () => {
                const pending = await Notifications.getAllScheduledNotificationsAsync()
                return pending.map((p) => `${JSON.stringify(p.trigger)} — ${p.content.title}`).join('\n') || 'Nothing pending'
            },
        },
        {
            label: 'Cancel all',
            run: async () => {
                await Notifications.cancelAllScheduledNotificationsAsync()
                return 'All pending notifications cancelled'
            },
        },
    ]

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            {actions.map((a) => (
                <TouchableOpacity key={a.label} style={styles.button} activeOpacity={0.6} onPress={() => void a.run().then(setOutput).catch((e) => setOutput(String(e)))}>
                    <Text style={styles.buttonLabel}>{a.label}</Text>
                </TouchableOpacity>
            ))}
            <Text style={styles.output}>{output}</Text>
        </ScrollView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: colors.background,
        },
        content: {
            padding: 20,
            paddingBottom: 40,
        },
        button: {
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginBottom: 8,
        },
        buttonLabel: {
            fontSize: 15,
            color: colors.text,
            fontFamily: fonts.semibold,
        },
        output: {
            fontSize: 13,
            color: colors.labelMuted,
            fontFamily: fonts.regular,
            marginTop: 16,
            lineHeight: 18,
        },
    })
}
```

- [ ] **Step 2: Create the route stub**

Create `app/devTest/notifications.tsx` (matches the existing stub pattern exactly):

```tsx
// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function NotificationsTestRoute() {
    if (__DEV__) {
        const NotificationsTest = require('@/components/devTest/NotificationsTest').default
        return <NotificationsTest />
    }
    return null
}
```

- [ ] **Step 3: Register in the Stack and Dev Hub**

In `app/_layout.tsx`, after the last `devTest/*` Stack.Screen entry (`devTest/entryRow`), add:

```tsx
<Stack.Screen name="devTest/notifications" options={{ headerShown: true, title: 'Notifications', headerBackTitle: 'Back' }} />
```

In `components/devTest/DevHub.tsx`, add a new group to the `GROUPS` array (after the existing groups):

```ts
{
    title: 'Notifications',
    items: [{ label: 'Local Notifications', route: '/devTest/notifications' }],
},
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` and `npm run test:ci`
Expected: both clean. Do not commit — report results.

---

### Task 8: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full automated pass**

Run: `npm run test:ci`
Expected: entire suite green, including the three new test files.
Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 2: Report the device smoke-test checklist**

These require a rebuilt dev client (`eas build --platform ios --profile preview`) and a physical device; report them to the user as their checklist rather than claiming them done:

1. Settings → Preferences → Notifications: master toggle triggers the iOS permission prompt; denying shows the "open Settings" text; granting enables the toggles.
2. Dev Hub → Notifications → "Fire test notification in 10s", background the app: banner lands on the lock screen; with the app foregrounded nothing shows (handler suppression).
3. "Preview batch (live data)": lunch logged today → no lunch reminder for today, tomorrow's present; streak ≥ 3 → streak line present.
4. "Reschedule now" then "List pending": count matches the preview (≤ 23).
5. Verify the settings screen and Dev Hub page in both dark and light themes.

- [ ] **Step 3: Report completion**

Summarize: files created/modified, test counts, the EAS-rebuild requirement, and the smoke-test checklist. Do not commit — the user owns version control.
