// aiFileExplorer.ts - AI File Search & Access System
// ============================================================================
// VERSION 2.2 - Simplified (No MutationObserver, No Infinite Loops)
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

console.log('🔍 [AI File Explorer] v2.2 LOADING');

// ============================================================================
// HIGHLIGHT SYSTEM - SIMPLIFIED
// ============================================================================

type HighlightState = 'scanning' | 'reading' | 'indexed' | 'error';

interface FileHighlightInfo {
  path: string;
  state: HighlightState;
  progress?: number;
  timestamp: number;
  element?: HTMLElement;
}

const HIGHLIGHT_CONFIG = {
  colors: {
    scanning: { primary: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' },
    reading: { primary: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    indexed: { primary: '#10b981', bg: 'rgba(16, 185, 129, 0.06)' },
    error: { primary: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)' },
  },
  icons: {
    scanning: '◌',
    reading: '◐',
    indexed: '●',
    error: '✕',
  },
  timing: {
    autoFadeDelay: 5000,
    completionFlash: 600,
  }
} as const;

const highlightedFiles = new Map<string, FileHighlightInfo>();
let highlightStylesInjected = false;

function injectHighlightStyles(): void {
  if (highlightStylesInjected || document.getElementById('ai-highlight-styles-v2')) return;
  
  const style = document.createElement('style');
  style.id = 'ai-highlight-styles-v2';
  style.textContent = `
    /* ============================================================ */
    /* FIX: Override file-item background from attachment styles    */
    /* ============================================================ */
    .file-tree .file-item:not(.ai-hl),
    .file-tree .tree-row:not(.ai-hl),
    .file-tree .tree-file:not(.ai-hl),
    #file-tree .file-item:not(.ai-hl),
    #file-tree .tree-row:not(.ai-hl),
    .explorer-panel .file-item:not(.ai-hl),
    .integrated-file-tree .file-item:not(.ai-hl) {
      background: transparent !important;
      background-color: transparent !important;
    }
    
    /* Keep selected item highlighted (when not AI highlighted) */
    .file-tree .file-item.selected:not(.ai-hl),
    .file-tree .tree-row.selected:not(.ai-hl),
    #file-tree .file-item.selected:not(.ai-hl),
    .explorer-panel .file-item.selected:not(.ai-hl) {
      background: rgba(0, 122, 204, 0.25) !important;
    }
    
    /* Hover state (when not AI highlighted) */
    .file-tree .file-item:hover:not(.selected):not(.ai-hl),
    .file-tree .tree-row:hover:not(.selected):not(.ai-hl),
    #file-tree .file-item:hover:not(.selected):not(.ai-hl) {
      background: rgba(255, 255, 255, 0.05) !important;
    }
    
    /* ============================================================ */
    /* AI Highlight System Styles - HIGH SPECIFICITY               */
    /* Background highlight only - no bars, no underlines          */
    /* ============================================================ */
    .ai-hl,
    .file-tree .ai-hl,
    #file-tree .ai-hl,
    .tree-row.ai-hl,
    .file-item.ai-hl {
      position: relative !important;
      transition: all 0.3s ease !important;
      border-radius: 4px !important;
    }
    .ai-hl-indicator {
      position: absolute !important;
      right: 8px !important;
      top: 50% !important;
      transform: translateY(-50%) !important;
      font-size: 10px !important;
      font-weight: 600 !important;
      opacity: 0.8 !important;
      z-index: 10 !important;
    }
    
    /* Hide progress bar completely */
    .ai-hl-progress {
      display: none !important;
    }
    
    /* SCANNING - High specificity */
    .ai-hl-scanning,
    .file-tree .ai-hl-scanning,
    #file-tree .ai-hl-scanning,
    .tree-row.ai-hl-scanning,
    .file-item.ai-hl-scanning {
      background: ${HIGHLIGHT_CONFIG.colors.scanning.bg} !important;
    }
    .ai-hl-scanning .ai-hl-indicator { color: ${HIGHLIGHT_CONFIG.colors.scanning.primary} !important; }
    
    /* READING - High specificity */
    .ai-hl-reading,
    .file-tree .ai-hl-reading,
    #file-tree .ai-hl-reading,
    .tree-row.ai-hl-reading,
    .file-item.ai-hl-reading {
      background: ${HIGHLIGHT_CONFIG.colors.reading.bg} !important;
    }
    .ai-hl-reading .ai-hl-indicator { color: ${HIGHLIGHT_CONFIG.colors.reading.primary} !important; }
    
    /* INDEXED - High specificity */
    .ai-hl-indexed,
    .file-tree .ai-hl-indexed,
    #file-tree .ai-hl-indexed,
    .tree-row.ai-hl-indexed,
    .file-item.ai-hl-indexed {
      background: ${HIGHLIGHT_CONFIG.colors.indexed.bg} !important;
    }
    .ai-hl-indexed .ai-hl-indicator { color: ${HIGHLIGHT_CONFIG.colors.indexed.primary} !important; }
    
    /* ERROR - High specificity */
    .ai-hl-error,
    .file-tree .ai-hl-error,
    #file-tree .ai-hl-error,
    .tree-row.ai-hl-error,
    .file-item.ai-hl-error {
      background: ${HIGHLIGHT_CONFIG.colors.error.bg} !important;
    }
    .ai-hl-error .ai-hl-indicator { color: ${HIGHLIGHT_CONFIG.colors.error.primary} !important; }
    
    /* Flash animation */
    .ai-hl-just-completed {
      animation: hl-flash 0.6s ease-out;
    }
    @keyframes hl-flash {
      0% { background: rgba(16, 185, 129, 0.25); box-shadow: 0 0 12px rgba(16, 185, 129, 0.4); }
      100% { background: ${HIGHLIGHT_CONFIG.colors.indexed.bg}; box-shadow: none; }
    }
    
    /* File count badge */
    .ai-file-count-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 16px;
      height: 16px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      z-index: 100;
    }
    
    /* Hide blue line pseudo-elements */
    .file-tree::after, .file-tree::before,
    #file-tree::after, #file-tree::before,
    .ai-search-active::after, .ai-search-active::before {
      display: none !important;
    }
    
    /* Force clear legacy AI highlights when not using highlight system */
    .ai-reading, .ai-highlight, .ai-scanning {
      background: transparent !important;
      background-color: transparent !important;
    }
  `;
  document.head.appendChild(style);
  highlightStylesInjected = true;
}

function findFileRow(fileName: string): HTMLElement | null {
  const fileTree = document.querySelector('.file-tree, #file-tree, .explorer-panel') as HTMLElement;
  if (!fileTree) return null;
  
  const elements = fileTree.querySelectorAll('[data-path]');
  for (const el of elements) {
    const path = el.getAttribute('data-path') || '';
    if (path.endsWith(fileName) || path.endsWith('/' + fileName) || path.endsWith('\\' + fileName)) {
      return el as HTMLElement;
    }
  }
  return null;
}

function setFileHighlightState(filePath: string, state: HighlightState, progress?: number): void {
  if (localStorage.getItem('aiFileExplorerEnabled') !== 'true') return;
  
  injectHighlightStyles();
  
  const fileName = filePath.split(/[/\\]/).pop() || filePath;
  const row = findFileRow(fileName);
  if (!row) return;
  
  const prevInfo = highlightedFiles.get(filePath);
  const prevState = prevInfo?.state;
  
  highlightedFiles.set(filePath, { path: filePath, state, progress, timestamp: Date.now(), element: row });
  
  // Clear previous
  row.classList.remove('ai-hl', 'ai-hl-scanning', 'ai-hl-reading', 'ai-hl-indexed', 'ai-hl-error', 'ai-hl-just-completed');
  row.querySelector('.ai-hl-indicator')?.remove();
  
  // Apply new
  row.classList.add('ai-hl', `ai-hl-${state}`);
  
  const indicator = document.createElement('span');
  indicator.className = 'ai-hl-indicator';
  indicator.textContent = HIGHLIGHT_CONFIG.icons[state];
  row.appendChild(indicator);
  
  if (state === 'indexed' && prevState && prevState !== 'indexed') {
    row.classList.add('ai-hl-just-completed');
    setTimeout(() => row.classList.remove('ai-hl-just-completed'), 600);
  }
  
  if (state === 'reading') {
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  // NOTE: Indexed files will remain highlighted until explicitly cleared
  // This keeps highlights visible while AI is processing
  
  updateToggleBadge();
}

function clearFileHighlight(filePath: string): void {
  const info = highlightedFiles.get(filePath);
  if (info?.element) {
    const row = info.element;
    row.classList.remove('ai-hl', 'ai-hl-scanning', 'ai-hl-reading', 'ai-hl-indexed', 'ai-hl-error', 'ai-hl-just-completed');
    row.querySelector('.ai-hl-indicator')?.remove();
  }
  highlightedFiles.delete(filePath);
  updateToggleBadge();
}

function clearAllHighlights(): void {
  document.querySelectorAll('.ai-hl').forEach(el => {
    el.classList.remove('ai-hl', 'ai-hl-scanning', 'ai-hl-reading', 'ai-hl-indexed', 'ai-hl-error', 'ai-hl-just-completed');
    el.querySelector('.ai-hl-indicator')?.remove();
  });
  document.querySelectorAll('.ai-loading-dot').forEach(d => d.remove());
  highlightedFiles.clear();
  updateToggleBadge();
}

// Mark all currently highlighted files as indexed (green flash on completion)
function markAllFilesIndexed(): void {
  highlightedFiles.forEach((info, filePath) => {
    setFileHighlightState(filePath, 'indexed');
  });
}

function updateToggleBadge(): void {
  const btn = document.getElementById('ai-search-tool-btn');
  if (!btn) return;
  
  let badge = btn.querySelector('.ai-file-count-badge') as HTMLElement;
  const count = highlightedFiles.size;
  
  if (count > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'ai-file-count-badge';
      btn.style.position = 'relative';
      btn.appendChild(badge);
    }
    badge.textContent = count > 99 ? '99+' : String(count);
  } else if (badge) {
    badge.remove();
  }
}

// Convenience functions
function highlightFileScanning(filePath: string): void { setFileHighlightState(filePath, 'scanning'); }
function highlightFileReading(filePath: string, progress: number = 0): void { setFileHighlightState(filePath, 'reading', progress); }
function highlightFileIndexed(filePath: string): void { setFileHighlightState(filePath, 'indexed'); }
function highlightFileError(filePath: string): void { setFileHighlightState(filePath, 'error'); }

// Expose globally
(window as any).aiHighlight = {
  set: setFileHighlightState,
  clear: clearFileHighlight,
  clearAll: clearAllHighlights,
  scanning: highlightFileScanning,
  reading: highlightFileReading,
  indexed: highlightFileIndexed,
  error: highlightFileError,
};

// ============================================================================
// INITIALIZATION - SIMPLE, NO MUTATION OBSERVER
// ============================================================================

// Set AI Search OFF on load
localStorage.setItem('aiFileExplorerEnabled', 'false');
(window as any).aiFileExplorerEnabled = false;

// One-time cleanup of any leftover highlights on load
function cleanupLegacyHighlights(): void {
  // Clear any blue/cyan backgrounds on file items
  document.querySelectorAll('[data-path]').forEach(el => {
    const h = el as HTMLElement;
    const bg = getComputedStyle(h).backgroundColor;
    // Check if it's a blue/cyan highlight (not transparent or normal)
    if (bg && (bg.includes('79, 195, 247') || bg.includes('59, 130, 246') || bg.includes('0, 120, 215'))) {
      h.style.backgroundColor = 'transparent';
      h.style.background = 'transparent';
    }
  });
  
  // Remove legacy classes
  document.querySelectorAll('.ai-reading, .ai-highlight, .ai-search-active, .ai-scanning').forEach(el => {
    el.classList.remove('ai-reading', 'ai-highlight', 'ai-search-active', 'ai-scanning');
  });
  
  // Remove legacy dots
  document.querySelectorAll('.ai-loading-dot').forEach(d => d.remove());
}

// Run cleanup after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(cleanupLegacyHighlights, 500));
} else {
  setTimeout(cleanupLegacyHighlights, 500);
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface FileSearchResult {
  path: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  extension?: string;
  relevance?: number;
}

interface FileContent {
  path: string;
  name: string;
  content: string;
  language: string;
  lineCount: number;
  truncated: boolean;
}

interface ProjectFile {
  path: string;
  name: string;
  type: 'file' | 'folder';
  children?: ProjectFile[];
}

// ============================================================================
// FILE SEARCH FUNCTIONS
// ============================================================================

async function getProjectFiles(): Promise<ProjectFile[]> {
  const projectPath = getProjectPath();
  if (!projectPath) return [];
  
  try {
    const files = await invoke('list_directory_recursive', { path: projectPath, maxDepth: 10 }) as ProjectFile[];
    return files;
  } catch (e) {
    console.error('Failed to list project files:', e);
    return [];
  }
}

function getProjectPath(): string | null {
  const projectHeader = document.querySelector('.project-header .fcm-header-name, .project-name');
  if (projectHeader) {
    const path = projectHeader.getAttribute('data-path') || projectHeader.getAttribute('title');
    if (path) return path;
  }
  
  const firstFile = document.querySelector('[data-path]');
  if (firstFile) {
    const path = firstFile.getAttribute('data-path') || '';
    const parts = path.split(/[/\\]/);
    for (let i = parts.length - 1; i >= 0; i--) {
      if (['src', 'lib', 'app', 'public', 'node_modules'].includes(parts[i])) {
        return parts.slice(0, i).join(path.includes('/') ? '/' : '\\');
      }
    }
    return parts.slice(0, -1).join(path.includes('/') ? '/' : '\\');
  }
  
  return (window as any).currentProjectPath || null;
}

async function searchFilesByName(query: string): Promise<FileSearchResult[]> {
  const results: FileSearchResult[] = [];
  const projectPath = getProjectPath();
  
  if (!projectPath) return results;
  
  try {
    const files = await invoke('search_files', { path: projectPath, query, maxResults: 20 }) as FileSearchResult[];
    return files;
  } catch (e) {
    // Fallback to DOM search
    const fileElements = document.querySelectorAll('[data-path]');
    const queryLower = query.toLowerCase();
    
    fileElements.forEach(el => {
      const path = el.getAttribute('data-path') || '';
      const name = path.split(/[/\\]/).pop() || '';
      
      if (name.toLowerCase().includes(queryLower)) {
        results.push({
          path, name,
          type: el.classList.contains('folder') ? 'folder' : 'file',
          extension: name.includes('.') ? name.split('.').pop() : undefined
        });
      }
    });
    
    return results.slice(0, 20);
  }
}

async function searchFilesByContent(query: string): Promise<FileSearchResult[]> {
  const projectPath = getProjectPath();
  if (!projectPath) return [];
  
  try {
    return await invoke('search_file_contents', { path: projectPath, query, maxResults: 10 }) as FileSearchResult[];
  } catch (e) {
    console.error('Content search failed:', e);
    return [];
  }
}

// ============================================================================
// READ FILE CONTENT
// ============================================================================

async function readFileContent(filePath: string, maxLength: number = 10000): Promise<FileContent | null> {
  try {
    highlightFileReading(filePath, 0);
    const startTime = Date.now();
    
    let content = '';
    try {
      highlightFileReading(filePath, 30);
      content = await invoke('read_file_content', { path: filePath }) as string;
    } catch (e1) {
      try {
        content = await invoke('read_file', { path: filePath }) as string;
      } catch (e2) {
        console.error('Failed to read file:', e2);
        highlightFileError(filePath);
        return null;
      }
    }
    
    highlightFileReading(filePath, 70);
    
    const name = filePath.split(/[/\\]/).pop() || 'file';
    const extension = name.includes('.') ? name.split('.').pop() || '' : '';
    const lineCount = content.split('\n').length;
    const truncated = content.length > maxLength;
    
    highlightFileReading(filePath, 100);
    
    // Ensure minimum display time
    const elapsed = Date.now() - startTime;
    if (elapsed < 800) {
      await new Promise(r => setTimeout(r, 800 - elapsed));
    }
    
    highlightFileIndexed(filePath);
    
    return {
      path: filePath,
      name,
      content: truncated ? content.substring(0, maxLength) + '\n\n... (truncated)' : content,
      language: getLanguageFromExtension(extension),
      lineCount,
      truncated
    };
  } catch (e) {
    console.error('Failed to read file:', e);
    highlightFileError(filePath);
    return null;
  }
}

function getLanguageFromExtension(ext: string): string {
  const map: Record<string, string> = {
    'ts': 'typescript', 'tsx': 'typescript', 'js': 'javascript', 'jsx': 'javascript',
    'py': 'python', 'rs': 'rust', 'go': 'go', 'java': 'java', 'c': 'c', 'cpp': 'cpp',
    'h': 'c', 'hpp': 'cpp', 'cs': 'csharp', 'rb': 'ruby', 'php': 'php', 'swift': 'swift',
    'kt': 'kotlin', 'html': 'html', 'css': 'css', 'scss': 'scss', 'json': 'json',
    'yaml': 'yaml', 'yml': 'yaml', 'xml': 'xml', 'md': 'markdown', 'sql': 'sql',
    'sh': 'bash', 'vue': 'vue', 'svelte': 'svelte'
  };
  return map[ext.toLowerCase()] || 'plaintext';
}

// ============================================================================
// AI CONTEXT BUILDER
// ============================================================================

async function findRelatedFiles(topic: string): Promise<FileSearchResult[]> {
  const keywords = extractKeywords(topic);
  const results: FileSearchResult[] = [];
  const seen = new Set<string>();
  
  for (const keyword of keywords) {
    const byName = await searchFilesByName(keyword);
    byName.forEach(f => {
      if (!seen.has(f.path)) {
        seen.add(f.path);
        results.push({ ...f, relevance: 0.8 });
        highlightFileScanning(f.path);
      }
    });
    if (results.length >= 15) break;
  }
  
  return results.sort((a, b) => (b.relevance || 0) - (a.relevance || 0)).slice(0, 10);
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'this', 'that',
    'what', 'which', 'who', 'when', 'where', 'why', 'how', 'and', 'but', 'if', 'or',
    'of', 'at', 'by', 'for', 'with', 'to', 'from', 'in', 'on', 'file', 'files',
    'code', 'function', 'class', 'please', 'help', 'me', 'my', 'find', 'show', 'get'
  ]);
  
  const words = text.toLowerCase()
    .replace(/[^a-z0-9_.-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  
  const filePatterns = text.match(/[\w.-]+\.(ts|tsx|js|jsx|py|rs|go|java|css|html|json|md)/gi) || [];
  return [...new Set([...filePatterns, ...words])].slice(0, 8);
}

async function buildFileContext(files: FileSearchResult[]): Promise<string> {
  if (files.length === 0) return '';
  
  const contents: string[] = [];
  
  for (const file of files.slice(0, 5)) {
    if (file.type === 'file') {
      const content = await readFileContent(file.path, 3000);
      if (content) {
        contents.push(`📄 **${file.name}** (${file.path})\n\`\`\`${content.language}\n${content.content}\n\`\`\``);
      }
    }
  }
  
  if (contents.length === 0) return '';
  return `[🔍 AI File Explorer - Found ${files.length} related files]\n${contents.join('\n---\n')}`;
}

function aiNeedsMoreContext(response: string): boolean {
  const indicators = [
    'i don\'t have access', 'i cannot see', 'could you share', 'could you provide',
    'please share', 'i don\'t have the file', 'without seeing the'
  ];
  const responseLower = response.toLowerCase();
  return indicators.some(i => responseLower.includes(i));
}

function extractFileReferences(text: string): string[] {
  const files: string[] = [];
  const patterns = [
    /['"`]([a-zA-Z0-9_.-]+\.(ts|tsx|js|jsx|py|rs|css|html|json|md))['"`]/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && !files.includes(match[1])) files.push(match[1]);
    }
  }
  return files;
}

async function enhanceWithFileContext(message: string): Promise<string> {
  const mentionedFiles = extractFileReferences(message);
  const relatedFiles = await findRelatedFiles(message);
  
  if (mentionedFiles.length === 0 && relatedFiles.length === 0) return message;
  
  const foundFiles: FileSearchResult[] = [];
  for (const file of mentionedFiles) {
    const results = await searchFilesByName(file);
    foundFiles.push(...results.slice(0, 2));
  }
  foundFiles.push(...relatedFiles.slice(0, 3));
  
  const context = await buildFileContext(foundFiles);
  return context ? `${message}\n\n${context}` : message;
}

// ============================================================================
// FILE COMMANDS
// ============================================================================

function parseFileCommands(text: string): Array<{ type: string; arg: string }> {
  const commands: Array<{ type: string; arg: string }> = [];
  const patterns = [
    { regex: /\[FILE:search:([^\]]+)\]/gi, type: 'search' },
    { regex: /\[FILE:read:([^\]]+)\]/gi, type: 'read' },
    { regex: /\[FILE:list\]/gi, type: 'list' }
  ];
  
  for (const { regex, type } of patterns) {
    const matches = text.matchAll(regex);
    for (const match of matches) {
      commands.push({ type, arg: match[1] || '' });
    }
  }
  return commands;
}

async function executeFileCommand(command: { type: string; arg: string }): Promise<string> {
  switch (command.type) {
    case 'search':
      const results = await searchFilesByName(command.arg);
      return results.length === 0 ? `No files found matching "${command.arg}"` :
        `Found ${results.length} files:\n${results.map(f => `- ${f.name}`).join('\n')}`;
    case 'read':
      const content = await readFileContent(command.arg);
      return content ? `**${content.name}**:\n\`\`\`${content.language}\n${content.content}\n\`\`\`` :
        `Could not read: ${command.arg}`;
    case 'list':
      const files = await getProjectFiles();
      return files.length === 0 ? 'No files found' :
        `Project files:\n${files.slice(0, 30).map(f => `- ${f.name}`).join('\n')}`;
    default:
      return `Unknown command: ${command.type}`;
  }
}

// ============================================================================
// FILE SEARCH UI
// ============================================================================

function showFileSearchUI(): void {
  const chatContainer = document.querySelector('.ai-chat-container, .chat-messages, .chat-panel');
  if (!chatContainer) return;
  
  document.querySelectorAll('.ai-file-search-ui').forEach(el => el.remove());
  
  const searchUI = document.createElement('div');
  searchUI.className = 'ai-file-search-ui';
  searchUI.innerHTML = `
    <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; margin: 8px 0;">
      <div style="display: flex; gap: 8px;">
        <input type="text" placeholder="Search files..." id="ai-file-search-input" style="flex:1; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px 12px; color: #e6edf3; font-size: 12px; outline: none;" />
        <button id="ai-file-search-btn" style="background: linear-gradient(135deg, #58a6ff, #8b5cf6); border: none; border-radius: 6px; padding: 8px 16px; color: #fff; font-size: 12px; cursor: pointer;">Search</button>
      </div>
      <div id="ai-file-search-results" style="margin-top: 10px; max-height: 200px; overflow-y: auto;"></div>
    </div>
  `;
  chatContainer.appendChild(searchUI);
  
  const input = searchUI.querySelector('#ai-file-search-input') as HTMLInputElement;
  const btn = searchUI.querySelector('#ai-file-search-btn') as HTMLButtonElement;
  const resultsDiv = searchUI.querySelector('#ai-file-search-results') as HTMLDivElement;
  
  const doSearch = async () => {
    const query = input.value.trim();
    if (!query) return;
    
    resultsDiv.innerHTML = '<div style="color: #7d8590; font-size: 11px;">Searching...</div>';
    const results = await searchFilesByName(query);
    
    if (results.length === 0) {
      resultsDiv.innerHTML = '<div style="color: #7d8590; font-size: 11px;">No files found</div>';
      return;
    }
    
    resultsDiv.innerHTML = results.map(f => `
      <div class="ai-file-result" data-path="${f.path}" style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; color: #d4d4d4;">
        <span style="flex: 1;">${f.name}</span>
        <button class="add-to-context-btn" style="background: rgba(88,166,255,0.2); border: none; border-radius: 4px; padding: 4px 8px; color: #58a6ff; font-size: 10px; cursor: pointer;">+ Add</button>
      </div>
    `).join('');
    
    resultsDiv.querySelectorAll('.add-to-context-btn').forEach(b => {
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const path = (b.closest('.ai-file-result') as HTMLElement)?.getAttribute('data-path');
        if (path) {
          await addFileToContext(path);
          (b as HTMLButtonElement).textContent = '✓';
          (b as HTMLButtonElement).style.color = '#3fb950';
        }
      });
    });
  };
  
  btn.addEventListener('click', doSearch);
  input.addEventListener('keypress', (e) => { if (e.key === 'Enter') doSearch(); });
  input.focus();
}

async function addFileToContext(filePath: string): Promise<void> {
  const content = await readFileContent(filePath);
  if (!content) return;
  
  const pendingContext = (window as any).pendingFileContext || [];
  pendingContext.push(content);
  (window as any).pendingFileContext = pendingContext;
  
  if ((window as any).showNotification) {
    (window as any).showNotification(`Added ${content.name}`, 'success');
  }
}

function getPendingFileContext(): string {
  const pending = (window as any).pendingFileContext as FileContent[] || [];
  (window as any).pendingFileContext = [];
  
  if (pending.length === 0) return '';
  return pending.map(f => `📄 **${f.name}**\n\`\`\`${f.language}\n${f.content}\n\`\`\``).join('\n---\n');
}

async function suggestRelevantFiles(message: string): Promise<FileSearchResult[]> {
  const keywords = extractKeywords(message);
  if (keywords.length === 0) return [];
  
  const suggestions: FileSearchResult[] = [];
  const seen = new Set<string>();
  
  for (const keyword of keywords.slice(0, 5)) {
    const results = await searchFilesByName(keyword);
    for (const file of results) {
      if (!seen.has(file.path) && suggestions.length < 5) {
        seen.add(file.path);
        suggestions.push(file);
      }
    }
  }
  return suggestions;
}

function showFileSuggestions(files: FileSearchResult[]): void {
  if (files.length === 0) return;
  
  const chatContainer = document.querySelector('.ai-chat-container, .chat-messages');
  if (!chatContainer) return;
  
  document.querySelectorAll('.ai-file-suggestions').forEach(el => el.remove());
  
  const suggestionsUI = document.createElement('div');
  suggestionsUI.className = 'ai-file-suggestions';
  suggestionsUI.innerHTML = `
    <div style="background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.2); border-radius: 8px; padding: 10px 14px; margin: 8px 0;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="color: #8b5cf6; font-size: 11px; font-weight: 500;">Related files</span>
        <button class="dismiss-suggestions" style="margin-left: auto; background: transparent; border: none; color: #666; cursor: pointer;">×</button>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        ${files.map(f => `<button class="file-chip" data-path="${f.path}" style="background: rgba(139,92,246,0.15); border: none; border-radius: 4px; padding: 4px 8px; color: #c4b5fd; font-size: 11px; cursor: pointer;">+ ${f.name}</button>`).join('')}
      </div>
    </div>
  `;
  
  const inputArea = chatContainer.querySelector('.chat-input-area, .input-container');
  if (inputArea) {
    inputArea.parentNode?.insertBefore(suggestionsUI, inputArea);
  } else {
    chatContainer.appendChild(suggestionsUI);
  }
  
  suggestionsUI.querySelector('.dismiss-suggestions')?.addEventListener('click', () => suggestionsUI.remove());
  
  suggestionsUI.querySelectorAll('.file-chip').forEach(chip => {
    chip.addEventListener('click', async () => {
      const path = chip.getAttribute('data-path');
      if (path) {
        await addFileToContext(path);
        (chip as HTMLButtonElement).style.color = '#3fb950';
        chip.textContent = '✓ ' + chip.textContent?.replace('+ ', '');
      }
    });
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeAIFileExplorer(): void {
  console.log('🔍 [AI File Explorer] Initializing...');
  
  injectHighlightStyles();
  
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      showFileSearchUI();
    }
  });
  
  (window as any).aiFileExplorer = {
    search: searchFilesByName,
    searchContent: searchFilesByContent,
    read: readFileContent,
    findRelated: findRelatedFiles,
    addToContext: addFileToContext,
    getPendingContext: getPendingFileContext,
    showSearch: showFileSearchUI,
    enhance: enhanceWithFileContext,
    executeCommand: executeFileCommand,
    parseCommands: parseFileCommands
  };
  
  console.log('✅ [AI File Explorer] Ready!');
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAIFileExplorer);
  } else {
    initializeAIFileExplorer();
  }
}

// ============================================================================
// AI SEARCH TOGGLE
// ============================================================================

const AI_SEARCH_STORAGE_KEY = 'aiFileExplorerEnabled';

function isAISearchEnabled(): boolean {
  // Check multiple sources - any one being true means enabled
  return localStorage.getItem(AI_SEARCH_STORAGE_KEY) === 'true' ||
         (window as any).aiFileExplorerEnabled === true ||
         (window as any).aiSearchEnabled === true;
}

// ============================================================================
// PROFESSIONAL TOAST & DIALOG NOTIFICATION
// ============================================================================

function showAIProjectToast(message: string, type: 'success' | 'info' | 'error' = 'success'): void {
  // Remove existing toast
  const existing = document.querySelector('.ai-project-toast');
  if (existing) existing.remove();
  
  // Inject styles if not present
  injectToastStyles();
  
  // Determine if this is an AI Project toggle message
  const isProjectOn = message.includes('AI Project: ON') || message.includes('AI Search: ON');
  const isProjectOff = message.includes('AI Project: OFF') || message.includes('AI Search: OFF');
  const isProjectMode = isProjectOn || isProjectOff;
  
  const toast = document.createElement('div');
  toast.className = `ai-project-toast ${type} ${isProjectMode ? 'ai-project-mode' : ''} ${isProjectOn ? 'project-on' : ''} ${isProjectOff ? 'project-off' : ''}`;
  
  // Choose icon based on message type
  let icon = '';
  if (isProjectOn) {
    icon = `<svg class="ai-toast-icon project-icon pulsing" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>`;
  } else if (isProjectOff) {
    icon = `<svg class="ai-toast-icon project-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>`;
  } else if (type === 'success') {
    icon = `<svg class="ai-toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>`;
  } else if (type === 'error') {
    icon = `<svg class="ai-toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>`;
  } else {
    icon = `<svg class="ai-toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>`;
  }
  
  // Clean message
  let cleanMessage = message;
  if (isProjectMode) {
    cleanMessage = isProjectOn ? 'AI Project' : 'AI Project';
  }
  
  toast.innerHTML = `
    <div class="ai-toast-content">
      ${icon}
      <span class="ai-toast-text">${cleanMessage}</span>
      ${isProjectOn ? '<span class="ai-toast-badge">ON</span>' : ''}
      ${isProjectOff ? '<span class="ai-toast-badge off">OFF</span>' : ''}
    </div>
    ${isProjectMode ? '<div class="ai-toast-progress"></div>' : ''}
  `;
  
  document.body.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
    if (isProjectMode) {
      toast.classList.add('animate-in');
    }
  });
  
  // Auto dismiss
  const duration = isProjectMode ? 2500 : 3000;
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('animate-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================================================
// AI PROJECT MODE DIALOG
// ============================================================================

function showAIProjectDialog(isEnabled: boolean): void {
  // Remove existing dialog
  const existing = document.querySelector('.ai-project-dialog-overlay');
  if (existing) existing.remove();
  
  // Inject styles
  injectToastStyles();
  
  const overlay = document.createElement('div');
  overlay.className = 'ai-project-dialog-overlay';
  
  const statusIcon = isEnabled 
    ? `<svg class="ai-dialog-icon ${isEnabled ? 'pulsing' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>`
    : `<svg class="ai-dialog-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>`;
  
  const features = isEnabled ? `
    <div class="ai-dialog-features">
      <div class="ai-feature-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Auto-inject file context</span>
      </div>
      <div class="ai-feature-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Highlight referenced files</span>
      </div>
      <div class="ai-feature-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Smart project scanning</span>
      </div>
    </div>
  ` : `
    <div class="ai-dialog-features disabled">
      <div class="ai-feature-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span>Context injection disabled</span>
      </div>
      <div class="ai-feature-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span>File highlighting disabled</span>
      </div>
    </div>
  `;
  
  overlay.innerHTML = `
    <div class="ai-project-dialog ${isEnabled ? 'enabled' : 'disabled'}">
      <button class="ai-dialog-close" onclick="this.closest('.ai-project-dialog-overlay').remove()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="ai-dialog-header">
        <div class="ai-dialog-icon-wrapper ${isEnabled ? 'active' : ''}">
          ${statusIcon}
        </div>
        <div class="ai-dialog-title-section">
          <h3 class="ai-dialog-title">AI Project</h3>
          <div class="ai-dialog-status">
            <span class="ai-status-indicator ${isEnabled ? 'on' : 'off'}"></span>
            <span class="ai-status-text">${isEnabled ? 'ENABLED' : 'DISABLED'}</span>
          </div>
        </div>
      </div>
      
      <div class="ai-dialog-body">
        <p class="ai-dialog-description">
          ${isEnabled 
            ? 'AI will analyze project and include file context.' 
            : 'Project context injection is off.'}
        </p>
        ${features}
      </div>
      
      <div class="ai-dialog-footer">
        <button class="ai-dialog-btn ai-dialog-btn-primary" onclick="this.closest('.ai-project-dialog-overlay').remove()">
          OK
        </button>
        <button class="ai-dialog-btn ai-dialog-btn-secondary" onclick="this.closest('.ai-project-dialog-overlay').remove(); if(window.toggleAISearch) window.toggleAISearch(false);">
          ${isEnabled ? 'Turn Off' : 'Turn On'}
        </button>
      </div>
      
      <div class="ai-dialog-progress ${isEnabled ? 'active' : ''}"></div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Animate in
  requestAnimationFrame(() => {
    overlay.classList.add('show');
  });
  
  // Auto close after 4 seconds
  setTimeout(() => {
    if (document.body.contains(overlay)) {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
    }
  }, 4000);
}

function injectToastStyles(): void {
  if (document.getElementById('ai-project-toast-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ai-project-toast-styles';
  style.textContent = `
    /* ============================================
       AI PROJECT TOAST - Professional UI
       ============================================ */
    .ai-project-toast {
      position: fixed;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      padding: 0;
      background: linear-gradient(135deg, #1e2128 0%, #171a1f 100%);
      border: 1px solid #30363d;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      color: #e6edf3;
      font-size: 13px;
      font-weight: 500;
      z-index: 10002;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }
    
    .ai-project-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    
    .ai-project-toast.animate-out {
      transform: translateX(-50%) translateY(-10px);
      opacity: 0;
    }
    
    .ai-toast-content {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 18px;
    }
    
    .ai-toast-icon {
      flex-shrink: 0;
      transition: all 0.3s ease;
    }
    
    .ai-toast-text {
      flex: 1;
      white-space: nowrap;
    }
    
    .ai-toast-badge {
      padding: 3px 10px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      border-radius: 4px;
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    
    .ai-toast-badge.off {
      background: rgba(107, 114, 128, 0.2);
      color: #9ca3af;
      border-color: rgba(107, 114, 128, 0.3);
    }
    
    .ai-toast-progress {
      height: 3px;
      background: linear-gradient(90deg, #10b981, #059669);
      animation: ai-toast-progress 2.5s linear forwards;
    }
    
    @keyframes ai-toast-progress {
      from { width: 100%; }
      to { width: 0%; }
    }
    
    /* Success state */
    .ai-project-toast.success {
      border-color: rgba(16, 185, 129, 0.3);
    }
    .ai-project-toast.success .ai-toast-icon {
      color: #10b981;
    }
    
    /* Error state */
    .ai-project-toast.error {
      border-color: rgba(239, 68, 68, 0.3);
    }
    .ai-project-toast.error .ai-toast-icon {
      color: #ef4444;
    }
    .ai-project-toast.error .ai-toast-progress {
      background: linear-gradient(90deg, #ef4444, #dc2626);
    }
    
    /* Info state */
    .ai-project-toast.info {
      border-color: rgba(59, 130, 246, 0.3);
    }
    .ai-project-toast.info .ai-toast-icon {
      color: #3b82f6;
    }
    
    /* AI Project specific styling */
    .ai-project-toast.ai-project-mode {
      min-width: 180px;
    }
    
    .ai-project-toast.ai-project-mode.project-on {
      border-color: rgba(16, 185, 129, 0.4);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.15);
    }
    
    .ai-project-toast.ai-project-mode.project-on .ai-toast-icon {
      color: #10b981;
    }
    
    .ai-project-toast.ai-project-mode.project-off {
      border-color: rgba(107, 114, 128, 0.3);
    }
    
    .ai-project-toast.ai-project-mode.project-off .ai-toast-icon {
      color: #6b7280;
    }
    
    .ai-project-toast.ai-project-mode.project-off .ai-toast-progress {
      background: linear-gradient(90deg, #6b7280, #4b5563);
    }
    
    /* Pulsing animation for star icon */
    .ai-toast-icon.pulsing {
      animation: ai-star-pulse-toast 1.5s ease-in-out infinite;
    }
    
    @keyframes ai-star-pulse-toast {
      0%, 100% { 
        transform: scale(1); 
        filter: drop-shadow(0 0 2px rgba(16, 185, 129, 0.5));
      }
      50% { 
        transform: scale(1.15); 
        filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.8));
      }
    }
    
    /* Glow animation for project mode ON */
    .ai-project-toast.project-on.animate-in .ai-toast-icon {
      animation: ai-star-pulse-toast 1.5s ease-in-out infinite, ai-icon-glow 1s ease-out;
    }
    
    @keyframes ai-icon-glow {
      0% { filter: drop-shadow(0 0 0 rgba(16, 185, 129, 0)); }
      50% { filter: drop-shadow(0 0 12px rgba(16, 185, 129, 1)); }
      100% { filter: drop-shadow(0 0 4px rgba(16, 185, 129, 0.5)); }
    }
    
    /* ============================================
       AI PROJECT DIALOG - Standalone Floating UI
       ============================================ */
    .ai-project-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10003;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .ai-project-dialog-overlay.show {
      opacity: 1;
    }
    
    .ai-project-dialog {
      pointer-events: auto;
      background: linear-gradient(135deg, #1e2128 0%, #171a1f 100%);
      border: 1px solid #30363d;
      border-radius: 12px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      width: 280px;
      max-width: 90vw;
      overflow: hidden;
      transform: scale(0.9) translateY(20px);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }
    
    .ai-project-dialog-overlay.show .ai-project-dialog {
      transform: scale(1) translateY(0);
    }
    
    .ai-project-dialog.enabled {
      border-color: rgba(16, 185, 129, 0.4);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 20px rgba(16, 185, 129, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    }
    
    .ai-project-dialog.disabled {
      border-color: rgba(107, 114, 128, 0.3);
    }
    
    .ai-dialog-close {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      z-index: 1;
    }
    
    .ai-dialog-close:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #e6edf3;
    }
    
    .ai-dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 16px 12px;
    }
    
    .ai-dialog-icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(107, 114, 128, 0.15);
      border: 1px solid rgba(107, 114, 128, 0.2);
      transition: all 0.3s ease;
      flex-shrink: 0;
    }
    
    .ai-dialog-icon-wrapper.active {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.3);
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.2);
    }
    
    .ai-dialog-icon {
      width: 28px;
      height: 28px;
      transition: all 0.3s ease;
    }
    
    .ai-dialog-icon-wrapper.active .ai-dialog-icon {
      color: #10b981;
    }
    
    .ai-dialog-icon-wrapper:not(.active) .ai-dialog-icon {
      color: #6b7280;
    }
    
    .ai-dialog-icon.pulsing {
      animation: ai-dialog-icon-pulse 2s ease-in-out infinite;
    }
    
    @keyframes ai-dialog-icon-pulse {
      0%, 100% { 
        transform: scale(1);
        filter: drop-shadow(0 0 4px rgba(16, 185, 129, 0.3));
      }
      50% { 
        transform: scale(1.1);
        filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.6));
      }
    }
    
    .ai-dialog-title-section {
      flex: 1;
      min-width: 0;
    }
    
    .ai-dialog-title {
      margin: 0 0 4px 0;
      font-size: 15px;
      font-weight: 600;
      color: #e6edf3;
    }
    
    .ai-dialog-status {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .ai-status-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      transition: all 0.3s ease;
    }
    
    .ai-status-indicator.on {
      background: #10b981;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
      animation: ai-status-blink 2s ease-in-out infinite;
    }
    
    .ai-status-indicator.off {
      background: #6b7280;
    }
    
    @keyframes ai-status-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .ai-status-text {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #9ca3af;
    }
    
    .ai-project-dialog.enabled .ai-status-text {
      color: #10b981;
    }
    
    .ai-dialog-body {
      padding: 0 16px 14px;
    }
    
    .ai-dialog-description {
      margin: 0 0 12px 0;
      font-size: 12px;
      line-height: 1.5;
      color: #8b949e;
    }
    
    .ai-dialog-features {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .ai-feature-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #c9d1d9;
    }
    
    .ai-feature-item svg {
      width: 12px;
      height: 12px;
      color: #10b981;
      flex-shrink: 0;
    }
    
    .ai-dialog-features.disabled .ai-feature-item svg {
      color: #6b7280;
    }
    
    .ai-dialog-features.disabled .ai-feature-item {
      color: #6b7280;
    }
    
    .ai-dialog-footer {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .ai-dialog-btn {
      flex: 1;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }
    
    .ai-dialog-btn-primary {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
    }
    
    .ai-dialog-btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }
    
    .ai-project-dialog.disabled .ai-dialog-btn-primary {
      background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
      box-shadow: 0 2px 8px rgba(107, 114, 128, 0.3);
    }
    
    .ai-project-dialog.disabled .ai-dialog-btn-primary:hover {
      box-shadow: 0 4px 12px rgba(107, 114, 128, 0.4);
    }
    
    .ai-dialog-btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: #9ca3af;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .ai-dialog-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #e6edf3;
    }
    
    .ai-dialog-progress {
      height: 2px;
      background: transparent;
    }
    
    .ai-dialog-progress.active {
      background: linear-gradient(90deg, #10b981, #059669);
      animation: ai-dialog-progress 4s linear forwards;
    }
    
    @keyframes ai-dialog-progress {
      from { width: 100%; }
      to { width: 0%; }
    }
  `;
  document.head.appendChild(style);
}

function enableAISearch(silent: boolean = false): void {
  localStorage.setItem(AI_SEARCH_STORAGE_KEY, 'true');
  (window as any).aiFileExplorerEnabled = true;
  (window as any).aiSearchEnabled = true;
  updateAISearchButtonState();
  updateProjectFolderAnimation(true);
  if (!silent) {
    showAIProjectDialog(true);
  }
}

function disableAISearch(silent: boolean = false): void {
  localStorage.setItem(AI_SEARCH_STORAGE_KEY, 'false');
  (window as any).aiFileExplorerEnabled = false;
  (window as any).aiSearchEnabled = false;
  updateAISearchButtonState();
  updateProjectFolderAnimation(false);
  clearAllHighlights();
  if (!silent) {
    showAIProjectDialog(false);
  }
}

function toggleAISearch(showDialogNotification: boolean = true): boolean {
  const newState = !isAISearchEnabled();
  localStorage.setItem(AI_SEARCH_STORAGE_KEY, newState.toString());
  (window as any).aiFileExplorerEnabled = newState;
  (window as any).aiSearchEnabled = newState;
  updateAISearchButtonState();
  updateProjectFolderAnimation(newState);
  
  if (!newState) {
    clearAllHighlights();
  }
  
  // Show dialog for button clicks, toast for programmatic calls
  if (showDialogNotification) {
    showAIProjectDialog(newState);
  } else {
    showAIProjectToast(newState ? 'AI Project: ON' : 'AI Project: OFF', newState ? 'success' : 'info');
  }
  
  return newState;
}

function updateProjectFolderAnimation(isOn: boolean): void {
  document.getElementById('project-ai-badge')?.remove();
  document.querySelectorAll('.project-header-ai-active').forEach(h => h.classList.remove('project-header-ai-active'));
  
  if (!isOn) return;
  
  const projectHeader = document.querySelector('.project-header, .fcm-header, .explorer-header');
  const projectTitle = document.querySelector('.project-header .fcm-header-name, .fcm-header-name, .project-name');
  
  if (projectHeader) projectHeader.classList.add('project-header-ai-active');
  
  if (projectTitle && !document.querySelector('#project-ai-badge, #tree-ai-badge')) {
    const badge = document.createElement('span');
    badge.id = 'project-ai-badge';
    badge.innerHTML = '<span style="color: #10b981;">● AI</span>';
    badge.style.cssText = 'margin-left: 8px; font-size: 11px; font-weight: 600;';
    projectTitle.appendChild(badge);
  }
}

// ============================================================================
// AI SEARCH BUTTON
// ============================================================================

function setupAISearchButton(): void {
  if (document.getElementById('ai-search-tool-btn')) {
    updateAISearchButtonState();
    return;
  }
  
  const toolsContainer = document.querySelector('.input-tools');
  if (!toolsContainer) return;
  
  const styleId = 'ai-search-btn-styles-v5';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* ============================================
         AI PROJECT SEARCH BUTTON - Professional UI v5
         ============================================ */
      #ai-search-tool-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 28px !important;
        height: 28px !important;
        padding: 0 !important;
        margin: 0 4px !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        background: transparent !important;
        border: 1px solid transparent !important;
        outline: none !important;
        transition: all 0.2s ease !important;
        position: relative !important;
      }
      
      #ai-search-tool-btn:hover {
        background: rgba(255, 255, 255, 0.08) !important;
        border-color: rgba(255, 255, 255, 0.1) !important;
      }
      
      /* ACTIVE STATE - Green theme */
      #ai-search-tool-btn.active {
        background: rgba(16, 185, 129, 0.15) !important;
        border-color: rgba(16, 185, 129, 0.4) !important;
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.3) !important;
      }
      
      #ai-search-tool-btn.active:hover {
        background: rgba(16, 185, 129, 0.25) !important;
        border-color: rgba(16, 185, 129, 0.6) !important;
        box-shadow: 0 0 12px rgba(16, 185, 129, 0.4) !important;
      }
      
      #ai-search-tool-btn .ai-star-icon {
        font-size: 14px !important;
        color: #6b7280 !important;
        transition: all 0.2s ease !important;
        line-height: 1 !important;
      }
      
      #ai-search-tool-btn:hover .ai-star-icon {
        color: #9ca3af !important;
      }
      
      #ai-search-tool-btn.active .ai-star-icon {
        color: #10b981 !important;
        text-shadow: 0 0 8px rgba(16, 185, 129, 0.7) !important;
        animation: ai-star-pulse 2s ease-in-out infinite !important;
      }
      
      @keyframes ai-star-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.15); opacity: 0.85; }
      }
      
      /* Status dot */
      #ai-search-tool-btn .ai-status-dot {
        position: absolute !important;
        top: 2px !important;
        right: 2px !important;
        width: 7px !important;
        height: 7px !important;
        background: #6b7280 !important;
        border-radius: 50% !important;
        transition: all 0.2s ease !important;
        pointer-events: none !important;
      }
      
      #ai-search-tool-btn.active .ai-status-dot {
        background: #10b981 !important;
        box-shadow: 0 0 6px rgba(16, 185, 129, 1) !important;
        animation: ai-dot-pulse 1.5s ease-in-out infinite !important;
      }
      
      @keyframes ai-dot-pulse {
        0%, 100% { 
          transform: scale(1); 
          box-shadow: 0 0 6px rgba(16, 185, 129, 1);
        }
        50% { 
          transform: scale(1.3); 
          box-shadow: 0 0 10px rgba(16, 185, 129, 1);
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'ai-search-tool-btn';
  btn.title = 'AI Project: OFF';
  btn.innerHTML = '<span class="ai-star-icon">✦</span><span class="ai-status-dot"></span>';
  
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = toggleAISearch();
    btn.classList.toggle('active', newState);
    btn.title = newState ? 'AI Project: ON' : 'AI Project: OFF';
  });
  
  const parent = toolsContainer.parentElement;
  if (parent && !parent.closest('label')) {
    parent.insertBefore(btn, toolsContainer);
  } else {
    toolsContainer.insertBefore(btn, toolsContainer.firstChild);
  }
  
  console.log('✅ AI Search button created');
}

function updateAISearchButtonState(): void {
  const btn = document.getElementById('ai-search-tool-btn') as HTMLButtonElement;
  if (!btn) return;
  
  // Check multiple sources for the state
  const isActive = isAISearchEnabled() || 
                   (window as any).aiFileExplorerEnabled === true || 
                   (window as any).aiSearchEnabled === true;
  
  btn.classList.toggle('active', isActive);
  btn.title = isActive ? 'AI Project: ON' : 'AI Project: OFF';
  
  // Update the star icon appearance
  const starIcon = btn.querySelector('.ai-star-icon');
  if (starIcon) {
    (starIcon as HTMLElement).style.color = isActive ? '#10b981' : '';
  }
}

function reconnectAISearchButton(): void {
  const btn = document.getElementById('ai-search-tool-btn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleAISearch();
      updateAISearchButtonState();
    });
  }
}

// Auto-setup button
const initButton = () => {
  let attempts = 0;
  const trySetup = () => {
    if (document.querySelector('.input-tools')) {
      setupAISearchButton();
    } else if (attempts++ < 20) {
      setTimeout(trySetup, 500);
    }
  };
  setTimeout(trySetup, 300);
};

if (document.readyState === 'complete') {
  initButton();
} else {
  window.addEventListener('load', initButton);
}

// Legacy functions (stubs for backwards compatibility)
function highlightFileBeingRead(filePath: string): void { highlightFileReading(filePath, 0); }
function markFileLoadingComplete(filePath?: string): void { filePath ? highlightFileIndexed(filePath) : clearAllHighlights(); }
function clearFileHighlights(): void { clearAllHighlights(); }
function highlightMatchingFiles(query: string): void {
  if (!isAISearchEnabled()) return;
  clearAllHighlights();
  const fileTree = document.querySelector('.file-tree') as HTMLElement;
  if (!fileTree || !query) return;
  
  fileTree.querySelectorAll('[data-path]').forEach(el => {
    const path = el.getAttribute('data-path') || '';
    const fileName = path.split(/[/\\]/).pop() || '';
    if (fileName.toLowerCase().includes(query.toLowerCase())) {
      highlightFileScanning(path);
    }
  });
}

function addLoadingDot(): void {}
function startExplorerScanAnimation(): void {}
function stopExplorerScanAnimation(): void { clearAllHighlights(); }
function updateExplorerAIState(): void {}
function connectExistingAISearchToggle(): void {}
function updateToggleButtonAppearance(): void {}
function injectScanAnimationStyles(): void {}
function createAISearchToggleHTML(): string { return ''; }
function attachAISearchToggleListeners(): void {}
function addAISearchToDropdown(): void {}
function updateAISearchToggleUI(): void {}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as any).enableAISearch = enableAISearch;
(window as any).disableAISearch = disableAISearch;
(window as any).toggleAISearch = toggleAISearch;
(window as any).isAISearchEnabled = isAISearchEnabled;
(window as any).setupAISearchButton = setupAISearchButton;
(window as any).updateAISearchButtonState = updateAISearchButtonState;
(window as any).highlightFileBeingRead = highlightFileBeingRead;
(window as any).highlightMatchingFiles = highlightMatchingFiles;
(window as any).markFileLoadingComplete = markFileLoadingComplete;
(window as any).clearFileHighlights = clearFileHighlights;
(window as any).setFileHighlightState = setFileHighlightState;
(window as any).highlightFileScanning = highlightFileScanning;
(window as any).highlightFileReading = highlightFileReading;
(window as any).highlightFileIndexed = highlightFileIndexed;
(window as any).highlightFileError = highlightFileError;
(window as any).clearAllHighlights = clearAllHighlights;
(window as any).markAllFilesIndexed = markAllFilesIndexed;

// ============================================================================
// MODULE EXPORTS
// ============================================================================

export {
  searchFilesByName,
  searchFilesByContent,
  readFileContent,
  findRelatedFiles,
  enhanceWithFileContext,
  addFileToContext,
  getPendingFileContext,
  showFileSearchUI,
  showFileSuggestions,
  suggestRelevantFiles,
  parseFileCommands,
  executeFileCommand,
  aiNeedsMoreContext,
  extractFileReferences,
  initializeAIFileExplorer,
  enableAISearch,
  disableAISearch,
  toggleAISearch,
  isAISearchEnabled,
  setupAISearchButton,
  updateAISearchButtonState,
  reconnectAISearchButton,
  highlightFileBeingRead,
  highlightMatchingFiles,
  markFileLoadingComplete,
  clearFileHighlights,
  setFileHighlightState,
  highlightFileScanning,
  highlightFileReading,
  highlightFileIndexed,
  highlightFileError,
  clearAllHighlights,
  markAllFilesIndexed,
  HIGHLIGHT_CONFIG,
};

export default initializeAIFileExplorer;
