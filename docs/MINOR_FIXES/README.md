# MINOR_FIXES — plain-language explainers

One file per fixed AUDIT_MINOR issue. Each explains, for a **non-engineer reading later**, what was wrong and what we changed — no jargon, no line numbers, no code unless a tiny snippet genuinely helps.

**Naming:** `NN-short-slug.md`, where `NN` is the audit-minor issue number (so they sort in order): e.g. `01-notes-saving.md`, `13-food-cache-signout.md`.

**Each file follows this shape (keep it short — half a page):**

```markdown
# Issue N — <plain-English title>

**What you'd have noticed**
The symptom in everyday terms — what a user (or the owner) would actually see or feel. One short paragraph.

**Why it happened**
The underlying cause in the simplest accurate terms. Name the file(s) involved, but explain the idea, not the code.

**What we changed**
The fix in plain language — what behaves differently now and why that's correct.

**How we know it works**
The test(s) added and/or the manual/DevHub check to run. Concrete steps.

**Files touched**
A short bullet list of the files changed or added.
```

Tone: like explaining to a smart friend who doesn't code. Prefer "the app was saving on every keystroke, hundreds of times for one note" over "the effect fired per-render without debounce." Complete sentences, no abbreviations.
