# Issue 13 — Food-search results stayed in memory after signing out

**What you'd have noticed**
Nothing visible — this is a behind-the-scenes cleanup, not something that showed up on screen. When you search for a food while logging a meal, the app briefly remembers what you searched for and its results, so searching the same thing again a moment later is instant instead of asking the server twice. Signing out didn't clear that memory. If one person signed out and a different person signed into the same device, the first person's recent food searches could still be sitting in the app's memory. To be clear, nothing was leaked or shown to the next person — it was just unused memory building up that should have been cleared out.

**Why it happened**
The food-search feature keeps two small, short-lived caches in memory — one for search results, one for the nutrition details of a food you've opened — so the app doesn't have to re-ask the server the same question within a short window. This lives in `lib/foodDB/foodDB.ts`. Signing out already clears your saved data and the local database, but nothing told it to also clear these two caches, so they simply stayed in memory as if the same person were still using the app.

**What we changed**
Signing out now also empties both food-search caches — every time, whether it's a normal sign-out, a forced sign-out, or deleting your account. The next time anyone searches for a food after that, the app asks the server fresh instead of possibly reusing a leftover cached answer. This has no real downside: at most, the very first search after signing back in takes a normal trip to the server instead of being instant, exactly like any first search already does.

**How we know it works**
A new automated test searches for the same food twice: the first search goes to the server, and the second (identical) search reuses the cached answer instead of asking again — confirming the cache works as intended. The test then calls the new cache-clearing function and searches for that same food a third time, and confirms the app goes back to the server instead of reusing the old answer, proving the cache was genuinely emptied. This clearing function is now wired into every sign-out path, so it runs automatically whenever someone signs out, is force-signed-out, or deletes their account.

**Files touched**
- `lib/foodDB/foodDB.ts` — added a function that empties both food-search caches
- `context/AuthContext/functions/accountFunctions.tsx` — calls that function at the end of every sign-out path (normal sign-out, forced sign-out, and account deletion)
- `lib/foodDB/__tests__/foodDB.test.ts` — new automated test confirming the caches are genuinely emptied
