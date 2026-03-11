// Equipment Types
export const EQUIPMENT_TYPES = ['Machine', 'Cable', 'Dumbbell', 'Barbell', 'Bodyweight'];

// Exercise Types
export const EXERCISE_TYPES = ['Isolation', 'Compound'];

// Equipment Multipliers (for fatigue calculation)
export const EQUIPMENT_FATIGUE_FACTORS: Record<string, number> = {
    'Machine': -0.1,
    'Cable': -0.05,
    'Dumbbell': 0.0,
    'Barbell': 0.1,
    'Bodyweight': 0.05,
  };

// Muscle Fatigue Factors
export const MUSCLE_FATIGUE_FACTORS: Record<string, number> = {
    // Simple Muscle Groups
    'Chest': 0.12,           // Average of Upper/Middle/Lower Chest
    'Back': 0.12,            // Average of Lats/Upper Back/Lower Back
    'Shoulders': 0.10,       // Average of Front/Side/Rear Deltoid
    'Legs': 0.15,            // Average of Quads/Hamstrings/Glutes
    'Biceps': 0.05,          // Average of Long Head/Short Head
    'Triceps': 0.08,         // Average of Long/Medial/Lateral Head
    'Forearms': 0.03,
    'Abs': 0.02,
    'Glutes': 0.15,
    'Quads': 0.15,
    'Hamstrings': 0.15,
    'Calves': 0.03,
    
    // Advanced Muscle Groups
    'Upper Chest': 0.12,
    'Middle Chest': 0.12,
    'Lower Chest': 0.12,
    'Lats': 0.12,
    'Upper Back': 0.12,
    'Lower Back': 0.12,
    'Traps': 0.1,
    'Front Deltoid': 0.12,
    'Side Deltoid': 0.10,
    'Rear Deltoid': 0.08,
    'Bicep Long Head': 0.05,
    'Bicep Short Head': 0.05,
    'Brachialis': 0.03,
    'Tricep Long Head': 0.08,
    'Tricep Medial Head': 0.08,
    'Tricep Lateral Head': 0.08,
    'Adductors': 0.03,
    'Abductors': 0.03,
    'Obliques': 0.02,
  };
  
  // Helper arrays for UI selection
  export const SIMPLE_MUSCLE_GROUPS = [
    'Chest', 'Back', 'Shoulders', 'Legs', 'Biceps', 'Triceps', 
    'Forearms', 'Abs', 'Glutes', 'Quads', 'Hamstrings', 'Calves'
  ];
  
  export const ADVANCED_MUSCLE_GROUPS = [
    'Upper Chest', 'Middle Chest', 'Lower Chest',
    'Lats', 'Upper Back', 'Lower Back', 'Traps',
    'Front Deltoid', 'Side Deltoid', 'Rear Deltoid',
    'Bicep Long Head', 'Bicep Short Head', 'Brachialis',
    'Tricep Long Head', 'Tricep Medial Head', 'Tricep Lateral Head',
    'Adductors', 'Abductors', 'Obliques', 'Glutes', 'Quads', 'Hamstrings', 'Calves', 'Hip Flexors'
  ];
  
  // All muscle groups combined
  export const ALL_MUSCLE_GROUPS = [...SIMPLE_MUSCLE_GROUPS, ...ADVANCED_MUSCLE_GROUPS];