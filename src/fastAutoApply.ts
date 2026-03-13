// fastAutoApply.ts - High-Performance Code Application Module
// ============================================================================
// Provides instant code application to replace slow line-by-line animation
// Usage: import { initFastApply, setSpeedMode } from './fastAutoApply';
// ============================================================================

/**
 * Speed modes for code application
 * - 'instant': No animation, immediate apply (~10ms)
 * - 'turbo':   Atomic apply with brief flash (~30-50ms) [DEFAULT]
 * - 'fast':    Batched RAF animation (~200-500ms)
 * - 'visual':  Visible line-by-line animation (~2-5s)
 */
type SpeedMode = 'instant' | 'turbo' | 'fast' | 'visual';

let currentSpeedMode: SpeedMode = 'turbo';
let stopFlag = false;

// ============================================================================
// CONFIGURATION
// ============================================================================

export function setSpeedMode(mode: SpeedMode): void {
  currentSpeedMode = mode;
  console.log(`⚡ [FastApply] Speed mode: ${mode}`);
}

export function getSpeedMode(): SpeedMode {
  return currentSpeedMode;
}

export function stopApply(): void {
  stopFlag = true;
}

// ============================================================================
// FAST DIFF - Optimized for speed
// ============================================================================

interface QuickDiff {
  added: number;
  deleted: number;
  modified: number;
  addedLines: number[];
  deletedLines: number[];
  modifiedLines: number[];
}

function quickDiff(oldCode: string, newCode: string): QuickDiff {
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');
  
  const result: QuickDiff = {
    added: 0, deleted: 0, modified: 0,
    addedLines: [], deletedLines: [], modifiedLines: []
  };
  
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);
  
  // Find common prefix
  let prefixLen = 0;
  const minLen = Math.min(oldLines.length, newLines.length);
  while (prefixLen < minLen && oldLines[prefixLen] === newLines[prefixLen]) {
    prefixLen++;
  }
  
  // Find common suffix
  let suffixLen = 0;
  while (suffixLen < minLen - prefixLen &&
         oldLines[oldLines.length - 1 - suffixLen] === newLines[newLines.length - 1 - suffixLen]) {
    suffixLen++;
  }
  
  const oldMiddle = oldLines.slice(prefixLen, oldLines.length - suffixLen);
  const newMiddle = newLines.slice(prefixLen, newLines.length - suffixLen);
  const oldMiddleSet = new Set(oldMiddle);
  const newMiddleSet = new Set(newMiddle);
  
  for (let i = 0; i < newMiddle.length; i++) {
    const lineNum = prefixLen + i + 1;
    if (!oldMiddleSet.has(newMiddle[i])) {
      if (i < oldMiddle.length && !newMiddleSet.has(oldMiddle[i])) {
        result.modified++;
        result.modifiedLines.push(lineNum);
      } else {
        result.added++;
        result.addedLines.push(lineNum);
      }
    }
  }
  
  for (let i = 0; i < oldMiddle.length; i++) {
    if (!newMiddleSet.has(oldMiddle[i]) && !(i < newMiddle.length && !oldMiddleSet.has(newMiddle[i]))) {
      result.deleted++;
      result.deletedLines.push(prefixLen + i + 1);
    }
  }
  
  return result;
}

// ============================================================================
// FAST CODE APPLICATION
// ============================================================================

interface ApplyResult {
  success: boolean;
  message: string;
  diff?: QuickDiff;
  timeMs?: number;
}

/**
 * Apply code FAST using configured speed mode
 */
export async function fastApplyCode(
  editor: any,
  newCode: string,
  mode?: SpeedMode
): Promise<ApplyResult> {
  const actualMode = mode || currentSpeedMode;
  const monaco = (window as any).monaco;
  
  const model = editor?.getModel?.();
  if (!model) return { success: false, message: 'No model' };
  
  const oldCode = model.getValue() || '';
  
  // Check if identical
  if (oldCode.trim() === newCode.trim()) {
    return { success: true, message: 'No changes needed', diff: { added: 0, deleted: 0, modified: 0, addedLines: [], deletedLines: [], modifiedLines: [] } };
  }
  
  // Store for undo
  (window as any).__fastApplyOriginal = oldCode;
  
  const start = performance.now();
  const diff = quickDiff(oldCode, newCode);
  
  try {
    // ========== ATOMIC APPLY ==========
    editor.executeEdits('fast-apply', [{
      range: model.getFullModelRange(),
      text: newCode,
      forceMoveMarkers: true
    }]);
    
    // ========== VISUAL FEEDBACK ==========
    if (actualMode !== 'instant' && monaco) {
      const decorations: any[] = [];
      const maxDeco = 30;
      
      for (const line of diff.addedLines.slice(0, maxDeco)) {
        decorations.push({
          range: new monaco.Range(line, 1, line, 1),
          options: { isWholeLine: true, className: 'aca-flash-green', glyphMarginClassName: 'aca-glyph-added' }
        });
      }
      
      for (const line of diff.modifiedLines.slice(0, maxDeco)) {
        decorations.push({
          range: new monaco.Range(line, 1, line, 1),
          options: { isWholeLine: true, className: 'aca-flash-yellow', glyphMarginClassName: 'aca-glyph-modified' }
        });
      }
      
      if (decorations.length > 0) {
        const ids = editor.deltaDecorations([], decorations);
        setTimeout(() => {
          try { editor.deltaDecorations(ids, []); } catch(e) {}
        }, actualMode === 'turbo' ? 400 : 800);
      }
    }
    
    // Scroll to first change
    const firstChange = diff.addedLines[0] || diff.modifiedLines[0];
    if (firstChange) editor.revealLineInCenter(firstChange);
    
    const timeMs = performance.now() - start;
    console.log(`⚡ [FastApply] ${actualMode}: ${timeMs.toFixed(0)}ms (+${diff.added} -${diff.deleted} ~${diff.modified})`);
    
    return { success: true, message: 'Applied', diff, timeMs };
    
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

/**
 * Revert to original code
 */
export function revertCode(editor: any): boolean {
  const original = (window as any).__fastApplyOriginal;
  if (!original) return false;
  
  const model = editor?.getModel?.();
  if (!model) return false;
  
  model.setValue(original);
  (window as any).__fastApplyOriginal = null;
  return true;
}

// ============================================================================
// DROP-IN REPLACEMENT - Override slow applySmartUpdate
// ============================================================================

export async function applySmartUpdateFast(newCode: string): Promise<{ success: boolean; message: string }> {
  const editor = (window as any).monaco?.editor?.getEditors()?.[0];
  if (!editor) return { success: false, message: 'No editor found' };
  
  const model = editor.getModel();
  if (!model) return { success: false, message: 'No file open' };
  
  // ===== TERMINAL GUARD =====
  const fileName = (model.uri?.path?.split('/').pop() || '').toLowerCase();
  const shellExts = ['.sh', '.bash', '.zsh', '.bat', '.cmd', '.ps1'];
  const isShellFile = shellExts.some(ext => fileName.endsWith(ext));
  if (!isShellFile && _isFastApplyTerminalGuard(newCode)) {
    console.log(`🛡️ [FastApply] BLOCKED: Terminal commands cannot replace ${fileName}`);
    return { success: false, message: 'Blocked: terminal commands cannot replace source file' };
  }
  // ===== END GUARD =====
  
  const oldCode = model.getValue();
  
  // Store for reject functionality
  (window as any).originalCodeBeforeApply = oldCode;
  (window as any).hasUnapprovedChanges = true;
  
  // 🔬 Route through Surgical Edit Engine (saves to disk with backup)
  const _sb = (window as any).surgicalBridge;
  if (_sb?.canUse?.()) {
    try {
      const surgResult = await _sb.apply(newCode);
      if (surgResult.success) {
        console.log(`🔬 [FastApply] Surgical engine applied: ${surgResult.message}`);
        const diff = quickDiff(oldCode, newCode);
        (window as any).lastChangeLines = { addedLines: diff.addedLines, deletedLines: diff.deletedLines, modifiedLines: diff.modifiedLines };
        const summary = `+${diff.added} -${diff.deleted} ~${diff.modified}`;
        if (typeof (window as any).showConfirmationBar === 'function') { (window as any).showConfirmationBar(summary); }
        (window as any).isTypingInProgress = false;
        return { success: true, message: surgResult.message };
      }
    } catch (sbErr) {
      console.warn('🔬 [FastApply] Surgical failed, using fast-apply:', sbErr);
    }
  }

  const result = await fastApplyCode(editor, newCode, currentSpeedMode);
  
  if (result.success && result.diff) {
    // Update lastChangeLines for confirmation bar
    (window as any).lastChangeLines = {
      addedLines: result.diff.addedLines,
      deletedLines: result.diff.deletedLines,
      modifiedLines: result.diff.modifiedLines
    };
    
    // Show confirmation bar
    const summary = `+${result.diff.added} -${result.diff.deleted} ~${result.diff.modified}`;
    if (typeof (window as any).showConfirmationBar === 'function') {
      (window as any).showConfirmationBar(summary);
    }
  }
  
  (window as any).isTypingInProgress = false;
  
  return result;
}

// ============================================================================
// INJECT STYLES
// ============================================================================

function injectStyles(): void {
  if (document.getElementById('fast-apply-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'fast-apply-styles';
  style.textContent = `
    .aca-flash-green {
      background: rgba(63, 185, 80, 0.3) !important;
      animation: aca-flash-fade 0.4s ease-out forwards;
    }
    .aca-flash-yellow {
      background: rgba(210, 153, 34, 0.3) !important;
      animation: aca-flash-fade 0.4s ease-out forwards;
    }
    .aca-flash-red {
      background: rgba(248, 81, 73, 0.3) !important;
      animation: aca-flash-fade 0.4s ease-out forwards;
    }
    @keyframes aca-flash-fade {
      0% { opacity: 1; }
      100% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initFastApply(): void {
  injectStyles();
  
  // Expose globally
  if (typeof window !== 'undefined') {
    (window as any).fastApplyCode = fastApplyCode;
    (window as any).setSpeedMode = setSpeedMode;
    (window as any).getSpeedMode = getSpeedMode;
    (window as any).stopFastApply = stopApply;
    (window as any).revertCode = revertCode;
    (window as any).applySmartUpdateFast = applySmartUpdateFast;
    
    // Override the slow function if it exists
    if ((window as any).applySmartUpdate) {
      (window as any).applySmartUpdateOriginal = (window as any).applySmartUpdate;
      (window as any).applySmartUpdate = applySmartUpdateFast;
      console.log('✅ [FastApply] Replaced slow applySmartUpdate');
    }
  }
  
  console.log('⚡ [FastApply] Initialized');
  console.log('   Modes: instant | turbo | fast | visual');
  console.log('   Current: ' + currentSpeedMode);
}

// Auto-init on load
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    setTimeout(initFastApply, 100);
  } else {
    window.addEventListener('load', () => setTimeout(initFastApply, 100));
  }
}

console.log('⚡ fastAutoApply.ts loaded');