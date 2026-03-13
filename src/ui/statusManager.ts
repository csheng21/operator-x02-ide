// statusManager.ts - Complete Compact Version with Enhanced Breadcrumbs
// Create this file: src/ui/statusManager.ts

export interface FileStatus {
  path: string;
  fileName: string;
  language: string;
  encoding: string;
  lineEnding: string;
  position: { line: number; column: number };
  selection: { start: number; end: number } | null;
  isModified: boolean;
  fileSize: number;
  gitStatus?: 'modified' | 'added' | 'deleted' | 'untracked' | 'clean';
  lastModified?: Date;
  readOnly: boolean;
}

export class StatusManager {
  private breadcrumbBar: HTMLElement;
  private currentStatus: FileStatus | null = null;
  private tabManager: any;
  private monaco: any;
  private statusClickHandlers: Map<string, () => void> = new Map();

  constructor() {
    this.initializeBreadcrumbs();
    this.setupEventListeners();
    this.startPeriodicUpdates();
    
    // Ensure compact layout after a brief delay
    setTimeout(() => {
      this.ensureCompactLayout();
    }, 100);
  }

  /**
   * Initialize compact breadcrumb navigation above editor
   */
  private initializeBreadcrumbs(): void {
    // Find the editor area to add breadcrumbs above it
    const editorPanel = document.querySelector('.editor-panel');
    const monacoEditor = document.getElementById('monaco-editor');
    const editorContent = document.querySelector('.editor-content');
    
    if (!editorPanel && !monacoEditor && !editorContent) {
      console.warn('⚠️ Could not find editor area for breadcrumbs');
      return;
    }

    // Create breadcrumb bar with compact structure
    this.breadcrumbBar = document.createElement('div');
    this.breadcrumbBar.className = 'enhanced-breadcrumb-bar';
    this.breadcrumbBar.innerHTML = `
      <div class="breadcrumb-content">
        <div class="breadcrumb-path">
          <span class="breadcrumb-icon">📁</span>
          <span class="breadcrumb-text">No file open</span>
        </div>
        <div class="breadcrumb-meta">
          <span class="file-status-badge" id="file-status-badge">●</span>
          <span class="file-meta-text" id="file-meta-text">Ready</span>
        </div>
      </div>
    `;

    // Insert breadcrumbs with precise positioning
    const targetContainer = editorPanel || monacoEditor?.parentElement || editorContent?.parentElement;
    
    if (targetContainer) {
      // Remove any existing breadcrumbs first
      const existingBreadcrumb = targetContainer.querySelector('.enhanced-breadcrumb-bar');
      if (existingBreadcrumb) {
        existingBreadcrumb.remove();
      }
      
      // Insert at the very top of the editor area
      if (monacoEditor) {
        // Insert directly before Monaco editor
        targetContainer.insertBefore(this.breadcrumbBar, monacoEditor);
        
        // Ensure Monaco editor has no top spacing
        monacoEditor.style.marginTop = '0';
        monacoEditor.style.paddingTop = '0';
        
      } else if (editorContent) {
        // Insert before editor content
        editorContent.insertBefore(this.breadcrumbBar, editorContent.firstChild);
        
      } else {
        // Fallback: insert at the beginning
        targetContainer.insertBefore(this.breadcrumbBar, targetContainer.firstChild);
      }
      
      // Remove any spacing from the parent container
      if (targetContainer instanceof HTMLElement) {
        targetContainer.style.paddingTop = '0';
        targetContainer.style.marginTop = '0';
      }
    }

    this.applyBreadcrumbStyles();
    console.log('✅ Compact breadcrumbs initialized');
  }

  /**
   * Apply comprehensive compact styling to breadcrumbs
   */
  private applyBreadcrumbStyles(): void {
    const styleId = 'enhanced-breadcrumb-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .enhanced-breadcrumb-bar {
        background: #383838;
        border-bottom: 1px solid #454545;
        padding: 2px 12px;
        font-size: 12px;
        color: #cccccc;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 24px;
        height: 24px;
        position: relative;
        z-index: 10;
        line-height: 1.2;
        box-sizing: border-box;
        flex-shrink: 0;
      }

      .breadcrumb-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        height: 100%;
      }

      .breadcrumb-path {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        overflow: hidden;
        cursor: pointer;
        padding: 1px 4px;
        border-radius: 3px;
        transition: background-color 0.2s ease;
        height: 100%;
      }

      .breadcrumb-path:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }

      .breadcrumb-icon {
        font-size: 12px;
        opacity: 0.8;
        flex-shrink: 0;
      }

      .breadcrumb-text {
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 400px;
        font-size: 12px;
      }

      .breadcrumb-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
        opacity: 0.8;
        height: 100%;
        flex-shrink: 0;
      }

      .file-status-badge {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #28a745;
        display: inline-block;
        transition: all 0.3s ease;
        flex-shrink: 0;
      }

      .file-status-badge.modified {
        background: #ffc107;
        animation: pulse 2s infinite;
      }

      .file-status-badge.error {
        background: #dc3545;
      }

      .file-status-badge.untracked {
        background: #6c757d;
      }

      .file-status-badge.added {
        background: #28a745;
      }

      .file-status-badge.deleted {
        background: #dc3545;
      }

      @keyframes pulse {
        0%, 100% { 
          opacity: 1; 
          transform: scale(1);
        }
        50% { 
          opacity: 0.7; 
          transform: scale(1.1);
        }
      }

      .file-meta-text {
        font-weight: 400;
        color: #cccccc;
        font-size: 10px;
        white-space: nowrap;
      }

      /* Ensure Monaco editor positioning */
      #monaco-editor {
        margin-top: 0 !important;
        padding-top: 0 !important;
        position: relative;
        top: 0;
      }

      .editor-content {
        padding-top: 0 !important;
        margin-top: 0 !important;
      }

      #editor-tab-container {
        margin-bottom: 0 !important;
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .enhanced-breadcrumb-bar {
          padding: 1px 8px;
          font-size: 11px;
          min-height: 20px;
          height: 20px;
        }
        
        .breadcrumb-text {
          max-width: 150px;
          font-size: 11px;
        }
        
        .file-meta-text {
          display: none;
        }

        .breadcrumb-meta {
          font-size: 9px;
        }
      }

      @media (max-width: 480px) {
        .enhanced-breadcrumb-bar {
          padding: 1px 6px;
        }
        
        .breadcrumb-text {
          max-width: 120px;
        }
        
        .breadcrumb-icon {
          display: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Ensure compact layout by removing extra spacing
   */
  private ensureCompactLayout(): void {
    // Remove extra spacing from common elements
    const elementsToCompact = [
      '#monaco-editor',
      '.editor-content',
      '.editor-panel',
      '#editor-tab-container'
    ];
    
    elementsToCompact.forEach(selector => {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        element.style.marginTop = '0';
        element.style.paddingTop = '0';
      }
    });
    
    // Ensure breadcrumb doesn't add extra height
    if (this.breadcrumbBar) {
      this.breadcrumbBar.style.flexShrink = '0';
      this.breadcrumbBar.style.boxSizing = 'border-box';
    }
  }

  /**
   * Setup event listeners for status updates
   */
  private setupEventListeners(): void {
    // Listen for tab changes
    document.addEventListener('tab-activated', (e: CustomEvent) => {
      const { path, model } = e.detail;
      this.updateFromTabChange(path, model);
    });

    // Listen for file saves
    document.addEventListener('file-saved', (e: CustomEvent) => {
      this.updateFileStatus({ isModified: false });
    });

    // Listen for Monaco editor changes
    if (typeof window !== 'undefined' && (window as any).monaco) {
      this.setupMonacoListeners();
    } else {
      // Wait for Monaco to load
      setTimeout(() => this.setupMonacoListeners(), 2000);
    }

    // Listen for tab manager initialization
    this.setupTabManagerIntegration();

    // Add click handler for breadcrumb path (copy to clipboard)
    setTimeout(() => {
      const breadcrumbPath = this.breadcrumbBar?.querySelector('.breadcrumb-path');
      if (breadcrumbPath) {
        breadcrumbPath.addEventListener('click', () => {
          if (this.currentStatus && navigator.clipboard) {
            navigator.clipboard.writeText(this.currentStatus.path);
            console.log('📋 File path copied to clipboard');
            
            // Show temporary feedback
            const originalText = breadcrumbPath.querySelector('.breadcrumb-text')?.textContent;
            const textElement = breadcrumbPath.querySelector('.breadcrumb-text');
            if (textElement) {
              textElement.textContent = 'Path copied!';
              setTimeout(() => {
                if (originalText) textElement.textContent = originalText;
              }, 1000);
            }
          }
        });
        
        (breadcrumbPath as HTMLElement).title = 'Click to copy file path';
      }
    }, 1000);

    console.log('✅ Status manager event listeners setup');
  }

  /**
   * Setup Monaco editor event listeners
   */
  private setupMonacoListeners(): void {
    try {
      const monaco = (window as any).monaco;
      if (!monaco?.editor) return;

      // Watch for editor changes
      const checkForEditor = () => {
        const editors = monaco.editor.getEditors();
        if (editors.length > 0) {
          const mainEditor = editors[0];
          
          // Content change listener
          mainEditor.onDidChangeModelContent(() => {
            this.updateFileStatus({ isModified: true });
          });

          // Model change listener (file switch)
          mainEditor.onDidChangeModel((e: any) => {
            if (e.newModelUrl) {
              this.updateFromModelChange(e.newModelUrl);
            }
          });

          // Position change listener
          mainEditor.onDidChangeCursorPosition((e: any) => {
            if (this.currentStatus) {
              this.currentStatus.position = { 
                line: e.position.lineNumber, 
                column: e.position.column 
              };
              this.updateBreadcrumbs();
            }
          });

          console.log('✅ Monaco editor listeners attached');
        }
      };

      // Check immediately and retry
      checkForEditor();
      setTimeout(checkForEditor, 1000);
      setTimeout(checkForEditor, 3000);

    } catch (error) {
      console.warn('⚠️ Could not setup Monaco listeners:', error);
    }
  }

  /**
   * Setup integration with tab manager
   */
  private setupTabManagerIntegration(): void {
    // Try to get tab manager instance
    const getTabManager = () => {
      return (window as any).tabManager || 
             (window as any).robustTabManager ||
             null;
    };

    const tabManager = getTabManager();
    if (tabManager) {
      this.tabManager = tabManager;
      console.log('✅ Tab manager integration setup');
    } else {
      // Retry later
      setTimeout(() => this.setupTabManagerIntegration(), 2000);
    }
  }

  /**
   * Update status when tab changes
   */
  private updateFromTabChange(path: string, model: any): void {
    const fileName = path.split(/[/\\]/).pop() || 'untitled';
    const language = this.detectLanguage(fileName);
    const content = model?.getValue() || '';
    
    this.currentStatus = {
      path,
      fileName,
      language,
      encoding: 'UTF-8',
      lineEnding: 'LF',
      position: { line: 1, column: 1 },
      selection: null,
      isModified: false,
      fileSize: content.length,
      readOnly: false
    };

    this.renderStatus();
    console.log('📊 Status updated for tab change:', fileName);
  }

  /**
   * Update specific status properties
   */
  public updateFileStatus(updates: Partial<FileStatus>): void {
    if (!this.currentStatus) return;

    Object.assign(this.currentStatus, updates);
    this.renderStatus();
  }

  /**
   * Render complete status information
   */
  private renderStatus(): void {
    if (!this.currentStatus) return;

    // Update breadcrumbs only
    this.updateBreadcrumbs();

    // Update modified status in tabs
    this.updateModifiedStatus();
  }

  /**
   * Update breadcrumb navigation with compact display
   */
  private updateBreadcrumbs(): void {
    if (!this.currentStatus || !this.breadcrumbBar) return;

    const breadcrumbText = this.breadcrumbBar.querySelector('.breadcrumb-text');
    const statusBadge = this.breadcrumbBar.querySelector('.file-status-badge');
    const metaText = this.breadcrumbBar.querySelector('.file-meta-text');

    if (breadcrumbText) {
      const pathParts = this.currentStatus.path.split(/[/\\]/);
      const displayPath = pathParts.length > 3 
        ? `.../${pathParts.slice(-2).join('/')}`
        : this.currentStatus.path;
      breadcrumbText.textContent = displayPath;
    }

    if (statusBadge) {
      statusBadge.className = `file-status-badge ${this.currentStatus.isModified ? 'modified' : ''}`;
    }

    if (metaText) {
      const status = this.currentStatus.isModified ? 'Modified' : 'Saved';
      const size = this.formatFileSize(this.currentStatus.fileSize);
      const position = `Ln ${this.currentStatus.position.line}, Col ${this.currentStatus.position.column}`;
      metaText.textContent = `${status} • ${size} • ${this.currentStatus.language}`;
    }
  }

  /**
   * Update modified status indication
   */
  private updateModifiedStatus(): void {
    if (!this.currentStatus) return;

    // Update status badge in breadcrumb
    const statusBadge = document.getElementById('file-status-badge');
    if (statusBadge) {
      statusBadge.className = `file-status-badge ${this.currentStatus.isModified ? 'modified' : ''}`;
    }

    // Update corresponding tab if tab manager is available
    if (this.tabManager && this.tabManager.markTabModified) {
      const activeTab = this.tabManager.getActiveTab();
      if (activeTab) {
        this.tabManager.markTabModified(activeTab.id, this.currentStatus.isModified);
      }
    }
  }

  /**
   * Start periodic status updates
   */
  private startPeriodicUpdates(): void {
    setInterval(() => {
      if (this.currentStatus) {
        // Update file size from Monaco editor for breadcrumb display
        try {
          const monaco = (window as any).monaco;
          const editors = monaco?.editor?.getEditors();
          if (editors && editors.length > 0) {
            const content = editors[0].getValue();
            const newSize = new Blob([content]).size;
            
            if (newSize !== this.currentStatus.fileSize) {
              this.currentStatus.fileSize = newSize;
              this.updateBreadcrumbs(); // Update breadcrumb with new size
            }
          }
        } catch (error) {
          // Ignore errors in periodic update
        }
      }
    }, 2000);
  }

  /**
   * Detect language from filename
   */
  private detectLanguage(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'jsx': 'JavaScript React',
      'tsx': 'TypeScript React',
      'py': 'Python',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'sass': 'Sass',
      'json': 'JSON',
      'md': 'Markdown',
      'yaml': 'YAML',
      'yml': 'YAML',
      'xml': 'XML',
      'sql': 'SQL',
      'php': 'PHP',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'cs': 'C#',
      'go': 'Go',
      'rs': 'Rust',
      'rb': 'Ruby',
      'swift': 'Swift',
      'kt': 'Kotlin'
    };

    return languageMap[extension || ''] || 'Plain Text';
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 bytes';
    
    const k = 1024;
    const sizes = ['bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Update from Monaco model change
   */
  private updateFromModelChange(modelUrl: any): void {
    // Extract path from model URL
    const path = modelUrl.path || 'untitled';
    
    // Get content from model
    const monaco = (window as any).monaco;
    const model = monaco?.editor?.getModel(modelUrl);
    
    if (model) {
      this.updateFromTabChange(path, model);
    }
  }

  /**
   * Add status click handler for interactive elements
   */
  public addStatusClickHandler(element: string, handler: () => void): void {
    this.statusClickHandlers.set(element, handler);
    
    // Apply handler if element exists
    setTimeout(() => {
      const el = document.querySelector(`.${element}`) || document.getElementById(element);
      if (el) {
        el.addEventListener('click', handler);
      }
    }, 500);
  }

  /**
   * Public method to manually update status
   */
  public setStatus(status: Partial<FileStatus>): void {
    if (!this.currentStatus) {
      this.currentStatus = {
        path: 'untitled',
        fileName: 'untitled',
        language: 'Plain Text',
        encoding: 'UTF-8',
        lineEnding: 'LF',
        position: { line: 1, column: 1 },
        selection: null,
        isModified: false,
        fileSize: 0,
        readOnly: false,
        ...status
      };
    } else {
      Object.assign(this.currentStatus, status);
    }

    this.renderStatus();
  }

  /**
   * Get current status
   */
  public getStatus(): FileStatus | null {
    return this.currentStatus;
  }

  /**
   * Update breadcrumb with custom content
   */
  public updateBreadcrumbContent(path: string, meta: string): void {
    if (!this.breadcrumbBar) return;

    const breadcrumbText = this.breadcrumbBar.querySelector('.breadcrumb-text');
    const metaText = this.breadcrumbBar.querySelector('.file-meta-text');

    if (breadcrumbText) {
      breadcrumbText.textContent = path;
    }
    if (metaText) {
      metaText.textContent = meta;
    }
  }

  /**
   * Show/hide breadcrumb bar
   */
  public toggleBreadcrumb(show: boolean): void {
    if (this.breadcrumbBar) {
      this.breadcrumbBar.style.display = show ? 'flex' : 'none';
    }
  }

  /**
   * Destroy status manager and clean up
   */
  public destroy(): void {
    if (this.breadcrumbBar && this.breadcrumbBar.parentNode) {
      this.breadcrumbBar.parentNode.removeChild(this.breadcrumbBar);
    }
    
    // Clear status click handlers
    this.statusClickHandlers.clear();
    
    console.log('Status manager destroyed');
  }
}

// Create and export global instance
export const statusManager = new StatusManager();

// Add to window for debugging
if (typeof window !== 'undefined') {
  (window as any).statusManager = statusManager;
  console.log('🎉 Compact Status Manager loaded! (Breadcrumbs only)');
  console.log('Usage:');
  console.log('- window.statusManager.setStatus({ path: "file.ts", isModified: true })');
  console.log('- window.statusManager.getStatus()');
  console.log('- window.statusManager.updateBreadcrumbContent("path", "meta")');
  console.log('- Click breadcrumb path to copy file path to clipboard');
}