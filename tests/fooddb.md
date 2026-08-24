# Looking up food by name

## What this part of the app does

Type "chicken breast" into the food search box and the app comes back with a list of
matching foods, then with the calories, protein, carbs and fat for whichever one you tap.
The phone never talks to the food database service directly — it asks the app's own
server, which does the looking up on its behalf. This file covers everything between the
letters being typed and the numbers appearing: sending the lookup, every way it can come
back wrong, the short summary line each result carries, the built-in shortcut list of
everyday foods, and the answers the app remembers so it doesn't ask the same question
twice.

## How we tested it

Three experiments, and none of them touch a real food database. For the lookup half we
fake the network, so we can hand the app any reply we like — a good list of matches, a
"you have searched enough for today" refusal, a "we could not confirm your subscription"
refusal, a server that errors, a dead connection, or a reply that arrives but is garbled —
and then check three things each time: what the caller gets back, whether the trouble is
reported for diagnosis, and how many times a request went out at all. For the summary line
each result carries, we feed in real examples plus deliberately broken ones and check what
comes out. For the shortcut list of everyday foods we simply walk the whole list and check
every entry is complete and sane, because that list is typed in by hand and nothing else
would catch a slip.

**Hardest to prove:** that asking the same question twice really costs only one lookup
against the daily allowance, rather than quietly spending two; that the two everyday
refusals never open the server's reply, so nothing raw from it can end up in front of the
user; that a connection dying during a details lookup still gets reported for diagnosis
even though the user is shown nothing at all.

## What the tests prove

- Searching for nothing but blank space does nothing at all — no sign-in check, no request,
  and an empty list back straight away.
- What the user typed is tidied up — extra spaces removed, capital letters flattened —
  before it is sent, so "  BANANA  " and "banana" are the same question.
- A signed-out user never sends a lookup; the attempt stops before anything leaves the phone.
- Whatever list of matches the server returns is handed back exactly as it arrived, unchanged.
- The same search run twice only goes out to the network once, so one search never costs two
  against the daily allowance.
- Running out of daily searches tells the user to try again tomorrow.
- A subscription that could not be confirmed tells the user to try again in a moment.
- Neither of those two everyday refusals opens the server's reply at all, so nothing raw from
  it can leak into what the user sees.
- Neither of those two refusals is treated or reported as a crash — they are normal limits,
  not faults.
- A genuine server failure produces an error that carries the status and the server's own
  words, and is reported for diagnosis exactly once.
- A dead connection is reported for diagnosis exactly once, then passed on to whoever asked.
- A reply that arrives successfully but cannot be read is also reported exactly once — a
  fault blamed on the server, not on the phone.
- Tapping a result with no identifier attached returns nothing without sending a request.
- The detailed numbers for a food are remembered after the first look, so tapping the same
  food again asks nobody.
- When the daily limit is hit while opening a food's details, the app quietly shows no
  details rather than an error, and nothing is reported for diagnosis.
- When the connection dies while opening a food's details, the user likewise sees nothing —
  but the failure is still reported for diagnosis exactly once.
- A food's details are reshaped into the form the rest of the app uses, with stray spaces
  around the brand name trimmed off.
- A food whose details could not be retrieved produces nothing at all rather than a
  half-filled entry.
- Wiping the remembered answers makes the very next identical search, and the very next
  identical details lookup, go out to the network again.
- The one-line summary attached to each search result is turned into calories, fat, carbs and
  protein, along with the serving it applies to.
- That summary works whether the serving is a weight or an everyday measure like a cup.
- Sloppy spacing around the dashes and dividers in that summary does not break it.
- A result with no summary line, an empty one, or one in a shape the app does not recognise
  produces no preview instead of an error.
- A summary whose numbers are not really numbers produces no preview rather than nonsense
  figures.
- The built-in shortcut list of everyday foods is not empty, and no two entries share an
  identifier.
- Every shortcut food has a name, a serving description, calories above zero, and macro
  numbers that are real and never negative.

## Not proven

- Nothing here reaches the real food database service or the real server. Whether searching
  "banana" actually finds bananas, and whether the numbers that come back are correct, is
  entirely unproven — the app is only checked for how it handles replies we invented.
- Remembered answers are meant to go stale after a week, and nothing tests that. Every test
  runs against answers stored moments earlier, so a week-old answer being looked up fresh is
  assumed, not demonstrated.
- Wiping the remembered answers is proven to work when someone asks for it, but nothing here
  proves signing out actually asks for it. That wiring lives elsewhere and is untested from
  this side.
- The shape of a good reply is never checked. A reply that is technically readable but full
  of the wrong things would sail straight through to the rest of the app.
- The numbers in the hand-typed shortcut list are only checked for being sane, never for being
  right. They were copied from the real service once, by hand, and if the real service changed
  its figures tomorrow nothing here would notice.
- Two identical searches fired at the same moment, before either has answered, are not covered.
  Whether that costs one lookup or two against the daily allowance is unknown.
- The parsed preview numbers are only checked for being numbers. A summary claiming an
  absurd calorie count is accepted without complaint.
- None of the screens are tested here — the search box, the waiting state, the list the user
  scrolls, and the message shown when a lookup fails are all somebody else's experiment.

Area: lib/foodDB · 26 cases · reviewed 2026-08-19
</content>
</invoke>
