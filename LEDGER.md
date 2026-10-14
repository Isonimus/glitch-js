# Ledger

Open work: deferrals, known defects, and follow-ups. Items are removed when the work
lands, not when it is planned.

## `slice` identifies `rgbSplit` by name to decide what it may clear

On a frame it does not slice, `slice` clears `transform` and `opacity` on the clones
only when no effect named `rgbSplit` is in the list, because both effects paint those
two properties on the same shared pool and clearing them would wipe the channel split.
The name check is the wart: it couples one effect to another's identity, and a custom
effect that displaces the clones gets no such protection.

The coupling is a consequence of the shared pool, so it does not dissolve by local
tidying. Giving each declaring effect its own clones would remove it outright — `slice`
would clear what it alone painted — at the cost of four clones instead of two when both
effects run, which stacks two more copies and changes the composite look. That is a
visual behaviour change, so it was kept out of the ownership fix.

Deferred from the engine-owned clone lifecycle fix (2026-10-14).
