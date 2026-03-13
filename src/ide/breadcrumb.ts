// src/ide/breadcrumb.ts
import './breadcrumb.css';

export class BreadcrumbManager {
  private container: HTMLElement | null = null;
  private initialized: boolean = false;
  private currentPath: string = '';

  constructor() {
    console.log('BreadcrumbManager constructor called');
  }

  public initialize(): void {
    if (this.initialized) {
      console.log('Breadcrumb already initialized');
      return;
    }

    console.log('📍 Initializing breadcrumb navigation...');
    
    // Create and insert the breadcrumb container
    this.createBreadcrumbContainer();
    
    // Setup context menu styles
    this.setupContextMenuStyles();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup global context menu handler
    this.setupGlobalContextMenuHandler();
    
    // Start observing tab changes for modification state
    setTimeout(() => this.startTabObserver(), 500);
    
    this.initialized = true;
    console.log('✅ Breadcrumb navigation initialized');
  }

  private setupContextMenuStyles(): void {
    if (!document.getElementById('breadcrumb-context-styles')) {
      const style = document.createElement('style');
      style.id = 'breadcrumb-context-styles';
      style.textContent = `
        .breadcrumb-segment {
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 3px;
          transition: all 0.2s;
          user-select: none;
          display: inline-block;
        }
        
        .breadcrumb-segment:hover {
          background: rgba(255, 255, 255, 0.1);
          text-decoration: underline;
        }
        
        .breadcrumb-separator {
          margin: 0 4px;
          color: #969696;
          user-select: none;
        }
        
        /* ✅ Professional Context Menu Styles */
        .breadcrumb-context-menu {
          position: fixed;
          background: linear-gradient(180deg, #2d2d2d 0%, #252526 100%);
          border: 1px solid #3c3c3c;
          border-radius: 8px;
          padding: 6px 0;
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.5),
            0 2px 8px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          z-index: 100000;
          min-width: 240px;
          font-size: 13px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          backdrop-filter: blur(12px);
          animation: contextMenuSlideIn 0.15s ease-out;
          transform-origin: top left;
          overflow: hidden;
        }
        
        @keyframes contextMenuSlideIn {
          0% {
            opacity: 0;
            transform: scale(0.95) translateY(-5px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes contextMenuSlideOut {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          100% {
            opacity: 0;
            transform: scale(0.95) translateY(-5px);
          }
        }
        
        .breadcrumb-context-menu.closing {
          animation: contextMenuSlideOut 0.1s ease-in forwards;
        }
        
        /* Menu Header */
        .breadcrumb-menu-header {
          padding: 8px 14px 10px;
          color: #888;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .breadcrumb-menu-header-icon {
          width: 14px;
          height: 14px;
          opacity: 0.6;
        }
        
        /* Menu Items */
        .breadcrumb-menu-item {
          padding: 8px 14px;
          cursor: pointer;
          color: #cccccc;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.12s ease;
          white-space: nowrap;
          position: relative;
          margin: 0 4px;
          border-radius: 4px;
        }
        
        .breadcrumb-menu-item:hover {
          background: linear-gradient(90deg, #094771 0%, rgba(9, 71, 113, 0.8) 100%);
          color: #ffffff;
        }
        
        .breadcrumb-menu-item:hover .breadcrumb-menu-icon svg {
          transform: scale(1.1);
        }
        
        .breadcrumb-menu-item:hover .breadcrumb-menu-shortcut {
          color: rgba(255, 255, 255, 0.7);
        }
        
        .breadcrumb-menu-item:active {
          background: linear-gradient(90deg, #0d5a8f 0%, rgba(13, 90, 143, 0.9) 100%);
          transform: scale(0.98);
        }
        
        /* Staggered animation for items */
        .breadcrumb-menu-item {
          opacity: 0;
          animation: menuItemFadeIn 0.2s ease forwards;
        }
        
        @keyframes menuItemFadeIn {
          0% {
            opacity: 0;
            transform: translateX(-8px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        /* Menu Icon */
        .breadcrumb-menu-icon {
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .breadcrumb-menu-icon svg {
          width: 16px;
          height: 16px;
          transition: transform 0.15s ease;
        }
        
        /* Menu Label */
        .breadcrumb-menu-label {
          flex: 1;
          font-weight: 400;
        }
        
        /* Keyboard Shortcut */
        .breadcrumb-menu-shortcut {
          font-size: 11px;
          color: #666;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          padding: 2px 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
          transition: all 0.12s ease;
        }
        
        /* Separator */
        .breadcrumb-menu-separator {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 20%, rgba(255, 255, 255, 0.08) 80%, transparent 100%);
          margin: 6px 12px;
        }
        
        /* Section Labels */
        .breadcrumb-menu-section {
          padding: 6px 14px 4px;
          color: #666;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        
        .breadcrumb-current {
          color: #ffffff;
          font-weight: 500;
        }
        
        /* Toast Notifications */
        .breadcrumb-toast {
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 12px 20px;
          color: white;
          border-radius: 6px;
          z-index: 100001;
          animation: toastSlideIn 0.3s ease;
          font-size: 13px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          gap: 10px;
          backdrop-filter: blur(8px);
        }
        
        @keyframes toastSlideIn {
          from {
            transform: translateX(100%) translateY(0);
            opacity: 0;
          }
          to {
            transform: translateX(0) translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes toastSlideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        /* ✅ Loading Overlay Styles */
        .ide-loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 999999;
          animation: fadeIn 0.2s ease;
        }
        
        .ide-loading-content {
          background: linear-gradient(180deg, #2d2d2d 0%, #252526 100%);
          border: 1px solid #3c3c3c;
          border-radius: 12px;
          padding: 32px 48px;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
        }
        
        .ide-loading-spinner {
          width: 44px;
          height: 44px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #4fc3f7;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        
        .ide-loading-text {
          margin-top: 20px;
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        .ide-loading-subtext {
          margin-top: 8px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          max-width: 300px;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* ✅ Breadcrumb Save Icon Styles */
        .breadcrumb-save-icon {
          display: none;
          align-items: center;
          justify-content: center;
          margin-left: auto;
          padding: 4px 8px;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s ease;
          opacity: 0;
          transform: scale(0.8);
        }
        
        .breadcrumb-save-icon.visible {
          display: flex;
          opacity: 1;
          transform: scale(1);
          animation: saveIconPulse 2s ease-in-out infinite;
        }
        
        .breadcrumb-save-icon:hover {
          background: rgba(79, 195, 247, 0.2);
          animation: none;
        }
        
        .breadcrumb-save-icon:hover svg {
          transform: scale(1.1);
        }
        
        .breadcrumb-save-icon:active {
          transform: scale(0.95);
        }
        
        .breadcrumb-save-icon svg {
          width: 16px;
          height: 16px;
          transition: transform 0.15s ease;
        }
        
        .breadcrumb-save-icon-text {
          margin-left: 6px;
          font-size: 11px;
          color: #4fc3f7;
          font-weight: 500;
        }
        
        .breadcrumb-modified-dot {
          width: 8px;
          height: 8px;
          background: #f48771;
          border-radius: 50%;
          margin-right: 6px;
          animation: modifiedPulse 1.5s ease-in-out infinite;
        }
        
        @keyframes saveIconPulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        
        @keyframes modifiedPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        
        /* Breadcrumb navigation flex layout */
        .breadcrumb-navigation {
          display: flex !important;
          align-items: center;
        }
        
        .breadcrumb-path-container {
          display: flex;
          align-items: center;
          flex: 1;
          overflow-x: auto;
          overflow-y: hidden;
        }
        
        /* ✅ Undo/Redo Button Styles */
        .breadcrumb-action-buttons {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-left: auto;
          padding-right: 8px;
        }
        
        .breadcrumb-undo-btn,
        .breadcrumb-redo-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px 8px;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.15s ease;
          gap: 4px;
          background: transparent;
          border: none;
          color: #999;
        }
        
        .breadcrumb-undo-btn:hover,
        .breadcrumb-redo-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        
        .breadcrumb-undo-btn:active,
        .breadcrumb-redo-btn:active {
          transform: scale(0.95);
        }
        
        .breadcrumb-undo-btn.disabled,
        .breadcrumb-redo-btn.disabled {
          opacity: 0.3;
          cursor: not-allowed;
          pointer-events: none;
        }
        
        .breadcrumb-undo-btn svg,
        .breadcrumb-redo-btn svg {
          width: 14px;
          height: 14px;
          transition: transform 0.15s ease;
        }
        
        .breadcrumb-undo-btn:hover svg {
          transform: rotate(-15deg);
        }
        
        .breadcrumb-redo-btn:hover svg {
          transform: rotate(15deg);
        }
        
        .breadcrumb-action-counter {
          font-size: 10px;
          font-weight: 600;
          min-width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: inherit;
        }
        
        .breadcrumb-undo-btn:hover .breadcrumb-action-counter,
        .breadcrumb-redo-btn:hover .breadcrumb-action-counter {
          background: rgba(79, 195, 247, 0.3);
          color: #4fc3f7;
        }
        
        .breadcrumb-action-separator {
          width: 1px;
          height: 16px;
          background: rgba(255, 255, 255, 0.1);
          margin: 0 4px;
        }
        
        /* ✅ Drag and Drop Styles */
        .breadcrumb-dropzone {
          display: none;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(79, 195, 247, 0.15);
          border: 2px dashed #4fc3f7;
          border-radius: 4px;
          z-index: 100;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        
        .breadcrumb-navigation {
          position: relative;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Show loading overlay with message
   */
  private showLoading(message: string = 'Loading...', subtext: string = ''): void {
    // Remove existing overlay
    this.hideLoading();
    
    const overlay = document.createElement('div');
    overlay.className = 'ide-loading-overlay';
    overlay.id = 'ide-loading-overlay';
    
    overlay.innerHTML = `
      <div class="ide-loading-content">
        <div class="ide-loading-spinner"></div>
        <div class="ide-loading-text">${message}</div>
        ${subtext ? `<div class="ide-loading-subtext" title="${subtext}">${this.truncateText(subtext, 40)}</div>` : ''}
      </div>
    `;
    
    document.body.appendChild(overlay);
    console.log('📍 Loading overlay shown:', message);
  }

  /**
   * Hide loading overlay
   */
  private hideLoading(): void {
    const overlay = document.getElementById('ide-loading-overlay');
    if (overlay) {
      overlay.style.animation = 'fadeOut 0.2s ease';
      setTimeout(() => {
        overlay.remove();
      }, 200);
      console.log('📍 Loading overlay hidden');
    }
  }

  /**
   * Truncate text helper (moved here to be available for loading)
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private setupGlobalContextMenuHandler(): void {
    document.addEventListener('click', (e) => {
      const existingMenu = document.querySelector('.breadcrumb-context-menu');
      if (existingMenu && !existingMenu.contains(e.target as Node)) {
        existingMenu.classList.add('closing');
        setTimeout(() => existingMenu.remove(), 100);
      }
    });
  }

  private createBreadcrumbContainer(): void {
    // Check if container already exists
    if (document.getElementById('breadcrumb-navigation')) {
      console.log('Breadcrumb container already exists');
      this.container = document.getElementById('breadcrumb-navigation');
      return;
    }

    // Create the breadcrumb container
    this.container = document.createElement('div');
    this.container.id = 'breadcrumb-navigation';
    this.container.className = 'breadcrumb-navigation';
    
    // Try multiple insertion points in order of preference
    const insertionAttempts = [
      // 1. After tab container
      () => {
        const tabContainer = document.getElementById('editor-tab-container') || 
                            document.querySelector('.tab-container');
        if (tabContainer && tabContainer.parentElement) {
          tabContainer.parentElement.insertBefore(this.container!, tabContainer.nextSibling);
          return true;
        }
        return false;
      },
      
      // 2. Inside editor panel, before Monaco
      () => {
        const monacoEditor = document.getElementById('monaco-editor');
        if (monacoEditor && monacoEditor.parentElement) {
          monacoEditor.parentElement.insertBefore(this.container!, monacoEditor);
          return true;
        }
        return false;
      },
      
      // 3. At the top of editor panel
      () => {
        const editorPanel = document.querySelector('.editor-panel');
        if (editorPanel) {
          editorPanel.insertBefore(this.container!, editorPanel.firstChild);
          return true;
        }
        return false;
      },
      
      // 4. Fixed position fallback
      () => {
        document.body.appendChild(this.container!);
        this.container!.style.cssText = `
          position: fixed;
          top: 68px;
          left: 250px;
          right: 0;
          height: 26px;
          background: #252526;
          border-bottom: 1px solid #3c3c3c;
          padding: 4px 12px;
          display: flex;
          align-items: center;
          z-index: 1000;
          font-size: 13px;
          color: #cccccc;
          overflow-x: auto;
          white-space: nowrap;
        `;
        return true;
      }
    ];

    // Try each insertion method
    let inserted = false;
    for (const attempt of insertionAttempts) {
      if (attempt()) {
        inserted = true;
        console.log('✅ Breadcrumb container inserted successfully');
        break;
      }
    }

    if (!inserted) {
      console.error('❌ Failed to insert breadcrumb container');
      return;
    }

    // Add initial content
    this.container.innerHTML = '<span class="breadcrumb-item">No file selected</span>';
    
    // ✅ Setup drag and drop support
    this.setupDragAndDrop();
  }

  /**
   * Setup drag and drop support for opening files
   */
  private setupDragAndDrop(): void {
    if (!this.container) return;
    
    // Create drop zone overlay
    const dropZone = document.createElement('div');
    dropZone.id = 'breadcrumb-dropzone';
    dropZone.className = 'breadcrumb-dropzone';
    dropZone.style.cssText = `
      display: none;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(79, 195, 247, 0.15);
      border: 2px dashed #4fc3f7;
      border-radius: 4px;
      z-index: 100;
      pointer-events: none;
      align-items: center;
      justify-content: center;
    `;
    dropZone.innerHTML = `
      <span style="color: #4fc3f7; font-size: 12px; font-weight: 500;">📂 Drop file here to open</span>
    `;
    
    // Make container position relative for absolute dropzone
    this.container.style.position = 'relative';
    this.container.appendChild(dropZone);
    
    // Drag counter to handle nested elements
    let dragCounter = 0;
    
    // Dragover - required for drop to work
    this.container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    }, false);
    
    // Dragenter - show drop zone
    this.container.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      
      if (dragCounter === 1) {
        dropZone.style.display = 'flex';
        console.log('📂 Drag entered breadcrumb');
      }
    }, false);
    
    // Dragleave - hide drop zone
    this.container.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      
      if (dragCounter === 0) {
        dropZone.style.display = 'none';
        console.log('📂 Drag left breadcrumb');
      }
    }, false);
    
    // Drop - handle the file
    this.container.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      dropZone.style.display = 'none';
      
      console.log('📂 File dropped on breadcrumb!');
      console.log('📂 DataTransfer:', e.dataTransfer);
      console.log('📂 Types:', e.dataTransfer?.types);
      
      // Log all available data
      if (e.dataTransfer) {
        e.dataTransfer.types.forEach(type => {
          console.log(`📂 Data[${type}]:`, e.dataTransfer?.getData(type));
        });
      }
      
      await this.handleDrop(e);
    }, false);
    
    // ✅ Setup Tauri-specific drag-drop listener for external files
    this.setupTauriDragDrop(dropZone);
    
    console.log('📂 Breadcrumb drag & drop enabled');
  }

  /**
   * Setup Tauri-specific drag-drop listener for external files
   */
  private async setupTauriDragDrop(dropZone: HTMLElement): Promise<void> {
    if (!(window as any).__TAURI__) {
      console.log('📂 Not in Tauri, skipping Tauri drag-drop setup');
      return;
    }
    
    try {
      // Tauri v2: Use window's onDragDropEvent
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      
      // Listen for drag-drop events on the window
      await appWindow.onDragDropEvent((event) => {
        // Tauri v2 event structure: { event: 'tauri://drag-drop', payload: { paths: [...] }, id: ... }
        const eventType = event.event || '';
        const paths = event.payload?.paths || [];
        
        console.log('📂 Tauri drag-drop event type:', eventType);
        console.log('📂 Paths:', paths);
        
        if (eventType === 'tauri://drag-enter' || eventType === 'tauri://drag-over') {
          // Show drop zone when hovering
          if (dropZone) {
            dropZone.style.display = 'flex';
          }
        } else if (eventType === 'tauri://drag-drop') {
          // File(s) dropped
          console.log('📂 ✅ External file(s) DROPPED:', paths);
          
          if (dropZone) {
            dropZone.style.display = 'none';
          }
          
          if (paths && paths.length > 0) {
            // Open the first dropped file
            console.log('📂 Opening file:', paths[0]);
            this.openDroppedFile(paths[0]);
          }
        } else if (eventType === 'tauri://drag-leave') {
          // Drag left window
          console.log('📂 Drag leave');
          if (dropZone) {
            dropZone.style.display = 'none';
          }
        }
      });
      
      console.log('✅ Tauri v2 drag-drop listener registered');
      
    } catch (error) {
      console.log('📂 Tauri v2 window API error:', error);
    }
  }

  /**
   * Handle file drop event
   */
  private async handleDrop(e: DragEvent): Promise<void> {
    const dataTransfer = e.dataTransfer;
    if (!dataTransfer) {
      console.log('📂 No dataTransfer');
      return;
    }
    
    // Try to get file path from various sources
    let filePath = '';
    
    // Method 1: Check for files first (most common for external drops)
    if (dataTransfer.files && dataTransfer.files.length > 0) {
      const file = dataTransfer.files[0];
      console.log('📂 File object:', file);
      console.log('📂 File name:', file.name);
      console.log('📂 File type:', file.type);
      console.log('📂 File size:', file.size);
      console.log('📂 File path:', (file as any).path);
      
      // Tauri provides path property on File objects
      if ((file as any).path) {
        filePath = (file as any).path;
        console.log('📂 Got path from Tauri File object:', filePath);
      } else {
        // For web or if path not available, read file content
        console.log('📂 No path on file, reading content...');
        try {
          const content = await file.text();
          await this.openDroppedFileWithContent(file.name, content);
          return;
        } catch (err) {
          console.error('Failed to read file:', err);
          this.showNotification('Failed to read file', 'error');
          return;
        }
      }
    }
    
    // Method 2: Check data types (for internal IDE drops or text paths)
    if (!filePath) {
      const dataTypes = [
        'text/plain',
        'text/uri-list', 
        'text/x-moz-url',
        'application/x-file-path',
      ];
      
      for (const type of dataTypes) {
        try {
          const data = dataTransfer.getData(type);
          if (data && data.trim()) {
            filePath = data.trim();
            console.log(`📂 Found data in ${type}:`, filePath);
            break;
          }
        } catch (e) {
          // getData can throw for some types
        }
      }
    }
    
    // Method 3: Check items
    if (!filePath && dataTransfer.items && dataTransfer.items.length > 0) {
      for (let i = 0; i < dataTransfer.items.length; i++) {
        const item = dataTransfer.items[i];
        console.log(`📂 Item ${i}:`, item.kind, item.type);
        
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            console.log('📂 Item file:', file.name, (file as any).path);
            if ((file as any).path) {
              filePath = (file as any).path;
              break;
            } else {
              // Read content
              try {
                const content = await file.text();
                await this.openDroppedFileWithContent(file.name, content);
                return;
              } catch (err) {
                console.error('Failed to read item file:', err);
              }
            }
          }
        }
      }
    }
    
    // Clean and open the file
    if (filePath) {
      // Clean up file:// URLs
      if (filePath.startsWith('file:///')) {
        filePath = filePath.replace('file:///', '');
      } else if (filePath.startsWith('file://')) {
        filePath = filePath.replace('file://', '');
      }
      
      // Decode URI
      filePath = decodeURIComponent(filePath);
      
      // Handle multiple lines (uri-list can have multiple)
      if (filePath.includes('\n')) {
        filePath = filePath.split('\n')[0].trim();
      }
      
      // Remove leading slash for Windows paths like /C:/
      if (filePath.match(/^\/[A-Z]:/i)) {
        filePath = filePath.substring(1);
      }
      
      console.log('📂 Opening file:', filePath);
      await this.openDroppedFile(filePath);
    } else {
      console.log('📂 No file path found in drop data');
      this.showNotification('Could not get file path from drop', 'warning');
    }
  }

  /**
   * Open a dropped file by path
   */
  private async openDroppedFile(filePath: string): Promise<void> {
    if (!filePath || filePath.length < 2) {
      this.showNotification('Invalid file path', 'error');
      return;
    }
    
    this.showLoading('Opening file...', filePath);
    const fileName = filePath.split(/[/\\]/).pop() || filePath;
    
    try {
      console.log('📂 Attempting to open:', filePath);
      
      // Method 1: Use openFileInTab (BEST - reads file and creates tab)
      if ((window as any).openFileInTab) {
        console.log('📂 ✅ Using window.openFileInTab');
        try {
          await (window as any).openFileInTab(filePath);
          console.log('📂 ✅ openFileInTab completed');
          this.showNotification(`Opened: ${fileName}`, 'success');
          this.hideLoading();
          return;
        } catch (err) {
          console.error('📂 ❌ openFileInTab failed:', err);
        }
      }
      
      // Method 2: Use tabManager.addTab with content
      if ((window as any).tabManager?.addTab) {
        console.log('📂 Using tabManager.addTab - need to read file first');
        try {
          // Read file content first
          let content: string = '';
          
          if ((window as any).__TAURI__) {
            try {
              const { invoke } = await import('@tauri-apps/api/core');
              content = await invoke('read_file_content', { path: filePath }) as string;
              console.log('📂 File read via invoke:', content.length, 'chars');
            } catch (e1) {
              console.log('📂 invoke failed, trying plugin-fs...');
              try {
                const { readTextFile } = await import('@tauri-apps/plugin-fs');
                content = await readTextFile(filePath);
                console.log('📂 File read via plugin-fs:', content.length, 'chars');
              } catch (e2) {
                console.error('📂 Both read methods failed:', e2);
                throw e2;
              }
            }
          }
          
          if (content) {
            const tabId = (window as any).tabManager.addTab(filePath, content);
            console.log('📂 ✅ Tab created:', tabId);
            this.showNotification(`Opened: ${fileName}`, 'success');
            this.hideLoading();
            return;
          }
        } catch (err) {
          console.error('📂 ❌ tabManager.addTab failed:', err);
        }
      }
      
      // Method 3: Use TauriFileOperations
      if ((window as any).__tauriFileOps?.readFile) {
        console.log('📂 Using __tauriFileOps.readFile');
        try {
          const content = await (window as any).__tauriFileOps.readFile(filePath);
          console.log('📂 File read:', content.length, 'chars');
          
          if ((window as any).tabManager?.addTab) {
            (window as any).tabManager.addTab(filePath, content);
            this.showNotification(`Opened: ${fileName}`, 'success');
            this.hideLoading();
            return;
          }
        } catch (err) {
          console.error('📂 ❌ __tauriFileOps.readFile failed:', err);
        }
      }
      
      // Method 4: Dispatch event for other handlers
      console.log('📂 Dispatching file-drop event (fallback)');
      document.dispatchEvent(new CustomEvent('file-drop', {
        detail: { path: filePath }
      }));
      
      this.showNotification(`File: ${fileName}`, 'info');
      
    } catch (error) {
      console.error('❌ Failed to open dropped file:', error);
      this.showNotification('Failed to open file', 'error');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Open a dropped file with content
   */
  private async openDroppedFileWithContent(fileName: string, content: string): Promise<void> {
    console.log('📂 Opening file with content:', fileName);
    
    try {
      // Try tabManager
      if ((window as any).tabManager?.createTab) {
        (window as any).tabManager.createTab(fileName, content);
        this.showNotification(`Opened: ${fileName}`, 'success');
        return;
      }
      
      // Try tabManager addTab
      if ((window as any).tabManager?.addTab) {
        (window as any).tabManager.addTab({ name: fileName, content, path: fileName });
        this.showNotification(`Opened: ${fileName}`, 'success');
        return;
      }
      
      // Dispatch event
      document.dispatchEvent(new CustomEvent('open-file-content', {
        detail: { name: fileName, content }
      }));
      
      this.showNotification(`Loaded: ${fileName}`, 'info');
      
    } catch (error) {
      console.error('Failed to open file content:', error);
      this.showNotification('Failed to open file', 'error');
    }
  }

  public updateBreadcrumb(path: string): void {
    if (!this.container) {
      console.warn('Breadcrumb container not initialized, attempting to create...');
      this.createBreadcrumbContainer();
    }

    if (!this.container) {
      console.error('Failed to create breadcrumb container');
      return;
    }

    this.currentPath = path;
    this.container.innerHTML = '';
    
    // Create path container (for segments)
    const pathContainer = document.createElement('div');
    pathContainer.className = 'breadcrumb-path-container';
    
    // Parse the path into segments
    const segments = this.parsePathSegments(path);
    
    if (segments.length === 0) {
      pathContainer.innerHTML = '<span class="breadcrumb-item">No file selected</span>';
      this.container.appendChild(pathContainer);
      return;
    }

    segments.forEach((segment, index) => {
      // Create clickable segment
      const segmentEl = document.createElement('span');
      segmentEl.className = 'breadcrumb-segment';
      if (index === segments.length - 1) {
        segmentEl.classList.add('breadcrumb-current');
      }
      segmentEl.textContent = segment.name;
      segmentEl.dataset.path = segment.fullPath;
      segmentEl.dataset.index = index.toString();
      segmentEl.title = `Click to open in file explorer, right-click for options`;
      
      // Left click - open in system file explorer
      segmentEl.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        // Get the folder path (for files, get the parent folder)
        let folderPath = segment.fullPath;
        
        // If this is the last segment (file), get parent folder
        if (index === segments.length - 1 && !segment.name.includes('.')) {
          // It's likely a folder, use as-is
        } else if (index === segments.length - 1) {
          // It's a file, get parent folder
          const lastSlash = folderPath.lastIndexOf('/');
          if (lastSlash > 0) {
            folderPath = folderPath.substring(0, lastSlash);
          }
        }
        
        // Convert to Windows path format if needed
        if (folderPath.includes(':')) {
          folderPath = folderPath.replace(/\//g, '\\');
        }
        
        console.log('📂 Opening in file explorer:', folderPath);
        
        // Show loading overlay
        this.showLoading('Opening Explorer...', folderPath);
        
        try {
          // Try using Tauri invoke
          const { invoke } = await import('@tauri-apps/api/core');
          
          // Try different methods to open folder
          try {
            await invoke('open_in_explorer', { path: folderPath });
            console.log('✅ Opened folder via open_in_explorer');
            this.showNotification(`Opened ${this.getShortPath(folderPath)}`, 'success');
          } catch (e1) {
            try {
              await invoke('shell_open', { path: folderPath });
              console.log('✅ Opened folder via shell_open');
              this.showNotification(`Opened ${this.getShortPath(folderPath)}`, 'success');
            } catch (e2) {
              // Fallback: use shell plugin
              try {
                const { open } = await import('@tauri-apps/plugin-shell');
                await open(folderPath);
                console.log('✅ Opened folder via shell plugin');
                this.showNotification(`Opened ${this.getShortPath(folderPath)}`, 'success');
              } catch (e3) {
                // Last resort: use Command to run explorer.exe directly
                try {
                  const { Command } = await import('@tauri-apps/plugin-shell');
                  const cmd = Command.create('explorer', [folderPath]);
                  await cmd.execute();
                  console.log('✅ Opened folder via explorer.exe command');
                  this.showNotification(`Opened ${this.getShortPath(folderPath)}`, 'success');
                } catch (e4) {
                  console.error('❌ All methods to open folder failed:', e4);
                  this.showNotification('Failed to open folder in explorer', 'error');
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ Failed to open in explorer:', error);
          this.showNotification('Failed to open folder in explorer', 'error');
        } finally {
          this.hideLoading();
        }
      });
      
      // Right click - show context menu
      segmentEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showContextMenu(e, segment.fullPath, segment.name);
      });
      
      pathContainer.appendChild(segmentEl);
      
      // Add separator (except for last item)
      if (index < segments.length - 1) {
        const separator = document.createElement('span');
        separator.className = 'breadcrumb-separator';
        separator.textContent = '›';
        pathContainer.appendChild(separator);
      }
    });

    this.container.appendChild(pathContainer);
    
    // ✅ Create action buttons container (Undo, Redo, Save)
    const actionButtons = document.createElement('div');
    actionButtons.className = 'breadcrumb-action-buttons';
    actionButtons.id = 'breadcrumb-action-buttons';
    
    // ✅ Undo Button
    const undoBtn = document.createElement('button');
    undoBtn.className = 'breadcrumb-undo-btn';
    undoBtn.id = 'breadcrumb-undo-btn';
    undoBtn.title = 'Undo (Ctrl+Z)';
    undoBtn.innerHTML = `
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 7h6a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M6 4L3 7l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="breadcrumb-action-counter" id="breadcrumb-undo-counter">0</span>
    `;
    undoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.performUndo();
    });
    actionButtons.appendChild(undoBtn);
    
    // ✅ Redo Button
    const redoBtn = document.createElement('button');
    redoBtn.className = 'breadcrumb-redo-btn';
    redoBtn.id = 'breadcrumb-redo-btn';
    redoBtn.title = 'Redo (Ctrl+Y)';
    redoBtn.innerHTML = `
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 7H6a3 3 0 0 0-3 3v0a3 3 0 0 0 3 3h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M10 4l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="breadcrumb-action-counter" id="breadcrumb-redo-counter">0</span>
    `;
    redoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.performRedo();
    });
    actionButtons.appendChild(redoBtn);
    
    // Separator
    const separator = document.createElement('div');
    separator.className = 'breadcrumb-action-separator';
    actionButtons.appendChild(separator);
    
    // ✅ Save Icon (hidden by default)
    const saveIcon = document.createElement('div');
    saveIcon.className = 'breadcrumb-save-icon';
    saveIcon.id = 'breadcrumb-save-icon';
    saveIcon.title = 'Save file (Ctrl+S)';
    
    // Apply base inline styles for reliability
    saveIcon.style.cssText = `
      display: none;
      align-items: center;
      justify-content: center;
      padding: 4px 10px;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
      gap: 6px;
    `;
    
    saveIcon.innerHTML = `
      <div class="breadcrumb-modified-dot" style="
        width: 8px;
        height: 8px;
        background: #f48771;
        border-radius: 50%;
        animation: modifiedPulse 1.5s ease-in-out infinite;
      "></div>
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 16px; height: 16px;">
        <path d="M12.5 14h-9A1.5 1.5 0 012 12.5v-9A1.5 1.5 0 013.5 2h7.086a1.5 1.5 0 011.06.44l1.914 1.914a1.5 1.5 0 01.44 1.06V12.5a1.5 1.5 0 01-1.5 1.5z" stroke="#4fc3f7" stroke-width="1.2"/>
        <path d="M4.5 2v3a.5.5 0 00.5.5h4a.5.5 0 00.5-.5V2" stroke="#4fc3f7" stroke-width="1"/>
        <rect x="4.5" y="9" width="7" height="5" rx="0.5" stroke="#4fc3f7" stroke-width="1"/>
      </svg>
      <span style="font-size: 11px; color: #4fc3f7; font-weight: 500;">Save</span>
    `;
    
    saveIcon.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.saveFile(this.currentPath);
    });
    
    // Hover effect
    saveIcon.addEventListener('mouseenter', () => {
      saveIcon.style.background = 'rgba(79, 195, 247, 0.2)';
    });
    saveIcon.addEventListener('mouseleave', () => {
      saveIcon.style.background = 'transparent';
    });
    
    actionButtons.appendChild(saveIcon);
    this.container.appendChild(actionButtons);
    
    // Ensure container is flex
    this.container.style.display = 'flex';
    this.container.style.alignItems = 'center';
    
    // Check if current file is modified
    this.checkFileModified(path);
    
    // Update undo/redo counters
    this.updateUndoRedoCounters();

    console.log('📍 Breadcrumb updated:', path);
  }

  /**
   * Check if file is modified and update save icon visibility
   */
  private checkFileModified(path: string): void {
    let isModified: boolean | null = null; // null = unknown, true = modified, false = not modified
    
    // Method 1: Check Monaco editor's model modified state (MOST RELIABLE - takes priority)
    try {
      const monaco = (window as any).monaco;
      if (monaco) {
        const models = monaco.editor.getModels();
        const fileName = path.split(/[/\\]/).pop() || '';
        
        for (const model of models) {
          const modelUri = model.uri.toString();
          
          if (modelUri.includes(fileName) || modelUri.includes(path.replace(/\\/g, '/'))) {
            // Get current version ID
            const currentVersionId = model.getAlternativeVersionId();
            
            // Get saved version ID (check all possible properties, handle null AND undefined)
            let savedVersionId = (model as any)._savedVersionId;
            if (savedVersionId == null) savedVersionId = (model as any).savedVersionId;
            if (savedVersionId == null) savedVersionId = (model as any)._initialVersionId;
            
            // If we don't have a saved version ID, store the current one (assume not modified)
            if (savedVersionId == null) {
              (model as any)._savedVersionId = currentVersionId;
              (model as any).savedVersionId = currentVersionId;
              savedVersionId = currentVersionId;
              isModified = false;
              console.log(`📍 Monaco: No saved version, initializing to ${currentVersionId}`);
            } else {
              // Check if current version differs from saved version
              isModified = currentVersionId !== savedVersionId;
            }
            
            console.log(`📍 Monaco version check: current=${currentVersionId}, saved=${savedVersionId}, modified=${isModified}`);
            break;
          }
        }
      }
    } catch (e) {
      console.log('Monaco check failed:', e);
    }
    
    // If Monaco gave us a definitive answer, use it (Monaco is the source of truth)
    if (isModified !== null) {
      if (isModified) {
        this.showSaveIcon();
      } else {
        this.hideSaveIcon();
      }
      return;
    }
    
    // Method 2: Fall back to tabManager API only if Monaco didn't give us an answer
    const tabModified = (window as any).tabManager?.isTabModified?.(path) ||
                        (window as any).tabManager?.isModified?.(path) ||
                        (window as any).isFileModified?.(path);
    
    if (tabModified === true) {
      isModified = true;
    } else if (tabModified === false) {
      isModified = false;
    }
    
    // Method 3: Check global modified files tracking
    if (isModified === null) {
      const modifiedFiles = (window as any).modifiedFiles || (window as any).__modifiedFiles;
      if (modifiedFiles) {
        if (modifiedFiles instanceof Set) {
          isModified = modifiedFiles.has(path);
        } else if (modifiedFiles instanceof Map) {
          isModified = modifiedFiles.get(path) === true;
        } else if (typeof modifiedFiles === 'object') {
          isModified = modifiedFiles[path] === true;
        }
      }
    }
    
    // Method 4: Check tab element for modified indicator (last resort)
    if (isModified === null) {
      const fileName = path.split(/[/\\]/).pop() || '';
      const tabs = document.querySelectorAll('.tab, .editor-tab, [data-path]');
      
      isModified = false; // Default to not modified
      tabs.forEach(tab => {
        const tabText = tab.textContent || '';
        const tabPath = (tab as HTMLElement).dataset?.path || '';
        
        // Check if this tab matches our file
        const isMatchingTab = tabText.includes(fileName) || 
                              tabPath.includes(fileName) ||
                              tabPath === path;
        
        if (isMatchingTab) {
          // Check for modified indicators
          if (tabText.includes('●') || tabText.includes('•') || tabText.includes('*') ||
              tab.classList.contains('modified') || 
              tab.classList.contains('unsaved') ||
              tab.classList.contains('dirty') ||
              (tab as HTMLElement).dataset?.modified === 'true' ||
              (tab as HTMLElement).dataset?.dirty === 'true') {
            isModified = true;
          }
        }
      });
    }
    
    // Update save icon visibility
    if (isModified) {
      this.showSaveIcon();
    } else {
      this.hideSaveIcon();
    }
  }

  /**
   * Start observing tab changes and Monaco editor for file modifications
   */
  private startTabObserver(): void {
    // Observe tab container for changes
    const tabContainer = document.getElementById('editor-tab-container') || 
                         document.querySelector('.tab-container, [class*="tab-container"]');
    
    if (tabContainer) {
      const observer = new MutationObserver(() => {
        // Re-check modification state when tabs change
        if (this.currentPath) {
          this.checkFileModified(this.currentPath);
        }
      });
      
      observer.observe(tabContainer, { 
        characterData: true, 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'data-modified', 'data-dirty']
      });
      
      console.log('📍 Tab observer started');
    }
    
    // Setup Monaco editor listener
    this.setupMonacoListener();
    
    // Periodic check every 3 seconds as fallback (reduced frequency)
    setInterval(() => {
      if (this.currentPath) {
        this.checkFileModified(this.currentPath);
      }
    }, 3000);
  }

  /**
   * Setup Monaco editor content change listener
   */
  private setupMonacoListener(): void {
    const trySetup = () => {
      const monaco = (window as any).monaco;
      const editor = (window as any).monaco?.editor?.getEditors()?.[0] || 
                     (window as any).monacoEditor || 
                     (window as any).editor;
      
      if (monaco && editor) {
        // Listen for content changes
        editor.onDidChangeModelContent?.(() => {
          if (this.currentPath) {
            // Update max version for redo tracking
            const model = editor.getModel();
            if (model) {
              const currentVersionId = model.getAlternativeVersionId();
              const maxVersionId = (model as any)._maxVersionId || 0;
              if (currentVersionId > maxVersionId) {
                (model as any)._maxVersionId = currentVersionId;
              }
            }
            
            // Small delay to let Monaco update its state
            setTimeout(() => {
              this.checkFileModified(this.currentPath);
              this.updateUndoRedoCounters();
            }, 50);
          }
        });
        
        // Listen for model changes (switching files)
        editor.onDidChangeModel?.((e: any) => {
          if (e.newModelUrl) {
            // Store initial version when file is opened
            const model = monaco.editor.getModel(e.newModelUrl);
            if (model) {
              const versionId = model.getAlternativeVersionId();
              (model as any)._savedVersionId = versionId;
              (model as any).savedVersionId = versionId;
              (model as any)._initialVersionId = versionId;
              (model as any)._maxVersionId = versionId;
              console.log('📍 Stored initial Monaco version:', versionId);
            }
          }
          
          if (this.currentPath) {
            setTimeout(() => {
              this.checkFileModified(this.currentPath);
              this.updateUndoRedoCounters();
            }, 50);
          }
        });
        
        // Also store initial version for current model
        const currentModel = editor.getModel?.();
        if (currentModel) {
          const versionId = currentModel.getAlternativeVersionId();
          if (!(currentModel as any)._savedVersionId) {
            (currentModel as any)._savedVersionId = versionId;
            (currentModel as any).savedVersionId = versionId;
            (currentModel as any)._initialVersionId = versionId;
            (currentModel as any)._maxVersionId = versionId;
          }
        }
        
        console.log('📍 Monaco listener attached');
        return true;
      }
      return false;
    };
    
    // Try immediately, then retry after delays
    if (!trySetup()) {
      setTimeout(trySetup, 1000);
      setTimeout(trySetup, 3000);
      setTimeout(trySetup, 5000);
    }
  }

  /**
   * Show the save icon (when file is modified)
   */
  public showSaveIcon(): void {
    const saveIcon = document.getElementById('breadcrumb-save-icon');
    if (saveIcon) {
      saveIcon.classList.add('visible');
      saveIcon.style.display = 'flex';
      saveIcon.style.opacity = '1';
      saveIcon.style.transform = 'scale(1)';
      console.log('💾 Save icon shown');
      // Debug: Log call stack to find source
      // console.trace('showSaveIcon called from:');
    }
  }

  /**
   * Hide the save icon (when file is saved)
   */
  public hideSaveIcon(): void {
    const saveIcon = document.getElementById('breadcrumb-save-icon');
    if (saveIcon) {
      saveIcon.classList.remove('visible');
      saveIcon.style.display = 'none';
      saveIcon.style.opacity = '0';
      saveIcon.style.transform = 'scale(0.8)';
      console.log('💾 Save icon hidden');
    }
  }

  /**
   * Perform undo action
   */
  private performUndo(): void {
    try {
      const editor = (window as any).monaco?.editor?.getEditors()?.[0];
      if (editor) {
        // Method 1: Use editor action (most reliable)
        const undoAction = editor.getAction('undo');
        if (undoAction) {
          undoAction.run();
          console.log('↶ Undo performed via action');
        } else {
          // Method 2: Use trigger
          editor.trigger('keyboard', 'undo', null);
          console.log('↶ Undo performed via trigger');
        }
        
        // Focus editor after action
        editor.focus();
        
        // Update counters after undo
        setTimeout(() => {
          this.updateUndoRedoCounters();
          this.checkFileModified(this.currentPath);
        }, 50);
      }
    } catch (e) {
      console.error('Undo failed:', e);
    }
  }

  /**
   * Perform redo action
   */
  private performRedo(): void {
    try {
      const editor = (window as any).monaco?.editor?.getEditors()?.[0];
      if (editor) {
        // Method 1: Use editor action (most reliable)
        const redoAction = editor.getAction('redo');
        if (redoAction) {
          redoAction.run();
          console.log('↷ Redo performed via action');
        } else {
          // Method 2: Use trigger
          editor.trigger('keyboard', 'redo', null);
          console.log('↷ Redo performed via trigger');
        }
        
        // Focus editor after action
        editor.focus();
        
        // Update counters after redo
        setTimeout(() => {
          this.updateUndoRedoCounters();
          this.checkFileModified(this.currentPath);
        }, 50);
      }
    } catch (e) {
      console.error('Redo failed:', e);
    }
  }

  /**
   * Update undo/redo counters based on Monaco editor stack
   */
  public updateUndoRedoCounters(): void {
    const undoCounter = document.getElementById('breadcrumb-undo-counter');
    const redoCounter = document.getElementById('breadcrumb-redo-counter');
    const undoBtn = document.getElementById('breadcrumb-undo-btn');
    const redoBtn = document.getElementById('breadcrumb-redo-btn');
    
    if (!undoCounter || !redoCounter) return;
    
    let undoCount = 0;
    let redoCount = 0;
    let canUndo = false;
    let canRedo = false;
    
    try {
      const editor = (window as any).monaco?.editor?.getEditors()?.[0];
      if (editor) {
        const model = editor.getModel();
        if (model) {
          // Method 1: Check actions availability
          const undoAction = editor.getAction('undo');
          const redoAction = editor.getAction('redo');
          
          // Monaco doesn't directly expose canUndo/canRedo, but we can estimate
          // based on version IDs
          const currentVersionId = model.getAlternativeVersionId();
          const savedVersionId = (model as any)._savedVersionId || (model as any)._initialVersionId || 1;
          const initialVersionId = (model as any)._initialVersionId || 1;
          
          // Estimate: if current version > initial, we can undo
          if (currentVersionId > initialVersionId) {
            canUndo = true;
            undoCount = currentVersionId - initialVersionId;
          }
          
          // For redo, we need to track it differently
          // Store the max version we've seen
          const maxVersionId = (model as any)._maxVersionId || currentVersionId;
          if (currentVersionId < maxVersionId) {
            canRedo = true;
            redoCount = maxVersionId - currentVersionId;
          }
          
          // Update max version tracking
          if (currentVersionId > ((model as any)._maxVersionId || 0)) {
            (model as any)._maxVersionId = currentVersionId;
          }
          
          // Try to access undo/redo service directly (Monaco internals)
          try {
            // Check if we can actually undo by looking at the command manager
            const undoRedoService = (editor as any)._undoRedoService || 
                                   (model as any)._undoRedoService ||
                                   (window as any).monaco?.editor?._undoRedoService;
            
            if (undoRedoService) {
              const resource = model.uri;
              if (undoRedoService.canUndo) {
                canUndo = undoRedoService.canUndo(resource);
              }
              if (undoRedoService.canRedo) {
                canRedo = undoRedoService.canRedo(resource);
              }
            }
          } catch (innerError) {
            // Fallback to version-based detection
          }
        }
      }
    } catch (e) {
      console.log('Counter update error:', e);
    }
    
    // Show count or just indicator
    undoCounter.textContent = undoCount > 0 ? (undoCount > 99 ? '99+' : String(undoCount)) : '0';
    redoCounter.textContent = redoCount > 0 ? (redoCount > 99 ? '99+' : String(redoCount)) : '0';
    
    // Update disabled state based on actual capability
    if (undoBtn) {
      if (!canUndo && undoCount === 0) {
        undoBtn.classList.add('disabled');
      } else {
        undoBtn.classList.remove('disabled');
      }
    }
    
    if (redoBtn) {
      if (!canRedo && redoCount === 0) {
        redoBtn.classList.add('disabled');
      } else {
        redoBtn.classList.remove('disabled');
      }
    }
  }

  private parsePathSegments(path: string): Array<{name: string, fullPath: string}> {
    const segments: Array<{name: string, fullPath: string}> = [];
    
    // Clean up the path
    path = path.replace(/\\/g, '/'); // Normalize backslashes
    
    // Handle different path formats
    const isWindows = path.match(/^[A-Z]:/);
    const parts = path.split('/').filter(part => part.length > 0);
    
    // Handle Windows drive letter
    if (isWindows && path.match(/^[A-Z]:/)) {
      const driveLetter = path.match(/^[A-Z]:/)?.[0];
      if (driveLetter) {
        segments.push({
          name: driveLetter,
          fullPath: driveLetter + '/'
        });
        
        // Remove drive letter from parts if it's there
        if (parts[0] && parts[0].includes(':')) {
          parts[0] = parts[0].substring(2);
          if (!parts[0]) parts.shift();
        }
      }
    } else if (path.startsWith('/')) {
      // Unix root
      segments.push({
        name: '/',
        fullPath: '/'
      });
    }
    
    // Build cumulative path for each segment
    let currentPath = segments.length > 0 ? segments[0].fullPath : '';
    
    parts.forEach(part => {
      if (part) {
        currentPath = currentPath.endsWith('/') 
          ? currentPath + part 
          : currentPath + '/' + part;
        
        segments.push({
          name: part,
          fullPath: currentPath
        });
      }
    });
    
    return segments;
  }

  private showContextMenu(event: MouseEvent, path: string, name: string): void {
    // Remove any existing context menu with animation
    const existingMenu = document.querySelector('.breadcrumb-context-menu');
    if (existingMenu) {
      existingMenu.classList.add('closing');
      setTimeout(() => existingMenu.remove(), 100);
    }
    
    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'breadcrumb-context-menu';
    menu.style.left = `${event.pageX}px`;
    menu.style.top = `${event.pageY}px`;
    
    // Determine if this is a file or directory
    const isFile = path.includes('.') && path.lastIndexOf('.') > path.lastIndexOf('/');
    
    // Professional SVG icons
    const icons = {
      // File actions
      save: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 14h-9A1.5 1.5 0 012 12.5v-9A1.5 1.5 0 013.5 2h7.086a1.5 1.5 0 011.06.44l1.914 1.914a1.5 1.5 0 01.44 1.06V12.5a1.5 1.5 0 01-1.5 1.5z" stroke="#4fc3f7" stroke-width="1.2"/>
        <path d="M4.5 2v3a.5.5 0 00.5.5h4a.5.5 0 00.5-.5V2" stroke="#4fc3f7" stroke-width="1"/>
        <rect x="4.5" y="9" width="7" height="5" rx="0.5" stroke="#4fc3f7" stroke-width="1"/>
      </svg>`,
      saveAs: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.5 14h-8A1.5 1.5 0 012 12.5v-9A1.5 1.5 0 013.5 2h6.086a1.5 1.5 0 011.06.44l1.414 1.414" stroke="#9cdcfe" stroke-width="1.2"/>
        <path d="M4 2v2.5a.5.5 0 00.5.5h3" stroke="#9cdcfe" stroke-width="1"/>
        <path d="M11 7v4M9 9h4" stroke="#9cdcfe" stroke-width="1.3" stroke-linecap="round"/>
      </svg>`,
      close: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4l8 8M12 4l-8 8" stroke="#f48771" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,
      rename: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.5 2.5l2 2-7 7H4.5v-2l7-7z" stroke="#ce9178" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M9.5 4.5l2 2" stroke="#ce9178" stroke-width="1.2"/>
        <path d="M2 13.5h12" stroke="#ce9178" stroke-width="1.2" stroke-linecap="round"/>
      </svg>`,
      delete: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 4h10M5.5 4V3a1 1 0 011-1h3a1 1 0 011 1v1" stroke="#f14c4c" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M4 4l.8 9.2a1.5 1.5 0 001.5 1.3h3.4a1.5 1.5 0 001.5-1.3L12 4" stroke="#f14c4c" stroke-width="1.2"/>
        <path d="M6.5 7v4M9.5 7v4" stroke="#f14c4c" stroke-width="1" stroke-linecap="round"/>
      </svg>`,
      revealFile: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 2.5A1.5 1.5 0 014.5 1h4.586a1.5 1.5 0 011.06.44l2.414 2.414a1.5 1.5 0 01.44 1.06V13.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 013 13.5v-11z" stroke="#dcb862" stroke-width="1.2"/>
        <path d="M8 1v3a1 1 0 001 1h3" stroke="#dcb862" stroke-width="1.2"/>
        <path d="M6 9l2 2 2-2" stroke="#dcb862" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
      copyRelative: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="5" width="8" height="9" rx="1" stroke="#569cd6" stroke-width="1.2"/>
        <path d="M3 11V3.5A1.5 1.5 0 014.5 2H10" stroke="#569cd6" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M7.5 9h3M9 7.5v3" stroke="#569cd6" stroke-width="1" stroke-linecap="round"/>
      </svg>`,
      // Terminal/folder actions
      cmd: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v9a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-9z" stroke="#4fc3f7" stroke-width="1.2"/>
        <path d="M4 6l2.5 2L4 10M7 10h4" stroke="#4fc3f7" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
      powershell: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v9a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-9z" stroke="#5c99d6" stroke-width="1.2"/>
        <path d="M4 5.5l3.5 2.5L4 10.5" stroke="#5c99d6" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8.5 10.5h3" stroke="#5c99d6" stroke-width="1.3" stroke-linecap="round"/>
      </svg>`,
      explorer: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 4.5A1.5 1.5 0 013.5 3H6l1 1.5h5.5A1.5 1.5 0 0114 6v6.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-8z" stroke="#dcb862" stroke-width="1.2" fill="none"/>
        <path d="M5 8.5h6M5 10.5h4" stroke="#dcb862" stroke-width="1" stroke-linecap="round" opacity="0.6"/>
      </svg>`,
      copy: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="5" width="8" height="9" rx="1" stroke="#89d185" stroke-width="1.2"/>
        <path d="M3 11V3.5A1.5 1.5 0 014.5 2H10" stroke="#89d185" stroke-width="1.2" stroke-linecap="round"/>
      </svg>`,
      copyName: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="2" width="10" height="12" rx="1.5" stroke="#dcdcaa" stroke-width="1.2"/>
        <path d="M5.5 5h5M5.5 7.5h5M5.5 10h3" stroke="#dcdcaa" stroke-width="1" stroke-linecap="round"/>
      </svg>`,
      navigate: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 4.5A1.5 1.5 0 013.5 3H6l1 1.5h5.5A1.5 1.5 0 0114 6v6.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-8z" stroke="#c586c0" stroke-width="1.2"/>
        <path d="M6 9h4M8 7v4" stroke="#c586c0" stroke-width="1.2" stroke-linecap="round"/>
      </svg>`,
      tree: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 3v10M4 6h4M4 10h6" stroke="#6a9955" stroke-width="1.3" stroke-linecap="round"/>
        <circle cx="10" cy="6" r="1.5" stroke="#6a9955" stroke-width="1"/>
        <circle cx="12" cy="10" r="1.5" stroke="#6a9955" stroke-width="1"/>
      </svg>`
    };
    
    // Menu items with professional structure
    const menuItems = [
      // ===== FILE ACTIONS (only for files) =====
      { 
        label: 'Save File', 
        icon: icons.save,
        shortcut: 'Ctrl+S',
        action: () => this.saveFile(path),
        show: isFile
      },
      { 
        label: 'Save As...', 
        icon: icons.saveAs,
        shortcut: 'Ctrl+Shift+S',
        action: () => this.saveFileAs(path),
        show: isFile
      },
      { 
        type: 'separator',
        show: isFile
      },
      { 
        label: 'Rename...', 
        icon: icons.rename,
        shortcut: 'F2',
        action: () => this.renameFile(path, name),
        show: isFile
      },
      { 
        label: 'Close File', 
        icon: icons.close,
        shortcut: 'Ctrl+W',
        action: () => this.closeFile(path),
        show: isFile
      },
      { 
        type: 'separator',
        show: isFile
      },
      // ===== TERMINAL ACTIONS =====
      { 
        label: 'Open in CMD', 
        icon: icons.cmd,
        shortcut: '',
        action: () => this.openInCmd(path),
        show: true
      },
      { 
        label: 'Open in PowerShell', 
        icon: icons.powershell,
        shortcut: '',
        action: () => this.openInPowerShell(path),
        show: true
      },
      { 
        label: isFile ? 'Reveal in Explorer' : 'Open in Explorer', 
        icon: isFile ? icons.revealFile : icons.explorer,
        shortcut: 'Ctrl+E',
        action: () => this.openInExplorer(path),
        show: true
      },
      { 
        type: 'separator',
        show: true
      },
      // ===== COPY ACTIONS =====
      { 
        label: 'Copy Full Path', 
        icon: icons.copy,
        shortcut: 'Ctrl+Shift+C',
        action: () => this.copyPath(path),
        show: true
      },
      { 
        label: 'Copy Relative Path', 
        icon: icons.copyRelative,
        shortcut: '',
        action: () => this.copyRelativePath(path),
        show: true
      },
      { 
        label: 'Copy Name', 
        icon: icons.copyName,
        shortcut: '',
        action: () => this.copyName(name),
        show: true
      },
      // ===== FOLDER ACTIONS (only for folders) =====
      { 
        type: 'separator',
        show: !isFile
      },
      { 
        label: 'Navigate to Folder', 
        icon: icons.navigate,
        shortcut: '',
        action: () => this.navigateToPath(path, name),
        show: !isFile
      },
      { 
        label: 'Expand in Tree', 
        icon: icons.tree,
        shortcut: '',
        action: () => this.expandFolderInTree(path),
        show: !isFile
      }
    ];
    
    // Add header
    const header = document.createElement('div');
    header.className = 'breadcrumb-menu-header';
    header.innerHTML = `
      <svg class="breadcrumb-menu-header-icon" viewBox="0 0 16 16" fill="none">
        <path d="M2 4.5A1.5 1.5 0 013.5 3H6l1 1.5h5.5A1.5 1.5 0 0114 6v6.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-8z" stroke="currentColor" stroke-width="1.2"/>
      </svg>
      <span>${this.truncateText(name, 25)}</span>
    `;
    menu.appendChild(header);
    
    let itemIndex = 0;
    menuItems.forEach(item => {
      if (!item.show) return;
      
      if (item.type === 'separator') {
        const separator = document.createElement('div');
        separator.className = 'breadcrumb-menu-separator';
        menu.appendChild(separator);
      } else {
        const menuItem = document.createElement('div');
        menuItem.className = 'breadcrumb-menu-item';
        menuItem.style.animationDelay = `${itemIndex * 0.03}s`;
        
        const icon = document.createElement('span');
        icon.className = 'breadcrumb-menu-icon';
        icon.innerHTML = item.icon!;
        
        const label = document.createElement('span');
        label.className = 'breadcrumb-menu-label';
        label.textContent = item.label!;
        
        menuItem.appendChild(icon);
        menuItem.appendChild(label);
        
        // Add shortcut if exists
        if (item.shortcut) {
          const shortcut = document.createElement('span');
          shortcut.className = 'breadcrumb-menu-shortcut';
          shortcut.textContent = item.shortcut;
          menuItem.appendChild(shortcut);
        }
        
        menuItem.addEventListener('click', () => {
          // Close menu with animation
          menu.classList.add('closing');
          setTimeout(() => {
            menu.remove();
            item.action!();
          }, 100);
        });
        
        menu.appendChild(menuItem);
        itemIndex++;
      }
    });
    
    document.body.appendChild(menu);
    
    // Adjust position if menu goes off-screen
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${window.innerHeight - rect.height - 10}px`;
    }
    
    // Close menu when clicking outside with animation
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.classList.add('closing');
        setTimeout(() => {
          menu.remove();
        }, 100);
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  }

  private async openInCmd(path: string): Promise<void> {
    this.showLoading('Opening CMD...', path);
    
    try {
      const systemPath = this.convertToSystemPath(path);
      
      if ((window as any).__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_cmd', { path: systemPath });
        console.log('Opened CMD at:', systemPath);
        this.showNotification(`CMD opened at ${this.getShortPath(systemPath)}`, 'success');
      } else {
        console.error('Tauri not available');
        this.showNotification('Desktop app required to open CMD', 'warning');
      }
    } catch (error) {
      console.error('Failed to open CMD:', error);
      this.showNotification('Failed to open CMD', 'error');
    } finally {
      this.hideLoading();
    }
  }

  private async openInPowerShell(path: string): Promise<void> {
    this.showLoading('Opening PowerShell...', path);
    
    try {
      const systemPath = this.convertToSystemPath(path);
      
      if ((window as any).__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_powershell', { path: systemPath });
        console.log('Opened PowerShell at:', systemPath);
        this.showNotification(`PowerShell opened at ${this.getShortPath(systemPath)}`, 'success');
      } else {
        console.error('Tauri not available');
        this.showNotification('Desktop app required to open PowerShell', 'warning');
      }
    } catch (error) {
      console.error('Failed to open PowerShell:', error);
      this.showNotification('Failed to open PowerShell', 'error');
    } finally {
      this.hideLoading();
    }
  }

  private async openInExplorer(path: string, skipLoading: boolean = false): Promise<void> {
    if (!skipLoading) {
      this.showLoading('Opening Explorer...', path);
    }
    
    try {
      const systemPath = this.convertToSystemPath(path);
      
      if ((window as any).__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('reveal_in_explorer', { path: systemPath });
        console.log('Opened in explorer:', systemPath);
        if (!skipLoading) {
          this.showNotification(`Explorer opened at ${this.getShortPath(systemPath)}`, 'success');
        }
      } else {
        console.error('Tauri not available');
        this.showNotification('Desktop app required to open Explorer', 'warning');
      }
    } catch (error) {
      console.error('Failed to open explorer:', error);
      this.showNotification('Failed to open Explorer', 'error');
    } finally {
      if (!skipLoading) {
        this.hideLoading();
      }
    }
  }

  private async copyPath(path: string): Promise<void> {
    try {
      const systemPath = this.convertToSystemPath(path);
      
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(systemPath);
        console.log('Path copied:', systemPath);
        this.showNotification('Path copied to clipboard', 'success');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = systemPath;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this.showNotification('Path copied to clipboard', 'success');
      }
    } catch (error) {
      console.error('Failed to copy path:', error);
      this.showNotification('Failed to copy path', 'error');
    }
  }

  private async copyName(name: string): Promise<void> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(name);
        console.log('Name copied:', name);
        this.showNotification('Name copied to clipboard', 'success');
      } else {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = name;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this.showNotification('Name copied to clipboard', 'success');
      }
    } catch (error) {
      console.error('Failed to copy name:', error);
      this.showNotification('Failed to copy name', 'error');
    }
  }

  /**
   * Copy relative path (relative to project root)
   */
  private async copyRelativePath(path: string): Promise<void> {
    try {
      // Get project root from various sources
      const projectRoot = (window as any).__currentFolderPath || 
                          (window as any).currentFolderPath ||
                          localStorage.getItem('currentProjectPath') ||
                          localStorage.getItem('ide_last_project_path') || '';
      
      let relativePath = path;
      
      if (projectRoot) {
        // Normalize paths for comparison
        const normalizedPath = path.replace(/\\/g, '/');
        const normalizedRoot = projectRoot.replace(/\\/g, '/');
        
        if (normalizedPath.startsWith(normalizedRoot)) {
          relativePath = normalizedPath.substring(normalizedRoot.length);
          if (relativePath.startsWith('/')) {
            relativePath = relativePath.substring(1);
          }
        }
      }
      
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(relativePath);
        console.log('Relative path copied:', relativePath);
        this.showNotification('Relative path copied', 'success');
      }
    } catch (error) {
      console.error('Failed to copy relative path:', error);
      this.showNotification('Failed to copy relative path', 'error');
    }
  }

  /**
   * Save the current file
   */
  private async saveFile(path: string): Promise<void> {
    console.log('💾 Breadcrumb: Saving file...');
    this.showLoading('Saving file...', path);
    
    try {
      // Method 1: Get Monaco editor (same as menuSystem.ts)
      const editor = (window as any).monaco?.editor?.getEditors()?.[0];
      if (!editor) {
        this.showNotification('No file is currently open', 'error');
        this.hideLoading();
        return;
      }
      
      // Get content from editor
      const content = editor.getValue();
      
      // Get current tab info
      const tabMgr = (window as any).tabManager;
      const currentTab = tabMgr?.getActiveTab?.() || tabMgr?.getCurrentTab?.();
      
      if (currentTab && currentTab.path && currentTab.path !== 'Untitled') {
        // Use the same saveFile function from fileSystem
        const { saveFile: saveFileFunc } = await import('../fileSystem');
        await saveFileFunc(content, currentTab.path);
        console.log('✅ File saved successfully to:', currentTab.path);
        
        // ✅ CRITICAL: Mark file as saved (same as menuSystem.ts)
        try {
          const { markFileAsSaved } = await import('./fileExplorer/fileTreeRenderer');
          markFileAsSaved(currentTab.path);
        } catch (e) {
          console.log('Could not import markFileAsSaved:', e);
        }
        
        // Mark tab as saved
        if (tabMgr?.markTabAsSaved) {
          tabMgr.markTabAsSaved(currentTab.id);
        }
        
        // Update Monaco saved version
        this.updateMonacoSavedVersion(currentTab.path);
        
        // Hide save icon
        this.hideSaveIcon();
        
        this.showNotification('File saved successfully', 'success');
        
        // Dispatch save event
        document.dispatchEvent(new CustomEvent('file-saved', {
          detail: { path: currentTab.path }
        }));
        
      } else {
        // No valid path - trigger Save As
        this.showNotification('Please use Save As for new files', 'warning');
        await this.saveFileAs(path);
      }
      
    } catch (error) {
      console.error('❌ Error saving file:', error);
      this.showNotification('Failed to save file', 'error');
    } finally {
      this.hideLoading();
      
      // Re-check modification state
      setTimeout(() => {
        if (this.currentPath) {
          this.checkFileModified(this.currentPath);
        }
      }, 200);
    }
  }

  /**
   * Update Monaco's saved version ID after saving
   */
  private updateMonacoSavedVersion(path: string): void {
    try {
      const monaco = (window as any).monaco;
      if (monaco) {
        const models = monaco.editor.getModels();
        const fileName = path.split(/[/\\]/).pop() || '';
        
        for (const model of models) {
          const modelUri = model.uri.toString();
          if (modelUri.includes(fileName) || modelUri.includes(path.replace(/\\/g, '/'))) {
            // Store current version as saved version
            const currentVersionId = model.getAlternativeVersionId();
            (model as any)._savedVersionId = currentVersionId;
            (model as any).savedVersionId = currentVersionId;
            console.log('📍 Updated Monaco saved version:', currentVersionId);
            break;
          }
        }
      }
    } catch (e) {
      console.log('Failed to update Monaco saved version:', e);
    }
  }

  /**
   * Save file with a new name - SAME LOGIC AS FILE MENU
   */
  private async saveFileAs(path: string): Promise<void> {
    console.log('💾 Breadcrumb: Saving file as...');
    this.showLoading('Opening Save As dialog...', path);
    
    try {
      const editor = (window as any).monaco?.editor?.getEditors()?.[0];
      if (!editor) {
        this.showNotification('No file is currently open', 'error');
        this.hideLoading();
        return;
      }
      
      const content = editor.getValue();
      const tabMgr = (window as any).tabManager;
      const currentTab = tabMgr?.getActiveTab?.() || tabMgr?.getCurrentTab?.();
      const fileName = currentTab?.name || path.split(/[/\\]/).pop() || 'untitled.txt';
      
      // Use the same saveFile function with undefined path (triggers dialog)
      const { saveFile: saveFileFunc } = await import('../fileSystem');
      const savedPath = await saveFileFunc(content, undefined, fileName);
      
      if (savedPath) {
        console.log('✅ File saved as:', savedPath);
        
        // ✅ CRITICAL: Mark as saved
        try {
          const { markFileAsSaved } = await import('./fileExplorer/fileTreeRenderer');
          markFileAsSaved(savedPath);
        } catch (e) {
          console.log('Could not import markFileAsSaved:', e);
        }
        
        // Update tab path and mark as saved
        if (currentTab && tabMgr) {
          tabMgr.updateTabPath?.(currentTab.id, savedPath);
          tabMgr.markTabAsSaved?.(currentTab.id);
        }
        
        // Update Monaco saved version
        this.updateMonacoSavedVersion(savedPath);
        
        // Hide save icon
        this.hideSaveIcon();
        
        this.showNotification(`File saved as: ${savedPath.split(/[/\\]/).pop()}`, 'success');
        
        // Dispatch save event
        document.dispatchEvent(new CustomEvent('file-saved', {
          detail: { path: savedPath }
        }));
      }
      
    } catch (error) {
      console.error('❌ Error saving file as:', error);
      this.showNotification('Failed to save file', 'error');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Rename the file
   */
  private async renameFile(path: string, currentName: string): Promise<void> {
    try {
      // Create rename dialog
      const dialog = document.createElement('div');
      dialog.className = 'breadcrumb-rename-dialog';
      dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(180deg, #2d2d2d 0%, #252526 100%);
        border: 1px solid #3c3c3c;
        border-radius: 8px;
        padding: 20px;
        z-index: 100002;
        min-width: 350px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
        animation: contextMenuSlideIn 0.15s ease-out;
      `;
      
      dialog.innerHTML = `
        <div style="color: #cccccc; font-size: 14px; margin-bottom: 16px; font-weight: 500;">Rename File</div>
        <input type="text" id="rename-input" value="${currentName}" style="
          width: 100%;
          padding: 10px 12px;
          background: #1e1e1e;
          border: 1px solid #3c3c3c;
          border-radius: 4px;
          color: #ffffff;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
          margin-bottom: 16px;
        " />
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button id="rename-cancel" style="
            padding: 8px 16px;
            background: transparent;
            border: 1px solid #3c3c3c;
            border-radius: 4px;
            color: #cccccc;
            cursor: pointer;
            font-size: 13px;
          ">Cancel</button>
          <button id="rename-confirm" style="
            padding: 8px 16px;
            background: #0e639c;
            border: none;
            border-radius: 4px;
            color: #ffffff;
            cursor: pointer;
            font-size: 13px;
          ">Rename</button>
        </div>
      `;
      
      // Add overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 100001;
      `;
      
      document.body.appendChild(overlay);
      document.body.appendChild(dialog);
      
      const input = document.getElementById('rename-input') as HTMLInputElement;
      const cancelBtn = document.getElementById('rename-cancel');
      const confirmBtn = document.getElementById('rename-confirm');
      
      // Select filename without extension
      const dotIndex = currentName.lastIndexOf('.');
      if (dotIndex > 0) {
        input.setSelectionRange(0, dotIndex);
      } else {
        input.select();
      }
      input.focus();
      
      const cleanup = () => {
        dialog.remove();
        overlay.remove();
      };
      
      const performRename = async () => {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
          this.showLoading('Renaming file...', newName);
          try {
            if ((window as any).__TAURI__) {
              const { invoke } = await import('@tauri-apps/api/core');
              const parentPath = path.substring(0, path.lastIndexOf('/'));
              const newPath = `${parentPath}/${newName}`;
              await invoke('rename_file', { oldPath: path, newPath });
              this.showNotification(`Renamed to ${newName}`, 'success');
              
              // Dispatch event to refresh file explorer
              document.dispatchEvent(new CustomEvent('file-renamed', { 
                detail: { oldPath: path, newPath, newName } 
              }));
            }
          } catch (error) {
            console.error('Failed to rename:', error);
            this.showNotification('Failed to rename file', 'error');
          } finally {
            this.hideLoading();
          }
        }
        cleanup();
      };
      
      cancelBtn?.addEventListener('click', cleanup);
      overlay.addEventListener('click', cleanup);
      confirmBtn?.addEventListener('click', performRename);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') performRename();
        if (e.key === 'Escape') cleanup();
      });
      
    } catch (error) {
      console.error('Failed to open rename dialog:', error);
      this.showNotification('Failed to open rename dialog', 'error');
    }
  }

  /**
   * Close the file/tab
   */
  private async closeFile(path: string): Promise<void> {
    try {
      // Try various methods to close the file
      if ((window as any).tabManager?.closeTab) {
        (window as any).tabManager.closeTab(path);
        this.showNotification('File closed', 'info');
      } else if ((window as any).closeTab) {
        (window as any).closeTab(path);
        this.showNotification('File closed', 'info');
      } else {
        // Dispatch close event
        document.dispatchEvent(new CustomEvent('close-file', { detail: { path } }));
        
        // Also try Ctrl+W simulation
        const event = new KeyboardEvent('keydown', {
          key: 'w',
          code: 'KeyW',
          ctrlKey: true,
          bubbles: true
        });
        document.dispatchEvent(event);
        
        this.showNotification('Close command sent', 'info');
      }
    } catch (error) {
      console.error('Failed to close file:', error);
      this.showNotification('Failed to close file', 'error');
    }
  }

  private async navigateToPath(path: string, name: string): Promise<void> {
    console.log('📍 Navigating to folder:', path);
    
    this.showLoading('Navigating to folder...', name);
    
    try {
      // Expand the folder in the IDE file tree
      this.expandFolderInTree(path);
      
      // Load folder contents in IDE
      await this.loadFolderInIDE(path);
      
      // 🆕 Open folder in Windows Explorer (skip loading since we already have one)
      await this.openInExplorer(path, true);
      
      // Dispatch navigation event for other components
      document.dispatchEvent(new CustomEvent('breadcrumb-navigate', {
        detail: { 
          path: path,
          name: name,
          isFolder: true 
        }
      }));
      
      this.showNotification(`Navigated to ${name}`, 'success');
      
    } catch (error) {
      console.error('Error navigating to path:', error);
      this.showNotification(`Failed to navigate to: ${name}`, 'error');
    } finally {
      this.hideLoading();
    }
  }

  private expandFolderInTree(path: string): void {
    console.log('📂 Expanding folder in tree:', path);
    
    // Split the path into segments
    const segments = path.split('/').filter(s => s.length > 0);
    let currentPath = '';
    
    // Progressively expand each folder in the path
    segments.forEach((segment, index) => {
      currentPath = segments.slice(0, index + 1).join('/');
      
      // Try multiple selectors to find the folder element
      const selectors = [
        `[data-path="${currentPath}"]`,
        `[data-path="${currentPath.replace(/\//g, '\\\\')}"]`,
        `[data-path*="${segment}"]`
      ];
      
      let folderElement: HTMLElement | null = null;
      for (const selector of selectors) {
        folderElement = document.querySelector(selector) as HTMLElement;
        if (folderElement) break;
      }
      
      if (folderElement) {
        // Check if it's a folder and expand it
        if (folderElement.classList.contains('folder-item') || 
            folderElement.classList.contains('directory')) {
          // Find and click the toggle
          const toggle = folderElement.querySelector('.folder-toggle, .tree-toggle, [class*="toggle"]');
          if (toggle && !toggle.classList.contains('expanded')) {
            (toggle as HTMLElement).click();
            console.log('✅ Expanded folder:', segment);
          }
          
          // Highlight the folder temporarily
          const originalBg = folderElement.style.backgroundColor;
          folderElement.style.backgroundColor = 'rgba(0, 120, 215, 0.3)';
          folderElement.style.transition = 'background-color 0.3s ease';
          
          setTimeout(() => {
            folderElement.style.backgroundColor = originalBg;
          }, 1500);
          
          // Scroll into view
          if (index === segments.length - 1) {
            folderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    });
  }

  private async loadFolderInIDE(path: string): Promise<void> {
    console.log('📍 Loading folder in IDE:', path);
    
    try {
      // Try various methods to load the folder
      if ((window as any).fileExplorer?.loadFolder) {
        await (window as any).fileExplorer.loadFolder(path);
      } else if ((window as any).fileExplorerAPI?.openFolder) {
        await (window as any).fileExplorerAPI.openFolder(path);
      } else if ((window as any).folderManager?.openFolder) {
        await (window as any).folderManager.openFolder(path);
      } else if ((window as any).integratedFolderManager?.loadFolder) {
        await (window as any).integratedFolderManager.loadFolder(path);
      }
    } catch (error) {
      console.warn('Could not load folder in IDE:', error);
    }
  }

  private convertToSystemPath(path: string): string {
    // If it's already a full system path, just clean it
    if (path.includes(':') || path.startsWith('/')) {
      // For Windows paths, ensure proper backslashes
      if (path.includes(':')) {
        return path.replace(/\//g, '\\');
      }
      return path;
    }
    
    // Get the current project path
    const projectPath = localStorage.getItem('currentProjectPath') || '';
    
    if (projectPath) {
      // Handle different OS path separators
      const separator = projectPath.includes('\\') ? '\\' : '/';
      return `${projectPath}${separator}${path.replace(/[/\\]/g, separator)}`;
    }
    
    return path;
  }

  private getShortPath(path: string): string {
    const parts = path.split(/[/\\]/);
    if (parts.length > 3) {
      return '...' + parts.slice(-2).join('/');
    }
    return path;
  }

  private showNotification(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
    // Remove existing toast
    const existingToast = document.querySelector('.breadcrumb-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `breadcrumb-toast toast-${type}`;
    toast.textContent = message;
    
    const colors = {
      error: '#f44336',
      success: '#4caf50',
      warning: '#ff9800',
      info: '#2196f3'
    };
    
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${colors[type]};
      color: white;
      border-radius: 4px;
      z-index: 10001;
      animation: slideIn 0.3s ease;
      font-size: 14px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  private setupEventListeners(): void {
    // Listen for tab changes
    document.addEventListener('tab-changed', (e: any) => {
      console.log('📍 Tab changed event received:', e.detail);
      if (e.detail?.path) {
        this.updateBreadcrumb(e.detail.path);
      }
    });
    
    // Listen for file opens
    document.addEventListener('file-opened', (e: any) => {
      console.log('📍 File opened event received:', e.detail);
      if (e.detail?.path) {
        this.updateBreadcrumb(e.detail.path);
        // New file is not modified initially
        this.hideSaveIcon();
      }
    });
    
    // Listen for file selection
    document.addEventListener('file-selected', (e: any) => {
      console.log('📍 File selected event received:', e.detail);
      if (e.detail?.path) {
        this.updateBreadcrumb(e.detail.path);
      }
    });

    // Listen for tab activation
    document.addEventListener('tab-activated', (e: any) => {
      console.log('📍 Tab activated event received:', e.detail);
      if (e.detail?.path) {
        this.updateBreadcrumb(e.detail.path);
      }
    });

    // ✅ Listen for file modification (show save icon)
    document.addEventListener('file-modified', (e: any) => {
      console.log('📍 File modified event received:', e.detail);
      if (e.detail?.path === this.currentPath || !e.detail?.path) {
        // Re-check via Monaco to ensure accuracy
        setTimeout(() => {
          if (this.currentPath) {
            this.checkFileModified(this.currentPath);
          }
        }, 50);
      }
    });

    // ✅ Listen for file saved (hide save icon)
    document.addEventListener('file-saved', (e: any) => {
      console.log('📍 File saved event received:', e.detail);
      if (e.detail?.path === this.currentPath || !e.detail?.path) {
        // Update Monaco saved version
        if (this.currentPath) {
          this.updateMonacoSavedVersion(this.currentPath);
        }
        this.hideSaveIcon();
        // Re-check after a delay to confirm
        setTimeout(() => {
          if (this.currentPath) {
            this.checkFileModified(this.currentPath);
          }
        }, 100);
      }
    });

    // ✅ Listen for content changed in editor
    document.addEventListener('editor-content-changed', (e: any) => {
      console.log('📍 Editor content changed:', e.detail);
      // Re-check via Monaco to ensure accuracy
      setTimeout(() => {
        if (this.currentPath) {
          this.checkFileModified(this.currentPath);
        }
      }, 50);
    });

    // ✅ Listen for tab modified state change
    document.addEventListener('tab-modified', (e: any) => {
      console.log('📍 Tab modified event received:', e.detail);
      if (e.detail?.path === this.currentPath || !e.detail?.path) {
        // Re-check via Monaco instead of trusting the event
        setTimeout(() => {
          if (this.currentPath) {
            this.checkFileModified(this.currentPath);
          }
        }, 50);
      }
    });

    // ✅ Listen for Ctrl+S keyboard shortcut (external save)
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        // File is being saved via keyboard shortcut
        console.log('📍 Ctrl+S detected - file being saved');
        // Update Monaco saved version after a short delay
        setTimeout(() => {
          if (this.currentPath) {
            this.updateMonacoSavedVersion(this.currentPath);
            this.hideSaveIcon();
            // Double-check after save completes
            setTimeout(() => this.checkFileModified(this.currentPath), 200);
          }
        }, 100);
      }
    });

    // ✅ Listen for undo operations (Ctrl+Z)
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // Undo detected - need to recheck modification state and counters
        console.log('📍 Ctrl+Z detected - updating state');
        setTimeout(() => {
          if (this.currentPath) {
            this.checkFileModified(this.currentPath);
            this.updateUndoRedoCounters();
          }
        }, 100);
      }
    });

    // ✅ Listen for redo operations (Ctrl+Y or Ctrl+Shift+Z)
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z') || (e.shiftKey && e.key === 'Z'))) {
        // Redo detected - need to recheck modification state and counters
        console.log('📍 Ctrl+Y/Ctrl+Shift+Z detected - updating state');
        setTimeout(() => {
          if (this.currentPath) {
            this.checkFileModified(this.currentPath);
            this.updateUndoRedoCounters();
          }
        }, 100);
      }
    });

    // Listen for project events
    document.addEventListener('project-opened', (e: any) => {
      console.log('📍 Project opened event received:', e.detail);
      if (e.detail?.path) {
        const projectName = e.detail.name || e.detail.path.split('/').pop();
        this.updateBreadcrumb(projectName);
      }
    });

    document.addEventListener('project-closed', () => {
      console.log('📍 Project closed event received');
      this.clear();
    });

    // Listen for breadcrumb clear events
    document.addEventListener('breadcrumb-clear', () => {
      this.clear();
    });
  }

  public clear(): void {
    if (this.container) {
      this.container.innerHTML = '<span class="breadcrumb-item">No file selected</span>';
      this.currentPath = '';
    }
    this.hideSaveIcon();
  }

  public updateFromFileNode(fileNode: any): void {
    if (fileNode && fileNode.path) {
      let fullPath = fileNode.path;
      
      // If the path doesn't start with root, prepend the project path
      const currentProject = localStorage.getItem('currentProjectPath');
      if (currentProject && !fullPath.startsWith('/') && !fullPath.includes(':')) {
        fullPath = `${currentProject}/${fullPath}`;
      }
      
      this.updateBreadcrumb(fullPath);
    }
  }

  // Force refresh the breadcrumb position (useful after layout changes)
  public refreshPosition(): void {
    if (!this.container) return;
    
    // Check if container is in the correct position
    const parent = this.container.parentElement;
    const editorPanel = document.querySelector('.editor-panel');
    const monacoEditor = document.getElementById('monaco-editor');
    
    // If it's attached to body (fallback), try to move it to a better position
    if (parent === document.body && monacoEditor && monacoEditor.parentElement) {
      monacoEditor.parentElement.insertBefore(this.container, monacoEditor);
      console.log('📍 Breadcrumb repositioned');
    }
  }

  // Get current breadcrumb path
  public getCurrentPath(): string | null {
    return this.currentPath || null;
  }

  // Check if breadcrumb is visible
  public isVisible(): boolean {
    return this.container !== null && this.container.offsetParent !== null;
  }

  // Manual navigation method
  public navigateToFolder(folderPath: string): void {
    const name = folderPath.split('/').pop() || folderPath;
    this.navigateToPath(folderPath, name);
  }

  // ✅ Public loading methods for use by other components
  public showLoadingOverlay(message: string = 'Loading...', subtext: string = ''): void {
    this.showLoading(message, subtext);
  }

  public hideLoadingOverlay(): void {
    this.hideLoading();
  }
}

// Create and export singleton instance
export const breadcrumbManager = new BreadcrumbManager();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).breadcrumbManager = breadcrumbManager;
  
  // ✅ Export global loading utility functions
  (window as any).showIDELoading = (message: string = 'Loading...', subtext: string = '') => {
    breadcrumbManager.showLoadingOverlay(message, subtext);
  };
  
  (window as any).hideIDELoading = () => {
    breadcrumbManager.hideLoadingOverlay();
  };
  
  // ✅ Export global save icon utility functions
  (window as any).showBreadcrumbSaveIcon = () => {
    breadcrumbManager.showSaveIcon();
  };
  
  (window as any).hideBreadcrumbSaveIcon = () => {
    breadcrumbManager.hideSaveIcon();
  };
  
  // ✅ Helper to trigger file modified event
  (window as any).markFileModified = (path?: string) => {
    document.dispatchEvent(new CustomEvent('file-modified', { detail: { path } }));
  };
  
  // ✅ Helper to trigger file saved event
  (window as any).markFileSaved = (path?: string) => {
    document.dispatchEvent(new CustomEvent('file-saved', { detail: { path } }));
  };
  
  // ✅ Helper to update undo/redo counters
  (window as any).updateUndoRedoCounters = () => {
    breadcrumbManager.updateUndoRedoCounters();
  };
}

// Add CSS animations
if (!document.getElementById('breadcrumb-animations')) {
  const style = document.createElement('style');
  style.id = 'breadcrumb-animations';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
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
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}