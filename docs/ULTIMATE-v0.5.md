# RepoPulse 0.5.0 Ultimate — implemented inventory

This inventory counts concrete user controls, workflows, and reliability corrections introduced or substantially changed in 0.5. Browser synchronization, cookie access, cloud AI, code signing and automatic application updates are not implemented.

| # | Area | Implemented behavior | Source |
|---|---|---|---|
| 1 | Island behavior | Automatic collapse after the pointer leaves | app/island-motion.js |
| 2 | Island behavior | Automatic collapse after inactivity | app/island-motion.js |
| 3 | Island behavior | Hover reveal from the compact island | app/island-motion.js |
| 4 | Island behavior | Configurable hover reveal delay | app/island-motion.js |
| 5 | Island behavior | Configurable pointer-leave delay | app/island-motion.js |
| 6 | Island behavior | Configurable inactivity timeout | app/island-motion.js |
| 7 | Island behavior | Keep open while hovered | app/island-motion.js |
| 8 | Island behavior | Protect keyboard focus from automatic collapse | app/island-motion.js |
| 9 | Island behavior | Protect note and filter editing | app/island-motion.js |
| 10 | Island behavior | Keep the workspace open while managing projects | app/island-motion.js |
| 11 | Island behavior | Hold open while a repository is opening | app/island-motion.js |
| 12 | Island behavior | Hold open during catalog refresh | app/island-motion.js |
| 13 | Island behavior | Pause automatic hiding for five minutes | app/island-motion.js |
| 14 | Island behavior | Resume automatic hiding immediately | app/island-motion.js |
| 15 | Island behavior | Independent holds for concurrent operations | app/island-motion.js |
| 16 | Island behavior | Cancel reveal after a brief accidental hover | app/island-motion.js |
| 17 | Island behavior | Migrate v0.3 preferences to the new island behavior | app/island-motion.js |
| 18 | Island behavior | Optional collapsed startup | app/island-motion.js |
| 19 | Island behavior | Compact selected-project preview | app/island-motion.js |
| 20 | Island behavior | Gentle island growth on hover | app/island-motion.js |
| 21 | Island behavior | Configurable 0–3% hover growth | app/island-motion.js |
| 22 | Island behavior | Local focus sessions | app/island-motion.js |
| 23 | Island behavior | Configurable focus-session length | app/island-motion.js |
| 24 | Island behavior | Visible focus countdown | app/island-motion.js |
| 25 | Island behavior | Focus-session completion announcement | app/island-motion.js |
| 26 | Motion and appearance | Fluid motion preset | app/island-motion.js, app/styles.css, app/ultimate.js |
| 27 | Motion and appearance | Snappy motion preset | app/island-motion.js, app/styles.css, app/ultimate.js |
| 28 | Motion and appearance | Calm motion preset | app/island-motion.js, app/styles.css, app/ultimate.js |
| 29 | Motion and appearance | Soft-spring motion preset | app/island-motion.js, app/styles.css, app/ultimate.js |
| 30 | Motion and appearance | Subtle motion distances | app/island-motion.js, app/styles.css, app/ultimate.js |
| 31 | Motion and appearance | Stagger simultaneous replacement entries | app/island-motion.js, app/styles.css, app/ultimate.js |
| 32 | Motion and appearance | Animate panel collapse | app/island-motion.js, app/styles.css, app/ultimate.js |
| 33 | Motion and appearance | Animate panel reveal | app/island-motion.js, app/styles.css, app/ultimate.js |
| 34 | Motion and appearance | Animate the compact dock transition | app/island-motion.js, app/styles.css, app/ultimate.js |
| 35 | Motion and appearance | Cancel hover animation when the document is hidden | app/island-motion.js, app/styles.css, app/ultimate.js |
| 36 | Motion and appearance | Cancel hover animation when reduced-motion preference changes | app/island-motion.js, app/styles.css, app/ultimate.js |
| 37 | Motion and appearance | Safe native padding around hover transforms | app/island-motion.js, app/styles.css, app/ultimate.js |
| 38 | Motion and appearance | Five accent colors | app/island-motion.js, app/styles.css, app/ultimate.js |
| 39 | Motion and appearance | Three corner shapes | app/island-motion.js, app/styles.css, app/ultimate.js |
| 40 | Motion and appearance | Soft, outlined and flat card appearances | app/island-motion.js, app/styles.css, app/ultimate.js |
| 41 | Motion and appearance | Optional active rim glow | app/island-motion.js, app/styles.css, app/ultimate.js |
| 42 | Motion and appearance | Optional row quick actions | app/island-motion.js, app/styles.css, app/ultimate.js |
| 43 | Motion and appearance | Optional synchronization status | app/island-motion.js, app/styles.css, app/ultimate.js |
| 44 | Motion and appearance | Reading queue count shortcut | app/island-motion.js, app/styles.css, app/ultimate.js |
| 45 | Motion and appearance | Personal project status badges | app/island-motion.js, app/styles.css, app/ultimate.js |
| 46 | Motion and appearance | Optional secondary hints | app/island-motion.js, app/styles.css, app/ultimate.js |
| 47 | Motion and appearance | Quiet new-day notifications | app/island-motion.js, app/styles.css, app/ultimate.js |
| 48 | Motion and appearance | Focus workspace preset | app/island-motion.js, app/styles.css, app/ultimate.js |
| 49 | Motion and appearance | Research workspace preset | app/island-motion.js, app/styles.css, app/ultimate.js |
| 50 | Motion and appearance | Compact workspace preset | app/island-motion.js, app/styles.css, app/ultimate.js |
| 51 | Motion and appearance | Balanced workspace preset | app/island-motion.js, app/styles.css, app/ultimate.js |
| 52 | Personal research workspace | Private notes attached to each project | src/workspace.cjs, app/ultimate.js |
| 53 | Personal research workspace | Unsaved note drafts retained across drawer navigation | src/workspace.cjs, app/ultimate.js |
| 54 | Personal research workspace | Live note character count | src/workspace.cjs, app/ultimate.js |
| 55 | Personal research workspace | Explicit note-and-tag save action | src/workspace.cjs, app/ultimate.js |
| 56 | Personal research workspace | Discard unsaved note edits | src/workspace.cjs, app/ultimate.js |
| 57 | Personal research workspace | Normalized personal tags | src/workspace.cjs, app/ultimate.js |
| 58 | Personal research workspace | Personal project ratings | src/workspace.cjs, app/ultimate.js |
| 59 | Personal research workspace | Pin and unpin projects | src/workspace.cjs, app/ultimate.js |
| 60 | Personal research workspace | Mark projects read or unread | src/workspace.cjs, app/ultimate.js |
| 61 | Personal research workspace | Optional automatic read marking on repository opens | src/workspace.cjs, app/ultimate.js |
| 62 | Personal research workspace | Add and remove projects from the reading queue | src/workspace.cjs, app/ultimate.js |
| 63 | Personal research workspace | Low, normal and high reading priority | src/workspace.cjs, app/ultimate.js |
| 64 | Personal research workspace | Persist annotated repository metadata across cache changes | src/workspace.cjs, app/ultimate.js |
| 65 | Personal research workspace | Export the complete personal workspace as JSON | src/workspace.cjs, app/ultimate.js |
| 66 | Personal research workspace | Import and merge workspace JSON | src/workspace.cjs, app/ultimate.js |
| 67 | Personal research workspace | Keep newer notes when merging imports | src/workspace.cjs, app/ultimate.js |
| 68 | Personal research workspace | Export workspace metadata as CSV | src/workspace.cjs, app/ultimate.js |
| 69 | Personal research workspace | Protect CSV cells against spreadsheet formula execution | src/workspace.cjs, app/ultimate.js |
| 70 | Library and bulk operations | Browse the complete cached public catalog | src/workspace.cjs, app/ultimate.js |
| 71 | Library and bulk operations | Search private notes alongside public metadata | src/workspace.cjs, app/ultimate.js |
| 72 | Library and bulk operations | Exclude terms with negative search | src/workspace.cjs, app/ultimate.js |
| 73 | Library and bulk operations | Search by exact owner with owner: | src/workspace.cjs, app/ultimate.js |
| 74 | Library and bulk operations | Search by exact language with lang: | src/workspace.cjs, app/ultimate.js |
| 75 | Library and bulk operations | Search personal and GitHub tags with tag: | src/workspace.cjs, app/ultimate.js |
| 76 | Library and bulk operations | Search saved, queued, pinned, read and noted states with is: | src/workspace.cjs, app/ultimate.js |
| 77 | Library and bulk operations | Views for saved, queued, pinned, noted, rated, read, unread and visited projects | src/workspace.cjs, app/ultimate.js |
| 78 | Library and bulk operations | Filter by programming language | src/workspace.cjs, app/ultimate.js |
| 79 | Library and bulk operations | Filter by GitHub topic | src/workspace.cjs, app/ultimate.js |
| 80 | Library and bulk operations | Filter by repository license | src/workspace.cjs, app/ultimate.js |
| 81 | Library and bulk operations | Filter by personal collection | src/workspace.cjs, app/ultimate.js |
| 82 | Library and bulk operations | Sort by most recently pushed | src/workspace.cjs, app/ultimate.js |
| 83 | Library and bulk operations | Sort by personal rating | src/workspace.cjs, app/ultimate.js |
| 84 | Library and bulk operations | Sort by reading priority | src/workspace.cjs, app/ultimate.js |
| 85 | Library and bulk operations | Pinned-first grouping | src/workspace.cjs, app/ultimate.js |
| 86 | Library and bulk operations | Live matching-result counts | src/workspace.cjs, app/ultimate.js |
| 87 | Library and bulk operations | Incremental loading in groups of 60 | src/workspace.cjs, app/ultimate.js |
| 88 | Library and bulk operations | Select visible search results | src/workspace.cjs, app/ultimate.js |
| 89 | Library and bulk operations | Clear the current selection | src/workspace.cjs, app/ultimate.js |
| 90 | Library and bulk operations | Bulk save projects | src/workspace.cjs, app/ultimate.js |
| 91 | Library and bulk operations | Bulk unsave projects | src/workspace.cjs, app/ultimate.js |
| 92 | Library and bulk operations | Bulk mark as read | src/workspace.cjs, app/ultimate.js |
| 93 | Library and bulk operations | Bulk mark as unread | src/workspace.cjs, app/ultimate.js |
| 94 | Library and bulk operations | Bulk add to reading queue | src/workspace.cjs, app/ultimate.js |
| 95 | Library and bulk operations | Bulk remove from reading queue | src/workspace.cjs, app/ultimate.js |
| 96 | Library and bulk operations | Bulk pin projects | src/workspace.cjs, app/ultimate.js |
| 97 | Library and bulk operations | Bulk unpin projects | src/workspace.cjs, app/ultimate.js |
| 98 | Library and bulk operations | Add selected projects to a collection | src/workspace.cjs, app/ultimate.js |
| 99 | Library and bulk operations | Reset library search and filters | src/workspace.cjs, app/ultimate.js |
| 100 | Library and bulk operations | Reject stale asynchronous library query results | src/workspace.cjs, app/ultimate.js |
| 101 | Library and bulk operations | Retain library search focus and cursor during state changes | src/workspace.cjs, app/ultimate.js |
| 102 | Collections | Create named personal collections | src/workspace.cjs, app/ultimate.js |
| 103 | Collections | Rename a collection | src/workspace.cjs, app/ultimate.js |
| 104 | Collections | Color-code a collection | src/workspace.cjs, app/ultimate.js |
| 105 | Collections | Add a project to a collection from Overview | src/workspace.cjs, app/ultimate.js |
| 106 | Collections | Remove a project from an individual collection | src/workspace.cjs, app/ultimate.js |
| 107 | Collections | Browse a collection in Library | src/workspace.cjs, app/ultimate.js |
| 108 | Collections | Clear membership with an explicit confirmation | src/workspace.cjs, app/ultimate.js |
| 109 | Collections | Delete a collection with confirmation while preserving notes | src/workspace.cjs, app/ultimate.js |
| 110 | Collections | Deduplicate collection membership | src/workspace.cjs, app/ultimate.js |
| 111 | Collections | Validate imported collection identifiers and limits | src/workspace.cjs, app/ultimate.js |
| 112 | Comparison and insights | Compare up to three projects side by side | src/workspace.cjs, app/ultimate.js |
| 113 | Comparison and insights | Compare cached stars, language, license, push date, topics, ratings and notes | src/workspace.cjs, app/ultimate.js |
| 114 | Comparison and insights | Show topics shared by all compared projects | src/workspace.cjs, app/ultimate.js |
| 115 | Comparison and insights | Remove an individual comparison | src/workspace.cjs, app/ultimate.js |
| 116 | Comparison and insights | Clear the complete comparison | src/workspace.cjs, app/ultimate.js |
| 117 | Comparison and insights | Local discovery statistics dashboard | src/workspace.cjs, app/ultimate.js |
| 118 | Comparison and insights | Seven-day visit histogram | src/workspace.cjs, app/ultimate.js |
| 119 | Comparison and insights | Language distribution chart | src/workspace.cjs, app/ultimate.js |
| 120 | Comparison and insights | Most-visited topics chart | src/workspace.cjs, app/ultimate.js |
| 121 | Comparison and insights | Unique visits and revisit counts | src/workspace.cjs, app/ultimate.js |
| 122 | GitHub navigation | Open repository Issues | src/navigation.cjs, app/ultimate.js |
| 123 | GitHub navigation | Open Pull Requests | src/navigation.cjs, app/ultimate.js |
| 124 | GitHub navigation | Open Discussions | src/navigation.cjs, app/ultimate.js |
| 125 | GitHub navigation | Open repository Wiki | src/navigation.cjs, app/ultimate.js |
| 126 | GitHub navigation | Open GitHub Actions | src/navigation.cjs, app/ultimate.js |
| 127 | GitHub navigation | Open contributor statistics | src/navigation.cjs, app/ultimate.js |
| 128 | GitHub navigation | Open the repository license section | src/navigation.cjs, app/ultimate.js |
| 129 | GitHub navigation | Open commit history | src/navigation.cjs, app/ultimate.js |
| 130 | GitHub navigation | Open repository tags | src/navigation.cjs, app/ultimate.js |
| 131 | GitHub navigation | Open forks | src/navigation.cjs, app/ultimate.js |
| 132 | GitHub navigation | Open stargazers | src/navigation.cjs, app/ultimate.js |
| 133 | Copy formats | Copy the complete repository name | app/main.cjs, app/ultimate.js |
| 134 | Copy formats | Copy the owner name | app/main.cjs, app/ultimate.js |
| 135 | Copy formats | Copy a shallow-clone command | app/main.cjs, app/ultimate.js |
| 136 | Copy formats | Copy an SSH clone command | app/main.cjs, app/ultimate.js |
| 137 | Copy formats | Copy a GitHub CLI clone command | app/main.cjs, app/ultimate.js |
| 138 | Copy formats | Copy normalized repository JSON | app/main.cjs, app/ultimate.js |
| 139 | Copy formats | Copy the exact cached star count | app/main.cjs, app/ultimate.js |
| 140 | Command access | Open the command palette with Ctrl/Cmd+K | app/ultimate.js, app/renderer.js |
| 141 | Command access | Search commands using multiple words | app/ultimate.js, app/renderer.js |
| 142 | Command access | Navigate command results with arrow keys | app/ultimate.js, app/renderer.js |
| 143 | Command access | Execute the active command with Enter | app/ultimate.js, app/renderer.js |
| 144 | Command access | Commands adapted to the selected repository | app/ultimate.js, app/renderer.js |
| 145 | Command access | Q shortcut for queue membership | app/ultimate.js, app/renderer.js |
| 146 | Command access | P shortcut for pin state | app/ultimate.js, app/renderer.js |
| 147 | Command access | D shortcut for Overview | app/ultimate.js, app/renderer.js |
| 148 | Command access | F shortcut for focus sessions | app/ultimate.js, app/renderer.js |
| 149 | Command access | Question-mark shortcut for command help | app/ultimate.js, app/renderer.js |
| 150 | Reliability | Roll back state when an update callback fails | src/store.cjs, app/renderer.js, app/main.cjs |
| 151 | Reliability | Roll back in-memory state when persistence fails | src/store.cjs, app/renderer.js, app/main.cjs |
| 152 | Reliability | Recover release-check UI state after IPC failure | src/store.cjs, app/renderer.js, app/main.cjs |
| 153 | Reliability | Auxiliary GitHub links do not rotate the daily feed | src/store.cjs, app/renderer.js, app/main.cjs |
| 154 | Reliability | Synchronize renderer mode with collapsed native startup | src/store.cjs, app/renderer.js, app/main.cjs |
| 155 | Reliability | Clean up timers and animations before closing | src/store.cjs, app/renderer.js, app/main.cjs |
| 156 | Reliability | Batch bulk metadata changes into a single store update | src/store.cjs, app/renderer.js, app/main.cjs |

Motion settings respect reduced-motion preferences. Automatic hiding collapses to a reachable island; it does not quit the app. A focus session and editing protection intentionally hold the panel open. Search uses cached public metadata; Insights uses local history only. GitHub sections such as Discussions or Wiki can be disabled by the repository owner, in which case GitHub shows its own unavailable page. Copies do not execute commands.

Windows/Linux packages target x64; the current macOS build targets Apple Silicon. Packages are unsigned previews. Native transparency, screen scaling and OS installation still need real-device acceptance checks.
