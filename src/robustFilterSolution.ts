// robustFilterSolution.ts - Complete with AI Integration + Content Search

import { getCurrentApiConfigurationForced, callGenericAPI } from "./ide/aiAssistant/apiProviderManager";
import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// CONTENT SEARCH TYPES
// ============================================================================

interface ContentSearchMatch {
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

interface ContentSearchResult {
  path: string;
  matches: ContentSearchMatch[];
}

// ============================================================================
// AI SEARCH ENGINE
// ============================================================================

class AISearchEngine {
  private cache: Map<string, string[]> = new Map();

  public async searchWithAI(query: string, fileList: string[]): Promise<string[]> {
    const cacheKey = `${query}-${fileList.length}`;
    if (this.cache.has(cacheKey)) {
      console.log('[AISearch] Using cached results');
      return this.cache.get(cacheKey)!;
    }

    try {
      console.log('[AISearch] Using your configured API provider...');
      const config = getCurrentApiConfigurationForced();
      console.log(`[AISearch] Provider: ${config.provider}, Model: ${config.model}`);

      const prompt = this.buildSearchPrompt(query, fileList);
      const response = await callGenericAPI(prompt, config);
      const results = this.parseAIResponse(response, fileList);
      
      this.cache.set(cacheKey, results);
      return results;

    } catch (error) {
      console.error('[AISearch] Error:', error);
      throw error;
    }
  }

  private buildSearchPrompt(query: string, fileList: string[]): string {
    const limitedFiles = fileList.slice(0, 200);
    
    return `You are a file search assistant. Given a search query and a list of files, return ONLY the file paths that are most relevant.

Search Query: "${query}"

Available Files:
${limitedFiles.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Instructions:
- Return ONLY the file paths that match the search query
- Return one file path per line
- Do not add explanations or extra text
- Match based on file names, paths, and likely content
- Prioritize files most relevant to the query

Relevant files:`;
  }

  private parseAIResponse(responseText: string, fileList: string[]): string[] {
    const lines = responseText.split('\n');
    const results: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const cleaned = trimmed
        .replace(/^\d+\.\s*/, '')
        .replace(/^[-*]\s*/, '')
        .replace(/^>\s*/, '')
        .trim();

      const matchedFile = fileList.find(f => {
        const fLower = f.toLowerCase();
        const cleanedLower = cleaned.toLowerCase();
        return fLower.includes(cleanedLower) || 
               cleanedLower.includes(fLower) ||
               fLower.endsWith(cleanedLower) ||
               fLower === cleanedLower;
      });

      if (matchedFile && !results.includes(matchedFile)) {
        results.push(matchedFile);
      }
    }

    return results;
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public isAIAvailable(): boolean {
    try {
      const config = getCurrentApiConfigurationForced();
      return !!(config && config.apiKey && config.provider !== 'none');
    } catch {
      return false;
    }
  }

  public getProviderInfo(): { provider: string; model: string } | null {
    try {
      const config = getCurrentApiConfigurationForced();
      return {
        provider: config.provider,
        model: config.model
      };
    } catch {
      return null;
    }
  }
}

// ============================================================================
// ROBUST FILTER CLASS
// ============================================================================

export class RobustExplorerFilter {
  private viewMode: 'all' | 'no-code' | 'structure' | 'minimal' | 'code-only' | 'modified-only' = 'all';
  private searchFilter: string = '';
  private showHiddenFiles: boolean = false;
  private aiSearchMode: boolean = false;
  private aiSuggestedFiles: Set<string> = new Set();
  private controlPanelId = 'explorer-filter-controls-persistent';
  private retryCount = 0;
  private maxRetries = 50;
  private protectionInterval: NodeJS.Timer | null = null;
  private modifiedFiles: Set<string> = new Set();
  private aiEngine: AISearchEngine = new AISearchEngine();
  private fileMetadata: Map<string, { size: number; modified: Date }> = new Map();
  
  // ✅ NEW: Content Search Properties
  private contentSearchMode: boolean = false;
  private contentSearchResults: Map<string, ContentSearchMatch[]> = new Map();
  private isSearching: boolean = false;

  /**
   * ✅ Update search placeholder based on active modes
   */
  private updateSearchPlaceholder(): void {
    const searchInput = document.getElementById('explorer-search-input-persistent') as HTMLInputElement;
    const searchIcon = document.querySelector('.search-icon') as HTMLElement;
    const searchContainer = document.querySelector('.filter-search-container') as HTMLElement;
    
    if (!searchInput) return;
    
    // Determine placeholder text based on active modes
    if (this.aiSearchMode && this.contentSearchMode) {
      searchInput.placeholder = 'AI enhanced search file content';
      if (searchIcon) {
        searchIcon.innerHTML = this.ICONS.sparkle;
        searchIcon.style.color = '#4fc3f7';
      }
      if (searchContainer) {
        searchContainer.style.borderTop = '2px solid #4fc3f7';
        searchContainer.style.boxShadow = '0 -2px 8px rgba(79, 195, 247, 0.3)';
      }
    } else if (this.aiSearchMode) {
      searchInput.placeholder = 'AI enhanced search file';
      if (searchIcon) {
        searchIcon.innerHTML = this.ICONS.sparkle;
        searchIcon.style.color = '#4caf50';
      }
      if (searchContainer) {
        searchContainer.style.borderTop = '2px solid #4caf50';
        searchContainer.style.boxShadow = '0 -2px 8px rgba(76, 175, 80, 0.3)';
      }
    } else if (this.contentSearchMode) {
      searchInput.placeholder = 'AI enhanced search file content';
      if (searchIcon) {
        searchIcon.innerHTML = this.ICONS.search;
        searchIcon.style.color = '#4fc3f7';
      }
      if (searchContainer) {
        searchContainer.style.borderTop = '2px solid #4fc3f7';
        searchContainer.style.boxShadow = '0 -2px 8px rgba(79, 195, 247, 0.3)';
      }
    } else {
      searchInput.placeholder = 'Search file';
      if (searchIcon) {
        searchIcon.innerHTML = this.ICONS.search;
        searchIcon.style.color = '';
        searchIcon.style.opacity = '0.6';
      }
      if (searchContainer) {
        searchContainer.style.borderTop = 'none';
        searchContainer.style.boxShadow = 'none';
      }
    }
    
    // Update input classes for border color
    searchInput.classList.toggle('ai-mode', this.aiSearchMode);
    searchInput.classList.toggle('content-search-mode', this.contentSearchMode);
  }

  private readonly FILE_TYPES = {
    code: ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.php', '.rb', '.swift'],
    // ... rest of FILE_TYPES
    docs: ['.md', '.txt', '.pdf', '.doc', '.docx', '.rtf'],
    config: ['.json', '.yml', '.yaml', '.toml', '.ini', '.env', '.config', '.gitignore', '.service'],
    style: ['.css', '.scss', '.sass', '.less'],
    hardware: ['.ino', '.h', '.hpp']
  };

  private readonly AI_PATTERNS = {
    mainFile: ['main', 'index', 'app', 'entry', 'start'],
    ui: ['component', 'view', 'ui', 'render', 'display', 'layout', 'page', 'screen'],
    styling: ['style', 'css', 'theme', 'design', 'color', 'scss', 'sass'],
    api: ['api', 'service', 'request', 'fetch', 'http', 'axios', 'endpoint'],
    auth: ['auth', 'login', 'user', 'session', 'token', 'credential', 'password'],
    routing: ['route', 'router', 'navigation', 'link', 'path'],
    state: ['state', 'store', 'redux', 'context', 'provider', 'reducer'],
    database: ['db', 'database', 'model', 'schema', 'query', 'sql', 'mongo'],
    testing: ['test', 'spec', '__tests__', 'mock', 'jest', 'mocha'],
    config: ['config', 'setting', 'env', 'constant', 'setup'],
    utils: ['util', 'helper', 'common', 'shared', 'lib'],
    types: ['type', 'interface', 'dto', 'entity', 'model'],
    hardware: ['gpio', 'pin', 'sensor', 'motor', 'pwm', 'i2c', 'spi', 'uart', 'serial'],
    iot: ['mqtt', 'broker', 'publish', 'subscribe', 'device', 'thing', 'iot'],
    automation: ['automation', 'schedule', 'trigger', 'action', 'rule', 'scene'],
    camera: ['camera', 'picamera', 'video', 'stream', 'capture', 'image']
  };

  private readonly ICONS = {
    all: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v2H2zm0 4h12v2H2zm0 4h12v2H2z"/></svg>`,
    noCode: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M14.5 2H9L7.5 3.5h-6v10h13V2zM13 12H3V5h4.5l1.5-1.5h4V12z"/><path d="M7 7h4v1H7zm0 2h4v1H7z"/></svg>`,
    structure: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M14 4.5V14a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1h5.5L14 4.5zM13 5L8 1H3v13h10V5z"/><path d="M6 10h4v1H6z"/></svg>`,
    minimal: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4 4h8v1H4zm0 3h8v1H4zm0 3h5v1H4z"/><path d="M2 2v12h12V2H2zm11 11H3V3h10v10z"/></svg>`,
    codeOnly: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M5.854 4.146a.5.5 0 10-.708.708L7.293 7l-2.147 2.146a.5.5 0 00.708.708l2.5-2.5a.5.5 0 000-.708l-2.5-2.5z"/><path d="M9.5 7a.5.5 0 00-.5.5v4a.5.5 0 001 0v-4a.5.5 0 00-.5-.5z"/></svg>`,
    modifiedOnly: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>`,
    sparkle: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0l1.5 4.5L14 6l-4.5 1.5L8 12l-1.5-4.5L2 6l4.5-1.5L8 0z"/><path d="M12 10l.8 2.4L15 13l-2.2.6L12 16l-.8-2.4L9 13l2.2-.6L12 10z"/></svg>`,
    settings: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/></svg>`,
    hiddenOff: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3C4.5 3 1.5 6 1.5 8s3 5 6.5 5 6.5-3 6.5-5-3-5-6.5-5zm0 8c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/><circle cx="8" cy="8" r="1.5"/></svg>`,
    hiddenOn: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3C4.5 3 1.5 6 1.5 8s3 5 6.5 5 6.5-3 6.5-5-3-5-6.5-5zm0 8c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/><circle cx="8" cy="8" r="1.5"/><path d="M2 2l12 12" stroke="currentColor" stroke-width="2"/></svg>`,
    search: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"/></svg>`,
    // ✅ Content Search Icon - Document with magnifying glass (enhanced)
    contentSearch: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M14 4.5V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5L14 4.5zM13 5L8 1H3v13h10V5z" opacity="0.9"/>
      <path d="M4 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
      <path d="M4 7.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
      <path d="M4 9.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5z"/>
      <circle cx="11" cy="11" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path d="M12.5 12.5L14.5 14.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`
  };

  public init(): void {
    console.log('[RobustFilter] Starting initialization...');
    this.tryMultipleInitStrategies();
    this.setupProtectionMechanism();
    this.setupKeyboardShortcuts();
    this.hookIntoExplorerFunctions();
    this.trackModifiedFiles();
    this.setupFileContextMenu();
  }

  private tryMultipleInitStrategies(): void {
    this.insertControlPanel();
    setTimeout(() => this.insertControlPanel(), 500);
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.insertControlPanel());
    }
    
    window.addEventListener('load', () => this.insertControlPanel());
    
    const retryInterval = setInterval(() => {
      if (this.retryCount >= this.maxRetries) {
        clearInterval(retryInterval);
        return;
      }
      
      if (!document.getElementById(this.controlPanelId)) {
        this.insertControlPanel();
      } else {
        clearInterval(retryInterval);
      }
      
      this.retryCount++;
    }, 1000);
  }

  private setupProtectionMechanism(): void {
    this.protectionInterval = setInterval(() => {
      const panel = document.getElementById(this.controlPanelId);
      if (!panel) {
        this.insertControlPanel();
      }
    }, 500);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              if (element.id === this.controlPanelId || element.querySelector(`#${this.controlPanelId}`)) {
                setTimeout(() => this.insertControlPanel(), 10);
              }
            }
          });
          
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              if (element.classList.contains('file-item') || 
                  element.classList.contains('directory') ||
                  element.querySelector('.file-item, .directory')) {
                setTimeout(() => this.applyFilters(), 100);
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private trackModifiedFiles(): void {
    setInterval(() => {
      this.updateModifiedFilesList();
    }, 2000);
    
    document.addEventListener('file-saved', (e: any) => {
      const filePath = e.detail?.path;
      if (filePath) {
        this.modifiedFiles.delete(filePath);
        if (this.viewMode === 'modified-only') {
          this.applyFilters();
        }
      }
    });
    
    document.addEventListener('tab-modified', (e: any) => {
      const filePath = e.detail?.path;
      if (filePath) {
        this.modifiedFiles.add(filePath);
        if (this.viewMode === 'modified-only') {
          this.applyFilters();
        }
      }
    });
  }

  private updateModifiedFilesList(): void {
    const tabManager = (window as any).tabManager;
    if (!tabManager) return;
    
    try {
      const modifiedTabs = tabManager.getModifiedTabs?.() || [];
      const tabs = tabManager.getTabs?.() || [];
      
      this.modifiedFiles.clear();
      
      modifiedTabs.forEach((tabId: string) => {
        const tab = tabs.find((t: any) => t.id === tabId);
        if (tab && tab.path) {
          this.modifiedFiles.add(tab.path);
        }
      });
      
      tabs.forEach((tab: any) => {
        if (tab.isModified && tab.path) {
          this.modifiedFiles.add(tab.path);
        }
      });
      
    } catch (error) {
      // Silently fail
    }
  }

  private hookIntoExplorerFunctions(): void {
    const originalRenderFileTree = (window as any).renderFileTree;
    if (originalRenderFileTree) {
      (window as any).renderFileTree = (...args: any[]) => {
        const result = originalRenderFileTree.apply(this, args);
        setTimeout(() => this.insertControlPanel(), 10);
        setTimeout(() => this.applyFilters(), 200);
        return result;
      };
    }

    const folderManager = (window as any).integratedFolderManager;
    if (folderManager && folderManager.integrateIntoFilesTab) {
      const original = folderManager.integrateIntoFilesTab;
      folderManager.integrateIntoFilesTab = function(...args: any[]) {
        const result = original.apply(this, args);
        setTimeout(() => this.insertControlPanel(), 10);
        setTimeout(() => this.applyFilters(), 200);
        return result;
      };
    }

    ['loadFolder', 'openFolder', 'refreshFolder', 'updateExplorer'].forEach(funcName => {
      const original = (window as any)[funcName];
      if (original) {
        (window as any)[funcName] = (...args: any[]) => {
          const result = original.apply(window, args);
          setTimeout(() => this.insertControlPanel(), 10);
          setTimeout(() => this.applyFilters(), 200);
          return result;
        };
      }
    });
  }

  private insertControlPanel(): void {
    if (document.getElementById(this.controlPanelId)) {
      return;
    }

    const container = this.findBestContainer();
    if (!container) {
      return;
    }

    const controlPanel = document.createElement('div');
    controlPanel.id = this.controlPanelId;
    controlPanel.className = 'explorer-filter-controls-persistent';
    controlPanel.innerHTML = this.getControlPanelHTML();
    
    controlPanel.style.cssText = `
      padding: 6px !important;
      background: #252526 !important;
      border-bottom: 1px solid #3c3c3c !important;
      position: relative !important;
      z-index: 9999 !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    `;

    if (container.id === 'files-content' || container.classList.contains('tab-content')) {
      const fileTree = container.querySelector('.integrated-file-tree, .file-tree, .file-list, .file-container');
      if (fileTree) {
        container.insertBefore(controlPanel, fileTree);
      } else {
        container.insertBefore(controlPanel, container.firstChild);
      }
    } else {
      container.insertBefore(controlPanel, container.firstChild);
    }

    this.addProtectedStyles();
    this.setupControlListeners();
    
    setTimeout(() => {
      this.updateSlidingIndicator('all');
    }, 50);
    
    setTimeout(() => this.applyFilters(), 100);
  }

  private findBestContainer(): HTMLElement | null {
    const selectors = [
      '#files-content',
      '.tab-content:has(.file-item)',
      '.tab-content.active',
      '.integrated-file-tree',
      '.file-tree',
      '#file-explorer',
      '.explorer-content',
      'div:has(> .file-item)',
      'div:has(> .directory)'
    ];

    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && element.offsetParent !== null) {
          return element;
        }
      } catch (e) {
        continue;
      }
    }

    const fileItem = document.querySelector('.file-item, .directory, .integrated-file-item');
    if (fileItem) {
      let parent = fileItem.parentElement;
      while (parent) {
        if (parent.classList.contains('tab-content') || 
            parent.id === 'files-content' ||
            parent.classList.contains('file-tree')) {
          return parent as HTMLElement;
        }
        parent = parent.parentElement;
      }
    }

    return null;
  }


private addProtectedStyles(): void {
  if (document.getElementById('robust-filter-styles')) return;

  const style = document.createElement('style');
  style.id = 'robust-filter-styles';
  style.textContent = `
    /* ============================================================================ */
    /* CORE FILTER STYLES */
    /* ============================================================================ */
    
    #explorer-filter-controls-persistent {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    
    .explorer-filter-controls-persistent {
      padding: 6px !important;
      background: #252526 !important;
      border-bottom: 1px solid #3c3c3c !important;
      position: relative !important;
      z-index: 9999 !important;
    }
    
    /* ============================================================================ */
    /* SEARCH BOX STYLES */
    /* ============================================================================ */
    
    .filter-search-container {
      position: relative;
      margin-bottom: 6px;
      transition: all 0.3s ease;
    }
    
    .filter-search-box-persistent {
      width: 100% !important;
      padding: 4px 66px 4px 28px !important;
      background: #3c3c3c !important;
      color: #cccccc !important;
      border: 1px solid #3c3c3c !important;
      border-radius: 4px !important;
      font-size: 12px !important;
      height: 26px !important;
      line-height: 1 !important;
      transition: all 0.2s !important;
    }
    
    .filter-search-box-persistent:focus {
      outline: none !important;
      border-color: #007acc !important;
      background: #2d2d30 !important;
    }
    
    .filter-search-box-persistent.ai-mode {
      border-color: #8b5cf6 !important;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.12) 100%) !important;
      box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.2), inset 0 1px 2px rgba(139, 92, 246, 0.1);
    }
    
    .filter-search-box-persistent.ai-mode:focus {
      border-color: #7c3aed !important;
      box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3), inset 0 1px 2px rgba(139, 92, 246, 0.1);
    }
    
    .search-icon {
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      opacity: 0.6;
      transition: all 0.2s;
      z-index: 2;
    }
    
    /* ============================================================================ */
    /* BUTTON STYLES */
    /* ============================================================================ */
    
    .ai-settings-btn,
    /* ============================================================================ */
    /* SEARCH TOGGLE BUTTONS - Clean Style */
    /* ============================================================================ */
    
    .ai-search-toggle-btn,
    .content-search-toggle-btn {
      transition: all 0.15s ease !important;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    
    .ai-search-toggle-btn:hover,
    .content-search-toggle-btn:hover {
      background: rgba(255, 255, 255, 0.08) !important;
      color: #aaa !important;
    }
    
    /* AI Search Toggle - Green when active */
    .ai-search-toggle-btn.active {
      background: rgba(76, 175, 80, 0.15) !important;
      border: 1px solid rgba(76, 175, 80, 0.5) !important;
      color: #69f0ae !important;
    }
    
    .ai-search-toggle-btn.active:hover {
      background: rgba(76, 175, 80, 0.25) !important;
    }
    
    /* Content Search Toggle - Cyan when active */
    .content-search-toggle-btn.active {
      background: rgba(79, 195, 247, 0.15) !important;
      border: 1px solid rgba(79, 195, 247, 0.5) !important;
      color: #4fc3f7 !important;
    }
    
    .content-search-toggle-btn.active:hover {
      background: rgba(79, 195, 247, 0.25) !important;
    }
    
    /* Search input border states */
    .filter-search-box-persistent:focus {
      border-color: #4fc3f7 !important;
      outline: none !important;
    }
    
    /* AI mode - green border */
    .filter-search-box-persistent.ai-mode {
      border-color: #4caf50 !important;
    }
    
    /* Content mode - cyan border */
    .filter-search-box-persistent.content-search-mode {
      border-color: #4fc3f7 !important;
    }
    
    /* Both modes active - cyan border with green shadow */
    .filter-search-box-persistent.ai-mode.content-search-mode {
      border-color: #4fc3f7 !important;
      box-shadow: 0 0 0 1px rgba(76, 175, 80, 0.3) !important;
    }
    
    #content-search-results-panel {
      animation: slideDown 0.2s ease-out;
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    #content-search-results-panel::-webkit-scrollbar {
      width: 8px;
    }
    
    #content-search-results-panel::-webkit-scrollbar-track {
      background: #1e1e1e;
    }
    
    #content-search-results-panel::-webkit-scrollbar-thumb {
      background: #3c3c3c;
      border-radius: 4px;
    }
    
    #content-search-results-panel::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
    
    /* Content Search Line Highlight */
    .content-search-highlight-line {
      background: rgba(255, 213, 0, 0.2) !important;
      border-left: 3px solid #ffd500 !important;
    }
    
    .content-search-glyph {
      background: #ffd500;
      width: 4px !important;
    }
    
    /* ============================================================================ */
    /* AI ENHANCED SEARCH STYLES */
    /* ============================================================================ */
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .ai-loading-spinner {
      animation: spin 0.8s linear infinite;
    }
    
    #ai-enhance-search-btn:hover {
      background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%) !important;
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5) !important;
    }
    
    .ai-keyword-suggestion:hover {
      background: rgba(139, 92, 246, 0.4) !important;
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
    }
    
    /* ============================================================================ */
    /* VIEW MODE BUTTONS */
    /* ============================================================================ */
    
    .view-mode-row-compact {
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
    }
    
    .view-mode-buttons-persistent {
      display: flex !important;
      gap: 2px !important;
      flex: 1 !important;
      background: rgba(0,0,0,0.2) !important;
      border-radius: 4px !important;
      padding: 2px !important;
      position: relative !important;
    }
    
    .sliding-indicator {
      position: absolute !important;
      top: 2px !important;
      bottom: 2px !important;
      background: #0e639c !important;
      border-radius: 3px !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      z-index: 0 !important;
    }
    
    .view-mode-btn-persistent {
      flex: 1 !important;
      padding: 3px 6px !important;
      border: 1px solid transparent !important;
      border-radius: 3px !important;
      cursor: pointer !important;
      font-size: 11px !important;
      height: 24px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 3px !important;
      min-width: 0 !important;
      font-weight: 500 !important;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      position: relative !important;
      z-index: 1 !important;
      background: transparent !important;
      color: #999999 !important;
    }
    
    .view-mode-btn-persistent:not(.standalone-btn):hover {
      color: #cccccc !important;
    }
    
    .view-mode-btn-persistent.active {
      color: #ffffff !important;
      background: transparent !important;
    }
    
    .view-mode-btn-persistent svg {
      width: 12px !important;
      height: 12px !important;
      flex-shrink: 0 !important;
    }
    
    .view-mode-btn-persistent .btn-text {
      font-size: 10px !important;
    }
    
    .standalone-btn {
      background: rgba(255,255,255,0.05) !important;
      border: 1px solid #3c3c3c !important;
    }
    
    .standalone-btn:hover {
      background: rgba(255,255,255,0.1) !important;
      border-color: #464647 !important;
    }
    
    .standalone-btn.active {
      background: #0e639c !important;
      border-color: #0e639c !important;
    }
    
    #modified-toggle-persistent.active {
      background: #f59e0b !important;
      border-color: #f59e0b !important;
    }
    
    /* ============================================================================ */
    /* STATUS BAR */
    /* ============================================================================ */
    
    .bottom-row-compact {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-top: 4px !important;
    }
    
    .filter-status-persistent {
      font-size: 10px !important;
      color: #888 !important;
      flex: 1 !important;
    }
    
    .file-count-persistent {
      font-size: 10px !important;
      color: #888 !important;
    }
    
    /* ============================================================================ */
    /* FILE ITEM STYLES */
    /* ============================================================================ */
    
    body .file-item.filter-hidden,
    body .directory.filter-hidden,
    body .integrated-file-item.filter-hidden,
    body .integrated-folder-header.filter-hidden {
      display: none !important;
    }
    
    .file-item.ai-suggested {
      background: rgba(139, 92, 246, 0.15) !important;
      border-left: 2px solid #8b5cf6 !important;
      padding-left: 6px !important;
    }
    
    .file-item.ai-suggested .file-name::before {
      content: "✨ ";
      color: #8b5cf6;
      font-size: 10px;
    }
    
    .file-item.is-modified .file-name::after {
      content: "●";
      color: #f59e0b;
      margin-left: 6px;
      font-size: 12px;
    }
    
    /* ============================================================================ */
    /* NOTIFICATION STYLES */
    /* ============================================================================ */
    
    .filter-notification {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #1e1e1e 0%, #2d2d30 100%);
      color: #ffffff;
      padding: 8px 12px;
      border: 1px solid #464647;
      border-radius: 4px;
      animation: notificationSlideIn 0.3s;
      z-index: 10000;
      font-size: 11px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    
    @keyframes notificationSlideIn {
      from {
        opacity: 0;
        transform: translateX(100px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    .filter-notification.success {
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.1));
      border-color: #4caf50;
      color: #4caf50;
      animation: notificationSlideIn 0.3s ease-out, successPulse 0.5s ease-out;
    }
    
    @keyframes successPulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }
    
    .filter-notification.warning {
      background: linear-gradient(135deg, rgba(255, 152, 0, 0.2), rgba(255, 152, 0, 0.1));
      border-color: #ff9800;
      color: #ff9800;
    }
    
    /* ============================================================================ */
    /* 🌊 WAVE ANIMATION STYLES */
    /* ============================================================================ */
    
    .search-wave-wrapper {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
    }
    
    .wave-ring {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border: 2px solid #8b5cf6;
      border-radius: 8px;
      opacity: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    
    .ai-searching .wave-ring {
      animation: waveExpand 2s ease-out infinite;
    }
    
    .wave-ring-1 {
      animation-delay: 0s !important;
    }
    
    .wave-ring-2 {
      animation-delay: 0.4s !important;
    }
    
    .wave-ring-3 {
      animation-delay: 0.8s !important;
    }
    
    @keyframes waveExpand {
      0% {
        width: 100%;
        height: 100%;
        opacity: 0.8;
        border-width: 2px;
      }
      50% {
        opacity: 0.4;
        border-width: 1px;
      }
      100% {
        width: 140%;
        height: 200%;
        opacity: 0;
        border-width: 0px;
      }
    }
    
    /* Search icon pulse animation */
    .searching-pulse {
      animation: iconPulse 1.5s ease-in-out infinite;
    }
    
    @keyframes iconPulse {
      0%, 100% {
        transform: translateY(-50%) scale(1);
        opacity: 0.6;
      }
      50% {
        transform: translateY(-50%) scale(1.2);
        opacity: 1;
        filter: drop-shadow(0 0 8px #8b5cf6);
      }
    }
    
    /* Input shimmer effect */
    .searching-shimmer {
      position: relative;
      overflow: hidden;
    }
    
    .searching-shimmer::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(139, 92, 246, 0.3),
        transparent
      );
      animation: shimmer 2s infinite;
      pointer-events: none;
      z-index: 1;
    }
    
    @keyframes shimmer {
      0% {
        left: -100%;
      }
      100% {
        left: 100%;
      }
    }
    
    /* Enhanced glow for search container when searching */
    .ai-searching {
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
      animation: containerGlow 2s ease-in-out infinite;
    }
    
    @keyframes containerGlow {
      0%, 100% {
        box-shadow: 0 0 15px rgba(139, 92, 246, 0.2);
      }
      50% {
        box-shadow: 0 0 30px rgba(139, 92, 246, 0.5);
      }
    }
    
    /* Sparkle icon enhanced animation during search */
    .ai-searching .ai-search-toggle-btn.active svg {
      animation: sparkleSearching 1s ease-in-out infinite !important;
    }
    
    @keyframes sparkleSearching {
      0%, 100% {
        transform: scale(1) rotate(0deg);
        filter: brightness(1) drop-shadow(0 0 4px #8b5cf6);
      }
      25% {
        transform: scale(1.3) rotate(90deg);
        filter: brightness(1.5) drop-shadow(0 0 8px #8b5cf6);
      }
      50% {
        transform: scale(1) rotate(180deg);
        filter: brightness(1) drop-shadow(0 0 4px #8b5cf6);
      }
      75% {
        transform: scale(1.3) rotate(270deg);
        filter: brightness(1.5) drop-shadow(0 0 8px #8b5cf6);
      }
    }
    /* Add to the end of styles before closing */

/* ============================================================================ */
/* AI ANALYSIS CONTEXT MENU */
/* ============================================================================ */

.ai-analysis-menu {
  animation: menuSlideIn 0.2s ease-out;
}

@keyframes menuSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-5px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.menu-header {
  user-select: none;
}

.menu-item {
  user-select: none;
}

.menu-item:active {
  transform: scale(0.98);
}
    /* Particle effect */
    .search-wave-wrapper::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, #8b5cf6 1px, transparent 1px);
      background-size: 20px 20px;
      opacity: 0;
      animation: particles 3s ease-in-out infinite;
      pointer-events: none;
    }
    
    @keyframes particles {
      0%, 100% {
        opacity: 0;
        transform: translateY(0);
      }
      50% {
        opacity: 0.3;
        transform: translateY(-10px);
      }
    }
    .smart-filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.smart-filter-btn {
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  padding: 4px 8px !important;
  background: rgba(139, 92, 246, 0.1) !important;
  border: 1px solid rgba(139, 92, 246, 0.3) !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  font-size: 10px !important;
  color: #ccc !important;
  transition: all 0.2s !important;
  white-space: nowrap !important;
}

.smart-filter-btn:hover {
  background: rgba(139, 92, 246, 0.2) !important;
  border-color: rgba(139, 92, 246, 0.5) !important;
  color: #fff !important;
  transform: translateY(-1px);
}

.smart-filter-btn:active {
  transform: translateY(0);
}

.smart-filter-btn svg {
  flex-shrink: 0;
}
    /* ============================================================================ */
    /* RESPONSIVE STYLES */
    /* ============================================================================ */
    
    @media (max-width: 350px) {
      .view-mode-btn-persistent .btn-text {
        display: none !important;
      }
      .view-mode-btn-persistent {
        padding: 3px 4px !important;
      }
    }
  `;
  document.head.appendChild(style);
}

private setupControlListeners(): void {
  const searchInput = document.getElementById('explorer-search-input-persistent') as HTMLInputElement;
  let contentSearchTimeout: ReturnType<typeof setTimeout> | null = null;
  
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      this.searchFilter = (e.target as HTMLInputElement).value.toLowerCase();
      
      // ✅ Handle Content Search Mode
      if (this.contentSearchMode) {
        // Debounce content search (wait 300ms after typing stops)
        if (contentSearchTimeout) clearTimeout(contentSearchTimeout);
        contentSearchTimeout = setTimeout(() => {
          if (this.searchFilter.length >= 2) {
            this.performContentSearch(this.searchFilter);
          } else {
            this.contentSearchResults.clear();
            this.hideContentSearchResults();
          }
        }, 300);
        return;
      }
      
      // Normal/AI search mode
      if (this.aiSearchMode && this.searchFilter.length > 2) {
        this.performAISearch(this.searchFilter);
      } else {
        this.aiSuggestedFiles.clear();
        this.applyFilters();
      }
    });
    
    // ✅ Add keyboard shortcut for content search
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.contentSearchMode && this.searchFilter.length >= 2) {
        e.preventDefault();
        this.performContentSearch(this.searchFilter);
      }
    });
  }

  const aiSearchToggle = document.getElementById('ai-search-toggle');
if (aiSearchToggle && searchInput) {
  aiSearchToggle.addEventListener('click', () => {
    if (!this.aiEngine.isAIAvailable()) {
      this.showNotification('⚙️ Configure API first (click settings)', 'warning');
      return;
    }
    
    this.aiSearchMode = !this.aiSearchMode;
    aiSearchToggle.classList.toggle('active', this.aiSearchMode);
    
    // ✅ AUTO-CLEAR search input when toggle is clicked
    searchInput.value = '';
    this.searchFilter = '';
    this.aiSuggestedFiles.clear();
    
    // ✅ Update button appearance (green ON, grey OFF)
    if (this.aiSearchMode) {
      (aiSearchToggle as HTMLElement).style.background = 'rgba(76, 175, 80, 0.15)';
      (aiSearchToggle as HTMLElement).style.borderColor = 'rgba(76, 175, 80, 0.5)';
      (aiSearchToggle as HTMLElement).style.color = '#69f0ae';
    } else {
      (aiSearchToggle as HTMLElement).style.background = 'transparent';
      (aiSearchToggle as HTMLElement).style.borderColor = 'transparent';
      (aiSearchToggle as HTMLElement).style.color = '#666';
    }
    
    // ✅ Update placeholder based on both toggle states
    this.updateSearchPlaceholder();
    
    // ✅ SYNC WITH localStorage for aiFileExplorer.ts
    localStorage.setItem('aiFileExplorerEnabled', this.aiSearchMode.toString());
    (window as any).aiFileExplorerEnabled = this.aiSearchMode;
    
    // Show/hide smart filters
    const smartFiltersRow = document.getElementById('smart-filters-row');
    if (smartFiltersRow) {
      smartFiltersRow.style.display = this.aiSearchMode ? 'flex' : 'none';
    }
    
    // ✅ Notify aiFileExplorer system via custom event
    window.dispatchEvent(new CustomEvent('aiSearchToggled', { 
      detail: { enabled: this.aiSearchMode } 
    }));
    
    // ✅ Update project folder animation if function exists
    if ((window as any).updateProjectFolderAnimation) {
      (window as any).updateProjectFolderAnimation(this.aiSearchMode);
    }
    
    const providerInfo = this.aiEngine.getProviderInfo();
    const providerName = providerInfo ? providerInfo.provider : 'Unknown';
    
    this.showNotification(this.aiSearchMode ? `✨ AI ON (${providerName})` : 'Normal search');
    
    // ✅ Reset file tree to show all files
    this.applyFilters();
  });
  
  // ✅ RESTORE STATE FROM localStorage ON LOAD
  const savedState = localStorage.getItem('aiFileExplorerEnabled') === 'true';
  if (savedState && this.aiEngine.isAIAvailable()) {
    this.aiSearchMode = true;
    aiSearchToggle.classList.add('active');
    
    // Update button appearance
    (aiSearchToggle as HTMLElement).style.background = 'rgba(76, 175, 80, 0.15)';
    (aiSearchToggle as HTMLElement).style.borderColor = 'rgba(76, 175, 80, 0.5)';
    (aiSearchToggle as HTMLElement).style.color = '#69f0ae';
    
    // Show smart filters
    const smartFiltersRow = document.getElementById('smart-filters-row');
    if (smartFiltersRow) {
      smartFiltersRow.style.display = 'flex';
    }
    
    // ✅ Update placeholder based on both toggle states
    this.updateSearchPlaceholder();
    
    console.log('[RobustFilter] ✅ Restored AI Search state from localStorage: ON');
  }
}

  const viewButtons = document.querySelectorAll('.view-mode-btn-persistent[data-mode]');
  viewButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest('.view-mode-btn-persistent') as HTMLElement;
      const mode = button?.getAttribute('data-mode');
      if (mode && button) {
        this.setViewMode(mode as any);
      }
    });
  });

  const hiddenToggle = document.getElementById('hidden-toggle-persistent');
  if (hiddenToggle) {
    hiddenToggle.addEventListener('click', () => {
      this.showHiddenFiles = !this.showHiddenFiles;
      hiddenToggle.innerHTML = this.showHiddenFiles ? this.ICONS.hiddenOn : this.ICONS.hiddenOff;
      hiddenToggle.classList.toggle('active', this.showHiddenFiles);
      this.applyFilters();
    });
  }
  
  // Setup smart filter buttons
  this.setupSmartFilters();
  
  // ✅ NEW: Setup Content Search Toggle
  this.setupContentSearchToggle();
}

// ============================================================================
// CONTENT SEARCH MODE
// ============================================================================

private setupContentSearchToggle(): void {
  const contentToggle = document.getElementById('content-search-toggle');
  const searchInput = document.getElementById('explorer-search-input-persistent') as HTMLInputElement;
  
  if (contentToggle && searchInput) {
    contentToggle.addEventListener('click', () => {
      this.contentSearchMode = !this.contentSearchMode;
      contentToggle.classList.toggle('active', this.contentSearchMode);
      
      // ✅ AUTO-CLEAR search input when toggle is clicked
      searchInput.value = '';
      this.searchFilter = '';
      this.contentSearchResults.clear();
      this.hideContentSearchResults();
      
      // Update button appearance
      if (this.contentSearchMode) {
        (contentToggle as HTMLElement).style.background = 'rgba(79, 195, 247, 0.15)';
        (contentToggle as HTMLElement).style.borderColor = 'rgba(79, 195, 247, 0.5)';
        (contentToggle as HTMLElement).style.color = '#4fc3f7';
      } else {
        (contentToggle as HTMLElement).style.background = 'transparent';
        (contentToggle as HTMLElement).style.borderColor = 'transparent';
        (contentToggle as HTMLElement).style.color = '#666';
      }
      
      // ✅ Update placeholder based on both toggle states
      this.updateSearchPlaceholder();
      
      // ✅ Reset file tree to show all files
      this.applyFilters();
      
      this.showNotification(this.contentSearchMode ? '📝 Content Search: ON' : '📄 Filename Search');
    });
  }
}

private async performContentSearch(query: string): Promise<void> {
  if (!query || query.length < 2) {
    this.contentSearchResults.clear();
    this.hideContentSearchResults();
    return;
  }
  
  this.isSearching = true;
  this.startSearchWaveAnimation();
  this.showNotification('🔍 Searching file contents...');
  
  try {
    // Get project path
    const projectPath = this.getProjectPath();
    if (!projectPath) {
      this.showNotification('⚠️ No project open', 'warning');
      this.isSearching = false;
      this.stopSearchWaveAnimation();
      return;
    }
    
    // Try Tauri invoke first
    let results: ContentSearchResult[] = [];
    
    try {
      results = await invoke('search_file_contents', {
        path: projectPath,
        query: query,
        maxResults: 50,
        caseSensitive: false
      }) as ContentSearchResult[];
    } catch (tauriError) {
      console.log('[ContentSearch] Tauri not available, using JS fallback');
      results = await this.performContentSearchFallback(query);
    }
    
    this.stopSearchWaveAnimation();
    this.isSearching = false;
    
    if (results.length > 0) {
      // Store results
      this.contentSearchResults.clear();
      results.forEach(r => {
        this.contentSearchResults.set(r.path, r.matches);
      });
      
      // Show results panel
      this.showContentSearchResults(results, query);
      this.showNotification(`📝 Found ${results.length} files with matches`, 'success');
    } else {
      this.contentSearchResults.clear();
      this.showContentSearchResults([], query);
      this.showNotification('No matches found in file contents');
    }
    
  } catch (error) {
    console.error('[ContentSearch] Error:', error);
    this.stopSearchWaveAnimation();
    this.isSearching = false;
    this.showNotification('❌ Content search failed', 'warning');
  }
}

private async performContentSearchFallback(query: string): Promise<ContentSearchResult[]> {
  const results: ContentSearchResult[] = [];
  const allFiles = this.getAllFilePaths();
  const queryLower = query.toLowerCase();
  
  // Only search text files
  const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.java', '.c', '.cpp', '.h', '.cs', '.rb', '.php', '.html', '.css', '.scss', '.json', '.yaml', '.yml', '.md', '.txt', '.xml', '.toml', '.ini', '.env', '.sh', '.bat'];
  
  const textFiles = allFiles.filter(f => {
    const ext = this.getFileExtension(f);
    return textExtensions.includes(ext);
  }).slice(0, 100); // Limit to 100 files for performance
  
  for (const filePath of textFiles) {
    try {
      const content = await invoke('read_file_content', { path: filePath }) as string;
      const lines = content.split('\n');
      const matches: ContentSearchMatch[] = [];
      
      lines.forEach((line, index) => {
        const lineLower = line.toLowerCase();
        let matchIndex = lineLower.indexOf(queryLower);
        
        while (matchIndex !== -1) {
          matches.push({
            lineNumber: index + 1,
            lineContent: line.substring(0, 200), // Truncate long lines
            matchStart: matchIndex,
            matchEnd: matchIndex + query.length
          });
          matchIndex = lineLower.indexOf(queryLower, matchIndex + 1);
        }
      });
      
      if (matches.length > 0) {
        results.push({
          path: filePath,
          matches: matches.slice(0, 10) // Max 10 matches per file
        });
      }
      
      if (results.length >= 50) break; // Max 50 files
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  return results;
}

private getProjectPath(): string | null {
  // ✅ FIX: Check multiple sources in priority order
  
  // 1. Check window.currentProjectPath first (set by fileLoader/fileExplorer)
  if ((window as any).currentProjectPath) {
    return (window as any).currentProjectPath;
  }
  
  // 2. Check localStorage and sync to window if found
  const localStoragePath = localStorage.getItem('currentProjectPath');
  if (localStoragePath) {
    (window as any).currentProjectPath = localStoragePath;
    return localStoragePath;
  }
  
  // 3. Check __lastProject (another storage location)
  if ((window as any).__lastProject?.path) {
    const path = (window as any).__lastProject.path;
    (window as any).currentProjectPath = path;
    return path;
  }
  
  // 4. Try to extract from file tree DOM with multiple selectors
  const fileTreeSelectors = [
    '.file-tree [data-path]',
    '#file-tree [data-path]',
    '.integrated-file-tree [data-path]',
    '#files-content [data-path]',
    '.file-item[data-path]',
    '.directory[data-path]',
    '[data-path]'
  ];
  
  for (const selector of fileTreeSelectors) {
    const firstFile = document.querySelector(selector);
    if (firstFile) {
      const filePath = firstFile.getAttribute('data-path') || '';
      if (filePath) {
        const parts = filePath.split(/[/\\]/);
        let projectPath = '';
        
        // Find project root (before common source directories)
        for (let i = parts.length - 1; i >= 0; i--) {
          if (['src', 'lib', 'app', 'public', 'node_modules', 'dist', 'build'].includes(parts[i])) {
            projectPath = parts.slice(0, i).join(filePath.includes('/') ? '/' : '\\');
            break;
          }
        }
        
        // If no common dir found, use parent of the file
        if (!projectPath && parts.length > 1) {
          projectPath = parts.slice(0, -1).join(filePath.includes('/') ? '/' : '\\');
        }
        
        if (projectPath) {
          // Sync to window and localStorage for future calls
          (window as any).currentProjectPath = projectPath;
          localStorage.setItem('currentProjectPath', projectPath);
          (window as any).__lastProject = { path: projectPath, name: projectPath.split(/[/\\]/).pop() };
          console.log('🔄 [getProjectPath] Auto-synced from DOM:', projectPath);
          return projectPath;
        }
      }
    }
  }
  
  return null;
}

private showContentSearchResults(results: ContentSearchResult[], query: string): void {
  // Remove existing results panel
  this.hideContentSearchResults();
  
  const controlPanel = document.getElementById(this.controlPanelId);
  if (!controlPanel) return;
  
  const resultsPanel = document.createElement('div');
  resultsPanel.id = 'content-search-results-panel';
  resultsPanel.style.cssText = `
    background: #252526;
    border: 1px solid #3c3c3c;
    border-radius: 6px;
    margin-top: 6px;
    max-height: 400px;
    overflow-y: auto;
    font-size: 12px;
  `;
  
  if (results.length === 0) {
    // Check if query looks like a problem description
    const isProblemQuery = this.looksLikeProblemDescription(query);
    
    resultsPanel.innerHTML = `
      <div style="padding: 16px; text-align: center; color: #666;">
        <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor" style="opacity: 0.5; margin-bottom: 8px;">
          <path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"/>
        </svg>
        <div style="margin-bottom: 12px;">No matches found for "<strong>${this.escapeHtml(query)}</strong>"</div>
        
        <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
          <!-- AI Enhanced Search Button -->
          <button id="ai-enhance-search-btn" style="
            background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
            border: none;
            border-radius: 6px;
            padding: 8px 16px;
            color: white;
            font-size: 12px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
          ">
            <span style="font-size: 14px;">✨</span>
            AI Search Help
          </button>
          
          ${isProblemQuery ? `
          <!-- AI Problem Diagnostic Button -->
          <button id="ai-diagnose-btn" style="
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            border: none;
            border-radius: 6px;
            padding: 8px 16px;
            color: white;
            font-size: 12px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
          ">
            <span style="font-size: 14px;">🔧</span>
            Diagnose Problem
          </button>
          ` : ''}
        </div>
        
        <div id="ai-search-suggestions" style="margin-top: 12px; display: none;"></div>
        <div id="ai-diagnose-results" style="margin-top: 12px; display: none;"></div>
      </div>
    `;
    
    // Add button handlers
    setTimeout(() => {
      const aiBtn = document.getElementById('ai-enhance-search-btn');
      if (aiBtn) {
        aiBtn.addEventListener('click', () => this.performAIEnhancedSearch(query));
        this.addButtonHoverEffect(aiBtn, 'rgba(139, 92, 246, 0.5)');
      }
      
      const diagnoseBtn = document.getElementById('ai-diagnose-btn');
      if (diagnoseBtn) {
        diagnoseBtn.addEventListener('click', () => this.performAIDiagnosis(query));
        this.addButtonHoverEffect(diagnoseBtn, 'rgba(245, 158, 11, 0.5)');
      }
    }, 50);
  } else {
    const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
    
    resultsPanel.innerHTML = `
      <div style="padding: 8px 12px; border-bottom: 1px solid #3c3c3c; display: flex; justify-content: space-between; align-items: center; background: #2d2d2d;">
        <span style="color: #58a6ff; font-weight: 500;">📝 Content Search Results</span>
        <span style="color: #666; font-size: 11px;">${totalMatches} matches in ${results.length} files</span>
      </div>
      <div class="content-search-results-list">
        ${results.map(result => this.renderContentSearchResult(result, query)).join('')}
      </div>
    `;
    
    // Add click handlers
    setTimeout(() => {
      resultsPanel.querySelectorAll('.content-search-file').forEach(fileEl => {
        fileEl.addEventListener('click', () => {
          const path = fileEl.getAttribute('data-path');
          if (path) {
            this.openFileAtLine(path, 1);
          }
        });
      });
      
      resultsPanel.querySelectorAll('.content-search-match').forEach(matchEl => {
        matchEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const path = matchEl.getAttribute('data-path');
          const line = parseInt(matchEl.getAttribute('data-line') || '1');
          if (path) {
            this.openFileAtLine(path, line);
          }
        });
      });
    }, 100);
  }
  
  controlPanel.appendChild(resultsPanel);
}

/**
 * Add hover effect to buttons
 */
private addButtonHoverEffect(btn: HTMLElement, shadowColor: string): void {
  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.05)';
    btn.style.boxShadow = `0 4px 12px ${shadowColor}`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
    btn.style.boxShadow = btn.style.boxShadow.replace('12px', '8px');
  });
}

/**
 * Check if query looks like a problem description
 */
private looksLikeProblemDescription(query: string): boolean {
  const problemKeywords = [
    'error', 'issue', 'problem', 'bug', 'fail', 'broken', 'crash',
    'not working', 'unable', 'cannot', 'can\'t', 'won\'t', 'doesn\'t',
    'slow', 'freeze', 'stuck', 'blank', 'empty', 'missing',
    'wrong', 'incorrect', 'unexpected', 'strange', 'weird',
    'recent', 'update', 'change', 'after', 'since', 'suddenly',
    'graphic', 'display', 'render', 'style', 'layout', 'ui',
    'run', 'start', 'load', 'build', 'compile', 'import'
  ];
  
  const queryLower = query.toLowerCase();
  return problemKeywords.some(keyword => queryLower.includes(keyword));
}

/**
 * AI Problem Diagnosis - Analyze problem description and find relevant files
 */
private async performAIDiagnosis(problemDescription: string): Promise<void> {
  const resultsDiv = document.getElementById('ai-diagnose-results');
  const diagnoseBtn = document.getElementById('ai-diagnose-btn');
  
  if (!resultsDiv || !diagnoseBtn) return;
  
  // Show loading state
  diagnoseBtn.innerHTML = `
    <span class="ai-loading-spinner" style="
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    "></span>
    Analyzing...
  `;
  diagnoseBtn.style.opacity = '0.8';
  diagnoseBtn.style.pointerEvents = 'none';
  
  try {
    // Get all files for analysis
    const allFiles = this.getAllFilePaths();
    const recentFiles = await this.getRecentlyModifiedFiles();
    
    // Analyze the problem and find relevant files
    const diagnosis = await this.analyzeProblem(problemDescription, allFiles, recentFiles);
    
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = this.renderDiagnosisResults(diagnosis, problemDescription);
    
    // Add click handlers for file suggestions
    setTimeout(() => {
      resultsDiv.querySelectorAll('.diagnosis-file-item').forEach(item => {
        item.addEventListener('click', () => {
          const path = item.getAttribute('data-path');
          if (path) {
            this.openFileAtLine(path, 1);
          }
        });
        
        item.addEventListener('mouseenter', () => {
          (item as HTMLElement).style.background = 'rgba(245, 158, 11, 0.15)';
        });
        item.addEventListener('mouseleave', () => {
          (item as HTMLElement).style.background = 'rgba(245, 158, 11, 0.05)';
        });
      });
    }, 100);
    
    // Reset button
    diagnoseBtn.innerHTML = `<span style="font-size: 14px;">🔧</span> Diagnose Problem`;
    diagnoseBtn.style.opacity = '1';
    diagnoseBtn.style.pointerEvents = 'auto';
    
  } catch (error) {
    console.error('[AI Diagnosis] Error:', error);
    diagnoseBtn.innerHTML = `<span style="font-size: 14px;">🔧</span> Diagnose Problem`;
    diagnoseBtn.style.opacity = '1';
    diagnoseBtn.style.pointerEvents = 'auto';
    
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `
      <div style="color: #f87171; font-size: 11px; padding: 8px;">
        Diagnosis failed. Try describing the problem differently.
      </div>
    `;
  }
}

/**
 * Analyze problem and find potentially related files
 */
private async analyzeProblem(
  problem: string, 
  allFiles: string[], 
  recentFiles: { path: string; modified: Date }[]
): Promise<{
  understanding: string;
  category: string;
  suggestedFiles: { path: string; reason: string; confidence: 'high' | 'medium' | 'low' }[];
  recentlyModified: { path: string; modified: Date }[];
  searchTerms: string[];
}> {
  
  const providerInfo = this.aiEngine.getProviderInfo();
  
  // Try AI analysis if available
  if (providerInfo && providerInfo.apiKey) {
    try {
      const fileList = allFiles.slice(0, 100).join('\n');
      const recentList = recentFiles.slice(0, 20).map(f => f.path).join('\n');
      
      const prompt = `You are a debugging assistant. Analyze this problem description and identify which files might be causing the issue.

Problem: "${problem}"

Project files (sample):
${fileList}

Recently modified files:
${recentList}

Based on the problem description, identify:
1. What type of issue this is (runtime, build, UI, styling, data, etc.)
2. Which specific files are most likely related to this problem
3. Why each file might be relevant

Respond in this exact JSON format only:
{
  "understanding": "Brief explanation of the problem",
  "category": "runtime|build|ui|styling|data|config|dependency|other",
  "suggestedFiles": [
    {"path": "filepath", "reason": "why this file", "confidence": "high|medium|low"}
  ],
  "searchTerms": ["term1", "term2"]
}`;

      const response = await this.aiEngine.generateResponse(prompt, {
        maxTokens: 800,
        temperature: 0.3
      });
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          understanding: parsed.understanding || '',
          category: parsed.category || 'other',
          suggestedFiles: (parsed.suggestedFiles || []).filter((f: any) => 
            allFiles.some(af => af.includes(f.path.split(/[/\\]/).pop() || ''))
          ),
          recentlyModified: recentFiles.slice(0, 5),
          searchTerms: parsed.searchTerms || []
        };
      }
    } catch (error) {
      console.log('[AI Diagnosis] AI error, using fallback:', error);
    }
  }
  
  // Fallback: Rule-based analysis
  return this.analyzeProblemFallback(problem, allFiles, recentFiles);
}

/**
 * Fallback problem analysis without AI
 */
private analyzeProblemFallback(
  problem: string,
  allFiles: string[],
  recentFiles: { path: string; modified: Date }[]
): {
  understanding: string;
  category: string;
  suggestedFiles: { path: string; reason: string; confidence: 'high' | 'medium' | 'low' }[];
  recentlyModified: { path: string; modified: Date }[];
  searchTerms: string[];
} {
  const problemLower = problem.toLowerCase();
  const suggestedFiles: { path: string; reason: string; confidence: 'high' | 'medium' | 'low' }[] = [];
  let category = 'other';
  let understanding = '';
  const searchTerms: string[] = [];
  
  // Problem category detection
  const categoryPatterns: { [key: string]: { keywords: string[], filePatterns: string[], understanding: string, terms: string[] } } = {
    'runtime': {
      keywords: ['run', 'start', 'launch', 'execute', 'unable to run', 'won\'t start', 'crash', 'error'],
      filePatterns: ['main.', 'index.', 'app.', 'entry', 'bootstrap', 'package.json', 'tsconfig', 'vite.config', 'webpack'],
      understanding: 'Application startup or runtime issue',
      terms: ['main', 'entry', 'bootstrap', 'init']
    },
    'build': {
      keywords: ['build', 'compile', 'transpile', 'bundle', 'webpack', 'vite', 'typescript'],
      filePatterns: ['tsconfig', 'package.json', 'webpack', 'vite.config', 'babel', 'rollup', '.config.'],
      understanding: 'Build or compilation issue',
      terms: ['config', 'build', 'compile', 'module']
    },
    'ui': {
      keywords: ['display', 'render', 'show', 'visible', 'appear', 'blank', 'empty', 'component', 'graphic'],
      filePatterns: ['.tsx', '.jsx', 'component', 'page', 'view', 'screen', 'layout', 'App.', 'render'],
      understanding: 'UI rendering or display issue',
      terms: ['render', 'component', 'return', 'jsx']
    },
    'styling': {
      keywords: ['style', 'css', 'layout', 'position', 'color', 'font', 'margin', 'padding', 'graphic'],
      filePatterns: ['.css', '.scss', '.sass', '.less', 'style', 'theme', 'tailwind'],
      understanding: 'Styling or CSS issue',
      terms: ['style', 'className', 'css', 'theme']
    },
    'data': {
      keywords: ['data', 'fetch', 'api', 'request', 'response', 'load', 'undefined', 'null'],
      filePatterns: ['api', 'service', 'fetch', 'http', 'axios', 'store', 'redux', 'context'],
      understanding: 'Data fetching or state issue',
      terms: ['fetch', 'data', 'state', 'api']
    },
    'import': {
      keywords: ['import', 'require', 'module', 'dependency', 'package', 'not found'],
      filePatterns: ['package.json', 'node_modules', 'import', 'index.'],
      understanding: 'Module import or dependency issue',
      terms: ['import', 'require', 'from', 'module']
    },
    'config': {
      keywords: ['config', 'setting', 'environment', 'env', 'option'],
      filePatterns: ['.config.', '.env', 'settings', 'config', 'tsconfig', 'package.json'],
      understanding: 'Configuration issue',
      terms: ['config', 'env', 'settings', 'options']
    },
    'recent': {
      keywords: ['recent', 'update', 'change', 'after', 'since', 'suddenly', 'was working'],
      filePatterns: [], // Will use recently modified files
      understanding: 'Issue after recent changes',
      terms: []
    }
  };
  
  // Detect category
  for (const [cat, patterns] of Object.entries(categoryPatterns)) {
    if (patterns.keywords.some(k => problemLower.includes(k))) {
      category = cat;
      understanding = patterns.understanding;
      searchTerms.push(...patterns.terms);
      
      // Find matching files
      for (const file of allFiles) {
        const fileName = file.toLowerCase();
        for (const pattern of patterns.filePatterns) {
          if (fileName.includes(pattern.toLowerCase())) {
            suggestedFiles.push({
              path: file,
              reason: `Matches ${pattern} pattern for ${cat} issues`,
              confidence: 'medium'
            });
            break;
          }
        }
      }
      break;
    }
  }
  
  // Always add entry point files for runtime issues
  if (category === 'runtime' || category === 'other') {
    const entryFiles = allFiles.filter(f => {
      const name = f.toLowerCase();
      return name.includes('main.') || name.includes('index.') || 
             name.includes('app.tsx') || name.includes('app.ts') ||
             name.endsWith('package.json');
    });
    
    entryFiles.forEach(f => {
      if (!suggestedFiles.some(sf => sf.path === f)) {
        suggestedFiles.push({
          path: f,
          reason: 'Entry point file - common source of startup issues',
          confidence: 'high'
        });
      }
    });
  }
  
  // Add recently modified files if problem mentions "recent"
  if (problemLower.includes('recent') || problemLower.includes('update') || 
      problemLower.includes('change') || problemLower.includes('after')) {
    recentFiles.slice(0, 3).forEach(f => {
      if (!suggestedFiles.some(sf => sf.path === f.path)) {
        suggestedFiles.push({
          path: f.path,
          reason: 'Recently modified - might contain the problematic change',
          confidence: 'high'
        });
      }
    });
  }
  
  // Limit results
  return {
    understanding: understanding || 'Analyzing potential issue sources',
    category,
    suggestedFiles: suggestedFiles.slice(0, 8),
    recentlyModified: recentFiles.slice(0, 5),
    searchTerms: [...new Set(searchTerms)].slice(0, 5)
  };
}

/**
 * Get recently modified files
 */
private async getRecentlyModifiedFiles(): Promise<{ path: string; modified: Date }[]> {
  const allFiles = this.getAllFilePaths();
  const recentFiles: { path: string; modified: Date }[] = [];
  
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    
    // Get file metadata for each file (limited for performance)
    for (const file of allFiles.slice(0, 50)) {
      try {
        const metadata = await invoke('get_file_metadata', { path: file }) as { modified: number };
        if (metadata && metadata.modified) {
          recentFiles.push({
            path: file,
            modified: new Date(metadata.modified * 1000)
          });
        }
      } catch {
        // Skip files we can't get metadata for
      }
    }
    
    // Sort by modification time (newest first)
    recentFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    
  } catch (error) {
    console.log('[Recent Files] Could not get file metadata:', error);
  }
  
  return recentFiles;
}

/**
 * Render diagnosis results
 */
private renderDiagnosisResults(diagnosis: {
  understanding: string;
  category: string;
  suggestedFiles: { path: string; reason: string; confidence: 'high' | 'medium' | 'low' }[];
  recentlyModified: { path: string; modified: Date }[];
  searchTerms: string[];
}, problem: string): string {
  
  const categoryIcons: { [key: string]: string } = {
    'runtime': '🚀',
    'build': '🔨',
    'ui': '🖼️',
    'styling': '🎨',
    'data': '📊',
    'import': '📦',
    'config': '⚙️',
    'recent': '🕐',
    'other': '🔍'
  };
  
  const confidenceColors: { [key: string]: string } = {
    'high': '#22c55e',
    'medium': '#f59e0b',
    'low': '#6b7280'
  };
  
  return `
    <div style="
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 8px;
      padding: 12px;
      text-align: left;
    ">
      <!-- Header -->
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
        <span style="font-size: 18px;">${categoryIcons[diagnosis.category] || '🔧'}</span>
        <div>
          <div style="color: #fbbf24; font-weight: 600;">Problem Analysis</div>
          <div style="color: #888; font-size: 11px;">${diagnosis.understanding}</div>
        </div>
      </div>
      
      <!-- Suggested Files -->
      ${diagnosis.suggestedFiles.length > 0 ? `
        <div style="margin-bottom: 12px;">
          <div style="color: #ccc; font-size: 11px; margin-bottom: 6px; font-weight: 500;">
            📁 Files to Check (click to open):
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            ${diagnosis.suggestedFiles.map(file => {
              const fileName = file.path.split(/[/\\]/).pop() || file.path;
              return `
                <div class="diagnosis-file-item" data-path="${file.path}" style="
                  background: rgba(245, 158, 11, 0.05);
                  border: 1px solid rgba(245, 158, 11, 0.2);
                  border-left: 3px solid ${confidenceColors[file.confidence]};
                  border-radius: 4px;
                  padding: 6px 10px;
                  cursor: pointer;
                  transition: all 0.2s;
                ">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #fcd34d; font-weight: 500;">${this.escapeHtml(fileName)}</span>
                    <span style="
                      font-size: 9px;
                      padding: 2px 6px;
                      border-radius: 10px;
                      background: ${confidenceColors[file.confidence]}22;
                      color: ${confidenceColors[file.confidence]};
                    ">${file.confidence}</span>
                  </div>
                  <div style="color: #888; font-size: 10px; margin-top: 2px;">${this.escapeHtml(file.reason)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- Recently Modified -->
      ${diagnosis.recentlyModified.length > 0 ? `
        <div style="margin-bottom: 12px;">
          <div style="color: #ccc; font-size: 11px; margin-bottom: 6px; font-weight: 500;">
            🕐 Recently Modified Files:
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            ${diagnosis.recentlyModified.map(file => {
              const fileName = file.path.split(/[/\\]/).pop() || file.path;
              const timeAgo = this.getTimeAgo(file.modified);
              return `
                <div class="diagnosis-file-item" data-path="${file.path}" style="
                  background: rgba(59, 130, 246, 0.1);
                  border: 1px solid rgba(59, 130, 246, 0.2);
                  border-radius: 4px;
                  padding: 4px 8px;
                  cursor: pointer;
                  font-size: 11px;
                  transition: all 0.2s;
                ">
                  <span style="color: #60a5fa;">${this.escapeHtml(fileName)}</span>
                  <span style="color: #666; font-size: 9px; margin-left: 4px;">${timeAgo}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- Search Terms -->
      ${diagnosis.searchTerms.length > 0 ? `
        <div>
          <div style="color: #ccc; font-size: 11px; margin-bottom: 6px; font-weight: 500;">
            🔍 Try Searching For:
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            ${diagnosis.searchTerms.map(term => `
              <button class="ai-keyword-suggestion" data-keyword="${this.escapeHtml(term)}" style="
                background: rgba(139, 92, 246, 0.2);
                border: 1px solid rgba(139, 92, 246, 0.3);
                border-radius: 4px;
                padding: 3px 8px;
                color: #c4b5fd;
                font-size: 10px;
                cursor: pointer;
                transition: all 0.2s;
              ">
                ${this.escapeHtml(term)}
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Get human-readable time ago string
 */
private getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

/**
 * AI-Enhanced Search - Uses AI to understand natural language and suggest better search terms
 */
private async performAIEnhancedSearch(originalQuery: string): Promise<void> {
  const suggestionsDiv = document.getElementById('ai-search-suggestions');
  const aiBtn = document.getElementById('ai-enhance-search-btn');
  
  if (!suggestionsDiv || !aiBtn) return;
  
  // Show loading state
  aiBtn.innerHTML = `
    <span class="ai-loading-spinner" style="
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    "></span>
    AI is thinking...
  `;
  aiBtn.style.opacity = '0.8';
  aiBtn.style.pointerEvents = 'none';
  
  try {
    // Use AI to understand the query and suggest better search terms
    const aiSuggestions = await this.getAISearchSuggestions(originalQuery);
    
    if (aiSuggestions.keywords.length > 0) {
      suggestionsDiv.style.display = 'block';
      suggestionsDiv.innerHTML = `
        <div style="
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 8px;
          padding: 12px;
          text-align: left;
        ">
          <div style="color: #a78bfa; font-weight: 500; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span>✨</span> AI Suggestions
          </div>
          
          ${aiSuggestions.understanding ? `
            <div style="color: #888; font-size: 11px; margin-bottom: 10px; font-style: italic;">
              "${aiSuggestions.understanding}"
            </div>
          ` : ''}
          
          <div style="color: #ccc; font-size: 11px; margin-bottom: 8px;">Try searching for:</div>
          
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${aiSuggestions.keywords.map(keyword => `
              <button class="ai-keyword-suggestion" data-keyword="${this.escapeHtml(keyword)}" style="
                background: rgba(139, 92, 246, 0.2);
                border: 1px solid rgba(139, 92, 246, 0.4);
                border-radius: 4px;
                padding: 4px 10px;
                color: #c4b5fd;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s;
              ">
                🔍 ${this.escapeHtml(keyword)}
              </button>
            `).join('')}
          </div>
          
          ${aiSuggestions.codePatterns && aiSuggestions.codePatterns.length > 0 ? `
            <div style="color: #ccc; font-size: 11px; margin: 10px 0 8px 0;">Code patterns:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${aiSuggestions.codePatterns.map(pattern => `
                <button class="ai-keyword-suggestion" data-keyword="${this.escapeHtml(pattern)}" style="
                  background: rgba(59, 130, 246, 0.2);
                  border: 1px solid rgba(59, 130, 246, 0.4);
                  border-radius: 4px;
                  padding: 4px 10px;
                  color: #93c5fd;
                  font-size: 11px;
                  font-family: monospace;
                  cursor: pointer;
                  transition: all 0.2s;
                ">
                  ${this.escapeHtml(pattern)}
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
      
      // Add click handlers for suggestions
      suggestionsDiv.querySelectorAll('.ai-keyword-suggestion').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const keyword = (e.target as HTMLElement).getAttribute('data-keyword');
          if (keyword) {
            // Update search input and trigger search
            const searchInput = document.getElementById('explorer-search-input-persistent') as HTMLInputElement;
            if (searchInput) {
              searchInput.value = keyword;
              this.searchFilter = keyword;
              this.performContentSearch(keyword);
            }
          }
        });
        
        btn.addEventListener('mouseenter', (e) => {
          (e.target as HTMLElement).style.transform = 'scale(1.05)';
          (e.target as HTMLElement).style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.3)';
        });
        
        btn.addEventListener('mouseleave', (e) => {
          (e.target as HTMLElement).style.transform = 'scale(1)';
          (e.target as HTMLElement).style.boxShadow = 'none';
        });
      });
    }
    
    // Reset button
    aiBtn.innerHTML = `<span style="font-size: 14px;">✨</span> Try AI-Enhanced Search`;
    aiBtn.style.opacity = '1';
    aiBtn.style.pointerEvents = 'auto';
    
  } catch (error) {
    console.error('[AI Search] Error:', error);
    aiBtn.innerHTML = `<span style="font-size: 14px;">✨</span> Try AI-Enhanced Search`;
    aiBtn.style.opacity = '1';
    aiBtn.style.pointerEvents = 'auto';
    
    suggestionsDiv.style.display = 'block';
    suggestionsDiv.innerHTML = `
      <div style="color: #f87171; font-size: 11px; padding: 8px;">
        AI enhancement unavailable. Try simpler search terms.
      </div>
    `;
  }
}

/**
 * Get AI suggestions for search terms
 */
private async getAISearchSuggestions(query: string): Promise<{
  keywords: string[];
  codePatterns: string[];
  understanding: string;
}> {
  // Try to use the configured AI provider
  const providerInfo = this.aiEngine.getProviderInfo();
  
  if (providerInfo && providerInfo.apiKey) {
    try {
      const prompt = `You are a code search assistant. The user wants to search their codebase but their search query "${query}" returned no results.

Analyze their intent and suggest better search terms.

Rules:
1. Extract key programming concepts from their natural language query
2. Suggest specific code keywords that would appear in source files
3. Include common code patterns related to their intent
4. Keep suggestions short (1-3 words each)

Respond in this exact JSON format only, no other text:
{
  "understanding": "Brief explanation of what they're looking for",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "codePatterns": ["import ", "from ", "require("]
}`;

      const response = await this.aiEngine.generateResponse(prompt, {
        maxTokens: 300,
        temperature: 0.3
      });
      
      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          keywords: parsed.keywords || [],
          codePatterns: parsed.codePatterns || [],
          understanding: parsed.understanding || ''
        };
      }
    } catch (error) {
      console.log('[AI Search] AI provider error, using fallback:', error);
    }
  }
  
  // Fallback: Use simple NLP-like extraction
  return this.extractSearchTermsFallback(query);
}

/**
 * Fallback search term extraction (no AI)
 */
private extractSearchTermsFallback(query: string): {
  keywords: string[];
  codePatterns: string[];
  understanding: string;
} {
  const queryLower = query.toLowerCase();
  const keywords: string[] = [];
  const codePatterns: string[] = [];
  let understanding = '';
  
  // Common intent patterns
  const intentMap: { [key: string]: { keywords: string[], patterns: string[], desc: string } } = {
    'import': {
      keywords: ['import', 'require', 'from', 'module'],
      patterns: ['import ', 'from \'', 'require(', 'import {'],
      desc: 'Looking for import/module statements'
    },
    'export': {
      keywords: ['export', 'module.exports', 'default'],
      patterns: ['export ', 'export default', 'module.exports'],
      desc: 'Looking for export statements'
    },
    'function': {
      keywords: ['function', 'const', 'def', 'fn', 'async'],
      patterns: ['function ', 'const ', '=> {', 'async function'],
      desc: 'Looking for function definitions'
    },
    'class': {
      keywords: ['class', 'extends', 'constructor', 'interface'],
      patterns: ['class ', 'extends ', 'constructor(', 'interface '],
      desc: 'Looking for class definitions'
    },
    'api': {
      keywords: ['fetch', 'axios', 'http', 'request', 'endpoint'],
      patterns: ['fetch(', 'axios.', '.get(', '.post('],
      desc: 'Looking for API calls'
    },
    'state': {
      keywords: ['useState', 'setState', 'state', 'redux', 'store'],
      patterns: ['useState', 'this.state', 'setState', 'useReducer'],
      desc: 'Looking for state management'
    },
    'component': {
      keywords: ['component', 'render', 'return', 'jsx', 'tsx'],
      patterns: ['return (', '<div', 'React.', 'props'],
      desc: 'Looking for React components'
    },
    'style': {
      keywords: ['style', 'css', 'className', 'styled'],
      patterns: ['className=', 'style={{', 'styled.', '.css'],
      desc: 'Looking for styling code'
    },
    'error': {
      keywords: ['error', 'catch', 'throw', 'exception', 'try'],
      patterns: ['catch (', 'throw new', '.catch(', 'try {'],
      desc: 'Looking for error handling'
    },
    'test': {
      keywords: ['test', 'describe', 'it', 'expect', 'jest'],
      patterns: ['describe(', 'it(', 'expect(', 'test('],
      desc: 'Looking for test code'
    },
    'config': {
      keywords: ['config', 'settings', 'env', 'options'],
      patterns: ['config', '.env', 'process.env', 'settings'],
      desc: 'Looking for configuration'
    },
    'database': {
      keywords: ['database', 'query', 'sql', 'model', 'schema'],
      patterns: ['SELECT', 'INSERT', '.find(', '.create('],
      desc: 'Looking for database operations'
    },
    'hook': {
      keywords: ['useEffect', 'useState', 'useMemo', 'useCallback', 'hook'],
      patterns: ['useEffect', 'useState', 'useMemo', 'use'],
      desc: 'Looking for React hooks'
    }
  };
  
  // Find matching intents
  for (const [intent, data] of Object.entries(intentMap)) {
    if (queryLower.includes(intent) || 
        data.keywords.some(k => queryLower.includes(k))) {
      keywords.push(...data.keywords.slice(0, 3));
      codePatterns.push(...data.patterns.slice(0, 3));
      understanding = data.desc;
      break;
    }
  }
  
  // Extract individual words as keywords
  const words = query.split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !['want', 'find', 'search', 'looking', 'for', 'the', 'all', 'any', 'with'].includes(w.toLowerCase()));
  
  keywords.push(...words.slice(0, 3));
  
  // Remove duplicates
  const uniqueKeywords = [...new Set(keywords)].slice(0, 5);
  const uniquePatterns = [...new Set(codePatterns)].slice(0, 4);
  
  return {
    keywords: uniqueKeywords,
    codePatterns: uniquePatterns,
    understanding: understanding || `Searching for: ${words.join(', ')}`
  };
}

private renderContentSearchResult(result: ContentSearchResult, query: string): string {
  const fileName = result.path.split(/[/\\]/).pop() || result.path;
  const dirPath = result.path.split(/[/\\]/).slice(0, -1).join('/');
  
  return `
    <div class="content-search-file" data-path="${result.path}" style="
      border-bottom: 1px solid #3c3c3c;
      cursor: pointer;
    ">
      <div style="
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        background: #2a2a2a;
      " onmouseover="this.style.background='#333'" onmouseout="this.style.background='#2a2a2a'">
        <span style="color: #e8ab53;">📄</span>
        <span style="color: #4fc1ff; font-weight: 500;">${this.escapeHtml(fileName)}</span>
        <span style="color: #666; font-size: 10px; flex: 1; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(dirPath)}</span>
        <span style="color: #888; font-size: 10px; background: #3c3c3c; padding: 2px 6px; border-radius: 3px;">${result.matches.length}</span>
      </div>
      <div style="background: #1e1e1e;">
        ${result.matches.slice(0, 5).map(match => this.renderContentMatch(result.path, match, query)).join('')}
        ${result.matches.length > 5 ? `<div style="padding: 4px 12px; color: #666; font-size: 10px; font-style: italic;">+ ${result.matches.length - 5} more matches...</div>` : ''}
      </div>
    </div>
  `;
}

private renderContentMatch(path: string, match: ContentSearchMatch, query: string): string {
  // Highlight the matching part
  const before = match.lineContent.substring(0, match.matchStart);
  const matched = match.lineContent.substring(match.matchStart, match.matchEnd);
  const after = match.lineContent.substring(match.matchEnd);
  
  return `
    <div class="content-search-match" data-path="${path}" data-line="${match.lineNumber}" style="
      padding: 4px 12px 4px 32px;
      display: flex;
      gap: 8px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 11px;
      cursor: pointer;
      border-left: 2px solid transparent;
    " onmouseover="this.style.background='#2a2a2a';this.style.borderLeftColor='#3b82f6'" onmouseout="this.style.background='transparent';this.style.borderLeftColor='transparent'">
      <span style="color: #858585; min-width: 40px; text-align: right;">${match.lineNumber}</span>
      <span style="color: #d4d4d4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${this.escapeHtml(before)}<mark style="background: rgba(255, 213, 0, 0.3); color: #ffd500; padding: 0 2px; border-radius: 2px;">${this.escapeHtml(matched)}</mark>${this.escapeHtml(after)}
      </span>
    </div>
  `;
}

private hideContentSearchResults(): void {
  const existing = document.getElementById('content-search-results-panel');
  if (existing) existing.remove();
}

private openFileAtLine(path: string, line: number): void {
  console.log(`📂 Opening file at line ${line}:`, path);
  
  // ✅ BEST METHOD: Use openFileInTab (handles tabs + content reading)
  if ((window as any).openFileInTab) {
    (window as any).openFileInTab(path, line).catch((err: Error) => {
      console.error('❌ openFileInTab failed:', err);
      this.fallbackOpenFile(path, line);
    });
    return;
  }
  
  // ✅ FALLBACK: Use tabManager directly
  if ((window as any).tabManager?.addTab) {
    this.openFileWithTabManager(path, line);
    return;
  }
  
  // ✅ LAST RESORT: Use file-selected event
  this.fallbackOpenFile(path, line);
}

private async openFileWithTabManager(path: string, line: number): Promise<void> {
  try {
    // Read file content
    const { invoke } = await import('@tauri-apps/api/core');
    const content = await invoke('read_file_content', { path: path }) as string;
    
    // Add tab
    (window as any).tabManager.addTab(path, content);
    
    // Jump to line
    setTimeout(() => this.goToLine(line), 200);
  } catch (error) {
    console.error('❌ openFileWithTabManager failed:', error);
    this.fallbackOpenFile(path, line);
  }
}

private fallbackOpenFile(path: string, line: number): void {
  // Dispatch file-selected event
  const fileSelectedEvent = new CustomEvent('file-selected', {
    detail: { 
      path: path,
      name: path.split(/[/\\]/).pop() || path,
      line: line
    }
  });
  document.dispatchEvent(fileSelectedEvent);
  
  // Try direct openFile
  if ((window as any).openFile) {
    (window as any).openFile(path, line);
  }
  
  // Go to line after delay
  setTimeout(() => this.goToLine(line), 500);
}

private goToLine(line: number): void {
  try {
    const monaco = (window as any).monaco;
    if (monaco?.editor) {
      const editors = monaco.editor.getEditors();
      if (editors && editors.length > 0) {
        const editor = editors[0];
        
        // Reveal the line in center of editor
        editor.revealLineInCenter(line);
        
        // Set cursor position
        editor.setPosition({ lineNumber: line, column: 1 });
        
        // Focus the editor
        editor.focus();
        
        // Highlight the line briefly
        const decorations = editor.deltaDecorations([], [{
          range: new monaco.Range(line, 1, line, 1000),
          options: {
            isWholeLine: true,
            className: 'content-search-highlight-line',
            glyphMarginClassName: 'content-search-glyph'
          }
        }]);
        
        // Remove highlight after 2 seconds
        setTimeout(() => {
          editor.deltaDecorations(decorations, []);
        }, 2000);
        
        console.log(`✅ Jumped to line ${line}`);
      }
    }
  } catch (error) {
    console.error('Error going to line:', error);
  }
}

private escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
private getControlPanelHTML(): string {
  const providerInfo = this.aiEngine.getProviderInfo();
  const providerText = providerInfo ? `${providerInfo.provider}` : 'Configure';
  
  return `
    <div class="filter-search-container" style="position: relative; margin-bottom: 6px;">
      <span class="search-icon" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; opacity: 0.6; transition: all 0.2s; z-index: 1;">
        ${this.ICONS.search}
      </span>
      <input 
        type="text" 
        class="filter-search-box-persistent" 
        placeholder="Search file"
        id="explorer-search-input-persistent"
        style="
          width: 100% !important;
          padding: 8px 80px 8px 32px !important;
          background: #3c3c3c !important;
          color: #cccccc !important;
          border: 1px solid #4a4a4a !important;
          border-radius: 6px !important;
          font-size: 12px !important;
          height: 32px !important;
          line-height: 1 !important;
          transition: all 0.2s !important;
        "
      />
      <!-- ✅ Toggle Buttons Container -->
      <div class="search-toggle-buttons" style="
        position: absolute;
        right: 6px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        gap: 4px;
      ">
        <!-- Content Search Toggle -->
        <button class="content-search-toggle-btn" id="content-search-toggle" title="Search in file content" style="
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px;
          width: 28px;
          height: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          padding: 0;
          color: #666;
        ">
          <span style="font-size: 11px; font-weight: 600;">Aa</span>
        </button>
        <!-- AI Search Toggle -->
        <button class="ai-search-toggle-btn" id="ai-search-toggle" title="AI Project Search" style="
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px;
          width: 28px;
          height: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          padding: 0;
          color: #666;
        ">
          <span style="font-size: 13px;">✦</span>
        </button>
      </div>
    </div>
    
<!-- SMART FILTERS ROW -->
<div class="smart-filters-row" id="smart-filters-row" style="display: none; margin-bottom: 6px; gap: 4px; flex-wrap: wrap;">
  <button class="smart-filter-btn" data-filter="tests" title="Test files">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/></svg>
    <span>Tests</span>
  </button>
  
  <button class="smart-filter-btn" data-filter="components" title="UI Components">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H4z"/><path d="M5 4h6v1H5V4zm0 2h6v1H5V6zm0 2h6v1H5V8z"/></svg>
    <span>Components</span>
  </button>
  
  <button class="smart-filter-btn" data-filter="api" title="API & Services">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M6.5 1A1.5 1.5 0 0 0 5 2.5V3H1.5A1.5 1.5 0 0 0 0 4.5v8A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 14.5 3H11v-.5A1.5 1.5 0 0 0 9.5 1h-3zm0 1h3a.5.5 0 0 1 .5.5V3H6v-.5a.5.5 0 0 1 .5-.5zm1.886 6.914L15 7.151V12.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5V7.15l6.614 1.764a1.5 1.5 0 0 0 .772 0zM1.5 4h13a.5.5 0 0 1 .5.5v1.616L8.129 7.948a.5.5 0 0 1-.258 0L1 6.116V4.5a.5.5 0 0 1 .5-.5z"/></svg>
    <span>API</span>
  </button>
  
  <button class="smart-filter-btn" data-filter="docs" title="Documentation">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/></svg>
    <span>Docs</span>
  </button>
  
  <button class="smart-filter-btn" data-filter="styles" title="CSS & Styles">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 13.5 1h-11zM2 2.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11z"/><path d="M8.5 6.5a.5.5 0 0 0-1 0V8H6a.5.5 0 0 0 0 1h1.5v1.5a.5.5 0 0 0 1 0V9H10a.5.5 0 0 0 0-1H8.5V6.5z"/></svg>
    <span>Styles</span>
  </button>
  
  <button class="smart-filter-btn" data-filter="images" title="Images & Assets">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/></svg>
    <span>Images</span>
  </button>
  
  <button class="smart-filter-btn" data-filter="config" title="Config files">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/></svg>
    <span>Config</span>
  </button>
</div>
    
    <div class="view-mode-row-compact" style="display: flex !important; align-items: center !important; gap: 4px !important;">
      <div class="view-mode-buttons-persistent" style="display: flex !important; gap: 2px !important; flex: 1 !important; background: rgba(0,0,0,0.2) !important; border-radius: 4px !important; padding: 2px !important;">
        <button class="view-mode-btn-persistent active" data-mode="all" title="All files">${this.ICONS.all}<span class="btn-text">All</span></button>
        <button class="view-mode-btn-persistent" data-mode="no-code" title="Hide code">${this.ICONS.noCode}<span class="btn-text">No Code</span></button>
        <button class="view-mode-btn-persistent" data-mode="structure" title="Folders">${this.ICONS.structure}<span class="btn-text">Structure</span></button>
        <button class="view-mode-btn-persistent" data-mode="minimal" title="Docs & configs">${this.ICONS.minimal}<span class="btn-text">Minimal</span></button>
        <button class="view-mode-btn-persistent" data-mode="code-only" title="Code only">${this.ICONS.codeOnly}<span class="btn-text">Code</span></button>
      </div>
      
      <button class="view-mode-btn-persistent standalone-btn" data-mode="modified-only" id="modified-toggle-persistent" title="Modified (Alt+M)" style="width: 30px !important; min-width: 30px !important; flex: none !important;">${this.ICONS.modifiedOnly}</button>
      
      <button class="view-mode-btn-persistent standalone-btn" id="hidden-toggle-persistent" title="Hidden files" style="width: 30px !important; min-width: 30px !important; flex: none !important;">${this.ICONS.hiddenOff}</button>
    </div>
    
    <div class="bottom-row-compact" style="display: flex !important; justify-content: space-between !important; align-items: center !important; margin-top: 4px !important;">
      <div class="filter-status-persistent" id="filter-status-persistent" style="font-size: 10px !important; color: #888 !important; flex: 1 !important;"></div>
      <div class="file-count-persistent" id="file-count-persistent" style="font-size: 10px !important; color: #888 !important;">0 files</div>
    </div>
  `;
}

// ============================================================================
// FILE METADATA COLLECTION
// ============================================================================

private async collectFileMetadata(): Promise<void> {
  const allItems = document.querySelectorAll('.file-item');
  
  for (const item of Array.from(allItems)) {
    const element = item as HTMLElement;
    const path = element.getAttribute('data-path');
    if (!path || this.isFolder(element)) continue;
    
    try {
      const metadata = await this.getFileMetadata(path);
      if (metadata) {
        this.fileMetadata.set(path, metadata);
      }
    } catch (error) {
      // Silently fail for individual files
    }
  }
  
  console.log(`[RobustFilter] Collected metadata for ${this.fileMetadata.size} files`);
}

private async getFileMetadata(filePath: string): Promise<{ size: number; modified: Date } | null> {
  try {
    // Try to get file stats from filesystem
    if (typeof (window as any).fs !== 'undefined') {
      const fs = (window as any).fs;
      if (fs.stat) {
        const stats = await fs.stat(filePath);
        return {
          size: stats.size || 0,
          modified: stats.mtime ? new Date(stats.mtime) : new Date()
        };
      }
    }
    
    // Try global file system
    if (typeof (window as any).fileSystem !== 'undefined') {
      const fileSystem = (window as any).fileSystem;
      const stats = await fileSystem.getFileStats(filePath);
      return {
        size: stats.size || 0,
        modified: stats.modified ? new Date(stats.modified) : new Date()
      };
    }
    
    // Fallback: estimate from element attributes
    const fileElement = document.querySelector(`[data-path="${filePath}"]`) as HTMLElement;
    if (fileElement) {
      const sizeText = fileElement.querySelector('.file-size')?.textContent || '0';
      const sizeKB = parseFloat(sizeText.replace(/[^\d.]/g, '')) || 0;
      return {
        size: sizeKB * 1024,
        modified: new Date() // Use current date as fallback
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// ENHANCED AI SEARCH WITH FILTERS
// ============================================================================

private buildEnhancedSearchPrompt(query: string, fileList: string[]): string {
  const limitedFiles = fileList.slice(0, 200);
  
  // Add metadata information
  const filesWithMetadata = limitedFiles.map((f, i) => {
    const metadata = this.fileMetadata.get(f);
    const ext = this.getFileExtension(f);
    const size = metadata ? `${Math.round(metadata.size / 1024)}KB` : '?';
    const modified = metadata ? this.getRelativeTime(metadata.modified) : '?';
    
    return `${i + 1}. ${f} [${ext}] [${size}] [Modified: ${modified}]`;
  }).join('\n');
  
  return `You are a file search assistant with metadata awareness. Given a search query and a list of files with their metadata, return ONLY the file paths that match.

Search Query: "${query}"

Available Files:
${filesWithMetadata}

Instructions:
- Return ONLY the file paths (without metadata) that match the search query
- Match based on: file names, paths, content type, file size, modification time
- Understand temporal queries: "recent", "last week", "today", "yesterday", "new files"
- Understand size queries: "large" (>100KB), "small" (<10KB), "over 500KB", "under 50KB"
- Understand type queries: "typescript", "python", "config files", "json", etc.
- Return one file path per line
- Do not add explanations or metadata in response

Relevant files:`;
}

private getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// ============================================================================
// SMART FILTERS
// ============================================================================

private applySmartFilter(filterType: string): void {
  console.log(`[RobustFilter] Applying smart filter: ${filterType}`);
  
  const searchInput = document.getElementById('explorer-search-input-persistent') as HTMLInputElement;
  if (!searchInput) return;
  
  let query = '';
  
  switch (filterType) {
    case 'tests':
      query = 'test files spec jest mocha';
      break;
    case 'components':
      query = 'component view page screen widget';
      break;
    case 'api':
      query = 'api service route endpoint controller';
      break;
    case 'docs':
      query = 'readme documentation guide tutorial';
      break;
    case 'styles':
      query = 'css scss sass style theme';
      break;
    case 'images':
      query = 'png jpg jpeg svg gif webp image icon';
      break;
    case 'config':
      query = 'config json yaml toml env settings';
      break;
  }
  
  searchInput.value = query;
  this.searchFilter = query.toLowerCase();
  
  // Auto-enable AI search if not already enabled
  if (!this.aiSearchMode) {
    const aiToggle = document.getElementById('ai-search-toggle');
    if (aiToggle) {
      aiToggle.click();
    }
  }
  
  // Trigger search
  setTimeout(() => {
    this.performAISearch(query);
  }, 100);
}

private setupSmartFilters(): void {
  const smartFilterBtns = document.querySelectorAll('.smart-filter-btn');
  
  smartFilterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const filterType = (btn as HTMLElement).getAttribute('data-filter');
      if (filterType) {
        this.applySmartFilter(filterType);
      }
    });
  });
}

private async performAISearch(query: string): Promise<void> {
  console.log('[RobustFilter] AI search:', query);
  
  if (!this.aiEngine.isAIAvailable()) {
    this.showNotification('⚙️ Configure API first');
    const patternResults = this.performPatternMatching(query);
    if (patternResults.size > 0) {
      this.aiSuggestedFiles = patternResults;
      this.applyFilters();
      this.showNotification(`Found ${patternResults.size} files (pattern)`);
    } else {
      this.aiSuggestedFiles.clear();
      this.applyFilters();
      this.showNotification('No matches');
    }
    return;
  }

  try {
    const providerInfo = this.aiEngine.getProviderInfo();
    
    this.startSearchWaveAnimation();
    this.showNotification(`🤖 ${providerInfo?.provider} analyzing...`);
    
    // Collect metadata if not already collected
    if (this.fileMetadata.size === 0) {
      await this.collectFileMetadata();
    }
    
    const allFiles = this.getAllFilePaths();
    if (allFiles.length === 0) {
      this.stopSearchWaveAnimation();
      this.showNotification('No files');
      return;
    }

    // ✅ USE the AISearchEngine's searchWithAI method
    // Build enhanced prompt with metadata
    const enhancedFileList = allFiles.map(f => {
      const metadata = this.fileMetadata.get(f);
      const ext = this.getFileExtension(f);
      const size = metadata ? `${Math.round(metadata.size / 1024)}KB` : '';
      const modified = metadata ? this.getRelativeTime(metadata.modified) : '';
      
      return `${f}${size ? ` [${size}]` : ''}${modified ? ` [${modified}]` : ''}`;
    });
    
    // Use the AI engine's search method
    const results = await this.aiEngine.searchWithAI(query, enhancedFileList);
    
    this.stopSearchWaveAnimation();
    
    if (results.length > 0) {
      // Parse results to remove metadata annotations
      const cleanResults = results.map(r => {
        // Remove metadata like [100KB] [today] from the result
        return r.replace(/\s*\[.*?\]/g, '').trim();
      });
      
      this.aiSuggestedFiles = new Set(cleanResults);
      this.applyFilters();
      this.showNotification(`✨ AI found ${cleanResults.length} files`, 'success');
    } else {
      this.aiSuggestedFiles.clear();
      this.applyFilters();
      this.showNotification('No matches');
    }

  } catch (error) {
    console.error('[RobustFilter] AI failed:', error);
    this.stopSearchWaveAnimation();
    this.showNotification('❌ AI failed, using fallback', 'warning');
    
    const patternResults = this.performPatternMatching(query);
    if (patternResults.size > 0) {
      this.aiSuggestedFiles = patternResults;
      this.applyFilters();
      this.showNotification(`Found ${patternResults.size} files (fallback)`);
    }
  }
}
// 🌊 ADD THESE NEW METHODS:

private startSearchWaveAnimation(): void {
  const searchContainer = document.querySelector('.filter-search-container') as HTMLElement;
  if (!searchContainer) return;
  
  // Add wave wrapper if it doesn't exist
  if (!searchContainer.querySelector('.search-wave-wrapper')) {
    const waveWrapper = document.createElement('div');
    waveWrapper.className = 'search-wave-wrapper';
    waveWrapper.innerHTML = `
      <div class="wave-ring wave-ring-1"></div>
      <div class="wave-ring wave-ring-2"></div>
      <div class="wave-ring wave-ring-3"></div>
    `;
    searchContainer.appendChild(waveWrapper);
  }
  
  // Add searching class
  searchContainer.classList.add('ai-searching');
  
  // Add pulsing to search icon
  const searchIcon = document.querySelector('.search-icon') as HTMLElement;
  if (searchIcon) {
    searchIcon.classList.add('searching-pulse');
  }
  
  // Add shimmer to input
  const searchInput = document.getElementById('explorer-search-input-persistent') as HTMLElement;
  if (searchInput) {
    searchInput.classList.add('searching-shimmer');
  }
}

private stopSearchWaveAnimation(): void {
  const searchContainer = document.querySelector('.filter-search-container') as HTMLElement;
  if (!searchContainer) return;
  
  // Remove searching class
  searchContainer.classList.remove('ai-searching');
  
  // Remove pulsing from search icon
  const searchIcon = document.querySelector('.search-icon') as HTMLElement;
  if (searchIcon) {
    searchIcon.classList.remove('searching-pulse');
  }
  
  // Remove shimmer from input
  const searchInput = document.getElementById('explorer-search-input-persistent') as HTMLElement;
  if (searchInput) {
    searchInput.classList.remove('searching-shimmer');
  }
  
  // Remove wave wrapper after animation completes
  setTimeout(() => {
    const waveWrapper = searchContainer.querySelector('.search-wave-wrapper');
    if (waveWrapper) {
      waveWrapper.remove();
    }
  }, 600);
}

  private getAllFilePaths(): string[] {
    const paths: string[] = [];
    const allItems = document.querySelectorAll('.file-item');
    
    allItems.forEach((item) => {
      const element = item as HTMLElement;
      const path = element.getAttribute('data-path');
      const isDirectory = this.isFolder(element);
      
      if (path && !isDirectory) {
        paths.push(path);
      }
    });
    
    return paths;
  }

  private performPatternMatching(query: string): Set<string> {
    const results = new Set<string>();
    const queryLower = query.toLowerCase();
    
    let matchedPatterns: string[] = [];
    
    for (const [intent, keywords] of Object.entries(this.AI_PATTERNS)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        matchedPatterns.push(...keywords);
      }
    }
    
    if (matchedPatterns.length === 0) {
      return results;
    }
    
    const allItems = document.querySelectorAll('.file-item, .directory');
    allItems.forEach((item) => {
      const element = item as HTMLElement;
      const fileName = this.getFileName(element).toLowerCase();
      const filePath = element.getAttribute('data-path')?.toLowerCase() || '';
      const isDirectory = this.isFolder(element);
      
      if (isDirectory) return;
      
      const matches = matchedPatterns.some(pattern => 
        fileName.includes(pattern) || filePath.includes(pattern)
      );
      
      if (matches) {
        const path = element.getAttribute('data-path') || '';
        if (path) results.add(path);
      }
    });
    
    return results;
  }

  private setViewMode(mode: 'all' | 'no-code' | 'structure' | 'minimal' | 'code-only' | 'modified-only'): void {
    if (mode === 'modified-only') {
      this.updateModifiedFilesList();
    }
    
    this.viewMode = mode;
    
    if (mode !== 'modified-only') {
      this.updateSlidingIndicator(mode);
    }
    
    document.querySelectorAll('.view-mode-btn-persistent[data-mode]').forEach((btn) => {
      const buttonElement = btn as HTMLElement;
      const buttonMode = buttonElement.getAttribute('data-mode');
      buttonElement.classList.toggle('active', buttonMode === mode);
    });
    
    this.applyFilters();
    this.showNotification(this.getModeName(mode));
  }
  
  private updateSlidingIndicator(mode: string): void {
    const activeButton = document.querySelector(`.view-mode-btn-persistent[data-mode="${mode}"]`) as HTMLElement;
    const container = document.querySelector('.view-mode-buttons-persistent') as HTMLElement;
    
    if (activeButton && container && !activeButton.classList.contains('standalone-btn')) {
      let indicator = container.querySelector('.sliding-indicator') as HTMLElement;
      
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'sliding-indicator';
        container.appendChild(indicator);
      }
      
      const buttonRect = activeButton.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      indicator.style.width = `${buttonRect.width}px`;
      indicator.style.left = `${buttonRect.left - containerRect.left}px`;
    }
  }

  public applyFilters(): void {
    const allItems = document.querySelectorAll('.file-item, .directory, .integrated-file-item, .integrated-folder-header');
    
    if (allItems.length === 0) {
      this.updateFilterStatus(0, 0);
      this.updateFileCount(0);
      return;
    }
    
    let visibleCount = 0;
    let totalCount = 0;
    const updates: { element: HTMLElement, show: boolean, aiSuggested: boolean }[] = [];
    
    allItems.forEach((item) => {
      const element = item as HTMLElement;
      const isDirectory = this.isFolder(element);
      const fileName = this.getFileName(element);
      const filePath = element.getAttribute('data-path') || '';
      
      const isAISuggested = this.aiSearchMode && this.isAISuggested(filePath);
      const shouldShow = this.shouldShowFile(fileName, isDirectory, filePath);
      
      if (!isDirectory && this.isFileModified(filePath)) {
        element.classList.add('is-modified');
      } else {
        element.classList.remove('is-modified');
      }
      
      updates.push({ element, show: shouldShow, aiSuggested: isAISuggested });
      
      if (!isDirectory) {
        totalCount++;
        if (shouldShow) visibleCount++;
      }
    });

    requestAnimationFrame(() => {
      updates.forEach(({ element, show, aiSuggested }) => {
        if (show) {
          element.classList.remove('filter-hidden');
        } else {
          element.classList.add('filter-hidden');
        }
        
        if (aiSuggested) {
          element.classList.add('ai-suggested');
        } else {
          element.classList.remove('ai-suggested');
        }
      });
      
      this.updateFilterStatus(visibleCount, totalCount);
      this.updateFileCount(totalCount);
    });
  }
// Add after the applyFilters() method:

private setupFileContextMenu(): void {
  document.addEventListener('contextmenu', (e) => {
    const target = e.target as HTMLElement;
    const fileItem = target.closest('.file-item') as HTMLElement;
    
    if (!fileItem) return;
    
    const filePath = fileItem.getAttribute('data-path');
    if (!filePath) return;
    
    // Check if it's a directory
    const isDirectory = this.isFolder(fileItem);
    if (isDirectory) return; // Don't show menu for folders
    
    // ✅ ONLY show AI menu when AI search mode is active
    if (!this.aiSearchMode) return; // ← ADD THIS LINE
    
    // Show AI menu for ALL files when AI mode is active
    e.preventDefault();
    e.stopPropagation();
    this.showAIAnalysisMenu(e, filePath, fileItem);
  }, true); // Use capture phase
}

private showAIAnalysisMenu(e: MouseEvent, filePath: string, fileItem: HTMLElement): void {
  // Remove existing menu
  const existingMenu = document.querySelector('.ai-analysis-menu');
  if (existingMenu) existingMenu.remove();
  
  const menu = document.createElement('div');
  menu.className = 'ai-analysis-menu';
  menu.style.cssText = `
    position: fixed;
    left: ${e.clientX}px;
    top: ${e.clientY}px;
    background: #252526;
    border: 1px solid #3c3c3c;
    border-radius: 6px;
    padding: 4px;
    z-index: 10001;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    min-width: 200px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
  
  const fileName = filePath.split(/[/\\]/).pop() || filePath;
  
  // Professional VS Code-style icons
  const icons = {
    sparkle: `<svg width="16" height="16" viewBox="0 0 16 16" fill="#C586C0"><path d="M8 0l1.5 4.5L14 6l-4.5 1.5L8 12l-1.5-4.5L2 6l4.5-1.5L8 0z"/></svg>`,
    
    file: `<svg width="16" height="16" viewBox="0 0 16 16" fill="#007ACC"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/></svg>`,
    
    list: `<svg width="16" height="16" viewBox="0 0 16 16" fill="#4EC9B0"><path d="M2 4h12v1H2V4zm0 3h12v1H2V7zm0 3h12v1H2v-1z"/></svg>`,
    
    layers: `<svg width="16" height="16" viewBox="0 0 16 16" fill="#DCDCAA"><path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5 8.186 1.113zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.629 13.09a1 1 0 0 1-.629-.928V3.5a.5.5 0 0 1 .314-.464L7.443.184z"/></svg>`,
    
    references: `<svg width="16" height="16" viewBox="0 0 16 16" fill="#6A9955"><path d="M4.715 6.542L3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z"/><path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z"/></svg>`,
    
    target: `<svg width="16" height="16" viewBox="0 0 16 16" fill="#CE9178"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M8 13A5 5 0 1 1 8 3a5 5 0 0 1 0 10zm0 1A6 6 0 1 0 8 2a6 6 0 0 0 0 12z"/><path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M9.5 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/></svg>`
  };
  
  menu.innerHTML = `
    <div class="menu-header" style="
      padding: 6px 10px; 
      border-bottom: 1px solid #3c3c3c; 
      font-size: 11px; 
      font-weight: 600; 
      display: flex; 
      align-items: center; 
      gap: 6px;
      color: #cccccc;
    ">
      ${icons.sparkle}
      <span style="color: #C586C0;">AI Analysis</span>
      <span style="color: #858585; font-weight: 400; margin-left: auto; font-size: 10px;">${fileName}</span>
    </div>
    
    <div class="menu-item" data-action="explain" style="
      padding: 6px 10px; 
      cursor: pointer; 
      font-size: 12px; 
      color: #cccccc; 
      transition: background 0.15s ease;
      display: flex; 
      align-items: center; 
      gap: 8px;
      border-radius: 3px;
      margin: 2px;
    ">
      ${icons.file}
      <span>Explain this file</span>
    </div>
    
    <div class="menu-item" data-action="summary" style="
      padding: 6px 10px; 
      cursor: pointer; 
      font-size: 12px; 
      color: #cccccc; 
      transition: background 0.15s ease;
      display: flex; 
      align-items: center; 
      gap: 8px;
      border-radius: 3px;
      margin: 2px;
    ">
      ${icons.list}
      <span>High-level summary</span>
    </div>
    
    <div class="menu-item" data-action="architecture" style="
      padding: 6px 10px; 
      cursor: pointer; 
      font-size: 12px; 
      color: #cccccc; 
      transition: background 0.15s ease;
      display: flex; 
      align-items: center; 
      gap: 8px;
      border-radius: 3px;
      margin: 2px;
    ">
      ${icons.layers}
      <span>Architecture overview</span>
    </div>
    
    <div class="menu-item" data-action="dependencies" style="
      padding: 6px 10px; 
      cursor: pointer; 
      font-size: 12px; 
      color: #cccccc; 
      transition: background 0.15s ease;
      display: flex; 
      align-items: center; 
      gap: 8px;
      border-radius: 3px;
      margin: 2px;
    ">
      ${icons.references}
      <span>Show dependencies</span>
    </div>
    
    <div class="menu-separator" style="height: 1px; background: #3c3c3c; margin: 4px 2px;"></div>
    
    <div class="menu-item" data-action="analyze-all" style="
      padding: 6px 10px; 
      cursor: pointer; 
      font-size: 12px; 
      color: #cccccc; 
      transition: background 0.15s ease;
      display: flex; 
      align-items: center; 
      gap: 8px;
      border-radius: 3px;
      margin: 2px;
    ">
      ${icons.target}
      <span>Analyze all results</span>
    </div>
  `;
  
  document.body.appendChild(menu);
  
  // Hover effects
  menu.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
      (item as HTMLElement).style.background = '#2a2d2e';
    });
    item.addEventListener('mouseleave', () => {
      (item as HTMLElement).style.background = 'transparent';
    });
  });
  
  // Handle clicks
  menu.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const menuItem = target.closest('.menu-item') as HTMLElement;
    if (!menuItem) return;
    
    const action = menuItem.getAttribute('data-action');
    menu.remove();
    
    switch (action) {
      case 'explain':
        await this.explainFile(filePath);
        break;
      case 'summary':
        await this.summarizeFile(filePath);
        break;
      case 'architecture':
        await this.analyzeArchitecture(filePath);
        break;
      case 'dependencies':
        await this.analyzeDependencies(filePath);
        break;
      case 'analyze-all':
        await this.analyzeAllResults();
        break;
    }
  });
  
  // Close on click outside
  setTimeout(() => {
    document.addEventListener('click', function closeMenu() {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    });
  }, 100);
}

private async explainFile(filePath: string): Promise<void> {
  try {
    this.showNotification('📖 Reading file...', 'info');
    
    const fileContent = await this.readFileContent(filePath);
    if (!fileContent) {
      this.showNotification('❌ Could not read file', 'warning');
      return;
    }
    
    const fileName = filePath.split(/[/\\]/).pop();
    const prompt = `Please explain this file in detail:

File: ${fileName}
Path: ${filePath}

Code:
\`\`\`
${fileContent}
\`\`\`

Provide:
1. **Purpose**: What does this file do?
2. **Key Components**: Main classes/functions/exports
3. **Dependencies**: What it imports/requires
4. **Usage**: How it's typically used
5. **Notable Features**: Important patterns or logic`;

    await this.sendToAIAssistant(prompt, '📖 File Explanation');
    
  } catch (error) {
    console.error('[AIAnalysis] Explain failed:', error);
    this.showNotification('❌ Analysis failed', 'warning');
  }
}

private async summarizeFile(filePath: string): Promise<void> {
  try {
    this.showNotification('📝 Analyzing...', 'info');
    
    const fileContent = await this.readFileContent(filePath);
    if (!fileContent) {
      this.showNotification('❌ Could not read file', 'warning');
      return;
    }
    
    const fileName = filePath.split(/[/\\]/).pop();
    const prompt = `Provide a concise high-level summary of this file:

File: ${fileName}

Code:
\`\`\`
${fileContent}
\`\`\`

Give me:
- **One-line summary**: What it does in one sentence
- **Main responsibilities**: 3-5 bullet points
- **Key exports/APIs**: Main functions/classes
- **Integration points**: How it connects to other parts`;

    await this.sendToAIAssistant(prompt, '📝 High-Level Summary');
    
  } catch (error) {
    console.error('[AIAnalysis] Summary failed:', error);
    this.showNotification('❌ Analysis failed', 'warning');
  }
}

private async analyzeArchitecture(filePath: string): Promise<void> {
  try {
    this.showNotification('🏗️ Analyzing architecture...', 'info');
    
    const fileContent = await this.readFileContent(filePath);
    if (!fileContent) {
      this.showNotification('❌ Could not read file', 'warning');
      return;
    }
    
    const fileName = filePath.split(/[/\\]/).pop();
    const prompt = `Analyze the architecture and design patterns in this file:

File: ${fileName}

Code:
\`\`\`
${fileContent}
\`\`\`

Provide:
1. **Architecture Pattern**: What pattern does it follow? (MVC, Service, Manager, etc.)
2. **Design Principles**: SOLID principles, separation of concerns
3. **Structure**: How the code is organized
4. **Relationships**: How components interact
5. **Data Flow**: How data moves through the file`;

    await this.sendToAIAssistant(prompt, '🏗️ Architecture Overview');
    
  } catch (error) {
    console.error('[AIAnalysis] Architecture failed:', error);
    this.showNotification('❌ Analysis failed', 'warning');
  }
}

private async analyzeDependencies(filePath: string): Promise<void> {
  try {
    this.showNotification('🔗 Analyzing dependencies...', 'info');
    
    const fileContent = await this.readFileContent(filePath);
    if (!fileContent) {
      this.showNotification('❌ Could not read file', 'warning');
      return;
    }
    
    const fileName = filePath.split(/[/\\]/).pop();
    const prompt = `Analyze the dependencies and relationships for this file:

File: ${fileName}

Code:
\`\`\`
${fileContent}
\`\`\`

Show me:
1. **Imports**: What this file imports/requires
2. **Exports**: What this file provides to others
3. **Internal Dependencies**: Other project files it uses
4. **External Dependencies**: npm packages/libraries
5. **Usage**: Where this file is likely used
6. **Dependency Graph**: Visual representation if possible`;

    await this.sendToAIAssistant(prompt, '🔗 Dependency Analysis');
    
  } catch (error) {
    console.error('[AIAnalysis] Dependencies failed:', error);
    this.showNotification('❌ Analysis failed', 'warning');
  }
}

private async analyzeAllResults(): Promise<void> {
  try {
    const files = Array.from(this.aiSuggestedFiles);
    
    if (files.length === 0) {
      this.showNotification('No files to analyze', 'info');
      return;
    }
    
    this.showNotification(`🎯 Analyzing ${files.length} files...`, 'info');
    
    const fileList = files.map(f => {
      const name = f.split(/[/\\]/).pop();
      return `- ${name} (${f})`;
    }).join('\n');
    
    const prompt = `I found these ${files.length} files using AI search. Please provide a high-level overview:

Files:
${fileList}

Based on the file names and paths, provide:
1. **Overall Purpose**: What do these files collectively do?
2. **Module/Feature**: What feature or module do they belong to?
3. **Architecture**: How might they work together?
4. **Key Files**: Which files are likely most important?
5. **Recommended Reading Order**: What order should I read them to understand the system?

Note: This is based on file names only. I can open specific files for detailed analysis.`;

    await this.sendToAIAssistant(prompt, '🎯 Multi-File Analysis');
    
  } catch (error) {
    console.error('[AIAnalysis] Multi-file failed:', error);
    this.showNotification('❌ Analysis failed', 'warning');
  }
}

private async readFileContent(filePath: string): Promise<string | null> {
  try {
    // Try to read from Monaco editor if file is open
    const editor = (window as any).editor;
    if (editor && editor.getModel) {
      const model = editor.getModel();
      if (model && model.uri && model.uri.path.includes(filePath)) {
        return model.getValue();
      }
    }
    
    // Try to read from file system
    if (typeof (window as any).fs !== 'undefined') {
      const fs = (window as any).fs;
      if (fs.readFile) {
        const content = await fs.readFile(filePath, { encoding: 'utf8' });
        return content;
      }
    }
    
    // Try global file system
    if (typeof (window as any).fileSystem !== 'undefined') {
      const fileSystem = (window as any).fileSystem;
      const content = await fileSystem.readFile(filePath);
      return content;
    }
    
    return null;
  } catch (error) {
    console.error('[AIAnalysis] Read file failed:', error);
    return null;
  }
}

private async sendToAIAssistant(prompt: string, title: string): Promise<void> {
  // Try to send to AI Assistant panel
  const assistantInput = document.querySelector('.assistant-input, .ai-input, textarea[placeholder*="Ask"]') as HTMLTextAreaElement;
  
  if (assistantInput) {
    assistantInput.value = prompt;
    assistantInput.focus();
    
    // Trigger input event
    assistantInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Try to find and click send button
    const sendBtn = document.querySelector('.send-button, button[title*="Send"]') as HTMLElement;
    if (sendBtn) {
      setTimeout(() => sendBtn.click(), 100);
      this.showNotification(`✨ ${title} sent to AI Assistant`, 'success');
    } else {
      this.showNotification(`📋 ${title} ready - Press Enter to send`, 'info');
    }
  } else {
    // Fallback: Copy to clipboard
    await navigator.clipboard.writeText(prompt);
    this.showNotification(`📋 ${title} copied! Paste in AI Assistant`, 'info');
  }
}
  private isAISuggested(filePath: string): boolean {
    if (!filePath || this.aiSuggestedFiles.size === 0) return false;
    
    const normalizedPath = filePath.replace(/\//g, '\\');
    
    for (const suggestedPath of this.aiSuggestedFiles) {
      const normalizedSuggestedPath = suggestedPath.replace(/\//g, '\\');
      if (normalizedPath === normalizedSuggestedPath || normalizedPath.endsWith(normalizedSuggestedPath)) {
        return true;
      }
    }
    
    return false;
  }

  private isFileModified(filePath: string): boolean {
    if (!filePath) return false;
    
    const normalizedPath = filePath.replace(/\//g, '\\');
    
    for (const modifiedPath of this.modifiedFiles) {
      const normalizedModifiedPath = modifiedPath.replace(/\//g, '\\');
      if (normalizedPath === normalizedModifiedPath || normalizedPath.endsWith(normalizedModifiedPath)) {
        return true;
      }
    }
    
    return false;
  }

  private isFolder(element: HTMLElement): boolean {
    if (element.getAttribute('data-is-directory') === 'true') {
      return true;
    }
    
    return element.classList.contains('directory') || 
           element.classList.contains('integrated-folder-header') ||
           element.classList.contains('folder') ||
           element.classList.contains('folder-item');
  }

  private getFileName(element: HTMLElement): string {
    const dataFileName = element.getAttribute('data-file-name') || element.getAttribute('data-name');
    if (dataFileName) {
      return dataFileName;
    }
    
    const nameSpan = element.querySelector('.file-name, [class*="name"]');
    if (nameSpan) {
      return nameSpan.textContent?.trim() || '';
    }
    
    const path = element.getAttribute('data-path');
    if (path) {
      return path.split(/[/\\]/).pop() || '';
    }
    
    const text = element.textContent?.trim() || '';
    const firstLine = text.split('\n')[0];
    return firstLine.replace(/^[📁📂📄📷🟨⚛️🔵☕⚙️🌐🎨📋📦]\s*/, '').split(/\s+\d/)[0].trim();
  }
private createAnalysisSummaryPanel(): void {
  const panel = document.createElement('div');
  panel.id = 'ai-analysis-summary-panel';
  panel.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 420px;
    width: 350px;
    max-height: 400px;
    background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
    border: 1px solid #8b5cf6;
    border-radius: 8px;
    padding: 12px;
    z-index: 10000;
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3);
    overflow-y: auto;
  `;
  
  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <h3 style="margin: 0; color: #8b5cf6; font-size: 14px;">✨ AI Code Analysis</h3>
      <button id="close-analysis-panel" style="background: none; border: none; color: #888; cursor: pointer; font-size: 18px;">×</button>
    </div>
    <div id="analysis-content" style="font-size: 12px; color: #ccc; line-height: 1.6;">
      <p style="color: #888;">Right-click on any purple-highlighted file to analyze it.</p>
    </div>
  `;
  
  document.body.appendChild(panel);
  
  document.getElementById('close-analysis-panel')?.addEventListener('click', () => {
    panel.remove();
  });
}
  private shouldShowFile(fileName: string, isDirectory: boolean, filePath: string): boolean {
    if (!fileName) return true;

    if (this.aiSearchMode && this.searchFilter && this.aiSuggestedFiles.size > 0) {
      if (isDirectory) return true;
      return this.isAISuggested(filePath);
    }

    if (this.searchFilter && !fileName.toLowerCase().includes(this.searchFilter)) {
      return false;
    }

    if (!this.showHiddenFiles && fileName.startsWith('.')) {
      return false;
    }

    if (this.viewMode === 'modified-only') {
      if (isDirectory) return true;
      return this.isFileModified(filePath);
    }

    const ext = this.getFileExtension(fileName);
    
    switch (this.viewMode) {
      case 'all':
        return true;
      case 'no-code':
        if (isDirectory) return true;
        return !this.FILE_TYPES.code.includes(ext) && !this.FILE_TYPES.style.includes(ext);
      case 'structure':
        return isDirectory;
      case 'minimal':
        if (isDirectory) return true;
        return this.FILE_TYPES.docs.includes(ext) || this.FILE_TYPES.config.includes(ext);
      case 'code-only':
        if (isDirectory) return true;
        return this.FILE_TYPES.code.includes(ext) || this.FILE_TYPES.style.includes(ext);
      default:
        return true;
    }
  }

  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.slice(lastDot).toLowerCase() : '';
  }

  private updateFilterStatus(visible: number, total: number): void {
    const statusElement = document.getElementById('filter-status-persistent');
    if (statusElement) {
      if (this.aiSearchMode && this.aiSuggestedFiles.size > 0) {
        statusElement.textContent = `✨ AI found ${visible} files`;
      } else if (this.viewMode !== 'all' || this.searchFilter || !this.showHiddenFiles) {
        if (this.viewMode === 'modified-only') {
          statusElement.textContent = `${visible} modified of ${total}`;
        } else {
          statusElement.textContent = `${visible} of ${total}`;
        }
      } else {
        statusElement.textContent = '';
      }
    }
  }

  private updateFileCount(total: number): void {
    const countElement = document.getElementById('file-count-persistent');
    if (countElement) {
      countElement.textContent = `${total} files`;
    }
  }

  private showNotification(message: string, type: 'info' | 'success' | 'warning' = 'info'): void {
    const existing = document.querySelector('.filter-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `filter-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.2s ease-in';
      setTimeout(() => notification.remove(), 200);
    }, 3000);
  }

  private getModeName(mode: string): string {
    const names: Record<string, string> = {
      'all': 'All files',
      'no-code': 'No code',
      'structure': 'Structure',
      'minimal': 'Minimal',
      'code-only': 'Code only',
      'modified-only': `${this.modifiedFiles.size} modified`
    };
    return names[mode] || mode;
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.key === 'c') {
        e.preventDefault();
        this.setViewMode(this.viewMode === 'no-code' ? 'all' : 'no-code');
      }
      else if (e.altKey && e.key === 'a') {
        e.preventDefault();
        this.setViewMode('all');
      }
      else if (e.altKey && e.key === 's') {
        e.preventDefault();
        this.setViewMode('structure');
      }
      else if (e.altKey && e.key === 'd') {
        e.preventDefault();
        this.setViewMode('minimal');
      }
      else if (e.altKey && e.key === 'm') {
        e.preventDefault();
        this.setViewMode(this.viewMode === 'modified-only' ? 'all' : 'modified-only');
      }
      else if (e.altKey && e.key === 'i') {
        e.preventDefault();
        const aiToggle = document.getElementById('ai-search-toggle') as HTMLElement;
        if (aiToggle) aiToggle.click();
      }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        const searchInput = document.getElementById('explorer-search-input-persistent') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      // ✅ NEW: Ctrl+Shift+F for Content Search
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        const contentToggle = document.getElementById('content-search-toggle') as HTMLElement;
        if (contentToggle) {
          contentToggle.click();
          // Focus the search input
          setTimeout(() => {
            const searchInput = document.getElementById('explorer-search-input-persistent') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
              searchInput.select();
            }
          }, 100);
        }
      }
    });
  }

  public cleanup(): void {
    if (this.protectionInterval) {
      clearInterval(this.protectionInterval);
    }
  }

  public reset(): void {
    this.viewMode = 'all';
    this.searchFilter = '';
    this.showHiddenFiles = false;
    this.aiSearchMode = false;
    this.aiSuggestedFiles.clear();
    
    const searchInput = document.getElementById('explorer-search-input-persistent') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
      searchInput.classList.remove('ai-mode');
    }
    
    const aiToggle = document.getElementById('ai-search-toggle');
    if (aiToggle) aiToggle.classList.remove('active');
    
    const searchIcon = document.querySelector('.search-icon') as HTMLElement;
    if (searchIcon) {
      searchIcon.innerHTML = this.ICONS.search;
      searchIcon.style.color = '';
    }
    
    document.querySelectorAll('.view-mode-btn-persistent[data-mode]').forEach(btn => {
      btn.classList.remove('active');
    });
    const allButton = document.querySelector('.view-mode-btn-persistent[data-mode="all"]');
    if (allButton) allButton.classList.add('active');
    
    const hiddenToggle = document.getElementById('hidden-toggle-persistent');
    if (hiddenToggle) {
      hiddenToggle.innerHTML = this.ICONS.hiddenOff;
      hiddenToggle.classList.remove('active');
    }
    
    const modifiedToggle = document.getElementById('modified-toggle-persistent');
    if (modifiedToggle) modifiedToggle.classList.remove('active');
    
    this.updateSlidingIndicator('all');
    
    const allHiddenItems = document.querySelectorAll('.filter-hidden, .ai-suggested');
    allHiddenItems.forEach(item => {
      item.classList.remove('filter-hidden', 'ai-suggested');
    });
    
    setTimeout(() => {
      this.applyFilters();
    }, 50);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

let robustFilter: RobustExplorerFilter | null = null;

function initRobustFilter() {
  if (!robustFilter) {
    robustFilter = new RobustExplorerFilter();
    robustFilter.init();
    (window as any).robustFilter = robustFilter;
    console.log('[RobustFilter] ✅ Initialized with AI!');
  }
}

initRobustFilter();
setTimeout(initRobustFilter, 1000);
setTimeout(initRobustFilter, 3000);
window.addEventListener('load', initRobustFilter);

export default RobustExplorerFilter;