// folderHandler.ts - Tauri-First Folder Operations
// Prioritizes Tauri's native APIs for all folder and file operations

import { 
  openFolderDialog, 
  getDirectoryTree, 
  showNotification, 
  isTauriAvailable,
  setCurrentFolderRootPath,
  readFile
} from './fileSystem';

import { invoke } from '@tauri-apps/api/core';

// Tauri-focused interfaces
interface TauriFileEntry {
  name: string;
  path: string;
  is_directory: boolean;
  size?: number;
  children?: TauriFileEntry[];
}

interface TauriDirectoryTree {
  name: string;
  path: string;
  is_directory: boolean;
  children?: TauriFileEntry[];
}

/**
 * Enhanced folder handler with Tauri-first integration
 */
export async function handleOpenFolder(): Promise<void> {
  try {
    console.log('🔄 Opening folder with Tauri-first handler...');
    
    // Check Tauri availability first
    if (!isTauriAvailable()) {
      console.error('❌ Tauri not available - folder operations require desktop app');
      showNotification('Folder operations require Tauri desktop app. Please run the desktop version.', 'error');
      return;
    }
    
    console.log('✅ Tauri available - proceeding with native folder operations');
    
    // Use Tauri's native folder dialog
    const folderPath = await openFolderDialog();
    
    if (!folderPath) {
      console.log('📁 Folder selection cancelled by user');
      return;
    }
    
    console.log('✅ Selected folder:', folderPath);
    showNotification('Loading folder structure...', 'info');
    
    // Load project files using Tauri's native directory reading
    const directoryTree = await getDirectoryTree(folderPath, 10);
    
    if (!directoryTree) {
      throw new Error('Failed to load directory structure using Tauri API');
    }
    
    console.log('📂 Directory tree loaded successfully via Tauri');
    console.log('🌳 Tree structure:', {
      name: directoryTree.name,
      path: directoryTree.path,
      childrenCount: directoryTree.children?.length || 0
    });
    
    // Store the folder root path globally
    setCurrentFolderRootPath(folderPath);
    
    // Convert Tauri format to standard format for UI compatibility
    const files = convertTauriTreeToStandardFormat(directoryTree);
    
    // Get the file explorer container element
    const fileExplorer = findFileExplorerContainer();
    
    if (fileExplorer) {
      console.log('🎯 Found file explorer container, rendering Tauri-loaded tree...');
      
      // Render the files in the explorer
      renderFileTreeFromTauri(fileExplorer, files, folderPath);
      
      // Update UI to show folder is opened
      updateUIForOpenedFolder(folderPath, directoryTree.name);
      
      // Dispatch enhanced project opened event with Tauri data
      document.dispatchEvent(new CustomEvent('project-opened', {
        detail: { 
          path: folderPath, 
          files: files,
          tauriTree: directoryTree,
          isTauriMode: true,
          source: 'tauri-native'
        }
      }));
      
      showNotification(`Opened folder: ${directoryTree.name} (Tauri)`, 'success');
      
    } else {
      console.error('❌ File explorer container not found');
      showNotification('File explorer container not found in UI', 'error');
    }
    
  } catch (error) {
    console.error('❌ Error handling open folder:', error);
    showNotification(`Failed to open folder: ${(error as Error).message}`, 'error');
  }
}

/**
 * Convert Tauri directory tree format to standard format for UI compatibility
 */
function convertTauriTreeToStandardFormat(tauriTree: TauriDirectoryTree): any[] {
  if (!tauriTree.children) {
    return [];
  }
  
  return tauriTree.children.map((child: TauriFileEntry) => ({
    name: child.name,
    path: child.path, // Full absolute path from Tauri
    isDirectory: child.is_directory,
    size: child.size,
    children: child.children ? child.children.map(subChild => ({
      name: subChild.name,
      path: subChild.path,
      isDirectory: subChild.is_directory,
      size: subChild.size,
      children: subChild.children ? convertTauriTreeToStandardFormat({ 
        name: subChild.name, 
        path: subChild.path, 
        is_directory: subChild.is_directory, 
        children: subChild.children 
      }) : undefined
    })) : undefined
  }));
}

/**
 * Find file explorer container with multiple fallback strategies
 */
function findFileExplorerContainer(): HTMLElement | null {
  // Try multiple selectors to find the explorer
  const selectors = [
    '.explorer-container',
    '#file-explorer-container',
    '.file-explorer',
    '.explorer-content',
    '.file-tree',
    '.sidebar .explorer',
    '.panel .explorer',
    '.explorer-panel',
    '[data-explorer]'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      console.log(`✅ Found file explorer using selector: ${selector}`);
      return element;
    }
  }
  
  // Try to find by content
  const allElements = document.querySelectorAll('*');
  for (const element of allElements) {
    if (element.textContent?.includes('EXPLORER') || 
        element.textContent?.includes('No folder opened') ||
        element.textContent?.includes('Open Folder')) {
      const container = element.closest('.panel, .sidebar, .container') as HTMLElement || 
                      element.parentElement as HTMLElement;
      if (container) {
        console.log('✅ Found file explorer by content search');
        return container;
      }
    }
  }
  
  console.warn('⚠️ File explorer container not found - will create fallback');
  return null;
}

/**
 * Enhanced file tree rendering with Tauri integration
 */
function renderFileTreeFromTauri(container: HTMLElement, files: any[], folderPath: string): void {
  // Clear existing content
  container.innerHTML = '';
  
  // Add enhanced header with Tauri indicator
  const header = document.createElement('div');
  header.className = 'file-tree-header';
  header.style.cssText = `
    padding: 8px 12px;
    border-bottom: 1px solid #444;
    background: rgba(255, 255, 255, 0.02);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    font-weight: bold;
    color: #cccccc;
    text-transform: uppercase;
    letter-spacing: 1px;
  `;
  
  const headerText = document.createElement('span');
  headerText.textContent = 'FILE EXPLORER (TAURI)';
  
  const statusIndicator = document.createElement('div');
  statusIndicator.style.cssText = `
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: #4CAF50;
  `;
  
  const statusDot = document.createElement('div');
  statusDot.style.cssText = `
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #4CAF50;
    box-shadow: 0 0 4px rgba(76, 175, 80, 0.6);
  `;
  
  const statusText = document.createElement('span');
  statusText.textContent = 'NATIVE';
  
  statusIndicator.appendChild(statusDot);
  statusIndicator.appendChild(statusText);
  
  header.appendChild(headerText);
  header.appendChild(statusIndicator);
  container.appendChild(header);
  
  // Add folder path display
  const pathDisplay = document.createElement('div');
  pathDisplay.className = 'folder-path-display';
  pathDisplay.style.cssText = `
    padding: 4px 12px;
    background: rgba(0, 120, 215, 0.1);
    border-bottom: 1px solid rgba(0, 120, 215, 0.2);
    font-size: 11px;
    color: #75beff;
    font-family: monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  pathDisplay.textContent = folderPath;
  pathDisplay.title = `Project Path: ${folderPath}`;
  container.appendChild(pathDisplay);
  
  // Create file tree container
  const treeContainer = document.createElement('div');
  treeContainer.className = 'file-tree-container';
  treeContainer.style.cssText = `
    padding: 8px;
    max-height: calc(100vh - 200px);
    overflow-y: auto;
    overflow-x: hidden;
  `;
  
  // Render files recursively
  files.forEach(file => {
    const fileElement = createTauriFileElement(file, 0);
    treeContainer.appendChild(fileElement);
  });
  
  container.appendChild(treeContainer);
  
  console.log(`✅ Rendered ${files.length} files in explorer (Tauri-native)`);
}

/**
 * Create file/folder element with Tauri integration and enhanced styling
 */
function createTauriFileElement(file: any, depth: number): HTMLElement {
  const element = document.createElement('div');
  element.className = 'file-tree-item';
  element.dataset.path = file.path; // Full absolute path from Tauri
  element.dataset.isDirectory = file.isDirectory.toString();
  element.dataset.fullPath = file.path; // Store full path for context menu
  
  element.style.cssText = `
    display: flex;
    align-items: center;
    padding: 4px 8px;
    margin-left: ${depth * 16}px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
    font-size: 13px;
    color: #cccccc;
    user-select: none;
  `;
  
  // Icon based on file type
  const icon = document.createElement('span');
  icon.style.cssText = `
    margin-right: 6px;
    font-size: 14px;
    width: 16px;
    text-align: center;
  `;
  
  if (file.isDirectory) {
    icon.textContent = '📁';
  } else {
    icon.textContent = getFileIcon(file.name);
  }
  
  // File/folder name
  const name = document.createElement('span');
  name.textContent = file.name;
  name.style.cssText = `
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  
  // File size (for files only)
  if (!file.isDirectory && file.size) {
    const size = document.createElement('span');
    size.textContent = formatFileSize(file.size);
    size.style.cssText = `
      font-size: 11px;
      color: #888;
      margin-left: 8px;
    `;
    element.appendChild(icon);
    element.appendChild(name);
    element.appendChild(size);
  } else {
    element.appendChild(icon);
    element.appendChild(name);
  }
  
  // Hover effects
  element.addEventListener('mouseenter', () => {
    element.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
    element.style.transform = 'translateX(2px)';
  });
  
  element.addEventListener('mouseleave', () => {
    element.style.backgroundColor = 'transparent';
    element.style.transform = 'translateX(0)';
  });
  
  // Click handler
  element.addEventListener('click', async (e) => {
    e.stopPropagation();
    
    if (file.isDirectory) {
      // Toggle folder expansion
      toggleFolderExpansion(element, file, depth);
    } else {
      // Open file using Tauri
      await openFileInEditorWithTauri(file);
    }
  });
  
  return element;
}

/**
 * Toggle folder expansion/collapse
 */
function toggleFolderExpansion(element: HTMLElement, folder: any, depth: number): void {
  const isExpanded = element.dataset.expanded === 'true';
  
  if (isExpanded) {
    // Collapse: remove children
    let nextSibling = element.nextElementSibling;
    while (nextSibling && (nextSibling as HTMLElement).style.marginLeft.includes(`${(depth + 1) * 16}px`)) {
      const toRemove = nextSibling;
      nextSibling = nextSibling.nextElementSibling;
      toRemove.remove();
    }
    
    element.dataset.expanded = 'false';
    const icon = element.querySelector('span');
    if (icon) icon.textContent = '📁';
    
  } else {
    // Expand: add children
    if (folder.children && folder.children.length > 0) {
      folder.children.forEach((child: any) => {
        const childElement = createTauriFileElement(child, depth + 1);
        element.parentNode?.insertBefore(childElement, element.nextSibling);
      });
    }
    
    element.dataset.expanded = 'true';
    const icon = element.querySelector('span');
    if (icon) icon.textContent = '📂';
  }
}

/**
 * Open file in editor using Tauri's native file reading
 */
async function openFileInEditorWithTauri(file: any): Promise<void> {
  try {
    if (!isTauriAvailable()) {
      showNotification('File operations require Tauri desktop app', 'error');
      return;
    }

    console.log(`🔄 Opening file in editor (Tauri-native): ${file.name}`);
    console.log(`📁 File path: ${file.path}`);
    
    // Read file content using Tauri's native API
    const content = await readFile(file.path);
    
    if (content !== null) {
      console.log(`✅ File content loaded via Tauri: ${content.length} characters`);
      
      // Try to use the tab manager first
      const tabManager = (window as any).tabManager;
      if (tabManager && typeof tabManager.addTab === 'function') {
        console.log('🎯 Using Monaco TabManager to open file');
        tabManager.addTab(file.path, content);
      } else {
        console.warn('⚠️ TabManager not available, loading directly into Monaco editor');
        // Fallback: Load directly into Monaco editor
        loadContentIntoMonacoEditor(content, file.name, file.path);
      }
      
      showNotification(`Opened ${file.name}`, 'success');
      
      // Dispatch file opened event with Tauri context
      document.dispatchEvent(new CustomEvent('file-opened', {
        detail: { 
          path: file.path, 
          name: file.name, 
          content: content,
          isTauriMode: true,
          source: 'tauri-native'
        }
      }));
      
    } else {
      throw new Error('Failed to read file content using Tauri API');
    }
    
  } catch (error) {
    console.error(`❌ Error opening file ${file.name}:`, error);
    showNotification(`Failed to open ${file.name}: ${(error as Error).message}`, 'error');
  }
}

/**
 * Load content directly into Monaco editor with language detection
 */
function loadContentIntoMonacoEditor(content: string, fileName: string, filePath: string): void {
  try {
    const editors = (window as any).monaco?.editor?.getEditors() || [];
    if (editors.length === 0) {
      console.warn('⚠️ No Monaco editors found');
      return;
    }

    // Find the main editor (not in assistant or terminal)
    let mainEditor = editors[0];
    for (const editor of editors) {
      const container = editor.getContainerDomNode();
      const isMainEditor = !container.closest('.ai-assistant') && 
                         !container.closest('.terminal') &&
                         container.offsetWidth > 300;
      
      if (isMainEditor) {
        mainEditor = editor;
        break;
      }
    }

    // Detect language from file extension
    const language = detectLanguageFromFileName(fileName) || 'typescript';
    
    // Create new model and set it
    const newModel = (window as any).monaco.editor.createModel(content, language);
    mainEditor.setModel(newModel);
    mainEditor.focus();
    
    // Update document title with Tauri indicator
    document.title = `${fileName} - AI Code IDE (Tauri)`;
    
    console.log(`✅ Content loaded into Monaco editor: ${fileName} (${content.length} chars)`);
    
  } catch (error) {
    console.error('❌ Error loading content into Monaco editor:', error);
  }
}

/**
 * Detect programming language from filename
 */
function detectLanguageFromFileName(fileName: string): string | null {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'c',
    'hpp': 'cpp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'sql': 'sql',
    'sh': 'shell',
    'bat': 'bat',
    'ps1': 'powershell'
  };
  
  return extension ? languageMap[extension] || null : null;
}

/**
 * Get file icon based on extension
 */
function getFileIcon(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  const iconMap: Record<string, string> = {
    'js': '🟨', 'jsx': '⚛️', 'ts': '🔷', 'tsx': '⚛️',
    'py': '🐍', 'java': '☕', 'cpp': '⚙️', 'c': '⚙️',
    'cs': '🔷', 'php': '🐘', 'rb': '💎', 'go': '🐹',
    'rs': '🦀', 'swift': '🍎', 'kt': '🟦',
    'html': '🌐', 'htm': '🌐', 'css': '🎨', 'scss': '🎨',
    'sass': '🎨', 'less': '🎨',
    'json': '📋', 'xml': '📋', 'yaml': '📋', 'yml': '📋',
    'toml': '📋', 'csv': '📊',
    'md': '📝', 'txt': '📝', 'readme': '📖',
    'env': '⚙️', 'config': '⚙️', 'ini': '⚙️', 'conf': '⚙️',
    'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
    'svg': '🖼️', 'ico': '🖼️',
    'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',
    'mp3': '🎵', 'wav': '🎵', 'mp4': '🎬', 'avi': '🎬', 'mov': '🎬',
    'pdf': '📄', 'doc': '📄', 'docx': '📄', 'xls': '📊', 'xlsx': '📊',
    'ppt': '📊', 'pptx': '📊'
  };
  
  return iconMap[extension] || '📄';
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Update UI elements to reflect an opened folder with Tauri enhancement
 */
function updateUIForOpenedFolder(folderPath: string, folderName: string): void {
  console.log(`🎯 Updating UI for opened folder: ${folderName} (${folderPath})`);
  
  // Update "No folder opened" message
  const noFolderElement = document.querySelector('.no-folder-message');
  if (noFolderElement) {
    noFolderElement.style.display = 'none';
  }
  
  // Hide "No folder opened" text if present
  const noFolderTextElement = document.getElementById('no-folder-opened');
  if (noFolderTextElement) {
    noFolderTextElement.style.display = 'none';
  }
  
  // Update document title with Tauri indicator
  document.title = `${folderName} - AI Code IDE (Tauri)`;
  
  // Update folder name display if present
  const folderNameElement = document.querySelector('.current-folder-name');
  if (folderNameElement) {
    folderNameElement.textContent = folderName;
    folderNameElement.setAttribute('title', `Tauri Project: ${folderPath}`);
  }
  
  // Show enhanced status in explorer
  const explorerTitle = document.querySelector('.file-tree-header');
  if (explorerTitle) {
    explorerTitle.setAttribute('title', `Folder: ${folderPath}\nMode: Native (Tauri)`);
  }
  
  // Add Tauri status indicator to the UI
  addTauriStatusIndicator(folderPath);
  
  console.log(`✅ UI updated for opened folder: ${folderPath} (Tauri-native)`);
}

/**
 * Add Tauri status indicator to the UI
 */
function addTauriStatusIndicator(folderPath: string): void {
  // Remove existing indicator
  const existingIndicator = document.querySelector('.tauri-status-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  // Create new status indicator
  const statusIndicator = document.createElement('div');
  statusIndicator.className = 'tauri-status-indicator';
  statusIndicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(76, 175, 80, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
    animation: slideInRight 0.3s ease;
  `;
  
  const icon = document.createElement('span');
  icon.textContent = '🖥️';
  
  const text = document.createElement('span');
  text.textContent = 'Tauri Native Mode';
  
  statusIndicator.appendChild(icon);
  statusIndicator.appendChild(text);
  statusIndicator.title = `Native Desktop Mode\nProject: ${folderPath}`;
  
  // Add CSS animation
  if (!document.querySelector('#tauri-status-styles')) {
    const style = document.createElement('style');
    style.id = 'tauri-status-styles';
    style.textContent = `
      @keyframes slideInRight {
        from { 
          opacity: 0; 
          transform: translateX(20px); 
        }
        to { 
          opacity: 1; 
          transform: translateX(0); 
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(statusIndicator);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (statusIndicator.parentNode) {
      statusIndicator.style.animation = 'slideInRight 0.3s ease reverse';
      setTimeout(() => statusIndicator.remove(), 300);
    }
  }, 5000);
  
  console.log('✅ Added Tauri status indicator');
}

/**
 * Enhanced folder operations for Tauri integration
 */
export const folderOperations = {
  /**
   * Check if Tauri is available
   */
  isTauriMode: (): boolean => isTauriAvailable(),
  
  /**
   * Get current folder capabilities (Tauri-focused)
   */
  getCapabilities: () => ({
    nativeDialogs: isTauriAvailable(),
    nativeFileOperations: isTauriAvailable(),
    recursiveDirectoryRead: isTauriAvailable(),
    systemIntegration: isTauriAvailable(),
    platformSpecific: isTauriAvailable()
  }),
  
  /**
   * Open folder with progress tracking using Tauri
   */
  openFolderWithProgress: async (onProgress?: (status: string) => void): Promise<void> => {
    if (!isTauriAvailable()) {
      const errorMsg = 'Tauri desktop app required for folder operations';
      onProgress?.(errorMsg);
      throw new Error(errorMsg);
    }

    onProgress?.('Initializing Tauri API...');
    
    try {
      onProgress?.('Opening native folder dialog...');
      await handleOpenFolder();
      onProgress?.('Complete - Folder loaded via Tauri');
    } catch (error) {
      const errorMsg = `Error: ${(error as Error).message}`;
      onProgress?.(errorMsg);
      throw error;
    }
  },

  /**
   * Test Tauri connection and capabilities
   */
  testTauriConnection: async (): Promise<boolean> => {
    try {
      if (!isTauriAvailable()) {
        console.log('❌ Tauri not available');
        return false;
      }
      
      // Test basic invoke functionality
      const appInfo = await invoke('get_app_info');
      console.log('✅ Tauri connection test successful:', appInfo);
      return true;
    } catch (error) {
      console.error('❌ Tauri connection test failed:', error);
      return false;
    }
  },

  /**
   * Get detailed system information via Tauri
   */
  getSystemInfo: async () => {
    try {
      if (!isTauriAvailable()) {
        return null;
      }
      
      const sysInfo = await invoke('get_system_info');
      return sysInfo;
    } catch (error) {
      console.error('❌ Error getting system info:', error);
      return null;
    }
  }
};

/**
 * Refresh current folder using Tauri
 */
export async function refreshCurrentFolder(): Promise<void> {
  try {
    if (!isTauriAvailable()) {
      showNotification('Refresh requires Tauri desktop app', 'error');
      return;
    }

    const currentFolderPath = (window as any).fileSystem?.getCurrentFolderRoot?.();
    
    if (!currentFolderPath) {
      showNotification('No folder currently opened to refresh', 'info');
      return;
    }

    console.log('🔄 Refreshing current folder via Tauri...');
    showNotification('Refreshing folder...', 'info');
    
    // Re-read the directory structure
    const directoryTree = await getDirectoryTree(currentFolderPath, 10);
    
    if (directoryTree) {
      // Find and update the file explorer
      const fileExplorer = findFileExplorerContainer();
      if (fileExplorer) {
        const files = convertTauriTreeToStandardFormat(directoryTree);
        renderFileTreeFromTauri(fileExplorer, files, currentFolderPath);
        showNotification('Folder refreshed successfully', 'success');
      }
    } else {
      throw new Error('Failed to refresh directory structure');
    }
    
  } catch (error) {
    console.error('❌ Error refreshing folder:', error);
    showNotification(`Failed to refresh folder: ${(error as Error).message}`, 'error');
  }
}

/**
 * Create new file in current folder using Tauri
 */
export async function createNewFileInFolder(fileName: string): Promise<void> {
  try {
    if (!isTauriAvailable()) {
      showNotification('File creation requires Tauri desktop app', 'error');
      return;
    }

    const currentFolderPath = (window as any).fileSystem?.getCurrentFolderRoot?.();
    
    if (!currentFolderPath) {
      showNotification('No folder opened - open a folder first', 'error');
      return;
    }

    const filePath = `${currentFolderPath}/${fileName}`;
    
    console.log(`📄 Creating new file via Tauri: ${filePath}`);
    
    // Create the file using Tauri
    await invoke('create_file', { path: filePath, content: '' });
    
    showNotification(`Created file: ${fileName}`, 'success');
    
    // Refresh the folder to show the new file
    await refreshCurrentFolder();
    
  } catch (error) {
    console.error('❌ Error creating new file:', error);
    showNotification(`Failed to create file: ${(error as Error).message}`, 'error');
  }
}

// Export enhanced folder handler
export default {
  handleOpenFolder,
  folderOperations,
  refreshCurrentFolder,
  createNewFileInFolder,
  
  // Utility functions
  convertTauriTreeToStandardFormat,
  findFileExplorerContainer,
  renderFileTreeFromTauri,
  createTauriFileElement,
  updateUIForOpenedFolder,
  
  // File operations
  openFileInEditorWithTauri,
  loadContentIntoMonacoEditor,
  detectLanguageFromFileName,
  getFileIcon,
  formatFileSize
};

console.log(`🎉 Enhanced Folder Handler loaded! (${isTauriAvailable() ? 'Tauri Native Mode ✅' : 'Web Browser Mode ❌ - Limited Functionality'})`);
console.log('💡 Use folderOperations.getCapabilities() to check available features');
console.log('🔧 Use folderOperations.testTauriConnection() to verify Tauri functionality');