# Reminder notifications

## What this part of the app does

The app can nudge you to log what you ate: a reminder around breakfast, lunch and dinner,
a pat on the back when you have a logging streak going, and a gentle "come back" message if
you have been away for a few days. You pick which of these you want and what time each one
arrives, and the phone has to agree to show notifications before any of them can be sent.
This file covers everything between those settings being saved and a finished list of
reminders being handed to the phone: which reminders get made, when each one fires, which
ones get skipped, and what happens when something goes wrong along the way.

## How we tested it

Three experiments, and not one of them sends a real reminder. The clock is never left to
chance — every test hands the app a fixed pretend "right now", so a nudge due at nine
tomorrow morning is checked as an exact date and time rather than "roughly a day away". The
settings half is tested against real saving and loading on the phone, including records that
were only half written or that came back as nonsense. For the last half we fake the phone's
notification system completely and read the orders the app gives it: what it wipes, what it
places, in what order, and how it behaves when the phone refuses or the permission was never
granted.

**Hardest to prove:** that two refreshes starting at almost the same moment cannot tangle,
with one wiping out the reminders the other just placed; that a reminder whose time already
passed today is dropped for today while the same reminder on later days survives; that a
failure deep inside the phone's notification system never crashes the app and still gets
reported for diagnosis.

## What the tests prove

- Food logged before late morning counts as breakfast, up to late afternoon as lunch, and
  after that as dinner.
- A meal you already logged today is not reminded about again today.
- Meals logged on other days do not count toward today.
- Older entries saved without a time of day are ignored instead of being guessed at.
- With nothing logged and everything switched on, a full week is prepared in advance: three
  reminders a day for seven days.
- A reminder time that has already passed is skipped for today only; the same reminder is
  still prepared for the days after.
- Switching off one meal removes that reminder from every day, not just today.
- The streak message counts today when today is already logged, and stops at yesterday when
  it is not.
- A streak shorter than three days gets no message at all.
- The streak nudge lands the next morning, and the come-back nudge lands three days out in
  the late afternoon.
- Switching off either the streak message or the come-back message stops it being made.
- With the main reminders switch off, nothing is prepared, even when every individual
  reminder is still switched on.
- Without the phone's permission, nothing is prepared.
- The busiest case still ends up far under the limit on how many waiting reminders a phone
  will hold — 23 against a ceiling of 64.
- Every refresh wipes the reminders already waiting before placing the new ones, so they
  cannot pile up or arrive twice.
- That wipe happens even when the new list is empty, so turning everything off really does
  leave the app silent.
- Two refreshes that overlap are made to take turns: the second one does not start wiping
  until the first has finished placing every one of its reminders.
- Anything that fails during a refresh is caught rather than crashing the app, and is
  reported for diagnosis.
- Before you have chosen anything, reminders are off by default.
- Your settings survive being saved and read back exactly as you left them.
- A settings record missing some pieces is filled in from the defaults instead of failing.
- A settings record that comes back as nonsense falls back to the defaults rather than
  leaving the app stuck.

## Not proven

- Nothing here reaches a real phone. No test shows a reminder actually appearing on a lock
  screen at the right minute — what is proven is that the app asks for the right message at
  the right moment.
- The wording of the reminders is almost entirely unchecked. Only the number in the streak
  message is verified; the meal and come-back messages could be rewritten, or left blank, and
  nothing here would fail.
- Asking the phone for permission is untested. The step that shows the system prompt and
  turns the user's answer into a yes or no has no test of its own — tests either hand a yes
  straight in or fake the answer.
- Time zones and daylight saving are not covered. Every test runs on one steady clock, so a
  reminder that straddles a clock change, or a user who flies somewhere else with a week of
  reminders already placed, is unproven.
- The safety trim that shortens an over-long list is never actually triggered, because the
  worst case tested comes to 23 out of a possible 64. The trim exists but no test exercises
  it.
- Nothing tests the rule that reminders stay quiet while the app is already open in front of
  you.
- Nothing tests what happens after you tap a reminder — whether the app opens, and where it
  takes you, is unproven.
- A settings save that fails is meant to be shrugged off silently, but no test forces a save
  to fail, so that is unproven.
- The streak numbers are handed in by hand. Whether the streak itself is counted correctly is
  proven elsewhere, not here.

Area: lib/notifications · 25 cases · reviewed 2026-08-19
