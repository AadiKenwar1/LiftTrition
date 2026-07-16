# Issue 8 — The weight unit kept flip-flopping between "lb" and "lbs"

**What you'd have noticed**
On most screens your weight showed up as "184 lbs." But on a handful of others — the onboarding "About You" step, the workout set-logging screen, the pace slider — the same weight showed as "184 lb," missing the "s." The number was always correct; only the little unit label next to it changed depending on which screen you happened to be on.

**Why it happened**
Every screen that needed to show "lbs" or "kg" next to a weight wrote its own small on/off switch: "if the user's unit system is imperial, show the pound label, otherwise show kg." Because these switches were written separately, screen by screen, over time, some were typed with the plural "lbs" and others with the singular "lb." Nothing forced them to agree with each other, so the spelling quietly drifted apart across roughly twenty different places in the app.

**What we changed**
We built one shared helper that every screen now calls to get the correct weight label, instead of each screen deciding for itself. It always returns "lbs" for the imperial unit system and "kg" for metric. We standardized on "lbs" since it was already the spelling used in the majority of places. Every screen that shows a weight — onboarding, the workout log, the progress tab, settings, the weigh-in popup, and the goal-reached prompt — now pulls the label from that one shared place, so they can't disagree again.

**How we know it works**
We added an automated test confirming the shared helper returns "lbs" for imperial and "kg" for metric. We then searched the entire app's source code for any leftover singular "lb" and confirmed none remain outside of the developer-only preview screens (which never ship to users). We also walked the app by hand: the onboarding "About You" step, the onboarding goal step, logging a workout set, and the progress tab all now show "lbs" consistently.

**Files touched**
- `lib/utils/unitConversions.ts` — new shared `weightUnitLabel` helper
- `lib/utils/__tests__/unitConversions.test.ts` — new test for the helper
- Onboarding: About You, Goal, Pace, Projection, Paywall
- Settings: Profile, Adjust Measurements, Adjust Nutrition (goal, pace, and summary steps)
- Nutrition: the "Update Body Weight" popup, the body-weight card, the goal-reached prompt
- Workout: the set-logging screen
- Progress tab and its stats display
- The shared height/weight validation warning messages
