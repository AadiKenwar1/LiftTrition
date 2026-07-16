# Issue 12 — Deleting two logged sets quickly could bring the first one back

**What you'd have noticed**
On a workout's history list, deleting a logged set makes it slide away and disappear — that worked fine for a single delete. But if you deleted a second set right after confirming the first, before the first one had finished sliding away, the first set could pop back into the list as if it had never been deleted. It looked gone, then reappeared. Nothing was actually wrong with your data — leaving the screen and coming back would show it correctly deleted — but in the moment it looked like the delete had failed or undone itself, which is unsettling when you're trying to fix a logging mistake.

**Why it happened**
Every row in the list shared a single "slide away and disappear" animation instead of each row getting its own. Confirming a delete started that shared animation for that set. If you confirmed a second delete before the first animation finished, the animation restarted for the new set — and the still-running first animation was told it didn't finish, so the step that actually removes the set from the list never ran for it. The set only looked like it survived; it snapped back to normal even though you'd already confirmed you wanted it gone.

**What we changed**
Deleting a set now removes it from the list the moment you confirm, instead of waiting for a slide-away animation to finish first. The list still animates smoothly when a row leaves — the rows around it close the gap in one clean motion — but that's just visual polish now, and a second delete can no longer interrupt or cancel it. Each confirmed delete sticks right away, no matter how quickly you tap through several in a row.

**How we know it works**
The app's full type-checking pass was re-run and confirmed the change introduced no new errors. A new page was added to the developer test hub ("Log History — delete") with a sample list of logged sets you can delete freely without touching any real data. Using it: tapping a trash icon still brings up the "Delete set?" confirmation first; confirming a single delete removes that set with the same smooth animation as before; confirming two or more deletes back-to-back, as fast as the confirmation dialogs allow, leaves every one of them gone once the list settles — none of them come back.

**Files touched**
- `components/WorkoutComponents/LogHistoryList.tsx` — a confirmed delete now removes the set immediately instead of going through a shared slide-out animation first
- `components/devTest/LogHistoryListTest.tsx` — new developer test page with a sample list of sets to delete
- `app/devTest/logHistory.tsx` — new dev-only route for that test page
- `components/devTest/DevHub.tsx` — added a link to the new test page
- `app/_layout.tsx` — registered the new test page's route
