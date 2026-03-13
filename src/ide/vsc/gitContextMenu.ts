// src/ide/vsc/gitContextMenu.ts
// Git Context Menu Integration
// FIXED: Import paths for flat folder structure

import { gitManager } from './gitManager';
import { gitUIEnhanced } from './gitUIEnhanced';

/**
 * Git Context Menu - Adds Git options to file explorer right-click menu
 */
class GitContextMenu {
  private static instance: GitContextMenu;
  private currentPath: string = '';
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): GitContextMenu {
    if (!GitContextMenu.instance) {
      GitContextMenu.instance = new GitContextMenu();
    }
    return GitContextMenu.instance;
  }

  /**
   * Initialize context menu for repository
   */
  async initialize(path: string): Promise<void> {
    console.log('🔷 [GitContextMenu] Initializing for:', path);
    this.currentPath = path;
    this.isInitialized = true;
    this.setupContextMenuHandlers();
  }

  /**
   * Setup context menu event handlers
   */
  private setupContextMenuHandlers(): void {
    // Listen for context menu events
    document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
  }

  /**
   * Handle context menu event
   */
  private handleContextMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Check if target is a file in the explorer
    const fileItem = target.closest('.file-tree-item, .file-item, [data-path]');
    if (!fileItem) return;

    const filePath = fileItem.getAttribute('data-path');
    if (!filePath) return;

    // Check if we're in a Git repository
    if (!this.isInitialized) return;

    // Add Git context menu items
    this.addGitMenuItems(event, filePath);
  }

  /**
   * Add Git menu items to context menu
   */
  private addGitMenuItems(event: MouseEvent, filePath: string): void {
    // Wait for context menu to appear
    setTimeout(() => {
      const contextMenu = document.querySelector('.context-menu, .custom-context-menu');
      if (!contextMenu) return;

      // Check if Git items already added
      if (contextMenu.querySelector('.git-menu-item')) return;

      // Add separator
      const separator = document.createElement('div');
      separator.className = 'context-menu-separator';
      separator.style.cssText = 'height: 1px; background: #3c3c3c; margin: 4px 0;';
      contextMenu.appendChild(separator);

      // Add Git menu items
      const gitItems = [
        { label: 'Git: Stage File', icon: '➕', action: () => this.stageFile(filePath) },
        { label: 'Git: Unstage File', icon: '➖', action: () => this.unstageFile(filePath) },
        { label: 'Git: Discard Changes', icon: '↩️', action: () => this.discardChanges(filePath) },
        { label: 'Git: View Diff', icon: '📄', action: () => this.viewDiff(filePath) },
        { label: 'Git: View History', icon: '📜', action: () => this.viewHistory(filePath) },
        { label: 'Git: Blame', icon: '👤', action: () => this.viewBlame(filePath) },
      ];

      gitItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item git-menu-item';
        menuItem.innerHTML = `<span style="margin-right: 8px;">${item.icon}</span>${item.label}`;
        menuItem.style.cssText = `
          padding: 6px 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          font-size: 13px;
        `;
        menuItem.onmouseenter = () => menuItem.style.background = 'rgba(255,255,255,0.1)';
        menuItem.onmouseleave = () => menuItem.style.background = 'transparent';
        menuItem.onclick = () => {
          item.action();
          contextMenu.remove();
        };
        contextMenu.appendChild(menuItem);
      });
    }, 10);
  }

  /**
   * Stage a file
   */
  private async stageFile(filePath: string): Promise<void> {
    try {
      const relativePath = this.getRelativePath(filePath);
      await gitManager.stage([relativePath]);
      console.log('✅ [Git] Staged:', relativePath);
      this.showNotification(`Staged: ${relativePath}`);
    } catch (error) {
      console.error('❌ [Git] Failed to stage:', error);
      this.showNotification(`Failed to stage: ${error}`, 'error');
    }
  }

  /**
   * Unstage a file
   */
  private async unstageFile(filePath: string): Promise<void> {
    try {
      const relativePath = this.getRelativePath(filePath);
      await gitManager.unstage([relativePath]);
      console.log('✅ [Git] Unstaged:', relativePath);
      this.showNotification(`Unstaged: ${relativePath}`);
    } catch (error) {
      console.error('❌ [Git] Failed to unstage:', error);
      this.showNotification(`Failed to unstage: ${error}`, 'error');
    }
  }

  /**
   * Discard changes to a file
   */
  private async discardChanges(filePath: string): Promise<void> {
    const confirmed = confirm(`Discard all changes to ${this.getFileName(filePath)}?\n\nThis cannot be undone!`);
    if (!confirmed) return;

    try {
      const relativePath = this.getRelativePath(filePath);
      await gitManager.checkoutFile(relativePath);
      console.log('✅ [Git] Discarded changes:', relativePath);
      this.showNotification(`Discarded changes: ${relativePath}`);
    } catch (error) {
      console.error('❌ [Git] Failed to discard changes:', error);
      this.showNotification(`Failed to discard: ${error}`, 'error');
    }
  }

  /**
   * View diff for a file
   */
  private async viewDiff(filePath: string): Promise<void> {
    try {
      const relativePath = this.getRelativePath(filePath);
      const diff = await gitManager.getDiff(relativePath);
      
      if (!diff.trim()) {
        this.showNotification('No changes to show');
        return;
      }

      // Show diff in a modal or panel
      this.showDiffModal(relativePath, diff);
    } catch (error) {
      console.error('❌ [Git] Failed to get diff:', error);
      this.showNotification(`Failed to get diff: ${error}`, 'error');
    }
  }

  /**
   * View file history
   */
  private async viewHistory(filePath: string): Promise<void> {
    try {
      const relativePath = this.getRelativePath(filePath);
      const history = await gitManager.getFileLog(relativePath, 20);
      
      if (history.length === 0) {
        this.showNotification('No history found');
        return;
      }

      // Show history in Git UI panel
      gitUIEnhanced.show(this.currentPath);
      // TODO: Navigate to history tab and filter by file
    } catch (error) {
      console.error('❌ [Git] Failed to get history:', error);
      this.showNotification(`Failed to get history: ${error}`, 'error');
    }
  }

  /**
   * View blame for a file
   */
  private async viewBlame(filePath: string): Promise<void> {
    try {
      const relativePath = this.getRelativePath(filePath);
      const blame = await gitManager.blame(relativePath);
      
      // Show blame in a modal
      this.showBlameModal(relativePath, blame);
    } catch (error) {
      console.error('❌ [Git] Failed to get blame:', error);
      this.showNotification(`Failed to get blame: ${error}`, 'error');
    }
  }

  /**
   * Get relative path from repository root
   */
  private getRelativePath(fullPath: string): string {
    const normalizedPath = fullPath.replace(/\\/g, '/');
    const normalizedRoot = this.currentPath.replace(/\\/g, '/');
    
    if (normalizedPath.startsWith(normalizedRoot)) {
      return normalizedPath.substring(normalizedRoot.length).replace(/^\//, '');
    }
    return normalizedPath;
  }

  /**
   * Get file name from path
   */
  private getFileName(path: string): string {
    return path.split(/[/\\]/).pop() || path;
  }

  /**
   * Show notification
   */
  private showNotification(message: string, type: 'info' | 'error' = 'info'): void {
    const notification = document.createElement('div');
    notification.className = `git-notification git-notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 60px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'error' ? '#c53030' : '#2d5a2d'};
      color: white;
      border-radius: 6px;
      font-size: 13px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  /**
   * Show diff modal
   */
  private showDiffModal(fileName: string, diff: string): void {
    const modal = document.createElement('div');
    modal.className = 'git-diff-modal';
    modal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      ">
        <div style="
          background: #1e1e1e;
          border-radius: 8px;
          width: 80%;
          max-width: 900px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        ">
          <div style="
            padding: 16px;
            border-bottom: 1px solid #3c3c3c;
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <h3 style="margin: 0; color: #e0e0e0;">Diff: ${fileName}</h3>
            <button style="
              background: none;
              border: none;
              color: #808080;
              font-size: 20px;
              cursor: pointer;
            " onclick="this.closest('.git-diff-modal').remove()">×</button>
          </div>
          <pre style="
            margin: 0;
            padding: 16px;
            overflow: auto;
            font-family: 'Cascadia Code', 'Fira Code', monospace;
            font-size: 12px;
            line-height: 1.5;
            color: #d4d4d4;
          ">${this.formatDiff(diff)}</pre>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => {
      if (e.target === modal.firstElementChild) {
        modal.remove();
      }
    };
  }

  /**
   * Format diff with syntax highlighting
   */
  private formatDiff(diff: string): string {
    return diff
      .split('\n')
      .map(line => {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          return `<span style="color: #4ec9b0;">${this.escapeHtml(line)}</span>`;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          return `<span style="color: #f48771;">${this.escapeHtml(line)}</span>`;
        } else if (line.startsWith('@@')) {
          return `<span style="color: #569cd6;">${this.escapeHtml(line)}</span>`;
        }
        return this.escapeHtml(line);
      })
      .join('\n');
  }

  /**
   * Show blame modal
   */
  private showBlameModal(fileName: string, blame: string): void {
    const modal = document.createElement('div');
    modal.className = 'git-blame-modal';
    modal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      ">
        <div style="
          background: #1e1e1e;
          border-radius: 8px;
          width: 80%;
          max-width: 900px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        ">
          <div style="
            padding: 16px;
            border-bottom: 1px solid #3c3c3c;
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <h3 style="margin: 0; color: #e0e0e0;">Blame: ${fileName}</h3>
            <button style="
              background: none;
              border: none;
              color: #808080;
              font-size: 20px;
              cursor: pointer;
            " onclick="this.closest('.git-blame-modal').remove()">×</button>
          </div>
          <pre style="
            margin: 0;
            padding: 16px;
            overflow: auto;
            font-family: 'Cascadia Code', 'Fira Code', monospace;
            font-size: 11px;
            line-height: 1.4;
            color: #d4d4d4;
          ">${this.escapeHtml(blame)}</pre>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => {
      if (e.target === modal.firstElementChild) {
        modal.remove();
      }
    };
  }

  /**
   * Escape HTML characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Export singleton instance
export const gitContextMenu = GitContextMenu.getInstance();
export { GitContextMenu };
