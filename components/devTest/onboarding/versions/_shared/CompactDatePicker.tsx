import { fonts, radius, useColorScheme, useColors, type Colors } from '@/context/ThemeContext'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Calendar, ChevronDown } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

/**
 * Dev-only date picker for the onboarding previews — wraps the native @react-native-community/datetimepicker
 * (already installed) instead of hand-rolled wheels: iOS uses `display="compact"` (a small tappable chip,
 * the most space-efficient option), Android opens the native dialog from a themed field. Same
 * `{ selectedDate, onDateChange }` API so it's a drop-in. Native = accessible + locale-aware for free.
 */
export interface CompactDatePickerProps {
    selectedDate: Date
    onDateChange: (date: Date) => void
    accent?: string
}

export default function CompactDatePicker({ selectedDate, onDateChange, accent }: CompactDatePickerProps) {
    const colors = useColors()
    const scheme = useColorScheme()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const tint = accent ?? colors.workout
    const [show, setShow] = useState(false)

    function handleChange(_event: DateTimePickerEvent, date?: Date) {
        if (Platform.OS !== 'ios') setShow(false)
        if (date) onDateChange(date)
    }

    if (Platform.OS === 'ios') {
        return (
            <View style={styles.field}>
                <Calendar size={20} color={tint} strokeWidth={2.4} />
                <View style={styles.spacer} />
                <DateTimePicker value={selectedDate} mode="date" display="compact" maximumDate={new Date()} onChange={handleChange} accentColor={tint} themeVariant={scheme} />
            </View>
        )
    }

    return (
        <>
            <TouchableOpacity style={styles.field} onPress={() => setShow(true)} activeOpacity={0.7}>
                <Calendar size={20} color={tint} strokeWidth={2.4} />
                <Text style={styles.fieldText}>{selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                <ChevronDown size={20} color={colors.chevron} strokeWidth={2.4} />
            </TouchableOpacity>
            {show && <DateTimePicker value={selectedDate} mode="date" display="default" maximumDate={new Date()} onChange={handleChange} />}
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
        spacer: { flex: 1 },
        fieldText: {
            flex: 1,
            fontFamily: fonts.semibold,
            fontSize: 16,
            color: colors.text,
            letterSpacing: -0.3,
        },
    })
}
