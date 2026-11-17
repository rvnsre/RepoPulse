# RepoPulse 11.3.0 — motion and responsive geometry

## Root causes addressed

- Native window bounds used estimated 150/170-pixel rows while the renderer independently fitted 172-pixel rows and CSS required at least 202 pixels. The renderer now measures actual untransformed layout heights, including the selected visible rows, header, heading, footer and gaps.
- Hover transforms contaminated bounding-box measurements. Layout uses offsetHeight so magnification cannot grow the native window repeatedly.
- Collapse only clipped the large surface. Rectangle-to-rectangle translation and scaling now preserve the top anchor and animate the surface toward the actual compact bounds.
- Morph, hover and delayed fit requests competed. Morph owns the surface transform while running, cancelled transitions cannot finish over a newer intent, and stale native fit requests are rejected.
- Older 640/900-pixel media rules conflicted with the newer grid, using fixed column minimums or extra full-width code rows. A single final responsive grid sets flexible columns, consistent 12-pixel gaps and narrow single-column cards.
- Fixed viewport heights in narrow workspace rules subtracted obsolete 28-pixel padding. Narrow workspace and island surfaces now use the actual platform padding.

## Changed files

| File | Change |
| --- | --- |
| app/renderer.js | Actual layout measurement, deduplicated fitting, transform-based interruptible morph |
| app/main.cjs | Apply measured panel height in the mode request; reject stale fitting |
| app/morph.js | Shared finite rectangle transform and measured panel height helpers |
| app/ultimate.js | Prevent hover animation capturing an active morph; quicker hover feedback |
| app/styles.css | Responsive columns, consistent gaps, card action alignment and narrow viewport sizing |
| app/index.html, package.json | Version 11.3.0 |
| test/geometry-regressions.test.cjs | Measurement, finite transform, top anchor and monitor bounds regressions |
| scripts/smoke.cjs | Real Electron 440/600/960 widths, 100/150% text and command visibility matrix |

## Validation

The native matrix checks no horizontal page/card overflow and reachable first-card actions, while existing tests continue to cover rapid collapse/re-entry, native pointer events, reduced motion, preserved anchor, library navigation and live replacement. Native UI execution is on Linux/Xvfb; Windows/macOS packaging is checked separately and does not substitute for testing those platforms on real displays.

Validation completed for source [5f0ff732](https://github.com/rvnsre/RepoPulse/commit/5f0ff732584ae145b6e7e8ba7873b1d57053b5e8): **239 tests passed, 0 failed**, syntax/configuration checks passed, and the Linux native Electron smoke test passed including the responsive geometry matrix and interrupted pointer transitions. [Build and downloadable artifacts](https://github.com/rvnsre/RepoPulse/actions/runs/44179877981).
