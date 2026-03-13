// src/ide/git/gitTabIntegration.ts
// Git Tab Integration - Matches existing FILES/TERMINAL/SEARCH tab style
// Add this to your explorerTabs.ts or main initialization

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
// GIT TAB MANAGER
// ============================================================================

class GitTabManager {
  private projectPath: string = '';
  private isGitRepo: boolean = false;
  private currentBranch: string = '';
  private statusFiles: GitFileStatus[] = [];
  private contentContainer: HTMLElement | null = null;
  private isInitialized: boolean = false;
  
  constructor() {
    console.log('🔀 GitTabManager created');
  }
  
  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  
  initialize(): void {
    if (this.isInitialized) return;
    
    this.addGitTab();
    this.injectStyles();
    this.setupEventListeners();
    this.isInitialized = true;
    
    console.log('✅ Git tab initialized');
  }
  
  private addGitTab(): void {
    // Find the tab container (where FILES, TERMINAL, SEARCH are)
    const tabContainer = document.querySelector('.explorer-tabs') || 
                         document.querySelector('.sidebar-tabs') ||
                         document.querySelector('[class*="tabs"]');
    
    if (!tabContainer) {
      console.warn('⚠️ Tab container not found, creating fallback');
      return;
    }
    
    // Check if GIT tab already exists
    if (document.getElementById('git-tab-btn')) {
      console.log('Git tab already exists');
      return;
    }
    
    // Create GIT tab button matching existing style
    const gitTabBtn = document.createElement('div');
    gitTabBtn.id = 'git-tab-btn';
    gitTabBtn.className = 'explorer-tab'; // Same class as other tabs
    gitTabBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 6px;">
        <path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.57 5.953v4.27a1.223 1.223 0 11-1.008-.036V5.88a1.223 1.223 0 01-.664-1.607L5.09 2.465.302 7.253a1.03 1.03 0 000 1.457l6.986 6.986a1.03 1.03 0 001.457 0l6.953-6.953a1.03 1.03 0 000-1.457z"/>
      </svg>
      GIT
    `;
    gitTabBtn.style.cssText = `
      display: flex;
      align-items: center;
      padding: 8px 16px;
      cursor: pointer;
      color: #888;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    `;
    
    // Add to tab bar
    tabContainer.appendChild(gitTabBtn);
    
    // Create Git content panel
    this.createGitContent();
    
    // Tab click handler
    gitTabBtn.addEventListener('click', () => this.showGitTab());
    
    // Hover effect
    gitTabBtn.addEventListener('mouseenter', () => {
      if (!gitTabBtn.classList.contains('active')) {
        gitTabBtn.style.color = '#ccc';
      }
    });
    
    gitTabBtn.addEventListener('mouseleave', () => {
      if (!gitTabBtn.classList.contains('active')) {
        gitTabBtn.style.color = '#888';
      }
    });
  }
  
  private createGitContent(): void {
    // Find where other tab contents are
    const explorerPanel = document.querySelector('.explorer-panel') ||
                          document.querySelector('.sidebar-content') ||
                          document.querySelector('[class*="explorer"]');
    
    if (!explorerPanel) return;
    
    // Create Git content container
    this.contentContainer = document.createElement('div');
    this.contentContainer.id = 'git-tab-content';
    this.contentContainer.className = 'tab-content git-tab-content';
    this.contentContainer.style.display = 'none';
    this.contentContainer.innerHTML = this.getGitContentHTML();
    
    explorerPanel.appendChild(this.contentContainer);
    
    // Attach event listeners to Git panel elements
    this.attachPanelListeners();
  }
  
  private getGitContentHTML(): string {
    return `
      <div class="git-content-wrapper">
        <!-- Header with refresh -->
        <div class="git-header">
          <div class="git-header-title">
            <span class="git-icon">🔀</span>
            <span>Source Control</span>
          </div>
          <button class="git-header-btn" id="git-refresh-btn" title="Refresh">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.5 2a.5.5 0 01.5.5v3a.5.5 0 01-.5.5h-3a.5.5 0 010-1h1.82l-.748-.747A5.5 5.5 0 103.5 11.5a.5.5 0 01-1 0 6.5 6.5 0 1110.348-5.226l.652.652V2.5a.5.5 0 01.5-.5z"/>
            </svg>
          </button>
        </div>
        
        <!-- Not a repo state -->
        <div id="git-no-repo" class="git-empty-state">
          <div class="git-empty-icon">📁</div>
          <div class="git-empty-text">Not a Git repository</div>
          <button class="git-btn git-btn-primary" id="git-init-repo-btn">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm.5 4.5v3h3a.5.5 0 010 1h-3v3a.5.5 0 01-1 0v-3h-3a.5.5 0 010-1h3v-3a.5.5 0 011 0z"/>
            </svg>
            Initialize Repository
          </button>
        </div>
        
        <!-- Main Git content -->
        <div id="git-main-content" style="display: none;">
          <!-- Branch bar -->
          <div class="git-branch-bar" id="git-branch-bar">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9.5 3.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM5 6.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>
            </svg>
            <span id="git-branch-name">main</span>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" class="git-chevron-down">
              <path d="M4.5 6l3.5 4 3.5-4h-7z"/>
            </svg>
          </div>
          
          <!-- Quick actions -->
          <div class="git-quick-actions">
            <button class="git-action-btn" id="git-sync-btn" title="Sync (Pull + Push)">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 3a5 5 0 104.546 2.914.5.5 0 01.908-.417A6 6 0 118 2v1z"/>
                <path d="M8 4.466V.534a.25.25 0 01.41-.192l2.36 1.966a.25.25 0 010 .384L8.41 4.658A.25.25 0 018 4.466z"/>
              </svg>
            </button>
            <button class="git-action-btn" id="git-pull-btn" title="Pull">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a.5.5 0 01.5.5v10.793l2.146-2.147a.5.5 0 01.708.708l-3 3a.5.5 0 01-.708 0l-3-3a.5.5 0 01.708-.708L7.5 12.293V1.5A.5.5 0 018 1z"/>
              </svg>
            </button>
            <button class="git-action-btn" id="git-push-btn" title="Push">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 15a.5.5 0 01-.5-.5V3.707L5.354 5.854a.5.5 0 11-.708-.708l3-3a.5.5 0 01.708 0l3 3a.5.5 0 01-.708.708L8.5 3.707V14.5a.5.5 0 01-.5.5z"/>
              </svg>
            </button>
          </div>
          
          <!-- Commit message input -->
          <div class="git-commit-box">
            <input 
              type="text" 
              id="git-commit-input" 
              class="git-commit-input" 
              placeholder="Message (Ctrl+Enter to commit)"
            />
            <div class="git-commit-buttons">
              <button class="git-btn git-btn-commit" id="git-commit-btn" title="Commit">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M10.97 4.97a.75.75 0 011.07 1.05l-3.99 4.99a.75.75 0 01-1.08.02L4.324 8.384a.75.75 0 111.06-1.06l2.094 2.093 3.473-4.425z"/>
                </svg>
                Commit
              </button>
            </div>
          </div>
          
          <!-- Changes section -->
          <div class="git-changes-section">
            <!-- Staged Changes -->
            <div class="git-section" id="git-staged-section">
              <div class="git-section-header" data-section="staged">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" class="git-section-chevron expanded">
                  <path d="M6 4l4 4-4 4V4z"/>
                </svg>
                <span>Staged Changes</span>
                <span class="git-section-badge" id="git-staged-badge">0</span>
                <button class="git-section-btn" id="git-unstage-all-btn" title="Unstage All">−</button>
              </div>
              <div class="git-file-list" id="git-staged-list"></div>
            </div>
            
            <!-- Changes (unstaged) -->
            <div class="git-section" id="git-changes-section">
              <div class="git-section-header" data-section="changes">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" class="git-section-chevron expanded">
                  <path d="M6 4l4 4-4 4V4z"/>
                </svg>
                <span>Changes</span>
                <span class="git-section-badge" id="git-changes-badge">0</span>
                <button class="git-section-btn" id="git-stage-all-btn" title="Stage All">+</button>
              </div>
              <div class="git-file-list" id="git-changes-list"></div>
            </div>
          </div>
        </div>
        
        <!-- Loading state -->
        <div id="git-loading" class="git-loading" style="display: none;">
          <div class="git-spinner"></div>
        </div>
      </div>
    `;
  }
  
  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================
  
  private attachPanelListeners(): void {
    if (!this.contentContainer) return;
    
    // Refresh
    const refreshBtn = this.contentContainer.querySelector('#git-refresh-btn');
    refreshBtn?.addEventListener('click', () => this.refresh());
    
    // Init repo
    const initBtn = this.contentContainer.querySelector('#git-init-repo-btn');
    initBtn?.addEventListener('click', () => this.initRepo());
    
    // Branch selector
    const branchBar = this.contentContainer.querySelector('#git-branch-bar');
    branchBar?.addEventListener('click', () => this.showBranchPicker());
    
    // Quick actions
    const syncBtn = this.contentContainer.querySelector('#git-sync-btn');
    syncBtn?.addEventListener('click', () => this.sync());
    
    const pullBtn = this.contentContainer.querySelector('#git-pull-btn');
    pullBtn?.addEventListener('click', () => this.pull());
    
    const pushBtn = this.contentContainer.querySelector('#git-push-btn');
    pushBtn?.addEventListener('click', () => this.push());
    
    // Commit
    const commitBtn = this.contentContainer.querySelector('#git-commit-btn');
    commitBtn?.addEventListener('click', () => this.commit());
    
    const commitInput = this.contentContainer.querySelector('#git-commit-input') as HTMLInputElement;
    commitInput?.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        this.commit();
      }
    });
    
    // Stage/unstage all
    const stageAllBtn = this.contentContainer.querySelector('#git-stage-all-btn');
    stageAllBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.stageAll();
    });
    
    const unstageAllBtn = this.contentContainer.querySelector('#git-unstage-all-btn');
    unstageAllBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.unstageAll();
    });
    
    // Section collapsing
    this.contentContainer.querySelectorAll('.git-section-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.git-section-btn')) return;
        this.toggleSection(header as HTMLElement);
      });
    });
  }
  
  private setupEventListeners(): void {
    // Listen for project changes
    document.addEventListener('project-opened', (e: any) => {
      const path = e.detail?.path;
      if (path) {
        this.projectPath = path;
        this.refresh();
      }
    });
    
    // Listen for file saves to refresh status
    document.addEventListener('file-saved', () => {
      if (this.isGitRepo) {
        this.refresh();
      }
    });
  }
  
  // ==========================================================================
  // TAB SWITCHING
  // ==========================================================================
  
  showGitTab(): void {
    // Hide all tab contents
    document.querySelectorAll('.tab-content, [id$="-content"]').forEach(content => {
      (content as HTMLElement).style.display = 'none';
    });
    
    // Remove active from all tabs
    document.querySelectorAll('.explorer-tab').forEach(tab => {
      tab.classList.remove('active');
      (tab as HTMLElement).style.color = '#888';
      (tab as HTMLElement).style.borderBottomColor = 'transparent';
    });
    
    // Show Git content
    if (this.contentContainer) {
      this.contentContainer.style.display = 'block';
    }
    
    // Mark Git tab as active
    const gitTab = document.getElementById('git-tab-btn');
    if (gitTab) {
      gitTab.classList.add('active');
      gitTab.style.color = '#e0e0e0';
      gitTab.style.borderBottomColor = '#f0db4f'; // Yellow to match your theme
    }
    
    // Get current project and refresh
    this.projectPath = localStorage.getItem('currentProjectPath') || '';
    if (this.projectPath) {
      this.refresh();
    }
  }
  
  // ==========================================================================
  // GIT OPERATIONS
  // ==========================================================================
  
  async refresh(): Promise<void> {
    if (!this.projectPath) return;
    
    this.showLoading(true);
    
    try {
      // Check if it's a Git repo
      this.isGitRepo = await invoke<boolean>('git_is_repo', { path: this.projectPath });
      
      if (!this.isGitRepo) {
        this.showNoRepo();
        return;
      }
      
      // Get info and status
      const info = await invoke<GitInfo>('git_info', { path: this.projectPath });
      this.currentBranch = info.branch;
      this.statusFiles = await invoke<GitFileStatus[]>('git_status', { path: this.projectPath });
      
      this.updateUI(info);
      
    } catch (error) {
      console.error('Git refresh error:', error);
      this.showNotification(`Error: ${error}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }
  
  async initRepo(): Promise<void> {
    try {
      await invoke('git_init', { path: this.projectPath });
      this.showNotification('Repository initialized!', 'success');
      await this.refresh();
    } catch (error) {
      this.showNotification(`Init failed: ${error}`, 'error');
    }
  }
  
  async sync(): Promise<void> {
    try {
      this.showLoading(true);
      await invoke('git_pull', { path: this.projectPath });
      await invoke('git_push', { path: this.projectPath });
      this.showNotification('Synced!', 'success');
      await this.refresh();
    } catch (error) {
      this.showNotification(`Sync failed: ${error}`, 'error');
    } finally {
      this.showLoading(false);
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
      await invoke('git_push', { path: this.projectPath });
      this.showNotification('Pushed!', 'success');
    } catch (error) {
      this.showNotification(`Push failed: ${error}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }
  
  async commit(): Promise<void> {
    const input = this.contentContainer?.querySelector('#git-commit-input') as HTMLInputElement;
    const message = input?.value?.trim();
    
    if (!message) {
      this.showNotification('Enter a commit message', 'warning');
      input?.focus();
      return;
    }
    
    const stagedCount = this.statusFiles.filter(f => f.staged).length;
    if (stagedCount === 0) {
      this.showNotification('Stage some changes first', 'warning');
      return;
    }
    
    try {
      this.showLoading(true);
      await invoke('git_commit', { path: this.projectPath, message });
      input.value = '';
      this.showNotification('Committed!', 'success');
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
      await this.refresh();
    } catch (error) {
      this.showNotification(`Stage all failed: ${error}`, 'error');
    }
  }
  
  async unstageAll(): Promise<void> {
    const stagedFiles = this.statusFiles.filter(f => f.staged).map(f => f.path);
    if (stagedFiles.length === 0) return;
    
    try {
      await invoke('git_unstage', { path: this.projectPath, files: stagedFiles });
      await this.refresh();
    } catch (error) {
      this.showNotification(`Unstage failed: ${error}`, 'error');
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
    const fileName = filePath.split(/[/\\]/).pop();
    if (!confirm(`Discard changes to "${fileName}"?`)) return;
    
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
    if (!this.contentContainer) return;
    
    // Show main content, hide no-repo
    const noRepo = this.contentContainer.querySelector('#git-no-repo') as HTMLElement;
    const mainContent = this.contentContainer.querySelector('#git-main-content') as HTMLElement;
    
    if (noRepo) noRepo.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
    
    // Update branch name
    const branchName = this.contentContainer.querySelector('#git-branch-name');
    if (branchName) branchName.textContent = info.branch || 'main';
    
    // Update status bar branch too
    this.updateStatusBarBranch(info.branch);
    
    // Separate files
    const staged = this.statusFiles.filter(f => f.staged);
    const unstaged = this.statusFiles.filter(f => !f.staged);
    
    // Update badges
    const stagedBadge = this.contentContainer.querySelector('#git-staged-badge');
    const changesBadge = this.contentContainer.querySelector('#git-changes-badge');
    if (stagedBadge) stagedBadge.textContent = String(staged.length);
    if (changesBadge) changesBadge.textContent = String(unstaged.length);
    
    // Render file lists
    this.renderFileList('#git-staged-list', staged, true);
    this.renderFileList('#git-changes-list', unstaged, false);
    
    // Show/hide sections based on content
    const stagedSection = this.contentContainer.querySelector('#git-staged-section') as HTMLElement;
    const changesSection = this.contentContainer.querySelector('#git-changes-section') as HTMLElement;
    
    if (stagedSection) stagedSection.style.display = staged.length > 0 ? 'block' : 'none';
    // Always show changes section
  }
  
  private renderFileList(selector: string, files: GitFileStatus[], isStaged: boolean): void {
    const container = this.contentContainer?.querySelector(selector);
    if (!container) return;
    
    if (files.length === 0) {
      container.innerHTML = `<div class="git-empty-list">No ${isStaged ? 'staged ' : ''}changes</div>`;
      return;
    }
    
    container.innerHTML = files.map(file => `
      <div class="git-file-item" data-path="${file.path}">
        <span class="git-file-status ${this.getStatusClass(file.status)}">${this.getStatusLetter(file.status)}</span>
        <span class="git-file-name" title="${file.path}">${this.getFileName(file.path)}</span>
        <div class="git-file-actions">
          ${isStaged ? `
            <button class="git-file-action" data-action="unstage" title="Unstage">−</button>
          ` : `
            <button class="git-file-action" data-action="stage" title="Stage">+</button>
            <button class="git-file-action git-file-action-danger" data-action="discard" title="Discard">↩</button>
          `}
        </div>
      </div>
    `).join('');
    
    // Attach click handlers
    container.querySelectorAll('.git-file-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = (btn as HTMLElement).dataset.action;
        const filePath = (btn.closest('.git-file-item') as HTMLElement)?.dataset.path;
        
        if (!filePath) return;
        
        if (action === 'stage') this.stageFile(filePath);
        else if (action === 'unstage') this.unstageFile(filePath);
        else if (action === 'discard') this.discardFile(filePath);
      });
    });
    
    // File click to open diff
    container.querySelectorAll('.git-file-item').forEach(item => {
      item.addEventListener('click', () => {
        const filePath = (item as HTMLElement).dataset.path;
        if (filePath) this.openFileDiff(filePath);
      });
    });
  }
  
  private getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'modified': 'git-status-modified',
      'added': 'git-status-added',
      'deleted': 'git-status-deleted',
      'untracked': 'git-status-untracked',
      'renamed': 'git-status-renamed'
    };
    return classes[status] || 'git-status-unknown';
  }
  
  private getStatusLetter(status: string): string {
    const letters: Record<string, string> = {
      'modified': 'M',
      'added': 'A',
      'deleted': 'D',
      'untracked': 'U',
      'renamed': 'R'
    };
    return letters[status] || '?';
  }
  
  private getFileName(path: string): string {
    return path.split(/[/\\]/).pop() || path;
  }
  
  private async openFileDiff(relativePath: string): Promise<void> {
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
  
  private updateStatusBarBranch(branch: string): void {
    // Update the branch indicator in status bar if it exists
    const branchIndicator = document.querySelector('.status-bar-branch, [data-branch-indicator]');
    if (branchIndicator) {
      branchIndicator.textContent = branch;
    }
  }
  
  private toggleSection(header: HTMLElement): void {
    const section = header.closest('.git-section');
    const list = section?.querySelector('.git-file-list') as HTMLElement;
    const chevron = header.querySelector('.git-section-chevron') as HTMLElement;
    
    if (list && chevron) {
      const isExpanded = chevron.classList.contains('expanded');
      list.style.display = isExpanded ? 'none' : 'block';
      chevron.classList.toggle('expanded');
    }
  }
  
  private async showBranchPicker(): Promise<void> {
    try {
      const branches = await invoke<any[]>('git_branches', { path: this.projectPath, all: true });
      
      // Create popup
      const popup = document.createElement('div');
      popup.className = 'git-branch-popup';
      popup.innerHTML = `
        <div class="git-branch-popup-header">
          <input type="text" placeholder="Search branches..." class="git-branch-search">
        </div>
        <div class="git-branch-popup-list">
          ${branches.map(b => `
            <div class="git-branch-popup-item ${b.is_current ? 'current' : ''}" data-branch="${b.name}">
              ${b.is_current ? '✓ ' : '  '}${b.name}
            </div>
          `).join('')}
        </div>
      `;
      
      // Position near branch bar
      const branchBar = this.contentContainer?.querySelector('#git-branch-bar');
      if (branchBar) {
        const rect = branchBar.getBoundingClientRect();
        popup.style.cssText = `
          position: fixed;
          top: ${rect.bottom + 4}px;
          left: ${rect.left}px;
          z-index: 10000;
        `;
      }
      
      document.body.appendChild(popup);
      
      // Click handler
      popup.querySelectorAll('.git-branch-popup-item').forEach(item => {
        item.addEventListener('click', async () => {
          const branch = (item as HTMLElement).dataset.branch;
          if (branch && branch !== this.currentBranch) {
            try {
              await invoke('git_checkout', { path: this.projectPath, target: branch });
              this.showNotification(`Switched to ${branch}`, 'success');
              await this.refresh();
            } catch (error) {
              this.showNotification(`Switch failed: ${error}`, 'error');
            }
          }
          popup.remove();
        });
      });
      
      // Close on click outside
      setTimeout(() => {
        document.addEventListener('click', function closePopup(e) {
          if (!popup.contains(e.target as Node)) {
            popup.remove();
            document.removeEventListener('click', closePopup);
          }
        });
      }, 0);
      
    } catch (error) {
      console.error('Failed to get branches:', error);
    }
  }
  
  // ==========================================================================
  // UI HELPERS
  // ==========================================================================
  
  private showNoRepo(): void {
    if (!this.contentContainer) return;
    
    const noRepo = this.contentContainer.querySelector('#git-no-repo') as HTMLElement;
    const mainContent = this.contentContainer.querySelector('#git-main-content') as HTMLElement;
    
    if (noRepo) noRepo.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'none';
  }
  
  private showLoading(show: boolean): void {
    const loading = this.contentContainer?.querySelector('#git-loading') as HTMLElement;
    if (loading) {
      loading.style.display = show ? 'flex' : 'none';
    }
  }
  
  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    const colors: Record<string, string> = {
      success: '#4ec9b0',
      error: '#f14c4c',
      warning: '#cca700',
      info: '#3794ff'
    };
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 40px;
      right: 20px;
      padding: 10px 16px;
      background: #252526;
      border-left: 3px solid ${colors[type]};
      color: #cccccc;
      font-size: 13px;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      z-index: 10001;
      animation: slideIn 0.2s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.2s';
      setTimeout(() => notification.remove(), 200);
    }, 3000);
  }
  
  // ==========================================================================
  // STYLES
  // ==========================================================================
  
  private injectStyles(): void {
    if (document.getElementById('git-tab-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'git-tab-styles';
    style.textContent = `
      /* Git Tab Button */
      #git-tab-btn {
        display: flex !important;
        align-items: center;
        padding: 8px 16px;
        cursor: pointer;
        color: #888;
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
        background: transparent;
      }
      
      #git-tab-btn:hover {
        color: #ccc;
      }
      
      #git-tab-btn.active {
        color: #e0e0e0 !important;
        border-bottom-color: #f0db4f !important;
      }
      
      #git-tab-btn svg {
        color: #f05033;
      }
      
      /* Git Content */
      .git-tab-content {
        height: 100%;
        overflow: hidden;
      }
      
      .git-content-wrapper {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: #1e1e1e;
      }
      
      .git-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: #252526;
        border-bottom: 1px solid #333;
      }
      
      .git-header-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #888;
      }
      
      .git-icon {
        font-size: 14px;
      }
      
      .git-header-btn {
        background: transparent;
        border: none;
        color: #888;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
      }
      
      .git-header-btn:hover {
        background: rgba(255,255,255,0.1);
        color: #ccc;
      }
      
      /* Empty state */
      .git-empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        gap: 12px;
        color: #888;
      }
      
      .git-empty-icon {
        font-size: 40px;
        opacity: 0.5;
      }
      
      .git-empty-text {
        font-size: 13px;
      }
      
      /* Buttons */
      .git-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: #3c3c3c;
        border: 1px solid #555;
        color: #cccccc;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }
      
      .git-btn:hover {
        background: #4c4c4c;
      }
      
      .git-btn-primary {
        background: #0e639c;
        border-color: #1177bb;
      }
      
      .git-btn-primary:hover {
        background: #1177bb;
      }
      
      /* Branch bar */
      .git-branch-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #2d2d2d;
        cursor: pointer;
        border-bottom: 1px solid #333;
      }
      
      .git-branch-bar:hover {
        background: #333;
      }
      
      .git-chevron-down {
        margin-left: auto;
        opacity: 0.5;
      }
      
      /* Quick actions */
      .git-quick-actions {
        display: flex;
        gap: 4px;
        padding: 8px 12px;
        border-bottom: 1px solid #333;
      }
      
      .git-action-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px;
        background: #2d2d2d;
        border: none;
        border-radius: 4px;
        color: #888;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .git-action-btn:hover {
        background: #3c3c3c;
        color: #ccc;
      }
      
      /* Commit box */
      .git-commit-box {
        padding: 8px 12px;
        border-bottom: 1px solid #333;
      }
      
      .git-commit-input {
        width: 100%;
        padding: 8px 10px;
        background: #3c3c3c;
        border: 1px solid #555;
        border-radius: 4px;
        color: #cccccc;
        font-size: 12px;
        margin-bottom: 8px;
      }
      
      .git-commit-input:focus {
        outline: none;
        border-color: #0e639c;
      }
      
      .git-commit-buttons {
        display: flex;
        gap: 8px;
      }
      
      .git-btn-commit {
        flex: 1;
        justify-content: center;
        background: #0e639c;
        border-color: #1177bb;
      }
      
      .git-btn-commit:hover {
        background: #1177bb;
      }
      
      /* Changes sections */
      .git-changes-section {
        flex: 1;
        overflow-y: auto;
      }
      
      .git-section {
        border-bottom: 1px solid #333;
      }
      
      .git-section-header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        color: #888;
      }
      
      .git-section-header:hover {
        background: rgba(255,255,255,0.03);
      }
      
      .git-section-chevron {
        transition: transform 0.2s;
      }
      
      .git-section-chevron.expanded {
        transform: rotate(90deg);
      }
      
      .git-section-badge {
        background: #4d4d4d;
        padding: 1px 6px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: normal;
      }
      
      .git-section-btn {
        margin-left: auto;
        background: transparent;
        border: none;
        color: #888;
        font-size: 16px;
        cursor: pointer;
        padding: 0 4px;
        border-radius: 3px;
      }
      
      .git-section-btn:hover {
        background: rgba(255,255,255,0.1);
        color: #ccc;
      }
      
      /* File list */
      .git-file-list {
        padding: 0 0 0 20px;
      }
      
      .git-empty-list {
        padding: 8px 12px;
        color: #666;
        font-size: 12px;
      }
      
      .git-file-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 8px;
        cursor: pointer;
        border-radius: 4px;
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
      
      .git-status-modified { color: #d19a66; background: rgba(209,154,102,0.15); }
      .git-status-added { color: #98c379; background: rgba(152,195,121,0.15); }
      .git-status-deleted { color: #e06c75; background: rgba(224,108,117,0.15); }
      .git-status-untracked { color: #61afef; background: rgba(97,175,239,0.15); }
      .git-status-renamed { color: #c678dd; background: rgba(198,120,221,0.15); }
      
      .git-file-name {
        flex: 1;
        font-size: 13px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .git-file-actions {
        display: flex;
        gap: 2px;
        opacity: 0;
        transition: opacity 0.2s;
      }
      
      .git-file-action {
        background: #3c3c3c;
        border: none;
        color: #ccc;
        width: 18px;
        height: 18px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .git-file-action:hover {
        background: #4c4c4c;
      }
      
      .git-file-action-danger:hover {
        background: #5a1d1d;
        color: #f14c4c;
      }
      
      /* Loading */
      .git-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
      }
      
      .git-spinner {
        width: 24px;
        height: 24px;
        border: 2px solid #333;
        border-top-color: #0e639c;
        border-radius: 50%;
        animation: git-spin 0.8s linear infinite;
      }
      
      @keyframes git-spin {
        to { transform: rotate(360deg); }
      }
      
      /* Branch popup */
      .git-branch-popup {
        background: #2d2d2d;
        border: 1px solid #464647;
        border-radius: 6px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        min-width: 200px;
        max-height: 300px;
        overflow: hidden;
      }
      
      .git-branch-popup-header {
        padding: 8px;
        border-bottom: 1px solid #333;
      }
      
      .git-branch-search {
        width: 100%;
        padding: 6px 8px;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        color: #cccccc;
        font-size: 12px;
      }
      
      .git-branch-popup-list {
        max-height: 200px;
        overflow-y: auto;
      }
      
      .git-branch-popup-item {
        padding: 8px 12px;
        cursor: pointer;
        font-size: 13px;
        font-family: monospace;
      }
      
      .git-branch-popup-item:hover {
        background: rgba(255,255,255,0.05);
      }
      
      .git-branch-popup-item.current {
        color: #4ec9b0;
      }
      
      @keyframes slideIn {
        from { transform: translateX(20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}

// ============================================================================
// EXPORT & GLOBAL
// ============================================================================

export const gitTabManager = new GitTabManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => gitTabManager.initialize());
} else {
  // Small delay to ensure tabs are created first
  setTimeout(() => gitTabManager.initialize(), 500);
}

// Export globally
(window as any).gitTabManager = gitTabManager;
