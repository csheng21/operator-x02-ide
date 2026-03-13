// ============================================================================
// FILE: src/ide/aiAssistant/aiFileCreator.ts
// PURPOSE: AI File Creator - FIXED VERSION
// ============================================================================

import { callGenericAPI } from './apiProviderManager';
import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// API WRAPPER - SIMPLIFIED AND FIXED
// ============================================================================

async function callAI(prompt: string): Promise<string> {
  try {
    const response = await callGenericAPI(prompt);
    return response;
  } catch (error) {
    console.error('❌ API call failed:', error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function showNotification(message: string, type: string = 'info'): void {
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3'};
    color: white;
    padding: 12px 24px;
    border-radius: 6px;
    z-index: 100000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    font-size: 14px;
  `;
  
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

async function createFileOnDisk(filePath: string, content: string): Promise<boolean> {
  try {
    const win = window as any;
    
    // Try Tauri writeFile
    if (win.__TAURI__ && win.__TAURI__.fs) {
      await win.__TAURI__.fs.writeTextFile(filePath, content);
      return true;
    }
    
    // Try window.fs
    if (win.fs && win.fs.writeFile) {
      await win.fs.writeFile(filePath, content);
      return true;
    }
    
    // Try window.createFile
    if (win.createFile) {
      await win.createFile(filePath, content);
      return true;
    }
    
    console.warn('⚠️ No file system API available');
    return false;
    
  } catch (error) {
    console.error('❌ Failed to create file:', error);
    return false;
  }
}

// ============================================================================
// ✅ PROPER FILE EXPLORER REFRESH
// ============================================================================

async function refreshFileExplorerProperly(folderPath: string): Promise<void> {
  console.log('🔄 Refreshing file explorer...');
  console.log('📁 Folder:', folderPath);
  
  try {
    // Read directory tree
    const files = await invoke('read_directory_recursive', {
      path: folderPath,
      maxDepth: 5
    });
    
    console.log('✅ Directory tree loaded:', files);
    
    // Dispatch event
    document.dispatchEvent(new CustomEvent('project-opened', {
      detail: { path: folderPath, files }
    }));
    
    console.log('✅ File explorer refreshed successfully');
    
  } catch (error) {
    console.error('❌ Error refreshing file explorer:', error);
    console.log('⚠️ Falling back to generic refresh...');
    refreshFileExplorerFallback();
  }
}

function refreshFileExplorerFallback(): void {
  const event = new CustomEvent('file-tree-refresh', { detail: { action: 'refresh' } });
  document.dispatchEvent(event);
  
  if ((window as any).refreshFileExplorer) {
    (window as any).refreshFileExplorer();
  }
  
  setTimeout(() => {
    const refreshBtn = document.querySelector('.refresh-button, [title="Refresh"], button[aria-label="Refresh"]');
    if (refreshBtn) {
      (refreshBtn as HTMLElement).click();
      console.log('🔄 Triggered file explorer refresh button');
    }
    
    const fileExplorer = document.querySelector('.file-explorer, #file-explorer');
    if (fileExplorer) {
      const reloadEvent = new Event('reload', { bubbles: true });
      fileExplorer.dispatchEvent(reloadEvent);
      console.log('🔄 Triggered file explorer reload event');
    }
  }, 100);
}

async function openFileInEditor(filePath: string, content?: string): Promise<void> {
  const win = window as any;
  
  if (win.openFileInEditor) {
    await win.openFileInEditor(filePath, content);
  } else if (win.monaco && win.editor) {
    win.editor.setValue(content || '');
  }
  
  const event = new CustomEvent('open-file-request', {
    detail: { filePath, content }
  });
  document.dispatchEvent(event);
}

// ============================================================================
// MAIN CLASS
// ============================================================================

export class AIFileCreatorUniversal {
  private isProcessing = false;
  
  async createFilesFromDescription(request: any): Promise<any> {
    if (this.isProcessing) {
      console.warn('⚠️ Already processing a request');
      return { success: false, error: 'Already processing' };
    }
    
    this.isProcessing = true;
    
    try {
      const { description, targetFolder, projectType = 'auto', options = {} } = request;
      
      console.log('\n🚀 Starting AI File Creator');
      console.log('📝 Description:', description);
      console.log('📂 Target folder:', targetFolder || '(auto)');
      console.log('🎯 Project type:', projectType);
      console.log('⚙️ Options:', options);
      
      // Build the prompt
      const prompt = this.buildPrompt(description, projectType, options);
      
      // Call AI
      console.log('🤖 Calling AI...');
      const aiResponse = await callAI(prompt);
      console.log('✅ AI Response received');
      
      // Parse response
      const files = this.parseAIResponse(aiResponse);
      console.log(`📄 Parsed ${files.length} files from AI response`);
      
      if (files.length === 0) {
        console.warn('⚠️ No files parsed from AI response');
        return {
          success: false,
          error: 'No files generated',
          files: []
        };
      }
      
      // Store target folder for refresh
      const actualTargetFolder = targetFolder || (window as any).currentFolderPath || '';
      
      // Create files on disk
      const createdFiles = await this.createFiles(files, actualTargetFolder);
      
      console.log('✅ Created', createdFiles.length, 'files');
      
      // Refresh file explorer
      if (actualTargetFolder && createdFiles.length > 0) {
        console.log('🔄 Refreshing file explorer...');
        await refreshFileExplorerProperly(actualTargetFolder);
        
        // Open first file
        if (createdFiles[0]) {
          setTimeout(() => {
            openFileInEditor(createdFiles[0].path, createdFiles[0].content);
          }, 500);
        }
      }
      
      showNotification(`✅ Created ${createdFiles.length} files!`, 'success');
      
      return {
        success: true,
        files: createdFiles,
        projectStructure: this.generateProjectStructure(createdFiles)
      };
      
    } catch (error) {
      console.error('❌ Error in createFilesFromDescription:', error);
      return {
        success: false,
        error: String(error),
        files: []
      };
    } finally {
      this.isProcessing = false;
    }
  }
  
  private buildPrompt(description: string, projectType: string, options: any): string {
    return `You are a code generator. Generate complete, production-ready code based on this request:

${description}

Requirements:
${options.includeTests ? '- Include unit tests' : ''}
${options.includeStyles ? '- Include styling' : ''}
${options.includeTypes ? '- Include TypeScript types' : ''}

Output Format:
Provide the response as a JSON array where each object has:
{
  "path": "relative/path/to/file.ext",
  "content": "file content here",
  "description": "brief description"
}

Example:
[
  {
    "path": "src/App.tsx",
    "content": "import React from 'react';\\n\\nexport default function App() {\\n  return <div>Hello</div>;\\n}",
    "description": "Main App component"
  }
]

Generate the files now:`;
  }
  
  private parseAIResponse(response: string): any[] {
    try {
      // Try to find JSON array in response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed) ? parsed : [];
      }
      
      // Try parsing entire response
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : [];
      
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return [];
    }
  }
  
  private async createFiles(files: any[], targetFolder?: string): Promise<any[]> {
    const created = [];
    const baseFolder = targetFolder || (window as any).currentFolderPath || '';
    
    console.log('📂 Target folder:', baseFolder || '(project root)');
    
    for (const file of files) {
      const fullPath = this.joinPaths(baseFolder, file.path);
      console.log(`💾 Creating: ${fullPath}`);
      
      const success = await createFileOnDisk(fullPath, file.content);
      if (success) {
        created.push({ ...file, path: fullPath });
        console.log(`  ✅ Created successfully`);
      } else {
        console.error(`  ❌ Failed to create ${fullPath}`);
      }
    }
    
    if (created.length > 0) {
      console.log(`\n📊 Created ${created.length} files in: ${baseFolder || 'project root'}`);
      console.log('Files:', created.map(f => f.path.split('/').pop()).join(', '));
    }
    
    return created;
  }
  
  private joinPaths(...parts: string[]): string {
    return parts
      .filter(p => p && p.length > 0)
      .join('/')
      .replace(/\/+/g, '/')
      .replace(/\\/g, '/');
  }
  
  private generateProjectStructure(files: any[]): string {
    return files.map(f => {
      const indent = (f.path.match(/\//g) || []).length;
      const name = f.path.split('/').pop();
      return '  '.repeat(indent) + '- ' + name;
    }).join('\n');
  }
}

// Export singleton instance
export const aiFileCreator = new AIFileCreatorUniversal();

// Legacy export for backwards compatibility
export async function createFilesWithAI(description: string, targetFolder?: string): Promise<any> {
  return aiFileCreator.createFilesFromDescription({
    description,
    targetFolder,
    projectType: 'auto',
    options: {}
  });
}