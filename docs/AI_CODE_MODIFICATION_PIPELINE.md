# AI Code Modification Pipeline — Technology & Strategy

**Status:** Production-ready (SVN r1312)
**Last verified:** 2026-05-30
**Owner:** Heng (ChangSong Heng) — Operator X02

---

## 1. What this document covers

How Operator X02 turns a natural-language request like *"add a comment at the top of App.css"* into a verified change on disk, without lying to the user about what happened.

This pipeline replaces an earlier system that had two known failure modes:
- **Silent success** — patches reported "completed" while making no change to disk
- **Envelope corruption** — the AI's JSON tool-call was written *into* the target file as if it were code

Both classes of bug are now closed.

---

## 2. Architecture overview

```
User request in chat
        ↓
AI generates ide_script block (JSON: command + args)
        ↓
ideScriptBridge.executeIdeScript()
        ↓
Path resolution (resolveFilePath + getCurrentProjectPath)
        ↓
Tauri invoke → Rust ide_patch / ide_read_file / ide_insert
        ↓
Result inspection (success/failure surfaced honestly)
        ↓
File on disk OR loud error in console
        ↓
Monaco editor reload from disk
```

A parallel "autoApply" code-application system exists for non-script code blocks. It is **explicitly forbidden** from processing ide_script blocks via `IdeScriptGuard`.

---

## 3. Components and responsibilities

### 3.1 Frontend bridge

**File:** `src/ide/ideScriptBridge.ts` (~985 lines)

The single chokepoint between AI output and code execution. All `ide_*` commands flow through `executeIdeScript()`.

Responsibilities:
- Parse `ide_script` JSON blocks from AI responses
- Resolve relative paths to absolute using project-path globals
- Dispatch to the matching Tauri command
- Inspect Rust results and convert `success: false` into thrown errors
- Refresh file explorer / Monaco after FS-changing operations

### 3.2 Rust backend

**File:** `src-tauri/src/ide_script_commands.rs` (~994 lines)

Tauri commands exposed to the frontend:
- `ide_read_file` — read file content (absolute path required)
- `ide_patch` — find-and-replace within a file with backup
- `ide_patch_batch` — multiple patches in one call
- `ide_insert` — insert content at a line
- `ide_rollback` — revert to a backup
- `ide_create_file`, `ide_create_folder`, `ide_delete`, `ide_rename`
- `ide_analyse`, `ide_review`, `ide_search`

Critical design choice — `ide_patch` returns `Ok(IdePatchResult { success: false, error: Some(msg) })` when the find-string does not match, instead of an `Err`. This was correct on the Rust side but required the TS bridge to inspect the inner `success` field.

### 3.3 AutoApply (legacy, sandboxed)

**File:** `src/autonomousCoding.ts` (~10119 lines)

Originally designed to apply raw code blocks from chat to open files. Still useful for plain code snippets but **must never process `ide_script` envelopes** — doing so would write JSON tool-calls into target files (the corruption bug).

Protected by `IdeScriptGuard` (see §5.4).

### 3.4 Project analysis helpers

**File:** `src/ide/aiTools/projectAnalysis.ts`

Tauri-native fast variants of project introspection:
- `count_files_fast(pattern)` — ~100ms via `window.fileSystem.getDirectoryTree()`
- `get_project_structure_fast()` — recursive walk excluding `node_modules`, `target`, `.svn`, etc.

Replaces the older PowerShell-based path which timed out at 8s on medium projects.

---

## 4. Path resolution strategy

A persistent class of bug in this session was relative paths (e.g. `src/App.css`) reaching the OS filesystem without conversion to absolute paths.

**Resolver:** `resolveFilePath()` in `ideScriptBridge.ts`

Resolution order:
1. If input is `"PROJECT_ROOT"`, `""`, or `"."` → return the project root unchanged
2. If input is already absolute (`/...` or `C:\...`) → return unchanged
3. Otherwise, call `getCurrentProjectPath()` and prepend

**Project-path lookup:** `getCurrentProjectPath()` falls back through:
1. `window.currentProjectPath`
2. `window.projectPath`
3. `window.__projectPath`
4. `window.fileExplorer.projectPath`
5. `window.fileSystem.getLastPath('project')`
6. `window.SimplePathManager.getProjectPath()`

The fallback chain exists because different IDE subsystems set different globals at different times during boot. Relying on `window.currentProjectPath` alone caused failures when reads happened before that specific global was populated.

**Verified in production:** `window.currentProjectPath` was confirmed set to the absolute project path in console probes; the fallback chain provides resilience against future timing changes.

---

## 5. Defense-in-depth strategy

Every layer assumes the layer below it might be wrong.

### 5.1 PathFix v3 — placeholder handling

The AI sometimes sends literal strings `"PROJECT_ROOT"`, `""`, or `"."` as `file_path` instead of an actual relative path. Without handling, these would be concatenated to the project root and produce nonsense like `C:\Users\hi\project\PROJECT_ROOT`. Now treated as "use the project root, no append".

### 5.2 PathFallback v1 — global resolution chain

See §4 above. Six globals checked in order.

### 5.3 BypassReadPathFix v1 — bypass also resolves

`executeIdeScript` has a fast-path bypass for `ide_read_file` that calls `window.fileSystem.readFile()` directly without going through the main dispatcher. This bypass previously skipped `resolveFilePath` and silently swallowed errors. Now it resolves the path before reading and logs failures explicitly via `console.warn`.

### 5.4 IdeScriptGuard v1 — corruption prevention

The single most important fix in this pipeline. Located in `autonomousCoding.ts` at two sites:

**Site 1 — pre-filter (line ~3530):** After `getUnprocessedCodeBlocks()` returns, walk the array and remove any block whose:
- Language tag contains `ide_script` or `ide_scrip`, OR
- Content starts with `{ "command":` (envelope shape, language-tag-independent)

Removed blocks get their IDs added to `processedBlockIds` so the polling loop doesn't keep finding them.

**Site 2 — per-block belt-and-braces (line ~3625):** Even if a block escapes the pre-filter (e.g. metadata applied asynchronously), the processing loop checks again before applying:
```typescript
const _isIdeLang = _l.includes('ide_scrip') || _l.includes('ide_script');
const _isIdeEnvelope = /^\s*\{\s*"command"\s*:\s*"ide_[a-z_]+"/.test(codeInfo.code);
if (_isIdeLang || _isIdeEnvelope) continue;
```

This guard is what prevents `SurgicalBridge.applySmartUpdate()` from writing JSON tool-call text into target files.

### 5.5 SilentSuccessFix v1 — honest error surfacing

In `executeIdeScript`, right before logging "✅ completed":

```typescript
if (result && typeof result === 'object' && result.success === false) {
  const err = result.error || 'Operation reported success=false with no error detail';
  emitScriptEvent({ ..., status: 'failed', error: err });
  console.error(`❌ [IDE Script] ${call.command} reported failure: ${err}`);
  throw new Error(err);
}
```

Converts Rust's `Ok(IdePatchResult { success: false })` into a real thrown error. The AI sees this in its next-turn context and can react instead of cheerfully reporting non-existent success.

---

## 6. End-to-end flow (verified example)

User prompt: *"Please add a comment at the very top of src/App.css that says: /\* Main stylesheet \*/"*

1. **AI scan:** `[AI Scan] Reading: app.css` → `Read file: App.css (392 chars)` (BypassReadPathFix applied path resolution)

2. **AI generates patch:**
   ```json
   {
     "command": "ide_patch",
     "args": {
       "file_path": "C:\\Users\\hi\\Desktop\\projects\\my-awevvvvvsome-app/src/App.css",
       "find": "#root {",
       "replace": "/* Main stylesheet */\n\n#root {",
       "description": "Add comment at the top of App.css"
     }
   }
   ```
   Real find-string (the actual first line). Real replace.

3. **Bridge dispatches:** `ideScriptBridge.executeIdeScript` resolves path (already absolute, no change), invokes Tauri `ide_patch`.

4. **Rust applies the patch:** `[CI] Snapshot from disk: App.css (392 chars)` → `[CI] Write completed: ide_patch > App.css` → returns `success: true`.

5. **Bridge confirms success:** `✅ [IDE Script] ide_patch completed in 1984ms`. SilentSuccessFix's check passes (success is genuinely true).

6. **AutoApply attempts but is blocked:**
   ```
   ?? [AutoApply] Found 1 blocks targeting 0 file(s)
   ?? [SmartSelect] Scoring 1 code blocks
   ?? [AutoApply] No suitable code block found
   ```
   IdeScriptGuard prevented the ide_script envelope from being treated as code. **No `[Pipeline] Stage` ran. No `SurgicalBridge.write_file fallback` fired.**

7. **Monaco reloads from disk:** `📄 New model created for: ...App.css` → `[ChangeIndicator] Applied: +2 ~0 -0`.

8. **Disk verification:**
   ```
   PS> Get-Content "...\src\App.css" -TotalCount 3
   /* Main stylesheet */
   #root {
   ```
   File on disk has exactly the requested change. No corruption.

---

## 7. Failure modes and how they are handled

| Failure | Old behavior | New behavior |
|---|---|---|
| Find-string not found in file | "✅ completed" logged, no change made | `❌ reported failure: Pattern not found...` thrown, AI sees error |
| Relative path with no project loaded | OS error, swallowed silently | `console.warn` logs the fall-through, main dispatch runs path resolution |
| AI sends `PROJECT_ROOT` literal | Concatenated → nonsense path | Returns project root unchanged |
| AI sends bad find-string (hallucinated) | Silent success, file unchanged | Honest failure, AI re-reads and retries |
| autoApply tries to process ide_script | JSON envelope written to file (corruption) | Filtered out at two sites in autonomousCoding.ts |
| `window.currentProjectPath` unset at read time | Read fails | Five other globals checked as fallback |

---

## 8. File reference

| Path | Role | Lines |
|---|---|---|
| `src/ide/ideScriptBridge.ts` | Frontend bridge, path resolution, result inspection | ~985 |
| `src/autonomousCoding.ts` | Legacy autoApply (sandboxed by IdeScriptGuard) | ~10119 |
| `src/ide/aiTools/projectAnalysis.ts` | Tauri-native project introspection | — |
| `src/ide/ideScriptUI.ts` | Status bar log panel for IDE Script activity | — |
| `src-tauri/src/ide_script_commands.rs` | Rust backend (ide_patch, ide_read_file, etc.) | ~994 |
| `src-tauri/src/main.rs` | Tauri command registration | ~3604 |
| `src-tauri/src/surgical_edit_commands.rs` | Lower-level surgical edit primitives | ~1317 |
| `src-tauri/src/surgical_backup_commands.rs` | Backup creation for ide_patch | — |

### Files NOT in this pipeline (intentionally excluded)

- `src/ide/aiAssistant/ideScriptBridge.ts` — **duplicate, orphaned, no imports.** Should be deleted in a future cleanup pass.
- Anything under `src/legacy/` or `src/old/` — not loaded.

---

## 9. SVN history of this functional area

| Revision | What changed | Symbol |
|---|---|---|
| r1310 | svnUIEnhanced.ts HiddenByDefault v1 | UI |
| r1311 | autonomousCoding.ts IdeScriptGuard v1 (corruption fix) | **🛡️ critical** |
| r1312 | ideScriptBridge.ts BypassReadPathFix v1 (read resolution) | path |

The PathFix v3, PathFallback v1, and SilentSuccessFix v1 patches were rolled into the same `ideScriptBridge.ts` file already on disk before r1312 (they had been deployed without being committed in prior rounds). r1312 captured them all along with BypassReadPathFix v1.

---

## 10. Testing strategy

For any future modification to this pipeline, the canonical end-to-end test is:

1. Restart the IDE (close completely, reopen — Vite needs a clean module load)
2. Open DevTools console, clear it
3. Send to AI: *"Add a comment `/\* test \*/` at the top of `src/App.css`"*
4. Watch console for:
   - ✅ `Read file: App.css (N chars)` — read worked
   - ✅ `ide_patch completed in Xms` — patch worked
   - ❌ Should NOT see: `[Pipeline] Stage`, `SurgicalBridge string_replace failed`, `Used write_file fallback`
5. Run on disk: `Get-Content "<project>\src\App.css" -TotalCount 3`
6. Confirm the first line is the new comment

If step 4 shows any of the forbidden lines, IdeScriptGuard regressed.
If step 4 fails read or patch, BypassReadPathFix / PathFallback regressed.

---

## 11. Known limitations and future work

**Not blocking, but worth tracking:**

- `SurgicalBridge.string_replace failed: undefined` — root-cause bug still in SurgicalBridge's input validation. Defanged by IdeScriptGuard (input never reaches it for ide_script blocks). Worth fixing properly later.
- Duplicate file at `src/ide/aiAssistant/ideScriptBridge.ts` — orphaned, safe to delete.
- Two parallel SVN UI systems initialize (`svnUI.ts` + `svnUIEnhanced.ts`) — not in this pipeline but worth consolidating.
- AI sometimes still sends `ide_read_file` followed by waiting for output, instead of reading + patching in one turn. Prompt engineering in the IDE Script context could tighten this.
- `templateUI.ts:571 ❌ Templates parent container not found` and `apiProviderManager.ts:5423 Settings button not found after creation` — cosmetic warnings, pre-existing, unrelated to this pipeline.

---

## 12. Design principles applied

Three principles guided the fixes in this pipeline. Worth keeping in mind for future work:

**1. Honest failure over false success.** A loud error is always preferable to a silent lie. SilentSuccessFix exists because users were misled into thinking their files had been modified when they hadn't.

**2. Defense in depth.** Path resolution happens in the bypass *and* the main dispatch. IdeScriptGuard checks blocks at the pre-filter *and* the per-block loop. Multiple layers means a single bug doesn't cascade to data loss.

**3. Single writer per file.** The corruption bug existed because two systems (ideScriptBridge + autoApply) both tried to write to the same file. IdeScriptGuard enforces that ide_script blocks go through exactly one path (Rust ide_patch). The long-term goal is to dismantle the parallel autoApply path entirely; the short-term fix is to fence it off.

---

*Coding is Art. And now the tool doesn't lie about what it just painted.*
