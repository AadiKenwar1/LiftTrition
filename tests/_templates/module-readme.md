# <Module> tests

## Logic kind

<One of: business rules · formulas · validation & parsing · state & concurrency ·
persistence & integration · presentation. Name the bar that kind sets, and say so if
different functions here fall under different kinds.>

## Harness

<How cases are constructed — the shared setup, what its inputs mean, what it returns.
Enough that someone can add a case without reading the whole file.>

## Fixtures

<Which shared builders these tests use, and any local overrides worth knowing about.>

## Non-obvious cases

- <A case whose expected value looks wrong until you know why — state the why.>
- <A constant, cap, or ordering rule that specific cases depend on.>

## Known gaps

- <What this folder does not cover, and whether that's deliberate.>
