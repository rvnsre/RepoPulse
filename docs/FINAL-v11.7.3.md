# RepoPulse 11.7.3 final audit

## Root cause of intermittent empty cards

The updated compositor can withhold animation-frame callbacks even after the native window becomes visible. Scheduling all semantic rendering exclusively through requestAnimationFrame therefore left the interface permanently queued with no cards in some runs. Rendering and content-height fitting now use a coalesced animation frame with a 50 ms timer fallback. Whichever arrives first cancels the other; a generation check rejects late callbacks. Work is cancelled at unload. This retains smooth frame scheduling and allows background/initial updates to make progress without disabling background throttling globally.

Four deterministic tests cover withheld frames, normal frame coalescing, late callbacks and unload cancellation. The two native visibility lifecycle tests, asynchronous Electron clipboard handling and the other reliability changes remain in place. See [the preceding audit](FINAL-v11.7.2.md).

## Included corrections

- Camera-edge hidden geometry and hover/leave behavior; pending refresh and stale keyboard focus cannot pin the panel open.
- Independent 3–10 second row rotation, no-repeat Next picks, offline bootstrap and consistent feed/sync context.
- Atomic full reset with failed-write rollback; unsaved drafts, stale filters, comparison selections and focus holds clear on successful reset.
- Electron 45.3.4, electron-builder 26.18.0 and minimatch 11.0.9; locked dependencies and explicit OS/CPU package names.
- Correct nested Actions artifact handling, tag/version/format checks, direct release assets and SHA-256 checksums.

429 unit tests and syntax/JSON/taxonomy checks pass. Delivery also requires the native Linux Electron suite and all platform builds to pass. The native suite checks physical pointer behavior, rapid reversal, real copied npm/Git commands, replacement/undo, notes, narrow geometry and 150% text.

Packages: Windows x64 Setup/Portable EXE; Linux x64 AppImage/DEB/RPM; macOS arm64 DMG/app ZIP. Builds are unsigned; macOS is not notarized. Physical Windows/macOS installation and native Wayland compositor acceptance remain unverified by Linux/Xvfb. Nine development-tool audit nodes share the unpatched upstream picomatch advisory documented in the dependency audit; those packaging tools are excluded from the app bundle. The snapshot contains 531 genuine 50K+ star repositories.

Upgrade by choosing **Quit** in the old app's tray before launching 11.7.3.
