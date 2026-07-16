# Issue 9 — Deleting a logged set happened with a single tap, no confirmation

**What you'd have noticed**
On a workout's history list, each logged set has a small trash icon next to it. Tapping that icon deleted the set immediately — no "are you sure?" prompt, nothing to undo. If your thumb caught the icon by accident while scrolling or reaching for something else, the set was gone for good. Every other delete in the app (deleting a whole workout, an exercise, an archived item, your account, or unsaving a meal) asks for confirmation first. This one didn't.

**Why it happened**
The trash icon's tap handler went straight to removing the set with no confirmation step in between. Nutrition entries were deliberately left out of this fix — deleting a nutrition entry already requires opening an options menu first and tapping a clearly-labeled "Delete," so that extra step already serves as the safeguard. The logged set had no equivalent step, so a single stray tap was all it took.

**What we changed**
Tapping the trash icon on a logged set now brings up a confirmation dialog: "Delete set? This set will be permanently removed. This cannot be undone." with Cancel and Delete options. The set is only removed once you tap Delete. This uses the same shared confirmation dialog the rest of the app already uses for its other deletes, so the wording and behavior match what you'd expect elsewhere in the app. Once you confirm, the set is removed and the list smoothly closes the gap where it was.

**How we know it works**
The app's full type-checking pass was re-run and confirmed the change introduced no new errors. Manually: tapping a set's trash icon now shows the confirmation dialog; tapping Cancel leaves the set untouched in the list; tapping Delete removes it as before.

**Files touched**
- `components/WorkoutComponents/LogHistoryList.tsx` — the set-delete trash icon now confirms before deleting
