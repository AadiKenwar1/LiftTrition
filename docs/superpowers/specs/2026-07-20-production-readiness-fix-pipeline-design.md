# Production-Readiness Fix Pipeline — Design Spec

**Date:** 2026-07-20
**Status:** Draft for review (not committed)
**Goal:** Implement the fixes for the audited production-readiness issues by driving each brief through a bucket-routed, review-gated agent pipeline that self-continues across usage-limit / session boundaries without manual resume.

---

## 1. Overview

We have two artifacts already produced by an earlier (report-only) audit + brief pipeline:

- **`docs/PRODUCTION_READINESS_AUDIT.md`** — the findings, now the **source of truth** for *what to fix*. Some issue entries were deleted after briefs were written; deleted issues must NOT be implemented.
- **`docs/PRODUCTION_READINESS_FIXES.txt`** — 67 compiled fix briefs, tagged by maturity: `DONE` (adjudicated), `MERGED` (multi-agent consolidated, not adjudicated), `AUTHORED` (fresh author-only brief), `DRAFT` (author-only, carried over).

This spec covers the **implementation** phase only: turning briefs into committed, verified diffs. The planning/brief phase is complete and is not re-run.

Core principles:
- **Brief-driven** — reuse the banked briefs; don't re-derive plans.
- **Route by brief maturity** — the more vetted the plan, the lighter the implementer head.
- **Always review wide** — every fix gets a blast-radius/architecture pass; nothing is assumed local.
- **Atomic per issue** — implement → review → verify → commit, one issue at a time, so a session limit costs at most one issue.
- **Self-continuing** — a driver loop bridges usage-limit boundaries automatically.

---

## 2. Source-of-truth reconciliation (deleted issues)

The audit was edited after briefs were written. **The current audit is the allow-list.** Any brief whose issue *entry* was deleted from the audit is excluded from implementation.

**Deleted issues (confirmed via `git diff HEAD -- docs/PRODUCTION_READINESS_AUDIT.md`):**

| ID | Was | Reason to exclude |
|----|-----|-------------------|
| C2 | MERGED | entry deleted from audit |
| H7 | MERGED | entry deleted from audit |
| H11 | MERGED | entry deleted from audit |
| H12 | DONE | entry deleted from audit |
| H13 | DONE | entry deleted from audit |

> Note: C2/H7/H12/H13 still appear as *inline cross-references* in the audit's action lists, so reconciliation must key on **live issue entries**, not mere ID mentions. H11 is fully absent.

**Reconciled counts to implement:**

| Bucket | Original | Deleted | To implement |
|--------|---------:|--------:|-------------:|
| DONE | 38 | H12, H13 | **36** |
| MERGED | 9 | C2, H7, H11 | **6** (H2, H3, H6, H10, H15, M11) |
| AUTHORED | 11 | — | **11** |
| DRAFT | 9 | — | **9** |
| **Total** | **67** | **5** | **62** |

Reconciliation is a **hard gate** in Phase 0: triage emits the proposed include-list (62) and exclude-list (5); **the user approves the exclude-list before any implementation runs.** No prior code exists for the deleted issues (no implementation has run yet); triage double-checks that git history contains no commits for excluded IDs.

---

## 3. Phase 0 — Triage & manifest (one pass)

A single **triage agent (Sonnet)** builds the work manifest before the loop spends anything.

Inputs: current `PRODUCTION_READINESS_AUDIT.md` + `PRODUCTION_READINESS_FIXES.txt`.

Output: `docs/superpowers/PIPELINE_MANIFEST.json` — one row per live issue:

```jsonc
{
  "id": "H2",
  "bucket": "MERGED",              // DONE | MERGED | AUTHORED | DRAFT
  "severity": "High",
  "launchBlocker": true,
  "briefRef": "FIXES.txt:202",     // line anchor to the brief
  "files": ["lib/powersync/Connector.ts", "..."],  // from the brief
  "isCodeFixable": true,           // false => ops checklist, not agent work
  "status": "pending"              // pending | done | needs-human | skipped
}
```

Triage also:
- **Sorts** launch-blockers first, then by severity.
- **Splits out ops items** (`isCodeFixable: false`) — see §8.
- **Excludes** the 5 deleted issues and logs them.
- Is **reviewable**: the user sees the manifest (order, buckets, exclude-list, ops carve-out) and approves before the run.

---

## 4. Agents

Three roles; the implementer has three interchangeable heads selected by bucket.

| Agent | Model | Job |
|-------|-------|-----|
| **DONE implementer** | Sonnet | Execute a fully-vetted brief against live code + write the regression test it names. |
| **judgemental_implementary** (MERGED) | Opus | Adjudicate the unmerged/unjudged brief (rule on before-merge findings & cross-domain conflicts), then implement. |
| **generative implementer** (AUTHORED/DRAFT) | Opus | No vetted plan exists → design the fix from the audit entry + author-only brief as a hint, then implement. |
| **file_review** | Sonnet | Local pass on the diff: correctness, matches the finding, follows `CLAUDE.md` conventions; then apply **diff-scoped simplification inline** (no skill invocation). **Correctness first, simplify second, never enlarge the fix.** May edit directly. |
| **wide_review** | Opus | **Always runs.** Blast radius + architecture/coupling: grep every caller of changed symbols, every structural twin, every indirect/coupled consumer — assume the real risk is in an unopened file. May edit directly. |

The verify gate (§5) is the independent check on file_review's and wide_review's own edits.

---

## 5. Per-issue pipeline (the unit of work)

```
implement (head by bucket)
   → file_review (Sonnet, inline simplify)
   → wide_review (Opus, always)
   → verify: npm run test:ci && tsc --noEmit
   → commit (one atomic commit per issue)
```

**Implementer inputs by bucket:**
- **DONE** — brief is trusted; implement as written against live code.
- **MERGED** — judge the brief first (resolve its open findings/conflicts), then implement.
- **AUTHORED / DRAFT** — treat the brief as a draft hint; the audit entry is the spec; design + implement.

**Verify handling:** green → commit. Red → **one** repair bounce back to the implementer with the failure output; still red → mark `needs-human`, **do not commit**, advance to the next issue.

**Commit:** one commit per issue, ID-tagged, e.g. `fix(H2): dead-letter all permanent Connector errors + user_exercises conflict`. MERGED commits carry a distinct prefix — `fix(MERGED/H2): …` — for post-hoc review (§7). The commit is the durable resume checkpoint.

**Routing table (reconciled):**

| Bucket | Count | Implementer head | Reviews (always) |
|--------|------:|------------------|------------------|
| DONE | 36 | Sonnet | file_review + wide_review |
| MERGED | 6 | Opus (judge+implement) | file_review + wide_review |
| AUTHORED | 11 | Opus | file_review + wide_review |
| DRAFT | 9 | Opus | file_review + wide_review |

---

## 6. Driver loop & cross-session behavior

The pipeline does **not** run as one monolithic Workflow (that is what previously exhausted a session and required manual resume). A **self-paced driver** runs it:

1. **Wake** → read `git log` + manifest `status` → pick the next `pending` issue.
2. **Run** that issue's full per-issue pipeline (§5) → commit → mark `done` in the manifest.
3. **Continue back-to-back** through issues **at full speed within the current usage window** — *no inter-issue buffer.*
4. **At the usage-limit / session boundary** (or if the window is nearly spent): finish + commit the current issue, then **schedule a resume** and end the turn.
5. **Resume:** because wakeups cap at ~1h, the driver wakes at that interval and checks whether it can proceed; if still limited, it reschedules; once the window has reset, it continues at full speed.
6. **Manifest exhausted** → stop, write a run summary, notify.

**Buffer model (per user intent):** the only pause is the **session-boundary handoff** — not a delay between issues. The job runs as fast as the limit allows within a window and bridges to the next window on its own, so no manual resume is needed. Resume interval is a tunable (default: max ~1h poll until the window resets).

**Resume correctness:** the manifest `status` + committed issue IDs in `git log` are the single source of progress; a died/interrupted wake loses at most the one in-flight (uncommitted) issue, which is simply re-attempted.

**Scheduler mechanism (OPEN — see §10):** local self-paced (recommended) vs. cloud cron routine.

---

## 7. Invariants & carve-outs

- **Live code always** — every fix is implemented against the current tree, not the brief's snapshot; wide_review catches any brief gone stale from an earlier fix touching the same file.
- **Atomic commit per issue** — the resumability backbone. **Requires explicit user authorization** to make local commits (see §10); no branches, no pushes, no PRs.
- **Pipeline agents invoke no skills** — the implementer/review agents execute their prompt directly; they never invoke a superpowers skill (brainstorming, TDD, systematic-debugging, writing-plans, …) or any other skill, and never spawn skill-driven sub-processes. Keeps each agent bounded, predictable, and cheap. (Dispatched subagents already ignore `using-superpowers`; this makes the ban explicit and total.)
- **Deleted issues excluded** — the 5 removed entries are never implemented (§2).
- **MERGED reviewed post-hoc, non-blocking** — since the run is unattended, MERGED (6 issues, incl. launch-blockers H2/H3/H15) commit autonomously, backstopped by judge + both reviews + verify, under the `fix(MERGED/…)` prefix. The user reviews just those 6 commits afterward; atomic commits make reverting any one trivial.
- **Ops items never touched by agents** (§8).

---

## 8. Out of scope (human ops checklist)

The pipeline never runs these; triage flags them, the run does not claim them shipped:

- **C1 migration** — deploy `lib/supabase/migrations/ai_usage_quota.sql` with the release (C1's code fix *is* in scope; deploying its migration is not).
- **H14** — rotate the `powersync_role` `BYPASSRLS` password in the deployed DB.
- **`eas.json`** — populate `submit.production`.
- **Deleted C2 migration** — you removed C2 from the audit; if `nutrition_calories_real.sql` still needs to run at release, keep it on your own deploy list (the pipeline will not touch it).

---

## 9. Cost & time expectations

- **~187 agent-runs** total: 62 issues × 3 agents (implement + file_review + wide_review) + 1 triage.
- **Opus-heavy:** ~62 wide_review (Opus) + ~26 Opus implementers (MERGED 6 + AUTHORED 11 + DRAFT 9) ≈ **~88 Opus runs**; the rest Sonnet.
- **Wall-clock: on the order of days**, running in the background across usage windows — accepted. `test:ci` + `tsc` run per issue (scripted, no model cost).

---

## 10. Open decisions (confirm before running)

1. **Commit authorization.** The resumability model is *one local commit per issue*. This reverses the standing "user owns version control" rule for this task only (local commits; no push/branch/PR). **Confirm.**
2. **Scheduler mechanism.**
   - *Local self-paced* (recommended) — auto-continues while Claude Code is open on this machine; sees the local working tree directly. No babysitting; app must be running.
   - *Cloud cron routine* (fully unattended, app closed) — runs on a schedule in the cloud, but requires pushing the repo to a remote so the cloud agent can clone/commit/push — a harder break from the version-control rule.
3. **Resume poll interval** — default max ~1h until the window resets; adjust if desired.

---

## Appendix — MERGED issues to implement (the heavy tier)

| ID | Launch-blocker | Summary |
|----|:--:|---------|
| H2 | ✅ | Connector poison-row handling wrong both directions (+ `user_exercises` conflict, + collapse duplicated branches) |
| H3 | ✅ | First-sync hang — timeout + retry + sign-out escape |
| H6 |  | Unmemoized provider values + zero `React.memo` |
| H10 |  | 30-day gap-fill walk duplicated ×4 with divergent bugs |
| H15 | ✅ | Drifted modal pairs; hardening applied one side only |
| M11 |  | (per brief — verify: authored while safety classifier was down) |
