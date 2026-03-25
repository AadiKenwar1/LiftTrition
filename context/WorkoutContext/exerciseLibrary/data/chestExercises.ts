import { ExerciseLib } from '../../types'

const chestExercises: ExerciseLib = {
    // Incline Press
    'Incline Bench Press': {
        mainMuscle: 'Upper Chest',
        accessoryMuscles: ['Lower Chest', 'Front Delts', 'Triceps'],
        fatigueFactor: 1.1,
        equipment: 'Barbell',
        isCompound: true,
    },
    'Incline Dumbbell Bench press': {
        mainMuscle: 'Upper Chest',
        accessoryMuscles: ['Lower Chest', 'Front Delts', 'Triceps'],
        fatigueFactor: 1.0,
        equipment: 'Dumbbell',
        isCompound: true,
    },
    'Incline Smith Machine Bench Press': {
        mainMuscle: 'Upper Chest',
        accessoryMuscles: ['Lower Chest', 'Front Delts', 'Triceps'],
        fatigueFactor: 0.8,
        equipment: 'Machine',
        isCompound: true,
    },
    'Machine Chest Press': {
        mainMuscle: 'Lower Chest',
        accessoryMuscles: ['Upper Chest', 'Front Delts', 'Triceps'],
        fatigueFactor: 0.8,
        equipment: 'Machine',
        isCompound: true,
    },
    'Machine Incline Chest Press': {
        mainMuscle: 'Upper Chest',
        accessoryMuscles: ['Lower Chest', 'Front Delts', 'Triceps'],
        fatigueFactor: 0.8,
        equipment: 'Machine',
        isCompound: true,
    },

    // Chest Flys
    'Chest Fly Machine': {
        mainMuscle: 'Lower Chest',
        accessoryMuscles: ['Upper Chest', 'Front Delts'],
        fatigueFactor: 0.5,
        equipment: 'Machine',
        isCompound: false,
    },
    'Pec Dec Machine': {
        mainMuscle: 'Lower Chest',
        accessoryMuscles: ['Upper Chest', 'Front Delts'],
        fatigueFactor: 0.5,
        equipment: 'Machine',
        isCompound: false,
    },
    'Dumbbell Chest Flys': {
        mainMuscle: 'Lower Chest',
        accessoryMuscles: ['Upper Chest', 'Front Delts'],
        fatigueFactor: 0.7,
        equipment: 'Dumbbell',
        isCompound: false,
    },
    'Incline Dumbbell Chest Flys': {
        mainMuscle: 'Upper Chest',
        accessoryMuscles: ['Lower Chest', 'Front Delts'],
        fatigueFactor: 0.7,
        equipment: 'Dumbbell',
        isCompound: false,
    },
    'Cable Chest Flys': {
        mainMuscle: 'Lower Chest',
        accessoryMuscles: ['Upper Chest', 'Front Delts'],
        fatigueFactor: 0.6,
        equipment: 'Cable',
        isCompound: false,
    },

    // Flat Press
    'Barbell Bench Press': {
        mainMuscle: 'Lower Chest',
        accessoryMuscles: ['Upper Chest', 'Front Delts', 'Triceps'],
        fatigueFactor: 1,
        equipment: 'Barbell',
        isCompound: true,
    },
    'Dumbbell Bench Press': {
        mainMuscle: 'Lower Chest',
        accessoryMuscles: ['Upper Chest', 'Front Delts', 'Triceps'],
        fatigueFactor: 1.0,
        equipment: 'Dumbbell',
        isCompound: true,
    },
    'Machine Bench Press': {
        mainMuscle: 'Lower Chest',
        accessoryMuscles: ['Upper Chest', 'Front Delts', 'Triceps'],
        fatigueFactor: 0.8,
        equipment: 'Machine',
        isCompound: true,
    },
    'Smith Machine Bench Press': {
        mainMuscle: 'Lower Chest',
        accessoryMuscles: ['Upper Chest', 'Front Delts', 'Triceps'],
        fatigueFactor: 0.8,
        equipment: 'Machine',
        isCompound: true,
    },
}

export default chestExercises
