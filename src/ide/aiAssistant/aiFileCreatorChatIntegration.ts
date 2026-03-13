// ============================================================================
// FILE: src/ide/aiAssistant/aiChatFileIntegration.ts
// PURPOSE: Integrate AI Chat with File Explorer and Editor
// ============================================================================

import { invoke } from '@tauri-apps/api/core';
import { showNotification } from './notificationManager';

/**
 * AI Chat can now:
 * 1. Create new files in the current folder
 * 2. Update existing open files
 * 3. Generate multiple files from one request
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
}

export class AIChatFileIntegration {
  private config: ChatFileIntegrationConfig = {
    autoDetectFileRequests: true,
    autoOpenCreatedFiles: true,
    currentFolderPath: null
  };

  constructor() {
    this.setupListeners();
  }

  /**
   * Set the current folder path (from file explorer)
   */
  setCurrentFolder(folderPath: string): void {
    this.config.currentFolderPath = folderPath;
    console.log('📂 Current folder set to:', folderPath);
  }

  /**
   * Setup event listeners for AI Chat responses
   */
  private setupListeners(): void {
    // Listen for AI responses that might contain code
    document.addEventListener('ai-response-received', async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.response) {
        await this.handleAIResponse(detail.response, detail.userMessage);
      }
    });

    // Listen for file explorer folder changes
    document.addEventListener('folder-opened', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.path) {
        this.setCurrentFolder(detail.path);
      }
    });
  }

  /**
   * Handle AI response and detect if it contains code to save
   */
  private async handleAIResponse(response: string, userMessage: string): Promise<void> {
    if (!this.config.autoDetectFileRequests) return;

    // Check if user wants to create/save files
    const wantsToCreateFile = this.detectFileCreationIntent(userMessage);
    
    if (wantsToCreateFile) {
      await this.processFileCreationFromResponse(response, userMessage);
    }
  }

  /**
   * Detect if user message indicates they want to create a file
   */
  private detectFileCreationIntent(message: string): boolean {
    const triggers = [
      'create file',
      'create a file',
      'generate file',
      'make file',
      'save to file',
      'write to file',
      'add to file',
      'create index.html',
      'create script.js',
      'create styles.css',
      'create package.json',
      // File extensions
      /\.html$/i,
      /\.js$/i,
      /\.ts$/i,
      /\.css$/i,
      /\.json$/i,
      /\.tsx$/i,
      /\.jsx$/i,
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
   * Process AI response and extract code blocks to save as files
   */
  private async processFileCreationFromResponse(response: string, userMessage: string): Promise<void> {
    console.log('🔍 Processing AI response for file creation...');

    // Extract code blocks from response
    const codeBlocks = this.extractCodeBlocks(response);
    
    if (codeBlocks.length === 0) {
      console.log('⚠️ No code blocks found in response');
      return;
    }

    console.log(`📄 Found ${codeBlocks.length} code block(s)`);

    // Try to determine file names from user message or code content
    const files = this.determineFileNamesAndContent(codeBlocks, userMessage);

    if (files.length === 0) {
      // No automatic file names detected, ask user
      await this.promptUserForFileCreation(codeBlocks[0]);
      return;
    }

    // Create the files
    for (const file of files) {
      await this.createFile(file);
    }
  }

  /**
   * Extract code blocks from markdown-formatted response
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
    userMessage: string
  ): FileCreationRequest[] {
    const files: FileCreationRequest[] = [];

    // Look for explicit file names in user message
    const fileNameMatches = userMessage.match(/(?:create|make|generate)\s+([a-zA-Z0-9._-]+\.[a-zA-Z]+)/gi);
    
    if (fileNameMatches) {
      // User specified file name(s)
      fileNameMatches.forEach((match, index) => {
        const fileName = match.replace(/(?:create|make|generate)\s+/i, '').trim();
        const codeBlock = codeBlocks[index] || codeBlocks[0];
        
        files.push({
          filePath: this.getFullPath(fileName),
          content: codeBlock.code,
          openAfterCreate: index === 0
        });
      });
    } else {
      // Try to infer from language
      codeBlocks.forEach((block, index) => {
        const fileName = this.inferFileNameFromLanguage(block.language, index);
        
        files.push({
          filePath: this.getFullPath(fileName),
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
  private inferFileNameFromLanguage(language: string, index: number): string {
    const languageMap: Record<string, string> = {
      'html': 'index.html',
      'javascript': 'script.js',
      'typescript': 'index.ts',
      'css': 'styles.css',
      'json': 'package.json',
      'jsx': 'App.jsx',
      'tsx': 'App.tsx',
      'python': 'main.py',
      'java': 'Main.java',
    };

    const baseFileName = languageMap[language.toLowerCase()] || `file${index + 1}.txt`;
    
    // If multiple files, add number
    if (index > 0) {
      const parts = baseFileName.split('.');
      const ext = parts.pop();
      const name = parts.join('.');
      return `${name}${index + 1}.${ext}`;
    }

    return baseFileName;
  }

  /**
   * Get full file path (current folder + filename)
   */
  private getFullPath(fileName: string): string {
    if (this.config.currentFolderPath) {
      return `${this.config.currentFolderPath}/${fileName}`;
    }
    
    // Fallback to Downloads
    return `C:/Users/hi/Downloads/${fileName}`;
  }

  /**
   * Create a file on disk
   */
  private async createFile(request: FileCreationRequest): Promise<void> {
    console.log('📝 Creating file:', request.filePath);

    try {
      // Write file using Tauri
      await invoke('write_file', {
        path: request.filePath,
        contents: request.content
      });

      console.log('✅ File created successfully');
      
      // Show notification
      showNotification(`✅ Created: ${this.getFileName(request.filePath)}`, 'success');

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

    } catch (error) {
      console.error('❌ Error creating file:', error);
      showNotification(`Failed to create file: ${error}`, 'error');
    }
  }

  /**
   * Prompt user to specify file name
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
   * Show dialog to get file name from user
   */
  private showFileNameDialog(suggestedLanguage: string): Promise<string | null> {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'file-name-dialog';
      
      const suggestedName = this.inferFileNameFromLanguage(suggestedLanguage, 0);
      
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
   * Get just the file name from full path
   */
  private getFileName(path: string): string {
    return path.split(/[/\\]/).pop() || path;
  }

  /**
   * Refresh file explorer
   */
  private refreshFileExplorer(): void {
    // Dispatch refresh event
    document.dispatchEvent(new CustomEvent('refresh-file-explorer'));
    
    // Also try to trigger project reload if available
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
   * Update current open file with content
   */
  public async updateCurrentFile(content: string): Promise<void> {
    // Get current editor content
    const editor = (window as any).monacoEditor;
    
    if (!editor) {
      showNotification('No file is currently open', 'warning');
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    const filePath = model.uri.path;
    
    try {
      // Write to file
      await invoke('write_file', {
        path: filePath,
        contents: content
      });

      // Update editor
      model.setValue(content);

      showNotification('✅ File updated', 'success');

    } catch (error) {
      console.error('Error updating file:', error);
      showNotification('Failed to update file', 'error');
    }
  }
}

// Create singleton instance
export const aiChatFileIntegration = new AIChatFileIntegration();

// Make it globally available
(window as any).aiChatFileIntegration = aiChatFileIntegration;

export default aiChatFileIntegration;