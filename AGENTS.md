# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Project Design Decisions

- The core statement is “万物皆为代码 / Everything is code.” Code is a philosophical metaphor for rules, state, inputs, feedback, causality, and evolution.
- The site is a personal thought publication covering technology, human nature, society, value investing, and the self. Career history remains brief context.
- The selected visual direction is the warm ivory “World Compiler” editorial mock in `design/world-compiler-expanded.png`.
- The machine rests as a self-contained compact enclosure with no pedestal or base. The enclosure opens as independent left and right shell halves with a smoked-glass back plane.
- INPUT, RULES, STATE, OUTPUT, the continuous shaft, and the stone persist through compact and expanded states. Every component has one reversible transform; no endpoint image swaps or staged visibility reveals are used.
- The enclosure, glass frames, stone, and all four 3D assemblies open together through the original critically damped spring timing. Leaving or blurring reverses from the current spring position and velocity with no endpoint jump.
- The unified 3D canvas owns the compact-shell viewport clip so the enclosure physically occludes internal geometry while opening. The photographed glass frames retain their own fixed masks and move on the same master progress.
- The four glass frames end at the intended rail height with all bottom support assemblies removed. OUTPUT contains only its sphere, shaft connection, label frame, and two glass rails; no residual pixels remain beneath the sphere.
- All four glass frames form closed rounded rectangles with a thin photographed lower edge; the closure adds no pedestal, feet, or support assemblies.
- The machine occupies a larger share of the desktop right column while preserving the editorial copy column and mobile composition.
- The compact enclosure must read as one complete metal shell. Its lower-left side wall and front bezel meet through a continuous brushed-aluminum corner with a firm silhouette; pale low-alpha pixels must not dissolve into the paper background.
- The compact enclosure is a perspective parallelogram. Its exterior lower edge rises about 14px from left to right across the 364px front span (roughly -3.85% in image coordinates), with a continuous beveled-metal silhouette and no horizontal alpha cutoff.
- The lower-left depth-shell to front-bezel transition must remain one smooth convex contour. Its alpha boundary cannot step outward between adjacent rows or leave a pale notch; the generated lower bevel must overlap the retained source shell through that transition.
- The compact enclosure's entire lower front apron must read as one fully opaque brushed-aluminum volume. It keeps a visible warm-silver midtone and a restrained dark underside bevel against the ivory page so the lower-left corner, center span, and right rounded corner remain visually complete.
- INPUT, RULES, STATE, and OUTPUT are complete parametric Three.js assemblies in one shared scene. Raster rotor slices, partial image rotations, and separate overlay mechanisms are excluded from the internal motion pipeline.
- A single world-X main shaft runs left to right through all four assemblies. The orthographic camera stays near `(3, 0, 18)`, keeping the visual azimuth around 8–11 degrees so the shared shaft reads left to right while preserving restrained component depth.
- Every rotating body is parented to a rotor group whose local axis is world X. Coaxial connected bodies share angular velocity; assembly separation travels only along world X.
- RULES uses a 48-tooth main gear and 14-tooth upper/lower pinions at the exact external-gear ratio `−48/14`, including fixed mesh-phase offsets. OUTPUT retains its 14:24 reduction ratio.
- A warm key, camera-side rim, lower brass fill, room environment, hemisphere light, and ambient fill stay fixed in world space. Rotating PBR geometry changes normals and highlights under those lights while the depth buffer owns self-occlusion.
- The shared React mechanism clock writes absolute phase into the 3D rotor hierarchy and pauses during reassembly, offscreen, page-hidden, or reduced-motion.
- Rendering caps desktop DPR at 2 and mobile DPR at 1.5, limits continuous expanded rendering to 30 fps with elapsed-time phase integration, uses no transmission pass, and targets at most 60 draw calls per frame. Three.js and its environment/geometry helpers remain dynamically imported outside the initial React bundle.
- INPUT's rotating locator reads as a small deep-brass engraved notch. It stays visible as a restrained motion cue without becoming an isolated black dot at any phase.
- Visual constraints: premium editorial whitespace, restrained brass/glass/aluminum materials, no portraits, no neon AI palette, and no resume-style information density.
