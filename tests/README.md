# Tests — documentation conventions

This folder holds testing **documentation only**. No test code lives here; tests stay in
`__tests__/` folders colocated with the code they test.

## The two levels

Testing documentation exists at two levels. They answer different questions, and that split
is what keeps them from drifting into two descriptions of the same thing.

| | `<module>/__tests__/README.md` | `tests/<area>.md` |
|---|---|---|
| Answers | Why do these tests exist? What's tricky here? | What can I rely on? |
| Audience | Someone editing this module | Someone who needs to know what the app guarantees |
| Contents | Harness, fixtures, non-obvious cases, known gaps | Proven behaviour, plus what is knowingly unproven |
| Names test cases? | Yes | No |

The area file naming no test cases is deliberate — it stops that file becoming a summary of
the local README, which is the fastest way to end up with two docs that disagree.

## Writing the area file

Behaviour goes in **product language** — what a user would notice, not what a function returns.

> One bad session never lowers your suggestion; two in a row does.

not

> `getProgressionState` returns the prior anchor when the previous session scored higher.

The **Not proven** section is the most valuable part of the file. A document that lists only
what passes is marketing; one that names its gaps is an instrument. Write the gap even when —
especially when — nobody has scheduled the fix.

## The footer

Every area file ends with one line:

```
Area: <path/to/module> · <n> cases · reviewed <YYYY-MM-DD>
```

- **Area** — the module path the file describes.
- **n cases** — the test count the file was written against.
- **reviewed** — the date a human last read the file against the tests.

There are **no IDs** linking prose to individual tests. The footer is the honesty signal
instead: a moved count or a stale date is a prompt to re-read. The trade is deliberate — these
files describe behaviour, they don't contract it. The contract is the test.

## Keeping them current

Changing test cases means checking the area file in the same pass and updating it whenever the
proven behaviour moved. Adding cases that prove nothing new needs only the count bumped.

## Templates

Copy from `_templates/` when an area or module gets its first doc:

- `_templates/area.md` → `tests/<area>.md`
- `_templates/module-readme.md` → `<module>/__tests__/README.md`

Neither is generated or auto-created.
