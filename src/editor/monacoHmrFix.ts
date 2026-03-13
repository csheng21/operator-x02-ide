// src/editor/monacoHmrFix.ts
// ============================================================================
// FIX: Monaco "InstantiationService has been disposed" error
// This happens during HMR when Monaco services are disposed but handlers remain
// ============================================================================

console.log('🔧 [MonacoHMR] Loading Monaco HMR fix...');

// ============================================================================
// PART 1: ERROR SUPPRESSION & FALLBACK CONTEXT MENU
// ============================================================================

// Track if we've shown the fallback menu recently (prevent spam)
let lastFallbackTime = 0;
const FALLBACK_COOLDOWN = 500; // ms

/**
 * Show a fallback context menu when Monaco's fails
 */
function showFallbackContextMenu(x: number, y: number): void {
  // Prevent spam
  const now = Date.now();
  if (now - lastFallbackTime < FALLBACK_COOLDOWN) return;
  lastFallbackTime = now;
  
  console.log('🔧 [MonacoHMR] Showing fallback context menu');
  
  // Remove any existing fallback menus
  document.querySelectorAll('.monaco-fallback-context-menu').forEach(m => m.remove());
  
  // Get current editor
  const editor = (window as any).monaco?.editor?.getEditors()?.[0];
  
  const menu = document.createElement('div');
  menu.className = 'monaco-fallback-context-menu';
  menu.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    background: #252526;
    border: 1px solid #454545;
    border-radius: 6px;
    padding: 4px 0;
    min-width: 220px;
    z-index: 10000;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    animation: menuFadeIn 0.15s ease;
  `;
  
  // Add animation style
  if (!document.getElementById('monaco-fallback-styles')) {
    const style = document.createElement('style');
    style.id = 'monaco-fallback-styles';
    style.textContent = `
      @keyframes menuFadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      .monaco-fallback-context-menu .menu-item {
        display: flex;
        justify-content: space-between;
        padding: 6px 12px;
        cursor: pointer;
        color: #ccc;
        transition: background 0.1s;
      }
      .monaco-fallback-context-menu .menu-item:hover {
        background: #094771;
        color: #fff;
      }
      .monaco-fallback-context-menu .menu-item .shortcut {
        color: #888;
        font-size: 11px;
        margin-left: 20px;
      }
      .monaco-fallback-context-menu .menu-divider {
        height: 1px;
        background: #454545;
        margin: 4px 8px;
      }
      .monaco-fallback-context-menu .menu-item.danger:hover {
        background: rgba(244, 67, 54, 0.2);
        color: #f44336;
      }
    `;
    document.head.appendChild(style);
  }
  
  const items = [
    { label: 'Cut', shortcut: 'Ctrl+X', action: () => document.execCommand('cut') },
    { label: 'Copy', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
    { label: 'Paste', shortcut: 'Ctrl+V', action: () => navigator.clipboard.readText().then(text => {
      if (editor) {
        const selection = editor.getSelection();
        if (selection) {
          editor.executeEdits('paste', [{
            range: selection,
            text: text,
            forceMoveMarkers: true
          }]);
        }
      }
    })},
    { divider: true },
    { label: 'Select All', shortcut: 'Ctrl+A', action: () => {
      if (editor) {
        const model = editor.getModel();
        if (model) {
          editor.setSelection(model.getFullModelRange());
        }
      }
    }},
    { divider: true },
    { label: 'Go to Definition', shortcut: 'F12', action: () => editor?.trigger('contextmenu', 'editor.action.revealDefinition', null) },
    { label: 'Go to References', shortcut: 'Shift+F12', action: () => editor?.trigger('contextmenu', 'editor.action.goToReferences', null) },
    { label: 'Rename Symbol', shortcut: 'F2', action: () => editor?.trigger('contextmenu', 'editor.action.rename', null) },
    { divider: true },
    { label: 'Format Document', shortcut: 'Shift+Alt+F', action: () => editor?.trigger('contextmenu', 'editor.action.formatDocument', null) },
    { label: 'Command Palette', shortcut: 'F1', action: () => editor?.trigger('contextmenu', 'editor.action.quickCommand', null) },
  ];
  
  items.forEach(item => {
    if (item.divider) {
      const div = document.createElement('div');
      div.className = 'menu-divider';
      menu.appendChild(div);
    } else {
      const menuItem = document.createElement('div');
      menuItem.className = 'menu-item';
      menuItem.innerHTML = `
        <span>${item.label}</span>
        <span class="shortcut">${item.shortcut || ''}</span>
      `;
      menuItem.addEventListener('click', () => {
        menu.remove();
        try {
          item.action?.();
        } catch (e) {
          console.warn('Action failed:', e);
        }
      });
      menu.appendChild(menuItem);
    }
  });
  
  document.body.appendChild(menu);
  
  // Adjust position if off-screen
  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${window.innerHeight - rect.height - 10}px`;
    }
  });
  
  // Close handlers
  const closeMenu = () => {
    menu.remove();
    document.removeEventListener('click', clickHandler);
    document.removeEventListener('keydown', keyHandler);
    document.removeEventListener('contextmenu', contextHandler);
  };
  
  const clickHandler = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node)) closeMenu();
  };
  
  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeMenu();
  };
  
  const contextHandler = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node)) closeMenu();
  };
  
  setTimeout(() => {
    document.addEventListener('click', clickHandler);
    document.addEventListener('keydown', keyHandler);
    document.addEventListener('contextmenu', contextHandler);
  }, 10);
}

// ============================================================================
// PART 2: ERROR INTERCEPTION
// ============================================================================

// Store last right-click position for fallback
let lastContextMenuX = 0;
let lastContextMenuY = 0;

// Intercept context menu events on Monaco to capture position
document.addEventListener('contextmenu', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('.monaco-editor')) {
    lastContextMenuX = e.clientX;
    lastContextMenuY = e.clientY;
  }
}, true);

// Override window.onerror to catch the InstantiationService error
const originalOnError = window.onerror;
window.onerror = function(message, source, lineno, colno, error) {
  // Check if it's the InstantiationService error
  if (
    (typeof message === 'string' && message.includes('InstantiationService has been disposed')) ||
    (error?.message?.includes('InstantiationService has been disposed'))
  ) {
    console.warn('🔧 [MonacoHMR] Caught InstantiationService error, showing fallback menu');
    
    // Show fallback context menu at last known position
    if (lastContextMenuX && lastContextMenuY) {
      showFallbackContextMenu(lastContextMenuX, lastContextMenuY);
    }
    
    return true; // Suppress the error
  }
  
  // Call original handler for other errors
  return originalOnError ? originalOnError.call(this, message, source, lineno, colno, error) : false;
};

// Also catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('InstantiationService has been disposed')) {
    console.warn('🔧 [MonacoHMR] Suppressed InstantiationService promise rejection');
    event.preventDefault();
    
    if (lastContextMenuX && lastContextMenuY) {
      showFallbackContextMenu(lastContextMenuX, lastContextMenuY);
    }
  }
});

// ============================================================================
// PART 3: PROACTIVE EDITOR RECREATION
// ============================================================================

/**
 * Check if Monaco editor services are still alive
 */
function isMonacoHealthy(): boolean {
  try {
    const editors = (window as any).monaco?.editor?.getEditors();
    if (!editors || editors.length === 0) return true; // No editors = nothing to check
    
    const editor = editors[0];
    // Try to access a service that would fail if disposed
    const model = editor.getModel();
    return !!model;
  } catch (e) {
    return false;
  }
}

/**
 * Attempt to recreate Monaco editor
 */
async function recreateMonacoEditor(): Promise<void> {
  console.log('🔧 [MonacoHMR] Attempting to recreate Monaco editor...');
  
  try {
    const monaco = (window as any).monaco;
    if (!monaco) {
      console.error('Monaco not available');
      return;
    }
    
    // Get container
    const container = document.getElementById('monaco-editor');
    if (!container) {
      console.error('Editor container not found');
      return;
    }
    
    // Get current state
    const editors = monaco.editor.getEditors();
    let currentContent = '';
    let currentLanguage = 'typescript';
    let currentPath = '';
    let viewState = null;
    
    if (editors.length > 0) {
      const editor = editors[0];
      try {
        const model = editor.getModel();
        if (model) {
          currentContent = model.getValue();
          currentLanguage = model.getLanguageId();
          currentPath = model.uri?.path || '';
        }
        viewState = editor.saveViewState();
      } catch (e) {
        console.warn('Could not save editor state:', e);
      }
      
      // Dispose old editor
      try {
        editor.dispose();
      } catch (e) {
        console.warn('Error disposing old editor:', e);
      }
    }
    
    // Clear container
    container.innerHTML = '';
    
    // Create new editor
    const newEditor = monaco.editor.create(container, {
      value: currentContent || '// Editor recreated\n// Your content should be preserved',
      language: currentLanguage,
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      renderLineHighlight: 'all',
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 14,
      tabSize: 2,
      lineNumbers: 'on',
      wordWrap: 'on'
    });
    
    // Restore view state
    if (viewState) {
      try {
        newEditor.restoreViewState(viewState);
      } catch (e) {
        console.warn('Could not restore view state:', e);
      }
    }
    
    // Update global reference
    if ((window as any).editorManager) {
      // Note: This depends on your editorManager structure
      // You may need to adjust based on how your editor is exposed
    }
    
    console.log('✅ [MonacoHMR] Editor recreated successfully');
    
    // Show notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(76, 175, 80, 0.9);
      color: white;
      padding: 10px 20px;
      border-radius: 6px;
      z-index: 10000;
      font-size: 13px;
      animation: fadeIn 0.3s ease;
    `;
    toast.textContent = '✅ Editor recovered';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
    
  } catch (e) {
    console.error('🔧 [MonacoHMR] Failed to recreate editor:', e);
  }
}

// ============================================================================
// PART 4: HMR INTEGRATION
// ============================================================================

// Properly dispose Monaco on HMR
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    console.log('🔧 [MonacoHMR] HMR dispose - cleaning up Monaco...');
    
    try {
      const monaco = (window as any).monaco;
      if (monaco) {
        // Dispose all editors
        const editors = monaco.editor.getEditors();
        editors.forEach((editor: any) => {
          try {
            editor.dispose();
          } catch (e) {
            console.warn('Error disposing editor:', e);
          }
        });
        
        // Dispose all models
        const models = monaco.editor.getModels();
        models.forEach((model: any) => {
          try {
            model.dispose();
          } catch (e) {
            console.warn('Error disposing model:', e);
          }
        });
        
        console.log(`✅ [MonacoHMR] Disposed ${editors.length} editors and ${models.length} models`);
      }
    } catch (e) {
      console.error('Error during Monaco cleanup:', e);
    }
  });
  
  import.meta.hot.accept(() => {
    console.log('🔧 [MonacoHMR] HMR accept - module updated');
  });
}

// ============================================================================
// PART 5: HEALTH CHECK & AUTO-RECOVERY
// ============================================================================

let consecutiveFailures = 0;
const MAX_FAILURES = 3;

// Periodic health check
setInterval(() => {
  if (!isMonacoHealthy()) {
    consecutiveFailures++;
    console.warn(`🔧 [MonacoHMR] Monaco unhealthy (${consecutiveFailures}/${MAX_FAILURES})`);
    
    if (consecutiveFailures >= MAX_FAILURES) {
      console.log('🔧 [MonacoHMR] Too many failures, attempting recovery...');
      recreateMonacoEditor();
      consecutiveFailures = 0;
    }
  } else {
    consecutiveFailures = 0;
  }
}, 5000);

// ============================================================================
// EXPORTS
// ============================================================================

export {
  showFallbackContextMenu,
  isMonacoHealthy,
  recreateMonacoEditor
};

console.log('✅ [MonacoHMR] Monaco HMR fix loaded!');
console.log('   - Fallback context menu enabled');
console.log('   - Error suppression active');
console.log('   - Auto-recovery enabled');
