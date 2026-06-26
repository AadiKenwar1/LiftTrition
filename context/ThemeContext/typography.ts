import type { TextStyle } from 'react-native'

/**
 * Flip this single constant to A/B-test the whole app's typeface.
 * Both families are loaded in app/_layout.tsx, so either resolves at runtime.
 */
export const FONT_FAMILY: 'poppins' | 'archivo' = 'archivo'

type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold'

const POPPINS: Record<Weight, string> = {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semibold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
    extrabold: 'Poppins_800ExtraBold',
}

const ARCHIVO: Record<Weight, string> = {
    regular: 'Archivo_400Regular',
    medium: 'Archivo_500Medium',
    semibold: 'Archivo_600SemiBold',
    bold: 'Archivo_700Bold',
    extrabold: 'Archivo_800ExtraBold',
}

export const fonts: Record<Weight, string> = FONT_FAMILY === 'archivo' ? ARCHIVO : POPPINS

/** Semantic type roles from the handoff scale. Sizes/tracking are final; family follows FONT_FAMILY. */
export const type = {
    screenTitle: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.5 },
    sectionTitle: { fontFamily: fonts.extrabold, fontSize: 19, letterSpacing: -0.4 },
    cardTitle: { fontFamily: fonts.bold, fontSize: 16 },
    heroNumber: { fontFamily: fonts.extrabold, fontSize: 22 },
    value: { fontFamily: fonts.bold, fontSize: 14 },
    body: { fontFamily: fonts.regular, fontSize: 14 },
    caption: { fontFamily: fonts.medium, fontSize: 12 },
} satisfies Record<string, TextStyle>
