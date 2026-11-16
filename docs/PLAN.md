# Product plan

## 0.3 delivered

Readable typography and text zoom, explicit browser navigation, verified public release links, stable per-slot animation, motion preferences, display-aware geometry and collection/exclusion management are implemented. See [the change inventory](CHANGES-v0.3.md) for the detailed list.

## Original 0.2 scope

Rebuild the visual surface around the supplied horizontal reference: two repository rows, diagonal connectors, shell command panels, warm-to-teal color flow and Install/Learn actions. Preserve the system tray and provide a larger secondary workspace for management tools.

Opening a repository triggers a ranked unseen replacement at the same row index. The initial daily queue has up to three items, with additional discovery on deliberate opens. Undo is explicit. The 50K floor is never silently lowered.

See FEATURES.md for the implemented 36-item inventory and README.md for current behavior.

## Remaining release gates

- Test native transparency, multi-monitor movement, display scaling and screen-reader behavior on real Windows, macOS and Linux devices.
- Review and commit the dependency lock produced by CI before production distribution.
- Choose a distribution license and configure platform signing.
- Publish a reviewed companion extension to browser stores.
- Design an explicit-consent, aggregate-only automatic browser bridge.
- Add localization and an installer-backed update channel after signing is configured.

## Design scope

The desktop widget reproduces the reference panel's structure and visual direction. The laptop bezel, wallpaper, blue selection guides and design-tool controls are not part of the app. At narrower screen sizes the secondary command block is hidden so essential controls remain usable.

## Future ideas

Optional local-language-model explanations, release tracking for saved projects, user-authored notes, structured project comparisons and explicit subscriptions to topics. These are not described as implemented features.
