# World Compiler — Retracted Shaft and Warm-Metal QA

## Source of truth

- Closed structure: `design/world-compiler-causal-armillary-closed.png` (1536 × 1024).
- Selected color and material target: `/var/folders/mt/zkwbsh496490b9dxy6lhqd880000gn/T/codex-clipboard-72bf0504-d39b-4cc6-bae0-4e2eab5032a1.png` (1536 × 1024).
- Implementation: `src/components/ArmillaryStage.jsx` in one parametric Three.js scene.

## Evidence

- Baseline closed capture: `design/qa-closed-color-before.png`.
- Final closed capture: `design/qa-closed-color-final.png`.
- Final expanded capture: `design/qa-expanded-color-final.png`.
- Closed full comparison: `design/qa-closed-color-final-comparison.jpg`.
- Closed focused comparison: `design/qa-closed-color-final-focused.jpg`.
- Expanded full comparison: `design/qa-expanded-color-final-comparison.jpg`.
- Expanded focused comparison: `design/qa-expanded-color-final-focused.jpg`.
- Mobile smoke test: `design/qa-closed-color-mobile.png`.

## Normalization

| State | Source pixels | Implementation pixels | CSS viewport | Density |
| --- | ---: | ---: | ---: | ---: |
| Closed desktop | 1536 × 1024 | 1536 × 1024 | 1536 × 1024 | screenshot 1×; WebGL 2× |
| Expanded desktop | 1536 × 1024 | 1536 × 1024 | 1536 × 1024 | screenshot 1×; WebGL 2× |
| Closed mobile | n/a | 390 × 844 | 390 × 844 | screenshot 1× |

## Findings and iteration history

- [P1 resolved] Closed equatorial shaft extended through both shell edges and read as an external bar. The shaft assembly now scales to 28% length at the desktop closed endpoint and remains inside the center bearing. It returns continuously to full scale during expansion.
- [P1 resolved] Baseline metal used cool white silver, saturated yellow-gold, and flat black. Broad faces now use warm champagne silver; latticework and hardware use quiet aged brass; mechanical recesses use brown-black graphite.
- [P2 resolved] Ring faces lacked high-key studio reflections. A larger warm camera-side softbox, restrained exposure, brushed roughness variation, and warmer fixed lights now create broad highlights with dark side-wall separation.
- [P2 resolved] The right shell read as a bright orange plate. Its backing is now darker aged bronze with brighter polished pore rims and preserved cavity depth.
- [P2 resolved] Graphite rings appeared uniformly black. Directional roughness and bump variation now preserve readable surface texture in the dark material.
- [P3 remaining] The procedural perforation web and center-bearing topology remain simpler than the photographic concept while preserving the selected palette, depth hierarchy, and reversible shared-scene constraint.

## Required fidelity surfaces

- Fonts and typography: unchanged; the implementation retains the established bilingual editorial hierarchy and wrapping.
- Spacing and layout rhythm: closed and expanded machine bounds remain inside the desktop interaction region; document width equals viewport width.
- Colors and visual tokens: warm champagne silver, aged brass, graphite, cream highlights, and brown stone now match the selected reference direction.
- Image quality and asset fidelity: all machine surfaces remain live PBR geometry with brushed roughness, bevels, recesses, fixed lighting, and soft contact shadow; no endpoint raster swap is used.
- Copy and content: unchanged from the selected editorial layout.

## Regression and verification

- Closed desktop: `data-expanded=false`, `data-ready=true`, no horizontal overflow.
- Expanded desktop: `data-expanded=true`; interaction bounds x = 542–1490 px within the 1536 px viewport.
- Closed mobile: 390 px viewport, 358 px canvas, no horizontal overflow.
- Primary interaction: focus/hover expansion remains reversible and the shaft extends with the same motion progress.
- Production build: passed with Vite 6.4.2.
- `git diff --check`: passed.
- Browser console: no warnings or errors in the final desktop pass.

final result: passed
