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
 * UPDATED: Popup disabled - consolidated with buildSystemIntegration.ts popup
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
  
  // Command not found errors (Windows & Unix)
  /is not recognized as an internal or external command/i,
  /is not recognized as a cmdlet/i,  // PowerShell
  /command not found/i,               // Unix/Mac
  /not found$/i,                      // Generic not found
  /No such file or directory/i,
  /program not found/i,
  /unable to find/i,
  
  // Permission errors
  /permission denied/i,
  /access is denied/i,
  /Operation not permitted/i,
  
  // Build/compile errors  
  /build failed/i,
  /compilation failed/i,
  /compile error/i,
  
  // Network errors
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /network error/i,
  
  // Package/dependency errors
  /could not resolve/i,
  /unable to resolve/i,
  /dependency .* not found/i,
  
  // Flutter/Dart specific
  /flutter.*not found/i,
  /dart.*not found/i,
  
  // Failed with X mark
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
    
    // ✅ DISABLED: Popup is now handled by buildSystemIntegration.ts
    // The consolidated popup shows in bottom-left with Copy button
    // if (!isContextEnabled && unresolvedErrorIds.size === 1) {
    //   showErrorPreviewPopup(true);
    // }
  }
  
  // Dispatch event for other listeners (like terminalToggleBadge)
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
  
  // Update terminal tab pulsing dot
  if ((window as any).terminalTabAnimation) {
    (window as any).terminalTabAnimation.toggle(isContextEnabled);
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
  const allRecentOutput = recentLogs.filter(l => l.type !== 'command').slice(-15);
  const fullOutputText = allRecentOutput.map(e => e.content).join('\n').toLowerCase();
  
  if (errors.length > 0) {
    lines.push('**Error Output:**');
    lines.push('```');
    errors.slice(-5).forEach(e => lines.push(e.content));
    lines.push('```');
    lines.push('');
    
    // Detect common error patterns
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
  
  // Always include recent output for context
  const recentNonCommand = recentLogs.filter(l => l.type !== 'command').slice(-15);
  if (recentNonCommand.length > 0) {
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
  
  // Command-based detection when error just says "Failed" 
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
  if (errorLower.includes('econnrefused') || errorLower.includes('etimedout') || errorLower.includes('enotfound')) {
    hints.push('🌐 **Network error** - Connection failed');
    hints.push('💡 Check internet connection, proxy settings, or if server is running');
  }
  
  return hints;
}

/**
 * Should include terminal context in message?
 * Returns true if there are errors OR context is explicitly enabled
 */
export function shouldIncludeContext(): boolean {
  return isContextEnabled || unresolvedErrorIds.size > 0;
}

/**
 * Enhance user message with terminal context
 */
export function enhanceMessageWithTerminalContext(userMessage: string): string {
  if (!shouldIncludeContext()) {
    return userMessage;
  }
  
  const context = getTerminalContextForAI();
  
  if (!context || context.trim().length === 0) {
    return userMessage;
  }
  
  return `${context}\n\n---\n\n**User Question:**\n${userMessage}`;
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================

function updateErrorBadge(): void {
  // Update own badge
  if (errorBadgeEl) {
    const count = unresolvedErrorIds.size;
    if (count > 0) {
      errorBadgeEl.textContent = count > 9 ? '9+' : String(count);
      errorBadgeEl.style.display = 'flex';
    } else {
      errorBadgeEl.style.display = 'none';
    }
  }
  
  // ✅ Also update unified badge (terminalToggleBadge)
  const unifiedBadge = (window as any).terminalToggleBadge;
  if (unifiedBadge?.update) {
    const stats = getStats();
    unifiedBadge.update(stats.unresolvedErrors, stats.warningCount);
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
        background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
        color: #1e1e1e;
        font-size: 9px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 8px;
        margin-left: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        box-shadow: 0 1px 4px rgba(79, 195, 247, 0.3);
      }
    `;
    document.head.appendChild(style);
  }
  
  // Find terminal header
  const terminalHeaders = document.querySelectorAll('.terminal-header, .panel-header, [class*="terminal"] [class*="header"]');
  
  terminalHeaders.forEach(header => {
    const text = header.textContent?.toLowerCase() || '';
    if (text.includes('terminal')) {
      header.classList.add('terminal-header-ai-active');
      
      // Add AI badge
      if (!header.querySelector('.terminal-ai-badge')) {
        const badge = document.createElement('span');
        badge.className = 'terminal-ai-badge';
        badge.textContent = 'AI';
        badge.title = 'Terminal output is being shared with AI';
        header.appendChild(badge);
      }
    }
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
  
  // Find command from log CONTENT (not type)
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
  
  // Get ALL output, not just error-marked lines
  const allOutput = allLogs
    .filter(l => l.type !== 'command')
    .map(l => l.content || '')
    .filter(c => c.trim())
    .join('\n');
  
  // Build error text - prefer full output over just error-marked lines
  const errorMarkedText = errors.map(e => e.content).join('\n');
  const errorText = allOutput.length > errorMarkedText.length ? allOutput : errorMarkedText;
  
  // Detect issues from COMBINED text (command + all output)
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
      console.log('📺 [TerminalContext] AI Project Search already enabled');
      return;
    }
    
    // Method 2: Try to enable using the API
    const enableFn = (window as any).enableAIProjectSearch;
    if (enableFn) {
      enableFn();
      console.log('📺 [TerminalContext] AI Project Search enabled');
      return;
    }
    
    // Method 3: Click the toggle button
    const toggleBtn = document.getElementById('ai-file-toggle-btn');
    if (toggleBtn && !toggleBtn.classList.contains('active')) {
      toggleBtn.click();
      console.log('📺 [TerminalContext] AI Project Search toggled on');
    }
  } catch (e) {
    console.log('📺 [TerminalContext] AI Project Search not available');
  }
}

// ============================================================================
// TERMINAL CONTEXT BUTTON (in AI assistant toolbar)
// ============================================================================

/**
 * Add terminal context button to AI assistant toolbar
 */
function addTerminalContextButton(): void {
  // Find the toolbar
  const toolbar = document.querySelector('.chat-input-toolbar, .ai-toolbar, .input-toolbar');
  if (!toolbar) {
    setTimeout(addTerminalContextButton, 1000);
    return;
  }
  
  // Don't add if already exists
  if (document.getElementById('terminal-ctx-btn')) return;
  
  // Add CSS for clean non-animated button
  if (!document.getElementById('terminal-ctx-btn-styles')) {
    const style = document.createElement('style');
    style.id = 'terminal-ctx-btn-styles';
    style.textContent = `
      #terminal-ctx-btn {
        animation: none !important;
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
  let observerRetryCount = 0;
  const MAX_OBSERVER_RETRIES = 15;
  
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
  console.log('   📌 Popup disabled - using buildSystemIntegration popup');
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
    askAI: askAIToFixErrors,
    
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
