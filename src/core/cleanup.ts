import { cleanupManager } from '../cleanup';

// ============================================================
// cleanup.ts  |  Operator X02
// Extracted from main.ts by refactor_main.ps1
// cleanupDuplicates / cleanupAll
// ============================================================

export function cleanupDuplicates(): void {
  console.log('?? Cleaning up duplicate elements...');
  
  // Remove duplicate terminals (keep only first)
  const terminals = document.querySelectorAll('.terminal-header');
  if (terminals.length > 1) {
    console.log(`Found ${terminals.length} terminals, keeping first one`);
    for (let i = 1; i < terminals.length; i++) {
      const parent = terminals[i].closest('.tab-content');
      if (parent) parent.remove();
    }
  }
  
  // Remove duplicate explorer tabs (keep only first active)
  const explorers = document.querySelectorAll('.explorer-tab.active');
  if (explorers.length > 1) {
    console.log(`Found ${explorers.length} active explorer tabs, keeping first one`);
    for (let i = 1; i < explorers.length; i++) {
      explorers[i].classList.remove('active');
    }
  }
  
  // Remove duplicate modals (they'll be recreated)
  const modals = document.querySelectorAll('.modal');
  if (modals.length > 1) {
    console.log(`Found ${modals.length} modals, removing duplicates`);
    for (let i = 1; i < modals.length; i++) {
      modals[i].remove();
    }
  }
  
  // Remove duplicate menus
  const menus = document.querySelectorAll('.menu-submenu');
  if (menus.length > 1) {
    console.log(`Found ${menus.length} submenus, keeping first one`);
    for (let i = 1; i < menus.length; i++) {
      menus[i].remove();
    }
  }
  
  console.log('? Duplicate cleanup complete');
}


export function cleanupAll(): void {
  if (window.monaco?.editor) {
    window.monaco.editor.getEditors().forEach(editor => {
      editor.dispose();
    });
  }

  if (window.tabManager) {
    window.tabManager.cleanup?.();
  }

  if (window.fileSystem) {
    window.fileSystem.integratedFolderManager?.cleanup?.();
    window.fileSystem.contextMenuManager?.cleanup?.();
  }

  if (window.explorerFilter?.cleanup) {
    window.explorerFilter.cleanup();
  }

  if (window.folderToggle?.cleanup) {
    window.folderToggle.cleanup();
  }

  if (window.breadcrumbManager?.cleanup) {
    window.breadcrumbManager.cleanup();
  }

  // Clean up Backup Manager (intervals, timers, panel)
  if ((window as any).destroyBackupManager) {
    (window as any).destroyBackupManager();
  }

  cleanupManager.cleanup();
  cleanupManager.clearAllTimers();

  // isInitialized reset handled by main.ts after cleanupAll()
  // initializationInProgress reset handled by main.ts after cleanupAll()
}




