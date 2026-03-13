// ide/vsc/virtualizedGitList.ts
// ============================================================================
// VIRTUALIZED GIT FILE LIST - High Performance for 6000+ Files
// Only renders visible items in viewport for optimal performance
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPES
// ============================================================================

export interface GitFileStatus {
  path: string;
  status: string;  // "modified", "added", "deleted", "untracked", "renamed", "copied"
  staged: boolean;
  original_path?: string;
}

export interface VirtualListConfig {
  itemHeight: number;        // Height of each row in pixels
  bufferSize: number;        // Extra items to render above/below viewport
  overscan: number;          // Additional overscan for smooth scrolling
  batchSize: number;         // Items to process per frame
  debounceMs: number;        // Scroll debounce delay
}

export interface VirtualListState {
  scrollTop: number;
  visibleStart: number;
  visibleEnd: number;
  totalHeight: number;
  isScrolling: boolean;
}

export interface FileSelection {
  selectedPaths: Set<string>;
  lastSelectedIndex: number;
  anchorIndex: number;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: VirtualListConfig = {
  itemHeight: 28,
  bufferSize: 10,
  overscan: 5,
  batchSize: 50,
  debounceMs: 16  // ~60fps
};

// ============================================================================
// VIRTUALIZED GIT LIST CLASS
// ============================================================================

export class VirtualizedGitList {
  private container: HTMLElement;
  private scrollContainer: HTMLElement | null = null;
  private contentContainer: HTMLElement | null = null;
  private config: VirtualListConfig;
  private state: VirtualListState;
  private selection: FileSelection;
  
  // Data
  private allFiles: GitFileStatus[] = [];
  private stagedFiles: GitFileStatus[] = [];
  private unstagedFiles: GitFileStatus[] = [];
  private filteredFiles: GitFileStatus[] = [];
  private filterText: string = '';
  
  // Performance
  private scrollRAF: number | null = null;
  private renderRAF: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private isDestroyed: boolean = false;
  
  // Callbacks
  private onFileClick?: (file: GitFileStatus, event: MouseEvent) => void;
  private onFileDoubleClick?: (file: GitFileStatus) => void;
  private onFileContextMenu?: (file: GitFileStatus, event: MouseEvent) => void;
  private onSelectionChange?: (selectedFiles: GitFileStatus[]) => void;
  private onStageFile?: (file: GitFileStatus) => void;
  private onUnstageFile?: (file: GitFileStatus) => void;

  constructor(container: HTMLElement, config: Partial<VirtualListConfig> = {}) {
    this.container = container;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.state = {
      scrollTop: 0,
      visibleStart: 0,
      visibleEnd: 0,
      totalHeight: 0,
      isScrolling: false
    };
    
    this.selection = {
      selectedPaths: new Set(),
      lastSelectedIndex: -1,
      anchorIndex: -1
    };
    
    this.initialize();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private initialize(): void {
    this.createDOM();
    this.attachEventListeners();
    this.setupResizeObserver();
    console.log('✅ [VirtualizedGitList] Initialized');
  }

  private createDOM(): void {
    // Clear container
    this.container.innerHTML = '';
    this.container.className = 'virtualized-git-list-wrapper';
    
    // Create scroll container
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.className = 'virtualized-scroll-container';
    this.scrollContainer.setAttribute('role', 'listbox');
    this.scrollContainer.setAttribute('aria-label', 'Git changes');
    this.scrollContainer.tabIndex = 0;
    
    // Create content container (for total height)
    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'virtualized-content';
    
    this.scrollContainer.appendChild(this.contentContainer);
    this.container.appendChild(this.scrollContainer);
  }

  private attachEventListeners(): void {
    if (!this.scrollContainer) return;
    
    // Scroll handling with RAF throttling
    this.scrollContainer.addEventListener('scroll', this.handleScroll, { passive: true });
    
    // Click handling (delegated)
    this.scrollContainer.addEventListener('click', this.handleClick);
    this.scrollContainer.addEventListener('dblclick', this.handleDoubleClick);
    this.scrollContainer.addEventListener('contextmenu', this.handleContextMenu);
    
    // Keyboard navigation
    this.scrollContainer.addEventListener('keydown', this.handleKeyDown);
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.scrollContainer) {
          this.scheduleRender();
        }
      }
    });
    
    if (this.scrollContainer) {
      this.resizeObserver.observe(this.scrollContainer);
    }
  }

  // ============================================================================
  // DATA MANAGEMENT
  // ============================================================================

  /**
   * Set all files and trigger re-render
   */
  public setFiles(files: GitFileStatus[]): void {
    console.log(`📂 [VirtualizedGitList] Setting ${files.length} files`);
    
    this.allFiles = files;
    this.categorizeFiles();
    this.applyFilter();
    this.updateTotalHeight();
    this.scheduleRender();
  }

  /**
   * Add files incrementally (for streaming/pagination)
   */
  public appendFiles(files: GitFileStatus[]): void {
    this.allFiles.push(...files);
    this.categorizeFiles();
    this.applyFilter();
    this.updateTotalHeight();
    this.scheduleRender();
  }

  /**
   * Update a single file's status
   */
  public updateFile(path: string, updates: Partial<GitFileStatus>): void {
    const index = this.allFiles.findIndex(f => f.path === path);
    if (index !== -1) {
      this.allFiles[index] = { ...this.allFiles[index], ...updates };
      this.categorizeFiles();
      this.applyFilter();
      this.scheduleRender();
    }
  }

  /**
   * Remove a file from the list
   */
  public removeFile(path: string): void {
    this.allFiles = this.allFiles.filter(f => f.path !== path);
    this.selection.selectedPaths.delete(path);
    this.categorizeFiles();
    this.applyFilter();
    this.updateTotalHeight();
    this.scheduleRender();
  }

  /**
   * Clear all files
   */
  public clear(): void {
    this.allFiles = [];
    this.stagedFiles = [];
    this.unstagedFiles = [];
    this.filteredFiles = [];
    this.selection.selectedPaths.clear();
    this.updateTotalHeight();
    this.scheduleRender();
  }

  private categorizeFiles(): void {
    this.stagedFiles = this.allFiles.filter(f => f.staged);
    this.unstagedFiles = this.allFiles.filter(f => !f.staged);
  }

  // ============================================================================
  // FILTERING
  // ============================================================================

  /**
   * Set filter text and re-render
   */
  public setFilter(text: string): void {
    this.filterText = text.toLowerCase().trim();
    this.applyFilter();
    this.state.scrollTop = 0;
    if (this.scrollContainer) {
      this.scrollContainer.scrollTop = 0;
    }
    this.updateTotalHeight();
    this.scheduleRender();
  }

  private applyFilter(): void {
    if (!this.filterText) {
      this.filteredFiles = this.allFiles;
    } else {
      this.filteredFiles = this.allFiles.filter(file => 
        file.path.toLowerCase().includes(this.filterText) ||
        file.status.toLowerCase().includes(this.filterText)
      );
    }
  }

  // ============================================================================
  // SCROLL HANDLING
  // ============================================================================

  private handleScroll = (): void => {
    if (this.scrollRAF) {
      cancelAnimationFrame(this.scrollRAF);
    }
    
    this.scrollRAF = requestAnimationFrame(() => {
      if (!this.scrollContainer || this.isDestroyed) return;
      
      const newScrollTop = this.scrollContainer.scrollTop;
      
      // Only re-render if scroll position changed significantly
      if (Math.abs(newScrollTop - this.state.scrollTop) >= this.config.itemHeight / 2) {
        this.state.scrollTop = newScrollTop;
        this.state.isScrolling = true;
        this.render();
        
        // Reset scrolling state after a delay
        setTimeout(() => {
          this.state.isScrolling = false;
        }, 150);
      }
    });
  };

  // ============================================================================
  // RENDERING
  // ============================================================================

  private scheduleRender(): void {
    if (this.renderRAF) {
      cancelAnimationFrame(this.renderRAF);
    }
    
    this.renderRAF = requestAnimationFrame(() => {
      this.render();
    });
  }

  private updateTotalHeight(): void {
    this.state.totalHeight = this.filteredFiles.length * this.config.itemHeight;
  }

  private calculateVisibleRange(): { start: number; end: number } {
    if (!this.scrollContainer) return { start: 0, end: 0 };
    
    const containerHeight = this.scrollContainer.clientHeight;
    const { itemHeight, bufferSize, overscan } = this.config;
    
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const scrollIndex = Math.floor(this.state.scrollTop / itemHeight);
    
    const start = Math.max(0, scrollIndex - bufferSize - overscan);
    const end = Math.min(
      this.filteredFiles.length,
      scrollIndex + visibleCount + bufferSize + overscan
    );
    
    return { start, end };
  }

  private render(): void {
    if (!this.contentContainer || this.isDestroyed) return;
    
    const startTime = performance.now();
    const { start, end } = this.calculateVisibleRange();
    
    // Update state
    this.state.visibleStart = start;
    this.state.visibleEnd = end;
    
    // Get visible slice
    const visibleFiles = this.filteredFiles.slice(start, end);
    
    // Calculate offset for positioning
    const offsetY = start * this.config.itemHeight;
    
    // Build HTML
    const itemsHTML = visibleFiles.map((file, i) => 
      this.renderItem(file, start + i)
    ).join('');
    
    // Update DOM
    this.contentContainer.style.height = `${this.state.totalHeight}px`;
    this.contentContainer.innerHTML = `
      <div class="virtualized-items" style="transform: translateY(${offsetY}px);">
        ${itemsHTML}
      </div>
    `;
    
    const renderTime = performance.now() - startTime;
    if (renderTime > 16) {
      console.warn(`⚠️ [VirtualizedGitList] Slow render: ${renderTime.toFixed(2)}ms`);
    }
  }

  private renderItem(file: GitFileStatus, index: number): string {
    const isSelected = this.selection.selectedPaths.has(file.path);
    const statusIcon = this.getStatusIcon(file.status);
    const statusClass = this.getStatusClass(file.status);
    const fileName = this.getFileName(file.path);
    const dirPath = this.getDirPath(file.path);
    
    return `
      <div class="git-file-item ${statusClass} ${isSelected ? 'selected' : ''} ${file.staged ? 'staged' : 'unstaged'}"
           data-index="${index}"
           data-path="${this.escapeHtml(file.path)}"
           data-staged="${file.staged}"
           role="option"
           aria-selected="${isSelected}"
           style="height: ${this.config.itemHeight}px;">
        <div class="file-item-content">
          <span class="status-badge" title="${file.status}">${statusIcon}</span>
          <span class="file-info">
            <span class="file-name" title="${this.escapeHtml(file.path)}">${this.escapeHtml(fileName)}</span>
            ${dirPath ? `<span class="file-dir">${this.escapeHtml(dirPath)}</span>` : ''}
          </span>
          <div class="file-actions">
            ${file.staged 
              ? `<button class="action-btn unstage-btn" data-action="unstage" title="Unstage">−</button>`
              : `<button class="action-btn stage-btn" data-action="stage" title="Stage">+</button>`
            }
            <button class="action-btn discard-btn" data-action="discard" title="Discard changes">⟲</button>
          </div>
        </div>
      </div>
    `;
  }

  private getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      modified: 'M',
      added: 'A',
      deleted: 'D',
      untracked: 'U',
      renamed: 'R',
      copied: 'C',
      conflict: '!',
      ignored: 'I',
      unknown: '?'
    };
    return icons[status] || '?';
  }

  private getStatusClass(status: string): string {
    return `status-${status}`;
  }

  private getFileName(path: string): string {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
  }

  private getDirPath(path: string): string {
    const parts = path.split(/[/\\]/);
    if (parts.length > 1) {
      parts.pop();
      return parts.join('/');
    }
    return '';
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private handleClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const item = target.closest('.git-file-item') as HTMLElement;
    
    if (!item) return;
    
    // Check if action button was clicked
    const actionBtn = target.closest('.action-btn') as HTMLElement;
    if (actionBtn) {
      event.stopPropagation();
      this.handleActionClick(actionBtn, item);
      return;
    }
    
    const index = parseInt(item.dataset.index || '-1', 10);
    const path = item.dataset.path || '';
    const file = this.filteredFiles[index];
    
    if (!file) return;
    
    // Handle selection
    this.handleSelection(index, event);
    
    // Callback
    if (this.onFileClick) {
      this.onFileClick(file, event);
    }
  };

  private handleDoubleClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const item = target.closest('.git-file-item') as HTMLElement;
    
    if (!item) return;
    
    const index = parseInt(item.dataset.index || '-1', 10);
    const file = this.filteredFiles[index];
    
    if (file && this.onFileDoubleClick) {
      this.onFileDoubleClick(file);
    }
  };

  private handleContextMenu = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const item = target.closest('.git-file-item') as HTMLElement;
    
    if (!item) return;
    
    event.preventDefault();
    
    const index = parseInt(item.dataset.index || '-1', 10);
    const file = this.filteredFiles[index];
    
    if (!file) return;
    
    // Select item if not already selected
    if (!this.selection.selectedPaths.has(file.path)) {
      this.selection.selectedPaths.clear();
      this.selection.selectedPaths.add(file.path);
      this.selection.lastSelectedIndex = index;
      this.scheduleRender();
    }
    
    if (this.onFileContextMenu) {
      this.onFileContextMenu(file, event);
    }
  };

  private handleActionClick(btn: HTMLElement, item: HTMLElement): void {
    const action = btn.dataset.action;
    const path = item.dataset.path || '';
    const file = this.allFiles.find(f => f.path === path);
    
    if (!file) return;
    
    switch (action) {
      case 'stage':
        if (this.onStageFile) this.onStageFile(file);
        break;
      case 'unstage':
        if (this.onUnstageFile) this.onUnstageFile(file);
        break;
      case 'discard':
        this.handleDiscard(file);
        break;
    }
  }

  private async handleDiscard(file: GitFileStatus): Promise<void> {
    const confirmed = confirm(`Discard changes to "${file.path}"?\nThis cannot be undone.`);
    if (!confirmed) return;
    
    try {
      // Emit event for parent to handle
      this.container.dispatchEvent(new CustomEvent('git-discard', {
        detail: { file },
        bubbles: true
      }));
    } catch (error) {
      console.error('Failed to discard changes:', error);
    }
  }

  private handleSelection(index: number, event: MouseEvent): void {
    const file = this.filteredFiles[index];
    if (!file) return;
    
    if (event.ctrlKey || event.metaKey) {
      // Toggle selection
      if (this.selection.selectedPaths.has(file.path)) {
        this.selection.selectedPaths.delete(file.path);
      } else {
        this.selection.selectedPaths.add(file.path);
      }
      this.selection.lastSelectedIndex = index;
    } else if (event.shiftKey && this.selection.anchorIndex >= 0) {
      // Range selection
      const start = Math.min(this.selection.anchorIndex, index);
      const end = Math.max(this.selection.anchorIndex, index);
      
      this.selection.selectedPaths.clear();
      for (let i = start; i <= end; i++) {
        const f = this.filteredFiles[i];
        if (f) this.selection.selectedPaths.add(f.path);
      }
      this.selection.lastSelectedIndex = index;
    } else {
      // Single selection
      this.selection.selectedPaths.clear();
      this.selection.selectedPaths.add(file.path);
      this.selection.lastSelectedIndex = index;
      this.selection.anchorIndex = index;
    }
    
    this.scheduleRender();
    
    if (this.onSelectionChange) {
      this.onSelectionChange(this.getSelectedFiles());
    }
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const { lastSelectedIndex } = this.selection;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.navigateSelection(1, event.shiftKey);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.navigateSelection(-1, event.shiftKey);
        break;
      case 'Home':
        event.preventDefault();
        this.navigateToIndex(0, event.shiftKey);
        break;
      case 'End':
        event.preventDefault();
        this.navigateToIndex(this.filteredFiles.length - 1, event.shiftKey);
        break;
      case 'PageDown':
        event.preventDefault();
        this.navigateSelection(10, event.shiftKey);
        break;
      case 'PageUp':
        event.preventDefault();
        this.navigateSelection(-10, event.shiftKey);
        break;
      case 'a':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.selectAll();
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (lastSelectedIndex >= 0) {
          const file = this.filteredFiles[lastSelectedIndex];
          if (file && this.onFileDoubleClick) {
            this.onFileDoubleClick(file);
          }
        }
        break;
    }
  };

  private navigateSelection(delta: number, extendSelection: boolean): void {
    const currentIndex = this.selection.lastSelectedIndex;
    const newIndex = Math.max(0, Math.min(
      this.filteredFiles.length - 1,
      currentIndex + delta
    ));
    
    this.navigateToIndex(newIndex, extendSelection);
  }

  private navigateToIndex(index: number, extendSelection: boolean): void {
    if (index < 0 || index >= this.filteredFiles.length) return;
    
    const file = this.filteredFiles[index];
    if (!file) return;
    
    if (extendSelection && this.selection.anchorIndex >= 0) {
      // Extend selection
      const start = Math.min(this.selection.anchorIndex, index);
      const end = Math.max(this.selection.anchorIndex, index);
      
      this.selection.selectedPaths.clear();
      for (let i = start; i <= end; i++) {
        const f = this.filteredFiles[i];
        if (f) this.selection.selectedPaths.add(f.path);
      }
    } else {
      // Single selection
      this.selection.selectedPaths.clear();
      this.selection.selectedPaths.add(file.path);
      this.selection.anchorIndex = index;
    }
    
    this.selection.lastSelectedIndex = index;
    this.scrollToIndex(index);
    this.scheduleRender();
    
    if (this.onSelectionChange) {
      this.onSelectionChange(this.getSelectedFiles());
    }
  }

  private scrollToIndex(index: number): void {
    if (!this.scrollContainer) return;
    
    const itemTop = index * this.config.itemHeight;
    const itemBottom = itemTop + this.config.itemHeight;
    const containerHeight = this.scrollContainer.clientHeight;
    const scrollTop = this.scrollContainer.scrollTop;
    
    if (itemTop < scrollTop) {
      this.scrollContainer.scrollTop = itemTop;
    } else if (itemBottom > scrollTop + containerHeight) {
      this.scrollContainer.scrollTop = itemBottom - containerHeight;
    }
  }

  private selectAll(): void {
    this.selection.selectedPaths.clear();
    for (const file of this.filteredFiles) {
      this.selection.selectedPaths.add(file.path);
    }
    this.scheduleRender();
    
    if (this.onSelectionChange) {
      this.onSelectionChange(this.getSelectedFiles());
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get currently selected files
   */
  public getSelectedFiles(): GitFileStatus[] {
    return this.filteredFiles.filter(f => this.selection.selectedPaths.has(f.path));
  }

  /**
   * Get all staged files
   */
  public getStagedFiles(): GitFileStatus[] {
    return this.stagedFiles;
  }

  /**
   * Get all unstaged files
   */
  public getUnstagedFiles(): GitFileStatus[] {
    return this.unstagedFiles;
  }

  /**
   * Get file count
   */
  public getCount(): { total: number; staged: number; unstaged: number; filtered: number } {
    return {
      total: this.allFiles.length,
      staged: this.stagedFiles.length,
      unstaged: this.unstagedFiles.length,
      filtered: this.filteredFiles.length
    };
  }

  /**
   * Scroll to a specific file
   */
  public scrollToFile(path: string): void {
    const index = this.filteredFiles.findIndex(f => f.path === path);
    if (index >= 0) {
      this.scrollToIndex(index);
    }
  }

  /**
   * Set selection programmatically
   */
  public setSelection(paths: string[]): void {
    this.selection.selectedPaths = new Set(paths);
    this.scheduleRender();
    
    if (this.onSelectionChange) {
      this.onSelectionChange(this.getSelectedFiles());
    }
  }

  /**
   * Clear selection
   */
  public clearSelection(): void {
    this.selection.selectedPaths.clear();
    this.selection.lastSelectedIndex = -1;
    this.selection.anchorIndex = -1;
    this.scheduleRender();
  }

  // ============================================================================
  // CALLBACKS
  // ============================================================================

  public onFileClickCallback(callback: (file: GitFileStatus, event: MouseEvent) => void): void {
    this.onFileClick = callback;
  }

  public onFileDoubleClickCallback(callback: (file: GitFileStatus) => void): void {
    this.onFileDoubleClick = callback;
  }

  public onFileContextMenuCallback(callback: (file: GitFileStatus, event: MouseEvent) => void): void {
    this.onFileContextMenu = callback;
  }

  public onSelectionChangeCallback(callback: (selectedFiles: GitFileStatus[]) => void): void {
    this.onSelectionChange = callback;
  }

  public onStageFileCallback(callback: (file: GitFileStatus) => void): void {
    this.onStageFile = callback;
  }

  public onUnstageFileCallback(callback: (file: GitFileStatus) => void): void {
    this.onUnstageFile = callback;
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  public destroy(): void {
    this.isDestroyed = true;
    
    if (this.scrollRAF) {
      cancelAnimationFrame(this.scrollRAF);
    }
    
    if (this.renderRAF) {
      cancelAnimationFrame(this.renderRAF);
    }
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener('scroll', this.handleScroll);
      this.scrollContainer.removeEventListener('click', this.handleClick);
      this.scrollContainer.removeEventListener('dblclick', this.handleDoubleClick);
      this.scrollContainer.removeEventListener('contextmenu', this.handleContextMenu);
      this.scrollContainer.removeEventListener('keydown', this.handleKeyDown);
    }
    
    this.container.innerHTML = '';
    console.log('🗑️ [VirtualizedGitList] Destroyed');
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createVirtualizedGitList(
  container: HTMLElement,
  config?: Partial<VirtualListConfig>
): VirtualizedGitList {
  return new VirtualizedGitList(container, config);
}

export default VirtualizedGitList;
