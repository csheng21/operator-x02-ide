// ide/vsc/gitFeaturesIntegration.ts
// ============================================================================
// GIT ADVANCED FEATURES INTEGRATION
// Connects: Diff Viewer, Branch Manager, History, Merge Conflicts, Blame, Stash
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

// Import all Git feature modules
import { gitDiffViewer } from './gitDiffViewer';
import { gitBranchManager } from './gitBranchManager';
import { gitHistoryViewer } from './gitHistoryViewer';
import { gitMergeConflictManager } from './gitMergeConflict';
import { gitBlameManager } from './gitBlame';
import { gitStashManager } from './gitStashManager';

// ============================================================================
// TYPES
// ============================================================================

export interface GitFeaturesConfig {
  repoPath: string;
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
  onRefresh?: () => void;
}

// ============================================================================
// GIT FEATURES MANAGER CLASS
// ============================================================================

export class GitFeaturesManager {
  private config: GitFeaturesConfig | null = null;
  private initialized: boolean = false;
  
  constructor() {
    this.setupEventListeners();
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  /**
   * Initialize Git features for a repository
   */
  public initialize(config: GitFeaturesConfig): void {
    this.config = config;
    this.initialized = true;
    console.log('✅ Git Advanced Features initialized for:', config.repoPath);
  }
  
  /**
   * Update repository path
   */
  public setRepoPath(repoPath: string): void {
    if (this.config) {
      this.config.repoPath = repoPath;
    }
  }
  
  // ============================================================================
  // DIFF VIEWER
  // ============================================================================
  
  /**
   * Show diff for a specific file
   */
  public async showFileDiff(filePath: string, staged: boolean = false): Promise<void> {
    if (!this.config) {
      console.warn('Git features not initialized');
      return;
    }
    
    await gitDiffViewer.showFileDiff(this.config.repoPath, filePath, staged);
  }
  
  /**
   * Show diff from raw diff text
   */
  public showDiff(diffText: string, filePath?: string): void {
    gitDiffViewer.showDiff(diffText, filePath);
  }
  
  /**
   * Close diff viewer
   */
  public closeDiffViewer(): void {
    gitDiffViewer.close();
  }
  
  // ============================================================================
  // BRANCH MANAGER
  // ============================================================================
  
  /**
   * Open branch manager dialog
   */
  public async showBranchManager(): Promise<void> {
    if (!this.config) {
      console.warn('Git features not initialized');
      return;
    }
    
    await gitBranchManager.show({
      repoPath: this.config.repoPath,
      onBranchSwitch: (branch) => {
        this.notify(`Switched to branch '${branch}'`, 'success');
        this.config?.onRefresh?.();
      },
      onBranchCreate: (branch) => {
        this.notify(`Created branch '${branch}'`, 'success');
        this.config?.onRefresh?.();
      },
      onBranchDelete: (branch) => {
        this.notify(`Deleted branch '${branch}'`, 'success');
        this.config?.onRefresh?.();
      }
    });
  }
  
  /**
   * Close branch manager
   */
  public closeBranchManager(): void {
    gitBranchManager.close();
  }
  
  // ============================================================================
  // HISTORY VIEWER
  // ============================================================================
  
  /**
   * Show commit history
   */
  public async showHistory(filePath?: string): Promise<void> {
    if (!this.config) {
      console.warn('Git features not initialized');
      return;
    }
    
    await gitHistoryViewer.show({
      repoPath: this.config.repoPath,
      filePath,
      onCommitSelect: (commit) => {
        console.log('Selected commit:', commit.short_hash);
      }
    });
  }
  
  /**
   * Show file history
   */
  public async showFileHistory(filePath: string): Promise<void> {
    await gitHistoryViewer.showFileHistory(this.config?.repoPath || '', filePath);
  }
  
  /**
   * Close history viewer
   */
  public closeHistoryViewer(): void {
    gitHistoryViewer.close();
  }
  
  // ============================================================================
  // MERGE CONFLICT RESOLUTION
  // ============================================================================
  
  /**
   * Show merge conflict resolution UI
   */
  public async showMergeConflicts(): Promise<void> {
    if (!this.config) {
      console.warn('Git features not initialized');
      return;
    }
    
    // Check if there are conflicts
    const hasConflicts = await gitMergeConflictManager.hasConflicts(this.config.repoPath);
    
    if (!hasConflicts) {
      this.notify('No merge conflicts found', 'info');
      return;
    }
    
    await gitMergeConflictManager.show({
      repoPath: this.config.repoPath,
      onResolve: (file) => {
        this.notify(`Resolved conflicts in '${file.path}'`, 'success');
      },
      onAbort: () => {
        this.notify('Merge aborted', 'info');
        this.config?.onRefresh?.();
      }
    });
  }
  
  /**
   * Check if there are merge conflicts
   */
  public async hasConflicts(): Promise<boolean> {
    if (!this.config) return false;
    return gitMergeConflictManager.hasConflicts(this.config.repoPath);
  }
  
  /**
   * Close merge conflict UI
   */
  public closeMergeConflicts(): void {
    gitMergeConflictManager.close();
  }
  
  // ============================================================================
  // GIT BLAME
  // ============================================================================
  
  /**
   * Enable blame annotations for a file in the editor
   */
  public async enableBlame(filePath: string, editorContainer: HTMLElement): Promise<void> {
    if (!this.config) {
      console.warn('Git features not initialized');
      return;
    }
    
    await gitBlameManager.enable(this.config.repoPath, filePath, editorContainer);
  }
  
  /**
   * Disable blame annotations
   */
  public disableBlame(): void {
    gitBlameManager.disable();
  }
  
  /**
   * Toggle blame annotations
   */
  public async toggleBlame(filePath: string, editorContainer: HTMLElement): Promise<void> {
    if (!this.config) return;
    await gitBlameManager.toggle(this.config.repoPath, filePath, editorContainer);
  }
  
  /**
   * Show blame dialog for a file
   */
  public async showBlameDialog(filePath: string): Promise<void> {
    if (!this.config) return;
    await gitBlameManager.showBlameDialog(this.config.repoPath, filePath);
  }
  
  /**
   * Check if blame is enabled
   */
  public isBlameEnabled(): boolean {
    return gitBlameManager.isBlameEnabled();
  }
  
  // ============================================================================
  // STASH MANAGER
  // ============================================================================
  
  /**
   * Show stash manager dialog
   */
  public async showStashManager(): Promise<void> {
    if (!this.config) {
      console.warn('Git features not initialized');
      return;
    }
    
    await gitStashManager.show({
      repoPath: this.config.repoPath,
      onStashApply: (stash) => {
        this.notify(`Applied stash: ${stash.message}`, 'success');
        this.config?.onRefresh?.();
      },
      onStashDrop: (stash) => {
        this.notify(`Deleted stash: ${stash.ref}`, 'success');
      },
      onStashCreate: (message) => {
        this.notify('Changes stashed', 'success');
        this.config?.onRefresh?.();
      }
    });
  }
  
  /**
   * Quick stash (stash all changes)
   */
  public async quickStash(message?: string): Promise<void> {
    if (!this.config) return;
    
    try {
      await gitStashManager.quickStash(this.config.repoPath, message);
      this.notify('Changes stashed', 'success');
      this.config.onRefresh?.();
    } catch (error) {
      this.notify(`Failed to stash: ${error}`, 'error');
    }
  }
  
  /**
   * Quick pop (apply latest stash)
   */
  public async quickPop(): Promise<void> {
    if (!this.config) return;
    
    try {
      await gitStashManager.quickPop(this.config.repoPath);
      this.notify('Stash applied', 'success');
      this.config.onRefresh?.();
    } catch (error) {
      this.notify(`Failed to pop stash: ${error}`, 'error');
    }
  }
  
  /**
   * Close stash manager
   */
  public closeStashManager(): void {
    gitStashManager.close();
  }
  
  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================
  
  private setupEventListeners(): void {
    // Listen for git-show-diff events (from history viewer, etc.)
    document.addEventListener('git-show-diff', ((e: CustomEvent) => {
      const { diff, commitHash, filePath } = e.detail;
      if (diff) {
        this.showDiff(diff, filePath);
      }
    }) as EventListener);
    
    // Listen for git-show-commit events (from blame, etc.)
    document.addEventListener('git-show-commit', ((e: CustomEvent) => {
      const { commitHash } = e.detail;
      if (commitHash && this.config) {
        this.showCommitDetails(commitHash);
      }
    }) as EventListener);
    
    // Listen for git-notification events
    document.addEventListener('git-notification', ((e: CustomEvent) => {
      const { message, type } = e.detail;
      this.notify(message, type);
    }) as EventListener);
    
    // Listen for file actions from diff viewer
    document.addEventListener('git-file-staged', ((e: CustomEvent) => {
      this.config?.onRefresh?.();
    }) as EventListener);
    
    document.addEventListener('git-file-unstaged', ((e: CustomEvent) => {
      this.config?.onRefresh?.();
    }) as EventListener);
    
    document.addEventListener('git-file-discarded', ((e: CustomEvent) => {
      this.config?.onRefresh?.();
    }) as EventListener);
  }
  
  private async showCommitDetails(commitHash: string): Promise<void> {
    // Open history viewer focused on this commit
    await this.showHistory();
  }
  
  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================
  
  /**
   * Setup keyboard shortcuts for Git features
   */
  public setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // Only process if not in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Ctrl+Shift+G - Open Branch Manager
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        this.showBranchManager();
      }
      
      // Ctrl+Shift+H - Open History
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        this.showHistory();
      }
      
      // Ctrl+Shift+S - Quick Stash
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        this.quickStash();
      }
      
      // Ctrl+Shift+P - Quick Pop Stash
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        this.quickPop();
      }
    });
    
    console.log('✅ Git keyboard shortcuts registered:');
    console.log('   Ctrl+Shift+G - Branch Manager');
    console.log('   Ctrl+Shift+H - Commit History');
    console.log('   Ctrl+Shift+S - Quick Stash');
    console.log('   Ctrl+Shift+P - Pop Stash');
  }
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
  private notify(message: string, type: 'success' | 'error' | 'info'): void {
    console.log(`[Git ${type.toUpperCase()}] ${message}`);
    this.config?.onNotification?.(message, type);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const gitFeatures = new GitFeaturesManager();

// ============================================================================
// WINDOW EXPORTS FOR CONSOLE ACCESS
// ============================================================================

declare global {
  interface Window {
    gitFeatures: GitFeaturesManager;
    gitDiffViewer: typeof gitDiffViewer;
    gitBranchManager: typeof gitBranchManager;
    gitHistoryViewer: typeof gitHistoryViewer;
    gitMergeConflictManager: typeof gitMergeConflictManager;
    gitBlameManager: typeof gitBlameManager;
    gitStashManager: typeof gitStashManager;
  }
}

// Export to window for console access
if (typeof window !== 'undefined') {
  window.gitFeatures = gitFeatures;
  window.gitDiffViewer = gitDiffViewer;
  window.gitBranchManager = gitBranchManager;
  window.gitHistoryViewer = gitHistoryViewer;
  window.gitMergeConflictManager = gitMergeConflictManager;
  window.gitBlameManager = gitBlameManager;
  window.gitStashManager = gitStashManager;
}

// ============================================================================
// INITIALIZATION HELPER
// ============================================================================

/**
 * Initialize all Git advanced features
 * Call this from main.ts after project is loaded
 */
export function initializeGitFeatures(repoPath: string): void {
  gitFeatures.initialize({
    repoPath,
    onNotification: (message, type) => {
      // Integrate with your notification system
      console.log(`[Git] ${message}`);
    },
    onRefresh: () => {
      // Trigger refresh of Git status panel
      document.dispatchEvent(new CustomEvent('git-refresh-status'));
    }
  });
  
  gitFeatures.setupKeyboardShortcuts();
  
  console.log('🚀 Git Advanced Features ready!');
  console.log('   Available in console: gitFeatures, gitDiffViewer, gitBranchManager, etc.');
}

export default gitFeatures;
