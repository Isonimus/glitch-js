# Ledger

Open work: deferrals, known defects, and follow-ups. Items are removed when the work
lands, not when it is planned.

## Honour `prefers-reduced-motion`

No effect checks `matchMedia('(prefers-reduced-motion: reduce)')`, so `flicker`, `shake`
and `rgbSplit` play at full strength for users who asked the OS for less motion — and
flicker is a photosensitivity concern (WCAG 2.3.1), not only a preference. Every consumer
has to gate the library itself today (smart-city's advisor hologram does). The library is
the right single owner: suppress or soften the motion-heavy effects while the query
matches, follow the query's `change` event, and let callers opt out explicitly where the
motion is the content.

## Clone ownership belongs to the engine, not to the effects — [#6](https://github.com/Isonimus/glitch-js/issues/6)

`rgbSplit` and `slice` remove the clones in their `cleanup` hooks, which fixes the leak
when `updateOptions` drops them, but ownership still sits in the effects: the fix relies on
`cleanup` running before the surviving effect's `setup`, and `removeClones()` tears down
every clone rather than "its two". Moving ownership into the engine needs a way for an
effect to declare it wants clones — a flag on `GlitchEffect`, or reference counting — which
is new public surface, so it was left out of a bug fix. Promoted to #6 so a contributor can
take it.

Deferred from the clone cleanup fix (2026-10-14).
