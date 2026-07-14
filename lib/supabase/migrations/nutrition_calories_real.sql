-- Migration date: 2026-07-13
-- Decimal calories are now allowed in the product.
-- The ingredient tables already use REAL for calories;
-- this migration brings the nutrition_entries and saved_nutrition_entries
-- tables into consistency.
--
-- Deploy note: run this in Supabase BEFORE or WITH the app release.
-- This alone un-jams users currently wedged on a decimal calorie row.

ALTER TABLE nutrition_entries ALTER COLUMN calories TYPE real USING calories::real;
ALTER TABLE saved_nutrition_entries ALTER COLUMN calories TYPE real USING calories::real;
