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
