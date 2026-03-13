// fileDeletionHandler.ts - ENHANCED VERSION
// Fixed to properly detect and warn about modified files before deletion

import { markFileAsSaved } from '../ide/fileExplorer/fileTreeRenderer';

interface DeletedFileInfo {
  path: string;
  name: string;
  deletedAt: Date;
  wasModified: boolean;
}

class FileDeletionHandler {
  private deletedFiles: DeletedFileInfo[] = [];
  private maxHistorySize = 50;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    console.log('🗑️ FileDeletionHandler initialized');
    
    // Listen for file deletion events
    this.setupDeleteListener();
    
    // Expose globally for debugging
    (window as any).__fileDeletionHandler = this;
  }

  /**
   * Setup delete event listener
   */
  private setupDeleteListener(): void {
    // Listen for custom delete events
    document.addEventListener('file-deleted', (e: any) => {
      const { path, name } = e.detail;
      if (path) {
        this.handleFileDeleted(path, name);
      }
    });
  }

  /**
   * Handle file deletion
   * CRITICAL: This checks modified status FIRST before any cleanup
   */
  public handleFileDeleted(filePath: string, fileName?: string): void {
    const name = fileName || filePath.split(/[\\/]/).pop() || 'Unknown file';
    
    // 🔥 CRITICAL: Check if file was modified BEFORE any cleanup
    const wasModified = this.isFileModified(filePath);
    
    console.log('🗑️ File deleted:', filePath);
    console.log('📝 Was modified before delete:', wasModified);
    
    // Store deletion info
    const deleteInfo: DeletedFileInfo = {
      path: filePath,
      name,
      deletedAt: new Date(),
      wasModified
    };
    
    this.deletedFiles.unshift(deleteInfo);
    
    // Keep history manageable
    if (this.deletedFiles.length > this.maxHistorySize) {
      this.deletedFiles.pop();
    }
    
    // 🔥 SHOW NOTIFICATION FIRST (before cleanup removes tracking)
    this.showDeleteNotification(name, wasModified);
    
    // Then clean up tracking
    this.cleanupFileTracking(filePath);
    
    // Close tab if open
    this.closeTabIfOpen(filePath);
  }

  /**
   * Check if file was modified before deletion
   * This checks ALL possible sources of modification state
   */
  private isFileModified(filePath: string): boolean {
    console.log('🔍 Checking if file was modified:', filePath);
    
    // Normalize the path
    const normalizedPath = filePath.replace(/\//g, '\\');
    
    // Method 1: Check FileModificationManager
    const modManager = (window as any).__fileModificationManager;
    if (modManager && modManager.modifications) {
      const state = modManager.modifications.get(normalizedPath);
      if (state && state.isModified) {
        console.log('✅ Found modified in FileModificationManager');
        return true;
      }
    }
    
    // Method 2: Check ModifiedFilesTracker
    const modTracker = (window as any).__modifiedFilesTracker;
    if (modTracker && modTracker.modifiedFiles) {
      // Check with both path formats
      if (modTracker.modifiedFiles.has(filePath) || 
          modTracker.modifiedFiles.has(normalizedPath)) {
        console.log('✅ Found modified in ModifiedFilesTracker');
        return true;
      }
      
      // Also check by comparing normalized paths
      for (const modPath of Array.from(modTracker.modifiedFiles)) {
        const normalizedModPath = (modPath as string).replace(/\//g, '\\');
        if (normalizedModPath === normalizedPath) {
          console.log('✅ Found modified in ModifiedFilesTracker (normalized match)');
          return true;
        }
      }
    }
    
    // Method 3: Check TabManager
    const tabManager = (window as any).tabManager;
    if (tabManager && tabManager.tabs) {
      const tab = tabManager.tabs.find((t: any) => {
        const tabPath = (t.path || t.fullPath || '').replace(/\//g, '\\');
        return tabPath === normalizedPath;
      });
      
      if (tab && tab.modified) {
        console.log('✅ Found modified in TabManager');
        return true;
      }
    }
    
    console.log('ℹ️ File was not modified');
    return false;
  }

  /**
   * Clean up file tracking after deletion
   */
  private cleanupFileTracking(filePath: string): void {
    // Remove from modification tracking
    const modManager = (window as any).__fileModificationManager;
    if (modManager && modManager.modifications) {
      modManager.modifications.delete(filePath);
      modManager.modifications.delete(filePath.replace(/\//g, '\\'));
    }
    
    const modTracker = (window as any).__modifiedFilesTracker;
    if (modTracker) {
      modTracker.removeModified(filePath);
    }
    
    // Mark as saved (clean up any indicators)
    try {
      markFileAsSaved(filePath);
    } catch (error) {
      console.warn('Could not mark as saved:', error);
    }
    
    console.log('✅ Cleaned up tracking for:', filePath);
  }

  /**
   * Close tab if file is open
   */
  private closeTabIfOpen(filePath: string): void {
    const tabManager = (window as any).tabManager;
    if (!tabManager) return;

    // Find and close the tab
    const tabs = tabManager.tabs || [];
    const normalizedFilePath = filePath.replace(/\//g, '\\');
    
    const tabIndex = tabs.findIndex((tab: any) => {
      const tabPath = (tab.path || tab.fullPath || '').replace(/\//g, '\\');
      return tabPath === normalizedFilePath;
    });

    if (tabIndex !== -1) {
      const tab = tabs[tabIndex];
      console.log('🗑️ Closing tab for deleted file:', tab.name);
      
      // Close the tab
      if (typeof tabManager.closeTab === 'function') {
        tabManager.closeTab(tab.id);
      } else if (typeof tabManager.removeTab === 'function') {
        tabManager.removeTab(tab.id);
      } else {
        // Manual cleanup
        tabs.splice(tabIndex, 1);
        
        // Remove tab element from DOM
        const tabElement = document.querySelector(`[data-tab-id="${tab.id}"]`);
        if (tabElement) {
          tabElement.remove();
        }
      }
      
      // If this was the active tab, activate another
      if (tab.isActive && tabs.length > 0) {
        const nextTab = tabs[0];
        if (typeof tabManager.activateTab === 'function') {
          tabManager.activateTab(nextTab.id);
        }
      }
    }
  }

  /**
   * Show delete notification with proper styling
   */
  private showDeleteNotification(fileName: string, wasModified: boolean): void {
    const icon = wasModified ? '⚠️' : '🗑️';
    const modWarning = wasModified ? ' (had unsaved changes)' : '';
    const message = `${icon} Deleted: ${fileName}${modWarning}`;
    const type = wasModified ? 'warning' : 'info';
    
    console.log('📢 Showing notification:', message);
    
    this.showNotification(message, type);
  }

  /**
   * Show a notification (HYBRID: Auto-close + Manual close button)
   * Warnings stay 10s, Info stays 5s, but user can close early with X button
   */
  private showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error'): void {
    console.log(`🔔 Notification (${type}):`, message);
    
    // Check for global notification function first
    const showNotif = (window as any).showNotification;
    if (showNotif) {
      showNotif(message, type);
      console.log('✅ Used global showNotification');
      return;
    }

    // Create notification container
    const notif = document.createElement('div');
    notif.className = `delete-notification delete-${type}`;
    
    const colors = {
      info: '#3498db',
      success: '#28a745',
      warning: '#ff9800',
      error: '#dc3545'
    };
    
    const textColors = {
      info: 'white',
      success: 'white',
      warning: '#000000',
      error: 'white'
    };
    
    // Create message span
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    messageSpan.style.flex = '1';
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.setAttribute('aria-label', 'Close notification');
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      color: ${textColors[type]};
      font-size: 20px;
      font-weight: bold;
      cursor: pointer;
      padding: 0;
      margin-left: 12px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s;
      flex-shrink: 0;
    `;
    
    let autoCloseTimer: any;
    
    const closeNotification = () => {
      if (autoCloseTimer) clearTimeout(autoCloseTimer);
      notif.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        notif.remove();
        console.log('🗑️ Notification closed');
      }, 300);
    };
    
    // Close button hover effects
    closeBtn.onmouseover = () => {
      closeBtn.style.background = 'rgba(0,0,0,0.2)';
    };
    
    closeBtn.onmouseout = () => {
      closeBtn.style.background = 'transparent';
    };
    
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      console.log('👆 User manually closed notification');
      closeNotification();
    };
    
    // Build notification
    notif.appendChild(messageSpan);
    notif.appendChild(closeBtn);
    
    notif.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      padding: 14px 20px;
      background: ${colors[type]};
      color: ${textColors[type]};
      border-radius: 8px;
      box-shadow: 0 6px 16px rgba(0,0,0,0.5);
      z-index: 99999;
      font-size: 14px;
      font-weight: 600;
      animation: slideInRight 0.3s ease;
      max-width: 400px;
      display: flex;
      align-items: center;
      gap: 10px;
      border: 2px solid ${type === 'warning' ? '#ff6b00' : colors[type]};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      cursor: default;
    `;
    
    // Add animations if not exists
    if (!document.getElementById('delete-notification-animations')) {
      const style = document.createElement('style');
      style.id = 'delete-notification-animations';
      style.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(450px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(450px);
            opacity: 0;
          }
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        .delete-notification:hover {
          transform: scale(1.02);
          transition: transform 0.2s;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Add pulse animation for warnings
    if (type === 'warning') {
      notif.style.animation = 'slideInRight 0.3s ease, pulse 0.5s ease 0.3s';
    }
    
    document.body.appendChild(notif);
    console.log(`✅ Created notification (auto-close in ${type === 'warning' ? '10s' : '5s'}, or click ✕ to close)`);
    
    // Auto-close after duration (warnings stay longer)
    const duration = type === 'warning' || type === 'error' ? 10000 : 5000;
    autoCloseTimer = setTimeout(() => {
      closeNotification();
      console.log(`⏰ Notification auto-closed after ${duration/1000}s`);
    }, duration);
  }

  /**
   * Get deletion history
   */
  public getDeleteHistory(): DeletedFileInfo[] {
    return [...this.deletedFiles];
  }

  /**
   * Get recently deleted files
   */
  public getRecentDeletes(count: number = 10): DeletedFileInfo[] {
    return this.deletedFiles.slice(0, count);
  }

  /**
   * Check if file was recently deleted
   */
  public wasRecentlyDeleted(filePath: string, withinMinutes: number = 5): boolean {
    const now = new Date();
    return this.deletedFiles.some(file => {
      const normalizedPath = file.path.replace(/\//g, '\\');
      const normalizedCheck = filePath.replace(/\//g, '\\');
      
      if (normalizedPath !== normalizedCheck) return false;
      
      const timeDiff = (now.getTime() - file.deletedAt.getTime()) / 1000 / 60;
      return timeDiff <= withinMinutes;
    });
  }

  /**
   * Clear deletion history
   */
  public clearHistory(): void {
    this.deletedFiles = [];
    console.log('🗑️ Deletion history cleared');
  }
}

// Initialize
let fileDeletionHandler: FileDeletionHandler | null = null;

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    fileDeletionHandler = new FileDeletionHandler();
    console.log('✅ FileDeletionHandler initialized');
  }, 1000);
});

// Export for use in other modules
export { FileDeletionHandler, fileDeletionHandler };

// Helper function to trigger deletion notification from context menu
export function notifyFileDeleted(filePath: string, fileName?: string): void {
  if (fileDeletionHandler) {
    fileDeletionHandler.handleFileDeleted(filePath, fileName);
  } else {
    // Fallback if handler not ready
    document.dispatchEvent(new CustomEvent('file-deleted', {
      detail: { path: filePath, name: fileName }
    }));
  }
}