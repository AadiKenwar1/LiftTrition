/** Total inches → { feet, inches } — inches kept to 1 decimal place */
export function inchesToFeetInches(totalInches: number): { feet: number; inches: number } {
    const feet = Math.floor(totalInches / 12)
    const inches = Math.round((totalInches % 12) * 100) / 100
    return { feet, inches }
}

/** feet + inches → total inches */
export function feetInchesToInches(feet: number, inches: number): number {
    return feet * 12 + inches
}

/** inches → cm */
export function inchesToCm(inches: number): number {
    return Math.round(inches * 2.54)
}

/** cm → total inches */
export function cmToInches(cm: number): number {
    return cm / 2.54
}

/** lbs → kg (1 decimal place) */
export function lbsToKg(lbs: number): number {
    return Math.round((lbs / 2.20462) * 10) / 10
}

/** kg → lbs (1 decimal place) */
export function kgToLbs(kg: number): number {
    return Math.round((kg * 2.20462) * 10) / 10
}
