import ActivityView, { type ActivityLevel } from '@/components/OnboardingComponents/ActivityView'
import BirthdayView from '@/components/OnboardingComponents/BirthdayView'
import GenderView from '@/components/OnboardingComponents/GenderView'
import GoalView from '@/components/OnboardingComponents/GoalView'
import HeightWeightView from '@/components/OnboardingComponents/HeightWeightView'
import IntroView from '@/components/OnboardingComponents/IntroView'
import MacrosView from '@/components/OnboardingComponents/MacrosView'
import PaceView from '@/components/OnboardingComponents/PaceView'
import PaywallView from '@/components/OnboardingComponents/PaywallView'
import PreboardView from '@/components/OnboardingComponents/PreboardView'
import SummaryView from '@/components/OnboardingComponents/SummaryView'
import type { ReactNode } from 'react'

/**
 * Dev-only registry that drives the Onboarding preview harness (components/devTest/OnboardingFlowTest.tsx).
 * Each step lists one or more VARIANTS sharing a render contract, so you can A/B designs in the Dev Hub
 * and graduate the winner into the shipping view. Kept in components/devTest so Metro strips it from prod —
 * never import this from shipped code. The `current` variant points at the real shared view in
 * components/OnboardingComponents/, so it can't drift from what actually ships.
 */

export interface MockAnswers {
    birthDate: Date
    gender: 'male' | 'female' | null
    unitSystem: 'imperial' | 'metric'
    height: number
    bodyWeight: number
    activityLevel: ActivityLevel | null
    goalType: 'lose' | 'maintain' | 'gain' | null
    goalWeight: number
    goalPace: number
    calorieGoal: number
    proteinGoal: number
    carbsGoal: number
    fatsGoal: number
}

export const seedAnswers = (): MockAnswers => ({
    birthDate: new Date(2001, 0, 1),
    gender: 'male',
    unitSystem: 'metric',
    height: 180,
    bodyWeight: 75,
    activityLevel: 'moderate',
    goalType: 'lose',
    goalWeight: 70,
    goalPace: 0.5,
    calorieGoal: 2200,
    proteinGoal: 165,
    carbsGoal: 220,
    fatsGoal: 60,
})

export const TOTAL_DOTS = 8

export interface FlowCtx {
    store: MockAnswers
    patch: (p: Partial<MockAnswers>) => void
    next: () => void
    back: () => void
    /** 0-based index among the 8 numbered steps for the step-dots; -1 for intro/preboard/paywall. */
    stepIndex: number
    totalSteps: number
}

export interface OnboardingVariant {
    id: string
    label: string
    render: (ctx: FlowCtx) => ReactNode
}

export interface OnboardingStep {
    key: string
    label: string
    /** Step-dot index (0-7) for numbered steps; omit for screens without dots. */
    dot?: number
    variants: OnboardingVariant[]
}

export const STEPS: OnboardingStep[] = [
    {
        key: 'intro',
        label: 'Intro',
        variants: [{ id: 'current', label: 'Current', render: (ctx) => <IntroView onNext={ctx.next} /> }],
    },
    {
        key: 'preboard',
        label: 'Preboard',
        variants: [{ id: 'current', label: 'Current', render: (ctx) => <PreboardView onNext={ctx.next} onBack={ctx.back} /> }],
    },
    {
        key: 'birthday',
        label: 'Birthday',
        dot: 0,
        variants: [{ id: 'current', label: 'Current', render: (ctx) => <BirthdayView value={ctx.store.birthDate} onChange={(d) => ctx.patch({ birthDate: d })} onNext={ctx.next} onBack={ctx.back} stepIndex={ctx.stepIndex} /> }],
    },
    {
        key: 'gender',
        label: 'Gender',
        dot: 1,
        variants: [{ id: 'current', label: 'Current', render: (ctx) => <GenderView value={ctx.store.gender} onChange={(g) => ctx.patch({ gender: g })} onNext={ctx.next} onBack={ctx.back} stepIndex={ctx.stepIndex} /> }],
    },
    {
        key: 'heightweight',
        label: 'Height & Weight',
        dot: 2,
        variants: [
            {
                id: 'current',
                label: 'Current',
                render: (ctx) => (
                    <HeightWeightView
                        onNext={(p) => {
                            if (p.height > 0 && p.bodyWeight > 0) ctx.patch({ height: p.height, bodyWeight: p.bodyWeight, unitSystem: p.unitSystem })
                            ctx.next()
                        }}
                        onBack={ctx.back}
                        stepIndex={ctx.stepIndex}
                    />
                ),
            },
        ],
    },
    {
        key: 'activity',
        label: 'Activity',
        dot: 3,
        variants: [{ id: 'current', label: 'Current', render: (ctx) => <ActivityView value={ctx.store.activityLevel} onChange={(a) => ctx.patch({ activityLevel: a })} onNext={ctx.next} onBack={ctx.back} stepIndex={ctx.stepIndex} /> }],
    },
    {
        key: 'goal',
        label: 'Goal',
        dot: 4,
        variants: [
            {
                id: 'current',
                label: 'Current',
                render: (ctx) => (
                    <GoalView
                        value={ctx.store.goalType}
                        onChange={(g) => ctx.patch({ goalType: g })}
                        targetWeight={ctx.store.goalWeight ? String(ctx.store.goalWeight) : ''}
                        onTargetWeightChange={(s) => ctx.patch({ goalWeight: Number(s) || 0 })}
                        unitSystem={ctx.store.unitSystem}
                        onNext={ctx.next}
                        onBack={ctx.back}
                        stepIndex={ctx.stepIndex}
                    />
                ),
            },
        ],
    },
    {
        key: 'pace',
        label: 'Pace',
        dot: 5,
        variants: [{ id: 'current', label: 'Current', render: (ctx) => <PaceView value={ctx.store.goalPace} onChange={(p) => ctx.patch({ goalPace: p })} onNext={ctx.next} onBack={ctx.back} stepIndex={ctx.stepIndex} /> }],
    },
    {
        key: 'summary',
        label: 'Summary',
        dot: 6,
        variants: [
            {
                id: 'current',
                label: 'Current',
                render: (ctx) => (
                    <SummaryView
                        data={{
                            birthDate: ctx.store.birthDate,
                            gender: ctx.store.gender,
                            unitSystem: ctx.store.unitSystem,
                            height: ctx.store.height,
                            bodyWeight: ctx.store.bodyWeight,
                            activityLevel: ctx.store.activityLevel,
                            goalType: ctx.store.goalType,
                            goalWeight: ctx.store.goalWeight,
                            goalPace: ctx.store.goalPace,
                        }}
                        onNext={ctx.next}
                        onBack={ctx.back}
                        stepIndex={ctx.stepIndex}
                    />
                ),
            },
        ],
    },
    {
        key: 'macros',
        label: 'Macros',
        dot: 7,
        variants: [
            {
                id: 'current',
                label: 'Current',
                render: (ctx) => (
                    <MacrosView
                        macros={{ calorieGoal: ctx.store.calorieGoal, proteinGoal: ctx.store.proteinGoal, carbsGoal: ctx.store.carbsGoal, fatsGoal: ctx.store.fatsGoal }}
                        onSaveMacro={(kind, value) => ctx.patch(kind === 'calories' ? { calorieGoal: value } : kind === 'protein' ? { proteinGoal: value } : kind === 'carbs' ? { carbsGoal: value } : { fatsGoal: value })}
                        onNext={ctx.next}
                        onBack={ctx.back}
                    />
                ),
            },
        ],
    },
    {
        key: 'paywall',
        label: 'Paywall',
        variants: [
            {
                id: 'current',
                label: 'Current',
                render: (ctx) => (
                    <PaywallView
                        loading={false}
                        hasPremium={false}
                        purchasing={false}
                        errorMessage={null}
                        monthlyAvailable
                        annualAvailable
                        monthlyPrice="$4.99"
                        annualPrice="$39.99"
                        onSubscribe={() => ctx.next()}
                        onRestore={() => {}}
                        onFinish={() => ctx.next()}
                        onBack={ctx.back}
                    />
                ),
            },
        ],
    },
]
