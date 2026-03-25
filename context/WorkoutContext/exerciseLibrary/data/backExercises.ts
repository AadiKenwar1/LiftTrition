import { ExerciseLib } from '../../types'

const backExercises: ExerciseLib = {
    // Pulldowns
    'Wide-Grip Lat Pulldown': {
        mainMuscle: 'Lats',
        accessoryMuscles: ['Upper/Mid Back', 'Rear Delts'],
        fatigueFactor: 0.8,
        equipment: 'Cable',
        isCompound: true,
    },
    'Close-Grip Lat Pulldown': {
        mainMuscle: 'Lats',
        accessoryMuscles: ['Rear Delts'],
        fatigueFactor: 0.8,
        equipment: 'Cable',
        isCompound: true,
    },
    'Reverse-Grip Lat Pulldown': {
        mainMuscle: 'Lats',
        accessoryMuscles: ['Rear Delts', 'Biceps'],
        fatigueFactor: 0.8,
        equipment: 'Cable',
        isCompound: true,
    },
    'Neutral Lat Pulldown': {
        mainMuscle: 'Lats',
        accessoryMuscles: ['Upper/Mid Back', 'Rear Delts'],
        fatigueFactor: 0.8,
        equipment: 'Cable',
        isCompound: true,
    },
    'Lat Pulldown': {
        mainMuscle: 'Lats',
        accessoryMuscles: ['Upper/Mid Back', 'Rear Delts'],
        fatigueFactor: 0.8,
        equipment: 'Cable',
        isCompound: true,
    },
    'Pull Ups': {
        mainMuscle: 'Lats',
        accessoryMuscles: ['Upper/Mid Back', 'Rear Delts', 'Forearms'],
        fatigueFactor: 1.1,
        equipment: 'Bodyweight',
        isCompound: true,
    },
    'Machine Lat Pulldown': {
        mainMuscle: 'Lats',
        accessoryMuscles: ['Upper/Mid Back', 'Rear Delts'],
        fatigueFactor: 0.8,
        equipment: 'Machine',
        isCompound: true,
    },

    // Rows
    'Cable Wide-Grip Seated Row': {
        mainMuscle: 'Upper/Mid Back',
        accessoryMuscles: ['Lats', 'Rear Delts'],
        fatigueFactor: 0.8,
        equipment: 'Cable',
        isCompound: true,
    },
    'Cable Close-Grip Seated Row': {
        mainMuscle: 'Lats',
        accessoryMuscles: ['Upper/Mid Back'],
        fatigueFactor: 0.8,
        equipment: 'Cable',
        isCompound: true,
    },
    'Cable Reverse-Grip Seated Row': {
        mainMuscle: 'Lats',
        accessoryMuscles: ['Upper/Mid Back', 'Rear Delts', 'Biceps'],
        fatigueFactor: 0.8,
        equipment: 'Cable',
        isCompound: true,
    },
    'Cable Seated Row': {
        mainMuscle: 'Lats',
        accessoryMuscles: ['Upper/Mid Back', 'Rear Delts'],
        fatigueFactor: 0.8,
        equipment: 'Cable',
        isCompound: true,
    },
    'Machine Seated Row': {
        mainMuscle: 'Lats',
        accessoryMuscles: ['Upper/Mid Back', 'Rear Delts'],
        fatigueFactor: 0.8,
        equipment: 'Machine',
        isCompound: true,
    },
    'Barbell Row': {
        mainMuscle: 'Upper/Mid Back',
        accessoryMuscles: ['Lats', 'Lower Back', 'Rear Delts', 'Forearms'],
        fatigueFactor: 1.1,
        equipment: 'Barbell',
        isCompound: true,
    },
    'Dumbbell Row': {
        mainMuscle: 'Upper/Mid Back',
        accessoryMuscles: ['Lats', 'Rear Delts', 'Forearms'],
        fatigueFactor: 1.0,
        equipment: 'Dumbbell',
        isCompound: true,
    },
    'Cable High Row': {
        mainMuscle: 'Upper/Mid Back',
        accessoryMuscles: ['Lats', 'Rear Delts'],
        fatigueFactor: 0.8,
        equipment: 'Cable',
        isCompound: true,
    },
    'Cable Low Row': {
        mainMuscle: 'Lats',
        accessoryMuscles: ['Upper/Mid Back', 'Rear Delts'],
        fatigueFactor: 0.8,
        equipment: 'Cable',
        isCompound: true,
    },
    'Barbell T Bar Row': {
        mainMuscle: 'Upper/Mid Back',
        accessoryMuscles: ['Lats', 'Lower Back', 'Rear Delts', 'Forearms'],
        fatigueFactor: 1.1,
        equipment: 'Barbell',
        isCompound: true,
    },
    'Machine T Bar Row': {
        mainMuscle: 'Upper/Mid Back',
        accessoryMuscles: ['Lats', 'Rear Delts'],
        fatigueFactor: 0.8,
        equipment: 'Machine',
        isCompound: true,
    },

    // Back Misc
    'Barbell Shrugs': {
        mainMuscle: 'Upper/Mid Back',
        accessoryMuscles: ['Forearms'],
        fatigueFactor: 1.1,
        equipment: 'Barbell',
        isCompound: false,
    },
    'Dumbbell Shrugs': {
        mainMuscle: 'Upper/Mid Back',
        accessoryMuscles: ['Forearms'],
        fatigueFactor: 1.0,
        equipment: 'Dumbbell',
        isCompound: false,
    },
    'Machine Shrugs': {
        mainMuscle: 'Upper/Mid Back',
        accessoryMuscles: ['Forearms'],
        fatigueFactor: 0.8,
        equipment: 'Machine',
        isCompound: false,
    },
    'Back Extensions': {
        mainMuscle: 'Lower Back',
        accessoryMuscles: ['Glutes', 'Hamstrings'],
        fatigueFactor: 0.8,
        equipment: 'Machine',
        isCompound: false,
    },
}

export default backExercises
