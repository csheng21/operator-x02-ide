// ============================================================================
// TERMINAL TOGGLE BADGE - Error count on bottom toolbar terminal icon
// ============================================================================
// File: src/ide/terminal/terminalToggleBadge.ts
// Add to main.ts: import './ide/terminal/terminalToggleBadge';
//
// Shows red badge with error count on the terminal toggle button (>_)

console.log('🔴 [TerminalToggleBadge] Loading...');

// ============================================================================
// STATE
// ============================================================================

let badgeElement: HTMLElement | null = null;
let terminalButton: HTMLElement | null = null;
let initialized = false;

// ============================================================================
// FIND TERMINAL TOGGLE BUTTON
// ============================================================================

/**
 * Find the terminal toggle button in the bottom toolbar
 * Looks for the >_ icon button
 */
function findTerminalToggleButton(): HTMLElement | null {
  // Method 1: By ID or data attribute
  const byId = document.querySelector(
    '#terminal-toggle-btn, ' +
    '#toggle-terminal-btn, ' +
    '[data-action="toggle-terminal"], ' +
    '[data-panel="terminal"]'
  ) as HTMLElement;
  if (byId) {
    console.log('🔴 [TerminalToggleBadge] Found by ID/data attribute');
    return byId;
  }

  // Method 2: Look in bottom/input toolbar for terminal icon SVG
  const toolbars = document.querySelectorAll(
    '.bottom-toolbar, .status-bar, .toolbar-bottom, .input-toolbar, .chat-input-toolbar, .tool-buttons, .panel-toggles'
  );
  
  for (const toolbar of toolbars) {
    const buttons = toolbar.querySelectorAll('button, .tool-button, [role="button"]');
    
    for (const btn of buttons) {
      const el = btn as HTMLElement;
      const html = el.innerHTML || '';
      const title = el.title?.toLowerCase() || '';
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      
      // Check for terminal SVG icon (polyline with > shape)
      const hasTerminalSvg = html.includes('polyline') && 
        (html.includes('4 17 10 11 4 5') || html.includes('4,17,10,11,4,5') ||
         html.includes('points="4 17 10 11 4 5"'));
      
      // Check for >_ text content
      const hasTerminalText = el.textContent?.includes('>_') || 
                              html.includes('&gt;_') ||
                              html.includes('>_');
      
      // Check title/aria-label
      const hasTerminalTitle = title.includes('terminal') || ariaLabel.includes('terminal');
      
      if (hasTerminalSvg || hasTerminalText || hasTerminalTitle) {
        console.log('🔴 [TerminalToggleBadge] Found in toolbar');
        return el;
      }
    }
  }

  // Method 3: Look for any button with terminal SVG anywhere
  const allButtons = document.querySelectorAll('button, .tool-button');
  for (const btn of allButtons) {
    const svg = btn.querySelector('svg');
    if (svg) {
      const svgHtml = svg.outerHTML;
      // Terminal icon: polyline 4,17 10,11 4,5 and usually line 12,19 to 20,19
      if (svgHtml.includes('4 17 10 11 4 5') || 
          svgHtml.includes('4,17') ||
          (svgHtml.includes('polyline') && svgHtml.includes('17') && svgHtml.includes('11') && svgHtml.includes('5'))) {
        console.log('🔴 [TerminalToggleBadge] Found by SVG pattern');
        return btn as HTMLElement;
      }
    }
  }

  // Method 4: Look for button near terminal panel toggle
  const terminalPanel = document.querySelector('#terminal-panel, .terminal-container, [data-panel="terminal"]');
  if (terminalPanel) {
    const nearbyButtons = terminalPanel.parentElement?.querySelectorAll('button');
    if (nearbyButtons) {
      for (const btn of nearbyButtons) {
        const title = (btn as HTMLElement).title?.toLowerCase() || '';
        if (title.includes('terminal') || title.includes('toggle')) {
          console.log('🔴 [TerminalToggleBadge] Found near terminal panel');
          return btn as HTMLElement;
        }
      }
    }
  }

  return null;
}

// ============================================================================
// CREATE BADGE
// ============================================================================

function createBadge(): HTMLElement {
  const badge = document.createElement('span');
  badge.id = 'terminal-toggle-error-badge';
  badge.className = 'terminal-error-badge';
  badge.style.cssText = `
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    background: linear-gradient(135deg, #f85149 0%, #da3633 100%);
    color: white;
    font-size: 10px;
    font-weight: 700;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    border-radius: 8px;
    display: none;
    align-items: center;
    justify-content: center;
    line-height: 1;
    box-shadow: 0 2px 6px rgba(248, 81, 73, 0.5), 0 0 0 2px #1e1e1e;
    z-index: 1000;
    pointer-events: none;
  `;
  
  return badge;
}

function injectStyles(): void {
  if (document.getElementById('terminal-toggle-badge-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'terminal-toggle-badge-styles';
  style.textContent = `
    @keyframes terminalBadgePop {
      0% { transform: scale(0); opacity: 0; }
      60% { transform: scale(1.2); }
      100% { transform: scale(1); opacity: 1; }
    }
    
    @keyframes terminalBadgePulse {
      0%, 100% { 
        box-shadow: 0 2px 6px rgba(248, 81, 73, 0.5), 0 0 0 2px #1e1e1e;
      }
      50% { 
        box-shadow: 0 2px 10px rgba(248, 81, 73, 0.8), 0 0 0 2px #1e1e1e, 0 0 15px rgba(248, 81, 73, 0.3);
      }
    }
    
    #terminal-toggle-error-badge.has-errors {
      animation: terminalBadgePop 0.2s ease-out,
                 terminalBadgePulse 2s ease-in-out infinite 0.3s;
    }
    
    #terminal-toggle-error-badge.warning-only {
      background: linear-gradient(135deg, #d29922 0%, #9a6700 100%);
      box-shadow: 0 2px 6px rgba(210, 153, 34, 0.5), 0 0 0 2px #1e1e1e;
    }
    
    /* Ensure parent button has relative positioning */
    .terminal-badge-parent {
      position: relative !important;
      overflow: visible !important;
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// SETUP BADGE
// ============================================================================

function setupBadge(): boolean {
  if (badgeElement && terminalButton) return true;
  
  terminalButton = findTerminalToggleButton();
  
  if (!terminalButton) {
    return false;
  }
  
  // Inject styles
  injectStyles();
  
  // Ensure button has relative positioning and visible overflow
  terminalButton.style.position = 'relative';
  terminalButton.style.overflow = 'visible';
  terminalButton.classList.add('terminal-badge-parent');
  
  // Remove any existing badge
  terminalButton.querySelector('#terminal-toggle-error-badge')?.remove();
  
  // Create and attach badge
  badgeElement = createBadge();
  terminalButton.appendChild(badgeElement);
  
  console.log('✅ [TerminalToggleBadge] Badge attached to terminal button');
  return true;
}

// ============================================================================
// UPDATE BADGE
// ============================================================================

/**
 * Update the badge with error count
 */
export function updateTerminalToggleBadge(errorCount: number, warningCount: number = 0): void {
  // Ensure badge is set up
  if (!badgeElement || !terminalButton) {
    if (!setupBadge()) {
      // Retry later
      setTimeout(() => updateTerminalToggleBadge(errorCount, warningCount), 500);
      return;
    }
  }
  
  if (!badgeElement) return;
  
  const total = errorCount + warningCount;
  
  if (total === 0) {
    // Hide badge
    badgeElement.style.display = 'none';
    badgeElement.classList.remove('has-errors', 'warning-only');
  } else {
    // Show badge with count
    badgeElement.textContent = total > 99 ? '99+' : String(total);
    badgeElement.style.display = 'flex';
    
    // Apply correct style
    if (errorCount > 0) {
      badgeElement.classList.add('has-errors');
      badgeElement.classList.remove('warning-only');
    } else {
      badgeElement.classList.remove('has-errors');
      badgeElement.classList.add('warning-only');
    }
    
    // Trigger animation
    badgeElement.style.animation = 'none';
    badgeElement.offsetHeight; // Force reflow
    badgeElement.style.animation = '';
  }
  
  console.log(`🔴 [TerminalToggleBadge] Updated: ${errorCount} errors, ${warningCount} warnings`);
}

/**
 * Clear the badge
 */
export function clearTerminalToggleBadge(): void {
  updateTerminalToggleBadge(0, 0);
}

// ============================================================================
// INTEGRATION WITH terminalContext.ts
// ============================================================================

/**
 * Hook into the existing terminalContext system
 */
function hookIntoTerminalContext(): void {
  // Check if terminalContext exists
  const tc = (window as any).terminalContext;
  
  if (!tc) {
    // Retry in a bit
    setTimeout(hookIntoTerminalContext, 1000);
    return;
  }
  
  console.log('🔗 [TerminalToggleBadge] Hooking into terminalContext...');
  
  // Initial update from existing stats
  const stats = tc.getStats?.();
  if (stats) {
    updateTerminalToggleBadge(stats.unresolvedErrors, stats.warningCount);
  }
  
  // Listen for terminal log events
  window.addEventListener('terminal-log-added', (e: any) => {
    const entry = e.detail;
    if (entry?.isError || entry?.isWarning) {
      // Re-fetch stats after a brief delay to ensure state is updated
      setTimeout(() => {
        const stats = tc.getStats?.();
        if (stats) {
          updateTerminalToggleBadge(stats.unresolvedErrors, stats.warningCount);
        }
      }, 50);
    }
  });
  
  // Override markResolved to also update our badge
  const originalMarkResolved = tc.markResolved;
  if (originalMarkResolved) {
    tc.markResolved = function(...args: any[]) {
      originalMarkResolved.apply(this, args);
      clearTerminalToggleBadge();
    };
  }
  
  // Override clear to also update our badge
  const originalClear = tc.clear;
  if (originalClear) {
    tc.clear = function(...args: any[]) {
      originalClear.apply(this, args);
      clearTerminalToggleBadge();
    };
  }
  
  console.log('✅ [TerminalToggleBadge] Hooked into terminalContext');
}

// ============================================================================
// INTEGRATION WITH BUILD SYSTEM
// ============================================================================

/**
 * Listen for build events
 */
function hookIntoBuildSystem(): void {
  // Listen for build-complete events
  window.addEventListener('build-complete', (e: any) => {
    const { success, errorCount } = e.detail || {};
    if (success) {
      clearTerminalToggleBadge();
    } else if (errorCount !== undefined) {
      updateTerminalToggleBadge(errorCount);
    }
  });
  
  // Listen for build-error events
  window.addEventListener('build-error', (e: any) => {
    const { count, warnings } = e.detail || {};
    if (count !== undefined) {
      updateTerminalToggleBadge(count, warnings || 0);
    }
  });
  
  console.log('🔗 [TerminalToggleBadge] Build system hooks ready');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function initialize(): void {
  if (initialized) return;
  initialized = true;
  
  console.log('🚀 [TerminalToggleBadge] Initializing...');
  
  // Try to set up badge immediately
  let setupSuccess = setupBadge();
  
  if (!setupSuccess) {
    // Retry setup a few times
    let retries = 0;
    const maxRetries = 15;
    
    const retrySetup = () => {
      retries++;
      if (setupBadge()) {
        console.log(`✅ [TerminalToggleBadge] Badge setup successful after ${retries} attempts`);
        hookIntoTerminalContext();
        hookIntoBuildSystem();
      } else if (retries < maxRetries) {
        setTimeout(retrySetup, 1000);
      } else {
        console.warn('⚠️ [TerminalToggleBadge] Could not find terminal button after', maxRetries, 'attempts');
        console.log('   💡 Badge will appear when terminal button is available');
        // Keep trying in background
        setInterval(() => {
          if (!badgeElement && setupBadge()) {
            hookIntoTerminalContext();
            hookIntoBuildSystem();
          }
        }, 5000);
      }
    };
    
    setTimeout(retrySetup, 500);
  } else {
    hookIntoTerminalContext();
    hookIntoBuildSystem();
  }
  
  console.log('✅ [TerminalToggleBadge] Module ready');
}

// ============================================================================
// GLOBAL API
// ============================================================================

export const terminalToggleBadge = {
  update: updateTerminalToggleBadge,
  clear: clearTerminalToggleBadge,
  setErrors: (count: number) => updateTerminalToggleBadge(count, 0),
  setWarnings: (count: number) => updateTerminalToggleBadge(0, count),
  refresh: () => {
    const tc = (window as any).terminalContext;
    if (tc?.getStats) {
      const stats = tc.getStats();
      updateTerminalToggleBadge(stats.unresolvedErrors, stats.warningCount);
    }
  },
  // Re-initialize if button changes
  reinit: () => {
    badgeElement = null;
    terminalButton = null;
    setupBadge();
  }
};

// Expose globally
(window as any).terminalToggleBadge = terminalToggleBadge;

// ============================================================================
// AUTO-INIT
// ============================================================================

if (document.readyState === 'complete') {
  initialize();
} else {
  window.addEventListener('load', initialize);
}

// Also try on DOMContentLoaded for faster init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initialize, 300);
  });
}

console.log('🔴 [TerminalToggleBadge] Module loaded');
console.log('   Use: window.terminalToggleBadge.update(5) to show 5 errors');
console.log('   Use: window.terminalToggleBadge.clear() to hide badge');
