# Subscriptions and premium access

## What this part of the app does

Some parts of the app are paid. This part works out whether the person using it has paid,
shows them the monthly and yearly prices, walks them through buying a subscription, and
lets someone who already bought one get it back on a new phone. Its quietest and most
important job is making sure a payment is always tied to the account that made it — a
purchase filed under the wrong account means the person pays real money and unlocks
nothing. This file covers everything from the moment billing wakes up at launch through
signing in and out, switching accounts, buying, restoring, and the settings screen where
all of that is presented.

## How we tested it

No money moves anywhere in these tests. We replace the store with a stand-in that answers
however we tell it to — it can say the right account is paying, the wrong one, or nothing
at all; it can accept a purchase, refuse one, or simply hang. Then we drive the app through
the situations that really happen to people: opening the app already signed in, signing
out, signing back in as somebody else, switching accounts twice in a row, and losing the
network partway through. The trick that makes most of this possible is being able to freeze
the store's answer in mid-air, so we can look at the app during the in-between moment
instead of only before and after. The settings screen is drawn for real and its buttons are
pressed for real; only the billing answers behind it are faked. A few checks are
deliberately backwards — they confirm a purchase does succeed when it should, so a change
that simply blocked everything would fail instead of looking safe.

**Hardest to prove:** that a purchase attempted during the split second of an account
switch is genuinely refused rather than merely slow; that an answer arriving late for an
account the user has already left cannot hand the new account the old one's premium access;
that when the app rebuilds its billing part mid-session it keeps the same person able to
buy, instead of quietly locking them out or setting the store up a second time.

## What the tests prove

- The store is told which account is paying at the very moment billing starts, so there is
  never a window where a payment could land on a nameless customer record.
- Billing is set up only once per run of the app; every later sign-out, sign-in or account
  swap is handled as a switch rather than a second setup.
- The app waits until it knows who is signed in before telling the store anything.
- If nobody has ever signed in, the app says nothing to the store at all, and the rest of
  the app still finishes loading normally.
- Signing out disconnects the account from the store.
- Signing out immediately clears the previous person's premium status from the screen.
- Beginning an account switch immediately clears the previous person's prices and premium
  status, before the switch has even gone through.
- While a switch is still in progress the app reports itself as still loading instead of
  pretending it is ready.
- While a switch is still in progress the app asks the store for nothing, because any
  answer would describe the person who just left.
- A switch that lands late, after the user has already moved on to a third account, is
  thrown away: it fetches nothing and grants no premium access.
- Buying is refused outright whenever the app cannot prove the store is acting for the
  signed-in person, and the store is never even asked.
- Restoring is refused in exactly the same situations, and the screen's busy indicator is
  cleared afterwards rather than sticking on forever.
- Once the account is proven, a purchase does go through and premium access turns on, so
  the block is a real check and not a blanket refusal.
- Someone who is signed out is refused before the app even asks the store who it thinks it
  is serving.
- When the store already names the right person, the check is a single local read with no
  network round trip.
- If the store turns out to be acting for the wrong person, the app repairs it by signing in
  again exactly once — never in a loop — and then lets the purchase through.
- If that single repair attempt fails, the purchase is refused instead of sent.
- If the repair appears to work but the store still names the wrong person, the purchase is
  refused anyway.
- If the app cannot even read which person the store is serving, that counts as "don't know"
  and triggers the repair, rather than crashing.
- All four reasons for refusing show the user the same single plain sentence.
- A failed account switch leaves the person without premium access even when the store's own
  answer claims they are paying.
- A failed account switch surfaces an error instead of carrying on quietly as the wrong
  person.
- If the billing service does not answer within fifteen seconds, the rest of the app opens
  anyway, with buying still blocked rather than the whole app being stuck.
- Premium is on only when this app's own paid plan is active: some other paid thing, no paid
  thing, and no status at all are each treated as free.
- A restore hands back whatever the store reported, saves it, and clears any earlier error.
- A restore that fails records the error and passes it on without overwriting the premium
  status already on screen.
- The busy indicator turns on when a restore starts and off when it ends, whether it
  succeeded or failed.
- Rebuilding the billing part of the app mid-session for the same signed-in person does not
  set the store up a second time and does not sign in again.
- Through that rebuild the person stays able to buy, and their premium status is re-read
  from the store rather than shown as free.
- A payment that finishes after the subscription screen has been closed still goes through
  and still tells the person it worked, so leaving the screen mid-payment costs them
  nothing.
- Until the account is proven, both buttons on that screen are disabled and a short note
  explains that buying is not available right now.
- Once the account is proven and prices have loaded, both buttons work and that note is
  gone.
- If prices never load, the buy button is disabled with the same note, but restore stays
  usable so an existing subscriber can still get their access back.
- A build with no billing keys reports billing as unavailable and keeps buying blocked, and
  the app still opens.

## Not proven

- No real purchase ever happens. The phone's payment sheet is never shown, no card is ever
  charged, and no real receipt is ever produced. These tests only cover the app's side of
  the conversation.
- What happens when a real payment fails is untested — someone tapping cancel on the payment
  sheet, a declined card, the store erroring mid-purchase. Only a purchase that succeeds,
  and purchases blocked before they ever start, are covered.
- Choosing which plan is the monthly one and which is the yearly one, reading the price text
  out of them, and working out the "save this much by paying yearly" percentage all have no
  tests at all. The screen tests are handed those values ready-made.
- The name the app uses for its paid plan is a fixed word it compares against. Nothing
  checks that the name still matches what is set up on the billing service, so renaming it
  there would break paid access without failing a single test.
- Status pushed from the store while the app is open — a subscription renewing, lapsing, or
  being refunded mid-session — is never delivered in any test. The app signs up to receive
  those updates, but nothing proves it reacts to one.
- The server's own record of who is paying is never touched here. The app's premium switch
  and the server's per-account check answer different questions about different records, and
  only a genuine test purchase crosses that gap. The server side has its own separate tests,
  outside this area.
- Leaving the subscription screen mid-payment and starting a second purchase before the
  first has settled is not exercised here. The store is trusted to refuse or serialize two
  overlapping purchases on the same account; nothing in this area proves that trust is
  warranted.
- Only one of the two phone platforms is exercised; picking the right key for the platform
  the app is running on is not checked.
- The developer-only switch that forces the app to behave as if unpaid has no test.
- Nothing measures how often purchases are actually refused for real people. No billing
  trouble is reported for diagnosis, so this behaviour can only be seen in tests, never in
  the wild.

Area: context/BillingContext · 50 cases · reviewed 2026-08-19
