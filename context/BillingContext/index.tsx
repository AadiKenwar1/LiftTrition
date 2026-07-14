import { useAuth } from '@/context/AuthContext'
import { useForceFreeMode } from '@/lib/devtools/forceFreeMode'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Platform } from 'react-native'
import Purchases, { CustomerInfo, LOG_LEVEL, PurchasesPackage } from 'react-native-purchases'
import { getAnnualPackage, getAnnualSavingsPercent, getMonthlyPackage, getPackagePriceInfo, hasActiveEntitlement, purchasePackage, restorePurchases } from './functions/billingFunctions'
import { BillingContextInterface } from './types'

export { ENTITLEMENT_ID, hasActiveEntitlement } from './functions/billingFunctions'

const BillingContext = createContext<BillingContextInterface | undefined>(undefined)

const BILLING_INIT_TIMEOUT_MS = 15_000

export function BillingProvider({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth()

    const [offerings, setOfferings] = useState<any>(null)
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
    const [billingLoading, setBillingLoading] = useState(true)
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const [restoring, setRestoring] = useState(false)
    const previousUserIdRef = useRef<string | null>(null)

    const loading = authLoading || billingLoading

    // Initialize RevenueCat SDK (runs once on mount)
    useEffect(() => {
        const apiKey = Platform.select({
            ios: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS,
            android: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID,
        })

        if (!apiKey || apiKey === 'NULL') return

        Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.ERROR)
        Purchases.configure({ apiKey })
    }, [])

    // Initialize billing for user (runs when auth / user changes)
    useEffect(() => {
        let cancelled = false
        let listener: { remove?: () => void } | undefined
        let timeoutId: ReturnType<typeof setTimeout> | undefined

        async function initializeBilling() {
            if (authLoading) {
                return
            }

            if (!user?.id) {
                const hadUser = previousUserIdRef.current != null
                if (hadUser) {
                    await Purchases.logOut().catch((e) => {
                        console.warn('[BillingContext] Purchases.logOut failed (expected if already logged out)', e)
                    })
                }
                previousUserIdRef.current = null
                if (cancelled) return
                setOfferings(null)
                setCustomerInfo(null)
                setError(null)
                setBillingLoading(false)
                setLoaded(true)
                return
            }

            setLoaded(false)
            setBillingLoading(true)
            setError(null)

            timeoutId = setTimeout(() => {
                if (cancelled) return
                console.warn('[BillingContext] RevenueCat init timed out; continuing without subscription data')
                setLoaded(true)
                setBillingLoading(false)
            }, BILLING_INIT_TIMEOUT_MS)

            try {
                previousUserIdRef.current = user.id
                await Purchases.logIn(user.id)
                if (cancelled) return

                const [offeringsData, info] = await Promise.all([Purchases.getOfferings(), Purchases.getCustomerInfo()])
                if (cancelled) return
                setOfferings(offeringsData)
                setCustomerInfo(info)
            } catch (err) {
                if (cancelled) return
                setError(err instanceof Error ? err : new Error(String(err)))
            } finally {
                if (timeoutId) clearTimeout(timeoutId)
                if (!cancelled) {
                    setLoaded(true)
                    setBillingLoading(false)
                }
            }
        }

        void (async () => {
            await initializeBilling()
            if (!cancelled && user?.id) {
                listener = Purchases.addCustomerInfoUpdateListener((info) => {
                    if (!cancelled) setCustomerInfo(info)
                })
            }
        })()

        return () => {
            cancelled = true
            if (timeoutId) clearTimeout(timeoutId)
            listener?.remove?.()
        }
    }, [authLoading, user?.id])

    // Wrapper functions
    const handlePurchasePackage = useCallback(async (pkg: PurchasesPackage) => {
        return purchasePackage(pkg, setCustomerInfo, setError)
    }, [])

    const handleRestorePurchases = useCallback(async () => {
        setRestoring(true)
        try {
            return await restorePurchases(setCustomerInfo, setError)
        } finally {
            setRestoring(false)
        }
    }, [])

    const forceFree = useForceFreeMode()
    const hasPremium = useMemo(() => (__DEV__ && forceFree ? false : hasActiveEntitlement(customerInfo)), [customerInfo, forceFree])

    // Helper values
    const monthlyPackage = useMemo(() => getMonthlyPackage(offerings), [offerings])
    const annualPackage = useMemo(() => getAnnualPackage(offerings), [offerings])
    const priceInfo = useMemo(() => getPackagePriceInfo(monthlyPackage), [monthlyPackage])
    const annualPriceInfo = useMemo(() => getPackagePriceInfo(annualPackage), [annualPackage])
    const annualSavingsPercent = useMemo(() => getAnnualSavingsPercent(monthlyPackage, annualPackage), [monthlyPackage, annualPackage])

    const value = useMemo(
        () => ({
            offerings,
            customerInfo,
            loading,
            loaded,
            restoring,
            error,
            purchasePackage: handlePurchasePackage,
            restorePurchases: handleRestorePurchases,
            hasPremium,
            monthlyPackage,
            annualPackage,
            priceInfo,
            annualPriceInfo,
            annualSavingsPercent,
        }),
        [offerings, customerInfo, loading, loaded, restoring, error, handlePurchasePackage, handleRestorePurchases, hasPremium, monthlyPackage, annualPackage, priceInfo, annualPriceInfo, annualSavingsPercent],
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
