// src/ide/fileExplorer/fileLoader.ts
// ✅ FIXED VERSION - With project path synchronization for search panel
import { FileNode, updateFileStructure } from './types';

// ============================================================================
// FILE TREE STATE
// ============================================================================

let currentProjectPath: string = '';
let currentFiles: FileNode[] = [];
let isRefreshing = false;
let fileTreeContainer: HTMLElement | null = null;

// Store renderFileTree function reference (will be set by fileTreeRenderer)
let renderFunction: ((container: HTMLElement, files: FileNode[]) => void) | null = null;

/**
 * Set the render function (called by fileTreeRenderer)
 */
export function setRenderFunction(fn: (container: HTMLElement, files: FileNode[]) => void): void {
  renderFunction = fn;
  console.log('📁 [FileLoader] Render function registered');
}

/**
 * Set the file tree container element
 */
export function setFileTreeContainer(container: HTMLElement): void {
  fileTreeContainer = container;
  console.log('📁 [FileLoader] Container registered:', container.id || container.className);
}

/**
 * Get current project path
 */
export function getCurrentProjectPath(): string {
  // ✅ FIX: Also check window and localStorage
  if (currentProjectPath) {
    return currentProjectPath;
  }
  if ((window as any).currentProjectPath) {
    currentProjectPath = (window as any).currentProjectPath;
    return currentProjectPath;
  }
  const storedPath = localStorage.getItem('currentProjectPath');
  if (storedPath) {
    currentProjectPath = storedPath;
    return currentProjectPath;
  }
  return '';
}

/**
 * Set current project path
 * ✅ FIXED: Now syncs to window and localStorage for search panel
 */
export function setCurrentProjectPath(path: string): void {
  currentProjectPath = path;
  
  // ✅ FIX: Sync to window for search panel (robustFilterSolution.ts)
  (window as any).currentProjectPath = path;
  
  // ✅ FIX: Sync to localStorage for fileExplorer.ts
  if (path) {
    localStorage.setItem('currentProjectPath', path);
  }
  
  // ✅ FIX: Also set __lastProject for project persistence
  (window as any).__lastProject = {
    path: path,
    name: path.split(/[/\\]/).pop() || 'Project'
  };
  
  console.log('📂 [FileLoader] Project path set and synced:', path);
  
  // Dispatch event so other components know
  document.dispatchEvent(new CustomEvent('project-path-changed', {
    detail: { path }
  }));
}

/**
 * Get current files
 */
export function getCurrentFiles(): FileNode[] {
  return currentFiles;
}

// ============================================================================
// FILE TREE REFRESH
// ============================================================================

/**
 * Refresh the file tree - reloads from disk and triggers re-render
 */
export async function refreshFileTree(): Promise<FileNode[]> {
  if (isRefreshing) {
    console.log('🔄 [FileLoader] Refresh already in progress, skipping...');
    return currentFiles;
  }

  // ✅ FIX: Use getCurrentProjectPath() which checks multiple sources
  const projectPath = getCurrentProjectPath();
  if (!projectPath) {
    console.warn('⚠️ [FileLoader] No project path set, cannot refresh');
    return currentFiles;
  }

  console.log('🔄 [FileLoader] Refreshing file tree for:', projectPath);
  isRefreshing = true;

  try {
    const files = await loadProjectFiles(projectPath);
    console.log('✅ [FileLoader] File tree refreshed, found', files.length, 'items');
    
    // Re-render the tree
    reRenderTree();
    
    return files;
  } catch (error) {
    console.error('❌ [FileLoader] Error refreshing file tree:', error);
    return currentFiles;
  } finally {
    isRefreshing = false;
  }
}

/**
 * Re-render the file tree with current files
 */
export function reRenderTree(): void {
  // Try to find container if not set
  if (!fileTreeContainer) {
    fileTreeContainer = document.getElementById('file-tree') || 
                        document.querySelector('.file-tree') ||
                        document.querySelector('[data-file-tree]');
  }
  
  if (!fileTreeContainer) {
    console.warn('⚠️ [FileLoader] No file tree container found');
    return;
  }
  
  if (!renderFunction) {
    console.warn('⚠️ [FileLoader] No render function set, trying window.renderFileTree...');
    // Try to call renderFileTree from window if available
    if ((window as any).renderFileTree) {
      (window as any).renderFileTree(fileTreeContainer, currentFiles);
      return;
    }
    console.error('❌ [FileLoader] Cannot re-render: no render function available');
    return;
  }
  
  console.log('🎨 [FileLoader] Re-rendering tree with', currentFiles.length, 'items');
  renderFunction(fileTreeContainer, currentFiles);
}

/**
 * Setup event listeners for file tree refresh
 * Call this once when initializing your app
 */
export function setupFileTreeRefreshListeners(): void {
  console.log('📁 [FileLoader] Setting up file tree refresh listeners...');

  // Listen for all possible refresh event names
  const refreshEvents = [
    'file-tree-refresh',
    'refresh-file-tree',
    'fileTreeRefresh',
    'file-created',
    'file-deleted',
    'folder-created',
    'folder-deleted',
    'files-changed'
  ];

  const handleRefresh = async (e: Event) => {
    const eventName = e.type;
    const detail = (e as CustomEvent).detail;
    console.log(`📁 [FileLoader] Received ${eventName} event`, detail || '');
    await refreshFileTree();
  };

  refreshEvents.forEach(eventName => {
    // Listen on document
    document.addEventListener(eventName, handleRefresh);
    // Also listen on window
    window.addEventListener(eventName, handleRefresh);
  });

  // Expose refresh function globally
  (window as any).refreshFileTree = refreshFileTree;
  (window as any).reloadFileTree = refreshFileTree;
  (window as any).reRenderTree = reRenderTree;
  
  // ✅ FIX: Expose path functions globally
  (window as any).getCurrentProjectPath = getCurrentProjectPath;
  (window as any).setCurrentProjectPath = setCurrentProjectPath;

  console.log('✅ [FileLoader] File tree refresh listeners ready');
  console.log('   Events: file-tree-refresh, refresh-file-tree, fileTreeRefresh, file-created, etc.');
  console.log('   Global: window.refreshFileTree(), window.reloadFileTree()');
}

// ============================================================================
// LOAD PROJECT FILES
// ============================================================================

/**
 * Load project files - this uses Tauri v2 API
 */
export async function loadProjectFiles(folderPath: string): Promise<FileNode[]> {
  console.log('📂 [FileLoader] Loading project files from:', folderPath);
  
  // ✅ FIX: Use setCurrentProjectPath to sync everywhere
  setCurrentProjectPath(folderPath);
  
  try {
    if (window.__TAURI__) {
      // Use Tauri v2 plugin system
      const { readDir } = await import('@tauri-apps/plugin-fs');
      
      console.log('Using Tauri v2 API to read directory:', folderPath);
      
      // Read all files in the directory
      const entries = await readDir(folderPath, { 
        recursive: true 
      });
      
      console.log('Read directory entries:', entries.length, 'items');
      
      // Convert to FileNode structure
      const files = await processTauriEntries(entries, folderPath);
      console.log('Processed file structure:', files.length, 'root items');
      
      // Store current files
      currentFiles = files;
      
      // Update the file structure (for types.ts)
      updateFileStructure(files);
      
      // Dispatch event for any listeners
      document.dispatchEvent(new CustomEvent('files-loaded', { 
        detail: { files, path: folderPath } 
      }));
      
      return files;
    }
  } catch (error) {
    console.error('Error reading project directory with Tauri API:', error);
    console.log('Falling back to mock file structure');
  }
  
  // If Tauri API not available or error occurred, use mock data
  const mockFiles = getMockFileStructure();
  currentFiles = mockFiles;
  updateFileStructure(mockFiles);
  
  return mockFiles;
}

/**
 * Process Tauri v2 directory entries
 */
async function processTauriEntries(entries: any[], basePath: string): Promise<FileNode[]> {
  const result: FileNode[] = [];
  
  for (const entry of entries) {
    try {
      // In Tauri v2, entries have a different structure
      const isDirectory = entry.isDirectory || entry.isDir || false;
      const entryName = entry.name || getFileNameFromPath(entry.path);
      
      const node: FileNode = {
        name: entryName,
        path: entry.path,
        isDirectory: isDirectory,
        expanded: false
      };
      
      // For directories, we might need to read children separately in v2
      if (isDirectory) {
        try {
          const { readDir } = await import('@tauri-apps/plugin-fs');
          const childEntries = await readDir(entry.path);
          if (childEntries && childEntries.length > 0) {
            node.children = await processTauriEntries(childEntries, entry.path);
          } else {
            node.children = [];
          }
        } catch (childError) {
          console.warn(`Could not read children for directory ${entry.path}:`, childError);
          node.children = [];
        }
      }
      
      result.push(node);
    } catch (entryError) {
      console.warn('Error processing entry:', entry, entryError);
    }
  }
  
  // Sort: directories first, then files, alphabetically within each group
  result.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
  
  return result;
}

/**
 * Extract filename from path
 */
function getFileNameFromPath(path: string): string {
  if (!path) return 'unknown';
  
  // Handle both Windows and Unix paths
  const segments = path.replace(/\\/g, '/').split('/');
  return segments[segments.length - 1] || 'unknown';
}

/**
 * Alternative method using non-recursive approach for better performance
 */
export async function loadProjectFilesNonRecursive(folderPath: string): Promise<FileNode[]> {
  console.log('Loading project files (non-recursive) from:', folderPath);
  
  // ✅ FIX: Use setCurrentProjectPath to sync everywhere
  setCurrentProjectPath(folderPath);
  
  try {
    if (window.__TAURI__) {
      const { readDir } = await import('@tauri-apps/plugin-fs');
      
      // Read only immediate children
      const entries = await readDir(folderPath, { 
        recursive: false 
      });
      
      console.log('Read directory entries:', entries);
      
      const result: FileNode[] = [];
      
      for (const entry of entries) {
        const isDirectory = entry.isDirectory || entry.isDir || false;
        const entryName = entry.name || getFileNameFromPath(entry.path);
        
        const node: FileNode = {
          name: entryName,
          path: entry.path,
          isDirectory: isDirectory,
          expanded: false
        };
        
        // For directories, set children as empty array but mark them as expandable
        if (isDirectory) {
          node.children = [];
        }
        
        result.push(node);
      }
      
      // Sort: directories first, then files
      result.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      currentFiles = result;
      updateFileStructure(result);
      return result;
    }
  } catch (error) {
    console.error('Error reading project directory:', error);
  }
  
  // Fallback to mock data
  const mockFiles = getMockFileStructure();
  currentFiles = mockFiles;
  updateFileStructure(mockFiles);
  return mockFiles;
}

/**
 * Load children for a specific directory node (lazy loading)
 */
export async function loadDirectoryChildren(dirPath: string): Promise<FileNode[]> {
  try {
    if (window.__TAURI__) {
      const { readDir } = await import('@tauri-apps/plugin-fs');
      
      const entries = await readDir(dirPath, { recursive: false });
      const result: FileNode[] = [];
      
      for (const entry of entries) {
        const isDirectory = entry.isDirectory || entry.isDir || false;
        const entryName = entry.name || getFileNameFromPath(entry.path);
        
        const node: FileNode = {
          name: entryName,
          path: entry.path,
          isDirectory: isDirectory,
          expanded: false
        };
        
        if (isDirectory) {
          node.children = []; // Will be loaded when expanded
        }
        
        result.push(node);
      }
      
      // Sort: directories first, then files
      result.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      return result;
    }
  } catch (error) {
    console.error('Error loading directory children:', error);
  }
  
  return [];
}

/**
 * Check if a path exists and is accessible
 */
export async function checkPathExists(path: string): Promise<boolean> {
  try {
    if (window.__TAURI__) {
      const { exists } = await import('@tauri-apps/plugin-fs');
      return await exists(path);
    }
  } catch (error) {
    console.error('Error checking path existence:', error);
  }
  return false;
}

/**
 * Get mock file structure for development/fallback
 */
export function getMockFileStructure(): FileNode[] {
  return [
    {
      name: 'src',
      path: '/src',
      isDirectory: true,
      expanded: true,
      children: [
        {
          name: 'app.ts',
          path: '/src/app.ts',
          isDirectory: false
        },
        {
          name: 'utils.ts',
          path: '/src/utils.ts',
          isDirectory: false
        },
        {
          name: 'components',
          path: '/src/components',
          isDirectory: true,
          expanded: false,
          children: [
            {
              name: 'Header.tsx',
              path: '/src/components/Header.tsx',
              isDirectory: false
            },
            {
              name: 'Sidebar.tsx',
              path: '/src/components/Sidebar.tsx',
              isDirectory: false
            }
          ]
        },
        {
          name: 'ide',
          path: '/src/ide',
          isDirectory: true,
          expanded: false,
          children: [
            {
              name: 'fileExplorer',
              path: '/src/ide/fileExplorer',
              isDirectory: true,
              expanded: false,
              children: []
            },
            {
              name: 'terminal',
              path: '/src/ide/terminal',
              isDirectory: true,
              expanded: false,
              children: []
            }
          ]
        }
      ]
    },
    {
      name: 'public',
      path: '/public',
      isDirectory: true,
      expanded: false,
      children: [
        {
          name: 'index.html',
          path: '/public/index.html',
          isDirectory: false
        },
        {
          name: 'styles.css',
          path: '/public/styles.css',
          isDirectory: false
        }
      ]
    },
    {
      name: 'package.json',
      path: '/package.json',
      isDirectory: false
    },
    {
      name: 'tsconfig.json',
      path: '/tsconfig.json',
      isDirectory: false
    },
    {
      name: 'vite.config.ts',
      path: '/vite.config.ts',
      isDirectory: false
    }
  ];
}

// ============================================================================
// ✅ FIX: SYNC PROJECT PATH ON MODULE LOAD
// ============================================================================

/**
 * Sync project path from all sources on module load
 */
function syncProjectPathOnLoad(): void {
  // Check localStorage first (most reliable persistence)
  const storedPath = localStorage.getItem('currentProjectPath');
  if (storedPath) {
    currentProjectPath = storedPath;
    (window as any).currentProjectPath = storedPath;
    console.log('📂 [FileLoader] Restored project path from localStorage:', storedPath);
    return;
  }
  
  // Check window
  if ((window as any).currentProjectPath) {
    currentProjectPath = (window as any).currentProjectPath;
    localStorage.setItem('currentProjectPath', currentProjectPath);
    console.log('📂 [FileLoader] Synced project path from window:', currentProjectPath);
    return;
  }
  
  // Check __lastProject
  if ((window as any).__lastProject?.path) {
    currentProjectPath = (window as any).__lastProject.path;
    (window as any).currentProjectPath = currentProjectPath;
    localStorage.setItem('currentProjectPath', currentProjectPath);
    console.log('📂 [FileLoader] Restored project path from __lastProject:', currentProjectPath);
    return;
  }
  
  console.log('📂 [FileLoader] No stored project path found');
}

// ============================================================================
// AUTO-INITIALIZE
// ============================================================================

// Auto-setup listeners when this module is imported
if (typeof window !== 'undefined') {
  // ✅ FIX: Sync project path immediately
  syncProjectPathOnLoad();
  
  // Setup on next tick to ensure DOM is ready
  setTimeout(() => {
    setupFileTreeRefreshListeners();
    // Sync again after a delay in case other modules set the path
    syncProjectPathOnLoad();
  }, 100);
  
  // Also sync when tab changes to files
  document.addEventListener('tab-changed', (e: any) => {
    if (e.detail?.tab === 'files' || e.detail?.tabId === 'files') {
      syncProjectPathOnLoad();
    }
  });
}

console.log('📁 [FileLoader] Module loaded (with project path sync fix)');
