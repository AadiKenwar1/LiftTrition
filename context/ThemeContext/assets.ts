import type { ColorScheme } from './types'

export const brandAssets = {
    logoLight: require('@/assets/images/LogoWhite.png'),
    logoDark: require('@/assets/images/LogoBlack.png'),
    appIcon: require('@/assets/images/PlatesAppIcon.png'),
} as const

export const logoForScheme = (scheme: ColorScheme) => (scheme === 'light' ? brandAssets.logoLight : brandAssets.logoDark)
