import BottomSheet from '@/components/NeutralComponents/BottomSheet'
import { type SelectableRange } from '@/components/NeutralComponents/CalendarMonthGrid'
import CenterPopup from '@/components/NeutralComponents/CenterPopup'
import DateSheet from '@/components/NeutralComponents/DateSheet'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { getDateKey } from '@/lib/utils/dateHelper'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Field, Segmented } from './DevControls'
import MockupShell from './mockups/MockupShell'

/**
 * Dev Hub preview for the centralized DateSheet. Toggle mode (accent + copy),
 * selectable range, and event dots; "Open date sheet" presents it in a BottomSheet
 * so the slide-up, swipe-to-dismiss, and slide-out match the shipping experience.
 */

const LOGGED_PATTERN = [2, 4, 7, 9, 12, 15, 18, 21, 24, 27, 30]

type Mode = 'workout' | 'nutrition'
type Presentation = 'sheet' | 'popup'

export default function DateSheetTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    const [mode, setMode] = useState<Mode>('workout')
    const [presentation, setPresentation] = useState<Presentation>('sheet')
    const [selectable, setSelectable] = useState<SelectableRange>('past')
    const [density, setDensity] = useState<'some' | 'none'>('some')
    const [selectedDate, setSelectedDate] = useState(() => new Date())
    const [open, setOpen] = useState(false)

    const accent = mode === 'workout' ? colors.workout : colors.nutrition
    const accentGradient = mode === 'workout' ? colors.workoutGradient : colors.nutritionGradient
    const subtitle = mode === 'workout' ? 'Logs will be added to the selected date' : 'Choose a date to view nutrition logs'

    // Seed dots across the last few months so navigating back still shows them.
    const eventDays = useMemo(() => {
        if (density === 'none') return new Set<string>()
        const set = new Set<string>()
        const base = new Date()
        for (let m = 0; m < 3; m++) {
            const year = base.getFullYear()
            const month = base.getMonth() - m
            const daysInMonth = new Date(year, month + 1, 0).getDate()
            LOGGED_PATTERN.filter((d) => d <= daysInMonth).forEach((d) => set.add(getDateKey(new Date(year, month, d))))
        }
        return set
    }, [density])

    const controls = (
        <>
            <Field label="Presentation">
                <Segmented
                    value={presentation}
                    onChange={setPresentation}
                    options={[
                        { label: 'Bottom sheet', value: 'sheet' },
                        { label: 'Center popup', value: 'popup' },
                    ]}
                />
            </Field>
            <Field label="Mode">
                <Segmented
                    value={mode}
                    onChange={setMode}
                    options={[
                        { label: 'Workout', value: 'workout' },
                        { label: 'Nutrition', value: 'nutrition' },
                    ]}
                />
            </Field>
            <Field label="Selectable days (incl. today)">
                <Segmented
                    value={selectable}
                    onChange={setSelectable}
                    options={[
                        { label: 'Past only', value: 'past' },
                        { label: 'All', value: 'all' },
                    ]}
                />
            </Field>
            <Field label="Event dots">
                <Segmented
                    value={density}
                    onChange={setDensity}
                    options={[
                        { label: 'Some', value: 'some' },
                        { label: 'None', value: 'none' },
                    ]}
                />
            </Field>
        </>
    )

    const sheet = (
        <DateSheet
            selectedDate={selectedDate}
            subtitle={subtitle}
            accent={accent}
            accentGradient={accentGradient}
            selectable={selectable}
            eventDays={eventDays}
            onConfirm={(date) => {
                setSelectedDate(date)
                setOpen(false)
            }}
        />
    )

    return (
        <MockupShell controls={controls} padTop>
            <View style={styles.content}>
                <TouchableOpacity style={[styles.openButton, { backgroundColor: accent }]} onPress={() => setOpen(true)} activeOpacity={0.85}>
                    <Text style={styles.openButtonText}>Open date sheet</Text>
                </TouchableOpacity>
                <Text style={styles.readout}>Confirmed: {getDateKey(selectedDate)}</Text>
            </View>

            {presentation === 'sheet' ?
                <BottomSheet visible={open} onClose={() => setOpen(false)}>
                    {sheet}
                </BottomSheet>
            :   <CenterPopup visible={open} onClose={() => setOpen(false)}>
                    {sheet}
                </CenterPopup>
            }
        </MockupShell>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        content: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
            gap: 18,
        },
        openButton: {
            paddingVertical: 14,
            paddingHorizontal: 28,
            borderRadius: radius.card,
        },
        openButtonText: {
            fontFamily: fonts.semibold,
            fontSize: 15,
            color: '#FFFFFF',
            letterSpacing: -0.3,
        },
        readout: {
            fontFamily: fonts.regular,
            fontSize: 13,
            color: colors.textMuted,
        },
    })
}
