-- RULE: any new table referencing auth.users(id) MUST declare
-- ON DELETE CASCADE. Account deletion relies on auth.admin.deleteUser()
-- removing every user-owned row atomically in one transaction — a
-- non-cascading FK to auth.users blocks deletion for that user forever.

-- Re-declares every existing public-schema FK to auth.users with
-- ON DELETE CASCADE. Catalog-driven so no constraint can be missed and
-- auto-generated constraint names don't need to be known in advance.
-- Covers: settings, user_exercises, weight_progress, nutrition_entries,
-- saved_nutrition_entries, workouts, exercises, logs, support_requests.
-- (Ingredient child tables have no auth.users FK; they cascade from
-- their parent entries.)

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      con.conname,
      rel.relname AS table_name,
      pg_get_constraintdef(con.oid) AS condef
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE con.contype = 'f'
      AND nsp.nspname = 'public'
      AND con.confrelid = 'auth.users'::regclass
      AND con.confdeltype <> 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.table_name, r.conname);
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I %s ON DELETE CASCADE', r.table_name, r.conname, r.condef);
  END LOOP;
END $$;

-- Verify: must return zero rows.
-- SELECT rel.relname, con.conname
-- FROM pg_constraint con
-- JOIN pg_class rel ON rel.oid = con.conrelid
-- JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
-- WHERE con.contype = 'f'
--   AND nsp.nspname = 'public'
--   AND con.confrelid = 'auth.users'::regclass
--   AND con.confdeltype <> 'c';
