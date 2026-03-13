// menuSystem.ts - Menu System and File Operations
// At the top of menuSystem.ts, add import
import { markFileAsSaved, markFileAsModified, renderFileTree as renderFileTreeIDE } from './ide/fileExplorer/fileTreeRenderer';
import { tabManager } from './editor/tabManager';
import { openFolderWithQuickAccess } from './quickAccessIntegration';
import { 
  isTauriAvailable, 
  openFolderDialog, 
  openFileDialog, 
  saveFile, 
  readFile, 
  getDirectoryTree,
  showNotification 
} from './fileSystem';
import { invoke } from '@tauri-apps/api/core';
import { 
  toggleAutonomousMode,
  processCurrentFileAutonomous,
  testAutonomousSystem,
  emergencyStopTyping
} from './autonomousCoding';
import { toggleCameraPanel } from './ide/camera/cameraManager';

// ============================================================================
// ⚡ PERFORMANCE FIX: Folder filtering configuration
// ============================================================================

// Folders to COMPLETELY HIDE (never show, never recurse)
const SKIP_FOLDERS_COMPLETELY = new Set([
  'node_modules',
  'bower_components',
  '.next',
  '.nuxt',
  '.output',
  '__pycache__',
  '.pytest_cache',
  'venv',
  '.venv',
  'env',
  '.tox',
  '.eggs',
  '.mypy_cache',
  'target',           // Rust
  'vendor',           // PHP/Go
  'coverage',
  '.cache',
  '.parcel-cache',
  '.turbo',
  '.gradle',
  '.maven',
  'Pods',             // iOS
  '.dart_tool',       // Flutter
  '.pub-cache',       // Dart
]);

// Folders to SHOW but NOT recurse into (visible but collapsed, no children loaded)
// These are important for developers to see but contain too many internal files
const SHOW_BUT_NO_RECURSE = new Set([
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'out',
  '.idea',
  'bin',
  'obj',
]);

// Global flags for menu system
let fileDialogOpen = false;
let projectActionTimeout: number | null = null;
const actionDebounce = new Map<string, number>();
let currentProjectPath = '';

// ✅ Menu initialization flags - prevent duplicate menu creation
let fileMenuInitialized = false;
let projectMenuInitialized = false;
let viewMenuInitialized = false;
let gitMenuInitialized = false;

// Loading indicator utilities
function createLoadingIndicator(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.id = 'upload-loading-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    backdrop-filter: blur(2px);
    animation: fadeIn 0.2s ease-in;
  `;
  
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 50px;
    height: 50px;
    border: 4px solid #3e3e3e;
    border-top: 4px solid #007acc;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  `;
  
  const container = document.createElement('div');
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    background: #2d2d2d;
    padding: 24px 32px;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  `;
  
  const text = document.createElement('div');
  text.textContent = 'Opening file browser...';
  text.style.cssText = `
    color: #cccccc;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
  
  container.appendChild(spinner);
  container.appendChild(text);
  overlay.appendChild(container);
  
  return overlay;
}

function showLoadingIndicator(message: string = 'Opening file browser...'): HTMLElement {
  // Remove any existing loading indicator
  hideLoadingIndicator();
  
  const indicator = createLoadingIndicator();
  const textElement = indicator.querySelector('div > div:last-child') as HTMLElement;
  if (textElement) {
    textElement.textContent = message;
  }
  
  document.body.appendChild(indicator);
  return indicator;
}

function hideLoadingIndicator(): void {
  const existing = document.getElementById('upload-loading-overlay');
  if (existing) {
    existing.style.opacity = '0';
    existing.style.transition = 'opacity 0.2s';
    setTimeout(() => existing.remove(), 200);
  }
}

// Add CSS animations
function addLoadingStyles(): void {
  if (document.getElementById('loading-animation-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'loading-animation-styles';
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
  document.head.appendChild(style);
}

// Initialize loading styles
addLoadingStyles();

/**
 * Utility function to prevent duplicate actions
 */
function debounceAction(action: string, callback: () => void, delay: number = 300): void {
  const existing = actionDebounce.get(action);
  if (existing) {
    clearTimeout(existing);
  }
  
  const timeout = window.setTimeout(() => {
    callback();
    actionDebounce.delete(action);
  }, delay);
  
  actionDebounce.set(action, timeout);
}

/**
 * Clean up duplicate menu handlers and remove stale menus
 */
export function cleanupMenus(): void {
  // Remove ALL existing submenus to prevent duplicates
  document.querySelectorAll('.menu-submenu').forEach(el => el.remove());
  
  // ✅ Reset menu initialization flags (allows re-creation after cleanup)
  fileMenuInitialized = false;
  projectMenuInitialized = false;
  viewMenuInitialized = false;
  gitMenuInitialized = false;
  
  // Reset other flags
  fileDialogOpen = false;
  if (projectActionTimeout) {
    clearTimeout(projectActionTimeout);
    projectActionTimeout = null;
  }
  
  // Clear debounce map
  actionDebounce.clear();
  
  console.log('✅ Cleaned up all existing menus and reset initialization flags');
}

/**
 * Remove duplicate menus by ID - keeps only the most recent one
 */
function removeDuplicateMenus(menuId: string): void {
  const existingMenus = document.querySelectorAll(`#${menuId}`);
  if (existingMenus.length > 1) {
    console.warn(`⚠️ Found ${existingMenus.length} duplicate menus with ID: ${menuId}, removing extras`);
    // Keep only the last one
    for (let i = 0; i < existingMenus.length - 1; i++) {
      existingMenus[i].remove();
    }
  }
}

/**
 * COMPLETE FILE MENU SETUP - INTEGRATED SOLUTION
 * ✅ FIXED: Singleton pattern - only creates menu once
 */
export function setupCompleteFileMenu(): void {
  // ✅ SINGLETON: Prevent multiple initializations
  if (fileMenuInitialized) {
    console.log('File menu already initialized, skipping...');
    return;
  }
  
  console.log('Setting up complete File menu system...');
  
  const menuBar = document.querySelector('.menu-bar');
  if (!menuBar) {
    console.error('Menu bar not found for File menu');
    return;
  }
  
  // Check if File menu item already exists
  const existingFileMenuItem = menuBar.querySelector('[data-menu="file"]');
  if (existingFileMenuItem) {
    console.log('File menu item already exists, skipping creation');
    fileMenuInitialized = true;
    return;
  }
  
  // Check if submenu already exists
  const existingSubmenu = document.getElementById('file-submenu-complete');
  if (existingSubmenu) {
    console.log('File submenu already exists, skipping creation');
    fileMenuInitialized = true;
    return;
  }
  
  // ✅ CLEANUP: Remove any stale File menu items (shouldn't exist, but just in case)
  menuBar.querySelectorAll('.menu-item').forEach(item => {
    if (item.textContent?.trim() === 'File') {
      item.remove();
    }
  });
  
  // Remove any stale submenus
  document.querySelectorAll('#file-submenu-complete').forEach(el => el.remove());
  document.querySelectorAll('.menu-submenu[data-menu-type="file"]').forEach(el => el.remove());
  
  // Create File menu item
  const fileMenuItem = document.createElement('div');
  fileMenuItem.className = 'menu-item';
  fileMenuItem.setAttribute('data-menu', 'file');
  fileMenuItem.textContent = 'File';
  fileMenuItem.style.cssText = `
    padding: 8px 16px;
    cursor: pointer;
    color: #cccccc;
    font-size: 13px;
    user-select: none;
    border-radius: 3px;
    transition: background-color 0.2s;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
  
  // Insert File menu as the first item (after toggle button)
  const toggleBtn = document.getElementById('explorer-toggle-btn');
  if (toggleBtn && toggleBtn.nextSibling) {
    menuBar.insertBefore(fileMenuItem, toggleBtn.nextSibling);
  } else if (menuBar.firstChild) {
    menuBar.insertBefore(fileMenuItem, menuBar.firstChild);
  } else {
    menuBar.appendChild(fileMenuItem);
  }
  
  // Create File submenu
  const fileSubmenu = document.createElement('div');
  fileSubmenu.className = 'menu-submenu';
  fileSubmenu.id = 'file-submenu-complete';
  fileSubmenu.setAttribute('data-menu-type', 'file');
  fileSubmenu.style.cssText = `
    position: fixed;
    display: none;
    background: #2d2d2d;
    background-color: #2d2d2d;
    border: 1px solid #464647;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    border-radius: 6px;
    min-width: 220px;
    padding: 6px 0;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    opacity: 1;
    isolation: isolate;
  `;
  
  // File menu items with unique action names
  const fileMenuItems = [
    { label: 'New File', shortcut: 'Ctrl+N', action: 'file-new' },
    { label: 'New Folder', shortcut: 'Ctrl+Shift+N', action: 'file-new-folder' },
    { type: 'separator' },
    { label: 'Open File...', shortcut: 'Ctrl+O', action: 'file-open' },
    { label: 'Open Folder...', shortcut: 'Ctrl+Shift+O', action: 'file-open-folder' },
    { type: 'separator' },
    { label: 'Save', shortcut: 'Ctrl+S', action: 'file-save' },
    { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: 'file-save-as' },
    { label: 'Save All', shortcut: 'Ctrl+Alt+S', action: 'file-save-all' },
    { type: 'separator' },
    { label: 'Close File', shortcut: 'Ctrl+W', action: 'file-close' },
    { label: 'Close Project', shortcut: 'Ctrl+Shift+W', action: 'file-close-project' },
    { type: 'separator' },
    { label: 'Exit', shortcut: 'Alt+F4', action: 'file-exit' }
  ];
  
  // Build submenu items
  fileMenuItems.forEach(item => {
    if (item.type === 'separator') {
      const separator = document.createElement('div');
      separator.style.cssText = `
        height: 1px;
        background: #464647;
        margin: 6px 12px;
      `;
      fileSubmenu.appendChild(separator);
    } else {
      const menuItem = document.createElement('div');
      menuItem.className = 'submenu-item';
      menuItem.setAttribute('data-action', item.action!);
      menuItem.style.cssText = `
        padding: 10px 16px;
        cursor: pointer;
        color: #cccccc;
        background-color: #2d2d2d;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.15s ease;
        white-space: nowrap;
      `;
      
      const labelSpan = document.createElement('span');
      labelSpan.textContent = item.label!;
      labelSpan.style.display = 'flex';
      labelSpan.style.alignItems = 'center';
      labelSpan.style.gap = '8px';
      menuItem.appendChild(labelSpan);
      
      if (item.shortcut) {
        const shortcutSpan = document.createElement('span');
        shortcutSpan.textContent = item.shortcut;
        shortcutSpan.style.cssText = `
          color: #888888;
          font-size: 11px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          margin-left: 24px;
        `;
        menuItem.appendChild(shortcutSpan);
      }
      
      // Hover effects
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.backgroundColor = '#094771';
        menuItem.style.color = '#ffffff';
      });
      
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.backgroundColor = '#2d2d2d';
        menuItem.style.color = '#cccccc';
      });
      
      // Click handler with debouncing (except for file-new which needs direct call for prompt)
      menuItem.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log(`File menu action: ${item.action}`);
        fileSubmenu.style.display = 'none';
        
        // Call file-new and file-new-folder directly (no debounce) because they use prompt()
        // Debounce causes prompt() to be blocked by browsers
        if (item.action === 'file-new' || item.action === 'file-new-folder') {
          handleFileMenuAction(item.action!);
        } else {
          debounceAction(item.action!, () => {
            handleFileMenuAction(item.action!);
          });
        }
      });
      
      fileSubmenu.appendChild(menuItem);
    }
  });
  
  document.body.appendChild(fileSubmenu);
  
  // Show/hide submenu on click
  fileMenuItem.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('File menu clicked');
    
    // ✅ CRITICAL FIX: Hide the OLD menu-dropdown that causes shadow
    document.querySelectorAll('.menu-dropdown').forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
    
    // ✅ CLEANUP: Remove any leftover overlays that might cause shadows
    document.querySelectorAll('.project-selector-overlay').forEach(el => {
      console.log('Removing leftover .project-selector-overlay');
      el.remove();
    });
    document.querySelectorAll('.quick-access-overlay').forEach(el => {
      if ((el as HTMLElement).style.display === 'none' || (el as HTMLElement).style.opacity === '0') {
        console.log('Removing hidden .quick-access-overlay');
        el.remove();
      }
    });
    
    // ✅ AGGRESSIVE FIX: Remove ALL duplicate file-submenu-complete elements first
    const allFileSubmenus = document.querySelectorAll('#file-submenu-complete');
    console.log(`Found ${allFileSubmenus.length} file submenus`);
    if (allFileSubmenus.length > 1) {
      // Keep only this specific instance, remove all others
      allFileSubmenus.forEach(menu => {
        if (menu !== fileSubmenu) {
          console.log('Removing duplicate file submenu');
          menu.remove();
        }
      });
    }
    
    // Hide all other menus
    document.querySelectorAll('.menu-submenu').forEach(menu => {
      if (menu !== fileSubmenu) {
        (menu as HTMLElement).style.display = 'none';
      }
    });
    
    if (fileSubmenu.style.display === 'none' || !fileSubmenu.style.display) {
      const rect = fileMenuItem.getBoundingClientRect();
      fileSubmenu.style.top = `${rect.bottom + 2}px`;
      fileSubmenu.style.left = `${rect.left}px`;
      fileSubmenu.style.display = 'block';
    } else {
      fileSubmenu.style.display = 'none';
    }
  });
  
  // Hover effects for menu item
  fileMenuItem.addEventListener('mouseenter', () => {
    fileMenuItem.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  });
  
  fileMenuItem.addEventListener('mouseleave', () => {
    fileMenuItem.style.backgroundColor = 'transparent';
  });
  
  // ✅ Mark as initialized to prevent duplicate creation
  fileMenuInitialized = true;
  console.log('Complete File menu setup finished');
}

/**
 * Setup Project Menu - Fixed to prevent duplicate actions
 * ✅ FIXED: Singleton pattern
 */
export function setupProjectMenu(): void {
  // ✅ SINGLETON: Prevent multiple initializations
  if (projectMenuInitialized) {
    console.log('Project menu already initialized, skipping...');
    return;
  }
  
  console.log('Setting up Project menu...');
  
  const projectMenu = document.getElementById('project-menu') || 
                      document.querySelector('[data-menu="project"]') ||
                      document.querySelector('.menu-item:nth-child(3)');
  
  if (!projectMenu) {
    console.error('Project menu element not found');
    return;
  }
  
  // Check if submenu already exists
  const existingSubmenu = document.getElementById('project-submenu');
  if (existingSubmenu) {
    console.log('Project submenu already exists, skipping creation');
    projectMenuInitialized = true;
    return;
  }
  
  // ✅ CRITICAL: Remove ALL existing project submenus first
  document.querySelectorAll('#project-submenu').forEach(el => el.remove());
  document.querySelectorAll('.menu-submenu[data-menu-type="project"]').forEach(el => el.remove());
  
  // Create fresh Project submenu
  const projectSubmenu = document.createElement('div');
  projectSubmenu.className = 'menu-submenu';
  projectSubmenu.id = 'project-submenu';
  projectSubmenu.setAttribute('data-menu-type', 'project');
  projectSubmenu.style.cssText = `
    position: fixed;
    display: none;
    background: #2d2d2d;
    background-color: #2d2d2d;
    border: 1px solid #464647;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    z-index: 999999;
    min-width: 240px;
    border-radius: 6px;
    padding: 6px 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    isolation: isolate;
  `;
  
  // Project menu items with unique action names
  const projectMenuItems = [
    { label: 'New Project...', action: 'project-new' },
    { type: 'separator' },
    { label: 'Open Project...', action: 'project-open-folder' },
    { label: 'Open File...', action: 'project-open-file' },
    { type: 'separator' },
    { label: 'Save', action: 'project-save' },
    { label: 'Save As...', action: 'project-save-as' },
    { type: 'separator' },
    { label: 'Exit', action: 'project-exit' }
  ];
  
  // Build submenu items
  projectMenuItems.forEach(item => {
    if (item.type === 'separator') {
      const separator = document.createElement('div');
      separator.style.cssText = `
        height: 1px;
        background: #464647;
        margin: 6px 12px;
      `;
      projectSubmenu.appendChild(separator);
    } else {
      const menuItem = document.createElement('div');
      menuItem.className = 'submenu-item';
      menuItem.setAttribute('data-action', item.action!);
      menuItem.style.cssText = `
        padding: 10px 16px;
        cursor: pointer;
        color: #cccccc;
        background-color: #2d2d2d;
        display: flex;
        align-items: center;
        transition: all 0.15s ease;
        white-space: nowrap;
      `;
      
      menuItem.textContent = item.label!;
      
      // Hover effects
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.backgroundColor = '#094771';
        menuItem.style.color = '#ffffff';
      });
      
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.backgroundColor = '#2d2d2d';
        menuItem.style.color = '#cccccc';
      });
      
      // Single click handler with protection against duplicates
      menuItem.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        projectSubmenu.style.display = 'none';
        
        // Clear any pending action
        if (projectActionTimeout) {
          clearTimeout(projectActionTimeout);
        }
        
        // Delay action slightly to ensure no duplicates
        projectActionTimeout = setTimeout(() => {
          handleProjectMenuAction(item.action!);
          projectActionTimeout = null;
        }, 50);
      });
      
      projectSubmenu.appendChild(menuItem);
    }
  });
  
  document.body.appendChild(projectSubmenu);
  
  // Clone the project menu to remove old handlers
  const newProjectMenu = projectMenu.cloneNode(true) as HTMLElement;
  projectMenu.parentNode?.replaceChild(newProjectMenu, projectMenu);
  
  // Single click handler for showing menu
  newProjectMenu.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    ensureSingleMenu(); // Remove any duplicates first
    hideAllSubmenus();
    
    const rect = newProjectMenu.getBoundingClientRect();
    projectSubmenu.style.top = `${rect.bottom + 2}px`;
    projectSubmenu.style.left = `${rect.left}px`;
    projectSubmenu.style.display = 'block';
  });
  
  // ✅ Mark as initialized
  projectMenuInitialized = true;
  console.log('Project menu setup complete');
}

/**
 * Enhanced View Menu Setup with Visual Indicators (FIXED - Single instance)
 * ✅ FIXED: Singleton pattern
 */
export function setupEnhancedViewMenu(): void {
  // ✅ SINGLETON: Prevent multiple initializations
  if (viewMenuInitialized) {
    console.log('View menu already initialized, skipping...');
    return;
  }
  
  console.log('Setting up enhanced View menu with indicators...');
  
  const menuBar = document.querySelector('.menu-bar');
  if (!menuBar) {
    console.error('Menu bar not found for View menu');
    return;
  }
  
  // Check if View submenu already exists
  const existingSubmenu = document.getElementById('view-submenu');
  if (existingSubmenu) {
    console.log('View submenu already exists, skipping creation');
    viewMenuInitialized = true;
    return;
  }
  
  // Remove ALL existing View menus
  const allViewMenus = Array.from(menuBar.querySelectorAll('.menu-item')).filter(item => 
    item.textContent?.trim().toLowerCase() === 'view'
  );
  
  allViewMenus.forEach(menu => {
    menu.remove();
  });
  
  // Remove any existing View submenus
  document.querySelectorAll('#view-submenu, [id*="view-menu"], [class*="view-submenu"]').forEach(submenu => {
    submenu.remove();
  });
  
  // Create the ONE View menu
  const viewMenuItem = document.createElement('div');
  viewMenuItem.className = 'menu-item';
  viewMenuItem.setAttribute('data-menu', 'view');
  viewMenuItem.textContent = 'View';
  viewMenuItem.style.cssText = `
    padding: 8px 16px;
    cursor: pointer;
    color: #cccccc;
    font-size: 13px;
    user-select: none;
    border-radius: 3px;
    transition: background-color 0.2s;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
  
  // Find proper position
  const projectMenu = menuBar.querySelector('[data-menu="project"], #project-menu');
  const fileMenu = menuBar.querySelector('[data-menu="file"]');
  
  if (projectMenu && projectMenu.nextSibling) {
    menuBar.insertBefore(viewMenuItem, projectMenu.nextSibling);
  } else if (fileMenu && fileMenu.nextSibling) {
    menuBar.insertBefore(viewMenuItem, fileMenu.nextSibling);
  } else {
    menuBar.appendChild(viewMenuItem);
  }
  
  // Create View submenu
  const viewSubmenu = document.createElement('div');
  viewSubmenu.className = 'menu-submenu view-submenu-enhanced';
  viewSubmenu.id = 'view-submenu';
  viewSubmenu.setAttribute('data-menu-type', 'view');
  viewSubmenu.style.cssText = `
    position: fixed;
    display: none;
    background: #2d2d2d;
    background-color: #2d2d2d;
    border: 1px solid #464647;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    z-index: 999999;
    min-width: 280px;
    border-radius: 6px;
    padding: 6px 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    isolation: isolate;
  `;
  
  const viewMenuItems = [
    { type: 'header', label: 'PANELS' },
    { label: 'Explorer', shortcut: 'Ctrl+B', action: 'toggleExplorer', panel: 'explorer' },
    { label: 'AI Assistant', shortcut: 'Ctrl+Shift+A', action: 'toggleAIAssistant', panel: 'ai-assistant' },
    { label: 'Camera', shortcut: 'Alt+C', action: 'toggleCamera', panel: 'camera' },
    { label: 'Android Panel', shortcut: 'Ctrl+Shift+D', action: 'toggleAndroid', panel: 'android' },
    { label: 'Pi Panel', shortcut: 'Ctrl+Shift+B', action: 'togglePiPanel', panel: 'pi-panel' },
    { label: 'GPU Panel', shortcut: 'Ctrl+Shift+U', action: 'toggleGpuPanel', panel: 'gpu-panel' },
    { type: 'separator' },
    { type: 'header', label: 'EXPLORER TABS' },
    { label: 'Files', shortcut: 'Alt+1', action: 'showFiles', tab: 'files' },
    { label: 'Enhanced Terminal', shortcut: 'Alt+3', action: 'showTerminal', tab: 'terminal' },
    { type: 'separator' },
    { type: 'header', label: 'LAYOUT' },
    { label: 'Full Screen', shortcut: 'F11', action: 'toggleFullScreen' },
    { label: 'Zen Mode', shortcut: 'Ctrl+K Z', action: 'toggleZenMode' },
    { label: 'Reset Layout', shortcut: 'Ctrl+Alt+R', action: 'resetLayout' },
    { type: 'separator' },
    { type: 'header', label: 'APPEARANCE' },
    { label: 'Toggle Theme', shortcut: 'Alt+T', action: 'toggleTheme' },
    { label: 'Move Sidebar', shortcut: '', action: 'moveSidebar' }
  ];
  
  // Build submenu items
  viewMenuItems.forEach(item => {
    if (item.type === 'separator') {
      const separator = document.createElement('div');
      separator.style.cssText = `
        height: 1px;
        background: #464647;
        margin: 6px 12px;
      `;
      viewSubmenu.appendChild(separator);
    } else if (item.type === 'header') {
      const header = document.createElement('div');
      header.style.cssText = `
        padding: 8px 16px 4px;
        color: #969696;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      `;
      header.textContent = item.label || '';
      viewSubmenu.appendChild(header);
    } else {
      const menuItem = document.createElement('div');
      menuItem.className = 'submenu-item';
      menuItem.setAttribute('data-action', item.action || '');
      if (item.panel) {
        menuItem.setAttribute('data-panel', item.panel);
      }
      if (item.tab) {
        menuItem.setAttribute('data-tab', item.tab);
      }
      menuItem.style.cssText = `
        padding: 10px 16px 10px 36px;
        cursor: pointer;
        color: #cccccc;
        background-color: #2d2d2d;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.15s ease;
        white-space: nowrap;
        position: relative;
      `;
      
      const checkmark = document.createElement('span');
      checkmark.className = 'menu-checkmark';
      checkmark.style.cssText = `
        position: absolute;
        left: 12px;
        width: 16px;
        color: #4ec9b0;
      `;
      menuItem.appendChild(checkmark);
      
      const labelSpan = document.createElement('span');
      labelSpan.textContent = item.label || '';
      menuItem.appendChild(labelSpan);
      
      if (item.shortcut) {
        const shortcutSpan = document.createElement('span');
        shortcutSpan.textContent = item.shortcut;
        shortcutSpan.style.cssText = `
          color: #888888;
          font-size: 11px;
          margin-left: 24px;
        `;
        menuItem.appendChild(shortcutSpan);
      }
      
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.backgroundColor = '#094771';
      });
      
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.backgroundColor = '#2d2d2d';
      });
      
      menuItem.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        viewSubmenu.style.display = 'none';
        if (item.action) {
          handleViewMenuAction(item.action);
          updateViewMenuIndicators();
        }
      });
      
      viewSubmenu.appendChild(menuItem);
    }
  });
  
  document.body.appendChild(viewSubmenu);
  
  viewMenuItem.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    ensureSingleMenu(); // Remove any duplicates first
    updateViewMenuIndicators();
    hideAllSubmenus();
    
    if (viewSubmenu.style.display === 'none' || !viewSubmenu.style.display) {
      const rect = viewMenuItem.getBoundingClientRect();
      viewSubmenu.style.top = `${rect.bottom + 2}px`;
      viewSubmenu.style.left = `${rect.left}px`;
      viewSubmenu.style.display = 'block';
    } else {
      viewSubmenu.style.display = 'none';
    }
  });
  
  viewMenuItem.addEventListener('mouseenter', () => {
    viewMenuItem.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  });
  
  viewMenuItem.addEventListener('mouseleave', () => {
    viewMenuItem.style.backgroundColor = 'transparent';
  });
  
  // ✅ Mark as initialized
  viewMenuInitialized = true;
  console.log('Enhanced View menu setup complete');
}

/**
 * Handle View Menu Actions
 */
async function handleViewMenuAction(action: string): Promise<void> {
  console.log(`Handling view menu action: ${action}`);
  
  try {
    switch (action) {
      case 'toggleExplorer':
        const explorerPanel = document.querySelector('.explorer-panel') as HTMLElement;
        if (explorerPanel) {
          if (!document.getElementById('explorer-hide-style')) {
            const style = document.createElement('style');
            style.id = 'explorer-hide-style';
            style.innerHTML = `
              .explorer-panel.force-hidden {
                display: none !important;
                visibility: hidden !important;
                width: 0 !important;
                overflow: hidden !important;
              }
            `;
            document.head.appendChild(style);
          }
          
          if (explorerPanel.classList.contains('force-hidden')) {
            explorerPanel.classList.remove('force-hidden');
            localStorage.setItem('explorerHidden', 'false');
            showNotification('Explorer panel shown', 'info');
          } else {
            explorerPanel.classList.add('force-hidden');
            localStorage.setItem('explorerHidden', 'true');
            showNotification('Explorer panel hidden', 'info');
          }
        }
        break;
        
      case 'toggleAIAssistant':
        const aiAssistantPanel = document.querySelector('.assistant-panel') as HTMLElement;
        if (aiAssistantPanel) {
          if (aiAssistantPanel.style.display === 'none') {
            aiAssistantPanel.style.display = 'block';
            showNotification('AI Assistant shown', 'info');
          } else {
            aiAssistantPanel.style.display = 'none';
            showNotification('AI Assistant hidden', 'info');
          }
        }
        break;
        
      case 'toggleCamera':
        toggleCameraPanel();
        break;
                    case 'toggleGpuPanel':
            if (typeof (window as any).toggleGpuPanel === 'function') {
                (window as any).toggleGpuPanel();
            }
            break;
        case 'togglePiPanel':
            if (typeof (window as any).togglePiPanel === 'function') {
                (window as any).togglePiPanel();
            }
            break;
        case 'toggleAndroid':
      if ((window as any).androidPanel) {
        (window as any).androidPanel.toggle();
      }
      break;

        
      case 'toggleFullScreen':
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
        break;
        
      case 'toggleZenMode':
        const panels = ['.explorer-panel', '.assistant-panel', '.terminal-panel', '.status-bar', '.menu-bar'];
        const isZenMode = document.body.classList.contains('zen-mode');
        
        if (!isZenMode) {
          document.body.classList.add('zen-mode');
          panels.forEach(selector => {
            const panel = document.querySelector(selector) as HTMLElement;
            if (panel) {
              panel.setAttribute('data-zen-hidden', panel.style.display || 'block');
              panel.style.display = 'none';
            }
          });
          showNotification('Zen mode enabled - Press Ctrl+K Z to exit', 'info');
        } else {
          document.body.classList.remove('zen-mode');
          panels.forEach(selector => {
            const panel = document.querySelector(selector) as HTMLElement;
            if (panel && panel.hasAttribute('data-zen-hidden')) {
              panel.style.display = panel.getAttribute('data-zen-hidden') || 'block';
              panel.removeAttribute('data-zen-hidden');
            }
          });
          showNotification('Zen mode disabled', 'info');
        }
        break;
        
      case 'resetLayout':
        const defaultPanels = {
          '.explorer-panel': { display: 'flex', width: '250px' },
          '.assistant-panel': { display: 'block', width: '350px' },
          '.terminal-panel': { display: 'block', height: '200px' },
          '.status-bar': { display: 'flex' },
          '.menu-bar': { display: 'flex' }
        };
        
        Object.entries(defaultPanels).forEach(([selector, styles]) => {
          const panel = document.querySelector(selector) as HTMLElement;
          if (panel) {
            Object.assign(panel.style, styles);
            panel.classList.remove('force-hidden');
          }
        });
        
        localStorage.removeItem('explorerHidden');
        showNotification('Layout reset to default', 'info');
        break;
        
      default:
        console.log(`Unknown view menu action: ${action}`);
    }
    
    updateViewMenuIndicators();
    
  } catch (error) {
    console.error(`Error handling view menu action ${action}:`, error);
    showNotification(`Error: ${action} failed`, 'error');
  }
}

/**
 * Update View Menu Indicators
 */
function updateViewMenuIndicators(): void {
  const panels = [
    { selector: '.explorer-panel', menuItem: '[data-panel="explorer"]' },
    { selector: '.assistant-panel', menuItem: '[data-panel="ai-assistant"]' },
    { selector: '.camera-panel', menuItem: '[data-panel="camera"]' },
    { selector: '.pi-panel', menuItem: '[data-panel="pi-panel"]' },
    { selector: '.gpu-panel', menuItem: '[data-panel="gpu-panel"]' }
  ];
  
  panels.forEach(({ selector, menuItem }) => {
    const panel = document.querySelector(selector);
    const item = document.querySelector(menuItem);
    
    if (panel && item) {
      const checkmark = item.querySelector('.menu-checkmark');
      const isVisible = !panel.classList.contains('force-hidden') && 
                       window.getComputedStyle(panel).display !== 'none';
      
      if (checkmark) {
        checkmark.textContent = isVisible ? '✓' : '';
      }
    }
  });
}

/**
 * Enhanced File Menu Action Handler with unique action names
 */
async function handleFileMenuAction(action: string): Promise<void> {
  console.log(`Handling file menu action: ${action}`);
  
  // Prevent duplicate dialogs
  if ((action === 'file-open' || action === 'file-open-folder') && fileDialogOpen) {
    console.log('File dialog already open, skipping');
    return;
  }
  
  try {
    switch (action) {
      case 'file-new':
        await createNewFile();
        break;
        
      case 'file-new-folder':
        await createNewFolder();
        break;
        
      case 'file-open':
        fileDialogOpen = true;
        try {
          await openFileAction();
        } finally {
          setTimeout(() => { fileDialogOpen = false; }, 500);
        }
        break;
        
      case 'file-open-folder':
        fileDialogOpen = true;
        try {
          await openFolderAction();
        } finally {
          setTimeout(() => { fileDialogOpen = false; }, 500);
        }
        break;
        
      case 'file-save':
        await saveFileAction();
        break;
        
      case 'file-save-as':
        await saveFileAsAction();
        break;
        
      case 'file-save-all':
        await saveAllAction();
        break;
        
      case 'file-close':
        await closeFileAction();
        break;
        
      case 'file-close-project':
        await closeProjectAction();
        break;
        
      case 'file-exit':
        await exitAction();
        break;
        
      default:
        console.log(`Unknown file menu action: ${action}`);
    }
  } catch (error) {
    console.error(`Error handling file menu action ${action}:`, error);
    showNotification(`Error: ${action} failed`, 'error');
  }
}

/**
 * Handle Project Menu Actions with duplicate prevention
 */
async function handleProjectMenuAction(action: string): Promise<void> {
  console.log(`Project menu action: ${action}`);
  
  switch (action) {
    case 'project-open-file':
      if (fileDialogOpen) {
        console.log('File dialog already open, skipping');
        return;
      }
      
      fileDialogOpen = true;
      
      try {
        showLoadingIndicator('Opening file browser...');
        
        if (isTauriAvailable()) {
          await new Promise(resolve => setTimeout(resolve, 100));
          const fileResult = await openFileDialog();
          
          hideLoadingIndicator();
          
          if (fileResult) {
            console.log('File selected:', fileResult.path);
            
            const tabManager = (window as any).tabManager;
            if (tabManager?.addTab) {
              tabManager.addTab(fileResult.path, fileResult.content);
            } else {
              loadContentIntoMonacoEditor(fileResult.content, fileResult.path);
            }
            
            showNotification(`Opened: ${fileResult.path.split(/[/\\]/).pop()}`, 'success');
          }
        } else {
          hideLoadingIndicator();
          showNotification('File operations require Tauri desktop app', 'error');
        }
      } finally {
        setTimeout(() => {
          fileDialogOpen = false;
        }, 500);
      }
      break;
      
case 'project-new':
  console.log('🚀 Opening modern project modal...');
  
  // Use new modern modal if available
  if ((window as any).showModernProjectModal) {
    (window as any).showModernProjectModal();
  } else {
    // Fallback: try to load it dynamically
    console.warn('⚠️ Modern modal not loaded, loading now...');
    
    import('./ide/projectCreation/ui/modernModal').then(module => {
      const modal = new module.ModernProjectModal();
      modal.show();
    }).catch(err => {
      console.error('❌ Failed to load modern modal:', err);
      alert('Failed to open project creation dialog');
    });
  }
  break;
      
    case 'project-open-folder':
      if (!fileDialogOpen) {
        fileDialogOpen = true;
        try {
          await openFolderAction();
        } finally {
          setTimeout(() => { fileDialogOpen = false; }, 500);
        }
      }
      break;
      
    case 'project-save':
      await saveFileAction();
      break;
      
    case 'project-save-as':
      await saveFileAsAction();
      break;
      
    case 'project-exit':
      await exitAction();
      break;
      
    default:
      console.log(`Unknown project action: ${action}`);
  }
}

// File operation functions
async function createNewFile(): Promise<void> {
  console.log('Creating new file...');
  try {
    // ✅ Use newFileHandler for better UI (modal dialog instead of browser prompt)
    if ((window as any).newFileHandler?.showNewFileDialog) {
      (window as any).newFileHandler.showNewFileDialog();
      return;
    }
    
    // Fallback: try createNewFile from window
    if ((window as any).createNewFile) {
      (window as any).createNewFile();
      return;
    }
    
    // Fallback: use createFileWithDialog module
    const createFileModule = await import('./fileOperations/createFileWithDialog');
    if (createFileModule.createNewFile) {
      await createFileModule.createNewFile();
      showNotification('New file created successfully', 'success');
    } else if (createFileModule.createFileWithDialog) {
      await createFileModule.createFileWithDialog();
      showNotification('New file created successfully', 'success');
    } else {
      await createNewFileFallback();
    }
    document.dispatchEvent(new CustomEvent('menu-new-file'));
  } catch (error) {
    console.error('Error creating new file:', error);
    showNotification('Failed to create new file', 'error');
  }
}

async function createNewFolder(): Promise<void> {
  console.log('Creating new folder...');
  try {
    // ✅ Use newFolderHandler for better UI (modal dialog instead of browser prompt)
    if ((window as any).newFolderHandler?.showNewFolderDialog) {
      (window as any).newFolderHandler.showNewFolderDialog();
      return;
    }
    
    // Fallback: try createNewFolder from window
    if ((window as any).createNewFolder && (window as any).createNewFolder !== createNewFolder) {
      (window as any).createNewFolder();
      return;
    }
    
    // Fallback: use createFileWithDialog module
    const createFileModule = await import('./fileOperations/createFileWithDialog');
    if (createFileModule.createNewFolder) {
      await createFileModule.createNewFolder();
      showNotification('New folder created successfully', 'success');
    } else {
      const folderName = prompt('Enter folder name:');
      if (folderName && folderName.trim()) {
        console.log(`Creating folder: ${folderName}`);
        showNotification(`Folder "${folderName}" created`, 'success');
      }
    }
    document.dispatchEvent(new CustomEvent('menu-new-folder'));
  } catch (error) {
    console.error('Error creating new folder:', error);
    showNotification('Failed to create new folder', 'error');
  }
}

async function openFileAction(): Promise<void> {
  console.log('Opening file...');
  
  showLoadingIndicator('Opening file browser...');
  
  try {
    if (!isTauriAvailable()) {
      hideLoadingIndicator();
      showNotification('File operations require Tauri desktop app', 'error');
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const fileResult = await openFileDialog();
    
    hideLoadingIndicator();
    
    if (fileResult) {
      console.log('Selected file:', fileResult.path);
      const tabManager = (window as any).tabManager;
      if (tabManager && typeof tabManager.addTab === 'function') {
        tabManager.addTab(fileResult.path, fileResult.content);
      } else {
        loadContentIntoMonacoEditor(fileResult.content, fileResult.path);
      }
      showNotification(`Opened: ${fileResult.path.split(/[/\\]/).pop()}`, 'success');
    }
    document.dispatchEvent(new CustomEvent('menu-open-file'));
  } catch (error) {
    console.error('Error opening file:', error);
    hideLoadingIndicator();
    showNotification('Failed to open file', 'error');
  }
}

async function openFolderAction(): Promise<void> {
  console.log('Opening folder...');
  
  let loadingIndicator: HTMLElement | null = null;
  
  try {
    if (!isTauriAvailable()) {
      showNotification('Folder operations require Tauri desktop app', 'error');
      return;
    }
    
   // loadingIndicator = showLoadingIndicator('Opening folder browser...');
     const path = await openFolderWithQuickAccess();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Hide folder browser loading
    hideLoadingIndicator();
    loadingIndicator = null;
    
    if (path) {
      console.log('Selected folder:', path);
      currentProjectPath = path;
      
      // Show new loading for contents
      loadingIndicator = showLoadingIndicator('Loading folder contents...');
      
      const files = await getDirectoryTree(path, 5);
      
      // Always hide loading indicator
      hideLoadingIndicator();
      loadingIndicator = null;
      
      if (files) {
        updateFileExplorerWithProject(path, files);
        document.dispatchEvent(new CustomEvent('project-opened', {
          detail: { path: path, files }
        }));
        showNotification(`Opened folder: ${files.name}`, 'success');
      } else {
        showNotification('Failed to load folder contents', 'error');
      }
    }
    
    document.dispatchEvent(new CustomEvent('menu-open-folder'));
    
  } catch (error) {
    console.error('Error opening folder:', error);
    showNotification('Failed to open folder', 'error');
  } finally {
    // CRITICAL: Always hide loading indicator no matter what
    hideLoadingIndicator();
    
    // Force remove after delay as backup
    setTimeout(() => {
      hideLoadingIndicator();
    }, 500);
  }
}



// ✅ UPDATE: Save File Action
async function saveFileAction(): Promise<void> {
  console.log('💾 Saving file...');
  try {
    const editor = (window as any).monaco?.editor?.getEditors()?.[0];
    if (!editor) {
      showNotification('No file is currently open', 'error');
      return;
    }
    
    const content = editor.getValue();
    const currentTab = tabManager.getActiveTab();
    
    if (currentTab && currentTab.path && currentTab.path !== 'Untitled') {
      // Save the file
      await saveFile(content, currentTab.path);
      console.log('✅ File saved successfully');
      
      // ✅ CRITICAL: Mark file as saved
      markFileAsSaved(currentTab.path);
      tabManager.markTabAsSaved(currentTab.id);
      
      showNotification('File saved successfully', 'success');
      
      // Dispatch save event
      document.dispatchEvent(new CustomEvent('file-saved', {
        detail: { path: currentTab.path }
      }));
    } else {
      // Save As for new files
      const fileName = currentTab?.name || 'untitled.txt';
      const savedPath = await saveFile(content, undefined, fileName);
      
      if (savedPath) {
        console.log('✅ File saved as:', savedPath);
        
        // ✅ CRITICAL: Mark as saved
        markFileAsSaved(savedPath);
        tabManager.updateTabPath(currentTab?.id, savedPath);
        tabManager.markTabAsSaved(currentTab?.id);
        
        showNotification(`File saved as: ${savedPath.split(/[/\\]/).pop()}`, 'success');
      }
    }
  } catch (error) {
    console.error('❌ Error saving file:', error);
    showNotification('Failed to save file', 'error');
  }
}

// ✅ UPDATE: Save File As Action
async function saveFileAsAction(): Promise<void> {
  console.log('💾 Saving file as...');
  try {
    const editor = (window as any).monaco?.editor?.getEditors()?.[0];
    if (!editor) {
      showNotification('No file is currently open', 'error');
      return;
    }
    
    const content = editor.getValue();
    const currentTab = tabManager.getActiveTab();
    const fileName = currentTab?.name || 'untitled.txt';
    
    const savedPath = await saveFile(content, undefined, fileName);
    
    if (savedPath) {
      console.log('✅ File saved as:', savedPath);
      
      // ✅ CRITICAL: Mark as saved
      markFileAsSaved(savedPath);
      
      if (currentTab) {
        tabManager.updateTabPath(currentTab.id, savedPath);
        tabManager.markTabAsSaved(currentTab.id);
      }
      
      showNotification(`File saved as: ${savedPath.split(/[/\\]/).pop()}`, 'success');
      
      document.dispatchEvent(new CustomEvent('file-saved', {
        detail: { path: savedPath }
      }));
    }
  } catch (error) {
    console.error('❌ Error saving file as:', error);
    showNotification('Failed to save file as', 'error');
  }
}

// ============================================================================
// FIXED SAVE ALL ACTION FOR menuSystem.ts
// Replace your existing saveAllAction function (around line 1250) with this:
// ============================================================================

// ✅ FIXED: Save All Action - Uses tabManager.saveAllTabs()
async function saveAllAction(): Promise<void> {
  console.log('💾 Save All initiated...');
  
  try {
    // Check if there are any modified tabs
    if (!tabManager.hasModifiedTabs()) {
      showNotification('ℹ️ No unsaved files', 'info');
      return;
    }
    
    // Show loading indicator
    const loading = createLoadingIndicator();
    document.body.appendChild(loading);
    
    // Use tabManager's built-in saveAllTabs method
    const result = await tabManager.saveAllTabs();
    
    // Remove loading indicator
    if (document.body.contains(loading)) {
      document.body.removeChild(loading);
    }
    
    // Show result notification
    if (result.failed === 0 && result.saved > 0) {
      showNotification(`✅ All ${result.saved} file(s) saved successfully`, 'success');
    } else if (result.saved > 0 && result.failed > 0) {
      showNotification(
        `⚠️ Saved ${result.saved} file(s), ${result.failed} failed`, 
        'warning'
      );
      console.error('Save All errors:', result.errors);
    } else if (result.failed > 0) {
      showNotification(`❌ Failed to save ${result.failed} file(s)`, 'error');
      console.error('Save All errors:', result.errors);
    } else {
      showNotification('ℹ️ No files were saved', 'info');
    }
    
    // Log detailed results
    console.log('💾 Save All complete:', {
      saved: result.saved,
      failed: result.failed,
      errors: result.errors
    });
    
  } catch (error) {
    console.error('❌ Error saving all files:', error);
    showNotification('❌ Failed to save all files', 'error');
    
    // Remove loading indicator if still present
    const loading = document.getElementById('upload-loading-overlay');
    if (loading) {
      document.body.removeChild(loading);
    }
  }
}

// ============================================================================
// END OF FIXED SAVE ALL ACTION
// ============================================================================

// ✅ NEW: Warn before closing if files are modified
async function closeFileAction(): Promise<void> {
  console.log('🗑️ Closing file...');
  try {
    const activeTab = tabManager.getActiveTab();
    if (activeTab) {
      // Check if file is modified
      if (tabManager.isTabModified(activeTab.id)) {
        const shouldSave = confirm(`"${activeTab.name}" has unsaved changes. Save before closing?`);
        if (shouldSave) {
          await saveFileAction();
        }
      }
      
      tabManager.closeTab(activeTab.id);
      showNotification('File closed successfully', 'success');
    } else {
      showNotification('No file is currently open', 'error');
    }
  } catch (error) {
    console.error('❌ Error closing file:', error);
    showNotification('Failed to close file', 'error');
  }
}

// ✅ Helper function to show notifications
function showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
    color: white;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}


async function closeProjectAction(): Promise<void> {
  console.log('🔒 Closing project...');
  try {
    // ✅ FIX 1: Reset filter FIRST, before clearing DOM
    const robustFilter = (window as any).robustFilter;
    if (robustFilter?.reset) {
      console.log('🔄 Resetting filter to default state...');
      robustFilter.reset();
    } else {
      console.warn('⚠️ robustFilter.reset() not available!');
    }
    
    // Small delay to ensure reset completes
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // ✅ FIX 2: Clear file tree with simple message (NO BUTTONS)
    const fileTree = document.querySelector('.file-tree');
    if (fileTree) {
      fileTree.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: #888;
          font-size: 13px;
          text-align: center;
          padding: 20px;
        ">
          <div style="margin-bottom: 8px;">No folder opened</div>
          <div style="font-size: 11px; color: #666;">
            Use File → Open Folder to get started
          </div>
        </div>
      `;
    }
    
    // ✅ FIX 3: Also update FILES tab content if exists
    const filesContent = document.getElementById('files-content');
    if (filesContent) {
      filesContent.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
          color: #888;
          min-height: 300px;
        ">
          <div style="font-size: 14px; margin-bottom: 8px;">No folder opened</div>
          <div style="font-size: 11px; color: #666; opacity: 0.8;">
            Use File → Open Folder to get started
          </div>
        </div>
      `;
    }
    
    // Clear project state
    currentProjectPath = '';
    document.title = 'AI Code IDE';
    
    // Clear localStorage
    if (typeof(Storage) !== "undefined") {
      localStorage.removeItem('currentProject');
      localStorage.removeItem('currentProjectPath');
      localStorage.removeItem('fileTreeState');
      localStorage.removeItem('openFolder');
    }
    
    // ✅ FIX 4: Force filter panel to show and reset (if it exists)
    setTimeout(() => {
      const filterPanel = document.getElementById('explorer-filter-controls-persistent');
      if (filterPanel) {
        filterPanel.style.display = 'block';
        console.log('✅ Filter panel visibility restored');
      }
      
      // Double-check filter state
      const robustFilter = (window as any).robustFilter;
      if (robustFilter) {
        console.log('🔍 Final filter state check:', {
          viewMode: robustFilter.viewMode || 'unknown',
          searchFilter: robustFilter.searchFilter || 'unknown',
          showHiddenFiles: robustFilter.showHiddenFiles || 'unknown'
        });
      }
    }, 300);
    
    showNotification('Project closed', 'success');
    document.dispatchEvent(new CustomEvent('menu-close-project'));
    
    console.log('✅ Project closed successfully');
    
  } catch (error) {
    console.error('❌ Error closing project:', error);
    showNotification('Failed to close project', 'error');
  }
}

async function exitAction(): Promise<void> {
  console.log('Exiting application...');
  try {
    const confirmed = confirm('Are you sure you want to exit?');
    if (confirmed) {
      if (isTauriAvailable()) {
        await invoke('close_app');
      } else {
        window.close();
      }
    }
  } catch (error) {
    console.error('Error exiting application:', error);
    window.close();
  }
}

async function createNewFileFallback(): Promise<void> {
  console.log('Using fallback new file creation...');
  const fileName = prompt('Enter file name (with extension):');
  if (fileName && fileName.trim()) {
    const tabManager = (window as any).tabManager;
    if (tabManager && typeof tabManager.addTab === 'function') {
      tabManager.addTab(fileName, '');
      console.log(`New file tab created: ${fileName}`);
    } else {
      const editor = (window as any).monaco?.editor?.getEditors()?.[0];
      if (editor) {
        const newModel = (window as any).monaco.editor.createModel('', 'typescript');
        editor.setModel(newModel);
        document.title = `${fileName} - AI Code IDE`;
        console.log(`New file loaded in editor: ${fileName}`);
      }
    }
  }
}

// ============================================================================
// 🔷 GIT MENU SETUP - Complete Git Integration Menu
// ============================================================================

/**
 * Setup Git Menu - Source Control features
 * ✅ Singleton pattern to prevent duplicate menus
 */
export function setupGitMenu(): void {
  // ✅ SINGLETON: Prevent multiple initializations
  if (gitMenuInitialized) {
    console.log('Git menu already initialized, skipping...');
    return;
  }
  
  console.log('🔷 Setting up Git menu...');
  
  const menuBar = document.querySelector('.menu-bar');
  if (!menuBar) {
    console.error('Menu bar not found for Git menu');
    return;
  }
  
  // Check if Git menu item already exists
  const existingGitMenuItem = menuBar.querySelector('[data-menu="git"]');
  if (existingGitMenuItem) {
    console.log('Git menu item already exists, skipping creation');
    gitMenuInitialized = true;
    return;
  }
  
  // Check if submenu already exists
  const existingSubmenu = document.getElementById('git-submenu');
  if (existingSubmenu) {
    console.log('Git submenu already exists, skipping creation');
    gitMenuInitialized = true;
    return;
  }
  
  // ✅ CLEANUP: Remove any stale Git submenus
  document.querySelectorAll('#git-submenu').forEach(el => el.remove());
  document.querySelectorAll('.menu-submenu[data-menu-type="git"]').forEach(el => el.remove());
  
  // Create Git menu item
  const gitMenuItem = document.createElement('div');
  gitMenuItem.className = 'menu-item';
  gitMenuItem.setAttribute('data-menu', 'git');
  gitMenuItem.textContent = 'Git';
  gitMenuItem.style.cssText = `
    padding: 8px 16px;
    cursor: pointer;
    color: #cccccc;
    font-size: 13px;
    user-select: none;
    border-radius: 3px;
    transition: background-color 0.2s;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
  
  // Find position (after View menu)
  const viewMenu = menuBar.querySelector('[data-menu="view"]');
  const projectMenu = menuBar.querySelector('[data-menu="project"], #project-menu');
  
  if (viewMenu && viewMenu.nextSibling) {
    menuBar.insertBefore(gitMenuItem, viewMenu.nextSibling);
  } else if (projectMenu && projectMenu.nextSibling) {
    menuBar.insertBefore(gitMenuItem, projectMenu.nextSibling);
  } else {
    menuBar.appendChild(gitMenuItem);
  }
  
  // Create Git submenu
  const gitSubmenu = document.createElement('div');
  gitSubmenu.className = 'menu-submenu git-submenu';
  gitSubmenu.id = 'git-submenu';
  gitSubmenu.setAttribute('data-menu-type', 'git');
  gitSubmenu.style.cssText = `
    position: fixed;
    display: none;
    background: #2d2d2d;
    background-color: #2d2d2d;
    border: 1px solid #464647;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    z-index: 999999;
    min-width: 280px;
    border-radius: 6px;
    padding: 6px 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    isolation: isolate;
  `;
  
  // Git menu items
  const gitMenuItems = [
    { type: 'header', label: 'SOURCE CONTROL' },
    { label: 'Source Control Panel', shortcut: 'Ctrl+Shift+G', action: 'git-panel', icon: '🔀' },
    { label: 'Virtualized Git Panel', shortcut: '', action: 'git-panel-virtualized', icon: '🚀' },
    { type: 'separator' },
    { type: 'header', label: 'ADVANCED FEATURES' },
    { label: 'Commit History...', shortcut: 'Ctrl+Shift+H', action: 'git-history', icon: '📜' },
    { label: 'Branch Manager...', shortcut: '', action: 'git-branches', icon: '⎇' },
    { label: 'Diff Viewer...', shortcut: '', action: 'git-diff', icon: '📄' },
    { type: 'separator' },
    { type: 'header', label: 'STASH' },
    { label: 'Stash Manager...', shortcut: '', action: 'git-stash-manager', icon: '📦' },
    { label: 'Quick Stash', shortcut: 'Ctrl+Alt+S', action: 'git-stash-quick', icon: '💾' },
    { label: 'Pop Stash', shortcut: 'Ctrl+Alt+P', action: 'git-stash-pop', icon: '📤' },
    { type: 'separator' },
    { type: 'header', label: 'TOOLS' },
    { label: 'Resolve Conflicts...', shortcut: '', action: 'git-merge-conflicts', icon: '⚡' },
    { label: 'Git Blame', shortcut: '', action: 'git-blame', icon: '👤' },
    { type: 'separator' },
    { label: 'Open TortoiseGit', shortcut: '', action: 'git-tortoise', icon: '🐢' },
  ];
  
  // Build submenu items
  gitMenuItems.forEach(item => {
    if (item.type === 'separator') {
      const separator = document.createElement('div');
      separator.style.cssText = `
        height: 1px;
        background: #464647;
        margin: 6px 12px;
      `;
      gitSubmenu.appendChild(separator);
    } else if (item.type === 'header') {
      const header = document.createElement('div');
      header.style.cssText = `
        padding: 8px 16px 4px;
        color: #969696;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      `;
      header.textContent = item.label || '';
      gitSubmenu.appendChild(header);
    } else {
      const menuItem = document.createElement('div');
      menuItem.className = 'submenu-item';
      menuItem.setAttribute('data-action', item.action || '');
      menuItem.style.cssText = `
        padding: 10px 16px;
        cursor: pointer;
        color: #cccccc;
        background-color: #2d2d2d;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.15s ease;
        white-space: nowrap;
      `;
      
      const leftPart = document.createElement('span');
      leftPart.style.cssText = 'display: flex; align-items: center; gap: 10px;';
      
      if (item.icon) {
        const iconSpan = document.createElement('span');
        iconSpan.textContent = item.icon;
        iconSpan.style.cssText = 'font-size: 14px; width: 20px; text-align: center;';
        leftPart.appendChild(iconSpan);
      }
      
      const labelSpan = document.createElement('span');
      labelSpan.textContent = item.label || '';
      leftPart.appendChild(labelSpan);
      
      menuItem.appendChild(leftPart);
      
      if (item.shortcut) {
        const shortcutSpan = document.createElement('span');
        shortcutSpan.textContent = item.shortcut;
        shortcutSpan.style.cssText = `
          color: #888888;
          font-size: 11px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          margin-left: 24px;
        `;
        menuItem.appendChild(shortcutSpan);
      }
      
      // Hover effects
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.backgroundColor = '#094771';
        menuItem.style.color = '#ffffff';
      });
      
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.backgroundColor = '#2d2d2d';
        menuItem.style.color = '#cccccc';
      });
      
      // Click handler
      menuItem.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`Git menu action: ${item.action}`);
        gitSubmenu.style.display = 'none';
        handleGitMenuAction(item.action || '');
      });
      
      gitSubmenu.appendChild(menuItem);
    }
  });
  
  document.body.appendChild(gitSubmenu);
  
  // Show/hide submenu on click
  gitMenuItem.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Git menu clicked');
    
    // Hide OLD menu-dropdown that causes shadow
    document.querySelectorAll('.menu-dropdown').forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
    
    // Remove duplicate git submenus
    const allGitSubmenus = document.querySelectorAll('#git-submenu');
    if (allGitSubmenus.length > 1) {
      allGitSubmenus.forEach(menu => {
        if (menu !== gitSubmenu) {
          menu.remove();
        }
      });
    }
    
    // Hide all other menus
    document.querySelectorAll('.menu-submenu').forEach(menu => {
      if (menu !== gitSubmenu) {
        (menu as HTMLElement).style.display = 'none';
      }
    });
    
    if (gitSubmenu.style.display === 'none' || !gitSubmenu.style.display) {
      const rect = gitMenuItem.getBoundingClientRect();
      gitSubmenu.style.top = `${rect.bottom + 2}px`;
      gitSubmenu.style.left = `${rect.left}px`;
      gitSubmenu.style.display = 'block';
    } else {
      gitSubmenu.style.display = 'none';
    }
  });
  
  // Hover effects for menu item
  gitMenuItem.addEventListener('mouseenter', () => {
    gitMenuItem.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  });
  
  gitMenuItem.addEventListener('mouseleave', () => {
    gitMenuItem.style.backgroundColor = 'transparent';
  });
  
  // ✅ Mark as initialized
  gitMenuInitialized = true;
  console.log('🔷 Git menu setup complete');
}

/**
 * Handle Git Menu Actions
 */
async function handleGitMenuAction(action: string): Promise<void> {
  console.log(`🔷 Handling Git menu action: ${action}`);
  
  const projectPath = (window as any).currentProjectPath || 
                      (window as any).currentFolderPath ||
                      localStorage.getItem('ide_last_project_path') || '';
  
  if (!projectPath && action !== 'git-tortoise') {
    showNotification('Please open a project folder first', 'error');
    return;
  }
  
  try {
    switch (action) {
      case 'git-panel':
        if ((window as any).showGitPanel) {
          (window as any).showGitPanel(projectPath);
        } else if ((window as any).gitUIEnhanced?.show) {
          (window as any).gitUIEnhanced.show(projectPath);
        } else {
          showNotification('Git panel not available', 'error');
        }
        break;
        
      case 'git-panel-virtualized':
        if ((window as any).showVirtualizedGitPanel) {
          (window as any).showVirtualizedGitPanel(undefined, projectPath);
        } else {
          showNotification('Virtualized Git panel not available', 'error');
        }
        break;
        
      case 'git-history':
        if ((window as any).showGitHistory) {
          (window as any).showGitHistory();
        } else if ((window as any).gitHistoryViewer?.show) {
          (window as any).gitHistoryViewer.show({ repoPath: projectPath });
        } else {
          showNotification('Git history viewer not available', 'error');
        }
        break;
        
      case 'git-branches':
        if ((window as any).showBranchManager) {
          (window as any).showBranchManager();
        } else if ((window as any).gitBranchManager?.show) {
          (window as any).gitBranchManager.show({ repoPath: projectPath });
        } else {
          showNotification('Branch manager not available', 'error');
        }
        break;
        
case 'git-diff':
  // Call showDiffViewer - it shows file picker if no file is open
  if ((window as any).showDiffViewer) {
    await (window as any).showDiffViewer();
  } else if ((window as any).gitDiffViewer?.showFileDiff) {
    const currentTab = (window as any).tabManager?.getActiveTab?.();
    if (currentTab?.path) {
      (window as any).gitDiffViewer.showFileDiff(projectPath, currentTab.path, false);
    } else {
      showNotification('No file selected for diff', 'info');
    }
  } else {
    showNotification('Diff viewer not available', 'error');
  }
  break;
        
      case 'git-stash-manager':
        if ((window as any).showStashManager) {
          (window as any).showStashManager();
        } else if ((window as any).gitStashManager?.show) {
          (window as any).gitStashManager.show({ repoPath: projectPath });
        } else {
          showNotification('Stash manager not available', 'error');
        }
        break;
        
      case 'git-stash-quick':
        if ((window as any).quickStash) {
          await (window as any).quickStash();
          showNotification('Changes stashed successfully', 'success');
        } else if ((window as any).gitStashManager?.quickStash) {
          await (window as any).gitStashManager.quickStash(projectPath);
          showNotification('Changes stashed successfully', 'success');
        } else {
          showNotification('Quick stash not available', 'error');
        }
        break;
        
      case 'git-stash-pop':
        if ((window as any).quickPop) {
          await (window as any).quickPop();
          showNotification('Stash applied successfully', 'success');
        } else if ((window as any).gitStashManager?.quickPop) {
          await (window as any).gitStashManager.quickPop(projectPath);
          showNotification('Stash applied successfully', 'success');
        } else {
          showNotification('Pop stash not available', 'error');
        }
        break;
        
      case 'git-merge-conflicts':
        if ((window as any).showMergeConflicts) {
          (window as any).showMergeConflicts();
        } else if ((window as any).gitMergeConflictManager?.show) {
          (window as any).gitMergeConflictManager.show({ repoPath: projectPath });
        } else {
          showNotification('Merge conflict resolver not available', 'error');
        }
        break;
        
case 'git-blame':
  // Call showGitBlame - it shows file picker if no file is open
  if ((window as any).showGitBlame) {
    await (window as any).showGitBlame();
  } else if ((window as any).gitBlameManager?.showBlameDialog) {
    const activeTab = (window as any).tabManager?.getActiveTab?.();
    if (activeTab?.path) {
      (window as any).gitBlameManager.showBlameDialog(projectPath, activeTab.path);
    } else {
      showNotification('No file selected for blame', 'info');
    }
  } else {
    showNotification('Git blame not available', 'error');
  }
  break;
        
      case 'git-tortoise':
        try {
          await invoke('open_tortoise_git', { path: projectPath, command: 'log' });
        } catch (error) {
          showNotification('TortoiseGit not available or not installed', 'error');
        }
        break;
        
      default:
        console.log(`Unknown Git menu action: ${action}`);
    }
  } catch (error) {
    console.error(`Error handling Git menu action ${action}:`, error);
    showNotification(`Error: ${action} failed`, 'error');
  }
}

// Keyboard shortcuts
export function setupEnhancedKeyboardShortcuts(): void {
  console.log('Setting up enhanced keyboard shortcuts...');
  
  document.addEventListener('keydown', (e) => {
    // Ctrl+B - Toggle Explorer
    if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !e.shiftKey) {
      e.preventDefault();
      const explorerPanel = document.querySelector('.explorer-panel') as HTMLElement;
      if (explorerPanel) {
        if (explorerPanel.style.display === 'none' || explorerPanel.classList.contains('force-hidden')) {
          explorerPanel.style.display = 'flex';
          explorerPanel.classList.remove('force-hidden');
          localStorage.setItem('explorerHidden', 'false');
        } else {
          explorerPanel.style.display = 'none';
          explorerPanel.classList.add('force-hidden');
          localStorage.setItem('explorerHidden', 'true');
        }
      }
    }
    
    // File menu shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      handleFileMenuAction('file-new');
    }
    
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
      e.preventDefault();
      handleFileMenuAction('file-new-folder');
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'o' && !e.shiftKey) {
      e.preventDefault();
      debounceAction('file-open', () => {
        handleFileMenuAction('file-open');
      });
    }
    
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'O') {
      e.preventDefault();
      handleFileMenuAction('file-open-folder');
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      handleFileMenuAction('file-save');
    }
    
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      handleFileMenuAction('file-save-as');
    }
    
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 's') {
      e.preventDefault();
      handleFileMenuAction('file-save-all');
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'w' && !e.shiftKey) {
      e.preventDefault();
      handleFileMenuAction('file-close');
    }
    
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'W') {
      e.preventDefault();
      handleFileMenuAction('file-close-project');
    }
    
    // View menu shortcuts
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      handleViewMenuAction('toggleExplorer');
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === '`') {
      e.preventDefault();
      handleViewMenuAction('toggleTerminal');
    }
    
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      handleViewMenuAction('toggleAIAssistant');
    }
    
    // Autonomous shortcuts
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'a') {
      e.preventDefault();
      toggleAutonomousMode();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'p') {
      e.preventDefault();
      processCurrentFileAutonomous();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 't') {
      e.preventDefault();
      testAutonomousSystem();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'x') {
      e.preventDefault();
      emergencyStopTyping();
    }
    
    // 🔷 Git shortcuts
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') {
      e.preventDefault();
      handleGitMenuAction('git-panel');
    }
    
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
      e.preventDefault();
      handleGitMenuAction('git-history');
    }
    
    // Note: Ctrl+Alt+S conflicts with file-save-all, using just for stash when not modified
    // Ctrl+Alt+P conflicts with processCurrentFileAutonomous
    // Alternative: Use different shortcuts or check context
    
    if (e.altKey && e.key === 'c') {
      e.preventDefault();
      toggleCameraPanel();
    }
  });
  
  console.log('Enhanced keyboard shortcuts initialized');
  console.log('🔷 Git shortcuts: Ctrl+Shift+G (panel), Ctrl+Shift+H (history)');
}

// ============================================================================
// v4.0: Convert Tauri structure to FileNode format for IDE-style renderer
// ============================================================================
function convertToFileNodesForMenu(files: any[], parentPath: string = ''): any[] {
  if (!files) return [];
  
  return files
    .filter(file => {
      // Skip folders that should be completely hidden
      if (file.is_directory && SKIP_FOLDERS_COMPLETELY.has(file.name)) {
        return false;
      }
      return true;
    })
    .map(file => {
      const fullPath = parentPath ? `${parentPath}\\${file.name}` : file.name;
      
      const node: any = {
        name: file.name,
        path: fullPath,
        isDirectory: file.is_directory || false,
        size: file.size || 0,
      };
      
      // Handle children recursively (but skip no-recurse folders)
      if (node.isDirectory && file.children && Array.isArray(file.children)) {
        // Check if we should recurse into this folder
        if (!SHOW_BUT_NO_RECURSE.has(file.name)) {
          node.children = convertToFileNodesForMenu(file.children, fullPath);
        } else {
          // Show folder but don't expand children
          node.children = [];
        }
      }
      
      return node;
    });
}

// Helper functions
function updateFileExplorerWithProject(projectPath: string, files: any): void {
  console.log('📂 [updateFileExplorerWithProject] Called with:', {
    projectPath,
    filesName: files?.name,
    hasChildren: !!files?.children,
    childCount: files?.children?.length || 0
  });
  
  // ✅ Always ensure .file-tree exists for consistency
  let fileTree = document.querySelector('.file-tree') as HTMLElement;
  
  if (!fileTree) {
    console.log('📂 .file-tree not found, creating it...');
    
    // Find the container (#files-content or .tab-content.active)
    const container = document.getElementById('files-content') || 
                      document.querySelector('.tab-content.active');
    
    if (!container) {
      console.error('❌ Could not find container for file tree!');
      showNotification('Error: File explorer container not found', 'error');
      return;
    }
    
    // Clear container and create .file-tree inside it
    container.innerHTML = '';
    
    fileTree = document.createElement('div');
    fileTree.className = 'file-tree';
    fileTree.id = 'file-tree';
    container.appendChild(fileTree);
    
    console.log('✅ Created .file-tree inside', container.id || container.className);
  }
  
  console.log('✅ File tree container found:', fileTree);
  
  // ✅ Reset filters FIRST
  const robustFilter = (window as any).robustFilter;
  if (robustFilter?.reset) {
    console.log('🔄 Resetting filter for new project...');
    robustFilter.reset();
  }
  
  // Clear existing content - IDE renderer will create everything fresh
  fileTree.innerHTML = '';
  console.log('🧹 Cleared existing content');
  
  // ✅ v4.0: Store project name for header
  const projectName = files.name || 'Project';
  
  // Update document title
  document.title = `${projectName} - AI Code IDE`;
  
  console.log('📁 Rendering file tree with', files.children?.length || 0, 'items');
  
  // ✅ v4.0: Use new IDE-style renderer
  if (files.children && files.children.length > 0) {
    // Convert Tauri structure to FileNode format
    const fileNodes = convertToFileNodesForMenu(files.children, projectPath);
    
    // Store globally for debugging and refresh
    (window as any).__currentProjectFiles = fileNodes;
    
    // Use IDE-style renderer
    renderFileTreeIDE(fileTree, fileNodes);
    console.log('✅ [v4.0] IDE-style file tree rendered!');
  } else {
    console.warn('⚠️ No children to render!');
    fileTree.innerHTML += `
      <div style="padding: 20px; text-align: center; color: #888;">
        No files found in this folder
      </div>
    `;
  }
  
  // NOTE: fileContainer no longer used - IDE renderer handles everything
  // fileTree.appendChild(fileContainer);
  console.log('✅ File tree rendering completed');
  
  // Update document title
  document.title = `${projectName.textContent} - AI Code IDE`;
  
  // Count rendered items
  setTimeout(() => {
    const allItems = fileTree.querySelectorAll('.tree-row, .file-item, .directory');
    console.log(`📊 Rendered ${allItems.length} file/folder items in DOM`);
    
    // Apply filters if needed
    if (robustFilter?.applyFilters) {
      console.log('🔍 Applying filters to rendered files...');
      robustFilter.applyFilters();
      
      // Check filter results
      setTimeout(() => {
        const hiddenItems = fileTree.querySelectorAll('.filter-hidden');
        console.log(`📊 Filter results: ${allItems.length - hiddenItems.length} visible, ${hiddenItems.length} hidden`);
      }, 100);
    }
  }, 200);
}

// ============================================================================
// ⚡ SMART renderFileTree: Shows .git/.svn but doesn't recurse into them
// ============================================================================
function renderFileTree(container: HTMLElement, files: any[], parentPath: string = ''): void {
  // Only log summary, not each item
  const totalCount = files.length;
  let skippedCount = 0;
  let renderedCount = 0;
  let noRecurseCount = 0;
  
  if (!files || files.length === 0) {
    console.warn('⚠️ No files to render!');
    return;
  }
  
  files.forEach((file, index) => {
    // ========================================================================
    // ⚡ PERFORMANCE: Completely skip heavy folders (node_modules, etc.)
    // ========================================================================
    if (file.is_directory && SKIP_FOLDERS_COMPLETELY.has(file.name)) {
      skippedCount++;
      return; // Skip this folder entirely - don't render it or its children
    }
    // ========================================================================
    
    renderedCount++;
    
    const fileElement = document.createElement('div');
    fileElement.className = 'file-item';
    
    const fullPath = parentPath ? `${parentPath}\\${file.name}` : file.name;
    
    // ✅ ADD THESE DATA ATTRIBUTES - Critical for filters
    fileElement.setAttribute('data-path', fullPath);
    fileElement.setAttribute('data-name', file.name);
    fileElement.setAttribute('data-file-name', file.name);
    fileElement.setAttribute('data-is-directory', file.is_directory ? 'true' : 'false');
    
    if (file.is_directory) {
      fileElement.classList.add('folder-item');
      fileElement.classList.add('directory');
    }
    
    fileElement.style.cssText = `
      padding: 4px 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      background-color: transparent;
    `;
    
    // Left side: icon + name
    const leftSide = document.createElement('div');
    leftSide.style.cssText = `
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
    `;
    
    // ✅ Special icons for version control folders
    const icon = document.createElement('span');
    icon.style.marginRight = '6px';
    icon.style.flexShrink = '0';
    
    if (file.name === '.git') {
      icon.textContent = '🔀'; // Git icon
    } else if (file.name === '.svn') {
      icon.textContent = '📦'; // SVN icon
    } else if (file.is_directory) {
      icon.textContent = '📁';
    } else {
      icon.textContent = '📄';
    }
    
    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = file.name;
    name.style.cssText = `
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    
    // ✅ Style version control folders differently
    if (file.name === '.git' || file.name === '.svn' || file.name === '.hg') {
      name.style.color = '#888';
      name.style.fontStyle = 'italic';
    }
    
    leftSide.appendChild(icon);
    leftSide.appendChild(name);
    fileElement.appendChild(leftSide);
    
    // Right side: file size (only for files, not folders)
    if (!file.is_directory && file.size !== undefined) {
      const sizeSpan = document.createElement('span');
      sizeSpan.className = 'file-size';
      sizeSpan.textContent = formatFileSize(file.size);
      sizeSpan.style.cssText = `
        font-size: 10px;
        color: #888;
        margin-left: 15px;
        flex-shrink: 0;
        font-family: 'Courier New', monospace;
      `;
      fileElement.appendChild(sizeSpan);
    }
    
    // Click handler for files
    if (!file.is_directory) {
      fileElement.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        console.log(`📄 Opening file: ${fullPath}`);
        
        try {
          const content = await readFile(fullPath);
          if (content !== null) {
            const tabManager = (window as any).tabManager;
            if (tabManager && typeof tabManager.addTab === 'function') {
              tabManager.addTab(fullPath, content);
            } else {
              loadContentIntoMonacoEditor(content, file.name);
            }
            console.log(`✅ File opened: ${file.name}`);
          } else {
            console.error(`❌ File content is null: ${fullPath}`);
            showNotification(`Could not read file: ${file.name}`, 'error');
          }
        } catch (error: any) {
          console.error(`❌ Error opening file ${fullPath}:`, error);
          showNotification(`Error opening file: ${error.message}`, 'error');
        }
      });
      
      // Hover effects for files
      fileElement.addEventListener('mouseover', () => {
        fileElement.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      });
      
      fileElement.addEventListener('mouseout', () => {
        fileElement.style.backgroundColor = 'transparent';
      });
    } else {
      // Hover effects for folders
      fileElement.addEventListener('mouseover', () => {
        fileElement.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
      });
      
      fileElement.addEventListener('mouseout', () => {
        fileElement.style.backgroundColor = 'transparent';
      });
    }
    
    // Append file element to container
    container.appendChild(fileElement);
    
    // ========================================================================
    // ⚡ SMART RECURSION: Show folder but DON'T recurse into .git, .svn, etc.
    // ========================================================================
    if (file.is_directory && file.children && file.children.length > 0) {
      // Check if this folder should NOT be recursed into
      if (SHOW_BUT_NO_RECURSE.has(file.name)) {
        noRecurseCount++;
        // Don't render children - folder is visible but collapsed with no children
        // This saves thousands of DOM elements for .git folders
      } else {
        // Normal folder - recurse into it
        const childContainer = document.createElement('div');
        childContainer.style.marginLeft = '16px';
        childContainer.style.paddingLeft = '0';
        renderFileTree(childContainer, file.children, fullPath);
        container.appendChild(childContainer);
      }
    }
    // ========================================================================
  });
  
  // Log summary instead of each item
  if (skippedCount > 0 || noRecurseCount > 0) {
    console.log(`✅ [renderFileTree] Rendered ${renderedCount}/${totalCount} items (skipped ${skippedCount} heavy folders, ${noRecurseCount} shown but not expanded)`);
  } else {
    console.log(`✅ [renderFileTree] Finished rendering ${renderedCount} items`);
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0.0 KB';
  
  // Always show KB for files under 1 MB
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }
  
  // Show MB for larger files
  if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  
  // Show GB for very large files
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}


function loadContentIntoMonacoEditor(content: string, fileName: string): void {
  try {
    const editors = (window as any).monaco?.editor?.getEditors() || [];
    if (editors.length === 0) {
      console.warn('No Monaco editors found');
      return;
    }

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

    const language = detectLanguageFromFileName(fileName) || 'typescript';
    const newModel = (window as any).monaco.editor.createModel(content, language);
    mainEditor.setModel(newModel);
    mainEditor.focus();
    
    document.title = `${fileName} - AI Code IDE`;
    console.log(`Content loaded into Monaco editor: ${fileName}`);
    
  } catch (error) {
    console.error('Error loading content into Monaco editor:', error);
  }
}

function detectLanguageFromFileName(fileName: string): string | null {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'rs': 'rust',
    'go': 'go',
    'sql': 'sql'
  };
  
  return extension ? languageMap[extension] || null : null;
}

function hideAllSubmenus(): void {
  const submenus = document.querySelectorAll('.menu-submenu');
  submenus.forEach(submenu => {
    (submenu as HTMLElement).style.display = 'none';
  });
  
  // ✅ CRITICAL: Remove ALL duplicate menus (keep only one of each ID)
  const menuIds = ['file-submenu-complete', 'project-submenu', 'view-submenu', 'git-submenu'];
  menuIds.forEach(id => {
    const menus = document.querySelectorAll(`#${id}`);
    if (menus.length > 1) {
      console.warn(`⚠️ Removing ${menus.length - 1} duplicate ${id} menus`);
      // Keep only the LAST one (most recently created)
      for (let i = 0; i < menus.length - 1; i++) {
        menus[i].remove();
      }
    }
  });
  
  // ✅ Also remove any orphaned submenus without proper IDs
  document.querySelectorAll('.menu-submenu:not([id])').forEach(el => {
    console.warn('⚠️ Removing orphaned submenu without ID');
    el.remove();
  });
}

/**
 * Ensure only one menu of each type exists - call before showing any menu
 */
function ensureSingleMenu(): void {
  // Remove duplicates aggressively
  const seenIds = new Set<string>();
  document.querySelectorAll('.menu-submenu[id]').forEach(menu => {
    const id = menu.id;
    if (seenIds.has(id)) {
      console.warn(`⚠️ Removing duplicate menu: ${id}`);
      menu.remove();
    } else {
      seenIds.add(id);
    }
  });
}

export function setupGlobalMenuHandler(): void {
  // ✅ Inject global menu styles to prevent ghost shadows
  if (!document.getElementById('menu-system-global-styles')) {
    const style = document.createElement('style');
    style.id = 'menu-system-global-styles';
    style.textContent = `
      /* ✅ CRITICAL: Hide OLD menu-dropdown when new menus are used */
      .menu-dropdown {
        display: none !important;
      }
      
      /* ✅ FIX: Ensure menus are above ALL other elements */
      .menu-submenu {
        background: #2d2d2d !important;
        background-color: #2d2d2d !important;
        border: 1px solid #464647 !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5) !important;
        z-index: 999999 !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        opacity: 1 !important;
        isolation: isolate !important;
      }
      
      /* ✅ CRITICAL: Menu items MUST have solid backgrounds */
      .menu-submenu .submenu-item,
      .menu-submenu > div {
        background: #2d2d2d !important;
        background-color: #2d2d2d !important;
        box-shadow: none !important;
        backdrop-filter: none !important;
      }
      
      .menu-submenu .submenu-item:hover,
      .menu-submenu > div:hover {
        background: #094771 !important;
        background-color: #094771 !important;
      }
      
      /* Separators should keep their color */
      .menu-submenu div[style*="height: 1px"] {
        background: #464647 !important;
        background-color: #464647 !important;
      }
      
      /* Remove any pseudo-element shadows */
      .menu-submenu::before,
      .menu-submenu::after {
        display: none !important;
        content: none !important;
        box-shadow: none !important;
      }
      
      /* Hide any improperly created menus */
      .menu-submenu:empty {
        display: none !important;
      }
      
      /* Ensure only visible menus show */
      .menu-submenu[style*="display: none"] {
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  // ✅ Initial cleanup of any duplicate menus
  ensureSingleMenu();
  
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.menu-bar') && !target.closest('.menu-submenu')) {
      hideAllSubmenus();
    }
  });
}
// Listen for 'project-opened' events from both Open Folder and AI File Creator
document.addEventListener('project-opened', (e: CustomEvent) => {
  console.log('📂 [menuSystem] project-opened event received:', e.detail);
  
  const { path, files } = e.detail;
  
  if (!path || !files) {
    console.warn('⚠️ [menuSystem] Invalid project-opened event data');
    return;
  }
  
  // Update file explorer with the new/refreshed file tree
  updateFileExplorerWithProject(path, files);
  
  console.log('✅ [menuSystem] File explorer updated via event listener');
});
// Listen for folder structure updates and render them
document.addEventListener('folder-structure-loaded', (e: any) => {
  console.log('📦 Received folder-structure-loaded event');
  if (e.detail) {
    const projectPath = localStorage.getItem('currentProjectPath') || '';
    if (projectPath) {
      console.log('🔄 Re-rendering file tree with menuSystem...');
      updateFileExplorerWithProject(projectPath, e.detail);
    }
  }
});

// ✅ Export updateFileExplorerWithProject globally for project persistence
(window as any).updateFileExplorerWithProject = updateFileExplorerWithProject;

console.log('✅ MenuSystem event listeners registered');

