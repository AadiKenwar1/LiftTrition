import { column, Schema, Table } from '@powersync/react-native';

// Settings table
const settings = new Table({
  user_id: column.text,
  birth_date: column.text,
  gender: column.text,
  height: column.real,
  body_weight: column.real,
  unit_system: column.text,
  activity_level: column.text,
  goal_type: column.text,
  goal_weight: column.real,
  goal_pace: column.real,
  calorie_goal: column.integer,
  protein_goal: column.integer,
  carbs_goal: column.integer,
  fats_goal: column.integer,
  onboarding_complete: column.integer,
  onboarding_completed_at: column.text,
  macros_customized: column.integer,
  goal_overshoot_acknowledged: column.integer,
  created_at: column.text,
  updated_at: column.text
});

// User exercises table
const user_exercises = new Table({
  user_id: column.text,
  name: column.text,
  main_muscle: column.text,
  accessory_muscles: column.text,
  fatigue_factor: column.real,
  equipment: column.text,
  is_compound: column.integer,
  created_at: column.text,
  updated_at: column.text
}, {
  indexes: { user_id: ['user_id'] }
});

// Weight progress table
const weight_progress = new Table({
  user_id: column.text,
  date: column.text,
  weight: column.real,
  created_at: column.text,
  updated_at: column.text
}, {
  indexes: { user_id: ['user_id'], date: ['date'] }
});

// Nutrition entries table
const nutrition_entries = new Table({
  user_id: column.text,
  name: column.text,
  date: column.text,
  time: column.integer,
  protein: column.real,
  carbs: column.real,
  fats: column.real,
  calories: column.real,
  is_photo: column.integer,
  photo_uri: column.text,
  created_at: column.text,
  updated_at: column.text
}, {
  indexes: { user_id: ['user_id'], date: ['date'] }
});

// Nutrition entry ingredients table
const nutrition_entry_ingredients = new Table({
  nutrition_entry_id: column.text,
  name: column.text,
  quantity: column.real,
  protein: column.real,
  carbs: column.real,
  fats: column.real,
  calories: column.real,
  created_at: column.text
}, {
  indexes: { nutrition_entry_id: ['nutrition_entry_id'] }
});

// Saved nutrition entries table
const saved_nutrition_entries = new Table({
  user_id: column.text,
  name: column.text,
  protein: column.real,
  carbs: column.real,
  fats: column.real,
  calories: column.real,
  is_photo: column.integer,
  photo_uri: column.text,
  created_at: column.text,
  updated_at: column.text
}, {
  indexes: { user_id: ['user_id'] }
});

// Saved nutrition entry ingredients table
const saved_nutrition_entry_ingredients = new Table({
  saved_nutrition_entry_id: column.text,
  name: column.text,
  quantity: column.real,
  protein: column.real,
  carbs: column.real,
  fats: column.real,
  calories: column.real,
  created_at: column.text
}, {
  indexes: { saved_nutrition_entry_id: ['saved_nutrition_entry_id'] }
});

// Workouts table
const workouts = new Table({
  user_id: column.text,
  name: column.text,
  order: column.integer,
  archived: column.integer,
  note: column.text,
  created_at: column.text,
  updated_at: column.text
}, {
  indexes: { user_id: ['user_id'] }
});

// Exercises table
const exercises = new Table({
  user_id: column.text,
  workout_id: column.text,
  name: column.text,
  user_max: column.real,
  order: column.integer,
  archived: column.integer,
  created_at: column.text,
  updated_at: column.text
}, {
  indexes: { workout_id: ['workout_id'], user_id: ['user_id'] }
});

// Logs table
const logs = new Table({
  user_id: column.text,
  workout_id: column.text,
  exercise_id: column.text,
  date: column.text,
  time: column.integer,
  weight: column.real,
  reps: column.integer,
  rpe: column.real,
  created_at: column.text,
  updated_at: column.text
}, {
  indexes: { 
    exercise_id: ['exercise_id'],
    workout_id: ['workout_id'],
    user_id: ['user_id'],
    date: ['date']
  }
});

export const AppSchema = new Schema({
  settings,
  user_exercises,
  weight_progress,
  nutrition_entries,
  nutrition_entry_ingredients,
  saved_nutrition_entries,
  saved_nutrition_entry_ingredients,
  workouts,
  exercises,
  logs
});

// Type exports
export type Database = (typeof AppSchema)['types'];
export type SettingsRecord = Database['settings'];
export type UserExerciseRecord = Database['user_exercises'];
export type WeightProgressRecord = Database['weight_progress'];
export type NutritionEntryRecord = Database['nutrition_entries'];
export type NutritionEntryIngredientRecord = Database['nutrition_entry_ingredients'];
export type SavedNutritionEntryRecord = Database['saved_nutrition_entries'];
export type SavedNutritionEntryIngredientRecord = Database['saved_nutrition_entry_ingredients'];
export type WorkoutRecord = Database['workouts'];
export type ExerciseRecord = Database['exercises'];
export type LogRecord = Database['logs'];
