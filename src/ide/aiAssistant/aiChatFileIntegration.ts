// ============================================================================
// FILE: src/ide/aiAssistant/aiChatFileIntegration.ts
// PURPOSE: Enhanced AI Chat → Complete Project Creator
// ============================================================================

import { invoke } from '@tauri-apps/api/core';
import { showNotification } from './notificationManager';
import { getDirectoryTree } from "../../fileSystem";  // 

/**
 * Enhanced AI Chat File Integration
 * 
 * Features:
 * 1. Detects complete project requests (e.g., "create calculator with UI")
 * 2. Enhances prompts to get ALL necessary files
 * 3. Creates complete, working projects automatically
 * 4. Supports HTML/CSS/JS, React, Python, and more
 */

interface FileCreationRequest {
  filePath: string;
  content: string;
  openAfterCreate?: boolean;
}

interface ChatFileIntegrationConfig {
  autoDetectFileRequests: boolean;
  autoOpenCreatedFiles: boolean;
  currentFolderPath: string | null;
  enhanceProjectRequests: boolean; // NEW: Auto-enhance project requests
}

export class AIChatFileIntegration {
  private config: ChatFileIntegrationConfig = {
    autoDetectFileRequests: true,
    autoOpenCreatedFiles: true,
    currentFolderPath: null,
    enhanceProjectRequests: true // Enabled by default
  };

  constructor() {
    this.setupListeners();
  }

  /**
   * Set the current folder path
   */
  setCurrentFolder(folderPath: string): void {
    this.config.currentFolderPath = folderPath;
    console.log('📂 Current folder set to:', folderPath);
  }

  /**
   * Setup event listeners
   */
  private setupListeners(): void {
    // Listen for AI responses
    document.addEventListener('ai-response-received', async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.response) {
        await this.handleAIResponse(detail.response, detail.userMessage);
      }
    });

    // Listen for folder changes
    document.addEventListener('folder-opened', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.path) {
        this.setCurrentFolder(detail.path);
      }
    });

    // NEW: Listen for enhanced prompt requests
    document.addEventListener('ai-prompt-enhancement', async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.originalPrompt) {
        const enhanced = this.enhancePromptForCompleteProject(detail.originalPrompt);
        detail.callback(enhanced);
      }
    });
  }

  /**
   * Detect if user message indicates they want to create files
   */
  private detectFileCreationIntent(message: string): boolean {
    const triggers = [
      // Direct file creation
      'create file',
      'create a file',
      'generate file',
      'make file',
      'save to file',
      'write to file',
      
      // Project/app creation - NEW!
      'create calculator',
      'create todo',
      'create timer',
      'create game',
      'create dashboard',
      'create website',
      'create app',
      'build a',
      'build an',
      'make a calculator',
      'make a todo',
      'make an app',
      'create landing page',
      'create portfolio',
      
      // With UI keywords - NEW!
      'with ui',
      'with interface',
      'with gui',
      'with html',
      'with css',
      'with styling',
      
      // Complete project keywords - NEW!
      'complete project',
      'full stack',
      'frontend',
      'web app',
      
      // Specific file names
      /create\s+\w+\.html/i,
      /create\s+\w+\.js/i,
      /create\s+\w+\.css/i,
      /create\s+\w+\.py/i,
      /create\s+\w+\.jsx/i,
      /create\s+\w+\.tsx/i,
    ];

    return triggers.some(trigger => {
      if (typeof trigger === 'string') {
        return message.toLowerCase().includes(trigger);
      } else {
        return trigger.test(message);
      }
    });
  }

  /**
   * NEW: Detect if user wants a complete project (not just one file)
   */
  private isCompleteProjectRequest(message: string): boolean {
    const projectPatterns = [
      // App/Project keywords
      /create\s+(a\s+)?calculator/i,
      /create\s+(a\s+)?todo/i,
      /create\s+(a\s+)?timer/i,
      /create\s+(a\s+)?game/i,
      /create\s+(a\s+)?dashboard/i,
      /create\s+(a\s+)?website/i,
      /create\s+(a\s+)?app/i,
      /build\s+(a\s+|an\s+)?/i,
      /make\s+(a\s+|an\s+)?calculator/i,
      /make\s+(a\s+|an\s+)?todo/i,
      
      // UI indicators
      /with\s+ui/i,
      /with\s+interface/i,
      /with\s+html/i,
      /with\s+styling/i,
      
      // Project types
      /landing\s+page/i,
      /portfolio/i,
      /web\s+app/i,
      /complete\s+project/i,
    ];

    return projectPatterns.some(pattern => pattern.test(message));
  }

  /**
   * NEW: Enhance prompt to request complete project with all files
   */
  private enhancePromptForCompleteProject(originalPrompt: string): string {
    if (!this.config.enhanceProjectRequests) {
      return originalPrompt;
    }

    // Check if it's a complete project request
    if (!this.isCompleteProjectRequest(originalPrompt)) {
      return originalPrompt;
    }

    console.log('🎨 Enhancing prompt for complete project...');

    // Add specific instructions for complete project
    const enhancement = `

IMPORTANT: Please provide a COMPLETE, WORKING project with ALL necessary files.

For this request, please generate:
1. HTML file (index.html) - Complete UI structure
2. CSS file (styles.css) - Full styling, make it beautiful
3. JavaScript file (script.js) - Complete functionality
4. Any other files needed (README, package.json, etc.)

Requirements:
- Provide each file in a separate code block
- Use proper file names (index.html, styles.css, script.js)
- Make sure the code is complete and ready to run
- Include all necessary imports and dependencies
- Add helpful comments in the code

Format each file like this:
\`\`\`html
<!-- index.html content -->
\`\`\`

\`\`\`css
/* styles.css content */
\`\`\`

\`\`\`javascript
// script.js content
\`\`\``;

    return originalPrompt + enhancement;
  }

  /**
   * Handle AI response and detect if it contains code to save
   */
  private async handleAIResponse(response: string, userMessage: string): Promise<void> {
    if (!this.config.autoDetectFileRequests) return;

    const wantsToCreateFile = this.detectFileCreationIntent(userMessage);
    
    if (wantsToCreateFile) {
      await this.processFileCreationFromResponse(response, userMessage);
    }
  }

  /**
   * Process AI response and extract code blocks
   */
  private async processFileCreationFromResponse(response: string, userMessage: string): Promise<void> {
    console.log('🔍 Processing AI response for file creation...');

    // Extract code blocks
    const codeBlocks = this.extractCodeBlocks(response);
    
    if (codeBlocks.length === 0) {
      console.log('⚠️ No code blocks found in response');
      return;
    }

    console.log(`📄 Found ${codeBlocks.length} code block(s)`);

    // NEW: Check if we should create a project folder
    let projectFolder: string | null = null;
    
    if (codeBlocks.length >= 2) {  // Multiple files = project
      const projectName = this.inferProjectName(userMessage);
      
      if (projectName) {
        projectFolder = `${this.config.currentFolderPath || 'C:/Users/hi/Downloads'}/${projectName}`;
        
        // Create the folder
        await this.createProjectFolder(projectFolder);
        
        console.log(`📁 Project folder: ${projectFolder}`);
        showNotification(`📁 Creating project: ${projectName}`, 'info');
      }
    }

    // Determine file names and content
    const files = this.determineFileNamesAndContent(codeBlocks, userMessage, projectFolder);

    if (files.length === 0) {
      await this.promptUserForFileCreation(codeBlocks[0]);
      return;
    }

    // Show notification about project creation
    const folderName = projectFolder ? this.getFileName(projectFolder) : null;
    const message = folderName
      ? `🎨 Creating project "${folderName}" with ${files.length} files...`
      : files.length > 1 
        ? `🎨 Creating ${files.length} files for your project...`
        : '';
    
    if (message) {
      showNotification(message, 'info');
    }

    // Create all files
    const createdFiles: string[] = [];
    for (const file of files) {
      const success = await this.createFile(file);
      if (success) {
        createdFiles.push(this.getFileName(file.filePath));
      }
    }

    // Show success notification
    if (createdFiles.length > 0) {
      const successMessage = folderName
        ? `✅ Project "${folderName}" created with ${createdFiles.length} files!`
        : createdFiles.length === 1
          ? `✅ Created: ${createdFiles[0]}`
          : `✅ Created ${createdFiles.length} files: ${createdFiles.join(', ')}`;
      
      showNotification(successMessage, 'success');
    }

    // NEW: Auto-load project folder into file explorer
    if (projectFolder && createdFiles.length > 0) {
      await this.loadFolderIntoExplorer(projectFolder);
    }
  }

  /**
   * Extract code blocks from markdown response
   */
  private extractCodeBlocks(response: string): Array<{ language: string; code: string }> {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: Array<{ language: string; code: string }> = [];
    
    let match;
    while ((match = codeBlockRegex.exec(response)) !== null) {
      blocks.push({
        language: match[1] || 'plaintext',
        code: match[2].trim()
      });
    }

    return blocks;
  }

  /**
   * Determine file names from user message and code content
   */
  private determineFileNamesAndContent(
    codeBlocks: Array<{ language: string; code: string }>,
    userMessage: string,
    projectFolder: string | null = null
  ): FileCreationRequest[] {
    const files: FileCreationRequest[] = [];

    // Look for explicit file names in user message
    const fileNameMatches = userMessage.match(/(?:create|make|generate)\s+([a-zA-Z0-9._-]+\.[a-zA-Z]+)/gi);
    
    if (fileNameMatches && fileNameMatches.length === codeBlocks.length) {
      // User specified exact file names
      fileNameMatches.forEach((match, index) => {
        const fileName = match.replace(/(?:create|make|generate)\s+/i, '').trim();
        const codeBlock = codeBlocks[index];
        
        files.push({
          filePath: this.getFullPath(fileName, projectFolder),
          content: codeBlock.code,
          openAfterCreate: index === 0
        });
      });
    } else {
      // Infer from language and create standard structure
      codeBlocks.forEach((block, index) => {
        const fileName = this.inferFileNameFromLanguage(block.language, index, codeBlocks.length);
        
        files.push({
          filePath: this.getFullPath(fileName, projectFolder),
          content: block.code,
          openAfterCreate: index === 0
        });
      });
    }

    return files;
  }

  /**
   * Infer file name from code language
   */
  private inferFileNameFromLanguage(language: string, index: number, totalFiles: number): string {
    const lang = language.toLowerCase();
    
    // Standard web project structure
    if (totalFiles >= 3) {
      // Assume HTML/CSS/JS project
      if (lang === 'html') return 'index.html';
      if (lang === 'css') return 'styles.css';
      if (lang === 'javascript' || lang === 'js') return 'script.js';
      if (lang === 'json') return 'package.json';
    }
    
    // Single file or specific types
    const languageMap: Record<string, string> = {
      'html': 'index.html',
      'javascript': 'script.js',
      'js': 'script.js',
      'typescript': 'index.ts',
      'ts': 'index.ts',
      'css': 'styles.css',
      'scss': 'styles.scss',
      'json': 'package.json',
      'jsx': 'App.jsx',
      'tsx': 'App.tsx',
      'python': 'main.py',
      'py': 'main.py',
      'java': 'Main.java',
      'cpp': 'main.cpp',
      'c': 'main.c',
      'rust': 'main.rs',
      'go': 'main.go',
    };

    const baseFileName = languageMap[lang] || `file${index + 1}.txt`;
    
    // If multiple files of same type, add number
    if (index > 0 && totalFiles > 1) {
      const parts = baseFileName.split('.');
      const ext = parts.pop();
      const name = parts.join('.');
      return `${name}${index + 1}.${ext}`;
    }

    return baseFileName;
  }

  /**
   * Get full file path
   */
  private getFullPath(fileName: string, projectFolder: string | null = null): string {
    const basePath = projectFolder || this.config.currentFolderPath || 'C:/Users/hi/Downloads';
    return `${basePath}/${fileName}`;
  }

  /**
   * Create a file on disk
   */
  private async createFile(request: FileCreationRequest): Promise<boolean> {
    console.log('📝 Creating file:', request.filePath);

    try {
      // Write file using Tauri
      await invoke('write_file', {
        path: request.filePath,
        content: request.content  // Fixed: 'content' not 'contents'
      });

      console.log('✅ File created successfully');

      // Dispatch event for file explorer to refresh
      document.dispatchEvent(new CustomEvent('file-created', {
        detail: { path: request.filePath }
      }));

      // Open in editor if requested
      if (request.openAfterCreate) {
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent('file-selected', {
            detail: { path: request.filePath }
          }));
        }, 500);
      }

      // Refresh file explorer
      this.refreshFileExplorer();

      return true;

    } catch (error) {
      console.error('❌ Error creating file:', error);
      showNotification(`Failed to create file: ${error}`, 'error');
      return false;
    }
  }

  /**
   * Prompt user for file name
   */
  private async promptUserForFileCreation(codeBlock: { language: string; code: string }): Promise<void> {
    const fileName = await this.showFileNameDialog(codeBlock.language);
    
    if (fileName) {
      await this.createFile({
        filePath: this.getFullPath(fileName),
        content: codeBlock.code,
        openAfterCreate: true
      });
    }
  }

  /**
   * Show file name dialog
   */
  private showFileNameDialog(suggestedLanguage: string): Promise<string | null> {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'file-name-dialog';
      
      const suggestedName = this.inferFileNameFromLanguage(suggestedLanguage, 0, 1);
      
      dialog.innerHTML = `
        <div class="dialog-backdrop"></div>
        <div class="dialog-content">
          <h3>💾 Save Code to File</h3>
          <p>Enter file name:</p>
          <input 
            type="text" 
            id="file-name-input" 
            value="${suggestedName}"
            placeholder="filename.ext"
            autofocus
          />
          <div class="dialog-buttons">
            <button id="file-cancel" class="btn-secondary">Cancel</button>
            <button id="file-save" class="btn-primary">Save</button>
          </div>
        </div>
        <style>
          .file-name-dialog {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 10000;
          }
          .file-name-dialog .dialog-backdrop {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
          }
          .file-name-dialog .dialog-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #2d2d2d;
            padding: 24px;
            border-radius: 8px;
            min-width: 400px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          }
          .file-name-dialog h3 {
            margin: 0 0 16px 0;
            color: #cccccc;
          }
          .file-name-dialog p {
            margin: 0 0 12px 0;
            color: #999999;
          }
          .file-name-dialog input {
            width: 100%;
            background: #1e1e1e;
            border: 1px solid #3c3c3c;
            color: #cccccc;
            padding: 12px;
            border-radius: 4px;
            font-size: 14px;
            margin-bottom: 16px;
          }
          .file-name-dialog input:focus {
            outline: none;
            border-color: #007acc;
          }
          .file-name-dialog .dialog-buttons {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
          }
          .file-name-dialog button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          .file-name-dialog .btn-primary {
            background: #007acc;
            color: white;
          }
          .file-name-dialog .btn-secondary {
            background: #3c3c3c;
            color: #cccccc;
          }
        </style>
      `;

      document.body.appendChild(dialog);

      const input = dialog.querySelector('#file-name-input') as HTMLInputElement;
      const cancelBtn = dialog.querySelector('#file-cancel');
      const saveBtn = dialog.querySelector('#file-save');

      input.select();

      const cleanup = () => dialog.remove();

      cancelBtn?.addEventListener('click', () => {
        cleanup();
        resolve(null);
      });

      saveBtn?.addEventListener('click', () => {
        const fileName = input.value.trim();
        cleanup();
        resolve(fileName || null);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const fileName = input.value.trim();
          cleanup();
          resolve(fileName || null);
        } else if (e.key === 'Escape') {
          cleanup();
          resolve(null);
        }
      });
    });
  }

  /**
   * Get file name from full path
   */
  private getFileName(path: string): string {
    return path.split(/[/\\]/).pop() || path;
  }

  /**
   * Refresh file explorer
   */
  private refreshFileExplorer(): void {
    document.dispatchEvent(new CustomEvent('refresh-file-explorer'));
    
    if (this.config.currentFolderPath) {
      document.dispatchEvent(new CustomEvent('project-opened', {
        detail: { path: this.config.currentFolderPath }
      }));
    }
  }

  /**
   * Manually create file from chat
   */
  public async createFileFromChat(fileName: string, content: string): Promise<void> {
    await this.createFile({
      filePath: this.getFullPath(fileName),
      content: content,
      openAfterCreate: true
    });
  }

  /**
   * Update current open file
   */
  public async updateCurrentFile(content: string): Promise<void> {
    const editor = (window as any).monacoEditor;
    
    if (!editor) {
      showNotification('No file is currently open', 'warning');
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    const filePath = model.uri.path;
    
    try {
      await invoke('write_file', {
        path: filePath,
        content: content  // Fixed: 'content' not 'contents'
      });

      model.setValue(content);
      showNotification('✅ File updated', 'success');

    } catch (error) {
      console.error('Error updating file:', error);
      showNotification('Failed to update file', 'error');
    }
  }

  /**
   * Extract project name from user message
   */
  private inferProjectName(userMessage: string): string | null {
    const message = userMessage.toLowerCase();
    
    // Patterns to extract project name
    const patterns = [
      /create\s+(?:a\s+)?([a-z0-9-_\s]+?)(?:\s+with|\s+app|\s+ui|$)/i,
      /build\s+(?:a\s+|an\s+)?([a-z0-9-_\s]+?)(?:\s+with|\s+app|\s+ui|$)/i,
      /make\s+(?:a\s+|an\s+)?([a-z0-9-_\s]+?)(?:\s+with|\s+app|\s+ui|$)/i,
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        // Clean up the project name
        let projectName = match[1].trim()
          .replace(/\s+/g, '-')  // Replace spaces with hyphens
          .replace(/[^a-z0-9-_]/gi, '')  // Remove special chars
          .toLowerCase();
        
        // Remove common suffixes
        projectName = projectName
          .replace(/-app$/, '')
          .replace(/-ui$/, '')
          .replace(/-with$/, '');
        
        return projectName || null;
      }
    }
    
    return null;
  }

  /**
   * Create project folder
   */
  private async createProjectFolder(folderPath: string): Promise<boolean> {
    console.log('📁 Creating project folder:', folderPath);
    
    try {
      await invoke('create_directory', {
        path: folderPath
      });
      
      console.log('✅ Project folder created');
      return true;
    } catch (error) {
      // Folder might already exist - that's okay
      console.log('ℹ️ Folder already exists or created');
      return true;
    }
  }

  /**
   * Load folder into file explorer
   * Uses the same strategy as "File > Open Folder"
   */
  private async loadFolderIntoExplorer(folderPath: string): Promise<void> {
    try {
      console.log('📂 Loading folder into explorer:', folderPath);
      
      // Read directory tree (same as menuSystem.ts Line 1123)
      const files = await getDirectoryTree(folderPath, 5);
      
      // Dispatch event to update file explorer (same as menuSystem.ts Line 1130)
      const event = new CustomEvent('project-opened', {
        detail: {
          path: folderPath,
          files: files
        }
      });
      document.dispatchEvent(event);
      
      console.log('✅ Folder loaded into explorer');
    } catch (error) {
      console.error('❌ Failed to load folder into explorer:', error);
    }
  }
}

// Create singleton instance
export const aiChatFileIntegration = new AIChatFileIntegration();

// Make globally available
(window as any).aiChatFileIntegration = aiChatFileIntegration;

export default aiChatFileIntegration;