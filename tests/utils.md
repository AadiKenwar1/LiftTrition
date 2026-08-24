# Shared helpers

## What this part of the app does

This is the app's box of small shared tools — the plumbing almost every screen quietly leans
on. It decides how a calendar day is written down so a meal logged at 11pm lands on the right
date, cleans up whatever a person types into a number box, squeezes months of history into a
chart narrow enough for a phone, counts the progress dots during setup, and runs the "are you
sure?" prompt when somebody signs out. None of it is a screen the user can point at, but a
mistake in any of it shows up everywhere at once. This file covers those shared tools: dates
and day-counting, number cleanup, chart building, setup progress, signing out, the
rate-this-app prompt, and the phone-permission next step.

## How we tested it

Almost everything here is pure arithmetic and text, so most of the experiment is simple: hand
a tool a value, then check the answer against a result worked out by hand rather than copied
from the code. The interesting work is in the handful of tools that touch the world outside.
For those we swap in fakes and watch what the app asks for: a fake pop-up box, so we can read
exactly which buttons appear and press them ourselves; a fake rate-this-app sheet we can make
fail in four different ways; a fake on-phone storage drawer we can fill and then inspect; and
a frozen clock, so a chart built today comes out identical to one built next March. Dates are
deliberately poked at their known trouble spots — the day the clocks jump forward, the last
day of a month, the last day of a year, and leap day.

**Hardest to prove:** that the hour the clocks jump forward neither adds nor loses a day
anywhere in a date range; that a genuine weight reading of zero is kept as real data instead
of being mistaken for a missing day and quietly overwritten with yesterday's number; that the
rate-this-app prompt failing in any of four ways still shows the user absolutely nothing, and
that the app really waits for that sheet to close.

## What the tests prove

- A calendar day is written down using the phone's own local calendar, so an entry never
  lands on the day before or the day after.
- A written-down day reads back as the same calendar day it came from, in both directions,
  including single-digit months and days.
- The written-down day is character-for-character identical to the standard format the app
  used before, across leap day, month ends and year ends — so days saved long ago still match
  days saved today.
- Written-down days sort correctly as ordinary text, including across a New Year boundary.
- The day the clocks jump forward is still recorded as its own calendar day.
- Counting days between two dates counts whole calendar days and ignores the time of day, so
  a minute before midnight and a minute after it read as one day apart.
- A range that crosses the clocks-change still counts the right number of days.
- Counting from a later date back to an earlier one gives a negative number rather than a
  wrong positive one.
- A person's age counts a birthday that has already passed this year, does not count one
  still ahead, and does count one falling today.
- A typed number is accepted with either a dot or a comma as the decimal mark, and with stray
  spaces around it.
- Blank text, gibberish, a lone dot, two dots, two commas and the word "infinity" are all
  rejected outright instead of being turned into a wrong number.
- Negative typed numbers are accepted.
- Whole-number fields round properly, and any value that is not a real number becomes zero
  rather than something broken.
- Displayed nutrition figures round to one decimal place, clearing the tiny leftover dust
  that makes a number read as 391.50000000000006.
- A serving-size multiplier keeps its full precision — a quarter or a third stays exact —
  because the app multiplies it back out on every save.
- A serving size of exactly zero is kept, because that is how the app marks an item the user
  removed from a meal.
- A broken serving size falls back to one whole serving, so nothing is silently scaled away
  to nothing.
- Per-item nutrition figures also keep full precision, but a broken one falls back to zero,
  since there is no harmless default amount of protein.
- Long stretches of history are folded into fewer chart columns, each labelled with the range
  of days it covers.
- A leftover part-column at the end of a chart is still shown rather than dropped, and is
  labelled with just its own day when it holds a single day.
- Columns can be folded by highest value, by average, or by total, depending on what is being
  charted.
- A stretch of history too short to fill one column is left exactly as it is.
- Folding works on negative numbers and on runs of zeroes without producing nonsense.
- Chart labels read correctly across the end of a month and the end of a year.
- The strength chart keeps the oldest and newest real readings untouched and compresses only
  the middle, so a personal best at either end can never be averaged away.
- A brand-new account with nothing logged still gets a single point for today instead of an
  empty chart.
- On food charts, a day with nothing logged reads as zero.
- On the weight chart, a day with no weigh-in repeats the last known weight instead of
  collapsing to zero.
- Before the very first weigh-in, the weight chart shows the person's starting weight rather
  than a fake zero.
- A genuine reading of zero counts as real data and carries forward from there, instead of
  being mistaken for a missing day.
- The chart window starts at whichever came first — the day the account was set up, or the
  first entry — and is capped at a month or a year depending on the chart.
- History older than that cap is left out of the chart, though the starting-weight fill still
  applies to the days before the first visible reading.
- Food charts round each point to a whole number, while other charts keep the decimals.
- Setup numbers its screens with no repeats, no skips, and never a number past its own total.
- Somebody choosing to hold their weight steady skips the pace question and sees seven steps
  instead of eight — but only after they have actually chosen, so the earlier screens still
  honestly promise eight.
- The step total never grows partway through setup, so the progress bar can never appear to
  slide backwards.
- Losing weight and gaining weight are numbered identically; only holding steady differs.
- Signing out always asks for confirmation first.
- Tapping sign out twice quickly does nothing the second time.
- A normal sign-out shows a busy state and clears it again afterwards.
- Failing to sign out because the phone is offline warns that unsaved data will be lost and
  offers to sign out anyway.
- Failing to sign out because data is still uploading tells the person they can wait or force
  it through.
- Any other sign-out failure shows the error and is reported for diagnosis, and never offers
  the force option.
- A forced sign-out that itself fails shows its own error instead of leaving the screen stuck.
- Signing out erases that person's own leftovers from the phone.
- Signing out leaves the phone's light-or-dark setting alone.
- On a shared phone, signing one account out leaves the other account's leftovers untouched.
- The rate-this-app sheet is only requested when the phone says it can show one.
- Every way that request can fail — no sheet available, the availability check erroring, or
  the sheet itself erroring — leaves the user seeing nothing at all.
- In particular, no failure ever leaks a developer-facing message to a real user.
- The app waits for the rating sheet to finish before moving on, and no failure escapes as an
  unhandled error.
- A permission refused for good sends the person to the phone's settings page instead of
  pointlessly asking again, and tapping through opens that page.
- Weight is labelled from one shared place, so two screens can never disagree on the wording.

## Not proven

- The unit conversions themselves are almost entirely untested. Only the text label is
  covered — pounds to kilos, inches to centimetres and feet-and-inches all run with no test
  behind them, so a wrong conversion factor would sail straight through.
- The date wording a person actually reads is untested. "Today", "Feb 3, 2024", the short
  slash format and the single-letter weekday labels have no tests; only the stored day and
  the day-counting are covered.
- Every date test runs on one clock in one part of the world. The rule that a day never
  drifts is checked against the machine running the tests, not against a phone in Tokyo or
  Honolulu, so a genuine timezone bug could still hide here.
- The stored-day format was compared against the standard format using the calendar engine on
  a desktop, not the one inside the phone. Because that stored day is saved and synced, a
  person still has to confirm it on a real device before release.
- Several date tools in this same box have no tests at all: adding days, finding the start of
  a week, sorting by date, checking whether a date is in the future, and restoring dates that
  came back from storage.
- Pressing Cancel is never tested. Both sign-out prompts are only ever confirmed, so nothing
  proves that backing out leaves the account signed in and the screen no longer busy.
- Nothing checks that the two everyday sign-out troubles — being offline, or still uploading —
  stay out of the crash reports. They leave a note behind, but no test says they are not also
  reported as failures.
- No one is ever really signed out. Whether unsaved data genuinely reaches the server first,
  and whether the app lands back on the right screen, is proven elsewhere, not here.
- Signing out currently erases exactly one leftover. If someone adds a second per-person item
  and forgets to add it to the list, no test here notices the leftover being kept behind.
- The delete-account confirmation living in this same box has no tests.
- Nothing proves the rating sheet ever actually appears. The phone decides that, and it is
  allowed to refuse silently a few times a year. All that is proven is that the app asks
  correctly and stays quiet when it cannot.
- Nothing stops the rating prompt from nagging. The tests confirm it asks the phone again on
  every single call, which is only safe because it currently runs once during setup — no test
  protects a future screen from calling it over and over.
- One broken case in the setup counter is recorded rather than fixed: asking for the pace
  screen on the hold-steady path returns a position of minus one, which would draw a wrong
  progress bar. It cannot be reached today, and the test pins that fact instead of preventing
  it.
- Chart folding is never asked for a column size of zero or a negative one, and the
  keep-the-ends chart is never asked for fewer than three columns — a case it is written to
  reject outright but that no test presses.
- Nothing here proves a chart looks right. The number of columns and the value inside each
  one are checked; whether the labels fit on a phone screen without overlapping is not.

Area: lib/utils · 116 cases · reviewed 2026-08-19
