// src/ide/ideScriptBridge.ts
// ============================================================================
// 🧠 IDE SCRIPT BRIDGE v2 — Connects AI to Rust IDE Script Commands
// ============================================================================
//
// v2 adds:
//   - ide_create_file   — Create new file with content
//   - ide_create_folder — Create new directory
//   - ide_delete        — Delete file/folder
//   - ide_rename        — Rename/move file
//   - ide_read_file     — Read full file content
//   - resolveFilePath   — Auto-resolve relative → absolute paths
//   - File explorer refresh after file system changes
//
// Existing commands:
//   - ide_analyse, ide_review, ide_search
//   - ide_patch, ide_patch_batch, ide_insert
//   - ide_rollback, ide_script_status
//
// Integration:
//   - Works with Surgical Edit Engine (backup system, safety guard)
//   - Emits 'ide-script-activity' events for UI log panel
//   - Triggers file explorer refresh after create/delete/rename
//   - Change Summary Panel — tracks all file changes with diff view & undo
// ============================================================================

import { invoke } from '@tauri-apps/api/core';
import { recordFileChange } from './changeSummaryPanel';

// ============================================================================
// PATH RESOLUTION — Converts relative paths to absolute using project path
// ============================================================================

function resolveFilePath(filePath: string): string {
  if (!filePath) return filePath;
  // Already absolute (Windows drive letter or Unix root)
  if (/^[A-Za-z]:\\/.test(filePath) || filePath.startsWith('/')) return filePath;
  // Get project path from window globals
  const projectPath = (window as any).currentProjectPath || '';
  if (!projectPath) {
    console.warn('[IDE Script] No project path, using relative:', filePath);
    return filePath;
  }
  const sep = projectPath.includes('\\') ? '\\' : '/';
  const base = projectPath.endsWith(sep) ? projectPath : projectPath + sep;
  const resolved = base + filePath.replace(/\//g, sep);
  // Smart resolve: if direct path doesn't exist, search subdirectories
  try {
    const fileList = (window as any).aiFileExplorer?.getFiles?.() || (window as any).aiFileExplorer?.files || [];
    const fileName = filePath.replace(/\\/g, '/').split('/').pop()?.toLowerCase() || '';
    const filePathNorm = filePath.replace(/\\/g, '/').toLowerCase();

    // Check if the AI gave a partial path like "security.ts" or "utils/security.ts"
    const match = fileList.find((f: any) => {
      const fPath = (f.path || f.name || '').replace(/\\/g, '/').toLowerCase();
      return fPath.endsWith(filePathNorm) || fPath.endsWith('/' + filePathNorm) || fPath.split('/').pop() === fileName;
    });

    if (match) {
      const matchPath = match.path || match.name || '';
      // If match has full path, use it; otherwise build from project
      const smartResolved = /^[A-Za-z]:\\/.test(matchPath) || matchPath.startsWith('/')
        ? matchPath
        : base + matchPath.replace(/\//g, sep);
      console.log('[IDE Script] Path resolved (smart): ' + filePath + ' -> ' + smartResolved);
      return smartResolved;
    }
  } catch (e) {
    // Fallback to simple resolution
  }

  console.log('[IDE Script] Path resolved: ' + filePath + ' -> ' + resolved);
  return resolved;
}

// ============================================================================
// FILE EXPLORER REFRESH — Notify UI after file system changes
// ============================================================================

function refreshFileExplorer(): void {
  // Multiple event names for compatibility with different explorer versions
  window.dispatchEvent(new CustomEvent('file-tree-refresh'));
  window.dispatchEvent(new CustomEvent('refresh-file-tree'));
  window.dispatchEvent(new CustomEvent('fileTreeRefresh'));

  // Direct refresh if available
  if ((window as any).refreshFileTree) {
    (window as any).refreshFileTree();
  }

  console.log('[IDE Script] File explorer refresh triggered');
}

// ============================================================================
// TYPES
// ============================================================================

export interface IdeAnalyseResult {
  file_path: string;
  total_lines: number;
  file_size_bytes: number;
  language: string;
  imports: { line: number; module: string; items: string[] }[];
  exports: string[];
  functions: { name: string; line_start: number; line_end: number; params: string; is_async: boolean; is_exported: boolean }[];
  classes: { name: string; line_start: number; line_end: number; methods: string[]; is_exported: boolean }[];
  todos: { line: number; text: string; tag: string }[];
  complexity: string;
  summary: string;
}

export interface IdeReviewResult {
  file_path: string;
  issues: { line: number; severity: string; category: string; message: string; snippet: string; suggestion: string }[];
  total_issues: number;
  summary: string;
}

export interface IdeSearchResult {
  pattern: string;
  scope: string;
  total_matches: number;
  matches: { file_path: string; line: number; column: number; content: string; context_before: string[]; context_after: string[] }[];
}

export interface IdePatchResult {
  success: boolean;
  file_path: string;
  backup_id: string;
  line_start: number;
  line_end: number;
  lines_removed: number;
  lines_added: number;
  diff: string;
  description: string;
  error: string | null;
}

export interface IdePatchBatchResult {
  success: boolean;
  total: number;
  applied: number;
  failed: number;
  results: IdePatchResult[];
  error: string | null;
}

export interface IdeInsertResult {
  success: boolean;
  file_path: string;
  backup_id: string;
  inserted_at: number;
  lines_inserted: number;
  diff: string;
  description: string;
  error: string | null;
}

export interface IdeRollbackResult {
  success: boolean;
  file_path: string;
  backup_id: string;
  lines_restored: number;
  error: string | null;
}

// ── New v2 Types ──

export interface IdeCreateFileResult {
  success: boolean;
  file_path: string;
  bytes_written: number;
  created_new: boolean;
  backup_id: string;
  error: string | null;
}

export interface IdeCreateFolderResult {
  success: boolean;
  folder_path: string;
  created_new: boolean;
  error: string | null;
}

export interface IdeDeleteResult {
  success: boolean;
  target_path: string;
  was_file: boolean;
  was_directory: boolean;
  backup_id: string;
  items_deleted: number;
  error: string | null;
}

export interface IdeRenameResult {
  success: boolean;
  old_path: string;
  new_path: string;
  was_file: boolean;
  backup_id: string;
  error: string | null;
}

export interface IdeReadFileResult {
  success: boolean;
  file_path: string;
  content: string;
  total_lines: number;
  file_size_bytes: number;
  encoding: string;
  error: string | null;
}

export type IdeScriptMode = 'surgical' | 'classic' | 'auto';

export interface IdeScriptCallEvent {
  command: string;
  args: Record<string, any>;
  status: 'started' | 'completed' | 'failed';
  result?: any;
  error?: string;
  durationMs?: number;
}

// ============================================================================
// MODE MANAGEMENT
// ============================================================================

const MODE_KEY = 'ideScriptMode';
const DEFAULT_MODE: IdeScriptMode = 'auto';

export function getIdeScriptMode(): IdeScriptMode {
  return (localStorage.getItem(MODE_KEY) as IdeScriptMode) || DEFAULT_MODE;
}

export function setIdeScriptMode(mode: IdeScriptMode): void {
  localStorage.setItem(MODE_KEY, mode);
  console.log(`🧠 [IDE Script] Mode set: ${mode}`);
  window.dispatchEvent(new CustomEvent('ide-script-mode-changed', { detail: { mode } }));
}

export function isScriptModeEnabled(): boolean {
  const mode = getIdeScriptMode();
  return mode === 'surgical' || mode === 'auto';
}

// ============================================================================
// TAURI INVOKE WRAPPERS — Existing Commands
// ============================================================================

export async function ideAnalyse(filePath: string): Promise<IdeAnalyseResult> {
  return await invoke('ide_analyse', { filePath });
}

export async function ideReview(filePath: string, focus?: string): Promise<IdeReviewResult> {
  return await invoke('ide_review', { filePath, focus: focus || null });
}

export async function ideSearch(
  projectPath: string, pattern: string,
  fileFilter?: string, maxResults?: number
): Promise<IdeSearchResult> {
  return await invoke('ide_search', {
    projectPath, pattern,
    fileFilter: fileFilter || null,
    maxResults: maxResults || null,
  });
}

export async function idePatch(
  filePath: string, find: string, replace: string,
  description: string, occurrence?: number
): Promise<IdePatchResult> {
  return await invoke('ide_patch', {
    filePath, find, replace, description,
    occurrence: occurrence || null,
  });
}

export async function idePatchBatch(
  patches: { file_path: string; find: string; replace: string; description: string; occurrence?: number }[],
  atomic?: boolean
): Promise<IdePatchBatchResult> {
  return await invoke('ide_patch_batch', {
    patches, atomic: atomic ?? true,
  });
}

export async function ideInsert(
  filePath: string, anchor: string, content: string,
  description: string, position?: 'before' | 'after'
): Promise<IdeInsertResult> {
  return await invoke('ide_insert', {
    filePath, anchor, content, description,
    position: position || null,
  });
}

export async function ideRollback(backupId: string): Promise<IdeRollbackResult> {
  return await invoke('ide_rollback', { backupId });
}

export async function ideScriptStatus(): Promise<any> {
  return await invoke('ide_script_status');
}

// ============================================================================
// TAURI INVOKE WRAPPERS — New v2 Commands
// ============================================================================

export async function ideCreateFile(
  filePath: string, content: string, overwrite?: boolean
): Promise<IdeCreateFileResult> {
  return await invoke('ide_create_file', {
    filePath, content, overwrite: overwrite ?? false,
  });
}

export async function ideCreateFolder(folderPath: string): Promise<IdeCreateFolderResult> {
  return await invoke('ide_create_folder', { folderPath });
}

export async function ideDelete(
  targetPath: string, recursive?: boolean
): Promise<IdeDeleteResult> {
  return await invoke('ide_delete', {
    targetPath, recursive: recursive ?? false,
  });
}

export async function ideRename(
  oldPath: string, newPath: string
): Promise<IdeRenameResult> {
  return await invoke('ide_rename', { oldPath, newPath });
}

export async function ideReadFile(
  filePath: string, lineStart?: number, lineEnd?: number
): Promise<IdeReadFileResult> {
  return await invoke('ide_read_file', {
    filePath,
    lineStart: lineStart || null,
    lineEnd: lineEnd || null,
  });
}

// ============================================================================
// AI RESPONSE INTERCEPTOR — Detects and executes ide_script blocks
// ============================================================================

const IDE_SCRIPT_REGEX = /```ide_script\s*\n([\s\S]*?)```/g;

interface IdeScriptCall {
  command: string;
  args: Record<string, any>;
}

/**
 * Parse AI response text for ide_script code blocks.
 * Returns array of script calls found.
 */
export function parseIdeScriptCalls(aiResponse: string): IdeScriptCall[] {
  const calls: IdeScriptCall[] = [];
  let match;
  IDE_SCRIPT_REGEX.lastIndex = 0;

  while ((match = IDE_SCRIPT_REGEX.exec(aiResponse)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.command && parsed.args) {
        calls.push(parsed);
      }
    } catch (e) {
      console.warn('🧠 [IDE Script] Failed to parse script block:', e);
    }
  }
  return calls;
}

/**
 * Execute a single IDE script command.
 * Emits events for UI feedback.
 * Resolves relative paths and refreshes file explorer for FS-changing ops.
 */
export async function executeIdeScript(call: IdeScriptCall): Promise<any> {
      // BYPASS_MUTEX_READ - fast path for readFile
      if ((command === 'readFile' || command === 'ide_read_file') && args) {
        try {
          const fp = args.file_path || args.filePath || args.path || '';
          const fs = (window as any).fileSystem;
          if (fp && fs && typeof fs.readFile === 'function') {
            const txt = await fs.readFile(fp);
            return { success: true, content: txt, source: 'bypass' };
          }
        } catch (_e) {}
      }
  const startTime = Date.now();

  // Resolve relative file paths to absolute (auto-patched)
  if (call.args.file_path) {
    call.args.file_path = resolveFilePath(call.args.file_path);
  }
  if (call.args.project_path) {
    call.args.project_path = resolveFilePath(call.args.project_path);
  }
  if (call.args.folder_path) {
    call.args.folder_path = resolveFilePath(call.args.folder_path);
  }
  if (call.args.target_path) {
    call.args.target_path = resolveFilePath(call.args.target_path);
  }
  if (call.args.old_path) {
    call.args.old_path = resolveFilePath(call.args.old_path);
  }
  if (call.args.new_path) {
    call.args.new_path = resolveFilePath(call.args.new_path);
  }
  // Resolve paths in batch patches
  if (call.args.patches && Array.isArray(call.args.patches)) {
    call.args.patches = call.args.patches.map((p: any) => ({
      ...p,
      file_path: p.file_path ? resolveFilePath(p.file_path) : p.file_path,
    }));
  }

  // Emit start event
  emitScriptEvent({ command: call.command, args: call.args, status: 'started' });
  console.log(`🧠 [IDE Script] Executing: ${call.command}`, call.args);

  try {
    let result: any;
    let needsExplorerRefresh = false;

    switch (call.command) {
      // ── Existing commands ──
      case 'ide_analyse':
        result = await ideAnalyse(call.args.file_path);
        break;
      case 'ide_review':
        result = await ideReview(call.args.file_path, call.args.focus);
        break;
      case 'ide_search':
        result = await ideSearch(
          call.args.project_path, call.args.pattern,
          call.args.file_filter, call.args.max_results
        );
        break;

      // ── PATCHED: ide_patch with change tracking ──
      case 'ide_patch': {
        // Read old content before patch (for change tracking)
        let _patchOldContent = '';
        try {
          const _readBefore = await ideReadFile(call.args.file_path);
          _patchOldContent = _readBefore.content || '';
        } catch { /* file might not exist yet */ }

        result = await idePatch(
          call.args.file_path, call.args.find, call.args.replace,
          call.args.description, call.args.occurrence
        );

        // Record change for summary panel
        if (result.success) {
          try {
            const _readAfter = await ideReadFile(call.args.file_path);
            recordFileChange({
              filePath: call.args.file_path,
              oldContent: _patchOldContent,
              newContent: _readAfter.content || '',
            });
          } catch (e) { console.warn('[ChangeSummary] Patch record failed:', e); }
        }
        break;
      }

      case 'ide_patch_batch':
        result = await idePatchBatch(call.args.patches, call.args.atomic);
        break;

      // ── PATCHED: ide_insert with change tracking ──
      case 'ide_insert': {
        // Read old content before insert (for change tracking)
        let _insertOldContent = '';
        try {
          const _readBefore = await ideReadFile(call.args.file_path);
          _insertOldContent = _readBefore.content || '';
        } catch { /* file might not exist yet */ }

        result = await ideInsert(
          call.args.file_path, call.args.anchor, call.args.content,
          call.args.description, call.args.position
        );

        // Record change for summary panel
        if (result.success) {
          try {
            const _readAfter = await ideReadFile(call.args.file_path);
            recordFileChange({
              filePath: call.args.file_path,
              oldContent: _insertOldContent,
              newContent: _readAfter.content || '',
            });
          } catch (e) { console.warn('[ChangeSummary] Insert record failed:', e); }
        }
        break;
      }

      case 'ide_rollback':
        result = await ideRollback(call.args.backup_id);
        break;
      case 'ide_script_status':
        result = await ideScriptStatus();
        break;

      // ── PATCHED: ide_create_file with change tracking ──
      case 'ide_create_file': {
        // Read old content before write (for change tracking — empty if new file)
        let _createOldContent = '';
        try {
          const _readBefore = await ideReadFile(call.args.file_path);
          _createOldContent = _readBefore.content || '';
        } catch { /* new file — no old content */ }

        result = await ideCreateFile(
          call.args.file_path, call.args.content,
          call.args.overwrite
        );
        needsExplorerRefresh = result.success;

        // Record change for summary panel
        if (result.success) {
          try {
            recordFileChange({
              filePath: call.args.file_path,
              oldContent: _createOldContent,
              newContent: call.args.content,
            });
          } catch (e) { console.warn('[ChangeSummary] Create record failed:', e); }
        }

        // Open the new file in editor
        if (result.success && result.created_new) {
          try {
            if ((window as any).openFileInTab) {
              (window as any).openFileInTab(call.args.file_path);
              console.log(`📂 [IDE Script] Opened new file in tab: ${call.args.file_path}`);
            }
          } catch (e) { /* ignore tab open errors */ }
        }

        break;
      }

      case 'ide_create_folder':
        result = await ideCreateFolder(call.args.folder_path);
        needsExplorerRefresh = result.success;
        break;

      // ── PATCHED: ide_delete with change tracking ──
      case 'ide_delete': {
        // Read old content before delete (for change tracking)
        let _deleteOldContent = '';
        try {
          const _readBefore = await ideReadFile(call.args.target_path);
          _deleteOldContent = _readBefore.content || '';
        } catch { /* might be a folder or already gone */ }

        result = await ideDelete(
          call.args.target_path, call.args.recursive
        );
        needsExplorerRefresh = result.success;

        // Record change for summary panel (only for files, not folders)
        if (result.success && result.was_file && _deleteOldContent) {
          try {
            recordFileChange({
              filePath: call.args.target_path,
              oldContent: _deleteOldContent,
              newContent: '',
            });
          } catch (e) { console.warn('[ChangeSummary] Delete record failed:', e); }
        }

        // Close tab if deleted file was open
        if (result.success && result.was_file) {
          try {
            if ((window as any).tabManager?.closeTab) {
              // Find and close tab for deleted file
              const tabs = (window as any).tabManager?.tabs || [];
              for (const tab of tabs) {
                if (tab.path === call.args.target_path) {
                  (window as any).tabManager.closeTab(tab.id);
                  console.log(`📂 [IDE Script] Closed tab for deleted file`);
                  break;
                }
              }
            }
          } catch (e) { /* ignore tab close errors */ }
        }
        break;
      }

      case 'ide_rename':
        result = await ideRename(call.args.old_path, call.args.new_path);
        needsExplorerRefresh = result.success;
        // Update tab if renamed file was open
        if (result.success && result.was_file) {
          try {
            if ((window as any).openFileInTab) {
              (window as any).openFileInTab(call.args.new_path);
              console.log(`📂 [IDE Script] Opened renamed file: ${call.args.new_path}`);
            }
          } catch (e) { /* ignore */ }
        }
        break;

      case 'ide_read_file':
        result = await ideReadFile(
          call.args.file_path, call.args.line_start, call.args.line_end
        );
        break;

      default:
        throw new Error(`Unknown IDE script command: ${call.command}`);
    }

    // Refresh file explorer for file system changes
    if (needsExplorerRefresh) {
      setTimeout(() => refreshFileExplorer(), 200);
    }

    const duration = Date.now() - startTime;
    emitScriptEvent({ command: call.command, args: call.args, status: 'completed', result, durationMs: duration });
    console.log(`✅ [IDE Script] ${call.command} completed in ${duration}ms`);
    return result;

  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errMsg = error?.message || error?.toString() || 'Unknown error';
    emitScriptEvent({ command: call.command, args: call.args, status: 'failed', error: errMsg, durationMs: duration });
    console.error(`❌ [IDE Script] ${call.command} failed:`, errMsg);
    throw error;
  }
}

/**
 * Process an AI response: detect script blocks, execute them, return results.
 * Called automatically by the AI chat handler when script mode is enabled.
 */
export async function processAiScriptResponse(aiResponse: string): Promise<{
  hasScripts: boolean;
  results: { command: string; result: any; error?: string }[];
  cleanResponse: string;
}> {
  const calls = parseIdeScriptCalls(aiResponse);
  
  if (calls.length === 0) {
    return { hasScripts: false, results: [], cleanResponse: aiResponse };
  }

  console.log(`🧠 [IDE Script] Found ${calls.length} script call(s) in AI response`);

  // Show progress dialog for IDE Script execution
  const _showDialog = (window as any).showStatusDialog;
  const _updateText = (window as any).updateStatusText;
  const _updateProg = (window as any).updateProgress;
  const _addLog = (window as any).addStatusLog;
  const _closeDialog = (window as any).closeStatusDialog;
  if (_showDialog) {
    _showDialog();
    _updateText('Executing ' + calls.length + ' IDE command(s)...');
    _updateProg(5);
    _addLog('IDE Script started: ' + calls.length + ' command(s)', 'info');
  }

  const results: { command: string; result: any; error?: string }[] = [];
  
  for (const call of calls) {
    try {
      // Update progress dialog per command
      if (_updateText) {
        const cmdIdx = calls.indexOf(call);
        const pct = Math.round(((cmdIdx + 1) / calls.length) * 80) + 10;
        _updateText('Executing: ' + call.command + '...');
        _updateProg(pct);
        const fileName = call.args?.file_path?.split(/[/\\\\]/).pop() || '';
        _addLog('[' + (cmdIdx+1) + '/' + calls.length + '] ' + call.command + (fileName ? ': ' + fileName : ''), 'info');
      }
      const result = await executeIdeScript(call);
      results.push({ command: call.command, result });
      if (_addLog) { _addLog(call.command + ' completed', 'success'); }
    } catch (error: any) {
      results.push({ command: call.command, result: null, error: error?.message || 'Failed' });
      if (_addLog) { _addLog(call.command + ' failed: ' + (error?.message || 'Unknown'), 'error'); }
    }
  }


  // Close progress dialog after all commands complete
  if (_updateText) {
    const errCount = results.filter(r => r.error).length;
    const okCount = results.length - errCount;
    _updateProg(100);
    if (errCount === 0) {
      _updateText(okCount + ' command(s) completed');
      _addLog('All commands completed successfully', 'success');
    } else {
      _updateText(okCount + ' OK, ' + errCount + ' failed');
      _addLog(errCount + ' command(s) failed', 'error');
    }
    setTimeout(() => { if (_closeDialog) _closeDialog(); }, 2500);
  }

  // Remove the script blocks from the display text
  const cleanResponse = aiResponse.replace(IDE_SCRIPT_REGEX, '').trim();

  return { hasScripts: true, results, cleanResponse };
}

// ============================================================================
// EVENT SYSTEM — For UI activity indicators
// ============================================================================

function emitScriptEvent(event: IdeScriptCallEvent): void {
  window.dispatchEvent(new CustomEvent('ide-script-activity', { detail: event }));
}

// ============================================================================
// SYSTEM PROMPT — Injected when script mode is active
// ============================================================================

export function getIdeScriptSystemPrompt(projectPath?: string): string {
  const mode = getIdeScriptMode();
  if (mode === 'classic') return '';

  const projCtx = projectPath ? `\nCurrent project: ${projectPath}` : '';

  return `
[🧠 OPERATOR X02 CODE IDE — Script Mode (${mode})]
${projCtx}

You have access to IDE Script commands for precise code editing and file management. Use these commands to search, analyse, patch, create, and manage files.

━━━ AVAILABLE COMMANDS ━━━

To use a command, output a fenced code block with the language tag \`ide_script\`:

1. ANALYSE a file:
\`\`\`ide_script
{ "command": "ide_analyse", "args": { "file_path": "src/components/App.tsx" } }
\`\`\`

2. REVIEW code quality:
\`\`\`ide_script
{ "command": "ide_review", "args": { "file_path": "src/utils/api.ts", "focus": "error_handling" } }
\`\`\`

3. SEARCH across project:
\`\`\`ide_script
{ "command": "ide_search", "args": { "project_path": "${projectPath || 'PROJECT_ROOT'}", "pattern": "handleSubmit", "file_filter": "*.ts", "max_results": 20 } }
\`\`\`

4. PATCH code (find & replace with auto-backup):
\`\`\`ide_script
{ "command": "ide_patch", "args": { "file_path": "src/App.tsx", "find": "const x = old;", "replace": "const x = fixed;", "description": "Fix variable initialization" } }
\`\`\`

5. BATCH PATCH (multi-file atomic):
\`\`\`ide_script
{ "command": "ide_patch_batch", "args": { "patches": [ { "file_path": "src/a.ts", "find": "old", "replace": "new", "description": "fix a" }, { "file_path": "src/b.ts", "find": "old", "replace": "new", "description": "fix b" } ], "atomic": true } }
\`\`\`

6. INSERT code after/before an anchor line:
\`\`\`ide_script
{ "command": "ide_insert", "args": { "file_path": "src/App.tsx", "anchor": "import React from", "content": "import { useState } from 'react';", "position": "after", "description": "Add useState import" } }
\`\`\`

7. ROLLBACK a change:
\`\`\`ide_script
{ "command": "ide_rollback", "args": { "backup_id": "ids_1234567890" } }
\`\`\`

8. READ a file (full content or line range):
\`\`\`ide_script
{ "command": "ide_read_file", "args": { "file_path": "src/App.tsx" } }
\`\`\`
Read specific lines:
\`\`\`ide_script
{ "command": "ide_read_file", "args": { "file_path": "src/App.tsx", "line_start": 10, "line_end": 50 } }
\`\`\`

9. CREATE a new file:
\`\`\`ide_script
{ "command": "ide_create_file", "args": { "file_path": "src/utils/helpers.ts", "content": "export function capitalize(s: string) {\\n  return s.charAt(0).toUpperCase() + s.slice(1);\\n}\\n" } }
\`\`\`
Overwrite existing:
\`\`\`ide_script
{ "command": "ide_create_file", "args": { "file_path": "src/config.ts", "content": "...", "overwrite": true } }
\`\`\`

10. CREATE a folder:
\`\`\`ide_script
{ "command": "ide_create_folder", "args": { "folder_path": "src/components/ui" } }
\`\`\`

11. DELETE a file or folder:
\`\`\`ide_script
{ "command": "ide_delete", "args": { "target_path": "src/old-utils.ts" } }
\`\`\`
Delete non-empty folder:
\`\`\`ide_script
{ "command": "ide_delete", "args": { "target_path": "src/deprecated/", "recursive": true } }
\`\`\`

12. RENAME or MOVE a file/folder:
\`\`\`ide_script
{ "command": "ide_rename", "args": { "old_path": "src/utils.ts", "new_path": "src/helpers/utils.ts" } }
\`\`\`

━━━ RULES ━━━
• If file content is NOT already in the conversation context, include BOTH ide_read_file AND ide_patch in the SAME response. Never stop after just reading a file � always follow through with the modification in the same response. The project context above usually already contains the file content, so prefer using ide_patch directly
• The "find" text in ide_patch must EXACTLY match the source (whitespace matters)
• Every patch/create/delete creates an automatic backup — user can always rollback
• Use ide_create_file for new files — the file opens automatically in the editor
• Use ide_create_folder before ide_create_file if the parent directory doesn't exist
• Use ide_delete carefully — backups are created for files, but NOT for folders
• Use ide_rename to move files — parent directories are created automatically
• Use ide_patch_batch with atomic:true for multi-file changes
• Keep patches minimal — change only what's needed
• After any changes, explain what you did and why
• File paths can be relative to the project root or absolute
`;
}

// ============================================================================
// INIT — Wire everything up
// ============================================================================

export function initIdeScriptBridge(): void {
  // Expose to window for console access and other modules
  (window as any).ideScript = {
    // Existing commands
    analyse: ideAnalyse,
    review: ideReview,
    search: ideSearch,
    patch: idePatch,
    patchBatch: idePatchBatch,
    insert: ideInsert,
    rollback: ideRollback,
    status: ideScriptStatus,
    // New v2 commands
    createFile: ideCreateFile,
    createFolder: ideCreateFolder,
    delete: ideDelete,
    rename: ideRename,
    readFile: ideReadFile,
    // Mode management
    getMode: getIdeScriptMode,
    setMode: setIdeScriptMode,
    isEnabled: isScriptModeEnabled,
    // Processing
    processResponse: processAiScriptResponse,
    getPrompt: getIdeScriptSystemPrompt,
  };

  console.log(`🧠 [IDE Script Bridge v2] Initialized (mode: ${getIdeScriptMode()})`);
  console.log('🧠 [IDE Script Bridge v2] Commands: analyse, review, search, patch, insert, rollback, createFile, createFolder, delete, rename, readFile');
}

// ============================================================================
// AI MODE AWARENESS PROMPT — Appended to system prompt so AI knows about modes
// ============================================================================

export function getIdeScriptAwarePrompt(): string {
  const mode = getIdeScriptMode();
  const projectPath = (window as any).currentProjectPath || '';
  const scriptPrompt = (mode !== 'classic') ? getIdeScriptSystemPrompt(projectPath) : '';

  const modeAwareness = `

[IDE EDIT MODE AWARENESS]
Current mode: ${mode}

You are operating inside Operator X02 Code IDE which has two editing modes:

AUTO MODE (recommended for most tasks):
- You can read, create, edit, rename, delete files directly via ide_script commands
- Surgical patches — only changes the specific lines needed
- Automatic backups per operation with rollback support
- Multi-file atomic batch edits
- Best for: bug fixes, refactoring, code review, file management, creating new files

CLASSIC MODE:
- You return full file code blocks, IDE auto-applies them via Surgical Edit Engine
- Replaces entire file content (8-stage pipeline with safety guard)
- Risk of destroying code if your response is truncated
- Best for: when user wants to review the complete file before applying

MODE SUGGESTIONS (suggest ONCE per conversation, do not repeat):
- If current mode is "classic" and user asks to edit, fix, or patch code: suggest "Tip: Switch to Auto mode for safer, surgical edits that only change the lines needed."
- If current mode is "classic" and user asks to create a new file: suggest "Tip: Auto mode can create files directly on disk without copy-pasting."
- If current mode is "classic" and user asks to rename, delete, or move files: suggest "Tip: Auto mode can manage files directly — rename, delete, move."
- If current mode is "auto", use ide_script commands for all file operations. Do NOT return full file code blocks.
- If current mode is "classic", return full file code blocks as normal.
`;

  if (mode === 'classic') {
    return '\n\n' + modeAwareness;
  }

  // Auto/surgical: include commands + awareness
  return '\n\n' + modeAwareness + (scriptPrompt ? '\n\n' + scriptPrompt : '');
}
