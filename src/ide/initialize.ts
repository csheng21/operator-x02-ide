// ide/initialize.ts - Enhanced IDE initialization with modern folder opening

import { initializeEditor } from '../editor/editorManager';
import { initializeFileExplorer } from './fileExplorer';
import { initializeExplorerButtons } from './explorerButtons';

/**
 * Initialize all IDE components and features
 */
export async function initializeIdeComponents(): Promise<void> {
  console.log('🚀 Starting Deepseek IDE initialization...');
  
  try {
    // Show browser compatibility info
    await showBrowserCompatibilityInfo();
    
    // Initialize mock file system with default files
    await initializeDefaultFiles();
    
    // Initialize core components
    await initializeEditorComponent();
    await initializeFileExplorerComponent();
    await initializeExplorerButtonsComponent();
    await initializeOpenFolderHandlers();
    await initializeKeyboardShortcuts();
    await initializeUIEnhancements();
    
    console.log('✅ Deepseek IDE initialization completed successfully');
    
    // Show welcome message
    showWelcomeMessage();
    
  } catch (error) {
    console.error('❌ Error during IDE initialization:', error);
    showInitializationError(error);
  }
}

/**
 * Initialize Monaco Editor
 */
async function initializeEditorComponent(): Promise<void> {
  try {
    console.log('📝 Initializing Monaco Editor...');
    await initializeEditor();
    console.log('✅ Monaco Editor initialized successfully');
  } catch (editorError) {
    console.error('❌ Error initializing editor:', editorError);
    throw new Error(`Editor initialization failed: ${editorError.message}`);
  }
}

/**
 * Initialize File Explorer
 */
async function initializeFileExplorerComponent(): Promise<void> {
  try {
    console.log('📁 Initializing File Explorer...');
    initializeFileExplorer();
    console.log('✅ File Explorer initialized successfully');
  } catch (explorerError) {
    console.error('❌ Error initializing file explorer:', explorerError);
    // File explorer errors are not critical, continue
  }
}

/**
 * Initialize Explorer Buttons
 */
async function initializeExplorerButtonsComponent(): Promise<void> {
  try {
    console.log('🔘 Initializing Explorer Buttons...');
    initializeExplorerButtons();
    console.log('✅ Explorer Buttons initialized successfully');
  } catch (buttonsError) {
    console.error('❌ Error initializing explorer buttons:', buttonsError);
    // Button errors are not critical, continue
  }
}

/**
 * Initialize Open Folder Handlers with enhanced functionality
 */
export async function initializeOpenFolderHandlers(): Promise<void> {
  try {
    console.log('📂 Setting up enhanced folder opening handlers...');
    
    // Set up event listener for Open Folder button in UI
    const openFolderBtn = document.getElementById('open-folder-btn');
    if (openFolderBtn) {
      openFolderBtn.addEventListener('click', async () => {
        try {
          const module = await import('./fileExplorer');
          if (typeof module.openFolder === 'function') {
            await module.openFolder();
          } else {
            console.error('openFolder function not found in fileExplorer module');
          }
        } catch (err) {
          console.error('Failed to import fileExplorer module:', err);
          // Show user-friendly error
          showErrorNotification('Failed to open folder. Please try again.');
        }
      });
      
      console.log('✅ Open Folder button handler attached');
    } else {
      console.warn('⚠️ Open Folder button not found in DOM');
    }
    
    // Set up toolbar buttons if they exist
    setupToolbarButtons();
    
    console.log('✅ Enhanced folder opening handlers initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing open folder handlers:', error);
    throw error;
  }
}

/**
 * Initialize comprehensive keyboard shortcuts
 */
async function initializeKeyboardShortcuts(): Promise<void> {
  try {
    console.log('⌨️ Setting up enhanced keyboard shortcuts...');
    
    document.addEventListener('keydown', async (e) => {
      // Ctrl/Cmd + O for Open Folder
      if ((e.ctrlKey || e.metaKey) && e.key === 'o' && !e.shiftKey) {
        e.preventDefault();
        try {
          const module = await import('./fileExplorer');
          if (typeof module.openFolder === 'function') {
            await module.openFolder();
          }
        } catch (err) {
          console.error('Failed to open folder via shortcut:', err);
          showErrorNotification('Failed to open folder via keyboard shortcut.');
        }
      }
      
      // Ctrl/Cmd + Shift + O for Open File
      if ((e.ctrlKey || e.metaKey) && e.key === 'o' && e.shiftKey) {
        e.preventDefault();
        try {
          const module = await import('../fileOperations/openHandler');
          if (typeof module.openFile === 'function') {
            await module.openFile();
          }
        } catch (err) {
          console.error('Failed to open file via shortcut:', err);
        }
      }
      
      // Ctrl/Cmd + N for New File
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        try {
          const module = await import('../fileOperations/createFileWithDialog');
          if (typeof module.createNewFile === 'function') {
            await module.createNewFile();
          }
        } catch (err) {
          console.error('Failed to create new file via shortcut:', err);
        }
      }
      
      // Ctrl/Cmd + S for Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        try {
          const module = await import('../fileOperations/saveHandler');
          if (typeof module.saveFile === 'function') {
            await module.saveFile();
          }
        } catch (err) {
          console.error('Failed to save via shortcut:', err);
        }
      }
      
      // Ctrl/Cmd + Shift + W to Close Project
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'w') {
        e.preventDefault();
        try {
          const module = await import('./fileExplorer');
          if (typeof module.closeProject === 'function') {
            module.closeProject();
          }
        } catch (err) {
          console.error('Failed to close project via shortcut:', err);
        }
      }
    });
    
    console.log('✅ Enhanced keyboard shortcuts initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing keyboard shortcuts:', error);
  }
}

/**
 * Initialize UI enhancements
 */
async function initializeUIEnhancements(): Promise<void> {
  try {
    console.log('🎨 Initializing UI enhancements...');
    
    // Add modern drag and drop styling
    addGlobalDragDropStyles();
    
    // Initialize tooltips
    initializeTooltips();
    
    // Set up theme detection
    setupThemeDetection();
    
    console.log('✅ UI enhancements initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing UI enhancements:', error);
  }
}

/**
 * Set up additional toolbar buttons
 */
function setupToolbarButtons(): void {
  // Add handlers for any additional toolbar buttons
  const toolbarButtons = document.querySelectorAll('.toolbar-button');
  
  toolbarButtons.forEach(button => {
    if (!button.hasAttribute('data-initialized')) {
      button.setAttribute('data-initialized', 'true');
      
      // Add hover effects
      button.addEventListener('mouseenter', () => {
        button.style.opacity = '0.8';
        button.style.transform = 'translateY(-1px)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.opacity = '1';
        button.style.transform = 'translateY(0)';
      });
    }
  });
}

/**
 * Show browser compatibility info
 */
async function showBrowserCompatibilityInfo(): Promise<void> {
  try {
    const { showBrowserCompatibilityInfo } = await import('../utils/browserUtils');
    showBrowserCompatibilityInfo();
  } catch (error) {
    console.warn('Could not load browser utils:', error);
  }
}

/**
 * Initialize default files
 */
async function initializeDefaultFiles(): Promise<void> {
  try {
    const { initializeDefaultFiles } = await import('../utils/mockFileSystem');
    initializeDefaultFiles();
  } catch (error) {
    console.warn('Could not initialize default files:', error);
  }
}

/**
 * Add global drag and drop styles
 */
function addGlobalDragDropStyles(): void {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    .drag-active {
      position: relative;
    }
    
    .drag-active::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(74, 158, 255, 0.1);
      border: 4px dashed #4a9eff;
      z-index: 9999;
      pointer-events: none;
    }
    
    .toolbar-button {
      transition: all 0.3s ease;
    }
    
    .notification {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  `;
  
  document.head.appendChild(styleSheet);
}

/**
 * Initialize tooltips
 */
function initializeTooltips(): void {
  const elementsWithTooltips = document.querySelectorAll('[title]');
  
  elementsWithTooltips.forEach(element => {
    element.addEventListener('mouseenter', (e) => {
      const title = element.getAttribute('title');
      if (title) {
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = title;
        tooltip.style.cssText = `
          position: absolute;
          background: #333;
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 10000;
          pointer-events: none;
          white-space: nowrap;
        `;
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.bottom + 5) + 'px';
        
        // Store reference for cleanup
        element._tooltip = tooltip;
      }
    });
    
    element.addEventListener('mouseleave', () => {
      if (element._tooltip) {
        document.body.removeChild(element._tooltip);
        delete element._tooltip;
      }
    });
  });
}

/**
 * Set up theme detection
 */
function setupThemeDetection(): void {
  // Detect system theme preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  
  function updateTheme(e: MediaQueryListEvent | MediaQueryList) {
    document.body.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  }
  
  // Set initial theme
  updateTheme(prefersDark);
  
  // Listen for changes
  prefersDark.addEventListener('change', updateTheme);
}

/**
 * Show error notification
 */
function showErrorNotification(message: string): void {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff4444;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10001;
    max-width: 400px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 4000);
}

/**
 * Show welcome message
 */
function showWelcomeMessage(): void {
  console.log('🎉 Welcome to Deepseek IDE!');
  console.log('💡 Tips:');
  console.log('  • Press Ctrl/Cmd+O to open a folder');
  console.log('  • Drag and drop folders into the IDE');
  console.log('  • Use the AI assistant for coding help');
  console.log('  • Check out the example files in the mock file system');
}

/**
 * Show initialization error
 */
function showInitializationError(error: any): void {
  console.error('Initialization failed:', error);
  
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #ff4444;
    color: white;
    padding: 24px;
    border-radius: 8px;
    text-align: center;
    z-index: 10000;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  `;
  errorDiv.innerHTML = `
    <h3>Initialization Error</h3>
    <p>Failed to initialize Deepseek IDE.</p>
    <p style="font-size: 12px; opacity: 0.8;">${error.message}</p>
    <button onclick="location.reload()" style="
      background: white;
      color: #ff4444;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 16px;
    ">Reload Page</button>
  `;
  
  document.body.appendChild(errorDiv);
}