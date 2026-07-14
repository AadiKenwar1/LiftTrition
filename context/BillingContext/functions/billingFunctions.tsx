import { Dispatch, SetStateAction } from 'react';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

export const ENTITLEMENT_ID = 'LiftTrition Pro'

// Restore resolves successfully even with nothing to restore — entitlement
// presence on the returned info is the only truthful "restored" signal.
export function hasActiveEntitlement(info: CustomerInfo | null): boolean {
    return Boolean(info?.entitlements?.active?.[ENTITLEMENT_ID])
}

// Get monthly package from offerings
export function getMonthlyPackage(offerings: any): PurchasesPackage | null {
    if (!offerings?.current?.availablePackages) return null;
    return offerings.current.availablePackages.find(
        (pkg: PurchasesPackage) =>
            pkg.identifier === 'monthly' ||
            pkg.identifier === '$rc_monthly' ||
            pkg.packageType === 'MONTHLY',
    ) || null;
}

// Get annual package from offerings
export function getAnnualPackage(offerings: any): PurchasesPackage | null {
    if (!offerings?.current?.availablePackages) return null;
    return offerings.current.availablePackages.find(
        (pkg: PurchasesPackage) =>
            pkg.identifier === 'annual' ||
            pkg.identifier === '$rc_annual' ||
            pkg.packageType === 'ANNUAL',
    ) || null;
}

// Percent saved by paying annually vs 12 monthly payments - returns null if either price is unavailable
export function getAnnualSavingsPercent(monthly: PurchasesPackage | null, annual: PurchasesPackage | null): number | null {
    const m = monthly?.product?.price;
    const a = annual?.product?.price;
    if (!m || !a || m <= 0 || a <= 0) return null;
    const pct = Math.round((1 - a / (m * 12)) * 100);
    return pct > 0 && pct < 100 ? pct : null;
}

// Get price info from package - returns null if no package
export function getPackagePriceInfo(pkg: PurchasesPackage | null): { price: string; period: string } | null {
    if (!pkg) return null;
    return {
        price: pkg.product.priceString || '$4.99',
        period: pkg.product.subscriptionPeriod || 'month',
    }
}

// Purchase package
export async function purchasePackage(pkg: PurchasesPackage, setCustomerInfo: Dispatch<SetStateAction<CustomerInfo | null>>, setError: Dispatch<SetStateAction<Error | null>>): Promise<CustomerInfo> {
    try {
        setError(null);
        const result = await Purchases.purchasePackage(pkg);
        setCustomerInfo(result.customerInfo);
        return result.customerInfo;
    } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
    }
}

// Restore purchases
export async function restorePurchases(setCustomerInfo: Dispatch<SetStateAction<CustomerInfo | null>>, setError: Dispatch<SetStateAction<Error | null>>): Promise<CustomerInfo> {
    try {
        setError(null);
        const info = await Purchases.restorePurchases();
        setCustomerInfo(info);
        return info;
    } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
    }
}
