// explorerFilterAddon.ts - Add this to your existing explorer to enable filtering
// This is a lightweight add-on that can be integrated with your current setup

export class ExplorerFilterAddon {
  private viewMode: 'all' | 'no-code' | 'structure' | 'minimal' | 'code-only' = 'all';
  private searchFilter: string = '';
  private showHiddenFiles: boolean = false;
  private controlPanel: HTMLElement | null = null;

  // File type definitions
  private readonly FILE_TYPES = {
    code: ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.php', '.rb', '.swift'],
    docs: ['.md', '.txt', '.pdf', '.doc', '.docx', '.rtf'],
    config: ['.json', '.yml', '.yaml', '.toml', '.ini', '.env', '.config', '.gitignore'],
    style: ['.css', '.scss', '.sass', '.less']
  };

  /**
   * Initialize the filter addon on your existing explorer
   */
  public init(): void {
    // Find the FILES tab content area
    const filesContent = this.findFilesContent();
    if (!filesContent) {
      console.warn('Files content area not found');
      return;
    }

    // Insert control panel at the top
    this.insertControlPanel(filesContent);
    
    // Apply initial filtering
    this.applyFilters();
    
    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  /**
   * Insert the control panel into the explorer
   */
  private insertControlPanel(container: HTMLElement): void {
    // Check if control panel already exists
    if (document.querySelector('.explorer-filter-controls')) {
      return;
    }

    this.controlPanel = document.createElement('div');
    this.controlPanel.className = 'explorer-filter-controls';
    this.controlPanel.innerHTML = `
      <style>
        .explorer-filter-controls {
          padding: 8px;
          background: #252526;
          border-bottom: 1px solid #3c3c3c;
        }
        
        .filter-search-box {
          width: 100%;
          padding: 4px 8px;
          margin-bottom: 8px;
          background: #3c3c3c;
          color: #cccccc;
          border: 1px solid #3c3c3c;
          border-radius: 4px;
          font-size: 13px;
        }
        
        .filter-search-box:focus {
          outline: none;
          border-color: #007acc;
        }
        
        .view-mode-buttons {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        
        .view-mode-btn {
          padding: 4px 8px;
          background: transparent;
          color: #cccccc;
          border: 1px solid transparent;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        
        .view-mode-btn:hover {
          background: #3a3a3a;
        }
        
        .view-mode-btn.active {
          background: #0e639c;
          border-color: #0e639c;
        }
        
        .filter-status {
          margin-top: 4px;
          font-size: 11px;
          color: #888;
        }
        
        /* Apply opacity to filtered items */
        .file-item.filtered-out {
          display: none !important;
        }
        
        .folder-item.has-filter .folder-name::after {
          content: attr(data-filter-count);
          margin-left: 8px;
          opacity: 0.6;
          font-size: 11px;
        }
      </style>
      
      <input 
        type="text" 
        class="filter-search-box" 
        placeholder="Filter files... (Ctrl+P)"
        id="explorer-search-input"
      />
      
      <div class="view-mode-buttons">
        <button class="view-mode-btn active" data-mode="all" title="Show all files">
          📁 All
        </button>
        <button class="view-mode-btn" data-mode="no-code" title="Hide code files">
          📄 No Code
        </button>
        <button class="view-mode-btn" data-mode="structure" title="Folders only">
          🏗️ Structure
        </button>
        <button class="view-mode-btn" data-mode="minimal" title="Docs & configs">
          📝 Minimal
        </button>
        <button class="view-mode-btn" data-mode="code-only" title="Code files only">
          💻 Code Only
        </button>
        <button class="view-mode-btn" id="hidden-toggle" title="Toggle hidden files">
          👁️‍🗨️
        </button>
      </div>
      
      <div class="filter-status" id="filter-status"></div>
    `;

    // Insert at the beginning of the container
    const firstChild = container.firstChild;
    if (firstChild) {
      container.insertBefore(this.controlPanel, firstChild);
    } else {
      container.appendChild(this.controlPanel);
    }

    // Set up event listeners
    this.setupControlListeners();
  }

  /**
   * Set up event listeners for control panel
   */
  private setupControlListeners(): void {
    // Search input
    const searchInput = document.getElementById('explorer-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchFilter = (e.target as HTMLInputElement).value.toLowerCase();
        this.applyFilters();
      });
    }

    // View mode buttons
    const viewButtons = document.querySelectorAll('.view-mode-btn[data-mode]');
    viewButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = (e.target as HTMLElement).closest('.view-mode-btn')?.getAttribute('data-mode');
        if (mode) {
          this.setViewMode(mode as any);
        }
      });
    });

    // Hidden files toggle
    const hiddenToggle = document.getElementById('hidden-toggle');
    if (hiddenToggle) {
      hiddenToggle.addEventListener('click', () => {
        this.showHiddenFiles = !this.showHiddenFiles;
        hiddenToggle.textContent = this.showHiddenFiles ? '👁️' : '👁️‍🗨️';
        this.applyFilters();
      });
    }
  }

  /**
   * Set the view mode and update UI
   */
  private setViewMode(mode: 'all' | 'no-code' | 'structure' | 'minimal' | 'code-only'): void {
    this.viewMode = mode;
    
    // Update button states
    document.querySelectorAll('.view-mode-btn[data-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
    
    this.applyFilters();
    this.showNotification(this.getModeName(mode));
  }

  /**
   * Apply filters to the file tree
   */
  private applyFilters(): void {
    const allFileItems = document.querySelectorAll('.file-item, [class*="file-item"], [class*="integrated-file"]');
    const allFolderItems = document.querySelectorAll('.directory, [class*="folder"], [class*="integrated-folder"]');
    
    let visibleCount = 0;
    let totalCount = 0;

    // Process files
    allFileItems.forEach((item) => {
      const element = item as HTMLElement;
      const fileName = this.getFileName(element);
      const shouldShow = this.shouldShowFile(fileName, false);
      
      element.classList.toggle('filtered-out', !shouldShow);
      
      if (shouldShow) visibleCount++;
      totalCount++;
    });

    // Process folders
    allFolderItems.forEach((item) => {
      const element = item as HTMLElement;
      const folderName = this.getFileName(element);
      const shouldShow = this.shouldShowFile(folderName, true);
      
      if (this.viewMode === 'structure') {
        // In structure mode, show all folders
        element.classList.remove('filtered-out');
      } else {
        element.classList.toggle('filtered-out', !shouldShow);
      }
    });

    // Update status
    this.updateFilterStatus(visibleCount, totalCount);
  }

  /**
   * Determine if a file should be shown based on current filters
   */
  private shouldShowFile(fileName: string, isDirectory: boolean): boolean {
    if (!fileName) return true;

    // Search filter
    if (this.searchFilter && !fileName.toLowerCase().includes(this.searchFilter)) {
      return false;
    }

    // Hidden files filter
    if (!this.showHiddenFiles && fileName.startsWith('.')) {
      return false;
    }

    // View mode filters
    const ext = this.getFileExtension(fileName);
    
    switch (this.viewMode) {
      case 'all':
        return true;
        
      case 'no-code':
        if (isDirectory) return true;
        return !this.FILE_TYPES.code.includes(ext) && !this.FILE_TYPES.style.includes(ext);
        
      case 'structure':
        return isDirectory;
        
      case 'minimal':
        if (isDirectory) return true;
        return this.FILE_TYPES.docs.includes(ext) || this.FILE_TYPES.config.includes(ext);
        
      case 'code-only':
        if (isDirectory) return true;
        return this.FILE_TYPES.code.includes(ext) || this.FILE_TYPES.style.includes(ext);
        
      default:
        return true;
    }
  }

  /**
   * Get file name from element
   */
  private getFileName(element: HTMLElement): string {
    // Try various methods to get the file name
    const textContent = element.textContent?.trim() || '';
    const dataPath = element.dataset.path || '';
    const fileName = element.dataset.fileName || '';
    
    // Try to find the name from nested spans
    const nameSpan = element.querySelector('.file-name, [class*="name"]');
    if (nameSpan) {
      return nameSpan.textContent?.trim() || '';
    }
    
    // Extract from path if available
    if (dataPath) {
      return dataPath.split(/[/\\]/).pop() || '';
    }
    
    if (fileName) {
      return fileName;
    }
    
    // Fall back to text content, but clean it up
    return textContent.split('\n')[0].trim();
  }

  /**
   * Get file extension
   */
  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.slice(lastDot).toLowerCase() : '';
  }

  /**
   * Update filter status message
   */
  private updateFilterStatus(visible: number, total: number): void {
    const statusElement = document.getElementById('filter-status');
    if (statusElement) {
      if (this.viewMode !== 'all' || this.searchFilter || !this.showHiddenFiles) {
        statusElement.textContent = `Showing ${visible} of ${total} items`;
      } else {
        statusElement.textContent = '';
      }
    }
  }

  /**
   * Show a temporary notification
   */
  private showNotification(message: string): void {
    // Remove existing notification
    const existing = document.querySelector('.filter-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'filter-notification';
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
      z-index: 1000;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  /**
   * Get friendly mode name
   */
  private getModeName(mode: string): string {
    const names: Record<string, string> = {
      'all': '📁 Showing all files',
      'no-code': '📄 Hiding code files',
      'structure': '🏗️ Showing structure only',
      'minimal': '📝 Showing docs & configs only',
      'code-only': '💻 Showing code files only'
    };
    return names[mode] || mode;
  }

  /**
   * Find the FILES content area
   */
  private findFilesContent(): HTMLElement | null {
    // Try various selectors to find the file tree container
    const selectors = [
      '#files-content',
      '.tab-content:has(.file-item)',
      '[data-tab-content="files"]',
      '.explorer-content',
      '.file-tree',
      '#file-explorer'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) return element;
    }

    // Fallback: look for the container with file items
    const fileItem = document.querySelector('.file-item, .directory');
    return fileItem?.closest('.tab-content, [class*="content"]') as HTMLElement || null;
  }

  /**
   * Set up keyboard shortcuts
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // Alt+C: Toggle code files
      if (e.altKey && e.key === 'c') {
        e.preventDefault();
        this.setViewMode(this.viewMode === 'no-code' ? 'all' : 'no-code');
      }
      // Alt+A: Show all
      else if (e.altKey && e.key === 'a') {
        e.preventDefault();
        this.setViewMode('all');
      }
      // Alt+S: Structure only
      else if (e.altKey && e.key === 's') {
        e.preventDefault();
        this.setViewMode('structure');
      }
      // Alt+D: Minimal (docs)
      else if (e.altKey && e.key === 'd') {
        e.preventDefault();
        this.setViewMode('minimal');
      }
      // Ctrl+P: Focus search
      else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        const searchInput = document.getElementById('explorer-search-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    });
  }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(10px); }
  }
`;
document.head.appendChild(style);

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const filterAddon = new ExplorerFilterAddon();
    filterAddon.init();
  });
} else {
  const filterAddon = new ExplorerFilterAddon();
  filterAddon.init();
}

// Export for manual initialization
export default ExplorerFilterAddon;