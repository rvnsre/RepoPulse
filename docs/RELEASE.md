# Release checks

Before publishing a production release:

- Core tests and syntax/JSON checks pass.
- All three CI packaging jobs succeed. Inspect uploaded build artifacts and dependency lock.
- Launch installers on Windows, macOS and Linux; confirm tray menu and shortcut behavior.
- Verify native window bounds at 100%, 150% and 200% scaling and on a smaller display.
- Verify expand/collapse, dragging, multiple monitors, hide/reopen, quit and launch at login.
- Exercise online fetch, offline cache, API timeout, rate limit and an empty or exhausted catalog.
- Test local midnight rollover and next-day startup, preserving no-repeat behavior.
- Load the companion unpacked in Edge/Chrome/Brave; approve and deny history permission; verify export contains only schema and recognized scores; revoke access.
- Import valid, invalid, oversized and manually edited profiles in the desktop app.
- Verify saved search, idempotent likes, hide/refill and data reset.
- Verify keyboard focus, reduced motion and screen-reader labels.
- Review dependency lock, platform signing, license and distribution instructions.

Do not label native builds tested simply because they were packaged. CI build success and real desktop behavior are separate checks.
