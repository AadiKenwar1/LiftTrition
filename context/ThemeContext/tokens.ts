/**
 * Scheme-independent design tokens (radii + spacing). These never change between
 * light/dark, so they are plain constants — no hook needed. Colors, which DO vary
 * by scheme, live in colors.ts and are served reactively via useColors().
 *
 * Radii principle: large surfaces crisp, small controls round.
 */
export const radius = {
    card: 10,
    cardLg: 12,
    toggle: 9,
    toggleInner: 7,
    macroCell: 9,
    iconTile: 9,
    iconButton: 999,
    chip: 999,
    fab: 999,
} as const

export const spacing = {
    screenH: 18,
    cardPad: 14,
    cardPadLg: 16,
    cardGap: 11,
    sectionGap: 18,
} as const

export const motion = {
    imageFade: 200,
} as const
