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
3. **Load context:**
   - Brief: `Read docs/PRODUCTION_READINESS_FIXES.txt` offset=`briefStart`,
     limit=`briefEnd - briefStart + 1`.
   - Audit entry: grep `docs/PRODUCTION_READINESS_AUDIT.md` for `<ID>.` and read that
     section (M/L issues may be table rows, not `###` headers — pass whatever it says).
4. **Implement** — dispatch by bucket (`run_in_background:false`, wait for the result):
   - `MERGED` → **pipeline-judgmental-implementer** (judge merged brief, then implement).
   - `DONE` → **pipeline-implementer-done** (execute the vetted brief).
   - `AUTHORED` / `DRAFT` → **pipeline-implementer-fresh** (design from audit, brief as hint).
   - Prompt = issueId + bucket + audit entry + brief + "the driver runs verify & commit;
     you only edit."
5. **file_review** → dispatch **pipeline-file-review** with issueId, audit entry, and the
   `git diff` + `git status --short` (so it sees new untracked files too).
6. **wide_review** → dispatch **pipeline-wide-review** with issueId and the current diff.
   **Always runs — never skipped**, no matter how local the change looks.
7. **Verify (scripted, no agent):** `npm run test:ci` then `npx tsc --noEmit`. Judge green
   against the baseline (see below).
   - Green → step 8.
   - Red (new failure beyond baseline) → re-dispatch the SAME implementer ONCE with the
     exact failure output + "repair the root cause; do not weaken/delete tests to pass."
     Re-verify. Still red → `git add -A && git stash`, set `status:"needs-human"`, log the
     error, `git commit -m "chore(pipeline): <ID> needs-human"`, go to step 9.
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
- **Never commit red** (beyond the known baseline). Never weaken a test to pass.
- **Local commits only — never push, branch, or PR.**
- **Agents invoke no skills.** Sole exception: `pipeline-file-review` runs
  `code-simplifier`. The driver (main session) may use skills; dispatched agents may not.
- **Excluded forever:** C2, H7, H11, H12, H13 (deleted from the audit). Not in the
  manifest; never implement them even if a brief mentions them.
- **Ops steps are never executed by agents:** no deploying migrations, no password
  rotation, no `eas.json` submit config, no external dashboards. Do the code part; record
  the ops step in the run log's OPS CHECKLIST. Standing items: C1's `ai_usage_quota.sql`
  deploy, H14 `powersync_role` password rotation, `eas.json` `submit.production`.

## Known baseline failures

Recorded in **`docs/superpowers/PIPELINE_BASELINE.md`** (kept current — it has a
changelog). Verify green = nothing failing beyond that list, matching tsc errors by
file+code+symbol (not line/count). A fix that clears or shifts baseline entries updates
that file in its own commit.
