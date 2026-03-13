// src/fileOperations/tauriIntegration.ts
import { invoke } from '@tauri-apps/api/tauri';
import { FileInfo } from '../types/fileTypes';

/**
 * Initialize Tauri integration for file operations
 */
export async function initializeTauriIntegration(): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      console.log('Tauri integration: Initializing');
      
      // Check if our custom commands are available
      try {
        // Try to invoke a simple command to test if our custom commands are registered
        await invoke('check_file_commands');
        console.log('Tauri integration: Custom file commands are available');
        return true;
      } catch (error) {
        console.warn('Tauri integration: Custom file commands not available, falling back to standard API', error);
        return false;
      }
    } else {
      console.log('Tauri integration: Not available in this environment');
      return false;
    }
  } catch (error) {
    console.error('Tauri integration: Failed to initialize', error);
    return false;
  }
}

/**
 * Write file using Tauri's custom command
 * @param path File path
 * @param content File content
 * @returns True if successful
 */
export async function writeFileTauri(path: string, content: string): Promise<boolean> {
  try {
    await invoke('write_file', { path, content });
    console.log(`Tauri: File written to ${path}`);
    return true;
  } catch (error) {
    console.error('Tauri: Error writing file with custom command', error);
    
    // Try standard API as fallback
    try {
      const fs = await import('@tauri-apps/plugin-fs');
      await fs.writeTextFile(path, content);
      console.log(`Tauri: File written to ${path} (using standard API)`);
      return true;
    } catch (fsError) {
      console.error('Tauri: Error writing file with standard API', fsError);
      throw error; // Re-throw the original error
    }
  }
}

/**
 * Read file using Tauri's custom command
 * @param path File path
 * @returns File content
 */
export async function readFileTauri(path: string): Promise<string> {
  try {
    const content = await invoke('read_file', { path });
    console.log(`Tauri: File read from ${path}`);
    return content as string;
  } catch (error) {
    console.error('Tauri: Error reading file with custom command', error);
    
    // Try standard API as fallback
    try {
      const fs = await import('@tauri-apps/plugin-fs');
      const content = await fs.readTextFile(path);
      console.log(`Tauri: File read from ${path} (using standard API)`);
      return content;
    } catch (fsError) {
      console.error('Tauri: Error reading file with standard API', fsError);
      throw error; // Re-throw the original error
    }
  }
}

/**
 * Show open dialog using Tauri
 * @returns FileInfo object or null if cancelled
 */
export async function showOpenDialogTauri(): Promise<FileInfo | null> {
  try {
    // Import dialog API dynamically
    const dialog = await import('@tauri-apps/plugin-dialog');
    
    // Show open dialog
    const filePath = await dialog.open({
      multiple: false,
      filters: [{
        name: 'All Files',
        extensions: ['*']
      }]
    });
    
    // Handle cancellation
    if (!filePath) {
      console.log('Tauri: Open dialog cancelled');
      return null;
    }
    
    // Handle string or array result
    const selectedPath = typeof filePath === 'string' ? filePath : filePath[0];
    
    // Read file content
    const content = await readFileTauri(selectedPath);
    const fileName = selectedPath.split(/[/\\]/).pop() || '';
    
    console.log(`Tauri: File opened from ${selectedPath}`);
    
    return {
      path: selectedPath,
      content,
      name: fileName
    };
  } catch (error) {
    console.error('Tauri: Error showing open dialog', error);
    throw error;
  }
}

/**
 * Show save dialog using Tauri
 * @param defaultPath Default file path
 * @returns Selected path or null if cancelled
 */
export async function showSaveDialogTauri(defaultPath?: string): Promise<string | null> {
  try {
    // Import dialog API dynamically
    const dialog = await import('@tauri-apps/plugin-dialog');
    
    // Show save dialog
    const savePath = await dialog.save({
      defaultPath,
      filters: [{
        name: 'All Files',
        extensions: ['*']
      }]
    });
    
    // Handle cancellation
    if (!savePath) {
      console.log('Tauri: Save dialog cancelled');
      return null;
    }
    
    console.log(`Tauri: Save path selected ${savePath}`);
    return savePath;
  } catch (error) {
    console.error('Tauri: Error showing save dialog', error);
    throw error;
  }
}

/**
 * List directory contents using Tauri
 * @param dirPath Directory path
 * @returns Array of file paths
 */
export async function listDirectoryTauri(dirPath: string): Promise<string[]> {
  try {
    // Import fs API dynamically
    const fs = await import('@tauri-apps/plugin-fs');
    
    // Read directory
    const entries = await fs.readDir(dirPath, { recursive: false });
    
    // Extract file paths
    const filePaths = entries
      .filter(entry => !entry.children) // Filter out directories
      .map(entry => entry.path);
    
    console.log(`Tauri: Listed ${filePaths.length} files in ${dirPath}`);
    return filePaths;
  } catch (error) {
    console.error('Tauri: Error listing directory', error);
    throw error;
  }
}

/**
 * Create directory using Tauri
 * @param dirPath Directory path
 * @param recursive Whether to create parent directories if they don't exist
 * @returns True if successful
 */
export async function createDirectoryTauri(dirPath: string, recursive: boolean = true): Promise<boolean> {
  try {
    // Import fs API dynamically
    const fs = await import('@tauri-apps/plugin-fs');
    
    // Create directory
    await fs.createDir(dirPath, { recursive });
    
    console.log(`Tauri: Directory created at ${dirPath}`);
    return true;
  } catch (error) {
    console.error('Tauri: Error creating directory', error);
    throw error;
  }
}

/**
 * Remove file using Tauri
 * @param filePath File path
 * @returns True if successful
 */
export async function removeFileTauri(filePath: string): Promise<boolean> {
  try {
    // Import fs API dynamically
    const fs = await import('@tauri-apps/plugin-fs');
    
    // Remove file
    await fs.removeFile(filePath);
    
    console.log(`Tauri: File removed at ${filePath}`);
    return true;
  } catch (error) {
    console.error('Tauri: Error removing file', error);
    throw error;
  }
}

/**
 * Remove directory using Tauri
 * @param dirPath Directory path
 * @param recursive Whether to remove recursively
 * @returns True if successful
 */
export async function removeDirectoryTauri(dirPath: string, recursive: boolean = true): Promise<boolean> {
  try {
    // Import fs API dynamically
    const fs = await import('@tauri-apps/plugin-fs');
    
    // Remove directory
    await fs.removeDir(dirPath, { recursive });
    
    console.log(`Tauri: Directory removed at ${dirPath}`);
    return true;
  } catch (error) {
    console.error('Tauri: Error removing directory', error);
    throw error;
  }
}