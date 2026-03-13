// ============================================================================
// changeIndicator.ts - Line-level change decorations for Monaco editor
// Listens to ide-script-activity events for ALL write commands:
//   ide_patch, ide_insert, ide_create_file
// Green (added), Yellow (modified), Red (deleted) gutter + line highlights
// ============================================================================

let activeDecorations: string[] = [];
let fadeTimeout: ReturnType<typeof setTimeout> | null = null;
let styleInjected = false;
const pendingSnapshots: Map<string, string> = new Map();
const diffTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
const WRITE_COMMANDS = ['ide_patch', 'ide_insert', 'ide_create_file'];

function injectChangeStyles(): void {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.id = 'change-indicator-styles';
  style.textContent = `
    .ci-added-gutter { background: #28a745 !important; width: 3px !important; margin-left: 3px; border-radius: 1px; }
    .ci-added-line { background: rgba(40, 167, 69, 0.10) !important; }
    .ci-modified-gutter { background: #e3b341 !important; width: 3px !important; margin-left: 3px; border-radius: 1px; }
    .ci-modified-line { background: rgba(227, 179, 65, 0.08) !important; }
    .ci-deleted-gutter { background: transparent !important; width: 0 !important; }
    .ci-summary-toast {
      position: fixed; bottom: 60px; right: 20px; background: #1a1d23;
      border: 1px solid #30363d; border-radius: 8px; padding: 10px 16px;
      color: #e6edf3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px; z-index: 99999; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      animation: ciSlideIn 0.3s ease-out; display: flex; align-items: center; gap: 12px;
    }
    .ci-summary-toast.ci-fade-out { animation: ciFadeOut 0.5s ease-out forwards; }
    .ci-summary-item { display: flex; align-items: center; gap: 4px; }
    .ci-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .ci-dot-added { background: #28a745; }
    .ci-dot-modified { background: #e3b341; }
    .ci-dot-deleted { background: #f85149; }
    @keyframes ciSlideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes ciFadeOut { from { opacity: 1; } to { opacity: 0; transform: translateY(10px); } }
  `;
  document.head.appendChild(style);
}

export interface LineDiff { added: number[]; modified: number[]; deleted: number[]; }

export function computeLineDiff(oldContent: string, newContent: string): LineDiff {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  if (oldLines.length > 5000 || newLines.length > 5000) return simpleComparison(oldLines, newLines);
  const m = oldLines.length, n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    dp[i][j] = oldLines[i-1] === newLines[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
  const matchedOld = new Set<number>(), matchedNew = new Set<number>();
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (oldLines[i-1] === newLines[j-1]) { matchedOld.add(i); matchedNew.add(j); i--; j--; }
    else if (dp[i-1][j] >= dp[i][j-1]) i--; else j--;
  }
  const unmatchedOld: number[] = [], unmatchedNew: number[] = [];
  for (let k = 1; k <= m; k++) if (!matchedOld.has(k)) unmatchedOld.push(k);
  for (let k = 1; k <= n; k++) if (!matchedNew.has(k)) unmatchedNew.push(k);
  const added: number[] = [], modified: number[] = [], deleted: number[] = [];
  const pairedNew = new Set<number>(), pairedOld = new Set<number>();
  for (const oLine of unmatchedOld) {
    let best = -1, bestDist = Infinity;
    for (const nLine of unmatchedNew) {
      if (pairedNew.has(nLine)) continue;
      const d = Math.abs(oLine - nLine);
      if (d < bestDist && d <= 3) { bestDist = d; best = nLine; }
    }
    if (best !== -1 && oldLines[oLine-1].trim() !== '' && newLines[best-1].trim() !== '') {
      modified.push(best); pairedNew.add(best); pairedOld.add(oLine);
    }
  }
  for (const nLine of unmatchedNew) if (!pairedNew.has(nLine)) added.push(nLine);
  for (const oLine of unmatchedOld) if (!pairedOld.has(oLine)) deleted.push(Math.max(1, Math.min(oLine, n)));
  return { added, modified, deleted };
}

function simpleComparison(oldLines: string[], newLines: string[]): LineDiff {
  const added: number[] = [], modified: number[] = [], deleted: number[] = [];
  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    if (i >= oldLines.length) added.push(i + 1);
    else if (i >= newLines.length) deleted.push(Math.min(i + 1, newLines.length) || 1);
    else if (oldLines[i] !== newLines[i]) modified.push(i + 1);
  }
  return { added, modified, deleted };
}

export function applyChangeDecorations(editor: any, diff: LineDiff, autoFadeMs: number = 30000): void {
  injectChangeStyles();
  if (!editor?.deltaDecorations) return;
  const decorations: any[] = [];
  for (const line of diff.added) decorations.push({
    range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
    options: { isWholeLine: true, linesDecorationsClassName: 'ci-added-gutter', className: 'ci-added-line', overviewRuler: { color: '#28a745', position: 1 } }
  });
  for (const line of diff.modified) decorations.push({
    range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
    options: { isWholeLine: true, linesDecorationsClassName: 'ci-modified-gutter', className: 'ci-modified-line', overviewRuler: { color: '#e3b341', position: 1 } }
  });
  for (const line of diff.deleted) decorations.push({
    range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
    options: { isWholeLine: false, linesDecorationsClassName: 'ci-deleted-gutter', overviewRuler: { color: '#f85149', position: 1 } }
  });
  activeDecorations = editor.deltaDecorations(activeDecorations, decorations);
  const tag = '[ChangeIndicator]';
  console.log(tag + ' Applied: +' + diff.added.length + ' ~' + diff.modified.length + ' -' + diff.deleted.length);
  showSummaryToast(diff);
  if (fadeTimeout) clearTimeout(fadeTimeout);
  fadeTimeout = setTimeout(() => clearDecorations(editor), autoFadeMs);
}

export function clearDecorations(editor?: any): void {
  if (editor?.deltaDecorations) activeDecorations = editor.deltaDecorations(activeDecorations, []);
  document.querySelector('.ci-summary-toast')?.remove();
  if (fadeTimeout) { clearTimeout(fadeTimeout); fadeTimeout = null; }
}

function showSummaryToast(diff: LineDiff): void {
  document.querySelector('.ci-summary-toast')?.remove();
  const total = diff.added.length + diff.modified.length + diff.deleted.length;
  if (total === 0) return;
  const toast = document.createElement('div');
  toast.className = 'ci-summary-toast';
  let html = '';
  if (diff.added.length > 0) html += '<span class="ci-summary-item"><span class="ci-dot ci-dot-added"></span> +' + diff.added.length + ' added</span>';
  if (diff.modified.length > 0) html += '<span class="ci-summary-item"><span class="ci-dot ci-dot-modified"></span> ~' + diff.modified.length + ' modified</span>';
  if (diff.deleted.length > 0) html += '<span class="ci-summary-item"><span class="ci-dot ci-dot-deleted"></span> -' + diff.deleted.length + ' deleted</span>';
  toast.innerHTML = html;
  document.body.appendChild(toast);
  setTimeout(() => { toast.classList.add('ci-fade-out'); setTimeout(() => toast.remove(), 500); }, 8000);
}

export function showChanges(editor: any, oldContent: string, newContent: string, autoFadeMs?: number): LineDiff {
  const diff = computeLineDiff(oldContent, newContent);
  applyChangeDecorations(editor, diff, autoFadeMs);
  return diff;
}

// === EVENT-BASED AUTO HOOK ===

function getFilePath(args: any): string { return args?.file_path || args?.filePath || ''; }

function getEditorForFile(filePath: string): any | null {
  const editors = (window as any).monaco?.editor?.getEditors?.() || [];
  const fileName = filePath.replace(/\\/g, '/').split('/').pop()?.toLowerCase() || '';
  for (const ed of editors) {
    const uri = ed.getModel?.()?.uri?.toString?.()?.toLowerCase() || '';
    if (uri.includes(fileName)) return ed;
  }
  return editors.length > 0 ? editors[editors.length - 1] : null;
}

function snapshotFromEditor(filePath: string): boolean {
  const editors = (window as any).monaco?.editor?.getEditors?.() || [];
  const fileName = filePath.replace(/\\/g, '/').split('/').pop()?.toLowerCase() || '';
  for (const ed of editors) {
    const uri = ed.getModel?.()?.uri?.toString?.()?.toLowerCase() || '';
    if (uri.includes(fileName)) {
      pendingSnapshots.set(filePath, ed.getValue());
      console.log('[CI] Snapshot from editor: ' + fileName + ' (' + ed.getValue().length + ' chars)');
      return true;
    }
  }
  return false;
}

async function snapshotFromDisk(filePath: string): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result: any = await invoke('ide_read_file', { filePath });
    if (result?.success && result?.content) {
      pendingSnapshots.set(filePath, result.content);
      console.log('[CI] Snapshot from disk: ' + (filePath.split(/[/\\]/).pop() || '') + ' (' + result.content.length + ' chars)');
    }
  } catch (_e) {
    pendingSnapshots.set(filePath, '');
    console.log('[CI] New file snapshot (empty)');
  }
}

function scheduleDiffApply(filePath: string): void {
  const existing = diffTimers.get(filePath);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(async () => {
    diffTimers.delete(filePath);
    const oldContent = pendingSnapshots.get(filePath);
    if (oldContent === undefined) { console.log('[CI] No snapshot for: ' + (filePath.split(/[/\\]/).pop() || '')); return; }
    let newContent = '';
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result: any = await invoke('ide_read_file', { filePath });
      if (result?.success) newContent = result.content || '';
    } catch (_e) {
      const ed = getEditorForFile(filePath);
      if (ed) newContent = ed.getValue() || '';
    }
    if (!newContent || newContent === oldContent) {
      console.log('[CI] No changes detected for: ' + (filePath.split(/[/\\]/).pop() || ''));
      pendingSnapshots.delete(filePath);
      return;
    }
    const tryApply = (attempt: number) => {
      const editor = getEditorForFile(filePath);
      if (editor) {
        const editorContent = editor.getValue();
        if (editorContent !== newContent) editor.setValue(newContent);
        showChanges(editor, oldContent, newContent);
        pendingSnapshots.delete(filePath);
        console.log('[CI] Diff applied for: ' + (filePath.split(/[/\\]/).pop() || ''));
      } else if (attempt < 5) {
        setTimeout(() => tryApply(attempt + 1), 500);
      } else {
        console.warn('[CI] No editor found after retries: ' + (filePath.split(/[/\\]/).pop() || ''));
        pendingSnapshots.delete(filePath);
      }
    };
    if ((window as any).openFileInTab) (window as any).openFileInTab(filePath);
    setTimeout(() => tryApply(0), 600);
  }, 1500);
  diffTimers.set(filePath, timer);
}

function setupEventListeners(): void {
  window.addEventListener('ide-script-activity', (event: any) => {
    const detail = event.detail;
    if (!detail) return;
    const { command, args, status, result } = detail;
    const filePath = getFilePath(args);
    if (!filePath || !WRITE_COMMANDS.includes(command)) return;
    if (status === 'started') {
      if (!pendingSnapshots.has(filePath)) {
        if (!snapshotFromEditor(filePath)) snapshotFromDisk(filePath);
      }
    }
    if (status === 'completed' && result?.success) {
      scheduleDiffApply(filePath);
      console.log('[CI] Write completed: ' + command + ' > ' + (filePath.split(/[/\\]/).pop() || ''));
    }
  });
  console.log('[ChangeIndicator] Listening for: ' + WRITE_COMMANDS.join(', '));
}

setupEventListeners();
(window as any).__changeIndicator = { showChanges, computeLineDiff, applyChangeDecorations, clearDecorations };
console.log('[ChangeIndicator] Module loaded (event-based v2)');

