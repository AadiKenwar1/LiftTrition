/*
 * PLATES — Production-Readiness Fixes, LEAN v2 (gap-filler) + Phase 3
 * ==================================================================
 * Finishes the gaps left by run wf_11107680-9e8, reusing banked work.
 * ALL AGENTS RUN ON SONNET (the heavy Deep authoring already happened on Opus
 * and is banked; what remains — trivial authoring, merging existing drafts,
 * judging existing findings — is squarely in Sonnet's range and finishes fast).
 *
 *   Phase 1  Author gaps        : 1 batched ui-ux (9 trivial) + L3 + M15  = 3
 *   Phase 2  Merge banked drafts: C2,H2,H3,H6,H7,H10,H11,H15,M11          = 9
 *   Phase 3  Adjudicate reviewed: 35 judges over banked brief+findings    = 35
 *                                                                    total = 47
 *
 * The 9 Low single-agent drafts (L13,L14,L16-L19,L21,L30,L31) stay as usable
 * drafts and are NOT run here.
 *
 * RUBRIC: correctness(gate) > safety > convention-fit > least-code > testability
 */

export const meta = {
  name: 'production-readiness-fixes-v2',
  description: 'Lean gap-filler on Sonnet: author 11 TODOs, merge 9 multi-agent drafts, adjudicate 35 reviewed',
  model: 'sonnet',
  phases: [
    { title: 'Author gaps',         detail: 'batched ui-ux trivial + L3/M15 authors', model: 'sonnet' },
    { title: 'Merge banked drafts', detail: 'consolidate the 9 multi-agent domain drafts', model: 'sonnet' },
    { title: 'Adjudicate reviewed', detail: 'judge the 35 reviewed briefs against their findings', model: 'sonnet' },
  ],
};

const SCRATCH = 'C:/Users/aadik/AppData/Local/Temp/claude/c--Users-aadik-Downloads-App/08b1a79c-e035-4530-bfd1-e7241a960e0b/scratchpad';
const BANKED_DIR = `${SCRATCH}/banked`;
const REVIEWED_DIR = `${SCRATCH}/reviewed`;
const M = 'sonnet';

const TRIVIAL_UIUX = ['C4','M23','L23','L24','L25','L26','L27','L28','L29'];
const MULTI_TODO = [
  { id: 'L3',  domains: ['infra-reliability','logic-correctness'] },
  { id: 'M15', domains: ['logic-correctness','code-structure'] },
];
const MULTI_DRAFTS = [
  { id: 'C2',  uiux: false }, { id: 'H2', uiux: false }, { id: 'H3', uiux: true },
  { id: 'H6',  uiux: false }, { id: 'H7', uiux: false }, { id: 'H10', uiux: false },
  { id: 'H11', uiux: false }, { id: 'H15', uiux: true }, { id: 'M11', uiux: false },
];
const REVIEWED = ['H4','H5','H8','H9','H12','H13','M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M12','M13','M14','M16','M17','M20','M21','M22','M25','M26','M27','M28','M29','M30','M31','M32','L1','L2','L12'];

const BRIEF = {
  type: 'object', additionalProperties: false,
  properties: {
    issueId: { type: 'string' }, severity: { type: 'string' }, difficulty: { type: 'string' },
    rootCause: { type: 'string' }, fix: { type: 'string' },
    files: { type: 'array', items: { type: 'object', additionalProperties: false,
      properties: { path: { type: 'string' }, change: { type: 'string' } }, required: ['path','change'] } },
    blastRadius: { type: 'object', additionalProperties: false,
      properties: { callers: { type: 'string' }, edgeCases: { type: 'string' }, preserved: { type: 'string' }, tests: { type: 'string' } },
      required: ['callers','edgeCases','preserved','tests'] },
    launchBlocker: { type: 'boolean' },
    devHubPlan: { type: 'object', additionalProperties: false,
      properties: { applicable: { type: 'boolean' }, naReason: { type: 'string' }, components: { type: 'string' },
        testPage: { type: 'string' }, scenarios: { type: 'array', items: { type: 'string' } }, expected: { type: 'string' } } },
    devHubApproval: { type: 'string', enum: ['pending','approved','na'] },
  },
  required: ['issueId','rootCause','fix','files','blastRadius'],
};
const BRIEFS = { type: 'object', additionalProperties: false, properties: { briefs: { type: 'array', items: BRIEF } }, required: ['briefs'] };
const ADJUDICATION = {
  type: 'object', additionalProperties: false,
  properties: {
    issueId: { type: 'string' }, finalBrief: BRIEF,
    decisions: { type: 'array', items: { type: 'object', additionalProperties: false,
      properties: { finding: { type: 'string' }, ruling: { type: 'string' }, ruleApplied: { type: 'string' } },
      required: ['finding','ruling','ruleApplied'] } },
    escalate: { type: 'boolean' }, note: { type: 'string' },
  },
  required: ['issueId','finalBrief','decisions','escalate'],
};

const trivialPrompt = (ids) => [
  `You are the ui-ux AUTHOR. Produce a SHORT fix brief for EACH of these Trivial ui-ux issues: ${ids.join(', ')}.`,
  `For each, find it by ID in docs/PRODUCTION_READINESS_INDEX.txt (each has a one-line fix note) and confirm against the ACTUAL code.`,
  `These are trivial one-liners — keep rootCause/fix concise but cite a real file:line in files[]. Set launchBlocker=true for C4 and M23.`,
  `Fill devHubPlan per issue: for a visual/interaction change (C4 confirm dialog, M23 rating removal, L23 chevron opacity) give a real plan`,
  `(component, existing or NEW components/devTest page, scenarios incl. light AND dark) and devHubApproval='pending'; for pure copy/nav (L24, L28, L29)`,
  `set devHubApproval='na' with a one-line devHubPlan.naReason. Do NOT write code. Return {briefs:[...]} with one BRIEF per issue, issueId set.`,
].join(' ');

const todoAuthorPrompt = (m) => [
  `You are authoring audit issue ${m.id} (multi-domain: ${m.domains.join(' + ')}). Read it in docs/PRODUCTION_READINESS_AUDIT.md and`,
  `docs/PRODUCTION_READINESS_INDEX.txt, and investigate the ACTUAL code. Produce ONE fix brief satisfying all of: ${m.domains.join(', ')}.`,
  `Follow the fix-brief contract (.claude/agents/_shared-fix-brief.md): smallest correct change, reuse existing helpers, full Blast radius & safety,`,
  `name the test(s). Do NOT write code. Return a BRIEF.`,
].join(' ');

const mergePrompt = (m) => [
  `MERGE MODE. Read the banked domain author-drafts for issue ${m.id} from ${BANKED_DIR}/banked_${m.id}.json`,
  `(shape: {issueId, drafts:[...]}; some drafts are near-duplicates from re-runs — dedupe them).`,
  `These drafts are constraints on a SINGLE fix, not rival fixes. Consolidate into ONE unified fix brief: dedupe the files list,`,
  `resolve same-line conflicts, satisfy every domain's concern, and add sequencing if steps are ordered. Apply the rubric`,
  `correctness(gate) > safety > convention-fit > least-code > testability. Verify key file:line refs against the ACTUAL code.`,
  m.uiux ? `This fix touches ui-ux — include a devHubPlan and set devHubApproval='pending'.` : ``,
  `Do NOT write code. Return ONE BRIEF (issueId=${m.id}).`,
].join(' ');

const adjudicatePrompt = (id) => [
  `ADJUDICATION MODE. You are the independent judge for issue ${id}. Read the banked author brief + adversarial review findings from`,
  `${REVIEWED_DIR}/reviewed_${id}.json (shape: {issueId, brief, findings:[{claim,file,line,why}]}).`,
  `Decide the materiality of each finding using the rubric correctness(gate) > safety > convention-fit > least-code > testability,`,
  `verifying each claim against the ACTUAL code. Produce the FINAL brief (amend the banked brief to absorb every material finding; dismiss`,
  `immaterial ones) and a decisions log (finding -> ruling -> ruleApplied). Set escalate=true only if you cannot confidently resolve.`,
  `Do NOT write code. Return an ADJUDICATION (issueId=${id}).`,
].join(' ');

log(`v2 (Sonnet): ${TRIVIAL_UIUX.length} trivial + ${MULTI_TODO.length} multi-TODO + ${MULTI_DRAFTS.length} merges + ${REVIEWED.length} adjudications.`);

phase('Author gaps');
const [trivial, todoMulti] = await Promise.all([
  agent(trivialPrompt(TRIVIAL_UIUX), { agentType: 'ui-ux', model: M, label: 'author:trivial-uiux-batch', phase: 'Author gaps', schema: BRIEFS }),
  parallel(MULTI_TODO.map(m => () => agent(todoAuthorPrompt(m), { agentType: m.domains[0], model: M, label: `author:${m.id}`, phase: 'Author gaps', schema: BRIEF }))),
]);

phase('Merge banked drafts');
const merged = await parallel(MULTI_DRAFTS.map(m => () =>
  agent(mergePrompt(m), { agentType: 'coordinator', model: M, label: `merge:${m.id}`, phase: 'Merge banked drafts', schema: BRIEF })));

phase('Adjudicate reviewed');
const adjudicated = await parallel(REVIEWED.map(id => () =>
  agent(adjudicatePrompt(id), { agentType: 'adjudicator', model: M, label: `adjudicate:${id}`, phase: 'Adjudicate reviewed', schema: ADJUDICATION })));

const result = {
  trivial: (trivial && trivial.briefs) ? trivial.briefs : [],
  todoMulti: (todoMulti || []).filter(Boolean),
  merged: (merged || []).filter(Boolean),
  adjudicated: (adjudicated || []).filter(Boolean),
};
log(`v2 done: ${result.trivial.length} trivial + ${result.todoMulti.length} multi-TODO + ${result.merged.length} merged + ${result.adjudicated.length} adjudicated.`);
return result;
