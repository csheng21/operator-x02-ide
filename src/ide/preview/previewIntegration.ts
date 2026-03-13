// src/ide/preview/previewIntegration.ts
// Integration between Preview Tab and Build System - FIXED VERSION
// ============================================================================
// FIXES:
// - ✅ Auto hard-reload when project changes
// - ✅ Track last project path
// - ✅ Detect server restart on same port
// - ✅ Clear cache when switching projects
// ============================================================================

import { 
  openPreviewTab, 
  closePreviewTab, 
  parseTerminalForServerUrl, 
  setupPreviewAutoDetection,
  hardRefreshPreview,
  previewTab 
} from './PreviewTab';

// ============================================================================
// SERVER DETECTION STATE
// ============================================================================

let lastDetectedUrl: string | null = null;
let lastProjectPath: string | null = null;
let serverCheckInterval: number | null = null;
let serverStartTime: number = 0;

/**
 * Get current project path from window globals
 */
function getCurrentProjectPath(): string {
  return (window as any).currentFolderPath || 
         (window as any).projectPath || 
         (window as any).__currentProjectPath || 
         '';
}

/**
 * Check if project has changed
 */
function hasProjectChanged(): boolean {
  const current = getCurrentProjectPath();
  if (!current) return false;
  
  if (lastProjectPath && lastProjectPath !== current) {
    console.log('[PreviewIntegration] 🔄 Project changed:', lastProjectPath, '→', current);
    return true;
  }
  return false;
}

// ============================================================================
// ENHANCED SERVER URL DETECTION
// ============================================================================

/**
 * Process terminal output and auto-open preview when server starts
 * Call this from your terminal output handler
 */
export function processTerminalOutputForPreview(output: string): void {
  // Skip if output is empty or just whitespace
  if (!output.trim()) return;

  // Check for project change
  const projectChanged = hasProjectChanged();
  const currentProject = getCurrentProjectPath();
  
  // Parse for server URL
  const url = parseTerminalForServerUrl(output);
  
  if (url) {
    const isNewUrl = url !== lastDetectedUrl;
    const isSameUrlDifferentProject = url === lastDetectedUrl && projectChanged;
    
    if (isNewUrl || isSameUrlDifferentProject) {
      console.log('[PreviewIntegration] Server URL detected:', url);
      if (isSameUrlDifferentProject) {
        console.log('[PreviewIntegration] ⚠️ Same port but different project - will hard reload');
      }
      
      lastDetectedUrl = url;
      lastProjectPath = currentProject;
      serverStartTime = Date.now();
      
      // Wait a bit for server to be ready, then open preview
      setTimeout(() => {
        checkAndOpenPreview(url, projectChanged || isSameUrlDifferentProject);
      }, 800);
    }
  }
  
  // Also check for "ready" indicators without explicit URL
  if (!url && isServerReadyIndicator(output)) {
    // Try common ports
    const commonPorts = [3000, 5173, 8080, 4200, 5000];
    for (const port of commonPorts) {
      const guessUrl = `http://localhost:${port}`;
      checkServerAvailable(guessUrl).then(available => {
        if (available) {
          const needsHardReload = projectChanged || (lastDetectedUrl === guessUrl && hasProjectChanged());
          
          if (!previewTab.isOpen()) {
            lastDetectedUrl = guessUrl;
            lastProjectPath = currentProject;
            openPreviewTab(guessUrl);
          } else if (needsHardReload) {
            console.log('[PreviewIntegration] 🧹 Hard reloading for new project');
            lastDetectedUrl = guessUrl;
            lastProjectPath = currentProject;
            previewTab.hardReload(guessUrl);
          }
        }
      });
    }
  }
}

/**
 * Check if output indicates server is ready
 */
function isServerReadyIndicator(output: string): boolean {
  const indicators = [
    /compiled successfully/i,
    /ready in \d+/i,
    /server started/i,
    /development server/i,
    /watching for file changes/i,
    /build finished/i,
    /webpack compiled/i,
    /✓ ready/i,
    /server is running/i,
    /listening on/i,
    /started server on/i,
  ];
  
  return indicators.some(pattern => pattern.test(output));
}

/**
 * Check if server is available at URL
 */
async function checkServerAvailable(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    
    await fetch(url, { 
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors'
    });
    
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check server and open preview when ready
 * @param forceHardReload - If true, always do hard reload (for project changes)
 */
async function checkAndOpenPreview(url: string, forceHardReload: boolean = false, retries: number = 5): Promise<void> {
  const isAvailable = await checkServerAvailable(url);
  
  if (isAvailable) {
    console.log('[PreviewIntegration] Server ready, opening preview');
    
    if (previewTab.isOpen() && forceHardReload) {
      console.log('[PreviewIntegration] 🧹 Forcing hard reload due to project change');
      previewTab.hardReload(url);
    } else if (previewTab.isOpen()) {
      // Just navigate to new URL
      previewTab.create(url);
    } else {
      openPreviewTab(url);
    }
    return;
  }
  
  if (retries > 0) {
    // Retry after delay
    setTimeout(() => {
      checkAndOpenPreview(url, forceHardReload, retries - 1);
    }, 500);
  } else {
    // Open anyway - the iframe will show loading/error
    console.log('[PreviewIntegration] Opening preview (server may still be starting)');
    if (forceHardReload && previewTab.isOpen()) {
      previewTab.hardReload(url);
    } else {
      openPreviewTab(url);
    }
  }
}

// ============================================================================
// INTEGRATION WITH showClickableUrl
// ============================================================================

/**
 * Enhanced showClickableUrl that also triggers preview
 * Replace the existing showClickableUrl in buildSystemIntegration.ts
 */
export function showClickableUrlWithPreview(line: string, url: string, terminalElement: HTMLElement): void {
  const el = document.createElement('div');
  el.className = 'bld';
  
  // Escape HTML
  const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Create clickable URL with preview button
  const linked = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    `<span class="terminal-url-group">
      <span class="terminal-url" onclick="window.open('$1','_blank')" style="color:#4fc3f7;cursor:pointer;text-decoration:underline">$1</span>
      <button class="terminal-preview-btn" onclick="event.stopPropagation();window.previewTab?.open('$1')" title="Open in Preview">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      </button>
    </span>`
  );
  
  el.innerHTML = linked;
  terminalElement.appendChild(el);
  terminalElement.scrollTop = terminalElement.scrollHeight;
  
  // Auto-open preview if this is a new URL or project changed
  const projectChanged = hasProjectChanged();
  if (url !== lastDetectedUrl || projectChanged) {
    lastDetectedUrl = url;
    lastProjectPath = getCurrentProjectPath();
    
    setTimeout(() => {
      if (previewTab.isOpen() && projectChanged) {
        previewTab.hardReload(url);
      } else {
        openPreviewTab(url);
      }
    }, 500);
  }
}

// ============================================================================
// RUN MENU INTEGRATION
// ============================================================================

/**
 * Add Preview option to Run menu
 */
export function addPreviewToRunMenu(): void {
  const runMenu = document.querySelector('.run-menu-dropdown') ||
                  document.querySelector('[class*="run-menu"]') ||
                  document.querySelector('#run-menu');
  
  if (!runMenu) {
    console.warn('[PreviewIntegration] Run menu not found');
    return;
  }
  
  // Check if already added
  if (runMenu.querySelector('#run-menu-preview')) return;
  
  // Create preview menu item
  const previewItem = document.createElement('div');
  previewItem.id = 'run-menu-preview';
  previewItem.className = 'run-menu-item';
  previewItem.innerHTML = `
    <span class="run-menu-icon">🌐</span>
    <span class="run-menu-label">Open Preview</span>
    <span class="run-menu-shortcut">Ctrl+Shift+P</span>
  `;
  
  previewItem.addEventListener('click', () => {
    if (lastDetectedUrl) {
      openPreviewTab(lastDetectedUrl);
    } else {
      // Prompt for URL
      const url = prompt('Enter URL to preview:', 'http://localhost:3000');
      if (url) {
        openPreviewTab(url);
      }
    }
  });
  
  // Create hard refresh menu item
  const hardRefreshItem = document.createElement('div');
  hardRefreshItem.id = 'run-menu-hard-refresh';
  hardRefreshItem.className = 'run-menu-item';
  hardRefreshItem.innerHTML = `
    <span class="run-menu-icon">🧹</span>
    <span class="run-menu-label">Hard Refresh Preview</span>
    <span class="run-menu-shortcut">Ctrl+Shift+R</span>
  `;
  
  hardRefreshItem.addEventListener('click', () => {
    if (previewTab.isOpen()) {
      hardRefreshPreview();
    } else {
      console.log('[PreviewIntegration] No preview open to refresh');
    }
  });
  
  // Add separator before
  const separator = document.createElement('div');
  separator.className = 'run-menu-separator';
  runMenu.appendChild(separator);
  runMenu.appendChild(previewItem);
  runMenu.appendChild(hardRefreshItem);
}

// ============================================================================
// KEYBOARD SHORTCUT
// ============================================================================

/**
 * Setup keyboard shortcuts for preview
 */
export function setupPreviewShortcut(): void {
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+P: Toggle preview
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      
      if (previewTab.isOpen()) {
        if (previewTab.isActiveTab()) {
          previewTab.deactivatePreviewTab();
        } else {
          previewTab.activatePreviewTab();
        }
      } else if (lastDetectedUrl) {
        openPreviewTab(lastDetectedUrl);
      } else {
        // Prompt for URL
        const url = prompt('Enter URL to preview:', 'http://localhost:3000');
        if (url) {
          openPreviewTab(url);
        }
      }
    }
    
    // Ctrl+Shift+R: Hard refresh preview (when preview is active)
    // Note: This is also handled in PreviewTab.ts, but we add it here too for redundancy
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r' && previewTab.isActiveTab()) {
      e.preventDefault();
      hardRefreshPreview();
    }
  });
}

// ============================================================================
// STATUS BAR INTEGRATION
// ============================================================================

/**
 * Add preview status to status bar
 */
export function addPreviewStatusIndicator(): void {
  const statusBar = document.querySelector('.status-bar') ||
                    document.querySelector('[class*="statusbar"]') ||
                    document.querySelector('#status-bar');
  
  if (!statusBar) return;
  
  // Check if already added
  if (statusBar.querySelector('#preview-status-indicator')) return;
  
  const indicator = document.createElement('div');
  indicator.id = 'preview-status-indicator';
  indicator.className = 'status-bar-item preview-status';
  indicator.innerHTML = `
    <span class="preview-status-icon">🌐</span>
    <span class="preview-status-text">No Server</span>
  `;
  indicator.style.cssText = 'display:flex;align-items:center;gap:4px;padding:0 8px;cursor:pointer;font-size:11px;color:#888';
  
  indicator.addEventListener('click', () => {
    if (lastDetectedUrl) {
      if (previewTab.isOpen()) {
        previewTab.activatePreviewTab();
      } else {
        openPreviewTab(lastDetectedUrl);
      }
    }
  });
  
  // Right-click for hard refresh
  indicator.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (previewTab.isOpen()) {
      hardRefreshPreview();
      console.log('[PreviewIntegration] Hard refresh triggered from status bar');
    }
  });
  
  statusBar.appendChild(indicator);
  
  // Update indicator when server is detected
  window.addEventListener('server-url-detected', ((e: CustomEvent) => {
    const textEl = indicator.querySelector('.preview-status-text');
    if (textEl) {
      textEl.textContent = new URL(e.detail.url).host;
      indicator.style.color = '#4fc3f7';
    }
  }) as EventListener);
}

// ============================================================================
// CSS FOR TERMINAL URL BUTTONS
// ============================================================================

function injectTerminalStyles(): void {
  if (document.getElementById('preview-terminal-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'preview-terminal-styles';
  style.textContent = `
    .terminal-url-group {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    
    .terminal-preview-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px 4px;
      background: #0e639c;
      border: none;
      border-radius: 3px;
      color: #fff;
      cursor: pointer;
      opacity: 0.8;
      transition: opacity 0.15s;
    }
    
    .terminal-preview-btn:hover {
      opacity: 1;
    }
    
    .terminal-preview-btn svg {
      width: 12px;
      height: 12px;
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize all preview integrations
 * Call this in your main.ts
 */
export function initializePreviewIntegration(): void {
  console.log('[PreviewIntegration] Initializing (FIXED with project tracking)...');
  
  // Inject styles
  injectTerminalStyles();
  
  // Setup auto-detection
  setupPreviewAutoDetection();
  
  // Setup keyboard shortcut
  setupPreviewShortcut();
  
  // Initialize project tracking
  lastProjectPath = getCurrentProjectPath();
  
  // Add to status bar (with delay to ensure status bar exists)
  setTimeout(() => {
    addPreviewStatusIndicator();
  }, 1000);
  
  // Add to run menu (with delay)
  setTimeout(() => {
    addPreviewToRunMenu();
  }, 1500);
  
  console.log('[PreviewIntegration] ✅ Initialized');
  console.log('   - Ctrl+Shift+P: Toggle preview');
  console.log('   - Ctrl+Shift+R: Hard refresh (clear cache)');
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  openPreviewTab,
  closePreviewTab,
  hardRefreshPreview,
  previewTab,
  lastDetectedUrl
};
