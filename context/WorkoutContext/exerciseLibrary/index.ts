import { ScrollableListItem } from "@/components/NeutralComponents/ScrollableList";
import { calculateFatigueFactor } from '../functions/fatigueFunctions';
import { ExerciseLib } from "../types";
import backData      from './dataV2/exerciseLists/backExercises.json';
import chestData     from './dataV2/exerciseLists/chestExercises.json';
import shouldersData from './dataV2/exerciseLists/shouldersExercises.json';
import tricepsData   from './dataV2/exerciseLists/tricepsExercises.json';
import bicepsData    from './dataV2/exerciseLists/bicepsExercises.json';
import legsData      from './dataV2/exerciseLists/legsExercises.json';
import coreData      from './dataV2/exerciseLists/coreExercises.json';
import forearmsData  from './dataV2/exerciseLists/forearmsExercises.json';
import wholebodyData from './dataV2/exerciseLists/wholebodyExercises.json';

interface V2Entry {
    imgUrl: string
    mainMuscle: string
    equipment: string
    isCompound: boolean
}

// Builds the exercise library from the V2 data
function buildFromV2(data: Record<string, V2Entry>): ExerciseLib {
    const lib: ExerciseLib = {}
    for (const [name, entry] of Object.entries(data)) {
        lib[name] = {
            mainMuscle: entry.mainMuscle,
            fatigueFactor: calculateFatigueFactor(entry.isCompound, entry.mainMuscle, entry.equipment),
            equipment: entry.equipment,
            isCompound: entry.isCompound,
            imgUrl: entry.imgUrl,
        }
    }
    return lib
}

// Sorts the exercise library alphabetically
function sortListAlphabetically(list: ExerciseLib): ExerciseLib {
    const entries = Object.entries(list);
    entries.sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries);
}

// Converts the exercise library to a list of scrollable list items
export function convertExerciseLibraryToList(library: ExerciseLib): ScrollableListItem[] {
    return Object.entries(library).map(([name, exercise]) => ({
        id: name,
        title: name,
        exerciseMetadata: {
            equipment: exercise.equipment,
            muscles: exercise.mainMuscle,
            imgUrl: exercise.imgUrl,
        },
    }));
}

// Builds the exercise library from the V2 data
const allExercises: ExerciseLib = {
    ...buildFromV2(backData      as Record<string, V2Entry>),
    ...buildFromV2(chestData     as Record<string, V2Entry>),
    ...buildFromV2(shouldersData as Record<string, V2Entry>),
    ...buildFromV2(tricepsData   as Record<string, V2Entry>),
    ...buildFromV2(bicepsData    as Record<string, V2Entry>),
    ...buildFromV2(legsData      as Record<string, V2Entry>),
    ...buildFromV2(coreData      as Record<string, V2Entry>),
    ...buildFromV2(forearmsData  as Record<string, V2Entry>),
    ...buildFromV2(wholebodyData as Record<string, V2Entry>),
}

const exerciseLib: ExerciseLib = sortListAlphabetically(allExercises);
const exerciseLibAsList: ScrollableListItem[] = convertExerciseLibraryToList(exerciseLib);

export { exerciseLib, exerciseLibAsList };
