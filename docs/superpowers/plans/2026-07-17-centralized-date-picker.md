# Centralized Date Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two duplicated date pickers (nutrition `dateModal` route + workout `LogDateModal`) with one centralized fade-in popup date picker built on the new `Calendar`/`DateSheet`/`CenterPopup` primitives.

**Architecture:** A new `DatePickerPopup` composes `CenterPopup` (fade/scale-in centered dialog) + `DateSheet` (title, subtitle, `Calendar`, Confirm). It exposes a `mode` prop (`'workout' | 'nutrition'`) that maps to accent, gradient, and subtitle copy. Both consumer screens render it inline via a `visible` boolean, replacing the old route push and the old `LogDateModal` component. Future dates are blocked inline (`selectable="past"`), so the old post-hoc "invalid date" alerts are removed from the picker path.

**Tech Stack:** React Native, Expo Router, TypeScript, `@/context/ThemeContext` tokens, jest-expo + react-test-renderer.

## Global Constraints

- No hardcoded colors/fonts/radii — pull from `@/context/ThemeContext` (`useColors`, `fonts`, `radius`).
- Dates cross the component boundary as `Date`; convert to/from `YYYY-MM-DD` only with `getDateKey`/`parseDateKey` (never `new Date(key)` — Gotcha #9).
- The wheel `DatePicker` (`components/NeutralComponents/DatePicker.tsx`) stays — it is still used by onboarding `aboutYou.tsx`. Do NOT delete it.
- Shared-primitive changes update `RESTYLE_PLAN.md` in the same commit (standing rule).

---

### Task 1: `DatePickerPopup` centralized component

**Files:**
- Create: `components/NeutralComponents/DatePickerPopup.tsx`
- Modify: `components/NeutralComponents/DateSheet.tsx` (add `accessibilityLabel="Confirm"` + role to the Confirm button so it is testable/accessible)
- Test: `components/NeutralComponents/__tests__/DatePickerPopup.test.tsx`

**Interfaces:**
- Produces: `DatePickerPopup(props: { visible: boolean; onClose: () => void; selectedDate: Date; onConfirm: (date: Date) => void; mode: 'workout' | 'nutrition'; selectable?: SelectableRange; eventDays?: ReadonlySet<string> })` — default export.
- Consumes: `CenterPopup` (default), `DateSheet` (default), `useColors`.

- [ ] **Step 1: Add accessibility label to DateSheet Confirm button**

In `DateSheet.tsx`, the Confirm `TouchableOpacity`:

```tsx
<TouchableOpacity onPress={() => onConfirm(temp)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Confirm" style={[styles.confirmTouchable, { shadowColor: accent }]}>
```

- [ ] **Step 2: Write the failing test**

```tsx
import { ThemeProvider } from '@/context/ThemeContext'
import { getDateKey } from '@/lib/utils/dateHelper'
import { act, create } from 'react-test-renderer'
import DatePickerPopup from '../DatePickerPopup'

function findByLabel(root: any, label: string) {
    return root.findAll((n: any) => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function')
}

describe('DatePickerPopup', () => {
    it('confirms the tapped day as a local Date', () => {
        const onConfirm = jest.fn()
        // A fully-past month so every day is selectable regardless of run date.
        const initial = new Date(2020, 4, 15)
        let tree: any
        act(() => {
            tree = create(
                <ThemeProvider>
                    <DatePickerPopup visible onClose={() => {}} mode="workout" selectedDate={initial} onConfirm={onConfirm} />
                </ThemeProvider>,
            )
        })
        const dayCell = tree.root.findAll((n: any) => typeof n.props?.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('2020-05-10') && typeof n.props?.onPress === 'function')[0]
        act(() => dayCell.props.onPress())
        const confirm = findByLabel(tree.root, 'Confirm')[0]
        act(() => confirm.props.onPress())
        expect(onConfirm).toHaveBeenCalledTimes(1)
        expect(getDateKey(onConfirm.mock.calls[0][0])).toBe('2020-05-10')
    })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest components/NeutralComponents/__tests__/DatePickerPopup.test.tsx`
Expected: FAIL — cannot find module `../DatePickerPopup`.

- [ ] **Step 4: Implement `DatePickerPopup`**

```tsx
import CenterPopup from '@/components/NeutralComponents/CenterPopup'
import { type SelectableRange } from '@/components/NeutralComponents/CalendarMonthGrid'
import DateSheet from '@/components/NeutralComponents/DateSheet'
import { useColors } from '@/context/ThemeContext'

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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest components/NeutralComponents/__tests__/DatePickerPopup.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/NeutralComponents/DatePickerPopup.tsx components/NeutralComponents/DateSheet.tsx components/NeutralComponents/__tests__/DatePickerPopup.test.tsx
git commit -m "feat: add centralized DatePickerPopup"
```

---

### Task 2: Wire nutrition screen, remove the `dateModal` route

**Files:**
- Modify: `app/nutritionScreens/nutritionScreen.tsx`
- Modify: `app/_layout.tsx` (remove the `nutritionScreens/dateModal` Stack screen)
- Delete: `app/nutritionScreens/dateModal.tsx`

**Interfaces:**
- Consumes: `DatePickerPopup` (Task 1); `useNutrition().selectedDate` / `setSelectedDate`.

- [ ] **Step 1: Replace the date-chip route push with local popup state**

In `nutritionScreen.tsx`, add `const [datePickerVisible, setDatePickerVisible] = useState(false)` (import `useState`). Pull `setSelectedDate` from `useNutrition()`. Change the chip handler:

```tsx
<TouchableOpacity style={styles.dateChip} activeOpacity={0.5} onPress={() => setDatePickerVisible(true)}>
```

- [ ] **Step 2: Render the popup**

Wrap the returned `FlatList` in a fragment and render the popup alongside it:

```tsx
return (
    <>
        <FlatList /* ...unchanged... */ />
        <DatePickerPopup
            visible={datePickerVisible}
            onClose={() => setDatePickerVisible(false)}
            mode="nutrition"
            selectedDate={selectedDate}
            onConfirm={(date) => {
                setSelectedDate(date)
                setDatePickerVisible(false)
            }}
        />
    </>
)
```

Add `import DatePickerPopup from '@/components/NeutralComponents/DatePickerPopup'`.

- [ ] **Step 3: Delete the old route and its registration**

Delete `app/nutritionScreens/dateModal.tsx`. In `app/_layout.tsx` remove the line:

```tsx
<Stack.Screen name="nutritionScreens/dateModal" options={{ ...modalPresentation, headerShown: false }} />
```

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors in `nutritionScreen.tsx` / `_layout.tsx`.

- [ ] **Step 5: Commit**

```bash
git add app/nutritionScreens/nutritionScreen.tsx app/_layout.tsx
git rm app/nutritionScreens/dateModal.tsx
git commit -m "refactor: nutrition screen uses centralized DatePickerPopup"
```

---

### Task 3: Wire log screen, remove `LogDateModal`

**Files:**
- Modify: `app/workoutScreens/logsModal.tsx`
- Delete: `components/WorkoutComponents/LogDateModal.tsx`

**Interfaces:**
- Consumes: `DatePickerPopup` (Task 1); existing `selectedLogDate` / `setSelectedLogDate` / `showDateModal` / `setShowDateModal` state.

- [ ] **Step 1: Swap the modal**

In `logsModal.tsx`, replace the `<LogDateModal ... />` block with:

```tsx
<DatePickerPopup
    visible={showDateModal}
    onClose={() => setShowDateModal(false)}
    mode="workout"
    selectedDate={selectedLogDate}
    onConfirm={(date) => {
        setSelectedLogDate(date)
        setShowDateModal(false)
    }}
/>
```

Replace `import LogDateModal from '@/components/WorkoutComponents/LogDateModal'` with `import DatePickerPopup from '@/components/NeutralComponents/DatePickerPopup'`. Leave `showInvalidDateAlert` and the `isDateAfterToday` guard in `handleAdd` (defensive; still referenced there).

- [ ] **Step 2: Delete `LogDateModal`**

Delete `components/WorkoutComponents/LogDateModal.tsx`.

- [ ] **Step 3: Verify typecheck + tests**

Run: `npx tsc --noEmit -p tsconfig.json` (no new errors) and `npx jest components/NeutralComponents` (green).

- [ ] **Step 4: Commit**

```bash
git add app/workoutScreens/logsModal.tsx
git rm components/WorkoutComponents/LogDateModal.tsx
git commit -m "refactor: logs modal uses centralized DatePickerPopup"
```

---

### Task 4: Docs

**Files:**
- Modify: `RESTYLE_PLAN.md` (note the new shared primitives)
- Modify: `docs/COMPLETED_ISSUES.txt` (postscript)
- Modify: `docs/BACKLOG.txt` (mark the unify item done)

- [ ] **Step 1: RESTYLE_PLAN** — add `Calendar`, `CalendarMonthGrid`, `DateSheet`, `CenterPopup`, `BottomSheet`, and `DatePickerPopup` to the shared-primitive inventory, noting the two consumers.

- [ ] **Step 2: COMPLETED_ISSUES** — add a dated entry: unified `dateModal` + `LogDateModal` into `DatePickerPopup` (calendar UI, inline future-blocking, fade-in popup).

- [ ] **Step 3: BACKLOG** — remove/annotate the "Unify dateModal.tsx and LogDateModal.tsx" item as done.

- [ ] **Step 4: Commit**

```bash
git add RESTYLE_PLAN.md docs/COMPLETED_ISSUES.txt docs/BACKLOG.txt
git commit -m "docs: record centralized date picker"
```

---

## Self-Review

- **Spec coverage:** centralized component (Task 1), both screens rewired (Tasks 2–3), dead code removed (`dateModal.tsx`, `LogDateModal.tsx`), wheel `DatePicker` preserved for onboarding, future-blocking via `selectable="past"`, docs (Task 4). ✅
- **Placeholder scan:** none.
- **Type consistency:** `DatePickerPopup` prop names/types are identical across Tasks 1–3; `onConfirm: (date: Date) => void` matches both consumers' handlers.
