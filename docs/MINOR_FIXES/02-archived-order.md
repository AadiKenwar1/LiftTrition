# Issue 2 — Archived workouts and exercises could drift out of order

**What you'd have noticed**
If you archived a workout or exercise and later added a new workout, duplicated one, or added exercises to a different workout, the archived items' position could quietly get out of step with what was actually saved. Most of the time you'd never notice, since just looking at the Archived list doesn't change anything on your device. But if you later renamed that archived item or edited its note, that small edit would lock in whatever order the screen happened to be showing at that moment — even if it was wrong. After that, the archived item could show up in a different spot than it used to, and it would stay there for good.

**Why it happened**
When you add a new workout or exercise, the app has to shift everything else down to make room for the new one at the top. It does this in two places: once on the screen, so you see the new item appear right away, and once in the saved copy on your device, so it's still correct the next time you open the app. The saved copy was always careful to shift only the active, non-archived items — archived ones were correctly left alone, since they're not meant to move. The on-screen version, though, was shifting everything, archived items included. Nothing else read that stray on-screen number, so the mistake usually stayed invisible — until you renamed an archived item or edited its note, which saves that item back to your device exactly as it currently sits on screen, wrong order and all. This lived in `context/WorkoutContext/index.tsx`, in the code that handles adding a workout, duplicating a workout, and adding one or more exercises.

**What we changed**
We made the on-screen behavior match the saved behavior: archived workouts and exercises are no longer shifted when a new item is added. Only the active, non-archived ones move now, which is exactly what the saved copy was already doing. The two are always in agreement, so there's nothing left to accidentally lock in.

**How we know it works**
We confirmed this change introduces no new type-checking errors in the file it touches. As a manual check: archive a workout and note where it sits in the Archived list, add two new workouts, then rename the archived workout (which saves it back to your device) and restart the app — the archived workout should still be in the exact same spot in the list as before.

**Files touched**
- `context/WorkoutContext/index.tsx` — the four places that add or duplicate workouts and exercises now only reorder the active, non-archived items, matching what's already saved to your device.
