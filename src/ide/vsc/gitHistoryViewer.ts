// ide/vsc/gitHistoryViewer.ts
// ============================================================================
// GIT COMMIT HISTORY VIEWER - Visual commit log with graph
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPES
// ============================================================================

export interface GitCommit {
  hash: string;
  short_hash: string;
  message: string;
  author: string;
  email: string;
  date: string;
  relative_date: string;
  parents?: string[];
  branches?: string[];
  tags?: string[];
}

export interface HistoryViewerConfig {
  repoPath: string;
  filePath?: string;  // Optional: show history for specific file
  maxCount?: number;
  onCommitSelect?: (commit: GitCommit) => void;
}

// ============================================================================
// GIT HISTORY VIEWER CLASS
// ============================================================================

export class GitHistoryViewer {
  private dialog: HTMLElement | null = null;
  private config: HistoryViewerConfig | null = null;
  private commits: GitCommit[] = [];
  private selectedCommit: GitCommit | null = null;
  private isLoading: boolean = false;
  private hasMore: boolean = true;
  private page: number = 0;
  private pageSize: number = 50;
  private filterText: string = '';
  
  constructor() {
    this.injectStyles();
  }
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  /**
   * Show commit history
   */
  public async show(config: HistoryViewerConfig): Promise<void> {
    this.config = config;
    this.commits = [];
    this.page = 0;
    this.hasMore = true;
    this.selectedCommit = null;
    
    this.render();
    await this.loadMore();
  }
  
  /**
   * Show history for a specific file
   */
  public async showFileHistory(repoPath: string, filePath: string): Promise<void> {
    await this.show({
      repoPath,
      filePath,
      maxCount: 100
    });
  }
  
  /**
   * Close the viewer
   */
  public close(): void {
    if (this.dialog) {
      this.dialog.remove();
      this.dialog = null;
    }
    document.removeEventListener('keydown', this.handleKeyDown);
  }
  
  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  private async loadMore(): Promise<void> {
    if (!this.config || this.isLoading || !this.hasMore) return;
    
    this.isLoading = true;
    this.updateLoadingState();
    
    try {
      const skip = this.page * this.pageSize;
      
      const newCommits = await invoke<GitCommit[]>('git_log_extended', {
        path: this.config.repoPath,
        maxCount: this.pageSize,
        skip: skip,
        filePath: this.config.filePath || null
      });
      
      if (newCommits.length < this.pageSize) {
        this.hasMore = false;
      }
      
      this.commits.push(...newCommits);
      this.page++;
      
      this.renderCommitList();
    } catch (error) {
      console.error('Failed to load commits:', error);
      this.showError(String(error));
    } finally {
      this.isLoading = false;
      this.updateLoadingState();
    }
  }
  
  // ============================================================================
  // RENDERING
  // ============================================================================
  
  private render(): void {
    this.close();
    
    const title = this.config?.filePath 
      ? `History: ${this.getFileName(this.config.filePath)}`
      : 'Commit History';
    
    this.dialog = document.createElement('div');
    this.dialog.className = 'git-history-dialog';
    this.dialog.innerHTML = `
      <div class="history-dialog-backdrop"></div>
      <div class="history-dialog-container">
        <div class="history-dialog-header">
          <div class="header-left">
            <span class="history-icon">📜</span>
            <h2 class="history-title">${title}</h2>
            <span class="commit-count">${this.commits.length} commits</span>
          </div>
          <button class="history-close-btn" title="Close (Esc)">✕</button>
        </div>
        
        <div class="history-dialog-toolbar">
          <div class="history-search">
            <input type="text" 
                   class="history-search-input" 
                   placeholder="Search commits (message, author, hash)..."
                   spellcheck="false" />
          </div>
          <div class="history-toolbar-actions">
            <button class="toolbar-btn refresh-btn" title="Refresh">↻ Refresh</button>
          </div>
        </div>
        
        <div class="history-dialog-content">
          <div class="history-main">
            <div class="commit-list-container">
              <div class="commit-list"></div>
              ${this.hasMore ? `
                <div class="load-more-container">
                  <button class="load-more-btn">Load More</button>
                </div>
              ` : ''}
            </div>
            
            <div class="commit-detail-panel">
              <div class="detail-placeholder">
                <span class="placeholder-icon">👆</span>
                <span>Select a commit to view details</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.dialog);
    this.attachEventListeners();
  }
  
  private renderCommitList(): void {
    const listContainer = this.dialog?.querySelector('.commit-list');
    if (!listContainer) return;
    
    // Filter commits
    let filteredCommits = this.commits;
    
    if (this.filterText) {
      const filter = this.filterText.toLowerCase();
      filteredCommits = filteredCommits.filter(c =>
        c.message.toLowerCase().includes(filter) ||
        c.author.toLowerCase().includes(filter) ||
        c.hash.includes(filter) ||
        c.short_hash.includes(filter)
      );
    }
    
    // Update count
    const countEl = this.dialog?.querySelector('.commit-count');
    if (countEl) {
      countEl.textContent = `${filteredCommits.length} commits`;
    }
    
    // Render commits with graph
    let html = '';
    
    for (let i = 0; i < filteredCommits.length; i++) {
      const commit = filteredCommits[i];
      const isSelected = this.selectedCommit?.hash === commit.hash;
      
      html += this.renderCommitItem(commit, i, isSelected);
    }
    
    if (filteredCommits.length === 0) {
      html = `
        <div class="no-commits">
          <span class="empty-icon">📭</span>
          <span>No commits found</span>
        </div>
      `;
    }
    
    listContainer.innerHTML = html;
    
    // Update load more button visibility
    const loadMoreContainer = this.dialog?.querySelector('.load-more-container');
    if (loadMoreContainer) {
      (loadMoreContainer as HTMLElement).style.display = this.hasMore ? 'block' : 'none';
    }
    
    this.attachCommitItemListeners();
  }
  
  private renderCommitItem(commit: GitCommit, index: number, isSelected: boolean): string {
    // Generate graph line (simplified)
    const graphChar = index === 0 ? '●' : '│';
    
    return `
      <div class="commit-item ${isSelected ? 'selected' : ''}"
           data-hash="${commit.hash}">
        <div class="commit-graph">
          <span class="graph-node">${graphChar}</span>
        </div>
        <div class="commit-info">
          <div class="commit-header">
            <span class="commit-hash" title="${commit.hash}">${commit.short_hash}</span>
            ${commit.branches?.length ? `
              <span class="commit-branches">
                ${commit.branches.map(b => `<span class="branch-tag">${this.escapeHtml(b)}</span>`).join('')}
              </span>
            ` : ''}
            ${commit.tags?.length ? `
              <span class="commit-tags">
                ${commit.tags.map(t => `<span class="tag-label">🏷 ${this.escapeHtml(t)}</span>`).join('')}
              </span>
            ` : ''}
          </div>
          <div class="commit-message" title="${this.escapeHtml(commit.message)}">
            ${this.escapeHtml(this.truncate(commit.message, 80))}
          </div>
          <div class="commit-meta">
            <span class="commit-author" title="${commit.email}">
              👤 ${this.escapeHtml(commit.author)}
            </span>
            <span class="commit-date" title="${commit.date}">
              ${commit.relative_date}
            </span>
          </div>
        </div>
        <div class="commit-actions">
          <button class="commit-action-btn copy-btn" title="Copy hash">📋</button>
          <button class="commit-action-btn checkout-btn" title="Checkout this commit">⎇</button>
          <button class="commit-action-btn diff-btn" title="Show changes">📝</button>
        </div>
      </div>
    `;
  }
  
  private renderCommitDetails(commit: GitCommit): void {
    const detailPanel = this.dialog?.querySelector('.commit-detail-panel');
    if (!detailPanel) return;
    
    detailPanel.innerHTML = `
      <div class="commit-detail">
        <div class="detail-header">
          <h3 class="detail-title">Commit Details</h3>
        </div>
        
        <div class="detail-section">
          <div class="detail-row">
            <span class="detail-label">Hash:</span>
            <span class="detail-value hash-value">
              <code>${commit.hash}</code>
              <button class="copy-hash-btn" title="Copy">📋</button>
            </span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Author:</span>
            <span class="detail-value">${this.escapeHtml(commit.author)} &lt;${commit.email}&gt;</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${commit.date}</span>
          </div>
          
          ${commit.parents?.length ? `
            <div class="detail-row">
              <span class="detail-label">Parents:</span>
              <span class="detail-value">
                ${commit.parents.map(p => `<code class="parent-hash">${p.substring(0, 7)}</code>`).join(' ')}
              </span>
            </div>
          ` : ''}
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Message:</div>
          <div class="commit-message-full">${this.escapeHtml(commit.message)}</div>
        </div>
        
        <div class="detail-actions">
          <button class="detail-btn view-diff-btn">View Changes</button>
          <button class="detail-btn checkout-commit-btn">Checkout</button>
          <button class="detail-btn cherry-pick-btn">Cherry-pick</button>
          <button class="detail-btn revert-btn">Revert</button>
        </div>
        
        <div class="changed-files-section">
          <div class="section-header">
            <span class="detail-label">Changed Files</span>
            <span class="file-count loading">Loading...</span>
          </div>
          <div class="changed-files-list"></div>
        </div>
      </div>
    `;
    
    this.attachDetailListeners(commit);
    this.loadCommitFiles(commit);
  }
  
  private async loadCommitFiles(commit: GitCommit): Promise<void> {
    if (!this.config) return;
    
    const filesContainer = this.dialog?.querySelector('.changed-files-list');
    const countEl = this.dialog?.querySelector('.file-count');
    
    if (!filesContainer || !countEl) return;
    
    try {
      const files = await invoke<Array<{ path: string; status: string; additions: number; deletions: number }>>('git_show_files', {
        path: this.config.repoPath,
        commitHash: commit.hash
      });
      
      countEl.textContent = `${files.length} files`;
      countEl.classList.remove('loading');
      
      if (files.length === 0) {
        filesContainer.innerHTML = '<div class="no-files">No files changed</div>';
        return;
      }
      
      filesContainer.innerHTML = files.map(file => `
        <div class="changed-file" data-path="${this.escapeHtml(file.path)}">
          <span class="file-status ${file.status}">${this.getStatusChar(file.status)}</span>
          <span class="file-path">${this.escapeHtml(file.path)}</span>
          <span class="file-stats">
            ${file.additions > 0 ? `<span class="additions">+${file.additions}</span>` : ''}
            ${file.deletions > 0 ? `<span class="deletions">-${file.deletions}</span>` : ''}
          </span>
        </div>
      `).join('');
      
      // Click handlers for files
      filesContainer.querySelectorAll('.changed-file').forEach(el => {
        el.addEventListener('click', () => {
          const filePath = (el as HTMLElement).dataset.path;
          if (filePath) {
            this.showCommitFileDiff(commit.hash, filePath);
          }
        });
      });
      
    } catch (error) {
      console.error('Failed to load commit files:', error);
      countEl.textContent = 'Error';
      countEl.classList.remove('loading');
      filesContainer.innerHTML = `<div class="error">Failed to load files</div>`;
    }
  }
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  private attachEventListeners(): void {
    if (!this.dialog) return;
    
    // Close
    this.dialog.querySelector('.history-close-btn')?.addEventListener('click', () => this.close());
    this.dialog.querySelector('.history-dialog-backdrop')?.addEventListener('click', () => this.close());
    
    // Search
    const searchInput = this.dialog.querySelector('.history-search-input') as HTMLInputElement;
    let searchTimeout: number;
    searchInput?.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = window.setTimeout(() => {
        this.filterText = searchInput.value;
        this.renderCommitList();
      }, 200);
    });
    
    // Refresh
    this.dialog.querySelector('.refresh-btn')?.addEventListener('click', async () => {
      this.commits = [];
      this.page = 0;
      this.hasMore = true;
      await this.loadMore();
    });
    
    // Load more
    this.dialog.querySelector('.load-more-btn')?.addEventListener('click', () => this.loadMore());
    
    // Keyboard
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Scroll to load more
    const listContainer = this.dialog.querySelector('.commit-list-container');
    listContainer?.addEventListener('scroll', () => {
      const el = listContainer as HTMLElement;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
        if (this.hasMore && !this.isLoading) {
          this.loadMore();
        }
      }
    });
  }
  
  private attachCommitItemListeners(): void {
    if (!this.dialog) return;
    
    // Select commit
    this.dialog.querySelectorAll('.commit-item').forEach(item => {
      item.addEventListener('click', () => {
        const hash = (item as HTMLElement).dataset.hash;
        const commit = this.commits.find(c => c.hash === hash);
        
        if (commit) {
          this.selectedCommit = commit;
          this.renderCommitList();
          this.renderCommitDetails(commit);
          this.config?.onCommitSelect?.(commit);
        }
      });
    });
    
    // Action buttons
    this.dialog.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = (e.target as HTMLElement).closest('.commit-item');
        const hash = (item as HTMLElement)?.dataset.hash;
        if (hash) this.copyToClipboard(hash.substring(0, 7));
      });
    });
    
    this.dialog.querySelectorAll('.checkout-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = (e.target as HTMLElement).closest('.commit-item');
        const hash = (item as HTMLElement)?.dataset.hash;
        if (hash) this.checkoutCommit(hash);
      });
    });
    
    this.dialog.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = (e.target as HTMLElement).closest('.commit-item');
        const hash = (item as HTMLElement)?.dataset.hash;
        if (hash) this.showCommitDiff(hash);
      });
    });
  }
  
  private attachDetailListeners(commit: GitCommit): void {
    if (!this.dialog) return;
    
    // Copy hash
    this.dialog.querySelector('.copy-hash-btn')?.addEventListener('click', () => {
      this.copyToClipboard(commit.hash);
    });
    
    // View diff
    this.dialog.querySelector('.view-diff-btn')?.addEventListener('click', () => {
      this.showCommitDiff(commit.hash);
    });
    
    // Checkout
    this.dialog.querySelector('.checkout-commit-btn')?.addEventListener('click', () => {
      this.checkoutCommit(commit.hash);
    });
    
    // Cherry-pick
    this.dialog.querySelector('.cherry-pick-btn')?.addEventListener('click', () => {
      this.cherryPick(commit.hash);
    });
    
    // Revert
    this.dialog.querySelector('.revert-btn')?.addEventListener('click', () => {
      this.revertCommit(commit.hash);
    });
  }
  
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.dialog) return;
    
    if (e.key === 'Escape') {
      this.close();
    }
  };
  
  // ============================================================================
  // ACTIONS
  // ============================================================================
  
  private async checkoutCommit(hash: string): Promise<void> {
    if (!this.config) return;
    
    const confirmed = confirm(
      `Checkout commit ${hash.substring(0, 7)}?\n\n` +
      `This will put your repository in 'detached HEAD' state.`
    );
    if (!confirmed) return;
    
    try {
      await invoke('git_checkout', {
        path: this.config.repoPath,
        branch: hash
      });
      
      this.showNotification('Checked out commit', 'success');
    } catch (error) {
      this.showNotification(`Checkout failed: ${error}`, 'error');
    }
  }
  
  private async showCommitDiff(hash: string): Promise<void> {
    if (!this.config) return;
    
    try {
      const diff = await invoke<string>('git_show', {
        path: this.config.repoPath,
        commitHash: hash
      });
      
      // Dispatch event to open diff viewer
      document.dispatchEvent(new CustomEvent('git-show-diff', {
        detail: { diff, commitHash: hash },
        bubbles: true
      }));
    } catch (error) {
      console.error('Failed to get commit diff:', error);
    }
  }
  
  private async showCommitFileDiff(hash: string, filePath: string): Promise<void> {
    if (!this.config) return;
    
    try {
      const diff = await invoke<string>('git_show_file', {
        path: this.config.repoPath,
        commitHash: hash,
        filePath: filePath
      });
      
      document.dispatchEvent(new CustomEvent('git-show-diff', {
        detail: { diff, commitHash: hash, filePath },
        bubbles: true
      }));
    } catch (error) {
      console.error('Failed to get file diff:', error);
    }
  }
  
  private async cherryPick(hash: string): Promise<void> {
    if (!this.config) return;
    
    const confirmed = confirm(`Cherry-pick commit ${hash.substring(0, 7)}?`);
    if (!confirmed) return;
    
    try {
      await invoke('git_cherry_pick', {
        path: this.config.repoPath,
        commitHash: hash
      });
      
      this.showNotification('Cherry-pick successful', 'success');
    } catch (error) {
      this.showNotification(`Cherry-pick failed: ${error}`, 'error');
    }
  }
  
  private async revertCommit(hash: string): Promise<void> {
    if (!this.config) return;
    
    const confirmed = confirm(`Revert commit ${hash.substring(0, 7)}?\n\nThis will create a new commit.`);
    if (!confirmed) return;
    
    try {
      await invoke('git_revert', {
        path: this.config.repoPath,
        commitHash: hash
      });
      
      this.showNotification('Commit reverted', 'success');
      
      // Refresh to show new revert commit
      this.commits = [];
      this.page = 0;
      this.hasMore = true;
      await this.loadMore();
    } catch (error) {
      this.showNotification(`Revert failed: ${error}`, 'error');
    }
  }
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
  private copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.showNotification('Copied to clipboard', 'success');
    });
  }
  
  private showNotification(message: string, type: 'success' | 'error'): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
  
  private updateLoadingState(): void {
    const loadMoreBtn = this.dialog?.querySelector('.load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.textContent = this.isLoading ? 'Loading...' : 'Load More';
      (loadMoreBtn as HTMLButtonElement).disabled = this.isLoading;
    }
  }
  
  private showError(message: string): void {
    const listContainer = this.dialog?.querySelector('.commit-list');
    if (listContainer) {
      listContainer.innerHTML = `
        <div class="error-message">
          <span class="error-icon">⚠️</span>
          <span>${this.escapeHtml(message)}</span>
        </div>
      `;
    }
  }
  
  private getStatusChar(status: string): string {
    const chars: Record<string, string> = {
      added: 'A',
      modified: 'M',
      deleted: 'D',
      renamed: 'R',
      copied: 'C'
    };
    return chars[status] || '?';
  }
  
  private getFileName(path: string): string {
    return path.split(/[/\\]/).pop() || path;
  }
  
  private truncate(text: string, maxLength: number): string {
    const firstLine = text.split('\n')[0];
    if (firstLine.length <= maxLength) return firstLine;
    return firstLine.substring(0, maxLength - 3) + '...';
  }
  
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  private injectStyles(): void {
    if (document.getElementById('git-history-viewer-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'git-history-viewer-styles';
    style.textContent = `
      .git-history-dialog {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .history-dialog-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(2px);
      }
      
      .history-dialog-container {
        position: relative;
        width: 95vw;
        max-width: 1200px;
        height: 85vh;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      }
      
      .history-dialog-header {
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
      
      .history-icon {
        font-size: 24px;
      }
      
      .history-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #e0e0e0;
      }
      
      .commit-count {
        font-size: 12px;
        color: #808080;
        padding: 2px 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
      }
      
      .history-close-btn {
        width: 28px;
        height: 28px;
        border: none;
        background: transparent;
        color: #808080;
        font-size: 16px;
        cursor: pointer;
        border-radius: 4px;
      }
      
      .history-close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      
      .history-dialog-toolbar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-bottom: 1px solid #3c3c3c;
        background: #252526;
      }
      
      .history-search {
        flex: 1;
      }
      
      .history-search-input {
        width: 100%;
        padding: 8px 12px;
        background: #3c3c3c;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 13px;
        outline: none;
      }
      
      .history-search-input:focus {
        border-color: #007acc;
      }
      
      .toolbar-btn {
        padding: 6px 12px;
        background: #3c3c3c;
        border: 1px solid #505050;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 12px;
        cursor: pointer;
      }
      
      .toolbar-btn:hover {
        background: #505050;
      }
      
      .history-dialog-content {
        flex: 1;
        overflow: hidden;
      }
      
      .history-main {
        display: flex;
        height: 100%;
      }
      
      .commit-list-container {
        flex: 1;
        overflow-y: auto;
        border-right: 1px solid #3c3c3c;
      }
      
      .commit-detail-panel {
        width: 400px;
        overflow-y: auto;
        background: #252526;
      }
      
      .commit-item {
        display: flex;
        padding: 12px 16px;
        border-bottom: 1px solid #2d2d30;
        cursor: pointer;
        transition: background 0.1s ease;
      }
      
      .commit-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      .commit-item.selected {
        background: rgba(0, 122, 204, 0.2);
        border-left: 3px solid #007acc;
      }
      
      .commit-graph {
        width: 30px;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      .graph-node {
        color: #007acc;
        font-size: 12px;
      }
      
      .commit-info {
        flex: 1;
        min-width: 0;
      }
      
      .commit-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }
      
      .commit-hash {
        font-family: monospace;
        font-size: 12px;
        color: #9cdcfe;
        background: rgba(156, 220, 254, 0.1);
        padding: 2px 6px;
        border-radius: 3px;
      }
      
      .branch-tag {
        font-size: 10px;
        padding: 2px 6px;
        background: rgba(75, 180, 95, 0.2);
        color: #4bb45f;
        border-radius: 3px;
      }
      
      .tag-label {
        font-size: 10px;
        color: #e3b341;
      }
      
      .commit-message {
        font-size: 13px;
        color: #e0e0e0;
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .commit-meta {
        display: flex;
        gap: 16px;
        font-size: 11px;
        color: #808080;
      }
      
      .commit-actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.15s ease;
      }
      
      .commit-item:hover .commit-actions {
        opacity: 1;
      }
      
      .commit-action-btn {
        width: 26px;
        height: 26px;
        border: none;
        background: transparent;
        color: #808080;
        font-size: 12px;
        cursor: pointer;
        border-radius: 4px;
      }
      
      .commit-action-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #e0e0e0;
      }
      
      .load-more-container {
        padding: 16px;
        text-align: center;
      }
      
      .load-more-btn {
        padding: 8px 24px;
        background: #3c3c3c;
        border: 1px solid #505050;
        border-radius: 4px;
        color: #e0e0e0;
        cursor: pointer;
      }
      
      .load-more-btn:hover {
        background: #505050;
      }
      
      .load-more-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .detail-placeholder {
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
      
      .commit-detail {
        padding: 16px;
      }
      
      .detail-header {
        margin-bottom: 16px;
      }
      
      .detail-title {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #e0e0e0;
      }
      
      .detail-section {
        margin-bottom: 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid #3c3c3c;
      }
      
      .detail-row {
        display: flex;
        margin-bottom: 8px;
        font-size: 12px;
      }
      
      .detail-label {
        width: 70px;
        flex-shrink: 0;
        color: #808080;
        font-weight: 500;
      }
      
      .detail-value {
        flex: 1;
        color: #e0e0e0;
        word-break: break-all;
      }
      
      .detail-value code {
        font-family: monospace;
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 6px;
        border-radius: 3px;
      }
      
      .hash-value {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .copy-hash-btn {
        background: none;
        border: none;
        color: #808080;
        cursor: pointer;
        font-size: 12px;
      }
      
      .copy-hash-btn:hover {
        color: #e0e0e0;
      }
      
      .commit-message-full {
        background: #1e1e1e;
        padding: 12px;
        border-radius: 4px;
        font-size: 13px;
        color: #e0e0e0;
        white-space: pre-wrap;
        font-family: inherit;
      }
      
      .detail-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 16px;
      }
      
      .detail-btn {
        padding: 6px 12px;
        background: #3c3c3c;
        border: 1px solid #505050;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 11px;
        cursor: pointer;
      }
      
      .detail-btn:hover {
        background: #505050;
      }
      
      .changed-files-section {
        margin-top: 16px;
      }
      
      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      
      .file-count {
        font-size: 11px;
        color: #808080;
      }
      
      .file-count.loading {
        font-style: italic;
      }
      
      .changed-file {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }
      
      .changed-file:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      .file-status {
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 600;
        border-radius: 3px;
      }
      
      .file-status.added {
        background: rgba(75, 180, 95, 0.2);
        color: #4bb45f;
      }
      
      .file-status.modified {
        background: rgba(227, 179, 65, 0.2);
        color: #e3b341;
      }
      
      .file-status.deleted {
        background: rgba(220, 80, 80, 0.2);
        color: #dc5050;
      }
      
      .file-path {
        flex: 1;
        color: #e0e0e0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .file-stats {
        display: flex;
        gap: 6px;
        font-family: monospace;
        font-size: 11px;
      }
      
      .file-stats .additions {
        color: #4bb45f;
      }
      
      .file-stats .deletions {
        color: #dc5050;
      }
      
      .no-commits, .error-message {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        color: #808080;
        gap: 12px;
      }
      
      .empty-icon, .error-icon {
        font-size: 32px;
        opacity: 0.5;
      }
    `;
    
    document.head.appendChild(style);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const gitHistoryViewer = new GitHistoryViewer();

export default gitHistoryViewer;
