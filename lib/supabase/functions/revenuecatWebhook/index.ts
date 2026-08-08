// Entry point only — the webhook logic lives in handler.ts so its Deno tests can import
// it without starting a server. Deploy note: this function must run with "Verify JWT"
// OFF (RevenueCat sends the dashboard-configured Authorization header, not a Supabase
// JWT; handler.ts checks it against the REVENUECAT_WEBHOOK_AUTH secret).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleWebhook } from './handler.ts'

serve(handleWebhook)
