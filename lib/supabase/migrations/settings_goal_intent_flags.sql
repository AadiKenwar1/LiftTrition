-- Migration date: 2026-07-14 (issue 8)
-- Two intent flags for the weigh-in rules: hand-tuned-macros protection and
-- the "Keep Going" auto-switch disarm.
--
-- Deploy note: run in Supabase BEFORE or WITH the app release. Sync rules use
-- SELECT * so no sync-rules change is needed; the UPDATE below touches every
-- row so PowerSync replicates the new columns to existing clients.

ALTER TABLE settings ADD COLUMN IF NOT EXISTS macros_customized boolean NOT NULL DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS goal_overshoot_acknowledged boolean NOT NULL DEFAULT false;

UPDATE settings SET updated_at = now();
