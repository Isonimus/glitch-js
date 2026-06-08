/**
 * glitch.ts - A lightweight, dependency-free library for stackable DOM glitch effects.
 * Designed for modularity, customizability, and performance.
 */

// Interface definitions for configuration options
export interface GlitchEffect {
  name: string;
  setup?: (instance: Glitch) => void;
  update?: (instance: Glitch, time: number) => void;
  reset?: (instance: Glitch) => void;
  cleanup?: (instance: Glitch) => void;
}

export type GlitchTrigger = 'always' | 'hover' | 'click' | 'scroll' | 'manual';

export interface GlitchOptions {
  effects?: GlitchEffect[];
  trigger?: GlitchTrigger;
  active?: boolean;
}

export interface RGBSplitOptions {
  maxOffset?: number;
  frequency?: number;
  blendMode?: string;
  mouseInteract?: boolean;
  mouseSensitivity?: number;
}

export interface SliceOptions {
  count?: number;
  maxOffset?: number;
  frequency?: number;
  mouseInteract?: boolean;
  mouseSensitivity?: number;
}

export interface ScrambleOptions {
  characters?: string;
  frequency?: number;
  scrambleChance?: number;
}

export interface ShakeOptions {
  amplitudeX?: number;
  amplitudeY?: number;
  frequency?: number;
  mouseInteract?: boolean;
  mouseSensitivity?: number;
}

export interface FlickerOptions {
  minOpacity?: number;
  frequency?: number;
}

export interface ScanlinesOptions {
  opacity?: number;
  pulse?: boolean;
}

// Helper to ensure the custom SVG filters for RGB Split are injected into the document body
const ensureSvgFilters = (): void => {
  if (document.getElementById('glitch-svg-filters')) return;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.id = 'glitch-svg-filters';
  svg.style.position = 'absolute';
  svg.style.width = '0';
  svg.style.height = '0';
  svg.style.pointerEvents = 'none';
  svg.style.overflow = 'hidden';

  // Red Channel Isolation: Isolates Red and preserves Alpha (R=R, G=0, B=0, A=A)
  const filterRed = document.createElementNS(svgNS, 'filter');
  filterRed.id = 'glitch-filter-red';
  const matrixRed = document.createElementNS(svgNS, 'feColorMatrix');
  matrixRed.setAttribute('type', 'matrix');
  matrixRed.setAttribute('values', '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0');
  filterRed.appendChild(matrixRed);

  // Cyan Channel Isolation: Isolates Green & Blue and preserves Alpha (R=0, G=G, B=B, A=A)
  const filterCyan = document.createElementNS(svgNS, 'filter');
  filterCyan.id = 'glitch-filter-cyan';
  const matrixCyan = document.createElementNS(svgNS, 'feColorMatrix');
  matrixCyan.setAttribute('type', 'matrix');
  matrixCyan.setAttribute('values', '0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0');
  filterCyan.appendChild(matrixCyan);

  svg.appendChild(filterRed);
  svg.appendChild(filterCyan);
  document.body.appendChild(svg);
};

// Helper to recursively scramble text nodes
const scrambleTextNodes = (node: Node, chars: string, chance: number): void => {
  if (node.nodeType === Node.TEXT_NODE) {
    const textNode = node as Text;
    if ((textNode as any).originalContent === undefined) {
      (textNode as any).originalContent = textNode.nodeValue || '';
    }
    const text = (textNode as any).originalContent as string;
    let scrambled = '';
    for (let i = 0; i < text.length; i++) {
      if (/\s/.test(text[i])) {
        scrambled += text[i];
      } else if (Math.random() < chance) {
        scrambled += chars[Math.floor(Math.random() * chars.length)];
      } else {
        scrambled += text[i];
      }
    }
    textNode.nodeValue = scrambled;
  } else {
    for (const child of Array.from(node.childNodes)) {
      if (child instanceof HTMLElement) {
        if (child.classList.contains('glitch-clone')) continue;
        if (child.classList.contains('glitch-overlay')) continue;
      }
      scrambleTextNodes(child, chars, chance);
    }
  }
};

// Helper to restore original text nodes
const restoreTextNodes = (node: Node): void => {
  if (node.nodeType === Node.TEXT_NODE) {
    const textNode = node as Text;
    if ((textNode as any).originalContent !== undefined) {
      textNode.nodeValue = (textNode as any).originalContent;
    }
  } else {
    for (const child of Array.from(node.childNodes)) {
      if (child instanceof HTMLElement) {
        if (child.classList.contains('glitch-clone')) continue;
        if (child.classList.contains('glitch-overlay')) continue;
      }
      restoreTextNodes(child);
    }
  }
};

export class Glitch {
  element: HTMLElement;
  options: Required<GlitchOptions>;
  isRunning: boolean = false;
  animationFrameId: number | null = null;
  clones: HTMLElement[] = [];
  overlays: Record<string, HTMLElement> = {};
  originalStyles: { position?: string; overflow?: string } = {};
  state: Record<string, any> = {};

  observer: MutationObserver | null = null;
  intersectionObserver: IntersectionObserver | null = null;
  mouseVelocity: number = 0;
  lastMouseX: number = 0;
  lastMouseY: number = 0;
  lastMouseTime: number = 0;

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseLeave: () => void;
  private boundStart?: () => void;
  private boundStop?: () => void;
  private boundToggle?: () => void;

  constructor(element: HTMLElement, options: GlitchOptions = {}) {
    if (!element) {
      throw new Error('Glitch: Target DOM element is required.');
    }
    this.element = element;

    this.options = {
      effects: [],
      trigger: 'always',
      active: true,
      ...options,
    };

    // Event handlers for mouse velocity tracking
    this.boundMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      if (this.lastMouseTime > 0) {
        const dt = now - this.lastMouseTime;
        if (dt > 0) {
          const dx = e.clientX - this.lastMouseX;
          const dy = e.clientY - this.lastMouseY;
          const distance = Math.hypot(dx, dy);
          const instantVelocity = distance / dt; // pixels per ms
          // Smooth using a low-pass filter
          this.mouseVelocity = this.mouseVelocity * 0.8 + instantVelocity * 0.2;
        }
      }
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.lastMouseTime = now;
    };

    this.boundMouseLeave = () => {
      this.mouseVelocity = 0;
      this.lastMouseTime = 0;
    };

    this.init();
  }

  init(): void {
    ensureSvgFilters();

    // Cache original layout styles
    this.originalStyles.position = this.element.style.position;
    this.originalStyles.overflow = this.element.style.overflow;

    const computedStyle = window.getComputedStyle(this.element);
    if (computedStyle.position === 'static') {
      this.element.style.position = 'relative';
    }

    // Set up MutationObserver to sync content dynamically
    this.observer = new MutationObserver((mutations) => {
      // Avoid reacting to mutations on our own clones/overlays
      const hasExternalMutation = mutations.some((m) => {
        const target = m.target;
        return !(
          target instanceof HTMLElement &&
          (target.classList.contains('glitch-clone') ||
            target.classList.contains('glitch-overlay'))
        );
      });
      if (hasExternalMutation) {
        this.syncClones();
      }
    });

    this.observer.observe(this.element, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    // Attach velocity tracking listeners
    this.element.addEventListener('mousemove', this.boundMouseMove);
    this.element.addEventListener('mouseleave', this.boundMouseLeave);

    // Initialize each registered effect
    for (const effect of this.options.effects) {
      if (effect.setup) {
        effect.setup(this);
      }
    }

    this.setupTriggers();

    if (this.options.active && this.options.trigger === 'always') {
      this.start();
    }
  }

  // Clones the target element to overlay on top of itself
  createClones(count: number = 2): void {
    // Clean up existing clones first
    this.clones.forEach((c) => c.remove());
    this.clones = [];

    const computed = window.getComputedStyle(this.element);

    for (let i = 0; i < count; i++) {
      const clone = this.element.cloneNode(true) as HTMLElement;

      // Strip scripts, IDs and nested glitch elements to prevent double triggers
      clone.querySelectorAll('script').forEach((s) => s.remove());
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
      clone.querySelectorAll('.glitch-clone').forEach((c) => c.remove());
      clone.querySelectorAll('.glitch-overlay').forEach((o) => o.remove());

      // Absolute overlay styling
      clone.style.position = 'absolute';
      clone.style.top = '0';
      clone.style.left = '0';
      clone.style.width = '100%';
      clone.style.height = '100%';
      clone.style.margin = '0';
      clone.style.padding = computed.padding;
      clone.style.borderWidth = computed.borderWidth;
      clone.style.borderStyle = computed.borderStyle;
      clone.style.borderColor = computed.borderColor;
      clone.style.boxSizing = 'border-box';
      clone.style.pointerEvents = 'none';
      clone.style.display = 'none';
      clone.style.zIndex = (999 + i).toString();

      clone.classList.add('glitch-clone');

      this.element.appendChild(clone);
      this.clones.push(clone);
    }
  }

  // Checks if clones need content synchronization
  syncClones(): void {
    // Disconnect observer during sync to avoid triggering infinite loop
    if (this.observer) this.observer.disconnect();

    this.clones.forEach((clone) => {
      // Sync text/inner HTML if target structure changed
      const currentHTML = Array.from(this.element.childNodes)
        .filter(
          (n) =>
            !(n instanceof HTMLElement) ||
            (!n.classList.contains('glitch-clone') &&
              !n.classList.contains('glitch-overlay'))
        )
        .map((n) => (n as HTMLElement).outerHTML || n.textContent || '')
        .join('');

      const cloneHTML = Array.from(clone.childNodes)
        .filter(
          (n) =>
            !(n instanceof HTMLElement) ||
            (!n.classList.contains('glitch-clone') &&
              !n.classList.contains('glitch-overlay'))
        )
        .map((n) => (n as HTMLElement).outerHTML || n.textContent || '')
        .join('');

      if (currentHTML !== cloneHTML) {
        // Simple inner sync preserving layout/cloning overrides
        const display = clone.style.display;
        const transform = clone.style.transform;
        const clipPath = clone.style.clipPath;
        const filter = clone.style.filter;
        const mixBlendMode = clone.style.mixBlendMode;

        clone.innerHTML = '';
        Array.from(this.element.childNodes).forEach((n) => {
          if (
            n instanceof HTMLElement &&
            (n.classList.contains('glitch-clone') ||
              n.classList.contains('glitch-overlay'))
          ) {
            return;
          }
          clone.appendChild(n.cloneNode(true));
        });

        clone.style.display = display;
        clone.style.transform = transform;
        clone.style.clipPath = clipPath;
        clone.style.filter = filter;
        clone.style.mixBlendMode = mixBlendMode;
      }
    });

    // Reconnect observer
    if (this.observer) {
      this.observer.observe(this.element, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }
  }

  setupTriggers(): void {
    this.boundStart = () => this.start();
    this.boundStop = () => this.stop();
    this.boundToggle = () => {
      if (this.isRunning) {
        this.stop();
      } else {
        this.start();
      }
    };

    if (this.options.trigger === 'hover') {
      this.element.addEventListener('mouseenter', this.boundStart);
      this.element.addEventListener('mouseleave', this.boundStop);
    } else if (this.options.trigger === 'click') {
      this.element.addEventListener('click', this.boundToggle);
    } else if (this.options.trigger === 'scroll') {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.start();
            } else {
              this.stop();
            }
          });
        },
        { threshold: 0.05 }
      );
      this.intersectionObserver.observe(this.element);
    }
  }

  removeTriggers(): void {
    if (this.options.trigger === 'hover') {
      if (this.boundStart) this.element.removeEventListener('mouseenter', this.boundStart);
      if (this.boundStop) this.element.removeEventListener('mouseleave', this.boundStop);
    } else if (this.options.trigger === 'click') {
      if (this.boundToggle) this.element.removeEventListener('click', this.boundToggle);
    } else if (this.options.trigger === 'scroll' && this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Synchronize and show clones
    this.syncClones();
    this.clones.forEach((c) => {
      c.style.display = 'block';
    });

    const loop = (time: number) => {
      if (!this.isRunning) return;

      // Decay mouse velocity over time
      this.mouseVelocity *= 0.94;
      if (this.mouseVelocity < 0.01) this.mouseVelocity = 0;

      // Run each effect's update routine
      for (const effect of this.options.effects) {
        if (effect.update) {
          effect.update(this, time);
        }
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Reset element styles to original values
    this.element.style.transform = '';
    this.element.style.clipPath = '';
    this.element.style.opacity = '';
    this.element.style.filter = '';

    restoreTextNodes(this.element);

    // Hide and reset all clones
    this.clones.forEach((c) => {
      c.style.display = 'none';
      c.style.transform = '';
      c.style.clipPath = '';
      c.style.opacity = '';
      c.style.filter = '';
    });

    // Run reset functions for effects
    for (const effect of this.options.effects) {
      if (effect.reset) {
        effect.reset(this);
      }
    }
  }

  updateOptions(newOptions: GlitchOptions = {}): void {
    const wasRunning = this.isRunning;
    this.stop();
    this.removeTriggers();

    // Clean up old effects if they had setup
    for (const effect of this.options.effects) {
      if (effect.cleanup) {
        effect.cleanup(this);
      }
    }

    this.options = {
      ...this.options,
      ...newOptions,
    };

    // Re-initialize
    this.init();

    if (wasRunning || (this.options.active && this.options.trigger === 'always')) {
      this.start();
    }
  }

  destroy(): void {
    this.stop();
    this.removeTriggers();

    // Disconnect mutation observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Remove mouse event listeners
    this.element.removeEventListener('mousemove', this.boundMouseMove);
    this.element.removeEventListener('mouseleave', this.boundMouseLeave);

    // Cleanup effects
    for (const effect of this.options.effects) {
      if (effect.cleanup) {
        effect.cleanup(this);
      }
    }

    // Remove clones and overlays from DOM
    this.clones.forEach((c) => c.remove());
    Object.values(this.overlays).forEach((o) => o.remove());

    // Restore original styles
    this.element.style.position = this.originalStyles.position || '';
    this.element.style.overflow = this.originalStyles.overflow || '';
  }
}

// ==========================================
// Built-in Effect Modules
// ==========================================
export const Effects = {
  /**
   * RGB Split Effect
   * Clones the element and splits red/cyan channels horizontally.
   * Can scale offset/frequency dynamically with mouse movement.
   */
  rgbSplit(options: RGBSplitOptions = {}): GlitchEffect {
    const opts = {
      maxOffset: 8,
      frequency: 0.3,
      blendMode: 'screen',
      mouseInteract: false,
      mouseSensitivity: 1.5,
      ...options,
    };

    return {
      name: 'rgbSplit',
      setup(instance) {
        instance.createClones(2);
        if (instance.clones[0]) {
          instance.clones[0].style.filter = 'url(#glitch-filter-red)';
          instance.clones[0].style.mixBlendMode = opts.blendMode;
        }
        if (instance.clones[1]) {
          instance.clones[1].style.filter = 'url(#glitch-filter-cyan)';
          instance.clones[1].style.mixBlendMode = opts.blendMode;
        }
      },
      update(instance) {
        const multiplier = opts.mouseInteract
          ? 1 + instance.mouseVelocity * opts.mouseSensitivity
          : 1;

        const effectiveFreq = Math.min(1, opts.frequency * multiplier);
        const effectiveOffset = opts.maxOffset * multiplier;

        if (Math.random() < effectiveFreq) {
          const shiftX1 = (Math.random() - 0.5) * effectiveOffset * 2;
          const shiftY1 = (Math.random() - 0.5) * effectiveOffset * 0.4;
          const shiftX2 = (Math.random() - 0.5) * effectiveOffset * 2;
          const shiftY2 = (Math.random() - 0.5) * effectiveOffset * 0.4;

          if (instance.clones[0]) {
            instance.clones[0].style.transform = `translate(${shiftX1}px, ${shiftY1}px)`;
            instance.clones[0].style.opacity = (Math.random() * 0.8 + 0.2).toString();
          }

          if (instance.clones[1]) {
            instance.clones[1].style.transform = `translate(${shiftX2}px, ${shiftY2}px)`;
            instance.clones[1].style.opacity = (Math.random() * 0.8 + 0.2).toString();
          }
        } else {
          if (instance.clones[0]) {
            instance.clones[0].style.transform = '';
            instance.clones[0].style.opacity = '0';
          }
          if (instance.clones[1]) {
            instance.clones[1].style.transform = '';
            instance.clones[1].style.opacity = '0';
          }
        }
      },
      reset(instance) {
        if (instance.clones[0]) {
          instance.clones[0].style.transform = '';
          instance.clones[0].style.opacity = '';
        }
        if (instance.clones[1]) {
          instance.clones[1].style.transform = '';
          instance.clones[1].style.opacity = '';
        }
      },
    };
  },

  /**
   * Slice Effect
   * Randomly clips clones to horizontal bands and translates them.
   * Can scale slice offsets/frequency dynamically with mouse movement.
   */
  slice(options: SliceOptions = {}): GlitchEffect {
    const opts = {
      count: 4,
      maxOffset: 15,
      frequency: 0.25,
      mouseInteract: false,
      mouseSensitivity: 1.5,
      ...options,
    };

    return {
      name: 'slice',
      setup(instance) {
        if (instance.clones.length < 2) {
          instance.createClones(2);
        }
      },
      update(instance) {
        const multiplier = opts.mouseInteract
          ? 1 + instance.mouseVelocity * opts.mouseSensitivity
          : 1;

        const effectiveFreq = Math.min(1, opts.frequency * multiplier);
        const effectiveOffset = opts.maxOffset * multiplier;

        if (Math.random() < effectiveFreq) {
          instance.clones.forEach((clone) => {
            const top = Math.random() * 80;
            const height = Math.random() * 20;
            const bottom = 100 - (top + height);
            const shiftX = (Math.random() - 0.5) * effectiveOffset * 2;

            clone.style.clipPath = `inset(${top}% 0 ${bottom}% 0)`;
            clone.style.transform = `translateX(${shiftX}px)`;
            clone.style.opacity = '1';
            clone.style.display = 'block';
          });
        } else {
          instance.clones.forEach((clone) => {
            clone.style.clipPath = '';
            if (!instance.options.effects.some((e) => e.name === 'rgbSplit')) {
              clone.style.transform = '';
              clone.style.opacity = '0';
            }
          });
        }
      },
      reset(instance) {
        instance.clones.forEach((clone) => {
          clone.style.clipPath = '';
          clone.style.transform = '';
        });
      },
    };
  },

  /**
   * Text Scramble Effect
   * Dynamically scrambles text nodes inside the element.
   */
  scramble(options: ScrambleOptions = {}): GlitchEffect {
    const opts = {
      characters: '01010101XYZ$#@%&*[]<>?/\\+=-_',
      frequency: 0.2,
      scrambleChance: 0.25,
      ...options,
    };

    return {
      name: 'scramble',
      update(instance) {
        if (Math.random() < opts.frequency) {
          scrambleTextNodes(instance.element, opts.characters, opts.scrambleChance);
        } else {
          restoreTextNodes(instance.element);
        }
      },
      reset(instance) {
        restoreTextNodes(instance.element);
      },
    };
  },

  /**
   * Shake Effect
   * Translates the main element with high-frequency offsets.
   * Can scale shake amplitude/frequency dynamically with mouse movement.
   */
  shake(options: ShakeOptions = {}): GlitchEffect {
    const opts = {
      amplitudeX: 6,
      amplitudeY: 4,
      frequency: 0.4,
      mouseInteract: false,
      mouseSensitivity: 1.5,
      ...options,
    };

    return {
      name: 'shake',
      update(instance) {
        const multiplier = opts.mouseInteract
          ? 1 + instance.mouseVelocity * opts.mouseSensitivity
          : 1;

        const effectiveFreq = Math.min(1, opts.frequency * multiplier);
        const effectiveAmpX = opts.amplitudeX * multiplier;
        const effectiveAmpY = opts.amplitudeY * multiplier;

        if (Math.random() < effectiveFreq) {
          const x = (Math.random() - 0.5) * effectiveAmpX;
          const y = (Math.random() - 0.5) * effectiveAmpY;
          instance.element.style.transform = `translate(${x}px, ${y}px)`;
        } else {
          instance.element.style.transform = '';
        }
      },
      reset(instance) {
        instance.element.style.transform = '';
      },
    };
  },

  /**
   * Flicker Effect
   * Randomly toggles brightness, opacity, and visibility.
   */
  flicker(options: FlickerOptions = {}): GlitchEffect {
    const opts = {
      minOpacity: 0.2,
      frequency: 0.15,
      ...options,
    };

    return {
      name: 'flicker',
      update(instance) {
        if (Math.random() < opts.frequency) {
          const brightness = Math.random() * 1.5 + 0.5;
          const opacity = Math.random() * (1 - opts.minOpacity) + opts.minOpacity;

          instance.element.style.opacity = opacity.toString();
          instance.element.style.filter = `brightness(${brightness})`;
        } else {
          instance.element.style.opacity = '';
          instance.element.style.filter = '';
        }
      },
      reset(instance) {
        instance.element.style.opacity = '';
        instance.element.style.filter = '';
      },
    };
  },

  /**
   * Scanlines Effect
   * Adds an overlay with retro monitor CRT scanlines.
   */
  scanlines(options: ScanlinesOptions = {}): GlitchEffect {
    const opts = {
      opacity: 0.12,
      pulse: true,
      ...options,
    };

    return {
      name: 'scanlines',
      setup(instance) {
        const overlay = document.createElement('div');
        overlay.classList.add('glitch-overlay', 'scanlines-overlay');

        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '10000';
        overlay.style.boxSizing = 'border-box';
        overlay.style.background = `
          linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.45) 50%),
          linear-gradient(90deg, rgba(255, 0, 0, 0.04), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.04))
        `;
        overlay.style.backgroundSize = '100% 4px, 6px 100%';
        overlay.style.opacity = opts.opacity.toString();

        instance.element.appendChild(overlay);
        instance.overlays.scanlines = overlay;
      },
      update(instance, time) {
        if (opts.pulse && instance.overlays.scanlines) {
          const pulseVal = Math.sin(time / 150) * 0.04 + opts.opacity;
          instance.overlays.scanlines.style.opacity = pulseVal.toString();
        }
      },
      cleanup(instance) {
        if (instance.overlays.scanlines) {
          instance.overlays.scanlines.remove();
          delete instance.overlays.scanlines;
        }
      },
    };
  },
};
