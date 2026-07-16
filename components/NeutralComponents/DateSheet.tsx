import Calendar from '@/components/NeutralComponents/Calendar'
import { type SelectableRange } from '@/components/NeutralComponents/CalendarMonthGrid'
import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

/**
 * Centralized date-picker content shared by the workout (LogDateModal) and
 * nutrition (dateModal) date pickers. Rendered inside a BottomSheet, which owns
 * the surface, drag handle, and slide/swipe animation. Tapping a day selects it;
 * the Confirm button applies. Future dates are disabled inline via `selectable`,
 * so no post-hoc "invalid date" alert is needed.
 */

export interface DateSheetProps {
    selectedDate: Date
    onConfirm: (date: Date) => void
    subtitle: string
    accent: string
    accentGradient: readonly [string, string]
    /** which days can be tapped, always including today (default 'past' → no future) */
    selectable?: SelectableRange
    /** days ('YYYY-MM-DD') that have data → dot */
    eventDays?: ReadonlySet<string>
}

export default function DateSheet({ selectedDate, onConfirm, subtitle, accent, accentGradient, selectable = 'past', eventDays }: DateSheetProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [temp, setTemp] = useState(selectedDate)

    return (
        <View style={styles.content}>
            <Text style={styles.title}>Change Date</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <Calendar selectedDate={temp} onSelectDate={setTemp} selectable={selectable} accent={accent} eventDays={eventDays} />
            <TouchableOpacity onPress={() => onConfirm(temp)} activeOpacity={0.85} style={[styles.confirmTouchable, { shadowColor: accent }]}>
                <LinearGradient colors={accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.confirmButton}>
                    <Text style={styles.confirmText}>Confirm</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        content: {
            paddingHorizontal: 24,
            paddingTop: 8,
        },
        title: {
            fontSize: 24,
            color: colors.text,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
            marginBottom: 10,
            textAlign: 'center',
        },
        subtitle: {
            fontSize: 16,
            color: colors.labelMuted,
            fontFamily: fonts.regular,
            marginBottom: 16,
            textAlign: 'center',
        },
        confirmTouchable: {
            borderRadius: 12,
            overflow: 'hidden',
            marginTop: 8,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
        },
        confirmButton: {
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
        },
        confirmText: {
            fontSize: 17,
            color: '#FFFFFF',
            fontFamily: fonts.semibold,
            letterSpacing: -0.5,
        },
    })
}
