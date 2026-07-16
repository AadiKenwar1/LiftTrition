import { supabase } from '@/lib/supabase/client'
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Network from 'expo-network'
import { Alert } from 'react-native'

export async function signInWithApple(): Promise<void> {
  try {
    let offline = false
    try {
      const state = await Network.getNetworkStateAsync()
      offline = state.isConnected === false
    } catch {
      // fail-open: a broken network check must never block a sign-in that could work
    }
    if (offline) {
      Alert.alert("You're offline", 'Sign in with Apple needs an internet connection.')
      return
    }

    // Show native Apple Sign In UI
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })

    // Send identity token to Supabase
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken!,
    })

    if (error) throw error
  } 
  catch (e: any) {
    if (e.code === 'ERR_REQUEST_CANCELED') {
      return
    }

    // The preflight can't see captive portals (wifi that reports "connected"
    // but has a login wall); the token exchange fails here instead.
    if (isAuthRetryableFetchError(e)) {
      Alert.alert("You're offline", 'Sign in with Apple needs an internet connection.')
      return
    }

    Alert.alert('Sign In Error', e.message || 'Failed to sign in with Apple')
  }
}