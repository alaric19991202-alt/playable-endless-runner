# Runner Clone Project Documentation

## Purpose and scope
This project is a browser-based runner game built with PixiJS and TypeScript. The design is optimized for a fast-loading, full-screen playable experience with integrated call-to-action (CTA) flows for ad delivery. The codebase keeps runtime logic in a small set of modules, uses a single canvas for all rendering, and embeds assets for single-file distribution when needed.

## Repository layout
- `index.html`: Host page that mounts the Pixi canvas and provides a default `data-cta-url`.
- `src/main.ts`: Application entry point.
- `src/game/Game.ts`: Runtime orchestrator (Pixi app, asset loading, input, ticker).
- `src/game/RunnerWorld.ts`: Core gameplay loop and simulation.
- `src/game/UI.ts`: HUD, overlays, CTA panel, and visual effects.
- `src/game/Input.ts`: Pointer and keyboard input handling.
- `src/game/assets.ts`: Asset manifest and loader, plus font loading.
- `src/game/layout.ts`: Responsive layout and scaling utilities.
- `src/game/state.ts`: Game state model and phase enum.
- `assets/Assets`: Source art and font files.
- `tools/pack-assets-to-window.mjs`: Copies assets into `dist` for external loading.
- `tools/inline-into-html.mjs`: Inlines JS and embeds assets and font into `dist/index.html`.
- `refer/Refer`: Reference screenshots for layout and UI alignment.

## Runtime architecture
### Entry and initialization
1. `src/main.ts` locates `#app` and instantiates `Game`, then calls `start()`.
2. `Game` initializes `PIXI.Application`, attaches the canvas, loads the font and textures, then builds:
   - `RunnerWorld` for simulation and rendering.
   - `UI` for HUD and overlays.
3. Input is attached to the canvas and the ticker is started.

### Game loop
Each frame (ticker):
1. Compute delta time.
2. `Input.update()` (currently a no-op, reserved for future use).
3. `RunnerWorld.update()` advances simulation and state.
4. Input is blocked or unblocked based on the current phase.
5. `UI.update()` renders HUD, overlays, and effects based on state.

This order ensures the world updates state first and the UI reflects the latest phase, counters, and timers in the same frame.

### Scene graph and layering
`RunnerWorld` builds a dedicated container with three layers:
1. Background layer: road sprite and parallax trees/streetlights.
2. Finish layer: finish line sprite.
3. Actor layer: player, enemies, warnings, and money pickups.

`UI` is a separate container added above the world. All UI is rendered in Pixi, not in the DOM.

## State model and phase flow
The state object (`src/game/state.ts`) is shared between `RunnerWorld` and `UI`:
- `phase`: `"start" | "tutorial" | "playing" | "fail" | "cta" | "success" | "ctaPanel"`
- `lives`, `money`, `payAmount`: gameplay and reward metrics.
- `toastText`, `toastTimer`: transient feedback.
- `damageTimer`, `failBadgeTimer`: visual effects.
- `countdown`: overlay countdown value.

Phase transitions:
- `start` -> `playing`: first tap or key press.
- `playing` -> `tutorial`: first enemy is staged near the player; world updates pause.
- `tutorial` -> `playing`: player jumps; tutorial obstacle is dismissed.
- `playing` -> `fail`: lives reach zero; fail badge shows, then phase advances to CTA.
- `fail` -> `cta`: automatic after `failBadgeTimer` elapses.
- `playing` -> `success`: player reaches finish line; success overlay appears.
- Any -> `ctaPanel`: install sheet overlay is opened from HUD (download button).
- `ctaPanel` -> previous phase: install sheet is closed.

Input is blocked in `fail`, `cta`, `success`, and `ctaPanel`. The flow is designed to funnel the player into CTA actions rather than continuous restarts.

## Gameplay systems
### Player movement and jumping
The player is fixed on the X axis and moves vertically by jumping:
- Gravity and jump velocity are scaled by `layout.unit`.
- Jump consists of start, air, and landing phases for animation control.
- Landing safety timers prevent warnings from spawning directly under the player.

### Obstacles
Two obstacle types:
- `enemy`: animated sprite that causes damage.
- `warning`: static hazard sprite that also causes damage.

Collision uses bounding boxes with a configurable overlap factor to tune forgiveness. Obstacles are destroyed when they leave the screen to avoid memory growth.

### Pickups
Money pickups spawn as singles or short patterns. Each pickup:
- Oscillates vertically for visual motion.
- Adds to `state.money` and triggers a short "Fantastic!" toast.

### Intro gating and tutorial
Early gameplay gradually unlocks enemies:
- Player must dodge a small number of warnings and collect a money target.
- Before that, only warnings and money appear.
The tutorial is a single-step pause: the world freezes when an enemy is close, and the player must jump to continue. `updateTutorial()` is currently a stub, ready for expansion.

### Win and loss
The finish line spawns after a distance threshold; crossing it triggers success. On success or fail, obstacles and pickups are cleared to ensure a clean overlay presentation.

## UI and UX approach
### HUD
The HUD includes:
- Lives as heart shapes.
- Money panel with PayPal branding.
- Start/tutorial message and a tutoring hand sprite.
- Download button with animated glow.

Elements scale and reposition based on portrait vs landscape layout.

### CTA and success overlays
Two overlays are used:
- Fail CTA: "You didn't make it!" with reward card and countdown.
- Success CTA: "Congratulations!" with reward card, countdown, shine, and confetti.

Both overlays use dimmed backgrounds and a subtle spotlight. Buttons pulse to attract attention.

### Install sheet (ctaPanel)
The install overlay is a sheet that slides up with a back-ease animation, mirroring common app-store patterns. It includes:
- App icon and title.
- Connect and GET buttons.
- Close button that returns to the previous phase.

## Input handling
`Input` supports:
- Pointer down/up for tap to jump.
- Swipe up to jump.
- Keyboard: Space, ArrowUp, or W to jump.

Left/right lane movement handlers exist in the interface, but are not currently triggered. The world is configured for a single lane, so lateral movement is intentionally inactive.

## Layout and scaling
`computeLayout()` treats the current viewport as the design size and derives a `unit` from a 1280px height reference. All gameplay and UI dimensions are scaled against `unit` to maintain consistent feel across devices.

The layout module keeps the option open for a fixed design resolution if needed (commented in `src/game/layout.ts`).

## Assets and rendering
`src/game/assets.ts` defines a typed asset map. The loader:
- Uses embedded assets when `window.__EMBEDDED_ASSETS__` is present.
- Falls back to external files under `assets/Assets`.

The font is loaded with the `FontFace` API under the name `PlayFont`, and is embedded when `__EMBEDDED_FONT__` is set.

## CTA integration
CTA URLs are resolved in this order:
1. `window.clickTag`
2. `window.clickTag1`
3. `window.CTA_URL`
4. `document.body.dataset.ctaUrl`

The click action attempts `mraid.open` or `ExitApi.exit` when available, and falls back to `window.open` or full-page navigation.

## Build and packaging pipeline
Scripts in `package.json`:
- `npm run dev`: esbuild dev server with sourcemaps.
- `npm run build:js`: bundle and minify to `dist/bundle.js` as an IIFE (`RunnerGame`).
- `npm run assets:pack`: copy `assets/Assets` to `dist/assets/Assets`.
- `npm run build:html`: inline JS and embed assets and font into `dist/index.html`.
- `npm run build`: full production pipeline.

The inline step produces a single HTML file with embedded assets and font data, suited for distribution where external file hosting is not available.

## Extension points
Areas that are ready for expansion:
- Multiple lanes: `RunnerWorld` already has lane helpers, `Input` exposes lane handlers.
- Tutorial logic: `updateTutorial()` is a dedicated hook.
- New obstacles and pickups: add to `assetUrls`, then extend spawners.
- UI branding: update copy, color palettes, and button styles in `UI.ts`.

## Constraints and known limitations
- The world currently uses a single lane; lateral swipes are unused.
- Restart flow is not exposed after fail or success; the intended UX is CTA-first.
- `computeLayout()` uses the current viewport as the design size, so `layout.scale` is effectively 1 unless the design resolution is changed.

## Quick start
1. `npm install`
2. `npm run dev`
3. Open the served `index.html` in a browser.

For production output, run `npm run build` and use `dist/index.html`.
