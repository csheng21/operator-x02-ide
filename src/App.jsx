// app.jsx - Main React Application Component with Cleanup Management
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import { openFolderWithQuickAccess } from './quickAccessIntegration';
// ================================
// CLEANUP MANAGER
// ================================
class CleanupManager {
  constructor() {
    this.cleanupTasks = [];
    this.intervals = new Set();
    this.timeouts = new Set();
    this.eventListeners = [];
    this.isCleaningUp = false;
  }

  register(task) {
    this.cleanupTasks.push(task);
  }

  registerInterval(id) {
    this.intervals.add(id);
    return id;
  }

  registerTimeout(id) {
    this.timeouts.add(id);
    return id;
  }

  registerEventListener(element, type, listener, options) {
    this.eventListeners.push({ element, type, listener, options });
    element.addEventListener(type, listener, options);
  }

  cleanup() {
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;

    console.log('🧹 Starting cleanup process...');

    // Clear all intervals
    this.intervals.forEach(id => clearInterval(id));
    this.intervals.clear();

    // Clear all timeouts
    this.timeouts.forEach(id => clearTimeout(id));
    this.timeouts.clear();

    // Remove all event listeners
    this.eventListeners.forEach(({ element, type, listener, options }) => {
      try {
        element.removeEventListener(type, listener, options);
      } catch (error) {
        console.error('Failed to remove event listener:', error);
      }
    });
    this.eventListeners = [];

    // Run registered cleanup tasks
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('Cleanup task failed:', error);
      }
    });
    this.cleanupTasks = [];

    console.log('✅ Cleanup complete');
    this.isCleaningUp = false;
  }

  clearAllTimers() {
    // Nuclear option - clear all timers in the browser
    const maxId = setTimeout(() => {}, 0);
    for (let i = 0; i < maxId; i++) {
      clearInterval(i);
      clearTimeout(i);
    }
  }
}

const cleanupManager = new CleanupManager();

// ================================
// MAIN APPLICATION COMPONENT
// ================================
function App() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ideReady, setIdeReady] = useState(false);
  const initializationRef = useRef(false);
  const mountedRef = useRef(true);

  // ================================
  // INITIALIZATION FUNCTIONS
  // ================================
  
  const cleanupExistingInstances = useCallback(() => {
    console.log('🧹 Cleaning up existing instances...');
    
    // Dispose Monaco editors
    if (window.monaco?.editor) {
      const editors = window.monaco.editor.getEditors?.() || [];
      editors.forEach(editor => {
        try {
          editor.dispose();
          console.log('Disposed Monaco editor instance');
        } catch (e) {
          console.error('Failed to dispose editor:', e);
        }
      });
    }

    // Clean up tab manager
    if (window.tabManager) {
      window.tabManager.cleanup?.();
      delete window.tabManager;
    }

    // Clean up file system managers
    if (window.fileSystem) {
      window.fileSystem.integratedFolderManager?.cleanup?.();
      window.fileSystem.contextMenuManager?.cleanup?.();
    }

    // Clean up other managers
    ['explorerFilter', 'folderToggle', 'breadcrumbManager', 'terminalManager'].forEach(manager => {
      if (window[manager]?.cleanup) {
        window[manager].cleanup();
        delete window[manager];
      }
    });

    // Clear all existing timers
    cleanupManager.clearAllTimers();
    
    console.log('✅ Cleanup of existing instances complete');
  }, []);

  const checkLayoutReady = useCallback(() => {
    console.log('🔍 Checking if layout is ready...');
    
    const requiredElements = [
      'editor-container',
      'file-explorer',
      'terminal-container',
      'assistant-container'
    ];

    const allElementsPresent = requiredElements.every(id => {
      const element = document.getElementById(id);
      if (!element) {
        console.warn(`Required element not found: ${id}`);
      }
      return element !== null;
    });

    if (allElementsPresent) {
      console.log('✅ All layout elements are ready');
      setIdeReady(true);
    } else {
      console.log('⏳ Layout not ready, waiting...');
      const checkInterval = cleanupManager.registerInterval(
        setInterval(() => {
          const ready = requiredElements.every(id => 
            document.getElementById(id) !== null
          );
          if (ready) {
            console.log('✅ Layout elements now ready');
            clearInterval(checkInterval);
            setIdeReady(true);
          }
        }, 500)
      );
    }
  }, []);

  const setupGlobalDragAndDrop = useCallback(() => {
    console.log('🎯 Setting up global drag and drop...');
    
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Add visual feedback
      if (!document.body.classList.contains('dragging-over')) {
        document.body.classList.add('dragging-over');
      }
    };

    const handleDragLeave = (e) => {
      if (e.target === document.body || !document.body.contains(e.relatedTarget)) {
        document.body.classList.remove('dragging-over');
      }
    };

    const handleDrop = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.body.classList.remove('dragging-over');

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      console.log(`📁 Dropped ${files.length} file(s)`);
      
      // Handle dropped files
      for (const file of files) {
        try {
          if (file.type.startsWith('text/') || 
              file.name.match(/\.(txt|js|ts|jsx|tsx|json|html|css|md|py|java|cpp|c|rs|go)$/i)) {
            
            const content = await file.text();
            console.log(`📄 Read file: ${file.name} (${content.length} chars)`);
            
            // Open in editor
            if (window.tabManager?.openFile) {
              window.tabManager.openFile(file.name, content);
            } else {
              console.warn('Tab manager not available');
            }
          } else if (file.type.startsWith('image/')) {
            console.log(`🖼️ Image file: ${file.name}`);
            // Handle image files if needed
          } else {
            console.log(`📦 Other file type: ${file.name} (${file.type})`);
          }
        } catch (error) {
          console.error(`Failed to process file ${file.name}:`, error);
        }
      }
    };

    // Register event listeners with cleanup manager
    cleanupManager.registerEventListener(document.body, 'dragover', handleDragOver);
    cleanupManager.registerEventListener(document.body, 'dragleave', handleDragLeave);
    cleanupManager.registerEventListener(document.body, 'drop', handleDrop);
    
    // Prevent default browser behavior for drag and drop
    cleanupManager.registerEventListener(window, 'dragover', (e) => e.preventDefault());
    cleanupManager.registerEventListener(window, 'drop', (e) => e.preventDefault());
    
    console.log('✅ Global drag and drop setup complete');
  }, []);

  const setupKeyboardShortcuts = useCallback(() => {
    if (window.__keyboardShortcutsSetup) {
      console.log('⚠️ Keyboard shortcuts already setup, skipping...');
      return;
    }
    
    console.log('⌨️ Setting up keyboard shortcuts...');
    
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      
      // Ctrl/Cmd + S: Save file
      if (ctrlOrCmd && e.key === 's') {
        e.preventDefault();
        console.log('💾 Save shortcut triggered');
        if (window.tabManager?.saveCurrentFile) {
          window.tabManager.saveCurrentFile();
        }
      }
      
      // Ctrl/Cmd + O: Open file
      if (ctrlOrCmd && e.key === 'o') {
        e.preventDefault();
        console.log('📂 Open file shortcut triggered');
        if (window.fileSystem?.openFileDialog) {
          window.fileSystem.openFileDialog();
        }
      }
      
      // Ctrl/Cmd + N: New file
      if (ctrlOrCmd && e.key === 'n') {
        e.preventDefault();
        console.log('📄 New file shortcut triggered');
        if (window.tabManager?.createNewFile) {
          window.tabManager.createNewFile();
        }
      }
      
      // Ctrl/Cmd + W: Close tab
      if (ctrlOrCmd && e.key === 'w') {
        e.preventDefault();
        console.log('❌ Close tab shortcut triggered');
        if (window.tabManager?.closeCurrentTab) {
          window.tabManager.closeCurrentTab();
        }
      }
      
      // Ctrl/Cmd + Shift + S: Save As
      if (ctrlOrCmd && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        console.log('💾 Save As shortcut triggered');
        if (window.tabManager?.saveCurrentFileAs) {
          window.tabManager.saveCurrentFileAs();
        }
      }
      
      // F5: Run/Execute
      if (e.key === 'F5') {
        e.preventDefault();
        console.log('▶️ Run shortcut triggered');
        if (window.executeCurrentFile) {
          window.executeCurrentFile();
        }
      }
      
      // Ctrl/Cmd + /: Toggle comment
      if (ctrlOrCmd && e.key === '/') {
        // Let Monaco handle this
      }
      
      // Ctrl/Cmd + F: Find
      if (ctrlOrCmd && e.key === 'f') {
        // Let Monaco handle this
      }
      
      // Ctrl/Cmd + H: Replace
      if (ctrlOrCmd && e.key === 'h') {
        // Let Monaco handle this
      }
    };
    
    cleanupManager.registerEventListener(document, 'keydown', handleKeyDown);
    window.__keyboardShortcutsSetup = true;
    
    cleanupManager.register(() => {
      window.__keyboardShortcutsSetup = false;
    });
    
    console.log('✅ Keyboard shortcuts setup complete');
  }, []);

  const setupComprehensiveMenuEventListeners = useCallback(() => {
    if (window.__menuListenersSetup) {
      console.log('⚠️ Menu listeners already setup, skipping...');
      return;
    }
    
    console.log('📋 Setting up menu event listeners...');
    
    // File menu handlers
    const fileMenuHandlers = {
      'new-file': () => window.tabManager?.createNewFile(),
      'open-file': () => window.fileSystem?.openFileDialog(),
      'open-folder': () => openFolderWithQuickAccess(),  
      'save-file': () => window.tabManager?.saveCurrentFile(),
      'save-as': () => window.tabManager?.saveCurrentFileAs(),
      'close-file': () => window.tabManager?.closeCurrentTab(),
      'close-all': () => window.tabManager?.closeAllTabs(),
      'exit': () => window.close()
    };
    
    // Edit menu handlers
    const editMenuHandlers = {
      'undo': () => document.execCommand('undo'),
      'redo': () => document.execCommand('redo'),
      'cut': () => document.execCommand('cut'),
      'copy': () => document.execCommand('copy'),
      'paste': () => document.execCommand('paste'),
      'select-all': () => document.execCommand('selectAll'),
      'find': () => window.monaco?.editor?.getEditors()?.[0]?.trigger('', 'actions.find'),
      'replace': () => window.monaco?.editor?.getEditors()?.[0]?.trigger('', 'editor.action.startFindReplaceAction')
    };
    
    // View menu handlers
    const viewMenuHandlers = {
      'toggle-terminal': () => window.toggleTerminal?.(),
      'toggle-explorer': () => window.toggleExplorer?.(),
      'toggle-assistant': () => window.toggleAssistant?.(),
      'zoom-in': () => window.monaco?.editor?.getEditors()?.[0]?.trigger('', 'editor.action.fontZoomIn'),
      'zoom-out': () => window.monaco?.editor?.getEditors()?.[0]?.trigger('', 'editor.action.fontZoomOut'),
      'zoom-reset': () => window.monaco?.editor?.getEditors()?.[0]?.trigger('', 'editor.action.fontZoomReset'),
      'toggle-sidebar': () => document.body.classList.toggle('sidebar-hidden'),
      'toggle-fullscreen': () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      }
    };
    
    // Tools menu handlers
    const toolsMenuHandlers = {
      'run-file': () => window.executeCurrentFile?.(),
      'open-terminal-here': () => window.openTerminalAtCurrentPath?.(),
      'git-init': () => window.executeCommand?.('git init'),
      'npm-install': () => window.executeCommand?.('npm install'),
      'format-document': () => window.monaco?.editor?.getEditors()?.[0]?.trigger('', 'editor.action.formatDocument')
    };
    
    // Setup all menu item listeners
    const setupMenuHandlers = (handlers) => {
      Object.entries(handlers).forEach(([id, handler]) => {
        const element = document.getElementById(id);
        if (element) {
          const clickHandler = (e) => {
            e.preventDefault();
            try {
              handler();
            } catch (error) {
              console.error(`Error in menu handler ${id}:`, error);
            }
          };
          cleanupManager.registerEventListener(element, 'click', clickHandler);
        }
      });
    };
    
    setupMenuHandlers(fileMenuHandlers);
    setupMenuHandlers(editMenuHandlers);
    setupMenuHandlers(viewMenuHandlers);
    setupMenuHandlers(toolsMenuHandlers);
    
    window.__menuListenersSetup = true;
    
    cleanupManager.register(() => {
      window.__menuListenersSetup = false;
    });
    
    console.log('✅ Menu event listeners setup complete');
  }, []);

  const checkExistingProject = useCallback(async () => {
    console.log('🔍 Checking for existing project...');
    
    try {
      // Check localStorage for last opened project
      const lastProjectPath = localStorage.getItem('lastProjectPath');
      
      if (lastProjectPath && window.fileSystem?.fileExists) {
        const exists = await window.fileSystem.fileExists(lastProjectPath);
        if (exists) {
          console.log('📂 Found last project:', lastProjectPath);
          
          // Reopen last project
          if (window.fileSystem?.openFolder) {
            const timeout = cleanupManager.registerTimeout(
              setTimeout(() => {
                window.fileSystem.openFolder(lastProjectPath);
              }, 1000)
            );
          }
        }
      }
      
      // Check for recent files
      const recentFiles = JSON.parse(localStorage.getItem('recentFiles') || '[]');
      if (recentFiles.length > 0) {
        console.log('📄 Found recent files:', recentFiles.length);
      }
      
    } catch (error) {
      console.error('Error checking existing project:', error);
    }
  }, []);

  const initializeIDE = useCallback(async () => {
    if (initializationRef.current) {
      console.log('⚠️ IDE already initializing, skipping...');
      return;
    }
    
    initializationRef.current = true;
    
    try {
      console.log('🚀 Starting IDE initialization...');
      setLoading(true);
      setError(null);
      
      // Clean up any existing instances
      cleanupExistingInstances();
      
      // Wait a bit for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if component is still mounted
      if (!mountedRef.current) {
        console.log('Component unmounted, cancelling initialization');
        return;
      }
      
      // Initialize core systems
      checkLayoutReady();
      setupGlobalDragAndDrop();
      setupKeyboardShortcuts();
      setupComprehensiveMenuEventListeners();
      
      // Wait for external scripts to load
      const waitForExternals = async () => {
        const maxAttempts = 20;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
          if (window.monaco && window.tabManager && window.fileSystem) {
            console.log('✅ All external dependencies loaded');
            return true;
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
          
          if (!mountedRef.current) {
            console.log('Component unmounted during wait');
            return false;
          }
        }
        
        console.error('Timeout waiting for external dependencies');
        throw new Error('Failed to load required dependencies');
      };
      
      const depsLoaded = await waitForExternals();
      if (!depsLoaded) return;
      
      // Check for existing project
      await checkExistingProject();
      
      // Setup resize observers
      const resizeObserver = new ResizeObserver(() => {
        if (window.monaco?.editor) {
          const editors = window.monaco.editor.getEditors();
          editors.forEach(editor => editor.layout());
        }
      });
      
      const editorContainer = document.getElementById('editor-container');
      if (editorContainer) {
        resizeObserver.observe(editorContainer);
        cleanupManager.register(() => resizeObserver.disconnect());
      }
      
      // Setup file watchers if available
      if (window.fileSystem?.watchFiles) {
        cleanupManager.register(() => window.fileSystem.unwatchFiles?.());
      }
      
      // Final setup
      console.log('🎉 IDE initialization complete');
      setInitialized(true);
      setLoading(false);
      
      // Show welcome message
      const welcomeTimeout = cleanupManager.registerTimeout(
        setTimeout(() => {
          if (window.showNotification) {
            window.showNotification('AI Code IDE ready!', 'success');
          }
        }, 1000)
      );
      
    } catch (error) {
      console.error('❌ IDE initialization failed:', error);
      setError(error.message);
      setLoading(false);
      initializationRef.current = false;
    }
  }, [cleanupExistingInstances, checkLayoutReady, setupGlobalDragAndDrop, 
      setupKeyboardShortcuts, setupComprehensiveMenuEventListeners, checkExistingProject]);

  // ================================
  // REACT LIFECYCLE
  // ================================
  
  useEffect(() => {
    console.log('🔄 App component mounted');
    mountedRef.current = true;
    
    // Check if already initialized globally
    if (window.__appInitialized) {
      console.log('⚠️ App already initialized globally, cleaning up...');
      cleanupExistingInstances();
      window.__appInitialized = false;
    }
    
    // Initialize IDE
    initializeIDE();
    
    // Mark as globally initialized
    window.__appInitialized = true;
    
    // Cleanup on unmount
    return () => {
      console.log('🔄 App component unmounting...');
      mountedRef.current = false;
      initializationRef.current = false;
      window.__appInitialized = false;
      
      // Run cleanup manager
      cleanupManager.cleanup();
      
      // Clean up global references
      cleanupExistingInstances();
    };
  }, []); // Empty dependency array - run only once
  
  // ================================
  // ERROR BOUNDARY
  // ================================
  
  useEffect(() => {
    const handleError = (event) => {
      console.error('Global error caught:', event.error);
      setError(event.error?.message || 'An unexpected error occurred');
    };
    
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      setError(event.reason?.message || 'An unexpected error occurred');
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  // ================================
  // RENDER
  // ================================
  
  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <div className="loading-text">Initializing AI Code IDE...</div>
        <div className="loading-subtext">Setting up development environment</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="app-error">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Initialization Error</h2>
          <p className="error-message">{error}</p>
          <button 
            className="retry-button"
            onClick={() => {
              setError(null);
              initializationRef.current = false;
              initializeIDE();
            }}
          >
            Retry Initialization
          </button>
        </div>
      </div>
    );
  }
  
  if (!initialized || !ideReady) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <div className="loading-text">Preparing workspace...</div>
      </div>
    );
  }
  
  // Main app content
  return (
    <div className="app-container" data-initialized={initialized}>
      <div className="app-status-bar">
        <span className="status-indicator status-ready">● Ready</span>
        <span className="status-text">AI Code IDE v0.1.0</span>
      </div>
      
      {/* The main IDE layout is handled by the HTML structure */}
      {/* This component mainly manages initialization and state */}
    </div>
  );
}

// ================================
// ERROR BOUNDARY CLASS
// ================================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error">
          <div className="error-container">
            <div className="error-icon">💥</div>
            <h2>Application Error</h2>
            <p className="error-message">
              {this.state.error?.message || 'Something went wrong'}
            </p>
            <button 
              className="retry-button"
              onClick={() => window.location.reload()}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// ================================
// APP INITIALIZATION
// ================================
function initReactApp() {
  console.log('🚀 Initializing React application...');
  
  const container = document.getElementById('react-root');
  if (!container) {
    // Create React root if it doesn't exist
    const root = document.createElement('div');
    root.id = 'react-root';
    document.body.appendChild(root);
  }
  
  const rootElement = document.getElementById('react-root');
  
  // Check if React 18 createRoot is available
  if (ReactDOM.createRoot) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } else {
    // Fallback to React 17 render
    ReactDOM.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>,
      rootElement
    );
  }
  
  console.log('✅ React application initialized');
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initReactApp);
} else {
  initReactApp();
}

// Export for use in other modules if needed
export default App;
export { cleanupManager, ErrorBoundary };