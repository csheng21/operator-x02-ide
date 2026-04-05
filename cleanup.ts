// ============================================================
// core/cleanup.ts
// IDE cleanup utilities - HMR duplicate removal, full teardown
// Extracted from main.ts | Operator X02
// ============================================================

import { cleanupManager } from '../cleanup';

// ── State (mirrors main.ts globals) ─────────────────────────
// These are written by the init sequence in main.ts
export let isInitialized           = false;
export let initializationInProgress = false;

export function setInitialized(val: boolean)              { isInitialized = val; }
export function setInitializationInProgress(val: boolean) { initializationInProgress = val; }

// ── cleanupDuplicates ────────────────────────────────────────
/**
 * Remove duplicate DOM elements created during hot reload.
 * Keeps the first instance of terminals, explorer tabs, modals, menus.
 */
export function cleanupDuplicates(): void {
  console.log('[Cleanup] Cleaning up duplicate elements...');

  // Keep only first terminal
  const terminals = document.querySelectorAll('.terminal-header');
  if (terminals.length > 1) {
    console.log(`[Cleanup] Found ${terminals.length} terminals, keeping first`);
    for (let i = 1; i < terminals.length; i++) {
      terminals[i].closest('.tab-content')?.remove();
    }
  }

  // Keep only first active explorer tab
  const explorers = document.querySelectorAll('.explorer-tab.active');
  if (explorers.length > 1) {
    for (let i = 1; i < explorers.length; i++) {
      explorers[i].classList.remove('active');
    }
  }

  // Remove duplicate modals
  const modals = document.querySelectorAll('.modal');
  if (modals.length > 1) {
    for (let i = 1; i < modals.length; i++) modals[i].remove();
  }

  // Remove duplicate submenus
  const menus = document.querySelectorAll('.menu-submenu');
  if (menus.length > 1) {
    for (let i = 1; i < menus.length; i++) menus[i].remove();
  }

  console.log('[Cleanup] Duplicate cleanup complete');
}

// ── cleanupAll ───────────────────────────────────────────────
/**
 * Full cleanup on page unload or refresh.
 * Disposes Monaco editors, clears all managers.
 */
export function cleanupAll(): void {
  if ((window as any).monaco?.editor) {
    (window as any).monaco.editor.getEditors().forEach((editor: any) => editor.dispose());
  }

  if ((window as any).tabManager) {
    (window as any).tabManager.cleanup?.();
  }

  if ((window as any).fileSystem) {
    (window as any).fileSystem.integratedFolderManager?.cleanup?.();
    (window as any).fileSystem.contextMenuManager?.cleanup?.();
  }

  if ((window as any).explorerFilter?.cleanup) (window as any).explorerFilter.cleanup();
  if ((window as any).folderToggle?.cleanup)   (window as any).folderToggle.cleanup();
  if ((window as any).breadcrumbManager?.cleanup) (window as any).breadcrumbManager.cleanup();
  if ((window as any).destroyBackupManager)    (window as any).destroyBackupManager();

  cleanupManager.cleanup();
  cleanupManager.clearAllTimers();

  isInitialized = false;
  initializationInProgress = false;

  console.log('[Cleanup] Full cleanup complete');
}

// ── Auto-wire lifecycle events ───────────────────────────────
window.addEventListener('beforeunload', () => {
  console.log('[Cleanup] Page unloading...');
  cleanupAll();
});

if (window.performance && window.performance.navigation.type === 1) {
  console.log('[Cleanup] Page refreshed - cleaning old instances');
  cleanupAll();
}
