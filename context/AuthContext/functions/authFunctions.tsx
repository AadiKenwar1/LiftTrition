import { supabase } from '@/lib/supabase/client'
import * as AppleAuthentication from 'expo-apple-authentication'
import { Alert } from 'react-native'

export async function signInWithApple(): Promise<void> {
  try {
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
    
    Alert.alert('Sign In Error', e.message || 'Failed to sign in with Apple')
  }
}