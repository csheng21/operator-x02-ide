// aiFileExplorer.ts - AI File Search & Access System (FIXED VERSION)
// Allows AI to search and read files from the project when needed
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

console.log('🔍 [AI File Explorer] v2.1 FIXED - Loading...');

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
// STORAGE KEYS
// ============================================================================

const AI_SEARCH_STORAGE_KEY = 'aiFileExplorerEnabled';
const AI_SEARCH_SESSION_KEY = 'aiFileExplorerSessionInit';

// ============================================================================
// AI SEARCH STATE MANAGEMENT
// ============================================================================

/**
 * Check if AI Search is enabled
 */
export function isAISearchEnabled(): boolean {
  return localStorage.getItem(AI_SEARCH_STORAGE_KEY) === 'true';
}

/**
 * Enable AI Search
 */
export function enableAISearch(): void {
  localStorage.setItem(AI_SEARCH_STORAGE_KEY, 'true');
  (window as any).aiFileExplorerEnabled = true;
  updateExplorerAIState(true);
  updateAISearchButtonState();
  console.log('✅ AI Search enabled');
}

/**
 * Disable AI Search
 */
export function disableAISearch(): void {
  localStorage.setItem(AI_SEARCH_STORAGE_KEY, 'false');
  (window as any).aiFileExplorerEnabled = false;
  updateExplorerAIState(false);
  updateAISearchButtonState();
  console.log('❌ AI Search disabled');
}

/**
 * Toggle AI Search
 */
export function toggleAISearch(): boolean {
  const newState = !isAISearchEnabled();
  if (newState) {
    enableAISearch();
  } else {
    disableAISearch();
  }
  return newState;
}

// Reset AI Search state on fresh IDE load
function initAISearchState(): void {
  const sessionInit = sessionStorage.getItem(AI_SEARCH_SESSION_KEY);
  if (!sessionInit) {
    console.log('🔍 [AI Search] Fresh session - resetting to OFF');
    localStorage.setItem(AI_SEARCH_STORAGE_KEY, 'false');
    (window as any).aiFileExplorerEnabled = false;
    sessionStorage.setItem(AI_SEARCH_SESSION_KEY, 'true');
  }
}

initAISearchState();

// ============================================================================
// FILE SEARCH FUNCTIONS
// ============================================================================

/**
 * Get current project path from file explorer
 */
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

/**
 * Search files by name pattern
 */
export async function searchFilesByName(query: string): Promise<FileSearchResult[]> {
  const results: FileSearchResult[] = [];
  const projectPath = getProjectPath();
  
  if (!projectPath) {
    console.warn('No project path found');
    return results;
  }
  
  try {
    const files = await invoke('search_files', {
      path: projectPath,
      query: query,
      maxResults: 20
    }) as FileSearchResult[];
    return files;
  } catch (e) {
    // Fallback: search from DOM file tree
    console.log('Falling back to DOM search');
    const fileElements = document.querySelectorAll('[data-path]');
    const queryLower = query.toLowerCase();
    
    fileElements.forEach(el => {
      const path = el.getAttribute('data-path') || '';
      const name = path.split(/[/\\]/).pop() || '';
      
      if (name.toLowerCase().includes(queryLower)) {
        const isFolder = el.classList.contains('folder') || el.hasAttribute('data-is-folder');
        results.push({
          path,
          name,
          type: isFolder ? 'folder' : 'file',
          extension: name.includes('.') ? name.split('.').pop() : undefined
        });
      }
    });
    
    return results.slice(0, 20);
  }
}

/**
 * Search files by content
 */
export async function searchFilesByContent(query: string): Promise<FileSearchResult[]> {
  const projectPath = getProjectPath();
  if (!projectPath) return [];
  
  try {
    const results = await invoke('search_file_contents', {
      path: projectPath,
      query: query,
      maxResults: 10
    }) as FileSearchResult[];
    return results;
  } catch (e) {
    console.error('Content search failed:', e);
    return [];
  }
}

/**
 * Get language from file extension
 */
function getLanguageFromExtension(ext: string): string {
  const map: Record<string, string> = {
    'ts': 'typescript', 'tsx': 'typescript',
    'js': 'javascript', 'jsx': 'javascript',
    'py': 'python', 'rs': 'rust', 'go': 'go',
    'java': 'java', 'c': 'c', 'cpp': 'cpp',
    'cs': 'csharp', 'rb': 'ruby', 'php': 'php',
    'swift': 'swift', 'kt': 'kotlin',
    'html': 'html', 'css': 'css', 'scss': 'scss',
    'json': 'json', 'yaml': 'yaml', 'yml': 'yaml',
    'xml': 'xml', 'md': 'markdown', 'sql': 'sql',
    'sh': 'bash', 'bash': 'bash', 'vue': 'vue', 'svelte': 'svelte'
  };
  return map[ext.toLowerCase()] || 'plaintext';
}

/**
 * Read file content
 */
export async function readFileContent(filePath: string, maxLength: number = 10000): Promise<FileContent | null> {
  try {
    highlightFileBeingRead(filePath);
    const loadingStartTime = Date.now();
    const MIN_LOADING_DISPLAY_MS = 800;
    
    let content = '';
    
    try {
      content = await invoke('read_file_content', { path: filePath }) as string;
    } catch (e1) {
      try {
        content = await invoke('read_file', { path: filePath }) as string;
      } catch (e2) {
        console.error('Failed to read file:', e2);
        const elapsed = Date.now() - loadingStartTime;
        if (elapsed < MIN_LOADING_DISPLAY_MS) {
          await new Promise(r => setTimeout(r, MIN_LOADING_DISPLAY_MS - elapsed));
        }
        markFileLoadingComplete(filePath);
        return null;
      }
    }
    
    const name = filePath.split(/[/\\]/).pop() || 'file';
    const extension = name.includes('.') ? name.split('.').pop() || '' : '';
    const lineCount = content.split('\n').length;
    const truncated = content.length > maxLength;
    
    const elapsed = Date.now() - loadingStartTime;
    if (elapsed < MIN_LOADING_DISPLAY_MS) {
      await new Promise(r => setTimeout(r, MIN_LOADING_DISPLAY_MS - elapsed));
    }
    
    markFileLoadingComplete(filePath);
    
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
    markFileLoadingComplete(filePath);
    return null;
  }
}

// ============================================================================
// AI CONTEXT BUILDER - EXPORTED FUNCTIONS
// ============================================================================

/**
 * Extract keywords from a question/topic
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'what',
    'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and',
    'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by',
    'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out',
    'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
    'there', 'file', 'files', 'code', 'function', 'class', 'method', 'please',
    'help', 'me', 'my', 'your', 'find', 'show', 'get', 'look', 'check'
  ]);
  
  const words = text.toLowerCase()
    .replace(/[^a-z0-9_.-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  
  const filePatterns = text.match(/[\w.-]+\.(ts|tsx|js|jsx|py|rs|go|java|css|html|json|md)/gi) || [];
  const keywords = [...new Set([...filePatterns, ...words])];
  
  return keywords.slice(0, 8);
}

/**
 * Find files related to a topic/question
 */
export async function findRelatedFiles(topic: string): Promise<FileSearchResult[]> {
  const keywords = extractKeywords(topic);
  const results: FileSearchResult[] = [];
  const seen = new Set<string>();
  
  for (const keyword of keywords) {
    const byName = await searchFilesByName(keyword);
    byName.forEach(f => {
      if (!seen.has(f.path)) {
        seen.add(f.path);
        results.push({ ...f, relevance: 0.8 });
      }
    });
    
    if (results.length >= 15) break;
  }
  
  return results.sort((a, b) => (b.relevance || 0) - (a.relevance || 0)).slice(0, 10);
}

/**
 * Build file context for AI
 */
async function buildFileContext(files: FileSearchResult[]): Promise<string> {
  if (files.length === 0) return '';
  
  const contents: string[] = [];
  
  for (const file of files.slice(0, 5)) {
    if (file.type === 'file') {
      const content = await readFileContent(file.path, 3000);
      if (content) {
        contents.push(`
📄 **${file.name}** (${file.path})
\`\`\`${content.language}
${content.content}
\`\`\`
`);
      }
    }
  }
  
  if (contents.length === 0) return '';
  
  return `
[🔍 AI File Explorer - Found ${files.length} related files]
${contents.join('\n---\n')}
`;
}

/**
 * Detect if AI response suggests it needs more file context
 */
export function aiNeedsMoreContext(response: string): boolean {
  const indicators = [
    'i don\'t have access',
    'i cannot see',
    'i would need to see',
    'could you share',
    'could you provide',
    'please share',
    'please provide',
    'i don\'t have the file',
    'i can\'t access',
    'without seeing the',
    'if you could share',
    'show me the',
    'i\'d need to examine',
    'i cannot examine',
    'i don\'t have visibility',
    'appears to be empty',
    'no files shown'
  ];
  
  const responseLower = response.toLowerCase();
  return indicators.some(indicator => responseLower.includes(indicator));
}

/**
 * Extract file references from AI response
 */
export function extractFileReferences(text: string): string[] {
  const patterns = [
    /(?:file|files?)\s+(?:named?|called?)\s+['"`]?([a-zA-Z0-9_.-]+\.[a-zA-Z]+)['"`]?/gi,
    /['"`]([a-zA-Z0-9_.-]+\.(ts|tsx|js|jsx|py|rs|css|html|json|md))['"`]/gi,
    /(?:in|from|see|check|look at)\s+['"`]?([a-zA-Z0-9_.-]+\.[a-zA-Z]+)['"`]?/gi
  ];
  
  const files: string[] = [];
  
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && !files.includes(match[1])) {
        files.push(match[1]);
      }
    }
  }
  
  return files;
}

/**
 * Get project files from DOM for context
 */
function getProjectFilesFromDOM(): { name: string; path: string }[] {
  const files: { name: string; path: string }[] = [];
  const selectors = ['[data-path]', '.file-item', '.tree-item'];
  
  const foundElements = new Set<Element>();
  for (const selector of selectors) {
    document.querySelectorAll(selector).forEach(el => foundElements.add(el));
  }
  
  foundElements.forEach(el => {
    const path = el.getAttribute('data-path') || el.getAttribute('title') || '';
    if (!path) return;
    
    const name = path.split(/[/\\]/).pop() || '';
    if (!name || name.startsWith('.') || name === 'node_modules') return;
    
    files.push({ name, path });
  });
  
  return Array.from(new Map(files.map(f => [f.path, f])).values());
}

/**
 * Build project context for AI
 */
function buildProjectContext(): string {
  const files = getProjectFilesFromDOM();
  const projectPath = getProjectPath();
  
  if (files.length === 0) return '';
  
  const fileNames = files.map(f => f.name);
  const projectName = projectPath?.split(/[/\\]/).pop() || 'Project';
  
  return `
[PROJECT CONTEXT]
Project: ${projectName}
Files (${files.length}): ${fileNames.slice(0, 20).join(', ')}${fileNames.length > 20 ? ` ... +${fileNames.length - 20} more` : ''}
`;
}

/**
 * Enhance user message with relevant file context
 */
export async function enhanceWithFileContext(message: string): Promise<string> {
  // Always add project context if AI Search is enabled
  let projectContext = '';
  if (isAISearchEnabled()) {
    projectContext = buildProjectContext();
  }
  
  // Check if message mentions specific files
  const mentionedFiles = extractFileReferences(message);
  const relatedFiles = await findRelatedFiles(message);
  
  const allFiles = [...mentionedFiles.map(name => ({ name, path: '', type: 'file' as const })), ...relatedFiles];
  
  if (allFiles.length === 0) {
    return projectContext ? `${projectContext}\n${message}` : message;
  }
  
  // Search for mentioned files
  const foundFiles: FileSearchResult[] = [];
  for (const file of mentionedFiles) {
    const results = await searchFilesByName(file);
    foundFiles.push(...results.slice(0, 2));
  }
  
  foundFiles.push(...relatedFiles.slice(0, 3));
  
  const context = await buildFileContext(foundFiles);
  
  if (!context && !projectContext) return message;
  
  return `${projectContext}${context ? context + '\n' : ''}${message}`;
}

/**
 * Suggest relevant files
 */
export async function suggestRelevantFiles(message: string): Promise<FileSearchResult[]> {
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

// ============================================================================
// FILE CONTEXT MANAGEMENT
// ============================================================================

/**
 * Add file to AI context
 */
export async function addFileToContext(filePath: string): Promise<void> {
  const content = await readFileContent(filePath);
  if (!content) {
    if ((window as any).showNotification) {
      (window as any).showNotification('Failed to read file', 'error');
    }
    return;
  }
  
  const pendingContext = (window as any).pendingFileContext || [];
  pendingContext.push(content);
  (window as any).pendingFileContext = pendingContext;
  
  if ((window as any).showNotification) {
    (window as any).showNotification(`Added ${content.name} to AI context`, 'success');
  }
  
  console.log('📎 Added file to context:', content.name);
}

/**
 * Get and clear pending file context
 */
export function getPendingFileContext(): string {
  const pending = (window as any).pendingFileContext as FileContent[] || [];
  (window as any).pendingFileContext = [];
  
  if (pending.length === 0) return '';
  
  return pending.map(f => `
📄 **${f.name}**
\`\`\`${f.language}
${f.content}
\`\`\`
`).join('\n---\n');
}

// ============================================================================
// UI COMPONENTS
// ============================================================================

/**
 * Show file search UI
 */
export function showFileSearchUI(): void {
  const chatContainer = document.querySelector('.ai-chat-container, .chat-messages');
  if (!chatContainer) return;
  
  document.querySelectorAll('.ai-file-search-ui').forEach(el => el.remove());
  
  const searchUI = document.createElement('div');
  searchUI.className = 'ai-file-search-ui';
  searchUI.innerHTML = `
    <div style="
      background: linear-gradient(135deg, rgba(88, 166, 255, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
      border: 1px solid rgba(88, 166, 255, 0.2);
      border-radius: 10px;
      padding: 12px 16px;
      margin: 8px 0;
    ">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <span style="color: #58a6ff; font-weight: 600; font-size: 13px;">🔍 AI File Explorer</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <input type="text" placeholder="Search files..." style="
          flex: 1;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 8px 12px;
          color: #e6edf3;
          font-size: 12px;
          outline: none;
        " id="ai-file-search-input" />
        <button style="
          background: linear-gradient(135deg, #58a6ff 0%, #8b5cf6 100%);
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          color: #fff;
          font-size: 12px;
          cursor: pointer;
        " id="ai-file-search-btn">Search</button>
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
      <div class="ai-file-result" data-path="${f.path}" style="
        display: flex; align-items: center; gap: 8px;
        padding: 6px 8px; border-radius: 4px; cursor: pointer;
        font-size: 12px; color: #d4d4d4;
      ">
        <span style="flex: 1;">${f.name}</span>
        <button class="add-to-context-btn" style="
          background: rgba(88, 166, 255, 0.2);
          border: none; border-radius: 4px;
          padding: 4px 8px; color: #58a6ff;
          font-size: 10px; cursor: pointer;
        ">+ Add to AI</button>
      </div>
    `).join('');
    
    resultsDiv.querySelectorAll('.add-to-context-btn').forEach(addBtn => {
      addBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const path = (addBtn.closest('.ai-file-result') as HTMLElement)?.getAttribute('data-path');
        if (path) {
          await addFileToContext(path);
          (addBtn as HTMLButtonElement).textContent = '✓ Added';
        }
      });
    });
  };
  
  btn.addEventListener('click', doSearch);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') doSearch();
  });
  
  input.focus();
}

/**
 * Show file suggestions
 */
export function showFileSuggestions(files: FileSearchResult[]): void {
  if (files.length === 0) return;
  
  const chatContainer = document.querySelector('.ai-chat-container, .chat-messages');
  if (!chatContainer) return;
  
  document.querySelectorAll('.ai-file-suggestions').forEach(el => el.remove());
  
  const suggestionsUI = document.createElement('div');
  suggestionsUI.className = 'ai-file-suggestions';
  suggestionsUI.innerHTML = `
    <div style="
      background: rgba(139, 92, 246, 0.08);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 8px;
      padding: 10px 14px;
      margin: 8px 0;
    ">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="color: #8b5cf6; font-size: 11px; font-weight: 500;">⭐ Related files found</span>
        <button class="dismiss-suggestions" style="
          margin-left: auto; background: transparent;
          border: none; color: #666; cursor: pointer;
        ">×</button>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        ${files.map(f => `
          <button class="file-suggestion-chip" data-path="${f.path}" style="
            background: rgba(139, 92, 246, 0.15);
            border: none; border-radius: 4px;
            padding: 4px 8px; color: #c4b5fd;
            font-size: 11px; cursor: pointer;
          ">+ ${f.name}</button>
        `).join('')}
      </div>
    </div>
  `;
  
  const inputArea = chatContainer.querySelector('.chat-input-area, .input-container');
  if (inputArea) {
    inputArea.parentNode?.insertBefore(suggestionsUI, inputArea);
  } else {
    chatContainer.appendChild(suggestionsUI);
  }
  
  suggestionsUI.querySelector('.dismiss-suggestions')?.addEventListener('click', () => {
    suggestionsUI.remove();
  });
  
  suggestionsUI.querySelectorAll('.file-suggestion-chip').forEach(chip => {
    chip.addEventListener('click', async () => {
      const path = chip.getAttribute('data-path');
      if (path) {
        await addFileToContext(path);
        (chip as HTMLButtonElement).style.background = 'rgba(63, 185, 80, 0.15)';
        (chip as HTMLButtonElement).style.color = '#3fb950';
        chip.textContent = '✓ ' + chip.textContent?.replace('+', '').trim();
      }
    });
  });
}

// ============================================================================
// FILE COMMANDS
// ============================================================================

/**
 * Parse file commands from text
 */
export function parseFileCommands(text: string): Array<{ type: string; arg: string }> {
  const commands: Array<{ type: string; arg: string }> = [];
  const patterns = [
    /\[FILE:(\w+):([^\]]+)\]/g,
    /\[FILE:(\w+)\]/g
  ];
  
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      commands.push({
        type: match[1],
        arg: match[2] || ''
      });
    }
  }
  
  return commands;
}

/**
 * Execute file command
 */
export async function executeFileCommand(command: { type: string; arg: string }): Promise<string> {
  switch (command.type.toLowerCase()) {
    case 'search':
      const results = await searchFilesByName(command.arg);
      return results.length > 0 
        ? `Found files: ${results.map(f => f.name).join(', ')}`
        : 'No files found';
    
    case 'read':
      const content = await readFileContent(command.arg);
      return content 
        ? `\`\`\`${content.language}\n${content.content}\n\`\`\``
        : 'Failed to read file';
    
    case 'list':
      const projectPath = getProjectPath();
      if (!projectPath) return 'No project open';
      try {
        const tree = await invoke('generate_tree_text', { 
          path: projectPath, 
          maxDepth: 3 
        }) as string;
        return `Project structure:\n\`\`\`\n${tree}\n\`\`\``;
      } catch (e) {
        return 'Could not list project files';
      }
    
    default:
      return `Unknown command: ${command.type}`;
  }
}

// ============================================================================
// ANIMATIONS & VISUAL FEEDBACK
// ============================================================================

let scanAnimationInterval: number | null = null;
let animationStartTime: number = 0;
const MIN_ANIMATION_DURATION_MS = 1500;

/**
 * Inject animation styles
 */
function injectScanAnimationStyles(): void {
  if (document.getElementById('ai-search-scan-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'ai-search-scan-styles';
  styles.textContent = `
    .file-tree.ai-search-active::after,
    .explorer-panel.ai-search-active::after,
    #file-tree.ai-search-active::after {
      content: '';
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, transparent, #4fc3f7, transparent);
      z-index: 9999;
      animation: ai-bottom-glow 2s ease-in-out infinite;
    }
    
    @keyframes ai-bottom-glow {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }
    
    .ai-file-reading {
      background: rgba(79, 195, 247, 0.15) !important;
      color: #4fc3f7 !important;
    }
    
    #ai-search-tool-btn.active {
      animation: ai-search-btn-pulse 2s ease-in-out infinite;
    }
    
    @keyframes ai-search-btn-pulse {
      0%, 100% { box-shadow: 0 0 5px rgba(76, 175, 80, 0.3); }
      50% { box-shadow: 0 0 15px rgba(76, 175, 80, 0.6); }
    }
  `;
  document.head.appendChild(styles);
}

/**
 * Start explorer scan animation
 */
export function startExplorerScanAnimation(): void {
  animationStartTime = Date.now();
  injectScanAnimationStyles();
  
  const explorer = document.querySelector('.file-tree, .explorer-panel, #file-tree') as HTMLElement;
  if (explorer) {
    explorer.classList.add('ai-search-active', 'ai-scanning');
  }
  console.log('🔍 Explorer scan animation started');
}

/**
 * Stop explorer scan animation
 */
export function stopExplorerScanAnimation(): void {
  const elapsed = Date.now() - animationStartTime;
  const remaining = Math.max(0, MIN_ANIMATION_DURATION_MS - elapsed);
  
  setTimeout(() => {
    const explorer = document.querySelector('.file-tree, .explorer-panel, #file-tree') as HTMLElement;
    if (explorer) {
      explorer.classList.remove('ai-scanning');
      if (!isAISearchEnabled()) {
        explorer.classList.remove('ai-search-active');
      }
    }
    console.log('🔍 Explorer scan animation stopped');
  }, remaining);
}

/**
 * Highlight file being read
 */
export function highlightFileBeingRead(filePath: string): void {
  const fileName = filePath.split(/[/\\]/).pop() || '';
  document.querySelectorAll('[data-path]').forEach(el => {
    const elPath = el.getAttribute('data-path') || '';
    if (elPath === filePath || elPath.endsWith(fileName)) {
      el.classList.add('ai-file-reading');
    }
  });
}

/**
 * Highlight matching files
 */
export function highlightMatchingFiles(fileNames: string[]): void {
  document.querySelectorAll('[data-path]').forEach(el => {
    const path = el.getAttribute('data-path') || '';
    const name = path.split(/[/\\]/).pop() || '';
    if (fileNames.some(fn => name.includes(fn) || fn.includes(name))) {
      el.classList.add('ai-file-reading');
    }
  });
}

/**
 * Mark file loading complete
 */
export function markFileLoadingComplete(filePath: string): void {
  const fileName = filePath.split(/[/\\]/).pop() || '';
  document.querySelectorAll('[data-path]').forEach(el => {
    const elPath = el.getAttribute('data-path') || '';
    if (elPath === filePath || elPath.endsWith(fileName)) {
      el.classList.remove('ai-file-reading');
    }
  });
}

/**
 * Clear all file highlights
 */
export function clearFileHighlights(): void {
  document.querySelectorAll('.ai-file-reading').forEach(el => {
    el.classList.remove('ai-file-reading');
  });
}

/**
 * Update explorer AI state
 */
export function updateExplorerAIState(enabled: boolean): void {
  const explorer = document.querySelector('.file-tree, .explorer-panel, #file-tree') as HTMLElement;
  if (explorer) {
    if (enabled) {
      explorer.classList.add('ai-search-active');
    } else {
      explorer.classList.remove('ai-search-active');
    }
  }
}

/**
 * Connect existing AI Search toggle
 */
export function connectExistingAISearchToggle(): void {
  const toggle = document.querySelector('#ai-search-toggle, .ai-search-toggle') as HTMLInputElement;
  if (toggle) {
    toggle.checked = isAISearchEnabled();
    toggle.addEventListener('change', () => {
      if (toggle.checked) {
        enableAISearch();
      } else {
        disableAISearch();
      }
    });
  }
}

/**
 * Update project folder animation
 */
export function updateProjectFolderAnimation(): void {
  // Placeholder for compatibility
}

/**
 * Update toggle button appearance
 */
export function updateToggleButtonAppearance(): void {
  updateAISearchButtonState();
}

// ============================================================================
// AI SEARCH BUTTON
// ============================================================================

/**
 * Create AI Search toggle HTML
 */
export function createAISearchToggleHTML(): string {
  return `
    <button id="ai-search-tool-btn" type="button" title="AI Project Search: OFF">
      <span class="ai-star-icon">✦</span>
    </button>
  `;
}

/**
 * Attach AI Search toggle listeners
 */
export function attachAISearchToggleListeners(): void {
  const btn = document.getElementById('ai-search-tool-btn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleAISearch();
    });
  }
}

/**
 * Add AI Search to dropdown
 */
export function addAISearchToDropdown(): void {
  // Placeholder for compatibility
}

/**
 * Setup AI Search button
 */
export function setupAISearchButton(): void {
  const toolsContainer = document.querySelector('.input-tools');
  if (!toolsContainer) return;
  
  if (document.getElementById('ai-search-tool-btn')) return;
  
  injectScanAnimationStyles();
  
  const btn = document.createElement('button');
  btn.id = 'ai-search-tool-btn';
  btn.type = 'button';
  
  const isActive = isAISearchEnabled();
  btn.className = isActive ? 'active' : '';
  btn.title = `AI Project Search: ${isActive ? 'ON' : 'OFF'}`;
  
  const style = document.createElement('style');
  style.textContent = `
    #ai-search-tool-btn {
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      margin-right: 4px;
    }
    #ai-search-tool-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    #ai-search-tool-btn .ai-star-icon {
      font-size: 18px;
      color: #666;
      transition: all 0.3s;
    }
    #ai-search-tool-btn.active .ai-star-icon {
      color: #4caf50;
      text-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
    }
  `;
  document.head.appendChild(style);
  
  const star = document.createElement('span');
  star.className = 'ai-star-icon';
  star.textContent = '✦';
  btn.appendChild(star);
  
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = toggleAISearch();
    console.log('🔍 AI Search toggled:', newState ? 'ON' : 'OFF');
  }, true);
  
  const parent = toolsContainer.parentElement;
  if (parent) {
    parent.insertBefore(btn, toolsContainer);
  } else {
    toolsContainer.insertBefore(btn, toolsContainer.firstChild);
  }
  
  console.log('✅ AI Search button setup complete');
}

/**
 * Update AI Search button state
 */
export function updateAISearchButtonState(): void {
  const btn = document.getElementById('ai-search-tool-btn') as HTMLButtonElement;
  if (!btn) return;
  
  const isActive = isAISearchEnabled();
  
  if (isActive) {
    btn.classList.add('active');
    btn.title = 'AI Project Search: ON';
  } else {
    btn.classList.remove('active');
    btn.title = 'AI Project Search: OFF';
  }
}

/**
 * Reconnect AI Search button
 */
export function reconnectAISearchButton(): void {
  const btn = document.getElementById('ai-search-tool-btn') as HTMLButtonElement;
  if (btn) {
    const newBtn = btn.cloneNode(true) as HTMLButtonElement;
    btn.replaceWith(newBtn);
    
    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleAISearch();
    }, true);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function injectStyles(): void {
  if (document.getElementById('ai-file-explorer-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ai-file-explorer-styles';
  style.textContent = `
    .ai-file-search-ui input:focus {
      border-color: rgba(88, 166, 255, 0.4) !important;
    }
    .file-suggestion-chip:hover {
      background: rgba(139, 92, 246, 0.25) !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Initialize AI File Explorer
 */
export function initializeAIFileExplorer(): void {
  console.log('🔍 [AI File Explorer] Initializing...');
  
  injectStyles();
  injectScanAnimationStyles();
  
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      showFileSearchUI();
    }
  });
  
  document.addEventListener('ai-user-message', async (e: any) => {
    const message = e.detail?.message;
    if (message && message.length > 10) {
      const suggestions = await suggestRelevantFiles(message);
      if (suggestions.length > 0) {
        showFileSuggestions(suggestions);
      }
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
    parseCommands: parseFileCommands,
    isEnabled: isAISearchEnabled,
    toggle: toggleAISearch
  };
  
  console.log('✅ [AI File Explorer] Ready!');
}

// Auto-initialize with retry
const initWithRetry = () => {
  let attempts = 0;
  const trySetup = () => {
    attempts++;
    const toolsContainer = document.querySelector('.input-tools');
    if (toolsContainer) {
      setupAISearchButton();
    } else if (attempts < 20) {
      setTimeout(trySetup, 500);
    }
  };
  setTimeout(trySetup, 300);
};

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAIFileExplorer);
  } else {
    initializeAIFileExplorer();
  }
}

if (document.readyState === 'complete') {
  initWithRetry();
} else {
  window.addEventListener('load', initWithRetry);
}

// Expose globally
(window as any).enableAISearch = enableAISearch;
(window as any).disableAISearch = disableAISearch;
(window as any).toggleAISearch = toggleAISearch;
(window as any).isAISearchEnabled = isAISearchEnabled;
(window as any).setupAISearchButton = setupAISearchButton;
(window as any).updateAISearchButtonState = updateAISearchButtonState;

export default initializeAIFileExplorer;
