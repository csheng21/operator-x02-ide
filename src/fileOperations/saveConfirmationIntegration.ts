// src/fileOperations/saveConfirmationIntegration.ts

import { saveConfirmationDialog, showSaveConfirmation } from '../ui/dialogs/saveConfirmationDialog';
import { tabManager } from '../editor/tabManager';
import { handleFileClose } from './openHandler';

/**
 * Integration with tab manager to show save confirmation dialog
 */
export function setupSaveConfirmationIntegration() {
  console.log('Setting up save confirmation dialog integration...');

  // Hook into tab close to show confirmation if file has unsaved changes
  if (tabManager && !tabManager._saveConfirmationHooked) {
    const originalCloseTab = tabManager.closeTab;

    if (originalCloseTab) {
      tabManager.closeTab = async function(tabId: string) {
        // Get tab info before closing
        const tab = this.tabs.find((t: any) => t.id === tabId);
        
        if (!tab) {
          return originalCloseTab.call(this, tabId);
        }

        // Check if file has unsaved changes
        const hasUnsavedChanges = checkForUnsavedChanges(tab);

        if (hasUnsavedChanges) {
          // Show confirmation dialog
          const result = await showSaveConfirmation(
            tab.fileName || tab.path.split(/[/\\]/).pop() || 'Untitled',
            tab.path
          );

          if (result === 'cancel') {
            // User cancelled, don't close the tab
            console.log('Tab close cancelled by user');
            return false;
          } else if (result === 'save') {
            // Save the file first
            try {
              await saveFile(tab);
              console.log('File saved before closing');
            } catch (error) {
              console.error('Error saving file:', error);
              // Don't close if save failed
              return false;
            }
          }
          // If 'dontSave', proceed with closing without saving
        }

        // Proceed with original close logic
        const closeResult = originalCloseTab.call(this, tabId);

        // Handle post-close actions
        if (tab.path) {
          handleFileClose(tab.path);
        }

        return closeResult;
      };

      tabManager._saveConfirmationHooked = true;
      console.log('Save confirmation dialog hooked into tab manager');
    }
  }
}

/**
 * Check if a tab has unsaved changes
 */
function checkForUnsavedChanges(tab: any): boolean {
  try {
    // Method 1: Check if tab has unsaved flag
    if (tab.hasUnsavedChanges || tab.isDirty || tab.modified) {
      return true;
    }

    // Method 2: Check Monaco editor model
    if (typeof window !== 'undefined' && (window as any).monaco) {
      const monaco = (window as any).monaco;
      const model = monaco.editor.getModel(monaco.Uri.file(tab.path));
      
      if (model) {
        // Check if model has been modified since last save
        const currentContent = model.getValue();
        const originalContent = tab.originalContent || tab.savedContent || '';
        return currentContent !== originalContent;
      }
    }

    // Method 3: Check file modification indicators in DOM
    const tabElement = document.querySelector(`[data-tab-id="${tab.id}"]`);
    if (tabElement) {
      const modificationIndicator = tabElement.querySelector('.modification-indicator, .unsaved-indicator, .file-modified');
      if (modificationIndicator) {
        return true;
      }
    }

    // Method 4: Check file registry
    const fileRegistry = (window as any).__fileRegistry || {};
    const fileInfo = fileRegistry[tab.path];
    if (fileInfo && fileInfo.modified) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking for unsaved changes:', error);
    // Be safe and assume there are changes
    return true;
  }
}

/**
 * Save a file before closing
 */
async function saveFile(tab: any): Promise<void> {
  try {
    // Get current content from Monaco editor
    let content = '';
    
    if (typeof window !== 'undefined' && (window as any).monaco) {
      const monaco = (window as any).monaco;
      const model = monaco.editor.getModel(monaco.Uri.file(tab.path));
      
      if (model) {
        content = model.getValue();
      }
    }

    // Import save handler
    const { saveCurrentFile } = await import('./saveHandler');
    
    // Save the file
    await saveCurrentFile(tab.path, content);
    
    // Update tab state
    if (tab) {
      tab.hasUnsavedChanges = false;
      tab.isDirty = false;
      tab.modified = false;
      tab.savedContent = content;
      tab.originalContent = content;
    }

    // Update file registry
    const fileRegistry = (window as any).__fileRegistry || {};
    if (fileRegistry[tab.path]) {
      fileRegistry[tab.path].modified = false;
      fileRegistry[tab.path].content = content;
      fileRegistry[tab.path].lastSaved = Date.now();
    }

    // Update UI to remove modification indicators
    updateModificationIndicators(tab.path, false);

    console.log(`File saved successfully: ${tab.path}`);
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
}

/**
 * Update modification indicators in the UI
 */
function updateModificationIndicators(filePath: string, isModified: boolean): void {
  try {
    // Update tab indicator
    const fileName = filePath.split(/[/\\]/).pop() || filePath;
    const allTabs = document.querySelectorAll('[data-tab-path]');
    
    for (const tabEl of allTabs) {
      const tabPath = tabEl.getAttribute('data-tab-path');
      if (tabPath === filePath || tabPath?.endsWith(fileName)) {
        const indicator = tabEl.querySelector('.modification-indicator, .unsaved-indicator');
        
        if (isModified) {
          if (!indicator && tabEl.querySelector('.tab-label')) {
            const dot = document.createElement('span');
            dot.className = 'modification-indicator';
            dot.innerHTML = '●';
            dot.style.cssText = 'color: #ff9800; margin-left: 4px; font-size: 10px;';
            tabEl.querySelector('.tab-label')?.appendChild(dot);
          }
        } else {
          indicator?.remove();
        }
      }
    }

    // Update file explorer indicator
    const fileElements = document.querySelectorAll(`[data-path="${filePath}"], [data-file-path="${filePath}"]`);
    for (const fileEl of fileElements) {
      const explorerIndicator = fileEl.querySelector('.file-modified-indicator, .orange-dot');
      
      if (isModified) {
        if (!explorerIndicator && fileEl.querySelector('.file-name')) {
          const dot = document.createElement('span');
          dot.className = 'file-modified-indicator';
          dot.innerHTML = '●';
          dot.style.cssText = 'color: #ff9800; margin-left: 4px; font-size: 8px;';
          fileEl.querySelector('.file-name')?.appendChild(dot);
        }
      } else {
        explorerIndicator?.remove();
      }
    }
  } catch (error) {
    console.error('Error updating modification indicators:', error);
  }
}

/**
 * Example: Show save confirmation manually
 */
export async function showSaveConfirmationForFile(filePath: string): Promise<boolean> {
  const fileName = filePath.split(/[/\\]/).pop() || filePath;
  
  const result = await showSaveConfirmation(fileName, filePath);
  
  switch (result) {
    case 'save':
      // Find the tab and save it
      const tab = tabManager?.tabs?.find((t: any) => t.path === filePath);
      if (tab) {
        try {
          await saveFile(tab);
          return true;
        } catch (error) {
          console.error('Failed to save:', error);
          return false;
        }
      }
      return false;

    case 'dontSave':
      return true;

    case 'cancel':
      return false;

    default:
      return false;
  }
}

/**
 * Hook into window close to check for unsaved changes
 */
export function setupWindowCloseProtection() {
  window.addEventListener('beforeunload', (e) => {
    // Check if any tabs have unsaved changes
    const hasUnsavedChanges = tabManager?.tabs?.some((tab: any) => 
      checkForUnsavedChanges(tab)
    );

    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    }
  });

  console.log('Window close protection enabled');
}

/**
 * Initialize the save confirmation system
 */
export function initializeSaveConfirmation() {
  console.log('Initializing save confirmation system...');
  
  setupSaveConfirmationIntegration();
  setupWindowCloseProtection();
  
  console.log('Save confirmation system initialized');
}

// Auto-initialize
if (typeof window !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSaveConfirmation);
} else if (typeof window !== 'undefined') {
  // Add small delay to ensure tab manager is loaded
  setTimeout(initializeSaveConfirmation, 100);
}