// react-test-renderer ships no bundled types (@types/react-test-renderer not
// installed); suppress the missing-declaration error (test-only runtime dep).
// @ts-ignore
import { act, create } from 'react-test-renderer'
import Purchases from 'react-native-purchases'
import { BillingProvider, useBilling } from '../index'
import { BillingContextInterface } from '../types'

jest.mock('@/context/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'user-1' }, loading: false }),
}))

jest.mock('react-native-purchases', () => ({
    __esModule: true,
    default: {
        setLogLevel: jest.fn(),
        configure: jest.fn(),
        logIn: jest.fn().mockResolvedValue(undefined),
        logOut: jest.fn().mockResolvedValue(undefined),
        getOfferings: jest.fn().mockResolvedValue(null),
        getCustomerInfo: jest.fn().mockResolvedValue(null),
        restorePurchases: jest.fn(),
        addCustomerInfoUpdateListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    },
    LOG_LEVEL: { VERBOSE: 'VERBOSE', ERROR: 'ERROR' },
}))

let latest: BillingContextInterface

function Probe() {
    latest = useBilling()
    return null
}

async function mountProbe() {
    await act(async () => {
        create(
            <BillingProvider>
                <Probe />
            </BillingProvider>,
        )
    })
}

describe('BillingProvider restore', () => {
    const mockRestore = Purchases.restorePurchases as jest.Mock

    beforeEach(() => {
        mockRestore.mockReset()
    })

    it('exposes restoring=false initially', async () => {
        await mountProbe()
        expect(latest.restoring).toBe(false)
    })

    it('sets restoring while a restore is in flight and clears it after', async () => {
        let resolveRestore!: (info: unknown) => void
        mockRestore.mockReturnValue(
            new Promise((resolve) => {
                resolveRestore = resolve
            }),
        )
        await mountProbe()

        let pending!: Promise<unknown>
        await act(async () => {
            pending = latest.restorePurchases()
        })
        expect(latest.restoring).toBe(true)

        await act(async () => {
            resolveRestore({ entitlements: { active: {} } })
            await pending
        })
        expect(latest.restoring).toBe(false)
    })

    it('resolves with the CustomerInfo RevenueCat returned', async () => {
        const fresh = { entitlements: { active: { 'LiftTrition Pro': { isActive: true } } } }
        mockRestore.mockResolvedValue(fresh)
        await mountProbe()

        let result: unknown
        await act(async () => {
            result = await latest.restorePurchases()
        })
        expect(result).toBe(fresh)
    })

    it('clears restoring when the restore throws', async () => {
        mockRestore.mockRejectedValue(new Error('offline'))
        await mountProbe()

        await act(async () => {
            await expect(latest.restorePurchases()).rejects.toThrow('offline')
        })
        expect(latest.restoring).toBe(false)
    })
})
