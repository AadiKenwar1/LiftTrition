import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { hasPremiumEntitlement } from '../_shared/entitlement.ts'

//Note that you have to turn off "Verify JWT with legacy secret" in the Supabase project settings for this to work.

const CHAT_URL = 'https://api.openai.com/v1/chat/completions'

const TEXT_SYSTEM =
    'You are a nutrition estimation engine for a food-logging app. The user types one or more foods in free text. Estimate realistic macros and return the COMBINED total for everything they listed.'
const TEXT_USER = (name: string) =>
    `Estimate the total nutrition for these food(s): ${name}

The text may list several foods separated by commas, "and", "+", "with", or new lines, and may include quantities (for example "2 oranges", "3 slices of pizza", "chicken, pasta, broccoli").

Rules:
- Treat each listed food as its own item.
- For each item, assume a realistic single serving. When an explicit quantity is given, MULTIPLY that item's per-serving macros by the quantity.
- SUM every item into ONE combined total.
- Use conservative, realistic estimates. Protein, carbs, and fats are in grams.
- If you cannot recognize any food in the text, return 0 for every field.

Respond ONLY with JSON in this exact format:
{"calories":number,"protein":number,"carbs":number,"fats":number}`

const VISION_PROMPT = `You help users log meals in a fitness app (not medical advice).

Look at visible foods, drinks, and packaged/branded food products. List each distinct item. If the photo contains multiple distinct foods (for example sushi and a pasta bowl), output multiple ingredients and apply the countable vs whole-portion rules separately to each.

For each item:
- quantity = how many visible pieces/items are in the photo, or 1 if it is a single mixed/uncountable portion
- protein, carbs, fats, calories = nutrition PER ONE VISIBLE PIECE/ITEM when quantity > 1
- for foods that are not naturally countable (for example rice, pasta, salad, soup, mashed potatoes, oatmeal), set quantity = 1 and give nutrition for the whole visible portion
- do NOT use nutrition for a generic serving, cup, or 100g unless the visible item itself is exactly that amount
- do NOT multiply by quantity inside the nutrition fields
- use conservative, realistic estimates based on the visible size
- for low-calorie vegetables, avoid overestimating calories or protein
- brand = the branded product name if this item is a packaged/branded product, otherwise null

Important:
- If there are several small separate pieces visible (for example broccoli pieces, fries, nuggets, sushi pieces, grapes, strawberries), quantity should be the count of visible pieces, and nutrition should be for ONE of those visible pieces.
- If the food is a pile, bowl, plate, or mixed dish that is not meaningfully countable, quantity should be 1 and nutrition should represent the entire visible portion.
- Packaged or branded products ARE food. If you see a branded product (for example a bag of Goldfish crackers, a granola/protein bar, a soda can, a bottled drink, a box of cereal), identify it by its product name, set "brand" to that product name, estimate macros for a typical serving of that product, and set quantity to the number of distinct packages/units visible (else 1). Never return an empty list just because an item is packaged or branded.

If no food, drink, or food product is clearly visible, respond with JSON using "ingredients": [] and a short "name" like "No food visible".

Respond ONLY with JSON:
{"name":string,"ingredients":[{"name":string,"brand":string|null,"quantity":number,"protein":number,"carbs":number,"fats":number,"calories":number}]}`

const LABEL_PROMPT = `You are reading a Nutrition Facts label or food packaging in the image.

Read the printed nutrition values DIRECTLY from the label. Do NOT estimate from appearance.

Rules:
- Use the values for ONE serving as printed on the label (the "per serving" / "Amount per serving" column).
- If a product or food name is visible, use it as "name" and as "brand".
- Protein, carbs, fats are in grams; calories in kcal.
- Return a SINGLE ingredient with quantity 1 holding the per-serving values.
- If no nutrition label is readable, respond with "ingredients": [] and a short "name" like "No label detected".

Respond ONLY with JSON:
{"name":string,"ingredients":[{"name":string,"brand":string|null,"quantity":number,"protein":number,"carbs":number,"fats":number,"calories":number}]}`

const ITEM_PROMPT = `You are identifying a packaged/branded food product in the image for a food-logging app (not medical advice).

Read the product identity EXACTLY as printed on the packaging. Transcribe the brand, the product line, and the specific variety/flavor/size as written — do NOT paraphrase, guess, or substitute a similar product.

For each distinct product visible:
- name = a short generic food name (for example "bread", "crackers", "energy drink")
- brand = the full product identity as printed, in the form "<Brand> <Product line> <Variety>". If the brand/variety is not clearly legible, set brand to null (do NOT guess a brand).
- quantity = number of distinct packages/units visible (else 1)
- protein, carbs, fats (grams) and calories (kcal) = a best-effort estimate for ONE serving of the product (these may be replaced with database values later)

If no packaged/branded product is clearly visible, respond with "ingredients": [] and a short "name" like "No product visible".

Respond ONLY with JSON:
{"name":string,"ingredients":[{"name":string,"brand":string|null,"quantity":number,"protein":number,"carbs":number,"fats":number,"calories":number}]}`

// Each call helper returns either the model's raw JSON text, or a normalized error to relay verbatim.
type CallResult = { content: string } | { error: { status: number; body: Record<string, unknown> } }

function toResponse(result: CallResult): Response {
    if ('content' in result) return new Response(result.content, { headers: { 'Content-Type': 'application/json' } })
    return new Response(JSON.stringify(result.error.body), { status: result.error.status })
}

// M8: shared ceiling for BOTH provider fetches, matching the client's own withTimeout(...,30000)
// UI-visible window (aiFunctions.tsx) — this timer bounds Edge Function wall-clock/provider-cost
// exposure for a hung provider, it does not change user-visible latency (the client's race already
// governs that independently).
const PROVIDER_TIMEOUT_MS = 30000

// True for the AbortError a fetch()/res.json() rejects with when `signal` fires — either the
// PROVIDER_TIMEOUT_MS ceiling or the client disconnecting/cancelling (req.signal). Checked
// structurally (not `instanceof`) since which concrete error type Deno's fetch rejects with is
// not being relied upon here.
function isAbortError(err: unknown): boolean {
    return typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError'
}

// Shared catch-block body for both provider calls below: normalizes an AbortError (the
// PROVIDER_TIMEOUT_MS ceiling or a genuine client cancel) into the existing 504 CallResult
// shape instead of an uncaught exception; any other error rethrows unchanged (M8).
function toTimeoutResult(err: unknown): CallResult {
    if (isAbortError(err)) return { error: { status: 504, body: { error: 'timeout' } } }
    throw err
}

const OPENAI_VISION_MODEL = () => Deno.env.get('OPENAI_VISION_MODEL') ?? 'gpt-5.4-mini'

// Per-user/day caps (audit C1) — env-configurable, safe defaults sized for normal logging
// (several meal/item/label scans and manual macro estimates per day) while still bounding
// worst-case spend from a scripted loop. Label/item scans are counted under 'vision' too,
// even though detail:'high' is pricier than 'meal' mode's 'auto' — acceptable first cut.
const VISION_DAILY_LIMIT = () => Number(Deno.env.get('AI_VISION_DAILY_LIMIT') ?? '30')
const TEXT_DAILY_LIMIT = () => Number(Deno.env.get('AI_TEXT_DAILY_LIMIT') ?? '60')

// Atomically increments today's usage counter for (user, kind) and reports whether the caller
// is still within limit. Fails closed: any RPC/DB error (including the RPC not existing yet)
// is treated as "blocked" so an outage can never reopen the unbounded-spend hole this closes.
async function consumeQuota(supabase: ReturnType<typeof createClient>, userId: string, kind: string, limit: number): Promise<boolean> {
    const { data, error } = await supabase.rpc('consume_ai_quota', { p_user_id: userId, p_kind: kind, p_limit: limit })
    if (error) {
        console.error('[fetchOpenAI] consume_ai_quota error', kind, error)
        return false
    }
    return data === true
}

// --- OpenAI (Chat Completions) ---
async function callOpenAI(messages: unknown, model: string, label: string, signal: AbortSignal): Promise<CallResult> {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) return { error: { status: 500, body: { error: 'OpenAI not configured' } } }

    try {
        const res = await fetch(CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model, response_format: { type: 'json_object' }, messages }),
            signal,
        })
        if (!res.ok) return { error: { status: 502, body: { error: `OpenAI: ${res.status}` } } }

        const data = await res.json()
        console.log('[ai] openai', label, JSON.stringify(data?.usage))
        const message = data?.choices?.[0]?.message
        if (message?.refusal) return { error: { status: 422, body: { error: 'refused', message: message.refusal } } }
        const content = message?.content as string | null | undefined
        if (!content) {
            console.error('[fetchOpenAI] openai missing content', JSON.stringify(data))
            return { error: { status: 502, body: { error: 'Invalid response' } } }
        }
        return { content }
    } catch (err) {
        // `signal` firing cuts off fetch() OR the res.json() body read, armed for the full
        // lifecycle (not just headers) — see toTimeoutResult (M8).
        return toTimeoutResult(err)
    }
}

function callOpenAIVision(prompt: string, base64DataUrl: string, mode: string, signal: AbortSignal): Promise<CallResult> {
    return callOpenAI(
        [
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    // Meal = recognition (cheap auto detail); item/label = text reading (high detail).
                    { type: 'image_url', image_url: { url: base64DataUrl, detail: mode === 'meal' ? 'auto' : 'high' } },
                ],
            },
        ],
        OPENAI_VISION_MODEL(),
        `vision:${mode}`,
        signal,
    )
}

// --- Gemini (generateContent) ---
async function callGeminiVision(prompt: string, base64DataUrl: string, mode: string, signal: AbortSignal): Promise<CallResult> {
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) return { error: { status: 500, body: { error: 'Gemini not configured' } } }
    const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash'
    // Gemini wants RAW base64 (no "data:image/jpeg;base64," prefix) + an explicit mime type.
    const rawBase64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, '')
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: rawBase64 } }] }],
                generationConfig: { responseMimeType: 'application/json' },
            }),
            signal,
        })
        if (!res.ok) return { error: { status: 502, body: { error: `Gemini: ${res.status}` } } }

        const data = await res.json()
        console.log('[ai] gemini', `vision:${mode}`, JSON.stringify(data?.usageMetadata))
        if (data?.promptFeedback?.blockReason) {
            return { error: { status: 422, body: { error: 'refused', message: data.promptFeedback.blockReason } } }
        }
        const candidate = data?.candidates?.[0]
        const content = candidate?.content?.parts?.[0]?.text as string | null | undefined
        if (!content || (candidate?.finishReason && candidate.finishReason !== 'STOP')) {
            console.error('[fetchOpenAI] gemini missing/blocked content', JSON.stringify(data))
            return { error: { status: 502, body: { error: 'Invalid response' } } }
        }
        return { content }
    } catch (err) {
        // Same normalization as callOpenAI's catch above — see toTimeoutResult (M8).
        return toTimeoutResult(err)
    }
}

serve(async (req: Request) => {
    const auth = req.headers.get('Authorization')
    if (!auth) return new Response(null, { status: 401 })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const {
        data: { user },
    } = await supabase.auth.getUser(auth.replace('Bearer ', ''))
    if (!user) return new Response(null, { status: 401 })

    // Server-side premium gate (audit H1) — must pass before any quota is consumed or any
    // paid provider is called; the client's hasPremium check is UX-only and never trusted.
    if (!(await hasPremiumEntitlement(user.id))) {
        return new Response(JSON.stringify({ error: 'premium_required' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    }

    let body: { type: string; foodName?: string; base64Image?: string; mode?: 'meal' | 'item' | 'label'; provider?: 'openai' | 'gemini' }
    try {
        body = await req.json()
    } catch {
        return new Response(null, { status: 400 })
    }

    // M8: one merged signal per request, reused for whichever provider call runs below — fires on
    // EITHER req.signal (the client disconnecting/cancelling, e.g. the analyze modal dismissed) OR
    // the PROVIDER_TIMEOUT_MS ceiling (a hung/slow provider), and stays armed for the full fetch
    // lifecycle (headers + body read), not just until headers arrive.
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(PROVIDER_TIMEOUT_MS)])

    // Vision: pick provider (per-request override → VISION_PROVIDER env → openai default).
    if (body.type === 'vision' && body.base64Image) {
        // Quota gate BEFORE the paid call. Charged pre-flight, so a subsequent refusal (422)
        // or provider error (502) still consumes the unit already spent here — intentional
        // fail-safe for a cost blocker, not refunded.
        const allowed = await consumeQuota(supabase, user.id, 'vision', VISION_DAILY_LIMIT())
        if (!allowed) return new Response(JSON.stringify({ error: 'quota_exceeded' }), { status: 429 })

        const mode = body.mode === 'label' ? 'label' : body.mode === 'item' ? 'item' : 'meal'
        const prompt = mode === 'label' ? LABEL_PROMPT : mode === 'item' ? ITEM_PROMPT : VISION_PROMPT
        const provider =
            body.provider === 'gemini' || body.provider === 'openai' ? body.provider : (Deno.env.get('VISION_PROVIDER') ?? 'openai')
        const result =
            provider === 'gemini'
                ? await callGeminiVision(prompt, body.base64Image, mode, signal)
                : await callOpenAIVision(prompt, body.base64Image, mode, signal)
        return toResponse(result)
    }

    // Text (NLP): OpenAI only for now.
    if (body.type === 'text' && body.foodName) {
        const allowed = await consumeQuota(supabase, user.id, 'text', TEXT_DAILY_LIMIT())
        if (!allowed) return new Response(JSON.stringify({ error: 'quota_exceeded' }), { status: 429 })

        const result = await callOpenAI(
            [
                { role: 'system', content: TEXT_SYSTEM },
                { role: 'user', content: TEXT_USER(body.foodName) },
            ],
            OPENAI_VISION_MODEL(),
            'text',
            signal,
        )
        return toResponse(result)
    }

    return new Response(null, { status: 400 })
})
