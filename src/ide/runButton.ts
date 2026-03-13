// src/ide/runButton.ts
// Creates the visible Run button in the toolbar

/**
 * Initialize Run button in the toolbar
 */
export function initializeRunButton(): void {
  console.log('🎯 Initializing Run button...');
  
  // Wait for toolbar to be ready
  const toolbar = findToolbar();
  if (!toolbar) {
    console.warn('⚠️ Toolbar not found, retrying...');
    setTimeout(initializeRunButton, 500);
    return;
  }

  // Check if button already exists
  if (document.getElementById('run-button')) {
    console.log('Run button already exists');
    return;
  }

  // Create and add button
  const runButton = createRunButton();
  toolbar.appendChild(runButton);
  
  // Setup keyboard shortcut
  setupKeyboardShortcut();
  
  console.log('✅ Run button added to toolbar');
}

/**
 * Find the toolbar element
 */
function findToolbar(): HTMLElement | null {
  // Try different possible toolbar locations
  const selectors = [
    '.toolbar',
    '.menu-bar',
    'nav',
    '[role="toolbar"]',
    '.top-bar',
    'header',
    '.header'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      console.log(`✓ Found toolbar: ${selector}`);
      return element;
    }
  }

  console.warn('⚠️ No toolbar found. Tried:', selectors.join(', '));
  return null;
}

/**
 * Create the Run button element
 */
function createRunButton(): HTMLElement {
  const button = document.createElement('button');
  button.id = 'run-button';
  button.className = 'run-button';
  button.innerHTML = '<span class="run-icon">▶</span> <span class="run-text">Run</span>';
  button.title = 'Run current file (F5)';
  
  button.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 16px;
    margin-left: auto;
    margin-right: 12px;
    background: linear-gradient(135deg, #4CAF50, #45a049);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    user-select: none;
    position: relative;
    overflow: hidden;
    min-width: 80px;
    height: 32px;
  `;

  // Add ripple effect container
  const rippleContainer = document.createElement('span');
  rippleContainer.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none;
  `;
  button.appendChild(rippleContainer);

  // Style the icon
  const icon = button.querySelector('.run-icon') as HTMLElement;
  if (icon) {
    icon.style.cssText = `
      font-size: 12px;
      display: inline-block;
      transition: transform 0.3s ease;
    `;
  }

  // Style the text
  const text = button.querySelector('.run-text') as HTMLElement;
  if (text) {
    text.style.cssText = `
      position: relative;
      z-index: 1;
    `;
  }

  // Click handler
  button.addEventListener('click', async (e) => {
    if (button.hasAttribute('disabled')) return;
    
    // Create ripple effect
    createRipple(e, rippleContainer);
    
    const fileRunner = (window as any).fileRunner;
    if (fileRunner?.runCurrentFile) {
      await fileRunner.runCurrentFile();
    } else {
      showError('File runner not initialized');
      console.error('❌ fileRunner not found on window object');
    }
  });

  // Hover effect
  button.addEventListener('mouseenter', () => {
    if (!button.hasAttribute('disabled')) {
      button.style.background = 'linear-gradient(135deg, #45a049, #4CAF50)';
      button.style.transform = 'translateY(-1px) scale(1.02)';
      button.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.4)';
      
      // Animate icon
      const icon = button.querySelector('.run-icon') as HTMLElement;
      if (icon) {
        icon.style.transform = 'scale(1.2)';
      }
    }
  });

  button.addEventListener('mouseleave', () => {
    if (!button.hasAttribute('disabled')) {
      button.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
      button.style.transform = 'translateY(0) scale(1)';
      button.style.boxShadow = '0 2px 8px rgba(76, 175, 80, 0.3)';
      
      // Reset icon
      const icon = button.querySelector('.run-icon') as HTMLElement;
      if (icon) {
        icon.style.transform = 'scale(1)';
      }
    }
  });

  // Active effect (mouse down)
  button.addEventListener('mousedown', () => {
    if (!button.hasAttribute('disabled')) {
      button.style.transform = 'translateY(0) scale(0.98)';
      button.style.boxShadow = '0 1px 4px rgba(76, 175, 80, 0.3)';
    }
  });

  // Mouse up effect
  button.addEventListener('mouseup', () => {
    if (!button.hasAttribute('disabled')) {
      button.style.transform = 'translateY(-1px) scale(1.02)';
      button.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.4)';
    }
  });

  return button;
}

/**
 * Create ripple effect on click
 */
function createRipple(event: MouseEvent, container: HTMLElement): void {
  const button = event.currentTarget as HTMLElement;
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  const ripple = document.createElement('span');
  ripple.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    left: ${x}px;
    top: ${y}px;
    animation: ripple-animation 0.6s ease-out;
    pointer-events: none;
  `;

  container.appendChild(ripple);

  // Remove ripple after animation
  setTimeout(() => {
    ripple.remove();
  }, 600);
}

/**
 * Setup F5 keyboard shortcut
 */
function setupKeyboardShortcut(): void {
  document.addEventListener('keydown', (e) => {
    // F5 - Run current file
    if (e.key === 'F5') {
      e.preventDefault();
      e.stopPropagation();
      
      const runButton = document.getElementById('run-button') as HTMLButtonElement;
      if (runButton && !runButton.hasAttribute('disabled')) {
        console.log('⌨️ F5 pressed - Running file...');
        runButton.click();
      } else {
        console.log('⚠️ F5 pressed but button is disabled or not found');
      }
    }
  });

  console.log('⌨️ Run button keyboard shortcut enabled (F5)');
}

/**
 * Update button state
 */
export function updateRunButtonState(state: 'idle' | 'running' | 'success' | 'error'): void {
  const button = document.getElementById('run-button');
  if (!button) return;

  const icon = button.querySelector('.run-icon') as HTMLElement;
  const text = button.querySelector('.run-text') as HTMLElement;

  switch (state) {
    case 'running':
      button.setAttribute('disabled', 'true');
      button.style.background = 'linear-gradient(135deg, #757575, #616161)';
      button.style.cursor = 'not-allowed';
      button.style.opacity = '0.7';
      if (icon) icon.textContent = '⏳';
      if (text) text.textContent = 'Running...';
      break;

    case 'success':
      button.removeAttribute('disabled');
      button.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
      button.style.cursor = 'pointer';
      button.style.opacity = '1';
      if (icon) icon.textContent = '✓';
      if (text) text.textContent = 'Success';
      
      // Reset to normal after 2 seconds
      setTimeout(() => {
        if (icon) icon.textContent = '▶';
        if (text) text.textContent = 'Run';
      }, 2000);
      break;

    case 'error':
      button.removeAttribute('disabled');
      button.style.background = 'linear-gradient(135deg, #f44336, #e53935)';
      button.style.cursor = 'pointer';
      button.style.opacity = '1';
      if (icon) icon.textContent = '✗';
      if (text) text.textContent = 'Error';
      
      // Reset to normal after 2 seconds
      setTimeout(() => {
        button.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
        if (icon) icon.textContent = '▶';
        if (text) text.textContent = 'Run';
      }, 2000);
      break;

    case 'idle':
    default:
      button.removeAttribute('disabled');
      button.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
      button.style.cursor = 'pointer';
      button.style.opacity = '1';
      if (icon) icon.textContent = '▶';
      if (text) text.textContent = 'Run';
      break;
  }
}

/**
 * Show error notification
 */
function showError(message: string): void {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 6px;
    background: linear-gradient(135deg, #f44336, #e53935);
    color: white;
    font-size: 13px;
    z-index: 10001;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    animation: slideIn 0.3s ease-out;
    max-width: 350px;
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Show success notification
 */
export function showSuccess(message: string): void {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 6px;
    background: linear-gradient(135deg, #4CAF50, #45a049);
    color: white;
    font-size: 13px;
    z-index: 10001;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    animation: slideIn 0.3s ease-out;
    max-width: 350px;
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Initialize everything
 */
export function initializeRunButtonSystem(): void {
  console.log('🚀 Initializing Run Button System...');
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRunButton);
  } else {
    initializeRunButton();
  }
  
  console.log('✅ Run Button System initialized');
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }

  @keyframes ripple-animation {
    from {
      transform: scale(0);
      opacity: 1;
    }
    to {
      transform: scale(2);
      opacity: 0;
    }
  }

  /* Run button hover glow effect */
  .run-button:not([disabled]):hover::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(135deg, #4CAF50, #45a049);
    border-radius: 8px;
    opacity: 0.3;
    filter: blur(8px);
    z-index: -1;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.3;
    }
    50% {
      opacity: 0.6;
    }
  }

  /* Focus styles for accessibility */
  .run-button:focus {
    outline: 2px solid #4CAF50;
    outline-offset: 2px;
  }

  .run-button:focus:not(:focus-visible) {
    outline: none;
  }

  /* Disabled state */
  .run-button[disabled] {
    cursor: not-allowed !important;
    opacity: 0.7 !important;
  }

  .run-button[disabled]:hover {
    transform: none !important;
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3) !important;
  }
`;
document.head.appendChild(style);

// Make functions available globally
if (typeof window !== 'undefined') {
  (window as any).runButton = {
    initialize: initializeRunButtonSystem,
    updateState: updateRunButtonState,
    showSuccess: showSuccess,
  };
}

// Auto-initialize - DISABLED
/*
setTimeout(() => {
  initializeRunButtonSystem();
}, 500);
*/

console.log('🎮 Run Button module loaded');