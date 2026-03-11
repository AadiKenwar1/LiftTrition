import { ExerciseLib } from "../../types";

const tricepExercises: ExerciseLib = {
  // Triceps
  "JM Press": {
    mainMuscle: "Tricep Long Head",
    accessoryMuscles: [
      "Front Deltoid",
      "Tricep Lateral Head",
      "Tricep Medial Head",
    ],
    fatigueFactor: 1.1,
    equipment: "Barbell",
    isCompound: true,
  },
  "Close Grip Bench Press": {
    mainMuscle: "Tricep Medial Head",
    accessoryMuscles: [
      "Front Deltoid",
      "Tricep Long Head",
      "Tricep Lateral Head",
    ],
    fatigueFactor: 1.1,
    equipment: "Barbell",
    isCompound: true,
  },
  "Machine Dips": {
    mainMuscle: "",
    accessoryMuscles: [
      "Middle Chest",
      "Front Deltoid",
      "Tricep Long Head",
      "Tricep Lateral Head",
    ],
    fatigueFactor: 0.8,
    equipment: "Machine",
    isCompound: true,
  },
  Dips: {
    mainMuscle: "",
    accessoryMuscles: [
      "Middle Chest",
      "Front Deltoid",
      "Tricep Long Head",
      "Tricep Lateral Head",
    ],
    fatigueFactor: 1.1,
    equipment: "Bodyweight",
    isCompound: true,
  },
  "Machine Tricep Extensions": {
    mainMuscle: "Tricep Long Head",
    accessoryMuscles: ["Tricep Medial Head"],
    fatigueFactor: 0.5,
    equipment: "Machine",
    isCompound: false,
  },
  "Cable Tricep Extensions": {
    mainMuscle: "Tricep Long Head",
    accessoryMuscles: ["Tricep Medial Head"],
    fatigueFactor: 0.6,
    equipment: "Cable",
    isCompound: false,
  },
  "Dumbell Tricep Extensions": {
    mainMuscle: "Tricep Long Head",
    accessoryMuscles: ["Tricep Medial Head"],
    fatigueFactor: 0.7,
    equipment: "Dumbbell",
    isCompound: false,
  },
  "Cable Tricep Pushdowns": {
    mainMuscle: "Tricep Lateral Head",
    accessoryMuscles: ["Tricep Long Head"],
    fatigueFactor: 0.6,
    equipment: "Cable",
    isCompound: false,
  },
  "Dumbbell Skull Crushers": {
    mainMuscle: "Tricep Long Head",
    accessoryMuscles: ["Tricep Medial Head"],
    fatigueFactor: 0.7,
    equipment: "Dumbbell",
    isCompound: false,
  },
  "EZ Bar Skull Crushers": {
    mainMuscle: "Tricep Long Head",
    accessoryMuscles: ["Tricep Medial Head"],
    fatigueFactor: 0.7,
    equipment: "Barbell",
    isCompound: false,
  },
  "Machine Skull Crushers": {
    mainMuscle: "Tricep Long Head",
    accessoryMuscles: ["Tricep Medial Head"],
    fatigueFactor: 0.5,
    equipment: "Machine",
    isCompound: false,
  },
}

export default tricepExercises;
