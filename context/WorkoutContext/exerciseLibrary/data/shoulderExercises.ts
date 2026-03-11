import { ExerciseLib } from "../../types";

const shoulderExercises: ExerciseLib = {
  // Front Delt
  "Dumbbell Shoulder Press": {
    mainMuscle: "Front Deltoid",
    accessoryMuscles: ["Side Deltoid"],
    fatigueFactor: 1.0,
    equipment: "Dumbbell",
    isCompound: true,
  },
  "Barbell Shoulder Press": {
    mainMuscle: "Front Deltoid",
    accessoryMuscles: ["Side Deltoid"],
    fatigueFactor: 1.1,
    equipment: "Barbell",
    isCompound: true,
  },
  "Military Press": {
    mainMuscle: "Front Deltoid",
    accessoryMuscles: ["Side Deltoid"],
    fatigueFactor: 1.1,
    equipment: "Barbell",
    isCompound: true,
  },
  "Machine Shoulder Press": {
    mainMuscle: "Front Deltoid",
    accessoryMuscles: ["Side Deltoid"],
    fatigueFactor: 0.8,
    equipment: "Machine",
    isCompound: true,
  },

  // Lateral Delt
  "Dumbbell Lateral Raises": {
    mainMuscle: "Side Deltoid",
    accessoryMuscles: [],
    fatigueFactor: 0.7,
    equipment: "Dumbbell",
    isCompound: false,
  },
  "Cable Lateral Raises": {
    mainMuscle: "Side Deltoid",
    accessoryMuscles: [],
    fatigueFactor: 0.6,
    equipment: "Cable",
    isCompound: false,
  },
  "Machine Lateral Raises": {
    mainMuscle: "Side Deltoid",
    accessoryMuscles: [],
    fatigueFactor: 0.5,
    equipment: "Machine",
    isCompound: false,
  },

  // Rear Delt
  "Rear Delt Fly": {
    mainMuscle: "Rear Deltoid",
    accessoryMuscles: ["Upper Back"],
    fatigueFactor: 0.7,
    equipment: "Dumbbell",
    isCompound: false,
  },
  "Cable Rear Delt Fly": {
    mainMuscle: "Rear Deltoid",
    accessoryMuscles: ["Upper Back"],
    fatigueFactor: 0.6,
    equipment: "Cable",
    isCompound: false,
  },
  "Face Pull": {
    mainMuscle: "Rear Deltoid",
    accessoryMuscles: ["Upper Back", "Traps"],
    fatigueFactor: 0.8,
    equipment: "Cable",
    isCompound: true,
  },
  "Dumbbell Y Raises": {
    mainMuscle: "Rear Deltoid",
    accessoryMuscles: ["Traps", "Side Deltoid"],
    fatigueFactor: 0.7,
    equipment: "Dumbbell",
    isCompound: false,
  },
}

export default shoulderExercises;
