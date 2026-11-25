# Optional public metadata adapters

This change is stacked on the Professional discovery PR. All lookups are
explicit, read-only GET requests. Opening Metadata and reading its cache do not
contact providers. Input is restricted to a known public repository or an exact
public identifier, never a patient-specific query or inferred author name.

## Sources, requests and cached fields

| Adapter | Fixed endpoint / explicit identifier | Cached metadata |
| --- | --- | --- |
| CITATION.cff | api.github.com/repos/{known-public-repo}/contents/CITATION.cff | Declared title, CFF version, software version, release date, license, URL, message, explicit DOI/preferred-citation DOI and authors |
| Crossref | api.crossref.org/works/{DOI} | Matched DOI, title, type, publisher |
| OpenAlex | api.openalex.org/works/https://doi.org/{DOI} | Matched DOI, OpenAlex ID, title, publication year |
| ORCID | pub.orcid.org/v3.0/{ORCID}/record | Matched public ORCID, reported given/family/credit name |
| PubMed | eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&tool=RepoPulse&id={PMID} | Matched PMID, title, publication date, journal |
| Europe PMC | www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:{PMID} AND SRC:MED&format=json&pageSize=1 | Matched MED PMID, title, year, explicit DOI |
| Zenodo | zenodo.org/api/records/{numeric-record-ID} | Matched record ID, declared title/version/date/license/DOI |
| arXiv | export.arxiv.org/api/query?id_list={arXiv-ID} | Matched version identifier, title, dates, labelled author sample |
| Software Heritage | archive.softwareheritage.org/api/1/revision/{revision-SWHID-hash}/ | Matched revision SWHID/hash, directory, date |
| GitHub Releases | api.github.com/repos/{known-public-repo}/releases?per_page=5 | Up to five observed published release tags/dates/prerelease flags; explicitly a sample |
| GitHub Issues | api.github.com/repos/{known-public-repo}/issues?state=open&per_page=10 | Observed issue numbers/update times, excluding pull requests; no issue bodies or titles |
| GitHub advisories | api.github.com/repos/{known-public-repo}/security-advisories?state=published&per_page=10 | Observed published GHSA IDs/severity/dates; absence is explicitly not security validation |
| GitHub Atom | github.com/{known-public-repo}/releases.atom | Observed entry IDs/titles/update times; explicitly a sample |

All requests use HTTPS, a public RepoPulse version/repository User-Agent and an
Accept header. Redirects are denied, credentials/cookies are omitted from external
providers, and the existing protected GitHub session attaches its optional token
only to api.github.com. No email address, workspace, local notes, collections,
history, patient data or interest weights are sent. Providers still receive normal
connection metadata. No private API keys are requested or stored by this feature.

## Verification and association

Every displayed/cached field contains value, source, fetched_at, identifier and
verification_state. `declared-by-repository` means exactly that, not independent
DOI verification. `provider-record-matched` means the returned DOI/ORCID/PMID/
record ID/arXiv ID/SWH revision matched the explicit input. GitHub list/feed
observations are `provider-reported`, not a complete inventory. These states are
not proof of scientific validity, human identity, intended use or clinical/FDA/CE
approval. An ORCID record lookup never identifies a repository author by name.

Identifier-only lookups explicitly say that repository association is not
established. DOI input may be prefilled only from an explicit CITATION.cff DOI;
no title/name matching, guessed DOI or inferred publication relationship occurs.
Software Heritage revision presence does not establish that a selected GitHub
repository is archived at that revision. Empty advisory samples do not mean safe.

Export declared citation JSON writes the actual parsed root CFF fields with
their provenance in a `repopulse.citation.v1` wrapper. It is not a fabricated
BibTeX/CSL record or a guessed citation. More than 200 CFF authors is rejected
rather than silently truncating the citation. Other long text uses a visible
ellipsis; arXiv author sampling is labelled. This parser reads supported CFF
fields safely; it does not claim full schema validation of every CFF extension.

## Cache, errors and deletion

`metadata-cache.json` lives in the existing per-user app data directory. It holds
at most 128 public records, with a 24-hour freshness TTL and an 8 MiB disk bound.
TTL expiry changes the label to stale; it does not delete the file. Cached reads
and failures retain original timestamps. The public cache is not encrypted at
rest. Delete public metadata cache or full local reset deletes it. User-chosen
exports and OS backups are not deleted. Clearing during a pending request prevents
repopulation. Persistence failure rolls back in-memory metadata.

Requests have a ten-second timeout, a 2 MiB decoded response bound, no automatic
retry and per-provider rate-limit deadlines honoring Retry-After/reset headers.
Invalid identifiers, mismatched returned IDs, unsupported/malformed responses,
offline/401/403/404/429 and timeouts show unavailable enrichment rather than made-up
metadata. XML DTD/entities are rejected, entity expansion is disabled, YAML custom
tags/duplicate keys are rejected, and alias expansion is bounded. CFF is limited
to 64 KiB with a matching byte count. Text is rendered as text, never executable
HTML/Markdown.

## Evidence and remaining gates

508 local tests pass on this stacked branch, including 18 adapter/provenance,
identifier mismatch, invalid YAML/XXE, offline/TTL/restart, rollback, rate-limit,
deletion-race and author-list tests. Real Electron metadata navigation, cache
read, explicit fetch, per-field state and citation-export control checks pass.
The metadata axe scan detects zero violations and no incomplete checks in the
tested fixture view. Other application views still have human contrast review
items. Dependency audit reports zero known vulnerabilities after adding pinned
yaml and fast-xml-parser versions; this is not a full security audit.

Live sample checks on 25 November 2026 succeeded for twelve of the thirteen
adapters, including the actual CFF DOI's Zenodo record. Europe PMC timed out in
this environment even with a separate 20-second diagnostic request; its live
integration remains unverified. Mock contract tests are not a substitute for that
missing evidence. No live sample establishes scientific or clinical validity.
CI, installed-package tests, broader malformed-payload review and human research
usability validation remain required before release.

## Primary references

- https://citation-file-format.github.io/
- https://www.crossref.org/documentation/retrieve-metadata/rest-api/
- https://help.openalex.org/api/
- https://info.orcid.org/documentation/api-tutorials/api-tutorial-read-data-on-a-record/
- https://www.ncbi.nlm.nih.gov/books/NBK25499/
- https://europepmc.org/RestfulWebService (documentation access was blocked here)
- https://developers.zenodo.org/
- https://info.arxiv.org/help/api/user-manual.html
- https://archive.softwareheritage.org/api/1/
- https://docs.github.com/en/rest/releases/releases
- https://docs.github.com/en/rest/issues/issues
- https://docs.github.com/en/rest/security-advisories/repository-advisories

Rollback: revert this stacked PR, remove its public metadata cache if desired,
and retain earlier professional discovery/bookmarks. No workspace schema changes
or automatic release publication are introduced.
