#!/usr/bin/env node

/**
 * cache-bust.js
 *
 * Applies a Date.now() timestamp as query strings (?v={timestamp}) for:
 *   - style.css, settings.js, crypto.js, entropy.js → in index.html and sw.js
 *   - index.html → in sw.js
 * Also bumps the SW CACHE_NAME so stale caches are purged.
 *
 * Usage: node cache-bust.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const HTML = join(__dirname, 'public', 'index.html');
const SW   = join(__dirname, 'public', 'sw.js');

// Files referenced in both index.html and sw.js
const TARGETS = [
  {
    htmlRef: /css\/style\.css(?:\?v=[a-zA-Z0-9]+)?/,
    swRef:   /\/css\/style\.css(?:\?v=[a-zA-Z0-9]+)?/,
    htmlNew: (t) => `css/style.css?v=${t}`,
    swNew:   (t) => `/css/style.css?v=${t}`,
  },
  {
    htmlRef: /js\/settings\.js(?:\?v=[a-zA-Z0-9]+)?/,
    swRef:   /\/js\/settings\.js(?:\?v=[a-zA-Z0-9]+)?/,
    htmlNew: (t) => `js/settings.js?v=${t}`,
    swNew:   (t) => `/js/settings.js?v=${t}`,
  },
  {
    htmlRef: /js\/crypto\.js(?:\?v=[a-zA-Z0-9]+)?/,
    swRef:   /\/js\/crypto\.js(?:\?v=[a-zA-Z0-9]+)?/,
    htmlNew: (t) => `js/crypto.js?v=${t}`,
    swNew:   (t) => `/js/crypto.js?v=${t}`,
  },
  {
    htmlRef: /js\/entropy\.js(?:\?v=[a-zA-Z0-9]+)?/,
    swRef:   /\/js\/entropy\.js(?:\?v=[a-zA-Z0-9]+)?/,
    htmlNew: (t) => `js/entropy.js?v=${t}`,
    swNew:   (t) => `/js/entropy.js?v=${t}`,
  },
];

const ts = String(Date.now());

let html = readFileSync(HTML, 'utf8');
let sw   = readFileSync(SW, 'utf8');

// Phase 1: update html and sw for all targets
for (const { htmlRef, swRef, htmlNew, swNew } of TARGETS) {
  html = html.replace(htmlRef, htmlNew(ts));
  sw   = sw.replace(swRef, swNew(ts));
}

// Phase 2: update index.html version in sw
sw = sw.replace(/\/index\.html(?:\?v=[a-zA-Z0-9]+)?/, `/index.html?v=${ts}`);

console.log(`Applied timestamp: ?v=${ts}`);

// Bump the SW CACHE_NAME so stale caches are purged
sw = sw.replace(
  /(const CACHE_NAME\s*=\s*['"][^'"]+\.)(\d+)(['"]\s*;)/,
  (_, prefix, num, suffix) => `${prefix}${parseInt(num, 10) + 1}${suffix}`
);

writeFileSync(HTML, html, 'utf8');
console.log('Updated: public/index.html');

writeFileSync(SW, sw, 'utf8');
console.log('Updated: public/sw.js');
