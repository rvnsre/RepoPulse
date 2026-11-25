# User-controlled rotation validation

Baseline: main 1c82f59c35112b3c3f5ec26d50d0e1ea17c403f9, version 13.0.0.

## Reproduced before fixing

The new rotation-control tests failed on baseline: fresh defaults enabled rotation,
the per-card scheduler ignored a 15-second preference, and no latched pause API
existed. The initial real-renderer smoke also exposed Next losing focus while
disabled during a request, hidden Start/Pause controls, and forced-color contrast
and landmark errors. These were corrected without changing catalog records.

## Behavior

New installs and migration from liveRevision <3 start in Manual. A user's existing
interval is replaced by a 15-second default because the previous UI interval was
not honored by the card scheduler. 5/10/15/30-second presets and a custom 5–3600
second interval are available. Four card timers keep a 300ms stagger.

Focus entering a card or the compact repository control stops and persists
automatic rotation. Leaving focus and state refresh do not restart it. Start is
explicit. Hover is additional, optional protection. A late in-flight replacement
defers DOM reconciliation while the old card owns focus. Manual Next preserves
its button focus and announces count and actual eligible remaining count.

System reduced motion pauses rotation at startup and when enabled, and prevents
nonessential movement even if the app's motion setting was Full. Start remains
available as an explicit choice. The 2x2 layout remains, with visible controls
before it and a >=44px Next target.

## Local evidence — Windows

- `npm test`: 476 passed, no failures/skips.
- `npm run check` and `git diff --check`: passed.
- `npm run test:accessibility`: real Electron renderer, fixture-only loopback
  server, focus/settings/manual Next/reduced-motion/150% text checks passed.
- axe-core default and forced-colors scans: zero detected violations. Incomplete
  checks are preserved in CI JSON; gradients and short decorative glyphs require
  human contrast inspection. Automated scans do not establish WCAG conformance.
- Screenshots in docs/media/rotation-*-fixture.png use clearly labeled synthetic
  test projects, never production inventory. CI uploads complete scan reports.

## Remaining validation

Linux CI and native package smoke must pass. Windows screen-reader checks with
NVDA and macOS VoiceOver, platform package tests, and representative participant
studies remain outstanding. This PR does not authorize publication or claim
that the full master specification is complete.

No network data flow, credentials, professional ranking or metadata adapter
changes are included. Existing local settings migrate once; rollback reverts the
code, but does not automatically re-enable rotation in stored settings.
