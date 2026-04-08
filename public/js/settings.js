/**
 * PHOSPHOR :: CONFIGURATION SUBSYSTEM
 * [MODULE: settings.js // CIPHER PARAMETER STORE + CONFIG INTERFACE]
 *
 * EXPORTS (global):
 *   cipherSettings  — live config object consumed by crypto.js
 *
 * RESPONSIBILITIES:
 *   - Persist settings to localStorage
 *   - Drive the SYS CONFIG modal open/close/apply lifecycle
 *   - Validate that at least one character class is always active
 */

// ============================================================
// CIPHER SETTINGS :: PARAMETER STORE
// [DEFAULT CONFIGURATION — OVERWRITTEN BY localStorage ON LOAD]
// ============================================================

/** @type {{ length: number, useUppercase: boolean, useLowercase: boolean, useNumbers: boolean, useSymbols: boolean, theme: string, hideWelcome: boolean }} */
const cipherSettings = {
  length:       16,
  useUppercase: true,
  useLowercase: true,
  useNumbers:   true,
  useSymbols:   true,
  theme:        'green',
  hideWelcome:  false,
};

// [BOOT: RESTORE PERSISTED CONFIGURATION]
(function loadPersistedSettings() {
  try {
    const raw = localStorage.getItem('phosphorSettings');
    if (raw) {
      const saved = JSON.parse(raw);
      // Merge saved values — only keys already in cipherSettings are accepted
      Object.keys(cipherSettings).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(saved, key)) {
          cipherSettings[key] = saved[key];
        }
      });
    }
  } catch {
    // [SETTINGS RESTORE FAULT — DEFAULTS RETAINED]
  }
})();

// ============================================================
// DOM REFERENCES
// ============================================================

const settingsModal   = document.getElementById('settingsModal');
const settingsBtn     = document.getElementById('settingsBtn');
const settingsClose   = document.getElementById('settingsClose');
const settingsCancel  = document.getElementById('settingsCancel');
const settingsApply   = document.getElementById('settingsApply');
const lengthSlider    = document.getElementById('lengthSlider');
const lengthDisplay   = document.getElementById('lengthDisplay');
const settingsWarning = document.getElementById('settingsWarning');
const themeGreenRadio  = document.getElementById('themeGreen');
const themeOrangeRadio = document.getElementById('themeOrange');
const themePonyRadio   = document.getElementById('themePony');
const showWelcomeOnStart = document.getElementById('showWelcomeOnStart');

// [WELCOME MODAL DOM REFERENCES]
const welcomeModal      = document.getElementById('welcomeModal');
const welcomeClose      = document.getElementById('welcomeClose');
const welcomeDismiss    = document.getElementById('welcomeDismiss');
const technicalToggleBtn = document.getElementById('technicalToggleBtn');
const technicalPanel    = document.getElementById('technicalPanel');
const basicPanel        = document.getElementById('basicPanel');
const hideWelcomeCheck  = document.getElementById('hideWelcomeCheck');

// [ABOUT MODAL DOM REFERENCES]
const aboutModal   = document.getElementById('aboutModal');
const aboutBtn     = document.getElementById('aboutBtn');
const aboutClose   = document.getElementById('aboutClose');
const aboutDismiss = document.getElementById('aboutDismiss');

const checkboxIds = ['useUppercase', 'useLowercase', 'useNumbers', 'useSymbols'];

// [BOOT: APPLY PERSISTED THEME]
applyTheme(cipherSettings.theme);

// [BOOT: SHOW OVERVIEW IF NOT SUPPRESSED]
if (!cipherSettings.hideWelcome) {
  openWelcome();
}

// ============================================================
// SUBSYSTEM: MODAL LIFECYCLE
// ============================================================

/**
 * applyTheme — Toggle body class to activate the selected colour matrix.
 * [DISPLAY MATRIX SWITCH]
 */
function applyTheme(theme) {
  document.body.classList.toggle('theme-orange', theme === 'orange');
  document.body.classList.toggle('theme-pony',   theme === 'pony');
}

// ============================================================
// SUBSYSTEM: WELCOME MODAL LIFECYCLE
// ============================================================

/**
 * openWelcome — Show the system overview modal.
 * Resets the technical panel to collapsed state.
 * [OVERVIEW INTERFACE ACTIVATION]
 */
function openWelcome() {
  hideWelcomeCheck.checked = cipherSettings.hideWelcome;
  technicalPanel.hidden = true;
  basicPanel.hidden = false;
  technicalToggleBtn.textContent = '[TECHNICAL DETAIL]';
  welcomeModal.classList.add('is-open');
  welcomeDismiss.focus();
}

/**
 * closeWelcome — Dismiss the overview modal and persist the hide preference.
 * [OVERVIEW INTERFACE STANDBY]
 */
function closeWelcome() {
  cipherSettings.hideWelcome = hideWelcomeCheck.checked;
  try {
    localStorage.setItem('phosphorSettings', JSON.stringify(cipherSettings));
  } catch {
    // [STORAGE UNAVAILABLE — PREFERENCE NOT PERSISTED]
  }
  welcomeModal.classList.remove('is-open');
}

/**
 * openSettings — Sync modal controls to current cipherSettings, then show.
 * [CONFIG INTERFACE ACTIVATION SEQUENCE]
 */
function openSettings() {
  lengthSlider.value         = cipherSettings.length;
  lengthDisplay.textContent  = cipherSettings.length;
  settingsWarning.textContent = '';

  checkboxIds.forEach((id) => {
    document.getElementById(id).checked = cipherSettings[id];
  });

  themeGreenRadio.checked       = cipherSettings.theme === 'green' || (cipherSettings.theme !== 'orange' && cipherSettings.theme !== 'pony');
  themeOrangeRadio.checked      = cipherSettings.theme === 'orange';
  themePonyRadio.checked        = cipherSettings.theme === 'pony';
  showWelcomeOnStart.checked    = !cipherSettings.hideWelcome;

  settingsModal.classList.add('is-open');
  settingsApply.focus();
}

/**
 * closeSettings — Hide the modal without writing any changes.
 * [CONFIG INTERFACE STANDBY]
 */
function closeSettings() {
  settingsModal.classList.remove('is-open');
  settingsBtn.focus();
}

// ============================================================
// SUBSYSTEM: APPLY CONFIGURATION
// ============================================================

/**
 * applySettings — Validate selections, commit to cipherSettings, persist.
 * [PARAMETER WRITE SEQUENCE]
 */
function applySettings() {
  const uc = document.getElementById('useUppercase').checked;
  const lc = document.getElementById('useLowercase').checked;
  const nm = document.getElementById('useNumbers').checked;
  const sy = document.getElementById('useSymbols').checked;

  // [GUARD: AT LEAST ONE CHARACTER CLASS REQUIRED]
  if (!uc && !lc && !nm && !sy) {
    settingsWarning.textContent = '// WARN: SELECT AT LEAST ONE CHARACTER CLASS';
    return;
  }

  cipherSettings.length       = parseInt(lengthSlider.value, 10);
  cipherSettings.useUppercase = uc;
  cipherSettings.useLowercase = lc;
  cipherSettings.useNumbers   = nm;
  cipherSettings.useSymbols   = sy;
  const prevTheme             = cipherSettings.theme;
  cipherSettings.theme        = themePonyRadio.checked ? 'pony' : (themeOrangeRadio.checked ? 'orange' : 'green');
  cipherSettings.hideWelcome  = !showWelcomeOnStart.checked;

  applyTheme(cipherSettings.theme);

  // [THERMAL PURGE ON MATRIX SWITCH — CANVAS RESIDUE INVALID UNDER NEW COLOUR SPACE]
  if (cipherSettings.theme !== prevTheme) {
    resetSystem();
  }

  // [PERSIST TO LOCAL STORE]
  try {
    localStorage.setItem('phosphorSettings', JSON.stringify(cipherSettings));
  } catch {
    // [STORAGE UNAVAILABLE — RUNNING IN-SESSION ONLY]
  }

  closeSettings();
}

// ============================================================
// EVENT WIRING
// ============================================================

// Live length readout
lengthSlider.addEventListener('input', () => {
  lengthDisplay.textContent = lengthSlider.value;
  settingsWarning.textContent = '';
});

// Clear warning on any checkbox change
checkboxIds.forEach((id) => {
  document.getElementById(id).addEventListener('change', () => {
    settingsWarning.textContent = '';
  });
});

settingsBtn.addEventListener('click', openSettings);
settingsClose.addEventListener('click', closeSettings);
settingsCancel.addEventListener('click', closeSettings);
settingsApply.addEventListener('click', applySettings);

// Click outside panel to dismiss
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeSettings();
});

// [WELCOME MODAL EVENT WIRING]
welcomeClose.addEventListener('click', closeWelcome);
welcomeDismiss.addEventListener('click', closeWelcome);

technicalToggleBtn.addEventListener('click', () => {
  const showTechnical = technicalPanel.hidden;
  technicalPanel.hidden = !showTechnical;
  basicPanel.hidden = showTechnical;
  technicalToggleBtn.textContent = showTechnical ? '[BASIC OVERVIEW]' : '[TECHNICAL DETAIL]';
});

// Click outside panel to dismiss
welcomeModal.addEventListener('click', (e) => {
  if (e.target === welcomeModal) closeWelcome();
});

// ============================================================
// SUBSYSTEM: ABOUT MODAL LIFECYCLE
// ============================================================

/**
 * openAbout — Show the operator profile modal.
 * [DOSSIER INTERFACE ACTIVATION]
 */
function openAbout() {
  aboutModal.classList.add('is-open');
  aboutDismiss.focus();
}

/**
 * closeAbout — Hide the operator profile modal.
 * [DOSSIER INTERFACE STANDBY]
 */
function closeAbout() {
  aboutModal.classList.remove('is-open');
  aboutBtn.focus();
}

// [ABOUT MODAL EVENT WIRING]
aboutBtn.addEventListener('click', openAbout);
aboutClose.addEventListener('click', closeAbout);
aboutDismiss.addEventListener('click', closeAbout);

aboutModal.addEventListener('click', (e) => {
  if (e.target === aboutModal) closeAbout();
});

// Escape key to dismiss
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (settingsModal.classList.contains('is-open')) closeSettings();
    else if (welcomeModal.classList.contains('is-open')) closeWelcome();
    else if (aboutModal.classList.contains('is-open')) closeAbout();
  }
});
