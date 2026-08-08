-- Migration date: 2026-07-30
-- Hardens consume_ai_quota (ai_usage_quota.sql) so it can no longer be driven with
-- someone else's user id.
--
-- The function is SECURITY DEFINER over ai_usage (RLS on, no policies) and takes
-- p_user_id as a plain parameter with no identity check, while EXECUTE is still
-- granted to `authenticated` — so any signed-in account can POST
-- /rest/v1/rpc/consume_ai_quota with another user's UUID and increment that user's
-- daily counter until their cap is exhausted. Switching both Edge Functions to
-- service-role clients (fetchOpenAI/index.ts, fetchFoodDB/index.ts) removed the code's
-- dependence on that grant but not the grant itself, and the grant cannot be dropped
-- yet: the frozen camelCase fetchFoodDB deployment may still call this RPC through an
-- anon-key client that PostgREST executes as `authenticated`, and it can no longer be
-- redeployed (supabase/config.toml). This guard closes the hole without waiting for
-- that REVOKE.
--
-- The rule: a request carrying an end-user JWT may only meter itself.
--   * Service-role callers (both current Edge Functions) present a key with no `sub`
--     claim, so auth.uid() is NULL and the check is skipped — that is the trusted
--     server side, and it passes an id it verified itself via auth.getUser().
--   * An end-user JWT — the frozen camelCase fetchFoodDB's forwarded-token client, or
--     a hand-rolled PostgREST call — must pass its own id. The frozen copy reads that
--     id from the very token it forwards, so it always matches and keeps working; a
--     cross-user call now errors instead of incrementing.
--
-- The body is otherwise unchanged: still ONE INSERT ... ON CONFLICT ... RETURNING, so
-- the no-TOCTOU atomicity guarantee documented in ai_usage_quota.sql still holds (a
-- plpgsql wrapper does not split that statement into a read and a write). Grants are
-- deliberately not restated — CREATE OR REPLACE preserves the existing
-- REVOKE ... FROM PUBLIC / GRANT ... TO authenticated, service_role.
--
-- Deploy note: safe to run at any time, in either order with the Edge Functions. The
-- signature and return value are unchanged and every caller that exists today passes
-- either a service-role key or its own id, so no live path starts failing closed.

CREATE OR REPLACE FUNCTION consume_ai_quota(p_user_id UUID, p_kind TEXT, p_limit INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_within_limit BOOLEAN;
BEGIN
  -- NULL caller = no end-user identity on the request (service-role key), i.e. the
  -- Edge Functions; anyone else may only meter their own row.
  IF v_caller IS NOT NULL AND v_caller <> p_user_id THEN
    RAISE EXCEPTION 'consume_ai_quota: p_user_id must be the calling user'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO ai_usage (user_id, day, kind, count)
  VALUES (p_user_id, CURRENT_DATE, p_kind, 1)
  ON CONFLICT (user_id, day, kind)
  DO UPDATE SET count = ai_usage.count + 1
  RETURNING count <= p_limit INTO v_within_limit;

  RETURN v_within_limit;
END;
$$;
