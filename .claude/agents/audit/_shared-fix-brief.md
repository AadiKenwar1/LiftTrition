# Shared Fix-Brief Contract (reference — not a spawnable agent)

Every domain fix-agent in this folder follows the same output contract. This file
is the canonical copy; each agent restates it. It is NOT an agent itself (no
frontmatter `name`), so it is never spawned.

## Your job

You are given one or more specific issues from `docs/PRODUCTION_READINESS_AUDIT.md`,
each tagged with your domain. For each issue, investigate the real code and produce
a **fix brief** — a concrete plan a developer could implement in one sitting.

**You do NOT write, edit, or apply code.** You produce briefs only. No diffs, no
`Edit`/`Write`. If you are tempted to output a full patch, stop and describe it instead.

## The minimal-change ethos (applies to every fix you propose)

- Smallest correct change that fully resolves the issue.
- Reuse existing helpers/primitives (`lib/utils/*`, `components/NeutralComponents/*`,
  `components/GraphComponents/*`, context hooks) before proposing anything new.
- Do NOT introduce a new abstraction, layer, or dependency **unless the issue itself
  is a de-duplication/coupling problem** where consolidation IS the fix.
- Prefer editing in place over adding files. Match surrounding conventions
  (see `CLAUDE.md`: comments, styling tokens, `getDateKey`, UUIDs, persistence).

## Output format — one Fix Brief per issue

For **Deep** and **Moderate** difficulty issues, output the full brief:

```
### <Audit ID> — <one-sentence restatement>
- **Severity:** <Critical | High | Medium | Low>   (carried from the audit)
- **Difficulty:** <Deep | Moderate | Trivial> — <few-word reason>
- **Root cause:** <1–2 sentences on why the bug exists>
- **Fix (smallest correct change):** <concretely what to change; name the helper
  you reuse; call out anything you deliberately do NOT touch>
- **Files to change:**
  - `path/to/file.ts:line` — <what changes here>
  - ... (list every file; if a test file is needed, list it)
- **Blast radius & safety:**
  - *Callers/consumers touched:* <who imports/renders/calls this; what else runs
    through the changed path>
  - *Edge cases considered:* <null/empty/offline/first-run/DST/large-dataset/
    concurrent-write — whichever apply>
  - *Why existing behavior is preserved:* <the argument that nothing else breaks>
  - *Tests to add or run:* <specific test file/name to prove the fix and guard it>
```

For **Trivial** difficulty issues, output a single line instead:

```
### <Audit ID> — <restatement> — TRIVIAL: <few-word why-easy> → <fix in a phrase> (`path:line`)
```

If a Trivial issue is Critical or High severity, prefix it with `⚠ LAUNCH-BLOCKER`
so an easy-but-mandatory fix cannot get lost.

## Difficulty rubric

- **Deep** — needs design thought: multiple call sites, shared/duplicated logic,
  concurrency, data-migration ordering, or a behavior contract to preserve.
- **Moderate** — localized but non-obvious: one file/flow, a few edge cases.
- **Trivial** — mechanical/copy/token/one-liner with no real blast radius.

Rate on *implementation thought required*, NOT on severity. They are independent.
