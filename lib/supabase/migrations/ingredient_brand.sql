-- Per-item brand persistence (universal item editor, 2026-07-15).
-- Additive + nullable: safe to run immediately; old clients ignore the column.
-- MUST be applied in Supabase BEFORE any build that writes brand ships (the
-- Connector's generic upsert sends brand in opData; a missing column would
-- wedge the upload queue). Sync rules are SELECT * — no dashboard change.
ALTER TABLE nutrition_entry_ingredients ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE saved_nutrition_entry_ingredients ADD COLUMN IF NOT EXISTS brand text;
