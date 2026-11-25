# Master specification audit — 25 November 2026

Baseline: `1c82f59c35112b3c3f5ec26d50d0e1ea17c403f9`, package and lockfile version 13.0.0.
The supplied 536-line specification is preserved in MASTER-SPEC-v13.txt.

## Evidence inspected

README, package metadata/lockfile, app renderer/main/preload, src, scripts, tests,
build.yml and publish.yml, repository issue search and recent PRs (#9–14).
Issue search returned no open issues. The referenced chat contains the research
request and a statement that research started, but no completed research findings.
Those findings must be supplied before claiming they have been implemented.

## Baseline reproduction

- `npm test`: 467 passed, zero failed/skipped outside the restricted environment.
  Initial restricted run: 466 passed, one loopback preview failed with EACCES.
- `npm run check`: passed syntax, JSON and companion taxonomy validation.
- Bundled snapshot: 531 records, 531 unique IDs, 531 at >=20,000 stars;
  declared verification timestamp 2026-11-21T09:23:28.335Z. These are snapshot
  counts, not a fresh GitHub verification or a claim of 20,000 projects.
- Minimum-stars UI omits 20K although settings default to 20K.
- New installs and liveRevision migration enable automatic rotation.
- CardScheduler ignores selected interval settings and uses 5 seconds.
- Keyboard pause depends on an optional setting and resumes when focus leaves.
- `nextStatus` is a live status region updated during automatic replacement.
- README links v12.1.0 despite package version 13.0.0 and claims >10,000 projects;
  the checked-in snapshot contains 531.
- Publication checks packaging jobs, but lacks dedicated accessibility, security,
  SBOM, secret, data-integrity and installed-package gates. macOS/Linux packaging
  is not installed-package smoke evidence. Signing is disabled in packaging.
- Collector rejects incomplete_results and shards star ranges, but has no durable
  resume checkpoint; identical-star cohorts >1,000 fail. Release collection uses
  requireComplete:false and should not be described as complete inventory.

## Delivery and release policy

The first PR makes publication fail closed for every named required gate.
Missing gates intentionally block publication until implemented and validated;
adding a name is not evidence of having performed that check.

Follow-up PR areas: settings and rotation; catalog correctness; documentation;
security and installed-package CI; professional discovery and localization;
read-only metadata adapters with provenance and offline behavior.

The full specification remains open. No platform accessibility evaluation,
professional-user study, live metadata validation or release success is claimed.
Do not invent before/after usability metrics. Run the specified clinician,
engineer, researcher and student protocols with participants before reporting KPIs.
