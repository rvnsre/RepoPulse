# RepoPulse

**A little signal. A lot of possibility.**

A floating Dynamic Island for discovering three personalized GitHub projects each day. Designed for Windows, macOS and Linux. Private interests, meaningful explanations, and a strict **50,000+ star** threshold.

## What is implemented

- Transparent, frameless, draggable island; collapse/expand, always-on-top control and system tray.
- Daily three-project selection based on local calendar date. Existing picks stay stable through the day; previously presented projects are not repeated.
- GitHub Search API catalog with six-hour local cache, timeouts, rate-limit errors and cached offline access.
- Eight interest categories, affinity ranking, brief explanations, owner diversity and deterministic daily variety.
- Save, search saved projects, like, hide, and open repositories with one click.
- On-device personalization from chosen interests, reactions and an explicitly imported browser interest profile.
- Optional browser companion for Chrome, Edge and Brave. History permission is requested only when the user clicks Analyze. Revocation is included.
- Reduced-motion controls, keyboard focus states, safe text rendering, sandboxed renderer and a limited preload API.
- Atomic local settings storage, recovery copies for unreadable state, and a confirmed local-data reset.
- GitHub Actions verification and Windows/macOS/Linux packaging; browser companion download artifact.

## Run from source

Requires Node.js 24+ and npm.

```sh
npm install
npm start
```

Toggle the island with **Ctrl/Cmd + Shift + Space**. Drag its top bar to move it. Hide it from Settings; open it again from the system tray. Use Quit to stop the process.

```sh
npm test
npm run check
npm run dist
```

Packaging targets: Windows NSIS installer and portable EXE; macOS DMG and ZIP; Linux AppImage, DEB and RPM. Artifacts are built by the [Actions workflow](https://github.com/rvnsre/RepoPulse/actions). Check the run status before downloading. Installers are unsigned until platform signing identities are configured.

Build tools are pinned to explicit versions. The first build produces a dependency lock in its artifact; a reviewed lockfile should be committed before a production release.

## Connect browser interests

1. Open Edge/Chrome/Brave extensions, enable Developer mode, choose **Load unpacked**, and select the `extension` folder.
2. Open the RepoPulse companion and choose **Allow history & analyze locally**.
3. The companion classifies titles and host names from at most 1,000 pages visited over 30 days. Classification happens in the popup on your device.
4. Export `repopulse-interests.json`. It contains a schema name and topic weights only: no URLs, page titles, cookies or identifiers.
5. In the desktop app open **Tune your feed → Import browser profile**.

The companion has no background worker, telemetry, remote API, or cookie permission. It does not continuously sync. Reanalyze and import whenever you want to update interests. Manual interests work without installing the companion. History analysis is a lightweight keyword heuristic, not a claim of AI-level understanding.

## Daily discovery rules

Only non-archived, non-fork projects at or above 50,000 stars qualify, based on the most recently fetched GitHub catalog. Up to 300 of the most-starred eligible projects are cached. Reactions update future rankings without rearranging today's existing picks. Hiding a pick fills that slot from unseen eligible projects if possible. All displayed daily picks are marked presented so the next day will not repeat them.

There is a finite pool of 50K+ projects. If fewer than three unseen projects remain, the app shows fewer picks and explains why. It does not silently lower the threshold or recycle old recommendations. Refresh the catalog later, or deliberately reset local data to restart discovery. Counts can be up to six hours old. GitHub may rate-limit unauthenticated requests.

The date changes at local midnight while the app runs, or on the next launch. No operating-system background schedule is installed. Linux autostart is configured through desktop session settings. No GitHub account, API key, paid AI provider or backend is required.

## Architecture

| Folder | Responsibility |
| --- | --- |
| `app` | Electron main process, isolated preload, accessible vanilla JavaScript UI |
| `src` | Pure recommendation engine, GitHub catalog client, local atomic store |
| `extension` | On-demand browsing-interest analysis and score-only JSON export |
| `test` | Ranking, no-repeat, threshold, profile validation, API and storage tests |
| `scripts` | Static checks, shared taxonomy generation and a development visual harness |
| `docs` | Product plan, privacy design and release checks |

`node scripts/preview.cjs` serves a development-only design preview at `http://127.0.0.1:4173`. Its repository descriptions and star counts are **sample data**, never used by the desktop app. It is excluded from packaged apps.

See [Product plan](docs/PLAN.md), [Privacy](docs/PRIVACY.md) and [Release checklist](docs/RELEASE.md).

## Status

Version **0.1.0 — initial implementation**. Automated logic tests are included. Native installers and platform behavior require successful CI builds and platform smoke tests before this can be described as production-ready. App-store publication, code signing, automatic updates and continuous browser synchronization are not implemented.

Copyright © 2026 Ravan Sariyev. No license has been granted for redistribution; choose a license before accepting external contributions.
