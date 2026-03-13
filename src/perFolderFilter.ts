// perFolderFilter.ts - Add per-folder code file toggling

export class PerFolderFilterEnhancement {
  // Track which folders have code files hidden
  private foldersWithHiddenCode = new Set<string>();
  private globalViewMode: string = 'all';
  
  /**
   * Initialize the per-folder filter enhancement
   */
  public init(): void {
    console.log('[PerFolderFilter] Initializing...');
    
    // Add click handlers to all folders
    this.setupFolderClickHandlers();
    
    // Watch for new folders being added
    this.observeFolderAdditions();
    
    // Add visual indicators
    this.addStyles();
    
    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  /**
   * Set up click handlers on all folder elements
   */
  private setupFolderClickHandlers(): void {
    // Add handlers to existing folders
    this.attachHandlersToFolders();
    
    // Re-attach periodically in case folders are re-rendered
    setInterval(() => {
      this.attachHandlersToFolders();
    }, 2000);
  }

  /**
   * Attach click handlers to folder elements
   */
  private attachHandlersToFolders(): void {
    const folders = document.querySelectorAll(
      '.directory:not([data-folder-filter-attached]), ' +
      '.integrated-folder-header:not([data-folder-filter-attached]), ' +
      '[class*="folder"]:not([data-folder-filter-attached])'
    );

    folders.forEach(folder => {
      this.attachFolderHandler(folder as HTMLElement);
    });
  }

  /**
   * Attach handler to a single folder element
   */
  private attachFolderHandler(folderElement: HTMLElement): void {
    // Mark as processed
    folderElement.dataset.folderFilterAttached = 'true';
    
    // Get folder path/name
    const folderPath = this.getFolderPath(folderElement);
    if (!folderPath) return;

    // Add visual indicator
    this.addFolderIndicator(folderElement, folderPath);

    // Add click handler
    folderElement.addEventListener('click', (e) => {
      // Check for modifier keys
      if (e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        this.toggleFolderCodeVisibility(folderPath, folderElement);
      } else if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        this.showFolderFilterMenu(e, folderPath, folderElement);
      }
    });

    // Add right-click context menu
    folderElement.addEventListener('contextmenu', (e) => {
      // Only add our menu items if it's a folder
      if (this.isFolder(folderElement)) {
        this.addContextMenuItems(e, folderPath, folderElement);
      }
    });
  }

  /**
   * Add visual indicator to folder
   */
  private addFolderIndicator(folderElement: HTMLElement, folderPath: string): void {
    // Check if indicator already exists
    if (folderElement.querySelector('.folder-filter-indicator')) return;

    const indicator = document.createElement('span');
    indicator.className = 'folder-filter-indicator';
    indicator.style.cssText = `
      margin-left: 8px;
      font-size: 10px;
      padding: 1px 4px;
      border-radius: 3px;
      background: transparent;
      color: #888;
      display: none;
    `;
    
    // Update indicator based on state
    this.updateFolderIndicator(folderElement, folderPath);
    
    // Find where to insert (after folder name)
    const nameElement = folderElement.querySelector('.file-name, .folder-name, [class*="name"]');
    if (nameElement) {
      nameElement.appendChild(indicator);
    } else {
      folderElement.appendChild(indicator);
    }
  }

  /**
   * Update folder indicator based on current state
   */
  private updateFolderIndicator(folderElement: HTMLElement, folderPath: string): void {
    const indicator = folderElement.querySelector('.folder-filter-indicator') as HTMLElement;
    if (!indicator) return;

    if (this.foldersWithHiddenCode.has(folderPath)) {
      indicator.textContent = '📄 No Code';
      indicator.style.display = 'inline-block';
      indicator.style.background = '#0e639c';
      indicator.style.color = '#fff';
    } else {
      indicator.style.display = 'none';
    }
  }

  /**
   * Toggle code file visibility for a specific folder
   */
  private toggleFolderCodeVisibility(folderPath: string, folderElement: HTMLElement): void {
    if (this.foldersWithHiddenCode.has(folderPath)) {
      // Show code files
      this.foldersWithHiddenCode.delete(folderPath);
      this.showNotification(`📁 Showing all files in ${this.getFolderName(folderPath)}`);
    } else {
      // Hide code files
      this.foldersWithHiddenCode.add(folderPath);
      this.showNotification(`📄 Hiding code files in ${this.getFolderName(folderPath)}`);
    }

    // Update visual indicator
    this.updateFolderIndicator(folderElement, folderPath);
    
    // Apply the filter to children
    this.applyFolderFilter(folderPath, folderElement);
  }

  /**
   * Apply filter to files within a folder
   */
  private applyFolderFilter(folderPath: string, folderElement: HTMLElement): void {
    // Find the folder's children container
    const childrenContainer = this.findChildrenContainer(folderElement);
    if (!childrenContainer) return;

    const hideCode = this.foldersWithHiddenCode.has(folderPath);
    
    // Get all file items within this folder (not in sub-folders)
    const fileItems = childrenContainer.querySelectorAll(':scope > .file-item, :scope > .integrated-file-item, :scope > [class*="file-item"]');
    
    fileItems.forEach(item => {
      const element = item as HTMLElement;
      const fileName = this.getFileName(element);
      
      if (hideCode && this.isCodeFile(fileName)) {
        element.style.display = 'none';
        element.classList.add('folder-filtered-hidden');
      } else {
        element.style.display = '';
        element.classList.remove('folder-filtered-hidden');
      }
    });

    // Update file count
    this.updateFolderFileCount(folderElement, fileItems.length);
  }

  /**
   * Find the container that holds a folder's children
   */
  private findChildrenContainer(folderElement: HTMLElement): HTMLElement | null {
    // Check for a sibling container (common pattern)
    const nextSibling = folderElement.nextElementSibling;
    if (nextSibling && (
      nextSibling.classList.contains('file-children') ||
      nextSibling.classList.contains('integrated-folder-children') ||
      nextSibling.classList.contains('folder-children')
    )) {
      return nextSibling as HTMLElement;
    }

    // Check for a child container
    const childContainer = folderElement.querySelector(
      '.file-children, .integrated-folder-children, .folder-children, ul'
    );
    if (childContainer) {
      return childContainer as HTMLElement;
    }

    // Check parent's children for indented items
    const parent = folderElement.parentElement;
    if (parent) {
      let foundFolder = false;
      for (const child of Array.from(parent.children)) {
        if (child === folderElement) {
          foundFolder = true;
          continue;
        }
        if (foundFolder && (
          child.classList.contains('file-item') ||
          child.classList.contains('directory') ||
          child.tagName === 'UL' ||
          child.tagName === 'DIV'
        )) {
          // Check if this is indented (indicating it's a child)
          const childElement = child as HTMLElement;
          const folderPadding = parseInt(window.getComputedStyle(folderElement).paddingLeft);
          const childPadding = parseInt(window.getComputedStyle(childElement).paddingLeft);
          if (childPadding > folderPadding) {
            return parent as HTMLElement;
          }
          break;
        }
      }
    }

    return null;
  }

  /**
   * Show folder filter menu
   */
  private showFolderFilterMenu(e: MouseEvent, folderPath: string, folderElement: HTMLElement): void {
    // Remove existing menu if any
    const existingMenu = document.querySelector('.folder-filter-menu');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'folder-filter-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${e.pageX}px;
      top: ${e.pageY}px;
      background: #252526;
      border: 1px solid #464647;
      border-radius: 4px;
      padding: 4px 0;
      min-width: 200px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      z-index: 10000;
    `;
// Add this to your existing filter code or as a separate file

// Simple folder click handler
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const folderElement = target.closest('.directory, [class*="folder"]');
  
  if (folderElement && e.altKey) {
    e.preventDefault();
    e.stopPropagation();
    
    // Get all files in this folder (immediate children only)
    const parentElement = folderElement.parentElement;
    if (!parentElement) return;
    
    let inFolder = false;
    let folderIndent = parseInt(window.getComputedStyle(folderElement).paddingLeft);
    
    // Toggle code files after this folder
    for (const sibling of Array.from(parentElement.children)) {
      if (sibling === folderElement) {
        inFolder = true;
        continue;
      }
      
      if (inFolder) {
        const siblingIndent = parseInt(window.getComputedStyle(sibling as HTMLElement).paddingLeft);
        
        // Stop if we reach another folder at same or less indentation
        if (siblingIndent <= folderIndent && sibling.classList.contains('directory')) {
          break;
        }
        
        // If it's a file in this folder
        if (siblingIndent > folderIndent && sibling.classList.contains('file-item')) {
          const fileName = sibling.textContent || '';
          const codeExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cpp', '.cs'];
          const isCodeFile = codeExtensions.some(ext => fileName.includes(ext));
          
          if (isCodeFile) {
            const element = sibling as HTMLElement;
            // Toggle visibility
            if (element.style.display === 'none') {
              element.style.display = '';
            } else {
              element.style.display = 'none';
            }
          }
        }
      }
    }
  }
});
    const isHidingCode = this.foldersWithHiddenCode.has(folderPath);

    const menuItems = [
      { 
        label: isHidingCode ? '📁 Show All Files' : '📄 Hide Code Files',
        action: () => this.toggleFolderCodeVisibility(folderPath, folderElement)
      },
      { separator: true },
      {
        label: '🔄 Apply to All Subfolders',
        action: () => this.applyToSubfolders(folderPath, folderElement, !isHidingCode)
      },
      {
        label: '↩️ Reset This Folder',
        action: () => this.resetFolder(folderPath, folderElement)
      },
      { separator: true },
      {
        label: '🗑️ Reset All Folders',
        action: () => this.resetAllFolders()
      }
    ];

    menuItems.forEach(item => {
      if (item.separator) {
        const separator = document.createElement('div');
        separator.style.cssText = 'height: 1px; background: #464647; margin: 4px 0;';
        menu.appendChild(separator);
      } else {
        const menuItem = document.createElement('div');
        menuItem.style.cssText = `
          padding: 6px 16px;
          cursor: pointer;
          font-size: 13px;
          color: #cccccc;
        `;
        menuItem.textContent = item.label;
        menuItem.addEventListener('click', () => {
          item.action();
          menu.remove();
        });
        menuItem.addEventListener('mouseenter', () => {
          menuItem.style.background = '#094771';
        });
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.background = 'transparent';
        });
        menu.appendChild(menuItem);
      }
    });

    document.body.appendChild(menu);

    // Remove on click outside
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 0);
  }

  /**
   * Apply filter to all subfolders
   */
  private applyToSubfolders(folderPath: string, folderElement: HTMLElement, hideCode: boolean): void {
    const childrenContainer = this.findChildrenContainer(folderElement);
    if (!childrenContainer) return;

    const subfolders = childrenContainer.querySelectorAll('.directory, .integrated-folder-header');
    
    subfolders.forEach(subfolder => {
      const subfolderElement = subfolder as HTMLElement;
      const subfolderPath = this.getFolderPath(subfolderElement);
      if (subfolderPath) {
        if (hideCode) {
          this.foldersWithHiddenCode.add(subfolderPath);
        } else {
          this.foldersWithHiddenCode.delete(subfolderPath);
        }
        this.updateFolderIndicator(subfolderElement, subfolderPath);
        this.applyFolderFilter(subfolderPath, subfolderElement);
      }
    });

    this.showNotification(`Applied filter to all subfolders of ${this.getFolderName(folderPath)}`);
  }

  /**
   * Reset a folder's filter
   */
  private resetFolder(folderPath: string, folderElement: HTMLElement): void {
    this.foldersWithHiddenCode.delete(folderPath);
    this.updateFolderIndicator(folderElement, folderPath);
    this.applyFolderFilter(folderPath, folderElement);
    this.showNotification(`Reset filter for ${this.getFolderName(folderPath)}`);
  }

  /**
   * Reset all folder filters
   */
  private resetAllFolders(): void {
    this.foldersWithHiddenCode.clear();
    
    // Update all folders
    const allFolders = document.querySelectorAll('.directory, .integrated-folder-header');
    allFolders.forEach(folder => {
      const folderElement = folder as HTMLElement;
      const folderPath = this.getFolderPath(folderElement);
      if (folderPath) {
        this.updateFolderIndicator(folderElement, folderPath);
        this.applyFolderFilter(folderPath, folderElement);
      }
    });

    this.showNotification('Reset all folder filters');
  }

  /**
   * Helper methods
   */
  private getFolderPath(element: HTMLElement): string {
    return element.dataset.path || 
           element.dataset.folderPath || 
           this.getFolderName(element.textContent || '');
  }

  private getFolderName(path: string): string {
    return path.split(/[/\\]/).pop() || path;
  }

  private getFileName(element: HTMLElement): string {
    const nameElement = element.querySelector('.file-name, [class*="name"]');
    if (nameElement) {
      return nameElement.textContent?.trim() || '';
    }
    return element.textContent?.trim() || '';
  }

  private isFolder(element: HTMLElement): boolean {
    return element.classList.contains('directory') ||
           element.classList.contains('integrated-folder-header') ||
           element.classList.contains('folder');
  }

  private isCodeFile(fileName: string): boolean {
    const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.php', '.rb', '.swift', '.css', '.scss'];
    const ext = fileName.lastIndexOf('.') > 0 ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : '';
    return codeExtensions.includes(ext);
  }

  private updateFolderFileCount(folderElement: HTMLElement, totalFiles: number): void {
    // Optional: Add file count display
  }

  private showNotification(message: string): void {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #1e1e1e;
      color: #cccccc;
      padding: 8px 16px;
      border: 1px solid #464647;
      border-radius: 4px;
      animation: slideIn 0.3s;
      z-index: 10000;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  }

  private addContextMenuItems(e: MouseEvent, folderPath: string, folderElement: HTMLElement): void {
    // Add our items to existing context menu or create new one
    setTimeout(() => {
      const existingMenu = document.querySelector('.enhanced-context-menu, .context-menu');
      if (existingMenu) {
        // Add separator
        const separator = document.createElement('div');
        separator.className = 'menu-separator';
        separator.style.cssText = 'height: 1px; background: #464647; margin: 4px 0;';
        existingMenu.appendChild(separator);

        // Add our menu item
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        menuItem.innerHTML = this.foldersWithHiddenCode.has(folderPath) 
          ? '📁 Show All Files in Folder'
          : '📄 Hide Code Files in Folder';
        menuItem.style.cssText = `
          padding: 6px 16px;
          cursor: pointer;
          color: #cccccc;
        `;
        menuItem.addEventListener('click', () => {
          this.toggleFolderCodeVisibility(folderPath, folderElement);
          existingMenu.remove();
        });
        existingMenu.appendChild(menuItem);
      }
    }, 10);
  }

  /**
   * Observe for new folders being added
   */
  private observeFolderAdditions(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              if (this.isFolder(element)) {
                this.attachFolderHandler(element);
              }
              // Also check children
              element.querySelectorAll('.directory, .integrated-folder-header').forEach(folder => {
                this.attachFolderHandler(folder as HTMLElement);
              });
            }
          });
        }
      });
    });

    // Start observing
    const container = document.querySelector('#files-content, .file-tree, .tab-content');
    if (container) {
      observer.observe(container, {
        childList: true,
        subtree: true
      });
    }
  }

  /**
   * Add styles
   */
  private addStyles(): void {
    if (document.getElementById('per-folder-filter-styles')) return;

    const style = document.createElement('style');
    style.id = 'per-folder-filter-styles';
    style.textContent = `
      .folder-filter-indicator {
        transition: all 0.2s;
      }
      
      .folder-filtered-hidden {
        display: none !important;
      }
      
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      /* Highlight folders with active filters */
      .directory[data-has-filter="true"],
      .integrated-folder-header[data-has-filter="true"] {
        position: relative;
      }
      
      /* Visual hint on hover */
      .directory:hover::after,
      .integrated-folder-header:hover::after {
        content: 'Alt+Click: Toggle Code | Ctrl+Click: Menu';
        position: absolute;
        bottom: -20px;
        left: 20px;
        font-size: 10px;
        color: #666;
        background: #1e1e1e;
        padding: 2px 6px;
        border-radius: 3px;
        white-space: nowrap;
        pointer-events: none;
        z-index: 1000;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Set up keyboard shortcuts
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // Alt+Shift+C: Toggle code for selected folder
      if (e.altKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        const selectedFolder = document.querySelector('.directory.selected, .integrated-folder-header.selected');
        if (selectedFolder) {
          const folderPath = this.getFolderPath(selectedFolder as HTMLElement);
          if (folderPath) {
            this.toggleFolderCodeVisibility(folderPath, selectedFolder as HTMLElement);
          }
        }
      }
      
      // Alt+Shift+R: Reset all folder filters
      if (e.altKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        this.resetAllFolders();
      }
    });
  }
}

// Initialize
const perFolderFilter = new PerFolderFilterEnhancement();
perFolderFilter.init();

// Make globally accessible
(window as any).perFolderFilter = perFolderFilter;

console.log('[PerFolderFilter] Initialized - Alt+Click folders to toggle code files');

export default PerFolderFilterEnhancement;