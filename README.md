# PHOSPHOR Password Generator

![Phosor in action](public/img/phospor-in-action.gif)

An entropy-based password generator PWA with a Cyberpunk/NASA-dashboard aesthetic. Passwords are generated entirely in-browser using pointer movement as a source of randomness — nothing is sent to a server or stored externally.

## How It Works

1. **Collect entropy** — Move your pointer across the glowing canvas field. Pointer coordinates and timestamps are continuously sampled into an entropy pool.
2. **Forge a cipher** — Once the Thermal Flux bar reaches threshold, click **FORGE CIPHER**. The pool is serialised and digested using SHA-256 via `window.crypto.subtle`, with a cryptographic salt injected via `crypto.getRandomValues()`.
3. **Copy and purge** — Copy your password, then use **PURGE & RESET** to wipe all trace data from memory.

## Architecture

| Module | Responsibility |
|---|---|
| `js/entropy.js` | Entropy pool collection, canvas heat-map rendering, thermal decay loop (`requestAnimationFrame`) |
| `js/crypto.js` | SHA-256 digestion, pool serialisation, digest-to-alphabet mapping |
| `js/settings.js` | Cipher parameter store (`cipherSettings`), settings modal lifecycle, localStorage persistence |
| `css/style.css` | Cyberpunk/phosphor-green dark-mode UI, CRT scanline overlay, theme variants |
| `sw.js` | Service worker — cache-first strategy, offline support, automatic cache invalidation on version bump |

## Tech Stack

- **Vanilla JavaScript (ES6+)** — no frameworks, no external packages
- **Web Crypto API** — `crypto.subtle.digest` for SHA-256, `crypto.getRandomValues` for salt generation
- **HTML5 Canvas** — heat-map dissipation effect via radial gradients and per-frame fade passes
- **CSS** — monospaced typography, high-contrast dark mode, `green` and `orange` phosphor themes
- **Service Worker** — full offline capability via cache-first fetch strategy; stale caches purged automatically on activate

## Configuration

Open `[SYS CONFIG]` in the UI to adjust:

- Password length (8–64 characters)
- Active character classes: uppercase, lowercase, numbers, symbols
- Phosphor display theme (green / orange)
