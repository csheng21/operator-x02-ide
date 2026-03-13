// src/ide/fileExplorer/instantContextMenuInit.ts
// ============================================================================
// DROP-IN INTEGRATION FILE
// ============================================================================
// Just import this file in main.ts and the instant menu will work automatically
// 
// Usage in main.ts:
//   import './ide/fileExplorer/instantContextMenuInit';
//
// That's it! No other changes needed.
// ============================================================================

import { initInstantContextMenu } from './instantContextMenu';

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initInstantContextMenu();
  });
} else {
  // DOM already ready
  initInstantContextMenu();
}

// Disable old context menu by preventing its initialization
const originalSetupContextMenu = (window as any).__originalSetupContextMenu;
if (!originalSetupContextMenu) {
  // Intercept the old setupContextMenu if it gets imported later
  Object.defineProperty(window, '__contextMenuDisabled', {
    value: true,
    writable: false
  });
}

console.log('⚡ Instant Context Menu auto-initialized');
