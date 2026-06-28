import PaywallView, { type PlanType } from '@/components/OnboardingComponents/PaywallView'
import { useBilling } from '@/context/BillingContext'
import { useSettings } from '@/context/SettingsContext'
import { router } from 'expo-router'
import { useState } from 'react'
import { Alert } from 'react-native'

export default function Onboarding10Screen() {
    const [purchasing, setPurchasing] = useState(false)
    const { settings, setSettings } = useSettings()
    const { loading, hasPremium, monthlyPackage, annualPackage, priceInfo, annualPriceInfo, purchasePackage, restorePurchases, error } = useBilling()

    const completeOnboarding = () => {
        setSettings({
            ...settings,
            onboardingComplete: true,
            onboardingCompletedAt: new Date(),
        })
        router.replace('/(tabs)')
    }

    const handleSubscribe = async (plan: PlanType) => {
        const pkg = plan === 'monthly' ? monthlyPackage : annualPackage
        if (!pkg) {
            Alert.alert('Error', 'Subscription package not available. Please try again later.')
            return
        }

        setPurchasing(true)
        try {
            await purchasePackage(pkg)
            Alert.alert('Success', 'Your subscription is now active!')
            completeOnboarding()
        } catch (err: any) {
            if (err.userCancelled) {
                setPurchasing(false)
                return
            }
            Alert.alert('Error', err.message || 'Failed to complete purchase. Please try again.')
        } finally {
            setPurchasing(false)
        }
    }

    const handleRestore = async () => {
        try {
            await restorePurchases()
            Alert.alert('Success', 'Purchases restored successfully!')
            completeOnboarding()
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to restore purchases. Please try again.')
        }
    }

    return (
        <PaywallView
            loading={loading}
            hasPremium={hasPremium}
            purchasing={purchasing}
            errorMessage={error?.message ?? null}
            monthlyAvailable={!!monthlyPackage}
            annualAvailable={!!annualPackage}
            monthlyPrice={priceInfo?.price || '$4.99'}
            annualPrice={annualPriceInfo?.price || '$39.99'}
            onSubscribe={handleSubscribe}
            onRestore={handleRestore}
            onFinish={completeOnboarding}
            onBack={() => router.back()}
        />
    )
}
