// src/fileOperations.ts
import { setupDirectSaveHandler } from './fileOperations/saveHandler';
import { setupDirectOpenHandler } from './fileOperations/openHandler';
import { detectTauriAvailability } from './utils/platformDetection';

/**
 * Initialize file operation buttons
 */
export function initializeFileOperations(): void {
  console.log('Initializing file operations with direct save handler');
  detectTauriAvailability();
  setupDirectSaveHandler();
  setupDirectOpenHandler();
}

// Re-export functions from child modules
export { saveFile, browserFallbackSave } from './fileOperations/saveHandler';
export { openFile, fallbackOpen, openInEditor } from './fileOperations/openHandler';
export { removeFile, removeDirectory, removeProject } from './fileOperations/removeHandler';