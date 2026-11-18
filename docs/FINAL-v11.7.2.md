# RepoPulse 11.7.2 final audit

## Native startup correction

Electron's hidden renderer can defer the first animation frame, while `ready-to-show` waits for that paint. Waiting only for that event can leave an invisible application with no initial cards. Native visibility now responds to either `ready-to-show` or `did-finish-load`, once only, and explicitly allows painting while initially hidden. The initial window already has its correct small collapsed geometry, so this fallback does not flash a large panel.

Two lifecycle regressions cover either event ordering and repeated notifications. The smoke-test failure diagnostic now reports actual native visibility.

## Reliability and dependency work included

This release includes atomic full-data reset with rollback on disk failure, removal of unsaved private drafts and focus holds after reset, camera-edge hover/leave behavior, independent 3–10 second feed rotation, catalog recovery, consistent RSS/sync context, OS-aware actions, locked dependency installation, explicit package names and verified release delivery.

Electron **45.3.4**, electron-builder **26.18.0** and minimatch **11.0.9** remove the reported older runtime, AppImage search-path, tar, extract-zip and minimatch findings. The full development dependency audit still has nine high nodes from one upstream picomatch ReDoS advisory without a patched stable release. Packaging dependencies are excluded from the app's bundle; no user-supplied build glob pattern is accepted. See [the dependency audit and primary references](FINAL-v11.7.1.md).

The Actions upload helper supports both flat artifacts and their actual nested `dist/` layout. Delivery verifies the exact tag commit, matching package version and passing verification plus every platform packaging job before attaching seven installer/app files and SHA256SUMS.txt. The separate delivery workflow can reuse a verified build for the same commit without rebuilding the application.

## Checks and limits

425 unit tests and syntax/JSON/taxonomy checks pass locally. Release delivery requires the Linux native Electron suite and all platform packaging jobs to pass. Native checks cover physical pointer entry/exit, hiding during pending refresh, rapid reversal, direct browser destinations, replacement/undo, notes, narrow geometry and 150% text.

Packages: Windows x64 Setup/Portable EXE; Linux x64 AppImage/DEB/RPM; macOS Apple Silicon arm64 DMG/app ZIP. Builds are unsigned and macOS is not notarized. Physical Windows/macOS installation, real-device DPI and native Wayland compositor acceptance remain outside the Linux/Xvfb verification. The bundled catalog contains 531 genuine 50K+ star repositories.

Before launching the new executable, choose **Quit** in the old app's tray. Closing its window retains the older single-instance process.
