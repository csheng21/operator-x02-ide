// src/ide/fileExplorer/fastContextMenu.ts
// ============================================================================
// HIGH-PERFORMANCE CONTEXT MENU - Zero Lag Implementation
// ============================================================================
// Key optimizations:
// 1. Pre-cached menu template (DOM elements created once, reused)
// 2. CSS-only animations with will-change hints
// 3. Event delegation (single listener, not per-item)
// 4. Synchronous positioning (no requestAnimationFrame delay)
// 5. No MutationObservers
// 6. Minimal DOM manipulation on show

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPES
// ============================================================================
interface MenuAction {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  action: (path: string, isDir: boolean) => void;
  showFor?: 'file' | 'folder' | 'both';
  className?: string;
  children?: MenuAction[];
}

// ============================================================================
// SINGLETON MENU CACHE
// ============================================================================
let menuElement: HTMLElement | null = null;
let submenus: Map<string, HTMLElement> = new Map();
let currentPath: string = '';
let currentIsDirectory: boolean = false;
let isInitialized: boolean = false;
let activeSubmenu: HTMLElement | null = null;

// ============================================================================
// ICONS (pre-defined, no runtime generation)
// ============================================================================
const ICONS = {
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  newFile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>',
  newFolder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>',
  terminal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4,17 10,11 4,5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
  reveal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  rename: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  duplicate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16V4a2 2 0 0 1 2-2h12"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>',
  ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/><path d="M12 22V12"/><path d="M2 7l10 5 10-5"/></svg>',
};

// ============================================================================
// MENU ACTIONS CONFIGURATION
// ============================================================================
const MENU_ACTIONS: MenuAction[] = [
  {
    id: 'open',
    label: 'Open File',
    icon: ICONS.open,
    shortcut: 'Enter',
    showFor: 'file',
    className: 'primary',
    action: (path) => handleFileOpen(path)
  },
  {
    id: 'openFolder',
    label: 'Open Folder',
    icon: ICONS.open,
    shortcut: 'Enter',
    showFor: 'folder',
    className: 'primary',
    action: (path) => toggleFolder(path)
  },
  { id: 'sep1', label: '', icon: '', action: () => {}, showFor: 'both' },
  {
    id: 'create',
    label: 'Create',
    icon: ICONS.newFile,
    showFor: 'both',
    children: [
      { id: 'newFile', label: 'New File', icon: ICONS.newFile, shortcut: 'Ctrl+N', action: (path, isDir) => showCreateDialog('file', isDir ? path : getParentPath(path)), showFor: 'both' },
      { id: 'newFolder', label: 'New Folder', icon: ICONS.newFolder, shortcut: 'Ctrl+Shift+N', action: (path, isDir) => showCreateDialog('folder', isDir ? path : getParentPath(path)), showFor: 'both' },
      { id: 'duplicate', label: 'Duplicate', icon: ICONS.duplicate, action: (path) => duplicateItem(path), showFor: 'file' }
    ]
  },
  {
    id: 'navigate',
    label: 'Navigate',
    icon: ICONS.reveal,
    showFor: 'both',
    children: [
      { id: 'terminal', label: 'Open Terminal Here', icon: ICONS.terminal, action: (path, isDir) => openTerminal(isDir ? path : getParentPath(path)), showFor: 'both' },
      { id: 'reveal', label: 'Reveal in Explorer', icon: ICONS.reveal, action: (path) => revealInExplorer(path), showFor: 'both' },
      { id: 'copyPath', label: 'Copy Path', icon: ICONS.copy, action: (path) => copyPath(path), showFor: 'both' }
    ]
  },
  {
    id: 'edit',
    label: 'Edit',
    icon: ICONS.rename,
    showFor: 'both',
    children: [
      { id: 'rename', label: 'Rename', icon: ICONS.rename, shortcut: 'F2', action: (path) => renameItem(path), showFor: 'both' },
      { id: 'delete', label: 'Delete', icon: ICONS.delete, shortcut: 'Del', className: 'danger', action: (path) => deleteItem(path), showFor: 'both' }
    ]
  },
  { id: 'sep2', label: '', icon: '', action: () => {}, showFor: 'both' },
  { id: 'aiAnalysis', label: 'AI Analysis', icon: ICONS.ai, action: (path) => aiAnalyze(path, 'explain'), showFor: 'both', className: 'ai-item' }
];

// ============================================================================
// CSS STYLES (injected once)
// ============================================================================
const MENU_STYLES = `
/* Fast Context Menu - Performance Optimized */
.fcm {
  position: fixed;
  background: #1e1e22;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  padding: 4px;
  min-width: 200px;
  z-index: 100000;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  opacity: 0;
  transform: scale(0.96);
  will-change: transform, opacity;
  pointer-events: none;
}

.fcm.show {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
  transition: opacity 0.1s ease-out, transform 0.1s ease-out;
}

.fcm.hide {
  opacity: 0;
  transform: scale(0.96);
  transition: opacity 0.08s ease-in, transform 0.08s ease-in;
  pointer-events: none;
}

/* Header */
.fcm-hdr {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid #333;
  margin-bottom: 4px;
}

.fcm-hdr-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.fcm-hdr-icon.file { background: linear-gradient(135deg, #4fc3f7, #29b6f6); }
.fcm-hdr-icon.folder { background: linear-gradient(135deg, #ffb74d, #ffa726); }
.fcm-hdr-icon svg { width: 14px; height: 14px; color: #fff; }

.fcm-hdr-name {
  font-size: 12px;
  font-weight: 600;
  color: #e6edf3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.fcm-hdr-path {
  font-size: 10px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Menu Items */
.fcm-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
  color: #ccc;
  border-radius: 4px;
  margin: 1px 0;
  position: relative;
}

.fcm-item:hover {
  background: #2a2d32;
  color: #fff;
}

.fcm-item.primary { color: #4fc3f7; }
.fcm-item.primary:hover { background: rgba(79, 195, 247, 0.15); }

.fcm-item.danger { color: #f44336; }
.fcm-item.danger:hover { background: rgba(244, 67, 54, 0.15); }

.fcm-item.ai-item { color: #a78bfa; }
.fcm-item.ai-item:hover { background: rgba(167, 139, 250, 0.15); }

.fcm-item.hidden { display: none; }

.fcm-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
}

.fcm-icon svg { width: 14px; height: 14px; }

.fcm-text { flex: 1; font-size: 12px; }

.fcm-shortcut {
  font-size: 10px;
  color: #666;
  margin-left: auto;
}

.fcm-arrow {
  width: 12px;
  height: 12px;
  opacity: 0.5;
  margin-left: auto;
}

.fcm-arrow svg { width: 10px; height: 10px; }

/* Separator */
.fcm-sep {
  height: 1px;
  background: #333;
  margin: 4px 8px;
}

/* Submenu */
.fcm-sub {
  position: fixed;
  background: #1e1e22;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  padding: 4px;
  min-width: 180px;
  z-index: 100001;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  opacity: 0;
  transform: translateX(-4px);
  will-change: transform, opacity;
  pointer-events: none;
  display: none;
}

.fcm-sub.show {
  display: block;
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
  transition: opacity 0.08s ease-out, transform 0.08s ease-out;
}

/* Hide old context menu */
#context-menu { display: none !important; }
`;

// ============================================================================
// INITIALIZATION
// ============================================================================
export function initFastContextMenu(): void {
  if (isInitialized) return;
  isInitialized = true;
  
  // Inject styles once
  if (!document.getElementById('fcm-styles')) {
    const style = document.createElement('style');
    style.id = 'fcm-styles';
    style.textContent = MENU_STYLES;
    document.head.appendChild(style);
  }
  
  // Create menu element once
  menuElement = createMenuElement();
  document.body.appendChild(menuElement);
  
  // Create submenus
  MENU_ACTIONS.forEach(action => {
    if (action.children) {
      const submenu = createSubmenuElement(action);
      submenus.set(action.id, submenu);
      document.body.appendChild(submenu);
    }
  });
  
  // Single document-level context menu listener
  document.addEventListener('contextmenu', handleContextMenu, true);
  
  // Single click listener to close menu
  document.addEventListener('click', handleDocumentClick, true);
  
  // Escape key handler
  document.addEventListener('keydown', handleKeyDown);
  
  console.log('✅ Fast Context Menu initialized');
}

// ============================================================================
// DOM CREATION (done once at init)
// ============================================================================
function createMenuElement(): HTMLElement {
  const menu = document.createElement('div');
  menu.className = 'fcm';
  menu.id = 'fcm-main';
  
  // Header
  const header = document.createElement('div');
  header.className = 'fcm-hdr';
  header.innerHTML = `
    <div class="fcm-hdr-icon file" data-icon>
      ${ICONS.file}
    </div>
    <div>
      <div class="fcm-hdr-name" data-name>filename.ts</div>
      <div class="fcm-hdr-path" data-path>/path/to</div>
    </div>
  `;
  menu.appendChild(header);
  
  // Menu items container
  const itemsContainer = document.createElement('div');
  itemsContainer.className = 'fcm-items';
  
  MENU_ACTIONS.forEach(action => {
    if (action.id.startsWith('sep')) {
      const sep = document.createElement('div');
      sep.className = 'fcm-sep';
      sep.dataset.showFor = action.showFor || 'both';
      itemsContainer.appendChild(sep);
    } else {
      const item = document.createElement('div');
      item.className = `fcm-item ${action.className || ''}`;
      item.dataset.action = action.id;
      item.dataset.showFor = action.showFor || 'both';
      item.dataset.hasSubmenu = action.children ? 'true' : 'false';
      
      item.innerHTML = `
        <div class="fcm-icon">${action.icon}</div>
        <span class="fcm-text">${action.label}</span>
        ${action.shortcut ? `<span class="fcm-shortcut">${action.shortcut}</span>` : ''}
        ${action.children ? `<div class="fcm-arrow">${ICONS.chevron}</div>` : ''}
      `;
      
      itemsContainer.appendChild(item);
    }
  });
  
  menu.appendChild(itemsContainer);
  
  // Event delegation for menu items
  menu.addEventListener('click', handleMenuClick);
  menu.addEventListener('mouseenter', handleMenuHover, true);
  menu.addEventListener('mouseleave', handleMenuLeave);
  
  return menu;
}

function createSubmenuElement(parent: MenuAction): HTMLElement {
  const submenu = document.createElement('div');
  submenu.className = 'fcm-sub';
  submenu.id = `fcm-sub-${parent.id}`;
  submenu.dataset.parent = parent.id;
  
  parent.children?.forEach(child => {
    const item = document.createElement('div');
    item.className = `fcm-item ${child.className || ''}`;
    item.dataset.action = child.id;
    item.dataset.showFor = child.showFor || 'both';
    
    item.innerHTML = `
      <div class="fcm-icon">${child.icon}</div>
      <span class="fcm-text">${child.label}</span>
      ${child.shortcut ? `<span class="fcm-shortcut">${child.shortcut}</span>` : ''}
    `;
    
    submenu.appendChild(item);
  });
  
  submenu.addEventListener('click', handleSubmenuClick);
  submenu.addEventListener('mouseleave', () => hideSubmenu(submenu));
  
  return submenu;
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================
function handleContextMenu(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  
  // Check if within file tree
  const fileTree = target.closest('.file-tree, #file-tree, #files-content');
  if (!fileTree) return;
  
  // Find file/folder item
  const fileItem = target.closest('.file-item, .folder-item, .tree-folder, .tree-file, [data-path]') as HTMLElement;
  if (!fileItem) return;
  
  // Skip project header
  if (target.closest('.project-header')) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const path = fileItem.getAttribute('data-path') || '';
  if (!path) return;
  
  const isDirectory = fileItem.classList.contains('folder-item') ||
                      fileItem.classList.contains('tree-folder') ||
                      fileItem.classList.contains('directory') ||
                      fileItem.getAttribute('data-is-directory') === 'true';
  
  showMenu(e.clientX, e.clientY, path, isDirectory);
}

function handleDocumentClick(e: MouseEvent): void {
  if (!menuElement) return;
  
  const target = e.target as HTMLElement;
  if (!target.closest('.fcm') && !target.closest('.fcm-sub')) {
    hideMenu();
  }
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    hideMenu();
  }
}

function handleMenuClick(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  const item = target.closest('.fcm-item') as HTMLElement;
  if (!item) return;
  
  const actionId = item.dataset.action;
  if (!actionId) return;
  
  // If has submenu, don't close on click
  if (item.dataset.hasSubmenu === 'true') return;
  
  const action = MENU_ACTIONS.find(a => a.id === actionId);
  if (action && action.action) {
    hideMenu();
    // Execute action synchronously for instant feedback
    action.action(currentPath, currentIsDirectory);
  }
}

function handleSubmenuClick(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  const item = target.closest('.fcm-item') as HTMLElement;
  if (!item) return;
  
  const actionId = item.dataset.action;
  const submenu = target.closest('.fcm-sub') as HTMLElement;
  const parentId = submenu?.dataset.parent;
  
  if (!actionId || !parentId) return;
  
  const parent = MENU_ACTIONS.find(a => a.id === parentId);
  const action = parent?.children?.find(c => c.id === actionId);
  
  if (action && action.action) {
    hideMenu();
    action.action(currentPath, currentIsDirectory);
  }
}

function handleMenuHover(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  const item = target.closest('.fcm-item') as HTMLElement;
  if (!item) return;
  
  // Hide any open submenu first
  hideAllSubmenus();
  
  if (item.dataset.hasSubmenu === 'true') {
    const actionId = item.dataset.action;
    if (actionId) {
      const submenu = submenus.get(actionId);
      if (submenu) {
        showSubmenu(submenu, item);
      }
    }
  }
}

function handleMenuLeave(e: MouseEvent): void {
  const relatedTarget = e.relatedTarget as HTMLElement;
  if (!relatedTarget?.closest('.fcm-sub')) {
    // Small delay to allow moving to submenu
    setTimeout(() => {
      if (!document.querySelector('.fcm-sub:hover')) {
        hideAllSubmenus();
      }
    }, 50);
  }
}

// ============================================================================
// SHOW/HIDE FUNCTIONS
// ============================================================================
function showMenu(x: number, y: number, path: string, isDirectory: boolean): void {
  if (!menuElement) return;
  
  // Store current context
  currentPath = path;
  currentIsDirectory = isDirectory;
  
  // Update header
  const fileName = path.split(/[/\\]/).pop() || 'Unknown';
  const parentPath = path.split(/[/\\]/).slice(0, -1).join('/') || 'Project root';
  
  const nameEl = menuElement.querySelector('[data-name]') as HTMLElement;
  const pathEl = menuElement.querySelector('[data-path]') as HTMLElement;
  const iconEl = menuElement.querySelector('[data-icon]') as HTMLElement;
  
  if (nameEl) nameEl.textContent = fileName;
  if (pathEl) pathEl.textContent = parentPath;
  if (iconEl) {
    iconEl.className = `fcm-hdr-icon ${isDirectory ? 'folder' : 'file'}`;
    iconEl.innerHTML = isDirectory ? ICONS.folder : ICONS.file;
  }
  
  // Show/hide items based on file/folder
  const showFor = isDirectory ? 'folder' : 'file';
  menuElement.querySelectorAll('[data-show-for]').forEach(el => {
    const elShowFor = (el as HTMLElement).dataset.showFor;
    if (elShowFor === 'both' || elShowFor === showFor) {
      (el as HTMLElement).classList.remove('hidden');
    } else {
      (el as HTMLElement).classList.add('hidden');
    }
  });
  
  // Also update submenus visibility
  submenus.forEach(submenu => {
    submenu.querySelectorAll('[data-show-for]').forEach(el => {
      const elShowFor = (el as HTMLElement).dataset.showFor;
      if (elShowFor === 'both' || elShowFor === showFor) {
        (el as HTMLElement).classList.remove('hidden');
      } else {
        (el as HTMLElement).classList.add('hidden');
      }
    });
  });
  
  // Position menu (synchronous, no delay)
  positionMenu(menuElement, x, y);
  
  // Show with class toggle (CSS handles animation)
  menuElement.classList.remove('hide');
  menuElement.classList.add('show');
}

function hideMenu(): void {
  if (!menuElement) return;
  
  menuElement.classList.remove('show');
  menuElement.classList.add('hide');
  
  hideAllSubmenus();
}

function showSubmenu(submenu: HTMLElement, parentItem: HTMLElement): void {
  const rect = parentItem.getBoundingClientRect();
  
  // Position to the right of parent item
  let left = rect.right + 4;
  let top = rect.top;
  
  // Check bounds
  const subWidth = 180; // min-width
  const subHeight = submenu.children.length * 32;
  
  if (left + subWidth > window.innerWidth - 10) {
    left = rect.left - subWidth - 4;
  }
  
  if (top + subHeight > window.innerHeight - 10) {
    top = window.innerHeight - subHeight - 10;
  }
  
  submenu.style.left = `${left}px`;
  submenu.style.top = `${top}px`;
  submenu.classList.add('show');
  
  activeSubmenu = submenu;
}

function hideSubmenu(submenu: HTMLElement): void {
  submenu.classList.remove('show');
  if (activeSubmenu === submenu) {
    activeSubmenu = null;
  }
}

function hideAllSubmenus(): void {
  submenus.forEach(submenu => {
    submenu.classList.remove('show');
  });
  activeSubmenu = null;
}

function positionMenu(menu: HTMLElement, x: number, y: number): void {
  const menuWidth = 220;
  const menuHeight = 400; // Estimate
  const padding = 10;
  
  let finalX = x;
  let finalY = y;
  
  // Horizontal bounds
  if (x + menuWidth > window.innerWidth - padding) {
    finalX = window.innerWidth - menuWidth - padding;
  }
  
  // Vertical bounds
  if (y + menuHeight > window.innerHeight - padding) {
    finalY = Math.max(padding, window.innerHeight - menuHeight - padding);
  }
  
  menu.style.left = `${finalX}px`;
  menu.style.top = `${finalY}px`;
}

// ============================================================================
// ACTION IMPLEMENTATIONS
// ============================================================================
function getParentPath(path: string): string {
  return path.split(/[/\\]/).slice(0, -1).join(path.includes('/') ? '/' : '\\');
}

async function handleFileOpen(path: string): Promise<void> {
  try {
    const module = await import('../../editor/editorManager');
    if (module.openFile) {
      await module.openFile(path);
    }
  } catch (error) {
    console.error('Error opening file:', error);
  }
}

function toggleFolder(path: string): void {
  document.dispatchEvent(new CustomEvent('toggle-folder', { detail: { path } }));
}

function showCreateDialog(type: 'file' | 'folder', parentPath: string): void {
  document.dispatchEvent(new CustomEvent('show-create-dialog', { 
    detail: { type, parentPath } 
  }));
}

function duplicateItem(path: string): void {
  document.dispatchEvent(new CustomEvent('duplicate-item', { detail: { path } }));
}

function openTerminal(path: string): void {
  document.dispatchEvent(new CustomEvent('open-terminal', { detail: { path } }));
}

async function revealInExplorer(path: string): Promise<void> {
  try {
    if ((window as any).__TAURI__) {
      await invoke('reveal_in_explorer', { path });
    }
  } catch (error) {
    console.error('Error revealing in explorer:', error);
  }
}

async function copyPath(path: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(path);
    if ((window as any).showNotification) {
      (window as any).showNotification('Path copied to clipboard', 'success');
    }
  } catch (error) {
    console.error('Error copying path:', error);
  }
}

function renameItem(path: string): void {
  document.dispatchEvent(new CustomEvent('rename-item', { detail: { path } }));
}

function deleteItem(path: string): void {
  document.dispatchEvent(new CustomEvent('delete-item', { detail: { path } }));
}

function aiAnalyze(path: string, type: string): void {
  document.dispatchEvent(new CustomEvent('ai-analyze', { 
    detail: { path, analysisType: type } 
  }));
}

// ============================================================================
// EXPORT
// ============================================================================
export { showMenu, hideMenu };
