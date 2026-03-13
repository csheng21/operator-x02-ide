// src/ide/surgicalBackupManager.ts
// ============================================================================
// 🗂️ SURGICAL BACKUP MANAGER — Frontend Bridge for Operator X02 Code IDE
// ============================================================================
// TypeScript wrapper for the Rust surgical backup management commands.
// Provides: list, delete, cleanup, stats, preview, diff, export.
//
// Usage in main.ts:
//   import { initBackupManager } from './ide/surgicalBackupManager';
//   initBackupManager();  // After initSurgicalEditEngine()
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

// === UNIFIED BACKUP: Source badge helper ===
function getSourceBadge(source: string): string {
  if (source === 'surgical') {
    return '<span style="background:rgba(156,39,176,0.2);color:#ce93d8;padding:1px 6px;border-radius:3px;font-size:10px;margin-left:6px;">Surgical</span>';
  } else if (source === 'ide_script') {
    return '<span style="background:rgba(33,150,243,0.2);color:#64b5f6;padding:1px 6px;border-radius:3px;font-size:10px;margin-left:6px;">IDE Script</span>';
  }
  return '';
}
// === END UNIFIED BACKUP helper ===

// ============================================================================
// TYPES (mirrors Rust structs in surgical_backup_commands.rs)
// ============================================================================

export interface BackupInfo {
  path: string;
  name: string;
  original_file: string;
  size_bytes: number;
  size_display: string;
  created_at: number;
  created_display: string;
  age_seconds: number;
}

export interface BackupStats {
  total_backups: number;
  total_size_bytes: number;
  total_size_display: string;
  files_with_backups: number;
  oldest_backup: BackupInfo | null;
  newest_backup: BackupInfo | null;
  per_file: FileBackupSummary[];
}

export interface FileBackupSummary {
  original_file: string;
  count: number;
  total_size_bytes: number;
  total_size_display: string;
  newest: string | null;
  oldest: string | null;
}

export interface BackupPreview {
  path: string;
  name: string;
  original_file: string;
  content_preview: string[];
  total_lines: number;
  size_bytes: number;
  language: string;
}

export interface BackupDiffResult {
  backup_path: string;
  current_path: string;
  backup_lines: number;
  current_lines: number;
  added_lines: DiffLine[];
  removed_lines: DiffLine[];
  changed_lines: DiffChangePair[];
  unchanged_count: number;
  change_summary: string;
}

export interface DiffLine {
  line_number: number;
  content: string;
}

export interface DiffChangePair {
  line_number: number;
  old_content: string;
  new_content: string;
}

export interface CleanupResult {
  deleted_count: number;
  freed_bytes: number;
  freed_display: string;
  remaining_count: number;
  errors: string[];
}

export interface CleanupPolicy {
  maxAgeDays?: number;
  maxPerFile?: number;
  maxTotalSizeMB?: number;
}

// ============================================================================
// BACKUP MANAGER CLASS (Singleton)
// ============================================================================

export class SurgicalBackupManager {
  private static instance: SurgicalBackupManager;

  // ── Stats cache (prevents redundant Tauri IPC calls) ──
  private _statsCache: BackupStats | null = null;
  private _statsCacheTime: number = 0;
  private _statsCacheTTL: number = 5000; // 5 second TTL
  private _statsPending: Promise<BackupStats> | null = null;

  static getInstance(): SurgicalBackupManager {
    if (!SurgicalBackupManager.instance) {
      SurgicalBackupManager.instance = new SurgicalBackupManager();
    }
    return SurgicalBackupManager.instance;
  }

  /** Invalidate cached stats (call after delete/cleanup operations) */
  invalidateStatsCache(): void {
    this._statsCache = null;
    this._statsCacheTime = 0;
    this._statsPending = null;
  }

  // ── Listing ──

  async listAll(): Promise<BackupInfo[]> {
    console.log('🗂️ [BackupManager] Listing all backups...');
    return await invoke('unified_backup_list_all');
  }

  async listForFile(fileName: string): Promise<BackupInfo[]> {
    console.log(`🗂️ [BackupManager] Listing backups for: ${fileName}`);
    return await invoke('unified_backup_list_for_file', { fileName });
  }

  // ── Stats (cached + deduplicated) ──

  async getStats(): Promise<BackupStats> {
    // Return cache if fresh
    if (this._statsCache && (Date.now() - this._statsCacheTime) < this._statsCacheTTL) {
      return this._statsCache;
    }
    // Deduplicate: if a fetch is already in-flight, piggyback on it
    if (this._statsPending) {
      return this._statsPending;
    }
    console.log('📊 [BackupManager] Getting stats...');
    this._statsPending = invoke<BackupStats>('unified_backup_stats')
      .then(stats => {
        this._statsCache = stats;
        this._statsCacheTime = Date.now();
        this._statsPending = null;
        return stats;
      })
      .catch(e => {
        this._statsPending = null;
        throw e;
      });
    return this._statsPending;
  }

  async getBackupDir(): Promise<string> {
    return await invoke('surgical_backup_get_dir');
  }

  // ── Preview & Diff ──

  async preview(backupPath: string, maxLines?: number): Promise<BackupPreview> {
    console.log(`👁️ [BackupManager] Preview: ${backupPath}`);
    return await invoke('unified_backup_preview', {
      backupPath,
      maxLines: maxLines ?? 100,
    });
  }

  async diff(backupPath: string, currentFilePath: string): Promise<BackupDiffResult> {
    console.log(`📊 [BackupManager] Diff: ${backupPath} vs ${currentFilePath}`);
    return await invoke('surgical_backup_diff', { backupPath, currentFilePath });
  }

  // ── Delete ──

  async delete(backupPath: string): Promise<BackupInfo> {
    console.log(`🗑️ [BackupManager] Deleting: ${backupPath}`);
    const result = await invoke<BackupInfo>('unified_backup_delete', { backupPath });
    this.invalidateStatsCache();
    return result;
  }

  async deleteBatch(backupPaths: string[]): Promise<CleanupResult> {
    console.log(`🗑️ [BackupManager] Batch delete: ${backupPaths.length} files`);
    const result = await invoke<CleanupResult>('unified_backup_delete_batch', { backupPaths });
    this.invalidateStatsCache();
    return result;
  }

  async deleteAllForFile(fileName: string): Promise<CleanupResult> {
    const backups = await this.listForFile(fileName);
    return this.deleteBatch(backups.map(b => b.path));
  }

  // ── Cleanup ──

  async cleanup(policy: CleanupPolicy): Promise<CleanupResult> {
    console.log('🧹 [BackupManager] Running cleanup...', policy);
    const result = await invoke<CleanupResult>('unified_backup_cleanup', {
      maxAgeDays: policy.maxAgeDays ?? null,
      maxPerFile: policy.maxPerFile ?? null,
      maxTotalSizeMb: policy.maxTotalSizeMB ?? null,
    });
    this.invalidateStatsCache();
    return result;
  }

  async cleanupOlderThan(days: number): Promise<CleanupResult> {
    return this.cleanup({ maxAgeDays: days });
  }

  async keepOnlyLatest(perFile: number): Promise<CleanupResult> {
    return this.cleanup({ maxPerFile: perFile });
  }

  async limitTotalSize(maxMB: number): Promise<CleanupResult> {
    return this.cleanup({ maxTotalSizeMB: maxMB });
  }

  // ── Restore & Export ──

  async restore(filePath: string, backupPath: string): Promise<any> {
    console.log(`⏪ [BackupManager] Restore: ${backupPath} → ${filePath}`);
    return await invoke('surgical_rollback', { filePath, backupPath });
  }

  async export(backupPath: string, exportDir: string): Promise<string> {
    console.log(`📤 [BackupManager] Export: ${backupPath} → ${exportDir}`);
    return await invoke('surgical_backup_export', { backupPath, exportDir });
  }


  // -- Find Original File (for smart restore) --

  async findOriginal(originalName: string, searchDir: string): Promise<string[]> {
    return await invoke('surgical_backup_find_original', { originalName, searchDir });
  }
  // ── Auto-Cleanup Settings (localStorage) ──

  getAutoCleanupSettings(): CleanupPolicy & { enabled: boolean } {
    try {
      const stored = localStorage.getItem('surgicalBackupCleanupPolicy');
      if (stored) return JSON.parse(stored);
    } catch (e) { /* ignore */ }
    return { enabled: false, maxAgeDays: 7, maxPerFile: 10, maxTotalSizeMB: 100 };
  }

  saveAutoCleanupSettings(settings: CleanupPolicy & { enabled: boolean }): void {
    localStorage.setItem('surgicalBackupCleanupPolicy', JSON.stringify(settings));
    console.log('🗂️ [BackupManager] Saved cleanup settings:', settings);
  }

  async runAutoCleanupIfEnabled(): Promise<CleanupResult | null> {
    const s = this.getAutoCleanupSettings();
    if (!s.enabled) return null;
    console.log('🧹 [BackupManager] Running auto-cleanup...');
    return this.cleanup({ maxAgeDays: s.maxAgeDays, maxPerFile: s.maxPerFile, maxTotalSizeMB: s.maxTotalSizeMB });
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const backupManager = SurgicalBackupManager.getInstance();

// ── Track ALL timers/intervals for HMR cleanup ──
let _bmTimers: number[] = [];

function _bmSetTimeout(fn: () => void, ms: number): number {
  const id = window.setTimeout(fn, ms);
  _bmTimers.push(id);
  return id;
}

// ============================================================================
// HMR CLEANUP — Prevents orphaned intervals/callbacks across hot reloads
// ============================================================================

export function destroyBackupManager(): void {
  // Clear the 30s stats interval
  if (_bmStatusInterval) {
    clearInterval(_bmStatusInterval);
    _bmStatusInterval = null;
  }
  // Clear all tracked setTimeout timers
  for (const id of _bmTimers) {
    clearTimeout(id);
  }
  _bmTimers = [];
  // Close any open panel
  if (_bmPanel) {
    closeBMPanel();
  }
  // Invalidate stats cache
  const mgr = SurgicalBackupManager.getInstance();
  mgr.invalidateStatsCache();
  // Remove status bar widget
  document.getElementById('bm-statusbar-widget')?.remove();
  console.log('🧹 [BackupManager] Destroyed (HMR cleanup)');
}

// ============================================================================
// GLOBAL REGISTRATION & INITIALIZATION
// ============================================================================

export function initBackupManager(): void {
  // ── HMR Guard: tear down previous instance first ──
  if ((window as any)._bmInitialized) {
    destroyBackupManager();
  }
  (window as any)._bmInitialized = true;

  const mgr = SurgicalBackupManager.getInstance();

  (window as any).backupManager = mgr;
  // Expose destroy for cleanupAll() in main.ts
  (window as any).destroyBackupManager = destroyBackupManager;
  (window as any).bm = {
    list:         ()                          => mgr.listAll(),
    listFor:      (file: string)              => mgr.listForFile(file),
    stats:        ()                          => mgr.getStats(),
    preview:      (path: string)              => mgr.preview(path),
    diff:         (backup: string, cur: string) => mgr.diff(backup, cur),
    delete:       (path: string)              => mgr.delete(path),
    deleteBatch:  (paths: string[])           => mgr.deleteBatch(paths),
    deleteAllFor: (file: string)              => mgr.deleteAllForFile(file),
    cleanup:      (p: CleanupPolicy)          => mgr.cleanup(p),
    cleanOld:     (days: number)              => mgr.cleanupOlderThan(days),
    keepLatest:   (n: number)                 => mgr.keepOnlyLatest(n),
    restore:      (file: string, bak: string) => mgr.restore(file, bak),
    export:       (bak: string, dir: string)  => mgr.export(bak, dir),
    dir:          ()                          => mgr.getBackupDir(),
    settings:     ()                          => mgr.getAutoCleanupSettings(),
    showUI:       ()                          => showBackupManagerUI(),
    findOriginal: (name: string, dir: string) => mgr.findOriginal(name, dir),
  };

  // Auto-cleanup on startup (delayed 5s to avoid startup congestion)
  _bmSetTimeout(() => {
    mgr.runAutoCleanupIfEnabled().then(r => {
      if (r && r.deleted_count > 0) {
        console.log(`🧹 [BackupManager] Auto-cleanup: ${r.deleted_count} removed, ${r.freed_display} freed`);
      }
    }).catch(e => console.warn('[BackupManager] Auto-cleanup error:', e));
  }, 5000);

  console.log('🗂️ Backup Manager initialized');
  // --- Deferred: Wait for unified status bar ---
  const _tryInsertBackupStatusBar = () => {
    // If unified status bar is ready, insert now
    const unifiedBar = document.querySelector('.unified-status-bar');
    if (unifiedBar) {
      _insertBackupStatusBar();
      return;
    }
    // Wait for event
    window.addEventListener('unified-statusbar-ready', () => {
      _bmSetTimeout(() => _insertBackupStatusBar(), 500);
    }, { once: true });
    // Fallback after 10s
    _bmSetTimeout(() => {
      if (!document.getElementById('bm-statusbar-widget')) {
        _insertBackupStatusBar();
      }
    }, 10000);
  };
  _tryInsertBackupStatusBar();
  console.log('   Access: window.bm.list(), bm.stats(), bm.showUI()');
}


// ============================================================================
// BACKUP MANAGER UI — Full Panel
// ============================================================================

let _bmPanel: HTMLElement | null = null;

function _injectBMStyles(): void {
  if (document.getElementById('bm-styles')) return;
  const style = document.createElement('style');
  style.id = 'bm-styles';
  style.textContent = `
/* ═══ Backup Manager Panel ═══ */
.bm-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  z-index: 100050; display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.25s ease;
}
.bm-overlay.bm-show { opacity: 1; }
.bm-panel {
  width: 780px; max-width: 92vw; max-height: 85vh;
  background: #1e1e2e; border: 1px solid #313244; border-radius: 14px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(180,142,173,0.06);
  display: flex; flex-direction: column; overflow: hidden;
  transform: translateY(12px) scale(0.97);
  transition: transform 0.3s cubic-bezier(0.22,1,0.36,1);
}
.bm-overlay.bm-show .bm-panel { transform: translateY(0) scale(1); }

/* Header */
.bm-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid #313244;
  background: linear-gradient(180deg, rgba(180,142,173,0.06) 0%, transparent 100%);
}
.bm-hdr-left { display: flex; align-items: center; gap: 10px; }
.bm-hdr-icon {
  width: 34px; height: 34px; border-radius: 8px;
  background: linear-gradient(135deg, #b48ead, #89b4fa);
  display: flex; align-items: center; justify-content: center; font-size: 16px;
}
.bm-hdr-title { font: 700 14px 'JetBrains Mono',monospace; color: #cdd6f4; }
.bm-hdr-sub { font: 500 10px 'JetBrains Mono',monospace; color: #6c7086; margin-top: 1px; }
.bm-close {
  width: 28px; height: 28px; border: none; border-radius: 6px;
  background: rgba(243,139,168,0.08); color: #f38ba8; font-size: 14px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.2s;
}
.bm-close:hover { background: rgba(243,139,168,0.2); }

/* Tabs */
.bm-tabs {
  display: flex; gap: 2px; padding: 8px 20px 0; border-bottom: 1px solid #313244;
}
.bm-tab {
  padding: 8px 16px; font: 600 11px 'JetBrains Mono',monospace; color: #6c7086;
  background: none; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; transition: all 0.2s; margin-bottom: -1px;
}
.bm-tab:hover { color: #9399b2; background: rgba(180,142,173,0.05); }
.bm-tab.active { color: #b48ead; border-bottom-color: #b48ead; }

/* Toolbar */
.bm-toolbar {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 20px; border-bottom: 1px solid rgba(49,50,68,0.5);
}
.bm-search {
  flex: 1; height: 30px; background: #181825; border: 1px solid #313244;
  border-radius: 6px; padding: 0 10px;
  font: 400 11px 'JetBrains Mono',monospace; color: #cdd6f4; outline: none;
  transition: border-color 0.2s;
}
.bm-search:focus { border-color: #b48ead; }
.bm-search::placeholder { color: #45475a; }
.bm-tbtn {
  height: 30px; padding: 0 12px; border: 1px solid #313244; border-radius: 6px;
  background: #181825; color: #9399b2;
  font: 600 10px 'JetBrains Mono',monospace; cursor: pointer;
  display: flex; align-items: center; gap: 5px; transition: all 0.2s; white-space: nowrap;
}
.bm-tbtn:hover { background: #313244; color: #cdd6f4; }
.bm-tbtn.danger { border-color: rgba(243,139,168,0.2); color: #f38ba8; }
.bm-tbtn.danger:hover { background: rgba(243,139,168,0.1); }

/* Content */
.bm-body { flex: 1; overflow-y: auto; padding: 12px 20px; min-height: 300px; }
.bm-body::-webkit-scrollbar { width: 6px; }
.bm-body::-webkit-scrollbar-track { background: transparent; }
.bm-body::-webkit-scrollbar-thumb { background: #313244; border-radius: 3px; }

/* List item */
.bm-item {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  border-radius: 8px; border: 1px solid transparent; cursor: pointer;
  transition: all 0.15s; margin-bottom: 4px;
}
.bm-item:hover { background: rgba(180,142,173,0.05); border-color: rgba(49,50,68,0.8); }
.bm-item.sel { background: rgba(180,142,173,0.1); border-color: rgba(180,142,173,0.25); }
.bm-chk {
  width: 16px; height: 16px; border: 2px solid #45475a; border-radius: 4px;
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: transparent; transition: all 0.15s;
}
.bm-item.sel .bm-chk { border-color: #b48ead; background: #b48ead; color: #1e1e2e; }
.bm-ico {
  width: 32px; height: 32px; border-radius: 6px;
  background: rgba(137,180,250,0.08); display: flex; align-items: center;
  justify-content: center; flex-shrink: 0; font-size: 14px;
}
.bm-info { flex: 1; min-width: 0; }
.bm-name { font: 600 12px 'JetBrains Mono',monospace; color: #cdd6f4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bm-meta { font: 400 10px 'JetBrains Mono',monospace; color: #6c7086; margin-top: 2px; display: flex; gap: 12px; }
.bm-acts { display: flex; gap: 4px; opacity: 0; transition: opacity 0.15s; }
.bm-item:hover .bm-acts { opacity: 1; }
.bm-abtn {
  width: 28px; height: 28px; border: 1px solid #313244; border-radius: 6px;
  background: #181825; color: #9399b2; font-size: 12px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.bm-abtn:hover { background: #313244; color: #cdd6f4; }
.bm-abtn.restore:hover { background: rgba(166,227,161,0.15); border-color: rgba(166,227,161,0.3); color: #a6e3a1; }
.bm-abtn.del:hover { background: rgba(243,139,168,0.15); border-color: rgba(243,139,168,0.3); color: #f38ba8; }

/* Stats */
.bm-sgrid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 20px; }
.bm-scard { padding: 16px; background: #181825; border: 1px solid #313244; border-radius: 10px; }
.bm-slabel { font: 500 10px 'JetBrains Mono',monospace; color: #6c7086; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.bm-sval { font: 700 22px 'JetBrains Mono',monospace; color: #cba6f7; }
.bm-ssub { font: 400 10px 'JetBrains Mono',monospace; color: #45475a; margin-top: 4px; }
.bm-frow {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-radius: 6px; margin-bottom: 2px;
}
.bm-frow:hover { background: rgba(180,142,173,0.04); }
.bm-fname { font: 600 11px 'JetBrains Mono',monospace; color: #89b4fa; }
.bm-fcount { font: 600 11px 'JetBrains Mono',monospace; color: #cba6f7; }
.bm-fsize { font: 400 10px 'JetBrains Mono',monospace; color: #6c7086; }

/* Settings */
.bm-stitle { font: 700 12px 'JetBrains Mono',monospace; color: #cdd6f4; margin-bottom: 12px; }
.bm-srow {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; background: #181825; border: 1px solid #313244;
  border-radius: 8px; margin-bottom: 6px;
}
.bm-slbl { font: 400 11px 'JetBrains Mono',monospace; color: #9399b2; }
.bm-sinput {
  width: 80px; height: 28px; background: #1e1e2e; border: 1px solid #45475a;
  border-radius: 5px; padding: 0 8px;
  font: 400 11px 'JetBrains Mono',monospace; color: #cdd6f4; text-align: center; outline: none;
}
.bm-sinput:focus { border-color: #b48ead; }
.bm-toggle {
  width: 38px; height: 20px; background: #313244; border-radius: 10px;
  border: none; cursor: pointer; position: relative; transition: background 0.2s;
}
.bm-toggle.on { background: #b48ead; }
.bm-toggle::after {
  content: ''; position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; background: #cdd6f4; border-radius: 50%;
  transition: transform 0.2s;
}
.bm-toggle.on::after { transform: translateX(18px); }
.bm-savebtn {
  width: 100%; height: 36px; border: none; border-radius: 8px;
  background: linear-gradient(135deg, #b48ead, #89b4fa);
  color: #1e1e2e; font: 700 11px 'JetBrains Mono',monospace;
  cursor: pointer; transition: opacity 0.2s; margin-top: 12px;
}
.bm-savebtn:hover { opacity: 0.9; }

/* Preview */
.bm-phdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.bm-ptitle { font: 700 12px 'JetBrains Mono',monospace; color: #89b4fa; }
.bm-pmeta { font: 400 10px 'JetBrains Mono',monospace; color: #6c7086; }
.bm-code {
  background: #11111b; border: 1px solid #313244; border-radius: 8px;
  padding: 12px; font: 400 11px/1.6 'JetBrains Mono',monospace; color: #cdd6f4;
  overflow: auto; max-height: 400px; white-space: pre; tab-size: 2;
}
.bm-cline { display: flex; }
.bm-cnum { width: 40px; color: #45475a; text-align: right; padding-right: 12px; user-select: none; flex-shrink: 0; }
.bm-ctext { flex: 1; white-space: pre; }
.bm-dadd { background: rgba(166,227,161,0.1); color: #a6e3a1; }
.bm-drem { background: rgba(243,139,168,0.1); color: #f38ba8; }
.bm-dchg { background: rgba(249,226,175,0.08); color: #f9e2af; }

/* Footer */
.bm-footer {
  padding: 10px 20px; border-top: 1px solid #313244;
  display: flex; align-items: center; justify-content: space-between;
  font: 400 10px 'JetBrains Mono',monospace; color: #45475a;
}
.bm-fpath { max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Empty & Loading */
.bm-empty { display: flex; flex-direction: column; align-items: center; padding: 48px 20px; text-align: center; }
.bm-empty-ico { font-size: 36px; margin-bottom: 12px; opacity: 0.5; }
.bm-empty-txt { font: 400 12px 'JetBrains Mono',monospace; color: #6c7086; }
.bm-empty-hint { font: 400 10px 'JetBrains Mono',monospace; color: #45475a; margin-top: 6px; }
.bm-loading { display: flex; align-items: center; justify-content: center; padding: 40px; }
.bm-spin {
  width: 24px; height: 24px; border: 2px solid #313244; border-top-color: #b48ead;
  border-radius: 50%; animation: bmSpin 0.8s linear infinite;
}
@keyframes bmSpin { to { transform: rotate(360deg); } }

/* Confirm dialog */
.bm-confirm-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 10; border-radius: 14px;
}
.bm-confirm-box {
  background: #1e1e2e; border: 1px solid #585b70; border-radius: 10px;
  padding: 20px 24px; max-width: 380px; text-align: center;
}
.bm-confirm-msg { font: 400 12px/1.5 'JetBrains Mono',monospace; color: #cdd6f4; margin-bottom: 16px; }
.bm-confirm-btns { display: flex; gap: 8px; justify-content: center; }
.bm-cbtn {
  height: 32px; padding: 0 20px; border: 1px solid #313244; border-radius: 6px;
  font: 600 11px 'JetBrains Mono',monospace; cursor: pointer; transition: all 0.15s;
}
.bm-cbtn.cancel { background: #181825; color: #9399b2; }
.bm-cbtn.cancel:hover { background: #313244; }
.bm-cbtn.ok-del { background: rgba(243,139,168,0.15); color: #f38ba8; border-color: rgba(243,139,168,0.3); }
.bm-cbtn.ok-del:hover { background: rgba(243,139,168,0.25); }
.bm-cbtn.ok-restore { background: rgba(166,227,161,0.15); color: #a6e3a1; border-color: rgba(166,227,161,0.3); }
.bm-cbtn.ok-restore:hover { background: rgba(166,227,161,0.25); }

/* Toast */
.bm-toast {
  position: fixed; bottom: 40px; right: 16px;
  background: #1e1e2e; border: 1px solid rgba(180,142,173,0.25); border-left: 3px solid #b48ead;
  border-radius: 8px; padding: 10px 16px;
  font: 400 11px 'JetBrains Mono',monospace; color: #cdd6f4;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4); z-index: 100060;
  display: flex; align-items: center; gap: 8px;
  opacity: 0; transform: translateY(8px); transition: all 0.3s; pointer-events: none;
}
.bm-toast.show { opacity: 1; transform: translateY(0); pointer-events: auto; }
`;
  document.body.appendChild(style);
}

// ── Toast helper ──
let _bmToastTimer: number | null = null;

function _bmToast(icon: string, msg: string): void {
  let toast = document.getElementById('bm-toast-el');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'bm-toast';
    toast.id = 'bm-toast-el';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span style="font-size:14px">${icon}</span><span>${msg}</span>`;
  if (_bmToastTimer) clearTimeout(_bmToastTimer);
  requestAnimationFrame(() => toast!.classList.add('show'));
  _bmToastTimer = window.setTimeout(() => toast!.classList.remove('show'), 3000);
}

// ── State ──
let _bmView: 'list' | 'stats' | 'settings' | 'preview' | 'diff' = 'list';
let _bmSelected = new Set<string>();
let _bmFilter = '';
let _bmSortBy: 'date' | 'name' | 'size' = 'date';
let _bmCachedBackups: any[] = [];  // Cached to avoid re-fetch on filter keystrokes
let _bmPreviewPath = '';
let _bmDiffBackup = '';
let _bmDiffCurrent = '';

// ── Panel lifecycle ──

export async function showBackupManagerUI(): Promise<void> {
  if (_bmPanel) { closeBMPanel(); return; }
  _injectBMStyles();

  // ── Show panel INSTANTLY with loading spinner (no blocking awaits) ──
  const overlay = document.createElement('div');
  overlay.className = 'bm-overlay';
  overlay.innerHTML = `
    <div class="bm-panel" style="position:relative">
      <div class="bm-hdr">
        <div class="bm-hdr-left">
          <div class="bm-hdr-icon">🗂️</div>
          <div>
            <div class="bm-hdr-title">Backup Manager</div>
            <div class="bm-hdr-sub">Surgical Edit Engine + IDE Script</div>
          </div>
        </div>
        <button class="bm-close" id="bm-close-btn">✕</button>
      </div>
      <div class="bm-tabs" id="bm-tabs">
        <button class="bm-tab active" data-t="list">📋 Backups</button>
        <button class="bm-tab" data-t="stats">📊 Statistics</button>
        <button class="bm-tab" data-t="settings">⚙️ Settings</button>
      </div>
      <div id="bm-toolbar"></div>
      <div class="bm-body" id="bm-body"><div class="bm-loading"><div class="bm-spin"></div></div></div>
      <div class="bm-footer">
        <div class="bm-fpath" id="bm-fpath-dir">...</div>
        <div id="bm-count"></div>
      </div>
    </div>`;

  // Append and animate in IMMEDIATELY — no await before this point
  document.body.appendChild(overlay);
  _bmPanel = overlay;
  requestAnimationFrame(() => overlay.classList.add('bm-show'));

  // Events
  overlay.querySelector('#bm-close-btn')!.addEventListener('click', closeBMPanel);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeBMPanel(); });
  const _esc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeBMPanel(); };
  document.addEventListener('keydown', _esc);
  (overlay as any)._escHandler = _esc;

  overlay.querySelectorAll('.bm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      _bmView = (tab as HTMLElement).dataset.t as any;
      overlay.querySelectorAll('.bm-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      _bmRender();
    });
  });

  _bmView = 'list';
  _bmSelected.clear();

  // ── Fetch backup dir in background (non-blocking) ──
  const mgr = SurgicalBackupManager.getInstance();
  mgr.getBackupDir().then(dir => {
    const el = document.getElementById('bm-fpath-dir');
    if (el) { el.textContent = dir; el.title = dir; }
  }).catch(() => {});

  // ── Start rendering content (panel is already visible with spinner) ──
  _bmRender();
}

function closeBMPanel(): void {
  if (!_bmPanel) return;
  const esc = (_bmPanel as any)._escHandler;
  if (esc) document.removeEventListener('keydown', esc);
  _bmPanel.classList.remove('bm-show');
  const el = _bmPanel;
  setTimeout(() => el.remove(), 300);
  _bmPanel = null;
  _bmSelected.clear();
}

// ── Content rendering ──

async function _bmRender(): Promise<void> {
  const body = document.getElementById('bm-body');
  const toolbar = document.getElementById('bm-toolbar');
  if (!body || !toolbar) return;

  body.innerHTML = '<div class="bm-loading"><div class="bm-spin"></div></div>';
  toolbar.innerHTML = '';

  try {
    if (_bmView === 'list') await _bmRenderList(body, toolbar);
    else if (_bmView === 'stats') await _bmRenderStats(body);
    else if (_bmView === 'settings') _bmRenderSettings(body);
    else if (_bmView === 'preview') await _bmRenderPreview(body, toolbar);
    else if (_bmView === 'diff') await _bmRenderDiff(body, toolbar);
  } catch(e) {
    body.innerHTML = `<div class="bm-empty"><div class="bm-empty-ico">⚠️</div><div class="bm-empty-txt">Error loading</div><div class="bm-empty-hint">${e}</div></div>`;
  }
}

async function _bmRenderList(body: HTMLElement, toolbar: HTMLElement): Promise<void> {
  const mgr = SurgicalBackupManager.getInstance();
  let backups: BackupInfo[] = [];
  try {
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Backup list timeout (5s)')), 5000));
    backups = await Promise.race([mgr.listAll(), timeout]);
  } catch (e: any) {
    console.warn('[BackupManager] listAll failed:', e?.message || e);
    body.innerHTML = '<div class="bm-empty"><div class="bm-empty-ico">\u26A0\uFE0F</div><div class="bm-empty-txt">Could not load backups</div><div class="bm-empty-hint">' + (e?.message || 'Backend unavailable') + '</div></div>';
    return;
  }
  _bmCachedBackups = backups;  // Cache for filter-only refreshes

  const countEl = document.getElementById('bm-count');
  if (countEl) countEl.textContent = `${backups.length} backup(s)`;

  // Toolbar
  toolbar.innerHTML = `<div class="bm-toolbar">
    <input class="bm-search" id="bm-filter" placeholder="Filter by filename..." value="${_bmFilter}" />
    <button class="bm-tbtn" id="bm-sort">${_bmSortBy === 'date' ? '📅' : _bmSortBy === 'name' ? '🔤' : '📊'} ${_bmSortBy}</button>
    <button class="bm-tbtn danger" id="bm-del-sel" style="display:${_bmSelected.size > 0 ? 'flex' : 'none'}">🗑️ Delete (${_bmSelected.size})</button>
  </div>`;

  document.getElementById('bm-filter')?.addEventListener('input', (e: any) => {
    _bmFilter = e.target.value;
    _bmRefreshListBody();  // Only re-render list items, not toolbar
  });
  document.getElementById('bm-sort')?.addEventListener('click', () => {
    const o: Array<'date'|'name'|'size'> = ['date','name','size'];
    _bmSortBy = o[(o.indexOf(_bmSortBy)+1) % o.length];
    // Update sort button text without full re-render
    const sortBtn = document.getElementById('bm-sort');
    if (sortBtn) sortBtn.innerHTML = (_bmSortBy === 'date' ? '\ud83d\udcc5' : _bmSortBy === 'name' ? '\ud83d\udd24' : '\ud83d\udcca') + ' ' + _bmSortBy;
    _bmRefreshListBody();  // Only re-render list items
  });
  document.getElementById('bm-del-sel')?.addEventListener('click', async () => {
    const paths = [..._bmSelected];
    if (!confirm(`Delete ${paths.length} backup(s)?`)) return;
    const r = await mgr.deleteBatch(paths);
    _bmToast('🗑️', `Deleted ${r.deleted_count} · Freed ${r.freed_display}`);
    _bmSelected.clear();
    _bmRender();
  });

  // Filter & sort
  let filtered = backups;
  if (_bmFilter) {
    const q = _bmFilter.toLowerCase();
    filtered = filtered.filter(b => b.original_file.toLowerCase().includes(q) || b.name.toLowerCase().includes(q));
  }
  filtered.sort((a,b) => {
    if (_bmSortBy === 'name') return a.original_file.localeCompare(b.original_file);
    if (_bmSortBy === 'size') return b.size_bytes - a.size_bytes;
    return b.created_at - a.created_at;
  });

  if (filtered.length === 0) {
    body.innerHTML = `<div class="bm-empty"><div class="bm-empty-ico">🗂️</div><div class="bm-empty-txt">${_bmFilter ? 'No matches' : 'No backups yet'}</div><div class="bm-empty-hint">${_bmFilter ? 'Try a different filter' : 'Backups are auto-created by the Surgical Edit Engine + IDE Script'}</div></div>`;
    return;
  }

  const iconMap: Record<string,string> = { ts:'🟦', tsx:'🟦', js:'🟨', jsx:'🟨', rs:'🦀', py:'🐍', css:'🎨', html:'🌐', json:'📋' };

  body.innerHTML = filtered.map(b => {
    const ext = b.original_file.split('.').pop() || '';
    const icon = iconMap[ext] || '📄';
    const sel = _bmSelected.has(b.path);
    return `<div class="bm-item${sel?' sel':''}" data-p="${b.path}" data-f="${b.original_file}">
      <div class="bm-chk">${sel?'✓':''}</div>
      <div class="bm-ico">${icon}</div>
      <div class="bm-info">
        <div class="bm-name">${b.original_file}</div>
        <div class="bm-meta"><span>${b.size_display}</span><span>${b.created_display}</span></div>
      </div>
      <div class="bm-acts">
        <button class="bm-abtn" data-act="preview" data-p="${b.path}" title="Preview">👁️</button>
        <button class="bm-abtn restore" data-act="restore" data-p="${b.path}" data-f="${b.original_file}" title="Restore">⏪</button>
        <button class="bm-abtn del" data-act="delete" data-p="${b.path}" title="Delete">🗑️</button>
      </div>
    </div>`;
  }).join('');

  // Item click = select
  body.querySelectorAll('.bm-item').forEach(el => {
    el.addEventListener('click', (e: any) => {
      if (e.target.closest('.bm-abtn')) return;
      const p = (el as HTMLElement).dataset.p!;
      _bmSelected.has(p) ? _bmSelected.delete(p) : _bmSelected.add(p);
      _bmRender();
    });
  });

  // Action buttons
  body.querySelectorAll('.bm-abtn').forEach(btn => {
    btn.addEventListener('click', async (e: any) => {
      e.stopPropagation();
      const act = (btn as HTMLElement).dataset.act;
      const p = (btn as HTMLElement).dataset.p!;
      const f = (btn as HTMLElement).dataset.f || '';

      if (act === 'preview') {
        _bmPreviewPath = p;
        _bmView = 'preview';
        _bmRender();
      } else if (act === 'delete') {
        if (!confirm(`Delete this backup?\n${p.split(/[/\\]/).pop()}`)) return;
        const info = await mgr.delete(p);
        _bmToast('🗑️', `Deleted ${info.original_file} (${info.size_display})`);
        _bmSelected.delete(p);
        _bmRender();
      } else if (act === 'restore') {
        await _bmSmartRestore(p, f);
      }
    });
  });
}

// â”€â”€ Body-only refresh (no toolbar rebuild = no flash) â”€â”€

// Body-only refresh (no toolbar rebuild = no flash)

function _bmRefreshListBody(): void {
  const body = document.getElementById('bm-body');
  if (!body) return;

  const backups = _bmCachedBackups;
  if (!backups || backups.length === 0) return;

  // Encoding-safe icon definitions (avoids PowerShell UTF-8 corruption)
  const _ico = {
    ts: String.fromCodePoint(0x1F7E6),    // blue square
    tsx: String.fromCodePoint(0x1F7E6),
    js: String.fromCodePoint(0x1F7E8),    // yellow square
    jsx: String.fromCodePoint(0x1F7E8),
    rs: String.fromCodePoint(0x1F980),    // crab
    py: String.fromCodePoint(0x1F40D),    // snake
    css: String.fromCodePoint(0x1F3A8),   // palette
    html: String.fromCodePoint(0x1F310),  // globe
    json: String.fromCodePoint(0x1F4CB),  // clipboard
    file: String.fromCodePoint(0x1F4C4),  // page
    folder: String.fromCodePoint(0x1F5C2) + String.fromCodePoint(0xFE0F), // folder
    trash: String.fromCodePoint(0x1F5D1) + String.fromCodePoint(0xFE0F),  // wastebasket
    eye: String.fromCodePoint(0x1F441) + String.fromCodePoint(0xFE0F),    // eye
    rewind: String.fromCodePoint(0x23EA),  // rewind
    check: String.fromCodePoint(0x2713),   // checkmark
  };

  // Filter & sort using current state
  let filtered = [...backups];
  if (_bmFilter) {
    const q = _bmFilter.toLowerCase();
    filtered = filtered.filter((b: any) => b.original_file.toLowerCase().includes(q) || b.name.toLowerCase().includes(q));
  }
  filtered.sort((a: any, b: any) => {
    if (_bmSortBy === 'name') return a.original_file.localeCompare(b.original_file);
    if (_bmSortBy === 'size') return b.size_bytes - a.size_bytes;
    return b.created_at - a.created_at;
  });

  // Update delete-selected button visibility
  const delBtn = document.getElementById('bm-del-sel');
  if (delBtn) delBtn.style.display = _bmSelected.size > 0 ? 'flex' : 'none';

  if (filtered.length === 0) {
    body.innerHTML = '<div class="bm-empty"><div class="bm-empty-ico">' + _ico.folder + '</div><div class="bm-empty-txt">' + (_bmFilter ? 'No matches' : 'No backups yet') + '</div><div class="bm-empty-hint">' + (_bmFilter ? 'Try a different filter' : 'Backups are auto-created by the Surgical Edit Engine + IDE Script') + '</div></div>';
    return;
  }

  body.innerHTML = filtered.map((b: any) => {
    const ext = b.original_file.split('.').pop() || '';
    const icon = (_ico as any)[ext] || _ico.file;
    const sel = _bmSelected.has(b.path);
    return '<div class="bm-item' + (sel ? ' sel' : '') + '" data-p="' + b.path + '" data-f="' + b.original_file + '">'
      + '<div class="bm-chk">' + (sel ? _ico.check : '') + '</div>'
      + '<div class="bm-ico">' + icon + '</div>'
      + '<div class="bm-info">'
      + '<div class="bm-name">' + b.original_file + '</div>'
      + '<div class="bm-meta"><span>' + b.size_display + '</span><span>' + b.created_display + '</span></div>'
      + '</div>'
      + '<div class="bm-acts">'
      + '<button class="bm-abtn" data-act="preview" data-p="' + b.path + '" title="Preview">' + _ico.eye + '</button>'
      + '<button class="bm-abtn restore" data-act="restore" data-p="' + b.path + '" data-f="' + b.original_file + '" title="Restore">' + _ico.rewind + '</button>'
      + '<button class="bm-abtn del" data-act="delete" data-p="' + b.path + '" title="Delete">' + _ico.trash + '</button>'
      + '</div></div>';
  }).join('');

  // Re-attach item click handlers (select/deselect)
  body.querySelectorAll('.bm-item').forEach(el => {
    el.addEventListener('click', (e: any) => {
      if (e.target.closest('.bm-abtn')) return;
      const p = (el as HTMLElement).dataset.p!;
      _bmSelected.has(p) ? _bmSelected.delete(p) : _bmSelected.add(p);
      _bmRefreshListBody();
    });
  });

  // Re-attach action button handlers
  body.querySelectorAll('.bm-abtn').forEach(btn => {
    btn.addEventListener('click', async (e: any) => {
      e.stopPropagation();
      const act = (btn as HTMLElement).dataset.act;
      const p = (btn as HTMLElement).dataset.p!;
      const f = (btn as HTMLElement).dataset.f || '';

      if (act === 'preview') {
        _bmPreviewPath = p;
        _bmView = 'preview';
        _bmRender();
      } else if (act === 'delete') {
        if (!confirm('Delete this backup?\n' + p.split(/[/\\]/).pop())) return;
        const mgr = SurgicalBackupManager.getInstance();
        const info = await mgr.delete(p);
        _bmToast(String.fromCodePoint(0x1F5D1), 'Deleted ' + info.original_file + ' (' + info.size_display + ')');
        _bmSelected.delete(p);
        _bmCachedBackups = _bmCachedBackups.filter((b: any) => b.path !== p);
        _bmRefreshListBody();
      } else if (act === 'restore') {
        await _bmSmartRestore(p, f);
      }
    });
  });
}

async function _bmRenderStats(body: HTMLElement): Promise<void> {
  const mgr = SurgicalBackupManager.getInstance();
  const stats = await mgr.getStats();

  body.innerHTML = `
    <div class="bm-sgrid">
      <div class="bm-scard">
        <div class="bm-slabel">Total Backups</div>
        <div class="bm-sval">${stats.total_backups}</div>
        <div class="bm-ssub">${stats.files_with_backups} unique file(s)</div>
      </div>
      <div class="bm-scard">
        <div class="bm-slabel">Total Size</div>
        <div class="bm-sval">${stats.total_size_display}</div>
        <div class="bm-ssub">${stats.total_size_bytes.toLocaleString()} bytes</div>
      </div>
      <div class="bm-scard">
        <div class="bm-slabel">Latest Backup</div>
        <div class="bm-sval" style="font-size:14px">${stats.newest_backup?.created_display || '—'}</div>
        <div class="bm-ssub">${stats.newest_backup?.original_file || 'No backups'}</div>
      </div>
    </div>
    <div class="bm-stitle">Per-File Breakdown</div>
    ${stats.per_file.map(f => `
      <div class="bm-frow">
        <span class="bm-fname">${f.original_file}</span>
        <span class="bm-fcount">${f.count} backup(s)</span>
        <span class="bm-fsize">${f.total_size_display}</span>
      </div>
    `).join('')}
    ${stats.per_file.length === 0 ? '<div class="bm-empty"><div class="bm-empty-txt">No backups yet</div></div>' : ''}
  `;
}

function _bmRenderSettings(body: HTMLElement): void {
  const mgr = SurgicalBackupManager.getInstance();
  const s = mgr.getAutoCleanupSettings();

  body.innerHTML = `
    <div style="margin-bottom:20px">
      <div class="bm-stitle">Auto-Cleanup Policy</div>
      <div class="bm-srow">
        <span class="bm-slbl">Enable auto-cleanup on IDE startup</span>
        <button class="bm-toggle${s.enabled?' on':''}" id="bm-s-enabled"></button>
      </div>
      <div class="bm-srow">
        <span class="bm-slbl">Delete backups older than (days)</span>
        <input class="bm-sinput" id="bm-s-age" type="number" min="1" max="365" value="${s.maxAgeDays ?? 7}" />
      </div>
      <div class="bm-srow">
        <span class="bm-slbl">Max backups per file</span>
        <input class="bm-sinput" id="bm-s-perfile" type="number" min="1" max="100" value="${s.maxPerFile ?? 10}" />
      </div>
      <div class="bm-srow">
        <span class="bm-slbl">Max total size (MB)</span>
        <input class="bm-sinput" id="bm-s-maxsize" type="number" min="10" max="10000" value="${s.maxTotalSizeMB ?? 100}" />
      </div>
      <button class="bm-savebtn" id="bm-s-save">Save Settings</button>
    </div>
    <div>
      <div class="bm-stitle">Manual Cleanup</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="bm-tbtn" id="bm-clean-old">🧹 Delete > 7 days</button>
        <button class="bm-tbtn" id="bm-clean-keep5">🧹 Keep latest 5/file</button>
        <button class="bm-tbtn danger" id="bm-clean-all">🗑️ Delete ALL backups</button>
      </div>
    </div>`;

  // Toggle
  document.getElementById('bm-s-enabled')?.addEventListener('click', function() { this.classList.toggle('on'); });

  // Save
  // Save with error handling and visual feedback (patched)
  document.getElementById('bm-s-save')?.addEventListener('click', () => {
    try {
      const enabledEl = document.getElementById('bm-s-enabled');
      const ageEl = document.getElementById('bm-s-age') as HTMLInputElement | null;
      const perFileEl = document.getElementById('bm-s-perfile') as HTMLInputElement | null;
      const maxSizeEl = document.getElementById('bm-s-maxsize') as HTMLInputElement | null;
      if (!enabledEl || !ageEl || !perFileEl || !maxSizeEl) {
        console.error('[BackupManager] Save failed: form elements not found');
        _bmToast('\u274C', 'Save failed: form elements not found');
        return;
      }
      const settings = {
        enabled: enabledEl.classList.contains('on'),
        maxAgeDays: parseInt(ageEl.value) || 7,
        maxPerFile: parseInt(perFileEl.value) || 10,
        maxTotalSizeMB: parseInt(maxSizeEl.value) || 100,
      };
      mgr.saveAutoCleanupSettings(settings);

      // Visual feedback on the button itself
      const btn = document.getElementById('bm-s-save');
      if (btn) {
        const origText = btn.textContent || 'Save Settings';
        btn.textContent = '\u2713 Saved!';
        btn.style.opacity = '0.7';
        setTimeout(() => {
          btn.textContent = origText;
          btn.style.opacity = '1';
        }, 1500);
      }

      // Verify save worked
      const verify = localStorage.getItem('surgicalBackupCleanupPolicy');
      console.log('[BackupManager] Settings saved:', settings, 'Verify:', verify);
      _bmToast('\u2705', 'Settings saved successfully');
    } catch (err) {
      console.error('[BackupManager] Save error:', err);
      _bmToast('\u274C', 'Save failed: ' + String(err));
    }
  });

  // Manual cleanup buttons
  document.getElementById('bm-clean-old')?.addEventListener('click', async () => {
    const r = await mgr.cleanupOlderThan(7);
    _bmToast('🧹', `Removed ${r.deleted_count} old backup(s), freed ${r.freed_display}`);
  });
  document.getElementById('bm-clean-keep5')?.addEventListener('click', async () => {
    const r = await mgr.keepOnlyLatest(5);
    _bmToast('🧹', `Removed ${r.deleted_count} backup(s), freed ${r.freed_display}`);
  });
  document.getElementById('bm-clean-all')?.addEventListener('click', async () => {
    if (!confirm('Delete ALL backups? This cannot be undone.')) return;
    const all = await mgr.listAll();
    const r = await mgr.deleteBatch(all.map(b => b.path));
    _bmToast('🗑️', `Deleted ${r.deleted_count} backup(s), freed ${r.freed_display}`);
  });
}

// ============================================================================
// SMART RESTORE — Auto-resolve file path, no prompt() needed
// Added by patch_backup_restore_fix.ps1
// ============================================================================

async function _bmSmartRestore(backupPath: string, originalFileName: string): Promise<void> {
  const mgr = SurgicalBackupManager.getInstance();

  // Step 1: Try to auto-resolve the file path
  let resolvedPath: string | null = null;
  const candidates: string[] = [];

  // 1a. Check currently active tab
  try {
    const tabMgr = (window as any).tabManager;
    if (tabMgr?.getActiveTab) {
      const activeTab = tabMgr.getActiveTab();
      if (activeTab?.filePath) {
        const activeFileName = activeTab.filePath.split(/[/\\]/).pop() || "";
        if (activeFileName === originalFileName) {
          resolvedPath = activeTab.filePath;
        }
      }
    }
  } catch (e) { /* ignore */ }

  // 1b. Check all open tabs for matching filename
  if (!resolvedPath) {
    try {
      const tabMgr = (window as any).tabManager;
      const tabs = tabMgr?.getTabs?.() || tabMgr?.tabs || [];
      for (const tab of tabs) {
        const fp = tab.filePath || tab.path || "";
        const fn = fp.split(/[/\\]/).pop() || "";
        if (fn === originalFileName && fp) {
          candidates.push(fp);
        }
      }
      if (candidates.length === 1) {
        resolvedPath = candidates[0];
      }
    } catch (e) { /* ignore */ }
  }

  // 1c. Check global currentFilePath
  if (!resolvedPath && (window as any).currentFilePath) {
    const globalPath = (window as any).currentFilePath as string;
    const gfn = globalPath.split(/[/\\]/).pop() || "";
    if (gfn === originalFileName) {
      resolvedPath = globalPath;
    }
  }

  // 1d. Search the project directory via Rust backend
  if (!resolvedPath) {
    try {
      const projectRoot = (window as any).currentProjectPath
        || (window as any).projectRoot
        || localStorage.getItem('ide_last_project_path')
        || '';
      if (projectRoot) {
        const found = await mgr.findOriginal(originalFileName, projectRoot);
        if (found.length === 1) {
          resolvedPath = found[0];
        } else if (found.length > 1) {
          for (const f of found) {
            if (!candidates.includes(f)) candidates.push(f);
          }
        }
      }
    } catch (e) {
      console.warn('[BackupManager] Find original failed:', e);
    }
  }

  // Step 2: If multiple matches, let user choose from a styled dialog
  if (!resolvedPath && candidates.length > 1) {
    resolvedPath = await _bmShowFileChooser(originalFileName, candidates);
  }

  // Step 3: If still no match, fall back to a pre-filled prompt (last resort)
  if (!resolvedPath) {
    const hint = candidates.length > 0 ? candidates[0] : "";
    resolvedPath = prompt(
      'Could not auto-detect the file location.\n\nRestore "' + originalFileName + '" \u2014 enter the FULL path:',
      hint
    );
  }

  if (!resolvedPath) return; // User cancelled

  // Step 4: Confirm before restoring
  const shortPath = resolvedPath.length > 60
    ? "..." + resolvedPath.slice(-57)
    : resolvedPath;
  const confirmed = confirm(
    "Restore backup to:\n" + shortPath + "\n\nThis will OVERWRITE the current file with the backup content.\nContinue?"
  );
  if (!confirmed) return;

  // Step 5: Execute restore
  try {
    await mgr.restore(resolvedPath, backupPath);
    _bmToast("\u23EA", "Restored " + originalFileName + " successfully");

    // Refresh the editor if the restored file is currently open
    try {
      const tabMgr = (window as any).tabManager;
      if (tabMgr?.refreshActiveTab) {
        tabMgr.refreshActiveTab();
      } else if (tabMgr?.reloadFile) {
        tabMgr.reloadFile(resolvedPath);
      }
    } catch (e) { /* non-critical */ }
  } catch (err) {
    _bmToast("\u274C", "Restore failed: " + err);
  }
}

// Mini file chooser dialog when multiple files match the backup name
function _bmShowFileChooser(fileName: string, candidates: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed", top: "0", left: "0", right: "0", bottom: "0",
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      zIndex: "100060", display: "flex", alignItems: "center", justifyContent: "center"
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      background: "#1e1e2e", border: "1px solid #313244", borderRadius: "12px",
      padding: "20px", maxWidth: "600px", width: "90vw",
      boxShadow: "0 16px 48px rgba(0,0,0,0.5)"
    });

    const title = document.createElement("div");
    title.style.cssText = "font:700 13px 'JetBrains Mono',monospace;color:#cdd6f4;margin-bottom:4px";
    title.textContent = "Multiple files found: " + fileName;
    panel.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.style.cssText = "font:400 11px 'JetBrains Mono',monospace;color:#6c7086;margin-bottom:16px";
    subtitle.textContent = "Select which file to restore the backup to:";
    panel.appendChild(subtitle);

    candidates.forEach((c, i) => {
      const item = document.createElement("div");
      item.dataset.idx = String(i);
      Object.assign(item.style, {
        padding: "10px 14px", margin: "4px 0", borderRadius: "8px", cursor: "pointer",
        background: "rgba(137,180,250,0.06)", border: "1px solid #313244",
        font: "400 11px 'JetBrains Mono',monospace", color: "#9399b2",
        transition: "all 0.15s", wordBreak: "break-all"
      });
      item.textContent = c;
      item.addEventListener("mouseenter", () => {
        item.style.background = "rgba(137,180,250,0.15)";
        item.style.borderColor = "rgba(137,180,250,0.3)";
        item.style.color = "#cdd6f4";
      });
      item.addEventListener("mouseleave", () => {
        item.style.background = "rgba(137,180,250,0.06)";
        item.style.borderColor = "#313244";
        item.style.color = "#9399b2";
      });
      item.addEventListener("click", () => {
        document.body.removeChild(overlay);
        resolve(candidates[i]);
      });
      panel.appendChild(item);
    });

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;margin-top:16px;justify-content:flex-end";
    const cancelBtn = document.createElement("button");
    Object.assign(cancelBtn.style, {
      padding: "6px 16px", borderRadius: "6px", border: "1px solid #313244",
      background: "rgba(243,139,168,0.08)", color: "#f38ba8", cursor: "pointer",
      font: "600 11px 'JetBrains Mono',monospace"
    });
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(overlay);
      resolve(null);
    });
    btnRow.appendChild(cancelBtn);
    panel.appendChild(btnRow);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        resolve(null);
      }
    });

    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", escHandler);
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        resolve(null);
      }
    };
    document.addEventListener("keydown", escHandler);
  });
}

async function _bmRenderPreview(body: HTMLElement, toolbar: HTMLElement): Promise<void> {
  toolbar.innerHTML = `<div class="bm-toolbar">
    <button class="bm-tbtn" id="bm-back">← Back to list</button>
    <div style="flex:1"></div>
    <span style="font:400 10px 'JetBrains Mono',monospace;color:#6c7086">${_bmPreviewPath.split(/[/\\]/).pop()}</span>
  </div>`;
  document.getElementById('bm-back')?.addEventListener('click', () => { _bmView = 'list'; _bmRender(); });

  const mgr = SurgicalBackupManager.getInstance();
  const p = await mgr.preview(_bmPreviewPath, 200);

  body.innerHTML = `
    <div class="bm-phdr">
      <div class="bm-ptitle">${p.original_file}</div>
      <div class="bm-pmeta">${p.total_lines} lines · ${p.language} · ${formatBytes(p.size_bytes)}</div>
    </div>
    <div class="bm-code">${p.content_preview.map((line, i) =>
      `<div class="bm-cline"><span class="bm-cnum">${i+1}</span><span class="bm-ctext">${escHtml(line)}</span></div>`
    ).join('')}${p.total_lines > p.content_preview.length ? `\n<div style="color:#45475a;text-align:center;padding:8px;">... ${p.total_lines - p.content_preview.length} more lines ...</div>` : ''}</div>`;
}

async function _bmRenderDiff(body: HTMLElement, toolbar: HTMLElement): Promise<void> {
  toolbar.innerHTML = `<div class="bm-toolbar">
    <button class="bm-tbtn" id="bm-back">← Back to list</button>
  </div>`;
  document.getElementById('bm-back')?.addEventListener('click', () => { _bmView = 'list'; _bmRender(); });

  const mgr = SurgicalBackupManager.getInstance();
  const d = await mgr.diff(_bmDiffBackup, _bmDiffCurrent);

  body.innerHTML = `
    <div class="bm-phdr">
      <div class="bm-ptitle">${d.change_summary}</div>
      <div class="bm-pmeta">Backup: ${d.backup_lines} lines · Current: ${d.current_lines} lines</div>
    </div>
    <div class="bm-code">
      ${d.changed_lines.map(c => `<div class="bm-cline bm-drem"><span class="bm-cnum">${c.line_number}</span><span class="bm-ctext">- ${escHtml(c.old_content)}</span></div><div class="bm-cline bm-dadd"><span class="bm-cnum">${c.line_number}</span><span class="bm-ctext">+ ${escHtml(c.new_content)}</span></div>`).join('')}
      ${d.added_lines.map(l => `<div class="bm-cline bm-dadd"><span class="bm-cnum">${l.line_number}</span><span class="bm-ctext">+ ${escHtml(l.content)}</span></div>`).join('')}
      ${d.removed_lines.map(l => `<div class="bm-cline bm-drem"><span class="bm-cnum">${l.line_number}</span><span class="bm-ctext">- ${escHtml(l.content)}</span></div>`).join('')}
    </div>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatBytes(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(1) + ' MB';
}


// ============================================================================
// STATUS BAR INDICATOR - Sits next to Surgical Edit widget
// ============================================================================

let _bmStatusInterval: number | null = null;

function _insertBackupStatusBar(): void {
  // Inject minimal styles
  if (!document.getElementById("bm-sb-styles")) {
    const s = document.createElement("style");
    s.id = "bm-sb-styles";
    s.textContent = `
      .bm-statusbar-widget {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 0 10px;
        height: 22px;
        cursor: pointer;
        font: 500 11px "JetBrains Mono", monospace;
        color: #9399b2;
        border-radius: 4px;
        transition: all 0.2s;
        user-select: none;
        white-space: nowrap;
      }
      .bm-statusbar-widget:hover {
        background: rgba(180, 142, 173, 0.12);
        color: #b48ead;
      }
      .bm-statusbar-widget .bm-sb-dot {
        width: 6px; height: 6px;
        border-radius: 50%;
        background: #89b4fa;
        flex-shrink: 0;
      }
      .bm-statusbar-widget .bm-sb-count {
        color: #cba6f7;
        font-weight: 700;
      }
      .bm-statusbar-widget .bm-sb-size {
        color: #585b70;
        font-size: 10px;
      }
    `;
    document.body.appendChild(s);
  }

  // Wait for the surgical edit widget, then insert next to it
  const tryInsert = (attempt: number) => {
    if (attempt > 20) {
      console.log("[BackupManager] Status bar: surgical widget not found, using fallback");
      _insertBackupStatusBarFallback();
      return;
    }

    const seWidget = document.getElementById("se-status-widget");
    if (!seWidget || !seWidget.parentElement) {
      _bmSetTimeout(() => tryInsert(attempt + 1), 500);
      return;
    }

    // Already inserted?
    if (document.getElementById("bm-statusbar-widget")) return;

    const el = _createBackupStatusEl();
    // Insert right after the surgical edit widget
    if (seWidget.nextSibling) {
      seWidget.parentElement.insertBefore(el, seWidget.nextSibling);
    } else {
      seWidget.parentElement.appendChild(el);
    }

    console.log("[BackupManager] Status bar indicator inserted");
    _startBackupCountUpdater();
  };

  tryInsert(0);
}

function _insertBackupStatusBarFallback(): void {
  if (document.getElementById("bm-statusbar-widget")) return;

  const selectors = [
    ".status-bar",
    ".statusbar",
    ".ide-status-bar",
    "[class*='status-bar']"
  ];

  let bar: HTMLElement | null = null;
  for (const sel of selectors) {
    bar = document.querySelector(sel);
    if (bar) break;
  }

  if (!bar) return;

  const el = _createBackupStatusEl();
  const right = bar.querySelector("[class*='right']") as HTMLElement | null;
  if (right) {
    right.insertBefore(el, right.firstChild);
  } else {
    bar.appendChild(el);
  }

  _startBackupCountUpdater();
}

function _createBackupStatusEl(): HTMLElement {
  const el = document.createElement("div");
  el.className = "bm-statusbar-widget";
  el.id = "bm-statusbar-widget";
  el.title = "Click to open Backup Manager";
  el.innerHTML = `
    <div class="bm-sb-dot"></div>
    <span style="font-size:12px">\u{1F5C2}</span>
    <span id="bm-sb-label">Backups</span>
    <span class="bm-sb-count" id="bm-sb-count">...</span>
    <span class="bm-sb-size" id="bm-sb-size"></span>
  `;

  el.addEventListener("click", (e) => {
    e.stopPropagation();
    showBackupManagerUI();
  });

  return el;
}

function _startBackupCountUpdater(): void {
  // Prevent duplicate intervals
  if (_bmStatusInterval) {
    clearInterval(_bmStatusInterval);
    _bmStatusInterval = null;
  }

  const update = async () => {
    try {
      // Re-insert widget if removed (e.g., status bar rebuild)
      // But do NOT call _insertBackupStatusBar (which would start another updater loop)
      if (!document.getElementById('bm-statusbar-widget')) {
        const seWidget = document.getElementById("se-status-widget");
        if (seWidget?.parentElement) {
          const el = _createBackupStatusEl();
          if (seWidget.nextSibling) {
            seWidget.parentElement.insertBefore(el, seWidget.nextSibling);
          } else {
            seWidget.parentElement.appendChild(el);
          }
        }
      }

      const mgr = SurgicalBackupManager.getInstance();
      const stats = await mgr.getStats();
      const countEl = document.getElementById("bm-sb-count");
      const sizeEl = document.getElementById("bm-sb-size");
      if (countEl) countEl.textContent = String(stats.total_backups);
      if (sizeEl && stats.total_size_bytes > 0) {
        sizeEl.textContent = "(" + stats.total_size_display + ")";
      }
      // Update dot color based on count
      const dot = document.querySelector(".bm-statusbar-widget .bm-sb-dot") as HTMLElement;
      if (dot) {
        dot.style.background = stats.total_backups > 0 ? "#89b4fa" : "#585b70";
      }
    } catch (e) {
      // Silent fail
    }
  };

  // Initial update (delayed to let startup settle)
  _bmSetTimeout(update, 2000);

  // Refresh every 30 seconds
  _bmStatusInterval = window.setInterval(update, 30000);
}