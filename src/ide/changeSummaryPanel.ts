// changeSummaryPanel.ts - Auto Mode Change Summary Panel
// ============================================================================
// Shows a professional change summary after every auto mode edit:
// - Which files were changed (NEW / MODIFIED / DELETED)
// - Lines added / removed / modified per file
// - Inline diff view per file
// - Undo button per file + Undo All
// - Integrates with autonomousCoding.ts, surgicalEditBridge.ts, backupManager
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPES
// ============================================================================

export interface FileChange {
  filePath: string;
  fileName: string;
  changeType: 'new' | 'modified' | 'deleted';
  linesAdded: number;
  linesRemoved: number;
  linesModified: number;
  oldContent: string;
  newContent: string;
  timestamp: number;
  backupPath?: string;
  diffLines?: DiffLine[];
}

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'separator';
  lineNumber?: number;
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

interface ChangeSession {
  id: string;
  timestamp: number;
  userMessage: string;
  files: FileChange[];
  reverted: boolean;
}

// ============================================================================
// STATE
// ============================================================================

const sessions: ChangeSession[] = [];
let panelElement: HTMLElement | null = null;
let isMinimized = false;
let autoHideTimer: ReturnType<typeof setTimeout> | null = null;
let styleInjected = false;

// ============================================================================
// STYLES
// ============================================================================

function injectStyles(): void {
  if (styleInjected) return;
  styleInjected = true;

  const style = document.createElement('style');
  style.id = 'change-summary-styles';
  style.textContent = `
    /* ====== Change Summary Panel ====== */
    .csp-panel {
      position: fixed;
      bottom: 32px;
      left: 50%;
      margin-left: -240px;
      width: 480px;
      max-height: 600px;
      background: #1a1d23;
      border: 1px solid rgba(124, 77, 255, 0.35);
      border-radius: 10px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.55), 0 0 1px rgba(124, 77, 255, 0.3);
      z-index: 10000;
      font-family: 'Segoe UI', -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: cspSlideIn 0.25s ease-out;
      backdrop-filter: blur(12px);
    }


    /* Status bar badge */
    .csp-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 10px;
      font-size: 11px;
      color: #c0c0c0;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;
      white-space: nowrap;
      font-family: 'Segoe UI', -apple-system, sans-serif;
    }
    .csp-status-badge:hover {
      background: rgba(124, 77, 255, 0.15);
      color: #e0e0e0;
    }
    .csp-badge-icon { font-size: 12px; }
    .csp-badge-count { font-weight: 600; color: #7c4dff; }
    .csp-badge-stats { font-size: 10px; }
    .csp-badge-pulse {
      animation: cspBadgePulse 1.5s ease-out;
    }
    @keyframes cspBadgePulse {
      0% { background: rgba(124, 77, 255, 0.3); }
      100% { background: transparent; }
    }

    @keyframes cspSlideIn {
      from { opacity: 0; transform: translateY(20px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes cspSlideOut {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to   { opacity: 0; transform: translateY(20px) scale(0.97); }
    }

    .csp-panel.csp-minimized {
      max-height: 42px;
      width: 300px;
      cursor: pointer;
      bottom: 36px;
      margin-left: -150px;
    }

    /* Header */
    .csp-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: linear-gradient(135deg, rgba(124, 77, 255, 0.15), rgba(79, 195, 247, 0.08));
      border-bottom: 1px solid rgba(124, 77, 255, 0.2);
      cursor: pointer;
      user-select: none;
    }

    .csp-header:hover {
      background: linear-gradient(135deg, rgba(124, 77, 255, 0.22), rgba(79, 195, 247, 0.12));
    }

    .csp-header-icon {
      width: 18px;
      height: 18px;
      color: #7c4dff;
      flex-shrink: 0;
    }

    .csp-header-title {
      font-size: 12.5px;
      font-weight: 600;
      color: #e0e0e0;
      flex: 1;
    }

    .csp-header-badge {
      background: #7c4dff;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 7px;
      border-radius: 10px;
      min-width: 16px;
      text-align: center;
    }

    .csp-header-actions {
      display: flex;
      gap: 4px;
    }

    .csp-btn-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: #888;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .csp-btn-icon:hover {
      background: rgba(255,255,255,0.08);
      color: #ccc;
    }

    /* Body */
    .csp-body {
      overflow-y: auto;
      max-height: 400px;
      padding: 6px 0;
    }

    .csp-body::-webkit-scrollbar { width: 5px; }
    .csp-body::-webkit-scrollbar-track { background: transparent; }
    .csp-body::-webkit-scrollbar-thumb { background: rgba(124, 77, 255, 0.3); border-radius: 3px; }

    /* File Entry */
    .csp-file {
      margin: 3px 8px;
      border-radius: 7px;
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.05);
      overflow: hidden;
      transition: border-color 0.15s;
    }

    .csp-file:hover {
      border-color: rgba(124, 77, 255, 0.25);
    }

    .csp-file.csp-file-reverted {
      opacity: 0.45;
    }

    .csp-file-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      cursor: pointer;
      user-select: none;
    }

    .csp-file-header:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    /* Change type badges */
    .csp-badge {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .csp-badge-new {
      background: rgba(76, 175, 80, 0.2);
      color: #66bb6a;
      border: 1px solid rgba(76, 175, 80, 0.3);
    }

    .csp-badge-modified {
      background: rgba(255, 183, 77, 0.15);
      color: #ffb74d;
      border: 1px solid rgba(255, 183, 77, 0.25);
    }

    .csp-badge-deleted {
      background: rgba(244, 67, 54, 0.15);
      color: #ef5350;
      border: 1px solid rgba(244, 67, 54, 0.25);
    }

    .csp-file-name {
      font-size: 12px;
      font-weight: 500;
      color: #d0d0d0;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .csp-file-stats {
      display: flex;
      gap: 8px;
      font-size: 11px;
      flex-shrink: 0;
    }

    .csp-stat-add { color: #66bb6a; }
    .csp-stat-rem { color: #ef5350; }

    .csp-file-actions {
      display: flex;
      gap: 3px;
      flex-shrink: 0;
    }

    .csp-btn-sm {
      font-size: 10px;
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04);
      color: #aaa;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }

    .csp-btn-sm:hover {
      background: rgba(255,255,255,0.1);
      color: #ddd;
      border-color: rgba(255,255,255,0.2);
    }

    .csp-btn-undo {
      border-color: rgba(255, 183, 77, 0.3);
      color: #ffb74d;
    }

    .csp-btn-undo:hover {
      background: rgba(255, 183, 77, 0.15);
      color: #ffc94d;
    }

    .csp-btn-undo.csp-reverted {
      border-color: rgba(76, 175, 80, 0.3);
      color: #66bb6a;
      pointer-events: none;
    }

    /* Diff view */
    .csp-diff {
      display: none;
      border-top: 1px solid rgba(255,255,255,0.05);
      max-height: 200px;
      overflow-y: auto;
      font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
      font-size: 11px;
      line-height: 1.55;
    }

    .csp-diff.csp-diff-open {
      display: block;
    }

    .csp-diff::-webkit-scrollbar { width: 4px; height: 4px; }
    .csp-diff::-webkit-scrollbar-thumb { background: rgba(124, 77, 255, 0.25); border-radius: 2px; }

    .csp-diff-line {
      display: flex;
      padding: 0 8px;
      white-space: pre;
      min-height: 18px;
    }

    .csp-diff-ln {
      width: 35px;
      text-align: right;
      color: #555;
      padding-right: 8px;
      flex-shrink: 0;
      user-select: none;
    }

    .csp-diff-sign {
      width: 14px;
      flex-shrink: 0;
      text-align: center;
      font-weight: 600;
    }

    .csp-diff-code {
      flex: 1;
      overflow-x: auto;
    }

    .csp-diff-add {
      background: rgba(76, 175, 80, 0.08);
    }
    .csp-diff-add .csp-diff-sign { color: #66bb6a; }
    .csp-diff-add .csp-diff-code { color: #a5d6a7; }

    .csp-diff-remove {
      background: rgba(244, 67, 54, 0.08);
    }
    .csp-diff-remove .csp-diff-sign { color: #ef5350; }
    .csp-diff-remove .csp-diff-code { color: #ef9a9a; }

    .csp-diff-context .csp-diff-code { color: #777; }

    .csp-diff-sep {
      color: #555;
      padding: 2px 8px;
      font-style: italic;
      background: rgba(255,255,255,0.02);
    }

    /* Footer */
    .csp-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-top: 1px solid rgba(255,255,255,0.06);
      background: rgba(0,0,0,0.15);
    }

    .csp-footer-info {
      flex: 1;
      font-size: 11px;
      color: #777;
    }

    .csp-btn-undo-all {
      font-size: 11px;
      padding: 4px 12px;
      border-radius: 5px;
      border: 1px solid rgba(255, 183, 77, 0.35);
      background: rgba(255, 183, 77, 0.1);
      color: #ffb74d;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.15s;
    }

    .csp-btn-undo-all:hover {
      background: rgba(255, 183, 77, 0.2);
      border-color: rgba(255, 183, 77, 0.5);
    }

    /* Toast notification */
    .csp-toast {
      position: fixed;
      bottom: 70px;
      left: 50%;
      margin-left: -120px;
      background: #1e2128;
      border: 1px solid rgba(124, 77, 255, 0.3);
      border-radius: 8px;
      padding: 10px 16px;
      color: #d0d0d0;
      font-size: 12px;
      z-index: 10001;
      animation: cspSlideIn 0.2s ease-out;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }

    .csp-toast.csp-toast-hide {
      animation: cspSlideOut 0.2s ease-in forwards;
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// DIFF COMPUTATION
// ============================================================================

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const diff: DiffLine[] = [];

  // Simple LCS-based diff
  const lcs = computeLCS(oldLines, newLines);
  let oi = 0, ni = 0, li = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    if (li < lcs.length && oi < oldLines.length && oldLines[oi] === lcs[li]) {
      if (ni < newLines.length && newLines[ni] === lcs[li]) {
        // Context line
        diff.push({ type: 'context', oldLineNumber: oi + 1, newLineNumber: ni + 1, content: oldLines[oi] });
        oi++; ni++; li++;
      } else if (ni < newLines.length) {
        diff.push({ type: 'add', newLineNumber: ni + 1, content: newLines[ni] });
        ni++;
      } else {
        diff.push({ type: 'remove', oldLineNumber: oi + 1, content: oldLines[oi] });
        oi++;
      }
    } else if (ni < newLines.length && li < lcs.length && newLines[ni] === lcs[li]) {
      diff.push({ type: 'remove', oldLineNumber: oi + 1, content: oldLines[oi] });
      oi++;
    } else {
      if (oi < oldLines.length && ni < newLines.length) {
        diff.push({ type: 'remove', oldLineNumber: oi + 1, content: oldLines[oi] });
        diff.push({ type: 'add', newLineNumber: ni + 1, content: newLines[ni] });
        oi++; ni++;
      } else if (oi < oldLines.length) {
        diff.push({ type: 'remove', oldLineNumber: oi + 1, content: oldLines[oi] });
        oi++;
      } else if (ni < newLines.length) {
        diff.push({ type: 'add', newLineNumber: ni + 1, content: newLines[ni] });
        ni++;
      }
    }
  }

  return collapseDiff(diff);
}

function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length, n = b.length;
  // For very large files, use simplified approach
  if (m > 2000 || n > 2000) return simpleLCS(a, b);

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const result: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { result.unshift(a[i - 1]); i--; j--; }
    else if (dp[i - 1][j] > dp[i][j - 1]) i--;
    else j--;
  }
  return result;
}

function simpleLCS(a: string[], b: string[]): string[] {
  // For large files: hash-based matching of unique lines
  const result: string[] = [];
  const bSet = new Set(b);
  for (const line of a) {
    if (bSet.has(line)) result.push(line);
  }
  return result;
}

function collapseDiff(diff: DiffLine[]): DiffLine[] {
  // Show only 3 context lines around changes, collapse the rest
  const CONTEXT = 3;
  const isChange = (d: DiffLine) => d.type === 'add' || d.type === 'remove';
  const changeIndices = new Set<number>();

  diff.forEach((d, i) => {
    if (isChange(d)) {
      for (let j = Math.max(0, i - CONTEXT); j <= Math.min(diff.length - 1, i + CONTEXT); j++) {
        changeIndices.add(j);
      }
    }
  });

  // If everything is a change (new file), just return all as-is
  if (diff.every(d => d.type === 'add')) return diff;

  const collapsed: DiffLine[] = [];
  let lastIncluded = -1;

  for (let i = 0; i < diff.length; i++) {
    if (changeIndices.has(i)) {
      if (lastIncluded >= 0 && i - lastIncluded > 1) {
        const skipped = i - lastIncluded - 1;
        collapsed.push({ type: 'separator', content: `··· ${skipped} unchanged lines ···` });
      }
      collapsed.push(diff[i]);
      lastIncluded = i;
    }
  }

  if (lastIncluded < diff.length - 1) {
    const skipped = diff.length - 1 - lastIncluded;
    if (skipped > 0) {
      collapsed.push({ type: 'separator', content: `··· ${skipped} unchanged lines ···` });
    }
  }

  return collapsed;
}

// ============================================================================
// CHANGE TRACKING
// ============================================================================

/**
 * Record a file change made by auto mode.
 * Call this from autonomousCoding.ts or ideScriptBridge.ts after applying code.
 */
export function recordFileChange(change: {
  filePath: string;
  oldContent: string;
  newContent: string;
  userMessage?: string;
  backupPath?: string;
}): void {
  const fileName = getFileName(change.filePath);
  const isNew = !change.oldContent || change.oldContent.trim() === '';

  const oldLines = (change.oldContent || '').split('\n');
  const newLines = change.newContent.split('\n');

  let linesAdded = 0, linesRemoved = 0, linesModified = 0;

  if (isNew) {
    linesAdded = newLines.length;
  } else {
    const diffLines = computeDiff(change.oldContent, change.newContent);
    linesAdded = diffLines.filter(d => d.type === 'add').length;
    linesRemoved = diffLines.filter(d => d.type === 'remove').length;
    // Pair up adjacent remove+add as "modified"
    linesModified = Math.min(linesAdded, linesRemoved);
    linesAdded -= linesModified;
    linesRemoved -= linesModified;
  }

  const fileChange: FileChange = {
    filePath: change.filePath,
    fileName,
    changeType: isNew ? 'new' : 'modified',
    linesAdded,
    linesRemoved,
    linesModified,
    oldContent: change.oldContent || '',
    newContent: change.newContent,
    timestamp: Date.now(),
    backupPath: change.backupPath,
    diffLines: isNew ? undefined : computeDiff(change.oldContent, change.newContent),
  };

  // Add to current session or create new one
  const now = Date.now();
  let currentSession = sessions[sessions.length - 1];

  // Group changes within 5 seconds into same session
  if (!currentSession || now - currentSession.timestamp > 5000) {
    currentSession = {
      id: `cs_${now}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      userMessage: change.userMessage || '',
      files: [],
      reverted: false,
    };
    sessions.push(currentSession);
  }

  currentSession.files.push(fileChange);

  console.log(`📝 [ChangeSummary] Recorded: ${fileName} (${fileChange.changeType}, +${linesAdded} -${linesRemoved} ~${linesModified})`);

  // Show/update the panel
  showPanel(currentSession);
}

// ============================================================================
// UI RENDERING
// ============================================================================

function showPanel(session: ChangeSession): void {
  injectStyles();
  updateStatusBadge(session);

  if (panelElement) {
    // Update existing panel
    updatePanelContent(session);
    // Un-minimize briefly to show new changes, then auto-hide
    if (isMinimized) {
      isMinimized = false;
      panelElement.classList.remove('csp-minimized');
    }
    scheduleAutoHide();
    return;
  }

  panelElement = document.createElement('div');
  panelElement.className = 'csp-panel';
  panelElement.innerHTML = buildPanelHTML(session);
  document.body.appendChild(panelElement);

  attachPanelEvents(session);
  scheduleAutoHide();
}

function scheduleAutoHide(): void {
  if (autoHideTimer) clearTimeout(autoHideTimer);
  autoHideTimer = setTimeout(() => {
    if (panelElement && !isMinimized) {
      isMinimized = true;
      panelElement.classList.add('csp-minimized');
    }
  }, 5000);
}

function updateStatusBadge(session: ChangeSession): void {
  let badge = document.querySelector('.csp-status-badge') as HTMLElement;
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'csp-status-badge';
    badge.title = 'AI Changes — Click to toggle panel';
    badge.addEventListener('click', () => {
      if (!panelElement) {
        showChangeSummary();
      } else if (isMinimized) {
        isMinimized = false;
        panelElement.classList.remove('csp-minimized');
        if (autoHideTimer) clearTimeout(autoHideTimer);
      } else {
        isMinimized = true;
        panelElement.classList.add('csp-minimized');
      }
    });
    // Insert into status bar
    const statusBar = document.querySelector('.unified-status-bar') 
      || document.querySelector('.status-bar')
      || document.querySelector('[class*="status-bar"]');
    if (statusBar) {
      statusBar.appendChild(badge);
    } else {
      // Fallback: fixed bottom-left
      badge.style.position = 'fixed';
      badge.style.bottom = '4px';
      badge.style.left = '16px';
      badge.style.zIndex = '10001';
      document.body.appendChild(badge);
    }
  }
  const fileCount = session.files.length;
  const totalAdded = session.files.reduce((s, f) => s + f.linesAdded, 0);
  const totalRemoved = session.files.reduce((s, f) => s + f.linesRemoved, 0);
  badge.innerHTML = `<span class="csp-badge-icon">✨</span> <span class="csp-badge-count">${fileCount} file${fileCount !== 1 ? 's' : ''}</span> <span class="csp-badge-stats" style="opacity:0.6">+${totalAdded} -${totalRemoved}</span>`;
  badge.classList.add('csp-badge-pulse');
  setTimeout(() => badge.classList.remove('csp-badge-pulse'), 1500);
}

function buildPanelHTML(session: ChangeSession): string {
  const totalAdded = session.files.reduce((s, f) => s + f.linesAdded, 0);
  const totalRemoved = session.files.reduce((s, f) => s + f.linesRemoved, 0);
  const totalModified = session.files.reduce((s, f) => s + f.linesModified, 0);
  const totalChanges = totalAdded + totalRemoved + totalModified;

  return `
    <div class="csp-header" data-action="toggle-minimize">
      <svg class="csp-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <path d="M12 18v-6M9 15l3 3 3-3"/>
      </svg>
      <span class="csp-header-title">Auto Mode Changes</span>
      <span class="csp-header-badge">${session.files.length} file${session.files.length > 1 ? 's' : ''}</span>
      <div class="csp-header-actions">
        <button class="csp-btn-icon" data-action="minimize" title="Minimize">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button class="csp-btn-icon" data-action="close" title="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
    <div class="csp-body">
      ${session.files.map((f, i) => buildFileHTML(f, i)).join('')}
    </div>
    <div class="csp-footer">
      <span class="csp-footer-info">
        <span class="csp-stat-add">+${totalAdded}</span>&nbsp;
        <span class="csp-stat-rem">-${totalRemoved}</span>&nbsp;
        <span style="color:#ffb74d">~${totalModified}</span>&nbsp;
        <span style="color:#666">(${totalChanges} total)</span>
      </span>
      <button class="csp-btn-undo-all" data-action="undo-all" data-session="${session.id}">
        ↩ Undo All
      </button>
    </div>
  `;
}

function buildFileHTML(file: FileChange, index: number): string {
  const badgeClass = `csp-badge csp-badge-${file.changeType}`;
  const badgeLabel = file.changeType === 'new' ? 'NEW' : file.changeType === 'modified' ? 'MODIFIED' : 'DELETED';

  const stats = [];
  if (file.linesAdded > 0) stats.push(`<span class="csp-stat-add">+${file.linesAdded}</span>`);
  if (file.linesRemoved > 0) stats.push(`<span class="csp-stat-rem">-${file.linesRemoved}</span>`);
  if (file.linesModified > 0) stats.push(`<span style="color:#ffb74d">~${file.linesModified}</span>`);

  const diffHTML = file.diffLines ? buildDiffHTML(file.diffLines) : buildNewFileDiffHTML(file.newContent);

  return `
    <div class="csp-file" data-file-index="${index}" data-file-path="${escapeAttr(file.filePath)}">
      <div class="csp-file-header">
        <span class="${badgeClass}">${badgeLabel}</span>
        <span class="csp-file-name" title="${escapeAttr(file.filePath)}">${escapeHtml(file.fileName)}</span>
        <span class="csp-file-stats">${stats.join(' ')}</span>
        <div class="csp-file-actions">
          <button class="csp-btn-sm" data-action="diff" data-index="${index}" title="Toggle diff">Diff</button>
          <button class="csp-btn-sm" data-action="goto" data-path="${escapeAttr(file.filePath)}" title="Open file">Open</button>
          <button class="csp-btn-sm csp-btn-undo" data-action="undo" data-index="${index}" title="Undo this file">Undo</button>
        </div>
      </div>
      <div class="csp-diff" data-diff-index="${index}">
        ${diffHTML}
      </div>
    </div>
  `;
}

function buildDiffHTML(diffLines: DiffLine[]): string {
  return diffLines.map(d => {
    if (d.type === 'separator') {
      return `<div class="csp-diff-line csp-diff-sep">${escapeHtml(d.content)}</div>`;
    }
    const cls = d.type === 'add' ? 'csp-diff-add' : d.type === 'remove' ? 'csp-diff-remove' : 'csp-diff-context';
    const sign = d.type === 'add' ? '+' : d.type === 'remove' ? '-' : ' ';
    const ln = d.type === 'remove' ? (d.oldLineNumber || '') : (d.newLineNumber || '');
    return `<div class="csp-diff-line ${cls}"><span class="csp-diff-ln">${ln}</span><span class="csp-diff-sign">${sign}</span><span class="csp-diff-code">${escapeHtml(d.content)}</span></div>`;
  }).join('');
}

function buildNewFileDiffHTML(content: string): string {
  const lines = content.split('\n');
  return lines.map((line, i) => {
    return `<div class="csp-diff-line csp-diff-add"><span class="csp-diff-ln">${i + 1}</span><span class="csp-diff-sign">+</span><span class="csp-diff-code">${escapeHtml(line)}</span></div>`;
  }).join('');
}

function updatePanelContent(session: ChangeSession): void {
  if (!panelElement) return;
  panelElement.innerHTML = buildPanelHTML(session);
  attachPanelEvents(session);

  // Flash effect
  panelElement.style.borderColor = 'rgba(124, 77, 255, 0.6)';
  setTimeout(() => {
    if (panelElement) panelElement.style.borderColor = 'rgba(124, 77, 255, 0.35)';
  }, 500);
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function attachPanelEvents(session: ChangeSession): void {
  if (!panelElement) return;

  // Pause auto-hide on hover
  panelElement.addEventListener('mouseenter', () => {
    if (autoHideTimer) { clearTimeout(autoHideTimer); autoHideTimer = null; }
  });
  panelElement.addEventListener('mouseleave', () => {
    if (!isMinimized) scheduleAutoHide();
  });

  panelElement.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest('[data-action]') as HTMLElement;
    if (!btn) return;

    const action = btn.dataset.action;

    switch (action) {
      case 'close':
        closePanel();
        break;

      case 'minimize':
      case 'toggle-minimize':
        toggleMinimize();
        break;

      case 'diff': {
        const idx = parseInt(btn.dataset.index || '0');
        toggleDiff(idx);
        break;
      }

      case 'goto': {
        const path = btn.dataset.path || '';
        openFileInEditor(path);
        break;
      }

      case 'undo': {
        const idx = parseInt(btn.dataset.index || '0');
        await undoFileChange(session, idx);
        break;
      }

      case 'undo-all': {
        await undoAllChanges(session);
        break;
      }
    }
  });
}

function toggleMinimize(): void {
  if (!panelElement) return;
  isMinimized = !isMinimized;
  panelElement.classList.toggle('csp-minimized', isMinimized);
}

function toggleDiff(index: number): void {
  if (!panelElement) return;
  const diffEl = panelElement.querySelector(`[data-diff-index="${index}"]`) as HTMLElement;
  if (diffEl) {
    diffEl.classList.toggle('csp-diff-open');
  }
}

function closePanel(): void {
  if (!panelElement) return;
  if (autoHideTimer) { clearTimeout(autoHideTimer); autoHideTimer = null; }
  panelElement.style.animation = 'cspSlideOut 0.2s ease-in forwards';
  setTimeout(() => {
    panelElement?.remove();
    panelElement = null;
    isMinimized = false;
  }, 200);
  // Remove badge
  const badge = document.querySelector('.csp-status-badge');
  if (badge) badge.remove();
}

function openFileInEditor(filePath: string): void {
  // Dispatch event for the IDE to open the file
  document.dispatchEvent(new CustomEvent('open-file', { detail: { path: filePath } }));

  // Also try direct methods
  if ((window as any).editorManager?.openFile) {
    (window as any).editorManager.openFile(filePath);
  } else if ((window as any).tabManager?.addTab) {
    import('../fileSystem').then(({ readFile }) => {
      readFile(filePath).then((content: string | null) => {
        if (content !== null) {
          (window as any).tabManager.addTab(filePath, content);
        }
      });
    }).catch(() => {});
  }
}

// ============================================================================
// UNDO OPERATIONS
// ============================================================================

async function undoFileChange(session: ChangeSession, fileIndex: number): Promise<void> {
  const file = session.files[fileIndex];
  if (!file) return;

  try {
    if (file.changeType === 'new') {
      // Delete the newly created file
      await invoke('delete_path', { path: file.filePath });
      showToast(`🗑️ Deleted: ${file.fileName}`);
    } else if (file.oldContent) {
      // Restore old content
      await invoke('write_file', { path: file.filePath, content: file.oldContent });
      showToast(`↩ Restored: ${file.fileName}`);

      // Update editor if file is open
      const editor = (window as any).monacoEditor;
      if (editor) {
        const model = editor.getModel();
        if (model && model.uri.path.replace(/^\//, '').replace(/\//g, '\\') === file.filePath.replace(/\//g, '\\')) {
          model.setValue(file.oldContent);
        }
      }
    }

    // Mark as reverted in UI
    if (panelElement) {
      const fileEl = panelElement.querySelector(`[data-file-index="${fileIndex}"]`);
      if (fileEl) {
        fileEl.classList.add('csp-file-reverted');
        const undoBtn = fileEl.querySelector('[data-action="undo"]');
        if (undoBtn) {
          undoBtn.classList.add('csp-reverted');
          undoBtn.textContent = '✓ Undone';
        }
      }
    }

    // Refresh file explorer
    document.dispatchEvent(new CustomEvent('file-tree-refresh'));

    console.log(`↩ [ChangeSummary] Undone: ${file.fileName}`);

  } catch (err) {
    console.error(`❌ [ChangeSummary] Undo failed for ${file.fileName}:`, err);
    showToast(`❌ Undo failed: ${file.fileName}`);
  }
}

async function undoAllChanges(session: ChangeSession): Promise<void> {
  let undoneCount = 0;

  for (let i = session.files.length - 1; i >= 0; i--) {
    const fileEl = panelElement?.querySelector(`[data-file-index="${i}"]`);
    if (fileEl?.classList.contains('csp-file-reverted')) continue; // Skip already undone

    await undoFileChange(session, i);
    undoneCount++;
  }

  session.reverted = true;
  showToast(`↩ Undone ${undoneCount} file${undoneCount > 1 ? 's' : ''}`);

  // Update undo all button
  if (panelElement) {
    const undoAllBtn = panelElement.querySelector('[data-action="undo-all"]') as HTMLElement;
    if (undoAllBtn) {
      undoAllBtn.textContent = '✓ All Undone';
      undoAllBtn.style.pointerEvents = 'none';
      undoAllBtn.style.opacity = '0.5';
    }
  }
}

// ============================================================================
// TOAST NOTIFICATION
// ============================================================================

function showToast(message: string): void {
  const existing = document.querySelector('.csp-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'csp-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('csp-toast-hide');
    setTimeout(() => toast.remove(), 200);
  }, 2500);
}

// ============================================================================
// UTILITIES
// ============================================================================

function getFileName(path: string): string {
  return path.split(/[/\\]/).pop() || path;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(text: string): string {
  return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get all change sessions
 */
export function getChangeSessions(): ChangeSession[] {
  return [...sessions];
}

/**
 * Get the latest session
 */
export function getLatestSession(): ChangeSession | null {
  return sessions[sessions.length - 1] || null;
}

/**
 * Clear all change history
 */
export function clearHistory(): void {
  sessions.length = 0;
  closePanel();
  console.log('🗑️ [ChangeSummary] History cleared');
}

/**
 * Manually show the panel for the latest session
 */
export function showChangeSummary(): void {
  const latest = getLatestSession();
  if (latest) {
    showPanel(latest);
  } else {
    showToast('No recent changes');
  }
}

// ============================================================================
// WINDOW EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).changeSummary = {
    record: recordFileChange,
    show: showChangeSummary,
    sessions: getChangeSessions,
    latest: getLatestSession,
    clear: clearHistory,
  };
}

console.log('✅ [ChangeSummary] Module loaded');
