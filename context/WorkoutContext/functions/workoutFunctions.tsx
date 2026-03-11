import { Dispatch, SetStateAction } from 'react';
import uuid from 'react-native-uuid';
import { Exercise, Log, Workout } from '../types';


//Increments the orders of all workouts by 1
export function incrementWorkoutOrders(workouts: Workout[]): Workout[] {
    return workouts.map(workout => ({ 
        ...workout, 
        order: workout.order + 1, 
        updatedAt: new Date() 
    }));
}

//Adds a new workout to the list
export function addWorkout(name: string, userId: string, setWorkouts: Dispatch<SetStateAction<Workout[]>>){
    setWorkouts(prev => {
        const incrementedWorkouts = incrementWorkoutOrders(prev);
        const newWorkout: Workout = {
            id: uuid.v4(),
            userID: userId,
            name: name,
            order: 0,
            archived: false,
            note: '',
            createdAt: new Date(),
            updatedAt: new Date(),
        }
        return [...incrementedWorkouts, newWorkout];
    })
}

//Deletes a workout and all its corresponding exercises and logs
export function deleteWorkout(id: string, setWorkouts: Dispatch<SetStateAction<Workout[]>>, setExercises: Dispatch<SetStateAction<Exercise[]>>, setLogs: Dispatch<SetStateAction<Log[]>>){
    setWorkouts(prev => prev.filter(workout => workout.id !== id));
    setExercises(prev => prev.filter(exercise => exercise.workoutID !== id));
    setLogs(prev => prev.filter(log => log.workoutID !== id));
}


//Arhives OR Unarchives a workout based on the boolean parameter
export function archiveWorkout(id: string, archived: boolean, setWorkouts: Dispatch<SetStateAction<Workout[]>>){
    if(archived){
        setWorkouts(prev => prev.map(workout => workout.id === id ? { ...workout, archived: false, order: 0, updatedAt: new Date()} : {...workout, order: workout.order + 1, updatedAt: new Date()}));
    } else {
        setWorkouts(prev => prev.map(workout => workout.id === id ? { ...workout, archived: true, updatedAt: new Date()} : workout));
    }
}


//Renames a workout
export function renameWorkout(id: string, name: string, setWorkouts: Dispatch<SetStateAction<Workout[]>>){
    setWorkouts(prev => prev.map(workout => workout.id === id ? { ...workout, name: name, updatedAt: new Date()} : workout));
}


//Updates the note of a workout
export function updateWorkoutNote(id: string, note: string, setWorkouts: Dispatch<SetStateAction<Workout[]>>){
    setWorkouts(prev => prev.map(workout => workout.id === id ? { ...workout, note: note, updatedAt: new Date()} : workout));
}


//Updates the orders of a workout when dragged
export function updateWorkoutOrder(reorderedWorkouts: Workout[], setWorkouts: Dispatch<SetStateAction<Workout[]>>){
    const updatedWorkouts = reorderedWorkouts.map((workout, index) => ({ ...workout, order: index, updatedAt: new Date()}));
    setWorkouts(prev => prev.map(workout=> {
        const updated = updatedWorkouts.find(w => w.id === workout.id);
        return updated || workout;
    }))
}
