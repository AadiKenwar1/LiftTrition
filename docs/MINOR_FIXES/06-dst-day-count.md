# Issue 6 — Once or twice a year, the body-weight graph could open showing a huge overnight swing that never happened

**What you'd have noticed**
On the day the clocks "spring forward" in March, anyone who opened their body-weight graph (or, more rarely, the workout or nutrition graphs) shortly afterward could see the very first day of their history quietly disappear and get replaced with a flat zero. On the body-weight chart that first day is the weigh-in someone entered during onboarding, so the line would appear to start at 0 and then jump straight up to their real weight — as if they'd gained or lost an enormous amount overnight. Nothing had actually changed about their data; the graph was just miscounting how many days it had to draw.

**Why it happened**
To figure out how many days of history to draw, the app took "right now" and "the start date" and worked out the number of days between them by subtracting the two moments in time and dividing by the number of milliseconds in a normal day — then rounding down. That math has a hidden assumption: every day is exactly 24 hours long. That's true almost all year, but not on the day the clocks jump forward an hour each spring, which makes that one particular day only 23 hours long. When that shorter day fell inside the window the graph was measuring, the division came out just a hair short of a whole number, and rounding down shaved a full day off the count — dropping the oldest day of data instead of just shortening it by an hour. This same day-counting math was duplicated in four places: the shared helper that figures out where a graph's timeline should start, the body-weight graph, the workout graph (used in two spots), and the nutrition graph.

**What we changed**
We replaced the "subtract two clock times and divide by 24 hours" approach with a helper that instead compares calendar dates directly — it looks at the actual day, month, and year on each side (ignoring the clock time entirely) and counts whole calendar days between them, rounding to the nearest whole day instead of always rounding down. Because it never looks at hours or minutes, a daylight-saving clock jump has nothing to grab onto — the count can no longer come out one short. All four graphs (and the shared start-date helper they all rely on) now use this same single, corrected way of counting days.

**How we know it works**
We added an automated test that deliberately spans the exact date the clocks changed in spring 2024 and confirms the day count comes out correct despite the 23-hour day hidden inside it, along with tests confirming the count still ignores time-of-day and still works correctly counting backward. All of those pass. We also reran the full existing test suite for the body-weight graph, including checks that pin down the exact number of days it should draw for several ordinary (non-clock-change) date ranges — those all still pass unchanged, confirming this fix doesn't alter anything about how the graphs behave the rest of the year. We also confirmed the change didn't introduce any new type-checking errors in the files it touched.

As a further manual check, we added a "BW pipeline (real fn)" option to the Dev Hub's Line Chart page (Settings → Developer → Dev Hub) that runs the real body-weight graph function on a simulated few weeks of weigh-ins. Viewed with the 3-month range, the line correctly begins at the first simulated weigh-in rather than at zero — and if this same view were opened in the days just after a real spring clock change, it's the exact case that used to show the false zero-start.

**Files touched**
- `lib/utils/dateHelper.ts` — added the corrected calendar-day counting helper and switched the shared start-date logic to use it
- `lib/utils/__tests__/dateHelper.test.ts` — new automated tests, including the spring clock-change scenario
- `context/SettingsContext/functions/bodyWeightFunctions.tsx` — body-weight graph now uses the corrected day count
- `context/WorkoutContext/functions/volumeFunctions.tsx` — workout volume and set-count graphs now use the corrected day count
- `context/NutritionContext/functions/graphFunctions.tsx` — nutrition graph now uses the corrected day count
- `components/devTest/LineChartTest.tsx` — new Dev Hub view that runs the real body-weight graph function for a manual eyeball check
