// src/ide/fileExplorer/fileTreeIntegration.ts
// ============================================================================
// FILE TREE INTEGRATION - Connects Context Menu, FileLoader, and Renderer
// ============================================================================
// 
// This file ensures that when files/folders are created via the context menu,
// the file tree automatically refreshes to show the new items.
//
// USAGE: Import this file in your main app entry point:
//   import './ide/fileExplorer/fileTreeIntegration';
//
// ============================================================================

console.log('🔗 [FileTreeIntegration] Loading...');

// ============================================================================
// STATE
// ============================================================================

interface FileTreeState {
  projectPath: string;
  container: HTMLElement | null;
  renderFn: ((container: HTMLElement, files: any[]) => void) | null;
  files: any[];
  isRefreshing: boolean;
  refreshId: number;
}

const state: FileTreeState = {
  projectPath: '',
  container: null,
  renderFn: null,
  files: [],
  isRefreshing: false,
  refreshId: 0
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Set the project path for refresh operations
 */
export function setProjectPath(path: string): void {
  state.projectPath = path;
  console.log('🔗 [FileTreeIntegration] Project path set:', path);
}

/**
 * Set the file tree container element
 */
export function setContainer(container: HTMLElement): void {
  state.container = container;
  console.log('🔗 [FileTreeIntegration] Container set:', container.id || container.className);
}

/**
 * Set the render function (from fileTreeRenderer)
 */
export function setRenderFunction(fn: (container: HTMLElement, files: any[]) => void): void {
  state.renderFn = fn;
  console.log('🔗 [FileTreeIntegration] Render function registered');
}

/**
 * Set current files
 */
export function setFiles(files: any[]): void {
  state.files = files;
}

/**
 * Get current files
 */
export function getFiles(): any[] {
  return state.files;
}

// ============================================================================
// REFRESH FUNCTION
// ============================================================================

/**
 * Refresh the file tree - reloads from disk and re-renders
 */
export async function refreshFileTree(): Promise<void> {
  if (state.isRefreshing) {
    console.log('🔗 [FileTreeIntegration] Refresh already in progress, skipping...');
    return;
  }

  console.log('🔄 [FileTreeIntegration] Refreshing file tree...');
  state.isRefreshing = true;

  try {
    // Get project path from reliable sources (priority order)
    let projectPath = state.projectPath || 
                      (window as any).currentFolderPath ||
                      localStorage.getItem('ide_last_project_path') ||
                      localStorage.getItem('projectPath') ||
                      '';
    
    // Validate the path - ensure it's not a parent "projects" folder
    if (projectPath) {
      const pathParts = projectPath.replace(/\\/g, '/').split('/').filter((p: string) => p);
      const lastFolder = pathParts[pathParts.length - 1]?.toLowerCase() || '';
      
      // If path looks like a parent folder, use stored project path instead
      if (lastFolder === 'projects' || lastFolder === 'desktop' || lastFolder === 'users') {
        const storedPath = localStorage.getItem('ide_last_project_path');
        if (storedPath && storedPath !== projectPath) {
          console.log('🔧 [FileTreeIntegration] Correcting path from', projectPath, 'to', storedPath);
          projectPath = storedPath;
          state.projectPath = storedPath;
          (window as any).currentFolderPath = storedPath;
        }
      }
    }
    
    // Last resort: try to detect from existing file items in DOM
    if (!projectPath) {
      const firstFile = document.querySelector('[data-path]');
      if (firstFile) {
        const path = firstFile.getAttribute('data-path') || '';
        const parts = path.split(/[/\\]/);
        // Find project root (parent of src, lib, app, etc.)
        for (let i = parts.length - 1; i >= 0; i--) {
          if (['src', 'lib', 'app', 'public'].includes(parts[i])) {
            projectPath = parts.slice(0, i).join(path.includes('/') ? '/' : '\\');
            break;
          }
        }
        if (!projectPath) {
          projectPath = parts.slice(0, -2).join(path.includes('/') ? '/' : '\\');
        }
        state.projectPath = projectPath;
      }
    }

    if (!projectPath) {
      console.warn('⚠️ [FileTreeIntegration] No project path available');
      return;
    }
    
    // Update state with validated path
    state.projectPath = projectPath;

    console.log('📂 [FileTreeIntegration] Loading files from:', projectPath);

    // Load files using Tauri API - use NON-RECURSIVE and build tree manually
    if (window.__TAURI__) {
      // Capture refresh ID before async operation for race condition guard
      const thisRefreshId = state.refreshId;

      // Build tree structure properly
      const files = await loadDirectoryRecursive(projectPath);

      // RACE CONDITION GUARD: If a new project was opened while loading, abort
      if (state.refreshId !== thisRefreshId) {
        console.log('âš ï¸ [FileTreeIntegration] Stale refresh detected (id:', thisRefreshId, 'vs current:', state.refreshId, ') - aborting');
        return;
      }
      // Also check if projectPath changed during async load
      const currentPath = (window as any).currentFolderPath || state.projectPath;
      if (currentPath && currentPath !== projectPath) {
        console.log('âš ï¸ [FileTreeIntegration] Project changed during refresh:', projectPath, '->', currentPath, '- aborting');
        return;
      }

      state.files = files;
      
      // Get project name from path
      const projectName = getFileName(projectPath);
      
      console.log('📂 [FileTreeIntegration] Built tree with', files.length, 'root items');
      
      // *** Dispatch project-opened event for menuSystem.ts ***
      console.log('🎨 [FileTreeIntegration] Dispatching project-opened for menuSystem');
      document.dispatchEvent(new CustomEvent('project-opened', {
        detail: {
          path: projectPath,
          files: {
            name: projectName,
            path: projectPath,
            is_directory: true,
            children: files
          }
        }
      }));
      
      console.log('✅ [FileTreeIntegration] Refresh complete');
    } else {
      console.warn('⚠️ [FileTreeIntegration] Tauri API not available');
    }

  } catch (error) {
    console.error('❌ [FileTreeIntegration] Refresh failed:', error);
  } finally {
    state.isRefreshing = false;
  }
}

/**
 * Load directory recursively - builds proper tree structure
 * NOTE: Tauri v2 readDir only returns name, we must construct full path
 */
async function loadDirectoryRecursive(dirPath: string): Promise<any[]> {
  try {
    const { readDir } = await import('@tauri-apps/plugin-fs');
    
    // Read ONLY immediate children (not recursive)
    const entries = await readDir(dirPath);
    const result: any[] = [];
    
    // Detect path separator
    const sep = dirPath.includes('\\') ? '\\' : '/';
    
    for (const entry of entries) {
      const isDirectory = entry.isDirectory || entry.isDir || false;
      const entryName = entry.name || '';
      
      if (!entryName) continue; // Skip entries without names
      
      // Construct full path (Tauri v2 doesn't provide it)
      const entryPath = dirPath + sep + entryName;
      
      const node: any = {
        name: entryName,
        path: entryPath,
        is_directory: isDirectory,
        isDirectory: isDirectory
      };
      
      // For directories, recursively load children
      if (isDirectory) {
        node.children = await loadDirectoryRecursive(entryPath);
      }
      
      result.push(node);
    }
    
    // Sort: directories first, then alphabetically
    result.sort((a, b) => {
      if (a.is_directory && !b.is_directory) return -1;
      if (!a.is_directory && b.is_directory) return 1;
      return a.name.localeCompare(b.name);
    });
    
    return result;
  } catch (error) {
    console.warn('Error loading directory:', dirPath, error);
    return [];
  }
}

/**
 * Re-render the file tree with current files
 */
export function reRenderTree(): void {
  // Find container if not set
  if (!state.container) {
    state.container = document.getElementById('file-tree') || 
                      document.querySelector('.file-tree') as HTMLElement ||
                      document.querySelector('[data-file-tree]') as HTMLElement;
  }

  if (!state.container) {
    console.warn('⚠️ [FileTreeIntegration] No container found for re-render');
    return;
  }

  // Try menuSystem first (your app uses this)
  if ((window as any).updateFileExplorerWithProject) {
    console.log('🎨 [FileTreeIntegration] Using menuSystem.updateFileExplorerWithProject');
    // Dispatch project-opened event which menuSystem listens to
    document.dispatchEvent(new CustomEvent('project-opened', {
      detail: {
        path: state.projectPath,
        files: { children: state.files, name: getFileName(state.projectPath) }
      }
    }));
    return;
  }

  // Use registered render function or try global
  const renderFn = state.renderFn || (window as any).renderFileTree;
  
  if (!renderFn) {
    console.warn('⚠️ [FileTreeIntegration] No render function available');
    return;
  }

  console.log('🎨 [FileTreeIntegration] Re-rendering with', state.files.length, 'items');
  renderFn(state.container, state.files);
}

/**
 * Extract filename from path
 */
function getFileName(path: string): string {
  if (!path) return 'unknown';
  const segments = path.replace(/\\/g, '/').split('/');
  return segments[segments.length - 1] || 'unknown';
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Setup all refresh event listeners
 */
function setupEventListeners(): void {
  console.log('🔗 [FileTreeIntegration] Setting up event listeners...');

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
    console.log(`🔗 [FileTreeIntegration] Event received: ${e.type}`);
    await refreshFileTree();
  };

  refreshEvents.forEach(eventName => {
    document.addEventListener(eventName, handleRefresh);
    window.addEventListener(eventName, handleRefresh);
  });
  
  // Listen for project-opened to update state (but don't trigger another refresh)
  document.addEventListener('project-opened', (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.path) {
      // Only update if it's a different path and not triggered by us
      const newPath = detail.path;
      if (newPath && newPath !== state.projectPath) {
        console.log('🔗 [FileTreeIntegration] Project path updated from event:', newPath);
        state.projectPath = newPath;
        // Also update window.currentFolderPath to keep in sync
        (window as any).currentFolderPath = newPath;
      }
    }
  });
  
  // Listen for folder-opened to update state
  document.addEventListener('folder-opened', (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.path) {
      console.log('🔗 [FileTreeIntegration] Folder path updated from event:', detail.path);
      state.projectPath = detail.path;
      (window as any).currentFolderPath = detail.path;
    }
  });

  console.log('✅ [FileTreeIntegration] Event listeners ready');
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  // Expose functions globally
  (window as any).refreshFileTree = refreshFileTree;
  (window as any).reloadFileTree = refreshFileTree;
  (window as any).reRenderTree = reRenderTree;
  (window as any).triggerFileTreeRefresh = () => {
    document.dispatchEvent(new CustomEvent('file-tree-refresh'));
  };

  // Store module reference
  (window as any).__fileTreeIntegration = {
    setProjectPath,
    setContainer,
    setRenderFunction,
    setFiles,
    getFiles,
    refreshFileTree,
    reRenderTree
  };

  // Auto-setup listeners
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventListeners);
  } else {
    setupEventListeners();
  }
}

console.log('✅ [FileTreeIntegration] Ready!');
console.log('   Call window.refreshFileTree() to refresh');
console.log('   Events: file-tree-refresh, file-created, folder-created, etc.');