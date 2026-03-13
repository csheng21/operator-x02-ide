/**
 * ====================================================================================================
 * FILE: src/ide/terminal/quickFixIntegration.ts - Quick Fix Integration with Terminal
 * ====================================================================================================
 * 
 * PURPOSE:
 * Integrates the Quick Fix system with the existing terminal error highlighting.
 * Automatically adds fix suggestions to detected errors.
 * 
 * ====================================================================================================
 */

import { 
  QuickFixEngine, 
  QuickFixUI, 
  FixContext,
  getQuickFixEngine,
  getQuickFixUI,
  initializeQuickFix 
} from './quickFixSuggestions';
import { ErrorHighlighter } from './errorHighlighter';
import { TerminalErrorIntegration } from './terminalErrorIntegration';

/**
 * Enhanced Terminal Output Processor with Quick Fix support
 */
export class EnhancedTerminalProcessor {
  private quickFixEngine: QuickFixEngine;
  private quickFixUI: QuickFixUI;
  private initialized = false;

  constructor() {
    this.quickFixEngine = getQuickFixEngine();
    this.quickFixUI = getQuickFixUI();
  }

  /**
   * Initialize the processor with context
   */
  initialize(options: {
    executeCommand: (cmd: string) => Promise<void>;
    openFile: (path: string, line?: number) => void;
    showNotification: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
    workingDirectory?: string;
  }) {
    const context: FixContext = {
      fullOutput: '',
      workingDirectory: options.workingDirectory || process.cwd?.() || '.',
      executeCommand: options.executeCommand,
      openFile: options.openFile,
      showNotification: options.showNotification,
    };

    initializeQuickFix(context);
    this.initialized = true;
    
    console.log('🔧 Enhanced Terminal Processor initialized with Quick Fix support');
  }

  /**
   * Process terminal output - adds error highlighting AND quick fix suggestions
   */
  processOutput(output: string, isError: boolean = false): HTMLElement {
    // First, use the existing error highlighter
    const highlighted = ErrorHighlighter.highlightOutput(output);
    
    // If there's an error, add quick fix panel
    if (highlighted.hasError || isError) {
      const fixPanel = this.quickFixUI.createFixPanel(output, highlighted.element);
      
      if (fixPanel) {
        // Insert fix panel after the error
        highlighted.element.appendChild(fixPanel);
      }
    }

    // Initialize click handlers for file paths
    ErrorHighlighter.initializeFilePathHandlers(highlighted.element);

    return highlighted.element;
  }

  /**
   * Process stderr output specifically
   */
  processStderr(output: string): HTMLElement {
    return this.processOutput(output, true);
  }

  /**
   * Check if output has quick fixes available
   */
  hasQuickFixes(output: string): boolean {
    const fixes = this.quickFixEngine.findFixes(output);
    return fixes.length > 0;
  }

  /**
   * Get quick fixes for output without rendering
   */
  getQuickFixes(output: string) {
    return this.quickFixEngine.findFixes(output);
  }
}

// ============================================================================
// AUTO-ATTACH TO TERMINAL
// ============================================================================

/**
 * Automatically attach Quick Fix to terminal output
 */
export function attachQuickFixToTerminal(): void {
  const terminalOutput = document.getElementById('integrated-terminal-output');
  
  if (!terminalOutput) {
    console.warn('⚠️ Terminal output element not found for Quick Fix attachment');
    return;
  }

  // Create processor
  const processor = new EnhancedTerminalProcessor();

  // Initialize with default context
  processor.initialize({
    executeCommand: async (cmd: string) => {
      // Try to use the terminal's command execution
      const terminal = (window as any).terminalManager || (window as any).terminal;
      
      if (terminal && typeof terminal.runCommand === 'function') {
        terminal.runCommand(cmd);
      } else if (typeof (window as any).handleCommandExecution === 'function') {
        await (window as any).handleCommandExecution(cmd);
      } else {
        // Fallback: write command to input and simulate enter
        const input = document.querySelector('.terminal-input') as HTMLInputElement;
        if (input) {
          input.value = cmd;
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        } else {
          console.error('Cannot execute command: No terminal interface found');
        }
      }
    },
    openFile: (path: string, line?: number) => {
      if (window.editorManager && typeof window.editorManager.openFile === 'function') {
        window.editorManager.openFile(path, line);
      } else if (typeof (window as any).openFileInEditor === 'function') {
        (window as any).openFileInEditor(path);
      } else {
        console.log('Open file:', path, 'at line:', line);
      }
    },
    showNotification: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => {
      // Try to use existing notification system
      if (typeof (window as any).showNotification === 'function') {
        (window as any).showNotification(msg, type);
      } else {
        // Fallback: create simple notification
        showSimpleNotification(msg, type);
      }
    },
    workingDirectory: localStorage.getItem('currentProjectPath') || undefined,
  });

  // Use MutationObserver to watch for new terminal output (more efficient than polling!)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          // Check for stderr elements
          if (node.classList.contains('terminal-stderr') && 
              !node.classList.contains('quickfix-processed')) {
            
            const text = node.textContent || '';
            
            // Check if has quick fixes
            if (processor.hasQuickFixes(text)) {
              const fixPanel = processor.getQuickFixes(text);
              
              if (fixPanel.length > 0) {
                const ui = getQuickFixUI();
                const panel = ui.createFixPanel(text, node);
                
                if (panel) {
                  // Insert panel after the error element
                  node.parentNode?.insertBefore(panel, node.nextSibling);
                }
              }
            }
            
            node.classList.add('quickfix-processed');
          }
        }
      });
    });
  });

  observer.observe(terminalOutput, {
    childList: true,
    subtree: true,
  });

  console.log('✅ Quick Fix attached to terminal with MutationObserver');

  // Store reference for cleanup
  (window as any).__quickFixObserver = observer;
  (window as any).__quickFixProcessor = processor;
}

/**
 * Simple notification fallback
 */
function showSimpleNotification(message: string, type: 'info' | 'success' | 'error' | 'warning') {
  const colors = {
    info: '#2196f3',
    success: '#4caf50',
    error: '#f44336',
    warning: '#ff9800',
  };

  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${colors[type]};
    color: white;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    animation: slideIn 0.3s ease;
    max-width: 400px;
    word-wrap: break-word;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Cleanup Quick Fix observers
 */
export function detachQuickFix(): void {
  const observer = (window as any).__quickFixObserver;
  if (observer) {
    observer.disconnect();
    delete (window as any).__quickFixObserver;
  }
  
  delete (window as any).__quickFixProcessor;
  console.log('🧹 Quick Fix detached from terminal');
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

if (typeof window !== 'undefined') {
  // Wait for DOM and other systems to be ready
  const initQuickFix = () => {
    // Check if terminal exists
    const terminal = document.getElementById('integrated-terminal-output');
    
    if (terminal) {
      attachQuickFixToTerminal();
    } else {
      // Retry after a short delay
      setTimeout(initQuickFix, 1000);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initQuickFix, 500);
    });
  } else {
    setTimeout(initQuickFix, 500);
  }

  // Expose to window
  (window as any).attachQuickFixToTerminal = attachQuickFixToTerminal;
  (window as any).detachQuickFix = detachQuickFix;
  (window as any).EnhancedTerminalProcessor = EnhancedTerminalProcessor;
}

// Export singleton processor
let processorInstance: EnhancedTerminalProcessor | null = null;

export function getEnhancedProcessor(): EnhancedTerminalProcessor {
  if (!processorInstance) {
    processorInstance = new EnhancedTerminalProcessor();
  }
  return processorInstance;
}
