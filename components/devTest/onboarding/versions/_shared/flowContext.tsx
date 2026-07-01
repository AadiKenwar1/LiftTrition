import { createContext, useContext, type ReactNode } from 'react'

/**
 * Dev-only flow context. When a preview is rendered inside the FlowRunner, this lets each screen's
 * Back/Next drive the walkthrough (advance / go back) instead of their default inert / router.back.
 * Screens built on V3Screen pick this up automatically; standalone screens (intro, paywall) read it too.
 * Outside a flow this is null and screens behave as standalone previews.
 */
export interface OnboardingFlow {
    goNext: () => void
    goBack: () => void
    index: number
    total: number
    /**
     * 1-based position of the current screen among the NUMBERED steps (screens with a progress bar), or null
     * when the current screen isn't numbered (login, intro, preboard, paywall, …). Skip-aware, so it stays
     * contiguous. The runner computes it; V4Screen reads it to drive both the "Step N of M" eyebrow and the
     * progress dots. V3Screen ignores it (keeps its hardcoded numbering as the preserved baseline).
     */
    stepNumber?: number | null
    /** Total NUMBERED steps in the current (skip-adjusted) flow. */
    stepTotal?: number
    /** Lightweight shared state so a screen's choice can affect the flow (e.g. skip pace when maintaining). */
    data: Record<string, string>
    setData: (key: string, value: string) => void
}

const OnboardingFlowContext = createContext<OnboardingFlow | null>(null)

export function OnboardingFlowProvider({ value, children }: { value: OnboardingFlow; children: ReactNode }) {
    return <OnboardingFlowContext.Provider value={value}>{children}</OnboardingFlowContext.Provider>
}

export function useOnboardingFlow(): OnboardingFlow | null {
    return useContext(OnboardingFlowContext)
}
