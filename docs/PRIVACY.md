# Privacy and data flow

## Optional professional discovery

Research presets read local cache until Search is chosen. Search sends only a
fixed public GitHub topic query; local history, notes, collections and weights
are not included. Cached public samples show their original fetch time, become
stale after 24 hours, and can be deleted separately from bookmarks. Do not enter
patient data. [Exact fields, endpoint, retention and deletion](PROFESSIONAL-DISCOVERY.md)

RepoPulse requests public GitHub repository metadata and release availability. Personal notes, tags, collections, ratings, reading queues, viewing history and interest weights are not included in those requests. GitHub receives ordinary connection metadata such as the IP address.

## Desktop storage

Electron's per-user application-data folder contains state.json: interests, saved projects, hidden/presented IDs, cached public metadata, daily picks, up to 500 visits, annotations, collections, exclusions, snooze deadlines, preferences and window geometry. It is not encrypted at rest. Other software running as the same OS user may read it.

Notes are limited to 20,000 characters per project. Validated workspaces contain at most 2,000 annotated records and 50 collections. Search, comparison and Insights run on local state. The focus timer runs locally while the app is running; it does not schedule an external service.

An explicit workspace JSON export includes personal notes, tags and annotations. CSV export includes personal notes as well as public project metadata. The user chooses where to save these files. Import validates the schema and merges newer annotated records; existing collections are merged by identifier. Notes are not automatically synchronized between devices.

## Browser companion

The optional companion requests history access only after Analyze is chosen. It classifies a limited recent history window in memory and exports recognized topic weights. It does not request cookies, passwords, page contents or host permissions. There is no background service worker or automatic desktop synchronization.

## Clipboard and external navigation

Clipboard actions copy the chosen public link, metadata, JSON or clone command. They do not execute commands. Browser actions construct fixed GitHub URLs from validated public repository names. Some repository sections may be disabled by the owner.

## Removal and recovery

Resetting local data requires confirmation. Collection deletion and clearing membership also require confirmation; project annotations and saved projects are retained when deleting a collection. Local reset does not delete browser history, exported files, installers, OS backups or corrupt-state recovery copies.

State updates roll back in memory when a mutation or persistence step fails. Unreadable active state is preserved as a recovery copy before defaults are loaded.

## Renderer isolation

Context isolation and sandbox remain enabled; Node integration is disabled. The renderer has a restrictive content security policy, denied navigation/popups and permissions, narrow IPC methods, sender verification and GitHub-only validated external links. Repository text, notes and collection names are inserted as text, not HTML.

No telemetry, remote user profile, hosted AI service, advertising identifier, account registration or subscription is included.
