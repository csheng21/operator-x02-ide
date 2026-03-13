// ide/vsc/gitMergeConflict.ts
// ============================================================================
// GIT MERGE CONFLICT RESOLUTION UI
// Three-way merge view with conflict markers
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPES
// ============================================================================

export interface ConflictFile {
  path: string;
  status: 'conflicted' | 'resolved' | 'unresolved';
  oursContent?: string;
  theirsContent?: string;
  baseContent?: string;
  mergedContent?: string;
}

export interface ConflictMarker {
  startLine: number;
  separatorLine: number;
  endLine: number;
  oursContent: string;
  theirsContent: string;
  baseContent?: string;
}

export interface MergeConflictConfig {
  repoPath: string;
  onResolve?: (file: ConflictFile) => void;
  onAbort?: () => void;
}

// ============================================================================
// CONFLICT PARSER
// ============================================================================

export function parseConflicts(content: string): ConflictMarker[] {
  const conflicts: ConflictMarker[] = [];
  const lines = content.split('\n');
  
  let i = 0;
  while (i < lines.length) {
    // Look for conflict start marker
    if (lines[i].startsWith('<<<<<<<')) {
      const startLine = i;
      let separatorLine = -1;
      let baseSeparatorLine = -1;
      let endLine = -1;
      
      // Find markers
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('|||||||')) {
          baseSeparatorLine = j;
        } else if (lines[j].startsWith('=======')) {
          separatorLine = j;
        } else if (lines[j].startsWith('>>>>>>>')) {
          endLine = j;
          break;
        }
      }
      
      if (separatorLine !== -1 && endLine !== -1) {
        let oursStart = startLine + 1;
        let oursEnd = baseSeparatorLine !== -1 ? baseSeparatorLine : separatorLine;
        let theirsStart = separatorLine + 1;
        
        const oursContent = lines.slice(oursStart, oursEnd).join('\n');
        const theirsContent = lines.slice(theirsStart, endLine).join('\n');
        const baseContent = baseSeparatorLine !== -1 
          ? lines.slice(baseSeparatorLine + 1, separatorLine).join('\n')
          : undefined;
        
        conflicts.push({
          startLine,
          separatorLine,
          endLine,
          oursContent,
          theirsContent,
          baseContent
        });
        
        i = endLine + 1;
        continue;
      }
    }
    i++;
  }
  
  return conflicts;
}

// ============================================================================
// GIT MERGE CONFLICT MANAGER CLASS
// ============================================================================

export class GitMergeConflictManager {
  private dialog: HTMLElement | null = null;
  private config: MergeConflictConfig | null = null;
  private conflictFiles: ConflictFile[] = [];
  private currentFile: ConflictFile | null = null;
  private currentConflicts: ConflictMarker[] = [];
  private resolvedConflicts: Map<number, string> = new Map();
  private editorContent: string = '';
  
  constructor() {
    this.injectStyles();
  }
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  /**
   * Show merge conflict resolution UI
   */
  public async show(config: MergeConflictConfig): Promise<void> {
    this.config = config;
    await this.loadConflictFiles();
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
   * Check if there are merge conflicts
   */
  public async hasConflicts(repoPath: string): Promise<boolean> {
    try {
      const files = await invoke<string[]>('git_get_conflict_files', { path: repoPath });
      return files.length > 0;
    } catch {
      return false;
    }
  }
  
  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  private async loadConflictFiles(): Promise<void> {
    if (!this.config) return;
    
    try {
      const files = await invoke<string[]>('git_get_conflict_files', {
        path: this.config.repoPath
      });
      
      this.conflictFiles = files.map(path => ({
        path,
        status: 'unresolved' as const
      }));
      
    } catch (error) {
      console.error('Failed to load conflict files:', error);
      this.conflictFiles = [];
    }
  }
  
  private async loadFileContent(file: ConflictFile): Promise<void> {
    if (!this.config) return;
    
    try {
      // Get current file content with conflict markers
      const content = await invoke<string>('read_file_content', {
        path: `${this.config.repoPath}/${file.path}`
      });
      
      file.mergedContent = content;
      this.editorContent = content;
      this.currentConflicts = parseConflicts(content);
      this.resolvedConflicts.clear();
      
      // Try to get ours/theirs versions
      try {
        file.oursContent = await invoke<string>('git_show_version', {
          path: this.config.repoPath,
          filePath: file.path,
          version: 'ours'
        });
      } catch { /* May not be available */ }
      
      try {
        file.theirsContent = await invoke<string>('git_show_version', {
          path: this.config.repoPath,
          filePath: file.path,
          version: 'theirs'
        });
      } catch { /* May not be available */ }
      
    } catch (error) {
      console.error('Failed to load file content:', error);
    }
  }
  
  // ============================================================================
  // RENDERING
  // ============================================================================
  
  private render(): void {
    this.close();
    
    this.dialog = document.createElement('div');
    this.dialog.className = 'git-merge-dialog';
    this.dialog.innerHTML = `
      <div class="merge-dialog-backdrop"></div>
      <div class="merge-dialog-container">
        <div class="merge-dialog-header">
          <div class="header-left">
            <span class="merge-icon">⚡</span>
            <h2 class="merge-title">Resolve Merge Conflicts</h2>
            <span class="conflict-count">${this.conflictFiles.length} files with conflicts</span>
          </div>
          <div class="header-actions">
            <button class="header-btn abort-btn" title="Abort merge">✕ Abort Merge</button>
            <button class="merge-close-btn" title="Close">✕</button>
          </div>
        </div>
        
        <div class="merge-dialog-content">
          <div class="conflict-files-panel">
            <div class="panel-header">
              <span class="panel-title">Conflicted Files</span>
            </div>
            <div class="conflict-files-list">
              ${this.renderFileList()}
            </div>
          </div>
          
          <div class="merge-editor-panel">
            ${this.conflictFiles.length > 0 
              ? '<div class="select-file-placeholder">Select a file to resolve conflicts</div>'
              : '<div class="no-conflicts-message">No merge conflicts found</div>'
            }
          </div>
        </div>
        
        <div class="merge-dialog-footer">
          <div class="resolution-progress">
            <span class="progress-text">
              ${this.getResolvedCount()} / ${this.conflictFiles.length} resolved
            </span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${this.getProgressPercent()}%"></div>
            </div>
          </div>
          <div class="footer-actions">
            <button class="footer-btn mark-resolved-btn" disabled>Mark as Resolved</button>
            <button class="footer-btn continue-btn" disabled>Continue Merge</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.dialog);
    this.attachEventListeners();
    
    // Auto-select first file if available
    if (this.conflictFiles.length > 0) {
      this.selectFile(this.conflictFiles[0]);
    }
  }
  
  private renderFileList(): string {
    if (this.conflictFiles.length === 0) {
      return '<div class="no-files">No conflicts</div>';
    }
    
    return this.conflictFiles.map(file => {
      const isSelected = this.currentFile?.path === file.path;
      const statusIcon = file.status === 'resolved' ? '✓' : '!';
      const statusClass = file.status === 'resolved' ? 'resolved' : 'unresolved';
      
      return `
        <div class="conflict-file-item ${isSelected ? 'selected' : ''} ${statusClass}"
             data-path="${this.escapeAttr(file.path)}">
          <span class="file-status-icon">${statusIcon}</span>
          <span class="file-path">${this.escapeHtml(file.path)}</span>
        </div>
      `;
    }).join('');
  }
  
  private renderMergeEditor(): void {
    const editorPanel = this.dialog?.querySelector('.merge-editor-panel');
    if (!editorPanel || !this.currentFile) return;
    
    const hasConflicts = this.currentConflicts.length > 0;
    
    editorPanel.innerHTML = `
      <div class="merge-editor">
        <div class="editor-toolbar">
          <div class="toolbar-left">
            <span class="current-file">${this.escapeHtml(this.currentFile.path)}</span>
            <span class="conflict-indicator">
              ${this.currentConflicts.length} conflict${this.currentConflicts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div class="toolbar-actions">
            <button class="toolbar-btn accept-ours-all" title="Accept all ours">
              Accept All Ours
            </button>
            <button class="toolbar-btn accept-theirs-all" title="Accept all theirs">
              Accept All Theirs
            </button>
            <button class="toolbar-btn view-diff" title="View side-by-side">
              Side by Side
            </button>
          </div>
        </div>
        
        <div class="merge-view-container">
          ${hasConflicts ? this.renderConflictView() : this.renderResolvedView()}
        </div>
        
        <div class="editor-footer">
          <div class="conflict-navigation">
            <button class="nav-btn prev-conflict" title="Previous conflict">↑ Prev</button>
            <span class="conflict-counter">
              ${this.getUnresolvedCount()} remaining
            </span>
            <button class="nav-btn next-conflict" title="Next conflict">↓ Next</button>
          </div>
          <div class="editor-actions">
            <button class="editor-btn save-btn">Save</button>
          </div>
        </div>
      </div>
    `;
    
    this.attachEditorListeners();
  }
  
  private renderConflictView(): string {
    let html = '<div class="conflict-editor">';
    const lines = this.editorContent.split('\n');
    let lineNum = 1;
    let conflictIndex = 0;
    let i = 0;
    
    while (i < lines.length) {
      const conflict = this.currentConflicts.find(c => c.startLine === i);
      
      if (conflict) {
        const isResolved = this.resolvedConflicts.has(conflictIndex);
        const resolvedContent = this.resolvedConflicts.get(conflictIndex);
        
        html += `
          <div class="conflict-block ${isResolved ? 'resolved' : ''}" data-conflict-index="${conflictIndex}">
            <div class="conflict-header">
              <span class="conflict-label">Conflict #${conflictIndex + 1}</span>
              ${!isResolved ? `
                <div class="conflict-actions">
                  <button class="conflict-btn accept-ours" data-index="${conflictIndex}">
                    Accept Ours (Current)
                  </button>
                  <button class="conflict-btn accept-theirs" data-index="${conflictIndex}">
                    Accept Theirs (Incoming)
                  </button>
                  <button class="conflict-btn accept-both" data-index="${conflictIndex}">
                    Accept Both
                  </button>
                </div>
              ` : `
                <button class="conflict-btn undo-resolve" data-index="${conflictIndex}">
                  Undo
                </button>
              `}
            </div>
            
            ${isResolved ? `
              <div class="resolved-content">
                <div class="content-label resolved-label">Resolved:</div>
                <pre class="content-preview resolved-preview">${this.escapeHtml(resolvedContent || '')}</pre>
              </div>
            ` : `
              <div class="conflict-sides">
                <div class="conflict-side ours-side">
                  <div class="side-header ours-header">
                    <span class="side-label">Current Changes (Ours)</span>
                  </div>
                  <pre class="side-content">${this.escapeHtml(conflict.oursContent)}</pre>
                </div>
                <div class="conflict-side theirs-side">
                  <div class="side-header theirs-header">
                    <span class="side-label">Incoming Changes (Theirs)</span>
                  </div>
                  <pre class="side-content">${this.escapeHtml(conflict.theirsContent)}</pre>
                </div>
              </div>
            `}
          </div>
        `;
        
        conflictIndex++;
        i = conflict.endLine + 1;
      } else {
        // Regular line
        html += `
          <div class="content-line">
            <span class="line-num">${lineNum}</span>
            <span class="line-content">${this.escapeHtml(lines[i])}</span>
          </div>
        `;
        lineNum++;
        i++;
      }
    }
    
    html += '</div>';
    return html;
  }
  
  private renderResolvedView(): string {
    return `
      <div class="all-resolved-message">
        <span class="resolved-icon">✓</span>
        <span>All conflicts resolved!</span>
        <button class="save-resolved-btn">Save & Mark Resolved</button>
      </div>
    `;
  }
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  private attachEventListeners(): void {
    if (!this.dialog) return;
    
    // Close
    this.dialog.querySelector('.merge-close-btn')?.addEventListener('click', () => this.close());
    this.dialog.querySelector('.merge-dialog-backdrop')?.addEventListener('click', () => this.close());
    
    // Abort merge
    this.dialog.querySelector('.abort-btn')?.addEventListener('click', () => this.abortMerge());
    
    // File selection
    this.dialog.querySelectorAll('.conflict-file-item').forEach(item => {
      item.addEventListener('click', () => {
        const path = (item as HTMLElement).dataset.path;
        const file = this.conflictFiles.find(f => f.path === path);
        if (file) this.selectFile(file);
      });
    });
    
    // Mark resolved
    this.dialog.querySelector('.mark-resolved-btn')?.addEventListener('click', () => {
      if (this.currentFile) this.markFileResolved(this.currentFile);
    });
    
    // Continue merge
    this.dialog.querySelector('.continue-btn')?.addEventListener('click', () => this.continueMerge());
    
    // Keyboard
    document.addEventListener('keydown', this.handleKeyDown);
  }
  
  private attachEditorListeners(): void {
    if (!this.dialog) return;
    
    // Accept ours/theirs buttons for each conflict
    this.dialog.querySelectorAll('.accept-ours').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        this.resolveConflict(index, 'ours');
      });
    });
    
    this.dialog.querySelectorAll('.accept-theirs').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        this.resolveConflict(index, 'theirs');
      });
    });
    
    this.dialog.querySelectorAll('.accept-both').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        this.resolveConflict(index, 'both');
      });
    });
    
    this.dialog.querySelectorAll('.undo-resolve').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        this.undoResolve(index);
      });
    });
    
    // Accept all buttons
    this.dialog.querySelector('.accept-ours-all')?.addEventListener('click', () => this.acceptAll('ours'));
    this.dialog.querySelector('.accept-theirs-all')?.addEventListener('click', () => this.acceptAll('theirs'));
    
    // Navigation
    this.dialog.querySelector('.prev-conflict')?.addEventListener('click', () => this.navigateConflict(-1));
    this.dialog.querySelector('.next-conflict')?.addEventListener('click', () => this.navigateConflict(1));
    
    // Save
    this.dialog.querySelector('.save-btn')?.addEventListener('click', () => this.saveFile());
    this.dialog.querySelector('.save-resolved-btn')?.addEventListener('click', () => {
      this.saveFile();
      if (this.currentFile) this.markFileResolved(this.currentFile);
    });
  }
  
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.dialog) return;
    
    if (e.key === 'Escape') {
      this.close();
    }
  };
  
  // ============================================================================
  // CONFLICT RESOLUTION
  // ============================================================================
  
  private async selectFile(file: ConflictFile): Promise<void> {
    this.currentFile = file;
    await this.loadFileContent(file);
    
    // Update file list UI
    this.dialog?.querySelectorAll('.conflict-file-item').forEach(item => {
      item.classList.toggle('selected', (item as HTMLElement).dataset.path === file.path);
    });
    
    this.renderMergeEditor();
    this.updateButtons();
  }
  
  private resolveConflict(index: number, choice: 'ours' | 'theirs' | 'both'): void {
    const conflict = this.currentConflicts[index];
    if (!conflict) return;
    
    let resolvedContent: string;
    
    switch (choice) {
      case 'ours':
        resolvedContent = conflict.oursContent;
        break;
      case 'theirs':
        resolvedContent = conflict.theirsContent;
        break;
      case 'both':
        resolvedContent = conflict.oursContent + '\n' + conflict.theirsContent;
        break;
    }
    
    this.resolvedConflicts.set(index, resolvedContent);
    this.updateEditorContent();
    this.renderMergeEditor();
    this.updateButtons();
  }
  
  private undoResolve(index: number): void {
    this.resolvedConflicts.delete(index);
    this.renderMergeEditor();
    this.updateButtons();
  }
  
  private acceptAll(choice: 'ours' | 'theirs'): void {
    for (let i = 0; i < this.currentConflicts.length; i++) {
      if (!this.resolvedConflicts.has(i)) {
        this.resolveConflict(i, choice);
      }
    }
  }
  
  private updateEditorContent(): void {
    // Rebuild content with resolved conflicts
    const lines = this.editorContent.split('\n');
    const result: string[] = [];
    let i = 0;
    let conflictIndex = 0;
    
    while (i < lines.length) {
      const conflict = this.currentConflicts.find(c => c.startLine === i);
      
      if (conflict) {
        if (this.resolvedConflicts.has(conflictIndex)) {
          // Insert resolved content
          result.push(this.resolvedConflicts.get(conflictIndex)!);
        } else {
          // Keep conflict markers
          for (let j = conflict.startLine; j <= conflict.endLine; j++) {
            result.push(lines[j]);
          }
        }
        i = conflict.endLine + 1;
        conflictIndex++;
      } else {
        result.push(lines[i]);
        i++;
      }
    }
    
    this.editorContent = result.join('\n');
  }
  
  private navigateConflict(direction: number): void {
    const blocks = this.dialog?.querySelectorAll('.conflict-block:not(.resolved)');
    if (!blocks || blocks.length === 0) return;
    
    // Find current visible conflict
    let currentIndex = 0;
    
    // Navigate
    const targetIndex = Math.max(0, Math.min(blocks.length - 1, currentIndex + direction));
    blocks[targetIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  
  private async saveFile(): Promise<void> {
    if (!this.config || !this.currentFile) return;
    
    // Ensure all conflicts are resolved before saving
    if (this.getUnresolvedCount() > 0) {
      alert('Please resolve all conflicts before saving.');
      return;
    }
    
    // Rebuild final content
    this.updateEditorContent();
    
    try {
      await invoke('write_file_content', {
        path: `${this.config.repoPath}/${this.currentFile.path}`,
        content: this.editorContent
      });
      
      console.log('File saved:', this.currentFile.path);
    } catch (error) {
      console.error('Failed to save file:', error);
      alert(`Failed to save: ${error}`);
    }
  }
  
  private async markFileResolved(file: ConflictFile): Promise<void> {
    if (!this.config) return;
    
    try {
      await invoke('git_resolve', {
        path: this.config.repoPath,
        files: [file.path]
      });
      
      file.status = 'resolved';
      this.config.onResolve?.(file);
      
      // Update UI
      this.updateFileList();
      this.updateProgress();
      this.updateButtons();
      
      // Move to next unresolved file
      const nextUnresolved = this.conflictFiles.find(f => f.status !== 'resolved');
      if (nextUnresolved) {
        this.selectFile(nextUnresolved);
      }
      
    } catch (error) {
      console.error('Failed to mark as resolved:', error);
    }
  }
  
  private async abortMerge(): Promise<void> {
    if (!this.config) return;
    
    const confirmed = confirm('Abort the merge?\n\nAll conflict resolutions will be lost.');
    if (!confirmed) return;
    
    try {
      await invoke('git_merge_abort', {
        path: this.config.repoPath
      });
      
      this.config.onAbort?.();
      this.close();
      
    } catch (error) {
      console.error('Failed to abort merge:', error);
      alert(`Failed to abort: ${error}`);
    }
  }
  
  private async continueMerge(): Promise<void> {
    if (!this.config) return;
    
    // Check all files are resolved
    const unresolved = this.conflictFiles.filter(f => f.status !== 'resolved');
    if (unresolved.length > 0) {
      alert(`${unresolved.length} file(s) still have unresolved conflicts.`);
      return;
    }
    
    try {
      // Stage all resolved files
      await invoke('git_add', {
        path: this.config.repoPath,
        files: this.conflictFiles.map(f => f.path)
      });
      
      // Continue/commit merge
      await invoke('git_commit', {
        path: this.config.repoPath,
        message: 'Merge conflict resolution'
      });
      
      this.close();
      
    } catch (error) {
      console.error('Failed to continue merge:', error);
      alert(`Failed to continue: ${error}`);
    }
  }
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
  private updateFileList(): void {
    const listContainer = this.dialog?.querySelector('.conflict-files-list');
    if (listContainer) {
      listContainer.innerHTML = this.renderFileList();
      
      // Re-attach listeners
      listContainer.querySelectorAll('.conflict-file-item').forEach(item => {
        item.addEventListener('click', () => {
          const path = (item as HTMLElement).dataset.path;
          const file = this.conflictFiles.find(f => f.path === path);
          if (file) this.selectFile(file);
        });
      });
    }
  }
  
  private updateProgress(): void {
    const progressText = this.dialog?.querySelector('.progress-text');
    const progressFill = this.dialog?.querySelector('.progress-fill') as HTMLElement;
    const conflictCount = this.dialog?.querySelector('.conflict-count');
    
    if (progressText) {
      progressText.textContent = `${this.getResolvedCount()} / ${this.conflictFiles.length} resolved`;
    }
    
    if (progressFill) {
      progressFill.style.width = `${this.getProgressPercent()}%`;
    }
    
    if (conflictCount) {
      conflictCount.textContent = `${this.conflictFiles.length} files with conflicts`;
    }
  }
  
  private updateButtons(): void {
    const markResolvedBtn = this.dialog?.querySelector('.mark-resolved-btn') as HTMLButtonElement;
    const continueBtn = this.dialog?.querySelector('.continue-btn') as HTMLButtonElement;
    
    if (markResolvedBtn) {
      const allConflictsResolved = this.getUnresolvedCount() === 0;
      markResolvedBtn.disabled = !allConflictsResolved || !this.currentFile;
    }
    
    if (continueBtn) {
      const allFilesResolved = this.conflictFiles.every(f => f.status === 'resolved');
      continueBtn.disabled = !allFilesResolved;
    }
  }
  
  private getResolvedCount(): number {
    return this.conflictFiles.filter(f => f.status === 'resolved').length;
  }
  
  private getUnresolvedCount(): number {
    return this.currentConflicts.length - this.resolvedConflicts.size;
  }
  
  private getProgressPercent(): number {
    if (this.conflictFiles.length === 0) return 100;
    return Math.round((this.getResolvedCount() / this.conflictFiles.length) * 100);
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
    if (document.getElementById('git-merge-conflict-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'git-merge-conflict-styles';
    style.textContent = `
      .git-merge-dialog {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .merge-dialog-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(2px);
      }
      
      .merge-dialog-container {
        position: relative;
        width: 95vw;
        max-width: 1400px;
        height: 90vh;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      }
      
      .merge-dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        background: #252526;
        border-bottom: 1px solid #3c3c3c;
        border-radius: 8px 8px 0 0;
      }
      
      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .merge-icon {
        font-size: 24px;
        color: #e3b341;
      }
      
      .merge-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #e0e0e0;
      }
      
      .conflict-count {
        font-size: 12px;
        color: #e3b341;
        background: rgba(227, 179, 65, 0.2);
        padding: 4px 10px;
        border-radius: 12px;
      }
      
      .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .header-btn {
        padding: 6px 14px;
        background: #3c3c3c;
        border: 1px solid #505050;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 12px;
        cursor: pointer;
      }
      
      .header-btn:hover {
        background: #505050;
      }
      
      .abort-btn {
        color: #dc5050;
        border-color: rgba(220, 80, 80, 0.5);
      }
      
      .abort-btn:hover {
        background: rgba(220, 80, 80, 0.2);
      }
      
      .merge-close-btn {
        width: 28px;
        height: 28px;
        border: none;
        background: transparent;
        color: #808080;
        font-size: 16px;
        cursor: pointer;
        border-radius: 4px;
      }
      
      .merge-close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      
      .merge-dialog-content {
        flex: 1;
        display: flex;
        overflow: hidden;
      }
      
      .conflict-files-panel {
        width: 280px;
        border-right: 1px solid #3c3c3c;
        display: flex;
        flex-direction: column;
        background: #252526;
      }
      
      .panel-header {
        padding: 12px 16px;
        border-bottom: 1px solid #3c3c3c;
      }
      
      .panel-title {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #808080;
      }
      
      .conflict-files-list {
        flex: 1;
        overflow-y: auto;
      }
      
      .conflict-file-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        cursor: pointer;
        border-bottom: 1px solid #2d2d30;
      }
      
      .conflict-file-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      .conflict-file-item.selected {
        background: rgba(0, 122, 204, 0.2);
        border-left: 3px solid #007acc;
      }
      
      .conflict-file-item.resolved {
        opacity: 0.7;
      }
      
      .file-status-icon {
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        font-size: 10px;
        font-weight: bold;
      }
      
      .conflict-file-item.unresolved .file-status-icon {
        background: rgba(227, 179, 65, 0.2);
        color: #e3b341;
      }
      
      .conflict-file-item.resolved .file-status-icon {
        background: rgba(75, 180, 95, 0.2);
        color: #4bb45f;
      }
      
      .file-path {
        flex: 1;
        font-size: 12px;
        color: #e0e0e0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .merge-editor-panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .select-file-placeholder, .no-conflicts-message {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #808080;
        font-size: 14px;
      }
      
      .merge-editor {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      
      .editor-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        background: #252526;
        border-bottom: 1px solid #3c3c3c;
      }
      
      .toolbar-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .current-file {
        font-weight: 600;
        color: #e0e0e0;
      }
      
      .conflict-indicator {
        font-size: 12px;
        color: #e3b341;
      }
      
      .toolbar-actions {
        display: flex;
        gap: 8px;
      }
      
      .toolbar-btn {
        padding: 5px 10px;
        background: #3c3c3c;
        border: 1px solid #505050;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 11px;
        cursor: pointer;
      }
      
      .toolbar-btn:hover {
        background: #505050;
      }
      
      .merge-view-container {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }
      
      .conflict-editor {
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 13px;
        line-height: 1.5;
      }
      
      .content-line {
        display: flex;
        min-height: 22px;
      }
      
      .line-num {
        width: 50px;
        text-align: right;
        padding-right: 12px;
        color: #6e7681;
        user-select: none;
      }
      
      .line-content {
        flex: 1;
        white-space: pre;
      }
      
      .conflict-block {
        margin: 16px 0;
        border: 1px solid #e3b341;
        border-radius: 6px;
        overflow: hidden;
      }
      
      .conflict-block.resolved {
        border-color: #4bb45f;
      }
      
      .conflict-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: rgba(227, 179, 65, 0.1);
      }
      
      .conflict-block.resolved .conflict-header {
        background: rgba(75, 180, 95, 0.1);
      }
      
      .conflict-label {
        font-size: 12px;
        font-weight: 600;
        color: #e3b341;
      }
      
      .conflict-block.resolved .conflict-label {
        color: #4bb45f;
      }
      
      .conflict-actions {
        display: flex;
        gap: 6px;
      }
      
      .conflict-btn {
        padding: 4px 10px;
        background: #3c3c3c;
        border: 1px solid #505050;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 11px;
        cursor: pointer;
      }
      
      .conflict-btn:hover {
        background: #505050;
      }
      
      .conflict-sides {
        display: flex;
      }
      
      .conflict-side {
        flex: 1;
      }
      
      .ours-side {
        border-right: 1px solid #3c3c3c;
      }
      
      .side-header {
        padding: 6px 12px;
        font-size: 11px;
        font-weight: 600;
      }
      
      .ours-header {
        background: rgba(75, 180, 95, 0.15);
        color: #4bb45f;
      }
      
      .theirs-header {
        background: rgba(0, 122, 204, 0.15);
        color: #007acc;
      }
      
      .side-content {
        padding: 12px;
        margin: 0;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 12px;
        white-space: pre-wrap;
        background: rgba(0, 0, 0, 0.2);
        min-height: 40px;
      }
      
      .resolved-content {
        padding: 12px;
      }
      
      .resolved-label {
        font-size: 11px;
        color: #4bb45f;
        margin-bottom: 8px;
      }
      
      .resolved-preview {
        padding: 12px;
        margin: 0;
        background: rgba(75, 180, 95, 0.1);
        border-radius: 4px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 12px;
        white-space: pre-wrap;
      }
      
      .editor-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        background: #252526;
        border-top: 1px solid #3c3c3c;
      }
      
      .conflict-navigation {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .nav-btn {
        padding: 5px 10px;
        background: #3c3c3c;
        border: 1px solid #505050;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 11px;
        cursor: pointer;
      }
      
      .nav-btn:hover {
        background: #505050;
      }
      
      .conflict-counter {
        font-size: 12px;
        color: #808080;
      }
      
      .editor-btn {
        padding: 6px 16px;
        background: #007acc;
        border: none;
        border-radius: 4px;
        color: #fff;
        font-size: 12px;
        cursor: pointer;
      }
      
      .editor-btn:hover {
        background: #0098ff;
      }
      
      .all-resolved-message {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 16px;
        color: #4bb45f;
      }
      
      .resolved-icon {
        font-size: 48px;
      }
      
      .save-resolved-btn {
        padding: 8px 20px;
        background: #4bb45f;
        border: none;
        border-radius: 4px;
        color: #fff;
        font-size: 13px;
        cursor: pointer;
      }
      
      .save-resolved-btn:hover {
        background: #5cc96f;
      }
      
      .merge-dialog-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        background: #252526;
        border-top: 1px solid #3c3c3c;
        border-radius: 0 0 8px 8px;
      }
      
      .resolution-progress {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .progress-text {
        font-size: 12px;
        color: #808080;
      }
      
      .progress-bar {
        width: 150px;
        height: 6px;
        background: #3c3c3c;
        border-radius: 3px;
        overflow: hidden;
      }
      
      .progress-fill {
        height: 100%;
        background: #4bb45f;
        transition: width 0.3s ease;
      }
      
      .footer-actions {
        display: flex;
        gap: 8px;
      }
      
      .footer-btn {
        padding: 8px 16px;
        background: #3c3c3c;
        border: 1px solid #505050;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 12px;
        cursor: pointer;
      }
      
      .footer-btn:hover:not(:disabled) {
        background: #505050;
      }
      
      .footer-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .continue-btn {
        background: #007acc;
        border-color: #007acc;
        color: #fff;
      }
      
      .continue-btn:hover:not(:disabled) {
        background: #0098ff;
      }
    `;
    
    document.head.appendChild(style);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const gitMergeConflictManager = new GitMergeConflictManager();

export default gitMergeConflictManager;
