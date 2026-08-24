# Profile, goals and daily targets

## What this part of the app does

This is where the app learns who you are — age, height, weight, how active you are, pounds
or kilograms — and what you are trying to do: lose weight, gain it, or hold steady, at a
speed you pick. From that it works out how many calories to eat each day and how much
protein, carbs and fat that comes to, quotes a date you would reach your goal, draws your
weigh-ins on a chart, and notices the day you get there. This file covers everything from
the numbers you type in to the targets, dates and warnings that come back out, plus keeping
all of it safely stored.

## How we tested it

Two kinds of experiment. Most of the work is arithmetic, so most cases feed the math a
hand-built profile and check the number that comes back. Every expected number was worked
out by hand from the published formula the app follows — a standard one used across the
nutrition industry — and never read back out of the code, so if someone retunes the math the
tests disagree with it instead of quietly agreeing. Fixtures are built relative to whatever
day the tests run on, because a birthday written as a fixed date would silently age a year
every year and rot the hand-computed answers.

The second kind starts the real thing up with a fake on-phone database underneath. That lets
us hand it any saved profile we like, decide exactly when a save finishes or fails, and then
read out what the user would see: the target that landed, the question that got raised, the
warning that appeared. Four real screens are started up the same way — the two that quote a
goal date, and the two explainer pages, whose printed numbers are checked against the live
math rather than a second copy of it.

**Hardest to prove:** that a save failing three times in a row warns the user once, rolls
back to what is on disk, and still does not throw away a newer edit made while that read was
happening; that a screen changing the goal and recording a weigh-in in the same instant
decides "goal reached" from what was actually saved, in whichever order the two land; that a
plan so slow it rounds to zero progress a week in kilograms says "no date" instead of
inventing one.

## What the tests prove

- The daily calorie number follows the published formula, matching figures worked out by hand
  for men and women, several ages, both unit systems and every activity level.
- The five activity levels keep the same relative sizes on the explainer page that the real
  calculation uses.
- A hold-steady plan is built around the goal weight, so ordinary scale wobble never moves
  that user's targets.
- A hold-steady plan with no goal weight recorded falls back to the current weight instead of
  producing nothing.
- Lose and gain targets do follow the current weight, going down as the user does.
- The two routes into the calorie number always land on the same figure, for all three goal
  types — so the number the pace slider quotes is the number the plan screen saves.
- Protein, carbs and fat are split by a fixed recipe per goal, checked against hand arithmetic.
- Those grams add back up to the calorie number on screen, within ordinary rounding.
- Each half-pound-a-week step on the pace slider is worth exactly 250 calories a day.
- No calorie target is ever quietly raised to a "safe" number: whatever pace the user picks is
  priced honestly and stated in full, however low it lands.
- The pace a calorie number actually delivers matches the pace the user chose to within a
  thousandth of a pound a week, including at the fastest setting.
- Eating at maintenance reads as no progress rather than as negative progress.
- The quoted goal date is worked out from the calorie number that was saved, not from the
  slider — hand-edit the calories and the date moves with them.
- A plan pointing the wrong way — eating at or above maintenance while trying to lose — shows
  a dash and an explanation instead of a made-up date.
- Even a one-calorie deficit counts as real progress and gets an honest (very distant) date.
- A hold-steady plan keeps its fixed twelve-week outlook whatever the calories say.
- Kilogram users get their weeks counted in kilograms, not in pounds mislabelled as kilograms.
- A pace that is real but too small to show as even a tenth of a kilogram a week shows a dash
  rather than a fabricated date.
- The "you won't reach your goal" warning appears exactly when the date is a dash, checked case
  by case against each other so the two can never contradict.
- The weight chart begins on the day setup finished, or at the first weigh-in if there was no
  setup date.
- Days with no weigh-in carry the last known weight forward, so the line has no holes.
- Days before the very first weigh-in carry that first weigh-in backwards, so the "change"
  figure is a genuine difference and not the user's entire body weight.
- History longer than a year is trimmed to the last year, still starting from the last weight
  known at that point.
- A user with no weigh-ins at all gets a single day rather than an error.
- Chart points come out oldest first, with short date labels.
- A weigh-in never changes the goal or the chosen pace on its own.
- Reaching the goal asks whether to set a new one, and keeps asking at every weigh-in at or
  past it — dismissing the question lets it come back next time rather than burying it.
- Choosing "keep going" silences the question until the user drifts back the wrong side of the
  goal, after which reaching it again asks once more.
- Simply opening the app while already at goal does not ask; only a fresh weigh-in can.
- A hold-steady user is never asked, at any weight.
- The banner reads "goal reached" close to the goal and "X past your goal" further out, in the
  right unit and the right direction for losing or gaining.
- Numbers the user typed themselves survive later weigh-ins and survive the agreed switch to
  holding steady.
- The app can tell a typed-in target from the formula's own output, including when the formula's
  figure had been rounded before being shown — rounding alone is never mistaken for an edit.
- Changing the goal and recording a weigh-in at the same moment is judged against the goal that
  was actually saved, and it works in either order the two arrive.
- The app can say a target sits under the daily minimum for that body — 1,500 for men, 1,200 for
  women — one calorie either side of each line, with each reading its own number.
- Landing exactly on that line reads as fine rather than as a warning.
- No target can come out as zero or negative, even for an absurd but technically allowed body.
- No macro can come out as zero grams, even from an absurdly small calorie target.
- Heights and weights under the published minimums are refused with a message, as is anything
  blank, infinite or negative.
- Two bad fields at once produce one message about the first one, not a pile-up.
- The minimums respect the unit chosen: 30 is a fine height in inches and far too small in
  centimetres, and 30 is a fine weight in kilograms and far too small in pounds.
- A hand-edited macro only has to be a real number that is not negative — there is deliberately
  no floor there.
- Saved birth dates and setup dates come back as the same calendar day they went in, whatever
  time of day they were entered.
- An older stored profile missing the newer "the user edited this" markers reads as unedited
  rather than guessing.
- A stored profile with no pace recorded comes back with the app's shared default pace.
- An edit made while a save is still running is not lost — it saves as soon as the first one
  finishes.
- Repeated save failures back off on a widening delay instead of hammering the database.
- The user is warned once, after the third failure in a row, and not on the first.
- During initial setup the app keeps retrying past that warning instead of giving up on it.
- Outside setup, a run of failures rolls the profile back to what is on disk — but an edit made
  while that read was in flight is not overwritten by the older copy.
- Screens only redraw when something they actually read has changed; the app's own save
  bookkeeping does not churn them.
- The last step of the adjust-your-nutrition walkthrough records a weigh-in only when the weight
  really changed, so re-running it without touching the scale does not stamp today with a
  duplicate entry.
- That step saves the plan and returns to settings either way.
- It carries the "user edited this" marker through, so the next weigh-in cannot silently
  overwrite hand-typed numbers.
- Both goal-date screens quote weeks from the calories on their way out, ignoring a
  contradicting slider setting.
- A wrong-direction plan still saves exactly what the user chose, dash and all — the quoted date
  is a readout, not a veto.
- The explainer page's printed minimums, activity multipliers and pace steps are checked against
  the live math, so a change to the math that the page does not follow fails the test.
- The strength explainer's printed coefficient is solved back out of the real strength
  calculation rather than compared to a second copy of the number.

## Not proven

- No real database is ever touched. Whether the writes and reads work against the real thing,
  and whether anything syncs between devices, is not covered here.
- The formula is checked against arithmetic done by hand, never against real people. Nothing
  here says the calorie number is actually right for a real body — only that it is the number
  the published formula produces.
- Whether the two warnings are actually shown is mostly unproven. The rules behind "under the
  daily minimum" and "pointing the wrong way" are pinned exactly, but no test starts up the
  pace screen, the plan screen or the profile screen to confirm the warning card appears there.
- The weight chart itself is never drawn. Only the list of points feeding it is checked, so a
  broken chart could still pass everything here.
- Today's date is frozen for the chart tests. What happens on a real phone as midnight passes,
  or when the user travels across time zones, is not covered.
- The maximum pace the sliders allow is never checked. Nothing fails if that ceiling is raised
  or removed.
- The profile and settings screens where most editing actually happens are not started up. That
  the numbers typed there reach the saving code is assumed, not proven.
- The question raised on reaching a goal is proven as a decision, not as a dialog. No test
  confirms the wording, the buttons, or that it can be seen at all.
- The very first load failing, and the retry it offers, has no test here.
- Age is worked out from the birth date by shared date code proven elsewhere, as are the
  pound-to-kilogram conversions; neither is re-proven in this area.

Area: context/SettingsContext · 202 cases · reviewed 2026-08-19
