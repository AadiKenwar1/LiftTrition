import { type ComponentType } from 'react'
import ActivityV1 from './versions/activity/V1'
import ActivityRefined from './versions/activity/Refined'
import ActivityV3 from './versions/activity/V3'
import AboutYou from './versions/birthday/AboutYou'
import AboutYouV3 from './versions/birthday/AboutYouV3'
import BirthdayV1 from './versions/birthday/V1'
import GenderV1 from './versions/gender/V1'
import GenderRefined from './versions/gender/Refined'
import GenderV3 from './versions/gender/V3'
import GoalV1 from './versions/goal/V1'
import GoalRefined from './versions/goal/Refined'
import GoalV3 from './versions/goal/V3'
import GoalMotivation from './versions/goalMotivation/Refined'
import GoalMotivationV3 from './versions/goalMotivation/V3'
import GoalProjectionRefined from './versions/goalProjection/Refined'
import GoalProjectionV3 from './versions/goalProjection/V3'
import HeightWeightV1 from './versions/heightWeight/V1'
import HeightWeightRefined from './versions/heightWeight/Refined'
import HeightWeightV3 from './versions/heightWeight/V3'
import IntroV1 from './versions/intro/V1'
import IntroRefined from './versions/intro/Refined'
import IntroV3 from './versions/intro/V3'
import LoginV3 from './versions/login/V3'
import MacrosV1 from './versions/macros/V1'
import MacrosRefined from './versions/macros/Refined'
import MacrosV3 from './versions/macros/V3'
import Obstacles from './versions/obstacles/Refined'
import ObstaclesV3 from './versions/obstacles/V3'
import PaceV1 from './versions/pace/V1'
import PaceRefined from './versions/pace/Refined'
import PaceV3 from './versions/pace/V3'
import PaywallV1 from './versions/paywall/V1'
import PaywallRefined from './versions/paywall/Refined'
import PaywallRefined14 from './versions/paywall/Refined14'
import PaywallV3 from './versions/paywall/V3'
import PreboardV1 from './versions/preboard/V1'
import PreboardRefined from './versions/preboard/Refined'
import PreboardV3 from './versions/preboard/V3'
import ResultsTimeline from './versions/resultsTimeline/Refined'
import ResultsTimelineV3 from './versions/resultsTimeline/V3'
import SecondChance from './versions/secondChance/Refined'
import SecondChanceV3 from './versions/secondChance/V3'
import SummaryV1 from './versions/summary/V1'
// V4 · Neutral + hero color — V3's B&W spine with the flow fixes baked in (see KNOWN ISSUES below). Color
// rule: everything rests neutral; a SELECTED option reveals its domain color (goals/obstacles per-option
// green or blue, Activity blue, eating phase green), and the only always-on color is the green Pace slider,
// the green Projection chart, and the green paywall/second-chance CTA. No intro or preboard (Login opens;
// About You carries the privacy line). (An earlier always-on per-icon coloring pass read as scattered — reverted.)
import AboutYouV4 from './versions/birthday/AboutYouV4'
import ActivityV4 from './versions/activity/V4'
import GoalMotivationV4 from './versions/goalMotivation/V4'
import GoalProjectionV4 from './versions/goalProjection/V4'
import GoalV4 from './versions/goal/V4'
import LoginV4 from './versions/login/V4'
import MacrosV4 from './versions/macros/V4'
import ObstaclesV4 from './versions/obstacles/V4'
import PaceV4 from './versions/pace/V4'
import PaywallV4 from './versions/paywall/V4'
import ResultsTimelineV4 from './versions/resultsTimeline/V4'
import SecondChanceV4 from './versions/secondChance/V4'

/**
 * Dev-only registry — the single list that drives the Dev Hub "Onboarding" section, each step's
 * versions sub-page, and the full-screen preview. ONE row per FLOW STEP, ordered to match the intended
 * flow, so you can click Onboarding 1→N to walk it. Reworked designs are VERSIONS under a step's row;
 * genuinely NEW steps are new rows at their flow position. The real onboarding screens are never touched.
 *
 * Each step now carries up to three redesigns: "Refined" (themed dark/light), the merged/new pieces,
 * and "V3 · Black & white" — the neutral B&W direction (no gradient wash, no icon-circle, big typographic
 * titles, restrained green/blue semantic accents, deduped goal copy). Kept in components/devTest so Metro
 * strips it from production.
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

const V3 = (Component: ComponentType): OnboardingVersion => ({ id: 'v3', label: 'V3 · Black & white', Component })
const V4 = (Component: ComponentType): OnboardingVersion => ({ id: 'v4', label: 'V4 · Neutral + hero color', Component })

/**
 * KNOWN ISSUES — V3 flow polish (from review 2026-07-01). V4 (id 'v4' / "Walk the V4 flow") fixes ALL of
 * these; V3 is kept untouched as the "before" baseline for comparison. Details for reference:
 *  1. Progress numbering skips. Obstacles is "Step 2 of 12", the next flow screen (About You) is "Step 5" —
 *     steps 3–4 are intro/preboard, which are EXCLUDEd from FlowRunner and carry no `step` prop. V3Screen
 *     draws StepProgress from the hardcoded `step` prop, not flow.index/flow.total, so in the walkthrough the
 *     dots jump 2→5 and the 12th dot never fills. Fix: drive step/total from the flow when one is present.
 *  2. Semantic accent unimplemented. Most screens set `accent = colors.text` despite "green/blue accent"
 *     header comments. Only Activity diverges (options use colors.workout), so its selected state is the lone
 *     blue in the flow. Either wire the blue/green accents (see color plan) or drop the stale comments.
 *  3. Units drift. About You defaults to imperial, but Goal/Pace/GoalProjection/Paywall hardcode 'kg'. Unit
 *     isn't propagated through flowContext.data the way `phase` is.
 *  4. Pace labels unreachable. getPaceLabel returns Fast/Very fast/Extreme at ≥1.5–2.5, but the slider maxes
 *     at 1.5 — only Very slow/Slow/Moderate can ever show.
 *  5. Paywall CTA is inert. The primary "Start trial" button does nothing; only "Maybe later" advances, so the
 *     accepted-purchase path can't be walked.
 *  6. Goal Projection shows the progress bar but breaks the "Step N of 12" eyebrow (uses "Your projection").
 */

export const PAGES: OnboardingPage[] = [
    { key: 'login', label: 'Login (opener)', screen: 'Login · sign in', versions: [V3(LoginV3), V4(LoginV4)] },
    { key: 'goalMotivation', label: 'Onboarding 1', screen: 'Goal & Motivation (new)', versions: [{ id: 'v1', label: 'Version 1', Component: GoalMotivation }, V3(GoalMotivationV3), V4(GoalMotivationV4)] },
    { key: 'obstacles', label: 'Onboarding 2', screen: 'Obstacles (new)', versions: [{ id: 'v1', label: 'Version 1', Component: Obstacles }, V3(ObstaclesV3), V4(ObstaclesV4)] },
    { key: 'intro', label: 'Onboarding 3', screen: 'Intro', versions: [{ id: 'v1', label: 'Version 1', Component: IntroV1 }, { id: 'refined', label: 'Refined', Component: IntroRefined }, V3(IntroV3)] },
    { key: 'preboard', label: 'Onboarding 4', screen: 'Preboard', versions: [{ id: 'v1', label: 'Version 1', Component: PreboardV1 }, { id: 'refined', label: 'Refined', Component: PreboardRefined }, V3(PreboardV3)] },
    { key: 'birthday', label: 'Onboarding 5', screen: 'About You (body details)', versions: [{ id: 'v1', label: 'Version 1', Component: BirthdayV1 }, { id: 'aboutYou', label: 'About You (merged, restyled)', Component: AboutYou }, V3(AboutYouV3), V4(AboutYouV4)] },
    { key: 'gender', label: 'Onboarding 5a', screen: 'Gender (unmerged alt)', versions: [{ id: 'v1', label: 'Version 1', Component: GenderV1 }, { id: 'refined', label: 'Refined', Component: GenderRefined }, V3(GenderV3)] },
    { key: 'heightWeight', label: 'Onboarding 5b', screen: 'Height & Weight (unmerged alt)', versions: [{ id: 'v1', label: 'Version 1', Component: HeightWeightV1 }, { id: 'refined', label: 'Refined', Component: HeightWeightRefined }, V3(HeightWeightV3)] },
    { key: 'activity', label: 'Onboarding 6', screen: 'Activity', versions: [{ id: 'v1', label: 'Version 1', Component: ActivityV1 }, { id: 'refined', label: 'Refined', Component: ActivityRefined }, V3(ActivityV3), V4(ActivityV4)] },
    { key: 'goal', label: 'Onboarding 7', screen: 'Body-Weight Goal', versions: [{ id: 'v1', label: 'Version 1', Component: GoalV1 }, { id: 'refined', label: 'Refined', Component: GoalRefined }, V3(GoalV3), V4(GoalV4)] },
    { key: 'pace', label: 'Onboarding 8', screen: 'Pace', versions: [{ id: 'v1', label: 'Version 1', Component: PaceV1 }, { id: 'refined', label: 'Refined', Component: PaceRefined }, V3(PaceV3), V4(PaceV4)] },
    { key: 'resultsTimeline', label: 'Onboarding 9', screen: 'Results Timeline (new)', versions: [{ id: 'v1', label: 'Version 1', Component: ResultsTimeline }, V3(ResultsTimelineV3), V4(ResultsTimelineV4)] },
    { key: 'macros', label: 'Onboarding 10', screen: 'Macros', versions: [{ id: 'v1', label: 'Version 1', Component: MacrosV1 }, { id: 'refined', label: 'Refined', Component: MacrosRefined }, V3(MacrosV3), V4(MacrosV4)] },
    { key: 'summary', label: 'Onboarding 11', screen: 'Goal Projection', versions: [{ id: 'v1', label: 'Version 1', Component: SummaryV1 }, { id: 'projection', label: 'Goal Projection (signature)', Component: GoalProjectionRefined }, V3(GoalProjectionV3), V4(GoalProjectionV4)] },
    { key: 'paywall', label: 'Onboarding 12', screen: 'Paywall', versions: [{ id: 'v1', label: 'Version 1', Component: PaywallV1 }, { id: 'refined', label: 'Refined · 7-day trial', Component: PaywallRefined }, { id: 'refined14', label: 'Refined · 14-day trial', Component: PaywallRefined14 }, V3(PaywallV3), V4(PaywallV4)] },
    { key: 'secondChance', label: 'Onboarding 13', screen: 'Second-chance offer (new)', versions: [{ id: 'v1', label: 'Version 1', Component: SecondChance }, V3(SecondChanceV3), V4(SecondChanceV4)] },
]
