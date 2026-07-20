# Production-Readiness Fix Pipeline — Implementation Plan

> **SUPERSEDED (2026-07-20):** the built pipeline is simpler than this plan. The operative
> protocol is `docs/superpowers/FIX_PIPELINE_RUNBOOK.md` + `docs/superpowers/PIPELINE_MANIFEST.json`
> + the five `.claude/agents/pipeline-*.md` agents. Differences from this plan: two separate
> implementer agents (`pipeline-implementer-done`, `pipeline-implementer-fresh`) instead of one
> modal agent; `pipeline-file-review` runs the `code-simplifier` skill (it is an allowed agent
> skill, not a superpowers skill); no Jest manifest validator — the manifest was generated
> deterministically by grep and count-checked.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-paced agent pipeline that implements the 62 in-scope production-readiness fixes — one issue at a time, each implemented → reviewed (local + wide) → verified → committed — resuming across usage-limit boundaries without manual intervention.

**Architecture:** A deterministic **manifest** (safety-validated) lists the 62 live issues. A **driver runbook** walks it one issue at a time, dispatching purpose-built agents (an implementer chosen by bucket, then file_review, then wide_review) via the Agent tool, then running the verify gate and committing — all from the main session, which owns Bash/git. The driver self-schedules its next wake with `ScheduleWakeup`, so the run spans sessions on its own. Only the reconciliation logic is unit-tested (it's safety-critical); agent prompts verify by dry-run, and the whole pipeline is proven on a small pilot before the full run.

**Tech Stack:** Node (plain CJS for the validator) · Jest (jest-expo, single-run via `npm run test:ci`) · `tsc --noEmit` · Claude Code Agent tool + `.claude/agents/*.md` · `ScheduleWakeup` for cross-session pacing.

## Global Constraints

- **Scope:** exactly **62 issues**. Buckets: **DONE 36 · MERGED 6 · AUTHORED 11 · DRAFT 9**.
- **Excluded (deleted from audit — NEVER implement):** `C2, H7, H11, H12, H13`.
- **MERGED set (verbatim):** `H2, H3, H6, H10, H15, M11` (blockers: H2, H3, H15).
- **Source of truth:** `docs/PRODUCTION_READINESS_AUDIT.md` is the allow-list; `docs/PRODUCTION_READINESS_FIXES.txt` supplies briefs.
- **Version control:** local commits only — **no push, no branches, no PRs** (user-authorized for this task).
- **Verify gate:** `npm run test:ci` AND `npx tsc --noEmit` must both pass before a commit. Never commit red.
- **Live code always:** implement against the current tree, not the brief's snapshot.
- **Pipeline agents invoke NO skills:** every implementer/review agent executes its prompt directly — it must NOT invoke any superpowers skill (brainstorming, test-driven-development, systematic-debugging, writing-plans, using-superpowers, …) or any other skill, and must not spawn skill-driven sub-processes. (Dispatched subagents already ignore `using-superpowers`; this makes the ban explicit and total.)
- **Codebase conventions (`CLAUDE.md`):** one-line comment above every named function; theme tokens (no hardcoded colors/fonts/radii); `getDateKey` for date keys; `react-native-uuid` for IDs; persistence via `powerSync.execute()`/`writeTransaction()`; no `ios/`/`android/` native steps.
- **Agent models:** DONE implementer = Sonnet; judgmental (MERGED) + fresh (AUTHORED/DRAFT) implementers = Opus; file_review = Sonnet; wide_review = Opus (always runs).

---

### Task 1: Manifest safety validator (the anti-"implement-a-deleted-issue" guard)

**Files:**
- Create: `scripts/pipeline/validateManifest.js`
- Test: `scripts/pipeline/__tests__/validateManifest.test.js`

**Interfaces:**
- Produces: `validateManifest(manifest, allBriefIds, auditEntryIds) -> string[]` (array of error strings; empty = valid). `manifest` is an array of `{id, bucket, severity, briefRef, files, isCodeFixable, launchBlocker, status}`. `allBriefIds` = every issue id with a brief header in FIXES.txt. `auditEntryIds` = issue ids that still have a `### <id>.` entry header in the audit.
- Consumes: nothing (pure function).

- [ ] **Step 1: Write the failing test**

```javascript
// scripts/pipeline/__tests__/validateManifest.test.js
const { validateManifest } = require('../validateManifest');

// A minimal valid manifest: correct counts per bucket, none excluded.
function makeValidManifest() {
  const rows = [];
  const push = (id, bucket) => rows.push({
    id, bucket, severity: 'High', briefRef: 'FIXES.txt:1',
    files: ['a.ts'], isCodeFixable: true, launchBlocker: false, status: 'pending',
  });
  for (let i = 0; i < 36; i++) push(`D${i}`, 'DONE');
  ['H2', 'H3', 'H6', 'H10', 'H15', 'M11'].forEach((id) => push(id, 'MERGED'));
  for (let i = 0; i < 11; i++) push(`A${i}`, 'AUTHORED');
  for (let i = 0; i < 9; i++) push(`R${i}`, 'DRAFT');
  return rows;
}
const briefIdsFor = (manifest) => manifest.map((m) => m.id);

test('valid manifest returns no errors', () => {
  const m = makeValidManifest();
  expect(validateManifest(m, briefIdsFor(m), [])).toEqual([]);
});

test('flags an excluded issue that leaked into the manifest', () => {
  const m = makeValidManifest();
  m[0].id = 'H12';
  expect(validateManifest(m, briefIdsFor(m), []).join(' ')).toMatch(/Excluded issues present.*H12/);
});

test('flags an excluded issue that regained a live audit entry', () => {
  const m = makeValidManifest();
  expect(validateManifest(m, briefIdsFor(m), ['H7']).join(' ')).toMatch(/live audit entry.*H7/);
});

test('flags wrong total count', () => {
  const m = makeValidManifest();
  m.pop();
  expect(validateManifest(m, briefIdsFor(m), []).join(' ')).toMatch(/Expected 62/);
});

test('flags wrong bucket count', () => {
  const m = makeValidManifest();
  m[0].bucket = 'MERGED';
  expect(validateManifest(m, briefIdsFor(m), []).join(' ')).toMatch(/Bucket DONE/);
});

test('flags an entry with no files', () => {
  const m = makeValidManifest();
  m[0].files = [];
  expect(validateManifest(m, briefIdsFor(m), []).join(' ')).toMatch(/no files/);
});

test('flags a manifest id with no brief', () => {
  const m = makeValidManifest();
  const briefs = briefIdsFor(m).filter((id) => id !== m[5].id);
  expect(validateManifest(m, briefs, []).join(' ')).toMatch(/without a brief/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest scripts/pipeline/__tests__/validateManifest.test.js`
Expected: FAIL — "Cannot find module '../validateManifest'".

- [ ] **Step 3: Write minimal implementation**

```javascript
// scripts/pipeline/validateManifest.js
// Pure guard for the fix-pipeline manifest. Returns [] when safe, else error strings.
const EXCLUDED = ['C2', 'H7', 'H11', 'H12', 'H13'];
const MERGED_SET = ['H2', 'H3', 'H6', 'H10', 'H15', 'M11'];
const EXPECTED = { DONE: 36, MERGED: 6, AUTHORED: 11, DRAFT: 9 };
const TOTAL = 62;

// Validate a proposed manifest against the reconciled scope; never let a deleted issue through.
function validateManifest(manifest, allBriefIds, auditEntryIds) {
  const errors = [];
  const ids = manifest.map((m) => m.id);

  const leaked = EXCLUDED.filter((id) => ids.includes(id));
  if (leaked.length) errors.push(`Excluded issues present in manifest: ${leaked.join(', ')}`);

  const revived = EXCLUDED.filter((id) => auditEntryIds.includes(id));
  if (revived.length) errors.push(`Excluded issues regained a live audit entry (re-added?): ${revived.join(', ')}`);

  if (manifest.length !== TOTAL) errors.push(`Expected ${TOTAL} issues, got ${manifest.length}`);

  const counts = manifest.reduce((acc, m) => ((acc[m.bucket] = (acc[m.bucket] || 0) + 1), acc), {});
  for (const bucket of Object.keys(EXPECTED)) {
    if ((counts[bucket] || 0) !== EXPECTED[bucket]) {
      errors.push(`Bucket ${bucket}: expected ${EXPECTED[bucket]}, got ${counts[bucket] || 0}`);
    }
  }

  const mergedIds = manifest.filter((m) => m.bucket === 'MERGED').map((m) => m.id).sort();
  if (JSON.stringify(mergedIds) !== JSON.stringify([...MERGED_SET].sort())) {
    errors.push(`MERGED set mismatch: got ${mergedIds.join(', ') || '(none)'}`);
  }

  const missingBrief = ids.filter((id) => !allBriefIds.includes(id));
  if (missingBrief.length) errors.push(`Manifest ids without a brief: ${missingBrief.join(', ')}`);

  for (const m of manifest) {
    if (!Object.keys(EXPECTED).includes(m.bucket)) errors.push(`${m.id}: invalid bucket '${m.bucket}'`);
    if (!Array.isArray(m.files) || m.files.length === 0) errors.push(`${m.id}: no files listed`);
  }

  return errors;
}

module.exports = { validateManifest, EXCLUDED, MERGED_SET, EXPECTED, TOTAL };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest scripts/pipeline/__tests__/validateManifest.test.js`
Expected: PASS (7 passing).

- [ ] **Step 5: Commit**

```bash
git add scripts/pipeline/validateManifest.js scripts/pipeline/__tests__/validateManifest.test.js
git commit -m "feat(pipeline): add manifest safety validator"
```

---

### Task 2: Triage — produce and validate `PIPELINE_MANIFEST.json`

**Files:**
- Create: `docs/superpowers/PIPELINE_MANIFEST.json` (produced by a triage agent, then validated)
- Create: `scripts/pipeline/checkManifest.js` (CLI wrapper: reads the three files, calls the validator, exits nonzero on error)

**Interfaces:**
- Consumes: `validateManifest` from Task 1.
- Produces: `PIPELINE_MANIFEST.json` — array of `{id, bucket, severity, launchBlocker, briefRef, files, isCodeFixable, status:"pending"}`, sorted launch-blockers first then by severity (Critical→High→Medium→Low).

- [ ] **Step 1: Write the CLI wrapper**

```javascript
// scripts/pipeline/checkManifest.js
// Reads the real manifest + FIXES.txt + audit, runs the validator, prints result.
const fs = require('fs');
const path = require('path');
const { validateManifest } = require('./validateManifest');

const root = path.resolve(__dirname, '..', '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/superpowers/PIPELINE_MANIFEST.json'), 'utf8'));
const fixes = fs.readFileSync(path.join(root, 'docs/PRODUCTION_READINESS_FIXES.txt'), 'utf8');
const audit = fs.readFileSync(path.join(root, 'docs/PRODUCTION_READINESS_AUDIT.md'), 'utf8');

const allBriefIds = [...fixes.matchAll(/^([CHML][0-9]{1,2})\s+\(/gm)].map((m) => m[1]);
const auditEntryIds = [...audit.matchAll(/^#{2,3}\s+([CHML][0-9]{1,2})\./gm)].map((m) => m[1]);

const errors = validateManifest(manifest, allBriefIds, auditEntryIds);
if (errors.length) {
  console.error('MANIFEST INVALID:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}
console.log(`Manifest OK: ${manifest.length} issues (DONE/MERGED/AUTHORED/DRAFT).`);
```

- [ ] **Step 2: Dispatch the triage agent to build the manifest**

Dispatch a subagent (Sonnet, tools: Read/Grep/Glob/Write) with this brief:

> Build `docs/superpowers/PIPELINE_MANIFEST.json`. For every brief header in `docs/PRODUCTION_READINESS_FIXES.txt` (lines like `H2  (High)  [MERGED]  [LAUNCH-BLOCKER]`), emit one row EXCEPT the excluded ids `C2, H7, H11, H12, H13`. Each row: `id`, `bucket` (map `[DONE]→DONE`, `[MERGED]→MERGED`, `[AUTHORED]→AUTHORED`, `[DRAFT]→DRAFT`), `severity` (from `(Critical|High|Medium|Low)`), `launchBlocker` (true iff `[LAUNCH-BLOCKER]`), `briefRef` (`"FIXES.txt:<lineNumber>"` of the header), `files` (the paths listed under that brief's "Files to change:" section — array of repo-relative paths, no line numbers), `isCodeFixable` (false for pure ops items: any brief whose only change is a `.sql` migration, a password rotation, or `eas.json` submit config; true otherwise), `status:"pending"`. Sort launch-blockers first, then Critical→High→Medium→Low. Output ONLY the file. Do not invoke any skill.

- [ ] **Step 3: Validate the produced manifest**

Run: `node scripts/pipeline/checkManifest.js`
Expected: `Manifest OK: 62 issues ...`. If it errors, fix the manifest (or the triage prompt) and re-run until green.

- [ ] **Step 4: Human approval gate**

Print the include-list (62 ids by bucket) and the exclude-list (`C2, H7, H11, H12, H13`). **Stop and get explicit user approval of both lists before proceeding.**

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/PIPELINE_MANIFEST.json scripts/pipeline/checkManifest.js
git commit -m "feat(pipeline): reconciled work manifest (62 issues, 5 excluded)"
```

---

### Task 3: `pipeline-implementer` agent (DONE + FRESH heads)

**Files:**
- Create: `.claude/agents/pipeline-implementer.md`

**Interfaces:**
- Consumes (from the driver, per dispatch): `issueId`, `bucket`, `mode` (`DONE`|`FRESH`), the audit entry text, the brief text, and the list of target files.
- Produces: edits applied to the working tree + a short JSON summary `{issueId, filesTouched:[...], testsAdded:[...], notes}` as its final message.
- (MERGED issues are NOT handled here — they go to `pipeline-judgmental-implementer`, Task 4.)

- [ ] **Step 1: Write the agent file**

```markdown
---
name: pipeline-implementer
description: Implements one production-readiness fix from its brief against live code. DONE mode executes a fully-adjudicated brief (Sonnet); FRESH mode designs then implements from an author-only brief + the audit entry (Opus, AUTHORED/DRAFT). Writes code and the regression test the brief names.
tools: Read, Grep, Glob, Edit, Write, Bash
---

You implement exactly ONE audit issue, handed `issueId`, `bucket`, `mode`, the audit
entry, its brief, and the target files. You edit the real working tree. Do the SMALLEST
correct change that fully resolves the issue, following CLAUDE.md conventions (one-line
comment above each named function; theme tokens; getDateKey; react-native-uuid;
persistence via powerSync.execute()/writeTransaction()).

## Mode
- **DONE** — the brief is fully adjudicated. Implement it as written, verifying each
  cited `file:line` against the CURRENT code (it may have shifted). Do not redesign.
- **FRESH** — author-only brief, unreviewed (AUTHORED/DRAFT). Treat the brief as a hint
  and the AUDIT ENTRY as the spec. Design the smallest correct fix, then implement.

## Always
- Implement against CURRENT code; if the brief references code that moved or is gone,
  adapt and note it.
- Write the regression test the brief specifies (or the obvious one) in the repo's
  colocated `__tests__/` style. Reuse existing helpers before adding new ones.
- Do NOT invoke any superpowers skill or any other skill — execute this task directly.
- Do NOT run the verify gate or commit — the driver does that.
- Final message = ONLY the JSON summary `{issueId, filesTouched, testsAdded, notes}`.
```

- [ ] **Step 2: Dry-run on one trivial DONE issue (no commit)**

Pick a small DONE issue (e.g. `C4` — nutrition-entry delete confirmation). Dispatch `pipeline-implementer` with `mode:DONE`, its audit entry, and brief. Inspect `git diff`.
Expected: a minimal, on-convention edit adding a `confirmDelete` wrapper + a test; JSON summary returned. Do NOT commit — reset: `git checkout .`

- [ ] **Step 3: Commit the agent file**

```bash
git add .claude/agents/pipeline-implementer.md
git commit -m "feat(pipeline): add pipeline-implementer agent (DONE + FRESH)"
```

---

### Task 4: `pipeline-judgmental-implementer` agent (MERGED only)

**Files:**
- Create: `.claude/agents/pipeline-judgmental-implementer.md`

**Interfaces:**
- Consumes: `issueId`, the audit entry, the merged brief, and the target files.
- Produces: edits applied to the working tree + final JSON `{issueId, filesTouched:[...], testsAdded:[...], adjudication:[...], notes}`.

- [ ] **Step 1: Write the agent file**

```markdown
---
name: pipeline-judgmental-implementer
description: For MERGED issues only. Adjudicates a consolidated-but-unjudged multi-domain brief against live code (resolving before-merge findings and cross-domain conflicts), then implements the reconciled cross-file fix. Opus. Writes code.
tools: Read, Grep, Glob, Edit, Write, Bash
---

You handle ONE MERGED issue — a multi-domain brief that was consolidated but never
adjudicated. You do BOTH jobs: judge the plan, then implement it. These are the
highest-blast-radius, cross-file launch-blockers in the audit; be exhaustive.

## Phase 1 — Judge (adjudicate the merged brief)
- Read the brief's open questions, before-merge findings, and cross-domain conflicts.
  Rule on each against the CURRENT code using the rubric: correctness > safety/blast-
  radius > convention-fit > least-code > testability.
- Record each ruling in `adjudication` (finding -> ruling -> why).

## Phase 2 — Implement the reconciled fix
- Implement the adjudicated plan against live code, following CLAUDE.md conventions.
- Cross-file discipline: this codebase has duplicated logic (gap-fill walks ×4,
  triplicated provider scaffolding, drifted modal pairs). Apply the fix to EVERY
  affected copy, or state why a copy is intentionally different. Reuse existing helpers.
- Write the regression test(s) the brief names.

## Rules
- Do NOT invoke any superpowers skill or any other skill — execute this task directly.
- Do NOT run the verify gate or commit — the driver does that.
- Final message = ONLY `{issueId, filesTouched, testsAdded, adjudication, notes}`.
```

- [ ] **Step 2: Dry-run on a MERGED issue (no commit)**

Dispatch `pipeline-judgmental-implementer` on `H10` (the 30-day gap-fill walk duplicated ×4). Inspect `git diff`.
Expected: an `adjudication` log resolving the brief's open questions, plus a fix applied consistently across all affected gap-fill copies. Do NOT commit — reset: `git checkout .`

- [ ] **Step 3: Commit the agent file**

```bash
git add .claude/agents/pipeline-judgmental-implementer.md
git commit -m "feat(pipeline): add pipeline-judgmental-implementer agent (MERGED)"
```

---

### Task 5: `pipeline-file-review` agent (local correctness + inline simplify)

**Files:**
- Create: `.claude/agents/pipeline-file-review.md`

**Interfaces:**
- Consumes: `issueId`, the audit entry, and the current diff (changed files).
- Produces: edits applied directly (fixes + diff-scoped simplification) + final JSON `{issueId, changed:boolean, findings:[...], notes}`.

- [ ] **Step 1: Write the agent file**

```markdown
---
name: pipeline-file-review
description: Local-correctness review of one fix's diff — does it resolve the finding, compile, follow conventions — then a diff-scoped inline simplification pass. Edits directly. Does not run the verify gate or commit.
tools: Read, Grep, Glob, Edit, Write, Bash
---

You review the diff for ONE fix (given `issueId`, the audit entry, and the changed
files). Work in two ordered phases; NEVER let phase 2 undo phase 1.

## Phase 1 — Correctness (primary)
- Does the diff actually resolve the audit finding? Does it match CLAUDE.md conventions
  (comments, theme tokens, getDateKey, UUIDs, persistence)?
- Are the edge cases the audit/brief named handled? Fix any gaps directly.

## Phase 2 — Simplify (secondary, diff-scoped only)
- Simplify ONLY the lines this fix changed: remove redundancy, clarify names, collapse
  needless complexity — WITHOUT changing behavior. Apply simplification principles
  INLINE; do NOT invoke a skill or another agent.
- Never enlarge the fix. If simplifying would grow the diff or touch code the fix
  didn't, DON'T — keep the surface small so wide_review has less to audit.

## Rules
- Do NOT hunt cross-file blast radius — that's wide_review's job.
- Do NOT invoke any superpowers skill or any other skill — execute this task directly.
- Do NOT run `test:ci`/`tsc` or commit — the driver does.
- Final message = ONLY `{issueId, changed, findings, notes}`.
```

- [ ] **Step 2: Dry-run against a staged diff**

Re-run Task 3's dry-run to produce a diff, then dispatch `pipeline-file-review`. Inspect changes.
Expected: correctness confirmed (or fixed), only changed lines simplified, JSON returned. Reset: `git checkout .`

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/pipeline-file-review.md
git commit -m "feat(pipeline): add pipeline-file-review agent"
```

---

### Task 6: `pipeline-wide-review` agent (blast radius + architecture)

**Files:**
- Create: `.claude/agents/pipeline-wide-review.md`

**Interfaces:**
- Consumes: `issueId` and the current diff.
- Produces: edits applied directly + final JSON `{issueId, changed:boolean, findings:[...], notes}`.

- [ ] **Step 1: Write the agent file**

```markdown
---
name: pipeline-wide-review
description: Always-on blast-radius and architecture review of one fix's diff. Greps every caller, structural twin, and indirect/coupled consumer of the changed code — assuming the real risk is in a file nobody opened — and fixes what it finds. Edits directly.
tools: Read, Grep, Glob, Edit, Write, Bash
---

You audit the cross-file safety of ONE fix (given `issueId` and its diff). Assume the
real bug is in a file that has NOT been opened. This ALWAYS runs — never assume a
change is "local."

## Hunt
- **Every caller** of each symbol the diff changed (grep the repo for it).
- **Every structural twin** — duplicated/parallel copies of the changed pattern (this
  codebase has known duplication: gap-fill walks ×4, triplicated provider scaffolding,
  drifted modal pairs). A fix applied to one copy that misses the others is the top
  failure mode here — find and fix the others (or state why they're intentionally
  different).
- **Every indirect / secretly-coupled consumer** — things two hops away that run
  through the changed path (e.g. a photo scan that indirectly hits an endpoint).
- Architecture/coupling regressions: layering, shared state, contract drift.

## Rules
- Anchor every finding to real code (`path:line`). Fix what you find directly.
- Do NOT invoke any superpowers skill or any other skill — execute this task directly.
- Do NOT run `test:ci`/`tsc` or commit — the driver does.
- Final message = ONLY `{issueId, changed, findings, notes}`.
```

- [ ] **Step 2: Dry-run against a cross-file diff**

Produce a diff for a MERGED cross-file issue (re-run Task 4's `H10` dry-run), then dispatch `pipeline-wide-review`.
Expected: it independently greps out the gap-fill copies and confirms/fixes them, JSON returned. Reset: `git checkout .`

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/pipeline-wide-review.md
git commit -m "feat(pipeline): add pipeline-wide-review agent"
```

---

### Task 7: Driver runbook + single-issue end-to-end dry-run

**Files:**
- Create: `docs/superpowers/FIX_PIPELINE_RUNBOOK.md`

**Interfaces:**
- Consumes: `PIPELINE_MANIFEST.json`, the four agents, `git log`.
- Produces: the per-wake procedure the main-session loop follows, including verify, commit, needs-human handling, and `ScheduleWakeup` re-entry.

- [ ] **Step 1: Write the runbook**

````markdown
# Fix Pipeline — Driver Runbook

The main session follows this each wake. State lives in `PIPELINE_MANIFEST.json`
(`status`) + `git log` (committed ids). One issue is fully finished + committed before
the next starts. The DRIVER (this session) may use skills; the dispatched AGENTS may not.

## Per-wake procedure
1. **Pick next issue:** first manifest row with `status:"pending"` whose id is NOT
   already in `git log --oneline` (grep `fix(*/<id>):`). None left → write a run
   summary and STOP (do not reschedule).
2. **Skip ops items:** if `isCodeFixable:false`, mark `status:"skipped-ops"` and go to 1.
3. **Load context:** read the audit entry for the id and the brief at `briefRef`.
4. **Implement:**
   - bucket MERGED → dispatch `pipeline-judgmental-implementer` (opus) with
     `{issueId, audit, brief, files}`.
   - bucket DONE → dispatch `pipeline-implementer` (sonnet), `mode:DONE`.
   - bucket AUTHORED|DRAFT → dispatch `pipeline-implementer` (opus), `mode:FRESH`.
5. **file_review:** dispatch `pipeline-file-review` (sonnet) with `{issueId, audit, diff}`.
6. **wide_review:** dispatch `pipeline-wide-review` (opus) with `{issueId, diff}` — ALWAYS.
7. **Verify:** run `npm run test:ci` then `npx tsc --noEmit`.
   - Both green → step 8.
   - Red → re-dispatch the SAME implementer ONCE with the failure output to repair,
     re-verify. Still red → `git checkout .`, mark `status:"needs-human"` with the error,
     go to step 9 (do NOT commit).
8. **Commit:** `git add -A && git commit -m "fix(<bucket>/<id>): <one-line summary>"`.
   Mark `status:"done"`. (MERGED ids keep the `MERGED/` prefix for post-hoc review.)
9. **Reschedule:** call `ScheduleWakeup` (prompt = the /loop input; reason = "next fix
   pipeline issue"). Within a live window with budget remaining you MAY loop back to
   step 1 instead of sleeping; at the usage boundary, sleep (default ~1h poll) and end
   the turn. On wake, if still limited, reschedule; else resume at step 1.

## Invariants
- Never commit with a red verify gate.
- One commit per issue; a died wake loses at most the current uncommitted issue.
- Only local commits — never push/branch/PR.
- Dispatched agents invoke no skills (enforced in each agent prompt).
````

- [ ] **Step 2: End-to-end dry-run on ONE trivial issue (real commit)**

Manually execute the per-wake procedure for one small DONE issue (e.g. `C4`): implement → file_review → wide_review → `npm run test:ci` → `npx tsc --noEmit` → commit.
Expected: green verify, one `fix(DONE/C4): ...` commit, manifest row `status:"done"`. Proves the whole loop on a single issue.

- [ ] **Step 3: Commit the runbook**

```bash
git add docs/superpowers/FIX_PIPELINE_RUNBOOK.md
git commit -m "feat(pipeline): add driver runbook"
```

---

### Task 8: Pilot batch, then launch the self-paced full run

**Files:** none created; this executes the pipeline.

- [ ] **Step 1: Pilot on 2–3 more issues across buckets**

Run the per-wake procedure for one more DONE, one AUTHORED/DRAFT (FRESH, opus, `pipeline-implementer`), and one MERGED (`pipeline-judgmental-implementer`, opus). Confirm each: green verify, one clean atomic commit, correct message prefix, sensible diff, and (MERGED) a coherent `adjudication` log.
Expected: 2–3 new `fix(...)` commits; no `needs-human`. If a bucket misbehaves, fix the relevant agent prompt (Tasks 3–6) and re-pilot before scaling.

- [ ] **Step 2: Review the pilot commits with the user**

Show `git log --oneline` + the MERGED diff. **Get user sign-off that the pilot output is trustworthy before the unattended run.**

- [ ] **Step 3: Launch the full self-paced run**

Start the driver over all remaining `pending` issues (launch-blockers first, per manifest order), self-pacing via `ScheduleWakeup` across usage windows. It runs until the manifest is exhausted, then stops and reports.

- [ ] **Step 4: On completion — human review + ops checklist**

When the run reports done: review the 6 `fix(MERGED/…)` commits specifically; list any `needs-human` issues; and hand back the ops checklist (C1's `ai_usage_quota.sql` migration, H14 password rotation, `eas.json` submit config, and — if still wanted — the removed-C2 `nutrition_calories_real.sql` migration).

---

## Self-Review

**Spec coverage:** §2 reconciliation → Tasks 1–2 (validator + gate + approval). §3 manifest → Task 2. §4 agents → Tasks 3 (DONE/FRESH), 4 (judgmental/MERGED), 5 (file_review), 6 (wide_review). §5 per-issue pipeline + verify + commit → Task 7 runbook. §6 driver/cross-session → Task 7 (ScheduleWakeup). §7 invariants (live code, atomic commit, no-skills, MERGED post-hoc, deleted excluded) → Global Constraints + Tasks 3–7. §8 ops carve-out → Task 2 `isCodeFixable` + Task 8 Step 4. §9 cost/time → inherent. §10 decisions → resolved (commit auth ✓, local self-paced ✓).

**Placeholder scan:** none — validator code, agent prompts, and runbook are complete; `<one-line summary>` in commit messages is a deliberate per-issue value, not a placeholder.

**Type consistency:** review-agent summary `{issueId, changed, findings, notes}` (Tasks 5–6) and implementer summaries `{issueId, filesTouched, testsAdded, notes}` (Task 3) / `{issueId, filesTouched, testsAdded, adjudication, notes}` (Task 4) are used consistently by the runbook (Task 7). `validateManifest(manifest, allBriefIds, auditEntryIds)` matches between Task 1 (def) and Task 2 (call). Manifest row shape matches between Task 2 (producer) and Task 7 (consumer). Every agent prompt carries the no-skills rule (Global Constraints).
