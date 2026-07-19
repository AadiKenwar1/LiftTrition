/*
 * PLATES — Production-Readiness Fix Pipeline
 * ==========================================
 * Turns docs/PRODUCTION_READINESS_AUDIT.md (+ docs/PRODUCTION_READINESS_INDEX.txt)
 * into a set of adjudicated fix briefs.
 *
 * SCOPE: the 58 Deep + Moderate issues, PLUS the 9 ui-ux Trivial items (so they hit the
 * DevHub gate). The remaining 15 non-ui-ux Trivial issues keep their inline one-liners in
 * the index and are intentionally NOT run through this pipeline.
 *
 * FLOW PER ISSUE
 *   Single-agent (56): author -> review (same-domain + adversary [+ devhub gate for ui-ux]) -> adjudicate-if-findings
 *   Multi-agent  (11): authors(parallel) -> before-merge review each -> MERGE
 *                      -> after-merge review (the gate) -> adjudicate-if-findings
 *
 * Every node is a fresh, isolated subagent (no cross-issue tunnel vision). Roles:
 *   authors     = the 6 domain agents (security-cost, logic-correctness, ui-ux,
 *                 infra-reliability, performance, code-structure) in author mode
 *   reviewers   = the same 6 agents in REVIEW MODE (same-domain) + `adversary` (generic)
 *   devhub gate = `devhub` — extra reviewer on ui-ux issues; the fix must be DevHub-previewable
 *   merger      = `coordinator` (multi-agent consolidation only)
 *   judge       = `adjudicator` (independent; never rules on its own work)
 *
 * ============================================================================
 * CORRECTNESS-GATED ADJUDICATION RUBRIC  (lexicographic — a higher rule ALWAYS wins)
 *   1. CORRECTNESS (HARD GATE) — the fix must actually resolve the root cause.
 *   2. SAFETY / BLAST RADIUS   — no broken callers/consumers; behavior preserved.
 *   3. CONVENTION FIT          — reuses existing helpers; follows CLAUDE.md.
 *   4. LEAST CODE              — smallest diff; NEVER overrides rule 1 or 2.
 *   5. TESTABILITY             — pinnable with a regression test.
 * ============================================================================
 *
 * This file is authored to be RUN by the Workflow tool. It does not run itself.
 */

export const meta = {
  name: 'production-readiness-fixes',
  description: 'Author, adversarially review, merge, and adjudicate fix briefs for the 58 Deep+Moderate production-readiness audit issues',
  phases: [
    { title: 'Author',     detail: 'domain agent(s) write a fix brief per issue' },
    { title: 'Review',     detail: 'same-domain reviewer + generic adversary attack each brief' },
    { title: 'Merge',      detail: 'coordinator consolidates multi-agent briefs into one' },
    { title: 'Adjudicate', detail: 'independent judge resolves findings via the rubric' },
  ],
};

// The rubric, embedded verbatim so the merger/adjudicator prompts carry it inline.
const RUBRIC = [
  'CORRECTNESS-GATED RUBRIC (lexicographic — a higher rule ALWAYS wins):',
  '1. CORRECTNESS (HARD GATE) — the fix must actually resolve the root cause.',
  '2. SAFETY / BLAST RADIUS   — no broken callers/consumers; behavior preserved.',
  '3. CONVENTION FIT          — reuses existing helpers; follows CLAUDE.md.',
  '4. LEAST CODE              — smallest diff; NEVER overrides rule 1 or 2.',
  '5. TESTABILITY             — pinnable with a regression test.',
].join('\n');

// ---------------------------------------------------------------------------
// Scope (transcribed from docs/PRODUCTION_READINESS_INDEX.txt).
// Each agent reads the full issue text from the audit/index by ID at run time,
// so we only carry routing metadata here.
// ---------------------------------------------------------------------------

// Single-domain issues: author -> review -> adjudicate.
const SINGLE_ISSUES = [
  { id: 'C1',  severity: 'Critical', difficulty: 'Deep',     domains: ['security-cost'] },
  { id: 'C3',  severity: 'Critical', difficulty: 'Deep',     domains: ['logic-correctness'] },
  { id: 'H1',  severity: 'High',     difficulty: 'Deep',     domains: ['security-cost'] },
  { id: 'H4',  severity: 'High',     difficulty: 'Deep',     domains: ['infra-reliability'] },
  { id: 'H8',  severity: 'High',     difficulty: 'Deep',     domains: ['performance'] },
  { id: 'M2',  severity: 'Medium',   difficulty: 'Deep',     domains: ['infra-reliability'] },
  { id: 'M12', severity: 'Medium',   difficulty: 'Deep',     domains: ['performance'] },
  { id: 'M17', severity: 'Medium',   difficulty: 'Deep',     domains: ['code-structure'] },
  { id: 'H5',  severity: 'High',     difficulty: 'Moderate', domains: ['infra-reliability'] },
  { id: 'H9',  severity: 'High',     difficulty: 'Moderate', domains: ['logic-correctness'] },
  { id: 'H12', severity: 'High',     difficulty: 'Moderate', domains: ['ui-ux'] },
  { id: 'H13', severity: 'High',     difficulty: 'Moderate', domains: ['ui-ux'] },
  { id: 'M1',  severity: 'Medium',   difficulty: 'Moderate', domains: ['logic-correctness'] },
  { id: 'M3',  severity: 'Medium',   difficulty: 'Moderate', domains: ['infra-reliability'] },
  { id: 'M4',  severity: 'Medium',   difficulty: 'Moderate', domains: ['infra-reliability'] },
  { id: 'M5',  severity: 'Medium',   difficulty: 'Moderate', domains: ['infra-reliability'] },
  { id: 'M6',  severity: 'Medium',   difficulty: 'Moderate', domains: ['infra-reliability'] },
  { id: 'M7',  severity: 'Medium',   difficulty: 'Moderate', domains: ['security-cost'] },
  { id: 'M8',  severity: 'Medium',   difficulty: 'Moderate', domains: ['security-cost'] },
  { id: 'M9',  severity: 'Medium',   difficulty: 'Moderate', domains: ['performance'] },
  { id: 'M10', severity: 'Medium',   difficulty: 'Moderate', domains: ['performance'] },
  { id: 'M13', severity: 'Medium',   difficulty: 'Moderate', domains: ['performance'] },
  { id: 'M14', severity: 'Medium',   difficulty: 'Moderate', domains: ['logic-correctness'] },
  { id: 'M16', severity: 'Medium',   difficulty: 'Moderate', domains: ['code-structure'] },
  { id: 'M20', severity: 'Medium',   difficulty: 'Moderate', domains: ['code-structure'] },
  { id: 'M21', severity: 'Medium',   difficulty: 'Moderate', domains: ['code-structure'] },
  { id: 'M22', severity: 'Medium',   difficulty: 'Moderate', domains: ['code-structure'] },
  { id: 'M25', severity: 'Medium',   difficulty: 'Moderate', domains: ['ui-ux'] },
  { id: 'M26', severity: 'Medium',   difficulty: 'Moderate', domains: ['ui-ux'] },
  { id: 'M27', severity: 'Medium',   difficulty: 'Moderate', domains: ['ui-ux'] },
  { id: 'M28', severity: 'Medium',   difficulty: 'Moderate', domains: ['ui-ux'] },
  { id: 'M29', severity: 'Medium',   difficulty: 'Moderate', domains: ['ui-ux'] },
  { id: 'M30', severity: 'Medium',   difficulty: 'Moderate', domains: ['ui-ux'] },
  { id: 'M31', severity: 'Medium',   difficulty: 'Moderate', domains: ['ui-ux'] },
  { id: 'M32', severity: 'Medium',   difficulty: 'Moderate', domains: ['ui-ux'] },
  { id: 'L1',  severity: 'Low',      difficulty: 'Moderate', domains: ['logic-correctness'] },
  { id: 'L2',  severity: 'Low',      difficulty: 'Moderate', domains: ['logic-correctness'] },
  { id: 'L12', severity: 'Low',      difficulty: 'Moderate', domains: ['logic-correctness'] },
  { id: 'L13', severity: 'Low',      difficulty: 'Moderate', domains: ['logic-correctness'] },
  { id: 'L14', severity: 'Low',      difficulty: 'Moderate', domains: ['logic-correctness'] },
  { id: 'L16', severity: 'Low',      difficulty: 'Moderate', domains: ['performance'] },
  { id: 'L17', severity: 'Low',      difficulty: 'Moderate', domains: ['performance'] },
  { id: 'L18', severity: 'Low',      difficulty: 'Moderate', domains: ['performance'] },
  { id: 'L19', severity: 'Low',      difficulty: 'Moderate', domains: ['performance'] },
  { id: 'L21', severity: 'Low',      difficulty: 'Moderate', domains: ['code-structure'] },
  { id: 'L30', severity: 'Low',      difficulty: 'Moderate', domains: ['ui-ux'] },
  { id: 'L31', severity: 'Low',      difficulty: 'Moderate', domains: ['ui-ux'] },

  // ui-ux Trivial items — promoted into the pipeline so they hit the DevHub gate.
  // (non-visual ones resolve to devHubApproval='na', which the gate confirms.)
  { id: 'C4',  severity: 'Critical', difficulty: 'Trivial',  domains: ['ui-ux'] },
  { id: 'M23', severity: 'Medium',   difficulty: 'Trivial',  domains: ['ui-ux'] },
  { id: 'L23', severity: 'Low',      difficulty: 'Trivial',  domains: ['ui-ux'] },
  { id: 'L24', severity: 'Low',      difficulty: 'Trivial',  domains: ['ui-ux'] },
  { id: 'L25', severity: 'Low',      difficulty: 'Trivial',  domains: ['ui-ux'] },
  { id: 'L26', severity: 'Low',      difficulty: 'Trivial',  domains: ['ui-ux'] },
  { id: 'L27', severity: 'Low',      difficulty: 'Trivial',  domains: ['ui-ux'] },
  { id: 'L28', severity: 'Low',      difficulty: 'Trivial',  domains: ['ui-ux'] },
  { id: 'L29', severity: 'Low',      difficulty: 'Trivial',  domains: ['ui-ux'] },
];

// Multi-domain issues: authors -> before-merge review -> merge -> after-merge review -> adjudicate.
const MULTI_ISSUES = [
  { id: 'C2',  severity: 'Critical', difficulty: 'Moderate', domains: ['infra-reliability', 'logic-correctness'] },
  { id: 'H2',  severity: 'High',     difficulty: 'Deep',     domains: ['infra-reliability', 'logic-correctness', 'code-structure'] },
  { id: 'H3',  severity: 'High',     difficulty: 'Moderate', domains: ['ui-ux', 'infra-reliability', 'logic-correctness'] },
  { id: 'H6',  severity: 'High',     difficulty: 'Deep',     domains: ['performance', 'code-structure'] },
  { id: 'H7',  severity: 'High',     difficulty: 'Deep',     domains: ['performance', 'security-cost'] },
  { id: 'H10', severity: 'High',     difficulty: 'Deep',     domains: ['code-structure', 'logic-correctness'] },
  { id: 'H11', severity: 'High',     difficulty: 'Moderate', domains: ['code-structure', 'logic-correctness'] },
  { id: 'H15', severity: 'High',     difficulty: 'Deep',     domains: ['code-structure', 'ui-ux', 'logic-correctness'] },
  { id: 'M11', severity: 'Medium',   difficulty: 'Moderate', domains: ['performance', 'code-structure'] },
  { id: 'M15', severity: 'Medium',   difficulty: 'Moderate', domains: ['logic-correctness', 'code-structure'] },
  { id: 'L3',  severity: 'Low',      difficulty: 'Moderate', domains: ['infra-reliability', 'logic-correctness'] },
];

// ---------------------------------------------------------------------------
// Structured hand-offs (JSON Schemas). Each stage returns a validated object,
// so the pipeline passes clean data, never prose to be parsed.
// ---------------------------------------------------------------------------

const BRIEF = {
  type: 'object',
  additionalProperties: false,
  properties: {
    issueId:    { type: 'string' },
    severity:   { type: 'string' },
    difficulty: { type: 'string' },
    rootCause:  { type: 'string' },
    fix:        { type: 'string' },
    files: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { path: { type: 'string' }, change: { type: 'string' } },
        required: ['path', 'change'],
      },
    },
    blastRadius: {
      type: 'object',
      additionalProperties: false,
      properties: {
        callers:   { type: 'string' },
        edgeCases: { type: 'string' },
        preserved: { type: 'string' },
        tests:     { type: 'string' },
      },
      required: ['callers', 'edgeCases', 'preserved', 'tests'],
    },
    launchBlocker: { type: 'boolean' },
    // ui-ux only: DevHub preview plan + human approval status (checked by the devhub gate).
    devHubPlan: {
      type: 'object',
      additionalProperties: false,
      properties: {
        applicable: { type: 'boolean' },
        naReason:   { type: 'string' },
        components: { type: 'string' },
        testPage:   { type: 'string' },
        scenarios:  { type: 'array', items: { type: 'string' } },
        expected:   { type: 'string' },
      },
    },
    devHubApproval: { type: 'string', enum: ['pending', 'approved', 'na'] },
  },
  required: ['issueId', 'rootCause', 'fix', 'files', 'blastRadius'],
};

const FINDINGS = {
  type: 'object',
  additionalProperties: false,
  properties: {
    issueId: { type: 'string' },
    clean:   { type: 'boolean' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          claim: { type: 'string' },
          file:  { type: 'string' },
          line:  { type: 'number' },
          why:   { type: 'string' },
        },
        required: ['claim', 'file', 'why'],
      },
    },
  },
  required: ['issueId', 'clean', 'findings'],
};

const ADJUDICATION = {
  type: 'object',
  additionalProperties: false,
  properties: {
    issueId:   { type: 'string' },
    finalBrief: BRIEF,
    decisions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          finding:     { type: 'string' },
          ruling:      { type: 'string' },
          ruleApplied: { type: 'string' },
        },
        required: ['finding', 'ruling', 'ruleApplied'],
      },
    },
    escalate: { type: 'boolean' },
    note:     { type: 'string' },
  },
  required: ['issueId', 'finalBrief', 'decisions', 'escalate'],
};

// ---------------------------------------------------------------------------
// Prompt builders.
// ---------------------------------------------------------------------------

// authorPrompt: instruct a domain agent to produce a fix brief for one issue.
function authorPrompt(issue, domain) {
  const base = [
    `You are the ${domain} AUTHOR. Produce a FIX BRIEF for audit issue ${issue.id} `,
    `(severity ${issue.severity}, difficulty ${issue.difficulty}).`,
    ``,
    `Read the issue in docs/PRODUCTION_READINESS_AUDIT.md and its plain-language `,
    `restatement + file pointers in docs/PRODUCTION_READINESS_INDEX.txt (find ${issue.id}). `,
    `Investigate the ACTUAL code before writing.`,
    ``,
    `Follow your fix-brief contract (.claude/agents/_shared-fix-brief.md): smallest `,
    `correct change, reuse existing helpers, a full Blast radius & safety section, and `,
    `name the test(s) to add or run. Set launchBlocker=true if this is a launch/App-Review `,
    `blocker. Do NOT write code. Return the BRIEF as structured output.`,
  ].join('');
  if (domain !== 'ui-ux') return base;
  // ui-ux fixes must be DevHub-verifiable — the devhub gate checks this plan.
  return base + [
    ``,
    ``,
    `Because this is a ui-ux fix, also fill devHubPlan so the fix can be approved in Dev Hub `,
    `(Settings → Developer → Dev Hub): the component under test; the existing components/devTest/* `,
    `page that exercises it OR "NEW:" plus the four touchpoints to add one (components/devTest/XTest.tsx, `,
    `app/devTest/x.tsx stub, _layout.tsx Stack entry, GROUPS entry in DevHub.tsx); scenarios that MUST `,
    `include light AND dark plus the exact state the fix targets; and the expected result per scenario. `,
    `Set devHubApproval='pending'. If the fix is copy-only or navigation-only, set devHubApproval='na', `,
    `devHubPlan.applicable=false, and give a one-line devHubPlan.naReason instead.`,
  ].join('\n');
}

// reviewPrompt: instruct a same-domain agent to adversarially review a brief.
function reviewPrompt(brief, domain) {
  return [
    `REVIEW MODE (${domain} lens). Adversarially review this fix brief for issue `,
    `${brief.issueId}. Assume it is flawed. Verify against the ACTUAL code. Hunt for a `,
    `wrong/incomplete root cause, missed call sites/consumers, unhandled edge cases, `,
    `behavior regressions, hallucinated file:line refs, and a materially simpler correct `,
    `approach. Anchor EVERY finding to a real path:line + one line why. Do NOT rate `,
    `severity/confidence. Do NOT rewrite the fix. If nothing is material, return `,
    `clean=true with an empty findings array.\n\nBRIEF:\n`,
    JSON.stringify(brief, null, 2),
  ].join('');
}

// adversaryPrompt: instruct the generic adversary to attack a brief.
function adversaryPrompt(brief) {
  return [
    `REVIEW MODE (generic adversary). Attack this fix brief for issue ${brief.issueId} `,
    `from a domain-agnostic skeptic's stance — catch the breaks a same-lens reviewer `,
    `might miss. Does it fix the ROOT CAUSE? Any missed caller/consumer, edge case `,
    `(null/empty, offline/first-run, DST, concurrency, large data, reinstall), or `,
    `behavior regression? Any hallucinated file:line? A simpler correct approach? Anchor `,
    `EVERY finding to a real path:line + one line why. Do NOT rate severity/confidence. `,
    `Do NOT rewrite the fix. If nothing is material, return clean=true with empty `,
    `findings.\n\nBRIEF:\n`,
    JSON.stringify(brief, null, 2),
  ].join('');
}

// devhubPrompt: instruct the devhub gate to check a ui-ux brief's DevHub preview plan.
function devhubPrompt(brief) {
  return [
    `DEVHUB GATE. Review the devHubPlan on this ui-ux fix brief for issue ${brief.issueId}. `,
    `A ui-ux fix must be previewable in Dev Hub (Settings → Developer → Dev Hub) before it can be `,
    `approved — a brief alone is not enough for a visual/interaction change. Verify the plan against `,
    `the ACTUAL repo: does a components/devTest/* page already exercise the changed component, or does `,
    `the plan add one with ALL four touchpoints (components/devTest/XTest.tsx, app/devTest/x.tsx stub, `,
    `_layout.tsx Stack entry, GROUPS entry in DevHub.tsx)? Do the scenarios include light AND dark plus `,
    `the exact state the fix targets? If it claims N/A (non-visual), is that justified (copy/nav only)? `,
    `Raise a finding (anchored to a real path:line or the missing touchpoint) for anything missing, `,
    `inadequate, or not actually previewable. If the plan is adequate, return clean=true with empty `,
    `findings. Do NOT rate severity/confidence. Do NOT rewrite the fix.\n\nBRIEF:\n`,
    JSON.stringify(brief, null, 2),
  ].join('');
}

// mergePrompt: instruct the coordinator to consolidate domain briefs + before-merge findings.
function mergePrompt(issue, briefs, before) {
  return [
    `MERGE MODE. Consolidate these domain fix briefs for multi-agent issue ${issue.id} `,
    `into ONE unified fix brief. They are constraints on a single fix, not rival fixes. `,
    `Dedup the files list, resolve same-line conflicts, satisfy every domain's concern, `,
    `add sequencing if steps are ordered, and fold in the before-merge review findings. `,
    `Where briefs conflict, apply this rubric:\n${RUBRIC}\n`,
    `Do NOT write code. Return ONE BRIEF as structured output.\n\n`,
    `DOMAIN BRIEFS:\n`, JSON.stringify(briefs, null, 2),
    `\n\nBEFORE-MERGE FINDINGS:\n`, JSON.stringify(before, null, 2),
  ].join('');
}

// adjudicatePrompt: instruct the independent judge to resolve findings via the rubric.
function adjudicatePrompt(brief, findings, issue) {
  return [
    `ADJUDICATION MODE. You are the independent judge for issue ${issue.id}. You did NOT `,
    `write or merge this brief. Given the brief and the reviewer findings, decide the `,
    `materiality of each finding and resolve it using this rubric:\n${RUBRIC}\n`,
    `Correctness is a hard gate; least-code never overrides correctness or safety. Treat `,
    `author and reviewers symmetrically. Verify claims against the ACTUAL code. Produce the `,
    `FINAL brief (amended as needed), a decisions log (finding -> ruling -> ruleApplied), `,
    `and set escalate=true ONLY if you cannot confidently resolve. Do NOT write code.\n\n`,
    `BRIEF:\n`, JSON.stringify(brief, null, 2),
    `\n\nFINDINGS:\n`, JSON.stringify(findings, null, 2),
  ].join('');
}

// ---------------------------------------------------------------------------
// Stage helpers.
// ---------------------------------------------------------------------------

// reviewStage: run the same-domain reviewer(s) + the generic adversary on one brief,
// then combine into a single findings set. `domains` is the lens list to review under
// (one domain for a single-agent brief; all domains for a merged brief).
async function reviewStage(brief, domains, phaseName) {
  if (!brief) return { brief: null, findings: [], clean: false };
  const reviewers = domains.map((d) => () =>
    agent(reviewPrompt(brief, d), {
      agentType: d, label: `review:${brief.issueId}:${d}`, phase: phaseName, schema: FINDINGS,
    }),
  );
  reviewers.push(() =>
    agent(adversaryPrompt(brief), {
      agentType: 'adversary', label: `review:${brief.issueId}:adversary`, phase: phaseName, schema: FINDINGS,
    }),
  );
  // DevHub gate: a ui-ux fix must be previewable in Dev Hub before it can be approved.
  if (domains.includes('ui-ux')) {
    reviewers.push(() =>
      agent(devhubPrompt(brief), {
        agentType: 'devhub', label: `devhub:${brief.issueId}`, phase: phaseName, schema: FINDINGS,
      }),
    );
  }
  const results = (await parallel(reviewers)).filter(Boolean);
  const findings = results.flatMap((r) => r.findings || []);
  const clean = results.length > 0 && results.every((r) => r.clean) && findings.length === 0;
  return { brief, findings, clean };
}

// finalize: accept a clean brief as-is, else send it to the independent adjudicator.
async function finalize(bundle, issue) {
  if (!bundle || !bundle.brief) return null;
  if (bundle.clean) {
    return { issueId: issue.id, final: bundle.brief, adjudicated: false, findings: [], decisions: [], escalate: false };
  }
  const adj = await agent(adjudicatePrompt(bundle.brief, bundle.findings, issue), {
    agentType: 'adjudicator', label: `adjudicate:${issue.id}`, phase: 'Adjudicate', schema: ADJUDICATION,
  });
  if (!adj) {
    // Judge died — surface the brief + findings unresolved and flag for human review.
    return { issueId: issue.id, final: bundle.brief, adjudicated: false, findings: bundle.findings, decisions: [], escalate: true };
  }
  return { issueId: issue.id, final: adj.finalBrief, adjudicated: true, findings: bundle.findings, decisions: adj.decisions, escalate: adj.escalate };
}

// ---------------------------------------------------------------------------
// Pipelines.
// ---------------------------------------------------------------------------

log(`Scope: ${SINGLE_ISSUES.length} single-agent + ${MULTI_ISSUES.length} multi-agent = ${SINGLE_ISSUES.length + MULTI_ISSUES.length} issues.`);

// Path A — single-agent: author -> review -> adjudicate-if-findings.
const runSingle = () =>
  pipeline(
    SINGLE_ISSUES,
    (issue) =>
      agent(authorPrompt(issue, issue.domains[0]), {
        agentType: issue.domains[0], label: `author:${issue.id}`, phase: 'Author', schema: BRIEF,
      }),
    (brief, issue) => reviewStage(brief, [issue.domains[0]], 'Review'),
    (bundle, issue) => finalize(bundle, issue),
  );

// Path B — multi-agent: authors -> before-merge review -> merge -> after-merge review -> adjudicate.
const runMulti = () =>
  pipeline(
    MULTI_ISSUES,
    // 1. Authors (parallel); briefs align to issue.domains order.
    async (issue) => {
      const briefs = await parallel(
        issue.domains.map((d) => () =>
          agent(authorPrompt(issue, d), {
            agentType: d, label: `author:${issue.id}:${d}`, phase: 'Author', schema: BRIEF,
          }),
        ),
      );
      return briefs; // may contain nulls if an author died; kept aligned to domains
    },
    // 2. Before-merge review: each domain brief reviewed by its own lens + adversary.
    async (briefs, issue) => {
      const before = await Promise.all(
        briefs.map((b, i) => reviewStage(b, [issue.domains[i]], 'Review')),
      );
      return { briefs: briefs.filter(Boolean), before };
    },
    // 3. Merge into one consolidated brief, folding in before-merge findings.
    (obj, issue) =>
      agent(mergePrompt(issue, obj.briefs, obj.before), {
        agentType: 'coordinator', label: `merge:${issue.id}`, phase: 'Merge', schema: BRIEF,
      }),
    // 4. After-merge review (the gate): attack the merged brief under all domain lenses.
    (merged, issue) => reviewStage(merged, issue.domains, 'Review'),
    // 5. Adjudicate-if-findings.
    (bundle, issue) => finalize(bundle, issue),
  );

const [single, multi] = await Promise.all([runSingle(), runMulti()]);

const results = { single: single.filter(Boolean), multi: multi.filter(Boolean) };
const escalated = [...results.single, ...results.multi].filter((r) => r.escalate).map((r) => r.issueId);
log(`Done. ${results.single.length} single + ${results.multi.length} multi finalized. Escalated for human review: ${escalated.length ? escalated.join(', ') : 'none'}.`);

return results;
