import { useAuth } from '@/context/AuthContext'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Platform } from 'react-native'
import Purchases, { CustomerInfo, LOG_LEVEL, PurchasesPackage } from 'react-native-purchases'
import { getAnnualPackage, getMonthlyPackage, getPackagePriceInfo, purchasePackage, restorePurchases } from './functions/billingFunctions'
import { BillingContextInterface } from './types'

const BillingContext = createContext<BillingContextInterface | undefined>(undefined)

export function BillingProvider({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth()

    const [offerings, setOfferings] = useState<any>(null)
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
    const [billingLoading, setBillingLoading] = useState(true)
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const previousUserIdRef = useRef<string | null>(null)

    const loading = authLoading || billingLoading

    // Initialize RevenueCat SDK (runs once on mount)
    useEffect(() => {
        const apiKey = Platform.select({
            ios: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS,
            android: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID,
        })

        if (!apiKey || apiKey === 'NULL') return

        Purchases.setLogLevel(LOG_LEVEL.VERBOSE)
        Purchases.configure({ apiKey })
    }, [])

    // Initialize billing for user (runs when user changes)
    useEffect(() => {
        let listener: any

        async function initializeBilling() {
            if (authLoading || !user?.id) {
                if (!authLoading && !user?.id) {
                    // Only call logOut when transitioning from logged-in to logged-out.
                    // Calling logOut when user is anonymous crashes the app (native exception).
                    const hadUser = previousUserIdRef.current != null
                    if (hadUser) {
                        await Purchases.logOut().catch((e) => {
                            console.warn('[BillingContext] Purchases.logOut failed (expected if already logged out)', e)
                        })
                    }
                    previousUserIdRef.current = null
                    setOfferings(null)
                    setCustomerInfo(null)
                }
                setBillingLoading(false)
                setLoaded(true)
                return
            }

            try {
                previousUserIdRef.current = user.id
                await Purchases.logIn(user.id)
                const [offeringsData, info] = await Promise.all([Purchases.getOfferings(), Purchases.getCustomerInfo()])
                setOfferings(offeringsData)
                setCustomerInfo(info)
                setLoaded(true)
            } catch (err) {
                setError(err instanceof Error ? err : new Error(String(err)))
                setLoaded(true)
            } finally {
                setBillingLoading(false)
            }
        }

        ;(async () => {
            await initializeBilling()
            listener = Purchases.addCustomerInfoUpdateListener(setCustomerInfo)
        })()

        return () => listener?.remove?.()
    }, [authLoading, user?.id])

    // Wrapper functions
    const handlePurchasePackage = useCallback(async (pkg: PurchasesPackage) => {
        return purchasePackage(pkg, setCustomerInfo, setError)
    }, [])

    const handleRestorePurchases = useCallback(async () => {
        return restorePurchases(setCustomerInfo, setError)
    }, [])

    const hasPremium = useMemo(() => {
        return Boolean(customerInfo?.entitlements?.active?.['LiftTrition Pro'])
    }, [customerInfo])

    // Debug: log entitlements and hasPremium when customerInfo changes
    useEffect(() => {
        if (!customerInfo) {
            console.log('[Billing] customerInfo: null')
            return
        }
        const active = customerInfo.entitlements?.active ?? {}
        const activeKeys = Object.keys(active)
        const premiumValue = active['LiftTrition Pro']
        console.log('[Billing] customerInfo.entitlements.active keys:', activeKeys)
        console.log('[Billing] customerInfo.entitlements.active (full):', JSON.stringify(active, null, 2))
        console.log('[Billing] "LiftTrition Premium" value:', premiumValue)
        console.log('[Billing] hasPremium:', Boolean(premiumValue))
    }, [customerInfo])

    // Helper values
    const monthlyPackage = useMemo(() => getMonthlyPackage(offerings), [offerings])
    const annualPackage = useMemo(() => getAnnualPackage(offerings), [offerings])
    const priceInfo = useMemo(() => getPackagePriceInfo(monthlyPackage), [monthlyPackage])
    const annualPriceInfo = useMemo(() => getPackagePriceInfo(annualPackage), [annualPackage])

    const value = useMemo(
        () => ({
            offerings,
            customerInfo,
            loading,
            loaded,
            error,
            purchasePackage: handlePurchasePackage,
            restorePurchases: handleRestorePurchases,
            hasPremium,
            monthlyPackage,
            annualPackage,
            priceInfo,
            annualPriceInfo,
        }),
        [offerings, customerInfo, loading, loaded, error, handlePurchasePackage, handleRestorePurchases, hasPremium, monthlyPackage, annualPackage, priceInfo, annualPriceInfo],
    )

    return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
}

export function useBilling() {
    const context = useContext(BillingContext)
    if (context === undefined) {
        throw new Error('useBilling must be used within a BillingProvider')
    }
    return context
}
