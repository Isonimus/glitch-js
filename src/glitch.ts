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

export interface HologramOptions {
  color?: string;
  opacity?: number;
  glowIntensity?: number;
  scanSpeed?: number;
  flickerFrequency?: number;
  floatAmplitude?: number;
}

export type DecryptRevealOrder = 'forward' | 'random';

export interface DecryptOptions {
  characters?: string;
  duration?: number;
  rollInterval?: number;
  revealOrder?: DecryptRevealOrder;
  maskWhitespace?: boolean;
  /**
   * Declares that the target renders whitespace verbatim (`white-space: pre`,
   * `pre-wrap`, `break-spaces`, or a `<pre>` element), so `maskWhitespace` may
   * mask whitespace runs and indentation as well as single spaces. It is an
   * explicit option because the alternative is unverifiable: `getComputedStyle`
   * reports nothing usable under jsdom, so an inferred version of this could
   * not be tested. Leave it `false` for ordinary HTML, where layout collapses
   * that whitespace and masking it would change the rendered length.
   */
  preformatted?: boolean;
  onComplete?: () => void;
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

/**
 * A view over the text nodes an effect is allowed to rewrite, treated as one
 * logical string so that reveals and scrambles read continuously across inline
 * markup (e.g. a heading containing a <span>).
 */
export interface ManagedText {
  nodes: Text[];
  /** Original length of each node, used to split a transformed string back. */
  lengths: number[];
  /** Concatenation of every node's original text. */
  original: string;
}

/**
 * Original text keyed by node. A WeakMap keeps the DOM free of stashed custom
 * properties (which could only be read back through an `any` cast) and lets the
 * entries die with the nodes.
 */
const originalTextByNode = new WeakMap<Text, string>();

// Elements whose text is structural rather than rendered copy, or which belong
// to the effect machinery itself. Rewriting a <style> or <script> body would
// break the page, so text effects never descend into them.
const isTextEffectBoundary = (element: HTMLElement): boolean =>
  element.tagName === 'SCRIPT' ||
  element.tagName === 'STYLE' ||
  element.classList.contains('glitch-clone') ||
  element.classList.contains('glitch-overlay');

// Depth-first collection of rewritable text nodes. Document order matters: the
// same traversal over an element and over its clones yields aligned lists.
const collectTextNodes = (node: Node, collected: Text[] = []): Text[] => {
  if (node.nodeType === Node.TEXT_NODE) {
    collected.push(node as Text);
    return collected;
  }

  for (const child of Array.from(node.childNodes)) {
    if (child instanceof HTMLElement && isTextEffectBoundary(child)) continue;
    collectTextNodes(child, collected);
  }

  return collected;
};

// True for nodes whose text a running effect owns, so that the element's own
// MutationObserver can tell our writes apart from an external content change.
const isManagedTextNode = (node: Node): boolean =>
  node.nodeType === Node.TEXT_NODE && originalTextByNode.has(node as Text);

// True for the clones and overlays the library injects. characterData mutations
// report the Text node itself, so the nearest element is the one to inspect.
const isGlitchOwnedNode = (node: Node): boolean => {
  let current: Node | null = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;

  while (current) {
    if (current instanceof HTMLElement) {
      if (
        current.classList.contains('glitch-clone') ||
        current.classList.contains('glitch-overlay')
      ) {
        return true;
      }
    }
    current = current.parentNode;
  }

  return false;
};

// True when a mutation was caused by the library itself rather than by external
// code changing the element's content. Without this, our own bookkeeping --
// injecting clones, and rewriting the text nodes a running text effect owns --
// would rebuild every clone's markup, once per animation frame in the text case.
const isOwnMutation = (mutation: MutationRecord): boolean => {
  if (isGlitchOwnedNode(mutation.target)) return true;

  if (mutation.type === 'characterData') {
    return isManagedTextNode(mutation.target);
  }

  const changedNodes = [
    ...Array.from(mutation.addedNodes),
    ...Array.from(mutation.removedNodes),
  ];
  return changedNodes.length > 0 && changedNodes.every(isGlitchOwnedNode);
};

const randomChar = (characters: string): string =>
  characters[Math.floor(Math.random() * characters.length)];

// Mixed-case alphanumerics read as encrypted payload; the symbol-heavy pool used
// by `scramble` reads as corruption, which is a different effect.
const DECRYPT_CHARACTERS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

interface DecryptState {
  original: string;
  /** Positions eligible for masking, parallel to `original`. */
  isMaskable: boolean[];
  /** Positions already locked to their real character. */
  isLocked: boolean[];
  /** Maskable positions in the order they lock. */
  revealOrder: number[];
  /** Current rolling character per position; only read where unlocked. */
  rolledCharacters: string[];
  lockedCount: number;
  /** Timestamp of the first update after a reset, or -1 before it. */
  startTime: number;
  lastRollTime: number;
  isComplete: boolean;
}

/**
 * The characters HTML treats as document white space. A text node made only of
 * these is dropped entirely by flex and grid containers, and collapses to at
 * most a single space everywhere else. A non-breaking space is deliberately not
 * in the set: layout always paints it.
 */
const DOCUMENT_WHITESPACE_ONLY = /^[ \t\n\r\f]+$/;

const NON_BREAKING_SPACE = '\u00a0';

const isWhitespace = (char: string): boolean => /\s/.test(char);

/**
 * Whether a character may be replaced by a rolling one.
 *
 * Masking must not change what the browser paints: swapping a character layout
 * discards for one it renders makes the text longer on screen, which reflows
 * the element for the length of the reveal. Source indentation is the common
 * case -- 60% of the characters in a hand-indented terminal markup block are
 * collapsed whitespace, and in a flex row they are dropped outright, so masking
 * them turns a 32-character line into a 125-character one.
 *
 * A plain space is therefore masked only where layout is guaranteed to paint
 * it: as a single space between two non-whitespace characters, in a text node
 * that carries real copy. Whitespace runs, leading and trailing whitespace,
 * tabs and newlines are exactly the ones layout collapses, so they are left
 * alone. This costs the mask nothing on ordinary copy, where the spaces that
 * hide word boundaries are precisely the interior ones.
 */
/**
 * What the caller has told us about whitespace: whether to mask it at all, and
 * whether the target renders it verbatim (`white-space: pre` and friends).
 * The second one has to be declared rather than inferred -- see the note on
 * `preformatted` in `DecryptOptions`.
 */
interface WhitespaceMaskPolicy {
  maskWhitespace: boolean;
  preformatted: boolean;
}

const isMaskableCharacter = (
  original: string,
  index: number,
  nodeIsWhitespaceOnly: boolean,
  policy: WhitespaceMaskPolicy
): boolean => {
  const char = original[index];
  if (!isWhitespace(char)) return true;
  if (!policy.maskWhitespace) return false;

  // Always painted, never collapsed, and it keeps a flex or grid item alive.
  if (char === NON_BREAKING_SPACE) return true;

  // A tab advances to the next tab stop and a line break ends the line, so
  // neither is one character wide even where whitespace is preserved.
  if (char !== ' ') return false;

  // Dropped outright by a flex or grid container. Whether a preserved
  // `white-space` rescues such a node is not something the library can check,
  // so it stays out of the mask either way.
  if (nodeIsWhitespaceOnly) return false;

  // The author has declared that the target paints whitespace verbatim, which
  // is the one thing this rule cannot detect for itself.
  if (policy.preformatted) return true;

  const previous = original[index - 1];
  const next = original[index + 1];
  return (
    previous !== undefined &&
    next !== undefined &&
    !isWhitespace(previous) &&
    !isWhitespace(next)
  );
};

/**
 * Maskability per position. Built per text node, because whether a space is
 * rendered depends on whether its own node carries copy, while the neighbour
 * test spans the whole managed string so that a space at a node boundary
 * (`Hello <span>World</span>`) is judged by what it actually sits between.
 */
const buildMaskableFlags = (
  managed: ManagedText,
  policy: WhitespaceMaskPolicy
): boolean[] => {
  const { original, lengths } = managed;
  const flags = new Array<boolean>(original.length);
  let offset = 0;

  for (const length of lengths) {
    const nodeText = original.slice(offset, offset + length);
    const nodeIsWhitespaceOnly = DOCUMENT_WHITESPACE_ONLY.test(nodeText);

    for (let position = 0; position < length; position++) {
      const index = offset + position;
      flags[index] = isMaskableCharacter(original, index, nodeIsWhitespaceOnly, policy);
    }

    offset += length;
  }

  if (offset !== original.length) {
    throw new Error(
      `Glitch: managed text node lengths total ${offset} characters but the ` +
        `concatenated text is ${original.length} characters long.`
    );
  }

  return flags;
};

const createDecryptState = (
  managed: ManagedText,
  policy: WhitespaceMaskPolicy,
  revealOrder: DecryptRevealOrder
): DecryptState => {
  const { original } = managed;
  const isMaskable = buildMaskableFlags(managed, policy);
  const order: number[] = [];

  for (let index = 0; index < original.length; index++) {
    if (isMaskable[index]) order.push(index);
  }

  if (revealOrder === 'random') {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }

  return {
    original,
    isMaskable,
    isLocked: new Array<boolean>(original.length).fill(false),
    revealOrder: order,
    rolledCharacters: new Array<string>(original.length).fill(''),
    lockedCount: 0,
    startTime: -1,
    lastRollTime: -1,
    isComplete: false,
  };
};

const rollUnlockedCharacters = (state: DecryptState, characters: string): void => {
  for (let index = 0; index < state.original.length; index++) {
    if (state.isMaskable[index] && !state.isLocked[index]) {
      state.rolledCharacters[index] = randomChar(characters);
    }
  }
};

const renderDecryptState = (state: DecryptState): string => {
  let rendered = '';
  for (let index = 0; index < state.original.length; index++) {
    const showsPlaintext = state.isLocked[index] || !state.isMaskable[index];
    rendered += showsPlaintext ? state.original[index] : state.rolledCharacters[index];
  }
  return rendered;
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
      // Our own writes are mirrored into clones at write time, so only an
      // external content change needs a clone rebuild.
      const hasExternalMutation = mutations.some((m) => !isOwnMutation(m));
      if (!hasExternalMutation) return;

      // A wholesale content replacement (`element.innerHTML = ...`) takes the
      // injected clones and overlays with it. Syncing into nodes that are no
      // longer in the document would leave every clone- and overlay-based
      // effect rendering nothing, with no error to show for it.
      const isDetached = this.injectedNodes().some(
        (node) => node.parentNode !== this.element
      );
      if (isDetached) {
        this.reinjectEffectNodes();
      } else {
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

  /** The clones and effect overlays this instance injected into the element. */
  injectedNodes(): HTMLElement[] {
    return [...this.clones, ...Object.values(this.overlays)];
  }

  /**
   * Rebuilds the injected DOM after an external content replacement detached
   * it. The old nodes are removed and both records cleared first, which keeps
   * every effect's `setup` a create-only path: it can re-inject without
   * duplicating an overlay or leaking the node it replaces.
   */
  reinjectEffectNodes(): void {
    const previousCloneCount = this.clones.length;

    this.clones.forEach((clone) => clone.remove());
    this.clones = [];
    Object.values(this.overlays).forEach((overlay) => overlay.remove());
    this.overlays = {};

    for (const effect of this.options.effects) {
      if (effect.setup) {
        effect.setup(this);
      }
    }

    // Clones can also be created directly, without an effect owning them, in
    // which case no `setup` call brings them back.
    if (this.clones.length === 0 && previousCloneCount > 0) {
      this.createClones(previousCloneCount);
    }

    // `start()` is what normally reveals the clones, so a rebuild mid-run has
    // to do it here or the effect stays invisible until the next start.
    if (this.isRunning) {
      this.clones.forEach((clone) => {
        clone.style.display = 'block';
      });
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

  /**
   * Snapshots the text nodes a text effect may rewrite. The original text of
   * each node is captured the first time it is seen, so repeated reads always
   * describe the pristine content rather than whatever is currently displayed.
   */
  readManagedText(): ManagedText {
    const nodes = collectTextNodes(this.element);
    const lengths: number[] = [];
    let original = '';

    for (const node of nodes) {
      let nodeOriginal = originalTextByNode.get(node);
      if (nodeOriginal === undefined) {
        nodeOriginal = node.nodeValue || '';
        originalTextByNode.set(node, nodeOriginal);
      }
      lengths.push(nodeOriginal.length);
      original += nodeOriginal;
    }

    return { nodes, lengths, original };
  }

  /**
   * Writes a transformed version of the managed text back to the element and
   * mirrors it into the clones, so overlay ghosts never display plaintext that
   * the element itself is still hiding.
   *
   * `text` must match the managed original character for character in length --
   * the split back into nodes depends on it, and an effect producing a different
   * length is a bug rather than something to paper over.
   */
  writeManagedText(managed: ManagedText, text: string): void {
    if (text.length !== managed.original.length) {
      throw new Error(
        `Glitch: managed text write of ${text.length} characters does not match ` +
          `the original length of ${managed.original.length}.`
      );
    }

    const slices: string[] = [];
    let offset = 0;
    for (const length of managed.lengths) {
      slices.push(text.slice(offset, offset + length));
      offset += length;
    }

    managed.nodes.forEach((node, index) => {
      node.nodeValue = slices[index];
    });

    for (const clone of this.clones) {
      const cloneNodes = collectTextNodes(clone);
      if (cloneNodes.length !== managed.nodes.length) {
        // Structural drift means the index mapping is no longer trustworthy;
        // rebuild from the element instead of writing text to the wrong nodes.
        this.syncClones();
        continue;
      }
      cloneNodes.forEach((node, index) => {
        node.nodeValue = slices[index];
      });
    }
  }

  /** Restores the pristine text of every managed node, clones included. */
  restoreManagedText(): void {
    const managed = this.readManagedText();
    this.writeManagedText(managed, managed.original);
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

    this.restoreManagedText();

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
        const managed = instance.readManagedText();

        if (Math.random() >= opts.frequency) {
          instance.writeManagedText(managed, managed.original);
          return;
        }

        let scrambled = '';
        for (const char of managed.original) {
          const shouldScramble = !/\s/.test(char) && Math.random() < opts.scrambleChance;
          scrambled += shouldScramble ? randomChar(opts.characters) : char;
        }
        instance.writeManagedText(managed, scrambled);
      },
      reset(instance) {
        instance.restoreManagedText();
      },
    };
  },

  /**
   * Decrypt Reveal Effect
   * Replaces the text with a same-length string of rolling characters, then
   * locks them into place one position at a time until the real text is fully
   * revealed. Unlike the ambient effects, this one is a finite timeline: once
   * every position has locked it stops doing work, and `reset` (which `stop`
   * runs) rearms it so hover and click triggers replay the reveal.
   */
  decrypt(options: DecryptOptions = {}): GlitchEffect {
    const opts = {
      characters: DECRYPT_CHARACTERS,
      duration: 2000,
      rollInterval: 50,
      revealOrder: 'forward' as DecryptRevealOrder,
      maskWhitespace: true,
      preformatted: false,
      ...options,
    };

    // Keyed by instance rather than held in the closure so that one effect
    // object can be shared across several Glitch instances without their
    // reveals interfering.
    const stateByInstance = new WeakMap<Glitch, DecryptState>();

    return {
      name: 'decrypt',
      update(instance, time) {
        // Read before the completion check: comparing against the managed text
        // is how a finished reveal notices that the content was replaced, so
        // dynamic text gets revealed again rather than staying plaintext.
        const managed = instance.readManagedText();

        let state = stateByInstance.get(instance);
        if (!state || state.original !== managed.original) {
          state = createDecryptState(
            managed,
            { maskWhitespace: opts.maskWhitespace, preformatted: opts.preformatted },
            opts.revealOrder
          );
          stateByInstance.set(instance, state);
        }

        // The reveal is complete: leave the plaintext alone instead of
        // rewriting an identical string on every remaining frame.
        if (state.isComplete) return;

        if (state.startTime < 0) {
          state.startTime = time;
          state.lastRollTime = time;
          rollUnlockedCharacters(state, opts.characters);
        }

        const progress =
          opts.duration <= 0 ? 1 : Math.min(1, (time - state.startTime) / opts.duration);
        const targetLockedCount = Math.round(progress * state.revealOrder.length);
        while (state.lockedCount < targetLockedCount) {
          state.isLocked[state.revealOrder[state.lockedCount]] = true;
          state.lockedCount++;
        }

        if (time - state.lastRollTime >= opts.rollInterval) {
          state.lastRollTime = time;
          rollUnlockedCharacters(state, opts.characters);
        }

        instance.writeManagedText(managed, renderDecryptState(state));

        if (state.lockedCount >= state.revealOrder.length) {
          state.isComplete = true;
          opts.onComplete?.();
        }
      },
      reset(instance) {
        stateByInstance.delete(instance);
        instance.restoreManagedText();
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

  /**
   * Hologram Effect
   * Renders the element as a cinematic sci-fi projection: a semitransparent,
   * color-tinted layer with a sweeping interference band, faint holo banding,
   * gentle vertical hovering, and intermittent glitch flashes.
   */
  hologram(options: HologramOptions = {}): GlitchEffect {
    const opts = {
      color: '#00d9ff',
      opacity: 0.85,
      glowIntensity: 0.5,
      scanSpeed: 1,
      flickerFrequency: 0.08,
      floatAmplitude: 3,
      ...options,
    };

    return {
      name: 'hologram',
      setup(instance) {
        // Color tint + faint horizontal holo banding, blended over the element
        const tint = document.createElement('div');
        tint.classList.add('glitch-overlay', 'hologram-tint');
        tint.style.position = 'absolute';
        tint.style.top = '0';
        tint.style.left = '0';
        tint.style.width = '100%';
        tint.style.height = '100%';
        tint.style.pointerEvents = 'none';
        tint.style.zIndex = '9998';
        tint.style.boxSizing = 'border-box';
        tint.style.background = opts.color;
        tint.style.backgroundImage =
          'repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.06) 0px, rgba(255, 255, 255, 0.06) 1px, transparent 1px, transparent 3px)';
        tint.style.mixBlendMode = 'screen';
        tint.style.opacity = (opts.glowIntensity * 0.5).toString();
        tint.style.boxShadow = `0 0 ${12 * opts.glowIntensity}px ${opts.color}`;
        instance.element.appendChild(tint);
        instance.overlays.hologramTint = tint;

        // Bright sweeping interference band that scans vertically.
        // Wrapped in a clipped, full-size container so the band never spills
        // outside the element (the host itself stays un-clipped so effects like
        // rgbSplit/slice can still translate their clones beyond the bounds).
        const scanWrap = document.createElement('div');
        scanWrap.classList.add('glitch-overlay', 'hologram-scan');
        scanWrap.style.position = 'absolute';
        scanWrap.style.top = '0';
        scanWrap.style.left = '0';
        scanWrap.style.width = '100%';
        scanWrap.style.height = '100%';
        scanWrap.style.pointerEvents = 'none';
        scanWrap.style.overflow = 'hidden';
        scanWrap.style.zIndex = '9999';

        const scan = document.createElement('div');
        scan.classList.add('hologram-scan-band');
        scan.style.position = 'absolute';
        scan.style.left = '0';
        scan.style.top = '0';
        scan.style.width = '100%';
        scan.style.height = '14%';
        scan.style.background = `linear-gradient(transparent, ${opts.color}, transparent)`;
        scan.style.opacity = '0.25';
        scan.style.mixBlendMode = 'screen';
        scanWrap.appendChild(scan);

        instance.element.appendChild(scanWrap);
        instance.overlays.hologramScan = scanWrap;
      },
      update(instance, time) {
        // Gentle vertical hover using a smooth sine wave
        const float = Math.sin(time / 600) * opts.floatAmplitude;

        // Sweeping band loops from above the top to below the bottom (clipped
        // by its overflow-hidden wrapper).
        const sweep = (((time * 0.03 * opts.scanSpeed) % 130) + 130) % 130 - 15;
        const scanBand = instance.overlays.hologramScan?.firstElementChild as HTMLElement | null;
        if (scanBand) {
          scanBand.style.top = `${sweep}%`;
        }

        // Intermittent glitch flash: horizontal jump, skew, and dropout
        if (Math.random() < opts.flickerFrequency) {
          const jump = (Math.random() - 0.5) * 6;
          const skew = (Math.random() - 0.5) * 3;
          instance.element.style.transform = `translate(${jump}px, ${float}px) skewX(${skew}deg)`;
          instance.element.style.opacity = (opts.opacity * (Math.random() * 0.5 + 0.4)).toString();
          if (instance.overlays.hologramTint) {
            instance.overlays.hologramTint.style.transform = `translateX(${jump * 0.5}px)`;
          }
        } else {
          instance.element.style.transform = `translateY(${float}px)`;
          instance.element.style.opacity = opts.opacity.toString();
          if (instance.overlays.hologramTint) {
            instance.overlays.hologramTint.style.transform = '';
          }
        }
      },
      reset(instance) {
        instance.element.style.transform = '';
        instance.element.style.opacity = '';
        if (instance.overlays.hologramTint) {
          instance.overlays.hologramTint.style.transform = '';
        }
        const scanBand = instance.overlays.hologramScan?.firstElementChild as HTMLElement | null;
        if (scanBand) {
          scanBand.style.top = '0';
        }
      },
      cleanup(instance) {
        if (instance.overlays.hologramTint) {
          instance.overlays.hologramTint.remove();
          delete instance.overlays.hologramTint;
        }
        if (instance.overlays.hologramScan) {
          instance.overlays.hologramScan.remove();
          delete instance.overlays.hologramScan;
        }
      },
    };
  },
};
