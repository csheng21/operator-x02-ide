// ide/vsc/gitPanelVirtualized.ts
// ============================================================================
// GIT PANEL WITH VIRTUALIZED FILE LIST
// Integrates VirtualizedGitList with existing Git commands
// ============================================================================

import { invoke } from '@tauri-apps/api/core';
import { VirtualizedGitList, GitFileStatus, createVirtualizedGitList } from './virtualizedGitList';
import './virtualizedGitList.css';

// ============================================================================
// TYPES
// ============================================================================

export interface GitPanelConfig {
  repoPath: string;
  autoRefresh?: boolean;
  refreshInterval?: number;  // ms
  showFilter?: boolean;
  collapseSections?: boolean;
}

export interface GitPanelState {
  isLoading: boolean;
  error: string | null;
  branch: string;
  stagedCount: number;
  unstagedCount: number;
  totalCount: number;
}

// ============================================================================
// GIT PANEL CLASS
// ============================================================================

export class GitPanelVirtualized {
  private container: HTMLElement;
  private config: GitPanelConfig;
  private state: GitPanelState;
  
  // UI Elements
  private headerEl: HTMLElement | null = null;
  private filterEl: HTMLInputElement | null = null;
  private stagedSection: HTMLElement | null = null;
  private unstagedSection: HTMLElement | null = null;
  private stagedList: VirtualizedGitList | null = null;
  private unstagedList: VirtualizedGitList | null = null;
  
  // Data
  private allFiles: GitFileStatus[] = [];
  private refreshTimer: number | null = null;
  private isDestroyed: boolean = false;

  constructor(container: HTMLElement, config: GitPanelConfig) {
    this.container = container;
    this.config = {
      autoRefresh: true,
      refreshInterval: 5000,
      showFilter: true,
      collapseSections: false,
      ...config
    };
    
    this.state = {
      isLoading: false,
      error: null,
      branch: 'master',
      stagedCount: 0,
      unstagedCount: 0,
      totalCount: 0
    };
    
    this.initialize();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private async initialize(): Promise<void> {
    this.createDOM();
    this.setupEventListeners();
    await this.refresh();
    
    if (this.config.autoRefresh) {
      this.startAutoRefresh();
    }
    
    console.log('✅ [GitPanelVirtualized] Initialized');
  }

  private createDOM(): void {
    this.container.innerHTML = '';
    this.container.className = 'git-panel-virtualized';
    
    // Header with branch info and actions
    this.headerEl = document.createElement('div');
    this.headerEl.className = 'git-panel-header';
    this.headerEl.innerHTML = this.renderHeader();
    this.container.appendChild(this.headerEl);
    
    // Filter input (optional)
    if (this.config.showFilter) {
      const filterContainer = document.createElement('div');
      filterContainer.className = 'git-filter-container';
      filterContainer.innerHTML = `
        <input type="text" 
               class="git-filter-input" 
               placeholder="Filter files... (e.g., .ts, src/)" 
               spellcheck="false" />
      `;
      this.filterEl = filterContainer.querySelector('.git-filter-input');
      this.container.appendChild(filterContainer);
    }
    
    // Staged changes section
    this.stagedSection = document.createElement('div');
    this.stagedSection.className = 'git-section staged-section';
    this.stagedSection.innerHTML = `
      <div class="git-section-header staged-header">
        <span class="section-title">
          <span class="collapse-icon">▼</span>
          Staged Changes
        </span>
        <span class="count-badge">0</span>
        <div class="section-actions">
          <button class="section-action-btn unstage-all-btn" title="Unstage all">−</button>
        </div>
      </div>
      <div class="git-section-content staged-content"></div>
    `;
    this.container.appendChild(this.stagedSection);
    
    // Unstaged changes section
    this.unstagedSection = document.createElement('div');
    this.unstagedSection.className = 'git-section unstaged-section';
    this.unstagedSection.innerHTML = `
      <div class="git-section-header changes-header">
        <span class="section-title">
          <span class="collapse-icon">▼</span>
          Changes
        </span>
        <span class="count-badge">0</span>
        <div class="section-actions">
          <button class="section-action-btn stage-all-btn" title="Stage all">+</button>
          <button class="section-action-btn discard-all-btn" title="Discard all">⟲</button>
        </div>
      </div>
      <div class="git-section-content unstaged-content"></div>
    `;
    this.container.appendChild(this.unstagedSection);
    
    // Initialize virtualized lists
    const stagedContent = this.stagedSection.querySelector('.staged-content') as HTMLElement;
    const unstagedContent = this.unstagedSection.querySelector('.unstaged-content') as HTMLElement;
    
    this.stagedList = createVirtualizedGitList(stagedContent, {
      itemHeight: 28,
      bufferSize: 5
    });
    
    this.unstagedList = createVirtualizedGitList(unstagedContent, {
      itemHeight: 28,
      bufferSize: 10
    });
    
    // Setup list callbacks
    this.setupListCallbacks();
  }

  private renderHeader(): string {
    return `
      <div class="header-left">
        <span class="branch-icon">⎇</span>
        <span class="branch-name">${this.state.branch}</span>
      </div>
      <div class="header-actions">
        <button class="header-btn refresh-btn" title="Refresh (Ctrl+R)">↻</button>
        <button class="header-btn pull-btn" title="Pull">↓ Pull</button>
        <button class="header-btn push-btn" title="Push">↑ Push</button>
        <button class="header-btn stash-btn" title="Stash">☐ Stash</button>
      </div>
    `;
  }

  private setupEventListeners(): void {
    // Header buttons
    this.headerEl?.querySelector('.refresh-btn')?.addEventListener('click', () => this.refresh());
    this.headerEl?.querySelector('.pull-btn')?.addEventListener('click', () => this.pull());
    this.headerEl?.querySelector('.push-btn')?.addEventListener('click', () => this.push());
    this.headerEl?.querySelector('.stash-btn')?.addEventListener('click', () => this.stash());
    
    // Section actions
    this.stagedSection?.querySelector('.unstage-all-btn')?.addEventListener('click', () => this.unstageAll());
    this.unstagedSection?.querySelector('.stage-all-btn')?.addEventListener('click', () => this.stageAll());
    this.unstagedSection?.querySelector('.discard-all-btn')?.addEventListener('click', () => this.discardAll());
    
    // Section collapse
    this.stagedSection?.querySelector('.section-title')?.addEventListener('click', (e) => {
      this.toggleSection(this.stagedSection!);
    });
    this.unstagedSection?.querySelector('.section-title')?.addEventListener('click', (e) => {
      this.toggleSection(this.unstagedSection!);
    });
    
    // Filter input
    if (this.filterEl) {
      let filterTimeout: number;
      this.filterEl.addEventListener('input', () => {
        clearTimeout(filterTimeout);
        filterTimeout = window.setTimeout(() => {
          const filterText = this.filterEl?.value || '';
          this.stagedList?.setFilter(filterText);
          this.unstagedList?.setFilter(filterText);
        }, 150);
      });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private setupListCallbacks(): void {
    // Staged list callbacks
    this.stagedList?.onFileDoubleClickCallback((file) => this.openFile(file));
    this.stagedList?.onFileContextMenuCallback((file, event) => this.showContextMenu(file, event));
    this.stagedList?.onUnstageFileCallback((file) => this.unstageFile(file.path));
    
    // Unstaged list callbacks
    this.unstagedList?.onFileDoubleClickCallback((file) => this.openFile(file));
    this.unstagedList?.onFileContextMenuCallback((file, event) => this.showContextMenu(file, event));
    this.unstagedList?.onStageFileCallback((file) => this.stageFile(file.path));
    
    // Discard events (bubbled from lists)
    this.container.addEventListener('git-discard', ((e: CustomEvent) => {
      const { file } = e.detail;
      this.discardFile(file.path);
    }) as EventListener);
  }

  private toggleSection(section: HTMLElement): void {
    section.classList.toggle('collapsed');
    const icon = section.querySelector('.collapse-icon');
    if (icon) {
      icon.textContent = section.classList.contains('collapsed') ? '▶' : '▼';
    }
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    // Only handle if panel is visible
    if (!this.container.offsetParent) return;
    
    if (event.ctrlKey && event.key === 'r') {
      event.preventDefault();
      this.refresh();
    }
  };

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  public async refresh(): Promise<void> {
    if (this.state.isLoading || this.isDestroyed) return;
    
    this.state.isLoading = true;
    this.showLoading();
    
    const startTime = performance.now();
    
    try {
      // Get git status from Rust backend
      const files = await invoke<GitFileStatus[]>('git_status', {
        path: this.config.repoPath
      });
      
      const loadTime = performance.now() - startTime;
      console.log(`📂 [GitPanel] Loaded ${files.length} files in ${loadTime.toFixed(0)}ms`);
      
      this.allFiles = files;
      this.updateLists();
      this.updateCounts();
      this.updateBranch();
      this.state.error = null;
      
    } catch (error) {
      console.error('❌ [GitPanel] Failed to load status:', error);
      this.state.error = String(error);
      this.showError(String(error));
    } finally {
      this.state.isLoading = false;
      this.hideLoading();
    }
  }

  private updateLists(): void {
    const staged = this.allFiles.filter(f => f.staged);
    const unstaged = this.allFiles.filter(f => !f.staged);
    
    this.stagedList?.setFiles(staged);
    this.unstagedList?.setFiles(unstaged);
  }

  private updateCounts(): void {
    const staged = this.allFiles.filter(f => f.staged);
    const unstaged = this.allFiles.filter(f => !f.staged);
    
    this.state.stagedCount = staged.length;
    this.state.unstagedCount = unstaged.length;
    this.state.totalCount = this.allFiles.length;
    
    // Update badges
    const stagedBadge = this.stagedSection?.querySelector('.count-badge');
    const unstagedBadge = this.unstagedSection?.querySelector('.count-badge');
    
    if (stagedBadge) stagedBadge.textContent = String(staged.length);
    if (unstagedBadge) unstagedBadge.textContent = String(unstaged.length);
    
    // Show/hide sections based on content
    if (this.stagedSection) {
      this.stagedSection.style.display = staged.length > 0 ? 'block' : 'none';
    }
    
    // Show warning for large file counts
    this.showLargeCountWarning(unstaged.length);
  }

  private async updateBranch(): Promise<void> {
    try {
      const branch = await invoke<string>('git_current_branch', {
        path: this.config.repoPath
      });
      
      this.state.branch = branch;
      
      const branchEl = this.headerEl?.querySelector('.branch-name');
      if (branchEl) branchEl.textContent = branch;
    } catch (error) {
      console.error('Failed to get branch:', error);
    }
  }

  private showLargeCountWarning(count: number): void {
    const existingWarning = this.container.querySelector('.git-large-count-warning');
    
    if (count > 1000) {
      if (!existingWarning) {
        const warning = document.createElement('div');
        warning.className = 'git-large-count-warning';
        warning.innerHTML = `
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-2h-2v2zm0-4h2V7h-2v6z"/>
          </svg>
          <span>${count.toLocaleString()} files - Using virtual scrolling for performance</span>
        `;
        this.unstagedSection?.querySelector('.git-section-header')?.after(warning);
      }
    } else {
      existingWarning?.remove();
    }
  }

  private showLoading(): void {
    const spinner = document.createElement('div');
    spinner.className = 'git-loading';
    spinner.innerHTML = `
      <div class="git-loading-spinner"></div>
      <span>Loading changes...</span>
    `;
    // Show inline loading indicator
    this.headerEl?.querySelector('.refresh-btn')?.classList.add('loading');
  }

  private hideLoading(): void {
    this.headerEl?.querySelector('.refresh-btn')?.classList.remove('loading');
  }

  private showError(message: string): void {
    const errorEl = document.createElement('div');
    errorEl.className = 'git-error';
    errorEl.innerHTML = `
      <span class="error-icon">⚠️</span>
      <span class="error-message">${message}</span>
      <button class="error-retry-btn">Retry</button>
    `;
    errorEl.querySelector('.error-retry-btn')?.addEventListener('click', () => {
      errorEl.remove();
      this.refresh();
    });
    
    // Insert after header
    this.headerEl?.after(errorEl);
  }

  // ============================================================================
  // GIT OPERATIONS
  // ============================================================================

  private async stageFile(path: string): Promise<void> {
    try {
      await invoke('git_stage', {
        path: this.config.repoPath,
        files: [path]
      });
      
      // Update local state immediately for responsiveness
      const file = this.allFiles.find(f => f.path === path);
      if (file) {
        file.staged = true;
        this.updateLists();
        this.updateCounts();
      }
      
      console.log(`✅ Staged: ${path}`);
    } catch (error) {
      console.error('Failed to stage file:', error);
      this.showNotification(`Failed to stage ${path}`, 'error');
    }
  }

  private async unstageFile(path: string): Promise<void> {
    try {
      await invoke('git_unstage', {
        path: this.config.repoPath,
        files: [path]
      });
      
      const file = this.allFiles.find(f => f.path === path);
      if (file) {
        file.staged = false;
        this.updateLists();
        this.updateCounts();
      }
      
      console.log(`✅ Unstaged: ${path}`);
    } catch (error) {
      console.error('Failed to unstage file:', error);
      this.showNotification(`Failed to unstage ${path}`, 'error');
    }
  }

  private async discardFile(path: string): Promise<void> {
    try {
      await invoke('git_discard', {
        path: this.config.repoPath,
        files: [path]
      });
      
      // Remove from local state
      this.allFiles = this.allFiles.filter(f => f.path !== path);
      this.updateLists();
      this.updateCounts();
      
      console.log(`✅ Discarded: ${path}`);
    } catch (error) {
      console.error('Failed to discard file:', error);
      this.showNotification(`Failed to discard ${path}`, 'error');
    }
  }

  private async stageAll(): Promise<void> {
    const unstaged = this.allFiles.filter(f => !f.staged);
    if (unstaged.length === 0) return;
    
    try {
      await invoke('git_stage', {
        path: this.config.repoPath,
        files: unstaged.map(f => f.path)
      });
      
      // Update local state
      unstaged.forEach(f => f.staged = true);
      this.updateLists();
      this.updateCounts();
      
      console.log(`✅ Staged ${unstaged.length} files`);
    } catch (error) {
      console.error('Failed to stage all:', error);
      this.showNotification('Failed to stage all files', 'error');
    }
  }

  private async unstageAll(): Promise<void> {
    const staged = this.allFiles.filter(f => f.staged);
    if (staged.length === 0) return;
    
    try {
      await invoke('git_unstage', {
        path: this.config.repoPath,
        files: staged.map(f => f.path)
      });
      
      staged.forEach(f => f.staged = false);
      this.updateLists();
      this.updateCounts();
      
      console.log(`✅ Unstaged ${staged.length} files`);
    } catch (error) {
      console.error('Failed to unstage all:', error);
      this.showNotification('Failed to unstage all files', 'error');
    }
  }

  private async discardAll(): Promise<void> {
    const unstaged = this.allFiles.filter(f => !f.staged);
    if (unstaged.length === 0) return;
    
    const confirmed = confirm(
      `Discard ALL ${unstaged.length} changes?\n\nThis action cannot be undone!`
    );
    if (!confirmed) return;
    
    try {
      await invoke('git_discard', {
        path: this.config.repoPath,
        files: unstaged.map(f => f.path)
      });
      
      this.allFiles = this.allFiles.filter(f => f.staged);
      this.updateLists();
      this.updateCounts();
      
      console.log(`✅ Discarded ${unstaged.length} files`);
    } catch (error) {
      console.error('Failed to discard all:', error);
      this.showNotification('Failed to discard all files', 'error');
    }
  }

  private async pull(): Promise<void> {
    try {
      this.showNotification('Pulling...', 'info');
      const result = await invoke<string>('git_pull', {
        path: this.config.repoPath
      });
      this.showNotification('Pull complete', 'success');
      await this.refresh();
    } catch (error) {
      console.error('Pull failed:', error);
      this.showNotification(`Pull failed: ${error}`, 'error');
    }
  }

  private async push(): Promise<void> {
    try {
      this.showNotification('Pushing...', 'info');
      const result = await invoke<string>('git_push', {
        path: this.config.repoPath
      });
      this.showNotification('Push complete', 'success');
    } catch (error) {
      console.error('Push failed:', error);
      this.showNotification(`Push failed: ${error}`, 'error');
    }
  }

  private async stash(): Promise<void> {
    try {
      const result = await invoke<string>('git_stash', {
        path: this.config.repoPath
      });
      this.showNotification('Changes stashed', 'success');
      await this.refresh();
    } catch (error) {
      console.error('Stash failed:', error);
      this.showNotification(`Stash failed: ${error}`, 'error');
    }
  }

  private openFile(file: GitFileStatus): void {
    // Dispatch event for IDE to handle
    this.container.dispatchEvent(new CustomEvent('git-open-file', {
      detail: { path: file.path, status: file.status },
      bubbles: true
    }));
  }

  private showContextMenu(file: GitFileStatus, event: MouseEvent): void {
    // Dispatch event for context menu handler
    this.container.dispatchEvent(new CustomEvent('git-context-menu', {
      detail: { file, x: event.clientX, y: event.clientY },
      bubbles: true
    }));
  }

  private showNotification(message: string, type: 'info' | 'success' | 'error'): void {
    // Simple notification - integrate with your notification system
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // You can dispatch event for your notification system
    this.container.dispatchEvent(new CustomEvent('git-notification', {
      detail: { message, type },
      bubbles: true
    }));
  }

  // ============================================================================
  // AUTO REFRESH
  // ============================================================================

  private startAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    
    this.refreshTimer = window.setInterval(() => {
      // Only refresh if not currently loading and panel is visible
      if (!this.state.isLoading && this.container.offsetParent) {
        this.refresh();
      }
    }, this.config.refreshInterval);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  public getState(): GitPanelState {
    return { ...this.state };
  }

  public getSelectedFiles(): GitFileStatus[] {
    const staged = this.stagedList?.getSelectedFiles() || [];
    const unstaged = this.unstagedList?.getSelectedFiles() || [];
    return [...staged, ...unstaged];
  }

  public setRepoPath(path: string): void {
    this.config.repoPath = path;
    this.refresh();
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  public destroy(): void {
    this.isDestroyed = true;
    this.stopAutoRefresh();
    
    document.removeEventListener('keydown', this.handleKeyDown);
    
    this.stagedList?.destroy();
    this.unstagedList?.destroy();
    
    this.container.innerHTML = '';
    console.log('🗑️ [GitPanelVirtualized] Destroyed');
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createGitPanel(
  container: HTMLElement,
  config: GitPanelConfig
): GitPanelVirtualized {
  return new GitPanelVirtualized(container, config);
}

export default GitPanelVirtualized;
