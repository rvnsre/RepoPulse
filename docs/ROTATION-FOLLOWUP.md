# Independent rotation follow-up

Base: main 654bbbbb0e24ef32df68a9dd31d93ea172caa4aa, version 13.0.0.
PRs #15–18 were merged while the follow-up was being prepared. Their changes
remain intact. These additional commits require their own review and CI.

The main process still had a single three-second automatic-swap throttle. Four
renderer timers staggered by 300ms could not all pass that gate. The throttle now
uses four stable slot indices, derived from the current repository IDs in the
main process, and honors the configured interval independently. Invalid slots,
early repeated swaps and backward clocks are rejected. Tests exercise the exact
300ms stagger and interval boundary; native smoke now requires all four original
cards to change rather than only the first card.

Automatic sync/range counters no longer have live status roles. Manual Next
continues to announce its actual results through the explicit toast. If rotation
was explicitly started, Next resets timers and retains that mode rather than
silently entering a permanent manual-browsing hold. The renderer smoke covers
this case. Publication also waits for the accessibility job before evaluating
the remaining required evidence gates.

Local combined validation: 486/486 tests pass, syntax/JSON checks pass and the
working diff is clean. The real-renderer accessibility smoke passed default and
forced-colors scans with zero detected violations; the remaining incomplete
contrast checks require human review. The earlier #16 CI run 45490932762 passed,
but does not cover this follow-up. This PR needs its own native/platform CI.

No catalog data, endpoints, credentials or workspace migration changed. Existing
fixture screenshots in ROTATION-VALIDATION.md show the same visible interface.
Rollback: revert this follow-up; the previous global-throttle and manual-hold
limitations return. No release is authorized by this change.
