// src/ide/projectPersistence.ts
// Persist and restore project state across IDE sessions

console.log('💾 [ProjectPersistence] Loading...');

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  projectPath: 'ide_last_project_path',
  expandedFolders: 'expanded-folders',  // Already used by fileTreeRenderer
  openTabs: 'ide_open_tabs',
  activeTab: 'ide_active_tab'
};

// ============================================================================
// PROJECT PATH PERSISTENCE
// ============================================================================

export function saveProjectPath(path: string): void {
  if (path) {
    localStorage.setItem(STORAGE_KEYS.projectPath, path);
    console.log('💾 [Persist] Saved project path:', path);
  }
}

export function getSavedProjectPath(): string | null {
  return localStorage.getItem(STORAGE_KEYS.projectPath);
}

export function clearSavedProjectPath(): void {
  localStorage.removeItem(STORAGE_KEYS.projectPath);
  console.log('🗑️ [Persist] Cleared saved project path');
}

// ============================================================================
// OPEN TABS PERSISTENCE (Optional)
// ============================================================================

export function saveOpenTabs(tabs: string[]): void {
  localStorage.setItem(STORAGE_KEYS.openTabs, JSON.stringify(tabs));
}

export function getSavedOpenTabs(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.openTabs);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveActiveTab(path: string): void {
  localStorage.setItem(STORAGE_KEYS.activeTab, path);
}

export function getSavedActiveTab(): string | null {
  return localStorage.getItem(STORAGE_KEYS.activeTab);
}

// ============================================================================
// RESTORE PROJECT ON STARTUP
// ============================================================================

export async function restoreLastProject(): Promise<boolean> {
  const savedPath = getSavedProjectPath();
  
  if (!savedPath) {
    console.log('📂 [Persist] No saved project to restore');
    return false;
  }
  
  console.log('🔄 [Persist] Restoring project:', savedPath);
  
  try {
    // Use __TAURI__.core.invoke (works in Tauri v2)
    const invoke = (window as any).__TAURI__?.core?.invoke;
    
    if (!invoke) {
      // Fallback to import
      const tauriCore = await import('@tauri-apps/api/core');
      const invokeAlt = tauriCore.invoke;
      console.log('🔄 [Persist] Using imported invoke');
    }
    
    const invokeCmd = invoke || ((window as any).__TAURI__?.invoke);
    
    if (!invokeCmd) {
      console.log('⚠️ [Persist] No invoke method available');
      return false;
    }
    
    // Check if path still exists
    let exists = true;
    try {
      exists = await invokeCmd('path_exists', { path: savedPath }) as boolean;
    } catch {
      exists = true; // Assume exists if we can't check
    }
    
    if (!exists) {
      console.log('⚠️ [Persist] Saved path no longer exists:', savedPath);
      clearSavedProjectPath();
      return false;
    }
    
    // Find file tree container first
    const fileTree = document.getElementById('file-tree') || 
                     document.querySelector('.file-tree') as HTMLElement;
    
    if (!fileTree) {
      console.log('⚠️ [Persist] File tree container not found, retrying in 500ms...');
      setTimeout(() => restoreLastProject(), 500);
      return false;
    }
    
    // Try to read directory contents using Tauri commands
    // read_directory_detailed returns the correct format: {is_directory, name, path}
    let files: any = null;
    const commandsToTry = [
      'read_directory_detailed',  // This one works! Returns {is_directory, name, path}
      'read_directory_recursive',
      'read_directory_simple',
      'read_directory_contents',
    ];
    
    for (const cmd of commandsToTry) {
      try {
        files = await invokeCmd(cmd, { path: savedPath });
        console.log(`✅ [Persist] Command '${cmd}' returned`, Array.isArray(files) ? `${files.length} items` : 'data');
        break;
      } catch (e) {
        console.log(`⚠️ [Persist] Command '${cmd}' failed`);
      }
    }
    
    // If we got files, render them via menuSystem (project-opened event)
    if (files && Array.isArray(files)) {
      console.log('🔄 [Persist] Got', files.length, 'items');
      
      // Get project name from path
      const projectName = savedPath.split(/[/\\]/).pop() || 'Project';
      
      // Store current folder globally
      if ((window as any).__currentFolder !== undefined) {
        (window as any).__currentFolder = savedPath;
      }
      
      // MenuSystem expects this specific format:
      // { path: string, files: { name, path, is_directory, children } }
      const projectData = {
        name: projectName,
        path: savedPath,
        is_directory: true,
        children: files
      };
      
      // *** PRIORITY: Use updateFileExplorerWithProject (this is what works!) ***
      if ((window as any).updateFileExplorerWithProject) {
        console.log('🔄 [Persist] Using updateFileExplorerWithProject...');
        try {
          (window as any).updateFileExplorerWithProject(projectData, savedPath);
          console.log('✅ [Persist] Project restored via updateFileExplorerWithProject');
          return true;
        } catch (e) {
          console.log('⚠️ [Persist] updateFileExplorerWithProject failed:', e);
        }
      }
      
      // Fallback: Dispatch project-opened event
      console.log('🔄 [Persist] Dispatching project-opened event...');
      document.dispatchEvent(new CustomEvent('project-opened', { 
        detail: { 
          path: savedPath, 
          files: projectData,
          restored: true 
        } 
      }));
      
      // Also try direct rendering as backup
      if ((window as any).renderFileTree && fileTree) {
        console.log('🔄 [Persist] Also calling renderFileTree directly...');
        try {
          (window as any).renderFileTree(fileTree, files);
        } catch (e) {
          console.log('⚠️ [Persist] Direct render failed:', e);
        }
      }
      
      console.log('✅ [Persist] Project restored');
      return true;
    }
    
    // Fallback: Try using Tauri FS plugin directly
    console.log('🔄 [Persist] Trying Tauri FS plugin...');
    try {
      const { readDir } = await import('@tauri-apps/plugin-fs');
      const entries = await readDir(savedPath);
      
      // Detect separator
      const sep = savedPath.includes('/') ? '/' : '\\';
      
      // Convert to file tree format
      const fileList = entries.map((entry: any) => ({
        name: entry.name,
        path: savedPath + sep + entry.name,
        is_directory: entry.isDirectory || entry.isDir || false,
        isDirectory: entry.isDirectory || entry.isDir || false,
        children: (entry.isDirectory || entry.isDir) ? [] : undefined
      }));
      
      // Get project name
      const projectName = savedPath.split(/[/\\]/).pop() || 'Project';
      
      // Create project data in correct format
      const projectData = {
        name: projectName,
        path: savedPath,
        is_directory: true,
        children: fileList
      };
      
      // Store folder
      if ((window as any).__currentFolder !== undefined) {
        (window as any).__currentFolder = savedPath;
      }
      
      // Dispatch event
      document.dispatchEvent(new CustomEvent('project-opened', { 
        detail: { path: savedPath, files: projectData, restored: true } 
      }));
      
      // Also try direct methods
      if ((window as any).updateFileExplorerWithProject) {
        (window as any).updateFileExplorerWithProject(projectData, savedPath);
      } else if ((window as any).renderFileTree && fileTree) {
        (window as any).renderFileTree(fileTree, fileList);
      }
      
      console.log('✅ [Persist] Project restored via FS plugin');
      return true;
    } catch (fsError) {
      console.log('⚠️ [Persist] FS plugin failed:', fsError);
    }
    
    // Last resort: trigger a project load event that menuSystem might handle
    console.log('🔄 [Persist] Dispatching folder-selected event...');
    document.dispatchEvent(new CustomEvent('folder-selected', { 
      detail: { path: savedPath } 
    }));
    
    // Also try refreshFolderContents as backup
    if ((window as any).refreshFolderContents) {
      await (window as any).refreshFolderContents(savedPath);
    }
    
    document.dispatchEvent(new CustomEvent('project-opened', { 
      detail: { path: savedPath, restored: true } 
    }));
    
    return false;
    
  } catch (error) {
    console.error('❌ [Persist] Failed to restore project:', error);
    return false;
  }
}

// ============================================================================
// AUTO-DETECT PROJECT PATH
// ============================================================================

function detectProjectPath(): string | null {
  // Try to detect from file tree items
  const firstFile = document.querySelector('[data-path]');
  if (!firstFile) return null;
  
  const path = firstFile.getAttribute('data-path') || '';
  if (!path) return null;
  
  // Find project root (parent of src/lib/app folder)
  const parts = path.split(/[/\\]/);
  const sep = path.includes('/') ? '/' : '\\';
  
  for (let i = parts.length - 1; i >= 0; i--) {
    if (['src', 'lib', 'app', 'public'].includes(parts[i])) {
      return parts.slice(0, i).join(sep);
    }
  }
  
  // Fallback: go up 2 levels from file
  return parts.slice(0, -2).join(sep);
}

// Save current project (can be called manually)
export function saveCurrentProject(): void {
  const path = detectProjectPath();
  if (path) {
    saveProjectPath(path);
  } else {
    console.log('⚠️ [Persist] No project detected to save');
  }
}

// ============================================================================
// SETUP EVENT LISTENERS
// ============================================================================

function setupEventListeners(): void {
  // Save project path when opened
  document.addEventListener('project-opened', ((e: CustomEvent) => {
    const path = e.detail?.path || detectProjectPath();
    if (path && !e.detail?.restored) {
      saveProjectPath(path);
    }
  }) as EventListener);
  
  // Also listen for file-tree-refresh as backup (means project loaded)
  let projectSaved = false;
  document.addEventListener('file-tree-refresh', () => {
    if (!projectSaved) {
      const path = detectProjectPath();
      if (path && !getSavedProjectPath()) {
        saveProjectPath(path);
        projectSaved = true;
      }
    }
  });
  
  // Clear on close project
  document.addEventListener('close-project', () => {
    clearSavedProjectPath();
    localStorage.removeItem(STORAGE_KEYS.openTabs);
    localStorage.removeItem(STORAGE_KEYS.activeTab);
  });
  
  // Save open tabs when tab changes (optional - integrate with your tab manager)
  document.addEventListener('tab-opened', ((e: CustomEvent) => {
    const currentTabs = getSavedOpenTabs();
    const newPath = e.detail?.path;
    if (newPath && !currentTabs.includes(newPath)) {
      currentTabs.push(newPath);
      saveOpenTabs(currentTabs);
    }
  }) as EventListener);
  
  document.addEventListener('tab-closed', ((e: CustomEvent) => {
    const currentTabs = getSavedOpenTabs();
    const closedPath = e.detail?.path;
    if (closedPath) {
      const filtered = currentTabs.filter(t => t !== closedPath);
      saveOpenTabs(filtered);
    }
  }) as EventListener);
  
  document.addEventListener('tab-activated', ((e: CustomEvent) => {
    const path = e.detail?.path;
    if (path) {
      saveActiveTab(path);
    }
  }) as EventListener);
  
  console.log('✅ [Persist] Event listeners registered');
}

// ============================================================================
// INITIALIZE
// ============================================================================

export function initializeProjectPersistence(): void {
  console.log('🚀 [Persist] Initializing...');
  
  // Setup event listeners
  setupEventListeners();
  
  // Restore project after dependencies are ready
  const tryRestore = (attempt: number = 1) => {
    if (attempt > 15) {
      console.log('⚠️ [Persist] Max restore attempts reached');
      return;
    }
    
    // Check all required dependencies
    const hasRenderFn = typeof (window as any).renderFileTree === 'function';
    const hasUpdateFn = typeof (window as any).updateFileExplorerWithProject === 'function';
    const hasFileTree = document.getElementById('file-tree') || document.querySelector('.file-tree');
    const hasTauri = (window as any).__TAURI__?.core?.invoke;
    
    console.log(`⏳ [Persist] Attempt ${attempt}: renderFileTree=${hasRenderFn}, updateFileExplorer=${hasUpdateFn}, fileTree=${!!hasFileTree}, tauri=${!!hasTauri}`);
    
    // Need at least one render method and Tauri
    if ((!hasRenderFn && !hasUpdateFn) || !hasFileTree || !hasTauri) {
      console.log(`⏳ [Persist] Waiting for dependencies (attempt ${attempt})...`);
      setTimeout(() => tryRestore(attempt + 1), 500);
      return;
    }
    
    // All ready - restore!
    console.log('✅ [Persist] Dependencies ready, restoring...');
    restoreLastProject();
  };
  
  // Start checking after 1.5 seconds (give menuSystem time to initialize)
  setTimeout(() => tryRestore(1), 1500);
  
  // Expose globally for debugging
  (window as any).projectPersistence = {
    save: saveProjectPath,
    saveCurrent: saveCurrentProject,
    get: getSavedProjectPath,
    clear: clearSavedProjectPath,
    restore: restoreLastProject,
    detect: detectProjectPath,
    getTabs: getSavedOpenTabs,
    saveTabs: saveOpenTabs
  };
  
  // Auto-save when files are detected (runs once)
  const autoSaveCheck = setInterval(() => {
    const hasFiles = document.querySelector('[data-path]');
    const hasSaved = getSavedProjectPath();
    
    if (hasFiles && !hasSaved) {
      const path = detectProjectPath();
      if (path) {
        saveProjectPath(path);
        clearInterval(autoSaveCheck);
        console.log('✅ [Persist] Auto-saved project path');
      }
    }
  }, 2000);
  
  // Stop checking after 30 seconds
  setTimeout(() => clearInterval(autoSaveCheck), 30000);
  
  console.log('✅ [Persist] Ready! Use window.projectPersistence for debugging');
}

// Auto-initialize when module loads
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeProjectPersistence);
  } else {
    // DOM already loaded
    initializeProjectPersistence();
  }
}

export default initializeProjectPersistence;
