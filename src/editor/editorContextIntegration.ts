// editorContextIntegration.ts
// ============================================================================
// Integrates Monaco Editor content with AI Chat
// Allows users to share current file context with Claude
// ============================================================================

console.log('📎 [EditorContext] Loading editor context integration...');

// ============================================================================
// TYPES
// ============================================================================

interface EditorContext {
  fileName: string;
  filePath: string;
  content: string;
  language: string;
  lineCount: number;
  selectedText?: string;
  cursorLine?: number;
}

// ============================================================================
// STATE
// ============================================================================

let contextButtonInjected = false;
let lastSharedContext: EditorContext | null = null;

// ============================================================================
// EDITOR ACCESS
// ============================================================================

function getMonacoEditor(): any {
  // Try multiple ways to get Monaco editor
  const win = window as any;
  
  // Method 1: Direct window reference
  if (win.monacoEditorInstance) {
    return win.monacoEditorInstance;
  }
  
  // Method 2: Monaco global
  if (win.monaco?.editor) {
    const editors = win.monaco.editor.getEditors();
    if (editors && editors.length > 0) {
      return editors[0];
    }
  }
  
  // Method 3: Editor manager
  if (win.editorManager?.getActiveEditor) {
    return win.editorManager.getActiveEditor();
  }
  
  // Method 4: Tab manager
  if (win.tabManager?.getActiveEditor) {
    return win.tabManager.getActiveEditor();
  }
  
  return null;
}

function getEditorContext(): EditorContext | null {
  const editor = getMonacoEditor();
  if (!editor) {
    console.log('📎 [EditorContext] No editor found');
    return null;
  }
  
  const model = editor.getModel();
  if (!model) {
    console.log('📎 [EditorContext] No model in editor');
    return null;
  }
  
  const uri = model.uri?.toString() || '';
  const filePath = model.uri?.path || uri;
  const fileName = filePath.split('/').pop()?.split('\\').pop() || 'untitled';
  const content = model.getValue() || '';
  const lineCount = model.getLineCount() || content.split('\n').length;
  
  // Get language
  let language = 'plaintext';
  const langId = model.getLanguageId?.() || model.getModeId?.();
  if (langId) {
    language = langId;
  } else {
    // Detect from extension
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const extMap: Record<string, string> = {
      'ts': 'typescript', 'tsx': 'typescriptreact',
      'js': 'javascript', 'jsx': 'javascriptreact',
      'py': 'python', 'rs': 'rust', 'go': 'go',
      'css': 'css', 'scss': 'scss', 'html': 'html',
      'json': 'json', 'md': 'markdown'
    };
    language = extMap[ext] || 'plaintext';
  }
  
  // Get selection if any
  const selection = editor.getSelection();
  let selectedText: string | undefined;
  let cursorLine: number | undefined;
  
  if (selection && !selection.isEmpty()) {
    selectedText = model.getValueInRange(selection);
  }
  
  const position = editor.getPosition();
  if (position) {
    cursorLine = position.lineNumber;
  }
  
  return {
    fileName,
    filePath,
    content,
    language,
    lineCount,
    selectedText,
    cursorLine
  };
}

// ============================================================================
// CONTEXT FORMATTING
// ============================================================================

function formatContextForChat(context: EditorContext, options: { 
  includeFullFile?: boolean;
  focusLine?: number;
  linesAround?: number;
} = {}): string {
  const { includeFullFile = true, focusLine, linesAround = 10 } = options;
  
  let codeSection = '';
  
  if (context.selectedText) {
    // User has selected specific text
    codeSection = context.selectedText;
  } else if (focusLine && !includeFullFile) {
    // Focus on specific lines
    const lines = context.content.split('\n');
    const start = Math.max(0, focusLine - linesAround - 1);
    const end = Math.min(lines.length, focusLine + linesAround);
    const relevantLines = lines.slice(start, end);
    
    // Add line numbers
    codeSection = relevantLines.map((line, i) => {
      const lineNum = start + i + 1;
      const marker = lineNum === focusLine ? '>>> ' : '    ';
      return `${marker}${lineNum}: ${line}`;
    }).join('\n');
  } else {
    // Include full file
    codeSection = context.content;
  }
  
  // Format the context message
  const contextMessage = `
📎 **Current File: \`${context.fileName}\`**
- Path: \`${context.filePath}\`
- Language: ${context.language}
- Lines: ${context.lineCount}
${context.cursorLine ? `- Cursor at line: ${context.cursorLine}` : ''}
${context.selectedText ? '- (Selected text included)' : ''}

\`\`\`${context.language}
${codeSection}
\`\`\`
`.trim();

  return contextMessage;
}

// ============================================================================
// CHAT INPUT INTEGRATION
// ============================================================================

function getChatInput(): HTMLTextAreaElement | HTMLInputElement | null {
  // Try multiple selectors for the chat input
  const selectors = [
    'textarea[placeholder*="message"]',
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="Ask"]',
    '.chat-input textarea',
    '.message-input textarea',
    '#chat-input',
    '.ai-chat-container textarea',
    'textarea.chat-textarea',
    '[contenteditable="true"]'
  ];
  
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el as HTMLTextAreaElement;
  }
  
  return null;
}

function injectContextIntoChat(context: EditorContext): void {
  const input = getChatInput();
  if (!input) {
    console.error('📎 [EditorContext] Could not find chat input');
    showToast('Could not find chat input', 'error');
    return;
  }
  
  const contextMessage = formatContextForChat(context);
  const currentValue = input.value || '';
  
  // Prepend context to current message
  if (currentValue.trim()) {
    input.value = contextMessage + '\n\n---\n\n' + currentValue;
  } else {
    input.value = contextMessage + '\n\n';
  }
  
  // Trigger input event to update any reactive state
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
  
  // Move cursor to end
  const len = input.value.length;
  input.setSelectionRange(len, len);
  
  lastSharedContext = context;
  showToast(`📎 Shared: ${context.fileName} (${context.lineCount} lines)`, 'success');
  console.log(`📎 [EditorContext] Injected context for ${context.fileName}`);
}

// ============================================================================
// AUTO-CONTEXT DETECTION
// ============================================================================

// Patterns that suggest user is asking about code in editor
const CODE_REFERENCE_PATTERNS = [
  /\bline\s*(\d+)/i,                    // "line 5", "line 42"
  /\blines?\s*(\d+)\s*(-|to|through)\s*(\d+)/i, // "lines 5-10"
  /\bthis\s+(code|file|function|class)/i,  // "this code", "this file"
  /\b(the|my)\s+(code|file|function)/i,    // "the code", "my function"
  /\bwhat('s| is| does)\s+(line|this)/i,   // "what's line 5"
  /\bexplain\s+(line|this|the)/i,          // "explain line 5"
  /\bfix\s+(line|this|the)/i,              // "fix line 5"
  /\b(current|open)\s+(file|code)/i,       // "current file"
  /\bcursor/i,                              // "at cursor"
  /\bselect(ed|ion)/i,                      // "selected code"
];

function detectCodeReference(message: string): { hasReference: boolean; lineNumber?: number } {
  for (const pattern of CODE_REFERENCE_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      // Try to extract line number
      const lineMatch = message.match(/\bline\s*(\d+)/i);
      return {
        hasReference: true,
        lineNumber: lineMatch ? parseInt(lineMatch[1], 10) : undefined
      };
    }
  }
  return { hasReference: false };
}

// ============================================================================
// UI COMPONENTS
// ============================================================================

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  // Remove existing toast
  document.querySelectorAll('.editor-context-toast').forEach(t => t.remove());
  
  const toast = document.createElement('div');
  toast.className = `editor-context-toast ec-toast-${type}`;
  toast.textContent = message;
  
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '80px',
    right: '20px',
    padding: '10px 16px',
    background: type === 'success' ? '#238636' : type === 'error' ? '#da3633' : '#1f6feb',
    color: 'white',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    zIndex: '10000',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    animation: 'ecToastIn 0.3s ease'
  });
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'ecToastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function injectShareCodeButton(): void {
  if (contextButtonInjected) return;
  
  // Find chat input container
  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) {
    console.log('📎 [EditorContext] Chat container not found, will retry');
    return;
  }
  
  // Look for the input area
  const inputArea = chatContainer.querySelector('.chat-input-container, .input-area, .message-input-wrapper') ||
                    chatContainer.querySelector('textarea')?.parentElement;
  
  if (!inputArea) {
    // Silent fail — retried by observer/interval, no need to spam console
    return;
  }
  
  // Check if button already exists
  if (document.querySelector('.ec-share-btn')) {
    contextButtonInjected = true;
    return;
  }
  
  // Create share button
  const btn = document.createElement('button');
  btn.className = 'ec-share-btn';
  btn.title = 'Share current file with AI (Ctrl+Shift+S)';
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/>
      <line x1="9" y1="15" x2="15" y2="15"/>
    </svg>
  `;
  
  Object.assign(btn.style, {
    position: 'absolute',
    right: '50px',
    bottom: '10px',
    width: '32px',
    height: '32px',
    background: '#21262d',
    border: '1px solid #30363d',
    borderRadius: '6px',
    color: '#8b949e',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    zIndex: '100'
  });
  
  btn.addEventListener('mouseenter', () => {
    btn.style.background = '#30363d';
    btn.style.color = '#58a6ff';
    btn.style.borderColor = '#58a6ff';
  });
  
  btn.addEventListener('mouseleave', () => {
    btn.style.background = '#21262d';
    btn.style.color = '#8b949e';
    btn.style.borderColor = '#30363d';
  });
  
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    shareCurrentFileWithChat();
  });
  
  // Make input area relative if needed
  const inputAreaEl = inputArea as HTMLElement;
  if (getComputedStyle(inputAreaEl).position === 'static') {
    inputAreaEl.style.position = 'relative';
  }
  
  inputArea.appendChild(btn);
  contextButtonInjected = true;
  console.log('📎 [EditorContext] Share button injected');
}

function injectStyles(): void {
  if (document.querySelector('#ec-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ec-styles';
  style.textContent = `
    @keyframes ecToastIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes ecToastOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(20px); }
    }
    
    .ec-share-btn:active {
      transform: scale(0.95);
    }
    
    .ec-context-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: #1f6feb;
      color: white;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }
    
    .ec-context-indicator {
      position: fixed;
      bottom: 120px;
      right: 20px;
      padding: 8px 12px;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #8b949e;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    
    .ec-context-indicator .file-icon {
      color: #58a6ff;
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

function shareCurrentFileWithChat(): void {
  const context = getEditorContext();
  if (!context) {
    showToast('No file open in editor', 'error');
    return;
  }
  
  if (!context.content.trim()) {
    showToast('File is empty', 'error');
    return;
  }
  
  injectContextIntoChat(context);
}

function shareSelectionWithChat(): void {
  const context = getEditorContext();
  if (!context) {
    showToast('No file open in editor', 'error');
    return;
  }
  
  if (!context.selectedText) {
    showToast('No text selected', 'error');
    return;
  }
  
  // Create modified context with only selection
  const selectionContext: EditorContext = {
    ...context,
    content: context.selectedText,
    lineCount: context.selectedText.split('\n').length
  };
  
  injectContextIntoChat(selectionContext);
}

function shareLinesWithChat(startLine: number, endLine?: number): void {
  const context = getEditorContext();
  if (!context) {
    showToast('No file open in editor', 'error');
    return;
  }
  
  const lines = context.content.split('\n');
  const start = Math.max(0, startLine - 1);
  const end = endLine ? Math.min(lines.length, endLine) : start + 1;
  
  const selectedLines = lines.slice(start, end);
  
  // Format with line numbers
  const numberedCode = selectedLines.map((line, i) => {
    return `${start + i + 1}: ${line}`;
  }).join('\n');
  
  const lineContext: EditorContext = {
    ...context,
    content: numberedCode,
    lineCount: selectedLines.length
  };
  
  injectContextIntoChat(lineContext);
}

// ============================================================================
// MESSAGE INTERCEPTION (Auto-context)
// ============================================================================

function setupMessageInterception(): void {
  // Watch for form submissions
  document.addEventListener('submit', (e) => {
    const form = e.target as HTMLFormElement;
    if (!form.closest('.ai-chat-container')) return;
    
    const input = form.querySelector('textarea, input[type="text"]') as HTMLInputElement;
    if (!input) return;
    
    const message = input.value;
    const { hasReference, lineNumber } = detectCodeReference(message);
    
    if (hasReference && !lastSharedContext) {
      // User referenced code but hasn't shared context
      const context = getEditorContext();
      if (context) {
        // Auto-inject context
        console.log('📎 [EditorContext] Auto-injecting context based on code reference');
        
        if (lineNumber) {
          // Focus on specific line
          const contextMsg = formatContextForChat(context, {
            includeFullFile: false,
            focusLine: lineNumber,
            linesAround: 5
          });
          input.value = contextMsg + '\n\n---\n\n' + message;
        } else {
          // Include full file
          const contextMsg = formatContextForChat(context);
          input.value = contextMsg + '\n\n---\n\n' + message;
        }
        
        input.dispatchEvent(new Event('input', { bubbles: true }));
        showToast(`📎 Auto-shared: ${context.fileName}`, 'info');
      }
    }
  }, true);
  
  // Also watch for Enter key
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    
    const input = e.target as HTMLElement;
    if (!input.closest('.ai-chat-container')) return;
    if (input.tagName !== 'TEXTAREA' && input.tagName !== 'INPUT') return;
    
    const textarea = input as HTMLTextAreaElement;
    const message = textarea.value;
    const { hasReference, lineNumber } = detectCodeReference(message);
    
    if (hasReference && !message.includes('```') && !message.includes('📎')) {
      // User referenced code but hasn't shared context and we haven't added it
      e.preventDefault();
      e.stopPropagation();
      
      const context = getEditorContext();
      if (context) {
        console.log('📎 [EditorContext] Auto-injecting context on Enter');
        
        let contextMsg: string;
        if (lineNumber) {
          contextMsg = formatContextForChat(context, {
            includeFullFile: false,
            focusLine: lineNumber,
            linesAround: 5
          });
        } else {
          contextMsg = formatContextForChat(context);
        }
        
        textarea.value = contextMsg + '\n\n' + message;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        
        showToast(`📎 Added context: ${context.fileName}`, 'info');
        
        // Re-trigger submit after small delay
        setTimeout(() => {
          const form = textarea.closest('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { bubbles: true }));
          } else {
            // Try pressing enter again
            textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          }
        }, 100);
      }
    }
  }, true);
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+S: Share current file
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      shareCurrentFileWithChat();
    }
    
    // Ctrl+Shift+E: Share selection
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      shareSelectionWithChat();
    }
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initializeEditorContextIntegration(): void {
  console.log('📎 [EditorContext] Initializing...');
  
  injectStyles();
  setupKeyboardShortcuts();
  setupMessageInterception();
  
  // Try to inject button immediately and on intervals
  injectShareCodeButton();
  
  // Retry button injection (with auto-stop)
  const retryInterval = setInterval(() => {
    if (!contextButtonInjected) {
      injectShareCodeButton();
    } else {
      clearInterval(retryInterval);
    }
  }, 2000); // Slowed from 1s to 2s
  
  // Stop retrying after 30 seconds
  setTimeout(() => clearInterval(retryInterval), 30000);
  
  // Watch for chat container appearing (debounced, auto-disconnect)
  let observerDebounce: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver(() => {
    if (contextButtonInjected) {
      observer.disconnect(); // ✅ Stop observing once done
      return;
    }
    // Debounce: only check once per 500ms of DOM changes
    if (observerDebounce) return;
    observerDebounce = setTimeout(() => {
      observerDebounce = null;
      if (!contextButtonInjected) {
        injectShareCodeButton();
      }
    }, 500);
  });
  
  // Scope observer to chat panel if possible, fallback to body
  const observeTarget = document.querySelector('.ai-chat-panel') || 
                        document.querySelector('.ai-chat-container') || 
                        document.body;
  observer.observe(observeTarget, { childList: true, subtree: true });
  
  // Disconnect observer after 30 seconds regardless
  setTimeout(() => {
    observer.disconnect();
    if (observerDebounce) clearTimeout(observerDebounce);
  }, 30000);
  
  // Expose global functions
  (window as any).shareCodeWithChat = shareCurrentFileWithChat;
  (window as any).shareSelectionWithChat = shareSelectionWithChat;
  (window as any).shareLinesWithChat = shareLinesWithChat;
  (window as any).getEditorContext = getEditorContext;
  
  console.log('📎 [EditorContext] Ready!');
  console.log('📎 Shortcuts: Ctrl+Shift+S (share file), Ctrl+Shift+E (share selection)');
}

// Auto-initialize
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeEditorContextIntegration());
  } else {
    setTimeout(initializeEditorContextIntegration, 500);
  }
}

export { 
  shareCurrentFileWithChat, 
  shareSelectionWithChat, 
  shareLinesWithChat,
  getEditorContext 
};
