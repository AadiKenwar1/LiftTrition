-- Migration date: 2026-07-30 (audit billing-identity)
-- Webhook-fed RevenueCat entitlement mirror. Before this, fetchOpenAI and fetchFoodDB
-- called RevenueCat's REST API on every paid request (4s worst-case, hard availability
-- dependency). The revenuecatWebhook Edge Function upserts this table on every
-- RevenueCat subscription event; the shared functions/_shared/entitlement.ts that both
-- of them call reads it first and falls back to RevenueCat REST (writing the result
-- back) when the row is missing, expired, non-premium, or stale — updated_at older than
-- entitlement.ts's MIRROR_MAX_AGE_MS (24h). That staleness cap is what bounds a webhook
-- write that never landed: handleWebhook is best-effort and never asks for a redelivery,
-- so a row that stopped receiving writes is only trusted for a day.
--
-- RLS enabled with NO policies (same pattern as ai_usage in ai_usage_quota.sql):
-- clients can never read or write entitlement state; only the service-role Edge
-- Functions touch it via PostgREST.
--
-- Note: the powersync publication is FOR ALL TABLES (powersync_setup.sql), so this
-- table is auto-published — but no sync rule selects it and it is not in AppSchema.ts,
-- so clients never receive it. No PowerSync change needed.
--
-- Deploy note: run this BEFORE deploying revenuecatWebhook and the updated
-- fetchOpenAI/fetchFoodDB. Either order is safe (entitlement.ts falls back to
-- RevenueCat REST on any table error), but table-first avoids noisy error logs.

CREATE TABLE user_entitlements (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  entitlement_expires_at TIMESTAMPTZ,          -- NULL = no dated entitlement recorded
  has_lifetime BOOLEAN NOT NULL DEFAULT FALSE, -- RevenueCat expires_date:null (non-expiring)
  -- Gates the staleness cap above. DEFAULT now() fires on INSERT only and there is
  -- deliberately no touch trigger: entitlement.ts's writeEntitlementRow sends updated_at on
  -- every upsert, including the ON CONFLICT UPDATE half. Dropping it from that payload would
  -- leave a refreshed row on its old timestamp, i.e. permanently stale.
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;
-- Intentionally no CREATE POLICY statements — service-role access only (see header).
