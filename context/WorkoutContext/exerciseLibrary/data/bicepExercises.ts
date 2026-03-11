import { ExerciseLib } from "../../types";

const bicepExercises: ExerciseLib = {
  // Biceps
  "Dumbbell Hammer Curls": {
    mainMuscle: "Brachialis",
    accessoryMuscles: ["Bicep Long Head", "Forearms"],
    fatigueFactor: 0.7,
    equipment: "Dumbbell",
    isCompound: false,
  },
  "Cable Hammer Curls": {
    mainMuscle: "Brachialis",
    accessoryMuscles: ["Bicep Long Head", "Forearms"],
    fatigueFactor: 0.6,
    equipment: "Cable",
    isCompound: false,
  },
  "Bayesian Curls": {
    mainMuscle: "Bicep Long Head",
    accessoryMuscles: ["Brachialis"],
    fatigueFactor: 0.6,
    equipment: "Cable",
    isCompound: false,
  },
  "Incline Curl": {
    mainMuscle: "Bicep Long Head",
    accessoryMuscles: ["Brachialis"],
    fatigueFactor: 0.7,
    equipment: "Dumbbell",
    isCompound: false,
  },
  "Dumbbell Preacher Curl": {
    mainMuscle: "Bicep Short Head",
    accessoryMuscles: ["Forearms"],
    fatigueFactor: 0.7,
    equipment: "Dumbbell",
    isCompound: false,
  },
  "Machine Preacher Curls": {
    mainMuscle: "Bicep Short Head",
    accessoryMuscles: ["Forearms"],
    fatigueFactor: 0.5,
    equipment: "Machine",
    isCompound: false,
  },
  "Machine Curls": {
    mainMuscle: "Bicep Short Head",
    accessoryMuscles: ["Forearms"],
    fatigueFactor: 0.5,
    equipment: "Machine",
    isCompound: false,
  },
  "Dumbbell Curls": {
    mainMuscle: "Bicep Short Head",
    accessoryMuscles: ["Bicep Long Head", "Forearms"],
    fatigueFactor: 0.7,
    equipment: "Dumbbell",
    isCompound: false,
  },
  "EZ Bar Curls": {
    mainMuscle: "Bicep Short Head",
    accessoryMuscles: ["Brachialis", "Forearms"],
    fatigueFactor: 0.7,
    equipment: "Barbell",
    isCompound: false,
  },
  "Concentration Curls": {
    mainMuscle: "Bicep Short Head",
    accessoryMuscles: ["Forearms"],
    fatigueFactor: 0.7,
    equipment: "Dumbbell",
    isCompound: false,
  },
  "Spider Curls": {
    mainMuscle: "Bicep Long Head",
    accessoryMuscles: ["Brachialis"],
    fatigueFactor: 0.7,
    equipment: "Dumbbell",
    isCompound: false,
  },
  "Alternating Curls": {
    mainMuscle: "Bicep Short Head",
    accessoryMuscles: ["Brachialis", "Forearms"],
    fatigueFactor: 0.7,
    equipment: "Dumbbell",
    isCompound: false,
  },
  "Reverse Grip Curls": {
    mainMuscle: "Forearms",
    accessoryMuscles: ["Brachialis"],
    fatigueFactor: 0.7,
    equipment: "Barbell",
    isCompound: false,
  },
}

export default bicepExercises;
