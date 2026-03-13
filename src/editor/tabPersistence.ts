// tabPersistence.ts - Persist open tabs across IDE resets
// This module integrates with TabManager to save and restore open tabs

const TAB_STORAGE_KEY = 'ide-open-tabs';
const TAB_ACTIVE_KEY = 'ide-active-tab';

interface PersistedTab {
  path: string;
  name: string;
  content: string;
  language: string;
  isActive: boolean;
}

/**
 * Get TabManager instance
 */
function getTabManager(): any {
  return (window as any).tabManager;
}

/**
 * Save all open tabs to localStorage
 */
export function saveOpenTabs(): void {
  try {
    const tabMgr = getTabManager();
    if (!tabMgr) {
      console.warn('[TabPersist] TabManager not available');
      return;
    }
    
    // Get tabs using available methods
    const tabs = tabMgr.getTabs?.() || tabMgr.getAllTabs?.() || tabMgr.tabs || [];
    
    if (tabs.length === 0) {
      console.log('[TabPersist] No tabs to save');
      localStorage.removeItem(TAB_STORAGE_KEY);
      localStorage.removeItem(TAB_ACTIVE_KEY);
      return;
    }
    
    const activeTabId = tabMgr.activeTabId;
    
    const tabsToSave: PersistedTab[] = tabs.map((tab: any) => ({
      path: tab.path || tab.fullPath,
      name: tab.name || tab.fileName,
      content: tab.content || '',
      language: tab.language || 'plaintext',
      isActive: tab.id === activeTabId
    }));
    
    localStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(tabsToSave));
    
    // Save active tab path separately for quick access
    const activeTab = tabs.find((t: any) => t.id === activeTabId);
    if (activeTab) {
      localStorage.setItem(TAB_ACTIVE_KEY, activeTab.path);
    }
    
    console.log(`[TabPersist] 💾 Saved ${tabsToSave.length} tabs:`, tabsToSave.map(t => t.name));
  } catch (error) {
    console.error('[TabPersist] Error saving tabs:', error);
  }
}

/**
 * Get persisted tabs from localStorage
 */
export function getPersistedTabs(): PersistedTab[] {
  try {
    const savedTabsStr = localStorage.getItem(TAB_STORAGE_KEY);
    if (!savedTabsStr) return [];
    
    const tabs = JSON.parse(savedTabsStr);
    console.log(`[TabPersist] 📂 Found ${tabs.length} persisted tabs`);
    return tabs;
  } catch (error) {
    console.error('[TabPersist] Error loading persisted tabs:', error);
    return [];
  }
}

/**
 * Check if there are persisted tabs
 */
export function hasPersistedTabs(): boolean {
  try {
    const savedTabsStr = localStorage.getItem(TAB_STORAGE_KEY);
    if (!savedTabsStr) return false;
    const tabs = JSON.parse(savedTabsStr);
    return Array.isArray(tabs) && tabs.length > 0;
  } catch {
    return false;
  }
}

/**
 * Clear persisted tabs
 */
export function clearPersistedTabs(): void {
  localStorage.removeItem(TAB_STORAGE_KEY);
  localStorage.removeItem(TAB_ACTIVE_KEY);
  console.log('[TabPersist] 🧹 Cleared persisted tabs');
}

/**
 * Restore tabs from localStorage
 */
export async function restorePersistedTabs(): Promise<number> {
  const persistedTabs = getPersistedTabs();
  
  if (persistedTabs.length === 0) {
    console.log('[TabPersist] No tabs to restore');
    return 0;
  }
  
  console.log(`[TabPersist] 🔄 Restoring ${persistedTabs.length} tabs...`);
  
  const tabMgr = getTabManager();
  const openFileInTab = (window as any).openFileInTab;
  
  let restoredCount = 0;
  let activeTabPath: string | null = null;
  
  for (const tab of persistedTabs) {
    try {
      if (tab.isActive) {
        activeTabPath = tab.path;
      }
      
      if (openFileInTab) {
        // Use the global openFileInTab which handles file reading
        await openFileInTab(tab.path);
        console.log(`[TabPersist] ✅ Restored: ${tab.name}`);
        restoredCount++;
      } else if (tabMgr?.addTab) {
        // Fallback: use tabManager directly with cached content
        tabMgr.addTab(tab.path, tab.content);
        console.log(`[TabPersist] ✅ Restored (cached): ${tab.name}`);
        restoredCount++;
      }
      
      // Small delay between tabs to avoid race conditions
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.warn(`[TabPersist] ❌ Failed to restore: ${tab.name}`, error);
    }
  }
  
  // Activate the previously active tab
  if (activeTabPath && tabMgr) {
    setTimeout(() => {
      const tabs = tabMgr.getTabs?.() || [];
      const activeTab = tabs.find((t: any) => t.path === activeTabPath);
      if (activeTab) {
        tabMgr.activateTab(activeTab.id);
        console.log(`[TabPersist] 🎯 Activated: ${activeTab.name}`);
      }
    }, 500);
  }
  
  // Clear persisted tabs after successful restoration
  if (restoredCount > 0) {
    clearPersistedTabs();
  }
  
  console.log(`[TabPersist] ✅ Restored ${restoredCount}/${persistedTabs.length} tabs`);
  return restoredCount;
}

/**
 * Initialize tab persistence system
 */
export function initializeTabPersistence(): void {
  if ((window as any).__tabPersistenceInitialized) {
    console.log('[TabPersist] Already initialized');
    return;
  }
  
  (window as any).__tabPersistenceInitialized = true;
  
  // Save tabs before page unload
  window.addEventListener('beforeunload', () => {
    saveOpenTabs();
  });
  
  // Save tabs periodically (every 30 seconds) in case of crash
  setInterval(() => {
    saveOpenTabs();
  }, 30000);
  
  // Save when tabs change
  document.addEventListener('tab-opened', () => saveOpenTabs());
  document.addEventListener('tab-closed', () => saveOpenTabs());
  document.addEventListener('tab-changed', () => saveOpenTabs());
  
  // Expose functions globally for debugging
  (window as any).tabPersistence = {
    save: saveOpenTabs,
    restore: restorePersistedTabs,
    get: getPersistedTabs,
    has: hasPersistedTabs,
    clear: clearPersistedTabs
  };
  
  console.log('[TabPersist] ✅ Tab persistence initialized');
  console.log('[TabPersist] 💡 Use window.tabPersistence for debugging');
}

/**
 * Check if IDE should show welcome message
 * Returns false if there are open tabs or persisted tabs
 */
export function shouldShowWelcome(): boolean {
  // Check TabManager for open tabs
  const tabMgr = getTabManager();
  const openTabs = tabMgr?.getTabs?.() || tabMgr?.getAllTabs?.() || [];
  
  if (openTabs.length > 0) {
    console.log('[TabPersist] Has open tabs - skip welcome');
    return false;
  }
  
  // Check for persisted tabs
  if (hasPersistedTabs()) {
    console.log('[TabPersist] Has persisted tabs - skip welcome');
    return false;
  }
  
  // Check DOM for tab elements
  const tabElements = document.querySelectorAll('.editor-tab, [data-tab-id]');
  if (tabElements.length > 0) {
    console.log('[TabPersist] Has tab elements in DOM - skip welcome');
    return false;
  }
  
  return true;
}

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  // Wait for DOM and TabManager to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeTabPersistence, 1000);
    });
  } else {
    setTimeout(initializeTabPersistence, 1000);
  }
}
