# Ledger

Open work: deferrals, known defects, and follow-ups. Items are removed when the work
lands, not when it is planned.

## Known defects

### Clones are silently orphaned by an external `innerHTML` replacement

When external code replaces the target element's content wholesale
(`element.innerHTML = '...'`), the injected `.glitch-clone` overlays are removed from the
DOM along with everything else, but `Glitch.clones` keeps referencing the detached nodes.
`syncClones()` then writes into detached DOM, so every clone-based effect (`rgbSplit`,
`slice`) stops rendering with no error.

Measured on 2026-09-07 against `main`: after `container.innerHTML = 'Neo Tokyo'` on an
instance with two clones, `clones.length === 2`, `clones.every(c => c.isConnected) === false`,
and `container.querySelectorAll('.glitch-clone').length === 0`.

This is a fail-loud violation — a broken invariant that continues quietly. The fix is for
the `MutationObserver` to detect that its clones were removed and re-create them, rather
than syncing into nodes that are no longer in the document.

Deferred from the `Effects.decrypt()` change (2026-09-07): the managed-text work fixed the
per-frame clone rebuild, but clone *lifecycle* is a separate concern and fixing it there
would have widened an unrelated diff.

## Type debt

### `Glitch.state` is typed `Record<string, any>`

`state` exists as scratch space for custom effects but its `any` value type defeats
checking at every use, against the project's no-`any` rule. Narrowing it to
`Record<string, unknown>` is the correct fix and is a type-level breaking change for any
third-party effect that reads `state` without narrowing, so it wants a major or at least a
clearly flagged minor release.

The built-in effects no longer rely on it: `decrypt` keeps its per-instance timeline in a
`WeakMap<Glitch, DecryptState>` scoped to the effect, which is fully typed and needs no
cast. Any new built-in effect should do the same until `state` is narrowed.
