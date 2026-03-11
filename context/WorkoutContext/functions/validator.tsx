import { Alert } from 'react-native';


//Validates the log entry before adding
export function validateLog(weight: number, reps: number, rpe: number): boolean {
    if (weight < 0) {
        Alert.alert('Invalid Input', 'Weight cannot be negative');
        return false;
    }
    if (reps < 0) {
        Alert.alert('Invalid Input', 'Reps cannot be negative');
        return false;
    }
    if (rpe < 0) {
        Alert.alert('Invalid Input', 'RPE cannot be negative');
        return false;
    }
    if (rpe > 10) {
        Alert.alert('Invalid Input', 'RPE must be between 0-10');
        return false;
    }
    
    return true;
}