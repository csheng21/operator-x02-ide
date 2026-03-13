// src/ide/vsc/gitManager.ts
// Git Manager - Handles all Git operations via Tauri backend
// FIXED: Import paths for flat folder structure

import { invoke } from '@tauri-apps/api/core';
import type { 
  GitStatusResult, 
  GitCommitResult, 
  GitBranchInfo, 
  GitCommitInfo,
  GitStashInfo,
  GitTagInfo,
  GitRemoteInfo,
  GitRepoInfo,
  MergeResultInfo,
  PushPullResult
} from './vcsTypes';

/**
 * Git Manager - Singleton class for Git operations
 */
class GitManager {
  private static instance: GitManager;
  private currentPath: string = '';
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): GitManager {
    if (!GitManager.instance) {
      GitManager.instance = new GitManager();
    }
    return GitManager.instance;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Check if Git is installed
   */
  async checkGitInstalled(): Promise<boolean> {
    try {
      return await invoke('git_check_installed');
    } catch (error) {
      console.error('❌ [Git] Failed to check Git installation:', error);
      return false;
    }
  }

  /**
   * Check if path is a Git repository
   */
  async isGitRepository(path: string): Promise<boolean> {
    try {
      return await invoke('git_is_repository', { path });
    } catch {
      return false;
    }
  }

  /**
   * Open a Git repository
   */
  async open(path: string): Promise<void> {
    console.log('🔷 [Git] Opening repository:', path);
    this.currentPath = path;
    this.isInitialized = true;
  }

  /**
   * Initialize a new Git repository
   */
  async init(path?: string): Promise<GitRepoInfo> {
    const targetPath = path || this.currentPath;
    console.log('🔷 [Git] Initializing repository:', targetPath);
    const result = await invoke<GitRepoInfo>('git_init', { path: targetPath });
    this.currentPath = targetPath;
    this.isInitialized = true;
    return result;
  }

  /**
   * Clone a repository
   */
  async clone(
    url: string, 
    path: string, 
    branch?: string, 
    depth?: number
  ): Promise<GitRepoInfo> {
    console.log('🔷 [Git] Cloning:', url, '->', path);
    return await invoke<GitRepoInfo>('git_clone', { url, path, branch, depth });
  }

  /**
   * Get repository info
   */
  async getInfo(): Promise<GitRepoInfo> {
    return await invoke<GitRepoInfo>('git_get_info', { path: this.currentPath });
  }

  /**
   * Find Git root directory
   */
  async findRoot(path?: string): Promise<string> {
    return await invoke<string>('git_find_root', { path: path || this.currentPath });
  }

  // ============================================
  // STATUS OPERATIONS
  // ============================================

  /**
   * Get repository status
   */
  async getStatus(): Promise<GitStatusResult> {
    if (!this.currentPath) {
      throw new Error('No repository opened');
    }
    return await invoke<GitStatusResult>('git_status', { path: this.currentPath });
  }

  // ============================================
  // STAGING OPERATIONS
  // ============================================

  /**
   * Stage files
   */
  async stage(files: string[]): Promise<void> {
    console.log('🔷 [Git] Staging files:', files.length);
    await invoke('git_add', { path: this.currentPath, files });
  }

  /**
   * Stage all files
   */
  async stageAll(): Promise<void> {
    console.log('🔷 [Git] Staging all files');
    await invoke('git_add_all', { path: this.currentPath });
  }

  /**
   * Unstage files
   */
  async unstage(files: string[]): Promise<void> {
    console.log('🔷 [Git] Unstaging files:', files.length);
    await invoke('git_unstage', { path: this.currentPath, files });
  }

  /**
   * Unstage all files
   */
  async unstageAll(): Promise<void> {
    console.log('🔷 [Git] Unstaging all files');
    await invoke('git_unstage_all', { path: this.currentPath });
  }

  // ============================================
  // COMMIT OPERATIONS
  // ============================================

  /**
   * Create a commit
   */
  async commit(message: string, amend: boolean = false, noVerify: boolean = false): Promise<GitCommitResult> {
    console.log('🔷 [Git] Creating commit:', message.substring(0, 50));
    return await invoke<GitCommitResult>('git_commit', {
      path: this.currentPath,
      message,
      amend,
      noVerify
    });
  }

  // ============================================
  // BRANCH OPERATIONS
  // ============================================

  /**
   * Get all branches
   */
  async getBranches(): Promise<GitBranchInfo[]> {
    return await invoke<GitBranchInfo[]>('git_branches', { path: this.currentPath });
  }

  /**
   * Create a new branch
   */
  async createBranch(name: string, startPoint?: string): Promise<GitBranchInfo> {
    console.log('🔷 [Git] Creating branch:', name);
    return await invoke<GitBranchInfo>('git_create_branch', {
      path: this.currentPath,
      name,
      startPoint
    });
  }

  /**
   * Switch to a branch
   */
  async switchBranch(branch: string): Promise<void> {
    console.log('🔷 [Git] Switching to branch:', branch);
    await invoke('git_switch_branch', { path: this.currentPath, branch });
  }

  /**
   * Delete a branch
   */
  async deleteBranch(branch: string, force: boolean = false): Promise<void> {
    console.log('🔷 [Git] Deleting branch:', branch);
    await invoke('git_delete_branch', { path: this.currentPath, branch, force });
  }

  /**
   * Rename a branch
   */
  async renameBranch(oldName: string, newName: string): Promise<void> {
    console.log('🔷 [Git] Renaming branch:', oldName, '->', newName);
    await invoke('git_rename_branch', { path: this.currentPath, oldName, newName });
  }

  // ============================================
  // REMOTE OPERATIONS
  // ============================================

  /**
   * Get all remotes
   */
  async getRemotes(): Promise<GitRemoteInfo[]> {
    return await invoke<GitRemoteInfo[]>('git_remotes', { path: this.currentPath });
  }

  /**
   * Add a remote
   */
  async addRemote(name: string, url: string): Promise<void> {
    console.log('🔷 [Git] Adding remote:', name, url);
    await invoke('git_add_remote', { path: this.currentPath, name, url });
  }

  /**
   * Remove a remote
   */
  async removeRemote(name: string): Promise<void> {
    console.log('🔷 [Git] Removing remote:', name);
    await invoke('git_remove_remote', { path: this.currentPath, name });
  }

  /**
   * Fetch from remote
   */
  async fetch(
    remote: string = 'origin',
    branch?: string,
    options?: { all?: boolean; prune?: boolean; tags?: boolean }
  ): Promise<void> {
    console.log('🔷 [Git] Fetching from:', remote);
    await invoke('git_fetch', {
      path: this.currentPath,
      remote,
      branch,
      all: options?.all || false,
      prune: options?.prune || false,
      tags: options?.tags || false
    });
  }

  /**
   * Pull from remote
   */
  async pull(remote: string = 'origin', branch?: string, rebase: boolean = false): Promise<PushPullResult> {
    console.log('🔷 [Git] Pulling from:', remote);
    return await invoke<PushPullResult>('git_pull', {
      path: this.currentPath,
      remote,
      branch,
      rebase
    });
  }

  /**
   * Push to remote
   */
  async push(
    remote: string = 'origin',
    branch?: string,
    options?: { force?: boolean; setUpstream?: boolean; tags?: boolean }
  ): Promise<PushPullResult> {
    console.log('🔷 [Git] Pushing to:', remote);
    return await invoke<PushPullResult>('git_push', {
      path: this.currentPath,
      remote,
      branch,
      force: options?.force || false,
      setUpstream: options?.setUpstream || false,
      tags: options?.tags || false
    });
  }

  // ============================================
  // HISTORY OPERATIONS
  // ============================================

  /**
   * Get commit log
   */
  async getLog(limit: number = 50, skip: number = 0, all: boolean = false): Promise<GitCommitInfo[]> {
    return await invoke<GitCommitInfo[]>('git_log', {
      path: this.currentPath,
      limit,
      skip,
      all
    });
  }

  /**
   * Get commit details
   */
  async showCommit(sha: string): Promise<GitCommitInfo> {
    return await invoke<GitCommitInfo>('git_show_commit', { path: this.currentPath, sha });
  }

  /**
   * Get file history
   */
  async getFileLog(file: string, limit: number = 50): Promise<GitCommitInfo[]> {
    return await invoke<GitCommitInfo[]>('git_file_log', {
      path: this.currentPath,
      file,
      limit
    });
  }

  // ============================================
  // DIFF OPERATIONS
  // ============================================

  /**
   * Get diff
   */
  async getDiff(file?: string, staged: boolean = false): Promise<string> {
    return await invoke<string>('git_diff', {
      path: this.currentPath,
      file,
      staged
    });
  }

  /**
   * Get commit diff
   */
  async showDiff(sha: string): Promise<string> {
    return await invoke<string>('git_show_diff', { path: this.currentPath, sha });
  }

  // ============================================
  // STASH OPERATIONS
  // ============================================

  /**
   * List stashes
   */
  async getStashes(): Promise<GitStashInfo[]> {
    return await invoke<GitStashInfo[]>('git_stash_list', { path: this.currentPath });
  }

  /**
   * Create stash
   */
  async stash(message?: string, includeUntracked: boolean = false, keepIndex: boolean = false): Promise<void> {
    console.log('🔷 [Git] Creating stash');
    await invoke('git_stash_push', {
      path: this.currentPath,
      message,
      includeUntracked,
      keepIndex
    });
  }

  /**
   * Apply stash
   */
  async stashApply(index: number = 0): Promise<void> {
    console.log('🔷 [Git] Applying stash:', index);
    await invoke('git_stash_apply', { path: this.currentPath, index });
  }

  /**
   * Pop stash
   */
  async stashPop(index: number = 0): Promise<void> {
    console.log('🔷 [Git] Popping stash:', index);
    await invoke('git_stash_pop', { path: this.currentPath, index });
  }

  /**
   * Drop stash
   */
  async stashDrop(index: number): Promise<void> {
    console.log('🔷 [Git] Dropping stash:', index);
    await invoke('git_stash_drop', { path: this.currentPath, index });
  }

  /**
   * Clear all stashes
   */
  async stashClear(): Promise<void> {
    console.log('🔷 [Git] Clearing all stashes');
    await invoke('git_stash_clear', { path: this.currentPath });
  }

  // ============================================
  // RESET/CHECKOUT OPERATIONS
  // ============================================

  /**
   * Reset to commit
   */
  async reset(sha: string, mode: 'soft' | 'mixed' | 'hard' | 'merge' | 'keep' = 'mixed'): Promise<void> {
    console.log('🔷 [Git] Resetting to:', sha, 'mode:', mode);
    await invoke('git_reset', { path: this.currentPath, sha, mode });
  }

  /**
   * Checkout file (discard changes)
   */
  async checkoutFile(file: string): Promise<void> {
    console.log('🔷 [Git] Discarding changes:', file);
    await invoke('git_checkout_file', { path: this.currentPath, file });
  }

  /**
   * Revert commit
   */
  async revert(sha: string): Promise<GitCommitResult> {
    console.log('🔷 [Git] Reverting commit:', sha);
    return await invoke<GitCommitResult>('git_revert', { path: this.currentPath, sha });
  }

  // ============================================
  // MERGE OPERATIONS
  // ============================================

  /**
   * Merge branch
   */
  async merge(
    branch: string,
    options?: { noCommit?: boolean; noFastForward?: boolean; squash?: boolean; message?: string }
  ): Promise<MergeResultInfo> {
    console.log('🔷 [Git] Merging branch:', branch);
    return await invoke<MergeResultInfo>('git_merge', {
      path: this.currentPath,
      branch,
      noCommit: options?.noCommit || false,
      noFastForward: options?.noFastForward || false,
      squash: options?.squash || false,
      message: options?.message
    });
  }

  /**
   * Abort merge
   */
  async mergeAbort(): Promise<void> {
    console.log('🔷 [Git] Aborting merge');
    await invoke('git_merge_abort', { path: this.currentPath });
  }

  /**
   * Get merge conflicts
   */
  async getConflicts(): Promise<string[]> {
    return await invoke<string[]>('git_conflicts', { path: this.currentPath });
  }

  /**
   * Resolve conflict
   */
  async resolveConflict(file: string, resolution: 'ours' | 'theirs' | 'merge', content?: string): Promise<void> {
    console.log('🔷 [Git] Resolving conflict:', file, resolution);
    await invoke('git_resolve_conflict', {
      path: this.currentPath,
      file,
      resolution,
      content
    });
  }

  // ============================================
  // TAG OPERATIONS
  // ============================================

  /**
   * Get all tags
   */
  async getTags(): Promise<GitTagInfo[]> {
    return await invoke<GitTagInfo[]>('git_tags', { path: this.currentPath });
  }

  /**
   * Create tag
   */
  async createTag(name: string, sha?: string, message?: string): Promise<void> {
    console.log('🔷 [Git] Creating tag:', name);
    await invoke('git_create_tag', { path: this.currentPath, name, sha, message });
  }

  /**
   * Delete tag
   */
  async deleteTag(name: string): Promise<void> {
    console.log('🔷 [Git] Deleting tag:', name);
    await invoke('git_delete_tag', { path: this.currentPath, name });
  }

  // ============================================
  // CONFIG OPERATIONS
  // ============================================

  /**
   * Get config value
   */
  async getConfig(key: string): Promise<string> {
    return await invoke<string>('git_config_get', { path: this.currentPath, key });
  }

  /**
   * Set config value
   */
  async setConfig(key: string, value: string): Promise<void> {
    await invoke('git_config_set', { path: this.currentPath, key, value });
  }

  // ============================================
  // BLAME OPERATIONS
  // ============================================

  /**
   * Get blame for file
   */
  async blame(file: string): Promise<string> {
    return await invoke<string>('git_blame', { path: this.currentPath, file });
  }

  // ============================================
  // UTILITY
  // ============================================

  /**
   * Get current repository path
   */
  getPath(): string {
    return this.currentPath;
  }

  /**
   * Check if manager is initialized
   */
  isReady(): boolean {
    return this.isInitialized && !!this.currentPath;
  }
}

// Export singleton instance
export const gitManager = GitManager.getInstance();
export { GitManager };
