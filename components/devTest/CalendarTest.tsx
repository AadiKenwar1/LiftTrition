import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { getDateKey } from '@/lib/utils/dateHelper'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { CalendarMonthGrid, type SelectableRange } from './CalendarMonthGrid'
import { Field, Segmented } from './DevControls'
import MockupShell from './mockups/MockupShell'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LOGGED_PATTERN = [2, 4, 7, 9, 12, 15, 18, 21, 24, 27, 30]
const YEAR_PAGE = 16

type YearNav = 'zoom' | 'chevrons'
type ViewMode = 'days' | 'months' | 'years'

const alignYearBase = (year: number) => year - (year % YEAR_PAGE)

export default function CalendarTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const now = new Date()
    const todayKey = getDateKey(now)
    const todayYear = now.getFullYear()
    const todayMonth = now.getMonth()

    const [cursor, setCursor] = useState({ year: todayYear, month: todayMonth })
    const [selectedDay, setSelectedDay] = useState<string | undefined>(undefined)
    const [accentKey, setAccentKey] = useState<'workout' | 'nutrition'>('workout')
    const [density, setDensity] = useState<'some' | 'none'>('some')
    const [selectable, setSelectable] = useState<SelectableRange>('all')
    const [yearNav, setYearNav] = useState<YearNav>('zoom')
    const [viewMode, setViewMode] = useState<ViewMode>('days')
    const [yearBase, setYearBase] = useState(() => alignYearBase(todayYear))

    const eventDays = useMemo(() => {
        if (density === 'none') return new Set<string>()
        const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
        return new Set(LOGGED_PATTERN.filter((d) => d <= daysInMonth).map((d) => getDateKey(new Date(cursor.year, cursor.month, d))))
    }, [density, cursor])

    const accent = accentKey === 'workout' ? colors.workout : colors.nutrition

    const handleSelectableChange = (range: SelectableRange) => {
        setSelectable(range)
        setSelectedDay(undefined)
    }

    const handleYearNavChange = (nav: YearNav) => {
        setYearNav(nav)
        setViewMode('days')
    }

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

    const goToday = () => {
        setCursor({ year: todayYear, month: todayMonth })
        setViewMode('days')
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

    const isHome = viewMode === 'days' && cursor.year === todayYear && cursor.month === todayMonth
    const years = Array.from({ length: YEAR_PAGE }, (_, i) => yearBase + i)

    const controls = (
        <>
            <Field label="Year navigation">
                <Segmented
                    value={yearNav}
                    onChange={handleYearNavChange}
                    options={[
                        { label: 'Title zoom', value: 'zoom' },
                        { label: 'Double chevrons', value: 'chevrons' },
                    ]}
                />
            </Field>
            <Field label="Accent">
                <Segmented
                    value={accentKey}
                    onChange={setAccentKey}
                    options={[
                        { label: 'Workout', value: 'workout' },
                        { label: 'Nutrition', value: 'nutrition' },
                    ]}
                />
            </Field>
            <Field label="Logged days">
                <Segmented
                    value={density}
                    onChange={setDensity}
                    options={[
                        { label: 'Some', value: 'some' },
                        { label: 'None', value: 'none' },
                    ]}
                />
            </Field>
            <Field label="Selectable days (incl. today)">
                <Segmented
                    value={selectable}
                    onChange={handleSelectableChange}
                    options={[
                        { label: 'Past only', value: 'past' },
                        { label: 'Future only', value: 'future' },
                        { label: 'All', value: 'all' },
                    ]}
                />
            </Field>
        </>
    )

    return (
        <MockupShell controls={controls} padTop>
            <View style={styles.content}>
                <View style={styles.card}>
                    {yearNav === 'chevrons' ?
                        <View style={styles.monthHeader}>
                            <View style={styles.navGroup}>
                                <TouchableOpacity onPress={() => shiftYear(-1)} hitSlop={8} activeOpacity={0.6}>
                                    <ChevronsLeft size={22} color={colors.textSecondary} strokeWidth={2.2} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={8} activeOpacity={0.6}>
                                    <ChevronLeft size={22} color={colors.textSecondary} strokeWidth={2.2} />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.monthTitle}>{title}</Text>
                            <View style={styles.navGroup}>
                                <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={8} activeOpacity={0.6}>
                                    <ChevronRight size={22} color={colors.textSecondary} strokeWidth={2.2} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => shiftYear(1)} hitSlop={8} activeOpacity={0.6}>
                                    <ChevronsRight size={22} color={colors.textSecondary} strokeWidth={2.2} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    :   <View style={styles.monthHeader}>
                            <TouchableOpacity onPress={goPrev} hitSlop={10} activeOpacity={0.6}>
                                <ChevronLeft size={22} color={colors.textSecondary} strokeWidth={2.2} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleTitlePress} hitSlop={8} activeOpacity={0.6} style={styles.titleRow}>
                                <Text style={styles.monthTitle}>{title}</Text>
                                <ChevronDown size={15} color={colors.textSecondary} strokeWidth={2.4} style={viewMode !== 'days' && styles.titleCaretOpen} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={goNext} hitSlop={10} activeOpacity={0.6}>
                                <ChevronRight size={22} color={colors.textSecondary} strokeWidth={2.2} />
                            </TouchableOpacity>
                        </View>
                    }

                    <View style={styles.body}>
                        {viewMode === 'days' && (
                            <CalendarMonthGrid
                                year={cursor.year}
                                month={cursor.month}
                                todayDay={todayKey}
                                selectedDay={selectedDay}
                                eventDays={eventDays}
                                onSelectDay={setSelectedDay}
                                accent={accent}
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
                                            <View style={[styles.pickerBox, isCurrent && { borderWidth: 1.5, borderColor: accent }]}>
                                                <Text style={[styles.pickerText, { color: disabled ? colors.textMuted : isCurrent ? accent : colors.text }]}>{label}</Text>
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
                                            <View style={[styles.pickerBox, isCurrent && { borderWidth: 1.5, borderColor: accent }]}>
                                                <Text style={[styles.pickerText, { color: disabled ? colors.textMuted : isCurrent ? accent : colors.text }]}>{year}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    )
                                })}
                            </View>
                        )}
                    </View>

                    {!isHome && (
                        <TouchableOpacity onPress={goToday} activeOpacity={0.6} style={styles.todayButton}>
                            <Text style={[styles.todayText, { color: accent }]}>Today</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <Text style={styles.readout}>{selectedDay ? `Selected: ${selectedDay}` : 'Tap a day'}</Text>
            </View>
        </MockupShell>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        content: {
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 18,
        },
        card: {
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            padding: 16,
        },
        monthHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
        },
        navGroup: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
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
        body: {
            minHeight: 300,
            justifyContent: 'center',
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
        todayButton: {
            alignSelf: 'center',
            marginTop: 10,
            paddingVertical: 6,
            paddingHorizontal: 14,
        },
        todayText: {
            fontFamily: fonts.semibold,
            fontSize: 13,
        },
        readout: {
            marginTop: 14,
            textAlign: 'center',
            fontFamily: fonts.regular,
            fontSize: 13,
            color: colors.textMuted,
        },
    })
}
