// conversationMarkdownFix.ts
// ============================================================================
// FIX: Reprocess raw markdown when conversations are loaded from storage
// 
// PROBLEM: Messages saved as raw markdown, but on reload they're inserted
//          via innerHTML without being processed through markdown renderer.
//          Result: **Bold** shows as text, - item shows as raw text, etc.
//
// SOLUTION: Detect raw markdown patterns and reprocess through markdown
//           processor when conversations are loaded.
// ============================================================================

console.log('🔄 [ConversationMarkdownFix] Loading v1.0...');

// ============================================================================
// RAW MARKDOWN DETECTION
// ============================================================================

/**
 * Patterns that indicate raw/unprocessed markdown
 */
const RAW_MARKDOWN_PATTERNS = [
  /\*\*[^*]+\*\*/,           // **bold**
  /\*[^*]+\*/,               // *italic*
  /__[^_]+__/,               // __bold__
  /_[^_]+_/,                 // _italic_
  /^#{1,6}\s+/m,             // # Headers
  /^[-*+]\s+/m,              // - list items
  /^\d+\.\s+/m,              // 1. numbered lists
  /^>\s+/m,                  // > blockquotes
  /```[\s\S]*?```/,          // ```code blocks```
  /`[^`]+`/,                 // `inline code`
  /\[([^\]]+)\]\(([^)]+)\)/, // [links](url)
  /^\|.*\|$/m,               // | tables |
  /^---$/m,                  // horizontal rules
  /├──|└──|│/,               // tree structures
];

/**
 * HTML elements that indicate content has been processed
 */
const PROCESSED_HTML_INDICATORS = [
  '<strong>',
  '<em>',
  '<h1', '<h2', '<h3', '<h4', '<h5', '<h6',
  '<ul', '<ol', '<li',
  '<blockquote>',
  '<pre', '<code',
  '<a href',
  '<table',
  '<hr',
  'class="muf-',      // messageUIFix enhanced code blocks
  'class="hljs',      // highlight.js styled
  'class="language-', // language-specific styling
];

/**
 * Check if content appears to be raw/unprocessed markdown
 */
function isRawMarkdown(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  
  const trimmed = content.trim();
  if (trimmed.length === 0) return false;
  
  // Check if it has processed HTML indicators
  const hasProcessedHTML = PROCESSED_HTML_INDICATORS.some(indicator => 
    content.includes(indicator)
  );
  
  // Check if it has raw markdown patterns
  const hasRawMarkdown = RAW_MARKDOWN_PATTERNS.some(pattern => 
    pattern.test(content)
  );
  
  // Raw if: has markdown patterns BUT no processed HTML
  return hasRawMarkdown && !hasProcessedHTML;
}

/**
 * Check if content is mostly plain text (no markdown or HTML)
 */
function isPlainText(content: string): boolean {
  if (!content) return true;
  
  const hasHTML = /<[a-zA-Z][^>]*>/.test(content);
  const hasMarkdown = RAW_MARKDOWN_PATTERNS.some(p => p.test(content));
  
  return !hasHTML && !hasMarkdown;
}

// ============================================================================
// MARKDOWN PROCESSING
// ============================================================================

/**
 * Basic markdown to HTML conversion (fallback if processor unavailable)
 */
function basicMarkdownToHTML(markdown: string): string {
  let html = markdown;
  
  // Escape HTML first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Code blocks (must be first to protect content)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const langClass = lang ? ` class="language-${lang}"` : '';
    return `<pre><code${langClass}>${code.trim()}</code></pre>`;
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
  
  // Bold and italic
  html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
  
  // Unordered lists
  html = html.replace(/^[-*+]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  
  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^\*\*\*$/gm, '<hr>');
  
  // Line breaks (preserve paragraphs)
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  
  // Wrap in paragraph if not already structured
  if (!html.startsWith('<')) {
    html = `<p>${html}</p>`;
  }
  
  return html;
}

/**
 * Process markdown content using available processor
 */
function processMarkdown(content: string, messageId?: string): string {
  // Try unified markdown processor first
  const processor = (window as any).markdownProcessor;
  if (processor && typeof processor.processMarkdown === 'function') {
    try {
      const result = processor.processMarkdown(content, messageId || 'reprocess');
      if (result && result.html) {
        console.log('✅ [MarkdownFix] Processed via markdownProcessor');
        return result.html;
      }
    } catch (e) {
      console.warn('[MarkdownFix] markdownProcessor failed:', e);
    }
  }
  
  // Try marked library
  const marked = (window as any).marked;
  if (marked && typeof marked.parse === 'function') {
    try {
      const html = marked.parse(content);
      console.log('✅ [MarkdownFix] Processed via marked');
      return html;
    } catch (e) {
      console.warn('[MarkdownFix] marked failed:', e);
    }
  }
  
  // Fallback to basic processor
  console.log('⚠️ [MarkdownFix] Using basic fallback processor');
  return basicMarkdownToHTML(content);
}

// ============================================================================
// MESSAGE REPROCESSING
// ============================================================================

/**
 * Reprocess all messages in the chat container that have raw markdown
 */
export function reprocessRawMarkdownMessages(): number {
  console.log('🔄 [MarkdownFix] Scanning for raw markdown messages...');
  
  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) {
    console.warn('[MarkdownFix] Chat container not found');
    return 0;
  }
  
  // Find all message content divs
  const messageContents = chatContainer.querySelectorAll('.ai-message-content');
  let reprocessedCount = 0;
  
  messageContents.forEach((contentDiv, index) => {
    const content = contentDiv.innerHTML;
    const textContent = contentDiv.textContent || '';
    
    // Skip if already processed (has proper HTML structure)
    if (!isRawMarkdown(textContent)) {
      return;
    }
    
    // Skip collapsed messages (they have their own handling)
    const parentMsg = contentDiv.closest('.ai-message');
    if (parentMsg?.classList.contains('ai-message-collapsed')) {
      return;
    }
    
    // Get the message ID for tracking
    const messageId = parentMsg?.getAttribute('data-message-id') || `reprocess_${index}`;
    
    // [X02Fix MDF] Skip already-enhanced messages to prevent exponential DOM growth
    if (parentMsg && (parentMsg.getAttribute("data-muf-rendered") || parentMsg.querySelector(".muf-block"))) { return; }
    console.log(`🔧 [MarkdownFix] Reprocessing message: ${messageId.substring(0, 8)}...`);
    
    // Process the raw text content through markdown
    const processedHTML = processMarkdown(textContent, messageId);
    
    // Update the content
    contentDiv.innerHTML = processedHTML;
    reprocessedCount++;
    
    // Mark as reprocessed
    contentDiv.setAttribute('data-markdown-reprocessed', 'true');
  });
  
  if (reprocessedCount > 0) {
    console.log(`✅ [MarkdownFix] Reprocessed ${reprocessedCount} messages`);
    
    // Trigger code block enhancement after reprocessing
    setTimeout(() => {
      const enhancer = (window as any).enhanceCodeBlocks;
      if (typeof enhancer === 'function') {
        enhancer();
        console.log('🎨 [MarkdownFix] Triggered code block enhancement');
      }
    }, 100);
  } else {
    console.log('✅ [MarkdownFix] No raw markdown messages found');
  }
  
  return reprocessedCount;
}

/**
 * Reprocess a single message element
 */
export function reprocessSingleMessage(messageElement: HTMLElement): boolean {
  const contentDiv = messageElement.querySelector('.ai-message-content');
  if (!contentDiv) return false;
  
  const textContent = contentDiv.textContent || '';
  
  if (!isRawMarkdown(textContent)) {
    return false;
  }
  
  const messageId = messageElement.getAttribute('data-message-id') || 'single_reprocess';
  const processedHTML = processMarkdown(textContent, messageId);
  
  contentDiv.innerHTML = processedHTML;
  contentDiv.setAttribute('data-markdown-reprocessed', 'true');
  
  console.log(`✅ [MarkdownFix] Reprocessed single message: ${messageId.substring(0, 8)}...`);
  return true;
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Setup automatic reprocessing on conversation load
 */
function setupEventListeners(): void {
  // Reprocess when conversation is loaded
  document.addEventListener('conversation-loaded', () => {
    console.log('📥 [MarkdownFix] Conversation loaded event detected');
    // Small delay to ensure DOM is updated
    setTimeout(() => {
      reprocessRawMarkdownMessages();
    }, 200);
  });
  
  // Reprocess when conversation is switched
  document.addEventListener('conversation-switched', () => {
    console.log('🔀 [MarkdownFix] Conversation switched event detected');
    setTimeout(() => {
      reprocessRawMarkdownMessages();
    }, 200);
  });
  
  // Reprocess when window regains focus (catches missed events)
  let lastFocusReprocess = 0;
  window.addEventListener('focus', () => {
    const now = Date.now();
    // Debounce: only reprocess if more than 30 seconds since last
    if (now - lastFocusReprocess > 30000) {
      lastFocusReprocess = now;
      setTimeout(() => {
        reprocessRawMarkdownMessages();
      }, 500);
    }
  });
  
  console.log('✅ [MarkdownFix] Event listeners setup complete');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

let isInitialized = false;

export function initConversationMarkdownFix(): void {
  if (isInitialized) {
    console.log('⚠️ [MarkdownFix] Already initialized');
    return;
  }
  
  isInitialized = true;
  
  // Setup event listeners
  setupEventListeners();
  
  // Initial scan after a delay (for page load)
  setTimeout(() => {
    reprocessRawMarkdownMessages();
  }, 1000);
  
  // Note: Periodic polling removed — event listeners handle all reprocessing.
  // If needed, call window.reprocessRawMarkdownMessages() manually.
  
  console.log('✅ [MarkdownFix] Initialized successfully');
}

// ============================================================================
// EXPORTS & WINDOW BINDING
// ============================================================================

// Expose to window for debugging and manual use
if (typeof window !== 'undefined') {
  (window as any).reprocessRawMarkdownMessages = reprocessRawMarkdownMessages;
  (window as any).reprocessSingleMessage = reprocessSingleMessage;
  (window as any).isRawMarkdown = isRawMarkdown;
  (window as any).initConversationMarkdownFix = initConversationMarkdownFix;
  
  // Also expose as a utility object
  (window as any).markdownFix = {
    reprocess: reprocessRawMarkdownMessages,
    reprocessSingle: reprocessSingleMessage,
    isRaw: isRawMarkdown,
    init: initConversationMarkdownFix,
    processMarkdown: processMarkdown
  };
}

// Auto-initialize
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConversationMarkdownFix);
  } else {
    // Small delay to ensure other modules are loaded
    setTimeout(initConversationMarkdownFix, 500);
  }
}

export default {
  reprocessRawMarkdownMessages,
  reprocessSingleMessage,
  isRawMarkdown,
  initConversationMarkdownFix,
  processMarkdown
};