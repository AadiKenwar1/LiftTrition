# Offline-first sync and the loading gate

## What this part of the app does

Everything you log — meals, workouts, weigh-ins, settings — is written to a database that
lives on your phone, so the app keeps working with no signal, and a background sync engine
copies those changes up to the server whenever it can. When you open the app while signed
in, a loading screen holds you there until the phone has finished pulling down your data for
the first time, and a small health monitor keeps watching afterwards in case the connection
quietly dies. This file covers everything between a change being saved on the phone and it
landing on the server, plus the loading screen, the escape hatch behind it, and the monitor.

## How we tested it

Nothing here touches a real server, a real sync engine, or a real phone. We build stand-ins
for all three and drive them by hand. The server stand-in lets us hand back any answer we
want — a clean success, a rejection the server would never change its mind about, a
temporary hiccup, a dropped connection — and, crucially, lets us hold a call open so we can
watch how many changes the app has in flight at once and then release them one at a time.
The sync engine stand-in lets us declare the connection up or down, say when it last synced,
and say how many changes are still waiting to go up. Time is faked too, so a thirty-second
wait or a ten-minute silence happens instantly. The screens are built in a bare test harness
with no phone attached, and we read what they show and press their buttons. Then we check
what the app did: which calls it made, in what order, how many at a time, what the user was
told, and what was reported for diagnosis.

**Hardest to prove:** that a change to your settings which finds nothing to update on the
server is rebuilt from the phone's own copy rather than silently disappearing forever; that a
first download finishing in the very same instant the give-up timer fires counts as success,
and one finishing afterwards cannot un-fail a wait already given up on; that two edits to the
same row still go up in their original order while unrelated rows are being sent side by side.

## What the tests prove

- A signed-in device connects and is held on a loading screen until its first full download
  of data has finished.
- The real app only appears once that first download has completed.
- Trying to connect while signed out fails outright rather than syncing as nobody.
- If the first download does not finish within thirty seconds, the app gives up rather than
  spinning forever.
- It does not give up even a moment before that deadline.
- A download that completes in the same instant the deadline fires counts as a success, not
  a failure.
- A download that finishes after the app has already given up cannot turn that failure back
  into a success.
- Every attempt cleans up its own give-up timer, so retrying over and over while offline does
  not leave a pile of stray timers behind.
- The failed loading screen offers a retry and a sign-out escape.
- While things are still loading normally, neither of those is shown at all.
- Where the sign-out escape is not offered, only the retry appears.
- Both are announced as buttons to a screen reader and run their action when tapped.
- The sign-out escape asks for confirmation first and marks signing out as the dangerous
  choice; nothing is signed out or cleared until that confirmation is tapped.
- That escape deliberately skips the "finish your uploads first" step, because a device that
  never completed its first download has nothing waiting to lose.
- The routine hourly renewal of a sign-in pass does not throw a signed-in user back to the
  loading screen or re-run the connect-and-wait gate.
- A new record, an edit, and a deletion each reach the server as the matching kind of change.
- A batch of changes is marked finished only after every change in it has been attempted.
- With nothing waiting to go up, no server calls are made at all.
- Settings, daily weigh-ins and custom exercises are matched on the server by what they mean
  — whose they are, which date, which name — rather than by the id the phone invented, so the
  same thing created on two phones updates one server record instead of making a duplicate.
- For those three, an existing server record is updated and the phone's own id is discarded;
  where there is no server record, one is created with it.
- Every other kind of record is matched by plain id.
- A custom exercise's list of secondary muscles is converted into the shape the server stores
  before it is sent.
- A long run of the same kind of change — a workout dragged into a new order, say — is sent
  several at a time rather than one after another.
- No more than five of those are ever in flight at once.
- Every change in such a run still gets its own separate call; none are merged away or skipped.
- Two changes to the same row are always sent in their original order, even while unrelated
  rows are going up beside them.
- Settings and weigh-in changes are always sent strictly one at a time, because those read the
  server before writing and sending two together could let one overwrite the other.
- A change the server will never accept — bad data, a broken rule, a missing column,
  permission refused — is dropped from the line and reported for diagnosis, so one poisoned
  change cannot wedge every later change behind it forever.
- A change that failed for a passing reason — connection lost, deadlock, server too busy,
  expired sign-in pass — is kept for another try and is not reported as a bug.
- When a change is kept for another try, its whole batch stays unfinished, so nothing in it is
  lost.
- A "this already exists" clash on the three kinds matched by meaning counts as passing rather
  than permanent, because trying again resolves it — this is what stops a custom exercise
  created on a second phone from being silently thrown away.
- Dropping one hopeless change never stops the rest of the batch; the changes after it are
  still sent.
- When changes are going up side by side, one being permanently rejected does not stop its
  neighbours from being attempted.
- When changes are going up side by side, one failing temporarily does not stop its neighbours
  from being attempted either.
- An edit to your settings that matches no record on the server is repaired: the app rebuilds
  the full record from the phone's own copy instead of throwing the edit away.
- If the phone's copy is gone as well, nothing is written to the server and the dropped edit is
  reported for diagnosis rather than vanishing untraced.
- The "wait for pending uploads" step ends successfully once the line of waiting changes
  reports empty.
- It stops straight away with a clear "not connected" answer when the device is offline, rather
  than sitting out the full timeout.
- It ends with a clear "timed out" answer when the line never empties in the time allowed.
- Both of those answers are recognised by the single check the sign-out path uses to decide
  whether it is safe to continue, while an ordinary unrelated error is not — so a random
  failure cannot be mistaken for "your uploads didn't finish".
- Connect, disconnect, forced reconnect and sign-out-and-wipe requests are run strictly one at
  a time, so two of them can never overlap.
- One of those requests failing does not wedge the rest; the next one still runs.
- A forced reconnect straight after a previous one is refused, so a struggling connection
  cannot be hammered.
- A forced reconnect is skipped entirely while the app is in the background, and nothing is
  disconnected in the meantime.
- A failed forced reconnect is reported for diagnosis exactly once: the health monitor that
  asked for it only leaves a note, so the same failure is never counted twice.
- Ordinary connect failures and sign-out-and-wipe failures are deliberately not reported at
  this layer, and are left to whoever asked for them — again so nothing is double-counted.
- Nothing that succeeded is ever reported as an error.
- When the health monitor finds the connection down, it asks for a forced reconnect.
- When the connection is up and has synced recently, the monitor leaves it alone.
- Returning to the app from the background first tries a cheap "connect if not connected"; if
  that fails, the failure is swallowed on purpose and never reported as a crash.
- The hourly sign-in renewal does not tear down and rebuild the health monitor.
- A save to the phone's own database that fails is always reported for diagnosis, tagged with
  which part of the app it came from.
- During normal use, a failed save reloads from what is actually on disk, so the screen cannot
  keep showing a change that never stuck.
- During first-time setup a failed save does not reload, because the answers so far live only
  in memory and reloading would erase them.
- During first-time setup a failed save also shows the user nothing, while still being reported
  for diagnosis.
- A burst of failed saves produces one alert rather than an alert storm, and a later failure
  once the quiet window has passed can alert again.
- A failed settings save is worded differently from an ordinary failed save.
- The wait between save retries doubles from one second and stops growing at thirty.

## Not proven

- No test crosses the network. Whether the server actually accepts what is sent, whether the
  rules governing what each account is allowed to download match the copy kept in this project,
  and whether data genuinely lands on the other side are all unproven.
- The phone's database is faked in every test too. Nothing here proves a change really survives
  closing and reopening the app.
- Nothing proves that changes to different kinds of record keep their original order — a
  workout being created before the exercises inside it, for example. The code groups changes
  specifically to preserve that, but no test here would fail if the grouping broke.
- Holding a batch back is proven; the sync engine actually coming back and retrying it later is
  the engine's own behaviour and is never exercised.
- The health monitor's timing is largely unproven. The tests only cover a single check at
  start-up and one wake-from-background. That the check truly repeats every half minute, and
  that a connection gone quiet for more than ten minutes triggers a reconnect, are read from
  the code rather than proven.
- The length of the cooling-off period between forced reconnects is not pinned down. A second
  reconnect immediately after the first is proven to be refused; how long that refusal lasts
  is not.
- Nothing proves the monitor stays switched off when nobody is signed in, or while sign-in is
  still being worked out.
- The wait for pending uploads is proven to succeed when the line reports empty and to fail
  when it never does, but not that it insists on two clean readings in a row first — so a
  single momentary "empty" blip being trusted too early would not be caught here.
- Nothing in this area proves the normal sign-out flow actually waits for pending uploads, or
  that a wait which cannot finish really blocks the sign-out. The waiting step is proven on its
  own; who calls it, and what they do with the answer, belongs to the account code.
- The loading screen's animation is not covered, including the deliberate one-second delay that
  stops a fast load from flashing a caption on screen.
- Converting stored data into the shape the server expects is only checked for one field on one
  kind of record.
- The guarded loading screen is only tested with someone signed in. What a signed-out user sees
  at that gate is untested.

Area: lib/powersync + components/GuardComponents · 85 cases · reviewed 2026-08-19
