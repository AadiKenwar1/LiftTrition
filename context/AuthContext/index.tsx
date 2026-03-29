import { Connector } from '@/lib/powersync/Connector';
import { powerSync } from '@/lib/powersync/system';
import { supabase } from '@/lib/supabase/client';
import { Session, User } from "@supabase/supabase-js";
import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { deleteAccount, signOut } from './functions/accountFunctions';
import { signInWithApple } from './functions/authFunctions';
import { AuthContextInterface } from "./types";

const AuthContext = createContext<AuthContextInterface | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // Derive userID from user object
    const userID = user?.id ?? '';

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
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
        })
        return () => subscription.unsubscribe()
    }, [])

    // Connect PowerSync when user is authenticated
    useEffect(() => {
        if (loading) return;
        
        if (session && user) {
            const connector = new Connector();    
            // Connect PowerSync
            const connectPowerSync = async () => {
                try {
                    await powerSync.connect(connector);
                } catch (error) {
                    // Retry connection after a delay
                    setTimeout(() => {
                        if (session && user) {
                            connectPowerSync();
                        }
                    }, 5000);
                }
            };
            
            connectPowerSync();
            
            // Monitor and ensure PowerSync stays connected
            // PowerSync should handle reconnection automatically, but we'll verify periodically
            const connectionMonitor = setInterval(() => {
                if (session && user) {
                    // PowerSync should auto-reconnect, but we can verify by checking if we can query
                    // This is just a health check - PowerSync handles reconnection internally
                    powerSync.getAll('SELECT 1 LIMIT 1').catch((e) => {
                        console.warn('[AuthContext] PowerSync health check query failed', e);
                    });
                }
            }, 30000); // Check every 30 seconds
            
            return () => {
                clearInterval(connectionMonitor);
            };
        }
    }, [session, user, loading]);

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
            }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(){
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}