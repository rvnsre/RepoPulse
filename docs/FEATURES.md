# Feature inventory

See [56 additions and corrections in 0.3](CHANGES-v0.3.md) for the current usability changes. The table below also retains the original 0.2 feature set.

The following are working controls or behaviors, not a list of proposed ideas.

| # | Addition | Implementation |
| --- | --- | --- |
| 1 | Reference-inspired horizontal panel | Two rows, warm/ocean gradient, arrows, code blocks and centered actions |
| 2 | Click-to-replace | Successful repository opens replace the clicked slot |
| 3 | Neighbor stability | Other rows retain their position |
| 4 | Undo replacement | Last same-day row order can be restored |
| 5 | Double-click guard | Renderer and main-process guards prevent duplicate consumption |
| 6 | Third-project queue | Next pair rotates through the initial daily queue |
| 7 | Viewing history | Up to 500 opens with timestamps persisted locally |
| 8 | Collection search | Name, description and language search |
| 9 | History search | Same search across opened repositories |
| 10 | Sorting | Recent, stars and name A-Z |
| 11 | Source copy | Git clone commands copied without execution |
| 12 | Inspection copy | Deterministic git status/log commands |
| 13 | Link copy | Validated GitHub repository links |
| 14 | Installation guide | Install checks and opens public Releases; Guide opens the README |
| 15 | Project overview | Relevance, stars, language, license, last push and topics |
| 16 | Seven-day snooze | Temporarily exclude a project, allow return after expiry |
| 17 | Owner exclusions | Exclude all projects by an owner |
| 18 | Restore exclusions | Reset hidden/blocked/snoozed controls explicitly |
| 19 | Language filters | Multiple languages, with all-language default |
| 20 | Star filter | 50K, 75K, 100K and 200K minimum choices |
| 21 | Collection export/import | Validated local JSON and ID deduplication |
| 22 | Interest export | Score-only profile JSON |
| 23 | Pause learning | Disable open/like influence while retaining manual interests |
| 24 | Hover expansion | Optional expansion of collapsed island |
| 25 | Opacity control | Native window opacity from 65 to 100 percent |
| 26 | Screen anchoring | Top-left, center and top-right positioning |
| 27 | Position memory | Dragged center and vertical position persist |
| 28 | Three palettes | Reference, graphite and high contrast |
| 29 | Density | Comfortable and compact layouts |
| 30 | Keyboard navigation | J/K, Enter, S, U, R, / and Escape |
| 31 | Opt-in new-day notification | Native notification after daily rollover while running |
| 32 | Connection status | Cached/offline indication and sync age |
| 33 | Statistics | Catalog size, saved projects, opens and interests |
| 34 | History reset | Clear visit records while preserving no-repeat memory |
| 35 | Responsive panel | Hide the second code column on narrower screens |
| 36 | Exhaustion handling | No forced repetitions when the unseen pool is depleted |

Existing features retained: daily local-date rollover, saved projects, likes/hide, reduced motion, tray, global shortcut, RSS export, local profile import, safe text rendering, isolated renderer, strict external links, offline cache and recovery copies.

## Explicit limits

Install opens public Releases in the browser; it does not execute an installer. Browser interest transfer is explicit JSON import/export. Native preview screenshots use synthetic fixtures. OS-specific runtime behavior still needs real-machine release checks.
