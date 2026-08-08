# Billing & subscriptions

## What this proves

- The store knows who is paying from the first moment billing exists — there is never an anonymous purchase window on launch, so a payment cannot land on a customer record the account can't reach.
- Buying and restoring are refused, with a friendly message, whenever the app cannot prove the paying account is the signed-in account; the buttons also disable up front until that proof exists.
- Whenever buying is impossible for any reason — identity unproven, prices never loaded, store not configured — the screen says so in one consistent message instead of showing a silently dead button; restoring stays available when only prices are missing, so an existing subscriber can always recover.
- Switching accounts immediately clears the previous account's prices and subscription status, and the new account's identity is settled before anything can be bought.
- If billing can't start within 15 seconds (store outage, no network), the app still opens — with purchasing blocked rather than broken, and the rest of the app usable.
- A failed identification surfaces as an error and self-heals with one retry at purchase time instead of silently continuing as the wrong customer.
- The subscription screen cannot be navigated away from while a payment or restore is mid-flight, and releases as soon as it settles.
- A routine session token refresh does not restart billing mid-session.
- Billing surviving an internal restart: when the app re-creates its data layer for the same signed-in account, the store is not re-initialised and the account is not re-identified, purchasing stays available throughout, and subscription status is re-read rather than shown stale or shown as free.

## Not proven

- The client and the server agreeing on entitlement — the app's premium flag and the server's per-account check answer different questions about different records; only a real sandbox purchase crosses that boundary, and no automated test can.
- The native back-gesture cancellation itself — OS/library behaviour; only this app's wiring to it is pinned.
- The server's webhook-fed entitlement mirror — proven by Deno tests that run locally, outside the CI/Jest gate. Those tests pin: webhook delivery is best-effort (always accepted once authenticated; failures logged, never retried, because the store stops redelivering after five attempts), and a premium mirror row older than a day is re-verified against the store before being trusted — so a lost event (including a refund) can grant at most one extra day of paid access. Re-verification costs one store round trip, and when the store cannot be reached during it the check fails closed: a paying subscriber whose mirrored status has gone stale is refused until the store answers again, which both paid screens already surface as a "couldn't verify your subscription, try again" message rather than a paywall.
- Billing telemetry — none exists, by decision; how often purchases are refused in production is unmeasurable.

Area: context/BillingContext · 46 cases · reviewed 2026-07-30
