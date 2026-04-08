/**
 * PHOSPHOR :: CIPHER CORE
 * [MODULE: crypto.js // SHA-256 ENTROPY DISTILLATION UNIT]
 *
 * INTERFACE:
 *   generateCipher(entropyPool) → Promise<string>
 *
 * PROCESS:
 *   1. Serialise the entropyPool into a raw byte buffer
 *   2. Fold in a cryptographic salt from crypto.getRandomValues()
 *   3. Digest with SHA-256 via crypto.subtle
 *   4. Map digest bytes to the authorised character set
 *   5. Return a 16-character cipher string
 */

// -- [CHARACTER CLASS SEGMENTS] --
const CHARS_UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CHARS_LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const CHARS_NUMBERS   = '0123456789';
const CHARS_SYMBOLS   = '!@#$%^&*';

/**
 * buildAlphabet — Construct the active cipher alphabet from cipherSettings.
 * [ALPHABET MATRIX ASSEMBLY]
 *
 * @param {{ useUppercase: boolean, useLowercase: boolean, useNumbers: boolean, useSymbols: boolean }} settings
 * @returns {string}
 */
function buildAlphabet(settings) {
  let alphabet = '';
  if (settings.useUppercase) alphabet += CHARS_UPPERCASE;
  if (settings.useLowercase) alphabet += CHARS_LOWERCASE;
  if (settings.useNumbers)   alphabet += CHARS_NUMBERS;
  if (settings.useSymbols)   alphabet += CHARS_SYMBOLS;
  // [FAILSAFE: NEVER RETURN EMPTY ALPHABET]
  return alphabet.length > 0
    ? alphabet
    : CHARS_UPPERCASE + CHARS_LOWERCASE + CHARS_NUMBERS;
}

/**
 * generateCipher
 * [ENTRY POINT :: THERMAL POOL → SHA-256 → PASSWORD STRING]
 *
 * @param {Array<{x: number, y: number, t: number}>} entropyPool
 * @returns {Promise<string>} 16-character password
 */
async function generateCipher(entropyPool) {
  if (!entropyPool || entropyPool.length === 0) {
    throw new Error('[CIPHER CORE] // ENTROPY POOL EMPTY — ABORT');
  }

  // [READ ACTIVE CONFIGURATION]
  const alphabet = buildAlphabet(cipherSettings);
  const length   = cipherSettings.length;

  // [STEP 1: SERIALISE POOL INTO RAW BYTE STREAM]
  const poolBytes = serialisePool(entropyPool);

  // [STEP 2: INJECT CRYPTOGRAPHIC SALT]
  const salt = new Uint8Array(32);
  crypto.getRandomValues(salt);

  // [STEP 3: CONCATENATE POOL + SALT INTO SINGLE BUFFER]
  const combined = new Uint8Array(poolBytes.length + salt.length);
  combined.set(poolBytes, 0);
  combined.set(salt, poolBytes.length);

  // [STEP 4: SHA-256 DIGEST PASS]
  const digestBuffer = await crypto.subtle.digest('SHA-256', combined);
  const digestBytes  = new Uint8Array(digestBuffer);

  // [STEP 5: MAP DIGEST BYTES → CIPHER ALPHABET]
  const cipher = mapDigestToCipher(digestBytes, alphabet, length);

  return cipher;
}

// ============================================================
// INTERNAL SUBSYSTEMS
// ============================================================

/**
 * serialisePool — Convert pool samples into a compact Uint8Array.
 * Each sample encodes: x (2 bytes LE) + y (2 bytes LE) + t-low (2 bytes LE)
 * = 6 bytes per sample.
 * [THERMAL DATA SERIALISATION PROTOCOL v1]
 *
 * @param {Array<{x: number, y: number, t: number}>} pool
 * @returns {Uint8Array}
 */
function serialisePool(pool) {
  const BYTES_PER_SAMPLE = 6;
  const buffer = new ArrayBuffer(pool.length * BYTES_PER_SAMPLE);
  const view   = new DataView(buffer);

  pool.forEach((sample, i) => {
    const offset = i * BYTES_PER_SAMPLE;
    // Clamp coordinates to uint16 range
    view.setUint16(offset,     Math.round(sample.x) & 0xffff, true);
    view.setUint16(offset + 2, Math.round(sample.y) & 0xffff, true);
    // Low 16 bits of timestamp (milliseconds) for temporal entropy
    view.setUint16(offset + 4, Math.round(sample.t) & 0xffff, true);
  });

  return new Uint8Array(buffer);
}

/**
 * mapDigestToCipher — Map SHA-256 digest bytes to CIPHER_ALPHABET characters.
 * Uses modular reduction; bias is negligible for a 70-char alphabet vs 256.
 * [CHARACTER MAPPING :: MODULAR INDEX PASS]
 *
 * @param {Uint8Array} digest - 32-byte SHA-256 output
 * @returns {string} CIPHER_LENGTH character string
 */
function mapDigestToCipher(digest, alphabet, length) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += alphabet[digest[i] % alphabet.length];
  }
  return result;
}
