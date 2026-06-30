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
