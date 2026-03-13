// autonomousCoding/autoApply/index.ts
// ============================================================================
// AUTO-APPLY CODE SYSTEM - Main Entry Point
// ============================================================================

export { initAutoCodeApply, applyCodeToEditor, processCodeBlocks } from './autoCodeApply';
export { parseCodeBlocks, extractFileAnnotation } from './codeBlockParser';
export type { CodeBlockInfo, ApplyResult, ApplyMode } from './types';

// Re-export for convenience
import { initAutoCodeApply } from './autoCodeApply';
export default initAutoCodeApply;
