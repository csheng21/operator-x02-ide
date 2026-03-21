// ide/fileExplorer/explorerSearch.ts - Complete Search System with AI Integration
// Searches both file names and file contents with result preview

import { isTauriAvailable, readFile, showNotification, getCurrentFolderRootPath } from '../../fileSystem';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentApiConfigurationForced, callGenericAPI } from '../aiAssistant/apiProviderManager';

// ============================================================================
// INTELLIGENT AI SEARCH ENGINE
// ============================================================================

interface FileMetadata {
  path: string;
  name: string;
  extension: string;
  size: number;
  isDirectory: boolean;
  depth: number;
}

interface AISearchResult {
  suggestions: string[];
  relatedTerms: string[];
  explanation: string;
  suggestedFiles: SuggestedFile[];
  searchStrategy: string;
}

interface SuggestedFile {
  path: string;
  name: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

interface SearchResultItem {
  path: string;
  preview: string;
  line?: number;
  matchType: 'filename' | 'content';
}

class AIContentSearchEngine {
  private cache: Map<string, AISearchResult> = new Map();
  private fileMetadataCache: FileMetadata[] = [];

  // Collect file metadata from the project
  public async collectFileMetadata(): Promise<FileMetadata[]> {
    const files: FileMetadata[] = [];
    const projectPath = getRobustProjectPath();
    
    document.querySelectorAll('[data-path]').forEach(el => {
      const path = el.getAttribute('data-path') || '';
      if (!path) return;
      
      const name = path.split(/[/\\]/).pop() || '';
      const extension = name.includes('.') ? '.' + name.split('.').pop() : '';
      const isDirectory = el.classList.contains('directory') || el.classList.contains('folder');
      const depth = (path.match(/[/\\]/g) || []).length;
      
      // Try to get size from data attribute or element
      const sizeAttr = el.getAttribute('data-size');
      const size = sizeAttr ? parseInt(sizeAttr) : 0;
      
      files.push({ path, name, extension, size, isDirectory, depth });
    });
    
    this.fileMetadataCache = files;
    return files;
  }

  public async searchWithAI(query: string, context: { files: string[], searchResults?: SearchResultItem[] }): Promise<AISearchResult> {
    const cacheKey = `smart-${query}-${context.searchResults?.length || 0}`;
    
    if (this.cache.has(cacheKey)) {
      console.log('[AISmartSearch] Using cached result');
      return this.cache.get(cacheKey)!;
    }
    
    try {
      console.log('[AISmartSearch] Starting AI search for:', query);
      const config = this.getApiConfig();
      
      if (!config || !config.apiKey) {
        console.error('[AISmartSearch] Operator X02 config error!');
        throw new Error('Operator X02 configuration error');
      }
      
      console.log('[AISmartSearch] Config found:', {
        provider: config.provider,
        hasApiKey: !!config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model
      });

      // Build prompt based on actual search results
      const prompt = this.buildResultsAnalysisPrompt(query, context.searchResults || []);
      console.log('[AISmartSearch] Calling Operator X02 API...');
      
      const response = await this.callAPI(prompt, config);
      
      console.log('[AISmartSearch] Raw API response:', response?.substring(0, 500));
      
      const result = this.parseResultsAnalysisResponse(response, query);
      
      console.log('[AISmartSearch] Parsed result:', {
        explanation: result.explanation?.substring(0, 100),
        relatedTerms: result.relatedTerms
      });
      
      this.cache.set(cacheKey, result);
      return result;

    } catch (error) {
      console.error('[AISmartSearch] Error during AI search:', error);
      return { 
        suggestions: [], 
        relatedTerms: [], 
        explanation: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        suggestedFiles: [],
        searchStrategy: ''
      };
    }
  }

  // New prompt that analyzes actual search results
  private buildResultsAnalysisPrompt(query: string, results: SearchResultItem[]): string {
    // Separate filename matches from content matches
    const filenameMatches: string[] = [];
    const contentMatches: { file: string; preview: string }[] = [];
    
    results.slice(0, 15).forEach(r => {
      const filename = r.path.split('/').pop() || r.path;
      const queryLower = query.toLowerCase();
      
      // Check if filename matches
      if (filename.toLowerCase().includes(queryLower)) {
        filenameMatches.push(filename);
      }
      
      // Check content match
      if (r.preview && r.preview.toLowerCase().includes(queryLower)) {
        contentMatches.push({
          file: filename,
          preview: r.preview.substring(0, 100)
        });
      }
    });

    const filenameSection = filenameMatches.length > 0 
      ? `FILES MATCHING BY NAME:\n${filenameMatches.map(f => `- ${f}`).join('\n')}`
      : 'FILES MATCHING BY NAME: None';
    
    const contentSection = contentMatches.length > 0
      ? `FILES WITH CONTENT MATCHES:\n${contentMatches.map(c => `- ${c.file}: "${c.preview}..."`).join('\n')}`
      : 'FILES WITH CONTENT MATCHES: None';

    // Smart query analysis for better suggestions
    const queryAnalysis = this.analyzeSearchQuery(query);

    // Different prompt based on whether results were found
    if (results.length === 0) {
      return `You are an intelligent code search assistant. The user searched for "${query}" but NO RESULTS were found.

QUERY ANALYSIS:
${queryAnalysis}

Your task is to help the user find what they're looking for. Analyze their search query and suggest better alternatives.

RESPOND IN THIS EXACT FORMAT:
EXPLANATION: [1-2 sentences explaining why no results were found. Be helpful - suggest what the user might be looking for and where they might find it. For example, if searching "port: 3000", explain they should search for just "3000" or "port" separately, or look in config files like vite.config.ts, package.json, .env, etc.]
SUGGESTIONS: [comma-separated list of 3-4 BETTER search terms that are more likely to find results. Extract key parts from their query - numbers, keywords without punctuation, related config terms]

Be smart! If query contains:
- "port: 3000" → suggest: 3000, port, server, localhost
- "api/users" → suggest: api, users, endpoint, route
- "TODO:" → suggest: TODO, FIXME, task
- Special characters → suggest the query without those characters`;
    }

    return `You are an intelligent code search assistant. The user searched for "${query}" and here are the results:

${filenameSection}

${contentSection}

TOTAL RESULTS: ${results.length} files found

Based on these search results, provide a brief helpful explanation.

RESPOND IN THIS EXACT FORMAT:
EXPLANATION: [2-3 sentences explaining what was found and how it relates to the search query "${query}". Be specific about which files are most relevant and why. Make file names like "App.tsx" or "vite.config.ts" appear exactly as written so they can be clickable.]
SUGGESTIONS: [comma-separated list of 2-3 related search terms the user might also want to try]

Keep your response concise and helpful.`;
  }

  // Analyze search query to provide smart suggestions
  private analyzeSearchQuery(query: string): string {
    const analysis: string[] = [];
    
    // Check for special characters
    const hasSpecialChars = /[:\.,;=<>!@#$%^&*()[\]{}|\\\/]/.test(query);
    if (hasSpecialChars) {
      analysis.push(`- Contains special characters which may prevent exact matches`);
      const cleanQuery = query.replace(/[:\.,;=<>!@#$%^&*()[\]{}|\\\/]/g, ' ').trim();
      analysis.push(`- Clean version: "${cleanQuery}"`);
    }
    
    // Check for numbers (might be port, line number, etc.)
    const numbers = query.match(/\d+/g);
    if (numbers) {
      analysis.push(`- Contains numbers: ${numbers.join(', ')} (could be port, version, line number)`);
    }
    
    // Check for common patterns
    if (query.includes(':')) {
      const parts = query.split(':').map(p => p.trim()).filter(Boolean);
      analysis.push(`- Looks like key:value format. Key="${parts[0]}", Value="${parts[1] || ''}"`);
    }
    
    // Check for path-like patterns
    if (query.includes('/') || query.includes('\\')) {
      analysis.push(`- Looks like a file path or URL pattern`);
    }
    
    // Extract meaningful words
    const words = query.match(/[a-zA-Z]+/g);
    if (words && words.length > 0) {
      analysis.push(`- Key words: ${words.join(', ')}`);
    }
    
    return analysis.length > 0 ? analysis.join('\n') : '- Standard search query';
  }

  // Parse the results analysis response
  private parseResultsAnalysisResponse(responseText: string, originalQuery: string): AISearchResult {
    const result: AISearchResult = {
      suggestions: [],
      relatedTerms: [],
      explanation: '',
      suggestedFiles: [],
      searchStrategy: ''
    };

    const lines = responseText.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('EXPLANATION:')) {
        result.explanation = trimmed.replace('EXPLANATION:', '').trim();
      } else if (trimmed.startsWith('SUGGESTIONS:')) {
        const suggestions = trimmed.replace('SUGGESTIONS:', '').trim();
        result.relatedTerms = suggestions.split(',')
          .map(k => k.trim())
          .filter(k => k && k.toLowerCase() !== originalQuery.toLowerCase())
          .slice(0, 4);
      }
    }

    // If no structured response, use first non-empty line as explanation
    if (!result.explanation) {
      const firstLine = lines.find(l => l.trim().length > 10);
      if (firstLine) {
        result.explanation = firstLine.trim().substring(0, 200);
      }
    }

    return result;
  }

  // Extract file names from any text and match with actual project files
  private extractFilesFromText(text: string, files: FileMetadata[], suggestedFiles: SuggestedFile[]): void {
    // Common file patterns to look for
    const filePatterns = [
      /([a-zA-Z0-9_-]+\.(ts|tsx|js|jsx|json|css|scss|html|md|yaml|yml|toml|xml|py|rs|go))/gi,
      /`([^`]+\.[a-z]+)`/gi,  // Files in backticks
      /['"]([^'"]+\.[a-z]+)['"]/gi,  // Files in quotes
    ];

    const foundFileNames = new Set<string>();

    filePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const fileName = match[1];
        if (fileName && !foundFileNames.has(fileName.toLowerCase())) {
          foundFileNames.add(fileName.toLowerCase());
          
          // Find matching file in project
          const matchedFile = files.find(f => 
            !f.isDirectory && (
              f.name.toLowerCase() === fileName.toLowerCase() ||
              f.name.toLowerCase().endsWith(fileName.toLowerCase())
            )
          );
          
          if (matchedFile && !suggestedFiles.find(s => s.path === matchedFile.path)) {
            // Try to extract reason from context
            const contextMatch = text.match(new RegExp(`${fileName.replace('.', '\\.')}[^.]*?(for|to|contains?|has|with|because)[^.]+`, 'i'));
            const reason = contextMatch ? contextMatch[0].substring(fileName.length).trim() : 'Mentioned by AI';
            
            suggestedFiles.push({
              path: matchedFile.path,
              name: matchedFile.name,
              reason: reason.length > 50 ? reason.substring(0, 47) + '...' : reason,
              confidence: 'high'
            });
          }
        }
      }
    });

    // Also try partial matches for common config files
    const commonConfigs = ['config', 'package', 'tsconfig', 'vite', 'webpack', 'babel', 'eslint', 'prettier'];
    commonConfigs.forEach(configName => {
      if (text.toLowerCase().includes(configName)) {
        const matchedFile = files.find(f => 
          !f.isDirectory && f.name.toLowerCase().includes(configName)
        );
        if (matchedFile && !suggestedFiles.find(s => s.path === matchedFile.path)) {
          suggestedFiles.push({
            path: matchedFile.path,
            name: matchedFile.name,
            reason: 'Configuration file',
            confidence: 'medium'
          });
        }
      }
    });
  }

  private getApiConfig(): any {
    // ✅ HARDCODED: Always use Operator X02 API (built-in, always available)
    // This search feature ONLY uses Operator X02 - independent of user's API settings
    console.log('[AISmartSearch] Using built-in Operator X02 API');
    
    return {
      provider: 'operator_x02',
      apiKey: 'PROXY',
      baseUrl: 'PROXY',
      model: 'x02-coder'
    };
  }

  // Get default base URL for provider (kept for compatibility)
  private getDefaultBaseUrl(provider: string): string {
    return 'PROXY';
  }

  // Get default model for Operator X02
  private getDefaultModel(provider: string): string {
    return 'x02-coder';
  }

  private async callAPI(prompt: string, config: any): Promise<string> {
    console.log(`[AISmartSearch] Calling API with model: ${config.model || 'gpt-4o-mini'}`);
    
    try {
      // Use callGenericAPI from apiProviderManager (same as robustFilterSolution.ts)
      const response = await callGenericAPI(prompt, config);
      
      if (!response) {
        console.warn('[AISmartSearch] Empty response from API');
        return '';
      }
      
      console.log(`[AISmartSearch] Response received, length: ${response.length}`);
      return response;
      
    } catch (error) {
      console.error('[AISmartSearch] API call failed:', error);
      throw error;
    }
  }

  public isAIAvailable(): boolean {
    // ✅ Always available - Operator X02 is built-in
    return true;
  }

  public getProviderInfo(): { provider: string; model: string } | null {
    // ✅ Always returns Operator X02 info
    return { provider: 'Operator X02', model: 'x02-coder' };
  }
}

// ============================================================================
// ROBUST PROJECT PATH HELPER (with multiple fallbacks)
// ============================================================================
function getRobustProjectPath(): string | null {
  // 1. Try the imported function first
  try {
    const path = getCurrentFolderRootPath();
    if (path) {
      // Sync to window for consistency
      (window as any).currentProjectPath = path;
      return path;
    }
  } catch (e) {
    // Function might not work, continue to fallbacks
  }
  
  // 2. Check window.currentProjectPath
  if ((window as any).currentProjectPath) {
    return (window as any).currentProjectPath;
  }
  
  // 3. Check localStorage
  const localStoragePath = localStorage.getItem('currentProjectPath');
  if (localStoragePath) {
    (window as any).currentProjectPath = localStoragePath;
    return localStoragePath;
  }
  
  // 4. Check __lastProject
  if ((window as any).__lastProject?.path) {
    const path = (window as any).__lastProject.path;
    (window as any).currentProjectPath = path;
    return path;
  }
  
  // 5. Try to extract from DOM
  const selectors = [
    '[data-path]',
    '.file-item[data-path]',
    '.directory[data-path]'
  ];
  
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      const filePath = el.getAttribute('data-path') || '';
      if (filePath) {
        const parts = filePath.split(/[/\\]/);
        let projectPath = '';
        
        // Find root (before src, lib, etc.)
        for (let i = parts.length - 1; i >= 0; i--) {
          if (['src', 'lib', 'app', 'public', 'node_modules', 'dist', 'build'].includes(parts[i])) {
            projectPath = parts.slice(0, i).join(filePath.includes('/') ? '/' : '\\');
            break;
          }
        }
        
        if (!projectPath && parts.length > 1) {
          projectPath = parts.slice(0, -1).join(filePath.includes('/') ? '/' : '\\');
        }
        
        if (projectPath) {
          (window as any).currentProjectPath = projectPath;
          localStorage.setItem('currentProjectPath', projectPath);
          console.log('🔄 [explorerSearch] Auto-synced project path:', projectPath);
          return projectPath;
        }
      }
    }
  }
  
  return null;
}


// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SearchMatch {
  filePath: string;
  fileName: string;
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
  contextBefore?: string;
  contextAfter?: string;
}

interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  includeFiles: string;
  excludeFiles: string;
  searchInContent: boolean;
}

// ============================================================================
// UNIVERSAL SEARCH MANAGER
// ============================================================================

interface ConversationEntry {
  id: string;
  timestamp: number;
  userMessage: string;
  aiResponse: string;
  tags?: string[];
}

interface TerminalEntry {
  id: string;
  timestamp: number;
  command: string;
  output?: string;
  exitCode?: number;
}

interface TodoEntry {
  type: 'TODO' | 'FIXME' | 'NOTE' | 'HACK' | 'XXX';
  text: string;
  file: string;
  line: number;
}

interface ErrorEntry {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  file?: string;
  line?: number;
  solution?: string;
}

interface SnippetEntry {
  id: string;
  name: string;
  language: string;
  code: string;
  tags?: string[];
  createdAt: number;
}

class UniversalSearchManager {
  private readonly STORAGE_KEYS = {
    conversations: 'ide-conversation-history',
    terminal: 'ide-terminal-history',
    errors: 'ide-error-history',
    snippets: 'ide-code-snippets'
  };

  // ============================================================================
  // CONVERSATION HISTORY
  // ============================================================================

  public saveConversation(userMsg: string, aiResponse: string, tags?: string[]): void {
    const history = this.getConversations();
    history.unshift({
      id: `conv-${Date.now()}`,
      timestamp: Date.now(),
      userMessage: userMsg,
      aiResponse: aiResponse,
      tags: tags
    });
    // Keep last 500 conversations
    localStorage.setItem(this.STORAGE_KEYS.conversations, JSON.stringify(history.slice(0, 500)));
  }

  public getConversations(): ConversationEntry[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.conversations);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public searchConversations(query: string): ConversationEntry[] {
    if (!query) return this.getConversations().slice(0, 20);
    
    const lowerQuery = query.toLowerCase();
    return this.getConversations().filter(c => 
      c.userMessage.toLowerCase().includes(lowerQuery) ||
      c.aiResponse.toLowerCase().includes(lowerQuery) ||
      c.tags?.some(t => t.toLowerCase().includes(lowerQuery))
    );
  }

  // ============================================================================
  // TERMINAL HISTORY
  // ============================================================================

  public saveTerminalCommand(command: string, output?: string, exitCode?: number): void {
    const history = this.getTerminalHistory();
    history.unshift({
      id: `term-${Date.now()}`,
      timestamp: Date.now(),
      command: command,
      output: output,
      exitCode: exitCode
    });
    localStorage.setItem(this.STORAGE_KEYS.terminal, JSON.stringify(history.slice(0, 1000)));
  }

  public getTerminalHistory(): TerminalEntry[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.terminal);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public searchTerminal(query: string): TerminalEntry[] {
    if (!query) return this.getTerminalHistory().slice(0, 50);
    
    const lowerQuery = query.toLowerCase();
    return this.getTerminalHistory().filter(t => 
      t.command.toLowerCase().includes(lowerQuery) ||
      t.output?.toLowerCase().includes(lowerQuery)
    );
  }

  // ============================================================================
  // TODO SCANNER (scans code files)
  // ============================================================================

  public async scanTodos(): Promise<TodoEntry[]> {
    const todos: TodoEntry[] = [];
    const todoPatterns = ['TODO', 'FIXME', 'NOTE', 'HACK', 'XXX'];
    
    // Get all file paths from DOM
    const files = document.querySelectorAll('[data-path]');
    
    for (const fileEl of files) {
      const path = fileEl.getAttribute('data-path');
      if (!path || !this.isCodeFile(path)) continue;
      
      try {
        const content = await this.readFileContent(path);
        if (!content) continue;
        
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          for (const pattern of todoPatterns) {
            const regex = new RegExp(`\\b${pattern}\\b[:\\s]?(.*)`, 'i');
            const match = line.match(regex);
            if (match) {
              todos.push({
                type: pattern as TodoEntry['type'],
                text: match[1]?.trim() || line.trim(),
                file: path,
                line: index + 1
              });
            }
          }
        });
      } catch (e) {
        // Skip files that can't be read
      }
    }
    
    return todos;
  }

  public async searchTodos(query: string): Promise<TodoEntry[]> {
    const todos = await this.scanTodos();
    if (!query) return todos;
    
    const lowerQuery = query.toLowerCase();
    return todos.filter(t => 
      t.text.toLowerCase().includes(lowerQuery) ||
      t.file.toLowerCase().includes(lowerQuery) ||
      t.type.toLowerCase().includes(lowerQuery)
    );
  }

  private isCodeFile(path: string): boolean {
    const codeExts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.java', '.cpp', '.c', '.h', '.css', '.scss', '.html', '.vue', '.svelte'];
    return codeExts.some(ext => path.toLowerCase().endsWith(ext));
  }

  private async readFileContent(path: string): Promise<string | null> {
    try {
      if ((window as any).invoke) {
        return await (window as any).invoke('read_file', { path });
      }
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke('read_file', { path });
    } catch {
      return null;
    }
  }

  // ============================================================================
  // ERROR HISTORY
  // ============================================================================

  public saveError(message: string, stack?: string, file?: string, line?: number): void {
    const history = this.getErrorHistory();
    history.unshift({
      id: `err-${Date.now()}`,
      timestamp: Date.now(),
      message: message,
      stack: stack,
      file: file,
      line: line
    });
    localStorage.setItem(this.STORAGE_KEYS.errors, JSON.stringify(history.slice(0, 200)));
  }

  public getErrorHistory(): ErrorEntry[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.errors);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public searchErrors(query: string): ErrorEntry[] {
    if (!query) return this.getErrorHistory().slice(0, 30);
    
    const lowerQuery = query.toLowerCase();
    return this.getErrorHistory().filter(e => 
      e.message.toLowerCase().includes(lowerQuery) ||
      e.stack?.toLowerCase().includes(lowerQuery) ||
      e.file?.toLowerCase().includes(lowerQuery)
    );
  }

  // ============================================================================
  // CODE SNIPPETS
  // ============================================================================

  public saveSnippet(name: string, code: string, language: string, tags?: string[]): void {
    const snippets = this.getSnippets();
    snippets.unshift({
      id: `snip-${Date.now()}`,
      name: name,
      language: language,
      code: code,
      tags: tags,
      createdAt: Date.now()
    });
    localStorage.setItem(this.STORAGE_KEYS.snippets, JSON.stringify(snippets));
  }

  public getSnippets(): SnippetEntry[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.snippets);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public searchSnippets(query: string): SnippetEntry[] {
    if (!query) return this.getSnippets();
    
    const lowerQuery = query.toLowerCase();
    return this.getSnippets().filter(s => 
      s.name.toLowerCase().includes(lowerQuery) ||
      s.code.toLowerCase().includes(lowerQuery) ||
      s.language.toLowerCase().includes(lowerQuery) ||
      s.tags?.some(t => t.toLowerCase().includes(lowerQuery))
    );
  }

  public deleteSnippet(id: string): void {
    const snippets = this.getSnippets().filter(s => s.id !== id);
    localStorage.setItem(this.STORAGE_KEYS.snippets, JSON.stringify(snippets));
  }

  // ============================================================================
  // SVN HISTORY (integrates with existing SVN system)
  // ============================================================================

  public async searchSVN(query: string): Promise<any[]> {
    // Try to get SVN log from the existing SVN system
    try {
      if ((window as any).svnManager?.getLog) {
        const log = await (window as any).svnManager.getLog();
        if (!query) return log.slice(0, 50);
        
        const lowerQuery = query.toLowerCase();
        return log.filter((entry: any) => 
          entry.message?.toLowerCase().includes(lowerQuery) ||
          entry.author?.toLowerCase().includes(lowerQuery) ||
          entry.paths?.some((p: any) => p.toLowerCase().includes(lowerQuery))
        );
      }
    } catch (e) {
      console.warn('SVN search not available:', e);
    }
    return [];
  }
}

// ============================================================================
// SEARCH SYSTEM CLASS
// ============================================================================

export class ExplorerSearchSystem {
  private searchPanel: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private resultsContainer: HTMLElement | null = null;
  private searchDebounceTimer: number | null = null;
  private currentResults: SearchMatch[] = [];
  private isSearching: boolean = false;
  private activeTopFilter: 'all' | 'no-code' | 'structure' | 'minimal' | 'code' = 'all';

  // AI Search properties
  private aiSearchMode: boolean = false;
  private aiEngine: AIContentSearchEngine = new AIContentSearchEngine();
  private aiSuggestionsPanel: HTMLElement | null = null;

  // Universal Search properties
  private currentScope: 'files' | 'conversations' | 'terminal' | 'todos' | 'svn' | 'errors' | 'snippets' = 'files';
  private universalSearch: UniversalSearchManager = new UniversalSearchManager();

  // Replace properties
  private replaceInput: HTMLInputElement | null = null;
  private replaceMode: boolean = false;
  private preserveCase: boolean = false;
  private replaceHistory: Array<{
    filePath: string;
    originalContent: string;
    newContent: string;
    replacements: number;
    timestamp: number;
  }> = [];
  private currentMatchIndex: number = 0;

private options: SearchOptions = {
  caseSensitive: false,
  wholeWord: true,        // ⬅️ CHANGE: Enable by default
  useRegex: false,
  includeFiles: '',
  excludeFiles: 'node_modules,.git,dist,build',
  searchInContent: true
};

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  initialize(): void {
    console.log('🔍 Initializing Explorer Search System...');
    this.createSearchPanel();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    console.log('✅ Search system initialized');
  }

  private createSearchPanel(): void {
    // Find or create the search tab content
    let searchContent = document.getElementById('search-content');
    
    if (!searchContent) {
      // Create search tab if it doesn't exist
      const explorerPanel = document.querySelector('.explorer-panel');
      if (!explorerPanel) {
        console.error('❌ Explorer panel not found');
        return;
      }

      // Add Search tab to the tab list
      const tabList = explorerPanel.querySelector('.explorer-tabs');
      if (tabList && !document.querySelector('[data-tab-id="search"]')) {
        const searchTab = document.createElement('div');
        searchTab.className = 'explorer-tab';
        searchTab.setAttribute('data-tab-id', 'search');
        searchTab.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.5 6.5C11.5 9.26142 9.26142 11.5 6.5 11.5C3.73858 11.5 1.5 9.26142 1.5 6.5C1.5 3.73858 3.73858 1.5 6.5 1.5C9.26142 1.5 11.5 3.73858 11.5 6.5Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M10 10L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>SEARCH</span>
        `;
        tabList.appendChild(searchTab);

        // Setup tab click handler
        searchTab.addEventListener('click', () => {
          document.querySelectorAll('.explorer-tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.tab-content').forEach(c => (c as HTMLElement).style.display = 'none');
          
          searchTab.classList.add('active');
          const searchContent = document.getElementById('search-content');
          if (searchContent) {
            searchContent.classList.remove('hidden');
            searchContent.classList.add('active');
            searchContent.style.display = 'flex';
            this.searchInput?.focus();
          }
        });
      }

      // Create search content container
      const explorerContent = explorerPanel.querySelector('.explorer-content');
      if (explorerContent) {
        searchContent = document.createElement('div');
        searchContent.id = 'search-content';
        searchContent.className = 'tab-content';
        searchContent.style.cssText = `
          display: none;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        `;
        explorerContent.appendChild(searchContent);
      }
    }

    if (!searchContent) {
      console.error('❌ Could not create search content');
      return;
    }

    // Build the search UI
    searchContent.innerHTML = `
      <div class="search-panel" style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
        
        <!-- UNIVERSAL SEARCH SCOPE TABS - Text Only Design -->
        <div class="search-scope-tabs" style="display: flex; background: #1e1e1e; border-bottom: 1px solid #3e3e42; 
             padding: 0; overflow-x: auto; flex-shrink: 0; gap: 0; align-items: stretch; height: 26px;">
          
          <button class="scope-tab active" data-scope="files" title="Search files and code content">Files</button>
          <button class="scope-tab disabled" data-scope="conversations" title="Coming soon" disabled>Chats</button>
          <button class="scope-tab disabled" data-scope="terminal" title="Coming soon" disabled>Terminal</button>
          <button class="scope-tab disabled" data-scope="todos" title="Coming soon" disabled>TODOs</button>
          <button class="scope-tab disabled" data-scope="svn" title="Coming soon" disabled>SVN</button>
          <button class="scope-tab disabled" data-scope="errors" title="Coming soon" disabled>Errors</button>
          <button class="scope-tab disabled" data-scope="snippets" title="Coming soon" disabled>Snippets</button>
          
        </div>

        <!-- ✅ SCROLLABLE CONTAINER - Everything below scope tabs scrolls together -->
        <div class="search-scrollable-content" style="flex: 1; overflow-y: auto; overflow-x: hidden; min-height: 0;">

        <!-- TOP FILTER BUTTONS - COMPACT VERSION (for Files scope) -->
<div class="search-top-filters" id="files-scope-filters" style="display: flex; gap: 2px; padding: 6px 8px; background: #252526; 
     border-bottom: 1px solid #3e3e42; align-items: center; flex-wrap: nowrap; position: sticky; top: 0; z-index: 10;">
  
  <button class="top-filter-btn active" data-filter="all" 
          style="padding: 4px 8px; background: #0e639c; color: white; border: none; 
                 border-radius: 2px; cursor: pointer; font-size: 11px; font-weight: 400; 
                 transition: all 0.15s; display: flex; align-items: center; gap: 4px; white-space: nowrap;"
          title="Show all files">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M14 3H2v1h12V3zm0 4H2v1h12V7zm-6 4H2v1h6v-1z"/>
    </svg>
    <span>All</span>
  </button>

  <button class="top-filter-btn" data-filter="no-code" 
          style="padding: 4px 8px; background: transparent; color: #cccccc; 
                 border: 1px solid #3e3e42; border-radius: 2px; cursor: pointer; 
                 font-size: 11px; font-weight: 400; transition: all 0.15s; 
                 display: flex; align-items: center; gap: 4px; white-space: nowrap;"
          title="Show non-code files only">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M13.5 1h-11l-.5.5v13l.5.5h11l.5-.5v-13l-.5-.5zM13 14H3V2h10v12z"/>
      <path d="M5 4h6v1H5V4zm0 2h6v1H5V6zm0 2h4v1H5V8z"/>
    </svg>
    <span>No Code</span>
  </button>

  <button class="top-filter-btn" data-filter="structure" 
          style="padding: 4px 8px; background: transparent; color: #cccccc; 
                 border: 1px solid #3e3e42; border-radius: 2px; cursor: pointer; 
                 font-size: 11px; font-weight: 400; transition: all 0.15s; 
                 display: flex; align-items: center; gap: 4px; white-space: nowrap;"
          title="Show file structure only">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M14.5 2H7.71l-.85-.85L6.51 1h-5l-.5.5v11l.5.5H7v1.07l-2.5 2.5L5 17h6l.5-.5v-.57h3l.5-.5v-13l-.5-.5zM6 2v10H2V2h4zm8 11h-2V2h2v11z"/>
    </svg>
    <span>Structure</span>
  </button>

  <button class="top-filter-btn" data-filter="minimal" 
          style="padding: 4px 8px; background: transparent; color: #cccccc; 
                 border: 1px solid #3e3e42; border-radius: 2px; cursor: pointer; 
                 font-size: 11px; font-weight: 400; transition: all 0.15s; 
                 display: flex; align-items: center; gap: 4px; white-space: nowrap;"
          title="Show top 50 results only">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M13.5 8.4l-5 4.9-.7-.7 4.2-4.2H1v-1h11l-4.2-4.2.7-.7 5 4.9z"/>
    </svg>
    <span>Minimal</span>
  </button>

  <button class="top-filter-btn" data-filter="code" 
          style="padding: 4px 8px; background: transparent; color: #cccccc; 
                 border: 1px solid #3e3e42; border-radius: 2px; cursor: pointer; 
                 font-size: 11px; font-weight: 400; transition: all 0.15s; 
                 display: flex; align-items: center; gap: 4px; white-space: nowrap;"
          title="Show code files only">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.708 5.578L2.061 8.224l2.647 2.646-.708.708-3-3V7.87l3-3 .708.708zm7-.708L11 5.578l2.647 2.646L11 10.87l.708.708 3-3V7.87l-3-3zM4.908 13l.894.448 5-10L9.908 3l-5 10z"/>
    </svg>
    <span>Code</span>
  </button>

  <!-- Close button - compact -->
  <button id="search-close-panel-btn" 
          style="margin-left: auto; padding: 4px 6px; background: transparent; color: #969696; 
                 border: 1px solid #3e3e42; border-radius: 2px; cursor: pointer; 
                 font-size: 16px; line-height: 1; transition: all 0.15s; display: flex; 
                 align-items: center; justify-content: center; width: 24px; height: 24px;"
          title="Close search panel (Esc)">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z"/>
    </svg>
  </button>
</div>

        <!-- Search Input Section -->
        <div class="search-input-section" style="padding: 8px; border-bottom: 1px solid #3e3e42;">
          <!-- Main Search Input with AI Toggle and Help Icon -->
          <div class="search-input-wrapper" style="position: relative; margin-bottom: 8px; display: flex; gap: 4px; align-items: center;">
            <div style="position: relative; flex: 1;">
              <input 
                type="text" 
                id="explorer-search-input" 
                placeholder="Search files and contents... (Ctrl+Shift+F)"
                style="width: 100%; padding: 8px 32px 8px 8px; background: #3c3c3c; border: 1px solid #3e3e42; 
                       border-radius: 4px; color: #cccccc; font-size: 13px; font-family: 'Segoe UI', sans-serif;"
              />
              <button 
                id="search-clear-btn" 
                style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); 
                       background: none; border: none; color: #969696; cursor: pointer; padding: 4px; 
                       display: none; font-size: 16px;"
                title="Clear search (Esc)"
              >×</button>
            </div>
            
            <!-- AI Toggle Button - Grey when OFF, Green when ON -->
            <button 
              id="content-ai-search-toggle" 
              class="ai-toggle-btn"
              style="background: rgba(128, 128, 128, 0.1); 
                     border: 1px solid #666; color: #888; 
                     width: 32px; height: 32px; border-radius: 4px; cursor: pointer; 
                     display: flex; align-items: center; justify-content: center; 
                     font-size: 14px; transition: all 0.2s; flex-shrink: 0;"
              title="Toggle AI-Enhanced Search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
              </svg>
            </button>
            
            <!-- Replace Toggle Button -->
            <button 
              id="replace-toggle-btn" 
              style="background: transparent; border: 1px solid #3e3e42; color: #969696; 
                     width: 32px; height: 32px; border-radius: 4px; cursor: pointer; 
                     display: flex; align-items: center; justify-content: center; 
                     font-size: 14px; transition: all 0.2s; flex-shrink: 0;"
              title="Toggle Replace (Ctrl+H)"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.5 1h-7l-.5.5v4l.5.5H6v1H2.5l-.5.5v7l.5.5h7l.5-.5v-4l-.5-.5H8v-1h3.5l.5-.5v-7l-.5-.5zm-7 5V2h6v4h-6zm6 8H5v-4h5.5v4z"/>
              </svg>
            </button>
          </div>

          <!-- Replace Section (Initially Hidden) -->
          <div id="replace-section" style="display: none; margin-top: 8px;">
            <!-- Replace Input -->
            <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 8px;">
              <div style="position: relative; flex: 1;">
                <input 
                  type="text" 
                  id="replace-input" 
                  placeholder="Replace with..."
                  style="width: 100%; padding: 8px; background: #3c3c3c; border: 1px solid #3e3e42; 
                         border-radius: 4px; color: #cccccc; font-size: 13px; font-family: 'Segoe UI', sans-serif;"
                />
              </div>
              
              <!-- Preserve Case Toggle -->
              <button 
                id="preserve-case-btn" 
                class="replace-option-btn"
                style="padding: 6px 8px; background: transparent; border: 1px solid #3e3e42; 
                       border-radius: 4px; color: #969696; cursor: pointer; font-size: 11px;
                       transition: all 0.2s; white-space: nowrap;"
                title="Preserve Case"
              >Aa→</button>
            </div>
            
            <!-- Replace Buttons -->
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">
              <button 
                id="replace-single-btn" 
                style="padding: 5px 10px; background: #0e639c; border: none; border-radius: 3px; 
                       color: white; cursor: pointer; font-size: 11px; transition: all 0.2s;"
                title="Replace current match (Ctrl+Shift+1)"
              >Replace</button>
              
              <button 
                id="replace-all-file-btn" 
                style="padding: 5px 10px; background: #0e639c; border: none; border-radius: 3px; 
                       color: white; cursor: pointer; font-size: 11px; transition: all 0.2s;"
                title="Replace all in current file (Ctrl+Shift+Enter)"
              >Replace All in File</button>
              
              <button 
                id="replace-all-files-btn" 
                style="padding: 5px 10px; background: #d97706; border: none; border-radius: 3px; 
                       color: white; cursor: pointer; font-size: 11px; transition: all 0.2s;"
                title="Replace in all matched files (with confirmation)"
              >Replace in All Files</button>
              
              <button 
                id="preview-replace-btn" 
                style="padding: 5px 10px; background: transparent; border: 1px solid #3e3e42; 
                       border-radius: 3px; color: #969696; cursor: pointer; font-size: 11px; 
                       transition: all 0.2s;"
                title="Preview changes before replacing"
              >👁 Preview</button>
              
              <button 
                id="undo-replace-btn" 
                style="padding: 5px 10px; background: transparent; border: 1px solid #3e3e42; 
                       border-radius: 3px; color: #969696; cursor: pointer; font-size: 11px; 
                       transition: all 0.2s; display: none;"
                title="Undo last replacement (Ctrl+Z)"
              >↶ Undo</button>
            </div>
            
            <!-- Replace Status -->
            <div id="replace-status" style="font-size: 11px; color: #969696; min-height: 16px; padding: 2px 0;"></div>
          </div>

          <!-- Replace Preview Panel (Initially Hidden) -->
          <div id="replace-preview-panel" style="display: none; background: #252526; border: 1px solid #3e3e42; 
               border-radius: 6px; padding: 10px; margin-top: 8px; max-height: 200px; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 12px; font-weight: 600; color: #4FC3F7;">📋 Replace Preview</span>
              <div style="display: flex; gap: 6px;">
                <button id="apply-preview-btn" style="padding: 4px 10px; background: #4caf50; border: none; 
                        border-radius: 3px; color: white; cursor: pointer; font-size: 11px;">Apply All</button>
                <button id="close-preview-btn" style="background: none; border: none; color: #969696; 
                        cursor: pointer; font-size: 14px;">×</button>
              </div>
            </div>
            <div id="preview-content" style="font-family: 'Consolas', monospace; font-size: 11px;"></div>
          </div>

          <!-- Search Options -->
          <div class="search-options" style="display: flex; gap: 4px; flex-wrap: wrap; padding: 4px 8px;">
            <button class="search-option-btn" data-option="caseSensitive" title="Match Case (Alt+C)"
                    style="padding: 4px 8px; background: transparent; border: 1px solid #3e3e42; border-radius: 3px; 
                           color: #cccccc; cursor: pointer; font-size: 11px; transition: all 0.2s;">
              Aa
            </button>
            <button class="search-option-btn active" data-option="wholeWord" title="Match Whole Word (Alt+W)"
                    style="padding: 4px 8px; background: #0e639c; border: 1px solid #0e639c; border-radius: 3px; 
                           color: white; cursor: pointer; font-size: 11px; transition: all 0.2s;">
              Ab|
            </button>
            <button class="search-option-btn" data-option="useRegex" title="Use Regular Expression (Alt+R)"
                    style="padding: 4px 8px; background: transparent; border: 1px solid #3e3e42; border-radius: 3px; 
                           color: #cccccc; cursor: pointer; font-size: 11px; transition: all 0.2s;">
              .*
            </button>
          </div>

          <!-- Advanced Filters (Collapsible) -->
          <details class="search-filters" style="padding: 0 8px;">
            <summary style="cursor: pointer; padding: 4px; color: #969696; font-size: 11px; user-select: none;">
              🔧 Advanced Filters
            </summary>
            <div style="padding: 8px 4px; display: flex; flex-direction: column; gap: 6px;">
              <div>
                <label style="font-size: 10px; color: #666; margin-bottom: 2px; display: block;">
                  INCLUDE FILES (e.g., *.ts, *.js)
                </label>
                <input 
                  type="text" 
                  id="search-include-files" 
                  placeholder="*.ts, *.js, src/**"
                  style="width: 100%; padding: 6px; background: #3c3c3c; border: 1px solid #3e3e42; 
                         border-radius: 3px; color: #cccccc; font-size: 11px;"
                />
              </div>
              <div>
                <label style="font-size: 10px; color: #666; margin-bottom: 2px; display: block;">
                  EXCLUDE FILES (e.g., node_modules, *.min.js)
                </label>
                <input 
                  type="text" 
                  id="search-exclude-files" 
                  placeholder="node_modules, .git, dist"
                  value="node_modules,.git,dist,build"
                  style="width: 100%; padding: 6px; background: #3c3c3c; border: 1px solid #3e3e42; 
                         border-radius: 3px; color: #cccccc; font-size: 11px;"
                />
              </div>
            </div>
          </details>

          <!-- Search Status -->
          <div class="search-status" style="padding: 4px 8px; font-size: 11px; color: #969696; min-height: 18px;">
            <span id="search-status-text"></span>
          </div>
        </div>

        <!-- AI Suggestions Panel (Initially Hidden) -->
        <div id="ai-suggestions-panel" style="display: none; 
             background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(139, 92, 246, 0.04)); 
             border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 6px; padding: 10px; 
             margin: 0 8px 8px 8px; animation: slideDown 0.3s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="font-size: 12px; font-weight: 600; color: #a78bfa; display: flex; align-items: center; gap: 6px;">
                <span>✨</span>
                <span>AI Smart Search</span>
                <span id="ai-provider-badge" style="font-size: 10px; background: rgba(139, 92, 246, 0.2); 
                      padding: 2px 6px; border-radius: 10px; color: #8b5cf6;"></span>
              </div>
              <button 
                id="close-ai-suggestions" 
                style="background: none; border: none; color: #969696; cursor: pointer; 
                       font-size: 16px; padding: 0; width: 20px; height: 20px;"
                title="Close"
              >×</button>
            </div>
            
            <!-- AI Explanation -->
            <div id="ai-explanation" style="font-size: 11px; color: #b8b8b8; margin-bottom: 8px; line-height: 1.4;"></div>
            
            <!-- Search Strategy -->
            <div id="ai-strategy" style="font-size: 10px; color: #888; margin-bottom: 8px; padding: 6px; 
                 background: rgba(0,0,0,0.2); border-radius: 4px; display: none;">
              <span style="color: #4fc3f7;">💡 Strategy:</span> <span id="ai-strategy-text"></span>
            </div>
            
            <!-- Suggested Files -->
            <div id="ai-suggested-files" style="margin-bottom: 8px; display: none;">
              <div style="font-size: 10px; color: #888; margin-bottom: 6px;">📁 Suggested Files:</div>
              <div id="ai-files-container" style="display: flex; flex-direction: column; gap: 4px; max-height: 150px; overflow-y: auto;"></div>
            </div>
            
            <!-- Related Keywords -->
            <div id="ai-keywords-container" style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
              <!-- Keywords will be inserted here -->
            </div>
          </div>

          <!-- Results Section (no longer needs its own scroll) -->
          <div class="search-results-section" style="padding: 8px;">

          <!-- Files Results (default) -->
          <div id="search-results-container" class="scope-results" data-scope="files">
            <div class="search-empty-state" style="display: flex; flex-direction: column; align-items: center; 
                      justify-content: center; height: 200px; color: #666; text-align: center;">
              <svg width="64" height="64" viewBox="0 0 16 16" fill="currentColor" style="opacity: 0.3; margin-bottom: 16px;">
                <path d="M11.5 6.5C11.5 9.26142 9.26142 11.5 6.5 11.5C3.73858 11.5 1.5 9.26142 1.5 6.5C1.5 3.73858 3.73858 1.5 6.5 1.5C9.26142 1.5 11.5 3.73858 11.5 6.5Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M10 10L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <div style="font-size: 14px; margin-bottom: 8px; color: #888;">Search across files</div>
              <div style="font-size: 12px; opacity: 0.7; color: #666;">
                Press <kbd style="padding: 2px 6px; background: #2d2d30; border: 1px solid #454545; border-radius: 3px;">Ctrl+Shift+F</kbd> to focus
              </div>
            </div>
          </div>
          
          <!-- Conversations Results -->
          <div id="conversations-results-container" class="scope-results" data-scope="conversations" style="display: none;">
            <div class="search-empty-state" style="display: flex; flex-direction: column; align-items: center; 
                      justify-content: center; height: 200px; color: #666; text-align: center;">
              <span style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">💬</span>
              <div style="font-size: 14px; margin-bottom: 8px; color: #888;">Search AI Conversations</div>
              <div style="font-size: 12px; opacity: 0.7; color: #666;">Find past solutions and discussions</div>
            </div>
          </div>
          
          <!-- Terminal Results -->
          <div id="terminal-results-container" class="scope-results" data-scope="terminal" style="display: none;">
            <div class="search-empty-state" style="display: flex; flex-direction: column; align-items: center; 
                      justify-content: center; height: 200px; color: #666; text-align: center;">
              <span style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">🖥️</span>
              <div style="font-size: 14px; margin-bottom: 8px; color: #888;">Search Terminal History</div>
              <div style="font-size: 12px; opacity: 0.7; color: #666;">Find past commands and outputs</div>
            </div>
          </div>
          
          <!-- TODOs Results -->
          <div id="todos-results-container" class="scope-results" data-scope="todos" style="display: none;">
            <div class="search-empty-state" style="display: flex; flex-direction: column; align-items: center; 
                      justify-content: center; height: 200px; color: #666; text-align: center;">
              <span style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">📝</span>
              <div style="font-size: 14px; margin-bottom: 8px; color: #888;">Search TODOs & Notes</div>
              <div style="font-size: 12px; opacity: 0.7; color: #666;">Find TODO, FIXME, NOTE comments</div>
            </div>
          </div>
          
          <!-- SVN Results -->
          <div id="svn-results-container" class="scope-results" data-scope="svn" style="display: none;">
            <div class="search-empty-state" style="display: flex; flex-direction: column; align-items: center; 
                      justify-content: center; height: 200px; color: #666; text-align: center;">
              <span style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">🔄</span>
              <div style="font-size: 14px; margin-bottom: 8px; color: #888;">Search SVN History</div>
              <div style="font-size: 12px; opacity: 0.7; color: #666;">Find commits and changes</div>
            </div>
          </div>
          
          <!-- Errors Results -->
          <div id="errors-results-container" class="scope-results" data-scope="errors" style="display: none;">
            <div class="search-empty-state" style="display: flex; flex-direction: column; align-items: center; 
                      justify-content: center; height: 200px; color: #666; text-align: center;">
              <span style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">❌</span>
              <div style="font-size: 14px; margin-bottom: 8px; color: #888;">Search Error History</div>
              <div style="font-size: 12px; opacity: 0.7; color: #666;">Find past errors and solutions</div>
            </div>
          </div>
          
          <!-- Snippets Results -->
          <div id="snippets-results-container" class="scope-results" data-scope="snippets" style="display: none;">
            <div class="search-empty-state" style="display: flex; flex-direction: column; align-items: center; 
                      justify-content: center; height: 200px; color: #666; text-align: center;">
              <span style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">📋</span>
              <div style="font-size: 14px; margin-bottom: 8px; color: #888;">Search Code Snippets</div>
              <div style="font-size: 12px; opacity: 0.7; color: #666;">Find saved code snippets</div>
            </div>
          </div>
          </div><!-- END search-results-section -->
        </div><!-- END search-scrollable-content -->
      </div>
    `;

    // Add animation styles
    this.addAnimationStyles();

    // Store references
    this.searchPanel = searchContent.querySelector('.search-panel');
    this.searchInput = document.getElementById('explorer-search-input') as HTMLInputElement;
    this.resultsContainer = document.getElementById('search-results-container');
  }

  // ============================================================================
  // STYLES
  // ============================================================================

private addAnimationStyles(): void {
  if (document.getElementById('search-animation-styles')) return;

  const style = document.createElement('style');
  style.id = 'search-animation-styles';
  style.textContent = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
        max-height: 0;
      }
      to {
        opacity: 1;
        transform: translateY(0);
        max-height: 500px;
      }
    }

    /* Scope Tab Styles - Text Only Design */
    .search-scope-tabs {
      scrollbar-width: thin;
      scrollbar-color: #555 transparent;
    }
    
    .search-scope-tabs::-webkit-scrollbar {
      height: 3px;
    }
    
    .search-scope-tabs::-webkit-scrollbar-thumb {
      background: #555;
      border-radius: 2px;
    }

    .scope-tab {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 12px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #858585;
      cursor: pointer;
      font-size: 12px;
      font-weight: 400;
      white-space: nowrap;
      transition: all 0.15s ease;
      height: 100%;
    }
    
    .scope-tab:hover:not(.active):not(.disabled) {
      background: rgba(255, 255, 255, 0.05);
      color: #cccccc;
    }
    
    .scope-tab.active {
      background: #252526;
      color: #ffffff;
      border-bottom-color: #0e639c;
    }
    
    .scope-tab.disabled {
      color: #4a4a4a;
      cursor: not-allowed;
      opacity: 0.5;
    }

    /* Scope-specific result item styles */
    .conversation-result-item {
      padding: 10px;
      margin-bottom: 8px;
      background: rgba(139, 92, 246, 0.05);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .conversation-result-item:hover {
      background: rgba(139, 92, 246, 0.1);
      border-color: rgba(139, 92, 246, 0.4);
    }
    
    .terminal-result-item {
      padding: 8px 10px;
      margin-bottom: 6px;
      background: rgba(0, 0, 0, 0.3);
      border-left: 3px solid #4caf50;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .terminal-result-item:hover {
      background: rgba(76, 175, 80, 0.1);
    }
    
    .todo-result-item {
      padding: 8px 10px;
      margin-bottom: 6px;
      background: rgba(255, 193, 7, 0.05);
      border-left: 3px solid #ffc107;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .todo-result-item.fixme {
      border-left-color: #f44336;
      background: rgba(244, 67, 54, 0.05);
    }
    
    .todo-result-item.note {
      border-left-color: #2196f3;
      background: rgba(33, 150, 243, 0.05);
    }
    
    .error-result-item {
      padding: 10px;
      margin-bottom: 8px;
      background: rgba(244, 67, 54, 0.05);
      border: 1px solid rgba(244, 67, 54, 0.2);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .error-result-item:hover {
      background: rgba(244, 67, 54, 0.1);
    }
    
    .snippet-result-item {
      padding: 10px;
      margin-bottom: 8px;
      background: rgba(33, 150, 243, 0.05);
      border: 1px solid rgba(33, 150, 243, 0.2);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .snippet-result-item:hover {
      background: rgba(33, 150, 243, 0.1);
      border-color: rgba(33, 150, 243, 0.4);
    }

    .search-option-btn.active {
      background: #0e639c !important;
      border-color: #0e639c !important;
      color: white !important;
    }

    /* Compact button styles */
    .top-filter-btn:hover:not(.active) {
      background: rgba(255, 255, 255, 0.05) !important;
      border-color: #555 !important;
    }

    .top-filter-btn.active {
      background: #0e639c !important;
      border: none !important;
    }

    .top-filter-btn svg {
      flex-shrink: 0;
    }

    /* Ensure buttons stay in one line */
    .search-top-filters {
      overflow-x: auto;
      scrollbar-width: thin;
      scrollbar-color: #424242 transparent;
    }

    .search-top-filters::-webkit-scrollbar {
      height: 4px;
    }

    .search-top-filters::-webkit-scrollbar-track {
      background: transparent;
    }

    .search-top-filters::-webkit-scrollbar-thumb {
      background: #424242;
      border-radius: 2px;
    }

    .search-top-filters::-webkit-scrollbar-thumb:hover {
      background: #555;
    }

    /* ============================================ */
    /* AI SEARCH ANIMATIONS */
    /* ============================================ */

    /* AI Toggle Button - Pulse when active */
    @keyframes aiPulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4);
      }
      50% {
        box-shadow: 0 0 0 8px rgba(139, 92, 246, 0);
      }
    }

    @keyframes aiGlow {
      0%, 100% {
        filter: drop-shadow(0 0 2px rgba(139, 92, 246, 0.5));
      }
      50% {
        filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.8));
      }
    }

    #content-ai-search-toggle.ai-active {
      animation: aiPulse 2s infinite ease-in-out;
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(76, 175, 80, 0.5)) !important;
      border-color: #4caf50 !important;
      color: #4caf50 !important;
    }

    #content-ai-search-toggle.ai-active svg {
      animation: aiGlow 2s infinite ease-in-out;
    }

    /* Search Input - Shimmer border when AI mode */
    @keyframes borderShimmer {
      0% {
        border-color: #8b5cf6;
        box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.3), 0 0 10px rgba(139, 92, 246, 0.1);
      }
      50% {
        border-color: #a78bfa;
        box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.4), 0 0 20px rgba(139, 92, 246, 0.2);
      }
      100% {
        border-color: #8b5cf6;
        box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.3), 0 0 10px rgba(139, 92, 246, 0.1);
      }
    }

    #explorer-search-input.ai-mode {
      animation: borderShimmer 3s infinite ease-in-out;
      background: linear-gradient(90deg, #3c3c3c 0%, #4a3c5c 50%, #3c3c3c 100%) !important;
      background-size: 200% 100% !important;
    }

    /* AI Loading Animation */
    @keyframes aiThinking {
      0%, 80%, 100% {
        transform: scale(0);
        opacity: 0.5;
      }
      40% {
        transform: scale(1);
        opacity: 1;
      }
    }

    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }

    .ai-loading-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 0;
    }

    .ai-loading-indicator .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: linear-gradient(135deg, #8b5cf6, #a78bfa);
      animation: aiThinking 1.4s infinite ease-in-out both;
    }

    .ai-loading-indicator .dot:nth-child(1) { animation-delay: -0.32s; }
    .ai-loading-indicator .dot:nth-child(2) { animation-delay: -0.16s; }
    .ai-loading-indicator .dot:nth-child(3) { animation-delay: 0s; }

    .ai-loading-text {
      background: linear-gradient(90deg, #888 0%, #a78bfa 50%, #888 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 2s linear infinite;
      font-size: 12px;
      margin-left: 8px;
    }

    /* Sparkle animation for panel */
    @keyframes sparkle {
      0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
      50% { opacity: 1; transform: scale(1) rotate(180deg); }
    }

    .ai-sparkle {
      position: absolute;
      width: 10px;
      height: 10px;
      background: radial-gradient(circle, #a78bfa 0%, transparent 70%);
      border-radius: 50%;
      animation: sparkle 2s infinite ease-in-out;
    }

    /* AI Panel entrance animation */
    @keyframes panelSlideIn {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Main results section - must scroll */
    .search-results-section {
      /* No longer needs scroll - parent container handles it */
    }

    /* Scrollable content container */
    .search-scrollable-content {
      scrollbar-width: thin;
      scrollbar-color: #555 transparent;
    }

    .search-scrollable-content::-webkit-scrollbar {
      width: 8px;
    }

    .search-scrollable-content::-webkit-scrollbar-track {
      background: transparent;
    }

    .search-scrollable-content::-webkit-scrollbar-thumb {
      background: #555;
      border-radius: 4px;
    }

    .search-scrollable-content::-webkit-scrollbar-thumb:hover {
      background: #666;
    }

    /* Make filter bar sticky at top when scrolling */
    .search-top-filters {
      position: sticky !important;
      top: 0 !important;
      z-index: 10 !important;
      background: #252526 !important;
    }

    /* Ensure parent containers have proper height */
    #search-content {
      flex-direction: column !important;
      height: 100% !important;
      overflow: hidden !important;
    }
    
    #search-content.active {
      display: flex !important;
    }
    
    #search-content.hidden,
    #search-content:not(.active) {
      display: none !important;
    }
    
    .search-panel {
      display: flex !important;
      flex-direction: column !important;
      height: 100% !important;
      min-height: 0 !important;
      overflow: hidden !important;
    }

    /* Ensure explorer content has height */
    .explorer-content {
      flex: 1 1 0;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }
    
    .tab-content {
      flex: 1 1 0;
      min-height: 0;
      overflow: hidden;
    }

    /* Main scrollable area scrollbar */
    .search-scrollable-content::-webkit-scrollbar {
      width: 8px;
    }
    
    .search-scrollable-content::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
    }
    
    .search-scrollable-content::-webkit-scrollbar-thumb {
      background: rgba(100, 100, 100, 0.5);
      border-radius: 4px;
    }
    
    .search-scrollable-content::-webkit-scrollbar-thumb:hover {
      background: rgba(120, 120, 120, 0.7);
    }

    #ai-suggestions-panel {
      animation: panelSlideIn 0.3s ease-out;
    }

    /* AI Suggestions Panel Scrollbar */
    #ai-suggestions-panel::-webkit-scrollbar {
      width: 6px;
    }
    
    #ai-suggestions-panel::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
    }
    
    #ai-suggestions-panel::-webkit-scrollbar-thumb {
      background: rgba(139, 92, 246, 0.4);
      border-radius: 3px;
    }
    
    #ai-suggestions-panel::-webkit-scrollbar-thumb:hover {
      background: rgba(139, 92, 246, 0.6);
    }

    /* Files container scrollbar */
    #ai-files-container::-webkit-scrollbar {
      width: 4px;
    }
    
    #ai-files-container::-webkit-scrollbar-track {
      background: transparent;
    }
    
    #ai-files-container::-webkit-scrollbar-thumb {
      background: rgba(139, 92, 246, 0.3);
      border-radius: 2px;
    }

    #ai-suggestions-panel.loading {
      background: linear-gradient(90deg, 
        rgba(139, 92, 246, 0.08) 0%, 
        rgba(139, 92, 246, 0.15) 50%, 
        rgba(139, 92, 246, 0.08) 100%) !important;
      background-size: 200% 100%;
      animation: shimmer 1.5s linear infinite;
    }

    /* Suggested file hover animation */
    .ai-suggested-file-btn {
      transition: all 0.2s ease;
    }

    .ai-suggested-file-btn:hover {
      transform: translateX(4px);
      box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
    }

    /* Keyword button pop animation */
    @keyframes popIn {
      from {
        opacity: 0;
        transform: scale(0.8);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .ai-keyword-btn {
      animation: popIn 0.3s ease-out backwards;
    }

    .ai-keyword-btn:nth-child(2) { animation-delay: 0.05s; }
    .ai-keyword-btn:nth-child(3) { animation-delay: 0.1s; }
    .ai-keyword-btn:nth-child(4) { animation-delay: 0.15s; }
    .ai-keyword-btn:nth-child(5) { animation-delay: 0.2s; }
    .ai-keyword-btn:nth-child(6) { animation-delay: 0.25s; }

    .ai-toggle-btn:hover {
      transform: scale(1.05);
    }

    .ai-keyword-btn:active {
      transform: scale(0.95);
    }

    #ai-suggestions-panel {
      transition: all 0.3s ease;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
}
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private setupEventListeners(): void {
    if (!this.searchInput) return;

    // Setup scope tab switching
    this.setupScopeTabs();

    // Search input with debounce
    this.searchInput.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value;
      
      // Show/hide clear button
      const clearBtn = document.getElementById('search-clear-btn');
      if (clearBtn) {
        clearBtn.style.display = query ? 'block' : 'none';
      }

      // Debounce search
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }

      this.searchDebounceTimer = window.setTimeout(() => {
        this.performUniversalSearch(query);
      }, 300);
    });

    // Clear button
    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (this.searchInput) {
          this.searchInput.value = '';
          clearBtn.style.display = 'none';
          this.clearResults();
        }
      });
    }

    // Close panel button
    const closePanelBtn = document.getElementById('search-close-panel-btn');
    if (closePanelBtn) {
      closePanelBtn.addEventListener('click', () => {
        this.closeSearchPanel();
      });

      closePanelBtn.addEventListener('mouseenter', () => {
        (closePanelBtn as HTMLElement).style.background = 'rgba(244, 67, 54, 0.8)';
        (closePanelBtn as HTMLElement).style.color = 'white';
        (closePanelBtn as HTMLElement).style.borderColor = 'rgba(244, 67, 54, 0.8)';
      });

      closePanelBtn.addEventListener('mouseleave', () => {
        (closePanelBtn as HTMLElement).style.background = 'transparent';
        (closePanelBtn as HTMLElement).style.color = '#969696';
        (closePanelBtn as HTMLElement).style.borderColor = '#3e3e42';
      });
    }

    // AI Toggle Button
    this.setupAIToggle();

    // Option buttons
    const optionButtons = document.querySelectorAll('.search-option-btn');
    optionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const option = (btn as HTMLElement).dataset.option as keyof SearchOptions;
        if (option) {
          this.options[option] = !this.options[option] as any;
          btn.classList.toggle('active');
          
          // Re-search if there's a query
          if (this.searchInput && this.searchInput.value) {
            this.performSearch(this.searchInput.value);
          }
        }
      });
    });

    // Filter inputs
    const includeInput = document.getElementById('search-include-files') as HTMLInputElement;
    const excludeInput = document.getElementById('search-exclude-files') as HTMLInputElement;

    if (includeInput) {
      includeInput.addEventListener('change', () => {
        this.options.includeFiles = includeInput.value;
        if (this.searchInput && this.searchInput.value) {
          this.performSearch(this.searchInput.value);
        }
      });
    }

    if (excludeInput) {
      excludeInput.addEventListener('change', () => {
        this.options.excludeFiles = excludeInput.value;
        if (this.searchInput && this.searchInput.value) {
          this.performSearch(this.searchInput.value);
        }
      });
    }

    // TOP FILTER BUTTONS
    const topFilterBtns = document.querySelectorAll('.top-filter-btn');
    topFilterBtns.forEach(btn => {
      // Hover effects
      btn.addEventListener('mouseenter', () => {
        if (!btn.classList.contains('active')) {
          (btn as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
        }
      });

      btn.addEventListener('mouseleave', () => {
        if (!btn.classList.contains('active')) {
          (btn as HTMLElement).style.background = 'transparent';
        }
      });

      // Click handler
      btn.addEventListener('click', () => {
        const filter = (btn as HTMLElement).dataset.filter as typeof this.activeTopFilter;
        if (!filter) return;

        // Update active state
        topFilterBtns.forEach(b => {
          b.classList.remove('active');
          (b as HTMLElement).style.background = 'transparent';
          (b as HTMLElement).style.color = '#cccccc';
          (b as HTMLElement).style.border = '1px solid #3e3e42';
        });

        btn.classList.add('active');
        (btn as HTMLElement).style.background = '#0e639c';
        (btn as HTMLElement).style.color = 'white';
        (btn as HTMLElement).style.border = 'none';

        // Apply filter
        this.activeTopFilter = filter;
        this.applyTopFilter(filter);

        // Re-search if there's a query
        if (this.searchInput && this.searchInput.value) {
          this.performSearch(this.searchInput.value);
        }
      });
    });

    // Setup Replace functionality
    this.setupReplaceHandlers();
  }

  // ============================================================================
  // REPLACE FUNCTIONALITY
  // ============================================================================

  private setupReplaceHandlers(): void {
    const replaceToggleBtn = document.getElementById('replace-toggle-btn');
    const replaceSection = document.getElementById('replace-section');
    this.replaceInput = document.getElementById('replace-input') as HTMLInputElement;
    
    // Toggle replace section
    if (replaceToggleBtn && replaceSection) {
      replaceToggleBtn.addEventListener('click', () => {
        this.replaceMode = !this.replaceMode;
        replaceSection.style.display = this.replaceMode ? 'block' : 'none';
        
        // Update button style
        (replaceToggleBtn as HTMLElement).style.background = this.replaceMode ? 'rgba(14, 99, 156, 0.3)' : 'transparent';
        (replaceToggleBtn as HTMLElement).style.borderColor = this.replaceMode ? '#0e639c' : '#3e3e42';
        (replaceToggleBtn as HTMLElement).style.color = this.replaceMode ? '#4FC3F7' : '#969696';
        
        if (this.replaceMode && this.replaceInput) {
          this.replaceInput.focus();
        }
      });
    }

    // Preserve case toggle
    const preserveCaseBtn = document.getElementById('preserve-case-btn');
    if (preserveCaseBtn) {
      preserveCaseBtn.addEventListener('click', () => {
        this.preserveCase = !this.preserveCase;
        (preserveCaseBtn as HTMLElement).style.background = this.preserveCase ? '#0e639c' : 'transparent';
        (preserveCaseBtn as HTMLElement).style.color = this.preserveCase ? 'white' : '#969696';
        (preserveCaseBtn as HTMLElement).style.borderColor = this.preserveCase ? '#0e639c' : '#3e3e42';
      });
    }

    // Replace single (in current file at current match)
    const replaceSingleBtn = document.getElementById('replace-single-btn');
    if (replaceSingleBtn) {
      replaceSingleBtn.addEventListener('click', () => this.replaceSingle());
    }

    // Replace all in current file
    const replaceAllFileBtn = document.getElementById('replace-all-file-btn');
    if (replaceAllFileBtn) {
      replaceAllFileBtn.addEventListener('click', () => this.replaceAllInCurrentFile());
    }

    // Replace in all files
    const replaceAllFilesBtn = document.getElementById('replace-all-files-btn');
    if (replaceAllFilesBtn) {
      replaceAllFilesBtn.addEventListener('click', () => this.replaceInAllFiles());
    }

    // Preview replacements
    const previewBtn = document.getElementById('preview-replace-btn');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.showReplacePreview());
    }

    // Undo replacement
    const undoBtn = document.getElementById('undo-replace-btn');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.undoLastReplace());
    }

    // Close preview panel
    const closePreviewBtn = document.getElementById('close-preview-btn');
    const previewPanel = document.getElementById('replace-preview-panel');
    if (closePreviewBtn && previewPanel) {
      closePreviewBtn.addEventListener('click', () => {
        previewPanel.style.display = 'none';
      });
    }

    // Apply preview (replace all from preview)
    const applyPreviewBtn = document.getElementById('apply-preview-btn');
    if (applyPreviewBtn) {
      applyPreviewBtn.addEventListener('click', () => {
        this.replaceInAllFiles(true); // Skip confirmation since they clicked Apply
      });
    }
  }

  private getSearchAndReplaceTerms(): { searchTerm: string; replaceTerm: string } | null {
    const searchTerm = this.searchInput?.value?.trim();
    const replaceTerm = this.replaceInput?.value ?? '';
    
    if (!searchTerm) {
      this.updateReplaceStatus('⚠️ Enter a search term first', 'warning');
      return null;
    }
    
    return { searchTerm, replaceTerm };
  }

  private updateReplaceStatus(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const statusEl = document.getElementById('replace-status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.style.color = 
        type === 'error' ? '#f48771' :
        type === 'warning' ? '#cca700' :
        type === 'success' ? '#89d185' : '#969696';
    }
  }

  private applyReplacement(text: string, searchTerm: string, replaceTerm: string): string {
    try {
      let regex: RegExp;
      
      if (this.options.useRegex) {
        regex = new RegExp(searchTerm, this.options.caseSensitive ? 'g' : 'gi');
      } else {
        const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = this.options.wholeWord ? `\\b${escapedSearch}\\b` : escapedSearch;
        regex = new RegExp(pattern, this.options.caseSensitive ? 'g' : 'gi');
      }
      
      if (this.preserveCase) {
        return text.replace(regex, (match) => this.matchCase(match, replaceTerm));
      }
      
      return text.replace(regex, replaceTerm);
    } catch (e) {
      console.error('Replace error:', e);
      return text;
    }
  }

  private matchCase(source: string, target: string): string {
    if (!target) return target;
    
    // All uppercase
    if (source === source.toUpperCase()) {
      return target.toUpperCase();
    }
    // All lowercase
    if (source === source.toLowerCase()) {
      return target.toLowerCase();
    }
    // Title case (first letter uppercase)
    if (source[0] === source[0].toUpperCase()) {
      return target.charAt(0).toUpperCase() + target.slice(1).toLowerCase();
    }
    return target;
  }

  private countMatches(text: string, searchTerm: string): number {
    try {
      let regex: RegExp;
      
      if (this.options.useRegex) {
        regex = new RegExp(searchTerm, this.options.caseSensitive ? 'g' : 'gi');
      } else {
        const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = this.options.wholeWord ? `\\b${escapedSearch}\\b` : escapedSearch;
        regex = new RegExp(pattern, this.options.caseSensitive ? 'g' : 'gi');
      }
      
      const matches = text.match(regex);
      return matches ? matches.length : 0;
    } catch (e) {
      return 0;
    }
  }

  // Replace single occurrence in current file (at current match position)
  private async replaceSingle(): Promise<void> {
    const terms = this.getSearchAndReplaceTerms();
    if (!terms) return;

    // Get current active file from editor
    const activeFile = this.getCurrentEditorFile();
    if (!activeFile) {
      this.updateReplaceStatus('⚠️ No file open in editor', 'warning');
      return;
    }

    try {
      const content = await readFile(activeFile);
      if (content === null) {
        this.updateReplaceStatus('❌ Could not read file', 'error');
        return;
      }

      // Find the match at current index and replace only that one
      let matchCount = 0;
      let newContent = content;
      
      const regex = this.buildSearchRegex(terms.searchTerm);
      let match;
      let lastIndex = 0;
      const parts: string[] = [];
      
      while ((match = regex.exec(content)) !== null) {
        if (matchCount === this.currentMatchIndex) {
          // Replace this match
          parts.push(content.substring(lastIndex, match.index));
          const replacement = this.preserveCase 
            ? this.matchCase(match[0], terms.replaceTerm) 
            : terms.replaceTerm;
          parts.push(replacement);
          lastIndex = regex.lastIndex;
          
          // Continue to get rest of content
          parts.push(content.substring(lastIndex));
          newContent = parts.join('');
          break;
        }
        matchCount++;
        
        if (match.index === regex.lastIndex) regex.lastIndex++;
      }

      if (newContent !== content) {
        // Save for undo
        this.saveForUndo(activeFile, content, newContent, 1);
        
        // Write to file
        await this.writeFile(activeFile, newContent);
        
        // Update editor
        this.refreshEditorContent(activeFile, newContent);
        
        this.updateReplaceStatus('✅ Replaced 1 occurrence', 'success');
        this.showUndoButton();
        
        // Re-search to update results
        this.performSearch(terms.searchTerm);
      } else {
        this.updateReplaceStatus('ℹ️ No match found at current position', 'info');
      }
      
    } catch (error: any) {
      this.updateReplaceStatus(`❌ Error: ${error.message}`, 'error');
    }
  }

  private buildSearchRegex(searchTerm: string): RegExp {
    if (this.options.useRegex) {
      return new RegExp(searchTerm, this.options.caseSensitive ? 'g' : 'gi');
    } else {
      const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = this.options.wholeWord ? `\\b${escapedSearch}\\b` : escapedSearch;
      return new RegExp(pattern, this.options.caseSensitive ? 'g' : 'gi');
    }
  }

  // Replace all occurrences in current file
  private async replaceAllInCurrentFile(): Promise<void> {
    const terms = this.getSearchAndReplaceTerms();
    if (!terms) return;

    const activeFile = this.getCurrentEditorFile();
    if (!activeFile) {
      this.updateReplaceStatus('⚠️ No file open in editor', 'warning');
      return;
    }

    try {
      const content = await readFile(activeFile);
      if (content === null) {
        this.updateReplaceStatus('❌ Could not read file', 'error');
        return;
      }

      const matchCount = this.countMatches(content, terms.searchTerm);
      if (matchCount === 0) {
        this.updateReplaceStatus('ℹ️ No matches found in current file', 'info');
        return;
      }

      const newContent = this.applyReplacement(content, terms.searchTerm, terms.replaceTerm);
      
      // Save for undo
      this.saveForUndo(activeFile, content, newContent, matchCount);
      
      // Write to file
      await this.writeFile(activeFile, newContent);
      
      // Update editor
      this.refreshEditorContent(activeFile, newContent);
      
      this.updateReplaceStatus(`✅ Replaced ${matchCount} occurrence(s) in current file`, 'success');
      this.showUndoButton();
      
      // Re-search to update results
      this.performSearch(terms.searchTerm);
      
    } catch (error: any) {
      this.updateReplaceStatus(`❌ Error: ${error.message}`, 'error');
    }
  }

  // Replace in all matched files
  private async replaceInAllFiles(skipConfirmation: boolean = false): Promise<void> {
    const terms = this.getSearchAndReplaceTerms();
    if (!terms) return;

    if (this.currentResults.length === 0) {
      this.updateReplaceStatus('ℹ️ No search results to replace', 'info');
      return;
    }

    // Get unique files from results
    const uniqueFiles = [...new Set(this.currentResults.map(r => r.filePath))];
    
    // Count total replacements
    let totalMatches = 0;
    const fileMatches: Map<string, number> = new Map();
    
    for (const filePath of uniqueFiles) {
      try {
        const content = await readFile(filePath);
        if (content) {
          const count = this.countMatches(content, terms.searchTerm);
          if (count > 0) {
            fileMatches.set(filePath, count);
            totalMatches += count;
          }
        }
      } catch (e) {
        // Skip files that can't be read
      }
    }

    if (totalMatches === 0) {
      this.updateReplaceStatus('ℹ️ No matches found in files', 'info');
      return;
    }

    // Confirmation dialog (unless skipped)
    if (!skipConfirmation) {
      const confirmed = await this.showReplaceConfirmation(
        fileMatches.size, 
        totalMatches, 
        terms.searchTerm, 
        terms.replaceTerm
      );
      
      if (!confirmed) {
        this.updateReplaceStatus('ℹ️ Replace cancelled', 'info');
        return;
      }
    }

    // Perform replacements
    this.updateReplaceStatus(`🔄 Replacing in ${fileMatches.size} files...`, 'info');
    
    let successCount = 0;
    let totalReplaced = 0;

    for (const [filePath, count] of fileMatches) {
      try {
        const content = await readFile(filePath);
        if (content) {
          const newContent = this.applyReplacement(content, terms.searchTerm, terms.replaceTerm);
          
          // Save for undo (only last one for now - could improve to batch undo)
          this.saveForUndo(filePath, content, newContent, count);
          
          await this.writeFile(filePath, newContent);
          successCount++;
          totalReplaced += count;
        }
      } catch (error) {
        console.error(`Failed to replace in ${filePath}:`, error);
      }
    }

    // Refresh current editor if its file was modified
    const activeFile = this.getCurrentEditorFile();
    if (activeFile && fileMatches.has(activeFile)) {
      const newContent = await readFile(activeFile);
      if (newContent) {
        this.refreshEditorContent(activeFile, newContent);
      }
    }

    this.updateReplaceStatus(
      `✅ Replaced ${totalReplaced} occurrence(s) in ${successCount} file(s)`, 
      'success'
    );
    this.showUndoButton();

    // Re-search to update results
    this.performSearch(terms.searchTerm);

    // Close preview panel if open
    const previewPanel = document.getElementById('replace-preview-panel');
    if (previewPanel) {
      previewPanel.style.display = 'none';
    }
  }

  // Show preview of replacements
  private async showReplacePreview(): Promise<void> {
    const terms = this.getSearchAndReplaceTerms();
    if (!terms) return;

    if (this.currentResults.length === 0) {
      this.updateReplaceStatus('ℹ️ No search results to preview', 'info');
      return;
    }

    const previewPanel = document.getElementById('replace-preview-panel');
    const previewContent = document.getElementById('preview-content');
    
    if (!previewPanel || !previewContent) return;

    // Get unique files
    const uniqueFiles = [...new Set(this.currentResults.map(r => r.filePath))];
    const previews: Array<{ file: string; line: number; before: string; after: string }> = [];

    for (const filePath of uniqueFiles.slice(0, 10)) { // Limit to 10 files for preview
      try {
        const content = await readFile(filePath);
        if (!content) continue;
        
        const lines = content.split('\n');
        const regex = this.buildSearchRegex(terms.searchTerm);
        
        lines.forEach((line, index) => {
          regex.lastIndex = 0;
          if (regex.test(line)) {
            const newLine = this.applyReplacement(line, terms.searchTerm, terms.replaceTerm);
            if (newLine !== line) {
              previews.push({
                file: filePath,
                line: index + 1,
                before: line.trim().substring(0, 80),
                after: newLine.trim().substring(0, 80)
              });
            }
          }
        });
      } catch (e) {
        // Skip
      }
    }

    if (previews.length === 0) {
      previewContent.innerHTML = '<div style="color: #888; padding: 10px;">No changes to preview</div>';
    } else {
      const limitedPreviews = previews.slice(0, 20); // Limit preview items
      previewContent.innerHTML = limitedPreviews.map(p => `
        <div style="margin-bottom: 10px; padding: 8px; background: #1e1e1e; border-radius: 4px;">
          <div style="font-size: 10px; color: #888; margin-bottom: 4px;">
            ${this.getFileName(p.file)} : ${p.line}
          </div>
          <div style="color: #f48771; margin-bottom: 2px;">
            <span style="color: #666;">-</span> ${this.escapeHtml(p.before)}
          </div>
          <div style="color: #89d185;">
            <span style="color: #666;">+</span> ${this.escapeHtml(p.after)}
          </div>
        </div>
      `).join('');
      
      if (previews.length > 20) {
        previewContent.innerHTML += `
          <div style="color: #888; font-size: 11px; padding: 8px;">
            ... and ${previews.length - 20} more changes
          </div>
        `;
      }
    }

    previewPanel.style.display = 'block';
  }

  // Show confirmation dialog for bulk replace
  private showReplaceConfirmation(fileCount: number, matchCount: number, search: string, replace: string): Promise<boolean> {
    return new Promise((resolve) => {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.7); z-index: 100000;
        display: flex; align-items: center; justify-content: center;
      `;

      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: #252526; border: 1px solid #3e3e42; border-radius: 8px;
        padding: 20px; max-width: 450px; width: 90%; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      `;
      
      dialog.innerHTML = `
        <div style="font-size: 14px; font-weight: 600; color: #e0e0e0; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <span style="color: #d97706;">⚠️</span>
          Confirm Replace in All Files
        </div>
        <div style="font-size: 12px; color: #b0b0b0; margin-bottom: 16px; line-height: 1.5;">
          This will replace <strong style="color: #f48771;">${matchCount}</strong> occurrence(s) 
          across <strong style="color: #4FC3F7;">${fileCount}</strong> file(s).
        </div>
        <div style="background: #1e1e1e; padding: 10px; border-radius: 4px; margin-bottom: 16px; font-family: 'Consolas', monospace; font-size: 12px;">
          <div style="color: #f48771; margin-bottom: 4px;">
            <span style="color: #666;">Find:</span> "${this.escapeHtmlForDialog(search)}"
          </div>
          <div style="color: #89d185;">
            <span style="color: #666;">Replace:</span> "${this.escapeHtmlForDialog(replace)}"
          </div>
        </div>
        <div style="font-size: 11px; color: #888; margin-bottom: 16px;">
          💡 Tip: You can undo this operation after it completes.
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button id="cancel-replace-btn" style="padding: 8px 16px; background: transparent; 
                  border: 1px solid #3e3e42; border-radius: 4px; color: #969696; cursor: pointer; font-size: 12px;">
            Cancel
          </button>
          <button id="confirm-replace-btn" style="padding: 8px 16px; background: #d97706; 
                  border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 12px; font-weight: 500;">
            Replace All
          </button>
        </div>
      `;

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const cleanup = () => {
        document.body.removeChild(overlay);
      };

      dialog.querySelector('#cancel-replace-btn')?.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      dialog.querySelector('#confirm-replace-btn')?.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      });

      // ESC to cancel
      const escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanup();
          document.removeEventListener('keydown', escHandler);
          resolve(false);
        }
      };
      document.addEventListener('keydown', escHandler);
    });
  }

  private escapeHtmlForDialog(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .substring(0, 50) + (text.length > 50 ? '...' : '');
  }

  // Save state for undo
  private saveForUndo(filePath: string, original: string, newContent: string, replacements: number): void {
    this.replaceHistory.push({
      filePath,
      originalContent: original,
      newContent,
      replacements,
      timestamp: Date.now()
    });
    
    // Keep only last 10 operations
    if (this.replaceHistory.length > 10) {
      this.replaceHistory.shift();
    }
  }

  // Undo last replacement
  private async undoLastReplace(): Promise<void> {
    if (this.replaceHistory.length === 0) {
      this.updateReplaceStatus('ℹ️ Nothing to undo', 'info');
      return;
    }

    const lastOp = this.replaceHistory.pop()!;
    
    try {
      await this.writeFile(lastOp.filePath, lastOp.originalContent);
      
      // Refresh editor if this file is open
      const activeFile = this.getCurrentEditorFile();
      if (activeFile === lastOp.filePath) {
        this.refreshEditorContent(lastOp.filePath, lastOp.originalContent);
      }
      
      this.updateReplaceStatus(
        `↶ Undone: ${lastOp.replacements} replacement(s) in ${this.getFileName(lastOp.filePath)}`, 
        'success'
      );
      
      // Re-search
      if (this.searchInput?.value) {
        this.performSearch(this.searchInput.value);
      }
      
      // Hide undo button if no more history
      if (this.replaceHistory.length === 0) {
        this.hideUndoButton();
      }
      
    } catch (error: any) {
      this.updateReplaceStatus(`❌ Undo failed: ${error.message}`, 'error');
    }
  }

  private showUndoButton(): void {
    const undoBtn = document.getElementById('undo-replace-btn');
    if (undoBtn) {
      undoBtn.style.display = 'inline-block';
    }
  }

  private hideUndoButton(): void {
    const undoBtn = document.getElementById('undo-replace-btn');
    if (undoBtn) {
      undoBtn.style.display = 'none';
    }
  }

  // Get current file open in editor
  private getCurrentEditorFile(): string | null {
    // Try tabManager
    if ((window as any).tabManager?.getActiveTab) {
      const tab = (window as any).tabManager.getActiveTab();
      return tab?.path || tab?.filePath || null;
    }
    
    // Try getting from active tab element
    const activeTab = document.querySelector('.editor-tab.active');
    if (activeTab) {
      return activeTab.getAttribute('data-path') || null;
    }
    
    // Try monaco editor
    const editor = (window as any).monaco?.editor?.getEditors()?.[0];
    if (editor) {
      const model = editor.getModel();
      if (model) {
        const uri = model.uri.toString();
        // Extract file path from URI
        if (uri.startsWith('file://')) {
          return uri.substring(7);
        }
      }
    }
    
    return null;
  }

  // Write file using Tauri
  private async writeFile(filePath: string, content: string): Promise<void> {
    if (isTauriAvailable()) {
      await invoke('write_file', { path: filePath, content });
    } else {
      throw new Error('File writing requires desktop app');
    }
  }

  // Refresh editor content after replacement
  private refreshEditorContent(filePath: string, newContent: string): void {
    // Try tabManager
    if ((window as any).tabManager?.updateTabContent) {
      (window as any).tabManager.updateTabContent(filePath, newContent);
      return;
    }

    // Try monaco editor directly
    const editor = (window as any).monaco?.editor?.getEditors()?.[0];
    if (editor) {
      const model = editor.getModel();
      if (model) {
        const fullRange = model.getFullModelRange();
        editor.executeEdits('replace', [{
          range: fullRange,
          text: newContent
        }]);
      }
    }
  }

  private setupAIToggle(): void {
    const aiToggleBtn = document.getElementById('content-ai-search-toggle');
    const aiSuggestionsPanel = document.getElementById('ai-suggestions-panel');
    const closeAiBtn = document.getElementById('close-ai-suggestions');
    const searchInput = this.searchInput;

    if (!aiToggleBtn) return;

    // Store reference
    this.aiSuggestionsPanel = aiSuggestionsPanel;

    // Check if AI is available and update badge
    this.updateAIProviderBadge();

    aiToggleBtn.addEventListener('click', () => {
      // ✅ No need to check - Operator X02 is always available
      this.aiSearchMode = !this.aiSearchMode;
      
      // Toggle animation class
      aiToggleBtn.classList.toggle('ai-active', this.aiSearchMode);
      
      // Update button styling
      if (this.aiSearchMode) {
        // ON - Green
        (aiToggleBtn as HTMLElement).style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(76, 175, 80, 0.5))';
        (aiToggleBtn as HTMLElement).style.borderColor = '#4caf50';
        (aiToggleBtn as HTMLElement).style.color = '#4caf50';
      } else {
        // OFF - Grey
        (aiToggleBtn as HTMLElement).style.background = 'rgba(128, 128, 128, 0.1)';
        (aiToggleBtn as HTMLElement).style.borderColor = '#666';
        (aiToggleBtn as HTMLElement).style.color = '#888';
      }

      // Update input placeholder and add animation class
      if (searchInput) {
        searchInput.placeholder = this.aiSearchMode 
          ? '✨ AI-Enhanced Search (type and get suggestions)...'
          : 'Search files and contents... (Ctrl+Shift+F)';
        searchInput.classList.toggle('ai-mode', this.aiSearchMode);
      }

      // Show notification - always Operator X02
      this.showNotification(this.aiSearchMode ? '✨ AI Search ON (Operator X02)' : 'AI Search OFF', 'info');

      // ✅ Update FILES tab pulsing dot
      if ((window as any).tabAnimation) {
        (window as any).tabAnimation.files.toggle(this.aiSearchMode);
      }

      // Dispatch event for other listeners
      document.dispatchEvent(new CustomEvent('ai-search-toggled', {
        detail: { enabled: this.aiSearchMode }
      }));

      // If there's a query, trigger AI search
      if (this.aiSearchMode && searchInput && searchInput.value.length > 2) {
        this.performAIEnhancedSearch(searchInput.value);
      } else if (!this.aiSearchMode && aiSuggestionsPanel) {
        aiSuggestionsPanel.style.display = 'none';
      }

      // Save preference
      localStorage.setItem('contentAISearchEnabled', this.aiSearchMode.toString());
    });

    // Close AI suggestions
    if (closeAiBtn && aiSuggestionsPanel) {
      closeAiBtn.addEventListener('click', () => {
        aiSuggestionsPanel.style.display = 'none';
      });
    }

    // Load saved preference
    const savedAIMode = localStorage.getItem('contentAISearchEnabled');
    if (savedAIMode === 'true' && this.aiEngine.isAIAvailable()) {
      aiToggleBtn.click();
    }
  }

  private updateAIProviderBadge(): void {
    const badge = document.getElementById('ai-provider-badge');
    if (badge) {
      // ✅ Always show Operator X02 (built-in, always available)
      badge.textContent = 'Operator X02';
      badge.style.display = 'inline';
      badge.style.background = 'rgba(76, 175, 80, 0.2)';
      badge.style.color = '#4caf50';
    }
  }

  private async performAIEnhancedSearch(query: string, searchResults: SearchMatch[] = []): Promise<void> {
    if (!this.aiSearchMode || query.length < 2) return;

    const aiSuggestionsPanel = document.getElementById('ai-suggestions-panel');
    const aiExplanation = document.getElementById('ai-explanation');
    const aiKeywordsContainer = document.getElementById('ai-keywords-container');
    const aiStrategy = document.getElementById('ai-strategy');
    const aiStrategyText = document.getElementById('ai-strategy-text');
    const aiSuggestedFiles = document.getElementById('ai-suggested-files');
    const aiFilesContainer = document.getElementById('ai-files-container');

    if (!aiSuggestionsPanel || !aiExplanation || !aiKeywordsContainer) {
      console.error('[AISmartSearch] Missing UI elements');
      return;
    }

    // ✅ Operator X02 is always available - no need to check

    // Show loading state with animation
    aiSuggestionsPanel.style.display = 'block';
    aiSuggestionsPanel.classList.add('loading');
    
    // Animated loading indicator - always Operator X02
    aiExplanation.innerHTML = `
      <div class="ai-loading-indicator">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
        <span class="ai-loading-text">Operator X02 is analyzing ${searchResults.length} results...</span>
      </div>
    `;
    aiKeywordsContainer.innerHTML = '';
    if (aiStrategy) aiStrategy.style.display = 'none';
    if (aiSuggestedFiles) aiSuggestedFiles.style.display = 'none';

    try {
      // Convert SearchMatch[] to SearchResultItem[]
      const resultItems: SearchResultItem[] = searchResults.map(r => ({
        path: r.filePath,
        preview: r.lineContent || '',
        line: r.lineNumber,
        matchType: 'content' as const
      }));

      console.log('[AISmartSearch] Calling Operator X02 with query:', query);
      console.log('[AISmartSearch] Search results to analyze:', resultItems.length);

      // Call AI engine with actual search results
      const result = await this.aiEngine.searchWithAI(query, { files: [], searchResults: resultItems });

      console.log('[AISmartSearch] Operator X02 result:', result);

      // Remove loading state
      aiSuggestionsPanel.classList.remove('loading');

      // Check if we got any results
      if (!result || (!result.explanation && !result.relatedTerms?.length)) {
        aiExplanation.innerHTML = '<span style="color: #888;">No AI analysis available for this search.</span>';
        return;
      }

      // Display AI explanation about search results
      if (result.explanation) {
        // Make file names in explanation clickable
        const clickableExplanation = this.makeFileNamesClickable(result.explanation, resultItems);
        aiExplanation.innerHTML = `<span style="color: #b8b8b8;">🤖 ${clickableExplanation}</span>`;
        
        // Setup click handlers for file links
        this.setupAIFileClickHandlers();
      } else {
        aiExplanation.innerHTML = '';
      }

      // Hide strategy and suggested files sections (not needed - actual results shown below)
      if (aiStrategy) aiStrategy.style.display = 'none';
      if (aiSuggestedFiles) aiSuggestedFiles.style.display = 'none';

      // Display related search terms as clickable buttons
      aiKeywordsContainer.innerHTML = '';
      
      if (result.relatedTerms && result.relatedTerms.length > 0) {
        const label = document.createElement('span');
        label.style.cssText = 'font-size: 10px; color: #888; margin-right: 8px;';
        label.textContent = '🔍 Also try:';
        aiKeywordsContainer.appendChild(label);

        result.relatedTerms.forEach(term => {
          const btn = document.createElement('button');
          btn.className = 'ai-keyword-btn';
          btn.style.cssText = `
            background: rgba(139, 92, 246, 0.15);
            border: 1px solid rgba(139, 92, 246, 0.3);
            color: #a78bfa;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s;
            margin-right: 6px;
          `;
          btn.textContent = term;
          btn.title = `Search for "${term}"`;
          
          btn.addEventListener('click', () => {
            if (this.searchInput) {
              this.searchInput.value = term;
              this.performSearch(term);
            }
          });

          btn.addEventListener('mouseenter', () => {
            btn.style.background = 'rgba(139, 92, 246, 0.3)';
            btn.style.borderColor = '#8b5cf6';
          });

          btn.addEventListener('mouseleave', () => {
            btn.style.background = 'rgba(139, 92, 246, 0.15)';
            btn.style.borderColor = 'rgba(139, 92, 246, 0.3)';
          });

          aiKeywordsContainer.appendChild(btn);
        });
      }

    } catch (error) {
      console.error('[AISmartSearch] Error:', error);
      aiSuggestionsPanel.classList.remove('loading');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      aiExplanation.innerHTML = `<span style="color: #f44336;">❌ Operator X02 error: ${errorMsg}</span>`;
    }
  }

  // Make file names in text clickable - returns HTML with links
  private makeFileNamesClickable(text: string, searchResults: SearchResultItem[]): string {
    // Pattern to match file paths (with or without directory) and common extensions
    const filePattern = /([a-zA-Z0-9_\-\.\/\\]+\.(ts|tsx|js|jsx|json|css|scss|html|md|yaml|yml|toml|xml|py|rs|go|txt|config|lock))/gi;
    
    // Build maps for both full paths and just file names
    const filePathMap = new Map<string, string>();
    const fileNameMap = new Map<string, string>();
    
    searchResults.forEach(r => {
      // Store full path (normalized to forward slashes)
      const normalizedPath = r.path.replace(/\\/g, '/').toLowerCase();
      filePathMap.set(normalizedPath, r.path);
      
      // Store just the filename - split on both / and \
      const pathParts = r.path.split(/[\/\\]/);
      const fileName = pathParts[pathParts.length - 1] || '';
      if (fileName) {
        fileNameMap.set(fileName.toLowerCase(), r.path);
        console.log('[AISmartSearch] Registered file:', fileName.toLowerCase(), '->', r.path);
      }
    });
    
    console.log('[AISmartSearch] fileNameMap entries:', Array.from(fileNameMap.keys()));
    
    // Replace file names/paths with clickable links
    return text.replace(filePattern, (match) => {
      const normalizedMatch = match.replace(/\\/g, '/').toLowerCase();
      
      // Try to find full path first, then just filename
      let filePath = filePathMap.get(normalizedMatch);
      
      if (!filePath) {
        // Try matching just the filename part - split on both / and \
        const matchParts = match.split(/[\/\\]/);
        const matchFileName = matchParts[matchParts.length - 1] || match;
        filePath = fileNameMap.get(matchFileName.toLowerCase());
        console.log('[AISmartSearch] Trying filename match:', matchFileName.toLowerCase(), '-> found:', !!filePath);
      }
      
      if (!filePath) {
        // Try partial path match (e.g., "src/App.tsx" should match "C:/project/src/App.tsx")
        for (const [key, value] of filePathMap) {
          if (key.endsWith(normalizedMatch)) {
            filePath = value;
            break;
          }
        }
      }
      
      if (filePath) {
        // Escape the path for use in data attribute
        const escapedPath = filePath.replace(/"/g, '&quot;');
        return `<span class="ai-file-link" data-filepath="${escapedPath}" 
                style="color: #4fc3f7; cursor: pointer; text-decoration: underline; 
                       text-decoration-style: dotted; font-weight: 500;"
                title="Click to open ${match}">${match}</span>`;
      }
      
      // If not in search results, still make it look like a file but not clickable
      return `<span style="color: #888; font-style: italic;">${match}</span>`;
    });
  }

  // Setup click handlers for file links in AI explanation
  private setupAIFileClickHandlers(): void {
    const fileLinks = document.querySelectorAll('.ai-file-link');
    fileLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const filePath = (link as HTMLElement).getAttribute('data-filepath');
        if (filePath) {
          console.log('[AISmartSearch] Opening file from explanation:', filePath);
          this.openFile(filePath);
        }
      });
      
      // Hover effect
      link.addEventListener('mouseenter', () => {
        (link as HTMLElement).style.color = '#81d4fa';
        (link as HTMLElement).style.textDecoration = 'underline';
      });
      
      link.addEventListener('mouseleave', () => {
        (link as HTMLElement).style.color = '#4fc3f7';
        (link as HTMLElement).style.textDecoration = 'underline';
        (link as HTMLElement).style.textDecorationStyle = 'dotted';
      });
    });
  }

  // Helper to open a file
  private openFile(filePath: string): void {
    console.log('📂 [Search] Opening file:', filePath);
    
    // Try openFileInTab first (your IDE's main method)
    if ((window as any).openFileInTab) {
      (window as any).openFileInTab(filePath);
      return;
    }
    
    // Try tabManager
    if ((window as any).tabManager?.openFile) {
      (window as any).tabManager.openFile(filePath);
      return;
    }
    
    // Try other methods
    if ((window as any).openFile) {
      (window as any).openFile(filePath);
      return;
    }
    
    if ((window as any).openFileInEditor) {
      (window as any).openFileInEditor(filePath);
      return;
    }
    
    // Dispatch event as fallback
    document.dispatchEvent(new CustomEvent('open-file', { detail: { path: filePath } }));
    console.log('📂 [Search] Dispatched open-file event for:', filePath);
  }

  private showNotification(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    // Try to use the app's notification system
    if (typeof showNotification === 'function') {
      showNotification(message, type);
      return;
    }

    // Fallback: simple toast
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#323232'};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      font-size: 13px;
      z-index: 99999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+F - Focus search
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        this.focusSearch();
      }

      // Escape - Clear search or close panel
     // Escape - Clear search or close panel
if (e.key === 'Escape') {
  const searchContent = document.getElementById('search-content');
  const isSearchVisible = searchContent && searchContent.classList.contains('active');
  
  if (isSearchVisible && document.activeElement === this.searchInput) {
    if (this.searchInput && this.searchInput.value) {
      // Clear search if there's text
      this.searchInput.value = '';
      this.clearResults();
      const clearBtn = document.getElementById('search-clear-btn');
      if (clearBtn) {
        clearBtn.style.display = 'none';
      }
    } else {
      // Close panel if search is empty
      this.closeSearchPanel();
    }
  }
}

      // Alt+C - Toggle case sensitive
      if (e.altKey && e.key === 'c' && document.activeElement === this.searchInput) {
        e.preventDefault();
        const btn = document.querySelector('[data-option="caseSensitive"]');
        if (btn) (btn as HTMLElement).click();
      }

      // Alt+W - Toggle whole word
      if (e.altKey && e.key === 'w' && document.activeElement === this.searchInput) {
        e.preventDefault();
        const btn = document.querySelector('[data-option="wholeWord"]');
        if (btn) (btn as HTMLElement).click();
      }

      // Alt+R - Toggle regex
      if (e.altKey && e.key === 'r' && document.activeElement === this.searchInput) {
        e.preventDefault();
        const btn = document.querySelector('[data-option="useRegex"]');
        if (btn) (btn as HTMLElement).click();
      }
    });
  }

  // ============================================================================
  // SEARCH EXECUTION
  // ============================================================================

private async performSearch(query: string): Promise<void> {
  if (!query.trim()) {
    this.clearResults();
    // Hide AI suggestions when cleared
    const aiPanel = document.getElementById('ai-suggestions-panel');
    if (aiPanel) aiPanel.style.display = 'none';
    return;
  }

  if (this.isSearching) {
    console.log('⏳ Search already in progress, skipping...');
    return;
  }

  this.isSearching = true;
  this.updateStatus('🔍 Searching...', 'searching');
  
  const startTime = performance.now();
  this.currentResults = [];

  try {
    // ✅ FIX: Use getRobustProjectPath() with multiple fallbacks
    const projectPath = getRobustProjectPath();
    
    console.log('🔍 Project path:', projectPath); // Debug
    
    if (!projectPath) {
      this.updateStatus('⚠️ No project folder open', 'warning');
      this.isSearching = false;
      return;
    }

    // ✅ FIX 2: Check Tauri availability correctly
    if (isTauriAvailable()) {
      console.log('🔍 Using Tauri search...');
      await this.performTauriSearch(query, projectPath);
    } else {
      console.log('🔍 Using browser search...');
      await this.performBrowserSearch(query, projectPath);
    }

    const duration = Math.round(performance.now() - startTime);
    this.displayResults();
    
    const fileCount = new Set(this.currentResults.map(r => r.filePath)).size;
    const aiIndicator = this.aiSearchMode ? ' ✨' : '';
    
    // 🧠 Smart retry: If no results and query has special chars, try without them
    if (this.currentResults.length === 0 && this.hasSpecialCharacters(query)) {
      const cleanQuery = this.extractSearchTerms(query);
      if (cleanQuery && cleanQuery !== query) {
        console.log(`🧠 [SmartSearch] No results for "${query}", auto-trying "${cleanQuery}"`);
        // Don't auto-search, but show suggestion
        this.showSmartSuggestion(query, cleanQuery);
      }
    }
    
    this.updateStatus(
      `✅ Found ${this.currentResults.length} results in ${fileCount} files (${duration}ms)${aiIndicator}`,
      'success'
    );

    // 🤖 Call AI AFTER search results are ready
    if (this.aiSearchMode && query.length > 2 && this.currentResults.length > 0) {
      this.performAIEnhancedSearch(query, this.currentResults);
    } else if (this.aiSearchMode && this.currentResults.length === 0) {
      // No results - let AI know and provide smart suggestions
      this.performAIEnhancedSearch(query, []);
    }

  } catch (error: any) {
    console.error('❌ Search error:', error);
    this.updateStatus(`❌ Search failed: ${error.message || error}`, 'error');
  } finally {
    this.isSearching = false;
  }
}

  private async performTauriSearch(query: string, projectPath: string): Promise<void> {
    try {
      const results = await invoke<SearchMatch[]>('search_in_files', {
        path: projectPath,
        query: query,
        caseSensitive: this.options.caseSensitive,
        wholeWord: this.options.wholeWord,
        useRegex: this.options.useRegex,
        excludePatterns: this.options.excludeFiles.split(',').map(s => s.trim()).filter(Boolean)
      });
      
      this.currentResults = results;
      
    } catch (tauriError) {
      console.warn('⚠️ Native search not available, falling back to file-by-file search');
      await this.performFallbackSearch(query, projectPath);
    }
  }

  private async performFallbackSearch(query: string, projectPath: string): Promise<void> {
    const tree = await invoke('read_directory_recursive', {
      path: projectPath,
      maxDepth: 10
    }) as any;

    const files: string[] = [];
    const collectFiles = (node: any) => {
      if (node.is_directory && node.children) {
        node.children.forEach(collectFiles);
      } else if (!node.is_directory) {
        files.push(node.path);
      }
    };
    collectFiles(tree);

    const filteredFiles = this.filterFiles(files);

    for (const filePath of filteredFiles) {
      try {
        if (this.matchesQuery(this.getFileName(filePath), query)) {
          this.currentResults.push({
            filePath: filePath,
            fileName: this.getFileName(filePath),
            lineNumber: 0,
            lineContent: this.getFileName(filePath),
            matchStart: 0,
            matchEnd: query.length
          });
        }

        if (this.options.searchInContent && this.isTextFile(filePath)) {
          const content = await readFile(filePath);
          if (content) {
            const matches = this.searchInFileContent(content, query, filePath);
            this.currentResults.push(...matches);
          }
        }

        if (this.currentResults.length > 1000) {
          console.warn('⚠️ Result limit reached (1000)');
          break;
        }

      } catch (error) {
        continue;
      }
    }
  }

  private async performBrowserSearch(query: string, _projectPath: string): Promise<void> {
    const fileItems = document.querySelectorAll('.file-item[data-path]');
    
    fileItems.forEach(item => {
      const filePath = (item as HTMLElement).getAttribute('data-path');
      const fileName = (item as HTMLElement).getAttribute('data-name') || '';
      
      if (filePath && this.matchesQuery(fileName, query)) {
        this.currentResults.push({
          filePath: filePath,
          fileName: fileName,
          lineNumber: 0,
          lineContent: fileName,
          matchStart: 0,
          matchEnd: query.length
        });
      }
    });

    if (this.currentResults.length === 0) {
      this.updateStatus('ℹ️ Content search requires desktop app', 'info');
    }
  }

  // ============================================================================
  // SEARCH HELPERS
  // ============================================================================
private searchInFileContent(content: string, query: string, filePath: string): SearchMatch[] {
  const matches: SearchMatch[] = [];
  const lines = content.split('\n');
  
  let regex: RegExp;
  try {
    if (this.options.useRegex) {
      regex = new RegExp(query, this.options.caseSensitive ? 'g' : 'gi');
    } else {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = this.options.wholeWord ? `\\b${escapedQuery}\\b` : escapedQuery;
      regex = new RegExp(pattern, this.options.caseSensitive ? 'g' : 'gi');
    }
  } catch (e) {
    console.warn('Invalid regex pattern:', query);
    return matches;
  }

  lines.forEach((line, index) => {
    // Reset regex lastIndex for each line
    regex.lastIndex = 0;
    
    let match;
    while ((match = regex.exec(line)) !== null) {
      matches.push({
        filePath: filePath,
        fileName: this.getFileName(filePath),
        lineNumber: index + 1,
        lineContent: line.trim(),
        matchStart: match.index,
        matchEnd: match.index + match[0].length,
        contextBefore: lines[index - 1]?.trim(),
        contextAfter: lines[index + 1]?.trim()
      });
      
      // Prevent infinite loop for zero-length matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
  });

  return matches;
}

  private matchesQuery(text: string, query: string): boolean {
    if (this.options.useRegex) {
      try {
        const regex = new RegExp(query, this.options.caseSensitive ? '' : 'i');
        return regex.test(text);
      } catch (e) {
        return false;
      }
    }

    const searchText = this.options.caseSensitive ? text : text.toLowerCase();
    const searchQuery = this.options.caseSensitive ? query : query.toLowerCase();

    if (this.options.wholeWord) {
      // Escape special regex characters in the query
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedQuery}\\b`, this.options.caseSensitive ? '' : 'i');
      return regex.test(text);
    }

    return searchText.includes(searchQuery);
  }

  // Check if query contains special characters that might prevent matches
  private hasSpecialCharacters(query: string): boolean {
    return /[:\.,;=<>!@#$%^&*()[\]{}|\\\/]/.test(query);
  }

  // Extract meaningful search terms from a query
  private extractSearchTerms(query: string): string {
    // Extract numbers
    const numbers = query.match(/\d+/g) || [];
    
    // Extract words (letters only)
    const words = query.match(/[a-zA-Z]+/g) || [];
    
    // Combine meaningful parts
    const terms = [...words, ...numbers].filter(t => t.length > 1);
    
    // Return the most meaningful term or combination
    if (terms.length === 0) return '';
    if (terms.length === 1) return terms[0];
    
    // For queries like "port: 3000", return just the number (more specific)
    if (numbers.length > 0 && numbers[0].length >= 2) {
      return numbers[0];
    }
    
    return terms[0]; // Return first word
  }

  // Show smart suggestion when no results found
  private showSmartSuggestion(originalQuery: string, suggestedQuery: string): void {
    const statusElement = document.getElementById('search-status-text');
    if (!statusElement) return;
    
    // Create clickable suggestion
    statusElement.innerHTML = `
      <span style="color: #969696;">No results for "${originalQuery}"</span>
      <span style="margin-left: 8px;">
        💡 Try: 
        <button class="smart-suggestion-btn" data-query="${suggestedQuery}"
                style="background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.4);
                       color: #a78bfa; padding: 2px 8px; border-radius: 10px; font-size: 11px;
                       cursor: pointer; margin-left: 4px;">
          ${suggestedQuery}
        </button>
      </span>
    `;
    
    // Add click handler for suggestion
    const btn = statusElement.querySelector('.smart-suggestion-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        if (this.searchInput) {
          this.searchInput.value = suggestedQuery;
          this.performSearch(suggestedQuery);
        }
      });
    }
  }

  private filterFiles(files: string[]): string[] {
    return files.filter(file => {
      if (this.options.excludeFiles) {
        const excludePatterns = this.options.excludeFiles.split(',').map(s => s.trim());
        if (excludePatterns.some(pattern => file.includes(pattern))) {
          return false;
        }
      }

      if (this.options.includeFiles) {
        const includePatterns = this.options.includeFiles.split(',').map(s => s.trim());
        return includePatterns.some(pattern => {
          if (pattern.startsWith('*.')) {
            return file.endsWith(pattern.substring(1));
          }
          return file.includes(pattern);
        });
      }

      return true;
    });
  }

  private isTextFile(filePath: string): boolean {
    const textExtensions = [
      '.txt', '.ts', '.js', '.tsx', '.jsx', '.json', '.html', '.css', '.scss',
      '.py', '.java', '.cpp', '.c', '.h', '.rs', '.go', '.md', '.xml', '.yaml',
      '.yml', '.toml', '.ini', '.sh', '.bat', '.ps1', '.sql', '.php', '.rb'
    ];
    
    return textExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
  }

  private getFileName(path: string): string {
    return path.split(/[/\\]/).pop() || path;
  }

  // ============================================================================
  // FILTER LOGIC
  // ============================================================================

  private applyTopFilter(filter: 'all' | 'no-code' | 'structure' | 'minimal' | 'code'): void {
    console.log('🔍 Applying filter:', filter);

    switch (filter) {
      case 'all':
        this.options.includeFiles = '';
        this.options.excludeFiles = 'node_modules,.git,dist,build';
        this.options.searchInContent = true;
        this.updateFilterInputs();
        this.updateStatus('📋 Showing all results', 'info');
        break;

      case 'no-code':
        this.options.includeFiles = '*.md,*.txt,*.json,*.yaml,*.yml,*.toml,*.ini,*.xml,*.html,*.css';
        this.options.excludeFiles = 'node_modules,.git,dist,build,*.ts,*.js,*.tsx,*.jsx,*.py,*.java,*.cpp,*.c,*.rs,*.go';
        this.options.searchInContent = true;
        this.updateFilterInputs();
        this.updateStatus('📄 Showing non-code files only', 'info');
        break;

      case 'structure':
        this.options.includeFiles = '';
        this.options.excludeFiles = 'node_modules,.git,dist,build';
        this.options.searchInContent = false;
        this.updateFilterInputs();
        this.updateStatus('🗂️ Showing file structure only (no content search)', 'info');
        
        const contentBtn = document.querySelector('[data-option="searchInContent"]');
        if (contentBtn) {
          contentBtn.classList.remove('active');
        }
        break;

      case 'minimal':
        this.options.includeFiles = '';
        this.options.excludeFiles = 'node_modules,.git,dist,build';
        this.options.searchInContent = true;
        this.updateFilterInputs();
        this.updateStatus('⚡ Minimal mode - showing top 50 results', 'info');
        break;

      case 'code':
        this.options.includeFiles = '*.ts,*.js,*.tsx,*.jsx,*.py,*.java,*.cpp,*.c,*.rs,*.go,*.php,*.rb';
        this.options.excludeFiles = 'node_modules,.git,dist,build,*.min.js,*.map';
        this.options.searchInContent = true;
        this.updateFilterInputs();
        this.updateStatus('💻 Showing code files only', 'info');
        break;
    }
  }

  private updateFilterInputs(): void {
    const includeInput = document.getElementById('search-include-files') as HTMLInputElement;
    const excludeInput = document.getElementById('search-exclude-files') as HTMLInputElement;

    if (includeInput) {
      includeInput.value = this.options.includeFiles;
    }

    if (excludeInput) {
      excludeInput.value = this.options.excludeFiles;
    }
  }

  // ============================================================================
  // RESULTS DISPLAY
  // ============================================================================

  private displayResults(): void {
    if (!this.resultsContainer) return;

    let resultsToShow = this.currentResults;
    if (this.activeTopFilter === 'minimal' && this.currentResults.length > 50) {
      resultsToShow = this.currentResults.slice(0, 50);
      this.updateStatus(
        `⚡ Showing top 50 of ${this.currentResults.length} results`,
        'info'
      );
    }

    if (resultsToShow.length === 0) {
      this.resultsContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; 
                    height: 200px; color: #666; text-align: center;">
          <div style="font-size: 13px; margin-bottom: 8px;">No results found</div>
          <div style="font-size: 11px; opacity: 0.7;">Try a different search term</div>
        </div>
      `;
      return;
    }

    const groupedResults = new Map<string, SearchMatch[]>();
    resultsToShow.forEach(result => {
      if (!groupedResults.has(result.filePath)) {
        groupedResults.set(result.filePath, []);
      }
      groupedResults.get(result.filePath)!.push(result);
    });

    let html = '';
    groupedResults.forEach((matches, filePath) => {
      const fileName = this.getFileName(filePath);
      const relativePath = this.getRelativePath(filePath);
      
  html += `
  <div class="search-file-group" style="margin-bottom: 12px; border-left: 2px solid #3e3e42; padding-left: 8px;">
    <div class="search-file-header" style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; 
              cursor: pointer; padding: 4px; border-radius: 3px; transition: background 0.2s;"
              data-file-path="${filePath}">
      <span style="color: #4FC3F7; font-size: 12px;">▼</span>
      <span style="color: #cccccc; font-size: 12px; font-weight: 500;">${this.escapeHtml(fileName)}</span>
      <span style="color: #666; font-size: 11px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(relativePath)}</span>
      <span style="color: #666; font-size: 11px; background: #2d2d30; padding: 2px 6px; border-radius: 3px;">${matches.length}</span>
    </div>
    <div class="search-file-matches" style="display: block; margin-left: 20px;">
      ${matches.map(match => this.renderMatch(match)).join('')}
    </div>
  </div>
`;
    });

    this.resultsContainer.innerHTML = html;
    this.setupResultClickHandlers();
  }

private renderMatch(match: SearchMatch): string {
  const { lineContent, lineNumber, fileName, filePath } = match;
  
  // Get the search query
  const searchQuery = this.searchInput?.value || '';
  
  // Build the highlighted line content using consistent highlighting
  let highlightedContent = '';
  
  if (lineNumber === 0) {
    // Filename match - use highlightText which respects search options
    highlightedContent = this.highlightText(fileName, searchQuery);
  } else {
    // Content match - also use highlightText for consistency
    highlightedContent = this.highlightText(lineContent, searchQuery);
  }

  return `
    <div class="search-match-line" style="padding: 4px 6px; margin: 2px 0; cursor: pointer; 
              border-radius: 3px; font-size: 12px; font-family: 'Consolas', monospace; 
              transition: background 0.2s; display: flex; gap: 8px;"
              data-file-path="${filePath}" data-line="${lineNumber}">
      <span style="color: #666; min-width: 40px; text-align: right; user-select: none;">${lineNumber > 0 ? lineNumber : ''}</span>
      <span style="color: #969696; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${highlightedContent}
      </span>
    </div>
  `;
}

private highlightText(text: string, query: string): string {
  if (!query) return this.escapeHtml(text);
  
  try {
    // Create regex based on search options
    let regex: RegExp;
    
    if (this.options.useRegex) {
      regex = new RegExp(`(${query})`, this.options.caseSensitive ? 'g' : 'gi');
    } else {
      // Escape special regex characters in query
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = this.options.wholeWord ? `\\b(${escapedQuery})\\b` : `(${escapedQuery})`;
      regex = new RegExp(pattern, this.options.caseSensitive ? 'g' : 'gi');
    }
    
    // Split text and highlight matches
    const parts: string[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(this.escapeHtml(text.substring(lastIndex, match.index)));
      }
      
      // Add highlighted match with better visibility
      parts.push(`<mark style="background: #f2cc60; color: #000; padding: 0 2px; border-radius: 2px; font-weight: 600; box-shadow: 0 0 0 1px rgba(242, 204, 96, 0.5);">${this.escapeHtml(match[0])}</mark>`);
      
      lastIndex = regex.lastIndex;
      
      // Prevent infinite loop for zero-length matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(this.escapeHtml(text.substring(lastIndex)));
    }
    
    return parts.join('');
    
  } catch (error) {
    console.error('Error highlighting text:', error);
    return this.escapeHtml(text);
  }
}
  private setupResultClickHandlers(): void {
    const fileHeaders = this.resultsContainer?.querySelectorAll('.search-file-header');
    fileHeaders?.forEach(header => {
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        const matchesContainer = (header as HTMLElement).nextElementSibling as HTMLElement;
        const chevron = header.querySelector('span');
        
        if (matchesContainer.style.display === 'none') {
          matchesContainer.style.display = 'block';
          if (chevron) chevron.textContent = '▼';
        } else {
          matchesContainer.style.display = 'none';
          if (chevron) chevron.textContent = '▶';
        }
      });

      header.addEventListener('mouseenter', () => {
        (header as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
      });

      header.addEventListener('mouseleave', () => {
        (header as HTMLElement).style.background = 'transparent';
      });
    });

    const matchLines = this.resultsContainer?.querySelectorAll('.search-match-line');
    matchLines?.forEach(line => {
      line.addEventListener('click', async () => {
        const filePath = (line as HTMLElement).dataset.filePath;
        const lineNumber = parseInt((line as HTMLElement).dataset.line || '0');
        
        if (filePath) {
          await this.openFileAtLine(filePath, lineNumber);
        }
      });

      line.addEventListener('mouseenter', () => {
        (line as HTMLElement).style.background = 'rgba(255, 255, 255, 0.08)';
      });

      line.addEventListener('mouseleave', () => {
        (line as HTMLElement).style.background = 'transparent';
      });
    });
  }

  private async openFileAtLine(filePath: string, lineNumber: number): Promise<void> {
    try {
      const content = await readFile(filePath);
      if (content === null) return;

      const tabManager = (window as any).tabManager;
      if (tabManager?.addTab) {
        tabManager.addTab(filePath, content);
        
        setTimeout(() => {
          const editor = (window as any).monaco?.editor?.getEditors()?.[0];
          if (editor && lineNumber > 0) {
            editor.revealLineInCenter(lineNumber);
            editor.setPosition({ lineNumber: lineNumber, column: 1 });
            editor.focus();
          }
        }, 100);
      }

      showNotification(`Opened ${this.getFileName(filePath)} at line ${lineNumber}`, 'success');

    } catch (error: any) {
      console.error('Failed to open file:', error);
      showNotification(`Failed to open file: ${error.message}`, 'error');
    }
  }

  // ============================================================================
  // UI HELPERS
  // ============================================================================

  private updateStatus(message: string, type: 'searching' | 'success' | 'warning' | 'error' | 'info'): void {
    const statusElement = document.getElementById('search-status-text');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.style.color = 
        type === 'error' ? '#f48771' :
        type === 'warning' ? '#cca700' :
        type === 'success' ? '#89d185' :
        type === 'searching' ? '#4FC3F7' :
        '#969696';
    }
  }

  private clearResults(): void {
    this.currentResults = [];
    if (this.resultsContainer) {
      this.resultsContainer.innerHTML = `
        <div class="search-empty-state" style="display: flex; flex-direction: column; align-items: center; 
                  justify-content: center; height: 200px; color: #666; text-align: center;">
          <svg width="64" height="64" viewBox="0 0 16 16" fill="currentColor" style="opacity: 0.3; margin-bottom: 16px;">
            <path d="M11.5 6.5C11.5 9.26142 9.26142 11.5 6.5 11.5C3.73858 11.5 1.5 9.26142 1.5 6.5C1.5 3.73858 3.73858 1.5 6.5 1.5C9.26142 1.5 11.5 3.73858 11.5 6.5Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M10 10L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <div style="font-size: 14px; margin-bottom: 8px; color: #888;">Search across files</div>
          <div style="font-size: 12px; opacity: 0.7; color: #666;">
            Press <kbd style="padding: 2px 6px; background: #2d2d30; border: 1px solid #454545; border-radius: 3px;">Ctrl+Shift+F</kbd> to focus
          </div>
        </div>
      `;
    }
    this.updateStatus('', 'info');
  }

  private focusSearch(): void {
    const searchTab = document.querySelector('[data-tab-id="search"]') as HTMLElement;
    if (searchTab) {
      searchTab.click();
    }
    
    if (this.searchInput) {
      this.searchInput.focus();
      this.searchInput.select();
    }
  }

  private closeSearchPanel(): void {
    console.log('🔒 Closing search panel...');
    
    // Hide the search content directly using class
    const searchContent = document.getElementById('search-content');
    if (searchContent) {
      searchContent.classList.remove('active');
      searchContent.classList.add('hidden');
      searchContent.style.display = 'none';
    }
    
    // Remove active state from search tab
    const searchTab = document.querySelector('[data-tab-id="search"]') as HTMLElement;
    if (searchTab) {
      searchTab.classList.remove('active');
    }
    
    // Switch to Files tab and show it
    const filesTab = document.querySelector('[data-tab-id="files"]') as HTMLElement;
    const filesContent = document.getElementById('files-content');
    
    if (filesTab) {
      filesTab.classList.add('active');
    }
    
    if (filesContent) {
      filesContent.style.display = 'flex';
      filesContent.classList.add('active');
    }
    
    // Clear search
    if (this.searchInput) {
      this.searchInput.value = '';
      const clearBtn = document.getElementById('search-clear-btn');
      if (clearBtn) {
        clearBtn.style.display = 'none';
      }
    }
    
    this.clearResults();
    
    console.log('✅ Search panel closed');
    showNotification('Search panel closed', 'info');
  }

  private getRelativePath(fullPath: string): string {
  // ✅ FIX: Use getRobustProjectPath() with multiple fallbacks
  const projectPath = getRobustProjectPath();
  
  if (projectPath && fullPath.startsWith(projectPath)) {
    return fullPath.substring(projectPath.length).replace(/^[/\\]/, '');
  }
  return fullPath;
}

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  public search(query: string): void {
    if (this.searchInput) {
      this.searchInput.value = query;
      this.performSearch(query);
    }
  }

  // ============================================================================
  // SCOPE TAB HANDLING
  // ============================================================================

  private setupScopeTabs(): void {
    const scopeTabs = document.querySelectorAll('.scope-tab');
    const filesFilters = document.getElementById('files-scope-filters');
    
    scopeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Ignore disabled tabs
        if (tab.classList.contains('disabled')) return;
        
        const scope = tab.getAttribute('data-scope') as typeof this.currentScope;
        if (!scope) return;
        
        // Update active tab styling (CSS classes handle the rest)
        scopeTabs.forEach(t => {
          t.classList.remove('active');
        });
        
        tab.classList.add('active');
        
        // Update current scope
        this.currentScope = scope;
        
        // Show/hide files filters (only for files scope)
        if (filesFilters) {
          filesFilters.style.display = scope === 'files' ? 'flex' : 'none';
        }
        
        // Show appropriate results container
        this.showScopeResults(scope);
        
        // Update placeholder text
        this.updateSearchPlaceholder(scope);
        
        // If there's a query, re-search with new scope
        if (this.searchInput && this.searchInput.value) {
          this.performUniversalSearch(this.searchInput.value);
        }
      });
    });
  }

  private showScopeResults(scope: string): void {
    const allContainers = document.querySelectorAll('.scope-results');
    allContainers.forEach(container => {
      (container as HTMLElement).style.display = 'none';
    });
    
    const scopeContainerMap: Record<string, string> = {
      'files': 'search-results-container',
      'conversations': 'conversations-results-container',
      'terminal': 'terminal-results-container',
      'todos': 'todos-results-container',
      'svn': 'svn-results-container',
      'errors': 'errors-results-container',
      'snippets': 'snippets-results-container'
    };
    
    const targetContainer = document.getElementById(scopeContainerMap[scope]);
    if (targetContainer) {
      targetContainer.style.display = 'block';
    }
  }

  private updateSearchPlaceholder(scope: string): void {
    if (!this.searchInput) return;
    
    const placeholders: Record<string, string> = {
      'files': 'Search files and contents...',
      'conversations': 'Search AI conversations...',
      'terminal': 'Search terminal commands...',
      'todos': 'Search TODO, FIXME, NOTE...',
      'svn': 'Search SVN commits...',
      'errors': 'Search error history...',
      'snippets': 'Search code snippets...'
    };
    
    this.searchInput.placeholder = placeholders[scope] || 'Search...';
  }

  // ============================================================================
  // UNIVERSAL SEARCH
  // ============================================================================

  private async performUniversalSearch(query: string): Promise<void> {
    switch (this.currentScope) {
      case 'files':
        this.performSearch(query);
        break;
      case 'conversations':
        await this.searchConversations(query);
        break;
      case 'terminal':
        await this.searchTerminal(query);
        break;
      case 'todos':
        await this.searchTodos(query);
        break;
      case 'svn':
        await this.searchSVN(query);
        break;
      case 'errors':
        await this.searchErrors(query);
        break;
      case 'snippets':
        await this.searchSnippets(query);
        break;
    }
  }

  private async searchConversations(query: string): Promise<void> {
    const container = document.getElementById('conversations-results-container');
    if (!container) return;
    
    const results = this.universalSearch.searchConversations(query);
    
    if (results.length === 0) {
      container.innerHTML = `
        <div class="search-empty-state" style="padding: 40px; text-align: center; color: #888;">
          <span style="font-size: 32px; display: block; margin-bottom: 12px;">💬</span>
          ${query ? 'No conversations found' : 'No conversation history yet'}
          <div style="font-size: 11px; margin-top: 8px; color: #666;">
            Conversations are saved automatically when you chat with AI
          </div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div style="font-size: 11px; color: #888; padding: 4px 0 8px;">Found ${results.length} conversation(s)</div>
      ${results.slice(0, 50).map(c => `
        <div class="conversation-result-item" data-id="${c.id}">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 11px; color: #888;">${this.formatTimestamp(c.timestamp)}</span>
            ${c.tags ? `<span style="font-size: 10px; color: #a78bfa;">${c.tags.join(', ')}</span>` : ''}
          </div>
          <div style="font-size: 12px; color: #e0e0e0; margin-bottom: 4px;">
            <strong>You:</strong> ${this.truncate(c.userMessage, 100)}
          </div>
          <div style="font-size: 11px; color: #b0b0b0;">
            <strong>AI:</strong> ${this.truncate(c.aiResponse, 150)}
          </div>
        </div>
      `).join('')}
    `;
  }

  private async searchTerminal(query: string): Promise<void> {
    const container = document.getElementById('terminal-results-container');
    if (!container) return;
    
    const results = this.universalSearch.searchTerminal(query);
    
    if (results.length === 0) {
      container.innerHTML = `
        <div class="search-empty-state" style="padding: 40px; text-align: center; color: #888;">
          <span style="font-size: 32px; display: block; margin-bottom: 12px;">🖥️</span>
          ${query ? 'No commands found' : 'No terminal history yet'}
          <div style="font-size: 11px; margin-top: 8px; color: #666;">
            Commands are saved when you use the terminal
          </div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div style="font-size: 11px; color: #888; padding: 4px 0 8px;">Found ${results.length} command(s)</div>
      ${results.slice(0, 100).map(t => `
        <div class="terminal-result-item" onclick="navigator.clipboard.writeText('${t.command.replace(/'/g, "\\'")}')">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <code style="color: #4caf50;">${t.command}</code>
            <span style="font-size: 10px; color: #666;">${this.formatTimestamp(t.timestamp)}</span>
          </div>
          ${t.exitCode !== undefined ? `<span style="font-size: 10px; color: ${t.exitCode === 0 ? '#4caf50' : '#f44336'};">Exit: ${t.exitCode}</span>` : ''}
        </div>
      `).join('')}
    `;
  }

  private async searchTodos(query: string): Promise<void> {
    const container = document.getElementById('todos-results-container');
    if (!container) return;
    
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #888;">
        <div class="ai-loading-indicator" style="justify-content: center;">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
        <div style="margin-top: 8px;">Scanning project for TODOs...</div>
      </div>
    `;
    
    const results = await this.universalSearch.searchTodos(query);
    
    if (results.length === 0) {
      container.innerHTML = `
        <div class="search-empty-state" style="padding: 40px; text-align: center; color: #888;">
          <span style="font-size: 32px; display: block; margin-bottom: 12px;">📝</span>
          ${query ? 'No TODOs found matching your search' : 'No TODOs found in project'}
          <div style="font-size: 11px; margin-top: 8px; color: #666;">
            Add TODO, FIXME, NOTE comments in your code
          </div>
        </div>
      `;
      return;
    }
    
    const typeColors: Record<string, string> = {
      'TODO': '#ffc107',
      'FIXME': '#f44336',
      'NOTE': '#2196f3',
      'HACK': '#ff9800',
      'XXX': '#9c27b0'
    };
    
    container.innerHTML = `
      <div style="font-size: 11px; color: #888; padding: 4px 0 8px;">Found ${results.length} comment(s)</div>
      ${results.map(t => `
        <div class="todo-result-item ${t.type.toLowerCase()}" onclick="window.openFileInTab && window.openFileInTab('${t.file.replace(/\\/g, '\\\\')}', ${t.line})">
          <div style="display: flex; gap: 8px; align-items: flex-start;">
            <span style="background: ${typeColors[t.type]}; color: #000; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">${t.type}</span>
            <div style="flex: 1;">
              <div style="font-size: 12px; color: #e0e0e0;">${t.text}</div>
              <div style="font-size: 10px; color: #888; margin-top: 4px;">${t.file.split(/[/\\]/).pop()} : ${t.line}</div>
            </div>
          </div>
        </div>
      `).join('')}
    `;
  }

  private async searchSVN(query: string): Promise<void> {
    const container = document.getElementById('svn-results-container');
    if (!container) return;
    
    const results = await this.universalSearch.searchSVN(query);
    
    if (results.length === 0) {
      container.innerHTML = `
        <div class="search-empty-state" style="padding: 40px; text-align: center; color: #888;">
          <span style="font-size: 32px; display: block; margin-bottom: 12px;">🔄</span>
          ${query ? 'No SVN commits found' : 'No SVN history available'}
          <div style="font-size: 11px; margin-top: 8px; color: #666;">
            SVN history appears after commits
          </div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div style="font-size: 11px; color: #888; padding: 4px 0 8px;">Found ${results.length} commit(s)</div>
      ${results.map((c: any) => `
        <div style="padding: 10px; margin-bottom: 8px; background: rgba(33, 150, 243, 0.05); border: 1px solid rgba(33, 150, 243, 0.2); border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 12px; color: #2196f3; font-weight: 600;">r${c.revision || '?'}</span>
            <span style="font-size: 10px; color: #888;">${c.author || 'Unknown'} - ${c.date || ''}</span>
          </div>
          <div style="font-size: 12px; color: #e0e0e0;">${c.message || 'No message'}</div>
        </div>
      `).join('')}
    `;
  }

  private async searchErrors(query: string): Promise<void> {
    const container = document.getElementById('errors-results-container');
    if (!container) return;
    
    const results = this.universalSearch.searchErrors(query);
    
    if (results.length === 0) {
      container.innerHTML = `
        <div class="search-empty-state" style="padding: 40px; text-align: center; color: #888;">
          <span style="font-size: 32px; display: block; margin-bottom: 12px;">✅</span>
          ${query ? 'No errors found matching your search' : 'No errors logged yet'}
          <div style="font-size: 11px; margin-top: 8px; color: #666;">
            Errors are captured automatically
          </div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div style="font-size: 11px; color: #888; padding: 4px 0 8px;">Found ${results.length} error(s)</div>
      ${results.map(e => `
        <div class="error-result-item">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 10px; color: #f44336;">❌ Error</span>
            <span style="font-size: 10px; color: #888;">${this.formatTimestamp(e.timestamp)}</span>
          </div>
          <div style="font-size: 12px; color: #e0e0e0; margin-bottom: 4px;">${e.message}</div>
          ${e.file ? `<div style="font-size: 10px; color: #888;">${e.file}${e.line ? `:${e.line}` : ''}</div>` : ''}
          ${e.solution ? `<div style="font-size: 11px; color: #4caf50; margin-top: 4px;">💡 ${e.solution}</div>` : ''}
        </div>
      `).join('')}
    `;
  }

  private async searchSnippets(query: string): Promise<void> {
    const container = document.getElementById('snippets-results-container');
    if (!container) return;
    
    const results = this.universalSearch.searchSnippets(query);
    
    if (results.length === 0) {
      container.innerHTML = `
        <div class="search-empty-state" style="padding: 40px; text-align: center; color: #888;">
          <span style="font-size: 32px; display: block; margin-bottom: 12px;">📋</span>
          ${query ? 'No snippets found' : 'No snippets saved yet'}
          <div style="font-size: 11px; margin-top: 8px; color: #666;">
            Save code snippets for quick access
          </div>
          <button onclick="window.explorerSearch?.showSaveSnippetDialog()" 
                  style="margin-top: 12px; padding: 6px 12px; background: #0e639c; color: white; border: none; border-radius: 4px; cursor: pointer;">
            + Add Snippet
          </button>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0 8px;">
        <span style="font-size: 11px; color: #888;">Found ${results.length} snippet(s)</span>
        <button onclick="window.explorerSearch?.showSaveSnippetDialog()" 
                style="padding: 4px 8px; background: #0e639c; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">
          + Add
        </button>
      </div>
      ${results.map(s => `
        <div class="snippet-result-item">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 12px; color: #e0e0e0; font-weight: 600;">${s.name}</span>
            <span style="font-size: 10px; color: #2196f3; background: rgba(33, 150, 243, 0.1); padding: 2px 6px; border-radius: 3px;">${s.language}</span>
          </div>
          <pre style="font-size: 11px; color: #b0b0b0; margin: 0; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 3px; overflow-x: auto; max-height: 100px;">${this.escapeHtml(s.code.substring(0, 200))}${s.code.length > 200 ? '...' : ''}</pre>
          <div style="display: flex; gap: 8px; margin-top: 6px;">
            <button onclick="navigator.clipboard.writeText(\`${s.code.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`); alert('Copied!')" 
                    style="padding: 3px 8px; background: transparent; border: 1px solid #555; color: #888; border-radius: 3px; cursor: pointer; font-size: 10px;">
              Copy
            </button>
            <button onclick="window.explorerSearch?.universalSearch.deleteSnippet('${s.id}'); window.explorerSearch?.searchSnippets('${query}')" 
                    style="padding: 3px 8px; background: transparent; border: 1px solid #f44336; color: #f44336; border-radius: 3px; cursor: pointer; font-size: 10px;">
              Delete
            </button>
          </div>
        </div>
      `).join('')}
    `;
  }

  // Helper methods
  private formatTimestamp(ts: number): string {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  private truncate(text: string, maxLen: number): string {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  }


  public showSaveSnippetDialog(): void {
    // Simple prompt-based snippet save for now
    const name = prompt('Snippet name:');
    if (!name) return;
    
    const language = prompt('Language (e.g., typescript, python):') || 'text';
    const code = prompt('Paste your code snippet:');
    if (!code) return;
    
    this.universalSearch.saveSnippet(name, code, language);
    this.searchSnippets('');
  }

  public cleanup(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.currentResults = [];
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

let searchSystemInstance: ExplorerSearchSystem | null = null;

export function initializeExplorerSearch(): ExplorerSearchSystem {
  if (!searchSystemInstance) {
    searchSystemInstance = new ExplorerSearchSystem();
    searchSystemInstance.initialize();
    
    // Expose globally for snippet management
    (window as any).explorerSearch = searchSystemInstance;
  }
  return searchSystemInstance;
}

export function getSearchSystem(): ExplorerSearchSystem | null {
  return searchSystemInstance;
}

// Expose UniversalSearchManager globally for other parts of the app
(window as any).UniversalSearchManager = UniversalSearchManager;

console.log('✅ Universal Search System loaded (Files, Conversations, Terminal, TODOs, SVN, Errors, Snippets)');
