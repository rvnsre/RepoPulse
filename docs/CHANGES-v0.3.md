# RepoPulse 0.3 — usability and animation changes

Each item below is implemented in this version. Native smoke tests cover the critical browser actions, replacement, readable text, stable DOM and zoom; pure regression tests cover navigation, release lookup, layout, preferences and UI state.

| # | Addition or correction | Implementation |
|---|---|---|
| 1 | Learn More opens the exact GitHub repository in the default browser | navigation.cjs, main.cjs |
| 2 | Install opens /releases only after checking public releases | navigation.cjs |
| 3 | Missing releases have an explicit disabled state | renderer.js |
| 4 | Rate limits remain unknown, with a retry message | navigation.cjs |
| 5 | Release checks time out rather than hanging | navigation.cjs |
| 6 | Release metadata is cached for 15 minutes | navigation.cjs |
| 7 | Concurrent release checks share one request | navigation.cjs |
| 8 | Details has a manual release-check retry | renderer.js |
| 9 | Guide explicitly opens the README | renderer.js |
| 10 | Actions are available on each individual row | renderer.js |
| 11 | Selected repository is named beside the global actions | index.html |
| 12 | Hover no longer changes action targets | renderer.js |
| 13 | Save retains the row DOM and keyboard focus | renderer.js |
| 14 | Replacement animates only the changed slot | renderer.js |
| 15 | Rapid replacement/undo cancels stale transitions | renderer.js |
| 16 | Rapid collapse/expand follows the newest request | renderer.js |
| 17 | State updates are coalesced per animation frame | renderer.js |
| 18 | Older IPC snapshots cannot overwrite newer state | ui-core.js, main.cjs |
| 19 | System reduced-motion preference is respected | ui-core.js |
| 20 | Explicit System / Full / None motion choices | discovery.cjs |
| 21 | Three animation-duration presets | discovery.cjs |
| 22 | Hidden-window row animations are cancelled | renderer.js |
| 23 | Hover expansion has a cancellable delay | renderer.js |
| 24 | Repository names use a 24px baseline | styles.css |
| 25 | Descriptions use a 14px baseline and commands 13px | styles.css |
| 26 | Text scaling at 100%, 115%, 130%, 150% | styles.css |
| 27 | Ctrl/Cmd plus, minus and zero control text scale | renderer.js |
| 28 | One, two or three visible repository rows | renderer.js |
| 29 | Three panel-width presets | layout.cjs |
| 30 | Window size follows measured content and display bounds | main.cjs, layout.cjs |
| 31 | Narrow layouts stack columns without horizontal overflow | styles.css |
| 32 | Optional command panels | renderer.js, styles.css |
| 33 | Optional descriptions, owners and relevance reasons | renderer.js |
| 34 | Repository-name wrapping control | styles.css |
| 35 | Command wrapping control | styles.css |
| 36 | Exact or compact star counts | renderer.js |
| 37 | Visible focus rings and persistent row actions | styles.css |
| 38 | Drawer refresh preserves focused input, cursor and scroll | renderer.js |
| 39 | Saved search combines multiple terms and topics | ui-core.js |
| 40 | Saved/history language filtering and result counts | renderer.js |
| 41 | Clear-search control | renderer.js |
| 42 | Optional unique-repository history | ui-core.js |
| 43 | Export history as local JSON | main.cjs |
| 44 | Delete an individual history entry | main.cjs |
| 45 | Copy repository as a Markdown link | main.cjs |
| 46 | Exclusions screen lists hidden, snoozed and blocked items | renderer.js |
| 47 | Restore an individual exclusion | main.cjs |
| 48 | Restored hidden/snoozed projects are removed from no-repeat memory | main.cjs |
| 49 | Reset appearance independently from filters | renderer.js |
| 50 | Toast duration presets | discovery.cjs |
| 51 | Optional keyboard shortcuts; N for next and I for releases | renderer.js |
| 52 | Escape closes the drawer even while typing | renderer.js |
| 53 | Screen-reader announcement after replacement | index.html, renderer.js |
| 54 | Invalid cache timestamps trigger catalog refresh | main.cjs |
| 55 | Native UI screenshots and regression checks for new behavior | scripts/smoke.cjs |
| 56 | Appearance preferences are validated during migration | discovery.cjs |

All paths above refer to app/ or src/ as appropriate. Releases are opened in a browser; RepoPulse does not execute installers or copied commands. The optional browser extension still analyzes history only after an explicit user action; cookie/session secrets are not read.
