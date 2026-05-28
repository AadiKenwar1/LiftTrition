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
    'Chest',
    'Back',
    'Shoulders',
    'Biceps',
    'Triceps',
    'Legs',
    'Core',
    'Forearms',
    'Whole Body',
]

// Muscle fatigue — keys align with MUSCLE_GROUPS
export const MUSCLE_FATIGUE_FACTORS: Record<string, number> = {
    Chest:        0.12,
    Back:         0.12,
    Shoulders:    0.10,
    Biceps:       0.05,
    Triceps:      0.08,
    Legs:         0.18,
    Core:         0.04,
    Forearms:     0.03,
    'Whole Body': 0.15,
}
