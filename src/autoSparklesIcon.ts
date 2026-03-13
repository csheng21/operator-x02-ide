// ============================================================================
// autoSparklesIcon.ts - AI Sparkles Auto Mode Icon (LARGE)
// ============================================================================
// 
// USAGE: Import in main.ts AFTER autonomousCoding.ts:
//   import './autoSparklesIcon';
//
// This will automatically:
// 1. Replace the old sun/gear icon with AI Sparkles
// 2. Inject the new styles
// 3. Remove wave/ripple effects
// ============================================================================

console.log('✨ [AutoIcon] Loading AI Sparkles icon...');

// ============================================================================
// SPARKLES SVG ICONS
// ============================================================================

const SPARKLES_ICON_OFF = `
  <svg class="auto-icon-off" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
    <path d="M19 13l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"/>
    <path d="M5 17l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z"/>
  </svg>
`;

const SPARKLES_ICON_ON = `
  <svg class="auto-icon-on" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
    <path d="M19 13l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"/>
    <path d="M5 17l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z"/>
  </svg>
`;

const SPARKLES_ICON_HTML = SPARKLES_ICON_OFF + SPARKLES_ICON_ON;

// ============================================================================
// INJECT STYLES
// ============================================================================

function injectSparklesStyles(): void {
  // Remove if already exists
  document.getElementById('auto-sparkles-styles')?.remove();
  
  // Remove old conflicting styles
  document.getElementById('autonomous-toggle-styles')?.remove();
  document.getElementById('autonomous-toggle-styles-v2')?.remove();
  document.getElementById('auto-badge-styles')?.remove();
  document.getElementById('sparkle-icon-style')?.remove();
  document.getElementById('sparkle-big')?.remove();
  document.getElementById('sparkle-large')?.remove();
  document.getElementById('no-wave-effect-style')?.remove();
  
  const style = document.createElement('style');
  style.id = 'auto-sparkles-styles';
  style.textContent = `
    /* ============================================
       AI SPARKLES AUTO MODE - LARGE SIZE
       ============================================ */
    
    /* Button container */
    .autonomous-mode-toggle,
    #autonomous-mode-toggle {
      position: relative !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 40px !important;
      height: 40px !important;
      padding: 0 !important;
      margin: 0 4px !important;
      background: transparent !important;
      border: none !important;
      border-radius: 10px !important;
      color: #6b7280 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      user-select: none !important;
    }
    
    /* Hover state */
    .autonomous-mode-toggle:hover,
    #autonomous-mode-toggle:hover {
      background: rgba(255, 255, 255, 0.08) !important;
      color: #9ca3af !important;
    }
    
    /* SVG icon sizing */
    .autonomous-mode-toggle svg,
    #autonomous-mode-toggle svg {
      width: 28px !important;
      height: 28px !important;
      transition: all 0.2s ease !important;
    }
    
    /* ============================================
       OFF STATE - Outline sparkles
       ============================================ */
    .autonomous-mode-toggle .auto-icon-off,
    #autonomous-mode-toggle .auto-icon-off {
      display: block !important;
    }
    
    .autonomous-mode-toggle .auto-icon-on,
    #autonomous-mode-toggle .auto-icon-on {
      display: none !important;
    }
    
    /* ============================================
       ON STATE - Filled sparkles + animation
       ============================================ */
    .autonomous-mode-toggle.active .auto-icon-off,
    #autonomous-mode-toggle.active .auto-icon-off,
    .autonomous-mode-toggle.auto-active .auto-icon-off,
    #autonomous-mode-toggle.auto-active .auto-icon-off {
      display: none !important;
    }
    
    .autonomous-mode-toggle.active .auto-icon-on,
    #autonomous-mode-toggle.active .auto-icon-on,
    .autonomous-mode-toggle.auto-active .auto-icon-on,
    #autonomous-mode-toggle.auto-active .auto-icon-on {
      display: block !important;
    }
    
    /* Active button styling */
    .autonomous-mode-toggle.active,
    #autonomous-mode-toggle.active,
    .autonomous-mode-toggle.auto-active,
    #autonomous-mode-toggle.auto-active {
      color: #10b981 !important;
      background: rgba(16, 185, 129, 0.12) !important;
    }
    
    .autonomous-mode-toggle.active:hover,
    #autonomous-mode-toggle.active:hover,
    .autonomous-mode-toggle.auto-active:hover,
    #autonomous-mode-toggle.auto-active:hover {
      background: rgba(16, 185, 129, 0.2) !important;
    }
    
    /* ============================================
       SPARKLE PULSE ANIMATION
       ============================================ */
    @keyframes sparkle-pulse {
      0%, 100% { 
        transform: scale(1); 
        filter: drop-shadow(0 0 5px rgba(16, 185, 129, 0.5));
      }
      50% { 
        transform: scale(1.15); 
        filter: drop-shadow(0 0 16px rgba(16, 185, 129, 0.9));
      }
    }
    
    .autonomous-mode-toggle.active svg,
    #autonomous-mode-toggle.active svg,
    .autonomous-mode-toggle.auto-active svg,
    #autonomous-mode-toggle.auto-active svg {
      animation: sparkle-pulse 1.5s ease-in-out infinite !important;
    }
    
    /* ============================================
       REMOVE WAVE/RIPPLE EFFECTS
       ============================================ */
    .autonomous-mode-toggle::after,
    .autonomous-mode-toggle::before,
    #autonomous-mode-toggle::after,
    #autonomous-mode-toggle::before {
      display: none !important;
      content: none !important;
      animation: none !important;
    }
    
    /* Remove old status dot */
    .autonomous-mode-toggle .auto-status-dot,
    #autonomous-mode-toggle .auto-status-dot {
      display: none !important;
    }
    
    /* Click feedback */
    .autonomous-mode-toggle:active,
    #autonomous-mode-toggle:active {
      transform: scale(0.9) !important;
    }
  `;
  
  document.head.appendChild(style);
  console.log('✨ [AutoIcon] Sparkles styles injected');
}

// ============================================================================
// UPDATE EXISTING BUTTON
// ============================================================================

function updateAutoModeButton(): void {
  const btn = document.querySelector('.autonomous-mode-toggle') || 
              document.getElementById('autonomous-mode-toggle');
  
  if (btn) {
    // Save current active state
    const wasActive = btn.classList.contains('active') || 
                      btn.classList.contains('auto-active');
    
    // Update icon
    btn.innerHTML = SPARKLES_ICON_HTML;
    
    // Restore active state
    if (wasActive) {
      btn.classList.add('active');
    }
    
    console.log('✨ [AutoIcon] Button updated to Sparkles');
  }
}

// ============================================================================
// WATCH FOR BUTTON CREATION
// ============================================================================

function watchForAutoModeButton(): void {
  // Update immediately if button exists
  updateAutoModeButton();
  
  // Watch for new buttons being added
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement) {
            // Check if it's the auto mode button or contains one
            if (node.classList?.contains('autonomous-mode-toggle') ||
                node.id === 'autonomous-mode-toggle' ||
                node.querySelector?.('.autonomous-mode-toggle, #autonomous-mode-toggle')) {
              setTimeout(updateAutoModeButton, 50);
              break;
            }
          }
        }
      }
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function initSparklesIcon(): void {
  console.log('✨ [AutoIcon] Initializing...');
  
  // Inject styles first
  injectSparklesStyles();
  
  // Update button when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      watchForAutoModeButton();
    });
  } else {
    watchForAutoModeButton();
  }
  
  // Also update after a delay (for dynamically created buttons)
  setTimeout(updateAutoModeButton, 500);
  setTimeout(updateAutoModeButton, 1000);
  setTimeout(updateAutoModeButton, 2000);
  setTimeout(updateAutoModeButton, 5000);
  
  console.log('✨ [AutoIcon] AI Sparkles ready!');
}

// Auto-initialize
initSparklesIcon();

// ============================================================================
// EXPORTS
// ============================================================================

export { 
  initSparklesIcon, 
  updateAutoModeButton, 
  injectSparklesStyles,
  SPARKLES_ICON_HTML 
};

// Expose globally for debugging
if (typeof window !== 'undefined') {
  (window as any).updateAutoSparkles = updateAutoModeButton;
  (window as any).injectSparklesStyles = injectSparklesStyles;
}
