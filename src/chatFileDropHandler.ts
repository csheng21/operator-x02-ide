// chatFileDropHandler.ts - File Attachment System with Professional UI
// ============================================================================
// Features:
// ✅ Compact professional design (VS Code style)
// ✅ Grey context bar for files read by AI
// ✅ Blue pending bar for files to be sent
// ✅ Auto-reference files in follow-up questions
// ✅ Fixed: Open Folder uses reveal_in_explorer Tauri command
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

export interface AttachedFile {
  id: string;
  name: string;
  path?: string;
  extension: string;
  size: number;
  content: string | null;
  preview?: string;
  icon: string;
  category: 'code' | 'image' | 'text' | 'pdf' | 'document' | 'other';
  status: 'pending' | 'read';
}

let attachedFiles: AttachedFile[] = [];
let contextFiles: AttachedFile[] = [];
let previewContainer: HTMLElement | null = null;
let contextBar: HTMLElement | null = null;
let isInitialized = false;

// File Context Store
interface FileContextEntry {
  name: string;
  content: string;
  extension: string;
  lineCount: number;
  size: number;
  attachedAt: number;
  purpose: string;
}

const fileContextStore: Map<string, FileContextEntry> = new Map();
const MAX_CONTEXT_FILES = 10;

// ============================================================================
// FILE TYPE MAPPINGS
// ============================================================================

const CODE_EXT = ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cpp', 'c', 'h', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'yml', 'sql', 'sh', 'vue', 'svelte'];
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'];
const TEXT_EXT = ['txt', 'md', 'markdown', 'log', 'csv', 'tsv', 'rst'];

const ICONS: Record<string, string> = {
  ts: '🔷', tsx: '⚛️', js: '🟨', jsx: '⚛️', py: '🐍', java: '☕',
  cpp: '⚙️', c: '🔧', cs: '🟪', go: '🐹', rs: '🦀', rb: '💎',
  php: '🐘', swift: '🍎', kt: '🟣', html: '🌐', css: '🎨',
  json: '📋', yaml: '⚙️', sql: '🗃️', sh: '💻', vue: '💚',
  png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🎞️', svg: '📐',
  pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗',
  txt: '📝', md: '📝', csv: '📊', default: '📄'
};

// ============================================================================
// FILE CONTEXT MEMORY
// ============================================================================

function addToFileContext(file: AttachedFile): void {
  if (!file.content || file.category === 'image') return;
  
  const entry: FileContextEntry = {
    name: file.name,
    content: file.content,
    extension: file.extension,
    lineCount: (file.content.match(/\n/g) || []).length + 1,
    size: file.content.length,
    attachedAt: Date.now(),
    purpose: detectFilePurpose(file.name, file.content, file.extension)
  };
  
  fileContextStore.set(file.name.toLowerCase(), entry);
  
  if (fileContextStore.size > MAX_CONTEXT_FILES) {
    const oldest = [...fileContextStore.entries()].sort((a, b) => a[1].attachedAt - b[1].attachedAt)[0];
    if (oldest) fileContextStore.delete(oldest[0]);
  }
}

function detectFilePurpose(name: string, content: string, ext: string): string {
  const n = name.toLowerCase();
  const c = content.substring(0, 2000).toLowerCase();
  
  if (n.includes('manager')) return 'Manager';
  if (n.includes('handler')) return 'Handler';
  if (n.includes('utils')) return 'Utilities';
  if (n.includes('config')) return 'Config';
  if (n.includes('test')) return 'Test';
  if (n.includes('style') || ext === 'css') return 'Styles';
  if (n.includes('api')) return 'API';
  if (n.includes('component')) return 'Component';
  if (n.includes('ui')) return 'UI';
  if (c.includes('react') || c.includes('usestate')) return 'React';
  if (c.includes('export function')) return 'Module';
  
  return ext.toUpperCase();
}

function findReferencedFiles(message: string): FileContextEntry[] {
  const m = message.toLowerCase();
  const results: FileContextEntry[] = [];
  
  for (const [key, file] of fileContextStore) {
    const base = key.replace(/\.[^.]+$/, '');
    if (m.includes(key) || m.includes(base)) {
      results.push(file);
    }
  }
  
  if (results.length === 0 && fileContextStore.size > 0) {
    if (/\b(the|this|that)\s+(file|code)\b/i.test(m)) {
      const recent = [...fileContextStore.values()].sort((a, b) => b.attachedAt - a.attachedAt)[0];
      if (recent) results.push(recent);
    }
  }
  
  return results;
}

export function enhanceWithFileContext(message: string): string {
  const refs = findReferencedFiles(message);
  if (refs.length === 0) return message;
  
  let ctx = '\n\n---\n📁 **File Context:**\n';
  for (const f of refs) {
    ctx += `\n### ${f.name} (${f.lineCount} lines)\n`;
    ctx += `\`\`\`${f.extension}\n${f.content}\n\`\`\`\n`;
  }
  
  console.log(`📁 Auto-enhanced with ${refs.length} file(s)`);
  return message + ctx;
}

export function getFileContextSummary(): string {
  if (fileContextStore.size === 0) return '';
  let s = '[Files in context:] ';
  s += [...fileContextStore.values()].map(f => `${f.name}(${f.lineCount}L)`).join(', ');
  return s;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initChatFileDrop(): void {
  if (isInitialized) return;
  
  const check = () => {
    const area = document.querySelector('.chat-input-area');
    if (area) setup(area as HTMLElement);
    else setTimeout(check, 500);
  };
  
  document.readyState === 'loading' 
    ? document.addEventListener('DOMContentLoaded', check) 
    : check();
}

function setup(inputArea: HTMLElement): void {
  createUI(inputArea);
  injectStyles();
  setupTauriDragDrop();
  setupPaste();
  setTimeout(enhanceUploadButton, 500);
  
  isInitialized = true;
  exposeAPI();
  console.log('✅ File attachment ready');
}

function createUI(inputArea: HTMLElement): void {
  // Remove existing
  document.getElementById('file-context-bar')?.remove();
  document.getElementById('attached-files-preview')?.remove();
  
  // Context bar (grey - read files)
  contextBar = document.createElement('div');
  contextBar.id = 'file-context-bar';
  contextBar.className = 'file-context-bar';
  
  // Preview container (blue - pending files)
  previewContainer = document.createElement('div');
  previewContainer.id = 'attached-files-preview';
  previewContainer.className = 'attached-files-preview';
  
  const inputBox = inputArea.querySelector('.chat-input-box');
  if (inputBox) {
    inputArea.insertBefore(previewContainer, inputBox);
    inputArea.insertBefore(contextBar, previewContainer);
  }
}

// ============================================================================
// RENDER FUNCTIONS - Professional Compact UI
// ============================================================================

function renderContextBar(): void {
  if (!contextBar) return;
  contextBar.innerHTML = '';
  
  if (contextFiles.length === 0) {
    contextBar.classList.remove('has-files');
    return;
  }
  
  // Label
  const label = document.createElement('div');
  label.className = 'ctx-label';
  label.innerHTML = `<span class="ctx-icon">📁</span><span>Context</span><span class="ctx-count">${contextFiles.length}</span>`;
  contextBar.appendChild(label);
  
  // Chips
  const chips = document.createElement('div');
  chips.className = 'ctx-chips';
  
  for (const file of contextFiles) {
    const chip = document.createElement('div');
    chip.className = 'ctx-chip';
    chip.dataset.id = file.id;
    chip.dataset.filename = file.name;
    chip.dataset.filepath = file.path || '';
    chip.title = `Click to add "${file.name}" to input\nRight-click for more options`;
    chip.style.cursor = 'pointer';
    
    chip.innerHTML = `
      <span class="ctx-dot"></span>
      <span class="ctx-name">${truncate(file.name, 12)}</span>
      <button class="ctx-remove">×</button>
    `;
    
    // Click on chip to insert filename into input
    chip.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('ctx-remove')) return;
      insertFilenameToInput(file.name);
    });
    
    // Right-click context menu
    chip.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showFileContextMenu(e, file, 'context');
    });
    
    chip.querySelector('.ctx-remove')?.addEventListener('click', (e) => {
      e.stopPropagation();
      removeContextFile(file.id);
    });
    
    chips.appendChild(chip);
  }
  
  contextBar.appendChild(chips);
  
  // Clear button
  const clear = document.createElement('button');
  clear.className = 'ctx-clear';
  clear.innerHTML = '×';
  clear.title = 'Clear all';
  clear.addEventListener('click', clearContextFiles);
  contextBar.appendChild(clear);
  
  contextBar.classList.add('has-files');
}

function renderPreviewContainer(): void {
  if (!previewContainer) return;
  previewContainer.innerHTML = '';
  
  if (attachedFiles.length === 0) {
    previewContainer.classList.remove('has-files');
    return;
  }
  
  // Label
  const label = document.createElement('div');
  label.className = 'pnd-label';
  label.innerHTML = `<span class="pnd-icon">📎</span><span>Attach</span>`;
  previewContainer.appendChild(label);
  
  // Chips
  const chips = document.createElement('div');
  chips.className = 'pnd-chips';
  
  for (const file of attachedFiles) {
    const chip = document.createElement('div');
    chip.className = `pnd-chip pnd-${file.category}`;
    chip.dataset.id = file.id;
    chip.dataset.filename = file.name;
    chip.dataset.filepath = file.path || '';
    chip.title = `Click to add "${file.name}" to input\nRight-click for more options`;
    chip.style.cursor = 'pointer';
    
    if (file.category === 'image' && file.preview) {
      chip.innerHTML = `
        <img class="pnd-thumb" src="${file.preview}">
        <span class="pnd-name">${truncate(file.name, 12)}</span>
        <button class="pnd-remove">×</button>
      `;
    } else {
      chip.innerHTML = `
        <span class="pnd-ext">.${file.extension}</span>
        <span class="pnd-name">${truncate(file.name, 12)}</span>
        <button class="pnd-remove">×</button>
      `;
    }
    
    // Click on chip to insert filename into input
    chip.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('pnd-remove')) return;
      insertFilenameToInput(file.name);
    });
    
    // Right-click context menu
    chip.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showFileContextMenu(e, file, 'attached');
    });
    
    chip.querySelector('.pnd-remove')?.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFile(file.id);
    });
    
    chips.appendChild(chip);
  }
  
  previewContainer.appendChild(chips);
  previewContainer.classList.add('has-files');
}

function reattachFile(file: AttachedFile): void {
  contextFiles = contextFiles.filter(f => f.id !== file.id);
  file.status = 'pending';
  attachedFiles.push(file);
  renderContextBar();
  renderPreviewContainer();
  updateBadge();
}

function removeContextFile(id: string): void {
  const file = contextFiles.find(f => f.id === id);
  if (file) {
    contextFiles = contextFiles.filter(f => f.id !== id);
    fileContextStore.delete(file.name.toLowerCase());
    renderContextBar();
  }
}

function clearContextFiles(): void {
  contextFiles = [];
  fileContextStore.clear();
  renderContextBar();
}

// ============================================================================
// TAURI DRAG & DROP - Only valid in input area
// ============================================================================

let isOverInputArea = false;
let isDragging = false;

async function setupTauriDragDrop(): Promise<void> {
  console.log('🔧 Setting up Tauri drag drop...');
  
  const ev = (window as any).__TAURI__?.event;
  if (!ev?.listen) {
    console.warn('⚠️ Tauri event API not available');
    setupBrowserDragDetection();
    return;
  }
  
  try {
    // Tauri drag-enter: start tracking
    await ev.listen('tauri://drag-enter', () => {
      console.log('📥 Tauri: drag-enter');
      isDragging = true;
    });
    
    // Tauri drag-over: check position (fires continuously with mouse position)
    await ev.listen('tauri://drag-over', (e: any) => {
      if (!isDragging) return;
      
      const pos = e.payload?.position || e.payload;
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        checkInputAreaPosition(pos.x, pos.y);
      }
    });
    
    // Tauri drag-leave: hide and reset
    await ev.listen('tauri://drag-leave', () => {
      console.log('📤 Tauri: drag-leave');
      isDragging = false;
      isOverInputArea = false;
      hideDropZone();
    });
    
    // Tauri drag-drop: process if over input area
    await ev.listen('tauri://drag-drop', async (e: any) => {
      console.log('📦 Tauri: drag-drop, isOverInputArea:', isOverInputArea);
      isDragging = false;
      
      if (isOverInputArea) {
        const paths = e.payload?.paths || e.payload;
        console.log('📁 Processing paths:', paths);
        if (Array.isArray(paths)) {
          for (const p of paths) await addFileFromPath(p);
        }
      } else {
        console.log('⚠️ Drop ignored - not over input area');
      }
      
      isOverInputArea = false;
      hideDropZone();
    });
    
    console.log('✅ Tauri drag events registered');
  } catch (e) {
    console.error('❌ Tauri drag setup error:', e);
  }
  
  // Also setup browser detection as fallback
  setupBrowserDragDetection();
}

function checkInputAreaPosition(x: number, y: number): void {
  const inputArea = document.querySelector('.chat-input-area');
  if (!inputArea) return;
  
  const rect = inputArea.getBoundingClientRect();
  const wasOver = isOverInputArea;
  
  isOverInputArea = (x >= rect.left && x <= rect.right && 
                     y >= rect.top && y <= rect.bottom);
  
  if (isOverInputArea && !wasOver) {
    console.log('✅ Entered input area at', x, y);
    showDropZone();
  } else if (!isOverInputArea && wasOver) {
    console.log('❌ Left input area');
    hideDropZone();
  }
}

function setupBrowserDragDetection(): void {
  console.log('🔧 Setting up browser drag detection...');
  
  const inputArea = document.querySelector('.chat-input-area');
  if (!inputArea) {
    setTimeout(setupBrowserDragDetection, 500);
    return;
  }
  
  // Browser dragover for position tracking
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.clientX > 0 && e.clientY > 0) {
      checkInputAreaPosition(e.clientX, e.clientY);
    }
  });
  
  // Browser drop handler
  inputArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('📦 Browser drop on input area');
    
    const files = (e as DragEvent).dataTransfer?.files;
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        await addFileFromBrowser(file);
      }
    }
    isOverInputArea = false;
    hideDropZone();
  });
  
  console.log('✅ Browser drag detection ready');
}

function showDropZone(): void {
  const box = document.querySelector('.chat-input-box') as HTMLElement;
  if (!box) return;
  
  box.classList.add('drag-over');
  
  let ov = document.getElementById('drop-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'drop-overlay';
    ov.innerHTML = `<div class="drop-inner">
      <svg class="drop-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <span>Drop files here</span>
    </div>`;
    box.style.position = 'relative';
    box.appendChild(ov);
  }
  ov.classList.add('visible');
}

function hideDropZone(): void {
  document.querySelector('.chat-input-box')?.classList.remove('drag-over');
  document.getElementById('drop-overlay')?.classList.remove('visible');
}

// ============================================================================
// FILE PROCESSING
// ============================================================================

async function addFileFromPath(path: string): Promise<void> {
  try {
    const name = path.split(/[/\\]/).pop() || 'file';
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const cat = getCategory(ext);
    
    let content: string | null = null;
    let size = 0;
    
    if (cat === 'code' || cat === 'text') {
      try {
        const fs = (window as any).__TAURI__?.fs;
        if (fs?.readTextFile) {
          content = await fs.readTextFile(path);
          size = content.length;
        }
      } catch {}
    }
    
    const file: AttachedFile = {
      id: genId(), name, path, extension: ext, size, content,
      icon: ICONS[ext] || ICONS.default, category: cat, status: 'pending'
    };
    
    attachedFiles.push(file);
    renderPreviewContainer();
    updateBadge();
  } catch {}
}

export async function addFileFromBrowser(file: File): Promise<void> {
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const cat = getCategory(ext);
    
    let content: string | null = null;
    let preview: string | undefined;
    
    if (cat === 'image') {
      preview = await readDataURL(file);
      content = preview;
    } else if (cat === 'code' || cat === 'text') {
      content = await readText(file);
    }
    
    const f: AttachedFile = {
      id: genId(), name: file.name, extension: ext, size: file.size,
      content, preview, icon: ICONS[ext] || ICONS.default,
      category: cat, status: 'pending'
    };
    
    attachedFiles.push(f);
    renderPreviewContainer();
    updateBadge();
  } catch {}
}

// ============================================================================
// INSERT FILENAME TO CHAT INPUT
// ============================================================================

function insertFilenameToInput(filename: string): void {
  const input = document.getElementById('ai-assistant-input') as HTMLTextAreaElement;
  if (!input) return;
  
  const currentText = input.value.trim();
  const fileRef = `[📎 ${filename}]`;
  
  // Add filename reference to input
  if (currentText) {
    // Append to existing text
    input.value = `${currentText} ${fileRef} `;
  } else {
    // Set as new text
    input.value = `${fileRef} `;
  }
  
  // Trigger input event so any listeners update
  input.dispatchEvent(new Event('input', { bubbles: true }));
  
  // Focus the input
  input.focus();
  
  // Move cursor to end
  input.selectionStart = input.selectionEnd = input.value.length;
}

// ============================================================================
// FILE PROCESSING ANIMATION
// ============================================================================

// Start processing animation ONLY for files specifically mentioned in message
export function startFileProcessing(message: string): void {
  const lowerMsg = message.toLowerCase();
  
  console.log('🎬 startFileProcessing called with message:', message.substring(0, 100));
  
  // Check all file chips (both pending and context)
  document.querySelectorAll('.pnd-chip, .ctx-chip').forEach(chip => {
    const nameEl = chip.querySelector('.pnd-name, .ctx-name');
    if (!nameEl) return;
    
    const fullName = (chip as HTMLElement).dataset.filename || nameEl.textContent || '';
    const baseName = fullName.replace(/\.[^.]+$/, '').toLowerCase();
    const ext = fullName.split('.').pop()?.toLowerCase() || '';
    
    console.log('🔍 Checking file:', fullName);
    
    // Only match if file is EXPLICITLY mentioned
    // Check for: [📎 filename.ts] or just filename.ts or filename
    const patterns = [
      `[📎 ${fullName}]`.toLowerCase(),
      `📎 ${fullName}`.toLowerCase(),
      fullName.toLowerCase(),
      // Also check if basename is mentioned (without extension)
      baseName
    ];
    
    let matched = false;
    for (const pattern of patterns) {
      if (pattern && lowerMsg.includes(pattern)) {
        matched = true;
        break;
      }
    }
    
    if (matched) {
      chip.classList.add('processing');
      console.log('✅ File matched, adding processing class:', fullName);
    }
  });
}

// Start processing animation for ALL attached/context files (use sparingly)
export function startAllFileProcessing(): void {
  console.log('🎬 startAllFileProcessing called');
  document.querySelectorAll('.pnd-chip, .ctx-chip').forEach(chip => {
    chip.classList.add('processing');
  });
}

// Start processing animation for ATTACHED files only (blue bar)
export function startAttachedProcessing(): void {
  console.log('🎬 startAttachedProcessing called');
  document.querySelectorAll('.pnd-chip').forEach(chip => {
    chip.classList.add('processing');
  });
}

// Stop all processing animations
export function stopFileProcessing(): void {
  console.log('🛑 stopFileProcessing called');
  document.querySelectorAll('.pnd-chip.processing, .ctx-chip.processing').forEach(chip => {
    chip.classList.remove('processing');
  });
}

// Stop processing for specific file
export function stopFileProcessingByName(filename: string): void {
  document.querySelectorAll('.pnd-chip, .ctx-chip').forEach(chip => {
    const nameEl = chip.querySelector('.pnd-name, .ctx-name');
    if (nameEl && nameEl.textContent?.includes(filename.substring(0, 10))) {
      chip.classList.remove('processing');
    }
  });
}

// ============================================================================
// FILE CONTEXT MENU (Right-Click)
// ============================================================================

function showFileContextMenu(e: MouseEvent, file: AttachedFile, type: 'attached' | 'context'): void {
  // Remove existing menu
  hideFileContextMenu();
  
  const menu = document.createElement('div');
  menu.id = 'file-context-menu';
  menu.className = 'file-context-menu';
  
  // Menu items
  const menuItems = [
    { icon: '📝', label: 'Add to Input', action: () => insertFilenameToInput(file.name) },
    { icon: '📋', label: 'Copy Filename', action: () => copyToClipboard(file.name) },
    { icon: '📄', label: 'Copy Content', action: () => copyToClipboard(file.content || ''), disabled: !file.content },
    { type: 'separator' },
    { icon: '📂', label: 'Open Folder', action: () => openFileFolder(file.path), disabled: !file.path },
    { icon: '📖', label: 'Open in Editor', action: () => openInEditor(file.path || file.name), disabled: !file.path },
    { type: 'separator' },
    { icon: '🔄', label: type === 'context' ? 'Re-attach File' : 'Move to Context', action: () => {
      if (type === 'context') {
        reattachFile(file);
      } else {
        // Move attached to context
        file.status = 'read';
        contextFiles.push(file);
        addToFileContext(file);
        attachedFiles = attachedFiles.filter(f => f.id !== file.id);
        renderPreviewContainer();
        renderContextBar();
        updateBadge();
      }
    }},
    { icon: '❌', label: 'Remove', action: () => {
      if (type === 'attached') {
        removeFile(file.id);
      } else {
        removeContextFile(file.id);
      }
    }, danger: true },
  ];
  
  for (const item of menuItems) {
    if (item.type === 'separator') {
      const sep = document.createElement('div');
      sep.className = 'file-menu-separator';
      menu.appendChild(sep);
    } else {
      const menuItem = document.createElement('div');
      menuItem.className = 'file-menu-item' + (item.disabled ? ' disabled' : '') + (item.danger ? ' danger' : '');
      menuItem.innerHTML = `<span class="file-menu-icon">${item.icon}</span><span class="file-menu-label">${item.label}</span>`;
      
      if (!item.disabled) {
        menuItem.addEventListener('click', () => {
          item.action?.();
          hideFileContextMenu();
        });
      }
      
      menu.appendChild(menuItem);
    }
  }
  
  // Position menu
  document.body.appendChild(menu);
  
  // Adjust position if menu goes off-screen
  const rect = menu.getBoundingClientRect();
  let x = e.clientX;
  let y = e.clientY;
  
  if (x + rect.width > window.innerWidth) {
    x = window.innerWidth - rect.width - 10;
  }
  if (y + rect.height > window.innerHeight) {
    y = window.innerHeight - rect.height - 10;
  }
  
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  
  // Close on click outside
  setTimeout(() => {
    document.addEventListener('click', hideFileContextMenu, { once: true });
    document.addEventListener('contextmenu', hideFileContextMenu, { once: true });
  }, 10);
}

function hideFileContextMenu(): void {
  const menu = document.getElementById('file-context-menu');
  if (menu) menu.remove();
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).then(() => {
    showNotification('Copied to clipboard!', 'success');
  }).catch(() => {
    showNotification('Failed to copy', 'error');
  });
}

// ============================================================================
// FIXED: Open Folder - Uses same strategy as fileSystem.ts
// ============================================================================

/**
 * Check if Tauri is available
 */
function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && 
         '__TAURI__' in window && 
         (window as any).__TAURI__?.core?.invoke !== undefined;
}

/**
 * Open the folder containing a file in the system file explorer
 * Uses the reveal_in_explorer Tauri command (same as fileSystem.ts)
 * On Windows: Opens folder and selects the file
 * On macOS: Opens Finder and selects the file
 * On Linux: Opens file manager at folder location
 */
async function openFileFolder(path?: string): Promise<void> {
  if (!path) {
    showNotification('No file path available', 'error');
    return;
  }
  
  console.log('📂 Opening folder for:', path);
  
  if (isTauriAvailable()) {
    try {
      // Use the same Rust command as fileSystem.ts - reveal_in_explorer
      // This command handles both files and directories correctly
      // For files: opens parent folder and selects the file (explorer /select,)
      // For directories: opens the folder directly
      await invoke('reveal_in_explorer', { path: path });
      
      console.log('✅ Revealed in explorer successfully');
      showNotification('Opened in file explorer', 'success');
    } catch (err: any) {
      console.error('❌ Failed to reveal in explorer:', err);
      showNotification(`Failed to open folder: ${err.message || err}`, 'error');
      
      // Fallback: copy path to clipboard
      try {
        await navigator.clipboard.writeText(path);
        showNotification('Path copied to clipboard', 'info');
      } catch (clipErr) {
        console.error('Clipboard fallback failed:', clipErr);
        prompt('Copy this path manually:', path);
      }
    }
  } else {
    // Browser fallback: copy path to clipboard
    console.warn('⚠️ Tauri not available - copying path to clipboard');
    showNotification('Open folder not available in browser mode', 'info');
    
    try {
      await navigator.clipboard.writeText(path);
      showNotification('Path copied! Paste in your file manager', 'info');
    } catch (err) {
      prompt('Copy this path manually:', path);
    }
  }
}

function openInEditor(pathOrName: string): void {
  // Dispatch event for editor to handle
  document.dispatchEvent(new CustomEvent('open-file-in-editor', {
    detail: { path: pathOrName, name: pathOrName.split(/[/\\]/).pop() }
  }));
  
  // Also try window function if available
  const openFile = (window as any).openFileInEditor || (window as any).openFile;
  if (typeof openFile === 'function') {
    openFile(pathOrName);
  }
}

function showNotification(message: string, type: 'success' | 'error' | 'info'): void {
  const colors = {
    success: '#4caf50',
    error: '#f44336',
    info: '#2196f3'
  };
  
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px;
    background: ${colors[type]};
    color: white;
    border-radius: 6px;
    font-size: 13px;
    z-index: 10000;
    animation: fadeInOut 2s ease forwards;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// ============================================================================
// PUBLIC API
// ============================================================================

export function removeFile(id: string): void {
  attachedFiles = attachedFiles.filter(f => f.id !== id);
  renderPreviewContainer();
  updateBadge();
}

export function markFilesAsRead(): void {
  for (const f of attachedFiles) {
    f.status = 'read';
    contextFiles.push(f);
    addToFileContext(f);
  }
  attachedFiles = [];
  renderPreviewContainer();
  renderContextBar();
  updateBadge();
}

export function clearAllFiles(): void {
  attachedFiles = [];
  renderPreviewContainer();
  updateBadge();
}

export function getAttachedFiles(): AttachedFile[] { return [...attachedFiles]; }
export function getContextFiles(): AttachedFile[] { return [...contextFiles]; }
export function getFilesInMemory() { return [...fileContextStore.values()]; }
export function clearMemory(): void { contextFiles = []; fileContextStore.clear(); renderContextBar(); }

export function getFilesForAI(): string {
  if (attachedFiles.length === 0) return '';
  
  let out = '\n\n---\n📎 **Attached Files:**\n';
  for (const f of attachedFiles) {
    if (f.category === 'image') {
      out += `\n🖼️ **${f.name}** [Image]\n`;
    } else if (f.content) {
      const lines = (f.content.match(/\n/g) || []).length + 1;
      out += `\n### ${f.name} (${lines} lines)\n\`\`\`${f.extension}\n${f.content.substring(0, 50000)}\n\`\`\`\n`;
    }
  }
  return out;
}

// Get collapsible file cards for UI display (compact, expandable)
export function getFilesForUI(): string {
  if (attachedFiles.length === 0) return '';
  
  let html = '';
  
  for (const f of attachedFiles) {
    let lines = f.content ? (f.content.match(/\n/g) || []).length + 1 : 0;
    let sizeStr = formatFileSize(f.size || f.content?.length || 0);
    const icon = getFileIcon(f.category, f.extension);
    const uniqueId = `file-preview-${f.id}`;
    
    // ✅ Special handling for PDFs - show extracted text info
    let detailsStr = `${f.extension.toUpperCase()} • ${lines} lines • ${sizeStr}`;
    
    // Check if this is a PDF (by category, extension, or filename)
    const isPdf = f.category === 'pdf' || 
                  f.extension?.toLowerCase() === 'pdf' || 
                  f.name?.toLowerCase().endsWith('.pdf');
    
    if (isPdf) {
      const pdfMgr = (window as any).pdfContextManager;
      if (pdfMgr && pdfMgr.attachments && pdfMgr.attachments.size > 0) {
        // Find matching PDF by filename (try multiple approaches)
        for (const [, att] of pdfMgr.attachments) {
          // Match by exact name or basename
          const attName = att.fileName?.toLowerCase() || '';
          const fName = f.name?.toLowerCase() || '';
          const matches = attName === fName || 
                         attName.includes(fName.replace('.pdf', '')) ||
                         fName.includes(attName.replace('.pdf', ''));
          
          if (matches && att.extractedText) {
            const charCount = att.extractedText.length;
            const extractedLines = (att.extractedText.match(/\n/g) || []).length + 1;
            detailsStr = `PDF • ${extractedLines} lines • ${formatFileSize(charCount)}`;
            break;
          } else if (matches && att.isExtracting) {
            detailsStr = `PDF • extracting...`;
            break;
          } else if (matches && att.error) {
            detailsStr = `PDF • error`;
            break;
          }
        }
      }
    }
    
    // Escape content for HTML
    const escapedContent = f.content 
      ? f.content.substring(0, 10000)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
      : '';
    
    html += `
      <div class="file-preview-card" data-file-id="${f.id}">
        <div class="file-preview-header" onclick="toggleFilePreview('${uniqueId}')">
          <div class="file-preview-info">
            <span class="file-preview-icon">${icon}</span>
            <span class="file-preview-name">${f.name}</span>
          </div>
          <div class="file-preview-meta">
            <span class="file-preview-details">${detailsStr}</span>
            <span class="file-preview-toggle" id="${uniqueId}-toggle">▶</span>
          </div>
        </div>
        <div class="file-preview-content" id="${uniqueId}" style="display: none;">
          <pre><code>${escapedContent}${f.content && f.content.length > 10000 ? '\n... (truncated)' : ''}</code></pre>
        </div>
      </div>
    `;
  }
  
  return html;
}

// ✅ Refresh PDF file card details after extraction completes
export function refreshPdfFileCard(fileName: string): void {
  const pdfMgr = (window as any).pdfContextManager;
  if (!pdfMgr) return;
  
  // Find the extracted text info
  let extractedInfo = '';
  for (const [, att] of pdfMgr.attachments || []) {
    if (att.fileName === fileName && att.extractedText) {
      const charCount = att.extractedText.length;
      const extractedLines = (att.extractedText.match(/\n/g) || []).length + 1;
      extractedInfo = `PDF • ${extractedLines} lines • ${formatFileSize(charCount)}`;
      break;
    }
  }
  
  if (!extractedInfo) return;
  
  // Update all file cards with this filename (check multiple variations)
  document.querySelectorAll('.file-preview-card').forEach(card => {
    const nameEl = card.querySelector('.file-preview-name');
    const detailsEl = card.querySelector('.file-preview-details');
    if (nameEl && detailsEl) {
      const cardName = nameEl.textContent?.toLowerCase() || '';
      const targetName = fileName.toLowerCase();
      // Match exact name or if one contains the other
      if (cardName === targetName || 
          cardName.includes(targetName.replace('.pdf', '')) ||
          targetName.includes(cardName.replace('.pdf', ''))) {
        detailsEl.textContent = extractedInfo;
        console.log(`📕 Updated file card: ${fileName} → ${extractedInfo}`);
      }
    }
  });
}

// Get simple text representation for user message display (no full content)
export function getFilesDisplayText(): string {
  if (attachedFiles.length === 0) return '';
  
  const fileNames = attachedFiles.map(f => `[📎 ${f.name}]`).join(' ');
  return fileNames;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(category: string, ext: string): string {
  const icons: Record<string, string> = {
    'code': '📄',
    'image': '🖼️',
    'text': '📝',
    'pdf': '📕',
    'document': '📘',
    'other': '📁'
  };
  return icons[category] || '📄';
}

export function openFilePicker(): void {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.multiple = true;
  inp.onchange = async (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files) for (const f of Array.from(files)) await addFileFromBrowser(f);
  };
  inp.click();
}

// ============================================================================
// HELPERS
// ============================================================================

function enhanceUploadButton(): void {
  const btn = document.querySelector('#assistant-upload, [title*="Upload"], .input-tools button:nth-child(4)');
  if (!btn) { setTimeout(enhanceUploadButton, 1000); return; }
  
  const n = btn.cloneNode(true) as HTMLElement;
  btn.parentNode?.replaceChild(n, btn);
  n.addEventListener('click', (e) => { e.preventDefault(); openFilePicker(); });
  n.style.position = 'relative';
}

function setupPaste(): void {
  document.getElementById('ai-assistant-input')?.addEventListener('paste', async (e) => {
    const items = (e as ClipboardEvent).clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const f = item.getAsFile();
        if (f) { e.preventDefault(); await addFileFromBrowser(f); }
      }
    }
  });
}

function updateBadge(): void {
  const btn = document.querySelector('#assistant-upload, [title*="Upload"], .input-tools button:nth-child(4)');
  if (!btn) return;
  
  let badge = btn.querySelector('.attach-badge') as HTMLElement;
  if (attachedFiles.length > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'attach-badge';
      (btn as HTMLElement).style.position = 'relative';
      btn.appendChild(badge);
    }
    badge.textContent = String(attachedFiles.length);
    badge.style.display = 'flex';
  } else if (badge) {
    badge.style.display = 'none';
  }
}

function getCategory(ext: string): AttachedFile['category'] {
  if (CODE_EXT.includes(ext)) return 'code';
  if (IMAGE_EXT.includes(ext)) return 'image';
  if (TEXT_EXT.includes(ext)) return 'text';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx', 'xls', 'xlsx'].includes(ext)) return 'document';
  return 'other';
}

function genId(): string { return Math.random().toString(36).substr(2, 9); }
function truncate(s: string, n: number): string { return s.length > n ? s.slice(0, n-1) + '…' : s; }
function readText(f: File): Promise<string> {
  return new Promise((r, j) => { const x = new FileReader(); x.onload = () => r(x.result as string); x.onerror = j; x.readAsText(f); });
}
function readDataURL(f: File): Promise<string> {
  return new Promise((r, j) => { const x = new FileReader(); x.onload = () => r(x.result as string); x.onerror = j; x.readAsDataURL(f); });
}

// ============================================================================
// STYLES - Professional Compact Design
// ============================================================================

function injectStyles(): void {
  if (document.getElementById('file-attach-css')) return;
  const s = document.createElement('style');
  s.id = 'file-attach-css';
  s.textContent = `
    /* Context Bar - Grey (files read by AI) */
    .file-context-bar {
      display: none;
      align-items: center;
      gap: 8px;
      padding: 5px 10px;
      margin-bottom: 4px;
      background: rgba(80, 80, 80, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
    }
    .file-context-bar.has-files { display: flex; }
    
    .ctx-label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      color: rgba(255,255,255,0.4);
      padding-right: 8px;
      border-right: 1px solid rgba(255,255,255,0.1);
      white-space: nowrap;
    }
    .ctx-icon { font-size: 11px; }
    .ctx-count {
      background: rgba(255,255,255,0.1);
      padding: 1px 5px;
      border-radius: 8px;
      font-size: 9px;
    }
    
    .ctx-chips {
      display: flex;
      gap: 5px;
      flex: 1;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .ctx-chips::-webkit-scrollbar { display: none; }
    
    .ctx-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 7px;
      background: rgba(100,100,100,0.2);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 5px;
      font-size: 11px;
      color: rgba(255,255,255,0.55);
      cursor: pointer;
      transition: all 0.12s;
      white-space: nowrap;
    }
    .ctx-chip:hover {
      background: rgba(120,120,120,0.3);
      color: rgba(255,255,255,0.8);
    }
    
    .ctx-dot {
      width: 5px; height: 5px;
      background: #4CAF50;
      border-radius: 50%;
    }
    .ctx-name { max-width: 70px; overflow: hidden; text-overflow: ellipsis; }
    .ctx-remove {
      width: 14px; height: 14px;
      background: transparent;
      border: none;
      color: rgba(255,255,255,0.3);
      font-size: 12px;
      cursor: pointer;
      opacity: 0;
      transition: all 0.12s;
      border-radius: 3px;
    }
    .ctx-chip:hover .ctx-remove { opacity: 1; }
    .ctx-remove:hover { background: rgba(255,69,58,0.5); color: white; }
    
    .ctx-clear {
      background: transparent;
      border: none;
      color: rgba(255,255,255,0.25);
      font-size: 14px;
      cursor: pointer;
      padding: 2px 5px;
      border-radius: 4px;
    }
    .ctx-clear:hover { background: rgba(255,69,58,0.3); color: #ff6b6b; }
    
    /* Pending Bar - Blue (files to send) */
    .attached-files-preview {
      display: none;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      margin-bottom: 4px;
      background: rgba(10, 132, 255, 0.08);
      border: 1px solid rgba(10, 132, 255, 0.15);
      border-radius: 8px;
    }
    .attached-files-preview.has-files { display: flex; }
    
    .pnd-label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      color: rgba(10, 132, 255, 0.7);
      padding-right: 8px;
      border-right: 1px solid rgba(10, 132, 255, 0.2);
      white-space: nowrap;
    }
    .pnd-icon { font-size: 11px; }
    
    .pnd-chips { display: flex; gap: 5px; flex-wrap: wrap; flex: 1; }
    
    .pnd-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      background: rgba(10, 132, 255, 0.12);
      border: 1px solid rgba(10, 132, 255, 0.25);
      border-radius: 5px;
      font-size: 11px;
      color: rgba(255,255,255,0.85);
      transition: all 0.12s;
      position: relative;
      overflow: hidden;
    }
    .pnd-chip:hover { background: rgba(10, 132, 255, 0.2); }
    
    /* Processing animation line */
    .pnd-chip.processing::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2px;
      width: 100%;
      background: linear-gradient(90deg, 
        transparent 0%,
        #4fc3f7 20%,
        #0a84ff 50%,
        #4fc3f7 80%,
        transparent 100%
      );
      background-size: 200% 100%;
      animation: fileProcessing 1.5s linear infinite;
    }
    .pnd-chip.processing {
      border-color: #0a84ff;
      box-shadow: 0 0 8px rgba(10, 132, 255, 0.3);
    }
    
    /* Context chip processing */
    .ctx-chip {
      position: relative;
      overflow: hidden;
    }
    .ctx-chip.processing::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2px;
      width: 100%;
      background: linear-gradient(90deg, 
        transparent 0%,
        #4fc3f7 20%,
        #0a84ff 50%,
        #4fc3f7 80%,
        transparent 100%
      );
      background-size: 200% 100%;
      animation: fileProcessing 1.5s linear infinite;
    }
    .ctx-chip.processing {
      border-color: #4fc3f7;
      box-shadow: 0 0 8px rgba(79, 195, 247, 0.3);
    }
    .ctx-chip.processing .ctx-dot {
      background: #4fc3f7;
      animation: dotPulse 1s ease-in-out infinite;
    }
    
    @keyframes fileProcessing {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @keyframes dotPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.7; }
    }
    
    .pnd-ext {
      font-size: 9px;
      font-weight: 600;
      color: rgba(10, 132, 255, 0.9);
      background: rgba(10, 132, 255, 0.15);
      padding: 1px 4px;
      border-radius: 3px;
    }
    .pnd-thumb { width: 18px; height: 18px; border-radius: 3px; object-fit: cover; }
    .pnd-name { max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pnd-remove {
      width: 14px; height: 14px;
      background: rgba(255,69,58,0.7);
      border: none; border-radius: 50%;
      color: white; font-size: 10px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.12s;
    }
    .pnd-chip:hover .pnd-remove { opacity: 1; }
    .pnd-remove:hover { background: #ff453a; }
    
    /* Category colors */
    .pnd-code .pnd-ext { color: #0a84ff; background: rgba(10,132,255,0.15); }
    .pnd-image .pnd-ext { color: #30d158; background: rgba(48,209,88,0.15); }
    .pnd-text .pnd-ext { color: #ff9f0a; background: rgba(255,159,10,0.15); }
    .pnd-pdf .pnd-ext { color: #ff453a; background: rgba(255,69,58,0.15); }
    
    /* Drop Zone */
    .chat-input-box {
      position: relative;
    }
    .chat-input-box.drag-over {
      border-color: #0a84ff !important;
      box-shadow: 0 0 0 2px rgba(10,132,255,0.2) inset;
    }
    #drop-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(180deg, 
        rgba(10,132,255,0.95) 0%,
        rgba(30,144,255,0.9) 100%
      );
      border-radius: inherit;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; visibility: hidden;
      transition: all 0.15s; z-index: 100;
      overflow: hidden;
    }
    #drop-overlay::before {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 200%;
      height: 100%;
      background: 
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,60 C150,120 350,0 600,60 C850,120 1050,0 1200,60 L1200,120 L0,120 Z' fill='rgba(255,255,255,0.08)'/%3E%3C/svg%3E"),
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,60 C150,0 350,120 600,60 C850,0 1050,120 1200,60 L1200,120 L0,120 Z' fill='rgba(255,255,255,0.05)'/%3E%3C/svg%3E");
      background-size: 600px 60px, 800px 80px;
      background-position: 0 100%, 0 100%;
      background-repeat: repeat-x;
      animation: waveFlow 3s linear infinite;
    }
    #drop-overlay::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 200%;
      height: 100%;
      background: 
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,40 C200,100 400,0 600,40 C800,80 1000,0 1200,40 L1200,120 L0,120 Z' fill='rgba(79,195,247,0.15)'/%3E%3C/svg%3E");
      background-size: 500px 50px;
      background-position: 0 100%;
      background-repeat: repeat-x;
      animation: waveFlow 2s linear infinite reverse;
    }
    @keyframes waveFlow {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    #drop-overlay.visible { opacity: 1; visibility: visible; }
    .drop-inner { 
      text-align: center; 
      color: white; 
      font-size: 14px; 
      font-weight: 500;
      position: relative; 
      z-index: 1;
      text-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .drop-inner .drop-icon {
      display: block;
      margin: 0 auto 8px;
      animation: dropBounce 0.6s ease-in-out infinite;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.15));
    }
    @keyframes dropBounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    
    /* Badge */
    .attach-badge {
      position: absolute; top: -4px; right: -4px;
      min-width: 15px; height: 15px;
      background: #0a84ff;
      border: 1.5px solid #1c1c1e;
      border-radius: 8px;
      color: white; font-size: 9px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    
    /* Collapsible File Preview Cards */
    .file-preview-card {
      background: rgba(30, 30, 30, 0.9);
      border: 1px solid rgba(79, 195, 247, 0.3);
      border-radius: 8px;
      margin: 8px 0;
      overflow: hidden;
      transition: all 0.2s ease;
    }
    .file-preview-card:hover {
      border-color: rgba(79, 195, 247, 0.5);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
    
    .file-preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      cursor: pointer;
      background: rgba(40, 40, 40, 0.5);
      transition: background 0.15s ease;
    }
    .file-preview-header:hover {
      background: rgba(50, 50, 50, 0.7);
    }
    
    .file-preview-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .file-preview-icon {
      font-size: 16px;
    }
    .file-preview-name {
      font-weight: 500;
      color: #4fc3f7;
      font-size: 13px;
    }
    
    .file-preview-meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .file-preview-details {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
    }
    .file-preview-toggle {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.4);
      transition: transform 0.2s ease;
      width: 16px;
      text-align: center;
    }
    .file-preview-toggle.expanded {
      transform: rotate(90deg);
    }
    
    .file-preview-content {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      max-height: 300px;
      overflow: auto;
      background: rgba(20, 20, 20, 0.8);
    }
    .file-preview-content pre {
      margin: 0;
      padding: 12px;
      font-size: 12px;
      line-height: 1.5;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    }
    .file-preview-content code {
      color: rgba(255, 255, 255, 0.85);
      white-space: pre-wrap;
      word-break: break-all;
    }
    
    /* Scrollbar for file preview */
    .file-preview-content::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    .file-preview-content::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
    }
    .file-preview-content::-webkit-scrollbar-thumb {
      background: rgba(79, 195, 247, 0.3);
      border-radius: 4px;
    }
    .file-preview-content::-webkit-scrollbar-thumb:hover {
      background: rgba(79, 195, 247, 0.5);
    }
    
    /* File Context Menu (Right-Click) */
    .file-context-menu {
      position: fixed;
      background: rgba(30, 30, 30, 0.98);
      border: 1px solid rgba(79, 195, 247, 0.3);
      border-radius: 8px;
      padding: 6px 0;
      min-width: 180px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      z-index: 10000;
      animation: menuFadeIn 0.15s ease;
    }
    
    @keyframes menuFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    
    .file-menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 14px;
      cursor: pointer;
      transition: background 0.1s ease;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.85);
    }
    
    .file-menu-item:hover {
      background: rgba(79, 195, 247, 0.15);
    }
    
    .file-menu-item.disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    
    .file-menu-item.disabled:hover {
      background: transparent;
    }
    
    .file-menu-item.danger:hover {
      background: rgba(244, 67, 54, 0.2);
      color: #f44336;
    }
    
    .file-menu-icon {
      font-size: 14px;
      width: 20px;
      text-align: center;
    }
    
    .file-menu-label {
      flex: 1;
    }
    
    .file-menu-separator {
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
      margin: 6px 10px;
    }
    
    /* Toast notification animation */
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translate(-50%, 10px); }
      15% { opacity: 1; transform: translate(-50%, 0); }
      85% { opacity: 1; transform: translate(-50%, 0); }
      100% { opacity: 0; transform: translate(-50%, -10px); }
    }
  `;
  document.head.appendChild(s);
}

// ============================================================================
// WINDOW API
// ============================================================================

function exposeAPI(): void {
  (window as any).chatFileDrop = {
    init: initChatFileDrop,
    getFiles: getAttachedFiles,
    getFilesForAI,
    getFilesForUI,
    getFilesDisplayText,
    clearFiles: clearAllFiles,
    removeFile,
    openPicker: openFilePicker,
    addFile: addFileFromBrowser,
    attachedCount: () => attachedFiles.length,
    markAsRead: markFilesAsRead,
    enhanceWithContext: enhanceWithFileContext,
    getContextSummary: getFileContextSummary,
    getFilesInMemory,
    getContextFiles,
    clearMemory,
    // Processing animation
    startProcessing: startFileProcessing,
    startAllProcessing: startAllFileProcessing,
    startAttachedProcessing: startAttachedProcessing,
    stopProcessing: stopFileProcessing,
    stopProcessingFile: stopFileProcessingByName,
    // Open folder (exposed for external use)
    openFolder: openFileFolder,
    // PDF support
    refreshPdfFileCard: refreshPdfFileCard,
    debug: () => {
      console.log('Pending:', attachedFiles.length, '| Context:', contextFiles.length, '| Memory:', fileContextStore.size);
      for (const f of fileContextStore.values()) console.log(`  ${f.name} (${f.lineCount}L)`);
    }
  };
  
  // Add global toggle function for file previews
  (window as any).toggleFilePreview = (id: string) => {
    const content = document.getElementById(id);
    const toggle = document.getElementById(id + '-toggle');
    if (content && toggle) {
      const isHidden = content.style.display === 'none';
      content.style.display = isHidden ? 'block' : 'none';
      toggle.textContent = isHidden ? '▼' : '▶';
      toggle.classList.toggle('expanded', isHidden);
    }
  };
}

export default initChatFileDrop;
