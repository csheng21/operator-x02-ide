// ============================================================================
// TERMINAL CONTEXT FIX - Patch for toolbar selector
// ============================================================================
// 
// PROBLEM: terminalContext.ts looks for '.tool-buttons-group' but your HTML uses '.input-tools'
//
// SOLUTION: Update line ~1040 in terminalContext.ts
//
// FIND THIS (around line 1038-1042):
// ----------------------------------------------------------------------------
//   const toolbar = document.querySelector('.tool-buttons-group.modern-tools-left') ||
//                   document.querySelector('.modern-bottom-toolbar .tool-buttons-group') ||
//                   document.querySelector('.tool-buttons-group');
// ----------------------------------------------------------------------------
//
// REPLACE WITH:
// ----------------------------------------------------------------------------
//   const toolbar = document.querySelector('.input-tools') ||
//                   document.querySelector('.chat-input-actions .input-tools') ||
//                   document.querySelector('.chat-input-actions') ||
//                   document.querySelector('.tool-buttons-group');
// ----------------------------------------------------------------------------
//
// ============================================================================

/**
 * Quick runtime fix - run this in console or import this file
 * This patches the addTerminalContextButton function at runtime
 */
export function applyTerminalContextFix(): void {
  console.log('🔧 [TerminalContextFix] Applying toolbar selector fix...');
  
  // Find the correct toolbar
  const toolbar = document.querySelector('.input-tools') ||
                  document.querySelector('.chat-input-actions .input-tools') ||
                  document.querySelector('.chat-input-actions');
  
  if (!toolbar) {
    console.warn('❌ [TerminalContextFix] Could not find toolbar');
    return;
  }
  
  // Check if button already exists
  if (document.getElementById('terminal-ctx-btn')) {
    console.log('ℹ️ [TerminalContextFix] Button already exists');
    return;
  }
  
  // Create the terminal context button
  const btn = document.createElement('button');
  btn.id = 'terminal-ctx-btn';
  btn.className = 'tool-button';
  btn.title = 'Terminal Context OFF (Ctrl+Shift+T)\nClick to toggle terminal error awareness';
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="4 17 10 11 4 5"></polyline>
      <line x1="12" y1="19" x2="20" y2="19"></line>
    </svg>
  `;
  
  // Style to match other buttons
  btn.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: #888;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  `;
  
  // Hover effect
  btn.onmouseenter = () => {
    if (!btn.classList.contains('active')) {
      btn.style.background = 'rgba(255,255,255,0.1)';
      btn.style.color = '#ccc';
    }
  };
  btn.onmouseleave = () => {
    if (!btn.classList.contains('active')) {
      btn.style.background = 'transparent';
      btn.style.color = '#888';
    }
  };
  
  // Click handler
  btn.onclick = () => {
    const tc = (window as any).terminalContext;
    if (tc?.toggle) {
      tc.toggle();
      updateButtonState(btn, tc.isEnabled?.() || false);
    }
  };
  
  // Insert at the beginning of toolbar
  toolbar.insertBefore(btn, toolbar.firstChild);
  
  // Update initial state
  const tc = (window as any).terminalContext;
  updateButtonState(btn, tc?.isEnabled?.() || false);
  
  console.log('✅ [TerminalContextFix] Button added successfully!');
}

/**
 * Update button visual state
 */
function updateButtonState(btn: HTMLElement, isOn: boolean): void {
  if (isOn) {
    btn.classList.add('active');
    btn.style.color = '#4fc3f7';
    btn.style.background = 'rgba(79, 195, 247, 0.15)';
    btn.title = 'Terminal Context ON (Ctrl+Shift+T)\nAI will see terminal errors\nClick to disable';
  } else {
    btn.classList.remove('active');
    btn.style.color = '#888';
    btn.style.background = 'transparent';
    btn.title = 'Terminal Context OFF (Ctrl+Shift+T)\nClick to enable terminal error awareness';
  }
}

// Auto-apply fix when imported
if (typeof window !== 'undefined') {
  // Expose for manual use
  (window as any).applyTerminalContextFix = applyTerminalContextFix;
  
  // Auto-apply after a delay
  setTimeout(() => {
    if (!document.getElementById('terminal-ctx-btn')) {
      applyTerminalContextFix();
    }
  }, 1000);
  
  // Also try when DOM changes (in case toolbar loads later)
  const observer = new MutationObserver(() => {
    if (!document.getElementById('terminal-ctx-btn') && document.querySelector('.input-tools')) {
      applyTerminalContextFix();
      observer.disconnect();
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Stop observing after 30 seconds
  setTimeout(() => observer.disconnect(), 30000);
}

export default applyTerminalContextFix;
