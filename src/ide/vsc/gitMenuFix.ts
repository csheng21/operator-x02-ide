// src/ide/vsc/gitMenuFix.ts
// ============================================================================
// GIT MENU FIX - File Picker Dialog + Fixed Menu Handlers
// ============================================================================
// This file fixes the Git menu to show a file picker when no file is open
// for Diff Viewer and Git Blame options.
//
// INSTALLATION:
// 1. Add this file to src/ide/vsc/
// 2. Import in main.ts: import { initGitMenuFix } from './ide/vsc/gitMenuFix';
// 3. Call initGitMenuFix() after other initializations
//
// OR: Copy the handleGitMenuAction function to replace the one in menuSystem.ts
// ============================================================================

import { invoke } from '@tauri-apps/api/core';
import { gitManager } from './gitManager';

// ============================================================================
// STYLES INJECTION
// ============================================================================

function injectGitMenuStyles(): void {
  if (document.getElementById('git-menu-fix-styles')) return;

  const style = document.createElement('style');
  style.id = 'git-menu-fix-styles';
  style.textContent = `
    /* File Picker Overlay */
    .git-file-picker-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      animation: gitPickerFadeIn 0.15s ease;
    }

    @keyframes gitPickerFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* File Picker Dialog */
    .git-file-picker {
      background: #252526;
      border: 1px solid #3c3c3c;
      border-radius: 8px;
      width: 550px;
      max-width: 90vw;
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      animation: gitPickerSlideIn 0.2s ease;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    @keyframes gitPickerSlideIn {
      from { transform: translateY(-20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* Header */
    .git-file-picker-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid #3c3c3c;
      background: #2d2d2d;
      border-radius: 8px 8px 0 0;
    }

    .git-file-picker-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 600;
      color: #e0e0e0;
    }

    .git-file-picker-close {
      background: none;
      border: none;
      color: #808080;
      font-size: 20px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.15s;
      line-height: 1;
    }

    .git-file-picker-close:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #e0e0e0;
    }

    /* Search */
    .git-file-picker-search {
      padding: 12px 16px;
      border-bottom: 1px solid #3c3c3c;
    }

    .git-file-picker-search input {
      width: 100%;
      padding: 10px 14px;
      background: #3c3c3c;
      border: 1px solid #555;
      border-radius: 6px;
      color: #e0e0e0;
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s;
    }

    .git-file-picker-search input:focus {
      border-color: #0e639c;
    }

    .git-file-picker-search input::placeholder {
      color: #808080;
    }

    /* File List */
    .git-file-picker-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      max-height: 400px;
    }

    .git-file-picker-list::-webkit-scrollbar {
      width: 8px;
    }

    .git-file-picker-list::-webkit-scrollbar-thumb {
      background: #555;
      border-radius: 4px;
    }

    .git-file-picker-list::-webkit-scrollbar-thumb:hover {
      background: #666;
    }

    /* File Item */
    .git-file-picker-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s;
      margin-bottom: 2px;
    }

    .git-file-picker-item:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .git-file-picker-item.selected {
      background: rgba(14, 99, 156, 0.3);
    }

    /* Status Badge */
    .git-file-picker-status {
      min-width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .git-file-picker-status.modified {
      background: rgba(220, 180, 90, 0.2);
      color: #dcdcaa;
    }

    .git-file-picker-status.added {
      background: rgba(78, 201, 176, 0.2);
      color: #4ec9b0;
    }

    .git-file-picker-status.deleted {
      background: rgba(244, 135, 113, 0.2);
      color: #f48771;
    }

    .git-file-picker-status.untracked {
      background: rgba(79, 193, 255, 0.2);
      color: #4fc1ff;
    }

    .git-file-picker-status.renamed {
      background: rgba(86, 156, 214, 0.2);
      color: #569cd6;
    }

    .git-file-picker-status.tracked {
      background: rgba(128, 128, 128, 0.2);
      color: #808080;
    }

    /* File Path */
    .git-file-picker-path {
      flex: 1;
      font-size: 13px;
      color: #e0e0e0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .git-file-picker-dir {
      color: #808080;
      font-size: 11px;
      margin-left: 6px;
    }

    /* Footer */
    .git-file-picker-footer {
      padding: 12px 16px;
      border-top: 1px solid #3c3c3c;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #808080;
      background: #2d2d2d;
      border-radius: 0 0 8px 8px;
    }

    .git-file-picker-hint {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .git-file-picker-hint kbd {
      background: #3c3c3c;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-family: monospace;
    }

    /* Empty State */
    .git-file-picker-empty {
      text-align: center;
      padding: 40px 20px;
      color: #808080;
    }

    .git-file-picker-empty-icon {
      font-size: 48px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    /* Loading State */
    .git-file-picker-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: #808080;
      gap: 12px;
    }

    .git-file-picker-spinner {
      width: 24px;
      height: 24px;
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-top-color: #0e639c;
      border-radius: 50%;
      animation: gitPickerSpin 0.8s linear infinite;
    }

    @keyframes gitPickerSpin {
      to { transform: rotate(360deg); }
    }

    /* Notification Toast */
    .git-notification {
      position: fixed;
      bottom: 50px;
      right: 50px;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      color: white;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: gitNotifSlideIn 0.3s ease;
    }

    @keyframes gitNotifSlideIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .git-notification.info { background: #0e639c; }
    .git-notification.error { background: #c53030; }
    .git-notification.success { background: #2ea043; }

    /* Blame Dialog */
    .git-blame-dialog {
      position: fixed;
      left: 100px;
      top: 80px;
      width: 900px;
      height: 600px;
      max-width: calc(100vw - 150px);
      max-height: calc(100vh - 150px);
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 8px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      resize: both;
      overflow: hidden;
    }

    .git-blame-header {
      padding: 12px 16px;
      background: #2d2d2d;
      border-bottom: 1px solid #3c3c3c;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 8px 8px 0 0;
      cursor: move;
    }

    .git-blame-title {
      color: #e0e0e0;
      font-weight: 600;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .git-blame-close {
      background: none;
      border: none;
      color: #808080;
      cursor: pointer;
      font-size: 18px;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.15s;
    }

    .git-blame-close:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #e0e0e0;
    }

    .git-blame-content {
      flex: 1;
      margin: 0;
      padding: 12px;
      overflow: auto;
      font-family: 'Cascadia Code', 'Consolas', monospace;
      font-size: 11px;
      line-height: 1.5;
      color: #ccc;
      white-space: pre;
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// NOTIFICATION HELPER
// ============================================================================

function showNotification(message: string, type: 'info' | 'error' | 'success' = 'info'): void {
  const notification = document.createElement('div');
  notification.className = `git-notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

// ============================================================================
// FILE PICKER DIALOG
// ============================================================================

interface FileInfo {
  path: string;
  status: string;
  staged?: boolean;
}

class GitFilePicker {
  private overlay: HTMLElement | null = null;
  private selectedIndex: number = -1;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  show(options: {
    title: string;
    icon: string;
    files: FileInfo[];
    onSelect: (path: string) => void;
    emptyMessage?: string;
  }): void {
    this.close();
    injectGitMenuStyles();

    this.overlay = document.createElement('div');
    this.overlay.className = 'git-file-picker-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'git-file-picker';
    dialog.innerHTML = `
      <div class="git-file-picker-header">
        <div class="git-file-picker-title">
          <span>${options.icon}</span>
          <span>${options.title}</span>
        </div>
        <button class="git-file-picker-close" title="Close (Esc)">✕</button>
      </div>
      <div class="git-file-picker-search">
        <input type="text" placeholder="Search files..." autofocus>
      </div>
      <div class="git-file-picker-list">
        ${this.renderFileList(options.files, options.emptyMessage)}
      </div>
      <div class="git-file-picker-footer">
        <span>${options.files.length} file${options.files.length !== 1 ? 's' : ''}</span>
        <div class="git-file-picker-hint">
          <kbd>↑↓</kbd> Navigate
          <kbd>Enter</kbd> Select
          <kbd>Esc</kbd> Close
        </div>
      </div>
    `;

    this.overlay.appendChild(dialog);
    document.body.appendChild(this.overlay);

    // Setup event handlers
    this.setupEventHandlers(dialog, options.files, options.onSelect);
  }

  private renderFileList(files: FileInfo[], emptyMessage?: string): string {
    if (files.length === 0) {
      return `
        <div class="git-file-picker-empty">
          <div class="git-file-picker-empty-icon">📂</div>
          <div>${emptyMessage || 'No files found'}</div>
        </div>
      `;
    }

    return files.map((file, index) => {
      const fileName = file.path.split(/[/\\]/).pop() || file.path;
      const dirPath = file.path.substring(0, file.path.length - fileName.length - 1);
      const statusLetter = (file.status || 'M').charAt(0).toUpperCase();
      const statusClass = (file.status || 'modified').toLowerCase();

      return `
        <div class="git-file-picker-item" data-path="${this.escapeHtml(file.path)}" data-index="${index}">
          <span class="git-file-picker-status ${statusClass}">${statusLetter}</span>
          <span class="git-file-picker-path">
            ${this.escapeHtml(fileName)}
            ${dirPath ? `<span class="git-file-picker-dir">— ${this.escapeHtml(dirPath)}</span>` : ''}
          </span>
        </div>
      `;
    }).join('');
  }

  private setupEventHandlers(
    dialog: HTMLElement,
    files: FileInfo[],
    onSelect: (path: string) => void
  ): void {
    const closeBtn = dialog.querySelector('.git-file-picker-close');
    const searchInput = dialog.querySelector('input') as HTMLInputElement;
    const listContainer = dialog.querySelector('.git-file-picker-list') as HTMLElement;

    // Close button
    closeBtn?.addEventListener('click', () => this.close());

    // Click outside to close
    this.overlay?.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Search filter
    searchInput?.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
      const filteredFiles = files.filter(f => f.path.toLowerCase().includes(query));
      listContainer.innerHTML = this.renderFileList(filteredFiles, 'No matching files');
      this.setupItemClickHandlers(listContainer, onSelect);
      this.selectedIndex = -1;
    });

    // Item click handlers
    this.setupItemClickHandlers(listContainer, onSelect);

    // Keyboard navigation
    this.keyHandler = (e: KeyboardEvent) => {
      const items = dialog.querySelectorAll('.git-file-picker-item:not([style*="display: none"])');
      
      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
        this.highlightItem(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.highlightItem(items);
      } else if (e.key === 'Enter' && this.selectedIndex >= 0) {
        e.preventDefault();
        const item = items[this.selectedIndex] as HTMLElement;
        const path = item?.dataset.path;
        if (path) {
          this.close();
          onSelect(path);
        }
      }
    };

    document.addEventListener('keydown', this.keyHandler);

    // Focus search input
    searchInput?.focus();
  }

  private setupItemClickHandlers(container: HTMLElement, onSelect: (path: string) => void): void {
    container.querySelectorAll('.git-file-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        const path = (item as HTMLElement).dataset.path;
        if (path) {
          this.close();
          onSelect(path);
        }
      });

      item.addEventListener('mouseenter', () => {
        container.querySelectorAll('.git-file-picker-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        this.selectedIndex = parseInt((item as HTMLElement).dataset.index || '-1');
      });
    });
  }

  private highlightItem(items: NodeListOf<Element>): void {
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === this.selectedIndex);
    });
    items[this.selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }

  close(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    this.selectedIndex = -1;
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

const gitFilePicker = new GitFilePicker();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getProjectPath(): string {
  return (window as any).currentProjectPath ||
         (window as any).currentFolderPath ||
         localStorage.getItem('ide_last_project_path') || '';
}

function getCurrentFile(): string | null {
  return (window as any).tabManager?.getActiveTab?.()?.path || null;
}

async function getChangedFiles(): Promise<FileInfo[]> {
  try {
    const projectPath = getProjectPath();
    if (!projectPath) return [];

    await gitManager.open(projectPath);
    const status = await gitManager.getStatus();
    const files = Array.isArray(status) ? status : ((status as any)?.files || []);

    return files.map((f: any) => ({
      path: f.path || '',
      status: f.status || 'modified',
      staged: f.staged || false
    }));
  } catch (e) {
    console.error('Failed to get changed files:', e);
    return [];
  }
}

// ============================================================================
// SHOW DIFF VIEWER - With File Picker
// ============================================================================

async function showDiffViewerWithPicker(filePath?: string, staged: boolean = false): Promise<void> {
  const projectPath = getProjectPath();

  if (!projectPath) {
    showNotification('Open a project folder first', 'error');
    return;
  }

  // If file provided or currently open, show diff directly
  const file = filePath || getCurrentFile();

  if (file) {
    console.log('Showing diff for:', file);
    try {
      if ((window as any).gitDiffViewer?.showFileDiff) {
        await (window as any).gitDiffViewer.showFileDiff(projectPath, file, staged);
      } else {
        showNotification('Diff viewer not available', 'error');
      }
    } catch (e) {
      showNotification(`Failed to show diff: ${e}`, 'error');
    }
    return;
  }

  // No file - show loading then file picker
  showNotification('Loading changed files...', 'info');

  const files = await getChangedFiles();

  // Remove loading notification
  document.querySelector('.git-notification')?.remove();

  if (files.length === 0) {
    showNotification('No changed files to show diff', 'info');
    return;
  }

  gitFilePicker.show({
    title: 'Select File for Diff',
    icon: '📄',
    files: files,
    emptyMessage: 'No changed files found',
    onSelect: async (selectedPath) => {
      console.log('Selected for diff:', selectedPath);
      try {
        if ((window as any).gitDiffViewer?.showFileDiff) {
          await (window as any).gitDiffViewer.showFileDiff(projectPath, selectedPath, staged);
        }
      } catch (e) {
        showNotification(`Failed to show diff: ${e}`, 'error');
      }
    }
  });
}

// ============================================================================
// SHOW GIT BLAME - With File Picker
// ============================================================================

async function showGitBlameWithPicker(filePath?: string): Promise<void> {
  const projectPath = getProjectPath();

  if (!projectPath) {
    showNotification('Open a project folder first', 'error');
    return;
  }

  // If file provided or currently open, show blame directly
  const file = filePath || getCurrentFile();

  if (file) {
    console.log('Showing blame for:', file);
    try {
      await gitManager.open(projectPath);
      const blame = await gitManager.blame(file);
      showBlameDialog(file, blame);
    } catch (e) {
      showNotification(`Failed to show blame: ${e}`, 'error');
    }
    return;
  }

  // No file - get files and show picker
  showNotification('Loading files...', 'info');

  const files = await getChangedFiles();

  // Remove loading notification
  document.querySelector('.git-notification')?.remove();

  if (files.length === 0) {
    showNotification('No files available for blame', 'info');
    return;
  }

  gitFilePicker.show({
    title: 'Select File for Git Blame',
    icon: '👤',
    files: files,
    emptyMessage: 'No files found',
    onSelect: async (selectedPath) => {
      try {
        await gitManager.open(projectPath);
        const blame = await gitManager.blame(selectedPath);
        showBlameDialog(selectedPath, blame);
      } catch (e) {
        showNotification(`Failed to show blame: ${e}`, 'error');
      }
    }
  });
}

function showBlameDialog(filePath: string, blame: string): void {
  const fileName = filePath.split(/[/\\]/).pop() || filePath;

  // Check if FloatingDialogManager exists
  if ((window as any).FloatingDialogManager) {
    (window as any).FloatingDialogManager.create({
      id: `blame-${filePath.replace(/[^a-z0-9]/gi, '-')}`,
      title: `Blame: ${fileName}`,
      icon: '👤',
      content: `<pre style="margin:0;font-family:'Cascadia Code',monospace;font-size:11px;line-height:1.5;white-space:pre;color:#ccc;">${escapeHtml(blame)}</pre>`,
      width: 900,
      height: 600
    });
    return;
  }

  // Fallback: create simple dialog
  injectGitMenuStyles();

  const dialog = document.createElement('div');
  dialog.className = 'git-blame-dialog';
  dialog.innerHTML = `
    <div class="git-blame-header">
      <span class="git-blame-title">
        <span>👤</span>
        <span>Git Blame: ${escapeHtml(fileName)}</span>
      </span>
      <button class="git-blame-close" title="Close">✕</button>
    </div>
    <pre class="git-blame-content">${escapeHtml(blame)}</pre>
  `;

  dialog.querySelector('.git-blame-close')?.addEventListener('click', () => dialog.remove());

  // Make draggable
  const header = dialog.querySelector('.git-blame-header') as HTMLElement;
  let isDragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

  header?.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = dialog.offsetLeft;
    startTop = dialog.offsetTop;
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    dialog.style.left = `${startLeft + e.clientX - startX}px`;
    dialog.style.top = `${Math.max(0, startTop + e.clientY - startY)}px`;
  });

  document.addEventListener('mouseup', () => { isDragging = false; });

  document.body.appendChild(dialog);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============================================================================
// FIXED handleGitMenuAction FUNCTION
// ============================================================================
// Copy this function to replace the one in menuSystem.ts
// ============================================================================

export async function handleGitMenuAction(action: string): Promise<void> {
  console.log(`🔷 Handling Git menu action: ${action}`);

  const projectPath = getProjectPath();

  if (!projectPath && action !== 'git-tortoise') {
    showNotification('Please open a project folder first', 'error');
    return;
  }

  try {
    switch (action) {
      case 'git-panel':
        if ((window as any).showGitPanel) {
          (window as any).showGitPanel(projectPath);
        } else if ((window as any).gitUIEnhanced?.show) {
          (window as any).gitUIEnhanced.show(projectPath);
        } else {
          showNotification('Git panel not available', 'error');
        }
        break;

      case 'git-panel-virtualized':
        if ((window as any).showVirtualizedGitPanel) {
          (window as any).showVirtualizedGitPanel(undefined, projectPath);
        } else {
          showNotification('Virtualized Git panel not available', 'error');
        }
        break;

      case 'git-history':
        if ((window as any).showGitHistory) {
          (window as any).showGitHistory();
        } else if ((window as any).gitHistoryViewer?.show) {
          (window as any).gitHistoryViewer.show({ repoPath: projectPath });
        } else {
          showNotification('Git history viewer not available', 'error');
        }
        break;

      case 'git-branches':
        if ((window as any).showBranchManager) {
          (window as any).showBranchManager();
        } else if ((window as any).gitBranchManager?.show) {
          (window as any).gitBranchManager.show({ repoPath: projectPath });
        } else {
          showNotification('Branch manager not available', 'error');
        }
        break;

      // ✅ FIXED: Now shows file picker when no file is open
      case 'git-diff':
        await showDiffViewerWithPicker();
        break;

      case 'git-stash-manager':
        if ((window as any).showStashManager) {
          (window as any).showStashManager();
        } else if ((window as any).gitStashManager?.show) {
          (window as any).gitStashManager.show({ repoPath: projectPath });
        } else {
          showNotification('Stash manager not available', 'error');
        }
        break;

      case 'git-stash-quick':
        if ((window as any).quickStash) {
          await (window as any).quickStash();
        } else if ((window as any).gitStashManager?.quickStash) {
          await (window as any).gitStashManager.quickStash(projectPath);
          showNotification('Changes stashed successfully', 'success');
        } else {
          showNotification('Quick stash not available', 'error');
        }
        break;

      case 'git-stash-pop':
        if ((window as any).quickPop) {
          await (window as any).quickPop();
        } else if ((window as any).gitStashManager?.quickPop) {
          await (window as any).gitStashManager.quickPop(projectPath);
          showNotification('Stash applied successfully', 'success');
        } else {
          showNotification('Pop stash not available', 'error');
        }
        break;

      case 'git-merge-conflicts':
        if ((window as any).showMergeConflicts) {
          (window as any).showMergeConflicts();
        } else if ((window as any).gitMergeConflictManager?.show) {
          (window as any).gitMergeConflictManager.show({ repoPath: projectPath });
        } else {
          showNotification('Merge conflict resolver not available', 'error');
        }
        break;

      // ✅ FIXED: Now shows file picker when no file is open
      case 'git-blame':
        await showGitBlameWithPicker();
        break;

      case 'git-tortoise':
        try {
          await invoke('open_tortoise_git', { path: projectPath || '.', command: 'log' });
        } catch (error) {
          showNotification('TortoiseGit not available or not installed', 'error');
        }
        break;

      default:
        console.log(`Unknown Git menu action: ${action}`);
    }
  } catch (error) {
    console.error(`Error handling Git menu action ${action}:`, error);
    showNotification(`Error: ${action} failed`, 'error');
  }
}

// ============================================================================
// INITIALIZATION - Register handlers on window
// ============================================================================

export function initGitMenuFix(): void {
  injectGitMenuStyles();

  // Register global handlers
  (window as any).showDiffViewer = showDiffViewerWithPicker;
  (window as any).showGitBlame = showGitBlameWithPicker;

  // Also expose the file picker for other uses
  (window as any).gitFilePicker = gitFilePicker;

  console.log('✅ Git menu fix initialized - Diff Viewer and Git Blame now show file picker when no file is open');
}

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
  // Delay to ensure other scripts are loaded
  setTimeout(() => {
    initGitMenuFix();
  }, 500);
}

// Export for use in other modules
export { gitFilePicker, showDiffViewerWithPicker, showGitBlameWithPicker, showNotification };
