// src/ide/vsc/gitMenuHandlers.ts
// ============================================================================
// GIT MENU HANDLERS - With File Picker Dialogs
// ============================================================================
// When user clicks "Diff Viewer" or "Git Blame" without a file open,
// shows a file picker dialog with all changed files

import { invoke } from '@tauri-apps/api/core';
import { gitManager } from './gitManager';

// ============================================================================
// FILE PICKER DIALOG
// ============================================================================

interface FilePickerOptions {
  title: string;
  icon: string;
  files: Array<{ path: string; status: string; staged?: boolean }>;
  onSelect: (filePath: string) => void;
  emptyMessage?: string;
}

class GitFilePickerDialog {
  private dialog: HTMLElement | null = null;
  private stylesInjected = false;

  constructor() {
    this.injectStyles();
  }

  private injectStyles(): void {
    if (this.stylesInjected || document.getElementById('git-file-picker-styles')) return;

    const style = document.createElement('style');
    style.id = 'git-file-picker-styles';
    style.textContent = `
      .git-file-picker-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        animation: fadeIn 0.15s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .git-file-picker {
        background: #252526;
        border: 1px solid #3c3c3c;
        border-radius: 8px;
        width: 500px;
        max-width: 90vw;
        max-height: 70vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        animation: slideIn 0.2s ease;
      }

      @keyframes slideIn {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .git-file-picker-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
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
        font-size: 18px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.15s;
      }

      .git-file-picker-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #e0e0e0;
      }

      .git-file-picker-search {
        padding: 12px 16px;
        border-bottom: 1px solid #3c3c3c;
      }

      .git-file-picker-search input {
        width: 100%;
        padding: 8px 12px;
        background: #3c3c3c;
        border: 1px solid #555;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 13px;
        outline: none;
        box-sizing: border-box;
      }

      .git-file-picker-search input:focus {
        border-color: #0e639c;
      }

      .git-file-picker-search input::placeholder {
        color: #808080;
      }

      .git-file-picker-content {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        max-height: 400px;
      }

      .git-file-picker-content::-webkit-scrollbar {
        width: 8px;
      }

      .git-file-picker-content::-webkit-scrollbar-thumb {
        background: #555;
        border-radius: 4px;
      }

      .git-file-picker-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.15s;
      }

      .git-file-picker-item:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .git-file-picker-item:active {
        background: rgba(14, 99, 156, 0.3);
      }

      .git-file-picker-status {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        border-radius: 3px;
        flex-shrink: 0;
      }

      .git-file-picker-status.modified { background: rgba(220, 180, 90, 0.2); color: #dcdcaa; }
      .git-file-picker-status.added { background: rgba(78, 201, 176, 0.2); color: #4ec9b0; }
      .git-file-picker-status.deleted { background: rgba(244, 135, 113, 0.2); color: #f48771; }
      .git-file-picker-status.untracked { background: rgba(79, 193, 255, 0.2); color: #4fc1ff; }
      .git-file-picker-status.renamed { background: rgba(86, 156, 214, 0.2); color: #569cd6; }
      .git-file-picker-status.staged { border: 1px solid rgba(78, 201, 176, 0.5); }

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
      }

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

      .git-file-picker-footer {
        padding: 12px 16px;
        border-top: 1px solid #3c3c3c;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: #808080;
      }

      .git-file-picker-hint {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .git-file-picker-hint kbd {
        background: #3c3c3c;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
      }
    `;
    document.head.appendChild(style);
    this.stylesInjected = true;
  }

  show(options: FilePickerOptions): void {
    this.close();
    this.injectStyles();

    this.dialog = document.createElement('div');
    this.dialog.className = 'git-file-picker-overlay';
    this.dialog.innerHTML = `
      <div class="git-file-picker">
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
        <div class="git-file-picker-content">
          ${this.renderFileList(options.files, options.emptyMessage)}
        </div>
        <div class="git-file-picker-footer">
          <span>${options.files.length} changed file${options.files.length !== 1 ? 's' : ''}</span>
          <div class="git-file-picker-hint">
            <kbd>↑↓</kbd> Navigate
            <kbd>Enter</kbd> Select
            <kbd>Esc</kbd> Close
          </div>
        </div>
      </div>
    `;

    // Event listeners
    const closeBtn = this.dialog.querySelector('.git-file-picker-close');
    closeBtn?.addEventListener('click', () => this.close());

    // Click outside to close
    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });

    // Search filter
    const searchInput = this.dialog.querySelector('input') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      this.filterFiles(searchInput.value, options.files, options.onSelect);
    });

    // File selection
    this.dialog.querySelectorAll('.git-file-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        const path = (item as HTMLElement).dataset.path;
        if (path) {
          this.close();
          options.onSelect(path);
        }
      });
    });

    // Keyboard navigation
    let selectedIndex = -1;
    const handleKeyDown = (e: KeyboardEvent) => {
      const items = this.dialog?.querySelectorAll('.git-file-picker-item:not([style*="display: none"])');
      if (!items) return;

      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', handleKeyDown);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        this.highlightItem(items, selectedIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        this.highlightItem(items, selectedIndex);
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        const item = items[selectedIndex] as HTMLElement;
        const path = item?.dataset.path;
        if (path) {
          this.close();
          options.onSelect(path);
        }
        document.removeEventListener('keydown', handleKeyDown);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.appendChild(this.dialog);

    // Focus search
    searchInput?.focus();
  }

  private renderFileList(files: FilePickerOptions['files'], emptyMessage?: string): string {
    if (files.length === 0) {
      return `
        <div class="git-file-picker-empty">
          <div class="git-file-picker-empty-icon">📂</div>
          <div>${emptyMessage || 'No changed files found'}</div>
        </div>
      `;
    }

    return files.map(file => {
      const fileName = file.path.split(/[/\\]/).pop() || file.path;
      const dirPath = file.path.substring(0, file.path.length - fileName.length - 1);
      const statusLetter = (file.status || 'M').charAt(0).toUpperCase();
      const statusClass = (file.status || 'modified').toLowerCase();

      return `
        <div class="git-file-picker-item" data-path="${file.path}">
          <span class="git-file-picker-status ${statusClass} ${file.staged ? 'staged' : ''}">${statusLetter}</span>
          <span class="git-file-picker-path">
            ${fileName}
            ${dirPath ? `<span class="git-file-picker-dir"> — ${dirPath}</span>` : ''}
          </span>
        </div>
      `;
    }).join('');
  }

  private filterFiles(query: string, files: FilePickerOptions['files'], onSelect: (path: string) => void): void {
    const content = this.dialog?.querySelector('.git-file-picker-content');
    if (!content) return;

    const lowerQuery = query.toLowerCase();
    const filteredFiles = files.filter(f => f.path.toLowerCase().includes(lowerQuery));
    
    content.innerHTML = this.renderFileList(filteredFiles, 'No matching files');

    // Re-attach click handlers
    content.querySelectorAll('.git-file-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        const path = (item as HTMLElement).dataset.path;
        if (path) {
          this.close();
          onSelect(path);
        }
      });
    });
  }

  private highlightItem(items: NodeListOf<Element>, index: number): void {
    items.forEach((item, i) => {
      (item as HTMLElement).style.background = i === index ? 'rgba(14, 99, 156, 0.3)' : '';
    });
    items[index]?.scrollIntoView({ block: 'nearest' });
  }

  close(): void {
    if (this.dialog) {
      this.dialog.remove();
      this.dialog = null;
    }
  }
}

const gitFilePicker = new GitFilePickerDialog();

// ============================================================================
// NOTIFICATION HELPER
// ============================================================================

function showNotification(message: string, type: 'info' | 'error' | 'success' = 'info'): void {
  const colors = {
    info: '#0e639c',
    error: '#c53030',
    success: '#2ea043'
  };

  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 50px;
    right: 50px;
    padding: 12px 20px;
    background: ${colors[type]};
    color: white;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    z-index: 99999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: slideInNotif 0.3s ease;
  `;

  if (!document.getElementById('notif-anim-style')) {
    const style = document.createElement('style');
    style.id = 'notif-anim-style';
    style.textContent = `@keyframes slideInNotif { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`;
    document.head.appendChild(style);
  }

  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

// ============================================================================
// REGISTER MENU HANDLERS
// ============================================================================

export function registerGitMenuHandlers(): void {
  const win = window as any;

  // Helper to get project path
  const getProjectPath = (): string => {
    return win.currentProjectPath || 
           win.currentFolderPath || 
           localStorage.getItem('ide_last_project_path') || '';
  };

  // Helper to get current file
  const getCurrentFile = (): string | null => {
    return win.tabManager?.getActiveTab?.()?.path || null;
  };

  // Helper to get changed files from git
  const getChangedFiles = async (): Promise<Array<{ path: string; status: string; staged: boolean }>> => {
    try {
      const projectPath = getProjectPath();
      if (!projectPath) return [];

      await gitManager.open(projectPath);
      const status = await gitManager.getStatus();
      const files = Array.isArray(status) ? status : (status?.files || []);
      
      return files.map((f: any) => ({
        path: f.path || '',
        status: f.status || 'modified',
        staged: f.staged || false
      }));
    } catch (e) {
      console.error('Failed to get changed files:', e);
      return [];
    }
  };

  // ============================================================================
  // DIFF VIEWER - With File Picker
  // ============================================================================
  
  win.showDiffViewer = async (filePath?: string, staged: boolean = false) => {
    const projectPath = getProjectPath();
    
    if (!projectPath) {
      showNotification('Open a project folder first', 'error');
      return;
    }

    // If file provided, show diff directly
    if (filePath) {
      try {
        if (win.gitDiffViewer?.showFileDiff) {
          await win.gitDiffViewer.showFileDiff(projectPath, filePath, staged);
        } else {
          showNotification('Diff viewer not available', 'error');
        }
      } catch (e) {
        showNotification(`Failed to show diff: ${e}`, 'error');
      }
      return;
    }

    // No file provided - check if there's an active file
    const currentFile = getCurrentFile();
    if (currentFile) {
      try {
        if (win.gitDiffViewer?.showFileDiff) {
          await win.gitDiffViewer.showFileDiff(projectPath, currentFile, staged);
        }
      } catch (e) {
        showNotification(`Failed to show diff: ${e}`, 'error');
      }
      return;
    }

    // No file open - show file picker with changed files
    const files = await getChangedFiles();
    
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
        try {
          if (win.gitDiffViewer?.showFileDiff) {
            await win.gitDiffViewer.showFileDiff(projectPath, selectedPath, staged);
          }
        } catch (e) {
          showNotification(`Failed to show diff: ${e}`, 'error');
        }
      }
    });
  };

  // ============================================================================
  // GIT BLAME - With File Picker
  // ============================================================================

  win.showGitBlame = async (filePath?: string) => {
    const projectPath = getProjectPath();
    
    if (!projectPath) {
      showNotification('Open a project folder first', 'error');
      return;
    }

    // If file provided, show blame directly
    if (filePath) {
      try {
        await gitManager.open(projectPath);
        if (win.gitUIEnhanced?.showBlameDialog) {
          await win.gitUIEnhanced.showBlameDialog(filePath);
        } else if (win.gitBlameManager?.showBlameDialog) {
          await win.gitBlameManager.showBlameDialog(projectPath, filePath);
        } else {
          // Fallback: show blame in floating dialog
          const blame = await gitManager.blame(filePath);
          showBlameInDialog(filePath, blame);
        }
      } catch (e) {
        showNotification(`Failed to show blame: ${e}`, 'error');
      }
      return;
    }

    // No file provided - check if there's an active file
    const currentFile = getCurrentFile();
    if (currentFile) {
      try {
        await gitManager.open(projectPath);
        if (win.gitUIEnhanced?.showBlameDialog) {
          await win.gitUIEnhanced.showBlameDialog(currentFile);
        } else if (win.gitBlameManager?.showBlameDialog) {
          await win.gitBlameManager.showBlameDialog(projectPath, currentFile);
        } else {
          const blame = await gitManager.blame(currentFile);
          showBlameInDialog(currentFile, blame);
        }
      } catch (e) {
        showNotification(`Failed to show blame: ${e}`, 'error');
      }
      return;
    }

    // No file open - show file picker with ALL tracked files
    showNotification('Loading tracked files...', 'info');
    
    try {
      await gitManager.open(projectPath);
      
      // Get all tracked files using git ls-files
      const result = await invoke<{ files: string[] }>('git_list_files', { path: projectPath });
      const trackedFiles = (result?.files || []).map((f: string) => ({
        path: f,
        status: 'tracked',
        staged: false
      }));

      if (trackedFiles.length === 0) {
        showNotification('No tracked files found', 'info');
        return;
      }

      gitFilePicker.show({
        title: 'Select File for Git Blame',
        icon: '👤',
        files: trackedFiles,
        emptyMessage: 'No tracked files found',
        onSelect: async (selectedPath) => {
          try {
            if (win.gitUIEnhanced?.showBlameDialog) {
              await win.gitUIEnhanced.showBlameDialog(selectedPath);
            } else if (win.gitBlameManager?.showBlameDialog) {
              await win.gitBlameManager.showBlameDialog(projectPath, selectedPath);
            } else {
              const blame = await gitManager.blame(selectedPath);
              showBlameInDialog(selectedPath, blame);
            }
          } catch (e) {
            showNotification(`Failed to show blame: ${e}`, 'error');
          }
        }
      });
    } catch (e) {
      // Fallback: just show changed files
      const files = await getChangedFiles();
      
      if (files.length === 0) {
        showNotification('Open a file first to view its blame', 'info');
        return;
      }

      gitFilePicker.show({
        title: 'Select File for Git Blame',
        icon: '👤',
        files: files,
        emptyMessage: 'No files found',
        onSelect: async (selectedPath) => {
          try {
            if (win.gitUIEnhanced?.showBlameDialog) {
              await win.gitUIEnhanced.showBlameDialog(selectedPath);
            } else {
              const blame = await gitManager.blame(selectedPath);
              showBlameInDialog(selectedPath, blame);
            }
          } catch (e) {
            showNotification(`Failed to show blame: ${e}`, 'error');
          }
        }
      });
    }
  };

  // Helper to show blame in a simple dialog
  function showBlameInDialog(filePath: string, blame: string): void {
    const fileName = filePath.split(/[/\\]/).pop() || filePath;
    
    if (win.FloatingDialogManager) {
      win.FloatingDialogManager.create({
        id: `blame-${filePath.replace(/[^a-z0-9]/gi, '-')}`,
        title: `Blame: ${fileName}`,
        icon: '👤',
        content: `<pre style="margin:0;font-family:'Cascadia Code',monospace;font-size:11px;line-height:1.4;white-space:pre-wrap;color:#ccc;">${escapeHtml(blame)}</pre>`,
        width: 900,
        height: 600
      });
    } else {
      // Create simple dialog
      const dialog = document.createElement('div');
      dialog.style.cssText = `position:fixed;left:100px;top:80px;width:800px;height:500px;background:#1e1e1e;border:1px solid #3c3c3c;border-radius:8px;z-index:99999;display:flex;flex-direction:column;`;
      dialog.innerHTML = `
        <div style="padding:12px 16px;background:#2d2d2d;border-bottom:1px solid #3c3c3c;display:flex;justify-content:space-between;align-items:center;">
          <span style="color:#e0e0e0;font-weight:600;">👤 Blame: ${escapeHtml(fileName)}</span>
          <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:#808080;cursor:pointer;font-size:18px;">✕</button>
        </div>
        <pre style="flex:1;margin:0;padding:12px;overflow:auto;font-family:'Cascadia Code',monospace;font-size:11px;line-height:1.4;color:#ccc;">${escapeHtml(blame)}</pre>
      `;
      document.body.appendChild(dialog);
    }
  }

  function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ============================================================================
  // OTHER HANDLERS (keep existing functionality)
  // ============================================================================

  // Quick Stash
  win.quickStash = async () => {
    const projectPath = getProjectPath();
    if (!projectPath) {
      showNotification('Open a project folder first', 'error');
      return;
    }

    try {
      await gitManager.open(projectPath);
      await gitManager.stash();
      showNotification('✅ Changes stashed successfully', 'success');
    } catch (e) {
      showNotification(`Stash failed: ${e}`, 'error');
    }
  };

  // Quick Pop
  win.quickPop = async () => {
    const projectPath = getProjectPath();
    if (!projectPath) {
      showNotification('Open a project folder first', 'error');
      return;
    }

    try {
      await gitManager.open(projectPath);
      await gitManager.stashPop(0);
      showNotification('✅ Stash applied and removed', 'success');
    } catch (e) {
      showNotification(`Pop stash failed: ${e}`, 'error');
    }
  };

  // Show Git Panel
  win.showGitPanel = (path?: string) => {
    const projectPath = path || getProjectPath();
    if (!projectPath) {
      showNotification('Open a project folder first', 'error');
      return;
    }

    if (win.gitUIEnhanced?.show) {
      win.gitUIEnhanced.show(projectPath);
    } else {
      showNotification('Git panel not available', 'error');
    }
  };

  // Show Stash Manager
  win.showStashManager = async () => {
    const projectPath = getProjectPath();
    if (!projectPath) {
      showNotification('Open a project folder first', 'error');
      return;
    }

    if (win.gitStashManager?.show) {
      await win.gitStashManager.show({ repoPath: projectPath });
    } else if (win.gitUIEnhanced?.show) {
      await win.gitUIEnhanced.show(projectPath);
      setTimeout(() => {
        const stashTab = document.querySelector('.git-ui-tab[data-tab="stashes"]') as HTMLElement;
        stashTab?.click();
      }, 100);
    } else {
      showNotification('Stash manager not available', 'error');
    }
  };

  // Show Git History
  win.showGitHistory = async () => {
    const projectPath = getProjectPath();
    if (!projectPath) {
      showNotification('Open a project folder first', 'error');
      return;
    }

    if (win.gitHistoryViewer?.show) {
      await win.gitHistoryViewer.show({ repoPath: projectPath });
    } else if (win.gitUIEnhanced?.show) {
      await win.gitUIEnhanced.show(projectPath);
      setTimeout(() => {
        const historyTab = document.querySelector('.git-ui-tab[data-tab="history"]') as HTMLElement;
        historyTab?.click();
      }, 100);
    } else {
      showNotification('Git history not available', 'error');
    }
  };

  // Show Branch Manager
  win.showBranchManager = async () => {
    const projectPath = getProjectPath();
    if (!projectPath) {
      showNotification('Open a project folder first', 'error');
      return;
    }

    if (win.gitBranchManager?.show) {
      await win.gitBranchManager.show({ repoPath: projectPath });
    } else if (win.gitUIEnhanced?.show) {
      await win.gitUIEnhanced.show(projectPath);
      setTimeout(() => {
        const branchTab = document.querySelector('.git-ui-tab[data-tab="branches"]') as HTMLElement;
        branchTab?.click();
      }, 100);
    } else {
      showNotification('Branch manager not available', 'error');
    }
  };

  // Open TortoiseGit
  win.openTortoiseGit = async (command: string = 'log') => {
    const projectPath = getProjectPath() || '.';
    try {
      await invoke('open_tortoise_git', { path: projectPath, command });
    } catch (e) {
      showNotification('TortoiseGit not installed or not found', 'error');
    }
  };

  console.log('✅ Git menu handlers registered with file picker support');
}

// Auto-register when loaded
if (typeof window !== 'undefined') {
  // Wait for other scripts to load
  setTimeout(() => {
    registerGitMenuHandlers();
  }, 500);
}

export { gitFilePicker, GitFilePickerDialog };
