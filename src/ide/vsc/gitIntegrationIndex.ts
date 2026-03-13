// ide/vsc/index.ts
// ============================================================================
// GIT INTEGRATION INDEX - How to use VirtualizedGitList
// ============================================================================

import { GitPanelVirtualized, createGitPanel } from './gitPanelVirtualized';
import './gitPanelVirtualized.css';
import './virtualizedGitList.css';

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

let gitPanel: GitPanelVirtualized | null = null;

/**
 * Initialize the Git panel with virtual scrolling
 * Call this when opening the Source Control tab
 */
export function initializeGitPanel(containerSelector: string, repoPath: string): void {
  const container = document.querySelector(containerSelector) as HTMLElement;
  
  if (!container) {
    console.error('❌ Git panel container not found:', containerSelector);
    return;
  }
  
  // Destroy existing panel if any
  if (gitPanel) {
    gitPanel.destroy();
  }
  
  // Create new panel
  gitPanel = createGitPanel(container, {
    repoPath,
    autoRefresh: true,
    refreshInterval: 5000,
    showFilter: true
  });
  
  // Listen for events
  setupGitPanelEvents(container);
  
  console.log('✅ Git panel initialized with virtual scrolling');
}

/**
 * Setup event listeners for Git panel events
 */
function setupGitPanelEvents(container: HTMLElement): void {
  // Open file in editor
  container.addEventListener('git-open-file', ((event: CustomEvent) => {
    const { path, status } = event.detail;
    console.log('Opening file:', path, 'Status:', status);
    
    // Integrate with your editor
    // Example: editorManager.openFile(path);
    window.dispatchEvent(new CustomEvent('open-file-request', {
      detail: { filePath: path }
    }));
  }) as EventListener);
  
  // Show context menu
  container.addEventListener('git-context-menu', ((event: CustomEvent) => {
    const { file, x, y } = event.detail;
    showGitContextMenu(file, x, y);
  }) as EventListener);
  
  // Show notifications
  container.addEventListener('git-notification', ((event: CustomEvent) => {
    const { message, type } = event.detail;
    showNotification(message, type);
  }) as EventListener);
}

/**
 * Show context menu for Git file
 */
function showGitContextMenu(file: any, x: number, y: number): void {
  // Remove existing menu
  document.querySelector('.git-context-menu')?.remove();
  
  const menu = document.createElement('div');
  menu.className = 'git-context-menu';
  menu.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    background: #252526;
    border: 1px solid #3c3c3c;
    border-radius: 4px;
    padding: 4px 0;
    min-width: 160px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
  `;
  
  const actions = [
    { label: 'Open File', action: () => openFile(file.path) },
    { label: 'Open Changes', action: () => openDiff(file.path, file.staged) },
    { label: '─', divider: true },
    { label: file.staged ? 'Unstage' : 'Stage', action: () => toggleStage(file) },
    { label: 'Discard Changes', action: () => discardChanges(file.path), danger: true },
    { label: '─', divider: true },
    { label: 'Copy Path', action: () => copyToClipboard(file.path) },
    { label: 'Reveal in Explorer', action: () => revealInExplorer(file.path) }
  ];
  
  for (const item of actions) {
    if (item.divider) {
      const divider = document.createElement('div');
      divider.style.cssText = 'height: 1px; background: #3c3c3c; margin: 4px 0;';
      menu.appendChild(divider);
    } else {
      const menuItem = document.createElement('div');
      menuItem.className = 'context-menu-item';
      menuItem.textContent = item.label;
      menuItem.style.cssText = `
        padding: 6px 12px;
        cursor: pointer;
        font-size: 12px;
        color: ${item.danger ? '#dc5050' : '#cccccc'};
      `;
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.background = 'rgba(255,255,255,0.1)';
      });
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.background = 'transparent';
      });
      menuItem.addEventListener('click', () => {
        menu.remove();
        item.action?.();
      });
      menu.appendChild(menuItem);
    }
  }
  
  document.body.appendChild(menu);
  
  // Close on click outside
  const closeMenu = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  setTimeout(() => document.addEventListener('click', closeMenu), 0);
}

// ============================================================================
// HELPER FUNCTIONS (Integrate with your existing code)
// ============================================================================

function openFile(path: string): void {
  // Your file opening logic
  console.log('Open file:', path);
}

function openDiff(path: string, staged: boolean): void {
  // Your diff viewer logic
  console.log('Open diff:', path, 'staged:', staged);
}

function toggleStage(file: any): void {
  // Handled by GitPanelVirtualized internally
}

function discardChanges(path: string): void {
  // Handled by GitPanelVirtualized internally
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text);
  showNotification('Copied to clipboard', 'success');
}

function revealInExplorer(path: string): void {
  // Your reveal in explorer logic
  console.log('Reveal:', path);
}

function showNotification(message: string, type: 'info' | 'success' | 'error'): void {
  // Your notification system
  console.log(`[${type}] ${message}`);
  
  // Simple toast notification
  const toast = document.createElement('div');
  toast.className = `git-notification ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================================================
// PUBLIC API
// ============================================================================

export function refreshGitPanel(): void {
  gitPanel?.refresh();
}

export function destroyGitPanel(): void {
  gitPanel?.destroy();
  gitPanel = null;
}

export function getGitPanelState() {
  return gitPanel?.getState() ?? null;
}

// ============================================================================
// AUTO-INITIALIZE (Optional - uncomment if needed)
// ============================================================================

/*
document.addEventListener('DOMContentLoaded', () => {
  // Get repo path from project state
  const repoPath = (window as any).projectState?.projectPath;
  
  if (repoPath) {
    // Wait for panel container to exist
    const checkContainer = setInterval(() => {
      const container = document.querySelector('.git-panel-container');
      if (container) {
        clearInterval(checkContainer);
        initializeGitPanel('.git-panel-container', repoPath);
      }
    }, 100);
    
    // Stop checking after 10 seconds
    setTimeout(() => clearInterval(checkContainer), 10000);
  }
});
*/

export default {
  initializeGitPanel,
  refreshGitPanel,
  destroyGitPanel,
  getGitPanelState
};
