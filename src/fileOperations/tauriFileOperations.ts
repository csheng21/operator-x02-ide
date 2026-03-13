// fileOperations/tauriFileOperations.ts
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, readDir } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
}

export class TauriFileOperations {
  static async openFolder(): Promise<string | null> {
    try {
      console.log('Opening folder dialog with Tauri...');
      
      const folderPath = await open({
        directory: true,
        multiple: false,
        title: 'Select Project Folder',
      });

      if (folderPath && typeof folderPath === 'string') {
        console.log('Selected folder:', folderPath);
        return folderPath;
      }
      
      return null;
    } catch (error) {
      console.error('Error opening folder:', error);
      throw error;
    }
  }

  static async openFile(): Promise<string | null> {
    try {
      console.log('Opening file dialog with Tauri...');
      
      const filePath = await open({
        directory: false,
        multiple: false,
        title: 'Select File to Open',
        filters: [
          {
            name: 'All Files',
            extensions: ['*']
          },
          {
            name: 'Text Files',
            extensions: ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'xml']
          }
        ]
      });

      if (filePath && typeof filePath === 'string') {
        console.log('Selected file:', filePath);
        return filePath;
      }
      
      return null;
    } catch (error) {
      console.error('Error opening file:', error);
      throw error;
    }
  }

  static async saveFile(defaultPath?: string): Promise<string | null> {
    try {
      console.log('Opening save dialog with Tauri...');
      
      const filePath = await save({
        title: 'Save File',
        defaultPath: defaultPath,
        filters: [
          {
            name: 'All Files',
            extensions: ['*']
          }
        ]
      });

      if (filePath) {
        console.log('Selected save location:', filePath);
        return filePath;
      }
      
      return null;
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  }

  static async readFile(path: string): Promise<string> {
    try {
      console.log('Reading file with Tauri:', path);
      const content = await readTextFile(path);
      return content;
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

  static async writeFile(path: string, content: string): Promise<void> {
    try {
      console.log('Writing file with Tauri:', path);
      await writeTextFile(path, content);
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
  }

  static async readDirectory(path: string): Promise<FileEntry[]> {
    try {
      console.log('Reading directory with Tauri:', path);
      const entries = await readDir(path, { recursive: false });
      
      const fileEntries: FileEntry[] = [];
      
      for (const entry of entries) {
        const fileEntry: FileEntry = {
          name: entry.name || 'Unknown',
          path: entry.path,
          isDirectory: entry.isDirectory || false
        };
        
        fileEntries.push(fileEntry);
      }
      
      // Sort: directories first, then files, both alphabetically
      fileEntries.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      return fileEntries;
    } catch (error) {
      console.error('Error reading directory:', error);
      throw error;
    }
  }

  static async checkTauriAvailability(): Promise<boolean> {
    try {
      // Test if Tauri APIs are available
      if (typeof window !== 'undefined' && window.__TAURI__) {
        // Try a simple invoke to verify IPC is working
        await invoke('tauri', { __tauriModule: 'App', message: { cmd: 'tauri' } });
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Tauri not available:', error);
      return false;
    }
  }
}

// File System utilities specific to Tauri
export class TauriFileSystem {
  static async getProjectFiles(projectPath: string): Promise<FileEntry[]> {
    try {
      const files = await TauriFileOperations.readDirectory(projectPath);
      
      // Load children for directories (first level only to avoid deep recursion)
      for (const file of files) {
        if (file.isDirectory) {
          try {
            file.children = await TauriFileOperations.readDirectory(file.path);
          } catch (error) {
            console.warn(`Could not read directory ${file.path}:`, error);
            file.children = [];
          }
        }
      }
      
      return files;
    } catch (error) {
      console.error('Error getting project files:', error);
      throw error;
    }
  }
}

// Initialize Tauri file system API
export async function initTauriFileSystem(): Promise<boolean> {
  try {
    const isAvailable = await TauriFileOperations.checkTauriAvailability();
    
    if (isAvailable) {
      console.log('✅ Tauri file system initialized successfully');
      
      // Make Tauri operations globally available for debugging
      (window as any).__tauriFileOps = TauriFileOperations;
      
      return true;
    } else {
      console.warn('⚠️ Tauri not available - running in web mode');
      return false;
    }
  } catch (error) {
    console.error('❌ Error initializing Tauri file system:', error);
    return false;
  }
}