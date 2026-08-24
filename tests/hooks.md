# Shared screen behaviour

## What this part of the app does

A handful of small behaviours that nearly every screen borrows instead of building its
own. Notes you type save themselves a moment after you stop typing, and save again if you
close the screen mid-sentence. Important buttons refuse to fire twice when you tap twice.
A screen waiting on data knows whether it is still waiting, finished, or broken, so a
failed load can offer to try again. The app's idea of "today" moves on by itself at
midnight. And when a newer version of the app has quietly finished downloading, the app
restarts into it there and then. This file covers those five behaviours themselves, not
what any one screen does with them.

## How we tested it

None of this is tested through a real screen. Each behaviour is loaded into a tiny
stand-in that draws nothing at all, which lets us poke it and read back the answer it
gives. Time is the main instrument: we fake the clock and fast-forward it, so we can jump
five minutes ahead, step across midnight, or hold a slow job unfinished for as long as we
like — all instantly, with no waiting. The world outside the app is faked too: the phone
announcing that the app has come back to the front, the update system that hunts for and
installs newer versions, and the service that collects crash reports, so we can count
exactly which failures get reported for diagnosis and which are deliberately shrugged
off. Saving, loading and submitting are all stand-in jobs we drive by hand, which means we
can finish them, fail them, or leave one dangling at the precise moment we want to see
what the app does next.

**Hardest to prove:** that a newer version which finished downloading before the screen
even appeared still gets applied; that an update check failing because the phone is
offline uses up its five-minute wait instead of retrying over and over; that the date
flips at midnight while the app sits open on screen with nobody touching it.

## What the tests prove

- Typing a run of letters saves once when the typing stops, with the final text — not once
  per letter.
- Closing a screen before that pause is up still saves what was typed.
- Text left exactly as it was found is never saved at all.
- Tapping a protected button three times in a row runs the action once.
- A protected action still receives whatever the button passed it, unchanged.
- While the action runs the button reports itself as busy, so it can be shown greyed out.
- A button meant to send the user elsewhere stays switched off after it finishes, so a late
  tap does nothing.
- A button that stays on screen switches itself back on when the action ends, so it can be
  used again.
- It switches back on even when the action fails part-way through.
- A switched-off button can also be re-armed deliberately, letting a fresh attempt through.
- A screen loading data reports itself as waiting, then as done or failed depending on how
  the load ends.
- Asking to try again after a failure runs the load a second time.
- Changing what the screen is looking at — a different day, say — starts a fresh load by
  itself.
- A load that has been overtaken by a newer one is told it is out of date, so it can drop
  its answer instead of writing over fresher data.
- An overtaken load failing does not turn a screen that already loaded fine into an error
  screen.
- The app opens on the correct local date.
- Returning to the app on the same day changes nothing and does not redraw anything.
- Returning to the app after midnight moves it on to the new date.
- The date also moves on at midnight with the app open and nobody touching it.
- Sending the app away to the background never changes the date on its own, even when the
  day has turned while it was away.
- Leaving the screen cancels its midnight alarm and stops it listening, so nothing keeps
  running behind it.
- A newer version already downloaded when the app opens is applied immediately, rather than
  waiting for the next cold start.
- A newer version that finishes downloading while the app is in use is applied the moment
  it lands.
- It restarts once for that version, not once per redraw.
- A downloaded version that refuses to start is reported for diagnosis instead of taking
  the app down.
- Coming back to the app asks the server for a newer version at most once every five
  minutes, however fast the user switches in and out.
- The first return straight after opening asks nothing, because the app already checked
  when it started.
- Coming back again while the first question is still unanswered does not send a second
  question.
- Sending the app to the background never asks the server anything.
- When the server has nothing newer, nothing is downloaded.
- A check that fails because the phone is offline is swallowed: no crash, no rapid
  retrying — the next attempt waits out the full five minutes — and nothing is reported as
  an error.
- A download that fails leaves the app running the version it already has, and is not
  reported as an error either.
- The whole update behaviour is completely inert in development builds and in the preview
  app: no restart, and nothing is even listening.
- Leaving the screen stops the app listening for returns.

## Not proven

- Nothing here touches the real update system. Whether a restart genuinely relaunches into
  the new version, what the phone actually counts as "finished downloading", and whether a
  bad version can undo itself are all untested — only the app's reaction to being told
  those things is proven.
- Nothing decides *when* a restart is allowed to happen. It can land in the middle of
  whatever the user is doing: a half-filled form is lost, and a photo already sent off for
  analysis is abandoned — the answer, already paid for, arrives with nobody listening,
  nothing is written down, and the user is shown nothing. A deliberate trade-off, with no
  test behind it.
- The date is only ever moved across two ordinary summer days in one time zone. Clocks
  going forward or back for daylight saving, flying to another time zone, and the user
  changing the phone's clock by hand are all untested — even though the code was written
  with the daylight-saving case in mind.
- The five-minute gap between update checks is measured on a clock we move by hand.
  Nothing proves that gap holds on a real phone, which freezes the app's timers while it
  sits in the background.
- The pause before saving is only tested at its normal length. Screens are allowed to ask
  for a shorter or longer pause, and no test covers those.
- Nothing checks what happens when a save itself fails. A save that goes wrong is still
  treated as done and is never tried again.
- Every behaviour here is proven through stand-ins that draw nothing. No test shows a real
  button greying out, a real "try again" appearing after a failed load, or a real notes
  screen actually wired up to the pause-and-save behaviour.
- The two helpers that keep content clear of the notch at the top and the home bar at the
  bottom have no tests at all.

Area: lib/hooks · 38 cases · reviewed 2026-08-19
