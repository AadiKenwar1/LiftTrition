import { CustomerInfo, PurchasesPackage } from 'react-native-purchases'

export interface BillingContextInterface {
    offerings: any
    customerInfo: CustomerInfo | null
    loading: boolean
    loaded: boolean
    error: Error | null
    purchasePackage: (pkg: PurchasesPackage) => Promise<CustomerInfo>
    restorePurchases: () => Promise<CustomerInfo>
    hasPremium: boolean
    monthlyPackage: PurchasesPackage | null
    annualPackage: PurchasesPackage | null
    priceInfo: { price: string; period: string } | null
    annualPriceInfo: { price: string; period: string } | null
}
