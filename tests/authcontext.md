# Signing in and out

## What this part of the app does

This is the part that knows who you are. You sign in with the button your phone
provides, the app remembers you across launches, and everything you log afterwards is
filed under your name. It also handles the two ways of leaving: signing out, which must
first push every unsaved bite of food up to the app's own server so nothing is lost, and
deleting your account, which asks the server to erase you and then wipes what is left on
the phone. This file covers everything from the moment the sign-in button is tapped to
the moment the last trace of a leaving user is cleared off the device.

## How we tested it

No real phone, no real sign-in screen, no real server. We fake the four things this part
leans on — the check for whether you are online, the sign-in screen the phone shows, the
app's own server, and the local copy of your data that lives on the phone — and then we
watch what the app does with every answer those four can give. For signing in, that means
handing back a good result, a refusal, a dead connection, and a user who backs out, and
checking which message appears on screen. For leaving, it means failing each step in turn
and checking two things: what the app told the user, and, just as important, the order it
did things in and how much it left behind. Several of these tests do nothing but pin the
order — did the server get asked before anything on the phone was erased? — because
getting that order wrong is the difference between a safe exit and lost data.

**Hardest to prove:** that signing out really waits for the last unsaved meal to reach
the server, and gives up on signing out entirely rather than dropping it; that a sign-out
which fails halfway never leaves someone still signed in but staring at an empty phone;
that wifi which claims to be connected but hides a login wall still produces the gentle
"you're offline" message instead of a scary one.

## What the tests prove

- Tapping sign in while offline shows a plain "you're offline" note and never even opens
  the phone's sign-in screen.
- A broken or unanswered connectivity check does not block sign-in — the app tries anyway,
  because a failing check must never lock someone out of an attempt that would have worked.
- A connection that looks fine but fails partway through signing in gets the same gentle
  offline message, not a technical error.
- Any other sign-in failure shows the actual reason rather than a blank or generic screen.
- Backing out of the sign-in screen does nothing at all — no error, no message, no request.
- Diagnostic reports are stamped with who was signed in at the time, whether the app
  started up already signed in, started up signed out, or changed hands while running.
- Signing out clears that stamp, so later reports are not blamed on the person who left.
- If the local copy of your data fails to connect after you sign in, that trouble is
  reported for diagnosis exactly once — never twice, never zero times.
- When nobody is signed in, the app does not try to connect that local copy at all.
- Signing out waits for every unsaved change to reach the server first, and only then
  ends the session and clears the phone.
- If those unsaved changes cannot be pushed up in time, the sign-out stops dead: you stay
  signed in and nothing on the phone is touched, so the data is still there to try again.
- If ending the session fails, nothing on the phone is cleared either.
- If the wipe of the local data fails during a normal sign-out, the failure travels up to
  the screen that asked for the sign-out instead of being reported twice from two places.
- There is a second, deliberate sign-out for when the normal one is stuck, and every use
  of it is recorded for diagnosis before anything is torn down, because it can lose data.
- That emergency sign-out works with no connection at all — it removes the session from
  the device directly and still clears the departing user's files.
- If the session cannot be removed even that way, nothing is wiped, the user is told to
  try again when back online, and the failure is reported once.
- Deleting an account when nobody is signed in refuses with a clear message and never
  contacts the server or erases anything.
- If the server refuses the deletion, nothing on the phone is erased and the server's own
  reason is what the user sees.
- The server is always asked first and its confirmation always comes before any local
  erasing — never the other way round.
- Once the server confirms, the cleanup finishes even if a later step stumbles, so a
  deleted account never leaves a half-erased phone behind.
- Deleting deliberately skips the wait for unsaved changes, since data about to be erased
  is not worth waiting for.
- The delete request goes to one exact address, spelled exactly, carrying proof of who is
  asking — a one-letter difference there would silently fail to delete anything.

## Not proven

- The real sign-in screen is never opened. We fake the phone's sign-in and the app's own
  server, so whether the real button works, and whether what it hands back is genuinely
  accepted, is confirmed by a person on a real device, not by a test. The app only offers
  the one sign-in method; there is no second provider being tested or skipped.
- No request ever reaches a real server. The delete request's address and the proof
  attached to it are pinned exactly, but whether the server on the other end actually
  erases the account is entirely outside these tests.
- Pushing unsaved changes up is faked here — we prove that signing out refuses to continue
  when the push fails, but not that the push itself really drains everything, nor whether
  the one-minute allowance is enough on a slow connection.
- Wiping the phone's local copy of your data is faked. We prove the app asks for the wipe
  at the right moment and reacts correctly when it fails, not that the data is truly gone
  from the device afterwards.
- Nothing here proves what a user actually sees on screen while leaving — the confirmation
  prompt, the spinner, and the choice offered when a sign-out gets stuck all live on the
  screens above this part and are proven separately.
- The stamp linking diagnostic reports to a person is checked at start-up and across a
  sign-in and a sign-out. What happens to it during the routine background refresh of a
  long-running session is not directly proven.

Area: context/AuthContext · 33 cases · reviewed 2026-08-19
