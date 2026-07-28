# World Compiler design QA — Causal Armillary

## Comparison target

- Default source: `design/world-compiler-causal-armillary-closed.png` (1536 × 1024).
- Expanded source: `design/world-compiler-causal-armillary-expanded.png` (1536 × 1024).
- Editorial source: `design/world-compiler-expanded.png` (1536 × 1024).
- Browser default: `design/qa-causal-armillary-closed.png` (1536 × 1024).
- Browser expanded: `design/qa-causal-armillary-expanded.png` (1536 × 1024).
- Mobile browser: `design/qa-causal-armillary-mobile.png` (390 × 844).
- Combined reviews: `design/qa-causal-armillary-closed-comparison.jpg` and `design/qa-causal-armillary-expanded-comparison.jpg`.
- Local preview: `http://localhost:4173/`.

## Combined comparison review

The source and browser captures were placed side by side at identical 1536 × 1024 viewports and inspected together.

- The warm ivory editorial frame, headline scale, copy rhythm, action hierarchy, hero/index boundary, and right-column instrument scale match the selected direction.
- The default state reads as one compact circular instrument with silver and perforated brass shell halves, central stone, restrained contact shadow, and a clean silhouette.
- The expanded state keeps every visible part in one continuous 3D scene. Both shell halves travel outward while AXIOM, MODEL, SYSTEM, and WORLD become spatially distinct around the shared shaft.
- WORLD now uses broad top and bottom engraved segments with paired metal rails across its open sides, which restores the lighter armillary silhouette of the selected source.
- All four English names are shallow geometric metal/enamel inlays embedded flush with their ring faces. They inherit ring depth, rotation, lighting, and occlusion instead of facing the camera independently.
- Brushed bump detail, beveled band faces, dual edge rails, recessed rivets, outer clamps, dark perforation cavities, shell grooves, shaft collars, and a layered central bearing raise the real-time material reading at normal page size.

## Findings

- No actionable P0, P1, or P2 findings remain.
- [P3] The generated source retains finer stochastic wear and irregular hand-machined surface variation than the real-time parametric model.
  - The live implementation now carries the same broad material hierarchy and mechanical anatomy through real geometry, surface maps, fixed world lighting, and depth-tested occlusion.
  - The remaining difference is visible mainly in the focused 2× comparison crop rather than the normal page composition.
- [P3] The in-app browser coordinate mover does not expose a persistent CSS `:hover` state.
  - The expanded visual endpoint was verified through the component's equivalent keyboard/focus path.
  - The production pointer path uses native `mouseenter`, `mousemove`, and `mouseleave` handlers that call the same spring target and tilt controller.

## Interaction verification

- Default state is closed; pointer entry targets expansion and pointer leave targets reassembly.
- Expansion and tilt use independent critically damped springs. A direction change keeps current progress and velocity, so reversal has no endpoint jump.
- Pointer position maps to a restrained whole-plane `rotateX`/`rotateY` transform; leaving springs both axes back to neutral.
- Keyboard focus activates the expanded state and blur reassembles it. Touch and pen toggle the same target on pointer release.
- The bilingual hint, `aria-pressed`, loading state, focus indicator, and reduced-motion path are present.
- Locale toggle changed the page language, title, and control label in browser verification.
- The primary Explore Essays link navigated to `#essays` and aligned the target section with the viewport.

## Runtime and responsive verification

- One transparent Three.js canvas owns the shell halves, four ring assemblies, embedded labels, shared shaft, markers, bearing, stone, shadows, and lighting.
- Repeated perforations and markers are instanced. The scene remains below the 60-draw-call target by construction.
- The renderer caps DPR at 2 on desktop and 1.5 on mobile. It renders only while an expansion or tilt spring is active, then returns to a stopped state.
- Rendering pauses offscreen and while the page is hidden. Reduced-motion keeps a stable compact instrument and neutral tilt.
- Three.js and `RoomEnvironment` remain behind the lazy World Compiler boundary; the initial React bundle excludes the 3D runtime.
- Desktop viewport: 1536 × 1024 with zero horizontal overflow.
- Mobile viewport: 390 × 844 with `scrollWidth === innerWidth === 390`.
- Fresh final browser session: default closed state ready, one main, one canvas, no console errors or warnings.
- Production build: passed with Vite 6.4.2.

## Cleanup verification

- The previous `src/WorldCompiler.jsx`, `src/MachineStage3D.jsx`, raster runtime layers, generated part slices, old QA scripts, old QA captures, and obsolete motion notes were removed.
- Page content, application layout, World Compiler interaction, Three.js stage, and responsive styles now live in focused modules.
- `git diff --check` passes.

final result: passed
