# Ledger

Open work: deferrals, known defects, and follow-ups. Items are removed when the work
lands, not when it is planned.

## Clone ownership belongs to the engine, not to the effects — [#6](https://github.com/Isonimus/glitch-js/issues/6)

`rgbSplit` and `slice` remove the clones in their `cleanup` hooks, which fixes the leak
when `updateOptions` drops them, but ownership still sits in the effects: the fix relies on
`cleanup` running before the surviving effect's `setup`, and `removeClones()` tears down
every clone rather than "its two". Moving ownership into the engine needs a way for an
effect to declare it wants clones — a flag on `GlitchEffect`, or reference counting — which
is new public surface, so it was left out of a bug fix. Promoted to #6 so a contributor can
take it.

Deferred from the clone cleanup fix (2026-10-14).
