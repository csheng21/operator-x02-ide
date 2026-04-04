# Changelog

All notable changes to Operator X02 are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.5.3] - 2026-04-04

### Fixed
- **ide_patch / ide_insert / ide_read_file path resolution** — AI can now send a bare filename
  (`filters.cu`) and the Rust backend resolves it automatically: tries direct path → project root
  relative → recursive search under project directory. Eliminates "File not found" errors when
  files live in subdirectories.
- `projectPath` now injected into all three IDE Script bridge invoke calls so Tauri commands
  receive full context.

### Changed
- **main.ts modularization** — 885 lines extracted into dedicated modules with zero regressions:
  - `src/utils/perfManager.ts` — X02PerfManager interval throttle system
  - `src/ui/tabBadges.ts` — Git tab change-count badge system
  - `src/ui/loadingScreen.ts` — App loading screen show/remove
  - `src/prompts/surgicalPrompt.ts` — Surgical Edit Engine system prompt constant
  - `src/plugins/ui/pluginManagerUI.ts` — Full plugin menu UI (529 lines)

---

## [1.5.2-beta] - 2026-03

### Fixed
- `ideScriptBridge.ts` undefined `call.command` crash on malformed IDE script responses
- `window.currentProjectPath` not set on project open — caused downstream context failures
- CSS centering bug on toast notifications
- SSH migration from ssh2/vendored-openssl to russh (pure Rust, no OpenSSL dependency)

### Added
- Startup notification dialog powered by Supabase (real-time news system)
- Bottom status bar redesign with live news feed integration
- PowerShell automation patch workflow for protected module swap before git push

---

## [1.5.1] - 2026-02

### Fixed
- Multiple production bugs across the autonomous coding pipeline
- Surgical edit bridge initialization order causing intermittent failures
- Android build path resolution on Windows with spaces in project path
- Git tab badge not updating after staged commits

### Changed
- Jetson dashboard sparklines performance — reduced DOM updates via X02PerfManager throttle
- Auto mode lock guard v2 prevents race condition on surgical bridge enable

---

## [1.5.0] - 2026-01

### Added
- **NVIDIA Jetson support** — tegrastats live streaming, CUDA deployment via SSH
- **Jetson dashboard** — live GPU/RAM/CPU widgets with sparklines and power manager
- **SSH Manager** — remote connection UI built on russh (pure Rust)
- **Jetson multi-device** — manage multiple Jetson boards simultaneously
- **CUDA language support** — Monaco syntax highlighting for `.cu`, `.cuh`, `.ptx`
- **Copilot-style inline autocomplete** — Ctrl+Shift+I triggers AI code completion at cursor
- **Custom right-click context menu** — professional context menu with submenus replacing
  browser default, SVN-aware with file status badges
- **Run dropdown** — context-aware build system selector covering 40+ build systems
- **Virtualized Git panel** — handles repos with 6000+ changed files without performance degradation
- X02PerfManager — interval throttle system that auto-activates on Jetson connect (5x slowdown
  of non-essential timers during tegrastats streaming)

### Changed
- SSH backend migrated from ssh2 + vendored OpenSSL → russh (pure Rust, no C dependencies)
- Git panel rebuilt with virtual scrolling for large repositories

---

## [1.4.x] - 2025-11 / 2025-12

### Added
- **Git integration** — 32 Rust backend commands covering: branch management, diff viewer,
  blame, history viewer, stash manager, merge conflict resolution, AI commit message generator
- **Advanced Git features** — `showDiffViewer`, `showBranchManager`, `showGitHistory`,
  `showMergeConflicts`, `showGitBlame`, `showStashManager`, `quickStash`, `quickPop`
- **SVN UI Enhanced** — full SVN panel with file decorators (M/A/D/C badges in file explorer),
  auto-detection, status bar integration, keyboard shortcuts
- **Camera panel** — AI vision analysis, OCR, auto-mode content filtering, image queue system
- **Plugin system** — hot-loading plugins with manifest, activate/deactivate lifecycle,
  Plugin Manager UI with search, filter tabs, toggle switches
- **Preview tab** — live web preview with cache-busting hard refresh
- **Arduino integration** — arduino-cli detection, board flash, serial monitor
- **Android integration** — ADB commands, APK build/deploy, game project scaffolding
- **Raspberry Pi remote** — SSH-based remote management panel
- **Serial port monitor** — real-time serial data with configurable baud rate

### Changed
- SVN UI refactored from single 4,900-line file into modular architecture
  (`svnManager`, `svnUI`, `svnAutoDetector`, `svnStatusBar`, `svnHistoryViewer`)

---

## [1.3.x] - 2025-09 / 2025-10

### Added
- **Surgical Edit Engine** — 8-stage Rust pipeline: detect → select → analyze → route → apply
  → sync → decorate → confirm. Atomic edits with automatic `.bak` backup before every change.
- **Surgical Backup Manager** — versioned backups with rollback UI, backup stats, `bm.list()`,
  `bm.showUI()`
- **Autonomous coding system** — auto-detect, auto-apply, accept (Enter) / reject (Escape)
  workflow with green/blue line decorations showing added/modified lines
- **IDE Script commands** — AI-invokable composite commands: `ide_patch`, `ide_patch_batch`,
  `ide_insert`, `ide_analyse`, `ide_review`, `ide_search`, `ide_rollback`
- **Build System integration** — F5 run, Shift+F5 stop, per-project build system detection
- **Breadcrumb navigation** — drag-and-drop path navigation above editor
- **File modification tracking** — orange pulsing dot on unsaved files, green fade on save
- **Tab persistence** — open tabs restored on app restart

---

## [1.2.x] - 2025-07 / 2025-08

### Added
- **Multi-provider AI routing** — Claude, OpenAI, Groq, Deepseek, Ollama, Gemini, Operator X02
  proxy. Per-message provider override with `#groq`, `#claude` prefix syntax.
- **Conversation persistence** — all conversations saved to `~/OperatorX02/conversations/` as
  JSON with configurable custom path
- **AI History Search v3** — semantic search across conversation history with memory decay,
  AI-generated summaries, vector embeddings
- **Project context integration** — AI reads project files, tracks open file, provides
  context-aware responses
- **Calibration system** — per-provider response quality calibration with history
- **Chat pagination** — virtual scrolling for long conversations, deferred lazy rendering
- **Message collapse** — linked bundle collapse for long AI responses

---

## [1.1.x] - 2025-05 / 2025-06

### Added
- **Monaco editor** — locally bundled (no CDN), CUDA/Arduino language extensions
- **File explorer** — IDE-style tree with SVG icons, sort by name/size/date/type,
  guide lines, drag support, single-click open
- **Tab manager** — multi-file tabs with change tracking, unsaved indicator, persistence
- **Terminal** — embedded terminal with 34 commands, command history, auto-completion,
  error highlighting, instant fix patterns
- **Project scaffolding** — 20+ templates including React, Flutter, CUDA, Arduino, Android
- **SVN setup** — one-click SVN initialization on any folder

---

## [1.0.0] - 2025-04

### Added
- Initial release of Operator X02 — AI-powered desktop IDE built with Tauri v2 + TypeScript
- Monaco editor with AI chat panel
- Claude + OpenAI API routing
- Basic file open/save via Tauri file system API
- Conversation history (localStorage)
- `~/OperatorX02/` home directory with `conversations/`, `projects/`, `plugins/`, `backups/`,
  `config/`, `logs/`, `templates/`

---

*Operator X02 is open source. Visit [operatorx02.com](https://operatorx02.com)*
*"Coding is Art. Feel it. Enjoy it."*
