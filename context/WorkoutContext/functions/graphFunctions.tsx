import { formatDateMinimal, getDateKey } from "@/lib/utils/dateHelper";
import { Exercise, Log } from "../types";
import { estimate1RM } from "./oneRepMaxFunctions";



//Group logs by date for a specific exercise, return a map of key: date, value: [logs] (last 21 dates)
export function groupAllExerciseLogsByDate(exerciseName: string, exercises: Exercise[], logs: Log[]): Array<[string, Log[]]> {
    // Find all exercises with this name
    const exerciseIDs = exercises.filter(ex => ex.name === exerciseName).map(ex => ex.id);
    
    // Filter logs for this exercise and sort by date (newest first)
    const exerciseLogs = logs.filter(log => exerciseIDs.includes(log.exerciseID)).sort((a, b) => b.date.getTime() - a.date.getTime());
    
    // Group by date, stopping after 21 unique dates
    const grouped: Record<string, Log[]> = {};
    const dateOrder: string[] = [];
    
    for (const log of exerciseLogs) {
        const dateKey = getDateKey(log.date);
        if (!grouped[dateKey]) {
            // Stop once we have 21 dates
            if (dateOrder.length >= 21) {
                break; 
            }
            grouped[dateKey] = [];
            dateOrder.push(dateKey);
        }
        
        grouped[dateKey].push(log);
    }
    return dateOrder.reverse().map(date => [date, grouped[date]]);
}


// Get highest 1RM per date for an exercise (last 21 dates), formatted for Graph component [day: date, value: 1RM]
export function getOneRepMaxData(exerciseName: string, exercises: Exercise[], logs: Log[]): Array<{ day: string; value: number }> {
    // Get grouped logs by date
    const groupedLogs = groupAllExerciseLogsByDate(exerciseName, exercises, logs);
    
    // For each date, find the highest estimated 1RM and convert to graph format
    return groupedLogs.map(([date, logsForDate]) => {
        const maxRM = Math.max(...logsForDate.map(log => estimate1RM(log.weight, log.reps)));
        
        return {
            day: formatDateMinimal(date),  // "1/15"
            value: Math.round(maxRM)
        };
    });
}