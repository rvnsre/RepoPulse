# RepoPulse 11.0.0

A personalized GitHub discovery island for Windows, macOS and Linux, focused on **50,000+ star** public projects.

The island gently grows when the pointer enters, reveals from a compact dock on hover, and collapses after pointer leave or inactivity. Editing, keyboard focus, focus sessions and an open workspace can hold it open. Hiding means collapsing to the reachable dock; the app stays available in the system tray.

Choose Fluid, Snappy, Calm or Soft Spring motion, hover growth, timing, card appearance, accent and text scaling. The native window reserves room around transforms so hover growth stays inside its bounds. System reduced-motion preferences remain respected.

![Native application preview](docs/preview-v11.png)

Native Electron screenshot using sample metadata. The native test temporarily disables automatic hiding and Live rotation to capture a stable desktop view; autonomous operation is exercised separately in the same test.

## What changed in 11.0

- **Next picks** requests a genuinely new batch, rather than paging the same three repositories. Undo restores the preceding batch. No visit or interest update is recorded.
- **Live** runs while the pointer is over a card by default, keeps explicit pause reasons, and mixes fast and slow 140–360ms card transitions. Editing, interaction, workspaces and focus sessions remain protected.
- **Recommendation ranking** gives 200K+ stars the highest tier weight, 100K–200K a medium weight and 50K–100K a lower weight. Strong personal relevance can still win; no fixed exposure percentage is claimed.
- **Island motion and layout** use a capsule-to-panel clip morph, independent window timing, consistent line icons, aligned card content and shared spacing.
- **Idle advice** displays one small, non-focused 480×250px recommendation after at least eight minutes without mouse/keyboard activity. A 15-second poll means actual delivery can occur up to 15 seconds later. It waits while locked, hidden, opening a repository or in a workspace. Dismiss snoozes another eight minutes; Turn off disables automatic advice.
- **Optional Windows context** derives topic weights from the foreground window title locally. Enable it under Settings → After 8 minutes away. Raw titles are discarded, not stored. No screenshots, OCR, cookies or cloud analysis are used. Without context, including on macOS/Linux, the chosen work topic is used.

[220-idea roadmap with phases and acceptance criteria](docs/ROADMAP-220.md). These are planned items, separately tracked from the changes above. [11.0 validation and packages](docs/CHANGES-v11.md).

![Compact eight-minute work suggestion](docs/insight-v11.png)

The compact suggestion uses deterministic fixture metadata in this native preview.

## Hover stability / 10.1.2 (inherited)

Native pointer/window membership now controls hover so resizing or scaling the island cannot repeatedly expand and collapse it. A fixed anchor preserves dock position near display edges, and stale window acknowledgements cannot override the latest intent. The regression uses an actual desktop pointer and checks stationary hover plus rapid exit/re-entry. See [verified downloads and upgrade instructions](docs/CHANGES-v10.1.2.md).

Quit the old process from the tray before starting the update; closing its window only hides it. Settings must show **11.0.0**.

## Compact actions / 10.1.1

Click the repository name in the small island to open its GitHub page. A short one-line explanation appears below it. The link stays stable on hover, supports keyboard activation and does not also expand the panel. Click empty header space to expand. See [the tested corrections and current installers](docs/CHANGES-v10.1.1.md).

## Live discovery / 10.1.0

Unseen repositories now replace one visible row automatically every 3–10 seconds of active time. Use Live to pause/resume, or tune the interval and choose from 22 transition styles in Settings. Editing, keyboard navigation, workspaces and focus sessions are protected. Hover pause is optional and defaults off in 11.0. Automatic display does not count as a visit or train your interests. After unseen candidates are exhausted, Live can revisit eligible projects after a 30-minute cooldown. Next picks can revisit sooner, with a clear message.

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
| N / U / R | New picks / undo / refresh |
| / | Search saved projects |
| ? | Command help |
| Escape | Close workspace or collapse |

Letter shortcuts can be disabled in Settings.

Copyright 2026 Ravan Sariyev. Distribution license is not yet selected. Signing, automatic updates, browser-store publication and native OS acceptance testing remain release work.

