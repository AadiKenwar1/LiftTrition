import { Dispatch, SetStateAction } from 'react';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

// Get monthly package from offerings
export function getMonthlyPackage(offerings: any): PurchasesPackage | null {
    if (!offerings?.current?.availablePackages) return null;
    return offerings.current.availablePackages.find(
        (pkg: PurchasesPackage) => 
            pkg.identifier === 'monthly' || 
            pkg.packageType === 'MONTHLY'
    ) || null;
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
