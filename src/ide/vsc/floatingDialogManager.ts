// src/ide/vsc/floatingDialogManager.ts
// Floating Dialog Manager - Creates draggable, independent, non-blocking dialogs
// Use for diff viewers, commit details, blame, etc.

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

/**
 * FloatingDialogManager - Creates VS Code-like floating windows
 * 
 * Features:
 * - Draggable by header
 * - Resizable from corners
 * - Minimize/Maximize/Close buttons
 * - Multiple dialogs can be open simultaneously
 * - Click to bring to front
 * - Non-blocking (can interact with IDE while open)
 */
class FloatingDialogManagerClass {
  private dialogCount = 0;
  private activeDialogs: Map<string, HTMLElement> = new Map();
  private highestZIndex = 10000;

  constructor() {
    this.injectStyles();
  }

  /**
   * Inject CSS styles for floating dialogs
   */
  private injectStyles(): void {
    if (document.getElementById('floating-dialog-styles')) return;

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

      .floating-dialog.resizable {
        resize: both;
      }

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
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .floating-dialog-controls {
        display: flex;
        gap: 2px;
        flex-shrink: 0;
      }

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

      .floating-dialog-btn:hover {
        background: rgba(255,255,255,0.1);
        color: #cccccc;
      }

      .floating-dialog-btn.close:hover {
        background: #c53030;
        color: white;
      }

      .floating-dialog-content {
        flex: 1;
        overflow: auto;
        padding: 12px;
      }

      .floating-dialog.minimized .floating-dialog-content {
        display: none;
      }

      .floating-dialog.minimized {
        height: auto !important;
        resize: none !important;
      }

      .floating-dialog.maximized {
        left: 0 !important;
        top: 35px !important;
        width: 100vw !important;
        height: calc(100vh - 35px) !important;
        border-radius: 0;
        resize: none !important;
      }

      .floating-dialog.maximized .floating-dialog-header {
        border-radius: 0;
      }

      /* Diff-specific styles */
      .diff-line-added {
        background: rgba(78, 201, 176, 0.15);
        color: #4ec9b0;
      }
      
      .diff-line-removed {
        background: rgba(244, 135, 113, 0.15);
        color: #f48771;
      }
      
      .diff-line-header {
        background: rgba(86, 156, 214, 0.15);
        color: #569cd6;
        padding: 4px 8px;
        margin: 8px 0;
      }

      .diff-content {
        font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
        font-size: 12px;
        line-height: 1.5;
      }

      .diff-line {
        padding: 0 8px;
        white-space: pre-wrap;
        word-break: break-all;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Create a floating dialog
   */
  create(options: FloatingDialogOptions): HTMLElement {
    const dialogId = options.id || `floating-dialog-${++this.dialogCount}`;
    
    // Close existing dialog with same ID
    if (options.id && this.activeDialogs.has(options.id)) {
      this.activeDialogs.get(options.id)?.remove();
      this.activeDialogs.delete(options.id);
    }

    const width = options.width || 600;
    const height = options.height || 450;
    const x = options.x ?? (window.innerWidth - width) / 2 + (this.dialogCount % 5) * 30;
    const y = options.y ?? 100 + (this.dialogCount % 5) * 30;
    const resizable = options.resizable !== false;

    const dialog = document.createElement('div');
    dialog.id = dialogId;
    dialog.className = `floating-dialog ${resizable ? 'resizable' : ''}`;
    dialog.style.cssText = `
      left: ${x}px;
      top: ${y}px;
      width: ${width}px;
      height: ${height}px;
      min-width: 300px;
      min-height: 150px;
      z-index: ${++this.highestZIndex};
    `;

    const icon = options.icon || '📄';
    dialog.innerHTML = `
      <div class="floating-dialog-header">
        <span class="floating-dialog-title">
          <span>${icon}</span>
          <span>${this.escapeHtml(options.title)}</span>
        </span>
        <div class="floating-dialog-controls">
          <button class="floating-dialog-btn minimize" title="Minimize">─</button>
          <button class="floating-dialog-btn maximize" title="Maximize">□</button>
          <button class="floating-dialog-btn close" title="Close">✕</button>
        </div>
      </div>
      <div class="floating-dialog-content">${options.content}</div>
    `;

    // Setup interactions
    this.makeDraggable(dialog);
    this.setupButtons(dialog, dialogId, options.onClose);
    this.setupBringToFront(dialog);

    document.body.appendChild(dialog);
    this.activeDialogs.set(dialogId, dialog);

    console.log(`✅ [FloatingDialog] Created: ${dialogId}`);
    return dialog;
  }

  /**
   * Make dialog draggable by its header
   */
  private makeDraggable(dialog: HTMLElement): void {
    const header = dialog.querySelector('.floating-dialog-header') as HTMLElement;
    if (!header) return;

    let isDragging = false;
    let startX = 0, startY = 0;
    let initialX = 0, initialY = 0;

    const onMouseDown = (e: MouseEvent) => {
      // Don't drag if clicking buttons
      if ((e.target as HTMLElement).closest('button')) return;
      // Don't drag if maximized
      if (dialog.classList.contains('maximized')) return;
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialX = dialog.offsetLeft;
      initialY = dialog.offsetTop;
      
      dialog.style.transition = 'none';
      this.bringToFront(dialog);
      
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      let newX = initialX + dx;
      let newY = initialY + dy;
      
      // Keep within bounds
      newX = Math.max(-dialog.offsetWidth + 100, Math.min(newX, window.innerWidth - 100));
      newY = Math.max(0, Math.min(newY, window.innerHeight - 50));
      
      dialog.style.left = `${newX}px`;
      dialog.style.top = `${newY}px`;
    };

    const onMouseUp = () => {
      isDragging = false;
      dialog.style.transition = '';
    };

    header.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  /**
   * Setup button click handlers
   */
  private setupButtons(dialog: HTMLElement, dialogId: string, onClose?: () => void): void {
    const closeBtn = dialog.querySelector('.floating-dialog-btn.close') as HTMLElement;
    const minimizeBtn = dialog.querySelector('.floating-dialog-btn.minimize') as HTMLElement;
    const maximizeBtn = dialog.querySelector('.floating-dialog-btn.maximize') as HTMLElement;

    if (closeBtn) {
      closeBtn.onclick = () => {
        dialog.remove();
        this.activeDialogs.delete(dialogId);
        onClose?.();
        console.log(`✅ [FloatingDialog] Closed: ${dialogId}`);
      };
    }

    if (minimizeBtn) {
      minimizeBtn.onclick = () => {
        dialog.classList.toggle('minimized');
        minimizeBtn.textContent = dialog.classList.contains('minimized') ? '□' : '─';
      };
    }

    if (maximizeBtn) {
      maximizeBtn.onclick = () => {
        dialog.classList.toggle('maximized');
        maximizeBtn.textContent = dialog.classList.contains('maximized') ? '❐' : '□';
      };
    }
  }

  /**
   * Setup click to bring dialog to front
   */
  private setupBringToFront(dialog: HTMLElement): void {
    dialog.addEventListener('mousedown', () => {
      this.bringToFront(dialog);
    });
  }

  /**
   * Bring dialog to front
   */
  private bringToFront(dialog: HTMLElement): void {
    dialog.style.zIndex = String(++this.highestZIndex);
  }

  /**
   * Get dialog by ID
   */
  get(id: string): HTMLElement | undefined {
    return this.activeDialogs.get(id);
  }

  /**
   * Update dialog content
   */
  updateContent(id: string, content: string): boolean {
    const dialog = this.activeDialogs.get(id);
    if (dialog) {
      const contentEl = dialog.querySelector('.floating-dialog-content');
      if (contentEl) {
        contentEl.innerHTML = content;
        return true;
      }
    }
    return false;
  }

  /**
   * Close a specific dialog
   */
  close(id: string): boolean {
    const dialog = this.activeDialogs.get(id);
    if (dialog) {
      dialog.remove();
      this.activeDialogs.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Close all dialogs
   */
  closeAll(): void {
    this.activeDialogs.forEach(dialog => dialog.remove());
    this.activeDialogs.clear();
    console.log('✅ [FloatingDialog] Closed all dialogs');
  }

  /**
   * Get count of open dialogs
   */
  count(): number {
    return this.activeDialogs.size;
  }

  /**
   * Check if a dialog is open
   */
  isOpen(id: string): boolean {
    return this.activeDialogs.has(id);
  }

  /**
   * Escape HTML characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ============================================
  // PRESET DIALOG TYPES
  // ============================================

  /**
   * Show a diff viewer dialog
   */
  showDiff(fileName: string, diff: string): HTMLElement {
    const formattedDiff = this.formatDiff(diff);
    
    return this.create({
      id: `diff-${fileName.replace(/[^a-zA-Z0-9]/g, '-')}`,
      title: fileName,
      icon: '📄',
      content: `<div class="diff-content">${formattedDiff}</div>`,
      width: 800,
      height: 500
    });
  }

  /**
   * Show a commit details dialog
   */
  showCommit(sha: string, message: string, author: string, date: string, diff: string): HTMLElement {
    const formattedDiff = this.formatDiff(diff);
    
    return this.create({
      id: `commit-${sha.substring(0, 7)}`,
      title: `Commit ${sha.substring(0, 7)}`,
      icon: '📝',
      content: `
        <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #3c3c3c;">
          <div style="font-family: monospace; color: #4fc1ff; margin-bottom: 8px;">${sha}</div>
          <div style="margin-bottom: 8px; font-size: 14px; color: #e0e0e0;">${this.escapeHtml(message)}</div>
          <div style="color: #808080; font-size: 12px;">
            <span style="color: #4ec9b0;">${this.escapeHtml(author)}</span> • ${date}
          </div>
        </div>
        <div class="diff-content">${formattedDiff}</div>
      `,
      width: 900,
      height: 600
    });
  }

  /**
   * Show a blame viewer dialog
   */
  showBlame(fileName: string, blameText: string): HTMLElement {
    return this.create({
      id: `blame-${fileName.replace(/[^a-zA-Z0-9]/g, '-')}`,
      title: fileName,
      icon: '👤',
      content: `
        <pre style="
          margin: 0;
          font-family: 'Cascadia Code', 'Fira Code', monospace;
          font-size: 11px;
          line-height: 1.4;
          white-space: pre-wrap;
          word-break: break-all;
        ">${this.escapeHtml(blameText)}</pre>
      `,
      width: 900,
      height: 600
    });
  }

  /**
   * Show a generic info dialog
   */
  showInfo(title: string, content: string, icon = 'ℹ️'): HTMLElement {
    return this.create({
      id: `info-${Date.now()}`,
      title,
      icon,
      content,
      width: 500,
      height: 350
    });
  }

  /**
   * Format diff text with syntax highlighting
   */
  private formatDiff(diff: string): string {
    if (!diff || !diff.trim()) {
      return '<div style="color: #808080; padding: 20px; text-align: center;">No changes to display</div>';
    }

    return diff.split('\n').map(line => {
      let className = 'diff-line';
      
      if (line.startsWith('+') && !line.startsWith('+++')) {
        className = 'diff-line diff-line-added';
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        className = 'diff-line diff-line-removed';
      } else if (line.startsWith('@@')) {
        className = 'diff-line diff-line-header';
      }
      
      return `<div class="${className}">${this.escapeHtml(line)}</div>`;
    }).join('');
  }
}

// Create singleton instance
export const FloatingDialogManager = new FloatingDialogManagerClass();

// Also export as default
export default FloatingDialogManager;

// Make available on window for console access
if (typeof window !== 'undefined') {
  (window as any).FloatingDialogManager = FloatingDialogManager;
}
