// terminalTabAnimation.ts - Animate TERMINAL tab when AI Context is active
// Add to main.ts: import './terminalTabAnimation';

console.log('✨ [TerminalTabAnimation] Loading...');

/**
 * Add/remove AI indicator animation on TERMINAL tab
 */
export function updateTerminalTabIndicator(active: boolean): void {
  console.log('✨ [TerminalTabAnimation] Setting active:', active);
  
  // Find the TERMINAL tab
  const terminalTab = findTerminalTab();
  if (!terminalTab) {
    console.warn('✨ [TerminalTabAnimation] Terminal tab not found');
    return;
  }
  
  // Add styles if not present
  injectTabAnimationStyles();
  
  if (active) {
    // Add AI indicator
    terminalTab.classList.add('terminal-tab-ai-active');
    
    // Add pulsing dot if not exists (after the tab-label)
    if (!terminalTab.querySelector('.terminal-tab-ai-dot')) {
      const dot = document.createElement('span');
      dot.className = 'terminal-tab-ai-dot';
      
      // Find the tab-label and insert after it
      const tabLabel = terminalTab.querySelector('.tab-label');
      if (tabLabel) {
        tabLabel.after(dot);
      } else {
        terminalTab.appendChild(dot);
      }
    }
    
    console.log('✨ [TerminalTabAnimation] ✅ Pulse dot added to tab');
  } else {
    // Remove AI indicator
    terminalTab.classList.remove('terminal-tab-ai-active');
    
    // Remove dot
    const dot = terminalTab.querySelector('.terminal-tab-ai-dot');
    if (dot) {
      dot.remove();
    }
    
    console.log('✨ [TerminalTabAnimation] Pulse dot removed from tab');
  }
}

/**
 * Find the TERMINAL tab element
 */
function findTerminalTab(): HTMLElement | null {
  // Method 1: Find by data-tab-id (most reliable)
  const tabById = document.querySelector('.explorer-tab[data-tab-id="terminal"]');
  if (tabById) {
    console.log('✨ [TerminalTabAnimation] Found tab by data-tab-id');
    return tabById as HTMLElement;
  }
  
  // Method 2: Find explorer-tab containing "Terminal" text
  const explorerTabs = document.querySelectorAll('.explorer-tab');
  for (const tab of explorerTabs) {
    if (tab.textContent?.trim().toUpperCase().includes('TERMINAL')) {
      console.log('✨ [TerminalTabAnimation] Found tab by text content');
      return tab as HTMLElement;
    }
  }
  
  // Method 3: Find tab-label with Terminal text and get parent
  const tabLabels = document.querySelectorAll('.tab-label');
  for (const label of tabLabels) {
    if (label.textContent?.trim().toUpperCase() === 'TERMINAL') {
      const parent = label.closest('.explorer-tab');
      if (parent) {
        console.log('✨ [TerminalTabAnimation] Found tab via tab-label parent');
        return parent as HTMLElement;
      }
    }
  }
  
  return null;
}

/**
 * Inject CSS styles for tab animation
 */
function injectTabAnimationStyles(): void {
  if (document.getElementById('terminal-tab-ai-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'terminal-tab-ai-styles';
  style.textContent = `
    /* Terminal tab AI active state */
    .explorer-tab.terminal-tab-ai-active {
      position: relative;
    }
    
    /* Pulsing dot indicator */
    .terminal-tab-ai-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      margin-left: 6px;
      background: #4fc3f7;
      border-radius: 50%;
      animation: aiDotPulse 1.5s ease-in-out infinite;
      vertical-align: middle;
      flex-shrink: 0;
    }
    
    @keyframes aiDotPulse {
      0%, 100% { 
        opacity: 1;
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(79, 195, 247, 0.5);
      }
      50% { 
        opacity: 0.8;
        transform: scale(1.2);
        box-shadow: 0 0 6px 2px rgba(79, 195, 247, 0.3);
      }
    }
  `;
  document.head.appendChild(style);
  console.log('✨ [TerminalTabAnimation] Styles injected');
}

/**
 * Listen for terminal context changes
 */
function setupListeners(): void {
  // Listen for terminal context toggle event (dispatched by terminalContext.ts)
  window.addEventListener('terminal-context-toggled', (e: any) => {
    const active = e.detail?.enabled ?? false;
    console.log('✨ [TerminalTabAnimation] terminal-context-toggled event:', active);
    updateTerminalTabIndicator(active);
  });
  
  // Also listen on document
  document.addEventListener('terminal-context-toggled', (e: any) => {
    const active = e.detail?.enabled ?? false;
    updateTerminalTabIndicator(active);
  });
  
  // Legacy event name support
  document.addEventListener('terminal-context-changed', (e: any) => {
    const active = e.detail?.enabled ?? e.detail?.active ?? false;
    updateTerminalTabIndicator(active);
  });
  
  console.log('✨ [TerminalTabAnimation] Listeners ready');
}

// Initialize
setupListeners();

// Expose for manual use
(window as any).terminalTabAnimation = {
  activate: () => updateTerminalTabIndicator(true),
  deactivate: () => updateTerminalTabIndicator(false),
  toggle: (active: boolean) => updateTerminalTabIndicator(active)
};

console.log('✨ [TerminalTabAnimation] ✅ Ready');
console.log('   Use window.terminalTabAnimation.activate() / .deactivate()');
