// src/ide/runMenu.ts
// Add Run menu to the menu bar

/**
 * Initialize Run menu in the menu bar
 */
export function initializeRunMenu(): void {
  console.log('🎮 Initializing Run menu...');
  
  // Find the menu bar
  const menuBar = document.querySelector('.menu-bar') || 
                  document.querySelector('nav') ||
                  document.querySelector('[role="menubar"]');
  
  if (!menuBar) {
    console.error('❌ Menu bar not found');
    return;
  }
  
  // Check if Run menu already exists
  if (document.getElementById('run-menu')) {
    console.log('Run menu already exists');
    return;
  }
  
  // Create Run menu
  const runMenu = createRunMenu();
  
  // Find where to insert (usually after "View" or "Plugin" menu)
  const viewMenu = Array.from(menuBar.children).find(el => 
    el.textContent?.toLowerCase().includes('view') ||
    el.textContent?.toLowerCase().includes('plugin')
  );
  
  if (viewMenu && viewMenu.nextSibling) {
    menuBar.insertBefore(runMenu, viewMenu.nextSibling);
  } else {
    menuBar.appendChild(runMenu);
  }
  
  console.log('✅ Run menu added to menu bar');
}
function createRunMenu(): HTMLElement {
  const menuItem = document.createElement('div');
  menuItem.id = 'run-menu';
  menuItem.className = 'menu-item';
  menuItem.style.cssText = `
    position: relative;
    cursor: pointer;
    padding: 8px 12px;
    font-size: 13px;
    color: #cccccc;
    user-select: none;
    transition: background-color 0.2s;
  `;
  
  // Menu label
  const label = document.createElement('span');
  label.textContent = 'Run';
  label.style.cssText = `
    display: flex;
    align-items: center;
    gap: 4px;
  `;
  
  // Add play icon
  const icon = document.createElement('span');
  icon.innerHTML = '▶';
  icon.style.cssText = `
    font-size: 10px;
    color: #4CAF50;
  `;
  
  label.appendChild(icon);
  menuItem.appendChild(label);
  
  // ✅ NEW: Run directly on click (no dropdown)
  menuItem.addEventListener('click', (e) => {
    e.stopPropagation();
    runCurrentFile(); // Execute file directly
  });
  
  // Hover effect
  menuItem.addEventListener('mouseenter', () => {
    menuItem.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  });
  
  menuItem.addEventListener('mouseleave', () => {
    menuItem.style.backgroundColor = 'transparent';
  });
  
  return menuItem;
}
/**
 * Create individual menu option
 */
function createMenuOption(config: {
  label: string;
  icon: string;
  shortcut: string;
  action: () => void;
  color: string;
}): HTMLElement {
  const option = document.createElement('div');
  option.className = 'menu-option';
  option.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    cursor: pointer;
    transition: background-color 0.2s;
    font-size: 13px;
    color: #cccccc;
  `;
  
  // Left side (icon + label)
  const leftSide = document.createElement('div');
  leftSide.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  
  const icon = document.createElement('span');
  icon.textContent = config.icon;
  icon.style.cssText = `
    font-size: 14px;
    color: ${config.color};
    width: 20px;
    text-align: center;
  `;
  
  const label = document.createElement('span');
  label.textContent = config.label;
  
  leftSide.appendChild(icon);
  leftSide.appendChild(label);
  
  // Right side (shortcut)
  const shortcut = document.createElement('span');
  shortcut.textContent = config.shortcut;
  shortcut.style.cssText = `
    font-size: 11px;
    color: #888;
    margin-left: 20px;
  `;
  
  option.appendChild(leftSide);
  if (config.shortcut) {
    option.appendChild(shortcut);
  }
  
  // Click handler
  option.addEventListener('click', (e) => {
    e.stopPropagation();
    config.action();
    // Close dropdown
    const dropdown = option.closest('.menu-dropdown') as HTMLElement;
    if (dropdown) {
      dropdown.style.display = 'none';
    }
  });
  
  // Hover effect
  option.addEventListener('mouseenter', () => {
    option.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  });
  
  option.addEventListener('mouseleave', () => {
    option.style.backgroundColor = 'transparent';
  });
  
  return option;
}

/**
 * Run current file
 * ✅ UPDATED: Now checks if a file is active before running
 */
function runCurrentFile(): void {
  console.log('▶ Run File from menu');
  
  // Check if fileRunner exists
  const fileRunner = (window as any).fileRunner;
  if (!fileRunner) {
    showNotification('File runner not initialized', 'error');
    return;
  }
  
  // ✅ NEW: Check if a file is active
  const tabManager = (window as any).tabManager;
  const activeFile = tabManager?.getCurrentFile?.() || tabManager?.currentFile;
  
  if (!activeFile) {
    showNotification('⚠️ No file open. Please open a file first.', 'warning');
    console.warn('Cannot run: No file is currently active');
    return;
  }
  
  // File is active, run it!
  console.log('Running file:', activeFile.name || activeFile.path);
  fileRunner.runCurrentFile();
}

/**
 * Run in terminal (same as run file, but emphasizes terminal)
 */
function runInTerminal(): void {
  console.log('🖥️ Run in Terminal from menu');
  runCurrentFile();
}

/**
 * Clear terminal
 */
function clearTerminal(): void {
  console.log('🗑️ Clear Terminal from menu');
  const fileRunner = (window as any).fileRunner;
  if (fileRunner?.clearTerminalOutput) {
    fileRunner.clearTerminalOutput();
  } else {
    const terminalOutput = document.getElementById('terminal-output');
    if (terminalOutput) {
      terminalOutput.innerHTML = '';
      showNotification('Terminal cleared', 'success');
    }
  }
}

/**
 * Focus terminal
 */
function focusTerminal(): void {
  console.log('🎯 Focus Terminal from menu');
  
  // Switch to terminal tab if it exists
  const terminalTab = document.querySelector('[data-tab-id="terminal"]') as HTMLElement;
  if (terminalTab && !terminalTab.classList.contains('active')) {
    terminalTab.click();
  }
  
  // Focus terminal input
  setTimeout(() => {
    const terminalInput = document.querySelector('.terminal-input') as HTMLInputElement;
    if (terminalInput) {
      terminalInput.focus();
      showNotification('Terminal focused', 'info');
    }
  }, 100);
}

/**
 * Show run configuration dialog
 */
function showRunConfiguration(): void {
  console.log('⚙️ Show Run Configuration');
  showNotification('Run configuration coming soon!', 'info');
  
  // TODO: Implement run configuration dialog
  // This would allow users to:
  // - Set custom run commands
  // - Configure environment variables
  // - Set working directory
  // - Save run configurations
}

/**
 * Show notification
 * ✅ UPDATED: Now supports 'warning' type with orange color
 */
function showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 6px;
    color: white;
    font-size: 13px;
    z-index: 10001;
    max-width: 350px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    font-family: 'Segoe UI', sans-serif;
    ${type === 'success' ? 
      'background: linear-gradient(135deg, #4CAF50, #45a049);' : 
      type === 'error' ? 
      'background: linear-gradient(135deg, #f44336, #e53935);' : 
      type === 'warning' ? 
      'background: linear-gradient(135deg, #FF9800, #F57C00);' : 
      'background: linear-gradient(135deg, #2196F3, #1976D2);'
    }
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

/**
 * Setup keyboard shortcuts for Run menu
 */
export function setupRunMenuShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // F5 - Run File
    if (e.key === 'F5') {
      e.preventDefault();
      runCurrentFile();
    }
    
    // Ctrl+Shift+R - Run in Terminal
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      runInTerminal();
    }
    
    // Ctrl+Shift+C - Clear Terminal
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      clearTerminal();
    }
    
    // Ctrl+` - Focus Terminal
    if (e.ctrlKey && e.key === '`') {
      e.preventDefault();
      focusTerminal();
    }
  });
  
  console.log('⌨️ Run menu keyboard shortcuts enabled');
  console.log('  F5: Run File');
  console.log('  Ctrl+Shift+R: Run in Terminal');
  console.log('  Ctrl+Shift+C: Clear Terminal');
  console.log('  Ctrl+`: Focus Terminal');
}

/**
 * Initialize everything
 */
export function initializeRunMenuSystem(): void {
  console.log('🚀 Initializing Run Menu System...');
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeRunMenu();
      setupRunMenuShortcuts();
    });
  } else {
    initializeRunMenu();
    setupRunMenuShortcuts();
  }
  
  console.log('✅ Run Menu System initialized');
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).runMenu = {
    initialize: initializeRunMenuSystem,
    runFile: runCurrentFile,
    clearTerminal,
    focusTerminal
  };
}

// Auto-initialize
//setTimeout(() => {
  //initializeRunMenuSystem();
//}, 1000);

console.log('[RunMenu] Module loaded');