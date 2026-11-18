# RepoPulse 11.7.1 final security and reliability release

This release contains the atomic reset, draft cleanup, edge auto-hide, catalog, locked builds and direct release-asset delivery documented in [the reliability audit](FINAL-v11.7.md).

## Dependency audit on 18 November 2026

- Electron 40.0.0 → **45.3.4**, current stable, with Chromium 156 and Node 24.22.3. This removes the reported Electron vulnerabilities affecting the older runtime.
- electron-builder 26.0.12 → **26.18.0**. This includes the fix for the generated AppImage's empty dynamic-library search-path element, and removes the vulnerable old node-tar and extract-zip dependencies.
- Override minimatch to **11.0.9** to remove its reported glob amplification issue. Dependency versions and integrity hashes remain locked in `package-lock.json`; all platform jobs use `npm ci`.
- `npm audit` changed from 18 affected dependency nodes (1 critical, 13 high, 4 moderate) to 9 high nodes, 0 critical, 0 moderate. The remaining nodes share **one unpatched upstream picomatch ReDoS advisory** (GHSA-fc5q-39xc-vjpf, picomatch ≤4.0.7). The stable registry currently offers no patched picomatch release. These are development/packaging tools, excluded by the application's `build.files` allowlist. The app accepts no user-provided build glob patterns. This release does not claim a clean all-dependency audit.
- Linux CI blocks any critical dependency finding before native testing and packaging. It retains the remaining advisory in the visible job log.

Primary references: [Electron 45.3.4](https://releases.electronjs.org/release/v45.3.4), [AppImage advisory](https://github.com/electron-userland/electron-builder/security/advisories/GHSA-7g7r-gx96-252g), [picomatch advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf).

## Verification and delivery

422 unit tests plus syntax/JSON/taxonomy checks pass. Platform assets are attached only after verification, the Linux native Electron regression and all platform builds pass. A matching version/tag and every advertised installer format are required; SHA256SUMS.txt covers all seven installer/app files.

- Windows x64: Setup EXE and Portable EXE.
- Linux x64: AppImage, DEB and RPM.
- macOS Apple Silicon arm64: DMG and app ZIP.

Builds are unsigned and macOS is not notarized. Physical Windows/macOS installation, 125%/150% real-device DPI and native Wayland compositor acceptance remain unverified by the Linux/Xvfb check. The bundled snapshot contains 531 genuine 50K+ star repositories.

Before upgrading, use the old app's tray **Quit** action, then launch 11.7.1. Closing the window alone keeps the older single-instance process running.

## Release upload correction

Actions artifacts include a root lockfile and a nested `dist/` folder. The upload helper now supports that actual layout as well as flat artifacts; the added regression brings the current source suite to 423 passing tests. The manual delivery workflow can reuse a completed build without rebuilding the application. It checks the exact tag commit, package version and successful verification plus all three packaging jobs before accepting its artifacts, then repeats the source tests and attaches all validated formats and checksums. The verified application source for this version remains the existing v11.7.1 tag.
