# World Compiler design QA — unified horizontal-shaft 3D mechanism

## Comparison target

- Visual source: `design/world-compiler-expanded.png` (1536 × 1024).
- User-reported failure: `/Users/liuxiaochen/.codex/attachments/e12539f8-cf73-4a1b-a3ea-fdb071e4a9a5/image-1.png`; raster rotor slices produced white crescent discontinuities between RULES and STATE.
- Final desktop compact: `design/qa-v24-3d-compact.png` (1280 × 720).
- Final desktop expanded: `design/qa-v24-3d-expanded.png` (1280 × 720).
- Final phase pair: `design/qa-v24-3d-phase-a.png` and `design/qa-v24-3d-phase-b.png`.
- Final mobile expanded: `design/qa-v24-3d-mobile-expanded.png` (390 × 844).
- Normalized reference comparison: `design/qa-v24-3d-reference-comparison.png`.
- Browser URL: `http://localhost:5173/`.

## Combined comparison review

The source and implementation were aspect-fitted into equal 960 × 640 panels in `design/qa-v24-3d-reference-comparison.png` and reviewed together.

- Layout hierarchy, warm ivory palette, typography, copy column, four named frames, stone, and one continuous horizontal shaft remain aligned with the source.
- The compact enclosure, removed pedestal/support assemblies, closed frame bottoms, and right-column scale follow the durable project constraints in `AGENTS.md`.
- INPUT, RULES, STATE, and OUTPUT now read as coherent whole mechanisms with continuous silhouettes. The reported white crescents and sliced-image boundaries are absent.
- RULES and STATE use a deliberately cleaner parametric model than the photographic source. Their main gear/drum anatomy, axial order, metal palette, and scale remain legible at normal page size.

## Findings

- No actionable P0, P1, or P2 findings remain.
- [P3] RULES has lower micro-mechanical density than the photographed source.
  - The live model keeps the primary gear, coaxial front stages, exact counter-rotating pinions, support yoke, bearings, and shaft connection.
  - More fastener-level detail would add GPU cost without changing the shaft physics or normal page-scale silhouette.
- [P3] OUTPUT remains more geometric than the source's photographed organic lattice.
  - Its irregular dual-icosphere topology is a complete spatial body with depth-tested self-occlusion and stable rigid rotation.

## Interaction verification

- Desktop hover/focus expansion and blur/leave reassembly use the original critically damped spring with frequency `7.5`.
- Shell halves, glass frames, stone, and all four 3D assemblies move concurrently through broad overlapping ranges. There is no sequential part-by-part delay.
- The controller keeps one live `progress` and `velocity`; changing the target during motion reverses the current spring trajectory without resetting the pose.
- Touch and pen activate the same reversible target through pointer release.
- Reduced-motion users receive immediate endpoint placement and a stopped mechanism clock.
- The mechanism clock ramps only after separation and pauses while reassembling, offscreen, page-hidden, or reduced-motion.

## 3D and physical verification

- One transparent Three.js canvas contains the continuous shaft and all four assemblies. No raster rotor slice participates in internal rotation.
- The shaft is a world-X cylinder crossing INPUT, RULES, STATE, and OUTPUT from left to right.
- The orthographic camera at `(3, 0, 18)` keeps the visual azimuth near 9.5 degrees, so the shared world-X shaft reads clearly from left to right while the assemblies retain restrained depth.
- INPUT and STATE rotate as complete rigid groups at the master angular velocity.
- RULES uses a 48-tooth main gear and 14-tooth upper/lower pinions. The pinion angular ratio is exactly `−48/14`; coaxial stages share the main angular velocity.
- OUTPUT rotates as one complete lattice group at the `14/24` shaft reduction ratio.
- Fixed world-space key, rim, fill, hemisphere, ambient, and room-environment lighting changes highlights through rotating surface normals. The depth buffer provides spatial occlusion.
- A compact-shell clip follows the spring progress from the measured enclosure inset to `inset(0%)`, so hidden geometry remains physically behind the casing during opening.

## Resolution, responsive layout, and runtime

- Desktop CSS canvas: 807 × 569; backing canvas: 1614 × 1138; measured ratio: 2.001× and 1,836,732 pixels per frame.
- Renderer scaling caps desktop DPR at 2 and mobile DPR at 1.5.
- Continuous expanded rendering is capped at 30 fps with elapsed-time phase integration. MSAA, the forced high-performance GPU preference, and the transmission pass are disabled.
- OUTPUT uses approximately 25,200 triangles; the full scene is statically estimated at approximately 57 draw calls per frame.
- Mobile viewport: `innerWidth === scrollWidth === 390`; no horizontal overflow.
- Three.js, RoomEnvironment, and BufferGeometryUtils load dynamically with the World Compiler feature.
- Fresh final browser session: no errors or warnings.
- Production build: passed with Vite 6.4.2.

## Implementation checklist

- [x] One left-to-right world-X shaft.
- [x] Complete 3D INPUT, RULES, STATE, and OUTPUT assemblies.
- [x] No rotating raster slices or disconnected image fragments.
- [x] Exact external-gear ratio and coaxial angular-velocity ownership.
- [x] Fixed world-space PBR lighting and depth-tested occlusion.
- [x] Concurrent, smooth, reversible compact/expanded motion.
- [x] Desktop DPR capped at 2 and mobile DPR capped at 1.5.
- [x] Continuous expanded rendering capped at 30 fps.
- [x] Desktop and 390px mobile browser verification.
- [x] Combined source/implementation visual review.
- [x] Production build and clean browser console.

final result: passed
