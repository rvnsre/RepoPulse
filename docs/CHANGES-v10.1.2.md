# RepoPulse 10.1.2 — Stop hover oscillation

Fixes rapid expansion/collapse while the pointer remains over the island.

## Behavior and cause

The native desktop app now determines hover from cursor membership in its actual window bounds. Animated DOM mouse boundary events no longer decide whether the native panel expands or collapses. Native pointer sampling runs every 40ms while the window is visible; cursor/window changes are sent to the renderer. Compact repository/toolbar targets remain stable for clicking.

A geometry-only change is distinct from physical cursor movement. Duplicate entry cannot re-open a manually collapsed panel. Opening and closing requests carry increasing identifiers, and an acknowledgement of an older renderer request cannot override the latest intent. Tray and shortcut mode changes remain authoritative.

Window geometry uses a separate logical anchor so expanding near a screen edge does not move the compact dock's intended position. Programmatic moves are recognized by their expected coordinates rather than a timing guess. User movement is captured through the cross-platform move event. Compact content becomes visible before the native size changes, preserving its click target through the transition.

Listener cleanup now returns no uncloneable Electron object across context isolation.

## Verification

169 unit tests, syntax/JSON checks and extension taxonomy verification passed. The Linux Electron smoke suite uses the actual X-server cursor (xdotool), verifies its coordinates, holds a stationary cursor over an edge-anchored island, checks exactly one expansion for one physical entry, checks exact dock position restoration, and interrupts close/re-entry repeatedly. Compact GitHub clicks, the 3-second Live test, all 22 scenes and previous workspace/readability tests remain covered. The Linux smoke cursor provider reads the X server directly; packaged apps use Electron's native cursor API. Installed-device acceptance remains separate from CI.

Code commit: `be61e16b5313e3e173692358f44182b5ed181393`.

## Upgrade correctly

Quit the previous RepoPulse from its system-tray menu before opening the new version. Closing its window only hides it; launching another copy while the older process remains running can focus that older copy. After starting the new package, Settings should show version 10.1.2. There is no automatic application updater yet.

## Downloads

All five jobs passed in [build 44055758547](https://github.com/rvnsre/RepoPulse/actions/runs/44055758547). The native log contains: “Real pointer/resize regression passed: stable edge hover, exact dock-anchor restoration and interrupted close/re-entry.”

| Platform | Installer download |
|---|---|
| Windows x64 EXE | [Windows ZIP](https://github.com/rvnsre/RepoPulse/actions/runs/44055758547/artifacts/14314504946) |
| Linux x64 AppImage / DEB / RPM | [Linux ZIP](https://github.com/rvnsre/RepoPulse/actions/runs/44055758547/artifacts/14315428119) |
| macOS arm64 DMG / ZIP | [macOS ZIP](https://github.com/rvnsre/RepoPulse/actions/runs/44055758547/artifacts/14316241060) |

These are unsigned GitHub Actions artifact ZIPs, not attached release assets. GitHub sign-in may be required. Extract the archive and select the installer in dist/. Downloads expire on 17 December 2026.
