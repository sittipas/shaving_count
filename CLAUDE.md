# BladeTrack 🪒

A mobile-first responsive web app to track shaving blade usage. Built with vanilla HTML/CSS/JS, Three.js (via CDN with fallback), and localStorage — no build tools, no database, zero complex setup.

## Project Status: ✅ Redesign Complete

**Last updated:** 2026-11-16

### What's Done
- [x] **Water-Tracker Inspired Dark Aesthetic**: Midnight navy background with radial lighting and subtle animated ambient wave lines.
- [x] **Procedural 3D Safety Razor Blade (Three.js)**:
  - Extruded 3D geometry with iconic double-edge cutouts (center arbor hole, horizontal slots, alignment notches, and corner tabs).
  - Honed and beveled cutting edge strips with high specular highlight.
  - Micro-engraved branding canvas texture (`BLADETRACK • PLATINUM • STAINLESS STEEL`).
- [x] **Fluid Wave Ripples & Vortex**: Undulating concentric wireframe wave mesh beneath the blade mirroring fluid ripples in perspective.
- [x] **Blade Wear Material Simulation**: Procedural transition from glistening mirror chrome (`#f8fafc`) when fresh to dull bronze/copper patina as blade usage approaches maximum capacity.
- [x] **Interactive 3D Controls**: Smooth floating/bobbing idle animation with interactive mouse and touch drag to inspect/spin the blade.
- [x] **"LOG SHAVE" Action**: Glowing pill button with intense cyan neon glow; clicking triggers a rapid 360° spin, flash lighting, bump counter animation, and outward ripple shockwave.
- [x] **Inline History List**: Below the button, showing active and past blade usage with bullseye ring indicators (cyan for active, amber for past), dates, shave usage counts, and percentage badges.
- [x] **Reliable Reset Options**:
  - Top-left header reset button (`↺`) opening a custom confirmation modal (no browser-blocked `window.confirm()`).
  - Option to reset current blade to 0 shaves (restores pristine chrome blade shine).
  - Option to reset all lifetime data and history.
  - Dedicated reset buttons inside the settings bottom sheet and history drawer.
- [x] **Clean, Single-Day Focus**: Streamlined header with no multi-day tab clutter.
- [x] **Slide-Out Blade History Drawer**: Shows historical blade usage logs and start/end dates.
- [x] **Configurable Shaves Per Blade**: Tap the subtitle `"of 30 shaves"` to open the bottom sheet to increase/decrease the threshold (1–99).
- [x] **Automatic Blade Replacement Alert**: Triggers celebratory confetti animation and guidance when the blade reaches its shave limit.
- [x] **100% localStorage Persistence**: Stored under key `bladetrack_data`.
- [x] **Mobile-First Responsive Layout**: Optimized for 480px max-width phones up to desktop screens.

### Potential Enhancements
- [ ] PWA support (`manifest.json` + service worker for offline installation)
- [ ] Export / import data (JSON backup)
- [ ] Custom blade profiles (different razors, e.g., DE Safety Razor vs. Cartridge)
- [ ] Individual shave date timestamp logging

## File Structure

```
shaving_count/
├── index.html    # App shell, Three.js script tags, modals & drawers
├── styles.css    # Dark navy theme, wave lines, glowing cyan UI, responsive rules
├── app.js        # Three.js 3D blade & wave ripples, app logic, localStorage
├── CLAUDE.md     # Project documentation & reference
└── example/
    └── water_tracker.gif # Visual reference for UI & fluid animations
```

## Architecture

- **No framework, no build step.** Open `index.html` directly or serve with any static server.
- **State** is stored in localStorage under key `bladetrack_data`.
- **Data shape:**
  ```json
  {
    "maxShaves": 30,
    "currentShaves": 0,
    "totalShaves": 0,
    "totalBlades": 0,
    "currentBladeStart": "2026-11-16T10:00:00.000Z",
    "history": [
      {
        "bladeNumber": 1,
        "shaves": 30,
        "startDate": "2026-10-15T08:00:00.000Z",
        "endDate": "2026-11-15T08:00:00.000Z"
      }
    ]
  }
  ```

## Running Locally

```bash
cd shaving_count
python3 -m http.server 8080
# Open http://localhost:8080
```

## Design Decisions

- **Water-tracker inspired fluid atmosphere**: Midnight navy tones (`#07162b` to `#040d1b`) with cyan glow (`#00d4ff`) to maintain a calming bathroom-ready experience with low glare.
- **3D razor blade center visual**: Built with Three.js `ExtrudeGeometry` using clean, non-intersecting 2D paths to prevent polygon triangulation artifacts across all browsers.
- **Unblockable custom modals**: Replaced native browser `confirm()` popups with custom HTML modals to ensure reset actions never get suppressed by browser popup blockers or iframe permissions.
- **Single-day focus**: Removed multi-day switching tabs to keep the interface direct, uncluttered, and focused on current blade health.
