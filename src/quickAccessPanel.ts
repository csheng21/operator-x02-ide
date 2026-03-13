// quickAccessPanel.ts - FIXED VERSION
// Prevents arrow icon duplication and ensures proper cleanup

import { PathManager } from './fileSystem';
import { invoke } from '@tauri-apps/api/core';

interface QuickAccessOptions {
  onSelect: (path: string | null) => void;
  onBrowse: () => void;
  maxRecentFolders?: number;
}

export class QuickAccessPanel {
  private overlay: HTMLElement | null = null;
  private panel: HTMLElement | null = null;
  private isOpen: boolean = false;
  private escHandler: ((e: KeyboardEvent) => void) | null = null;
  private cleanupTasks: (() => void)[] = [];

  /**
   * Show the Quick Access Panel
   */
  async show(options: QuickAccessOptions): Promise<void> {
    // ✅ FIX 1: Prevent duplicate panels
    if (this.isOpen) {
      console.warn('⚠️ Quick Access Panel already open, ignoring duplicate call');
      return;
    }
    
    // ✅ FIX 2: Force cleanup any leftover panels
    this.forceCleanup();
    
    this.isOpen = true;

    const recentFolders = PathManager.getRecentFolders().slice(0, options.maxRecentFolders || 10);
    
    // Create overlay backdrop
    this.overlay = this.createOverlay();
    
    // Create the panel
    this.panel = this.createPanel(recentFolders, options);
    
    // Add to DOM
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.panel);

    // ============================================================================
    // ENHANCED: Search filter + Quick shortcut handlers
    // ============================================================================
    setTimeout(() => {
      const searchInput = document.getElementById('qa-folder-search') as HTMLInputElement | null;
      const pathOpenBtn = document.getElementById('qa-path-open-btn');
      const openTypedPathBtn = document.getElementById('qa-open-typed-path');

      if (searchInput) {
        searchInput.addEventListener('input', () => {
          const query = searchInput.value.toLowerCase().trim();
          const isPath = /[\\\/]/.test(searchInput.value) || /^[A-Z]:/i.test(searchInput.value);
          if (pathOpenBtn) pathOpenBtn.style.display = (isPath && searchInput.value.length > 3) ? 'block' : 'none';
          document.querySelectorAll('[data-folder-path]').forEach((item: any) => {
            const path = (item.getAttribute('data-folder-path') || '').toLowerCase();
            item.style.display = (!query || path.includes(query)) ? '' : 'none';
          });
        });
        searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' && /[\\\/]/.test(searchInput.value)) {
            options.onSelect(searchInput.value.trim());
            this.close();
          }
        });
        searchInput.focus();
      }

      if (openTypedPathBtn && searchInput) {
        openTypedPathBtn.addEventListener('click', () => {
          if (searchInput.value.trim()) { options.onSelect(searchInput.value.trim()); this.close(); }
        });
      }

      document.querySelectorAll('.qa-shortcut-btn').forEach(btn => {
        (btn as HTMLElement).style.cursor = 'pointer';
        btn.addEventListener('mouseover', () => { (btn as HTMLElement).style.background = '#333'; (btn as HTMLElement).style.borderColor = '#0078d4'; });
        btn.addEventListener('mouseout', () => { (btn as HTMLElement).style.background = '#2a2a2a'; (btn as HTMLElement).style.borderColor = '#3a3a3a'; });
        btn.addEventListener('click', async () => {
          const shortcut = btn.getAttribute('data-shortcut');
          try {
            const inv = (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI__?.invoke || invoke;
            const sysInfo = await inv('get_system_info').catch(() => ({} as any));
            const home = sysInfo?.home_dir || '';
            let target = '';
            if (shortcut === 'desktop') target = home + '\\Desktop';
            else if (shortcut === 'documents') target = sysInfo?.documents_dir || home + '\\Documents';
            else if (shortcut === 'downloads') target = sysInfo?.downloads_dir || home + '\\Downloads';
            else if (shortcut === 'projects') target = home + '\\PycharmProjects';
            if (target) { options.onSelect(target); this.close(); }
          } catch (e) { console.error('Shortcut failed:', e); options.onBrowse(); this.close(); }
        });
      });
    }, 50);
    
    // Setup event listeners
    this.setupEventListeners(options);
    
    // Focus first item for keyboard navigation
    this.focusFirstItem();
  }

  /**
   * Hide and cleanup the panel
   */
  hide(): void {
    if (!this.isOpen) return;
    
    console.log('🧹 Cleaning up Quick Access Panel...');
    
    this.isOpen = false;
    
    // ✅ FIX 3: Run all cleanup tasks
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('Cleanup task failed:', error);
      }
    });
    this.cleanupTasks = [];
    
    // Remove ESC handler
    if (this.escHandler) {
      document.removeEventListener('keydown', this.escHandler);
      this.escHandler = null;
    }
    
    // Remove DOM elements
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
    
    console.log('✅ Quick Access Panel cleaned up');
  }

  /**
   * ✅ FIX 4: Force cleanup any leftover panels from previous instances
   */

  /**
   * Close with exit animation
   */
  close(): void {
    if (!this.isOpen) return;

    // Animate out
    if (this.panel) {
      this.panel.style.animation = 'qaPanelExit 0.25s cubic-bezier(0.4, 0, 1, 1) forwards';
    }
    if (this.overlay) {
      this.overlay.style.animation = 'qaOverlayOut 0.25s ease forwards';
    }

    // Remove after animation completes
    setTimeout(() => {
      this.forceCleanup();
    }, 260);
  }

  private forceCleanup(): void {
    // Remove any existing overlays
    document.querySelectorAll('.quick-access-overlay').forEach(el => el.remove());
    
    // Remove any existing panels
    document.querySelectorAll('.quick-access-panel').forEach(el => el.remove());
    
    console.log('🧹 Forced cleanup of any leftover panels');
  }

  /**
   * Create overlay backdrop
   */
  private createOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'quick-access-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 9999;
      backdrop-filter: blur(3px);
      animation: qaOverlayIn 0.3s ease both;
    `;
    return overlay;
  }

  /**
   * Create the main panel
   */
  private createPanel(recentFolders: string[], options: QuickAccessOptions): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'quick-access-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #252526;
      border: 1px solid #3e3e42;
      border-radius: 8px;
      padding: 20px;
      max-width: 550px;
      width: 90%;
      max-height: 600px;
      overflow-y: auto;
      z-index: 10000;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      animation: qaPanelEnter 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
    `;

    panel.innerHTML = `
      <style>
        /* ===== ENTRANCE ANIMATIONS ===== */
        @keyframes qaPanelEnter {
          0% {
            opacity: 0;
            transform: translate(-50%, -46%) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        @keyframes qaOverlayIn {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(3px); }
        }
        @keyframes qaFadeDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes qaSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes qaFolderSlideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }

        /* ===== EXIT ANIMATIONS ===== */
        @keyframes qaPanelExit {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -46%) scale(0.96);
          }
        }
        @keyframes qaOverlayOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        /* ===== HOVER & INTERACTIVE ===== */
        .qa-shortcut-btn {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .qa-shortcut-btn:hover {
          background: #2d2d32 !important;
          border-color: #0078d4 !important;
          color: #fff !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,120,212,0.2);
        }
        .qa-shortcut-btn:active {
          transform: translateY(0px) scale(0.97);
          transition-duration: 0.08s;
        }
        #qa-folder-search {
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        #qa-folder-search:focus {
          border-color: #0078d4 !important;
          box-shadow: 0 0 0 2px rgba(0,120,212,0.25);
        }
        #qa-open-typed-path:hover {
          background: #1177bb !important;
        }

        /* ===== RECENT FOLDER ITEMS ===== */
        .quick-access-panel [data-folder-path] {
          animation: qaFolderSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .quick-access-panel [data-folder-path]:nth-child(1) { animation-delay: 0.06s; }
        .quick-access-panel [data-folder-path]:nth-child(2) { animation-delay: 0.10s; }
        .quick-access-panel [data-folder-path]:nth-child(3) { animation-delay: 0.14s; }
        .quick-access-panel [data-folder-path]:nth-child(4) { animation-delay: 0.18s; }
        .quick-access-panel [data-folder-path]:nth-child(5) { animation-delay: 0.22s; }

        /* ===== BROWSE BUTTON PULSE ===== */
        .quick-access-panel button[style*="Browse"] {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .qa-refresh-btn:hover {
          color: #fff !important;
          background: #333 !important;
        }
      </style>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 20px;">📂</span>
          <h3 style="margin: 0; color: #fff; font-size: 16px; font-weight: 600;">
            Open Folder
          </h3>
        </div>
        <button class="qa-close-btn" style="
          background: none;
          border: none;
          color: #ccc;
          cursor: pointer;
          font-size: 22px;
          padding: 0;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s ease;
        " title="Close (Esc)">×</button>
      </div>

      <button class="qa-browse-btn" style="
        width: 100%;
        padding: 14px 16px;
        background: #007acc;
        border: none;
        border-radius: 5px;
        color: white;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: center;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(0, 122, 204, 0.3);
      ">
        <span style="font-size: 18px;">📁</span>
        <span>Browse for New Folder...</span>
      </button>

      ${recentFolders.length > 0 ? `
        <div style="
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #3e3e42;
          display: flex;
          flex-direction: column;
          gap: 0;
        ">

            <!-- QUICK ACCESS SHORTCUTS -->
            <div style="margin-bottom: 16px; animation: qaFadeDown 0.3s ease-out both; animation-delay: 0.05s;">
              <div style="margin-bottom: 8px;">
                <span style="color: #888; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 1px;">Quick Access</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <div class="qa-shortcut-btn" data-shortcut="desktop" style="
                  display: flex; align-items: center; gap: 8px; padding: 9px 12px;
                  background: #252528; border: 1px solid #3a3a3a; border-radius: 8px;
                  color: #bbb; font-size: 12px; cursor: pointer;
                  transition: all 0.2s ease; position: relative; overflow: hidden;">
                  <span style="font-size: 15px; opacity: 0.85;">&#128421;</span>
                  <span>Desktop</span>
                </div>
                <div class="qa-shortcut-btn" data-shortcut="documents" style="
                  display: flex; align-items: center; gap: 8px; padding: 9px 12px;
                  background: #252528; border: 1px solid #3a3a3a; border-radius: 8px;
                  color: #bbb; font-size: 12px; cursor: pointer;
                  transition: all 0.2s ease; position: relative; overflow: hidden;">
                  <span style="font-size: 15px; opacity: 0.85;">&#128196;</span>
                  <span>Documents</span>
                </div>
                <div class="qa-shortcut-btn" data-shortcut="downloads" style="
                  display: flex; align-items: center; gap: 8px; padding: 9px 12px;
                  background: #252528; border: 1px solid #3a3a3a; border-radius: 8px;
                  color: #bbb; font-size: 12px; cursor: pointer;
                  transition: all 0.2s ease; position: relative; overflow: hidden;">
                  <span style="font-size: 15px; opacity: 0.85;">&#11015;&#65039;</span>
                  <span>Downloads</span>
                </div>
                <div class="qa-shortcut-btn" data-shortcut="projects" style="
                  display: flex; align-items: center; gap: 8px; padding: 9px 12px;
                  background: #252528; border: 1px solid #3a3a3a; border-radius: 8px;
                  color: #bbb; font-size: 12px; cursor: pointer;
                  transition: all 0.2s ease; position: relative; overflow: hidden;">
                  <span style="font-size: 15px; opacity: 0.85;">&#128193;</span>
                  <span>Projects</span>
                </div>
              </div>
            </div>

            <!-- SEARCH / FILTER BAR -->
            <div style="margin-bottom: 14px; animation: qaFadeDown 0.3s ease-out both; animation-delay: 0.12s;">
              <div style="position: relative;">
                <input id="qa-folder-search" type="text" placeholder="Search folders or type a path..." style="
                  width: 100%; box-sizing: border-box; padding: 10px 12px 10px 34px;
                  background: #1a1a1d; border: 1px solid #3a3a3a; border-radius: 8px;
                  color: #e0e0e0; font-size: 12.5px; font-family: inherit; outline: none;
                  transition: border-color 0.2s ease, box-shadow 0.2s ease;" />
                <span style="position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #555; font-size: 13px; pointer-events: none;">&#128269;</span>
              </div>
              <div id="qa-path-open-btn" style="display: none; margin-top: 8px;">
                <button id="qa-open-typed-path" style="
                  width: 100%; padding: 8px; background: #0e639c; border: none; border-radius: 6px;
                  color: white; font-size: 12px; cursor: pointer; transition: background 0.2s ease;
                  ">&#128194; Open this path</button>
              </div>
            </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; animation: qaFadeDown 0.3s ease-out both; animation-delay: 0.18s;">
            <span style="color: #888; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 1px;">Recent Folders</span>
            <button class="qa-refresh-btn" style="
              background: none; border: none; color: #888; font-size: 12px;
              cursor: pointer; padding: 2px 6px; border-radius: 4px;
              transition: all 0.2s ease;"
              onmouseover="this.style.color='#fff'; this.style.background='#333'"
              onmouseout="this.style.color='#888'; this.style.background='none'">
              &#8635; Refresh
            </button>
          </div>
        </div>
        
        <div class="qa-recent-list" style="display: flex; flex-direction: column; gap: 8px;">
          ${recentFolders.map((folder, index) => this.createFolderItem(folder, index)).join('')}
        </div>
      ` : `
        <div style="
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #3e3e42;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <div style="
            color: #999;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            font-weight: 600;
          ">
            Recent Folders
          </div>
          <button class="qa-refresh-btn" style="
            background: none;
            border: none;
            color: #888;
            cursor: pointer;
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 5px;
          " title="Refresh list">
            <svg class="refresh-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 2v6h-6"></path>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
              <path d="M3 22v-6h6"></path>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
            </svg>
            <span>Refresh</span>
          </button>
        </div>
        
        <div class="qa-recent-list" style="display: flex; flex-direction: column; gap: 8px;">
          <div style="
            text-align: center;
            color: #888;
            padding: 40px 20px;
            font-size: 13px;
            line-height: 1.6;
          ">
            <div style="font-size: 48px; margin-bottom: 16px;">📂</div>
            <div style="color: #aaa; margin-bottom: 8px;">No recent folders yet</div>
            <div>Click "Browse" above to open your first folder</div>
          </div>
        </div>
      `}

      ${recentFolders.length > 0 ? `
        <div style="
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #3e3e42;
          text-align: center;
        ">
          <button class="qa-clear-btn" style="
            background: none;
            border: 1px solid #666;
            color: #999;
            padding: 6px 14px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
          ">
            Clear Recent Folders
          </button>
        </div>
      ` : ''}
    `;

    return panel;
  }

  /**
   * Create a single folder item
   * ✅ FIX 5: Simplified - removed any potential duplicate content
   */
  private createFolderItem(folderPath: string, index: number): string {
    const folderName = this.getFolderName(folderPath);
    const isWindows = folderPath.includes('\\');
    const separator = isWindows ? '\\' : '/';
    const parentPath = folderPath.split(separator).slice(0, -1).join(separator);

    return `
      <div data-folder-path="${folderPath}" 
        class="qa-folder-item" 
        data-path="${folderPath}"
        data-index="${index}"
        tabindex="0"
        role="button"
        style="
          padding: 14px 16px;
          background: #2d2d30;
          border: 1px solid #3e3e42;
          border-radius: 5px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s ease;
        "
      >
        <span style="font-size: 20px; flex-shrink: 0;">📁</span>
        <div style="flex: 1; overflow: hidden; min-width: 0;">
          <div style="
            color: #fff;
            font-size: 14px;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 3px;
          ">
            ${folderName}
          </div>
          <div style="
            color: #888;
            font-size: 11px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          " title="${folderPath}">
            ${parentPath || folderPath}
          </div>
        </div>
        <div style="
          color: #666;
          font-size: 11px;
          flex-shrink: 0;
          opacity: 0;
          transition: opacity 0.2s ease;
        " class="qa-open-hint">
          Press Enter ↵
        </div>
      </div>
    `;
  }

  /**
   * Get folder name from full path
   */
  private getFolderName(path: string): string {
    const isWindows = path.includes('\\');
    const separator = isWindows ? '\\' : '/';
    const parts = path.split(separator).filter(p => p.length > 0);
    return parts[parts.length - 1] || path;
  }

  /**
   * Setup all event listeners
   * ✅ FIX 6: Store cleanup functions for proper removal
   */
  private setupEventListeners(options: QuickAccessOptions): void {
    if (!this.panel || !this.overlay) return;

    const closeBtn = this.panel.querySelector('.qa-close-btn');
    const browseBtn = this.panel.querySelector('.qa-browse-btn');
    const clearBtn = this.panel.querySelector('.qa-clear-btn');

    // Close button
    const closeHandler = () => {
      this.hide();
      options.onSelect(null);
    };
    closeBtn?.addEventListener('click', closeHandler);
    this.cleanupTasks.push(() => closeBtn?.removeEventListener('click', closeHandler));

    // Browse button
    const browseHandler = () => {
      this.hide();
      options.onBrowse();
    };
    browseBtn?.addEventListener('click', browseHandler);
    this.cleanupTasks.push(() => browseBtn?.removeEventListener('click', browseHandler));

    // Clear button - ✅ FIXED: Properly clear ALL localStorage keys and refresh UI
    const clearHandler = () => {
      console.log('🗑️ Clearing ALL recent folders...');
      
      // ✅ Clear from PathManager (if available)
      try {
        if (PathManager?.clearRecentFolders) {
          PathManager.clearRecentFolders();
          console.log('✅ Cleared via PathManager');
        }
      } catch (e) {
        console.warn('PathManager.clearRecentFolders failed:', e);
      }
      
      // ✅ Clear ALL possible localStorage keys (different modules use different keys)
      const keysToRemove = [
        'ai_ide_recent_folders',      // SimplePathManager
        'ide_recent_folders',         // Alternative key
        'recentFolders',              // Generic key
        'recent_folders',             // Snake case
        'recent-folders',             // Kebab case
        'pathManager_recentFolders',  // PathManager possible key
        'fileSystem_recentFolders',   // FileSystem possible key
        'qa_recent_folders',          // Quick Access key
        'quick_access_folders',       // Quick Access alt key
        // Note: ai_ide_path_memory is handled separately to preserve other path data
      ];
      
      keysToRemove.forEach(key => {
        try {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`✅ Cleared localStorage key: ${key}`);
          }
        } catch (e) {
          console.warn(`Failed to clear ${key}:`, e);
        }
      });
      
      // ✅ Also search for any key containing 'folder' or 'recent'
      try {
        const allKeys = Object.keys(localStorage);
        allKeys.forEach(key => {
          const lowerKey = key.toLowerCase();
          if ((lowerKey.includes('recent') && lowerKey.includes('folder')) ||
              (lowerKey.includes('path') && lowerKey.includes('recent'))) {
            localStorage.removeItem(key);
            console.log(`✅ Cleared matching key: ${key}`);
          }
        });
      } catch (e) {
        console.warn('Failed to scan localStorage:', e);
      }
      
      // ✅ IMPORTANT: Clear PathManager's memory.recentFolders specifically
      try {
        const pathMemoryKey = 'ai_ide_path_memory';
        const stored = localStorage.getItem(pathMemoryKey);
        if (stored) {
          const memory = JSON.parse(stored);
          memory.recentFolders = []; // Clear only the recent folders array
          localStorage.setItem(pathMemoryKey, JSON.stringify(memory));
          console.log('✅ Cleared PathManager recentFolders');
        }
      } catch (e) {
        console.warn('Failed to clear PathManager memory:', e);
      }
      
      console.log('🗑️ Finished clearing all recent folders');
      
      // ✅ Clear the list in UI immediately
      const recentList = this.panel?.querySelector('.qa-recent-list');
      if (recentList) {
        recentList.innerHTML = `
          <div style="
            text-align: center;
            padding: 30px;
            color: #666;
          ">
            <div style="font-size: 32px; margin-bottom: 10px;">📁</div>
            <div>No recent folders</div>
            <div style="font-size: 11px; margin-top: 5px;">Click "Browse for New Folder" to get started</div>
          </div>
        `;
      }
      
      // Hide the clear button since there's nothing to clear (keep refresh visible)
      const clearBtnElement = this.panel?.querySelector('.qa-clear-btn') as HTMLElement;
      if (clearBtnElement) {
        clearBtnElement.style.display = 'none';
      }
      
      this.showNotification('✅ Recent folders cleared', 'success');
    };
    clearBtn?.addEventListener('click', clearHandler);
    this.cleanupTasks.push(() => clearBtn?.removeEventListener('click', clearHandler));

    // ✅ NEW: Refresh button handler with smooth animation
    const refreshBtn = this.panel.querySelector('.qa-refresh-btn');
    const refreshHandler = () => {
      console.log('🔄 Refreshing recent folders...');
      
      const refreshBtnEl = this.panel?.querySelector('.qa-refresh-btn') as HTMLElement;
      const refreshIcon = refreshBtnEl?.querySelector('.refresh-icon') as HTMLElement;
      
      // Start spinning animation
      if (refreshIcon) {
        refreshIcon.classList.add('spinning');
      }
      
      // Small delay for visual feedback
      setTimeout(() => {
        // Get fresh data from PathManager
        const freshFolders = PathManager.getRecentFolders().slice(0, options.maxRecentFolders || 10);
        console.log('📂 Fresh folders:', freshFolders.length);
        
        // Update the list UI
        const recentList = this.panel?.querySelector('.qa-recent-list');
        if (recentList) {
          if (freshFolders.length > 0) {
            // Fade out current items
            recentList.classList.add('refreshing');
            
            setTimeout(() => {
              recentList.innerHTML = freshFolders.map((folder, index) => this.createFolderItem(folder, index)).join('');
              
              // Re-attach click handlers to new folder items
              const newFolderItems = recentList.querySelectorAll('.qa-folder-item');
              newFolderItems.forEach(item => {
                const element = item as HTMLElement;
                const folderPath = element.dataset.path;
                
                element.addEventListener('click', () => {
                  if (folderPath) {
                    this.hide();
                    options.onSelect(folderPath);
                  }
                });
              });
              
              // Fade in new items
              recentList.classList.remove('refreshing');
              
              // Show clear button if we have folders
              const clearBtnEl = this.panel?.querySelector('.qa-clear-btn') as HTMLElement;
              if (clearBtnEl) {
                clearBtnEl.style.display = '';
              }
            }, 150);
          } else {
            recentList.innerHTML = `
              <div style="
                text-align: center;
                padding: 30px;
                color: #666;
              ">
                <div style="font-size: 32px; margin-bottom: 10px;">📁</div>
                <div>No recent folders</div>
                <div style="font-size: 11px; margin-top: 5px; color: #555;">Click "Browse for New Folder" to get started</div>
              </div>
            `;
            
            // Hide clear button if no folders
            const clearBtnEl = this.panel?.querySelector('.qa-clear-btn') as HTMLElement;
            if (clearBtnEl) {
              clearBtnEl.style.display = 'none';
            }
          }
        }
        
        // Stop spinning animation
        setTimeout(() => {
          if (refreshIcon) {
            refreshIcon.classList.remove('spinning');
          }
        }, 300);
        
      }, 200);
    };
    refreshBtn?.addEventListener('click', refreshHandler);
    this.cleanupTasks.push(() => refreshBtn?.removeEventListener('click', refreshHandler));

    // Folder items - ✅ FIX 7: Proper event handler cleanup
    const folderItems = this.panel.querySelectorAll('.qa-folder-item');
    folderItems.forEach(item => {
      const element = item as HTMLElement;
      const folderPath = element.dataset.path;

      // Click handler
      const clickHandler = () => {
        if (folderPath) {
          this.hide();
          options.onSelect(folderPath);
        }
      };
      element.addEventListener('click', clickHandler);
      this.cleanupTasks.push(() => element.removeEventListener('click', clickHandler));

      // Keyboard handler
      const keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (folderPath) {
            this.hide();
            options.onSelect(folderPath);
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.focusNextItem(element);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.focusPreviousItem(element);
        }
      };
      element.addEventListener('keydown', keyHandler);
      this.cleanupTasks.push(() => element.removeEventListener('keydown', keyHandler));

      // Hover effects
      const mouseEnterHandler = () => {
        element.style.background = '#37373d';
        element.style.borderColor = '#007acc';
        element.style.transform = 'translateX(4px)';
        const hint = element.querySelector('.qa-open-hint') as HTMLElement;
        if (hint) hint.style.opacity = '1';
      };
      const mouseLeaveHandler = () => {
        element.style.background = '#2d2d30';
        element.style.borderColor = '#3e3e42';
        element.style.transform = 'translateX(0)';
        const hint = element.querySelector('.qa-open-hint') as HTMLElement;
        if (hint) hint.style.opacity = '0';
      };
      element.addEventListener('mouseenter', mouseEnterHandler);
      element.addEventListener('mouseleave', mouseLeaveHandler);
      this.cleanupTasks.push(() => {
        element.removeEventListener('mouseenter', mouseEnterHandler);
        element.removeEventListener('mouseleave', mouseLeaveHandler);
      });
    });

    // Close button hover
    const closeEnter = (e: Event) => {
      (e.target as HTMLElement).style.background = 'rgba(255, 255, 255, 0.1)';
      (e.target as HTMLElement).style.color = '#fff';
    };
    const closeLeave = (e: Event) => {
      (e.target as HTMLElement).style.background = 'none';
      (e.target as HTMLElement).style.color = '#ccc';
    };
    closeBtn?.addEventListener('mouseenter', closeEnter);
    closeBtn?.addEventListener('mouseleave', closeLeave);
    this.cleanupTasks.push(() => {
      closeBtn?.removeEventListener('mouseenter', closeEnter);
      closeBtn?.removeEventListener('mouseleave', closeLeave);
    });

    // Browse button hover
    const browseEnter = (e: Event) => {
      (e.target as HTMLElement).style.background = '#0098ff';
      (e.target as HTMLElement).style.transform = 'translateY(-1px)';
      (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(0, 122, 204, 0.4)';
    };
    const browseLeave = (e: Event) => {
      (e.target as HTMLElement).style.background = '#007acc';
      (e.target as HTMLElement).style.transform = 'translateY(0)';
      (e.target as HTMLElement).style.boxShadow = '0 2px 8px rgba(0, 122, 204, 0.3)';
    };
    browseBtn?.addEventListener('mouseenter', browseEnter);
    browseBtn?.addEventListener('mouseleave', browseLeave);
    this.cleanupTasks.push(() => {
      browseBtn?.removeEventListener('mouseenter', browseEnter);
      browseBtn?.removeEventListener('mouseleave', browseLeave);
    });

    // Clear button hover
    if (clearBtn) {
      const clearEnter = (e: Event) => {
        (e.target as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
        (e.target as HTMLElement).style.borderColor = '#888';
        (e.target as HTMLElement).style.color = '#ccc';
      };
      const clearLeave = (e: Event) => {
        (e.target as HTMLElement).style.background = 'none';
        (e.target as HTMLElement).style.borderColor = '#666';
        (e.target as HTMLElement).style.color = '#999';
      };
      clearBtn.addEventListener('mouseenter', clearEnter);
      clearBtn.addEventListener('mouseleave', clearLeave);
      this.cleanupTasks.push(() => {
        clearBtn.removeEventListener('mouseenter', clearEnter);
        clearBtn.removeEventListener('mouseleave', clearLeave);
      });
    }

    // Overlay click to close
    const overlayHandler = () => {
      this.hide();
      options.onSelect(null);
    };
    this.overlay.addEventListener('click', overlayHandler);
    this.cleanupTasks.push(() => this.overlay?.removeEventListener('click', overlayHandler));

    // ESC key to close - ✅ FIX 8: Store reference for proper cleanup
    this.escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hide();
        options.onSelect(null);
      }
    };
    document.addEventListener('keydown', this.escHandler);

    // Add CSS animations
    this.injectStyles();
  }

  /**
   * Focus first item for keyboard navigation
   */
  private focusFirstItem(): void {
    if (!this.panel) return;
    
    // Try to focus first folder item
    const firstItem = this.panel.querySelector('.qa-folder-item') as HTMLElement;
    if (firstItem) {
      firstItem.focus();
    } else {
      // No recent folders, focus browse button
      const browseBtn = this.panel.querySelector('.qa-browse-btn') as HTMLElement;
      browseBtn?.focus();
    }
  }

  /**
   * Focus next item in list
   */
  private focusNextItem(currentItem: HTMLElement): void {
    const nextItem = currentItem.nextElementSibling as HTMLElement;
    if (nextItem && nextItem.classList.contains('qa-folder-item')) {
      nextItem.focus();
    }
  }

  /**
   * Focus previous item in list
   */
  private focusPreviousItem(currentItem: HTMLElement): void {
    const prevItem = currentItem.previousElementSibling as HTMLElement;
    if (prevItem && prevItem.classList.contains('qa-folder-item')) {
      prevItem.focus();
    } else {
      // Focus browse button
      const browseBtn = this.panel?.querySelector('.qa-browse-btn') as HTMLElement;
      browseBtn?.focus();
    }
  }

  /**
   * Inject required CSS styles
   * ✅ FIX 9: Enhanced CSS to prevent any pseudo-element interference
   */
  private injectStyles(): void {
    // ✅ Only inject once
    if (document.getElementById('quick-access-styles')) return;

    const style = document.createElement('style');
    style.id = 'quick-access-styles';
    style.textContent = `
      /* ===================================== */
      /* ✅ CRITICAL FIX: Prevent arrow icons */
      /* ===================================== */
      .qa-folder-item,
      .qa-folder-item *,
      .qa-folder-item::before,
      .qa-folder-item::after {
        list-style: none !important;
        list-style-type: none !important;
        background-image: none !important;
        content: none !important;
      }
      
      .qa-folder-item::before,
      .qa-folder-item::after {
        display: none !important;
      }
      
      /* Ensure clean render */
      .quick-access-panel * {
        box-sizing: border-box;
      }
      
      /* ===================================== */
      /* Animation styles */
      /* ===================================== */
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes fadeInScale {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
      
      /* ===================================== */
      /* Button hover styles */
      /* ===================================== */
      .qa-refresh-btn:hover {
        background: rgba(255, 255, 255, 0.1) !important;
        color: #fff !important;
      }
      
      .qa-refresh-btn {
        transition: all 0.2s ease !important;
      }
      
      .qa-clear-btn:hover {
        background: rgba(244, 67, 54, 0.2) !important;
        border-color: #f44336 !important;
        color: #f44336 !important;
      }
      
      /* ===================================== */
      /* Refresh icon animation */
      /* ===================================== */
      .refresh-icon {
        transition: transform 0.3s ease;
      }
      
      .refresh-icon.spinning {
        animation: spin 0.6s ease-in-out;
      }
      
      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
      
      /* ===================================== */
      /* List refresh animation */
      /* ===================================== */
      .qa-recent-list {
        transition: opacity 0.15s ease;
      }
      
      .qa-recent-list.refreshing {
        opacity: 0.5;
      }
      
      .qa-recent-list .qa-folder-item {
        animation: fadeSlideIn 0.2s ease forwards;
        opacity: 0;
      }
      
      .qa-recent-list .qa-folder-item:nth-child(1) { animation-delay: 0ms; }
      .qa-recent-list .qa-folder-item:nth-child(2) { animation-delay: 30ms; }
      .qa-recent-list .qa-folder-item:nth-child(3) { animation-delay: 60ms; }
      .qa-recent-list .qa-folder-item:nth-child(4) { animation-delay: 90ms; }
      .qa-recent-list .qa-folder-item:nth-child(5) { animation-delay: 120ms; }
      .qa-recent-list .qa-folder-item:nth-child(6) { animation-delay: 150ms; }
      .qa-recent-list .qa-folder-item:nth-child(7) { animation-delay: 180ms; }
      .qa-recent-list .qa-folder-item:nth-child(8) { animation-delay: 210ms; }
      .qa-recent-list .qa-folder-item:nth-child(9) { animation-delay: 240ms; }
      .qa-recent-list .qa-folder-item:nth-child(10) { animation-delay: 270ms; }
      
      @keyframes fadeSlideIn {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* ===================================== */
      /* Scrollbar styles */
      /* ===================================== */
      .quick-access-panel::-webkit-scrollbar {
        width: 10px;
      }

      .quick-access-panel::-webkit-scrollbar-track {
        background: #1e1e1e;
        border-radius: 5px;
      }

      .quick-access-panel::-webkit-scrollbar-thumb {
        background: #424242;
        border-radius: 5px;
        border: 2px solid #252526;
      }

      .quick-access-panel::-webkit-scrollbar-thumb:hover {
        background: #4e4e4e;
      }

      /* ===================================== */
      /* Focus styles */
      /* ===================================== */
      .qa-folder-item:focus {
        outline: 2px solid #007acc;
        outline-offset: 2px;
      }

      .qa-browse-btn:focus,
      .qa-close-btn:focus,
      .qa-clear-btn:focus {
        outline: 2px solid #007acc;
        outline-offset: 2px;
      }

      /* ===================================== */
      /* Accessibility */
      /* ===================================== */
      @media (prefers-reduced-motion: reduce) {
        .quick-access-overlay,
        .quick-access-panel,
        .qa-folder-item {
          animation: none !important;
          transition: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Show a notification
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
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
      animation: slideInRight 0.3s ease;
      font-family: 'Segoe UI', sans-serif;
      ${type === 'success' ? 
        'background: linear-gradient(135deg, #4CAF50, #45a049);' : 
        type === 'error' ? 
        'background: linear-gradient(135deg, #f44336, #e53935);' : 
        'background: linear-gradient(135deg, #2196F3, #1976D2);'
      }
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto remove
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100px)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Export singleton instance
export const quickAccessPanel = new QuickAccessPanel();