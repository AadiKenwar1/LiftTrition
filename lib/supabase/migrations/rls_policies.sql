-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
-- This file enables RLS and creates policies for all tables
-- to ensure users can only access their own data.
-- ============================================

-- ============================================
-- Enable Row Level Security on all tables
-- ============================================

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_entry_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_nutrition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_nutrition_entry_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Settings Policies
-- ============================================

-- Users can view their own settings
CREATE POLICY "Users can view own settings"
  ON settings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own settings"
  ON settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own settings"
  ON settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own settings
CREATE POLICY "Users can delete own settings"
  ON settings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- User Exercises Policies
-- ============================================

CREATE POLICY "Users can view own exercises"
  ON user_exercises FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercises"
  ON user_exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercises"
  ON user_exercises FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercises"
  ON user_exercises FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Weight Progress Policies
-- ============================================

CREATE POLICY "Users can view own weight progress"
  ON weight_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight progress"
  ON weight_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight progress"
  ON weight_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight progress"
  ON weight_progress FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Nutrition Entries Policies
-- ============================================

CREATE POLICY "Users can view own nutrition entries"
  ON nutrition_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nutrition entries"
  ON nutrition_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nutrition entries"
  ON nutrition_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own nutrition entries"
  ON nutrition_entries FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Nutrition Entry Ingredients Policies
-- Users can only access ingredients for their own nutrition entries
-- ============================================

CREATE POLICY "Users can view own nutrition entry ingredients"
  ON nutrition_entry_ingredients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_entries
      WHERE nutrition_entries.id = nutrition_entry_ingredients.nutrition_entry_id
      AND nutrition_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own nutrition entry ingredients"
  ON nutrition_entry_ingredients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nutrition_entries
      WHERE nutrition_entries.id = nutrition_entry_ingredients.nutrition_entry_id
      AND nutrition_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own nutrition entry ingredients"
  ON nutrition_entry_ingredients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_entries
      WHERE nutrition_entries.id = nutrition_entry_ingredients.nutrition_entry_id
      AND nutrition_entries.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nutrition_entries
      WHERE nutrition_entries.id = nutrition_entry_ingredients.nutrition_entry_id
      AND nutrition_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own nutrition entry ingredients"
  ON nutrition_entry_ingredients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_entries
      WHERE nutrition_entries.id = nutrition_entry_ingredients.nutrition_entry_id
      AND nutrition_entries.user_id = auth.uid()
    )
  );

-- ============================================
-- Saved Nutrition Entries Policies
-- ============================================

CREATE POLICY "Users can view own saved nutrition entries"
  ON saved_nutrition_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved nutrition entries"
  ON saved_nutrition_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved nutrition entries"
  ON saved_nutrition_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved nutrition entries"
  ON saved_nutrition_entries FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Saved Nutrition Entry Ingredients Policies
-- Users can only access ingredients for their own saved nutrition entries
-- ============================================

CREATE POLICY "Users can view own saved nutrition entry ingredients"
  ON saved_nutrition_entry_ingredients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM saved_nutrition_entries
      WHERE saved_nutrition_entries.id = saved_nutrition_entry_ingredients.saved_nutrition_entry_id
      AND saved_nutrition_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own saved nutrition entry ingredients"
  ON saved_nutrition_entry_ingredients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM saved_nutrition_entries
      WHERE saved_nutrition_entries.id = saved_nutrition_entry_ingredients.saved_nutrition_entry_id
      AND saved_nutrition_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own saved nutrition entry ingredients"
  ON saved_nutrition_entry_ingredients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM saved_nutrition_entries
      WHERE saved_nutrition_entries.id = saved_nutrition_entry_ingredients.saved_nutrition_entry_id
      AND saved_nutrition_entries.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM saved_nutrition_entries
      WHERE saved_nutrition_entries.id = saved_nutrition_entry_ingredients.saved_nutrition_entry_id
      AND saved_nutrition_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own saved nutrition entry ingredients"
  ON saved_nutrition_entry_ingredients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM saved_nutrition_entries
      WHERE saved_nutrition_entries.id = saved_nutrition_entry_ingredients.saved_nutrition_entry_id
      AND saved_nutrition_entries.user_id = auth.uid()
    )
  );

-- ============================================
-- Workouts Policies
-- ============================================

CREATE POLICY "Users can view own workouts"
  ON workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts"
  ON workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workouts"
  ON workouts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts"
  ON workouts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Exercises Policies
-- Users can only access exercises in their own workouts
-- ============================================

CREATE POLICY "Users can view own exercises"
  ON exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own exercises"
  ON exercises FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own exercises"
  ON exercises FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own exercises"
  ON exercises FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  );

-- ============================================
-- Logs Policies
-- Users can only access logs for their own exercises/workouts
-- ============================================

CREATE POLICY "Users can view own logs"
  ON logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exercises
      JOIN workouts ON workouts.id = exercises.workout_id
      WHERE exercises.id = logs.exercise_id
      AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own logs"
  ON logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM exercises
      JOIN workouts ON workouts.id = exercises.workout_id
      WHERE exercises.id = logs.exercise_id
      AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own logs"
  ON logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM exercises
      JOIN workouts ON workouts.id = exercises.workout_id
      WHERE exercises.id = logs.exercise_id
      AND workouts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM exercises
      JOIN workouts ON workouts.id = exercises.workout_id
      WHERE exercises.id = logs.exercise_id
      AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own logs"
  ON logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM exercises
      JOIN workouts ON workouts.id = exercises.workout_id
      WHERE exercises.id = logs.exercise_id
      AND workouts.user_id = auth.uid()
    )
  );
