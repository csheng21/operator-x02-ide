// persistentFilterAddon.ts - Enhanced version that maintains filtering after re-renders

export class PersistentExplorerFilter {
  private viewMode: 'all' | 'no-code' | 'structure' | 'minimal' | 'code-only' = 'all';
  private searchFilter: string = '';
  private showHiddenFiles: boolean = false;
  private controlPanel: HTMLElement | null = null;
  private observer: MutationObserver | null = null;
  private isApplyingFilters: boolean = false;

  // File type definitions
  private readonly FILE_TYPES = {
    code: ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.php', '.rb', '.swift'],
    docs: ['.md', '.txt', '.pdf', '.doc', '.docx', '.rtf'],
    config: ['.json', '.yml', '.yaml', '.toml', '.ini', '.env', '.config', '.gitignore'],
    style: ['.css', '.scss', '.sass', '.less']
  };

  /**
   * Initialize the filter addon with persistence
   */
  public init(): void {
    console.log('[Filter] Initializing persistent explorer filter...');
    
    // Insert control panel
    this.insertControlPanel();
    
    // Set up mutation observer to watch for DOM changes
    this.setupMutationObserver();
    
    // Apply initial filtering
    setTimeout(() => {
      this.applyFilters();
    }, 100);
    
    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Re-apply filters periodically as a fallback
    this.setupPeriodicReapply();
  }

  /**
   * Set up MutationObserver to watch for file tree changes
   */
  private setupMutationObserver(): void {
    // Find the container that holds the file tree
    const container = this.findFileTreeContainer();
    if (!container) {
      console.warn('[Filter] File tree container not found, retrying...');
      setTimeout(() => this.setupMutationObserver(), 1000);
      return;
    }

    console.log('[Filter] Setting up mutation observer on:', container);

    // Disconnect existing observer if any
    if (this.observer) {
      this.observer.disconnect();
    }

    // Create new observer
    this.observer = new MutationObserver((mutations) => {
      // Skip if we're currently applying filters to avoid infinite loop
      if (this.isApplyingFilters) return;

      // Check if file items were added or modified
      const hasRelevantChanges = mutations.some(mutation => {
        // Check if new nodes were added
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          return Array.from(mutation.addedNodes).some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              return element.classList.contains('file-item') || 
                     element.classList.contains('directory') ||
                     element.querySelector('.file-item, .directory');
            }
            return false;
          });
        }
        return false;
      });

      if (hasRelevantChanges) {
        console.log('[Filter] File tree changed, reapplying filters...');
        // Debounce the filter application
        this.debouncedApplyFilters();
      }
    });

    // Start observing
    this.observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: false // Don't watch attributes to avoid performance issues
    });
  }

  /**
   * Debounced filter application to avoid excessive calls
   */
  private filterTimeout: NodeJS.Timeout | null = null;
  private debouncedApplyFilters(): void {
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }
    this.filterTimeout = setTimeout(() => {
      this.applyFilters();
    }, 50);
  }

  /**
   * Set up periodic re-application as a fallback mechanism
   */
  private setupPeriodicReapply(): void {
    // Re-apply filters every 2 seconds if view mode is not 'all'
    setInterval(() => {
      if (this.viewMode !== 'all' || this.searchFilter || !this.showHiddenFiles) {
        this.applyFiltersSilently();
      }
    }, 2000);
  }

  /**
   * Find the container that holds the file tree
   */
  private findFileTreeContainer(): HTMLElement | null {
    // Try to find the FILES tab content first
    const filesTab = document.querySelector('.tab-content:has(.file-item), #files-content');
    if (filesTab) return filesTab as HTMLElement;

    // Try various selectors
    const selectors = [
      '.integrated-file-tree',
      '.file-tree',
      '#file-explorer',
      '.explorer-content',
      '[data-explorer]',
      '.sidebar .explorer'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) return element;
    }

    // Fallback: find parent of file items
    const fileItem = document.querySelector('.file-item, .directory, .integrated-file-item');
    if (fileItem) {
      return fileItem.closest('.tab-content, [class*="content"]') as HTMLElement;
    }

    return document.querySelector('#files-content, .tab-content') as HTMLElement;
  }

  /**
   * Insert the control panel
   */
  private insertControlPanel(): void {
    // Check if control panel already exists
    if (document.querySelector('.explorer-filter-controls')) {
      console.log('[Filter] Control panel already exists');
      return;
    }

    // Find where to insert the panel
    const container = this.findInsertionPoint();
    if (!container) {
      console.warn('[Filter] Could not find insertion point, retrying...');
      setTimeout(() => this.insertControlPanel(), 1000);
      return;
    }

    this.controlPanel = document.createElement('div');
    this.controlPanel.className = 'explorer-filter-controls';
    this.controlPanel.innerHTML = this.getControlPanelHTML();

    // Insert the panel
    const firstChild = container.firstChild;
    if (firstChild) {
      container.insertBefore(this.controlPanel, firstChild);
    } else {
      container.appendChild(this.controlPanel);
    }

    // Add styles
    this.addStyles();
    
    // Set up event listeners
    this.setupControlListeners();
    
    console.log('[Filter] Control panel inserted successfully');
  }

  /**
   * Find where to insert the control panel
   */
  private findInsertionPoint(): HTMLElement | null {
    // Try to find the FILES content area
    const selectors = [
      '#files-content',
      '.tab-content:has(.file-item)',
      '.tab-content.active',
      '.integrated-file-tree',
      '.file-tree'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) return element;
    }

    return null;
  }

  /**
   * Get control panel HTML
   */
  private getControlPanelHTML(): string {
    return `
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
  }

  /**
   * Add styles to the document
   */
  private addStyles(): void {
    if (document.querySelector('#explorer-filter-styles')) return;

    const style = document.createElement('style');
    style.id = 'explorer-filter-styles';
    style.textContent = `
      .explorer-filter-controls {
        padding: 8px;
        background: #252526;
        border-bottom: 1px solid #3c3c3c;
        position: sticky;
        top: 0;
        z-index: 10;
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
      
      /* Important: use visibility instead of display to maintain layout */
      .file-item.filter-hidden,
      .directory.filter-hidden,
      .integrated-file-item.filter-hidden,
      .integrated-folder-header.filter-hidden {
        display: none !important;
      }
      
      /* Alternative: fade out filtered items */
      .file-item.filter-fade,
      .directory.filter-fade {
        opacity: 0.3;
        pointer-events: none;
      }
      
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
  }

  /**
   * Set up control panel event listeners
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
   * Set view mode
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
   * Apply filters to all file items
   */
  private applyFilters(): void {
    this.isApplyingFilters = true;
    
    console.log('[Filter] Applying filters - Mode:', this.viewMode, 'Search:', this.searchFilter);
    
    // Get all file and folder items
    const allItems = document.querySelectorAll(
      '.file-item, .directory, .integrated-file-item, .integrated-folder-header, ' +
      '[class*="file-item"], [class*="folder"]'
    );
    
    let visibleCount = 0;
    let totalCount = 0;

    allItems.forEach((item) => {
      const element = item as HTMLElement;
      const isDirectory = this.isFolder(element);
      const fileName = this.getFileName(element);
      const shouldShow = this.shouldShowFile(fileName, isDirectory);
      
      // Apply the filter
      element.classList.toggle('filter-hidden', !shouldShow);
      element.classList.remove('filter-fade'); // Remove fade class if using hide
      
      // Update counts
      if (!isDirectory) {
        totalCount++;
        if (shouldShow) visibleCount++;
      }
    });

    // Update status
    this.updateFilterStatus(visibleCount, totalCount);
    
    this.isApplyingFilters = false;
  }

  /**
   * Apply filters silently (without updating status)
   */
  private applyFiltersSilently(): void {
    const allItems = document.querySelectorAll(
      '.file-item, .directory, .integrated-file-item, .integrated-folder-header'
    );
    
    allItems.forEach((item) => {
      const element = item as HTMLElement;
      // Skip if already processed
      if (element.dataset.filterProcessed === this.viewMode + this.searchFilter) {
        return;
      }
      
      const isDirectory = this.isFolder(element);
      const fileName = this.getFileName(element);
      const shouldShow = this.shouldShowFile(fileName, isDirectory);
      
      element.classList.toggle('filter-hidden', !shouldShow);
      element.dataset.filterProcessed = this.viewMode + this.searchFilter;
    });
  }

  /**
   * Check if element is a folder/directory
   */
  private isFolder(element: HTMLElement): boolean {
    return element.classList.contains('directory') || 
           element.classList.contains('integrated-folder-header') ||
           element.classList.contains('folder') ||
           element.dataset.type === 'directory' ||
           element.dataset.type === 'folder';
  }

  /**
   * Get file name from element
   */
  private getFileName(element: HTMLElement): string {
    // Try data attributes first
    const fileName = element.dataset.fileName || element.dataset.name || '';
    if (fileName) return fileName;
    
    // Try to find name span
    const nameSpan = element.querySelector('.file-name, .folder-name, [class*="name"]');
    if (nameSpan) {
      return nameSpan.textContent?.trim() || '';
    }
    
    // Extract from path if available
    const path = element.dataset.path || '';
    if (path) {
      return path.split(/[/\\]/).pop() || '';
    }
    
    // Fallback to text content
    const text = element.textContent?.trim() || '';
    // Clean up the text (remove icons, status indicators, etc.)
    return text.split('\n')[0].replace(/^[📁📂📄🔷🟨⚛️🐍☕⚙️🌐🎨📋📝📕🖼️📦🎵🎬]\s*/, '').trim();
  }

  /**
   * Determine if file should be shown
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
   * Get file extension
   */
  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.slice(lastDot).toLowerCase() : '';
  }

  /**
   * Update filter status
   */
  private updateFilterStatus(visible: number, total: number): void {
    const statusElement = document.getElementById('filter-status');
    if (statusElement) {
      if (this.viewMode !== 'all' || this.searchFilter || !this.showHiddenFiles) {
        statusElement.textContent = `Showing ${visible} of ${total} files`;
      } else {
        statusElement.textContent = '';
      }
    }
  }

  /**
   * Show notification
   */
  private showNotification(message: string): void {
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

  /**
   * Cleanup method
   */
  public cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }
  }
}

// Auto-initialize
let filterInstance: PersistentExplorerFilter | null = null;

function initializeFilter() {
  if (!filterInstance) {
    filterInstance = new PersistentExplorerFilter();
    filterInstance.init();
    console.log('[Filter] PersistentExplorerFilter initialized');
  }
}

// Try to initialize immediately
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFilter);
} else {
  // Small delay to ensure DOM is ready
  setTimeout(initializeFilter, 100);
}

// Export for manual use
export default PersistentExplorerFilter;