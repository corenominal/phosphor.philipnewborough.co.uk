/**
 * PHOSPHOR :: ENTROPY ENGINE
 * [MODULE: entropy.js // THERMAL FLUX COLLECTOR + CANVAS RENDERER]
 *
 * SUBSYSTEMS:
 *   - thermalDecayLoop  :: requestAnimationFrame fade pass
 *   - pointerIngestion  :: mouse/touch → glow trail + pool sample
 *   - entropyPool       :: raw sample buffer [{ x, y, t }]
 *   - entropyLevel      :: 0–100 scalar representing pool saturation
 */

// -- [SYSTEM CONSTANTS] --
const IS_TOUCH_DEVICE        = window.matchMedia('(pointer: coarse)').matches;
const PROMPT_COLLECT         = IS_TOUCH_DEVICE
  ? '// MOVE YOUR FINGER TO COLLECT ENTROPY'
  : '// MOVE YOUR POINTER TO COLLECT ENTROPY';
const ENTROPY_THRESHOLD      = 90;   // % fill required to arm the forge
const POOL_TARGET_SIZE       = 2000;  // samples needed for 100% entropy
const THERMAL_DECAY_ALPHA    = 0.018; // per-frame fade opacity (heat dissipation rate)
const GLOW_RADIUS_BASE       = 18;   // base radius of thermal trace dot (px)
const GLOW_RADIUS_VARIANCE   = 12;   // random variance added to radius
const TRAIL_SEGMENTS         = 6;    // intermediate interpolation points per move event

// -- [DOM ACQUISITION] --
const canvas          = document.getElementById('entropyCanvas');
const ctx             = canvas.getContext('2d');
const entropyFill     = document.getElementById('entropyFill');
const entropyBar      = document.getElementById('entropyBar');
const entropyPercent  = document.getElementById('entropyPercent');
const entropyStatus   = document.getElementById('entropyStatus');
const cipherForge     = document.getElementById('cipherForge');
const forgeBtn        = document.getElementById('forgeBtn');
const copyBtn         = document.getElementById('copyBtn');
const resetBtn        = document.getElementById('resetBtn');
const poolCountEl     = document.getElementById('poolCount');
const systemStatus    = document.getElementById('systemStatus');
const systemClock     = document.getElementById('systemClock');

// -- [ENTROPY POOL :: THERMAL SAMPLE BUFFER] --
/** @type {Array<{x: number, y: number, t: number}>} */
let entropyPool = [];
let entropyLevel = 0;         // 0–100
let isPointerActive = false;
let lastPointerX = 0;
let lastPointerY = 0;

// -- [VIEW STATE] --
let forgeArmed = false;

// ============================================================
// SUBSYSTEM: CANVAS INITIALISATION
// ============================================================

/**
 * calibrateSurface — Resize canvas to match device pixel ratio.
 * Must be called on init and window resize.
 * [THERMAL FIELD CALIBRATION SEQUENCE]
 */
function calibrateSurface() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = window.innerWidth  * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width  = window.innerWidth  + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);

  // Re-flood with void after resize to prevent artefacts
  ctx.fillStyle = document.body.classList.contains('theme-pony') ? '#fdf0ff' : '#000000';
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

// ============================================================
// SUBSYSTEM: THERMAL DECAY LOOP
// ============================================================

/**
 * thermalDecayLoop — Primary rAF loop.
 * Paints a semi-transparent black rect each tick to simulate
 * heat dissipation from the thermal field.
 * [CONTINUOUS :: DECAY RATE = THERMAL_DECAY_ALPHA]
 */
function thermalDecayLoop() {
  // [HEAT DISSIPATION PASS]
  const isPony = document.body.classList.contains('theme-pony');
  ctx.fillStyle = isPony
    ? `rgba(253, 240, 255, ${THERMAL_DECAY_ALPHA})`
    : `rgba(0, 0, 0, ${THERMAL_DECAY_ALPHA})`;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  requestAnimationFrame(thermalDecayLoop);
}

// ============================================================
// SUBSYSTEM: THERMAL TRACE RENDERER
// ============================================================

/**
 * renderThermalTrace — Draw a glowing heat-dot at (x, y).
 * Uses a radial gradient to simulate thermal emission.
 */
function renderThermalTrace(x, y) {
  const radius = GLOW_RADIUS_BASE + Math.random() * GLOW_RADIUS_VARIANCE;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

  if (document.body.classList.contains('theme-orange')) {
    // Orange phosphor matrix
    gradient.addColorStop(0,   'rgba(255, 140,   0, 0.90)');
    gradient.addColorStop(0.3, 'rgba(200,  90,   0, 0.50)');
    gradient.addColorStop(0.7, 'rgba(120,  45,   0, 0.15)');
    gradient.addColorStop(1,   'rgba(  0,   0,   0, 0.00)');
  } else if (document.body.classList.contains('theme-pony')) {
    // Rainbow pony — hue rotates along a global cycle for variety ✦
    const hue  = (performance.now() / 8) % 360;
    const h2   = (hue + 120) % 360;
    const h3   = (hue + 240) % 360;
    gradient.addColorStop(0,   `hsla(${hue},  100%, 62%, 0.92)`);
    gradient.addColorStop(0.3, `hsla(${h2},   90%, 58%, 0.55)`);
    gradient.addColorStop(0.7, `hsla(${h3},   80%, 72%, 0.18)`);
    gradient.addColorStop(1,   'rgba(255, 255, 255, 0.00)');
  } else {
    // Phosphor-green core → translucent halo
    gradient.addColorStop(0,   'rgba(0, 255, 65, 0.90)');
    gradient.addColorStop(0.3, 'rgba(0, 200, 50, 0.50)');
    gradient.addColorStop(0.7, 'rgba(0, 128, 30, 0.15)');
    gradient.addColorStop(1,   'rgba(0,   0,  0, 0.00)');
  }

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
}

// ============================================================
// SUBSYSTEM: ENTROPY POOL INGESTION
// ============================================================

/**
 * ingestSample — Push a thermal coordinate into the entropy pool.
 * Caps pool size at POOL_TARGET_SIZE * 2 to avoid unbounded growth.
 */
function ingestSample(x, y) {
  if (entropyPool.length >= POOL_TARGET_SIZE * 2) {
    // [POOL SATURATED — ROLLING WINDOW MODE]
    entropyPool.shift();
  }
  entropyPool.push({ x, y, t: performance.now() });
  updateEntropyDisplay();
}

/**
 * updateEntropyDisplay — Sync the entropy gauge UI with current pool state.
 * [THERMAL FLUX MONITOR UPDATE]
 */
function updateEntropyDisplay() {
  const raw = Math.min(entropyPool.length / POOL_TARGET_SIZE, 1);
  entropyLevel = Math.round(raw * 100);

  entropyFill.style.width   = entropyLevel + '%';
  entropyPercent.textContent = entropyLevel + '%';
  entropyBar.setAttribute('aria-valuenow', entropyLevel);

  poolCountEl.textContent = entropyPool.length;

  // [STATE TRANSITIONS]
  resetBtn.disabled = entropyLevel < 100;
  resetBtn.setAttribute('aria-disabled', entropyLevel < 100 ? 'true' : 'false');

  if (entropyLevel >= ENTROPY_THRESHOLD) {
    if (!forgeArmed) {
      forgeArmed = true;
      armForge();
    }
    entropyBar.classList.add('surge');
    document.body.classList.remove('low-power');
    entropyStatus.textContent = '// ENTROPY COLLECTED — READY TO GENERATE';
    entropyStatus.classList.remove('blink');
  } else if (entropyLevel > 10) {
    document.body.classList.remove('low-power');
    entropyStatus.textContent = `// COLLECTING ENTROPY — ${entropyLevel}%`;
  } else {
    document.body.classList.add('low-power');
    entropyStatus.textContent = PROMPT_COLLECT;
    entropyBar.classList.remove('surge');
  }
}

/**
 * armForge — Transition the Cipher Forge to the ARMED state.
 * [FORGE SUBSYSTEM UNLOCK SEQUENCE]
 */
function armForge() {
  cipherForge.classList.replace('locked', 'armed');
  forgeBtn.disabled = false;
  forgeBtn.setAttribute('aria-disabled', 'false');
  systemStatus.textContent = 'READY';
  systemStatus.className   = 'status-ok';
  document.getElementById('cipherDisplay').textContent = '// READY TO GENERATE';
}

// ============================================================
// SUBSYSTEM: POINTER EVENT INGESTION
// ============================================================

/**
 * handlePointerMove — Interpolate trail segments between last and
 * current pointer positions, render dots, and sample pool.
 */
function handlePointerMove(x, y) {
  const dx = x - lastPointerX;
  const dy = y - lastPointerY;

  for (let i = 0; i <= TRAIL_SEGMENTS; i++) {
    const t  = i / TRAIL_SEGMENTS;
    const ix = lastPointerX + dx * t;
    const iy = lastPointerY + dy * t;
    renderThermalTrace(ix, iy);
    // [SAMPLE EVERY OTHER SEGMENT TO AVOID REDUNDANCY]
    if (i % 2 === 0) ingestSample(ix, iy);
  }

  lastPointerX = x;
  lastPointerY = y;
}

// -- Mouse events --
canvas.addEventListener('mousemove', (e) => {
  if (!isPointerActive) return;
  handlePointerMove(e.clientX, e.clientY);
});

canvas.addEventListener('mousedown', (e) => {
  isPointerActive = true;
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;
});

canvas.addEventListener('mouseup',   () => { isPointerActive = false; });
canvas.addEventListener('mouseleave', () => { isPointerActive = false; });

// Passive move (no button required) — freeform thermal drift
canvas.addEventListener('mousemove', (e) => {
  // [FREE THERMAL DRIFT — SAMPLE WITHOUT ACTIVE POINTER]
  if (isPointerActive) return; // already handled above
  handlePointerMove(e.clientX, e.clientY);
});

// -- Touch events --
canvas.addEventListener('touchstart', (e) => {
  if (e.cancelable) e.preventDefault();
  const touch = e.touches[0];
  isPointerActive = true;
  lastPointerX = touch.clientX;
  lastPointerY = touch.clientY;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (e.cancelable) e.preventDefault();
  const touch = e.touches[0];
  handlePointerMove(touch.clientX, touch.clientY);
}, { passive: false });

canvas.addEventListener('touchend', () => { isPointerActive = false; });

// ============================================================
// SUBSYSTEM: CIPHER REVEAL ANIMATION
// ============================================================

/**
 * animateCipherReveal — Scramble-typewriter effect for the cipher output.
 * Each character position cycles through noise before locking to its final value.
 * [VISUAL OUTPUT MODULE :: THERMAL DECODE SEQUENCE]
 *
 * @param {HTMLElement} target - The element to write into.
 * @param {string} cipher     - The final cipher string to reveal.
 */
function animateCipherReveal(target, cipher) {
  const NOISE_CHARS  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const SCRAMBLE_FRAMES = 5;  // noise frames before each char locks in
  const FRAME_MS        = 35; // ms per frame

  let lockedCount = 0;
  let frameCount  = 0;

  target.classList.add('cipher-animating');

  function randomChar() {
    return NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)];
  }

  function tick() {
    if (lockedCount >= cipher.length) {
      target.textContent = cipher;
      target.classList.remove('cipher-animating');
      return;
    }

    let display = cipher.slice(0, lockedCount);

    if (frameCount < SCRAMBLE_FRAMES) {
      display += randomChar();
      frameCount++;
    } else {
      lockedCount++;
      frameCount = 0;
      display = cipher.slice(0, lockedCount);
    }

    // Fill remaining positions with noise
    for (let i = display.length; i < cipher.length; i++) {
      display += randomChar();
    }

    target.textContent = display;
    setTimeout(tick, FRAME_MS);
  }

  tick();
}

// ============================================================
// SUBSYSTEM: FORGE BUTTON
// ============================================================

forgeBtn.addEventListener('click', async () => {
  if (forgeBtn.disabled) return;
  forgeBtn.disabled = true;
  forgeBtn.textContent = 'GENERATING...';
  systemStatus.textContent = 'GENERATING';
  systemStatus.className   = 'status-warn';

  try {
    // [DISPATCH TO CIPHER CORE]
    const cipher = await generateCipher(entropyPool);
    animateCipherReveal(document.getElementById('cipherDisplay'), cipher);
    copyBtn.disabled = false;
    copyBtn.setAttribute('aria-disabled', 'false');
    systemStatus.textContent = 'DONE';
    systemStatus.className   = 'status-ok';
  } catch (err) {
    document.getElementById('cipherDisplay').textContent = '[ ERROR — SEE CONSOLE ]';
    systemStatus.textContent = 'FAULT';
    systemStatus.className   = 'status-alert';
    console.error('[PHOSPHOR // FORGE FAULT]', err);
  } finally {
    forgeBtn.textContent = 'GENERATE';
    forgeBtn.disabled = false;
  }
});

// ============================================================
// SUBSYSTEM: PURGE & RESET
// ============================================================

/**
 * resetSystem — Flush the entropy pool and restore the UI to cold-boot state.
 * [THERMAL PURGE SEQUENCE :: ALL SYSTEMS REINITIALISE]
 */
function resetSystem() {
  // [FLUSH POOL]
  entropyPool = [];
  entropyLevel = 0;
  forgeArmed = false;
  isPointerActive = false;

  // [WIPE CANVAS]
  ctx.fillStyle = document.body.classList.contains('theme-pony') ? '#fdf0ff' : '#000000';
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  // [RESET ENTROPY GAUGE]
  entropyFill.style.width    = '0%';
  entropyPercent.textContent = '0%';
  entropyBar.setAttribute('aria-valuenow', 0);
  entropyBar.classList.remove('surge');

  // [RESET FORGE]
  cipherForge.classList.replace('armed', 'locked');
  document.getElementById('cipherDisplay').textContent = 'AWAITING ENTROPY';
  forgeBtn.disabled = true;
  forgeBtn.setAttribute('aria-disabled', 'true');
  forgeBtn.textContent = 'GENERATE';
  copyBtn.setAttribute('aria-disabled', 'true');
  copyBtn.textContent = 'COPY';
  resetBtn.disabled = true;
  resetBtn.setAttribute('aria-disabled', 'true');

  // [RESET STATUS]
  poolCountEl.textContent  = '0';
  systemStatus.textContent = 'NOMINAL';
  systemStatus.className   = 'status-ok';
  entropyStatus.textContent = PROMPT_COLLECT;
  entropyStatus.classList.add('blink');

  document.body.classList.add('low-power');
}

resetBtn.addEventListener('click', resetSystem);

// ============================================================
// SUBSYSTEM: COPY TO CLIPBOARD
// ============================================================

copyBtn.addEventListener('click', async () => {
  if (copyBtn.disabled) return;
  const cipher = document.getElementById('cipherDisplay').textContent.trim();
  if (!cipher || cipher.startsWith('[')) return;

  try {
    await navigator.clipboard.writeText(cipher);
    copyBtn.textContent = 'COPIED';
    setTimeout(() => { copyBtn.textContent = 'COPY'; }, 1500);
  } catch (err) {
    console.error('[PHOSPHOR // CLIPBOARD FAULT]', err);
    copyBtn.textContent = 'FAULT';
    setTimeout(() => { copyBtn.textContent = 'COPY'; }, 1500);
  }
});

// ============================================================
// SUBSYSTEM: SYSTEM CLOCK
// ============================================================

function tickSystemClock() {
  const now = new Date();
  const h = String(now.getUTCHours()).padStart(2, '0');
  const m = String(now.getUTCMinutes()).padStart(2, '0');
  const s = String(now.getUTCSeconds()).padStart(2, '0');
  systemClock.textContent = `UTC ${h}:${m}:${s}`;
  setTimeout(tickSystemClock, 1000);
}

// ============================================================
// SYSTEM INIT
// ============================================================

window.addEventListener('resize', calibrateSurface);

// [BOOT SEQUENCE]
calibrateSurface();
tickSystemClock();
requestAnimationFrame(thermalDecayLoop);
entropyStatus.textContent = PROMPT_COLLECT;
