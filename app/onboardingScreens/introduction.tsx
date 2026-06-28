import IntroView from '@/components/OnboardingComponents/IntroView'
import { useRouter } from 'expo-router'

export default function IntroductionScreen() {
    const router = useRouter()
    return <IntroView onNext={() => router.push('/onboardingScreens/preboard')} />
}
