// ============================================================================
// 🎮 GAME PREVIEW PANEL - Operator X02 Code IDE
// ============================================================================
// Live game preview with iframe, hot reload, and debug overlay
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPES
// ============================================================================

interface PreviewState {
  isRunning: boolean;
  isPaused: boolean;
  url: string;
  port: number;
  fps: number;
  lastReload: Date;
}

interface DevServerInfo {
  pid: number;
  port: number;
  url: string;
}

// ============================================================================
// GAME PREVIEW PANEL CLASS
// ============================================================================

class GamePreviewPanel {
  private container: HTMLElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private state: PreviewState = {
    isRunning: false,
    isPaused: false,
    url: '',
    port: 5173,
    fps: 0,
    lastReload: new Date()
  };
  private devServer: DevServerInfo | null = null;
  private fpsInterval: number | null = null;

  constructor() {
    console.log('[GamePreview] ✅ Initialized');
  }

  // ==========================================================================
  // UI CREATION
  // ==========================================================================

  createPanel(parentElement: HTMLElement): HTMLElement {
    this.container = document.createElement('div');
    this.container.className = 'game-preview-panel';
    this.container.innerHTML = this.getPanelHTML();
    
    parentElement.appendChild(this.container);
    this.attachEventListeners();
    this.injectStyles();
    
    return this.container;
  }

  private getPanelHTML(): string {
    return `
      <div class="gp-header">
        <div class="gp-title">
          <span class="gp-icon">🎮</span>
          <span>GAME PREVIEW</span>
        </div>
        <div class="gp-controls">
          <button class="gp-btn gp-btn-play" id="gpPlay" title="Run Game (F5)">
            <span>▶</span>
          </button>
          <button class="gp-btn gp-btn-pause" id="gpPause" title="Pause" disabled>
            <span>⏸</span>
          </button>
          <button class="gp-btn gp-btn-reload" id="gpReload" title="Reload (Ctrl+R)" disabled>
            <span>🔄</span>
          </button>
          <button class="gp-btn gp-btn-stop" id="gpStop" title="Stop" disabled>
            <span>⏹</span>
          </button>
          <div class="gp-separator"></div>
          <button class="gp-btn gp-btn-fullscreen" id="gpFullscreen" title="Fullscreen">
            <span>⛶</span>
          </button>
          <button class="gp-btn gp-btn-popout" id="gpPopout" title="Open in Browser">
            <span>↗</span>
          </button>
          <button class="gp-btn gp-btn-debug" id="gpDebug" title="Toggle Debug">
            <span>🐛</span>
          </button>
        </div>
      </div>
      
      <div class="gp-content">
        <div class="gp-placeholder" id="gpPlaceholder">
          <div class="gp-placeholder-icon">🎮</div>
          <div class="gp-placeholder-text">Click ▶ to run your game</div>
          <div class="gp-placeholder-hint">or press F5</div>
        </div>
        
        <iframe 
          id="gpIframe" 
          class="gp-iframe" 
          style="display: none;"
          sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock"
        ></iframe>
        
        <div class="gp-loading" id="gpLoading" style="display: none;">
          <div class="gp-spinner"></div>
          <div>Starting dev server...</div>
        </div>
      </div>
      
      <div class="gp-footer">
        <div class="gp-status">
          <span class="gp-status-dot" id="gpStatusDot"></span>
          <span id="gpStatusText">Ready</span>
        </div>
        <div class="gp-stats">
          <span id="gpFps">-- FPS</span>
          <span class="gp-separator-v"></span>
          <span id="gpResolution">--</span>
        </div>
      </div>
      
      <div class="gp-debug-overlay" id="gpDebugOverlay" style="display: none;">
        <div class="gp-debug-title">Debug Info</div>
        <div class="gp-debug-content" id="gpDebugContent">
          <div>FPS: <span id="gpDebugFps">--</span></div>
          <div>Memory: <span id="gpDebugMemory">--</span></div>
          <div>Entities: <span id="gpDebugEntities">--</span></div>
          <div>Draw Calls: <span id="gpDebugDrawCalls">--</span></div>
        </div>
      </div>
    `;
  }

  private injectStyles(): void {
    if (document.getElementById('game-preview-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'game-preview-styles';
    styles.textContent = `
      .game-preview-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #1e1e2e;
        border-radius: 8px;
        overflow: hidden;
        font-family: 'Segoe UI', sans-serif;
      }

      .gp-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: #252536;
        border-bottom: 1px solid #333;
      }

      .gp-title {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #00ff88;
        font-weight: 600;
        font-size: 13px;
      }

      .gp-icon { font-size: 16px; }

      .gp-controls {
        display: flex;
        gap: 4px;
        align-items: center;
      }

      .gp-btn {
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 4px;
        background: #333;
        color: #ccc;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        transition: all 0.15s;
      }

      .gp-btn:hover:not(:disabled) {
        background: #444;
        color: #fff;
      }

      .gp-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .gp-btn-play:hover:not(:disabled) { background: #00aa66; color: #fff; }
      .gp-btn-stop:hover:not(:disabled) { background: #aa4444; color: #fff; }
      .gp-btn-reload:hover:not(:disabled) { background: #4488aa; color: #fff; }

      .gp-separator {
        width: 1px;
        height: 20px;
        background: #444;
        margin: 0 6px;
      }

      .gp-content {
        flex: 1;
        position: relative;
        background: #0a0a1a;
        overflow: hidden;
      }

      .gp-placeholder {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #666;
      }

      .gp-placeholder-icon {
        font-size: 64px;
        margin-bottom: 16px;
        opacity: 0.5;
      }

      .gp-placeholder-text {
        font-size: 18px;
        margin-bottom: 8px;
      }

      .gp-placeholder-hint {
        font-size: 13px;
        opacity: 0.6;
      }

      .gp-iframe {
        width: 100%;
        height: 100%;
        border: none;
      }

      .gp-loading {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.8);
        color: #888;
        gap: 16px;
      }

      .gp-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #333;
        border-top-color: #00ff88;
        border-radius: 50%;
        animation: gp-spin 1s linear infinite;
      }

      @keyframes gp-spin {
        to { transform: rotate(360deg); }
      }

      .gp-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 12px;
        background: #252536;
        border-top: 1px solid #333;
        font-size: 12px;
        color: #888;
      }

      .gp-status {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .gp-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #666;
      }

      .gp-status-dot.running { background: #00ff88; }
      .gp-status-dot.error { background: #ff4444; }
      .gp-status-dot.loading { background: #ffaa00; animation: gp-pulse 1s ease infinite; }

      @keyframes gp-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }

      .gp-stats {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .gp-separator-v {
        width: 1px;
        height: 12px;
        background: #444;
      }

      .gp-debug-overlay {
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.85);
        border: 1px solid #00ff88;
        border-radius: 6px;
        padding: 10px;
        font-size: 12px;
        color: #00ff88;
        font-family: monospace;
        z-index: 1000;
      }

      .gp-debug-title {
        font-weight: bold;
        margin-bottom: 8px;
        padding-bottom: 6px;
        border-bottom: 1px solid #333;
      }

      .gp-debug-content div {
        margin: 4px 0;
      }

      .gp-debug-content span {
        color: #fff;
      }
    `;
    document.head.appendChild(styles);
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================

  private attachEventListeners(): void {
    if (!this.container) return;

    // Play button
    this.container.querySelector('#gpPlay')?.addEventListener('click', () => this.startPreview());
    
    // Pause button
    this.container.querySelector('#gpPause')?.addEventListener('click', () => this.togglePause());
    
    // Reload button
    this.container.querySelector('#gpReload')?.addEventListener('click', () => this.reloadPreview());
    
    // Stop button
    this.container.querySelector('#gpStop')?.addEventListener('click', () => this.stopPreview());
    
    // Fullscreen
    this.container.querySelector('#gpFullscreen')?.addEventListener('click', () => this.toggleFullscreen());
    
    // Popout
    this.container.querySelector('#gpPopout')?.addEventListener('click', () => this.openInBrowser());
    
    // Debug
    this.container.querySelector('#gpDebug')?.addEventListener('click', () => this.toggleDebug());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F5') {
        e.preventDefault();
        if (this.state.isRunning) {
          this.reloadPreview();
        } else {
          this.startPreview();
        }
      }
      if (e.ctrlKey && e.key === 'r' && this.state.isRunning) {
        e.preventDefault();
        this.reloadPreview();
      }
    });
  }

  // ==========================================================================
  // PREVIEW CONTROL
  // ==========================================================================

  async startPreview(projectPath?: string): Promise<void> {
    if (this.state.isRunning) return;

    console.log('[GamePreview] Starting preview...');
    this.showLoading(true);
    this.setStatus('loading', 'Starting dev server...');

    try {
      // Start Vite dev server
      const result = await this.startDevServer(projectPath);
      
      if (result.success) {
        this.state.isRunning = true;
        this.state.url = result.url!;
        this.state.port = result.port!;
        
        // Show iframe
        this.showIframe(result.url!);
        this.updateControls();
        this.setStatus('running', `Running on port ${result.port}`);
        this.startFpsMonitor();
        
        console.log('[GamePreview] ✅ Preview started:', result.url);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('[GamePreview] Error:', error);
      this.setStatus('error', 'Failed to start');
      this.showLoading(false);
    }
  }

  private async startDevServer(projectPath?: string): Promise<{ success: boolean; url?: string; port?: number; error?: string }> {
    try {
      // Try to start Vite dev server via Tauri
      const result = await invoke<{ pid: number; port: number }>('start_dev_server', {
        path: projectPath || (window as any).currentProjectPath,
        port: this.state.port
      });

      this.devServer = {
        pid: result.pid,
        port: result.port,
        url: `http://localhost:${result.port}`
      };

      // Wait for server to be ready
      await this.waitForServer(this.devServer.url);

      return {
        success: true,
        url: this.devServer.url,
        port: this.devServer.port
      };
    } catch (error) {
      // Fallback: assume server is already running or use static file
      console.warn('[GamePreview] Dev server start failed, trying fallback...');
      
      // Check if server is already running
      try {
        const response = await fetch(`http://localhost:${this.state.port}`, { method: 'HEAD' });
        if (response.ok) {
          return {
            success: true,
            url: `http://localhost:${this.state.port}`,
            port: this.state.port
          };
        }
      } catch (e) {
        // Server not running
      }

      return { success: false, error: String(error) };
    }
  }

  private async waitForServer(url: string, timeout: number = 10000): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) return;
      } catch (e) {
        // Not ready yet
      }
      await new Promise(r => setTimeout(r, 500));
    }
    
    throw new Error('Server startup timeout');
  }

  stopPreview(): void {
    if (!this.state.isRunning) return;

    console.log('[GamePreview] Stopping preview...');

    // Kill dev server
    if (this.devServer) {
      invoke('kill_process', { pid: this.devServer.pid }).catch(() => {});
      this.devServer = null;
    }

    // Hide iframe
    this.hideIframe();
    
    // Stop FPS monitor
    this.stopFpsMonitor();

    this.state.isRunning = false;
    this.state.isPaused = false;
    this.updateControls();
    this.setStatus('ready', 'Ready');

    console.log('[GamePreview] ✅ Preview stopped');
  }

  reloadPreview(): void {
    if (!this.state.isRunning || !this.iframe) return;

    console.log('[GamePreview] Reloading...');
    this.iframe.src = this.state.url;
    this.state.lastReload = new Date();
    this.setStatus('running', 'Reloaded');
  }

  togglePause(): void {
    if (!this.state.isRunning || !this.iframe) return;

    this.state.isPaused = !this.state.isPaused;
    
    // Send pause message to game
    this.iframe.contentWindow?.postMessage({
      type: 'X02_GAME_CONTROL',
      action: this.state.isPaused ? 'pause' : 'resume'
    }, '*');

    this.updateControls();
    this.setStatus('running', this.state.isPaused ? 'Paused' : 'Running');
  }

  // ==========================================================================
  // UI HELPERS
  // ==========================================================================

  private showLoading(show: boolean): void {
    const loading = this.container?.querySelector('#gpLoading') as HTMLElement;
    const placeholder = this.container?.querySelector('#gpPlaceholder') as HTMLElement;
    
    if (loading) loading.style.display = show ? 'flex' : 'none';
    if (placeholder) placeholder.style.display = show ? 'none' : 'flex';
  }

  private showIframe(url: string): void {
    this.iframe = this.container?.querySelector('#gpIframe') as HTMLIFrameElement;
    const placeholder = this.container?.querySelector('#gpPlaceholder') as HTMLElement;
    const loading = this.container?.querySelector('#gpLoading') as HTMLElement;

    if (this.iframe) {
      this.iframe.src = url;
      this.iframe.style.display = 'block';
    }
    if (placeholder) placeholder.style.display = 'none';
    if (loading) loading.style.display = 'none';
  }

  private hideIframe(): void {
    const iframe = this.container?.querySelector('#gpIframe') as HTMLIFrameElement;
    const placeholder = this.container?.querySelector('#gpPlaceholder') as HTMLElement;

    if (iframe) {
      iframe.src = 'about:blank';
      iframe.style.display = 'none';
    }
    if (placeholder) placeholder.style.display = 'flex';
  }

  private updateControls(): void {
    const play = this.container?.querySelector('#gpPlay') as HTMLButtonElement;
    const pause = this.container?.querySelector('#gpPause') as HTMLButtonElement;
    const reload = this.container?.querySelector('#gpReload') as HTMLButtonElement;
    const stop = this.container?.querySelector('#gpStop') as HTMLButtonElement;

    if (play) {
      play.disabled = this.state.isRunning;
      play.innerHTML = this.state.isRunning ? '<span>▶</span>' : '<span>▶</span>';
    }
    if (pause) {
      pause.disabled = !this.state.isRunning;
      pause.innerHTML = this.state.isPaused ? '<span>▶</span>' : '<span>⏸</span>';
    }
    if (reload) reload.disabled = !this.state.isRunning;
    if (stop) stop.disabled = !this.state.isRunning;
  }

  private setStatus(status: 'ready' | 'loading' | 'running' | 'error', text: string): void {
    const dot = this.container?.querySelector('#gpStatusDot') as HTMLElement;
    const textEl = this.container?.querySelector('#gpStatusText') as HTMLElement;

    if (dot) {
      dot.className = 'gp-status-dot';
      if (status === 'running') dot.classList.add('running');
      if (status === 'error') dot.classList.add('error');
      if (status === 'loading') dot.classList.add('loading');
    }
    if (textEl) textEl.textContent = text;
  }

  // ==========================================================================
  // FPS MONITORING
  // ==========================================================================

  private startFpsMonitor(): void {
    this.fpsInterval = window.setInterval(() => {
      // Request FPS from iframe
      this.iframe?.contentWindow?.postMessage({
        type: 'X02_REQUEST_FPS'
      }, '*');
    }, 1000);

    // Listen for FPS response
    window.addEventListener('message', this.handleFpsMessage.bind(this));
  }

  private stopFpsMonitor(): void {
    if (this.fpsInterval) {
      clearInterval(this.fpsInterval);
      this.fpsInterval = null;
    }
    window.removeEventListener('message', this.handleFpsMessage.bind(this));
  }

  private handleFpsMessage(event: MessageEvent): void {
    if (event.data?.type === 'X02_FPS_RESPONSE') {
      this.state.fps = event.data.fps;
      
      const fpsEl = this.container?.querySelector('#gpFps') as HTMLElement;
      const debugFps = this.container?.querySelector('#gpDebugFps') as HTMLElement;
      
      if (fpsEl) fpsEl.textContent = `${this.state.fps} FPS`;
      if (debugFps) debugFps.textContent = String(this.state.fps);
    }
  }

  // ==========================================================================
  // ADDITIONAL FEATURES
  // ==========================================================================

  toggleFullscreen(): void {
    const content = this.container?.querySelector('.gp-content') as HTMLElement;
    if (content) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        content.requestFullscreen();
      }
    }
  }

  openInBrowser(): void {
    if (this.state.url) {
      window.open(this.state.url, '_blank');
    }
  }

  toggleDebug(): void {
    const overlay = this.container?.querySelector('#gpDebugOverlay') as HTMLElement;
    if (overlay) {
      overlay.style.display = overlay.style.display === 'none' ? 'block' : 'none';
    }
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  isRunning(): boolean {
    return this.state.isRunning;
  }

  getState(): PreviewState {
    return { ...this.state };
  }

  setResolution(width: number, height: number): void {
    const resEl = this.container?.querySelector('#gpResolution') as HTMLElement;
    if (resEl) resEl.textContent = `${width}×${height}`;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const gamePreviewPanel = new GamePreviewPanel();
(window as any).gamePreviewPanel = gamePreviewPanel;

console.log('[GamePreviewPanel] Module loaded');
