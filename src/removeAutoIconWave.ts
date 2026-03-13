// ============================================================================
// FIX: Remove Wave Effect from Auto Icon Button
// ============================================================================
// 
// Add this CSS to your autonomousCoding.ts in the injectAutonomousToggleStyles()
// function, OR add it as a separate style injection.
//
// OPTION 1: Find this in autonomousCoding.ts around line 1897-1985
//           and add the CSS below to the style.textContent
//
// OPTION 2: Paste this entire block in your main.ts or create a new file
// ============================================================================

const removeAutoIconWaveEffect = (): void => {
  if (document.getElementById('no-wave-effect-style')) return;
  
  const style = document.createElement('style');
  style.id = 'no-wave-effect-style';
  style.textContent = `
    /* ============================================
       REMOVE WAVE/RIPPLE EFFECT FROM AUTO ICON
       ============================================ */
    
    /* Remove any ::after pseudo-element animations */
    .autonomous-mode-toggle::after,
    #autonomous-mode-toggle::after,
    .auto-mode-toggle::after,
    [class*="autonomous"]::after,
    [id*="autonomous"]::after {
      display: none !important;
      content: none !important;
      animation: none !important;
    }
    
    /* Remove any ::before pseudo-element animations */
    .autonomous-mode-toggle::before,
    #autonomous-mode-toggle::before,
    .auto-mode-toggle::before {
      display: none !important;
      content: none !important;
      animation: none !important;
    }
    
    /* Remove ripple/wave animations on click */
    .autonomous-mode-toggle,
    #autonomous-mode-toggle,
    .auto-mode-toggle {
      overflow: hidden !important;
    }
    
    /* Disable any expanding wave keyframes */
    @keyframes ripple { 0%, 100% { transform: none; opacity: 0; } }
    @keyframes wave { 0%, 100% { transform: none; opacity: 0; } }
    @keyframes click-wave { 0%, 100% { transform: none; opacity: 0; } }
    @keyframes expand-wave { 0%, 100% { transform: none; opacity: 0; } }
    
    /* Remove box-shadow pulse on active state */
    .autonomous-mode-toggle:active,
    #autonomous-mode-toggle:active {
      box-shadow: none !important;
      transform: scale(0.95) !important;
    }
    
    /* Keep the button clean - only simple hover effect */
    .autonomous-mode-toggle:hover,
    #autonomous-mode-toggle:hover {
      background: rgba(255, 255, 255, 0.08) !important;
    }
    
    /* Remove any glow animations */
    .autonomous-mode-toggle.active,
    #autonomous-mode-toggle.active {
      animation: none !important;
    }
    
    /* Keep only the spin animation for the icon when active */
    .autonomous-mode-toggle.active svg,
    #autonomous-mode-toggle.active svg {
      animation: autonomous-spin 2.5s linear infinite !important;
    }
  `;
  document.head.appendChild(style);
  console.log('✅ Wave effect removed from auto icon');
};

// Auto-run
removeAutoIconWaveEffect();

// Export for use
export { removeAutoIconWaveEffect };
