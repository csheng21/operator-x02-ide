<div align="center">

<img width="1920" height="819" alt="ChatGPT Image Aug 17, 2026, 10_24_52 PM" src="https://github.com/user-attachments/assets/c900ec88-7c56-443e-bbc9-5f4b21e2b513" />

<br/>

# Operator X02

### AI Engineering IDE for the whole system — not just the code.

**Software × Hardware × Architecture × Engineering Memory**

**Code is only part of engineering.** Operator X02 understands your
software, hardware, build system, architecture and engineering knowledge
— helping you build, debug and maintain complex systems faster.

<br/>

[![License:
MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-1D6EFA)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Rust-2021-orange)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-1D6EFA)](https://www.typescriptlang.org)
[![Version](https://img.shields.io/badge/version-1.5.9.1b-2EC27E)](https://github.com/csheng21/operator-x02-ide/releases)

[![Download for Windows —
Free](https://img.shields.io/badge/%E2%AC%87%EF%B8%8F%20DOWNLOAD%20FOR%20WINDOWS-FREE-2EC27E?style=for-the-badge&labelColor=07090F)](https://github.com/csheng21/operator-x02-ide/releases)
[![Star on
GitHub](https://img.shields.io/badge/%E2%AD%90%20STAR-ON%20GITHUB-1D6EFA?style=for-the-badge&labelColor=07090F)](https://github.com/csheng21/operator-x02-ide)

[Website](https://operatorx02.com) · [Watch
Demo](https://youtube.com/@csh3003) ·
[Discord](https://discord.gg/jeq3Ss3PfX) ·
[About](https://operatorx02.com/about.html)

<br/>

✓ Whole-project understanding  ·  ✓ Hardware native  ·  ✓ Offline
capable  ·  ✓ Free built-in AI  ·  ✓ MIT-licensed core

<br/>

🤖 X02 ships with a **free built-in AI** — start coding with **no API
key and no account**.  
Add your own providers when you want more power, or run **Ollama** for a
local, offline workflow.

<br/>

</div>

<img width="1674" height="998" alt="Operator X02 main interface" src="https://github.com/user-attachments/assets/224b0d26-2cec-432b-b318-13b0507ee3de" />

> ### The one thing to remember
>
> Operator X02 builds an AI understanding of your **entire engineering
> project** — not just your code.

------------------------------------------------------------------------

## 🧭 Engineering, *not just coding.*

Most AI coding tools focus on generating and editing code. Operator X02
is designed around a broader engineering problem: understanding and
developing complete systems — **software, hardware, build system,
architecture and project knowledge together**.

| Typical AI coding IDE                         | Operator X02                                    |
|:----------------------------------------------|:------------------------------------------------|
| Code-centric context                          | **Engineering-system context**                  |
| Context-window memory                         | **Persistent engineering memory**               |
| Hardware through extensions or external tools | **Hardware-native workflow**                    |
| Generate and edit code                        | **Understand → Build → Deploy → Observe → Fix** |
| Primarily cloud-model workflows               | **Cloud AI + local / offline AI**               |
| File and repository focus                     | **Software + hardware + architecture**          |

*This is a difference in design direction, not a scorecard. Different
tools are optimized for different engineering problems.*

The complete **hardware + software workflow** — write code, flash real
boards, deploy over SSH and watch live device data from one editor —
went live in **v1.5.8**:

[![v1.5.8 — Hardware + Software
Workflow](https://img.shields.io/badge/%E2%9A%99%EF%B8%8F%20v1.5.8-HARDWARE%20%2B%20SOFTWARE%20WORKFLOW-1D6EFA?style=for-the-badge&labelColor=07090F)](https://github.com/csheng21/operator-x02-ide/releases/tag/v1.5.8)

------------------------------------------------------------------------

# Four engineering pillars

## 🧠 1. Engineering Brain

One understanding layer for the whole system.

Instead of treating every question as an isolated coding request, X02 is
designed to connect code with project structure, architecture, build
information and engineering knowledge. Ask natural-language questions
and get answers grounded in the project.

<div align="center">

<img width="2400" height="1040" alt="Operator X02 Engineering Brain" src="https://github.com/user-attachments/assets/e30bce74-6817-4875-9bc3-1665e2779e43" />

</div>

### Engineering Intelligence

Designed for projects with thousands of files, X02 provides project-wide
engineering assistance:

|                                    |                                                                                                                                         |
|------------------------------------|:----------------------------------------------------------------------------------------------------------------------------------------|
| **🗺️ Architecture Intelligence** G | enerate architecture overviews, module relationships, data flow and call-graph views from the project.                                  |
| **🧯 Build Intelligence**          | Explain build failures and help trace likely causes such as dependencies, compiler errors, toolchain issues and environment mismatches. |
| **🔬 Large Project Intelligence**  | Semantic search, cross-module understanding, repository navigation and project-wide analysis for large C/C++ and mixed codebases.       |

------------------------------------------------------------------------

## 💾 2. Engineering Memory

Your engineering project should not restart from zero every day.

Operator X02 keeps project knowledge across sessions — including
previous decisions, module relationships, coding conventions, project
structure and engineering knowledge — and recalls relevant information
when it becomes useful.

**The memory layer is local. It does not require a cloud memory service
or a per-token memory fee.**

> **Status: Beta.** The recall pipeline ships and runs in the current
> release; ranking and retention are still being tuned.

<div align="center">

<img width="1774" height="887" alt="ChatGPT Image Aug 17, 2026, 11_24_40 PM" src="https://github.com/user-attachments/assets/a0a05c3d-31b8-4ac8-9d77-3033c2d16266" />

</div>

- **172+ recall triggers** — phrases such as *“yesterday”*, *“what
  changed”* and *“why”* can trigger retrieval of relevant past context.
- **Memory that outlives the active context window** — engineering
  knowledge persists across sessions instead of disappearing when a
  conversation ends.
- **Relevance-ranked recall** — memory retrieval is designed to surface
  useful prior knowledge instead of loading the entire history into
  every prompt.
- **Decay-managed retention** — repeatedly useful knowledge can remain
  prominent while lower-value noise is reduced.
- **~15 ms local search** — indexed memory search runs locally, avoiding
  a cloud round trip.

### Context is temporary. Engineering knowledge should not be.

``` text
Current Engineering Task
          ↓
   Intent / Recall Trigger
          ↓
    Engineering Memory
          ↓
 Relevant Past Knowledge
          ↓
     Project Context
          ↓
     Answer / Action
```

The model still has an active context window. X02’s memory architecture
is designed so that **persistent engineering knowledge is not limited to
the lifetime of that window**: relevant memory can be retrieved back
into the active context when needed.

[![Engineering Memory — Deep
Dive](https://img.shields.io/badge/%F0%9F%A7%A0%20ENGINEERING%20MEMORY-DEEP%20DIVE-1D6EFA?style=for-the-badge&labelColor=07090F)](https://operatorx02.com/engineering-memory.html)

------------------------------------------------------------------------

## 🔌 3. Hardware Native

X02 is designed for engineers who need their code to leave the editor
and run on real hardware.

SSH, flash, serial monitoring, remote development and deployment are
part of the engineering workflow rather than an afterthought.

[![All Platforms — Demos, Comparisons,
FAQ](https://img.shields.io/badge/%F0%9F%94%8C%20ALL%20PLATFORMS-DEMOS%20%C2%B7%20COMPARISONS%20%C2%B7%20FAQ-1D6EFA?style=for-the-badge&labelColor=07090F)](https://operatorx02.com/x02-platforms-promo.html)

| Platform                                                               | What you get                                                                                                        |            |
|:-----------------------------------------------------------------------|:--------------------------------------------------------------------------------------------------------------------|------------|
| **🔧 Arduino**                                                         | One-click compile and flash, built-in serial monitor, pin visualizer, AI sketch generator and board auto-detection. | ✓ Full     |
| **🍓 Raspberry Pi**                                                    | Deploy over SSH, run remote commands and browse the Pi filesystem from the development workflow.                    | ✓ Full     |
| **[📱 Android](https://operatorx02.com/android-app-development.html)** | 28 ADB commands, Gradle builds, AI Logcat crash analysis, Arduino IoT bridge and ADB auto-installer.                | ✓ Full     |
| **[⚡ NVIDIA Jetson](https://operatorx02.com/jetson-v15.html)**        | Live GPU dashboard, tegrastats streaming, CUDA detection and remote deployment through the SSH manager.             | ★ New v1.5 |
| **🐧 Linux Embedded**                                                  | Develop, deploy and debug embedded Linux targets over SSH.                                                          | ✓ Full     |

<img width="1674" height="1002" alt="NVIDIA Jetson live dashboard in Operator X02" src="https://github.com/user-attachments/assets/3894c123-fc7c-4b7e-9448-41b18b87733a" />

### Write AI code. Flash it. *Test it on real hardware.*

Deploy models to a Jetson Orin, flash firmware to an Arduino, SSH into a
Raspberry Pi and watch live device data — from the same engineering
environment where the code was created.

------------------------------------------------------------------------

## 🛡️ 4. Engineering Guardrails

AI-generated code is useful. Engineering work also needs **control,
evidence and reversibility**.

X02 combines controlled editing, backup and rollback with engineering
assessment capabilities.

### Engineering-Grade Development

X02’s workflow is evidence-driven: AI-proposed changes can be analysed
and reviewed before they ship. Safety-critical engineering is one
demanding use case for that approach, so X02 includes support around
**MISRA C:2012**, **ISO 26262**, **IEC 61508** and **IEC 62304**.

- **ISO 26262 Professional Analysis** — generate a clause-cited analysis
  of an AI-proposed change, including executive summary, ASIL impact,
  compliance status, risk assessment and per-change safety breakdowns.
  Reports can be saved as HTML for review.
- **Engineering Assessment Report** — evidence-driven findings with
  stable IDs, a published scoring formula, severity heatmap, prioritized
  actions, verification checklists and a machine-readable
  `assessment.json` twin.
- **AI-aware SVN & Git** — native TortoiseSVN and Git workflows with
  modified-file awareness, AI-assisted commit messages, diff analysis
  and merge assistance.

[![v1.5.9.1b — Engineering Experience
Update](https://img.shields.io/badge/%F0%9F%93%8B%20v1.5.9.1b-ENGINEERING%20EXPERIENCE%20UPDATE-2EC27E?style=for-the-badge&labelColor=07090F)](https://github.com/csheng21/operator-x02-ide/releases/tag/v1.5.9.1b)
[![AI × Hardware × Safety — Deep
Dive](https://img.shields.io/badge/%F0%9F%9B%A1%EF%B8%8F%20AI%20%C3%97%20HARDWARE%20%C3%97%20SAFETY-READ%20THE%20DEEP%20DIVE-1D6EFA?style=for-the-badge&labelColor=07090F)](https://operatorx02.com/embedded-ai-development.html)

------------------------------------------------------------------------

## 🔄 The whole engineering lifecycle

Real projects move through a lifecycle. X02 is designed to connect more
of that lifecycle inside one environment.

<div align="center">

<img width="2400" height="480" alt="Operator X02 engineering lifecycle" src="https://github.com/user-attachments/assets/56148db5-673c-4617-87f6-5749bf8226d9" />

</div>

``` text
Understand
    ↓
Design / Navigate
    ↓
Generate / Edit
    ↓
Build
    ↓
Deploy / Flash
    ↓
Observe Real Hardware
    ↓
Debug / Analyse
    ↓
Remember What Was Learned
```

------------------------------------------------------------------------

## ✨ Key capabilities

|                                        |                                                                                                                                                                                     |
|:---------------------------------------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **🧠 Controlled, reversible editing**  | **[8-stage Surgical Edit Engine](https://operatorx02.com/surgical-edit-engine.html)** — backs up before editing, blocks destructive deletion patterns and applies targeted patches. |
| **🚀 Read before write**               | **[Auto Mode](https://operatorx02.com/auto-mode_advance.html)** — surgical line-level patches, atomic multi-file batches, backup per command and one-click rollback.                |
| **🔄 Your AI, zero lock-in**           | **Multi-provider routing** — Claude, OpenAI, Gemini, Groq, DeepSeek and Ollama. Choose the model that fits the task and switch providers when needed.                               |
| **📹 Vision into engineering context** | **Camera AI vision** — use images of PCBs, schematics or whiteboards as engineering input for AI-assisted development.                                                              |
| **🖥️ Observe devices live** \*         | \*Jetson dashboard\*\* — GPU and thermal monitoring, CUDA detection and SSH deployment from the IDE.                                                                                |
| **🧩 Extend the environment**          | **Plugin architecture** — Python, C#, Kotlin, Arduino and Flet plugins for additional languages and toolchains.                                                                     |

------------------------------------------------------------------------

## 🚀 Build Mode — one prompt, one installer

Describe the tool you need. Operator X02 can scaffold the project,
generate code, install dependencies, compile with Cargo and Tauri, and
produce a **double-clickable Windows installer** from the same
environment.

<div align="center">

<img width="2400" height="460" alt="Operator X02 Build Mode" src="https://github.com/user-attachments/assets/19f18b98-88f1-4600-a61b-8dd6536220d4" />

</div>

[![Build Mode — Read the Full
Release](https://img.shields.io/badge/%F0%9F%9A%80%20BUILD%20MODE-READ%20THE%20FULL%20RELEASE-1D6EFA?style=for-the-badge&labelColor=07090F)](https://operatorx02.com/release-v1.5.9.1a.html)

------------------------------------------------------------------------

## 🤖 Your AI, your choice.

X02 ships with a **free built-in AI** so you can start without an API
key or account.

For other workloads, configure your own provider or use **Ollama** for
local/offline inference.

`Operator X02 API — FREE · BUILT-IN` · Claude (Anthropic) · OpenAI ·
Groq Llama · DeepSeek · Gemini (Google) · `Ollama — LOCAL · OFFLINE`

------------------------------------------------------------------------

## ⚡ Performance

Operator X02 is built with **Rust + Tauri**, with Rust used for native
operations and TypeScript for the application layer.

Current project measurements reported on the same Windows 11 x64 machine
and default configurations:

| Metric                 | Operator X02 | VS Code |
|:-----------------------|:------------:|:-------:|
| Memory (idle)          |  **~95 MB**  | ~280 MB |
| Cold start             |  **~1.8 s**  | ~3.2 s  |
| File open (1000 lines) |  **12 ms**   |  25 ms  |
| Search (10K files)     |  **45 ms**   | 120 ms  |
| Binary size            | **~100 MB**  | ~300 MB |

> **Benchmark note:** These figures are project-reported measurements,
> not universal guarantees. Results vary with hardware, project size,
> application version, cache state and installed extensions. A
> reproducible benchmark methodology should accompany these figures when
> the test-machine details and repeated-run dataset are published.

------------------------------------------------------------------------

# ⬇ Get Operator X02

## ⭐ Recommended — Download Installer

**All distributed features are available in the free Windows installer.
No source build is required.**

👉 [**Download for Windows —
Free**](https://github.com/csheng21/operator-x02-ide/releases)

> ⚠ **Windows 10 / 11 (64-bit) only.** macOS and Linux are planned for
> the v1.6.x roadmap.

------------------------------------------------------------------------

## 🛠️ For developers — Build from Source

Clone, study and contribute to the MIT-licensed core:

``` bash
# prerequisites: Node 18+, Rust 1.70+
git clone https://github.com/csheng21/operator-x02-ide.git
cd operator-x02-ide
npm install
npm run tauri dev
```

### 🔓 Open-core model

Operator X02 uses an **open-core distribution model**.

The repository contains the MIT-licensed editor, AI layer and core
engineering workflow. Some advanced integrations are represented as
stubs in the source build while the free installer contains their
working distributed implementations.

Based on the currently documented source-build scope:

| Module                             |  Source build   |    Installer    |
|:-----------------------------------|:---------------:|:---------------:|
| Core IDE · editor · project system |     ✓ Full      |     ✓ Full      |
| AI providers · chat · autocomplete |     ✓ Full      |     ✓ Full      |
| Arduino · Android · Git · SVN      |     ✓ Full      |     ✓ Full      |
| Engineering Memory                 | ✓ Full *(Beta)* | ✓ Full *(Beta)* |
| Surgical Edit Engine               |     ○ Stub      |     ✓ Full      |
| NVIDIA Jetson integration          |     ○ Stub      |     ✓ Full      |
| SSH Remote Manager                 |     ○ Stub      |     ✓ Full      |

> The previous README stated that **four** modules ship as stubs, but
> only three were named. This version intentionally lists only the
> modules currently identified instead of inventing a fourth module.
> Update this table when the remaining module is confirmed.

The installer is free and requires no account. If you want to inspect,
modify or contribute to the open core, build from source. If you want
the complete distributed feature set, use the installer.

<details>
<summary>

<b>📋 Full prerequisites & first launch</b>

</summary>

<br/>

- **Node.js 18+** — https://nodejs.org
- **Rust 1.70+** — `winget install Rustlang.Rustup`
- **Visual Studio C++ Build Tools** — select *Desktop development with
  C++*
- **WebView2** — usually pre-installed on Windows 10/11
- **Optional:** [arduino-cli](https://arduino.github.io/arduino-cli/)
  for Arduino
- **Optional:** [TortoiseSVN](https://tortoisesvn.net/) with CLI tools
  for SVN
- ADB is **installed automatically**

On first launch, X02 creates application folders under:

`C:\Users\{you}\OperatorX02\`

These contain configuration, local conversations, projects, plugins,
backups and logs.

Add external providers in **Settings → AI Providers**, or start with the
built-in AI.

</details>
<details>
<summary>

<b>🔧 Troubleshooting</b>

</summary>

<br/>

- *Linker not found* → install Visual Studio C++ Build Tools and restart
  the terminal.
- *WebView2 not found* → install Microsoft WebView2 Runtime.
- *ADB not detected* → click **Install ADB Automatically** in the
  Android panel.
- *SVN not working* → reinstall TortoiseSVN with **command line client
  tools** selected.
- *AI not responding* → check the configured provider/API key, use the
  built-in AI, or run Ollama locally.
- *Slow on large projects* → F12 console: `window.X02Perf.throttle(5)` /
  `window.X02Perf.restore()`.

</details>

------------------------------------------------------------------------

## 🗺️ Where we’re going

| ✓ v1.0 – v1.4 · Foundation                                                                                                    | ● v1.5.x · Current                                                                                                                                      | → v1.6.x · Next                                                                         |
|:------------------------------------------------------------------------------------------------------------------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------|:----------------------------------------------------------------------------------------|
| Multi-provider AI · Monaco · Git + SVN · Arduino · Android (28 ADB) · Pi SSH · Surgical Edit Engine · Plugins · Camera vision | Jetson Orin + live tegrastats · AI history search · Inline autocomplete · Auto Mode · Build Mode · ISO 26262 / Assessment reports · Open-source release | macOS · Linux · Integrated debugger · Remote dev (SSH/WSL) · Database explorer · Docker |

> ### Our vision
>
> The future of AI development isn’t only *generating code.* **It’s
> understanding engineering.**
>
> Operator X02 aims to become an engineering intelligence layer for
> modern software and hardware development.

------------------------------------------------------------------------

## ⚔️ Why X02 exists

Operator X02 is built around a simple belief:

**AI should strengthen engineering judgement, not replace engineering
discipline.**

The project manifesto explains the philosophy behind X02 and why the
project takes a different direction from pure *vibe coding* workflows.

**The Craftsman’s Tool for the AI Era: Why We Chose to Fight Vibe
Coding**

[Read in
English](https://medium.com/@sngaheng/the-craftsmans-tool-for-the-ai-era-why-we-chose-to-fight-vibe-coding-a03f23f0ae31)
·
[阅读中文版](https://operatorx02.com/vibe-coding-manifesto.html)


X02 Rethinking the Boundaries Between Memory and AI Creativity https://operatorx02.com/ai-imagination-governance.html

<img width="1536" height="1024" alt="ChatGPT Image Aug 17, 2026, 10_51_08 PM" src="https://github.com/user-attachments/assets/494129e3-471d-41f3-81ba-e7fe1e0c6c9a" />

------------------------------------------------------------------------

## 💬 Community

- 🐛 [Issues](https://github.com/csheng21/operator-x02-ide/issues) —
  report bugs and request features
- 💬
  [Discussions](https://github.com/csheng21/operator-x02-ide/discussions)
  · [Discord](https://discord.gg/jeq3Ss3PfX)
- 🎬 [Tutorials on YouTube](https://youtube.com/@csh3003)
- ✍️ [Dev Logs](https://operatorx02.com/about.html#blog)

------------------------------------------------------------------------

## 🤝 Contributing

Fork → create a feature branch → commit using [Conventional
Commits](https://www.conventionalcommits.org/) → open a Pull Request.

Contributions to the open core are welcome.

------------------------------------------------------------------------

## 👥 About

The story behind Operator X02 — who builds it, why it exists and what
drives its engineering direction:

**[→ Read the full story on
operatorx02.com](https://operatorx02.com/about.html)**

<img width="1018" height="606" alt="image" src="https://github.com/user-attachments/assets/b78b0ec7-f743-4f82-ba64-08b78bd25bb3" />

------------------------------------------------------------------------

## 📄 License

The repository’s open core is licensed under the **MIT License**. See
[LICENSE](https://github.com/csheng21/operator-x02-ide/blob/main/LICENSE).

The prebuilt installer contains the complete distributed feature set
described above.

------------------------------------------------------------------------

<div align="center">

<br/>

### — feel it. enjoy it. —

## *Coding is Art.* Start creating *yours* today.

[![Download for Windows —
Free](https://img.shields.io/badge/%E2%AC%87%EF%B8%8F%20DOWNLOAD%20FOR%20WINDOWS-FREE-2EC27E?style=for-the-badge&labelColor=07090F)](https://github.com/csheng21/operator-x02-ide/releases)

[View on GitHub](https://github.com/csheng21/operator-x02-ide) · [Watch
Demo](https://youtube.com/@csh3003)

✓ MIT-licensed core · ✓ No account required · ✓ Free built-in AI · ✓
Offline workflow available

⭐ **If Operator X02 helps your workflow, star the repo — it’s how other
engineers find it.**

</div>
