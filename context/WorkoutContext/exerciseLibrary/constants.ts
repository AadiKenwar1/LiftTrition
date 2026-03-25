// Equipment Types
export const EQUIPMENT_TYPES = ['Machine', 'Cable', 'Dumbbell', 'Barbell', 'Bodyweight']

// Exercise Types
export const EXERCISE_TYPES = ['Isolation', 'Compound']

// Equipment Multipliers (for fatigue calculation)
export const EQUIPMENT_FATIGUE_FACTORS: Record<string, number> = {
    Machine: -0.1,
    Cable: -0.05,
    Dumbbell: 0.0,
    Barbell: 0.1,
    Bodyweight: 0.05,
}

/** Single list for custom exercise muscle selection (create exercise flow). */
export const MUSCLE_GROUPS = [
    // Chest
    'Upper Chest',
    'Lower Chest',

    // Back
    'Upper/Mid Back',
    'Lats',
    'Lower Back',

    // Shoulders
    'Front Delts',
    'Side Delts',
    'Rear Delts',

    // Arms
    'Biceps',
    'Triceps',
    'Forearms',

    // Core
    'Abs',
    'Obliques',

    // Lower Body
    'Glutes',
    'Quads',
    'Hamstrings',
    'Adductors',
    'Abductors',
    'Calves',
]

// Muscle fatigue — keys align with MUSCLE_GROUPS
export const MUSCLE_FATIGUE_FACTORS: Record<string, number> = {
    'Upper Chest': 0.12,
    'Lower Chest': 0.12,
    'Upper/Mid Back': 0.12,
    Lats: 0.12,
    'Lower Back': 0.12,
    'Front Delts': 0.12,
    'Side Delts': 0.1,
    'Rear Delts': 0.08,
    Biceps: 0.05,
    Triceps: 0.08,
    Forearms: 0.03,
    Abs: 0.02,
    Obliques: 0.02,
    Glutes: 0.15,
    Quads: 0.15,
    Hamstrings: 0.15,
    Adductors: 0.03,
    Abductors: 0.03,
    Calves: 0.03,
}
