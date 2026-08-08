import { CustomerInfo, PurchasesPackage } from 'react-native-purchases'

export interface BillingContextInterface {
    offerings: any
    customerInfo: CustomerInfo | null
    loading: boolean
    loaded: boolean
    restoring: boolean
    error: Error | null
    // True only while the RevenueCat SDK is proven to be acting as the signed-in user;
    // purchase/restore CTAs disable on false.
    identityReady: boolean
    purchasePackage: (pkg: PurchasesPackage) => Promise<CustomerInfo>
    restorePurchases: () => Promise<CustomerInfo>
    hasPremium: boolean
    monthlyPackage: PurchasesPackage | null
    annualPackage: PurchasesPackage | null
    priceInfo: { price: string; period: string } | null
    annualPriceInfo: { price: string; period: string } | null
    annualSavingsPercent: number | null
}
