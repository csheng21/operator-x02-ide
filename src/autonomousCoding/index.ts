// autonomousCoding/index.ts
// ============================================================================
// AUTONOMOUS CODING SYSTEM - Main Entry Point
// ============================================================================
// 
// This module provides AI-powered autonomous coding features:
// 
// 1. Auto-Apply Code (Basic)
//    - Apply AI code blocks directly to Monaco editor
//    - Support for Replace, Insert, Append modes
//    - Keyboard shortcut: Ctrl+Shift+A
// 
// 2. Auto-Apply Code (Advanced) - Coming Soon
//    - Multi-file support
//    - Diff preview before applying
//    - Undo/Redo system
//    - Smart merge with existing code
// 
// 3. Full Autonomous Mode
//    - AI can read, modify, and create files
//    - Project-wide refactoring
//    - Emergency stop controls
// 
// ============================================================================

// Auto-Apply System (Basic + Advanced)
export { 
  initAutoCodeApply, 
  applyCodeToEditor, 
  processCodeBlocks 
} from './autoApply';

export {
  parseCodeBlocks,
  parseCodeBlock,
  extractFileAnnotation,
  extractActionAnnotation,
  extractLineRange,
  detectLanguage,
  stripAnnotations,
} from './autoApply/codeBlockParser';

export type {
  CodeBlockInfo,
  ApplyResult,
  ApplyMode,
  ApplyAction,
  FileChange,
  AutoApplyConfig,
  FileAnnotation,
  DiffChunk,
  ApplyBatch,
} from './autoApply/types';

// Existing autonomous coding modules
export { default as autonomousUI } from './autonomousUI';
export { default as pythonAutonomous } from './pythonAutonomous';

// ============================================================================
// QUICK INITIALIZATION
// ============================================================================

import { initAutoCodeApply } from './autoApply';

/**
 * Initialize all autonomous coding features
 */
export function initAutonomousCoding(): void {
  console.log('🤖 [AutonomousCoding] Initializing all features...');
  
  // Initialize auto-apply system
  initAutoCodeApply();
  
  console.log('✅ [AutonomousCoding] All features ready!');
}

export default initAutonomousCoding;
