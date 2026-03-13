// src/editor/fileSaveHandler.ts
// Enhanced file save handler with modification tracking integration

import { invoke } from '@tauri-apps/api/core';

interface SaveOptions {
  showNotification?: boolean;
  updateTree?: boolean;
  markAsUnmodified?: boolean;
}

class FileSaveHandler {
  private saving: Set<string> = new Set();

  constructor() {
    this.setupSaveListeners();
  }

  private setupSaveListeners(): void {
    // Listen for Ctrl+S across the app
    document.addEventListener('keydown', async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        await this.saveCurrentFile();
      }
    });

    // Listen for custom save events
    document.addEventListener('file-save-request', async (e: any) => {
      const path = e.detail?.path;
      if (path) {
        await this.saveFile(path);
      }
    });
  }

  private async saveCurrentFile(): Promise<void> {
    // Get current active tab
    const tabManager = (window as any).tabManager;
    if (!tabManager) {
      console.warn('Tab manager not available');
      return;
    }

    const currentTab = tabManager.tabs?.find((tab: any) => tab.isActive);
    if (!currentTab) {
      console.warn('No active tab to save');
      return;
    }

    await this.saveFile(currentTab.path, {
      showNotification: true,
      updateTree: true,
      markAsUnmodified: true
    });
  }

  public async saveFile(
    filePath: string, 
    options: SaveOptions = {}
  ): Promise<boolean> {
    const {
      showNotification = true,
      updateTree = true,
      markAsUnmodified = true
    } = options;

    // Prevent duplicate saves
    if (this.saving.has(filePath)) {
      console.log('⏳ Already saving:', filePath);
      return false;
    }

    this.saving.add(filePath);

    try {
      console.log('💾 Saving file:', filePath);

      // Get content from Monaco editor
      const content = await this.getEditorContent(filePath);
      if (content === null) {
        throw new Error('Could not get editor content');
      }

      // Save to file system via Tauri
      await invoke('write_file_content', {
        path: filePath,
        content: content
      });

      console.log('✅ File saved successfully:', filePath);

      // Mark as unmodified
      if (markAsUnmodified) {
        this.markFileAsUnmodified(filePath);
      }

      // Update tab indicator
      this.updateTabSaveState(filePath);

      // Refresh file tree
      if (updateTree) {
        document.dispatchEvent(new CustomEvent('file-tree-refresh'));
      }

      // Show notification
      if (showNotification) {
        this.showSaveNotification(filePath, 'success');
      }

      return true;

    } catch (error) {
      console.error('❌ Failed to save file:', error);
      
      if (showNotification) {
        this.showSaveNotification(filePath, 'error', String(error));
      }
      
      return false;

    } finally {
      this.saving.delete(filePath);
    }
  }

  private async getEditorContent(filePath: string): Promise<string | null> {
    const monaco = (window as any).monaco;
    if (!monaco?.editor) {
      console.error('Monaco editor not available');
      return null;
    }

    // Find the editor with this file
    const editors = monaco.editor.getEditors();
    
    for (const editor of editors) {
      const model = editor.getModel();
      if (!model) continue;

      const modelPath = model.uri?.path || model.uri?._formatted;
      
      // Normalize paths for comparison
      const normalizedModelPath = modelPath?.replace(/\//g, '\\');
      const normalizedFilePath = filePath.replace(/\//g, '\\');

      if (normalizedModelPath === normalizedFilePath) {
        return model.getValue();
      }
    }

    // Fallback: check active editor
    const activeEditor = monaco.editor.getEditors()[0];
    if (activeEditor) {
      const model = activeEditor.getModel();
      if (model) {
        return model.getValue();
      }
    }

    return null;
  }

  private markFileAsUnmodified(filePath: string): void {
    // Update modification tracker
    const modTracker = (window as any).__modifiedFilesTracker;
    if (modTracker) {
      modTracker.removeModified(filePath);
    }

    // Update file modification manager
    const modManager = (window as any).__fileModificationManager;
    if (modManager) {
      modManager.markAsSaved(filePath);
    }
  }

  private updateTabSaveState(filePath: string): void {
    const tabManager = (window as any).tabManager;
    if (!tabManager) return;

    const tab = tabManager.tabs?.find((t: any) => t.path === filePath);
    if (tab) {
      tab.isModified = false;
      
      // Update tab UI
      const tabElement = document.querySelector(`[data-tab-id="${tab.id}"]`);
      if (tabElement) {
        tabElement.classList.remove('modified');
        
        // Remove modified indicator dot
        const modDot = tabElement.querySelector('.tab-modified-indicator');
        if (modDot) {
          modDot.remove();
        }
      }
    }
  }

  private showSaveNotification(
    filePath: string, 
    type: 'success' | 'error',
    errorMsg?: string
  ): void {
    const fileName = filePath.split(/[\\/]/).pop() || filePath;
    
    const showNotif = (window as any).showNotification;
    if (showNotif) {
      if (type === 'success') {
        showNotif(`Saved: ${fileName}`, 'success');
      } else {
        showNotif(`Failed to save ${fileName}: ${errorMsg}`, 'error');
      }
    } else {
      // Fallback notification
      const notif = document.createElement('div');
      notif.className = 'save-notification';
      notif.textContent = type === 'success' 
        ? `✅ Saved: ${fileName}` 
        : `❌ Failed to save: ${fileName}`;
      notif.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
        color: white;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
      `;
      
      document.body.appendChild(notif);
      
      setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notif.remove(), 300);
      }, 2000);
    }
  }

  // Public API
  public async saveAll(): Promise<void> {
    const modManager = (window as any).__fileModificationManager;
    if (!modManager) return;

    const modifiedFiles = modManager.getModifiedFiles();
    
    console.log(`💾 Saving ${modifiedFiles.length} modified files...`);
    
    for (const filePath of modifiedFiles) {
      await this.saveFile(filePath, { showNotification: false });
    }
    
    if (modifiedFiles.length > 0) {
      this.showSaveNotification(
        'all files',
        'success'
      );
    }
  }

  public isFileSaving(filePath: string): boolean {
    return this.saving.has(filePath);
  }
}

// Initialize
let fileSaveHandler: FileSaveHandler | null = null;

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    fileSaveHandler = new FileSaveHandler();
    (window as any).__fileSaveHandler = fileSaveHandler;
    console.log('✅ File save handler initialized');
  }, 1000);
});

// Export for use in other modules
export { FileSaveHandler, fileSaveHandler };
