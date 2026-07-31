# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Project Design Decisions

- The core statement is “万物皆为代码 / Everything is code.” Code is a philosophical metaphor for rules, state, inputs, feedback, causality, and evolution.
- The site is a personal thought publication covering technology, human nature, society, value investing, and the self. Career history remains brief context.
- The “Causal Armillary” remains the interaction and structural direction, with the current live implementation as the accepted anatomy, endpoint-state, editorial-layout, and visual-quality baseline.
- The World Compiler is a pedestal-free armillary centered on a rough stone. Nested AXIOM, MODEL, SYSTEM, and WORLD rings and two crescent shell halves form one compact spherical instrument at rest.
- The default state is fully closed. Pointer entry expands the rings and shell halves to the selected mock; pointer leave reverses from the current progress and velocity until the instrument is closed again.
- The closed endpoint uses a compact spherical silhouette with convex brushed-silver and perforated-brass hemispheres, a prominent layered bearing, a visible equatorial shaft, precise seams, cratered stone, and a soft suspended contact shadow.
- In the closed endpoint, the equatorial shaft retracts inside the spherical shell and remains visible only through the center bearing; it extends continuously to the shell halves during expansion.
- The metal palette follows the selected reference: warm champagne silver for broad faces, quiet aged brass for accents and latticework, brown-black graphite for mechanical depth, and warm cream highlights. Cool white metal and saturated yellow-gold are excluded.
- Pointer movement across the component drives a noticeable but controlled perspective-plane tilt of the whole instrument, capped at ±4° pitch and ±5° yaw on desktop. The tilt follows local pointer position with inertia, stays independent from expansion progress, and springs back to neutral on leave.
- The armillary maintains a photographic material standard: broad beveled ring bands, visible metal layering, recessed fasteners, perforation depth, engraved micro-lines, and a mechanically detailed center bearing.
- Ring names describe nested ontological levels rather than a sequential compiler pipeline. English labels are shallow metal/enamel inlays physically embedded in each ring and rotate with that ring; floating camera-facing labels are excluded.
- The ring hierarchy reads from inside out as AXIOM → MODEL → SYSTEM → WORLD: axioms underlie models, models organize systems, and systems compose the world.
- Every visible part persists through both endpoints and has one reversible transform. Endpoint image swaps, staged visibility reveals, and loose fragments are excluded.
- The machine occupies a large share of the desktop right column while preserving the editorial copy column and mobile composition.
- The expanded machine keeps visible horizontal safety margins at the desktop breakpoint and at both pointer-tilt extremes; shell and axle ends never touch the canvas crop.
- The shell, rings, bearing, shaft, fasteners, and stone must remain materially distinct under visible fixed lighting, with curved metal surfaces, brushed roughness, controlled gloss, and shadowed recesses.
- The mechanism uses complete parametric Three.js assemblies in one shared scene. Repeated pins may be instanced; raster rotor slices and separate overlay mechanisms are excluded.
- A warm key, camera-side rim, lower brass fill, room environment, hemisphere light, and ambient fill stay fixed in world space. Rotating PBR geometry changes normals and highlights under those lights while the depth buffer owns self-occlusion.
- The shared React motion clock pauses offscreen, page-hidden, or under reduced motion. Reduced motion removes pointer-follow tilt and uses a stable compact presentation.
- Rendering caps desktop DPR at 2 and mobile DPR at 1.5, renders only while an expansion or tilt spring is active, uses elapsed-time integration and no transmission pass, and targets at most 60 draw calls per frame. Three.js and its environment/geometry helpers remain dynamically imported outside the initial React bundle.
- Visual constraints: premium editorial whitespace, restrained brass/glass/aluminum materials, no portraits, no neon AI palette, and no resume-style information density.
