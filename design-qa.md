# Design QA — World Compiler

## Source of truth

- Closed state: `design/world-compiler-collapsed.png`
- Expanded state: `design/world-compiler-expanded.png`
- Motion reference: Apple iPad Pro product page, captured at `design/apple-ipad-pro-reference.png`

## Final evidence

- Compact implementation: `design/prototype-v4-final-compact.png`
- Expanded implementation: `design/prototype-v4-final-expanded.png`
- Compact machine comparison: `design/qa-v4-compact-comparison.png`
- Expanded machine comparison: `design/qa-v4-expanded-comparison.png`
- INPUT source/old/new asset comparison: `design/qa-v5-input-assets.png`
- Motion contact sheet: `design/qa-v5-motion-contact-sheet.png`
- Closed-frame compact/expanded endpoints: `design/qa-v6-endpoints-contact-sheet.png`
- Full-machine gear cycle: `design/qa-v6-gear-motion-contact-sheet.png`
- RULES neutral reconstruction: `design/qa-v6-rules-reconstruction.png`
- Closed-frame lower-edge details: `design/qa-v6-closed-frame-bottoms.png`
- OUTPUT detail inspection: `/tmp/output-v4-close.png`

## Verification

- The current brief removes the pedestal and all four bottom support assemblies from both endpoints.
- Eleven persistent moving parts cover the continuous shaft, stone, INPUT rotor and guide, RULES core, STATE core, OUTPUT core, and four labeled glass frames. Each part owns one compact transform and one expanded transform.
- Two shell halves and two smoked-glass back-plane halves form the compact enclosure. Their three-pixel seam overlap keeps the rest endpoint registered at fractional responsive widths.
- Each moving part has an independent fixed-coordinate clip layer. Compact occlusion and expanded disclosure preserve the same asset throughout the timeline.
- The OUTPUT core alpha ends at y=371 and the OUTPUT glass frame alpha ends at y=411. Both assets contain zero pixels below those limits.
- Nineteen WebP assets preload before interaction. The scene and controls enable together after every image, including both CSS mask probes, finishes decoding; an asset failure enters one unified fallback state.
- The shaft layer contains only the isolated INPUT lead-in and the 10px RULES→STATE bridge. Its alpha footprint is 319 pixels, with no full-width paper band or duplicated mechanism fragments.
- The asset builder copies sixteen checked-in source assets from `design/world-compiler-parts-v4-sources`, regenerates the shaft, rock, and split back plane, and removes historical outputs, so a clean `parts-v4` directory is reproducible.
- A single scalar progress samples paused WAAPI effects. The critically damped spring retains current position and velocity when the target changes.
- A browser stress sequence reversed direction after 100 ms, 80 ms, and 60 ms intervals, then settled to the exact compact transforms with casing opacity 1.
- Compositor hints are active only while the spring is moving and release after either endpoint settles.
- Hover, focus, touch, pen, blur, and reduced-motion behavior share the same endpoint mapping.
- Combined source/implementation comparisons show aligned shaft order, panel order, mechanism scale, and perspective after the intentional base/support removal. Visual review found no P0, P1, or P2 issues.
- `npm run build` passes. Browser-rendered verification completed in Pass 16 at 1280×720, DPR 2.

## Iteration history

### Pass 1

- P1: the procedural Three.js machine visibly approximated the selected photoreal asset. Replaced it with source-grounded render frames.
- P2: the headline overflowed into the machine column. Added clipping and an explicit machine stacking context.
- P2: the CTA and social links shared one row. Restored the vertical rhythm from the reference.

### Pass 2

- P1: five independently generated frames produced visible geometry changes during crossfades. Replaced them with predecoded H.264 motion sequences.
- P2: the opaque media background exposed the crop boundary. Normalized media backgrounds to the site paper color.

### Pass 3

- P1: interpolated video preserved the geometry mismatch and introduced a decode-path switch during rapid reversal. Replaced the videos with a single-source layered scene.
- P2: rectangular image slices left pale seams during motion. Replaced them with soft-alpha full-canvas WebP layers.
- P2: the cleaned expanded base looked too bright in the compact state. Added source-accurate compact and expanded base layers with an early crossfade.

### Pass 4

- P0: none.
- P1: none.
- P2: none.
- P3: keyboard focus intentionally shows the brass outline; pointer hover presents the same motion without that accessibility indicator.

### Pass 5

- P2: the compact and expanded bases entered the early crossfade with different width, center, and height. Recalculated both transform paths from their measured alpha bounds and delayed the texture swap until the base geometry is identical.
- P0: none.
- P1: none.
- P2: none.

### Pass 6

- P1: the complete casing halves became transparent at 30% progress, leaving no visual successor for the outside borders. Added clipped edge relay layers that emerge under the casing bodies, move to the outer panels, and fade only after those panels are opaque.
- P1: crossfading two full base renders caused a temporary brightness drop and duplicate `WORLD COMPILER` labels. Replaced the pair with one always-opaque base render that transforms continuously between both measured sizes.
- P2: the original spring front-loaded the visible change. Reduced its frequency from 10 to 8 and staggered the panel, mechanism, and rock reveals across the opening sequence.
- P0: none.
- P1: none.
- P2: none.

### Pass 7

- P1: the four panel supports inherited their panel opacity and appeared abruptly on the base. Split them into clipped support layers, kept them continuously opaque behind the compact casing, and matched their transforms to the corresponding panels so they slide out and back under physical occlusion.
- P0: none.
- P1: none.
- P2: none.

### Pass 8

- P1: casing occlusion exposed all four supports together as the casing faded. Changed each support to unfold continuously from its panel's lower edge, staggered the center and outer pairs, and preserved exact hinge alignment while the panel scale changes.
- P0: none.
- P1: none.
- P2: none.

### Pass 9

- P1: four independently unfolded support assemblies still appeared to grow out of the base during the middle third of the timeline. Removed the assemblies and regenerated support-free panel WebPs.
- P1: clipped casing-edge relay layers stretched into tall metal bars between 40% and 60% progress. Removed the relay layers and kept the casing halves registered until fully transparent.
- P1: the glass panels became visible above the compact casing too early. Delayed and staggered their reveals so RULES and STATE emerge first, followed by INPUT and OUTPUT as the casing clears.
- P2: the expanded base gained a late full-image texture overlay. Removed the overlay so one base image remains continuously visible from both endpoints.
- P0: none.
- P1: none.
- P2: none.

# World Compiler visual QA

## Pass 10 — base perspective and panel contact cleanup

- Compact endpoint: use the dedicated collapsed-base source at its native geometry, trimming only the duplicated casing region at x=252–668 above y=445 while retaining the sloped base surface on both sides.
- Base transition: crossfade compact and expanded textures from 16%–32% while both layers occupy identical interpolated bounds.
- Expanded endpoint: settle every mechanism/panel layer by 35px, maintaining the shared shaft axis and meeting the measured base top at y=444–446.
- OUTPUT cleanup: constrain the bottom band to x=722–729 and x=835–848, retaining the intended glass legs and removing the adjacent 8px-wide support remnant.
- Verification: compact and expanded endpoint comparisons were regenerated at the same 1280 × 720 viewport; the OUTPUT remnant is absent, the glass legs meet the base, the compact casing/base geometry matches the source coordinate system, and the browser console is clear.

Pass 10 result: superseded by the base-free one-to-one rebuild.

## Pass 11 — base-free one-to-one rebuild

- P1: the compact enclosure and expanded assembly still relied on different stage compositions. Rebuilt the machine as persistent independent parts with measured endpoint transforms.
- P1: the parent clip surface could reveal stale base pixels during expansion. Replaced it with one fixed clip surface per moving part.
- P1: the compact shell had no physical depth behind its transparent window. Added an ImageGen-derived smoked-glass back plane and split it with the enclosure.
- P2: fractional page scaling could expose a center hairline between enclosure halves. Added a three-pixel overlap at the ownership seam.
- P0: none.
- P1: none.
- P2: none.

final result: passed

## Pass 12 — cold-load and asset-integrity hardening

- P1: image decoding ran asynchronously after the scene became visible. Gated visibility and interaction on one all-assets-decoded state with a unified load-error fallback.
- P1: the original shaft layer carried a 30px paper band and duplicated stage fragments. Rebuilt it from two isolated shaft sections totaling 319 alpha pixels.
- P1: generated casing and clean mechanism cores were not reproducible from an empty output directory. Added checked-in source assets and deterministic copy/regeneration steps.
- P2: permanent compositor hints retained 26 full-canvas layers. Scoped `will-change` to the active spring interval and released it at rest.
- P3: pointer cancellation could retain a stale touch/pen type. Added capture, cancel, lost-capture, and release cleanup.
- P0: none.
- P1: none.
- P2: none.

final result: passed

## Pass 13 — INPUT source-fidelity cleanup

- P1: the previous paper-color RGB threshold removed pale brass and glass highlights from the INPUT rotor and guide. Replaced both procedural masks with source-pixel-exact transparent assets.
- The INPUT rotor preserves 5,594 visible source pixels and the INPUT guide preserves 1,375 visible source pixels. Every retained pixel keeps its original RGBA value and coordinate; fully transparent pixels carry zero RGB.
- The builder now copies both checked-in clean INPUT assets directly and no longer contains the destructive paper-color threshold path.
- A source/old/new checkerboard comparison confirms the restored rotor rim, guide couplings, horizontal connectors, and vertical rail.
- The six-pixel casing/back-plane overlap remains visually continuous through progress 0.08. The expected opening gap begins progressively at progress 0.10.
- P0: none.
- P1: none.
- P2: none.

final result: passed

## Pass 14 — unified hover, focus, and touch intent

- P1: compatibility mouse events could compete with touch and pen toggles. Replaced mouse handlers with pointer handlers that admit only `pointerType="mouse"`; touch and pen remain isolated to pointer-up toggles.
- P2: hover leave and focus blur could independently retract the machine while the other intent remained active. Added one hover intent ref so the expanded target follows `mouse hover OR keyboard focus`, while touch and pen retain their explicit toggle state.
- The critically damped spring still changes only its target, preserving current position and velocity through every input handoff.
- P0: none.
- P1: none.
- P2: none.

final result: passed

## Pass 15 — closed frames, larger stage, and live RULES mechanism

Comparison setup:

- Source visual: `/Users/liuxiaochen/.codex/attachments/826fd08f-40cd-4289-be4f-4cb917cebcaf/image-1.png`.
- Static implementation evidence: `design/qa-v6-endpoints-contact-sheet.png` at the native 936×660 machine canvas, compact and expanded endpoints.
- Full-machine motion evidence: `design/qa-v6-gear-motion-contact-sheet.png`, eight evenly sampled gear phases.
- Focused evidence: `design/qa-v6-closed-frame-bottoms.png` and `design/qa-v6-rules-reconstruction.png`.
- Intended browser viewport: 1280×720 desktop, plus 950px stacked breakpoint and 640px mobile checks.
- Browser-rendered implementation screenshot: unavailable because the browser tabs were closed and local-preview navigation is disabled for this task.

- P1: all four photographed frames ended as open vertical rails. Rebuilt each asset as one closed rounded rectangle with a same-side photographed lower edge. The frames retain zero visible or hidden RGB pixels at y≥411.
- P1: the expanded assembly occupied too little of the desktop machine column. Rebalanced the hero tracks to 0.77/1.23, enlarged the scene to 109%, and shifted its center to 50.66% so the measured x=33–891 assembly footprint fits the interaction viewport without clipping.
- P1: the 921–946px two-column range could exceed the available content width. Moved the stacked hero breakpoint to 950px and restored exact scene centering in the stacked layout.
- P1: rotating the full RULES raster would move fixed shafts and expose a circular patch. Split two tight gear sprites behind a fixed aperture front layer; the neutral composite has 0.054960/255 full-canvas RGB MAE on paper, with differences confined to antialiased mask edges.
- The outer and inner gears use counter-moving 17-point sine keyframes over 6.4 seconds. Opening progress smoothly raises their playback rate; reassembly lowers it and freezes the current phase. Asset readiness, viewport intersection, page visibility, and reduced-motion preference gate playback without React render loops.
- Static endpoint QA confirms an expanded bbox of x=33–891 and y=87–466. Compact lower-edge clearance is 2.14px INPUT, 2.86px RULES, 8.28px STATE, and 3.54px OUTPUT; the compact composite remains visually closed and clean.
- Typography and copy: unchanged by Pass 15; browser-rendered wrapping and optical weight remain unverified.
- Spacing and layout: desktop track and scene geometry are numerically verified across the 950px breakpoint and the 1180px scene cap; browser-rendered composition remains unverified.
- Colors and tokens: the existing warm-ivory tokens are unchanged. Source-pixel RGB is preserved in the new frame and gear assets.
- Image quality: alpha hygiene, mask-edge reconstruction, frame perspective, and endpoint crops pass static pixel inspection.
- Interaction and accessibility: source review confirms keyboard activation, explicit reduced-motion handling, viewport/page visibility gating, and cleanup; runtime behavior and the browser console remain unverified.
- Deterministic spring tests reversed targets at 100/180/240/420ms while opening and 80/140/220/360ms while closing. Every reversal retained identical progress, velocity, gear rate, and gear phase at the target-change instant; both runs settled exactly to their requested endpoint. At 60Hz the largest gear-phase advance was 0.9375° per frame.
- Layout geometry sampled 320, 375, 640, 950, 951, 1024, 1180, 1181, 1280, 1440, 1728, 1920, 2000, and 2560px viewports. The measured expanded alpha footprint remains inside the machine column at every sample; the 1180px scene cap preserves at least 18.65px vertical clearance on wide screens.
- P0: none.
- P1: none in static QA.
- P2 blocker: a browser-rendered capture and interaction run are required to verify page-level proportion, rapid reversal, subpixel compositing, focus state, reduced motion, and console output.

final result: blocked

## Pass 16 — browser-rendered motion and endpoint verification

Comparison setup:

- Source visual: `/Users/liuxiaochen/.codex/attachments/826fd08f-40cd-4289-be4f-4cb917cebcaf/image-1.png`.
- Compact browser capture: `design/qa-v6-browser-compact.png`.
- Expanded browser capture: `design/qa-v6-browser-expanded.png`.
- Combined source/implementation comparison: `design/qa-v6-machine-source-comparison.png`.
- Browser viewport: 1280×720 at DPR 2, rendered in the user-authorized in-app browser.

- P1 resolved: the first local-preview session retained an older Vite module and stylesheet in browser cache, producing obsolete v5 composition and visible gear-mask probes. Restarted the Vite process and bumped the entry module and stylesheet cache keys. A cold reload now loads v6 machine assets with the current v7 stylesheet, hides both mask probes, and renders the clean compact and expanded endpoints.
- The combined comparison confirms source-aligned ordering, shaft axis, mechanism proportions, glass perspective, and warm-ivory integration. The implementation intentionally adds the four photographed lower rails and omits the removed pedestal/support assemblies. OUTPUT ends at its lower rail with no residual patch beneath the sphere.
- The expanded machine fills the right editorial column while keeping the stone and OUTPUT sphere inside the 750px machine border. The measured machine column is 739.98px wide and the 806.57px scaled scene remains visually contained by its clipped interaction region.
- Both RULES rotors changed computed transforms over a 320ms sample at expanded rest and moved in opposite directions. The outer sample changed from `matrix(0.998529, 0.108433, -0.0271082, 0.998529, 0, 0)` to `matrix(0.998773, 0.0990509, -0.0247627, 0.998773, 0, 0)`; the inner sample changed from `matrix(0.996468, -0.163156, 0.0432237, 0.996468, 0, 0)` to `matrix(0.997053, -0.149057, 0.0394885, 0.997053, 0, 0)`.
- A keyboard-focus stress run alternated the target five times at 120ms, 100ms, 80ms, and 60ms intervals. Casing, RULES, and OUTPUT matrices continued from their intermediate values at every reversal; no sample reset to either endpoint. The final open target settled with `data-expanded=true`, `data-moving=false`, casing opacity 0, and exact expanded panel transforms.
- Reassembly settled with `data-expanded=false` and `data-moving=false`. Outer and inner gear transform strings remained byte-identical across a subsequent 320ms sample, confirming phase-preserving freeze at the compact endpoint.
- All 19 runtime images report complete natural dimensions, the load gate reports `data-ready=true`, `aria-busy=false`, and the machine remains keyboard focusable with synchronized `aria-pressed` state.
- The browser environment reports `prefers-reduced-motion: reduce` as false. Source and deterministic checks confirm the preference path jumps directly to the selected endpoint and pauses both gear animations.
- The Vite error overlay is absent. Browser logs contain Vite connection messages and the React development notice only; there are no warnings, uncaught exceptions, failed resources, or asset decode errors after the cache-key correction.
- The 1280px rendered composition and prior 320–2560px geometry sweep cover the desktop, 950px stack transition, and narrow responsive rules without overflow or scene clipping.
- P0: none.
- P1: none.
- P2: none.

final result: passed

## Pass 17 — compact enclosure lower-left corner repair

Comparison setup:

- Source visual truth: `design/qa-v7-casing-repair-source-final.png`.
- Compact browser implementation: `design/qa-v7-compact-after.png`.
- Browser viewport and state: 1280×720 at DPR 2, compact rest state.
- Full-view iteration evidence: `design/qa-v7-compact-browser-before-after.png`.
- Focused source/browser comparison: `design/qa-v7-casing-source-browser-comparison.png`.
- Focused before/after evidence: `design/qa-v7-compact-corner-browser-before-after.png`.

- P1 resolved: the lower-left enclosure corner appeared incomplete at compact rest. Browser geometry, clipping, shell transforms, and the six-pixel left/right overlap were continuous; the defect came from `casing-left.webp` at canvas x=267–326/y=421–446, where the side-wall-to-bezel transition used paper-colored, low-alpha pixels and visually dissolved into the page.
- Repaired only the lower-left exterior metal transition. An ImageGen edit supplied a complete brushed-aluminum corner on a removable chroma background; the keyed result was aligned to the existing 936×660 casing geometry and feathered into the original source inside x=260–335/y=410–452. The inner gasket, opening, right half, seam overlap, material scale, and all motion coordinates remain unchanged.
- The checked-in source `design/world-compiler-parts-v4-sources/casing-left.webp` and runtime copy `public/world-compiler/parts-v4/casing-left.webp` have the same SHA-256 (`764fddc2d759ee954e0d74281854792809e20ed50c55c6bfc4ebdfc5033f7e0a`). Runtime asset and preload queries now use v7 so cold loads receive the repair.
- Focused comparison shows one continuous brushed-aluminum lower corner joining the depth shell to the front bezel. The triangular paper-colored dropout visible in the earlier browser capture is filled with the matching metal bevel and firm silhouette.
- Fonts and typography: unchanged.
- Spacing and layout rhythm: unchanged; the repaired asset retains the original x=267–462/y=193–446 alpha bounds.
- Colors and visual tokens: page tokens are unchanged; the repair uses the existing warm-silver casing palette.
- Image quality and asset fidelity: the corner remains photographic, antialiased, transparent, and free of chroma fringe at rendered size.
- Copy and content: unchanged.
- Interaction regression: keyboard focus expanded to `data-expanded=true`, `data-moving=false`, casing opacity 0; blur reassembled to `data-expanded=false`, `data-moving=false`, casing opacity 1. All images loaded, the Vite overlay was absent, and browser warning/error logs were empty.
- P0: none.
- P1: none.
- P2: none.

final result: passed

## Pass 18 — compact enclosure perspective lower edge

Comparison setup:

- Source visual truth: `design/world-compiler-collapsed.png`.
- Perspective measurement: `/tmp/world-compiler-slope-audit/03-shell-perspective-annotated.png` and `/tmp/world-compiler-slope-audit/04-lower-edge-repair-scope.png`.
- Compact browser implementation: `design/qa-v8-final-compact.png`.
- Opening, expanded, and reassembled evidence: `design/qa-v8-final-mid.png`, `design/qa-v8-final-expanded.png`, and `design/qa-v8-final-reclosed.png`.
- Combined source/browser comparison: `design/qa-v8-reference-browser-comparison.png`.
- Browser viewport and state: 1280×720 desktop, cold compact load followed by full opening and reassembly.

- P1 corrected: Pass 17 repaired the local lower-left color dropout while retaining the enclosure's horizontal alpha cutoff. The reference enclosure is a perspective quadrilateral whose exterior lower edge rises about 14px from left to right across the 364px front span, approximately -3.85% in source-image coordinates.
- Rebuilt one complete 936×660 casing mother image and split it back into both casing assets. The upper shell, left depth face, rounded corners, inner gasket, and three nested bezel layers retain their existing pixels; the generated repair is limited to the lower band beginning around y=437.
- The exterior lower contour now follows the measured source line, with the missing lower-left metal wedge restored and the right-hand contour trimmed upward. The lower face includes a continuous brushed-aluminum highlight, dark underside bevel, antialiased silhouette, and a rounded handoff into the right corner.
- Both source and runtime assets were replaced together. `casing-left.webp` and `casing-right.webp` preserve the 936×660 canvas and identical six-pixel RGBA overlap at x=457–462, preventing a center fold or fractional-pixel seam during motion.
- ImageGen supplied the clean support-free lower metal face on a chroma background. The built-in precise-object edit was keyed, perspective-warped to the measured line, and composited only beneath the retained source shell. Final source artifacts are `design/generated/world-compiler-casing-slope-v8-chroma.png`, `design/generated/world-compiler-casing-slope-v8.png`, and `design/generated/world-compiler-casing-v8-mother.png`.
- Runtime casing URLs use `?v=20260718-8`. A cold browser load reports both images complete with natural dimensions, no failed images, no Vite overlay, and no warning or error logs.
- The opening sample reports `aria-pressed=true` and `data-moving=true`; expanded rest reports `aria-pressed=true` and `data-moving=false`; reassembled rest reports `aria-pressed=false` and `data-moving=false`. The same casing selectors, transforms, and timing remain in use, so the new silhouette introduces no endpoint swap or visibility phase.
- The combined comparison shows the same upward-to-right lower-edge direction as the compact reference, with the intentional support-free enclosure resting directly in the editorial composition.
- Typography, copy, page spacing, color tokens, mechanism ordering, glass-panel geometry, shaft alignment, and gear motion are unchanged.
- P0: none.
- P1: none.
- P2: none.

final result: passed

## Pass 19 — lower-left contour completion

Comparison setup:

- Source visual truth: `design/world-compiler-collapsed.png`.
- Earlier browser implementation: `design/qa-v8-fill-before.png`.
- Revised browser implementation: `design/qa-v9-fill-after.png`.
- Focused browser before/after evidence: `design/qa-v9-fill-browser-before-after.png`.
- Combined source/browser comparison: `design/qa-v9-reference-browser-comparison.png`.
- Expanded and reassembled evidence: `design/qa-v9-fill-expanded.png` and `design/qa-v9-fill-reclosed-rest.png`.
- Browser viewport and state: 1280×720 desktop, compact cold load plus full opening and reassembly.

- P2 resolved: the v8 lower-left alpha contour stepped from x=277 at y=436 back outward to x=274 at y=437. The three-pixel reversal left a tiny pale notch where the depth shell met the new sloped front bevel.
- Extended the generated lower-bevel overlap upward from y=437 to y=430 while retaining the source shell on top. The resulting alpha boundary advances monotonically through x=270, 270, 271, 271, 272, 272, 273, 274, 274, 275, and 276 across y=430–440, completing one smooth convex transition.
- The exterior slope, lower metal texture, right rounded corner, inner gasket, three nested bezel layers, canvas dimensions, six-pixel center overlap, and animation selectors remain unchanged.
- Both 936×660 casing sources and runtime copies were regenerated together. The x=457–462 RGBA overlap is byte-identical, and source/runtime SHA-256 values match for both halves.
- Runtime casing URLs use `?v=20260718-9`; all images decoded successfully. Expanded rest and compact rest both settle with `data-moving=false`, browser warning/error logs are empty, the production build passes, and the local preview returns HTTP 200.
- Fonts and typography, spacing and page rhythm, colors and tokens, copy, mechanism imagery, glass-panel geometry, and responsive layout are unchanged.
- P0: none.
- P1: none.
- P2: none.

final result: passed

## Pass 20 — complete lower metal apron

Comparison setup:

- Original compact product reference: `design/world-compiler-collapsed.png`.
- Browser defect evidence: `design/audit-v9-bottom-occlusion/01-normal.png`.
- Isolated v9/v10 casing comparison: `design/audit-v9-bottom-occlusion/04-isolated-comparison.png`.
- Focused browser before/after evidence: `design/qa-v10-bottom-before-after.png`.
- Combined reference/browser comparison: `design/qa-v10-reference-browser-comparison.png`.
- Expanded and reassembled evidence: `design/audit-v9-bottom-occlusion/07-fixed-expanded.jpg` and `design/audit-v9-bottom-occlusion/08-fixed-reclosed.jpg`.
- Browser viewport and state: 1280×720 desktop, compact cold load followed by full opening and reassembly.

- P1 resolved: the compact enclosure's lower exterior still read as a missing piece. Browser inspection confirmed both casing layers at z-index 100, back plates at z-index 5, `clip-path: none`, `overflow: visible`, and more than 200px of clearance above the interaction container's clipping boundary. The apparent dropout came from the lower apron itself: its warm-silver face was too pale and locally low-alpha against `--paper: #f3eee5`.
- Rebuilt the complete lower exterior apron from approximately y=408 through the sloped lower edge. The repaired band joins the left depth shell, center front span, and right rounded corner as one solid brushed-aluminum volume, with a restrained dark underside bevel that preserves separation from the ivory page.
- The established parallelogram perspective remains unchanged. The lower edge continues to rise roughly 14px from left to right, and the lower-left alpha contour remains convex with no outward step, notch, or horizontal cutoff.
- The upper casing, inner opening, gasket stack, mechanism layout, glass-panel geometry, copy, typography, spacing, and motion coordinates remain unchanged. The generated layer was feathered into the retained casing only across the lower band.
- ImageGen built-in precise-object edit supplied `design/generated/world-compiler-casing-bottom-v10-chroma.png`; local chroma removal produced `design/generated/world-compiler-casing-bottom-v10-keyed.png`, alignment produced `design/generated/world-compiler-casing-bottom-v10-aligned.png`, and the final 936×660 mother asset is `design/generated/world-compiler-casing-v10-mother.png`.
- Both checked-in casing sources and runtime copies were regenerated together. Source/runtime SHA-256 values match: left `4f08d77a1c8be561785e827edbf312d83bfb2213d3829be8bf7254872072273a`, right `45e5fcef75c8393f84659cfec9c8b25eaf6687889cf8211e00388b5ef892ef8f`. The six-pixel RGBA overlap at x=457–462 is byte-identical after decoding.
- Runtime assets and preloads use `?v=20260718-10`. All nineteen machine images decoded successfully, both casing assets report 936×660 natural dimensions, the Vite overlay is absent, and browser logs contain no warnings or errors from the implementation.
- Expanded rest reports `data-expanded=true`, `data-moving=false`, and casing opacity 0. Reassembled rest reports `data-expanded=false`, `data-moving=false`, and casing opacity 1. The endpoint imagery remains persistent and transform-driven, with no staged visibility swap.
- `npm run build` passes and the local preview returns HTTP 200.
- P0: none.
- P1: none.
- P2: none.

final result: passed

## Pass 21 — four-stage internal mechanism cycles

Comparison setup:

- Selected visual direction: `design/world-compiler-expanded.png`.
- Accepted support-free expanded baseline: `design/audit-v9-bottom-occlusion/07-fixed-expanded.jpg`.
- Desktop motion frames: `design/qa-v11-motion-expanded.png` and `design/qa-v11-motion-expanded-b.png`.
- Compact reassembly result: `design/qa-v11-motion-compact.png`.
- Mobile expanded result: `design/qa-v11-motion-mobile.png`.
- Source/current comparison: `design/qa-v11-motion-reference-comparison.png`.
- Baseline/current comparison: `design/qa-v11-motion-baseline-comparison.png`.
- Two-frame motion evidence: `design/qa-v11-motion-contact-sheet.png`.
- Browser viewports and states: 1280×720 desktop compact/expanded/reassembled, plus 390×844 mobile expanded.

- P2 resolved: the previous RULES motion used 3.2°/-4.96° over 6.4 seconds and read as nearly static at normal page scale. The final counter-rotating cycle uses 8°/-12.4° over 3.8 seconds. Its one-second crop changes 12.76% of pixels above a three-level threshold with a 4.551/255 mean grayscale delta.
- INPUT, STATE, and OUTPUT now use independent photographed motion sprites behind fixed front layers. INPUT runs a 10° flywheel cycle over 5.8 seconds, STATE runs a -6.5° front-drum cycle over 8.2 seconds, and OUTPUT runs a 5.8° lattice-sphere cycle over 10.4 seconds.
- The asset builder partitions each source into a fixed front and a tight rotating crop, asserts that every moving pixel is inside its crop, and asserts exact source reconstruction at the neutral phase. Horizontal shafts, bearings, labels, glass frames, and support-free lower rails stay fixed.
- All five computed transforms changed during a 500ms desktop sample, with the two RULES matrices moving in opposite directions. The one-second visual samples measured INPUT 6.30%, RULES 12.76%, STATE 6.50%, and OUTPUT 29.66% changed pixels in their focused regions.
- Mechanism playback ramps with a smoother-step envelope from opening progress 0.45 through 0.79. This keeps the spring-led part separation readable before the internal cycles reach full speed.
- Reassembly settled at `data-expanded=false`, `data-moving=false`, and `data-mechanisms-active=false`. All five mechanism transforms remained byte-identical across a subsequent 400ms compact sample.
- A 90ms opening reversal retained the intermediate spring state and settled cleanly back to the compact endpoint. Scrolling to y=1147 paused all five cycles through the intersection gate; their transforms remained byte-identical across 450ms offscreen.
- Page visibility, asset readiness, viewport intersection, and `prefers-reduced-motion` gate the shared playback lifecycle. The browser environment reported reduced motion as false; source review confirms that the media-change path jumps to the selected endpoint and pauses every mechanism.
- The 390×844 expanded layout has a 358×430 interaction region, a 390px document width, and zero horizontal overflow. All five mechanism transforms changed during the mobile sample.
- All 22 machine images decoded at natural dimensions. Browser warning/error logs were empty after a cold reload, and the compact/expanded screenshots show clean glass apertures, fixed shafts, continuous casing geometry, and unchanged editorial typography.
- The first visual check exposed a stale stylesheet cache that enlarged the OUTPUT sphere. The entry-module, lazy-module, stylesheet, asset, and mask cache keys now advance together. A second visual check raised RULES from 6.2°/-9.6° to the final 8°/-12.4° cycle for clearer normal-scale legibility.
- P0: none.
- P1: none.
- P2: none.

final result: passed

## Pass 22 — high-fidelity shaft rotation

Comparison setup:

- Selected visual direction: `design/world-compiler-expanded.png`.
- Phase 0 / Phase 1 comparison: `design/qa-v12-input-before-after.png`.
- Measured shaft axis and A/B registration: `design/qa-v12-input-axis-overlay.png`.
- Browser-rendered 0°, 90°, 180°, and 270° phases: `design/qa-v12-input-four-phases.png`.
- One-second browser motion evidence: `design/qa-v12-motion-contact-sheet.png`.
- Browser viewports and states: 1280×720 at DPR 2 for compact, expanded, reassembled, quick reversal, offscreen, page-hidden, and reduced-motion checks; 390×844 at DPR 2 for touch expansion, motion, scrolling, and overflow checks.

- INPUT now uses four explicit physical layers. `input-static-back` owns the brass body and photographed lighting; `input-face-detail` owns the dark locator and sparse surface marks; `input-static-front` owns the shaft, hub, rim, silhouette, and foreground highlights; `input-face-mask` constrains every moving pixel to the approved face aperture.
- The browser hierarchy is `scaleX(0.58) → rotateZ(θ) → scaleX(1 / 0.58)` with one shared transform origin. WAAPI writes only the middle layer, runs a linear 0°→360° cycle over 14 seconds, and retains the existing smoother-step speed envelope and lifecycle gates.
- The source axis remains `(201,263)` in the 936×660 machine canvas and `(33,59)` in the 84×112 moving crop. The browser measured the expanded DPR 2 axis at `(646.41,384.64)` CSS pixels. All four phase samples reported 0px INPUT component bbox drift and 0px shaft bbox drift; the fixed-layer transforms stayed `none`, so shaft angle change and hub drift are also 0.
- The four-phase sheet shows the dark locator completing the intended projected path while the photographed rim, outer contour, shaft, hub, frame, guide, and lighting remain registered. The A/B overlay confines red/cyan change to the approved face detail. The one-second 185×340 comparison changes 0.33% of the broad crop with a 0.206/255 mean grayscale delta, and the locator displacement remains visible at normal page scale.
- Seven 4× 8-bit RGBA PNG mothers deterministically export seven tight 3× VP8L lossless WebP assets through premultiplied-alpha Lanczos resampling and solid-pixel sharpening. The minimum transparent safety edge is 19px at 4× and 14px at 3×. Fully transparent RGB is zero, moving/fixed intersection is zero, moving coverage is 4.55%, and the neutral 4× composite has zero maximum error.
- Browser decode dimensions match every crop: static back/front 345×336, moving detail/mask 252×336, frame 528×1179, guide 129×480, and shaft 1140×105. The seven runtime files total 236,180 bytes and decode to 4,821,264 bytes.
- P2 resolved: the implementation document's locked 3× runtime and its separate 2 source-pixels-per-device-pixel sentence are arithmetically incompatible at a 1180px scene. This pass uses the explicitly locked 3× runtime as the governing requirement. The measured 1280px layout provides 1.7408 source pixels per device pixel; the theoretical 1180px maximum provides 1.1898. DPR 2 browser close-ups show one clean edge with no doubled outline, paper rectangle, low-alpha haze, or flashing alias.
- Ten target reversals at 90ms intervals produced 0px synchronous transform discontinuity. INPUT animation time advanced continuously from 1199.23ms to 1669.09ms without a phase reset. Reassembly then held an identical transform and animation time for 400ms with `data-mechanisms-active=false` and `will-change: auto`.
- Offscreen playback held an identical transform and time for 450ms. Headless Chromium kept background tabs visible, so the page-hidden branch was exercised through the same browser document's `visibilitychange` event with `visibilityState="hidden"`; playback then held an identical transform and time for 450ms with `data-mechanisms-active=false`.
- The 390×844 touch-expanded layout reports a 390px document and client width, reaches scrollY 2120, and continues INPUT motion. The reduced-motion context jumps to the selected expanded endpoint and keeps the INPUT transform and time identical for one second.
- All 24 machine images decoded at natural dimensions. Desktop, mobile, and reduced-motion contexts produced no browser warnings, errors, failed requests, or HTTP error responses. The compact enclosure, expanded composition, reassembled enclosure, editorial typography, spacing, color, and all non-INPUT mechanisms remain visually unchanged.
- `design/build_world_compiler_parts_v5.py` rebuilt byte-identical outputs, `design/check_world_compiler_parts_v5.py` passed, all three v12 Python scripts compiled, `npm run build` passed, and `git diff --check` passed. The requestAnimationFrame ownership count matches the `24a5a84` baseline.
- P0: none.
- P1: none.
- P2: none.

final result: passed

## Pass 23 — subtle INPUT locator engraving

Comparison setup:

- User-reported defect: the rotating locator read as an isolated black dot when it reached the lower-right face quadrant.
- Browser-rendered 0°, 90°, 180°, and 270° DPR 2 phases: `design/qa-v13-input-marker-four-phases.png`.
- Browser viewports and states: 1280×720 at DPR 2 for the four fixed phases, plus 390×844 at DPR 2 for touch-expanded mobile verification.

- The locator is now a 25° circular engraving at a 20.5 logical-pixel radius with a 1.25 logical-pixel stroke. Its deep-brass `(96,70,36)` color follows the wheel material and retains a restrained rotational cue.
- The 4× opaque locator core decreased from 1,026 pixels to 72 pixels. Total moving coverage decreased from 4.55% to 2.15%, while the approved microtexture, face mask, shaft, hub, rim, silhouette, and photographic lighting ownership remain unchanged.
- All four browser phases keep the same INPUT bounding box with 0px geometry delta. The locator reads as a short engraved arc in every quadrant and stays integrated with the face at normal page scale.
- All seven v5 browser image URLs use `?v=20260722-1`. Desktop and mobile browser contexts produced no warnings, errors, page errors, or failed requests.
- The asset checker reports a zero-error neutral 4× composite, 0.974 visible-pixel MAE at 3×, 236,008 bytes of runtime assets, and 4,821,264 bytes of decoded RGBA memory.
- P0: none.
- P1: none.
- P2: none.

final result: passed

## Pass 24 — physically-layered gear and drum assets (v6 pipeline)

Comparison setup:

- Asset pipeline: `design/build_world_compiler_parts_v6.py` (replaces the v5 ring-from-full-frame approach with angular-field-separated layers).
- RULES gears (outer/inner): three layers each — rotating ring (teeth, rim, spokes), static (hub, axle corridor, 3D thickness), shading overlay (pure angular-field screen-space light).
- STATE drum: three layers — rotating ring (graduations, engraved ticks), static (barrel sliver), shading (solved per-pixel correction, heavily blurred to prevent ghosting).
- Runtime sprites: 3× lossless WebP via `cwebp -exact -lossless` with premultiplied-alpha Lanczos from 4× masters. Transparent RGB zeroed (`< 0.5` threshold). Mask exports use PIL lossless WebP.

- All 14 exported layers exist at expected 3× natural sizes.
- Transparent-pixel RGB is zeroed on every layer (0 dirty px across all layers).
- RULES neutral composite MAE: outer 13.51, inner 12.15 (limit 15.0). Differences confined to antialiased mask edges.
- STATE neutral composite MAE: 9.79 (limit 14.0). Engraving/highlight overlay adds slight procedural-vs-photographic variance.
- Hub-zone alpha: 3.0% outer, 3.2% inner — sub-pixel feather transition (0.005 rho at 4× master, ~0.6px at 3× runtime) for aliasing-free rotation.
- Axle corridor clearance: 3.3% outer, 2.8% inner — corridor mask aligned with build script geometry.
- STATE ring coverage 42.21%, engraved dark pixels 9,752 (limit 400).
- Angular lighting field: outer gain dev=0.697, inner gain dev=0.653, state gain dev=0.178.
- Browser QA: phases (RULES ω₂=−1.5ω₁, INPUT≡STATE, console clean), sphere (quaternion norm, 360° return, backing 2.0×), lifecycle 9/9 (FPS 16.5, reversal continuous, offscreen/hidden pause, no leak, reduced-motion), viewports (desktop DPR1/2, mobile, no overflow, console clean).
- `python3 design/build_world_compiler_parts_v6.py` and `python3 design/check_world_compiler_parts_v6.py` both pass.
- P0: none.
- P1: none.
- P2: none.

final result: passed
