# Fix Pipeline — Driver Runbook

**This file is the single operative protocol.** On every wake, the driver (the main
Claude Code session) re-reads this file, `docs/superpowers/PIPELINE_MANIFEST.json`, and
`git log`, and continues. No other context is required — a wake after compaction or a
usage-limit reset resumes purely from these.

**Goal:** implement all 62 in-scope production-readiness fixes, one at a time, each
implement → file_review → wide_review → verify → one atomic local commit. Root-cause
fixes only — never bandaid a symptom. The run self-persists across usage-limit/session
boundaries; the user never manually resumes.

## How continuation works (READ THIS — the model changed)

**Run the loop inline. No `ScheduleWakeup`.** The driver processes issues back-to-back in
one continuous run: finish an issue (implement → review → verify → **commit**), then loop
straight to the next pending issue. Keep going until the manifest is exhausted.

> recover → pick issue → implement → review → verify → **commit** → loop to next issue → … → done

Each issue is committed **before** the next one starts, so an interruption (usage limit,
compaction) costs at most the one in-flight uncommitted issue. State lives entirely in
`git log` + the manifest `status`, never in conversation context — so a resume (even after
compaction or a limit reset) just re-reads this file, the manifest, and `git log`, and
continues from the first pending issue with no commit. **Do not schedule a wakeup**; if a
hard limit stops the run, the user re-prompts and the loop picks up from git state.

## State model (resume truth)

- `PIPELINE_MANIFEST.json` — per-issue `status`: `pending` | `done` | `needs-human`.
- `git log --oneline` — committed issues appear as `fix(<BUCKET>/<ID>): …`.
- An issue is finished **iff** its commit exists (manifest + log update ride in that commit).
- `docs/superpowers/PIPELINE_RUN_LOG.md` — one appended block per issue (summary,
  findings, discovered ops steps, failures).

## Loop procedure (repeat per issue until the manifest is exhausted)

1. **Recover:** `git status --short`. If dirty, a prior wake died mid-issue:
   `git add -A && git stash` (parks partial work — preserved, not deleted), then treat
   that issue as never started.
2. **Pick next issue:** first manifest row with `status:"pending"` whose id has no
   `fix(*/<ID>):` commit in `git log --oneline`.
   **None left → finalize:** write the run summary to the run log (done count,
   needs-human list, ops checklist), report, STOP.
3. **Load context + SCOPE GATE (the audit is the sole authority):**
   - Audit entry: grep `docs/PRODUCTION_READINESS_AUDIT.md` for this issue's CONTENT — its
     target file path(s) + symptom keywords. Criticals/Highs are `### C#/H#` sections;
     **Medium/Low items are prose bullets with NO id number** — match by file + symptom,
     never by `<ID>` (there is no "M3." in the audit to grep for).
   - **GATE:** if nothing in the audit is a live line-item for this issue (no Critical/High
     `###` section, no 🟡 Medium / ⚪ Low bullet — or its only trace is a "What checked out
     clean" mention or a Go/No-Go verdict aside), it is OUT OF SCOPE. Do NOT dispatch an
     implementer. Set the manifest row `status:"excluded"` + a `"note"`, add the id to the
     `excluded` array, append a one-line run-log block, and
     `git commit -m "chore(pipeline): <ID> excluded (not in audit)"`, then loop to step 2.
     (This is exactly how M1/M2/M23 should have been handled.)
   - Brief (only once the GATE passes): `Read docs/PRODUCTION_READINESS_FIXES.txt`
     offset=`briefStart`, limit=`briefEnd - briefStart + 1`.
4. **Implement** — dispatch by bucket (`run_in_background:false`, wait for the result):
   - `MERGED` → **pipeline-judgmental-implementer** (judge merged brief, then implement).
   - `DONE` → **pipeline-implementer-done** (execute the vetted brief).
   - `AUTHORED` / `DRAFT` → **pipeline-implementer-fresh** (design from audit, brief as hint).
   - Prompt = issueId + bucket + audit entry + brief + CURRENT baseline + "the driver runs
     verify & commit; you only edit." **State the symptom and the claim to verify — never
     assert the diagnosis** ("X is a bug, fix it"). Tell the agent to reproduce any claimed
     failure first and to change nothing (report "premise stale") if it is already green.
   - **Belt-and-suspenders scope check:** if the implementer returns `"inAudit": false` (its
     own STEP 0 gate fired despite the step-3 GATE), treat the issue as OUT OF SCOPE exactly
     as step 3 — mark it `excluded` + `note`, commit the manifest/run-log update, and loop;
     do NOT re-dispatch and do NOT keep any edits.
5. **file_review** → dispatch **pipeline-file-review** with issueId, audit entry, and the
   `git diff` + `git status --short` (so it sees new untracked files too).
6. **wide_review** → dispatch **pipeline-wide-review** with issueId and the current diff.
   **Always runs — never skipped**, no matter how local the change looks.
7. **Verify (scripted, no agent) — tsc is the gate, jest is a tripwire:**
   - **`npx tsc --noEmit` — HARD GATE.** Any tsc error beyond the baseline (matched by
     file+code+symbol) must be fixed before commit. tsc red = stop.
   - **`npm run test:ci` (jest) — ADVISORY tripwire, not a correctness oracle.** The suite is
     uneven: a green run does not prove correctness, and a red test is not an automatic block.
     Compare to the baseline's known-red list:
     - Was-green-now-red = a real signal → investigate. If the fix broke real behavior, repair
       it. If the fix correctly changed behavior that a brittle test pinned (e.g. an exact
       alert string), fix the TEST and record why in the run-log block.
     - Still-red on the known-red list = pre-existing, not this issue's problem.
   - Correctness rides on the brief + the two reviews, never on a green checkmark.
   - If a tsc error (or a genuine behavior regression) survives ONE repair re-dispatch of the
     SAME implementer (given the exact output + "repair the root cause; never weaken a test to
     hide a regression"), then `git add -A && git stash`, set `status:"needs-human"`, log it,
     `git commit -m "chore(pipeline): <ID> needs-human"`, and loop (step 9).
8. **Commit:** set manifest row `status:"done"` AND add a `"summary"` field to that row —
   1–2 sentences stating what was fixed and why it mattered (the user's at-a-glance
   ledger; concrete, no agent/process narration). Append the run-log block, then
   `git add -A && git commit -m "fix(<BUCKET>/<ID>): <one-line summary>"`. MERGED ids keep
   the `MERGED/` prefix — the user post-hoc reviews those 6 commits.
9. **Loop:** go straight back to step 2 for the next pending issue. Do not pause, do not
   schedule anything. Continue until step 2 finds no pending issue and finalizes.

## Resume prompt (if a hard limit or compaction interrupts the run)

> Continue the production-readiness fix pipeline: read docs/superpowers/FIX_PIPELINE_RUNBOOK.md and follow its Loop procedure from step 1.

## Invariants

- **Each issue committed before the next starts.** The loop runs inline, back-to-back —
  no `ScheduleWakeup`, no per-issue pause.
- **Root cause only** — a fix that suppresses a symptom while the cause survives fails at
  every stage (implementer, both reviews, and repair bounces).
- **Reproduce before fixing.** Every agent confirms a claimed failure is real before
  editing; a claim that does not reproduce means the baseline is stale, not that code needs
  changing. The driver never asserts a diagnosis in a dispatch prompt.
- **tsc is the gate; jest is a tripwire.** Never commit a NEW tsc error or a genuine
  behavior regression beyond baseline. Never weaken or delete a test to hide a regression —
  but a genuinely wrong/brittle test may be corrected, with the reason logged.
- **Local commits only — never push, branch, or PR.**
- **Agents invoke no skills.** Sole exception: `pipeline-file-review` runs the `simplify`
  skill. The driver (main session) may use skills; dispatched agents may not.
- **The audit is the SOLE scope authority — grep it before every issue.** Both the driver
  (step 3 GATE) and the implementer agent (its STEP 0 gate) independently confirm the issue
  is a live line-item in `docs/PRODUCTION_READINESS_AUDIT.md` before ANY code changes. No
  audit home → mark `status:"excluded"`, commit, skip. A brief existing is NOT scope — the
  brief set was written from an older, larger finding list that the user has since trimmed;
  only the current audit counts.
- **Excluded forever:** C2, H7, H11, H12, H13 (deleted from the audit pre-implementation),
  plus M1, M2, M23 (implemented then ROLLED BACK 2026-07-20 — no audit line-item; M23's
  '5.0' rating is a REAL earned App Store rating and was restored). Never implement any of
  them even if a brief mentions them.
- **Ops steps are never executed by agents:** no deploying migrations, no password
  rotation, no `eas.json` submit config, no external dashboards. Do the code part; record
  the ops step in the run log's OPS CHECKLIST. Standing items: C1's `ai_usage_quota.sql`
  deploy, H14 `powersync_role` password rotation, `eas.json` `submit.production`.

## Known baseline failures

Recorded in **`docs/superpowers/PIPELINE_BASELINE.md`** (kept current — it has a
changelog). tsc green = no error beyond that list, matched by file+code+symbol (not
line/count). The jest known-red list is advisory context — it lets the driver tell a NEW
red test (investigate) from a pre-existing one (ignore). A fix that clears or shifts
baseline entries updates that file in its own commit.
