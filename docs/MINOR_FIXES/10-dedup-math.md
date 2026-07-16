# Issue 10 — The same two small calculations were written out separately in six different screens

**What you'd have noticed**
Nothing, yet — and that was the problem. Two small pieces of math were copy-pasted into several screens instead of living in one place. The first figures out "how many weeks until you reach your goal weight," and it was written out separately on the onboarding goal-review screen, the paywall screen, and the settings screen where you adjust your nutrition goal. The second figures out "how old are you, based on your birthday," and it was written out separately in the calorie/macro calculator, the profile screen, and the onboarding "about you" screen. Every copy did the exact same thing today, so nobody was seeing a wrong number. The risk was for later: if someone ever fixed a bug or tweaked the rounding in one copy, the other copies wouldn't automatically get that same fix. Two screens that are supposed to agree could then quietly start showing different numbers for the same person, and it might take a user noticing the mismatch before anyone caught it.

**Why it happened**
Each of these screens was built at a different time, and each one needed the same small calculation, so each one just wrote its own version inline rather than reusing an existing one. It's an easy trap to fall into when the math is only a line or two — but it meant the same logic existed in six unconnected places (three for the weeks calculation, three for the age calculation), with nothing keeping them in sync if one ever changed.

**What we changed**
Each calculation now lives in exactly one shared place, and every screen that needs it calls that same shared version instead of doing its own math. "How many weeks until your goal" now lives in one file and is used by the onboarding review screen, the paywall screen, and the settings goal-adjustment screen. "Your age from your birthday" now lives alongside the app's other date helpers and is used by the calorie/macro calculator, the profile screen, and the onboarding "about you" screen. The numbers shown to users are exactly the same as before — this change doesn't alter anyone's calorie target, weeks estimate, or displayed age. It just makes sure there's only one version of each calculation left to maintain, so a future fix can't accidentally miss a spot. (One date picker still shows its own age text, but that picker is already planned to be replaced entirely soon, so it was left alone rather than edited twice.)

**How we know it works**
We wrote automated tests for both shared calculations first, confirmed those tests failed (since the shared calculations didn't exist yet), and only then wrote the calculations — watching the same tests turn green. The weeks-to-goal tests cover losing weight, gaining weight, maintaining weight (which always shows a fixed 12-week horizon), and the edge case where a pace hasn't been set yet. The age tests cover a birthday that's already passed this year, one that hasn't happened yet, and a birthday that falls on today's exact date. We also reran every existing automated test for the settings and utility code — all 135 checks still pass, confirming that switching every screen over to the shared calculations didn't change any behavior a user would see.

**Files touched**
- `lib/utils/goalMath.ts` (new) — the shared "weeks until goal weight" calculation
- `lib/utils/__tests__/goalMath.test.ts` (new) — automated tests for it
- `lib/utils/dateHelper.ts` — added the shared "age from birthday" calculation
- `lib/utils/__tests__/dateHelper.test.ts` — automated tests for it
- `app/onboardingScreens/projection.tsx` — goal-review screen now uses the shared weeks calculation
- `app/onboardingScreens/paywall.tsx` — paywall screen now uses the shared weeks calculation
- `app/settingsScreens/adjustNutrition/adjustNutrition4.tsx` — settings goal-adjustment screen now uses the shared weeks calculation
- `context/SettingsContext/functions/macroCalculation.tsx` — calorie/macro calculator now uses the shared age calculation
- `app/settingsScreens/profile.tsx` — profile screen now uses the shared age calculation
- `app/onboardingScreens/aboutYou.tsx` — onboarding "about you" screen now uses the shared age calculation
