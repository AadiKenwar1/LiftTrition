import PreboardView from '@/components/OnboardingComponents/PreboardView'
import { router } from 'expo-router'

export default function PreboardScreen() {
    return <PreboardView onNext={() => router.push('/onboardingScreens/onboarding2')} onBack={() => router.back()} />
}
