# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
