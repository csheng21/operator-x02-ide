/**
 * ====================================================================================================
 * FILE: src/editor/errorIntegrationBridge.ts - Bridge between Error Highlighting and Editor
 * ====================================================================================================
 * 
 * PURPOSE:
 * Seamlessly connects the terminal error highlighting system with your existing editorManager
 * and tabManager. This file acts as the glue that makes clicking file paths in terminal errors
 * open the files in your Monaco editor.
 * 
 * FEATURES:
 * - Integrates with your existing openFile() function
 * - Works with your tab manager
 * - Navigates to error lines in Monaco
 * - Highlights error locations
 * - Focuses the editor
 * 
 * ====================================================================================================
 */

import { openFile, getMonacoEditor } from './editorManager';
import { tabManager } from './tabManager';
import { ErrorHighlighter } from '../ide/terminal/errorHighlighter';
import { TerminalErrorIntegration } from '../ide/terminal/terminalErrorIntegration';

/**
 * Initialize the error integration bridge
 */
export function initializeErrorIntegrationBridge(): void {
  console.log('🌉 Initializing Error Integration Bridge...');
  
  // Set up the file click handler for error highlighting
  ErrorHighlighter.setFileClickHandler(handleFileClick);
  
  // Make editor manager globally accessible for error integration
  setupGlobalEditorAccess();
  
  // Add keyboard shortcuts for error navigation
  setupErrorNavigationShortcuts();
  
  console.log('✅ Error Integration Bridge initialized successfully');
}

/**
 * Handle file click from terminal errors
 */
async function handleFileClick(filePath: string, lineNumber?: number, columnNumber?: number): Promise<void> {
  console.log('🎯 Error Integration: Opening file from terminal error', {
    filePath,
    lineNumber,
    columnNumber
  });
  
  try {
    // Step 1: Open the file using your existing openFile function
    await openFile(filePath);
    
    // Step 2: Wait a moment for the file to load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Step 3: Navigate to the line if specified
    if (lineNumber !== undefined) {
      await navigateToErrorLocation(lineNumber, columnNumber);
    }
    
    // Step 4: Focus the editor
    focusEditor();
    
    console.log('✅ File opened and navigated successfully');
    showSuccessNotification(filePath, lineNumber);
    
  } catch (error) {
    console.error('❌ Failed to open file from error:', error);
    showErrorNotification(filePath, error);
  }
}

/**
 * Navigate to error location in Monaco editor
 */
async function navigateToErrorLocation(lineNumber: number, columnNumber?: number): Promise<void> {
  const editor = getMonacoEditor();
  
  if (!editor) {
    console.warn('⚠️ Monaco editor not available for navigation');
    return;
  }
  
  const monaco = window.monaco;
  if (!monaco) {
    console.warn('⚠️ Monaco API not available');
    return;
  }
  
  try {
    // Reveal the line in the center of the editor
    editor.revealLineInCenter(lineNumber, monaco.editor.ScrollType.Smooth);
    
    // Set cursor position
    const position = {
      lineNumber: lineNumber,
      column: columnNumber || 1
    };
    
    editor.setPosition(position);
    
    // Highlight the error line temporarily
    highlightErrorLine(editor, monaco, lineNumber);
    
    console.log(`📍 Navigated to line ${lineNumber}, column ${columnNumber || 1}`);
    
  } catch (error) {
    console.error('Failed to navigate to error location:', error);
  }
}

/**
 * Highlight the error line temporarily
 */
function highlightErrorLine(editor: any, monaco: any, lineNumber: number): void {
  try {
    // Create decoration for error line
    const decorations = editor.deltaDecorations([], [
      {
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: 'error-line-highlight',
          glyphMarginClassName: 'error-line-glyph',
          linesDecorationsClassName: 'error-line-decoration'
        }
      }
    ]);
    
    // Remove highlight after 3 seconds
    setTimeout(() => {
      editor.deltaDecorations(decorations, []);
    }, 3000);
    
  } catch (error) {
    console.error('Failed to highlight error line:', error);
  }
}

/**
 * Focus the Monaco editor
 */
function focusEditor(): void {
  const editor = getMonacoEditor();
  if (editor) {
    editor.focus();
  }
}

/**
 * Setup global editor access for error integration
 */
function setupGlobalEditorAccess(): void {
  // Make editor manager globally accessible
  (window as any).editorManager = {
    openFile: async (filePath: string, lineNumber?: number, columnNumber?: number) => {
      console.log('🌍 Global editorManager.openFile called:', { filePath, lineNumber, columnNumber });
      return handleFileClick(filePath, lineNumber, columnNumber);
    },
    getEditor: () => getMonacoEditor(),
    getTabManager: () => tabManager,
  };
  
  console.log('✅ Global editor access configured');
}

/**
 * Setup keyboard shortcuts for error navigation
 */
function setupErrorNavigationShortcuts(): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // Ctrl+Shift+E: Jump to next error (if implemented)
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      console.log('🎹 Error navigation shortcut triggered');
      // Future: implement error list navigation
    }
  });
}

/**
 * Show success notification
 */
function showSuccessNotification(filePath: string, lineNumber?: number): void {
  const fileName = filePath.split(/[/\\]/).pop() || filePath;
  const message = lineNumber 
    ? `Opened ${fileName} at line ${lineNumber}`
    : `Opened ${fileName}`;
  
  showNotification(message, 'success');
}

/**
 * Show error notification
 */
function showErrorNotification(filePath: string, error: any): void {
  const fileName = filePath.split(/[/\\]/).pop() || filePath;
  const message = `Failed to open ${fileName}`;
  
  showNotification(message, 'error');
}

/**
 * Show notification to user
 */
function showNotification(message: string, type: 'success' | 'error' | 'info'): void {
  const notification = document.createElement('div');
  notification.className = `editor-notification ${type}`;
  notification.textContent = message;
  
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 24px;
    background: ${
      type === 'success' ? '#4caf50' : 
      type === 'error' ? '#ff5252' : 
      '#2196f3'
    };
    color: white;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: slideInRight 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Inject notification animation styles
 */
function injectNotificationStyles(): void {
  const styleId = 'error-integration-notification-styles';
  
  if (document.getElementById(styleId)) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
    
    .error-line-highlight {
      background: rgba(255, 82, 82, 0.15) !important;
      border-left: 4px solid #ff5252;
    }
    
    .error-line-glyph {
      background: #ff5252;
      width: 5px !important;
      margin-left: 3px;
    }
    
    .error-line-decoration {
      width: 5px !important;
      background: #ff5252;
    }
    
    .editor-notification {
      font-weight: 500;
    }
  `;
  
  document.head.appendChild(style);
}

// Initialize styles on load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNotificationStyles);
  } else {
    injectNotificationStyles();
  }
}

// Auto-initialize if terminal error integration is already loaded
if (typeof window !== 'undefined' && (window as any).TerminalErrorIntegration) {
  console.log('🚀 Auto-initializing Error Integration Bridge...');
  setTimeout(initializeErrorIntegrationBridge, 100);
}

console.log('✅ Error Integration Bridge module loaded');