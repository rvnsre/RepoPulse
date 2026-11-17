# RepoPulse 11.2.0 — nonempty 70K+ catalog

The reported blank widget was caused by three combined issues: a three-page (300-project) fetch cap, treating the persistent seen list as a permanent discovery exclusion when filling a new day, and removing opened slots without a replacement. The small empty-panel height also clipped the recovery explanation.

Changes:
- All recommendation and RSS eligibility now requires at least 70,000 stars. Existing lower minimum settings clamp upward; higher filters remain intact.
- Fetch all eligible pages, and split by non-overlapping star ranges beyond GitHub's 1,000-result query limit. Catalog capacity is 5,000 entries and tested with 2,105 unique eligible test records. Background search calls are paced; incomplete/limited responses preserve the existing cache.
- Fill missing daily slots from the least-recently shown eligible candidates after unseen candidates run out. Live can continue after exhaustion. Never pick a currently visible neighbor as the replacement. If no alternative exists, keep the current card.
- Repair persisted zero-pick snapshots at startup before rendering. A real GitHub-API-verified starter catalog supports offline/cold startup without pretending a fresh network sync occurred.
- Honor language, hidden, blocked-owner and snooze filters during recycling. Do not erase history, bookmarks or interests to repair the feed.
- Show a usable 360-DIP empty-filter view and a Reset feed filters action instead of a tiny blank strip.

## Real catalog size

On 18 November 2026 (Asia/Baku), the connected GitHub repository search for `stars:>=70000 archived:false fork:false` returned 100, 100, 100 and 1 result across four pages: **301 unique repositories**. Therefore 2,000 real eligible repositories could not be added under this threshold at the time of the check. The app supports that capacity when the qualifying public pool grows. No generated project, duplicated ID or fabricated star count is shipped to inflate the total.

The bundled starter data contains 24 real repositories, individually read from the public GitHub repository API and validated above the floor. It is not the complete online catalog and is not counted as a successful current sync.

## Validation

Unit regressions cover the 70K floor/migration, seen-history and day rollover recovery, non-shrinking small pools, filters and exclusions, changed star counts, real offline bootstrap, pagination beyond 300 and a synthetic 2,105-project sharded fetch. The synthetic records are test fixtures only and are not packaged as the production catalog.

Native regressions reproduce the zero-pick/new-day/fully-seen state and require automatic recovery to three 70K+ cards, unchanged history/preferences, a readable restrictive-filter state and successful Reset recovery.

Final CI and installers are recorded below after completion.
