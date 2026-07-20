-- Migration date: 2026-07-19 (audit C1)
-- Per-user/day quota metering for the paid AI/food-DB Edge Functions
-- (fetchOpenAI, fetchFoodDB). Before this, both functions did a single JWT
-- check then dispatched straight to OpenAI/Gemini/FatSecret with no rate
-- limit, quota, or cap — any signed-in account could script the vision
-- endpoint in a loop for unbounded paid-API spend.
--
-- ai_usage has RLS enabled with NO policies: that denies ALL client access
-- (select/insert/update/delete) to both the anon and authenticated roles, so
-- the only way to read or mutate the counter is the SECURITY DEFINER
-- function below, which the two Edge Functions call with the user id they
-- already verified server-side (never a client-supplied body field).
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

-- New functions default to EXECUTE granted to PUBLIC in Postgres; revoke that first so only
-- the two intended callers can invoke it (fetchOpenAI's service-role client and fetchFoodDB's
-- anon-key-plus-forwarded-JWT client, which PostgREST executes as the `authenticated` role).
REVOKE ALL ON FUNCTION consume_ai_quota(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_ai_quota(UUID, TEXT, INTEGER) TO authenticated, service_role;
