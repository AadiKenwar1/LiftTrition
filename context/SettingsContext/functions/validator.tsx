import { Alert } from 'react-native'

const MIN_HEIGHT_IMPERIAL = 24
const MIN_HEIGHT_METRIC = 60
const MIN_WEIGHT_IMPERIAL = 50
const MIN_WEIGHT_METRIC = 20

export function validateHeightWeight(height: number, weight: number, unitSystem: 'imperial' | 'metric'): boolean {
    const minH = unitSystem === 'imperial' ? MIN_HEIGHT_IMPERIAL : MIN_HEIGHT_METRIC
    const minW = unitSystem === 'imperial' ? MIN_WEIGHT_IMPERIAL : MIN_WEIGHT_METRIC
    if (height < minH) {
        Alert.alert('Invalid Input', `Height must be at least ${minH} ${unitSystem === 'imperial' ? 'inches' : 'cm'}`, [{ text: 'OK' }])
        return false
    }
    if (weight < minW) {
        Alert.alert('Invalid Input', `Weight must be at least ${minW} ${unitSystem === 'imperial' ? 'lbs' : 'kg'}`, [{ text: 'OK' }])
        return false
    }
    return true
}

export function validateTargetWeight(targetWeight: number, currentWeight: number, goal: 'lose' | 'gain' | 'maintain' | null, unitSystem: 'imperial' | 'metric'): boolean {
    if (goal === 'maintain' || goal === null) return true
    if (targetWeight === 0 || targetWeight === undefined || Number.isNaN(targetWeight)) {
        Alert.alert('Target Weight Required', 'Please enter a valid target weight.', [{ text: 'OK' }])
        return false
    }
    const minWeight = unitSystem === 'imperial' ? MIN_WEIGHT_IMPERIAL : MIN_WEIGHT_METRIC
    if (targetWeight < minWeight) {
        Alert.alert('Invalid Input', `Target weight must be at least ${minWeight} ${unitSystem === 'imperial' ? 'lbs' : 'kg'}`, [{ text: 'OK' }])
        return false
    }
    if (goal === 'lose' && targetWeight >= currentWeight) {
        Alert.alert('Target Weight Required', 'Please enter a target weight that is less than your current body weight.', [{ text: 'OK' }])
        return false
    }
    if (goal === 'gain' && targetWeight <= currentWeight) {
        Alert.alert('Target Weight Required', 'Please enter a target weight that is greater than your current body weight.', [{ text: 'OK' }])
        return false
    }
    return true
}
