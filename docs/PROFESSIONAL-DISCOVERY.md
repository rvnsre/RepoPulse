# Professional / Research discovery — initial evidence view

Base: main 654bbbbb0e24ef32df68a9dd31d93ea172caa4aa, version 13.0.0.

Research in the workspace exposes sixteen reusable domain presets, covering
software, AI, statistics, biomedicine, engineering, scientific computing and
teaching. Each preset currently uses one representative GitHub topic. A combined
label such as FEM/CFD or civil/BIM/GIS is not a claim of exhaustive subdomain
coverage. See the exact query in each result's evidence view.

Opening the view or switching presets reads only local cache. Search explicitly
requests one public sample of at most 30 repositories, sorted by GitHub update
time. It has no star floor; it is separate from the high-popularity core feed and
never changes its inventory counter. This is not an exhaustive domain catalog.

## Ranking and uncertainty

Local ordering compares exact returned topic matches, a push in the last 90 days,
reported license presence, and finally stars. No numeric scientific-quality or
clinical-trust score is exposed. Why recommended? shows these components plus
source query, fetched_at, immutable GitHub ID and source-reported verification
state. A recent push is not a recent release. A reported SPDX label is not a
legal review. Security, CI, documentation, citation, archive and reproducibility
evidence are explicitly unknown until separate adapters verify them.

Medical/bioinformatics profiles display the master-spec safety notice. No patient
specific query field exists: IPC accepts only fixed preset IDs. Existing notes
remain generic local notes; the UI instructs users not to enter patient data.
The application does not diagnose, recommend treatment or assert regulatory
clearance.

## Data flow and deletion

Endpoint: `GET https://api.github.com/search/repositories`.
Sent fields: a fixed public topic plus public/nonfork/nonarchived qualifiers,
updated sorting, page=1 and per_page=30. No notes, collections, history, workspace
data, patient information or interest weights are sent. The existing protected
GitHub session may attach the optional GitHub credential only to api.github.com.
Redirects are denied. GitHub still receives normal connection metadata.

Cached fields: bounded normalized public repository IDs/names, description,
stars, language/topics, license, push date, counts, branch, avatar/public URL,
the source query and original fetch time. They are stored in
`professional-cache.json` in the app's existing per-user data directory. Cache
reuse freshness lasts 24 hours; older results are labelled stale and remain
available offline. Expiry does not itself delete the file. Delete public
discovery cache or full local reset deletes it. Existing bookmarks are retained
by the public-cache action. Clearing while a request is pending prevents that
request repopulating the cache. Public cache is not encrypted at rest.

Only schema-valid, size-bounded successful search responses replace cached data.
Incomplete_results, malformed JSON, oversized data, access/rate-limit and offline
failures preserve previous evidence and its timestamp. Invalid/fork/private and
duplicate records are excluded. Returned descriptions are inserted as text,
never interpreted as HTML. Raw external errors are not reflected to the UI.

## Validation

490/490 unit tests pass on this independent branch, including six new domain,
low-star ordering/provenance, explicit-network-only, offline/TTL/persistence,
malformed/oversize and delete-during-refresh tests. Syntax/JSON/diff checks pass.
The real Electron renderer verifies 10-star fixture results, medical notice,
bookmarking and inert script-like metadata. Default and forced-colors axe scans
detect zero violations; incomplete contrast checks remain for human review.
Screenshots use labelled synthetic fixtures only. Live endpoint behavior and
professional participant outcomes have not been measured by these mock tests.

API behavior reference: https://docs.github.com/en/rest/search/search#search-repositories

## Remaining scope and rollback

This PR is not the entire master specification. Scholarly metadata adapters,
verified security/release/FAIR evidence, citation export, full English/Azerbaijani
localization, accessibility participant studies and remaining release/security
gates are still required. Ranking weights have not been validated with domain
professionals. Domain presets are a transparent starting point, not a validated
taxonomy or medical recommendation system.

No existing workspace schema is changed. Roll back this PR and remove its public
cache file if desired; bookmarked normalized repositories remain valid in the
existing saved collection. Do not publish a new release until all required gates
and unresolved master-spec criteria pass.
