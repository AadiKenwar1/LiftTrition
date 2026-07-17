import { type SelectableRange } from '@/components/NeutralComponents/CalendarMonthGrid'
import CenterPopup from '@/components/NeutralComponents/CenterPopup'
import DateSheet from '@/components/NeutralComponents/DateSheet'
import { useColors } from '@/context/ThemeContext'

/**
 * The app's centralized date picker: a fade-in centered popup wrapping the shared
 * Calendar/DateSheet. `mode` maps to the accent, gradient, and subtitle copy so
 * both the workout and nutrition screens render one component. Future dates are
 * blocked inline (`selectable="past"` default) rather than rejected after the fact.
 */

type Mode = 'workout' | 'nutrition'

const SUBTITLE: Record<Mode, string> = {
    workout: 'Logs will be added to the selected date',
    nutrition: 'Choose a date to view nutrition logs',
}

export interface DatePickerPopupProps {
    visible: boolean
    onClose: () => void
    selectedDate: Date
    onConfirm: (date: Date) => void
    mode: Mode
    selectable?: SelectableRange
    eventDays?: ReadonlySet<string>
}

export default function DatePickerPopup({ visible, onClose, selectedDate, onConfirm, mode, selectable = 'past', eventDays }: DatePickerPopupProps) {
    const colors = useColors()
    const accent = mode === 'workout' ? colors.workout : colors.nutrition
    const accentGradient = mode === 'workout' ? colors.workoutGradient : colors.nutritionGradient

    return (
        <CenterPopup visible={visible} onClose={onClose}>
            <DateSheet selectedDate={selectedDate} onConfirm={onConfirm} subtitle={SUBTITLE[mode]} accent={accent} accentGradient={accentGradient} selectable={selectable} eventDays={eventDays} />
        </CenterPopup>
    )
}
