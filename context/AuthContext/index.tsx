import { disconnectPowerSync, ensurePowerSyncConnected } from '@/lib/powersync/orchestrator'
import {
    registerPowerSyncBackgroundTask,
    unregisterPowerSyncBackgroundTask,
} from '@/lib/powersync/registerBackgroundPowerSync'
import { supabase } from '@/lib/supabase/client'
import { Session, User } from '@supabase/supabase-js'
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react'
import { deleteAccount, signOut } from './functions/accountFunctions'
import { signInWithApple } from './functions/authFunctions'
import { AuthContextInterface } from './types'

const AuthContext = createContext<AuthContextInterface | undefined>(undefined)

export const AuthProvider = ({ children }: PropsWithChildren) => {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    // Derive userID from user object
    const userID = user?.id ?? ''

    // Check for existing session on app launch
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)
        })
    }, [])

    // Listen for auth state changes (sign in, sign out, token refresh)
    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
        })
        return () => subscription.unsubscribe()
    }, [])

    // Connect PowerSync when authenticated; disconnect on sign-out or cleanup.
    // Use stable user id so token refresh does not disconnect/reconnect unnecessarily.
    useEffect(() => {
        if (loading) return

        const userId = session?.user?.id
        if (!userId) {
            void disconnectPowerSync('auth_no_session')
            return
        }

        void ensurePowerSyncConnected('auth_session').catch((e) => {
            console.warn('[AuthContext] PowerSync ensureConnected failed', e)
        })

        return () => {
            void disconnectPowerSync('auth_effect_cleanup')
        }
    }, [loading, session?.user?.id])

    useEffect(() => {
        if (loading) return
        void (async () => {
            try {
                if (!session?.user?.id) {
                    await unregisterPowerSyncBackgroundTask()
                    return
                }
                await registerPowerSyncBackgroundTask()
            } catch (e) {
                console.warn('[AuthContext] Background PowerSync task register/unregister failed', e)
            }
        })()
    }, [loading, session?.user?.id])

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                userID,
                signInWithApple,
                signOut,
                deleteAccount,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
