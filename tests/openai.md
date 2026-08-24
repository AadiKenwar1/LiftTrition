# AI food scanning

## What this part of the app does

Point the camera at a plate of food, a packaged product, or a nutrition label — or just
type what you ate — and the app answers with calories, protein, carbs and fat. To do
that it shrinks and crops the picture, then hands the request to the app's own server,
which asks an AI for the estimate; the phone never talks to the AI itself. This file
covers everything between the shutter being pressed and the answer coming back:
preparing the picture, sending the request, every way that request can go wrong, and
what happens when the user cancels partway.

## How we tested it

Two experiments, and neither one uses a real photo or a real AI. For the sending half we
fake the network, which lets us hand the app any reply we want — a good answer, each kind
of polite refusal, a dead connection, a reply that starts arriving and then dies halfway —
and then check what the user is told and whether the trouble gets reported for diagnosis.
For the picture half we fake the tool that edits images and read the instructions the app
issues instead: how far to shrink, how hard to compress, and exactly which rectangle to
cut out. Those expected rectangles were worked out by hand from the photo and screen
sizes, so they are a genuine second opinion rather than a copy of whatever the code did.

**Hardest to prove:** that a scan cancelled mid-flight really tears the request down
instead of letting the answer land and quietly throwing it away; that a reply which
starts fine and then dies while still downloading is reported exactly once, not twice and
not never; that the slice of photo sent to the AI is the same slice the user framed on
screen, on a phone whose photo is a different shape than the preview showing it.

## What the tests prove

- Every nutrition estimate, whether it comes from a photo or from typed text, is requested
  through the app's own server instead of straight from the phone.
- A signed-out user never sends a request at all.
- Hitting the daily scan limit tells the user to try again tomorrow or add the meal by hand.
- A subscription that could not be confirmed tells the user to try again in a moment.
- The AI declining to read a photo asks the user for a clearer picture or a manual entry.
- None of those three everyday refusals is treated or reported as a crash.
- A genuine failure — the connection dropping, the server erroring, or the reply dying
  part-way through arriving — always shows the user an error.
- Each of those genuine failures is reported for diagnosis exactly once: never twice, and
  never zero times.
- The daily-limit and subscription refusals never open the server's reply at all, so
  nothing from it can leak into what the user sees.
- Cancelling a scan stops the request that is still in flight.
- A cancellation is never reported as a crash, while a real network failure happening at
  that same moment still is.
- Every photo is shrunk and compressed before it is sent.
- Food photos are shrunk further than label photos, which stay larger so printed text
  remains readable.
- Every scan is cut down to the box the user framed on screen.
- The label box is narrower than the food box at the same height.
- A photo is never blown up beyond its real size just to reach a width target.
- If the camera preview cannot be measured at the moment the shutter fires, the app falls
  back to a centred box rather than producing a broken or empty picture.

## Not proven

- Nothing here reaches a real AI or a real server. The wording the app sends, the quality
  of the estimates, and whether the AI even answers in the shape the app expects are all
  unproven — a change to that wording cannot make these tests fail.
- Cropping is checked against rectangles worked out by hand, not against a real camera.
  Whether the box on screen and the saved photo truly line up on a physical phone is
  confirmed by a person, not by a test.
- The size of the finished upload is not pinned down. The shrink width and compression
  settings are proven; how many bytes they actually produce is not, because no real
  picture is ever created.
- The typed-food path is only checked for a good answer and for the daily limit. Its other
  failures run through the same shared code as the photo path and are proven there rather
  than a second time on their own.
- Nothing proves the real camera flow and the developer-only preview screen show the user
  the same picture. That screen skips the cropping step on purpose, so it exercises
  shrinking but never framing.

Area: lib/openAI · 25 cases · reviewed 2026-08-19
