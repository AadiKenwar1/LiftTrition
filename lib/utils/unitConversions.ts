/** Total inches → { feet, inches } */
export function inchesToFeetInches(totalInches: number): { feet: number; inches: number } {
    const feet = Math.floor(totalInches / 12)
    const inches = Math.round(totalInches % 12)
    return { feet, inches }
}

/** feet + inches → total inches */
export function feetInchesToInches(feet: number, inches: number): number {
    return feet * 12 + inches
}
