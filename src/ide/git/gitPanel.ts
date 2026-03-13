// src/ide/git/gitPanel.ts
// Git Integration Panel for AI Code IDE
// Provides a visual interface for Git operations

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPES
// ============================================================================

interface GitFileStatus {
  path: string;
  status: string;
  staged: boolean;
  status_code: string;
}

interface GitLogEntry {
  hash: string;
  short_hash: string;
  author: string;
  email: string;
  date: string;
  message: string;
}

interface GitBranchInfo {
  name: string;
  is_current: boolean;
  is_remote: boolean;
  tracking?: string;
}

interface GitInfo {
  is_repo: boolean;
  branch: string;
  remote_url: string;
  last_commit: any;
  changes: {
    total: number;
    modified: number;
    added: number;
    deleted: number;
  };
}

// ============================================================================
// GIT PANEL CLASS
// ============================================================================

export class GitPanel {
  private container: HTMLElement | null = null;
  private projectPath: string = '';
  private isGitRepo: boolean = false;
  private currentBranch: string = '';
  private statusFiles: GitFileStatus[] = [];
  private isRefreshing: boolean = false;
  
  constructor() {
    console.log('🔀 GitPanel initialized');
  }
  
  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  
  async initialize(projectPath: string): Promise<void> {
    this.projectPath = projectPath;
    
    // Check if it's a Git repo
    try {
      this.isGitRepo = await invoke<boolean>('git_is_repo', { path: projectPath });
      console.log(`🔀 Is Git repo: ${this.isGitRepo}`);
      
      if (this.isGitRepo) {
        await this.refresh();
      }
    } catch (error) {
      console.error('Failed to check Git repo:', error);
      this.isGitRepo = false;
    }
  }
  
  // ==========================================================================
  // UI CREATION
  // ==========================================================================
  
  createPanel(): HTMLElement {
    this.container = document.createElement('div');
    this.container.id = 'git-panel';
    this.container.className = 'git-panel';
    this.container.innerHTML = this.getPanelHTML();
    
    this.attachEventListeners();
    this.injectStyles();
    
    return this.container;
  }
  
  private getPanelHTML(): string {
    return `
      <div class="git-panel-header">
        <div class="git-panel-title">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.57 5.953v4.27a1.223 1.223 0 11-1.008-.036V5.88a1.223 1.223 0 01-.664-1.607L5.09 2.465.302 7.253a1.03 1.03 0 000 1.457l6.986 6.986a1.03 1.03 0 001.457 0l6.953-6.953a1.03 1.03 0 000-1.457z"/>
          </svg>
          <span>Git</span>
        </div>
        <div class="git-panel-actions">
          <button class="git-btn git-btn-icon" id="git-refresh-btn" title="Refresh">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.5 2a.5.5 0 01.5.5v3a.5.5 0 01-.5.5h-3a.5.5 0 010-1h1.82l-.748-.747A5.5 5.5 0 103.5 11.5a.5.5 0 01-1 0 6.5 6.5 0 1110.348-5.226l.652.652V2.5a.5.5 0 01.5-.5z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="git-panel-content">
        <!-- Not a Git Repo -->
        <div id="git-not-repo" class="git-not-repo" style="display: none;">
          <div class="git-not-repo-icon">📁</div>
          <div class="git-not-repo-text">Not a Git repository</div>
          <button class="git-btn git-btn-primary" id="git-init-btn">
            Initialize Repository
          </button>
        </div>
        
        <!-- Git Info -->
        <div id="git-info" class="git-info" style="display: none;">
          <div class="git-branch-selector">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9.5 3.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm-7-9a1.5 1.5 0 113 0v6a1.5 1.5 0 11-3 0v-6zm0 9a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"/>
            </svg>
            <span id="git-current-branch">main</span>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" style="margin-left: 4px;">
              <path d="M4.5 6l3.5 4 3.5-4h-7z"/>
            </svg>
          </div>
          
          <div class="git-quick-actions">
            <button class="git-btn git-btn-sm" id="git-pull-btn" title="Pull">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a.5.5 0 01.5.5v10.793l2.146-2.147a.5.5 0 01.708.708l-3 3a.5.5 0 01-.708 0l-3-3a.5.5 0 01.708-.708L7.5 12.293V1.5A.5.5 0 018 1z"/>
              </svg>
              Pull
            </button>
            <button class="git-btn git-btn-sm" id="git-push-btn" title="Push">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 15a.5.5 0 01-.5-.5V3.707L5.354 5.854a.5.5 0 11-.708-.708l3-3a.5.5 0 01.708 0l3 3a.5.5 0 01-.708.708L8.5 3.707V14.5a.5.5 0 01-.5.5z"/>
              </svg>
              Push
            </button>
            <button class="git-btn git-btn-sm" id="git-fetch-btn" title="Fetch">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 3a5 5 0 104.546 2.914.5.5 0 01.908-.417A6 6 0 118 2v1z"/>
                <path d="M8 4.466V.534a.25.25 0 01.41-.192l2.36 1.966a.25.25 0 010 .384L8.41 4.658A.25.25 0 018 4.466z"/>
              </svg>
              Fetch
            </button>
          </div>
        </div>
        
        <!-- Changes Section -->
        <div id="git-changes" class="git-changes" style="display: none;">
          <div class="git-section-header">
            <span>Changes</span>
            <span class="git-badge" id="git-changes-count">0</span>
          </div>
          
          <!-- Staged Changes -->
          <div class="git-subsection">
            <div class="git-subsection-header" id="git-staged-header">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" class="git-chevron">
                <path d="M6 4l4 4-4 4V4z"/>
              </svg>
              <span>Staged Changes</span>
              <span class="git-badge" id="git-staged-count">0</span>
            </div>
            <div class="git-file-list" id="git-staged-files"></div>
          </div>
          
          <!-- Unstaged Changes -->
          <div class="git-subsection">
            <div class="git-subsection-header" id="git-unstaged-header">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" class="git-chevron">
                <path d="M6 4l4 4-4 4V4z"/>
              </svg>
              <span>Changes</span>
              <span class="git-badge" id="git-unstaged-count">0</span>
            </div>
            <div class="git-file-list" id="git-unstaged-files"></div>
          </div>
        </div>
        
        <!-- Commit Section -->
        <div id="git-commit-section" class="git-commit-section" style="display: none;">
          <textarea 
            id="git-commit-message" 
            class="git-commit-input" 
            placeholder="Commit message (Ctrl+Enter to commit)"
            rows="3"
          ></textarea>
          <div class="git-commit-actions">
            <button class="git-btn git-btn-primary" id="git-commit-btn" disabled>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M10.97 4.97a.75.75 0 011.07 1.05l-3.99 4.99a.75.75 0 01-1.08.02L4.324 8.384a.75.75 0 111.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 01.02-.022z"/>
              </svg>
              Commit
            </button>
            <button class="git-btn" id="git-stage-all-btn" title="Stage All">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M14 1a1 1 0 011 1v12a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1h12zM2 0a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V2a2 2 0 00-2-2H2z"/>
                <path d="M10.97 4.97a.75.75 0 011.071 1.05l-3.992 4.99a.75.75 0 01-1.08.02L4.324 8.384a.75.75 0 111.06-1.06l2.094 2.093 3.473-4.425a.235.235 0 01.02-.022z"/>
              </svg>
              Stage All
            </button>
          </div>
        </div>
        
        <!-- Loading State -->
        <div id="git-loading" class="git-loading" style="display: none;">
          <div class="git-spinner"></div>
          <span>Loading...</span>
        </div>
      </div>
    `;
  }
  
  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================
  
  private attachEventListeners(): void {
    if (!this.container) return;
    
    // Refresh button
    const refreshBtn = this.container.querySelector('#git-refresh-btn');
    refreshBtn?.addEventListener('click', () => this.refresh());
    
    // Init button
    const initBtn = this.container.querySelector('#git-init-btn');
    initBtn?.addEventListener('click', () => this.initRepo());
    
    // Pull/Push/Fetch buttons
    const pullBtn = this.container.querySelector('#git-pull-btn');
    pullBtn?.addEventListener('click', () => this.pull());
    
    const pushBtn = this.container.querySelector('#git-push-btn');
    pushBtn?.addEventListener('click', () => this.push());
    
    const fetchBtn = this.container.querySelector('#git-fetch-btn');
    fetchBtn?.addEventListener('click', () => this.fetch());
    
    // Commit
    const commitBtn = this.container.querySelector('#git-commit-btn');
    commitBtn?.addEventListener('click', () => this.commit());
    
    const stageAllBtn = this.container.querySelector('#git-stage-all-btn');
    stageAllBtn?.addEventListener('click', () => this.stageAll());
    
    // Commit message input
    const commitInput = this.container.querySelector('#git-commit-message') as HTMLTextAreaElement;
    commitInput?.addEventListener('input', () => this.updateCommitButton());
    commitInput?.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        this.commit();
      }
    });
    
    // Branch selector
    const branchSelector = this.container.querySelector('.git-branch-selector');
    branchSelector?.addEventListener('click', () => this.showBranchMenu());
    
    // Collapsible sections
    const stagedHeader = this.container.querySelector('#git-staged-header');
    stagedHeader?.addEventListener('click', () => this.toggleSection('staged'));
    
    const unstagedHeader = this.container.querySelector('#git-unstaged-header');
    unstagedHeader?.addEventListener('click', () => this.toggleSection('unstaged'));
  }
  
  // ==========================================================================
  // GIT OPERATIONS
  // ==========================================================================
  
  async refresh(): Promise<void> {
    if (this.isRefreshing || !this.projectPath) return;
    
    this.isRefreshing = true;
    this.showLoading(true);
    
    try {
      // Check if it's a Git repo
      this.isGitRepo = await invoke<boolean>('git_is_repo', { path: this.projectPath });
      
      if (!this.isGitRepo) {
        this.showNotRepo();
        return;
      }
      
      // Get Git info
      const info = await invoke<GitInfo>('git_info', { path: this.projectPath });
      this.currentBranch = info.branch;
      
      // Get status
      this.statusFiles = await invoke<GitFileStatus[]>('git_status', { path: this.projectPath });
      
      // Update UI
      this.updateUI(info);
      
    } catch (error) {
      console.error('Git refresh failed:', error);
      this.showError(String(error));
    } finally {
      this.isRefreshing = false;
      this.showLoading(false);
    }
  }
  
  async initRepo(): Promise<void> {
    try {
      await invoke('git_init', { path: this.projectPath });
      this.showNotification('Git repository initialized!', 'success');
      await this.refresh();
    } catch (error) {
      this.showNotification(`Failed to init: ${error}`, 'error');
    }
  }
  
  async pull(): Promise<void> {
    try {
      this.showLoading(true);
      const result = await invoke<string>('git_pull', { path: this.projectPath });
      this.showNotification(result || 'Pull complete', 'success');
      await this.refresh();
    } catch (error) {
      this.showNotification(`Pull failed: ${error}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }
  
  async push(): Promise<void> {
    try {
      this.showLoading(true);
      const result = await invoke<string>('git_push', { path: this.projectPath });
      this.showNotification(result || 'Push complete', 'success');
    } catch (error) {
      this.showNotification(`Push failed: ${error}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }
  
  async fetch(): Promise<void> {
    try {
      this.showLoading(true);
      await invoke('git_fetch', { path: this.projectPath });
      this.showNotification('Fetch complete', 'success');
      await this.refresh();
    } catch (error) {
      this.showNotification(`Fetch failed: ${error}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }
  
  async commit(): Promise<void> {
    const messageInput = this.container?.querySelector('#git-commit-message') as HTMLTextAreaElement;
    const message = messageInput?.value?.trim();
    
    if (!message) {
      this.showNotification('Please enter a commit message', 'warning');
      return;
    }
    
    try {
      this.showLoading(true);
      await invoke('git_commit', { path: this.projectPath, message });
      messageInput.value = '';
      this.showNotification('Commit successful!', 'success');
      await this.refresh();
    } catch (error) {
      this.showNotification(`Commit failed: ${error}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }
  
  async stageAll(): Promise<void> {
    try {
      await invoke('git_add_all', { path: this.projectPath });
      this.showNotification('All changes staged', 'success');
      await this.refresh();
    } catch (error) {
      this.showNotification(`Stage all failed: ${error}`, 'error');
    }
  }
  
  async stageFile(filePath: string): Promise<void> {
    try {
      await invoke('git_add', { path: this.projectPath, files: [filePath] });
      await this.refresh();
    } catch (error) {
      this.showNotification(`Stage failed: ${error}`, 'error');
    }
  }
  
  async unstageFile(filePath: string): Promise<void> {
    try {
      await invoke('git_unstage', { path: this.projectPath, files: [filePath] });
      await this.refresh();
    } catch (error) {
      this.showNotification(`Unstage failed: ${error}`, 'error');
    }
  }
  
  async discardFile(filePath: string): Promise<void> {
    if (!confirm(`Discard changes to ${filePath}?`)) return;
    
    try {
      await invoke('git_discard', { path: this.projectPath, files: [filePath] });
      this.showNotification('Changes discarded', 'success');
      await this.refresh();
    } catch (error) {
      this.showNotification(`Discard failed: ${error}`, 'error');
    }
  }
  
  // ==========================================================================
  // UI UPDATES
  // ==========================================================================
  
  private updateUI(info: GitInfo): void {
    if (!this.container) return;
    
    // Hide not-repo, show info
    const notRepo = this.container.querySelector('#git-not-repo') as HTMLElement;
    const gitInfo = this.container.querySelector('#git-info') as HTMLElement;
    const gitChanges = this.container.querySelector('#git-changes') as HTMLElement;
    const commitSection = this.container.querySelector('#git-commit-section') as HTMLElement;
    
    if (notRepo) notRepo.style.display = 'none';
    if (gitInfo) gitInfo.style.display = 'block';
    if (gitChanges) gitChanges.style.display = 'block';
    if (commitSection) commitSection.style.display = 'block';
    
    // Update branch
    const branchEl = this.container.querySelector('#git-current-branch');
    if (branchEl) branchEl.textContent = info.branch || 'main';
    
    // Update changes count
    const changesCount = this.container.querySelector('#git-changes-count');
    if (changesCount) changesCount.textContent = String(info.changes.total);
    
    // Separate staged and unstaged files
    const stagedFiles = this.statusFiles.filter(f => f.staged);
    const unstagedFiles = this.statusFiles.filter(f => !f.staged);
    
    // Update staged count
    const stagedCount = this.container.querySelector('#git-staged-count');
    if (stagedCount) stagedCount.textContent = String(stagedFiles.length);
    
    // Update unstaged count
    const unstagedCount = this.container.querySelector('#git-unstaged-count');
    if (unstagedCount) unstagedCount.textContent = String(unstagedFiles.length);
    
    // Render file lists
    this.renderFileList('#git-staged-files', stagedFiles, true);
    this.renderFileList('#git-unstaged-files', unstagedFiles, false);
    
    // Update commit button state
    this.updateCommitButton();
  }
  
  private renderFileList(selector: string, files: GitFileStatus[], staged: boolean): void {
    const container = this.container?.querySelector(selector);
    if (!container) return;
    
    if (files.length === 0) {
      container.innerHTML = '<div class="git-empty">No changes</div>';
      return;
    }
    
    container.innerHTML = files.map(file => `
      <div class="git-file-item" data-path="${file.path}">
        <span class="git-file-status git-status-${file.status}">${this.getStatusIcon(file.status)}</span>
        <span class="git-file-name" title="${file.path}">${this.getFileName(file.path)}</span>
        <div class="git-file-actions">
          ${staged ? `
            <button class="git-file-btn" data-action="unstage" title="Unstage">−</button>
          ` : `
            <button class="git-file-btn" data-action="stage" title="Stage">+</button>
            <button class="git-file-btn" data-action="discard" title="Discard">↩</button>
          `}
        </div>
      </div>
    `).join('');
    
    // Attach file action listeners
    container.querySelectorAll('.git-file-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = (btn as HTMLElement).dataset.action;
        const filePath = (btn.closest('.git-file-item') as HTMLElement)?.dataset.path;
        
        if (filePath) {
          if (action === 'stage') this.stageFile(filePath);
          else if (action === 'unstage') this.unstageFile(filePath);
          else if (action === 'discard') this.discardFile(filePath);
        }
      });
    });
    
    // Click to open file
    container.querySelectorAll('.git-file-item').forEach(item => {
      item.addEventListener('click', () => {
        const filePath = (item as HTMLElement).dataset.path;
        if (filePath) {
          this.openFile(filePath);
        }
      });
    });
  }
  
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'modified': return 'M';
      case 'added': return 'A';
      case 'deleted': return 'D';
      case 'renamed': return 'R';
      case 'untracked': return 'U';
      default: return '?';
    }
  }
  
  private getFileName(path: string): string {
    return path.split(/[/\\]/).pop() || path;
  }
  
  private async openFile(relativePath: string): Promise<void> {
    const fullPath = `${this.projectPath}\\${relativePath}`;
    
    try {
      const content = await invoke<string>('read_file_content', { path: fullPath });
      const tabManager = (window as any).tabManager;
      if (tabManager?.addTab) {
        tabManager.addTab(fullPath, content);
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }
  
  private updateCommitButton(): void {
    const commitBtn = this.container?.querySelector('#git-commit-btn') as HTMLButtonElement;
    const messageInput = this.container?.querySelector('#git-commit-message') as HTMLTextAreaElement;
    const stagedFiles = this.statusFiles.filter(f => f.staged);
    
    if (commitBtn) {
      commitBtn.disabled = !messageInput?.value?.trim() || stagedFiles.length === 0;
    }
  }
  
  private toggleSection(section: 'staged' | 'unstaged'): void {
    const header = this.container?.querySelector(`#git-${section}-header`);
    const fileList = this.container?.querySelector(`#git-${section}-files`) as HTMLElement;
    const chevron = header?.querySelector('.git-chevron') as HTMLElement;
    
    if (fileList && chevron) {
      const isHidden = fileList.style.display === 'none';
      fileList.style.display = isHidden ? 'block' : 'none';
      chevron.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
    }
  }
  
  private async showBranchMenu(): Promise<void> {
    try {
      const branches = await invoke<GitBranchInfo[]>('git_branches', { 
        path: this.projectPath, 
        all: true 
      });
      
      // Create branch menu
      const menu = document.createElement('div');
      menu.className = 'git-branch-menu';
      menu.innerHTML = `
        <div class="git-branch-menu-header">
          <input type="text" placeholder="Filter branches..." class="git-branch-filter">
        </div>
        <div class="git-branch-list">
          ${branches.map(b => `
            <div class="git-branch-item ${b.is_current ? 'current' : ''}" data-branch="${b.name}">
              ${b.is_current ? '✓ ' : ''}${b.name}
              ${b.is_remote ? '<span class="git-remote-badge">remote</span>' : ''}
            </div>
          `).join('')}
        </div>
        <div class="git-branch-actions">
          <button class="git-btn git-btn-sm" id="git-new-branch-btn">+ New Branch</button>
        </div>
      `;
      
      // Position menu
      const selector = this.container?.querySelector('.git-branch-selector');
      if (selector) {
        const rect = selector.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 4}px`;
        menu.style.left = `${rect.left}px`;
        menu.style.zIndex = '10000';
      }
      
      document.body.appendChild(menu);
      
      // Branch click handler
      menu.querySelectorAll('.git-branch-item').forEach(item => {
        item.addEventListener('click', async () => {
          const branch = (item as HTMLElement).dataset.branch;
          if (branch && branch !== this.currentBranch) {
            try {
              await invoke('git_checkout', { path: this.projectPath, target: branch });
              this.showNotification(`Switched to ${branch}`, 'success');
              await this.refresh();
            } catch (error) {
              this.showNotification(`Checkout failed: ${error}`, 'error');
            }
          }
          menu.remove();
        });
      });
      
      // Close on click outside
      const closeMenu = (e: MouseEvent) => {
        if (!menu.contains(e.target as Node)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      };
      setTimeout(() => document.addEventListener('click', closeMenu), 0);
      
    } catch (error) {
      console.error('Failed to get branches:', error);
    }
  }
  
  // ==========================================================================
  // UI HELPERS
  // ==========================================================================
  
  private showNotRepo(): void {
    if (!this.container) return;
    
    const notRepo = this.container.querySelector('#git-not-repo') as HTMLElement;
    const gitInfo = this.container.querySelector('#git-info') as HTMLElement;
    const gitChanges = this.container.querySelector('#git-changes') as HTMLElement;
    const commitSection = this.container.querySelector('#git-commit-section') as HTMLElement;
    
    if (notRepo) notRepo.style.display = 'flex';
    if (gitInfo) gitInfo.style.display = 'none';
    if (gitChanges) gitChanges.style.display = 'none';
    if (commitSection) commitSection.style.display = 'none';
  }
  
  private showLoading(show: boolean): void {
    const loading = this.container?.querySelector('#git-loading') as HTMLElement;
    if (loading) {
      loading.style.display = show ? 'flex' : 'none';
    }
  }
  
  private showError(message: string): void {
    console.error('Git error:', message);
    this.showNotification(message, 'error');
  }
  
  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    const notification = document.createElement('div');
    notification.className = `git-notification git-notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
      color: white;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  // ==========================================================================
  // STYLES
  // ==========================================================================
  
  private injectStyles(): void {
    if (document.getElementById('git-panel-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'git-panel-styles';
    style.textContent = `
      .git-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #1e1e1e;
        color: #cccccc;
        font-size: 13px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      
      .git-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid #333;
        background: #252526;
      }
      
      .git-panel-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: #e0e0e0;
      }
      
      .git-panel-title svg {
        color: #f05033;
      }
      
      .git-panel-content {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }
      
      .git-btn {
        background: #3c3c3c;
        border: 1px solid #555;
        color: #cccccc;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;
      }
      
      .git-btn:hover {
        background: #4c4c4c;
        border-color: #666;
      }
      
      .git-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .git-btn-primary {
        background: #0e639c;
        border-color: #1177bb;
      }
      
      .git-btn-primary:hover {
        background: #1177bb;
      }
      
      .git-btn-icon {
        padding: 4px 8px;
        background: transparent;
        border: none;
      }
      
      .git-btn-icon:hover {
        background: rgba(255,255,255,0.1);
      }
      
      .git-btn-sm {
        padding: 4px 8px;
        font-size: 11px;
      }
      
      .git-not-repo {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
        gap: 16px;
      }
      
      .git-not-repo-icon {
        font-size: 48px;
        opacity: 0.5;
      }
      
      .git-not-repo-text {
        color: #888;
      }
      
      .git-info {
        padding: 8px 0;
      }
      
      .git-branch-selector {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        background: #2d2d2d;
        border-radius: 4px;
        cursor: pointer;
        margin-bottom: 8px;
      }
      
      .git-branch-selector:hover {
        background: #3c3c3c;
      }
      
      .git-quick-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }
      
      .git-section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        font-weight: 600;
        color: #e0e0e0;
        border-bottom: 1px solid #333;
        margin-bottom: 8px;
      }
      
      .git-badge {
        background: #4d4d4d;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: normal;
      }
      
      .git-subsection {
        margin-bottom: 12px;
      }
      
      .git-subsection-header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 0;
        cursor: pointer;
        color: #aaa;
        font-size: 12px;
      }
      
      .git-subsection-header:hover {
        color: #fff;
      }
      
      .git-chevron {
        transition: transform 0.2s;
        transform: rotate(90deg);
      }
      
      .git-file-list {
        padding-left: 16px;
      }
      
      .git-file-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .git-file-item:hover {
        background: rgba(255,255,255,0.05);
      }
      
      .git-file-item:hover .git-file-actions {
        opacity: 1;
      }
      
      .git-file-status {
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        border-radius: 3px;
      }
      
      .git-status-modified { color: #d19a66; background: rgba(209,154,102,0.2); }
      .git-status-added { color: #98c379; background: rgba(152,195,121,0.2); }
      .git-status-deleted { color: #e06c75; background: rgba(224,108,117,0.2); }
      .git-status-untracked { color: #61afef; background: rgba(97,175,239,0.2); }
      .git-status-renamed { color: #c678dd; background: rgba(198,120,221,0.2); }
      
      .git-file-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .git-file-actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s;
      }
      
      .git-file-btn {
        background: #3c3c3c;
        border: none;
        color: #cccccc;
        width: 20px;
        height: 20px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .git-file-btn:hover {
        background: #4c4c4c;
      }
      
      .git-commit-section {
        padding: 12px 0;
        border-top: 1px solid #333;
        margin-top: 8px;
      }
      
      .git-commit-input {
        width: 100%;
        background: #2d2d2d;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        color: #cccccc;
        padding: 8px;
        font-size: 12px;
        font-family: inherit;
        resize: vertical;
        min-height: 60px;
        margin-bottom: 8px;
      }
      
      .git-commit-input:focus {
        outline: none;
        border-color: #0e639c;
      }
      
      .git-commit-actions {
        display: flex;
        gap: 8px;
      }
      
      .git-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 20px;
        color: #888;
      }
      
      .git-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #333;
        border-top-color: #0e639c;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      
      .git-empty {
        color: #666;
        font-size: 12px;
        padding: 8px;
        text-align: center;
      }
      
      .git-branch-menu {
        background: #2d2d2d;
        border: 1px solid #464647;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        min-width: 200px;
        max-height: 300px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      
      .git-branch-menu-header {
        padding: 8px;
        border-bottom: 1px solid #333;
      }
      
      .git-branch-filter {
        width: 100%;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        color: #cccccc;
        padding: 6px 8px;
        font-size: 12px;
      }
      
      .git-branch-list {
        flex: 1;
        overflow-y: auto;
        padding: 4px 0;
      }
      
      .git-branch-item {
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .git-branch-item:hover {
        background: rgba(255,255,255,0.05);
      }
      
      .git-branch-item.current {
        color: #4ec9b0;
      }
      
      .git-remote-badge {
        font-size: 10px;
        background: #4d4d4d;
        padding: 2px 6px;
        border-radius: 8px;
        margin-left: auto;
      }
      
      .git-branch-actions {
        padding: 8px;
        border-top: 1px solid #333;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}

// ============================================================================
// EXPORTS & GLOBAL INSTANCE
// ============================================================================

export const gitPanel = new GitPanel();

// Export for global access
(window as any).gitPanel = gitPanel;
