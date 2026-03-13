// ui/dialogs/projectSelector.ts
// Fixed project selector modal with proper handle passing

export interface ProjectSelectorOptions {
  onProjectSelect: (projectPath: string, projectType: 'folder' | 'template', handle?: any) => void;
  onCancel: () => void;
}

/**
 * Show the project selector modal for development mode
 */
export function showProjectSelector(options: ProjectSelectorOptions): void {
  // Remove any existing modals first
  const existingModal = document.querySelector('.project-selector-overlay');
  if (existingModal) {
    document.body.removeChild(existingModal);
  }

  const modal = createProjectSelectorModal(options);
  document.body.appendChild(modal);
  
  // Focus the modal and add fade-in animation
  modal.style.opacity = '0';
  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.style.transition = 'opacity 0.3s ease';
    modal.style.opacity = '1';
  });
}

/**
 * Create the project selector modal DOM element
 */
function createProjectSelectorModal(options: ProjectSelectorOptions): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'project-selector-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(4px);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const modal = document.createElement('div');
  modal.className = 'project-selector-modal';
  modal.style.cssText = `
    background: #2d2d2d;
    border-radius: 12px;
    padding: 32px;
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    border: 1px solid #444;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    position: relative;
    color: #fff;
  `;

  modal.innerHTML = `
    <div class="modal-header" style="margin-bottom: 24px;">
      <h2 style="color: #4a9eff; margin: 0 0 8px 0; font-size: 24px; font-weight: 600;">Development Mode - Select Project</h2>
      <p style="color: #aaa; margin: 0; font-size: 14px;">Since you're running in development mode, Tauri's native dialog isn't available. Select a sample project:</p>
    </div>
    
    <!-- Browser Directory Picker Section -->
    <div class="section browser-picker" style="margin: 24px 0; padding: 20px; border: 2px solid #444; border-radius: 8px; background: #333;">
      <div class="section-header" style="display: flex; align-items: center; margin-bottom: 16px;">
        <span style="font-size: 24px; margin-right: 12px;">📁</span>
        <h3 style="color: #4a9eff; margin: 0; font-size: 18px;">Browse for Folder</h3>
      </div>
      <p style="color: #ccc; margin: 0 0 16px 0; font-size: 14px;">Use your browser's native folder picker to select any folder on your computer.</p>
      <button id="browse-folder-btn" style="
        background: linear-gradient(135deg, #4a9eff, #357abd);
        color: white; 
        border: none; 
        padding: 14px 28px; 
        border-radius: 8px; 
        cursor: pointer; 
        font-weight: 600;
        font-size: 16px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
      " 
      onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(74, 158, 255, 0.4)'"
      onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(74, 158, 255, 0.3)'">
        🚀 Choose Folder from Computer
      </button>
      <div id="browser-support-warning" style="margin-top: 12px; padding: 12px; background: #2a2a2a; border-radius: 6px; border-left: 4px solid #ff9500; display: none;">
        <p style="margin: 0; color: #ffb84d; font-size: 13px;">⚠️ Your browser doesn't support the modern folder picker. Please use manual path input below.</p>
      </div>
    </div>

    <!-- Manual Path Input Section -->
    <div class="section manual-input" style="margin: 24px 0; padding: 20px; border: 2px solid #444; border-radius: 8px; background: #333;">
      <div class="section-header" style="display: flex; align-items: center; margin-bottom: 16px;">
        <span style="font-size: 24px; margin-right: 12px;">⌨️</span>
        <h3 style="color: #4a9eff; margin: 0; font-size: 18px;">Enter Path Manually</h3>
      </div>
      <p style="color: #ccc; margin: 0 0 16px 0; font-size: 14px;">Type or paste the full path to your project folder.</p>
      <div class="path-input-group" style="display: flex; gap: 12px; align-items: stretch;">
        <input 
          id="manual-path-input" 
          type="text" 
          placeholder="C:\\Users\\YourName\\Documents\\my-project"
          style="
            flex: 1; 
            padding: 14px 16px; 
            background: #1e1e1e; 
            border: 2px solid #555; 
            border-radius: 8px; 
            color: white;
            font-size: 14px;
            transition: border-color 0.3s ease;
          "
          onfocus="this.style.borderColor='#4a9eff'"
          onblur="this.style.borderColor='#555'"
        />
        <button id="open-manual-path-btn" style="
          background: #4a9eff; 
          color: white; 
          border: none; 
          padding: 14px 20px; 
          border-radius: 8px; 
          cursor: pointer;
          font-weight: 600;
          transition: background 0.3s ease;
        "
        onmouseover="this.style.background='#357abd'"
        onmouseout="this.style.background='#4a9eff'">
          Open
        </button>
      </div>
    </div>

    <!-- Drag & Drop Area -->
    <div id="drag-drop-area" class="drag-drop-area" style="
      border: 3px dashed #555;
      border-radius: 12px;
      padding: 48px 24px;
      text-align: center;
      transition: all 0.3s ease;
      cursor: pointer;
      margin: 24px 0;
      background: #2a2a2a;
    ">
      <div class="drag-content">
        <span style="font-size: 64px; display: block; margin-bottom: 16px; opacity: 0.7;">📂</span>
        <h3 style="color: #4a9eff; margin: 0 0 8px 0; font-size: 18px;">Drag & Drop a Folder Here</h3>
        <p style="color: #aaa; margin: 0; font-size: 14px;">Drag any folder from your file explorer directly into this area</p>
      </div>
    </div>

    <!-- Sample Projects Section -->
    <div class="section templates" style="margin: 24px 0; padding: 20px; border: 2px solid #444; border-radius: 8px; background: #333;">
      <div class="section-header" style="display: flex; align-items: center; margin-bottom: 16px;">
        <span style="font-size: 24px; margin-right: 12px;">🚀</span>
        <h3 style="color: #4a9eff; margin: 0; font-size: 18px;">Quick Start Templates</h3>
      </div>
      <p style="color: #ccc; margin: 0 0 20px 0; font-size: 14px;">Get started quickly with pre-configured project templates.</p>
      <div class="project-templates" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px;">
        <button id="react-template-btn" class="template-button" style="
          background: #333; 
          color: white; 
          border: 2px solid #555; 
          padding: 20px 16px; 
          border-radius: 8px; 
          cursor: pointer;
          text-align: center;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        "
        onmouseover="this.style.borderColor='#61dafb'; this.style.background='#1a1a1a'"
        onmouseout="this.style.borderColor='#555'; this.style.background='#333'">
          <span style="font-size: 32px;">⚛️</span>
          <span style="font-weight: 600;">React Project</span>
          <span style="font-size: 12px; color: #aaa;">Modern React with Vite</span>
        </button>
        <button id="vue-template-btn" class="template-button" style="
          background: #333; 
          color: white; 
          border: 2px solid #555; 
          padding: 20px 16px; 
          border-radius: 8px; 
          cursor: pointer;
          text-align: center;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        "
        onmouseover="this.style.borderColor='#4fc08d'; this.style.background='#1a1a1a'"
        onmouseout="this.style.borderColor='#555'; this.style.background='#333'">
          <span style="font-size: 32px;">💚</span>
          <span style="font-weight: 600;">Vue Project</span>
          <span style="font-size: 12px; color: #aaa;">Vue 3 + Composition API</span>
        </button>
        <button id="vanilla-template-btn" class="template-button" style="
          background: #333; 
          color: white; 
          border: 2px solid #555; 
          padding: 20px 16px; 
          border-radius: 8px; 
          cursor: pointer;
          text-align: center;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        "
        onmouseover="this.style.borderColor='#f7df1e'; this.style.background='#1a1a1a'"
        onmouseout="this.style.borderColor='#555'; this.style.background='#333'">
          <span style="font-size: 32px;">🟨</span>
          <span style="font-weight: 600;">Vanilla JS</span>
          <span style="font-size: 12px; color: #aaa;">Plain HTML, CSS, JS</span>
        </button>
        <button id="python-template-btn" class="template-button" style="
          background: #333; 
          color: white; 
          border: 2px solid #555; 
          padding: 20px 16px; 
          border-radius: 8px; 
          cursor: pointer;
          text-align: center;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        "
        onmouseover="this.style.borderColor='#3776ab'; this.style.background='#1a1a1a'"
        onmouseout="this.style.borderColor='#555'; this.style.background='#333'">
          <span style="font-size: 32px;">🐍</span>
          <span style="font-weight: 600;">Python Project</span>
          <span style="font-size: 12px; color: #aaa;">Flask + basic structure</span>
        </button>
      </div>
    </div>

    <!-- Footer -->
    <div class="modal-footer" style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #444;">
      <button id="cancel-btn" style="
        background: #666; 
        color: white; 
        border: none; 
        padding: 12px 32px; 
        border-radius: 8px; 
        cursor: pointer;
        font-weight: 600;
        transition: background 0.3s ease;
      "
      onmouseover="this.style.background='#777'"
      onmouseout="this.style.background='#666'">
        Cancel
      </button>
    </div>
  `;

  overlay.appendChild(modal);

  // Set up event listeners
  setupModalEventHandlers(overlay, options);

  return overlay;
}

/**
 * Set up event handlers for the modal
 */
function setupModalEventHandlers(overlay: HTMLElement, options: ProjectSelectorOptions): void {
  const modal = overlay.querySelector('.project-selector-modal') as HTMLElement;

  // Check browser support and show warning if needed
  checkBrowserSupport();

  // Browser directory picker - FIXED: Now passes the actual handle
  const browseFolderBtn = modal.querySelector('#browse-folder-btn') as HTMLButtonElement;
  browseFolderBtn?.addEventListener('click', async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const directoryHandle = await (window as any).showDirectoryPicker({
          id: 'project-folder',
          mode: 'readwrite',
          startIn: 'documents'
        });
        
        if (directoryHandle) {
          console.log('Directory selected via browser picker:', directoryHandle.name);
          // Store the handle for future use
          (window as any).__selectedDirectoryHandle = directoryHandle;
          
          // FIXED: Pass the actual directory handle as the third parameter
          options.onProjectSelect(directoryHandle.name, 'folder', directoryHandle);
          closeModal(overlay);
        }
      } else {
        showBrowserSupportWarning();
      }
    } catch (error) {
      console.log('User cancelled directory selection or error occurred:', error);
    }
  });

  // Manual path input
  const manualPathInput = modal.querySelector('#manual-path-input') as HTMLInputElement;
  const openManualPathBtn = modal.querySelector('#open-manual-path-btn') as HTMLButtonElement;
  
  const handleManualPath = () => {
    const path = manualPathInput.value.trim();
    if (path) {
      console.log('Manual path entered:', path);
      options.onProjectSelect(path, 'folder');
      closeModal(overlay);
    } else {
      manualPathInput.style.borderColor = '#ff4444';
      manualPathInput.focus();
      setTimeout(() => {
        manualPathInput.style.borderColor = '#555';
      }, 2000);
    }
  };

  openManualPathBtn?.addEventListener('click', handleManualPath);
  manualPathInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleManualPath();
    }
  });

  // Drag & drop - FIXED: Now properly handles directory entries
  const dragDropArea = modal.querySelector('#drag-drop-area') as HTMLElement;
  
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    dragDropArea.style.borderColor = '#4a9eff';
    dragDropArea.style.background = 'rgba(74, 158, 255, 0.1)';
    dragDropArea.style.transform = 'scale(1.02)';
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    if (!dragDropArea.contains(e.relatedTarget as Node)) {
      dragDropArea.style.borderColor = '#555';
      dragDropArea.style.background = '#2a2a2a';
      dragDropArea.style.transform = 'scale(1)';
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    dragDropArea.style.borderColor = '#555';
    dragDropArea.style.background = '#2a2a2a';
    dragDropArea.style.transform = 'scale(1)';

    const items = Array.from(e.dataTransfer?.items || []);
    for (const item of items) {
      if (item.kind === 'file') {
        const entry = (item as any).webkitGetAsEntry();
        if (entry?.isDirectory) {
          console.log('Folder dropped via drag & drop:', entry.name);
          
          // FIXED: Pass the entry as the handle for drag & drop
          options.onProjectSelect(entry.name, 'folder', entry);
          closeModal(overlay);
          break;
        }
      }
    }
  };

  dragDropArea?.addEventListener('dragover', handleDragOver);
  dragDropArea?.addEventListener('dragleave', handleDragLeave);
  dragDropArea?.addEventListener('drop', handleDrop);

  // Template buttons
  const templateButtons = {
    'react-template-btn': 'react',
    'vue-template-btn': 'vue',
    'vanilla-template-btn': 'vanilla',
    'python-template-btn': 'python'
  };

  Object.entries(templateButtons).forEach(([buttonId, templateType]) => {
    const button = modal.querySelector(`#${buttonId}`);
    button?.addEventListener('click', () => {
      console.log('Template selected:', templateType);
      options.onProjectSelect(templateType, 'template');
      closeModal(overlay);
    });
  });

  // Cancel button
  const cancelBtn = modal.querySelector('#cancel-btn');
  cancelBtn?.addEventListener('click', () => {
    options.onCancel();
    closeModal(overlay);
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      options.onCancel();
      closeModal(overlay);
    }
  });

  // Close on Escape key
  const escapeHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      options.onCancel();
      closeModal(overlay);
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

/**
 * Check if browser supports directory picker
 */
function checkBrowserSupport(): void {
  if (!('showDirectoryPicker' in window)) {
    showBrowserSupportWarning();
  }
}

/**
 * Show browser support warning
 */
function showBrowserSupportWarning(): void {
  const warning = document.getElementById('browser-support-warning');
  if (warning) {
    warning.style.display = 'block';
  }
}

/**
 * Close modal with animation
 */
function closeModal(overlay: HTMLElement): void {
  overlay.style.transition = 'opacity 0.3s ease';
  overlay.style.opacity = '0';
  
  setTimeout(() => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  }, 300);
}