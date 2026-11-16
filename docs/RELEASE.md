# Release checks

- Unit tests and syntax/JSON checks pass.
- Native UI smoke verifies the wide panel at 1080 pixels, two rows, footer bounds and non-empty screenshot pixels.
- Native UI smoke saves a repository, opens it, checks replacement at the same slot, verifies neighbor stability and Undo, then visits interests, settings and saved views.
- Check screenshots in the native-preview artifact; fixtures contain illustrative star counts.
- All required platform packaging jobs succeed before distributing that platform artifact.
- Test the EXE, DMG and Linux packages on real devices, including transparency and display scaling at 100%, 150% and 200%.
- Test multi-monitor bounds, dragging, position memory, anchors, opacity, tray, global shortcut and hide/reopen.
- Exercise offline cache, API timeouts, rate limits, filters and an exhausted unseen pool.
- Test local midnight rollover, day-one interest selection, duplicate clicks, pause replacement and pause learning.
- Verify 7-day snooze expiry, owner blocking, restoring exclusions and resetting history.
- Verify collection/profile imports reject malformed and oversized JSON; export correct schemas and valid RSS.
- Test companion history permission approval, rejection, revocation and score-only export.
- Check keyboard focus, narrow displays, compact mode, reduced motion and high contrast.
- Review dependency lock, distribution license, platform signing and update strategy before production release.
