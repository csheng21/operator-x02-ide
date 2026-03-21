// Enhanced TabManager.ts with Context Menu Support and Modified File Tracking
import { getLanguageFromPath } from '../utils/fileUtils';
import { markFileAsModified, markFileAsSaved, isFileModified } from '../ide/fileExplorer/fileTreeRenderer';

// ✅ Polyfill for requestIdleCallback (not available in all environments)
const requestIdleCallback = (window as any).requestIdleCallback || 
  ((cb: Function) => setTimeout(cb, 1));

// ============================================================================
// CUSTOM SAVE DIALOG - Professional UI with Yes/No/Cancel
// ============================================================================

type SaveDialogResult = 'yes' | 'no' | 'cancel';

interface SaveDialogOptions {
  fileName: string;
  onResult: (result: SaveDialogResult) => void;
}

/**
 * Add styles for the custom save dialog
 */
function addSaveDialogStyles(): void {
  if (document.getElementById('save-dialog-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'save-dialog-styles';
  style.textContent = `
    /* ═══════════════════════════════════════════════════════════════════════
       CUSTOM SAVE DIALOG - Professional Minimal Style
       ═══════════════════════════════════════════════════════════════════════ */
    
    @keyframes saveDialogFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes saveDialogSlideIn {
      from { 
        opacity: 0; 
        transform: translate(-50%, -50%) scale(0.95);
      }
      to { 
        opacity: 1; 
        transform: translate(-50%, -50%) scale(1);
      }
    }
    
    .save-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(2px);
      z-index: 10000;
      animation: saveDialogFadeIn 0.15s ease-out;
    }
    
    .save-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 8px;
      min-width: 400px;
      max-width: 480px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      z-index: 10001;
      animation: saveDialogSlideIn 0.15s ease-out;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .save-dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid #2d2d2d;
    }
    
    .save-dialog-title {
      font-size: 13px;
      font-weight: 500;
      color: #cccccc;
    }
    
    .save-dialog-close {
      width: 22px;
      height: 22px;
      border: none;
      background: transparent;
      border-radius: 4px;
      color: #808080;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      font-size: 16px;
      line-height: 1;
    }
    
    .save-dialog-close:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #cccccc;
    }
    
    .save-dialog-body {
      padding: 20px 16px;
    }
    
    .save-dialog-message h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
    }
    
    .save-dialog-message p {
      margin: 0;
      font-size: 13px;
      color: #9d9d9d;
      line-height: 1.5;
    }
    
    .save-dialog-message p + p {
      margin-top: 8px;
      font-size: 12px;
      color: #6d6d6d;
    }
    
    .save-dialog-filename {
      display: inline;
      color: #ffffff;
      font-weight: 500;
    }
    
    .save-dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 14px 16px;
      background: #181818;
      border-top: 1px solid #2d2d2d;
    }
    
    .save-dialog-btn {
      padding: 7px 14px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 400;
      cursor: pointer;
      transition: all 0.15s;
      border: 1px solid transparent;
      min-width: 80px;
    }
    
    .save-dialog-btn:focus {
      outline: none;
    }
    
    .save-dialog-btn-yes {
      background: #0e639c;
      color: white;
      border-color: #0e639c;
    }
    
    .save-dialog-btn-yes:hover {
      background: #1177bb;
    }
    
    .save-dialog-btn-yes:focus {
      outline: 1px solid #0e639c;
      outline-offset: 2px;
    }
    
    .save-dialog-btn-no {
      background: transparent;
      color: #cccccc;
      border-color: #3c3c3c;
    }
    
    .save-dialog-btn-no:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: #4c4c4c;
    }
    
    .save-dialog-btn-cancel {
      background: transparent;
      color: #cccccc;
      border-color: #3c3c3c;
    }
    
    .save-dialog-btn-cancel:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: #4c4c4c;
    }
    
    /* Keyboard hints */
    .save-dialog-hint {
      display: flex;
      justify-content: center;
      gap: 16px;
      padding: 8px 16px;
      border-top: 1px solid #2d2d2d;
    }
    
    .save-dialog-hint span {
      font-size: 11px;
      color: #5d5d5d;
    }
    
    .save-dialog-hint kbd {
      background: #2d2d2d;
      padding: 2px 5px;
      border-radius: 3px;
      font-family: inherit;
      font-size: 10px;
      color: #808080;
      margin-right: 4px;
      border: 1px solid #3c3c3c;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Show custom save dialog with Yes/No/Cancel buttons
 */
function showSaveDialog(options: SaveDialogOptions): void {
  // Add styles if not already added
  addSaveDialogStyles();
  
  // Remove any existing dialog
  const existing = document.querySelector('.save-dialog-overlay');
  if (existing) existing.remove();
  const existingDialog = document.querySelector('.save-dialog');
  if (existingDialog) existingDialog.remove();
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'save-dialog-overlay';
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'save-dialog';
  dialog.innerHTML = `
    <div class="save-dialog-header">
      <div class="save-dialog-title">Operator X02 Code IDE</div>
      <button class="save-dialog-close" data-action="cancel" title="Cancel">×</button>
    </div>
    <div class="save-dialog-body">
      <div class="save-dialog-message">
        <h3>Do you want to save the changes you made to <span class="save-dialog-filename">${options.fileName}</span>?</h3>
        <p>Your changes will be lost if you don't save them.</p>
      </div>
    </div>
    <div class="save-dialog-footer">
      <button class="save-dialog-btn save-dialog-btn-cancel" data-action="cancel">Cancel</button>
      <button class="save-dialog-btn save-dialog-btn-no" data-action="no">Don't Save</button>
      <button class="save-dialog-btn save-dialog-btn-yes" data-action="yes">Save</button>
    </div>
    <div class="save-dialog-hint">
      <span><kbd>Enter</kbd> Save</span>
      <span><kbd>N</kbd> Don't Save</span>
      <span><kbd>Esc</kbd> Cancel</span>
    </div>
  `;
  
  // Add to DOM
  document.body.appendChild(overlay);
  document.body.appendChild(dialog);
  
  // Focus the Save button
  const saveBtn = dialog.querySelector('.save-dialog-btn-yes') as HTMLButtonElement;
  if (saveBtn) saveBtn.focus();
  
  // Handle result
  const handleResult = (result: SaveDialogResult) => {
    overlay.remove();
    dialog.remove();
    document.removeEventListener('keydown', keyHandler);
    options.onResult(result);
  };
  
  // Click handlers
  dialog.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const action = target.dataset.action as SaveDialogResult;
    if (action) {
      handleResult(action);
    }
  });
  
  // Overlay click = cancel
  overlay.addEventListener('click', () => handleResult('cancel'));
  
  // Keyboard handlers
  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleResult('cancel');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleResult('yes');
    } else if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      handleResult('no');
    }
  };
  document.addEventListener('keydown', keyHandler);
  
  console.log('📋 [SaveDialog] Showing save dialog for:', options.fileName);
}

// Expose globally for external use
(window as any).showSaveDialog = showSaveDialog;

// ============================================================================
// TAB INTERFACE AND CLASS
// ============================================================================

interface Tab {
  id: string;
  path: string;
  name: string;
  model: any;
  language: string;
  modified: boolean;
  content: string;
  originalContent: string;
  lastSaved: Date;
  fullPath?: string;
  fileName?: string;
}

export class TabManager {
  private tabs: Tab[] = [];
  private activeTabId: string | null = null;
  private tabContainer: HTMLElement;
  private modelMap = new Map<string, any>();
  private debugMode = false; // Set to true for verbose logging
  private contentHistory: { [tabId: string]: string[] } = {};
  
  // 🆕 ADD THIS: Track Monaco change listeners for cleanup
  private modelListeners = new Map<string, any>();
  
  // ✅ Track current file for external access
  public currentFile: { name: string; path: string; language: string } | null = null;
  
  // 🆕 Tab persistence storage key
  private static readonly TAB_STORAGE_KEY = 'ide-open-tabs';
  private static readonly TAB_ACTIVE_KEY = 'ide-active-tab';
  private persistenceInitialized = false;

  constructor() {
    this.tabContainer = document.createElement('div');
    this.tabContainer.className = 'tab-container';
    this.tabContainer.id = 'editor-tab-container';
    
    this.setupEmergencyRecovery();
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.insertTabContainer();
        this.setupTabShortcuts();
        this.setupGlobalContextMenuHandler();
        this.inspectDOMStructure();
        this.setupTabPersistence(); // 🆕 Initialize persistence
      });
    } else {
      this.insertTabContainer();
      this.setupTabShortcuts();
      this.setupGlobalContextMenuHandler();
      setTimeout(() => this.inspectDOMStructure(), 500);
      this.setupTabPersistence(); // 🆕 Initialize persistence
    }
  }
  
  // =========================================================================
  // 🆕 TAB PERSISTENCE SYSTEM
  // =========================================================================
  
  /**
   * Initialize tab persistence - saves tabs on unload, restores on startup
   */
  private setupTabPersistence(): void {
    if (this.persistenceInitialized) return;
    this.persistenceInitialized = true;
    
    console.log('💾 [TabPersist] Initializing tab persistence...');
    
    // Save tabs before page unload
    window.addEventListener('beforeunload', () => {
      this.saveTabsToStorage();
    });
    
    // Save tabs periodically (every 30 seconds) in case of crash
    setInterval(() => {
      this.saveTabsToStorage();
    }, 30000);
    
    // Expose persistence functions globally
    (window as any).tabPersistence = {
      save: () => this.saveTabsToStorage(),
      restore: () => this.restoreTabsFromStorage(),
      get: () => this.getPersistedTabs(),
      has: () => this.hasPersistedTabs(),
      clear: () => this.clearPersistedTabs()
    };
    
    console.log('✅ [TabPersist] Tab persistence ready');
    console.log('   💡 Use window.tabPersistence.save() / .restore() / .get() / .has() / .clear()');
  }
  
  /**
   * Save all open tabs to localStorage
   */
  public saveTabsToStorage(): void {
    try {
      if (this.tabs.length === 0) {
        localStorage.removeItem(TabManager.TAB_STORAGE_KEY);
        localStorage.removeItem(TabManager.TAB_ACTIVE_KEY);
        return;
      }
      
      const tabsToSave = this.tabs.map(tab => ({
        path: tab.path,
        name: tab.name,
        content: tab.content || '',
        language: tab.language || 'plaintext',
        isActive: tab.id === this.activeTabId
      }));
      
      localStorage.setItem(TabManager.TAB_STORAGE_KEY, JSON.stringify(tabsToSave));
      
      // Save active tab path separately
      const activeTab = this.tabs.find(t => t.id === this.activeTabId);
      if (activeTab) {
        localStorage.setItem(TabManager.TAB_ACTIVE_KEY, activeTab.path);
      }
      
      console.log(`💾 [TabPersist] Saved ${tabsToSave.length} tabs:`, tabsToSave.map(t => t.name));
    } catch (error) {
      console.error('❌ [TabPersist] Error saving tabs:', error);
    }
  }
  
  /**
   * Get persisted tabs from localStorage
   */
  public getPersistedTabs(): Array<{path: string, name: string, content: string, language: string, isActive: boolean}> {
    try {
      const savedTabsStr = localStorage.getItem(TabManager.TAB_STORAGE_KEY);
      if (!savedTabsStr) return [];
      return JSON.parse(savedTabsStr);
    } catch (error) {
      console.error('❌ [TabPersist] Error loading persisted tabs:', error);
      return [];
    }
  }
  
  /**
   * Check if there are persisted tabs
   */
  public hasPersistedTabs(): boolean {
    try {
      const savedTabsStr = localStorage.getItem(TabManager.TAB_STORAGE_KEY);
      if (!savedTabsStr) return false;
      const tabs = JSON.parse(savedTabsStr);
      return Array.isArray(tabs) && tabs.length > 0;
    } catch {
      return false;
    }
  }
  
  /**
   * Clear persisted tabs from localStorage
   */
  public clearPersistedTabs(): void {
    localStorage.removeItem(TabManager.TAB_STORAGE_KEY);
    localStorage.removeItem(TabManager.TAB_ACTIVE_KEY);
    console.log('🧹 [TabPersist] Cleared persisted tabs');
  }
  
  /**
   * Show welcome content in the editor when no tabs are open
   */
  private showWelcomeContent(editor: any): void {
    // Use the global animated welcome screen function
    const showWelcomeScreen = (window as any).showWelcomeScreen;
    if (showWelcomeScreen) {
      showWelcomeScreen();
      editor.updateOptions({ readOnly: true });
      console.log('✅ [TabManager] Animated welcome screen displayed');
    } else {
      // Fallback to simple welcome if animated not available
      const welcomeContent = `/*
 * ╔════════════════════════════════════════════════════════════════╗
 * ║                     OPERATOR X02                               ║
 * ║                   AI-Powered Code IDE                          ║
 * ╚════════════════════════════════════════════════════════════════╝
 *
 * 🌐 Visit: https://www.operatorx02.com
 *
 * Quick Start:
 *   Ctrl+O          Open File
 *   Ctrl+Shift+I    AI Code Generation
 *   F5              Run Project
 *
 * 📂 Open a file from the explorer to start coding!
 */
`;
      try {
        const monaco = (window as any).monaco;
        if (monaco) {
          const welcomeUri = monaco.Uri.parse('welcome://operator-x02');
          let welcomeModel = monaco.editor.getModel(welcomeUri);
          
          if (!welcomeModel) {
            welcomeModel = monaco.editor.createModel(welcomeContent, 'typescript', welcomeUri);
          }
          
          editor.setModel(welcomeModel);
          editor.updateOptions({ readOnly: true });
        }
      } catch (error) {
        console.warn('⚠️ [TabManager] Could not show welcome content:', error);
        editor.setModel(null);
      }
    }
  }
  
  /**
   * Restore tabs from localStorage
   * Call this during app initialization if you want auto-restore
   */
  public async restoreTabsFromStorage(): Promise<number> {
    const persistedTabs = this.getPersistedTabs();
    
    if (persistedTabs.length === 0) {
      console.log('📂 [TabPersist] No tabs to restore');
      return 0;
    }
    
    console.log(`🔄 [TabPersist] Restoring ${persistedTabs.length} tabs...`);
    
    let restoredCount = 0;
    let activeTabPath: string | null = null;
    
    // Use window.openFileInTab for proper file loading with content
    const openFileInTab = (window as any).openFileInTab;
    
    for (const tab of persistedTabs) {
      try {
        if (tab.isActive) {
          activeTabPath = tab.path;
        }
        
        // Use the global openFileInTab function which properly loads content
        if (openFileInTab) {
          await openFileInTab(tab.path);
          console.log(`✅ [TabPersist] Restored via openFileInTab: ${tab.name}`);
          restoredCount++;
        } else {
          // Fallback: Try to read content from disk
          let content = tab.content || '';
          
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            content = await invoke('read_file_content', { path: tab.path }) as string;
            console.log(`📄 [TabPersist] Read content from disk: ${tab.name} (${content.length} chars)`);
          } catch {
            try {
              const { readTextFile } = await import('@tauri-apps/plugin-fs');
              content = await readTextFile(tab.path);
              console.log(`📄 [TabPersist] Read via readTextFile: ${tab.name} (${content.length} chars)`);
            } catch (readError) {
              console.warn(`⚠️ [TabPersist] Using cached content for: ${tab.name}`, readError);
            }
          }
          
          // Only add tab if we have actual content
          if (content && content.length > 0) {
            this.addTab(tab.path, content);
            console.log(`✅ [TabPersist] Restored with content: ${tab.name}`);
            restoredCount++;
          } else {
            console.warn(`⚠️ [TabPersist] Skipped empty content for: ${tab.name}`);
          }
        }
        
        // Small delay between tabs to avoid race conditions
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.warn(`❌ [TabPersist] Failed to restore: ${tab.name}`, error);
      }
    }
    
    // Activate the previously active tab
    if (activeTabPath) {
      // Wait a bit for tabs to settle
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const activeTab = this.tabs.find(t => t.path === activeTabPath);
      if (activeTab) {
        this.activateTab(activeTab.id);
        console.log(`🎯 [TabPersist] Activated: ${activeTab.name}`);
      }
    }
    
    // Clear persisted tabs after successful restoration
    if (restoredCount > 0) {
      this.clearPersistedTabs();
    }
    
    console.log(`✅ [TabPersist] Restored ${restoredCount}/${persistedTabs.length} tabs`);
    return restoredCount;
  }

  private debug(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`🛠 [${timestamp}] TabManager: ${message}`, data || '');
    }
  }

  private setupEmergencyRecovery(): void {
    setInterval(() => {
      this.checkForContentLoss();
    }, 2000);
  }

  private checkForContentLoss(): void {
    if (!this.activeTabId) return;

    const activeTab = this.getActiveTab();
    if (!activeTab) return;

    const editor = window.monaco?.editor?.getEditors()[0];
    if (!editor) return;

    const currentEditorContent = editor.getValue();
    
    if (currentEditorContent.length === 0 && activeTab.content.length > 0) {
      this.debug('🚨 EMERGENCY: Content loss detected, recovering...', {
        tabName: activeTab.name,
        expectedLength: activeTab.content.length,
        actualLength: currentEditorContent.length
      });
      
      editor.setValue(activeTab.content);
      this.debug('🔧 Emergency recovery completed');
    }
  }

  private trackContentChange(tabId: string, content: string, operation: string): void {
    if (!this.contentHistory[tabId]) {
      this.contentHistory[tabId] = [];
    }
    
    const entry = `[${new Date().toLocaleTimeString()}] ${operation}: ${content.length} chars`;
    this.contentHistory[tabId].push(entry);
    
    if (this.contentHistory[tabId].length > 10) {
      this.contentHistory[tabId].shift();
    }
    
    this.debug(`📊 Content tracking for ${tabId}:`, entry);
  }

 // FIXED: tabManager.ts - setupModelChangeTracking method
// Replace the existing setupModelChangeTracking method in your tabManager.ts with this version

/**
 * Setup change tracking for a tab's model
 * This monitors when the file content changes in the editor
 */
private setupModelChangeTracking(tab: Tab): void {
  if (!tab.model) {
    this.debug('⚠️ No model available for change tracking:', tab.name);
    return;
  }
  
  const model = tab.model;
  
  // Set original content for comparison
  if (!tab.originalContent) {
    tab.originalContent = model.getValue();
  }
  
  this.debug('🔗 Setting up change tracking for:', tab.name);
  
  try {
    // ✅ CRITICAL FIX: Check if the model has the method
    if (typeof model.onDidChangeModelContent === 'function') {
      // Monaco Editor standard API
      const changeListener = model.onDidChangeModelContent(() => {
        this.handleContentChange(tab, model);
      });
      
      // Store listener for cleanup
      this.modelListeners.set(tab.id, changeListener);
      this.debug(`✅ Change tracking (event-based) active for: ${tab.name}`);
      
    } else if (typeof model.onDidChangeContent === 'function') {
      // Alternative Monaco API (older versions)
      const changeListener = model.onDidChangeContent(() => {
        this.handleContentChange(tab, model);
      });
      
      this.modelListeners.set(tab.id, changeListener);
      this.debug(`✅ Change tracking (alt event-based) active for: ${tab.name}`);
      
    } else {
      // ✅ FALLBACK: Use polling for change detection
      this.debug('⚠️ Model does not have change event API, using polling fallback');
      this.setupPollingChangeTracking(tab, model);
    }
    
  } catch (error) {
    console.error('❌ Error setting up change tracking:', error);
    // ✅ FALLBACK: Use polling as last resort
    this.setupPollingChangeTracking(tab, model);
  }
}

/**
 * Fallback polling-based change tracking
 * Used when model doesn't support event-based change detection
 */
private setupPollingChangeTracking(tab: Tab, model: any): void {
  this.debug('🔄 Setting up polling-based change tracking for:', tab.name);
  
  let lastContent = model.getValue();
  
  const pollInterval = setInterval(() => {
    try {
      const currentContent = model.getValue();
      
      // Check if content changed
      if (currentContent !== lastContent) {
        lastContent = currentContent;
        this.handleContentChange(tab, model);
      }
    } catch (error) {
      console.error('Error in polling change tracking:', error);
      clearInterval(pollInterval);
    }
  }, 500); // Check every 500ms
  
  // Store interval ID for cleanup
  this.pollingIntervals = this.pollingIntervals || new Map();
  this.pollingIntervals.set(tab.id, pollInterval);
  
  this.debug(`✅ Polling-based change tracking active for: ${tab.name}`);
}

/**
 * Handle content change for a tab
 * Separated into its own method for reuse
 */
private handleContentChange(tab: Tab, model: any): void {
  const currentContent = model.getValue();
  const wasModified = tab.modified;
  const isModified = currentContent !== tab.originalContent;
  
  // Only update if state changed
  if (isModified !== wasModified) {
    tab.modified = isModified;
    
    this.debug(`📝 File modification state changed: ${tab.name} = ${isModified ? 'MODIFIED' : 'SAVED'}`);
    
    // 🔥 CRITICAL: Update file tree tracking
    if (isModified) {
      this.debug(`✅ Marking as modified in file tree: ${tab.path}`);
      markFileAsModified(tab.path);
    } else {
      this.debug(`✅ Marking as saved in file tree: ${tab.path}`);
      markFileAsSaved(tab.path);
    }
    
    // Update tab visuals
    this.updateTabVisuals(tab.path, isModified);
  }
  
  // Always update content
  tab.content = currentContent;
  
  // Track content change
  this.trackContentChange(tab.id, currentContent, 'editor-change');
}

/**
 * Enhanced cleanup to handle polling intervals
 */
public cleanup(): void {
  this.debug('🧹 Cleaning up TabManager...');
  
  // Dispose model listeners
  this.modelListeners.forEach((listener, tabId) => {
    try {
      if (listener && typeof listener.dispose === 'function') {
        listener.dispose();
      }
    } catch (error) {
      console.error(`Error disposing listener for ${tabId}:`, error);
    }
  });
  this.modelListeners.clear();
  
  // ✅ NEW: Clear polling intervals
  if (this.pollingIntervals) {
    this.pollingIntervals.forEach((interval, tabId) => {
      clearInterval(interval);
    });
    this.pollingIntervals.clear();
  }
  
  // Clear auto-save timer
  if (this.autoSaveTimer) {
    clearTimeout(this.autoSaveTimer);
  }
  
  this.debug('✅ TabManager cleanup complete');
}

// ============================================================================
// ADDITIONAL TYPE DEFINITIONS TO ADD
// ============================================================================
/*
Add this to your Tab interface or class properties:

private modelListeners: Map<string, any> = new Map();
private pollingIntervals?: Map<string, NodeJS.Timeout>;
private autoSaveTimer?: NodeJS.Timeout;
*/

  private insertTabContainer() {
    console.log('🔧 Inserting tab container...');
    
    const monacoSelectors = [
      '#monaco-editor',
      '.monaco-editor',
      '[id*="monaco"]',
      '.editor-container',
      '.editor-content'
    ];
    
    let monacoEditor: HTMLElement | null = null;
    
    for (const selector of monacoSelectors) {
      monacoEditor = document.querySelector(selector);
      if (monacoEditor) {
        console.log(`✅ Found Monaco editor with selector: ${selector}`);
        break;
      }
    }
    
    this.tabContainer.style.cssText = `
      display: flex !important;
      width: 100% !important;
      min-height: 35px !important;
      height: 35px !important;
      background-color: #1e1e1e !important;
      border-bottom: 1px solid #333 !important;
      position: relative !important;
      z-index: 1000 !important;
      flex-shrink: 0 !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      box-sizing: border-box !important;
    `;
    
    if (monacoEditor && monacoEditor.parentElement) {
      monacoEditor.parentElement.insertBefore(this.tabContainer, monacoEditor);
      console.log('✅ Tab container inserted before Monaco editor');
    } else {
      const editorContainers = [
        '.editor-panel',
        '.editor-area',
        '.main-content',
        '.content-area',
        'main'
      ];
      
      let inserted = false;
      for (const selector of editorContainers) {
        const container = document.querySelector(selector);
        if (container) {
          container.insertBefore(this.tabContainer, container.firstChild);
          console.log(`✅ Tab container inserted in ${selector}`);
          inserted = true;
          break;
        }
      }
      
      if (!inserted) {
        document.body.appendChild(this.tabContainer);
        console.log('⚠️ Tab container appended to body as fallback');
        
        this.tabContainer.style.position = 'fixed';
        this.tabContainer.style.top = '40px';
        this.tabContainer.style.left = '0';
        this.tabContainer.style.right = '0';
      }
    }
    
    setTimeout(() => {
      console.log('🔍 Tab container debug:', {
        element: this.tabContainer,
        parent: this.tabContainer.parentElement,
        display: this.tabContainer.style.display,
        height: this.tabContainer.style.height,
        children: this.tabContainer.children.length
      });
    }, 100);
  }

  // ============================================================================
  // CONTEXT MENU SYSTEM
  // ============================================================================

  // Setup global context menu handler for cleaning up
  private setupGlobalContextMenuHandler(): void {
    document.addEventListener('click', (e) => {
      const existingMenu = document.querySelector('.tab-context-menu');
      if (existingMenu && !existingMenu.contains(e.target as Node)) {
        existingMenu.remove();
      }
    });
  }

  // Setup context menu for a tab
  private setupTabContextMenu(tabElement: HTMLElement, tab: Tab): void {
    tabElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Remove any existing context menu
      const existingMenu = document.querySelector('.tab-context-menu');
      if (existingMenu) {
        existingMenu.remove();
      }
      
      // Create context menu
      const contextMenu = document.createElement('div');
      contextMenu.className = 'tab-context-menu';
      contextMenu.style.cssText = `
        position: fixed;
        left: ${e.pageX}px;
        top: ${e.pageY}px;
        background: #2d2d2d;
        border: 1px solid #464647;
        border-radius: 6px;
        padding: 6px 0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        z-index: 10000;
        min-width: 200px;
        font-size: 13px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      `;
      
      // Menu items
      const menuItems = [
        { separator: true },
        { label: '💾 Save', icon: '💾', action: 'save' },
        { label: '💾 Save As...', icon: '💾', action: 'save-as' },
        { separator: true },
        { label: '❌ Close Tab', icon: '✖️', action: 'close-tab' },
        { label: '❌ Close Other Tabs', icon: '🗑️', action: 'close-others' },
        { label: '❌ Close All Tabs', icon: '💀', action: 'close-all' },
        { label: '❌ Close Tabs to the Right', icon: '➡️', action: 'close-right' },
        { label: '❌ Close Tabs to the Left', icon: '⬅️', action: 'close-left' },
        { separator: true },
        { label: '🧹 Close All Unmodified', icon: '🧹', action: 'close-unmodified' },
        { label: '💾 Save All & Close', icon: '💾', action: 'save-all-close' }
      ];
      
      menuItems.forEach(item => {
        if (item.separator) {
          const separator = document.createElement('div');
          separator.style.cssText = `
            height: 1px;
            background: #464647;
            margin: 4px 0;
          `;
          contextMenu.appendChild(separator);
          return;
        }
        
        const menuItem = document.createElement('div');
        menuItem.className = 'tab-context-menu-item';
        menuItem.textContent = item.label;
        menuItem.style.cssText = `
          padding: 8px 16px;
          cursor: pointer;
          color: #cccccc;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 8px;
        `;
        
        menuItem.onmouseover = () => {
          menuItem.style.background = '#37373d';
          menuItem.style.color = '#ffffff';
        };
        
        menuItem.onmouseout = () => {
          menuItem.style.background = 'transparent';
          menuItem.style.color = '#cccccc';
        };
        
        menuItem.onclick = () => {
          this.handleContextMenuAction(item.action!, tab);
          contextMenu.remove();
        };
        
        contextMenu.appendChild(menuItem);
      });
      
      document.body.appendChild(contextMenu);
      
      // Remove menu on click outside
      setTimeout(() => {
        const closeMenu = (e: MouseEvent) => {
          if (!contextMenu.contains(e.target as Node)) {
            contextMenu.remove();
            document.removeEventListener('click', closeMenu);
          }
        };
        document.addEventListener('click', closeMenu);
      }, 10);
    });
  }

  private handleContextMenuAction(action: string, tab: Tab): void {
    console.log(`🎯 Context menu action: ${action} for tab: ${tab.name}`);
    
    switch (action) {
      case 'save':
        this.saveTab(tab.id);
        break;
        
      case 'save-as':
        this.saveTabAs(tab.id);
        break;
        
      case 'close-tab':
        this.closeTab(tab.id);
        break;
        
      case 'close-others':
        this.closeOtherTabs(tab.id);
        break;
        
      case 'close-all':
        this.closeAllTabs();
        break;
        
      case 'close-right':
        this.closeTabsToRight(tab.id);
        break;
        
      case 'close-left':
        this.closeTabsToLeft(tab.id);
        break;
        
      case 'close-unmodified':
        this.closeUnmodifiedTabs();
        break;
        
      case 'save-all-close':
        this.saveAllAndClose();
        break;
    }
  }

  private saveTab(tabId: string): void {
    console.log('💾 Saving tab:', tabId);
    
    // Trigger save operation
    import('../fileOperations/fileOperations').then(module => {
      module.handleSaveOperation(false);
    }).catch(err => {
      console.error('Failed to import save module:', err);
    });
  }

  private saveTabAs(tabId: string): void {
    console.log('💾 Save As for tab:', tabId);
    
    // Trigger save as operation
    import('../fileOperations/fileOperations').then(module => {
      module.handleSaveOperation(true);
    }).catch(err => {
      console.error('Failed to import save module:', err);
    });
  }

  private closeOtherTabs(keepTabId: string): void {
    console.log('🗑️ Closing other tabs except:', keepTabId);
    
    const tabsToClose = this.tabs.filter(tab => tab.id !== keepTabId);
    
    tabsToClose.forEach(tab => {
      this.closeTab(tab.id);
    });
  }

  closeAllTabs(): void {
    console.log('💀 Closing all tabs');
    
    const tabIds = [...this.tabs.map(tab => tab.id)];
    
    tabIds.forEach(id => {
      this.closeTab(id);
    });
  }

  private closeTabsToRight(tabId: string): void {
    const tabIndex = this.tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;
    
    console.log('➡️ Closing tabs to the right of index:', tabIndex);
    
    const tabsToClose = this.tabs.slice(tabIndex + 1);
    
    tabsToClose.forEach(tab => {
      this.closeTab(tab.id);
    });
  }

  private closeTabsToLeft(tabId: string): void {
    const tabIndex = this.tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;
    
    console.log('⬅️ Closing tabs to the left of index:', tabIndex);
    
    const tabsToClose = this.tabs.slice(0, tabIndex);
    
    tabsToClose.forEach(tab => {
      this.closeTab(tab.id);
    });
  }

  /**
   * Close all tabs that are NOT modified (clean tabs)
   */
  private closeUnmodifiedTabs(): void {
    console.log('🧹 Closing all unmodified tabs');
    
    // Find tabs that are NOT modified
    const unmodifiedTabs = this.tabs.filter(tab => !tab.modified);
    
    console.log(`   Found ${unmodifiedTabs.length} unmodified tabs to close`);
    
    // Close them
    unmodifiedTabs.forEach(tab => {
      this.closeTab(tab.id);
    });
    
    console.log(`✅ Closed ${unmodifiedTabs.length} unmodified tabs`);
  }

  /**
   * Save all modified files, then close all tabs
   */
  private async saveAllAndClose(): Promise<void> {
    console.log('💾 Saving all modified files and closing all tabs');
    
    // Find modified tabs
    const modifiedTabs = this.tabs.filter(tab => tab.modified);
    
    console.log(`   Found ${modifiedTabs.length} modified tabs to save`);
    
    // Save each modified tab
    for (const tab of modifiedTabs) {
      try {
        // Get content from model
        const content = tab.model ? tab.model.getValue() : tab.content;
        
        // Save using Tauri
        try {
          const { writeTextFile } = await import('@tauri-apps/plugin-fs');
          await writeTextFile(tab.path, content);
          console.log(`   ✅ Saved: ${tab.name}`);
          
          // Mark as saved
          tab.modified = false;
          tab.content = content;
          tab.originalContent = content;
          
          // Update file tree indicator
          const { markFileAsSaved } = await import('../ide/fileExplorer/fileTreeRenderer');
          markFileAsSaved(tab.path);
          
        } catch (fsError) {
          // Try invoke method
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('write_file', { path: tab.path, content });
          console.log(`   ✅ Saved (invoke): ${tab.name}`);
          
          tab.modified = false;
          tab.content = content;
          tab.originalContent = content;
        }
        
      } catch (error) {
        console.error(`   ❌ Failed to save: ${tab.name}`, error);
      }
    }
    
    // Dispatch save event
    document.dispatchEvent(new CustomEvent('all-files-saved'));
    
    // Now close all tabs
    this.closeAllTabs();
    
    console.log('✅ All files saved and tabs closed');
  }

  private inspectDOMStructure(): void {
    console.log('🔍 DOM STRUCTURE INSPECTION:');
    console.log('==========================');
    
    const monacoEditor = document.querySelector('#monaco-editor, .monaco-editor, [id*="monaco"]');
    console.log('Monaco editor found:', !!monacoEditor);
    
    if (monacoEditor) {
      console.log('Monaco editor details:', {
        tag: monacoEditor.tagName,
        id: monacoEditor.id,
        classes: monacoEditor.className,
        parent: monacoEditor.parentElement?.tagName,
        siblings: Array.from(monacoEditor.parentElement?.children || []).map(el => ({
          tag: el.tagName,
          id: el.id,
          classes: el.className
        }))
      });
    }
    
    console.log('Tab container details:', {
      element: this.tabContainer,
      parent: this.tabContainer.parentElement?.tagName,
      display: window.getComputedStyle(this.tabContainer).display,
      height: window.getComputedStyle(this.tabContainer).height,
      children: this.tabContainer.children.length
    });
  }

  private setupAutoSave(): void {
    // Keep the existing auto-save functionality for backup
    setInterval(() => {
      const activeTab = this.getActiveTab();
      if (!activeTab) return;
      
      const editor = window.monaco?.editor?.getEditors()[0];
      if (!editor) return;
      
      const currentContent = editor.getValue();
      const oldLength = activeTab.content.length;
      
      if (currentContent !== activeTab.content) {
        activeTab.content = currentContent;
        
        const hasChanges = currentContent !== activeTab.originalContent;
        this.markTabModified(activeTab.id, hasChanges);
        
        // ✅ Mark in file tree
        if (hasChanges) {
          markFileAsModified(activeTab.path);
        } else {
          markFileAsSaved(activeTab.path);
        }
        
        this.debug(`📝 Content updated for ${activeTab.name}: ${oldLength} → ${currentContent.length} chars (modified: ${hasChanges})`);
      }
    });
    
    // ✅ Listen for file saved events
    window.addEventListener('file-saved', (e) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.path) {
        const activeTab = this.getActiveTab();
        if (activeTab && activeTab.path === detail.path) {
          this.markTabAsSaved(activeTab.id);
        }
      }
    });
  }

  private saveCurrentEditorContent(): string {
    if (!this.activeTabId) {
      this.debug('No active tab to save content for');
      return '';
    }

    try {
      const editor = window.monaco?.editor?.getEditors()[0];
      if (!editor) {
        this.debug('No Monaco editor found for content saving');
        return '';
      }

      const activeTab = this.getActiveTab();
      if (!activeTab) {
        this.debug('Active tab not found in tabs array');
        return '';
      }

      const currentContent = editor.getValue();
      const oldContent = activeTab.content;
      const oldLength = oldContent.length;
      
      activeTab.content = currentContent;
      activeTab.lastSaved = new Date();
      
      this.trackContentChange(activeTab.id, currentContent, 'Manual Save');
      
      this.debug(`💾 Content saved for ${activeTab.name}:`, {
        oldLength,
        newLength: currentContent.length,
        contentPreview: currentContent.substring(0, 50) + '...',
        changed: oldContent !== currentContent
      });

      if (activeTab.model && activeTab.model.getValue() !== currentContent) {
        activeTab.model.setValue(currentContent);
        this.debug(`🔄 Model synchronized for ${activeTab.name}`);
      }

      return currentContent;

    } catch (error) {
      this.debug('❌ Error saving current editor content:', error);
      return '';
    }
  }

  addTab(path: string, content: string): string {
    this.debug(`🆕 Adding tab for: ${path}`, {
      contentLength: content.length,
      contentPreview: content.substring(0, 100) + '...'
    });
    
    const name = path.split(/[/\\]/).pop() || 'untitled';
    const language = getLanguageFromPath(path);
    const id = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const existingTab = this.tabs.find(tab => tab.path === path);
    if (existingTab) {
      this.debug(`Tab already exists for ${path}, updating content and activating`);
      // ✅ FIX: Update existing tab with fresh content before activating
      existingTab.content = content;
      if (existingTab.model) {
        existingTab.model.setValue(content);
      }
      this.activateTab(existingTab.id);
      return existingTab.id;
    }
    
    // ✅ FIX: Only save current editor content if we have an active tab with unsaved changes
    const activeTab = this.getActiveTab();
    if (activeTab && activeTab.modified) {
      const savedContent = this.saveCurrentEditorContent();
      if (savedContent) {
        this.debug(`Saved ${savedContent.length} chars before creating new tab`);
      }
    }
    
    this.debug(`Creating new model for ${name} (${content.length} chars)`);
    
    let model = this.modelMap.get(path);
    
    if (!model && window.monaco) {
      const uri = window.monaco.Uri.file(path);
      
      // ✅ FIX: Check if model already exists in Monaco before creating
      const existingModel = window.monaco.editor.getModel(uri);
      if (existingModel) {
        this.debug(`♻️ Reusing existing Monaco model for ${name}`);
        existingModel.setValue(content); // Update content
        model = existingModel;
      } else {
        model = window.monaco.editor.createModel(content, language, uri);
        this.debug(`📝 Created new Monaco model for ${name}`);
      }
      
      this.modelMap.set(path, model);
      
      this.debug(`✅ Model ready for ${name}`, {
        hasModel: !!model,
        modelValue: model?.getValue().length,
        modelLanguage: model?.getLanguageId()
      });
    }
    
    const tab: Tab = {
      id,
      path,
      name,
      model,
      language,
      modified: false,
      content,
      originalContent: content,
      lastSaved: new Date(),
      fullPath: path,
      fileName: name
    };
    
    this.tabs.push(tab);
    this.renderTab(tab);
    this.activateTab(id);
    
    // 🆕 CRITICAL: Setup change tracking for this tab
    this.setupModelChangeTracking(tab);
    
    this.debug(`✅ Tab added successfully: ${name}`, {
      tabId: id,
      tabsCount: this.tabs.length,
      contentLength: content.length
    });
    
    this.setupAutoSave();
    
    return id;
  }

  private renderTab(tab: Tab): void {
    const tabElement = document.createElement('div');
    tabElement.className = 'editor-tab';
    tabElement.setAttribute('data-tab-id', tab.id);
    tabElement.setAttribute('data-path', tab.path);
    tabElement.setAttribute('data-full-path', tab.fullPath || tab.path);
    tabElement.setAttribute('data-file-name', tab.fileName || tab.name);
    tabElement.style.cssText = `
      display: flex;
      align-items: center;
      padding: 6px 12px;
      background: #2d2d2d;
      border-right: 1px solid #333;
      cursor: pointer;
      min-width: 120px;
      max-width: 200px;
      transition: background 0.15s ease;
      font-size: 13px;
      color: #ccc;
      user-select: none;
      flex-shrink: 0;
    `;
    
    tabElement.onmouseover = () => {
      if (!tabElement.classList.contains('active')) {
        tabElement.style.backgroundColor = '#37373d';
      }
    };
    
    tabElement.onmouseout = () => {
      if (!tabElement.classList.contains('active')) {
        tabElement.style.backgroundColor = '#2d2d2d';
      }
    };
    
    const icon = document.createElement('span');
    icon.className = `tab-icon file-icon-${tab.language}`;
    icon.style.marginRight = '6px';
    icon.textContent = this.getFileIcon(tab.language);
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'tab-name';
    nameSpan.textContent = tab.name;
    nameSpan.style.overflow = 'hidden';
    nameSpan.style.textOverflow = 'ellipsis';
    nameSpan.style.whiteSpace = 'nowrap';
    nameSpan.style.flex = '1';
    
    // ✅ Style for modified files
    if (tab.modified || isFileModified(tab.path)) {
      nameSpan.style.color = '#ffa500';
      nameSpan.style.fontStyle = 'italic';
    }
    
    const lengthIndicator = document.createElement('span');
    lengthIndicator.className = 'tab-length';
    lengthIndicator.textContent = `(${tab.content.length})`;
    lengthIndicator.style.fontSize = '10px';
    lengthIndicator.style.color = '#888';
    lengthIndicator.style.marginLeft = '4px';
    
    const modifiedIndicator = document.createElement('span');
    modifiedIndicator.className = 'tab-modified';
    modifiedIndicator.textContent = '•';
    modifiedIndicator.style.display = (tab.modified || isFileModified(tab.path)) ? 'inline' : 'none';
    modifiedIndicator.style.color = '#e9ad35';
    modifiedIndicator.style.marginLeft = '4px';
    modifiedIndicator.style.fontWeight = 'bold';
    
    // ✅ Add pulsing dot for modified files
    if (tab.modified || isFileModified(tab.path)) {
      const dot = document.createElement('span');
      dot.className = 'tab-modified-dot';
      dot.textContent = '●';
      dot.style.cssText = `
        color: #ffa500;
        font-size: 10px;
        margin-left: 4px;
        animation: pulse-dot 2s ease-in-out infinite;
      `;
      nameSpan.appendChild(dot);
    }
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close';
    closeBtn.innerHTML = '×';
    closeBtn.title = 'Close';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#999';
    closeBtn.style.fontSize = '16px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.marginLeft = '6px';
    closeBtn.style.padding = '0 4px';
    closeBtn.style.opacity = '0.7';
    closeBtn.style.borderRadius = '2px';
    
    closeBtn.onmouseover = () => {
      closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      closeBtn.style.color = '#eee';
      closeBtn.style.opacity = '1';
    };
    
    closeBtn.onmouseout = () => {
      closeBtn.style.backgroundColor = 'transparent';
      closeBtn.style.color = '#999';
      closeBtn.style.opacity = '0.7';
    };
    
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      this.closeTab(tab.id);
    };
    
    tabElement.appendChild(icon);
    tabElement.appendChild(nameSpan);
    tabElement.appendChild(lengthIndicator);
    tabElement.appendChild(modifiedIndicator);
    tabElement.appendChild(closeBtn);
    
    tabElement.addEventListener('click', () => this.activateTab(tab.id));
    
    tabElement.addEventListener('mousedown', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        this.closeTab(tab.id);
      }
    });
    
    // Setup context menu for this tab
    this.setupTabContextMenu(tabElement, tab);
    
    this.tabContainer.appendChild(tabElement);
    this.tabContainer.style.display = 'flex';
    this.tabContainer.style.height = '33px';
  }

  private getFileIcon(language: string): string {
    const iconMap: { [key: string]: string } = {
      'javascript': '🟨',
      'typescript': '🔷',
      'python': '🐍',
      'html': '🌐',
      'css': '🎨',
      'json': '📋',
      'markdown': '📝',
      'java': '☕',
      'cpp': '⚙️',
      'c': '⚙️'
    };
    return iconMap[language] || '📄';
  }

  activateTab(tabId: string): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) {
      this.debug(`❌ Tab not found: ${tabId}`);
      return;
    }
    
    this.debug(`📂 Activating tab: ${tab.name}`, {
      tabId,
      path: tab.path,
      contentLength: tab.content.length,
      hasModel: !!tab.model,
      contentPreview: tab.content.substring(0, 50) + '...'
    });
    
    // ✅ FIX: Only save if we're switching FROM a different modified tab
    if (this.activeTabId && this.activeTabId !== tabId) {
      const currentTab = this.tabs.find(t => t.id === this.activeTabId);
      if (currentTab && currentTab.modified) {
        const savedContent = this.saveCurrentEditorContent();
        this.debug(`💾 Saved ${savedContent.length} chars before tab switch`);
      }
    }
    
    this.activeTabId = tabId;
    
    // Update UI
    const tabs = this.tabContainer.querySelectorAll('.editor-tab');
    tabs.forEach(tabEl => {
      const isActive = tabEl.getAttribute('data-tab-id') === tabId;
      if (isActive) {
        tabEl.classList.add('active');
        (tabEl as HTMLElement).style.backgroundColor = '#1e1e1e';
        (tabEl as HTMLElement).style.borderTop = '2px solid #0078d7';
      } else {
        tabEl.classList.remove('active');
        (tabEl as HTMLElement).style.backgroundColor = '#2d2d2d';
        (tabEl as HTMLElement).style.borderTop = 'none';
      }
    });
    
    // Load content into editor
    const editor = window.monaco?.editor?.getEditors()[0];
    if (editor && tab.model) {
      // ✅ FAST: Set model immediately without checking
      editor.setModel(tab.model);
      
      // ✅ Non-blocking verification (only in debug mode)
      if (this.debugMode) {
        requestIdleCallback(() => {
          const loadedContent = editor.getValue();
          if (loadedContent.length === 0 && tab.content.length > 0) {
            editor.setValue(tab.content);
          }
        });
      }
      
    } else {
      this.debug('⚠️ Could not set editor model', {
        hasEditor: !!editor,
        hasModel: !!tab.model
      });
    }
    
    // Update status elements
    const pathStatus = document.getElementById('file-path-status');
    if (pathStatus) pathStatus.textContent = tab.path;
    
    const langStatus = document.getElementById('language-status');
    if (langStatus) langStatus.textContent = tab.language;
    
    document.title = `${tab.name} - AI Code IDE`;
    
    localStorage.setItem('currentFilePath', tab.path);
    localStorage.setItem('currentFileName', tab.name);
    
    // Dispatch tab-activated event
    const tabEvent = new CustomEvent('tab-activated', {
      detail: { 
        id: tab.id,
        path: tab.path,
        model: tab.model,
        content: tab.content
      }
    });
    document.dispatchEvent(tabEvent);
    
    // Dispatch breadcrumb event for tab change
    document.dispatchEvent(new CustomEvent('tab-changed', {
      detail: { path: tab.path }
    }));
    
    // ✅ UPDATE CURRENT FILE FOR EXTERNAL ACCESS
    this.currentFile = {
      name: tab.name,
      path: tab.path,
      language: tab.language
    };
    console.log('✅ TabManager: Updated currentFile to', this.currentFile.name);
    
    this.debug(`✅ Tab activation complete: ${tab.name}`);
  }

  closeTab(tabId: string): void {
    const tabIndex = this.tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;
    
    const tab = this.tabs[tabIndex];
    this.debug(`🗑️ Closing tab: ${tab.name}`, {
      tabId,
      contentLength: tab.content.length,
      isActive: this.activeTabId === tabId
    });
    
    if (this.activeTabId === tabId) {
      const savedContent = this.saveCurrentEditorContent();
      this.debug(`💾 Saved ${savedContent.length} chars for closing tab`);
    }
    
    // ✅ Check if file is modified - use custom dialog
    if (tab.modified || isFileModified(tab.path)) {
      showSaveDialog({
        fileName: tab.name,
        onResult: (result) => {
          if (result === 'yes') {
            // Save then close
            import('../fileOperations/fileOperations').then(module => {
              module.handleSaveOperation(false).then(() => {
                this.finishCloseTab(tabId, tabIndex);
              });
            }).catch(err => {
              this.debug('❌ Failed to import save module:', err);
              this.finishCloseTab(tabId, tabIndex);
            });
          } else if (result === 'no') {
            // Don't save, just close
            this.finishCloseTab(tabId, tabIndex);
          }
          // 'cancel' - do nothing, keep tab open
        }
      });
    } else {
      this.finishCloseTab(tabId, tabIndex);
    }
  }

  private finishCloseTab(tabId: string, tabIndex: number): void {
    const closedTab = this.tabs[tabIndex];
    this.debug(`📚 Finishing close for: ${closedTab.name}`, {
      remainingTabs: this.tabs.length - 1,
      wasActive: this.activeTabId === tabId
    });
    
    // 🆕 DISPOSE CHANGE LISTENER
    const listener = this.modelListeners.get(tabId);
    if (listener && typeof listener.dispose === 'function') {
      try {
        listener.dispose();
        this.debug(`✅ Disposed change listener for: ${closedTab.name}`);
      } catch (error) {
        this.debug('⚠️ Error disposing listener:', error);
      }
    }
    this.modelListeners.delete(tabId);
    
    // 🆕 CLEAR FILE TREE MODIFIED STATE
    if (closedTab.modified || isFileModified(closedTab.path)) {
      markFileAsSaved(closedTab.path);
      this.debug(`✅ Cleared modified state from file tree: ${closedTab.path}`);
    }
    
    const otherTabsWithSamePath = this.tabs.filter((t, i) => 
      i !== tabIndex && t.path === closedTab.path
    );
    
    if (otherTabsWithSamePath.length === 0 && closedTab.model) {
      this.debug(`♻️ Disposing model for ${closedTab.name}`);
      try {
        closedTab.model.dispose();
        this.modelMap.delete(closedTab.path);
      } catch (error) {
        this.debug('⚠️ Warning disposing model:', error);
      }
    }
    
    this.tabs.splice(tabIndex, 1);
    delete this.contentHistory[tabId];
    
    const tabElement = this.tabContainer.querySelector(`[data-tab-id="${tabId}"]`);
    if (tabElement) {
      tabElement.remove();
    }
    
    const tabClosedEvent = new CustomEvent('tab-closed', {
      detail: { 
        id: tabId,
        path: closedTab.path
      }
    });
    document.dispatchEvent(tabClosedEvent);
    
    if (this.activeTabId === tabId) {
      if (this.tabs.length > 0) {
        const newTabIndex = Math.max(0, tabIndex - 1);
        const newTab = this.tabs[newTabIndex];
        this.debug(`📂 Activating replacement tab: ${newTab.name}`, {
          newTabIndex,
          newTabContent: newTab.content.length
        });
        
        setTimeout(() => {
          this.activateTab(newTab.id);
        }, 50);
        
      } else {
        this.debug('🧹 No tabs left, showing welcome screen');
        this.activeTabId = null;
        
        const editor = window.monaco?.editor?.getEditors()[0];
        if (editor) {
          // Show welcome content instead of blank editor
          this.showWelcomeContent(editor);
        }
        
        const pathStatus = document.getElementById('file-path-status');
        if (pathStatus) pathStatus.textContent = 'Welcome';
        
        const langStatus = document.getElementById('language-status');
        if (langStatus) langStatus.textContent = 'Operator X02';
        
        document.title = 'Operator X02 Code IDE';
        
        // Clear breadcrumb when no tabs are open
        document.dispatchEvent(new CustomEvent('breadcrumb-clear'));
        
        // ✅ CLEAR CURRENT FILE WHEN NO TABS REMAIN
        this.currentFile = null;
        console.log('✅ TabManager: Cleared currentFile (no tabs remaining)');
      }
    }
    
    this.debug(`✅ Tab close complete: ${closedTab.name}`);
  }

  markTabModified(tabId: string, modified: boolean): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;
    
    if (tab.modified !== modified) {
      this.debug(`🔖 Marking tab ${tab.name} as ${modified ? 'modified' : 'saved'}`);
      tab.modified = modified;
      
      // ✅ Update visuals
      this.updateTabVisuals(tab.path, modified);
      
      const tabElement = this.tabContainer.querySelector(`[data-tab-id="${tabId}"]`);
      if (tabElement) {
        const indicator = tabElement.querySelector('.tab-modified');
        if (indicator instanceof HTMLElement) {
          indicator.style.display = modified ? 'inline' : 'none';
        }
      }
    }
  }

  getActiveTab(): Tab | null {
    if (!this.activeTabId) return null;
    return this.tabs.find(t => t.id === this.activeTabId) || null;
  }

  public getTabs(): Tab[] {
    return [...this.tabs];
  }

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================

  private setupTabShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
        e.preventDefault();
        this.switchToNextTab();
      }
      
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        this.switchToPreviousTab();
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (this.activeTabId) {
          this.closeTab(this.activeTabId);
        }
      }
    });
  }

  switchToNextTab(): void {
    if (this.tabs.length <= 1) return;
    
    const currentIndex = this.tabs.findIndex(t => t.id === this.activeTabId);
    const nextIndex = (currentIndex + 1) % this.tabs.length;
    this.activateTab(this.tabs[nextIndex].id);
  }

  switchToPreviousTab(): void {
    if (this.tabs.length <= 1) return;
    
    const currentIndex = this.tabs.findIndex(t => t.id === this.activeTabId);
    const prevIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
    this.activateTab(this.tabs[prevIndex].id);
  }

  // ============================================================================
  // DEBUG & UTILITIES
  // ============================================================================

  public debugTabs(): void {
    console.log('🛠 COMPREHENSIVE TAB DEBUG:');
    console.log('==========================');
    
    console.log('Current tabs:', this.tabs.map(tab => ({
      id: tab.id,
      name: tab.name,
      path: tab.path,
      contentLength: tab.content.length,
      originalContentLength: tab.originalContent.length,
      modified: tab.modified,
      hasModel: !!tab.model,
      modelContentLength: tab.model ? tab.model.getValue().length : 0,
      lastSaved: tab.lastSaved,
      isActive: tab.id === this.activeTabId
    })));
    
    console.log('Content History:', this.contentHistory);
    
    console.log('Active tab ID:', this.activeTabId);
    console.log('Model map size:', this.modelMap.size);
    
    const editor = window.monaco?.editor?.getEditors()[0];
    if (editor) {
      const currentContent = editor.getValue();
      console.log('Current editor content length:', currentContent.length);
      console.log('Current editor content preview:', currentContent.substring(0, 100));
    }
    
    this.tabContainer.innerHTML = '';
    this.tabs.forEach(tab => this.renderTab(tab));
    
    if (this.activeTabId) {
      this.activateTab(this.activeTabId);
    }
  }

  public getTabContent(tabId: string): string {
    const tab = this.tabs.find(t => t.id === tabId);
    return tab ? tab.content : '';
  }

  public debugTabVisibility(): void {
    console.log('🔍 TAB VISIBILITY DEBUG');
    console.log('======================');
    
    console.log('Tab container:', {
      exists: !!this.tabContainer,
      parent: this.tabContainer.parentElement,
      display: window.getComputedStyle(this.tabContainer).display,
      height: window.getComputedStyle(this.tabContainer).height,
      position: window.getComputedStyle(this.tabContainer).position,
      top: window.getComputedStyle(this.tabContainer).top,
      zIndex: window.getComputedStyle(this.tabContainer).zIndex,
      childCount: this.tabContainer.children.length
    });
    
    const monacoEditor = document.querySelector('#monaco-editor, .monaco-editor, [id*="monaco"]');
    console.log('Monaco editor:', {
      found: !!monacoEditor,
      selector: monacoEditor ? monacoEditor.tagName : 'not found',
      id: monacoEditor?.id,
      className: monacoEditor?.className
    });
    
    console.log('Tabs count:', this.tabs.length);
    this.tabs.forEach((tab, index) => {
      const tabElement = this.tabContainer.querySelector(`[data-tab-id="${tab.id}"]`);
      console.log(`Tab ${index}:`, {
        name: tab.name,
        id: tab.id,
        elementExists: !!tabElement,
        elementVisible: tabElement ? window.getComputedStyle(tabElement).display !== 'none' : false
      });
    });
    
    this.tabContainer.style.cssText = `
      display: flex !important;
      position: fixed !important;
      top: 60px !important;
      left: 0 !important;
      right: 0 !important;
      height: 35px !important;
      background: #1e1e1e !important;
      border-bottom: 1px solid #333 !important;
      z-index: 9999 !important;
      padding: 0 !important;
      margin: 0 !important;
    `;
    
    console.log('✅ Forced tab container to be visible');
  }

  public updateTabPath(tabId: string, newPath: string): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      const oldPath = tab.path;
      tab.path = newPath;
      tab.fullPath = newPath;
      tab.name = newPath.split(/[/\\]/).pop() || 'untitled';
      tab.fileName = tab.name;
      
      // Update tab element
      const tabElement = this.tabContainer.querySelector(`[data-tab-id="${tabId}"]`);
      if (tabElement) {
        const nameSpan = tabElement.querySelector('.tab-name');
        if (nameSpan) {
          nameSpan.textContent = tab.name;
        }
        (tabElement as HTMLElement).dataset.path = newPath;
        (tabElement as HTMLElement).dataset.fullPath = newPath;
        (tabElement as HTMLElement).dataset.fileName = tab.name;
      }
      
      // ✅ Update file tree tracking
      if (isFileModified(oldPath)) {
        markFileAsSaved(oldPath);
        if (tab.modified) {
          markFileAsModified(newPath);
        }
      }
      
      // ✅ Update currentFile if this is the active tab
      if (this.activeTabId === tabId) {
        this.currentFile = {
          name: tab.name,
          path: tab.path,
          language: tab.language
        };
        console.log('✅ TabManager: Updated currentFile after path change:', this.currentFile.name);
      }
      
      this.debug(`Updated tab path for ${tab.name}: ${newPath}`);
    }
  }

  private updateTabVisuals(path: string, modified: boolean): void {
    const tabs = this.tabs.filter(t => t.path === path);
    
    tabs.forEach(tab => {
      const tabElement = this.tabContainer.querySelector(`[data-tab-id="${tab.id}"]`);
      if (!tabElement) return;
      
      const nameSpan = tabElement.querySelector('.tab-name');
      const indicator = tabElement.querySelector('.tab-modified');
      
      if (nameSpan) {
        if (modified) {
          (nameSpan as HTMLElement).style.color = '#ffa500';
          (nameSpan as HTMLElement).style.fontStyle = 'italic';
        } else {
          (nameSpan as HTMLElement).style.color = '#ccc';
          (nameSpan as HTMLElement).style.fontStyle = 'normal';
        }
      }
      
      if (indicator instanceof HTMLElement) {
        indicator.style.display = modified ? 'inline' : 'none';
      }
    });
  }

  markTabAsSaved(tabId: string): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;
    
    const currentContent = tab.content;
    tab.originalContent = currentContent;
    tab.modified = false;
    
    // ✅ Mark as saved in file tree
    markFileAsSaved(tab.path);
    
    // Update visuals
    this.updateTabVisuals(tab.path, false);
    
    this.debug(`💾 Marked tab as saved: ${tab.name}`);
  }

  /**
   * Get all tabs that have unsaved changes
   * Used by Save All functionality
   */
  public getModifiedTabs(): Tab[] {
    const modifiedTabs = this.tabs.filter(tab => tab.modified);
    this.debug(`📝 Found ${modifiedTabs.length} modified tabs`, 
      modifiedTabs.map(t => t.name));
    return modifiedTabs;
  }

  /**
   * Check if any tabs have unsaved changes
   */
  public hasModifiedTabs(): boolean {
    return this.tabs.some(tab => tab.modified);
  }

  /**
   * Get a specific tab by ID
   */
  public getTab(tabId: string): Tab | undefined {
    return this.tabs.find(t => t.id === tabId);
  }

  /**
   * Get all tabs
   */
  public getAllTabs(): Tab[] {
    return [...this.tabs];
  }

  /**
   * Save all modified tabs
   * Used by Save All menu action
   */
  public async saveAllTabs(): Promise<{ saved: number; failed: number; errors: string[] }> {
    const modifiedTabs = this.getModifiedTabs();
    
    if (modifiedTabs.length === 0) {
      this.debug('ℹ️ No modified tabs to save');
      return { saved: 0, failed: 0, errors: [] };
    }

    this.debug(`💾 Saving ${modifiedTabs.length} modified tabs...`);
    
    let saved = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const tab of modifiedTabs) {
      try {
        const success = await this.saveTab(tab.id);
        if (success) {
          saved++;
          this.debug(`✅ Saved: ${tab.name}`);
        } else {
          failed++;
          errors.push(`Failed to save: ${tab.name}`);
          this.debug(`❌ Failed: ${tab.name}`);
        }
      } catch (error) {
        failed++;
        const errorMsg = `Error saving ${tab.name}: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    this.debug(`💾 Save All complete: ${saved} saved, ${failed} failed`);
    
    return { saved, failed, errors };
  }

  /**
   * Notify the modified files tracker that a file was saved
   * This integrates with the file tree orange/green indicator system
   */
  private notifyFileSaved(filePath: string): void {
    try {
      // Normalize path (handle Windows path separators)
      const normalizedPath = filePath.replace(/\//g, '\\');
      
      // Get the tracker
      const tracker = (window as any).__modifiedFilesTracker;
      if (tracker && typeof tracker.removeModified === 'function') {
        console.log('🔔 TabManager: Notifying tracker that file was saved:', normalizedPath);
        tracker.removeModified(normalizedPath);
      }
    } catch (error) {
      console.error('❌ Error notifying file saved:', error);
    }
  }
}

// ============================================================================
// CSS STYLES
// ============================================================================

// Add CSS animations if not already present
if (!document.getElementById('tab-manager-styles')) {
  const style = document.createElement('style');
  style.id = 'tab-manager-styles';
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes slideOut {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(100%); opacity: 0; }
    }
    
    @keyframes pulse-dot {
      0%, 100% { 
        opacity: 1; 
        transform: scale(1);
      }
      50% { 
        opacity: 0.5; 
        transform: scale(1.1);
      }
    }
    
    /* Modified tab styles */
    .editor-tab.modified .tab-name {
      color: #ffa500 !important;
      font-style: italic;
    }
    
    .editor-tab.modified:hover {
      background: rgba(255, 165, 0, 0.1) !important;
    }
    
    .tab-modified-dot {
      display: inline-block;
      animation: pulse-dot 2s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}

export const tabManager = new TabManager();

// ✅ Make tabManager globally accessible for content search and other features
(window as any).tabManager = tabManager;

// ✅ Debounce tracking to prevent multiple file opens
let lastOpenPath = '';
let lastOpenTime = 0;
let openInProgress = false;

// ✅ File content cache for instant reopening
const fileContentCache = new Map<string, { content: string, timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds cache

// ✅ Add convenience method for opening files with content reading
(window as any).openFileInTab = async (filePath: string, lineNumber?: number) => {
  // Prevent duplicate opens within 300ms
  const now = Date.now();
  if (filePath === lastOpenPath && (now - lastOpenTime) < 300) {
    return;
  }
  
  // Prevent concurrent opens
  if (openInProgress) {
    return; // Just skip, don't wait
  }
  
  openInProgress = true;
  lastOpenPath = filePath;
  lastOpenTime = now;
  
  try {
    // ✅ FAST PATH: If tab already exists, just activate it immediately
    const existingTab = tabManager.tabs.find((t: any) => t.path === filePath);
    if (existingTab) {
      tabManager.activateTab(existingTab.id);
      if (lineNumber && lineNumber > 0) {
        jumpToLine(lineNumber);
      }
      return existingTab.id;
    }
    
    // ✅ Check cache first for instant load
    let content: string;
    const cached = fileContentCache.get(filePath);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      content = cached.content;
    } else {
      // Read from disk
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        content = await invoke('read_file_content', { path: filePath }) as string;
      } catch {
        try {
          const { readTextFile } = await import('@tauri-apps/plugin-fs');
          content = await readTextFile(filePath);
        } catch {
          content = `// Error: Could not read file: ${filePath}`;
        }
      }
      // Cache for next time
      fileContentCache.set(filePath, { content, timestamp: now });
    }
    
    // Add tab
    const tabId = tabManager.addTab(filePath, content);
    
    // Jump to line if specified
    if (lineNumber && lineNumber > 0) {
      jumpToLine(lineNumber);
    }
    
    return tabId;
  } finally {
    openInProgress = false;
  }
};

// ✅ Helper function for line jumping
function jumpToLine(lineNumber: number): void {
  requestAnimationFrame(() => {
    const editor = (window as any).monaco?.editor?.getEditors()[0];
    if (editor) {
      editor.revealLineInCenter(lineNumber);
      editor.setPosition({ lineNumber, column: 1 });
      editor.focus();
    }
  });
}

// ✅ Preload files when folder is expanded (background)
(window as any).preloadFileContent = async (filePath: string) => {
  if (fileContentCache.has(filePath)) return;
  
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const content = await invoke('read_file_content', { path: filePath }) as string;
    fileContentCache.set(filePath, { content, timestamp: Date.now() });
  } catch {
    // Silently fail - this is just preloading
  }
};

console.log('✅ Tab Manager v4.4 - With Tab Persistence');
console.log('   Global: window.tabManager, window.openFileInTab(path, line)');
console.log('   💾 Persistence: window.tabPersistence.save() / .restore() / .get() / .has() / .clear()');
