# RepoPulse 10.0.0

## Design and interaction

- Larger repository titles and descriptions, refined spacing, warm sand highlights and deep teal command panels.
- New daily discovery heading, catalog summary, connection indicator and direct library entry.
- Dedicated sidebar workspace for project details, library, notes, collections, compare, Insights and settings.
- One content scroller in workspace mode, stable workspace height and a horizontal navigation layout on narrow screens.
- Compact dock remains reachable; protected editing, keyboard focus and focus sessions prevent unwanted hiding.
- Metadata refreshes and cosmetic changes preserve leave/idle deadlines. Changing hover policy cancels pending reveal.
- Reduced-motion support, text scaling, contrast controls and keyboard focus indicators remain available.

## Reliability

- Fresh imported annotations appear immediately until actual editing starts; dirty note and tag drafts survive unrelated changes.
- Concurrent release checks share one request. Keyboard Install waits for the pending result.
- Missing public releases use the same timed cache as successful lookups.
- Invalid saved geometry cannot produce non-finite native bounds; tiny displays and negative monitor coordinates are supported.
- Startup chooses the monitor associated with the saved position; system resume triggers a refresh.
- Expanded workspace no longer feeds back content height into repeated native resizing.
- Browser preview serves all current scripts and a bounded, loopback-only sample backend.

## Verification

104 unit tests, syntax checks and real Linux Electron interaction tests passed. The native suite checks browser destinations, replacement/undo, drafts, workspace geometry, library cursor retention, collections, comparison, Insights, command palette, focus, auto-hide, animated hover reveal, hover growth, 150% text and narrow layouts. Windows, macOS and Linux packaging jobs all passed in [run 44038959367](https://github.com/rvnsre/RepoPulse/actions/runs/44038959367).

Native screenshots use deterministic sample repository metadata. Installed-device acceptance, signing and automatic updates remain future release work.

## Downloads

These are GitHub Actions artifact ZIP downloads, not attached release assets. Sign-in may be required. Extract the ZIP and select the installer under `dist/`. Artifacts expire on 17 December 2026. Builds are unsigned previews.

| Platform | Package | Download |
|---|---|---|
| Windows x64 | EXE installer and portable EXE | [Windows ZIP](https://github.com/rvnsre/RepoPulse/actions/runs/44038959367/artifacts/14307869239) |
| Linux x64 | AppImage, DEB, RPM | [Linux ZIP](https://github.com/rvnsre/RepoPulse/actions/runs/44038959367/artifacts/14309210475) |
| macOS arm64 | DMG, ZIP | [macOS ZIP](https://github.com/rvnsre/RepoPulse/actions/runs/44038959367/artifacts/14307953247) |
| Browser companion | Extension source | [Companion ZIP](https://github.com/rvnsre/RepoPulse/actions/runs/44038959367/artifacts/14308417467) |

Code commit: `63440d8d911034380093e8a953137e27e2ec63c9`.
