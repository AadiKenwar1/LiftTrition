# Issue 18 — Setup answers were lost if you closed the app partway through

**What you'd have noticed**
If you closed the app (or it crashed) partway through the initial setup questions — the ones asking about your body stats, your goal, and your target weight — and then reopened it, every answer you'd entered was gone. You'd land back at the very beginning of setup as if you'd never started, even if you were one screen away from finishing.

**Why it happened**
The setup flow only kept your answers in the app's temporary memory. Nothing was actually saved to your account until you reached the very last setup screen and tapped through. This was on purpose in one sense — the app didn't want to save half-finished, made-up placeholder information and mistake it for your real profile later — but the way it was built, that same rule blocked saving your *real* answers too, all the way through setup. So a force-quit or crash at any point before the final screen threw away everything you'd typed. This also left a loose end: one setup screen saves your starting body weight right away, ahead of the rest of your answers. With everything else unsaved, that early weight entry had no matching profile to belong to if you never finished setup.

**What we changed**
Each setup answer is now saved as you go, the same way the rest of the app already works. If you close the app or it crashes partway through setup and you reopen it, you're brought back into setup with everything you already entered — height, weight, goal, and so on — still filled in, instead of starting over from scratch. This also fixes the loose end above: your starting weight entry now always has a matching profile alongside it. The original worry about saving made-up placeholder information is now handled by a separate screen that specifically deals with a failed first-time load, so it was safe to let normal saving happen throughout setup.

**How we know it works**
The app's existing automated tests for settings and profile handling all still pass. Manually: starting setup, answering several questions including height and weight, then force-quitting the app and reopening it shows your answers are still there rather than a blank slate. We also confirmed this doesn't change anything for people who already have an account — signing out and back in as an existing user loads your profile normally with no extra, unexpected saves.

**Files touched**
- `context/SettingsContext/index.tsx` — setup answers now save as you go, instead of waiting until the very last setup screen
