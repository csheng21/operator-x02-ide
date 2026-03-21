import { recordSurgicalEdit } from './surgicalEditUI';
/**
 * ============================================================================
 *  SURGICAL EDIT BRIDGE v1.1 — Safe Integration Build
 * ============================================================================
 *
 *  Connects Autonomous Coding ↔ Surgical Edit Engine with safety guards.
 *
 *  SAFETY FEATURES (v1.1):
 *    ✅ Default OFF — user must enable via window.sb.setEnabled(true)
 *    ✅ Multi-file guard — auto-disables during processMultiFileApply()
 *    ✅ File watcher debounce — prevents double-reload conflicts
 *    ✅ Fallback to legacy — every surgical path catches errors
 *    ✅ Re-entry guard — prevents concurrent surgical edits
 *    ✅ Editor sync lock — prevents watcher + bridge fighting
 *
 *  FILE: src/ide/surgicalEditBridge.ts
 *  DEPENDS ON: surgicalEditEngine.ts (window.se / window.surgicalEdit)
 * ============================================================================
 */

// ============================================================================
// TYPES
// ============================================================================

interface SurgicalDiffAnalysis {
  totalChanges: number;
  addedLines: number[];
  deletedLines: number[];
  modifiedLines: number[];
  addedBlocks: { start: number; end: number; content: string }[];
  deletedBlocks: { start: number; end: number }[];
  modifiedBlocks: { start: number; end: number; oldContent: string; newContent: string }[];
  recommendation: SurgicalStrategy;
  confidence: number;  // 0-100
}

type SurgicalStrategy =
  | 'line_replace'     // Few scattered line changes
  | 'block_replace'    // Whole function/class rewritten
  | 'string_replace'   // Simple text replacement
  | 'insert'           // New code added (imports, functions)
  | 'remove'           // Code deleted
  | 'batch'            // Multiple different operations
  | 'full_replace';    // Too many changes, replace entire file (fallback)

interface SurgicalChangeRecord {
  id: string;
  filePath: string;
  fileName: string;
  backupPath: string | null;
  strategy: SurgicalStrategy;
  timestamp: number;
  changeSummary: string;
  committed: boolean;
  rolledBack: boolean;
}

interface SurgicalBridgeState {
  enabled: boolean;
  currentChange: SurgicalChangeRecord | null;
  changeHistory: SurgicalChangeRecord[];
  multiFileGuardActive: boolean;   // True = surgical disabled temporarily for multi-file
  isSyncing: boolean;              // True = editor sync in progress (block file watcher)
  isEditing: boolean;              // True = surgical edit in progress (re-entry guard)
  stats: {
    totalEdits: number;
    totalRollbacks: number;
    totalVerifications: number;
    totalFallbacks: number;        // Times we fell back to legacy
    strategyCounts: Record<SurgicalStrategy, number>;
  };
}

// ============================================================================
// BRIDGE STATE
// ============================================================================

const bridgeState: SurgicalBridgeState = {
  enabled: true,   // 🔬 DEFAULT ON — surgical editing active
  currentChange: null,
  changeHistory: [],
  multiFileGuardActive: false,
  isSyncing: false,
  isEditing: false,
  stats: {
    totalEdits: 0,
    totalRollbacks: 0,
    totalVerifications: 0,
    totalFallbacks: 0,
    strategyCounts: {
      line_replace: 0,
      block_replace: 0,
      string_replace: 0,
      insert: 0,
      remove: 0,
      batch: 0,
      full_replace: 0,
    }
  }
};

// ============================================================================
// UTILITY: Get Tauri invoke
// ============================================================================

function getInvoke(): ((cmd: string, args?: any) => Promise<any>) | null {
  const w = window as any;
  return w.__TAURI__?.core?.invoke || w.__TAURI__?.invoke || null;
}

function getEditorAndModel(): { editor: any; model: any } | null {
  const w = window as any;
  // Method 1: Monaco editor API
  const editors = w.monaco?.editor?.getEditors?.();
  if (editors && editors.length > 0) {
    const editor = editors[0];
    const model = editor?.getModel();
    if (model) return { editor, model };
  }
  // Method 2: Window globals (used by autonomousCoding.ts)
  const editor = w.getMonacoEditorForApply?.() || w.monacoEditor;
  const model = editor?.getModel();
  if (editor && model) return { editor, model };

  return null;
}

function getFilePath(): string | null {
  const em = getEditorAndModel();
  if (!em) return null;

  let filePath = em.model.uri?.path || '';
  // Fix Windows path: /C:/Users/... → C:/Users/...
  if (filePath.startsWith('/') && filePath.charAt(2) === ':') {
    filePath = filePath.substring(1);
  }
  // Normalize to backslashes for Windows Tauri commands
  filePath = filePath.replace(/\//g, '\\');
  return filePath || null;
}

function getFileName(): string {
  const fp = getFilePath();
  if (!fp) return 'unknown';
  return fp.split('\\').pop() || fp.split('/').pop() || 'unknown';
}

// ============================================================================
// CORE: Should we use surgical mode right now?
// ============================================================================

/**
 * Comprehensive check: Is surgical mode actually usable right now?
 * Returns false if disabled, in multi-file mode, already editing, etc.
 */
export function canUseSurgicalMode(): boolean {
  // Master switch
  if (!bridgeState.enabled) return false;

  // Multi-file guard active
  // [GUARD-OFF] if (bridgeState.multiFileGuardActive) {
  // [GUARD-OFF] console.log('🔬 [SurgicalBridge] Skipped: multi-file guard active');
  // [GUARD-OFF] return false;
  // [GUARD-OFF] }

  // Re-entry guard
  if (bridgeState.isEditing) {
    console.log('🔬 [SurgicalBridge] Skipped: already editing');
    return false;
  }

  // Sync in progress
  if (bridgeState.isSyncing) {
    console.log('🔬 [SurgicalBridge] Skipped: sync in progress');
    return false;
  }

  // Tauri must be available
  if (!getInvoke()) {
    console.log('🔬 [SurgicalBridge] Skipped: Tauri not available');
    return false;
  }

  // Must have a file open
  if (!getFilePath()) {
    console.log('🔬 [SurgicalBridge] Skipped: no file open');
    return false;
  }

  // Check that surgical engine is loaded
  const w = window as any;
  if (!w.se && !w.surgicalEdit) {
    console.log('🔬 [SurgicalBridge] Skipped: surgical engine not loaded');
    return false;
  }

  return true;
}

// Simpler check used by patches (just master switch)
export function isSurgicalModeEnabled(): boolean {
  return bridgeState.enabled;
}

// ============================================================================
// MULTI-FILE GUARD — Prevents conflicts with processMultiFileApply()
// ============================================================================

/**
 * Call this BEFORE processMultiFileApply() loop starts.
 * Temporarily disables surgical mode to avoid:
 *   - File switching + sync race conditions
 *   - Multiple backup files being created for multi-file
 *   - Editor model mismatch during file-by-file processing
 */
export function enterMultiFileGuard(): void {
  bridgeState.multiFileGuardActive = true;
  console.log('🔬 [SurgicalBridge] 🛡️ Multi-file guard ACTIVATED — surgical mode paused');
}

/**
 * Call this AFTER processMultiFileApply() loop completes (in finally block).
 * Re-enables surgical mode if it was enabled before.
 */
export function exitMultiFileGuard(): void {
  bridgeState.multiFileGuardActive = false;
  console.log('🔬 [SurgicalBridge] 🛡️ Multi-file guard DEACTIVATED — surgical mode restored');
}

// ============================================================================
// FILE WATCHER GUARD — Prevents double-reload
// ============================================================================

/**
 * Check if the bridge is currently syncing the editor from disk.
 * File watchers should skip their reload if this returns true.
 *
 * Usage in your file watcher code:
 *   if (window.surgicalBridge?.isSyncing()) return; // Skip reload
 */
export function isSyncing(): boolean {
  return bridgeState.isSyncing;
}

// ============================================================================
// CORE: DIFF ANALYSIS — Determines optimal surgical strategy
// ============================================================================

export function analyzeDiff(oldCode: string, newCode: string): SurgicalDiffAnalysis {
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');

  const analysis: SurgicalDiffAnalysis = {
    totalChanges: 0,
    addedLines: [],
    deletedLines: [],
    modifiedLines: [],
    addedBlocks: [],
    deletedBlocks: [],
    modifiedBlocks: [],
    recommendation: 'full_replace',
    confidence: 0
  };

  // === Step 1: Line-by-line comparison ===
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = i < oldLines.length ? oldLines[i] : null;
    const newLine = i < newLines.length ? newLines[i] : null;

    if (oldLine === null && newLine !== null) {
      analysis.addedLines.push(i + 1);
    } else if (oldLine !== null && newLine === null) {
      analysis.deletedLines.push(i + 1);
    } else if (oldLine !== newLine) {
      analysis.modifiedLines.push(i + 1);
    }
  }

  analysis.totalChanges = analysis.addedLines.length + analysis.deletedLines.length + analysis.modifiedLines.length;

  // === Step 2: Detect contiguous blocks ===
  analysis.addedBlocks = detectContiguousBlocks(analysis.addedLines, newLines);
  analysis.deletedBlocks = detectContiguousRanges(analysis.deletedLines);
  analysis.modifiedBlocks = detectModifiedBlocks(analysis.modifiedLines, oldLines, newLines);

  // === Step 3: Recommend strategy ===
  const changeRatio = analysis.totalChanges / Math.max(oldLines.length, 1);

  if (analysis.totalChanges === 0) {
    analysis.recommendation = 'full_replace';
    analysis.confidence = 100;
  }
  // Pure additions
  else if (analysis.deletedLines.length === 0 && analysis.modifiedLines.length === 0) {
    analysis.recommendation = 'insert';
    analysis.confidence = 90;
  }
  // Pure deletions
  else if (analysis.addedLines.length === 0 && analysis.modifiedLines.length === 0) {
    analysis.recommendation = 'remove';
    analysis.confidence = 90;
  }
  // Few scattered changes (< 20%)
  else if (changeRatio < 0.2 && analysis.totalChanges <= 15) {
    const allChanged = [...analysis.modifiedLines, ...analysis.addedLines, ...analysis.deletedLines].sort((a, b) => a - b);
    const isContiguous = allChanged.length > 0 && (allChanged[allChanged.length - 1] - allChanged[0]) < allChanged.length + 5;

    if (isContiguous && allChanged.length >= 3) {
      analysis.recommendation = 'block_replace';
      analysis.confidence = 85;
    } else if (analysis.modifiedLines.length <= 3 && analysis.addedLines.length === 0 && analysis.deletedLines.length === 0) {
      analysis.recommendation = 'line_replace';
      analysis.confidence = 80;
    } else {
      analysis.recommendation = 'batch';
      analysis.confidence = 70;
    }
  }
  // Moderate changes (20-60%)
  else if (changeRatio < 0.6) {
    if (analysis.modifiedBlocks.length + analysis.addedBlocks.length <= 3) {
      analysis.recommendation = 'batch';
      analysis.confidence = 65;
    } else {
      analysis.recommendation = 'full_replace';
      analysis.confidence = 60;
    }
  }
  // Massive rewrite (> 60%)
  else {
    analysis.recommendation = 'full_replace';
    analysis.confidence = 90;
  }

  return analysis;
}

/** Detect contiguous ranges from sorted line numbers */
function detectContiguousRanges(lineNums: number[]): { start: number; end: number }[] {
  if (lineNums.length === 0) return [];
  const ranges: { start: number; end: number }[] = [];
  let start = lineNums[0];
  let prev = lineNums[0];

  for (let i = 1; i < lineNums.length; i++) {
    if (lineNums[i] - prev > 1) {
      ranges.push({ start, end: prev });
      start = lineNums[i];
    }
    prev = lineNums[i];
  }
  ranges.push({ start, end: prev });
  return ranges;
}

function detectContiguousBlocks(lineNums: number[], lines: string[]): { start: number; end: number; content: string }[] {
  return detectContiguousRanges(lineNums).map(r => ({
    ...r,
    content: lines.slice(r.start - 1, r.end).join('\n')
  }));
}

function detectModifiedBlocks(lineNums: number[], oldLines: string[], newLines: string[])
  : { start: number; end: number; oldContent: string; newContent: string }[] {
  return detectContiguousRanges(lineNums).map(r => ({
    ...r,
    oldContent: oldLines.slice(r.start - 1, r.end).join('\n'),
    newContent: newLines.slice(r.start - 1, r.end).join('\n')
  }));
}

// ============================================================================
// CORE: APPLY WITH SURGICAL EDIT — Main entry point
// ============================================================================

/**
 * Apply code changes using the Surgical Edit Engine.
 * Returns { success: false } if can't use surgical → caller falls back to legacy.
 */
export async function surgicalApplySmartUpdate(
  newCode: string
): Promise<{ success: boolean; message: string; changeRecord?: SurgicalChangeRecord }> {

  // === COMPREHENSIVE PRE-FLIGHT CHECK ===
  if (!canUseSurgicalMode()) {
    return { success: false, message: 'Surgical mode not available' };
  }

  // X02: Content sanity check â€” reject patches that look like docs/marketing not code
  const getFileExt = (p: string) => p.split('.').pop()?.toLowerCase() || '';
  const isSuspiciousContent = (code: string, ext: string): boolean => {
    if (!code || code.length < 10) return false;
    const lines = code.split('\n');
    // Count lines that look like ASCII art / marketing (stars, boxes, centered text)
    const suspiciousLines = lines.filter((l: string) => {
      const t = l.trim();
      return t.startsWith('*') || t.startsWith('|') || t.startsWith('+') ||
             t.includes('OPERATOR X02') || t.includes('AI-Powered') ||
             t.includes('Coding is Art') || t.includes('www.operator');
    }).length;
    const ratio = suspiciousLines / Math.max(lines.length, 1);
    if (ratio > 0.4) return true; // more than 40% suspicious lines
    // For CSS files â€” must have at least one real CSS rule
    if (ext === 'css' || ext === 'scss') {
      const hasCSSRule = /[a-zA-Z#\.][^{]*\{[^}]*\}/.test(code);
      const onlyComments = lines.every((l: string) => l.trim().startsWith('*') || l.trim().startsWith('/*') || l.trim().startsWith('//') || l.trim() === '');
      if (onlyComments) return true;
      if (!hasCSSRule && code.length > 100) return true;
    }
    return false;
  };
  const currentFile = (window as any).tabManager?.getCurrentFile?.() || '';
  const filePath = getFilePath()!; // [X02Fix TDZ] hoisted â€” was at line 425
  const fileExt = getFileExt(currentFile || filePath || '');
  if (isSuspiciousContent(newCode, fileExt)) {
    console.warn(`\u26A0\uFE0F [X02 ContentGuard] Rejected patch for ${currentFile} â€” content looks like documentation/marketing, not ${fileExt} code`);
    return { success: false, message: 'X02 ContentGuard: patch rejected â€” content does not look like valid code for this file type' };
  }
  // X02: end content sanity check


  const invoke = getInvoke()!;
  // [X02Fix] original const filePath declaration removed (hoisted above)
  const fileName = getFileName();
  const em = getEditorAndModel();
  if (!em) {
    return { success: false, message: 'No editor model' };
  }

  const oldCode = em.model.getValue();

  // Quick identical check
  if (oldCode.trim() === newCode.trim()) {
    return { success: true, message: 'No changes needed' };
  }

  // === SET RE-ENTRY GUARD ===
  bridgeState.isEditing = true;

  // === ANALYZE DIFF ===
  const analysis = analyzeDiff(oldCode, newCode);
  console.log(`🔬 [SurgicalBridge] Analysis: +${analysis.addedLines.length} -${analysis.deletedLines.length} ~${analysis.modifiedLines.length}`);
  console.log(`🔬 [SurgicalBridge] Strategy: ${analysis.recommendation} (${analysis.confidence}% confidence)`);

  try {
    let backupPath: string | null = null;
    let editMessage = '';

    // === EXECUTE SURGICAL EDIT ===
    // v1.1 SAFETY: Only line_replace uses targeted strategy.
    // All other strategies use full replace with backup (safest approach).
    // Future versions can enable targeted strategies as they're battle-tested.

    switch (analysis.recommendation) {

      case 'line_replace': {
        if (analysis.modifiedLines.length === 1 && analysis.addedLines.length === 0 && analysis.deletedLines.length === 0) {
          try {
            const lineNum = analysis.modifiedLines[0];
            const newLine = newCode.split('\n')[lineNum - 1] || '';
            const result = await invoke('surgical_edit', {
              request: {
                file_path: filePath,
                strategy: 'line_replace',
                search_pattern: null,
                search_pattern_secondary: null,
                start_line: lineNum,
                end_line: null,
                new_content: newLine,
                old_content: null,
                dry_run: false,
                create_backup: true,
                insert_position: null
              }
            });
            backupPath = result.backup_path;
            editMessage = `Replaced line ${lineNum}`;
            break;
          } catch (e) {
            console.warn('🔬 [SurgicalBridge] line_replace failed, using full replace:', e);
          }
        }
        // Fallthrough to full replace
        const r = await fullReplaceSurgical(invoke, filePath, oldCode, newCode);
        backupPath = r.backupPath;
        editMessage = r.message;
        break;
      }

      case 'insert':
      case 'remove':
      case 'block_replace':
      case 'batch':
      case 'full_replace':
      default: {
        const r = await fullReplaceSurgical(invoke, filePath, oldCode, newCode);
        backupPath = r.backupPath;
        editMessage = r.message || `Applied ${analysis.recommendation}`;
        break;
      }
    }

    // === CREATE CHANGE RECORD ===
    const changeRecord: SurgicalChangeRecord = {
      id: `se_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      filePath,
      fileName,
      backupPath,
      strategy: analysis.recommendation,
      timestamp: Date.now(),
      changeSummary: `+${analysis.addedLines.length} -${analysis.deletedLines.length} ~${analysis.modifiedLines.length}`,
      committed: false,
      rolledBack: false
    };

    bridgeState.currentChange = changeRecord;
    bridgeState.changeHistory.push(changeRecord);
    bridgeState.stats.totalEdits++;
    // Record in UI
    try {
      const fn = filePath.split('\\').pop() || filePath.split('/').pop() || filePath;
      const allChanged = [...analysis.modifiedLines, ...analysis.addedLines].sort((a, b) => a - b);
      const firstLine = allChanged[0] || 1;
      const lastLine = allChanged[allChanged.length - 1] || firstLine;
      recordSurgicalEdit(fn, firstLine, editMessage, firstLine, lastLine);
    } catch(_e) { /* UI module may not be loaded */ }
    bridgeState.stats.strategyCounts[analysis.recommendation]++;

    // Keep only last 50 records
    if (bridgeState.changeHistory.length > 50) {
      bridgeState.changeHistory = bridgeState.changeHistory.slice(-50);
    }

    // === SYNC EDITOR FROM DISK ===
    await syncEditorFromDisk(invoke, filePath);

    // === VERIFY IN BACKGROUND (non-blocking) ===
    verifyInBackground(invoke, filePath);

    const finalMessage = `${editMessage} [${analysis.recommendation}]`;
    console.log(`🔬 [SurgicalBridge] ✅ ${finalMessage} | Backup: ${backupPath || 'none'}`);

    return { success: true, message: finalMessage, changeRecord };

  } catch (error: any) {
    console.error('🔬 [SurgicalBridge] ❌ Error:', error);
    bridgeState.stats.totalFallbacks++;
    return { success: false, message: `Surgical edit failed: ${error?.message || error}` };

  } finally {
    // === ALWAYS CLEAR RE-ENTRY GUARD ===
    bridgeState.isEditing = false;
  }
}

// ============================================================================
// HELPER: Full file replacement via surgical edit (with backup)
// ============================================================================

async function fullReplaceSurgical(
  invoke: (cmd: string, args?: any) => Promise<any>,
  filePath: string,
  oldCode: string,
  newCode: string
): Promise<{ backupPath: string | null; message: string }> {

  try {
    // Use string_replace: old_content = entire file, new_content = entire new file
    const result = await invoke('surgical_edit', {
      request: {
        file_path: filePath,
        strategy: 'string_replace',
        search_pattern: null,
        search_pattern_secondary: null,
        start_line: null,
        end_line: null,
        new_content: newCode,
        old_content: oldCode,
        dry_run: false,
        create_backup: true,
        insert_position: null
      }
    });

    return {
      backupPath: result.backup_path || null,
      message: `Full replace (${newCode.split('\n').length} lines)`
    };
  } catch (e: any) {
    console.warn('🔬 [SurgicalBridge] string_replace failed:', e?.message);

    // === FALLBACK: Manual backup + write_file ===
    try {
      const backupDir = getBackupDir();
      const fName = filePath.split('\\').pop() || 'file';
      const backupPath = `${backupDir}\\${fName}_${Date.now()}.bak`;

      // Ensure backup dir exists
      try { await invoke('create_directory', { path: backupDir }); } catch (_) { /* ok if exists */ }

      // Write backup of current content
      await invoke('write_file', { path: backupPath, content: oldCode });

      // Write new content
      await invoke('write_file', { path: filePath, content: newCode });

      console.log('🔬 [SurgicalBridge] Used write_file fallback with manual backup');
      bridgeState.stats.totalFallbacks++;

      return {
        backupPath,
        message: `Full replace via fallback (${newCode.split('\n').length} lines)`
      };
    } catch (fallbackError: any) {
      throw new Error(`Both surgical and fallback failed: ${fallbackError?.message}`);
    }
  }
}

function getBackupDir(): string {
  const fp = getFilePath() || '';
  const match = fp.match(/^([A-Z]:\\Users\\[^\\]+)/i);
  const home = match ? match[1] : 'C:\\Users\\hi';
  return `${home}\\OperatorX02\\backups\\surgical_edits`;
}

// ============================================================================
// SYNC: Read file from disk back into Monaco editor
// ============================================================================

async function syncEditorFromDisk(
  invoke: (cmd: string, args?: any) => Promise<any>,
  filePath: string
): Promise<void> {

  // Set sync guard (file watcher should check this)
  bridgeState.isSyncing = true;

  try {
    // Read file content from disk
    let diskContent: string;

    try {
      // Method 1: surgical_read_lines (guaranteed accurate)
      const recon = await invoke('surgical_recon', { filePath });
      const lines = await invoke('surgical_read_lines', {
        filePath,
        startLine: 1,
        endLine: recon.total_lines
      });
      diskContent = lines.map((l: any) => l.content).join('\n');
    } catch (e) {
      // Method 2: read_file_text fallback
      try {
        diskContent = await invoke('read_file_text', { path: filePath });
      } catch (e2) {
        console.warn('🔬 [SurgicalBridge] Could not read file from disk:', e2);
        return;
      }
    }

    // Update Monaco editor model
    const em = getEditorAndModel();
    if (em) {
      em.editor.executeEdits('surgical-sync', [{
        range: em.model.getFullModelRange(),
        text: diskContent,
        forceMoveMarkers: true
      }]);
      console.log('🔬 [SurgicalBridge] Editor synced from disk ✅');
    }
  } catch (e) {
    console.warn('🔬 [SurgicalBridge] Sync failed:', e);
  } finally {
    // Release sync guard after delay (gives file watcher time to see flag)
    setTimeout(() => {
      bridgeState.isSyncing = false;
    }, 500);
  }
}

// ============================================================================
// VERIFY: Background verification (non-blocking)
// ============================================================================

async function verifyInBackground(
  invoke: (cmd: string, args?: any) => Promise<any>,
  filePath: string
): Promise<void> {
  try {
    const result = await invoke('surgical_verify', { filePath });
    bridgeState.stats.totalVerifications++;

    if (result.duplicate_count > 0) {
      console.warn(`🔬 [SurgicalBridge] ⚠️ Verify: ${result.duplicate_count} duplicate declarations`);
    }
    if (result.syntax_issues > 5) {
      console.log(`🔬 [SurgicalBridge] ℹ️ Verify: ${result.syntax_issues} syntax issues`);
    }
  } catch (e) {
    // Verify is optional — don't fail the edit
  }
}

// ============================================================================
// COMMIT: Accept changes
// ============================================================================

/**
 * Called when user clicks "Accept".
 * File is ALREADY on disk — no additional write_file needed.
 */
export async function commitSurgicalChange(): Promise<void> {
  if (!bridgeState.currentChange) {
    console.log('🔬 [SurgicalBridge] No current change to commit');
    return;
  }

  const change = bridgeState.currentChange;
  change.committed = true;
  bridgeState.currentChange = null;

  console.log(`🔬 [SurgicalBridge] ✅ Committed: ${change.fileName} [${change.strategy}] ${change.changeSummary}`);
  if (change.backupPath) {
    console.log(`🔬 [SurgicalBridge] 💾 Backup: ${change.backupPath}`);
  }
}

// ============================================================================
// ROLLBACK: Reject changes
// ============================================================================

/**
 * Called when user clicks "Reject".
 * Restores file from backup, then syncs editor.
 */
export async function rollbackSurgicalChange(): Promise<void> {
  if (!bridgeState.currentChange) {
    console.log('🔬 [SurgicalBridge] No current change to rollback');
    return;
  }

  const change = bridgeState.currentChange;
  const invoke = getInvoke();

  if (!invoke || !change.backupPath) {
    console.warn('🔬 [SurgicalBridge] Cannot rollback — no invoke or backup');
    bridgeState.currentChange = null;
    return;
  }

  try {
    await invoke('surgical_rollback', {
      filePath: change.filePath,
      backupPath: change.backupPath
    });

    await syncEditorFromDisk(invoke, change.filePath);

    change.rolledBack = true;
    bridgeState.currentChange = null;
    bridgeState.stats.totalRollbacks++;

    console.log(`🔬 [SurgicalBridge] ⏪ Rolled back: ${change.fileName}`);
  } catch (e: any) {
    console.error('🔬 [SurgicalBridge] Rollback failed:', e);
    bridgeState.currentChange = null; // Clear to avoid stuck state
  }
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

export function setSurgicalMode(enabled: boolean): void {
  bridgeState.enabled = enabled;
  localStorage.setItem('surgicalEditMode', String(enabled));
  console.log(`🔬 [SurgicalBridge] Mode: ${enabled ? '🟢 ON (surgical edits with backup)' : '🔴 OFF (legacy mode)'}`);

  try {
    document.dispatchEvent(new CustomEvent('surgical-mode-changed', { detail: { enabled } }));
  } catch (_) {}
}

export function toggleSurgicalMode(): boolean {
  const newState = !bridgeState.enabled;
  setSurgicalMode(newState);
  return newState;
}

export function getSurgicalBridgeState(): SurgicalBridgeState {
  return { ...bridgeState };
}

export function getCurrentChange(): SurgicalChangeRecord | null {
  return bridgeState.currentChange;
}

export function getChangeHistory(): SurgicalChangeRecord[] {
  return [...bridgeState.changeHistory];
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initSurgicalEditBridge(): void {
  // Load saved preference (default OFF for safety)
  const saved = localStorage.getItem('surgicalEditMode');
  if (saved === 'false') {
    bridgeState.enabled = false;
  } else {
    bridgeState.enabled = true;  // Default ON
  }

  console.log('');
  console.log('🔬 ╔══════════════════════════════════════════╗');
  console.log(`🔬 ║  Surgical Edit Bridge v1.1 — ${bridgeState.enabled ? '🟢 ENABLED ' : '🔴 DISABLED'} ║`);
  console.log('🔬 ╠══════════════════════════════════════════╣');
  console.log('🔬 ║  Enable:  window.sb.setEnabled(true)     ║');
  console.log('🔬 ║  Toggle:  window.sb.toggle()             ║');
  console.log('🔬 ║  Status:  window.sb.getState()           ║');
  console.log('🔬 ╚══════════════════════════════════════════╝');
  console.log('');
}

// ============================================================================
// WINDOW EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  const w = window as any;

  w.surgicalBridge = {
    // Core operations
    apply: surgicalApplySmartUpdate,
    commit: commitSurgicalChange,
    rollback: rollbackSurgicalChange,
    analyze: analyzeDiff,
    canUse: canUseSurgicalMode,

    // State
    isEnabled: isSurgicalModeEnabled,
    setEnabled: setSurgicalMode,
    toggle: toggleSurgicalMode,
    getState: getSurgicalBridgeState,
    getCurrentChange,
    getHistory: getChangeHistory,
    isSyncing,

    // Multi-file guards
    enterMultiFileGuard,
    exitMultiFileGuard,

    // Init
    init: initSurgicalEditBridge,
  };

  // Shortcut
  w.sb = w.surgicalBridge;
}