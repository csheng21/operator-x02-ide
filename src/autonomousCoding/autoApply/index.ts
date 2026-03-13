// ============================================================================
// Auto Apply - Main Entry
// ============================================================================
import { applyCodeToEditor } from './applyCode';
import { parseCodeBlocks } from './codeBlockParser';
import type { ApplyResult } from './types';

export { applyCodeToEditor } from './applyCode';
export { parseCodeBlocks } from './codeBlockParser';

/**
 * Process code blocks from AI response - extract and optionally apply
 */
export function processCodeBlocks(
  text: string,
  autoApply: boolean = false
): Array<{ code: string; language: string; applied: boolean }> {
  const parsed = parseCodeBlocks(text);
  return parsed.map(block => {
    let applied = false;
    if (autoApply) {
      const result = applyCodeToEditor(block.code, 'replace');
      applied = result.success;
      if (applied) console.log(`[AutoApply] Applied ${block.language} code block`);
    }
    return { code: block.code, language: block.language, applied };
  });
}

/**
 * Initialize auto-apply system
 */
export function initAutoCodeApply(): void {
  console.log('[AutoApply] Initializing auto code apply system...');
  
  // Register keyboard shortcut: Ctrl+Shift+A
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'A') {
      e.preventDefault();
      console.log('[AutoApply] Ctrl+Shift+A pressed - apply code');
      // Find last code block in chat and apply
      const codeBlocks = document.querySelectorAll('pre code');
      if (codeBlocks.length > 0) {
        const lastBlock = codeBlocks[codeBlocks.length - 1];
        const code = lastBlock.textContent || '';
        if (code.trim()) {
          const result = applyCodeToEditor(code, 'replace');
          console.log(`[AutoApply] Result: ${result.message}`);
        }
      }
    }
  });

  // Expose globally
  (window as any).autoApply = {
    applyCodeToEditor,
    processCodeBlocks,
    parseCodeBlocks,
  };

  console.log('[AutoApply] Ready! Shortcut: Ctrl+Shift+A');
}
