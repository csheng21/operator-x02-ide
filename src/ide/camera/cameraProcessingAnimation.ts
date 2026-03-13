// ============================================================================
// FILE: src/ide/camera/cameraProcessingAnimation.ts
// DESCRIPTION: Clean Loading Animation for Camera Analysis
// VERSION: 4.0 - Gradient Border Sweep on Header
// ============================================================================

let isProcessing: boolean = false;

/**
 * Show processing animation - Gradient border sweep on header
 */
export function showProcessingOverlay(customMessage?: string): void {
  if (isProcessing) return;
  isProcessing = true;
  
  // Inject styles
  injectProcessingStyles();
  
  // Find the camera header
  const header = document.querySelector('.dev-camera-header') as HTMLElement;
  
  if (header) {
    header.classList.add('header-processing');
    console.log('✨ Header gradient animation started');
  } else {
    console.warn('⚠️ Camera header not found');
  }
}

/**
 * Hide processing animation
 */
export function hideProcessingOverlay(): void {
  isProcessing = false;
  
  const header = document.querySelector('.dev-camera-header') as HTMLElement;
  if (header) {
    header.classList.remove('header-processing');
    console.log('✨ Header gradient animation stopped');
  }
}

/**
 * Update status message (kept for compatibility)
 */
export function updateProcessingStatus(message: string): void {
  // No-op - could add status text if needed
}

/**
 * Inject CSS styles for gradient border sweep
 */
function injectProcessingStyles(): void {
  const styleId = 'camera-header-processing-styles';
  
  // Remove old styles
  document.querySelectorAll('[id^="camera-processing-styles"]').forEach(el => el.remove());
  document.querySelectorAll('[id^="camera-scan-styles"]').forEach(el => el.remove());
  
  if (document.getElementById(styleId)) return;
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Gradient Border Sweep Animation - More Obvious */
    .dev-camera-header.header-processing {
      position: relative;
      border: 3px solid transparent !important;
      background: 
        linear-gradient(#0d1117, #0d1117) padding-box,
        linear-gradient(90deg, #238636, #58a6ff, #f0883e, #a371f7, #58a6ff, #238636) border-box !important;
      background-size: 100% 100%, 400% 100% !important;
      animation: headerGradientSweep 1.5s linear infinite !important;
      border-radius: 0 !important;
    }
    
    @keyframes headerGradientSweep {
      0% { background-position: 0 0, 0% 0; }
      100% { background-position: 0 0, 400% 0; }
    }
    
    /* Add stronger glow effect */
    .dev-camera-header.header-processing::before {
      content: '';
      position: absolute;
      top: -4px;
      left: -4px;
      right: -4px;
      bottom: -4px;
      background: linear-gradient(90deg, #238636, #58a6ff, #f0883e, #a371f7, #58a6ff, #238636);
      background-size: 400% 100%;
      animation: headerGlowSweep 1.5s linear infinite;
      filter: blur(8px);
      opacity: 0.6;
      z-index: -1;
      border-radius: inherit;
    }
    
    @keyframes headerGlowSweep {
      0% { background-position: 0% 0; }
      100% { background-position: 400% 0; }
    }
  `;
  
  document.head.appendChild(style);
}

// Export for use in other modules
export const processingAnimation = {
  show: showProcessingOverlay,
  hide: hideProcessingOverlay,
  updateStatus: updateProcessingStatus,
};
