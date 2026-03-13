// src/ide/git/gitTab.ts
// Adds GIT tab to explorer and connects to existing gitUIEnhanced
// Just import this file in main.ts: import './ide/git/gitTab';

import { gitUIEnhanced } from '../vsc/gitUIEnhanced';
import { gitManager } from '../vsc/gitManager';

class GitTab {
  private initialized = false;
  private contentContainer: HTMLElement | null = null;
  
  constructor() {
    // Wait for DOM then initialize
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      setTimeout(() => this.init(), 1000);
    }
  }
  
  private init(): void {
    if (this.initialized) return;
    
    console.log('🔀 Initializing Git tab...');
    
    // Try multiple times to ensure tabs are loaded
    this.tryAddTab();
    setTimeout(() => this.tryAddTab(), 1500);
    setTimeout(() => this.tryAddTab(), 3000);
  }
  
  private tryAddTab(): void {
    // Check if tab already exists
    if (document.querySelector('[data-tab-id="git"]')) {
      console.log('Git tab already exists');
      this.initialized = true;
      return;
    }
    
    // Find the explorer tabs container
    const tabsContainer = document.querySelector('.explorer-tabs');
    if (!tabsContainer) {
      console.log('Explorer tabs not found yet...');
      return;
    }
    
    console.log('✅ Found explorer tabs, adding GIT tab');
    
    // Create GIT tab button
    const gitTab = document.createElement('div');
    gitTab.className = 'explorer-tab';
    gitTab.dataset.tabId = 'git';
    gitTab.innerHTML = `
      <span class="tab-icon" style="color: #f05033;">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.57 5.953v4.27a1.223 1.223 0 11-1.008-.036V5.88a1.223 1.223 0 01-.664-1.607L5.09 2.465.302 7.253a1.03 1.03 0 000 1.457l6.986 6.986a1.03 1.03 0 001.457 0l6.953-6.953a1.03 1.03 0 000-1.457z"/>
        </svg>
      </span>
      <span class="tab-label">GIT</span>
    `;
    
    // Add to tabs
    tabsContainer.appendChild(gitTab);
    
    // Create content container
    this.createContentContainer();
    
    // Tab click handler
    gitTab.addEventListener('click', () => this.showGitTab());
    
    this.initialized = true;
    console.log('✅ Git tab added successfully!');
  }
  
  private createContentContainer(): void {
    const explorerPanel = document.querySelector('.explorer-panel');
    if (!explorerPanel) return;
    
    // Check if already exists
    if (document.getElementById('git-tab-content')) return;
    
    this.contentContainer = document.createElement('div');
    this.contentContainer.id = 'git-tab-content';
    this.contentContainer.className = 'tab-content';
    this.contentContainer.style.cssText = `
      display: none;
      height: 100%;
      overflow-y: auto;
      background: #1e1e1e;
    `;
    
    // Add Git panel content
    this.contentContainer.innerHTML = this.getGitPanelHTML();
    
    explorerPanel.appendChild(this.contentContainer);
    
    // Attach event handlers
    this.attachHandlers();
  }
  
  private getGitPanelHTML(): string {
    return `
      <div class="git-panel-container" style="padding: 0;">
        <!-- Header -->
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #252526;
          border-bottom: 1px solid #333;
        ">
          <div style="display: flex; align-items: center; gap: 8px; color: #888; font-size: 11px; text-transform: uppercase; font-weight: 600;">
            <span style="color: #f05033;">🔀</span>
            Source Control
          </div>
          <button id="git-refresh" style="
            background: transparent;
            border: none;
            color: #888;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
          " title="Refresh">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.5 2a.5.5 0 01.5.5v3a.5.5 0 01-.5.5h-3a.5.5 0 010-1h1.82l-.748-.747A5.5 5.5 0 103.5 11.5a.5.5 0 01-1 0 6.5 6.5 0 1110.348-5.226l.652.652V2.5a.5.5 0 01.5-.5z"/>
            </svg>
          </button>
        </div>
        
        <!-- Git Status Area -->
        <div id="git-status-area" style="padding: 12px;">
          <div style="color: #888; text-align: center; padding: 20px;">
            Loading Git status...
          </div>
        </div>
      </div>
    `;
  }
  
  private attachHandlers(): void {
    if (!this.contentContainer) return;
    
    // Refresh button
    const refreshBtn = this.contentContainer.querySelector('#git-refresh');
    refreshBtn?.addEventListener('click', () => this.refreshGitStatus());
    
    refreshBtn?.addEventListener('mouseenter', () => {
      (refreshBtn as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
      (refreshBtn as HTMLElement).style.color = '#ccc';
    });
    
    refreshBtn?.addEventListener('mouseleave', () => {
      (refreshBtn as HTMLElement).style.background = 'transparent';
      (refreshBtn as HTMLElement).style.color = '#888';
    });
  }
  
  private showGitTab(): void {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
      (content as HTMLElement).style.display = 'none';
    });
    
    // Remove active from all tabs
    document.querySelectorAll('.explorer-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    // Show Git content
    if (this.contentContainer) {
      this.contentContainer.style.display = 'block';
    }
    
    // Mark Git tab as active
    const gitTab = document.querySelector('[data-tab-id="git"]');
    if (gitTab) {
      gitTab.classList.add('active');
    }
    
    // Refresh status
    this.refreshGitStatus();
  }
  
  private async refreshGitStatus(): Promise<void> {
    const statusArea = document.getElementById('git-status-area');
    if (!statusArea) return;
    
    const projectPath = localStorage.getItem('currentProjectPath') || '';
    
    if (!projectPath) {
      statusArea.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #888;">
          <div style="font-size: 32px; margin-bottom: 12px;">📁</div>
          <div>No project open</div>
          <div style="font-size: 11px; margin-top: 8px; opacity: 0.7;">
            Open a folder to see Git status
          </div>
        </div>
      `;
      return;
    }
    
    // Check if it's a Git repo
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const isRepo = await invoke('git_is_repo', { path: projectPath });
      
      if (!isRepo) {
        statusArea.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: #888;">
            <div style="font-size: 32px; margin-bottom: 12px;">📁</div>
            <div>Not a Git repository</div>
            <button id="git-init-btn" style="
              margin-top: 16px;
              padding: 8px 16px;
              background: #0e639c;
              border: none;
              color: white;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            ">
              Initialize Repository
            </button>
          </div>
        `;
        
        const initBtn = statusArea.querySelector('#git-init-btn');
        initBtn?.addEventListener('click', () => this.initRepo(projectPath));
        return;
      }
      
      // Get Git info
      const info = await invoke('git_info', { path: projectPath }) as any;
      const status = await invoke('git_status', { path: projectPath }) as any[];
      
      const staged = status.filter((f: any) => f.staged);
      const unstaged = status.filter((f: any) => !f.staged);
      
      statusArea.innerHTML = `
        <!-- Branch -->
        <div id="git-branch-bar" style="
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #2d2d2d;
          border-radius: 4px;
          cursor: pointer;
          margin-bottom: 12px;
        ">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="#888">
            <path d="M9.5 3.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM5 6.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>
          </svg>
          <span style="color: #ccc;">${info.branch || 'main'}</span>
        </div>
        
        <!-- Quick Actions -->
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <button class="git-action-btn" data-action="pull" title="Pull" style="
            flex: 1;
            padding: 6px;
            background: #2d2d2d;
            border: none;
            border-radius: 4px;
            color: #888;
            cursor: pointer;
            font-size: 11px;
          ">↓ Pull</button>
          <button class="git-action-btn" data-action="push" title="Push" style="
            flex: 1;
            padding: 6px;
            background: #2d2d2d;
            border: none;
            border-radius: 4px;
            color: #888;
            cursor: pointer;
            font-size: 11px;
          ">↑ Push</button>
        </div>
        
        <!-- Commit Input -->
        <div style="margin-bottom: 12px;">
          <input type="text" id="git-commit-msg" placeholder="Commit message" style="
            width: 100%;
            padding: 8px;
            background: #3c3c3c;
            border: 1px solid #555;
            border-radius: 4px;
            color: #ccc;
            font-size: 12px;
            box-sizing: border-box;
          ">
          <button id="git-commit-btn" style="
            width: 100%;
            margin-top: 8px;
            padding: 8px;
            background: #0e639c;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-size: 12px;
          " ${staged.length === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            ✓ Commit (${staged.length} staged)
          </button>
        </div>
        
        <!-- Staged Changes -->
        ${staged.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 6px 0;
              color: #888;
              font-size: 11px;
              text-transform: uppercase;
            ">
              <span>Staged Changes</span>
              <span style="
                background: #4d4d4d;
                padding: 2px 8px;
                border-radius: 10px;
              ">${staged.length}</span>
            </div>
            <div class="git-file-list">
              ${staged.map((f: any) => `
                <div class="git-file-item" data-path="${f.path}" style="
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  padding: 4px 8px;
                  border-radius: 4px;
                  cursor: pointer;
                ">
                  <span style="
                    color: ${this.getStatusColor(f.status)};
                    font-weight: bold;
                    font-size: 11px;
                  ">${this.getStatusLetter(f.status)}</span>
                  <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${f.path.split(/[/\\]/).pop()}
                  </span>
                  <button class="git-unstage-btn" data-path="${f.path}" style="
                    background: transparent;
                    border: none;
                    color: #888;
                    cursor: pointer;
                    font-size: 14px;
                    padding: 2px 4px;
                  ">−</button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <!-- Changes -->
        <div>
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            color: #888;
            font-size: 11px;
            text-transform: uppercase;
          ">
            <span>Changes</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="
                background: #4d4d4d;
                padding: 2px 8px;
                border-radius: 10px;
              ">${unstaged.length}</span>
              ${unstaged.length > 0 ? `
                <button id="git-stage-all" style="
                  background: transparent;
                  border: none;
                  color: #888;
                  cursor: pointer;
                  font-size: 14px;
                " title="Stage All">+</button>
              ` : ''}
            </div>
          </div>
          
          ${unstaged.length > 0 ? `
            <div class="git-file-list">
              ${unstaged.map((f: any) => `
                <div class="git-file-item" data-path="${f.path}" style="
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  padding: 4px 8px;
                  border-radius: 4px;
                  cursor: pointer;
                ">
                  <span style="
                    color: ${this.getStatusColor(f.status)};
                    font-weight: bold;
                    font-size: 11px;
                  ">${this.getStatusLetter(f.status)}</span>
                  <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${f.path.split(/[/\\]/).pop()}
                  </span>
                  <button class="git-stage-btn" data-path="${f.path}" style="
                    background: transparent;
                    border: none;
                    color: #888;
                    cursor: pointer;
                    font-size: 14px;
                    padding: 2px 4px;
                  ">+</button>
                  <button class="git-discard-btn" data-path="${f.path}" style="
                    background: transparent;
                    border: none;
                    color: #888;
                    cursor: pointer;
                    font-size: 14px;
                    padding: 2px 4px;
                  ">↩</button>
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="color: #666; font-size: 12px; padding: 8px; text-align: center;">
              No changes
            </div>
          `}
        </div>
      `;
      
      // Attach action handlers
      this.attachActionHandlers(projectPath);
      
    } catch (error) {
      console.error('Git status error:', error);
      statusArea.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #f14c4c;">
          <div style="font-size: 32px; margin-bottom: 12px;">⚠️</div>
          <div>Error loading Git status</div>
          <div style="font-size: 11px; margin-top: 8px; opacity: 0.7;">
            ${error}
          </div>
        </div>
      `;
    }
  }
  
  private attachActionHandlers(projectPath: string): void {
    const statusArea = document.getElementById('git-status-area');
    if (!statusArea) return;
    
    // Pull/Push buttons
    statusArea.querySelectorAll('.git-action-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = (btn as HTMLElement).dataset.action;
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          if (action === 'pull') {
            await invoke('git_pull', { path: projectPath });
            this.showToast('Pull complete!', 'success');
          } else if (action === 'push') {
            await invoke('git_push', { path: projectPath });
            this.showToast('Push complete!', 'success');
          }
          this.refreshGitStatus();
        } catch (error) {
          this.showToast(`${action} failed: ${error}`, 'error');
        }
      });
      
      // Hover effect
      btn.addEventListener('mouseenter', () => {
        (btn as HTMLElement).style.background = '#3c3c3c';
        (btn as HTMLElement).style.color = '#ccc';
      });
      btn.addEventListener('mouseleave', () => {
        (btn as HTMLElement).style.background = '#2d2d2d';
        (btn as HTMLElement).style.color = '#888';
      });
    });
    
    // Commit button
    const commitBtn = statusArea.querySelector('#git-commit-btn');
    const commitInput = statusArea.querySelector('#git-commit-msg') as HTMLInputElement;
    
    commitBtn?.addEventListener('click', async () => {
      const message = commitInput?.value?.trim();
      if (!message) {
        this.showToast('Enter a commit message', 'warning');
        commitInput?.focus();
        return;
      }
      
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('git_commit', { path: projectPath, message });
        commitInput.value = '';
        this.showToast('Committed!', 'success');
        this.refreshGitStatus();
      } catch (error) {
        this.showToast(`Commit failed: ${error}`, 'error');
      }
    });
    
    // Stage all button
    const stageAllBtn = statusArea.querySelector('#git-stage-all');
    stageAllBtn?.addEventListener('click', async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('git_add_all', { path: projectPath });
        this.refreshGitStatus();
      } catch (error) {
        this.showToast(`Stage all failed: ${error}`, 'error');
      }
    });
    
    // Stage buttons
    statusArea.querySelectorAll('.git-stage-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const filePath = (btn as HTMLElement).dataset.path;
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('git_add', { path: projectPath, files: [filePath] });
          this.refreshGitStatus();
        } catch (error) {
          this.showToast(`Stage failed: ${error}`, 'error');
        }
      });
    });
    
    // Unstage buttons
    statusArea.querySelectorAll('.git-unstage-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const filePath = (btn as HTMLElement).dataset.path;
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('git_unstage', { path: projectPath, files: [filePath] });
          this.refreshGitStatus();
        } catch (error) {
          this.showToast(`Unstage failed: ${error}`, 'error');
        }
      });
    });
    
    // Discard buttons
    statusArea.querySelectorAll('.git-discard-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const filePath = (btn as HTMLElement).dataset.path;
        const fileName = filePath?.split(/[/\\]/).pop();
        if (!confirm(`Discard changes to "${fileName}"?`)) return;
        
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('git_discard', { path: projectPath, files: [filePath] });
          this.showToast('Changes discarded', 'success');
          this.refreshGitStatus();
        } catch (error) {
          this.showToast(`Discard failed: ${error}`, 'error');
        }
      });
    });
    
    // File item hover
    statusArea.querySelectorAll('.git-file-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        (item as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
      });
      item.addEventListener('mouseleave', () => {
        (item as HTMLElement).style.background = 'transparent';
      });
    });
  }
  
  private async initRepo(projectPath: string): Promise<void> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('git_init', { path: projectPath });
      this.showToast('Repository initialized!', 'success');
      this.refreshGitStatus();
    } catch (error) {
      this.showToast(`Init failed: ${error}`, 'error');
    }
  }
  
  private getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'modified': '#d19a66',
      'added': '#98c379',
      'deleted': '#e06c75',
      'untracked': '#61afef',
      'renamed': '#c678dd'
    };
    return colors[status] || '#888';
  }
  
  private getStatusLetter(status: string): string {
    const letters: Record<string, string> = {
      'modified': 'M',
      'added': 'A',
      'deleted': 'D',
      'untracked': 'U',
      'renamed': 'R'
    };
    return letters[status] || '?';
  }
  
  private showToast(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    const colors: Record<string, string> = {
      success: '#4ec9b0',
      error: '#f14c4c',
      warning: '#cca700'
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 60px;
      right: 20px;
      padding: 10px 16px;
      background: #252526;
      border-left: 3px solid ${colors[type]};
      color: #ccc;
      font-size: 13px;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      z-index: 10001;
      animation: slideIn 0.2s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s';
      setTimeout(() => toast.remove(), 200);
    }, 3000);
  }
}

// Create instance
const gitTab = new GitTab();

// Export
export { gitTab };
