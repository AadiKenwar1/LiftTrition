import Purchases from 'react-native-purchases'
import { BILLING_IDENTITY_ERROR_MESSAGE, BillingIdentityError, ensureBillingIdentity } from '../identityGuard'

/**
 * Failure matrix over the SDK identity contract: the guard must prove the store is acting
 * as the signed-in user before any purchase/restore, self-heal with exactly one logIn
 * retry, and reject with a typed reason (and one shared user-facing message) otherwise.
 */

jest.mock('react-native-purchases', () => ({
    __esModule: true,
    default: {
        getAppUserID: jest.fn(),
        logIn: jest.fn(),
    },
}))

const mockGetAppUserID = Purchases.getAppUserID as jest.Mock
const mockLogIn = Purchases.logIn as jest.Mock

// Reads the typed reason off a guard rejection, failing the test on any other outcome
async function rejectionReason(promise: Promise<void>): Promise<string> {
    try {
        await promise
    } catch (err) {
        expect(err).toBeInstanceOf(BillingIdentityError)
        return (err as BillingIdentityError).reason
    }
    throw new Error('expected the guard to reject')
}

describe('ensureBillingIdentity', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockLogIn.mockResolvedValue(undefined)
    })

    it('resolves with one local read and no logIn when the SDK already reports the expected user', async () => {
        mockGetAppUserID.mockResolvedValue('user-1')

        await ensureBillingIdentity('user-1', 'verified')

        expect(mockGetAppUserID).toHaveBeenCalledTimes(1)
        expect(mockLogIn).not.toHaveBeenCalled()
    })

    it('throws no-user without touching the SDK when the expected id is null', async () => {
        expect(await rejectionReason(ensureBillingIdentity(null, 'none'))).toBe('no-user')
        expect(mockGetAppUserID).not.toHaveBeenCalled()
        expect(mockLogIn).not.toHaveBeenCalled()
    })

    it('throws identity-pending without a second logIn while the initial identification is in flight', async () => {
        mockGetAppUserID.mockResolvedValue('$RCAnonymousID:abc')

        expect(await rejectionReason(ensureBillingIdentity('user-1', 'pending'))).toBe('identity-pending')
        expect(mockLogIn).not.toHaveBeenCalled()
    })

    it('logs in exactly once with the expected id and resolves when the retry lands the match', async () => {
        mockGetAppUserID.mockResolvedValueOnce('$RCAnonymousID:abc').mockResolvedValueOnce('user-1')

        await ensureBillingIdentity('user-1', 'failed')

        expect(mockLogIn).toHaveBeenCalledTimes(1)
        expect(mockLogIn).toHaveBeenCalledWith('user-1')
    })

    it('wraps a rejected retry logIn in login-retry-failed', async () => {
        mockGetAppUserID.mockResolvedValue('$RCAnonymousID:abc')
        mockLogIn.mockRejectedValue(new Error('network'))

        expect(await rejectionReason(ensureBillingIdentity('user-1', 'failed'))).toBe('login-retry-failed')
    })

    it('throws mismatch-after-retry when the ids still differ after a successful retry logIn', async () => {
        mockGetAppUserID.mockResolvedValue('$RCAnonymousID:abc')

        expect(await rejectionReason(ensureBillingIdentity('user-1', 'failed'))).toBe('mismatch-after-retry')
        expect(mockLogIn).toHaveBeenCalledTimes(1)
    })

    it('treats a rejected getAppUserID as unknown identity and falls into the retry branch', async () => {
        // SDK not configured: the read rejects; the guard must not crash untyped
        mockGetAppUserID.mockRejectedValueOnce(new Error('not configured')).mockResolvedValueOnce('user-1')

        await ensureBillingIdentity('user-1', 'failed')

        expect(mockLogIn).toHaveBeenCalledTimes(1)
    })

    it.each<[string, () => Promise<void>]>([
        ['no-user', () => ensureBillingIdentity(null, 'none')],
        ['identity-pending', () => {
            mockGetAppUserID.mockResolvedValue('$RCAnonymousID:abc')
            return ensureBillingIdentity('user-1', 'pending')
        }],
        ['login-retry-failed', () => {
            mockGetAppUserID.mockResolvedValue('$RCAnonymousID:abc')
            mockLogIn.mockRejectedValue(new Error('network'))
            return ensureBillingIdentity('user-1', 'failed')
        }],
        ['mismatch-after-retry', () => {
            mockGetAppUserID.mockResolvedValue('$RCAnonymousID:abc')
            return ensureBillingIdentity('user-1', 'failed')
        }],
    ])('rejection %s carries the shared user-facing message', async (_reason, run) => {
        await expect(run()).rejects.toThrow(BILLING_IDENTITY_ERROR_MESSAGE)
    })
})
