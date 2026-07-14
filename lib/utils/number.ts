export function parseNumericInput(text: string): number | null {
    const trimmed = text.trim()
    if (trimmed === '') {
        return null
    }
    const normalized = trimmed.replace(',', '.')
    const parsed = Number(normalized)
    if (Number.isFinite(parsed)) {
        return parsed
    }
    return null
}

export function sanitizeInt(n: number): number {
    if (!Number.isFinite(n)) {
        return 0
    }
    return Math.round(n)
}

export function sanitizeMacro(n: number): number {
    if (!Number.isFinite(n)) {
        return 0
    }
    return Math.round(n * 10) / 10
}
