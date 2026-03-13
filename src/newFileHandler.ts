// newFileHandler.ts - Enhanced New File creation with file explorer integration
// Creates file and immediately shows it in the explorer

export class NewFileHandler {
  private currentPath: string = '';
  
  public init(): void {
    console.log('[NewFile] Initializing enhanced new file handler...');
    
    // Track current folder path
    this.setupPathTracking();
    
    // Override Ctrl+N shortcut
    this.setupKeyboardShortcut();
    
    // Hook into existing New File menu item
    this.hookMenuItems();
    
    console.log('[NewFile] ✅ Ready! Press Ctrl+N or use File → New File');
  }
  
  /**
   * Track current folder path from various sources
   */
  private setupPathTracking(): void {
    // Get initial path
    this.updateCurrentPath();
    
    // Listen for folder changes
    document.addEventListener('project-opened', (e: any) => {
      if (e.detail?.path) {
        this.currentPath = e.detail.path;
        console.log('[NewFile] Project path updated:', this.currentPath);
      }
    });
    
    document.addEventListener('folder-opened', (e: any) => {
      if (e.detail?.path) {
        this.currentPath = e.detail.path;
      }
    });
    
    // Check for path updates periodically
    setInterval(() => this.updateCurrentPath(), 2000);
  }
  
  private updateCurrentPath(): void {
    // ✅ FIX: Check ALL project path sources, prioritize current open project
    this.currentPath =
      (window as any).currentFolderPath ||
      (window as any).currentProjectPath ||
      (window as any).__currentProjectPath ||
      (window as any).__currentFolderPath ||
      (window as any).__workspaceRoot ||
      localStorage.getItem('currentProjectPath') ||
      localStorage.getItem('ide_last_project_path') ||
      localStorage.getItem('lastOpenedFolder') ||
      (window as any).fileSystem?.getCurrentFolderRoot?.() ||
      '';
  }
  
  /**
   * Setup Ctrl+N keyboard shortcut
   */
  private setupKeyboardShortcut(): void {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'n' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        this.showNewFileDialog();
      }
    }, true); // Use capture to intercept before other handlers
  }
  
  /**
   * Hook into existing menu items
   */
  private hookMenuItems(): void {
    // Find and override New File menu items
    const observer = new MutationObserver(() => {
      const menuItems = document.querySelectorAll('.menu-item, .dropdown-item, [data-action="new-file"]');
      menuItems.forEach(item => {
        if (item.textContent?.includes('New File') && !item.hasAttribute('data-newfile-hooked')) {
          item.setAttribute('data-newfile-hooked', 'true');
          item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showNewFileDialog();
            // Close menu
            document.querySelectorAll('.menu-dropdown, .dropdown-menu').forEach(m => {
              (m as HTMLElement).style.display = 'none';
            });
          }, true);
        }
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Initial hook
    setTimeout(() => {
      document.querySelectorAll('.menu-item, .dropdown-item').forEach(item => {
        if (item.textContent?.includes('New File') && !item.hasAttribute('data-newfile-hooked')) {
          item.setAttribute('data-newfile-hooked', 'true');
          item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showNewFileDialog();
          }, true);
        }
      });
    }, 1000);
  }
  
  /**
   * Show new file dialog with folder selection
   */
  public async showNewFileDialog(targetFolder?: string): Promise<void> {
    // ✅ FIX: Resolve project path with correct priority
    // __currentProjectPath is most reliable (set by project creation & file explorer)
    // currentFolderPath can be stale/wrong (e.g. Documents), check it LAST
    this.updateCurrentPath();
    const folder = targetFolder
      || (window as any).__currentProjectPath
      || localStorage.getItem('lastOpenedFolder')
      || localStorage.getItem('currentProjectPath')
      || (window as any).currentProjectPath
      || localStorage.getItem('ide_last_project_path')
      || (window as any).__currentFolderPath
      || (window as any).currentFolderPath
      || this.currentPath
      || '';
    console.log('[NewFolder] Resolved path:', folder);
    
    if (!folder) {
      this.showNotification('Please open a folder first', 'warning');
      return;
    }
    
    // Get all folders in project
    const folders = await this.getProjectFolders(folder);
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'new-file-modal';
    modal.innerHTML = `
      <div class="new-file-modal-backdrop"></div>
      <div class="new-file-modal-content">
        <div class="new-file-modal-header">
          <span class="new-file-icon">📄</span>
          <h3>Create New File</h3>
          <button class="btn-multi-mode" title="Switch to Multi-File Mode">+ Multi</button>
        </div>
        <div class="new-file-modal-body">
          <label>File name:</label>
          <input type="text" class="new-file-input" placeholder="example.ts" autofocus />
          
          <label style="margin-top: 16px;">Location:</label>
          <div class="folder-selector">
            <select class="folder-select">
              ${folders.map(f => `
                <option value="${f.path}" ${f.path === folder ? 'selected' : ''}>
                  ${f.indent}📁 ${f.name}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="new-file-path">
            <span class="path-label">Full path:</span>
            <span class="path-value">${folder}</span>
          </div>
          
          <div class="new-file-templates">
            <span class="templates-label">Quick templates:</span>
            <div class="template-buttons">
              <button data-ext=".ts" title="TypeScript">TS</button>
              <button data-ext=".tsx" title="React TSX">TSX</button>
              <button data-ext=".js" title="JavaScript">JS</button>
              <button data-ext=".css" title="CSS">CSS</button>
              <button data-ext=".html" title="HTML">HTML</button>
              <button data-ext=".json" title="JSON">JSON</button>
              <button data-ext=".md" title="Markdown">MD</button>
            </div>
          </div>
        </div>
        <div class="new-file-modal-footer">
          <button class="btn-cancel">Cancel</button>
          <button class="btn-create">Create File</button>
        </div>
      </div>
    `;
    
    // Add styles
    this.addModalStyles();
    
    document.body.appendChild(modal);
    
    // Focus input
    const input = modal.querySelector('.new-file-input') as HTMLInputElement;
    const folderSelect = modal.querySelector('.folder-select') as HTMLSelectElement;
    const pathValue = modal.querySelector('.path-value') as HTMLElement;
    
    setTimeout(() => input?.focus(), 50);
    
    // Multi-mode button
    modal.querySelector('.btn-multi-mode')?.addEventListener('click', () => {
      modal.remove();
      this.showMultiFileDialog(folder, folders);
    });
    
    // Update path preview when folder changes
    folderSelect.addEventListener('change', () => {
      const selectedPath = folderSelect.value;
      pathValue.textContent = selectedPath;
    });
    
    // Template buttons
    modal.querySelectorAll('.template-buttons button').forEach(btn => {
      btn.addEventListener('click', () => {
        const ext = btn.getAttribute('data-ext') || '';
        const currentValue = input.value;
        const baseName = currentValue.replace(/\.[^.]+$/, '') || 'newfile';
        input.value = baseName + ext;
        input.focus();
        input.setSelectionRange(0, baseName.length);
      });
    });
    
    // Cancel button
    modal.querySelector('.btn-cancel')?.addEventListener('click', () => {
      modal.remove();
    });
    
    // Create button
    modal.querySelector('.btn-create')?.addEventListener('click', () => {
      const selectedFolder = folderSelect.value;
      this.createFile(input.value, selectedFolder, modal);
    });
    
    // Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const selectedFolder = folderSelect.value;
        this.createFile(input.value, selectedFolder, modal);
      } else if (e.key === 'Escape') {
        modal.remove();
      }
    });
    
    // Backdrop click
    modal.querySelector('.new-file-modal-backdrop')?.addEventListener('click', () => {
      modal.remove();
    });
  }
  
  /**
   * Show multi-file creation dialog
   */
  private async showMultiFileDialog(
    defaultFolder: string, 
    folders: Array<{name: string, path: string, indent: string}>
  ): Promise<void> {
    const modal = document.createElement('div');
    modal.className = 'new-file-modal multi-file-modal';
    modal.innerHTML = `
      <div class="new-file-modal-backdrop"></div>
      <div class="new-file-modal-content multi-file-content">
        <div class="new-file-modal-header">
          <span class="new-file-icon">📁</span>
          <h3>Create Multiple Files</h3>
          <button class="btn-single-mode" title="Switch to Single File Mode">Single</button>
        </div>
        <div class="new-file-modal-body">
          <div class="multi-file-list">
            <!-- File entries will be added here -->
          </div>
          
          <button class="btn-add-file">+ Add Another File</button>
          
          <div class="new-file-templates" style="margin-top: 16px;">
            <span class="templates-label">Quick add (to selected folder):</span>
            <div class="template-buttons quick-add-buttons">
              <button data-template="component" title="React Component">Component</button>
              <button data-template="page" title="Page with CSS">Page + CSS</button>
              <button data-template="module" title="Module with types">Module + Types</button>
              <button data-template="test" title="Test file">Test</button>
            </div>
          </div>
        </div>
        <div class="new-file-modal-footer">
          <span class="file-count">0 files</span>
          <button class="btn-cancel">Cancel</button>
          <button class="btn-create-all">Create All Files</button>
        </div>
      </div>
    `;
    
    this.addMultiFileStyles();
    document.body.appendChild(modal);
    
    const fileList = modal.querySelector('.multi-file-list') as HTMLElement;
    const fileCountEl = modal.querySelector('.file-count') as HTMLElement;
    let fileEntries: Array<{id: string, name: string, folder: string}> = [];
    let entryId = 0;
    
    // Function to create folder options HTML
    const getFolderOptions = (selectedPath: string) => {
      return folders.map(f => `
        <option value="${f.path}" ${f.path === selectedPath ? 'selected' : ''}>
          ${f.indent}📁 ${f.name}
        </option>
      `).join('');
    };
    
    // Function to add a file entry
    const addFileEntry = (fileName: string = '', folderPath: string = defaultFolder) => {
      const id = `entry-${entryId++}`;
      
      const entry = document.createElement('div');
      entry.className = 'file-entry';
      entry.dataset.id = id;
      entry.innerHTML = `
        <div class="file-entry-row">
          <input type="text" class="file-name-input" placeholder="filename.ts" value="${fileName}" />
          <select class="file-folder-select">
            ${getFolderOptions(folderPath)}
          </select>
          <button class="btn-remove-entry" title="Remove">✕</button>
        </div>
      `;
      
      fileList.appendChild(entry);
      
      // Focus the input
      const input = entry.querySelector('.file-name-input') as HTMLInputElement;
      setTimeout(() => input?.focus(), 50);
      
      // Remove button
      entry.querySelector('.btn-remove-entry')?.addEventListener('click', () => {
        entry.remove();
        fileEntries = fileEntries.filter(e => e.id !== id);
        updateFileCount();
      });
      
      // Track entry
      fileEntries.push({ id, name: fileName, folder: folderPath });
      updateFileCount();
      
      return entry;
    };
    
    // Update file count
    const updateFileCount = () => {
      const count = fileList.querySelectorAll('.file-entry').length;
      fileCountEl.textContent = `${count} file${count !== 1 ? 's' : ''}`;
    };
    
    // Get current entries data
    const getEntriesData = (): Array<{name: string, folder: string}> => {
      const entries: Array<{name: string, folder: string}> = [];
      fileList.querySelectorAll('.file-entry').forEach(entry => {
        const name = (entry.querySelector('.file-name-input') as HTMLInputElement)?.value.trim();
        const folder = (entry.querySelector('.file-folder-select') as HTMLSelectElement)?.value;
        if (name) {
          entries.push({ name, folder });
        }
      });
      return entries;
    };
    
    // Add initial entry
    addFileEntry();
    
    // Add file button
    modal.querySelector('.btn-add-file')?.addEventListener('click', () => {
      addFileEntry();
    });
    
    // Single mode button
    modal.querySelector('.btn-single-mode')?.addEventListener('click', () => {
      modal.remove();
      this.showNewFileDialog(defaultFolder);
    });
    
    // Quick add templates
    modal.querySelectorAll('.quick-add-buttons button').forEach(btn => {
      btn.addEventListener('click', () => {
        const template = btn.getAttribute('data-template');
        const lastEntry = fileList.querySelector('.file-entry:last-child');
        const selectedFolder = (lastEntry?.querySelector('.file-folder-select') as HTMLSelectElement)?.value || defaultFolder;
        
        switch (template) {
          case 'component':
            addFileEntry('Component.tsx', selectedFolder);
            break;
          case 'page':
            addFileEntry('Page.tsx', selectedFolder);
            addFileEntry('Page.css', selectedFolder);
            break;
          case 'module':
            addFileEntry('module.ts', selectedFolder);
            addFileEntry('module.types.ts', selectedFolder);
            break;
          case 'test':
            addFileEntry('component.test.ts', selectedFolder);
            break;
        }
      });
    });
    
    // Cancel button
    modal.querySelector('.btn-cancel')?.addEventListener('click', () => {
      modal.remove();
    });
    
    // Create all button
    modal.querySelector('.btn-create-all')?.addEventListener('click', async () => {
      const entries = getEntriesData();
      if (entries.length === 0) {
        this.showNotification('Please add at least one file', 'warning');
        return;
      }
      
      await this.createMultipleFiles(entries, modal);
    });
    
    // Backdrop click
    modal.querySelector('.new-file-modal-backdrop')?.addEventListener('click', () => {
      modal.remove();
    });
    
    // Keyboard shortcuts
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        modal.remove();
      } else if (e.ctrlKey && e.key === 'Enter') {
        // Ctrl+Enter to create all
        const entries = getEntriesData();
        if (entries.length > 0) {
          this.createMultipleFiles(entries, modal);
        }
      }
    });
  }
  
  /**
   * Create multiple files
   */
  private async createMultipleFiles(
    entries: Array<{name: string, folder: string}>,
    modal: HTMLElement
  ): Promise<void> {
    let successCount = 0;
    let failCount = 0;
    
    for (const entry of entries) {
      try {
        const separator = entry.folder.includes('/') ? '/' : '\\';
        const fullPath = `${entry.folder}${separator}${entry.name}`;
        const content = this.getTemplateContent(entry.name);
        
        const invoke = (window as any).__TAURI__?.core?.invoke;
        
        if (invoke) {
          await invoke('create_file', { path: fullPath, content });
        } else {
          const fileSystem = (window as any).fileSystem;
          if (fileSystem?.createFile) {
            await fileSystem.createFile(fullPath, content);
          }
        }
        
        console.log(`[NewFile] ✅ Created: ${fullPath}`);
        successCount++;
      } catch (err) {
        console.error(`[NewFile] ❌ Failed to create ${entry.name}:`, err);
        failCount++;
      }
    }
    
    // Close modal
    modal.remove();
    
    // Show result
    if (failCount === 0) {
      this.showNotification(`✅ Created ${successCount} file${successCount !== 1 ? 's' : ''}`, 'success');
    } else {
      this.showNotification(`Created ${successCount}, failed ${failCount}`, 'warning');
    }
    
    // Refresh file explorer
    await this.refreshFileExplorer(entries[0]?.folder || '');
    
    // Open first file
    if (successCount > 0) {
      const firstEntry = entries[0];
      const separator = firstEntry.folder.includes('/') ? '/' : '\\';
      const firstPath = `${firstEntry.folder}${separator}${firstEntry.name}`;
      setTimeout(() => this.openFileInEditor(firstPath), 300);
    }
  }
  
  /**
   * Add multi-file modal styles
   */
  private addMultiFileStyles(): void {
    if (document.getElementById('multi-file-modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'multi-file-modal-styles';
    style.textContent = `
      .multi-file-content {
        width: 550px;
        max-height: 80vh;
      }
      
      .multi-file-modal .new-file-modal-body {
        max-height: 50vh;
        overflow-y: auto;
      }
      
      .multi-file-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 12px;
      }
      
      .file-entry {
        animation: entryIn 0.2s ease;
      }
      
      @keyframes entryIn {
        from {
          opacity: 0;
          transform: translateX(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      .file-entry-row {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      
      .file-name-input {
        flex: 1;
        min-width: 150px;
        padding: 8px 10px;
        background: #2d2d2d;
        border: 1px solid #4c4c4c;
        border-radius: 4px;
        color: #fff;
        font-size: 13px;
        outline: none;
      }
      
      .file-name-input:focus {
        border-color: #007acc;
      }
      
      .file-folder-select {
        flex: 1.5;
        padding: 8px 10px;
        background: #2d2d2d;
        border: 1px solid #4c4c4c;
        border-radius: 4px;
        color: #fff;
        font-size: 12px;
        outline: none;
        cursor: pointer;
      }
      
      .file-folder-select:focus {
        border-color: #007acc;
      }
      
      .btn-remove-entry {
        width: 28px;
        height: 28px;
        padding: 0;
        background: transparent;
        border: 1px solid #4c4c4c;
        border-radius: 4px;
        color: #888;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }
      
      .btn-remove-entry:hover {
        background: #ff4444;
        border-color: #ff4444;
        color: #fff;
      }
      
      .btn-add-file {
        width: 100%;
        padding: 10px;
        background: transparent;
        border: 1px dashed #4c4c4c;
        border-radius: 6px;
        color: #888;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.15s;
      }
      
      .btn-add-file:hover {
        border-color: #007acc;
        color: #007acc;
        background: rgba(0, 122, 204, 0.1);
      }
      
      .quick-add-buttons button {
        padding: 6px 12px;
        font-size: 11px;
      }
      
      .btn-multi-mode,
      .btn-single-mode {
        margin-left: auto;
        padding: 4px 10px;
        background: #333;
        border: 1px solid #4c4c4c;
        border-radius: 4px;
        color: #aaa;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s;
      }
      
      .btn-multi-mode:hover,
      .btn-single-mode:hover {
        background: #007acc;
        border-color: #007acc;
        color: #fff;
      }
      
      .file-count {
        color: #888;
        font-size: 12px;
        margin-right: auto;
      }
      
      .btn-create-all {
        background: #007acc;
        border: none;
        color: #fff;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;
      }
      
      .btn-create-all:hover {
        background: #0098ff;
      }
    `;
    document.head.appendChild(style);
  }
  
  /**
   * Get all folders in project (recursive)
   */
  private async getProjectFolders(rootPath: string): Promise<Array<{name: string, path: string, indent: string}>> {
    const folders: Array<{name: string, path: string, indent: string, depth: number}> = [];
    
    // Add root folder first
    const rootName = rootPath.split(/[/\\]/).pop() || 'Project';
    folders.push({
      name: `${rootName} (root)`,
      path: rootPath,
      indent: '',
      depth: 0
    });
    
    try {
      const invoke = (window as any).__TAURI__?.core?.invoke;
      
      if (invoke) {
        // Use Tauri to get folders recursively
        await this.scanFoldersRecursive(invoke, rootPath, folders, 1);
      } else {
        // Fallback: scan DOM for folder elements
        const folderElements = document.querySelectorAll('.file-item.folder-item[data-path], .file-item.directory[data-path]');
        folderElements.forEach(el => {
          const path = el.getAttribute('data-path') || '';
          if (path && path !== rootPath && path.startsWith(rootPath)) {
            const name = path.split(/[/\\]/).pop() || '';
            const depth = (path.split(rootPath)[1]?.match(/[/\\]/g) || []).length;
            folders.push({
              name,
              path,
              indent: '　'.repeat(depth), // Use full-width space for indent
              depth
            });
          }
        });
      }
    } catch (err) {
      console.warn('[NewFile] Error scanning folders:', err);
    }
    
    // Sort by path to maintain hierarchy
    folders.sort((a, b) => a.path.localeCompare(b.path));
    
    return folders;
  }
  
  /**
   * Recursively scan folders using Tauri
   */
  private async scanFoldersRecursive(
    invoke: Function, 
    dirPath: string, 
    folders: Array<{name: string, path: string, indent: string, depth: number}>,
    depth: number,
    maxDepth: number = 5
  ): Promise<void> {
    if (depth > maxDepth) return;
    
    try {
      const items = await invoke('read_directory_detailed', { path: dirPath });
      
      for (const item of items || []) {
        if (item.is_directory) {
          folders.push({
            name: item.name,
            path: item.path,
            indent: '　'.repeat(depth), // Full-width space for visual indent
            depth
          });
          
          // Recursively scan subdirectories
          await this.scanFoldersRecursive(invoke, item.path, folders, depth + 1, maxDepth);
        }
      }
    } catch (err) {
      console.warn(`[NewFile] Error reading ${dirPath}:`, err);
    }
  }
  
  /**
   * Create the file
   */
  private async createFile(fileName: string, folder: string, modal: HTMLElement): Promise<void> {
    if (!fileName.trim()) {
      this.showNotification('Please enter a file name', 'warning');
      return;
    }
    
    // Sanitize filename
    const sanitizedName = fileName.trim().replace(/[<>:"/\\|?*]/g, '');
    
    // Build full path
    const separator = folder.includes('/') ? '/' : '\\';
    const fullPath = `${folder}${separator}${sanitizedName}`;
    
    console.log('[NewFile] Creating file:', fullPath);
    
    try {
      const invoke = (window as any).__TAURI__?.core?.invoke;
      
      if (invoke) {
        // Use Tauri to create file
        await invoke('create_file', { 
          path: fullPath, 
          content: this.getTemplateContent(sanitizedName)
        });
        console.log('[NewFile] ✅ File created via Tauri');
      } else {
        // Fallback: Use fileSystem API
        const fileSystem = (window as any).fileSystem;
        if (fileSystem?.createFile) {
          await fileSystem.createFile(fullPath, this.getTemplateContent(sanitizedName));
          console.log('[NewFile] ✅ File created via fileSystem');
        } else {
          throw new Error('No file creation API available');
        }
      }
      
      // Close modal
      modal.remove();
      
      // Show success notification
      this.showNotification(`Created: ${sanitizedName}`, 'success');
      
      // Update file explorer
      await this.refreshFileExplorer(folder);
      
      // Open the file in editor
      setTimeout(() => {
        this.openFileInEditor(fullPath);
      }, 300);
      
    } catch (error) {
      console.error('[NewFile] Error creating file:', error);
      this.showNotification(`Failed to create file: ${error}`, 'error');
    }
  }
  
  /**
   * Get template content based on file extension
   */
  private getTemplateContent(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    
    const templates: Record<string, string> = {
      'ts': '// TypeScript file\n\nexport {};\n',
      'tsx': `import React from 'react';\n\nconst Component = () => {\n  return (\n    <div>\n      \n    </div>\n  );\n};\n\nexport default Component;\n`,
      'js': '// JavaScript file\n\n',
      'jsx': `import React from 'react';\n\nconst Component = () => {\n  return (\n    <div>\n      \n    </div>\n  );\n};\n\nexport default Component;\n`,
      'css': '/* Styles */\n\n',
      'scss': '/* SCSS Styles */\n\n',
      'html': `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>\n`,
      'json': '{\n  \n}\n',
      'md': '# Title\n\n',
      'py': '# Python file\n\n',
      'rs': '// Rust file\n\nfn main() {\n    \n}\n',
    };
    
    return templates[ext] || '';
  }
  
  /**
   * Refresh file explorer to show new file
   */
  private async refreshFileExplorer(folder: string): Promise<void> {
    console.log('[NewFile] Refreshing file explorer...');
    
    // Method 1: Dispatch refresh event
    document.dispatchEvent(new CustomEvent('file-tree-refresh'));
    
    // Method 2: Click refresh button
    const refreshBtn = document.querySelector('.refresh-btn, [title*="Refresh"], .project-header button');
    if (refreshBtn) {
      (refreshBtn as HTMLElement).click();
    }
    
    // Method 3: Use fileTreeIntegration
    if ((window as any).fileTreeIntegration?.refreshFileTree) {
      await (window as any).fileTreeIntegration.refreshFileTree();
    }
    
    // Method 4: Dispatch file-created event
    document.dispatchEvent(new CustomEvent('file-created', {
      detail: { folder }
    }));
    
    console.log('[NewFile] ✅ File explorer refreshed');
  }
  
  /**
   * Open file in editor
   */
  private openFileInEditor(filePath: string): void {
    console.log('[NewFile] Opening file in editor:', filePath);
    
    // Method 1: Use openFileInTab if available
    if ((window as any).openFileInTab) {
      (window as any).openFileInTab(filePath);
      return;
    }
    
    // Method 2: Use tabManager
    if ((window as any).tabManager?.openFile) {
      (window as any).tabManager.openFile(filePath);
      return;
    }
    
    // Method 3: Use editorManager
    if ((window as any).editorManager?.openFile) {
      (window as any).editorManager.openFile(filePath);
      return;
    }
    
    // Method 4: Dispatch event
    document.dispatchEvent(new CustomEvent('open-file', {
      detail: { path: filePath }
    }));
  }
  
  /**
   * Truncate long path for display
   */
  private truncatePath(path: string): string {
    if (path.length <= 50) return path;
    const parts = path.split(/[/\\]/);
    if (parts.length <= 3) return path;
    return `${parts[0]}\\...\\${parts.slice(-2).join('\\')}`;
  }
  
  /**
   * Show notification
   */
  private showNotification(message: string, type: 'success' | 'warning' | 'error'): void {
    const colors = {
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336'
    };
    
    const icons = {
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    
    const notification = document.createElement('div');
    notification.className = 'new-file-notification';
    notification.innerHTML = `${icons[type]} ${message}`;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10001;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  /**
   * Add modal styles
   */
  private addModalStyles(): void {
    if (document.getElementById('new-file-modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'new-file-modal-styles';
    style.textContent = `
      .new-file-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .new-file-modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(2px);
      }
      
      .new-file-modal-content {
        position: relative;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 12px;
        width: 450px;
        max-width: 90vw;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        animation: modalIn 0.2s ease;
      }
      
      @keyframes modalIn {
        from {
          opacity: 0;
          transform: scale(0.95) translateY(-10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(20px);
        }
      }
      
      .new-file-modal-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px 20px;
        border-bottom: 1px solid #3c3c3c;
      }
      
      .new-file-modal-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: #fff;
      }
      
      .new-file-icon {
        font-size: 20px;
      }
      
      .new-file-modal-body {
        padding: 20px;
      }
      
      .new-file-modal-body label {
        display: block;
        margin-bottom: 8px;
        color: #ccc;
        font-size: 13px;
      }
      
      .new-file-input {
        width: 100%;
        padding: 10px 12px;
        background: #2d2d2d;
        border: 1px solid #4c4c4c;
        border-radius: 6px;
        color: #fff;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      
      .new-file-input:focus {
        border-color: #007acc;
        box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
      }
      
      /* Folder selector styles */
      .folder-selector {
        position: relative;
        margin-bottom: 12px;
      }
      
      .folder-select {
        width: 100%;
        padding: 10px 12px;
        background: #2d2d2d;
        border: 1px solid #4c4c4c;
        border-radius: 6px;
        color: #fff;
        font-size: 13px;
        outline: none;
        cursor: pointer;
        transition: border-color 0.2s;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M2 4l4 4 4-4'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 32px;
      }
      
      .folder-select:hover {
        border-color: #5c5c5c;
      }
      
      .folder-select:focus {
        border-color: #007acc;
        box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
      }
      
      .folder-select option {
        background: #2d2d2d;
        color: #fff;
        padding: 8px;
      }
      
      .new-file-path {
        margin-top: 8px;
        padding: 8px 10px;
        background: #252525;
        border-radius: 4px;
        font-size: 11px;
        color: #888;
        display: flex;
        gap: 6px;
        word-break: break-all;
      }
      
      .path-label {
        color: #666;
        flex-shrink: 0;
      }
      
      .path-value {
        color: #aaa;
        word-break: break-all;
      }
      
      .new-file-templates {
        margin-top: 16px;
      }
      
      .templates-label {
        display: block;
        margin-bottom: 8px;
        color: #888;
        font-size: 12px;
      }
      
      .template-buttons {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      
      .template-buttons button {
        padding: 5px 10px;
        background: #2d2d2d;
        border: 1px solid #4c4c4c;
        border-radius: 4px;
        color: #ccc;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s;
      }
      
      .template-buttons button:hover {
        background: #3c3c3c;
        border-color: #007acc;
        color: #fff;
      }
      
      .new-file-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 16px 20px;
        border-top: 1px solid #3c3c3c;
      }
      
      .new-file-modal-footer button {
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.15s;
      }
      
      .btn-cancel {
        background: transparent;
        border: 1px solid #4c4c4c;
        color: #ccc;
      }
      
      .btn-cancel:hover {
        background: #3c3c3c;
      }
      
      .btn-create {
        background: #007acc;
        border: none;
        color: #fff;
      }
      
      .btn-create:hover {
        background: #0098ff;
      }
    `;
    document.head.appendChild(style);
  }
  
  /**
   * Create file in specific folder (for context menu)
   */
  public createInFolder(folderPath: string): void {
    this.showNewFileDialog(folderPath);
  }
}

// Auto-initialize
const newFileHandler = new NewFileHandler();
newFileHandler.init();

// ═══════════════════════════════════════════════════════════════
// NEW FOLDER HANDLER
// ═══════════════════════════════════════════════════════════════

class NewFolderHandler {
  private currentPath: string = '';
  
  public init(): void {
    console.log('[NewFolder] Initializing new folder handler...');
    this.setupPathTracking();
  }
  
  private setupPathTracking(): void {
    this.updateCurrentPath();
    
    document.addEventListener('project-opened', (e: any) => {
      if (e.detail?.path) this.currentPath = e.detail.path;
    });
    
    setInterval(() => this.updateCurrentPath(), 2000);
  }
  
  private updateCurrentPath(): void {
    this.currentPath = 
      (window as any).__currentProjectPath ||
      (window as any).__workspaceRoot ||
      (window as any).currentFolderPath ||
      localStorage.getItem('ide_last_project_path') ||
      '';
  }
  
  /**
   * Show new folder dialog with parent folder selection
   */
  public async showNewFolderDialog(targetFolder?: string): Promise<void> {
    const folder = targetFolder
      || (window as any).__currentProjectPath
      || localStorage.getItem('lastOpenedFolder')
      || localStorage.getItem('currentProjectPath')
      || (window as any).currentProjectPath
      || localStorage.getItem('ide_last_project_path')
      || (window as any).currentFolderPath
      || this.currentPath
      || '';
    console.log('[NewFolder] Resolved path:', folder);
    
    if (!folder) {
      this.showNotification('Please open a project first', 'warning');
      return;
    }
    
    // Get all folders in project
    const folders = await this.getProjectFolders(folder);
    
    const modal = document.createElement('div');
    modal.className = 'new-folder-modal';
    modal.innerHTML = `
      <div class="new-folder-modal-backdrop"></div>
      <div class="new-folder-modal-content">
        <div class="new-folder-modal-header">
          <span class="new-folder-icon">📁</span>
          <h3>Create New Folder</h3>
          <button class="btn-multi-folder-mode" title="Create Multiple Folders">+ Multi</button>
        </div>
        <div class="new-folder-modal-body">
          <label>Folder name:</label>
          <input type="text" class="new-folder-input" placeholder="my-folder" autofocus />
          
          <label style="margin-top: 16px;">Create inside:</label>
          <div class="folder-selector">
            <select class="parent-folder-select">
              ${folders.map(f => `
                <option value="${f.path}" ${f.path === folder ? 'selected' : ''}>
                  ${f.indent}📁 ${f.name}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="new-folder-path">
            <span class="path-label">Full path:</span>
            <span class="path-value">${folder}</span>
          </div>
          
          <div class="folder-templates">
            <span class="templates-label">Quick templates:</span>
            <div class="template-buttons">
              <button data-name="components" title="Components folder">components</button>
              <button data-name="utils" title="Utilities folder">utils</button>
              <button data-name="hooks" title="React hooks">hooks</button>
              <button data-name="styles" title="Styles folder">styles</button>
              <button data-name="assets" title="Assets folder">assets</button>
              <button data-name="types" title="TypeScript types">types</button>
              <button data-name="tests" title="Tests folder">tests</button>
            </div>
          </div>
        </div>
        <div class="new-folder-modal-footer">
          <button class="btn-cancel">Cancel</button>
          <button class="btn-create">Create Folder</button>
        </div>
      </div>
    `;
    
    this.addFolderModalStyles();
    document.body.appendChild(modal);
    
    const input = modal.querySelector('.new-folder-input') as HTMLInputElement;
    const folderSelect = modal.querySelector('.parent-folder-select') as HTMLSelectElement;
    const pathValue = modal.querySelector('.path-value') as HTMLElement;
    
    setTimeout(() => input?.focus(), 50);
    
    // Multi-mode button
    modal.querySelector('.btn-multi-folder-mode')?.addEventListener('click', () => {
      modal.remove();
      this.showMultiFolderDialog(folder, folders);
    });
    
    // Update path preview
    folderSelect.addEventListener('change', () => {
      pathValue.textContent = folderSelect.value;
    });
    
    // Template buttons
    modal.querySelectorAll('.template-buttons button').forEach(btn => {
      btn.addEventListener('click', () => {
        input.value = btn.getAttribute('data-name') || '';
        input.focus();
      });
    });
    
    // Cancel
    modal.querySelector('.btn-cancel')?.addEventListener('click', () => modal.remove());
    
    // Create
    modal.querySelector('.btn-create')?.addEventListener('click', () => {
      this.createFolder(input.value, folderSelect.value, modal);
    });
    
    // Enter/Escape keys
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.createFolder(input.value, folderSelect.value, modal);
      else if (e.key === 'Escape') modal.remove();
    });
    
    // Backdrop click
    modal.querySelector('.new-folder-modal-backdrop')?.addEventListener('click', () => modal.remove());
  }
  
  /**
   * Show multi-folder creation dialog
   */
  private async showMultiFolderDialog(
    defaultFolder: string,
    folders: Array<{name: string, path: string, indent: string}>
  ): Promise<void> {
    const modal = document.createElement('div');
    modal.className = 'new-folder-modal multi-folder-modal';
    modal.innerHTML = `
      <div class="new-folder-modal-backdrop"></div>
      <div class="new-folder-modal-content multi-folder-content">
        <div class="new-folder-modal-header">
          <span class="new-folder-icon">📁</span>
          <h3>Create Multiple Folders</h3>
          <button class="btn-single-folder-mode">Single</button>
        </div>
        <div class="new-folder-modal-body">
          <div class="multi-folder-list"></div>
          
          <button class="btn-add-folder">+ Add Another Folder</button>
          
          <div class="folder-templates" style="margin-top: 16px;">
            <span class="templates-label">Quick structures:</span>
            <div class="template-buttons structure-buttons">
              <button data-structure="react" title="React project structure">React App</button>
              <button data-structure="api" title="API project structure">API/Backend</button>
              <button data-structure="component" title="Component structure">Component</button>
            </div>
          </div>
        </div>
        <div class="new-folder-modal-footer">
          <span class="folder-count">0 folders</span>
          <button class="btn-cancel">Cancel</button>
          <button class="btn-create-all">Create All Folders</button>
        </div>
      </div>
    `;
    
    this.addMultiFolderStyles();
    document.body.appendChild(modal);
    
    const folderList = modal.querySelector('.multi-folder-list') as HTMLElement;
    const folderCountEl = modal.querySelector('.folder-count') as HTMLElement;
    let entryId = 0;
    
    const getFolderOptions = (selectedPath: string) => {
      return folders.map(f => `
        <option value="${f.path}" ${f.path === selectedPath ? 'selected' : ''}>
          ${f.indent}📁 ${f.name}
        </option>
      `).join('');
    };
    
    const addFolderEntry = (folderName: string = '', parentPath: string = defaultFolder) => {
      const id = `folder-entry-${entryId++}`;
      
      const entry = document.createElement('div');
      entry.className = 'folder-entry';
      entry.dataset.id = id;
      entry.innerHTML = `
        <div class="folder-entry-row">
          <input type="text" class="folder-name-input" placeholder="folder-name" value="${folderName}" />
          <select class="parent-folder-select">
            ${getFolderOptions(parentPath)}
          </select>
          <button class="btn-remove-entry" title="Remove">✕</button>
        </div>
      `;
      
      folderList.appendChild(entry);
      
      const input = entry.querySelector('.folder-name-input') as HTMLInputElement;
      setTimeout(() => input?.focus(), 50);
      
      entry.querySelector('.btn-remove-entry')?.addEventListener('click', () => {
        entry.remove();
        updateFolderCount();
      });
      
      updateFolderCount();
      return entry;
    };
    
    const updateFolderCount = () => {
      const count = folderList.querySelectorAll('.folder-entry').length;
      folderCountEl.textContent = `${count} folder${count !== 1 ? 's' : ''}`;
    };
    
    const getEntriesData = (): Array<{name: string, parent: string}> => {
      const entries: Array<{name: string, parent: string}> = [];
      folderList.querySelectorAll('.folder-entry').forEach(entry => {
        const name = (entry.querySelector('.folder-name-input') as HTMLInputElement)?.value.trim();
        const parent = (entry.querySelector('.parent-folder-select') as HTMLSelectElement)?.value;
        if (name) entries.push({ name, parent });
      });
      return entries;
    };
    
    // Add initial entry
    addFolderEntry();
    
    // Add folder button
    modal.querySelector('.btn-add-folder')?.addEventListener('click', () => addFolderEntry());
    
    // Single mode
    modal.querySelector('.btn-single-folder-mode')?.addEventListener('click', () => {
      modal.remove();
      this.showNewFolderDialog(defaultFolder);
    });
    
    // Structure templates
    modal.querySelectorAll('.structure-buttons button').forEach(btn => {
      btn.addEventListener('click', () => {
        const structure = btn.getAttribute('data-structure');
        const selectedParent = (folderList.querySelector('.folder-entry:last-child .parent-folder-select') as HTMLSelectElement)?.value || defaultFolder;
        
        switch (structure) {
          case 'react':
            addFolderEntry('components', selectedParent);
            addFolderEntry('hooks', selectedParent);
            addFolderEntry('utils', selectedParent);
            addFolderEntry('styles', selectedParent);
            addFolderEntry('types', selectedParent);
            addFolderEntry('assets', selectedParent);
            break;
          case 'api':
            addFolderEntry('controllers', selectedParent);
            addFolderEntry('models', selectedParent);
            addFolderEntry('routes', selectedParent);
            addFolderEntry('middleware', selectedParent);
            addFolderEntry('utils', selectedParent);
            break;
          case 'component':
            addFolderEntry('__tests__', selectedParent);
            addFolderEntry('styles', selectedParent);
            addFolderEntry('hooks', selectedParent);
            break;
        }
      });
    });
    
    // Cancel
    modal.querySelector('.btn-cancel')?.addEventListener('click', () => modal.remove());
    
    // Create all
    modal.querySelector('.btn-create-all')?.addEventListener('click', async () => {
      const entries = getEntriesData();
      if (entries.length === 0) {
        this.showNotification('Please add at least one folder', 'warning');
        return;
      }
      await this.createMultipleFolders(entries, modal);
    });
    
    // Backdrop
    modal.querySelector('.new-folder-modal-backdrop')?.addEventListener('click', () => modal.remove());
    
    // Keyboard
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') modal.remove();
      else if (e.ctrlKey && e.key === 'Enter') {
        const entries = getEntriesData();
        if (entries.length > 0) this.createMultipleFolders(entries, modal);
      }
    });
  }
  
  /**
   * Create a single folder
   */
  private async createFolder(folderName: string, parentPath: string, modal: HTMLElement): Promise<void> {
    if (!folderName.trim()) {
      this.showNotification('Please enter a folder name', 'warning');
      return;
    }
    
    const sanitizedName = folderName.trim().replace(/[<>:"/\\|?*]/g, '');
    const separator = parentPath.includes('/') ? '/' : '\\';
    const fullPath = `${parentPath}${separator}${sanitizedName}`;
    
    try {
      const invoke = (window as any).__TAURI__?.core?.invoke;
      
      if (invoke) {
        await invoke('create_directory', { path: fullPath });
      } else {
        const fileSystem = (window as any).fileSystem;
        if (fileSystem?.createDirectory) {
          await fileSystem.createDirectory(fullPath);
        }
      }
      
      modal.remove();
      this.showNotification(`✅ Created: ${sanitizedName}`, 'success');
      await this.refreshFileExplorer();
      
    } catch (error) {
      console.error('[NewFolder] Error:', error);
      this.showNotification(`Failed to create folder: ${error}`, 'error');
    }
  }
  
  /**
   * Create multiple folders
   */
  private async createMultipleFolders(
    entries: Array<{name: string, parent: string}>,
    modal: HTMLElement
  ): Promise<void> {
    let successCount = 0;
    let failCount = 0;
    
    for (const entry of entries) {
      try {
        const separator = entry.parent.includes('/') ? '/' : '\\';
        const fullPath = `${entry.parent}${separator}${entry.name}`;
        
        const invoke = (window as any).__TAURI__?.core?.invoke;
        
        if (invoke) {
          await invoke('create_directory', { path: fullPath });
        } else {
          const fileSystem = (window as any).fileSystem;
          if (fileSystem?.createDirectory) {
            await fileSystem.createDirectory(fullPath);
          }
        }
        
        console.log(`[NewFolder] ✅ Created: ${fullPath}`);
        successCount++;
      } catch (err) {
        console.error(`[NewFolder] ❌ Failed: ${entry.name}`, err);
        failCount++;
      }
    }
    
    modal.remove();
    
    if (failCount === 0) {
      this.showNotification(`✅ Created ${successCount} folder${successCount !== 1 ? 's' : ''}`, 'success');
    } else {
      this.showNotification(`Created ${successCount}, failed ${failCount}`, 'warning');
    }
    
    await this.refreshFileExplorer();
  }
  
  /**
   * Get project folders
   */
  private async getProjectFolders(rootPath: string): Promise<Array<{name: string, path: string, indent: string}>> {
    const folders: Array<{name: string, path: string, indent: string, depth: number}> = [];
    
    const rootName = rootPath.split(/[/\\]/).pop() || 'Project';
    folders.push({ name: `${rootName} (root)`, path: rootPath, indent: '', depth: 0 });
    
    try {
      const invoke = (window as any).__TAURI__?.core?.invoke;
      
      if (invoke) {
        await this.scanFoldersRecursive(invoke, rootPath, folders, 1);
      } else {
        const folderElements = document.querySelectorAll('.file-item.folder-item[data-path], .file-item.directory[data-path]');
        folderElements.forEach(el => {
          const path = el.getAttribute('data-path') || '';
          if (path && path !== rootPath && path.startsWith(rootPath)) {
            const name = path.split(/[/\\]/).pop() || '';
            const depth = (path.split(rootPath)[1]?.match(/[/\\]/g) || []).length;
            folders.push({ name, path, indent: '　'.repeat(depth), depth });
          }
        });
      }
    } catch (err) {
      console.warn('[NewFolder] Error scanning folders:', err);
    }
    
    folders.sort((a, b) => a.path.localeCompare(b.path));
    return folders;
  }
  
  private async scanFoldersRecursive(
    invoke: Function,
    dirPath: string,
    folders: Array<{name: string, path: string, indent: string, depth: number}>,
    depth: number,
    maxDepth: number = 5
  ): Promise<void> {
    if (depth > maxDepth) return;
    
    try {
      const items = await invoke('read_directory_detailed', { path: dirPath });
      
      for (const item of items || []) {
        if (item.is_directory) {
          folders.push({ name: item.name, path: item.path, indent: '　'.repeat(depth), depth });
          await this.scanFoldersRecursive(invoke, item.path, folders, depth + 1, maxDepth);
        }
      }
    } catch (err) {
      console.warn(`[NewFolder] Error reading ${dirPath}:`, err);
    }
  }
  
  private async refreshFileExplorer(): Promise<void> {
    document.dispatchEvent(new CustomEvent('file-tree-refresh'));
    
    const refreshBtn = document.querySelector('.refresh-btn, [title*="Refresh"]');
    if (refreshBtn) (refreshBtn as HTMLElement).click();
    
    if ((window as any).fileTreeIntegration?.refreshFileTree) {
      await (window as any).fileTreeIntegration.refreshFileTree();
    }
  }
  
  private showNotification(message: string, type: 'success' | 'warning' | 'error'): void {
    const colors = { success: '#4caf50', warning: '#ff9800', error: '#f44336' };
    const icons = { success: '✅', warning: '⚠️', error: '❌' };
    
    const notification = document.createElement('div');
    notification.innerHTML = `${icons[type]} ${message}`;
    notification.style.cssText = `
      position: fixed; bottom: 20px; right: 20px;
      background: ${colors[type]}; color: white;
      padding: 12px 20px; border-radius: 8px;
      font-size: 14px; z-index: 10001;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  private addFolderModalStyles(): void {
    if (document.getElementById('new-folder-modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'new-folder-modal-styles';
    style.textContent = `
      .new-folder-modal {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .new-folder-modal-backdrop {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(2px);
      }
      
      .new-folder-modal-content {
        position: relative;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 12px;
        width: 450px;
        max-width: 90vw;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        animation: modalIn 0.2s ease;
      }
      
      .new-folder-modal-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px 20px;
        border-bottom: 1px solid #3c3c3c;
      }
      
      .new-folder-modal-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: #fff;
      }
      
      .new-folder-icon { font-size: 20px; }
      
      .new-folder-modal-body {
        padding: 20px;
      }
      
      .new-folder-modal-body label {
        display: block;
        margin-bottom: 8px;
        color: #ccc;
        font-size: 13px;
      }
      
      .new-folder-input {
        width: 100%;
        padding: 10px 12px;
        background: #2d2d2d;
        border: 1px solid #4c4c4c;
        border-radius: 6px;
        color: #fff;
        font-size: 14px;
        outline: none;
        box-sizing: border-box;
      }
      
      .new-folder-input:focus {
        border-color: #007acc;
        box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
      }
      
      .new-folder-path {
        margin-top: 8px;
        padding: 8px 10px;
        background: #252525;
        border-radius: 4px;
        font-size: 11px;
        color: #888;
        display: flex;
        gap: 6px;
        word-break: break-all;
      }
      
      .folder-templates { margin-top: 16px; }
      
      .folder-templates .templates-label {
        display: block;
        margin-bottom: 8px;
        color: #888;
        font-size: 12px;
      }
      
      .folder-templates .template-buttons {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      
      .folder-templates .template-buttons button {
        padding: 5px 10px;
        background: #2d2d2d;
        border: 1px solid #4c4c4c;
        border-radius: 4px;
        color: #ccc;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s;
      }
      
      .folder-templates .template-buttons button:hover {
        background: #3c3c3c;
        border-color: #007acc;
        color: #fff;
      }
      
      .new-folder-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 16px 20px;
        border-top: 1px solid #3c3c3c;
      }
      
      .new-folder-modal-footer button {
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.15s;
      }
      
      .new-folder-modal .btn-cancel {
        background: transparent;
        border: 1px solid #4c4c4c;
        color: #ccc;
      }
      
      .new-folder-modal .btn-cancel:hover {
        background: #3c3c3c;
      }
      
      .new-folder-modal .btn-create {
        background: #007acc;
        border: none;
        color: #fff;
      }
      
      .new-folder-modal .btn-create:hover {
        background: #0098ff;
      }
      
      .btn-multi-folder-mode,
      .btn-single-folder-mode {
        margin-left: auto;
        padding: 4px 10px;
        background: #333;
        border: 1px solid #4c4c4c;
        border-radius: 4px;
        color: #aaa;
        font-size: 11px;
        cursor: pointer;
      }
      
      .btn-multi-folder-mode:hover,
      .btn-single-folder-mode:hover {
        background: #007acc;
        border-color: #007acc;
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }
  
  private addMultiFolderStyles(): void {
    if (document.getElementById('multi-folder-modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'multi-folder-modal-styles';
    style.textContent = `
      .multi-folder-content {
        width: 550px;
        max-height: 80vh;
      }
      
      .multi-folder-modal .new-folder-modal-body {
        max-height: 50vh;
        overflow-y: auto;
      }
      
      .multi-folder-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 12px;
      }
      
      .folder-entry {
        animation: entryIn 0.2s ease;
      }
      
      .folder-entry-row {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      
      .folder-name-input {
        flex: 1;
        min-width: 120px;
        padding: 8px 10px;
        background: #2d2d2d;
        border: 1px solid #4c4c4c;
        border-radius: 4px;
        color: #fff;
        font-size: 13px;
        outline: none;
      }
      
      .folder-name-input:focus {
        border-color: #007acc;
      }
      
      .folder-entry .parent-folder-select {
        flex: 1.5;
        padding: 8px 10px;
        background: #2d2d2d;
        border: 1px solid #4c4c4c;
        border-radius: 4px;
        color: #fff;
        font-size: 12px;
        outline: none;
        cursor: pointer;
      }
      
      .btn-add-folder {
        width: 100%;
        padding: 10px;
        background: transparent;
        border: 1px dashed #4c4c4c;
        border-radius: 6px;
        color: #888;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.15s;
      }
      
      .btn-add-folder:hover {
        border-color: #007acc;
        color: #007acc;
        background: rgba(0, 122, 204, 0.1);
      }
      
      .structure-buttons button {
        padding: 6px 12px;
        font-size: 11px;
      }
      
      .folder-count {
        color: #888;
        font-size: 12px;
        margin-right: auto;
      }
      
      .btn-create-all {
        background: #007acc;
        border: none;
        color: #fff;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
      }
      
      .btn-create-all:hover {
        background: #0098ff;
      }
    `;
    document.head.appendChild(style);
  }
}

// Initialize folder handler
const newFolderHandler = new NewFolderHandler();
newFolderHandler.init();

// Expose globally
(window as any).newFileHandler = newFileHandler;
(window as any).newFolderHandler = newFolderHandler;
(window as any).createNewFile = () => newFileHandler.showNewFileDialog();
(window as any).createNewFolder = () => newFolderHandler.showNewFolderDialog();

console.log('[NewFile] ✅ Enhanced new file handler loaded');
console.log('[NewFolder] ✅ Enhanced new folder handler loaded');
console.log('[NewFile/Folder] Use Ctrl+N for file, Ctrl+Shift+N for folder');

export { NewFolderHandler };
export default NewFileHandler;