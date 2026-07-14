-- TEST — not a migration. Run in the Supabase SQL editor AFTER
-- migrations/user_cascade.sql. Self-cleaning: on PASS the test user and
-- all seeded rows are gone (deleting them IS the test); on FAIL the
-- exception rolls back the transaction, leaving the database untouched.
-- Expected output: NOTICE "PASS: ..."

DO $$
DECLARE
  uid  UUID := gen_random_uuid();
  wid  UUID;
  eid  UUID;
  nid  UUID;
  sid  UUID;
  bad_fks INTEGER;
  leftover INTEGER;
BEGIN
  -- 0) The migration must already be applied: no non-cascading FKs to auth.users.
  SELECT count(*) INTO bad_fks
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE con.contype = 'f'
    AND nsp.nspname = 'public'
    AND con.confrelid = 'auth.users'::regclass
    AND con.confdeltype <> 'c';
  IF bad_fks > 0 THEN
    RAISE EXCEPTION 'FAIL: % FK(s) to auth.users still lack ON DELETE CASCADE — run user_cascade.sql first', bad_fks;
  END IF;

  -- 1) Synthetic user (never touches Apple Sign-In or the app).
  INSERT INTO auth.users (instance_id, id, aud, role, email, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
          'cascade-test-' || uid || '@example.invalid', now(), now());

  -- 2) One row in every user-owned table, including the full child chains
  --    and the support_requests row that used to block deletion forever.
  INSERT INTO settings (user_id) VALUES (uid);
  INSERT INTO user_exercises (user_id, name, main_muscle, fatigue_factor, equipment, is_compound)
  VALUES (uid, 'cascade test exercise', 'Chest', 1.0, 'Barbell', true);
  INSERT INTO weight_progress (user_id, date, weight) VALUES (uid, CURRENT_DATE, 180);
  INSERT INTO nutrition_entries (user_id, name, date, time, protein, carbs, fats, calories)
  VALUES (uid, 'cascade test meal', CURRENT_DATE, 0, 10, 10, 10, 170) RETURNING id INTO nid;
  INSERT INTO nutrition_entry_ingredients (nutrition_entry_id, name) VALUES (nid, 'cascade test ingredient');
  INSERT INTO saved_nutrition_entries (user_id, name, protein, carbs, fats, calories)
  VALUES (uid, 'cascade test saved meal', 10, 10, 10, 170) RETURNING id INTO sid;
  INSERT INTO saved_nutrition_entry_ingredients (saved_nutrition_entry_id, name) VALUES (sid, 'cascade test ingredient');
  INSERT INTO workouts (user_id, name, "order") VALUES (uid, 'cascade test workout', 0) RETURNING id INTO wid;
  INSERT INTO exercises (user_id, workout_id, name, "order") VALUES (uid, wid, 'cascade test exercise', 0) RETURNING id INTO eid;
  INSERT INTO logs (user_id, workout_id, exercise_id, date, weight, reps, rpe)
  VALUES (uid, wid, eid, CURRENT_DATE, 135, 5, 8);
  INSERT INTO support_requests (user_id, subject, message)
  VALUES (uid, 'cascade test', 'this row used to make account deletion impossible');

  -- 3) The deletion under test — same FK cascades auth.admin.deleteUser() triggers.
  DELETE FROM auth.users WHERE id = uid;

  -- 4) Nothing may survive, anywhere.
  SELECT (SELECT count(*) FROM auth.users WHERE id = uid)
       + (SELECT count(*) FROM settings WHERE user_id = uid)
       + (SELECT count(*) FROM user_exercises WHERE user_id = uid)
       + (SELECT count(*) FROM weight_progress WHERE user_id = uid)
       + (SELECT count(*) FROM nutrition_entries WHERE user_id = uid)
       + (SELECT count(*) FROM nutrition_entry_ingredients WHERE nutrition_entry_id = nid)
       + (SELECT count(*) FROM saved_nutrition_entries WHERE user_id = uid)
       + (SELECT count(*) FROM saved_nutrition_entry_ingredients WHERE saved_nutrition_entry_id = sid)
       + (SELECT count(*) FROM workouts WHERE user_id = uid)
       + (SELECT count(*) FROM exercises WHERE user_id = uid)
       + (SELECT count(*) FROM logs WHERE user_id = uid)
       + (SELECT count(*) FROM support_requests WHERE user_id = uid)
  INTO leftover;
  IF leftover > 0 THEN
    RAISE EXCEPTION 'FAIL: % row(s) survived account deletion', leftover;
  END IF;

  RAISE NOTICE 'PASS: user and all rows across 12 tables deleted by a single auth.users delete';
END $$;
