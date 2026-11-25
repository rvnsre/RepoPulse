# Complete, resumable release catalog collection

Baseline main: 1c82f59c35112b3c3f5ec26d50d0e1ea17c403f9 (13.0.0).

The release collector passed `requireComplete:false`. A fixture reporting two
results but returning one is accepted by that mode with `complete:false`; the
release script then checked only its inventory target, not completeness. Its
retry loop also truncated long server retry deadlines to 65 seconds and used
constant delays rather than exponential backoff. Pages were lost on interruption.

The release collector now requires complete partition inventory before writing
the target file. Existing star-range splitting, immutable-ID deduplication and
shortfall detection remain. Identical-star cohorts exceeding GitHub's 1,000-result
cap still fail safely; this PR does not implement date subdivision or claim an
unlimited collection capability. Capacity remains 30,000, target 10,001 and source
eligibility 5,000 stars. These are policy values, not measured inventory.

## Checkpoints and provenance

Each successful complete API page is normalized and stored under a SHA-256 URL
key in `<target>.checkpoint/`. Only fixed GitHub repository-search endpoints are
accepted; credentials/headers are never serialized. Pages are bounded to 1 MiB,
must have valid records and totals, and expire after one hour. Corrupt, expired
or future-dated pages are ignored. Atomic page writes allow another invocation
to resume after interruption. The final snapshot includes source URL and fetch
timestamp for every used page, resumed-page count, completeness, collection time
and the oldest page time as verification time. Resume never pretends cached pages
were fetched just now.

Run `GH_TOKEN=… node scripts/prepare-catalog.cjs src/catalog-seed.json` in an
environment where the token is already configured; never paste a token into a
shared command log. On Windows use a session environment variable. Repeat the
same command and target to resume. CI preserves checkpoints as an artifact after
failure; to resume on a new runner, restore that artifact to the same directory.
No automatic cross-run restore is claimed. Delete the directory to discard
collection progress; no personal workspace state is stored there.

## Retry behavior

Transport/5xx and rate-limit responses have a bounded five-attempt budget and
exponential waits. Retry-After (seconds or HTTP date) and rate-limit reset are
honored. If the required server wait exceeds 65 seconds, fail with a resume
instruction rather than sending another request too early. Redirects are denied
so the authorization header cannot be forwarded to another origin.

## Validation and limits

473/473 tests pass on this independent branch, including six new checkpoint,
TTL/corruption, resume, incomplete inventory and retry/header tests. Existing
10,105-record sharded-pagination, overlap, deduplication and shortfall fixtures
remain. Syntax/JSON and diff checks pass. Fixtures are temporary and never become
the shipped catalog. No live GitHub inventory was collected in this PR.

Accessibility: no UI changes/screenshots. Privacy: public page cache only, one-hour
reuse TTL; stale files stay on disk until deleted. Migration: none. Rollback:
revert code and optionally remove public checkpoint files. Full catalog gates,
live collection and data-integrity evidence remain required before release.
