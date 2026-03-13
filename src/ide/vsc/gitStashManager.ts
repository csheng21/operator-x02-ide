// ide/vsc/gitStashManager.ts
// ============================================================================
// GIT STASH MANAGEMENT UI - Save, view, apply, and manage stashes
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPES
// ============================================================================

export interface GitStash {
  index: number;
  ref: string;
  message: string;
  branch: string;
  date: string;
  relativeDate: string;
  filesChanged?: number;
}

export interface StashManagerConfig {
  repoPath: string;
  onStashApply?: (stash: GitStash) => void;
  onStashDrop?: (stash: GitStash) => void;
  onStashCreate?: (message: string) => void;
}

// ============================================================================
// GIT STASH MANAGER CLASS
// ============================================================================

export class GitStashManager {
  private dialog: HTMLElement | null = null;
  private config: StashManagerConfig | null = null;
  private stashes: GitStash[] = [];
  private selectedStash: GitStash | null = null;
  private isLoading: boolean = false;
  
  constructor() {
    this.injectStyles();
  }
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  /**
   * Show stash manager dialog
   */
  public async show(config: StashManagerConfig): Promise<void> {
    this.config = config;
    await this.loadStashes();
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
    document.removeEventListener('keydown', this.handleKeyDown);
  }
  
  /**
   * Quick stash (stash all changes with auto message)
   */
  public async quickStash(repoPath: string, message?: string): Promise<void> {
    try {
      await invoke('git_stash_save', {
        path: repoPath,
        message: message || `WIP on ${new Date().toLocaleString()}`,
        includeUntracked: true
      });
      
      console.log('✅ Changes stashed');
      this.dispatchEvent('git-stash-created');
    } catch (error) {
      console.error('Failed to stash:', error);
      throw error;
    }
  }
  
  /**
   * Quick pop (apply and drop latest stash)
   */
  public async quickPop(repoPath: string): Promise<void> {
    try {
      await invoke('git_stash_pop', {
        path: repoPath,
        index: 0
      });
      
      console.log('✅ Stash popped');
      this.dispatchEvent('git-stash-applied');
    } catch (error) {
      console.error('Failed to pop stash:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  private async loadStashes(): Promise<void> {
    if (!this.config) return;
    
    this.isLoading = true;
    
    try {
      this.stashes = await invoke<GitStash[]>('git_stash_list_detailed', {
        path: this.config.repoPath
      });
    } catch (error) {
      console.error('Failed to load stashes:', error);
      this.stashes = [];
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
    this.dialog.className = 'git-stash-dialog';
    this.dialog.innerHTML = `
      <div class="stash-dialog-backdrop"></div>
      <div class="stash-dialog-container">
        <div class="stash-dialog-header">
          <div class="header-left">
            <span class="stash-icon">📦</span>
            <h2 class="stash-title">Stashes</h2>
            <span class="stash-count">${this.stashes.length} stash${this.stashes.length !== 1 ? 'es' : ''}</span>
          </div>
          <div class="header-actions">
            <button class="header-btn create-stash-btn" title="Create new stash">
              + Stash Changes
            </button>
            <button class="stash-close-btn" title="Close (Esc)">✕</button>
          </div>
        </div>
        
        <div class="stash-dialog-content">
          <div class="stash-list-panel">
            ${this.renderStashList()}
          </div>
          
          <div class="stash-detail-panel">
            ${this.selectedStash 
              ? this.renderStashDetails(this.selectedStash)
              : this.renderPlaceholder()
            }
          </div>
        </div>
        
        <div class="stash-dialog-footer">
          <div class="footer-info">
            <span class="info-icon">💡</span>
            <span class="info-text">Stashes save your uncommitted changes for later use</span>
          </div>
          <div class="footer-actions">
            <button class="footer-btn clear-all-btn ${this.stashes.length === 0 ? 'disabled' : ''}"
                    ${this.stashes.length === 0 ? 'disabled' : ''}>
              Clear All Stashes
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.dialog);
    this.attachEventListeners();
  }
  
  private renderStashList(): string {
    if (this.isLoading) {
      return `
        <div class="stash-loading">
          <div class="loading-spinner"></div>
          <span>Loading stashes...</span>
        </div>
      `;
    }
    
    if (this.stashes.length === 0) {
      return `
        <div class="no-stashes">
          <span class="empty-icon">📭</span>
          <span class="empty-text">No stashes</span>
          <span class="empty-hint">Use "Stash Changes" to save your work</span>
        </div>
      `;
    }
    
    return `
      <div class="stash-list">
        ${this.stashes.map(stash => this.renderStashItem(stash)).join('')}
      </div>
    `;
  }
  
  private renderStashItem(stash: GitStash): string {
    const isSelected = this.selectedStash?.index === stash.index;
    
    return `
      <div class="stash-item ${isSelected ? 'selected' : ''}" data-index="${stash.index}">
        <div class="stash-item-main">
          <div class="stash-item-header">
            <span class="stash-ref">${stash.ref}</span>
            <span class="stash-branch" title="Stashed on branch: ${stash.branch}">
              ⎇ ${this.escapeHtml(stash.branch)}
            </span>
          </div>
          <div class="stash-message">${this.escapeHtml(stash.message)}</div>
          <div class="stash-meta">
            <span class="stash-date" title="${stash.date}">${stash.relativeDate}</span>
            ${stash.filesChanged !== undefined ? `
              <span class="stash-files">${stash.filesChanged} file${stash.filesChanged !== 1 ? 's' : ''}</span>
            ` : ''}
          </div>
        </div>
        <div class="stash-item-actions">
          <button class="stash-action-btn apply-btn" data-index="${stash.index}" title="Apply stash">
            ↩ Apply
          </button>
          <button class="stash-action-btn pop-btn" data-index="${stash.index}" title="Apply and delete">
            ⤵ Pop
          </button>
          <button class="stash-action-btn drop-btn" data-index="${stash.index}" title="Delete stash">
            🗑
          </button>
        </div>
      </div>
    `;
  }
  
  private renderStashDetails(stash: GitStash): string {
    return `
      <div class="stash-details">
        <div class="details-header">
          <h3 class="details-title">${stash.ref}</h3>
          <span class="details-date">${stash.date}</span>
        </div>
        
        <div class="details-section">
          <div class="detail-row">
            <span class="detail-label">Message:</span>
            <span class="detail-value">${this.escapeHtml(stash.message)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Branch:</span>
            <span class="detail-value">${this.escapeHtml(stash.branch)}</span>
          </div>
        </div>
        
        <div class="details-section">
          <div class="section-title">Changed Files</div>
          <div class="stash-files-list" data-stash-index="${stash.index}">
            <div class="loading-files">Loading files...</div>
          </div>
        </div>
        
        <div class="details-actions">
          <button class="detail-btn apply-stash-btn" data-index="${stash.index}">
            ↩ Apply
          </button>
          <button class="detail-btn pop-stash-btn" data-index="${stash.index}">
            ⤵ Pop (Apply & Delete)
          </button>
          <button class="detail-btn branch-stash-btn" data-index="${stash.index}">
            ⎇ Create Branch
          </button>
          <button class="detail-btn drop-stash-btn danger" data-index="${stash.index}">
            🗑 Drop
          </button>
        </div>
      </div>
    `;
  }
  
  private renderPlaceholder(): string {
    return `
      <div class="details-placeholder">
        <span class="placeholder-icon">👆</span>
        <span>Select a stash to view details</span>
      </div>
    `;
  }
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  private attachEventListeners(): void {
    if (!this.dialog) return;
    
    // Close handlers
    this.dialog.querySelector('.stash-close-btn')?.addEventListener('click', () => this.close());
    this.dialog.querySelector('.stash-dialog-backdrop')?.addEventListener('click', () => this.close());
    
    // Create stash
    this.dialog.querySelector('.create-stash-btn')?.addEventListener('click', () => this.showCreateStashDialog());
    
    // Clear all
    this.dialog.querySelector('.clear-all-btn')?.addEventListener('click', () => this.clearAllStashes());
    
    // Stash item selection
    this.dialog.querySelectorAll('.stash-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking action buttons
        if ((e.target as HTMLElement).closest('.stash-action-btn')) return;
        
        const index = parseInt((item as HTMLElement).dataset.index || '0', 10);
        this.selectStash(index);
      });
    });
    
    // Action buttons in list
    this.dialog.querySelectorAll('.apply-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        this.applyStash(index, false);
      });
    });
    
    this.dialog.querySelectorAll('.pop-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        this.applyStash(index, true);
      });
    });
    
    this.dialog.querySelectorAll('.drop-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        this.dropStash(index);
      });
    });
    
    // Keyboard
    document.addEventListener('keydown', this.handleKeyDown);
  }
  
  private attachDetailListeners(): void {
    if (!this.dialog) return;
    
    this.dialog.querySelector('.apply-stash-btn')?.addEventListener('click', () => {
      if (this.selectedStash) this.applyStash(this.selectedStash.index, false);
    });
    
    this.dialog.querySelector('.pop-stash-btn')?.addEventListener('click', () => {
      if (this.selectedStash) this.applyStash(this.selectedStash.index, true);
    });
    
    this.dialog.querySelector('.branch-stash-btn')?.addEventListener('click', () => {
      if (this.selectedStash) this.createBranchFromStash(this.selectedStash.index);
    });
    
    this.dialog.querySelector('.drop-stash-btn')?.addEventListener('click', () => {
      if (this.selectedStash) this.dropStash(this.selectedStash.index);
    });
  }
  
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.dialog) return;
    
    if (e.key === 'Escape') {
      this.close();
    }
  };
  
  // ============================================================================
  // STASH OPERATIONS
  // ============================================================================
  
  private selectStash(index: number): void {
    this.selectedStash = this.stashes.find(s => s.index === index) || null;
    
    // Update selection UI
    this.dialog?.querySelectorAll('.stash-item').forEach(item => {
      item.classList.toggle('selected', 
        parseInt((item as HTMLElement).dataset.index || '-1', 10) === index
      );
    });
    
    // Render details
    const detailPanel = this.dialog?.querySelector('.stash-detail-panel');
    if (detailPanel && this.selectedStash) {
      detailPanel.innerHTML = this.renderStashDetails(this.selectedStash);
      this.attachDetailListeners();
      this.loadStashFiles(this.selectedStash.index);
    }
  }
  
  private async loadStashFiles(index: number): Promise<void> {
    if (!this.config) return;
    
    const filesContainer = this.dialog?.querySelector(`.stash-files-list[data-stash-index="${index}"]`);
    if (!filesContainer) return;
    
    try {
      const files = await invoke<Array<{ path: string; status: string }>>('git_stash_show_files', {
        path: this.config.repoPath,
        index: index
      });
      
      if (files.length === 0) {
        filesContainer.innerHTML = '<div class="no-files">No files in stash</div>';
        return;
      }
      
      filesContainer.innerHTML = files.map(file => `
        <div class="stash-file">
          <span class="file-status ${file.status}">${this.getStatusChar(file.status)}</span>
          <span class="file-path">${this.escapeHtml(file.path)}</span>
        </div>
      `).join('');
      
    } catch (error) {
      filesContainer.innerHTML = `<div class="error">Failed to load files</div>`;
    }
  }
  
  private showCreateStashDialog(): void {
    const message = prompt('Enter stash message (optional):');
    if (message === null) return; // Cancelled
    
    this.createStash(message || undefined);
  }
  
  private async createStash(message?: string): Promise<void> {
    if (!this.config) return;
    
    try {
      await invoke('git_stash_save', {
        path: this.config.repoPath,
        message: message || `WIP on ${new Date().toLocaleString()}`,
        includeUntracked: true
      });
      
      this.config.onStashCreate?.(message || '');
      this.showNotification('Changes stashed', 'success');
      
      // Refresh list
      await this.loadStashes();
      this.updateStashList();
      
    } catch (error) {
      this.showNotification(`Failed to stash: ${error}`, 'error');
    }
  }
  
  private async applyStash(index: number, pop: boolean): Promise<void> {
    if (!this.config) return;
    
    const stash = this.stashes.find(s => s.index === index);
    if (!stash) return;
    
    try {
      if (pop) {
        await invoke('git_stash_pop', {
          path: this.config.repoPath,
          index: index
        });
      } else {
        await invoke('git_stash_apply', {
          path: this.config.repoPath,
          index: index
        });
      }
      
      this.config.onStashApply?.(stash);
      this.showNotification(pop ? 'Stash popped' : 'Stash applied', 'success');
      
      // Refresh if popped
      if (pop) {
        await this.loadStashes();
        this.selectedStash = null;
        this.updateStashList();
        this.updateDetailPanel();
      }
      
    } catch (error) {
      this.showNotification(`Failed: ${error}`, 'error');
    }
  }
  
  private async dropStash(index: number): Promise<void> {
    if (!this.config) return;
    
    const stash = this.stashes.find(s => s.index === index);
    if (!stash) return;
    
    const confirmed = confirm(`Delete stash "${stash.ref}"?\n\nThis cannot be undone.`);
    if (!confirmed) return;
    
    try {
      await invoke('git_stash_drop', {
        path: this.config.repoPath,
        index: index
      });
      
      this.config.onStashDrop?.(stash);
      this.showNotification('Stash deleted', 'success');
      
      // Refresh
      await this.loadStashes();
      if (this.selectedStash?.index === index) {
        this.selectedStash = null;
      }
      this.updateStashList();
      this.updateDetailPanel();
      
    } catch (error) {
      this.showNotification(`Failed: ${error}`, 'error');
    }
  }
  
  private async createBranchFromStash(index: number): Promise<void> {
    if (!this.config) return;
    
    const branchName = prompt('Enter branch name:');
    if (!branchName || !branchName.trim()) return;
    
    try {
      await invoke('git_stash_branch', {
        path: this.config.repoPath,
        index: index,
        branchName: branchName.trim()
      });
      
      this.showNotification(`Branch '${branchName}' created from stash`, 'success');
      
      // Refresh
      await this.loadStashes();
      this.selectedStash = null;
      this.updateStashList();
      this.updateDetailPanel();
      
    } catch (error) {
      this.showNotification(`Failed: ${error}`, 'error');
    }
  }
  
  private async clearAllStashes(): Promise<void> {
    if (!this.config || this.stashes.length === 0) return;
    
    const confirmed = confirm(`Delete ALL ${this.stashes.length} stashes?\n\nThis cannot be undone.`);
    if (!confirmed) return;
    
    try {
      await invoke('git_stash_clear', {
        path: this.config.repoPath
      });
      
      this.showNotification('All stashes cleared', 'success');
      
      // Refresh
      await this.loadStashes();
      this.selectedStash = null;
      this.updateStashList();
      this.updateDetailPanel();
      
    } catch (error) {
      this.showNotification(`Failed: ${error}`, 'error');
    }
  }
  
  // ============================================================================
  // UI UPDATES
  // ============================================================================
  
  private updateStashList(): void {
    const listPanel = this.dialog?.querySelector('.stash-list-panel');
    if (listPanel) {
      listPanel.innerHTML = this.renderStashList();
      
      // Re-attach event listeners
      listPanel.querySelectorAll('.stash-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if ((e.target as HTMLElement).closest('.stash-action-btn')) return;
          const index = parseInt((item as HTMLElement).dataset.index || '0', 10);
          this.selectStash(index);
        });
      });
      
      listPanel.querySelectorAll('.apply-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const index = parseInt((btn as HTMLElement).dataset.index || '0', 10);
          this.applyStash(index, false);
        });
      });
      
      listPanel.querySelectorAll('.pop-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const index = parseInt((btn as HTMLElement).dataset.index || '0', 10);
          this.applyStash(index, true);
        });
      });
      
      listPanel.querySelectorAll('.drop-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const index = parseInt((btn as HTMLElement).dataset.index || '0', 10);
          this.dropStash(index);
        });
      });
    }
    
    // Update count
    const countEl = this.dialog?.querySelector('.stash-count');
    if (countEl) {
      countEl.textContent = `${this.stashes.length} stash${this.stashes.length !== 1 ? 'es' : ''}`;
    }
    
    // Update clear all button
    const clearBtn = this.dialog?.querySelector('.clear-all-btn') as HTMLButtonElement;
    if (clearBtn) {
      clearBtn.disabled = this.stashes.length === 0;
      clearBtn.classList.toggle('disabled', this.stashes.length === 0);
    }
  }
  
  private updateDetailPanel(): void {
    const detailPanel = this.dialog?.querySelector('.stash-detail-panel');
    if (detailPanel) {
      if (this.selectedStash) {
        detailPanel.innerHTML = this.renderStashDetails(this.selectedStash);
        this.attachDetailListeners();
        this.loadStashFiles(this.selectedStash.index);
      } else {
        detailPanel.innerHTML = this.renderPlaceholder();
      }
    }
  }
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
  private showNotification(message: string, type: 'success' | 'error'): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Dispatch event for external notification system
    this.dispatchEvent('git-notification', { message, type });
  }
  
  private dispatchEvent(name: string, detail?: any): void {
    document.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  }
  
  private getStatusChar(status: string): string {
    const chars: Record<string, string> = {
      added: 'A',
      modified: 'M',
      deleted: 'D',
      renamed: 'R'
    };
    return chars[status] || '?';
  }
  
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  private injectStyles(): void {
    if (document.getElementById('git-stash-manager-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'git-stash-manager-styles';
    style.textContent = `
      .git-stash-dialog {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .stash-dialog-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(2px);
      }
      
      .stash-dialog-container {
        position: relative;
        width: 900px;
        max-width: 90vw;
        height: 70vh;
        max-height: 600px;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      }
      
      .stash-dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid #3c3c3c;
      }
      
      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .stash-icon {
        font-size: 20px;
      }
      
      .stash-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #e0e0e0;
      }
      
      .stash-count {
        font-size: 12px;
        color: #808080;
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 10px;
        border-radius: 10px;
      }
      
      .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .header-btn {
        padding: 8px 16px;
        background: #007acc;
        border: none;
        border-radius: 4px;
        color: #fff;
        font-size: 12px;
        cursor: pointer;
      }
      
      .header-btn:hover {
        background: #0098ff;
      }
      
      .stash-close-btn {
        width: 28px;
        height: 28px;
        border: none;
        background: transparent;
        color: #808080;
        font-size: 16px;
        cursor: pointer;
        border-radius: 4px;
      }
      
      .stash-close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      
      .stash-dialog-content {
        flex: 1;
        display: flex;
        overflow: hidden;
      }
      
      .stash-list-panel {
        width: 400px;
        border-right: 1px solid #3c3c3c;
        overflow-y: auto;
      }
      
      .stash-detail-panel {
        flex: 1;
        overflow-y: auto;
        background: #252526;
      }
      
      .stash-list {
        padding: 8px;
      }
      
      .stash-item {
        padding: 12px;
        margin-bottom: 8px;
        background: #252526;
        border: 1px solid #3c3c3c;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      
      .stash-item:hover {
        border-color: #505050;
        background: #2d2d30;
      }
      
      .stash-item.selected {
        border-color: #007acc;
        background: rgba(0, 122, 204, 0.1);
      }
      
      .stash-item-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }
      
      .stash-ref {
        font-family: monospace;
        font-size: 12px;
        color: #9cdcfe;
        background: rgba(156, 220, 254, 0.1);
        padding: 2px 6px;
        border-radius: 3px;
      }
      
      .stash-branch {
        font-size: 11px;
        color: #4bb45f;
      }
      
      .stash-message {
        font-size: 13px;
        color: #e0e0e0;
        margin-bottom: 6px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .stash-meta {
        display: flex;
        gap: 12px;
        font-size: 11px;
        color: #808080;
      }
      
      .stash-item-actions {
        display: flex;
        gap: 6px;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #3c3c3c;
      }
      
      .stash-action-btn {
        padding: 4px 10px;
        background: #3c3c3c;
        border: 1px solid #505050;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 11px;
        cursor: pointer;
      }
      
      .stash-action-btn:hover {
        background: #505050;
      }
      
      .stash-action-btn.drop-btn:hover {
        background: rgba(220, 80, 80, 0.2);
        border-color: rgba(220, 80, 80, 0.5);
        color: #dc5050;
      }
      
      .details-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #808080;
        gap: 12px;
      }
      
      .placeholder-icon {
        font-size: 48px;
        opacity: 0.3;
      }
      
      .stash-details {
        padding: 20px;
      }
      
      .details-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid #3c3c3c;
      }
      
      .details-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #9cdcfe;
      }
      
      .details-date {
        font-size: 12px;
        color: #808080;
      }
      
      .details-section {
        margin-bottom: 20px;
      }
      
      .detail-row {
        display: flex;
        margin-bottom: 8px;
        font-size: 13px;
      }
      
      .detail-label {
        width: 80px;
        color: #808080;
        flex-shrink: 0;
      }
      
      .detail-value {
        color: #e0e0e0;
      }
      
      .section-title {
        font-size: 12px;
        font-weight: 600;
        color: #808080;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 10px;
      }
      
      .stash-files-list {
        max-height: 200px;
        overflow-y: auto;
        background: #1e1e1e;
        border-radius: 4px;
        padding: 8px;
      }
      
      .stash-file {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
        font-size: 12px;
      }
      
      .file-status {
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 3px;
        font-size: 10px;
        font-weight: 600;
      }
      
      .file-status.added, .file-status.A {
        background: rgba(75, 180, 95, 0.2);
        color: #4bb45f;
      }
      
      .file-status.modified, .file-status.M {
        background: rgba(227, 179, 65, 0.2);
        color: #e3b341;
      }
      
      .file-status.deleted, .file-status.D {
        background: rgba(220, 80, 80, 0.2);
        color: #dc5050;
      }
      
      .file-path {
        color: #e0e0e0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .details-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid #3c3c3c;
      }
      
      .detail-btn {
        padding: 8px 16px;
        background: #3c3c3c;
        border: 1px solid #505050;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 12px;
        cursor: pointer;
      }
      
      .detail-btn:hover {
        background: #505050;
      }
      
      .detail-btn.danger {
        color: #dc5050;
        border-color: rgba(220, 80, 80, 0.5);
      }
      
      .detail-btn.danger:hover {
        background: rgba(220, 80, 80, 0.2);
      }
      
      .stash-dialog-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-top: 1px solid #3c3c3c;
        background: #252526;
        border-radius: 0 0 8px 8px;
      }
      
      .footer-info {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #808080;
        font-size: 12px;
      }
      
      .footer-btn {
        padding: 6px 14px;
        background: #3c3c3c;
        border: 1px solid #505050;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 12px;
        cursor: pointer;
      }
      
      .footer-btn:hover:not(.disabled) {
        background: #505050;
      }
      
      .footer-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .no-stashes, .stash-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        color: #808080;
        text-align: center;
        gap: 10px;
      }
      
      .empty-icon {
        font-size: 48px;
        opacity: 0.3;
      }
      
      .empty-text {
        font-size: 14px;
        color: #e0e0e0;
      }
      
      .empty-hint {
        font-size: 12px;
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
      
      .loading-files {
        color: #808080;
        font-size: 12px;
        font-style: italic;
        padding: 8px;
      }
    `;
    
    document.head.appendChild(style);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const gitStashManager = new GitStashManager();

export default gitStashManager;
