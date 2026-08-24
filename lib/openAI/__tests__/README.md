# openAI tests

## Logic kind

Two kinds share this folder, and they set different bars.

- `openAI.test.ts` is **persistence & integration** — it drives the edge-function boundary.
  Bar: happy path once, then the failure matrix. Every status the function can return, plus
  network rejection, a body stream failing mid-read, abort, and no-session, each with its
  user-facing message and its Sentry outcome. 14 cases.
- `mealImage.test.ts` is **formulas** — cover-fit geometry mapping preview points to photo
  pixels, plus the per-mode width/quality table. Bar: exhaustive against the arithmetic, with
  reference values computed independently of the code. 11 cases.

## Harness

**`openAI.test.ts`** replaces `global.fetch` with a mock and asserts on the request it received
(URL, method, headers, body) and on what the caller sees. `@/lib/env` is mocked so the edge
function URL is fixed rather than read from a real environment; `@/lib/supabase/client` is
mocked to control whether a session exists; `@sentry/react-native` is mocked so capture calls
can be counted. A response is faked as a plain object with `ok`, `status` and `text` — making
`text` throw is how a body stream failing mid-read is simulated.

**`mealImage.test.ts`** mocks `expo-image-manipulator` and asserts on the action list passed to
`manipulateAsync` — a crop rectangle, a resize width, and the save options — so the tests read
the instructions the pipeline issued without any image existing. `react-native` is mocked down
to `Dimensions` alone, which is all the fallback path touches. Crop cases pass an explicit
`CaptureLayout` (what the preview and frame measured on screen) rather than relying on the
fallback, so the expected rectangle can be computed by hand.

## Fixtures

No shared builders apply here; both files construct their inputs inline, which is appropriate
because each case's input *is* the thing under test. The recurring photo fixture is
`{ uri: 'file://camera.jpg', width: 3000, height: 4000 }`, chosen so that against a 390×800
preview the scale works out to a whole number.

## Non-obvious cases

- Both mocks are invoked through a wrapper arrow function rather than assigned directly. The
  `jest.mock` factory runs while the `import` below it resolves, which is before the `const
  mockX = jest.fn()` lines have executed — the wrapper defers reading the variable until call
  time. Assigning the mock directly fails with an initialisation error.
- The 3000×4000 photo against a 390×800 preview gives exactly 5 photo pixels per preview point
  and hides 525px on each side horizontally, nothing vertically. Every hand-computed crop
  rectangle in the file is derived from those two numbers; changing the photo fixture invalidates
  all of them.
- One expectation is the fractional `1072.5`, not a round number. That is deliberate — it is the
  natural crop width of a label frame, and pinning it fractional is what proves no rounding or
  upscaling was applied. Fractional widths are safe: iOS handles them natively and Android
  truncates downward, which only strengthens the never-upscale guarantee.
- The two 0×0 cases assert `null`, not a thrown error. A view measured before its first layout
  reports zero size; letting that through would make the scale factor `NaN`, and a `NaN`
  rectangle passes iOS's bounds check silently because every comparison against `NaN` is false.
  Returning `null` routes to the centred fallback instead.
- The daily-limit and subscription cases make `text` throw on purpose. They are asserting that
  the body is never read on those statuses, so a throw is the assertion, not a failure.

## Known gaps

- No test crosses a real network or reaches a real model. Prompt wording lives in the Deno edge
  function, which Jest is configured to ignore entirely, so no test here can fail because of a
  prompt change.
- The crop arithmetic is proven; the alignment between what the camera preview shows and what
  the sensor captures is not, and cannot be without a device. That check is manual.
- Nothing asserts the encoded byte size resulting from the width and quality settings, because
  the manipulator is mocked and no image is produced.
- `measureCaptureLayout` is proven for the both-views-present and the 0×0 cases. A measurement
  callback that never fires would leave the promise pending forever; no case covers that,
  because no code path is known to produce it.
