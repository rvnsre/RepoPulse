# RepoPulse 10.1.0

A personalized GitHub discovery island for Windows, macOS and Linux, focused on **50,000+ star** public projects.

The island gently grows when the pointer enters, reveals from a compact dock on hover, and collapses after pointer leave or inactivity. Editing, keyboard focus, focus sessions and an open workspace can hold it open. Hiding means collapsing to the reachable dock; the app stays available in the system tray.

Choose Fluid, Snappy, Calm or Soft Spring motion, hover growth, timing, card appearance, accent and text scaling. The native window reserves room around transforms so hover growth stays inside its bounds. System reduced-motion preferences remain respected.

![Native application preview](docs/preview-v10.1.png)

Native Electron screenshot using sample metadata. The native test temporarily disables automatic hiding and Live rotation to capture a stable desktop view; autonomous operation is exercised separately in the same test.

## Live discovery / 10.1.0

Unseen repositories now replace one visible row automatically every 3–10 seconds of active time. Use Live to pause/resume, or tune the interval and choose from 22 transition styles in Settings. Hovered cards, editing, keyboard navigation, workspaces and focus sessions are protected. Automatic display does not count as a visit or train your interests. When the unseen catalog is exhausted, current cards stay visible.

Rotation uses the cached eligible catalog. Install checks releases on demand, so every new card does not generate a background release request. See [the full change list and installers](docs/CHANGES-v10.1.md).

## Compact update 10.0.1

960px discovery panel, 360px compact dock, zero hover/leave delay and approximately 69ms default transitions. Existing appearance settings migrate once. See [changes and downloads](docs/CHANGES-v10.0.1.md).

## Version 10

A redesigned discovery view pairs larger repository titles and descriptions with warm sand accents, deep teal panels and clearer browser actions. Library, notes, collections, comparison and preferences now open in a dedicated sidebar workspace with one content scroller.

Hover and automatic hiding keep their deadlines through metadata refreshes. Notes update from imported annotations until you start editing; active drafts remain protected. Window geometry handles invalid saved positions and small displays, and startup restores the appropriate monitor.

![Dedicated workspace](docs/workspace-v10.png)

See [v10 changes and verified downloads](docs/CHANGES-v10.md). The earlier [Ultimate inventory](docs/ULTIMATE-v0.5.md) remains available for the inherited workspace features.

## Personal workspace

- Cached project library with multi-term search, personal-note search, negative terms and owner:, lang:, tag:, is: operators.
- Personal notes, tags, ratings, pins, read status and a reading queue with priorities.
- Bulk save, queue, pin and read actions.
- Named color-coded collections, validated workspace import/merge, JSON and CSV export.
- Compare up to three projects; inspect shared topics and cached project metadata.
- Local visit statistics, a seven-day histogram, language distribution and topics.
- Ctrl/Cmd+K command palette, keyboard command navigation and a local focus timer.

The [implemented inventory](docs/ULTIMATE-v0.5.md) lists 156 controls, workflows and corrections. It distinguishes shipped functionality from future ideas.

## Browser actions

**Learn More** opens the selected repository in the default browser. **Install** checks public releases and opens Releases when available. **Guide** opens the README. Auxiliary GitHub links do not replace the daily repository row. Clone commands are copied only.

Opening a discovery replaces that same row with an unseen eligible project. Undo restores the last selection. The eligible catalog remains non-fork, non-archived and at least 50K stars. Exhaustion shows an empty state.

## Run and build

Requires Node.js 24+.

```sh
npm install
npm start
npm run preview
npm test
npm run check
npm run dist
```

[GitHub Actions](https://github.com/rvnsre/RepoPulse/actions) tests the code and packages Windows EXE, macOS arm64 DMG/ZIP and Linux x64 AppImage/DEB/RPM. Successful run artifacts are downloadable. Packages are unsigned previews; publishing a version label does not itself attach installer assets.

The loopback-only browser preview uses deterministic sample data and simulated external actions. It does not read personal desktop data or open external programs.

The real Electron native check covers readable text, stable row DOM, browser destinations, replacement/undo, 150% text, notes/tags, library focus retention, bulk read, collections, comparison, Insights, command palette, focus mode, auto-hide, hover reveal/growth and narrow display behavior.

## Data and privacy

Personal notes, interest weights, history, collections and preferences stay in per-user storage. Workspace imports merge validated records; exports are chosen explicitly. Search and statistics use local data. Public GitHub requests are still subject to rate limits.

The optional browser extension processes recent history only after choosing Analyze and exports topic weights for manual desktop import. There is no cookie access, secret extraction, background browser tracking, cloud AI or automatic browser synchronization.

## Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl/Cmd+Shift+Space | Toggle island |
| Ctrl/Cmd+K | Command palette |
| Ctrl/Cmd plus / minus / zero | Text size |
| J / K | Select row |
| S / Q / P | Save / queue / pin selected project |
| D / I | Details / public releases |
| F | Start or stop focus session |
| N / U / R | Next rows / undo / refresh |
| / | Search saved projects |
| ? | Command help |
| Escape | Close workspace or collapse |

Letter shortcuts can be disabled in Settings.

Copyright 2026 Ravan Sariyev. Distribution license is not yet selected. Signing, automatic updates, browser-store publication and native OS acceptance testing remain release work.

