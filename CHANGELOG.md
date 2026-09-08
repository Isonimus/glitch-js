# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-09-08

### Added
- **`DecryptOptions.preformatted`**: Declares that the target renders whitespace verbatim (`white-space: pre`, `pre-wrap`, `break-spaces`, or a `<pre>` element), so `maskWhitespace` masks whitespace runs and indentation as well as single spaces. Explicit rather than detected, because a detected version could not be tested: `getComputedStyle` reports no usable `white-space` under jsdom. Tabs, line breaks, and whitespace-only text nodes stay out of the mask either way.

### Changed
- **Declaration Build Scope**: The library's declaration build now follows the published entry point only. The tsconfig program spans all of `src`, so `glitch.test.d.ts` and `playground.d.ts` were emitted into `dist/lib` and shipped to consumers — the latter implying a public surface that is not one. The published tarball is now `LICENSE`, `README.md`, `package.json`, and the three `dist/lib` artifacts.

### Removed
- **`Glitch.state`** (breaking): The untyped `Record<string, any>` scratch space on the instance is gone. No built-in effect ever used it and it was never documented, while its `any` value type defeated checking at every use. Custom effects should keep per-instance state in a `WeakMap<Glitch, T>` scoped to the effect factory, as `Effects.decrypt()` does: it stays fully typed, it dies with the instance, and one effect object can then be shared across several instances without their state interfering.

### Fixed
- **Decrypt Masked Collapsible Whitespace**: `maskWhitespace` replaced every inline space, including the source indentation of hand-formatted markup, which the browser collapses or drops entirely. A character painted where the browser paints none lengthened the line and added line boxes of its own for the duration of the reveal — in the playground's terminal demo, a 32-character header line masked to 125 characters, and four indentation nodes became four extra lines of ciphertext between the real ones. Only whitespace layout is guaranteed to paint is masked now: a single space between two non-whitespace characters, plus non-breaking spaces. Whitespace runs, leading and trailing whitespace, tabs, line breaks, and whitespace-only text nodes (which flex and grid containers drop) are left intact.
- **Clones and Overlays Orphaned by an External Content Replacement**: Assigning to the target element's `innerHTML` removed the injected `.glitch-clone` and `.glitch-overlay` nodes along with the content, while the instance kept referencing the detached nodes and syncing into them. Every clone- and overlay-based effect (`rgbSplit`, `slice`, `scanlines`, `hologram`) silently stopped rendering. The `MutationObserver` now detects that its injected DOM was detached and rebuilds it through the effects' `setup` hooks, which also restores the per-clone channel filters and re-reveals the clones if the instance is running.

## [1.2.0] - 2026-09-07

### Added
- **Decrypt Reveal Effect**: New `Effects.decrypt()` module masks the text with a same-length string of rolling characters and locks them into place one position at a time until the real text is revealed. Configurable via `characters`, `duration`, `rollInterval`, `revealOrder`, `maskWhitespace`, and an `onComplete` callback (`DecryptOptions`). Unlike the ambient effects it is a finite timeline: it stops working once the reveal lands, and its `reset` hook rearms it so `hover`, `click`, and `scroll` triggers replay it.
- **Playground Decrypt Controls**: Added a Decrypt Reveal control group to the interactive playground, including an explicit replay button, since a finished one-shot effect is otherwise indistinguishable from a broken one.
- **Documentation**: Added the `Effects.decrypt()` API reference and a decrypt-on-scroll usage example to the README.

### Changed
- **Shared Managed-Text Primitives**: Text effects now operate through `readManagedText()` / `writeManagedText()` / `restoreManagedText()` on the `Glitch` instance, which treat the element's text nodes as one logical string. This makes reveals read continuously across inline markup, mirrors text writes directly into the overlay clones (so ghost layers can no longer display plaintext the element is still hiding), and stops text effects from descending into `<script>` and `<style>` bodies.

### Fixed
- **Per-Frame Clone Rebuilds**: The `MutationObserver` classified the library's own DOM writes as external content changes, because a `characterData` record reports the `Text` node rather than an element. An active text effect therefore triggered a full clone markup rebuild on every animation frame. Mutations caused by the library — clone injection, and writes to the text nodes a running effect owns — are now recognised as its own.
- **Original Text Storage**: The pristine text of each node is held in a `WeakMap` instead of a custom property stashed on the DOM node behind an `any` cast.

## [1.1.0] - 2026-07-01

### Added
- **Hologram Effect**: New `Effects.hologram()` module renders elements as a cinematic sci-fi projection — a semitransparent, color-tinted layer with a sweeping interference band, faint holographic banding, gentle vertical hovering, and intermittent glitch flashes. Configurable via `color`, `opacity`, `glowIntensity`, `scanSpeed`, `flickerFrequency`, and `floatAmplitude` (`HologramOptions`).
- **Playground Hologram Controls**: Added a Hologram Projection control group (color picker + sliders) to the interactive playground, and reworked the "Broken Holo" preset to showcase the new effect.
- **Documentation**: Added the `Effects.hologram()` API reference and a cinematic hologram usage example to the README.

## [1.0.3] - 2026-06-08

### Added
- **CDN Usage Guides**: Added detailed documentation on loading the library directly from a CDN (ES Modules and UMD script tags) to the README.

## [1.0.2] - 2026-06-08

### Added
- **README Badges & Links**: Added real-time workflow status badges, version labels, and licensing indicators to the README.
- **Playground Navigation**: Added header navigation links in the cyberpunk playground pointing back to GitHub and NPM.

### Fixed
- **NPM Provenance Repository Metadata**: Configured the `"repository"` property in `package.json` to resolve OIDC verification validation failures during trusted publishing.

## [1.0.0] - 2026-06-08

### Added
- **TypeScript Core Rewrite**: Rewrote the entire library engine (`src/glitch.ts`) and demo application (`src/playground.ts`) to TypeScript with full static type safety.
- **Rollup Declaration Bundling**: Configured Vite build systems to export type declarations (`dist/lib/glitch.d.ts`) alongside dual UMD and ESM modules.
- **Automated Testing Suite**: Configured Vitest and Happy DOM to run comprehensive lifecycle and event triggering tests with v8 code coverage reporting.
- **CI Build & Verification Pipeline**: Integrated GitHub Actions CI (`.github/workflows/ci.yml`) to build packages, run lints, and verify all unit tests on pull requests.
- **Automated Pages Hosting**: Added automated Vite building and continuous deployment to GitHub Pages (`.github/workflows/deploy.yml`).
- **NPM Trusted Publishing**: Configured secure OIDC trusted publishing (`.github/workflows/publish.yml`) with build provenance attestation for package tagging.
- **CodeQL Security Scanning**: Configured SAST CodeQL analysis (`.github/workflows/codeql.yml`) on every push and PR to main.
- **Repository Governance**: Added `LICENSE` (MIT), `CODE_OF_CONDUCT.md`, `SECURITY.md`, and `CONTRIBUTING.md`.

### Security
- **DOM XSS Sanitization**: Fixed CodeQL warning in `src/playground.ts` by escaping dynamic inputs before rendering code snippets in `innerHTML`.
