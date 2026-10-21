# Prodigy InfoTech Web Development Internship - Task 02

## CHRONO-02: 3D Hardware Stopwatch Web Application
A precision skeuomorphic stopwatch web application engineered with vanilla HTML5, CSS3, and ES6+ JavaScript. Designed to replicate a desk-mounted hardware chronometer with zero external libraries or image assets.

## Core Features
- **High-Precision Delta Timing Engine:** Uses `performance.now()` synchronized via `requestAnimationFrame` to eliminate timer drift and browser tab throttling.
- **Dual Display Architecture:** Combines a 60-tick SVG analog sweep chronometer dial (with a 30-minute sub-dial) and a recessed backlit digital LCD screen.
- **3D Mechanical Switch Bank:** Tactile push-buttons with physical extrusion shadows that compress upon click or keyboard trigger (`[SPACE]`, `[L]`, `[R]`).
- **Synthesized Acoustic Feedback:** Generates realistic mechanical switch clicks using the native Web Audio API.
- **Statistical Lap Telemetry:** Tracks individual lap splits, cumulative times, split variance, average lap duration, and automatically tags the fastest and slowest intervals.
- **CSV Telemetry Export:** Allows one-click export of recorded lap intervals to a `.csv` spreadsheet.

## Tech Stack
- **HTML5:** Semantic structure and inline SVG vector graphics
- **CSS3:** Multi-layer 3D lighting, conic/radial metallic gradients, tabular numerals, and responsive grid layouts
- **JavaScript (ES6+):** High-resolution timing math, DOM manipulation, and Web Audio synthesis

## Running Locally
1. Clone the repository:
   ```bash
   git clone [https://github.com/your-username/PRODIGY_WD_02.git](https://github.com/your-username/PRODIGY_WD_02.git)