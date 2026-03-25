import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

//Note that you have to turn off "Verify JWT with legacy secret" in the Supabase project settings for this to work.

const CHAT_URL = 'https://api.openai.com/v1/chat/completions'

const TEXT_SYSTEM = 'You are a nutrition expert. Provide accurate nutrition estimates for typical serving sizes of foods.'
const TEXT_USER = (name: string) =>
    `Estimate typical nutrition values for a standard serving of: ${name}

Respond ONLY with JSON in this exact format:
{"calories":number,"protein":number,"carbs":number,"fats":number}
Use realistic serving sizes. Protein, carbs, fats in grams.`

const VISION_PROMPT = `You help users log meals in a fitness app (not medical advice). Look at visible foods and drinks only. List each distinct item. For each: COUNT/QUANTITY and nutrition PER UNIT (protein, carbs, fats, calories in grams/kcal).
If no food is clearly visible, respond with JSON using "ingredients": [] and a short "name" like "No food visible".
Respond ONLY with JSON:
{"name":string,"ingredients":[{"name":string,"quantity":number,"protein":number,"carbs":number,"fats":number,"calories":number}]}
Values per ingredient are PER ONE UNIT. quantity = how many in the photo.`

serve(async (req: Request) => {
    const auth = req.headers.get('Authorization')
    if (!auth) return new Response(null, { status: 401 })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const {
        data: { user },
    } = await supabase.auth.getUser(auth.replace('Bearer ', ''))
    if (!user) return new Response(null, { status: 401 })

    let body: { type: string; foodName?: string; base64Image?: string }
    try {
        body = await req.json()
    } catch {
        return new Response(null, { status: 400 })
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) return new Response('Server config error', { status: 500 })

    const isVision = body.type === 'vision' && body.base64Image
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
                            { type: 'text', text: VISION_PROMPT },
                            { type: 'image_url', image_url: { url: body.base64Image } },
                        ],
                    },
                ],
            }
        : body.type === 'text' && body.foodName ?
            {
                model: 'gpt-4-turbo',
                temperature: 0.2,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: TEXT_SYSTEM },
                    { role: 'user', content: TEXT_USER(body.foodName) },
                ],
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
