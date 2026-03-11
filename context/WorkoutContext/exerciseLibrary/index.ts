import { ScrollableListItem } from "@/components/NeutralComponents/ScrollableList";
import { ExerciseLib } from "../types";
import backExercises from "./data/backExercises";
import bicepExercises from "./data/bicepExercises";
import chestExercises from "./data/chestExercises";
import legExercises from "./data/legExercises";
import shoulderExercises from "./data/shoulderExercises";
import tricepExercises from "./data/tricepExercises";


/**
 * FATIGUE FACTORS
 * Machine Isolation - 0.5
 * Cable Isolation - 0.6
 * Dumbbell Isolation - 0.7
 * Machine Compound - 0.8
 * Cable Compound - 0.8
 * Dumbbell Compound - 1
 * Barbell Compound - 1.1
 */



const exercises = {
  ...chestExercises,
  ...backExercises,
  ...shoulderExercises,
  ...tricepExercises,
  ...bicepExercises,
  ...legExercises
}

function sortListAlphabetically (list: ExerciseLib){
  const entries = Object.entries(list);
  entries.sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries);
}

export function convertExerciseLibraryToList(library: ExerciseLib): ScrollableListItem[] {
  return Object.entries(library).map(([name, exercise]) => {
    const muscles = [exercise.mainMuscle, ...exercise.accessoryMuscles].join(' • ');
    return {
      id: name,
      title: name,
      exerciseMetadata: {
        equipment: exercise.equipment,
        muscles: muscles,
      },
    };
  });
}

const exerciseLib: ExerciseLib = sortListAlphabetically(exercises);
const exerciseLibAsList: ScrollableListItem[] = convertExerciseLibraryToList(exerciseLib);

export { exerciseLib, exerciseLibAsList };
