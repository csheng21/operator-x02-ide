// projectLoadFix.ts - Fix for file explorer not showing all files after project creation
// =====================================================================================
// This fix addresses the race condition where file explorer loads before all project
// files are written to disk, causing incomplete file trees (especially nested folders)
// =====================================================================================

import { invoke } from '@tauri-apps/api/core';

// =====================================================================================
// CONFIGURATION
// =====================================================================================

const CONFIG = {
  // Initial delay before first directory read (ms)
  INITIAL_DELAY: 500,
  
  // Delay between retry attempts (ms)  
  RETRY_DELAY: 800,
  
  // Maximum retry attempts
  MAX_RETRIES: 3,
  
  // Minimum expected file count for common templates
  MIN_FILES_THRESHOLD: {
    'vite-react': 8,      // index.html, package.json, tsconfig, vite.config, src/App.tsx, src/main.tsx, src/App.css, src/index.css
    'vite-vue': 8,
    'next': 6,
    'express': 5,
    'default': 5
  },
  
  // Debug logging
  DEBUG: true
};

// =====================================================================================
// TYPES
// =====================================================================================

interface FileTreeItem {
  name: string;
  path: string;
  is_directory: boolean;
  children?: FileTreeItem[];
  size?: number;
}

interface ProjectInfo {
  projectName: string;
  projectPath: string;
  template?: string;
  files?: string[];
  timestamp?: number;
}

// =====================================================================================
// UTILITY FUNCTIONS
// =====================================================================================

function log(message: string, ...args: any[]): void {
  if (CONFIG.DEBUG) {
    console.log(`📂 [ProjectLoadFix] ${message}`, ...args);
  }
}

function warn(message: string, ...args: any[]): void {
  console.warn(`⚠️ [ProjectLoadFix] ${message}`, ...args);
}

/**
 * Count total files in a file tree (recursive)
 */
function countFilesInTree(tree: FileTreeItem): number {
  let count = 0;
  
  if (!tree.is_directory) {
    return 1;
  }
  
  if (tree.children) {
    for (const child of tree.children) {
      count += countFilesInTree(child);
    }
  }
  
  return count;
}

/**
 * Check if a directory has nested content (folders with children)
 */
function hasNestedContent(tree: FileTreeItem): boolean {
  if (!tree.children) return false;
  
  for (const child of tree.children) {
    if (child.is_directory && child.children && child.children.length > 0) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get minimum expected file count for a template type
 */
function getMinExpectedFiles(template?: string): number {
  if (!template) return CONFIG.MIN_FILES_THRESHOLD.default;
  
  const normalizedTemplate = template.toLowerCase();
  
  for (const [key, value] of Object.entries(CONFIG.MIN_FILES_THRESHOLD)) {
    if (normalizedTemplate.includes(key)) {
      return value;
    }
  }
  
  return CONFIG.MIN_FILES_THRESHOLD.default;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =====================================================================================
// MAIN FIX FUNCTIONS
// =====================================================================================

/**
 * Load folder contents with retry logic for newly created projects
 * This ensures all files are loaded even if the initial read happens too fast
 */
export async function loadFolderContentsWithRetry(
  folderPath: string, 
  options: {
    isNewProject?: boolean;
    expectedFiles?: number;
    template?: string;
    maxRetries?: number;
  } = {}
): Promise<FileTreeItem | null> {
  const {
    isNewProject = false,
    expectedFiles,
    template,
    maxRetries = CONFIG.MAX_RETRIES
  } = options;
  
  const minExpected = expectedFiles || getMinExpectedFiles(template);
  
  log(`Loading folder: ${folderPath}`);
  log(`Is new project: ${isNewProject}, Min expected files: ${minExpected}`);
  
  // For new projects, add initial delay to let files finish writing
  if (isNewProject) {
    log(`New project detected, waiting ${CONFIG.INITIAL_DELAY}ms for files to finish writing...`);
    await sleep(CONFIG.INITIAL_DELAY);
  }
  
  let lastTree: FileTreeItem | null = null;
  let lastFileCount = 0;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      log(`Attempt ${attempt + 1}/${maxRetries + 1}: Reading directory...`);
      
      const tree = await invoke<FileTreeItem>('read_directory_recursive', {
        path: folderPath,
        maxDepth: 5
      });
      
      const fileCount = countFilesInTree(tree);
      const hasNested = hasNestedContent(tree);
      
      log(`Found ${fileCount} files, has nested content: ${hasNested}`);
      
      lastTree = tree;
      lastFileCount = fileCount;
      
      // Check if we have enough files
      const hasEnoughFiles = fileCount >= minExpected;
      
      // For projects that should have nested folders (like src/), verify they have content
      const nestedCheck = !isNewProject || hasNested || fileCount > 3;
      
      if (hasEnoughFiles && nestedCheck) {
        log(`✅ Directory loaded successfully with ${fileCount} files`);
        return tree;
      }
      
      // If not enough files and we have retries left, wait and try again
      if (attempt < maxRetries) {
        log(`Only found ${fileCount} files (expected ${minExpected}), retrying in ${CONFIG.RETRY_DELAY}ms...`);
        await sleep(CONFIG.RETRY_DELAY);
      }
      
    } catch (error) {
      warn(`Attempt ${attempt + 1} failed:`, error);
      
      if (attempt < maxRetries) {
        await sleep(CONFIG.RETRY_DELAY);
      }
    }
  }
  
  // Return whatever we got, even if incomplete
  if (lastTree) {
    warn(`Returning incomplete tree with ${lastFileCount} files (expected ${minExpected})`);
    return lastTree;
  }
  
  return null;
}

/**
 * Enhanced project creation handler
 * Wraps the file explorer loading with proper retry logic
 */
export function setupProjectCreationHandler(): void {
  log('Setting up project creation handler...');
  
  // Listen for project-created events
  document.addEventListener('project-created', async (event: any) => {
    const info: ProjectInfo = event.detail;
    if (!info?.projectPath) return;
    
    log(`Project created: ${info.projectName} at ${info.projectPath}`);
    
    // Wait a bit for file system to settle
    await sleep(CONFIG.INITIAL_DELAY);
    
    // Load with retry logic
    const tree = await loadFolderContentsWithRetry(info.projectPath, {
      isNewProject: true,
      template: info.template,
      expectedFiles: info.files?.length
    });
    
    if (tree) {
      // Dispatch event to update the file explorer UI
      document.dispatchEvent(new CustomEvent('folder-structure-loaded', {
        detail: tree
      }));
      
      log(`✅ Project loaded with ${countFilesInTree(tree)} files`);
      
      // Schedule one more refresh after a delay to catch any stragglers
      setTimeout(async () => {
        log('Running follow-up refresh...');
        await triggerFileExplorerRefresh();
      }, 2000);
    }
  });
  
  log('✅ Project creation handler ready');
}

/**
 * Trigger a file explorer refresh
 */
async function triggerFileExplorerRefresh(): Promise<void> {
  // Try multiple methods to refresh
  
  // Method 1: Use window.fileExplorer.refresh if available
  if ((window as any).fileExplorer?.refresh) {
    try {
      await (window as any).fileExplorer.refresh();
      log('Refreshed via window.fileExplorer.refresh()');
      return;
    } catch (e) {
      warn('fileExplorer.refresh failed:', e);
    }
  }
  
  // Method 2: Dispatch refresh event
  document.dispatchEvent(new CustomEvent('refresh-file-explorer'));
  log('Dispatched refresh-file-explorer event');
}

/**
 * Auto-refresh when switching to a newly created project
 * Detects if current folder has incomplete content and refreshes
 */
export function setupAutoRefresh(): void {
  log('Setting up auto-refresh for incomplete folders...');
  
  // Listen for folder structure loaded events
  document.addEventListener('folder-structure-loaded', (event: any) => {
    const tree: FileTreeItem = event.detail;
    if (!tree) return;
    
    const fileCount = countFilesInTree(tree);
    const hasNested = hasNestedContent(tree);
    
    // If we have very few files and no nested content, likely incomplete
    if (fileCount < 4 && !hasNested) {
      log(`Detected potentially incomplete folder (${fileCount} files, no nested). Scheduling refresh...`);
      
      setTimeout(async () => {
        await triggerFileExplorerRefresh();
      }, 1500);
    }
  });
  
  log('✅ Auto-refresh ready');
}

// =====================================================================================
// PATCH: Enhanced loadFolderContents
// =====================================================================================

/**
 * Patch the existing loadFolderContents to include retry logic
 */
export function patchLoadFolderContents(): void {
  log('Patching loadFolderContents...');
  
  // Store reference to original if it exists
  const originalLoadFolder = (window as any).fileExplorer?.loadFolder;
  
  // Create enhanced version
  const enhancedLoadFolder = async (folderPath: string): Promise<void> => {
    // Check if this is a recently created project
    const lastProject = (window as any).__lastProject;
    const isNewProject = lastProject && 
      lastProject.projectPath === folderPath &&
      (Date.now() - (lastProject.timestamp || 0)) < 30000; // Created within 30 seconds
    
    if (isNewProject) {
      log('Detected recently created project, using retry logic...');
      
      const tree = await loadFolderContentsWithRetry(folderPath, {
        isNewProject: true,
        template: lastProject.template,
        expectedFiles: lastProject.files?.length
      });
      
      if (tree) {
        document.dispatchEvent(new CustomEvent('folder-structure-loaded', {
          detail: tree
        }));
      }
    } else if (originalLoadFolder) {
      // Use original for existing projects
      await originalLoadFolder(folderPath);
    }
  };
  
  // Replace in fileExplorer object if it exists
  if ((window as any).fileExplorer) {
    (window as any).fileExplorer.loadFolderWithRetry = enhancedLoadFolder;
  }
  
  log('✅ loadFolderContents patched');
}

// =====================================================================================
// INITIALIZATION
// =====================================================================================

/**
 * Initialize all project loading fixes
 */
export function initializeProjectLoadFix(): void {
  log('Initializing project load fixes...');
  
  setupProjectCreationHandler();
  setupAutoRefresh();
  
  // Patch after a short delay to ensure fileExplorer is loaded
  setTimeout(() => {
    patchLoadFolderContents();
  }, 1000);
  
  log('✅ Project load fixes initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeProjectLoadFix);
} else {
  // Small delay to ensure other modules are loaded
  setTimeout(initializeProjectLoadFix, 500);
}

// =====================================================================================
// GLOBAL EXPORTS
// =====================================================================================

// Export for manual use
(window as any).projectLoadFix = {
  loadWithRetry: loadFolderContentsWithRetry,
  refresh: triggerFileExplorerRefresh,
  init: initializeProjectLoadFix
};

console.log('✅ [ProjectLoadFix] Module loaded');
