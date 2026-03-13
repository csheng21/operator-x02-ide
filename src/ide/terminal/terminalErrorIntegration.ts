/**
 * ====================================================================================================
 * FILE: src/ide/terminal/terminalErrorIntegration.ts - Integration with Terminal System
 * ====================================================================================================
 * 
 * PURPOSE:
 * Integrates error highlighting into the existing terminal system.
 * Connects error detection with editor navigation.
 * 
 * FEATURES:
 * - Automatic error detection in terminal output
 * - Click-to-open-file functionality
 * - Real-time error highlighting
 * - Integration with Monaco editor
 * 
 * ====================================================================================================
 */

import { ErrorHighlighter } from './errorHighlighter';
import { ErrorParser } from './errorParser';

declare global {
  interface Window {
    editorManager?: {
      openFile: (filePath: string, lineNumber?: number, columnNumber?: number) => Promise<void>;
    };
    monaco?: any;
  }
}

export class TerminalErrorIntegration {
  private static initialized = false;

  /**
   * Initialize error integration
   */
  static initialize() {
    if (this.initialized) {
      return;
    }

    console.log('🎨 Initializing Terminal Error Highlighting System...');

    // Inject error highlighting styles
    ErrorHighlighter.injectStyles();

    // Set up file click handler
    ErrorHighlighter.setFileClickHandler((file, line, column) => {
      this.handleFileClick(file, line, column);
    });

    this.initialized = true;
    console.log('✅ Terminal Error Highlighting System initialized');
  }

  /**
   * Process terminal output with error highlighting
   */
  static processOutput(output: string): HTMLElement {
    const highlighted = ErrorHighlighter.highlightOutput(output);
    
    // Initialize click handlers for file paths
    ErrorHighlighter.initializeFilePathHandlers(highlighted.element);
    
    // Log errors/warnings if found
    if (highlighted.hasError) {
      if (highlighted.errorCount > 0) {
        console.warn(`🔴 ${highlighted.errorCount} error(s) detected in terminal output`);
      }
      if (highlighted.warningCount > 0) {
        console.warn(`⚠️ ${highlighted.warningCount} warning(s) detected in terminal output`);
      }
    }
    
    return highlighted.element;
  }

  /**
   * Handle file path click - open in editor
   */
  private static async handleFileClick(file: string, line?: number, column?: number) {
    console.log('📂 Opening file from terminal:', { file, line, column });

    try {
      // Try to use editor manager if available
      if (window.editorManager && typeof window.editorManager.openFile === 'function') {
        await window.editorManager.openFile(file, line, column);
        
        // If line number is specified, navigate to it
        if (line !== undefined && window.monaco) {
          setTimeout(() => {
            this.navigateToLine(line, column);
          }, 100);
        }
        
        console.log('✅ File opened successfully');
      } else {
        console.warn('⚠️ Editor manager not available. File path:', file);
        this.showNotification(`Click to open: ${file}${line ? `:${line}` : ''}`, 'info');
      }
    } catch (error) {
      console.error('❌ Failed to open file:', error);
      this.showNotification(`Failed to open: ${file}`, 'error');
    }
  }

  /**
   * Navigate to specific line in Monaco editor
   */
  private static navigateToLine(line: number, column?: number) {
    try {
      const monaco = window.monaco;
      if (!monaco) return;

      const editor = (window as any).monacoEditor || (window as any).editor;
      if (!editor) return;

      // Reveal line
      editor.revealLineInCenter(line);
      
      // Set cursor position
      const position = {
        lineNumber: line,
        column: column || 1,
      };
      
      editor.setPosition(position);
      editor.focus();
      
      // Highlight the line temporarily
      const decorations = editor.deltaDecorations([], [
        {
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: 'error-line-highlight',
            glyphMarginClassName: 'error-glyph',
          },
        },
      ]);
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        editor.deltaDecorations(decorations, []);
      }, 3000);
      
    } catch (error) {
      console.error('Failed to navigate to line:', error);
    }
  }

  /**
   * Show notification to user
   */
  private static showNotification(message: string, type: 'info' | 'error' | 'success') {
    const notification = document.createElement('div');
    notification.className = `terminal-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'error' ? '#ff5252' : type === 'success' ? '#4caf50' : '#2196f3'};
      color: white;
      border-radius: 4px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      z-index: 10000;
      font-size: 14px;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Add custom CSS for line highlighting
   */
  static injectEditorStyles() {
    const styleId = 'terminal-error-editor-styles';
    
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .error-line-highlight {
        background: rgba(255, 82, 82, 0.2) !important;
        border-left: 3px solid #ff5252;
      }
      
      .error-glyph {
        background: #ff5252;
        width: 3px !important;
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Check if output contains errors
   */
  static hasErrors(output: string): boolean {
    const parsed = ErrorParser.parse(output);
    return parsed !== null && parsed.type === 'error';
  }

  /**
   * Check if output contains warnings
   */
  static hasWarnings(output: string): boolean {
    const parsed = ErrorParser.parse(output);
    return parsed !== null && parsed.type === 'warning';
  }

  /**
   * Get error summary from output
   */
  static getErrorSummary(output: string): {
    errorCount: number;
    warningCount: number;
    errors: string[];
    warnings: string[];
  } {
    const lines = output.split('\n');
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const line of lines) {
      if (ErrorParser.isWarning(line)) {
        warnings.push(line.trim());
      } else if (line.toLowerCase().includes('error')) {
        errors.push(line.trim());
      }
    }

    return {
      errorCount: errors.length,
      warningCount: warnings.length,
      errors,
      warnings,
    };
  }
}

// Initialize on load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      TerminalErrorIntegration.initialize();
      TerminalErrorIntegration.injectEditorStyles();
    });
  } else {
    TerminalErrorIntegration.initialize();
    TerminalErrorIntegration.injectEditorStyles();
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).TerminalErrorIntegration = TerminalErrorIntegration;
}