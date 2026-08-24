# Staying signed in

## What this part of the app does

When you sign in, the app is handed a pass that proves who you are, and it keeps that
pass on your phone so you never have to type your password again just to open the app.
The pass is kept in the phone's secure storage — the locked drawer the phone itself
provides — rather than in ordinary app files that anyone holding the phone could read.
This file covers everything about looking after that pass: writing it down, reading it
back, replacing it when a fresh one arrives, wiping it clean on sign-out, and the one
hidden lever the app pulls to sign you out when there is no internet.

## How we tested it

Two experiments. In the bigger one we fake the phone's locked drawer with a simple set of
labelled slots that behaves the way the real one does — write a slot, read a slot, delete
a slot — which lets us watch exactly which slots the app creates, keeps and clears without
needing a real phone. This matters because the pass is far too long to fit in a single
slot, so the app cuts it into pieces, stores them as numbered slots, and writes a small
note saying how many pieces there are. The tests store passes of different lengths, read
them back, and then look directly at the leftover slots to see whether anything was left
behind. The smaller experiment fakes nothing at all: it reaches into the real outside
sign-in code the app is built on and checks that a specific hidden lever, one the app
pulls during an offline sign-out, is still there.

**Hardest to prove:** that swapping a long pass for a much shorter one does not leave the
tail end of the old pass sitting in the locked drawer; that wiping the pass leaves nothing
at all behind, not even the little note counting the pieces; that a hidden lever buried
inside somebody else's code — one that could vanish in any update — still exists.

## What the tests prove

- A short pass written into the phone's secure storage comes back exactly as it was
  written.
- A pass too long for a single storage slot is split across several slots instead of being
  refused or cut short.
- A long pass comes back at its full original length after being pieced together again.
- The note recording how many pieces exist matches the number of pieces actually written.
- Wiping the pass removes every piece as well as the note counting them, so nothing is
  left under that name at all.
- Replacing a long pass with a shorter one deletes the extra pieces the old one used, so
  no fragment of the old pass survives the swap.
- After such a replacement, reading the pass gives back only the new one, never a blend of
  new and old.
- The hidden lever the app relies on to sign you out with no internet still exists in the
  outside code it comes from, so an update that removes or renames it breaks a test rather
  than quietly breaking offline sign-out.

## Not proven

- Nothing here touches the phone's real locked drawer. The stand-in behaves the way we
  believe the real one does; whether the real one truly enforces the same size limit, and
  whether the pass stays readable while the phone is locked so it can be renewed in the
  background, is unproven.
- The long pass used in the tests is one character repeated thousands of times. That means
  pieces reassembled in the wrong order would still look correct, so the ordering of the
  pieces is not actually proven — only the total length and content.
- Nothing tests a write that fails halfway. The code deliberately writes the pieces before
  the note that counts them, so a crash mid-write should fail safe into "no pass stored"
  rather than a half-built one, but no test ever interrupts a write to confirm that.
- The one-time move of an older, plainly readable pass into the locked drawer — the step
  that runs on the first read after an app update — has no test here at all.
- The web version of the app keeps the pass in ordinary browser storage instead of a
  locked drawer. That path is untested here.
- The hidden lever is only proven to exist, not to work. Whether pulling it actually clears
  the pass and signs the user out is checked by tests for a different part of the app, not
  by these.
- Nothing here proves the pass is automatically renewed before it expires. That renewal is
  switched on in code but never exercised by a test.
- The half of this area that runs on the app's own server rather than on the phone has its
  own separate tests, run under a different system, and none of them are counted here.

Area: lib/supabase · 5 cases · reviewed 2026-08-19
