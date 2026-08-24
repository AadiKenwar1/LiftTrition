# The app shell

## What this part of the app does

The shell is the outer frame every screen lives inside. It decides which screens a
person is allowed to open and when: someone who is not signed in should only ever see
the sign-in screen, someone who has not finished the setup questions should only see
those questions, and everyone else gets the real app. The shell also holds a large pile
of scratch screens the team built for trying out designs and reading diagnostics, and
those are supposed to be impossible to reach in the version people download from the
store. On top of that, the shell switches on the app's background systems in a set
order, holds a waiting screen until they are all ready, and catches a screen that
crashes so the whole app does not go black. This file covers all of that.

## How we tested it

There is exactly one experiment here, and it never starts the app. It reads the shell's
own source text as if it were a document and inspects how the screens are filed. Every
screen in the shell is written inside a labelled bucket, and each bucket carries a
condition saying who may open the screens inside it. The test pulls those buckets apart,
matches each screen name to the bucket it sits in, and checks that the scratch screens
are filed only in the bucket whose condition includes the switch that is off in the
shipped app. It also checks the reverse direction: that the bucket for everyday screens
holds none of the scratch ones. One extra check exists only to stop the whole thing
passing for a silly reason — it confirms the list of scratch screens it found is not
empty, so that renaming them can never turn the test into a check of nothing.

Because it is a reading exercise rather than a running app, nothing is faked and nothing
is real. No screen is drawn, nobody signs in, no data loads, and no crash happens.

**Hardest to prove:** honestly, nothing here was hard. The one thing this experiment
does well is prove that renaming or moving a scratch screen cannot quietly smuggle it
into the shipped app, which is the kind of mistake a person reviewing the change would
easily miss. Every genuinely hard question about the shell — what a real signed-out
person actually sees, what happens while data is still loading, what happens when a
screen blows up — is in the list below, untested.

## What the tests prove

- Every scratch screen the team built for trying out designs is filed only in the bucket
  that is switched off in the version shipped to the public.
- The developer-only diagnostics popup is filed in that same switched-off bucket, not
  alongside the everyday screens.
- The bucket holding the app's normal, everyday screens contains none of the scratch
  screens and none of the diagnostics popup.
- Switching the scratch bucket on for the team does not loosen the ordinary rules: it
  still also requires being signed in, having finished setup, and having the app's data
  ready.
- The check is looking at a real, non-empty list of scratch screens, so it cannot pass by
  silently finding nothing to inspect.

## Not proven

- Nothing here runs the app. The whole experiment is a careful reading of source text, so
  it proves how the screens are written down, not what a person on a phone can actually
  reach. If the shell were ever rewritten to decide access some other way, this check
  could keep passing while proving nothing.
- Sign-in gating is untested. Nothing proves that a signed-out person lands on the
  sign-in screen, or that they cannot reach the main app by typing a screen's address
  into the phone.
- Setup gating is untested. Nothing proves that a person part-way through the setup
  questions is kept there, or that finishing setup is what releases them into the app.
- The happy path is untested too. Nothing proves a signed-in person who has finished
  setup actually arrives at the main app.
- The order the app's systems switch on — appearance, sign-in, data syncing, then
  settings, payments, workouts and food — is written into the shell but never checked.
  Nothing would fail if two of them swapped places, even though some of them depend on
  the ones before.
- The waiting screen is untested. The shell holds a loading screen until all four of the
  app's data systems report ready; nothing proves the wait actually happens, nor that the
  app stops waiting once they finish.
- The retry button on that waiting screen is untested. When a data system fails to load,
  the shell is supposed to show a failure and, on retry, re-attempt only the parts that
  failed rather than everything. Neither half of that is checked.
- The crash safety net is untested. Nothing proves that a screen which blows up shows the
  recovery screen instead of a dead app, and nothing proves the crash is reported for
  diagnosis exactly once rather than over and over as the screen tries to redraw.
- The opening sequence is untested. Nothing proves the app keeps its start-up splash
  image on screen until the fonts and the logo have finished loading, or that a font that
  fails to load is surfaced rather than swallowed.
- A screen file that exists but is not written into any bucket at all is a real
  possibility, because the app turns any screen file into a reachable address on its own.
  Nothing here catches such a stray.
- How screens look and behave — which ones show a title bar, which ones slide up as a
  card you can swipe away, which ones can be swiped back — is written in the shell and
  checked by nobody.
- The narrow column the app draws itself into on a tablet, so it does not stretch across
  a huge screen, is not checked at any size.

Area: app/_layout.tsx · 5 cases · reviewed 2026-08-19
