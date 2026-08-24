# <Area name>

## What this part of the app does

<2–3 plain sentences a stranger can follow. What does the user see or do here, and
why does it matter? No file paths, no jargon — if a term needs the codebase to make
sense, it doesn't belong in this section. End by saying what this file covers, e.g.
"This file covers everything between X and Y.">

## How we tested it

<The method, in plain words. What is real and what is faked, and what the tests
actually check — "we fake the network, then check how the app reacts to every kind
of reply." A reader should finish this knowing the shape of the experiment without
opening a single test file. No test names, no function names.>

**Hardest to prove:** <2–3 scenarios that were genuinely difficult, or that a reader
would assume nobody bothered to cover. One line each, in scenario language.>

## What the tests prove

- <Behaviour a user would notice, in product language. One sentence, two at most —
  a bullet carrying five claims is five bullets.>
- <No function names, no test names, no file paths.>
- <If you can't state it without naming a function, it belongs in the module README.>

## Not proven

- <Behaviour a reader might reasonably assume is covered but isn't — say why, or say
  no test exists. This is the limitations section, and it is the most valuable part
  of the file. Write the gap even when nobody has scheduled the fix.>
- <Keep this honest. Delete the section only when it is genuinely empty.>

Area: <path/to/module> · <n> cases · reviewed <YYYY-MM-DD>
