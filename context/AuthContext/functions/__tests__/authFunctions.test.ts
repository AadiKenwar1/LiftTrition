import * as AppleAuthentication from 'expo-apple-authentication'
import * as Network from 'expo-network'
import { Alert } from 'react-native'
import { AuthRetryableFetchError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { signInWithApple } from '../authFunctions'

jest.mock('expo-network', () => ({
    getNetworkStateAsync: jest.fn(),
}))

jest.mock('expo-apple-authentication', () => ({
    signInAsync: jest.fn(),
    AppleAuthenticationScope: { FULL_NAME: 'FULL_NAME', EMAIL: 'EMAIL' },
}))

jest.mock('@/lib/supabase/client', () => ({
    supabase: { auth: { signInWithIdToken: jest.fn() } },
}))

const mockNetwork = Network.getNetworkStateAsync as jest.Mock
const mockAppleSignIn = AppleAuthentication.signInAsync as jest.Mock
const mockIdTokenSignIn = supabase.auth.signInWithIdToken as jest.Mock

let alertSpy: jest.SpyInstance

beforeEach(() => {
    jest.clearAllMocks()
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    mockNetwork.mockResolvedValue({ isConnected: true })
    mockAppleSignIn.mockResolvedValue({ identityToken: 'apple-token' })
    mockIdTokenSignIn.mockResolvedValue({ error: null })
})

afterEach(() => {
    alertSpy.mockRestore()
})

describe('signInWithApple offline preflight', () => {
    it('blocks with a friendly alert and never opens the Apple sheet when offline', async () => {
        mockNetwork.mockResolvedValue({ isConnected: false })

        await signInWithApple()

        expect(alertSpy).toHaveBeenCalledWith("You're offline", 'Sign in with Apple needs an internet connection.')
        expect(mockAppleSignIn).not.toHaveBeenCalled()
        expect(mockIdTokenSignIn).not.toHaveBeenCalled()
    })

    it('proceeds to the Apple sheet when connected', async () => {
        mockNetwork.mockResolvedValue({ isConnected: true })

        await signInWithApple()

        expect(mockAppleSignIn).toHaveBeenCalledTimes(1)
        expect(mockIdTokenSignIn).toHaveBeenCalledTimes(1)
        expect(alertSpy).not.toHaveBeenCalled()
    })

    it('proceeds when connectivity is unknown (isConnected undefined)', async () => {
        mockNetwork.mockResolvedValue({ isConnected: undefined })

        await signInWithApple()

        expect(mockAppleSignIn).toHaveBeenCalledTimes(1)
    })

    it('proceeds (fail-open) when the network check itself throws', async () => {
        mockNetwork.mockRejectedValue(new Error('network module unavailable'))

        await signInWithApple()

        expect(mockAppleSignIn).toHaveBeenCalledTimes(1)
    })
})

describe('signInWithApple error messaging', () => {
    it('shows the friendly offline copy when the token exchange fails on the network (captive portal)', async () => {
        mockIdTokenSignIn.mockResolvedValue({ error: new AuthRetryableFetchError('Network request failed', 0) })

        await signInWithApple()

        expect(alertSpy).toHaveBeenCalledWith("You're offline", 'Sign in with Apple needs an internet connection.')
    })

    it('shows the generic error for a non-network failure', async () => {
        mockIdTokenSignIn.mockResolvedValue({ error: new Error('Apple rejected the token') })

        await signInWithApple()

        expect(alertSpy).toHaveBeenCalledWith('Sign In Error', 'Apple rejected the token')
    })

    it('silently returns when the user cancels the Apple sheet', async () => {
        mockAppleSignIn.mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' })

        await signInWithApple()

        expect(alertSpy).not.toHaveBeenCalled()
        expect(mockIdTokenSignIn).not.toHaveBeenCalled()
    })
})
