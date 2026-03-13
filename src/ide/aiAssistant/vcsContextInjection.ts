// vcsContextInjection.ts - VCS Context Injection for AI Assistant
// ============================================================================
// Allows AI to answer questions about SVN/Git changes, status, history
// Version: 1.0
// ============================================================================

console.log('🔄 [VCS Context] Loading VCS Context Injection module...');

// ============================================================================
// CONFIGURATION
// ============================================================================

const VCS_CONFIG = {
  enabled: true,
  debug: true,
  maxDiffLines: 100,        // Max diff lines to include
  maxStatusFiles: 50,       // Max files to list in status
  maxLogEntries: 10,        // Max commit log entries
  maxContextChars: 4000,    // Max chars for VCS context
  cacheTimeMs: 5000,        // Cache VCS data for 5 seconds
};

// ============================================================================
// TYPES
// ============================================================================

interface VCSStatus {
  type: 'svn' | 'git' | 'none';
  isWorkingCopy: boolean;
  projectPath: string;
  branch?: string;
  
  // File status
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
  conflicted: string[];
  
  // Statistics
  totalChanges: number;
  linesAdded?: number;
  linesRemoved?: number;
  
  // Recent commits
  recentCommits?: {
    revision: string;
    author: string;
    date: string;
    message: string;
  }[];
  
  // Current diff summary
  diffSummary?: string;
}

interface VCSContextResult {
  hasVCS: boolean;
  contextString: string;
  status: VCSStatus | null;
}

// ============================================================================
// TRIGGER DETECTION
// ============================================================================

const VCS_TRIGGER_PATTERNS = [
  // SVN specific
  /\b(svn|subversion)\b/i,
  
  // Git specific
  /\bgit\b/i,
  
  // General VCS questions
  /\bwhat\s*(files?)?\s*(changed|modified|added|removed|deleted)\b/i,
  /\bwhat\s*(did)?\s*(I|we)\s*(change|modify|add|remove|edit)\b/i,
  /\b(show|list|display)\s*(me)?\s*(the)?\s*(changes|modifications|status|diff)\b/i,
  /\b(pending|uncommitted|unstaged|staged)\s*(changes|files)\b/i,
  /\b(my|the|current)\s*(changes|modifications|edits)\b/i,
  /\bwhat('s|s| is| are)\s*(the)?\s*(change|changes|status|diff)\b/i,
  
  // Diff questions
  /\b(diff|difference|compare)\b/i,
  /\blines?\s*(added|removed|changed)\b/i,
  
  // Commit/history questions
  /\b(commit|revision|check\s*in)\b/i,
  /\b(history|log)\s*(of)?\s*(changes|commits|file)?\b/i,
  
  // Branch questions
  /\b(branch|branches)\b/i,
  
  // Revert questions
  /\b(revert|undo|rollback|discard)\s*(changes)?\b/i,
  
  // Update questions
  /\b(update|sync|pull|fetch)\b/i,
  
  // Conflict questions
  /\b(conflict|conflicts|merge)\b/i,
  
  // File-specific VCS
  /\bwho\s*(edited|changed|modified|wrote)\b/i,
  /\bblame\b/i,
];

/**
 * Check if message is asking about VCS (SVN/Git)
 */
function isVCSQuestion(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  for (const pattern of VCS_TRIGGER_PATTERNS) {
    if (pattern.test(lowerMessage)) {
      if (VCS_CONFIG.debug) {
        console.log(`[VCS Context] ✅ Matched pattern: ${pattern}`);
      }
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// VCS STATUS FETCHING
// ============================================================================

let cachedStatus: VCSStatus | null = null;
let cacheTimestamp = 0;

/**
 * Get current project path
 */
function getProjectPath(): string | null {
  // Try multiple ways to get project path
  const sources = [
    () => (window as any).currentProjectPath,
    () => (window as any).projectPath,
    () => document.querySelector('.breadcrumb-path')?.textContent,
    () => localStorage.getItem('lastProjectPath'),
  ];
  
  for (const source of sources) {
    try {
      const path = source();
      if (path && typeof path === 'string' && path.length > 3) {
        return path;
      }
    } catch (e) {
      // Continue to next source
    }
  }
  
  return null;
}

/**
 * Check if path is SVN working copy
 */
async function isSVNWorkingCopy(path: string): Promise<boolean> {
  try {
    // Try Tauri invoke
    if ((window as any).__TAURI__?.invoke) {
      return await (window as any).__TAURI__.invoke('svn_is_working_copy', { path });
    }
    
    // Try svnManager
    if ((window as any).svnManager?.isWorkingCopy) {
      return await (window as any).svnManager.isWorkingCopy(path);
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Check if path is Git repository
 */
async function isGitRepository(path: string): Promise<boolean> {
  try {
    // Try Tauri invoke
    if ((window as any).__TAURI__?.invoke) {
      return await (window as any).__TAURI__.invoke('git_is_repository', { path });
    }
    
    // Try gitManager
    if ((window as any).gitManager?.isRepository) {
      return await (window as any).gitManager.isRepository(path);
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Get SVN status
 */
async function getSVNStatus(path: string): Promise<Partial<VCSStatus>> {
  const result: Partial<VCSStatus> = {
    type: 'svn',
    isWorkingCopy: true,
    projectPath: path,
    modified: [],
    added: [],
    deleted: [],
    untracked: [],
    conflicted: [],
    totalChanges: 0,
  };
  
  try {
    // Get status via Tauri
    if ((window as any).__TAURI__?.invoke) {
      const statusEntries = await (window as any).__TAURI__.invoke('svn_status', { path });
      
      if (Array.isArray(statusEntries)) {
        for (const entry of statusEntries) {
          const filePath = entry.path || entry.file || entry.name;
          const status = (entry.status || entry.state || '').toUpperCase();
          
          switch (status) {
            case 'M':
            case 'MODIFIED':
              result.modified!.push(filePath);
              break;
            case 'A':
            case 'ADDED':
              result.added!.push(filePath);
              break;
            case 'D':
            case 'DELETED':
              result.deleted!.push(filePath);
              break;
            case '?':
            case 'UNVERSIONED':
            case 'UNTRACKED':
              result.untracked!.push(filePath);
              break;
            case 'C':
            case 'CONFLICTED':
              result.conflicted!.push(filePath);
              break;
          }
        }
      }
    }
    
    // Try svnManager as fallback
    if ((window as any).svnManager?.getStatus) {
      const status = await (window as any).svnManager.getStatus(path);
      if (status) {
        result.modified = status.modified || result.modified;
        result.added = status.added || result.added;
        result.deleted = status.deleted || result.deleted;
      }
    }
    
    result.totalChanges = (result.modified?.length || 0) + 
                          (result.added?.length || 0) + 
                          (result.deleted?.length || 0);
    
  } catch (e) {
    console.warn('[VCS Context] Error getting SVN status:', e);
  }
  
  return result;
}

/**
 * Get Git status
 */
async function getGitStatus(path: string): Promise<Partial<VCSStatus>> {
  const result: Partial<VCSStatus> = {
    type: 'git',
    isWorkingCopy: true,
    projectPath: path,
    modified: [],
    added: [],
    deleted: [],
    untracked: [],
    conflicted: [],
    totalChanges: 0,
  };
  
  try {
    // Get status via Tauri
    if ((window as any).__TAURI__?.invoke) {
      const statusEntries = await (window as any).__TAURI__.invoke('git_status', { path });
      
      if (Array.isArray(statusEntries)) {
        for (const entry of statusEntries) {
          const filePath = entry.path || entry.file || entry.name;
          const status = (entry.status || entry.state || '').toUpperCase();
          
          if (status.includes('M') || status === 'MODIFIED') {
            result.modified!.push(filePath);
          } else if (status.includes('A') || status === 'ADDED' || status === 'NEW') {
            result.added!.push(filePath);
          } else if (status.includes('D') || status === 'DELETED') {
            result.deleted!.push(filePath);
          } else if (status === '??' || status === 'UNTRACKED') {
            result.untracked!.push(filePath);
          } else if (status.includes('U') || status === 'CONFLICTED') {
            result.conflicted!.push(filePath);
          }
        }
      }
      
      // Try to get branch
      try {
        result.branch = await (window as any).__TAURI__.invoke('git_current_branch', { path });
      } catch (e) {
        // Branch info not available
      }
    }
    
    // Try gitManager as fallback
    if ((window as any).gitManager?.getStatus) {
      const status = await (window as any).gitManager.getStatus(path);
      if (status) {
        result.modified = status.modified || result.modified;
        result.added = status.added || result.added;
        result.deleted = status.deleted || result.deleted;
        result.branch = status.branch || result.branch;
      }
    }
    
    result.totalChanges = (result.modified?.length || 0) + 
                          (result.added?.length || 0) + 
                          (result.deleted?.length || 0);
    
  } catch (e) {
    console.warn('[VCS Context] Error getting Git status:', e);
  }
  
  return result;
}

/**
 * Get recent commits/log
 */
async function getRecentCommits(path: string, type: 'svn' | 'git', limit: number = 5): Promise<any[]> {
  try {
    if ((window as any).__TAURI__?.invoke) {
      const command = type === 'svn' ? 'svn_log' : 'git_log';
      const log = await (window as any).__TAURI__.invoke(command, { path, limit });
      return Array.isArray(log) ? log.slice(0, limit) : [];
    }
  } catch (e) {
    console.warn('[VCS Context] Error getting log:', e);
  }
  return [];
}

/**
 * Get diff summary
 */
async function getDiffSummary(path: string, type: 'svn' | 'git'): Promise<string> {
  try {
    if ((window as any).__TAURI__?.invoke) {
      const command = type === 'svn' ? 'svn_diff' : 'git_diff';
      const diff = await (window as any).__TAURI__.invoke(command, { path });
      
      if (typeof diff === 'string' && diff.length > 0) {
        // Truncate if too long
        const lines = diff.split('\n');
        if (lines.length > VCS_CONFIG.maxDiffLines) {
          return lines.slice(0, VCS_CONFIG.maxDiffLines).join('\n') + 
                 `\n... (${lines.length - VCS_CONFIG.maxDiffLines} more lines)`;
        }
        return diff;
      }
    }
  } catch (e) {
    console.warn('[VCS Context] Error getting diff:', e);
  }
  return '';
}

/**
 * Get full VCS status for current project
 */
async function getVCSStatus(): Promise<VCSStatus | null> {
  // Check cache
  if (cachedStatus && (Date.now() - cacheTimestamp) < VCS_CONFIG.cacheTimeMs) {
    if (VCS_CONFIG.debug) {
      console.log('[VCS Context] Using cached status');
    }
    return cachedStatus;
  }
  
  const projectPath = getProjectPath();
  if (!projectPath) {
    if (VCS_CONFIG.debug) {
      console.log('[VCS Context] No project path found');
    }
    return null;
  }
  
  if (VCS_CONFIG.debug) {
    console.log(`[VCS Context] Checking VCS for: ${projectPath}`);
  }
  
  // Check SVN first (since your IDE focuses on SVN)
  if (await isSVNWorkingCopy(projectPath)) {
    if (VCS_CONFIG.debug) {
      console.log('[VCS Context] SVN working copy detected');
    }
    
    const status = await getSVNStatus(projectPath) as VCSStatus;
    status.recentCommits = await getRecentCommits(projectPath, 'svn', VCS_CONFIG.maxLogEntries);
    
    // Only get diff if there are changes
    if (status.totalChanges > 0) {
      status.diffSummary = await getDiffSummary(projectPath, 'svn');
    }
    
    cachedStatus = status;
    cacheTimestamp = Date.now();
    return status;
  }
  
  // Check Git
  if (await isGitRepository(projectPath)) {
    if (VCS_CONFIG.debug) {
      console.log('[VCS Context] Git repository detected');
    }
    
    const status = await getGitStatus(projectPath) as VCSStatus;
    status.recentCommits = await getRecentCommits(projectPath, 'git', VCS_CONFIG.maxLogEntries);
    
    // Only get diff if there are changes
    if (status.totalChanges > 0) {
      status.diffSummary = await getDiffSummary(projectPath, 'git');
    }
    
    cachedStatus = status;
    cacheTimestamp = Date.now();
    return status;
  }
  
  if (VCS_CONFIG.debug) {
    console.log('[VCS Context] No VCS detected');
  }
  
  return {
    type: 'none',
    isWorkingCopy: false,
    projectPath,
    modified: [],
    added: [],
    deleted: [],
    untracked: [],
    conflicted: [],
    totalChanges: 0,
  };
}

// ============================================================================
// CONTEXT STRING GENERATION
// ============================================================================

/**
 * Build context string for AI
 */
function buildVCSContextString(status: VCSStatus): string {
  if (!status.isWorkingCopy || status.type === 'none') {
    return '';
  }
  
  const vcsName = status.type.toUpperCase();
  const lines: string[] = [];
  
  lines.push(`=== ${vcsName} VERSION CONTROL STATUS ===`);
  lines.push(`Project: ${status.projectPath}`);
  
  if (status.branch) {
    lines.push(`Branch: ${status.branch}`);
  }
  
  lines.push('');
  
  // File status summary
  if (status.totalChanges === 0 && status.untracked!.length === 0) {
    lines.push('📋 Status: Working copy is CLEAN (no changes)');
  } else {
    lines.push(`📋 Total Changes: ${status.totalChanges} file(s)`);
    
    if (status.modified!.length > 0) {
      lines.push('');
      lines.push(`📝 MODIFIED (${status.modified!.length}):`);
      status.modified!.slice(0, VCS_CONFIG.maxStatusFiles).forEach(f => {
        lines.push(`  M  ${f}`);
      });
    }
    
    if (status.added!.length > 0) {
      lines.push('');
      lines.push(`➕ ADDED (${status.added!.length}):`);
      status.added!.slice(0, VCS_CONFIG.maxStatusFiles).forEach(f => {
        lines.push(`  A  ${f}`);
      });
    }
    
    if (status.deleted!.length > 0) {
      lines.push('');
      lines.push(`➖ DELETED (${status.deleted!.length}):`);
      status.deleted!.slice(0, VCS_CONFIG.maxStatusFiles).forEach(f => {
        lines.push(`  D  ${f}`);
      });
    }
    
    if (status.conflicted!.length > 0) {
      lines.push('');
      lines.push(`⚠️ CONFLICTED (${status.conflicted!.length}):`);
      status.conflicted!.slice(0, VCS_CONFIG.maxStatusFiles).forEach(f => {
        lines.push(`  C  ${f}`);
      });
    }
    
    if (status.untracked!.length > 0) {
      lines.push('');
      lines.push(`❓ UNTRACKED (${status.untracked!.length}):`);
      status.untracked!.slice(0, 10).forEach(f => {
        lines.push(`  ?  ${f}`);
      });
      if (status.untracked!.length > 10) {
        lines.push(`  ... and ${status.untracked!.length - 10} more`);
      }
    }
  }
  
  // Recent commits
  if (status.recentCommits && status.recentCommits.length > 0) {
    lines.push('');
    lines.push(`📜 RECENT COMMITS (last ${status.recentCommits.length}):`);
    status.recentCommits.forEach((commit, i) => {
      const rev = commit.revision || commit.hash || commit.id;
      const msg = (commit.message || '').split('\n')[0].substring(0, 60);
      lines.push(`  ${i + 1}. [${rev}] ${msg}`);
    });
  }
  
  // Diff summary (truncated)
  if (status.diffSummary) {
    lines.push('');
    lines.push('📄 DIFF PREVIEW:');
    lines.push('```diff');
    lines.push(status.diffSummary.substring(0, 1500));
    if (status.diffSummary.length > 1500) {
      lines.push('... (diff truncated)');
    }
    lines.push('```');
  }
  
  lines.push(`=== END ${vcsName} STATUS ===`);
  lines.push('');
  
  // Truncate if too long
  let result = lines.join('\n');
  if (result.length > VCS_CONFIG.maxContextChars) {
    result = result.substring(0, VCS_CONFIG.maxContextChars) + '\n... (context truncated)\n';
  }
  
  return result;
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Get VCS context for AI if the message is asking about version control
 */
async function getVCSContextForAI(message: string): Promise<VCSContextResult> {
  if (!VCS_CONFIG.enabled) {
    return { hasVCS: false, contextString: '', status: null };
  }
  
  // Check if this is a VCS-related question
  if (!isVCSQuestion(message)) {
    if (VCS_CONFIG.debug) {
      console.log('[VCS Context] Not a VCS question, skipping');
    }
    return { hasVCS: false, contextString: '', status: null };
  }
  
  console.log('[VCS Context] 🔍 Fetching VCS status for AI context...');
  
  try {
    const status = await getVCSStatus();
    
    if (!status || status.type === 'none') {
      return { 
        hasVCS: false, 
        contextString: '(Note: This project is not under version control - no SVN or Git detected)\n\n',
        status: null 
      };
    }
    
    const contextString = buildVCSContextString(status);
    
    console.log(`[VCS Context] ✅ Built context: ${contextString.length} chars, ${status.totalChanges} changes`);
    
    return {
      hasVCS: true,
      contextString,
      status
    };
    
  } catch (e) {
    console.error('[VCS Context] Error:', e);
    return { hasVCS: false, contextString: '', status: null };
  }
}

// ============================================================================
// WINDOW EXPORTS
// ============================================================================

(window as any).vcsContext = {
  getVCSContextForAI,
  getVCSStatus,
  isVCSQuestion,
  CONFIG: VCS_CONFIG,
  
  // Debug helpers
  testVCSQuestion: (msg: string) => {
    console.log(`Testing: "${msg}"`);
    const result = isVCSQuestion(msg);
    console.log(`Result: ${result ? '✅ IS VCS question' : '❌ NOT VCS question'}`);
    return result;
  },
  
  testGetStatus: async () => {
    console.log('Fetching VCS status...');
    const status = await getVCSStatus();
    console.log('Status:', status);
    return status;
  },
  
  testBuildContext: async () => {
    const status = await getVCSStatus();
    if (status) {
      const context = buildVCSContextString(status);
      console.log('Context string:');
      console.log(context);
      return context;
    }
    return 'No VCS status available';
  }
};

console.log('✅ [VCS Context] Module loaded!');
console.log('   📋 Commands: window.vcsContext.testVCSQuestion("what files changed?")');
console.log('   📋 Commands: window.vcsContext.testGetStatus()');
console.log('   📋 Commands: window.vcsContext.testBuildContext()');

// ============================================================================
// EXPORT
// ============================================================================

export {
  getVCSContextForAI,
  getVCSStatus,
  isVCSQuestion,
  VCS_CONFIG,
  VCSStatus,
  VCSContextResult,
};
