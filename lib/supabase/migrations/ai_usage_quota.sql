-- Migration date: 2026-07-19 (audit C1)
-- Per-user/day quota metering for the paid AI/food-DB Edge Functions
-- (fetchOpenAI, fetchFoodDB). Before this, both functions did a single JWT
-- check then dispatched straight to OpenAI/Gemini/FatSecret with no rate
-- limit, quota, or cap — any signed-in account could script the vision
-- endpoint in a loop for unbounded paid-API spend.
--
-- ai_usage has RLS enabled with NO policies: that denies ALL client access
-- (select/insert/update/delete) to both the anon and authenticated roles.
-- The intended mutation path is the SECURITY DEFINER function below, called
-- by the two Edge Functions with the user id they already verified
-- server-side (never a client-supplied body field). NOTE: as written below the
-- function is ALSO reachable directly via PostgREST RPC by any authenticated
-- user, who can pass any existing user's UUID — worst case is burning that
-- user's daily counter (the function only ever increments and returns a
-- boolean, so no table access and no free AI calls: the premium/quota gates
-- live in the Edge Functions). That cross-user call is rejected by the
-- replacement body in ai_usage_quota_caller_guard.sql, which does not wait on
-- the deferred REVOKE below; the REVOKE stays queued as follow-up cleanup.
--
-- Day is keyed on CURRENT_DATE, i.e. the database's own UTC day boundary —
-- deliberately NOT the app's local (en-CA) getDateKey day. This is a known,
-- accepted simplification: a user's daily cap resets at UTC midnight, not
-- their local midnight.
--
-- Deploy note: run this in Supabase BEFORE or WITH the Edge Function release
-- that starts calling consume_ai_quota. The RPC call fails closed on error,
-- so deploying this migration first is safe; deploying the functions first
-- (RPC not found yet) is also safe (every request fails closed to 429/500),
-- just noisier — apply the migration first to avoid that window.

CREATE TABLE ai_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  kind TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, kind)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
-- Intentionally no CREATE POLICY statements — see header note above.

-- Atomically increments today's (user_id, kind) counter and reports whether the caller is
-- still within p_limit. A single INSERT ... ON CONFLICT ... RETURNING is one atomic
-- statement, so concurrent callers cannot race past the cap: the (limit+1)th request always
-- observes count > p_limit and gets false, with no read-then-write window (no TOCTOU).
CREATE OR REPLACE FUNCTION consume_ai_quota(p_user_id UUID, p_kind TEXT, p_limit INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO ai_usage (user_id, day, kind, count)
  VALUES (p_user_id, CURRENT_DATE, p_kind, 1)
  ON CONFLICT (user_id, day, kind)
  DO UPDATE SET count = ai_usage.count + 1
  RETURNING count <= p_limit;
$$;

-- New functions default to EXECUTE granted to PUBLIC in Postgres; revoke that first.
-- Both current Edge Functions (fetchOpenAI, fetchFoodDB) now call this via service-role
-- clients, so only service_role is still needed. The `authenticated` grant exists for the
-- frozen legacy camelCase fetchFoodDB, whose deployed copy may still call the RPC through
-- an anon-key client executing as `authenticated` and cannot be redeployed (see
-- supabase/config.toml).
--
-- Deferred cleanup — run once the camelCase functions are deleted (or once the deployed
-- camelCase fetchFoodDB is confirmed to predate this 2026-07-19 migration, i.e. it never
-- calls the RPC at all):
--   REVOKE EXECUTE ON FUNCTION consume_ai_quota(UUID, TEXT, INTEGER) FROM authenticated;
-- Revoking before then would, if that frozen copy does call the RPC, fail it closed and
-- 429 food search on every pre-lowercase install. It is cleanup rather than the fix
-- because ai_usage_quota_caller_guard.sql already blocks the cross-user call this grant
-- would otherwise allow: an end-user JWT may only meter its own row, which is all the
-- frozen copy ever asks for.
REVOKE ALL ON FUNCTION consume_ai_quota(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_ai_quota(UUID, TEXT, INTEGER) TO authenticated, service_role;
