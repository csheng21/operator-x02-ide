// conversationUIMarkdownPatch.ts
// ============================================================================
// DROP-IN FIX: Patches processMessageContent to properly render markdown
// 
// USAGE: Just import this file in your main.ts:
//   import './ide/aiAssistant/conversationUIMarkdownPatch';
//
// This will automatically patch the broken processMessageContent function
// and fix raw markdown display after IDE reset.
// ============================================================================

console.log('🔧 [ConversationUIMarkdownPatch] Loading...');

// ============================================================================
// MARKDOWN PROCESSOR
// ============================================================================

/**
 * Process markdown content to HTML
 * This is the FIXED version that actually processes markdown
 */
function processMarkdownContent(content: string, messageId?: string): string {
  if (!content) return '';
  
  // Skip if content is already processed HTML
  if (content.includes('<strong>') || 
      content.includes('<h1') || 
      content.includes('<h2') ||
      content.includes('<h3') ||
      content.includes('<ul>') ||
      content.includes('<ol>') ||
      content.includes('class="muf-') ||
      content.includes('class="hljs')) {
    return content;
  }
  
  try {
    // Try using window.markdownProcessor first
    const processor = (window as any).markdownProcessor;
    if (processor && typeof processor.processMarkdown === 'function') {
      const result = processor.processMarkdown(content, messageId || 'patched-' + Date.now());
      if (result && result.html) {
        return result.html;
      }
    }
  } catch (e) {
    console.warn('[MarkdownPatch] Processor error:', e);
  }
  
  // Fallback to basic markdown processing
  return basicMarkdownToHTML(content);
}

/**
 * Basic markdown to HTML conversion
 */
function basicMarkdownToHTML(markdown: string): string {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Code blocks (must be first)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const langClass = lang ? ` class="language-${lang}"` : '';
    const cleanCode = code.trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre><code${langClass}>${cleanCode}</code></pre>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Headers
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  
  // Bold (must come before italic)
  html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<![*])\*([^*]+)\*(?![*])/g, '<em>$1</em>');
  
  // Underscores
  html = html.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
  
  // Lists
  html = html.replace(/^[-*+]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, '<ul>$&</ul>');
  
  // Numbered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  
  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  
  // Line breaks
  html = html.replace(/\n\n+/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  
  // Wrap if needed
  if (html && !html.trim().startsWith('<')) {
    html = `<p>${html}</p>`;
  }
  
  return html;
}

// ============================================================================
// PATCH: Monitor and fix raw markdown in chat messages
// ============================================================================

/**
 * Check if content has raw markdown that needs processing
 */
function hasRawMarkdown(text: string): boolean {
  if (!text) return false;
  
  const rawPatterns = [
    /\*\*[^*]+\*\*/,     // **bold**
    /^#{1,6}\s+/m,       // # headers
    /^[-*+]\s+/m,        // - list items
    /```[\s\S]*?```/,    // code blocks
    /`[^`]+`/,           // inline code
  ];
  
  return rawPatterns.some(p => p.test(text));
}

/**
 * Check if content has been processed to HTML
 */
function hasProcessedHTML(html: string): boolean {
  if (!html) return false;
  
  const htmlIndicators = [
    '<strong>', '<em>', '<h1', '<h2', '<h3',
    '<ul>', '<ol>', '<li>', '<blockquote>',
    '<pre>', '<code>', 'class="muf-', 'class="hljs'
  ];
  
  return htmlIndicators.some(tag => html.includes(tag));
}

/**
 * Fix all raw markdown messages in the chat
 */
function fixRawMarkdownMessages(): number {
  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) return 0;
  
  const messageContents = chatContainer.querySelectorAll('.ai-message-content');
  let fixedCount = 0;
  
  messageContents.forEach((contentDiv, index) => {
    const text = contentDiv.textContent || '';
    const html = contentDiv.innerHTML;
    
    // Check if needs processing: has raw markdown but no processed HTML
    if (hasRawMarkdown(text) && !hasProcessedHTML(html)) {
      const messageId = contentDiv.closest('.ai-message')?.getAttribute('data-message-id') || `fix-${index}`;
      const processed = processMarkdownContent(text, messageId);
      contentDiv.innerHTML = processed;
      contentDiv.setAttribute('data-markdown-patched', 'true');
      fixedCount++;
    }
  });
  
  if (fixedCount > 0) {
    console.log(`✅ [MarkdownPatch] Fixed ${fixedCount} messages with raw markdown`);
    
    // Trigger code block enhancement
    setTimeout(() => {
      if (typeof (window as any).enhanceCodeBlocks === 'function') {
        (window as any).enhanceCodeBlocks();
      }
    }, 100);
  }
  
  return fixedCount;
}

// ============================================================================
// AUTO-PATCH: Listen for conversation load events
// ============================================================================

function setupAutoPatch(): void {
  // Fix on conversation load
  document.addEventListener('conversation-loaded', () => {
    console.log('📥 [MarkdownPatch] Conversation loaded, checking for raw markdown...');
    setTimeout(fixRawMarkdownMessages, 200);
  });
  
  // Fix on conversation switch
  document.addEventListener('conversation-switched', () => {
    setTimeout(fixRawMarkdownMessages, 200);
  });
  
  // Periodic check as backup (every 5 seconds)
  setInterval(() => {
    const chatContainer = document.querySelector('.ai-chat-container');
    if (chatContainer && chatContainer.children.length > 0) {
      // Quick check if any message needs fixing
      const needsFix = Array.from(chatContainer.querySelectorAll('.ai-message-content'))
        .some(el => {
          const text = el.textContent || '';
          const html = el.innerHTML;
          return hasRawMarkdown(text) && !hasProcessedHTML(html);
        });
      
      if (needsFix) {
        fixRawMarkdownMessages();
      }
    }
  }, 5000);
  
  // MutationObserver for immediate detection
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement && 
              (node.classList.contains('ai-message') || node.querySelector('.ai-message'))) {
            shouldCheck = true;
            break;
          }
        }
      }
      if (shouldCheck) break;
    }
    
    if (shouldCheck) {
      // Debounce
      clearTimeout((window as any).__markdownPatchTimer);
      (window as any).__markdownPatchTimer = setTimeout(fixRawMarkdownMessages, 300);
    }
  });
  
  // Start observing when chat container exists
  const startObserving = () => {
    const chatContainer = document.querySelector('.ai-chat-container');
    if (chatContainer) {
      observer.observe(chatContainer, { childList: true, subtree: true });
      console.log('✅ [MarkdownPatch] Observer active');
      
      // Initial fix
      setTimeout(fixRawMarkdownMessages, 500);
    } else {
      setTimeout(startObserving, 500);
    }
  };
  
  startObserving();
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Expose functions globally
if (typeof window !== 'undefined') {
  (window as any).fixRawMarkdownMessages = fixRawMarkdownMessages;
  (window as any).processMarkdownContent = processMarkdownContent;
  (window as any).markdownPatch = {
    fix: fixRawMarkdownMessages,
    process: processMarkdownContent,
    hasRaw: hasRawMarkdown,
    hasHTML: hasProcessedHTML
  };
}

// Auto-initialize
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAutoPatch);
  } else {
    setTimeout(setupAutoPatch, 100);
  }
}

console.log('✅ [ConversationUIMarkdownPatch] Loaded! Use fixRawMarkdownMessages() to manually fix.');

export {
  fixRawMarkdownMessages,
  processMarkdownContent,
  basicMarkdownToHTML,
  hasRawMarkdown,
  hasProcessedHTML
};

export default {
  fix: fixRawMarkdownMessages,
  process: processMarkdownContent
};
