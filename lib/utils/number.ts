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

// Shared non-finite guard: returns n unchanged when finite, otherwise a caller-supplied fallback.
function preserveFinite(n: number, fallback: number): number {
    return Number.isFinite(n) ? n : fallback
}

// Item quantity is a multiplier (not a macro) that sumItems re-consumes to
// reconstruct the entry total on every save, so it must persist at full
// precision. An explicit 0 (the "excluded item" marker) is preserved;
// non-finite input falls back to the neutral multiplier 1.
export function sanitizeQuantity(n: number): number {
    return preserveFinite(n, 1)
}

// Per-unit item macro (protein/carbs/fats/calories), persisted at full
// precision — unlike sanitizeMacro, which rounds a genuinely displayed/total
// value — because sumItems re-multiplies this exact value by quantity on
// every subsequent save. Non-finite input falls back to 0, matching
// sanitizeMacro's contract (a macro has no "neutral" 1).
export function sanitizeExactMacro(n: number): number {
    return preserveFinite(n, 0)
}
