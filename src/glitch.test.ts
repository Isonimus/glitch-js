import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Glitch, Effects } from './glitch.ts';

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
});
