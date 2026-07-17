import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useToday } from '@/lib/hooks/useToday'
import { getDateKey, parseDateKey } from '@/lib/utils/dateHelper'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { CALENDAR_GRID_HEIGHT, CalendarMonthGrid, type SelectableRange } from './CalendarMonthGrid'

/**
 * Production month calendar with title-zoom navigation (day → year → month → day).
 * Controlled: the consumer owns `selectedDate` (a Date) and receives taps via
 * `onSelectDate`. Out-of-range days are disabled inline via `selectable` rather
 * than rejected after the fact. Internally works in 'YYYY-MM-DD' keys and converts
 * at the boundary with getDateKey/parseDateKey (never `new Date(key)` — see Gotcha #9).
 */

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const YEAR_PAGE = 16
const EMPTY_EVENTS: ReadonlySet<string> = new Set()

type ViewMode = 'days' | 'months' | 'years'

const alignYearBase = (year: number) => year - (year % YEAR_PAGE)

export interface CalendarProps {
    selectedDate: Date
    onSelectDate: (date: Date) => void
    /** which days can be tapped, always including today (default 'all') */
    selectable?: SelectableRange
    /** accent for today/selected/current markers (default colors.workout) */
    accent?: string
    /** days ('YYYY-MM-DD') that have data → dot */
    eventDays?: ReadonlySet<string>
}

export default function Calendar({ selectedDate, onSelectDate, selectable = 'all', accent, eventDays = EMPTY_EVENTS }: CalendarProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const tint = accent ?? colors.workout

    const todayKey = useToday()
    const today = parseDateKey(todayKey)
    const todayYear = today.getFullYear()
    const todayMonth = today.getMonth()

    const selectedKey = getDateKey(selectedDate)

    const [cursor, setCursor] = useState({ year: selectedDate.getFullYear(), month: selectedDate.getMonth() })
    const [viewMode, setViewMode] = useState<ViewMode>('days')
    const [yearBase, setYearBase] = useState(() => alignYearBase(selectedDate.getFullYear()))

    const shiftMonth = (delta: number) => {
        setCursor(({ year, month }) => {
            const d = new Date(year, month + delta, 1)
            return { year: d.getFullYear(), month: d.getMonth() }
        })
    }

    const shiftYear = (delta: number) => {
        setCursor(({ year, month }) => ({ year: year + delta, month }))
    }

    const goPrev = () => {
        if (viewMode === 'years') setYearBase((b) => b - YEAR_PAGE)
        else if (viewMode === 'months') shiftYear(-1)
        else shiftMonth(-1)
    }

    const goNext = () => {
        if (viewMode === 'years') setYearBase((b) => b + YEAR_PAGE)
        else if (viewMode === 'months') shiftYear(1)
        else shiftMonth(1)
    }

    const handleTitlePress = () => {
        if (viewMode === 'days') {
            setYearBase(alignYearBase(cursor.year))
            setViewMode('years')
        } else {
            setViewMode('days')
        }
    }

    const pickYear = (year: number) => {
        setCursor((c) => ({ ...c, year }))
        setViewMode('months')
    }

    const pickMonth = (month: number) => {
        setCursor((c) => ({ ...c, month }))
        setViewMode('days')
    }

    const handleSelectDay = (day: string) => {
        onSelectDate(parseDateKey(day))
    }

    const yearDisabled = (year: number) =>
        selectable === 'past' ? year > todayYear
        : selectable === 'future' ? year < todayYear
        : false

    const monthDisabled = (year: number, month: number) =>
        selectable === 'past' ? year > todayYear || (year === todayYear && month > todayMonth)
        : selectable === 'future' ? year < todayYear || (year === todayYear && month < todayMonth)
        : false

    const title =
        viewMode === 'years' ? `${yearBase}–${yearBase + YEAR_PAGE - 1}`
        : viewMode === 'months' ? `${cursor.year}`
        : `${MONTH_NAMES[cursor.month]} ${cursor.year}`

    const years = Array.from({ length: YEAR_PAGE }, (_, i) => yearBase + i)

    return (
        <View>
            <View style={styles.monthHeader}>
                <TouchableOpacity onPress={goPrev} hitSlop={10} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel="Previous">
                    <ChevronLeft size={22} color={colors.textSecondary} strokeWidth={2.2} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handleTitlePress}
                    hitSlop={8}
                    activeOpacity={0.6}
                    style={styles.titleRow}
                    accessibilityRole="button"
                    accessibilityLabel={viewMode === 'days' ? 'Show year picker' : 'Back to day view'}
                >
                    <Text style={styles.monthTitle}>{title}</Text>
                    <ChevronDown size={15} color={colors.textSecondary} strokeWidth={2.4} style={viewMode !== 'days' ? styles.titleCaretOpen : undefined} />
                </TouchableOpacity>
                <TouchableOpacity onPress={goNext} hitSlop={10} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel="Next">
                    <ChevronRight size={22} color={colors.textSecondary} strokeWidth={2.2} />
                </TouchableOpacity>
            </View>

            <View style={styles.body}>
                {viewMode === 'days' && (
                    <CalendarMonthGrid
                        year={cursor.year}
                        month={cursor.month}
                        todayDay={todayKey}
                        selectedDay={selectedKey}
                        eventDays={eventDays}
                        onSelectDay={handleSelectDay}
                        accent={tint}
                        selectable={selectable}
                    />
                )}
                {viewMode === 'months' && (
                    <View style={styles.pickerGrid}>
                        {MONTH_ABBR.map((label, i) => {
                            const disabled = monthDisabled(cursor.year, i)
                            const isCurrent = cursor.year === todayYear && i === todayMonth
                            return (
                                <TouchableOpacity key={label} disabled={disabled} onPress={() => pickMonth(i)} activeOpacity={0.6} style={[styles.pickerCell, disabled && styles.pickerCellDisabled]}>
                                    <View style={[styles.pickerBox, isCurrent && { borderWidth: 1.5, borderColor: tint }]}>
                                        <Text style={[styles.pickerText, { color: disabled ? colors.textMuted : isCurrent ? tint : colors.text }]}>{label}</Text>
                                    </View>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                )}
                {viewMode === 'years' && (
                    <View style={styles.pickerGrid}>
                        {years.map((year) => {
                            const disabled = yearDisabled(year)
                            const isCurrent = year === todayYear
                            return (
                                <TouchableOpacity key={year} disabled={disabled} onPress={() => pickYear(year)} activeOpacity={0.6} style={[styles.pickerCell, disabled && styles.pickerCellDisabled]}>
                                    <View style={[styles.pickerBox, isCurrent && { borderWidth: 1.5, borderColor: tint }]}>
                                        <Text style={[styles.pickerText, { color: disabled ? colors.textMuted : isCurrent ? tint : colors.text }]}>{year}</Text>
                                    </View>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                )}
            </View>

        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        monthHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
        },
        titleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
        },
        titleCaretOpen: {
            transform: [{ rotate: '180deg' }],
        },
        monthTitle: {
            fontFamily: fonts.semibold,
            fontSize: 16,
            color: colors.text,
            letterSpacing: -0.3,
        },
        pickerGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
        pickerCell: {
            width: '25%',
            padding: 4,
        },
        pickerCellDisabled: {
            opacity: 0.5,
        },
        pickerBox: {
            height: 44,
            borderRadius: radius.card,
            alignItems: 'center',
            justifyContent: 'center',
        },
        pickerText: {
            fontFamily: fonts.medium,
            fontSize: 15,
        },
        body: {
            minHeight: CALENDAR_GRID_HEIGHT,
            justifyContent: 'center',
        },
    })
}
