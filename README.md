# RepoPulse 0.2

A reference-inspired, wide GitHub RSS island for Windows, macOS and Linux.

Two repository rows, a warm-to-ocean gradient, connecting arrows, source command blocks, Copy controls and centered **Install / Learn More** actions. A third daily pick is kept in the queue and can be shown with **Next pair**. The surrounding laptop, wallpaper and editing tools in the reference are presentation context, not part of the desktop widget.

![RepoPulse reference panel](docs/preview-v0.2.png)

*Native application preview with illustrative test metadata.*

## Click, discover, continue

Opening a repository successfully replaces that exact row with the highest-ranked unseen eligible project. The neighboring row remains in place. Double clicks do not consume multiple recommendations. **Undo** restores the last replacement. Saved and history views preserve deliberate access to older projects.

The initial queue contains up to three projects per local day. Opening projects can reveal additional projects that day. The catalog remains strictly **50,000+ stars**, non-archived and non-fork. If the eligible pool runs out, the app shows an honest empty state instead of repeating projects or fabricating data.

## Included

- Wide reference layout, responsive narrow-screen behavior, collapsed island and expanded workspace.
- Exact-row replacement, undo, duplicate-click protection and no-repeat memory.
- History with timestamps, saved collection, search and sorting by name, recency or stars.
- Copy source commands, inspect commands and repository links.
- Official installation guide access: **Install opens the repository README**. It does not run an installer or execute copied commands. **Learn More** opens local project details.
- Owner exclusions, seven-day snooze, hidden-project controls and explicit restoration.
- Language filters, adjustable minimum stars with a hard 50K floor, and transparent relevance explanations.
- Manual interests, browser-profile import/export and an option to pause reaction learning.
- Local collection import/export and daily RSS 2.0 export.
- Reference, graphite and high-contrast palettes; compact density, reduced motion and opacity control.
- Screen anchoring, remembered window position, hover expansion, system tray and a global shortcut.
- Optional new-day notifications and launch at login on Windows/macOS; Linux uses session settings.
- Cached offline access, rate-limit feedback, corrupted-state recovery and local-data reset.

The [feature inventory](docs/FEATURES.md) maps 36 additions to their implementation. See the [product plan](docs/PLAN.md), [privacy details](docs/PRIVACY.md) and [release checklist](docs/RELEASE.md).

## Run and build

Requires Node.js 24+ and npm:

```sh
npm install
npm start
npm test
npm run check
npm run dist
```

GitHub [Actions](https://github.com/rvnsre/RepoPulse/actions) builds Windows NSIS/portable EXE, macOS DMG/ZIP and Linux AppImage/DEB/RPM. Download artifacts from a successful run. They are unsigned preview builds. Packaging success does not replace real-device checks for display scaling, transparency, multi-monitor behavior or OS installation prompts.

The Linux native UI test opens the real Electron interface, checks layout dimensions, captures pixels, saves a project, opens and replaces a row, undoes the replacement and visits the interests/settings/collection screens. The native preview uses sample public-project metadata; its star counts are illustrative, not live claims.

## Browser interests

Load `extension/` unpacked in Edge, Chrome or Brave. Its popup requests optional history permission only when you choose Analyze. It processes up to 1,000 recently visited pages locally and exports `repopulse-interests.json`, containing recognized topic weights only. Import that file under **Interests** in the desktop app.

There is no cookie access, background tracking, remote AI service or automatic browser-to-desktop synchronization in this release. Topic detection is a local keyword heuristic. Closing the popup discards analysis memory; permission can be revoked in the popup.

## Keyboard

| Shortcut | Action |
| --- | --- |
| Ctrl/Cmd + Shift + Space | Toggle island |
| J / K | Select repository row |
| Enter | Open focused repository |
| S | Toggle save for selected repository |
| U | Undo last replacement |
| R | Refresh catalog |
| / | Search saved repositories |
| Escape | Close workspace or collapse panel |

## Data and limits

The app keeps a public GitHub metadata cache for up to six hours. Personal interest weights, history, exclusions, preferences and collections stay in per-user local storage. No GitHub account, API key or hosted backend is required. GitHub still receives ordinary connection metadata when public catalog requests are made.

A finite 50K+ catalog cannot supply unlimited unseen projects. Snooze deliberately permits a project to return after seven days; Undo deliberately restores an earlier row. These are explicit exceptions to automatic no-repeat selection. Filters do not reduce the threshold below 50K. Opening or liking projects updates future relevance unless learning is paused.

Source layout: `app/` desktop UI and process isolation; `src/` recommendation/state/feed logic; `extension/` optional local analysis; `test/` automated tests; `scripts/` validation and native UI checks; `docs/` product and privacy documentation.

Copyright 2026 Ravan Sariyev. Distribution license is not yet selected. Code signing, automatic application updates, browser-store publication and automatic browser synchronization remain future work.
