import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"
import { hasPremiumEntitlement } from "../_shared/entitlement.ts"

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

// Per-user/day cap (audit C1) — env-configurable, safe default. A single 'foodsearch' kind
// covers both manual search (foodDBModal) and details lookups, including the up-to-5 search +
// 5 details calls a photo/label scan makes via enrichBrandedItem (context/NutritionContext/
// functions/aiFunctions.tsx, MAX_BRANDED_ENRICH=5). Sized generously (well above any realistic
// manual-search volume) specifically so routine scanning cannot starve manual search — the
// alternative (a separate 'enrich' kind) was rejected here to keep this a self-contained
// Edge-Function-only change; see the ai_usage_quota.sql migration for the quota mechanics.
const FOODSEARCH_DAILY_LIMIT = () => Number(Deno.env.get("AI_FOODSEARCH_DAILY_LIMIT") ?? "300")

// Atomically increments today's usage counter for (user, kind) and reports whether the caller
// is still within limit. Fails closed: any RPC/DB error (including the RPC not existing yet) is
// treated as "blocked" so an outage can never reopen the unbounded-spend hole this closes.
async function consumeQuota(supabase: ReturnType<typeof createClient>, userId: string, kind: string, limit: number): Promise<boolean> {
  const { data, error } = await supabase.rpc("consume_ai_quota", { p_user_id: userId, p_kind: kind, p_limit: limit })
  if (error) {
    console.error("[fetchFoodDB] consume_ai_quota error", kind, error)
    return false
  }
  return data === true
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

  // Quota runs under service-role (like fetchOpenAI), not the caller's JWT — the RPC's
  // p_user_id is the server-verified id above, and metering must not depend on
  // consume_ai_quota staying EXECUTE-granted to the authenticated role.
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

  // Server-side premium gate (audit H1) — must pass before any quota is consumed or any
  // paid provider is called; the client's hasPremium check is UX-only and never trusted.
  if (!(await hasPremiumEntitlement(user.id))) {
    return new Response(JSON.stringify({ error: "premium_required" }), { status: 403, headers: { "Content-Type": "application/json" } })
  }

  let body: { type: string; query?: string; foodId?: string }
  try { body = await req.json() } catch { return new Response(null, { status: 400 }) }

  if (body.type === "search" && body.query?.trim()) {
    const allowed = await consumeQuota(admin, user.id, "foodsearch", FOODSEARCH_DAILY_LIMIT())
    if (!allowed) return new Response(JSON.stringify({ error: "quota_exceeded" }), { status: 429, headers: { "Content-Type": "application/json" } })

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
    const allowed = await consumeQuota(admin, user.id, "foodsearch", FOODSEARCH_DAILY_LIMIT())
    if (!allowed) return new Response(JSON.stringify({ error: "quota_exceeded" }), { status: 429, headers: { "Content-Type": "application/json" } })

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