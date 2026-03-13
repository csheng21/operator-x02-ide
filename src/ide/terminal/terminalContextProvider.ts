/**
 * ====================================================================================================
 * FILE: src/ide/terminal/terminalContextProvider.ts
 * TERMINAL CONTEXT PROVIDER - Captures terminal logs for AI context awareness
 * ====================================================================================================
 * 
 * PURPOSE:
 * - Captures all terminal output in a rolling buffer
 * - Provides filtered access to errors, warnings, and command outputs
 * - Integrates with AI assistant for debugging assistance
 * - Auto-detects when terminal context might be helpful
 * 
 * FEATURES:
 * - Rolling buffer (configurable max entries)
 * - Output categorization (error, warning, info, success, command)
 * - Smart filtering for AI context
 * - Timestamp tracking
 * - Command association (which command produced which output)
 * 
 * ====================================================================================================
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type TerminalOutputType = 
  | 'command'      // User-entered command
  | 'output'       // Normal output
  | 'error'        // Error messages
  | 'warning'      // Warning messages
  | 'success'      // Success messages
  | 'info'         // Informational messages
  | 'system';      // System messages

export interface TerminalLogEntry {
  id: string;
  timestamp: number;
  type: TerminalOutputType;
  content: string;
  command?: string;           // Associated command (if output is result of a command)
  projectPath?: string;       // Project context
  filePath?: string;          // Related file (extracted from error messages)
  lineNumber?: number;        // Line number (extracted from error messages)
  isError: boolean;
  isWarning: boolean;
  metadata?: {
    exitCode?: number;
    duration?: number;
    buildSystem?: string;
    language?: string;
  };
}

export interface TerminalContext {
  recentCommands: string[];
  recentErrors: TerminalLogEntry[];
  recentWarnings: TerminalLogEntry[];
  recentOutput: TerminalLogEntry[];
  lastCommand?: string;
  lastError?: TerminalLogEntry;
  hasUnresolvedErrors: boolean;
  summary: string;
}

export interface TerminalContextOptions {
  maxEntries?: number;
  maxContextLength?: number;
  includeTimestamps?: boolean;
  errorPriority?: boolean;
}

// ============================================================================
// ERROR DETECTION PATTERNS
// ============================================================================

const ERROR_PATTERNS = [
  // JavaScript/TypeScript
  /error\s*:/i,
  /TypeError:/i,
  /ReferenceError:/i,
  /SyntaxError:/i,
  /Cannot find module/i,
  /is not defined/i,
  /unexpected token/i,
  /ENOENT/,
  /EACCES/,
  /Cannot read propert/i,
  
  // Python
  /Traceback \(most recent call last\)/i,
  /^.*Error:.*$/m,
  /IndentationError:/i,
  /ImportError:/i,
  /ModuleNotFoundError:/i,
  /NameError:/i,
  /ValueError:/i,
  /KeyError:/i,
  /AttributeError:/i,
  
  // Rust
  /^error\[E\d+\]:/m,
  /cannot find/i,
  /^error:/m,
  
  // General
  /FAILED/i,
  /FATAL/i,
  /Exception/i,
  /panic/i,
  /segmentation fault/i,
  /compilation failed/i,
  /build failed/i,
  /npm ERR!/,
  /yarn error/i,
  /cargo error/i,
];

const WARNING_PATTERNS = [
  /warning\s*:/i,
  /^warn/im,
  /deprecated/i,
  /DEPRECATION/,
  /⚠️/,
  /\[warn\]/i,
  /\[warning\]/i,
];

const SUCCESS_PATTERNS = [
  /success/i,
  /completed/i,
  /✓/,
  /✅/,
  /built in/i,
  /compiled successfully/i,
  /passed/i,
  /done/i,
];

// File path extraction patterns
const FILE_PATH_PATTERNS = [
  // Standard path with line:column
  /([A-Za-z]:)?[\\/]?[\w\-./\\]+\.(ts|tsx|js|jsx|py|rs|go|java|c|cpp|h|cs|rb|php|swift|kt|scala)\s*:\s*(\d+)(?::(\d+))?/g,
  // Relative path
  /(?:at |in |file )(\.?[\w\-./]+\.(ts|tsx|js|jsx|py|rs|go|java|c|cpp|h|cs|rb|php|swift|kt|scala)):(\d+)/gi,
  // Python traceback style
  /File "([^"]+)", line (\d+)/g,
  // Rust style
  /-->\s*([^\s:]+):(\d+):(\d+)/g,
];

// ============================================================================
// TERMINAL CONTEXT PROVIDER CLASS
// ============================================================================

class TerminalContextProvider {
  private static instance: TerminalContextProvider;
  
  private logs: TerminalLogEntry[] = [];
  private maxEntries: number = 500;
  private currentCommand: string | null = null;
  private currentProjectPath: string | null = null;
  private listeners: Set<(entry: TerminalLogEntry) => void> = new Set();
  private errorCount: number = 0;
  private warningCount: number = 0;
  private unresolvedErrorIds: Set<string> = new Set();
  
  private constructor() {
    console.log('🧠 Terminal Context Provider initialized');
    this.setupGlobalListeners();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): TerminalContextProvider {
    if (!TerminalContextProvider.instance) {
      TerminalContextProvider.instance = new TerminalContextProvider();
    }
    return TerminalContextProvider.instance;
  }
  
  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  
  /**
   * Set maximum log entries to retain
   */
  public setMaxEntries(max: number): void {
    this.maxEntries = max;
    this.trimLogs();
  }
  
  /**
   * Set current project path for context
   */
  public setProjectPath(path: string): void {
    this.currentProjectPath = path;
  }
  
  // ============================================================================
  // LOG CAPTURE
  // ============================================================================
  
  /**
   * Record a command being executed
   */
  public recordCommand(command: string): void {
    this.currentCommand = command;
    
    const entry = this.createEntry({
      type: 'command',
      content: command,
      command: command,
    });
    
    this.addEntry(entry);
    console.log(`📝 [TerminalContext] Command recorded: ${command}`);
  }
  
  /**
   * Record terminal output
   */
  public recordOutput(content: string, metadata?: TerminalLogEntry['metadata']): void {
    if (!content || !content.trim()) return;
    
    const type = this.detectOutputType(content);
    const fileInfo = this.extractFileInfo(content);
    
    const entry = this.createEntry({
      type,
      content,
      command: this.currentCommand || undefined,
      filePath: fileInfo?.filePath,
      lineNumber: fileInfo?.lineNumber,
      metadata,
    });
    
    this.addEntry(entry);
    
    // Track unresolved errors
    if (entry.isError) {
      this.unresolvedErrorIds.add(entry.id);
      this.errorCount++;
      console.log(`🔴 [TerminalContext] Error captured: ${content.substring(0, 100)}...`);
    }
    
    if (entry.isWarning) {
      this.warningCount++;
    }
  }
  
  /**
   * Record structured output (from build system)
   */
  public recordBuildOutput(
    content: string, 
    buildSystem: string, 
    exitCode: number, 
    duration: number
  ): void {
    this.recordOutput(content, {
      buildSystem,
      exitCode,
      duration,
    });
    
    // Clear command after build completes
    if (exitCode === 0) {
      this.markErrorsResolved();
    }
    this.currentCommand = null;
  }
  
  /**
   * Record an error explicitly
   */
  public recordError(error: string | Error, context?: string): void {
    const content = error instanceof Error 
      ? `${error.name}: ${error.message}\n${error.stack || ''}`
      : error;
    
    const entry = this.createEntry({
      type: 'error',
      content: context ? `[${context}] ${content}` : content,
      command: this.currentCommand || undefined,
    });
    
    entry.isError = true;
    this.addEntry(entry);
    this.unresolvedErrorIds.add(entry.id);
    this.errorCount++;
    
    console.log(`🔴 [TerminalContext] Error recorded: ${content.substring(0, 100)}...`);
  }
  
  /**
   * Mark errors as resolved (e.g., after successful build)
   */
  public markErrorsResolved(): void {
    this.unresolvedErrorIds.clear();
    console.log('✅ [TerminalContext] All errors marked as resolved');
  }
  
  // ============================================================================
  // LOG RETRIEVAL
  // ============================================================================
  
  /**
   * Get all logs
   */
  public getAllLogs(): TerminalLogEntry[] {
    return [...this.logs];
  }
  
  /**
   * Get recent logs (last N entries)
   */
  public getRecentLogs(count: number = 50): TerminalLogEntry[] {
    return this.logs.slice(-count);
  }
  
  /**
   * Get recent errors
   */
  public getRecentErrors(count: number = 10): TerminalLogEntry[] {
    return this.logs
      .filter(log => log.isError)
      .slice(-count);
  }
  
  /**
   * Get recent warnings
   */
  public getRecentWarnings(count: number = 10): TerminalLogEntry[] {
    return this.logs
      .filter(log => log.isWarning)
      .slice(-count);
  }
  
  /**
   * Get unresolved errors
   */
  public getUnresolvedErrors(): TerminalLogEntry[] {
    return this.logs.filter(log => this.unresolvedErrorIds.has(log.id));
  }
  
  /**
   * Get logs for a specific command
   */
  public getLogsForCommand(command: string): TerminalLogEntry[] {
    return this.logs.filter(log => log.command === command);
  }
  
  /**
   * Get last command and its output
   */
  public getLastCommandWithOutput(): { command: string; output: TerminalLogEntry[] } | null {
    const commandEntries = this.logs.filter(log => log.type === 'command');
    const lastCommand = commandEntries[commandEntries.length - 1];
    
    if (!lastCommand) return null;
    
    return {
      command: lastCommand.content,
      output: this.getLogsForCommand(lastCommand.content),
    };
  }
  
  /**
   * Search logs by content
   */
  public searchLogs(query: string): TerminalLogEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.logs.filter(log => 
      log.content.toLowerCase().includes(lowerQuery)
    );
  }
  
  // ============================================================================
  // AI CONTEXT GENERATION
  // ============================================================================
  
  /**
   * Get context optimized for AI assistant
   */
  public getContextForAI(options: TerminalContextOptions = {}): TerminalContext {
    const {
      maxEntries = 20,
      errorPriority = true,
    } = options;
    
    const recentErrors = this.getRecentErrors(10);
    const recentWarnings = this.getRecentWarnings(5);
    const unresolvedErrors = this.getUnresolvedErrors();
    const recentCommands = this.logs
      .filter(log => log.type === 'command')
      .slice(-5)
      .map(log => log.content);
    
    // Build output - prioritize errors if enabled
    let recentOutput: TerminalLogEntry[];
    if (errorPriority && unresolvedErrors.length > 0) {
      recentOutput = unresolvedErrors.slice(-maxEntries);
    } else {
      recentOutput = this.getRecentLogs(maxEntries);
    }
    
    const lastCommand = recentCommands[recentCommands.length - 1];
    const lastError = recentErrors[recentErrors.length - 1];
    
    return {
      recentCommands,
      recentErrors,
      recentWarnings,
      recentOutput,
      lastCommand,
      lastError,
      hasUnresolvedErrors: unresolvedErrors.length > 0,
      summary: this.generateSummary(),
    };
  }
  
  /**
   * Format context as a string for AI message injection
   */
  public formatContextForMessage(options: TerminalContextOptions = {}): string {
    const context = this.getContextForAI(options);
    const {
      includeTimestamps = false,
      maxContextLength = 2000,
    } = options;
    
    const lines: string[] = [];
    
    // Header
    lines.push('📺 **Terminal Context**');
    lines.push('');
    
    // Summary
    if (context.summary) {
      lines.push(context.summary);
      lines.push('');
    }
    
    // Last command
    if (context.lastCommand) {
      lines.push(`**Last Command:** \`${context.lastCommand}\``);
      lines.push('');
    }
    
    // Errors (priority)
    if (context.recentErrors.length > 0) {
      lines.push('**Recent Errors:**');
      lines.push('```');
      context.recentErrors.slice(-5).forEach(error => {
        const timestamp = includeTimestamps 
          ? `[${new Date(error.timestamp).toLocaleTimeString()}] ` 
          : '';
        lines.push(`${timestamp}${error.content}`);
      });
      lines.push('```');
      lines.push('');
    }
    
    // Warnings
    if (context.recentWarnings.length > 0) {
      lines.push('**Warnings:**');
      lines.push('```');
      context.recentWarnings.slice(-3).forEach(warning => {
        lines.push(warning.content);
      });
      lines.push('```');
      lines.push('');
    }
    
    // Recent output
    if (context.recentOutput.length > 0 && context.recentErrors.length === 0) {
      lines.push('**Recent Output:**');
      lines.push('```');
      context.recentOutput.slice(-10).forEach(log => {
        if (log.type !== 'command') {
          lines.push(log.content);
        }
      });
      lines.push('```');
    }
    
    let result = lines.join('\n');
    
    // Truncate if too long
    if (result.length > maxContextLength) {
      result = result.substring(0, maxContextLength - 50) + '\n...(truncated)';
    }
    
    return result;
  }
  
  /**
   * Check if terminal context might be helpful for a user message
   */
  public shouldIncludeContext(userMessage: string): boolean {
    const lowerMessage = userMessage.toLowerCase();
    
    // Keywords that suggest terminal context would help
    const contextKeywords = [
      'error', 'bug', 'fix', 'debug', 'issue', 'problem', 'fail',
      'not working', 'broken', 'crash', 'exception', 'warning',
      'why', 'what happened', 'terminal', 'console', 'output',
      'build', 'compile', 'run', 'execute', 'npm', 'yarn', 'cargo',
      'help me', 'stuck', 'wrong', 'unexpected'
    ];
    
    const hasKeyword = contextKeywords.some(kw => lowerMessage.includes(kw));
    const hasUnresolvedErrors = this.unresolvedErrorIds.size > 0;
    
    return hasKeyword || hasUnresolvedErrors;
  }
  
  /**
   * Auto-enhance a user message with terminal context if relevant
   */
  public enhanceMessageWithContext(
    message: string, 
    forceInclude: boolean = false
  ): string {
    if (!forceInclude && !this.shouldIncludeContext(message)) {
      return message;
    }
    
    const contextStr = this.formatContextForMessage({
      maxContextLength: 1500,
      errorPriority: true,
    });
    
    if (!contextStr || contextStr.length < 50) {
      return message;
    }
    
    return `${message}\n\n---\n${contextStr}`;
  }
  
  // ============================================================================
  // STATISTICS & SUMMARY
  // ============================================================================
  
  /**
   * Get statistics
   */
  public getStats(): {
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    unresolvedErrors: number;
    commandCount: number;
  } {
    return {
      totalLogs: this.logs.length,
      errorCount: this.errorCount,
      warningCount: this.warningCount,
      unresolvedErrors: this.unresolvedErrorIds.size,
      commandCount: this.logs.filter(l => l.type === 'command').length,
    };
  }
  
  /**
   * Generate a summary of terminal state
   */
  private generateSummary(): string {
    const stats = this.getStats();
    const parts: string[] = [];
    
    if (stats.unresolvedErrors > 0) {
      parts.push(`🔴 ${stats.unresolvedErrors} unresolved error(s)`);
    }
    
    if (stats.warningCount > 0) {
      parts.push(`⚠️ ${stats.warningCount} warning(s)`);
    }
    
    if (stats.commandCount > 0) {
      parts.push(`📝 ${stats.commandCount} command(s) executed`);
    }
    
    if (parts.length === 0) {
      return '✅ Terminal is clean - no errors or warnings';
    }
    
    return parts.join(' | ');
  }
  
  // ============================================================================
  // CLEAR & RESET
  // ============================================================================
  
  /**
   * Clear all logs
   */
  public clear(): void {
    this.logs = [];
    this.errorCount = 0;
    this.warningCount = 0;
    this.unresolvedErrorIds.clear();
    this.currentCommand = null;
    console.log('🧹 [TerminalContext] All logs cleared');
  }
  
  /**
   * Clear logs older than specified time
   */
  public clearOlderThan(minutes: number): void {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    this.logs = this.logs.filter(log => log.timestamp > cutoff);
    this.recalculateStats();
  }
  
  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================
  
  /**
   * Subscribe to new log entries
   */
  public subscribe(callback: (entry: TerminalLogEntry) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  /**
   * Notify listeners of new entry
   */
  private notifyListeners(entry: TerminalLogEntry): void {
    this.listeners.forEach(callback => {
      try {
        callback(entry);
      } catch (error) {
        console.error('[TerminalContext] Listener error:', error);
      }
    });
  }
  
  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================
  
  /**
   * Create a log entry
   */
  private createEntry(partial: Partial<TerminalLogEntry>): TerminalLogEntry {
    const content = partial.content || '';
    const type = partial.type || 'output';
    
    return {
      id: this.generateId(),
      timestamp: Date.now(),
      type,
      content,
      command: partial.command,
      projectPath: this.currentProjectPath || undefined,
      filePath: partial.filePath,
      lineNumber: partial.lineNumber,
      isError: type === 'error' || this.isErrorContent(content),
      isWarning: type === 'warning' || this.isWarningContent(content),
      metadata: partial.metadata,
    };
  }
  
  /**
   * Add entry to logs
   */
  private addEntry(entry: TerminalLogEntry): void {
    this.logs.push(entry);
    this.trimLogs();
    this.notifyListeners(entry);
    
    // Dispatch custom event for UI components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('terminal-log-added', {
        detail: entry
      }));
    }
  }
  
  /**
   * Trim logs to max entries
   */
  private trimLogs(): void {
    if (this.logs.length > this.maxEntries) {
      const removed = this.logs.splice(0, this.logs.length - this.maxEntries);
      // Clean up unresolved error references
      removed.forEach(log => this.unresolvedErrorIds.delete(log.id));
    }
  }
  
  /**
   * Detect output type from content
   */
  private detectOutputType(content: string): TerminalOutputType {
    if (this.isErrorContent(content)) return 'error';
    if (this.isWarningContent(content)) return 'warning';
    if (this.isSuccessContent(content)) return 'success';
    return 'output';
  }
  
  /**
   * Check if content is an error
   */
  private isErrorContent(content: string): boolean {
    return ERROR_PATTERNS.some(pattern => pattern.test(content));
  }
  
  /**
   * Check if content is a warning
   */
  private isWarningContent(content: string): boolean {
    return WARNING_PATTERNS.some(pattern => pattern.test(content));
  }
  
  /**
   * Check if content indicates success
   */
  private isSuccessContent(content: string): boolean {
    return SUCCESS_PATTERNS.some(pattern => pattern.test(content));
  }
  
  /**
   * Extract file path and line number from error message
   */
  private extractFileInfo(content: string): { filePath: string; lineNumber: number } | null {
    for (const pattern of FILE_PATH_PATTERNS) {
      const match = pattern.exec(content);
      if (match) {
        // Reset regex lastIndex for global patterns
        pattern.lastIndex = 0;
        
        // Different patterns have different capture groups
        const filePath = match[1] || match[2];
        const lineNumber = parseInt(match[3] || match[2], 10);
        
        if (filePath && !isNaN(lineNumber)) {
          return { filePath, lineNumber };
        }
      }
    }
    return null;
  }
  
  /**
   * Recalculate statistics
   */
  private recalculateStats(): void {
    this.errorCount = this.logs.filter(l => l.isError).length;
    this.warningCount = this.logs.filter(l => l.isWarning).length;
  }
  
  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `tlog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Setup global event listeners
   */
  private setupGlobalListeners(): void {
    if (typeof window === 'undefined') return;
    
    // Listen for build system events
    window.addEventListener('build-output', ((event: CustomEvent) => {
      if (event.detail?.output) {
        this.recordOutput(event.detail.output, {
          buildSystem: event.detail.buildSystem,
          exitCode: event.detail.exitCode,
          duration: event.detail.duration,
        });
      }
    }) as EventListener);
    
    // Listen for process events
    window.addEventListener('process-started', ((event: CustomEvent) => {
      if (event.detail?.command) {
        this.recordCommand(event.detail.command);
      }
    }) as EventListener);
    
    window.addEventListener('process-ended', () => {
      this.currentCommand = null;
    });
    
    window.addEventListener('process-stopped', () => {
      this.currentCommand = null;
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE & EXPORTS
// ============================================================================

export const terminalContextProvider = TerminalContextProvider.getInstance();

// ============================================================================
// GLOBAL EXPOSURE
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).terminalContextProvider = terminalContextProvider;
  (window as any).TerminalContextProvider = TerminalContextProvider;
  
  // Convenience functions
  (window as any).getTerminalContext = () => terminalContextProvider.getContextForAI();
  (window as any).getTerminalErrors = () => terminalContextProvider.getRecentErrors();
  (window as any).getTerminalStats = () => terminalContextProvider.getStats();
  (window as any).clearTerminalContext = () => terminalContextProvider.clear();
  
  console.log('🧠 Terminal Context Provider loaded!');
  console.log('   📌 window.terminalContextProvider - Full API');
  console.log('   📌 window.getTerminalContext() - Get AI context');
  console.log('   📌 window.getTerminalErrors() - Get recent errors');
  console.log('   📌 window.getTerminalStats() - Get statistics');
}
