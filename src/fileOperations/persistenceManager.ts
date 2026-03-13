// fileOperations/persistenceManager.ts - Complete IDE State Persistence Manager (FIXED)

interface PersistedFile {
  fileName: string;
  savedPath?: string;
  lastModified: number;
  isActive: boolean;
  content?: string;
  fileSize?: number;
}

interface IDEState {
  version: string;
  timestamp: number;
  activeFile?: string;
  openFiles: PersistedFile[];
  projectPath?: string;
  windowState?: {
    sidebarVisible: boolean;
    terminalVisible: boolean;
    explorerExpanded: boolean;
  };
}

class PersistenceManager {
  private static readonly STATE_KEY = 'ai_ide_state';
  private static readonly STATE_FILE = 'ai_ide_state.json';
  private static readonly VERSION = '1.0.0';
  
  private saveTimeout: number | null = null;
  private initialized = false;
  private tauriInvoke: any = null;

  constructor() {
    this.initializeTauri();
  }

  /**
   * Initialize Tauri safely
   */
  private async initializeTauri(): Promise<void> {
    try {
      if ((window as any).__TAURI__) {
        // Dynamic import to handle cases where Tauri might not be available
        const { invoke } = await import("@tauri-apps/api/core");
        this.tauriInvoke = invoke;
        console.log('✅ Tauri invoke initialized successfully');
      } else {
        console.log('ℹ️ Tauri not available, using localStorage-only mode');
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize Tauri, falling back to localStorage:', error);
      this.tauriInvoke = null;
    }
  }

  /**
   * Check if Tauri is available
   */
  private isTauriAvailable(): boolean {
    return !!(window as any).__TAURI__ && !!this.tauriInvoke;
  }

  /**
   * Initialize persistence manager and restore previous state
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('🔄 Initializing IDE state persistence...');
    console.log(`🖥️ Tauri available: ${this.isTauriAvailable()}`);
    
    try {
      // Wait for Tauri to be fully initialized
      await this.initializeTauri();
      
      const restoredState = await this.loadState();
      if (restoredState) {
        await this.restoreIDEState(restoredState);
        console.log('✅ IDE state restored successfully');
      } else {
        console.log('ℹ️ No previous state found, starting fresh');
      }
      
      // Set up auto-save on state changes
      this.setupAutoSave();
      this.initialized = true;
      
    } catch (error) {
      console.error('❌ Failed to initialize persistence:', error);
    }
  }

  /**
   * Save current IDE state
   */
  public async saveState(): Promise<void> {
    try {
      const currentState = this.captureCurrentState();
      
      // Try Tauri first (desktop), then localStorage (web)
      const saved = await this.saveViaTauri(currentState) || 
                   await this.saveViaLocalStorage(currentState);
      
      if (saved) {
        console.log('💾 IDE state saved successfully');
      } else {
        console.warn('⚠️ Failed to save IDE state');
      }
      
    } catch (error) {
      console.error('❌ Error saving state:', error);
    }
  }

  /**
   * Load IDE state from storage
   */
  private async loadState(): Promise<IDEState | null> {
    try {
      // Try Tauri first, then localStorage
      let state = await this.loadViaTauri() || await this.loadViaLocalStorage();
      
      if (state && this.validateState(state)) {
        console.log('📂 Loaded IDE state:', {
          files: state.openFiles.length,
          activeFile: state.activeFile,
          timestamp: new Date(state.timestamp).toLocaleString()
        });
        return state;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error loading state:', error);
      return null;
    }
  }

  /**
   * Capture current IDE state
   */
  private captureCurrentState(): IDEState {
    const state: IDEState = {
      version: PersistenceManager.VERSION,
      timestamp: Date.now(),
      openFiles: [],
      windowState: {
        sidebarVisible: !document.querySelector('.sidebar')?.classList.contains('hidden'),
        terminalVisible: !document.querySelector('.terminal')?.classList.contains('hidden'),
        explorerExpanded: !document.querySelector('.file-explorer')?.classList.contains('collapsed')
      }
    };

    // Capture open files from file explorer
    const fileItems = document.querySelectorAll('.file-item[data-filename]');
    console.log(`📊 Found ${fileItems.length} file items to capture`);
    
    fileItems.forEach(item => {
      const fileName = item.getAttribute('data-filename');
      if (!fileName) return;

      const isActive = item.classList.contains('active');
      const savedPath = (item as any)._savedPath || 
                       this.getFilePathFromGlobalState(fileName);

      const persistedFile: PersistedFile = {
        fileName,
        savedPath,
        lastModified: Date.now(),
        isActive,
        fileSize: this.getFileSizeFromMetadata(fileName)
      };

      // Try to get content if file is currently open in editor
      if (isActive) {
        const editor = (window as any).monaco?.editor?.getEditors()?.[0];
        if (editor && editor.getModel()) {
          persistedFile.content = editor.getModel().getValue();
          console.log(`📝 Captured content for active file: ${fileName} (${persistedFile.content.length} chars)`);
        }
      }

      state.openFiles.push(persistedFile);
      console.log(`📁 Captured file: ${fileName} (saved: ${!!savedPath}, active: ${isActive})`);
    });

    // Capture active file
    const activeFile = (window as any).__activeFileForExecution;
    if (activeFile) {
      state.activeFile = activeFile.fileName;
      console.log(`🎯 Active file: ${state.activeFile}`);
    }

    // Capture project path if available
    const projectPath = (window as any).__currentProjectPath || 
                       (window as any).__workspaceRoot;
    if (projectPath) {
      state.projectPath = projectPath;
      console.log(`📂 Project path: ${state.projectPath}`);
    }

    console.log('📊 Captured IDE state:', {
      files: state.openFiles.length,
      activeFile: state.activeFile,
      hasProject: !!state.projectPath
    });

    return state;
  }

  /**
   * Restore IDE state
   */
  private async restoreIDEState(state: IDEState): Promise<void> {
    console.log(`🔄 Restoring IDE state with ${state.openFiles.length} files...`);

    try {
      // Clear current state first
      this.clearCurrentFiles();

      // Restore window state
      if (state.windowState) {
        this.restoreWindowState(state.windowState);
      }

      // Restore open files
      for (const file of state.openFiles) {
        await this.restoreFile(file);
        // Small delay to prevent overwhelming the UI
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Restore active file last
      if (state.activeFile) {
        await this.setActiveFile(state.activeFile);
      }

      // Restore project path
      if (state.projectPath) {
        (window as any).__currentProjectPath = state.projectPath;
        (window as any).__workspaceRoot = state.projectPath;
        console.log(`📂 Restored project path: ${state.projectPath}`);
        
        // ✅ FIX: Trigger FULL file tree refresh after IDE restore
        // We need to wait for main.ts restoreProject to complete first, then refresh
        setTimeout(() => {
          console.log('📂 Triggering FULL file tree refresh after IDE restore...');
          
          // Method 1: Click the refresh button programmatically (most reliable!)
          const refreshBtn = document.querySelector('.refresh-btn, [title*="Refresh"], .project-header button:last-child, .header-actions button');
          if (refreshBtn) {
            console.log('📂 Found refresh button, clicking it...');
            (refreshBtn as HTMLElement).click();
          } else {
            // Method 2: Use fileTreeIntegration directly if available
            if ((window as any).fileTreeIntegration?.refreshFileTree) {
              console.log('📂 Using fileTreeIntegration.refreshFileTree()...');
              (window as any).fileTreeIntegration.refreshFileTree();
            } else {
              // Method 3: Dispatch refresh event
              console.log('📂 Dispatching file-tree-refresh event...');
              document.dispatchEvent(new CustomEvent('file-tree-refresh'));
            }
          }
        }, 1500); // Wait for main.ts restore to complete
        
        // Retry at 3 seconds if still incomplete
        setTimeout(() => {
          const visibleFiles = document.querySelectorAll('.file-tree .file-item, .file-tree [data-type="file"]').length;
          console.log(`📂 Visible files check at 3s: ${visibleFiles}`);
          
          if (visibleFiles < 10) {
            console.log('📂 Still incomplete, clicking refresh button...');
            const refreshBtn = document.querySelector('.refresh-btn, [title*="Refresh"], .project-header button:last-child');
            if (refreshBtn) {
              (refreshBtn as HTMLElement).click();
            } else {
              document.dispatchEvent(new CustomEvent('file-tree-refresh'));
            }
          }
        }, 3000);
      }

      console.log(`✅ Restored ${state.openFiles.length} files successfully`);

    } catch (error) {
      console.error('❌ Error restoring IDE state:', error);
    }
  }

  /**
   * FIXED: Restore files to the EXACT same location as newly created files
   */
  private async restoreFile(file: PersistedFile): Promise<void> {
    try {
      console.log(`📂 Restoring file to original position: ${file.fileName}`);

      // Get content - try from saved file first, then use cached content
      let content = '';
      
      if (file.savedPath && this.isTauriAvailable()) {
        try {
          content = await this.tauriInvoke('read_file_content', { path: file.savedPath });
          console.log(`📖 Read content from disk: ${file.fileName} (${content.length} chars)`);
        } catch (error) {
          console.warn(`⚠️ Could not read ${file.fileName} from disk:`, error);
          content = file.content || this.generateDefaultContent(file.fileName);
        }
      } else {
        content = file.content || this.generateDefaultContent(file.fileName);
        console.log(`💭 Using cached/default content for: ${file.fileName}`);
      }

      // CRITICAL: Use the SAME method as createFileWithDialog.ts uses
      this.addToSameLocationAsNewFiles(file.fileName, file.savedPath, content);

      // Update global tracking to match new file creation
      if (file.savedPath) {
        this.updateGlobalFileTracking(file.fileName, file.savedPath);
      }

      console.log(`✅ File restored to original position: ${file.fileName}`);

    } catch (error) {
      console.error(`❌ Failed to restore file ${file.fileName}:`, error);
    }
  }

  /**
   * CRITICAL: Add file to EXACT same location as createFileWithDialog.ts does
   */
  private addToSameLocationAsNewFiles(fileName: string, savedPath?: string, content: string = ''): void {
    console.log(`📁 Adding file to SAME location as new files: ${fileName}`);
    
    // STEP 1: Try using the EXACT same API that createFileWithDialog.ts uses
    if ((window as any).fileExplorerAPI?.addFile) {
      console.log(`🔧 Using fileExplorerAPI.addFile (same as new files): ${fileName}`);
      (window as any).fileExplorerAPI.addFile(fileName, savedPath, content);
      return;
    }

    // STEP 2: If that's not available, use the addToFileExplorerWithMetadata function directly
    if ((window as any).__createFileDebug?.addToFileExplorer) {
      console.log(`🔧 Using createFileDebug.addToFileExplorer: ${fileName}`);
      (window as any).__createFileDebug.addToFileExplorer(fileName, savedPath, content);
      return;
    }

    // STEP 3: Try to call the function that createFileWithDialog.ts uses
    if (typeof (window as any).addToFileExplorerWithMetadata === 'function') {
      console.log(`🔧 Using addToFileExplorerWithMetadata directly: ${fileName}`);
      (window as any).addToFileExplorerWithMetadata(fileName, savedPath, content);
      return;
    }

    // STEP 4: Find the EXACT container that new files go to
    const correctContainer = this.findExactFileContainer();
    
    if (correctContainer) {
      this.addFileToExactContainer(correctContainer, fileName, savedPath, content);
    } else {
      console.error(`❌ Could not find correct container for: ${fileName}`);
      // Last resort fallback
      this.addFileToExplorerFallback(fileName, savedPath, content);
    }
  }

  /**
   * Find the EXACT container where createFileWithDialog.ts adds new files
   */
  private findExactFileContainer(): HTMLElement | null {
    console.log('🔍 Finding EXACT file container used by createFileWithDialog...');
    
    // These are the EXACT selectors that createFileWithDialog.ts uses
    const exactSelectors = [
      '.file-tree',
      '#files-content', 
      '.files-panel',
      '.file-explorer',
      '.explorer-content',
      '.folder-contents',
      '.file-list',
      '.files-container',
      '[data-panel="files"]',
      '[class*="files"]',
      '[id*="files"]',
      '.panel-content',
      '.sidebar-content'
    ];
    
    // Try each selector in the EXACT same order as createFileWithDialog.ts
    for (const selector of exactSelectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && !element.closest('.terminal') && !element.closest('.status-bar')) {
        console.log(`✅ Found EXACT container: ${selector}`);
        return element;
      }
    }
    
    // Use the EXACT fallback logic from createFileWithDialog.ts
    const elements = Array.from(document.querySelectorAll('*'));
    const filesElement = elements.find(el => 
      (el.textContent?.includes('No folder opened') ||
       el.textContent?.includes('FILES') ||
       el.className?.includes('files') ||
       el.id?.includes('files')) &&
      !el.closest('.terminal') &&
      !el.closest('.status-bar')
    ) as HTMLElement;
    
    if (filesElement) {
      console.log('✅ Found container by content search (exact match with createFileWithDialog)');
      return filesElement;
    }
    
    return null;
  }

  /**
   * Add file to the exact container with the SAME structure as new files
   */
  private addFileToExactContainer(container: HTMLElement, fileName: string, savedPath?: string, content: string = ''): void {
    console.log(`📁 Adding to exact container with SAME structure: ${fileName}`);
    
    // STEP 1: Remove "No folder opened" message (EXACT same logic as createFileWithDialog)
    const noFolderMsg = container.querySelector('[class*="no-folder"], [class*="empty"]');
    if (noFolderMsg && noFolderMsg.textContent?.includes('No folder opened')) {
      noFolderMsg.remove();
      console.log('🗑️ Removed "No folder opened" message');
    }
    
    // STEP 2: Find or create files list (EXACT same logic as createFileWithDialog)
    let filesList = container.querySelector('.files-list, .file-container, .folder-contents') as HTMLElement;
    
    if (!filesList) {
      filesList = document.createElement('div');
      filesList.className = 'files-list';
      filesList.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 8px;
      `;
      container.appendChild(filesList);
      console.log('✅ Created files-list with EXACT same structure');
    }
    
    // STEP 3: Check if file already exists and remove it (EXACT same logic)
    const existingFile = filesList.querySelector(`[data-filename="${fileName}"]`);
    if (existingFile) {
      existingFile.remove();
      console.log(`🗑️ Removed existing file: ${fileName}`);
    }
    
    // STEP 4: Create file item with EXACT same structure as createFileWithDialog
    const fileItem = this.createFileItemWithExactStructure(fileName, savedPath, content);
    
    // STEP 5: Add to the TOP of the list (same position as new files)
    if (filesList.children.length === 0) {
      filesList.appendChild(fileItem);
    } else {
      filesList.insertBefore(fileItem, filesList.firstChild);
    }
    
    // STEP 6: Add animation (same as createFileWithDialog)
    fileItem.classList.add('newly-added');
    setTimeout(() => fileItem.classList.remove('newly-added'), 300);
    
    console.log(`✅ Added file with EXACT same structure: ${fileName}`);
  }

  /**
   * Create file item with EXACT same structure as createFileWithDialog.ts
   */
  private createFileItemWithExactStructure(fileName: string, savedPath?: string, content: string = ''): HTMLElement {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.setAttribute('data-filename', fileName);
    
    // Store metadata EXACTLY like createFileWithDialog
    if (savedPath) {
      (fileItem as any)._savedPath = savedPath;
      (fileItem as any)._fileName = fileName;
      (fileItem as any)._isFileOnDisk = !!savedPath;
    }
    
    // Initialize metadata in the global map (EXACT same as createFileWithDialog)
    if ((window as any).__createFileDebug?.fileMetadataMap) {
      const fileMetadataMap = (window as any).__createFileDebug.fileMetadataMap;
      if (!fileMetadataMap.has(fileName)) {
        const metadata = {
          fileName,
          savedPath,
          lastModified: Date.now(),
          originalContent: content,
          isUnsaved: false,
          fileSize: new Blob([content]).size
        };
        fileMetadataMap.set(fileName, metadata);
        console.log(`📋 Added metadata to global map: ${fileName}`);
      }
    }
    
    // Status indicators (EXACT same logic as createFileWithDialog)
    let statusIcon = '';
    let statusColor = '#cccccc';
    let statusText = '';
    let statusClass = '';
    
    if (savedPath) {
      statusIcon = '💾';
      statusColor = '#4CAF50';
      statusText = `Saved to: ${savedPath}`;
      statusClass = 'saved';
    } else {
      statusIcon = '💭';
      statusColor = '#FF9800';
      statusText = 'In memory (not saved)';
      statusClass = 'memory';
    }
    
    fileItem.setAttribute('data-status', statusClass);
    
    // EXACT same styling as createFileWithDialog
    fileItem.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
      font-size: 13px;
      color: ${statusColor};
      border-left: 3px solid transparent;
    `;
    
    // Create timestamp and file size (EXACT same as createFileWithDialog)
    const timestamp = this.formatTimestamp(Date.now());
    const fileSize = this.formatFileSize(new Blob([content]).size);
    
    // EXACT same HTML structure as createFileWithDialog
    fileItem.innerHTML = `
      <span class="file-icon" style="font-size: 14px;">${this.getFileIcon(fileName)}</span>
      <div class="file-info" style="flex: 1; display: flex; flex-direction: column; min-width: 0;">
        <div class="file-name-row" style="display: flex; align-items: center; gap: 4px;">
          <span class="file-name" style="color: ${statusColor};" title="${statusText}">${fileName}</span>
          <span class="unsaved-indicator" style="color: #ff6b6b; font-weight: bold; display: none;">*</span>
        </div>
        <div class="file-meta" style="font-size: 10px; opacity: 0.7; color: #888;">
          <span class="file-timestamp" title="Last modified">${timestamp}</span>
          <span style="margin: 0 4px;">•</span>
          <span class="file-size" title="File size">${fileSize}</span>
        </div>
      </div>
      <span class="file-status" style="font-size: 10px; opacity: 0.7;">${statusIcon}</span>
    `;
    
    // EXACT same event handlers as createFileWithDialog
    this.setupExactEventHandlers(fileItem, fileName, savedPath);
    
    return fileItem;
  }

  /**
   * Setup EXACT same event handlers as createFileWithDialog.ts
   */
  private setupExactEventHandlers(fileItem: HTMLElement, fileName: string, savedPath?: string): void {
    // Mouse enter/leave (EXACT same as createFileWithDialog)
    fileItem.addEventListener('mouseenter', () => {
      fileItem.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      fileItem.style.borderLeftColor = savedPath ? '#4CAF50' : '#FF9800';
    });
    
    fileItem.addEventListener('mouseleave', () => {
      fileItem.style.backgroundColor = 'transparent';
      fileItem.style.borderLeftColor = 'transparent';
    });
    
    // EXACT same click handling as createFileWithDialog
    let clickTimeout: number | null = null;
    
    fileItem.addEventListener('click', () => {
      if (clickTimeout) {
        // Double-click detected (EXACT same logic)
        clearTimeout(clickTimeout);
        clickTimeout = null;
        this.handleFileDoubleClick(fileName, savedPath);
      } else {
        // Single click - set a timeout (EXACT same timing)
        clickTimeout = window.setTimeout(() => {
          clickTimeout = null;
          this.handleFileSingleClick(fileName, savedPath);
        }, 250); // EXACT same delay as createFileWithDialog
      }
    });
    
    // Right-click context menu (EXACT same as createFileWithDialog)
    fileItem.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showFileContextMenu(e, fileName, savedPath);
    });
  }

  /**
   * Handle single click EXACTLY like createFileWithDialog.ts
   */
  private handleFileSingleClick(fileName: string, savedPath?: string): void {
    console.log(`👆 Single click (exact handler): ${fileName}`);
    
    // Remove active class from all file items (EXACT same logic)
    document.querySelectorAll('.file-item').forEach(item => item.classList.remove('active'));
    
    // Add active class to clicked file (EXACT same logic)
    const fileItem = document.querySelector(`[data-filename="${fileName}"]`);
    if (fileItem) {
      fileItem.classList.add('active');
    }
    
    // Set as active file for execution (EXACT same as createFileWithDialog)
    (window as any).__activeFileForExecution = {
      fileName,
      savedPath,
      timestamp: Date.now()
    };
    
    console.log(`✅ File selected (exact method): ${fileName}`);
  }

  /**
   * Handle double click EXACTLY like createFileWithDialog.ts
   */
  private handleFileDoubleClick(fileName: string, savedPath?: string): void {
    console.log(`👆👆 Double click (exact handler): ${fileName} - opening...`);
    
    // First, select the file (EXACT same as createFileWithDialog)
    this.handleFileSingleClick(fileName, savedPath);
    
    // Then open it using EXACT same method as createFileWithDialog
    if ((window as any).__createFileDebug?.openFileInEditor) {
      (window as any).__createFileDebug.openFileInEditor(fileName, savedPath);
      console.log(`✅ Opened using EXACT method from createFileWithDialog: ${fileName}`);
    } else {
      // Fallback to our enhanced method
      this.openFileInEditorEnhanced(fileName, savedPath);
    }
  }

  /**
   * Set active file after restoration
   */
  private async setActiveFile(fileName: string): Promise<void> {
    try {
      // Wait a bit more for files to be fully restored
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`🎯 Setting active file: ${fileName}`);

      // Find the file item and activate it
      const fileItem = document.querySelector(`[data-filename="${fileName}"]`);
      if (fileItem) {
        console.log(`✅ Found file item for: ${fileName}`);
        
        // Remove active from all files
        document.querySelectorAll('.file-item').forEach(item => 
          item.classList.remove('active')
        );
        
        // Set this file as active
        fileItem.classList.add('active');
        
        // Set global active file
        const savedPath = this.getFilePathFromGlobalState(fileName);
        (window as any).__activeFileForExecution = {
          fileName,
          savedPath,
          timestamp: Date.now()
        };
        
        // Try to open in editor - use multiple methods
        await this.openFileInEditor(fileName, savedPath);

        console.log(`✅ Set active file: ${fileName}`);
      } else {
        console.warn(`⚠️ Could not find file item for: ${fileName}`);
      }
    } catch (error) {
      console.error(`❌ Failed to set active file ${fileName}:`, error);
    }
  }

  /**
   * Open file in editor with multiple fallback methods
   */
  private async openFileInEditor(fileName: string, savedPath?: string): Promise<void> {
    console.log(`📂 Opening file in editor: ${fileName}`);
    
    try {
      // Method 1: Use fileExplorerAPI
      if ((window as any).fileExplorerAPI?.openFile) {
        (window as any).fileExplorerAPI.openFile(fileName, savedPath);
        console.log(`✅ Opened via fileExplorerAPI: ${fileName}`);
        return;
      }
      
      // Method 2: Use createFileDebug API
      if ((window as any).__createFileDebug?.openFileInEditor) {
        (window as any).__createFileDebug.openFileInEditor(fileName, savedPath);
        console.log(`✅ Opened via createFileDebug: ${fileName}`);
        return;
      }
      
      // Method 3: Trigger double-click event
      const fileItem = document.querySelector(`[data-filename="${fileName}"]`);
      if (fileItem) {
        const dblClickEvent = new MouseEvent('dblclick', { 
          bubbles: true, 
          cancelable: true 
        });
        fileItem.dispatchEvent(dblClickEvent);
        console.log(`✅ Triggered double-click event for: ${fileName}`);
        return;
      }
      
      console.warn(`⚠️ Could not open file: ${fileName}`);
      
    } catch (error) {
      console.error(`❌ Error opening file in editor: ${error}`);
    }
  }

  /**
   * Enhanced open file in editor method
   */
  private async openFileInEditorEnhanced(fileName: string, savedPath?: string, content: string = ''): Promise<void> {
    console.log(`📂 Opening file in editor (enhanced): ${fileName}`);
    
    try {
      // Method 1: Use existing createFileWithDialog API
      if ((window as any).__createFileDebug?.openFileInEditor) {
        console.log(`🔧 Trying createFileDebug.openFileInEditor for: ${fileName}`);
        (window as any).__createFileDebug.openFileInEditor(fileName, savedPath);
        return;
      }
      
      // Method 2: Use fileExplorerAPI
      if ((window as any).fileExplorerAPI?.openFile) {
        console.log(`🔧 Trying fileExplorerAPI.openFile for: ${fileName}`);
        (window as any).fileExplorerAPI.openFile(fileName, savedPath);
        return;
      }
      
      // Method 3: Try tab manager directly
      const tabManager = (window as any).tabManager;
      if (tabManager && typeof tabManager.addTab === 'function') {
        console.log(`🔧 Trying tabManager.addTab for: ${fileName}`);
        
        // Get content if available
        let fileContent = content;
        if (!fileContent && savedPath && this.isTauriAvailable()) {
          try {
            fileContent = await this.tauriInvoke('read_file_content', { path: savedPath });
          } catch (error) {
            fileContent = this.generateDefaultContent(fileName);
          }
        }
        
        if (!fileContent) {
          fileContent = this.generateDefaultContent(fileName);
        }
        
        const tabId = tabManager.addTab(savedPath || fileName, fileContent);
        if (tabManager.setActiveTab) {
          tabManager.setActiveTab(tabId);
        }
        
        console.log(`✅ Opened in tab manager: ${fileName} (${tabId})`);
        return;
      }
      
      console.error(`❌ No method available to open file: ${fileName}`);
      
    } catch (error) {
      console.error(`❌ Error opening file in editor: ${error}`);
    }
  }

  /**
   * SAFE Save via Tauri (desktop)
   */
  private async saveViaTauri(state: IDEState): Promise<boolean> {
    if (!this.isTauriAvailable()) {
      return false;
    }

    try {
      const stateJson = JSON.stringify(state, null, 2);
      
      await this.tauriInvoke('write_state_file', {
        filename: PersistenceManager.STATE_FILE,
        content: stateJson
      });
      
      console.log('💾 State saved via Tauri');
      return true;
      
    } catch (error) {
      console.warn('⚠️ Tauri state save failed:', error);
      return false;
    }
  }

  /**
   * SAFE Load via Tauri (desktop)
   */
  private async loadViaTauri(): Promise<IDEState | null> {
    if (!this.isTauriAvailable()) {
      return null;
    }

    try {
      const stateJson = await this.tauriInvoke('read_state_file', {
        filename: PersistenceManager.STATE_FILE
      });
      
      if (stateJson) {
        console.log('📂 State loaded via Tauri');
        return JSON.parse(stateJson as string);
      }
      
    } catch (error) {
      console.warn('⚠️ Tauri state load failed:', error);
    }

    return null;
  }

  /**
   * Save via localStorage (web)
   */
  private async saveViaLocalStorage(state: IDEState): Promise<boolean> {
    try {
      const stateJson = JSON.stringify(state);
      localStorage.setItem(PersistenceManager.STATE_KEY, stateJson);
      console.log('💾 State saved via localStorage');
      return true;
    } catch (error) {
      console.warn('⚠️ localStorage save failed:', error);
      return false;
    }
  }

  /**
   * Load via localStorage (web)
   */
  private async loadViaLocalStorage(): Promise<IDEState | null> {
    try {
      const stateJson = localStorage.getItem(PersistenceManager.STATE_KEY);
      if (stateJson) {
        console.log('📂 State loaded via localStorage');
        return JSON.parse(stateJson);
      }
    } catch (error) {
      console.warn('⚠️ localStorage load failed:', error);
    }
    return null;
  }

  /**
   * Validate loaded state
   */
  private validateState(state: any): boolean {
    const isValid = state && 
           typeof state === 'object' &&
           state.version &&
           state.timestamp &&
           Array.isArray(state.openFiles);
           
    if (!isValid) {
      console.warn('⚠️ Invalid state detected:', state);
    }
    
    return isValid;
  }

  /**
   * IMPROVED: Clear current files but preserve the correct structure
   */
  private clearCurrentFiles(): void {
    console.log('🧹 Clearing current files while preserving structure...');
    
    // ONLY remove file items, NOT the container structure
    const fileItems = document.querySelectorAll('.file-item[data-filename]');
    console.log(`🗑️ Removing ${fileItems.length} existing file items`);
    
    fileItems.forEach(item => {
      // Only remove if it's actually a file item (not something else)
      if (item.classList.contains('file-item') && item.getAttribute('data-filename')) {
        item.remove();
      }
    });

    // Clear global state
    (window as any).__activeFileForExecution = null;
    if ((window as any).__allSavedFiles) {
      (window as any).__allSavedFiles = [];
    }

    // Clear file metadata map if available  
    if ((window as any).__createFileDebug?.fileMetadataMap) {
      (window as any).__createFileDebug.fileMetadataMap.clear();
    }
    
    console.log('✅ Current files cleared, structure preserved');
  }

  /**
   * Restore window state
   */
  private restoreWindowState(windowState: IDEState['windowState']): void {
    if (!windowState) return;

    try {
      console.log('🪟 Restoring window state:', windowState);
      
      // Restore sidebar visibility
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        if (windowState.sidebarVisible) {
          sidebar.classList.remove('hidden');
        } else {
          sidebar.classList.add('hidden');
        }
      }

      // Restore terminal visibility
      const terminal = document.querySelector('.terminal');
      if (terminal) {
        if (windowState.terminalVisible) {
          terminal.classList.remove('hidden');
        } else {
          terminal.classList.add('hidden');
        }
      }

      // Restore explorer expansion
      const explorer = document.querySelector('.file-explorer');
      if (explorer) {
        if (windowState.explorerExpanded) {
          explorer.classList.remove('collapsed');
        } else {
          explorer.classList.add('collapsed');
        }
      }

    } catch (error) {
      console.warn('⚠️ Failed to restore window state:', error);
    }
  }

  /**
   * Setup auto-save on important events
   */
  private setupAutoSave(): void {
    console.log('🔄 Setting up auto-save listeners...');
    
    // Save on file operations
    document.addEventListener('file-created', (e) => {
      console.log('📝 File created event detected');
      this.debouncedSave();
    });
    
    document.addEventListener('file-opened', (e) => {
      console.log('📂 File opened event detected');
      this.debouncedSave();
    });
    
    document.addEventListener('file-closed', (e) => {
      console.log('❌ File closed event detected');
      this.debouncedSave();
    });
    
    document.addEventListener('file-saved', (e) => {
      console.log('💾 File saved event detected');
      this.debouncedSave();
    });

    // Save on window events
    window.addEventListener('beforeunload', () => {
      // Synchronous save for page unload
      try {
        const state = this.captureCurrentState();
        const stateJson = JSON.stringify(state);
        localStorage.setItem(PersistenceManager.STATE_KEY, stateJson);
        console.log('💾 Emergency save on page unload');
      } catch (error) {
        console.warn('⚠️ Failed to save state on unload:', error);
      }
    });

    // Save periodically (every 30 seconds)
    setInterval(() => {
      if (this.initialized) {
        this.saveState();
      }
    }, 30000);

    // Save when tab/window becomes hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.initialized) {
        this.saveState();
      }
    });
    
    console.log('✅ Auto-save listeners configured');
  }

  /**
   * Debounced save to avoid too frequent saves
   */
  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = window.setTimeout(() => {
      this.saveState();
      this.saveTimeout = null;
    }, 1000); // Save 1 second after last change
  }

  /**
   * Show context menu for file operations
   */
  private showFileContextMenu(event: MouseEvent, fileName: string, savedPath?: string): void {
    // Remove existing context menu
    const existingMenu = document.querySelector('.file-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
    
    const contextMenu = document.createElement('div');
    contextMenu.className = 'file-context-menu';
    contextMenu.style.cssText = `
      position: fixed;
      top: ${event.clientY}px;
      left: ${event.clientX}px;
      background: #2d2d2d;
      border: 1px solid #404040;
      border-radius: 4px;
      padding: 4px 0;
      min-width: 150px;
      z-index: 10000;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    `;
    
    const menuItems = [
      { text: '📂 Open', action: () => this.openFileInEditorEnhanced(fileName, savedPath) },
      { text: '▶️ Run File', action: () => this.runFile(fileName, savedPath) },
      { text: '📋 Copy Path', action: () => this.copyToClipboard(savedPath || fileName) },
      { text: '🗑️ Remove from List', action: () => this.removeFileFromList(fileName), danger: true }
    ];
    
    menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.className = `menu-item${item.danger ? ' danger' : ''}`;
      menuItem.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        color: ${item.danger ? '#f48771' : '#cccccc'};
        font-size: 13px;
        transition: background-color 0.2s;
      `;
      menuItem.textContent = item.text;
      
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.backgroundColor = item.danger 
          ? 'rgba(244, 135, 113, 0.1)' 
          : 'rgba(255, 255, 255, 0.1)';
      });
      
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.backgroundColor = 'transparent';
      });
      
      menuItem.addEventListener('click', () => {
        item.action();
        contextMenu.remove();
      });
      
      contextMenu.appendChild(menuItem);
    });
    
    document.body.appendChild(contextMenu);
    
    // Remove on click outside
    setTimeout(() => {
      document.addEventListener('click', function removeMenu() {
        contextMenu.remove();
        document.removeEventListener('click', removeMenu);
      });
    }, 100);
  }

  /**
   * Fallback file explorer method
   */
  private addFileToExplorerFallback(fileName: string, savedPath?: string, content: string = ''): void {
    console.log(`📁 Adding file to explorer (fallback): ${fileName}`);
    
    // Find or create file explorer container
    let fileExplorer = document.querySelector('.files-list');
    
    if (!fileExplorer) {
      // Try to find parent containers and create files-list
      const possibleParents = [
        '.file-explorer',
        '.files-panel', 
        '.explorer-content',
        '.sidebar'
      ];
      
      for (const parentSelector of possibleParents) {
        const parent = document.querySelector(parentSelector);
        if (parent) {
          fileExplorer = document.createElement('div');
          fileExplorer.className = 'files-list';
          fileExplorer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: 8px;
          `;
          parent.appendChild(fileExplorer);
          console.log(`✅ Created files-list in ${parentSelector}`);
          break;
        }
      }
    }
    
    if (!fileExplorer) {
      console.warn('⚠️ Could not find or create file explorer');
      return;
    }

    // Remove existing file item if present
    const existingItem = fileExplorer.querySelector(`[data-filename="${fileName}"]`);
    if (existingItem) {
      existingItem.remove();
    }

    // Create file item
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.setAttribute('data-filename', fileName);
    
    // Store metadata
    if (savedPath) {
      (fileItem as any)._savedPath = savedPath;
    }
    
    fileItem.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
      font-size: 13px;
      color: #cccccc;
      border-left: 3px solid transparent;
    `;
    
    const fileIcon = this.getFileIcon(fileName);
    const statusIcon = savedPath ? '💾' : '💭';
    
    fileItem.innerHTML = `
      <span class="file-icon" style="font-size: 14px;">${fileIcon}</span>
      <div class="file-info" style="flex: 1; min-width: 0;">
        <span class="file-name" style="color: ${savedPath ? '#4CAF50' : '#FF9800'};">${fileName}</span>
      </div>
      <span class="file-status" style="font-size: 10px; opacity: 0.7;">${statusIcon}</span>
    `;

    // Add event handlers
    this.setupExactEventHandlers(fileItem, fileName, savedPath);

    fileExplorer.appendChild(fileItem);
    console.log(`✅ Added file to explorer: ${fileName}`);
  }

  /**
   * Helper functions
   */
  private getFilePathFromGlobalState(fileName: string): string | undefined {
    // Check various global sources for file path
    const allSavedFiles = (window as any).__allSavedFiles || [];
    const savedFile = allSavedFiles.find((f: any) => f.fileName === fileName);
    if (savedFile?.savedPath) return savedFile.savedPath;

    const metadata = (window as any).__createFileDebug?.fileMetadataMap?.get(fileName);
    if (metadata?.savedPath) return metadata.savedPath;

    return undefined;
  }

  private getFileSizeFromMetadata(fileName: string): number | undefined {
    const metadata = (window as any).__createFileDebug?.fileMetadataMap?.get(fileName);
    return metadata?.fileSize;
  }

  private updateGlobalFileTracking(fileName: string, savedPath: string): void {
    // Update global saved files array
    if (!(window as any).__allSavedFiles) {
      (window as any).__allSavedFiles = [];
    }

    const allSavedFiles = (window as any).__allSavedFiles;
    const existingIndex = allSavedFiles.findIndex((f: any) => f.fileName === fileName);
    
    const fileRecord = {
      fileName,
      savedPath,
      timestamp: Date.now()
    };

    if (existingIndex >= 0) {
      allSavedFiles[existingIndex] = fileRecord;
    } else {
      allSavedFiles.push(fileRecord);
    }
  }

  private generateDefaultContent(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const timestamp = new Date().toISOString();
    
    const templates: Record<string, string> = {
      'py': `# ${fileName}\n# Created at ${timestamp}\n\nprint('Hello from ${fileName}!')\n\ndef main():\n    pass\n\nif __name__ == '__main__':\n    main()\n`,
      'js': `// ${fileName}\n// Created at ${timestamp}\n\nconsole.log('Hello from ${fileName}!');\n\n// Your JavaScript code here\n`,
      'ts': `// ${fileName}\n// Created at ${timestamp}\n\nconsole.log('Hello from ${fileName}!');\n\n// Your TypeScript code here\nfunction main(): void {\n    // Code here\n}\n\nmain();\n`,
      'html': `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>${fileName.replace('.html', '')}</title>\n</head>\n<body>\n    <h1>Hello from ${fileName}!</h1>\n    <!-- Your HTML content here -->\n</body>\n</html>\n`,
      'css': `/* ${fileName} */\n/* Created at ${timestamp} */\n\nbody {\n    font-family: Arial, sans-serif;\n    margin: 0;\n    padding: 20px;\n}\n\n/* Your CSS styles here */\n`,
      'json': `{\n  "name": "${fileName.replace('.json', '')}",\n  "version": "1.0.0",\n  "description": "Created at ${timestamp}",\n  "main": "index.js"\n}\n`
    };
    return templates[extension] || `// ${fileName}\n// Created at ${timestamp}\n\n// Your code here\n`;
  }

  private getLanguageFromFileName(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'md': 'markdown',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'sql': 'sql',
      'sh': 'shell'
    };
    return languageMap[extension] || 'plaintext';
  }

  private getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const icons: Record<string, string> = {
      'js': '📜',
      'jsx': '📜', 
      'ts': '📘',
      'tsx': '📘',
      'py': '🐍',
      'html': '🌐',
      'css': '🎨',
      'scss': '🎨',
      'json': '📋',
      'md': '📝',
      'java': '☕',
      'cpp': '⚙️',
      'c': '⚙️',
      'php': '🐘',
      'rb': '💎',
      'go': '🐹',
      'rs': '🦀',
      'txt': '📄'
    };
    return icons[extension] || '📄';
  }

  private formatTimestamp(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private runFile(fileName: string, savedPath?: string): void {
    console.log(`▶️ Running file: ${fileName}`);
    
    // Set as active file
    (window as any).__activeFileForExecution = {
      fileName,
      savedPath,
      timestamp: Date.now()
    };
    
    // Try to run using existing run functionality
    if ((window as any).__createFileDebug?.runCurrentFile) {
      (window as any).__createFileDebug.runCurrentFile();
    } else {
      console.warn('⚠️ No run functionality available');
    }
  }

  private copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log('📋 Path copied to clipboard');
    }).catch(() => {
      console.error('❌ Failed to copy path');
    });
  }

  private removeFileFromList(fileName: string): void {
    const fileItem = document.querySelector(`[data-filename="${fileName}"]`);
    if (fileItem) {
      fileItem.remove();
      console.log(`🗑️ Removed ${fileName} from file list`);
      
      // Also remove from global tracking
      const allSavedFiles = (window as any).__allSavedFiles || [];
      const index = allSavedFiles.findIndex((f: any) => f.fileName === fileName);
      if (index > -1) {
        allSavedFiles.splice(index, 1);
      }
      
      // Trigger save to update persistent state
      this.debouncedSave();
    }
  }

  /**
   * Manual save trigger
   */
  public async forceSave(): Promise<void> {
    console.log('🔄 Force saving state...');
    await this.saveState();
  }

  /**
   * Manual restore trigger
   */
  public async forceRestore(): Promise<void> {
    console.log('🔄 Force restoring state...');
    const state = await this.loadState();
    if (state) {
      await this.restoreIDEState(state);
    } else {
      console.log('ℹ️ No state to restore');
    }
  }

  /**
   * Clear all saved state
   */
  public async clearState(): Promise<void> {
    try {
      console.log('🗑️ Clearing all saved state...');
      
      // Clear localStorage
      localStorage.removeItem(PersistenceManager.STATE_KEY);
      
      // Clear Tauri state file if available
      if (this.isTauriAvailable()) {
        try {
          await this.tauriInvoke('delete_state_file', {
            filename: PersistenceManager.STATE_FILE
          });
          console.log('🗑️ Tauri state file deleted');
        } catch (error) {
          console.warn('⚠️ Could not delete Tauri state file:', error);
        }
      }
      
      console.log('✅ All saved state cleared');
    } catch (error) {
      console.error('❌ Error clearing state:', error);
    }
  }

  /**
   * Get current state for debugging
   */
  public getCurrentState(): IDEState {
    return this.captureCurrentState();
  }

  /**
   * Get debug information
   */
  public getDebugInfo(): any {
    return {
      initialized: this.initialized,
      tauriAvailable: this.isTauriAvailable(),
      hasTimeout: !!this.saveTimeout,
      localStorage: !!localStorage.getItem(PersistenceManager.STATE_KEY),
      currentFiles: document.querySelectorAll('.file-item[data-filename]').length,
      version: PersistenceManager.VERSION
    };
  }
}

// Create global instance
const persistenceManager = new PersistenceManager();

// Export for use in other modules
export default persistenceManager;
export { PersistenceManager, type IDEState, type PersistedFile };

// Make available globally for debugging and manual control
(window as any).__persistenceManager = persistenceManager;

// Integration hooks for your existing file operations
export function notifyFileOperation(operation: string, fileName: string): void {
  console.log(`🔔 File operation notification: ${operation} - ${fileName}`);
  
  // Dispatch custom events that the persistence manager listens to
  const event = new CustomEvent(`file-${operation}`, {
    detail: { fileName, timestamp: Date.now() }
  });
  document.dispatchEvent(event);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      persistenceManager.initialize();
    }, 1000); // Small delay to ensure other systems are ready
  });
} else {
  setTimeout(() => {
    persistenceManager.initialize();
  }, 1000);
}

console.log('💾 IDE Persistence Manager loaded - your files will survive refreshes! 🔄✨');