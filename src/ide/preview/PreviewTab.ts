// src/ide/preview/PreviewTab.ts

// ============================================================================
// [PreviewTab] Wait for dev server to be ready before loading iframe
// Prevents chrome-error:// deadlock when iframe loads before server is up
// ============================================================================
async function waitForDevServer(url: string, maxRetries = 25, intervalMs = 300): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await fetch(url, { mode: 'no-cors' });
      return true;
    } catch {
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }
  console.warn('[PreviewTab] Dev server did not respond in time:', url);
  return false;
}

// Preview Tab - FIXED VERSION with Cache Busting & Project Tracking
// ============================================================================
// FIXES:
// - ✅ Cache busting on refresh (adds timestamp to URL)
// - ✅ Project tracking (detects project change)
// - ✅ Hard reload when project changes
// - ✅ Clears iframe completely before loading new content
// - ✅ Auto-refresh when new server detected on same port
// ============================================================================

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[PreviewTab]', ...args);
const err = (...args: any[]) => console.error('[PreviewTab]', ...args);

// ============================================================================
// PREVIEW TAB MANAGER
// ============================================================================

class PreviewTabManager {
  private container: HTMLElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private tab: HTMLElement | null = null;
  private url: string = '';
  private active: boolean = false;
  
  // NEW: Track project to detect changes
  private currentProjectPath: string = '';
  private lastServerStartTime: number = 0;
  
  // NEW: Error state tracking
  private hasError: boolean = false;
  private lastError: string = '';
  private errorCheckInterval: number | null = null;
  private _terminalCheckTimeout: number | null = null;

  /**
   * Get current project path from window globals
   */
  private getCurrentProject(): string {
    return (window as any).currentFolderPath || 
           (window as any).projectPath || 
           (window as any).__currentProjectPath || 
           '';
  }

  /**
   * Check if project has changed since last preview
   */
  private hasProjectChanged(): boolean {
    const current = this.getCurrentProject();
    if (!current) return false;
    
    if (this.currentProjectPath && this.currentProjectPath !== current) {
      log('🔄 Project changed from:', this.currentProjectPath, 'to:', current);
      return true;
    }
    return false;
  }

  create(url: string): void {
    log('Creating preview for:', url);
    
    const projectChanged = this.hasProjectChanged();
    this.currentProjectPath = this.getCurrentProject();
    this.url = this.normalize(url);
    this.lastServerStartTime = Date.now();
    
    this.injectCSS();

    if (this.tab) {
      log('Tab exists, navigating');
      this.activate();
      
      // FIXED: If project changed, do hard reload with cache clear
      if (projectChanged) {
        log('🧹 Project changed - clearing cache and hard reloading');
        this.hardReload(this.url);
      } else {
        this.go(this.url);
      }
      return;
    }

    // Find tab bar
    const tabBar = this.findTabBar();
    if (!tabBar) {
      err('Tab bar not found! Trying alternative...');
      this.fallback();
      return;
    }
    log('Tab bar found:', tabBar.id || tabBar.className);

    // Create tab
    this.createTab(tabBar);

    // Find editor parent for overlay
    const editorParent = this.findEditorParent();
    if (!editorParent) {
      err('Editor parent not found!');
      this.fallback();
      return;
    }
    log('Editor parent found');

    // Create preview container
    this.createContainer(editorParent);

    // Activate
    this.activate();
    this.go(this.url);

    log('Preview created successfully');
  }

  private findTabBar(): HTMLElement | null {
    // Try standard selectors
    const selectors = [
      '#editor-tab-container',
      '.tab-container',
      '[class*="tab-container"]'
    ];
    
    for (const sel of selectors) {
      const el = document.querySelector(sel) as HTMLElement;
      if (el) return el;
    }

    // Find via existing tab
    const existingTab = document.querySelector('.editor-tab');
    if (existingTab?.parentElement) {
      return existingTab.parentElement as HTMLElement;
    }

    // Via window.tabManager
    const tm = (window as any).tabManager;
    if (tm?.tabContainer) return tm.tabContainer;

    return null;
  }

  private findEditorParent(): HTMLElement | null {
    // Find Monaco and get a good parent
    const monaco = document.querySelector('.monaco-editor');
    if (monaco) {
      // Walk up to find a positioned container
      let p = monaco.parentElement;
      for (let i = 0; i < 5 && p; i++) {
        const pos = getComputedStyle(p).position;
        if (pos === 'relative' || pos === 'absolute' || p.id || 
            p.className.includes('editor') || p.className.includes('content')) {
          return p;
        }
        p = p.parentElement;
      }
      // Fallback to direct parent
      return monaco.parentElement as HTMLElement;
    }

    // Try common containers
    const containers = [
      '.editor-content',
      '.editor-area', 
      '#monaco-editor',
      '.monaco-editor-container',
      'main'
    ];
    
    for (const sel of containers) {
      const el = document.querySelector(sel) as HTMLElement;
      if (el) return el;
    }

    return null;
  }

  private createTab(tabBar: HTMLElement): void {
    // Remove old if exists
    document.getElementById('preview-tab')?.remove();

    this.tab = document.createElement('div');
    this.tab.id = 'preview-tab';
    this.tab.className = 'editor-tab';
    this.tab.innerHTML = `
      <span style="margin-right:6px">🌐</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Preview</span>
      <span class="preview-close" style="margin-left:6px;cursor:pointer;opacity:0.7">×</span>
    `;

    // Copy style from existing tab or use defaults
    const sample = tabBar.querySelector('.editor-tab') as HTMLElement;
    if (sample) {
      const cs = getComputedStyle(sample);
      this.tab.style.cssText = `
        display:flex;align-items:center;
        padding:${cs.padding || '6px 12px'};
        background:#2d2d2d;
        border-right:1px solid #333;
        cursor:pointer;
        font-size:${cs.fontSize || '13px'};
        color:#ccc;
        user-select:none;
        flex-shrink:0;
        min-width:100px;
      `;
    } else {
      this.tab.style.cssText = `
        display:flex;align-items:center;padding:6px 12px;
        background:#2d2d2d;border-right:1px solid #333;
        cursor:pointer;font-size:13px;color:#ccc;
        user-select:none;flex-shrink:0;min-width:100px;
      `;
    }

    // Events
    this.tab.onclick = (e) => {
      if ((e.target as HTMLElement).classList.contains('preview-close')) {
        e.stopPropagation();
        this.close();
      } else {
        this.activate();
      }
    };

    this.tab.onmouseover = () => {
      if (!this.active) this.tab!.style.background = '#37373d';
    };
    this.tab.onmouseout = () => {
      if (!this.active) this.tab!.style.background = '#2d2d2d';
    };

    tabBar.appendChild(this.tab);
    log('Tab created');
  }

  private createContainer(parent: HTMLElement): void {
    document.getElementById('preview-container')?.remove();

    // Ensure parent is positioned
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    this.container = document.createElement('div');
    this.container.id = 'preview-container';
    this.container.style.cssText = `
      display:none;
      position:absolute;
      top:0;left:0;right:0;bottom:0;
      background:#1e1e1e;
      z-index:9999;
      flex-direction:column;
    `;

    this.container.innerHTML = `
      <div id="preview-bar" style="
        display:flex;align-items:center;gap:6px;
        padding:6px 10px;background:#252526;
        border-bottom:1px solid #3c3c3c;flex-shrink:0;
      ">
        <button class="pbtn" data-action="back" title="Go Back">←</button>
        <button class="pbtn" data-action="forward" title="Go Forward">→</button>
        <button class="pbtn" data-action="refresh" title="Refresh">↻</button>
        <button class="pbtn pbtn-hard" data-action="hard-refresh" title="Hard Refresh (Clear Cache)" style="color:#4fc3f7">⟳</button>
        <input id="preview-url" type="text" style="
          flex:1;background:#3c3c3c;border:1px solid #555;
          border-radius:4px;padding:5px 10px;color:#fff;
          font-size:12px;outline:none;
          font-family:Consolas,monospace;
        " />
        <button class="pbtn" data-action="copy-url" title="Copy URL">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
        <button class="pbtn" data-action="download" title="Download Page">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        </button>
        <button class="pbtn pbtn-ai" data-action="send-to-ai" title="Send HTML to AI Chat" style="color:#a78bfa">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M12 7v2"></path><path d="M12 13h.01"></path></svg>
        </button>
        <button class="pbtn" data-action="open-external" title="Open in Browser">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </button>
        <select id="preview-device" title="Device Mode" style="
          background:#3c3c3c;border:1px solid #555;
          border-radius:4px;padding:4px 8px;color:#ccc;font-size:12px;
        ">
          <option value="0">🖥️ Desktop</option>
          <option value="768">📱 Tablet</option>
          <option value="375">📱 Mobile</option>
        </select>
      </div>
      <div id="preview-view" style="
        flex:1;display:flex;justify-content:center;
        overflow:auto;background:#111;position:relative;
      ">
        <div id="preview-load" style="
          position:absolute;top:0;left:0;right:0;bottom:0;
          display:flex;align-items:center;justify-content:center;
          background:rgba(0,0,0,0.8);z-index:10;color:#888;
        ">
          <div style="text-align:center">
            <div class="spinner"></div>
            <div style="margin-top:10px">Loading...</div>
          </div>
        </div>
        <iframe id="preview-frame" style="
          width:100%;height:100%;border:none;background:#fff;
        "></iframe>
      </div>
      <div id="preview-status" style="
        padding:4px 10px;background:#252526;border-top:1px solid #3c3c3c;
        font-size:11px;color:#888;flex-shrink:0;display:flex;justify-content:space-between;
      ">
        <span id="preview-status-text">Ready</span>
        <span id="preview-project-info" style="color:#666"></span>
      </div>
      <!-- Error Overlay - More Prominent -->
      <div id="preview-error-bar" style="
        display: none;
        position: absolute;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
        border: 2px solid #ef4444;
        border-radius: 12px;
        padding: 14px 20px;
        z-index: 1000;
        box-shadow: 0 8px 32px rgba(220, 38, 38, 0.5), 0 0 0 4px rgba(239, 68, 68, 0.2);
        flex-direction: row;
        align-items: center;
        gap: 14px;
        max-width: 95%;
        min-width: 400px;
      ">
        <div style="display:flex;align-items:center;gap:10px;flex:1;">
          <div style="
            width:36px;height:36px;
            background:rgba(255,255,255,0.15);
            border-radius:8px;
            display:flex;align-items:center;justify-content:center;
            animation:errorIconPulse 1.5s ease-in-out infinite;
          ">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div>
            <div style="color:#fff;font-size:14px;font-weight:600;">Build Error Detected</div>
            <div style="color:rgba(255,255,255,0.8);font-size:11px;margin-top:2px;">Click "Fix with AI" to analyze and resolve</div>
          </div>
        </div>
        <button id="preview-fix-ai-btn" style="
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:10px 20px;
          background:linear-gradient(135deg, #7c3aed 0%, #9333ea 100%);
          border:none;
          border-radius:8px;
          color:#fff;
          font-size:13px;
          font-weight:600;
          cursor:pointer;
          transition:all 0.2s ease;
          box-shadow:0 4px 12px rgba(124, 58, 237, 0.4);
          white-space:nowrap;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
            <circle cx="7.5" cy="14.5" r="1.5" fill="currentColor"/>
            <circle cx="16.5" cy="14.5" r="1.5" fill="currentColor"/>
          </svg>
          <span>Fix with AI</span>
        </button>
        <button id="preview-error-dismiss" style="
          background:rgba(255,255,255,0.1);
          border:none;
          color:rgba(255,255,255,0.8);
          cursor:pointer;
          padding:6px;
          display:flex;
          align-items:center;
          justify-content:center;
          border-radius:6px;
          transition:all 0.15s ease;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;

    parent.appendChild(this.container);
    this.iframe = this.container.querySelector('#preview-frame');

    // Events
    this.container.querySelectorAll('.pbtn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).dataset.action;
        if (action === 'back') try { this.iframe?.contentWindow?.history.back(); } catch {}
        if (action === 'forward') try { this.iframe?.contentWindow?.history.forward(); } catch {}
        if (action === 'refresh') this.refresh();
        if (action === 'hard-refresh') this.hardReload();  // Hard refresh button
        if (action === 'copy-url') this.copyUrl(btn as HTMLElement);
        if (action === 'download') this.downloadPage();
        if (action === 'send-to-ai') this.sendToAI(btn as HTMLElement);
        if (action === 'open-external') this.openExternal();
      });
    });

    const urlInput = this.container.querySelector('#preview-url') as HTMLInputElement;
    urlInput?.addEventListener('keypress', e => {
      if (e.key === 'Enter') this.go(urlInput.value);
    });

    const deviceSel = this.container.querySelector('#preview-device') as HTMLSelectElement;
    deviceSel?.addEventListener('change', () => {
      this.setSize(parseInt(deviceSel.value));
    });

    this.iframe?.addEventListener('load', () => {
      this.hideLoading();
      this.setStatus('Ready');
      this.updateProjectInfo();
      
      // Start error detection
      this.startErrorDetection();
      
      // Also check for errors immediately and after delays
      // Vite error overlay can take time to appear
      setTimeout(() => this.checkForErrors(), 50);
      setTimeout(() => this.checkForErrors(), 200);
      setTimeout(() => this.checkForErrors(), 500);
      setTimeout(() => this.checkForErrors(), 1000);
      setTimeout(() => this.checkForErrors(), 2000);
      setTimeout(() => this.checkForErrors(), 3000);
    });
    
    // Error bar buttons
    this.container.querySelector('#preview-fix-ai-btn')?.addEventListener('click', () => {
      this.sendErrorToAI();
    });
    
    this.container.querySelector('#preview-error-dismiss')?.addEventListener('click', () => {
      this.hideErrorBar();
    });

    // Listen for other tab clicks
    document.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest('.editor-tab');
      if (t && t.id !== 'preview-tab' && this.active) {
        this.deactivate();
      }
    }, true);

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (!this.active) return;
      
      // Ctrl+R: Normal refresh
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        this.refresh();
      }
      
      // Ctrl+Shift+R: Hard refresh (clear cache)
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        this.hardReload();
      }
    });

    log('Container created');
  }

  /**
   * Update project info in status bar
   */
  private updateProjectInfo(): void {
    const infoEl = this.container?.querySelector('#preview-project-info');
    if (infoEl) {
      const project = this.getCurrentProject();
      const projectName = project ? project.split(/[/\\]/).pop() : 'Unknown';
      infoEl.textContent = `Project: ${projectName}`;
    }
  }

  // ============================================================================
  // ERROR DETECTION SYSTEM
  // ============================================================================

  /**
   * Start detecting errors in the preview iframe
   */
  private startErrorDetection(): void {
    // Clear previous interval
    if (this.errorCheckInterval) {
      clearInterval(this.errorCheckInterval);
    }
    
    // Start terminal-based error detection (cross-origin safe)
    this.setupTerminalErrorDetection();
    
    // Multiple quick checks at start (errors often appear quickly)
    setTimeout(() => this.checkForErrors(), 100);
    setTimeout(() => this.checkForErrors(), 300);
    setTimeout(() => this.checkForErrors(), 600);
    setTimeout(() => this.checkForErrors(), 1000);
    
    // Periodic checks for dynamically appearing errors (check every 1.5s)
    this.errorCheckInterval = window.setInterval(() => {
      if (this.active) {
        this.checkForErrors();
        this.checkTerminalForErrors(); // Also check terminal
      }
    }, 1500);  // Check every 1.5 seconds
  }
  
  /**
   * Setup terminal-based error detection
   * This works even with cross-origin iframe restrictions
   */
  private setupTerminalErrorDetection(): void {
    // Listen for terminal output events
    window.addEventListener('terminal-output', ((e: CustomEvent) => {
      const output = e.detail?.output || e.detail?.text || '';
      this.analyzeTerminalOutput(output);
    }) as EventListener);
    
    // Listen for build errors
    window.addEventListener('build-error', ((e: CustomEvent) => {
      const error = e.detail?.error || e.detail?.message || 'Build error detected';
      log('🔴 Build error event received:', error);
      this.triggerErrorState(error);
    }) as EventListener);
    
    // Setup mutation observer for terminal content changes
    this.setupTerminalObserver();
    
    // Initial terminal check
    setTimeout(() => this.checkTerminalForErrors(), 500);
    setTimeout(() => this.checkTerminalForErrors(), 1500);
    setTimeout(() => this.checkTerminalForErrors(), 3000);
  }
  
  /**
   * Setup a mutation observer to watch for terminal changes
   */
  private setupTerminalObserver(): void {
    // Find terminal containers
    const terminalContainers = [
      document.querySelector('.xterm-screen'),
      document.querySelector('.xterm-rows'),
      document.querySelector('.explorer-terminal'),
      document.querySelector('#terminal-container'),
    ];
    
    for (const container of terminalContainers) {
      if (container) {
        log('🔍 Setting up terminal observer on:', container.className || container.id);
        
        const observer = new MutationObserver((mutations) => {
          // Debounce - only check every 500ms
          if (this._terminalCheckTimeout) return;
          
          this._terminalCheckTimeout = window.setTimeout(() => {
            this._terminalCheckTimeout = null;
            this.checkTerminalForErrors();
          }, 500);
        });
        
        observer.observe(container, {
          childList: true,
          subtree: true,
          characterData: true,
        });
        
        // Store observer reference
        (this as any)._terminalObserver = observer;
        break;
      }
    }
  }
  
  /**
   * Check terminal content for build errors
   */
  private checkTerminalForErrors(): void {
    // Try to access terminal output from various sources
    const terminalSources = [
      // Terminal integration
      (window as any).terminalManager?.getOutput?.(),
      (window as any).terminal?.getOutput?.(),
      (window as any).__lastTerminalOutput,
      // Terminal element - xterm rows contain the actual output
      this.getXtermContent(),
      // Fallback to other terminal elements
      document.querySelector('.terminal-output')?.textContent,
      document.querySelector('#terminal-output')?.textContent,
      // Explorer terminal
      document.querySelector('.explorer-terminal-output')?.textContent,
      document.querySelector('.explorer-terminal .xterm-rows')?.textContent,
    ];
    
    for (const output of terminalSources) {
      if (output && typeof output === 'string' && output.length > 0) {
        this.analyzeTerminalOutput(output);
        break;
      }
    }
  }
  
  /**
   * Get content from xterm terminal rows
   */
  private getXtermContent(): string {
    const xtermRows = document.querySelectorAll('.xterm-rows');
    let content = '';
    
    xtermRows.forEach(rows => {
      // Get all text spans within the xterm
      const spans = rows.querySelectorAll('span');
      spans.forEach(span => {
        content += span.textContent || '';
      });
      content += '\n';
    });
    
    return content;
  }
  
  /**
   * Analyze terminal output for error patterns
   */
  private analyzeTerminalOutput(output: string): void {
    if (!output || output.length < 20) return;
    
    // Already showing an error - don't spam
    if (this.hasError) return;
    
    // Clean the output (remove ANSI codes if present)
    const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
    
    // Build/compile error patterns - ordered by specificity
    const errorPatterns = [
      // Vite/parse5 specific (what we saw in the screenshot)
      /Unable to parse HTML.*parse5 error/is,
      /parse5 error code invalid-first-character/i,
      /invalid-first-character-of-tag-name/i,
      
      // Vite plugin errors
      /\[plugin:[\w-]+\].*error/is,
      /\[vite\].*error/is,
      /\[vite\].*failed/is,
      
      // JavaScript/TypeScript errors
      /SyntaxError:/i,
      /TypeError:/i,
      /ReferenceError:/i,
      /Unexpected token/i,
      
      // Build errors
      /Failed to compile/i,
      /Failed to load/i,
      /Build failed/i,
      /Compilation failed/i,
      
      // Module errors
      /Module not found/i,
      /Cannot find module/i,
      /Module build failed/i,
      
      // File errors
      /ENOENT/i,
      /EPERM/i,
      
      // TypeScript errors
      /error TS\d+:/i,
      
      // Webpack errors
      /ERROR in/i,
      /Module Error/i,
    ];
    
    // Check for error patterns
    for (const pattern of errorPatterns) {
      if (pattern.test(cleanOutput)) {
        // Extract relevant error portion (context around match)
        const match = cleanOutput.match(pattern);
        if (match) {
          const matchIndex = cleanOutput.indexOf(match[0]);
          const start = Math.max(0, matchIndex);
          const end = Math.min(cleanOutput.length, matchIndex + 1000);
          let errorContext = cleanOutput.substring(start, end);
          
          // Try to get a better error message by finding the error line
          const lines = errorContext.split('\n');
          const errorLines = lines.filter(line => 
            /error|failed|unable|cannot|unexpected/i.test(line)
          ).slice(0, 10);
          
          if (errorLines.length > 0) {
            errorContext = errorLines.join('\n');
          }
          
          log('🔴 Terminal error detected:', pattern.source);
          log('🔴 Error context:', errorContext.substring(0, 200));
          this.triggerErrorState(errorContext);
          return;
        }
      }
    }
  }

  /**
   * Stop error detection
   */
  private stopErrorDetection(): void {
    if (this.errorCheckInterval) {
      clearInterval(this.errorCheckInterval);
      this.errorCheckInterval = null;
    }
  }

  /**
   * Check for errors in iframe content
   */
  private checkForErrors(): void {
    if (!this.iframe) {
      log('⚠️ No iframe to check');
      return;
    }
    
    let iframeFailed = false;
    
    try {
      // Try to access iframe content
      const doc = this.iframe.contentDocument;
      const bodyText = doc?.body?.textContent || '';
      const bodyHtml = doc?.body?.innerHTML || '';
      
      // If both are empty, iframe access might be blocked
      if (!bodyText && !bodyHtml) {
        log('⚠️ Iframe content empty - likely cross-origin blocked');
        iframeFailed = true;
      } else {
        log('🔍 Checking for errors, text length:', bodyText.length, 'html length:', bodyHtml.length);
      }
      
      // Error patterns to detect
      const errorPatterns = [
        /Unable to parse/i,
        /parse5 error/i,
        /invalid-first-character/i,
        /\[plugin:/i,
        /\[vite\]/i,
        /SyntaxError/i,
        /TypeError/i,
        /ReferenceError/i,
        /Unexpected token/i,
        /Failed to compile/i,
        /Failed to load/i,
        /Module not found/i,
        /Cannot find module/i,
        /ENOENT/i,
        /Build failed/i,
      ];
      
      // Check for vite-error-overlay element first
      let hasError = false;
      let errorText = '';
      
      if (doc) {
        const viteOverlay = doc.querySelector('vite-error-overlay');
        if (viteOverlay) {
          log('🔴 Found vite-error-overlay element!');
          hasError = true;
          // Try shadow DOM
          const shadow = (viteOverlay as any).shadowRoot;
          if (shadow) {
            errorText = shadow.textContent || bodyText;
          } else {
            errorText = viteOverlay.textContent || bodyText;
          }
        }
      }
      
      // Check text content for error patterns
      if (!hasError && bodyText) {
        const foundPattern = errorPatterns.find(p => p.test(bodyText));
        if (foundPattern) {
          log('🔴 Found error pattern in text:', foundPattern);
          hasError = true;
          errorText = bodyText;
        }
      }
      
      // Check HTML for error patterns (in case text extraction failed)
      if (!hasError && bodyHtml) {
        const foundPattern = errorPatterns.find(p => p.test(bodyHtml));
        if (foundPattern) {
          log('🔴 Found error pattern in HTML:', foundPattern);
          hasError = true;
          errorText = bodyText || 'Build error detected in preview';
        }
      }
      
      // Update state
      if (hasError && errorText.length > 20) {
        this.triggerErrorState(errorText);
      } else if (this.hasError && !hasError) {
        // Only clear error if we can ACTUALLY VERIFY iframe shows valid content
        // Not just empty - it needs to have real content without errors
        const hasValidContent = bodyText.length > 50 || bodyHtml.length > 100;
        if (hasValidContent && !iframeFailed) {
          log('✅ Iframe has valid content without errors - clearing error state');
          this.clearErrorState();
        } else {
          log('⚠️ Not clearing error - iframe empty or cross-origin blocked');
        }
      }
      
      // If iframe was empty, also check terminal (but don't clear existing errors)
      if (iframeFailed) {
        this.checkTerminalForErrors();
      }
      
    } catch (e) {
      // Cross-origin restriction - fallback to terminal detection
      // DON'T clear existing errors since we can't verify iframe state
      log('⚠️ Cannot access iframe (cross-origin):', (e as Error).message);
      log('🔄 Falling back to terminal-based error detection');
      this.checkTerminalForErrors();
    }
  }
  
  /**
   * Trigger error state and show error bar
   */
  private triggerErrorState(errorText: string): void {
    // Clean and truncate
    errorText = errorText.replace(/\s+/g, ' ').trim();
    if (errorText.length > 5000) {
      errorText = errorText.substring(0, 5000) + '... (truncated)';
    }
    
    if (!this.hasError || this.lastError !== errorText) {
      this.hasError = true;
      this.lastError = errorText;
      this.showErrorBar();
      this.setStatus('⚠️ Error detected - Click "Fix with AI"');
      log('🔴 ERROR STATE TRIGGERED:', errorText.substring(0, 200));
    }
  }
  
  /**
   * Clear error state and hide error bar
   */
  private clearErrorState(): void {
    this.hasError = false;
    this.lastError = '';
    this.hideErrorBar();
    this.setStatus('Ready');
    log('✅ Error state cleared');
  }

  /**
   * Show the error bar
   */
  private showErrorBar(): void {
    const bar = this.container?.querySelector('#preview-error-bar') as HTMLElement;
    if (bar) {
      bar.style.display = 'flex';
      log('🔴 Error bar SHOWN');
    } else {
      log('⚠️ ERROR: Error bar element not found in DOM!');
      // Debug: list all elements
      console.log('Container contents:', this.container?.innerHTML?.substring(0, 500));
    }
  }

  /**
   * Hide the error bar
   */
  private hideErrorBar(): void {
    const bar = this.container?.querySelector('#preview-error-bar') as HTMLElement;
    if (bar) {
      bar.style.display = 'none';
      log('✅ Error bar hidden');
    }
  }

  /**
   * Send error to AI for fixing
   */
  private sendErrorToAI(): void {
    if (!this.lastError) {
      this.setStatus('No error to send');
      return;
    }
    
    // Get current file if available
    const currentFile = (window as any).currentOpenFile || 
                        (window as any).activeFile || 
                        (window as any).currentFilePath || '';
    
    // Extract file path from error message if present
    const filePathMatch = this.lastError.match(/([A-Za-z]:[\\\/][^\s:]+\.[a-z]+)|([\/][^\s:]+\.[a-z]+)/i);
    const errorFile = filePathMatch ? filePathMatch[0] : '';
    
    // Extract error type
    const errorTypeMatch = this.lastError.match(/\[plugin:([\w-]+)\]|(\w+Error):|Failed to compile/i);
    const errorType = errorTypeMatch ? errorTypeMatch[0] : 'Build Error';
    
    // Extract line/column info
    const lineMatch = this.lastError.match(/(\d+):(\d+)|line\s+(\d+)/i);
    const lineInfo = lineMatch ? `Line ${lineMatch[1] || lineMatch[3]}${lineMatch[2] ? `:${lineMatch[2]}` : ''}` : '';
    
    // Get project path
    const projectPath = this.getCurrentProject();
    const projectName = projectPath ? projectPath.split(/[/\\]/).pop() : '';
    
    // Format the error message for AI with better structure
    const prompt = `🔴 **Build Error in Preview**

I have a ${errorType} that's preventing my app from running. Please analyze and fix it.

**Project:** ${projectName || 'Unknown'}
**URL:** ${this.url}
${errorFile ? `**Error File:** ${errorFile}` : ''}
${lineInfo ? `**Location:** ${lineInfo}` : ''}
${currentFile ? `**Currently Open:** ${currentFile}` : ''}

**Full Error Output:**
\`\`\`
${this.lastError}
\`\`\`

Please:
1. Identify the root cause of this error
2. Provide the corrected code
3. Explain what was wrong and how to prevent it`;
    
    // Send to AI chat
    this.insertIntoAIChat(prompt);
    
    // Visual feedback on button
    const btn = this.container?.querySelector('#preview-fix-ai-btn') as HTMLElement;
    if (btn) {
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Sent!</span>
      `;
      btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    }
    
    // Feedback
    this.setStatus('✅ Error sent to AI - check the chat!');
    
    setTimeout(() => {
      this.hideErrorBar();
      this.setStatus('Ready');
    }, 2000);
  }

  activate(): void {
    if (this.active) return;
    log('Activating');

    // Deactivate other tabs
    document.querySelectorAll('.editor-tab').forEach(t => {
      t.classList.remove('active');
      (t as HTMLElement).style.background = '#2d2d2d';
      (t as HTMLElement).style.borderTop = '';
      (t as HTMLElement).style.color = '#ccc';
    });

    // Activate this tab
    if (this.tab) {
      this.tab.classList.add('active');
      this.tab.style.background = '#1e1e1e';
      this.tab.style.borderTop = '2px solid #0078d7';
      this.tab.style.color = '#fff';
    }

    this.active = true;

    // Hide Monaco
    document.querySelectorAll('.monaco-editor, .overflow-guard').forEach(el => {
      (el as HTMLElement).style.visibility = 'hidden';
    });

    // Show preview
    if (this.container) {
      this.container.style.display = 'flex';
    }
  }

  deactivate(): void {
    if (!this.active) return;
    log('Deactivating');

    if (this.tab) {
      this.tab.classList.remove('active');
      this.tab.style.background = '#2d2d2d';
      this.tab.style.borderTop = '';
      this.tab.style.color = '#ccc';
    }

    this.active = false;

    if (this.container) {
      this.container.style.display = 'none';
    }

    // Show Monaco
    document.querySelectorAll('.monaco-editor, .overflow-guard').forEach(el => {
      (el as HTMLElement).style.visibility = '';
    });
  }

  // NEW: Public method to deactivate preview tab
  deactivatePreviewTab(): void {
    this.deactivate();
  }

  // NEW: Public method to activate preview tab
  activatePreviewTab(): void {
    this.activate();
  }

  // NEW: Check if this is the active tab
  isActiveTab(): boolean {
    return this.active;
  }

  close(): void {
    log('Closing');
    this.stopErrorDetection();
    this.deactivate();
    this.tab?.remove();
    this.tab = null;
    this.container?.remove();
    this.container = null;
    this.iframe = null;
    this.url = '';
    this.currentProjectPath = '';
    this.hasError = false;
    this.lastError = '';
  }

  go(url: string): void {
    this.url = this.normalize(url);
    log('Navigate:', this.url);

    const input = this.container?.querySelector('#preview-url') as HTMLInputElement;
    if (input) input.value = this.url;

    this.showLoading();
    this.setStatus('Loading...');
    
    // Clear error state
    this.hasError = false;
    this.lastError = '';
    this.hideErrorBar();

    // [PreviewTab Fix] Reset if stuck on chrome-error:// dead origin
    if (this.iframe) {
      if ((this.iframe.src ?? '').startsWith('chrome-error://')) {
        console.log('[PreviewTab] Dead iframe detected, doing full reset');
        this.iframe.src = 'about:blank';
        setTimeout(() => { if (this.iframe) this.iframe.src = this.url; }, 80);
      } else {
        this.iframe.src = this.url;
      }
    }
  }

  /**
   * Normal refresh - may use cache
   */
  refresh(): void {
    if (!this.iframe) return;
    log('Refresh (normal)');
    this.showLoading();
    
    // Clear error state
    this.hasError = false;
    this.lastError = '';
    this.hideErrorBar();
    
    try {
      // Try to reload iframe content
      this.iframe.contentWindow?.location.reload();
    } catch {
      // Cross-origin, just reset src
      const src = this.iframe.src;
      this.iframe.src = 'about:blank';
      setTimeout(() => { if (this.iframe) this.iframe.src = src; }, 50);
      }
  }

  /**
   * FIXED: Hard reload with cache busting
   * Completely clears the iframe and reloads with timestamp
   */
  hardReload(newUrl?: string): void {
    if (!this.iframe) return;
    
    const urlToLoad = newUrl || this.url;
    log('🧹 Hard Reload (cache bust):', urlToLoad);
    
    this.showLoading();
    this.setStatus('Clearing cache...');
    
    // Clear error state
    this.hasError = false;
    this.lastError = '';
    this.hideErrorBar();
    
    // Step 1: Completely destroy iframe content
    this.iframe.src = 'about:blank';
    
    // Step 2: Remove and recreate iframe to clear all cache
    const parent = this.iframe.parentElement;
    const oldIframe = this.iframe;
    
    setTimeout(() => {
      if (!parent) return;
      
      // Create new iframe
      const newIframe = document.createElement('iframe');
      newIframe.id = 'preview-frame';
      newIframe.style.cssText = oldIframe.style.cssText;
      // sandbox removed — required for WebView2 to load localhost iframe
      
      // Add load handler
      newIframe.addEventListener('load', () => {
        this.hideLoading();
        this.setStatus('Ready');
        this.updateProjectInfo();
        // Start error detection on new iframe
        this.startErrorDetection();
      });
      
      // Replace old iframe
      oldIframe.remove();
      parent.appendChild(newIframe);
      this.iframe = newIframe;
      
      // Step 3: Add cache-busting timestamp to URL
      const cacheBustUrl = this.addCacheBuster(urlToLoad);
      log('Loading with cache buster:', cacheBustUrl);
      
      // Update URL input (show original URL, not with cache buster)
      const input = this.container?.querySelector('#preview-url') as HTMLInputElement;
      if (input) input.value = urlToLoad;
      
      // Navigate to cache-busted URL
      this.iframe.src = cacheBustUrl;
      this.url = urlToLoad;
      
    }, 100);
  }

  /**
   * Add cache-busting parameter to URL
   */
  private addCacheBuster(url: string): string {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('_nocache', Date.now().toString());
      return urlObj.toString();
    } catch {
      // If URL parsing fails, append manually
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}_nocache=${Date.now()}`;
    }
  }

  /**
   * Copy current URL to clipboard
   */
  private copyUrl(btn: HTMLElement): void {
    const url = this.url || 'http://localhost:3000';
    navigator.clipboard.writeText(url).then(() => {
      log('📋 URL copied:', url);
      this.setStatus('URL copied!');
      
      // Visual feedback
      btn.style.color = '#4caf50';
      setTimeout(() => {
        btn.style.color = '';
        this.setStatus('Ready');
      }, 1500);
    }).catch(err => {
      err('Failed to copy URL:', err);
      this.setStatus('Copy failed');
    });
  }

  /**
   * Download the current page HTML content
   */
  private downloadPage(): void {
    if (!this.iframe) {
      this.setStatus('No page to download');
      return;
    }
    
    this.setStatus('Downloading...');
    
    try {
      // Try to get HTML from iframe
      const doc = this.iframe.contentDocument || this.iframe.contentWindow?.document;
      
      if (doc) {
        const html = doc.documentElement.outerHTML;
        const fullHtml = `<!DOCTYPE html>\n${html}`;
        
        // Generate filename from URL
        let filename = 'page.html';
        try {
          const urlObj = new URL(this.url);
          const pathname = urlObj.pathname;
          if (pathname && pathname !== '/') {
            filename = pathname.split('/').pop() || 'index.html';
            if (!filename.includes('.')) filename += '.html';
          } else {
            filename = 'index.html';
          }
        } catch {}
        
        // Download
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        log('📥 Downloaded:', filename);
        this.setStatus(`Downloaded: ${filename}`);
        setTimeout(() => this.setStatus('Ready'), 2000);
      } else {
        throw new Error('Cannot access iframe content');
      }
    } catch (error) {
      log('⚠️ Direct download failed, trying fetch:', error);
      
      // Fallback: fetch the URL directly
      fetch(this.url)
        .then(res => res.text())
        .then(html => {
          let filename = 'index.html';
          try {
            const urlObj = new URL(this.url);
            const pathname = urlObj.pathname;
            if (pathname && pathname !== '/') {
              filename = pathname.split('/').pop() || 'index.html';
              if (!filename.includes('.')) filename += '.html';
            }
          } catch {}
          
          const blob = new Blob([html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          log('📥 Downloaded via fetch:', filename);
          this.setStatus(`Downloaded: ${filename}`);
          setTimeout(() => this.setStatus('Ready'), 2000);
        })
        .catch(fetchErr => {
          err('Download failed:', fetchErr);
          this.setStatus('Download failed - try opening in browser');
          setTimeout(() => this.setStatus('Ready'), 3000);
        });
    }
  }

  /**
   * Open current URL in external browser
   */
  private openExternal(): void {
    const url = this.url || 'http://localhost:3000';
    log('🌐 Opening in browser:', url);
    
    // Try Tauri shell API first
    if ((window as any).__TAURI__) {
      import('@tauri-apps/plugin-shell').then(({ open }) => {
        open(url);
        this.setStatus('Opened in browser');
      }).catch(() => {
        // Fallback to window.open
        window.open(url, '_blank');
        this.setStatus('Opened in new window');
      });
    } else {
      window.open(url, '_blank');
      this.setStatus('Opened in new window');
    }
    
    setTimeout(() => this.setStatus('Ready'), 2000);
  }

  /**
   * Send HTML content to AI chat
   */
  private sendToAI(btn: HTMLElement): void {
    if (!this.iframe) {
      this.setStatus('No page to send');
      return;
    }
    
    this.setStatus('Extracting HTML...');
    
    let html = '';
    let filename = 'index.html';
    
    try {
      // Try to get HTML from iframe
      const doc = this.iframe.contentDocument || this.iframe.contentWindow?.document;
      
      if (doc) {
        html = doc.documentElement.outerHTML;
        
        // Generate filename from URL
        try {
          const urlObj = new URL(this.url);
          const pathname = urlObj.pathname;
          if (pathname && pathname !== '/') {
            filename = pathname.split('/').pop() || 'index.html';
            if (!filename.includes('.')) filename += '.html';
          }
        } catch {}
      } else {
        throw new Error('Cannot access iframe content');
      }
    } catch (error) {
      log('⚠️ Cannot access iframe content directly');
      this.setStatus('Cannot access page - trying fetch...');
      
      // Try fetch as fallback
      fetch(this.url)
        .then(res => res.text())
        .then(fetchedHtml => {
          this.showSendToAIDialog(fetchedHtml, filename, btn);
        })
        .catch(fetchErr => {
          err('Failed to fetch HTML:', fetchErr);
          this.setStatus('Cannot access page content');
          setTimeout(() => this.setStatus('Ready'), 2000);
        });
      return;
    }
    
    this.showSendToAIDialog(html, filename, btn);
  }

  /**
   * Get SVG icon for suggestion chip
   */
  private getSuggestionIcon(type: string): string {
    const icons: Record<string, string> = {
      bug: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="8" y="6" width="8" height="14" rx="4"></rect>
        <path d="M19 9h-3M19 15h-3M8 9H5M8 15H5M12 6V3"></path>
      </svg>`,
      style: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
      </svg>`,
      accessibility: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="4" r="2"></circle>
        <path d="M4 8h16M12 8v4M8 12l-2 8M16 12l2 8M9 20h6"></path>
      </svg>`,
      performance: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
      </svg>`,
      responsive: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
        <line x1="12" y1="18" x2="12.01" y2="18"></line>
      </svg>`,
      seo: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>`,
    };
    return icons[type] || icons.bug;
  }

  /**
   * Show dialog to compose message for AI
   */
  private showSendToAIDialog(html: string, filename: string, btn: HTMLElement): void {
    // Remove existing dialog
    document.getElementById('preview-ai-dialog')?.remove();
    
    const lineCount = html.split('\n').length;
    const charCount = html.length;
    
    // Default suggestions (shown while loading or as fallback)
    const defaultSuggestions = [
      { icon: 'sparkle', text: 'Analyzing...', prompt: '', loading: true },
    ];
    
    const dialog = document.createElement('div');
    dialog.id = 'preview-ai-dialog';
    dialog.innerHTML = this.buildDialogHTML(filename, lineCount, charCount, defaultSuggestions, true);
    
    document.body.appendChild(dialog);
    
    // Focus input
    const input = dialog.querySelector('#ai-prompt-input') as HTMLTextAreaElement;
    input?.focus();
    
    // Generate dynamic suggestions
    this.generateDynamicSuggestions(html, filename).then(suggestions => {
      const chipsContainer = dialog.querySelector('.pai-suggestion-chips');
      const loadingText = dialog.querySelector('.pai-loading-text');
      
      // Remove loading text with fade
      if (loadingText) {
        (loadingText as HTMLElement).style.opacity = '0';
        setTimeout(() => loadingText.remove(), 200);
      }
      
      if (chipsContainer && suggestions.length > 0) {
        // Add chips with pop-in animation
        chipsContainer.innerHTML = suggestions.map((s, i) => `
          <button class="pai-chip pai-chip-pop" data-prompt="${s.prompt.replace(/"/g, '&quot;')}" data-index="${i}" style="--delay:${i}">
            ${this.getSuggestionIcon(s.icon)}
            <span>${s.text}</span>
          </button>
        `).join('');
        
        // Re-attach click handlers
        chipsContainer.querySelectorAll('.pai-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            const prompt = (chip as HTMLElement).dataset.prompt || '';
            if (input) {
              input.value = prompt;
              input.focus();
            }
            chipsContainer.querySelectorAll('.pai-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
          });
        });
      }
    }).catch(err => {
      log('⚠️ Failed to generate suggestions:', err);
      
      // Remove loading text
      const loadingText = dialog.querySelector('.pai-loading-text');
      if (loadingText) {
        (loadingText as HTMLElement).style.opacity = '0';
        setTimeout(() => loadingText.remove(), 200);
      }
      
      // Show fallback suggestions with animation - UI IMPROVEMENT FOCUSED
      const fallbackSuggestions = [
        { 
          icon: 'style', 
          text: 'Improve UI', 
          prompt: 'Review the current UI and suggest specific improvements. Keep the existing structure but enhance the visual design. Show me the exact CSS/style changes needed - do NOT rewrite the entire component.'
        },
        { 
          icon: 'layout', 
          text: 'Fix layout', 
          prompt: 'Analyze the current layout and fix any spacing, alignment, or positioning issues. Show me only the specific CSS changes needed to improve the layout - preserve all existing functionality.'
        },
        { 
          icon: 'responsive', 
          text: 'Make responsive', 
          prompt: 'Add responsive design to this UI. Show me only the media queries and changes needed - do not rewrite the existing code. Keep current desktop layout and add mobile adaptations.'
        },
        { 
          icon: 'color', 
          text: 'Better colors', 
          prompt: 'Suggest a better color scheme for this UI. Show me only the specific color changes needed in CSS - keep the existing structure and just update the color values.'
        },
        { 
          icon: 'animation', 
          text: 'Add animations', 
          prompt: 'Add subtle, professional animations to improve UX. Show me only the CSS animations/transitions to add - do not change the existing HTML structure.'
        },
        { 
          icon: 'accessibility', 
          text: 'Accessibility', 
          prompt: 'Check accessibility and suggest specific fixes. Show me the exact attribute changes needed (aria labels, roles, etc.) - do not restructure the code.'
        },
      ];
      
      const chipsContainer = dialog.querySelector('.pai-suggestion-chips');
      if (chipsContainer) {
        chipsContainer.innerHTML = fallbackSuggestions.map((s, i) => `
          <button class="pai-chip pai-chip-pop" data-prompt="${s.prompt.replace(/"/g, '&quot;')}" data-index="${i}" style="--delay:${i}">
            ${this.getSuggestionIcon(s.icon)}
            <span>${s.text}</span>
          </button>
        `).join('');
        
        // Re-attach click handlers
        chipsContainer.querySelectorAll('.pai-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            const prompt = (chip as HTMLElement).dataset.prompt || '';
            if (input) {
              input.value = prompt;
              input.focus();
            }
            chipsContainer.querySelectorAll('.pai-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
          });
        });
      }
    });
    
    // Suggestion chip clicks (for initial loading chips)
    dialog.querySelectorAll('.pai-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = (chip as HTMLElement).dataset.prompt || '';
        if (prompt && input) {
          input.value = prompt;
          input.focus();
        }
        dialog.querySelectorAll('.pai-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
    
    // Close button
    dialog.querySelector('#pai-close')?.addEventListener('click', () => {
      dialog.remove();
      this.setStatus('Ready');
    });
    
    // Cancel button
    dialog.querySelector('#ai-dialog-cancel')?.addEventListener('click', () => {
      dialog.remove();
      this.setStatus('Ready');
    });
    
    // Click outside to close
    dialog.querySelector('.pai-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        dialog.remove();
        this.setStatus('Ready');
      }
    });
    
    // Send button - ENHANCED with screenshot and better context
    dialog.querySelector('#ai-dialog-send')?.addEventListener('click', async () => {
      const prompt = input.value.trim();
      const includeStyles = (dialog.querySelector('#ai-include-styles') as HTMLInputElement)?.checked;
      const includeScreenshot = (dialog.querySelector('#ai-include-screenshot') as HTMLInputElement)?.checked;
      const focusMode = (dialog.querySelector('#ai-focus-mode') as HTMLInputElement)?.checked;
      
      let htmlToSend = html;
      
      // Optionally clean up HTML
      if (!includeStyles) {
        htmlToSend = this.cleanHTML(html);
      }
      
      // Show sending state
      const sendBtn = dialog.querySelector('#ai-dialog-send') as HTMLButtonElement;
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span>Capturing...</span>';
      }
      
      // Capture screenshot if enabled and possible
      let screenshotBase64 = '';
      if (includeScreenshot && this.iframe) {
        try {
          screenshotBase64 = await this.capturePreviewScreenshot();
          log('📸 Screenshot captured:', screenshotBase64.length, 'bytes');
        } catch (e) {
          log('⚠️ Screenshot capture failed:', e);
        }
      }
      
      // Format message based on focus mode
      let message: string;
      if (focusMode) {
        message = this.formatAIMessageEnhanced(prompt, htmlToSend, filename, screenshotBase64);
      } else {
        message = this.formatAIMessage(prompt, htmlToSend, filename);
      }
      
      // Send to AI chat
      this.insertIntoAIChat(message, screenshotBase64);
      
      dialog.remove();
      
      // Visual feedback
      btn.style.color = '#4caf50';
      this.setStatus('Sent to AI chat!');
      setTimeout(() => {
        btn.style.color = '#a78bfa';
        this.setStatus('Ready');
      }, 2000);
    });
    
    // Enter to send (Ctrl+Enter)
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        dialog.querySelector('#ai-dialog-send')?.dispatchEvent(new Event('click'));
      }
      if (e.key === 'Escape') {
        dialog.remove();
        this.setStatus('Ready');
      }
    });
    
    this.setStatus('Compose your prompt...');
  }

  /**
   * Generate dynamic suggestions using AI API
   */
  private async generateDynamicSuggestions(html: string, filename: string): Promise<Array<{icon: string, text: string, prompt: string}>> {
    // Get a summary of the HTML for analysis
    const htmlSummary = this.getHTMLSummary(html);
    
    const systemPrompt = `You are a UI/UX expert analyzing an HTML page to suggest INCREMENTAL improvements.

IMPORTANT: All suggestions must ask for SMALL, SPECIFIC changes - NOT full rewrites.

Respond ONLY with a JSON array in this exact format:
[
  {"icon": "icon_name", "text": "Short Label", "prompt": "Detailed prompt asking for SPECIFIC changes only"}
]

Available icons: style, layout, responsive, color, font, animation, spacing, border, shadow, form, button, card, navigation, header, footer, mobile, accessibility, image, icon, hover

RULES for prompts:
1. Ask for SPECIFIC changes to improve the CURRENT design
2. Include phrases like: "Show me only the changes", "Keep existing structure", "Don't rewrite"
3. Focus on ONE aspect per suggestion
4. Be specific about what to improve

Example good prompts:
- "Improve the button styles - add better hover effects and shadows. Show only the CSS changes needed."
- "Fix the spacing between cards - adjust margins/padding. Keep existing layout, just fix spacing."
- "Make the header sticky with a subtle shadow. Show only the CSS additions needed."

Example BAD prompts (too vague):
- "Make it look better" (too vague)
- "Redesign the page" (asks for rewrite)
- "Improve the UI" (not specific)`;

    const userPrompt = `Analyze this HTML page and suggest 4-6 SPECIFIC, INCREMENTAL UI improvements:

Filename: ${filename}
${htmlSummary}

Remember: Suggestions should ask for small, targeted changes - not rewrites. Each prompt should specify what exact aspect to improve.

Generate JSON array only.`;

    try {
      // Use window.callGenericAPI if available, otherwise use fetch
      if ((window as any).callGenericAPI) {
        const config = (window as any).getCurrentApiConfigurationForced?.() || 
                       (window as any).getCurrentApiConfiguration?.();
        
        if (config) {
          const response = await (window as any).callGenericAPI(userPrompt, config, [
            { role: 'system', content: systemPrompt }
          ]);
          
          return this.parseSuggestionsResponse(response);
        }
      }
      
      // Fallback: Try direct API call
      const apiConfig = this.getAPIConfig();
      if (apiConfig) {
        const response = await this.callSuggestionsAPI(systemPrompt, userPrompt, apiConfig);
        return this.parseSuggestionsResponse(response);
      }
      
      throw new Error('No API configuration available');
    } catch (error) {
      log('⚠️ Suggestion generation error:', error);
      throw error;
    }
  }

  /**
   * Get a summary of the HTML for AI analysis
   */
  private getHTMLSummary(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    const summary: string[] = [];
    
    // Title
    const title = doc.querySelector('title')?.textContent;
    if (title) summary.push(`Title: ${title}`);
    
    // Meta description
    const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content');
    if (metaDesc) summary.push(`Description: ${metaDesc.substring(0, 100)}`);
    
    // Count elements
    const counts: Record<string, number> = {};
    const countElements = ['div', 'section', 'article', 'header', 'footer', 'nav', 'form', 'input', 'button', 'img', 'a', 'table', 'ul', 'ol', 'h1', 'h2', 'h3', 'p', 'script', 'style', 'canvas', 'video', 'audio', 'iframe'];
    
    countElements.forEach(tag => {
      const count = doc.querySelectorAll(tag).length;
      if (count > 0) counts[tag] = count;
    });
    
    summary.push(`\nElement counts: ${JSON.stringify(counts)}`);
    
    // Check for frameworks
    const frameworks: string[] = [];
    if (html.includes('react') || html.includes('React')) frameworks.push('React');
    if (html.includes('vue') || html.includes('Vue')) frameworks.push('Vue');
    if (html.includes('angular') || html.includes('Angular')) frameworks.push('Angular');
    if (html.includes('tailwind') || html.includes('Tailwind')) frameworks.push('Tailwind');
    if (html.includes('bootstrap') || html.includes('Bootstrap')) frameworks.push('Bootstrap');
    
    if (frameworks.length > 0) {
      summary.push(`Detected frameworks: ${frameworks.join(', ')}`);
    }
    
    // Check for specific features
    const features: string[] = [];
    if (counts.form) features.push('forms');
    if (counts.img && counts.img > 3) features.push('image-heavy');
    if (counts.nav) features.push('navigation');
    if (counts.table) features.push('tables');
    if (counts.canvas || counts.video) features.push('media');
    if (html.includes('@media') || html.includes('responsive')) features.push('responsive styles');
    if (html.includes('animation') || html.includes('@keyframes')) features.push('animations');
    
    if (features.length > 0) {
      summary.push(`Features: ${features.join(', ')}`);
    }
    
    // First 500 chars of body text
    const bodyText = doc.body?.textContent?.replace(/\s+/g, ' ').trim().substring(0, 300);
    if (bodyText) {
      summary.push(`\nContent preview: ${bodyText}...`);
    }
    
    return summary.join('\n');
  }

  /**
   * Parse suggestions from AI response
   */
  private parseSuggestionsResponse(response: string): Array<{icon: string, text: string, prompt: string}> {
    try {
      // Try to extract JSON from response
      let jsonStr = response;
      
      // Find JSON array in response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonStr);
      
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Validate and sanitize
        return parsed.slice(0, 6).map(item => ({
          icon: String(item.icon || 'sparkle'),
          text: String(item.text || 'Suggestion').substring(0, 30),
          prompt: String(item.prompt || '')
        })).filter(item => item.prompt.length > 0);
      }
    } catch (e) {
      log('⚠️ Failed to parse suggestions JSON:', e);
    }
    
    return [];
  }

  /**
   * Get API configuration
   */
  private getAPIConfig(): any {
    // Try various ways to get config
    if ((window as any).getCurrentApiConfigurationForced) {
      return (window as any).getCurrentApiConfigurationForced();
    }
    if ((window as any).getCurrentApiConfiguration) {
      return (window as any).getCurrentApiConfiguration();
    }
    if ((window as any).apiConfig) {
      return (window as any).apiConfig;
    }
    return null;
  }

  /**
   * Direct API call for suggestions
   */
  private async callSuggestionsAPI(system: string, user: string, config: any): Promise<string> {
    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ];
    
    // Anthropic/Claude API
    if (config.provider === 'anthropic' || config.apiKey?.startsWith('sk-ant')) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: config.model || 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: messages.map(m => ({ role: m.role === 'system' ? 'user' : m.role, content: m.content }))
        })
      });
      
      const data = await response.json();
      return data.content?.[0]?.text || '';
    }
    
    // OpenAI API
    if (config.provider === 'openai' || config.apiKey?.startsWith('sk-')) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'gpt-3.5-turbo',
          messages: messages,
          max_tokens: 1000
        })
      });
      
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }
    
    throw new Error('Unknown API provider');
  }

  /**
   * Build the dialog HTML
   */
  private buildDialogHTML(filename: string, lineCount: number, charCount: number, suggestions: any[], loading: boolean): string {
    return `
      <div class="pai-overlay">
        <div class="pai-dialog">
          <!-- Header -->
          <div class="pai-header">
            <div class="pai-header-left">
              <div class="pai-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                  <circle cx="7.5" cy="14.5" r="1.5" fill="currentColor"/>
                  <circle cx="16.5" cy="14.5" r="1.5" fill="currentColor"/>
                </svg>
              </div>
              <span class="pai-title">Send to AI Assistant</span>
            </div>
            <div class="pai-header-right">
              <span class="pai-filename">${filename}</span>
              <button class="pai-close-btn" id="pai-close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- File Info Bar -->
          <div class="pai-info-bar">
            <div class="pai-info-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <span>${lineCount} lines</span>
            </div>
            <div class="pai-info-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
              <span>${(charCount / 1024).toFixed(1)} KB</span>
            </div>
            <div class="pai-info-item pai-info-url">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              <span>${this.url}</span>
            </div>
          </div>
          
          <!-- Body -->
          <div class="pai-body">
            <!-- Quick Suggestions -->
            <div class="pai-suggestions">
              <div class="pai-suggestions-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <span>AI Suggestions</span>
                ${loading ? '<span class="pai-loading-text">analyzing...</span>' : ''}
              </div>
              <div class="pai-suggestion-chips">
                ${loading ? `
                  <div class="pai-chip pai-chip-skeleton" style="--delay:0"><span class="pai-skeleton-bar"></span></div>
                  <div class="pai-chip pai-chip-skeleton" style="--delay:1"><span class="pai-skeleton-bar"></span></div>
                  <div class="pai-chip pai-chip-skeleton" style="--delay:2"><span class="pai-skeleton-bar"></span></div>
                  <div class="pai-chip pai-chip-skeleton" style="--delay:3"><span class="pai-skeleton-bar"></span></div>
                ` : suggestions.map((s, i) => `
                  <button class="pai-chip pai-chip-pop" data-prompt="${(s.prompt || '').replace(/"/g, '&quot;')}" data-index="${i}" style="--delay:${i}">
                    ${this.getSuggestionIcon(s.icon)}
                    <span>${s.text}</span>
                  </button>
                `).join('')}
              </div>
            </div>
            
            <!-- Prompt Input -->
            <div class="pai-prompt-section">
              <label class="pai-label">Your prompt</label>
              <div class="pai-textarea-wrapper">
                <textarea id="ai-prompt-input" class="pai-textarea" placeholder="Describe what you want AI to do with this HTML..."></textarea>
              </div>
            </div>
            
            <!-- Options -->
            <div class="pai-options">
              <label class="pai-checkbox">
                <input type="checkbox" id="ai-include-styles" checked>
                <span class="pai-checkmark"></span>
                <span>Include inline styles and scripts</span>
              </label>
              <label class="pai-checkbox">
                <input type="checkbox" id="ai-include-screenshot" checked>
                <span class="pai-checkmark"></span>
                <span>📸 Capture screenshot (if available)</span>
              </label>
              <label class="pai-checkbox">
                <input type="checkbox" id="ai-focus-mode" checked>
                <span class="pai-checkmark"></span>
                <span>🎯 Focus mode (AI focuses on your specific request)</span>
              </label>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="pai-footer">
            <div class="pai-footer-hint">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>Ctrl+Enter to send</span>
            </div>
            <div class="pai-footer-actions">
              <button id="ai-dialog-cancel" class="pai-btn pai-btn-secondary">Cancel</button>
              <button id="ai-dialog-send" class="pai-btn pai-btn-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                <span>Send to AI</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <style>
        .pai-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: paiFadeIn 0.3s ease;
        }
        
        /* ===== KEYFRAME ANIMATIONS ===== */
        @keyframes paiFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes paiSlideIn {
          0% { opacity: 0; transform: translateY(-30px) scale(0.9); }
          60% { transform: translateY(5px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        @keyframes paiPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes paiSpin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes paiShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes paiChipPop {
          0% { opacity: 0; transform: scale(0.5) translateY(15px); }
          50% { transform: scale(1.1) translateY(-3px); }
          70% { transform: scale(0.95) translateY(1px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        @keyframes paiTextPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        
        @keyframes paiGlow {
          0%, 100% { box-shadow: 0 0 5px rgba(124, 58, 237, 0.3); }
          50% { box-shadow: 0 0 20px rgba(124, 58, 237, 0.6), 0 0 30px rgba(124, 58, 237, 0.3); }
        }
        
        @keyframes paiSkeletonPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        
        @keyframes paiWave {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(3px); }
        }
        
        @keyframes paiFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        
        @keyframes paiGradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes paiIconBounce {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.1) rotate(-5deg); }
          50% { transform: scale(1) rotate(0deg); }
          75% { transform: scale(1.1) rotate(5deg); }
        }
        
        @keyframes paiCheckPop {
          0% { transform: scale(0) rotate(-45deg); }
          50% { transform: scale(1.3) rotate(0deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        
        @keyframes paiBorderGlow {
          0%, 100% { border-color: #3c3c3c; }
          50% { border-color: #7c3aed; }
        }
        
        @keyframes paiRipple {
          0% { transform: scale(0); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        
        @keyframes paiShine {
          0% { left: -100%; }
          50%, 100% { left: 100%; }
        }
        
        @keyframes paiPulseRing {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        
        @keyframes paiTypewriter {
          from { width: 0; }
          to { width: 100%; }
        }
        
        /* ===== LOADING STATES ===== */
        .pai-loading-text {
          font-size: 10px;
          color: #7c3aed;
          margin-left: 8px;
          animation: paiTextPulse 1.2s ease-in-out infinite;
          text-transform: lowercase;
          letter-spacing: 0.5px;
          font-weight: 500;
          transition: opacity 0.2s ease;
        }
        
        .pai-loading-dot {
          width: 6px;
          height: 6px;
          background: #7c3aed;
          border-radius: 50%;
          margin-left: 6px;
          animation: paiPulse 1s ease-in-out infinite;
        }
        
        .pai-loading-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid #3c3c3c;
          border-top-color: #7c3aed;
          border-radius: 50%;
          animation: paiSpin 0.8s linear infinite;
        }
        
        /* Skeleton chip loading state */
        .pai-chip-skeleton {
          background: linear-gradient(90deg, #2a2a2d 0%, #3c3c3c 50%, #2a2a2d 100%) !important;
          background-size: 200% 100% !important;
          animation: paiShimmer 1.8s ease-in-out infinite, paiSkeletonPulse 2s ease-in-out infinite !important;
          animation-delay: calc(var(--delay, 0) * 0.15s) !important;
          pointer-events: none !important;
          border-color: #333 !important;
          min-width: 85px;
          height: 32px;
        }
        
        .pai-skeleton-bar {
          display: block;
          width: 55px;
          height: 10px;
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
        }
        
        /* Chip pop-in animation */
        .pai-chip-pop {
          animation: paiChipPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: calc(var(--delay, 0) * 0.1s);
          opacity: 0;
        }
        
        .pai-chip-loading {
          background: linear-gradient(90deg, #2d2d30 0%, #3c3c3c 50%, #2d2d30 100%) !important;
          background-size: 200% 100% !important;
          animation: paiShimmer 1.5s ease-in-out infinite !important;
          pointer-events: none !important;
        }
        
        /* ===== DIALOG ===== */
        .pai-dialog {
          background: linear-gradient(180deg, #1e1e1e 0%, #191919 100%);
          border: 1px solid #3c3c3c;
          border-radius: 16px;
          width: 520px;
          max-width: 90vw;
          max-height: 85vh;
          overflow: hidden;
          box-shadow: 
            0 25px 80px rgba(0, 0, 0, 0.6),
            0 0 0 1px rgba(255,255,255,0.05) inset,
            0 0 60px rgba(124, 58, 237, 0.1);
          animation: paiSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
        }
        
        /* Ambient glow effect */
        .pai-dialog::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at 30% 20%, rgba(124, 58, 237, 0.08) 0%, transparent 50%);
          pointer-events: none;
          animation: paiFloat 8s ease-in-out infinite;
        }
        
        .pai-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(30, 30, 30, 0.95) 100%);
          border-bottom: 1px solid rgba(124, 58, 237, 0.2);
          position: relative;
          overflow: hidden;
        }
        
        /* Animated gradient line under header */
        .pai-header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #7c3aed, #a855f7, #7c3aed, transparent);
          background-size: 200% 100%;
          animation: paiGradientShift 3s linear infinite;
        }
        
        .pai-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .pai-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 4px 15px rgba(124, 58, 237, 0.4);
          animation: paiFloat 3s ease-in-out infinite;
          position: relative;
        }
        
        .pai-icon::after {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 12px;
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          z-index: -1;
          opacity: 0.4;
          filter: blur(8px);
          animation: paiPulse 2s ease-in-out infinite;
        }
        
        .pai-title {
          font-size: 15px;
          font-weight: 600;
          color: #f0f0f0;
          letter-spacing: 0.3px;
        }
        
        .pai-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .pai-filename {
          font-size: 11px;
          color: #a78bfa;
          padding: 5px 10px;
          background: rgba(124, 58, 237, 0.15);
          border: 1px solid rgba(124, 58, 237, 0.25);
          border-radius: 6px;
          font-family: 'Consolas', 'Monaco', monospace;
          transition: all 0.2s ease;
        }
        
        .pai-filename:hover {
          background: rgba(124, 58, 237, 0.25);
          border-color: rgba(124, 58, 237, 0.4);
        }
        
        .pai-close-btn {
          width: 30px;
          height: 30px;
          border: none;
          background: rgba(255, 255, 255, 0.05);
          color: #888;
          cursor: pointer;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .pai-close-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          transform: rotate(90deg) scale(1.1);
        }
        
        .pai-info-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 18px;
          background: rgba(37, 37, 38, 0.8);
          border-bottom: 1px solid rgba(60, 60, 60, 0.5);
        }
        
        .pai-info-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #888;
          transition: all 0.2s ease;
        }
        
        .pai-info-item:hover {
          color: #b0b0b0;
        }
        
        .pai-info-item svg {
          color: #666;
          transition: all 0.2s ease;
        }
        
        .pai-info-item:hover svg {
          color: #7c3aed;
          transform: scale(1.1);
        }
        
        .pai-info-url {
          flex: 1;
          min-width: 0;
        }
        
        .pai-info-url span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .pai-body {
          padding: 18px;
          position: relative;
        }
        
        .pai-suggestions {
          margin-bottom: 18px;
        }
        
        .pai-suggestions-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #888;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 500;
        }
        
        .pai-suggestions-label svg {
          color: #7c3aed;
          animation: paiIconBounce 2s ease-in-out infinite;
        }
        
        .pai-suggestion-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          min-height: 40px;
        }
        
        .pai-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 14px;
          background: rgba(45, 45, 48, 0.8);
          border: 1px solid rgba(60, 60, 60, 0.8);
          border-radius: 20px;
          color: #b0b0b0;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(4px);
        }
        
        /* Shine effect on hover */
        .pai-chip::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
          transition: none;
        }
        
        .pai-chip:hover::before {
          animation: paiShine 0.6s ease forwards;
        }
        
        .pai-chip:hover {
          background: rgba(124, 58, 237, 0.2);
          border-color: rgba(124, 58, 237, 0.6);
          color: #e0e0e0;
          transform: translateY(-3px) scale(1.02);
          box-shadow: 
            0 8px 20px rgba(124, 58, 237, 0.25),
            0 0 0 1px rgba(124, 58, 237, 0.3) inset;
        }
        
        .pai-chip:active {
          transform: translateY(-1px) scale(0.98);
          transition-duration: 0.1s;
        }
        
        .pai-chip.active {
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.3) 0%, rgba(168, 85, 247, 0.2) 100%);
          border-color: #7c3aed;
          color: #d4bfff;
          animation: paiBorderGlow 2s ease-in-out infinite;
          box-shadow: 
            0 4px 15px rgba(124, 58, 237, 0.3),
            0 0 20px rgba(124, 58, 237, 0.2) inset;
        }
        
        .pai-chip svg {
          width: 14px;
          height: 14px;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .pai-chip:hover svg {
          transform: scale(1.2) rotate(-10deg);
          color: #a78bfa;
        }
        
        .pai-prompt-section {
          margin-bottom: 14px;
        }
        
        .pai-label {
          display: block;
          font-size: 12px;
          color: #b0b0b0;
          margin-bottom: 10px;
          font-weight: 500;
          letter-spacing: 0.3px;
        }
        
        .pai-textarea-wrapper {
          position: relative;
        }
        
        /* Animated border gradient */
        .pai-textarea-wrapper::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 10px;
          background: linear-gradient(135deg, #3c3c3c, #7c3aed, #3c3c3c);
          background-size: 300% 300%;
          z-index: -1;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .pai-textarea-wrapper:focus-within::before {
          opacity: 1;
          animation: paiGradientShift 3s linear infinite;
        }
        
        .pai-textarea {
          width: 100%;
          height: 100px;
          background: rgba(37, 37, 38, 0.9);
          border: 1px solid #3c3c3c;
          border-radius: 10px;
          padding: 14px;
          color: #e0e0e0;
          font-size: 13px;
          font-family: inherit;
          resize: vertical;
          box-sizing: border-box;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          z-index: 1;
        }
        
        .pai-textarea:focus {
          outline: none;
          border-color: #7c3aed;
          background: rgba(30, 30, 30, 0.95);
          box-shadow: 
            0 0 0 4px rgba(124, 58, 237, 0.15),
            0 8px 25px rgba(0, 0, 0, 0.3);
          transform: translateY(-2px);
        }
        
        .pai-textarea::placeholder {
          color: #666;
          transition: all 0.3s ease;
        }
        
        .pai-textarea:focus::placeholder {
          color: #888;
          transform: translateX(5px);
        }
        
        .pai-options {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .pai-checkbox {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          color: #888;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 8px;
          transition: all 0.2s ease;
          margin-left: -10px;
        }
        
        .pai-checkbox:hover {
          background: rgba(124, 58, 237, 0.08);
          color: #b0b0b0;
        }
        
        .pai-checkbox input {
          display: none;
        }
        
        .pai-checkmark {
          width: 18px;
          height: 18px;
          border: 2px solid #4a4a4a;
          border-radius: 5px;
          background: rgba(37, 37, 38, 0.8);
          position: relative;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          flex-shrink: 0;
        }
        
        .pai-checkbox:hover .pai-checkmark {
          border-color: #7c3aed;
          transform: scale(1.1);
        }
        
        .pai-checkbox input:checked + .pai-checkmark {
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          border-color: #7c3aed;
          box-shadow: 0 2px 10px rgba(124, 58, 237, 0.4);
          transform: scale(1);
        }
        
        .pai-checkbox input:checked + .pai-checkmark::after {
          content: '';
          position: absolute;
          left: 5px;
          top: 1px;
          width: 5px;
          height: 10px;
          border: solid #fff;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
          animation: paiCheckPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .pai-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          background: linear-gradient(180deg, rgba(37, 37, 38, 0.9) 0%, rgba(30, 30, 30, 0.95) 100%);
          border-top: 1px solid rgba(60, 60, 60, 0.5);
        }
        
        .pai-footer-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #555;
        }
        
        .pai-footer-hint svg {
          opacity: 0.5;
        }
        
        .pai-footer-actions {
          display: flex;
          gap: 10px;
        }
        
        .pai-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }
        
        .pai-btn-secondary {
          background: rgba(60, 60, 60, 0.6);
          border: 1px solid #4a4a4a;
          color: #bbb;
          backdrop-filter: blur(4px);
        }
        
        .pai-btn-secondary:hover {
          background: rgba(74, 74, 74, 0.8);
          border-color: #5a5a5a;
          color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        
        .pai-btn-secondary:active {
          transform: translateY(0) scale(0.98);
        }
        
        .pai-btn-primary {
          background: linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #7c3aed 100%);
          background-size: 200% 200%;
          border: none;
          color: #fff;
          box-shadow: 
            0 4px 15px rgba(124, 58, 237, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.1) inset;
          animation: paiGradientShift 4s ease infinite;
        }
        
        /* Shine effect */
        .pai-btn-primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        }
        
        .pai-btn-primary:hover::before {
          animation: paiShine 0.8s ease;
        }
        
        /* Pulse ring on hover */
        .pai-btn-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 10px;
          border: 2px solid rgba(124, 58, 237, 0.5);
          opacity: 0;
        }
        
        .pai-btn-primary:hover::after {
          animation: paiPulseRing 1s ease-out infinite;
        }
        
        .pai-btn-primary:hover {
          background-size: 200% 200%;
          box-shadow: 
            0 8px 30px rgba(124, 58, 237, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.15) inset,
            0 0 40px rgba(124, 58, 237, 0.3);
          transform: translateY(-3px) scale(1.02);
        }
        
        .pai-btn-primary:active {
          transform: translateY(-1px) scale(0.98);
          box-shadow: 
            0 4px 15px rgba(124, 58, 237, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.1) inset;
        }
        
        .pai-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          animation: none;
        }
        
        .pai-btn-primary svg {
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .pai-btn-primary:hover svg {
          transform: translateX(3px) rotate(15deg);
        }
        
        .pai-btn-primary:hover svg {
          transform: translateX(3px);
        }
      </style>
    `;
  }

  /**
   * Clean HTML by removing style and script tags
   */
  private cleanHTML(html: string): string {
    // Remove style tags
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    // Remove script tags
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    // Remove inline styles
    html = html.replace(/\s+style="[^"]*"/gi, '');
    // Remove empty lines
    html = html.replace(/^\s*[\r\n]/gm, '');
    return html;
  }

  /**
   * Format message for AI chat
   */
  private formatAIMessage(prompt: string, html: string, filename: string): string {
    const defaultPrompt = 'Please review this HTML and suggest improvements.';
    const userPrompt = prompt || defaultPrompt;
    
    // Get project context
    const projectPath = this.getCurrentProject();
    const projectName = projectPath ? projectPath.split(/[/\\]/).pop() : '';
    
    // Analyze the HTML structure
    const htmlSummary = this.analyzeHTMLForUI(html);
    
    // Get currently open file
    const currentFile = (window as any).currentOpenFile || 
                        (window as any).activeFile || 
                        (window as any).currentFilePath || '';
    
    // Try to read related source files
    const sourceFiles = this.getRelatedSourceFiles();
    
    // Detect what type of improvement the user wants
    const isUIImprovement = /improv|better|enhance|style|design|look|visual|ui|ux|modern|clean|fix.*ui|update.*ui/i.test(userPrompt);
    const isLayoutFix = /layout|position|align|center|flex|grid|spacing|margin|padding/i.test(userPrompt);
    const isStyleFix = /color|font|style|css|theme|dark|light/i.test(userPrompt);
    const isResponsiveFix = /responsive|mobile|tablet|breakpoint|media query/i.test(userPrompt);
    
    // Build intelligent prompt based on context
    let contextSection = '';
    
    if (isUIImprovement || isLayoutFix || isStyleFix) {
      contextSection = `
## 🎨 UI Improvement Request

**Important Guidelines:**
- Make **incremental improvements** to the existing code
- Do NOT rewrite from scratch - preserve current structure
- Keep existing functionality intact
- Only modify what's necessary to achieve the improvement
- Show me the specific changes with clear before/after context

`;
    }
    
    // Add HTML structure analysis
    contextSection += `
## Current Page Analysis
${htmlSummary}
`;
    
    // Add source file context if available
    if (sourceFiles) {
      contextSection += `
## Related Source Files
${sourceFiles}
`;
    }
    
    // Add current file context
    if (currentFile) {
      contextSection += `
## Currently Open in Editor
\`${currentFile}\`
`;
    }
    
    return `${userPrompt}
${contextSection}
## Preview HTML from \`${filename}\` (${this.url})

\`\`\`html
${html.length > 8000 ? html.substring(0, 8000) + '\n<!-- ... truncated ... -->' : html}
\`\`\`

${isUIImprovement ? `
**Please:**
1. Identify specific areas to improve
2. Show the **exact code changes** needed (not a full rewrite)
3. Explain why each change improves the UI
4. If modifying CSS, show only the changed/added rules
` : ''}`;
  }
  
  /**
   * Analyze HTML structure for UI context
   */
  private analyzeHTMLForUI(html: string): string {
    const analysis: string[] = [];
    
    // Detect framework
    if (html.includes('data-reactroot') || html.includes('__next')) {
      analysis.push('**Framework:** React/Next.js');
    } else if (html.includes('ng-') || html.includes('_ngcontent')) {
      analysis.push('**Framework:** Angular');
    } else if (html.includes('data-v-') || html.includes('v-')) {
      analysis.push('**Framework:** Vue.js');
    }
    
    // Count key elements
    const elementCounts: Record<string, number> = {};
    const tags = ['div', 'button', 'input', 'form', 'img', 'a', 'nav', 'header', 'footer', 'section', 'article', 'ul', 'table'];
    tags.forEach(tag => {
      const regex = new RegExp(`<${tag}[\\s>]`, 'gi');
      const count = (html.match(regex) || []).length;
      if (count > 0) elementCounts[tag] = count;
    });
    
    if (Object.keys(elementCounts).length > 0) {
      analysis.push('**Elements:** ' + Object.entries(elementCounts)
        .map(([tag, count]) => `${tag}(${count})`)
        .join(', '));
    }
    
    // Detect styling approach
    const hasInlineStyles = html.includes('style="');
    const hasTailwind = /class="[^"]*(?:flex|grid|p-|m-|text-|bg-|w-|h-)[^"]*"/.test(html);
    const hasBootstrap = /class="[^"]*(?:container|row|col-|btn-|card)[^"]*"/.test(html);
    
    const styling: string[] = [];
    if (hasTailwind) styling.push('Tailwind CSS');
    if (hasBootstrap) styling.push('Bootstrap');
    if (hasInlineStyles) styling.push('Inline styles');
    if (styling.length > 0) {
      analysis.push('**Styling:** ' + styling.join(', '));
    }
    
    // Detect page type
    const hasNav = /<nav/i.test(html);
    const hasHeader = /<header/i.test(html);
    const hasFooter = /<footer/i.test(html);
    const hasForms = /<form/i.test(html) || /<input/i.test(html);
    const hasCards = /card|Card/i.test(html);
    const hasTable = /<table/i.test(html);
    
    const features: string[] = [];
    if (hasNav) features.push('Navigation');
    if (hasHeader) features.push('Header');
    if (hasFooter) features.push('Footer');
    if (hasForms) features.push('Forms/Inputs');
    if (hasCards) features.push('Cards');
    if (hasTable) features.push('Tables');
    
    if (features.length > 0) {
      analysis.push('**UI Components:** ' + features.join(', '));
    }
    
    // Detect potential issues
    const issues: string[] = [];
    if (!html.includes('aria-') && !html.includes('role=')) {
      issues.push('Missing accessibility attributes');
    }
    if (html.includes('<img') && !html.includes('alt=')) {
      issues.push('Images may lack alt text');
    }
    if (/<div[^>]*>\s*<div[^>]*>\s*<div/i.test(html)) {
      issues.push('Deep div nesting detected');
    }
    
    if (issues.length > 0) {
      analysis.push('**Potential Issues:** ' + issues.join(', '));
    }
    
    return analysis.join('\n');
  }
  
  /**
   * Get related source files from the project
   */
  private getRelatedSourceFiles(): string {
    const files: string[] = [];
    
    try {
      // Check for common React/Vue entry points
      const fileExplorer = (window as any).aiFileExplorer;
      if (fileExplorer?.files) {
        const relevantFiles = ['App.tsx', 'App.jsx', 'App.vue', 'App.css', 'index.css', 'styles.css', 'main.css', 'globals.css'];
        
        for (const [path, content] of Object.entries(fileExplorer.files)) {
          const filename = path.split(/[/\\]/).pop() || '';
          if (relevantFiles.some(f => filename.toLowerCase() === f.toLowerCase())) {
            // Add truncated content
            const fileContent = content as string;
            if (fileContent && fileContent.length > 0) {
              const preview = fileContent.length > 500 ? fileContent.substring(0, 500) + '...' : fileContent;
              files.push(`### ${filename}\n\`\`\`\n${preview}\n\`\`\``);
            }
          }
        }
      }
      
      // Also check currently open files via tabManager
      const openFiles = (window as any).tabManager?.getOpenFiles?.() || [];
      if (openFiles.length > 0) {
        files.push(`**Open tabs:** ${openFiles.map((f: any) => f.name || f).join(', ')}`);
      }
    } catch (e) {
      // Ignore errors
    }
    
    return files.length > 0 ? files.join('\n\n') : '';
  }

  /**
   * Capture screenshot of preview iframe
   */
  private async capturePreviewScreenshot(): Promise<string> {
    if (!this.iframe) return '';
    
    try {
      // Method 1: Use html2canvas if available
      if ((window as any).html2canvas) {
        const canvas = await (window as any).html2canvas(this.iframe);
        return canvas.toDataURL('image/png');
      }
      
      // Method 2: Try to capture via Tauri
      if ((window as any).__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core');
        try {
          const screenshot = await invoke('capture_window_screenshot');
          if (screenshot) return screenshot as string;
        } catch (e) {
          log('⚠️ Tauri screenshot failed:', e);
        }
      }
      
      // Method 3: Create canvas from iframe content (same-origin only)
      try {
        const doc = this.iframe.contentDocument;
        if (doc && doc.body) {
          // Create a simple representation
          const rect = this.iframe.getBoundingClientRect();
          const canvas = document.createElement('canvas');
          canvas.width = rect.width || 800;
          canvas.height = rect.height || 600;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            // Draw background
            ctx.fillStyle = '#1e1e1e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Try to draw iframe
            // Note: This only works for same-origin iframes
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px sans-serif';
            ctx.fillText('Preview: ' + this.url, 10, 30);
            ctx.fillText('(Screenshot capture limited due to cross-origin)', 10, 50);
            
            return canvas.toDataURL('image/png');
          }
        }
      } catch (e) {
        log('⚠️ Canvas capture failed:', e);
      }
      
      return '';
    } catch (e) {
      log('⚠️ Screenshot capture error:', e);
      return '';
    }
  }

  /**
   * Format AI message with ENHANCED context - COMPACT and PROFESSIONAL
   */
  private formatAIMessageEnhanced(prompt: string, html: string, filename: string, screenshotBase64: string): string {
    const userPrompt = prompt || 'Please review and improve this UI';
    
    // Get project context
    const projectPath = this.getCurrentProject();
    const projectName = projectPath ? projectPath.split(/[/\\]/).pop() : '';
    
    // Extract visible UI summary (compact version)
    const visibleUI = this.extractVisibleUIElementsCompact(html);
    
    // Build COMPACT message - user request is the FIRST LINE for collapsed view
    let message = `**${userPrompt}**`;
    
    // Compact context line
    const contextParts: string[] = [];
    if (projectName) contextParts.push(projectName);
    contextParts.push(filename);
    contextParts.push(this.url);
    
    message += `\n\n📍 \`${contextParts.join(' › ')}\``;
    
    // Visible UI on one line if short
    if (visibleUI) {
      message += `\n${visibleUI}`;
    }

    // Compact instructions (hidden in collapsed view)
    message += `

<details>
<summary>📋 Instructions for AI</summary>

- Focus on the specific request above
- Show **only the changes needed** (not full rewrite)  
- Reference elements by class/id names
- Provide copy-paste ready code

</details>

`;

    // Add truncated HTML in collapsible section
    const maxHtmlLength = 4000;
    const truncatedHtml = html.length > maxHtmlLength 
      ? html.substring(0, maxHtmlLength) + '\n<!-- ... truncated ... -->'
      : html;
    
    message += `<details>
<summary>📄 HTML Source (${html.split('\n').length} lines)</summary>

\`\`\`html
${truncatedHtml}
\`\`\`

</details>`;

    return message;
  }
  
  /**
   * Extract visible UI elements - COMPACT version (single line)
   */
  private extractVisibleUIElementsCompact(html: string): string {
    const parts: string[] = [];
    
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      
      // Count key elements
      const counts: Record<string, number> = {};
      const tags = [
        ['button', '🔘'],
        ['input', '📝'],
        ['form', '📋'],
        ['img', '🖼️'],
        ['nav', '🧭'],
        ['table', '📊']
      ];
      
      tags.forEach(([tag, icon]) => {
        const els = doc.querySelectorAll(tag);
        if (els.length > 0) {
          parts.push(`${icon}${els.length}`);
        }
      });
      
      // Get first heading
      const h1 = doc.querySelector('h1');
      if (h1?.textContent) {
        const text = h1.textContent.trim().substring(0, 30);
        parts.unshift(`"${text}"`);
      }
      
    } catch (e) {
      // Ignore errors
    }
    
    return parts.length > 0 ? `🔍 ${parts.join(' · ')}` : '';
  }

  /**
   * Insert message into AI chat and send it automatically
   * Enhanced to support image attachments
   */
  private insertIntoAIChat(message: string, imageBase64?: string): void {
    log('📨 Sending to AI chat:', message.substring(0, 100) + '...');
    
    // Method 1: Use sendMessageDirectly with image support (your app's API)
    if ((window as any).sendMessageDirectly) {
      if (imageBase64 && (window as any).sendMessageWithImage) {
        (window as any).sendMessageWithImage(message, imageBase64);
        log('✅ Sent with image via window.sendMessageWithImage');
      } else {
        (window as any).sendMessageDirectly(message);
        log('✅ Sent via window.sendMessageDirectly');
      }
      return;
    }
    
    // Method 2: Try window.aiChat API with send function
    const aiChat = (window as any).aiChat;
    if (aiChat?.send) {
      if (imageBase64 && aiChat.sendWithImage) {
        aiChat.sendWithImage(message, imageBase64);
      } else {
        aiChat.send(message);
      }
      log('✅ Sent via aiChat.send');
      return;
    }
    
    // Method 3: Try to find chat input and send button
    const chatInput = document.querySelector(
      '#ai-chat-input, .ai-chat-input, [data-chat-input], textarea[placeholder*="message"], textarea[placeholder*="Ask"]'
    ) as HTMLTextAreaElement;
    
    if (chatInput) {
      // Set the value
      chatInput.value = message;
      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Auto-resize
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 300) + 'px';
      
      // Find and click send button
      const sendBtn = document.querySelector(
        '#ai-send-btn, .ai-send-btn, [data-action="send"], button[title*="Send"], button[aria-label*="Send"], .send-button, .chat-send-btn'
      ) as HTMLButtonElement;
      
      if (sendBtn) {
        setTimeout(() => {
          sendBtn.click();
          log('✅ Sent via input + send button click');
        }, 100);
        return;
      }
      
      // Try Enter key simulation
      setTimeout(() => {
        chatInput.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        }));
        log('✅ Sent via Enter key simulation');
      }, 100);
      return;
    }
    
    // Method 4: Dispatch custom event for app to handle
    document.dispatchEvent(new CustomEvent('ai-chat-send', {
      detail: { message, source: 'preview', autoSend: true }
    }));
    log('📡 Dispatched ai-chat-send event');
    
    // Method 5: Copy to clipboard as last resort
    navigator.clipboard.writeText(message).then(() => {
      log('📋 Message copied to clipboard (fallback)');
      this.setStatus('Copied to clipboard - paste in AI chat');
    }).catch(() => {
      err('Failed to copy to clipboard');
    });
  }

  setSize(width: number): void {
    if (!this.iframe) return;
    const view = this.container?.querySelector('#preview-view') as HTMLElement;
    
    if (width === 0) {
      this.iframe.style.width = '100%';
      this.iframe.style.maxWidth = '';
      this.iframe.style.boxShadow = '';
      if (view) view.style.padding = '0';
    } else {
      this.iframe.style.width = `${width}px`;
      this.iframe.style.maxWidth = `${width}px`;
      this.iframe.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
      if (view) view.style.padding = '20px';
    }
  }

  private showLoading(): void {
    const el = this.container?.querySelector('#preview-load') as HTMLElement;
    if (el) el.style.display = 'flex';
  }

  private hideLoading(): void {
    const el = this.container?.querySelector('#preview-load') as HTMLElement;
    if (el) el.style.display = 'none';
  }

  private setStatus(text: string): void {
    const el = this.container?.querySelector('#preview-status-text');
    if (el) el.textContent = text;
  }

  private normalize(url: string): string {
    url = url.trim();
    if (!url) return 'about:blank';
    if (!url.startsWith('http')) url = 'http://' + url;
    return url;
  }

  private fallback(): void {
    log('Using fallback window');
    window.open(this.url, '_blank', 'width=1024,height=768');
  }

  private injectCSS(): void {
    if (document.getElementById('preview-css')) return;
    const s = document.createElement('style');
    s.id = 'preview-css';
    s.textContent = `
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes errorSlideIn{from{opacity:0;transform:translateX(-50%) translateY(30px) scale(0.95)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
      @keyframes errorPulse{0%,100%{box-shadow:0 8px 32px rgba(220, 38, 38, 0.5), 0 0 0 4px rgba(239, 68, 68, 0.2)}50%{box-shadow:0 8px 40px rgba(220, 38, 38, 0.7), 0 0 0 6px rgba(239, 68, 68, 0.3)}}
      @keyframes errorIconPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
      @keyframes errorShake{0%,100%{transform:translateX(0)}10%,30%,50%,70%,90%{transform:translateX(-2px)}20%,40%,60%,80%{transform:translateX(2px)}}
      .spinner{width:30px;height:30px;border:3px solid #333;border-top-color:#007acc;border-radius:50%;animation:spin .8s linear infinite}
      .pbtn{padding:4px 8px;background:#3c3c3c;border:1px solid #555;border-radius:4px;color:#ccc;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;transition:all 0.15s ease}
      .pbtn:hover{background:#4a4a4a;color:#fff}
      .pbtn svg{width:14px;height:14px;pointer-events:none}
      .pbtn-hard:hover{background:#0e639c!important;color:#fff!important}
      .pbtn-ai:hover{background:#7c3aed!important;color:#fff!important}
      #preview-tab.active{background:#1e1e1e!important;border-top:2px solid #0078d7!important;color:#fff!important}
      #preview-error-bar{animation:errorSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),errorPulse 2s ease-in-out infinite 0.4s}
      #preview-fix-ai-btn:hover{background:linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)!important;transform:scale(1.05)!important;box-shadow:0 6px 20px rgba(124, 58, 237, 0.6)!important}
      #preview-fix-ai-btn:active{transform:scale(0.98)!important}
      #preview-error-dismiss:hover{background:rgba(255,255,255,0.2)!important;color:#fff!important}
    `;
    document.head.appendChild(s);
  }

  isOpen(): boolean { return !!this.tab; }
  isActive(): boolean { return this.active; }
  getUrl(): string { return this.url; }
  
  // NEW: Get current project being previewed
  getCurrentProjectPath(): string { return this.currentProjectPath; }
  
  // NEW: Debug methods for error detection
  forceCheckErrors(): void {
    log('🔍 Force checking for errors...');
    this.checkForErrors();
  }
  
  forceShowError(message?: string): void {
    this.hasError = true;
    this.lastError = message || 'Test error message';
    this.showErrorBar();
    log('🔴 Force showing error bar');
  }
  
  getLastError(): string { return this.lastError; }
  hasDetectedError(): boolean { return this.hasError; }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const previewTab = new PreviewTabManager();

// Expose for debugging via console
(window as any).previewTab = previewTab;
(window as any).forcePreviewError = (msg?: string) => previewTab.forceShowError(msg);
(window as any).checkPreviewError = () => previewTab.forceCheckErrors();

export function openPreviewTab(url: string): void {
  previewTab.create(url);
}

export function closePreviewTab(): void {
  previewTab.close();
}

export function refreshPreview(): void {
  previewTab.refresh();
}

// NEW: Hard refresh function
export function hardRefreshPreview(): void {
  previewTab.hardReload();
}

export function setupPreviewAutoDetection(): void {
  log('Auto-detection enabled');
  
  // Listen for server URL detected event
  window.addEventListener('server-url-detected', ((e: CustomEvent) => {
    const url = e.detail?.url;
    if (url) {
      log('Server detected:', url);
      (window as any).__lastServerUrl = url;
      
      // Always do hard reload when new server detected
      // This ensures we get fresh content even on same port
      setTimeout(() => {
        if (previewTab.isOpen()) {
          log('🔄 New server on existing preview - hard reloading');
          previewTab.hardReload(url);
        } else {
          openPreviewTab(url);
        }
      }, 500);
    }
  }) as EventListener);
  
  // NEW: Listen for project change event
  window.addEventListener('project-changed', (() => {
    log('Project changed - will hard reload on next server start');
  }) as EventListener);
}

export function parseTerminalForServerUrl(output: string): string | null {
  const m = output.match(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+/i);
  return m ? m[0] : null;
}

// Global
if (typeof window !== 'undefined') {
  (window as any).previewTab = {
    open: openPreviewTab,
    close: closePreviewTab,
    refresh: refreshPreview,
    hardRefresh: hardRefreshPreview,  // NEW
    isOpen: () => previewTab.isOpen(),
    isActiveTab: () => previewTab.isActiveTab(),
    activate: () => previewTab.activatePreviewTab(),
    deactivate: () => previewTab.deactivatePreviewTab(),
    // Error detection
    showBuildError: (error: string) => previewTab.forceShowError(error),
    checkErrors: () => previewTab.forceCheckErrors(),
    hasError: () => previewTab.hasDetectedError(),
    getError: () => previewTab.getLastError(),
  };
  
  // Global function for build system to report errors
  (window as any).reportBuildError = (error: string) => {
    console.log('[PreviewTab] 🔴 Build error reported:', error?.substring?.(0, 100) || error);
    if (previewTab.isOpen()) {
      previewTab.forceShowError(error);
    }
  };
  
  // Also dispatch a custom event for other systems
  (window as any).dispatchBuildError = (error: string) => {
    window.dispatchEvent(new CustomEvent('build-error', { 
      detail: { error, timestamp: Date.now() } 
    }));
  };
}

console.log('✅ PreviewTab loaded (FIXED with cache busting)');
console.log('   - window.previewTab.open(url) - Open preview');
console.log('   - window.previewTab.hardRefresh() - Clear cache & reload');
console.log('   - window.reportBuildError(error) - Show error bar');