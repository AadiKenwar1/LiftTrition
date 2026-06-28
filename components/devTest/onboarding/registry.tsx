import { type ComponentType } from 'react'
import ActivityV1 from './versions/activity/V1'
import BirthdayV1 from './versions/birthday/V1'
import GenderV1 from './versions/gender/V1'
import GoalV1 from './versions/goal/V1'
import HeightWeightV1 from './versions/heightWeight/V1'
import IntroV1 from './versions/intro/V1'
import MacrosV1 from './versions/macros/V1'
import PaceV1 from './versions/pace/V1'
import PaywallV1 from './versions/paywall/V1'
import PreboardV1 from './versions/preboard/V1'
import SummaryV1 from './versions/summary/V1'

/**
 * Dev-only registry — the single list that drives the Dev Hub "Onboarding" section, each page's
 * versions sub-page, and the full-screen preview. One entry per onboarding PAGE; each page lists its
 * VERSIONS (standalone copies under versions/<page>/). The real onboarding screens are never touched.
 *
 * To add a Version 2 of a page: drop versions/<page>/V2.tsx, then add
 *   { id: 'v2', label: 'Version 2', Component: <YourV2> }
 * to that page's `versions` array below — it appears as a row on the page's sub-page.
 *
 * Kept in components/devTest so Metro strips it from production.
 */

export interface OnboardingVersion {
    id: string
    label: string
    Component: ComponentType
}

export interface OnboardingPage {
    key: string
    /** Dev Hub row label. */
    label: string
    /** Human name of the screen (shown on the versions sub-page). */
    screen: string
    versions: OnboardingVersion[]
}

export const PAGES: OnboardingPage[] = [
    { key: 'intro', label: 'Onboarding 1', screen: 'Intro', versions: [{ id: 'v1', label: 'Version 1', Component: IntroV1 }] },
    { key: 'preboard', label: 'Onboarding 2', screen: 'Preboard', versions: [{ id: 'v1', label: 'Version 1', Component: PreboardV1 }] },
    { key: 'birthday', label: 'Onboarding 3', screen: 'Birthday', versions: [{ id: 'v1', label: 'Version 1', Component: BirthdayV1 }] },
    { key: 'gender', label: 'Onboarding 4', screen: 'Gender', versions: [{ id: 'v1', label: 'Version 1', Component: GenderV1 }] },
    { key: 'heightWeight', label: 'Onboarding 5', screen: 'Height & Weight', versions: [{ id: 'v1', label: 'Version 1', Component: HeightWeightV1 }] },
    { key: 'activity', label: 'Onboarding 6', screen: 'Activity', versions: [{ id: 'v1', label: 'Version 1', Component: ActivityV1 }] },
    { key: 'goal', label: 'Onboarding 7', screen: 'Goal', versions: [{ id: 'v1', label: 'Version 1', Component: GoalV1 }] },
    { key: 'pace', label: 'Onboarding 8', screen: 'Pace', versions: [{ id: 'v1', label: 'Version 1', Component: PaceV1 }] },
    { key: 'summary', label: 'Onboarding 9', screen: 'Summary', versions: [{ id: 'v1', label: 'Version 1', Component: SummaryV1 }] },
    { key: 'macros', label: 'Onboarding 10', screen: 'Macros', versions: [{ id: 'v1', label: 'Version 1', Component: MacrosV1 }] },
    { key: 'paywall', label: 'Onboarding 11', screen: 'Paywall', versions: [{ id: 'v1', label: 'Version 1', Component: PaywallV1 }] },
]
