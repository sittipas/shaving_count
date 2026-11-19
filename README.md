# BladeTrack 🪒

A mobile-first responsive web app to track shaving blade usage. Built with vanilla HTML/CSS/JS, Three.js (via CDN with fallback), and localStorage — zero build tools, no database, and zero complex setup.

## ✨ Features

- **Fluid Dark Aesthetic**: Midnight navy background with radial lighting and subtle animated ambient wave lines.
- **Procedural 3D Safety Razor Blade (Three.js)**:
  - Extruded 3D geometry with iconic double-edge cutouts.
  - Honed and beveled cutting edge strips with high specular highlight.
  - Dynamic wear simulation: transitions from pristine mirror chrome to bronze/copper patina as blade approaches its limit.
- **Interactive 3D Controls**: Floating/bobbing idle animation with touch and mouse drag to spin and inspect.
- **"LOG SHAVE" Action**: Glowing pill button triggering spin animation, flash lighting, and ripple shockwaves.
- **History & Stats**: Blade tracking history drawer and inline log.
- **Customizable Threshold**: Configurable shave count limit per blade.
- **100% Client-Side**: Saved in `localStorage` under `bladetrack_data`.

## 🚀 Running Locally

Serve with any static file server:

```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .
```

Open `http://localhost:8080` in your browser.
