import { Glitch, Effects } from './glitch.ts';

// State Variables
let currentTab: 'terminal' | 'button' | 'portrait' | 'banner' = 'terminal';
let currentPreset = 'matrix';
let glitchController: Glitch | null = null;

interface Elements {
  triggerMode: HTMLSelectElement;
  engineActive: HTMLInputElement;
  statusBadge: HTMLElement;
  activeTargetLabel: HTMLElement;
  btnManualTrigger: HTMLButtonElement;
  btnTogglePlay: HTMLButtonElement;
  btnCopyCode: HTMLButtonElement;
  codeSnippetOutput: HTMLElement;
  form: HTMLFormElement;

  // Tab Buttons
  tabs: NodeListOf<HTMLButtonElement>;

  // Preset Buttons
  presets: NodeListOf<HTMLButtonElement>;

  // Glitch Target Elements
  targets: {
    terminal: HTMLElement;
    button: HTMLElement;
    portrait: HTMLElement;
    banner: HTMLElement;
  };

  // Effect Checkboxes
  enableRgb: HTMLInputElement;
  enableSlice: HTMLInputElement;
  enableScramble: HTMLInputElement;
  enableShake: HTMLInputElement;
  enableFlicker: HTMLInputElement;
  enableScanlines: HTMLInputElement;

  // Effect Slider Configurations
  rgbOffset: HTMLInputElement;
  rgbFreq: HTMLInputElement;
  rgbBlend: HTMLSelectElement;
  rgbMouseInteract: HTMLInputElement;
  rgbMouseSens: HTMLInputElement;

  sliceOffset: HTMLInputElement;
  sliceFreq: HTMLInputElement;
  sliceMouseInteract: HTMLInputElement;
  sliceMouseSens: HTMLInputElement;

  scrambleFreq: HTMLInputElement;
  scrambleChance: HTMLInputElement;

  shakeX: HTMLInputElement;
  shakeY: HTMLInputElement;
  shakeFreq: HTMLInputElement;
  shakeMouseInteract: HTMLInputElement;
  shakeMouseSens: HTMLInputElement;

  flickerOpac: HTMLInputElement;
  flickerFreq: HTMLInputElement;

  scanlineOpac: HTMLInputElement;
  scanlinePulse: HTMLInputElement;

  // Control Group Panels
  groups: Record<string, HTMLElement>;
}

// DOM Elements Mapping
const elements: Elements = {
  triggerMode: document.getElementById('trigger-mode') as HTMLSelectElement,
  engineActive: document.getElementById('engine-active') as HTMLInputElement,
  statusBadge: document.getElementById('system-status') as HTMLElement,
  activeTargetLabel: document.getElementById('active-target-label') as HTMLElement,
  btnManualTrigger: document.getElementById('btn-manual-trigger') as HTMLButtonElement,
  btnTogglePlay: document.getElementById('btn-toggle-play') as HTMLButtonElement,
  btnCopyCode: document.getElementById('btn-copy-code') as HTMLButtonElement,
  codeSnippetOutput: document.getElementById('code-snippet-output') as HTMLElement,
  form: document.getElementById('glitch-config-form') as HTMLFormElement,

  tabs: document.querySelectorAll('.tab-btn'),
  presets: document.querySelectorAll('.preset-btn'),

  targets: {
    terminal: document.getElementById('glitch-target-terminal') as HTMLElement,
    button: document.getElementById('glitch-target-button') as HTMLElement,
    portrait: document.getElementById('glitch-target-portrait') as HTMLElement,
    banner: document.getElementById('glitch-target-banner') as HTMLElement,
  },

  enableRgb: document.getElementById('toggle-rgbSplit') as HTMLInputElement,
  enableSlice: document.getElementById('toggle-slice') as HTMLInputElement,
  enableScramble: document.getElementById('toggle-scramble') as HTMLInputElement,
  enableShake: document.getElementById('toggle-shake') as HTMLInputElement,
  enableFlicker: document.getElementById('toggle-flicker') as HTMLInputElement,
  enableScanlines: document.getElementById('toggle-scanlines') as HTMLInputElement,

  rgbOffset: document.getElementById('rgb-offset') as HTMLInputElement,
  rgbFreq: document.getElementById('rgb-freq') as HTMLInputElement,
  rgbBlend: document.getElementById('rgb-blend') as HTMLSelectElement,
  rgbMouseInteract: document.getElementById('rgb-mouseInteract') as HTMLInputElement,
  rgbMouseSens: document.getElementById('rgb-mouseSens') as HTMLInputElement,

  sliceOffset: document.getElementById('slice-offset') as HTMLInputElement,
  sliceFreq: document.getElementById('slice-freq') as HTMLInputElement,
  sliceMouseInteract: document.getElementById('slice-mouseInteract') as HTMLInputElement,
  sliceMouseSens: document.getElementById('slice-mouseSens') as HTMLInputElement,

  scrambleFreq: document.getElementById('scramble-freq') as HTMLInputElement,
  scrambleChance: document.getElementById('scramble-chance') as HTMLInputElement,

  shakeX: document.getElementById('shake-x') as HTMLInputElement,
  shakeY: document.getElementById('shake-y') as HTMLInputElement,
  shakeFreq: document.getElementById('shake-freq') as HTMLInputElement,
  shakeMouseInteract: document.getElementById('shake-mouseInteract') as HTMLInputElement,
  shakeMouseSens: document.getElementById('shake-mouseSens') as HTMLInputElement,

  flickerOpac: document.getElementById('flicker-opac') as HTMLInputElement,
  flickerFreq: document.getElementById('flicker-freq') as HTMLInputElement,

  scanlineOpac: document.getElementById('scanline-opac') as HTMLInputElement,
  scanlinePulse: document.getElementById('scanline-pulse') as HTMLInputElement,

  groups: {
    rgbSplit: document.getElementById('group-rgbSplit') as HTMLElement,
    slice: document.getElementById('group-slice') as HTMLElement,
    scramble: document.getElementById('group-scramble') as HTMLElement,
    shake: document.getElementById('group-shake') as HTMLElement,
    flicker: document.getElementById('group-flicker') as HTMLElement,
    scanlines: document.getElementById('group-scanlines') as HTMLElement,
  },
};

interface Preset {
  trigger: string;
  rgb: { active: boolean; offset: number; freq: number; blend: string; mouseInteract: boolean; mouseSens: number };
  slice: { active: boolean; offset: number; freq: number; mouseInteract: boolean; mouseSens: number };
  scramble: { active: boolean; freq: number; chance: number };
  shake: { active: boolean; x: number; y: number; freq: number; mouseInteract: boolean; mouseSens: number };
  flicker: { active: boolean; opac: number; freq: number };
  scanlines: { active: boolean; opac: number; pulse: boolean };
}

// Preset Data Store
const presetsData: Record<string, Preset> = {
  matrix: {
    trigger: 'always',
    rgb: { active: true, offset: 3, freq: 0.2, blend: 'screen', mouseInteract: false, mouseSens: 1.5 },
    slice: { active: false, offset: 15, freq: 0.25, mouseInteract: false, mouseSens: 1.5 },
    scramble: { active: true, freq: 0.5, chance: 0.6 },
    shake: { active: false, x: 6, y: 4, freq: 0.4, mouseInteract: false, mouseSens: 1.5 },
    flicker: { active: false, opac: 0.2, freq: 0.15 },
    scanlines: { active: true, opac: 0.2, pulse: true },
  },
  holo: {
    trigger: 'always',
    rgb: { active: true, offset: 10, freq: 0.35, blend: 'screen', mouseInteract: true, mouseSens: 2.0 },
    slice: { active: true, offset: 20, freq: 0.25, mouseInteract: true, mouseSens: 1.8 },
    scramble: { active: false, freq: 0.2, chance: 0.25 },
    shake: { active: true, x: 6, y: 3, freq: 0.3, mouseInteract: true, mouseSens: 1.5 },
    flicker: { active: true, opac: 0.4, freq: 0.25 },
    scanlines: { active: false, opac: 0.12, pulse: true },
  },
  failure: {
    trigger: 'always',
    rgb: { active: false, offset: 8, freq: 0.3, blend: 'screen', mouseInteract: false, mouseSens: 1.5 },
    slice: { active: false, offset: 15, freq: 0.25, mouseInteract: false, mouseSens: 1.5 },
    scramble: { active: true, freq: 0.1, chance: 0.1 },
    shake: { active: true, x: 4, y: 2, freq: 0.2, mouseInteract: false, mouseSens: 1.5 },
    flicker: { active: true, opac: 0.05, freq: 0.45 },
    scanlines: { active: true, opac: 0.15, pulse: true },
  },
  subtle: {
    trigger: 'hover',
    rgb: { active: true, offset: 3, freq: 0.15, blend: 'screen', mouseInteract: true, mouseSens: 2.5 },
    slice: { active: false, offset: 15, freq: 0.25, mouseInteract: false, mouseSens: 1.5 },
    scramble: { active: false, freq: 0.2, chance: 0.25 },
    shake: { active: false, x: 6, y: 4, freq: 0.4, mouseInteract: false, mouseSens: 1.5 },
    flicker: { active: false, opac: 0.2, freq: 0.15 },
    scanlines: { active: false, opac: 0.12, pulse: true },
  },
};

// Helper: Apply preset values to Form Controls
const applyPresetToUI = (presetKey: string): void => {
  const p = presetsData[presetKey];
  if (!p) return;

  elements.triggerMode.value = p.trigger;

  // RGB Split
  elements.enableRgb.checked = p.rgb.active;
  elements.rgbOffset.value = p.rgb.offset.toString();
  elements.rgbFreq.value = p.rgb.freq.toString();
  elements.rgbBlend.value = p.rgb.blend;
  elements.rgbMouseInteract.checked = p.rgb.mouseInteract;
  elements.rgbMouseSens.value = p.rgb.mouseSens.toString();

  // Slice
  elements.enableSlice.checked = p.slice.active;
  elements.sliceOffset.value = p.slice.offset.toString();
  elements.sliceFreq.value = p.slice.freq.toString();
  elements.sliceMouseInteract.checked = p.slice.mouseInteract;
  elements.sliceMouseSens.value = p.slice.mouseSens.toString();

  // Scramble
  elements.enableScramble.checked = p.scramble.active;
  elements.scrambleFreq.value = p.scramble.freq.toString();
  elements.scrambleChance.value = (p.scramble.chance * (p.scramble.chance <= 1 ? 100 : 1)).toString();

  // Shake
  elements.enableShake.checked = p.shake.active;
  elements.shakeX.value = p.shake.x.toString();
  elements.shakeY.value = p.shake.y.toString();
  elements.shakeFreq.value = p.shake.freq.toString();
  elements.shakeMouseInteract.checked = p.shake.mouseInteract;
  elements.shakeMouseSens.value = p.shake.mouseSens.toString();

  // Flicker
  elements.enableFlicker.checked = p.flicker.active;
  elements.flickerOpac.value = p.flicker.opac.toString();
  elements.flickerFreq.value = p.flicker.freq.toString();

  // Scanlines
  elements.enableScanlines.checked = p.scanlines.active;
  elements.scanlineOpac.value = p.scanlines.opac.toString();
  elements.scanlinePulse.checked = p.scanlines.pulse;

  // Show/hide sensitivity sliders
  const rgbSensCont = document.getElementById('rgb-mouseSens-container');
  if (rgbSensCont) rgbSensCont.style.display = p.rgb.mouseInteract ? 'block' : 'none';

  const sliceSensCont = document.getElementById('slice-mouseSens-container');
  if (sliceSensCont) sliceSensCont.style.display = p.slice.mouseInteract ? 'block' : 'none';

  const shakeSensCont = document.getElementById('shake-mouseSens-container');
  if (shakeSensCont) shakeSensCont.style.display = p.shake.mouseInteract ? 'block' : 'none';

  // Update control group visual active states
  Object.keys(elements.groups).forEach((key) => {
    const toggle = document.getElementById(`toggle-${key}`) as HTMLInputElement;
    if (toggle && toggle.checked) {
      elements.groups[key].classList.add('active');
    } else {
      elements.groups[key].classList.remove('active');
    }
  });

  updateUIValues();
  updateGlitchInstance();
};

// Helper: Update numeric display values on sliders
const updateUIValues = (): void => {
  const valRgbOffset = document.getElementById('val-rgb-offset');
  if (valRgbOffset) valRgbOffset.textContent = `${elements.rgbOffset.value}px`;

  const valRgbFreq = document.getElementById('val-rgb-freq');
  if (valRgbFreq) valRgbFreq.textContent = parseFloat(elements.rgbFreq.value).toFixed(2);

  const valRgbSens = document.getElementById('val-rgb-mouseSens');
  if (valRgbSens) valRgbSens.textContent = parseFloat(elements.rgbMouseSens.value).toFixed(1);

  const valSliceOffset = document.getElementById('val-slice-offset');
  if (valSliceOffset) valSliceOffset.textContent = `${elements.sliceOffset.value}px`;

  const valSliceFreq = document.getElementById('val-slice-freq');
  if (valSliceFreq) valSliceFreq.textContent = parseFloat(elements.sliceFreq.value).toFixed(2);

  const valSliceSens = document.getElementById('val-slice-mouseSens');
  if (valSliceSens) valSliceSens.textContent = parseFloat(elements.sliceMouseSens.value).toFixed(1);

  const valScrambleFreq = document.getElementById('val-scramble-freq');
  if (valScrambleFreq) valScrambleFreq.textContent = parseFloat(elements.scrambleFreq.value).toFixed(2);

  const valScrambleChance = document.getElementById('val-scramble-chance');
  if (valScrambleChance) valScrambleChance.textContent = `${elements.scrambleChance.value}%`;

  const valShakeX = document.getElementById('val-shake-x');
  if (valShakeX) valShakeX.textContent = `${elements.shakeX.value}px`;

  const valShakeY = document.getElementById('val-shake-y');
  if (valShakeY) valShakeY.textContent = `${elements.shakeY.value}px`;

  const valShakeFreq = document.getElementById('val-shake-freq');
  if (valShakeFreq) valShakeFreq.textContent = parseFloat(elements.shakeFreq.value).toFixed(2);

  const valShakeSens = document.getElementById('val-shake-mouseSens');
  if (valShakeSens) valShakeSens.textContent = parseFloat(elements.shakeMouseSens.value).toFixed(1);

  const valFlickerOpac = document.getElementById('val-flicker-opac');
  if (valFlickerOpac) valFlickerOpac.textContent = parseFloat(elements.flickerOpac.value).toFixed(2);

  const valFlickerFreq = document.getElementById('val-flicker-freq');
  if (valFlickerFreq) valFlickerFreq.textContent = parseFloat(elements.flickerFreq.value).toFixed(2);

  const valScanlineOpac = document.getElementById('val-scanline-opac');
  if (valScanlineOpac) valScanlineOpac.textContent = parseFloat(elements.scanlineOpac.value).toFixed(2);
};

// Helper: Get active targets string for UI labels
const getTargetSelector = (): string => {
  return `#glitch-target-${currentTab}`;
};

// Helper: Generate Options Object from UI
const getGlitchOptionsFromUI = () => {
  const activeEffects: string[] = [];

  if (elements.enableRgb.checked) {
    let optString = `    Effects.rgbSplit({\n      maxOffset: ${elements.rgbOffset.value},\n      frequency: ${elements.rgbFreq.value},\n      blendMode: '${elements.rgbBlend.value}'`;
    if (elements.rgbMouseInteract.checked) {
      optString += `,\n      mouseInteract: true,\n      mouseSensitivity: ${elements.rgbMouseSens.value}`;
    }
    optString += `\n    })`;
    activeEffects.push(optString);
  }

  if (elements.enableSlice.checked) {
    let optString = `    Effects.slice({\n      maxOffset: ${elements.sliceOffset.value},\n      frequency: ${elements.sliceFreq.value}`;
    if (elements.sliceMouseInteract.checked) {
      optString += `,\n      mouseInteract: true,\n      mouseSensitivity: ${elements.sliceMouseSens.value}`;
    }
    optString += `\n    })`;
    activeEffects.push(optString);
  }

  if (elements.enableScramble.checked) {
    activeEffects.push(
      `    Effects.scramble({\n      frequency: ${elements.scrambleFreq.value},\n      scrambleChance: ${
        parseFloat(elements.scrambleChance.value) / 100
      }\n    })`
    );
  }

  if (elements.enableShake.checked) {
    let optString = `    Effects.shake({\n      amplitudeX: ${elements.shakeX.value},\n      amplitudeY: ${elements.shakeY.value},\n      frequency: ${elements.shakeFreq.value}`;
    if (elements.shakeMouseInteract.checked) {
      optString += `,\n      mouseInteract: true,\n      mouseSensitivity: ${elements.shakeMouseSens.value}`;
    }
    optString += `\n    })`;
    activeEffects.push(optString);
  }

  if (elements.enableFlicker.checked) {
    activeEffects.push(
      `    Effects.flicker({\n      minOpacity: ${elements.flickerOpac.value},\n      frequency: ${elements.flickerFreq.value}\n    })`
    );
  }

  if (elements.enableScanlines.checked) {
    activeEffects.push(
      `    Effects.scanlines({\n      opacity: ${elements.scanlineOpac.value},\n      pulse: ${elements.scanlinePulse.checked}\n    })`
    );
  }

  return {
    effects: activeEffects,
    trigger: elements.triggerMode.value,
    active: elements.engineActive.checked,
  };
};

// Helper: Escape HTML meta-characters to prevent DOM XSS alerts
const escapeHtml = (str: string): string => {
  return str.replace(/[&<>'"]/g, (tag) => {
    const chars: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return chars[tag] || tag;
  });
};

// Helper: Re-generate and render code snippet block
const updateCodeSnippet = (): void => {
  const opts = getGlitchOptionsFromUI();
  const targetSel = getTargetSelector();

  let effectsString = '[\n';
  if (opts.effects.length > 0) {
    effectsString += opts.effects.join(',\n') + '\n  ]';
  } else {
    effectsString += '  ]';
  }

  const code = `<span class="keyword">import</span> { <span class="class-name">Glitch</span>, <span class="class-name">Effects</span> } <span class="keyword">from</span> <span class="string">'@isonimus/glitch-js'</span>;

<span class="keyword">const</span> target = <span class="keyword">document</span>.querySelector(<span class="string">'${escapeHtml(targetSel)}'</span>);
<span class="keyword">const</span> glitcher = <span class="keyword">new</span> <span class="class-name">Glitch</span>(target, {
  <span class="property">trigger</span>: <span class="string">'${escapeHtml(opts.trigger)}'</span>,
  <span class="property">active</span>: <span class="number">${opts.active}</span>,
  <span class="property">effects</span>: ${escapeHtml(effectsString)}
});`;

  elements.codeSnippetOutput.innerHTML = code;
};

// Helper: Instantiate/re-configure target Glitch instance
const updateGlitchInstance = (): void => {
  // Tear down current instance if it exists
  if (glitchController) {
    glitchController.destroy();
    glitchController = null;
  }

  const activeTarget = elements.targets[currentTab];
  elements.activeTargetLabel.textContent = getTargetSelector();

  // Show/hide manual trigger button depending on Trigger Mode
  if (elements.triggerMode.value === 'manual') {
    elements.btnManualTrigger.style.display = 'inline-block';
  } else {
    elements.btnManualTrigger.style.display = 'none';
  }

  // Rebuild options matching real library API structure
  const opts = getGlitchOptionsFromUI();
  const realEffects = [];

  if (elements.enableRgb.checked) {
    realEffects.push(
      Effects.rgbSplit({
        maxOffset: parseInt(elements.rgbOffset.value),
        frequency: parseFloat(elements.rgbFreq.value),
        blendMode: elements.rgbBlend.value,
        mouseInteract: elements.rgbMouseInteract.checked,
        mouseSensitivity: parseFloat(elements.rgbMouseSens.value),
      })
    );
  }
  if (elements.enableSlice.checked) {
    realEffects.push(
      Effects.slice({
        maxOffset: parseInt(elements.sliceOffset.value),
        frequency: parseFloat(elements.sliceFreq.value),
        mouseInteract: elements.sliceMouseInteract.checked,
        mouseSensitivity: parseFloat(elements.sliceMouseSens.value),
      })
    );
  }
  if (elements.enableScramble.checked) {
    realEffects.push(
      Effects.scramble({
        frequency: parseFloat(elements.scrambleFreq.value),
        scrambleChance: parseFloat(elements.scrambleChance.value) / 100,
      })
    );
  }
  if (elements.enableShake.checked) {
    realEffects.push(
      Effects.shake({
        amplitudeX: parseInt(elements.shakeX.value),
        amplitudeY: parseInt(elements.shakeY.value),
        frequency: parseFloat(elements.shakeFreq.value),
        mouseInteract: elements.shakeMouseInteract.checked,
        mouseSensitivity: parseFloat(elements.shakeMouseSens.value),
      })
    );
  }
  if (elements.enableFlicker.checked) {
    realEffects.push(
      Effects.flicker({
        minOpacity: parseFloat(elements.flickerOpac.value),
        frequency: parseFloat(elements.flickerFreq.value),
      })
    );
  }
  if (elements.enableScanlines.checked) {
    realEffects.push(
      Effects.scanlines({
        opacity: parseFloat(elements.scanlineOpac.value),
        pulse: elements.scanlinePulse.checked,
      })
    );
  }

  if (elements.engineActive.checked) {
    glitchController = new Glitch(activeTarget, {
      trigger: opts.trigger as any,
      active: true,
      effects: realEffects,
    });

    elements.statusBadge.textContent = 'SYSTEM_ACTIVE';
    elements.statusBadge.style.color = 'var(--neon-cyan)';
    elements.statusBadge.style.borderColor = 'var(--neon-cyan)';
    elements.btnTogglePlay.textContent = 'STOP_ENGINE';
    elements.btnTogglePlay.style.borderColor = 'var(--neon-pink)';
  } else {
    elements.statusBadge.textContent = 'SYSTEM_STANDBY';
    elements.statusBadge.style.color = 'var(--text-secondary)';
    elements.statusBadge.style.borderColor = 'var(--text-muted)';
    elements.btnTogglePlay.textContent = 'START_ENGINE';
    elements.btnTogglePlay.style.borderColor = 'var(--neon-cyan)';
  }

  updateCodeSnippet();
};

// ==========================================
// Event Bindings
// ==========================================

// Handle Form & Inputs Changes
elements.form.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (!target) return;

  // Toggle visibility of sensitivity inputs
  if (target.id === 'rgb-mouseInteract') {
    const rgbSensCont = document.getElementById('rgb-mouseSens-container');
    if (rgbSensCont) rgbSensCont.style.display = target.checked ? 'block' : 'none';
  }
  if (target.id === 'slice-mouseInteract') {
    const sliceSensCont = document.getElementById('slice-mouseSens-container');
    if (sliceSensCont) sliceSensCont.style.display = target.checked ? 'block' : 'none';
  }
  if (target.id === 'shake-mouseInteract') {
    const shakeSensCont = document.getElementById('shake-mouseSens-container');
    if (shakeSensCont) shakeSensCont.style.display = target.checked ? 'block' : 'none';
  }

  // Visual feedback toggle checked groups
  const groupElement = target.closest('.control-group') as HTMLElement | null;
  if (groupElement) {
    const toggle = groupElement.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    if (toggle && toggle.checked) {
      groupElement.classList.add('active');
    } else {
      groupElement.classList.remove('active');
    }
  }

  // Check for preset deactivation
  elements.presets.forEach((b) => b.classList.remove('active'));

  updateUIValues();
  updateGlitchInstance();
});

elements.rgbBlend.addEventListener('change', () => {
  elements.presets.forEach((b) => b.classList.remove('active'));
  updateGlitchInstance();
});

elements.triggerMode.addEventListener('change', () => {
  elements.presets.forEach((b) => b.classList.remove('active'));
  updateGlitchInstance();
});

elements.engineActive.addEventListener('change', () => {
  updateGlitchInstance();
});

// Toggle Play/Pause Engine Button
elements.btnTogglePlay.addEventListener('click', () => {
  elements.engineActive.checked = !elements.engineActive.checked;
  updateGlitchInstance();
});

// Manual Force Trigger Triggering
elements.btnManualTrigger.addEventListener('mousedown', () => {
  if (glitchController && elements.triggerMode.value === 'manual') {
    glitchController.start();
  }
});

elements.btnManualTrigger.addEventListener('mouseup', () => {
  if (glitchController && elements.triggerMode.value === 'manual') {
    glitchController.stop();
  }
});

// Tab Switching
elements.tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    elements.tabs.forEach((t) => {
      t.classList.remove('active', 'cyan-active');
    });

    tab.classList.add('active');
    if (tab.dataset.tab === 'terminal' || tab.dataset.tab === 'portrait') {
      tab.classList.add('cyan-active');
    }

    currentTab = tab.dataset.tab as any;

    // Toggle visibility inside viewport
    document.querySelectorAll('.showcase-content').forEach((c) => {
      c.classList.remove('active');
    });
    const showcaseContent = document.getElementById(`showcase-${currentTab}`);
    if (showcaseContent) showcaseContent.classList.add('active');

    updateGlitchInstance();
  });
});

// Preset Switching
elements.presets.forEach((presetBtn) => {
  presetBtn.addEventListener('click', () => {
    elements.presets.forEach((pb) => pb.classList.remove('active'));
    presetBtn.classList.add('active');

    currentPreset = presetBtn.dataset.preset || 'matrix';
    applyPresetToUI(currentPreset);
  });
});

// Copy Code Helper
elements.btnCopyCode.addEventListener('click', () => {
  const codeToCopy = elements.codeSnippetOutput.textContent || '';
  navigator.clipboard.writeText(codeToCopy).then(() => {
    elements.btnCopyCode.textContent = 'COPIED!';
    elements.btnCopyCode.style.color = 'var(--neon-green)';
    elements.btnCopyCode.style.borderColor = 'var(--neon-green)';

    setTimeout(() => {
      elements.btnCopyCode.textContent = 'COPY_CODE';
      elements.btnCopyCode.style.color = '';
      elements.btnCopyCode.style.borderColor = '';
    }, 1500);
  });
});

// Visual Speedometer Update loop
const updateVelocityMeter = (): void => {
  if (glitchController && glitchController.isRunning) {
    const v = glitchController.mouseVelocity;
    const percent = Math.min(100, v * 15); // Map to 100% max bar fill

    const barFill = document.getElementById('velocity-bar-fill');
    const valText = document.getElementById('velocity-value');

    if (barFill && valText) {
      barFill.style.width = `${percent}%`;
      valText.textContent = v.toFixed(2);

      if (percent > 65) {
        barFill.style.backgroundColor = 'var(--neon-pink)';
        valText.style.color = 'var(--neon-pink)';
      } else if (percent > 20) {
        barFill.style.backgroundColor = 'var(--neon-yellow)';
        valText.style.color = 'var(--neon-yellow)';
      } else {
        barFill.style.backgroundColor = 'var(--neon-cyan)';
        valText.style.color = 'var(--neon-cyan)';
      }
    }
  } else {
    const barFill = document.getElementById('velocity-bar-fill');
    const valText = document.getElementById('velocity-value');
    if (barFill && valText) {
      barFill.style.width = '0%';
      valText.textContent = '0.00';
      valText.style.color = 'var(--text-secondary)';
    }
  }
  requestAnimationFrame(updateVelocityMeter);
};
requestAnimationFrame(updateVelocityMeter);

// Initial Setup
applyPresetToUI('matrix');
