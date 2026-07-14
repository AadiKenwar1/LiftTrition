import Purchases, { CustomerInfo } from 'react-native-purchases'
import { ENTITLEMENT_ID, hasActiveEntitlement, restorePurchases } from '../billingFunctions'

jest.mock('react-native-purchases', () => ({
    __esModule: true,
    default: {
        restorePurchases: jest.fn(),
        purchasePackage: jest.fn(),
    },
}))

function infoWith(active: Record<string, unknown>): CustomerInfo {
    return { entitlements: { active } } as unknown as CustomerInfo
}

describe('hasActiveEntitlement', () => {
    it('is true when the Pro entitlement is active', () => {
        expect(hasActiveEntitlement(infoWith({ [ENTITLEMENT_ID]: { isActive: true } }))).toBe(true)
    })

    it('is false when no entitlements are active', () => {
        expect(hasActiveEntitlement(infoWith({}))).toBe(false)
    })

    it('is false when only a different entitlement is active', () => {
        expect(hasActiveEntitlement(infoWith({ SomethingElse: { isActive: true } }))).toBe(false)
    })

    it('is false for null customer info', () => {
        expect(hasActiveEntitlement(null)).toBe(false)
    })
})

describe('restorePurchases', () => {
    const mockRestore = Purchases.restorePurchases as jest.Mock

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('returns the fresh CustomerInfo and pushes it into state', async () => {
        const fresh = infoWith({ [ENTITLEMENT_ID]: { isActive: true } })
        mockRestore.mockResolvedValue(fresh)
        const setCustomerInfo = jest.fn()
        const setError = jest.fn()

        const result = await restorePurchases(setCustomerInfo, setError)

        expect(result).toBe(fresh)
        expect(setCustomerInfo).toHaveBeenCalledWith(fresh)
        expect(setError).toHaveBeenCalledWith(null)
    })

    it('records and rethrows failures without touching customerInfo', async () => {
        const boom = new Error('network down')
        mockRestore.mockRejectedValue(boom)
        const setCustomerInfo = jest.fn()
        const setError = jest.fn()

        await expect(restorePurchases(setCustomerInfo, setError)).rejects.toThrow('network down')
        expect(setError).toHaveBeenCalledWith(boom)
        expect(setCustomerInfo).not.toHaveBeenCalled()
    })
})
