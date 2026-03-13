// ============================================================================
// Autonomous UI - UI components for autonomous coding mode
// ============================================================================

const autonomousUI = {
  /**
   * Show the autonomous mode indicator
   */
  showIndicator(): void {
    let indicator = document.getElementById('autonomous-indicator');
    if (indicator) return;

    indicator = document.createElement('div');
    indicator.id = 'autonomous-indicator';
    indicator.style.cssText = `
      position: fixed; bottom: 40px; right: 20px; z-index: 9999;
      background: linear-gradient(135deg, #1a5c2e, #238636);
      color: white; padding: 8px 16px; border-radius: 20px;
      font-size: 12px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex; align-items: center; gap: 8px;
      animation: autonomousPulse 2s ease-in-out infinite;
    `;
    indicator.innerHTML = `
      <span style="width:8px;height:8px;background:#4ae168;border-radius:50%;display:inline-block;"></span>
      Auto Mode Active
    `;
    document.body.appendChild(indicator);
  },

  /**
   * Hide the autonomous mode indicator
   */
  hideIndicator(): void {
    document.getElementById('autonomous-indicator')?.remove();
  },

  /**
   * Show a toast notification
   */
  showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const existing = document.querySelector('.autonomous-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'autonomous-toast';
    const colors = { success: '#238636', error: '#da3633', info: '#1f6feb' };
    toast.style.cssText = `
      position: fixed; bottom: 80px; right: 20px; z-index: 10000;
      background: ${colors[type]}; color: white; padding: 10px 20px;
      border-radius: 8px; font-size: 13px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: opacity 0.3s; opacity: 0;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  /**
   * Initialize UI components
   */
  initialize(): void {
    // Add pulse animation
    if (!document.getElementById('autonomous-ui-styles')) {
      const style = document.createElement('style');
      style.id = 'autonomous-ui-styles';
      style.textContent = `
        @keyframes autonomousPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `;
      document.head.appendChild(style);
    }
    console.log('[AutonomousUI] Initialized');
  }
};

export default autonomousUI;
