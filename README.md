<div align="center">

# ⚡ Operator X02 Code IDE

### AI-Powered IDE for Embedded & Edge AI Developers

Built with **Tauri v2** · **Rust** · **TypeScript** · **Monaco Editor**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-blue)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Rust-2021-orange)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org)
[![Version](https://img.shields.io/badge/version-1.5.0--beta-green)](https://github.com/csheng21/operator-x02-ide/releases)

[Website](https://operatorx02.com) · [YouTube](https://youtube.com/@csh3003) · [Report Bug](https://github.com/csheng21/operator-x02-ide/issues) · [Request Feature](https://github.com/csheng21/operator-x02-ide/issues)

</div>

---

## 🧭 What is Operator X02?

Operator X02 is a **lightweight, AI-native IDE** built specifically for **embedded systems** and **edge AI developers**. Unlike VS Code or Cursor which bolt AI on as an extension, Operator X02 is designed AI-first from the ground up — with deep hardware integration for NVIDIA Jetson, Arduino, Raspberry Pi, and Android.

### Performance Comparison

| Metric | Operator X02 | VS Code | Cursor |
|---|---|---|---|
| Memory (idle) | **~95 MB** | ~280 MB | ~400 MB |
| Cold start | **~1.8s** | ~3.2s | ~4s |
| File open (1000 lines) | **12ms** | 25ms | — |
| Search (10K files) | **45ms** | 120ms | — |
| Binary size | **~100 MB** | ~300 MB | ~400 MB |

---

## ⬇️ How to Get Operator X02

There are **two ways** to get Operator X02. Please read carefully — they are different:

---

### ✅ Option 1 — Download Installer (Recommended)

**All features fully working — no build required.**

👉 Go to [Releases](https://github.com/csheng21/operator-x02-ide/releases) and download:
- `Operator-X02_1.5.0_x64-setup.exe` — Windows installer
- `Operator-X02_1.5.0_x64_en-US.msi` — Windows MSI package

> ⚠️ **Windows 10 / 11 (64-bit) only.** macOS and Linux support coming in v1.6.x.

The installer is compiled by the author using the complete private codebase.
All features including Surgical Edit Engine, Jetson, SSH, and Backup Manager are **fully functional**.

```
Download .exe → Install → Run → All features work ✅
```

---

### ⚠️ Option 2 — Build from Source Code

**For developers who want to study, modify, or contribute to the codebase.**

```bash
git clone https://github.com/csheng21/operator-x02-ide.git
cd operator-x02-ide
npm install
npm run tauri dev
```

> **Important:** When building from source, the following 4 modules are **community stubs**
> and will not be functional. All other features work normally.

| Module | Build from Source | Download Installer |
|---|---|---|
| All IDE features (Git, SVN, Arduino, Android, etc.) | ✅ Full | ✅ Full |
| AI Assistant (all providers) | ✅ Full | ✅ Full |
| IDE Script Auto Mode (12 commands) | ✅ Full | ✅ Full |
| Raspberry Pi remote deploy | ✅ Full | ✅ Full |
| **Surgical Edit Engine** (8-stage AI pipeline) | ⚠️ Stub | ✅ Full |
| **NVIDIA Jetson Integration** | ⚠️ Stub | ✅ Full |
| **SSH Remote Manager** | ⚠️ Stub | ✅ Full |
| **Surgical Backup Manager** | ⚠️ Stub | ✅ Full |

> These 4 modules contain proprietary core logic. The source code for these modules
> is not included in this repository. The compiled installer includes the full implementation.

---

## ✨ Full Feature List

### 🤖 AI Assistant
- **Multi-Provider Routing** — Claude (Anthropic), OpenAI, Groq, Deepseek, Gemini, Ollama (local/offline)
- **Conversation History Context** — AI remembers past sessions; auto-detects references like "what did we discuss yesterday?" and injects relevant history
- **AI History Search** — intelligent conversation memory with multi-factor relevance scoring (keyword 40% + topic 30% + phrase 20% + recency 10%)
- **Inline Autocomplete** — Copilot-style ghost text suggestions as you type
- **Code Context Injection** — AI automatically sees your currently open file
- **AI Commit Message Generator** — generates meaningful Git/SVN commit messages from your diff
- **AI Diff Analyzer** — explains what changed and why across SVN/Git diffs
- **Terminal AI Interceptor** — detects build errors in terminal and auto-suggests fixes
- **Camera Panel** — capture webcam image and send to vision AI for code analysis

### ✏️ IDE Script Engine — Classic vs Auto Mode

**Classic Mode**
- AI returns a full file as a code block
- 8-stage Surgical Edit Engine applies the change
- Safety Guard blocks destructive changes (>50% file deletion)
- Pipeline Overlay shows real-time 8-stage progress
- Purple line highlights show changed lines

**Auto Mode (Recommended)**
- AI reads the actual file first with `ide_read_file`
- AI patches only the specific lines that need changing
- 12 direct commands: `ide_read_file`, `ide_analyse`, `ide_review`, `ide_search`, `ide_patch`, `ide_patch_batch`, `ide_insert`, `ide_create_file`, `ide_create_folder`, `ide_delete`, `ide_rename`, `ide_rollback`
- Multi-file atomic batch operations
- Automatic per-operation backups with `ide_rollback` support
- Real-time log panel shows sequential progress

### 🌿 Version Control — Git + SVN (Both Native)

**Git Integration**
- Commit, push, pull, fetch, clone
- Branch create, switch, merge, delete
- Visual diff viewer with side-by-side comparison
- Git blame, stash manager, history viewer
- Merge conflict resolver
- AI-generated commit messages

**SVN Integration** (via TortoiseSVN)
- Update, commit, revert, add, delete
- SVN history viewer with revision browser
- SVN diff viewer with AI analysis
- File status decorators in explorer (M, A, D indicators)
- SVN dashboard with analytics

### 🔌 Arduino Integration
- Build and flash sketches directly from IDE
- Serial monitor with real-time data
- Arduino pin visualizer — visual board layout
- Serial plotter with AI analysis
- AI assistance for sketch generation

### 🍓 Raspberry Pi Integration
- Remote deploy over SSH
- Run commands on Pi from IDE terminal
- File browser — browse Pi filesystem remotely

### 📱 Android Integration
- **28 ADB commands** — device management, logcat, app install/uninstall/launch
- **ADB Auto-Installer** — downloads Platform Tools automatically
- 4-tab panel: Devices | Logcat | Build | IoT Bridge
- Logcat viewer with color-coded levels + AI error analysis
- Gradle build — Debug / Release / Clean / Build+Install+Run in one click
- **Arduino IoT Bridge** — Android ↔ Arduino data pipeline

### 🔍 AI File Search
- **Standard search** — fast filename filtering
- **AI-Enhanced search** — natural language queries
- **Content search** — search inside file contents across entire project

### 🎮 Game Development
- Android game project scaffolding
- Phaser.js HTML5 game templates
- AI game code generator

### 🧩 Plugin System
- Built-in plugins: Python, C#, Android/Kotlin, Flet
- External plugin loader with sandbox

---

## 🛠️ Build from Source — Prerequisites

> Only needed if you choose **Option 2** above.

> ⚠️ **Platform Support: Windows Only (for now)**
> Operator X02 currently supports **Windows 10 / 11 (64-bit) only**.
> macOS and Linux builds are planned for a future release (v1.6.x).
> The codebase contains Windows-specific implementations (process flags, file paths, TortoiseSVN)
> that need to be refactored before cross-platform support is possible.

### 1. Node.js v18+
Download: https://nodejs.org
```bash
node --version    # v18.x or higher
```

### 2. Rust + Cargo
```bash
# Run in PowerShell
winget install Rustlang.Rustup
```
Or download from: https://www.rust-lang.org/tools/install
```bash
rustc --version   # 1.70 or higher
```

### 3. Windows Requirements
- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) → select **"Desktop development with C++"**
- [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) — usually pre-installed on Windows 10/11

### 4. Optional Hardware Tools

| Tool | Required For | Auto-installed? |
|---|---|---|
| [arduino-cli](https://arduino.github.io/arduino-cli/) | Arduino features | No |
| ADB (Android Platform Tools) | Android features | **Yes — IDE installs automatically** |
| [TortoiseSVN](https://tortoisesvn.net/) (with CLI tools) | SVN features | No |

---

## ⚙️ First Launch Setup

On first launch, app folders are created automatically:

```
Windows:  C:\Users\{you}\OperatorX02\
macOS:    ~/OperatorX02/
Linux:    ~/OperatorX02/

├── config/          ← API keys, settings
├── conversations/   ← AI chat history (local, private)
├── projects/        ← Default workspace
├── plugins/         ← User plugins
├── backups/         ← Auto-backups
└── logs/            ← App logs
```

### Add AI Provider Keys

Settings → AI Providers:

| Provider | Free Tier | Link |
|---|---|---|
| Ollama | ✅ Free (local) | https://ollama.ai |
| Groq | ✅ Free tier | https://console.groq.com |
| Deepseek | Paid | https://platform.deepseek.com |
| Claude | Paid | https://console.anthropic.com |
| OpenAI | Paid | https://platform.openai.com |

---

## 🔧 Troubleshooting

**Build fails — "linker not found" (Windows)**
Install Visual Studio C++ Build Tools, restart terminal.

**"WebView2 not found" error**
Download: https://developer.microsoft.com/microsoft-edge/webview2/

**ADB not detected in Android panel**
Click **"Install ADB Automatically"** inside the Android panel.

**SVN commands not working**
Reinstall TortoiseSVN with **"Command line client tools"** option checked.

**AI chat not responding**
Check API key in Settings → AI Providers. For offline use, install Ollama.

**IDE slow on large projects**
Open DevTools console (F12) and run:
```javascript
window.X02Perf.throttle(5)   // reduce background load
window.X02Perf.restore()     // back to normal
```

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Commit: `git commit -m "feat: describe your change"`
4. Push: `git push origin feat/your-feature`
5. Open a Pull Request

Please use [Conventional Commits](https://www.conventionalcommits.org/) format.

> **Note:** Contributions to the 4 stub modules will not be accepted as these contain
> proprietary implementations. Contributions to all other modules are warmly welcome!

---

## 🗺️ Roadmap

**v1.5.x (Current)**
- [x] Multi-provider AI routing
- [x] AI conversation history search
- [x] Inline autocomplete
- [x] IDE Script Auto Mode (12 commands)
- [x] Git + SVN dual VCS
- [x] Arduino + serial monitor + pin visualizer
- [x] Android panel (28 ADB commands + Gradle + IoT Bridge)
- [x] Raspberry Pi remote deploy
- [x] Camera + vision AI
- [x] AI file search (natural language)
- [x] Plugin system

**v1.6.x (Coming)**
- [ ] Integrated debugger
- [ ] Remote development over SSH/WSL
- [ ] Database explorer
- [ ] Docker integration
- [ ] macOS + Linux cross-platform support

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

> The Surgical Edit Engine, NVIDIA Jetson Integration, SSH Remote Manager,
> and Surgical Backup Manager modules are proprietary components.
> Community stubs are provided in their place in this repository.
> The compiled installer at [Releases](https://github.com/csheng21/operator-x02-ide/releases)
> includes the full implementation of all features.

---

## 👨‍💻 About

Operator X02 is developed and maintained by a small independent dev team passionate about embedded systems and edge AI development.

- GitHub: [@csheng21](https://github.com/csheng21)
- YouTube: [@csh3003](https://youtube.com/@csh3003)
- Website: [operatorx02.com](https://operatorx02.com)

---

<div align="center">

⭐ **If Operator X02 helps your workflow, please star the repo!**

</div>
