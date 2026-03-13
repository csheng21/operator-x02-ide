// src/fileOperations/saveHandler.ts
import { updateUIAfterSave } from './uiUpdater';
import { getDefaultFileName, getLanguageFromExtension } from '../utils/fileUtils';
import { invoke } from '@tauri-apps/api/core';
import { addFileManagerButton } from '../ui/fileManager';

/**
 * Normalize filename by removing numeric suffixes like (1), (2), etc.
 */
function getNormalizedFileName(fileName: string): string {
  // Check if filename has a number pattern like (1), (2), etc.
  const normalizedName = fileName.replace(/\s*\(\d+\)\s*(\.[^.]+)?$/, '$1');
  return normalizedName;
}

/**
 * Normalize file paths to prevent duplicates
 * Converts all paths to use backslashes for consistency on Windows
 */
function normalizePath(path: string): string {
  if (!path) return path;
  // Convert all forward slashes to backslashes for Windows consistency
  return path.replace(/\//g, '\\');
}

/**
 * Notify the modified files tracker that a file was saved
 * This removes the orange indicator and shows green confirmation
 */
function notifyFileSaved(filePath: string): void {
  try {
    const tracker = (window as any).__modifiedFilesTracker;
    if (tracker && typeof tracker.removeModified === 'function') {
      // ✅ Normalize the path before notifying
      const normalizedPath = normalizePath(filePath);
      console.log('🔔 Notifying tracker that file was saved:', normalizedPath);
      
      // This will:
      // 1. Remove the orange "modified" indicator
      // 2. Show a green "saved" indicator
      // 3. Auto-fade the green indicator after 3 seconds
      tracker.removeModified(normalizedPath);
    } else {
      console.warn('⚠️ Modified files tracker not available');
    }
  } catch (error) {
    console.error('❌ Error notifying file saved:', error);
  }
}

/**
 * Display a notification about successful save
 */
function displaySaveSuccessNotification(fileName: string): void {
  // Create notification
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.backgroundColor = '#333';
  notification.style.color = '#fff';
  notification.style.padding = '15px';
  notification.style.borderRadius = '5px';
  notification.style.zIndex = '9999';
  notification.innerHTML = `
    <div style="margin-bottom:10px;">File saved successfully: ${fileName}</div>
    <div style="color:#aaffaa;">Using File System API to save at original location.</div>
    <button id="dismissNotification" style="margin-top:10px;float:right;background:#444;border:none;color:white;padding:5px 10px;cursor:pointer;">Dismiss</button>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 4000);
  
  // Manual dismiss
  document.getElementById('dismissNotification')?.addEventListener('click', () => {
    document.body.removeChild(notification);
  });
}

/**
 * Display notification about API limitations
 */
function displayApiLimitationNotification(): void {
  // Create notification
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.backgroundColor = '#333';
  notification.style.color = '#fff';
  notification.style.padding = '15px';
  notification.style.borderRadius = '5px';
  notification.style.zIndex = '9999';
  notification.innerHTML = `
    <div style="margin-bottom:10px; color:#ffcc00;">File System API Limitation</div>
    <div>Your browser doesn't support saving to original locations.</div>
    <div style="margin-top:8px;">Please use Chrome or Edge for better file handling.</div>
    <button id="dismissNotification" style="margin-top:10px;float:right;background:#444;border:none;color:white;padding:5px 10px;cursor:pointer;">Dismiss</button>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-dismiss after 8 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 8000);
  
  // Manual dismiss
  document.getElementById('dismissNotification')?.addEventListener('click', () => {
    document.body.removeChild(notification);
  });
}

/**
 * Direct save to a specific path (used for simple saves)
 */
export async function directSaveFile(content: string, filePath: string): Promise<string | null> {
  try {
    // Priority 1: Try the File System Access API if available
    if ('showSaveFilePicker' in window) {
      const fileName = filePath.split(/[/\\]/).pop() || 'file.txt';
      console.log('Using File System Access API for saving');
      
      try {
        // Import the saveWithFileSystemAccessAPI function
        const { saveWithFileSystemAccessAPI } = await import('../fileSystem');
        const result = await saveWithFileSystemAccessAPI(content, fileName);
        if (result) {
          displaySaveSuccessNotification(fileName);
          
          // ✅ CRITICAL: Notify the tracker that file was saved
          notifyFileSaved(filePath);
          
          return result;
        }
      } catch (fsError) {
        console.error('File System Access API failed:', fsError);
      }
    }
    
    // Priority 2: Use Tauri in desktop environment
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      try {
        await invoke('write_file', { path: filePath, content });
        displaySaveSuccessNotification(filePath.split(/[/\\]/).pop() || 'file');
        
        // ✅ CRITICAL: Notify the tracker that file was saved
        notifyFileSaved(filePath);
        
        return filePath;
      } catch (error) {
        console.error('Error saving with Tauri:', error);
      }
    }
    
    // If we get here, neither method worked
    displayApiLimitationNotification();
    return null;
  } catch (error) {
    console.error('Error saving file:', error);
    return null;
  }
}

/**
 * Setup keyboard shortcuts and save handlers
 */
export function setupDirectSaveHandler() {
  console.log('Setting up direct save keyboard shortcut with File System API priority');
  
  document.addEventListener('keydown', async (e) => {
    // Check for Ctrl+S or Cmd+S (with or without Shift for Save As)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      const isSaveAs = e.shiftKey;
      console.log('Save shortcut detected', isSaveAs ? '(Save As)' : '');
      e.preventDefault();
      
      try {
        // Get current editor content
        const editor = window.monaco?.editor.getEditors()[0];
        if (!editor) {
          console.error('No active editor found');
          return;
        }
        
        const content = editor.getValue();
        
        // Get file information
        let currentFilePath = document.getElementById('file-path-status')?.textContent || '';
        
        // Get the stored original path and filename if available
        const storedFilePath = window.localStorage.getItem('currentFilePath');
        const storedFileName = window.localStorage.getItem('currentFileName');
        
        // Use stored filename if available
        let currentFileName = storedFileName || '';
        
        // If no stored filename, try to get from current file path
        if (!currentFileName && currentFilePath && currentFilePath !== 'Untitled') {
          currentFileName = currentFilePath.split(/[/\\]/).pop() || '';
        }
        
        // Use stored path if available and not doing Save As
        if (storedFilePath && storedFilePath !== 'Untitled' && !isSaveAs) {
          currentFilePath = storedFilePath;
          if (!currentFileName) {
            currentFileName = storedFileName || '';
          }
        }
        
        // If still no filename, try to detect from the content
        if (!currentFileName) {
          const model = editor.getModel();
          if (model) {
            // Check first line for filename hints - but don't hardcode any names
            const firstLine = model.getLineContent(1) || '';
            if (firstLine.startsWith('//') && firstLine.includes('.')) {
              // Try to extract filename from comment
              const match = firstLine.match(/\/\/\s*([\w.-]+\.\w+)/);
              if (match && match[1]) {
                currentFileName = match[1];
              }
            }
          }
        }
        
        // If still no filename, use language-specific default
        if (!currentFileName) {
          const model = editor.getModel();
          if (model) {
            const language = model.getLanguageId();
            currentFileName = getDefaultFileName(language);
          } else {
            currentFileName = 'document.txt';
          }
        }
        
        // Clean up handle:// or browser:// prefixes if present
        if (currentFilePath.startsWith('handle://')) {
          currentFileName = currentFilePath.replace('handle://', '');
        } else if (currentFilePath.startsWith('browser://')) {
          currentFileName = currentFilePath.replace('browser://', '');
        }
        
        try {
          // Check if File System Access API is available
          if ('showSaveFilePicker' in window) {
            const { saveWithFileSystemAccessAPI } = await import('../fileSystem');
            
            let savedPath: string | null = null;
            
            if (isSaveAs) {
              // For Save As - always show file picker
              savedPath = await saveWithFileSystemAccessAPI(content, currentFileName, true);
            } else {
              // For regular save - try to use existing handle
              savedPath = await saveWithFileSystemAccessAPI(content, currentFileName);
            }
            
            if (savedPath) {
              console.log('File saved at:', savedPath);
              updateUIAfterSave(savedPath);
              
              // Store the current file path and name for future saves
              window.localStorage.setItem('currentFilePath', savedPath);
              window.localStorage.setItem('currentFileName', savedPath.split(/[/\\]/).pop() || currentFileName);
              
              // ✅ CRITICAL: Notify the tracker that file was saved
              notifyFileSaved(savedPath);
              
              // Show success notification
              displaySaveSuccessNotification(savedPath.split(/[/\\]/).pop() || currentFileName);
            }
          } 
          // If API not available but Tauri is
          else if (typeof window !== 'undefined' && '__TAURI__' in window) {
            // Import the saveFile function from fileSystem.ts
            const { saveFile } = await import('../fileSystem');
            
            // For Save As or new files, always ask for location
            // For regular save, use existing path if available
            const targetPath = (isSaveAs || currentFilePath === '' || currentFilePath === 'Untitled') 
              ? null 
              : currentFilePath;
            
            console.log(`Saving file with path: ${targetPath} and filename: ${currentFileName}`);
            
            const savedPath = await saveFile(content, targetPath, currentFileName);
            
            if (savedPath) {
              console.log('File saved at:', savedPath);
              updateUIAfterSave(savedPath);
              
              // Store the current file path and name for future saves
              window.localStorage.setItem('currentFilePath', savedPath);
              window.localStorage.setItem('currentFileName', savedPath.split(/[/\\]/).pop() || currentFileName);
              
              // ✅ CRITICAL: Notify the tracker that file was saved
              notifyFileSaved(savedPath);
              
              // Show success notification
              displaySaveSuccessNotification(savedPath.split(/[/\\]/).pop() || currentFileName);
            }
          } 
          // If neither API nor Tauri is available
          else {
            displayApiLimitationNotification();
          }
        } catch (error) {
          console.error('Error saving file:', error);
          alert('Error saving file: ' + error.message);
        }
      } catch (error) {
        console.error('Error in save operation:', error);
      }
    }
  });
  
  // Add file manager button
  addFileManagerButton();
}

/**
 * Saves file content to a specific path
 */
export async function saveFile(content: string, targetPath: string | null, defaultFileName: string): Promise<string | null> {
  try {
    // Use File System Access API if available
    if ('showSaveFilePicker' in window) {
      const { saveWithFileSystemAccessAPI } = await import('../fileSystem');
      
      // For regular save with existing file, use the file name
      if (targetPath && targetPath !== 'Untitled' && targetPath !== '') {
        const fileName = targetPath.split(/[/\\]/).pop() || defaultFileName;
        const result = await saveWithFileSystemAccessAPI(content, fileName);
        
        if (result) {
          // ✅ CRITICAL: Notify the tracker that file was saved
          notifyFileSaved(result);
        }
        
        return result;
      }
      
      // For Save As or new files
      const result = await saveWithFileSystemAccessAPI(content, defaultFileName);
      
      if (result) {
        // ✅ CRITICAL: Notify the tracker that file was saved
        notifyFileSaved(result);
      }
      
      return result;
    }
    
    // For Tauri desktop environment 
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const fileSystem = await import('../fileSystem');
      const result = await fileSystem.saveFile(content, targetPath, defaultFileName);
      
      if (result) {
        // ✅ CRITICAL: Notify the tracker that file was saved
        notifyFileSaved(result);
      }
      
      return result;
    }
    
    // If no File System API support
    displayApiLimitationNotification();
    return null;
  } catch (error) {
    console.error('Error in saveFile:', error);
    return null;
  }
}

/**
 * Modern File System Access API implementation (for use until fileSystem.ts exports it)
 */
export async function saveWithFileSystemAccessAPI(content: string, suggestedName: string, forceNewPicker: boolean = false): Promise<string | null> {
  try {
    // Check if a file handle is already stored for this file
    const fileHandleStore = (window as any).fileHandleStore || {};
    
    // Try to reuse existing handle UNLESS forceNewPicker is true (Save As)
    if (!forceNewPicker && fileHandleStore[suggestedName]) {
      try {
        const fileHandle = fileHandleStore[suggestedName];
        
        // Request permission to write
        const options = { mode: 'readwrite' };
        // @ts-ignore
        if ((await fileHandle.queryPermission(options)) !== 'granted') {
          // @ts-ignore
          const permission = await fileHandle.requestPermission(options);
          if (permission !== 'granted') {
            throw new Error('Permission to write was denied');
          }
        }
        
        // Create a writable stream and write the content
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        
        console.log(`File saved back to original location: ${suggestedName}`);
        
        // Get the actual file path (we need to construct it)
        const savedPath = `handle://${suggestedName}`;
        
        // ✅ CRITICAL: Notify the tracker that file was saved
        notifyFileSaved(savedPath);
        
        return savedPath;
      } catch (error) {
        console.error('Error using stored file handle:', error);
        // Fall through to show save picker if handle reuse fails
      }
    }
    
    // @ts-ignore - TypeScript might not recognize this API
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: suggestedName,
      types: [
        {
          description: 'Text Files',
          accept: {
            'text/plain': ['.txt', '.js', '.ts', '.py', '.html', '.css', '.json', '.md'],
          },
        },
      ],
    });
    
    // Store handle for future use
    if (!window.fileHandleStore) {
      (window as any).fileHandleStore = {};
    }
    (window as any).fileHandleStore[fileHandle.name || suggestedName] = fileHandle;
    
    // Create a writable stream and write the content
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    
    // Get the file name (we can't get the full path for security reasons)
    const fileName = fileHandle.name || suggestedName;
    console.log(`File saved with File System API: ${fileName}`);
    
    const savedPath = `handle://${fileName}`;
    
    // ✅ CRITICAL: Notify the tracker that file was saved
    notifyFileSaved(savedPath);
    
    return savedPath;
  } catch (error) {
    console.error('Error using File System Access API:', error);
    // Return null to indicate cancellation or error
    return null;
  }
}

/**
 * Browser fallback for saving (kept for backward compatibility)
 */
export function browserFallbackSave(content: string, filename: string): string | null {
  console.log('Using browser fallback to save:', filename);
  
  // Use File System Access API if available
  if ('showSaveFilePicker' in window) {
    try {
      const result = saveWithFileSystemAccessAPI(content, filename);
      
      if (result) {
        // ✅ CRITICAL: Notify the tracker that file was saved
        // Note: This is async, but we'll handle it
        result.then(path => {
          if (path) notifyFileSaved(path);
        });
      }
      
      return result;
    } catch (error) {
      console.error('File System Access API failed:', error);
    }
  }
  
  // Fall back to basic download approach
  try {
    // Create blob and download directly
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('File downloaded as', filename);
    
    
    // Update UI elements
    updateUIAfterSave(filename);
    
    // Store info for future use
    window.localStorage.setItem('currentFilePath', `browser://${filename}`);
    window.localStorage.setItem('currentFileName', filename);
    
    const savedPath = `browser://${filename}`;
    
    // ✅ CRITICAL: Notify the tracker that file was saved
    notifyFileSaved(savedPath);
    
    displaySaveNotification(filename);
    
    return savedPath;
  } catch (error) {
    console.error('Error in browser fallback save:', error);
    return null;
  }
}

// Helper function for legacy support
function displaySaveNotification(filename: string): void {
  displaySaveSuccessNotification(filename);
}