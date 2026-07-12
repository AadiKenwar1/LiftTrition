import { CalendarMonthGrid } from '@/components/devTest/CalendarMonthGrid'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { getDateKey } from '@/lib/utils/dateHelper'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

/**
 * Dev-only date field for the V4 flow: tapping opens a short popup with the ported calendar grid
 * (double-chevron year travel, past days only). Same `{ selectedDate, onDateChange }` API as
 * CompactDatePicker so it's a drop-in.
 */

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export interface CalendarDatePopupProps {
    selectedDate: Date
    onDateChange: (date: Date) => void
    accent?: string
}

export default function CalendarDatePopup({ selectedDate, onDateChange, accent }: CalendarDatePopupProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const tint = accent ?? colors.workout
    const [open, setOpen] = useState(false)
    const [cursor, setCursor] = useState({ year: selectedDate.getFullYear(), month: selectedDate.getMonth() })

    const todayKey = getDateKey(new Date())
    const selectedKey = getDateKey(selectedDate)

    const age = useMemo(() => {
        const now = new Date()
        let a = now.getFullYear() - selectedDate.getFullYear()
        const m = now.getMonth() - selectedDate.getMonth()
        if (m < 0 || (m === 0 && now.getDate() < selectedDate.getDate())) a--
        return a
    }, [selectedDate])

    const openPopup = () => {
        setCursor({ year: selectedDate.getFullYear(), month: selectedDate.getMonth() })
        setOpen(true)
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

    const handleSelectDay = (day: string) => {
        const [y, m, d] = day.split('-').map(Number)
        onDateChange(new Date(y, m - 1, d))
        setOpen(false)
    }

    return (
        <>
            <TouchableOpacity style={styles.field} onPress={openPopup} activeOpacity={0.7}>
                <Calendar size={20} color={tint} strokeWidth={2.4} />
                <Text style={styles.fieldText}>{selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                <Text style={styles.ageText}>Age {age}</Text>
                <ChevronDown size={20} color={colors.chevron} strokeWidth={2.4} />
            </TouchableOpacity>

            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
                    <Pressable style={styles.popup} onPress={() => {}}>
                        <View style={styles.header}>
                            <View style={styles.navGroup}>
                                <TouchableOpacity onPress={() => shiftYear(-1)} hitSlop={8} activeOpacity={0.6}>
                                    <ChevronsLeft size={22} color={colors.textSecondary} strokeWidth={2.2} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={8} activeOpacity={0.6}>
                                    <ChevronLeft size={22} color={colors.textSecondary} strokeWidth={2.2} />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.title}>
                                {MONTH_NAMES[cursor.month]} {cursor.year}
                            </Text>
                            <View style={styles.navGroup}>
                                <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={8} activeOpacity={0.6}>
                                    <ChevronRight size={22} color={colors.textSecondary} strokeWidth={2.2} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => shiftYear(1)} hitSlop={8} activeOpacity={0.6}>
                                    <ChevronsRight size={22} color={colors.textSecondary} strokeWidth={2.2} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <CalendarMonthGrid
                            year={cursor.year}
                            month={cursor.month}
                            todayDay={todayKey}
                            selectedDay={selectedKey}
                            eventDays={new Set()}
                            onSelectDay={handleSelectDay}
                            accent={tint}
                            selectable="past"
                        />
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        field: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            minHeight: 56,
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        fieldText: {
            flex: 1,
            fontFamily: fonts.semibold,
            fontSize: 16,
            color: colors.text,
            letterSpacing: -0.3,
        },
        ageText: {
            fontFamily: fonts.medium,
            fontSize: 14,
            color: colors.textMuted,
            letterSpacing: 0.1,
            marginRight: 4,
        },
        backdrop: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'center',
            paddingHorizontal: 24,
        },
        popup: {
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            padding: 16,
        },
        header: {
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
        title: {
            fontFamily: fonts.semibold,
            fontSize: 16,
            color: colors.text,
            letterSpacing: -0.3,
        },
    })
}
