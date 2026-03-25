import { ExerciseLib } from '../../types'

const tricepExercises: ExerciseLib = {
    // Triceps
    'JM Press': {
        mainMuscle: 'Triceps',
        accessoryMuscles: ['Front Delts'],
        fatigueFactor: 1.1,
        equipment: 'Barbell',
        isCompound: true,
    },
    'Close Grip Bench Press': {
        mainMuscle: 'Triceps',
        accessoryMuscles: ['Front Delts'],
        fatigueFactor: 1.1,
        equipment: 'Barbell',
        isCompound: true,
    },
    'Machine Dips': {
        mainMuscle: 'Triceps',
        accessoryMuscles: ['Lower Chest', 'Front Delts'],
        fatigueFactor: 0.8,
        equipment: 'Machine',
        isCompound: true,
    },
    Dips: {
        mainMuscle: 'Triceps',
        accessoryMuscles: ['Lower Chest', 'Front Delts'],
        fatigueFactor: 1.1,
        equipment: 'Bodyweight',
        isCompound: true,
    },
    'Machine Tricep Extensions': {
        mainMuscle: 'Triceps',
        accessoryMuscles: [],
        fatigueFactor: 0.5,
        equipment: 'Machine',
        isCompound: false,
    },
    'Cable Tricep Extensions': {
        mainMuscle: 'Triceps',
        accessoryMuscles: [],
        fatigueFactor: 0.6,
        equipment: 'Cable',
        isCompound: false,
    },
    'Dumbell Tricep Extensions': {
        mainMuscle: 'Triceps',
        accessoryMuscles: [],
        fatigueFactor: 0.7,
        equipment: 'Dumbbell',
        isCompound: false,
    },
    'Cable Tricep Pushdowns': {
        mainMuscle: 'Triceps',
        accessoryMuscles: [],
        fatigueFactor: 0.6,
        equipment: 'Cable',
        isCompound: false,
    },
    'Dumbbell Skull Crushers': {
        mainMuscle: 'Triceps',
        accessoryMuscles: [],
        fatigueFactor: 0.7,
        equipment: 'Dumbbell',
        isCompound: false,
    },
    'EZ Bar Skull Crushers': {
        mainMuscle: 'Triceps',
        accessoryMuscles: [],
        fatigueFactor: 0.7,
        equipment: 'Barbell',
        isCompound: false,
    },
    'Machine Skull Crushers': {
        mainMuscle: 'Triceps',
        accessoryMuscles: [],
        fatigueFactor: 0.5,
        equipment: 'Machine',
        isCompound: false,
    },
}

export default tricepExercises
