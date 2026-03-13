// autoCodeApply.ts - Basic Version
// ============================================================================
// AUTO-APPLY CODE FROM AI RESPONSES TO MONACO EDITOR
// Features:
// 1. Adds "Apply to Editor" button to code blocks
// 2. Detects file annotations in code blocks
// 3. Applies code directly to Monaco editor
// 4. Supports Replace All, Insert at Cursor, Smart Merge
// ============================================================================

console.log('🤖 [AutoCodeApply] Loading Basic Version...');

// ============================================================================
// TYPES
// ============================================================================

interface CodeBlockInfo {
  id: string;
  element: HTMLElement;
  code: string;
  language: string;
  filename: string | null;
  action: 'replace' | 'insert' | 'create';
}

interface ApplyResult {
  success: boolean;
  message: string;
  linesChanged?: number;
}

// ============================================================================
// ICONS
// ============================================================================

const ICONS = {
  apply: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
    <path d="M12 5v14M5 12l7 7 7-7" style="pointer-events: none;"/>
  </svg>`,
  
  replace: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
    <path d="M17 1l4 4-4 4" style="pointer-events: none;"/>
    <path d="M3 11V9a4 4 0 0 1 4-4h14" style="pointer-events: none;"/>
    <path d="M7 23l-4-4 4-4" style="pointer-events: none;"/>
    <path d="M21 13v2a4 4 0 0 1-4 4H3" style="pointer-events: none;"/>
  </svg>`,
  
  insert: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
    <line x1="12" y1="5" x2="12" y2="19" style="pointer-events: none;"/>
    <line x1="5" y1="12" x2="19" y2="12" style="pointer-events: none;"/>
  </svg>`,
  
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
    <polyline points="20 6 9 17 4 12" style="pointer-events: none;"/>
  </svg>`,
  
  error: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
    <circle cx="12" cy="12" r="10" style="pointer-events: none;"/>
    <line x1="15" y1="9" x2="9" y2="15" style="pointer-events: none;"/>
    <line x1="9" y1="9" x2="15" y2="15" style="pointer-events: none;"/>
  </svg>`,
  
  dropdown: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
    <polyline points="6 9 12 15 18 9" style="pointer-events: none;"/>
  </svg>`
};

// ============================================================================
// STYLES
// ============================================================================

function injectStyles(): void {
  if (document.getElementById('auto-code-apply-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'auto-code-apply-styles';
  style.textContent = `
    /* ============================================ */
    /* APPLY BUTTON                                 */
    /* ============================================ */
    .aca-apply-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      background: linear-gradient(135deg, #238636 0%, #2ea043 100%);
      border: 1px solid #2ea043;
      border-radius: 4px;
      color: #ffffff;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    
    .aca-apply-btn:hover {
      background: linear-gradient(135deg, #2ea043 0%, #3fb950 100%);
      border-color: #3fb950;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(46, 160, 67, 0.3);
    }
    
    .aca-apply-btn:active {
      transform: translateY(0);
    }
    
    .aca-apply-btn.aca-success {
      background: linear-gradient(135deg, #1a7f37 0%, #238636 100%);
      border-color: #238636;
    }
    
    .aca-apply-btn.aca-error {
      background: linear-gradient(135deg, #da3633 0%, #f85149 100%);
      border-color: #f85149;
    }
    
    /* ============================================ */
    /* DROPDOWN BUTTON                              */
    /* ============================================ */
    .aca-dropdown-container {
      position: relative;
      display: inline-flex;
    }
    
    .aca-dropdown-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px 6px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid #2ea043;
      border-left: none;
      border-radius: 0 4px 4px 0;
      color: #ffffff;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    
    .aca-dropdown-toggle:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    .aca-apply-btn.aca-with-dropdown {
      border-radius: 4px 0 0 4px;
    }
    
    /* ============================================ */
    /* DROPDOWN MENU                                */
    /* ============================================ */
    .aca-dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 4px;
      min-width: 180px;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 6px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-8px);
      transition: all 0.15s ease;
    }
    
    .aca-dropdown-menu.aca-open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
    
    .aca-dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      color: #c9d1d9;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.1s;
    }
    
    .aca-dropdown-item:first-child {
      border-radius: 5px 5px 0 0;
    }
    
    .aca-dropdown-item:last-child {
      border-radius: 0 0 5px 5px;
    }
    
    .aca-dropdown-item:hover {
      background: #30363d;
      color: #ffffff;
    }
    
    .aca-dropdown-item svg {
      color: #8b949e;
    }
    
    .aca-dropdown-item:hover svg {
      color: #58a6ff;
    }
    
    .aca-dropdown-divider {
      height: 1px;
      background: #30363d;
      margin: 4px 0;
    }
    
    /* ============================================ */
    /* FILE ANNOTATION BADGE                        */
    /* ============================================ */
    .aca-file-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: rgba(88, 166, 255, 0.15);
      border: 1px solid rgba(88, 166, 255, 0.3);
      border-radius: 4px;
      color: #58a6ff;
      font-size: 10px;
      font-family: monospace;
      margin-left: 8px;
    }
    
    /* ============================================ */
    /* TOAST NOTIFICATION                           */
    /* ============================================ */
    .aca-toast {
      position: fixed;
      bottom: 80px;
      right: 20px;
      padding: 12px 20px;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      color: #c9d1d9;
      font-size: 13px;
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 10px;
      transform: translateX(120%);
      transition: transform 0.3s ease;
    }
    
    .aca-toast.aca-show {
      transform: translateX(0);
    }
    
    .aca-toast.aca-success {
      border-color: #238636;
    }
    
    .aca-toast.aca-success svg {
      color: #3fb950;
    }
    
    .aca-toast.aca-error {
      border-color: #f85149;
    }
    
    .aca-toast.aca-error svg {
      color: #f85149;
    }
  `;
  
  document.head.appendChild(style);
  console.log('✅ [AutoCodeApply] Styles injected');
}

// ============================================================================
// MONACO EDITOR HELPERS
// ============================================================================

function getMonacoEditor(): any {
  const monaco = (window as any).monaco;
  if (!monaco?.editor) return null;
  
  const editors = monaco.editor.getEditors();
  if (!editors || editors.length === 0) return null;
  
  // Get the focused editor or first one
  return editors.find((e: any) => e.hasTextFocus()) || editors[0];
}

function getCurrentFileName(): string | null {
  // Try to get from breadcrumb
  const breadcrumb = document.querySelector('.breadcrumb-item.active, .breadcrumb .current-file');
  if (breadcrumb?.textContent) {
    return breadcrumb.textContent.trim();
  }
  
  // Try to get from tab
  const activeTab = document.querySelector('.tab.active, .editor-tab.active');
  if (activeTab?.textContent) {
    return activeTab.textContent.trim();
  }
  
  // Try to get from Monaco model
  const editor = getMonacoEditor();
  if (editor) {
    const model = editor.getModel();
    if (model) {
      const uri = model.uri.toString();
      return uri.split('/').pop() || null;
    }
  }
  
  return null;
}

// ============================================================================
// CODE EXTRACTION
// ============================================================================

function extractCodeFromBlock(block: HTMLElement): CodeBlockInfo | null {
  // Find code element
  const codeEl = block.querySelector('code') || block.querySelector('.muf-code');
  if (!codeEl) return null;
  
  // Get raw code (try data attribute first, then textContent)
  let code = '';
  const rawCode = block.getAttribute('data-raw-code');
  if (rawCode) {
    try {
      code = decodeURIComponent(rawCode);
    } catch {
      code = codeEl.textContent || '';
    }
  } else {
    code = codeEl.textContent || '';
  }
  
  code = code.trim();
  if (!code) return null;
  
  // Detect language
  let language = 'plaintext';
  const langMatch = codeEl.className.match(/language-(\w+)/);
  if (langMatch) {
    language = langMatch[1];
  } else {
    // Try from header
    const langEl = block.querySelector('.muf-lang-name, .cbe-lang');
    if (langEl) {
      language = langEl.textContent?.toLowerCase() || 'plaintext';
    }
  }
  
  // Detect filename from code comments
  let filename: string | null = null;
  let action: 'replace' | 'insert' | 'create' = 'replace';
  
  // Check first few lines for file annotation
  const lines = code.split('\n').slice(0, 5);
  for (const line of lines) {
    // Pattern: // file: path/to/file.ts
    const fileMatch = line.match(/^(?:\/\/|#|\/\*)\s*file:\s*(.+?)(?:\s*\*\/)?$/i);
    if (fileMatch) {
      filename = fileMatch[1].trim();
      break;
    }
    
    // Pattern: // filename: app.ts
    const filenameMatch = line.match(/^(?:\/\/|#|\/\*)\s*filename:\s*(.+?)(?:\s*\*\/)?$/i);
    if (filenameMatch) {
      filename = filenameMatch[1].trim();
      break;
    }
    
    // Pattern: // path: src/app.ts
    const pathMatch = line.match(/^(?:\/\/|#|\/\*)\s*path:\s*(.+?)(?:\s*\*\/)?$/i);
    if (pathMatch) {
      filename = pathMatch[1].trim();
      break;
    }
  }
  
  // Generate unique ID
  const id = `aca-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  return {
    id,
    element: block,
    code,
    language,
    filename,
    action
  };
}

// ============================================================================
// APPLY CODE TO EDITOR
// ============================================================================

function applyCodeToEditor(code: string, mode: 'replace' | 'insert' | 'append'): ApplyResult {
  const editor = getMonacoEditor();
  
  if (!editor) {
    return {
      success: false,
      message: 'No editor found. Please open a file first.'
    };
  }
  
  const model = editor.getModel();
  if (!model) {
    return {
      success: false,
      message: 'No file open in editor.'
    };
  }
  
  try {
    const monaco = (window as any).monaco;
    
    if (mode === 'replace') {
      // Replace entire content
      const fullRange = model.getFullModelRange();
      editor.executeEdits('auto-code-apply', [{
        range: fullRange,
        text: code,
        forceMoveMarkers: true
      }]);
      
      return {
        success: true,
        message: `Replaced entire file content`,
        linesChanged: code.split('\n').length
      };
      
    } else if (mode === 'insert') {
      // Insert at cursor position
      const position = editor.getPosition();
      if (!position) {
        return {
          success: false,
          message: 'Could not determine cursor position.'
        };
      }
      
      editor.executeEdits('auto-code-apply', [{
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        text: code,
        forceMoveMarkers: true
      }]);
      
      return {
        success: true,
        message: `Inserted at line ${position.lineNumber}`,
        linesChanged: code.split('\n').length
      };
      
    } else if (mode === 'append') {
      // Append at end of file
      const lastLine = model.getLineCount();
      const lastColumn = model.getLineMaxColumn(lastLine);
      
      editor.executeEdits('auto-code-apply', [{
        range: new monaco.Range(lastLine, lastColumn, lastLine, lastColumn),
        text: '\n\n' + code,
        forceMoveMarkers: true
      }]);
      
      return {
        success: true,
        message: `Appended at end of file`,
        linesChanged: code.split('\n').length
      };
    }
    
    return {
      success: false,
      message: 'Unknown mode'
    };
    
  } catch (error) {
    console.error('[AutoCodeApply] Error applying code:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ============================================================================
// TOAST NOTIFICATION
// ============================================================================

function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  // Remove existing toast
  const existing = document.querySelector('.aca-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `aca-toast aca-${type}`;
  toast.innerHTML = `
    ${type === 'success' ? ICONS.check : ICONS.error}
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('aca-show');
  });
  
  // Auto-remove
  setTimeout(() => {
    toast.classList.remove('aca-show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================================================
// ADD APPLY BUTTON TO CODE BLOCK
// ============================================================================

function addApplyButton(block: HTMLElement): void {
  // Skip if already has button
  if (block.querySelector('.aca-apply-btn')) return;
  
  // Extract code info
  const codeInfo = extractCodeFromBlock(block);
  if (!codeInfo) return;
  
  // Find header actions area
  const headerActions = block.querySelector('.muf-header-actions, .cbe-btns');
  if (!headerActions) return;
  
  // Create dropdown container
  const container = document.createElement('div');
  container.className = 'aca-dropdown-container';
  
  // Create main apply button
  const applyBtn = document.createElement('button');
  applyBtn.className = 'aca-apply-btn aca-with-dropdown';
  applyBtn.innerHTML = `${ICONS.apply}<span>Apply</span>`;
  applyBtn.title = 'Apply code to editor (Replace All)';
  
  // Create dropdown toggle
  const dropdownToggle = document.createElement('button');
  dropdownToggle.className = 'aca-dropdown-toggle';
  dropdownToggle.innerHTML = ICONS.dropdown;
  dropdownToggle.title = 'More apply options';
  
  // Create dropdown menu
  const dropdownMenu = document.createElement('div');
  dropdownMenu.className = 'aca-dropdown-menu';
  dropdownMenu.innerHTML = `
    <div class="aca-dropdown-item" data-action="replace">
      ${ICONS.replace}
      <span>Replace All</span>
    </div>
    <div class="aca-dropdown-item" data-action="insert">
      ${ICONS.insert}
      <span>Insert at Cursor</span>
    </div>
    <div class="aca-dropdown-item" data-action="append">
      ${ICONS.apply}
      <span>Append to End</span>
    </div>
  `;
  
  // Main button click - Replace All
  applyBtn.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    const result = applyCodeToEditor(codeInfo.code, 'replace');
    
    if (result.success) {
      applyBtn.classList.add('aca-success');
      applyBtn.innerHTML = `${ICONS.check}<span>Applied!</span>`;
      showToast(`✓ ${result.message}`, 'success');
      
      setTimeout(() => {
        applyBtn.classList.remove('aca-success');
        applyBtn.innerHTML = `${ICONS.apply}<span>Apply</span>`;
      }, 2000);
    } else {
      applyBtn.classList.add('aca-error');
      showToast(`✗ ${result.message}`, 'error');
      
      setTimeout(() => {
        applyBtn.classList.remove('aca-error');
      }, 2000);
    }
  };
  
  // Dropdown toggle click
  dropdownToggle.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    dropdownMenu.classList.toggle('aca-open');
  };
  
  // Dropdown item clicks
  dropdownMenu.querySelectorAll('.aca-dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      const action = (item as HTMLElement).dataset.action as 'replace' | 'insert' | 'append';
      dropdownMenu.classList.remove('aca-open');
      
      const result = applyCodeToEditor(codeInfo.code, action);
      
      if (result.success) {
        showToast(`✓ ${result.message}`, 'success');
      } else {
        showToast(`✗ ${result.message}`, 'error');
      }
    });
  });
  
  // Close dropdown on outside click
  document.addEventListener('click', () => {
    dropdownMenu.classList.remove('aca-open');
  });
  
  // Assemble
  container.appendChild(applyBtn);
  container.appendChild(dropdownToggle);
  container.appendChild(dropdownMenu);
  
  // Add file badge if filename detected
  if (codeInfo.filename) {
    const badge = document.createElement('span');
    badge.className = 'aca-file-badge';
    badge.textContent = codeInfo.filename;
    container.appendChild(badge);
  }
  
  // Insert at beginning of header actions
  headerActions.insertBefore(container, headerActions.firstChild);
  
  console.log(`✅ [AutoCodeApply] Added Apply button to code block`);
}

// ============================================================================
// PROCESS ALL CODE BLOCKS
// ============================================================================

function processCodeBlocks(): void {
  // Find all enhanced code blocks
  const blocks = document.querySelectorAll('.muf-block, .cbe-wrapper');
  
  let added = 0;
  blocks.forEach(block => {
    if (!block.querySelector('.aca-apply-btn')) {
      addApplyButton(block as HTMLElement);
      added++;
    }
  });
  
  if (added > 0) {
    console.log(`✅ [AutoCodeApply] Added Apply buttons to ${added} code blocks`);
  }
}

// ============================================================================
// OBSERVER
// ============================================================================

let observer: MutationObserver | null = null;

function setupObserver(): void {
  if (observer) {
    observer.disconnect();
  }
  
  observer = new MutationObserver((mutations) => {
    let shouldProcess = false;
    
    for (const mutation of mutations) {
      // Check if new code blocks were added
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) {
          if (node.classList?.contains('muf-block') || 
              node.classList?.contains('cbe-wrapper') ||
              node.querySelector?.('.muf-block, .cbe-wrapper')) {
            shouldProcess = true;
          }
        }
      });
    }
    
    if (shouldProcess) {
      // Debounce
      setTimeout(processCodeBlocks, 100);
    }
  });
  
  // Watch chat container
  const chatContainer = document.querySelector('#chat-messages, .chat-messages, #chat-container');
  if (chatContainer) {
    observer.observe(chatContainer, { childList: true, subtree: true });
    console.log('✅ [AutoCodeApply] Observer active');
  } else {
    // Fallback to body
    observer.observe(document.body, { childList: true, subtree: true });
    console.log('⚠️ [AutoCodeApply] Observer active (body fallback)');
  }
}

// ============================================================================
// KEYBOARD SHORTCUT
// ============================================================================

function setupKeyboardShortcut(): void {
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+A - Apply most recent code block
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      
      // Find most recent code block
      const blocks = document.querySelectorAll('.muf-block, .cbe-wrapper');
      const lastBlock = blocks[blocks.length - 1];
      
      if (lastBlock) {
        const codeInfo = extractCodeFromBlock(lastBlock as HTMLElement);
        if (codeInfo) {
          const result = applyCodeToEditor(codeInfo.code, 'replace');
          if (result.success) {
            showToast(`✓ Applied latest code block`, 'success');
          } else {
            showToast(`✗ ${result.message}`, 'error');
          }
        }
      } else {
        showToast('No code blocks found', 'error');
      }
    }
  });
  
  console.log('✅ [AutoCodeApply] Keyboard shortcut: Ctrl+Shift+A');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initAutoCodeApply(): void {
  console.log('🚀 [AutoCodeApply] Initializing Basic Version...');
  
  // Inject styles
  injectStyles();
  
  // Process existing code blocks
  setTimeout(processCodeBlocks, 500);
  setTimeout(processCodeBlocks, 1000);
  setTimeout(processCodeBlocks, 2000);
  
  // Setup observer for new code blocks
  setupObserver();
  
  // Setup keyboard shortcut
  setupKeyboardShortcut();
  
  // Periodic check
  setInterval(processCodeBlocks, 3000);
  
  console.log('✅ [AutoCodeApply] Ready!');
  console.log('   💡 Click "Apply" on any code block to apply to editor');
  console.log('   💡 Use Ctrl+Shift+A to apply most recent code block');
}

// ============================================================================
// EXPORTS
// ============================================================================

// Expose globally for debugging
if (typeof window !== 'undefined') {
  (window as any).initAutoCodeApply = initAutoCodeApply;
  (window as any).applyCodeToEditor = applyCodeToEditor;
  (window as any).processCodeBlocks = processCodeBlocks;
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initAutoCodeApply());
} else {
  setTimeout(initAutoCodeApply, 100);
}

export { applyCodeToEditor, processCodeBlocks, extractCodeFromBlock };
