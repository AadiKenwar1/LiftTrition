import { ExerciseLib } from '../../types'

const shoulderExercises: ExerciseLib = {
    // Front Delt
    'Dumbbell Shoulder Press': {
        mainMuscle: 'Front Delts',
        accessoryMuscles: ['Side Delts'],
        fatigueFactor: 1.0,
        equipment: 'Dumbbell',
        isCompound: true,
    },
    'Barbell Shoulder Press': {
        mainMuscle: 'Front Delts',
        accessoryMuscles: ['Side Delts'],
        fatigueFactor: 1.1,
        equipment: 'Barbell',
        isCompound: true,
    },
    'Military Press': {
        mainMuscle: 'Front Delts',
        accessoryMuscles: ['Side Delts'],
        fatigueFactor: 1.1,
        equipment: 'Barbell',
        isCompound: true,
    },
    'Machine Shoulder Press': {
        mainMuscle: 'Front Delts',
        accessoryMuscles: ['Side Delts'],
        fatigueFactor: 0.8,
        equipment: 'Machine',
        isCompound: true,
    },

    // Lateral Delt
    'Dumbbell Lateral Raises': {
        mainMuscle: 'Side Delts',
        accessoryMuscles: [],
        fatigueFactor: 0.7,
        equipment: 'Dumbbell',
        isCompound: false,
    },
    'Cable Lateral Raises': {
        mainMuscle: 'Side Delts',
        accessoryMuscles: [],
        fatigueFactor: 0.6,
        equipment: 'Cable',
        isCompound: false,
    },
    'Machine Lateral Raises': {
        mainMuscle: 'Side Delts',
        accessoryMuscles: [],
        fatigueFactor: 0.5,
        equipment: 'Machine',
        isCompound: false,
    },

    // Rear Delt
    'Rear Delt Fly': {
        mainMuscle: 'Rear Delts',
        accessoryMuscles: ['Upper/Mid Back'],
        fatigueFactor: 0.7,
        equipment: 'Dumbbell',
        isCompound: false,
    },
    'Cable Rear Delt Fly': {
        mainMuscle: 'Rear Delts',
        accessoryMuscles: ['Upper/Mid Back'],
        fatigueFactor: 0.6,
        equipment: 'Cable',
        isCompound: false,
    },
    'Face Pull': {
        mainMuscle: 'Rear Delts',
        accessoryMuscles: ['Upper/Mid Back'],
        fatigueFactor: 0.8,
        equipment: 'Cable',
        isCompound: true,
    },
    'Dumbbell Y Raises': {
        mainMuscle: 'Rear Delts',
        accessoryMuscles: ['Upper/Mid Back', 'Side Delts'],
        fatigueFactor: 0.7,
        equipment: 'Dumbbell',
        isCompound: false,
    },
}

export default shoulderExercises
