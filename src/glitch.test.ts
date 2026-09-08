import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Glitch, Effects } from './glitch.ts';
import type { GlitchEffect } from './glitch.ts';

describe('Glitch.js Core Engine', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    container.id = 'test-container';
    container.style.position = 'static';
    container.innerHTML = '<span class="text-content">Cyberpunk</span>';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize and cache original styles', () => {
    const glitch = new Glitch(container, { active: false });
    expect(glitch.element).toBe(container);
    expect(glitch.originalStyles.position).toBe('static');
    expect(container.style.position).toBe('relative'); // should force relative
    glitch.destroy();
  });

  it('should create DOM clones when setup by an effect', () => {
    const glitch = new Glitch(container, {
      active: false,
      effects: [
        {
          name: 'test-effect',
          setup(instance) {
            instance.createClones(3);
          },
        },
      ],
    });

    expect(glitch.clones.length).toBe(3);
    const clonesInDom = container.querySelectorAll('.glitch-clone');
    expect(clonesInDom.length).toBe(3);
    glitch.destroy();
  });

  it('should trigger start and stop cycles correctly', () => {
    const glitch = new Glitch(container, {
      active: false,
      trigger: 'manual',
      effects: [
        {
          name: 'test-effect',
          setup(instance) {
            instance.createClones(1);
          },
        },
      ],
    });

    expect(glitch.isRunning).toBe(false);
    expect(glitch.clones[0].style.display).toBe('none');

    glitch.start();
    expect(glitch.isRunning).toBe(true);
    expect(glitch.clones[0].style.display).toBe('block');

    glitch.stop();
    expect(glitch.isRunning).toBe(false);
    expect(glitch.clones[0].style.display).toBe('none');
    glitch.destroy();
  });

  it('should bind hover event triggers', () => {
    const glitch = new Glitch(container, {
      active: true,
      trigger: 'hover',
    });

    expect(glitch.isRunning).toBe(false);

    // Simulate mouseenter
    const enterEvent = new MouseEvent('mouseenter');
    container.dispatchEvent(enterEvent);
    expect(glitch.isRunning).toBe(true);

    // Simulate mouseleave
    const leaveEvent = new MouseEvent('mouseleave');
    container.dispatchEvent(leaveEvent);
    expect(glitch.isRunning).toBe(false);

    glitch.destroy();
  });

  it('should bind click toggle trigger', () => {
    const glitch = new Glitch(container, {
      active: true,
      trigger: 'click',
    });

    expect(glitch.isRunning).toBe(false);

    // Click to start
    container.dispatchEvent(new MouseEvent('click'));
    expect(glitch.isRunning).toBe(true);

    // Click to stop
    container.dispatchEvent(new MouseEvent('click'));
    expect(glitch.isRunning).toBe(false);

    glitch.destroy();
  });

  it('should clean up and restore original styles on destroy', () => {
    const glitch = new Glitch(container, {
      active: true,
      trigger: 'always',
      effects: [
        {
          name: 'dummy-effect',
          setup(instance) {
            instance.createClones(2);
          },
        },
      ],
    });

    expect(container.querySelectorAll('.glitch-clone').length).toBe(2);
    expect(container.style.position).toBe('relative');

    glitch.destroy();

    // Verify all clones are removed
    expect(container.querySelectorAll('.glitch-clone').length).toBe(0);
    // Position style should be restored to static
    expect(container.style.position).toBe('static');
  });

  it('should call registered effects hooks during runtime', () => {
    const setupSpy = vi.fn();
    const updateSpy = vi.fn();
    const resetSpy = vi.fn();
    const cleanupSpy = vi.fn();

    const customEffect = {
      name: 'custom',
      setup: setupSpy,
      update: updateSpy,
      reset: resetSpy,
      cleanup: cleanupSpy,
    };

    // Store callbacks scheduled via requestAnimationFrame
    const scheduledCallbacks: Function[] = [];
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      scheduledCallbacks.push(cb);
      return scheduledCallbacks.length;
    });

    const glitch = new Glitch(container, {
      active: true,
      trigger: 'always',
      effects: [customEffect],
    });

    expect(setupSpy).toHaveBeenCalledTimes(1);

    // Manually trigger the scheduled loop callback
    if (scheduledCallbacks.length > 0) {
      const cb = scheduledCallbacks.shift();
      if (cb) cb(100);
    }
    
    expect(updateSpy).toHaveBeenCalled();

    glitch.stop();
    expect(resetSpy).toHaveBeenCalledTimes(1);

    glitch.destroy();
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
    rafSpy.mockRestore();
  });
});

describe('Glitch.js Built-in Effects factories', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should create rgbSplit effect structure', () => {
    const fx = Effects.rgbSplit();
    expect(fx.name).toBe('rgbSplit');
    expect(typeof fx.setup).toBe('function');
    expect(typeof fx.update).toBe('function');
  });

  it('should create slice effect structure', () => {
    const fx = Effects.slice();
    expect(fx.name).toBe('slice');
    expect(typeof fx.setup).toBe('function');
    expect(typeof fx.update).toBe('function');
  });

  it('should create scramble effect structure', () => {
    const fx = Effects.scramble();
    expect(fx.name).toBe('scramble');
    expect(typeof fx.update).toBe('function');
  });

  it('should create shake effect structure', () => {
    const fx = Effects.shake();
    expect(fx.name).toBe('shake');
    expect(typeof fx.update).toBe('function');
  });

  it('should create flicker effect structure', () => {
    const fx = Effects.flicker();
    expect(fx.name).toBe('flicker');
    expect(typeof fx.update).toBe('function');
  });

  it('should create scanlines effect structure', () => {
    const fx = Effects.scanlines();
    expect(fx.name).toBe('scanlines');
    expect(typeof fx.setup).toBe('function');
    expect(typeof fx.cleanup).toBe('function');
  });

  it('should create hologram effect structure', () => {
    const fx = Effects.hologram();
    expect(fx.name).toBe('hologram');
    expect(typeof fx.setup).toBe('function');
    expect(typeof fx.update).toBe('function');
    expect(typeof fx.cleanup).toBe('function');
  });

  it('should inject and clean up hologram overlays with a configurable color', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const glitch = new Glitch(container, {
      effects: [Effects.hologram({ color: 'rgb(255, 0, 128)', opacity: 0.7 })],
    });

    const tint = container.querySelector('.hologram-tint') as HTMLElement;
    const scan = container.querySelector('.hologram-scan') as HTMLElement;
    expect(tint).not.toBeNull();
    expect(scan).not.toBeNull();
    expect(tint.style.background).toContain('rgb(255, 0, 128)');

    glitch.destroy();
    expect(container.querySelector('.hologram-tint')).toBeNull();
    expect(container.querySelector('.hologram-scan')).toBeNull();

    container.remove();
  });
});

describe('Glitch.js managed text', () => {
  let container: HTMLDivElement;
  let rafSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    // Keep the animation loop from advancing on its own so that effects can be
    // driven with explicit timestamps.
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
  });

  afterEach(() => {
    rafSpy.mockRestore();
    container.remove();
  });

  it('should read text across inline markup as one logical string', () => {
    container.innerHTML = 'Neo <span>Tokyo</span>';
    const glitch = new Glitch(container, { active: false, trigger: 'manual' });

    const managed = glitch.readManagedText();
    expect(managed.original).toBe('Neo Tokyo');
    expect(managed.nodes.length).toBe(2);
    expect(managed.lengths).toEqual([4, 5]);

    glitch.destroy();
  });

  it('should split a transformed string back across the original nodes', () => {
    container.innerHTML = 'Neo <span>Tokyo</span>';
    const glitch = new Glitch(container, { active: false, trigger: 'manual' });

    const managed = glitch.readManagedText();
    glitch.writeManagedText(managed, '#########');

    expect(container.textContent).toBe('#########');
    expect(managed.nodes[0].nodeValue).toBe('####');
    expect(managed.nodes[1].nodeValue).toBe('#####');

    glitch.restoreManagedText();
    expect(container.textContent).toBe('Neo Tokyo');

    glitch.destroy();
  });

  it('should reject a managed text write of the wrong length', () => {
    container.innerHTML = 'Cyberpunk';
    const glitch = new Glitch(container, { active: false, trigger: 'manual' });

    const managed = glitch.readManagedText();
    expect(() => glitch.writeManagedText(managed, 'short')).toThrow(/does not match/);

    glitch.destroy();
  });

  it('should never rewrite the text of script or style elements', () => {
    container.innerHTML = '<style>.a{color:red}</style>Cyberpunk';
    const glitch = new Glitch(container, { active: false, trigger: 'manual' });

    const managed = glitch.readManagedText();
    expect(managed.original).toBe('Cyberpunk');

    glitch.writeManagedText(managed, '#########');
    expect(container.querySelector('style')?.textContent).toBe('.a{color:red}');

    glitch.destroy();
  });

  it('should mirror text into clones without rebuilding their markup', async () => {
    container.innerHTML = 'Cyberpunk';
    const glitch = new Glitch(container, { active: false, trigger: 'manual' });
    glitch.createClones(1);

    const clone = glitch.clones[0];
    const cloneTextNodeBefore = clone.firstChild;
    const syncSpy = vi.spyOn(glitch, 'syncClones');

    const managed = glitch.readManagedText();
    glitch.writeManagedText(managed, '#########');

    // Let any MutationObserver records queued by our own write be delivered.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(clone.textContent).toBe('#########');
    // A rebuild would replace the clone's text node and lose its identity.
    expect(clone.firstChild).toBe(cloneTextNodeBefore);
    expect(syncSpy).not.toHaveBeenCalled();

    syncSpy.mockRestore();
    glitch.destroy();
  });

  it('should update the clones when the content changes externally', async () => {
    container.innerHTML = 'Cyberpunk';
    const glitch = new Glitch(container, { active: false, trigger: 'manual' });
    glitch.createClones(1);
    const clone = glitch.clones[0];

    // A change that leaves the injected clone in place: the paragraph is added
    // next to it rather than replacing the element's contents.
    container.appendChild(document.createElement('p')).textContent = 'Neo Tokyo';

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(glitch.clones[0]).toBe(clone);
    expect(clone.textContent).toContain('Neo Tokyo');

    glitch.destroy();
  });

  it('should rebuild the clones an external content replacement detached', async () => {
    container.innerHTML = 'Cyberpunk';
    const glitch = new Glitch(container, { active: false, trigger: 'manual' });
    glitch.createClones(1);

    // Assigning innerHTML removes the injected clone along with the content.
    container.innerHTML = 'Neo Tokyo';
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Re-syncing the detached node instead would leave the instance tracking a
    // clone that is no longer in the document, so the effect renders nothing.
    expect(container.querySelectorAll('.glitch-clone').length).toBe(1);
    expect(glitch.clones.length).toBe(1);
    expect(glitch.clones[0].parentNode).toBe(container);
    expect(glitch.clones[0].textContent).toBe('Neo Tokyo');

    glitch.destroy();
  });

  it('should restore effect styling and overlays after a content replacement', async () => {
    container.innerHTML = 'Cyberpunk';
    const glitch = new Glitch(container, {
      active: false,
      trigger: 'manual',
      effects: [Effects.rgbSplit(), Effects.scanlines()],
    });
    glitch.start();
    expect(container.querySelectorAll('.glitch-overlay').length).toBe(1);

    container.innerHTML = 'Neo Tokyo';
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(container.querySelectorAll('.glitch-clone').length).toBe(2);
    expect(container.querySelectorAll('.glitch-overlay').length).toBe(1);
    expect(glitch.overlays.scanlines.parentNode).toBe(container);
    // rgbSplit tints through per-clone filters applied once in setup, so a
    // rebuild that skipped setup would paint plain grey ghosts instead.
    expect(glitch.clones[0].style.filter).toBe('url(#glitch-filter-red)');
    expect(glitch.clones[1].style.filter).toBe('url(#glitch-filter-cyan)');
    // start() is what reveals the clones, so a mid-run rebuild must show them.
    expect(glitch.clones.every((clone) => clone.style.display === 'block')).toBe(true);

    glitch.destroy();
  });
});

describe('Glitch.js decrypt effect', () => {
  let container: HTMLDivElement;
  let rafSpy: ReturnType<typeof vi.spyOn>;

  // A single-character pool makes every masked position deterministic, so the
  // assertions describe the reveal timeline rather than a random draw.
  const MASK = '#';

  const driveUpdate = (effect: GlitchEffect, glitch: Glitch, time: number): void => {
    if (!effect.update) throw new Error('decrypt effect must expose an update hook');
    effect.update(glitch, time);
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
  });

  afterEach(() => {
    rafSpy.mockRestore();
    container.remove();
  });

  it('should create decrypt effect structure', () => {
    const fx = Effects.decrypt();
    expect(fx.name).toBe('decrypt');
    expect(typeof fx.update).toBe('function');
    expect(typeof fx.reset).toBe('function');
  });

  it('should mask the whole text before any position locks', () => {
    container.innerHTML = 'Cyberpunk';
    const fx = Effects.decrypt({ characters: MASK, duration: 900, rollInterval: 0 });
    const glitch = new Glitch(container, { active: false, trigger: 'manual', effects: [fx] });

    driveUpdate(fx, glitch, 0);

    expect(container.textContent).toBe('#########');
    glitch.destroy();
  });

  it('should lock characters left to right as the timeline advances', () => {
    container.innerHTML = 'Cyberpunk';
    const fx = Effects.decrypt({
      characters: MASK,
      duration: 900,
      rollInterval: 0,
      revealOrder: 'forward',
    });
    const glitch = new Glitch(container, { active: false, trigger: 'manual', effects: [fx] });

    driveUpdate(fx, glitch, 0);
    driveUpdate(fx, glitch, 300);
    expect(container.textContent).toBe('Cyb######');

    driveUpdate(fx, glitch, 600);
    expect(container.textContent).toBe('Cyberp###');

    glitch.destroy();
  });

  it('should reveal the exact original text once and then stop working', () => {
    container.innerHTML = 'Cyberpunk';
    const onComplete = vi.fn();
    const fx = Effects.decrypt({
      characters: MASK,
      duration: 900,
      rollInterval: 0,
      onComplete,
    });
    const glitch = new Glitch(container, { active: false, trigger: 'manual', effects: [fx] });

    driveUpdate(fx, glitch, 0);
    driveUpdate(fx, glitch, 900);

    expect(container.textContent).toBe('Cyberpunk');
    expect(onComplete).toHaveBeenCalledTimes(1);

    driveUpdate(fx, glitch, 1500);
    expect(container.textContent).toBe('Cyberpunk');
    expect(onComplete).toHaveBeenCalledTimes(1);

    glitch.destroy();
  });

  it('should mask inline spaces by default and preserve them when asked', () => {
    container.innerHTML = 'Neo Tokyo';
    const masked = Effects.decrypt({ characters: MASK, duration: 900, rollInterval: 0 });
    const glitch = new Glitch(container, { active: false, trigger: 'manual', effects: [masked] });

    driveUpdate(masked, glitch, 0);
    expect(container.textContent).toBe('#########');
    glitch.destroy();

    const preserved = Effects.decrypt({
      characters: MASK,
      duration: 900,
      rollInterval: 0,
      maskWhitespace: false,
    });
    const second = new Glitch(container, {
      active: false,
      trigger: 'manual',
      effects: [preserved],
    });

    driveUpdate(preserved, second, 0);
    expect(container.textContent).toBe('### #####');
    second.destroy();
  });

  it('should never mask line breaks or tabs, which carry layout', () => {
    container.innerHTML = 'Neo\n\tTokyo';
    const fx = Effects.decrypt({
      characters: MASK,
      duration: 900,
      rollInterval: 0,
      maskWhitespace: true,
    });
    const glitch = new Glitch(container, { active: false, trigger: 'manual', effects: [fx] });

    driveUpdate(fx, glitch, 0);

    expect(container.textContent).toBe('###\n\t#####');
    glitch.destroy();
  });

  // CSS collapses every run of white space to a single space and trims it at
  // the edges of a block, so this is the length the browser actually paints.
  const renderedLength = (text: string): number => text.replace(/\s+/g, ' ').trim().length;

  it('should not change the rendered length of indented markup', () => {
    container.innerHTML =
      '<div class="header">\n' +
      '  <span class="dot"></span>\n' +
      '  <span class="title">DECRYPT_STREAM</span>\n' +
      '</div>\n' +
      '<div class="line">> ACCESS DENIED</div>';
    const original = container.textContent ?? '';

    const fx = Effects.decrypt({ characters: MASK, duration: 900, rollInterval: 0 });
    const glitch = new Glitch(container, { active: false, trigger: 'manual', effects: [fx] });

    // The invariant has to hold at every step, not just at the end: masking
    // source indentation paints characters the browser otherwise collapses,
    // lengthening the first line and adding line boxes of its own. A forward
    // reveal re-locks the leading indentation early, so a mid-reveal check
    // alone would miss it.
    for (const time of [0, 225, 450, 675, 900]) {
      driveUpdate(fx, glitch, time);
      expect(renderedLength(container.textContent ?? '')).toBe(renderedLength(original));
    }

    glitch.destroy();
  });

  it('should leave whitespace-only text nodes untouched', () => {
    container.innerHTML = '<span>ONE</span>\n  <span>TWO</span>';
    const spacer = container.childNodes[1] as Text;
    expect(spacer.textContent).toBe('\n  ');

    const fx = Effects.decrypt({ characters: MASK, duration: 900, rollInterval: 0 });
    const glitch = new Glitch(container, { active: false, trigger: 'manual', effects: [fx] });

    driveUpdate(fx, glitch, 0);

    // A whitespace-only node is dropped outright by a flex or grid parent, so
    // masking it would add an item that was not there.
    expect(spacer.textContent).toBe('\n  ');
    expect(container.textContent).toBe('###\n  ###');
    glitch.destroy();
  });

  it('should mask whitespace runs only when told the target is preformatted', () => {
    container.innerHTML = '  AB   CD';

    // Collapsing layout renders neither the leading pair nor the interior run
    // as three spaces, so masking them would lengthen the line.
    const collapsing = Effects.decrypt({ characters: MASK, duration: 900, rollInterval: 0 });
    const first = new Glitch(container, {
      active: false,
      trigger: 'manual',
      effects: [collapsing],
    });
    driveUpdate(collapsing, first, 0);
    expect(container.textContent).toBe('  ##   ##');
    first.destroy();

    // Declared preformatted: every space is painted, so all of it can mask.
    const preformatted = Effects.decrypt({
      characters: MASK,
      duration: 900,
      rollInterval: 0,
      preformatted: true,
    });
    const second = new Glitch(container, {
      active: false,
      trigger: 'manual',
      effects: [preformatted],
    });
    driveUpdate(preformatted, second, 0);
    expect(container.textContent).toBe('#########');
    second.destroy();
  });

  it('should keep tabs, line breaks and whitespace-only nodes out of a preformatted mask', () => {
    container.innerHTML = 'AB\t\nCD<span>ONE</span>\n  <span>TWO</span>';
    const fx = Effects.decrypt({
      characters: MASK,
      duration: 900,
      rollInterval: 0,
      preformatted: true,
    });
    const glitch = new Glitch(container, { active: false, trigger: 'manual', effects: [fx] });

    driveUpdate(fx, glitch, 0);

    // A tab advances to a tab stop and a line break ends the line, so neither
    // is one character wide; a whitespace-only node is dropped by flex layout.
    expect(container.textContent).toBe('##\t\n#####\n  ###');
    glitch.destroy();
  });

  it('should mask non-breaking spaces, which layout always paints', () => {
    container.innerHTML = 'AB\u00a0\u00a0CD';
    const fx = Effects.decrypt({ characters: MASK, duration: 900, rollInterval: 0 });
    const glitch = new Glitch(container, { active: false, trigger: 'manual', effects: [fx] });

    driveUpdate(fx, glitch, 0);
    expect(container.textContent).toBe('######');
    glitch.destroy();

    const preserved = Effects.decrypt({
      characters: MASK,
      duration: 900,
      rollInterval: 0,
      maskWhitespace: false,
    });
    const second = new Glitch(container, {
      active: false,
      trigger: 'manual',
      effects: [preserved],
    });

    driveUpdate(preserved, second, 0);
    expect(container.textContent).toBe('##\u00a0\u00a0##');
    second.destroy();
  });

  it('should reveal continuously across inline markup', () => {
    container.innerHTML = 'Neo <span>Tokyo</span>';
    const fx = Effects.decrypt({
      characters: MASK,
      duration: 900,
      rollInterval: 0,
      revealOrder: 'forward',
    });
    const glitch = new Glitch(container, { active: false, trigger: 'manual', effects: [fx] });

    driveUpdate(fx, glitch, 0);
    driveUpdate(fx, glitch, 600);

    // Six locked positions run past the element boundary into the span.
    expect(container.textContent).toBe('Neo To###');
    expect(container.querySelector('span')?.textContent).toBe('To###');

    glitch.destroy();
  });

  it('should restore the text and rearm the reveal on reset', () => {
    container.innerHTML = 'Cyberpunk';
    const fx = Effects.decrypt({ characters: MASK, duration: 900, rollInterval: 0 });
    const glitch = new Glitch(container, { active: false, trigger: 'manual', effects: [fx] });

    driveUpdate(fx, glitch, 0);
    driveUpdate(fx, glitch, 300);
    expect(container.textContent).toBe('Cyb######');

    if (!fx.reset) throw new Error('decrypt effect must expose a reset hook');
    fx.reset(glitch);
    expect(container.textContent).toBe('Cyberpunk');

    // A replay starts from a fully masked string rather than resuming.
    driveUpdate(fx, glitch, 5000);
    expect(container.textContent).toBe('#########');

    glitch.destroy();
  });

  it('should restore the plaintext when the instance stops', () => {
    container.innerHTML = 'Cyberpunk';
    const fx = Effects.decrypt({ characters: MASK, duration: 900, rollInterval: 0 });
    const glitch = new Glitch(container, { active: false, trigger: 'manual', effects: [fx] });

    glitch.start();
    driveUpdate(fx, glitch, 0);
    expect(container.textContent).toBe('#########');

    glitch.stop();
    expect(container.textContent).toBe('Cyberpunk');

    glitch.destroy();
  });

  it('should reveal again when the content is replaced after completing', () => {
    container.innerHTML = 'Cyberpunk';
    const fx = Effects.decrypt({ characters: MASK, duration: 900, rollInterval: 0 });
    const glitch = new Glitch(container, { active: false, trigger: 'manual', effects: [fx] });

    driveUpdate(fx, glitch, 0);
    driveUpdate(fx, glitch, 900);
    expect(container.textContent).toBe('Cyberpunk');

    container.innerHTML = 'Neo Tokyo';
    driveUpdate(fx, glitch, 1000);

    expect(container.textContent).toBe('#########');

    glitch.destroy();
  });

  it('should draw masked characters from the configured pool', () => {
    container.innerHTML = 'Cyberpunk';
    const pool = '01';
    const fx = Effects.decrypt({ characters: pool, duration: 900, rollInterval: 0 });
    const glitch = new Glitch(container, { active: false, trigger: 'manual', effects: [fx] });

    driveUpdate(fx, glitch, 0);

    const rendered = container.textContent || '';
    expect(rendered.length).toBe('Cyberpunk'.length);
    expect([...rendered].every((char) => pool.includes(char))).toBe(true);

    glitch.destroy();
  });
});
