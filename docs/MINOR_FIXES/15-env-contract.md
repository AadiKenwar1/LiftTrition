# Issue 15 — Missing setup keys could crash the app with a confusing error

**What you'd have noticed**
The app depends on six configuration secrets to work: the address of our database, its access key, the address of the background sync service, two billing keys, and an error-tracking key. If one of the three essential ones were ever missing from a build — say, during setup on a new machine, or a misconfigured release — the app wouldn't say so up front. It would launch normally, look completely fine, and then fail the first time it tried to talk to the server: signing in, saving a workout, loading nutrition data. The error you'd see at that point would be generic and unhelpful, giving no hint about which setting was missing or where to go fix it.

**Why it happened**
Each of these six secrets was read directly from the device's configuration in a different place in the code — six separate spots, each fetching its own value with no single list anywhere describing what the app actually needs to run. Nothing checked that the essential ones were present before the app started using them, so a missing value stayed invisible until something happened to need it over the network, often several taps into using the app. Two of the six were even read with a shortcut that essentially told the code "trust me, this will be here" — which hides the problem instead of catching it.

**What we changed**
We created one single place in the code that lists all six configuration secrets by name, and every part of the app that needs one of them now reads it from that same shared list instead of fetching it separately. We also added a check that runs the instant the app starts: it looks at the three secrets the app truly cannot function without — the database address, its access key, and the sync service address — and if any of them is missing, the app stops immediately with a plain message naming exactly which one is absent, instead of continuing to launch and failing mysteriously later. The other three secrets (the two billing keys and the error-tracking key) are allowed to be missing, since the app already handles their absence gracefully — billing setup is simply skipped, and error tracking just doesn't turn on. Finally, we added a template file that lists all six names (with no real values filled in) so anyone setting up the project for the first time knows exactly what to provide, without having to go hunting through the code to find out.

**How we know it works**
All existing automated tests for the affected areas — account deletion, sign-out, and the background sync connector — still pass. We also confirmed the behavior by hand: temporarily removing one of the three required secrets and starting the app causes it to stop right away with a message naming that exact missing secret, instead of launching and failing later with a confusing, unrelated-looking error.

**Files touched**
- `lib/env.ts` — new: the single shared list of all six configuration secrets, plus the startup check for the three required ones
- `.env.example` — new: a template listing all six secret names for anyone setting up the project
- `app/_layout.tsx` — runs the startup check before anything else happens, and reads the error-tracking key from the shared list
- `lib/supabase/client.ts`, `lib/powersync/Connector.ts`, `lib/openAI/openAI.ts`, `lib/foodDB/foodDB.ts`, `context/AuthContext/functions/accountFunctions.tsx`, `context/BillingContext/index.tsx` — now read their secrets from the shared list instead of each fetching the device configuration on its own
- `lib/powersync/__tests__/connector.test.ts`, `context/AuthContext/functions/__tests__/accountFunctions.test.ts` — test setup updated so the right values are still in place now that the secrets are read once, up front, instead of at the moment each test runs
