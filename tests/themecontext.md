# Light and dark appearance

## What this part of the app does

The app can show itself in a light look or a dark look. The user either leaves it on
"follow my phone" — so the app changes when the phone changes — or picks light or dark
outright and sticks with it. Underneath that choice sits one shared set of colors every
screen draws from, along with a small helper that makes a faint, see-through version of a
color for the tinted patches behind icons and labels. This file covers two things: how the
app decides which look to show, and how that see-through helper behaves.

## How we tested it

No screens are drawn and no phone is involved. Both experiments poke the two decision-makers
directly and check the answer that comes back. The first one asks for a decision in every
combination that can occur: each of the three settings a user can be on — light, dark, or
follow-my-phone — paired with every signal the phone can send back, including the two
different ways a phone can send back nothing at all. The second one hands the see-through
helper each shape of color that actually appears in the app's color set — a solid color, one
written in small letters, and ones that already carry see-through information — and checks
what comes out. The expected results were worked out by hand from the real colors the app
uses, so they are a genuine second opinion rather than a copy of whatever the code produced.

**Hardest to prove:** that a phone which reports nothing at all about light or dark still
lands the app on a sensible look instead of nowhere; that a color which is already partly
see-through is left alone rather than being made see-through twice and turned into something
the screen cannot read at all.

## What the tests prove

- Picking light keeps the app light, whatever the phone is set to.
- Picking dark keeps the app dark, whatever the phone is set to.
- Leaving the app on follow-my-phone makes it match the phone's own light or dark setting.
- When the phone reports nothing about light or dark, the app settles on dark rather than
  ending up with no look at all.
- Both of the ways a phone can report nothing are handled the same, so neither one slips
  through as a different result.
- A solid color is turned into the same color carrying the requested amount of see-through.
- A color written in small letters is read exactly the same as one written in capitals.
- Asking for fully solid and asking for fully invisible both come back exactly as asked,
  with nothing rounded or clipped at the edges.
- A color that is already partly see-through is handed straight back untouched, so it can
  never be made see-through a second time and ruined.
- Colors written in the short three-character form, and ones that already spell out their
  see-through amount, are likewise handed straight back untouched.

## Not proven

- Nothing checks the colors themselves. Whether the light set is actually light, whether the
  dark set is actually dark, and whether text is readable against the surface behind it are
  all unproven — those promises live only in notes written beside the colors, and changing a
  color to something unreadable would not make a single test fail.
- Nothing checks that the user's choice survives closing the app. Saving the setting and
  reading it back the next time the app opens is never exercised.
- Nothing checks that a saved setting left over from an older version of the app is still
  accepted, or that a damaged or nonsense saved value is ignored instead of used.
- Nothing checks that changing the phone's own light-or-dark setting while the app is open
  actually flips the app live.
- Nothing checks the iPhone-only step that pushes the choice onto the pop-ups the phone draws
  itself — date pickers, alerts, keyboards — which would otherwise stay on the phone's setting
  while the rest of the app follows the user's.
- Nothing checks that screens actually use this shared set of colors. A screen with a color
  typed directly into it would still pass everything here.
- Nothing checks the fonts, the spacing, the roundness of corners, or the swap between the
  light and dark versions of the logo.
- Nothing checks the developer-only preview feature that temporarily swaps in candidate
  colors while trying out new ones.
- The see-through helper is only tried against a handful of colors chosen by hand, not against
  every color in the app's set, and asking it for an impossible amount of see-through — less
  than none, or more than full — is never tried.

Area: context/ThemeContext · 9 cases · reviewed 2026-08-19
