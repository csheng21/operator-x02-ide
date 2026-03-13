// fileModificationManager.ts
// Complete file modification tracking system with visual feedback

import { markFileAsModified, markFileAsSaved } from '../ide/fileExplorer/fileTreeRenderer';

interface ModificationState {
  path: string;
  isModified: boolean;
  originalContent: string;
  currentContent: string;
  lastModified: Date;
}

class FileModificationManager {
  private modifications: Map<string, ModificationState> = new Map();
  private updateCallbacks: Set<(path: string, isModified: boolean) => void> = new Set();
  
  constructor() {
    this.initialize();
  }

  private initialize(): void {
    console.log('🎯 FileModificationManager initialized');
    
    // Listen for editor changes globally
    this.setupGlobalEditorListener();
    
    // Listen for save events
    this.setupSaveListener();
    
    // Setup periodic sync
    this.setupPeriodicSync();
    
    // Expose globally for debugging
    (window as any).__fileModificationManager = this;
  }

  /**
   * Setup global listener for Monaco editor changes
   */
  private setupGlobalEditorListener(): void {
    // Wait for Monaco to be available
    const checkMonaco = setInterval(() => {
      if ((window as any).monaco?.editor) {
        clearInterval(checkMonaco);
        
        console.log('✅ Monaco editor found, setting up global listener');
        
        // Listen to all editor models
        this.monitorAllEditors();
        
        // Re-check periodically for new editors
        setInterval(() => this.monitorAllEditors(), 2000);
      }
    }, 500);
  }

  /**
   * Monitor all active editors
   */
  private monitorAllEditors(): void {
    const monaco = (window as any).monaco;
    if (!monaco?.editor) return;

    const editors = monaco.editor.getEditors();
    
    editors.forEach((editor: any) => {
      const model = editor.getModel();
      if (!model) return;

      // Get file path from model URI
      const uri = model.uri;
      let filePath = '';
      
      if (uri?.path) {
        filePath = uri.path;
      } else if (uri?._formatted) {
        filePath = uri._formatted;
      } else {
        return; // Can't identify file
      }

      // Normalize path
      filePath = filePath.replace(/^\/([A-Z]:)/, '$1'); // Fix Windows paths
      
      // Check if we're already tracking this
      if (!this.modifications.has(filePath)) {
        console.log('📂 Started tracking:', filePath);
        
        // Initialize tracking
        this.modifications.set(filePath, {
          path: filePath,
          isModified: false,
          originalContent: model.getValue(),
          currentContent: model.getValue(),
          lastModified: new Date()
        });
      }
      
      // Setup change listener if available
      if (typeof model.onDidChangeModelContent === 'function') {
        // Check if already has listener
        const hasListener = (model as any).__changeListenerAttached;
        
        if (!hasListener) {
          model.onDidChangeModelContent(() => {
            this.handleEditorChange(filePath, model);
          });
          
          (model as any).__changeListenerAttached = true;
          console.log('✅ Attached change listener to:', filePath);
        }
      }
    });
  }

  /**
   * Handle editor content change
   */
  private handleEditorChange(filePath: string, model: any): void {
    const currentContent = model.getValue();
    const state = this.modifications.get(filePath);
    
    if (!state) {
      console.warn('No tracking state for:', filePath);
      return;
    }

    const wasModified = state.isModified;
    const isModified = currentContent !== state.originalContent;
    
    // Update state
    state.currentContent = currentContent;
    state.isModified = isModified;
    state.lastModified = new Date();
    
    // Only log and update if state changed
    if (isModified !== wasModified) {
      console.log(`📝 ${isModified ? 'MODIFIED' : 'SAVED'}: ${filePath}`);
      
      // Update file tree
      if (isModified) {
        markFileAsModified(filePath);
      } else {
        markFileAsSaved(filePath);
      }
      
      // Update tab UI
      this.updateTabUI(filePath, isModified);
      
      // Notify callbacks
      this.notifyCallbacks(filePath, isModified);
      
      // Show visual indicator
      this.showModificationIndicator(filePath, isModified);
    }
  }

  /**
   * Update tab UI to show modification state
   */
  private updateTabUI(filePath: string, isModified: boolean): void {
    const fileName = filePath.split(/[\\/]/).pop();
    
    // Find tab element
    const tabs = document.querySelectorAll('.editor-tab');
    
    tabs.forEach(tab => {
      const tabPath = tab.getAttribute('data-path') || 
                     tab.getAttribute('data-full-path');
      
      if (!tabPath) return;
      
      // Normalize paths for comparison
      const normalizedTabPath = tabPath.replace(/\//g, '\\');
      const normalizedFilePath = filePath.replace(/\//g, '\\');
      
      if (normalizedTabPath === normalizedFilePath) {
        if (isModified) {
          tab.classList.add('modified');
          
          // Add modification dot if not exists
          if (!tab.querySelector('.tab-modified-dot')) {
            const dot = document.createElement('span');
            dot.className = 'tab-modified-dot';
            dot.textContent = '●';
            dot.style.cssText = `
              color: #ffa500;
              font-size: 10px;
              margin-left: 6px;
              display: inline-block;
              animation: pulse 2s ease-in-out infinite;
            `;
            
            const tabName = tab.querySelector('.tab-name');
            if (tabName) {
              tabName.appendChild(dot);
            }
          }
          
          // Add pulse animation if not exists
          if (!document.getElementById('tab-pulse-animation')) {
            const style = document.createElement('style');
            style.id = 'tab-pulse-animation';
            style.textContent = `
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
              }
            `;
            document.head.appendChild(style);
          }
          
        } else {
          tab.classList.remove('modified');
          
          // Remove modification dot
          const dot = tab.querySelector('.tab-modified-dot');
          if (dot) {
            dot.remove();
          }
        }
      }
    });
  }

  /**
   * Show visual modification indicator
   */
  private showModificationIndicator(filePath: string, isModified: boolean): void {
    const fileName = filePath.split(/[\\/]/).pop();
    
    // Don't show notification for every change, only state transitions
    if (isModified) {
      this.showNotification(`📝 ${fileName} - Modified`, 'info');
    } else {
      this.showNotification(`💾 ${fileName} - All changes saved`, 'success');
    }
  }

  /**
   * Show a brief notification
   */
  private showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error'): void {
    // Check for global notification function
    const showNotif = (window as any).showNotification;
    if (showNotif) {
      showNotif(message, type);
      return;
    }

    // Fallback: Create our own notification
    const notif = document.createElement('div');
    notif.className = `mod-notification mod-${type}`;
    notif.textContent = message;
    
    const colors = {
      info: '#3498db',
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545'
    };
    
    notif.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 16px;
      background: ${colors[type]};
      color: white;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-size: 13px;
      animation: slideInRight 0.3s ease;
      max-width: 300px;
    `;
    
    // Add animation
    if (!document.getElementById('mod-notification-animations')) {
      const style = document.createElement('style');
      style.id = 'mod-notification-animations';
      style.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
      notif.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notif.remove(), 300);
    }, 2000);
  }

  /**
   * Setup save event listener
   */
  private setupSaveListener(): void {
    document.addEventListener('file-saved', (e: any) => {
      const filePath = e.detail?.path;
      if (filePath) {
        this.markAsSaved(filePath);
      }
    });
  }

  /**
   * Periodic sync to catch any missed changes
   */
  private setupPeriodicSync(): void {
    setInterval(() => {
      this.syncWithEditors();
    }, 3000);
  }

  /**
   * Sync with all active editors
   */
  private syncWithEditors(): void {
    const monaco = (window as any).monaco;
    if (!monaco?.editor) return;

    const editors = monaco.editor.getEditors();
    
    editors.forEach((editor: any) => {
      const model = editor.getModel();
      if (!model) return;

      const uri = model.uri;
      let filePath = uri?.path || uri?._formatted;
      if (!filePath) return;

      filePath = filePath.replace(/^\/([A-Z]:)/, '$1');

      const state = this.modifications.get(filePath);
      if (state) {
        const currentContent = model.getValue();
        const isModified = currentContent !== state.originalContent;
        
        if (isModified !== state.isModified) {
          console.log('🔄 Sync detected state change:', filePath, isModified);
          this.handleEditorChange(filePath, model);
        }
      }
    });
  }

  /**
   * Mark a file as saved
   */
  public markAsSaved(filePath: string): void {
    console.log('💾 Marking as saved:', filePath);
    
    const state = this.modifications.get(filePath);
    if (state) {
      // Get current content from editor
      const monaco = (window as any).monaco;
      if (monaco?.editor) {
        const editors = monaco.editor.getEditors();
        for (const editor of editors) {
          const model = editor.getModel();
          if (model) {
            const uri = model.uri;
            let modelPath = uri?.path || uri?._formatted;
            if (modelPath) {
              modelPath = modelPath.replace(/^\/([A-Z]:)/, '$1');
              if (modelPath.replace(/\//g, '\\') === filePath.replace(/\//g, '\\')) {
                const currentContent = model.getValue();
                state.originalContent = currentContent;
                state.currentContent = currentContent;
                state.isModified = false;
                state.lastModified = new Date();
                
                // Update UI
                markFileAsSaved(filePath);
                this.updateTabUI(filePath, false);
                this.notifyCallbacks(filePath, false);
                
                console.log('✅ File marked as saved:', filePath);
                break;
              }
            }
          }
        }
      }
    }
  }

  /**
   * Get all modified files
   */
  public getModifiedFiles(): string[] {
    const modified: string[] = [];
    
    this.modifications.forEach((state) => {
      if (state.isModified) {
        modified.push(state.path);
      }
    });
    
    return modified;
  }

  /**
   * Check if a file is modified
   */
  public isModified(filePath: string): boolean {
    const state = this.modifications.get(filePath);
    return state?.isModified || false;
  }

  /**
   * Register a callback for modification changes
   */
  public onModificationChange(callback: (path: string, isModified: boolean) => void): void {
    this.updateCallbacks.add(callback);
  }

  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(path: string, isModified: boolean): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(path, isModified);
      } catch (error) {
        console.error('Error in modification callback:', error);
      }
    });
  }

  /**
   * Get modification status
   */
  public getStatus(): any {
    const status = {
      totalTracked: this.modifications.size,
      modified: this.getModifiedFiles(),
      details: Array.from(this.modifications.values()).map(state => ({
        path: state.path,
        isModified: state.isModified,
        lastModified: state.lastModified
      }))
    };
    
    console.table(status.details);
    return status;
  }
}

// Initialize
let fileModificationManager: FileModificationManager | null = null;

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    fileModificationManager = new FileModificationManager();
    console.log('✅ FileModificationManager initialized');
  }, 1000);
});

// Export for use in other modules
export { FileModificationManager, fileModificationManager };