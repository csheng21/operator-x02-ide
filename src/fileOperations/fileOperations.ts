// src/fileOperations/fileOperations.ts
import { FileInfo } from '../types/fileTypes';
import { isTauriAvailable } from '../utils/browserUtils';

/**
 * Initialize file operation system
 */
export function initializeFileOperations(): void {
  console.log('Initializing file operations system');
  detectPlatform();
  registerKeyboardShortcuts();
}

/**
 * Detect platform capabilities
 */
function detectPlatform(): void {
  const hasTauri = isTauriAvailable();
  console.log(`Platform detection: ${hasTauri ? 'Tauri desktop' : 'Browser environment'}`);
  
  if (hasTauri) {
    console.log('Native file system access is available');
  } else {
    console.log('Using browser fallbacks for file operations');
  }
}

/**
 * Register keyboard shortcuts for file operations
 */
function registerKeyboardShortcuts(): void {
  document.addEventListener('keydown', async (e) => {
    // Save: Ctrl+S or Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      
      // Save As: Ctrl+Shift+S or Cmd+Shift+S
      const isSaveAs = e.shiftKey;
      handleSaveOperation(isSaveAs);
    }
    
    // Open: Ctrl+O or Cmd+O
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      handleOpenOperation();
    }
    
    // New: Ctrl+N or Cmd+N
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      handleNewOperation();
    }
  });
  
  console.log('Keyboard shortcuts registered for file operations');
}

/**
 * Save file using Tauri
 */
async function saveFileTauri(content: string, targetPath: string | null, defaultName: string, currentFilePath?: string): Promise<string | null> {
  try {
    if (!isTauriAvailable()) {
      console.error('Tauri is not available');
      if ((window as any).showNotification) {
        (window as any).showNotification('File system not available in browser', 'error');
      }
      return null;
    }

    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');

    let filePath = targetPath;

    // If no target path, show save dialog
    if (!filePath) {
      // Determine default path for save dialog
      let defaultPath = defaultName;
      
      // If we have a current file path, use its directory
      if (currentFilePath && currentFilePath !== 'Untitled') {
        // Extract directory from current file path
        const pathParts = currentFilePath.split(/[/\\]/);
        pathParts.pop(); // Remove filename
        const directory = pathParts.join('/');
        defaultPath = `${directory}/${defaultName}`;
        console.log(`💾 Save dialog will open in: ${directory}`);
      } else {
        console.log(`💾 Save dialog will open in default location with filename: ${defaultName}`);
      }
      
      filePath = await save({
        defaultPath: defaultPath,
        filters: [{
          name: 'All Files',
          extensions: ['*']
        }]
      });

      if (!filePath) {
        console.log('Save dialog was cancelled');
        return null;
      }
    }

    // Write the file
    try {
      await writeTextFile(filePath, content);
      console.log('✅ File saved successfully:', filePath);

      // Show notification
      if ((window as any).showNotification) {
        const fileName = filePath.split(/[/\\]/).pop() || 'file';
        (window as any).showNotification(`Saved: ${fileName}`, 'success');
      }

      return filePath;
    } catch (writeError: any) {
      // Check if this is a forbidden path error
      if (writeError?.message?.includes('forbidden path') || writeError?.toString()?.includes('forbidden path')) {
        console.warn('⚠️ Path not in allowed scope, showing save dialog:', filePath);
        
        // Show notification
        if ((window as any).showNotification) {
          (window as any).showNotification('Path not allowed, please choose save location', 'warning');
        }
        
        // Determine default path for retry
        let defaultPath = defaultName;
        if (currentFilePath && currentFilePath !== 'Untitled') {
          const pathParts = currentFilePath.split(/[/\\]/);
          pathParts.pop();
          const directory = pathParts.join('/');
          defaultPath = `${directory}/${defaultName}`;
        }
        
        // Show save dialog to let user choose an allowed location
        filePath = await save({
          defaultPath: defaultPath,
          filters: [{
            name: 'All Files',
            extensions: ['*']
          }]
        });

        if (!filePath) {
          console.log('Save dialog was cancelled');
          return null;
        }

        // Try to write again with the new path
        await writeTextFile(filePath, content);
        console.log('✅ File saved successfully to new location:', filePath);

        // Show notification
        if ((window as any).showNotification) {
          const fileName = filePath.split(/[/\\]/).pop() || 'file';
          (window as any).showNotification(`Saved: ${fileName}`, 'success');
        }

        return filePath;
      }
      
      // Re-throw other errors
      throw writeError;
    }
  } catch (error) {
    console.error('❌ Error saving file:', error);
    if ((window as any).showNotification) {
      (window as any).showNotification('Failed to save file', 'error');
    }
    return null;
  }
}

/**
 * Open file using Tauri
 */
async function openFileTauri(): Promise<{ content: string; path: string } | null> {
  try {
    if (!isTauriAvailable()) {
      console.error('Tauri is not available');
      if ((window as any).showNotification) {
        (window as any).showNotification('File system not available in browser', 'error');
      }
      return null;
    }

    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readTextFile } = await import('@tauri-apps/plugin-fs');

    // Show open dialog
    const filePath = await open({
      multiple: false,
      filters: [{
        name: 'All Files',
        extensions: ['*']
      }]
    });

    if (!filePath || typeof filePath !== 'string') {
      console.log('Open dialog was cancelled');
      return null;
    }

    // Read the file
    const content = await readTextFile(filePath);
    console.log('✅ File opened successfully:', filePath);

    // Show notification
    if ((window as any).showNotification) {
      const fileName = filePath.split(/[/\\]/).pop() || 'file';
      (window as any).showNotification(`Opened: ${fileName}`, 'success');
    }

    return { content, path: filePath };
  } catch (error) {
    console.error('❌ Error opening file:', error);
    if ((window as any).showNotification) {
      (window as any).showNotification('Failed to open file', 'error');
    }
    return null;
  }
}

/**
 * Handle save operation
 * @param isSaveAs Whether this is a Save As operation
 * @param providedFilePath Optional file path provided by caller (e.g., tab manager)
 */
export async function handleSaveOperation(isSaveAs: boolean = false, providedFilePath?: string): Promise<void> {
  console.log(`💾 Save operation triggered (Save As: ${isSaveAs})`);
  
  try {
    // Get current editor content
    const editor = window.monaco?.editor.getEditors()[0];
    if (!editor) {
      console.error('❌ No active editor found');
      if ((window as any).showNotification) {
        (window as any).showNotification('No active editor', 'error');
      }
      return;
    }
    
    const content = editor.getValue();
    console.log(`📝 Content length: ${content.length} characters`);
    
    // Get current file path - prioritize tab manager data
    let currentFilePath = providedFilePath || '';
    
    // If not provided, try tab manager
    if (!currentFilePath && (window as any).tabManager?.currentFile) {
      currentFilePath = (window as any).tabManager.currentFile.path || '';
      console.log(`📂 Got file path from tab manager: "${currentFilePath}"`);
    }
    
    // Fallback to DOM element
    if (!currentFilePath) {
      currentFilePath = document.getElementById('file-path-status')?.textContent || '';
      console.log(`📂 Got file path from DOM: "${currentFilePath}"`);
    }
    
    console.log(`📂 Final file path: "${currentFilePath}"`);
    
    // Get filename
    let currentFileName = '';
    if (currentFilePath && currentFilePath !== 'Untitled') {
      currentFileName = currentFilePath.split(/[/\\]/).pop() || '';
    } else {
      // If no path, try to guess from tab manager or editor language
      if ((window as any).tabManager?.currentFile?.name) {
        currentFileName = (window as any).tabManager.currentFile.name;
        console.log(`📄 Got file name from tab manager: "${currentFileName}"`);
      } else {
        const model = editor.getModel();
        if (model) {
          const language = model.getLanguageId();
          currentFileName = getDefaultFileName(language);
        } else {
          currentFileName = 'document.txt';
        }
      }
    }
    
    console.log(`📄 File name: "${currentFileName}"`);
    
    // For Save As or new files, always ask for location
    const targetPath = (isSaveAs || currentFilePath === '' || currentFilePath === 'Untitled') 
      ? null 
      : currentFilePath;
    
    console.log(`🎯 Target path: ${targetPath || '(will show dialog)'}`);
    
    // Save the file using Tauri - pass currentFilePath for correct dialog directory
    const savedPath = await saveFileTauri(content, targetPath, currentFileName, currentFilePath);
    
    if (savedPath) {
      console.log('✅ File saved successfully:', savedPath);
      updateUIAfterSave(savedPath);
      
      // Update tab manager if it exists
      if ((window as any).tabManager?.updateTabPath) {
        (window as any).tabManager.updateTabPath(savedPath);
      }
    } else {
      console.log('⚠️ Save operation was cancelled or failed');
    }
  } catch (error) {
    console.error('❌ Error in save operation:', error);
    if ((window as any).showNotification) {
      (window as any).showNotification('Save operation failed', 'error');
    }
  }
}

/**
 * Handle open operation
 */
export async function handleOpenOperation(): Promise<void> {
  console.log('📂 Open operation triggered');
  
  try {
    // Open file dialog
    const fileInfo = await openFileTauri();
    
    if (fileInfo) {
      console.log('✅ File opened:', fileInfo.path);
      openInEditor(fileInfo.content, fileInfo.path);
    } else {
      console.log('⚠️ Open operation was cancelled');
    }
  } catch (error) {
    console.error('❌ Error in open operation:', error);
    if ((window as any).showNotification) {
      (window as any).showNotification('Open operation failed', 'error');
    }
  }
}

/**
 * Handle new file operation
 */
export async function handleNewOperation(): Promise<void> {
  console.log('📄 New file operation triggered');
  
  // Get editor
  const editor = window.monaco?.editor.getEditors()[0];
  if (!editor) {
    console.error('❌ No editor is currently active');
    if ((window as any).showNotification) {
      (window as any).showNotification('No active editor', 'error');
    }
    return;
  }
  
  // Create a new empty model
  const model = window.monaco.editor.createModel('', 'plaintext');
  
  // Set the model to the editor
  editor.setModel(model);
  
  // Update UI elements
  const pathStatus = document.getElementById('file-path-status');
  if (pathStatus) {
    pathStatus.textContent = 'Untitled';
  }
  
  const langStatus = document.getElementById('language-status');
  if (langStatus) {
    langStatus.textContent = 'Plain Text';
  }
  
  // Update window title
  document.title = 'Untitled - Deepseek Code IDE';
  
  console.log('✅ New file created');
}

/**
 * Open content in the editor
 * @param content Content to open
 * @param filepath Path to the file
 */
export function openInEditor(content: string, filepath: string): void {
  console.log('📝 Opening in editor:', filepath);
  
  // Get editor
  const editor = window.monaco?.editor.getEditors()[0];
  if (!editor) {
    console.error('❌ No editor is currently active');
    if ((window as any).showNotification) {
      (window as any).showNotification('No active editor', 'error');
    }
    return;
  }
  
  // Create a new model with the content
  const model = window.monaco.editor.createModel(
    content,
    getLanguageFromPath(filepath)
  );
  
  // Set the model
  editor.setModel(model);
  
  // Update UI elements
  updateUIAfterOpen(filepath);
  
  console.log('✅ Content loaded in editor');
}

/**
 * Update UI after saving a file
 * @param filepath Path where the file was saved
 */
function updateUIAfterSave(filepath: string): void {
  console.log('🎨 Updating UI after save:', filepath);
  
  // Extract just the filename for display in some cases
  const filename = filepath.split(/[/\\]/).pop() || filepath;
  
  // Update status bar if it exists
  const statusBar = document.getElementById('status-bar');
  if (statusBar) {
    const statusMsg = document.createElement('div');
    statusMsg.className = 'status-message success';
    statusMsg.textContent = `File saved: ${filepath}`;
    statusBar.appendChild(statusMsg);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (statusMsg.parentNode) {
        statusMsg.parentNode.removeChild(statusMsg);
      }
    }, 3000);
  }
  
  // Update file path in status
  const pathStatus = document.getElementById('file-path-status');
  if (pathStatus) {
    pathStatus.textContent = filepath;
  }
  
  // Update language indicator
  const langStatus = document.getElementById('language-status');
  if (langStatus) {
    const extension = filename.split('.').pop() || '';
    const language = getLanguageFromExtension(extension);
    langStatus.textContent = language;
  }
  
  // Update window title
  try {
    const appName = 'Deepseek Code IDE';
    document.title = `${filename} - ${appName}`;
  } catch (titleError) {
    console.error('Error updating window title:', titleError);
  }
  
  console.log('✅ UI updated');
}

/**
 * Update UI after opening a file
 * @param filepath Path to the opened file
 */
function updateUIAfterOpen(filepath: string): void {
  console.log('🎨 Updating UI after open:', filepath);
  
  // Update file path in status
  const pathStatus = document.getElementById('file-path-status');
  if (pathStatus) {
    pathStatus.textContent = filepath;
  }
  
  // Update language indicator
  const langStatus = document.getElementById('language-status');
  if (langStatus) {
    langStatus.textContent = getLanguageFromPath(filepath);
  }
  
  // Update window title
  try {
    const appName = 'Deepseek Code IDE';
    document.title = `${filepath.split(/[/\\]/).pop() || filepath} - ${appName}`;
  } catch (titleError) {
    console.error('Error updating window title:', titleError);
  }
  
  console.log('✅ UI updated');
}

/**
 * Get language from file extension
 * @param extension File extension
 * @returns Human-readable language name
 */
function getLanguageFromExtension(extension: string): string {
  switch (extension.toLowerCase()) {
    case 'js':
      return 'JavaScript';
    case 'ts':
      return 'TypeScript';
    case 'py':
      return 'Python';
    case 'html':
      return 'HTML';
    case 'css':
      return 'CSS';
    case 'json':
      return 'JSON';
    case 'md':
      return 'Markdown';
    default:
      return 'Plain Text';
  }
}

/**
 * Get default filename based on language
 * @param language Language identifier
 * @returns Default filename
 */
function getDefaultFileName(language: string): string {
  switch (language) {
    case 'python':
      return 'hello.py';
    case 'javascript':
      return 'script.js';
    case 'typescript':
      return 'script.ts';
    case 'html':
      return 'index.html';
    case 'css':
      return 'styles.css';
    case 'markdown':
      return 'readme.md';
    case 'json':
      return 'data.json';
    default:
      return 'document.txt';
  }
}

/**
 * Determine language from file path
 * @param path File path
 * @returns Monaco editor language identifier
 */
function getLanguageFromPath(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase() || '';
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'jsx': 'javascript',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'php': 'php',
    'rb': 'ruby',
    'rs': 'rust',
    'swift': 'swift',
    'sh': 'shell',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'sql': 'sql'
  };

  return languageMap[extension] || 'plaintext';
}

// Add to Window interface for Monaco
declare global {
  interface Window {
    monaco: any;
  }
}