# Release checks

- Unit tests and syntax/JSON checks must pass.
- Native Electron smoke must pass, including direct Learn/Install destinations, replacement/undo, readable text, 150% text and narrow layout.
- Verify private notes, tags, rating, pinned/queued/read state, search operators and focus/cursor preservation.
- Verify bulk read, collection creation/membership, comparison, Insights and command palette.
- Verify focus-session start/stop, pointer-leave automatic collapse, hover reveal and visible hover scale.
- Inspect desktop, workspace, Insights, compact dock and hover screenshots from the native-preview artifact.
- All three OS packaging jobs must pass before distributing that platform's artifact.
- Current package targets: Windows x64 EXE, Linux x64 AppImage/DEB/RPM, macOS arm64 DMG/ZIP.
- Confirm public release notes describe the actual download location. A release label does not attach installer binaries by itself.
- Test installed packages on real devices, including transparency, dragging, multi-monitor bounds, 100/150/200% OS scaling, tray and global shortcut.
- Test offline cache, rate limits, release timeout/missing states, catalog exhaustion and local midnight rollover.
- Test workspace JSON/CSV, import limits, note conflicts, deletion confirmations and recovery copies.
- Test companion history permission approval/rejection/revocation and explicit score-only transfer.
- Signing, dependency-lock review, distribution license and automatic updates remain production gates.


## v10.0.0 evidence

Code commit: `63440d8d911034380093e8a953137e27e2ec63c9`. [Build 44038959367](https://github.com/rvnsre/RepoPulse/actions/runs/44038959367) passed all five jobs: verification, extension and three platform builds. Verification passed 104 unit tests and syntax checks. Linux additionally passed the real Electron UI smoke and workspace/draft regression checks. Native screenshots were inspected for discovery and workspace views.

See [the download table and changes](CHANGES-v10.md). Installer artifacts are ZIP downloads retained until 17 December 2026; GitHub sign-in may be required. They are not attached release assets.
