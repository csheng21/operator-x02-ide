// explorerManager.ts - Updated for Terminal in Explorer Panel Layout
// Integrates with the new tabbed explorer system (Files | Search | Terminal)
import { contextMenuIcons, createIconElement, addEnhancedContextMenuStyles } from './contextMenuIcons';

// DEBUG: Check if import worked
console.log('🔍 DEBUG: contextMenuIcons loaded?', !!contextMenuIcons);
console.log('🔍 DEBUG: Icon count:', Object.keys(contextMenuIcons).length);
console.log('🔍 DEBUG: Sample icon:', contextMenuIcons.openFile?.substring(0, 50));
import { 
  getCurrentFolderRootPath, 
  setCurrentFolderRootPath,
  saveFile,
  readFile,
  showNotification,
  isTauriAvailable,
  getDirectoryTree,
  openFolderDialog,
  openFileDialog,
  revealInExplorer
} from './fileSystem';

import { invoke } from '@tauri-apps/api/core';
import { openFolderWithQuickAccess } from './quickAccessIntegration';
// Maintain original interfaces for compatibility
interface TauriFileEntry {
  name: string;
  path: string;
  is_directory: boolean;
  size?: number;
  children?: TauriFileEntry[];
}

interface TauriSystemInfo {
  username: string;
  hostname: string;
  os_name: string;
  os_version: string;
  home_dir: string;
  documents_dir?: string;
  downloads_dir?: string;
  app_data_dir?: string;
  temp_dir: string;
}

interface TauriFileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TauriFileTreeNode[];
  size?: number;
  is_directory?: boolean;
}

interface MenuItem {
  id?: string;
  label?: string;
  icon?: string; // This will now be the key from contextMenuIcons
  shortcut?: string;
  action?: () => void;
  type?: 'separator';
  danger?: boolean; // For delete operations
  special?: boolean; // For AI/special features
}

// Performance utilities (conservative)
const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const throttle = <T extends (...args: any[]) => any>(func: T, limit: number): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Enhanced Context Menu Manager - maintaining original API
 */
class ContextMenuManager {
  private currentPath: string = '';
  private currentType: 'file' | 'folder' = 'file';
  private activeMenu: HTMLElement | null = null;

  // Performance optimization: debounced clipboard operations
  private clipboardDebouncer = debounce(async (text: string, message: string) => {
    try {
      if (isTauriAvailable()) {
        await invoke('write_clipboard', { text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        this.fallbackCopy(text);
      }
      showNotification(message, 'success');
    } catch (error) {
      console.error('Clipboard operation failed:', error);
      this.fallbackCopy(text);
    }
  }, 100);

  public showContextMenu(event: MouseEvent, filePath: string, type: 'file' | 'folder'): void {
    if (!isTauriAvailable()) {
      showNotification('Context menu features require Tauri desktop app', 'error');
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    
    this.currentPath = filePath;
    this.currentType = type;
    
    console.log('🔍 Context menu for path:', filePath);
    console.log('🔍 Current folder root:', getCurrentFolderRootPath());
    
    this.removeExistingMenu();
    
    const contextMenu = this.createContextMenu(event.clientX, event.clientY);
    document.body.appendChild(contextMenu);
    this.activeMenu = contextMenu;
    
    setTimeout(() => {
      document.addEventListener('click', this.hideMenuHandler.bind(this), { once: true });
    }, 10);
  }

  private createContextMenu(x: number, y: number): HTMLElement {
    const menu = document.createElement('div');
    menu.className = 'enhanced-context-menu';
    menu.style.cssText = `
      position: fixed;
      top: ${y}px;
      left: ${x}px;
      background: #252526 !important;
      border: 1px solid #454545 !important;
      border-radius: 6px !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
      z-index: 10000 !important;
      min-width: 220px !important;
      padding: 6px 0 !important;
      font-size: 13px !important;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
      animation: contextMenuSlide 0.15s ease !important;
      transform: translateZ(0) !important;
    `;

    addEnhancedContextMenuStyles();

    const menuItems = this.getMenuItems();
    const fragment = document.createDocumentFragment(); // Performance: batch DOM operations
    
    menuItems.forEach(item => {
      if (item.type === 'separator') {
        fragment.appendChild(this.createSeparator());
      } else {
        fragment.appendChild(this.createMenuItem(item));
      }
    });
    
    menu.appendChild(fragment);
    this.adjustMenuPosition(menu, x, y);

    return menu;
  }
private getMenuItems(): MenuItem[] {
  const baseItems: MenuItem[] = [];

  // File specific actions
  if (this.currentType === 'file') {
    baseItems.push(
      {
        id: 'open-file',
        label: 'Open',
        icon: 'openFile',  // ← Changed from '📂'
        action: () => this.openFile()
      },
      {
        id: 'open-new-tab',
        label: 'Open in New Tab',
        icon: 'openNewTab',  // ← Changed from '📑'
        action: () => this.openInNewTab()
      },
      { type: 'separator' }
    );
  }

  // Folder specific actions
  if (this.currentType === 'folder') {
    baseItems.push(
      {
        id: 'generate-tree',
        label: 'Generate File Tree...',
        icon: 'fileTree',      // ← NEW
        special: true,          // ← NEW: cyan color
        action: () => this.generateFileTree()
      },
      {
        id: 'quick-tree',
        label: 'Quick Tree (tree.txt)',
        icon: 'quickTree',     // ← NEW
        action: () => this.generateQuickTree()
      },
      {
        id: 'ask-ai',
        label: 'Ask AI About This Folder',
        icon: 'aiFolder',      // ← NEW
        special: true,          // ← NEW: cyan color
        action: () => this.askAIAboutFolder()
      },
      { type: 'separator' },
      {
        id: 'open-folder',
        label: 'Open Folder',
        icon: 'openFolder',    // ← Changed from '📂'
        action: () => this.openFolder()
      },
      {
        id: 'expand-collapse',
        label: 'Expand/Collapse',
        icon: 'expand',        // ← Changed from '▼'
        action: () => this.toggleFolderExpansion()
      },
      { type: 'separator' },
      {
        id: 'new-file',
        label: 'New File',
        icon: 'newFile',       // ← Changed from '📄'
        action: () => this.createNewFile()
      },
      {
        id: 'new-folder',
        label: 'New Folder',
        icon: 'newFolder',     // ← Changed from '📁'
        action: () => this.createNewFolder()
      },
      { type: 'separator' }
    );
  }

  // Common actions
  baseItems.push(
    {
      id: 'copy-path',
      label: 'Copy Path',
      icon: 'copyPath',        // ← Changed from '📋'
      action: () => this.copyFullPath()
    },
    {
      id: 'copy-relative-path',
      label: 'Copy Relative Path',
      icon: 'copyRelativePath', // ← Changed from '📎'
      action: () => this.copyRelativePath()
    },
    { type: 'separator' },
    {
      id: 'rename',
      label: 'Rename',
      icon: 'rename',          // ← Changed from '✏️'
      action: () => this.renameItem()
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: 'duplicate',       // ← Changed from '📋'
      action: () => this.duplicateItem()
    },
    { type: 'separator' },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'delete',          // ← Changed from '🗑️'
      danger: true,             // ← NEW: red color
      action: () => this.deleteItem()
    }
  );

  // System actions for folders
  if (this.currentType === 'folder') {
    baseItems.push(
      { type: 'separator' },
      {
        id: 'reveal-explorer',
        label: 'Reveal in File Explorer',
        icon: 'reveal',        // ← NEW
        action: () => this.revealInFileExplorer()
      },
      {
        id: 'open-terminal',
        label: 'Open in Terminal',
        icon: 'openTerminal',  // ← NEW
        action: () => this.openInTerminal()
      }
    );
  }

  return baseItems;
}
  private createMenuItem(item: MenuItem): HTMLElement {
  const menuItem = document.createElement('div');
  menuItem.className = 'context-menu-item';
  
  // Add special classes for styling
  if (item.danger) {
    menuItem.classList.add('danger');
  }
  if (item.special) {
    menuItem.classList.add('special');
  }

  // Add SVG icon
  if (item.icon && contextMenuIcons[item.icon as keyof typeof contextMenuIcons]) {
    const iconElement = createIconElement(
      contextMenuIcons[item.icon as keyof typeof contextMenuIcons]
    );
    menuItem.appendChild(iconElement);
  }

  // Add label
  const labelSpan = document.createElement('span');
  labelSpan.className = 'context-menu-item-label';
  labelSpan.textContent = item.label || '';
  menuItem.appendChild(labelSpan);

  // Add shortcut if present
  if (item.shortcut) {
    const shortcutSpan = document.createElement('span');
    shortcutSpan.className = 'context-menu-item-shortcut';
    shortcutSpan.textContent = item.shortcut;
    menuItem.appendChild(shortcutSpan);
  }

  // Add click handler
  if (item.action) {
    menuItem.addEventListener('click', (e) => {
      e.stopPropagation();
      item.action!();
      this.hideMenu();
    });
  }

  return menuItem;
}

  private createSeparator(): HTMLElement {
    const separator = document.createElement('div');
    separator.className = 'context-menu-separator';
    separator.style.cssText = `
      height: 1px !important;
      background: #454545 !important;
      margin: 4px 8px !important;
    `;
    return separator;
  }

  // Copy actions with performance optimization
  private copyFullPath = (): void => {
    this.clipboardDebouncer(this.currentPath, 'Full path copied to clipboard');
  };

  private copyRelativePath = (): void => {
    const relativePath = this.getRelativePath();
    this.clipboardDebouncer(relativePath, 'Relative path copied to clipboard');
  };

  private copyFilename = (): void => {
    const filename = this.getFilename();
    this.clipboardDebouncer(filename, 'Filename copied to clipboard');
  };

  private copyFolderName = (): void => {
    const folderName = this.getFolderName();
    this.clipboardDebouncer(folderName, 'Folder name copied to clipboard');
  };

  private copyUnixPath = (): void => {
    const unixPath = this.currentPath.replace(/\\/g, '/');
    this.clipboardDebouncer(unixPath, 'Unix path copied to clipboard');
  };

  private copyWindowsPath = (): void => {
    const windowsPath = this.currentPath.replace(/\//g, '\\');
    this.clipboardDebouncer(windowsPath, 'Windows path copied to clipboard');
  };

  private getRelativePath(): string {
    const currentFolderRootPath = getCurrentFolderRootPath();
    if (!currentFolderRootPath) {
      return this.currentPath;
    }
    
    if (this.currentPath.startsWith(currentFolderRootPath)) {
      let relativePath = this.currentPath.substring(currentFolderRootPath.length);
      relativePath = relativePath.replace(/^[/\\]/, '');
      return relativePath || '.';
    }
    
    return this.currentPath;
  }

  private getFilename(): string {
    return this.currentPath.split(/[/\\]/).pop() || '';
  }

  private getFolderName(): string {
    const parts = this.currentPath.split(/[/\\]/);
    return parts[parts.length - 1] || parts[parts.length - 2] || '';
  }

  private fallbackCopy(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        showNotification('Path copied to clipboard', 'success');
      } else {
        throw new Error('execCommand failed');
      }
    } catch (error) {
      prompt('Copy this path manually:', text);
    } finally {
      document.body.removeChild(textArea);
    }
  }

  private async revealInExplorer(): Promise<void> {
    try {
      if (!isTauriAvailable()) {
        showNotification('Reveal in explorer requires Tauri desktop app', 'error');
        return;
      }

      console.log('🔍 Revealing in explorer via Tauri:', this.currentPath);
      await revealInExplorer(this.currentPath);
      
    } catch (error) {
      console.error('❌ Error revealing in explorer:', error);
      showNotification('Failed to reveal in explorer', 'error');
      
      try {
        await this.copyToClipboard(this.currentPath, 'Path copied - open in file manager manually');
      } catch (clipboardError) {
        prompt('Copy this path manually:', this.currentPath);
      }
    }
  }

  private async openInTerminal(): Promise<void> {
    try {
      if (!isTauriAvailable()) {
        // Switch to terminal tab in explorer and show a message
        this.switchToTerminalTab();
        showNotification('Integrated terminal opened - full terminal requires Tauri desktop app', 'info');
        return;
      }

      console.log('💻 Opening in terminal via Tauri:', this.currentPath);
      
      let terminalPath = this.currentPath;
      if (this.currentType === 'file') {
        terminalPath = this.currentPath.substring(0, this.currentPath.lastIndexOf(/[/\\]/.test(this.currentPath) ? 
          (this.currentPath.includes('/') ? '/' : '\\') : '/'));
      }
      
      await invoke('open_terminal', { path: terminalPath });
      showNotification('Opened in external terminal', 'success');
      
    } catch (error) {
      console.error('❌ Error opening in terminal:', error);
      // Fallback to integrated terminal
      this.switchToTerminalTab();
      showNotification('External terminal failed - switched to integrated terminal', 'warning');
    }
  }

  private switchToTerminalTab(): void {
    // Switch to terminal tab in the explorer
    const terminalTab = document.querySelector('[data-tab-id="terminal"]') as HTMLElement;
    if (terminalTab) {
      terminalTab.click();
      
      // Focus terminal input
      setTimeout(() => {
        const terminalInput = document.getElementById('integrated-terminal-input') as HTMLInputElement;
        if (terminalInput) {
          terminalInput.focus();
        }
      }, 100);
    }
  }

  private async copyToClipboard(text: string, successMessage: string): Promise<void> {
    try {
      if (isTauriAvailable()) {
        await invoke('write_clipboard', { text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        this.fallbackCopy(text);
        return;
      }
      showNotification(successMessage, 'success');
    } catch (error) {
      console.error('❌ Failed to copy to clipboard:', error);
      this.fallbackCopy(text);
    }
  }

  private removeExistingMenu(): void {
    if (this.activeMenu) {
      this.activeMenu.remove();
      this.activeMenu = null;
    }
    
    // Fallback: remove any existing menus
    const existingMenus = document.querySelectorAll('.enhanced-context-menu');
    existingMenus.forEach(menu => menu.remove());
  }

  private hideMenuHandler(event: Event): void {
    if (this.activeMenu && !this.activeMenu.contains(event.target as Node)) {
      this.removeExistingMenu();
    }
  }

  private adjustMenuPosition(menu: HTMLElement, x: number, y: number): void {
    // Temporarily append to measure
    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    
    let adjustedX = x;
    let adjustedY = y;
    
    if (x + rect.width > window.innerWidth) {
      adjustedX = window.innerWidth - rect.width - 10;
    }
    
    if (y + rect.height > window.innerHeight) {
      adjustedY = window.innerHeight - rect.height - 10;
    }
    
    menu.style.left = `${Math.max(0, adjustedX)}px`;
    menu.style.top = `${Math.max(0, adjustedY)}px`;
  }


  public cleanup(): void {
    this.removeExistingMenu();
  }
}

/**
 * Enhanced Folder Manager - Updated for new tabbed layout
 */
class IntegratedFolderManager {
  private rootFolder: TauriFileTreeNode | null = null;
  private fileStatusCache = new Map<string, boolean>(); // Performance: cache file status

  // Performance optimization: debounced status updates
  private updateStatusesDebounced = debounce(() => {
    this.batchUpdateFileStatuses();
  }, 150);

  // Performance optimization: batch DOM updates
  private batchUpdateFileStatuses(): void {
    const fileElements = document.querySelectorAll('.integrated-file-item');
    const updates: Array<{element: HTMLElement, isOpen: boolean}> = [];
    
    fileElements.forEach(fileElement => {
      const filePath = (fileElement as HTMLElement).dataset.path;
      if (filePath) {
        const isOpen = this.isFileOpen(filePath);
        updates.push({ element: fileElement as HTMLElement, isOpen });
      }
    });

    // Batch DOM updates using requestAnimationFrame
    requestAnimationFrame(() => {
      updates.forEach(({ element, isOpen }) => {
        this.updateFileStatus(element, isOpen);
      });
    });
  }

  private isFileOpen(filePath: string): boolean {
    // Performance: check cache first
    if (this.fileStatusCache.has(filePath)) {
      return this.fileStatusCache.get(filePath)!;
    }

    const fileName = this.getDisplayName(filePath);
    let isOpen = false;
    
    // Check tab manager
    const tabManager = (window as any).tabManager;
    if (tabManager && tabManager.tabs) {
      isOpen = tabManager.tabs.some((tab: any) => {
        return tab.path === filePath || 
               tab.path === fileName || 
               tab.fileName === fileName ||
               tab.fullPath === filePath ||
               this.getDisplayName(tab.path || '') === fileName ||
               this.getDisplayName(tab.fullPath || '') === fileName;
      });
    }
    
    if (!isOpen) {
      const tabElements = document.querySelectorAll('.tab-item, .tab, [data-tab], .editor-tab');
      for (const tabEl of tabElements) {
        const tabText = tabEl.textContent?.trim() || '';
        const tabPath = (tabEl as HTMLElement).dataset.path || '';
        const tabFileName = (tabEl as HTMLElement).dataset.fileName || '';
        const tabFilePath = (tabEl as HTMLElement).dataset.filePath || '';
        
        if (tabText.includes(fileName) || 
            tabText === fileName ||
            tabPath === filePath ||
            tabPath === fileName ||
            tabFileName === fileName ||
            tabFilePath === filePath ||
            this.getDisplayName(tabPath) === fileName ||
            this.extractFileNameFromText(tabText) === fileName) {
          isOpen = true;
          break;
        }
      }
    }
    
    // Cache the result
    this.fileStatusCache.set(filePath, isOpen);
    return isOpen;
  }

  private getDisplayName(filePath: string): string {
    if (!filePath) return '';
    return filePath.split(/[/\\]/).pop() || filePath;
  }

  private extractFileNameFromText(tabText: string): string {
    return tabText.replace(/[*\s]+$/, '').replace(/^\s*[*]\s*/, '').trim();
  }

  public closeAllFiles(): void {
    try {
      console.log('🗑️ Closing all files...');
      let closedCount = 0;
      
      // Clear cache
      this.fileStatusCache.clear();
      
      const tabManager = (window as any).tabManager;
      if (tabManager && tabManager.tabs) {
        const openTabs = [...tabManager.tabs];
        openTabs.forEach((tab: any) => {
          tabManager.closeTab(tab.id);
          closedCount++;
        });
      }
      
      const tabElements = document.querySelectorAll('.tab-item, .tab, [data-tab], .editor-tab');
      tabElements.forEach((tabEl) => {
        const tabElement = tabEl as HTMLElement;
        const closeBtn = tabElement.querySelector('.tab-close, .close-button, [data-close]');
        if (closeBtn) {
          (closeBtn as HTMLElement).click();
          closedCount++;
        } else {
          tabElement.remove();
          closedCount++;
        }
      });
      
      if (closedCount > 0) {
        const editor = (window as any).monaco?.editor?.getEditors?.()?.[0];
        if (editor) {
          editor.setValue('');
          editor.setModel(null);
        }
      }
      
      console.log(`✅ Closed ${closedCount} files`);
      showNotification(`Closed ${closedCount} files`, 'success');
      
      setTimeout(() => {
        this.updateAllFileStatuses();
      }, 100);
      
    } catch (error) {
      console.error('❌ Error closing all files:', error);
      showNotification('Failed to close all files', 'error');
    }
  }

  public closeOtherFiles(): void {
    try {
      console.log('🗑️ Closing other files...');
      let closedCount = 0;
      
      // Clear cache
      this.fileStatusCache.clear();
      
      let activeTabId = null;
      let activeTabElement = null;
      
      const tabManager = (window as any).tabManager;
      if (tabManager) {
        const activeTab = tabManager.getActiveTab?.();
        if (activeTab) {
          activeTabId = activeTab.id;
        }
      }
      
      activeTabElement = document.querySelector('.tab-item[style*="rgb(58, 61, 65)"], .tab.active, .tab[data-active="true"], .tab-item.active, .tab-item[data-active="true"], .editor-tab.active');
      
      if (!activeTabId && !activeTabElement) {
        showNotification('No active file to keep open', 'info');
        return;
      }
      
      if (tabManager && activeTabId) {
        const tabsToClose = tabManager.tabs?.filter((tab: any) => tab.id !== activeTabId) || [];
        tabsToClose.forEach((tab: any) => {
          tabManager.closeTab(tab.id);
          closedCount++;
        });
      }
      
      const allTabElements = document.querySelectorAll('.tab-item, .tab, [data-tab], .editor-tab');
      allTabElements.forEach((tabEl) => {
        if (tabEl !== activeTabElement) {
          const tabElement = tabEl as HTMLElement;
          const closeBtn = tabElement.querySelector('.tab-close, .close-button, [data-close]');
          if (closeBtn) {
            (closeBtn as HTMLElement).click();
            closedCount++;
          } else {
            tabElement.remove();
            closedCount++;
          }
        }
      });
      
      console.log(`✅ Closed ${closedCount} other files`);
      showNotification(`Closed ${closedCount} other files`, 'success');
      
      setTimeout(() => {
        this.updateAllFileStatuses();
      }, 100);
      
    } catch (error) {
      console.error('❌ Error closing other files:', error);
      showNotification('Failed to close other files', 'error');
    }
  }

  public closeFolder(): void {
    try {
      if (!isTauriAvailable()) {
        showNotification('Close folder requires Tauri desktop app', 'error');
        return;
      }

      console.log('📁❌ Closing folder...');
      
      const folderName = this.rootFolder?.name || 'current folder';
      const shouldClose = confirm(`Close "${folderName}" folder?\n\nThis will:\n• Close all open files\n• Clear the file explorer\n• Return to empty state\n\nContinue?`);
      
      if (!shouldClose) {
        console.log('📁 Folder close cancelled by user');
        return;
      }
      
      showNotification('Closing folder...', 'info');
      
      setCurrentFolderRootPath('');
      console.log('🧹 Cleared folder root path');
      
      this.closeAllFilesFromCurrentFolder();
      
      this.rootFolder = null;
      this.fileStatusCache.clear();
      
      this.restoreEmptyExplorerState();
      
      const editor = (window as any).monaco?.editor?.getEditors?.()?.[0];
      if (editor) {
        editor.setValue('');
        editor.setModel(null);
      }
      
      console.log('✅ Folder closed successfully');
      showNotification(`Folder "${folderName}" closed successfully`, 'success');
      
    } catch (error) {
      console.error('❌ Error closing folder:', error);
      showNotification('Failed to close folder', 'error');
    }
  }

  private closeAllFilesFromCurrentFolder(): void {
    if (!this.rootFolder) return;
    
    const folderPath = this.rootFolder.path;
    console.log(`🗑️ Closing all files from folder: ${folderPath}`);
    
    const tabManager = (window as any).tabManager;
    if (tabManager && tabManager.tabs) {
      const tabsToClose = tabManager.tabs.filter((tab: any) => {
        return tab.fullPath?.startsWith(folderPath) || 
               tab.path?.startsWith(folderPath) ||
               (this.rootFolder && this.isFileFromCurrentFolder(tab.path || tab.fileName));
      });
      
      tabsToClose.forEach((tab: any) => {
        tabManager.closeTab(tab.id);
      });
      
      console.log(`📋 Closed ${tabsToClose.length} tabs via tab manager`);
    }
    
    const tabElements = document.querySelectorAll('.tab-item, .tab, [data-tab], .editor-tab');
    let domTabsClosed = 0;
    
    tabElements.forEach((tabEl) => {
      const tabElement = tabEl as HTMLElement;
      const tabPath = tabElement.dataset.path || '';
      const tabFileName = tabElement.dataset.fileName || '';
      const tabText = tabElement.textContent?.trim() || '';
      
      if (tabPath.startsWith(folderPath) || 
          (this.rootFolder && this.isFileFromCurrentFolder(tabFileName || tabText))) {
        
        const closeBtn = tabElement.querySelector('.tab-close, .close-button, [data-close]');
        if (closeBtn) {
          (closeBtn as HTMLElement).click();
        } else {
          tabElement.remove();
        }
        domTabsClosed++;
      }
    });
    
    console.log(`📋 Closed ${domTabsClosed} DOM tabs`);
  }

  private isFileFromCurrentFolder(fileName: string): boolean {
    if (!this.rootFolder || !fileName) return false;
    
    const checkInNode = (node: TauriFileTreeNode): boolean => {
      if (node.type === 'file' && node.name === fileName) {
        return true;
      }
      
      if (node.children) {
        return node.children.some(child => checkInNode(child));
      }
      
      return false;
    };
    
    return checkInNode(this.rootFolder);
  }

  private restoreEmptyExplorerState(): void {
    const explorerContainer = this.findFilesTabContent();
    
    if (!explorerContainer) {
      console.warn('⚠️ Files tab content not found for restoration');
      return;
    }
    
    explorerContainer.innerHTML = '';
    
    const emptyState = document.createElement('div');
    emptyState.className = 'explorer-empty-state';
    emptyState.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      color: #888;
      min-height: 300px;
      animation: fadeIn 0.5s ease;
    `;
    
    const emptyMessage = document.createElement('div');
    emptyMessage.style.cssText = `
      font-size: 16px;
      margin-bottom: 8px;
      color: #aaa;
      font-weight: 500;
    `;
    emptyMessage.textContent = 'No folder opened';
    
    const openFolderBtn = document.createElement('button');
    openFolderBtn.textContent = 'Open Folder';
    openFolderBtn.style.cssText = `
      padding: 12px 24px;
      background: linear-gradient(135deg, #0078d7, #106ebe);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 120, 215, 0.3);
      margin-top: 12px;
      transform: translateZ(0);
    `;
    
    openFolderBtn.addEventListener('click', () => {
      this.openFolder();
    });
    
    emptyState.appendChild(emptyMessage);
    emptyState.appendChild(openFolderBtn);
    explorerContainer.appendChild(emptyState);
    
    console.log('✅ Explorer restored to empty state in Files tab');
  }

  async openFolder(): Promise<void> {
    try {
      if (!isTauriAvailable()) {
        showNotification('Folder operations require Tauri desktop app', 'error');
        return;
      }

      console.log('🔄 Opening folder with Tauri native API...');
      
      // Ensure we're on the Files tab before opening
      this.switchToFilesTab();
      
      const folderPath = await openFolderWithQuickAccess();
      
      if (!folderPath) {
        console.log('📁 Folder selection cancelled');
        return;
      }

      console.log('📁 Selected folder:', folderPath);
      
      setCurrentFolderRootPath(folderPath);
      console.log('📁 Set current folder root path:', folderPath);

      const folderTree = await getDirectoryTree(folderPath, 10);
      
      if (!folderTree) {
        throw new Error('Failed to load directory structure');
      }

      this.rootFolder = this.convertTauriTreeToInternal(folderTree);
      
      this.integrateIntoFilesTab(this.rootFolder);
      
      showNotification(`Opened folder: ${this.rootFolder.name}`, 'success');
      
      this.addProminentCloseButtons();
      
    } catch (error) {
      console.error('❌ Error opening folder:', error);
      if ((error as any).name !== 'AbortError') {
        showNotification('Failed to open folder', 'error');
      }
    }
  }

  private switchToFilesTab(): void {
    const filesTab = document.querySelector('[data-tab-id="files"]') as HTMLElement;
    if (filesTab && !filesTab.classList.contains('active')) {
      filesTab.click();
      console.log('🔄 Switched to Files tab');
    }
  }

private convertTauriTreeToInternal(tauriTree: any): TauriFileTreeNode {
  console.log(`🔍 Converting node: ${tauriTree.name}, path: ${tauriTree.path}`);  // ✅ DEBUG
  
  const node: TauriFileTreeNode = {
    name: tauriTree.name,
    path: tauriTree.path,  // ✅ This should already be the full path from Tauri
    type: tauriTree.is_directory ? 'directory' : 'file',
    size: tauriTree.size,
    is_directory: tauriTree.is_directory
  };

  if (tauriTree.children && tauriTree.children.length > 0) {
    node.children = tauriTree.children.map((child: any) => {
      // ✅ Each child should already have its full path from Tauri
      console.log(`  └─ Child: ${child.name}, path: ${child.path}`);  // ✅ DEBUG
      return this.convertTauriTreeToInternal(child);
    });
  }

  return node;
}

  private findFilesTabContent(): HTMLElement | null {
    // Updated to find the Files tab content specifically
    const filesContent = document.getElementById('files-content');
    if (filesContent) return filesContent;
    
    // Fallback: look for any content in the Files tab
    const filesTab = document.querySelector('[data-tab-id="files"]');
    if (filesTab) {
      const tabContent = document.querySelector('#files-content, .tab-content[style*="flex"]');
      if (tabContent) return tabContent as HTMLElement;
    }
    
    // Last resort: use the old method for backwards compatibility
    const selectors = [
      '#files-content',
      '.tab-content.active',
      '.explorer-content .tab-content',
      '.file-tree', 
      '#file-explorer',
      '[data-explorer]',
      '.sidebar .explorer',
      '.panel .explorer',
      '.explorer-panel .explorer-content'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) return element;
    }
    
    return null;
  }

  private addProminentCloseButtons(): void {
    this.addCloseFolderToHeader();
    this.enableContextMenu();
    this.showKeyboardHint();
  }

  private addCloseFolderToHeader(): void {
    // Find the explorer panel header (not the files tab content)
    const explorerPanel = document.querySelector('.explorer-panel');
    if (!explorerPanel) return;

    let header = explorerPanel.querySelector('.panel-header, .explorer-header');
    if (!header) {
      header = document.createElement('div');
      header.className = 'panel-header';
      header.innerHTML = '<span class="panel-title">EXPLORER</span>';
      explorerPanel.insertBefore(header, explorerPanel.firstChild);
    }

    const existingClose = header.querySelector('.close-folder-btn');
    if (existingClose) existingClose.remove();

    let actionsContainer = header.querySelector('.panel-actions');
    if (!actionsContainer) {
      actionsContainer = document.createElement('div');
      actionsContainer.className = 'panel-actions';
      header.appendChild(actionsContainer);
    }

    const closeButton = document.createElement('button');
    closeButton.className = 'close-folder-btn';
    closeButton.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z"/>
      </svg>
    `;
    closeButton.title = 'Close Folder (Ctrl+Shift+F)';
    closeButton.style.cssText = `
      background: #be5046 !important;
      color: white !important;
      border: 1px solid #a04338 !important;
      border-radius: 3px !important;
      width: 22px !important;
      height: 22px !important;
      cursor: pointer !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 1px 2px rgba(190, 80, 70, 0.3) !important;
      z-index: 100 !important;
      position: relative !important;
      opacity: 0.9 !important;
      transform: translateZ(0) !important;
    `;

    // Performance: use passive listeners
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.transform = 'scale(1.1) translateZ(0)';
      closeButton.style.boxShadow = '0 2px 6px rgba(190, 80, 70, 0.5)';
      closeButton.style.background = '#a04338';
      closeButton.style.opacity = '1';
    }, { passive: true });

    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.transform = 'scale(1) translateZ(0)';
      closeButton.style.boxShadow = '0 1px 2px rgba(190, 80, 70, 0.3)';
      closeButton.style.background = '#be5046';
      closeButton.style.opacity = '0.9';
    }, { passive: true });

    closeButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.closeFolder();
    });

    actionsContainer.appendChild(closeButton);
    console.log('✅ Added close button to explorer header');
  }

  private enableContextMenu(): void {
    // Context menu setup is handled globally
  }

  private showKeyboardHint(): void {
    const existing = document.querySelector('.keyboard-hint');
    if (existing) existing.remove();

    const hint = document.createElement('div');
    hint.className = 'keyboard-hint';
    hint.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">💡 Keyboard Shortcuts</div>
      <div><kbd>Ctrl+Shift+F</kbd> - Close Folder</div>
      <div><kbd>Ctrl+Shift+O</kbd> - Open Folder</div>
      <div><kbd>Ctrl+Alt+C</kbd> - Copy Path</div>
      <div><kbd>Alt+1</kbd> - Files Tab</div>
      <div><kbd>Alt+3</kbd> - Terminal Tab</div>
    `;
    hint.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 9998;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      animation: slideInLeft 0.3s ease;
    `;

    if (!document.querySelector('#keyboard-hint-styles')) {
      const style = document.createElement('style');
      style.id = 'keyboard-hint-styles';
      style.textContent = `
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        kbd {
          background: #333;
          border: 1px solid #555;
          border-radius: 3px;
          padding: 2px 6px;
          font-family: monospace;
          font-size: 11px;
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(hint);

    setTimeout(() => {
      if (hint.parentNode) {
        hint.style.animation = 'slideInLeft 0.3s ease reverse';
        setTimeout(() => hint.remove(), 300);
      }
    }, 8000);

    console.log('✅ Added keyboard shortcut hint');
  }

  private integrateIntoFilesTab(folderTree: TauriFileTreeNode): void {
    const filesTabContent = this.findFilesTabContent();
    
    if (!filesTabContent) {
      console.error('❌ Files tab content not found - creating fallback');
      this.createFallbackExplorer(folderTree);
      return;
    }

    console.log('✅ Found files tab content:', filesTabContent);

    // Clear the files tab content
    filesTabContent.innerHTML = '';
    
    // Add toolbar to files tab
    this.addToolbar(filesTabContent);
    
    const treeContainer = document.createElement('div');
    treeContainer.className = 'integrated-file-tree';
    treeContainer.style.cssText = `
      padding: 8px 0;
      max-height: calc(100% - 60px);
      overflow-y: auto;
      overflow-x: hidden;
      transform: translateZ(0);
      flex: 1;
    `;
    
    const rootElement = this.createFolderElement(folderTree, true);
    treeContainer.appendChild(rootElement);
    filesTabContent.appendChild(treeContainer);
    
    console.log('✅ Files tab integrated with folder tree');
  }

  private addToolbar(container: HTMLElement): void {
    const toolbar = document.createElement('div');
    toolbar.className = 'explorer-toolbar';
    toolbar.style.cssText = `
      display: flex !important;
      gap: 6px !important;
      padding: 8px 12px !important;
      background: rgba(255, 255, 255, 0.02) !important;
      border: 1px solid rgba(255, 255, 255, 0.06) !important;
      border-radius: 4px !important;
      margin-bottom: 8px !important;
      position: relative !important;
      align-items: center !important;
      flex-shrink: 0 !important;
    `;

    const buttons = [
      { 
        icon: '📄', 
        tooltip: 'New File',
        action: () => this.createNewFile()
      },
      { 
        icon: '📁', 
        tooltip: 'Load File',
        action: () => this.loadSingleFile()
      },
      { 
        icon: '🔄', 
        tooltip: 'Refresh Folder',
        action: () => this.refreshFolder()
      },
      { 
        icon: '❌', 
        tooltip: 'Close Folder',
        action: () => this.closeFolder()
      }
    ];
    
    const fragment = document.createDocumentFragment(); // Performance: batch DOM operations
    
    buttons.forEach(({ icon, tooltip, action }) => {
      const btn = document.createElement('button');
      btn.textContent = icon;
      btn.className = 'toolbar-btn';
      btn.title = tooltip;
      
      btn.style.cssText = `
        width: 28px !important;
        height: 28px !important;
        border-radius: 4px !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: all 0.2s ease !important;
        border: 1px solid transparent !important;
        background: rgba(255, 255, 255, 0.05) !important;
        color: #e6edf3 !important;
        transform: translateZ(0) !important;
      `;
      
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-1px) scale(1.05) translateZ(0)';
        btn.style.background = 'rgba(255, 255, 255, 0.1) !important';
      }, { passive: true });
      
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateY(0) scale(1) translateZ(0)';
        btn.style.background = 'rgba(255, 255, 255, 0.05) !important';
      }, { passive: true });
      
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        action();
      });
      
      fragment.appendChild(btn);
    });
    
    toolbar.appendChild(fragment);
    container.appendChild(toolbar);
  }

  private createFolderElement(node: TauriFileTreeNode, isRoot: boolean = false): HTMLElement {
    const container = document.createElement('div');
    container.className = 'integrated-folder-container';
    
    if (node.type === 'directory') {
      const folderHeader = document.createElement('div');
      folderHeader.className = `integrated-folder-header ${isRoot ? 'root-folder' : ''}`;
      folderHeader.style.cssText = `
        display: flex;
        align-items: center;
        padding: 3px 8px;
        cursor: pointer;
        user-select: none;
        color: #cccccc;
        font-size: 13px;
        border-radius: 4px;
        margin: 1px 0;
        transition: all 0.2s ease;
        transform: translateZ(0);
        ${isRoot ? 'background: rgba(0, 120, 215, 0.1); border: 1px solid rgba(0, 120, 215, 0.2);' : ''}
      `;
      
      folderHeader.dataset.path = node.path;
      
      const icon = document.createElement('span');
      icon.className = 'integrated-folder-icon';
      icon.textContent = isRoot ? '📂' : '📁';
      icon.style.marginRight = '6px';
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = node.name;
      nameSpan.style.fontWeight = isRoot ? 'bold' : 'normal';
      
      folderHeader.appendChild(icon);
      folderHeader.appendChild(nameSpan);
      
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'integrated-folder-children';
      childrenContainer.style.cssText = `
        margin-left: 16px;
        display: ${isRoot ? 'block' : 'none'};
        transition: all 0.2s ease;
        border-left: 1px solid rgba(255, 255, 255, 0.05);
        padding-left: 8px;
      `;
      
      folderHeader.addEventListener('click', () => {
        const isExpanded = childrenContainer.style.display === 'block';
        childrenContainer.style.display = isExpanded ? 'none' : 'block';
        icon.textContent = isExpanded ? (isRoot ? '📁' : '📁') : (isRoot ? '📂' : '📂');
      });
      
      folderHeader.addEventListener('mouseenter', () => {
        folderHeader.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
      }, { passive: true });
      
      folderHeader.addEventListener('mouseleave', () => {
        folderHeader.style.backgroundColor = isRoot ? 'rgba(0, 120, 215, 0.1)' : 'transparent';
      }, { passive: true });
      
      if (node.children) {
        const fragment = document.createDocumentFragment(); // Performance: batch DOM operations
        for (const child of node.children) {
          if (child.type === 'directory') {
            fragment.appendChild(this.createFolderElement(child, false));
          } else {
            fragment.appendChild(this.createFileElement(child));
          }
        }
        childrenContainer.appendChild(fragment);
      }
      
      container.appendChild(folderHeader);
      container.appendChild(childrenContainer);
    }
    
    return container;
  }

  private createFileElement(node: TauriFileTreeNode): HTMLElement {
    const fileElement = document.createElement('div');
    fileElement.className = 'integrated-file-item';
    
  //  path: tauriTree.path,  // ✅ Using Tauri's path
    fileElement.dataset.fileName = node.name;
    fileElement.dataset.fullPath = node.path;
    
    fileElement.style.cssText = `
      display: flex;
      align-items: center;
      padding: 3px 8px;
      cursor: pointer;
      color: #cccccc;
      font-size: 13px;
      border-radius: 4px;
      margin: 1px 0;
      position: relative;
      transition: all 0.2s ease;
      min-height: 22px;
      border-left: 2px solid transparent;
      transform: translateZ(0);
    `;
    
    const icon = document.createElement('span');
    icon.className = 'integrated-file-icon';
    icon.textContent = this.getFileIcon(node.name);
    icon.style.cssText = `
      margin-right: 6px;
      font-size: 12px;
      width: 14px;
      text-align: center;
    `;
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = node.name;
    nameSpan.style.cssText = `
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    
    const statusIndicator = document.createElement('span');
    statusIndicator.className = 'integrated-file-status';
    statusIndicator.style.cssText = `
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: transparent;
      margin-left: 4px;
      margin-right: 2px;
      transition: all 0.2s ease;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'integrated-file-close-btn';
    closeButton.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z"/>
      </svg>
    `;
    closeButton.title = 'Close file';
    closeButton.style.cssText = `
      width: 16px;
      height: 16px;
      border: none;
      background: transparent;
      color: #999;
      border-radius: 50%;
      cursor: pointer;
      font-size: 12px;
      font-weight: bold;
      margin-left: 2px;
      display: none;
      align-items: center;
      justify-content: center;
      line-height: 1;
      transition: all 0.2s ease;
      opacity: 0.7;
      transform: translateZ(0);
    `;
    
    closeButton.addEventListener('mouseenter', (e) => {
      e.stopPropagation();
      closeButton.style.backgroundColor = '#f44336';
      closeButton.style.color = 'white';
      closeButton.style.opacity = '1';
      closeButton.style.transform = 'scale(1.2) translateZ(0)';
    }, { passive: true });
    
    closeButton.addEventListener('mouseleave', (e) => {
      e.stopPropagation();
      closeButton.style.backgroundColor = 'transparent';
      closeButton.style.color = '#999';
      closeButton.style.opacity = '0.7';
      closeButton.style.transform = 'scale(1) translateZ(0)';
    }, { passive: true });
    
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeFileFromExplorer(node);
    });
    
    fileElement.appendChild(icon);
    fileElement.appendChild(nameSpan);
    fileElement.appendChild(statusIndicator);
    fileElement.appendChild(closeButton);
    
    this.updateFileStatus(fileElement, node.path);
    
    fileElement.addEventListener('mouseenter', () => {
      fileElement.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
      fileElement.style.transform = 'translateX(2px) translateZ(0)';
      closeButton.style.display = 'flex';
    }, { passive: true });
    
    fileElement.addEventListener('mouseleave', () => {
      fileElement.style.backgroundColor = 'transparent';
      fileElement.style.transform = 'translateX(0) translateZ(0)';
      if (!this.isFileOpen(node.path)) {
        closeButton.style.display = 'none';
      }
    }, { passive: true });
    
    fileElement.addEventListener('click', (e) => {
      if (e.target === closeButton) return;
      
      this.openFileFromTree(node);
      
      // Highlight selected file - performance optimized
      requestAnimationFrame(() => {
        document.querySelectorAll('.integrated-file-item').forEach(item => {
          item.classList.remove('selected');
          (item as HTMLElement).style.backgroundColor = 'transparent';
          (item as HTMLElement).style.borderLeftColor = 'transparent';
        });
        
        fileElement.classList.add('selected');
        fileElement.style.backgroundColor = 'rgba(0, 120, 215, 0.3)';
        fileElement.style.borderLeftColor = '#0078d7';
      });
      
      this.updateAllFileStatuses();
    });
    
    return fileElement;
  }

  private getFileIcon(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    const iconMap: Record<string, string> = {
      'js': '🟨', 'jsx': '⚛️', 'ts': '🔷', 'tsx': '⚛️',
      'py': '🐍', 'java': '☕', 'cpp': '⚙️', 'c': '⚙️',
      'html': '🌐', 'css': '🎨', 'json': '📋', 'md': '📝',
      'txt': '📝', 'pdf': '📄', 'jpg': '🖼️', 'png': '🖼️',
      'zip': '📦', 'mp3': '🎵', 'mp4': '🎬'
    };
    
    return iconMap[extension] || '📄';
  }

  private createNewFile(): void {
    console.log('Creating new file...');
    showNotification('New file creation not implemented yet', 'info');
  }

  private async loadSingleFile(): Promise<void> {
    try {
      if (!isTauriAvailable()) {
        showNotification('File loading requires Tauri desktop app', 'error');
        return;
      }

      console.log('🔄 Loading single file with Tauri...');
      
      const fileResult = await openFileDialog();
      
      if (fileResult) {
        console.log('✅ File loaded:', fileResult.path);
        
        const tabManager = (window as any).tabManager;
        if (tabManager && typeof tabManager.addTab === 'function') {
          console.log('🎯 Using Monaco TabManager for single file');
          tabManager.addTab(fileResult.path, fileResult.content);
        } else {
          console.warn('⚠️ Monaco TabManager not available');
          this.loadDirectlyIntoEditor(fileResult.content, fileResult.path);
        }
        
        showNotification(`Loaded ${fileResult.path.split(/[/\\]/).pop()}`, 'success');
      }
      
    } catch (error) {
      console.error('❌ Error loading file:', error);
      if ((error as any).name !== 'AbortError') {
        showNotification('Failed to load file', 'error');
      }
    }
  }

  private openFile(): void {
  if (!this.currentPath) return;
  console.log('Opening file:', this.currentPath);
  // Trigger file open event
  document.dispatchEvent(new CustomEvent('file-open-request', {
    detail: { path: this.currentPath }
  }));
  this.removeExistingMenu();
}

private openInNewTab(): void {
  if (!this.currentPath) return;
  console.log('Opening in new tab:', this.currentPath);
  // Trigger new tab event
  document.dispatchEvent(new CustomEvent('file-open-new-tab', {
    detail: { path: this.currentPath }
  }));
  this.removeExistingMenu();
}

private openFolder(): void {
  if (!this.currentPath) return;
  console.log('Opening folder:', this.currentPath);
  // Trigger folder open event
  document.dispatchEvent(new CustomEvent('folder-open-request', {
    detail: { path: this.currentPath }
  }));
  this.removeExistingMenu();
}

private createNewFolder(): void {
  if (!this.currentPath) return;
  console.log('Creating new folder in:', this.currentPath);
  
  const folderName = prompt('Enter folder name:');
  if (!folderName) return;
  
  // Trigger new folder creation
  document.dispatchEvent(new CustomEvent('folder-create-request', {
    detail: { 
      parentPath: this.currentPath,
      folderName: folderName 
    }
  }));
  this.removeExistingMenu();
}

private renameItem(): void {
  if (!this.currentPath) return;
  console.log('Renaming:', this.currentPath);
  
  const currentName = this.currentPath.split(/[/\\]/).pop() || '';
  const newName = prompt('Enter new name:', currentName);
  if (!newName || newName === currentName) return;
  
  document.dispatchEvent(new CustomEvent('item-rename-request', {
    detail: { 
      oldPath: this.currentPath,
      newName: newName 
    }
  }));
  this.removeExistingMenu();
}

private duplicateItem(): void {
  if (!this.currentPath) return;
  console.log('Duplicating:', this.currentPath);
  
  document.dispatchEvent(new CustomEvent('item-duplicate-request', {
    detail: { path: this.currentPath }
  }));
  this.removeExistingMenu();
}

private deleteItem(): void {
  if (!this.currentPath) return;
  
  const itemName = this.currentPath.split(/[/\\]/).pop() || '';
  const confirmed = confirm(`Delete "${itemName}"?\n\nThis action cannot be undone.`);
  
  if (!confirmed) {
    this.removeExistingMenu();
    return;
  }
  
  console.log('Deleting:', this.currentPath);
  
  document.dispatchEvent(new CustomEvent('item-delete-request', {
    detail: { path: this.currentPath }
  }));
  this.removeExistingMenu();
}

  private loadDirectlyIntoEditor(content: string, fileName: string): void {
    try {
      console.log(`📝 Loading ${fileName} directly into editor (${content.length} chars)`);
      
      const editors = (window as any).monaco?.editor?.getEditors() || [];
      if (editors.length === 0) {
        console.warn('⚠️ No Monaco editors found');
        return;
      }

      let mainEditor = editors[0];
      for (const editor of editors) {
        const container = editor.getContainerDomNode();
        const isMainEditor = !container.closest('.ai-assistant') && 
                           !container.closest('.terminal') &&
                           container.offsetWidth > 300;
        
        if (isMainEditor) {
          mainEditor = editor;
          break;
        }
      }

      const language = this.detectLanguageFromFileName(fileName) || 'typescript';
      const newModel = (window as any).monaco.editor.createModel(content, language);
      mainEditor.setModel(newModel);
      mainEditor.focus();
      
      document.title = `${fileName} - AI Code IDE (Tauri)`;
      console.log(`✅ Content loaded directly: ${content.length} chars`);
      
    } catch (error) {
      console.error('❌ Error loading content directly:', error);
    }
  }

  private closeFileFromExplorer(node: TauriFileTreeNode): void {
    try {
      console.log(`🗑️ Closing file: ${node.path}`);
      
      const fileName = node.name;
      const fullPath = node.path;
      let tabClosed = false;
      
      const fileVariations = [
        fileName,
        fullPath,
        fullPath.replace(/\\/g, '/'),
        this.getDisplayName(fullPath),
        fullPath.split('/').pop(),
        fullPath.split('\\').pop()
      ].filter(Boolean);
      
      console.log('🔍 Searching for tab with variations:', fileVariations);
      
      const tabManager = (window as any).tabManager;
      if (tabManager && tabManager.tabs) {
        console.log(`📋 Searching ${tabManager.tabs.length} tabs in tab manager...`);
        
        for (const tab of tabManager.tabs) {
          const tabMatches = fileVariations.some(variation => 
            tab.path === variation ||
            tab.fileName === variation ||
            tab.fullPath === variation ||
            tab.title === variation ||
            this.getDisplayName(tab.path || '') === variation ||
            this.getDisplayName(tab.fullPath || '') === variation
          );
          
          if (tabMatches) {
            console.log(`✅ Found matching tab (ID: ${tab.id}) for file: ${fileName}`);
            tabManager.closeTab(tab.id);
            tabClosed = true;
            break;
          }
        }
      }
      
      if (!tabClosed) {
        console.warn(`⚠️ Could not find tab for file: ${fileName}`);
      } else {
        console.log(`✅ Successfully closed tab for: ${fileName}`);
      }
      
      // Clear cache and update status
      this.fileStatusCache.delete(fullPath);
      setTimeout(() => this.updateStatusesDebounced(), 100);
      
      showNotification(tabClosed ? `Closed ${fileName}` : `Could not close ${fileName}`, tabClosed ? 'success' : 'error');
      
    } catch (error) {
      console.error(`❌ Error closing file ${node.path}:`, error);
      showNotification(`Failed to close ${node.name}`, 'error');
    }
  }

  private detectLanguageFromFileName(fileName: string): string | null {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
      'html': 'html', 'htm': 'html', 'css': 'css', 'scss': 'scss', 'sass': 'sass',
      'less': 'less', 'json': 'json', 'xml': 'xml', 'yaml': 'yaml', 'yml': 'yaml',
      'md': 'markdown', 'py': 'python', 'java': 'java', 'cpp': 'cpp', 'c': 'c',
      'h': 'c', 'hpp': 'cpp', 'php': 'php', 'rb': 'ruby', 'go': 'go', 'rs': 'rust',
      'sql': 'sql', 'sh': 'shell', 'bat': 'bat', 'ps1': 'powershell'
    };
    
    return extension ? languageMap[extension] || null : null;
  }

  public updateAllFileStatuses(): void {
    this.updateStatusesDebounced();
  }

  private updateFileStatus(fileElement: HTMLElement, filePath: string): void {
    const statusIndicator = fileElement.querySelector('.integrated-file-status') as HTMLElement;
    const closeButton = fileElement.querySelector('.integrated-file-close-btn') as HTMLElement;
    
    if (this.isFileOpen(filePath)) {
      statusIndicator.style.backgroundColor = '#4CAF50';
      statusIndicator.style.boxShadow = '0 0 4px rgba(76, 175, 80, 0.6)';
      closeButton.style.display = 'flex';
      fileElement.style.fontWeight = 'bold';
      fileElement.style.color = '#ffffff';
    } else {
      statusIndicator.style.backgroundColor = 'transparent';
      statusIndicator.style.boxShadow = 'none';
      closeButton.style.display = 'none';
      fileElement.style.fontWeight = 'normal';
      fileElement.style.color = '#cccccc';
    }
  }

  private createFallbackExplorer(folderTree: TauriFileTreeNode): void {
    console.log('Creating fallback explorer...');
    
    const fallbackExplorer = document.createElement('div');
    fallbackExplorer.className = 'fallback-explorer';
    fallbackExplorer.style.cssText = `
      position: fixed;
      left: 0;
      top: 60px;
      width: 280px;
      height: calc(100vh - 60px);
      background: #1e1e1e;
      border-right: 1px solid #333;
      z-index: 1000;
      padding: 8px;
      overflow-y: auto;
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);
    `;
    
    const header = document.createElement('div');
    header.className = 'explorer-header panel-header';
    header.innerHTML = '<span class="panel-title">EXPLORER (FALLBACK)</span>';
    fallbackExplorer.appendChild(header);
    
    this.addToolbar(fallbackExplorer);
    
    const treeContainer = document.createElement('div');
    treeContainer.className = 'integrated-file-tree';
    const rootElement = this.createFolderElement(folderTree, true);
    treeContainer.appendChild(rootElement);
    fallbackExplorer.appendChild(treeContainer);
    
    document.body.appendChild(fallbackExplorer);
    
    console.log('✅ Created fallback explorer');
  }

  private async refreshFolder(): Promise<void> {
    if (this.rootFolder) {
      console.log('🔄 Refreshing folder...');
      showNotification('Refreshing folder...', 'info');
      
      try {
        const refreshedTree = await getDirectoryTree(this.rootFolder.path, 10);
        
        if (refreshedTree) {
          this.rootFolder = this.convertTauriTreeToInternal(refreshedTree);
          this.integrateIntoFilesTab(this.rootFolder);
          this.fileStatusCache.clear(); // Clear cache on refresh
          this.updateAllFileStatuses();
          showNotification('Folder refreshed successfully', 'success');
        }
      } catch (error) {
        console.error('❌ Error refreshing folder:', error);
        showNotification('Failed to refresh folder', 'error');
      }
    } else {
      console.log('🔄 No folder to refresh');
      showNotification('No folder opened to refresh', 'info');
    }
  }

  public cleanup(): void {
    this.fileStatusCache.clear();
    this.rootFolder = null;
  }
}

// Create global instances - maintaining original API
const contextMenuManager = new ContextMenuManager();
const integratedFolderManager = new IntegratedFolderManager();

// Export for compatibility
export function removeFloatingCloseButtons(): void {
  const floatingButtons = document.querySelectorAll('.floating-close-folder');
  floatingButtons.forEach(btn => btn.remove());
  console.log(`🧹 Removed ${floatingButtons.length} floating close buttons`);
}

// In explorerManager.ts, find and update this function:
export function enhanceExistingOpenFolderButton(): void {
    const openFolderBtn = document.querySelector('.open-folder-btn, #open-folder-btn, [onclick*="openFolder"]');
    
    if (openFolderBtn) {
        console.log('🔧 Enhancing existing Open Folder button');
        
        // Remove any existing onclick
        openFolderBtn.removeAttribute('onclick');
        
        // Remove old listeners by cloning
        const newBtn = openFolderBtn.cloneNode(true) as HTMLElement;
        openFolderBtn.parentNode?.replaceChild(newBtn, openFolderBtn);
        
        // Add the correct Tauri-first handler
        newBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('📂 Open Folder clicked - using Tauri dialog');
            
            try {
                // Use Tauri's native dialog through fileSystem
                if (window.fileSystem?.openFolderDialog) {
                    const folderPath = await window.fileSystem.openFolderDialog();
                    
                    if (folderPath) {
                        console.log('✅ Folder selected:', folderPath);
                        // Load the folder using integratedFolderManager
                        if (integratedFolderManager) {
                            await integratedFolderManager.loadFolder(folderPath);
                        }
                    }
                } else {
                    console.error('File system not available');
                    alert('File system not ready. Please try again.');
                }
            } catch (error) {
                console.error('Error opening folder:', error);
                // Don't show browser-specific errors to user
                if (!error.message?.includes('AbortError') && !error.message?.includes('cancelled')) {
                    alert('Failed to open folder. Please ensure you are using the desktop app.');
                }
            }
        });
        
        console.log('✅ Open Folder button enhanced with Tauri support');
    }
}

// Enhanced keyboard shortcuts - throttled for performance
const keyboardHandler = throttle((e: KeyboardEvent) => {
  if (!isTauriAvailable()) return;

  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'O') {
    e.preventDefault();
    integratedFolderManager.openFolder();
  }
  
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
    e.preventDefault();
    integratedFolderManager.closeFolder();
  }
  
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'W') {
    e.preventDefault();
    integratedFolderManager.closeAllFiles();
  }
  
  if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'W') {
    e.preventDefault();
    integratedFolderManager.closeOtherFiles();
  }
  
  if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'c') {
    e.preventDefault();
    
    const activeTab = document.querySelector('.editor-tab.active, .tab-item.active, .robust-tab.active') as HTMLElement;
    const selectedFile = document.querySelector('.integrated-file-item.selected') as HTMLElement;
    
    const element = activeTab || selectedFile;
    if (element) {
      const filePath = element.dataset.filePath || element.dataset.path || '';
      
      if (filePath) {
        if (isTauriAvailable()) {
          invoke('write_clipboard', { text: filePath }).then(() => {
            showNotification('Path copied to clipboard!', 'success');
          });
        } else {
          navigator.clipboard.writeText(filePath).then(() => {
            showNotification('Path copied to clipboard!', 'success');
          });
        }
      }
    }
  }
}, 100);

document.addEventListener('keydown', keyboardHandler);

// Global context menu setup with error handling
export function enhanceFileTreeWithContextMenu(): void {
  if (!isTauriAvailable()) {
    console.warn('⚠️ Context menu requires Tauri desktop app');
    return;
  }

  document.addEventListener('contextmenu', (e) => {
    try {
      const target = e.target as HTMLElement;
      
      const fileItem = target.closest('.integrated-file-item, .integrated-folder-header');
      if (fileItem) {
        const filePath = (fileItem as HTMLElement).dataset.path || '';
        const isFolder = fileItem.classList.contains('integrated-folder-header');
        
        if (filePath) {
          contextMenuManager.showContextMenu(e, filePath, isFolder ? 'folder' : 'file');
        }
      }
      
      const tabItem = target.closest('.editor-tab, .tab-item, .robust-tab');
      if (tabItem) {
        const filePath = (tabItem as HTMLElement).dataset.filePath || 
                        (tabItem as HTMLElement).dataset.path || '';
        
        if (filePath) {
          contextMenuManager.showContextMenu(e, filePath, 'file');
        }
      }
    } catch (error) {
      console.error('Context menu error:', error);
    }
  });
  
  console.log('✅ Enhanced context menu with Tauri integration enabled');
}

export function setupCopyPathKeyboardShortcuts(): void {
  // Already handled in main keyboard handler
  console.log('✅ Copy path shortcuts already integrated');
}

// Hook into tab manager for status updates - safer integration
if (typeof window !== 'undefined') {
  const hookTabManager = () => {
    try {
      const tabManager = (window as any).tabManager;
      if (tabManager && !tabManager._conservativeIntegratedFolderManagerHooked) {
        console.log('✅ Hooking into tab manager for conservative file status updates');
        
        tabManager._conservativeIntegratedFolderManagerHooked = true;
        
        const originalAddTab = tabManager.addTab;
        const originalCloseTab = tabManager.closeTab;
        
        if (originalAddTab) {
          tabManager.addTab = function(...args: any[]) {
            const result = originalAddTab.apply(this, args);
            setTimeout(() => integratedFolderManager.updateAllFileStatuses(), 100);
            return result;
          };
        }
        
        if (originalCloseTab) {
          tabManager.closeTab = function(...args: any[]) {
            const result = originalCloseTab.apply(this, args);
            setTimeout(() => integratedFolderManager.updateAllFileStatuses(), 100);
            return result;
          };
        }
      }
    } catch (error) {
      console.warn('Tab manager integration failed:', error);
    }
  };
  
  const interval = setInterval(() => {
    hookTabManager();
    if ((window as any).tabManager?._conservativeIntegratedFolderManagerHooked) {
      clearInterval(interval);
    }
  }, 1000);
  
  hookTabManager();
}

// Enhanced auto-initialization for tabbed layout
const initializeExplorerManager = () => {
  try {
    const existingFloatingBtn = document.querySelector('.floating-close-folder');
    if (existingFloatingBtn) existingFloatingBtn.remove();
    
    // Wait for the tabbed layout to be fully initialized
    setTimeout(() => {
      try {
        enhanceExistingOpenFolderButton();
        enhanceFileTreeWithContextMenu();
        
        // Check if Files tab exists and enhance it
        const filesTab = document.querySelector('[data-tab-id="files"]');
        if (filesTab) {
          console.log('✅ Files tab found, explorer manager integrated with tabbed layout');
        } else {
          console.warn('⚠️ Files tab not found, falling back to legacy integration');
        }
      } catch (error) {
        console.warn('Explorer manager initialization warning:', error);
      }
    }, 1500); // Increased delay to ensure tabs are initialized
  } catch (error) {
    console.error('Explorer manager initialization error:', error);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExplorerManager);
} else {
  initializeExplorerManager();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  try {
    contextMenuManager.cleanup();
    integratedFolderManager.cleanup();
  } catch (error) {
    console.warn('Cleanup error:', error);
  }
});

// Export everything for compatibility
export { 
  integratedFolderManager, 
  IntegratedFolderManager, 
  contextMenuManager, 
  ContextMenuManager 
};

console.log('🎉 Updated Explorer Manager loaded for Terminal-in-Explorer Layout!');
console.log(`💡 Mode: ${isTauriAvailable() ? '🖥️ TAURI NATIVE' : '🌐 BROWSER FALLBACK'}`);
console.log('📋 Integration: Files tab within explorer panel');
console.log('⚡ Performance optimizations: debouncing, caching, batched updates, passive listeners');
