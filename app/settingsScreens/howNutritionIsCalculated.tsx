import { FormulaPanel, InfoNote, InfoPage, InfoSection, Legend, ScaleBars, SplitBar } from '@/components/NeutralComponents/InfoPage'
import { macroColors, useColors } from '@/context/ThemeContext'

/**
 * Settings — How Nutrition is Calculated. Visual walkthrough of the exact shipped math in
 * macroCalculation.tsx (Mifflin-St Jeor BMR → activity factor → pace adjustment → percentage macro
 * split). Diagram values restate the shipped constants and must follow any change to them.
 */
export default function HowNutritionIsCalculatedScreen() {
    const colors = useColors()
    return (
        <InfoPage lede="How we calculate your calorie and macronutrient goals.">
            <InfoSection index={1} title="Resting burn" accent={colors.nutrition} kicker="Step 1" body="Your BMR: the calories you burn just staying alive. Weight in kg, height in cm.">
                <FormulaPanel label="Mifflin-St Jeor equation" lines={['Men: 10 × weight + 6.25 × height − 5 × age + 5', 'Women: 10 × weight + 6.25 × height − 5 × age − 161']} cite="Mifflin MD, St Jeor ST, et al. Am J Clin Nutr 51(2), 1990" />
            </InfoSection>

            <InfoSection index={2} title="Daily burn" accent={colors.nutrition} kicker="Step 2" body="BMR × how active you are = your maintenance calories.">
                <ScaleBars
                    accent={colors.nutrition}
                    rows={[
                        { label: 'Sedentary', value: 1.2, display: '× 1.2' },
                        { label: 'Light', value: 1.375, display: '× 1.375' },
                        { label: 'Moderate', value: 1.55, display: '× 1.55' },
                        { label: 'Active', value: 1.725, display: '× 1.725' },
                        { label: 'Gym rat', value: 1.9, display: '× 1.9' },
                    ]}
                />
            </InfoSection>

            <InfoSection index={3} title="Your target" accent={colors.nutrition} kicker="Step 3" body="We subtract or add calories based on your desired weekly weight goal pace.">
                <FormulaPanel lines={['target = maintenance ± (pace × 3500) ÷ 7']} />
                <ScaleBars
                    accent={colors.nutrition}
                    rows={[
                        { label: '0.5 lb/wk', value: 250, display: '250 kcal' },
                        { label: '1 lb/wk', value: 500, display: '500 kcal' },
                        { label: '1.5 lb/wk', value: 750, display: '750 kcal' },
                        { label: '2 lb/wk', value: 1000, display: '1,000 kcal' },
                    ]}
                />
                <InfoNote>Targets under 1,500 kcal (men) or 1,200 kcal (women) show a warning — never a silent change.</InfoNote>
            </InfoSection>

            <InfoSection index={4} title="Splitting into macros" accent={colors.nutrition} kicker="Step 4" body="We split your macros based on a percentage of calories.">
                <Legend items={[{ label: 'Protein', color: macroColors.protein }, { label: 'Fat', color: colors.nutrition }, { label: 'Carbs', color: macroColors.carbs }]} />
                <SplitBar label="Lose" segments={[{ pct: 30, color: macroColors.protein }, { pct: 30, color: colors.nutrition }, { pct: 40, color: macroColors.carbs, textColor: 'rgba(0,0,0,0.65)' }]} />
                <SplitBar label="Maintain" segments={[{ pct: 25, color: macroColors.protein }, { pct: 30, color: colors.nutrition }, { pct: 45, color: macroColors.carbs, textColor: 'rgba(0,0,0,0.65)' }]} />
                <SplitBar label="Gain" segments={[{ pct: 25, color: macroColors.protein }, { pct: 25, color: colors.nutrition }, { pct: 50, color: macroColors.carbs, textColor: 'rgba(0,0,0,0.65)' }]} />
                <InfoNote>Note that we use this method as it allows the widest range of individuals to use our nutrition plans. For a more personalized plan, please see a licensed nutritionist.</InfoNote>
            </InfoSection>
        </InfoPage>
    )
}
