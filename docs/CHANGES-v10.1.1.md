# RepoPulse 10.1.1 — Compact repository actions

The compact island keeps its small 360 × 80 CSS-pixel window. The repository name is now a real button with a short one-line explanation. It opens that repository in the default browser. Click empty header space or the RepoPulse brand to expand; the expanded header can still be dragged. Tab then Enter/Space also activates the compact repository button.

Hovering the compact repository or toolbar keeps that click target stable. Other header hover continues to reveal the panel. Compact hover/keyboard interaction is protected from Live rotation. Focus-session timing remains on the clock control instead of replacing the repository name. Long names/descriptions have ellipsis and a full tooltip; an empty feed disables the action with an explicit explanation.

## Corrections and interaction improvements

The list separates concrete corrected behavior instead of treating every regression test as a separate feature.

| # | Previous issue | Result |
|---|---|---|
| 1 | Empty compact click target | Replaced pointer-ignoring label with a native button. |
| 2 | Missing compact purpose | Added a one-line, six-word summary. |
| 3 | Hover displaces the click target | Protected compact link and toolbar hover from automatic expansion. |
| 4 | Blank header cannot activate reliably | Made collapsed blank space clickable; expanded header retains dragging. |
| 5 | Keyboard cannot reach the compact label | A focusable button supports normal Enter/Space activation. |
| 6 | Repository click also triggers expansion | Stops propagation and opens only the intended GitHub destination. |
| 7 | Fast double click opens a replacement | Ignores a second click in the same double-click sequence. |
| 8 | Card swaps during compact interaction | Protects hover/focus and captures the pointer-down repository. |
| 9 | Timer replaces the compact repository name | Keeps repository identity visible during focus sessions. |
| 10 | Empty or stale compact selection | Uses the currently displayed feed with an explicit disabled fallback. |
| 11 | Absolute dock label overlaps controls | Uses a bounded header grid with ellipsis and full-description tooltip. |
| 12 | Cancelled response can clear UI state | Retains the previous snapshot for null/undefined responses. |
| 13 | Notes lose code indentation | Preserves note whitespace and trailing newlines. |
| 14 | Null annotation crashes metadata | Normalizes null input safely. |
| 15 | Boolean rating becomes one star | Rejects Boolean-to-number coercion. |
| 16 | Boolean collection ID selects repository 1 | Accepts only positive integer IDs or decimal strings. |
| 17 | Undated local notes reject dated imports | Compares missing timestamps as absent instead of year 2000. |
| 18 | Prototype-like analytics labels corrupt counters | Uses dictionaries without inherited properties. |
| 19 | Rated/visited search operators mismatch views | Adds is:rated and is:visited. |
| 20 | Topic operator has inconsistent casing | Matches GitHub tags case-insensitively. |
| 21 | Malformed repository identifiers | Rejects zero/negative IDs, path traversal segments and excessive names. |
| 22 | Invalid repository metadata reaches UI | Validates stars, push dates, licenses and descriptions; normalizes languages and topics. |
| 23 | Windows BOM resets readable settings | Accepts a UTF-8 BOM in state files. |
| 24 | Unordered history keeps the wrong 500 records | Sorts newest-first before applying the history limit. |
| 25 | Native fit overflows tiny displays | Bounds fitted heights to the actual work area, including invalid numeric inputs. |
| 26 | Release cache duplicates case variants | Uses GitHub's case-insensitive repository identity. |
| 27 | Blank release tag enables Install | Rejects empty/whitespace tags. |
| 28 | Startup keyboard event dereferences unloaded state | Ignores shortcuts until a snapshot is ready. |
| 29 | Editing context and focus are misclassified | Protects contenteditable shortcuts and resets keyboard mode on window blur. |
| 30 | Root animation survives hide/reduced motion | Cancels pending root animation alongside row effects. |

## Validation

156 unit tests pass, including 30 added regression tests. Syntax/JSON and extension taxonomy checks pass. The real Linux Electron suite verifies compact hit-area bounds, stable hover, direct repository navigation, no duplicate double-click open and empty-header expansion, alongside the Live rotation, all 22 animation scenes and existing workspace/navigation checks.

Native fixture screenshots use sample metadata; auto-hide and rotation are temporarily disabled for a stable initial capture. Installed-device acceptance and platform signing remain separate release work.

Code commit: `f8c6c7eb62bb63bbc76608c69a76946b5922bb1f`.

All five jobs in [build 44048705222](https://github.com/rvnsre/RepoPulse/actions/runs/44048705222) completed successfully.

| Platform | Installer download |
|---|---|
| Windows x64 EXE | [Windows ZIP](https://github.com/rvnsre/RepoPulse/actions/runs/44048705222/artifacts/14312523330) |
| Linux x64 AppImage / DEB / RPM | [Linux ZIP](https://github.com/rvnsre/RepoPulse/actions/runs/44048705222/artifacts/14312996770) |
| macOS arm64 DMG / ZIP | [macOS ZIP](https://github.com/rvnsre/RepoPulse/actions/runs/44048705222/artifacts/14312837002) |
| Native screenshots | [Preview ZIP](https://github.com/rvnsre/RepoPulse/actions/runs/44048705222/artifacts/14312069000) |

These are unsigned GitHub Actions artifact ZIPs, not attached release assets. Sign-in may be required. Extract the archive and use the installer in dist/. Downloads expire on 17 December 2026.
