import { FormulaPanel, InfoNote, InfoPage, InfoSection, MiniBars, MiniLine } from '@/components/NeutralComponents/InfoPage'
import { macroColors, useColors } from '@/context/ThemeContext'

/**
 * Settings — How Graphs Work. Visual walkthrough of the math behind every Progress-tab chart, in
 * tab order: strength (estimate1RM best-set-per-day), sets (getSetsForWeek counting), bodyweight
 * (carry-forward daily series), nutrition (daily sums vs goal, GraphStats rules). MiniBars values
 * are diagram shapes only; the rules they illustrate restate the shipped functions.
 */
export default function HowGraphsWorkScreen() {
    const colors = useColors()
    return (
        <InfoPage lede="Each Progress chart, and the logic behind it.">
            <InfoSection index={1} title="Strength" accent={colors.workout} kicker="Chart 1 (Line Chart)" body="We calculate and display your strongest set of an exercise (for that day) using the Epley formula.">
                <MiniLine accent={colors.workout} values={[234, 240, 247, 253, 259, 241, 247]} />
                <FormulaPanel label="Epley formula" lines={['Estimated 1RM = weight × (1 + 0.0333 × reps)']} cite="Epley B. Boyd Epley Workout, University of Nebraska, 1985" />
            </InfoSection>

            <InfoSection index={2} title="Sets" accent={colors.workout} kicker="Chart 2 (Bar Chart)" body="Displays how many sets you did on a certain day. Rest days don't count towards the average set metric.">
                <MiniBars accent={colors.workout} values={[12, 0, 9, 15, 0, 10, 0]} labels={['S', 'M', 'T', 'W', 'T', 'F', 'S']} />
            </InfoSection>

            <InfoSection index={3} title="Bodyweight" accent={colors.nutrition} kicker="Chart 3 (Line Chart)" body="Displays your current weight. If no weight is logged for a day, it uses the last logged weight.">
                <MiniLine accent={colors.nutrition} values={[10, 10, 9.6, 9.6, 9.6, 9.1, 8.8]} faded={[false, true, false, true, true, false, false]} goal={8.4} />
            </InfoSection>

            <InfoSection index={4} title="Nutrition" accent={colors.nutrition} kicker="Chart 4 (Bar Chart)" body="Displays your total calories or macros for any day.">
                <MiniBars accent={colors.nutrition} values={[1900, 2350, 0, 2100, 2400, 2200, 0]} labels={['S', 'M', 'T', 'W', 'T', 'F', 'S']} goal={2263} />
            </InfoSection>
        </InfoPage>
    )
}
