# RepoPulse 11.6.0 — camera-edge auto-hide

## User-visible behavior

- The hidden native window is **120 × 16 device-independent pixels**, centered at the top of the active display's work area. The visible indicator is **48 × 3 DIP**. The expanded feed/header/ticker are not displayed in this mode.
- Physical pointer entry into this small top-center zone reveals the island with the existing rectangle-to-panel animation. Nearby tabs and the area below the hot zone do not reveal it.
- Pointer leave uses an **80 ms debounce**, followed by a short collapse animation. Re-entry cancels a pending close; stationary hover stays stable through native window resizing.
- The application creates its native window in hidden geometry on startup rather than briefly creating a large panel first. Existing installations migrate to automatic hiding, hover reveal, centered anchoring and hidden startup exactly once.
- Click, touch or keyboard activation of the small reveal control can also open the panel. Non-pointer activation receives a brief 1.2-second grace period; tray controls and the global shortcut remain available.
- Explicit editing/workspace protection, focus sessions and a deliberately paused hiding timer remain supported. Turning automatic hiding back on clears the temporary pause and enables pointer-leave collapse.

## Root causes fixed

1. Background catalog sync used an auto-hide hold for the entire network request, which could take many seconds. Sync no longer pins the feed open.
2. Pending open/Next operations now protect interaction while hovered, but cannot block collapse after the pointer leaves.
3. Native pointer exit clears stale keyboard-navigation focus. Focused buttons cannot keep the feed open indefinitely after the mouse moves away. Actual editing protection remains separate.
4. The 360 × 64 collapsed ticker and 64-DIP minimum fitted height prevented maximum hiding. Both native layout and renderer fitting now use the smaller reveal geometry.
5. Collapse/expand morphs account separately for normal surface padding and the hidden handle's zero padding.
6. The former compact repository click target occupied most of the hover area and deliberately suppressed reveal. The new dedicated handle reveals the panel instead.

## Files

`src/layout.cjs`, `src/window-policy.cjs`, `src/discovery.cjs`, `app/island-motion.js`, `app/main.cjs`, `app/renderer.js`, `app/ultimate.js`, `app/morph.js`, `app/styles.css`, `app/index.html`, `package.json`, and related unit/native regression tests.

## Validation

**413 tests passed, 0 failed**, with syntax/configuration checks. Native Electron smoke exercises the 120 × 16 footprint, 3-DIP indicator, actual pointer entry/exit and rapid reversal, neighboring-tab exclusion, pending background sync, and stale keyboard focus. Native UI execution uses Linux/Xvfb; real-display Windows/macOS verification is separate from packaging.

The top zone follows each display's native work area, so macOS menu-bar safe positioning is preserved. Native Wayland placement/stacking remains compositor controlled; its fallback uses normal window hover. X11's opaque fallback shapes its visible surface to the small indicator. Coordinates remain in DIP at different display scale factors.

Source: [4045232a](https://github.com/rvnsre/RepoPulse/commit/4045232a8bf17bd68fd8430132141a93da4d4025). [Builds and installers](https://github.com/rvnsre/RepoPulse/actions/runs/44206973446).

The final native UI smoke completed successfully, including pending background refresh, stale focus while already outside, neighboring-tab exclusion and repeated camera-edge reveal/collapse. The dynamic preview explicitly reveals the panel after hidden-state testing; tiny hidden captures validate actual painted pixel variation instead of requiring a large PNG file.
