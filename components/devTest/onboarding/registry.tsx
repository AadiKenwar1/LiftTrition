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
// green or blue, Activity blue, eating phase green); always-on color is limited to the green Pace slider,
// the conventional macro colors on the Macros tiles (orange/red/yellow/green), the phase-aware Projection
// chart (green weight line down/up for cut/bulk; flat green + rising blue strength line for maintain/recomp),
// and the green paywall CTA. No intro or preboard (Login opens; About You carries the privacy line), and no
// second-chance step for now — it needs real gating + RevenueCat offering logic to be honest, so it's
// deferred until that exists (V3/Refined designs remain below for reference).
// Guardrails: Next is disabled until each step's required input exists (selection made / fields non-empty;
// no preselected eating phase), and semantic checks reuse the production SettingsContext validators
// (validateHeightWeight, validateTargetWeight — Alert-style) plus a 13+ age check on About You. About You
// shares weight/unit and the phase screen shares target through flow.data, so Projection + Paywall show the
// user's real numbers (mock fallbacks remain for standalone previews).
// (An earlier always-on per-icon coloring pass read as scattered — reverted.)
import AboutYouV4 from './versions/birthday/AboutYouV4'
import ActivityV4 from './versions/activity/V4'
import GoalMotivationV4 from './versions/goalMotivation/V4'
import GoalProjectionV4 from './versions/goalProjection/V4'
import GoalV4 from './versions/goal/V4'
import LoginV4 from './versions/login/V4'
import LoginWordmark from './versions/login/Wordmark'
import LoginMonogram from './versions/login/Monogram'
import LoginValueProp from './versions/login/ValueProp'
import MacrosV4 from './versions/macros/V4'
import ObstaclesV4 from './versions/obstacles/V4'
import PaceV4 from './versions/pace/V4'
import PaywallV4 from './versions/paywall/V4'
import ResultsTimelineV4 from './versions/resultsTimeline/V4'
// V5 · Reordered flow — V4's visual language (it reuses V4Screen unchanged), resequenced around two ideas:
// commit the user to a goal as early as possible, and never show a number before the thing it depends on.
// Order: goals → obstacles → activity → goal+weight → about you → pace → plan → PROJECTION → paywall.
//  · Activity moves to step 3, so three tap screens run before the first keyboard and the goal ask lands on a
//    run of easy yeses instead of opening the flow cold.
//  · Weight + goal weight merge into the eating-phase screen at step 4, so the delta sits in one frame and
//    validateTargetWeight checks against a weight the user just typed. Unit toggle + privacy line move with
//    them; the phase options are the only thing on screen until one is picked.
//  · About You drops to sex + DOB + height — exactly the calorie inputs step 4 doesn't collect — and its
//    subtitle names that, so step 5 reads as pricing the goal rather than as another cold form.
//  · Pace follows About You, so every input the calorie math needs exists before a rate is chosen.
//  · Projection is LAST (step 8). An earlier V5 pass ran it at step 6 on the theory that weeks-to-goal needs
//    only weight/goal/pace; it does arithmetically, but the date is a claim about what eating the plan produces,
//    so it now lands after the plan screen rather than before it.
//  · Results Timeline is CUT — generic week-1/2/4/8 flavor is filler next to a real projection.
// Wiring the earlier versions left dangling: pace is written to the flow so the projection's "at your pace" is
// true, and the paywall shares the projection's weeksToGoal date. Goals + obstacles are written to the flow too
// but nothing reads them back — no screen quotes an earlier answer, and nothing in V5 recommends, preselects or
// badges an option. Net 8 numbered steps (7 on maintain), down from 9. The pace slider is still V4's uncapped
// 0.1–3 — see PaceV5's header.
import AboutYouV5 from './versions/birthday/AboutYouV5'
import ActivityV5 from './versions/activity/V5'
import GoalMotivationV5 from './versions/goalMotivation/V5'
import GoalProjectionV5 from './versions/goalProjection/V5'
import GoalV5 from './versions/goal/V5'
// V5a/b/c — one-screen layout candidates for the goal step. V5's version scrolls on smaller phones and the
// keyboard covers the weight fields; these compete to fit the same content in one view and differ ONLY in
// layout (shared state lives in _shared/useGoalDraft).
import GoalV5a from './versions/goal/V5a'
import GoalV5b from './versions/goal/V5b'
import GoalV5c from './versions/goal/V5c'
import MacrosV5 from './versions/macros/V5'
import ObstaclesV5 from './versions/obstacles/V5'
import PaceV5 from './versions/pace/V5'
import PaywallV5 from './versions/paywall/V5'
// V6 · Copy pass — V5's screens with the writing changed and nothing else, read as someone who knows a few gym
// terms and nothing about the app. Six subtitles hinged on the same em dash construction, four of them in the
// identical "[instruction] — [we'll do X]" shape, and the paywall's stacked three of those habits in one
// sentence. Beyond that: About You's title named nothing, so the subtitle carried the whole justification for
// three personal questions; Activity claimed to SET a burn one tap can only estimate; the plan screen's footnote
// gave a Settings path a first-time user has never seen. Step 1 keeps V5's claim that the plan is built around
// the goals picked — nothing reads them back, and it stays as flavour on purpose — while step 2 drops the same
// promise, since an obstacle is the least actionable answer here. Goal and pace needed no change, so v6 points
// at their v5 components rather than forking files that would differ by nothing.
import ActivityV6 from './versions/activity/V6'
import AboutYouV6 from './versions/birthday/AboutYouV6'
import GoalMotivationV6 from './versions/goalMotivation/V6'
import GoalProjectionV6 from './versions/goalProjection/V6'
import MacrosV6 from './versions/macros/V6'
import ObstaclesV6 from './versions/obstacles/V6'
import PaywallV6 from './versions/paywall/V6'
// Rating ask — a NEW step rather than a redesign, so it gets its own row at its flow position (after the
// projection, before the paywall). New in v6: it doesn't exist in the earlier versions and those rows are
// frozen. Three visual candidates share shared.ts's single hand-off; only the 'v6' one plays in the flow.
import RatingV6 from './versions/rating/V6'
import RatingTile from './versions/rating/Tile'
import RatingBigStar from './versions/rating/BigStar'
import RatingAutoPrompt from './versions/rating/AutoPrompt'
import RatingSocialProof from './versions/rating/SocialProof'
import RatingPlanRecap from './versions/rating/PlanRecap'
import RatingTwoAnswer from './versions/rating/TwoAnswer'
import RatingLogoHalo from './versions/rating/LogoHalo'
import RatingHaloArc from './versions/rating/HaloArc'
import RatingHaloScatter from './versions/rating/HaloScatter'
import RatingHaloRow from './versions/rating/HaloRow'
import RatingQuiet from './versions/rating/Quiet'
import RatingCard from './versions/rating/Card'
import RatingStoreRow from './versions/rating/StoreRow'
import RatingGradientHero from './versions/rating/GradientHero'

/**
 * Dev-only registry — the single list that drives the Dev Hub "Onboarding" section, each step's
 * versions sub-page, and the full-screen preview. ONE row per FLOW STEP, ordered to match the intended
 * flow, so you can click Onboarding 1→N to walk it. Reworked designs are VERSIONS under a step's row;
 * genuinely NEW steps are new rows at their flow position. The real onboarding screens are never touched.
 * Row order is the v1/v3/v4 sequence; v5 resequences the same rows and declares its own order in FlowRunner.
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
const V5 = (Component: ComponentType): OnboardingVersion => ({ id: 'v5', label: 'V5 · Reordered flow', Component })
const V6 = (Component: ComponentType): OnboardingVersion => ({ id: 'v6', label: 'V6 · Copy pass', Component })
/** V6 rows whose copy the pass left alone: same component as v5, labelled so the reuse is deliberate rather than a gap. */
const V6Same = (Component: ComponentType): OnboardingVersion => ({ id: 'v6', label: 'V6 · Copy pass (unchanged from V5)', Component })

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
    { key: 'login', label: 'Login (opener)', screen: 'Login · sign in', versions: [V3(LoginV3), V4(LoginV4), { id: 'v5', label: 'V5 · Reordered flow (unchanged from V4)', Component: LoginV4 }, { id: 'v6', label: 'V6 · Copy pass (unchanged from V4)', Component: LoginV4 }, { id: 'wordmark', label: 'Wordmark', Component: LoginWordmark }, { id: 'monogram', label: 'Monogram tile', Component: LoginMonogram }, { id: 'valueprop', label: 'Value-led', Component: LoginValueProp }] },
    { key: 'goalMotivation', label: 'Onboarding 1', screen: 'Goal & Motivation (new)', versions: [{ id: 'v1', label: 'Version 1', Component: GoalMotivation }, V3(GoalMotivationV3), V4(GoalMotivationV4), V5(GoalMotivationV5), V6(GoalMotivationV6)] },
    { key: 'obstacles', label: 'Onboarding 2', screen: 'Obstacles (new)', versions: [{ id: 'v1', label: 'Version 1', Component: Obstacles }, V3(ObstaclesV3), V4(ObstaclesV4), V5(ObstaclesV5), V6(ObstaclesV6)] },
    { key: 'intro', label: 'Onboarding 3', screen: 'Intro', versions: [{ id: 'v1', label: 'Version 1', Component: IntroV1 }, { id: 'refined', label: 'Refined', Component: IntroRefined }, V3(IntroV3)] },
    { key: 'preboard', label: 'Onboarding 4', screen: 'Preboard', versions: [{ id: 'v1', label: 'Version 1', Component: PreboardV1 }, { id: 'refined', label: 'Refined', Component: PreboardRefined }, V3(PreboardV3)] },
    { key: 'birthday', label: 'Onboarding 5', screen: 'About You (body details)', versions: [{ id: 'v1', label: 'Version 1', Component: BirthdayV1 }, { id: 'aboutYou', label: 'About You (merged, restyled)', Component: AboutYou }, V3(AboutYouV3), V4(AboutYouV4), V5(AboutYouV5), V6(AboutYouV6)] },
    { key: 'gender', label: 'Onboarding 5a', screen: 'Gender (unmerged alt)', versions: [{ id: 'v1', label: 'Version 1', Component: GenderV1 }, { id: 'refined', label: 'Refined', Component: GenderRefined }, V3(GenderV3)] },
    { key: 'heightWeight', label: 'Onboarding 5b', screen: 'Height & Weight (unmerged alt)', versions: [{ id: 'v1', label: 'Version 1', Component: HeightWeightV1 }, { id: 'refined', label: 'Refined', Component: HeightWeightRefined }, V3(HeightWeightV3)] },
    { key: 'activity', label: 'Onboarding 6', screen: 'Activity', versions: [{ id: 'v1', label: 'Version 1', Component: ActivityV1 }, { id: 'refined', label: 'Refined', Component: ActivityRefined }, V3(ActivityV3), V4(ActivityV4), V5(ActivityV5), V6(ActivityV6)] },
    { key: 'goal', label: 'Onboarding 7', screen: 'Body-Weight Goal', versions: [{ id: 'v1', label: 'Version 1', Component: GoalV1 }, { id: 'refined', label: 'Refined', Component: GoalRefined }, V3(GoalV3), V4(GoalV4), V5(GoalV5), { id: 'v5a', label: 'V5a · One screen — tiles + paired weights', Component: GoalV5a }, { id: 'v5b', label: 'V5b · One screen — segmented + form rows', Component: GoalV5b }, { id: 'v5c', label: 'V5c · One screen — cards kept, weights paired', Component: GoalV5c }, { id: 'v6', label: 'V6 · Copy pass (V5a layout, copy unchanged)', Component: GoalV5a }] },
    { key: 'pace', label: 'Onboarding 8', screen: 'Pace', versions: [{ id: 'v1', label: 'Version 1', Component: PaceV1 }, { id: 'refined', label: 'Refined', Component: PaceRefined }, V3(PaceV3), V4(PaceV4), V5(PaceV5), V6Same(PaceV5)] },
    { key: 'resultsTimeline', label: 'Onboarding 9', screen: 'Results Timeline (new)', versions: [{ id: 'v1', label: 'Version 1', Component: ResultsTimeline }, V3(ResultsTimelineV3), V4(ResultsTimelineV4)] },
    { key: 'macros', label: 'Onboarding 10', screen: 'Macros', versions: [{ id: 'v1', label: 'Version 1', Component: MacrosV1 }, { id: 'refined', label: 'Refined', Component: MacrosRefined }, V3(MacrosV3), V4(MacrosV4), V5(MacrosV5), V6(MacrosV6)] },
    { key: 'summary', label: 'Onboarding 11', screen: 'Goal Projection', versions: [{ id: 'v1', label: 'Version 1', Component: SummaryV1 }, { id: 'projection', label: 'Goal Projection (signature)', Component: GoalProjectionRefined }, V3(GoalProjectionV3), V4(GoalProjectionV4), V5(GoalProjectionV5), V6(GoalProjectionV6)] },
    { key: 'rating', label: 'Onboarding 11a', screen: 'Rating ask (new)', versions: [{ id: 'v6', label: 'V6 · Store row (in flow)', Component: RatingStoreRow }, { id: 'quiet', label: 'Quiet · text link, no slabs', Component: RatingQuiet }, { id: 'card', label: 'Card · one grouped object', Component: RatingCard }, { id: 'gradientHero', label: 'Gradient hero · paywall language', Component: RatingGradientHero }, { id: 'logoHalo', label: 'Logo halo · ring', Component: RatingLogoHalo }, { id: 'haloArc', label: 'Logo halo · arc above', Component: RatingHaloArc }, { id: 'haloScatter', label: 'Logo halo · scattered', Component: RatingHaloScatter }, { id: 'haloRow', label: 'Logo halo · row beneath', Component: RatingHaloRow }, { id: 'starRow', label: 'Star row', Component: RatingV6 }, { id: 'tile', label: 'App tile', Component: RatingTile }, { id: 'bigStar', label: 'Big star', Component: RatingBigStar }, { id: 'autoPrompt', label: 'Auto-prompt · no button (HIG)', Component: RatingAutoPrompt }, { id: 'planRecap', label: 'Plan recap · effort anchor', Component: RatingPlanRecap }, { id: 'socialProof', label: 'Social proof · PLACEHOLDER numbers', Component: RatingSocialProof }, { id: 'twoAnswer', label: 'Two-answer · iOS only, ungated', Component: RatingTwoAnswer }] },
    { key: 'paywall', label: 'Onboarding 12', screen: 'Paywall', versions: [{ id: 'v1', label: 'Version 1', Component: PaywallV1 }, { id: 'refined', label: 'Refined · 7-day trial', Component: PaywallRefined }, { id: 'refined14', label: 'Refined · 14-day trial', Component: PaywallRefined14 }, V3(PaywallV3), V4(PaywallV4), V5(PaywallV5), V6(PaywallV6)] },
    { key: 'secondChance', label: 'Onboarding 13', screen: 'Second-chance offer (new)', versions: [{ id: 'v1', label: 'Version 1', Component: SecondChance }, V3(SecondChanceV3)] },
]
