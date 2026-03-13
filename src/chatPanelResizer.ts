// chatPanelResizer.ts - Simple Resizable Chat Panel
// ============================================================================
// SIMPLIFIED VERSION - Direct style manipulation, guaranteed to work
// ============================================================================

let isResizing = false;
let startX = 0;
let startWidth = 0;
let chatPanel: HTMLElement | null = null;
let resizer: HTMLElement | null = null;

const CONFIG = {
  minWidth: 280,
  maxWidth: 800,
  defaultWidth: 400,
  storageKey: 'aiChatPanelWidth'
};

/**
 * Initialize the chat panel resizer
 */
export function initChatPanelResizer(): void {
  console.log('🔧 Initializing chat panel resizer...');
  
  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(setup, 200));
  } else {
    setTimeout(setup, 200);
  }
}

function setup(): void {
  chatPanel = document.querySelector('.assistant-panel') as HTMLElement;
  
  if (!chatPanel) {
    console.warn('⚠️ Chat panel not found, retrying...');
    setTimeout(setup, 500);
    return;
  }

  // Remove existing resizer
  document.querySelector('.chat-panel-resizer')?.remove();

  // Create resizer
  resizer = document.createElement('div');
  resizer.className = 'chat-panel-resizer';
  resizer.innerHTML = '<div class="resizer-line"></div>';
  
  // Insert before chat panel
  chatPanel.parentElement?.insertBefore(resizer, chatPanel);
  
  // Add styles FIRST
  injectStyles();
  
  // ✅ CRITICAL: Force the panel to NOT use flex sizing
  forceFixedWidth();
  
  // Load saved width
  const saved = localStorage.getItem(CONFIG.storageKey);
  const width = saved ? parseInt(saved, 10) : CONFIG.defaultWidth;
  setWidth(width);
  
  // Event listeners
  resizer.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  
  // Double-click to reset
  resizer.addEventListener('dblclick', () => {
    setWidth(CONFIG.defaultWidth);
    showToast('Reset to default width');
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey) {
      if (e.key === '[') {
        e.preventDefault();
        setWidth((chatPanel?.offsetWidth || 400) - 50);
        showToast(`Width: ${chatPanel?.offsetWidth}px`);
      } else if (e.key === ']') {
        e.preventDefault();
        setWidth((chatPanel?.offsetWidth || 400) + 50);
        showToast(`Width: ${chatPanel?.offsetWidth}px`);
      }
    }
  });
  
  console.log('✅ Chat panel resizer ready! Width:', chatPanel.offsetWidth);
}

/**
 * Force the panel to use fixed width - THIS IS THE KEY FIX
 */
function forceFixedWidth(): void {
  if (!chatPanel) return;
  
  // Remove any flex properties and force fixed width behavior
  chatPanel.style.setProperty('flex', '0 0 auto', 'important');
  chatPanel.style.setProperty('flex-grow', '0', 'important');
  chatPanel.style.setProperty('flex-shrink', '0', 'important');
  chatPanel.style.setProperty('flex-basis', 'auto', 'important');
}

/**
 * Set width with constraints
 */
function setWidth(width: number): void {
  if (!chatPanel) return;
  
  const w = Math.min(Math.max(width, CONFIG.minWidth), CONFIG.maxWidth);
  
  // Apply width with !important to override any CSS
  chatPanel.style.setProperty('width', `${w}px`, 'important');
  chatPanel.style.setProperty('min-width', `${CONFIG.minWidth}px`, 'important');
  chatPanel.style.setProperty('max-width', `${CONFIG.maxWidth}px`, 'important');
  
  // Re-apply flex override every time
  forceFixedWidth();
  
  // Save to localStorage
  localStorage.setItem(CONFIG.storageKey, String(w));
  
  // Update indicator if visible
  const indicator = document.querySelector('.resize-indicator') as HTMLElement;
  if (indicator) indicator.textContent = `${w}px`;
  
  console.log('📐 Width set to:', w);
}

function onMouseDown(e: MouseEvent): void {
  if (!chatPanel) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  isResizing = true;
  startX = e.clientX;
  startWidth = chatPanel.offsetWidth;
  
  document.body.style.cursor = 'ew-resize';
  document.body.style.userSelect = 'none';
  document.body.classList.add('panel-resizing');
  resizer?.classList.add('active');
  
  // Show indicator
  showIndicator();
  
  console.log('🔄 Resize started at width:', startWidth);
}

function onMouseMove(e: MouseEvent): void {
  if (!isResizing || !chatPanel) return;
  
  // Calculate delta (panel is on the right, so drag left = wider)
  const delta = startX - e.clientX;
  const newWidth = startWidth + delta;
  
  setWidth(newWidth);
}

function onMouseUp(): void {
  if (!isResizing) return;
  
  isResizing = false;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  document.body.classList.remove('panel-resizing');
  resizer?.classList.remove('active');
  
  // Hide indicator after delay
  hideIndicator();
  
  console.log('✅ Resize complete:', chatPanel?.offsetWidth, 'px');
}

function showIndicator(): void {
  let indicator = document.querySelector('.resize-indicator') as HTMLElement;
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'resize-indicator';
    document.body.appendChild(indicator);
  }
  indicator.style.opacity = '1';
  indicator.textContent = `${chatPanel?.offsetWidth || 0}px`;
  
  // Position it
  if (chatPanel) {
    const rect = chatPanel.getBoundingClientRect();
    indicator.style.right = `${window.innerWidth - rect.left + 20}px`;
  }
}

function hideIndicator(): void {
  setTimeout(() => {
    const indicator = document.querySelector('.resize-indicator') as HTMLElement;
    if (indicator) indicator.style.opacity = '0';
  }, 800);
}

function showToast(msg: string): void {
  const existing = document.querySelector('.resize-toast');
  existing?.remove();
  
  const toast = document.createElement('div');
  toast.className = 'resize-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function injectStyles(): void {
  const id = 'chat-resizer-css';
  document.getElementById(id)?.remove();
  
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    /* =============================================
       CHAT PANEL RESIZER STYLES
       ============================================= */
    
    /* Force assistant panel to use fixed width - HIGH SPECIFICITY */
    .assistant-panel,
    .main-container > .assistant-panel,
    div.assistant-panel {
      flex: 0 0 auto !important;
      flex-grow: 0 !important;
      flex-shrink: 0 !important;
      flex-basis: auto !important;
    }
    
    /* Resizer bar */
    .chat-panel-resizer {
      width: 8px;
      cursor: ew-resize;
      background: transparent;
      position: relative;
      z-index: 200;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    
    .chat-panel-resizer:hover {
      background: linear-gradient(90deg, 
        transparent 0%, 
        rgba(88, 166, 255, 0.4) 50%, 
        transparent 100%
      );
    }
    
    .chat-panel-resizer.active {
      background: linear-gradient(90deg, 
        transparent 0%, 
        rgba(88, 166, 255, 0.6) 50%, 
        transparent 100%
      );
    }
    
    /* Resizer handle line */
    .chat-panel-resizer .resizer-line {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 4px;
      height: 50px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 2px;
      transition: all 0.2s ease;
      opacity: 0;
    }
    
    .chat-panel-resizer:hover .resizer-line {
      opacity: 1;
      background: rgba(88, 166, 255, 0.7);
      height: 80px;
    }
    
    .chat-panel-resizer.active .resizer-line {
      opacity: 1;
      background: #58a6ff;
      height: 120px;
      box-shadow: 0 0 10px rgba(88, 166, 255, 0.5);
    }
    
    /* Width indicator popup */
    .resize-indicator {
      position: fixed;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(13, 17, 23, 0.95);
      color: #58a6ff;
      padding: 10px 18px;
      border-radius: 8px;
      font-family: 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
      border: 1px solid rgba(88, 166, 255, 0.5);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    }
    
    .resize-indicator::before {
      content: '↔ ';
      opacity: 0.6;
    }
    
    /* Toast notification */
    .resize-toast {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: rgba(13, 17, 23, 0.95);
      color: #f0f6fc;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10001;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
      border: 1px solid rgba(88, 166, 255, 0.3);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }
    
    .resize-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    
    /* Prevent selection and set cursor during resize */
    body.panel-resizing,
    body.panel-resizing * {
      cursor: ew-resize !important;
      user-select: none !important;
    }
    
    body.panel-resizing iframe,
    body.panel-resizing .monaco-editor,
    body.panel-resizing .monaco-editor * {
      pointer-events: none !important;
    }
    
    /* Quick size buttons */
    .chat-size-btns {
      display: flex;
      gap: 4px;
      margin-right: 8px;
    }
    
    .chat-size-btn {
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      color: #8b949e;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    
    .chat-size-btn:hover {
      background: rgba(88, 166, 255, 0.15);
      border-color: rgba(88, 166, 255, 0.4);
      color: #58a6ff;
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Add quick size buttons to header (optional)
 */
export function addQuickSizeButtons(): void {
  const header = document.querySelector('.assistant-header .assistant-actions');
  if (!header || document.querySelector('.chat-size-btns')) return;
  
  const container = document.createElement('div');
  container.className = 'chat-size-btns';
  
  [
    { label: 'S', width: 300, title: 'Compact (300px)' },
    { label: 'M', width: 400, title: 'Normal (400px)' },
    { label: 'L', width: 550, title: 'Wide (550px)' }
  ].forEach(({ label, width, title }) => {
    const btn = document.createElement('button');
    btn.className = 'chat-size-btn';
    btn.textContent = label;
    btn.title = title;
    btn.onclick = (e) => {
      e.stopPropagation();
      setWidth(width);
      showToast(`Width: ${width}px`);
    };
    container.appendChild(btn);
  });
  
  header.insertBefore(container, header.firstChild);
}

// Public API
export function setChatWidth(width: number): void {
  setWidth(width);
}

export function getChatWidth(): number {
  return chatPanel?.offsetWidth || CONFIG.defaultWidth;
}

export function toggleChatPanel(): void {
  if (!chatPanel) return;
  const isHidden = chatPanel.classList.contains('hidden');
  chatPanel.classList.toggle('hidden', !isHidden);
  if (resizer) resizer.style.display = isHidden ? '' : 'none';
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).chatResizer = {
    init: initChatPanelResizer,
    setWidth: setChatWidth,
    getWidth: getChatWidth,
    toggle: toggleChatPanel,
    addButtons: addQuickSizeButtons
  };
  
  console.log('💡 Chat resizer module loaded');
  console.log('   Commands: chatResizer.setWidth(500), chatResizer.addButtons()');
  console.log('   Shortcuts: Ctrl+Shift+[ / ] to adjust width');
}

export default initChatPanelResizer;