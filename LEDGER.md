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

## Defect — `rgbSplit` leaves its clones behind when `updateOptions` drops it

`rgbSplit` creates two clones in `setup` and defines `reset` but no `cleanup`, so
`updateOptions` with an effect list that no longer holds it keeps both clones — and the
`start()` that follows shows them unfiltered, still screen-blended over the element, which
brightens it. `slice` shares the clones and has the same gap. Only `destroy()` removes them.
Fix: give both a `cleanup` that removes the clones (or have `updateOptions` drop clones no
remaining effect claims), with a regression test that swaps `rgbSplit` out via
`updateOptions` and asserts no `.glitch-clone` remains.
