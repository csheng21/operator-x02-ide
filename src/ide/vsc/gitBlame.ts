// ide/vsc/gitBlame.ts
// ============================================================================
// GIT BLAME INTEGRATION - Line-by-line author annotations
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPES
// ============================================================================

export interface BlameLine {
  lineNumber: number;
  commitHash: string;
  shortHash: string;
  author: string;
  authorEmail: string;
  date: string;
  relativeDate: string;
  message: string;
  content: string;
  isOriginal: boolean;  // True if this line hasn't changed since original commit
}

export interface BlameInfo {
  filePath: string;
  lines: BlameLine[];
  commits: Map<string, BlameCommit>;
}

export interface BlameCommit {
  hash: string;
  author: string;
  email: string;
  date: string;
  message: string;
  lineCount: number;
}

// ============================================================================
// GIT BLAME MANAGER CLASS
// ============================================================================

export class GitBlameManager {
  private container: HTMLElement | null = null;
  private isEnabled: boolean = false;
  private currentFile: string | null = null;
  private currentRepoPath: string | null = null;
  private blameData: BlameInfo | null = null;
  private tooltipElement: HTMLElement | null = null;
  private decorations: Map<number, HTMLElement> = new Map();
  
  // Color palette for different authors
  private authorColors: Map<string, string> = new Map();
  private colorPalette: string[] = [
    '#4a9eff', '#ff6b6b', '#51cf66', '#ffd43b', '#845ef7',
    '#ff922b', '#20c997', '#f06595', '#339af0', '#94d82d'
  ];
  private colorIndex: number = 0;
  
  constructor() {
    this.injectStyles();
  }
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  /**
   * Enable blame annotations for a file
   */
  public async enable(repoPath: string, filePath: string, editorContainer: HTMLElement): Promise<void> {
    this.currentRepoPath = repoPath;
    this.currentFile = filePath;
    this.container = editorContainer;
    
    try {
      await this.loadBlameData();
      this.renderAnnotations();
      this.isEnabled = true;
      console.log('✅ Git blame enabled for:', filePath);
    } catch (error) {
      console.error('Failed to load blame data:', error);
      throw error;
    }
  }
  
  /**
   * Disable blame annotations
   */
  public disable(): void {
    this.clearAnnotations();
    this.hideTooltip();
    this.isEnabled = false;
    this.blameData = null;
    console.log('Git blame disabled');
  }
  
  /**
   * Toggle blame annotations
   */
  public async toggle(repoPath: string, filePath: string, editorContainer: HTMLElement): Promise<void> {
    if (this.isEnabled && this.currentFile === filePath) {
      this.disable();
    } else {
      await this.enable(repoPath, filePath, editorContainer);
    }
  }
  
  /**
   * Check if blame is enabled
   */
  public isBlameEnabled(): boolean {
    return this.isEnabled;
  }
  
  /**
   * Get blame info for a specific line
   */
  public getLineBlame(lineNumber: number): BlameLine | null {
    if (!this.blameData) return null;
    return this.blameData.lines.find(l => l.lineNumber === lineNumber) || null;
  }
  
  /**
   * Show blame in a dialog for current file
   */
  public async showBlameDialog(repoPath: string, filePath: string): Promise<void> {
    this.currentRepoPath = repoPath;
    this.currentFile = filePath;
    
    await this.loadBlameData();
    this.renderBlameDialog();
  }
  
  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  private async loadBlameData(): Promise<void> {
    if (!this.currentRepoPath || !this.currentFile) {
      throw new Error('No file specified');
    }
    
    try {
      const result = await invoke<{
        lines: Array<{
          line_number: number;
          commit_hash: string;
          short_hash: string;
          author: string;
          author_email: string;
          date: string;
          relative_date: string;
          message: string;
          content: string;
        }>;
      }>('git_blame', {
        path: this.currentRepoPath,
        filePath: this.currentFile
      });
      
      // Process and organize blame data
      const commits = new Map<string, BlameCommit>();
      
      const lines: BlameLine[] = result.lines.map(line => {
        // Track commit stats
        if (!commits.has(line.commit_hash)) {
          commits.set(line.commit_hash, {
            hash: line.commit_hash,
            author: line.author,
            email: line.author_email,
            date: line.date,
            message: line.message,
            lineCount: 0
          });
        }
        commits.get(line.commit_hash)!.lineCount++;
        
        return {
          lineNumber: line.line_number,
          commitHash: line.commit_hash,
          shortHash: line.short_hash,
          author: line.author,
          authorEmail: line.author_email,
          date: line.date,
          relativeDate: line.relative_date,
          message: line.message,
          content: line.content,
          isOriginal: line.commit_hash.startsWith('0000000')
        };
      });
      
      this.blameData = {
        filePath: this.currentFile,
        lines,
        commits
      };
      
    } catch (error) {
      console.error('Failed to load blame:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // INLINE ANNOTATIONS (Monaco Editor Integration)
  // ============================================================================
  
  private renderAnnotations(): void {
    if (!this.container || !this.blameData) return;
    
    this.clearAnnotations();
    
    // Create blame gutter
    const gutterContainer = document.createElement('div');
    gutterContainer.className = 'git-blame-gutter';
    
    // Group consecutive lines by commit
    let currentGroup: BlameLine[] = [];
    let lastCommit: string | null = null;
    
    for (const line of this.blameData.lines) {
      if (line.commitHash !== lastCommit) {
        if (currentGroup.length > 0) {
          this.renderBlameGroup(gutterContainer, currentGroup);
        }
        currentGroup = [line];
        lastCommit = line.commitHash;
      } else {
        currentGroup.push(line);
      }
    }
    
    // Render last group
    if (currentGroup.length > 0) {
      this.renderBlameGroup(gutterContainer, currentGroup);
    }
    
    // Insert gutter into container
    this.container.insertBefore(gutterContainer, this.container.firstChild);
    
    // Setup tooltip
    this.setupTooltip();
  }
  
  private renderBlameGroup(container: HTMLElement, lines: BlameLine[]): void {
    if (lines.length === 0) return;
    
    const firstLine = lines[0];
    const authorColor = this.getAuthorColor(firstLine.author);
    
    // Create group container
    const groupEl = document.createElement('div');
    groupEl.className = 'blame-line-group';
    groupEl.dataset.commitHash = firstLine.commitHash;
    
    // First line shows full annotation
    const firstLineEl = document.createElement('div');
    firstLineEl.className = 'blame-line blame-line-first';
    firstLineEl.dataset.lineNumber = String(firstLine.lineNumber);
    firstLineEl.innerHTML = `
      <span class="blame-indicator" style="background: ${authorColor}"></span>
      <span class="blame-author" title="${firstLine.author}">${this.truncate(firstLine.author, 12)}</span>
      <span class="blame-date">${firstLine.relativeDate}</span>
    `;
    groupEl.appendChild(firstLineEl);
    
    // Subsequent lines show minimal annotation
    for (let i = 1; i < lines.length; i++) {
      const lineEl = document.createElement('div');
      lineEl.className = 'blame-line blame-line-continuation';
      lineEl.dataset.lineNumber = String(lines[i].lineNumber);
      lineEl.innerHTML = `
        <span class="blame-indicator" style="background: ${authorColor}"></span>
      `;
      groupEl.appendChild(lineEl);
    }
    
    // Add hover listeners
    groupEl.addEventListener('mouseenter', (e) => this.showTooltip(firstLine, e));
    groupEl.addEventListener('mouseleave', () => this.hideTooltip());
    groupEl.addEventListener('click', () => this.onBlameClick(firstLine));
    
    container.appendChild(groupEl);
  }
  
  private clearAnnotations(): void {
    const existing = document.querySelector('.git-blame-gutter');
    if (existing) {
      existing.remove();
    }
    this.decorations.clear();
  }
  
  // ============================================================================
  // TOOLTIP
  // ============================================================================
  
  private setupTooltip(): void {
    if (this.tooltipElement) return;
    
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'git-blame-tooltip';
    document.body.appendChild(this.tooltipElement);
  }
  
  private showTooltip(line: BlameLine, event: MouseEvent): void {
    if (!this.tooltipElement) return;
    
    this.tooltipElement.innerHTML = `
      <div class="tooltip-header">
        <span class="tooltip-hash">${line.shortHash}</span>
        <span class="tooltip-date">${line.date}</span>
      </div>
      <div class="tooltip-message">${this.escapeHtml(line.message)}</div>
      <div class="tooltip-author">
        <span class="author-avatar">${line.author.charAt(0).toUpperCase()}</span>
        <span class="author-info">
          <span class="author-name">${this.escapeHtml(line.author)}</span>
          <span class="author-email">${line.authorEmail}</span>
        </span>
      </div>
      <div class="tooltip-hint">Click to view commit</div>
    `;
    
    // Position tooltip
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.tooltipElement.style.left = `${rect.right + 10}px`;
    this.tooltipElement.style.top = `${rect.top}px`;
    this.tooltipElement.classList.add('visible');
  }
  
  private hideTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.classList.remove('visible');
    }
  }
  
  private onBlameClick(line: BlameLine): void {
    // Dispatch event to show commit details
    document.dispatchEvent(new CustomEvent('git-show-commit', {
      detail: { 
        commitHash: line.commitHash,
        repoPath: this.currentRepoPath
      },
      bubbles: true
    }));
  }
  
  // ============================================================================
  // BLAME DIALOG
  // ============================================================================
  
  private renderBlameDialog(): void {
    if (!this.blameData) return;
    
    // Remove existing dialog
    document.querySelector('.git-blame-dialog')?.remove();
    
    const dialog = document.createElement('div');
    dialog.className = 'git-blame-dialog';
    dialog.innerHTML = `
      <div class="blame-dialog-backdrop"></div>
      <div class="blame-dialog-container">
        <div class="blame-dialog-header">
          <div class="header-left">
            <span class="blame-icon">📋</span>
            <h2 class="blame-title">Git Blame</h2>
            <span class="blame-file">${this.escapeHtml(this.blameData.filePath)}</span>
          </div>
          <button class="blame-close-btn">✕</button>
        </div>
        
        <div class="blame-dialog-content">
          <div class="blame-stats">
            ${this.renderBlameStats()}
          </div>
          <div class="blame-file-content">
            ${this.renderBlameFileContent()}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Event listeners
    dialog.querySelector('.blame-close-btn')?.addEventListener('click', () => dialog.remove());
    dialog.querySelector('.blame-dialog-backdrop')?.addEventListener('click', () => dialog.remove());
    
    // Line click handlers
    dialog.querySelectorAll('.blame-file-line').forEach(lineEl => {
      lineEl.addEventListener('click', () => {
        const hash = (lineEl as HTMLElement).dataset.commitHash;
        if (hash) {
          this.onBlameClick(this.blameData!.lines.find(l => l.commitHash === hash)!);
        }
      });
    });
    
    // Close on Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dialog.remove();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
  }
  
  private renderBlameStats(): string {
    if (!this.blameData) return '';
    
    // Get top contributors
    const contributors = Array.from(this.blameData.commits.values())
      .sort((a, b) => b.lineCount - a.lineCount)
      .slice(0, 5);
    
    const totalLines = this.blameData.lines.length;
    
    return `
      <div class="stats-header">
        <span class="stats-title">Contributors</span>
        <span class="stats-total">${this.blameData.commits.size} authors, ${totalLines} lines</span>
      </div>
      <div class="contributor-list">
        ${contributors.map(c => {
          const percentage = Math.round((c.lineCount / totalLines) * 100);
          const color = this.getAuthorColor(c.author);
          
          return `
            <div class="contributor-item">
              <div class="contributor-info">
                <span class="contributor-avatar" style="background: ${color}">
                  ${c.author.charAt(0).toUpperCase()}
                </span>
                <span class="contributor-name">${this.escapeHtml(c.author)}</span>
              </div>
              <div class="contributor-stats">
                <span class="line-count">${c.lineCount} lines</span>
                <div class="percentage-bar">
                  <div class="percentage-fill" style="width: ${percentage}%; background: ${color}"></div>
                </div>
                <span class="percentage">${percentage}%</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  
  private renderBlameFileContent(): string {
    if (!this.blameData) return '';
    
    let html = '<div class="blame-lines">';
    let lastCommit: string | null = null;
    
    for (const line of this.blameData.lines) {
      const isNewGroup = line.commitHash !== lastCommit;
      const color = this.getAuthorColor(line.author);
      
      html += `
        <div class="blame-file-line ${isNewGroup ? 'new-group' : ''}" 
             data-commit-hash="${line.commitHash}">
          <span class="line-indicator" style="background: ${color}"></span>
          <span class="line-info ${isNewGroup ? '' : 'hidden'}">
            <span class="line-author">${this.truncate(line.author, 10)}</span>
            <span class="line-date">${line.relativeDate}</span>
          </span>
          <span class="line-num">${line.lineNumber}</span>
          <span class="line-code">${this.escapeHtml(line.content)}</span>
        </div>
      `;
      
      lastCommit = line.commitHash;
    }
    
    html += '</div>';
    return html;
  }
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
  private getAuthorColor(author: string): string {
    if (!this.authorColors.has(author)) {
      this.authorColors.set(author, this.colorPalette[this.colorIndex % this.colorPalette.length]);
      this.colorIndex++;
    }
    return this.authorColors.get(author)!;
  }
  
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 1) + '…';
  }
  
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  private injectStyles(): void {
    if (document.getElementById('git-blame-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'git-blame-styles';
    style.textContent = `
      /* Blame Gutter */
      .git-blame-gutter {
        position: absolute;
        left: 0;
        top: 0;
        width: 200px;
        height: 100%;
        background: #1e1e1e;
        border-right: 1px solid #3c3c3c;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 12px;
        z-index: 5;
        overflow: hidden;
      }
      
      .blame-line-group {
        cursor: pointer;
      }
      
      .blame-line-group:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      .blame-line {
        display: flex;
        align-items: center;
        height: 19px;
        padding: 0 8px;
        gap: 6px;
      }
      
      .blame-indicator {
        width: 3px;
        height: 14px;
        border-radius: 2px;
        flex-shrink: 0;
      }
      
      .blame-author {
        flex: 1;
        color: #9cdcfe;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .blame-date {
        color: #6a9955;
        font-size: 11px;
        white-space: nowrap;
      }
      
      .blame-line-continuation .blame-indicator {
        opacity: 0.3;
      }
      
      /* Tooltip */
      .git-blame-tooltip {
        position: fixed;
        z-index: 10001;
        background: #252526;
        border: 1px solid #3c3c3c;
        border-radius: 6px;
        padding: 12px;
        min-width: 280px;
        max-width: 400px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.15s ease, visibility 0.15s ease;
      }
      
      .git-blame-tooltip.visible {
        opacity: 1;
        visibility: visible;
      }
      
      .tooltip-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      
      .tooltip-hash {
        font-family: monospace;
        font-size: 12px;
        color: #9cdcfe;
        background: rgba(156, 220, 254, 0.1);
        padding: 2px 6px;
        border-radius: 3px;
      }
      
      .tooltip-date {
        font-size: 11px;
        color: #808080;
      }
      
      .tooltip-message {
        font-size: 13px;
        color: #e0e0e0;
        margin-bottom: 12px;
        line-height: 1.4;
      }
      
      .tooltip-author {
        display: flex;
        align-items: center;
        gap: 10px;
        padding-top: 10px;
        border-top: 1px solid #3c3c3c;
      }
      
      .author-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #007acc;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 14px;
      }
      
      .author-info {
        display: flex;
        flex-direction: column;
      }
      
      .author-name {
        font-size: 13px;
        color: #e0e0e0;
        font-weight: 500;
      }
      
      .author-email {
        font-size: 11px;
        color: #808080;
      }
      
      .tooltip-hint {
        font-size: 10px;
        color: #6a9955;
        margin-top: 10px;
        text-align: center;
      }
      
      /* Blame Dialog */
      .git-blame-dialog {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .blame-dialog-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
      }
      
      .blame-dialog-container {
        position: relative;
        width: 90vw;
        max-width: 1200px;
        height: 85vh;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      }
      
      .blame-dialog-header {
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
      
      .blame-icon {
        font-size: 20px;
      }
      
      .blame-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #e0e0e0;
      }
      
      .blame-file {
        font-size: 12px;
        color: #808080;
      }
      
      .blame-close-btn {
        width: 28px;
        height: 28px;
        border: none;
        background: transparent;
        color: #808080;
        font-size: 16px;
        cursor: pointer;
        border-radius: 4px;
      }
      
      .blame-close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      
      .blame-dialog-content {
        flex: 1;
        display: flex;
        overflow: hidden;
      }
      
      .blame-stats {
        width: 280px;
        border-right: 1px solid #3c3c3c;
        padding: 16px;
        overflow-y: auto;
      }
      
      .stats-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      
      .stats-title {
        font-size: 12px;
        font-weight: 600;
        color: #808080;
        text-transform: uppercase;
      }
      
      .stats-total {
        font-size: 11px;
        color: #6a9955;
      }
      
      .contributor-item {
        padding: 10px 0;
        border-bottom: 1px solid #2d2d30;
      }
      
      .contributor-info {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      
      .contributor-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: 12px;
      }
      
      .contributor-name {
        font-size: 13px;
        color: #e0e0e0;
      }
      
      .contributor-stats {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        color: #808080;
      }
      
      .line-count {
        width: 60px;
      }
      
      .percentage-bar {
        flex: 1;
        height: 4px;
        background: #3c3c3c;
        border-radius: 2px;
        overflow: hidden;
      }
      
      .percentage-fill {
        height: 100%;
        border-radius: 2px;
      }
      
      .percentage {
        width: 35px;
        text-align: right;
      }
      
      .blame-file-content {
        flex: 1;
        overflow: auto;
      }
      
      .blame-lines {
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 13px;
        line-height: 1.5;
      }
      
      .blame-file-line {
        display: flex;
        align-items: center;
        min-height: 22px;
        cursor: pointer;
      }
      
      .blame-file-line:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      .blame-file-line.new-group {
        margin-top: 4px;
        padding-top: 4px;
        border-top: 1px solid #2d2d30;
      }
      
      .line-indicator {
        width: 3px;
        height: 16px;
        flex-shrink: 0;
      }
      
      .line-info {
        width: 120px;
        padding: 0 8px;
        display: flex;
        flex-direction: column;
        font-size: 11px;
      }
      
      .line-info.hidden {
        visibility: hidden;
      }
      
      .line-author {
        color: #9cdcfe;
      }
      
      .line-date {
        color: #6a9955;
      }
      
      .line-num {
        width: 45px;
        text-align: right;
        padding-right: 12px;
        color: #6e7681;
      }
      
      .line-code {
        flex: 1;
        color: #e0e0e0;
        white-space: pre;
      }
    `;
    
    document.head.appendChild(style);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const gitBlameManager = new GitBlameManager();

export default gitBlameManager;
