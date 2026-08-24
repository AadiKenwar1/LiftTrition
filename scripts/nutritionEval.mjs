// scripts/nutritionEval.mjs
// Live eval of the AI nutrition prompts against tests/nutrition-eval (50 photos with verified
// ground truth). Calls OpenAI directly with the SAME model, prompts, JSON mode and image-detail
// settings as lib/supabase/functions/fetchOpenAI/index.ts — the prompts and model default are
// extracted from that file at runtime, so editing a prompt automatically evals the new one.
//
// Grading philosophy (agreed in review):
//   - Bars are goal-lines, not the metric. Every raw model reply is saved to the run file, so
//     any metric can be recomputed later without new API calls (see --rescore).
//   - Desired bar: ±10%. The summary shows the whole pass curve at ±5/10/25/50%.
//   - A macro passes a bar if within the % band OR within the gram floor (pct/5 grams), so
//     tiny-gram foods aren't auto-fails; calories get a kcal floor equal to the pct value.
//   - meals (basis per_serving) compare model totals (Σ quantity × per-piece macros) directly.
//   - labels/products (per_100g) are scored against the closer of: truth as-is, or truth scaled
//     to the printed serving (× serving_size_g/100) when known — panels print either basis.
//   - products additionally score brand/name recognition, the meaningful test per the eval README.
//
// Usage (from App/):
//   node scripts/nutritionEval.mjs                 # full 50-photo run
//   node scripts/nutritionEval.mjs --limit 6       # smoke test, interleaved across classes
//   node scripts/nutritionEval.mjs --class label   # one class only
//   node scripts/nutritionEval.mjs --rescore tests/nutrition-eval/runs/run-XXX.json
//   node scripts/nutritionEval.mjs --imageRoot DIR # read photos from DIR instead of the eval set,
//                                                  # for measuring a capture pipeline's resize/quality
//
// Needs OPENAI_API_KEY in App/.env (or the environment). Never logs the key.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const EVAL_DIR = path.join(APP_ROOT, 'tests', 'nutrition-eval')
const RUNS_DIR = path.join(EVAL_DIR, 'runs')
const EDGE_FN_SOURCE = path.join(APP_ROOT, 'lib', 'supabase', 'functions', 'fetchOpenAI', 'index.ts')

const CHAT_URL = 'https://api.openai.com/v1/chat/completions'
// Matches the edge function's PROVIDER_TIMEOUT_MS so eval latency reflects production limits.
const CALL_TIMEOUT_MS = 30000
const CONCURRENCY = 5

// Pass bars: a field passes if |%err| <= pct OR |unit err| <= floor (grams for macros, kcal for calories).
const BARS = [
    { pct: 5, gramFloor: 1, kcalFloor: 5 },
    { pct: 10, gramFloor: 2, kcalFloor: 10 }, // the desired bar
    { pct: 25, gramFloor: 5, kcalFloor: 25 },
    { pct: 50, gramFloor: 10, kcalFloor: 50 },
]
const DESIRED_PCT = 10

const FIELDS = ['calories', 'protein', 'carbs', 'fats']
// Maps prediction field -> eval_set truth field.
const TRUTH_FIELD = { calories: 'calories', protein: 'protein_g', carbs: 'carbs_g', fats: 'fat_g' }

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

// Minimal .env parser: KEY=VALUE lines, optional quotes, # comments; never overrides real env.
function loadDotEnv(file) {
    if (!fs.existsSync(file)) return
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
        if (!m || line.trim().startsWith('#')) continue
        let value = m[2]
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
        }
        if (!(m[1] in process.env)) process.env[m[1]] = value
    }
}

// Pulls the two vision prompts and the model default out of the edge function source, so this
// script can never drift from what production sends. Hard-fails if the source shape changed.
function extractEdgeFunctionConfig() {
    const src = fs.readFileSync(EDGE_FN_SOURCE, 'utf8')
    const grab = (name) => {
        const m = src.match(new RegExp('const ' + name + ' = `([\\s\\S]*?)`\\r?\\n'))
        if (!m) throw new Error(`Could not find ${name} in fetchOpenAI/index.ts — its shape changed; update nutritionEval.mjs`)
        return m[1]
    }
    const modelMatch = src.match(/Deno\.env\.get\('OPENAI_VISION_MODEL'\) \?\? '([^']+)'/)
    if (!modelMatch) throw new Error('Could not find the OPENAI_VISION_MODEL default in fetchOpenAI/index.ts')
    // Mirror the edge function's temperature (absent = provider default), so the eval can't drift from production.
    const tempMatch = src.match(/temperature: ([0-9.]+)/)
    return { foodPrompt: grab('FOOD_PROMPT'), labelPrompt: grab('LABEL_PROMPT'), modelDefault: modelMatch[1], temperature: tempMatch ? Number(tempMatch[1]) : null }
}

// Tiny arg parser for --limit N, --class X, --rescore FILE, --concurrency N, --imageRoot DIR.
function parseArgs(argv) {
    const args = { limit: null, class: null, rescore: null, concurrency: CONCURRENCY, samples: 1, temperature: null, imageRoot: EVAL_DIR }
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--limit') args.limit = Number(argv[++i])
        else if (argv[i] === '--class') args.class = argv[++i]
        else if (argv[i] === '--rescore') args.rescore = argv[++i]
        else if (argv[i] === '--concurrency') args.concurrency = Number(argv[++i])
        else if (argv[i] === '--samples') args.samples = Number(argv[++i])
        else if (argv[i] === '--temperature') args.temperature = Number(argv[++i])
        else if (argv[i] === '--imageRoot') args.imageRoot = path.resolve(APP_ROOT, argv[++i])
        else throw new Error(`Unknown argument: ${argv[i]}`)
    }
    return args
}

// Interleaves rows across classes (meal, product, label, meal, ...) so --limit N smoke-tests every mode.
function interleaveByClass(rows) {
    const byClass = new Map()
    for (const r of rows) {
        if (!byClass.has(r.class)) byClass.set(r.class, [])
        byClass.get(r.class).push(r)
    }
    const lists = [...byClass.values()]
    const out = []
    for (let i = 0; out.length < rows.length; i++) {
        for (const list of lists) if (i < list.length) out.push(list[i])
    }
    return out
}

// ---------------------------------------------------------------------------
// OpenAI call (mirrors callOpenAIVision in the edge function)
// ---------------------------------------------------------------------------

// eval class -> the ScanMode the app would send for that kind of photo. Products are photographed
// on the food tab like any other food, so they map to 'meal'.
const CLASS_TO_MODE = { meal: 'meal', product: 'meal', label: 'label' }

// Builds the exact chat-completions payload the edge function sends for one photo.
// `temperature` is an experiment knob (--temperature); null sends none, matching production today.
// `imageRoot` is the directory row.image resolves against (--imageRoot swaps in resized copies).
function buildPayload(row, config, model, temperature, imageRoot) {
    const mode = CLASS_TO_MODE[row.class]
    const prompt = mode === 'label' ? config.labelPrompt : config.foodPrompt
    const imagePath = path.join(imageRoot, row.image)
    const ext = path.extname(imagePath).toLowerCase()
    const mime = ext === '.png' ? 'image/png' : 'image/jpeg'
    const dataUrl = `data:${mime};base64,${fs.readFileSync(imagePath).toString('base64')}`
    return {
        model,
        ...(temperature !== null && temperature !== undefined ? { temperature } : {}),
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    // Same detail rule as the edge function: high for every mode.
                    { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
                ],
            },
        ],
    }
}

// One API call with a 30s ceiling; returns {status, latencyMs, usage, rawContent, refusal, error}.
async function callOnce(payload, apiKey) {
    const started = Date.now()
    try {
        const res = await fetch(CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
        })
        const latencyMs = Date.now() - started
        if (!res.ok) {
            const text = await res.text().catch(() => '')
            return { status: res.status, latencyMs, error: `HTTP ${res.status}: ${text.slice(0, 300)}` }
        }
        const data = await res.json()
        const message = data?.choices?.[0]?.message
        if (message?.refusal) return { status: 200, latencyMs, usage: data?.usage ?? null, refusal: message.refusal }
        if (!message?.content) return { status: 200, latencyMs, usage: data?.usage ?? null, error: 'missing content' }
        return { status: 200, latencyMs, usage: data?.usage ?? null, rawContent: message.content }
    } catch (err) {
        const latencyMs = Date.now() - started
        const timedOut = err?.name === 'AbortError' || err?.name === 'TimeoutError'
        return { status: null, latencyMs, error: timedOut ? 'timeout' : `network: ${err?.message ?? err}` }
    }
}

// Calls with a single retry on timeout/429/5xx/network so one hiccup doesn't lose a row; records the retry.
// 429s are tokens-per-MINUTE limits, so their retry waits long enough for the window to move.
async function callWithRetry(payload, apiKey) {
    const first = await callOnce(payload, apiKey)
    const retryable = first.error && (first.error === 'timeout' || first.status === 429 || (first.status ?? 500) >= 500 || first.error.startsWith('network'))
    if (!retryable) return { ...first, retried: false }
    await new Promise((r) => setTimeout(r, first.status === 429 ? 20000 : 2000))
    const second = await callOnce(payload, apiKey)
    return { ...second, retried: true, firstAttempt: { status: first.status, latencyMs: first.latencyMs, error: first.error } }
}

// Runs tasks with a fixed concurrency cap, preserving order of results.
async function runPool(items, worker, concurrency) {
    const results = new Array(items.length)
    let next = 0
    const lanes = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (next < items.length) {
            const i = next++
            results[i] = await worker(items[i], i)
        }
    })
    await Promise.all(lanes)
    return results
}

// ---------------------------------------------------------------------------
// Parsing and scoring (pure — reused verbatim by --rescore)
// ---------------------------------------------------------------------------

// Validates the model's reply against the JSON contract the app parses; returns parse state + totals.
function parseReply(rawContent) {
    const out = { jsonValid: false, shapeErrors: [], name: null, ingredients: [], totals: null, ingredientCount: 0, sawFood: false, labelContractOk: null, predictedAtwaterDevPct: null }
    let parsed
    try {
        parsed = JSON.parse(rawContent)
    } catch {
        out.shapeErrors.push('not valid JSON')
        return out
    }
    if (typeof parsed?.name !== 'string') out.shapeErrors.push('name is not a string')
    if (!Array.isArray(parsed?.ingredients)) {
        out.shapeErrors.push('ingredients is not an array')
        return out
    }
    for (const [i, ing] of parsed.ingredients.entries()) {
        if (typeof ing?.name !== 'string') out.shapeErrors.push(`ingredient ${i}: name not a string`)
        if (!(typeof ing?.brand === 'string' || ing?.brand === null)) out.shapeErrors.push(`ingredient ${i}: brand not string|null`)
        // grams is optional in the contract (the label prompt doesn't request it) but must be sane when present.
        if (ing?.grams !== undefined && (!Number.isFinite(ing.grams) || ing.grams < 0)) out.shapeErrors.push(`ingredient ${i}: grams not a non-negative number`)
        for (const f of ['quantity', ...FIELDS]) {
            if (!Number.isFinite(ing?.[f])) out.shapeErrors.push(`ingredient ${i}: ${f} not a finite number`)
            else if (ing[f] < 0) out.shapeErrors.push(`ingredient ${i}: ${f} is negative`)
        }
    }
    out.jsonValid = out.shapeErrors.length === 0
    if (!out.jsonValid) return out

    out.name = parsed.name
    out.ingredients = parsed.ingredients
    out.ingredientCount = parsed.ingredients.length
    out.sawFood = parsed.ingredients.length > 0
    // App-side contract for label scans: exactly one ingredient with quantity 1.
    out.labelContractOk = parsed.ingredients.length === 1 && parsed.ingredients[0].quantity === 1

    // Totals the app would log: per-piece macros × quantity, summed. Grams total only counts
    // when every ingredient reported a usable weight; implausible = calories the weight can't hold
    // (densest edible food, pure fat, is ~9 kcal/g).
    const totals = { calories: 0, protein: 0, carbs: 0, fats: 0, grams: 0 }
    let gramsCovered = parsed.ingredients.length > 0
    let implausible = 0
    for (const ing of parsed.ingredients) {
        for (const f of FIELDS) totals[f] += ing[f] * ing.quantity
        if (ing.grams === undefined) gramsCovered = false
        else if (!Number.isFinite(ing.grams) || ing.grams <= 0) {
            gramsCovered = false
            if (ing.calories > 0) implausible++
        } else {
            totals.grams += ing.grams * ing.quantity
            if (ing.calories / ing.grams > 9.5) implausible++
        }
    }
    if (!gramsCovered) totals.grams = null
    out.implausibleDensity = implausible
    out.totals = totals

    // Internal consistency of the prediction itself: 4P + 4C + 9F vs its own calories.
    if (totals.calories > 0) {
        const atwater = 4 * totals.protein + 4 * totals.carbs + 9 * totals.fats
        out.predictedAtwaterDevPct = round1(Math.abs(atwater - totals.calories) / totals.calories * 100)
    }
    return out
}

// Vote-of-N: per-field median of the valid samples' totals kills symmetric sampling noise; the
// sample whose calories sit closest to that median supplies names/ingredients/contract metadata.
function mergeParsedSamples(parsedList) {
    const valid = parsedList.filter((p) => p.jsonValid && p.sawFood)
    if (valid.length === 0) return parsedList[0] ?? null
    if (valid.length === 1) return valid[0]
    const totals = {}
    for (const f of FIELDS) totals[f] = percentile(valid.map((p) => p.totals[f]), 50)
    const gramsValues = valid.map((p) => p.totals.grams).filter((g) => g !== null && g !== undefined)
    totals.grams = gramsValues.length ? percentile(gramsValues, 50) : null
    let rep = valid[0]
    for (const p of valid) if (Math.abs(p.totals.calories - totals.calories) < Math.abs(rep.totals.calories - totals.calories)) rep = p
    const atwater = totals.calories > 0 ? round1((Math.abs(4 * totals.protein + 4 * totals.carbs + 9 * totals.fats - totals.calories) / totals.calories) * 100) : null
    return { ...rep, totals, predictedAtwaterDevPct: atwater, mergedFrom: valid.length }
}

// Ground-truth candidates for a row: truth as recorded, plus truth scaled to the printed serving
// when the serving weight is known (panels print either per-100g or per-serving; we score the
// interpretation the model's calories sit closer to, and record which one matched).
function truthCandidates(row) {
    const asIs = { basisUsed: row.basis, expected: {} }
    for (const f of FIELDS) asIs.expected[f] = row[TRUTH_FIELD[f]]
    const candidates = [asIs]
    if (row.basis !== 'per_serving' && Number.isFinite(row.serving_size_g)) {
        const scaled = { basisUsed: 'per_serving_scaled', expected: {} }
        for (const f of FIELDS) scaled.expected[f] = round1(row[TRUTH_FIELD[f]] * row.serving_size_g / 100)
        candidates.push(scaled)
    }
    return candidates
}

// Signed % error and absolute unit error for one field; pct is null when the truth is 0.
function fieldError(predicted, expected) {
    const unitErr = round1(predicted - expected)
    const pctErr = expected === 0 ? null : round1((predicted - expected) / expected * 100)
    return { unitErr, pctErr }
}

// True when a field's error clears one bar: inside the % band, or inside the unit floor.
function fieldPasses(f, err, bar) {
    const floor = f === 'calories' ? bar.kcalFloor : bar.gramFloor
    if (Math.abs(err.unitErr) <= floor) return true
    return err.pctErr !== null && Math.abs(err.pctErr) <= bar.pct
}

// Lowercases, strips accents and punctuation, splits into tokens of length >= 4.
function tokens(text) {
    return (text ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 4)
}

// Product recognition: did the prediction's names/brands share a meaningful word with the truth's?
function scoreRecognition(row, parsed) {
    const predictedText = [parsed.name, ...parsed.ingredients.flatMap((i) => [i.name, i.brand ?? ''])].join(' ')
    const predicted = new Set(tokens(predictedText))
    const brandTokens = tokens(row.brand_or_source)
    const nameTokens = tokens(row.name)
    const brandHits = brandTokens.filter((t) => predicted.has(t))
    const nameHits = nameTokens.filter((t) => predicted.has(t))
    return { recognized: brandHits.length > 0 || nameHits.length > 0, brandHits, nameHits }
}

// Full score for one row from its parsed reply: errors per field, pass map per bar, recognition.
function scoreRow(row, parsed) {
    if (!parsed.jsonValid || !parsed.sawFood) return { scored: false, reason: !parsed.jsonValid ? 'invalid JSON' : 'no food seen' }

    // Pick the truth interpretation whose calories sit closest to the prediction (see truthCandidates).
    const candidates = truthCandidates(row)
    let best = null
    for (const c of candidates) {
        const calErr = Math.abs(parsed.totals.calories - c.expected.calories)
        if (!best || calErr < best.calErr) best = { ...c, calErr }
    }

    const errors = {}
    for (const f of FIELDS) errors[f] = fieldError(parsed.totals[f], best.expected[f])

    const passes = {}
    for (const bar of BARS) {
        const perField = {}
        for (const f of FIELDS) perField[f] = fieldPasses(f, errors[f], bar)
        perField.all = FIELDS.every((f) => perField[f])
        passes[bar.pct] = perField
    }

    const recognition = row.class === 'product' ? scoreRecognition(row, parsed) : null

    // Weight accuracy is only checkable when the scored basis is a serving with a known printed weight.
    const servingComparable = best.basisUsed === 'per_serving_scaled' || (best.basisUsed === 'per_serving' && Number.isFinite(row.serving_size_g))
    const gramsExpected = servingComparable ? row.serving_size_g : null
    const grams = {
        predicted: parsed.totals.grams,
        expected: gramsExpected,
        errPct: gramsExpected !== null && parsed.totals.grams !== null ? round1(((parsed.totals.grams - gramsExpected) / gramsExpected) * 100) : null,
    }
    return { scored: true, basisUsed: best.basisUsed, expected: best.expected, errors, passes, recognition, grams }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

// One decimal place, keeping null/NaN out of the output files.
function round1(n) {
    return Number.isFinite(n) ? Math.round(n * 10) / 10 : null
}

// p-th percentile (0..100) of a numeric array; null when empty.
function percentile(values, p) {
    if (values.length === 0) return null
    const sorted = [...values].sort((a, b) => a - b)
    return round1(sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))])
}

// Aggregates scored rows into the per-class stats block (medians, bias, pass curve, failures).
function summarize(records) {
    const summary = {}
    for (const subset of ['clean', 'all']) {
        summary[subset] = {}
        for (const cls of ['meal', 'product', 'label']) {
            const rows = records.filter((r) => r.class === cls && (subset === 'all' || r.truth.is_clean))
            if (rows.length === 0) continue
            const block = { n: rows.length }

            block.failures = {
                invalidJson: rows.filter((r) => r.response.rawContent && !r.parsed.jsonValid).length,
                noFood: rows.filter((r) => r.parsed?.jsonValid && !r.parsed.sawFood).length,
                refusals: rows.filter((r) => r.response.refusal).length,
                callErrors: rows.filter((r) => r.response.error).length,
            }

            const scored = rows.filter((r) => r.score?.scored)
            block.scoredRows = scored.length
            block.fields = {}
            for (const f of FIELDS) {
                const abs = scored.map((r) => r.score.errors[f].pctErr).filter((v) => v !== null).map(Math.abs)
                const signed = scored.map((r) => r.score.errors[f].pctErr).filter((v) => v !== null)
                block.fields[f] = {
                    medianAbsPct: percentile(abs, 50),
                    meanAbsPct: abs.length ? round1(abs.reduce((a, b) => a + b, 0) / abs.length) : null,
                    p90AbsPct: percentile(abs, 90),
                    meanSignedPct: signed.length ? round1(signed.reduce((a, b) => a + b, 0) / signed.length) : null,
                }
            }

            block.passCurve = {}
            for (const bar of BARS) {
                const perField = {}
                for (const f of [...FIELDS, 'all']) {
                    const passed = scored.filter((r) => r.score.passes[bar.pct][f]).length
                    perField[f] = scored.length ? round1((passed / scored.length) * 100) : null
                }
                block.passCurve[`±${bar.pct}%`] = perField
            }

            if (cls === 'product') {
                const rec = scored.filter((r) => r.score.recognition?.recognized).length
                block.recognitionRatePct = scored.length ? round1((rec / scored.length) * 100) : null
            }
            if (cls !== 'label') {
                const withGrams = scored.filter((r) => r.parsed.totals?.grams !== null && r.parsed.totals?.grams !== undefined)
                const gramErrs = scored.map((r) => r.score.grams?.errPct).filter((v) => v !== null && v !== undefined).map(Math.abs)
                block.grams = {
                    coveragePct: scored.length ? round1((withGrams.length / scored.length) * 100) : null,
                    medianAbsErrPct: percentile(gramErrs, 50),
                    comparableRows: gramErrs.length,
                    implausibleIngredients: rows.reduce((a, r) => a + (r.parsed?.implausibleDensity ?? 0), 0),
                }
            }
            if (cls === 'meal') {
                block.medianIngredientCount = percentile(scored.map((r) => r.parsed.ingredientCount), 50)
                block.medianPredictedAtwaterDevPct = percentile(scored.map((r) => r.parsed.predictedAtwaterDevPct).filter((v) => v !== null), 50)
            }
            block.labelContractViolations = cls === 'label' ? rows.filter((r) => r.parsed?.jsonValid && !r.parsed.labelContractOk).length : undefined

            const latencies = rows.map((r) => r.response.latencyMs).filter(Number.isFinite)
            block.latencyMs = { p50: percentile(latencies, 50), p95: percentile(latencies, 95) }
            block.tokens = {
                prompt: rows.reduce((a, r) => a + (r.response.usage?.prompt_tokens ?? 0), 0),
                completion: rows.reduce((a, r) => a + (r.response.usage?.completion_tokens ?? 0), 0),
            }
            summary[subset][cls] = block
        }
    }
    return summary
}

// Prints the human-readable console report for one summary block.
function printSummary(summary, label) {
    console.log(`\n================ ${label} ================`)
    for (const subset of ['clean', 'all']) {
        console.log(`\n--- ${subset === 'clean' ? 'CLEAN ROWS (headline)' : 'ALL ROWS (incl. 9 suspects)'} ---`)
        for (const [cls, b] of Object.entries(summary[subset])) {
            console.log(`\n[${cls}] n=${b.n} scored=${b.scoredRows}  failures: json=${b.failures.invalidJson} noFood=${b.failures.noFood} refusal=${b.failures.refusals} call=${b.failures.callErrors}`)
            for (const f of FIELDS) {
                const s = b.fields[f]
                console.log(`  ${f.padEnd(9)} median |err| ${String(s.medianAbsPct).padStart(6)}%   mean ${String(s.meanAbsPct).padStart(6)}%   p90 ${String(s.p90AbsPct).padStart(6)}%   bias ${s.meanSignedPct > 0 ? '+' : ''}${s.meanSignedPct}%`)
            }
            const curve = Object.entries(b.passCurve).map(([bar, v]) => `${bar}: ${v.all}%`).join('   ')
            console.log(`  pass (all 4 fields)  ${curve}   <-- desired ±${DESIRED_PCT}%`)
            if (b.recognitionRatePct !== undefined) console.log(`  product recognized   ${b.recognitionRatePct}%`)
            if (b.grams) console.log(`  grams: reported on ${b.grams.coveragePct}% of rows   median |err| ${b.grams.medianAbsErrPct}% (checkable n=${b.grams.comparableRows})   impossible-density ingredients: ${b.grams.implausibleIngredients}`)
            if (b.medianIngredientCount !== undefined) console.log(`  median ingredients ${b.medianIngredientCount}   own-math deviation ${b.medianPredictedAtwaterDevPct}%`)
            if (b.labelContractViolations) console.log(`  label contract violations: ${b.labelContractViolations}`)
            console.log(`  latency p50 ${b.latencyMs.p50}ms p95 ${b.latencyMs.p95}ms   tokens in/out ${b.tokens.prompt}/${b.tokens.completion}`)
        }
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// Re-scores a saved run file with the current bars/scoring code — zero API calls.
function rescore(runFile) {
    const run = JSON.parse(fs.readFileSync(runFile, 'utf8'))
    for (const rec of run.rows) {
        if (rec.samples) {
            const parsedList = rec.samples.map((s) => (s.response.rawContent ? parseReply(s.response.rawContent) : null)).filter(Boolean)
            rec.parsed = parsedList.length ? mergeParsedSamples(parsedList) : null
        } else {
            rec.parsed = rec.response.rawContent ? parseReply(rec.response.rawContent) : null
        }
        rec.score = rec.parsed ? scoreRow(rec.truth, rec.parsed) : { scored: false, reason: rec.response.refusal ? 'refusal' : 'call error' }
    }
    printSummary(summarize(run.rows), `RESCORE of ${path.basename(runFile)} (model ${run.meta.model})`)
}

// Full live run: call the model on every selected row, score, save the run file, print the summary.
async function main() {
    const args = parseArgs(process.argv.slice(2))
    if (args.rescore) return rescore(path.resolve(APP_ROOT, args.rescore))

    loadDotEnv(path.join(APP_ROOT, '.env'))
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY not found in App/.env or the environment')

    const config = extractEdgeFunctionConfig()
    const model = process.env.OPENAI_VISION_MODEL ?? config.modelDefault
    // Flag overrides for experiments; otherwise match whatever the edge function sends.
    if (args.temperature === null) args.temperature = config.temperature

    let rows = JSON.parse(fs.readFileSync(path.join(EVAL_DIR, 'eval_set.json'), 'utf8'))
    if (args.class) rows = rows.filter((r) => r.class === args.class)
    rows = interleaveByClass(rows)
    if (args.limit) rows = rows.slice(0, args.limit)
    console.log(`Evaluating ${rows.length} photos with model ${model} (concurrency ${args.concurrency})...`)

    let done = 0
    const records = await runPool(rows, async (row) => {
        const payload = buildPayload(row, config, model, args.temperature, args.imageRoot)
        // The payload's image is huge; the run file keeps only what's needed to re-score and audit.
        let response, parsed, samples
        if (args.samples > 1) {
            const results = await Promise.all(Array.from({ length: args.samples }, () => callWithRetry(payload, apiKey)))
            samples = results.map((res) => ({ response: res, parsed: res.rawContent ? parseReply(res.rawContent) : null }))
            const parsedList = samples.map((s) => s.parsed).filter(Boolean)
            parsed = parsedList.length ? mergeParsedSamples(parsedList) : null
            // Aggregate view: wall latency is the slowest parallel sample; tokens are the true summed cost.
            const allFailed = results.every((r) => r.error || r.refusal)
            response = {
                status: allFailed ? (results[0].status ?? null) : 200,
                latencyMs: Math.max(...results.map((r) => r.latencyMs ?? 0)),
                usage: {
                    prompt_tokens: results.reduce((a, r) => a + (r.usage?.prompt_tokens ?? 0), 0),
                    completion_tokens: results.reduce((a, r) => a + (r.usage?.completion_tokens ?? 0), 0),
                },
                error: allFailed && results[0].error ? results.map((r) => r.error).filter(Boolean).join(' | ') : undefined,
                refusal: allFailed && results[0].refusal ? results[0].refusal : undefined,
                rawContent: parsedList.length ? '(vote-of-N: see samples[])' : undefined,
            }
        } else {
            response = await callWithRetry(payload, apiKey)
            parsed = response.rawContent ? parseReply(response.rawContent) : null
        }
        const score = parsed ? scoreRow(row, parsed) : { scored: false, reason: response.refusal ? 'refusal' : 'call error' }
        done++
        const verdict = score.scored ? `cal ${score.errors.calories.pctErr === null ? 'n/a' : score.errors.calories.pctErr + '%'}` : score.reason
        console.log(`  [${String(done).padStart(2)}/${rows.length}] ${row.id.padEnd(16)} ${verdict}`)
        return { id: row.id, class: row.class, mode: CLASS_TO_MODE[row.class], truth: row, response, parsed, score, ...(samples ? { samples } : {}) }
    }, args.concurrency)

    const summary = summarize(records)
    const stamp = new Date().toISOString().replace(/[:T]/g, '-').replace(/\..+/, '')
    const runFile = path.join(RUNS_DIR, `run-${stamp}.json`)
    fs.mkdirSync(RUNS_DIR, { recursive: true })
    fs.writeFileSync(runFile, JSON.stringify({
        meta: {
            timestamp: new Date().toISOString(),
            model,
            bars: BARS,
            desiredPct: DESIRED_PCT,
            args: { limit: args.limit, class: args.class, samples: args.samples, temperature: args.temperature, imageRoot: args.imageRoot },
            prompts: { food: config.foodPrompt, label: config.labelPrompt },
            node: process.version,
        },
        summary,
        rows: records,
    }, null, 2))

    printSummary(summary, `RUN ${path.basename(runFile)} (model ${model})`)
    console.log(`\nSaved: ${path.relative(APP_ROOT, runFile)}`)
    console.log('Re-grade later with: node scripts/nutritionEval.mjs --rescore ' + path.relative(APP_ROOT, runFile).replace(/\\/g, '/'))
}

main().catch((err) => {
    console.error(err.message ?? err)
    process.exit(1)
})
