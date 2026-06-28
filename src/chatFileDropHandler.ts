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
let previewExpanded = false; // collapse state for the attach (pending) bar when many files
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
  setTimeout(injectAddPathButton, 3500); // 🔗 add the 'Add path' button AFTER toolbar restructure settles
  hideModeToggles(); // hide Auto Mode (sparkle) + AI Search (star) toggles
  installFloatingTooltips(); // tooltips for all toolbar buttons (escapes overflow clip)
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

// Language accent color for a file extension (used by the expanded VS Code-style list)
function langColor(ext: string): string {
  const e = (ext || '').toLowerCase();
  const map: Record<string, string> = {
    ts: '#519aba', tsx: '#519aba', js: '#cbcb41', jsx: '#cbcb41', mjs: '#cbcb41',
    json: '#cbcb41', py: '#3572A5', rs: '#dea584', go: '#00ADD8', java: '#b07219',
    cpp: '#f34b7d', c: '#555555', cs: '#178600', rb: '#701516', php: '#4F5D95',
    swift: '#F05138', kt: '#A97BFF', html: '#e34c26', css: '#563d7c', scss: '#c6538c',
    vue: '#41b883', sh: '#89e051', bat: '#C1F12E', ps1: '#012456', yaml: '#cb171e',
    yml: '#cb171e', sql: '#e38c00', md: '#083fa1', toml: '#9c4221',
    pdf: '#ff453a', doc: '#2b579a', docx: '#2b579a', xls: '#217346', xlsx: '#217346',
    png: '#a074c4', jpg: '#a074c4', jpeg: '#a074c4', gif: '#a074c4', svg: '#ffb13b',
  };
  return map[e] || '#7d8590';
}

// Show just the parent folder of a path (trimmed), not the full absolute path.
function shortenPath(fullPath: string | undefined, name: string): string {
  if (!fullPath) return '';
  let p = fullPath.replace(/\\/g, '/');
  const idx = p.lastIndexOf('/' + name);
  if (idx >= 0) p = p.slice(0, idx);
  const parts = p.split('/').filter(Boolean);
  if (parts.length === 0) return '';
  const tail = parts.slice(-2).join('/'); // last 2 folders
  return tail + '/';
}

function renderPreviewContainer(): void {
  if (!previewContainer) return;
  previewContainer.innerHTML = '';

  if (attachedFiles.length === 0) {
    previewContainer.classList.remove('has-files');
    previewContainer.classList.remove('pnd-collapsed');
    return;
  }

  // Collapse when there are many files so the bar stays one line and never
  // pushes the input box down. >=3 files collapses by default.
  const COLLAPSE_THRESHOLD = 3;
  const manyFiles = attachedFiles.length >= COLLAPSE_THRESHOLD;
  const collapsed = manyFiles && !previewExpanded;

  // --- Header / summary row (clickable to expand when many files) ---
  const label = document.createElement('div');
  label.className = 'pnd-label';
  if (manyFiles) {
    label.classList.add('pnd-label-toggle');
    const caret = previewExpanded ? '\u25BE' : '\u25B8'; // down / right
    const totalBytes = attachedFiles.reduce((sum, f) => sum + (f.size || f.content?.length || 0), 0);
    const sizeStr = totalBytes > 0 ? formatFileSize(totalBytes) : "";
    label.innerHTML =
      `<span class="pnd-icon">\uD83D\uDCCE</span>` +
      `<span>${attachedFiles.length} files</span>` +
      (sizeStr ? `<span class="pnd-size">\u00B7 ${sizeStr}</span>` : "") +
      `<span class="pnd-caret">${caret}</span>`;
    label.title = previewExpanded ? 'Click to collapse' : 'Click to expand';
    label.style.cursor = 'pointer';
    label.addEventListener('click', () => {
      previewExpanded = !previewExpanded;
      renderPreviewContainer();
    });
  } else {
    label.innerHTML = `<span class="pnd-icon">\uD83D\uDCCE</span><span>Attach</span>`;
  }
  previewContainer.appendChild(label);

  // "Clear all" button (only useful when many files)
  if (manyFiles) {
    const clearBtn = document.createElement('button');
    clearBtn.className = 'pnd-clearall';
    clearBtn.textContent = 'Clear all';
    clearBtn.title = 'Remove all attached files';
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearAllFiles();
    });
    previewContainer.appendChild(clearBtn);
  }

  // When collapsed, stop here — just the summary row, no chips.
  if (collapsed) {
    previewContainer.classList.add('has-files');
    previewContainer.classList.add('pnd-collapsed');
    return;
  }
  previewContainer.classList.remove('pnd-collapsed');

  // --- Expanded list (VS Code "Open Editors" style) ---
  const chips = document.createElement('div');
  chips.className = 'pnd-list';
  if (manyFiles) chips.classList.add('pnd-list-scroll'); // height-capped + scroll

  for (const file of attachedFiles) {
    const row = document.createElement('div');
    row.className = `pnd-row pnd-${file.category}`;
    row.dataset.id = file.id;
    row.dataset.filename = file.name;
    row.dataset.filepath = file.path || '';
    row.title = `Click to add "${file.name}" to input\nRight-click for more options`;

    const color = langColor(file.extension);
    const icon = (ICONS[(file.extension || '').toLowerCase()] || getFileIcon(file.category, file.extension));
    const folder = shortenPath(file.path, file.name);
    const sizeStr = formatFileSize(file.size || file.content?.length || 0);

    if (file.category === 'image' && file.preview) {
      row.innerHTML =
        `<img class="pnd-row-thumb" src="${file.preview}">` +
        `<span class="pnd-row-name">${file.name}</span>` +
        `<span class="pnd-row-folder">${folder}</span>` +
        `<span class="pnd-row-size">${sizeStr}</span>` +
        `<button class="pnd-row-x" title="Remove">\u00D7</button>`;
    } else {
      row.innerHTML =
        `<span class="pnd-row-ico" style="color:${color}">${icon}</span>` +
        `<span class="pnd-row-name">${file.name}</span>` +
        `<span class="pnd-row-folder">${folder}</span>` +
        `<span class="pnd-row-size">${sizeStr}</span>` +
        `<button class="pnd-row-x" title="Remove">\u00D7</button>`;
    }

    row.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('pnd-row-x')) return;
      insertFilenameToInput(file.name);
    });

    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showFileContextMenu(e, file, 'attached');
    });

    row.querySelector('.pnd-row-x')?.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFile(file.id);
    });

    chips.appendChild(row);
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
let isOverFilesPanel = false; // FILES/explorer panel as a second attach drop zone

// ============================================================================
// 📥 COPY DROPPED FILE INTO THE PROJECT (FILES panel drop target)
// ============================================================================

function baseName(p: string): string {
  return p.split(/[/\\]/).pop() || p;
}
function dirName(p: string): string {
  const parts = p.split(/[/\\]/);
  parts.pop();
  return parts.join('/');
}
function joinDir(dir: string, name: string): string {
  const sep = dir.includes('\\') ? '\\' : '/';
  return dir.replace(/[\\/]+$/, '') + sep + name;
}

// Resolve the target folder for a drop: the folder dropped onto if one is under
// the cursor, otherwise the project root.
function resolveDropTargetFolder(): string | null {
  // Prefer a folder row that's currently hovered/highlighted in the tree.
  const hovered = document.querySelector(
    '.file-tree-item.folder.drop-hover, .tree-item.folder.drop-hover, .file-item.folder.drag-over'
  ) as HTMLElement | null;
  const hoveredPath = hovered?.dataset?.path || hovered?.getAttribute?.('data-path');
  if (hoveredPath) return hoveredPath;

  // Else fall back to the open project root.
  return (window as any).currentProjectPath || null;
}

async function copyOneFile(srcPath: string, destFolder: string): Promise<boolean> {
  const name = baseName(srcPath);
  const dest = joinDir(destFolder, name);
  const wf = (window as any).fileSystem;
  const fs = (window as any).__TAURI__?.fs;

  // Don't copy onto itself.
  if (dest.replace(/\\/g, '/').toLowerCase() === srcPath.replace(/\\/g, '/').toLowerCase()) {
    showNotification(`${name} is already in this folder`, 'info');
    return false;
  }

  // --- Overwrite check (use window.fileSystem.readFile: success => file exists) ---
  let destExists = false;
  try {
    if (wf?.readFile) {
      const existing = await wf.readFile(dest);
      destExists = (existing !== null && existing !== undefined);
    } else if (fs?.exists) {
      destExists = await fs.exists(dest);
    }
  } catch (_) { destExists = false; }
  if (destExists) {
    const ok = window.confirm(`"${name}" already exists in this folder.\n\nOverwrite it?`);
    if (!ok) { showNotification(`Skipped ${name}`, 'info'); return false; }
  }

  // --- PRIMARY: window.fileSystem.readFile + createFile (uses the app's own Rust
  // commands which have write permission — the Tauri fs plugin is NOT allowlisted). ---
  try {
    if (wf?.readFile && wf?.createFile) {
      const content = await wf.readFile(srcPath);
      await wf.createFile(dest, content);
      console.log('📥 [CopyIntoProject] copied via window.fileSystem:', dest);
      return true;
    }
  } catch (e) {
    console.warn('📥 [CopyIntoProject] window.fileSystem copy failed, trying Tauri fs:', e);
  }

  // --- FALLBACK: Tauri fs plugin (only works if capabilities allow it). ---
  try {
    if (fs?.copyFile) { await fs.copyFile(srcPath, dest); return true; }
  } catch (e) {
    console.warn('📥 [CopyIntoProject] fs.copyFile not permitted:', e);
  }
  try {
    if (fs?.readFile && fs?.writeFile) {
      const bytes = await fs.readFile(srcPath);
      await fs.writeFile(dest, bytes);
      return true;
    }
  } catch (e) {
    console.error('📥 [CopyIntoProject] all copy methods failed for', name, e);
  }
  return false;
}

async function copyFilesIntoProject(paths: string[]): Promise<void> {
  const destFolder = resolveDropTargetFolder();
  if (!destFolder) {
    showNotification('Open a project first to drop files into it', 'error');
    return;
  }

  let copied = 0;
  for (const p of paths) {
    const ok = await copyOneFile(p, destFolder);
    if (ok) copied++;
  }

  if (copied > 0) {
    showNotification(`\U0001F4E5 Copied ${copied} file(s) into the project`, 'success');
    // Refresh the file tree so the new file(s) appear.
    try {
      document.dispatchEvent(new CustomEvent('file-tree-refresh'));
      document.dispatchEvent(new CustomEvent('refresh-file-tree'));
      (window as any).refreshFileTree?.();
    } catch (_) {}
  }
}

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
        checkFilesPanelPosition(pos.x, pos.y);
      }
    });
    
    // Tauri drag-leave: hide and reset
    await ev.listen('tauri://drag-leave', () => {
      console.log('📤 Tauri: drag-leave');
      isDragging = false;
      isOverInputArea = false;
      isOverFilesPanel = false;
      hideDropZone();
      hideFilesPanelDropZone();
    });
    
    // Tauri drag-drop: process if over input area
    await ev.listen('tauri://drag-drop', async (e: any) => {
      console.log('📦 Tauri: drag-drop, isOverInputArea:', isOverInputArea);
      isDragging = false;
      
      const paths = e.payload?.paths || e.payload;
      if (isOverFilesPanel) {
        // FILES panel -> COPY the file into the project on disk (shows in tree)
        console.log('📁 Dropped on FILES panel -> copy into project:', paths);
        if (Array.isArray(paths)) await copyFilesIntoProject(paths);
      } else if (isOverInputArea) {
        // Chat input -> attach as AI context
        console.log('📁 Dropped on input area -> attach as context:', paths);
        if (Array.isArray(paths)) {
          for (const p of paths) await addFileFromPath(p);
        }
      } else {
        console.log('⚠️ Drop ignored - not over a drop zone');
      }
      
      isOverInputArea = false;
      isOverFilesPanel = false;
      hideDropZone();
      hideFilesPanelDropZone();
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

// FILES / explorer panel as a second attach drop zone.
function checkFilesPanelPosition(x: number, y: number): void {
  const panel = document.querySelector('.explorer-panel');
  if (!panel) { isOverFilesPanel = false; return; }

  const rect = panel.getBoundingClientRect();
  const wasOver = isOverFilesPanel;
  isOverFilesPanel = (x >= rect.left && x <= rect.right &&
                      y >= rect.top && y <= rect.bottom);

  if (isOverFilesPanel && !wasOver) {
    console.log('\u2705 Entered FILES panel at', x, y);
    showFilesPanelDropZone();
  } else if (!isOverFilesPanel && wasOver) {
    console.log('\u274C Left FILES panel');
    hideFilesPanelDropZone();
  }
}

function showFilesPanelDropZone(): void {
  const panel = document.querySelector('.explorer-panel') as HTMLElement | null;
  if (!panel) return;
  panel.classList.add('x02-files-drop-active');
  if (!document.getElementById('x02-files-drop-style')) {
    const s = document.createElement('style');
    s.id = 'x02-files-drop-style';
    s.textContent =
      '.explorer-panel.x02-files-drop-active { ' +
      'outline: 2px dashed rgba(10,132,255,0.7) !important; outline-offset: -4px; ' +
      'background: rgba(10,132,255,0.06) !important; }';
    document.head.appendChild(s);
  }
}

function hideFilesPanelDropZone(): void {
  document.querySelector('.explorer-panel')?.classList.remove('x02-files-drop-active');
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
    } else if (cat === 'pdf' || cat === 'document') {
      // 📄 Read raw bytes via Tauri and extract text from PDF / DOCX / XLSX
      try {
        const fs = (window as any).__TAURI__?.fs;
        if (fs?.readFile) {
          const bytes: Uint8Array = await fs.readFile(path);
          const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
          content = await extractDocBytes(ab, ext);
          size = bytes.byteLength;
          if (content) console.log(`📄 [DocExtract] ${name}: extracted ${content.length} chars (Tauri)`);
          else console.warn(`📄 [DocExtract] ${name}: no text extracted (Tauri)`);
        }
      } catch (e) { console.warn('📄 [DocExtract] Tauri read failed for', name, e); }
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
    } else if (cat === 'pdf' || cat === 'document') {
      // 📄 Extract real text from PDF / DOCX / XLSX so the AI sees content, not just a filename
      content = await extractDocFromFile(file, ext);
      if (content) console.log(`📄 [DocExtract] ${file.name}: extracted ${content.length} chars`);
      else console.warn(`📄 [DocExtract] ${file.name}: no text extracted (will attach name only)`);
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
// 🔗 ADD FILE BY PATH (typed path -> attach as context)
// ============================================================================

// Join a base dir and a relative path with the right separator.
function joinPath(base: string, rel: string): string {
  const sep = base.includes('\\') ? '\\' : '/';
  return base.replace(/[\\/]+$/, '') + sep + rel.replace(/^[\\/]+/, '');
}

function isAbsolutePath(p: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(p) || p.startsWith('/') || p.startsWith('\\\\');
}

// Resolve, validate, and attach a file by path. Relative paths resolve against
// the open project (window.currentProjectPath). Gives toast feedback.
export async function addFileByPath(rawPath: string): Promise<boolean> {
  const input = (rawPath || '').trim().replace(/^["']|["']$/g, '');
  if (!input) { showNotification('No path entered', 'error'); return false; }

  const projectRoot = (window as any).currentProjectPath || '';
  let resolved = input;
  if (!isAbsolutePath(input)) {
    if (!projectRoot) {
      showNotification('Open a project first, or use a full path', 'error');
      return false;
    }
    resolved = joinPath(projectRoot, input);
  }

  // Verify the file exists (Tauri fs). If we can't check, attempt anyway.
  try {
    const fs = (window as any).__TAURI__?.fs;
    if (fs?.exists) {
      const ok = await fs.exists(resolved);
      if (!ok) {
        showNotification('File not found: ' + resolved, 'error');
        return false;
      }
    }
  } catch (e) {
    console.warn('🔗 [AddPath] exists() check failed, attempting read anyway:', e);
  }

  // Guard against duplicates already attached.
  const dupe = attachedFiles.some(f => (f.path || '') === resolved);
  if (dupe) { showNotification('Already attached', 'info'); return true; }

  const before = attachedFiles.length;
  await addFileFromPath(resolved);
  const added = attachedFiles.length > before;

  if (added) {
    const name = resolved.split(/[/\\]/).pop() || resolved;
    showNotification('📎 Added ' + name, 'success');
  } else {
    showNotification('Could not read that file', 'error');
  }
  return added;
}

// Styled mini-dialog to type a path (nicer than window.prompt).
export function openPathDialog(): void {
  document.getElementById('x02-addpath-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'x02-addpath-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:1000002;display:flex;align-items:center;' +
    'justify-content:center;background:rgba(0,0,0,0.45);';

  const projectRoot = (window as any).currentProjectPath || '';
  const hint = projectRoot
    ? 'Relative to project, or a full path'
    : 'Enter a full path (no project open)';

  const box = document.createElement('div');
  box.style.cssText =
    'background:#1e1e1e;border:1px solid rgba(10,132,255,0.3);border-radius:10px;' +
    'padding:16px;width:min(560px,90vw);box-shadow:0 10px 40px rgba(0,0,0,0.5);' +
    'font-family:var(--font-sans,-apple-system,sans-serif);';
  box.innerHTML =
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;color:#d4d4d4;font-size:14px;font-weight:500;">' +
    '<span>🔗</span><span>Add file by path</span></div>' +
    '<input id="x02-addpath-input" type="text" placeholder="e.g. src/menuSystem.ts" ' +
    'style="width:100%;box-sizing:border-box;padding:9px 11px;background:#2a2a2a;border:1px solid rgba(255,255,255,0.15);' +
    'border-radius:6px;color:#fff;font-family:var(--font-mono,monospace);font-size:13px;outline:none;" />' +
    '<div style="color:#7d8590;font-size:11px;margin:6px 2px 12px;">' + hint + '</div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
    '<button id="x02-addpath-cancel" style="padding:6px 14px;background:transparent;border:1px solid rgba(255,255,255,0.15);' +
    'color:#aaa;border-radius:6px;font-size:12px;cursor:pointer;">Cancel</button>' +
    '<button id="x02-addpath-ok" style="padding:6px 16px;background:#0a84ff;border:none;color:#fff;' +
    'border-radius:6px;font-size:12px;cursor:pointer;font-weight:500;">Add</button>' +
    '</div>';

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const inputEl = document.getElementById('x02-addpath-input') as HTMLInputElement;
  const close = () => overlay.remove();
  const submit = async () => {
    const val = inputEl?.value || '';
    close();
    if (val.trim()) await addFileByPath(val);
  };

  setTimeout(() => inputEl?.focus(), 30);
  document.getElementById('x02-addpath-cancel')?.addEventListener('click', close);
  document.getElementById('x02-addpath-ok')?.addEventListener('click', submit);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  inputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
}

// Hide the Auto Mode (sparkle) + AI Search (star) toggles. They stay force-ON
// under the hood; this only removes them visually. Runs a few times then stops
// (no permanent loop) plus a short-lived observer that disconnects after settle.
// Floating tooltip for all toolbar buttons. A single fixed-position div appended
// to <body> so it escapes any toolbar overflow clipping (the CSS ::after bubble
// gets clipped). Label resolves: data-tooltip -> title -> id/class map.
function installFloatingTooltips(): void {
  if ((window as any).__x02FloatTip) return;

  const tip = document.createElement('div');
  tip.id = 'x02-float-tip';
  tip.style.cssText =
    'position:fixed;z-index:1000003;pointer-events:none;opacity:0;' +
    'background:#1e1e1e;color:#e6e6e6;border:1px solid rgba(255,255,255,0.12);' +
    'padding:4px 8px;border-radius:6px;font-size:11px;line-height:1.3;' +
    'font-family:var(--font-sans,-apple-system,sans-serif);white-space:nowrap;' +
    'box-shadow:0 4px 14px rgba(0,0,0,0.4);transition:opacity 0.08s;transform:translate(-50%,-100%);';
  document.body.appendChild(tip);

  // Silence the OLD CSS ::after tooltip bubbles so we don't get double tooltips.
  // Our floating div is a real element (not ::after), so it is unaffected.
  if (!document.getElementById('x02-suppress-css-tips')) {
    const s = document.createElement('style');
    s.id = 'x02-suppress-css-tips';
    s.textContent =
      '.tool-button[data-tooltip]::after, .modern-send-btn[data-tooltip]::after, ' +
      '#analyze-code-btn[data-tooltip]::after, [data-tooltip]::after, ' +
      '.tool-button[data-tooltip]::before, .modern-send-btn[data-tooltip]::before, ' +
      '[data-tooltip]::before ' +
      '{ content: none !important; display: none !important; opacity: 0 !important; }';
    document.head.appendChild(s);
  }

  // Fallback labels for buttons that lack data-tooltip/title.
  const LABELS: Record<string, string> = {
    'terminal-ctx-btn': 'Terminal',
    'analyze-code-btn': 'Analyze',
    'debug-code-btn': 'Debug',
    'camera-toggle-btn': 'Camera',
    'assistant-upload': 'Attach file',
    'x02-addpath-btn': 'Add file by path',
    'fix-errors-btn': 'Fix Errors',
    'quick-actions-btn': 'Quick Actions',
    'send-btn': 'Send (Enter)',
    'run-button': 'Run',
  };

  const labelFor = (el: HTMLElement): string => {
    const dt = el.getAttribute('data-tooltip');
    if (dt && dt.trim()) return dt.trim();
    const ti = el.getAttribute('title');
    if (ti && ti.trim()) return ti.trim();
    if (el.id && LABELS[el.id]) return LABELS[el.id];
    for (const cls of Array.from(el.classList)) {
      if (LABELS[cls]) return LABELS[cls];
    }
    return '';
  };

  const SEL = '.tool-button, .modern-send-btn, [data-tooltip], #x02-addpath-btn, .toolbar-button, .run-button';

  const show = (el: HTMLElement) => {
    const label = labelFor(el);
    if (!label) return;
    // Suppress the native title so the OS tooltip doesn't double up.
    if (el.hasAttribute('title')) {
      el.setAttribute('data-x02-title', el.getAttribute('title') || '');
      el.removeAttribute('title');
    }
    tip.textContent = label;
    const r = el.getBoundingClientRect();
    tip.style.left = (r.left + r.width / 2) + 'px';
    tip.style.top = (r.top - 6) + 'px';
    tip.style.opacity = '1';
  };
  const hide = () => {
    tip.style.opacity = '0';
    // Restore any stashed native title.
    document.querySelectorAll('[data-x02-title]').forEach((el) => {
      const t = el.getAttribute('data-x02-title') || '';
      el.setAttribute('title', t);
      el.removeAttribute('data-x02-title');
    });
  };

  document.addEventListener('mouseover', (e) => {
    const t = (e.target as HTMLElement)?.closest?.(SEL) as HTMLElement | null;
    if (t) show(t);
  });
  document.addEventListener('mouseout', (e) => {
    const t = (e.target as HTMLElement)?.closest?.(SEL);
    if (t) hide();
  });
  document.addEventListener('mousedown', hide);
  document.addEventListener('scroll', hide, true);
  window.addEventListener('blur', hide);

  (window as any).__x02FloatTip = tip;
  console.log('\U0001F4AC [Tooltips] floating tooltip installed');
}

function hideModeToggles(): void {
  const SELECTORS = ['#autonomous-mode-toggle', '#ai-search-btn', '.autonomous-mode-toggle', '.btn-ai-search', '.toolbar-group.mode-group'];
  const hideOnce = () => {
    let hid = 0;
    for (const sel of SELECTORS) {
      document.querySelectorAll(sel).forEach((el) => {
        const e = el as HTMLElement;
        if (e.style.display !== 'none') {
          e.style.setProperty('display', 'none', 'important');
          hid++;
        }
      });
    }
    return hid;
  };

  // Inject a stylesheet too (belt-and-braces; survives DOM churn).
  if (!document.getElementById('x02-hide-toggles-style')) {
    const st = document.createElement('style');
    st.id = 'x02-hide-toggles-style';
    st.textContent =
      // Hide the toggle buttons themselves...
      '#autonomous-mode-toggle, #ai-search-btn, .autonomous-mode-toggle, .btn-ai-search ' +
      '{ display: none !important; }' +
      // ...and collapse the now-empty mode-group wrapper box they lived in.
      '.toolbar-group.mode-group, .modern-bottom-toolbar .mode-group ' +
      '{ display: none !important; }';
    document.head.appendChild(st);
  }

  hideOnce();
  // A handful of delayed passes to catch the toolbar restructure re-adding them.
  [300, 800, 1500, 3000, 5000].forEach((d) => setTimeout(hideOnce, d));

  // Short-lived observer: hide on changes, then disconnect after 8s so we don't
  // keep poking the toolbar (which previously re-woke these very toggles).
  try {
    const toolbar = document.querySelector('.modern-bottom-toolbar') || document.body;
    if (!(window as any).__x02HideTogglesObs) {
      const obs = new MutationObserver(() => hideOnce());
      obs.observe(toolbar, { childList: true, subtree: true });
      (window as any).__x02HideTogglesObs = obs;
      setTimeout(() => { try { obs.disconnect(); (window as any).__x02HideTogglesObs = null; } catch (_) {} }, 8000);
    }
  } catch (_) {}
}

// Inject a standalone "Add path" button next to the attach button in the toolbar.
function injectAddPathButton(): void {
  if (document.getElementById('x02-addpath-btn')) return;
  // Sit next to the attach/upload button if we can find it, else the tools row.
  const anchor =
    document.querySelector('#assistant-upload') ||
    document.querySelector('.modern-bottom-toolbar') ||
    document.querySelector('.input-tools');
  if (!anchor) { setTimeout(injectAddPathButton, 800); return; }

  const btn = document.createElement('button');
  btn.id = 'x02-addpath-btn';
  btn.className = 'tool-button';
  btn.type = 'button';
  btn.setAttribute('data-tooltip', 'Add file by path');
  btn.title = 'Add file by path';
  btn.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>' +
    '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>' +
    '</svg>';
  btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openPathDialog(); });

  // Insert right after the attach button when possible.
  if (anchor.id === 'assistant-upload' && anchor.parentNode) {
    anchor.parentNode.insertBefore(btn, anchor.nextSibling);
  } else {
    anchor.appendChild(btn);
  }

  console.log('🔗 [AddPath] button injected');
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

// ============================================================================
// 📄 DOCUMENT CONTENT EXTRACTION (PDF / DOCX / XLSX)
// Lazy-loads libraries only when a matching file is attached, so startup
// stays light. All paths are best-effort: on failure we return null and the
// file is still attached (just without extracted text).
// ============================================================================

const DOC_MAX_CHARS = 50000;

// Extract text from a PDF using the IDE's already-loaded pdf.js / pdfHandler,
// falling back to a fresh pdfjs-dist import if needed.
async function extractPdfText(data: ArrayBuffer): Promise<string | null> {
  try {
    const w = window as any;
    // 1) Reuse an existing helper if the IDE exposes one
    if (typeof w.extractPdfTextFromBuffer === 'function') {
      const t = await w.extractPdfTextFromBuffer(data);
      if (t && typeof t === 'string') return t;
    }
    // 2) Use a pdfjs instance already on window, else import pdfjs-dist
    let pdfjs = w.pdfjsLib || w.pdfjs;
    if (!pdfjs) {
      try { pdfjs = await import('pdfjs-dist'); } catch (_) { pdfjs = null; }
    }
    if (!pdfjs || typeof pdfjs.getDocument !== 'function') return null;
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) });
    const pdf = await loadingTask.promise;
    let out = '';
    const maxPages = Math.min(pdf.numPages || 0, 200);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      const pageText = (tc.items || []).map((it: any) => it.str || '').join(' ');
      out += pageText + '\n\n';
      if (out.length > DOC_MAX_CHARS) break;
    }
    return out.trim() || null;
  } catch (e) {
    console.warn('📄 [DocExtract] PDF extraction failed:', e);
    return null;
  }
}

// Extract text from a .docx using mammoth (lazy-loaded).
async function extractDocxText(data: ArrayBuffer): Promise<string | null> {
  try {
    const mammoth: any = await import('mammoth');
    const fn = mammoth.extractRawText || mammoth.default?.extractRawText;
    if (typeof fn !== 'function') return null;
    const result = await fn({ arrayBuffer: data });
    const text = result?.value || '';
    return text.trim() || null;
  } catch (e) {
    console.warn('📄 [DocExtract] DOCX extraction failed:', e);
    return null;
  }
}

// Extract text from a .xlsx / .xls using SheetJS (lazy-loaded). Each sheet is
// rendered as CSV under a heading so the AI sees structure.
async function extractXlsxText(data: ArrayBuffer): Promise<string | null> {
  try {
    const XLSX: any = await import('xlsx');
    const wb = XLSX.read(new Uint8Array(data), { type: 'array' });
    let out = '';
    for (const name of wb.SheetNames || []) {
      const sheet = wb.Sheets[name];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      out += `# Sheet: ${name}\n${csv}\n\n`;
      if (out.length > DOC_MAX_CHARS) break;
    }
    return out.trim() || null;
  } catch (e) {
    console.warn('📄 [DocExtract] XLSX extraction failed:', e);
    return null;
  }
}

// Route an ArrayBuffer to the right extractor by extension.
// Returns extracted text, or null if unsupported / failed.
async function extractDocBytes(data: ArrayBuffer, ext: string): Promise<string | null> {
  const e = (ext || '').toLowerCase();
  if (e === 'pdf') return extractPdfText(data);
  if (e === 'docx' || e === 'doc') return extractDocxText(data);
  if (e === 'xlsx' || e === 'xls') return extractXlsxText(data);
  return null;
}

// Read a browser File as ArrayBuffer.
function readArrayBuffer(f: File): Promise<ArrayBuffer> {
  return new Promise((res, rej) => {
    const x = new FileReader();
    x.onload = () => res(x.result as ArrayBuffer);
    x.onerror = rej;
    x.readAsArrayBuffer(f);
  });
}

// Extract document text from a browser File (picker / drag from browser).
async function extractDocFromFile(file: File, ext: string): Promise<string | null> {
  try {
    const buf = await readArrayBuffer(file);
    return await extractDocBytes(buf, ext);
  } catch (e) {
    console.warn('📄 [DocExtract] read failed for', file.name, e);
    return null;
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

    /* VS Code "Open Editors" style expanded list */
    .pnd-list { display: flex; flex-direction: column; gap: 1px; flex: 1 1 100%; width: 100%; margin-top: 4px; }
    .pnd-list-scroll { max-height: 132px; overflow-y: auto; } /* ~5 rows then scroll */
    .pnd-list-scroll::-webkit-scrollbar { width: 6px; }
    .pnd-list-scroll::-webkit-scrollbar-thumb { background: rgba(10,132,255,0.35); border-radius: 3px; }
    .pnd-row {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 8px; border-radius: 4px;
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 12px; color: rgba(255,255,255,0.82);
      cursor: pointer; transition: background 0.1s;
    }
    .pnd-row:hover { background: rgba(255,255,255,0.06); }
    .pnd-row-ico { font-size: 13px; line-height: 1; flex-shrink: 0; width: 16px; text-align: center; }
    .pnd-row-thumb { width: 16px; height: 16px; object-fit: cover; border-radius: 3px; flex-shrink: 0; }
    .pnd-row-name { color: #d4d4d4; white-space: nowrap; }
    .pnd-row-folder { color: #6a6a6a; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pnd-row-size { color: #6a6a6a; font-size: 11px; margin-left: auto; flex-shrink: 0; white-space: nowrap; }
    .pnd-row-x {
      background: transparent; border: none; color: #6a6a6a;
      font-size: 14px; line-height: 1; cursor: pointer; padding: 0 2px;
      flex-shrink: 0; opacity: 0; transition: opacity 0.1s, color 0.1s;
    }
    .pnd-row:hover .pnd-row-x { opacity: 1; }
    .pnd-row-x:hover { color: #ff6b6b; }

    /* Collapsible attach bar: scrollable expanded chips + summary toggle */
    .pnd-chips-scroll {
      max-height: 96px;        /* ~3 rows, then scroll instead of growing */
      overflow-y: auto;
      align-content: flex-start;
    }
    .pnd-chips-scroll::-webkit-scrollbar { width: 6px; }
    .pnd-chips-scroll::-webkit-scrollbar-thumb {
      background: rgba(10,132,255,0.35); border-radius: 3px;
    }
    .attached-files-preview.pnd-collapsed { align-items: center; }
    .pnd-label-toggle {
      border-right: none;
      padding-right: 4px;
      user-select: none;
      transition: color 0.12s;
    }
    .pnd-label-toggle:hover { color: rgba(10,132,255,1); }
    .pnd-caret { font-size: 9px; opacity: 0.8; margin-left: 2px; }
    .pnd-size { font-size: 10px; opacity: 0.65; margin-left: 4px; }
    .pnd-clearall {
      font-size: 10px;
      color: rgba(255,255,255,0.55);
      background: transparent;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 4px;
      padding: 2px 7px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.12s;
    }
    .pnd-clearall:hover {
      color: #ff6b6b;
      border-color: rgba(255,107,107,0.5);
      background: rgba(255,107,107,0.08);
    }
    
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
    addPath: addFileByPath,
    openPathDialog,
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
