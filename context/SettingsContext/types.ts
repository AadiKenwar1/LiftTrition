
import type { Dispatch, SetStateAction } from 'react'

export interface Settings {
    onboardingComplete: boolean;
    onboardingCompletedAt: Date | undefined;
    birthDate: Date;
    gender: 'male' | 'female';
    height: number;
    bodyWeight: number;
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'gymrat';
    unitSystem: 'imperial' | 'metric';
    goalType: 'lose' | 'gain' | 'maintain';
    goalWeight: number;
    goalPace: number;
    calorieGoal: number;
    proteinGoal: number;
    carbsGoal: number;
    fatsGoal: number;
}

export interface BodyWeightProgress {
    id: string;
    userId: string;
    date: Date;
    weight: number;
    createdAt: Date;
    updatedAt: Date;

}


export interface SettingsContextInterface {
    settings: Settings;
    setSettings: Dispatch<SetStateAction<Settings>>;
    mode: boolean;
    setMode: (mode: boolean) => void;
    bwProgress: Record<string, number>;
    handleUpdateBw: (updatedWeight: number) => void;
    handleGetBodyWeightProgressData: (onboardingCompletedAt?: Date) => Array<{ day: string; value: number }>;
    calculateMacros: (settings: Settings, isImperial?: boolean) => {
        calResult: number;
        proteinGrams: number;
        fatGrams: number;
        carbGrams: number;
    };
    loaded: boolean;
    loadFailed: boolean;
    retryLoad: () => void;
}