//Estimate 1RM from weight and reps using the Epley formula
export function estimate1RM(weight: number, reps: number): number {
    if (!weight || !reps || weight <= 0 || reps <= 0) {
        return 0;
    }
    return weight * (1 + 0.0333 * reps);
}