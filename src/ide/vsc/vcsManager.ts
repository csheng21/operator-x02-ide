// src/ide/vsc/vcsManager.ts
// Unified VCS Manager - Supports Git and SVN
// FIXED: Import paths for flat folder structure

import { VCSType, VCSInfo, VCSFile, VCSCommit, VCSBranch } from './vcsTypes';

/**
 * Unified Version Control System Manager
 * Automatically detects and manages Git or SVN repositories
 */
class VCSManager {
  private static instance: VCSManager;
  private currentType: VCSType = 'none';
  private currentPath: string = '';
  private gitManager: any = null;
  private svnManager: any = null;

  private constructor() {}

  static getInstance(): VCSManager {
    if (!VCSManager.instance) {
      VCSManager.instance = new VCSManager();
    }
    return VCSManager.instance;
  }

  /**
   * Initialize VCS for a given path
   * Automatically detects Git or SVN
   */
  async initialize(path: string): Promise<VCSInfo> {
    console.log('🔷 [VCS] Initializing for path:', path);
    this.currentPath = path;

    // Check for Git first
    const isGit = await this.checkGit(path);
    if (isGit) {
      this.currentType = 'git';
      await this.initializeGit(path);
      return this.getInfo();
    }

    // Check for SVN
    const isSvn = await this.checkSvn(path);
    if (isSvn) {
      this.currentType = 'svn';
      await this.initializeSvn(path);
      return this.getInfo();
    }

    // No VCS detected
    this.currentType = 'none';
    console.log('⚠️ [VCS] No version control detected');
    return {
      type: 'none',
      path: path,
      isRepository: false
    };
  }

  /**
   * Check if path is a Git repository
   */
  private async checkGit(path: string): Promise<boolean> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke('git_is_repository', { path });
      console.log('🔷 [VCS] Git check result:', result);
      return result === true;
    } catch (error) {
      console.log('🔷 [VCS] Git check failed:', error);
      return false;
    }
  }

  /**
   * Check if path is an SVN repository
   */
  private async checkSvn(path: string): Promise<boolean> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke('svn_info', { path });
      return !!result;
    } catch {
      return false;
    }
  }

  /**
   * Initialize Git manager
   */
  private async initializeGit(path: string): Promise<void> {
    try {
      // FIXED: Import from same folder (flat structure)
      const { gitManager } = await import('./gitManager');
      this.gitManager = gitManager;
      await this.gitManager.open(path);
      console.log('✅ [VCS] Git initialized');
    } catch (error) {
      console.error('❌ [VCS] Failed to initialize Git:', error);
    }
  }

  /**
   * Initialize SVN manager
   */
  private async initializeSvn(path: string): Promise<void> {
    try {
      // Try to import SVN manager if it exists
      const { svnManager } = await import('../svn/svnManager');
      this.svnManager = svnManager;
      console.log('✅ [VCS] SVN initialized');
    } catch (error) {
      console.log('⚠️ [VCS] SVN manager not available');
    }
  }

  /**
   * Get current VCS info
   */
  getInfo(): VCSInfo {
    return {
      type: this.currentType,
      path: this.currentPath,
      isRepository: this.currentType !== 'none'
    };
  }

  /**
   * Get current VCS type
   */
  getType(): VCSType {
    return this.currentType;
  }

  /**
   * Check if currently in a repository
   */
  isRepository(): boolean {
    return this.currentType !== 'none';
  }

  /**
   * Get status of files
   */
  async getStatus(): Promise<VCSFile[]> {
    if (this.currentType === 'git' && this.gitManager) {
      const status = await this.gitManager.getStatus();
      return status.files.map((f: any) => ({
        path: f.path,
        status: f.status,
        staged: f.staged
      }));
    }
    
    if (this.currentType === 'svn' && this.svnManager) {
      const status = await this.svnManager.getStatus(this.currentPath);
      return status.map((f: any) => ({
        path: f.path,
        status: f.status,
        staged: false
      }));
    }
    
    return [];
  }

  /**
   * Stage files (Git only)
   */
  async stage(files: string[]): Promise<void> {
    if (this.currentType === 'git' && this.gitManager) {
      await this.gitManager.stage(files);
    }
  }

  /**
   * Unstage files (Git only)
   */
  async unstage(files: string[]): Promise<void> {
    if (this.currentType === 'git' && this.gitManager) {
      await this.gitManager.unstage(files);
    }
  }

  /**
   * Commit changes
   */
  async commit(message: string): Promise<VCSCommit | null> {
    if (this.currentType === 'git' && this.gitManager) {
      const result = await this.gitManager.commit(message);
      return {
        sha: result.sha,
        message: result.message,
        author: result.author,
        date: new Date(result.date * 1000)
      };
    }
    
    if (this.currentType === 'svn' && this.svnManager) {
      await this.svnManager.commit(this.currentPath, message);
      return {
        sha: 'svn-commit',
        message: message,
        author: 'user',
        date: new Date()
      };
    }
    
    return null;
  }

  /**
   * Get branches (Git only)
   */
  async getBranches(): Promise<VCSBranch[]> {
    if (this.currentType === 'git' && this.gitManager) {
      const branches = await this.gitManager.getBranches();
      return branches.map((b: any) => ({
        name: b.name,
        isCurrent: b.is_current,
        isRemote: b.is_remote
      }));
    }
    return [];
  }

  /**
   * Switch branch (Git only)
   */
  async switchBranch(branch: string): Promise<void> {
    if (this.currentType === 'git' && this.gitManager) {
      await this.gitManager.switchBranch(branch);
    }
  }

  /**
   * Pull changes
   */
  async pull(): Promise<void> {
    if (this.currentType === 'git' && this.gitManager) {
      await this.gitManager.pull();
    }
    
    if (this.currentType === 'svn' && this.svnManager) {
      await this.svnManager.update(this.currentPath);
    }
  }

  /**
   * Push changes (Git only)
   */
  async push(): Promise<void> {
    if (this.currentType === 'git' && this.gitManager) {
      await this.gitManager.push();
    }
  }

  /**
   * Get commit history
   */
  async getHistory(limit: number = 50): Promise<VCSCommit[]> {
    if (this.currentType === 'git' && this.gitManager) {
      const commits = await this.gitManager.getLog(limit);
      return commits.map((c: any) => ({
        sha: c.sha,
        message: c.message,
        author: c.author,
        date: new Date(c.date * 1000)
      }));
    }
    
    if (this.currentType === 'svn' && this.svnManager) {
      const logs = await this.svnManager.getLog(this.currentPath, limit);
      return logs.map((l: any) => ({
        sha: l.revision,
        message: l.message,
        author: l.author,
        date: new Date(l.date)
      }));
    }
    
    return [];
  }

  /**
   * Discard changes to a file
   */
  async discardChanges(file: string): Promise<void> {
    if (this.currentType === 'git' && this.gitManager) {
      await this.gitManager.checkoutFile(file);
    }
    
    if (this.currentType === 'svn' && this.svnManager) {
      await this.svnManager.revert(this.currentPath, file);
    }
  }

  /**
   * Get diff for a file
   */
  async getDiff(file?: string): Promise<string> {
    if (this.currentType === 'git' && this.gitManager) {
      return await this.gitManager.getDiff(file);
    }
    
    if (this.currentType === 'svn' && this.svnManager) {
      return await this.svnManager.diff(this.currentPath, file);
    }
    
    return '';
  }

  /**
   * Get the underlying Git manager
   */
  getGitManager(): any {
    return this.gitManager;
  }

  /**
   * Get the underlying SVN manager
   */
  getSvnManager(): any {
    return this.svnManager;
  }
}

// Export singleton instance
export const vcsManager = VCSManager.getInstance();
export { VCSManager };
