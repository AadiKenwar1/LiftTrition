import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
    if (req.method !== 'POST') {
        return new Response(null, { status: 405 })
    }

    const auth = req.headers.get('Authorization')
    if (!auth) return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const token = auth.replace('Bearer ', '')
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    const userId = user.id

    try {
        // All user-owned rows cascade from auth.users (migrations/user_cascade.sql),
        // so this one call deletes everything atomically.
        const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
        if (deleteError) {
            return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (err) {
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Account deletion failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
})
