import { useAuth } from '@/context/AuthContext'
import { useForceFreeMode } from '@/lib/devtools/forceFreeMode'
import { ENV } from '@/lib/env'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Platform } from 'react-native'
import Purchases, { CustomerInfo, LOG_LEVEL, PurchasesPackage } from 'react-native-purchases'
import { getAnnualPackage, getAnnualSavingsPercent, getMonthlyPackage, getPackagePriceInfo, hasActiveEntitlement, purchasePackage, restorePurchases } from './functions/billingFunctions'
import { BillingIdentityStatus, ensureBillingIdentity } from './functions/identityGuard'
import { getSdkUserId, isSdkConfigured, markSdkConfigured, setSdkUserId } from './functions/sdkIdentity'
import { BillingContextInterface } from './types'

export { ENTITLEMENT_ID, hasActiveEntitlement } from './functions/billingFunctions'
export { BILLING_IDENTITY_ERROR_MESSAGE, BillingIdentityError } from './functions/identityGuard'

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
    const [identityReady, setIdentityReady] = useState(false)
    const identityStatusRef = useRef<BillingIdentityStatus>('none')
    const userIdRef = useRef<string | null>(null)

    const loading = authLoading || billingLoading

    // Records the SDK identity state and mirrors it into the identityReady flag the CTAs read
    const markIdentityStatus = useCallback((status: BillingIdentityStatus) => {
        identityStatusRef.current = status
        setIdentityReady(status === 'verified')
    }, [])

    // Configure/identify RevenueCat for the current user (runs when auth / user changes).
    // The SDK is never configured anonymously: configure waits for the signed-in user and
    // passes appUserID, so a purchase can never land on an anonymous customer record.
    useEffect(() => {
        let cancelled = false
        let listener: ((info: CustomerInfo) => void) | undefined
        let timeoutId: ReturnType<typeof setTimeout> | undefined

        userIdRef.current = user?.id ?? null

        async function initializeBilling() {
            if (authLoading) {
                return
            }

            if (!user?.id) {
                // Sign-out: detach the store identity only if we ever attached one
                if (isSdkConfigured() && getSdkUserId() != null) {
                    await Purchases.logOut().catch((e) => {
                        console.warn('[BillingContext] Purchases.logOut failed (expected if already logged out)', e)
                    })
                    setSdkUserId(null)
                }
                if (cancelled) return
                markIdentityStatus('none')
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

            // A RevenueCat outage must never brick the app: un-gate the shell after 15s.
            // Identity status is deliberately untouched, so purchases stay blocked until proven.
            timeoutId = setTimeout(() => {
                if (cancelled) return
                console.warn('[BillingContext] RevenueCat init timed out; continuing without subscription data')
                setLoaded(true)
                setBillingLoading(false)
            }, BILLING_INIT_TIMEOUT_MS)

            try {
                if (!isSdkConfigured()) {
                    const apiKey = Platform.select({
                        ios: ENV.REVENUECAT_API_KEY_IOS,
                        android: ENV.REVENUECAT_API_KEY_ANDROID,
                    })
                    // No key (some dev builds): billing is unavailable, the app still opens,
                    // and the CTAs stay disabled through identityReady
                    if (!apiKey || apiKey === 'NULL') {
                        markIdentityStatus('none')
                        return
                    }
                    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.ERROR)
                    // Synchronous native dispatch; later SDK calls queue behind it, so the
                    // identity is settled before anything else can reach the store
                    Purchases.configure({ apiKey, appUserID: user.id })
                    markSdkConfigured(user.id)
                    // Apple Search Ads keyword attribution (iOS-only in the SDK); not awaited and
                    // self-catching so an attribution failure is never reported as a billing error
                    void Purchases.enableAdServicesAttributionTokenCollection().catch((e) => {
                        console.warn('[BillingContext] AdServices attribution unavailable', e)
                    })
                    markIdentityStatus('verified')
                } else if (getSdkUserId() === user.id) {
                    // Provider remount for the same user (guard gate, Fast Refresh): the
                    // native SDK already holds this identity
                    markIdentityStatus('verified')
                } else {
                    // Account switch: blank the previous user's packages/entitlement before
                    // the network call so nothing stale renders while logIn is pending
                    setOfferings(null)
                    setCustomerInfo(null)
                    markIdentityStatus('pending')
                    try {
                        await Purchases.logIn(user.id)
                        // Recorded even if this effect was cancelled mid-flight — the
                        // cancelled flag protects React state but cannot un-call the SDK
                        setSdkUserId(user.id)
                    } catch (err) {
                        // Scoped to the logIn await so a later offerings failure is not
                        // mislabeled as an identity failure
                        if (!cancelled) markIdentityStatus('failed')
                        console.warn('[BillingContext] Purchases.logIn failed', err)
                        throw err
                    }
                    if (cancelled) return
                    markIdentityStatus('verified')
                }

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
                listener = (info) => {
                    if (!cancelled) setCustomerInfo(info)
                }
                Purchases.addCustomerInfoUpdateListener(listener)
            }
        })()

        return () => {
            cancelled = true
            if (timeoutId) clearTimeout(timeoutId)
            if (listener) Purchases.removeCustomerInfoUpdateListener(listener)
        }
    }, [authLoading, user?.id, markIdentityStatus])

    // Wrapper functions: the identity guard runs at the moment money moves, so no timing
    // window (timeout, failed logIn, stale switch) can put a receipt on the wrong customer
    const handlePurchasePackage = useCallback(async (pkg: PurchasesPackage) => {
        await ensureBillingIdentity(userIdRef.current, identityStatusRef.current)
        return purchasePackage(pkg, setCustomerInfo, setError)
    }, [])

    const handleRestorePurchases = useCallback(async () => {
        setRestoring(true)
        try {
            // Inside the try so a guard rejection still clears `restoring` below
            await ensureBillingIdentity(userIdRef.current, identityStatusRef.current)
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
            identityReady,
            purchasePackage: handlePurchasePackage,
            restorePurchases: handleRestorePurchases,
            hasPremium,
            monthlyPackage,
            annualPackage,
            priceInfo,
            annualPriceInfo,
            annualSavingsPercent,
        }),
        [offerings, customerInfo, loading, loaded, restoring, error, identityReady, handlePurchasePackage, handleRestorePurchases, hasPremium, monthlyPackage, annualPackage, priceInfo, annualPriceInfo, annualSavingsPercent],
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
