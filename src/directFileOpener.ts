// src/directFileOpener.ts - DISABLED
// This file was causing mock content to override real file content.
// All file opening is now handled by tabManager.ts via openFileInTab()

/**
 * Direct file opener - DISABLED
 * Previously this generated mock content which overwrote real file content.
 * Now it does nothing - file opening is handled by tabManager.openFileInTab()
 */
export function initializeDirectFileOpener(): void {
  console.log('⚠️ directFileOpener.ts is DISABLED - file opening handled by tabManager');
  // Do nothing - let tabManager handle file opening
}

// No-op exports for compatibility
export function setupDirectFileOpener(): void {}
export function setupFileClickHandlers(): void {}
export function setupDirectoryClickHandlers(): void {}

declare global {
  interface Window {
    monaco: any;
  }
}

// Log that this module is disabled
console.log('✅ directFileOpener.ts loaded (DISABLED - no mock content)');
