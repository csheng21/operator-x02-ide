/**
 * ====================================================================================================
 * FILE: src/ide/terminal/aiTerminalIntegration.ts
 * AI TERMINAL INTEGRATION - Bridges terminal output with AI assistant
 * ====================================================================================================
 * 
 * PURPOSE:
 * - Integrates terminalContextProvider with existing terminal components
 * - Adds UI elements for including terminal context in AI chat
 * - Auto-detects when to suggest terminal context
 * - Provides quick actions for common debugging tasks
 * 
 * FEATURES:
 * - "Include Terminal Log" button in AI chat
 * - Auto-suggestion when errors are detected
 * - Quick "Debug This Error" action
 * - Terminal context status indicator
 * - Keyboard shortcut support
 * 
 * ====================================================================================================
 */

import { 
  terminalContextProvider,
  TerminalLogEntry,
  TerminalContext,
  TerminalContextOptions
} from './terminalContextProvider';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Auto-suggest terminal context when these conditions are met
  autoSuggestOnErrors: true,
  autoSuggestThreshold: 1, // Minimum unresolved errors to trigger
  
  // UI Settings
  showContextButton: true,
  showErrorBadge: true,
  
  // Context limits
  maxContextLines: 50,
  maxContextLength: 3000,
  
  // Keyboard shortcut
  shortcutKey: 'T', // Ctrl+Shift+T to toggle terminal context
};

// ============================================================================
// STATE
// ============================================================================

let isContextEnabled: boolean = false;
let contextIndicator: HTMLElement | null = null;
let contextButton: HTMLElement | null = null;
let errorBadge: HTMLElement | null = null;
let unsubscribe: (() => void) | null = null;

// ============================================================================
// TERMINAL OUTPUT INTERCEPTOR
// ============================================================================

/**
 * Patch the terminal manager to capture all output
 */
export function patchTerminalManager(): void {
  console.log('🔗 [AITerminal] Patching terminal manager...');
  
  // Patch the TerminalManager's addTerminalMessage if available
  const terminalManager = (window as any).terminalManager;
  if (terminalManager) {
    const originalAddMessage = terminalManager.addTerminalMessage?.bind(terminalManager);
    if (originalAddMessage) {
      terminalManager.addTerminalMessage = function(
        type: string, 
        message: string
      ) {
        // Capture to context provider
        if (type === 'command') {
          terminalContextProvider.recordCommand(message);
        } else {
          terminalContextProvider.recordOutput(message);
        }
        
        // Call original
        return originalAddMessage(type, message);
      };
      console.log('✅ [AITerminal] Terminal manager patched');
    }
  }
  
  // Patch TerminalComponent's writeOutput
  const TerminalComponent = (window as any).TerminalComponent;
  if (TerminalComponent?.prototype) {
    const originalWriteOutput = TerminalComponent.prototype.writeOutput;
    if (originalWriteOutput) {
      TerminalComponent.prototype.writeOutput = function(
        text: string, 
        className: string = ''
      ) {
        // Capture to context provider
        if (text && text.trim()) {
          terminalContextProvider.recordOutput(text);
        }
        
        // Call original
        return originalWriteOutput.call(this, text, className);
      };
      console.log('✅ [AITerminal] TerminalComponent patched');
    }
  }
  
  // Also intercept DOM-level output for integrated terminal
  interceptIntegratedTerminalOutput();
}

/**
 * Intercept output written to the integrated terminal DOM
 */
function interceptIntegratedTerminalOutput(): void {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          const text = node.textContent?.trim();
          if (text && text.length > 0) {
            // Don't re-capture if already captured
            if (!node.hasAttribute('data-context-captured')) {
              node.setAttribute('data-context-captured', 'true');
              
              // Detect type from class names
              const isCommand = node.classList.contains('terminal-command');
              const isError = node.classList.contains('terminal-error') || 
                              node.classList.contains('error');
              
              if (isCommand) {
                terminalContextProvider.recordCommand(text);
              } else {
                terminalContextProvider.recordOutput(text);
              }
            }
          }
        }
      });
    });
  });
  
  // Observe the integrated terminal output
  const observeTerminal = () => {
    const terminalOutput = document.getElementById('integrated-terminal-output');
    if (terminalOutput) {
      observer.observe(terminalOutput, {
        childList: true,
        subtree: true,
      });
      console.log('✅ [AITerminal] Integrated terminal observer active');
    } else {
      // Retry after DOM is ready
      setTimeout(observeTerminal, 1000);
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeTerminal);
  } else {
    observeTerminal();
  }
}

// ============================================================================
// BUILD SYSTEM INTEGRATION
// ============================================================================

/**
 * Hook into build system to capture build output
 */
export function patchBuildSystem(): void {
  console.log('🔗 [AITerminal] Patching build system...');
  
  const buildSystem = (window as any).buildSystem;
  if (!buildSystem) {
    console.warn('⚠️ [AITerminal] Build system not found, will retry...');
    setTimeout(patchBuildSystem, 2000);
    return;
  }
  
  // Patch buildProject
  const originalBuildProject = buildSystem.buildProject;
  if (originalBuildProject) {
    buildSystem.buildProject = async function(...args: any[]) {
      const buildSystemInfo = args[0];
      terminalContextProvider.recordCommand(
        buildSystemInfo?.buildCommand || 'build'
      );
      
      const result = await originalBuildProject.apply(this, args);
      
      // Record build result
      if (result) {
        terminalContextProvider.recordBuildOutput(
          result.output || '',
          buildSystemInfo?.name || 'unknown',
          result.exitCode || (result.success ? 0 : 1),
          result.duration || 0
        );
      }
      
      return result;
    };
  }
  
  // Patch runProject
  const originalRunProject = buildSystem.runProject;
  if (originalRunProject) {
    buildSystem.runProject = async function(...args: any[]) {
      const buildSystemInfo = args[0];
      terminalContextProvider.recordCommand(
        buildSystemInfo?.runCommand || 'run'
      );
      
      return originalRunProject.apply(this, args);
    };
  }
  
  console.log('✅ [AITerminal] Build system patched');
}

// ============================================================================
// AI ASSISTANT UI INTEGRATION
// ============================================================================

/**
 * Add terminal context button to AI chat input
 */
export function addTerminalContextButton(): void {
  if (!CONFIG.showContextButton) return;
  
  // Find the chat input area
  const inputContainer = document.querySelector('.ai-input-container') ||
                         document.querySelector('.chat-input-container') ||
                         document.querySelector('[class*="input"]');
  
  if (!inputContainer) {
    console.warn('⚠️ [AITerminal] Chat input container not found');
    setTimeout(addTerminalContextButton, 2000);
    return;
  }
  
  // Check if button already exists
  if (document.getElementById('terminal-context-btn')) return;
  
  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'terminal-context-container';
  buttonContainer.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-right: 8px;
  `;
  
  // Create the main button
  contextButton = document.createElement('button');
  contextButton.id = 'terminal-context-btn';
  contextButton.title = 'Include Terminal Log (Ctrl+Shift+T)';
  contextButton.innerHTML = '📺';
  contextButton.style.cssText = `
    background: ${isContextEnabled ? '#4fc3f7' : '#2d2d2d'};
    border: 1px solid ${isContextEnabled ? '#4fc3f7' : '#404040'};
    border-radius: 4px;
    padding: 6px 10px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 4px;
  `;
  
  // Add text label
  const label = document.createElement('span');
  label.style.cssText = `
    font-size: 11px;
    color: #cccccc;
  `;
  label.textContent = 'Terminal';
  contextButton.appendChild(label);
  
  // Create error badge
  errorBadge = document.createElement('span');
  errorBadge.id = 'terminal-error-badge';
  errorBadge.style.cssText = `
    background: #f85149;
    color: white;
    border-radius: 10px;
    padding: 2px 6px;
    font-size: 10px;
    font-weight: bold;
    display: none;
  `;
  contextButton.appendChild(errorBadge);
  
  // Click handler
  contextButton.addEventListener('click', () => {
    toggleTerminalContext();
  });
  
  // Hover effect
  contextButton.addEventListener('mouseenter', () => {
    contextButton!.style.background = isContextEnabled ? '#5ed1ff' : '#3d3d3d';
  });
  
  contextButton.addEventListener('mouseleave', () => {
    contextButton!.style.background = isContextEnabled ? '#4fc3f7' : '#2d2d2d';
  });
  
  buttonContainer.appendChild(contextButton);
  
  // Find the best place to insert
  const toolbar = inputContainer.querySelector('.input-toolbar') ||
                  inputContainer.querySelector('[class*="toolbar"]');
  
  if (toolbar) {
    toolbar.insertBefore(buttonContainer, toolbar.firstChild);
  } else {
    // Insert before input element
    const input = inputContainer.querySelector('input, textarea');
    if (input?.parentNode) {
      input.parentNode.insertBefore(buttonContainer, input);
    } else {
      inputContainer.insertBefore(buttonContainer, inputContainer.firstChild);
    }
  }
  
  console.log('✅ [AITerminal] Terminal context button added');
  
  // Start listening for errors
  subscribeToErrors();
}

/**
 * Toggle terminal context inclusion
 */
export function toggleTerminalContext(force?: boolean): void {
  isContextEnabled = force !== undefined ? force : !isContextEnabled;
  
  if (contextButton) {
    contextButton.style.background = isContextEnabled ? '#4fc3f7' : '#2d2d2d';
    contextButton.style.borderColor = isContextEnabled ? '#4fc3f7' : '#404040';
  }
  
  console.log(`📺 [AITerminal] Terminal context ${isContextEnabled ? 'enabled' : 'disabled'}`);
  
  // Dispatch event
  window.dispatchEvent(new CustomEvent('terminal-context-toggled', {
    detail: { enabled: isContextEnabled }
  }));
}

/**
 * Check if terminal context is enabled
 */
export function isTerminalContextEnabled(): boolean {
  return isContextEnabled;
}

/**
 * Subscribe to error events and update badge
 */
function subscribeToErrors(): void {
  if (unsubscribe) {
    unsubscribe();
  }
  
  unsubscribe = terminalContextProvider.subscribe((entry: TerminalLogEntry) => {
    if (entry.isError && CONFIG.showErrorBadge) {
      updateErrorBadge();
      
      // Auto-enable context when errors occur
      if (CONFIG.autoSuggestOnErrors && !isContextEnabled) {
        const stats = terminalContextProvider.getStats();
        if (stats.unresolvedErrors >= CONFIG.autoSuggestThreshold) {
          showErrorSuggestion();
        }
      }
    }
  });
}

/**
 * Update the error badge count
 */
function updateErrorBadge(): void {
  if (!errorBadge) return;
  
  const stats = terminalContextProvider.getStats();
  const count = stats.unresolvedErrors;
  
  if (count > 0) {
    errorBadge.textContent = count > 9 ? '9+' : String(count);
    errorBadge.style.display = 'inline';
  } else {
    errorBadge.style.display = 'none';
  }
}

/**
 * Show suggestion to include terminal context
 */
function showErrorSuggestion(): void {
  // Create suggestion toast
  const toast = document.createElement('div');
  toast.className = 'terminal-context-suggestion';
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    right: 20px;
    background: #2d2d2d;
    border: 1px solid #f85149;
    border-radius: 8px;
    padding: 12px 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideIn 0.3s ease;
  `;
  
  toast.innerHTML = `
    <span style="font-size: 24px;">🔴</span>
    <div>
      <div style="color: #f85149; font-weight: 600; margin-bottom: 4px;">
        Error Detected
      </div>
      <div style="color: #cccccc; font-size: 12px;">
        Include terminal log for AI debugging?
      </div>
    </div>
    <button id="include-terminal-btn" style="
      background: #4fc3f7;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      color: #1e1e1e;
      cursor: pointer;
      font-weight: 600;
    ">Include</button>
    <button id="dismiss-terminal-btn" style="
      background: transparent;
      border: 1px solid #404040;
      border-radius: 4px;
      padding: 6px 12px;
      color: #cccccc;
      cursor: pointer;
    ">Dismiss</button>
  `;
  
  // Add animation style
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(toast);
  
  // Button handlers
  toast.querySelector('#include-terminal-btn')?.addEventListener('click', () => {
    toggleTerminalContext(true);
    toast.remove();
  });
  
  toast.querySelector('#dismiss-terminal-btn')?.addEventListener('click', () => {
    toast.remove();
  });
  
  // Auto-dismiss after 10 seconds
  setTimeout(() => toast.remove(), 10000);
}

// ============================================================================
// MESSAGE ENHANCEMENT
// ============================================================================

/**
 * Enhance user message with terminal context if enabled
 */
export function enhanceMessageWithTerminalContext(message: string): string {
  if (!isContextEnabled) {
    return message;
  }
  
  const contextStr = terminalContextProvider.formatContextForMessage({
    maxContextLength: CONFIG.maxContextLength,
    errorPriority: true,
    includeTimestamps: false,
  });
  
  if (!contextStr || contextStr.length < 50) {
    return message;
  }
  
  // After including context, disable until user enables again
  toggleTerminalContext(false);
  
  // Mark errors as addressed
  terminalContextProvider.markErrorsResolved();
  updateErrorBadge();
  
  return `${message}\n\n---\n${contextStr}`;
}

/**
 * Get terminal context for manual inclusion
 */
export function getTerminalContextForAI(): string {
  return terminalContextProvider.formatContextForMessage({
    maxContextLength: CONFIG.maxContextLength,
    errorPriority: true,
    includeTimestamps: false,
  });
}

// ============================================================================
// QUICK ACTIONS
// ============================================================================

/**
 * Quick action: Debug last error
 */
export async function debugLastError(): Promise<void> {
  const errors = terminalContextProvider.getRecentErrors(1);
  if (errors.length === 0) {
    console.log('No errors to debug');
    return;
  }
  
  const error = errors[0];
  const message = `Please help me debug this error:\n\n\`\`\`\n${error.content}\n\`\`\``;
  
  // Send to AI chat
  const sendFunction = (window as any).sendMessageDirectly || 
                       (window as any).sendMessage;
  
  if (sendFunction) {
    await sendFunction(message);
  } else {
    // Fallback: Insert into chat input
    const input = document.querySelector('.ai-chat-input, .chat-input, textarea') as HTMLTextAreaElement;
    if (input) {
      input.value = message;
      input.focus();
    }
  }
}

/**
 * Quick action: Explain last command output
 */
export async function explainLastOutput(): Promise<void> {
  const lastCommand = terminalContextProvider.getLastCommandWithOutput();
  if (!lastCommand) {
    console.log('No command output to explain');
    return;
  }
  
  const outputText = lastCommand.output
    .map(log => log.content)
    .join('\n');
  
  const message = `Please explain this command output:\n\nCommand: \`${lastCommand.command}\`\n\n\`\`\`\n${outputText}\n\`\`\``;
  
  const sendFunction = (window as any).sendMessageDirectly || 
                       (window as any).sendMessage;
  
  if (sendFunction) {
    await sendFunction(message);
  }
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+T - Toggle terminal context
    if (e.ctrlKey && e.shiftKey && e.key === CONFIG.shortcutKey) {
      e.preventDefault();
      toggleTerminalContext();
    }
    
    // Ctrl+Shift+E - Debug last error
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      debugLastError();
    }
  });
  
  console.log('✅ [AITerminal] Keyboard shortcuts registered');
  console.log('   Ctrl+Shift+T: Toggle terminal context');
  console.log('   Ctrl+Shift+E: Debug last error');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the AI Terminal Integration
 */
export function initializeAITerminalIntegration(): void {
  console.log('🚀 [AITerminal] Initializing AI Terminal Integration...');
  
  // Patch existing terminal components
  patchTerminalManager();
  
  // Patch build system
  setTimeout(patchBuildSystem, 1000);
  
  // Add UI elements
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(addTerminalContextButton, 500);
    });
  } else {
    setTimeout(addTerminalContextButton, 500);
  }
  
  // Setup keyboard shortcuts
  setupKeyboardShortcuts();
  
  // Update error badge periodically
  setInterval(updateErrorBadge, 5000);
  
  console.log('✅ [AITerminal] AI Terminal Integration ready!');
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  terminalContextProvider,
  CONFIG as AI_TERMINAL_CONFIG,
};

// ============================================================================
// GLOBAL EXPOSURE
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).aiTerminalIntegration = {
    // Core functions
    initialize: initializeAITerminalIntegration,
    toggle: toggleTerminalContext,
    isEnabled: isTerminalContextEnabled,
    getContext: getTerminalContextForAI,
    enhance: enhanceMessageWithTerminalContext,
    
    // Quick actions
    debugLastError,
    explainLastOutput,
    
    // Access to provider
    provider: terminalContextProvider,
    
    // Configuration
    config: CONFIG,
  };
  
  // Auto-initialize if DOM is ready
  if (document.readyState === 'complete') {
    initializeAITerminalIntegration();
  } else {
    window.addEventListener('load', initializeAITerminalIntegration);
  }
  
  console.log('🧠 AI Terminal Integration module loaded!');
  console.log('   📌 window.aiTerminalIntegration - Full API');
  console.log('   📌 Ctrl+Shift+T - Toggle terminal context');
  console.log('   📌 Ctrl+Shift+E - Quick debug last error');
}
