// src/autoSaveConfirmation.ts
// Automatically detects file saves and triggers green confirmation
// Works with your existing save handlers without modifying them!

console.log('🎯 Auto Save Confirmation - Initializing...');

/**
 * Automatically triggers green confirmation when files are saved
 * This monitors your existing save operations and adds visual feedback
 */
export function initializeAutoSaveConfirmation() {
  // Check if tracker is available
  const tracker = (window as any).__modifiedFilesTracker;
  
  if (!tracker) {
    console.error('❌ Modified files tracker not found!');
    console.log('   Make sure fileTreeRenderer.ts is loaded first');
    return;
  }
  
  if (!tracker.markAsSaved) {
    console.error('❌ markAsSaved method not found!');
    console.log('   Make sure you are using the updated fileTreeRenderer.ts');
    return;
  }
  
  console.log('✅ Modified files tracker found');
  console.log('✅ markAsSaved method available');
  
  // Method 1: Intercept console.log to detect saves
  const originalLog = console.log;
  console.log = function(...args: any[]) {
    // Call original first
    originalLog.apply(console, args);
    
    // Check if this is a save success message
    const message = args[0];
    if (typeof message === 'string' && message.includes('✅ File saved successfully:')) {
      const filePath = args[1];
      if (filePath && typeof filePath === 'string') {
        console.log('🟢 Auto-triggering green confirmation:', filePath);
        tracker.removeModified(filePath);
      }
    }
  };
  
  // Method 2: Create a global save hook
  (window as any).__triggerSaveConfirmation = function(filePath: string) {
    console.log('🟢 Triggering save confirmation:', filePath);
    if (tracker && tracker.removeModified) {
      tracker.removeModified(filePath);
    }
  };
  
  // Method 3: Listen for custom save events
  window.addEventListener('fileSaved', (event: any) => {
    const filePath = event.detail?.filePath;
    if (filePath) {
      console.log('🟢 File saved event detected:', filePath);
      tracker.removeModified(filePath);
    }
  });
  
  // Method 4: Patch the saveFile function if it exists
  setTimeout(() => {
    const fileOps = (window as any).fileOperations;
    if (fileOps && fileOps.saveFile) {
      const originalSave = fileOps.saveFile;
      fileOps.saveFile = async function(...args: any[]) {
        const result = await originalSave.apply(this, args);
        
        // Try to extract file path from arguments
        const filePath = args[0] || args[1];
        if (filePath && typeof filePath === 'string') {
          console.log('🟢 Patched save detected:', filePath);
          tracker.removeModified(filePath);
        }
        
        return result;
      };
      console.log('✅ Patched saveFile function');
    }
  }, 1000);
  
  console.log('✅ Auto Save Confirmation active');
  console.log('   Method 1: Console log interception ✅');
  console.log('   Method 2: Global save hook ✅');
  console.log('   Method 3: Custom event listener ✅');
  console.log('   Method 4: Function patching ✅');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeAutoSaveConfirmation, 500);
  });
} else {
  setTimeout(initializeAutoSaveConfirmation, 500);
}

export default initializeAutoSaveConfirmation;