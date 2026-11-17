# RepoPulse 11.5.0 — verified 50K+ catalog

The user requested 3,000+ repositories with at least 50,000 stars. The public GitHub search `stars:>=50000 archived:false fork:false` returned **531 unique active, non-fork repositories** across pages of 100, 100, 100, 100, 100, 31 and 0 results. All 531 were individually fetched from the public repository API and verified before bundling; the smallest observed count was **50,033 stars**. The old snapshot had 301 entries. The new production snapshot adds 230 real repositories; it does not fabricate a 3,000-entry pool.

The catalog's target is 3,000 and supported capacity remains 5,000. A **3,101-entry synthetic test fixture** verifies sharded pagination beyond GitHub's 1,000-result search limit. Synthetic entries exist only in tests and are excluded from production builds.

## Changes

- Added `src/catalog-policy.cjs` to share the 50K eligibility floor, 3,000 target, 5,000 capacity and revision across ranking, settings, fetching and migration.
- Shipped the full 531-entry normalized snapshot in `src/catalog-seed.json` for offline startup.
- Fixed existing 70K installations staying in their nonempty 301-entry cache. The one-time revision upgrade merges the snapshot, retains bookmarks/history/interests and revalidates the network timestamp. The former default 70K filter moves to 50K; explicit higher filters remain intact.
- Updated settings, reset actions, RSS, notifications and visible star-range descriptions to 50K.
- Reject repeated search pages and overlapping shards instead of labelling an incomplete unique catalog complete.
- Reject negative, non-integer and contradictory search totals, and missing totals at the 1,000-result cap.
- Preserve a nonempty cache when GitHub returns a false empty successful response.
- Bound the ETag page cache to 256 entries and fail early above supported catalog capacity.
- Canonicalize zero-padded imported IDs before checking annotation capacity.

## Validation

Tests cover the exact 50K boundary, migration once, explicit filter preservation, nonempty-cache offline upgrade, snapshot integrity, malformed and duplicate pagination, false-empty responses, and 3,101 unique sharded test entries. Native smoke inserts a real verified 50K–70K repository and requires its card to render through actual Electron IPC, with the correct visible 50K label. Existing geometry, pointer reversal, note-save race and data-preservation checks remain enabled.

Native UI smoke runs on Linux/Xvfb. Platform packaging is checked separately and does not substitute for real-display UI testing on Windows or macOS.

Source commit: [b987ac51](https://github.com/rvnsre/RepoPulse/commit/b987ac516aadc1d09d5f637a587438f43a784faa). **401 tests passed, 0 failed**, including the 3,101-entry sharded fixture. Syntax/configuration checks passed. [Builds and installers](https://github.com/rvnsre/RepoPulse/actions/runs/44193571450).
