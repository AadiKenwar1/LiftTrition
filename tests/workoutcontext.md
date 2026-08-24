# Workout tracking and progression

## What this part of the app does

This is the whole lifting side of the app. You build workouts, put exercises in them,
and write down each set you do — the weight, the reps, and how hard it felt on a 0–10
scale. From that history the app works out one thing to beat next time, tells you when
you beat it, and turns the same sets into how hard you have been training lately, how
much work you did each day, and how your strength is trending. Everything is kept on the
phone itself so it works with no signal. This file covers everything from creating a
workout to the number on the screen: the suggested set, the "you beat it" moment, tiredness
and volume, the strength charts, the built-in exercise list, and every write to the
on-phone database.

## How we tested it

Most of this is arithmetic on a list of past sets, so most of the testing is too: we
hand the calculations a made-up training history — "eight days ago you did 190 for 7,
three days ago you did 185 for 10" — and check the exact set it suggests and whether
today's work counts as beating it. The clock is frozen to one fixed day so "two weeks
ago" always means the same thing. The biggest block is a single long table of about sixty
real-life training situations, each written out as a story (a deload, a sick day, warm-up
sets, a lifter who only trains doubles) with the goal it should produce spelled out by
hand, so the table is a second opinion rather than a photograph of whatever the code did.

For saving, the on-phone database is entirely fake. We catch the instructions the app
hands it and read them back — what it writes, in what order, and whether it groups
related writes so a list can never end up half-renumbered. A developer-only switch that
forces saving to fail is flipped on to check that every write path gives up before it
touches anything. Three screens are rendered for real — the set-logging sheet, the
rename box, and the day picker — with sign-in, settings, and navigation faked and the
scrolling history list swapped for a blank, so what is being checked is the numbers those
screens produce and the save they ask for, not how they look.

**Hardest to prove:** that writing down a set for last Tuesday, one that would have beaten
last Tuesday's own target, does not light up today's congratulations banner; that on a
weight-jump day the set the app asks for still counts as a win even though it scores lower
on paper than the set that earned the jump; that a tiredness number is identical whether
it is worked out one minute after midnight or five minutes before.

## What the tests prove

**The suggested set**

- The set you are asked to beat is always a set you really did — the app never invents a number.
- Sets logged today never count toward today's target; the target comes from earlier days only.
- Below the top of the rep range, the suggestion is the same weight and one more rep.
- Reach the top of the rep range and the weight goes up instead, with reps dropping back down.
- Weight jumps always land on a number a gym can actually make — 5 lb steps above 25 lb and
  2.5 lb below, 2.5 kg steps above 20 kg and 2 kg below.
- Repeated small jumps never drift into odd fractions of a pound or kilo.
- The target comes off the heaviest set of your last session, not whichever set you logged last.
- Warm-up sets in the same session are ignored in favour of the heavy one.
- One light day after a heavier session does not lower the bar — the heavier session holds it.
- Two light days in a row and the app accepts the new level instead of nagging.
- A day where you tried more weight and fell short is retried from the weight you actually did.
- A high-rep burnout set at the end of a heavy day cannot steal the target from the heavy work.
- A day containing nothing but heavy singles is invisible — it never becomes "your last session".
- Someone who only ever trains doubles still gets suggestions.
- Someone who only ever does singles is asked for a set of two or more reps instead.
- Two weeks with nothing logged and the app asks for a fresh set rather than guessing from
  stale numbers; exactly fourteen days still counts as recent.
- A brand-new exercise says to log a set to start getting suggestions.
- Each of those three "no suggestion yet" situations has its own message, and the message
  disappears once there is a target.
- For bodyweight exercises the app counts your own body weight plus anything on the belt.
- With no body weight on file, bodyweight sets are ranked on reps alone rather than scoring zero.
- Sets belonging to a different exercise never affect this exercise's suggestion.
- Looking at an earlier day never lets sessions logged after it influence the target.
- Two identical sets on the same day resolve the same way every time, so the number never flickers.

**Beating the target**

- Doing exactly the set you were asked for always counts, including on weight-jump days where
  that set scores lower on paper than the one that earned it.
- One extra rep at the same weight counts, even past the point where the strength estimate
  stops handing out credit for more reps.
- Adding weight counts even when it costs you one rep.
- Adding weight stops counting once it costs you two reps.
- A lighter set that is genuinely more work counts.
- Repeating the exact same set does not count — a tie is not a win.
- An even trade — a bit lighter for a rep more — does not count.
- Grinding out thirty-five easy reps at a light weight does not count.
- A single heavy rep does not count against a normal working-set target, but does count
  against a target built from doubles.
- Any set in the day can carry it, not only the first or the heaviest.
- Once the target is beaten, the display moves on to next session's set.
- If the day's sets all missed, today's target stays on screen unchanged.
- The very first day you log a new exercise, it shows next session's set without claiming
  you beat anything.

**Writing down a set**

- A set with zero or negative reps is refused and the reason is shown.
- Negative weight is refused, and so is an effort rating outside 0 to 10; both ends, 0 and 10, are fine.
- A set at zero weight is accepted, because that is how bodyweight work is recorded.
- Decimal weights and very large numbers are accepted.
- Every saved set gets its own unique identity and the moment it was recorded.
- Deleting one set leaves the rest untouched, and deleting something that isn't there is harmless.

**Workouts, exercises, and deleting**

- Deleting a workout also removes its exercises and every set under them, and leaves other
  workouts completely alone.
- Deleting an exercise removes only its own sets.
- A new workout or exercise goes to the top of the list and pushes the existing ones down.
- Archived items do not shuffle when an active one is added.
- Un-archiving puts the item back at the top of the active list.
- Dragging to reorder renumbers only the list you dragged, and items missing from the drag keep their place.
- Deleting or renaming something that doesn't exist quietly does nothing instead of breaking.

**Tiredness, volume, and records**

- Every exercise gets a difficulty weighting that always stays between 0.5 and 1.1, whatever
  muscle and equipment it uses.
- Each set is scored against your best effort on that lift in the last thirty days, and falls
  back to the set itself when there is no recent best.
- Bodyweight lifts count your own weight, and adding weight to a belt makes the same set score higher.
- When the app knows what you weighed months ago, old bodyweight sets are scored at that
  weight rather than today's.
- Yesterday's training does not leak into today's number.
- The same day's number comes out identical just after midnight and just before it, so it
  never drifts with the clock.
- The daily-work chart adds up weight times reps for each day, rounds it, and fills days
  you didn't train with zero.
- That chart covers the last thirty days, or from the day you finished setting up the app
  if that was more recent, and shows a single empty day when there is nothing at all.
- Days always come out oldest to newest with a short month/day label.
- The set-count chart counts one set per logged set, and bodyweight sets count.
- Sets with no reps, or with negative weight, are ignored by every chart.
- The week view always returns seven days labelled Sunday through Saturday, marks days
  after today as still to come, and ignores sets from other weeks.
- The strength chart shows the best estimated single-rep maximum — the heaviest single the
  app thinks you could manage — for each day you trained, at most the last twenty-one days.
- When several sets share a day, the chart keeps the strongest one.
- A true single is estimated as exactly the weight you lifted, with no bonus added.
- That estimate is always higher than the bar weight for anything above one rep, and rises
  with reps.
- Sets older than the reference window are left out of your recent best, and the cut-off
  behaves the same at any time of day.

**The exercise list and naming**

- The app ships roughly 1,300 exercises, and adding your own leaves every one of them in place.
- A custom exercise you name the same as a built-in one replaces it.
- With no custom exercises at all, the app hands back the shared built-in list untouched
  rather than rebuilding 1,300 entries for nothing.
- A duplicate workout name is caught regardless of capital letters or stray spaces.
- An archived workout's name does not block you from reusing it.
- A workout is allowed to keep its own name when you open the rename box and change nothing.

**Saving to the phone**

- Adding a workout shifts the existing ones and inserts the new one as a single unit, so the
  list can never be left half-renumbered.
- Adding several exercises at once shifts the others by the number being added, not by one.
- Saving something that already exists updates it instead of creating a duplicate — checked
  separately for workouts, exercises, and custom exercises, because that logic is written
  out three times.
- Reordering nothing opens no write at all.
- Deleting a workout removes its sets first, then its exercises, then the workout.
- Deleting an exercise removes its sets first, then the exercise.
- Archiving and un-archiving each shift the right group of neighbours and put the moved item
  first, for both workouts and exercises.
- Copying a workout writes the copy and all its exercises together in one go.
- With the developer switch for forced save failures turned on, thirteen different write
  paths all fail before touching the database — nothing is written halfway.

**On screen**

- Writing down a set for a past day never fires today's goal-hit celebration, even when that
  set would have beaten that past day's own target.
- Backfilling an old day never re-points the suggestion at that day's older, lighter numbers.
- A backdated set really is saved to the day picked, not to today.
- An exercise with no history shows the first-time message no matter which day is picked.
- On an ordinary day the target shows before you log, and beating it flips to the
  congratulations state carrying next session's set.
- Double-tapping rename renames once and closes once, not twice.
- Trying to take another workout's name shows a warning and saves nothing — and the rename
  button still works straight afterwards.
- The day picker hands back the exact calendar day tapped, with no off-by-one from time zones.
- An empty list can be tapped to add the first item when it offers one, and offers nothing
  tappable when it only has a message to show.

## Not proven

- Nothing here touches a real database. Every save is judged by the instruction the app
  sends, not by storing something and reading it back, so a database that quietly rejected
  those instructions would not fail a single test.
- Loading everything back at startup has no test at all. Turning stored rows into workouts,
  exercises, sets and dates, and throwing away sets whose workout or exercise is gone, is
  completely uncovered — and that is the code that runs first every time the app opens.
- Saving one new set and adding one single new exercise are the two write paths with no
  test of any kind; every other write is pinned.
- Nothing reaches the cloud. Whether your data actually arrives on the server, shows up on
  a second phone, or survives being offline for a week is not tested here.
- The tiredness numbers are recorded, not judged. The large run across dozens of training
  days and full weeks only checks the numbers are not negative and stay in range, then
  writes them to a file for a person to compare against the previous version by eye. No
  test says a hard leg day should land near any particular figure.
- The encouraging sentence shown under the tiredness number has no test.
- The markers showing which days you trained this week have no test.
- Copying a workout is proven for what gets written, but the in-app step — naming the copy,
  carrying the note across, skipping archived exercises — is not.
- Creating or deleting one of your own custom exercises inside the running app is not
  covered; only the merged library and the save instruction are.
- Names are never checked for emptiness. A workout or exercise saved with a blank name
  goes through, and no test objects.
- Every suggestion is proven against invented histories, never a real person's log. Whether
  the strength estimate matches reality is assumed, not tested.
- The logging screen is only tested for the numbers it produces and the save it requests.
  Its history list and its day-picker sheet are replaced with blanks, so nothing proves the
  screen looks right or that scrolling through past sessions works.
- Nothing draws a chart. The chart feeds are proven as lists of numbers; whether a chart
  renders them, or redraws when a set is added, is not covered.
- Pounds versus kilograms is proven inside the suggestion maths only. Nothing proves the
  screens hand it the unit the user actually chose.
- The clock is frozen for every test. Crossing a time zone, or the day rolling over while
  the screen is open, is untested.

Area: context/WorkoutContext · 379 cases · reviewed 2026-08-19
