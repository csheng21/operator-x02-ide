// src/ide/aiAssistant/historyContextIntegration.ts
// Integration module for History Context System
// Version: 1.0
// 
// This module hooks the response filter into the AI response display

console.log('🔗 [History Context Integration] Loading...');

// ============================================================================
// GLOBAL HOOK - Intercept AI Response Display
// ============================================================================

/**
 * Hook into the response display to filter out echoed context
 */
function hookResponseDisplay(): void {
  // Hook 1: MutationObserver for real-time filtering
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // Handle added nodes
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          filterElementContent(node);
        }
      }
      
      // Handle character data changes (text updates)
      if (mutation.type === 'characterData' && mutation.target.parentElement) {
        filterElementContent(mutation.target.parentElement);
      }
    }
  });
  
  // Start observing when chat container is ready
  const startObserving = () => {
    const chatContainer = document.querySelector('.ai-chat-container, .chat-messages, .ai-panel');
    if (chatContainer) {
      observer.observe(chatContainer, {
        childList: true,
        subtree: true,
        characterData: true
      });
      console.log('[History Context Integration] Response filter active');
    } else {
      setTimeout(startObserving, 500);
    }
  };
  
  startObserving();
}

/**
 * Filter content of an element
 */
function filterElementContent(element: HTMLElement): void {
  // Check if this is a message element
  const isMessage = element.classList.contains('assistant-message') ||
                   element.classList.contains('ai-message') ||
                   element.closest('.assistant-message, .ai-message');
  
  if (!isMessage) return;
  
  // Find content element
  const contentEl = element.querySelector('.ai-message-content, .message-content') as HTMLElement ||
                   element.querySelector('.markdown-body') as HTMLElement ||
                   element;
  
  if (!contentEl) return;
  
  // Check if contains context
  const text = contentEl.textContent || '';
  if (!shouldFilter(text)) return;
  
  // Apply filters
  let html = contentEl.innerHTML;
  const originalLength = html.length;
  
  html = applyFilters(html);
  
  // Only update if changed
  if (html.length !== originalLength) {
    contentEl.innerHTML = html;
    console.log('[History Context Integration] Filtered echoed context from message');
  }
}

/**
 * Check if text contains context that should be filtered
 */
function shouldFilter(text: string): boolean {
  const triggers = [
    '[CONVERSATION HISTORY CONTEXT]',
    '<!-- INTERNAL_CONTEXT',
    '<!-- PAST_CHAT',
    '<history_context',
    '[SYSTEM: CONVERSATION',
    '--- Past Conversation',
    'Past Conversation 1',
    'Found \\d+ relevant past conversation',
    '---Reason: Matched keywords',
    'Matched keywords:',
    'AI replied:',
    'User asked:',
    '<!-- User:',
    '<!-- Assistant:'
  ];
  
  return triggers.some(t => {
    if (t.includes('\\d')) {
      return new RegExp(t).test(text);
    }
    return text.includes(t);
  });
}

/**
 * Apply all filters to HTML content
 */
function applyFilters(html: string): string {
  // First, strip all HTML comment-based context
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  
  // Strip all variations of CONVERSATION HISTORY CONTEXT
  // This catches the entire block from start to where real response begins
  html = html.replace(/\[CONVERSATION HISTORY CONTEXT\][\s\S]*?(?=Based on|Here's|The |This |I |Let me|Looking at|According|From |In |To |Sure|Yes|Would you|As |After|Before|First|Now|So |Actually|Okay|Ok,|Well|Alright|Great|Thanks|Got it)/gi, '');
  
  // If still has context marker, strip everything up to common response starters
  if (html.includes('[CONVERSATION HISTORY CONTEXT]')) {
    html = html.replace(/[\s\S]*?\[CONVERSATION HISTORY CONTEXT\][\s\S]*?(?=\n\n[A-Z])/gi, '');
  }
  
  // Strip any remaining context markers and their content
  html = html.replace(/\[CONVERSATION HISTORY CONTEXT\][\s\S]*/gi, '');
  
  // Strip Past Conversation blocks
  html = html.replace(/---\s*Past Conversation[\s\S]*?(?=---|$)/gi, '');
  
  // Strip Reason lines
  html = html.replace(/---Reason:[\s\S]*?(?=---|$)/gi, '');
  
  // Strip User asked / AI replied patterns
  html = html.replace(/User asked:[\s\S]*?AI replied:[\s\S]*?(?=---|User asked|$)/gi, '');
  
  // Strip Found X relevant patterns
  html = html.replace(/Found \d+ relevant past conversation\(s\):[\s\S]*?(?=Based|Here|The |I |Let|$)/gi, '');
  
  // Strip any remaining system/context markers
  html = html.replace(/\[SYSTEM:[\s\S]*?\]/gi, '');
  html = html.replace(/\[END[\s\S]*?\]/gi, '');
  html = html.replace(/\[INTERNAL[\s\S]*?\]/gi, '');
  
  // Clean up XML-like context tags
  html = html.replace(/<history_context[\s\S]*?<\/history_context>/gi, '');
  html = html.replace(/<past_conversation[\s\S]*?<\/past_conversation>/gi, '');
  html = html.replace(/<instruction>[\s\S]*?<\/instruction>/gi, '');
  
  // Clean up artifacts
  html = html.replace(/^\s*---\s*$/gm, '');
  html = html.replace(/\n{3,}/g, '\n\n');
  html = html.replace(/^\s+/, '');
  html = html.replace(/<p>\s*<\/p>/gi, '');
  html = html.replace(/<div>\s*<\/div>/gi, '');
  
  return html.trim();
}

// ============================================================================
// MANUAL CLEAN FUNCTION
// ============================================================================

/**
 * Clean all existing messages in the chat
 */
function cleanAllMessages(): void {
  const messages = document.querySelectorAll('.assistant-message, .ai-message');
  let cleaned = 0;
  
  messages.forEach(msg => {
    const contentEl = msg.querySelector('.ai-message-content, .message-content, .markdown-body') as HTMLElement;
    if (contentEl && shouldFilter(contentEl.textContent || '')) {
      const before = contentEl.innerHTML.length;
      contentEl.innerHTML = applyFilters(contentEl.innerHTML);
      if (contentEl.innerHTML.length !== before) {
        cleaned++;
      }
    }
  });
  
  console.log(`[History Context Integration] Cleaned ${cleaned} message(s)`);
}

// ============================================================================
// STREAMING RESPONSE FILTER
// ============================================================================

let streamBuffer = '';

/**
 * Filter a streaming chunk - call this during response streaming
 */
function filterStreamingChunk(chunk: string): string {
  streamBuffer += chunk;
  
  // Check if we're in a context block
  const hasContextStart = streamBuffer.includes('[CONVERSATION HISTORY CONTEXT]') ||
                         streamBuffer.includes('<!-- INTERNAL_CONTEXT_START');
  
  if (hasContextStart) {
    // Check if context block is complete
    const hasContextEnd = streamBuffer.includes('Would you') ||
                         streamBuffer.includes('I would') ||
                         streamBuffer.includes('Let me') ||
                         streamBuffer.includes('INTERNAL_CONTEXT_END');
    
    if (hasContextEnd) {
      // Filter and return
      const filtered = applyFilters(streamBuffer);
      streamBuffer = '';
      return filtered;
    } else {
      // Still in context block, don't output yet
      return '';
    }
  }
  
  // No context block, output normally
  const result = streamBuffer;
  streamBuffer = '';
  return result;
}

/**
 * Reset stream buffer (call when starting new response)
 */
function resetStreamBuffer(): void {
  streamBuffer = '';
}

// ============================================================================
// WINDOW EXPORTS
// ============================================================================

(window as any).historyContextIntegration = {
  hookResponseDisplay,
  filterElementContent,
  shouldFilter,
  applyFilters,
  cleanAllMessages,
  filterStreamingChunk,
  resetStreamBuffer
};

// Convenience exports
(window as any).cleanChatContext = cleanAllMessages;
(window as any).filterStreamChunk = filterStreamingChunk;

// ============================================================================
// INITIALIZATION
// ============================================================================

function init(): void {
  console.log('🔗 [History Context Integration] Initializing...');
  
  // Hook into response display
  hookResponseDisplay();
  
  // Clean any existing messages after a delay
  setTimeout(cleanAllMessages, 1500);
  
  console.log('✅ [History Context Integration] Ready!');
  console.log('   Manual clean: window.cleanChatContext()');
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Also run periodic cleanup every 2 seconds to catch any missed content
setInterval(() => {
  const messages = document.querySelectorAll('.assistant-message, .ai-message');
  messages.forEach(msg => {
    const contentEl = msg.querySelector('.ai-message-content, .message-content, .markdown-body') as HTMLElement;
    if (contentEl) {
      const text = contentEl.textContent || '';
      if (text.includes('[CONVERSATION HISTORY CONTEXT]') || 
          text.includes('<!-- INTERNAL_CONTEXT') ||
          text.includes('Past Conversation 1') ||
          text.includes('Matched keywords:')) {
        contentEl.innerHTML = applyFilters(contentEl.innerHTML);
      }
    }
  });
}, 2000);

export {
  hookResponseDisplay,
  cleanAllMessages,
  filterStreamingChunk,
  applyFilters
};
