# Fix Pipeline — Driver Runbook

**This file is the single operative protocol.** On every wake, the driver (the main
Claude Code session) re-reads this file, `docs/superpowers/PIPELINE_MANIFEST.json`, and
`git log`, and continues. No other context is required — a wake after compaction or a
usage-limit reset resumes purely from these.

**Goal:** implement all 62 in-scope production-readiness fixes, one at a time, each
implement → file_review → wide_review → verify → one atomic local commit. Root-cause
fixes only — never bandaid a symptom. The run self-persists across usage-limit/session
boundaries; the user never manually resumes.

## How self-continuation works (READ THIS — it's easy to get wrong)

`ScheduleWakeup` **ends the turn immediately** — nothing after it runs. Therefore it is
the **LAST action of every turn**, called only *after* the current issue is committed.
The cadence is **one issue per turn**:

> recover → pick issue → implement → review → verify → commit → **ScheduleWakeup → turn ends**
> …the scheduled wake fires the next turn, which does the next issue.

Do **not** schedule at the start of a turn (that ends the turn before any work). Do
**not** try to "keep working after scheduling" — you can't. One issue, then schedule.

State lives entirely in `git log` + the manifest `status`, never in conversation
context — so each turn is independent and a compaction/limit costs nothing but the one
in-flight (uncommitted) issue. Keeping to one issue per turn also keeps driver context
lean (only that issue's agent summaries), which is what makes the run survivable.

## State model (resume truth)

- `PIPELINE_MANIFEST.json` — per-issue `status`: `pending` | `done` | `needs-human`.
- `git log --oneline` — committed issues appear as `fix(<BUCKET>/<ID>): …`.
- An issue is finished **iff** its commit exists (manifest + log update ride in that commit).
- `docs/superpowers/PIPELINE_RUN_LOG.md` — one appended block per issue (summary,
  findings, discovered ops steps, failures).

## Wake procedure (one issue, then schedule)

1. **Recover:** `git status --short`. If dirty, a prior wake died mid-issue:
   `git add -A && git stash` (parks partial work — preserved, not deleted), then treat
   that issue as never started.
2. **Pick next issue:** first manifest row with `status:"pending"` whose id has no
   `fix(*/<ID>):` commit in `git log --oneline`.
   **None left → finalize:** write the run summary to the run log (done count,
   needs-human list, ops checklist), call `ScheduleWakeup` with `stop:true`, report, STOP.
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
9. **Schedule the next turn (LAST action — ends the turn):**
   `ScheduleWakeup(delaySeconds:60, prompt:<standing prompt below>, reason:"fix pipeline: next issue")`.
   60s gives near-continuous cadence while guaranteeing a pending wake between turns. At a
   usage limit the fired wake simply can't proceed and reschedules; when the window resets
   it continues. **Do nothing after this call.**

## Standing re-entry prompt (verbatim, for every ScheduleWakeup)

> Continue the production-readiness fix pipeline: read docs/superpowers/FIX_PIPELINE_RUNBOOK.md and follow its Wake procedure from step 1.

## Invariants

- **One issue per turn**, committed before the next starts. `ScheduleWakeup` is the last
  action, never the first.
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
