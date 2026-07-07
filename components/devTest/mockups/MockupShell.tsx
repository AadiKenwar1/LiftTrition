import { fonts, radius, useColorScheme, useColors, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { SlidersHorizontal, X } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Field, Segmented } from '../DevControls'

/**
 * Full-bleed wrapper for App Store mockup scenes. The scene renders edge-to-edge;
 * dev chrome (theme toggle, scene controls, exit) lives in a collapsible overlay,
 * and "Hide chrome" removes every dev pixel for 4 s so a clean screenshot can be taken.
 */
export default function MockupShell({ children, controls, padTop }: { children: ReactNode; controls?: ReactNode; padTop?: boolean }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const insets = useSafeAreaInsets()
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()
    const [sheetOpen, setSheetOpen] = useState(false)
    const [chromeHidden, setChromeHidden] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(
        () => () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        },
        [],
    )

    const hideChrome = () => {
        setSheetOpen(false)
        setChromeHidden(true)
        timerRef.current = setTimeout(() => setChromeHidden(false), 4000)
    }

    return (
        <View style={[styles.root, padTop && { paddingTop: insets.top }]}>
            {children}
            {!chromeHidden && (
                <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                    {sheetOpen ?
                        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
                            <View style={styles.sheetHeader}>
                                <Text style={styles.sheetTitle}>Mockup controls</Text>
                                <TouchableOpacity onPress={() => setSheetOpen(false)} hitSlop={12} activeOpacity={0.6}>
                                    <X size={18} color={colors.textSecondary} strokeWidth={2.2} />
                                </TouchableOpacity>
                            </View>
                            <Field label="Theme">
                                <Segmented
                                    value={isDark ? 'dark' : 'light'}
                                    onChange={(v) => setColorScheme(v as 'light' | 'dark')}
                                    options={[
                                        { label: 'Light', value: 'light' },
                                        { label: 'Dark', value: 'dark' },
                                    ]}
                                />
                            </Field>
                            {controls}
                            <View style={styles.sheetActions}>
                                <TouchableOpacity style={styles.sheetBtn} onPress={hideChrome} activeOpacity={0.7}>
                                    <Text style={styles.sheetBtnText}>Hide chrome (4 s)</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.sheetBtn} onPress={() => router.back()} activeOpacity={0.7}>
                                    <Text style={styles.sheetBtnText}>Close scene</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    :   <TouchableOpacity style={[styles.fabToggle, { bottom: insets.bottom + 24 }]} onPress={() => setSheetOpen(true)} activeOpacity={0.8}>
                            <SlidersHorizontal size={18} color={colors.text} strokeWidth={2.2} />
                        </TouchableOpacity>
                    }
                </View>
            )}
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        root: {
            flex: 1,
            backgroundColor: colors.background,
        },
        sheet: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.surface + 'F5',
            borderTopLeftRadius: radius.cardLg,
            borderTopRightRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            paddingHorizontal: 16,
            paddingTop: 14,
        },
        sheetHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
        },
        sheetTitle: {
            fontFamily: fonts.semibold,
            fontSize: 13,
            color: colors.textSecondary,
        },
        sheetActions: {
            flexDirection: 'row',
            gap: 8,
            marginTop: 4,
        },
        sheetBtn: {
            flex: 1,
            alignItems: 'center',
            paddingVertical: 10,
            borderRadius: radius.chip,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            backgroundColor: colors.surfaceInset,
        },
        sheetBtnText: {
            fontFamily: fonts.semibold,
            fontSize: 13,
            color: colors.text,
        },
        fabToggle: {
            position: 'absolute',
            right: 20,
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface + 'CC',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
    })
}
