import { Session, User } from '@supabase/supabase-js'

export interface AuthContextInterface {
    user: User | null
    session: Session | null
    loading: boolean
    userID: string
    signInWithApple: () => Promise<void>
    signOut: () => Promise<void>
    deleteAccount: () => Promise<void>
}