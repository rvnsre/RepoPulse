# RepoPulse v13.0.0

## Highlights
- Rebuilt GitHub RSS+ discovery transitions with subtle vertical motion, scale, opacity and blur, plus button and avatar micro-interactions.
- Removed the bottom-left host operating-system label from the discovery modal.
- Added four staggered, independent automatic card schedulers with a five-second cadence and hover-aware pauses.
- Reset rotation timers when the user manually selects the next four repositories.
- Raised the default discovery filter to 20,000 GitHub stars, including an upgrade path from existing v12.1.1 settings.
- Increased local catalog capacity to 30,000 entries while retaining the live GitHub search pagination, deduplication, and rate-limit safeguards.
- Repaired Linux native smoke coverage so the removed footer element is tested by its absence rather than dereferenced.

## Data integrity
The catalog capacity does not represent verified GitHub repository inventory. The remaining-items counter displays the number of actual matching and unvisited records, not an artificial floor of 1,000.

## Installers
GitHub Actions builds native Windows x64, macOS ARM64 and Intel x64, and Linux AppImage/DEB/RPM packages. SHA-256 checksums are published with verified release assets.
