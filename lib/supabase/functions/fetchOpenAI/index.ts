import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

const LOOKUP_PROMPT = (name: string) =>
    `Find the official nutrition facts for this branded food product: ${name}

Search the web for the manufacturer's published nutrition information and use the values for ONE standard serving as listed on the product. Protein, carbs, and fats in grams; calories in kcal. If you cannot find reliable data, return 0 for every field.

Respond ONLY with JSON in this exact format:
{"calories":number,"protein":number,"carbs":number,"fats":number}`

serve(async (req: Request) => {
    const auth = req.headers.get('Authorization')
    if (!auth) return new Response(null, { status: 401 })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const {
        data: { user },
    } = await supabase.auth.getUser(auth.replace('Bearer ', ''))
    if (!user) return new Response(null, { status: 401 })

    let body: { type: string; foodName?: string; productName?: string; base64Image?: string; mode?: 'meal' | 'label' }
    try {
        body = await req.json()
    } catch {
        return new Response(null, { status: 400 })
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) return new Response('Server config error', { status: 500 })

    const isVision = body.type === 'vision' && body.base64Image
    const isLabel = isVision && body.mode === 'label'

    const payload =
        isVision ?
            {
                model: 'gpt-4o',
                temperature: 0.2,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: isLabel ? LABEL_PROMPT : VISION_PROMPT },
                            { type: 'image_url', image_url: { url: body.base64Image, detail: isLabel ? 'high' : 'auto' } },
                        ],
                    },
                ],
            }
        : body.type === 'text' && body.foodName ?
            {
                model: 'gpt-4o',
                temperature: 0.1,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: TEXT_SYSTEM },
                    { role: 'user', content: TEXT_USER(body.foodName) },
                ],
            }
        : body.type === 'lookup' && body.productName ?
            {
                // Search-enabled model: browses the web. Does NOT support temperature/response_format.
                model: 'gpt-4o-search-preview',
                web_search_options: {},
                messages: [{ role: 'user', content: LOOKUP_PROMPT(body.productName) }],
            }
        :   null

    if (!payload) return new Response(null, { status: 400 })

    const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(payload),
    })

    if (!res.ok) {
        return new Response(JSON.stringify({ error: `OpenAI: ${res.status}` }), { status: 502 })
    }

    const data = await res.json()
    const message = data?.choices?.[0]?.message
    const refusal = message?.refusal as string | undefined
    const content = message?.content as string | null | undefined

    if (refusal) {
        return new Response(JSON.stringify({ error: 'refused', message: refusal }), { status: 422 })
    }
    if (!content) {
        console.error('[fetchOpenAI] Missing message.content', JSON.stringify(data))
        return new Response(JSON.stringify({ error: 'Invalid response' }), { status: 502 })
    }

    return new Response(content, { headers: { 'Content-Type': 'application/json' } })
})
