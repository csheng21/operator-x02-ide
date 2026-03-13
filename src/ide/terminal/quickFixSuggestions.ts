/**
 * ====================================================================================================
 * FILE: src/ide/terminal/quickFixSuggestions.ts - Quick Fix Suggestions System
 * ====================================================================================================
 * 
 * PURPOSE:
 * Provides intelligent quick fix suggestions for common terminal errors.
 * Detects error patterns and offers one-click solutions.
 * 
 * FEATURES:
 * - Multi-language error pattern detection
 * - Context-aware fix suggestions
 * - One-click command execution
 * - Learning from user actions
 * - Customizable fix rules
 * 
 * SUPPORTED:
 * - Node.js / npm / yarn errors
 * - Python / pip errors
 * - TypeScript / tsc errors
 * - Rust / cargo errors
 * - Git errors
 * - Permission errors
 * - Network errors
 * - General system errors
 * 
 * ====================================================================================================
 */

export interface QuickFix {
  id: string;
  pattern: RegExp;
  title: string;
  description: string;
  command?: string | ((match: RegExpMatchArray, context: FixContext) => string);
  action?: (match: RegExpMatchArray, context: FixContext) => void;
  category: FixCategory;
  priority: number; // Higher = shown first
  requiresConfirmation?: boolean;
  dangerous?: boolean;
}

export interface FixContext {
  fullOutput: string;
  workingDirectory?: string;
  currentFile?: string;
  projectType?: 'node' | 'python' | 'rust' | 'java' | 'unknown';
  executeCommand: (cmd: string) => Promise<void>;
  openFile: (path: string, line?: number) => void;
  showNotification: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

export interface FixSuggestion {
  fix: QuickFix;
  match: RegExpMatchArray;
  command?: string;
  confidence: 'high' | 'medium' | 'low';
}

export type FixCategory = 
  | 'npm'
  | 'yarn'
  | 'python'
  | 'typescript'
  | 'rust'
  | 'git'
  | 'permission'
  | 'network'
  | 'syntax'
  | 'dependency'
  | 'system';

/**
 * Quick Fix Registry - All available fix patterns
 */
const QUICK_FIX_REGISTRY: QuickFix[] = [
  // ============================================================================
  // NPM / NODE.JS FIXES
  // ============================================================================
  {
    id: 'npm-module-not-found',
    pattern: /Cannot find module ['"]([^'"]+)['"]/i,
    title: 'Install Missing Module',
    description: 'The module "$1" is not installed',
    command: (match) => `npm install ${extractPackageName(match[1])}`,
    category: 'npm',
    priority: 100,
  },
  {
    id: 'npm-module-not-found-dev',
    pattern: /Cannot find module ['"](@types\/[^'"]+)['"]/i,
    title: 'Install Type Definitions',
    description: 'TypeScript type definitions missing',
    command: (match) => `npm install -D ${match[1]}`,
    category: 'npm',
    priority: 99,
  },
  {
    id: 'npm-enoent-package',
    pattern: /ENOENT.*package\.json/i,
    title: 'Initialize Package',
    description: 'No package.json found in directory',
    command: 'npm init -y',
    category: 'npm',
    priority: 95,
  },
  {
    id: 'npm-peer-deps',
    pattern: /npm ERR!.*peer dep(?:endency)?.*requires.*['"]([^'"]+)['"]/i,
    title: 'Install Peer Dependency',
    description: 'Missing peer dependency',
    command: (match) => `npm install ${match[1]}`,
    category: 'npm',
    priority: 90,
  },
  {
    id: 'npm-legacy-peer-deps',
    pattern: /ERESOLVE.*Could not resolve dependency/i,
    title: 'Use Legacy Peer Deps',
    description: 'Dependency resolution conflict',
    command: 'npm install --legacy-peer-deps',
    category: 'npm',
    priority: 88,
  },
  {
    id: 'npm-cache-clean',
    pattern: /npm ERR!.*EINTEGRITY|npm ERR!.*cache/i,
    title: 'Clear NPM Cache',
    description: 'NPM cache may be corrupted',
    command: 'npm cache clean --force && npm install',
    category: 'npm',
    priority: 85,
    requiresConfirmation: true,
  },
  {
    id: 'npm-audit-fix',
    pattern: /(\d+)\s+vulnerabilities?\s+\(.*high.*\)/i,
    title: 'Fix Vulnerabilities',
    description: 'Security vulnerabilities detected',
    command: 'npm audit fix',
    category: 'npm',
    priority: 80,
  },
  {
    id: 'npm-audit-fix-force',
    pattern: /npm audit fix.*--force/i,
    title: 'Force Fix Vulnerabilities',
    description: 'Force fix (may have breaking changes)',
    command: 'npm audit fix --force',
    category: 'npm',
    priority: 75,
    requiresConfirmation: true,
    dangerous: true,
  },
  {
    id: 'npm-outdated',
    pattern: /npm WARN.*outdated/i,
    title: 'Update Packages',
    description: 'Some packages are outdated',
    command: 'npm update',
    category: 'npm',
    priority: 70,
  },
  {
    id: 'npm-rebuild',
    pattern: /Module.*was compiled against.*Node\.js/i,
    title: 'Rebuild Native Modules',
    description: 'Native modules need rebuilding',
    command: 'npm rebuild',
    category: 'npm',
    priority: 85,
  },
  {
    id: 'node-modules-missing',
    pattern: /node_modules.*ENOENT|Cannot find module.*node_modules/i,
    title: 'Install Dependencies',
    description: 'node_modules folder missing or incomplete',
    command: 'npm install',
    category: 'npm',
    priority: 98,
  },

  // ============================================================================
  // YARN FIXES
  // ============================================================================
  {
    id: 'yarn-module-not-found',
    pattern: /error.*Cannot find module ['"]([^'"]+)['"]/i,
    title: 'Install with Yarn',
    description: 'Module not found, install with yarn',
    command: (match) => `yarn add ${extractPackageName(match[1])}`,
    category: 'yarn',
    priority: 99,
  },
  {
    id: 'yarn-lock-conflict',
    pattern: /yarn\.lock.*conflict|error.*integrity check failed/i,
    title: 'Regenerate Yarn Lock',
    description: 'yarn.lock may be corrupted',
    command: 'rm yarn.lock && yarn install',
    category: 'yarn',
    priority: 85,
    requiresConfirmation: true,
  },

  // ============================================================================
  // PYTHON / PIP FIXES
  // ============================================================================
  {
    id: 'python-module-not-found',
    pattern: /ModuleNotFoundError: No module named ['"]([^'"]+)['"]/i,
    title: 'Install Python Package',
    description: 'Python module "$1" not installed',
    command: (match) => `pip install ${match[1]}`,
    category: 'python',
    priority: 100,
  },
  {
    id: 'python-import-error',
    pattern: /ImportError: cannot import name ['"]([^'"]+)['"] from ['"]([^'"]+)['"]/i,
    title: 'Reinstall Package',
    description: 'Import error - try reinstalling',
    command: (match) => `pip install --upgrade ${match[2]}`,
    category: 'python',
    priority: 95,
  },
  {
    id: 'pip-upgrade',
    pattern: /pip.*new version available.*pip install --upgrade pip/i,
    title: 'Upgrade Pip',
    description: 'Newer version of pip available',
    command: 'python -m pip install --upgrade pip',
    category: 'python',
    priority: 60,
  },
  {
    id: 'python-venv-missing',
    pattern: /No module named ['"]venv['"]/i,
    title: 'Install Python venv',
    description: 'Python venv module not available',
    command: 'sudo apt-get install python3-venv',
    category: 'python',
    priority: 85,
  },
  {
    id: 'pip-requirements',
    pattern: /Could not find a version that satisfies|No matching distribution/i,
    title: 'Check Requirements',
    description: 'Package version conflict',
    command: 'pip install -r requirements.txt --upgrade',
    category: 'python',
    priority: 80,
  },

  // ============================================================================
  // TYPESCRIPT FIXES
  // ============================================================================
  {
    id: 'ts-cannot-find-module',
    pattern: /error TS2307: Cannot find module ['"]([^'"]+)['"]/i,
    title: 'Install Types/Module',
    description: 'TypeScript cannot find module',
    command: (match) => {
      const mod = match[1];
      if (mod.startsWith('@types/')) {
        return `npm install -D ${mod}`;
      }
      return `npm install ${mod} && npm install -D @types/${mod}`;
    },
    category: 'typescript',
    priority: 95,
  },
  {
    id: 'ts-implicit-any',
    pattern: /error TS7006: Parameter ['"]([^'"]+)['"] implicitly has an ['"]any['"] type/i,
    title: 'Add Type Annotation',
    description: 'Parameter needs type annotation',
    action: (match, ctx) => {
      ctx.showNotification(`Add type to parameter "${match[1]}"`, 'info');
    },
    category: 'typescript',
    priority: 70,
  },
  {
    id: 'ts-config-missing',
    pattern: /error TS5058: The specified path does not exist: ['"]tsconfig\.json['"]/i,
    title: 'Create tsconfig.json',
    description: 'TypeScript config file missing',
    command: 'npx tsc --init',
    category: 'typescript',
    priority: 90,
  },
  {
    id: 'ts-strict-null',
    pattern: /error TS2531: Object is possibly ['"]null['"]/i,
    title: 'Add Null Check',
    description: 'Object might be null - add check',
    action: (match, ctx) => {
      ctx.showNotification('Add null check: if (obj) { ... } or obj?.property', 'info');
    },
    category: 'typescript',
    priority: 65,
  },

  // ============================================================================
  // RUST / CARGO FIXES
  // ============================================================================
  {
    id: 'rust-unresolved-import',
    pattern: /error\[E0432\]: unresolved import `([^`]+)`/i,
    title: 'Add Cargo Dependency',
    description: 'Missing crate dependency',
    command: (match) => {
      const crate = match[1].split('::')[0];
      return `cargo add ${crate}`;
    },
    category: 'rust',
    priority: 95,
  },
  {
    id: 'rust-cargo-update',
    pattern: /error\[E0463\]: can't find crate for `([^`]+)`/i,
    title: 'Update Cargo Dependencies',
    description: 'Crate not found - update dependencies',
    command: 'cargo update',
    category: 'rust',
    priority: 90,
  },
  {
    id: 'rust-cargo-build',
    pattern: /error: could not compile/i,
    title: 'Clean and Rebuild',
    description: 'Compilation failed - try clean build',
    command: 'cargo clean && cargo build',
    category: 'rust',
    priority: 80,
    requiresConfirmation: true,
  },
  {
    id: 'rust-unused-variable',
    pattern: /warning: unused variable: `([^`]+)`/i,
    title: 'Prefix with Underscore',
    description: 'Prefix unused variable with _',
    action: (match, ctx) => {
      ctx.showNotification(`Rename "${match[1]}" to "_${match[1]}"`, 'info');
    },
    category: 'rust',
    priority: 50,
  },

  // ============================================================================
  // GIT FIXES
  // ============================================================================
  {
    id: 'git-not-repository',
    pattern: /fatal: not a git repository/i,
    title: 'Initialize Git Repo',
    description: 'Not in a git repository',
    command: 'git init',
    category: 'git',
    priority: 95,
  },
  {
    id: 'git-untracked-files',
    pattern: /error: The following untracked working tree files would be overwritten/i,
    title: 'Stash Untracked Files',
    description: 'Untracked files blocking operation',
    command: 'git stash --include-untracked',
    category: 'git',
    priority: 85,
  },
  {
    id: 'git-diverged',
    pattern: /Your branch and .* have diverged/i,
    title: 'Pull with Rebase',
    description: 'Branch has diverged from remote',
    command: 'git pull --rebase',
    category: 'git',
    priority: 80,
  },
  {
    id: 'git-uncommitted-changes',
    pattern: /error: Your local changes.*would be overwritten/i,
    title: 'Stash Changes',
    description: 'Uncommitted changes blocking operation',
    command: 'git stash',
    category: 'git',
    priority: 85,
  },
  {
    id: 'git-merge-conflict',
    pattern: /CONFLICT.*Merge conflict in (.+)/i,
    title: 'Open Conflict File',
    description: 'Merge conflict needs resolution',
    action: (match, ctx) => {
      ctx.openFile(match[1].trim());
      ctx.showNotification('Resolve conflicts, then: git add . && git commit', 'info');
    },
    category: 'git',
    priority: 90,
  },
  {
    id: 'git-push-rejected',
    pattern: /error: failed to push.*rejected.*non-fast-forward/i,
    title: 'Pull Before Push',
    description: 'Remote has new commits',
    command: 'git pull --rebase && git push',
    category: 'git',
    priority: 85,
  },
  {
    id: 'git-upstream-not-set',
    pattern: /fatal: The current branch .* has no upstream branch/i,
    title: 'Set Upstream Branch',
    description: 'No upstream branch configured',
    command: (match, ctx) => {
      return 'git push --set-upstream origin $(git branch --show-current)';
    },
    category: 'git',
    priority: 88,
  },

  // ============================================================================
  // PERMISSION FIXES
  // ============================================================================
  {
    id: 'permission-eacces',
    pattern: /EACCES.*permission denied/i,
    title: 'Run with Elevated Permissions',
    description: 'Permission denied - may need sudo',
    action: (match, ctx) => {
      ctx.showNotification('Try running with sudo or check file permissions', 'warning');
    },
    category: 'permission',
    priority: 85,
  },
  {
    id: 'permission-npm-global',
    pattern: /EACCES.*npm.*global/i,
    title: 'Fix NPM Permissions',
    description: 'NPM global permissions issue',
    command: 'npm config set prefix ~/.npm-global',
    category: 'permission',
    priority: 80,
  },
  {
    id: 'permission-chmod',
    pattern: /Permission denied.*['"\/]([^'"]+)['"\/]/i,
    title: 'Fix File Permissions',
    description: 'File permission issue',
    command: (match) => `chmod +x "${match[1]}"`,
    category: 'permission',
    priority: 75,
    requiresConfirmation: true,
  },

  // ============================================================================
  // NETWORK FIXES
  // ============================================================================
  {
    id: 'network-enotfound',
    pattern: /ENOTFOUND|getaddrinfo.*failed|EAI_AGAIN/i,
    title: 'Check Network Connection',
    description: 'DNS resolution failed',
    action: (match, ctx) => {
      ctx.showNotification('Check your internet connection and DNS settings', 'warning');
    },
    category: 'network',
    priority: 70,
  },
  {
    id: 'network-timeout',
    pattern: /ETIMEDOUT|ESOCKETTIMEDOUT|network timeout/i,
    title: 'Retry with Longer Timeout',
    description: 'Network request timed out',
    command: 'npm install --fetch-timeout=60000',
    category: 'network',
    priority: 70,
  },
  {
    id: 'network-ssl',
    pattern: /SSL.*certificate|CERT_.*INVALID|unable to verify.*certificate/i,
    title: 'Check SSL Settings',
    description: 'SSL certificate issue',
    action: (match, ctx) => {
      ctx.showNotification('SSL certificate error. Check date/time or CA certificates.', 'warning');
    },
    category: 'network',
    priority: 75,
  },
  {
    id: 'npm-registry-error',
    pattern: /npm ERR!.*registry.*returned/i,
    title: 'Try Different Registry',
    description: 'NPM registry issue',
    command: 'npm config set registry https://registry.npmmirror.com',
    category: 'network',
    priority: 70,
    requiresConfirmation: true,
  },

  // ============================================================================
  // SYSTEM FIXES
  // ============================================================================
  {
    id: 'system-port-in-use',
    pattern: /EADDRINUSE.*port\s*(\d+)|address already in use.*:(\d+)/i,
    title: 'Kill Process on Port',
    description: 'Port is already in use',
    command: (match) => {
      const port = match[1] || match[2];
      return `npx kill-port ${port}`;
    },
    category: 'system',
    priority: 90,
  },
  {
    id: 'system-out-of-memory',
    pattern: /FATAL ERROR.*heap|JavaScript heap out of memory/i,
    title: 'Increase Memory Limit',
    description: 'Node.js ran out of memory',
    command: 'export NODE_OPTIONS="--max-old-space-size=4096"',
    category: 'system',
    priority: 85,
  },
  {
    id: 'system-enospc',
    pattern: /ENOSPC.*no space left|ENFILE|too many open files/i,
    title: 'Check Disk Space',
    description: 'Disk space or file limit issue',
    action: (match, ctx) => {
      ctx.showNotification('Check disk space: df -h, or increase file limits', 'warning');
    },
    category: 'system',
    priority: 80,
  },
  {
    id: 'system-file-not-found',
    pattern: /ENOENT.*no such file.*['"]([^'"]+)['"]/i,
    title: 'Create Missing File',
    description: 'File does not exist',
    action: (match, ctx) => {
      ctx.showNotification(`File not found: ${match[1]}`, 'warning');
    },
    category: 'system',
    priority: 75,
  },

  // ============================================================================
  // VITE / BUILD TOOL FIXES
  // ============================================================================
  {
    id: 'vite-dep-not-found',
    pattern: /\[vite\].*Failed to resolve import "([^"]+)"/i,
    title: 'Install Vite Dependency',
    description: 'Vite cannot resolve import',
    command: (match) => `npm install ${match[1]}`,
    category: 'dependency',
    priority: 90,
  },
  {
    id: 'vite-optimize-deps',
    pattern: /\[vite\].*Dep optimization failed/i,
    title: 'Clear Vite Cache',
    description: 'Vite dependency optimization issue',
    command: 'rm -rf node_modules/.vite && npm run dev',
    category: 'dependency',
    priority: 85,
  },
  {
    id: 'webpack-module-not-found',
    pattern: /Module not found: Error: Can't resolve '([^']+)'/i,
    title: 'Install Webpack Dependency',
    description: 'Webpack cannot resolve module',
    command: (match) => `npm install ${extractPackageName(match[1])}`,
    category: 'dependency',
    priority: 90,
  },

  // ============================================================================
  // JAVA FIXES
  // ============================================================================
  {
    id: 'java-class-not-found',
    pattern: /java\.lang\.ClassNotFoundException: ([^\s]+)/i,
    title: 'Check Classpath',
    description: 'Java class not found',
    action: (match, ctx) => {
      ctx.showNotification(`Class not found: ${match[1]}. Check classpath.`, 'warning');
    },
    category: 'dependency',
    priority: 80,
  },
  {
    id: 'java-main-not-found',
    pattern: /Error: Main method not found/i,
    title: 'Add Main Method',
    description: 'Main method missing in class',
    action: (match, ctx) => {
      ctx.showNotification('Add: public static void main(String[] args) {}', 'info');
    },
    category: 'syntax',
    priority: 85,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract package name from import path
 */
function extractPackageName(importPath: string): string {
  // Handle scoped packages (@org/package)
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : importPath;
  }
  
  // Handle regular packages (package/subpath)
  const firstPart = importPath.split('/')[0];
  return firstPart;
}

// ============================================================================
// QUICK FIX ENGINE CLASS
// ============================================================================

export class QuickFixEngine {
  private fixes: QuickFix[] = [...QUICK_FIX_REGISTRY];
  private customFixes: QuickFix[] = [];
  private executionHistory: Array<{fixId: string, timestamp: number, success: boolean}> = [];
  private context: FixContext | null = null;

  constructor() {
    this.loadCustomFixes();
    this.loadExecutionHistory();
  }

  /**
   * Set the execution context
   */
  setContext(context: FixContext) {
    this.context = context;
  }

  /**
   * Analyze output and find applicable fixes
   */
  findFixes(output: string): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];
    const allFixes = [...this.fixes, ...this.customFixes];

    for (const fix of allFixes) {
      const match = output.match(fix.pattern);
      if (match) {
        const command = typeof fix.command === 'function' 
          ? fix.command(match, this.context!)
          : fix.command;

        suggestions.push({
          fix,
          match,
          command,
          confidence: this.calculateConfidence(fix, match, output),
        });
      }
    }

    // Sort by priority and confidence
    return suggestions.sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return a.confidence === 'high' ? -1 : b.confidence === 'high' ? 1 : 0;
      }
      return b.fix.priority - a.fix.priority;
    });
  }

  /**
   * Calculate confidence level for a fix
   */
  private calculateConfidence(fix: QuickFix, match: RegExpMatchArray, output: string): 'high' | 'medium' | 'low' {
    // Check execution history - previously successful fixes get higher confidence
    const history = this.executionHistory.filter(h => h.fixId === fix.id);
    const successRate = history.length > 0 
      ? history.filter(h => h.success).length / history.length 
      : 0.5;

    if (successRate > 0.8 && history.length >= 3) {
      return 'high';
    }
    
    // High priority fixes with full matches
    if (fix.priority >= 90 && match[0].length > 20) {
      return 'high';
    }
    
    // Medium confidence for standard fixes
    if (fix.priority >= 70) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Execute a fix suggestion
   */
  async executeFix(suggestion: FixSuggestion): Promise<boolean> {
    if (!this.context) {
      console.error('QuickFixEngine: No context set');
      return false;
    }

    const { fix, match, command } = suggestion;

    try {
      // Show confirmation for dangerous operations
      if (fix.requiresConfirmation || fix.dangerous) {
        const confirmed = await this.showConfirmation(fix, command);
        if (!confirmed) {
          return false;
        }
      }

      // Execute command or action
      if (command) {
        await this.context.executeCommand(command);
        this.context.showNotification(`Executed: ${command}`, 'success');
      } else if (fix.action) {
        fix.action(match, this.context);
      }

      // Record success
      this.recordExecution(fix.id, true);
      return true;

    } catch (error) {
      console.error('QuickFix execution failed:', error);
      this.context.showNotification(`Fix failed: ${error}`, 'error');
      this.recordExecution(fix.id, false);
      return false;
    }
  }

  /**
   * Show confirmation dialog for dangerous operations
   */
  private async showConfirmation(fix: QuickFix, command?: string): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'quickfix-confirmation-modal';
      modal.innerHTML = `
        <div class="quickfix-confirmation-content">
          <div class="quickfix-confirmation-header">
            <span class="quickfix-confirmation-icon">${fix.dangerous ? '⚠️' : '❓'}</span>
            <span class="quickfix-confirmation-title">Confirm Action</span>
          </div>
          <div class="quickfix-confirmation-body">
            <p><strong>${fix.title}</strong></p>
            <p>${fix.description}</p>
            ${command ? `<code class="quickfix-command-preview">${command}</code>` : ''}
            ${fix.dangerous ? '<p class="quickfix-warning">⚠️ This action may have side effects!</p>' : ''}
          </div>
          <div class="quickfix-confirmation-actions">
            <button class="quickfix-btn quickfix-btn-cancel">Cancel</button>
            <button class="quickfix-btn quickfix-btn-confirm ${fix.dangerous ? 'dangerous' : ''}">
              ${fix.dangerous ? 'Execute Anyway' : 'Execute'}
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const cancelBtn = modal.querySelector('.quickfix-btn-cancel');
      const confirmBtn = modal.querySelector('.quickfix-btn-confirm');

      cancelBtn?.addEventListener('click', () => {
        modal.remove();
        resolve(false);
      });

      confirmBtn?.addEventListener('click', () => {
        modal.remove();
        resolve(true);
      });

      // Close on background click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
          resolve(false);
        }
      });
    });
  }

  /**
   * Record execution for learning
   */
  private recordExecution(fixId: string, success: boolean) {
    this.executionHistory.push({
      fixId,
      timestamp: Date.now(),
      success,
    });

    // Keep only last 100 entries
    if (this.executionHistory.length > 100) {
      this.executionHistory = this.executionHistory.slice(-100);
    }

    this.saveExecutionHistory();
  }

  /**
   * Add a custom fix pattern
   */
  addCustomFix(fix: QuickFix) {
    this.customFixes.push(fix);
    this.saveCustomFixes();
  }

  /**
   * Remove a custom fix
   */
  removeCustomFix(fixId: string) {
    this.customFixes = this.customFixes.filter(f => f.id !== fixId);
    this.saveCustomFixes();
  }

  /**
   * Get all available fixes
   */
  getAllFixes(): QuickFix[] {
    return [...this.fixes, ...this.customFixes];
  }

  /**
   * Get fixes by category
   */
  getFixesByCategory(category: FixCategory): QuickFix[] {
    return this.getAllFixes().filter(f => f.category === category);
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private saveCustomFixes() {
    try {
      const serializable = this.customFixes.map(f => ({
        ...f,
        pattern: f.pattern.source,
        command: typeof f.command === 'string' ? f.command : undefined,
      }));
      localStorage.setItem('quickfix-custom', JSON.stringify(serializable));
    } catch (e) {
      console.warn('Failed to save custom fixes:', e);
    }
  }

  private loadCustomFixes() {
    try {
      const stored = localStorage.getItem('quickfix-custom');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.customFixes = parsed.map((f: any) => ({
          ...f,
          pattern: new RegExp(f.pattern, 'i'),
        }));
      }
    } catch (e) {
      console.warn('Failed to load custom fixes:', e);
    }
  }

  private saveExecutionHistory() {
    try {
      localStorage.setItem('quickfix-history', JSON.stringify(this.executionHistory));
    } catch (e) {
      console.warn('Failed to save execution history:', e);
    }
  }

  private loadExecutionHistory() {
    try {
      const stored = localStorage.getItem('quickfix-history');
      if (stored) {
        this.executionHistory = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load execution history:', e);
    }
  }
}

// ============================================================================
// QUICK FIX UI COMPONENT
// ============================================================================

export class QuickFixUI {
  private engine: QuickFixEngine;
  private container: HTMLElement | null = null;

  constructor(engine: QuickFixEngine) {
    this.engine = engine;
    this.injectStyles();
  }

  /**
   * Create quick fix suggestion panel for an error
   */
  createFixPanel(output: string, parentElement: HTMLElement): HTMLElement | null {
    const suggestions = this.engine.findFixes(output);
    
    if (suggestions.length === 0) {
      return null;
    }

    const panel = document.createElement('div');
    panel.className = 'quickfix-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'quickfix-header';
    header.innerHTML = `
      <span class="quickfix-icon">💡</span>
      <span class="quickfix-title">Quick Fix${suggestions.length > 1 ? 'es' : ''} Available</span>
      <span class="quickfix-count">${suggestions.length}</span>
    `;
    panel.appendChild(header);

    // Suggestions list
    const list = document.createElement('div');
    list.className = 'quickfix-list';

    suggestions.slice(0, 5).forEach((suggestion, index) => {
      const item = this.createFixItem(suggestion, index);
      list.appendChild(item);
    });

    panel.appendChild(list);

    // Show more if needed
    if (suggestions.length > 5) {
      const more = document.createElement('div');
      more.className = 'quickfix-more';
      more.textContent = `+${suggestions.length - 5} more fixes available`;
      more.addEventListener('click', () => {
        this.showAllFixes(suggestions, parentElement);
      });
      panel.appendChild(more);
    }

    return panel;
  }

  /**
   * Create a single fix item
   */
  private createFixItem(suggestion: FixSuggestion, index: number): HTMLElement {
    const item = document.createElement('div');
    item.className = `quickfix-item confidence-${suggestion.confidence}`;
    
    // Category icon
    const categoryIcon = this.getCategoryIcon(suggestion.fix.category);
    
    item.innerHTML = `
      <div class="quickfix-item-header">
        <span class="quickfix-category-icon">${categoryIcon}</span>
        <span class="quickfix-item-title">${suggestion.fix.title}</span>
        ${suggestion.fix.dangerous ? '<span class="quickfix-danger-badge">⚠️</span>' : ''}
        <span class="quickfix-confidence-badge ${suggestion.confidence}">${suggestion.confidence}</span>
      </div>
      <div class="quickfix-item-description">${suggestion.fix.description}</div>
      ${suggestion.command ? `
        <div class="quickfix-item-command">
          <code>${suggestion.command}</code>
          <button class="quickfix-copy-btn" title="Copy command">📋</button>
        </div>
      ` : ''}
      <div class="quickfix-item-actions">
        <button class="quickfix-apply-btn">
          ${suggestion.command ? '▶ Run Fix' : '💡 Show Help'}
        </button>
      </div>
    `;

    // Copy button handler
    const copyBtn = item.querySelector('.quickfix-copy-btn');
    copyBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (suggestion.command) {
        navigator.clipboard.writeText(suggestion.command);
        copyBtn.textContent = '✓';
        setTimeout(() => copyBtn.textContent = '📋', 1500);
      }
    });

    // Apply button handler
    const applyBtn = item.querySelector('.quickfix-apply-btn');
    applyBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      applyBtn.textContent = '⏳ Running...';
      (applyBtn as HTMLButtonElement).disabled = true;
      
      const success = await this.engine.executeFix(suggestion);
      
      if (success) {
        applyBtn.textContent = '✓ Applied';
        item.classList.add('applied');
      } else {
        applyBtn.textContent = '✗ Failed';
        setTimeout(() => {
          applyBtn.textContent = suggestion.command ? '▶ Run Fix' : '💡 Show Help';
          (applyBtn as HTMLButtonElement).disabled = false;
        }, 2000);
      }
    });

    return item;
  }

  /**
   * Get icon for fix category
   */
  private getCategoryIcon(category: FixCategory): string {
    const icons: Record<FixCategory, string> = {
      npm: '📦',
      yarn: '🧶',
      python: '🐍',
      typescript: '🔷',
      rust: '🦀',
      git: '📚',
      permission: '🔒',
      network: '🌐',
      syntax: '📝',
      dependency: '🔗',
      system: '💻',
    };
    return icons[category] || '🔧';
  }

  /**
   * Show all fixes in a modal
   */
  private showAllFixes(suggestions: FixSuggestion[], parentElement: HTMLElement) {
    // Implementation for full modal view
    console.log('Show all fixes modal:', suggestions.length);
  }

  /**
   * Inject CSS styles for quick fix UI
   */
  private injectStyles() {
    const styleId = 'quickfix-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Quick Fix Panel */
      .quickfix-panel {
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-left: 3px solid #ffd700;
        border-radius: 4px;
        margin: 8px 0;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .quickfix-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #252526;
        border-bottom: 1px solid #3c3c3c;
        font-size: 13px;
        font-weight: 600;
        color: #ffd700;
      }

      .quickfix-icon {
        font-size: 16px;
      }

      .quickfix-title {
        flex: 1;
      }

      .quickfix-count {
        background: #ffd700;
        color: #1e1e1e;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: bold;
      }

      /* Quick Fix List */
      .quickfix-list {
        padding: 4px 0;
      }

      .quickfix-item {
        padding: 10px 12px;
        border-bottom: 1px solid #2d2d2d;
        transition: background 0.2s ease;
      }

      .quickfix-item:last-child {
        border-bottom: none;
      }

      .quickfix-item:hover {
        background: #2a2a2a;
      }

      .quickfix-item.applied {
        background: rgba(76, 175, 80, 0.1);
        border-left: 3px solid #4caf50;
      }

      .quickfix-item-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }

      .quickfix-category-icon {
        font-size: 14px;
      }

      .quickfix-item-title {
        font-weight: 600;
        color: #e0e0e0;
        font-size: 13px;
        flex: 1;
      }

      .quickfix-danger-badge {
        font-size: 12px;
      }

      .quickfix-confidence-badge {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 3px;
        text-transform: uppercase;
        font-weight: 600;
      }

      .quickfix-confidence-badge.high {
        background: #4caf50;
        color: white;
      }

      .quickfix-confidence-badge.medium {
        background: #ff9800;
        color: white;
      }

      .quickfix-confidence-badge.low {
        background: #607d8b;
        color: white;
      }

      .quickfix-item-description {
        color: #9e9e9e;
        font-size: 12px;
        margin-bottom: 8px;
        padding-left: 22px;
      }

      .quickfix-item-command {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #0d0d0d;
        padding: 6px 10px;
        border-radius: 4px;
        margin-bottom: 8px;
        margin-left: 22px;
      }

      .quickfix-item-command code {
        flex: 1;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 12px;
        color: #4fc3f7;
        word-break: break-all;
      }

      .quickfix-copy-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px;
        font-size: 12px;
        opacity: 0.7;
        transition: opacity 0.2s;
      }

      .quickfix-copy-btn:hover {
        opacity: 1;
      }

      .quickfix-item-actions {
        display: flex;
        gap: 8px;
        padding-left: 22px;
      }

      .quickfix-apply-btn {
        background: #0e639c;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
      }

      .quickfix-apply-btn:hover {
        background: #1177bb;
      }

      .quickfix-apply-btn:disabled {
        background: #3c3c3c;
        cursor: not-allowed;
      }

      .quickfix-more {
        padding: 8px 12px;
        text-align: center;
        color: #4fc3f7;
        font-size: 12px;
        cursor: pointer;
        background: #252526;
      }

      .quickfix-more:hover {
        background: #2a2a2a;
        text-decoration: underline;
      }

      /* Confirmation Modal */
      .quickfix-confirmation-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease;
      }

      .quickfix-confirmation-content {
        background: #252526;
        border: 1px solid #3c3c3c;
        border-radius: 8px;
        width: 400px;
        max-width: 90%;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      }

      .quickfix-confirmation-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 16px;
        border-bottom: 1px solid #3c3c3c;
        font-size: 16px;
        font-weight: 600;
        color: #e0e0e0;
      }

      .quickfix-confirmation-icon {
        font-size: 20px;
      }

      .quickfix-confirmation-body {
        padding: 16px;
        color: #cccccc;
        font-size: 14px;
      }

      .quickfix-confirmation-body p {
        margin: 0 0 12px 0;
      }

      .quickfix-command-preview {
        display: block;
        background: #0d0d0d;
        padding: 10px;
        border-radius: 4px;
        font-family: 'Consolas', monospace;
        font-size: 13px;
        color: #4fc3f7;
        word-break: break-all;
      }

      .quickfix-warning {
        color: #ff9800 !important;
        font-weight: 500;
      }

      .quickfix-confirmation-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 12px 16px;
        border-top: 1px solid #3c3c3c;
        background: #1e1e1e;
      }

      .quickfix-btn {
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: background 0.2s;
      }

      .quickfix-btn-cancel {
        background: #3c3c3c;
        color: #e0e0e0;
      }

      .quickfix-btn-cancel:hover {
        background: #4a4a4a;
      }

      .quickfix-btn-confirm {
        background: #0e639c;
        color: white;
      }

      .quickfix-btn-confirm:hover {
        background: #1177bb;
      }

      .quickfix-btn-confirm.dangerous {
        background: #d32f2f;
      }

      .quickfix-btn-confirm.dangerous:hover {
        background: #f44336;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;

    document.head.appendChild(style);
  }
}

// ============================================================================
// SINGLETON INSTANCE & INITIALIZATION
// ============================================================================

let quickFixEngineInstance: QuickFixEngine | null = null;
let quickFixUIInstance: QuickFixUI | null = null;

/**
 * Get or create the QuickFixEngine singleton
 */
export function getQuickFixEngine(): QuickFixEngine {
  if (!quickFixEngineInstance) {
    quickFixEngineInstance = new QuickFixEngine();
  }
  return quickFixEngineInstance;
}

/**
 * Get or create the QuickFixUI singleton
 */
export function getQuickFixUI(): QuickFixUI {
  if (!quickFixUIInstance) {
    quickFixUIInstance = new QuickFixUI(getQuickFixEngine());
  }
  return quickFixUIInstance;
}

/**
 * Initialize Quick Fix system
 */
export function initializeQuickFix(context: FixContext): void {
  const engine = getQuickFixEngine();
  engine.setContext(context);
  
  console.log('💡 Quick Fix System initialized');
  console.log(`📋 ${engine.getAllFixes().length} fix patterns loaded`);
}

// Export for window access
if (typeof window !== 'undefined') {
  (window as any).QuickFixEngine = QuickFixEngine;
  (window as any).getQuickFixEngine = getQuickFixEngine;
  (window as any).getQuickFixUI = getQuickFixUI;
  (window as any).initializeQuickFix = initializeQuickFix;
}
