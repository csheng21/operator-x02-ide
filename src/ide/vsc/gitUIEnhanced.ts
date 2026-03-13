// src/ide/vsc/gitUIEnhanced.ts
// Git UI Panel - Floating Independent Window
// ✅ FIXED: Position uses LEFT instead of RIGHT (always visible)
// ✅ Animation: Gentle Slide + Fade (0.5s)
// ✅ ALL menu handlers included

import { invoke } from '@tauri-apps/api/core';
import { gitManager } from './gitManager';
import type { GitStatusResult, GitBranchInfo, GitCommitInfo, GitStashInfo } from './vcsTypes';

// ============================================
// FLOATING DIALOG MANAGER
// ============================================

interface FloatingDialogOptions {
  id?: string;
  title: string;
  content: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  onClose?: () => void;
  resizable?: boolean;
  icon?: string;
}

class FloatingDialogManagerClass {
  private dialogCount = 0;
  private activeDialogs: Map<string, HTMLElement> = new Map();
  private highestZIndex = 10000;
  private stylesInjected = false;

  private injectStyles(): void {
    if (this.stylesInjected || document.getElementById('floating-dialog-styles')) return;

    const style = document.createElement('style');
    style.id = 'floating-dialog-styles';
    style.textContent = `
      .floating-dialog {
        position: fixed;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        display: flex;
        flex-direction: column;
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 13px;
        color: #cccccc;
        overflow: hidden;
      }
      .floating-dialog.resizable { resize: both; }
      .floating-dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: #2d2d2d;
        border-bottom: 1px solid #3c3c3c;
        cursor: move;
        user-select: none;
        border-radius: 8px 8px 0 0;
        min-height: 20px;
      }
      .floating-dialog-title {
        font-weight: 600;
        font-size: 12px;
        color: #e0e0e0;
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }
      .floating-dialog-controls { display: flex; gap: 2px; }
      .floating-dialog-btn {
        background: none;
        border: none;
        color: #808080;
        cursor: pointer;
        padding: 4px 8px;
        font-size: 14px;
        border-radius: 4px;
        transition: background 0.15s, color 0.15s;
      }
      .floating-dialog-btn:hover { background: rgba(255,255,255,0.1); color: #cccccc; }
      .floating-dialog-btn.close:hover { background: #c53030; color: white; }
      .floating-dialog-content { flex: 1; overflow: auto; padding: 12px; }
      .floating-dialog.minimized .floating-dialog-content { display: none; }
      .floating-dialog.minimized { height: auto !important; resize: none !important; }
      .floating-dialog.maximized {
        left: 0 !important; top: 35px !important;
        width: 100vw !important; height: calc(100vh - 35px) !important;
        border-radius: 0; resize: none !important;
      }
      .floating-diff-line-added { background: rgba(78, 201, 176, 0.15); color: #4ec9b0; padding: 0 8px; }
      .floating-diff-line-removed { background: rgba(244, 135, 113, 0.15); color: #f48771; padding: 0 8px; }
      .floating-diff-line-header { background: rgba(86, 156, 214, 0.15); color: #569cd6; padding: 4px 8px; margin: 8px 0; }
      .floating-diff-line { padding: 0 8px; white-space: pre-wrap; word-break: break-all; }
      .floating-diff-content { font-family: 'Cascadia Code', monospace; font-size: 12px; line-height: 1.5; }
      .floating-dialog.dragging { transition: none !important; user-select: none; cursor: grabbing !important; }
      .floating-dialog.dragging * { cursor: grabbing !important; }
    `;
    document.head.appendChild(style);
    this.stylesInjected = true;
  }

  create(options: FloatingDialogOptions): HTMLElement {
    this.injectStyles();
    const dialogId = options.id || `floating-dialog-${++this.dialogCount}`;
    
    if (options.id && this.activeDialogs.has(options.id)) {
      this.activeDialogs.get(options.id)?.remove();
      this.activeDialogs.delete(options.id);
    }

    const width = options.width || 600;
    const height = options.height || 450;
    const x = options.x ?? Math.max(50, (window.innerWidth - width) / 2);
    const y = options.y ?? 100;
    const resizable = options.resizable !== false;

    const dialog = document.createElement('div');
    dialog.id = dialogId;
    dialog.className = `floating-dialog ${resizable ? 'resizable' : ''}`;
    dialog.style.cssText = `left:${x}px;top:${y}px;width:${width}px;height:${height}px;min-width:300px;min-height:150px;z-index:${++this.highestZIndex};`;

    const icon = options.icon || '📄';
    dialog.innerHTML = `
      <div class="floating-dialog-header">
        <span class="floating-dialog-title"><span>${icon}</span><span>${this.escapeHtml(options.title)}</span></span>
        <div class="floating-dialog-controls">
          <button class="floating-dialog-btn minimize" title="Minimize">─</button>
          <button class="floating-dialog-btn maximize" title="Maximize">□</button>
          <button class="floating-dialog-btn close" title="Close">✕</button>
        </div>
      </div>
      <div class="floating-dialog-content">${options.content}</div>
    `;

    this.makeDraggable(dialog);
    this.setupButtons(dialog, dialogId, options.onClose);
    dialog.addEventListener('mousedown', () => { dialog.style.zIndex = String(++this.highestZIndex); });

    document.body.appendChild(dialog);
    this.activeDialogs.set(dialogId, dialog);
    return dialog;
  }

  private makeDraggable(dialog: HTMLElement): void {
    const header = dialog.querySelector('.floating-dialog-header') as HTMLElement;
    if (!header) return;
    let isDragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
    header.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      if (dialog.classList.contains('maximized')) return;
      isDragging = true; startX = e.clientX; startY = e.clientY;
      startLeft = dialog.offsetLeft; startTop = dialog.offsetTop;
      dialog.classList.add('dragging'); e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      dialog.style.left = `${startLeft + e.clientX - startX}px`;
      dialog.style.top = `${Math.max(0, startTop + e.clientY - startY)}px`;
    });
    document.addEventListener('mouseup', () => { if (isDragging) { isDragging = false; dialog.classList.remove('dragging'); } });
  }

  private setupButtons(dialog: HTMLElement, dialogId: string, onClose?: () => void): void {
    dialog.querySelector('.floating-dialog-btn.close')?.addEventListener('click', () => { dialog.remove(); this.activeDialogs.delete(dialogId); onClose?.(); });
    const minBtn = dialog.querySelector('.floating-dialog-btn.minimize');
    minBtn?.addEventListener('click', () => { dialog.classList.toggle('minimized'); minBtn.textContent = dialog.classList.contains('minimized') ? '□' : '─'; });
    const maxBtn = dialog.querySelector('.floating-dialog-btn.maximize');
    maxBtn?.addEventListener('click', () => { dialog.classList.toggle('maximized'); maxBtn.textContent = dialog.classList.contains('maximized') ? '❐' : '□'; });
  }

  close(id: string): boolean { const d = this.activeDialogs.get(id); if (d) { d.remove(); this.activeDialogs.delete(id); return true; } return false; }
  closeAll(): void { this.activeDialogs.forEach(d => d.remove()); this.activeDialogs.clear(); }

  formatDiff(diff: string): string {
    if (!diff?.trim()) return '<div style="color:#808080;padding:20px;text-align:center;">No changes</div>';
    return diff.split('\n').map(line => {
      let cls = 'floating-diff-line';
      if (line.startsWith('+') && !line.startsWith('+++')) cls += ' floating-diff-line-added';
      else if (line.startsWith('-') && !line.startsWith('---')) cls += ' floating-diff-line-removed';
      else if (line.startsWith('@@')) cls += ' floating-diff-line-header';
      return `<div class="${cls}">${this.escapeHtml(line)}</div>`;
    }).join('');
  }

  escapeHtml(text: string): string { return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
}

const FloatingDialogManager = new FloatingDialogManagerClass();

// ============================================
// GIT UI ENHANCED - FLOATING PANEL
// ============================================

class GitUIEnhanced {
  private static instance: GitUIEnhanced;
  private container: HTMLDivElement | null = null;
  private isVisible: boolean = false;
  private currentPath: string = '';
  private currentTab: 'changes' | 'branches' | 'history' | 'stashes' = 'changes';
  private refreshInterval: number | null = null;
  private stylesInjected: boolean = false;

  private constructor() { this.injectStyles(); }

  static getInstance(): GitUIEnhanced {
    if (!GitUIEnhanced.instance) GitUIEnhanced.instance = new GitUIEnhanced();
    return GitUIEnhanced.instance;
  }

  private injectStyles(): void {
    if (this.stylesInjected || document.getElementById('git-ui-enhanced-styles')) return;
    const style = document.createElement('style');
    style.id = 'git-ui-enhanced-styles';
    style.textContent = `
      .git-floating-panel {
        position: fixed;
        left: 250px;
        top: 80px;
        width: 420px;
        height: 550px;
        min-width: 350px;
        min-height: 400px;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 10px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        display: flex;
        flex-direction: column;
        z-index: 9999;
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 13px;
        color: #cccccc;
        resize: both;
        overflow: hidden;
      }
      @keyframes gitPanelSlideIn { 0% { opacity: 0; transform: translateY(-20px); } 100% { opacity: 1; transform: translateY(0); } }
      .git-floating-panel.entrance-animation { animation: gitPanelSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
      .git-floating-panel.dragging { transition: none !important; user-select: none !important; cursor: grabbing !important; }
      .git-floating-panel-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 14px; background: linear-gradient(180deg, #2d2d2d 0%, #252526 100%);
        border-bottom: 1px solid #3c3c3c; cursor: grab; user-select: none; border-radius: 10px 10px 0 0;
      }
      .git-floating-panel-header:active { cursor: grabbing; }
      .git-floating-panel-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px; color: #e0e0e0; }
      .git-floating-panel-controls { display: flex; gap: 4px; }
      .git-floating-panel-btn { background: none; border: none; color: #808080; cursor: pointer; padding: 4px 8px; font-size: 14px; border-radius: 4px; transition: all 0.15s ease; }
      .git-floating-panel-btn:hover { background: rgba(255,255,255,0.1); color: #cccccc; }
      .git-floating-panel-btn.close:hover { background: #e81123; color: white; }
      .git-ui-tabs { display: flex; background: #252526; border-bottom: 1px solid #3c3c3c; }
      .git-ui-tab { flex: 1; padding: 8px 10px; background: none; border: none; color: #808080; cursor: pointer; font-size: 12px; font-weight: 500; border-bottom: 2px solid transparent; transition: all 0.2s ease; }
      .git-ui-tab:hover { color: #cccccc; background: rgba(255,255,255,0.05); }
      .git-ui-tab.active { color: #fff; border-bottom-color: #0e639c; }
      .git-ui-toolbar { display: flex; gap: 6px; padding: 8px 12px; background: #252526; border-bottom: 1px solid #3c3c3c; }
      .git-ui-toolbar-btn { background: none; border: none; color: #808080; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 11px; transition: all 0.15s ease; }
      .git-ui-toolbar-btn:hover { background: rgba(255,255,255,0.1); color: #cccccc; }
      .git-ui-content { flex: 1; overflow-y: auto; padding: 12px; }
      .git-ui-content::-webkit-scrollbar { width: 6px; }
      .git-ui-content::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }
      .git-ui-section { margin-bottom: 14px; }
      .git-ui-section-title { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #808080; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
      .git-ui-file-list { display: flex; flex-direction: column; gap: 1px; }
      .git-ui-file { display: flex; align-items: center; padding: 5px 8px; border-radius: 4px; cursor: pointer; gap: 8px; transition: background 0.15s; }
      .git-ui-file:hover { background: rgba(255,255,255,0.05); }
      .git-ui-file-status { width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border-radius: 2px; }
      .git-ui-file-status.modified { color: #dcdcaa; }
      .git-ui-file-status.added { color: #4ec9b0; }
      .git-ui-file-status.deleted { color: #f48771; }
      .git-ui-file-status.untracked { color: #4fc1ff; }
      .git-ui-file-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
      .git-ui-file-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.2s; }
      .git-ui-file:hover .git-ui-file-actions { opacity: 1; }
      .git-ui-file-action { background: none; border: none; color: #808080; cursor: pointer; padding: 2px 4px; font-size: 12px; border-radius: 3px; }
      .git-ui-file-action:hover { background: rgba(255,255,255,0.15); color: #fff; }
      .git-ui-input { width: 100%; padding: 8px 10px; background: #3c3c3c; border: 1px solid #555; border-radius: 4px; color: #ccc; font-size: 12px; margin-bottom: 8px; box-sizing: border-box; }
      .git-ui-input:focus { outline: none; border-color: #0e639c; }
      .git-ui-btn { padding: 6px 12px; background: #0e639c; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 11px; font-weight: 500; transition: background 0.2s; }
      .git-ui-btn:hover { background: #1177bb; }
      .git-ui-btn:disabled { background: #3c3c3c; color: #808080; cursor: not-allowed; }
      .git-ui-btn-secondary { background: #3c3c3c; color: #ccc; }
      .git-ui-btn-secondary:hover { background: #4c4c4c; }
      .git-ui-branch { display: flex; align-items: center; padding: 6px 10px; border-radius: 4px; cursor: pointer; gap: 8px; transition: background 0.15s; }
      .git-ui-branch:hover { background: rgba(255,255,255,0.05); }
      .git-ui-branch.current { background: rgba(14,99,156,0.15); border: 1px solid rgba(14,99,156,0.3); }
      .git-ui-commit { padding: 8px 10px; border-radius: 4px; cursor: pointer; border-bottom: 1px solid #2d2d2d; transition: background 0.15s; }
      .git-ui-commit:hover { background: rgba(255,255,255,0.05); }
      .git-ui-commit-sha { font-family: monospace; font-size: 10px; color: #4fc1ff; margin-bottom: 3px; }
      .git-ui-commit-message { margin-bottom: 4px; line-height: 1.3; font-size: 12px; }
      .git-ui-commit-meta { font-size: 10px; color: #808080; }
      .git-ui-empty { text-align: center; padding: 40px 20px; color: #808080; }
      .git-ui-empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.5; }
      .git-ui-error { background: rgba(220,53,69,0.1); border: 1px solid #dc3545; border-radius: 4px; padding: 10px; color: #f48771; margin-bottom: 10px; font-size: 12px; }
      .git-ui-info { background: rgba(14,99,156,0.1); border: 1px solid #0e639c; border-radius: 4px; padding: 10px; color: #4fc1ff; margin-bottom: 10px; font-size: 12px; }
      .git-floating-panel.minimized .git-ui-content, .git-floating-panel.minimized .git-ui-tabs, .git-floating-panel.minimized .git-ui-toolbar { display: none; }
      .git-floating-panel.minimized { height: auto !important; resize: none; }
      .git-floating-panel.maximized { left: 0 !important; top: 35px !important; width: 100vw !important; height: calc(100vh - 35px) !important; border-radius: 0; resize: none; transform: none !important; }
    `;
    document.head.appendChild(style);
    this.stylesInjected = true;
  }

  async show(path: string): Promise<void> {
    this.currentPath = path;
    if (!this.container) this.createContainer();
    const panelWidth = 420;
    const leftPos = Math.max(50, Math.min(250, window.innerWidth - panelWidth - 50));
    this.container!.style.left = `${leftPos}px`;
    this.container!.style.top = '80px';
    this.container!.style.right = 'auto';
    this.container!.style.transform = '';
    this.container!.style.display = 'flex';
    this.container!.classList.remove('entrance-animation');
    void this.container!.offsetWidth;
    this.container!.classList.add('entrance-animation');
    setTimeout(() => this.container?.classList.remove('entrance-animation'), 500);
    this.isVisible = true;
    try { await gitManager.open(path); await this.refresh(); } catch (e) { console.error('Git open error:', e); }
    this.startAutoRefresh();
  }

  hide(): void {
    if (this.container) { this.container.style.display = 'none'; this.container.classList.remove('entrance-animation'); }
    this.isVisible = false;
    this.stopAutoRefresh();
  }

  toggle(path: string): void { if (this.isVisible) this.hide(); else this.show(path); }

  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.className = 'git-floating-panel';
    this.container.id = 'git-floating-panel';
    this.container.innerHTML = `
      <div class="git-floating-panel-header">
        <div class="git-floating-panel-title">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="#0e639c"><path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.57 5.953v4.27a1.223 1.223 0 11-1.008-.036V5.88a1.223 1.223 0 01-.664-1.607L5.09 2.465.302 7.253a1.03 1.03 0 000 1.457l6.986 6.986a1.03 1.03 0 001.457 0l6.953-6.953a1.03 1.03 0 000-1.457z"/></svg>
          <span>SOURCE CONTROL</span>
        </div>
        <div class="git-floating-panel-controls">
          <button class="git-floating-panel-btn minimize" title="Minimize">─</button>
          <button class="git-floating-panel-btn maximize" title="Maximize">□</button>
          <button class="git-floating-panel-btn close" title="Close">✕</button>
        </div>
      </div>
      <div class="git-ui-tabs">
        <button class="git-ui-tab active" data-tab="changes">Changes</button>
        <button class="git-ui-tab" data-tab="branches">Branches</button>
        <button class="git-ui-tab" data-tab="history">History</button>
        <button class="git-ui-tab" data-tab="stashes">Stashes</button>
      </div>
      <div class="git-ui-toolbar">
        <button class="git-ui-toolbar-btn" data-action="refresh">🔄 Refresh</button>
        <button class="git-ui-toolbar-btn" data-action="pull">⬇️ Pull</button>
        <button class="git-ui-toolbar-btn" data-action="push">⬆️ Push</button>
      </div>
      <div class="git-ui-content"><div style="color:#888;text-align:center;padding:30px;">Loading...</div></div>
    `;
    this.setupEventListeners();
    this.setupDrag();
    document.body.appendChild(this.container);
  }

  private setupDrag(): void {
    if (!this.container) return;
    const header = this.container.querySelector('.git-floating-panel-header') as HTMLElement;
    if (!header) return;
    let isDragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
    header.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      if (this.container?.classList.contains('maximized')) return;
      isDragging = true; startX = e.clientX; startY = e.clientY;
      startLeft = this.container!.offsetLeft; startTop = this.container!.offsetTop;
      this.container!.classList.add('dragging'); e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging || !this.container) return;
      this.container.style.left = `${startLeft + e.clientX - startX}px`;
      this.container.style.top = `${Math.max(0, startTop + e.clientY - startY)}px`;
      this.container.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => { if (isDragging && this.container) { isDragging = false; this.container.classList.remove('dragging'); } });
  }

  private setupEventListeners(): void {
    if (!this.container) return;
    this.container.querySelector('.git-floating-panel-btn.close')?.addEventListener('click', () => this.hide());
    const minBtn = this.container.querySelector('.git-floating-panel-btn.minimize');
    minBtn?.addEventListener('click', () => { this.container?.classList.toggle('minimized'); minBtn.textContent = this.container?.classList.contains('minimized') ? '□' : '─'; });
    const maxBtn = this.container.querySelector('.git-floating-panel-btn.maximize');
    maxBtn?.addEventListener('click', () => { this.container?.classList.toggle('maximized'); maxBtn.textContent = this.container?.classList.contains('maximized') ? '❐' : '□'; });
    this.container.querySelectorAll('.git-ui-tab').forEach(tab => { tab.addEventListener('click', (e) => { this.switchTab((e.target as HTMLElement).dataset.tab as any); }); });
    this.container.querySelectorAll('.git-ui-toolbar-btn').forEach(btn => { btn.addEventListener('click', (e) => { this.handleToolbarAction((e.target as HTMLElement).dataset.action || ''); }); });
  }

  private async switchTab(tab: typeof this.currentTab): Promise<void> {
    this.currentTab = tab;
    this.container?.querySelectorAll('.git-ui-tab').forEach(t => { t.classList.toggle('active', t.getAttribute('data-tab') === tab); });
    await this.refresh();
  }

  private async handleToolbarAction(action: string): Promise<void> {
    try {
      if (action === 'refresh') await this.refresh();
      else if (action === 'pull') { await gitManager.pull(); await this.refresh(); this.notify('Pulled'); }
      else if (action === 'push') { await gitManager.push(); await this.refresh(); this.notify('Pushed'); }
    } catch (e) { this.notify(`Error: ${e}`, 'error'); }
  }

  async refresh(): Promise<void> {
    const content = this.container?.querySelector('.git-ui-content');
    if (!content) return;
    try {
      if (this.currentTab === 'changes') await this.renderChanges(content);
      else if (this.currentTab === 'branches') await this.renderBranches(content);
      else if (this.currentTab === 'history') await this.renderHistory(content);
      else if (this.currentTab === 'stashes') await this.renderStashes(content);
    } catch (e) { content.innerHTML = `<div class="git-ui-error">Error: ${e}</div>`; }
  }

  private async renderChanges(content: Element): Promise<void> {
    const status = await gitManager.getStatus();
    const files = Array.isArray(status) ? status : (status?.files || []);
    const staged = files.filter((f: any) => f.staged);
    const unstaged = files.filter((f: any) => !f.staged);
    content.innerHTML = `
      <div class="git-ui-section">
        <input type="text" class="git-ui-input" placeholder="Commit message" id="git-commit-msg">
        <div style="display:flex;gap:8px;">
          <button class="git-ui-btn" id="git-commit-btn" ${staged.length === 0 ? 'disabled' : ''}>Commit (${staged.length})</button>
          <button class="git-ui-btn git-ui-btn-secondary" id="git-stage-all">Stage All</button>
        </div>
      </div>
      <div class="git-ui-section">
        <div class="git-ui-section-title">Staged <span style="color:#4ec9b0">(${staged.length})</span></div>
        <div class="git-ui-file-list">${staged.length === 0 ? '<div style="color:#666;padding:6px;">No staged changes</div>' : staged.map((f: any) => this.fileItem(f, true)).join('')}</div>
      </div>
      <div class="git-ui-section">
        <div class="git-ui-section-title">Changes <span style="color:#dcdcaa">(${unstaged.length})</span></div>
        <div class="git-ui-file-list">${unstaged.length === 0 ? '<div style="color:#666;padding:6px;">No changes</div>' : unstaged.map((f: any) => this.fileItem(f, false)).join('')}</div>
      </div>
    `;
    content.querySelector('#git-commit-btn')?.addEventListener('click', () => this.doCommit());
    content.querySelector('#git-stage-all')?.addEventListener('click', () => this.doStageAll());
    content.querySelectorAll('.git-ui-file-action').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); const t = e.target as HTMLElement; if (t.dataset.action && t.dataset.file) this.doFileAction(t.dataset.action, t.dataset.file); });
    });
  }

  private fileItem(file: any, staged: boolean): string {
    const st = (file.status || '?').charAt(0).toUpperCase();
    const cls = (file.status || 'unknown').toLowerCase();
    const name = file.path?.split(/[/\\]/).pop() || file.path;
    return `<div class="git-ui-file"><span class="git-ui-file-status ${cls}">${st}</span><span class="git-ui-file-name" title="${file.path}">${name}</span><div class="git-ui-file-actions">${staged ? `<button class="git-ui-file-action" data-action="unstage" data-file="${file.path}">➖</button>` : `<button class="git-ui-file-action" data-action="stage" data-file="${file.path}">➕</button>`}<button class="git-ui-file-action" data-action="diff" data-file="${file.path}">📄</button></div></div>`;
  }

  private async renderBranches(content: Element): Promise<void> {
    let branches: GitBranchInfo[] = [];
    try { branches = await gitManager.getBranches(); } catch (e: any) { if (e?.message?.includes('does not have any commits')) { content.innerHTML = '<div class="git-ui-info">No commits yet.</div>'; return; } }
    const local = branches.filter(b => !b.is_remote);
    const remote = branches.filter(b => b.is_remote);
    content.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:12px;"><input type="text" class="git-ui-input" placeholder="New branch" id="git-new-branch" style="margin:0;flex:1;"><button class="git-ui-btn" id="git-create-branch">Create</button></div>
      <div class="git-ui-section"><div class="git-ui-section-title">Local (${local.length})</div>${local.map(b => `<div class="git-ui-branch ${b.is_current ? 'current' : ''}" data-branch="${b.name}"><span style="color:#0e639c">⑂</span><span style="flex:1">${b.name}</span>${b.is_current ? '<span style="color:#4ec9b0">✓</span>' : ''}</div>`).join('')}</div>
      ${remote.length ? `<div class="git-ui-section"><div class="git-ui-section-title">Remote (${remote.length})</div>${remote.map(b => `<div class="git-ui-branch" style="color:#808080"><span>⑂</span><span>${b.name}</span></div>`).join('')}</div>` : ''}
    `;
    content.querySelector('#git-create-branch')?.addEventListener('click', () => this.doCreateBranch());
    content.querySelectorAll('.git-ui-branch[data-branch]').forEach(el => { el.addEventListener('click', () => this.doSwitchBranch((el as HTMLElement).dataset.branch!)); });
  }

  private async renderHistory(content: Element): Promise<void> {
    let commits: GitCommitInfo[] = [];
    try { commits = await gitManager.getLog(30); } catch { content.innerHTML = '<div class="git-ui-empty"><div class="git-ui-empty-icon">📜</div>No history</div>'; return; }
    if (!commits.length) { content.innerHTML = '<div class="git-ui-empty"><div class="git-ui-empty-icon">📜</div>No history</div>'; return; }
    content.innerHTML = commits.map(c => { const d = new Date(c.date * 1000); return `<div class="git-ui-commit" data-sha="${c.sha}"><div class="git-ui-commit-sha">${c.short_sha || c.sha?.substring(0,7)}</div><div class="git-ui-commit-message">${this.esc(c.message || '')}</div><div class="git-ui-commit-meta">${c.author} • ${d.toLocaleDateString()}</div></div>`; }).join('');
    content.querySelectorAll('.git-ui-commit').forEach(el => { el.addEventListener('click', () => this.showCommitDetails((el as HTMLElement).dataset.sha!)); });
  }

  private async renderStashes(content: Element): Promise<void> {
    let stashes: GitStashInfo[] = [];
    try { stashes = await gitManager.getStashes(); } catch {}
    if (!stashes.length) { content.innerHTML = `<div class="git-ui-empty"><div class="git-ui-empty-icon">📦</div>No stashes<br><button class="git-ui-btn" style="margin-top:12px" id="git-stash-create">Create Stash</button></div>`; content.querySelector('#git-stash-create')?.addEventListener('click', () => this.doStash()); return; }
    content.innerHTML = `<button class="git-ui-btn" id="git-stash-create" style="margin-bottom:12px">Create Stash</button>` + stashes.map(s => `<div class="git-ui-commit"><div class="git-ui-commit-sha">${s.id || `stash@{${s.index}}`}</div><div class="git-ui-commit-message">${this.esc(s.message || 'No message')}</div><div style="display:flex;gap:6px;margin-top:8px;"><button class="git-ui-btn git-ui-btn-secondary" data-stash="apply" data-idx="${s.index}">Apply</button><button class="git-ui-btn git-ui-btn-secondary" data-stash="pop" data-idx="${s.index}">Pop</button><button class="git-ui-btn git-ui-btn-secondary" data-stash="drop" data-idx="${s.index}">Drop</button></div></div>`).join('');
    content.querySelector('#git-stash-create')?.addEventListener('click', () => this.doStash());
    content.querySelectorAll('[data-stash]').forEach(btn => { btn.addEventListener('click', async (e) => { const t = e.target as HTMLElement; const idx = parseInt(t.dataset.idx || '0'); try { if (t.dataset.stash === 'apply') { await gitManager.stashApply(idx); this.notify('Applied'); } else if (t.dataset.stash === 'pop') { await gitManager.stashPop(idx); this.notify('Popped'); } else if (t.dataset.stash === 'drop' && confirm('Drop?')) { await gitManager.stashDrop(idx); this.notify('Dropped'); } await this.refresh(); } catch (e) { this.notify(`Error: ${e}`, 'error'); } }); });
  }

  showDiffDialog(file: string, diff: string): void { FloatingDialogManager.create({ id: `diff-${file.replace(/[^a-z0-9]/gi, '-')}`, title: `Diff: ${file.split(/[/\\]/).pop()}`, icon: '📄', content: `<div class="floating-diff-content">${FloatingDialogManager.formatDiff(diff)}</div>`, width: 700, height: 450 }); }

  async showCommitDetails(sha: string): Promise<void> { try { const c = await gitManager.showCommit(sha); const diff = await gitManager.showDiff(sha); FloatingDialogManager.create({ id: `commit-${sha.substring(0,7)}`, title: `Commit ${sha.substring(0,7)}`, icon: '📝', content: `<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #3c3c3c;"><div style="font-family:monospace;color:#4fc1ff;font-size:11px;">${sha}</div><div style="margin:8px 0;color:#e0e0e0;">${this.esc(c.message || '')}</div><div style="color:#808080;font-size:11px;">${c.author} • ${new Date(c.date*1000).toLocaleString()}</div></div><div class="floating-diff-content">${FloatingDialogManager.formatDiff(diff)}</div>`, width: 800, height: 500 }); } catch (e) { this.notify(`Error: ${e}`, 'error'); } }

  async showBlameDialog(file: string): Promise<void> { try { const blame = await gitManager.blame(file); FloatingDialogManager.create({ id: `blame-${file.replace(/[^a-z0-9]/gi, '-')}`, title: `Blame: ${file.split(/[/\\]/).pop()}`, icon: '👤', content: `<pre style="margin:0;font-family:monospace;font-size:10px;line-height:1.4;white-space:pre-wrap;">${this.esc(blame)}</pre>`, width: 800, height: 500 }); } catch (e) { this.notify(`Error: ${e}`, 'error'); } }

  private async doCommit(): Promise<void> { const input = document.getElementById('git-commit-msg') as HTMLInputElement; const msg = input?.value.trim(); if (!msg) { this.notify('Enter message', 'error'); return; } try { await gitManager.commit(msg); input.value = ''; await this.refresh(); this.notify('Committed'); } catch (e) { this.notify(`Error: ${e}`, 'error'); } }
  private async doStageAll(): Promise<void> { try { await gitManager.stageAll(); await this.refresh(); this.notify('All staged'); } catch (e) { this.notify(`Error: ${e}`, 'error'); } }
  private async doFileAction(action: string, file: string): Promise<void> { try { if (action === 'stage') await gitManager.stage([file]); else if (action === 'unstage') await gitManager.unstage([file]); else if (action === 'diff') { this.showDiffDialog(file, await gitManager.getDiff(file)); return; } await this.refresh(); } catch (e) { this.notify(`Error: ${e}`, 'error'); } }
  private async doCreateBranch(): Promise<void> { const input = document.getElementById('git-new-branch') as HTMLInputElement; const name = input?.value.trim(); if (!name) { this.notify('Enter name', 'error'); return; } try { await gitManager.createBranch(name); input.value = ''; await this.refresh(); this.notify(`Created ${name}`); } catch (e) { this.notify(`Error: ${e}`, 'error'); } }
  private async doSwitchBranch(name: string): Promise<void> { try { await gitManager.switchBranch(name); await this.refresh(); this.notify(`Switched to ${name}`); } catch (e) { this.notify(`Error: ${e}`, 'error'); } }
  private async doStash(): Promise<void> { try { await gitManager.stash(); await this.refresh(); this.notify('Stashed'); } catch (e) { this.notify(`Error: ${e}`, 'error'); } }

  private startAutoRefresh(): void { this.stopAutoRefresh(); this.refreshInterval = window.setInterval(() => { if (this.isVisible) this.refresh(); }, 30000); }
  private stopAutoRefresh(): void { if (this.refreshInterval) { clearInterval(this.refreshInterval); this.refreshInterval = null; } }
  private notify(msg: string, type: 'info' | 'error' = 'info'): void { const n = document.createElement('div'); n.style.cssText = `position:fixed;bottom:50px;right:50px;padding:10px 18px;background:${type === 'error' ? '#c53030' : '#0e639c'};color:white;border-radius:6px;font-size:12px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.3);`; n.textContent = msg; document.body.appendChild(n); setTimeout(() => n.remove(), 2500); }
  private esc(t: string): string { return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  getProjectPath(): string { return this.currentPath; }
}

export const gitUIEnhanced = GitUIEnhanced.getInstance();
export { GitUIEnhanced, FloatingDialogManager };

// ============================================
// REGISTER MENU HANDLERS ON WINDOW
// ============================================

function registerHandlers(): void {
  const win = window as any;
  const getPath = (): string => win.currentProjectPath || win.currentFolderPath || localStorage.getItem('ide_last_project_path') || '';
  const getFile = (): string | null => win.tabManager?.getActiveTab?.()?.path || null;
  const notify = (msg: string, type = 'info') => { const n = document.createElement('div'); n.style.cssText = `position:fixed;bottom:50px;right:50px;padding:10px 18px;background:${type === 'error' ? '#c53030' : type === 'success' ? '#2ea043' : '#0e639c'};color:white;border-radius:6px;font-size:12px;z-index:99999;`; n.textContent = msg; document.body.appendChild(n); setTimeout(() => n.remove(), 2500); };

  win.showGitPanel = (p?: string) => { const path = p || getPath(); if (!path) { notify('Open a project first', 'error'); return; } gitUIEnhanced.show(path); };
  win.showDiffViewer = async (f?: string) => { const path = getPath(), file = f || getFile(); if (!path) { notify('Open a project first', 'error'); return; } if (!file) { notify('Open a file first', 'error'); return; } try { await gitManager.open(path); const diff = await gitManager.getDiff(file); if (!diff?.trim()) { notify('No changes', 'info'); return; } gitUIEnhanced.showDiffDialog(file, diff); } catch (e) { notify(`Error: ${e}`, 'error'); } };
  win.gitDiffViewer = { showFileDiff: async (_: string, f: string) => win.showDiffViewer(f) };
  win.quickStash = async () => { const path = getPath(); if (!path) { notify('Open a project first', 'error'); return; } try { await gitManager.open(path); await gitManager.stash(); notify('✅ Stashed', 'success'); } catch (e) { notify(`Error: ${e}`, 'error'); } };
  win.quickPop = async () => { const path = getPath(); if (!path) { notify('Open a project first', 'error'); return; } try { await gitManager.open(path); await gitManager.stashPop(0); notify('✅ Popped', 'success'); } catch (e) { notify(`Error: ${e}`, 'error'); } };
  win.gitStashManager = { quickStash: () => win.quickStash(), quickPop: () => win.quickPop(), show: () => win.showStashManager() };
  win.showStashManager = async () => { const path = getPath(); if (!path) { notify('Open a project first', 'error'); return; } await gitUIEnhanced.show(path); setTimeout(() => (document.querySelector('.git-ui-tab[data-tab="stashes"]') as HTMLElement)?.click(), 100); };
  win.showGitBlame = async (f?: string) => { const path = getPath(), file = f || getFile(); if (!path) { notify('Open a project first', 'error'); return; } if (!file) { notify('Open a file first', 'error'); return; } try { await gitManager.open(path); await gitUIEnhanced.showBlameDialog(file); } catch (e) { notify(`Error: ${e}`, 'error'); } };
  win.gitBlameManager = { showBlameDialog: async (_: string, f: string) => win.showGitBlame(f) };
  win.showGitHistory = async () => { const path = getPath(); if (!path) { notify('Open a project first', 'error'); return; } await gitUIEnhanced.show(path); setTimeout(() => (document.querySelector('.git-ui-tab[data-tab="history"]') as HTMLElement)?.click(), 100); };
  win.gitHistoryViewer = { show: () => win.showGitHistory() };
  win.showBranchManager = async () => { const path = getPath(); if (!path) { notify('Open a project first', 'error'); return; } await gitUIEnhanced.show(path); setTimeout(() => (document.querySelector('.git-ui-tab[data-tab="branches"]') as HTMLElement)?.click(), 100); };
  win.gitBranchManager = { show: () => win.showBranchManager() };
  win.openTortoiseGit = async (cmd = 'log') => { try { await invoke('open_tortoise_git', { path: getPath() || '.', command: cmd }); } catch { notify('TortoiseGit not found', 'error'); } };

  win.gitUIEnhanced = gitUIEnhanced;
  win.FloatingDialogManager = FloatingDialogManager;
  console.log('✅ Git menu handlers registered');
}

if (typeof window !== 'undefined') { registerHandlers(); setTimeout(registerHandlers, 300); }
