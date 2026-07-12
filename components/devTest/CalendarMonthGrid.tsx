import { fonts, radius, useColors } from '@/context/ThemeContext'
import { getDateKey } from '@/lib/utils/dateHelper'
import { Pressable, StyleSheet, Text, View } from 'react-native'

/**
 * PLATES-adapted port of the imported calendar/MonthGrid.tsx (Monday-first month grid).
 * today = accent-outlined box + dot · selected = accent-filled · logged days get muted
 * dots · past days faint. Original theme (flame/ink/grotesk) mapped to PLATES tokens.
 */

const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const

export type SelectableRange = 'past' | 'future' | 'all'

export interface CalendarMonthGridProps {
    year: number
    /** 0-based month */
    month: number
    todayDay: string
    selectedDay?: string
    /** days ('YYYY-MM-DD') that have logs → dot */
    eventDays: ReadonlySet<string>
    onSelectDay: (day: string) => void
    accent?: string
    /** which days can be tapped, always including today (default 'all') */
    selectable?: SelectableRange
}

export function CalendarMonthGrid({ year, month, todayDay, selectedDay, eventDays, onSelectDay, accent, selectable = 'all' }: CalendarMonthGridProps) {
    const colors = useColors()
    const tint = accent ?? colors.workout

    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (string | null)[] = [
        ...Array.from({ length: firstWeekday }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => getDateKey(new Date(year, month, i + 1))),
    ]
    while (cells.length % 7 !== 0) cells.push(null)

    return (
        <View>
            <View style={styles.weekRow}>
                {WEEKDAY_LETTERS.map((letter, i) => (
                    <Text key={`${letter}-${i}`} style={[styles.weekLetter, { color: colors.textMuted }]}>
                        {letter}
                    </Text>
                ))}
            </View>
            {Array.from({ length: cells.length / 7 }, (_, row) => (
                <View key={row} style={styles.weekRow}>
                    {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                        if (day === null) {
                            return <View key={`blank-${row}-${col}`} style={styles.cell} />
                        }
                        const isToday = day === todayDay
                        const isSelected = day === selectedDay
                        const hasEvents = eventDays.has(day)
                        const isDisabled = (selectable === 'past' && day > todayDay) || (selectable === 'future' && day < todayDay)

                        return (
                            <Pressable
                                key={day}
                                accessibilityRole="button"
                                accessibilityLabel={`${day}${isToday ? ', today' : ''}`}
                                accessibilityState={{ selected: isSelected, disabled: isDisabled }}
                                disabled={isDisabled}
                                onPress={() => onSelectDay(day)}
                                style={[styles.cell, isDisabled && styles.cellDisabled]}
                            >
                                <View
                                    style={[
                                        styles.dayBox,
                                        isToday && !isSelected && { borderWidth: 1.5, borderColor: tint },
                                        isSelected && { backgroundColor: tint },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.dayText,
                                            {
                                                color:
                                                    isSelected ? '#FFFFFF'
                                                    : isToday ? tint
                                                    : isDisabled ? colors.textMuted
                                                    : colors.text,
                                            },
                                        ]}
                                    >
                                        {parseInt(day.slice(8), 10)}
                                    </Text>
                                </View>
                                <View style={styles.dotSlot}>
                                    {(hasEvents || isToday || isSelected) && (
                                        <View
                                            style={[
                                                styles.dot,
                                                {
                                                    backgroundColor:
                                                        isToday || isSelected ? tint
                                                        : hasEvents ? colors.textSecondary
                                                        : 'transparent',
                                                },
                                            ]}
                                        />
                                    )}
                                </View>
                            </Pressable>
                        )
                    })}
                </View>
            ))}
        </View>
    )
}

const styles = StyleSheet.create({
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    weekLetter: {
        width: 40,
        textAlign: 'center',
        fontFamily: fonts.medium,
        fontSize: 10,
        letterSpacing: 1,
        marginBottom: 8,
    },
    cell: {
        width: 40,
        alignItems: 'center',
        marginBottom: 4,
    },
    cellDisabled: {
        opacity: 0.5,
    },
    dayBox: {
        width: 36,
        height: 36,
        borderRadius: radius.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayText: {
        fontFamily: fonts.medium,
        fontSize: 15,
    },
    dotSlot: {
        height: 8,
        justifyContent: 'center',
    },
    dot: {
        width: 4.5,
        height: 4.5,
        borderRadius: 2.5,
    },
})
