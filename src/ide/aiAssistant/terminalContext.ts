/**
 * ====================================================================================================
 * FILE: src/ide/aiAssistant/terminalContext.ts
 * STANDALONE TERMINAL CONTEXT FOR AI - No dependencies on terminal module exports
 * ====================================================================================================
 * 
 * PURPOSE:
 * - Captures terminal output for AI context awareness
 * - Works independently - just import and use
 * - No need to modify terminal/index.ts
 * 
 * USAGE:
 * import { 
 *   enhanceMessageWithTerminalContext, 
 *   isTerminalContextEnabled,
 *   toggleTerminalContext,
 *   initializeTerminalContext
 * } from './terminalContext';
 * 
 * OPTIONAL: For terminal tab pulsing dot animation, also import:
 * import './terminalTabAnimation';
 * 
 * ====================================================================================================
 */

// ============================================================================
// TYPES
// ============================================================================

export type TerminalOutputType = 
  | 'command' | 'output' | 'error' | 'warning' | 'success' | 'info' | 'system';

export interface TerminalLogEntry {
  id: string;
  timestamp: number;
  type: TerminalOutputType;
  content: string;
  command?: string;
  filePath?: string;
  lineNumber?: number;
  isError: boolean;
  isWarning: boolean;
}

// ============================================================================
// ERROR DETECTION PATTERNS
// ============================================================================

const ERROR_PATTERNS = [
  // JavaScript/TypeScript errors
  /error\s*:/i, /TypeError:/i, /ReferenceError:/i, /SyntaxError:/i,
  /Cannot find module/i, /is not defined/i, /unexpected token/i,
  /ENOENT/, /EACCES/, /Cannot read propert/i,
  
  // Python errors
  /Traceback \(most recent call last\)/i, /IndentationError:/i,
  /ImportError:/i, /ModuleNotFoundError:/i, /NameError:/i,
  
  // Rust/Cargo errors
  /^error\[E\d+\]:/m, /^error:/m, /cargo error/i,
  
  // General errors
  /FAILED/i, /FATAL/i, /Exception/i, /panic/i,
  /npm ERR!/, /yarn error/i,
  
  // ✅ NEW: Command not found errors (Windows & Unix)
  /is not recognized as an internal or external command/i,
  /is not recognized as a cmdlet/i,  // PowerShell
  /command not found/i,               // Unix/Mac
  /not found$/i,                      // Generic not found
  /No such file or directory/i,
  /program not found/i,
  /unable to find/i,
  
  // ✅ NEW: Permission errors
  /permission denied/i,
  /access is denied/i,
  /Operation not permitted/i,
  
  // ✅ NEW: Build/compile errors  
  /build failed/i,
  /compilation failed/i,
  /compile error/i,
  
  // ✅ NEW: Network errors
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /network error/i,
  
  // ✅ NEW: Package/dependency errors
  /could not resolve/i,
  /unable to resolve/i,
  /dependency .* not found/i,
  
  // ✅ NEW: Flutter/Dart specific
  /flutter.*not found/i,
  /dart.*not found/i,
  
  // ✅ NEW: Failed with X mark
  /✗|✖|×/,  // Various X marks used for failures
];

const WARNING_PATTERNS = [
  /warning\s*:/i, /^warn/im, /deprecated/i, /DEPRECATION/, /⚠️/,
];

// ============================================================================
// STATE
// ============================================================================

let logs: TerminalLogEntry[] = [];
let isContextEnabled = false;
let currentCommand: string | null = null;
let unresolvedErrorIds = new Set<string>();
let errorBadgeEl: HTMLElement | null = null;
let contextButtonEl: HTMLElement | null = null;
const MAX_LOGS = 300;

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

function generateId(): string {
  return `tlog_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function isError(content: string): boolean {
  return ERROR_PATTERNS.some(p => p.test(content));
}

function isWarning(content: string): boolean {
  return WARNING_PATTERNS.some(p => p.test(content));
}

function detectType(content: string): TerminalOutputType {
  if (isError(content)) return 'error';
  if (isWarning(content)) return 'warning';
  return 'output';
}

function addLog(entry: TerminalLogEntry): void {
  logs.push(entry);
  if (logs.length > MAX_LOGS) {
    const removed = logs.shift();
    if (removed) unresolvedErrorIds.delete(removed.id);
  }
  
  if (entry.isError) {
    unresolvedErrorIds.add(entry.id);
    updateErrorBadge();
    
    // Auto-show popup if not already enabled
    if (!isContextEnabled && unresolvedErrorIds.size === 1) {
      showErrorPreviewPopup(true);
    }
  }
  
  // Dispatch event
  window.dispatchEvent(new CustomEvent('terminal-log-added', { detail: entry }));
}

// ============================================================================
// PUBLIC API - RECORDING
// ============================================================================

/**
 * Record a command being executed
 */
export function recordCommand(command: string): void {
  currentCommand = command;
  const entry: TerminalLogEntry = {
    id: generateId(),
    timestamp: Date.now(),
    type: 'command',
    content: command,
    command,
    isError: false,
    isWarning: false,
  };
  addLog(entry);
  console.log(`📝 [TerminalContext] Command: ${command}`);
}

/**
 * Record terminal output
 */
export function recordOutput(content: string): void {
  if (!content?.trim()) return;
  
  const type = detectType(content);
  const entry: TerminalLogEntry = {
    id: generateId(),
    timestamp: Date.now(),
    type,
    content,
    command: currentCommand || undefined,
    isError: type === 'error',
    isWarning: type === 'warning',
  };
  addLog(entry);
  
  if (entry.isError) {
    console.log(`🔴 [TerminalContext] Error captured`);
  }
}

/**
 * Record an error explicitly
 */
export function recordError(error: string | Error): void {
  const content = error instanceof Error 
    ? `${error.name}: ${error.message}` 
    : error;
  
  const entry: TerminalLogEntry = {
    id: generateId(),
    timestamp: Date.now(),
    type: 'error',
    content,
    command: currentCommand || undefined,
    isError: true,
    isWarning: false,
  };
  addLog(entry);
}

/**
 * Mark errors as resolved
 */
export function markErrorsResolved(): void {
  unresolvedErrorIds.clear();
  updateErrorBadge();
}

/**
 * Clear all logs
 */
export function clearLogs(): void {
  logs = [];
  unresolvedErrorIds.clear();
  currentCommand = null;
  updateErrorBadge();
}

// ============================================================================
// PUBLIC API - RETRIEVAL
// ============================================================================

/**
 * Get recent errors
 */
export function getRecentErrors(count: number = 10): TerminalLogEntry[] {
  return logs.filter(l => l.isError).slice(-count);
}

/**
 * Get recent logs
 */
export function getRecentLogs(count: number = 50): TerminalLogEntry[] {
  return logs.slice(-count);
}

/**
 * Get unresolved errors
 */
export function getUnresolvedErrors(): TerminalLogEntry[] {
  return logs.filter(l => unresolvedErrorIds.has(l.id));
}

/**
 * Get statistics
 */
export function getStats() {
  return {
    totalLogs: logs.length,
    errorCount: logs.filter(l => l.isError).length,
    warningCount: logs.filter(l => l.isWarning).length,
    unresolvedErrors: unresolvedErrorIds.size,
  };
}

// ============================================================================
// PUBLIC API - AI CONTEXT
// ============================================================================

/**
 * Check if terminal context is enabled
 */
export function isTerminalContextEnabled(): boolean {
  return isContextEnabled;
}

/**
 * Toggle terminal context
 */
export function toggleTerminalContext(force?: boolean): void {
  isContextEnabled = force !== undefined ? force : !isContextEnabled;
  updateButtonState();
  console.log(`📺 Terminal context ${isContextEnabled ? 'ENABLED' : 'DISABLED'}`);
  
  // ✅ NEW: Update terminal tab pulsing dot
  if ((window as any).terminalTabAnimation) {
    (window as any).terminalTabAnimation.toggle(isContextEnabled);
  }
  
  // ✅ NEW: Update terminal panel highlight with orange flash animation
  if ((window as any).terminalContextPanel) {
    if (isContextEnabled) {
      (window as any).terminalContextPanel.enable();
    } else {
      (window as any).terminalContextPanel.disable();
    }
  }
  
  window.dispatchEvent(new CustomEvent('terminal-context-toggled', {
    detail: { enabled: isContextEnabled }
  }));
}

/**
 * Get terminal context formatted for AI - IMPROVED VERSION
 * Includes AI instructions, error pattern detection, and platform context
 */
export function getTerminalContextForAI(): string {
  const errors = getUnresolvedErrors();
  const recentLogs = getRecentLogs(20);
  const stats = getStats();
  
  const lines: string[] = [];
  
  // AI Instructions - Tell the AI exactly what to do
  lines.push('📺 **TERMINAL ERROR - HELP NEEDED**');
  lines.push('');
  lines.push('> **AI Instructions:** The user has a terminal error. Analyze the error below and provide:');
  lines.push('> 1. **Root cause** - What exactly is wrong');
  lines.push('> 2. **Solution** - Step-by-step fix (be specific, include commands)');
  lines.push('> 3. **Prevention** - How to avoid this in future');
  lines.push('');
  
  // Platform context
  const isWindows = navigator.userAgent.includes('Windows') || navigator.platform.includes('Win');
  lines.push(`**Platform:** ${isWindows ? 'Windows' : 'macOS/Linux'}`);
  lines.push('');
  
  // Last command
  const lastCommand = [...logs].reverse().find(l => l.type === 'command');
  if (lastCommand) {
    lines.push(`**Command Run:** \`${lastCommand.content}\``);
    lines.push('');
  }
  
  // Error detection and hints
  // ✅ IMPROVED: Check BOTH error-marked lines AND full output for patterns
  const allRecentOutput = recentLogs.filter(l => l.type !== 'command').slice(-15);
  const fullOutputText = allRecentOutput.map(e => e.content).join('\n').toLowerCase();
  
  if (errors.length > 0) {
    lines.push('**Error Output:**');
    lines.push('```');
    errors.slice(-5).forEach(e => lines.push(e.content));
    lines.push('```');
    lines.push('');
    
    // Detect common error patterns - check BOTH error text AND full output
    const errorText = errors.map(e => e.content).join(' ').toLowerCase();
    const combinedText = errorText + ' ' + fullOutputText;
    const hints = detectErrorPatterns(combinedText, lastCommand?.content || '');
    
    if (hints.length > 0) {
      lines.push('**Detected Issue:**');
      hints.forEach(hint => lines.push(`- ${hint}`));
      lines.push('');
    }
  } else {
    // No errors marked, but check full output for hints based on command
    const hints = detectErrorPatterns(fullOutputText, lastCommand?.content || '');
    if (hints.length > 0) {
      lines.push('**Detected Issue:**');
      hints.forEach(hint => lines.push(`- ${hint}`));
      lines.push('');
    }
  }
  
  // ✅ IMPROVED: Always include recent output for context (even with errors)
  // This captures lines that might not match error patterns but are relevant
  const recentNonCommand = recentLogs.filter(l => l.type !== 'command').slice(-15);
  if (recentNonCommand.length > 0) {
    // Check if we have output not already shown in errors
    const errorContents = new Set(errors.map(e => e.content));
    const additionalOutput = recentNonCommand.filter(l => !errorContents.has(l.content));
    
    if (additionalOutput.length > 0) {
      lines.push('**Full Terminal Output:**');
      lines.push('```');
      additionalOutput.forEach(l => lines.push(l.content));
      lines.push('```');
      lines.push('');
    }
  }
  
  // Summary stats
  if (stats.unresolvedErrors > 0 || stats.warningCount > 0) {
    const parts: string[] = [];
    if (stats.unresolvedErrors > 0) parts.push(`${stats.unresolvedErrors} error(s)`);
    if (stats.warningCount > 0) parts.push(`${stats.warningCount} warning(s)`);
    lines.push(`**Summary:** ${parts.join(', ')}`);
  }
  
  let result = lines.join('\n');
  
  // Truncate if too long
  if (result.length > 3000) {
    result = result.substring(0, 2950) + '\n...(truncated)';
  }
  
  return result;
}

/**
 * Detect common error patterns and return helpful hints
 */
function detectErrorPatterns(errorText: string, command: string): string[] {
  const hints: string[] = [];
  const cmdLower = command.toLowerCase();
  const errorLower = errorText.toLowerCase();
  
  // "not recognized" / "command not found" - Tool not installed
  if (errorLower.includes('not recognized') || errorLower.includes('command not found') || errorLower.includes('not found')) {
    // Detect which tool
    if (cmdLower.includes('flutter')) {
      hints.push('🔴 **Flutter SDK is NOT installed** on this computer');
      hints.push('📥 Download from: https://docs.flutter.dev/get-started/install');
      hints.push('📂 Add `flutter/bin` to system PATH after installation');
    } else if (cmdLower.includes('npm') || cmdLower.includes('node')) {
      hints.push('🔴 **Node.js is NOT installed** on this computer');
      hints.push('📥 Download from: https://nodejs.org/');
    } else if (cmdLower.includes('python') || cmdLower.includes('pip')) {
      hints.push('🔴 **Python is NOT installed** or not in PATH');
      hints.push('📥 Download from: https://python.org/downloads/');
    } else if (cmdLower.includes('git')) {
      hints.push('🔴 **Git is NOT installed** on this computer');
      hints.push('📥 Download from: https://git-scm.com/downloads');
    } else if (cmdLower.includes('cargo') || cmdLower.includes('rustc')) {
      hints.push('🔴 **Rust is NOT installed** on this computer');
      hints.push('📥 Install from: https://rustup.rs/');
    } else if (cmdLower.includes('java') || cmdLower.includes('javac')) {
      hints.push('🔴 **Java JDK is NOT installed** or not in PATH');
      hints.push('📥 Download from: https://adoptium.net/');
    } else if (cmdLower.includes('dotnet')) {
      hints.push('🔴 **.NET SDK is NOT installed** on this computer');
      hints.push('📥 Download from: https://dotnet.microsoft.com/download');
    } else if (cmdLower.includes('go ')) {
      hints.push('🔴 **Go is NOT installed** on this computer');
      hints.push('📥 Download from: https://go.dev/dl/');
    } else {
      hints.push('🔴 **Command/tool is NOT installed** or not in system PATH');
      hints.push('💡 Install the required tool and ensure it\'s added to PATH');
    }
  }
  
  // ✅ NEW: Command-based detection when error just says "Failed" 
  // This handles cases where actual error message wasn't captured
  if (hints.length === 0 && (errorLower.includes('failed') || errorLower.includes('✗'))) {
    if (cmdLower.includes('flutter')) {
      hints.push('⚠️ **Flutter command failed** - Possible causes:');
      hints.push('  - Flutter SDK not installed or not in PATH');
      hints.push('  - Missing dependencies (run `flutter doctor`)');
      hints.push('  - Project configuration issues');
      hints.push('📥 If Flutter not installed: https://docs.flutter.dev/get-started/install');
    } else if (cmdLower.includes('npm')) {
      hints.push('⚠️ **npm command failed** - Possible causes:');
      hints.push('  - Node.js not installed');
      hints.push('  - Missing dependencies (run `npm install`)');
      hints.push('  - Package.json issues');
    } else if (cmdLower.includes('yarn')) {
      hints.push('⚠️ **yarn command failed** - Possible causes:');
      hints.push('  - Yarn not installed (run `npm install -g yarn`)');
      hints.push('  - Missing dependencies (run `yarn install`)');
    } else if (cmdLower.includes('python') || cmdLower.includes('pip')) {
      hints.push('⚠️ **Python command failed** - Possible causes:');
      hints.push('  - Python not installed or not in PATH');
      hints.push('  - Missing packages (run `pip install -r requirements.txt`)');
    } else if (cmdLower.includes('cargo')) {
      hints.push('⚠️ **Cargo command failed** - Possible causes:');
      hints.push('  - Rust not installed (https://rustup.rs/)');
      hints.push('  - Compilation errors in code');
    }
  }
  
  // Permission denied
  if (errorLower.includes('permission denied') || errorLower.includes('access denied') || errorLower.includes('eacces')) {
    hints.push('🔒 **Permission denied** - Need admin/elevated privileges');
    hints.push('💡 Try running as Administrator (Windows) or with sudo (Linux/Mac)');
  }
  
  // Module not found / import errors
  if (errorLower.includes('module not found') || errorLower.includes('cannot find module') || errorLower.includes('no module named')) {
    hints.push('📦 **Missing dependency** - Module/package not installed');
    hints.push('💡 Run: `npm install` or `pip install -r requirements.txt`');
  }
  
  // Port in use
  if (errorLower.includes('eaddrinuse') || errorLower.includes('address already in use') || (errorLower.includes('port') && errorLower.includes('in use'))) {
    hints.push('🔌 **Port already in use** by another process');
    hints.push('💡 Kill the process using the port or use a different port');
  }
  
  // Network errors
  if (errorLower.includes('enotfound') || errorLower.includes('econnrefused') || errorLower.includes('etimedout')) {
    hints.push('🌐 **Network error** - Cannot connect');
    hints.push('💡 Check internet connection, firewall, or proxy settings');
  }
  
  // Syntax errors
  if (errorLower.includes('syntaxerror') || errorLower.includes('syntax error') || errorLower.includes('unexpected token')) {
    hints.push('⚠️ **Syntax error** in code');
    hints.push('💡 Check the file and line number mentioned in the error');
  }
  
  // Out of memory
  if (errorLower.includes('out of memory') || errorLower.includes('heap') || errorLower.includes('javascript heap')) {
    hints.push('💾 **Out of memory** - Process ran out of RAM');
    hints.push('💡 Try: `node --max-old-space-size=4096` for Node.js');
  }
  
  // Package.json / dependencies issues
  if (errorLower.includes('package.json') || (errorLower.includes('enoent') && errorLower.includes('package'))) {
    hints.push('📄 **Missing package.json** or wrong directory');
    hints.push('💡 Make sure you\'re in the project root folder');
  }
  
  // Build/compile failures
  if (errorLower.includes('build failed') || errorLower.includes('compilation failed') || (errorLower.includes('error:') && errorLower.includes('compile'))) {
    hints.push('🔨 **Build/compile error** - Code has issues');
    hints.push('💡 Check the specific error message for file and line number');
  }
  
  return hints;
}

/**
 * Check if context should be auto-included
 */
export function shouldIncludeContext(message: string): boolean {
  const keywords = [
    'error', 'bug', 'fix', 'debug', 'issue', 'problem', 'fail',
    'not working', 'broken', 'crash', 'exception', 'warning',
    'terminal', 'console', 'output', 'build', 'run', 'npm', 'yarn'
  ];
  const lower = message.toLowerCase();
  return keywords.some(k => lower.includes(k)) || unresolvedErrorIds.size > 0;
}

/**
 * Enhance message with terminal context if enabled
 */
export function enhanceMessageWithTerminalContext(message: string): string {
  if (!isContextEnabled) {
    return message;
  }
  
  const context = getTerminalContextForAI();
  if (!context || context.length < 50) {
    return message;
  }
  
  // Disable after use
  toggleTerminalContext(false);
  markErrorsResolved();
  
  // Create enhanced message with clear AI instructions
  const enhancedMessage = `${message}

---
${context}

---
**Please analyze the terminal error above and provide a clear, actionable solution.**
**Be specific - include exact commands the user should run.**`
  
  return enhancedMessage;
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================

function updateErrorBadge(): void {
  if (!errorBadgeEl) return;
  const count = unresolvedErrorIds.size;
  if (count > 0) {
    errorBadgeEl.textContent = count > 9 ? '9+' : String(count);
    errorBadgeEl.style.display = 'flex';
  } else {
    errorBadgeEl.style.display = 'none';
  }
}

function updateButtonState(): void {
  updateButtonVisualState();
}

/**
 * Update button visual state based on enabled/disabled
 * Shows obvious visual difference: cyan border + glow when enabled
 */
function updateButtonVisualState(): void {
  if (!contextButtonEl) return;
  
  if (isContextEnabled) {
    // ON: Cyan icon + cyan border + cyan glow - VERY OBVIOUS
    contextButtonEl.style.cssText = `
      position: relative;
      color: #4fc3f7 !important;
      background: rgba(79, 195, 247, 0.15) !important;
      border: 2px solid #4fc3f7 !important;
      box-shadow: 0 0 12px rgba(79, 195, 247, 0.6) !important;
      border-radius: 6px !important;
    `;
    contextButtonEl.title = '✓ Terminal Context ON (click to disable)';
  } else {
    // OFF: Reset to default (inherits from .tool-button class)
    contextButtonEl.style.cssText = 'position: relative;';
    contextButtonEl.title = 'Terminal Context OFF (Ctrl+Shift+T)';
  }
  
  // Update terminal header highlight
  updateTerminalHeaderHighlight(isContextEnabled);
}

/**
 * Highlight the Terminal panel header when AI context is active
 */
function updateTerminalHeaderHighlight(active: boolean): void {
  // Remove AI badge
  document.getElementById('terminal-ai-badge')?.remove();
  
  // Remove header highlight class
  const headers = document.querySelectorAll('.terminal-header-ai-active');
  headers.forEach(h => h.classList.remove('terminal-header-ai-active'));
  
  if (!active) {
    return;
  }
  
  // Add styles if not present
  if (!document.getElementById('terminal-header-ai-styles')) {
    const style = document.createElement('style');
    style.id = 'terminal-header-ai-styles';
    style.textContent = `
      .terminal-header-ai-active {
        border-top: 2px solid #4fc3f7 !important;
        box-shadow: inset 0 1px 0 rgba(79, 195, 247, 0.15) !important;
      }
      .terminal-ai-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: 8px;
        padding: 2px 8px;
        background: rgba(79, 195, 247, 0.2);
        border: none;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
        color: #4fc3f7;
        vertical-align: middle;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Find terminal header - try multiple selectors
  const terminalHeader = document.querySelector('.terminal-header') ||
                         document.querySelector('.panel-header:has(.terminal)') ||
                         document.querySelector('[class*="terminal"] .header') ||
                         document.querySelector('.terminal-panel > div:first-child');
  
  // Find the Terminal title element
  const terminalTitle = document.querySelector('.terminal-header .title') ||
                        document.querySelector('.terminal-header span:first-child') ||
                        document.querySelector('.terminal-header-title');
  
  if (terminalHeader) {
    terminalHeader.classList.add('terminal-header-ai-active');
  }
  
  // Add AI badge next to title
  if (terminalTitle && !document.getElementById('terminal-ai-badge')) {
    const badge = document.createElement('span');
    badge.id = 'terminal-ai-badge';
    badge.className = 'terminal-ai-badge';
    badge.textContent = 'AI';
    
    // Insert after the title
    if (terminalTitle.parentElement) {
      terminalTitle.parentElement.insertBefore(badge, terminalTitle.nextSibling);
    } else {
      terminalTitle.appendChild(badge);
    }
  }
  
  console.log('📺 Terminal header highlighted');
}

/**
 * Show error preview popup when clicking terminal button with errors
 * Displays captured errors and offers quick actions
 * Auto-hides after 1.5 seconds
 */
function showErrorPreviewPopup(autoShow: boolean = false): void {
  // Remove existing popup
  document.getElementById('terminal-error-popup')?.remove();
  
  // Don't auto-show if dismissed recently
  if (autoShow) {
    const lastDismiss = localStorage.getItem('terminal_context_dismiss');
    if (lastDismiss && Date.now() - parseInt(lastDismiss) < 60000) {
      return;
    }
  }
  
  const errors = getUnresolvedErrors();
  
  // Add styles if not present
  if (!document.getElementById('terminal-popup-styles')) {
    const style = document.createElement('style');
    style.id = 'terminal-popup-styles';
    style.textContent = `
      @keyframes popupFadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes popupFadeOut {
        from { opacity: 1; }
        to { opacity: 0; transform: translateY(10px); }
      }
      #terminal-error-popup {
        animation: popupFadeIn 0.15s ease-out;
      }
      #terminal-error-popup.hiding {
        animation: popupFadeOut 0.15s ease-out forwards;
      }
      .popup-action-btn {
        transition: all 0.1s ease;
      }
      .popup-action-btn:hover {
        transform: scale(1.02);
      }
    `;
    document.head.appendChild(style);
  }
  
  const popup = document.createElement('div');
  popup.id = 'terminal-error-popup';
  popup.style.cssText = `
    position: fixed;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: #1e1e1e;
    border: 1px solid #404040;
    border-radius: 10px;
    padding: 0;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    z-index: 10001;
    width: 280px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
  
  // Get first error only (compact)
  const firstError = errors[0];
  const shortError = firstError ? 
    (firstError.content.length > 50 ? firstError.content.substring(0, 50) + '...' : firstError.content) : 
    'Unknown error';
  
  popup.innerHTML = `
    <div style="padding: 10px 12px; border-bottom: 1px solid #333;">
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
        <div style="width: 6px; height: 6px; background: #f85149; border-radius: 50%;"></div>
        <span style="color: #fff; font-size: 12px; font-weight: 600;">${errors.length} Error${errors.length !== 1 ? 's' : ''}</span>
      </div>
      <div style="font-size: 11px; font-family: 'Consolas', monospace; color: #f85149; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(shortError)}</div>
    </div>
    
    <div style="padding: 8px; display: flex; gap: 6px;">
      <button id="popup-ask-ai" class="popup-action-btn" style="
        flex: 1;
        background: #4fc3f7;
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        color: #1e1e1e;
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
      ">Ask AI to fix</button>
      <button id="popup-later" class="popup-action-btn" style="
        background: #333;
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        color: #888;
        cursor: pointer;
        font-size: 11px;
      ">Later</button>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  let autoHideTimeout: number;
  
  const hidePopup = (savePreference: boolean = false) => {
    clearTimeout(autoHideTimeout);
    popup.classList.add('hiding');
    if (savePreference) {
      localStorage.setItem('terminal_context_dismiss', String(Date.now()));
    }
    setTimeout(() => popup.remove(), 150);
  };
  
  // Auto-hide after 1.5 seconds
  autoHideTimeout = window.setTimeout(() => {
    if (document.getElementById('terminal-error-popup')) {
      hidePopup();
    }
  }, 1500);
  
  // Pause auto-hide on hover
  popup.addEventListener('mouseenter', () => clearTimeout(autoHideTimeout));
  popup.addEventListener('mouseleave', () => {
    autoHideTimeout = window.setTimeout(() => hidePopup(), 1000);
  });
  
  // Ask AI button - sends message directly using improved askAIToFixErrors
  popup.querySelector('#popup-ask-ai')?.addEventListener('click', async () => {
    hidePopup();
    // Use the improved function that sends full context
    askAIToFixErrors();
  });
  
  // Later button
  popup.querySelector('#popup-later')?.addEventListener('click', () => {
    hidePopup(true);
  });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Directly ask AI to help fix terminal errors
 * Called when clicking the terminal button with errors
 * Also enables AI Project Search to analyze project files
 */
function askAIToFixErrors(): void {
  // Enable terminal context so errors are included
  toggleTerminalContext(true);
  updateButtonVisualState();
  
  // Enable AI Project Search to analyze project files for error source
  enableAIProjectSearch();
  
  // Get error details and full context
  const errors = getUnresolvedErrors();
  const errorCount = errors.length;
  const allLogs = [...logs]; // Get all logs
  
  // ============================================================================
  // FIX: Find command from log CONTENT (not type)
  // Logs have type: 'output' or 'error', command is in content like "$ flutter run"
  // ============================================================================
  let command = 'Unknown command';
  
  for (const log of [...allLogs].reverse()) {
    const content = log.content || '';
    
    // Check if content starts with $ or > (command prompt)
    if (content.startsWith('$') || content.startsWith('>')) {
      command = content.replace(/^[$>]\s*/, '').trim();
      break;
    }
    
    // Check if content matches known command patterns
    if (/^(flutter|npm|yarn|python|pip|cargo|go|node|dotnet|mvn|gradle)\s/.test(content)) {
      command = content.trim();
      break;
    }
    
    // Also check the old way (type === 'command') for backwards compatibility
    if (log.type === 'command') {
      command = content;
      break;
    }
  }
  
  // ============================================================================
  // FIX: Get ALL output, not just error-marked lines
  // ============================================================================
  const allOutput = allLogs
    .filter(l => l.type !== 'command')
    .map(l => l.content || '')
    .filter(c => c.trim())
    .join('\n');
  
  // Build error text - prefer full output over just error-marked lines
  const errorMarkedText = errors.map(e => e.content).join('\n');
  const errorText = allOutput.length > errorMarkedText.length ? allOutput : errorMarkedText;
  
  // ============================================================================
  // FIX: Detect issues from COMBINED text (command + all output)
  // ============================================================================
  const combinedLower = (command + ' ' + errorText + ' ' + allOutput).toLowerCase();
  let issueHint = '';
  
  if (combinedLower.includes('not recognized') || combinedLower.includes('command not found')) {
    if (combinedLower.includes('flutter')) {
      issueHint = '\n\n**Detected Issue:** 🔴 Flutter SDK is NOT installed.\n📥 Download: https://docs.flutter.dev/get-started/install\n📂 Add flutter/bin to PATH';
    } else if (combinedLower.includes('npm') || combinedLower.includes('node')) {
      issueHint = '\n\n**Detected Issue:** 🔴 Node.js is NOT installed.\n📥 Download: https://nodejs.org/';
    } else if (combinedLower.includes('python') || combinedLower.includes('pip')) {
      issueHint = '\n\n**Detected Issue:** 🔴 Python is NOT installed.\n📥 Download: https://python.org/downloads/';
    } else if (combinedLower.includes('cargo') || combinedLower.includes('rustc')) {
      issueHint = '\n\n**Detected Issue:** 🔴 Rust is NOT installed.\n📥 Download: https://rustup.rs/';
    } else if (combinedLower.includes('go ')) {
      issueHint = '\n\n**Detected Issue:** 🔴 Go is NOT installed.\n📥 Download: https://go.dev/dl/';
    } else if (combinedLower.includes('java') || combinedLower.includes('javac')) {
      issueHint = '\n\n**Detected Issue:** 🔴 Java is NOT installed.\n📥 Download: https://adoptium.net/';
    } else if (combinedLower.includes('dotnet')) {
      issueHint = '\n\n**Detected Issue:** 🔴 .NET is NOT installed.\n📥 Download: https://dotnet.microsoft.com/download';
    } else {
      issueHint = '\n\n**Detected Issue:** 🔴 The command/tool is NOT installed or not in PATH.';
    }
  } else if (combinedLower.includes('permission denied') || combinedLower.includes('access denied')) {
    issueHint = '\n\n**Detected Issue:** 🔒 Permission denied. May need admin/elevated privileges.';
  } else if (combinedLower.includes('module not found') || combinedLower.includes('cannot find module')) {
    issueHint = '\n\n**Detected Issue:** 📦 Missing dependencies. Run `npm install` or equivalent.';
  } else if (combinedLower.includes('econnrefused') || combinedLower.includes('etimedout')) {
    issueHint = '\n\n**Detected Issue:** 🌐 Network connection failed. Check internet or proxy settings.';
  } else if (combinedLower.includes('failed') || combinedLower.includes('✗')) {
    // Fallback hints based on detected tool
    if (combinedLower.includes('flutter')) {
      issueHint = '\n\n**Possible Issue:** Flutter SDK may not be installed or configured correctly.\n📥 Install: https://docs.flutter.dev/get-started/install';
    } else if (combinedLower.includes('npm') || combinedLower.includes('node')) {
      issueHint = '\n\n**Possible Issue:** Node.js build failed. Check package.json and dependencies.';
    }
  }
  
  // Platform
  const isWindows = navigator.userAgent.includes('Windows') || navigator.platform.includes('Win');
  const platform = isWindows ? 'Windows' : 'macOS/Linux';
  
  // Build comprehensive message for AI
  const aiMessage = `🔴 **TERMINAL ERROR - HELP ME FIX THIS**

**Platform:** ${platform}
**Command:** \`${command}\`

**Error Output:**
\`\`\`
${errorText.substring(0, 1000)}
\`\`\`
${issueHint}

**Please provide:**
1. What is causing this error (root cause)
2. Step-by-step solution with exact commands to run
3. How to verify the fix worked`;
  
  // Send message to AI
  const input = document.querySelector('#ai-assistant-input') as HTMLTextAreaElement;
  if (input) {
    input.value = aiMessage;
    input.focus();
    
    // Trigger input event for any listeners
    input.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Trigger send
    const sendBtn = document.querySelector('#send-btn, .modern-send-btn') as HTMLButtonElement;
    if (sendBtn) {
      setTimeout(() => sendBtn.click(), 150);
    }
  }
  
  console.log(`📺 [TerminalContext] Asking AI to fix ${errorCount} error(s) with full context`);
  console.log(`📺 Command: ${command}`);
  console.log(`📺 Error text length: ${errorText.length}`);
}

/**
 * Enable AI Project Search if not already enabled
 * Uses the aiFileExplorer API exposed on window
 */
function enableAIProjectSearch(): void {
  try {
    // Method 1: Check if already enabled using the API
    const isEnabled = (window as any).isAISearchEnabled?.();
    
    if (isEnabled) {
      console.log('📺 [TerminalContext] AI Project Search already ON');
      return;
    }
    
    // Method 2: Use toggleAISearch() API (exposed on window)
    if ((window as any).toggleAISearch) {
      (window as any).toggleAISearch(); // This toggles, so call only if OFF
      console.log('📺 [TerminalContext] AI Project Search enabled via toggleAISearch()');
      return;
    }
    
    // Method 3: Direct localStorage + click button fallback
    localStorage.setItem('aiFileExplorerEnabled', 'true');
    (window as any).aiFileExplorerEnabled = true;
    
    // Click the button to update UI
    const searchBtn = document.querySelector('#ai-search-tool-btn') as HTMLButtonElement;
    if (searchBtn && !searchBtn.classList.contains('active')) {
      searchBtn.click();
      console.log('📺 [TerminalContext] AI Project Search enabled via button click');
    }
    
  } catch (err) {
    console.warn('📺 [TerminalContext] Could not enable AI Project Search:', err);
  }
}

/**
 * ✅ FIX: Retry counter to prevent infinite loop
 */
let toolbarRetryCount = 0;
const MAX_TOOLBAR_RETRIES = 5; // Max 30 seconds of retrying

/**
 * Add terminal context button to chat UI
 * Styled to match IDE toolbar icons
 */
export function addTerminalContextButton(): void {
  // Find the correct toolbar where other tool buttons are
  const toolbar = document.querySelector('.tool-buttons-group.modern-tools-left') ||
                  document.querySelector('.modern-bottom-toolbar .tool-buttons-group') ||
                  document.querySelector('.tool-buttons-group');
  
  if (!toolbar) {
    toolbarRetryCount++;
    if (toolbarRetryCount >= MAX_TOOLBAR_RETRIES) {
      console.warn(`⚠️ [TerminalContext] Toolbar not found after ${MAX_TOOLBAR_RETRIES} attempts. Stopping.`);
      console.log('   💡 Terminal context button will be available when you open the terminal panel.');
      return; // Stop retrying!
    }
    console.warn(`⚠️ [TerminalContext] Toolbar not found, retrying... (${toolbarRetryCount}/${MAX_TOOLBAR_RETRIES})`);
    setTimeout(addTerminalContextButton, 2000);
    return;
  }
  
  // ✅ Reset counter on success
  toolbarRetryCount = 0;
  
  // Check if already added
  if (document.getElementById('terminal-ctx-btn')) return;
  
  // Add styles to disable ripple animation on this button
  if (!document.getElementById('terminal-btn-no-ripple')) {
    const style = document.createElement('style');
    style.id = 'terminal-btn-no-ripple';
    style.textContent = `
      #terminal-ctx-btn {
        overflow: visible !important;
      }
      #terminal-ctx-btn::after,
      #terminal-ctx-btn::before {
        display: none !important;
        animation: none !important;
      }
      #terminal-ctx-btn:active {
        transform: scale(0.95);
        transition: transform 0.1s ease;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Terminal SVG icon (matches IDE style)
  const terminalSvg = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="4 17 10 11 4 5"></polyline>
      <line x1="12" y1="19" x2="20" y2="19"></line>
    </svg>
  `;
  
  // Create button matching IDE icon style
  contextButtonEl = document.createElement('button');
  contextButtonEl.id = 'terminal-ctx-btn';
  contextButtonEl.className = 'tool-button';  // Same class as other toolbar buttons
  contextButtonEl.title = 'Terminal Context OFF (Ctrl+Shift+T)';
  contextButtonEl.style.position = 'relative';
  contextButtonEl.innerHTML = terminalSvg;
  
  // Error badge (small dot style)
  errorBadgeEl = document.createElement('span');
  errorBadgeEl.id = 'terminal-error-badge';
  errorBadgeEl.style.cssText = `
    position: absolute;
    top: 0px;
    right: 0px;
    background: #f85149;
    color: white;
    border-radius: 50%;
    width: 14px;
    height: 14px;
    font-size: 9px;
    font-weight: bold;
    display: none;
    align-items: center;
    justify-content: center;
    line-height: 14px;
    text-align: center;
    box-shadow: 0 0 0 2px #1e1e1e;
  `;
  contextButtonEl.appendChild(errorBadgeEl);
  
  // Click handler - if errors exist, directly ask AI for help
  contextButtonEl.addEventListener('click', (e) => {
    const hasErrors = unresolvedErrorIds.size > 0;
    
    if (hasErrors) {
      // Directly ask AI to help fix errors
      askAIToFixErrors();
    } else {
      // Just toggle on/off
      toggleTerminalContext();
      updateButtonVisualState();
    }
  });
  
  // Insert as first child of toolbar
  if (toolbar.firstChild) {
    toolbar.insertBefore(contextButtonEl, toolbar.firstChild);
  } else {
    toolbar.appendChild(contextButtonEl);
  }
  
  updateErrorBadge();
  updateButtonVisualState();
  console.log('✅ [TerminalContext] Button added to toolbar');
}

// ============================================================================
// TERMINAL INTERCEPTORS
// ============================================================================

/**
 * Setup DOM observer to capture terminal output
 */
function setupTerminalObserver(): void {
  // ✅ FIX: Retry counter to prevent infinite loop
  let observerRetryCount = 0;
  const MAX_OBSERVER_RETRIES = 5;
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          const text = node.textContent?.trim();
          if (text && text.length > 0 && !node.hasAttribute('data-ctx-captured')) {
            node.setAttribute('data-ctx-captured', 'true');
            
            const isCmd = node.classList.contains('terminal-command') ||
                          node.classList.contains('bld-command');
            
            if (isCmd) {
              recordCommand(text);
            } else {
              recordOutput(text);
            }
          }
        }
      });
    });
  });
  
  // Try to observe terminal output elements
  const tryObserve = () => {
    const targets = [
      document.getElementById('integrated-terminal-output'),
      document.querySelector('.terminal-output'),
      document.querySelector('.enhanced-output'),
    ].filter(Boolean);
    
    targets.forEach(target => {
      if (target) {
        observer.observe(target, { childList: true, subtree: true });
      }
    });
    
    if (targets.length > 0) {
      console.log('✅ [TerminalContext] Observer attached to', targets.length, 'terminal(s)');
      observerRetryCount = 0; // Reset on success
    } else {
      observerRetryCount++;
      if (observerRetryCount >= MAX_OBSERVER_RETRIES) {
        console.warn(`⚠️ [TerminalContext] Terminal not found after ${MAX_OBSERVER_RETRIES} attempts. Stopping.`);
        console.log('   💡 Terminal observer will activate when terminal is opened.');
        return; // Stop retrying!
      }
      console.log(`⏳ [TerminalContext] Waiting for terminal... (${observerRetryCount}/${MAX_OBSERVER_RETRIES})`);
      setTimeout(tryObserve, 2000);
    }
  };
  
  tryObserve();
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+T - Toggle terminal context
    if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'T') {
      e.preventDefault();
      toggleTerminalContext();
    }
    
    // Ctrl+Shift+E - Quick debug error
    if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'E') {
      e.preventDefault();
      quickDebugError();
    }
  });
}

/**
 * Quick action: Send last error to AI
 */
export async function quickDebugError(): Promise<void> {
  const errors = getRecentErrors(1);
  if (errors.length === 0) {
    console.log('No errors to debug');
    return;
  }
  
  const error = errors[0];
  const message = `Please help me debug this error:\n\n\`\`\`\n${error.content}\n\`\`\``;
  
  // Try to send to chat
  const sendFn = (window as any).sendMessageDirectly ||
                 (window as any).sendMessage;
  
  if (sendFn) {
    await sendFn(message);
  } else {
    // Fallback: put in input
    const input = document.querySelector('.ai-chat-input, textarea') as HTMLTextAreaElement;
    if (input) {
      input.value = message;
      input.focus();
    }
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the terminal context system
 */
export function initializeTerminalContext(): void {
  console.log('🚀 [TerminalContext] Initializing...');
  
  // Setup observer
  setupTerminalObserver();
  
  // Add UI button
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(addTerminalContextButton, 500);
    });
  } else {
    setTimeout(addTerminalContextButton, 500);
  }
  
  // Setup shortcuts
  setupKeyboardShortcuts();
  
  console.log('✅ [TerminalContext] Ready!');
  console.log('   📌 Ctrl+Shift+T: Toggle terminal context');
  console.log('   📌 Ctrl+Shift+E: Quick debug last error');
}

// ============================================================================
// GLOBAL EXPOSURE
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).terminalContext = {
    // Toggle & state
    toggle: toggleTerminalContext,
    isEnabled: isTerminalContextEnabled,
    
    // Recording
    recordCommand,
    recordOutput,
    recordError,
    markResolved: markErrorsResolved,
    clear: clearLogs,
    
    // Retrieval
    getErrors: getRecentErrors,
    getLogs: getRecentLogs,
    getUnresolved: getUnresolvedErrors,
    getStats,
    
    // AI context
    getContext: getTerminalContextForAI,
    enhance: enhanceMessageWithTerminalContext,
    shouldInclude: shouldIncludeContext,
    
    // Actions
    debugError: quickDebugError,
    
    // Init
    init: initializeTerminalContext,
  };
  
  // Auto-init
  if (document.readyState === 'complete') {
    initializeTerminalContext();
  } else {
    window.addEventListener('load', initializeTerminalContext);
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  initializeTerminalContext,
  toggleTerminalContext,
  isTerminalContextEnabled,
  enhanceMessageWithTerminalContext,
  getTerminalContextForAI,
  recordCommand,
  recordOutput,
  recordError,
  markErrorsResolved,
  clearLogs,
  getRecentErrors,
  getRecentLogs,
  getUnresolvedErrors,
  getStats,
  quickDebugError,
};