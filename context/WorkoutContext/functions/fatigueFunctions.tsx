import { EQUIPMENT_FATIGUE_FACTORS, MUSCLE_FATIGUE_FACTORS } from '../exerciseLibrary/constants';
import { Exercise, ExerciseLib, Log } from '../types';
import { estimate1RM } from './oneRepMaxFunctions';


// Configuration constants
const DAILY_BUDGET = 600;

const FREQUENCY_MULTIPLIERS: Record<string, number> = {
    'sedentary': 0.966,
    'light': 0.95,
    'moderate': 0.933,
    'active': 0.9,
    'gymrat': 0.85,
};


//Calculate fatigue percentage for the last X days
export function calculateFatiguePercentage(numDays: number, logs: Log[], exercises: Exercise[], fullExerciseLib: ExerciseLib, activityLevel: string = 'moderate'): number {
    if (logs.length === 0) return 0;

    const frequencyMultiplier = FREQUENCY_MULTIPLIERS[activityLevel] || 0.933;
    const exerciseMap = new Map(exercises.map(exercise => [exercise.id, exercise]));
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - numDays);
    
    let totalFatigue = 0;

    for (const log of logs) {
        // Skip invalid logs
        if (log.reps <= 0 || log.weight <= 0) continue;
        
        // Skip logs outside date range
        if (log.date < cutoffDate) continue;

        //Get the exercise the log is for
        const exercise = exerciseMap.get(log.exerciseID);
        if (!exercise) continue;

        //Find the exercises definition and get the fatigue factor
        const exerciseDef = fullExerciseLib[exercise.name];
        if (!exerciseDef?.fatigueFactor) continue;

        // Calculate current max (use estimated 1RM if higher than recorded max)
        const estimatedMax = estimate1RM(log.weight, log.reps);
        const currentMax = Math.max(exercise.userMax || 0, estimatedMax);
        if (currentMax === 0) continue; //Avoids division by zero

        // Calculate fatigue for this set
        const setFatigue = log.reps * (log.weight / currentMax) * (log.rpe || 7) * exerciseDef.fatigueFactor * frequencyMultiplier;
        totalFatigue += setFatigue;
    }

    const dailyBudget = DAILY_BUDGET * numDays;
    const percentage = (totalFatigue / dailyBudget) * 100;

    return Math.max(0, percentage);
}


//Feedback messages based on fatigue percentages
export function getFatigueFeedback(percentage: number): string {
    if (percentage > 100) {
        return "You pushed yourself to the limit! We suggest you prioritize recovery to maximize these gains.";
    }
    if (percentage > 75) {
        return "You worked hard today! Keep pushing your limits, but don't forget to get enough sleep and nutrition.";
    }
    if (percentage > 50) {
        return "Strong training session! You're in the optimal zone for sustainable progress.";
    }
    if (percentage > 25) {
        return "Productive light session! Perfect for technique refinement and active recovery.";
    }
    if (percentage > 0) {
        return "Seems like you did some light training today! Even light training maintains your momentum and builds consistency.";
    }
    return "Recovery mode active! Your body is adapting and growing stronger during this rest.";
}


//Calculate fatigue factor for user added exercise
export function calculateFatigueFactor(isCompound: boolean, mainMuscle: string, accessoryMuscles: string[], equipment: string): number {
    const baseFatigue = isCompound ? 0.7 : 0.5;
    const mainMuscleFatigue = MUSCLE_FATIGUE_FACTORS[mainMuscle] || 0.08;    
    const accessoryFatigue = accessoryMuscles.length > 0
      ? Math.min(
          accessoryMuscles.reduce((total, muscle) => {
            return total + (MUSCLE_FATIGUE_FACTORS[muscle] || 0.05) * 0.5;
          }, 0),
          0.2
        )
      : 0;    
    
    const equipmentFatigue = EQUIPMENT_FATIGUE_FACTORS[equipment] || 0.0;
    const fatigue = baseFatigue + mainMuscleFatigue + accessoryFatigue + equipmentFatigue;
    return Math.min(1.1, Math.max(0.5, parseFloat(fatigue.toFixed(2))));
  }
  