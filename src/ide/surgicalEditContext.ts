// src/ide/surgicalEditContext.ts
// ============================================================================
// SURGICAL EDIT & BACKUP CONTEXT PROVIDER for AI Assistant
// ============================================================================
// Makes the AI aware of:
//   - Surgical Edit Engine capabilities, features, benefits, limitations
//   - How to use surgical edits and the backup manager
//   - Recent surgical edits performed this session
//   - Available backups (count, files, sizes) - live data
//   - Ability to suggest restores, diffs, and cleanups
//
// Integration: Called from assistantUI.ts in the message pipeline
//   import { enhanceWithSurgicalContext, getSurgicalSystemPrompt } from './surgicalEditContext';
//
// Pattern: Same as Git context, Terminal context, Editor context
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPES
// ============================================================================

interface SurgicalEditRecord {
  file: string;
  line: number;
  description: string;
  timestamp: number;
}

interface BackupStats {
  total_backups: number;
  total_size_bytes: number;
  total_size_display: string;
  files_with_backups: number;
  per_file: Array<{
    original_file: string;
    count: number;
    total_size_display: string;
  }>;
}

interface BackupInfo {
  path: string;
  name: string;
  original_file: string;
  size_display: string;
  created_display: string;
}

// ============================================================================
// KNOWLEDGE BASE - Comprehensive info the AI can draw from
// ============================================================================

const SURGICAL_KNOWLEDGE_BASE = `
=== OPERATOR X02 - SURGICAL EDIT ENGINE ===

WHAT IS IT:
The Surgical Edit Engine is a precision code editing system built into Operator X02 IDE.
Instead of rewriting entire files, it performs targeted, line-level edits - like a surgeon
operating on specific lines of code rather than replacing the whole file.

It uses an 8-stage pipeline: Recon -> Search -> Find Block -> Diff Preview -> Edit ->
Verify -> Backup -> Report. Each stage validates before proceeding to the next.

HOW IT WORKS (8-STAGE PIPELINE):
1. RECON - Reads the target file, gets line count, size, and structure
2. SEARCH - Finds specific patterns, functions, or code blocks using regex
3. FIND BLOCK - Locates exact block boundaries (start/end lines) for the target code
4. DIFF PREVIEW - Shows a preview of what will change before applying
5. EDIT - Applies the actual line-level edit (replace, insert, or delete)
6. VERIFY - Re-reads the file to confirm the edit was applied correctly
7. BACKUP - Creates a .bak snapshot of the original file (before the edit)
8. REPORT - Logs the result with success/failure status and details

EDIT OPERATIONS:
- Replace Line: Replace content of a specific line number
- Insert Lines: Add new lines at a specific position
- Delete Lines: Remove lines from the file
- Batch Edit: Multiple edits in one operation (all-or-nothing with auto-rollback)
- Block Replace: Replace an entire code block identified by start/end markers

KEY FEATURES:
- Line-level precision: Only touches the exact lines that need changing
- Automatic backups: Every edit creates a .bak file before modifying
- Auto-rollback: If a batch edit fails partway, it rolls back to the backup
- Diff preview: See exactly what will change before committing
- Verification: After edit, re-reads the file to confirm changes applied
- Language-aware: Detects file type for proper handling
- Pattern search: Find code by regex pattern, not just line numbers
- Block detection: Automatically finds function/class boundaries

BACKUP SYSTEM:
- Location: ~/OperatorX02/backups/surgical_edits/
- Format: {filename}_{unix_timestamp_ms}.bak (e.g., main.ts_1738123456789.bak)
- Created automatically before every edit operation
- One backup per batch (not per individual edit in a batch)
- Backups are full file snapshots - the complete original file content

BACKUP MANAGER FEATURES:
- List all backups with metadata (size, age, original file)
- Preview backup contents (first N lines with syntax highlighting)
- Diff comparison: Compare backup vs current file (shows added/removed/changed lines)
- One-click restore: Restore any file from any backup
- Delete individual backups or batch delete
- Policy-based cleanup: Auto-delete by age, count per file, or total size
- Auto-cleanup on IDE startup (configurable in settings)
- Export backups to any directory
- Statistics dashboard: Total count, size, per-file breakdown
- Status bar indicator: Shows backup count, click to open manager

HOW TO USE - BASIC:
- Surgical edits happen automatically when the AI modifies code through the IDE
- The status bar shows "Surgical X edits" with the count
- Click the status bar indicator or run bm.showUI() to open Backup Manager
- To restore: open Backup Manager > select backup > click Restore
- To preview: open Backup Manager > click the eye icon on any backup
- Toggle surgical mode: click the "Surgical" status bar widget or window.sb.toggle()

HOW TO USE - CONSOLE COMMANDS:
Surgical Edit Engine:
  se.recon(path)                  - Analyze a file (line count, size)
  se.search(path, pattern)        - Search for pattern in file
  se.replaceLine(path, line, new) - Replace a specific line
  window.sb.toggle()              - Enable/disable surgical mode
  window.sb.getState()            - Check current state

Backup Manager:
  bm.showUI()                     - Open the Backup Manager panel
  bm.list()                       - List all backups
  bm.listFor("main.ts")           - List backups for specific file
  bm.stats()                      - Get backup statistics
  bm.preview(backupPath)          - Preview backup contents
  bm.diff(backupPath, filePath)   - Compare backup vs current file
  bm.restore(filePath, backupPath) - Restore a file from backup
  bm.delete(backupPath)           - Delete a single backup
  bm.deleteBatch([paths])         - Delete multiple backups
  bm.deleteAllFor("main.ts")      - Delete all backups for a file
  bm.cleanOld(7)                  - Delete backups older than 7 days
  bm.keepLatest(5)                - Keep only newest 5 per file
  bm.cleanup({maxAgeDays:7, maxPerFile:10, maxTotalSizeMB:100})
  bm.export(backupPath, dir)      - Export backup to directory
  bm.dir()                        - Show backup directory path
  bm.settings()                   - View auto-cleanup settings

BENEFITS:
1. Safety: Every edit is backed up. You can always go back to any previous version.
2. Precision: Only the targeted lines change, reducing risk of unintended side effects.
3. Verification: The engine confirms edits applied correctly before reporting success.
4. Audit trail: Full history of what changed, when, and in which file.
5. Space efficient: Backups are only created when edits actually happen.
6. Auto-cleanup: Configurable policies prevent backup folder from growing forever.
7. Fast: Direct line operations are faster than full-file rewrites.
8. AI-integrated: The AI assistant knows about backups and can suggest restores.
9. Batch safety: Multi-edit operations are atomic - all succeed or all roll back.
10. Non-destructive: Original files are always preserved as .bak before modification.

LIMITATIONS:
1. Line-based: Edits reference line numbers, which shift after insertions/deletions.
   The engine handles this within a batch, but sequential separate edits need fresh recon.
2. Text files only: Binary files (images, executables) cannot be surgically edited.
3. Single-file scope: Each edit operation targets one file. Cross-file refactoring
   requires multiple separate edit operations.
4. No merge: Backups are full snapshots. There is no "merge changes from backup"
   - restore replaces the entire current file with the backup content.
5. Disk space: Backups accumulate over time. Use cleanup policies to manage.
6. No real-time sync: If a file is modified outside the IDE while a backup exists,
   the backup still reflects the state before the surgical edit, not the external change.
7. Backup naming: Filenames are extracted from the .bak name pattern. Renaming
   backup files manually will break the metadata extraction.
8. No incremental: Each backup is a full copy, not a delta/patch. Large files
   create proportionally large backups.

CLEANUP POLICIES:
- Age-based: Delete backups older than N days (default: 7)
- Count-based: Keep only the newest N backups per file (default: 10)
- Size-based: Enforce total size limit, delete oldest first (default: 100 MB)
- Can combine all three policies in one cleanup run
- Auto-cleanup runs on IDE startup when enabled in settings

ARCHITECTURE:
Frontend (TypeScript):
  surgicalEditEngine.ts    - TS wrapper for Rust commands
  surgicalEditBridge.ts    - Orchestrates the 8-stage pipeline
  surgicalEditUI.ts        - Status bar widget + visual feedback
  surgicalBackupManager.ts - Backup manager UI + bridge
  surgicalEditContext.ts   - AI awareness (this module)

Backend (Rust/Tauri):
  surgical_edit_commands.rs   - Core engine (recon, search, edit, verify, rollback)
  surgical_backup_commands.rs - Backup management (list, delete, cleanup, diff, export)

Storage:
  ~/OperatorX02/backups/surgical_edits/  - All .bak files

=== END KNOWLEDGE BASE ===
`;

// ============================================================================
// SESSION TRACKING - Records edits made this session
// ============================================================================

const _sessionEdits: SurgicalEditRecord[] = [];
let _surgicalContextEnabled = true;

/**
 * Record a surgical edit (called by surgicalEditBridge after each edit)
 */
export function recordSurgicalEditForAI(file: string, line: number, description: string): void {
  _sessionEdits.push({
    file,
    line,
    description,
    timestamp: Date.now(),
  });

  // Keep last 50 edits in memory
  if (_sessionEdits.length > 50) {
    _sessionEdits.splice(0, _sessionEdits.length - 50);
  }
}

/**
 * Get edits made this session
 */
export function getSessionEdits(): SurgicalEditRecord[] {
  return [..._sessionEdits];
}

/**
 * Toggle surgical context injection
 */
export function setSurgicalContextEnabled(enabled: boolean): void {
  _surgicalContextEnabled = enabled;
  console.log(`[SurgicalContext] ${enabled ? 'Enabled' : 'Disabled'}`);
}

export function isSurgicalContextEnabled(): boolean {
  return _surgicalContextEnabled;
}

// ============================================================================
// KEYWORD DETECTION - When to inject which level of context
// ============================================================================

// Level 1: Full backup context with live data (backup operations)
const BACKUP_KEYWORDS = /\b(backup|backups|restore|rollback|undo|revert|\.bak|previous version|original version|before edit|before change|undo change|recover|recovery|diff|compare versions|old version|edit history|what changed|what was changed|what did you change|cleanup|clean up backups)\b/i;

// Level 2: Knowledge base questions (explaining features)
const EXPLAIN_KEYWORDS = /\b(what is surgical|how does surgical|surgical edit engine|surgical edit|explain surgical|surgical feature|surgical benefit|surgical limitation|backup manager|backup system|how backup|how restore|how to undo|how to rollback|how to revert|what can surgical|capabilities|tell me about surgical|tell me about backup|how does the edit engine|how does backup work|bm\.showUI|se\.recon|what is the backup|what are backups|show me how|pipeline|8.stage|eight stage|stage pipeline)\b/i;

// Level 3: Light awareness during file edits
const FILE_EDIT_KEYWORDS = /\b(edit|modify|change|update|fix|patch|replace|insert|delete line|remove line|add line|refactor)\b/i;

export function isSurgicalRelated(message: string): boolean {
  return BACKUP_KEYWORDS.test(message);
}

export function isExplainRelated(message: string): boolean {
  return EXPLAIN_KEYWORDS.test(message);
}

export function isFileEditRelated(message: string): boolean {
  return FILE_EDIT_KEYWORDS.test(message);
}

// ============================================================================
// CONTEXT BUILDING - Assemble context based on what the user is asking
// ============================================================================

/**
 * Build full backup context with live data from Rust backend
 */
async function buildBackupContext(message: string): Promise<string> {
  let context = '';

  try {
    const stats: BackupStats = await invoke('surgical_backup_stats');

    context += '\n\n[SURGICAL EDIT ENGINE - Live Backup Status]\n';
    context += `Backup location: ~/OperatorX02/backups/surgical_edits/\n`;
    context += `Total backups: ${stats.total_backups} (${stats.total_size_display})\n`;
    context += `Files with backups: ${stats.files_with_backups}\n`;

    // Per-file breakdown
    if (stats.per_file.length > 0) {
      context += '\nBackup inventory:\n';
      const top = stats.per_file.slice(0, 10);
      for (const f of top) {
        context += `  ${f.original_file}: ${f.count} backup(s) (${f.total_size_display})\n`;
      }
      if (stats.per_file.length > 10) {
        context += `  ... and ${stats.per_file.length - 10} more files\n`;
      }
    }

    // Fetch recent backups list for restore-related queries
    if (BACKUP_KEYWORDS.test(message)) {
      try {
        const backups: BackupInfo[] = await invoke('surgical_backup_list_all');
        const recent = backups.slice(0, 8);
        if (recent.length > 0) {
          context += '\nRecent backups (newest first):\n';
          for (const b of recent) {
            context += `  ${b.original_file} - ${b.created_display} (${b.size_display})\n`;
            context += `    Path: ${b.path}\n`;
          }
        }
      } catch (e) {
        // Stats was enough
      }
    }

    // Session edits
    if (_sessionEdits.length > 0) {
      const recent = _sessionEdits.slice(-10);
      context += `\nEdits made this session (${_sessionEdits.length} total):\n`;
      for (const edit of recent) {
        const ago = _relativeTime(edit.timestamp);
        context += `  ${edit.file}:${edit.line} - ${edit.description} (${ago})\n`;
      }
    }

    context += '\nAvailable backup commands (user runs in DevTools console):\n';
    context += '  bm.showUI()              - Open Backup Manager panel\n';
    context += '  bm.list()                - List all backups\n';
    context += '  bm.preview(path)         - Preview backup contents\n';
    context += '  bm.diff(backup, current) - Compare backup vs current file\n';
    context += '  bm.restore(file, backup) - Restore a file from backup\n';
    context += '  bm.cleanOld(7)           - Delete backups older than 7 days\n';
    context += '  bm.keepLatest(5)         - Keep only newest 5 per file\n';
    context += '[END LIVE BACKUP STATUS]\n';

  } catch (e) {
    context += '\n\n[SURGICAL EDIT ENGINE]\n';
    context += 'Backup manager available: bm.showUI() in DevTools console.\n';
    if (_sessionEdits.length > 0) {
      context += `Session edits: ${_sessionEdits.length} edit(s) made.\n`;
    }
    context += '[END]\n';
  }

  return context;
}

/**
 * Build knowledge-base context for explaining features
 */
function buildExplainContext(): string {
  return '\n\n' + SURGICAL_KNOWLEDGE_BASE + '\n';
}

/**
 * Build lightweight edit-awareness context
 */
function buildEditAwarenessContext(): string {
  let context = '\n\n[NOTE: The Surgical Edit Engine is active. ';
  context += 'All file edits automatically create .bak backups in ~/OperatorX02/backups/surgical_edits/. ';

  if (_sessionEdits.length > 0) {
    const lastEdit = _sessionEdits[_sessionEdits.length - 1];
    context += `Last edit: ${lastEdit.file}:${lastEdit.line} (${_relativeTime(lastEdit.timestamp)}). `;
    context += `Total this session: ${_sessionEdits.length}. `;
  }

  context += 'If the user needs to undo, suggest: bm.showUI() or bm.restore(file, backupPath).]\n';
  return context;
}

// ============================================================================
// PUBLIC API - Called from assistantUI.ts
// ============================================================================

/**
 * Enhance a user message with surgical edit/backup context.
 * Determines the appropriate level of context based on what the user is asking.
 *
 * Usage in assistantUI.ts:
 *   message = await enhanceWithSurgicalContext(message);
 */
export async function enhanceWithSurgicalContext(message: string): Promise<string> {
  if (!_surgicalContextEnabled) return message;

  try {
    // Level 2: Explaining features - inject full knowledge base
    // Check this FIRST because explain questions may also match backup keywords
    if (isExplainRelated(message)) {
      const kb = buildExplainContext();
      // Also add live data if asking about backups specifically
      let liveData = '';
      if (isSurgicalRelated(message)) {
        liveData = await buildBackupContext(message);
      }
      console.log('[SurgicalContext] Injected knowledge base + explain context');
      return message + kb + liveData;
    }

    // Level 1: Backup operations - inject live data
    if (isSurgicalRelated(message)) {
      const context = await buildBackupContext(message);
      console.log('[SurgicalContext] Injected live backup context (' + context.length + ' chars)');
      return message + context;
    }

    // Level 3: Light awareness during file edits
    if (isFileEditRelated(message) && _sessionEdits.length > 0) {
      const context = buildEditAwarenessContext();
      console.log('[SurgicalContext] Injected edit awareness (' + context.length + ' chars)');
      return message + context;
    }
  } catch (e) {
    console.warn('[SurgicalContext] Error:', e);
  }

  return message;
}

/**
 * Get surgical edit awareness text for the system prompt.
 * This is always included so the AI has baseline knowledge.
 *
 * Usage in assistantUI.ts:
 *   prompt += getSurgicalSystemPrompt();
 */
export function getSurgicalSystemPrompt(): string {
  return [
    '\n\nYou are integrated with the Operator X02 Surgical Edit Engine. Key facts: ',
    '(1) The Surgical Edit Engine performs precise, line-level code edits through an 8-stage pipeline ',
    '(Recon, Search, Find Block, Diff Preview, Edit, Verify, Backup, Report). ',
    '(2) Every edit automatically creates a .bak backup in ~/OperatorX02/backups/surgical_edits/. ',
    '(3) Users can restore any previous version via the Backup Manager (bm.showUI() in DevTools console). ',
    '(4) When suggesting code changes, you can be confident that the user can always roll back. ',
    '(5) If the user asks about undoing changes, restoring files, or viewing edit history, ',
    'guide them to the Backup Manager or the bm.* console commands. ',
    '(6) When making edits, mention that a backup was automatically created for safety. ',
    '(7) If the user asks how the surgical edit engine works, its features, benefits, or limitations, ',
    'explain comprehensively based on your knowledge of the system. ',
    '(8) Available commands: se.recon(path), se.search(path, pattern), bm.showUI(), bm.list(), ',
    'bm.restore(file, backup), bm.diff(backup, current), bm.stats(), bm.cleanOld(days). ',
    '(9) The Surgical Edit status bar widget shows "Surgical N edits" at the bottom of the IDE. ',
    'Click it to toggle surgical mode. The Backup indicator next to it shows backup count. ',
    '(10) Cleanup policies: bm.cleanOld(7) deletes >7 days, bm.keepLatest(5) keeps newest 5/file, ',
    'bm.cleanup({maxAgeDays, maxPerFile, maxTotalSizeMB}) combines policies. ',
  ].join('');
}

// ============================================================================
// HELPERS
// ============================================================================

function _relativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

// ============================================================================
// INITIALIZATION - Register globally for bridge access
// ============================================================================

export function initSurgicalEditContext(): void {
  // Expose to window for surgicalEditBridge and other modules to call
  (window as any).surgicalEditContext = {
    record: recordSurgicalEditForAI,
    getEdits: getSessionEdits,
    enhance: enhanceWithSurgicalContext,
    systemPrompt: getSurgicalSystemPrompt,
    setEnabled: setSurgicalContextEnabled,
    isEnabled: isSurgicalContextEnabled,
    knowledgeBase: () => SURGICAL_KNOWLEDGE_BASE,
  };

  // Shorthand
  (window as any).seContext = (window as any).surgicalEditContext;

  console.log('[SurgicalContext] AI awareness initialized');
  console.log('   Explain: "what is surgical edit", "how does backup work", "features", "limitations"');
  console.log('   Backup:  "restore", "undo", "rollback", "backup", "what changed"');
  console.log('   Debug:   seContext.getEdits(), seContext.knowledgeBase()');
}
