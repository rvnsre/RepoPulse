# Security, data and cross-platform evidence gates

This PR adds real CI producers for several names already required by the
fail-closed publication policy. A job name alone is not evidence that a scan ran.
Publication waits for these jobs and still refuses the remaining missing gates.

- `security`: pinned official CodeQL v4 action, JavaScript/TypeScript
  security-extended queries, local SARIF output, no database/code-scanning upload.
  Missing/malformed SARIF or any result requires review and fails the gate.
  SARIF suppression annotations do not bypass the explicit result check.
- `dependency-audit`: npm advisory audit at low severity, preserving its report
  even on failure. The public lockfile dependency graph is sent to npm; no app
  workspace, notes, history or credentials are involved.
- `secret-scan`: pinned open-source Gitleaks CLI v8.30.1 built via Go's checksum
  verified module install. This uses the CLI, not the commercial GitHub Action.
  Full checked-out commit ancestry is scanned with 100% redaction; inline allow
  comments cannot suppress findings. Any finding or scanner/report failure blocks
  the job. Only finding count, scanner version and commit are uploaded. Secret
  values, matches, paths and author details are deliberately excluded from that
  summary. No PR comments, email or third-party license validation is configured.
- `sbom`: CycloneDX application dependency SBOM generated from the exact lockfile.
  This is a source/build dependency inventory, not an assertion that every native
  library inside every installer has been inventoried or licensed.
- `data-integrity`: validates the actual catalog artifact, counts, immutable IDs,
  case-insensitive names, eligibility, timestamps and collection provenance. It
  explicitly reports `liveVerificationPerformed:false`: structural validation is
  not a fresh GitHub star/metadata observation. PR catalog collection is still
  skipped by the existing workflow; that skip must not be described as a live scan.
- `integration`: aggregates real renderer checks on Windows, macOS arm64,
  macOS Intel and Linux. All four matrix jobs must succeed. Reports/screenshots
  are preserved. This exercises source Electron renderer builds; it is additional
  to packaging, not a substitute for installed-package tests.

New action references are pinned to full upstream commit SHAs observed during
implementation. Go 1.25's current patch is resolved by the pinned setup action;
the exact resolved version is recorded in job logs. Scanner source version is
pinned. Existing unrelated action references remain unchanged.

## Local validation and limits

487/487 tests pass on this independent branch. Three new tests reject ambiguous
or nonempty scan reports, prove secret summaries omit raw sensitive fields, and
reject false catalog counts/duplicate records/future dates/incomplete provenance.
The checked-in catalog passes structural validation with 531 actual records and
its original 21 November timestamp. Syntax/JSON/diff checks pass.

CodeQL, Gitleaks and all four new platform integrations require their own CI run;
they were not claimed as locally executed. A successful scan does not prove that
all vulnerabilities or secrets have been found. Any false-positive exception
must be narrow, evidence-backed and documented; do not add broad path exclusions
or silently accept results merely to get a green gate.

The first CI run, 45580333453, exercised these gates: all four renderer platforms,
dependency audit, SBOM, secret scan and catalog validation passed. CodeQL produced
five results and the explicit gate correctly failed. Four concerned stat/read
path races in checkpoint loading, SARIF loading, workspace import and state
loading; the fifth was an imprecise URL regex in a test assertion. The follow-up
uses one bounded opened descriptor, catches growth after fstat, and preserves
already-read corrupt-state bytes for recovery. Oversized/unreadable originals
are preserved by rename rather than an unbounded copy. URL testing now checks
the exact XML attribute string. No scan result was suppressed. Three additional
real-filesystem tests reproduce path replacement and growth and verify bounds;
490 local tests pass. The new CodeQL run must independently confirm the fixes.

## Remaining publication blockers

The policy still requires artifact checksum verification, signing/notarization
status, actual installed Windows/macOS arm64/macOS x64/AppImage/DEB/RPM tests,
and all remaining master-spec acceptance work. Human accessibility and domain
participant validation are also outstanding. No new release or version bump is
introduced. New checks are not configured to manufacture missing evidence.

Rollback: revert this PR's workflow and verifier scripts. The separate required
gate policy remains, so removal of a producer blocks publication rather than
weakening it. No application data or workspace migration changes.

Primary tool references:
https://docs.github.com/en/code-security/code-scanning
https://github.com/github/codeql-action
https://github.com/gitleaks/gitleaks/tree/v8.30.1
https://docs.npmjs.com/cli/v11/commands/npm-audit/
https://docs.npmjs.com/cli/v11/commands/npm-sbom/
