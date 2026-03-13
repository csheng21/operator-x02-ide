// src/fileOperations/saveHandler_enhanced.ts
// Enhanced save handler with visual feedback (orange → green → fade)

import { invoke } from '@tauri-apps/api/core';

/**
 * Save file with visual feedback in the file tree
 */
export async function saveFileWithFeedback(filePath: string, content: string): Promise<boolean> {
  console.log('💾 Saving file:', filePath);
  
  try {
    // Save the file using Tauri
    await invoke('write_file', {
      path: filePath,
      contents: content
    });
    
    console.log('✅ File saved successfully:', filePath);
    
    // ✅ CRITICAL: Notify the tree renderer that file was saved
    const tracker = (window as any).__modifiedFilesTracker;
    if (tracker && typeof tracker.removeModified === 'function') {
      // This will:
      // 1. Remove from modifiedFiles set
      // 2. Add to savedFiles set (shows green)
      // 3. Automatically fade out after 3 seconds
      tracker.removeModified(filePath);
      console.log('🟢 Visual feedback: Orange → Green → Fade');
    } else {
      console.warn('⚠️ Modified files tracker not found');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to save file:', error);
    return false;
  }
}

/**
 * Setup Ctrl+S / Cmd+S keyboard shortcut
 */
export function setupSaveShortcut() {
  document.addEventListener('keydown', async (e) => {
    // Check for Ctrl+S (Windows/Linux) or Cmd+S (Mac)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      
      console.log('⌨️ Save shortcut triggered (Ctrl/Cmd + S)');
      
      // Get current file from tab manager
      const tabManager = (window as any).tabManager;
      if (!tabManager || !tabManager.currentFile) {
        console.warn('⚠️ No file currently open');
        return;
      }
      
      const currentFile = tabManager.currentFile;
      const filePath = currentFile.path;
      
      // Get content from Monaco editor
      const editor = (window as any).monaco?.editor?.getEditors()?.[0];
      if (!editor) {
        console.error('❌ Monaco editor not found');
        return;
      }
      
      const model = editor.getModel();
      if (!model) {
        console.error('❌ Editor model not found');
        return;
      }
      
      const content = model.getValue();
      
      // Save with visual feedback
      const success = await saveFileWithFeedback(filePath, content);
      
      if (success) {
        // Update tab to remove unsaved indicator
        if (currentFile.element) {
          const unsavedIndicator = currentFile.element.querySelector('.tab-unsaved-indicator');
          if (unsavedIndicator) {
            unsavedIndicator.remove();
          }
        }
        
        // Mark model as saved
        model._versionId = model.getAlternativeVersionId();
        
        console.log('✅ File saved and UI updated');
      }
    }
  });
  
  console.log('✅ Save shortcut (Ctrl/Cmd + S) configured');
}

/**
 * Setup direct save button handler
 */
export function setupDirectSaveHandler() {
  console.log('Initializing enhanced save handler with visual feedback');
  
  // Setup keyboard shortcut
  setupSaveShortcut();
  
  // Setup save button if it exists
  const saveButton = document.getElementById('save-file-btn');
  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      console.log('💾 Save button clicked');
      
      const tabManager = (window as any).tabManager;
      if (!tabManager || !tabManager.currentFile) {
        console.warn('⚠️ No file currently open');
        alert('No file is currently open');
        return;
      }
      
      const currentFile = tabManager.currentFile;
      const filePath = currentFile.path;
      
      const editor = (window as any).monaco?.editor?.getEditors()?.[0];
      if (!editor) {
        console.error('❌ Monaco editor not found');
        return;
      }
      
      const model = editor.getModel();
      if (!model) {
        console.error('❌ Editor model not found');
        return;
      }
      
      const content = model.getValue();
      
      // Save with visual feedback
      const success = await saveFileWithFeedback(filePath, content);
      
      if (success) {
        // Update tab to remove unsaved indicator
        if (currentFile.element) {
          const unsavedIndicator = currentFile.element.querySelector('.tab-unsaved-indicator');
          if (unsavedIndicator) {
            unsavedIndicator.remove();
          }
        }
        
        // Mark model as saved
        model._versionId = model.getAlternativeVersionId();
        
        alert('File saved successfully!');
      } else {
        alert('Failed to save file');
      }
    });
    
    console.log('✅ Save button handler configured');
  }
}

/**
 * Browser fallback (for non-Tauri environments)
 */
export function browserFallbackSave(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  
  // Still trigger visual feedback
  const tracker = (window as any).__modifiedFilesTracker;
  if (tracker && typeof tracker.removeModified === 'function') {
    tracker.removeModified(filename);
  }
}

// Export for use in other modules
export { saveFileWithFeedback as saveFile };

console.log('✅ Enhanced save handler loaded');
console.log('   Features: Orange → Green → Fade transition');