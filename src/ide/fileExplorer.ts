// src/ide/fileExplorer.ts - Complete File Explorer with Enhanced Context Menu
// ============================================================================
// ENHANCED FILE EXPLORER SYSTEM v4.0 - IDE/Terminal Density Style
// Author: AI IDE Team
// Features: Context menu, path handling, visual feedback, auto-refresh
// ✅ MERGED: Compact professional tab system with SVG icons (from v3.0)
// ✅ MERGED: Grace period and visibility enforcement (from v2.2)
// ✅ MERGED: Retry configuration for new projects (from v2.2)
// ✅ FIXED: Project path synchronization for search panel
// ✅ FIXED: Race condition when loading newly created projects
// ✅ FIXED: Folder visibility after refresh/load
// ✅ NEW v4.0: IDE-style file tree with SVG icons, tree guide lines, compact sizes
// ============================================================================

import { invoke } from '@tauri-apps/api/core';
import { FileInfo } from '../types/fileTypes';
import { openFile, readFile, saveFile } from '../fileSystem';
import { tabManager } from '../editor/tabManager';
import { initializeExplorerSearch } from "./fileExplorer/explorerSearch";
import { renderFileTree } from './fileExplorer/fileTreeRenderer';

// ============================================================================
// ⚡ PERFORMANCE OPTIMIZATION - Skip heavy folders
// ============================================================================

const SKIP_FOLDERS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.output',
  '__pycache__',
  '.pytest_cache',
  'venv',
  '.venv',
  'env',
  '.env',
  'target',           // Rust
  'vendor',           // PHP/Go
  '.idea',            // JetBrains
  'coverage',
  '.cache',
  '.parcel-cache',
  '.turbo',
  'bower_components',
  '.gradle',
  '.maven',
  'Pods',             // iOS
  '.dart_tool',       // Flutter
  '.pub-cache',       // Dart
  'bin',
  'obj',              // .NET
]);

const SKIP_FILES = new Set([
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',
  '.gitkeep',
  '*.pyc',
]);

/**
 * Check if folder/file should be skipped for performance
 */
function shouldSkipEntry(name: string, isDirectory: boolean): boolean {
  if (isDirectory) {
    return SKIP_FOLDERS.has(name);
  }
  return SKIP_FILES.has(name);
}

/**
 * Filter folder structure to remove heavy folders (node_modules, .git, etc.)
 * This dramatically improves loading performance
 */
function filterFolderStructure(structure: any): any {
  if (!structure) return structure;
  
  const name = structure.name || structure.path?.split(/[/\\]/).pop() || '';
  
  // Skip files in skip list
  if (!structure.is_directory) {
    if (shouldSkipEntry(name, false)) {
      return null;
    }
    return structure;
  }
  
  // Skip entire folder if in skip list
  if (shouldSkipEntry(name, true)) {
    console.log(`⏭️ [Perf] Skipping heavy folder: ${name}`);
    return null;
  }
  
  // Process children recursively
  if (structure.children && Array.isArray(structure.children)) {
    structure.children = structure.children
      .map((child: any) => filterFolderStructure(child))
      .filter((child: any) => child !== null);
  }
  
  return structure;
}

/**
 * Count files in filtered structure
 */
function countFilteredFiles(tree: any): number {
  if (!tree) return 0;
  if (!tree.is_directory) return 1;
  
  let count = 0;
  if (tree.children && Array.isArray(tree.children)) {
    for (const child of tree.children) {
      count += countFilteredFiles(child);
    }
  }
  return count;
}
// ============================================================================
// COMPACT PROFESSIONAL TAB SYSTEM v3.0
// ============================================================================

// SVG Icons for tabs - crisp at any size
const TAB_ICONS = {
  files: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M1.5 2C1.5 1.45 1.95 1 2.5 1H6.3L8.35 3H13.5C14.05 3 14.5 3.45 14.5 4V13C14.5 13.55 14.05 14 13.5 14H2.5C1.95 14 1.5 13.55 1.5 13V2Z" stroke="currentColor" stroke-width="1.2"/>
  </svg>`,
  terminal: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="2" width="14" height="12" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
    <path d="M4 6L6.5 8L4 10M8 10H12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  search: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.2"/>
    <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`
};

/**
 * Initialize compact professional tab styles
 */
function initializeTabStyles(): void {
  console.log('🎨 [TabStyles] Initializing compact professional tabs...');
  injectTabStyles();
  setupTabClickHandlers();
  console.log('✅ [TabStyles] Ready');
}

/**
 * Inject CSS styles for compact professional tabs
 */
function injectTabStyles(): void {
  if (document.getElementById('compact-professional-tab-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'compact-professional-tab-styles';
  styles.textContent = `
    /* ============================================ */
    /* TAB CONTAINER - Compact 32px Height */
    /* ============================================ */
    .explorer-tabs,
    .explorer-tabs-container,
    .explorer-tabs-wrapper,
    .sidebar-tabs,
    .debug-tabs {
      display: flex !important;
      align-items: center !important;
      background: #252526 !important;
      border-bottom: 1px solid #3c3c3c !important;
      height: 32px !important;
      min-height: 32px !important;
      max-height: 32px !important;
      padding: 0 !important;
      gap: 0 !important;
      user-select: none !important;
      width: 100% !important;
      flex-shrink: 0 !important;
    }
    
    /* ============================================ */
    /* TAB BUTTON - Compact Design */
    /* ============================================ */
    .explorer-tab,
    .explorer-tab-v3,
    .sidebar-tab,
    .debug-tab {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 5px !important;
      height: 100% !important;
      padding: 0 10px !important;
      cursor: pointer !important;
      position: relative !important;
      color: #858585 !important;
      font-size: 11px !important;
      font-weight: 500 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.3px !important;
      white-space: nowrap !important;
      transition: color 0.15s ease, background 0.15s ease !important;
      border: none !important;
      background: transparent !important;
      outline: none !important;
      flex-shrink: 0 !important;
    }
    
    /* Tab Icon */
    .explorer-tab svg,
    .explorer-tab-v3 svg,
    .sidebar-tab svg,
    .debug-tab svg,
    .tab-icon svg {
      width: 14px !important;
      height: 14px !important;
      opacity: 0.85 !important;
      flex-shrink: 0 !important;
    }
    
    .tab-icon {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 14px !important;
      height: 14px !important;
    }
    
    /* ============================================ */
    /* HOVER STATE - Subtle Background */
    /* ============================================ */
    .explorer-tab:hover,
    .explorer-tab-v3:hover,
    .sidebar-tab:hover,
    .debug-tab:hover {
      color: #cccccc !important;
      background: rgba(255, 255, 255, 0.04) !important;
    }
    
    .explorer-tab:hover svg,
    .explorer-tab-v3:hover svg,
    .sidebar-tab:hover svg,
    .debug-tab:hover svg {
      opacity: 1 !important;
    }
    
    /* Hover underline preview */
    .explorer-tab:hover::after,
    .explorer-tab-v3:hover::after,
    .sidebar-tab:hover::after,
    .debug-tab:hover::after {
      background: rgba(79, 195, 247, 0.3) !important;
    }
    
    /* ============================================ */
    /* ACTIVE STATE - Blue Underline */
    /* ============================================ */
    .explorer-tab.active,
    .explorer-tab-v3.active,
    .sidebar-tab.active,
    .debug-tab.active {
      color: #ffffff !important;
    }
    
    .explorer-tab.active svg,
    .explorer-tab-v3.active svg,
    .sidebar-tab.active svg,
    .debug-tab.active svg {
      opacity: 1 !important;
    }
    
    /* Underline */
    .explorer-tab::after,
    .explorer-tab-v3::after,
    .sidebar-tab::after,
    .debug-tab::after {
      content: '' !important;
      position: absolute !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      height: 2px !important;
      background: transparent !important;
      transition: background 0.15s ease !important;
    }
    
    .explorer-tab.active::after,
    .explorer-tab-v3.active::after,
    .sidebar-tab.active::after,
    .debug-tab.active::after {
      background: #4fc3f7 !important;
    }
    
    /* Click press effect */
    .explorer-tab:active,
    .explorer-tab-v3:active,
    .sidebar-tab:active,
    .debug-tab:active {
      transform: translateY(1px) !important;
    }
    
    /* ============================================ */
    /* BADGES */
    /* ============================================ */
    .tab-badge {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      min-width: 14px !important;
      height: 12px !important;
      padding: 0 3px !important;
      margin-left: 4px !important;
      background: rgba(79, 195, 247, 0.2) !important;
      color: #4fc3f7 !important;
      font-size: 9px !important;
      font-weight: 600 !important;
      border-radius: 6px !important;
      line-height: 1 !important;
      transition: all 0.2s ease !important;
    }
    
    .explorer-tab.active .tab-badge,
    .explorer-tab-v3.active .tab-badge,
    .sidebar-tab.active .tab-badge,
    .debug-tab.active .tab-badge {
      background: rgba(79, 195, 247, 0.3) !important;
      transform: scale(1.05) !important;
    }
    
    /* Alert badge */
    .tab-badge.alert {
      background: rgba(244, 67, 54, 0.2) !important;
      color: #f44336 !important;
    }
    
    /* Terminal active dot */
    .tab-badge.dot {
      width: 6px !important;
      height: 6px !important;
      min-width: 6px !important;
      padding: 0 !important;
      border-radius: 50% !important;
      background: #4caf50 !important;
      margin-left: 5px !important;
      animation: tab-dot-pulse 2s ease-in-out infinite !important;
    }
    
    @keyframes tab-dot-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }
    
    /* ============================================ */
    /* KEYBOARD SHORTCUT TOOLTIP */
    /* ============================================ */
    .explorer-tab[data-shortcut]::before,
    .explorer-tab-v3[data-shortcut]::before,
    .sidebar-tab[data-shortcut]::before,
    .debug-tab[data-shortcut]::before {
      content: attr(data-shortcut) !important;
      position: absolute !important;
      bottom: calc(100% + 4px) !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      padding: 3px 6px !important;
      background: #1e1e1e !important;
      border: 1px solid #454545 !important;
      border-radius: 3px !important;
      color: #cccccc !important;
      font-size: 10px !important;
      font-weight: 400 !important;
      text-transform: none !important;
      letter-spacing: 0 !important;
      white-space: nowrap !important;
      z-index: 1000 !important;
      pointer-events: none !important;
      opacity: 0 !important;
      transition: opacity 0.15s ease 0.3s !important;
    }
    
    .explorer-tab[data-shortcut]:hover::before,
    .explorer-tab-v3[data-shortcut]:hover::before,
    .sidebar-tab[data-shortcut]:hover::before,
    .debug-tab[data-shortcut]:hover::before {
      opacity: 1 !important;
    }
  `;
  
  document.head.appendChild(styles);
}

/**
 * Setup tab click handlers for panel switching
 */
function setupTabClickHandlers(): void {
  // Get panels
  const filesContent = document.getElementById('files-content');
  const terminalContent = document.getElementById('terminal-content');
  const searchContent = document.getElementById('search-content');
  
  const panels = { files: filesContent, terminal: terminalContent, search: searchContent };

  // Tab switch function
  function switchToTab(tabId: string): void {
    console.log('📑 [TabStyles] Switching to:', tabId);

    // Find all tab containers
    const tabContainers = document.querySelectorAll('.explorer-tabs, .explorer-tabs-container, .explorer-tabs-wrapper, .sidebar-tabs, .debug-tabs');
    
    // Update all tab buttons
    tabContainers.forEach(container => {
      container.querySelectorAll('button').forEach(btn => {
        const text = btn.textContent?.toLowerCase().trim();
        btn.classList.remove('active');
        if (text === tabId || text?.includes(tabId)) {
          btn.classList.add('active');
        }
      });
    });

    // Update panels
    Object.entries(panels).forEach(([id, panel]) => {
      if (panel) {
        if (id === tabId) {
          panel.style.display = 'flex';
          panel.classList.remove('tab-hidden');
          panel.classList.add('tab-active');
        } else {
          panel.style.display = 'none';
          panel.classList.add('tab-hidden');
          panel.classList.remove('tab-active');
        }
      }
    });
  }

  // Add document-level click handler for tabs
  document.addEventListener('click', function(e) {
    const target = e.target as HTMLElement;
    const button = target.closest('button');
    if (!button) return;

    const text = button.textContent?.toLowerCase().trim();
    
    if (text === 'files' || text === 'terminal' || text === 'search') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Force switch with delay to override competing handlers
      setTimeout(() => switchToTab(text), 0);
      setTimeout(() => switchToTab(text), 50);
      setTimeout(() => switchToTab(text), 100);
      
      return false;
    }
  }, true);

  // Setup keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+E = Files
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      switchToTab('files');
    }
    // Ctrl+` = Terminal
    if ((e.ctrlKey || e.metaKey) && e.key === '`') {
      e.preventDefault();
      switchToTab('terminal');
    }
    // Ctrl+Shift+F = Search
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      switchToTab('search');
    }
  });

  // Export switch function
  (window as any).switchExplorerTab = switchToTab;
}

/**
 * Update badge count on a tab
 */
function updateTabBadge(tabSelector: string, count: number | string): void {
  const tab = document.querySelector(tabSelector);
  if (!tab) return;
  
  let badge = tab.querySelector('.tab-badge') as HTMLElement;
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'tab-badge';
    tab.appendChild(badge);
  }
  
  badge.textContent = count.toString();
  badge.style.display = count === 0 || count === '0' ? 'none' : 'inline-flex';
}

/**
 * Set terminal active indicator (green dot)
 */
function setTerminalActive(active: boolean): void {
  const terminalTab = document.querySelector('[data-tab="terminal"], [data-id="terminal"], .terminal-tab');
  if (!terminalTab) return;
  
  let badge = terminalTab.querySelector('.tab-badge') as HTMLElement;
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'tab-badge';
    terminalTab.appendChild(badge);
  }
  
  if (active) {
    badge.className = 'tab-badge dot';
    badge.textContent = '';
    badge.style.display = 'inline-flex';
  } else {
    badge.className = 'tab-badge';
    badge.style.display = 'none';
  }
}

// Export tab functions to window
(window as any).initializeTabStyles = initializeTabStyles;
(window as any).updateTabBadge = updateTabBadge;
(window as any).setTerminalActive = setTerminalActive;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface FileTreeItem {
  name: string;
  path: string;
  is_directory: boolean;
  children?: FileTreeItem[];
  size?: number;
}

interface ContextMenuState {
  target: HTMLElement | null;
  path: string | null;
  isFolder: boolean;
}

// ============================================================================
// GLOBAL STATE MANAGEMENT
// ============================================================================

let currentContextTarget: HTMLElement | null = null;
let currentContextPath: string | null = null;
let currentIsFolder: boolean = false;
let debugMode: boolean = true; // Enable debug logging
let fileTreeObserver: MutationObserver | null = null;

// ✅ NEW: Track new project state for grace period (from v2.2)
let newProjectState: {
  path: string;
  timestamp: number;
  gracePeriodActive: boolean;
} | null = null;

// ============================================================================
// ✅ ENHANCED: RETRY CONFIGURATION FOR NEW PROJECTS (from v2.2)
// ============================================================================

const LOAD_CONFIG = {
  // Initial delay before first directory read for new projects (ms)
  INITIAL_DELAY: 600,
  
  // Delay between retry attempts (ms)  
  RETRY_DELAY: 800,
  
  // Maximum retry attempts for new projects
  MAX_RETRIES: 3,
  
  // Minimum expected file count for common templates
  MIN_FILES_THRESHOLD: 5,
  
  // Time window to consider a project as "newly created" (ms)
  NEW_PROJECT_WINDOW: 30000,
  
  // Grace period to disable filters (ms)
  GRACE_PERIOD_DURATION: 5000,
  
  // Refresh delays after project creation (ms)
  REFRESH_DELAYS: [800, 1500, 2500, 4000]
};

// ============================================================================
// PATH UTILITIES
// ============================================================================

/**
 * FUNCTION: getPathSeparator
 * Get the correct path separator for the current operating system
 * @returns {string} Path separator ('\\' for Windows, '/' for Unix)
 */
function getPathSeparator(): string {
  if (window.__TAURI__) {
    return '\\'; // Windows (Tauri default)
  }
  const isWindows = navigator.platform.toLowerCase().includes('win');
  return isWindows ? '\\' : '/';
}

/**
 * FUNCTION: normalizePath
 * Normalize path to use correct separator for current OS
 * @param {string} path - Path to normalize
 * @returns {string} Normalized path with correct separators
 */
function normalizePath(path: string): string {
  const separator = getPathSeparator();
  return path.replace(/[\/\\]/g, separator);
}

/**
 * FUNCTION: getParentDirectory
 * Extract parent directory from a full path
 * @param {string} path - Full path to file or folder
 * @returns {string} Parent directory path
 */
function getParentDirectory(path: string): string {
  const separator = getPathSeparator();
  const parts = path.split(/[\/\\]/);
  parts.pop();
  return parts.join(separator);
}

/**
 * FUNCTION: getFileName
 * Extract filename from full path
 * @param {string} path - Full path to file
 * @returns {string} Filename without path
 */
function getFileName(path: string): string {
  return path.split(/[\/\\]/).pop() || path;
}

/**
 * FUNCTION: joinPath
 * Join path segments with correct separator
 * @param {...string} segments - Path segments to join
 * @returns {string} Joined path
 */
function joinPath(...segments: string[]): string {
  const separator = getPathSeparator();
  return segments.filter(s => s).join(separator);
}

/**
 * FUNCTION: sleep
 * Async sleep helper (from v2.2)
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * FUNCTION: convertToSystemPath
 * Convert and clean path for system operations
 * Removes UNC prefixes and normalizes path format
 * @param {string} path - Path to convert
 * @returns {string} Cleaned system path
 */
function convertToSystemPath(path: string): string {
  console.log('🔄 Converting path for system:', path);
  
  // Remove any Windows UNC prefix if present
  let cleanPath = path.replace(/^\\\\\?\\/, '').replace(/^\\?\?\\/, '');
  
  // If it's already a full Windows path, just normalize separators
  if (cleanPath.match(/^[A-Z]:\\/i) || cleanPath.match(/^[A-Z]:\//i)) {
    const normalized = cleanPath.replace(/\//g, '\\');
    console.log('✅ Windows path detected:', normalized);
    return normalized;
  }
  
  // If it's a Unix absolute path, return as-is
  if (cleanPath.startsWith('/')) {
    console.log('✅ Unix path detected:', cleanPath);
    return cleanPath;
  }
  
  // Get the current project path as base
  const projectPath = localStorage.getItem('currentProjectPath') || '';
  
  if (projectPath) {
    // Remove UNC prefix from project path too
    const cleanProjectPath = projectPath.replace(/^\\\\\?\\/, '').replace(/^\\?\?\\/, '');
    
    // Determine separator based on project path
    const separator = cleanProjectPath.includes('\\') ? '\\' : '/';
    const fullPath = `${cleanProjectPath}${separator}${cleanPath.replace(/[/\\]/g, separator)}`;
    console.log('✅ Combined with project path:', fullPath);
    return fullPath;
  }
  
  console.warn('⚠️ No project path found, returning cleaned path:', cleanPath);
  return cleanPath;
}

// ============================================================================
// ✅ NEW: PROJECT GRACE PERIOD MANAGEMENT (from v2.2)
// ============================================================================

/**
 * Check if currently in grace period for new project
 */
function isInGracePeriod(): boolean {
  if (!newProjectState?.gracePeriodActive) return false;
  
  const elapsed = Date.now() - newProjectState.timestamp;
  if (elapsed > LOAD_CONFIG.GRACE_PERIOD_DURATION) {
    newProjectState.gracePeriodActive = false;
    return false;
  }
  
  return true;
}

/**
 * Start grace period for new project
 */
function startGracePeriod(projectPath: string): void {
  console.log('🔧 [FileExplorer] Starting grace period for:', projectPath);
  
  newProjectState = {
    path: projectPath,
    timestamp: Date.now(),
    gracePeriodActive: true
  };
  
  // Store on window for other modules
  (window as any).__newProjectGracePeriod = true;
  (window as any).__lastProject = {
    path: projectPath,
    projectPath: projectPath,
    timestamp: Date.now()
  };
  
  // Auto-end grace period
  setTimeout(() => {
    if (newProjectState) {
      newProjectState.gracePeriodActive = false;
    }
    (window as any).__newProjectGracePeriod = false;
    console.log('🔧 [FileExplorer] Grace period ended');
  }, LOAD_CONFIG.GRACE_PERIOD_DURATION);
}

// ============================================================================
// ✅ NEW: VISIBILITY ENFORCEMENT (from v2.2)
// ============================================================================

/**
 * FUNCTION: ensureAllFilesVisible
 * Force all files in file tree to be visible
 * This bypasses any filter or CSS hiding
 */
export function ensureAllFilesVisible(): void {
  const fileTree = document.querySelector('.file-tree');
  if (!fileTree) return;
  
  let fixedCount = 0;
  
  // 1. Remove filter-hidden class from all items
  fileTree.querySelectorAll('.filter-hidden').forEach(item => {
    item.classList.remove('filter-hidden');
    fixedCount++;
  });
  
  // 2. Ensure all data-path items are displayed
  fileTree.querySelectorAll('[data-path]').forEach(item => {
    const el = item as HTMLElement;
    if (window.getComputedStyle(el).display === 'none') {
      el.style.display = 'flex';
      fixedCount++;
    }
    if (window.getComputedStyle(el).visibility === 'hidden') {
      el.style.visibility = 'visible';
      fixedCount++;
    }
  });
  
  // 3. Ensure child containers (div with margin-left) are visible
  fileTree.querySelectorAll('div[style*="margin-left"]').forEach(container => {
    const el = container as HTMLElement;
    if (window.getComputedStyle(el).display === 'none') {
      el.style.display = 'block';
      fixedCount++;
    }
  });
  
  // 4. Specifically ensure src folder children are visible
  fileTree.querySelectorAll('[data-path*="\\\\src\\\\"], [data-path*="/src/"]').forEach(item => {
    const el = item as HTMLElement;
    el.style.display = 'flex';
    el.style.visibility = 'visible';
    el.classList.remove('filter-hidden', 'hidden', 'collapsed');
  });
  
  // 5. Remove any collapsed state
  fileTree.querySelectorAll('.collapsed').forEach(item => {
    item.classList.remove('collapsed');
    fixedCount++;
  });
  
  // 6. Ensure file-container children are visible
  fileTree.querySelectorAll('.file-container > div').forEach(child => {
    const el = child as HTMLElement;
    if (window.getComputedStyle(el).display === 'none') {
      el.style.display = 'block';
      fixedCount++;
    }
  });
  
  if (fixedCount > 0) {
    console.log(`✅ [FileExplorer] Fixed visibility for ${fixedCount} items`);
  }
}

/**
 * FUNCTION: expandAllFolders
 * Expand all folders in the file tree (from v2.2)
 */
export function expandAllFolders(): void {
  const fileTree = document.querySelector('.file-tree');
  if (!fileTree) return;
  
  // Find all folder items
  fileTree.querySelectorAll('.folder-item, .directory, [data-is-directory="true"]').forEach(folder => {
    const el = folder as HTMLElement;
    
    // Remove collapsed class
    el.classList.remove('collapsed');
    
    // Update chevron icon if present
    const chevron = el.querySelector('.chevron, .folder-chevron');
    if (chevron) {
      chevron.textContent = '▼';
    }
    
    // Find and show child container
    const nextEl = el.nextElementSibling as HTMLElement;
    if (nextEl && nextEl.style.marginLeft) {
      nextEl.style.display = 'block';
    }
  });
  
  // Also expand any collapsed child containers
  fileTree.querySelectorAll('div[style*="margin-left"]').forEach(container => {
    const el = container as HTMLElement;
    el.style.display = 'block';
  });
  
  console.log('✅ [FileExplorer] All folders expanded');
}

// ============================================================================
// ✅ NEW: HELPER FUNCTIONS FOR FILE COUNTING (from v2.2)
// ============================================================================

/**
 * FUNCTION: countFilesRecursive
 * Count total files in a directory tree structure
 * @param {any} tree - Directory tree object
 * @returns {number} Total file count
 */
function countFilesRecursive(tree: any): number {
  if (!tree) return 0;
  
  let count = 0;
  
  if (!tree.is_directory) {
    return 1;
  }
  
  if (tree.children && Array.isArray(tree.children)) {
    for (const child of tree.children) {
      count += countFilesRecursive(child);
    }
  }
  
  return count;
}

/**
 * FUNCTION: hasNestedContent
 * Check if directory tree has nested folders with content
 * @param {any} tree - Directory tree object
 * @returns {boolean} True if has nested content
 */
function hasNestedContent(tree: any): boolean {
  if (!tree?.children) return false;
  
  return tree.children.some((child: any) => 
    child.is_directory && child.children && child.children.length > 0
  );
}

/**
 * FUNCTION: isNewlyCreatedProject
 * Check if a project path corresponds to a recently created project
 * @param {string} projectPath - Path to check
 * @returns {boolean} True if newly created
 */
function isNewlyCreatedProject(projectPath: string): boolean {
  // Check window state
  const lastProject = (window as any).__lastProject;
  if (lastProject && lastProject.projectPath === projectPath) {
    const elapsed = Date.now() - (lastProject.timestamp || 0);
    if (elapsed < LOAD_CONFIG.NEW_PROJECT_WINDOW) {
      return true;
    }
  }
  
  // Check local state
  if (newProjectState && newProjectState.path === projectPath) {
    const elapsed = Date.now() - newProjectState.timestamp;
    if (elapsed < LOAD_CONFIG.NEW_PROJECT_WINDOW) {
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// ✅ FIX: PROJECT PATH SYNCHRONIZATION HELPER
// ============================================================================

/**
 * FUNCTION: syncProjectPath
 * Sync project path to all storage locations
 * ✅ This ensures search panel can find the project path
 * ✅ UPDATED: Now syncs with build system for correct project detection
 * @param {string} path - Project path to sync
 */
function syncProjectPath(path: string): void {
  if (!path) return;
  
  const normalizedPath = normalizePath(path);
  
  // 1. Save to localStorage (primary)
  localStorage.setItem('currentProjectPath', normalizedPath);
  localStorage.setItem('lastOpenedFolder', normalizedPath);
  localStorage.setItem('projectPath', normalizedPath);
  localStorage.setItem('ide_last_project_path', normalizedPath); // ✅ NEW: For build system
  
  // 2. Save to window (for robustFilterSolution.ts search panel)
  (window as any).currentProjectPath = normalizedPath;
  (window as any).__currentProjectPath = normalizedPath;
  (window as any).currentFolderPath = normalizedPath; // ✅ NEW: For build system (checked first!)
  
  // 3. Save to __lastProject (for project persistence)
  (window as any).__lastProject = {
    path: normalizedPath,
    projectPath: normalizedPath,
    name: normalizedPath.split(/[/\\]/).pop() || 'Project',
    timestamp: Date.now()
  };
  
  // 4. File explorer's setProjectPath IS this function (syncProjectPath)
  // DO NOT call fileExplorer.setProjectPath here - it causes infinite recursion!
  // Other components should call window.fileExplorer.setProjectPath() or syncProjectPath() directly
  
  console.log('📂 [FileExplorer] Project path synced to all locations:', normalizedPath);
  
  // 5. Dispatch event for other components
  document.dispatchEvent(new CustomEvent('project-path-changed', {
    detail: { path: normalizedPath }
  }));
  
  // 6. ✅ NEW: Dispatch folder-changed event for build system
  window.dispatchEvent(new CustomEvent('folder-changed', {
    detail: { path: normalizedPath }
  }));
  
  // 7. ✅ NEW: Force refresh build system dropdown when project changes
  setTimeout(() => {
    if ((window as any).__buildSystemUI?.forceRefreshBuildSystem) {
      console.log('📂 [FileExplorer] Triggering build system refresh');
      (window as any).__buildSystemUI.forceRefreshBuildSystem();
    }
  }, 100);
}

// ============================================================================
// MAIN INITIALIZATION FUNCTION
// ============================================================================

/**
 * FUNCTION: initializeFileExplorer
 * Initialize the complete file explorer system
 * Sets up file tree, context menu, event handlers, and global functions
 */
export function initializeFileExplorer(): void {
  console.log('🚀 Initializing enhanced file explorer v4.0 (IDE-style tree)...');
  
  const fileTree = document.querySelector('.file-tree');
  if (!fileTree) {
    console.error('❌ File tree container not found');
    return;
  }
  
  // ✅ NEW: Initialize compact professional tab styles first
  initializeTabStyles();
  
  // ✅ FIX: Restore project path from localStorage on init
  const storedPath = localStorage.getItem('currentProjectPath');
  if (storedPath) {
    syncProjectPath(storedPath);
    console.log('📂 [FileExplorer] Restored project path:', storedPath);
  }
  
  // Initialize all subsystems
  clearFileExplorer();
  loadInitialFiles();
  setupFileExplorerEvents();
  setupContextMenu();
  
  // ✅ NEW: Enable drag & drop support for breadcrumb integration
  setupDragSupport();
  
  // ✅ NEW: Set up event listeners for new project handling (from v2.2)
  setupNewProjectListeners();
  
  // ✅ NEW: Set up visibility enforcement (from v2.2)
  setupVisibilityEnforcement();
  
  // Fix missing data-path attributes with retries
  setTimeout(() => fixSubfolderPaths(), 500);
  setTimeout(() => fixSubfolderPaths(), 1500);
  setTimeout(() => fixSubfolderPaths(), 3000);

  try {
    console.log('Initializing search system...');
    setTimeout(() => {
      const searchSystem = initializeExplorerSearch();
      (window as any).explorerSearch = searchSystem;
      console.log('✅ Search system ready');
    }, 1000);
  } catch (error) {
    console.error('Error initializing search:', error);
  }
  
  // Add chevrons with multiple retries
  const addChevronAttempts = [100, 500, 1000, 2000];
  addChevronAttempts.forEach(delay => {
    setTimeout(() => {
      addVisibleChevrons();
      fixSubfolderPaths();
    }, delay);
  });
  
  // Monitor DOM changes for dynamic updates
  if (fileTreeObserver) {
    fileTreeObserver.disconnect();
  }
  
  fileTreeObserver = new MutationObserver(() => {
    setTimeout(() => {
      addVisibleChevrons();
      fixSubfolderPaths();
    }, 100);
  });
  
  fileTreeObserver.observe(fileTree, {
    childList: true,
    subtree: true
  });
  
  // Export functions globally for external access
  (window as any).fileExplorer = {
    refresh: refreshFileExplorer,
    addFile: addFileToExplorer,
    removeFile: removeFileFromExplorer,
    clearFiles: clearFileExplorer,
    openFolder: openFolderDialog,
    createFile: createNewFile,
    createFolder: createNewFolder,
    debug: debugContextMenu,
    showVisualFeedback: showVisualFeedback,
    fixPaths: fixSubfolderPaths,
    syncProjectPath: syncProjectPath,
    ensureVisible: ensureAllFilesVisible,
    expandAll: expandAllFolders,
    startGracePeriod: startGracePeriod,
    isInGracePeriod: isInGracePeriod,
    getProjectPath: () => localStorage.getItem('currentProjectPath'),
    setProjectPath: syncProjectPath,
    loadFolder: loadFolderContents,
    enableDrag: setupDragSupport,
    makeDraggable: makeItemsDraggable,
    // ✅ NEW: Expose currentPath for build system integration
    get currentPath() {
      return (window as any).currentFolderPath || localStorage.getItem('currentProjectPath');
    },
    get rootPath() {
      return (window as any).currentFolderPath || localStorage.getItem('currentProjectPath');
    }
  };
  
  // Make chevron function available for debugging
  (window as any).addChevrons = addVisibleChevrons;
  (window as any).fixSubfolderPaths = fixSubfolderPaths;
  (window as any).syncProjectPath = syncProjectPath;
  
  console.log('✅ File explorer initialized successfully');
}

// ============================================================================
// ✅ NEW: DRAG & DROP SUPPORT FOR BREADCRUMB INTEGRATION
// ============================================================================

/**
 * Setup drag support for file explorer items
 * Enables dragging files/folders to other areas like breadcrumb
 */
function setupDragSupport(): void {
  console.log('🎯 Setting up file explorer drag support...');
  
  const fileTree = document.querySelector('.file-tree');
  if (!fileTree) {
    console.error('❌ File tree not found for drag setup');
    return;
  }
  
  // Inject drag styles
  injectDragStyles();
  
  // Use event delegation for all current and future items
  fileTree.addEventListener('dragstart', (e: DragEvent) => {
    const target = e.target as HTMLElement;
    
    // Find the closest file/folder item
    const item = target.closest('.file-item, .folder-item, [data-path]') as HTMLElement;
    if (!item) return;
    
    const filePath = item.getAttribute('data-path') || item.dataset.path;
    const fileName = item.getAttribute('data-name') || item.dataset.name || filePath?.split(/[/\\]/).pop();
    const isFolder = item.classList.contains('folder-item') || item.getAttribute('data-is-directory') === 'true';
    
    if (filePath && e.dataTransfer) {
      // Set multiple data formats for compatibility
      e.dataTransfer.setData('text/plain', filePath);
      e.dataTransfer.setData('text/uri-list', `file:///${filePath.replace(/\\/g, '/')}`);
      e.dataTransfer.setData('application/x-file-path', filePath);
      e.dataTransfer.setData('application/json', JSON.stringify({ 
        path: filePath, 
        name: fileName,
        isFolder: isFolder 
      }));
      
      e.dataTransfer.effectAllowed = 'copyMove';
      
      // Add visual feedback
      item.classList.add('dragging');
      
      // Create custom drag image
      const dragImage = document.createElement('div');
      dragImage.style.cssText = `
        padding: 6px 12px;
        background: #2d2d2d;
        border: 1px solid #4fc3f7;
        border-radius: 4px;
        color: #fff;
        font-size: 12px;
        position: absolute;
        top: -1000px;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      dragImage.innerHTML = `${isFolder ? '📁' : '📄'} ${fileName}`;
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      
      // Clean up drag image after a moment
      setTimeout(() => dragImage.remove(), 0);
      
      console.log('🎯 Drag started:', filePath);
    }
  }, false);
  
  // Remove dragging class when drag ends
  fileTree.addEventListener('dragend', (e: DragEvent) => {
    const target = e.target as HTMLElement;
    const item = target.closest('.file-item, .folder-item, [data-path]') as HTMLElement;
    if (item) {
      item.classList.remove('dragging');
    }
    console.log('🎯 Drag ended');
  }, false);
  
  // Make all existing items draggable
  makeItemsDraggable();
  
  // Watch for new items and make them draggable
  const observer = new MutationObserver(() => {
    makeItemsDraggable();
  });
  
  observer.observe(fileTree, { childList: true, subtree: true });
  
  console.log('✅ File explorer drag support enabled');
}

/**
 * Make all file/folder items draggable
 */
function makeItemsDraggable(): void {
  const items = document.querySelectorAll('.file-item, .folder-item, [data-path]');
  items.forEach(item => {
    const el = item as HTMLElement;
    if (!el.draggable) {
      el.draggable = true;
    }
  });
}

/**
 * Inject CSS styles for drag visual feedback
 */
function injectDragStyles(): void {
  if (document.getElementById('file-explorer-drag-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'file-explorer-drag-styles';
  style.textContent = `
    /* Drag & Drop Styles */
    .file-item[draggable="true"],
    .folder-item[draggable="true"],
    [data-path][draggable="true"] {
      cursor: grab;
    }
    
    .file-item[draggable="true"]:active,
    .folder-item[draggable="true"]:active {
      cursor: grabbing;
    }
    
    .file-item.dragging,
    .folder-item.dragging,
    [data-path].dragging {
      opacity: 0.5;
      background: rgba(79, 195, 247, 0.1) !important;
      outline: 1px dashed #4fc3f7 !important;
      outline-offset: -1px;
      border-radius: 4px;
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// ✅ NEW: SET UP LISTENERS FOR NEW PROJECT EVENTS (from v2.2)
// ============================================================================

/**
 * Set up listeners for new project events
 */
function setupNewProjectListeners(): void {
  // Handle project-created event
  document.addEventListener('project-created', (e: any) => {
    const detail = e.detail || {};
    const projectPath = detail.projectPath || detail.path || '';
    
    console.log('🎉 [FileExplorer] New project created:', projectPath);
    
    // Start grace period
    if (projectPath) {
      startGracePeriod(projectPath);
    }
    
    // Schedule visibility fixes
    setTimeout(ensureAllFilesVisible, 100);
    setTimeout(ensureAllFilesVisible, 300);
    setTimeout(ensureAllFilesVisible, 500);
    setTimeout(expandAllFolders, 600);
    
    // Schedule refreshes
    scheduleRefreshes();
  });
  
  // Handle project-opened event
  document.addEventListener('project-opened', () => {
    console.log('📂 [FileExplorer] Project opened');
    
    // Ensure visibility after project opens
    setTimeout(ensureAllFilesVisible, 100);
    setTimeout(ensureAllFilesVisible, 300);
    setTimeout(expandAllFolders, 400);
  });
  
  // Handle folder-structure-loaded event
  document.addEventListener('folder-structure-loaded', () => {
    console.log('📁 [FileExplorer] Folder structure loaded');
    
    // Ensure visibility after structure loads
    setTimeout(ensureAllFilesVisible, 100);
    setTimeout(expandAllFolders, 200);
  });
}

/**
 * ✅ NEW: Set up visibility enforcement (from v2.2)
 */
function setupVisibilityEnforcement(): void {
  // Watch for file tree changes
  const waitForTree = setInterval(() => {
    const fileTree = document.querySelector('.file-tree');
    if (fileTree) {
      clearInterval(waitForTree);
      
      const observer = new MutationObserver(() => {
        // During grace period, enforce visibility
        if (isInGracePeriod()) {
          requestAnimationFrame(() => {
            ensureAllFilesVisible();
          });
        }
      });
      
      observer.observe(fileTree, {
        childList: true,
        subtree: true
      });
      
      console.log('✅ [FileExplorer] Visibility enforcement active');
    }
  }, 100);
  
  // Stop after 10 seconds
  setTimeout(() => clearInterval(waitForTree), 10000);
}

/**
 * ✅ NEW: Schedule multiple refreshes after project creation (from v2.2)
 */
function scheduleRefreshes(): void {
  console.log('🔄 [FileExplorer] Scheduling refreshes...');
  
  LOAD_CONFIG.REFRESH_DELAYS.forEach((delay, index) => {
    setTimeout(async () => {
      console.log(`🔄 [FileExplorer] Refresh ${index + 1}/${LOAD_CONFIG.REFRESH_DELAYS.length}`);
      await refreshFileExplorer();
      ensureAllFilesVisible();
      expandAllFolders();
    }, delay);
  });
}

// ============================================================================
// DATA PATH MANAGEMENT - CRITICAL FIX FOR SUBFOLDER PATHS
// ============================================================================

/**
 * FUNCTION: fixSubfolderPaths
 * DISABLED - menuSystem.ts now sets correct paths during rendering
 */
function fixSubfolderPaths(): void {
  console.log('✅ fixSubfolderPaths disabled - menuSystem.ts handles paths correctly');
  // Do nothing - menuSystem.ts now builds correct paths during recursion
  return;
}

/**
 * FUNCTION: ensureDataPaths
 * Ensure all file/folder items have proper data-path attributes
 * This is a backup to fixSubfolderPaths
 */
function ensureDataPaths(): void {
  const fileItems = document.querySelectorAll('.file-item, .folder-item');
  let fixedCount = 0;
  
  fileItems.forEach(item => {
    const el = item as HTMLElement;
    
    // Skip if already has valid data-path
    if (el.hasAttribute('data-path')) {
      const existingPath = el.getAttribute('data-path') || '';
      const projectPath = localStorage.getItem('currentProjectPath') || '';
      
      // Check if path looks complete
      if (existingPath.includes(projectPath) || existingPath.match(/^[A-Z]:\\/i)) {
        return;
      }
    }
    
    // Try to get name
    const fileName = el.querySelector('.file-name, .folder-name')?.textContent?.trim() || 
                     el.textContent?.trim().replace(/[▼▶📁📂📄]/g, '').trim();
    
    if (fileName) {
      // Set a basic path - fixSubfolderPaths will correct it
      const basePath = localStorage.getItem('currentProjectPath') || '';
      const basicPath = joinPath(basePath, fileName);
      el.setAttribute('data-path', basicPath);
      el.setAttribute('data-name', fileName);
      fixedCount++;
    }
  });
  
  if (debugMode && fixedCount > 0) {
    console.log(`🔧 Ensured data-path for ${fixedCount} items`);
  }
}

/**
 * FUNCTION: debugFilePaths
 * Debug function to verify all file paths are correct
 */
function debugFilePaths(): void {
  console.group('🔍 File Path Debug');
  
  const allItems = document.querySelectorAll('[data-path]');
  console.log(`Total items with data-path: ${allItems.length}`);
  
  allItems.forEach((item, index) => {
    const path = item.getAttribute('data-path');
    const name = item.getAttribute('data-name');
    const isFolder = item.classList.contains('folder-item');
    
    console.log(`${index + 1}. ${isFolder ? '📁' : '📄'} ${name}`);
    console.log(`   Path: ${path}`);
  });
  
  console.groupEnd();
}

// Make it globally available
(window as any).debugFilePaths = debugFilePaths;

// ============================================================================
// CONTEXT MENU SETUP
// ============================================================================

/**
 * FUNCTION: setupContextMenu
 * Initialize context menu system for file explorer
 * Creates menu if needed and sets up all event handlers
 */
function setupContextMenu(): void {
  console.log('📋 Setting up context menu...');
  
  const contextMenu = document.getElementById('context-menu');
  if (!contextMenu) {
    console.log('Creating context menu element...');
    createContextMenu();
  }
  
  // Hide menu when clicking elsewhere
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('context-menu');
    if (menu && !menu.contains(e.target as Node)) {
      menu.style.display = 'none';
      // Remove highlight from context target
      document.querySelectorAll('.context-menu-target').forEach(el => {
        el.classList.remove('context-menu-target');
      });
    }
  });
  
  // Add right-click handler
  document.addEventListener('contextmenu', handleContextMenu);
  
  // Setup menu item click handlers
  const menu = document.getElementById('context-menu');
  if (menu) {
    menu.addEventListener('click', handleContextMenuClick);
    console.log('✅ Context menu handlers attached');
  }
}

/**
 * FUNCTION: createContextMenu
 * Create the context menu DOM element with all menu items
 * Generates HTML and applies styling for context menu
 */
function createContextMenu(): void {
  const menuHTML = `
    <div id="context-menu" class="context-menu" style="display: none; position: fixed; z-index: 10000; 
         background: #2d2d30; border: 1px solid #454545; border-radius: 6px; padding: 4px 0;
         box-shadow: 0 4px 16px rgba(0,0,0,0.4); min-width: 220px; font-family: 'Segoe UI', sans-serif;
         backdrop-filter: blur(10px);">
      <div class="context-menu-item" data-action="open-file" style="padding: 10px 16px; cursor: pointer; color: #ccc; display: flex; align-items: center; gap: 10px;">
        <span class="menu-icon" style="width: 20px; text-align: center; font-size: 15px;">📄</span>
        <span>Open File</span>
      </div>
      <div class="context-menu-item" data-action="open-folder" style="padding: 10px 16px; cursor: pointer; color: #ccc; display: flex; align-items: center; gap: 10px;">
        <span class="menu-icon" style="width: 20px; text-align: center; font-size: 15px;">📂</span>
        <span>Open in Explorer</span>
      </div>
      <div class="context-menu-separator" style="height: 1px; background: linear-gradient(90deg, transparent, #454545, transparent); margin: 6px 8px;"></div>
      <div class="context-menu-item" data-action="new-file" style="padding: 10px 16px; cursor: pointer; color: #ccc; display: flex; align-items: center; gap: 10px;">
        <span class="menu-icon" style="width: 20px; text-align: center; font-size: 15px;">➕</span>
        <span>New File</span>
      </div>
      <div class="context-menu-item" data-action="new-folder" style="padding: 10px 16px; cursor: pointer; color: #ccc; display: flex; align-items: center; gap: 10px;">
        <span class="menu-icon" style="width: 20px; text-align: center; font-size: 15px;">📁</span>
        <span>New Folder</span>
      </div>
      <div class="context-menu-separator" style="height: 1px; background: linear-gradient(90deg, transparent, #454545, transparent); margin: 6px 8px;"></div>
      <div class="context-menu-item" data-action="open-terminal" style="padding: 10px 16px; cursor: pointer; color: #ccc; display: flex; align-items: center; gap: 10px;">
        <span class="menu-icon" style="width: 20px; text-align: center; font-size: 15px;">💻</span>
        <span>Open Terminal Here</span>
      </div>
      <div class="context-menu-item" data-action="reveal-explorer" style="padding: 10px 16px; cursor: pointer; color: #ccc; display: flex; align-items: center; gap: 10px;">
        <span class="menu-icon" style="width: 20px; text-align: center; font-size: 15px;">🔍</span>
        <span>Reveal in File Explorer</span>
      </div>
      <div class="context-menu-separator" style="height: 1px; background: linear-gradient(90deg, transparent, #454545, transparent); margin: 6px 8px;"></div>
      <div class="context-menu-item" data-action="copy-path" style="padding: 10px 16px; cursor: pointer; color: #ccc; display: flex; align-items: center; gap: 10px;">
        <span class="menu-icon" style="width: 20px; text-align: center; font-size: 15px;">📋</span>
        <span>Copy Path</span>
      </div>
      <div class="context-menu-item" data-action="rename" style="padding: 10px 16px; cursor: pointer; color: #ccc; display: flex; align-items: center; gap: 10px;">
        <span class="menu-icon" style="width: 20px; text-align: center; font-size: 15px;">✏️</span>
        <span>Rename</span>
      </div>
      <div class="context-menu-item" data-action="delete" style="padding: 10px 16px; cursor: pointer; color: #ccc; display: flex; align-items: center; gap: 10px;">
        <span class="menu-icon" style="width: 20px; text-align: center; font-size: 15px;">🗑️</span>
        <span>Delete</span>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', menuHTML);
  
  // Add hover effects
  const menu = document.getElementById('context-menu');
  if (menu) {
    const items = menu.querySelectorAll('.context-menu-item');
    items.forEach(item => {
      item.addEventListener('mouseenter', () => {
        (item as HTMLElement).style.background = 'linear-gradient(90deg, rgba(9, 71, 113, 0.5), rgba(9, 71, 113, 0.3))';
        (item as HTMLElement).style.paddingLeft = '18px';
        (item as HTMLElement).style.transform = 'translateX(2px)';
      });
      item.addEventListener('mouseleave', () => {
        (item as HTMLElement).style.background = 'transparent';
        (item as HTMLElement).style.paddingLeft = '16px';
        (item as HTMLElement).style.transform = 'translateX(0)';
      });
    });
  }
}

// ============================================================================
// CONTEXT MENU EVENT HANDLERS
// ============================================================================

/**
 * FUNCTION: handleContextMenu
 * Handle right-click events to show context menu
 * Determines if click is on file or folder and shows appropriate menu
 * @param {MouseEvent} e - Mouse event from right-click
 */
function handleContextMenu(e: MouseEvent): void {
  const fileTree = document.querySelector('.file-tree');
  if (!fileTree || !fileTree.contains(e.target as Node)) {
    return;
  }
  
  e.preventDefault();
  
  const target = e.target as HTMLElement;
  
  // Reset state
  currentContextTarget = null;
  currentContextPath = null;
  currentIsFolder = false;
  
  // Find file/folder item
  let checkElement: HTMLElement | null = target;
  let depth = 0;
  const maxDepth = 10;
  
  while (checkElement && depth < maxDepth) {
    // Check for data-path attribute
    const path = checkElement.getAttribute('data-path');
    if (path) {
      currentContextTarget = checkElement;
      currentContextPath = path;
      currentIsFolder = checkElement.classList.contains('folder-item') || 
                       checkElement.classList.contains('directory') ||
                       checkElement.getAttribute('data-is-directory') === 'true';
      break;
    }
    
    // Check for file-item or folder-item class
    if (checkElement.classList.contains('file-item')) {
      currentContextTarget = checkElement;
      currentIsFolder = false;
      const pathAttr = checkElement.getAttribute('data-path');
      if (pathAttr) {
        currentContextPath = pathAttr;
      }
      break;
    }
    
    if (checkElement.classList.contains('folder-item') || checkElement.classList.contains('directory')) {
      currentContextTarget = checkElement;
      currentIsFolder = true;
      const pathAttr = checkElement.getAttribute('data-path');
      if (pathAttr) {
        currentContextPath = pathAttr;
      }
      break;
    }
    
    checkElement = checkElement.parentElement;
    depth++;
  }
  
  // Show context menu
  const contextMenu = document.getElementById('context-menu');
  if (!contextMenu) {
    console.error('❌ Context menu element not found');
    return;
  }
  
  // Add visual indicator to show which item is selected
  document.querySelectorAll('.context-menu-target').forEach(el => {
    el.classList.remove('context-menu-target');
  });
  if (currentContextTarget) {
    currentContextTarget.classList.add('context-menu-target');
  }
  
  // Position and show menu
  contextMenu.style.left = `${e.pageX}px`;
  contextMenu.style.top = `${e.pageY}px`;
  contextMenu.style.display = 'block';
  
  updateContextMenuItems(currentIsFolder);
  
  if (debugMode) {
    console.log('🎯 Context menu opened');
    console.log('   Path:', currentContextPath);
    console.log('   Is Folder:', currentIsFolder);
    console.log('   Target:', currentContextTarget?.className);
  }
}

/**
 * FUNCTION: updateContextMenuItems
 * Update context menu items visibility based on selection type
 * Shows/hides items based on whether a file or folder was clicked
 * @param {boolean} isFolder - Whether the selected item is a folder
 */
function updateContextMenuItems(isFolder: boolean): void {
  const menu = document.getElementById('context-menu');
  if (!menu) return;
  
  const openFileItem = menu.querySelector('[data-action="open-file"]') as HTMLElement;
  const openFolderItem = menu.querySelector('[data-action="open-folder"]') as HTMLElement;
  
  if (openFileItem) {
    openFileItem.style.display = isFolder ? 'none' : 'flex';
  }
  
  if (openFolderItem) {
    openFolderItem.style.display = isFolder ? 'flex' : 'none';
  }
}

/**
 * FUNCTION: handleContextMenuClick
 * Handle context menu item clicks with full debug logging
 * Processes all menu actions with proper error handling and fallbacks
 * @param {MouseEvent} e - Mouse event from menu item click
 */
async function handleContextMenuClick(e: MouseEvent): Promise<void> {
  e.stopPropagation();
  e.stopImmediatePropagation();
  e.preventDefault();
  
  const item = (e.target as HTMLElement).closest('.context-menu-item');
  if (!item) {
    console.error('❌ No menu item found');
    return;
  }
  
  const action = item.getAttribute('data-action');
  
  if (debugMode) {
    console.group(`🔧 Context Menu Action: ${action}`);
    console.log('Path:', currentContextPath);
    console.log('Is Folder:', currentIsFolder);
    console.log('Tauri Available:', !!window.__TAURI__);
  }
  
  // Hide menu and remove highlight
  const contextMenu = document.getElementById('context-menu');
  if (contextMenu) {
    contextMenu.style.display = 'none';
  }
  document.querySelectorAll('.context-menu-target').forEach(el => {
    el.classList.remove('context-menu-target');
  });
  
  try {
    switch (action) {
      case 'open-file':
        await handleOpenFile();
        break;
      case 'open-folder':
      case 'reveal-explorer':
        await handleRevealInExplorer();
        break;
      case 'new-file':
        await createNewFile();
        break;
      case 'new-folder':
        await createNewFolder();
        break;
      case 'open-terminal':
        await handleOpenTerminal();
        break;
      case 'copy-path':
        await handleCopyPath();
        break;
      case 'rename':
        await renameItem();
        break;
      case 'delete':
        await deleteItem();
        break;
      default:
        console.error('❌ Unknown action:', action);
        showNotification(`Unknown action: ${action}`, 'error');
    }
  } catch (error: any) {
    console.error('❌ Error handling action:', error);
    showNotification(`Error: ${error.message || error}`, 'error');
  } finally {
    if (debugMode) console.groupEnd();
  }
}

// ============================================================================
// MENU ACTION HANDLERS
// ============================================================================

/**
 * FUNCTION: handleOpenFile
 * Handle opening a file in the editor
 * Opens the currently selected file in Monaco editor
 */
async function handleOpenFile(): Promise<void> {
  if (!currentContextPath) {
    showNotification('No file selected', 'error');
    return;
  }
  
  console.log('📂 Opening file:', currentContextPath);
  await openFileInEditor(currentContextPath);
}

/**
 * FUNCTION: handleRevealInExplorer
 * Handle revealing in system file explorer
 * Requires Tauri to be available
 */
async function handleRevealInExplorer(): Promise<void> {
  if (!currentContextPath) {
    showNotification('No path selected', 'error');
    return;
  }
  
  if (!window.__TAURI__) {
    showNotification('This feature requires the desktop app', 'warning');
    return;
  }
  
  try {
    // First, clean and normalize the path
    let pathToReveal = convertToSystemPath(currentContextPath);
    
    // Then check if it's a file and get parent directory
    if (!currentIsFolder) {
      // It's a file, so reveal its parent directory
      pathToReveal = getParentDirectory(pathToReveal);
      console.log('📁 File detected, using parent directory:', pathToReveal);
    }
    
    // Ensure Windows path format (backslashes)
    if (pathToReveal.includes(':')) {
      pathToReveal = pathToReveal.replace(/\//g, '\\');
    }
    
    console.log('🔍 Final path to reveal:', pathToReveal);
    
    await invoke('reveal_in_explorer', { path: pathToReveal });
    showNotification('✅ Opened in file explorer', 'success');
    console.log('✅ Revealed in explorer');
  } catch (error: any) {
    console.error('❌ Failed to reveal in explorer:', error);
    showNotification(`❌ Failed to open explorer: ${error.message || error}`, 'error');
  }
}

/**
 * FUNCTION: handleOpenTerminal
 * Handle opening terminal at current location
 * Requires Tauri to be available
 */
async function handleOpenTerminal(): Promise<void> {
  if (!currentContextPath) {
    showNotification('No path selected', 'error');
    return;
  }
  
  if (!window.__TAURI__) {
    showNotification('This feature requires the desktop app', 'warning');
    return;
  }
  
  try {
    // Use folder path if clicking on file
    const terminalPath = currentIsFolder 
      ? currentContextPath 
      : getParentDirectory(currentContextPath);
    
    await invoke('open_terminal', { path: terminalPath });
    showNotification('Terminal opened', 'success');
    console.log('✅ Terminal opened at:', terminalPath);
  } catch (error) {
    console.error('Failed to open terminal:', error);
    showNotification('Failed to open terminal', 'error');
  }
}

/**
 * FUNCTION: handleCopyPath
 * Handle copying path to clipboard
 * Uses browser clipboard API with fallback for older browsers
 */
async function handleCopyPath(): Promise<void> {
  if (!currentContextPath) {
    showNotification('No path to copy', 'error');
    return;
  }
  
  if (!navigator.clipboard) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = currentContextPath;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showNotification('Path copied!', 'success');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(currentContextPath);
    showNotification('Path copied!', 'success');
    console.log('✅ Path copied:', currentContextPath);
  } catch (error) {
    console.error('Failed to copy path:', error);
    showNotification('Failed to copy path', 'error');
  }
}

// ============================================================================
// FILE/FOLDER CREATION
// ============================================================================

/**
 * FUNCTION: createNewFile
 * Create a new file in the selected directory
 * Shows preview of where file will be created
 */
async function createNewFile(): Promise<void> {
  // Determine the target directory
  let targetDir = '';
  
  if (currentIsFolder && currentContextPath) {
    // Right-clicked on a folder
    targetDir = currentContextPath;
  } else if (currentContextPath) {
    // Right-clicked on a file, use its parent directory
    targetDir = getParentDirectory(currentContextPath);
  } else {
    // No selection, use project root
    targetDir = localStorage.getItem('currentProjectPath') || '';
  }
  
  if (!targetDir) {
    showNotification('Please select a folder or open a project first', 'warning');
    return;
  }
  
  // Show dialog with path preview
  const fileName = prompt(`📁 Create new file in:\n${targetDir}\n\n📝 Enter file name:`);
  if (!fileName) return;
  
  // Validate filename
  if (fileName.includes('/') || fileName.includes('\\')) {
    showNotification('❌ Filename cannot contain path separators', 'error');
    return;
  }
  
  if (fileName.trim() === '') {
    showNotification('❌ Filename cannot be empty', 'error');
    return;
  }
  
  try {
    const fullPath = joinPath(targetDir, fileName);
    const normalizedPath = normalizePath(fullPath);
    
    console.log('📝 Creating file:', normalizedPath);
    
    if (window.__TAURI__) {
      // Create actual file using Tauri
      await invoke('create_file', { 
        path: normalizedPath,
        content: '' 
      });
      console.log('✅ File created on disk:', normalizedPath);
      showNotification(`✅ File created: ${fileName}`, 'success');
      
      // Refresh the entire explorer to show the new file
      await refreshFileExplorer();
      
      // Auto-open the new file after a short delay
      setTimeout(() => {
        openFileInEditor(normalizedPath);
      }, 500);
      
    } else {
      console.warn('⚠️ Tauri not available, adding to UI only');
      showNotification('⚠️ File added to UI only (desktop app required)', 'warning');
      
      // Add to UI only
      const fileItem = addFileToExplorer(fileName, normalizedPath);
      if (fileItem) {
        showVisualFeedback(fileItem, 'newly-created');
      }
    }
    
  } catch (error: any) {
    console.error('❌ Failed to create file:', error);
    showNotification(`❌ Failed to create file: ${error.message || error}`, 'error');
  }
}

/**
 * FUNCTION: createNewFolder
 * Create a new folder in the selected directory
 * Shows preview of where folder will be created
 */
async function createNewFolder(): Promise<void> {
  // Determine the target directory (same logic as createNewFile)
  let targetDir = '';
  
  if (currentIsFolder && currentContextPath) {
    targetDir = currentContextPath;
  } else if (currentContextPath) {
    targetDir = getParentDirectory(currentContextPath);
  } else {
    targetDir = localStorage.getItem('currentProjectPath') || '';
  }
  
  if (!targetDir) {
    showNotification('Please select a folder or open a project first', 'warning');
    return;
  }
  
  const folderName = prompt(`📁 Create new folder in:\n${targetDir}\n\n📝 Enter folder name:`);
  if (!folderName) return;
  
  // Validate folder name
  if (folderName.includes('/') || folderName.includes('\\')) {
    showNotification('❌ Folder name cannot contain path separators', 'error');
    return;
  }
  
  if (folderName.trim() === '') {
    showNotification('❌ Folder name cannot be empty', 'error');
    return;
  }
  
  try {
    const fullPath = joinPath(targetDir, folderName);
    const normalizedPath = normalizePath(fullPath);
    
    console.log('📁 Creating folder:', normalizedPath);
    
    if (window.__TAURI__) {
      await invoke('create_directory', { path: normalizedPath });
      console.log('✅ Folder created:', normalizedPath);
      showNotification(`✅ Folder created: ${folderName}`, 'success');
      
      // Refresh explorer
      await refreshFileExplorer();
      
    } else {
      showNotification('⚠️ Folder creation requires desktop app', 'warning');
    }
  } catch (error: any) {
    console.error('❌ Failed to create folder:', error);
    showNotification(`❌ Failed to create folder: ${error.message || error}`, 'error');
  }
}

/**
 * FUNCTION: renameItem
 * Rename the selected file or folder
 * Prompts user for new name and updates filesystem
 */
async function renameItem(): Promise<void> {
  if (!currentContextPath) {
    showNotification('No item selected', 'error');
    return;
  }
  
  const currentName = getFileName(currentContextPath);
  const newName = prompt('✏️ Enter new name:', currentName);
  
  if (!newName || newName === currentName) return;
  
  // Validate new name
  if (newName.includes('/') || newName.includes('\\')) {
    showNotification('❌ Name cannot contain path separators', 'error');
    return;
  }
  
  try {
    const parentDir = getParentDirectory(currentContextPath);
    const newPath = joinPath(parentDir, newName);
    
    if (window.__TAURI__) {
      try {
        // Try different possible command names
        await invoke('rename_file', { 
          oldPath: currentContextPath,
          newPath: newPath 
        });
      } catch (e1) {
        try {
          await invoke('move_file', { 
            oldPath: currentContextPath,
            newPath: newPath 
          });
        } catch (e2) {
          try {
            // Fallback: use move_path or rename with different params
            await invoke('rename', { 
              path: currentContextPath,
              newName: newName 
            });
          } catch (e3) {
            // Last resort: read, write, delete
            console.log('⚠️ No rename command found, using copy+delete fallback');
            const content = await readFile(currentContextPath);
            if (content !== null && !currentIsFolder) {
              await invoke('create_file', { path: newPath, content: content });
              await invoke('delete_path', { path: currentContextPath });
            } else {
              throw new Error('Rename not supported for folders without rename command');
            }
          }
        }
      }
      
      showNotification(`✅ Renamed to: ${newName}`, 'success');
      console.log('✅ Renamed:', currentContextPath, '->', newPath);
      
      // Refresh explorer
      await refreshFileExplorer();
      
    } else {
      showNotification('⚠️ Rename requires desktop app', 'warning');
    }
  } catch (error: any) {
    console.error('Failed to rename:', error);
    showNotification(`❌ Failed to rename: ${error.message || error}`, 'error');
  }
}

/**
 * FUNCTION: deleteItem
 * Delete the selected file or folder
 * Falls back to UI removal if Tauri not available
 */
async function deleteItem(): Promise<void> {
  if (!currentContextPath) {
    showNotification('No item selected', 'error');
    return;
  }
  
  const itemName = getFileName(currentContextPath);
  const confirmDelete = confirm(
    `⚠️ Are you sure you want to delete "${itemName}"?${currentIsFolder ? '\n\n🗑️ This will delete the folder and all its contents!' : ''}`
  );
  
  if (!confirmDelete) return;
  
  try {
    if (window.__TAURI__) {
      await invoke('delete_path', { path: currentContextPath });
      console.log('✅ Deleted:', currentContextPath);
      showNotification(`✅ Deleted: ${itemName}`, 'success');
      
      // ALWAYS refresh the explorer after deletion
      await refreshFileExplorer();
      
    } else {
      console.warn('⚠️ Tauri not available, removing from UI only');
      showNotification('⚠️ Removed from UI only (desktop app required)', 'warning');
      
      // Fallback: try to remove from UI
      removeFileFromExplorer(currentContextPath);
    }
    
  } catch (error: any) {
    console.error('Failed to delete:', error);
    showNotification(`❌ Failed to delete: ${error.message || error}`, 'error');
  }
}

// ============================================================================
// FOLDER OPERATIONS
// ============================================================================

/**
 * FUNCTION: openFolderDialog
 * Open native folder selection dialog
 * Requires Tauri to be available
 * ✅ FIXED: Now syncs project path to window for search panel
 */
async function openFolderDialog(): Promise<void> {
  if (!window.__TAURI__) {
    showNotification('Folder selection requires desktop app', 'warning');
    return;
  }
  
  try {
    const result = await invoke('open_folder_dialog') as string | null;
    if (result) {
      console.log('📁 Folder selected:', result);
      
      // ✅ FIX: Sync to all locations
      syncProjectPath(result);
      
      await loadFolderContents(result);
    }
  } catch (error) {
    console.error('Failed to open folder dialog:', error);
    showNotification('Failed to open folder', 'error');
  }
}


/**
 * FUNCTION: loadFolderContents
 * Load and display folder contents in the explorer
 * ⚡ OPTIMIZED: Skips node_modules, .git, etc. for faster loading
 */
async function loadFolderContents(folderPath: string): Promise<void> {
  if (!window.__TAURI__) {
    showNotification('Folder loading requires desktop app', 'warning');
    return;
  }
  
  const isNewProject = isNewlyCreatedProject(folderPath);
  
  try {
    syncProjectPath(folderPath);
    console.log('✅ Project path synced:', folderPath);
    
    showNotification('📂 Loading folder...', 'info');

    // Show skeleton while folder loads
    try {
      const folderName = folderPath.split(/[/\\\\]/).pop() || 'Project';
      const { showExplorerSkeleton } = await import('../explorerLoadingState');
      showExplorerSkeleton(folderName);
    } catch(e) { console.warn('[ExplorerLoading] Skeleton not available'); }

    
    if (isNewProject) {
      console.log(`🔄 New project detected, waiting ${LOAD_CONFIG.INITIAL_DELAY}ms...`);
      startGracePeriod(folderPath);
      await sleep(LOAD_CONFIG.INITIAL_DELAY);
    }
    
    const startTime = Date.now();
    let contents: any = null;
    let fileCount = 0;
    const maxRetries = isNewProject ? LOAD_CONFIG.MAX_RETRIES : 1;
    const minExpectedFiles = isNewProject ? LOAD_CONFIG.MIN_FILES_THRESHOLD : 0;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // ⚡ Use maxDepth 3 instead of 5 for faster loading
      contents = await invoke('read_directory_recursive', { 
        path: folderPath,
        maxDepth: 3 
      }) as any;
      
      // ⚡ Filter out node_modules, .git, etc.
      contents = filterFolderStructure(contents);
      
      fileCount = countFilteredFiles(contents);
      const hasNested = hasNestedContent(contents);
      
      console.log(`📂 Attempt ${attempt + 1}/${maxRetries}: Found ${fileCount} files (filtered)`);
      
      if (fileCount >= minExpectedFiles || hasNested) {
        console.log('✅ Directory load complete');
        break;
      }
      
      if (attempt < maxRetries - 1) {
        console.log(`⏳ Waiting ${LOAD_CONFIG.RETRY_DELAY}ms before retry...`);
        await sleep(LOAD_CONFIG.RETRY_DELAY);
      }
    }
    
    const loadTime = Date.now() - startTime;
    console.log(`⚡ Folder loaded in ${loadTime}ms (${fileCount} files)`);
    
    clearFileExplorer();
    displayFolderStructure(contents);
    
    setTimeout(() => {
      addVisibleChevrons();
      fixSubfolderPaths();
      ensureAllFilesVisible();
      expandAllFolders();
    }, 100);
    
    setTimeout(ensureAllFilesVisible, 300);
    setTimeout(expandAllFolders, 400);
    
    showNotification(`✅ Loaded ${fileCount} files (${loadTime}ms)`, 'success');
    
    if (isNewProject) {
      scheduleRefreshes();
    }
    
  } catch (error) {
    console.error('Failed to load folder contents:', error);
    showNotification('Failed to load folder', 'error');
  }
}

/**
 * FUNCTION: displayFolderStructure
 * Display folder structure in the file tree
 * ✅ UPDATED v4.0: Now uses IDE-style renderFileTree
 * @param {any} structure - Folder structure from Tauri
 */
function displayFolderStructure(structure: any): void {
  console.log('📂 [v4.0] displayFolderStructure called!');
  console.log('📂 Folder structure loaded:', structure);
  
  // Convert Tauri structure to FileNode format
  const files = convertToFileNodes(structure);
  console.log('📂 [v4.0] Converted to', files.length, 'files');
  
  // Store globally for debugging and refresh
  (window as any).__currentProjectFiles = files;
  console.log('📂 [v4.0] Stored in window.__currentProjectFiles');
  
  // Get the file tree container
  const container = document.querySelector('.file-tree') as HTMLElement;
  console.log('📂 [v4.0] Container found:', !!container);
  
  if (container && files.length > 0) {
    // ✅ Use new IDE-style renderer
    console.log('📂 [v4.0] Calling renderFileTree...');
    renderFileTree(container, files);
    console.log('✅ [v4.0] IDE-style file tree rendered!');
  } else {
    console.log('📂 [v4.0] Fallback to old event system');
    // Fallback to old event-based system
    document.dispatchEvent(new CustomEvent('folder-structure-loaded', {
      detail: structure
    }));
  }
}

/**
 * Convert Tauri directory structure to FileNode format
 */
function convertToFileNodes(structure: any): any[] {
  if (!structure) return [];
  
  // Handle array of items
  if (Array.isArray(structure)) {
    return structure.map(item => convertSingleNode(item)).filter(Boolean);
  }
  
  // Handle single root folder with children
  if (structure.children) {
    return structure.children.map((child: any) => convertSingleNode(child)).filter(Boolean);
  }
  
  // Handle as single item
  return [convertSingleNode(structure)].filter(Boolean);
}

/**
 * Convert a single node to FileNode format
 */
function convertSingleNode(item: any): any {
  if (!item) return null;
  
  const node: any = {
    name: item.name || item.path?.split(/[/\\]/).pop() || 'Unknown',
    path: item.path || '',
    isDirectory: item.is_directory || item.isDirectory || false,
    size: item.size || 0,
  };
  
  // Handle children recursively
  if (node.isDirectory && item.children && Array.isArray(item.children)) {
    node.children = item.children
      .map((child: any) => convertSingleNode(child))
      .filter(Boolean);
  }
  
  return node;
}

/**
 * FUNCTION: toggleFolderCollapse
 * Toggle folder expansion/collapse state
 * @param {HTMLElement} folderElement - Folder element to toggle
 */
function toggleFolderCollapse(folderElement: HTMLElement): void {
  const isExpanded = !folderElement.classList.contains('collapsed');
  const depth = parseInt(folderElement.getAttribute('data-depth') || '0');
  
  // Toggle collapsed class
  folderElement.classList.toggle('collapsed');
  
  // Update icon
  const icon = folderElement.querySelector('.folder-icon');
  if (icon) {
    icon.textContent = isExpanded ? '📁' : '📂';
  }
  
  // Toggle children visibility
  let nextElement = folderElement.nextElementSibling as HTMLElement;
  while (nextElement) {
    const nextDepth = parseInt(nextElement.getAttribute('data-depth') || '0');
    
    // Stop if we've reached a sibling or parent level
    if (nextDepth <= depth) break;
    
    // Toggle visibility
    if (isExpanded) {
      nextElement.style.display = 'none';
    } else {
      // Only show direct children
      if (nextDepth === depth + 1) {
        nextElement.style.display = '';
      }
    }
    
    nextElement = nextElement.nextElementSibling as HTMLElement;
  }
}

// ============================================================================
// FILE TREE UI OPERATIONS
// ============================================================================

/**
 * FUNCTION: addVisibleChevrons
 * Add chevrons to folder items for expand/collapse functionality
 * Uses Unicode characters for visual indicators
 */
function addVisibleChevrons(): void {
  const folderTexts = ['src', 'editor', 'ide', 'aiAssistant', 'camera', 'assets', 'components', 
                        'directFileOpener', 'content', 'handlers', 'monaco', 'eventHandlers',
                        'fileOperations', 'plugins', 'styles', 'types', 'utils', 'fileExplorer',
                        'projectCreation', 'terminal', 'api', 'builtin', 'core', 'public'];
  
  folderTexts.forEach(folderName => {
    const elements = Array.from(document.querySelectorAll('*')).filter(el => {
      return (el as HTMLElement).textContent?.trim() === folderName && el.children.length === 0;
    });
    
    elements.forEach(el => {
      const element = el as HTMLElement;
      if (!element.textContent?.includes('▼') && !element.textContent?.includes('▶')) {
        element.textContent = '▼ ' + element.textContent;
        element.style.cursor = 'pointer';
        
        element.onclick = (e) => {
          e.stopPropagation();
          const isExpanded = element.textContent?.startsWith('▼');
          element.textContent = element.textContent?.replace(/^[▼▶] /, isExpanded ? '▶ ' : '▼ ');
          
          // Toggle children visibility
          let parentContainer = element.parentElement;
          while (parentContainer && !parentContainer.nextElementSibling) {
            parentContainer = parentContainer.parentElement;
          }
          
          if (parentContainer) {
            let next = parentContainer.nextElementSibling as HTMLElement | null;
            while (next) {
              if (next.textContent?.includes('📁') || next.textContent?.includes('📂')) {
                break;
              }
              next.style.display = isExpanded ? 'none' : '';
              next = next.nextElementSibling as HTMLElement | null;
            }
          }
        };
      }
    });
  });
}

/**
 * FUNCTION: loadInitialFiles
 * Load previously saved files from localStorage
 * Restores file list on initialization
 */
function loadInitialFiles(): void {
  const fileTree = document.querySelector('.file-tree');
  if (!fileTree) return;
  
  const savedFiles = localStorage.getItem('recent-files');
  if (savedFiles) {
    try {
      const files = JSON.parse(savedFiles);
      files.forEach((file: any) => {
        addFileToExplorer(file.name, file.path);
      });
      console.log(`📂 Loaded ${files.length} saved files`);
    } catch (error) {
      console.error('Error loading saved files:', error);
    }
  }
}

/**
 * FUNCTION: setupFileExplorerEvents
 * Setup event listeners for file explorer interactions
 */
function setupFileExplorerEvents(): void {
  // File opened event
  document.addEventListener('file-opened', (e: any) => {
    if (e.detail && e.detail.path) {
      highlightActiveFile(e.detail.path);
    }
  });
  
  // File closed event
  document.addEventListener('file-closed', (e: any) => {
    if (e.detail && e.detail.path) {
      unhighlightFile(e.detail.path);
    }
  });
  
  // Menu open project command
  document.addEventListener('menu-open-project', () => {
    openFolderDialog();
  });
  
  // Listen for context menu from fileTreeRenderer
  document.addEventListener('file-context-menu', (e: any) => {
    if (e.detail) {
      currentContextPath = e.detail.path;
      currentContextTarget = e.detail.event.target as HTMLElement;
      currentIsFolder = e.detail.isDirectory;
      
      console.log('🎯 Context menu from tree renderer:', currentContextPath);
      
      // Show the context menu
      const contextMenu = document.getElementById('context-menu');
      if (contextMenu) {
        contextMenu.style.left = `${e.detail.event.pageX}px`;
        contextMenu.style.top = `${e.detail.event.pageY}px`;
        contextMenu.style.display = 'block';
        updateContextMenuItems(currentIsFolder);
      }
    }
  });
}

// ============================================================================
// FILE TREE MANIPULATION
// ============================================================================

/**
 * FUNCTION: addFileToExplorer
 * Add a file to the explorer tree
 * Creates DOM element with appropriate icon and click handler
 * @param {string} fileName - Name of the file
 * @param {string} filePath - Full path to the file
 * @returns {HTMLElement | null} The created file element
 */
export function addFileToExplorer(fileName: string, filePath: string): HTMLElement | null {
  const fileTree = document.querySelector('.file-tree');
  if (!fileTree) return null;
  
  // Prevent duplicates
  if (document.querySelector(`[data-path="${filePath}"]`)) {
    console.log('File already in explorer:', fileName);
    return null;
  }
  
  const fileItem = document.createElement('div');
  fileItem.className = 'file-item';
  fileItem.setAttribute('data-path', filePath);
  fileItem.setAttribute('data-name', fileName);
  
  const icon = getFileIcon(fileName);
  fileItem.innerHTML = `
    <span class="file-icon">${icon}</span>
    <span class="file-name">${fileName}</span>
  `;
  
  fileItem.addEventListener('click', () => {
    openFileInEditor(filePath);
  });
  
  fileItem.addEventListener('mouseenter', () => {
    fileItem.style.background = 'rgba(255, 255, 255, 0.08)';
  });
  
  fileItem.addEventListener('mouseleave', () => {
    if (!fileItem.classList.contains('active')) {
      fileItem.style.background = 'transparent';
    }
  });
  
  fileTree.appendChild(fileItem);
  console.log('➕ Added file to explorer:', fileName);
  
  return fileItem;
}

/**
 * FUNCTION: removeFileFromExplorer
 * Remove a file from the explorer tree
 * Removes DOM element matching the given path
 * @param {string} filePath - Path of file to remove
 */
export function removeFileFromExplorer(filePath: string): void {
  const fileItem = document.querySelector(`[data-path="${filePath}"]`);
  if (fileItem) {
    fileItem.remove();
    console.log('➖ Removed file from explorer:', filePath);
  }
}

/**
 * FUNCTION: clearFileExplorer
 * Clear all files from the explorer
 * Preserves any "no folder" message if present
 */
export function clearFileExplorer(): void {
  const fileTree = document.querySelector('.file-tree');
  if (fileTree) {
    const noFolderMsg = fileTree.querySelector('.no-folder-message');
    // Keep filter controls if present
    const filterControls = fileTree.querySelector('#explorer-filter-controls-persistent');
    fileTree.innerHTML = '';
    if (noFolderMsg) {
      fileTree.appendChild(noFolderMsg);
    }
    if (filterControls) {
      fileTree.appendChild(filterControls);
    }
    console.log('🧹 Cleared file explorer');
  }
}

/**
 * FUNCTION: refreshFileExplorer
 * Refresh the file explorer from disk
 * ✅ ENHANCED: Better visibility enforcement (from v2.2)
 */

/**
 * FUNCTION: refreshFileExplorer
 * Refresh the file explorer contents
 * ⚡ OPTIMIZED: Skips node_modules, .git, etc.
 */
export async function refreshFileExplorer(): Promise<void> {
  console.log('🔄 Refreshing file explorer...');
  
  const projectPath = localStorage.getItem('currentProjectPath') ||
                   localStorage.getItem('lastOpenedFolder') || 
                   localStorage.getItem('projectPath');
  
  if (!projectPath) {
    console.warn('No project path set');
    clearFileExplorer();
    loadInitialFiles();
    return;
  }
  
  syncProjectPath(projectPath);
  
  if (!window.__TAURI__) {
    console.warn('Tauri not available, cannot refresh from disk');
    clearFileExplorer();
    loadInitialFiles();
    return;
  }
  
  try {
    const startTime = Date.now();
    
    // ⚡ Use maxDepth 3 instead of 5
    let contents = await invoke('read_directory_recursive', { 
      path: projectPath,
      maxDepth: 3 
    }) as any;
    
    // ⚡ Filter out heavy folders
    contents = filterFolderStructure(contents);
    
    const fileCount = countFilteredFiles(contents);
    const loadTime = Date.now() - startTime;
    
    console.log(`⚡ Refresh: ${fileCount} files in ${loadTime}ms`);
    
    clearFileExplorer();
    displayFolderStructure(contents);
    
    setTimeout(() => {
      addVisibleChevrons();
      fixSubfolderPaths();
      ensureAllFilesVisible();
      expandAllFolders();
    }, 100);
    
    setTimeout(ensureAllFilesVisible, 300);
    setTimeout(expandAllFolders, 400);
    
    console.log('✅ File explorer refreshed successfully');
    
  } catch (error) {
    console.error('❌ Failed to refresh explorer:', error);
    showNotification('Failed to refresh explorer', 'error');
  }
}

/**
 * FUNCTION: highlightActiveFile
 * Highlight the currently active file in the explorer
 * Adds visual indication for the selected file
 * @param {string} filePath - Path of file to highlight
 */
function highlightActiveFile(filePath: string): void {
  // Remove existing highlights
  document.querySelectorAll('.file-item.active').forEach(item => {
    item.classList.remove('active');
    (item as HTMLElement).style.background = 'transparent';
  });
  
  // Add highlight to current file
  const fileItem = document.querySelector(`[data-path="${filePath}"]`) as HTMLElement;
  if (fileItem) {
    fileItem.classList.add('active');
    fileItem.style.background = 'linear-gradient(90deg, rgba(79, 195, 247, 0.2), rgba(79, 195, 247, 0.1))';
  }
}

/**
 * FUNCTION: unhighlightFile
 * Remove highlight from a file in the explorer
 * Used when file is closed
 * @param {string} filePath - Path of file to unhighlight
 */
function unhighlightFile(filePath: string): void {
  const fileItem = document.querySelector(`[data-path="${filePath}"]`) as HTMLElement;
  if (fileItem) {
    fileItem.classList.remove('active');
    fileItem.style.background = 'transparent';
  }
}

// ============================================================================
// VISUAL FEEDBACK SYSTEM
// ============================================================================

/**
 * FUNCTION: showVisualFeedback
 * Show visual feedback for file operations
 * @param {HTMLElement} element - Element to highlight
 * @param {string} type - Type of feedback (success/error/loading/newly-created)
 * @param {number} duration - Duration in milliseconds
 */
function showVisualFeedback(
  element: HTMLElement, 
  type: 'success' | 'error' | 'loading' | 'newly-created',
  duration: number = 2000
): void {
  element.classList.add(type);
  
  if (type !== 'loading') {
    setTimeout(() => {
      element.classList.remove(type);
    }, duration);
  }
}

/**
 * FUNCTION: showFileOperationToast
 * Show toast notification for file operations
 * @param {string} message - Message to display
 * @param {string} type - Type (success/error/warning)
 */
function showFileOperationToast(
  message: string, 
  type: 'success' | 'error' | 'warning' = 'success'
): void {
  // Create toast if it doesn't exist
  let toast = document.getElementById('file-operation-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'file-operation-notification';
    toast.className = 'file-operation-toast';
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.className = `file-operation-toast ${type}`;
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * FUNCTION: openFileInEditor
 * Open a file in the Monaco editor
 * Reads file content and creates a new tab
 * @param {string} filePath - Path to file to open
 */
async function openFileInEditor(filePath: string): Promise<void> {
  try {
    console.log('📄 Opening file in editor:', filePath);
    
    // Check if file exists first (only if Tauri is available)
    if (window.__TAURI__) {
      try {
        const exists = await invoke<boolean>('file_exists', { path: filePath });
        if (!exists) {
          console.error('❌ File does not exist:', filePath);
          showNotification(`File not found: ${getFileName(filePath)}. Refreshing explorer...`, 'error');
          
          // Auto-refresh the explorer
          await refreshFileExplorer();
          return;
        }
      } catch (error) {
        console.warn('⚠️ Could not check file existence:', error);
      }
    }
    
    const content = await readFile(filePath);
    if (content !== null) {
      tabManager.addTab(filePath, content);
      
      // Dispatch event for other components
      document.dispatchEvent(new CustomEvent('file-opened', {
        detail: { path: filePath, content }
      }));
      
      console.log('✅ File opened successfully');
    } else {
      showNotification('Failed to read file', 'error');
    }
  } catch (error: any) {
    console.error('Error opening file:', error);
    showNotification(`Failed to open file: ${error.message || error}`, 'error');
  }
}

/**
 * FUNCTION: getFileIcon
 * Get appropriate icon for a file based on its extension
 * Returns emoji icon for visual representation
 * @param {string} fileName - Name of file
 * @returns {string} Emoji icon
 */
function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    'ts': '📘', 'tsx': '📘', 'js': '📜', 'jsx': '📜',
    'html': '🌐', 'css': '🎨', 'scss': '🎨', 'sass': '🎨',
    'json': '📋', 'md': '📝', 'py': '🐍', 'rs': '🦀',
    'go': '🐹', 'java': '☕', 'cpp': '⚙️', 'c': '⚙️',
    'txt': '📄', 'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️',
    'gif': '🖼️', 'svg': '🎨', 'pdf': '📕', 'zip': '🗜️',
    'exe': '⚡', 'dll': '🔧', 'xml': '📰', 'yaml': '📋',
    'yml': '📋', 'toml': '📋', 'ini': '⚙️', 'sh': '📜',
    'bat': '📜', 'ps1': '📜', 'vue': '💚', 'svelte': '🧡',
    'php': '🐘', 'rb': '💎', 'swift': '🦅', 'kt': '🅺',
    'cs': '🔷', 'vb': '🔵', 'sql': '🗄️', 'db': '🗄️'
  };
  return iconMap[ext || ''] || '📄';
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * FUNCTION: showNotification
 * Show notification to user
 * Uses global notification system or console fallback
 * @param {string} message - Message to display
 * @param {string} type - Notification type (info/success/warning/error)
 */
function showNotification(message: string, type: string = 'info'): void {
  // Try to use existing notification system
  const notifyFn = (window as any).showNotification || (window as any).notify;
  if (notifyFn) {
    notifyFn(message, type);
    return;
  }
  
  // Fallback: Create inline notification
  const notification = document.createElement('div');
  notification.className = `file-explorer-notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196f3'};
    color: white;
    font-size: 13px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 99999;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * FUNCTION: debugContextMenu
 * Debug function to check context menu system state
 * Logs detailed information about menu setup and dependencies
 */
function debugContextMenu(): void {
  console.group('🔍 Context Menu System Debug');
  
  // Check menu existence
  const menu = document.getElementById('context-menu');
  console.log('Context menu element exists:', !!menu);
  
  if (menu) {
    const items = menu.querySelectorAll('.context-menu-item');
    console.log('Menu items found:', items.length);
    items.forEach(item => {
      console.log('  - Action:', item.getAttribute('data-action'));
    });
  }
  
  // Check Tauri
  console.log('Tauri available:', !!window.__TAURI__);
  if (window.__TAURI__) {
    console.log('Tauri invoke type:', typeof window.__TAURI__.invoke);
  }
  
  // Check state
  console.log('Current context target:', currentContextTarget);
  console.log('Current context path:', currentContextPath);
  console.log('Current is folder:', currentIsFolder);
  console.log('Debug mode:', debugMode);
  
  // Check project path (all sources)
  console.log('Project path (localStorage):', localStorage.getItem('currentProjectPath'));
  console.log('Project path (window):', (window as any).currentProjectPath);
  console.log('Project path (__lastProject):', (window as any).__lastProject?.path);
  
  // Check file items
  const fileItems = document.querySelectorAll('.file-item, .folder-item');
  console.log('Total file/folder items:', fileItems.length);
  console.log('Items with data-path:', document.querySelectorAll('[data-path]').length);
  
  // Check path separator
  console.log('Path separator:', getPathSeparator());
  
  // Check grace period
  console.log('Grace period active:', isInGracePeriod());
  console.log('New project state:', newProjectState);
  
  console.groupEnd();
}

// Make debug function globally available
(window as any).debugContextMenu = debugContextMenu;

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

/**
 * Auto-initialize when DOM is ready
 * Sets up file explorer automatically on page load
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeFileExplorer();
    setTimeout(() => addVisibleChevrons(), 3000);
  });
} else {
  initializeFileExplorer();
  setTimeout(() => addVisibleChevrons(), 3000);
}

// ============================================================================
// CLEANUP ON UNLOAD
// ============================================================================

window.addEventListener('beforeunload', () => {
  if (fileTreeObserver) {
    fileTreeObserver.disconnect();
  }
});

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

export {
  createNewFile,
  createNewFolder,
  openFolderDialog,
  loadFolderContents,
  showVisualFeedback,
  showFileOperationToast,
  fixSubfolderPaths,
  syncProjectPath,
  showNotification,
  // Tab styles
  initializeTabStyles,
  updateTabBadge,
  setTerminalActive,
  // Grace period (from v2.2)
  startGracePeriod,
  isInGracePeriod
};

// ============================================================================
// TYPE DECLARATIONS
// ============================================================================

declare global {
  interface Window {
    __TAURI__?: any;
    fileExplorer?: any;
    addChevrons?: () => void;
    debugContextMenu?: () => void;
    showNotification?: (message: string, type: string) => void;
    fixSubfolderPaths?: () => void;
    syncProjectPath?: (path: string) => void;
    currentProjectPath?: string;
    __currentProjectPath?: string;
    __lastProject?: any;
    __newProjectGracePeriod?: boolean;
    __currentProjectFiles?: any[]; // IDE-style tree file cache
    // Tab styles
    initializeTabStyles?: () => void;
    updateTabBadge?: (selector: string, count: number | string) => void;
    setTerminalActive?: (active: boolean) => void;
    switchExplorerTab?: (tabId: string) => void;
  }
}

console.log('✅ Enhanced File Explorer Module Loaded v4.0 (IDE-style tree with SVG icons)');