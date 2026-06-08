# Glitch.js

[![CI Status](https://github.com/Isonimus/glitch-js/actions/workflows/ci.yml/badge.svg)](https://github.com/Isonimus/glitch-js/actions/workflows/ci.yml)
[![NPM Version](https://img.shields.io/npm/v/@isonimus/glitch-js.svg?style=flat-square)](https://www.npmjs.com/package/@isonimus/glitch-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)

A lightweight, dependency-free TypeScript library for applying stackable digital distortion and glitch effects to standard HTML/DOM elements. Built with GPU-accelerated SVG matrix filters, performance-optimized render loops, strict type safety, and interactive triggers.

🔗 **[Live Playground / Interactive Demo](https://isonimus.github.io/glitch-js/)**

---

## Features

- **Stackable & Composeable**: Combine RGB split, slice shifting, text scramble, container shaking, opacity flickers, and CRT scanlines on a single DOM element.
- **Performance First**: Leverages GPU-accelerated SVG color matrix filters and CSS transforms running inside a `requestAnimationFrame` render loop.
- **Event-Driven Sync**: Uses `MutationObserver` to automatically sync text changes and DOM updates from your main application into the glitch overlays without polling overhead.
- **Scroll-Visibility Triggers**: Native `IntersectionObserver` support allows triggering glitch effects only when elements scroll into view.
- **Mouse Velocity Interaction**: Dynamically scales glitch intensity, offsets, and frequency based on the speed of the user's cursor over the element.
- **NPM Ready & Strongly Typed**: Fully rewritten in TypeScript, shipping with rolled-up `.d.ts` declaration files for complete IDE autocomplete and static type safety.
- **Zero Dependencies**: Pure, vanilla library. No external styling or framework integrations required.

---

## Installation

### Package Manager
Install via npm:

```bash
npm install @isonimus/glitch-js
```

Then import it into your build files:

```typescript
import { Glitch, Effects } from '@isonimus/glitch-js';
```

### CDN / Direct Browser Import
For static sites, quick prototyping, or simple HTML projects, you can load the library directly from a CDN without any bundle configuration:

#### Option A: ES Modules (Recommended)
Import the library inside a `<script type="module">` block using [jsDelivr](https://www.jsdelivr.com/) or [esm.sh](https://esm.sh/):

```html
<script type="module">
  import { Glitch, Effects } from 'https://cdn.jsdelivr.net/npm/@isonimus/glitch-js@1.0.2/dist/lib/glitch.es.js';

  const element = document.querySelector('.glitch-title');
  new Glitch(element, {
    effects: [Effects.rgbSplit()]
  });
</script>
```

#### Option B: Classical Script Tag (UMD Global)
Include the script tag, which exposes the library globally under the `window.Glitch` namespace:

```html
<!-- Load UMD bundle -->
<script src="https://cdn.jsdelivr.net/npm/@isonimus/glitch-js@1.0.2/dist/lib/glitch.umd.js"></script>

<script>
  // Destructure from the global Glitch object
  const { Glitch, Effects } = window.Glitch;

  const element = document.querySelector('.glitch-title');
  new Glitch(element, {
    effects: [Effects.flicker()]
  });
</script>
```

---

## Quick Start

### 1. Simple Scramble & Flicker on Hover (TypeScript / JavaScript)

Apply a hover-triggered text scramble and brightness flicker to any element (e.g., a button or heading):

```typescript
import { Glitch, Effects } from '@isonimus/glitch-js';

const heading = document.querySelector('.glitch-heading') as HTMLElement;

const glitch = new Glitch(heading, {
  trigger: 'hover',
  effects: [
    Effects.scramble({ frequency: 0.3, scrambleChance: 0.3 }),
    Effects.flicker({ frequency: 0.2, minOpacity: 0.4 })
  ]
});
```

### 2. High-Intensity Cyberpunk Effect (Always Active)

Compose a combined RGB Split, CRT Scanline grid, and Slice Shift overlay:

```typescript
import { Glitch, Effects } from '@isonimus/glitch-js';

const terminal = document.querySelector('.terminal-view') as HTMLElement;

const controller = new Glitch(terminal, {
  trigger: 'always',
  effects: [
    // GPU-accelerated RGB split
    Effects.rgbSplit({ maxOffset: 10, frequency: 0.4, blendMode: 'screen' }),
    // CRT scanline overlay with subtle pulse animation
    Effects.scanlines({ opacity: 0.15, pulse: true }),
    // Slice shifting bands
    Effects.slice({ maxOffset: 12, frequency: 0.3 })
  ]
});
```

### 3. Mouse Velocity Coupled Interactivity

Make the glitch effect intensify dynamically as the user moves their mouse cursor faster over the element:

```typescript
import { Glitch, Effects } from '@isonimus/glitch-js';

const card = document.querySelector('.hero-card') as HTMLElement;

const mouseGlitch = new Glitch(card, {
  trigger: 'hover',
  effects: [
    Effects.rgbSplit({
      maxOffset: 6,
      frequency: 0.2,
      mouseInteract: true,      // Turn on velocity scaling
      mouseSensitivity: 2.0     // Higher factor = stronger velocity reaction
    }),
    Effects.shake({
      amplitudeX: 4,
      amplitudeY: 3,
      frequency: 0.3,
      mouseInteract: true,
      mouseSensitivity: 1.5
    })
  ]
});
```

---

## API Reference

### `new Glitch(element, options)`

Instantiates the distortion engine on a target DOM element.

#### Options (`GlitchOptions`)

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `effects` | `GlitchEffect[]` | `[]` | List of effect modules to apply (e.g. `Effects.rgbSplit()`). |
| `trigger` | `GlitchTrigger` | `'always'` | Activation mode: `'always'`, `'hover'`, `'click'`, `'scroll'`, or `'manual'`. |
| `active` | `boolean` | `true` | Set to `false` to prevent the engine from starting automatically. |

#### Methods

- **`start()`**: Manually starts the glitch render loop.
- **`stop()`**: Stops the loop and resets all styles and text contents to their original state.
- **`updateOptions(newOptions)`**: Cleanly stops, reconfigures, and restarts the engine with new options on the fly.
- **`destroy()`**: Shuts down the engine, removes all observers/event listeners, deletes all clone overlays from the DOM, and restores original styles.

---

## Effect Modules

### `Effects.rgbSplit(options?: RGBSplitOptions)`
Clones the element to separate it into Red and Cyan color channels, offsetting them horizontally.

- `maxOffset` (`number`, default: `8`): Maximum horizontal/vertical offset distance in pixels.
- `frequency` (`number`, default: `0.3`): Chance (from `0` to `1`) of triggering a split on each frame.
- `blendMode` (`string`, default: `'screen'`): CSS mix-blend-mode (e.g., `'screen'`, `'multiply'`).
- `mouseInteract` (`boolean`, default: `false`): Enable to scale offset and frequency with mouse velocity.
- `mouseSensitivity` (`number`, default: `1.5` Multiplier for mouse velocity scaling.

### `Effects.slice(options?: SliceOptions)`
Cuts horizontal slices out of overlay clones and shifts them left or right.

- `maxOffset` (`number`, default: `15`): Maximum slice translation distance in pixels.
- `frequency` (`number`, default: `0.25`): Chance of triggering a slice displacement on each frame.
- `mouseInteract` (`boolean`, default: `false`): Scales displacement and trigger frequency with cursor speed.
- `mouseSensitivity` (`number`, default: `1.5`): Sensitivity factor for velocity coupling.

### `Effects.scramble(options?: ScrambleOptions)`
Scrambles the text nodes inside the element using a character pool, while preserving the parent HTML structure.

- `characters` (`string`, default: `'01010101XYZ$#@%&*[]<>?/\\+=-_'`): The pool of glyphs to draw from.
- `frequency` (`number`, default: `0.2`): Chance of scrambling text on each frame.
- `scrambleChance` (`number`, default: `0.25`): Chance of any individual character in a text node being scrambled.

### `Effects.shake(options?: ShakeOptions)`
Translates the base container rapidly to simulate vibration.

- `amplitudeX` (`number`, default: `6`): Maximum horizontal vibration distance in pixels.
- `amplitudeY` (`number`, default: `4`): Maximum vertical vibration distance in pixels.
- `frequency` (`number`, default: `0.4`): Chance of vibration occurring on each frame.
- `mouseInteract` (`boolean`, default: `false`): Scales amplitude and frequency with mouse velocity.
- `mouseSensitivity` (`number`, default: `1.5`): Sensitivity factor for velocity coupling.

### `Effects.flicker(options?: FlickerOptions)`
Randomly toggles the brightness and opacity of the element.

- `minOpacity` (`number`, default: `0.2`): Minimum opacity limit during a flicker event.
- `frequency` (`number`, default: `0.15`): Chance of triggering a flicker.

### `Effects.scanlines(options?: ScanlineOptions)`
Overlays custom grid lines resembling retro CRT terminal monitors.

- `opacity` (`number`, default: `0.12`): Base opacity of the scanline overlay.
- `pulse` (`boolean`, default: `true`): Enable to animate the scanlines with a heartbeat/sine opacity cycle.

---

## Local Development & Contributing

We use **Vite** for local serving and bundling, and **Vitest** for DOM unit testing.

### Setup
1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Scripts
*   **Start Playground Dev Server**:
    ```bash
    npm run dev
    ```
    Loads the interactive cyberpunk demo playground at `http://localhost:5173`.
*   **Run Unit Tests**:
    ```bash
    npm run test
    ```
*   **Run Code Coverage**:
    ```bash
    npm run test:coverage
    ```
*   **Build Static Playground Site**:
    ```bash
    npm run build
    ```
    Outputs deploy-ready web pages into `/dist` (used by GitHub Pages).
*   **Build Library Module**:
    ```bash
    npm run build:lib
    ```
    Outputs ESM, UMD, and DTS declaration files into `/dist/lib` (used by npm publishing).
