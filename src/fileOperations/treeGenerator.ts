// fileOperations/treeGenerator.ts - Fixed Tree Generator

export interface TreeGeneratorOptions {
  path: string;
  includeFiles: boolean;
  outputFile?: string;
  format?: 'ascii' | 'unicode' | 'plain';
  maxDepth?: number;
}

export class FileTreeGenerator {
  /**
   * Generate tree for specific folder
   */
  static async generateTreeForFolder(
    folderPath: string,
    options: Partial<TreeGeneratorOptions> = {}
  ): Promise<string> {
    const defaultOptions: TreeGeneratorOptions = {
      path: folderPath,
      includeFiles: true,
      format: 'ascii',
      maxDepth: 20,
      ...options
    };

    console.log('🌳 Generating tree for:', folderPath);
    console.log('📋 Options:', defaultOptions);

    try {
      // Generate tree using file system
      const tree = await this.buildTreeFromFileSystem(defaultOptions);
      
      if (!tree || tree.trim().length === 0) {
        throw new Error('Generated tree is empty - check folder path and permissions');
      }

      console.log('✅ Tree generated, length:', tree.length);

      // Save to file if requested
      if (options.outputFile) {
        await this.saveTreeToFile(tree, options.outputFile);
      }

      return tree;
    } catch (error) {
      console.error('❌ Failed to generate tree:', error);
      throw error;
    }
  }

  /**
   * Build tree from file system
   */
  private static async buildTreeFromFileSystem(options: TreeGeneratorOptions): Promise<string> {
    const fileSystem = (window as any).fileSystem;
    
    if (!fileSystem) {
      throw new Error('File system not available');
    }

    console.log('📂 Building tree from:', options.path);

    // Get folder name for header
    const folderName = this.getFolderName(options.path);
    let result = `${folderName}\n`;

    // Build tree recursively
    const treeContent = await this.buildTreeRecursive(
      options.path,
      '',
      true,
      0,
      options.maxDepth || 20,
      options.includeFiles!
    );

    result += treeContent;

    // Format based on selected format
    if (options.format === 'ascii') {
      // Already in ASCII format
      return result;
    } else if (options.format === 'unicode') {
      return this.convertToUnicode(result);
    } else {
      return this.convertToPlain(result);
    }
  }

  /**
   * Build tree recursively with proper box-drawing characters
   */
  private static async buildTreeRecursive(
    dirPath: string,
    prefix: string,
    isLast: boolean,
    depth: number,
    maxDepth: number,
    includeFiles: boolean
  ): Promise<string> {
    if (depth >= maxDepth) {
      return '';
    }

    let result = '';
    const fileSystem = (window as any).fileSystem;

    try {
      console.log(`📁 Reading directory at depth ${depth}:`, dirPath);

      // Read directory - try different methods
      let entries: any[] = [];
      
      if (fileSystem.readDirectory) {
        entries = await fileSystem.readDirectory(dirPath);
      } else if (fileSystem.getDirectoryTree) {
        const tree = await fileSystem.getDirectoryTree(dirPath, 1);
        entries = tree?.children || [];
      } else {
        console.error('No method available to read directory');
        return '';
      }

      if (!entries || entries.length === 0) {
        console.warn('⚠️ No entries found in:', dirPath);
        return '';
      }

      console.log(`✅ Found ${entries.length} entries in:`, dirPath);

      // Filter and sort entries
      const filtered = entries.filter((entry: any) => {
        const name = entry.name;
        const ignorePaths = [
          'node_modules', '.git', 'dist', 'build', '.next',
          '__pycache__', '.vscode', '.idea', 'coverage',
          '.DS_Store', 'Thumbs.db', '.env'
        ];
        return !ignorePaths.includes(name) && !name.startsWith('.');
      });

      // Separate folders and files, then sort
      const folders = filtered.filter((e: any) => e.isDirectory || e.is_directory);
      const files = includeFiles ? filtered.filter((e: any) => !(e.isDirectory || e.is_directory)) : [];

      folders.sort((a: any, b: any) => a.name.localeCompare(b.name));
      files.sort((a: any, b: any) => a.name.localeCompare(b.name));

      const allEntries = [...folders, ...files];
      const totalEntries = allEntries.length;

      // Process each entry
      for (let i = 0; i < totalEntries; i++) {
        const entry = allEntries[i];
        const isLastEntry = i === totalEntries - 1;
        const isDir = entry.isDirectory || entry.is_directory;

        // Add entry to tree
        if (depth === 0) {
          // Root level uses | and +---
          result += `|   ${entry.name}\n`;
        } else {
          // Nested levels
          const connector = isLastEntry ? '\\---' : '+---';
          result += `${prefix}${connector}${entry.name}\n`;
        }

        // Recurse into directories
        if (isDir) {
          const entryPath = this.joinPath(dirPath, entry.name);
          const newPrefix = depth === 0 
            ? '' 
            : prefix + (isLastEntry ? '    ' : '|   ');

          const subTree = await this.buildTreeRecursive(
            entryPath,
            newPrefix,
            isLastEntry,
            depth + 1,
            maxDepth,
            includeFiles
          );

          result += subTree;
        }
      }

    } catch (error) {
      console.error(`❌ Error reading directory ${dirPath}:`, error);
    }

    return result;
  }

  /**
   * Join paths correctly for Windows or Unix
   */
  private static joinPath(base: string, name: string): string {
    // Detect path separator
    const separator = base.includes('\\') ? '\\' : '/';
    
    // Remove trailing separator from base
    const cleanBase = base.replace(/[/\\]+$/, '');
    
    return `${cleanBase}${separator}${name}`;
  }

  /**
   * Get folder name from path
   */
  private static getFolderName(path: string): string {
    // Handle both Windows and Unix paths
    const normalized = path.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : path;
  }

  /**
   * Convert ASCII tree to Unicode box-drawing characters
   */
  private static convertToUnicode(tree: string): string {
    return tree
      .replace(/\+---/g, '├── ')
      .replace(/\\---/g, '└── ')
      .replace(/\|   /g, '│   ')
      .replace(/    /g, '    ');
  }

  /**
   * Convert to plain text (remove box-drawing)
   */
  private static convertToPlain(tree: string): string {
    return tree
      .replace(/[+\\|]/g, '')
      .replace(/---/g, '  ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Save tree to file
   */
  private static async saveTreeToFile(content: string, filepath: string): Promise<void> {
    const fileSystem = (window as any).fileSystem;

    try {
      console.log('💾 Saving tree to:', filepath);

      if (fileSystem?.writeFile) {
        await fileSystem.writeFile(filepath, content);
        console.log('✅ Tree saved successfully');
        
        if ((window as any).showNotification) {
          (window as any).showNotification('Tree saved to tree.txt', 'success');
        }
      } else {
        console.warn('⚠️ writeFile not available, downloading instead');
        this.downloadAsFile(content, filepath.split(/[\\/]/).pop() || 'tree.txt');
      }
    } catch (error) {
      console.error('❌ Failed to save tree file:', error);
      // Fallback to download
      this.downloadAsFile(content, filepath.split(/[\\/]/).pop() || 'tree.txt');
    }
  }

  /**
   * Download file as fallback
   */
  private static downloadAsFile(content: string, filename: string): void {
    try {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ Tree downloaded as:', filename);

      if ((window as any).showNotification) {
        (window as any).showNotification(`Downloaded as ${filename}`, 'success');
      }
    } catch (error) {
      console.error('❌ Failed to download file:', error);
    }
  }

  /**
   * Show tree generation dialog
   */
  static showTreeDialog(folderPath: string): void {
    const folderName = this.getFolderName(folderPath);

    console.log('📊 Showing tree dialog for:', folderPath);

    // Remove any existing dialog
    document.getElementById('tree-generator-modal')?.remove();

    const dialog = document.createElement('div');
    dialog.id = 'tree-generator-modal';
    dialog.className = 'modal tree-generator-modal';
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100000;
      animation: fadeIn 0.2s ease-out;
    `;

    dialog.innerHTML = `
      <div class="modal-content" style="
        background: #252526;
        border: 1px solid #3e3e42;
        border-radius: 8px;
        padding: 24px;
        min-width: 450px;
        max-width: 600px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        animation: slideIn 0.3s ease-out;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600;">Generate File Tree</h3>
          <button id="close-tree-dialog" style="
            background: none;
            border: none;
            color: #969696;
            cursor: pointer;
            font-size: 24px;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.2s;
          " title="Close">×</button>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: #cccccc; font-size: 13px; margin-bottom: 6px; font-weight: 500;">
            📁 Folder:
          </label>
          <div style="
            background: #3c3c3c;
            padding: 10px 12px;
            border-radius: 4px;
            color: #4fc3f7;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            border: 1px solid #555;
          " title="${folderPath}">
            ${folderName}
          </div>
          <div style="
            font-size: 11px;
            color: #888;
            margin-top: 4px;
            font-family: monospace;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          " title="${folderPath}">
            ${folderPath}
          </div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: flex; align-items: center; color: #cccccc; font-size: 13px; cursor: pointer;">
            <input type="checkbox" id="tree-include-files" checked style="
              margin-right: 8px; 
              cursor: pointer;
              width: 16px;
              height: 16px;
            " />
            Include files (not just folders)
          </label>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: #cccccc; font-size: 13px; margin-bottom: 6px; font-weight: 500;">
            Format:
          </label>
          <select id="tree-format" style="
            width: 100%;
            padding: 8px 12px;
            background: #3c3c3c;
            border: 1px solid #555;
            color: #cccccc;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
          ">
            <option value="ascii">ASCII (|-- +---) - Windows Style</option>
            <option value="unicode">Unicode (├── └──) - Modern</option>
            <option value="plain">Plain Text (no lines)</option>
          </select>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: #cccccc; font-size: 13px; margin-bottom: 6px; font-weight: 500;">
            Max depth:
          </label>
          <input type="number" id="tree-max-depth" value="20" min="1" max="50" style="
            width: 100%;
            padding: 8px 12px;
            background: #3c3c3c;
            border: 1px solid #555;
            color: #cccccc;
            border-radius: 4px;
            font-size: 13px;
          " />
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; color: #cccccc; font-size: 13px; margin-bottom: 8px; font-weight: 500;">
            Output:
          </label>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label style="display: flex; align-items: center; color: #cccccc; font-size: 13px; cursor: pointer; padding: 8px; border-radius: 4px; transition: background 0.2s;">
              <input type="radio" name="output-type" id="output-editor" value="editor" checked style="
                margin-right: 8px;
                cursor: pointer;
              " />
              <span>📝 Open in editor</span>
            </label>
            <label style="display: flex; align-items: center; color: #cccccc; font-size: 13px; cursor: pointer; padding: 8px; border-radius: 4px; transition: background 0.2s;">
              <input type="radio" name="output-type" id="output-file" value="file" style="
                margin-right: 8px;
                cursor: pointer;
              " />
              <span>💾 Save as tree.txt in folder</span>
            </label>
          </div>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button id="cancel-tree-btn" style="
            padding: 10px 20px;
            background: #3c3c3c;
            color: #cccccc;
            border: 1px solid #555;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
          ">Cancel</button>
          <button id="generate-tree-btn" style="
            padding: 10px 20px;
            background: #0e639c;
            color: #ffffff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.2s;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          ">
            <span style="display: flex; align-items: center; gap: 6px;">
              ⚡ Generate Tree
            </span>
          </button>
        </div>
      </div>
    `;

    // Add animation styles
    if (!document.getElementById('tree-dialog-animations')) {
      const style = document.createElement('style');
      style.id = 'tree-dialog-animations';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translateY(-20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(dialog);

    // Event handlers
    const generateBtn = document.getElementById('generate-tree-btn')!;
    const cancelBtn = document.getElementById('cancel-tree-btn')!;
    const closeBtn = document.getElementById('close-tree-dialog')!;

    const closeDialog = () => dialog.remove();

    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) closeDialog();
    });

    // Generate handler
    generateBtn.addEventListener('click', async () => {
      const includeFiles = (document.getElementById('tree-include-files') as HTMLInputElement).checked;
      const format = (document.getElementById('tree-format') as HTMLSelectElement).value as any;
      const maxDepth = parseInt((document.getElementById('tree-max-depth') as HTMLInputElement).value);
      const outputType = (document.querySelector('input[name="output-type"]:checked') as HTMLInputElement).value;

      try {
        generateBtn.textContent = '⏳ Generating...';
        generateBtn.style.pointerEvents = 'none';
        generateBtn.style.opacity = '0.7';

        const outputPath = outputType === 'file' ? `${folderPath}\\tree.txt` : undefined;

        const tree = await FileTreeGenerator.generateTreeForFolder(folderPath, {
          includeFiles,
          format,
          maxDepth,
          outputFile: outputPath
        });

        if (outputType === 'editor') {
          // Open in editor
          if ((window as any).tabManager?.addTab) {
            (window as any).tabManager.addTab(`${folderName}_tree.txt`, tree);
          } else if ((window as any).tabManager?.openFile) {
            (window as any).tabManager.openFile(`${folderName}_tree.txt`, tree);
          }
        }

        if ((window as any).showNotification) {
          (window as any).showNotification(
            outputType === 'file'
              ? '✅ Tree saved to tree.txt'
              : '✅ Tree opened in editor',
            'success'
          );
        }

        closeDialog();
      } catch (error) {
        console.error('Error generating tree:', error);
        alert(`Error: ${(error as Error).message}`);

        generateBtn.innerHTML = '<span style="display: flex; align-items: center; gap: 6px;">⚡ Generate Tree</span>';
        generateBtn.style.pointerEvents = 'auto';
        generateBtn.style.opacity = '1';
      }
    });
  }
}

// Export for global use
if (typeof window !== 'undefined') {
  (window as any).FileTreeGenerator = FileTreeGenerator;
}