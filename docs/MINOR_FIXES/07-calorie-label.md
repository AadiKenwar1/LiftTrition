# Issue 7 — The same calorie number was labelled three different ways across the app

**What you'd have noticed**
Look at a calorie number in a few different spots in the app and the label next to it wouldn't match. A food search result might read "450 cal," a saved meal's pill might also say "cal," and the profile screen's goal list used the full word "Calories" as part of the value itself — while most of the rest of the app already used the correct unit, "kcal." Same kind of number, three different-looking tags depending on which screen you happened to be on. Nothing was wrong with the numbers, but seeing three spellings for the same unit across a few taps reads as inconsistent and a little unpolished.

**Why it happened**
There was never one shared rule for "this is how we write a calorie number." Each screen that needed to show a calorie value — the food search results, the saved-meal list, the profile's goal list — wrote its own label by hand, and a few of them typed the casual short form "cal" instead of the correct unit "kcal." With nothing tying these screens together, they quietly drifted apart as they were built at different times.

**What we changed**
Every calorie value now consistently reads "kcal": the food search rows, the saved-meal pills, and the profile's Calories goal row. The word "Calories" is left exactly as it was anywhere it's acting as a title or label for a whole field or section (like the heading above the goal list) — that's a name, not a unit of measurement, so it stays as-is. We also wrote the rule down in the app's shared style guide, so any new screen added later follows the same convention instead of inventing its own label again.

**How we know it works**
We searched the entire app's code for every remaining "cal" unit label and confirmed none were left anywhere a real user could see them — the only leftover was in a developer-only test screen that never ships to users. We also re-ran the app's full type-checking pass to confirm the edits didn't break anything. A visual check of the food search list, the saved-meal pills, and the profile screen, in both dark and light mode, confirms every calorie number now reads "kcal."

**Files touched**
- `components/NutritionComponents/FoodRow.tsx` — food search result rows now read "kcal"
- `app/nutritionScreens/savedNutritionModal.tsx` — saved-meal macro pills now read "kcal"
- `app/nutritionScreens/foodDBModal.tsx` — food database search result pills now read "kcal"
- `app/settingsScreens/profile.tsx` — the Calories goal row now reads "kcal"
- `RESTYLE_PLAN.md` — added the standing rule that calorie values always show "kcal," while "Calories" stays reserved for field and section titles
