import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { Picker } from '@react-native-picker/picker'
import { Calendar } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface DatePickerProps {
    selectedDate: Date
    onDateChange: (date: Date) => void
    color?: string
}

export default function DatePicker({ selectedDate, onDateChange, color }: DatePickerProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [selectedMonth, setSelectedMonth] = useState(selectedDate.getMonth())
    const [selectedDay, setSelectedDay] = useState(selectedDate.getDate())
    const [selectedYear, setSelectedYear] = useState(selectedDate.getFullYear())

    const monthAbbreviations = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i)

    function getDaysInMonth(month: number, year: number): number {
        return new Date(year, month + 1, 0).getDate()
    }

    const days = Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }, (_, i) => i + 1)

    useEffect(() => {
        setSelectedMonth(selectedDate.getMonth())
        setSelectedDay(selectedDate.getDate())
        setSelectedYear(selectedDate.getFullYear())
    }, [selectedDate])

    function handleMonthChange(month: number) {
        setSelectedMonth(month)
        const maxDays = getDaysInMonth(month, selectedYear)
        if (selectedDay > maxDays) {
            setSelectedDay(maxDays)
        }
        updateDate(month, selectedDay, selectedYear)
    }

    function handleDayChange(day: number) {
        setSelectedDay(day)
        updateDate(selectedMonth, day, selectedYear)
    }

    function handleYearChange(year: number) {
        setSelectedYear(year)
        const maxDays = getDaysInMonth(selectedMonth, year)
        if (selectedDay > maxDays) {
            setSelectedDay(maxDays)
        }
        updateDate(selectedMonth, selectedDay, year)
    }

    function updateDate(month: number, day: number, year: number) {
        const newDate = new Date(year, month, day)
        onDateChange(newDate)
    }

    function formatSelectedDate(): string {
        return `${monthAbbreviations[selectedMonth]} ${selectedDay}, ${selectedYear}`
    }

    return (
        <View style={styles.container}>
            {/* Header with Date Display */}
            <View style={[styles.header, { backgroundColor: color || colors.background }]}>
                <Calendar size={28} color="white" strokeWidth={2.5} />
                <Text style={styles.dateDisplay}>{formatSelectedDate()}</Text>
            </View>

            {/* Picker Section */}
            <View style={styles.pickerContainer}>
                {/* Month Picker */}
                <View style={styles.monthColumn}>
                    <Text style={styles.pickerLabel}>MONTH</Text>
                    <View style={[styles.pickerWrapper]}>
                        <Picker selectedValue={selectedMonth} onValueChange={handleMonthChange} style={styles.picker} itemStyle={styles.pickerItem}>
                            {monthAbbreviations.map((month, index) => (
                                <Picker.Item key={index} label={month} value={index} />
                            ))}
                        </Picker>
                    </View>
                </View>

                {/* Day Picker */}
                <View style={styles.pickerColumn}>
                    <Text style={styles.pickerLabel}>DAY</Text>
                    <View style={[styles.pickerWrapper]}>
                        <Picker selectedValue={selectedDay} onValueChange={handleDayChange} style={styles.picker} itemStyle={styles.pickerItem}>
                            {days.map((day) => (
                                <Picker.Item key={day} label={day.toString()} value={day} />
                            ))}
                        </Picker>
                    </View>
                </View>

                {/* Year Picker */}
                <View style={styles.pickerColumn}>
                    <Text style={styles.pickerLabel}>YEAR</Text>
                    <View style={[styles.pickerWrapper]}>
                        <Picker selectedValue={selectedYear} onValueChange={handleYearChange} style={styles.picker} itemStyle={styles.pickerItem}>
                            {years.map((year) => (
                                <Picker.Item key={year} label={year.toString()} value={year} />
                            ))}
                        </Picker>
                    </View>
                </View>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            paddingTop: 8,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            gap: 12,
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 16,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
        },
        dateDisplay: {
            fontSize: 20,
            color: '#FFFFFF',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        pickerContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
        },
        monthColumn: {
            flex: 1.0,
        },
        pickerColumn: {
            flex: 1.0,
        },
        pickerLabel: {
            fontSize: 16,
            color: colors.labelMuted,
            letterSpacing: -0.5,
            marginBottom: 12,
            textAlign: 'center',
            fontFamily: fonts.semibold,
        },
        pickerWrapper: {
            backgroundColor: colors.surface,
            borderRadius: 14,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            overflow: 'hidden',
            height: 200,
        },
        picker: {
            width: '100%',
            height: 200,
            backgroundColor: 'transparent',
        },
        pickerItem: {
            fontSize: 14,
            color: colors.text,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
    })
}
