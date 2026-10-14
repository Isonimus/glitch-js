# Contributing to Glitch.js ⚡

Thank you for your interest in contributing to Glitch.js! This library aims to be a lightweight, zero-dependency visual engine for DOM distortions. This guide outlines how to get set up and contribute.

## Development Setup

Glitch.js is a purely client-side vanilla JavaScript library with no build steps or compile dependencies. All you need is a browser and a local HTTP server to view the playground.

1. Fork the repository and clone it locally:
   ```bash
   git clone https://github.com/tindalabs/glitch.js.git
   cd glitch.js
   ```

2. Start a local HTTP server:
   Using Python:
   ```bash
   python3 -m http.server 8080
   ```
   Or Node.js:
   ```bash
   npx serve
   ```

3. Open your browser and navigate to `http://localhost:8080` to load the interactive playground (`index.html`).

## Development Workflow

- **`glitch.js`**: Core library containing the `Glitch` controller class and built-in `Effects`.
- **`index.html`**: Interactive playground to tweak settings, test presets, and preview effects in real time.
- **`styles.css`**: Styling for the playground.

When modifying code:
- Ensure all logic remains dependency-free.
- Target modern browsers (using native ES6+ features and ES Modules).
- Optimize for performance (keep DOM operations minimal inside the `requestAnimationFrame` render loop).
- An effect that injects DOM removes it again in `cleanup`: clones through `removeClones()`, overlays by removing the nodes it stored. `updateOptions` runs `cleanup` on the effects it drops, so anything left behind survives into the next `start()`. Styling applied in `setup` rather than per frame — a filter, a blend mode — belongs to the effect and is not cleared by `stop()`.
- Keep per-instance effect state in a `WeakMap<Glitch, T>` scoped to the effect factory, as `Effects.decrypt()` does, rather than on the instance. It stays fully typed, it dies with the instance, and one effect object can be shared across several instances without their state interfering.

## Submitting a Pull Request

1. Create a feature branch from the `main` branch.
2. Implement your changes or new custom effects.
3. Test your changes locally in the playground across multiple tabs and trigger modes (hover, click, scroll).
4. Open a Pull Request against the `main` branch with a description of the changes, reproduction steps, or the visual impact.

## Reporting Bugs

Please open an issue on the GitHub tracker. Be sure to include:
- The browser version/OS.
- A minimal HTML/JS snippet reproducing the issue.
- Observed vs. expected behavior.

## Security Vulnerabilities

If you identify a security vulnerability, **please do not open a public GitHub issue**. Email [ikerlaforga@gmail.com](mailto:ikerlaforga@gmail.com) directly instead. Refer to [SECURITY.md](SECURITY.md) for more details.

## License

By contributing, you agree that your work will be licensed under the [MIT License](LICENSE).
