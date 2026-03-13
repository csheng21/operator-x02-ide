// autoModeVerifierIntegration.ts - Connect File Verifier to Auto Mode System
// ============================================================================
//
// This file patches the existing multiFileAutonomous.ts to use file verification
// before applying any code changes.
//
// IMPORT THIS FILE AFTER multiFileAutonomous.ts in main.ts
//
// ============================================================================

import {
  processWithVerification,
  processMultiFileApplyWithVerification,
  scanProjectFiles,
  verifyFileName,
  invalidateFileCache
} from './autoModeFileVerifier';

console.log('🔗 [AutoMode Integration] Patching file verification into Auto Mode...');

// ============================================================================
// PATCH: Override processSession to use verification
// ============================================================================

/**
 * Wait for multiFileAutonomous to load, then patch it
 */
function patchAutoModeSystem(): void {
  // Check if we can patch
  const existingProcessSession = (window as any).processMultiFileSession;
  
  if (!existingProcessSession) {
    console.log('⏳ [Integration] Waiting for multiFileAutonomous to load...');
    setTimeout(patchAutoModeSystem, 500);
    return;
  }
  
  console.log('🔧 [Integration] Patching Auto Mode with file verification...');
  
  // Store original function
  const originalProcessSession = existingProcessSession;
  
  // Create enhanced version
  (window as any).processMultiFileSession = async function() {
    const session = (window as any).getCurrentMultiFileSession?.();
    
    if (!session || !session.tasks || session.tasks.length === 0) {
      console.log('⏭️ [Integration] No session or tasks');
      return originalProcessSession();
    }
    
    console.log('🔍 [Integration] Using VERIFIED Auto Mode');
    
    // Pre-scan project files
    await scanProjectFiles();
    
    // Convert session tasks to verified format
    const tasks = session.tasks
      .filter((t: any) => t.code && t.code.trim().length > 0)
      .map((t: any) => ({
        fileName: t.fileName,
        code: t.code
      }));
    
    if (tasks.length === 0) {
      console.log('⏭️ [Integration] No tasks with code');
      return;
    }
    
    // Use verified processing
    const result = await processMultiFileApplyWithVerification(tasks);
    
    // Update session status
    if (result.success > 0) {
      session.status = 'awaiting-confirmation';
      
      // Show confirmation dialog
      if (typeof (window as any).showMultiFileConfirmation === 'function') {
        (window as any).showMultiFileConfirmation(session);
      }
    } else {
      session.status = 'complete';
    }
    
    return result;
  };
  
  console.log('✅ [Integration] Auto Mode patched with file verification');
}

// ============================================================================
// PATCH: Enhanced file detection from code blocks
// ============================================================================

/**
 * Enhanced extractTargetFileName that verifies against project files
 */
async function extractAndVerifyFileName(
  block: HTMLElement, 
  code: string
): Promise<{ fileName: string | null; verified: boolean; actualPath?: string }> {
  
  // First, use existing extraction logic
  let detectedName: string | null = null;
  
  // Check data attributes
  detectedName = block.getAttribute('data-file') || 
                 block.getAttribute('data-filename') ||
                 block.getAttribute('data-target-file');
  
  if (!detectedName) {
    // Check header
    const header = block.querySelector('.muf-header, .cbe-header, [class*="header"]');
    if (header) {
      const headerText = header.textContent || '';
      // Extract filename from header like "TYPESCRIPT App.tsx"
      const match = headerText.match(/([a-zA-Z][a-zA-Z0-9_.-]*\.[a-zA-Z]{1,8})/i);
      if (match) {
        detectedName = match[1];
      }
    }
  }
  
  if (!detectedName) {
    // Check nearby headings
    let sibling: Element | null = block.previousElementSibling;
    for (let i = 0; i < 3 && sibling; i++) {
      const text = sibling.textContent || '';
      // Match patterns like "## Updated App.tsx" or "**App.tsx**"
      const match = text.match(/([a-zA-Z][a-zA-Z0-9_.-]*\.[a-zA-Z]{1,8})/i);
      if (match) {
        detectedName = match[1];
        break;
      }
      sibling = sibling.previousElementSibling;
    }
  }
  
  if (!detectedName) {
    // Check code content for file path comments
    const codeFirstLines = code.split('\n').slice(0, 5).join('\n');
    
    // Look for patterns like:
    // // App.tsx
    // // src/components/App.tsx
    // /* File: App.tsx */
    const patterns = [
      /\/\/\s*(?:File:?\s*)?([a-zA-Z][a-zA-Z0-9_./\\-]*\.[a-zA-Z]{1,8})/i,
      /\/\*\s*(?:File:?\s*)?([a-zA-Z][a-zA-Z0-9_./\\-]*\.[a-zA-Z]{1,8})/i,
      /#\s*(?:File:?\s*)?([a-zA-Z][a-zA-Z0-9_./\\-]*\.[a-zA-Z]{1,8})/i,
    ];
    
    for (const pattern of patterns) {
      const match = codeFirstLines.match(pattern);
      if (match) {
        // Extract just the filename from path
        detectedName = match[1].split(/[/\\]/).pop() || match[1];
        break;
      }
    }
  }
  
  if (!detectedName) {
    console.log('⚠️ [Integration] Could not detect file name from code block');
    return { fileName: null, verified: false };
  }
  
  // Now verify against project files
  console.log(`🔍 [Integration] Verifying detected name: "${detectedName}"`);
  
  const verification = await verifyFileName(detectedName);
  
  if (verification.found && verification.matchedFile) {
    return {
      fileName: verification.matchedFile.name,
      verified: true,
      actualPath: verification.matchedFile.path
    };
  }
  
  // Not verified - return detected name but flag as unverified
  return {
    fileName: detectedName,
    verified: false
  };
}

// Expose for use
(window as any).extractAndVerifyFileName = extractAndVerifyFileName;

// ============================================================================
// EVENT HOOKS
// ============================================================================

/**
 * Listen for file tree changes to invalidate cache
 */
document.addEventListener('file-created', () => {
  console.log('📁 [Integration] File created - invalidating cache');
  invalidateFileCache();
});

document.addEventListener('file-deleted', () => {
  console.log('📁 [Integration] File deleted - invalidating cache');
  invalidateFileCache();
});

document.addEventListener('folder-opened', () => {
  console.log('📁 [Integration] Folder opened - invalidating cache');
  invalidateFileCache();
});

document.addEventListener('project-loaded', () => {
  console.log('📁 [Integration] Project loaded - scanning files');
  invalidateFileCache();
  setTimeout(() => scanProjectFiles(), 500);
});

// ============================================================================
// INITIALIZE
// ============================================================================

// Start patching when DOM is ready
if (document.readyState === 'complete') {
  setTimeout(patchAutoModeSystem, 1000);
} else {
  window.addEventListener('load', () => {
    setTimeout(patchAutoModeSystem, 1000);
  });
}

// Also try to scan project files on load
setTimeout(async () => {
  try {
    const files = await scanProjectFiles();
    console.log(`📁 [Integration] Initial scan: ${files.length} project files`);
  } catch (e) {
    console.warn('Initial file scan failed:', e);
  }
}, 2000);

console.log('✅ [AutoMode Integration] Module loaded');

// ============================================================================
// EXPORTS
// ============================================================================

export {
  extractAndVerifyFileName,
  patchAutoModeSystem
};
