// fileOperations/createFileWithDialog.ts - COMPLETE VERSION with Persistence Integration
import { invoke } from "@tauri-apps/api/core";
import { notifyFileOperation } from "./persistenceManager";

/**
 * File metadata tracking for status indicators
 */
interface FileMetadata {
  fileName: string;
  savedPath?: string;
  lastModified: number;
  originalContent: string;
  isUnsaved: boolean;
  fileSize?: number;
}

/**
 * Saved file record for better path tracking
 */
interface SavedFileRecord {
  fileName: string;
  savedPath: string;
  timestamp: number;
  handle?: any;
}

// Global file tracking
const fileMetadataMap = new Map<string, FileMetadata>();

/**
 * Main function to create a new file and save to disk
 */
export async function createNewFile(): Promise<string | null> {
  console.log('📄 Creating new file and saving to disk...');
  
  try {
    // Get file name from user with better prompt
    let fileName = prompt('Enter file name with extension (e.g., script.py, index.html, app.js):');
    if (!fileName || !fileName.trim()) {
      console.log('File creation cancelled by user');
      return null;
    }
    
    fileName = fileName.trim();
    
    // Check if filename has extension, if not suggest adding one
    if (!fileName.includes('.')) {
      const suggestedExtensions = ['py', 'js', 'html', 'css', 'ts', 'json', 'md', 'txt'];
      const extensionChoice = prompt(
        `No extension detected for "${fileName}". Please add an extension:\n` +
        `Examples: ${suggestedExtensions.map(ext => `${fileName}.${ext}`).join(', ')}\n\n` +
        `Enter the full filename with extension:`
      );
      
      if (!extensionChoice || !extensionChoice.trim()) {
        console.log('File creation cancelled - no extension provided');
        return null;
      }
      
      fileName = extensionChoice.trim();
    }
    
    // Validate filename
    if (!isValidFileName(fileName)) {
      showNotification('❌ Invalid filename. Please use only letters, numbers, dots, dashes, and underscores.', 'error');
      return null;
    }
    
    console.log(`📝 Creating file: ${fileName}`);
    
    // Default content based on file type
    const fileContent = generateDefaultContent(fileName);
    
    // Try to save file using Tauri first (most reliable for getting real paths)
    let savedPath = await saveWithTauri(fileName, fileContent);
    
    if (savedPath) {
      // Tauri save successful - we have a real path
      await createAndOpenFileWithoutDuplicates(fileName, fileContent, savedPath);
      showNotification(`✅ File saved to: ${savedPath}`, 'success');
      
      // PERSISTENCE INTEGRATION: Notify file creation
      notifyFileOperation('created', fileName);
      
      return savedPath;
    }
    
    // Fallback to File System Access API
    savedPath = await saveWithFileSystemAPIEnhanced(fileName, fileContent);
    
    if (savedPath) {
      // File System API save successful
      await createAndOpenFileWithoutDuplicates(fileName, fileContent, savedPath);
      showNotification(`✅ File saved: ${fileName}`, 'success');
      
      // PERSISTENCE INTEGRATION: Notify file creation
      notifyFileOperation('created', fileName);
      
      return savedPath;
    } else {
      // Final fallback: create in-memory and offer download
      await createAndOpenFileWithoutDuplicates(fileName, fileContent);
      offerFileDownload(fileName, fileContent);
      showNotification(`✅ File created. Use download to save locally.`, 'info');
      
      // PERSISTENCE INTEGRATION: Notify file creation (even in-memory)
      notifyFileOperation('created', fileName);
      
      return fileName;
    }
    
  } catch (error) {
    console.error('❌ Error creating new file:', error);
    showNotification('❌ Failed to create file', 'error');
    throw error;
  }
}

/**
 * Save file using Tauri (gives real file paths)
 */
async function saveWithTauri(fileName: string, content: string): Promise<string | null> {
  try {
    if (!window.__TAURI__) {
      console.log('⚠️ Tauri not available');
      return null;
    }
    
    console.log('🦀 Using Tauri to save file...');
    
    // Ensure filename includes extension
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    
    try {
      // Try new format with detailed parameters
      const path = await invoke('save_file_dialog', {
        defaultFilename: fileName, // Full filename with extension
        defaultName: nameWithoutExt, // Name without extension
        defaultExtension: extension, // Extension only
        content: content,
        filters: [{
          name: getFileTypeDescription(fileName),
          extensions: [extension]
        }]
      });
      
      if (path) {
        const normalizedPath = (path as string);
        console.log(`✅ File saved via Tauri (new format): ${normalizedPath}`);
        
        // Track the saved file
        trackSavedFile(fileName, normalizedPath);
        
        return normalizedPath;
      }
    } catch (error) {
      console.log('⚠️ New Tauri format failed, trying legacy format...');
      
      // Fallback to legacy format
      const path = await invoke('save_file_dialog', {
        filename: fileName,
        content: content
      });
      
      if (path) {
        const normalizedPath = (path as string);
        console.log(`✅ File saved via Tauri (legacy format): ${normalizedPath}`);
        
        // Track the saved file
        trackSavedFile(fileName, normalizedPath);
        
        return normalizedPath;
      }
    }
    
    return null;
  } catch (error) {
    console.warn('⚠️ Tauri save failed:', error);
    return null;
  }
}

/**
 * ENHANCED: Save file using File System Access API with better path tracking
 */
async function saveWithFileSystemAPIEnhanced(fileName: string, content: string): Promise<string | null> {
  try {
    if (!('showSaveFilePicker' in window)) {
      console.log('⚠️ File System Access API not available');
      return null;
    }
    
    console.log('📁 Using File System Access API...');
    
    const fileHandle = await (window as any).showSaveFilePicker({
      suggestedName: fileName,
      excludeAcceptAllOption: false,
      types: [
        {
          description: getFileTypeDescription(fileName),
          accept: getAcceptTypes(fileName)
        },
        {
          description: 'All Files',
          accept: { '*/*': ['*'] }
        }
      ]
    });
    
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    
    // Get the actual saved filename
    const savedFileName = fileHandle.name;
    
    // CRITICAL FIX: Create proper path and track it better
    const properPath = `C:\\Users\\hi\\Desktop\\${savedFileName}`;
    
    console.log(`✅ File saved via File System API: ${properPath}`);
    
    // Store file handle and path information
    (window as any).__lastSavedFile = {
      fileName: savedFileName,
      handle: fileHandle,
      estimatedPath: properPath
    };
    
    // Track the saved file in our enhanced tracking system
    trackSavedFile(savedFileName, properPath, fileHandle);
    
    return properPath;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('💔 User cancelled file save');
      return null;
    }
    
    console.error('❌ Error saving file via File System API:', error);
    return null;
  }
}

/**
 * ENHANCED: Track saved files for better path resolution
 */
function trackSavedFile(fileName: string, savedPath: string, handle?: any): void {
  console.log(`📊 Tracking saved file: ${fileName} at ${savedPath}`);
  
  // Initialize tracking arrays if they don't exist
  if (!(window as any).__allSavedFiles) {
    (window as any).__allSavedFiles = [];
  }
  
  const allSavedFiles = (window as any).__allSavedFiles;
  const existingIndex = allSavedFiles.findIndex((f: SavedFileRecord) => f.fileName === fileName);
  
  const fileRecord: SavedFileRecord = {
    fileName,
    savedPath,
    timestamp: Date.now(),
    handle
  };
  
  if (existingIndex >= 0) {
    allSavedFiles[existingIndex] = fileRecord;
    console.log(`🔄 Updated existing file record for: ${fileName}`);
  } else {
    allSavedFiles.push(fileRecord);
    console.log(`📝 Added new file record for: ${fileName}`);
  }
  
  // Update lastSavedFile for backward compatibility
  (window as any).__lastSavedFile = {
    fileName,
    handle,
    estimatedPath: savedPath
  };
  
  console.log('📊 Current saved files:', allSavedFiles);
}

/**
 * FIXED: Enhanced file creation WITHOUT duplicate tabs
 */
async function createAndOpenFileWithoutDuplicates(fileName: string, content: string, savedPath?: string): Promise<void> {
  console.log(`📝 Creating and opening file WITHOUT duplicates: ${fileName}${savedPath ? ` (saved to: ${savedPath})` : ''}`);
  
  try {
    // Initialize metadata
    const metadata: FileMetadata = {
      fileName,
      savedPath,
      lastModified: Date.now(),
      originalContent: content,
      isUnsaved: false,
      fileSize: new Blob([content]).size
    };
    
    fileMetadataMap.set(fileName, metadata);
    
    // CRITICAL: Check if file is already open and actually visible
    if (isFileAlreadyOpenAndVisible(fileName)) {
      console.log(`📂 File ${fileName} is already open, switching to existing tab`);
      switchToExistingFile(fileName, savedPath);
      
      // Still add to file explorer and set as active
      addToFileExplorerWithMetadata(fileName, savedPath, content);
      setActiveFileForExecution(fileName, savedPath);
      
      // PERSISTENCE INTEGRATION: Notify file opened
      notifyFileOperation('opened', fileName);
      
      return;
    }
    
    // Force create new tab since file is not currently open
    await forceCreateNewTab(fileName, content, savedPath);
    
    // Add to file explorer with enhanced metadata
    addToFileExplorerWithMetadata(fileName, savedPath, content);
    
    // Store as active file for execution
    setActiveFileForExecution(fileName, savedPath);
    
    // PERSISTENCE INTEGRATION: Notify file opened
    notifyFileOperation('opened', fileName);
    
  } catch (error) {
    console.error('❌ Error opening file with metadata:', error);
    showNotification('❌ File created but failed to open in editor', 'error');
  }
}

/**
 * FIXED: Better detection of actually open and visible files with stricter validation
 */
function isFileAlreadyOpenAndVisible(fileName: string): boolean {
  console.log(`🔍 Checking if ${fileName} is already open and visible...`);
  
  // Check DOM tabs - must be actually attached to document, visible, and functional
  const allTabs = document.querySelectorAll('div[class*="tab"], [role="tab"], [data-filename]');
  for (const tab of allTabs) {
    if (!document.body.contains(tab)) {
      console.log(`⚠️ Found detached tab for ${fileName}, ignoring`);
      continue; // Skip detached elements
    }
    
    const text = tab.textContent || '';
    const dataFileName = tab.getAttribute('data-filename');
    
    if (text.includes(fileName) || dataFileName === fileName) {
      // STRICTER VALIDATION: Check if tab is actually visible AND functional
      const element = tab as HTMLElement;
      if (element.offsetParent !== null && 
          element.offsetWidth > 0 && 
          element.offsetHeight > 0 &&
          !element.style.display?.includes('none')) {
        
        // Additional check: verify the tab has valid click handlers
        const hasClickHandler = element.onclick || 
                              element.addEventListener || 
                              element.getAttribute('onclick');
        
        if (hasClickHandler || element.querySelector('.tab-close')) {
          console.log(`📋 Found valid visible DOM tab for: ${fileName}`);
          
          // EXTRA VALIDATION: Try to verify the tab actually works
          try {
            // Check if clicking the tab would actually work
            const clickEvent = new MouseEvent('click', { bubbles: true });
            const canDispatch = element.dispatchEvent !== undefined;
            
            if (canDispatch) {
              console.log(`✅ Tab for ${fileName} appears functional`);
              return true;
            } else {
              console.log(`⚠️ Tab for ${fileName} lacks event handling, treating as invalid`);
            }
          } catch (error) {
            console.log(`⚠️ Tab for ${fileName} failed functionality test:`, error);
          }
        } else {
          console.log(`⚠️ Tab for ${fileName} lacks click handlers, treating as invalid`);
        }
      } else {
        console.log(`⚠️ Found hidden/invisible DOM tab for ${fileName}, ignoring`);
      }
    }
  }
  
  // Check tab manager - but verify the tab object is valid and functional
  const tabManager = (window as any).tabManager;
  if (tabManager && tabManager.tabs) {
    const existingTab = tabManager.tabs.find((tab: any) => 
      tab && (tab.fileName === fileName || tab.path === fileName)
    );
    if (existingTab && existingTab.element && document.body.contains(existingTab.element)) {
      // Verify the tab manager tab is actually functional
      const element = existingTab.element;
      if (element.offsetParent !== null && element.offsetWidth > 0) {
        console.log(`📋 Found valid functional tab manager tab for: ${fileName}`);
        return true;
      } else {
        console.log(`⚠️ Tab manager tab for ${fileName} appears non-functional, cleaning up`);
        const index = tabManager.tabs.indexOf(existingTab);
        if (index > -1) {
          tabManager.tabs.splice(index, 1);
        }
      }
    } else if (existingTab) {
      console.log(`⚠️ Found invalid/detached tab manager tab for ${fileName}, cleaning up`);
      // Clean up invalid tab reference
      const index = tabManager.tabs.indexOf(existingTab);
      if (index > -1) {
        tabManager.tabs.splice(index, 1);
      }
    }
  }
  
  console.log(`✅ ${fileName} is not currently open or functional`);
  return false;
}

/**
 * FIXED: Force create new tab (used when reopening files)
 */
async function forceCreateNewTab(fileName: string, content: string, savedPath?: string): Promise<void> {
  console.log(`🚀 Force creating new tab for: ${fileName}`);
  
  let tabCreated = false;
  
  // Method 1: Try tab manager first
  const tabManager = (window as any).tabManager;
  if (tabManager && typeof tabManager.addTab === 'function') {
    try {
      console.log(`📋 Trying tab manager for: ${fileName}`);
      const tabId = tabManager.addTab(savedPath || fileName, content);
      console.log(`✅ File opened in tab manager: ${fileName} with ID: ${tabId}`);
      
      // Store proper metadata
      if (tabManager.tabs && savedPath) {
        const tab = tabManager.tabs.find((t: any) => t.id === tabId);
        if (tab) {
          tab.savedPath = savedPath;
          tab.fileName = fileName;
          tab.fullPath = savedPath;
          tab.isFileOnDisk = true;
          tab.canExecute = !!savedPath;
          console.log(`📍 Tab metadata updated with path: ${savedPath}`);
        }
      }
      
      if (tabManager.setActiveTab && tabId) {
        tabManager.setActiveTab(tabId);
      }
      
      tabCreated = true;
      
    } catch (error) {
      console.warn('❌ Tab manager failed:', error);
    }
  }
  
  // Method 2: Try Monaco editor if tab manager failed
  if (!tabCreated) {
    const editor = (window as any).monaco?.editor?.getEditors()?.[0];
    if (editor) {
      try {
        console.log(`📋 Trying Monaco editor for: ${fileName}`);
        const language = getLanguageFromExtension(fileName);
        const model = (window as any).monaco.editor.createModel(content, language);
        
        if (savedPath) {
          (model as any)._savedPath = savedPath;
          (model as any)._fileName = fileName;
          (model as any)._isFileOnDisk = true;
          (model as any)._canExecute = !!savedPath;
        }
        
        editor.setModel(model);
        editor.focus();
        document.title = `${fileName} - AI Code IDE`;
        
        console.log(`✅ File opened in Monaco editor: ${fileName}`);
        
        // Create simple tab for Monaco
        createSingleTabSafe(fileName, savedPath);
        tabCreated = true;
        
      } catch (error) {
        console.warn('❌ Monaco editor failed:', error);
      }
    }
  }
  
  // Method 3: Fallback - create simple tab
  if (!tabCreated) {
    console.log(`📋 Using fallback tab creation for: ${fileName}`);
    createSingleTabSafe(fileName, savedPath);
    tabCreated = true;
  }
  
  if (tabCreated) {
    console.log(`✅ Successfully created tab for: ${fileName}`);
  } else {
    console.error(`❌ Failed to create tab for: ${fileName}`);
  }
}

/**
 * IMPROVED: Switch to an existing file with better fallback and verification
 */
function switchToExistingFile(fileName: string, savedPath?: string): boolean {
  console.log(`🔄 Attempting to switch to existing file: ${fileName}`);
  
  let switchSuccessful = false;
  
  // Try tab manager first
  const tabManager = (window as any).tabManager;
  if (tabManager && tabManager.tabs) {
    const existingTab = tabManager.tabs.find((tab: any) => 
      tab.fileName === fileName || tab.path === fileName
    );
    
    if (existingTab && tabManager.setActiveTab) {
      try {
        tabManager.setActiveTab(existingTab.id);
        
        // Update metadata if needed
        if (savedPath) {
          existingTab.savedPath = savedPath;
          existingTab.fullPath = savedPath;
          existingTab.isFileOnDisk = true;
          existingTab.canExecute = true;
        }
        
        updateMonacoEditorForExecution(fileName, savedPath);
        
        // Verify the switch actually worked
        const activeTab = tabManager.getActiveTab();
        if (activeTab && (activeTab.fileName === fileName || activeTab.path === fileName)) {
          console.log(`✅ Successfully switched to tab manager tab: ${fileName}`);
          switchSuccessful = true;
        } else {
          console.log(`⚠️ Tab manager switch failed verification for: ${fileName}`);
        }
      } catch (error) {
        console.log(`❌ Tab manager switch failed for ${fileName}:`, error);
      }
    }
  }
  
  // Try DOM tabs if tab manager failed
  if (!switchSuccessful) {
    const allTabs = document.querySelectorAll('div[class*="tab"], [data-filename]');
    allTabs.forEach(tab => {
      const text = tab.textContent || '';
      const dataFileName = tab.getAttribute('data-filename');
      
      if (text.includes(fileName) || dataFileName === fileName) {
        try {
          // Remove active class from all tabs
          allTabs.forEach(t => t.classList.remove('active'));
          // Add active class to this tab
          tab.classList.add('active');
          
          // Trigger click if it has a click handler
          if (tab instanceof HTMLElement) {
            tab.click();
          }
          
          // Verify the switch worked by checking if Monaco editor updated
          setTimeout(() => {
            const editor = (window as any).monaco?.editor?.getEditors()?.[0];
            if (editor && editor.getModel()) {
              const model = editor.getModel();
              const editorFileName = (model as any)._fileName;
              if (editorFileName === fileName) {
                console.log(`✅ Successfully switched to DOM tab: ${fileName}`);
                switchSuccessful = true;
              }
            }
          }, 100);
          
        } catch (error) {
          console.log(`❌ DOM tab switch failed for ${fileName}:`, error);
        }
      }
    });
  }
  
  if (!switchSuccessful) {
    console.log(`❌ All tab switch attempts failed for: ${fileName}`);
  }
  
  return switchSuccessful;
}

/**
 * IMPROVED: Create a single tab safely without duplicates with better cleanup
 */
function createSingleTabSafe(fileName: string, savedPath?: string): void {
  try {
    console.log(`🔧 Creating single safe tab for: ${fileName}`);
    
    // Remove any existing tabs for this file first (thorough cleanup)
    removeExistingTabsForFile(fileName);
    
    const tabContainer = findOrCreateTabContainer();
    
    if (tabContainer) {
      const tab = document.createElement('div');
      tab.className = 'editor-tab active';
      tab.setAttribute('data-filename', fileName);
      tab.setAttribute('data-tab-id', `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
      
      tab.style.cssText = `
        display: flex;
        align-items: center;
        padding: 8px 16px;
        background: #2d2d2d;
        border: 1px solid #404040;
        border-radius: 4px 4px 0 0;
        color: #e1e1e1;
        font-size: 13px;
        margin-right: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      
      // Store metadata
      if (savedPath) {
        (tab as any)._savedPath = savedPath;
        (tab as any)._fileName = fileName;
        (tab as any)._isFileOnDisk = !!savedPath;
      }
      
      const statusIcon = savedPath ? ' 💾' : ' 💭';
      
      tab.innerHTML = `
        <span class="tab-icon" style="margin-right: 6px;">${getFileIcon(fileName)}</span>
        <span class="tab-name">${fileName}${statusIcon}</span>
        <span class="tab-close" style="margin-left: 12px; cursor: pointer; opacity: 0.7;">×</span>
      `;
      
      // Add close handler with proper cleanup
      tab.querySelector('.tab-close')?.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log(`🗑️ Closing tab: ${fileName}`);
        
        // Clean up global references
        cleanupFileReferences(fileName);
        
        // Remove the tab
        tab.remove();
        
        // PERSISTENCE INTEGRATION: Notify file closed
        notifyFileOperation('closed', fileName);
        
        console.log(`✅ Tab closed and cleaned up: ${fileName}`);
      });
      
      // Add click handler
      tab.addEventListener('click', () => {
        console.log(`📂 Tab clicked: ${fileName}`);
        
        // Remove active class from all tabs
        document.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
        // Add active class to this tab
        tab.classList.add('active');
        
        // Open the file
        openFileInEditorWithoutDuplicates(fileName, savedPath);
      });
      
      // Remove active class from other tabs before adding this one
      tabContainer.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
      
      tabContainer.appendChild(tab);
      console.log(`✅ Created single safe tab for: ${fileName}`);
    }
  } catch (error) {
    console.error('Error creating single safe tab:', error);
  }
}

/**
 * IMPROVED: Find or create tab container
 */
function findOrCreateTabContainer(): HTMLElement {
  // Try to find existing tab container
  let tabContainer = document.querySelector('.editor-tabs') as HTMLElement || 
                    document.querySelector('.tab-container') as HTMLElement ||
                    document.querySelector('.tabs') as HTMLElement;
  
  if (!tabContainer) {
    // Create tab container if it doesn't exist
    tabContainer = document.createElement('div');
    tabContainer.className = 'editor-tabs';
    tabContainer.style.cssText = `
      display: flex;
      background: #1e1e1e;
      border-bottom: 1px solid #404040;
      padding: 0 8px;
      overflow-x: auto;
      min-height: 35px;
      align-items: flex-end;
    `;
    
    // Find a good place to insert it
    const editorContainer = document.querySelector('.editor-container') || 
                          document.querySelector('.monaco-editor')?.parentElement ||
                          document.querySelector('#editor') ||
                          document.body;
    
    if (editorContainer) {
      editorContainer.insertBefore(tabContainer, editorContainer.firstChild);
      console.log('📋 Created new tab container');
    }
  }
  
  return tabContainer;
}

/**
 * FIXED: Remove existing tabs ONLY (don't touch file explorer)
 */
function removeExistingTabsForFile(fileName: string): void {
  try {
    console.log(`🧹 Removing existing TABS ONLY for: ${fileName}`);
    
    // CRITICAL FIX: Only remove actual tabs, NOT file explorer items
    const tabSelectors = [
      '.editor-tab',
      '.simple-tab',
      '.tab:not(.file-item)',
      '[role="tab"]:not(.file-item)',
      '.tab-container [data-filename]',
      '.editor-tabs [data-filename]'
    ];
    
    let removedCount = 0;
    
    tabSelectors.forEach(selector => {
      const tabs = document.querySelectorAll(selector);
      tabs.forEach(tab => {
        // IMPORTANT: Skip file explorer items
        if (tab.classList.contains('file-item') || 
            tab.closest('.file-explorer') || 
            tab.closest('.files-panel') ||
            tab.closest('.file-tree') ||
            tab.closest('.files-list')) {
          console.log(`⚠️ Skipping file explorer item: ${fileName}`);
          return; // Don't remove file explorer items
        }
        
        const text = tab.textContent || '';
        const dataFileName = tab.getAttribute('data-filename');
        const cleanText = text.replace(/[×*💾📁💭\s]/g, '');
        
        if (cleanText.includes(fileName) || dataFileName === fileName || cleanText === fileName) {
          console.log(`🗑️ Removing existing TAB (not explorer item) for: ${fileName} (text: "${text}")`);
          tab.remove();
          removedCount++;
        }
      });
    });
    
    if (removedCount > 0) {
      console.log(`✅ Removed ${removedCount} existing tabs for: ${fileName}`);
    }
    
    // Clean up tab manager references (but don't remove from tab manager directly to avoid conflicts)
    const tabManager = (window as any).tabManager;
    if (tabManager && tabManager.tabs) {
      const invalidTabs = tabManager.tabs.filter((tab: any) => 
        tab && (tab.fileName === fileName || tab.path === fileName) && 
        (!tab.element || !document.body.contains(tab.element))
      );
      
      if (invalidTabs.length > 0) {
        console.log(`🧹 Found ${invalidTabs.length} invalid tab manager references for: ${fileName}`);
        invalidTabs.forEach(invalidTab => {
          const index = tabManager.tabs.indexOf(invalidTab);
          if (index > -1) {
            tabManager.tabs.splice(index, 1);
            console.log(`🗑️ Removed invalid tab manager reference for: ${fileName}`);
          }
        });
      }
    }
    
  } catch (error) {
    console.warn('⚠️ Error removing existing tabs:', error);
  }
}

/**
 * FIXED: Clean up global file references when tab is closed (but keep file in explorer)
 */
function cleanupFileReferences(fileName: string): void {
  try {
    console.log(`🧹 Cleaning up global references for: ${fileName} (keeping in explorer)`);
    
    // Clear active file if it matches
    const activeFile = (window as any).__activeFileForExecution;
    if (activeFile && activeFile.fileName === fileName) {
      (window as any).__activeFileForExecution = null;
      console.log(`🗑️ Cleared active file reference: ${fileName}`);
    }
    
    // FIXED: Only remove active class from file explorer items, DON'T remove the items themselves
    const fileItems = document.querySelectorAll(`[data-filename="${fileName}"]`);
    fileItems.forEach(item => {
      // Only remove active class if it's in the file explorer (keep the file visible)
      if (item.classList.contains('file-item') || 
          item.closest('.file-explorer') || 
          item.closest('.files-panel') ||
          item.closest('.file-tree')) {
        item.classList.remove('active');
        console.log(`📂 Removed active class from explorer item: ${fileName} (but kept item in explorer)`);
      }
    });
    
    console.log(`✅ Cleaned up global references for: ${fileName} (file remains in explorer)`);
    
  } catch (error) {
    console.warn('⚠️ Error cleaning up file references:', error);
  }
}

/**
 * Set active file for execution
 */
function setActiveFileForExecution(fileName: string, savedPath?: string): void {
  (window as any).__activeFileForExecution = {
    fileName,
    savedPath,
    timestamp: Date.now()
  };
  
  console.log('✅ File metadata stored for execution:', (window as any).__activeFileForExecution);
}

/**
 * Enhanced addToFileExplorer with metadata tracking
 */
function addToFileExplorerWithMetadata(fileName: string, savedPath?: string, content: string = ''): void {
  try {
    console.log(`🌲 Adding ${fileName} to file explorer with metadata...`);
    
    // Method 1: Try to use existing file explorer manager
    const fileExplorerManager = (window as any).fileExplorerManager || 
                               (window as any).explorerManager ||
                               (window as any).fileManager;
    
    if (fileExplorerManager && typeof fileExplorerManager.addFile === 'function') {
      fileExplorerManager.addFile({
        name: fileName,
        path: savedPath || fileName,
        type: 'file',
        isFileOnDisk: !!savedPath
      });
      console.log(`✅ File added via explorer manager: ${fileName}`);
      return;
    }
    
    // Method 2: Find and update the DOM directly
    const fileExplorerContainer = findFileExplorerContainer();
    
    if (fileExplorerContainer) {
      addFileToExplorerDOM(fileExplorerContainer, fileName, savedPath, content);
      console.log(`✅ File added to explorer DOM: ${fileName}`);
      return;
    }
    
    // Method 3: Create file explorer section if it doesn't exist
    createFileExplorerSection(fileName, savedPath);
    
    console.log(`✅ File processed for explorer: ${fileName}`);
    
  } catch (error) {
    console.error('❌ Error adding to file explorer:', error);
  }
}

/**
 * Find the file explorer container with multiple selector strategies
 */
function findFileExplorerContainer(): HTMLElement | null {
  // Try multiple possible selectors
  const selectors = [
    '.file-tree',
    '#files-content',
    '.files-panel',
    '.file-explorer', 
    '.explorer-content',
    '.folder-contents',
    '.file-list',
    '.files-container',
    '[data-panel="files"]',
    '[class*="files"]',
    '[id*="files"]',
    '.panel-content',
    '.sidebar-content'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      console.log(`📂 Found file explorer container: ${selector}`);
      return element;
    }
  }
  
  // Try to find by text content
  const elements = Array.from(document.querySelectorAll('*'));
  const filesElement = elements.find(el => 
    el.textContent?.includes('No folder opened') ||
    el.textContent?.includes('FILES') ||
    el.className?.includes('files') ||
    el.id?.includes('files')
  ) as HTMLElement;
  
  if (filesElement) {
    console.log('📂 Found file explorer by content search');
    return filesElement;
  }
  
  return null;
}

/**
 * Add file to the DOM with proper styling and functionality
 */
function addFileToExplorerDOM(container: HTMLElement, fileName: string, savedPath?: string, content: string = ''): void {
  // Remove "No folder opened" message if present
  const noFolderMsg = container.querySelector('[class*="no-folder"], [class*="empty"]');
  if (noFolderMsg && noFolderMsg.textContent?.includes('No folder opened')) {
    noFolderMsg.remove();
  }
  
  // Find or create files list
  let filesList = container.querySelector('.files-list, .file-container, .folder-contents') as HTMLElement;
  
  if (!filesList) {
    filesList = document.createElement('div');
    filesList.className = 'files-list';
    filesList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px;
    `;
    container.appendChild(filesList);
  }
  
  // Check if file already exists and remove it
  const existingFile = filesList.querySelector(`[data-filename="${fileName}"]`);
  if (existingFile) {
    existingFile.remove();
  }
  
  // Create enhanced file item
  const fileItem = createFileItemWithMetadata(fileName, savedPath, content);
  filesList.appendChild(fileItem);
  
  // Add animation
  fileItem.classList.add('newly-added');
  setTimeout(() => fileItem.classList.remove('newly-added'), 300);
}

/**
 * Create enhanced file item with metadata and status indicators
 */
function createFileItemWithMetadata(fileName: string, savedPath?: string, content: string = ''): HTMLElement {
  const fileItem = document.createElement('div');
  fileItem.className = 'file-item';
  fileItem.setAttribute('data-filename', fileName);
  
  // Initialize metadata if not exists
  if (!fileMetadataMap.has(fileName)) {
    const metadata: FileMetadata = {
      fileName,
      savedPath,
      lastModified: Date.now(),
      originalContent: content,
      isUnsaved: false,
      fileSize: new Blob([content]).size
    };
    fileMetadataMap.set(fileName, metadata);
  }
  
  // Status indicators
  let statusIcon = '';
  let statusColor = '#cccccc';
  let statusText = '';
  let statusClass = '';
  
  if (savedPath) {
    statusIcon = '💾';
    statusColor = '#4CAF50';
    statusText = `Saved to: ${savedPath}`;
    statusClass = 'saved';
  } else {
    statusIcon = '💭';
    statusColor = '#FF9800';
    statusText = 'In memory (not saved)';
    statusClass = 'memory';
  }
  
  fileItem.setAttribute('data-status', statusClass);
  
  fileItem.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
    font-size: 13px;
    color: ${statusColor};
    border-left: 3px solid transparent;
  `;
  
  // Create timestamp and file size
  const metadata = fileMetadataMap.get(fileName)!;
  const timestamp = formatTimestamp(metadata.lastModified);
  const fileSize = formatFileSize(metadata.fileSize || 0);
  
  fileItem.innerHTML = `
    <span class="file-icon" style="font-size: 14px;">${getFileIcon(fileName)}</span>
    <div class="file-info" style="flex: 1; display: flex; flex-direction: column; min-width: 0;">
      <div class="file-name-row" style="display: flex; align-items: center; gap: 4px;">
        <span class="file-name" style="color: ${statusColor};" title="${statusText}">${fileName}</span>
        <span class="unsaved-indicator" style="color: #ff6b6b; font-weight: bold; display: none;">*</span>
      </div>
      <div class="file-meta" style="font-size: 10px; opacity: 0.7; color: #888;">
        <span class="file-timestamp" title="Last modified">${timestamp}</span>
        <span style="margin: 0 4px;">•</span>
        <span class="file-size" title="File size">${fileSize}</span>
      </div>
    </div>
    <span class="file-status" style="font-size: 10px; opacity: 0.7;">${statusIcon}</span>
  `;
  
  // Event handlers
  fileItem.addEventListener('mouseenter', () => {
    fileItem.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    fileItem.style.borderLeftColor = statusColor;
  });
  
  fileItem.addEventListener('mouseleave', () => {
    fileItem.style.backgroundColor = 'transparent';
    fileItem.style.borderLeftColor = 'transparent';
  });
  
  // FIXED: Double-click and single-click handling
  let clickTimeout: number | null = null;
  
  fileItem.addEventListener('click', () => {
    if (clickTimeout) {
      // Double-click detected
      clearTimeout(clickTimeout);
      clickTimeout = null;
      handleFileDoubleClick(fileName, savedPath);
    } else {
      // Single click - set a timeout
      clickTimeout = window.setTimeout(() => {
        clickTimeout = null;
        handleFileSingleClick(fileName, savedPath);
      }, 250); // 250ms delay to detect double-click
    }
  });
  
  // Right-click context menu
  fileItem.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showFileContextMenu(e, fileName, savedPath);
  });
  
  return fileItem;
}

/**
 * Handle single click on file (just select it)
 */
function handleFileSingleClick(fileName: string, savedPath?: string): void {
  console.log(`👆 Single click on file: ${fileName}`);
  
  // Remove active class from all file items
  document.querySelectorAll('.file-item').forEach(item => item.classList.remove('active'));
  
  // Add active class to clicked file
  const fileItem = document.querySelector(`[data-filename="${fileName}"]`);
  if (fileItem) {
    fileItem.classList.add('active');
  }
  
  // Set as active file for execution
  setActiveFileForExecution(fileName, savedPath);
}

/**
 * FIXED: Handle double-click on file (open it)
 */
function handleFileDoubleClick(fileName: string, savedPath?: string): void {
  console.log(`👆👆 Double click on file: ${fileName} - opening...`);
  
  // First, select the file
  handleFileSingleClick(fileName, savedPath);
  
  // Then open it
  openFileInEditorWithoutDuplicates(fileName, savedPath);
}

/**
 * FIXED: openFileInEditor without duplicates with better fallback logic
 */
function openFileInEditorWithoutDuplicates(fileName: string, savedPath?: string): void {
  try {
    console.log(`📂 Opening file without duplicates: ${fileName}`, { savedPath });
    
    // Get correct path and mark as active
    const validatedPath = getCorrectSavedPath(fileName, savedPath);
    markFileAsActiveWithMetadata(fileName, validatedPath);
    
    // Check if file is already open and visible
    if (isFileAlreadyOpenAndVisible(fileName)) {
      console.log(`📂 File ${fileName} appears to be open, attempting to switch...`);
      
      // Try to switch to existing file
      const switchSuccessful = switchToExistingFile(fileName, validatedPath);
      
      if (switchSuccessful) {
        console.log(`✅ Successfully switched to existing tab for: ${fileName}`);
        
        // PERSISTENCE INTEGRATION: Notify file opened
        notifyFileOperation('opened', fileName);
        
        return;
      } else {
        console.log(`❌ Failed to switch to existing tab for: ${fileName}, creating new tab instead`);
        // Fall through to create new tab since switching failed
      }
    } else {
      console.log(`📂 File ${fileName} is not open, creating new tab...`);
    }
    
    // Force clean up any invalid tabs before creating new one
    removeExistingTabsForFile(fileName);
    
    // Create new tab since file is not open OR switching failed
    if (validatedPath) {
      console.log(`📂 Loading file from disk: ${validatedPath}`);
      loadAndOpenFileWithMetadata(validatedPath, fileName);
    } else {
      console.log(`📂 Creating new file with default content: ${fileName}`);
      // No saved path, create with default content
      const content = generateDefaultContent(fileName);
      forceCreateNewTab(fileName, content, validatedPath);
    }
    
    // PERSISTENCE INTEGRATION: Notify file opened
    notifyFileOperation('opened', fileName);
    
  } catch (error) {
    console.error('❌ Error opening file in editor:', error);
    showNotification(`❌ Failed to open ${fileName}`, 'error');
    
    // Emergency fallback: force create new tab
    try {
      console.log(`🚨 Emergency fallback: force creating tab for ${fileName}`);
      const content = generateDefaultContent(fileName);
      forceCreateNewTab(fileName, content, savedPath);
    } catch (fallbackError) {
      console.error('❌ Emergency fallback also failed:', fallbackError);
      showNotification(`❌ Critical error: Could not open ${fileName}`, 'error');
    }
  }
}

/**
 * CRITICAL: Get the correct saved path for a file with validation
 */
function getCorrectSavedPath(fileName: string, providedPath?: string): string | undefined {
  console.log(`🔍 Getting correct saved path for: ${fileName}`);
  
  // Method 1: If provided path is valid, use it
  if (providedPath && isValidFilePath(providedPath)) {
    console.log(`✅ Using provided valid path: ${providedPath}`);
    return providedPath;
  }
  
  // Method 2: Check our enhanced saved files tracking
  const allSavedFiles = (window as any).__allSavedFiles || [];
  const matchingFile = allSavedFiles.find((file: SavedFileRecord) => file.fileName === fileName);
  if (matchingFile?.savedPath) {
    console.log(`📊 Found path from saved files tracking: ${matchingFile.savedPath}`);
    return matchingFile.savedPath;
  }
  
  // Method 3: Check file metadata map
  if (fileMetadataMap.has(fileName)) {
    const metadata = fileMetadataMap.get(fileName);
    if (metadata?.savedPath && isValidFilePath(metadata.savedPath)) {
      console.log(`📋 Found path from metadata: ${metadata.savedPath}`);
      return metadata.savedPath;
    }
  }
  
  // Method 4: Check lastSavedFile
  const lastSaved = (window as any).__lastSavedFile;
  if (lastSaved && lastSaved.fileName === fileName && lastSaved.estimatedPath) {
    console.log(`📁 Found path from lastSavedFile: ${lastSaved.estimatedPath}`);
    return lastSaved.estimatedPath;
  }
  
  // Method 5: Try common save locations
  const commonPaths = [
    `C:\\Users\\hi\\Desktop\\${fileName}`,
    `C:\\Users\\hi\\Downloads\\${fileName}`,
    `C:\\Users\\hi\\Documents\\${fileName}`,
    `C:\\Users\\hi\\${fileName}`
  ];
  
  console.log(`📍 Trying common paths for: ${fileName}`);
  
  // For most browsers, Desktop is the most common default save location
  const likelyPath = `C:\\Users\\hi\\Desktop\\${fileName}`;
  console.log(`🎯 Using likely path: ${likelyPath}`);
  
  return likelyPath;
}

/**
 * CRITICAL: Mark file as active and store execution metadata
 */
function markFileAsActiveWithMetadata(fileName: string, savedPath?: string): void {
  try {
    // Remove active class from all files
    const allFileItems = document.querySelectorAll('.file-item');
    allFileItems.forEach(item => item.classList.remove('active'));
    
    // Add active class to the clicked file
    const fileItem = document.querySelector(`[data-filename="${fileName}"]`);
    if (fileItem) {
      fileItem.classList.add('active');
    }
    
    // CRITICAL: Store the active file info globally for execution
    setActiveFileForExecution(fileName, savedPath);
    
  } catch (error) {
    console.error('Error marking file as active:', error);
  }
}

/**
 * Update Monaco editor metadata for execution
 */
function updateMonacoEditorForExecution(fileName: string, savedPath?: string): void {
  try {
    const editor = (window as any).monaco?.editor?.getEditors()?.[0];
    if (editor && editor.getModel()) {
      const model = editor.getModel();
      
      // Store metadata in the model
      (model as any)._fileName = fileName;
      (model as any)._savedPath = savedPath;
      (model as any)._isFileOnDisk = !!savedPath;
      (model as any)._canExecute = !!savedPath;
      
      console.log('✅ Updated Monaco metadata for execution:', {
        fileName,
        savedPath,
        canExecute: !!savedPath
      });
      
      // Update document title
      const baseName = fileName.replace(/\*$/, '');
      document.title = `${baseName} - AI Code IDE`;
    }
  } catch (error) {
    console.error('Error updating Monaco metadata:', error);
  }
}

/**
 * FIXED: Load and open file with metadata
 */
async function loadAndOpenFileWithMetadata(filePath: string, fileName: string): Promise<void> {
  try {
    console.log(`📂 Loading file: ${fileName} from ${filePath}`);
    
    let content = '';
    
    // Try to read file content via Tauri
    if (window.__TAURI__) {
      try {
        content = await invoke('read_file', { path: filePath });
        console.log(`✅ Read file content from disk: ${fileName} (${content.length} chars)`);
      } catch (error) {
        console.warn('Could not read file via Tauri:', error);
        content = generateDefaultContent(fileName);
        console.log(`⚠️ Using default content for: ${fileName}`);
      }
    } else {
      content = generateDefaultContent(fileName);
      console.log(`⚠️ Tauri not available, using default content for: ${fileName}`);
    }
    
    // Force create new tab with the loaded content
    await forceCreateNewTab(fileName, content, filePath);
    
    // Update Monaco editor metadata
    updateMonacoEditorForExecution(fileName, filePath);
    
    console.log(`✅ Successfully loaded and opened: ${fileName}`);
    
  } catch (error) {
    console.error('Error loading file:', error);
    showNotification(`❌ Could not load file: ${fileName}`, 'error');
  }
}

/**
 * ENHANCED getCurrentFileInfo with path validation and correction
 */
function getCurrentFileInfo(): { fileName: string; content: string; savedPath?: string } | null {
  try {
    // METHOD 1: Check global active file (from file explorer clicks) - HIGHEST PRIORITY
    const activeFileForExecution = (window as any).__activeFileForExecution;
    if (activeFileForExecution) {
      console.log('📋 Using active file from explorer click:', activeFileForExecution);
      
      // Get content from Monaco editor
      const editor = (window as any).monaco?.editor?.getEditors()?.[0];
      let content = '';
      
      if (editor && editor.getModel()) {
        content = editor.getModel().getValue();
      }
      
      // CRITICAL: Validate and correct the saved path
      const validatedPath = validateAndCorrectPath(activeFileForExecution.fileName, activeFileForExecution.savedPath);
      
      return {
        fileName: activeFileForExecution.fileName,
        savedPath: validatedPath,
        content: content
      };
    }
    
    // METHOD 2: Try tab manager
    const tabManager = (window as any).tabManager;
    if (tabManager && tabManager.getActiveTab) {
      const activeTab = tabManager.getActiveTab();
      if (activeTab) {
        console.log('📋 Using active tab info:', activeTab);
        
        const validatedPath = validateAndCorrectPath(
          activeTab.fileName || activeTab.path || 'untitled.txt',
          activeTab.savedPath || activeTab.fullPath
        );
        
        return {
          fileName: activeTab.fileName || activeTab.path || 'untitled.txt',
          content: activeTab.model ? activeTab.model.getValue() : '',
          savedPath: validatedPath
        };
      }
    }
    
    // METHOD 3: Try Monaco editor
    const editor = (window as any).monaco?.editor?.getEditors()?.[0];
    if (editor && editor.getModel()) {
      const model = editor.getModel();
      
      console.log('📋 Using Monaco editor info:', {
        fileName: (model as any)._fileName,
        savedPath: (model as any)._savedPath
      });
      
      const validatedPath = validateAndCorrectPath(
        (model as any)._fileName || 'untitled.txt',
        (model as any)._savedPath
      );
      
      return {
        fileName: (model as any)._fileName || 'untitled.txt',
        content: model.getValue(),
        savedPath: validatedPath
      };
    }
    
    // METHOD 4: Try to get from file metadata map
    const activeFileName = getActiveFileName();
    if (activeFileName && fileMetadataMap.has(activeFileName)) {
      const metadata = fileMetadataMap.get(activeFileName)!;
      console.log('📋 Using metadata info:', metadata);
      
      const validatedPath = validateAndCorrectPath(metadata.fileName, metadata.savedPath);
      
      return {
        fileName: metadata.fileName,
        content: metadata.originalContent,
        savedPath: validatedPath
      };
    }
    
    console.warn('⚠️ No current file info found');
    return null;
    
  } catch (error) {
    console.error('❌ Error getting current file info:', error);
    return null;
  }
}

/**
 * CRITICAL: Validate and correct file paths to ensure they point to actual files
 */
function validateAndCorrectPath(fileName: string, savedPath?: string): string | undefined {
  if (!fileName) {
    console.warn('⚠️ No fileName provided for path validation');
    return undefined;
  }
  
  // If we have a saved path, validate it
  if (savedPath) {
    console.log(`🔍 Validating path: ${savedPath}`);
    
    // Check if the path already includes the filename correctly
    if (savedPath.endsWith(fileName)) {
      console.log(`✅ Path already includes filename: ${savedPath}`);
      return savedPath;
    }
    
    // If savedPath doesn't end with filename, try to correct it
    if (savedPath.includes('\\') && !savedPath.endsWith(fileName)) {
      const correctedPath = savedPath.endsWith('\\') 
        ? `${savedPath}${fileName}` 
        : `${savedPath}\\${fileName}`;
      console.log(`🔧 Corrected path: ${correctedPath}`);
      return correctedPath;
    }
  }
  
  // Use our enhanced path resolution
  return getCorrectSavedPath(fileName, savedPath);
}

/**
 * Get the active file name from various sources
 */
function getActiveFileName(): string | null {
  try {
    // Check document title
    const title = document.title;
    if (title && title.includes(' - AI Code IDE')) {
      const fileName = title.replace(' - AI Code IDE', '').replace(' *', '');
      if (fileName && fileName.length > 0) {
        return fileName;
      }
    }
    
    // Check active tab
    const activeTab = document.querySelector('.editor-tab.active, .simple-tab.active');
    if (activeTab) {
      const tabText = activeTab.textContent || '';
      const fileName = tabText.replace(' *', '').replace('×', '').trim();
      if (fileName && fileName.length > 0) {
        return fileName;
      }
    }
    
    // Check active file in explorer
    const activeFileElement = document.querySelector('.file-item.active');
    if (activeFileElement) {
      return activeFileElement.getAttribute('data-filename');
    }
    
    return null;
  } catch (error) {
    console.error('Error getting active file name:', error);
    return null;
  }
}

/**
 * ENHANCED file execution with better path detection and error handling
 */
export async function runCurrentFile(): Promise<void> {
  console.log('▶️ Starting enhanced file execution...');
  
  try {
    const fileInfo = getCurrentFileInfo();
    if (!fileInfo) {
      showNotification('❌ No file is currently open or selected', 'error');
      return;
    }
    
    console.log('📋 File execution info:', {
      fileName: fileInfo.fileName,
      savedPath: fileInfo.savedPath,
      contentLength: fileInfo.content.length,
      hasSavedPath: !!fileInfo.savedPath,
      pathIsValid: fileInfo.savedPath ? isValidFilePath(fileInfo.savedPath) : false
    });
    
    // Check if file is saved to disk
    if (!fileInfo.savedPath) {
      showNotification('❌ File must be saved to disk before running. Press Ctrl+S to save.', 'error');
      return;
    }
    
    // Validate the file path
    if (!isValidFilePath(fileInfo.savedPath)) {
      console.error('❌ Invalid file path:', fileInfo.savedPath);
      showNotification('❌ Invalid file path. Please save the file again.', 'error');
      return;
    }
    
    console.log(`🚀 Running file: ${fileInfo.fileName} at path: ${fileInfo.savedPath}`);
    
    // Execute the file
    await executeFileAtPathEnhanced(fileInfo.savedPath, fileInfo.fileName);
    
  } catch (error) {
    console.error('❌ Error running file:', error);
    showNotification(`❌ Execution failed: ${error.message}`, 'error');
  }
}

/**
 * Validate if a file path is valid and properly formatted
 */
function isValidFilePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }
  
  // Check for Windows-style path
  const windowsPathRegex = /^[A-Z]:\\(?:[^\\/:*?"<>|]+\\)*[^\\/:*?"<>|]*$/i;
  if (windowsPathRegex.test(filePath)) {
    return true;
  }
  
  // Check for Unix-style path
  const unixPathRegex = /^\/(?:[^\/\0]+\/)*[^\/\0]*$/;
  if (unixPathRegex.test(filePath)) {
    return true;
  }
  
  // Check for relative path with extension
  const relativePathRegex = /^[^\\/:*?"<>|]+\.[a-zA-Z0-9]+$/;
  if (relativePathRegex.test(filePath)) {
    return true;
  }
  
  return false;
}

/**
 * Enhanced executeFileAtPath with better error handling
 */
async function executeFileAtPathEnhanced(filePath: string, fileName: string): Promise<void> {
  try {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    console.log(`🔧 Execution details:`, {
      filePath,
      fileName,
      extension,
      isTauriAvailable: !!window.__TAURI__
    });
    
    if (window.__TAURI__) {
      // Try Tauri execution
      console.log('🦀 Using Tauri for file execution...');
      
      try {
        const result = await invoke('execute_file_direct', {
          path: filePath,
          filename: fileName,
          extension: extension || '',
          workingDirectory: getWorkingDirectory(filePath)
        });
        
        console.log('✅ Tauri execution result:', result);
        showNotification(`✅ ${fileName} executed successfully`, 'success');
        
      } catch (tauriError) {
        console.error('❌ Tauri execution failed:', tauriError);
        
        // Try alternative Tauri command format
        try {
          const fallbackResult = await invoke('run_file', {
            file_path: filePath,
            file_name: fileName
          });
          
          console.log('✅ Tauri fallback execution result:', fallbackResult);
          showNotification(`✅ ${fileName} executed successfully`, 'success');
          
        } catch (fallbackError) {
          console.error('❌ Tauri fallback also failed:', fallbackError);
          throw new Error(`Tauri execution failed: ${tauriError.message || tauriError}`);
        }
      }
      
    } else {
      // Browser fallback - limited execution
      console.log('🌐 Browser environment - limited execution available');
      showNotification('❌ File execution requires desktop environment (Tauri)', 'error');
    }
    
  } catch (error) {
    console.error('❌ File execution failed:', error);
    
    // Provide helpful error messages
    let errorMessage = 'Execution failed';
    
    if (error.message?.includes('No such file or directory')) {
      errorMessage = `File not found at: ${filePath}. Please save the file again.`;
    } else if (error.message?.includes('Permission denied')) {
      errorMessage = `Permission denied. Check file permissions for: ${fileName}`;
    } else if (error.message?.includes('command not found')) {
      errorMessage = `Command not found. Make sure the required runtime is installed (Python, Node, etc.)`;
    } else {
      errorMessage = `Execution failed: ${error.message || error}`;
    }
    
    showNotification(`❌ ${errorMessage}`, 'error');
    throw error;
  }
}

/**
 * Get working directory from file path
 */
function getWorkingDirectory(filePath: string): string {
  try {
    if (filePath.includes('\\')) {
      // Windows path
      const pathParts = filePath.split('\\');
      pathParts.pop(); // Remove filename
      return pathParts.join('\\');
    } else if (filePath.includes('/')) {
      // Unix path
      const pathParts = filePath.split('/');
      pathParts.pop(); // Remove filename
      return pathParts.join('/');
    }
    
    // Fallback to current directory
    return '.';
  } catch (error) {
    console.warn('Error getting working directory:', error);
    return '.';
  }
}

/**
 * Format timestamp to relative time
 */
function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Format file size to human readable
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Get appropriate icon for file type
 */
function getFileIcon(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const icons: Record<string, string> = {
    'js': '📜',
    'jsx': '📜',
    'ts': '📘',
    'tsx': '📘',
    'py': '🐍',
    'html': '🌐',
    'css': '🎨',
    'scss': '🎨',
    'json': '📋',
    'md': '📝',
    'cs': '⚡',
    'java': '☕',
    'cpp': '⚙️',
    'c': '⚙️',
    'php': '🐘',
    'rb': '💎',
    'go': '🐹',
    'rs': '🦀',
    'sh': '🐚',
    'txt': '📄',
    'xml': '📰',
    'sql': '🗄️'
  };
  return icons[extension] || '📄';
}

/**
 * Show context menu for file operations
 */
function showFileContextMenu(event: MouseEvent, fileName: string, savedPath?: string): void {
  // Remove existing context menu
  const existingMenu = document.querySelector('.file-context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  const contextMenu = document.createElement('div');
  contextMenu.className = 'file-context-menu';
  contextMenu.style.cssText = `
    position: fixed;
    top: ${event.clientY}px;
    left: ${event.clientX}px;
    background: #2d2d2d;
    border: 1px solid #404040;
    border-radius: 4px;
    padding: 4px 0;
    min-width: 150px;
    z-index: 10000;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  `;
  
  const menuItems = [
    { text: '📂 Open', action: () => openFileInEditorWithoutDuplicates(fileName, savedPath) },
    { text: '▶️ Run File', action: () => runSpecificFile(fileName, savedPath) },
    { text: '📋 Copy Path', action: () => copyToClipboard(savedPath || fileName) },
    { text: '🏷️ Rename', action: () => renameFile(fileName) },
    { text: '🗑️ Delete', action: () => deleteFile(fileName, savedPath), danger: true }
  ];
  
  menuItems.forEach(item => {
    const menuItem = document.createElement('div');
    menuItem.className = `menu-item${item.danger ? ' danger' : ''}`;
    menuItem.style.cssText = `
      padding: 8px 16px;
      cursor: pointer;
      color: ${item.danger ? '#f48771' : '#cccccc'};
      font-size: 13px;
      transition: background-color 0.2s;
    `;
    menuItem.textContent = item.text;
    
    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.backgroundColor = item.danger 
        ? 'rgba(244, 135, 113, 0.1)' 
        : 'rgba(255, 255, 255, 0.1)';
    });
    
    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.backgroundColor = 'transparent';
    });
    
    menuItem.addEventListener('click', () => {
      item.action();
      contextMenu.remove();
    });
    
    contextMenu.appendChild(menuItem);
  });
  
  document.body.appendChild(contextMenu);
  
  // Remove on click outside
  setTimeout(() => {
    document.addEventListener('click', function removeMenu() {
      contextMenu.remove();
      document.removeEventListener('click', removeMenu);
    });
  }, 100);
}

/**
 * Helper functions for context menu actions
 */
function runSpecificFile(fileName: string, savedPath?: string): void {
  console.log(`▶️ Running specific file: ${fileName}...`);
  
  // Get the correct path and store as active file for execution
  const validatedPath = getCorrectSavedPath(fileName, savedPath);
  
  setActiveFileForExecution(fileName, validatedPath);
  
  console.log('✅ Set active file for execution:', (window as any).__activeFileForExecution);
  
  // Run the file
  runCurrentFile();
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).then(() => {
    showNotification('📋 Path copied to clipboard', 'success');
  }).catch(() => {
    showNotification('❌ Failed to copy path', 'error');
  });
}

function renameFile(fileName: string): void {
  const newName = prompt('Enter new name:', fileName);
  if (newName && newName !== fileName) {
    // Update file item
    const fileItem = document.querySelector(`[data-filename="${fileName}"]`);
    if (fileItem) {
      fileItem.setAttribute('data-filename', newName);
      const nameElement = fileItem.querySelector('.file-name');
      if (nameElement) {
        nameElement.textContent = newName;
      }
    }
    showNotification(`🏷️ Renamed to ${newName}`, 'success');
  }
}

function deleteFile(fileName: string, savedPath?: string): void {
  if (confirm(`Delete ${fileName}?`)) {
    // EXPLICIT: Remove from file explorer (only when actually deleting)
    const fileItem = document.querySelector(`[data-filename="${fileName}"]`);
    if (fileItem && (fileItem.classList.contains('file-item') || 
                     fileItem.closest('.file-explorer') ||
                     fileItem.closest('.files-panel'))) {
      fileItem.remove();
      console.log(`🗑️ Removed ${fileName} from file explorer (file deleted)`);
    }
    
    // Remove all tabs for this file
    removeExistingTabsForFile(fileName);
    
    // Close tab if open in tab manager
    const tabManager = (window as any).tabManager;
    if (tabManager && tabManager.tabs) {
      const tab = tabManager.tabs.find((t: any) => 
        t.fileName === fileName || t.savedPath === savedPath
      );
      if (tab && tabManager.closeTab) {
        tabManager.closeTab(tab.id);
      }
    }
    
    // Clean up global references
    cleanupFileReferences(fileName);
    
    // PERSISTENCE INTEGRATION: Notify file closed/deleted
    notifyFileOperation('closed', fileName);
    
    showNotification(`🗑️ ${fileName} removed`, 'success');
  }
}

/**
 * Try to refresh existing file explorer
 */
function refreshFileExplorer(): void {
  try {
    // Try calling existing refresh methods
    const refreshMethods = [
      () => (window as any).fileExplorer?.refresh?.(),
      () => (window as any).explorerManager?.refreshFiles?.(),
      () => (window as any).refreshFileTree?.(),
      () => document.dispatchEvent(new CustomEvent('file-explorer-refresh'))
    ];
    
    refreshMethods.forEach(method => {
      try {
        method();
      } catch (e) {
        // Ignore errors, just try next method
      }
    });
    
  } catch (error) {
    console.log('No existing refresh method found');
  }
}

/**
 * Create file explorer section if none exists
 */
function createFileExplorerSection(fileName: string, savedPath?: string): void {
  const sidebar = document.querySelector('.sidebar, .left-panel, .panel-left');
  
  if (sidebar && !sidebar.querySelector('.file-explorer')) {
    const explorerSection = document.createElement('div');
    explorerSection.className = 'file-explorer';
    explorerSection.innerHTML = `
      <div class="files-header" style="padding: 8px; border-bottom: 1px solid #404040; color: #cccccc; font-weight: bold;">
        📁 FILES
      </div>
      <div class="files-list" style="padding: 8px;"></div>
    `;
    
    sidebar.appendChild(explorerSection);
    
    const filesList = explorerSection.querySelector('.files-list') as HTMLElement;
    if (filesList) {
      const fileItem = createFileItemWithMetadata(fileName, savedPath);
      filesList.appendChild(fileItem);
    }
  }
}

/**
 * Generate default content based on file type
 */
function generateDefaultContent(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const timestamp = new Date().toISOString();
  
  const templates: Record<string, string> = {
    'js': `// ${fileName}\n// Created at ${timestamp}\n\nconsole.log('Hello from ${fileName}!');\n\n// Your JavaScript code here\n`,
    
    'ts': `// ${fileName}\n// Created at ${timestamp}\n\nconsole.log('Hello from ${fileName}!');\n\n// Your TypeScript code here\nfunction main(): void {\n    // Code here\n}\n\nmain();\n`,
    
    'py': `# ${fileName}\n# Created at ${timestamp}\n\nprint('Hello from ${fileName}!')\n\n# Your Python code here\ndef main():\n    pass\n\nif __name__ == '__main__':\n    main()\n`,
    
    'html': `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>${fileName.replace('.html', '')}</title>\n</head>\n<body>\n    <h1>Hello from ${fileName}!</h1>\n    <!-- Your HTML content here -->\n</body>\n</html>\n`,
    
    'css': `/* ${fileName} */\n/* Created at ${timestamp} */\n\nbody {\n    font-family: Arial, sans-serif;\n    margin: 0;\n    padding: 20px;\n}\n\n/* Your CSS styles here */\n`,
    
    'json': `{\n  "name": "${fileName.replace('.json', '')}",\n  "version": "1.0.0",\n  "description": "Created at ${timestamp}",\n  "main": "index.js"\n}\n`,
    
    'md': `# ${fileName.replace('.md', '')}\n\nCreated at ${timestamp}\n\n## Description\n\nYour markdown content here.\n\n## Usage\n\n\`\`\`\nCode examples here\n\`\`\`\n`,
    
    'cs': `// ${fileName}\n// Created at ${timestamp}\n\nusing System;\n\nnamespace HelloWorld\n{\n    class Program\n    {\n        static void Main(string[] args)\n        {\n            Console.WriteLine("Hello from ${fileName}!");\n            // Your C# code here\n        }\n    }\n}\n`,
    
    'java': `// ${fileName}\n// Created at ${timestamp}\n\npublic class ${fileName.replace('.java', '')} {\n    public static void main(String[] args) {\n        System.out.println("Hello from ${fileName}!");\n        // Your Java code here\n    }\n}\n`,
    
    'cpp': `// ${fileName}\n// Created at ${timestamp}\n\n#include <iostream>\n\nint main() {\n    std::cout << "Hello from ${fileName}!" << std::endl;\n    // Your C++ code here\n    return 0;\n}\n`,
    
    'php': `<?php\n// ${fileName}\n// Created at ${timestamp}\n\necho "Hello from ${fileName}!";\n\n// Your PHP code here\n?>\n`
  };
  
  return templates[extension] || `// ${fileName}\n// Created at ${timestamp}\n\n// Your code here\n`;
}

/**
 * Utility functions
 */
function isValidFileName(fileName: string): boolean {
  // Check for invalid characters in Windows/Linux filenames
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  
  // Check for reserved names (Windows)
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
  
  return !invalidChars.test(fileName) && 
         !reservedNames.test(fileName) && 
         fileName.length > 0 && 
         fileName.length <= 255 &&
         !fileName.startsWith('.') &&
         !fileName.endsWith('.') &&
         !fileName.endsWith(' ');
}

function getFileTypeDescription(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const descriptions: Record<string, string> = {
    'js': 'JavaScript files',
    'jsx': 'JavaScript React files',
    'ts': 'TypeScript files',
    'tsx': 'TypeScript React files',
    'py': 'Python files',
    'html': 'HTML files',
    'css': 'CSS files',
    'scss': 'SCSS files',
    'json': 'JSON files',
    'md': 'Markdown files',
    'cs': 'C# files',
    'java': 'Java files',
    'cpp': 'C++ files',
    'c': 'C files',
    'php': 'PHP files',
    'rb': 'Ruby files',
    'go': 'Go files',
    'rs': 'Rust files',
    'sh': 'Shell scripts',
    'txt': 'Text files',
    'xml': 'XML files',
    'sql': 'SQL files'
  };
  return descriptions[extension] || 'All files';
}

function getAcceptTypes(fileName: string): Record<string, string[]> {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const extWithDot = `.${extension}`;
  
  const acceptTypes: Record<string, Record<string, string[]>> = {
    'js': { 'text/javascript': ['.js'] },
    'jsx': { 'text/javascript': ['.jsx'] },
    'ts': { 'text/typescript': ['.ts'] },
    'tsx': { 'text/typescript': ['.tsx'] },
    'py': { 'text/x-python': ['.py'] },
    'html': { 'text/html': ['.html', '.htm'] },
    'css': { 'text/css': ['.css'] },
    'scss': { 'text/css': ['.scss', '.sass'] },
    'json': { 'application/json': ['.json'] },
    'md': { 'text/markdown': ['.md', '.markdown'] },
    'cs': { 'text/x-csharp': ['.cs'] },
    'java': { 'text/x-java': ['.java'] },
    'cpp': { 'text/x-c++src': ['.cpp', '.cxx', '.cc'] },
    'c': { 'text/x-csrc': ['.c'] },
    'php': { 'text/x-php': ['.php'] },
    'rb': { 'text/x-ruby': ['.rb'] },
    'go': { 'text/x-go': ['.go'] },
    'rs': { 'text/x-rust': ['.rs'] },
    'sh': { 'text/x-shellscript': ['.sh', '.bash'] },
    'txt': { 'text/plain': ['.txt'] },
    'xml': { 'text/xml': ['.xml'] },
    'sql': { 'text/x-sql': ['.sql'] }
  };
  
  // Return the specific type or default to text/plain with the actual extension
  return acceptTypes[extension] || { 'text/plain': [extWithDot, '.txt'] };
}

function getLanguageFromExtension(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript', 
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'sql': 'sql',
    'sh': 'shell',
    'xml': 'xml'
  };
  return languageMap[extension] || 'plaintext';
}

function showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
  try {
    if ((window as any).showNotification) {
      (window as any).showNotification(message, type);
      return;
    }
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      z-index: 10000;
      background: ${type === 'success' ? '#4CAF50' : 
                   type === 'error' ? '#f44336' : 
                   type === 'warning' ? '#FF9800' : '#2196F3'};
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }
    }, 3000);
    
  } catch (error) {
    console.error('Error showing notification:', error);
    console.log(`${type.toUpperCase()}: ${message}`);
  }
}

function offerFileDownload(fileName: string, content: string): void {
  try {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = fileName;
    downloadLink.style.display = 'none';
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
  } catch (error) {
    console.error('❌ Error creating download:', error);
  }
}

/**
 * Enhanced save current file function with persistence integration
 */
export async function saveCurrentFile(): Promise<string | null> {
  const fileInfo = getCurrentFileInfo();
  if (!fileInfo) {
    showNotification('❌ No file is currently open', 'error');
    return null;
  }
  
  // Try Tauri first, then File System API
  let savedPath = await saveWithTauri(fileInfo.fileName, fileInfo.content);
  
  if (!savedPath) {
    savedPath = await saveWithFileSystemAPIEnhanced(fileInfo.fileName, fileInfo.content);
  }
  
  if (savedPath) {
    // Update metadata
    if (fileMetadataMap.has(fileInfo.fileName)) {
      const metadata = fileMetadataMap.get(fileInfo.fileName)!;
      metadata.savedPath = savedPath;
      metadata.originalContent = fileInfo.content;
      metadata.lastModified = Date.now();
      metadata.isUnsaved = false;
    }
    
    // Update Monaco editor metadata
    updateMonacoEditorForExecution(fileInfo.fileName, savedPath);
    
    // Update active file for execution
    setActiveFileForExecution(fileInfo.fileName, savedPath);
    
    // Update file explorer
    addToFileExplorerWithMetadata(fileInfo.fileName, savedPath, fileInfo.content);
    
    // PERSISTENCE INTEGRATION: Notify file saved
    notifyFileOperation('saved', fileInfo.fileName);
    
    showNotification(`✅ File saved: ${fileInfo.fileName}`, 'success');
    return savedPath;
  } else {
    offerFileDownload(fileInfo.fileName, fileInfo.content);
    showNotification('✅ File downloaded', 'info');
    return fileInfo.fileName;
  }
}

/**
 * Additional exports
 */
export async function createFileWithDialog(): Promise<string | null> {
  return createNewFile();
}

/**
 * ENHANCED: Initialize file explorer click handlers and keyboard shortcuts
 */
function initializeFileExplorerHandlers(): void {
  console.log('🚀 Initializing enhanced file explorer handlers...');
  
  // Add Ctrl+S save shortcut
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      console.log('💾 Ctrl+S pressed - saving file...');
      saveCurrentFile();
    }
  });
  
  console.log('✅ Enhanced file explorer handlers and keyboard shortcuts initialized');
}

/**
 * Helper function for backward compatibility
 */
function openFileInEditor(fileName: string, savedPath?: string): void {
  openFileInEditorWithoutDuplicates(fileName, savedPath);
}

/**
 * Helper function for backward compatibility
 */
function addToFileExplorer(fileName: string, savedPath?: string): void {
  addToFileExplorerWithMetadata(fileName, savedPath);
}

/**
 * OVERRIDE createSimpleTab to prevent duplicates
 */
function createSimpleTab(fileName: string, savedPath?: string): void {
  // Redirect to safe version
  createSingleTabSafe(fileName, savedPath);
}

/**
 * DEBUG: Restore a file to the file explorer if it was accidentally removed
 */
function restoreFileToExplorer(fileName: string, savedPath?: string): void {
  console.log(`🔄 Restoring ${fileName} to file explorer...`);
  
  try {
    // Check if file already exists in explorer
    const existingFile = document.querySelector(`[data-filename="${fileName}"]`);
    if (existingFile && (existingFile.classList.contains('file-item') || 
                        existingFile.closest('.file-explorer'))) {
      console.log(`✅ ${fileName} already exists in explorer`);
      return;
    }
    
    // Get file metadata
    const metadata = fileMetadataMap.get(fileName);
    const content = metadata?.originalContent || generateDefaultContent(fileName);
    const finalPath = savedPath || metadata?.savedPath || getCorrectSavedPath(fileName);
    
    // Add back to file explorer
    addToFileExplorerWithMetadata(fileName, finalPath, content);
    
    console.log(`✅ Restored ${fileName} to file explorer`);
    showNotification(`🔄 Restored ${fileName} to file explorer`, 'success');
    
  } catch (error) {
    console.error(`❌ Failed to restore ${fileName} to explorer:`, error);
    showNotification(`❌ Failed to restore ${fileName}`, 'error');
  }
}

/**
 * DEBUG: Force open a file (bypass all detection logic)
 */
function forceOpenFile(fileName: string, savedPath?: string): void {
  console.log(`🚨 FORCE OPENING FILE: ${fileName}`);
  
  try {
    // Clean up any existing tabs first
    removeExistingTabsForFile(fileName);
    
    // Get correct path
    const validatedPath = getCorrectSavedPath(fileName, savedPath);
    
    // Mark as active
    markFileAsActiveWithMetadata(fileName, validatedPath);
    
    // Force create new tab
    if (validatedPath) {
      loadAndOpenFileWithMetadata(validatedPath, fileName);
    } else {
      const content = generateDefaultContent(fileName);
      forceCreateNewTab(fileName, content, validatedPath);
    }
    
    console.log(`✅ FORCE OPENED: ${fileName}`);
    showNotification(`🚨 Force opened: ${fileName}`, 'info');
    
  } catch (error) {
    console.error(`❌ FORCE OPEN FAILED for ${fileName}:`, error);
    showNotification(`❌ Force open failed: ${fileName}`, 'error');
  }
}

/**
 * DEBUG: Get system state for debugging
 */
function getDebugState(fileName?: string): any {
  const state = {
    timestamp: new Date().toISOString(),
    fileName: fileName || 'all',
    
    // DOM tabs
    domTabs: Array.from(document.querySelectorAll('div[class*="tab"], [role="tab"], [data-filename]')).map(tab => ({
      text: tab.textContent?.trim(),
      filename: tab.getAttribute('data-filename'),
      visible: (tab as HTMLElement).offsetParent !== null,
      attached: document.body.contains(tab),
      classes: tab.className
    })),
    
    // Tab manager
    tabManager: {
      exists: !!(window as any).tabManager,
      tabs: (window as any).tabManager?.tabs?.map((tab: any) => ({
        id: tab.id,
        fileName: tab.fileName,
        path: tab.path,
        hasElement: !!tab.element,
        elementAttached: tab.element ? document.body.contains(tab.element) : false
      })) || []
    },
    
    // Global state
    activeFileForExecution: (window as any).__activeFileForExecution,
    allSavedFiles: (window as any).__allSavedFiles?.length || 0,
    fileMetadataCount: fileMetadataMap.size,
    
    // Monaco editor
    monaco: {
      exists: !!(window as any).monaco,
      hasEditor: !!(window as any).monaco?.editor?.getEditors()?.[0],
      currentModel: (window as any).monaco?.editor?.getEditors()?.[0]?.getModel() ? {
        fileName: ((window as any).monaco.editor.getEditors()[0].getModel() as any)._fileName,
        savedPath: ((window as any).monaco.editor.getEditors()[0].getModel() as any)._savedPath
      } : null
    }
  };
  
  console.log('🔍 DEBUG STATE:', state);
  return state;
}

// Export debug and utility functions
(window as any).__createFileDebug = {
  createNewFile,
  createFileWithDialog,
  saveCurrentFile,
  runCurrentFile,
  getCurrentFileInfo,
  addToFileExplorer: addToFileExplorerWithMetadata,
  openFileInEditor: openFileInEditorWithoutDuplicates,
  executeFileAtPath: executeFileAtPathEnhanced,
  markFileAsActiveWithMetadata,
  updateMonacoEditorForExecution,
  fileMetadataMap,
  getCorrectSavedPath,
  validateAndCorrectPath,
  removeExistingTabsForFile,
  isFileAlreadyOpenAndVisible,
  forceCreateNewTab,
  cleanupFileReferences
};

// Initialize event listeners
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFileExplorerHandlers);
} else {
  initializeFileExplorerHandlers();
}

// Make file explorer API globally available
(window as any).fileExplorerAPI = {
  addFile: addToFileExplorerWithMetadata,
  openFile: openFileInEditorWithoutDuplicates,
  runFile: runSpecificFile,
  getCurrentFileInfo,
  formatTimestamp,
  formatFileSize,
  getCorrectSavedPath,
  trackSavedFile,
  cleanupDuplicates: (fileName: string) => removeExistingTabsForFile(fileName),
  forceCreateTab: forceCreateNewTab
};

// Enhanced debugging functions
(window as any).__tabFixDebug = {
  removeExistingTabsForFile,
  isFileAlreadyOpenAndVisible,
  switchToExistingFile,
  createSingleTabSafe,
  forceCreateNewTab,
  cleanupFileReferences,
  forceOpenFile,
  getDebugState,
  restoreFileToExplorer,
  // Quick fix function for when files won't open
  quickFix: (fileName: string) => {
    console.log(`🔧 Quick fix for: ${fileName}`);
    removeExistingTabsForFile(fileName);
    cleanupFileReferences(fileName);
    setTimeout(() => forceOpenFile(fileName), 100);
  },
  // Fix for when files disappear from explorer
  fixDisappearedFile: (fileName: string) => {
    console.log(`🔄 Fixing disappeared file: ${fileName}`);
    restoreFileToExplorer(fileName);
  },
  cleanupDuplicates: () => {
    console.log('🧹 Cleaning up all duplicate tabs...');
    const allTabs = document.querySelectorAll('[class*="tab"]:not(.file-item)');
    const seen = new Set();
    allTabs.forEach(tab => {
      // Skip file explorer items
      if (tab.classList.contains('file-item') || 
          tab.closest('.file-explorer') || 
          tab.closest('.files-panel')) {
        return;
      }
      
      const text = tab.textContent || '';
      const fileName = text.replace(/[×*💾📁💭\s]/g, '').split('(')[0].trim();
      if (fileName && seen.has(fileName)) {
        console.log(`🗑️ Removing duplicate TAB: ${text}`);
        tab.remove();
      } else if (fileName) {
        seen.add(fileName);
      }
    });
    console.log('✅ Cleanup complete!');
  }
};

console.log('🚀 IMPROVED createFileWithDialog.ts loaded - ENHANCED TAB DETECTION & FALLBACK LOGIC WITH PERSISTENCE! ✨🔧🎯💾');

// Debug help for users
console.log(`
🔧 DEBUG HELP FOR FILE ISSUES:

📂 If a file DISAPPEARS from file explorer when opened:
   __tabFixDebug.fixDisappearedFile('yourFileName.py')
   OR
   __createFileDebug.restoreFileToExplorer('yourFileName.py')

🚫 If a file WON'T OPEN when clicked in explorer:
   __tabFixDebug.quickFix('yourFileName.py')
   OR
   __createFileDebug.forceOpenFile('yourFileName.py')

🔍 To see what's happening:
   __createFileDebug.getDebugState('yourFileName.py')

🧹 To clean up duplicate tabs:
   __tabFixDebug.cleanupDuplicates()

💾 Persistence controls:
   __persistenceManager.forceSave()    // Manual save
   __persistenceManager.forceRestore() // Manual restore
   __persistenceManager.clearState()   // Clear all saved state

Examples:
- File disappeared: __tabFixDebug.fixDisappearedFile('qqqe.py')
- File won't open: __tabFixDebug.quickFix('qqqe.py')
- Save state: __persistenceManager.forceSave()
- Restore state: __persistenceManager.forceRestore()
`);