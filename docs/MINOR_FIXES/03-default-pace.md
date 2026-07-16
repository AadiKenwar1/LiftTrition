# Issue 3 — A new user's starting pace could come out as 0 or 0.5, depending on how their profile loaded

**What you'd have noticed**
Every user has a "pace" setting — how fast they want to gain or lose weight per week — which directly feeds into the calorie target the app gives them. Before a person has ever touched that setting themselves, the app needs some starting value to work with behind the scenes. That starting value was supposed to always be the same, but depending on which part of the app happened to set up a profile at a given moment, it could quietly come out as either 0 (no planned weekly change) or 0.5 (a moderate planned change) — two different starting points for what should have been identical "brand new, nothing customized yet" situations. Nobody would see an error message; they'd just end up with calorie math that didn't match what another, seemingly identical new user got.

**Why it happened**
The app keeps a written-out description of "what a new user's settings look like by default" — starting weight, activity level, pace, and so on — for the moments before someone's real, saved settings are available. That description existed in two separate places in the code, and the two copies had quietly drifted out of sync over time: one said the default pace was 0, the other said 0.5. Whichever copy happened to be in play at a given moment decided what the user got. Neither copy was more "correct" than the other — they had just been edited independently at different times and nobody noticed they no longer matched. This lived in `context/SettingsContext`, split between the file that loads settings from the device's database and the file that sets up the app's initial state.

**What we changed**
We created one single, shared definition of "what a new user's default settings are" and pointed every place that needs a starting value at that one copy, instead of each keeping its own hand-written version. We also pointed the specific spot that fills in a missing pace value from the database at this same shared definition, so that path can't drift out of sync again either. There is now exactly one answer for a new user's default pace, and it's 0.5 — there's nowhere left for a second, disagreeing copy to hide.

**How we know it works**
We added an automated test that saves a settings record with the pace value deliberately left out (as if it had never been saved to the device) and checks that reading it back produces exactly the shared default of 0.5, not 0 or anything else. That test passes, and all of the existing automated tests for the settings system — 69 checks in total — still pass, confirming nothing else about saving or loading settings broke. We also confirmed the change didn't introduce any new type-checking errors in the files it touched.

**Files touched**
- `context/SettingsContext/defaults.ts` (new) — the one shared definition of a new user's default settings, including the pace default of 0.5
- `context/SettingsContext/database/powersyncStore.ts` — now reads its defaults, including what to use when the database has no pace value stored, from the shared file instead of its own separate copy
- `context/SettingsContext/index.tsx` — now reads its defaults from the shared file instead of its own separate copy
- `context/SettingsContext/database/__tests__/powersyncStore.test.ts` — new automated test confirming a missing pace value loads as the shared default
