// conversationMarkdownProcessor.ts
// ============================================================================
// AGGRESSIVE FIX v3.0: IDE-Style Markdown Processing
// Ensures messages display correctly after IDE reset
// 
// USAGE: Import in main.ts (EARLY - near top):
//   import './ide/aiAssistant/conversationMarkdownProcessor';
// ============================================================================

console.log('🎨 [MarkdownFix] Loading v3.0 (Aggressive)...');

// ============================================================================
// INJECT IDE STYLES IMMEDIATELY
// ============================================================================

const injectIDEStyles = (): void => {
  if (document.getElementById('md-ide-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'md-ide-styles';
  style.textContent = `
    .ai-message-content pre {
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 6px;
      margin: 12px 0;
      overflow: hidden;
    }
    .ai-message-content pre code {
      display: block;
      padding: 12px 16px;
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 13px;
      line-height: 1.5;
      color: #d4d4d4;
      overflow-x: auto;
      white-space: pre;
    }
    .code-block-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 12px;
      background: #2d2d2d;
      border-bottom: 1px solid #3c3c3c;
    }
    .code-block-language {
      font-size: 11px;
      font-weight: 600;
      color: #4fc3f7;
      text-transform: uppercase;
    }
    .code-block-copy-btn {
      background: transparent;
      border: 1px solid #4c4c4c;
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 11px;
      color: #888;
      cursor: pointer;
    }
    .code-block-copy-btn:hover {
      background: #3c3c3c;
      color: #fff;
    }
    .ai-message-content code:not(pre code) {
      background: rgba(110, 118, 129, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: Consolas, monospace;
      font-size: 0.9em;
      color: #e06c75;
    }
    .ai-message-content h1 {
      font-size: 1.5em;
      font-weight: 600;
      color: #4fc3f7;
      margin: 16px 0 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #3c3c3c;
    }
    .ai-message-content h2 {
      font-size: 1.3em;
      font-weight: 600;
      color: #81c784;
      margin: 14px 0 10px;
    }
    .ai-message-content h3 {
      font-size: 1.1em;
      font-weight: 600;
      color: #ffb74d;
      margin: 12px 0 8px;
    }
    .ai-message-content h4 {
      font-size: 1.05em;
      font-weight: 600;
      color: #ce93d8;
      margin: 10px 0 6px;
    }
    .ai-message-content strong {
      font-weight: 600;
      color: #fff;
    }
    .ai-message-content em {
      font-style: italic;
      color: #b0bec5;
    }
    .ai-message-content ul, .ai-message-content ol {
      margin: 8px 0;
      padding-left: 24px;
    }
    .ai-message-content li {
      margin: 4px 0;
      line-height: 1.6;
    }
    .ai-message-content blockquote {
      border-left: 3px solid #4fc3f7;
      margin: 12px 0;
      padding: 8px 16px;
      background: rgba(79, 195, 247, 0.1);
      color: #b0bec5;
    }
    .ai-message-content a {
      color: #4fc3f7;
      text-decoration: none;
    }
    .ai-message-content hr {
      border: none;
      border-top: 1px solid #3c3c3c;
      margin: 16px 0;
    }
    .ai-message-content p {
      margin: 8px 0;
      line-height: 1.6;
    }
  `;
  document.head.appendChild(style);
  console.log('✅ [MarkdownFix] Styles injected');
};

// Inject styles immediately
injectIDEStyles();

// ============================================================================
// SYNTAX HIGHLIGHTING
// ============================================================================

const KEYWORDS = [
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'class', 'extends', 'import', 'export', 'from', 'default', 'async', 'await',
  'try', 'catch', 'throw', 'new', 'this', 'super', 'static', 'public', 'private',
  'interface', 'type', 'enum', 'implements', 'readonly', 'true', 'false', 'null', 'undefined'
];

const highlightCode = (code: string): string => {
  if (!code) return '';
  
  let html = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, '<span style="color:#ce9178">$&</span>');
  html = html.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, '<span style="color:#6a9955">$&</span>');
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#b5cea8">$1</span>');
  const kw = new RegExp(`\\b(${KEYWORDS.join('|')})\\b`, 'g');
  html = html.replace(kw, '<span style="color:#c586c0">$1</span>');
  html = html.replace(/\b([a-zA-Z_]\w*)\s*\(/g, '<span style="color:#dcdcaa">$1</span>(');
  
  return html;
};

// ============================================================================
// MAIN MARKDOWN PROCESSOR
// ============================================================================

const processMarkdown = (content: string): string => {
  if (!content) return '';
  
  // Already processed check
  if (content.includes('<strong>') || content.includes('<h1') || content.includes('<pre>')) {
    if (!/\*\*[^*<]+\*\*/.test(content) && !/^#{1,6}\s/m.test(content)) {
      return content;
    }
  }
  
  let html = content;
  
  // ========== CODE BLOCKS (first!) ==========
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const language = lang || 'plaintext';
    const highlighted = highlightCode(code.trim());
    return `<pre><div class="code-block-header"><span class="code-block-language">${language}</span><button class="code-block-copy-btn" onclick="navigator.clipboard.writeText(this.closest('pre').querySelector('code').textContent).then(()=>{this.textContent='✓';setTimeout(()=>this.textContent='Copy',2000)})">Copy</button></div><code class="language-${language}">${highlighted}</code></pre>`;
  });
  
  // ========== INLINE CODE ==========
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // ========== HEADERS ==========
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  
  // ========== BOLD & ITALIC ==========
  html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<![*\\])\*([^*\n]+)\*(?![*])/g, '<em>$1</em>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // ========== LINKS ==========
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // ========== BLOCKQUOTES ==========
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
  
  // ========== NUMBERED LISTS ==========
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li data-num="$1">$2</li>');
  
  // ========== BULLET LISTS ==========
  html = html.replace(/^[-*+]\s+(.+)$/gm, '<li>$1</li>');
  
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, (match) => {
    const isNumbered = match.includes('data-num=');
    const tag = isNumbered ? 'ol' : 'ul';
    return `<${tag}>${match}</${tag}>`;
  });
  
  // ========== HORIZONTAL RULES ==========
  html = html.replace(/^---+$/gm, '<hr>');
  html = html.replace(/^\*\*\*+$/gm, '<hr>');
  
  // ========== LINE BREAKS ==========
  html = html.replace(/\n\n+/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  
  // Wrap in <p> if needed
  if (!html.startsWith('<')) {
    html = `<p>${html}</p>`;
  }
  
  // Clean up
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p><br>\s*<\/p>/g, '');
  html = html.replace(/<p>(<h[1-6]>)/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ol>)/g, '$1');
  html = html.replace(/(<\/ol>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre>)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');
  html = html.replace(/<p>(<blockquote>)/g, '$1');
  html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
  html = html.replace(/<p><hr>/g, '<hr>');
  html = html.replace(/<hr><\/p>/g, '<hr>');
  
  return html;
};

// ============================================================================
// FIX ALL MESSAGES
// ============================================================================

const fixAllMessages = (): number => {
  const messages = document.querySelectorAll('.ai-message-content');
  if (messages.length === 0) return 0;
  
  let fixedCount = 0;
  
  messages.forEach((el) => {
    // Skip messages already processed by MUF - prevents ghost panel creation
    if (el.querySelector('.muf-block')) return;

    const text = el.textContent || '';
    const html = el.innerHTML;
    
    // Check for raw markdown
    const hasRawMD = /\*\*[^*<]+\*\*/.test(text) || 
                     /^#{1,6}\s/m.test(text) || 
                     /^[-*+]\s/m.test(text) ||
                     /^\d+\.\s/m.test(text) ||
                     /```/.test(text) ||
                     /`[^`]+`/.test(text);
    
    // Check if already has IDE styling
    const hasProcessed = html.includes('<strong>') || 
                         html.includes('<h1') || 
                         html.includes('<h2') ||
                         html.includes('<h3') ||
                         html.includes('<ul>') ||
                         html.includes('<ol>') ||
                         html.includes('<pre>');
    
    if (hasRawMD && !hasProcessed) {
      const processed = processMarkdown(text);
      el.innerHTML = processed;
      el.setAttribute('data-md-fixed', 'true');
      fixedCount++;
    }
  });
  
  if (fixedCount > 0) {
    console.log(`✅ [MarkdownFix] Fixed ${fixedCount} messages`);
    
    // Trigger enhanceCodeBlocks if available
    if (typeof (window as any).enhanceCodeBlocks === 'function') {
      setTimeout(() => (window as any).enhanceCodeBlocks(), 100);
    }
  }
  
  return fixedCount;
};

// ============================================================================
// PATCH processMessageContent GLOBALLY
// ============================================================================

const patchGlobalProcessMessageContent = (): void => {
  const patchedFn = (content: string, messageId?: string): string => {
    if (!content) return '';
    
    // Try existing markdownProcessor first
    try {
      const mp = (window as any).markdownProcessor;
      if (mp?.processMarkdown) {
        const result = mp.processMarkdown(content, messageId || 'patch-' + Date.now());
        if (result?.html) return result.html;
      }
    } catch (e) { /* use our processor */ }
    
    return processMarkdown(content);
  };
  
  (window as any).processMessageContent = patchedFn;
  console.log('✅ [MarkdownFix] Patched window.processMessageContent');
};

// ============================================================================
// AGGRESSIVE MONITORING (checks every 500ms for 30 seconds)
// ============================================================================

let checkInterval: number | null = null;
let lastMessageCount = 0;

const startAggressiveMonitoring = (): void => {
  let checks = 0;
  const maxChecks = 60;
  
  checkInterval = window.setInterval(() => {
    checks++;
    
    const messages = document.querySelectorAll('.ai-message-content');
    
    if (messages.length !== lastMessageCount || messages.length > 0) {
      lastMessageCount = messages.length;
      
      let needsFix = false;
      messages.forEach(el => {
        const text = el.textContent || '';
        if (/\*\*[^*<]+\*\*/.test(text) || /^#{1,6}\s/m.test(text)) {
          needsFix = true;
        }
      });
      
      if (needsFix) {
        console.log('🔧 [MarkdownFix] Raw markdown detected, fixing...');
        fixAllMessages();
      }
    }
    
    if (checks >= maxChecks) {
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
      console.log('✅ [MarkdownFix] Initial monitoring complete');
    }
  }, 500);
};

// ============================================================================
// MUTATION OBSERVER
// ============================================================================

const setupObserver = (): void => {
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement) {
            if (node.classList?.contains('ai-message') || 
                node.classList?.contains('ai-message-content') ||
                node.querySelector?.('.ai-message')) {
              shouldCheck = true;
              break;
            }
          }
        }
      }
      if (shouldCheck) break;
    }
    
    if (shouldCheck) {
      clearTimeout((window as any).__mdFixTimer);
      (window as any).__mdFixTimer = setTimeout(fixAllMessages, 200);
    }
  });
  
  const tryObserve = () => {
    const chat = document.querySelector('.ai-chat-container');
    if (chat) {
      observer.observe(chat, { childList: true, subtree: true });
      console.log('✅ [MarkdownFix] Observer on chat container');
    } else {
      observer.observe(document.body, { childList: true, subtree: true });
      console.log('⚠️ [MarkdownFix] Observer on body (fallback)');
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryObserve);
  } else {
    tryObserve();
  }
};

// ============================================================================
// EVENT LISTENERS
// ============================================================================

const setupEventListeners = (): void => {
  document.addEventListener('conversation-loaded', () => {
    console.log('📥 [MarkdownFix] conversation-loaded');
    setTimeout(fixAllMessages, 100);
  });
  
  document.addEventListener('conversation-switched', () => {
    console.log('📥 [MarkdownFix] conversation-switched');
    setTimeout(fixAllMessages, 100);
  });
};

// ============================================================================
// INITIALIZATION
// ============================================================================

const init = (): void => {
  console.log('🚀 [MarkdownFix] Initializing v3.0...');
  
  patchGlobalProcessMessageContent();
  setupEventListeners();
  setupObserver();
  startAggressiveMonitoring();
  
  // Fix at multiple intervals
  setTimeout(fixAllMessages, 500);
  setTimeout(fixAllMessages, 1000);
  setTimeout(fixAllMessages, 2000);
  setTimeout(fixAllMessages, 5000);
  
  // Expose globally
  (window as any).fixMessages = fixAllMessages;
  (window as any).fixMarkdown = fixAllMessages;
  (window as any).processMarkdownToIDEStyle = processMarkdown;
  
  console.log('✅ [MarkdownFix] Ready! Use fixMessages() to manually fix.');
};

// Auto-init immediately
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

// Export
export { processMarkdown as processMarkdownToIDEStyle, fixAllMessages, injectIDEStyles, highlightCode };