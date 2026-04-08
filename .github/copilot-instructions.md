# Project Goal: Entropy-Based Password PWA

**Name:** Phosphor

You are an expert Frontend Engineer and Cryptographer. We are building a "Sci-Fi Prop" style PWA that generates passwords via user-drawn canvas entropy and heat-dissipation animations.

## Tech Stack Constraints
- **Language:** Vanilla JavaScript (ES6+).
- **Frameworks:** Strictly NO external packages or libraries (no React, no Tailwind, no Lodash).
- **Styling:** Custom CSS only. Use a "Cyberpunk/NASA-dashboard" aesthetic.
- **Crypto:** Use only the native `window.crypto.subtle` and `crypto.getRandomValues()`.

## Core Logic Requirements
1. **Entropy Collection:** Implement a "Heat Map" dissipation effect on a `<canvas>`.
2. **Decay Loop:** Use `requestAnimationFrame` to draw semi-transparent rectangles over the canvas to create the "fading heat" look.
3. **The Buffer:** Collect pointer coordinates (x, y), pressure, and pixel data into a `Uint8Array` or a mixing buffer.
4. **Hashing:** Implement a `generatePassword()` function that uses `SHA-256` to digest the entropy pool and maps the resulting bits to a character set (A-Z, a-z, 0-9, !@#$%^&*).

## UI & Aesthetic Guidelines
- **Theme:** High-contrast dark mode. Use `phosor-green` accent colors.
- **Typography:** Monospaced fonts only (`Courier New`, `monospace`, or `JetBrains Mono` if available).
- **Feedback:** The UI should react to user input. If entropy is low, the UI should look "unstable" or "low power." Once entropy is sufficient, the "Password Forge" should glow. Show entropy levels visually (e.g., a bar or a numeric percentage).

## Code Style
- **Modular:** Keep Logic (Entropy), View (Canvas), and Controller (Event Listeners) separated.
- **Performance:** Ensure the canvas decay loop doesn't leak memory.
- **Naming:** Use "in-universe" naming conventions for variables where appropriate (e.g., `entropyPool`, `thermalDecayRate`, `cipherCore`).
