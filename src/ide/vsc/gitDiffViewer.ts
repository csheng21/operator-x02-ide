// ide/vsc/gitDiffViewer.ts
// ============================================================================
// GIT DIFF VIEWER DIALOG - Side-by-side and unified diff views
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPES
// ============================================================================

export interface DiffLine {
  type: 'addition' | 'deletion' | 'context' | 'header' | 'info';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface FileDiff {
  filePath: string;
  oldPath?: string;
  status: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
  isBinary: boolean;
}

export type DiffViewMode = 'split' | 'unified' | 'inline';

// ============================================================================
// DIFF PARSER
// ============================================================================

export function parseDiff(diffText: string): FileDiff[] {
  const files: FileDiff[] = [];
  const lines = diffText.split('\n');
  
  let currentFile: FileDiff | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLineNum = 0;
  let newLineNum = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // New file diff header
    if (line.startsWith('diff --git')) {
      if (currentFile) {
        if (currentHunk) currentFile.hunks.push(currentHunk);
        files.push(currentFile);
      }
      
      const match = line.match(/diff --git a\/(.+) b\/(.+)/);
      currentFile = {
        filePath: match ? match[2] : '',
        oldPath: match ? match[1] : undefined,
        status: 'modified',
        hunks: [],
        additions: 0,
        deletions: 0,
        isBinary: false
      };
      currentHunk = null;
      continue;
    }
    
    if (!currentFile) continue;
    
    // Binary file
    if (line.includes('Binary files')) {
      currentFile.isBinary = true;
      continue;
    }
    
    // File status indicators
    if (line.startsWith('new file mode')) {
      currentFile.status = 'added';
    } else if (line.startsWith('deleted file mode')) {
      currentFile.status = 'deleted';
    } else if (line.startsWith('rename from')) {
      currentFile.status = 'renamed';
    }
    
    // Hunk header
    if (line.startsWith('@@')) {
      if (currentHunk) currentFile.hunks.push(currentHunk);
      
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)?/);
      if (match) {
        oldLineNum = parseInt(match[1], 10);
        newLineNum = parseInt(match[3], 10);
        
        currentHunk = {
          header: line,
          oldStart: oldLineNum,
          oldCount: parseInt(match[2] || '1', 10),
          newStart: newLineNum,
          newCount: parseInt(match[4] || '1', 10),
          lines: [{
            type: 'header',
            content: match[5] || ''
          }]
        };
      }
      continue;
    }
    
    if (!currentHunk) continue;
    
    // Diff content lines
    if (line.startsWith('+') && !line.startsWith('+++')) {
      currentHunk.lines.push({
        type: 'addition',
        content: line.substring(1),
        newLineNumber: newLineNum++
      });
      currentFile.additions++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      currentHunk.lines.push({
        type: 'deletion',
        content: line.substring(1),
        oldLineNumber: oldLineNum++
      });
      currentFile.deletions++;
    } else if (line.startsWith(' ')) {
      currentHunk.lines.push({
        type: 'context',
        content: line.substring(1),
        oldLineNumber: oldLineNum++,
        newLineNumber: newLineNum++
      });
    } else if (line.startsWith('\\')) {
      currentHunk.lines.push({
        type: 'info',
        content: line
      });
    }
  }
  
  // Add last file/hunk
  if (currentFile) {
    if (currentHunk) currentFile.hunks.push(currentHunk);
    files.push(currentFile);
  }
  
  return files;
}

// ============================================================================
// GIT DIFF VIEWER CLASS
// ============================================================================

export class GitDiffViewer {
  private dialog: HTMLElement | null = null;
  private currentFile: FileDiff | null = null;
  private viewMode: DiffViewMode = 'split';
  private repoPath: string = '';
  private isStaged: boolean = false;
  private aiReviewVisible: boolean = false;
  private aiReviewCache: string | null = null;
  
  constructor() {
    this.injectStyles();
  }
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  /**
   * Show diff for a specific file
   */
  public async showFileDiff(
    repoPath: string, 
    filePath: string, 
    staged: boolean = false
  ): Promise<void> {
    this.repoPath = repoPath;
    this.isStaged = staged;
    
    try {
      const diffResult = await invoke<{ diff_content: string }>('git_diff_file', {
        path: repoPath,
        filePath: filePath,
        staged: staged
      });
      
      const files = parseDiff(diffResult.diff_content);
      if (files.length > 0) {
        this.currentFile = files[0];
        this.render();
      } else {
        this.showEmptyDiff(filePath);
      }
    } catch (error) {
      console.error('Failed to get diff:', error);
      this.showError(String(error));
    }
  }
  
  /**
   * Show diff from raw diff text
   */
  public showDiff(diffText: string, filePath?: string): void {
    const files = parseDiff(diffText);
    if (files.length > 0) {
      this.currentFile = files[0];
      this.render();
    } else if (filePath) {
      this.showEmptyDiff(filePath);
    }
  }
  
  /**
   * Close the diff viewer
   */
  public close(): void {
    if (this.dialog) {
      this.dialog.remove();
      this.dialog = null;
    }
    // Clear AI review cache
    this.aiReviewCache = null;
    this.aiReviewVisible = false;
  }
  
  /**
   * Set view mode
   */
  public setViewMode(mode: DiffViewMode): void {
    this.viewMode = mode;
    if (this.currentFile) {
      this.renderDiffContent();
    }
  }
  
  // ============================================================================
  // RENDERING
  // ============================================================================
  
  private render(): void {
    this.close();
    
    // Get current date/time
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
    
    this.dialog = document.createElement('div');
    this.dialog.className = 'git-diff-dialog';
    this.dialog.innerHTML = `
      <div class="diff-dialog-backdrop"></div>
      <div class="diff-dialog-container">
        <div class="diff-dialog-header">
          <div class="diff-header-left">
            <span class="diff-file-icon">${this.getStatusIcon()}</span>
            <span class="diff-file-path">${this.currentFile?.filePath || 'Diff'}</span>
            <span class="diff-stats">
              <span class="additions">+${this.currentFile?.additions || 0}</span>
              <span class="deletions">-${this.currentFile?.deletions || 0}</span>
            </span>
            <span class="diff-datetime">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" style="opacity: 0.5;">
                <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 14.5a6.5 6.5 0 110-13 6.5 6.5 0 010 13zM8 3a.5.5 0 01.5.5v4.793l2.854 2.853a.5.5 0 01-.708.708l-3-3A.5.5 0 017.5 8.5v-5A.5.5 0 018 3z"/>
              </svg>
              ${dateStr} ${timeStr}
            </span>
          </div>
          <div class="diff-header-actions">
            <button class="ai-review-btn" title="AI Analysis">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
              </svg>
              AI
            </button>
            <div class="diff-view-toggle">
              <button class="view-btn ${this.viewMode === 'split' ? 'active' : ''}" 
                      data-mode="split" title="Split View">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="2" width="6" height="12" rx="1" stroke="currentColor" fill="none"/>
                  <rect x="9" y="2" width="6" height="12" rx="1" stroke="currentColor" fill="none"/>
                </svg>
              </button>
              <button class="view-btn ${this.viewMode === 'unified' ? 'active' : ''}" 
                      data-mode="unified" title="Unified View">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="2" width="14" height="12" rx="1" stroke="currentColor" fill="none"/>
                </svg>
              </button>
            </div>
            <button class="diff-close-btn" title="Close (Esc)">×</button>
          </div>
        </div>
        
        <!-- Main content area with diff and AI panel side by side -->
        <div class="diff-main-area">
          <!-- Left: Diff Content -->
          <div class="diff-left-panel">
            <!-- Split view headers with date/time -->
            <div class="diff-split-headers">
              <div class="diff-side-header old-header">
                <span class="header-label">Original</span>
                <span class="header-info">before</span>
              </div>
              <div class="diff-side-header new-header">
                <span class="header-label">Modified</span>
                <span class="header-info">${dateStr} ${timeStr}</span>
              </div>
            </div>
            <div class="diff-dialog-content">
              ${this.currentFile?.isBinary ? this.renderBinaryMessage() : ''}
            </div>
          </div>
          
          <!-- Right: AI Review Panel (initially hidden) -->
          <div class="ai-review-panel" style="display: none;">
            <div class="ai-review-header">
              <div class="ai-review-title">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#7c3aed">
                  <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
                </svg>
                AI ANALYSIS
              </div>
              <button class="ai-review-close" title="Close">×</button>
            </div>
            <div class="ai-review-content">
              <div class="ai-review-loading">
                <div class="ai-spinner"></div>
                <span>analyzing...</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="diff-dialog-footer">
          <div class="diff-navigation">
            <button class="nav-btn prev-change" title="Previous (↑)">↑ prev</button>
            <button class="nav-btn next-change" title="Next (↓)">↓ next</button>
          </div>
          <div class="diff-footer-actions">
            ${this.isStaged ? `
              <button class="action-btn unstage-btn">unstage</button>
            ` : `
              <button class="action-btn stage-btn">stage</button>
              <button class="action-btn discard-btn danger">discard</button>
            `}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.dialog);
    this.attachEventListeners();
    this.renderDiffContent();
  }
  
  private renderDiffContent(): void {
    const content = this.dialog?.querySelector('.diff-dialog-content');
    if (!content || !this.currentFile) return;
    
    if (this.currentFile.isBinary) {
      content.innerHTML = this.renderBinaryMessage();
      return;
    }
    
    if (this.viewMode === 'split') {
      content.innerHTML = this.renderSplitView();
    } else {
      content.innerHTML = this.renderUnifiedView();
    }
  }
  
  private renderSplitView(): string {
    if (!this.currentFile) return '';
    
    let html = '<div class="diff-split-view">';
    
    for (const hunk of this.currentFile.hunks) {
      html += `
        <div class="diff-hunk">
          <div class="hunk-header">${this.escapeHtml(hunk.header)}</div>
          <div class="hunk-content split">
            <div class="diff-side old-side">
              ${this.renderSplitSide(hunk, 'old')}
            </div>
            <div class="diff-side new-side">
              ${this.renderSplitSide(hunk, 'new')}
            </div>
          </div>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }
  
  private renderSplitSide(hunk: DiffHunk, side: 'old' | 'new'): string {
    let html = '';
    
    for (const line of hunk.lines) {
      if (line.type === 'header' || line.type === 'info') continue;
      
      if (side === 'old') {
        if (line.type === 'addition') {
          html += `<div class="diff-line empty"><span class="line-num"></span><span class="line-content"></span></div>`;
        } else {
          const lineClass = line.type === 'deletion' ? 'deletion' : 'context';
          html += `
            <div class="diff-line ${lineClass}">
              <span class="line-num">${line.oldLineNumber || ''}</span>
              <span class="line-content">${this.escapeHtml(line.content)}</span>
            </div>
          `;
        }
      } else {
        if (line.type === 'deletion') {
          html += `<div class="diff-line empty"><span class="line-num"></span><span class="line-content"></span></div>`;
        } else {
          const lineClass = line.type === 'addition' ? 'addition' : 'context';
          html += `
            <div class="diff-line ${lineClass}">
              <span class="line-num">${line.newLineNumber || ''}</span>
              <span class="line-content">${this.escapeHtml(line.content)}</span>
            </div>
          `;
        }
      }
    }
    
    return html;
  }
  
  private renderUnifiedView(): string {
    if (!this.currentFile) return '';
    
    let html = '<div class="diff-unified-view">';
    
    for (const hunk of this.currentFile.hunks) {
      html += `
        <div class="diff-hunk">
          <div class="hunk-header">${this.escapeHtml(hunk.header)}</div>
          <div class="hunk-content unified">
      `;
      
      for (const line of hunk.lines) {
        if (line.type === 'header') continue;
        
        const prefix = line.type === 'addition' ? '+' : 
                       line.type === 'deletion' ? '-' : ' ';
        
        html += `
          <div class="diff-line ${line.type}">
            <span class="line-num old">${line.oldLineNumber || ''}</span>
            <span class="line-num new">${line.newLineNumber || ''}</span>
            <span class="line-prefix">${prefix}</span>
            <span class="line-content">${this.escapeHtml(line.content)}</span>
          </div>
        `;
      }
      
      html += '</div></div>';
    }
    
    html += '</div>';
    return html;
  }
  
  private renderBinaryMessage(): string {
    return `
      <div class="binary-file-message">
        <span class="binary-icon">📦</span>
        <span>Binary file - cannot display diff</span>
      </div>
    `;
  }
  
  private showEmptyDiff(filePath: string): void {
    this.close();
    
    this.dialog = document.createElement('div');
    this.dialog.className = 'git-diff-dialog';
    this.dialog.innerHTML = `
      <div class="diff-dialog-backdrop"></div>
      <div class="diff-dialog-container">
        <div class="diff-dialog-header">
          <span class="diff-file-path">${filePath}</span>
          <button class="diff-close-btn">✕</button>
        </div>
        <div class="diff-dialog-content">
          <div class="empty-diff-message">
            <span class="empty-icon">✓</span>
            <span>No changes to display</span>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.dialog);
    this.attachEventListeners();
  }
  
  private showError(message: string): void {
    this.close();
    
    this.dialog = document.createElement('div');
    this.dialog.className = 'git-diff-dialog';
    this.dialog.innerHTML = `
      <div class="diff-dialog-backdrop"></div>
      <div class="diff-dialog-container">
        <div class="diff-dialog-header">
          <span class="diff-file-path">Error</span>
          <button class="diff-close-btn">✕</button>
        </div>
        <div class="diff-dialog-content">
          <div class="error-message">
            <span class="error-icon">⚠️</span>
            <span>${this.escapeHtml(message)}</span>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.dialog);
    this.attachEventListeners();
  }
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  private attachEventListeners(): void {
    if (!this.dialog) return;
    
    // Close button
    this.dialog.querySelector('.diff-close-btn')?.addEventListener('click', () => this.close());
    
    // Backdrop click
    this.dialog.querySelector('.diff-dialog-backdrop')?.addEventListener('click', () => this.close());
    
    // AI Review button
    this.dialog.querySelector('.ai-review-btn')?.addEventListener('click', () => this.toggleAIReview());
    
    // AI Review close button
    this.dialog.querySelector('.ai-review-close')?.addEventListener('click', () => this.hideAIReview());
    
    // View mode toggle
    this.dialog.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = (e.currentTarget as HTMLElement).dataset.mode as DiffViewMode;
        this.setViewMode(mode);
        
        // Update active state
        this.dialog?.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
      });
    });
    
    // Navigation buttons
    this.dialog.querySelector('.prev-change')?.addEventListener('click', () => this.navigateChange(-1));
    this.dialog.querySelector('.next-change')?.addEventListener('click', () => this.navigateChange(1));
    
    // Action buttons
    this.dialog.querySelector('.stage-btn')?.addEventListener('click', () => this.stageFile());
    this.dialog.querySelector('.unstage-btn')?.addEventListener('click', () => this.unstageFile());
    this.dialog.querySelector('.discard-btn')?.addEventListener('click', () => this.discardChanges());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyDown);
  }
  
  // ============================================================================
  // AI REVIEW FUNCTIONALITY
  // ============================================================================
  
  private toggleAIReview(): void {
    if (this.aiReviewVisible) {
      this.hideAIReview();
    } else {
      this.showAIReview();
    }
  }
  
  private hideAIReview(): void {
    const panel = this.dialog?.querySelector('.ai-review-panel') as HTMLElement;
    if (panel) {
      panel.style.display = 'none';
    }
    this.aiReviewVisible = false;
    
    // Update button state
    const btn = this.dialog?.querySelector('.ai-review-btn') as HTMLElement;
    if (btn) {
      btn.classList.remove('active');
    }
  }
  
  private async showAIReview(): Promise<void> {
    const panel = this.dialog?.querySelector('.ai-review-panel') as HTMLElement;
    const content = this.dialog?.querySelector('.ai-review-content') as HTMLElement;
    
    if (!panel || !content) return;
    
    // Show panel with flex display
    panel.style.display = 'flex';
    this.aiReviewVisible = true;
    
    // Update button state
    const btn = this.dialog?.querySelector('.ai-review-btn') as HTMLElement;
    if (btn) {
      btn.classList.add('active');
    }
    
    // If we have cached result, show it
    if (this.aiReviewCache) {
      content.innerHTML = this.aiReviewCache;
      return;
    }
    
    // Show loading
    content.innerHTML = `
      <div class="ai-review-loading">
        <div class="ai-spinner"></div>
        <span>analyzing...</span>
      </div>
    `;
    
    // Get file content and diff for analysis
    await this.performAIReview(content);
  }
  
  private async performAIReview(contentEl: HTMLElement): Promise<void> {
    if (!this.currentFile) return;
    
    try {
      // Build the diff content for AI
      let diffContent = '';
      let oldContent = '';
      let newContent = '';
      
      for (const hunk of this.currentFile.hunks) {
        diffContent += `\n${hunk.header}\n`;
        for (const line of hunk.lines) {
          if (line.type === 'deletion') {
            diffContent += `-${line.content}\n`;
            oldContent += line.content + '\n';
          } else if (line.type === 'addition') {
            diffContent += `+${line.content}\n`;
            newContent += line.content + '\n';
          } else if (line.type === 'context') {
            diffContent += ` ${line.content}\n`;
            oldContent += line.content + '\n';
            newContent += line.content + '\n';
          }
        }
      }
      
      // Get file extension for language context
      const ext = this.currentFile.filePath.split('.').pop()?.toLowerCase() || '';
      const language = this.getLanguageFromExt(ext);
      
      // AI API call
      const OPERATOR_X02_CONFIG = {
        apiKey: 'PROXY',
        apiBaseUrl: 'PROXY',
        model: 'x02-chat'
      };
      
      const prompt = `Analyze this code change. Be extremely concise. Use terminal/IDE style output.

FILE: ${this.currentFile.filePath}
LANG: ${language}
STAT: ${this.currentFile.status} (+${this.currentFile.additions}/-${this.currentFile.deletions})

DIFF:
${diffContent}

Output format (use exactly these headers, no emojis):

[ARCHITECTURE]
purpose: <one line>
pattern: <one line>
module: <one line>

[CHANGES]
- line X: <what changed>
- removed: <what was removed>
- added: <what was added>
- type: feature|fix|refactor|docs|style|chore

[IMPACT]
- functional: <one line>
- side-effects: none|<description>
- breaking: yes|no
- risk: LOW|MEDIUM|HIGH

[ISSUES]
- quality: ok|<concern>
- security: ok|<concern>
- performance: ok|<concern>

[SUMMARY]
<one sentence>

Keep each line under 60 chars. No markdown formatting except code in backticks. Be terse like a linter output.`;

      const response = await fetch(`${OPERATOR_X02_CONFIG.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPERATOR_X02_CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model: OPERATOR_X02_CONFIG.model,
          messages: [
            { 
              role: 'system', 
              content: 'You are a code analysis tool. Output terse, terminal-style responses. No prose, no emojis, no markdown headers with #. Use the exact format requested. Keep lines short. Be like a linter or static analysis tool output.' 
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1000,
          temperature: 0.2
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || 'No response from AI';
      
      // Render the AI response with terminal-style formatting
      const renderedContent = this.renderMarkdown(aiResponse);
      
      this.aiReviewCache = renderedContent;
      contentEl.innerHTML = this.aiReviewCache;
      
    } catch (error) {
      console.error('AI Review failed:', error);
      contentEl.innerHTML = `
        <div class="ai-review-error">
          <div class="error-icon">!</div>
          <div class="error-message">analysis failed</div>
          <div class="error-details">${error}</div>
          <button class="retry-btn">retry</button>
        </div>
      `;
    }
  }
  
  private getLanguageFromExt(ext: string): string {
    const languages: Record<string, string> = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'jsx': 'React JSX',
      'tsx': 'React TSX',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'cs': 'C#',
      'go': 'Go',
      'rs': 'Rust',
      'rb': 'Ruby',
      'php': 'PHP',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'scala': 'Scala',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'json': 'JSON',
      'xml': 'XML',
      'yaml': 'YAML',
      'yml': 'YAML',
      'md': 'Markdown',
      'sql': 'SQL',
      'sh': 'Shell',
      'bash': 'Bash'
    };
    return languages[ext] || ext.toUpperCase();
  }
  
  private renderMarkdown(text: string): string {
    // Simple markdown rendering
    let html = text
      // Escape HTML first
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers with emojis preserved
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="ai-code">$1</code>')
      // Section headers [HEADER]
      .replace(/^\[([A-Z]+)\]$/gm, '<div class="ai-section">$1</div>')
      // Key-value pairs (key: value)
      .replace(/^([a-z\-]+):\s*(.+)$/gm, '<div class="ai-row"><span class="ai-key">$1</span><span class="ai-val">$2</span></div>')
      // Bullet items
      .replace(/^- (.+)$/gm, '<div class="ai-item">$1</div>')
      // Risk levels
      .replace(/\b(LOW)\b/g, '<span class="risk-low">LOW</span>')
      .replace(/\b(MEDIUM)\b/g, '<span class="risk-medium">MEDIUM</span>')
      .replace(/\b(HIGH)\b/g, '<span class="risk-high">HIGH</span>')
      // Status indicators
      .replace(/\bok\b/gi, '<span class="st-ok">ok</span>')
      .replace(/\bnone\b/gi, '<span class="st-none">none</span>')
      .replace(/\byes\b/gi, '<span class="st-yes">yes</span>')
      .replace(/\bno\b/gi, '<span class="st-no">no</span>')
      // Line breaks
      .replace(/\n/g, '');
    
    return `<div class="ai-output">${html}</div>`;
  }
  
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.dialog) return;
    
    if (e.key === 'Escape') {
      this.close();
    } else if (e.key === 'ArrowUp' && e.altKey) {
      e.preventDefault();
      this.navigateChange(-1);
    } else if (e.key === 'ArrowDown' && e.altKey) {
      e.preventDefault();
      this.navigateChange(1);
    }
  };
  
  private navigateChange(direction: number): void {
    const content = this.dialog?.querySelector('.diff-dialog-content');
    if (!content) return;
    
    const changes = content.querySelectorAll('.diff-line.addition, .diff-line.deletion');
    if (changes.length === 0) return;
    
    // Find current visible change
    const contentRect = content.getBoundingClientRect();
    let currentIndex = -1;
    
    for (let i = 0; i < changes.length; i++) {
      const rect = changes[i].getBoundingClientRect();
      if (rect.top >= contentRect.top) {
        currentIndex = i;
        break;
      }
    }
    
    // Navigate to next/prev
    const targetIndex = Math.max(0, Math.min(changes.length - 1, currentIndex + direction));
    changes[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  
  private async stageFile(): Promise<void> {
    if (!this.currentFile || !this.repoPath) return;
    
    try {
      await invoke('git_stage', {
        path: this.repoPath,
        files: [this.currentFile.filePath]
      });
      
      this.close();
      this.dispatchEvent('git-file-staged', { path: this.currentFile.filePath });
    } catch (error) {
      console.error('Failed to stage file:', error);
    }
  }
  
  private async unstageFile(): Promise<void> {
    if (!this.currentFile || !this.repoPath) return;
    
    try {
      await invoke('git_unstage_files', {
        path: this.repoPath,
        files: [this.currentFile.filePath]
      });
      
      this.close();
      this.dispatchEvent('git-file-unstaged', { path: this.currentFile.filePath });
    } catch (error) {
      console.error('Failed to unstage file:', error);
    }
  }
  
  private async discardChanges(): Promise<void> {
    if (!this.currentFile || !this.repoPath) return;
    
    const confirmed = confirm(`Discard all changes to "${this.currentFile.filePath}"?\n\nThis cannot be undone.`);
    if (!confirmed) return;
    
    try {
      await invoke('git_discard_files', {
        path: this.repoPath,
        files: [this.currentFile.filePath]
      });
      
      this.close();
      this.dispatchEvent('git-file-discarded', { path: this.currentFile.filePath });
    } catch (error) {
      console.error('Failed to discard changes:', error);
    }
  }
  
  private dispatchEvent(name: string, detail: any): void {
    document.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  }
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
  private getStatusIcon(): string {
    if (!this.currentFile) return '📄';
    
    const icons: Record<string, string> = {
      added: '➕',
      deleted: '➖',
      modified: '📝',
      renamed: '📛'
    };
    
    return icons[this.currentFile.status] || '📄';
  }
  
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  private injectStyles(): void {
    if (document.getElementById('git-diff-viewer-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'git-diff-viewer-styles';
    style.textContent = `
      .git-diff-dialog {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .diff-dialog-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(2px);
      }
      
      .diff-dialog-container {
        position: relative;
        width: 95vw;
        max-width: 1600px;
        height: 90vh;
        background: #1e1e1e;
        border: 1px solid #333;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      }
      
      .diff-dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 12px;
        background: #252526;
        border-bottom: 1px solid #333;
        height: 32px;
        box-sizing: border-box;
      }
      
      .diff-header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .diff-file-icon {
        font-size: 14px;
      }
      
      .diff-file-path {
        font-weight: 500;
        color: #ccc;
        font-size: 12px;
        font-family: 'Consolas', 'Monaco', monospace;
      }
      
      .diff-stats {
        display: flex;
        gap: 6px;
        font-size: 10px;
        font-family: 'Consolas', 'Monaco', monospace;
      }
      
      .diff-stats .additions {
        color: #4bb45f;
      }
      
      .diff-stats .deletions {
        color: #e06c75;
      }
      
      .diff-header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .diff-view-toggle {
        display: flex;
        background: #2d2d2d;
        border: 1px solid #3c3c3c;
        overflow: hidden;
      }
      
      .view-btn {
        padding: 4px 8px;
        background: transparent;
        border: none;
        color: #666;
        cursor: pointer;
        transition: all 0.1s ease;
      }
      
      .view-btn:hover {
        color: #aaa;
        background: #333;
      }
      
      .view-btn.active {
        color: #e0e0e0;
        background: #3c3c3c;
      }
      
      .diff-close-btn {
        width: 22px;
        height: 22px;
        border: none;
        background: transparent;
        color: #666;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.1s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .diff-close-btn:hover {
        background: #333;
        color: #fff;
      }
      
      .diff-dialog-content {
        flex: 1;
        overflow: auto;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 13px;
        line-height: 1.5;
      }
      
      .diff-split-view, .diff-unified-view {
        min-height: 100%;
      }
      
      .diff-hunk {
        margin-bottom: 16px;
      }
      
      .hunk-header {
        padding: 8px 12px;
        background: #2d2d30;
        color: #9cdcfe;
        font-size: 12px;
        border-bottom: 1px solid #3c3c3c;
        position: sticky;
        top: 0;
        z-index: 10;
      }
      
      .hunk-content.split {
        display: flex;
      }
      
      .diff-side {
        flex: 1;
        overflow-x: auto;
      }
      
      .diff-side.old-side {
        border-right: 1px solid #3c3c3c;
      }
      
      .diff-line {
        display: flex;
        min-height: 22px;
      }
      
      .diff-line.addition {
        background: rgba(75, 180, 95, 0.15);
      }
      
      .diff-line.deletion {
        background: rgba(220, 80, 80, 0.15);
      }
      
      .diff-line.empty {
        background: #2a2a2a;
      }
      
      .line-num {
        flex-shrink: 0;
        width: 50px;
        padding: 0 8px;
        text-align: right;
        color: #6e7681;
        background: rgba(0, 0, 0, 0.2);
        user-select: none;
      }
      
      .diff-unified-view .line-num {
        width: 40px;
      }
      
      .line-prefix {
        flex-shrink: 0;
        width: 20px;
        text-align: center;
        color: #6e7681;
      }
      
      .diff-line.addition .line-prefix {
        color: #4bb45f;
      }
      
      .diff-line.deletion .line-prefix {
        color: #dc5050;
      }
      
      .line-content {
        flex: 1;
        padding: 0 8px;
        white-space: pre;
        overflow-x: auto;
      }
      
      .diff-dialog-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 12px;
        background: #252526;
        border-top: 1px solid #333;
        height: 32px;
        box-sizing: border-box;
      }
      
      .diff-navigation {
        display: flex;
        gap: 4px;
      }
      
      .nav-btn, .action-btn {
        padding: 3px 10px;
        border: 1px solid #333;
        background: #2d2d2d;
        color: #999;
        font-size: 10px;
        cursor: pointer;
        transition: all 0.1s ease;
        font-family: 'Consolas', 'Monaco', monospace;
      }
      
      .nav-btn:hover, .action-btn:hover {
        background: #333;
        border-color: #444;
        color: #ccc;
      }
      
      .action-btn.danger {
        color: #e06c75;
        border-color: #4a2a2a;
      }
      
      .action-btn.danger:hover {
        background: #3a2020;
      }
      
      .diff-footer-actions {
        display: flex;
        gap: 4px;
      }
      
      .binary-file-message, .empty-diff-message, .error-message {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 12px;
        color: #808080;
        font-size: 14px;
      }
      
      .binary-icon, .empty-icon, .error-icon {
        font-size: 48px;
        opacity: 0.5;
      }
      
      /* AI Review Button */
      .ai-review-btn {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        background: #2d2d2d;
        border: 1px solid #4a4a4a;
        border-radius: 3px;
        color: #a78bfa;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      
      .ai-review-btn:hover {
        background: #3c3c3c;
        border-color: #a78bfa;
      }
      
      .ai-review-btn.active {
        background: #4c1d95;
        border-color: #7c3aed;
        color: #e0e0e0;
      }
      
      /* Date/Time in header */
      .diff-datetime {
        display: flex;
        align-items: center;
        gap: 5px;
        color: #6b6b6b;
        font-size: 10px;
        font-family: 'Consolas', 'Monaco', monospace;
        margin-left: 10px;
        padding-left: 10px;
        border-left: 1px solid #333;
      }
      
      /* Main area with flex row for side-by-side layout */
      .diff-main-area {
        flex: 1;
        display: flex;
        overflow: hidden;
      }
      
      /* Left panel (diff content) */
      .diff-left-panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 0;
      }
      
      /* Split view headers with date/time */
      .diff-split-headers {
        display: flex;
        background: #1e1e1e;
        border-bottom: 1px solid #333;
        height: 24px;
      }
      
      .diff-side-header {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 12px;
        font-size: 10px;
        font-family: 'Consolas', 'Monaco', monospace;
      }
      
      .diff-side-header.old-header {
        border-right: 1px solid #333;
        background: rgba(220, 80, 80, 0.03);
      }
      
      .diff-side-header.new-header {
        background: rgba(75, 180, 95, 0.03);
      }
      
      .diff-side-header .header-label {
        color: #808080;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .diff-side-header .header-info {
        color: #555;
        font-size: 9px;
      }
      
      .diff-side-header.old-header .header-label::before {
        content: '−';
        color: #dc5050;
        margin-right: 5px;
        font-weight: bold;
      }
      
      .diff-side-header.new-header .header-label::before {
        content: '+';
        color: #4bb45f;
        margin-right: 5px;
        font-weight: bold;
      }
      
      /* AI Review Panel - Right Side Vertical - IDE Style */
      .ai-review-panel {
        width: 340px;
        min-width: 340px;
        background: #1a1a1a;
        border-left: 1px solid #333;
        display: flex;
        flex-direction: column;
        animation: slideInRight 0.2s ease;
      }
      
      @keyframes slideInRight {
        from { 
          width: 0; 
          min-width: 0;
          opacity: 0; 
        }
        to { 
          width: 340px;
          min-width: 340px;
          opacity: 1; 
        }
      }
      
      .ai-review-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 10px;
        background: #252526;
        border-bottom: 1px solid #333;
        flex-shrink: 0;
        height: 28px;
        box-sizing: border-box;
      }
      
      .ai-review-title {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #a78bfa;
        font-size: 11px;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .ai-review-title svg {
        width: 12px;
        height: 12px;
      }
      
      .ai-review-close {
        background: transparent;
        border: none;
        color: #666;
        cursor: pointer;
        font-size: 14px;
        padding: 2px 6px;
        border-radius: 2px;
        transition: all 0.1s;
        line-height: 1;
      }
      
      .ai-review-close:hover {
        background: #333;
        color: #ccc;
      }
      
      .ai-review-content {
        flex: 1;
        overflow-y: auto;
        padding: 0;
        font-size: 11px;
        line-height: 1.4;
        color: #999;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        background: #1a1a1a;
      }
      
      .ai-review-content::-webkit-scrollbar {
        width: 6px;
      }
      
      .ai-review-content::-webkit-scrollbar-track {
        background: #1a1a1a;
      }
      
      .ai-review-content::-webkit-scrollbar-thumb {
        background: #333;
      }
      
      .ai-review-content::-webkit-scrollbar-thumb:hover {
        background: #444;
      }
      
      .ai-review-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 16px;
        gap: 10px;
        color: #555;
        font-size: 10px;
      }
      
      .ai-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #2a2a2a;
        border-top-color: #7c3aed;
        border-radius: 50%;
        animation: spin 0.5s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      /* Terminal-style AI output */
      .ai-output {
        padding: 8px 0;
      }
      
      .ai-section {
        background: #252526;
        color: #7c3aed;
        padding: 4px 10px;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 1px;
        border-left: 2px solid #7c3aed;
        margin: 8px 0 4px 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      
      .ai-section:first-child {
        margin-top: 0;
      }
      
      .ai-row {
        display: flex;
        padding: 2px 10px;
        font-size: 11px;
        border-bottom: 1px solid #1f1f1f;
      }
      
      .ai-row:hover {
        background: #1f1f1f;
      }
      
      .ai-key {
        color: #6b6b6b;
        min-width: 90px;
        flex-shrink: 0;
      }
      
      .ai-key::after {
        content: ':';
        margin-right: 8px;
      }
      
      .ai-val {
        color: #b0b0b0;
        flex: 1;
      }
      
      .ai-item {
        padding: 2px 10px 2px 20px;
        font-size: 11px;
        color: #909090;
        position: relative;
        border-bottom: 1px solid #1f1f1f;
      }
      
      .ai-item:hover {
        background: #1f1f1f;
      }
      
      .ai-item::before {
        content: '›';
        position: absolute;
        left: 10px;
        color: #444;
      }
      
      .ai-code {
        background: #0d0d0d;
        color: #d19a66;
        padding: 1px 4px;
        border-radius: 2px;
        font-size: 10px;
        font-family: 'Consolas', 'Monaco', monospace;
      }
      
      .code-block {
        background: #0d0d0d;
        border-left: 2px solid #333;
        padding: 6px 10px;
        margin: 4px 0;
        font-size: 10px;
        color: #888;
        overflow-x: auto;
      }
      
      /* Status indicators - terminal style */
      .st-ok { color: #4bb45f; }
      .st-none { color: #666; }
      .st-yes { color: #d19a66; }
      .st-no { color: #4bb45f; }
      
      /* Risk levels - terminal style */
      .risk-low {
        color: #4bb45f;
        font-weight: 600;
      }
      
      .risk-medium {
        color: #d19a66;
        font-weight: 600;
      }
      
      .risk-high {
        color: #e06c75;
        font-weight: 600;
      }
      
      .ai-review-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 30px 16px;
        gap: 8px;
        text-align: center;
      }
      
      .ai-review-error .error-icon {
        font-size: 20px;
        opacity: 0.4;
      }
      
      .ai-review-error .error-message {
        color: #e06c75;
        font-size: 10px;
      }
      
      .ai-review-error .error-details {
        color: #555;
        font-size: 9px;
      }
      
      .ai-review-error .retry-btn {
        margin-top: 6px;
        padding: 3px 10px;
        background: #252526;
        border: 1px solid #333;
        color: #888;
        font-size: 9px;
        cursor: pointer;
      }
      
      .ai-review-error .retry-btn:hover {
        background: #2d2d2d;
        border-color: #444;
      }
    `;
    
    document.head.appendChild(style);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const gitDiffViewer = new GitDiffViewer();

export default gitDiffViewer;
