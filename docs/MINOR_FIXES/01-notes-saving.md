# Issue 1 — Workout notes were saving to the database on every keystroke

**What you'd have noticed**
When you typed a note on a workout, the app saved that note to the database after every single letter you typed. A short sentence could trigger dozens of saves, and a longer note could trigger hundreds. Each of those saves also had to be sent up to the server, so the pile-up of pending saves was part of what made signing out feel slower than it should — the app had to finish sending all of them before it could safely sign you out.

**Why it happened**
The notes screen watched the note text box and, any time the text changed by even one character, immediately wrote the whole note to the database. There was nothing in place to wait for a pause in typing, so typing "great workout today" fired off a separate save for every letter along the way, one after another. This lived in the notes screen file, `app/workoutScreens/notesModal.tsx`.

**What we changed**
We built a small, reusable "wait until you stop typing" helper and switched the notes screen to use it. Now, instead of saving on every keystroke, the app waits until you pause typing for a bit over half a second, then saves once with whatever you've typed so far. If you close the note before that pause happens — for example, by swiping it away right after typing — it saves immediately as you leave, so nothing you typed is ever lost. And if you open a note and never actually change it, nothing gets saved at all.

**How we know it works**
We added an automated test that simulates typing with a fake clock. It confirms three things: typing several characters in a row results in exactly one save (not one per letter), and that save contains the final text; closing the note before the pause finishes still saves the latest draft immediately; and a note that's opened but never edited never triggers a save. All three checks pass. We also confirmed this change didn't introduce any new type-checking errors in the files it touched.

As a manual double-check: open a workout's notes, type a short note quickly, and swipe it away immediately — under Settings → Developer → Dev Stats, the upload queue should show only one or two pending note saves rather than one per letter typed, and reopening the note should show the full text was saved.

**Files touched**
- `lib/hooks/useDebouncedSave.ts` (new) — the reusable "wait until you stop typing" helper
- `lib/hooks/__tests__/useDebouncedSave.test.tsx` (new) — the automated tests described above
- `app/workoutScreens/notesModal.tsx` — now uses the new helper instead of saving on every keystroke
