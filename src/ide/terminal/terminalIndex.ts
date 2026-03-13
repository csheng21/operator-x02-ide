/**
 * ====================================================================================================
 * FILE: src/ide/terminal/index.ts
 * TERMINAL MODULE - Main export file with AI integration
 * ====================================================================================================
 * 
 * This module provides:
 * - Terminal component and manager
 * - Error highlighting and parsing
 * - AI context integration (terminal logs for AI assistant)
 * 
 * ====================================================================================================
 */

// ============================================================================
// CORE TERMINAL EXPORTS
// ============================================================================

export { TerminalComponent, TerminalOptions } from './terminalComponent';
export { TerminalManager, terminalManager } from './terminalManager';

// ============================================================================
// ERROR HANDLING EXPORTS
// ============================================================================

export { TerminalErrorIntegration } from './terminalErrorIntegration';
// export { ErrorParser } from './errorParser';
// export { ErrorHighlighter } from './errorHighlighter';

// ============================================================================
// AI INTEGRATION EXPORTS (NEW)
// ============================================================================

export { 
  terminalContextProvider,
  TerminalLogEntry,
  TerminalContext,
  TerminalContextOptions,
  TerminalOutputType,
} from './terminalContextProvider';

export {
  initializeAITerminalIntegration,
  toggleTerminalContext,
  isTerminalContextEnabled,
  getTerminalContextForAI,
  enhanceMessageWithTerminalContext,
  debugLastError,
  explainLastOutput,
  patchTerminalManager,
  patchBuildSystem,
  AI_TERMINAL_CONFIG,
} from './aiTerminalIntegration';

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize all terminal components including AI integration
 */
export function initializeTerminal(): void {
  console.log('🖥️ Initializing Terminal Module...');
  
  // Initialize terminal manager
  TerminalManager.initialize();
  
  // Initialize AI integration (auto-loads if DOM ready)
  // The aiTerminalIntegration module self-initializes
  
  console.log('✅ Terminal Module initialized');
}

// Re-export for backwards compatibility
export { initializeTerminal as initTerminal };

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get terminal context formatted for AI messages
 */
export function getAIContext(): string {
  const { terminalContextProvider } = require('./terminalContextProvider');
  return terminalContextProvider.formatContextForMessage({
    maxContextLength: 2000,
    errorPriority: true,
  });
}

/**
 * Check if there are unresolved errors
 */
export function hasTerminalErrors(): boolean {
  const { terminalContextProvider } = require('./terminalContextProvider');
  return terminalContextProvider.getStats().unresolvedErrors > 0;
}

/**
 * Get count of unresolved errors
 */
export function getErrorCount(): number {
  const { terminalContextProvider } = require('./terminalContextProvider');
  return terminalContextProvider.getStats().unresolvedErrors;
}

// ============================================================================
// AUTO-IMPORT IN MAIN.TS INSTRUCTIONS
// ============================================================================

/*
 * To enable AI Terminal Integration in your IDE, add these lines to main.ts:
 * 
 * 1. Add import at the top:
 *    import { initializeAITerminalIntegration } from './ide/terminal';
 * 
 * 2. Call during initialization:
 *    initializeAITerminalIntegration();
 * 
 * 3. To use in AI assistant message enhancement, in assistantUI.ts:
 *    import { enhanceMessageWithTerminalContext, isTerminalContextEnabled } from './ide/terminal';
 *    
 *    // Then in your send message function:
 *    if (isTerminalContextEnabled()) {
 *      message = enhanceMessageWithTerminalContext(message);
 *    }
 */
