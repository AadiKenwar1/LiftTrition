# PowerSync sync & guards

## What this proves

- A signed-in device connects and waits for its first data sync before the app opens; if that sync hangs, the user gets a retry and a sign-out escape instead of an endless spinner.
- That escape is destructive and never fires on its own: the device is signed out and cleared only after an explicit confirmation, and backing out leaves it untouched.
- The routine session token refresh is invisible to a signed-in user: it does not throw the app back to the loading screen and does not re-run the connect/first-sync gate.
- Pending local changes are flushed before sign-out, and a flush that cannot complete blocks the sign-out rather than losing data.
- Sync/connection failures are surfaced as retryable states rather than being swallowed.

## Not proven

- This area has not had its full review pass: the sync engine internals (upload queue ordering, poison-row handling, watchdog kick behaviour under real network churn) are exercised by unit tests but their guarantees have not been restated and audited here.
- Real bidirectional sync against Supabase/PowerSync Cloud — everything above runs against mocks; no test crosses the network.
- Behaviour when the sync rules on the PowerSync dashboard drift from the repo's reference copy.

Area: lib/powersync + components/GuardComponents · 84 cases · reviewed 2026-07-30
