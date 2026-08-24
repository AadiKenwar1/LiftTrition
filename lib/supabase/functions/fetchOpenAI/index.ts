import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { hasPremiumEntitlement } from '../_shared/entitlement.ts'

// Requires "Verify JWT with legacy secret" turned OFF in Supabase project settings — the handler below verifies the Authorization header itself via supabase.auth.getUser.

const CHAT_URL = 'https://api.openai.com/v1/chat/completions'

const TEXT_SYSTEM = `You are a nutrition estimator for a food-logging app. The user's message lists one or more foods, possibly with quantities.

Rules:
- Assume one typical single serving per food unless a quantity is given (for example: a chicken thigh ~85-115g cooked, pasta ~1 cup cooked). When a quantity is given, multiply that food by it.
- Return ONE combined total for everything listed. Protein, carbs, and fats in grams; calories in kcal.
- If you cannot recognize any food in the text, return 0 for every field.

Respond ONLY with JSON in this exact format:
{"calories":number,"protein":number,"carbs":number,"fats":number}`
const TEXT_USER = (name: string) => `Estimate the nutrition for: ${name}`

const FOOD_PROMPT = `You identify foods in a photo for a food-logging app.

First decide what the dish or product IS — what it would be called on a menu or shelf label. Set the top-level "name" to that. If it is a recognizable restaurant menu item or branded product, base your nutrition values on that item's known published nutrition — for a dish, scaled to the portion actually visible; for a packaged product, per ONE typical serving of that product, never the whole multi-serving package. Estimate purely from appearance only when the item is not recognizable.

Then list ingredients. Every visible food, drink, or packaged product belongs to EXACTLY ONE ingredient line:
- A composed item (sandwich, wrap, burger) is ONE ingredient that already includes everything inside it — never also list its components as separate ingredients.
- Packaged/branded items are food too, never leave one out.

For each ingredient:
- name = a short generic food name
- brand = the product name exactly as printed on the packaging if this is a packaged product; null if unbranded or not clearly legible (never guess a brand)
- quantity = the number of WHOLE units, not fragments — an item cut into halves or slices is quantity 1 (a sandwich shown as two halves is 1 sandwich). Use more than 1 only for genuinely separate items (each nugget, each bottle, each package); use 1 if not countable
- grams = the estimated weight in grams of ONE unit, judged from its visible size
- protein, carbs, fats (grams) and calories (kcal) = for that same ONE unit (or one typical serving of a packaged product, or the whole visible portion when quantity is 1) — derive them from your grams estimate, not from a generic serving/cup/100g. NEVER multiplied by quantity

If no food, drink, or food product is visible, respond with "ingredients": [] and a short "name" like "No food visible".

Respond ONLY with JSON:
{"name":string,"ingredients":[{"name":string,"brand":string|null,"quantity":number,"grams":number,"protein":number,"carbs":number,"fats":number,"calories":number}]}`

const LABEL_PROMPT = `You are reading a Nutrition Facts label in the image. Read the printed values directly - do NOT estimate from appearance.

Rules:
- Return exactly ONE ingredient with quantity 1, holding the values for one serving as printed on the label. Protein, carbs, fats in grams; calories in kcal.
- If a product or food name is visible, use it as "name" and "brand". If not, use "Scanned Label" as the name and set brand to null.
- If the nutrition numbers are readable, ALWAYS return them - a missing name is never a reason to return an empty list.
- Respond with "ingredients": [] and a short "name" like "No label detected" ONLY if the numbers themselves are unreadable.

Respond ONLY with JSON:
{"name":string,"ingredients":[{"name":string,"brand":string|null,"quantity":number,"protein":number,"carbs":number,"fats":number,"calories":number}]}`

// Each call helper returns either the model's raw JSON text, or a normalized error to relay verbatim.
type CallResult = { content: string } | { error: { status: number; body: Record<string, unknown> } }

// Vision modes: 'meal' = any food photo, 'label' = a Nutrition Facts panel. 'item' is a legacy
// alias of 'meal' still sent by older app builds; anything else is treated as 'meal'.
type VisionMode = 'meal' | 'item' | 'label'

// Relays a CallResult to the client: the model's JSON as-is on success, the normalized error body + status otherwise.
function toResponse(result: CallResult): Response {
    if ('content' in result) return new Response(result.content, { headers: { 'Content-Type': 'application/json' } })
    return new Response(JSON.stringify(result.error.body), { status: result.error.status })
}

// Ceiling on the OpenAI fetch, matching the client's withTimeout(...,30000) in aiFunctions.tsx — bounds cost when the API hangs.
const PROVIDER_TIMEOUT_MS = 30000

// True for the AbortError fetch()/res.json() reject with when `signal` fires — matched structurally since Deno's concrete abort error type isn't relied on.
function isAbortError(err: unknown): boolean {
    return typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError'
}

// Maps an AbortError (timeout ceiling or client cancel) to the 504 CallResult; any other error rethrows unchanged.
function toTimeoutResult(err: unknown): CallResult {
    if (isAbortError(err)) return { error: { status: 504, body: { error: 'timeout' } } }
    throw err
}

// Model used for every OpenAI call here — vision and text alike, read per-call so a redeploy isn't needed to change it.
const OPENAI_VISION_MODEL = () => Deno.env.get('OPENAI_VISION_MODEL') ?? 'gpt-5.4-mini'

// Per-user/day caps, env-configurable — sized for normal logging while bounding scripted-loop spend; label/item scans count under 'vision' too.
const VISION_DAILY_LIMIT = () => Number(Deno.env.get('AI_VISION_DAILY_LIMIT') ?? '30')
const TEXT_DAILY_LIMIT = () => Number(Deno.env.get('AI_TEXT_DAILY_LIMIT') ?? '60')

// Atomically increments today's (user, kind) usage counter and reports whether the caller is within limit — fails closed on any RPC/DB error so an outage can't reopen unbounded spend.
async function consumeQuota(supabase: ReturnType<typeof createClient>, userId: string, kind: string, limit: number): Promise<boolean> {
    const { data, error } = await supabase.rpc('consume_ai_quota', { p_user_id: userId, p_kind: kind, p_limit: limit })
    if (error) {
        console.error('[fetchOpenAI] consume_ai_quota error', kind, error)
        return false
    }
    return data === true
}

// Posts `messages` to OpenAI Chat Completions in JSON mode and normalizes the reply into a CallResult.
async function callOpenAI(messages: unknown, model: string, label: string, signal: AbortSignal): Promise<CallResult> {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) return { error: { status: 500, body: { error: 'OpenAI not configured' } } }

    try {
        const res = await fetch(CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            // temperature 0: estimation has one best answer — greedy decoding removes the scan-to-scan variance that sampling adds.
            body: JSON.stringify({ model, temperature: 0, response_format: { type: 'json_object' }, messages }),
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
        // `signal` stays armed for the whole lifecycle, so it cuts off the res.json() body read as well as fetch().
        return toTimeoutResult(err)
    }
}

// Wraps a prompt and an inline base64 image into the single user message the vision call expects.
function callOpenAIVision(prompt: string, base64DataUrl: string, mode: VisionMode, signal: AbortSignal): Promise<CallResult> {
    return callOpenAI(
        [
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    // High detail for every mode: packaging and label text must stay legible, and at the
                    // client's capture sizes it prices the same as auto (auto already resolved to high).
                    { type: 'image_url', image_url: { url: base64DataUrl, detail: 'high' } },
                ],
            },
        ],
        OPENAI_VISION_MODEL(),
        `vision:${mode}`,
        signal,
    )
}

// Entry point: authenticates the caller, gates on premium, spends quota, then routes vision or text to OpenAI.
serve(async (req: Request) => {
    const auth = req.headers.get('Authorization')
    if (!auth) return new Response(null, { status: 401 })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const {
        data: { user },
    } = await supabase.auth.getUser(auth.replace('Bearer ', ''))
    if (!user) return new Response(null, { status: 401 })

    // Server-side premium gate, checked before any quota or paid call — the client's hasPremium is UX-only and never trusted.
    if (!(await hasPremiumEntitlement(user.id))) {
        return new Response(JSON.stringify({ error: 'premium_required' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    }

    let body: { type: string; foodName?: string; base64Image?: string; mode?: VisionMode }
    try {
        body = await req.json()
    } catch {
        return new Response(null, { status: 400 })
    }

    // One merged signal per request: fires on client disconnect/cancel (req.signal) or the PROVIDER_TIMEOUT_MS ceiling, armed through the full fetch lifecycle.
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(PROVIDER_TIMEOUT_MS)])

    // Vision path: a food photo or a Nutrition Facts label ('item' below is the legacy alias for 'meal').
    if (body.type === 'vision' && body.base64Image) {
        // Quota charged BEFORE the paid call — a later refusal (422) or OpenAI error (502) is intentionally not refunded.
        const allowed = await consumeQuota(supabase, user.id, 'vision', VISION_DAILY_LIMIT())
        if (!allowed) return new Response(JSON.stringify({ error: 'quota_exceeded' }), { status: 429 })

        // Anything the client didn't send as 'item' or 'label' falls back to 'meal'.
        const mode: VisionMode = body.mode === 'item' || body.mode === 'label' ? body.mode : 'meal'
        // Only 'label' changes behavior — 'meal' and legacy 'item' get FOOD_PROMPT and identical image treatment.
        const prompt = mode === 'label' ? LABEL_PROMPT : FOOD_PROMPT
        const result = await callOpenAIVision(prompt, body.base64Image, mode, signal)
        return toResponse(result)
    }

    // Text path: a typed food description, same pre-flight quota charge as vision.
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
