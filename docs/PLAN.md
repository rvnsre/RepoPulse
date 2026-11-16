# Product plan

## Product promise
Three useful, personalized, established GitHub projects in a calm desktop island. Recommendations should explain their relevance without sending browser history to a server.

## Delivered in 0.1.0
Desktop island, expanded daily feed, saved collection, manual interests, settings, local recommendation engine, daily persistence, GitHub caching, optional browser companion with local interest export, privacy controls, core tests and CI packaging.

## Design direction
Graphite translucent-looking surfaces; soft borders; lime signal accent; compact project cards; strong typography; clear privacy status. Keep the collapsed island small and draggable. Each card answers what the project does, why it is relevant, how established it is, and where to open it.

The source reference image was not included in the active request, so this first implementation follows the described Dynamic Island direction and is not claimed as a pixel-perfect reproduction.

## Next release gates
1. Verify the CI installers on real Windows, macOS and Linux desktops, including multi-monitor bounds, tray visibility and display scaling.
2. Commit a reviewed dependency lock from the build artifact and add dependency update automation.
3. Decide the distribution license and configure Windows/macOS signing.
4. Add a consent-based browser-to-desktop bridge for aggregate topic scores, without exporting raw history.
5. Add localization and a guided first-run flow.
6. Consider opt-in OS notifications and a user-selected delivery time.
7. Improve local topic detection, document relevance quality and expose a history of personalization changes.
8. Add RSS/Atom export of the selected daily projects if requested. The initial product is an RSS-style discovery feed, not an RSS protocol reader.

## Future ideas
Optional local language-model summaries; read-later notes; release tracking for saved projects; project comparisons; adjustable discovery versus familiarity balance. Never infer that any of these are already implemented.

## Constraints
A strict 50K+ star catalog is finite and heavily favors popular projects. No-repeat discovery will eventually run out. Explain this transparently. Do not manufacture star counts, fabricate AI summaries, or lower the threshold without user choice.
