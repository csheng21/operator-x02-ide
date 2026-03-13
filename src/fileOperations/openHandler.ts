// src/fileOperations/openHandler.ts
import { getLanguageFromPath } from '../utils/fileUtils';
import { openFileWithFileHandle } from '../fileSystem';
import { tabManager } from '../editor/tabManager';

/**
 * Open a file with support for overwriting when saved later
 */
export async function openFileWithOverwriteSupport(): Promise<{ content: string, path: string } | null> {
  try {
    const result = await openFileWithFileHandle();
    if (result) {
      openInEditor(result.content, result.path);
      return { content: result.content, path: result.path };
    }
    return null;
  } catch (error) {
    console.error('Error opening file with overwrite support:', error);
    return null;
  }
}

/**
 * Set up keyboard shortcut for opening files
 */
export function setupDirectOpenHandler() {
  console.log('Setting up direct open keyboard shortcut with File System API priority');
  
  document.addEventListener('keydown', async (e) => {
    // Check for Ctrl+O or Cmd+O
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      console.log('Open shortcut detected');
      e.preventDefault();
      
      try {
        // Try File System Access API first if available
        if ('showOpenFilePicker' in window) {
          const result = await openFileWithFileHandle();
          if (result) {
            openInEditor(result.content, result.path);
            return;
          }
        }
        
        // Fall back to standard open
        const { openFile } = await import('../fileSystem');
        const fileInfo = await openFile();
        
        if (fileInfo) {
          console.log('File opened from:', fileInfo.path);
          openInEditor(fileInfo.content, fileInfo.path);
        }
      } catch (error) {
        console.error('Error opening file:', error);
        fallbackOpen();
      }
    }
  });
}

/**
 * Opens a file using the system dialog
 */
export async function openFile() {
  try {
    // Import from fileSystem
    const fileSystem = await import('../fileSystem');
    return await fileSystem.openFile();
  } catch (error) {
    console.error('Error in openFile:', error);
    return fallbackOpen();
  }
}

/**
 * Browser fallback for opening files
 */
export function fallbackOpen(): Promise<{ content: string, path: string } | null> {
  console.log('Using browser fallback for opening');
  
  return new Promise((resolve) => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ts,.js,.html,.css,.json,.txt,.py,.md,.jsx,.tsx,.vue,.php,.java,.cpp,.c,.h,.rs,.go,.rb,.swift,.kt,.dart,.r,.m,.scala,.clj,.hs,.fs,.ml,.lua,.pl,.sh,.bat,.ps1,.sql,.xml,.yaml,.yml,.toml,.ini,.cfg,.conf';
    input.style.display = 'none';
    
    // Add to DOM temporarily
    document.body.appendChild(input);
    
    // Handle file selection
    input.onchange = () => {
      if (!input.files || input.files.length === 0) {
        document.body.removeChild(input);
        resolve(null);
        return;
      }
      
      const file = input.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string || '';
        
        // Open in editor
        openInEditor(content, file.name);
        
        document.body.removeChild(input);
        resolve({ content, path: file.name });
      };
      
      reader.onerror = () => {
        console.error('Error reading file:', reader.error);
        document.body.removeChild(input);
        resolve(null);
      };
      
      reader.readAsText(file);
    };
    
    // Handle cancellation
    input.oncancel = () => {
      document.body.removeChild(input);
      resolve(null);
    };
    
    // Trigger file dialog
    input.click();
  });
}

/**
 * Open content in the editor and sync with file explorer
 */
export function openInEditor(content: string, filepath: string) {
  console.log(`Opening in editor: ${filepath}`);
  
  // Use tab manager to handle file opening
  tabManager.addTab(filepath, content);
  
  // CRITICAL: Notify the file explorer system about the opened file
  updateFileExplorerForOpenedFile(filepath, content);
  
  // Show notification about File System API usage if available
  if ('showSaveFilePicker' in window) {
    showFileOpenNotification(filepath);
  }
  
  // Dispatch tab-opened event for other systems to listen to
  const tabOpenedEvent = new CustomEvent('tab-opened', {
    detail: { 
      path: filepath, 
      filePath: filepath,
      content: content,
      fileName: filepath.split(/[/\\]/).pop() || filepath
    }
  });
  document.dispatchEvent(tabOpenedEvent);
}

/**
 * Update file explorer when a file is opened via File menu
 */
async function updateFileExplorerForOpenedFile(filepath: string, content: string): Promise<void> {
  try {
    console.log(`Updating file explorer for opened file: ${filepath}`);
    
    // Method 1: Update the file system registry
    const fileRegistry = (window as any).__fileRegistry || {};
    if (!fileRegistry[filepath]) {
      fileRegistry[filepath] = {
        content: content,
        lastModified: Date.now(),
        isStandalone: true // Mark as standalone file (not from folder structure)
      };
      (window as any).__fileRegistry = fileRegistry;
      console.log(`Added standalone file to registry: ${filepath}`);
    }
    
    // Method 2: Try to update file explorer via the modular system
    try {
      const fileExplorerModule = await import('../ide/fileExplorer');
      
      // Call refreshExplorerFromTabs to update the explorer
      if (fileExplorerModule.refreshExplorerFromTabs) {
        setTimeout(() => {
          fileExplorerModule.refreshExplorerFromTabs();
        }, 100);
      }
      
    } catch (moduleError) {
      console.warn('Could not update via modular file explorer:', moduleError);
    }
    
    // Method 3: Dispatch a custom event for file explorer listeners
    const fileOpenedEvent = new CustomEvent('standalone-file-opened', {
      detail: { 
        path: filepath, 
        content: content,
        fileName: filepath.split(/[/\\]/).pop() || filepath,
        timestamp: Date.now()
      }
    });
    document.dispatchEvent(fileOpenedEvent);
    console.log(`Dispatched standalone-file-opened event for: ${filepath}`);
    
    // Method 4: Try to update the integrated folder manager if available
    try {
      const explorerManager = await import('../explorerManager');
      if (explorerManager.integratedFolderManager && 
          typeof explorerManager.integratedFolderManager.updateAllFileStatuses === 'function') {
        explorerManager.integratedFolderManager.updateAllFileStatuses();
        console.log(`Updated integrated folder manager file statuses`);
      }
    } catch (managerError) {
      console.warn('Could not update integrated folder manager:', managerError);
    }
    
    // Method 5: Update any existing file tree directly
    updateFileTreeVisualState(filepath, true);
    
  } catch (error) {
    console.error('Error updating file explorer for opened file:', error);
  }
}

/**
 * Update the visual state of files in the explorer tree
 */
function updateFileTreeVisualState(filepath: string, isOpen: boolean): void {
  try {
    const fileName = filepath.split(/[/\\]/).pop() || filepath;
    const container = document.querySelector('.file-tree');
    
    if (!container) return;
    
    // Look for the file element using multiple selectors
    const selectors = [
      `[data-path="${filepath}"]`,
      `[data-path*="${fileName}"]`,
      `.file-item:contains("${fileName}")`,
      `.integrated-file-item[data-file-name="${fileName}"]`
    ];
    
    let fileElement: HTMLElement | null = null;
    
    for (const selector of selectors) {
      if (selector.includes(':contains')) {
        // Manual search for text content
        const elements = container.querySelectorAll('.file-item, .integrated-file-item');
        for (const el of elements) {
          if (el.textContent && el.textContent.includes(fileName)) {
            fileElement = el as HTMLElement;
            break;
          }
        }
      } else {
        fileElement = container.querySelector(selector) as HTMLElement;
      }
      
      if (fileElement) break;
    }
    
    if (fileElement) {
      if (isOpen) {
        fileElement.classList.add('file-opened');
        fileElement.style.fontWeight = 'bold';
        fileElement.style.color = '#ffffff';
        
        // Add open indicator if not exists
        let indicator = fileElement.querySelector('.open-indicator');
        if (!indicator) {
          indicator = document.createElement('span');
          indicator.className = 'open-indicator';
          indicator.innerHTML = '●';
          indicator.style.cssText = `
            color: #4CAF50;
            margin-left: 4px;
            font-size: 8px;
            animation: pulse 1s ease-in-out;
          `;
          fileElement.appendChild(indicator);
        }
        
        console.log(`Updated visual state for opened file: ${fileName}`);
      } else {
        fileElement.classList.remove('file-opened');
        fileElement.style.fontWeight = 'normal';
        fileElement.style.color = '#cccccc';
        
        const indicator = fileElement.querySelector('.open-indicator');
        if (indicator) {
          indicator.remove();
        }
        
        console.log(`Updated visual state for closed file: ${fileName}`);
      }
    }
  } catch (error) {
    console.error('Error updating file tree visual state:', error);
  }
}

/**
 * Show notification when file is opened
 */
function showFileOpenNotification(filepath: string): void {
  const fileName = filepath.split(/[/\\]/).pop() || filepath;
  
  const notification = document.createElement('div');
  notification.id = 'file-open-notification';
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #333;
    color: #fff;
    padding: 15px;
    border-radius: 5px;
    z-index: 9999;
    max-width: 350px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border-left: 4px solid #4CAF50;
    animation: slideIn 0.3s ease;
  `;
  
  notification.innerHTML = `
    <div style="margin-bottom:8px; font-weight: bold;">File opened: ${fileName}</div>
    <div style="color:#aaffaa; font-size: 12px; margin-bottom: 8px;">
      File System API allows saving back to original location
    </div>
    <button id="dismissNotification" style="
      background:#444; 
      border:none; 
      color:white; 
      padding:5px 10px; 
      cursor:pointer; 
      border-radius: 3px;
      font-size: 11px;
      float: right;
    ">Dismiss</button>
    <div style="clear: both;"></div>
  `;
  
  // Remove existing notification
  const existing = document.getElementById('file-open-notification');
  if (existing) {
    existing.remove();
  }
  
  document.body.appendChild(notification);
  
  // Add animation styles if not exists
  if (!document.querySelector('#file-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'file-notification-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
  
  // Manual dismiss
  const dismissBtn = document.getElementById('dismissNotification');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      notification.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => notification.remove(), 300);
    });
  }
}

/**
 * Handle file closing from tab manager
 */
export function handleFileClose(filepath: string): void {
  console.log(`Handling file close: ${filepath}`);
  
  // Update visual state
  updateFileTreeVisualState(filepath, false);
  
  // Dispatch tab-closed event
  const tabClosedEvent = new CustomEvent('tab-closed', {
    detail: { 
      path: filepath, 
      filePath: filepath,
      fileName: filepath.split(/[/\\]/).pop() || filepath
    }
  });
  document.dispatchEvent(tabClosedEvent);
  
  // Try to update integrated folder manager
  import('../explorerManager').then(explorerManager => {
    if (explorerManager.integratedFolderManager && 
        typeof explorerManager.integratedFolderManager.updateAllFileStatuses === 'function') {
      explorerManager.integratedFolderManager.updateAllFileStatuses();
    }
  }).catch(error => {
    console.warn('Could not update folder manager on file close:', error);
  });
}

/**
 * Initialize the open handler system
 */
export function initializeOpenHandler(): void {
  console.log('Initializing open handler system...');
  
  // Set up keyboard shortcuts
  setupDirectOpenHandler();
  
  // Hook into tab manager if available
  try {
    if (tabManager && !tabManager._openHandlerHooked) {
      const originalCloseTab = tabManager.closeTab;
      
      if (originalCloseTab) {
        tabManager.closeTab = function(tabId: string) {
          // Get tab info before closing
          const tab = this.tabs.find((t: any) => t.id === tabId);
          const result = originalCloseTab.call(this, tabId);
          
          // Handle post-close actions
          if (tab && tab.path) {
            handleFileClose(tab.path);
          }
          
          return result;
        };
        
        tabManager._openHandlerHooked = true;
        console.log('Hooked into tab manager for file close handling');
      }
    }
  } catch (error) {
    console.warn('Could not hook into tab manager:', error);
  }
  
  // Listen for menu-based file opening
  document.addEventListener('menu-file-open', async () => {
    try {
      const result = await openFile();
      if (result) {
        openInEditor(result.content, result.path);
      }
    } catch (error) {
      console.error('Error opening file from menu:', error);
    }
  });
  
  console.log('Open handler system initialized');
}

// Auto-initialize when module is loaded
if (typeof window !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOpenHandler);
} else if (typeof window !== 'undefined') {
  initializeOpenHandler();
}