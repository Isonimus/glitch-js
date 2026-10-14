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

## `publish.yml` fires on two events that overlap for the same release

The workflow triggers on both `push` of a `v*` tag and `release: [published]`. Cutting a
release the way GitHub's UI does it — tag, then publish a release on that tag — fires both,
and the second run reaches `npm publish` for a version the registry already serves, which
fails on a version conflict. The release itself is fine; what shows is a red run against a
version that published correctly, which is worse than useless to whoever reads the Actions
tab next.

It has never fired because every release so far was cut by pushing a tag alone, and the
repository has no GitHub Releases at all. It is a trap armed for the first person who cuts
one from the UI rather than a current breakage.

Either trigger alone is sufficient; the fix is to drop `release: [published]`, since the
tag push is the path actually in use, or to guard the publish step on the version not
already being on the registry if releases are wanted later.

Noticed while releasing 2.2.0 (2026-10-14).
