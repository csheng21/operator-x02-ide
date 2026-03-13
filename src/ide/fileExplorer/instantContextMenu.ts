// src/ide/fileExplorer/instantContextMenu.ts
// ============================================================================
// INSTANT CONTEXT MENU - Zero Delay Implementation
// ============================================================================
// Aggressive optimizations for sub-frame rendering:
// 1. No animations at all - instant visibility toggle
// 2. CSS `contain: strict` for layout isolation
// 3. Transform-based positioning (GPU accelerated)
// 4. Pre-computed styles (no runtime calculations)
// 5. Direct property access (no classList)
// 6. Batched DOM reads/writes
// 7. Pointer events (faster than mouse events)
// 8. Inline event handlers (no lookup)

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// CONFIGURATION
// ============================================================================
type MenuItemType = 'action' | 'submenu' | 'separator';
type ShowFor = 'file' | 'folder' | 'both';

interface MenuItem {
  id: string;
  type: MenuItemType;
  label?: string;
  icon?: string;
  shortcut?: string;
  showFor: ShowFor;
  className?: string;
  children?: MenuItem[];
}

// ============================================================================
// STATE (module-level for fastest access)
// ============================================================================
let menu: HTMLDivElement;
let header: HTMLDivElement;
let headerIcon: HTMLDivElement;
let headerName: HTMLSpanElement;
let headerPath: HTMLSpanElement;
let itemsContainer: HTMLDivElement;
let submenus: Map<string, HTMLDivElement> = new Map();

let currentPath = '';
let currentIsDir = false;
let isVisible = false;
let activeSubmenuId = '';

// Pre-computed values
const MENU_WIDTH = 220;
const MENU_HEIGHT = 380;
const SUBMENU_WIDTH = 180;

// ============================================================================
// ICONS (inline SVG strings - no runtime generation)
// ============================================================================
const I = {
  file: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>',
  folder: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  open: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  nav: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  ai: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  terminal: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4,17 10,11 4,5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
  copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  chevron: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>',
};

// ============================================================================
// MENU STRUCTURE (static, defined once)
// ============================================================================
const MENU_ITEMS: MenuItem[] = [
  { id: 'open', type: 'action', label: 'Open', icon: I.open, shortcut: 'Enter', showFor: 'both', className: 'p' },
  { id: 's1', type: 'separator', showFor: 'both' },
  { id: 'create', type: 'submenu', label: 'Create', icon: I.plus, showFor: 'both', className: 'g', children: [
    { id: 'newFile', type: 'action', label: 'New File', icon: I.file, shortcut: 'Ctrl+N', showFor: 'both' },
    { id: 'newFolder', type: 'action', label: 'New Folder', icon: I.folder, showFor: 'both' },
  ]},
  { id: 'navigate', type: 'submenu', label: 'Navigate', icon: I.nav, showFor: 'both', className: 'b', children: [
    { id: 'terminal', type: 'action', label: 'Terminal Here', icon: I.terminal, showFor: 'both' },
    { id: 'reveal', type: 'action', label: 'Reveal in Explorer', icon: I.nav, showFor: 'both' },
    { id: 'copyPath', type: 'action', label: 'Copy Path', icon: I.copy, showFor: 'both' },
  ]},
  { id: 'edit', type: 'submenu', label: 'Edit', icon: I.edit, showFor: 'both', className: 'o', children: [
    { id: 'rename', type: 'action', label: 'Rename', icon: I.edit, shortcut: 'F2', showFor: 'both' },
    { id: 'delete', type: 'action', label: 'Delete', icon: I.trash, shortcut: 'Del', showFor: 'both', className: 'd' },
  ]},
  { id: 's2', type: 'separator', showFor: 'both' },
  { id: 'ai', type: 'action', label: 'AI Analysis', icon: I.ai, showFor: 'both', className: 'v' },
];

// ============================================================================
// CSS (minimal, performance-focused)
// ============================================================================
const CSS = `
.icm{position:fixed;background:#1a1a1e;border:1px solid #333;border-radius:6px;padding:4px;width:${MENU_WIDTH}px;z-index:100000;box-shadow:0 4px 20px #000a;font:12px/1.4 system-ui,sans-serif;contain:strict;visibility:hidden;pointer-events:none}
.icm.v{visibility:visible;pointer-events:auto}
.icm-h{display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid #333;margin-bottom:2px}
.icm-hi{width:24px;height:24px;border-radius:4px;display:flex;align-items:center;justify-content:center}
.icm-hi.f{background:#4fc3f7}
.icm-hi.d{background:#ffb74d}
.icm-hn{font-size:11px;font-weight:600;color:#e6edf3;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.icm-hp{font-size:9px;color:#666;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.icm-i{display:flex;align-items:center;gap:6px;padding:5px 8px;cursor:pointer;color:#aaa;border-radius:3px}
.icm-i:hover{background:#2a2d32;color:#fff}
.icm-i.p{color:#4fc3f7}
.icm-i.p:hover{background:#4fc3f722}
.icm-i.g{color:#4caf50}
.icm-i.g:hover{background:#4caf5022}
.icm-i.b{color:#2196f3}
.icm-i.b:hover{background:#2196f322}
.icm-i.o{color:#ff9800}
.icm-i.o:hover{background:#ff980022}
.icm-i.v{color:#a78bfa}
.icm-i.v:hover{background:#a78bfa22}
.icm-i.d{color:#f44}
.icm-i.d:hover{background:#f4422}
.icm-i.h{display:none}
.icm-ic{width:16px;height:16px;display:flex;align-items:center;justify-content:center;opacity:.7}
.icm-t{flex:1}
.icm-k{font-size:9px;color:#555;margin-left:auto}
.icm-a{width:12px;height:12px;opacity:.4;margin-left:auto}
.icm-s{height:1px;background:#333;margin:3px 6px}
.icm-sub{position:fixed;background:#1a1a1e;border:1px solid #333;border-radius:6px;padding:4px;width:${SUBMENU_WIDTH}px;z-index:100001;box-shadow:0 4px 20px #000a;contain:strict;visibility:hidden;pointer-events:none}
.icm-sub.v{visibility:visible;pointer-events:auto}
#context-menu{display:none!important}
`;

// ============================================================================
// INITIALIZATION (called once)
// ============================================================================
export function initInstantContextMenu(): void {
  if (menu) return; // Already initialized
  
  // Inject CSS
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  
  // Create menu element
  menu = document.createElement('div');
  menu.className = 'icm';
  
  // Create header
  header = document.createElement('div');
  header.className = 'icm-h';
  headerIcon = document.createElement('div');
  headerIcon.className = 'icm-hi f';
  headerIcon.innerHTML = I.file;
  const headerInfo = document.createElement('div');
  headerName = document.createElement('div') as any;
  headerName.className = 'icm-hn';
  headerPath = document.createElement('div') as any;
  headerPath.className = 'icm-hp';
  headerInfo.appendChild(headerName);
  headerInfo.appendChild(headerPath);
  header.appendChild(headerIcon);
  header.appendChild(headerInfo);
  menu.appendChild(header);
  
  // Create items container
  itemsContainer = document.createElement('div');
  
  // Build menu items
  for (const item of MENU_ITEMS) {
    if (item.type === 'separator') {
      const sep = document.createElement('div');
      sep.className = 'icm-s';
      itemsContainer.appendChild(sep);
    } else {
      const el = document.createElement('div');
      el.className = `icm-i ${item.className || ''}`;
      el.dataset.id = item.id;
      el.dataset.sf = item.showFor;
      
      if (item.type === 'submenu') {
        el.dataset.sub = '1';
        el.innerHTML = `<span class="icm-ic">${item.icon}</span><span class="icm-t">${item.label}</span><span class="icm-a">${I.chevron}</span>`;
        
        // Create submenu
        const sub = document.createElement('div');
        sub.className = 'icm-sub';
        sub.dataset.parent = item.id;
        
        for (const child of item.children || []) {
          const childEl = document.createElement('div');
          childEl.className = `icm-i ${child.className || ''}`;
          childEl.dataset.id = child.id;
          childEl.dataset.sf = child.showFor;
          childEl.innerHTML = `<span class="icm-ic">${child.icon}</span><span class="icm-t">${child.label}</span>${child.shortcut ? `<span class="icm-k">${child.shortcut}</span>` : ''}`;
          sub.appendChild(childEl);
        }
        
        document.body.appendChild(sub);
        submenus.set(item.id, sub);
      } else {
        el.innerHTML = `<span class="icm-ic">${item.icon}</span><span class="icm-t">${item.label}</span>${item.shortcut ? `<span class="icm-k">${item.shortcut}</span>` : ''}`;
      }
      
      itemsContainer.appendChild(el);
    }
  }
  
  menu.appendChild(itemsContainer);
  document.body.appendChild(menu);
  
  // Event listeners (use pointerdown for faster response than click)
  document.addEventListener('contextmenu', onContextMenu, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('keydown', onKeyDown);
  
  // Menu interactions
  menu.addEventListener('pointerover', onMenuPointerOver);
  menu.addEventListener('pointerdown', onMenuPointerDown);
  
  // Submenu interactions
  submenus.forEach(sub => {
    sub.addEventListener('pointerdown', onSubmenuPointerDown);
    sub.addEventListener('pointerleave', onSubmenuLeave);
  });
  
  // Setup action handlers
  setupActionHandlers();
  
  console.log('⚡ Instant Context Menu initialized');
}

// ============================================================================
// EVENT HANDLERS (optimized for speed)
// ============================================================================
function onContextMenu(e: MouseEvent): void {
  const t = e.target as HTMLElement;
  
  // Quick check - bail early if not in file tree
  if (!t.closest('.file-tree,#file-tree,#files-content')) return;
  
  const item = t.closest('[data-path]') as HTMLElement;
  if (!item || t.closest('.project-header')) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const path = item.dataset.path || '';
  if (!path) return;
  
  const isDir = item.classList.contains('folder-item') || 
                item.classList.contains('tree-folder') ||
                item.dataset.isDirectory === 'true';
  
  show(e.clientX, e.clientY, path, isDir);
}

function onPointerDown(e: PointerEvent): void {
  if (!isVisible) return;
  const t = e.target as HTMLElement;
  if (!t.closest('.icm,.icm-sub')) {
    hide();
  }
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && isVisible) {
    hide();
  }
}

function onMenuPointerOver(e: PointerEvent): void {
  const t = e.target as HTMLElement;
  const item = t.closest('.icm-i') as HTMLElement;
  
  // Hide active submenu if hovering different item
  if (activeSubmenuId) {
    const sub = submenus.get(activeSubmenuId);
    if (sub && (!item || item.dataset.id !== activeSubmenuId)) {
      sub.classList.remove('v');
      activeSubmenuId = '';
    }
  }
  
  // Show submenu if hovering submenu item
  if (item?.dataset.sub === '1') {
    const id = item.dataset.id!;
    const sub = submenus.get(id);
    if (sub) {
      // Position submenu
      const rect = item.getBoundingClientRect();
      let x = rect.right + 4;
      let y = rect.top;
      
      // Bounds check
      if (x + SUBMENU_WIDTH > window.innerWidth - 8) {
        x = rect.left - SUBMENU_WIDTH - 4;
      }
      if (y + 150 > window.innerHeight - 8) {
        y = window.innerHeight - 158;
      }
      
      sub.style.transform = `translate(${x}px,${y}px)`;
      sub.classList.add('v');
      activeSubmenuId = id;
    }
  }
}

function onMenuPointerDown(e: PointerEvent): void {
  const t = e.target as HTMLElement;
  const item = t.closest('.icm-i') as HTMLElement;
  if (!item || item.dataset.sub === '1') return;
  
  e.preventDefault();
  hide();
  execAction(item.dataset.id!);
}

function onSubmenuPointerDown(e: PointerEvent): void {
  const t = e.target as HTMLElement;
  const item = t.closest('.icm-i') as HTMLElement;
  if (!item) return;
  
  e.preventDefault();
  hide();
  execAction(item.dataset.id!);
}

function onSubmenuLeave(): void {
  // Small delay to allow moving back to parent
  setTimeout(() => {
    if (activeSubmenuId && !document.querySelector('.icm-sub:hover,.icm-i[data-sub="1"]:hover')) {
      const sub = submenus.get(activeSubmenuId);
      if (sub) sub.classList.remove('v');
      activeSubmenuId = '';
    }
  }, 80);
}

// ============================================================================
// SHOW/HIDE (ultra-optimized)
// ============================================================================
function show(x: number, y: number, path: string, isDir: boolean): void {
  currentPath = path;
  currentIsDir = isDir;
  
  // Update header (minimal DOM operations)
  const parts = path.split(/[/\\]/);
  const name = parts.pop() || '';
  const parentPath = parts.join('/') || '/';
  
  headerName.textContent = name;
  headerPath.textContent = parentPath;
  headerIcon.className = isDir ? 'icm-hi d' : 'icm-hi f';
  headerIcon.innerHTML = isDir ? I.folder : I.file;
  
  // Update item visibility
  const sf = isDir ? 'folder' : 'file';
  const items = itemsContainer.children;
  for (let i = 0; i < items.length; i++) {
    const el = items[i] as HTMLElement;
    const showFor = el.dataset.sf;
    if (showFor && showFor !== 'both' && showFor !== sf) {
      el.classList.add('h');
    } else {
      el.classList.remove('h');
    }
  }
  
  // Update submenu item visibility
  submenus.forEach(sub => {
    const children = sub.children;
    for (let i = 0; i < children.length; i++) {
      const el = children[i] as HTMLElement;
      const showFor = el.dataset.sf;
      if (showFor && showFor !== 'both' && showFor !== sf) {
        el.classList.add('h');
      } else {
        el.classList.remove('h');
      }
    }
  });
  
  // Position (use transform for GPU acceleration)
  let fx = x, fy = y;
  if (x + MENU_WIDTH > window.innerWidth - 8) fx = window.innerWidth - MENU_WIDTH - 8;
  if (y + MENU_HEIGHT > window.innerHeight - 8) fy = Math.max(8, window.innerHeight - MENU_HEIGHT - 8);
  
  menu.style.transform = `translate(${fx}px,${fy}px)`;
  menu.classList.add('v');
  isVisible = true;
}

function hide(): void {
  if (!isVisible) return;
  
  menu.classList.remove('v');
  isVisible = false;
  
  // Hide any active submenu
  if (activeSubmenuId) {
    const sub = submenus.get(activeSubmenuId);
    if (sub) sub.classList.remove('v');
    activeSubmenuId = '';
  }
}

// ============================================================================
// ACTION EXECUTION
// ============================================================================
function execAction(id: string): void {
  const path = currentPath;
  const isDir = currentIsDir;
  const parentPath = path.split(/[/\\]/).slice(0, -1).join('/');
  
  switch (id) {
    case 'open':
      if (isDir) {
        document.dispatchEvent(new CustomEvent('toggle-folder', { detail: { path } }));
      } else {
        openFile(path);
      }
      break;
    case 'newFile':
      document.dispatchEvent(new CustomEvent('show-create-dialog', { detail: { type: 'file', parentPath: isDir ? path : parentPath } }));
      break;
    case 'newFolder':
      document.dispatchEvent(new CustomEvent('show-create-dialog', { detail: { type: 'folder', parentPath: isDir ? path : parentPath } }));
      break;
    case 'terminal':
      document.dispatchEvent(new CustomEvent('open-terminal', { detail: { path: isDir ? path : parentPath } }));
      break;
    case 'reveal':
      revealInExplorer(path);
      break;
    case 'copyPath':
      navigator.clipboard.writeText(path).then(() => {
        (window as any).showNotification?.('Path copied', 'success');
      });
      break;
    case 'rename':
      document.dispatchEvent(new CustomEvent('rename-item', { detail: { path } }));
      break;
    case 'delete':
      document.dispatchEvent(new CustomEvent('delete-item', { detail: { path } }));
      break;
    case 'aiExplain':
    case 'aiReview':
    case 'aiProject':
      document.dispatchEvent(new CustomEvent('ai-analyze', { detail: { path, type: id } }));
      break;
  }
}

async function openFile(path: string): Promise<void> {
  try {
    const m = await import('../../editor/editorManager');
    m.openFile?.(path);
  } catch (e) {
    console.error('Open file error:', e);
  }
}

async function revealInExplorer(path: string): Promise<void> {
  try {
    if ((window as any).__TAURI__) {
      await invoke('reveal_in_explorer', { path });
    }
  } catch (e) {
    console.error('Reveal error:', e);
  }
}

// ============================================================================
// BUILT-IN EVENT HANDLERS (connect to your existing systems)
// ============================================================================
function setupActionHandlers(): void {
  // Toggle folder - connect to existing folder toggle system
  document.addEventListener('toggle-folder', ((e: CustomEvent) => {
    const { path } = e.detail;
    const folderEl = document.querySelector(`[data-path="${CSS.escape(path)}"]`) as HTMLElement;
    if (folderEl) folderEl.click();
  }) as EventListener);

  // Create dialog
  document.addEventListener('show-create-dialog', ((e: CustomEvent) => {
    const { type, parentPath } = e.detail;
    // Try multiple ways to trigger create dialog
    if ((window as any).showCreateNewDialog) {
      (window as any).showCreateNewDialog(type, parentPath);
    } else if ((window as any).newFileHandler?.show) {
      (window as any).newFileHandler.show(type, parentPath);
    } else {
      // Fallback: show simple prompt
      const name = prompt(`Enter ${type} name:`);
      if (name) {
        const fullPath = `${parentPath}/${name}`;
        if (type === 'file') {
          invoke('create_file', { path: fullPath, content: '' }).catch(console.error);
        } else {
          invoke('create_directory', { path: fullPath }).catch(console.error);
        }
        // Refresh file tree
        document.dispatchEvent(new CustomEvent('file-tree-refresh'));
      }
    }
  }) as EventListener);

  // Terminal
  document.addEventListener('open-terminal', ((e: CustomEvent) => {
    const { path } = e.detail;
    if ((window as any).terminalManager?.openAtPath) {
      (window as any).terminalManager.openAtPath(path);
    } else {
      invoke('open_terminal', { path }).catch(console.error);
    }
  }) as EventListener);

  // Rename
  document.addEventListener('rename-item', ((e: CustomEvent) => {
    const { path } = e.detail;
    const oldName = path.split(/[/\\]/).pop() || '';
    const newName = prompt('Enter new name:', oldName);
    if (newName && newName !== oldName) {
      const parentPath = path.split(/[/\\]/).slice(0, -1).join('/');
      const newPath = `${parentPath}/${newName}`;
      invoke('rename_path', { oldPath: path, newPath }).then(() => {
        document.dispatchEvent(new CustomEvent('file-tree-refresh'));
        (window as any).showNotification?.(`Renamed to ${newName}`, 'success');
      }).catch((err: any) => {
        console.error('Rename failed:', err);
        (window as any).showNotification?.('Rename failed', 'error');
      });
    }
  }) as EventListener);

  // Delete
  document.addEventListener('delete-item', ((e: CustomEvent) => {
    const { path } = e.detail;
    const name = path.split(/[/\\]/).pop() || '';
    if (confirm(`Delete "${name}"?`)) {
      invoke('delete_path', { path }).then(() => {
        document.dispatchEvent(new CustomEvent('file-tree-refresh'));
        document.dispatchEvent(new CustomEvent('file-deleted', { detail: { path } }));
        (window as any).showNotification?.(`Deleted ${name}`, 'success');
      }).catch((err: any) => {
        console.error('Delete failed:', err);
        (window as any).showNotification?.('Delete failed', 'error');
      });
    }
  }) as EventListener);

  // AI Analysis
  document.addEventListener('ai-analyze', ((e: CustomEvent) => {
    const { path, type } = e.detail;
    const name = path.split(/[/\\]/).pop() || '';
    
    // Single AI Analysis action
    const prompt = `Please analyze and explain this file: ${name}\n\nFile path: ${path}\n\nProvide a comprehensive analysis including: purpose, key components, dependencies, and any potential issues.`;
    
    // Send to AI assistant
    if ((window as any).aiAssistant?.sendMessage) {
      (window as any).aiAssistant.sendMessage(prompt);
    } else {
      // Fallback: put in input field
      const input = document.querySelector('#ai-assistant-input, #user-input, .ai-input') as HTMLTextAreaElement;
      if (input) {
        input.value = prompt;
        input.focus();
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    
    (window as any).showNotification?.('AI analysis started', 'info');
  }) as EventListener);

  console.log('✅ Context menu action handlers ready');
}

// ============================================================================
// EXPORTS (initInstantContextMenu already exported above)
// ============================================================================
export { show, hide };
