# Fix Pipeline — Driver Runbook

**This file is the single operative protocol.** On every wake, the driver (the main
Claude Code session) re-reads this file, `docs/superpowers/PIPELINE_MANIFEST.json`, and
`git log`, and continues. No other context is required — a wake after compaction or a
usage-limit reset resumes purely from these.

**Goal:** implement all 62 in-scope production-readiness fixes, one at a time, each
implement → file_review → wide_review → verify → one atomic local commit. Root-cause
fixes only — never bandaid a symptom. The run self-persists across usage-limit/session
boundaries via `ScheduleWakeup`; the user never manually resumes.

## State model (resume truth)

- `PIPELINE_MANIFEST.json` — per-issue `status`: `pending` | `done` | `needs-human`.
- `git log --oneline` — committed issues appear as `fix(<BUCKET>/<ID>): …`.
- An issue is finished **iff** its commit exists. The manifest/log updates are swept into
  that same commit, so manifest and git can never disagree by more than the in-flight issue.
- `docs/superpowers/PIPELINE_RUN_LOG.md` — one appended block per issue (notes,
  findings, discovered ops steps, failures).

## Wake procedure

1. **Recover:** `git status --short`. If the tree is dirty, a prior wake died mid-issue:
   `git add -A && git stash` (parks the partial work, preserved not deleted), then treat
   that issue as never started.
2. **Pick next issue:** first manifest row with `status:"pending"` whose id has no
   `fix(*/<ID>):` commit in `git log`. If a row is committed but still `pending`
   (crash between commit and nothing — impossible by design, but check), mark it `done`.
   **None left → finalize:** write the run summary to the run log (done count,
   needs-human list, ops checklist), call `ScheduleWakeup` with `stop:true`, report, STOP.
3. **Safety-net wakeup:** call `ScheduleWakeup` (delay 3600s, prompt = the standing
   re-entry prompt below). If this wake dies mid-issue (usage limit), the pending wakeup
   re-enters the loop when the window resets. Each new issue's call replaces the last.
4. **Load context:**
   - Brief: `Read docs/PRODUCTION_READINESS_FIXES.txt` offset=`briefStart`,
     limit=`briefEnd - briefStart + 1`.
   - Audit entry: grep `docs/PRODUCTION_READINESS_AUDIT.md` for `<ID>.` and read that
     section (M/L issues may be table rows, not `###` headers — pass whatever the audit
     says about the id).
5. **Implement** — dispatch by bucket (`run_in_background: false`, wait for each):
   - `MERGED` → **pipeline-judgmental-implementer** (judges the merged brief, then implements).
   - `DONE` → **pipeline-implementer-done** (executes the vetted brief).
   - `AUTHORED` / `DRAFT` → **pipeline-implementer-fresh** (designs from the audit entry, brief as hint).
   - Prompt = issueId + bucket + audit entry text + brief text + the reminder that the
     driver runs verify/commit.
6. **file_review** → dispatch **pipeline-file-review** with issueId, audit entry, and
   `git diff` + `git status --short` output (so it sees new untracked files too).
7. **wide_review** → dispatch **pipeline-wide-review** with issueId and the (possibly
   updated) diff. **Always runs — never skipped**, no matter how local the change looks.
8. **Verify (scripted, no agent):** `npm run test:ci` then `npx tsc --noEmit`.
   - Both green → step 9.
   - Red → re-dispatch the SAME implementer agent ONCE with the exact failure output and
     the instruction "repair the root cause of this failure — do not weaken or delete
     tests to pass." Re-verify. Still red → `git add -A && git stash`, set
     `status:"needs-human"` + log the error in the run log, commit that bookkeeping
     (`chore(pipeline): <ID> needs-human`), continue to step 10.
   - **Baseline failures:** anything listed in "Known baseline failures" below is
     pre-existing — ignore those exact failures when judging green/red.
9. **Commit:** set the manifest row `status:"done"`, append the run-log block, then
   `git add -A && git commit -m "fix(<BUCKET>/<ID>): <one-line summary>"`.
   MERGED ids keep the `MERGED/` prefix — the user post-hoc reviews those 6 commits.
10. **Loop or sleep:**
    - Session healthy → go to step 2 (full speed, no inter-issue delay).
    - Usage limit hit / API failing → `ScheduleWakeup` (3600s, standing prompt, reason
      "fix pipeline: waiting out usage window"), end the turn. On a wake that is still
      limited, reschedule 3600s and end.

## Standing re-entry prompt (verbatim, for every ScheduleWakeup)

> Continue the production-readiness fix pipeline: read docs/superpowers/FIX_PIPELINE_RUNBOOK.md and follow its Wake procedure from step 1.

## Invariants

- **Root cause only** — a fix that suppresses a symptom while the cause survives is a
  failure at every stage (implementer, both reviews, and repair bounces).
- **Never commit red** (excluding known baseline failures). Never weaken a test to pass.
- **One commit per issue** — a died wake loses at most the in-flight issue (stashed, redone).
- **Local commits only — never push, branch, or PR.**
- **Agents invoke no skills.** Sole exception: `pipeline-file-review` runs
  `code-simplifier`. The driver (main session) may use skills; dispatched agents may not.
- **Excluded forever:** C2, H7, H11, H12, H13 (deleted from the audit). Not in the
  manifest; never implement them even if a brief mentions them.
- **Ops steps are never executed by agents:** no deploying migrations, no password
  rotation, no `eas.json` submit config, no external dashboards. When a brief contains
  one, do the code part and record the ops step in the run log's OPS CHECKLIST.
  Known standing items: C1's `ai_usage_quota.sql` migration deploy, H14 `powersync_role`
  password rotation, `eas.json` `submit.production`.

## Known baseline failures

Recorded in **`docs/superpowers/PIPELINE_BASELINE.md`** (8 Jest suites / 67 tests + 27
tsc errors, snapshotted at commit `1d51d47`). Verify green = nothing failing beyond that
list. A fix that clears baseline entries updates that file in its own commit.
