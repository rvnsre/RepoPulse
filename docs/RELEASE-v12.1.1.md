## Discovery and performance update

- Keep browsing after the last matching card. **Browse again** starts another pass and **Open library** works when there are no other matching cards.
- Reduce pointer sampling and renderer IPC when the island is idle. Pause sampling while the window is hidden or minimized.
- Batch state writes in the background and retry temporary Windows file locks.
- Improve catalog resilience and keep GitHub access available when the system keychain is unavailable.
- Keep verified RSS+ licenses available offline for up to 14 days, subject to a known subscription expiration.
- Build separate macOS downloads for Intel and Apple silicon.

## Downloads

Choose the installer for your platform and CPU from **Assets**. Use `SHA256SUMS.txt` to verify installers.
