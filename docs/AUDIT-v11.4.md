# RepoPulse 11.4.0 — broad correctness audit

This audit adds **146 automated regression cases** to the previous 239, for **385 passing tests**. These are test cases, not a claim that 146 distinct bugs existed. The 40 issue groups below distinguish related symptoms and shared root causes.

| # | Issue group | Result | Files |
| --- | --- | --- | --- |
| 1 | Settings roots | Null, primitive and array settings no longer crash parsing. | src/discovery.cjs |
| 2 | Numeric preferences | Boolean, blank and container values cannot accidentally become zero-delay settings. | src/discovery.cjs |
| 3 | Language filters | Trim and deduplicate language names; retain valid names up to 64 characters. | src/discovery.cjs |
| 4 | Profile recovery | Malformed persisted weights recover before recommendation scoring. | src/discovery.cjs |
| 5 | ID lists | Seen, hidden and liked lists reject invalid IDs and deduplicate. | src/discovery.cjs |
| 6 | Cached catalog | Duplicate/invalid cached entries cannot produce duplicate cards. | src/discovery.cjs |
| 7 | Saved repositories | Normalize and deduplicate saved data during startup. | src/discovery.cjs |
| 8 | Daily picks | Normalize and deduplicate persisted daily slots. | src/discovery.cjs, src/engine.cjs |
| 9 | Rotation snapshots | Malformed persisted replacement snapshots cannot break Undo. | src/discovery.cjs |
| 10 | Owner exclusions | GitHub owner casing no longer bypasses a block; migrate duplicate owner variants. | src/discovery.cjs, app/main.cjs |
| 11 | Snoozes | Reject invalid deadlines and discard expired snoozes. | src/discovery.cjs |
| 12 | Undo freshness | Use latest catalog metadata and reapply filters; never resurrect a repo that fell below 70K. | src/discovery.cjs |
| 13 | Async persistence | Reject async/thenable state mutators instead of silently losing their changes. | src/store.cjs |
| 14 | State size | Bound state reads and writes at 32 MB, retaining the original/recovery file. | src/store.cjs |
| 15 | Persistence failure | Clean temporary files on failure and retain both previous in-memory state and original disk data. | src/store.cjs |
| 16 | Startup normalization | Apply the same full state normalization when loading from disk as at startup. | src/store.cjs |
| 17 | Annotation capacity | Guard individual, bulk and collection mutations at the documented 2,000-record limit instead of silently dropping an existing note on next normalization. | src/workspace.cjs |
| 18 | Oversized imports | Reject oversized annotation imports explicitly instead of truncating them. | src/workspace.cjs |
| 19 | Merged capacity | Reject disjoint workspace merges that would exceed capacity. | src/workspace.cjs |
| 20 | Collection inputs | Reject null mutation payloads with a clear error. | src/workspace.cjs |
| 21 | Annotation timestamps | Numbers cannot masquerade as date strings. | src/workspace.cjs |
| 22 | Sort lookup | Inherited Object keys cannot be called as sort comparators. | src/workspace.cjs |
| 23 | Library inputs | Tolerate malformed query, saved and history containers. | src/workspace.cjs |
| 24 | Library identity | Deduplicate library results by repository ID. | src/workspace.cjs |
| 25 | Updated order | Compare actual push instants, including timezone offsets. | src/workspace.cjs |
| 26 | Analytics | Exclude impossible future history and handle unavailable history lists. | src/workspace.cjs |
| 27 | Eligibility | Reject invalid/non-finite metadata before it enters ranking. | src/engine.cjs |
| 28 | Topic scoring | Missing or malformed topics cannot crash scoring. | src/engine.cjs |
| 29 | UI state ordering | Reject primitive, array and invalid-revision responses instead of corrupting the current UI state. | app/ui-core.js |
| 30 | Paging and zoom | Clamp fractional indexes/counts and handle non-finite directions. | app/ui-core.js |
| 31 | Search/history | Skip malformed records and handle missing search text. | app/ui-core.js |
| 32 | Compact ticker | Unavailable lists and leading punctuation cannot produce a crash or empty summary. | app/ui-core.js |
| 33 | Morph geometry | Keep coordinates, tempos and row-list measurements finite. | app/morph.js, src/layout.cjs |
| 34 | Animation config | Inherited preset names, negative/invalid speed and invalid hover scale use safe defaults. | app/island-motion.js |
| 35 | Scheduler | NaN random sources cannot schedule a hot loop; a zero timer ID remains correctly armed. | app/dynamic-feed.js |
| 36 | Release requests | Short error cache, cross-repository rate-limit backoff and bounded 256-entry cache prevent repeated failing requests and unbounded growth. | src/navigation.cjs |
| 37 | Activity requests | Wait for all requests, retain successful partial metadata, retry partial errors sooner, bound cache and reset deadlines. | src/activity.cjs |
| 38 | Export/install | RSS deduplicates and validates repos and repairs invalid Unicode; package commands enforce the npm name length limit. | src/feed.cjs, src/install.cjs |
| 39 | Desktop lifecycle | Retry missing sync timestamps, pause cycling while locked, prevent late context results after lock, isolate global shortcut failures and clear old insights on reset. | app/main.cjs, src/window-policy.cjs |
| 40 | Visible preferences and drafts | Honor owner/opacity preferences, recover stale selected rows and retain edits typed while an earlier note save is pending. | app/renderer.js, app/main.cjs, app/ultimate.js |

## Validation

Source: [aa95c966](https://github.com/rvnsre/RepoPulse/commit/aa95c96607d4cbf7358b799148b7b9664306cf3c). [CI/build run](https://github.com/rvnsre/RepoPulse/actions/runs/44183685615). Unit tests and syntax/config checks passed. Native Electron smoke includes responsive 440/600/960 px layouts, 100/150% text, rapid hover reversals, actual IPC, owner visibility and the pending-save draft race. Native UI runs on Linux/Xvfb; Windows/macOS build success does not claim real-display testing on those operating systems. Opacity support remains compositor dependent.

The prior 70K minimum and bundled 301 verified repositories are preserved. No fake repositories or inflated issue counts were added.
