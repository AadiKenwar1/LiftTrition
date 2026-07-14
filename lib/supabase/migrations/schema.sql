-- Settings table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  birth_date DATE,
  gender TEXT,
  height REAL,
  body_weight REAL,
  unit_system TEXT,
  activity_level TEXT,
  goal_type TEXT,
  goal_weight REAL,
  goal_pace REAL,
  calorie_goal INTEGER,
  protein_goal INTEGER,
  carbs_goal INTEGER,
  fats_goal INTEGER,
  onboarding_complete BOOLEAN DEFAULT false,
  onboarding_completed_at DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User-created exercises table (only custom exercises, not the static library)
CREATE TABLE user_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  main_muscle TEXT NOT NULL,
  accessory_muscles TEXT[] NOT NULL DEFAULT '{}',
  fatigue_factor REAL NOT NULL,
  equipment TEXT NOT NULL,
  is_compound BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Users weight progress table
CREATE TABLE weight_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  weight REAL NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Nutrition items table (actual logged meals)
CREATE TABLE nutrition_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  time BIGINT NOT NULL,
  protein REAL NOT NULL,
  carbs REAL NOT NULL,
  fats REAL NOT NULL,
  calories REAL NOT NULL,
  is_photo BOOLEAN DEFAULT false,
  photo_uri TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Nutrition item ingredients table
CREATE TABLE nutrition_entry_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutrition_entry_id UUID NOT NULL REFERENCES nutrition_entries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  protein REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  fats REAL NOT NULL DEFAULT 0,
  calories REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Saved nutrition items table
CREATE TABLE saved_nutrition_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  protein REAL NOT NULL,
  carbs REAL NOT NULL,
  fats REAL NOT NULL,
  calories REAL NOT NULL,
  is_photo BOOLEAN DEFAULT false,
  photo_uri TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Saved nutrition item ingredients table
CREATE TABLE saved_nutrition_entry_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  saved_nutrition_entry_id UUID NOT NULL REFERENCES saved_nutrition_entries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  protein REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  fats REAL NOT NULL DEFAULT 0,
  calories REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workouts table
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  archived BOOLEAN DEFAULT false,
  note TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Exercises table (exercises within workouts - different from custom_exercises)
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  user_max REAL DEFAULT 0,
  "order" INTEGER NOT NULL,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Logs table (logs for each exercise in a workout)
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time BIGINT NOT NULL DEFAULT 0,
  weight REAL NOT NULL,
  reps INTEGER NOT NULL,
  rpe REAL NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_settings_user_id ON settings(user_id);
CREATE INDEX idx_user_exercises_user_id ON user_exercises(user_id);
CREATE INDEX idx_weight_progress_user_id ON weight_progress(user_id);
CREATE INDEX idx_weight_progress_date ON weight_progress(date);
CREATE INDEX idx_nutrition_entries_user_id ON nutrition_entries(user_id);
CREATE INDEX idx_nutrition_entries_date ON nutrition_entries(date);
CREATE INDEX idx_nutrition_entry_ingredients_nutrition_entry_id ON nutrition_entry_ingredients(nutrition_entry_id);
CREATE INDEX idx_saved_nutrition_entries_user_id ON saved_nutrition_entries(user_id);
CREATE INDEX idx_saved_nutrition_entry_ingredients_saved_entry_id ON saved_nutrition_entry_ingredients(saved_nutrition_entry_id);
CREATE INDEX idx_exercises_workout_id ON exercises(workout_id);
CREATE INDEX idx_exercises_user_id ON exercises(user_id);
CREATE INDEX idx_logs_exercise_id ON logs(exercise_id);
CREATE INDEX idx_logs_workout_id ON logs(workout_id);
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_date ON logs(date);
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
