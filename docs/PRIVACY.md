# Privacy and data flow

The desktop app calls the public GitHub Search API to download public repository metadata. Requests contain a fixed star threshold, pagination and sort settings. They do not contain personal interest scores or browser history. GitHub receives ordinary network metadata such as the connection IP address.

Desktop state is stored in Electron's per-user application-data folder as `state.json`: interest scores, saved repositories, hidden and presented repository IDs, cached public metadata, daily picks and appearance preferences. It is not encrypted at rest. File permissions use the operating system's normal per-user controls; other software running as your user may read it.

The browser companion requests optional history access in response to a deliberate Analyze click. It searches a limited recent history window, classifies titles and host names in memory and exports only the eight recognized topic weights. It never requests cookies, passwords, page contents or host permissions. No background service worker is used. Closing the popup discards analysis memory. Revoke history permission in the popup or browser extension settings. Existing exported JSON files remain yours to delete.

Importing an interest profile is explicit and user initiated. The desktop app validates the schema, size and recognized score fields. Manual interests are always available instead.

Local-data deletion requires confirmation in the app. It deletes RepoPulse preferences, recommendations and history in its active state. It does not delete browser history, exported JSON files, installer artifacts, OS backups or previously preserved corrupt-state recovery files.

Renderer security: context isolation, sandbox, no Node integration, restrictive content security policy, denied renderer navigation/popups and permission prompts, fixed IPC methods, sender verification and GitHub-only external URLs derived from validated repository names. Repository text is inserted with textContent rather than interpreted as HTML.

No telemetry, remote user profile, cookies, account registration, advertising identifiers, hosted AI requests or paid subscriptions are included.


Version 0.2 also stores up to 500 timestamped repository opens, owner exclusions, snooze deadlines, visual preferences and the dragged window center. Clipboard actions copy only the user-selected public link or source command. Opening a project may replace that row with another public project. Optional learning pause stops open/like updates to the local interest weights. New-day notifications are off by default. No command execution is exposed to the renderer.
