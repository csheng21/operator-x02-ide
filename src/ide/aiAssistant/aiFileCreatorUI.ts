// ============================================================================
// FILE: src/ide/aiAssistant/aiFileCreatorUI.ts
// PURPOSE: UI for AI File Creator - Modal Dialog
// ============================================================================

import { aiFileCreator, createFilesWithAI } from './aiFileCreator';
import { showNotification } from './notificationManager';

// ============================================================================
// MAIN UI CLASS
// ============================================================================

export class AIFileCreatorUI {
  private modal: HTMLElement | null = null;
  private isVisible: boolean = false;
  
  /**
   * Initialize the UI
   */
  public initialize(): void {
    console.log('🎨 Initializing AI File Creator UI');
    this.injectStyles();
    this.setupGlobalShortcut();
  }
  
  /**
   * Show the file creation dialog
   */
  public show(): void {
    if (this.isVisible) {
      console.warn('⚠️ Modal already visible');
      return;
    }
    
    // Remove any existing modals first (cleanup)
    const existingModal = document.querySelector('.ai-file-creator-modal');
    if (existingModal) {
      existingModal.remove();
      console.log('🧹 Cleaned up existing modal');
    }
    
    this.modal = this.createModal();
    document.body.appendChild(this.modal);
    this.isVisible = true;
    
    // Focus the input
    setTimeout(() => {
      const input = this.modal?.querySelector('#ai-file-input') as HTMLTextAreaElement;
      input?.focus();
    }, 100);
  }
  
  /**
   * Hide the dialog
   */
  public hide(): void {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
      this.isVisible = false;
    }
  }
  
  // ==========================================================================
  // MODAL CREATION
  // ==========================================================================
  
  /**
   * Create the modal dialog
   */
  private createModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'ai-file-creator-modal';
    modal.innerHTML = `
      <div class="ai-file-creator-backdrop" id="ai-creator-backdrop"></div>
      <div class="ai-file-creator-content">
        <!-- Header -->
        <div class="ai-creator-header">
          <div class="ai-creator-title">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="color: #667eea;">
              <path d="M10 2L12 7L17 7L13 11L15 16L10 13L5 16L7 11L3 7L8 7L10 2Z"/>
            </svg>
            <h3>AI File Creator</h3>
          </div>
          <button class="ai-creator-close" id="ai-creator-close">×</button>
        </div>
        
        <!-- Body -->
        <div class="ai-creator-body">
          <div class="ai-creator-section">
            <label class="ai-creator-label">
              What do you want to create?
            </label>
            <textarea 
              id="ai-file-input"
              class="ai-creator-input"
              placeholder="Example: Create a todo app with React&#10;Example: HTML page with contact form&#10;Example: Express API with user authentication&#10;Example: Vue component for product list"
              rows="4"
            ></textarea>
          </div>
          
          <!-- Target Folder Selection -->
          <div class="ai-creator-section">
            <label class="ai-creator-label">
              📂 Create files in
            </label>
            <div class="ai-folder-selector">
              <input 
                type="text" 
                id="ai-target-folder"
                class="ai-folder-input"
                placeholder="Leave empty for current folder"
                value=""
              />
              <button class="ai-folder-browse-btn" id="ai-browse-folder" title="Browse for folder">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1 2C1 1.44772 1.44772 1 2 1H6L7 3H14C14.5523 3 15 3.44772 15 4V13C15 13.5523 14.5523 14 14 14H2C1.44772 14 1 13.5523 1 13V2Z"/>
                </svg>
              </button>
              <button class="ai-folder-current-btn" id="ai-use-current" title="Use current folder">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1L1 8L8 15L15 8L8 1ZM8 3L13 8L8 13L3 8L8 3Z"/>
                </svg>
                Current
              </button>
            </div>
            <div class="ai-folder-hint" id="folder-hint">
              Current: <span id="current-folder-display">Not set</span>
            </div>
          </div>
          
          <!-- Quick Templates -->
          <div class="ai-creator-section">
            <label class="ai-creator-label">
              Quick Templates
            </label>
            <div class="ai-template-grid">
              <button class="ai-template-btn" data-template="web">
                <span class="template-icon">🌐</span>
                <span class="template-label">Web Page</span>
              </button>
              <button class="ai-template-btn" data-template="react">
                <span class="template-icon">⚛️</span>
                <span class="template-label">React App</span>
              </button>
              <button class="ai-template-btn" data-template="api">
                <span class="template-icon">🚀</span>
                <span class="template-label">API Server</span>
              </button>
              <button class="ai-template-btn" data-template="component">
                <span class="template-icon">🧩</span>
                <span class="template-label">Component</span>
              </button>
            </div>
          </div>
          
          <!-- Options -->
          <div class="ai-creator-section">
            <details class="ai-creator-details">
              <summary>Advanced Options</summary>
              <div class="ai-options-grid">
                <label class="ai-option-checkbox">
                  <input type="checkbox" id="include-tests" checked>
                  <span>Include tests</span>
                </label>
                <label class="ai-option-checkbox">
                  <input type="checkbox" id="include-styles" checked>
                  <span>Include styles</span>
                </label>
                <label class="ai-option-checkbox">
                  <input type="checkbox" id="include-types">
                  <span>TypeScript</span>
                </label>
              </div>
            </details>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="ai-creator-footer">
          <div class="ai-creator-hint">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M7 0C3.13 0 0 3.13 0 7C0 10.87 3.13 14 7 14C10.87 14 14 10.87 14 7C14 3.13 10.87 0 7 0ZM7 11C6.45 11 6 10.55 6 10C6 9.45 6.45 9 7 9C7.55 9 8 9.45 8 10C8 10.55 7.55 11 7 11ZM8 8H6V3H8V8Z"/>
            </svg>
            <span>Be specific! AI will create multiple files if needed</span>
          </div>
          <div class="ai-creator-actions">
            <button class="ai-btn ai-btn-secondary" id="ai-creator-cancel">
              Cancel
            </button>
            <button class="ai-btn ai-btn-primary" id="ai-creator-create">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0L10 5L15 5L11 9L13 14L8 11L3 14L5 9L1 5L6 5L8 0Z"/>
              </svg>
              <span>Create Files</span>
            </button>
          </div>
        </div>
        
        <!-- Progress Overlay -->
        <div class="ai-creator-progress" id="ai-creator-progress" style="display: none;">
          <div class="progress-content">
            <div class="progress-spinner"></div>
            <div class="progress-text" id="progress-text">Analyzing request...</div>
            <div class="progress-status" id="progress-status"></div>
            <button class="ai-btn ai-btn-secondary" id="ai-creator-cancel-progress">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;
    
    this.attachEventListeners(modal);
    return modal;
  }
  
  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================
  
  /**
   * Attach event listeners to modal elements
   */
  private attachEventListeners(modal: HTMLElement): void {
    // Close button
    modal.querySelector('#ai-creator-close')?.addEventListener('click', () => {
      this.hide();
    });
    
    // Cancel button
    modal.querySelector('#ai-creator-cancel')?.addEventListener('click', () => {
      this.hide();
    });
    
    // Backdrop click
    modal.querySelector('#ai-creator-backdrop')?.addEventListener('click', () => {
      this.hide();
    });
    
    // Create button
    modal.querySelector('#ai-creator-create')?.addEventListener('click', () => {
      this.handleCreate();
    });
    
    // Cancel progress button
    modal.querySelector('#ai-creator-cancel-progress')?.addEventListener('click', () => {
      aiFileCreator.cancel();
      this.hide();
    });
    
    // Template buttons
    modal.querySelectorAll('.ai-template-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const template = (e.currentTarget as HTMLElement).dataset.template;
        this.applyTemplate(template || '');
      });
    });
    
    // Folder selection buttons
    modal.querySelector('#ai-browse-folder')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.browseFolderDialog();
    });
    
    modal.querySelector('#ai-use-current')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.useCurrentFolder();
    });
    
    // Reset error styling when user types in description input
    const descriptionInput = modal.querySelector('#ai-file-input') as HTMLTextAreaElement;
    descriptionInput?.addEventListener('input', () => {
      descriptionInput.style.border = '1px solid #3c3c3c';
      descriptionInput.style.boxShadow = '';
    });
    
    // Reset error styling when user types in folder input
    const folderInput = modal.querySelector('#ai-target-folder') as HTMLInputElement;
    folderInput?.addEventListener('input', () => {
      folderInput.style.border = '1px solid #3c3c3c';
      folderInput.style.boxShadow = '';
    });
    
    // Update current folder display on modal show
    this.updateFolderDisplay(modal);
    
    // Enter key to submit
    modal.querySelector('#ai-file-input')?.addEventListener('keydown', (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key === 'Enter' && (ke.ctrlKey || ke.metaKey)) {
        e.preventDefault();
        this.handleCreate();
      }
    });
  }
  
  /**
   * Handle create button click
   */
  private async handleCreate(): Promise<void> {
    const input = this.modal?.querySelector('#ai-file-input') as HTMLTextAreaElement;
    const description = input?.value.trim();
    
    // Reset description input styling first
    if (input) {
      input.style.border = '1px solid #3c3c3c';
      input.style.boxShadow = '';
    }
    
    if (!description) {
      showNotification('⚠️ Please describe what you want to create', 'warning');
      
      // Animate the description input
      if (input) {
        input.style.border = '2px solid #ff6b6b';
        input.style.boxShadow = '0 0 0 3px rgba(255, 107, 107, 0.2)';
        input.style.animation = 'shake 0.5s';
        input.focus();
        
        setTimeout(() => {
          if (input) {
            input.style.animation = '';
          }
        }, 500);
      }
      
      return;
    }
    
    // Get target folder with proper fallback chain
    const folderInput = this.modal?.querySelector('#ai-target-folder') as HTMLInputElement;
    let targetFolder = folderInput?.value.trim();
    
    // Reset folder input border style
    if (folderInput) {
      folderInput.style.border = '1px solid #3c3c3c';
      folderInput.style.boxShadow = '';
    }
    
    // If empty, try various fallbacks
    if (!targetFolder) {
      // Try currentFolderPath
      targetFolder = (window as any).currentFolderPath;
      
      // Try localStorage
      if (!targetFolder) {
        targetFolder = localStorage.getItem('currentProjectPath') || '';
      }
      
      // If still empty, show prominent warning
      if (!targetFolder) {
        showNotification('⚠️ Please select a folder first or use the "Current" button', 'warning');
        console.warn('No target folder specified and no project folder set');
        
        // Highlight the input field in red
        if (folderInput) {
          folderInput.style.border = '2px solid #ff6b6b';
          folderInput.style.boxShadow = '0 0 0 3px rgba(255, 107, 107, 0.2)';
          folderInput.focus();
          
          // Shake animation
          folderInput.style.animation = 'shake 0.5s';
          setTimeout(() => {
            if (folderInput) {
              folderInput.style.animation = '';
            }
          }, 500);
        }
        
        // ALSO animate the status message "Not set - please select a folder"
        const displayElem = this.modal?.querySelector('#current-folder-display') as HTMLElement;
        if (displayElem) {
          // Pulse animation + shake
          displayElem.style.animation = 'shake 0.5s, pulse 1s';
          displayElem.style.fontWeight = 'bold';
          displayElem.style.fontSize = '14px';
          
          // Reset after animation
          setTimeout(() => {
            if (displayElem) {
              displayElem.style.animation = '';
              displayElem.style.fontWeight = 'normal';
              displayElem.style.fontSize = '12px';
            }
          }, 1000);
        }
        
        return;
      }
    }
    
    console.log('📂 Target folder for creation:', targetFolder);
    
    // Get options
    const includeTests = (this.modal?.querySelector('#include-tests') as HTMLInputElement)?.checked;
    const includeStyles = (this.modal?.querySelector('#include-styles') as HTMLInputElement)?.checked;
    const includeTypes = (this.modal?.querySelector('#include-types') as HTMLInputElement)?.checked;
    
    // Show progress
    this.showProgress();
    
    try {
      // Update progress
      this.updateProgress('Analyzing request...', '');
      
      // Create files with explicit target folder
      const result = await aiFileCreator.createFilesFromDescription({
        description,
        targetFolder,
        projectType: 'auto',
        options: {
          includeTests,
          includeStyles,
          includeTypes
        }
      });
      
      if (result.success) {
        this.updateProgress(
          `Created ${result.files.length} files!`,
          result.projectStructure || ''
        );
        
        // Hide after short delay
        setTimeout(() => {
          this.hide();
        }, 2000);
        
      } else {
        this.hideProgress();
        showNotification('❌ Failed to create files', 'error');
      }
      
    } catch (error) {
      this.hideProgress();
      console.error('Error creating files:', error);
      showNotification('❌ An error occurred', 'error');
    }
  }
  
  /**
   * Apply quick template
   */
  private applyTemplate(template: string): void {
    const input = this.modal?.querySelector('#ai-file-input') as HTMLTextAreaElement;
    if (!input) return;
    
    const templates: Record<string, string> = {
      'web': 'Create a responsive web page with HTML, CSS, and JavaScript. Include a header, main content area, and footer.',
      'react': 'Create a React app with multiple components. Include App.jsx, state management, and styled components.',
      'api': 'Create an Express API server with RESTful endpoints, middleware, and error handling.',
      'component': 'Create a reusable React component with props, state, and event handlers.'
    };
    
    input.value = templates[template] || '';
    input.focus();
  }
  
  // ==========================================================================
  // FOLDER SELECTION
  // ==========================================================================
  
  /**
   * Update folder display in the UI
   */
  private updateFolderDisplay(modal: HTMLElement): void {
    // Try to get current folder from multiple sources
    let currentFolder = (window as any).currentFolderPath;
    
    if (!currentFolder) {
      currentFolder = localStorage.getItem('currentProjectPath') || '';
    }
    
    const displayElem = modal.querySelector('#current-folder-display') as HTMLElement;
    const folderInput = modal.querySelector('#ai-target-folder') as HTMLInputElement;
    
    if (displayElem) {
      if (currentFolder) {
        displayElem.textContent = currentFolder;
        displayElem.style.color = '#4caf50';
      } else {
        displayElem.textContent = 'Not set - please select a folder';
        displayElem.style.color = '#ff6b6b';
      }
    }
    
    // Set placeholder based on current folder
    if (folderInput) {
      if (currentFolder) {
        folderInput.placeholder = `Leave empty to use: ${currentFolder}`;
      } else {
        folderInput.placeholder = 'Please specify a folder path or click "Current"';
      }
    }
  }
  
  /**
   * Browse for folder using file dialog
   */
  private async browseFolderDialog(): Promise<void> {
    // Safety check: only work if modal is visible
    if (!this.modal || !this.isVisible) {
      console.warn('⚠️ Folder browser called but modal not visible');
      return;
    }
    
    try {
      const win = window as any;
      
      // Try Tauri dialog
      if (win.__TAURI__ && win.__TAURI__.dialog) {
        const selected = await win.__TAURI__.dialog.open({
          directory: true,
          multiple: false,
          title: 'Select folder for new files'
        });
        
        if (selected) {
          const folderInput = this.modal?.querySelector('#ai-target-folder') as HTMLInputElement;
          if (folderInput) {
            folderInput.value = selected as string;
            console.log('📂 Selected folder:', selected);
            showNotification(`📂 Selected: ${selected}`, 'success');
          }
        }
      } else {
        // Fallback: manual input
        showNotification('💡 Please type the folder path manually', 'info');
        const folderInput = this.modal?.querySelector('#ai-target-folder') as HTMLInputElement;
        folderInput?.focus();
      }
    } catch (error) {
      console.error('Error browsing folder:', error);
      showNotification('⚠️ Please type folder path manually', 'warning');
    }
  }
  
  /**
   * Use current IDE folder
   */
  private useCurrentFolder(): void {
    // Try to get current folder from multiple sources
    let currentFolder = (window as any).currentFolderPath;
    
    if (!currentFolder) {
      currentFolder = localStorage.getItem('currentProjectPath') || '';
    }
    
    const folderInput = this.modal?.querySelector('#ai-target-folder') as HTMLInputElement;
    
    if (folderInput) {
      if (currentFolder) {
        folderInput.value = currentFolder;
        console.log('📂 Using current folder:', currentFolder);
        showNotification(`📂 Using: ${currentFolder}`, 'success');
      } else {
        folderInput.value = '';
        console.warn('⚠️ No current folder set');
        showNotification('⚠️ No folder is set. Please open a project folder first or type a path manually.', 'warning');
      }
    }
    
    // Update display
    if (this.modal) {
      this.updateFolderDisplay(this.modal);
    }
  }
  
  // ==========================================================================
  // PROGRESS DISPLAY
  // ==========================================================================
  
  /**
   * Show progress overlay
   */
  private showProgress(): void {
    const progress = this.modal?.querySelector('#ai-creator-progress') as HTMLElement;
    if (progress) {
      progress.style.display = 'flex';
    }
  }
  
  /**
   * Hide progress overlay
   */
  private hideProgress(): void {
    const progress = this.modal?.querySelector('#ai-creator-progress') as HTMLElement;
    if (progress) {
      progress.style.display = 'none';
    }
  }
  
  /**
   * Update progress text
   */
  private updateProgress(text: string, status: string): void {
    const progressText = this.modal?.querySelector('#progress-text') as HTMLElement;
    const progressStatus = this.modal?.querySelector('#progress-status') as HTMLElement;
    
    if (progressText) progressText.textContent = text;
    if (progressStatus) progressStatus.textContent = status;
  }
  
  // ==========================================================================
  // KEYBOARD SHORTCUT
  // ==========================================================================
  
  /**
   * Setup global keyboard shortcut (Ctrl+Shift+N)
   */
  private setupGlobalShortcut(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        this.show();
      }
      
      // ESC to close
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }
  
  // ==========================================================================
  // STYLES
  // ==========================================================================
  
  /**
   * Inject CSS styles
   */
  private injectStyles(): void {
    if (document.getElementById('ai-file-creator-styles')) {
      console.log('✅ Styles already injected, skipping');
      return;
    }
    
    const styles = document.createElement('style');
    styles.id = 'ai-file-creator-styles';
    styles.textContent = `
      /* Global Reset for Modal - Prevent external CSS bleeding */
      .ai-file-creator-modal * {
        box-sizing: border-box;
      }
      
      .ai-file-creator-modal *::before,
      .ai-file-creator-modal *::after {
        box-sizing: border-box;
      }
      
      /* Reset any external pseudo-element content */
      .ai-file-creator-modal *:not(.ai-creator-details summary)::before,
      .ai-file-creator-modal *:not(.ai-creator-details summary)::after {
        content: none !important;
      }
      
      /* Block folder chevrons from folderFileToggle.ts */
      .ai-file-creator-modal .folder-chevron {
        display: none !important;
      }
      
      /* Modal */
      .ai-file-creator-modal {
        position: fixed;
        inset: 0;
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.2s ease;
      }
      
      .ai-file-creator-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
      }
      
      .ai-file-creator-content {
        position: relative;
        background: linear-gradient(135deg, #252526, #1e1e1e);
        border: 1px solid #3c3c3c;
        border-radius: 12px;
        width: 90%;
        max-width: 600px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        animation: slideUp 0.3s ease;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      /* Header */
      .ai-creator-header {
        padding: 20px 24px;
        border-bottom: 1px solid #3c3c3c;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .ai-creator-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .ai-creator-title h3 {
        margin: 0;
        color: #fff;
        font-size: 18px;
        font-weight: 600;
      }
      
      .ai-creator-close {
        background: none;
        border: none;
        color: #888;
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      }
      
      .ai-creator-close:hover {
        background: #3c3c3c;
        color: #fff;
      }
      
      /* Body */
      .ai-creator-body {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
      }
      
      .ai-creator-section {
        margin-bottom: 24px;
      }
      
      .ai-creator-label {
        display: block;
        color: #cccccc;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      
      .ai-creator-input {
        width: 100%;
        padding: 12px;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 6px;
        color: #cccccc;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        resize: vertical;
        transition: all 0.2s;
      }
      
      .ai-creator-input:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
      }
      
      .ai-creator-input::placeholder {
        color: #6a6a6a;
      }
      
      /* Folder Selector */
      .ai-folder-selector {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      
      .ai-folder-input {
        flex: 1;
        padding: 10px 12px;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 6px;
        color: #cccccc;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 13px;
        transition: all 0.2s;
      }
      
      .ai-folder-input:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
      }
      
      .ai-folder-input::placeholder {
        color: #6a6a6a;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      
      .ai-folder-browse-btn,
      .ai-folder-current-btn {
        padding: 10px 12px;
        background: #2a2a2a;
        border: 1px solid #3c3c3c;
        border-radius: 6px;
        color: #cccccc;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s;
        white-space: nowrap;
      }
      
      .ai-folder-browse-btn {
        padding: 10px;
      }
      
      .ai-folder-browse-btn:hover,
      .ai-folder-current-btn:hover {
        background: #333;
        border-color: #667eea;
      }
      
      .ai-folder-browse-btn svg,
      .ai-folder-current-btn svg {
        width: 16px;
        height: 16px;
      }
      
      .ai-folder-hint {
        margin-top: 6px;
        font-size: 12px;
        color: #888;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .ai-folder-hint #current-folder-display {
        font-family: 'Consolas', 'Monaco', monospace;
        font-weight: 500;
      }
      
      /* Templates */
      .ai-template-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 10px;
      }
      
      .ai-template-btn {
        padding: 16px 12px;
        background: #2a2a2a;
        border: 1px solid #3c3c3c;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
      }
      
      .ai-template-btn:hover {
        background: #333;
        border-color: #667eea;
        transform: translateY(-2px);
      }
      
      .template-icon {
        font-size: 24px;
      }
      
      .template-label {
        color: #cccccc;
        font-size: 12px;
        font-weight: 500;
      }
      
      /* Options */
      .ai-creator-details {
        background: #2a2a2a;
        border: 1px solid #3c3c3c;
        border-radius: 6px;
        padding: 12px;
      }
      
      .ai-creator-details summary {
        color: #cccccc;
        font-size: 13px;
        cursor: pointer;
        list-style: none;
        display: flex;
        align-items: center;
        gap: 8px;
        position: relative;
      }
      
      .ai-creator-details summary::-webkit-details-marker {
        display: none;
      }
      
      /* FIXED: More specific selector to prevent arrow from appearing elsewhere */
      .ai-creator-modal .ai-creator-details summary::before {
        content: '▶';
        font-size: 10px;
        transition: transform 0.2s;
        display: inline-block;
        width: 12px;
        height: 12px;
        line-height: 12px;
        text-align: center;
      }
      
      .ai-creator-modal .ai-creator-details[open] summary::before {
        transform: rotate(90deg);
      }
      
      .ai-options-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px;
        margin-top: 12px;
      }
      
      .ai-option-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #cccccc;
        font-size: 13px;
        cursor: pointer;
      }
      
      .ai-option-checkbox input {
        cursor: pointer;
      }
      
      /* Footer */
      .ai-creator-footer {
        padding: 16px 24px;
        border-top: 1px solid #3c3c3c;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      
      .ai-creator-hint {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #888;
        font-size: 12px;
      }
      
      .ai-creator-hint svg {
        flex-shrink: 0;
      }
      
      .ai-creator-actions {
        display: flex;
        gap: 10px;
      }
      
      /* Buttons */
      .ai-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
      }
      
      .ai-btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      }
      
      .ai-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
      }
      
      .ai-btn-secondary {
        background: #3c3c3c;
        color: #cccccc;
      }
      
      .ai-btn-secondary:hover {
        background: #4c4c4c;
      }
      
      /* Progress */
      .ai-creator-progress {
        position: absolute;
        inset: 0;
        background: rgba(30, 30, 30, 0.95);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
      }
      
      .progress-content {
        text-align: center;
        padding: 40px;
      }
      
      .progress-spinner {
        width: 60px;
        height: 60px;
        border: 4px solid rgba(102, 126, 234, 0.2);
        border-top-color: #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 24px;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
      }
      
      @keyframes pulse {
        0% { 
          opacity: 1;
          transform: scale(1);
        }
        50% { 
          opacity: 0.7;
          transform: scale(1.05);
        }
        100% { 
          opacity: 1;
          transform: scale(1);
        }
      }
      
      .progress-text {
        color: #fff;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 12px;
      }
      
      .progress-status {
        color: #888;
        font-size: 12px;
        font-family: 'Consolas', monospace;
        white-space: pre-wrap;
        margin-bottom: 24px;
        max-height: 200px;
        overflow-y: auto;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .ai-file-creator-content {
          width: 95%;
          max-height: 90vh;
        }
        
        .ai-template-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .ai-creator-footer {
          flex-direction: column;
          align-items: stretch;
        }
        
        .ai-creator-actions {
          width: 100%;
        }
        
        .ai-btn {
          flex: 1;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const aiFileCreatorUI = new AIFileCreatorUI();

// ============================================================================
// WINDOW API
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).aiFileCreatorUI = aiFileCreatorUI;
  (window as any).showAIFileCreator = () => aiFileCreatorUI.show();
}