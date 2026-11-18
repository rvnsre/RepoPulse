# RepoPulse 11.7.0 final audit

## New corrections

- Full local reset now uses the same atomic persistence boundary as ordinary edits. A disk error preserves the previous in-memory and on-disk state.
- Successful reset clears private unsaved note/tag drafts, comparisons, selected rows, stale library filters and pending library-query results. It ends an active focus session and its auto-hide hold. A late note-save callback cannot restore a draft from before reset.
- Build dependencies are checked in as a lockfile and installed using `npm ci` on every platform.
- Installer names carry the version, operating system, CPU and, for Windows, installer/portable target.
- A tag-only release job waits for verification and all three platform builds. It validates the release tag against the application version, requires every advertised format, rejects empty/old/mixed assets, generates SHA-256 checksums and uploads the binaries to the GitHub Release. Only this release job has repository-content write permission.

## Preserved and rechecked behavior

- 120 × 16 DIP camera-edge activation zone; 48 × 3 DIP visible indicator; immediate hover reveal and 80 ms leave debounce. Background refresh and stale keyboard focus do not hold the panel open.
- Independent 3–10 second row replacement, no-repeat next picks, exhaustion recycling, offline bootstrap and truthful sync/feed metadata.
- Work-area and DPI-aware bounds, narrow screens, 150% text, direct repository/release browser destinations, tray/global shortcuts, undo and personal workspace.
- 531 verified public, nonfork, nonarchived repositories with at least 50K stars in the bundled snapshot. The app supports a larger future catalog; it does not fabricate thousands of qualifying repositories.

## Validation and packages

422 automated tests and syntax/JSON/taxonomy checks pass locally. Linux Electron's native CI regression covers physical pointer entry/exit, rapid reversal, collapsed footprint, delayed refresh, editing, replacement/undo, text scale and narrow-window geometry. The tagged release is gated on that check and successful packaging for Windows, macOS and Linux.

Packages: Windows x64 NSIS installer and portable EXE; Linux x64 AppImage, DEB and RPM; macOS Apple Silicon arm64 DMG and app ZIP. These builds are unsigned and macOS builds are not notarized. Physical Windows/macOS installation and native Wayland compositor behavior have not been verified by the Linux native test.

To upgrade, use the old app's tray **Quit** action before opening the new executable. Closing a window keeps the existing single-instance process running.
