# The food diary

## What this part of the app does

This is where everything you eat gets written down and added up. You can type a meal in,
pick a food off a list, re-use a meal you saved earlier, or take a photo and let the app
work out the numbers — and whichever way you did it, the meal lands in the same diary,
opens in the same editor, counts toward the same daily totals, feeds the same graphs and
streaks, and gets stored on the phone. This file covers everything from the moment an
entry exists — including the moment a photo answer comes back — through to the numbers
you see on screen and the rows kept on the phone.

## How we tested it

Most of it is the arithmetic and the rules, run for real against made-up meals: entries
with awkward serving counts, days with three meals and days with none, names that clash
with names already used, and numbers that should never have been allowed in the first
place. On top of that, a handful of real screens — the analyzing screen, the camera
screen, the edit screen, the diary list and the day's intake card — are drawn into a
stand-in phone so their buttons can be pressed for real; underneath them we fake the
phone's storage, the AI, the camera, the photo library, moving between screens, and the
clock, so the same test gives the same answer today and next February. Two pieces get a
second opinion rather than a self-check: the numbers on the little macro chips are
compared against the hand-written arithmetic they replaced, and the storage rules are
compared against the older, sloppier rules to show the difference is real.

**Hardest to prove:** that tapping Save twice in a half-second logs one meal and closes
one screen, not two; that a quarter-serving of something measured to two decimals comes
back off the phone as exactly the same total, so opening a meal and closing it again
cannot quietly change what you ate; that swiping the analyzing screen away both cuts off
the request still running and keeps the half-finished meal out of the diary.

## What the tests prove

- A total is always the figure for one serving multiplied by how many servings you had.
- A missing serving count is treated as one, while a count of exactly zero adds nothing.
- Changing how many servings you had scales the total once, not twice.
- Macro grams settle on one decimal place and calories on a whole number.
- A name you type always wins over anything the app would have suggested.
- Left blank, a one-item entry borrows that item's own name.
- Left blank, an entry holding several items falls back to a plain placeholder name.
- The suggested name for several items lists them with their counts, and is cut short with
  a trailing ellipsis once it runs long.
- Renaming a one-item entry renames its item too, so the two can never disagree.
- Renaming an entry with several items leaves each item's own name alone.
- Saving a meal under a name you have already used makes a numbered copy instead of
  overwriting the original, and keeps counting up while those numbers are taken as well.
- That name check ignores capital letters and stray spaces, so two meals cannot end up
  looking identical in the list.
- Every entry has to hold at least one item; building one from nothing is refused outright.
- Meals logged before the app tracked individual foods still open properly, using a
  stand-in item built from the meal's own totals.
- A collapsed row shows the brand when there is exactly one item, and a count when there
  are several.
- Every entry opens the same edit screen, whether it was typed, saved, picked off the food
  list, or photographed.
- The brand box appears only for items that actually have a brand.
- Double-tapping Save saves once and closes once.
- Handed a damaged entry, the edit screen backs out quietly instead of crashing.
- Deleting a meal asks first, names the meal in the question, and removes it only after you
  confirm.
- Negative, not-a-number and infinite values are refused before anything can be written
  down, while zeros and left-blank fields are accepted as normal.
- Saving a meal to your favourites waits for the write to actually finish before reporting
  success, and hands back the final name it used so the button can say what happened.
- A write that fails reports no success at all rather than a false one, and raises the
  problem exactly once.
- Numbers on their way to the phone keep their decimals, while not-a-number and infinity
  are stored as zero instead of poisoning the row.
- A quarter of a serving stays a quarter, and a per-serving figure like 29.55 grams stays
  29.55 — so opening a meal and saving it again without changing anything cannot move its
  total, which the older rounding rules did.
- Brands survive the trip onto the phone and back, and rows saved before brands existed
  read back as having none rather than as an empty word.
- An accepted photo answer becomes a diary entry on the day you were looking at, marked as
  having come from a photo.
- A photo that finds exactly one branded product names the entry after that product — a
  brand that is only spaces counts as no brand — while any other photo keeps the name the
  AI gave the whole picture.
- Walking away from the analyzing screen before the answer lands adds nothing to the diary.
- That same gesture reaches the request still running, not merely the answer it would have
  produced.
- Walking away before any photo was even handed over closes cleanly, with nothing sent.
- An analysis that fails adds nothing to the diary.
- Choosing a picture from the phone's own library always goes through the crop step first.
- A day's totals count only the meals logged on that day, and a day with nothing logged
  reads zero rather than borrowing from its neighbours.
- The graph draws one point per day and fills the days you did not log with zero.
- The graph reaches back to the day you finished setting up, or to your first ever meal,
  but never further than thirty days — and with nothing logged at all it shows just today.
- Asking for calories, protein, carbs or fat each gives back that measure and not another.
- Several meals logged on the same day are added into one point.
- The week view always gives seven labelled days, leaves out anything logged outside that
  week, and marks the days that have not happened yet.
- A logging streak counts up only while today itself has something in it.
- Missing today does not erase the run that ended yesterday; that run is reported
  separately so the app can warn you before it breaks.
- Missing a whole day drops both counts to zero.
- The calorie and macro chips shown while you are staging a food match, digit for digit,
  the hand-written arithmetic they replaced — at nothing, at one serving, and at two and a
  half.
- A saved meal's chip scales the totals stored with the meal rather than re-adding its
  parts, because re-adding them would show a different calorie number on a part-serving.
- The day's card shows what you have eaten against your goal, for calories and for each of
  the three macros.

## Not proven

- No real storage is ever touched. We check the instructions the app issues and the numbers
  it puts in them, not that a real phone accepts them, that the tables are shaped the way
  the app assumes, or that anything is still there after a restart.
- Reading the whole diary back off the phone at start-up is never run end to end. Turning
  one stored row into a meal is proven; the loading, grouping and ordering of a real
  diary's worth of rows is not.
- When a write fails, nothing proves the app puts the screen back the way it was. All that
  is proven is that the failure gets reported once and that no false success is claimed;
  the re-reading that is supposed to undo the change is never exercised.
- A photo's numbers now come from the AI alone. The step that used to look a branded food up
  in the food database and overwrite the AI's reading has been removed, because it silently
  replaced values read straight off a package with a different product's. Searching that
  database by hand is untouched and is covered in its own area.
- Nutrition-label photos name their entries differently from food photos, and that label
  naming is not covered here.
- The photo path is only tested with an answer that makes sense. An answer containing no
  food at all, an answer with impossible numbers, and the thirty-second give-up each have
  their own message for the user, and none of those messages is checked.
- Estimating a meal from typed text is not covered in this area at all — including the rule
  that turns an all-zeros estimate into an error instead of writing a zero-calorie meal.
- The diary screen is only rendered far enough to press Delete. Switching days, the date
  picker, scrolling a long day, and the pop-ups for searching foods and picking a saved
  meal are never drawn.
- Searching and ordering your saved meals is proven on made-up lists only; the screen that
  actually shows that list is never rendered, so nothing proves the two agree.
- Every date test pins "today" to a fixed day. Clocks going forward or back, changing time
  zone, and crossing midnight while the app is open are untested.
- The reminders that fire off the back of your diary and your streak are not covered here.
- The name the app pre-fills when you combine several foods into one meal is checked as
  arithmetic only. Whether it stops pre-filling once you start typing is confirmed by a
  person on a developer-only screen, not by a test.

Area: context/NutritionContext · 134 cases · reviewed 2026-08-19
