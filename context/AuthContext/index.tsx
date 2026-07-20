import { disconnectPowerSync, ensurePowerSyncConnected } from '@/lib/powersync/orchestrator'
import { supabase } from '@/lib/supabase/client'
import { Session, User } from '@supabase/supabase-js'
import * as Sentry from '@sentry/react-native'
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react'
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

        // Sole capture site for connect failures — orchestrator's ensurePowerSyncConnected stays
        // state-only so this is the only place a real (non-swallowed) connect failure is reported.
        void ensurePowerSyncConnected('auth_session').catch((e) => {
            Sentry.captureException(e, { tags: { area: 'powersync-connect', reason: 'auth_session' } })
        })

        return () => {
            void disconnectPowerSync('auth_effect_cleanup')
        }
    }, [loading, session?.user?.id])

    // Attribute every Sentry event to the signed-in user (or clear it on sign-out) from one place,
    // covering initial load, sign-in, token refresh, and sign-out alike.
    useEffect(() => {
        Sentry.setUser(user ? { id: user.id } : null)
    }, [user])

    // Memoized provider value: a stable reference so consumers re-render only when an
    // exposed field actually changes, not on every AuthProvider render. signInWithApple/
    // signOut/deleteAccount are stable module-level imports, so they are intentionally not deps.
    // Caveat (H6, out of scope): the onAuthStateChange listener above hands back a NEW `session`
    // object on every token refresh, and `session`/`user` must stay deps so consumers reading
    // them stay correct — so this memo still recomputes on a same-user refresh even though
    // `userID` is unchanged. It removes Auth's OWN redundant re-renders but does not fully
    // insulate downstream consumers from a genuine refresh; narrowing what Auth exposes to
    // break that ripple is a separate, larger change.
    const value = useMemo(
        () => ({
            user,
            session,
            loading,
            userID,
            signInWithApple,
            signOut,
            deleteAccount,
        }),
        [user, session, loading, userID],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
