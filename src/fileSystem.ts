// fileSystem.ts - Complete Tauri-First File System Implementation with Path Memory and Metadata
// This file prioritizes Tauri's native APIs with browser fallbacks

import { FileInfo } from './types/fileTypes';
import { invoke } from '@tauri-apps/api/core';

// Import all explorer manager functionality
import { 
  integratedFolderManager, 
  IntegratedFolderManager, 
  contextMenuManager, 
  ContextMenuManager,
  removeFloatingCloseButtons,
  enhanceExistingOpenFolderButton,
  enhanceFileTreeWithContextMenu,
  setupCopyPathKeyboardShortcuts
} from './explorerManager';

// ⭐ UPDATED: File tree interfaces with metadata
interface TauriFileEntry {
  name: string;
  path: string;
  is_directory: boolean;
  size?: number;
  modified?: number | string;      // ⭐ Unix timestamp or ISO date string
  last_modified?: number | string; // ⭐ Alternative field name
  created?: number | string;       // ⭐ Creation time
  children?: TauriFileEntry[];
}

interface TauriSystemInfo {
  username: string;
  hostname: string;
  os_name: string;
  os_version: string;
  home_dir: string;
  documents_dir?: string;
  downloads_dir?: string;
  app_data_dir?: string;
  temp_dir: string;
}

// ================================
// PATH MEMORY MANAGEMENT SYSTEM
// ================================

interface PathMemory {
  lastOpenFolder?: string;
  lastSaveFolder?: string;
  lastProjectFolder?: string;
  lastFileFolder?: string;
  recentFolders?: string[];
}

class PathManager {
  private static readonly STORAGE_KEY = 'ai_ide_path_memory';
  private static memory: PathMemory = {};

  static {
    this.loadMemory();
  }

  private static loadMemory(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.memory = JSON.parse(stored);
        console.log('📂 Loaded path memory:', this.memory);
      }
    } catch (error) {
      console.error('Failed to load path memory:', error);
      this.memory = {};
    }
  }

  private static saveMemory(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.memory));
    } catch (error) {
      console.error('Failed to save path memory:', error);
    }
  }

  static updateLastFolder(path: string, type: 'open' | 'save' | 'project' | 'file' = 'open'): void {
    const folderPath = path.includes('.') && type === 'file' 
      ? path.substring(0, path.lastIndexOf(/[\\\/]/.exec(path)?.[0] || '/'))
      : path;
    
    switch (type) {
      case 'open':
        this.memory.lastOpenFolder = folderPath;
        break;
      case 'save':
        this.memory.lastSaveFolder = folderPath;
        break;
      case 'project':
        this.memory.lastProjectFolder = folderPath;
        break;
      case 'file':
        this.memory.lastFileFolder = folderPath;
        break;
    }

    if (!this.memory.recentFolders) {
      this.memory.recentFolders = [];
    }
    
    this.memory.recentFolders = this.memory.recentFolders.filter(f => f !== folderPath);
    this.memory.recentFolders.unshift(folderPath);
    this.memory.recentFolders = this.memory.recentFolders.slice(0, 10);
    
    this.saveMemory();
    console.log(`📂 Updated ${type} path: ${folderPath}`);
  }

  static getLastFolder(type: 'open' | 'save' | 'project' | 'file' = 'open'): string | undefined {
    switch (type) {
      case 'open':
        return this.memory.lastOpenFolder;
      case 'save':
        return this.memory.lastSaveFolder;
      case 'project':
        return this.memory.lastProjectFolder;
      case 'file':
        return this.memory.lastFileFolder;
    }
  }

  static getRecentFolders(): string[] {
    // ✅ FIX: Merge folders from both PathManager memory AND SimplePathManager localStorage
    const memoryFolders = this.memory.recentFolders || [];
    
    // Also read from SimplePathManager storage (ai_ide_recent_folders)
    let simpleFolders: string[] = [];
    try {
      const stored = localStorage.getItem('ai_ide_recent_folders');
      if (stored) {
        simpleFolders = JSON.parse(stored) || [];
      }
    } catch (e) {
      // ignore parse errors
    }
    
    // Merge: memory folders first, then simple folders (deduplicated)
    const merged = [...memoryFolders];
    for (const folder of simpleFolders) {
      if (folder && !merged.includes(folder)) {
        merged.push(folder);
      }
    }
    
    // Also sync back to memory so future reads are fast
    if (merged.length > 0 && merged.length !== memoryFolders.length) {
      this.memory.recentFolders = merged.slice(0, 10);
      this.saveMemory();
    }
    
    return merged.slice(0, 10);
  }

  static clearMemory(): void {
    this.memory = {};
    this.saveMemory();
  }
}

let currentFolderRootPath = '';
const fileHandleStore = new Map<string, any>();

const getCurrentFolderRootPath = (): string => currentFolderRootPath;
const setCurrentFolderRootPath = (path: string): void => {
  currentFolderRootPath = path;
  console.log('📂 Set current folder root path:', path);
};

const mockFileSystem: Record<string, string> = {};

/**
 * Check if Tauri is available - FIXED FOR TAURI V2
 */
function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && 
         '__TAURI__' in window && 
         window.__TAURI__ && 
         window.__TAURI__.core &&
         typeof window.__TAURI__.core.invoke === 'function';
}

/**
 * Show notification utility
 */
function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 6px;
    color: white;
    font-size: 13px;
    z-index: 10001;
    max-width: 350px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    animation: slideInRight 0.3s ease;
    font-family: 'Segoe UI', sans-serif;
    ${type === 'success' ? 
      'background: linear-gradient(135deg, #4CAF50, #45a049);' : 
      type === 'error' ? 
      'background: linear-gradient(135deg, #f44336, #e53935);' : 
      'background: linear-gradient(135deg, #2196F3, #1976D2);'
    }
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

/**
 * TAURI-FIRST: Open folder dialog with path memory
 */
async function openFolderDialog(): Promise<string | null> {
  try {
    if (isTauriAvailable()) {
      console.log('📂 Opening folder dialog with Tauri native API...');
      
      const lastPath = PathManager.getLastFolder('project') || 
                      PathManager.getLastFolder('open') ||
                      getCurrentFolderRootPath();
      
      console.log('🔍 Using last path:', lastPath);
      
      const folderPath = await invoke<string | null>('open_folder_dialog_with_path', {
        defaultPath: lastPath
      });
      
      if (folderPath) {
        console.log('✅ Folder selected (Tauri):', folderPath);
        setCurrentFolderRootPath(folderPath);
        PathManager.updateLastFolder(folderPath, 'project');
        return folderPath;
      }
      
      console.log('📂 Folder selection cancelled (Tauri)');
      return null;
    }
    
    console.warn('⚠️ Tauri not available, falling back to browser API...');
    if ('showDirectoryPicker' in window) {
      const dirHandle = await (window as any).showDirectoryPicker();
      const folderName = dirHandle.name;
      console.log('✅ Folder selected (Browser):', folderName);
      
      const userProvidedPath = prompt(
        `Browser API selected: "${folderName}"\n\nPlease enter the full path to this folder:`,
        ''
      );
      
      const finalPath = userProvidedPath?.trim() || folderName;
      setCurrentFolderRootPath(finalPath);
      PathManager.updateLastFolder(finalPath, 'project');
      return finalPath;
    }
    
    throw new Error('Neither Tauri nor browser folder dialog APIs are available');
    
  } catch (error) {
    console.error('❌ Error opening folder dialog:', error);
    if ((error as any).name !== 'AbortError') {
      showNotification('Failed to open folder dialog', 'error');
    }
    return null;
  }
}

/**
 * TAURI-FIRST: Open file dialog with path memory
 */
async function openFileDialog(): Promise<{ content: string, path: string } | null> {
  try {
    if (isTauriAvailable()) {
      console.log('📂 Opening file dialog with Tauri native API...');
      
      const lastPath = PathManager.getLastFolder('file') || 
                      PathManager.getLastFolder('open') ||
                      getCurrentFolderRootPath();
      
      console.log('🔍 Using last path:', lastPath);
      
      const filePath = await invoke<string | null>('open_file_dialog_with_path', {
        defaultPath: lastPath
      });
      
      if (!filePath) {
        console.log('📂 File selection cancelled (Tauri)');
        return null;
      }
      
      console.log('✅ File selected (Tauri):', filePath);
      PathManager.updateLastFolder(filePath, 'file');
      
      const content = await invoke<string>('read_file_content', { path: filePath });
      
      return {
        content,
        path: filePath
      };
    }
    
    console.warn('⚠️ Tauri not available, falling back to browser API...');
    if ('showOpenFilePicker' in window) {
      const [fileHandle] = await (window as any).showOpenFilePicker({
        multiple: false,
        types: [{
          description: 'Text Files',
          accept: {
            'text/plain': ['.txt', '.js', '.ts', '.py', '.html', '.css', '.json', '.md', '.jsx', '.tsx']
          }
        }]
      });

      const file = await fileHandle.getFile();
      const content = await file.text();
      
      fileHandleStore.set(file.name, fileHandle);
      
      return {
        content,
        path: file.name
      };
    }
    
    throw new Error('Neither Tauri nor browser file dialog APIs are available');
    
  } catch (error) {
    console.error('❌ Error opening file dialog:', error);
    if ((error as any).name !== 'AbortError') {
      showNotification('Failed to open file dialog', 'error');
    }
    return null;
  }
}

/**
 * TAURI-FIRST: Save file with path memory
 */
async function saveFile(content: string, defaultPath?: string, fileName?: string): Promise<string | null> {
  try {
    if (isTauriAvailable()) {
      console.log('💾 Saving file with Tauri native API...', { defaultPath, fileName });
      
      if (defaultPath && defaultPath !== '' && defaultPath !== 'Untitled') {
        await invoke('write_file_content', { 
          path: defaultPath, 
          content: content 
        });
        console.log(`✅ File saved (Tauri) at: ${defaultPath}`);
        PathManager.updateLastFolder(defaultPath, 'save');
        return defaultPath;
      } else {
        const lastPath = PathManager.getLastFolder('save') || 
                        PathManager.getLastFolder('project');
        
        const defaultName = fileName || 'untitled.txt';
        const savePath = await invoke<string | null>('save_file_dialog_with_path', {
          defaultName: defaultName,
          defaultPath: lastPath
        });
        
        if (!savePath) {
          console.log('💾 Save cancelled by user (Tauri)');
          return null;
        }
        
        await invoke('write_file_content', { 
          path: savePath, 
          content: content 
        });
        console.log(`✅ File saved (Tauri) at: ${savePath}`);
        PathManager.updateLastFolder(savePath, 'save');
        return savePath;
      }
    }
    
    console.warn('⚠️ Tauri not available, falling back to browser API...');
    
    if ('showSaveFilePicker' in window) {
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: fileName || 'untitled.txt',
        types: [
          {
            description: 'Text Files',
            accept: {
              'text/plain': ['.txt', '.js', '.ts', '.py', '.html', '.css', '.json', '.md'],
            },
          },
        ],
      });
      
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      
      console.log(`✅ File saved (Browser) as: ${fileHandle.name}`);
      return fileHandle.name;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'untitled.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`✅ File downloaded as: ${a.download}`);
    showNotification('File downloaded to your Downloads folder', 'success');
    return a.download;
    
  } catch (error) {
    console.error('❌ Error saving file:', error);
    if ((error as any).name !== 'AbortError') {
      showNotification('Failed to save file', 'error');
    }
    return null;
  }
}

/**
 * TAURI-FIRST: Create a file using Tauri native API
 */
async function createFile(path: string, content: string = ''): Promise<void> {
  try {
    if (isTauriAvailable()) {
      console.log(`📄 Creating file (Tauri): ${path}`);
      
      await invoke('create_file', { 
        path: path, 
        content: content 
      });
      
      console.log(`✅ File created (Tauri) at: ${path}`);
      return;
    }
    
    console.warn('⚠️ Tauri not available - cannot create file at specific path in browser');
    
    mockFileSystem[path] = content;
    console.log(`📄 File stored in mock system: ${path}`);
    showNotification('File created in memory (browser mode)', 'info');
    
  } catch (error) {
    console.error('❌ Error creating file:', error);
    
    mockFileSystem[path] = content;
    showNotification('File created in memory (fallback)', 'info');
  }
}

/**
 * TAURI-FIRST: Read file content using Tauri native API
 */
async function readFile(path: string): Promise<string | null> {
  try {
    if (isTauriAvailable()) {
      console.log(`📖 Reading file (Tauri): ${path}`);
      
      const content = await invoke<string>('read_file_content', { path: path });
      
      console.log(`✅ File read (Tauri) successfully: ${content.length} characters`);
      return content;
    }
    
    console.warn('⚠️ Tauri not available, checking browser file handles...');
    
    const fileName = path.split(/[/\\]/).pop() || path;
    if (fileHandleStore.has(fileName)) {
      const handle = fileHandleStore.get(fileName);
      const file = await handle.getFile();
      const content = await file.text();
      console.log(`✅ File read (Browser handle) successfully: ${content.length} characters`);
      return content;
    }
    
    if (path in mockFileSystem) {
      console.log(`✅ File read (Mock) successfully: ${mockFileSystem[path].length} characters`);
      return mockFileSystem[path];
    }
    
    console.warn(`⚠️ File not found: ${path}`);
    return null;
    
  } catch (error) {
    console.error('❌ Error reading file:', error);
    
    if (path in mockFileSystem) {
      return mockFileSystem[path];
    }
    
    return null;
  }
}

/**
 * TAURI-FIRST: List files in directory using Tauri native API
 */
async function listFiles(directory: string): Promise<string[]> {
  try {
    if (isTauriAvailable()) {
      console.log(`📂 Listing files (Tauri) in directory: ${directory}`);
      
      const files = await invoke<string[]>('read_directory_simple', { path: directory });
      
      console.log(`✅ Found ${files.length} files (Tauri)`);
      return files;
    }
    
    console.warn('⚠️ Tauri not available - cannot list files at specific path in browser');
    
    const mockFiles = Object.keys(mockFileSystem).filter(path => 
      path.startsWith(directory) && 
      path.split('/').length === directory.split('/').length + 1
    );
    
    console.log(`📂 Found ${mockFiles.length} mock files`);
    return mockFiles;
    
  } catch (error) {
    console.error('❌ Error listing files:', error);
    return [];
  }
}

/**
 * TAURI-FIRST: Get detailed directory contents using Tauri native API
 */
async function getDirectoryContents(directory: string): Promise<TauriFileEntry[]> {
  try {
    if (!isTauriAvailable()) {
      throw new Error('Tauri not available');
    }
    
    console.log(`📂 Getting detailed directory contents (Tauri): ${directory}`);
    
    const entries = await invoke<TauriFileEntry[]>('read_directory_detailed', { path: directory });
    
    console.log(`✅ Found ${entries.length} entries (Tauri) with metadata`);
    return entries;
    
  } catch (error) {
    console.error('❌ Error getting directory contents:', error);
    return [];
  }
}

/**
 * ⭐ UPDATED: Get recursive directory tree with metadata using Tauri native API
 * 
 * ⚠️ IMPORTANT: This function depends on the Rust backend command 'read_directory_recursive'
 * The Rust backend MUST return file metadata including timestamps!
 * 
 * Required Rust implementation should use std::fs::metadata() and include:
 * - size: metadata.len()
 * - modified: metadata.modified()
 * - created: metadata.created()
 */
async function getDirectoryTree(directory: string, maxDepth: number = 10): Promise<TauriFileEntry | null> {
  try {
    if (!isTauriAvailable()) {
      throw new Error('Tauri not available');
    }
    
    console.log(`🌳 Getting directory tree (Tauri): ${directory} (max depth: ${maxDepth})`);
    
    const tree = await invoke<TauriFileEntry>('read_directory_recursive', { 
      path: directory,
      maxDepth: maxDepth
    });
    
    console.log(`✅ Directory tree loaded (Tauri)`);
    
    // ⭐ COMPREHENSIVE DEBUG: Check what metadata we actually received
    if (tree.children && tree.children.length > 0) {
      const sample = tree.children[0];
      console.log('📊 Sample file from backend:', {
        name: sample.name,
        size: sample.size,
        modified: sample.modified,
        last_modified: sample.last_modified,
        created: sample.created,
        allKeys: Object.keys(sample)
      });
      
      const hasTimestamps = !!(sample.modified || sample.last_modified || sample.created);
      
      if (!hasTimestamps) {
        console.warn('');
        console.warn('⚠️⚠️⚠️ TIMESTAMPS MISSING FROM RUST BACKEND! ⚠️⚠️⚠️');
        console.warn('');
        console.warn('The Rust backend is NOT returning file timestamps.');
        console.warn('');
        console.warn('📝 TO FIX: Update your Rust code in src-tauri/src/main.rs or lib.rs:');
        console.warn('');
        console.warn('Find the "read_directory_recursive" command and add:');
        console.warn('');
        console.warn('  use std::fs::metadata;');
        console.warn('  use std::time::UNIX_EPOCH;');
        console.warn('');
        console.warn('  let metadata = metadata(&file_path)?;');
        console.warn('  let modified = metadata.modified()?');
        console.warn('    .duration_since(UNIX_EPOCH)?');
        console.warn('    .as_secs();');
        console.warn('');
        console.warn('  FileNode {');
        console.warn('    name: file_name,');
        console.warn('    size: Some(metadata.len()),');
        console.warn('    modified: Some(modified),  // ⭐ ADD THIS!');
        console.warn('    // ... other fields');
        console.warn('  }');
        console.warn('');
        console.warn('🔧 For now, timestamps will show "--" in the file tree');
        console.warn('');
      } else {
        console.log('✅ Backend is providing timestamps correctly!');
      }
    }
    
    return tree;
    
  } catch (error) {
    console.error('❌ Error getting directory tree:', error);
    return null;
  }
}

/**
 * TAURI-FIRST: Check if file exists using Tauri native API
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    if (!isTauriAvailable()) {
      return path in mockFileSystem;
    }
    
    const exists = await invoke<boolean>('file_exists', { path: path });
    return exists;
    
  } catch (error) {
    console.error('❌ Error checking file existence:', error);
    return path in mockFileSystem;
  }
}

/**
 * TAURI-FIRST: Check if path is directory using Tauri native API
 */
async function isDirectory(path: string): Promise<boolean> {
  try {
    if (!isTauriAvailable()) {
      return false;
    }
    
    const isDir = await invoke<boolean>('is_directory', { path: path });
    return isDir;
    
  } catch (error) {
    console.error('❌ Error checking if directory:', error);
    return false;
  }
}

/**
 * TAURI-FIRST: Delete file or directory using Tauri native API
 */
async function deleteFile(path: string): Promise<void> {
  try {
    if (isTauriAvailable()) {
      console.log(`🗑️ Deleting (Tauri): ${path}`);
      
      await invoke('delete_file', { path: path });
      
      console.log(`✅ Deleted (Tauri) successfully: ${path}`);
      return;
    }
    
    console.warn('⚠️ Tauri not available, removing from mock system');
    if (path in mockFileSystem) {
      delete mockFileSystem[path];
      console.log(`🗑️ Removed from mock system: ${path}`);
      showNotification('File removed from memory (browser mode)', 'info');
    }
    
  } catch (error) {
    console.error('❌ Error deleting file:', error);
    
    if (path in mockFileSystem) {
      delete mockFileSystem[path];
      showNotification('File removed from memory (fallback)', 'info');
    } else {
      throw new Error(`Failed to delete file: ${error}`);
    }
  }
}

/**
 * TAURI-FIRST: Create directory using Tauri native API
 */
async function createDirectory(path: string): Promise<void> {
  try {
    if (!isTauriAvailable()) {
      console.warn('⚠️ Tauri not available - directory creation limited in browser');
      showNotification('Directory creation requires desktop app', 'info');
      return;
    }
    
    console.log(`📁 Creating directory (Tauri): ${path}`);
    
    await invoke('create_directory', { path: path });
    
    console.log(`✅ Directory created (Tauri) successfully: ${path}`);
    
  } catch (error) {
    console.error('❌ Error creating directory:', error);
    throw new Error(`Failed to create directory: ${error}`);
  }
}

/**
 * TAURI-FIRST: Reveal file/folder in system explorer using Tauri native API
 */
async function revealInExplorer(path: string): Promise<void> {
  try {
    if (!isTauriAvailable()) {
      console.warn('⚠️ Tauri not available - cannot reveal in system file manager');
      showNotification('System file manager integration requires desktop app', 'info');
      
      const fullPath = path;
      navigator.clipboard.writeText(fullPath).then(() => {
        showNotification('Path copied! Paste in your file manager to navigate', 'info');
      }).catch(() => {
        prompt('Copy this path manually and paste in your file explorer:', fullPath);
      });
      return;
    }
    
    console.log(`👁️ Revealing in explorer (Tauri): ${path}`);
    
    await invoke('reveal_in_explorer', { path: path });
    
    console.log(`✅ Revealed in explorer (Tauri) successfully`);
    showNotification('Opened in system file manager', 'success');
    
  } catch (error) {
    console.error('❌ Error revealing in explorer:', error);
    showNotification('Failed to open in file manager', 'error');
    
    try {
      await navigator.clipboard.writeText(path);
      showNotification('Path copied to clipboard', 'info');
    } catch (clipboardError) {
      prompt('Copy this path manually:', path);
    }
  }
}

/**
 * TAURI-FIRST: Get system information using Tauri native API
 */
async function getSystemInfo(): Promise<TauriSystemInfo | null> {
  try {
    if (!isTauriAvailable()) {
      console.warn('⚠️ Tauri not available - limited system information');
      
      return {
        username: 'user',
        hostname: 'browser',
        os_name: navigator.platform,
        os_version: 'unknown',
        home_dir: '/home/user',
        temp_dir: '/tmp'
      };
    }
    
    console.log('🖥️ Getting system information (Tauri)...');
    
    const info = await invoke<TauriSystemInfo>('get_system_info');
    
    console.log('✅ System information retrieved (Tauri):', info);
    return info;
    
  } catch (error) {
    console.error('❌ Error getting system info:', error);
    return null;
  }
}

/**
 * TAURI-FIRST: Show message dialog using Tauri native API with browser fallback
 */
async function showMessageDialog(title: string, message: string, kind: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
  try {
    if (isTauriAvailable()) {
      await invoke('show_message_dialog', {
        title: title,
        message: message,
        kind: kind
      });
      return;
    }
    
    console.warn('⚠️ Tauri not available, using browser alert...');
    alert(`${title}\n\n${message}`);
    
  } catch (error) {
    console.error('❌ Error showing message dialog:', error);
    alert(`${title}\n\n${message}`);
  }
}

/**
 * ⭐ UPDATED: Get file metadata with timestamps using Tauri native API
 */
async function getFileMetadata(path: string): Promise<any> {
  try {
    if (!isTauriAvailable()) {
      console.warn('⚠️ Tauri not available - limited metadata');
      return null;
    }
    
    const metadata = await invoke('get_file_metadata', { path: path });
    console.log('📊 File metadata retrieved:', metadata);
    return metadata;
    
  } catch (error) {
    console.error('❌ Error getting file metadata:', error);
    return null;
  }
}

async function openFileWithFileHandle(): Promise<{ content: string, path: string } | null> {
  console.log('📂 openFileWithFileHandle called - routing to Tauri-first openFileDialog');
  return openFileDialog();
}

async function saveWithFileSystemAccessAPI(content: string, suggestedName: string): Promise<string | null> {
  console.log('📂 saveWithFileSystemAccessAPI called - routing to Tauri-first saveFile');
  return saveFile(content, undefined, suggestedName);
}

function listMockFiles(directory: string): string[] {
  return Object.keys(mockFileSystem).filter(path => path.startsWith(directory));
}

if (typeof window !== 'undefined') {
  (window as any).fileSystem = {
    saveFile,
    createFile,
    readFile,
    listFiles,
    openFolderDialog,
    openFileDialog,
    
    openFileWithFileHandle,
    saveWithFileSystemAccessAPI,
    
    getDirectoryContents,
    getDirectoryTree,
    createDirectory,
    deleteFile,
    
    fileExists,
    isDirectory,
    getFileMetadata,
    
    revealInExplorer,
    getSystemInfo,
    showMessageDialog,
    
    getCurrentFolderRoot: getCurrentFolderRootPath,
    setCurrentFolderRoot: setCurrentFolderRootPath,
    
    PathManager,
    getLastPath: (type: string) => PathManager.getLastFolder(type as any),
    getRecentFolders: () => PathManager.getRecentFolders(),
    clearPathMemory: () => PathManager.clearMemory(),
    
    fileHandleStore,
    
    integratedFolderManager,
    contextMenuManager,
    openFolder: () => integratedFolderManager.openFolder(),
    closeFolder: () => integratedFolderManager.closeFolder(),
    closeAllFiles: () => integratedFolderManager.closeAllFiles(),
    closeOtherFiles: () => integratedFolderManager.closeOtherFiles(),
    updateFileStatuses: () => integratedFolderManager.updateAllFileStatuses(),
    
    enhanceContextMenu: enhanceFileTreeWithContextMenu,
    setupCopyPathShortcuts: setupCopyPathKeyboardShortcuts,
    
    removeFloatingButtons: removeFloatingCloseButtons,
    enhanceOpenFolderButton: enhanceExistingOpenFolderButton,
    
    showNotification,
    isTauriAvailable,
    
    debugTabManager: () => {
      const tabManager = (window as any).tabManager;
      if (tabManager) {
        console.log('📊 Tab Manager Debug Info:');
        console.log('- Active tab:', tabManager.getActiveTab?.());
        console.log('- All tabs:', tabManager.tabs);
        console.log('- Tab count:', tabManager.tabs?.length || 0);
        console.log('- Tauri available:', isTauriAvailable());
      } else {
        console.log('❌ Tab manager not found');
      }
    },
    
    copyFullPath: (filePath: string) => {
      navigator.clipboard.writeText(filePath).then(() => {
        console.log('✅ Full path copied:', filePath);
        showNotification('Full path copied to clipboard', 'success');
      }).catch(() => {
        prompt('Copy this path manually:', filePath);
      });
    },
    
    inspectFileTree: () => {
      console.log('🌳 Current File Tree:', integratedFolderManager['rootFolder']);
    },
    
    debugPaths: () => {
      console.log('📂 Current Path Debug Info:');
      console.log('- Folder root path:', getCurrentFolderRootPath());
      console.log('- Tauri available:', isTauriAvailable());
      console.log('- Mock files count:', Object.keys(mockFileSystem).length);
      console.log('- File handles count:', fileHandleStore.size);
      console.log('- Path Memory:', PathManager.getRecentFolders());
      
      const fileItems = document.querySelectorAll('.integrated-file-item');
      console.log('- File items found:', fileItems.length);
      
      fileItems.forEach((item, index) => {
        const element = item as HTMLElement;
        console.log(`  File ${index + 1}:`, {
          name: element.textContent?.trim(),
          path: element.dataset.path,
          fullPath: element.dataset.fullPath
        });
      });
    },
    
    testTauriConnection: async () => {
      try {
        if (!isTauriAvailable()) {
          console.log('❌ Tauri not available');
          showNotification('Running in web mode - Tauri not available', 'info');
          return false;
        }
        
        const info = await getSystemInfo();
        console.log('✅ Tauri connection successful:', info);
        showNotification('Tauri connection successful!', 'success');
        return true;
      } catch (error) {
        console.log('❌ Tauri connection failed:', error);
        showNotification('Tauri connection failed', 'error');
        return false;
      }
    },
    
    getMockFileSystem: () => mockFileSystem,
    clearMockFileSystem: () => {
      Object.keys(mockFileSystem).forEach(key => delete mockFileSystem[key]);
      console.log('🧹 Mock file system cleared');
    },
    
    bulkFileOperations: {
      readMultipleFiles: async (paths: string[]): Promise<Array<{path: string, content: string | null}>> => {
        const results = [];
        for (const path of paths) {
          const content = await readFile(path);
          results.push({ path, content });
        }
        return results;
      },
      
      writeMultipleFiles: async (files: Array<{path: string, content: string}>): Promise<void> => {
        for (const file of files) {
          await createFile(file.path, file.content);
        }
      }
    }
  };
  
  console.log('🎉 Complete Tauri-First File System API with Metadata loaded!');
  console.log('');
  console.log('📖 Available commands (TAURI-FIRST WITH METADATA):');
  console.log('');
  console.log('📂 PATH MEMORY:');
  console.log('  - window.fileSystem.getLastPath("project") - Get last project folder');
  console.log('  - window.fileSystem.getRecentFolders() - Get recent folders list');
  console.log('  - window.fileSystem.clearPathMemory() - Clear path memory');
  console.log('');
  console.log('🗂️ FOLDER MANAGEMENT (NATIVE + METADATA):');
  console.log('  - window.fileSystem.openFolderDialog() - Opens in last used folder');
  console.log('  - window.fileSystem.getDirectoryTree(path) - Recursive tree with size & dates');
  console.log('  - window.fileSystem.getDirectoryContents(path) - Directory with metadata');
  console.log('  - window.fileSystem.createDirectory(path) - Create directory');
  console.log('');
  console.log('📄 FILE OPERATIONS (NATIVE + METADATA):');
  console.log('  - window.fileSystem.openFileDialog() - Opens in last used folder');
  console.log('  - window.fileSystem.saveFile(content, path, fileName) - Saves with path memory');
  console.log('  - window.fileSystem.getFileMetadata(path) - Get file metadata with timestamps');
  console.log('  - window.fileSystem.createFile(path, content) - Create file');
  console.log('  - window.fileSystem.readFile(path) - Read file content');
  console.log('  - window.fileSystem.deleteFile(path) - Delete file/directory');
  console.log('');
  console.log(`💡 Mode: ${isTauriAvailable() ? '🖥️ TAURI NATIVE' : '🌐 BROWSER FALLBACK'}`);
  console.log(`📂 Recent folders: ${PathManager.getRecentFolders().length} stored`);

  console.log('');
  console.log('⚠️ NOTE: File timestamps require Rust backend implementation');
  console.log('   Check console for detailed instructions if timestamps are missing');
}

export {
  saveFile,
  createFile,
  readFile,
  listFiles,
  openFolderDialog,
  openFileDialog,
  
  openFileWithFileHandle,
  saveWithFileSystemAccessAPI,
  
  getDirectoryContents,
  getDirectoryTree,
  createDirectory,
  deleteFile,
  
  fileExists,
  isDirectory,
  getFileMetadata,
  
  revealInExplorer,
  getSystemInfo,
  showMessageDialog,
  
  getCurrentFolderRootPath,
  setCurrentFolderRootPath,
  
  PathManager,
  
  showNotification,
  isTauriAvailable,
  
  integratedFolderManager,
  IntegratedFolderManager,
  contextMenuManager,
  ContextMenuManager,
  removeFloatingCloseButtons,
  enhanceExistingOpenFolderButton,
  enhanceFileTreeWithContextMenu,
  setupCopyPathKeyboardShortcuts,
  
  fileHandleStore
};

declare global {
  interface Window {
    fileSystem?: {
      saveFile: typeof saveFile;
      createFile: typeof createFile;
      readFile: typeof readFile;
      listFiles: typeof listFiles;
      openFolderDialog: typeof openFolderDialog;
      openFileDialog: typeof openFileDialog;
      
      openFileWithFileHandle: typeof openFileWithFileHandle;
      saveWithFileSystemAccessAPI: typeof saveWithFileSystemAccessAPI;
      
      getDirectoryContents: typeof getDirectoryContents;
      getDirectoryTree: typeof getDirectoryTree;
      createDirectory: typeof createDirectory;
      deleteFile: typeof deleteFile;
      
      fileExists: typeof fileExists;
      isDirectory: typeof isDirectory;
      getFileMetadata: typeof getFileMetadata;
      
      revealInExplorer: typeof revealInExplorer;
      getSystemInfo: typeof getSystemInfo;
      showMessageDialog: typeof showMessageDialog;
      
      getCurrentFolderRoot: () => string;
      setCurrentFolderRoot: (path: string) => void;
      
      PathManager: typeof PathManager;
      getLastPath: (type: string) => string | undefined;
      getRecentFolders: () => string[];
      clearPathMemory: () => void;
      
      fileHandleStore: Map<string, any>;
      
      integratedFolderManager: IntegratedFolderManager;
      contextMenuManager: ContextMenuManager;
      openFolder: () => void;
      closeFolder: () => void;
      closeAllFiles: () => void;
      closeOtherFiles: () => void;
      updateFileStatuses: () => void;
      
      enhanceContextMenu: () => void;
      setupCopyPathShortcuts: () => void;
      
      removeFloatingButtons: () => void;
      enhanceOpenFolderButton: () => void;
      
      showNotification: typeof showNotification;
      isTauriAvailable: () => boolean;
      
      debugTabManager: () => void;
      copyFullPath: (filePath: string) => void;
      inspectFileTree: () => void;
      debugPaths: () => void;
      testTauriConnection: () => Promise<boolean>;
      
      getMockFileSystem: () => Record<string, string>;
      clearMockFileSystem: () => void;
      
      bulkFileOperations: {
        readMultipleFiles: (paths: string[]) => Promise<Array<{path: string, content: string | null}>>;
        writeMultipleFiles: (files: Array<{path: string, content: string}>) => Promise<void>;
      };
    };
    __TAURI__?: any;
    showOpenFilePicker?: any;
    showSaveFilePicker?: any;
    showDirectoryPicker?: any;
    tabManager?: any;
    monaco?: any;
  }
}