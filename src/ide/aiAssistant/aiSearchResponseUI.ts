// aiSearchResponseUI.ts
// Enhanced UI for AI Search Responses
// Makes AI responses more readable and user-friendly

export function injectAISearchResponseStyles(): void {
  if (document.getElementById('ai-search-response-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ai-search-response-styles';
  style.textContent = `
    /* ========================================
       AI SEARCH CONTEXT BADGE
       Shows which files were searched
    ======================================== */
    
    .ai-search-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      margin-bottom: 12px;
      background: linear-gradient(90deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.05));
      border: 1px solid rgba(76, 175, 80, 0.3);
      border-radius: 6px;
      font-size: 12px;
      color: #81c784;
    }
    
    .ai-search-badge::before {
      content: '✨';
      font-size: 14px;
    }
    
    .ai-search-badge .file-count {
      background: rgba(76, 175, 80, 0.2);
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 600;
    }
    
    /* ========================================
       ENHANCED MESSAGE CONTAINER
    ======================================== */
    
    .message-content-wrapper {
      background: linear-gradient(135deg, #1a1d23 0%, #1e2228 100%);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 16px;
      margin: 8px 0;
    }
    
    /* ========================================
       STYLED HEADERS
    ======================================== */
    
    .message-content h1,
    .message-content h2,
    .message-content h3,
    .ai-message h1,
    .ai-message h2,
    .ai-message h3 {
      color: #4fc3f7 !important;
      font-weight: 600 !important;
      margin: 20px 0 12px 0 !important;
      padding-bottom: 8px !important;
      border-bottom: 1px solid rgba(79, 195, 247, 0.2) !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    }
    
    .message-content h2::before,
    .ai-message h2::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 18px;
      background: #4fc3f7;
      border-radius: 2px;
    }
    
    /* ========================================
       CODE BLOCKS WITH HEADER & COPY
    ======================================== */
    
    .message-content pre,
    .ai-message pre {
      position: relative;
      background: #0d1117 !important;
      border: 1px solid #30363d !important;
      border-radius: 8px !important;
      margin: 14px 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
    
    /* Language label bar */
    .code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: linear-gradient(90deg, #21262d, #161b22);
      border-bottom: 1px solid #30363d;
    }
    
    .code-header .lang-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }
    
    .code-header .lang-label::before {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4fc3f7;
    }
    
    .code-header .copy-btn {
      background: rgba(110, 118, 129, 0.3);
      border: none;
      border-radius: 4px;
      padding: 4px 10px;
      color: #8b949e;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .code-header .copy-btn:hover {
      background: rgba(110, 118, 129, 0.5);
      color: #fff;
    }
    
    .code-header .copy-btn.copied {
      background: rgba(76, 175, 80, 0.3);
      color: #4caf50;
    }
    
    .message-content pre code,
    .ai-message pre code {
      display: block !important;
      padding: 14px 16px !important;
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace !important;
      font-size: 13px !important;
      line-height: 1.5 !important;
      color: #e6edf3 !important;
      overflow-x: auto !important;
    }
    
    /* ========================================
       INLINE CODE
    ======================================== */
    
    .message-content code:not(pre code),
    .ai-message code:not(pre code) {
      background: rgba(110, 118, 129, 0.25) !important;
      color: #79c0ff !important;
      padding: 2px 6px !important;
      border-radius: 4px !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 0.9em !important;
    }
    
    /* ========================================
       LISTS
    ======================================== */
    
    .message-content ul,
    .message-content ol,
    .ai-message ul,
    .ai-message ol {
      margin: 12px 0 !important;
      padding-left: 24px !important;
    }
    
    .message-content li,
    .ai-message li {
      margin: 8px 0 !important;
      line-height: 1.6 !important;
      color: #c9d1d9 !important;
    }
    
    .message-content li::marker,
    .ai-message li::marker {
      color: #4fc3f7 !important;
    }
    
    /* ========================================
       BLOCKQUOTES
    ======================================== */
    
    .message-content blockquote,
    .ai-message blockquote {
      border-left: 3px solid #4fc3f7 !important;
      background: rgba(79, 195, 247, 0.05) !important;
      margin: 12px 0 !important;
      padding: 10px 16px !important;
      border-radius: 0 8px 8px 0 !important;
      color: #8b949e !important;
    }
    
    /* ========================================
       MESSAGE FOOTER ACTIONS
    ======================================== */
    
    .message-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 12px;
      margin-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    
    .message-meta {
      font-size: 11px;
      color: #6e7681;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .message-meta .provider-badge {
      background: rgba(79, 195, 247, 0.1);
      padding: 2px 8px;
      border-radius: 4px;
      color: #4fc3f7;
    }
    
    .message-actions-bar {
      display: flex;
      gap: 4px;
    }
    
    .action-btn {
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 4px 8px;
      color: #6e7681;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }
    
    .action-btn:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
      color: #8b949e;
    }
    
    .action-btn:active {
      transform: scale(0.95);
    }
    
    /* ========================================
       EXPAND/COLLAPSE FOR LONG RESPONSES
    ======================================== */
    
    .response-expandable {
      max-height: 500px;
      overflow: hidden;
      position: relative;
      transition: max-height 0.3s ease;
    }
    
    .response-expandable.collapsed::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 80px;
      background: linear-gradient(transparent, #1a1d23);
      pointer-events: none;
    }
    
    .response-expandable.expanded {
      max-height: none;
    }
    
    .expand-btn {
      display: block;
      width: 100%;
      padding: 8px;
      margin-top: 8px;
      background: rgba(79, 195, 247, 0.1);
      border: 1px solid rgba(79, 195, 247, 0.2);
      border-radius: 6px;
      color: #4fc3f7;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }
    
    .expand-btn:hover {
      background: rgba(79, 195, 247, 0.15);
    }
    
    /* ========================================
       TABLES
    ======================================== */
    
    .message-content table,
    .ai-message table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 14px 0 !important;
      font-size: 13px !important;
    }
    
    .message-content th,
    .ai-message th {
      background: rgba(79, 195, 247, 0.1) !important;
      color: #4fc3f7 !important;
      padding: 10px 12px !important;
      text-align: left !important;
      font-weight: 600 !important;
      border-bottom: 2px solid rgba(79, 195, 247, 0.3) !important;
    }
    
    .message-content td,
    .ai-message td {
      padding: 10px 12px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
      color: #c9d1d9 !important;
    }
    
    .message-content tr:hover td,
    .ai-message tr:hover td {
      background: rgba(79, 195, 247, 0.03) !important;
    }
    
    /* ========================================
       STRONG & EMPHASIS
    ======================================== */
    
    .message-content strong,
    .ai-message strong {
      color: #fff !important;
      font-weight: 600 !important;
    }
    
    /* ========================================
       HORIZONTAL RULE
    ======================================== */
    
    .message-content hr,
    .ai-message hr {
      border: none !important;
      height: 1px !important;
      background: linear-gradient(90deg, transparent, rgba(79, 195, 247, 0.3), transparent) !important;
      margin: 20px 0 !important;
    }
  `;
  
  document.head.appendChild(style);
  console.log('✅ AI Search Response styles injected');
}

// ============================================================================
// ENHANCE CODE BLOCKS
// ============================================================================

export function enhanceCodeBlocks(): void {
  // Find all code blocks in messages
  const codeBlocks = document.querySelectorAll('.message-content pre, .ai-message pre');
  
  codeBlocks.forEach((pre, index) => {
    // Skip if already enhanced
    if (pre.querySelector('.code-header')) return;
    
    const code = pre.querySelector('code');
    if (!code) return;
    
    // Detect language from class or content
    let language = 'code';
    const classMatch = code.className.match(/language-(\w+)/);
    if (classMatch) {
      language = classMatch[1];
    } else {
      // Try to detect from content
      const content = code.textContent || '';
      if (content.includes('function') || content.includes('const ')) language = 'javascript';
      else if (content.includes('.theme-') || content.includes('{') && content.includes(':')) language = 'css';
      else if (content.includes('import ') && content.includes('from')) language = 'typescript';
      else if (content.includes('<') && content.includes('>')) language = 'html';
    }
    
    // Create header
    const header = document.createElement('div');
    header.className = 'code-header';
    header.innerHTML = `
      <span class="lang-label">${language}</span>
      <button class="copy-btn" data-index="${index}">Copy</button>
    `;
    
    // Insert header
    pre.insertBefore(header, pre.firstChild);
    
    // Add copy functionality
    const copyBtn = header.querySelector('.copy-btn');
    copyBtn?.addEventListener('click', () => {
      const text = code.textContent || '';
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = '✓ Copied';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
          copyBtn.classList.remove('copied');
        }, 2000);
      });
    });
  });
}

// ============================================================================
// ADD AI SEARCH BADGE
// ============================================================================

export function addAISearchBadge(messageElement: HTMLElement, filesCount: number): void {
  // Check if badge already exists
  if (messageElement.querySelector('.ai-search-badge')) return;
  
  const badge = document.createElement('div');
  badge.className = 'ai-search-badge';
  badge.innerHTML = `
    <span>AI Search active</span>
    <span class="file-count">${filesCount} files</span>
  `;
  
  // Insert at the top of the message
  messageElement.insertBefore(badge, messageElement.firstChild);
}

// ============================================================================
// ADD MESSAGE FOOTER
// ============================================================================

export function addMessageFooter(messageElement: HTMLElement, provider: string = 'AI'): void {
  // Check if footer already exists
  if (messageElement.querySelector('.message-footer')) return;
  
  const footer = document.createElement('div');
  footer.className = 'message-footer';
  
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  footer.innerHTML = `
    <div class="message-meta">
      <span>${time}</span>
      <span class="provider-badge">${provider}</span>
    </div>
    <div class="message-actions-bar">
      <button class="action-btn" title="Copy response">📋</button>
      <button class="action-btn" title="Good response">👍</button>
      <button class="action-btn" title="Bad response">👎</button>
    </div>
  `;
  
  messageElement.appendChild(footer);
  
  // Add copy functionality
  const copyBtn = footer.querySelector('.action-btn[title="Copy response"]');
  copyBtn?.addEventListener('click', () => {
    const content = messageElement.querySelector('.message-content, .ai-message-content');
    if (content) {
      navigator.clipboard.writeText(content.textContent || '');
      (copyBtn as HTMLElement).textContent = '✓';
      setTimeout(() => {
        (copyBtn as HTMLElement).textContent = '📋';
      }, 2000);
    }
  });
}

// ============================================================================
// AUTO-ENHANCE NEW MESSAGES
// ============================================================================

export function setupMessageObserver(): void {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          // Check if it's a message
          if (node.classList.contains('message') || 
              node.classList.contains('ai-message') ||
              node.querySelector('.message-content')) {
            setTimeout(() => {
              enhanceCodeBlocks();
            }, 100);
          }
        }
      });
    });
  });
  
  // Observe the messages container
  const container = document.querySelector('.messages-container, .chat-messages, .conversation-messages');
  if (container) {
    observer.observe(container, { childList: true, subtree: true });
    console.log('✅ Message observer setup');
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initAISearchResponseUI(): void {
  injectAISearchResponseStyles();
  
  // Enhance existing code blocks
  setTimeout(enhanceCodeBlocks, 500);
  
  // Setup observer for new messages
  setupMessageObserver();
  
  // Re-enhance on window events
  window.addEventListener('message-rendered', () => {
    setTimeout(enhanceCodeBlocks, 100);
  });
  
  console.log('✅ AI Search Response UI initialized');
}

// Auto-initialize
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAISearchResponseUI);
  } else {
    setTimeout(initAISearchResponseUI, 100);
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  (window as any).enhanceCodeBlocks = enhanceCodeBlocks;
  (window as any).addAISearchBadge = addAISearchBadge;
  (window as any).addMessageFooter = addMessageFooter;
}
