import type { ColorScheme } from '@/context/ThemeContext'

export const AppAssets = {
    logoLight: require('@/assets/images/LogoWhite.png'),
    logoDark: require('@/assets/images/LogoBlack.png'),
    appIcon: require('@/assets/images/PlatesAppIcon.png'),
} as const

export const logoForScheme = (scheme: ColorScheme) => (scheme === 'light' ? AppAssets.logoLight : AppAssets.logoDark)
