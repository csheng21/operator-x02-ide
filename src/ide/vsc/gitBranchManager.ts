// ide/vsc/gitBranchManager.ts
// ============================================================================
// GIT BRANCH MANAGER - Branch switching, creation, and management UI
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPES
// ============================================================================

export interface GitBranch {
  name: string;
  is_current: boolean;
  is_remote: boolean;
  tracking?: string;
  ahead: number;
  behind: number;
  last_commit?: string;
  last_commit_date?: string;
}

export interface BranchManagerConfig {
  repoPath: string;
  onBranchSwitch?: (branch: string) => void;
  onBranchCreate?: (branch: string) => void;
  onBranchDelete?: (branch: string) => void;
}

// ============================================================================
// GIT BRANCH MANAGER CLASS
// ============================================================================

export class GitBranchManager {
  private dialog: HTMLElement | null = null;
  private config: BranchManagerConfig | null = null;
  private branches: GitBranch[] = [];
  private currentBranch: string = '';
  private filterText: string = '';
  private showRemotes: boolean = true;
  private isLoading: boolean = false;
  
  constructor() {
    this.injectStyles();
  }
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  /**
   * Open the branch manager dialog
   */
  public async show(config: BranchManagerConfig): Promise<void> {
    this.config = config;
    await this.loadBranches();
    this.render();
  }
  
  /**
   * Close the dialog
   */
  public close(): void {
    if (this.dialog) {
      this.dialog.remove();
      this.dialog = null;
    }
  }
  
  /**
   * Refresh branch list
   */
  public async refresh(): Promise<void> {
    await this.loadBranches();
    this.renderBranchList();
  }
  
  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  private async loadBranches(): Promise<void> {
    if (!this.config) return;
    
    this.isLoading = true;
    
    try {
      // Get branches
      this.branches = await invoke<GitBranch[]>('git_branches', {
        path: this.config.repoPath
      });
      
      // Get current branch
      this.currentBranch = await invoke<string>('git_current_branch', {
        path: this.config.repoPath
      });
      
      // Mark current branch
      this.branches = this.branches.map(b => ({
        ...b,
        is_current: b.name === this.currentBranch
      }));
      
    } catch (error) {
      console.error('Failed to load branches:', error);
    } finally {
      this.isLoading = false;
    }
  }
  
  // ============================================================================
  // RENDERING
  // ============================================================================
  
  private render(): void {
    this.close();
    
    this.dialog = document.createElement('div');
    this.dialog.className = 'git-branch-dialog';
    this.dialog.innerHTML = `
      <div class="branch-dialog-backdrop"></div>
      <div class="branch-dialog-container">
        <div class="branch-dialog-header">
          <h2 class="branch-dialog-title">
            <span class="branch-icon">⎇</span>
            Branches
          </h2>
          <button class="branch-close-btn" title="Close (Esc)">✕</button>
        </div>
        
        <div class="branch-dialog-toolbar">
          <div class="branch-search">
            <input type="text" 
                   class="branch-search-input" 
                   placeholder="Search branches..."
                   spellcheck="false" />
          </div>
          <div class="branch-toolbar-actions">
            <label class="toggle-remotes">
              <input type="checkbox" ${this.showRemotes ? 'checked' : ''} />
              <span>Show remotes</span>
            </label>
            <button class="toolbar-btn fetch-btn" title="Fetch all remotes">
              ↓ Fetch
            </button>
            <button class="toolbar-btn create-btn" title="Create new branch">
              + New Branch
            </button>
          </div>
        </div>
        
        <div class="branch-dialog-content">
          <div class="branch-list-container">
            ${this.isLoading ? this.renderLoading() : ''}
          </div>
        </div>
        
        <div class="branch-dialog-footer">
          <div class="current-branch-info">
            <span class="label">Current:</span>
            <span class="current-branch-name">${this.currentBranch}</span>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.dialog);
    this.attachEventListeners();
    this.renderBranchList();
    
    // Focus search input
    const searchInput = this.dialog.querySelector('.branch-search-input') as HTMLInputElement;
    searchInput?.focus();
  }
  
  private renderBranchList(): void {
    const container = this.dialog?.querySelector('.branch-list-container');
    if (!container) return;
    
    // Filter branches
    let filteredBranches = this.branches;
    
    if (this.filterText) {
      const filter = this.filterText.toLowerCase();
      filteredBranches = filteredBranches.filter(b => 
        b.name.toLowerCase().includes(filter)
      );
    }
    
    if (!this.showRemotes) {
      filteredBranches = filteredBranches.filter(b => !b.is_remote);
    }
    
    // Group branches
    const localBranches = filteredBranches.filter(b => !b.is_remote);
    const remoteBranches = filteredBranches.filter(b => b.is_remote);
    
    let html = '';
    
    // Local branches section
    if (localBranches.length > 0) {
      html += `
        <div class="branch-section">
          <div class="branch-section-header">
            <span class="section-icon">🖥️</span>
            <span class="section-title">Local Branches</span>
            <span class="section-count">${localBranches.length}</span>
          </div>
          <div class="branch-section-content">
            ${localBranches.map(b => this.renderBranchItem(b)).join('')}
          </div>
        </div>
      `;
    }
    
    // Remote branches section
    if (this.showRemotes && remoteBranches.length > 0) {
      // Group by remote
      const remoteGroups = new Map<string, GitBranch[]>();
      
      for (const branch of remoteBranches) {
        const remoteName = branch.name.split('/')[0] || 'origin';
        if (!remoteGroups.has(remoteName)) {
          remoteGroups.set(remoteName, []);
        }
        remoteGroups.get(remoteName)!.push(branch);
      }
      
      for (const [remoteName, branches] of remoteGroups) {
        html += `
          <div class="branch-section remote-section">
            <div class="branch-section-header">
              <span class="section-icon">☁️</span>
              <span class="section-title">${remoteName}</span>
              <span class="section-count">${branches.length}</span>
            </div>
            <div class="branch-section-content">
              ${branches.map(b => this.renderBranchItem(b)).join('')}
            </div>
          </div>
        `;
      }
    }
    
    if (filteredBranches.length === 0) {
      html = `
        <div class="no-branches">
          <span class="empty-icon">🔍</span>
          <span>No branches found</span>
        </div>
      `;
    }
    
    container.innerHTML = html;
    this.attachBranchItemListeners();
  }
  
  private renderBranchItem(branch: GitBranch): string {
    const isCurrent = branch.is_current;
    const hasTracking = branch.tracking && (branch.ahead > 0 || branch.behind > 0);
    
    return `
      <div class="branch-item ${isCurrent ? 'current' : ''} ${branch.is_remote ? 'remote' : ''}"
           data-branch="${this.escapeAttr(branch.name)}"
           data-is-remote="${branch.is_remote}">
        <div class="branch-item-main">
          <span class="branch-item-icon">
            ${isCurrent ? '●' : branch.is_remote ? '☁' : '○'}
          </span>
          <span class="branch-item-name">${this.escapeHtml(branch.name)}</span>
          ${hasTracking ? `
            <span class="branch-tracking">
              ${branch.ahead > 0 ? `<span class="ahead">↑${branch.ahead}</span>` : ''}
              ${branch.behind > 0 ? `<span class="behind">↓${branch.behind}</span>` : ''}
            </span>
          ` : ''}
        </div>
        <div class="branch-item-actions">
          ${!branch.is_remote ? `
            ${!isCurrent ? `
              <button class="branch-action-btn checkout-btn" title="Checkout branch">
                ⎇
              </button>
            ` : ''}
            <button class="branch-action-btn merge-btn" title="Merge into current">
              ⤵
            </button>
            ${!isCurrent ? `
              <button class="branch-action-btn delete-btn" title="Delete branch">
                🗑
              </button>
            ` : ''}
          ` : `
            <button class="branch-action-btn checkout-remote-btn" title="Checkout as local branch">
              ⎇
            </button>
          `}
        </div>
      </div>
    `;
  }
  
  private renderLoading(): string {
    return `
      <div class="branch-loading">
        <div class="loading-spinner"></div>
        <span>Loading branches...</span>
      </div>
    `;
  }
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  private attachEventListeners(): void {
    if (!this.dialog) return;
    
    // Close button
    this.dialog.querySelector('.branch-close-btn')?.addEventListener('click', () => this.close());
    
    // Backdrop
    this.dialog.querySelector('.branch-dialog-backdrop')?.addEventListener('click', () => this.close());
    
    // Search input
    const searchInput = this.dialog.querySelector('.branch-search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.filterText = (e.target as HTMLInputElement).value;
      this.renderBranchList();
    });
    
    // Show remotes toggle
    this.dialog.querySelector('.toggle-remotes input')?.addEventListener('change', (e) => {
      this.showRemotes = (e.target as HTMLInputElement).checked;
      this.renderBranchList();
    });
    
    // Fetch button
    this.dialog.querySelector('.fetch-btn')?.addEventListener('click', () => this.fetchAll());
    
    // Create button
    this.dialog.querySelector('.create-btn')?.addEventListener('click', () => this.showCreateBranchDialog());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyDown);
  }
  
  private attachBranchItemListeners(): void {
    if (!this.dialog) return;
    
    // Double-click to checkout
    this.dialog.querySelectorAll('.branch-item').forEach(item => {
      item.addEventListener('dblclick', () => {
        const branchName = (item as HTMLElement).dataset.branch;
        const isRemote = (item as HTMLElement).dataset.isRemote === 'true';
        
        if (branchName) {
          if (isRemote) {
            this.checkoutRemoteBranch(branchName);
          } else {
            this.checkoutBranch(branchName);
          }
        }
      });
    });
    
    // Action buttons
    this.dialog.querySelectorAll('.checkout-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = (e.target as HTMLElement).closest('.branch-item');
        const branchName = (item as HTMLElement)?.dataset.branch;
        if (branchName) this.checkoutBranch(branchName);
      });
    });
    
    this.dialog.querySelectorAll('.checkout-remote-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = (e.target as HTMLElement).closest('.branch-item');
        const branchName = (item as HTMLElement)?.dataset.branch;
        if (branchName) this.checkoutRemoteBranch(branchName);
      });
    });
    
    this.dialog.querySelectorAll('.merge-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = (e.target as HTMLElement).closest('.branch-item');
        const branchName = (item as HTMLElement)?.dataset.branch;
        if (branchName) this.mergeBranch(branchName);
      });
    });
    
    this.dialog.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = (e.target as HTMLElement).closest('.branch-item');
        const branchName = (item as HTMLElement)?.dataset.branch;
        if (branchName) this.deleteBranch(branchName);
      });
    });
  }
  
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.dialog) return;
    
    if (e.key === 'Escape') {
      this.close();
    }
  };
  
  // ============================================================================
  // BRANCH OPERATIONS
  // ============================================================================
  
  private async checkoutBranch(branchName: string): Promise<void> {
    if (!this.config) return;
    
    try {
      await invoke('git_checkout', {
        path: this.config.repoPath,
        branch: branchName
      });
      
      this.currentBranch = branchName;
      this.config.onBranchSwitch?.(branchName);
      await this.refresh();
      
      this.showNotification(`Switched to branch '${branchName}'`, 'success');
    } catch (error) {
      console.error('Failed to checkout branch:', error);
      this.showNotification(`Failed to checkout: ${error}`, 'error');
    }
  }
  
  private async checkoutRemoteBranch(remoteBranch: string): Promise<void> {
    if (!this.config) return;
    
    // Extract local branch name from remote (e.g., "origin/feature" -> "feature")
    const parts = remoteBranch.split('/');
    const localName = parts.slice(1).join('/');
    
    // Check if local branch already exists
    const existingLocal = this.branches.find(b => !b.is_remote && b.name === localName);
    
    if (existingLocal) {
      // Just checkout existing local branch
      await this.checkoutBranch(localName);
    } else {
      // Create and checkout tracking branch
      try {
        await invoke('git_checkout', {
          path: this.config.repoPath,
          branch: localName,
          createFrom: remoteBranch
        });
        
        this.currentBranch = localName;
        this.config.onBranchSwitch?.(localName);
        await this.refresh();
        
        this.showNotification(`Created and switched to '${localName}'`, 'success');
      } catch (error) {
        console.error('Failed to checkout remote branch:', error);
        this.showNotification(`Failed: ${error}`, 'error');
      }
    }
  }
  
  private async mergeBranch(branchName: string): Promise<void> {
    if (!this.config) return;
    
    const confirmed = confirm(`Merge '${branchName}' into '${this.currentBranch}'?`);
    if (!confirmed) return;
    
    try {
      await invoke('git_merge', {
        path: this.config.repoPath,
        branch: branchName
      });
      
      await this.refresh();
      this.showNotification(`Merged '${branchName}' into '${this.currentBranch}'`, 'success');
    } catch (error) {
      console.error('Failed to merge branch:', error);
      this.showNotification(`Merge failed: ${error}`, 'error');
    }
  }
  
  private async deleteBranch(branchName: string): Promise<void> {
    if (!this.config) return;
    
    const confirmed = confirm(`Delete branch '${branchName}'?\n\nThis cannot be undone.`);
    if (!confirmed) return;
    
    try {
      await invoke('git_branch_delete', {
        path: this.config.repoPath,
        name: branchName,
        force: false
      });
      
      this.config.onBranchDelete?.(branchName);
      await this.refresh();
      
      this.showNotification(`Deleted branch '${branchName}'`, 'success');
    } catch (error: any) {
      // If branch is not fully merged, ask about force delete
      if (error.toString().includes('not fully merged')) {
        const forceDelete = confirm(
          `Branch '${branchName}' is not fully merged.\n\nForce delete anyway?`
        );
        
        if (forceDelete) {
          try {
            await invoke('git_branch_delete', {
              path: this.config.repoPath,
              name: branchName,
              force: true
            });
            
            this.config.onBranchDelete?.(branchName);
            await this.refresh();
            
            this.showNotification(`Force deleted branch '${branchName}'`, 'success');
          } catch (e) {
            this.showNotification(`Failed: ${e}`, 'error');
          }
        }
      } else {
        this.showNotification(`Failed: ${error}`, 'error');
      }
    }
  }
  
  private async fetchAll(): Promise<void> {
    if (!this.config) return;
    
    this.showNotification('Fetching...', 'info');
    
    try {
      await invoke('git_fetch', {
        path: this.config.repoPath,
        all: true
      });
      
      await this.refresh();
      this.showNotification('Fetch complete', 'success');
    } catch (error) {
      console.error('Failed to fetch:', error);
      this.showNotification(`Fetch failed: ${error}`, 'error');
    }
  }
  
  private showCreateBranchDialog(): void {
    const branchName = prompt('Enter new branch name:');
    if (!branchName || !branchName.trim()) return;
    
    this.createBranch(branchName.trim());
  }
  
  private async createBranch(name: string): Promise<void> {
    if (!this.config) return;
    
    try {
      await invoke('git_branch_create', {
        path: this.config.repoPath,
        name: name,
        checkout: true
      });
      
      this.currentBranch = name;
      this.config.onBranchCreate?.(name);
      this.config.onBranchSwitch?.(name);
      await this.refresh();
      
      this.showNotification(`Created and switched to '${name}'`, 'success');
    } catch (error) {
      console.error('Failed to create branch:', error);
      this.showNotification(`Failed: ${error}`, 'error');
    }
  }
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
  private showNotification(message: string, type: 'info' | 'success' | 'error'): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Update footer with status
    const footer = this.dialog?.querySelector('.branch-dialog-footer');
    if (footer) {
      const statusEl = footer.querySelector('.status-message') || document.createElement('span');
      statusEl.className = `status-message ${type}`;
      statusEl.textContent = message;
      
      if (!footer.querySelector('.status-message')) {
        footer.appendChild(statusEl);
      }
      
      // Auto-hide after 3 seconds
      setTimeout(() => statusEl.remove(), 3000);
    }
  }
  
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  private escapeAttr(text: string): string {
    return text.replace(/"/g, '&quot;');
  }
  
  private injectStyles(): void {
    if (document.getElementById('git-branch-manager-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'git-branch-manager-styles';
    style.textContent = `
      .git-branch-dialog {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .branch-dialog-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(2px);
      }
      
      .branch-dialog-container {
        position: relative;
        width: 600px;
        max-width: 90vw;
        max-height: 80vh;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      }
      
      .branch-dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid #3c3c3c;
      }
      
      .branch-dialog-title {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #e0e0e0;
      }
      
      .branch-icon {
        font-size: 20px;
        color: #007acc;
      }
      
      .branch-close-btn {
        width: 28px;
        height: 28px;
        border: none;
        background: transparent;
        color: #808080;
        font-size: 16px;
        cursor: pointer;
        border-radius: 4px;
      }
      
      .branch-close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      
      .branch-dialog-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid #3c3c3c;
        background: #252526;
        gap: 12px;
      }
      
      .branch-search {
        flex: 1;
      }
      
      .branch-search-input {
        width: 100%;
        padding: 8px 12px;
        background: #3c3c3c;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 13px;
        outline: none;
      }
      
      .branch-search-input:focus {
        border-color: #007acc;
      }
      
      .branch-toolbar-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .toggle-remotes {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #808080;
        font-size: 12px;
        cursor: pointer;
      }
      
      .toggle-remotes:hover {
        color: #e0e0e0;
      }
      
      .toolbar-btn {
        padding: 6px 12px;
        background: #3c3c3c;
        border: 1px solid #505050;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 12px;
        cursor: pointer;
        white-space: nowrap;
      }
      
      .toolbar-btn:hover {
        background: #505050;
      }
      
      .create-btn {
        background: #007acc;
        border-color: #007acc;
      }
      
      .create-btn:hover {
        background: #0098ff;
      }
      
      .branch-dialog-content {
        flex: 1;
        overflow-y: auto;
        min-height: 200px;
        max-height: 400px;
      }
      
      .branch-section {
        margin-bottom: 8px;
      }
      
      .branch-section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: #252526;
        color: #808080;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        position: sticky;
        top: 0;
        z-index: 5;
      }
      
      .section-count {
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 10px;
      }
      
      .branch-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        cursor: pointer;
        border-bottom: 1px solid #2d2d30;
      }
      
      .branch-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      .branch-item.current {
        background: rgba(0, 122, 204, 0.15);
        border-left: 3px solid #007acc;
      }
      
      .branch-item-main {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
        min-width: 0;
      }
      
      .branch-item-icon {
        color: #808080;
        width: 16px;
        text-align: center;
      }
      
      .branch-item.current .branch-item-icon {
        color: #007acc;
      }
      
      .branch-item-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #e0e0e0;
        font-size: 13px;
      }
      
      .branch-item.remote .branch-item-name {
        color: #9cdcfe;
      }
      
      .branch-tracking {
        display: flex;
        gap: 6px;
        font-size: 11px;
        font-family: monospace;
      }
      
      .branch-tracking .ahead {
        color: #4bb45f;
      }
      
      .branch-tracking .behind {
        color: #e3b341;
      }
      
      .branch-item-actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.15s ease;
      }
      
      .branch-item:hover .branch-item-actions {
        opacity: 1;
      }
      
      .branch-action-btn {
        width: 26px;
        height: 26px;
        border: none;
        background: transparent;
        color: #808080;
        font-size: 12px;
        cursor: pointer;
        border-radius: 4px;
      }
      
      .branch-action-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #e0e0e0;
      }
      
      .delete-btn:hover {
        background: rgba(220, 80, 80, 0.2);
        color: #dc5050;
      }
      
      .branch-dialog-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-top: 1px solid #3c3c3c;
        background: #252526;
      }
      
      .current-branch-info {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
      }
      
      .current-branch-info .label {
        color: #808080;
      }
      
      .current-branch-name {
        color: #007acc;
        font-weight: 600;
      }
      
      .status-message {
        font-size: 12px;
        padding: 4px 10px;
        border-radius: 4px;
      }
      
      .status-message.success {
        background: rgba(75, 180, 95, 0.2);
        color: #4bb45f;
      }
      
      .status-message.error {
        background: rgba(220, 80, 80, 0.2);
        color: #dc5050;
      }
      
      .status-message.info {
        background: rgba(0, 122, 204, 0.2);
        color: #007acc;
      }
      
      .no-branches, .branch-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        color: #808080;
        gap: 12px;
      }
      
      .empty-icon {
        font-size: 32px;
        opacity: 0.5;
      }
      
      .loading-spinner {
        width: 24px;
        height: 24px;
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-top-color: #007acc;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    
    document.head.appendChild(style);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const gitBranchManager = new GitBranchManager();

export default gitBranchManager;
