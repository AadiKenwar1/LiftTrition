import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"

//Note that you have to turn off "Verify JWT with legacy secret" in the Supabase project settings for this to work.

const TOKEN_URL = "https://oauth.fatsecret.com/connect/token"
const API_BASE = "https://platform.fatsecret.com/rest/server.api"

let cachedToken: { access_token: string; expires_at: number } | null = null
const TOKEN_BUFFER_MS = 60 * 60 * 1000

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - TOKEN_BUFFER_MS) {
    return cachedToken.access_token
  }
  const clientId = Deno.env.get("FATSECRET_CLIENT_ID")
  const clientSecret = Deno.env.get("FATSECRET_CLIENT_SECRET")
  if (!clientId || !clientSecret) throw new Error("FatSecret credentials not configured")

  const basic = encode(`${clientId}:${clientSecret}`)
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "basic" }).toString(),
  })
  if (!res.ok) throw new Error(`FatSecret token failed: ${res.status}`)
  const json = await res.json()
  const expiresIn = (json.expires_in ?? 86400) * 1000
  cachedToken = { access_token: json.access_token, expires_at: Date.now() + expiresIn }
  return cachedToken.access_token
}

async function fatSecretRequest(method: string, params: Record<string, string>): Promise<unknown> {
  const token = await getAccessToken()
  const body = new URLSearchParams({ method, format: "json", ...params })
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${token}` },
    body: body.toString(),
  })
  if (!res.ok) return null
  const text = await res.text()
  try { return JSON.parse(text) } catch { return null }
}

serve(async (req: Request) => {
  const auth = req.headers.get("Authorization")
  if (!auth) return new Response(null, { status: 401 })

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(null, { status: 401 })

  let body: { type: string; query?: string; foodId?: string }
  try { body = await req.json() } catch { return new Response(null, { status: 400 }) }

  if (body.type === "search" && body.query?.trim()) {
    const json = await fatSecretRequest("foods.search", { search_expression: body.query.trim() }) as { foods?: { food?: any[] } }
    const list = json?.foods?.food ?? []
    const results = list.map((f: any) => ({
      description: f.food_name ?? "",
      fdcId: f.food_id ?? "",
      brandName: f.brand_name,
      foodDescription: f.food_description,
    }))
    return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } })
  }

  if (body.type === "details" && body.foodId?.trim()) {
    const json = await fatSecretRequest("food.get", { food_id: body.foodId.trim() }) as { food?: any }
    const f = json?.food
    if (!f) return new Response(JSON.stringify(null), { headers: { "Content-Type": "application/json" } })
    const foodData = json.food as any
    let calories = 0, protein = 0, carbs = 0, fats = 0, servingSize = "1 serving"
    if (foodData.servings?.serving) {
      const s = Array.isArray(foodData.servings.serving) ? foodData.servings.serving[0] : foodData.servings.serving
      calories = Number(s.calories ?? 0)
      protein = Number(s.protein ?? 0)
      carbs = Number(s.carbohydrate ?? 0)
      fats = Number(s.fat ?? 0)
      servingSize = s.serving_description ?? s.measurement_description ?? "1 serving"
    }
    const details = {
      name: f.food_name ?? "",
      fdcId: f.food_id ?? body.foodId,
      calories, protein, carbs, fats,
      servingSize,
      brandName: f.brand_name ?? "",
    }
    return new Response(JSON.stringify(details), { headers: { "Content-Type": "application/json" } })
  }

  return new Response(null, { status: 400 })
})