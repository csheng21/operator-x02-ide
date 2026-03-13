// src/ide/aiAssistant/aiResponseFilter.ts
// Filter AI responses to remove any echoed context
// Version: 1.0

console.log('🔧 [AI Response Filter] Loading...');

// ============================================================================
// CONTEXT PATTERNS TO STRIP FROM AI RESPONSES
// ============================================================================

const CONTEXT_PATTERNS = [
  // HTML comment format (new preferred format)
  /<!--\s*INTERNAL_CONTEXT_START[\s\S]*?INTERNAL_CONTEXT_END\s*-->/gi,
  /<!--\s*PAST_CHAT_\d+[\s\S]*?-->/gi,
  /<!--\s*Use this context[\s\S]*?-->/gi,
  /<!--\s*User:[\s\S]*?-->/gi,
  /<!--\s*Assistant:[\s\S]*?-->/gi,
  
  // Old format
  /\[CONVERSATION HISTORY CONTEXT\][\s\S]*?\[END CONVERSATION HISTORY\]/gi,
  /\[CONVERSATION HISTORY CONTEXT\][\s\S]*?(?=\n\n[A-Z]|$)/gi,
  
  // New XML format
  /<history_context[\s\S]*?<\/history_context>/gi,
  
  // System instruction format
  /\[SYSTEM: CONVERSATION HISTORY CONTEXT[\s\S]*?\[END CONTEXT[^\]]*\]/gi,
  
  // Found X relevant patterns - THIS IS THE KEY ONE
  /\[CONVERSATION HISTORY CONTEXT\]Found \d+ relevant past conversation\(s\):[\s\S]*?(?=Would you like|I |Let me|Here|The |This |Based|To |$)/gi,
  
  // Past conversation blocks
  /---\s*Past Conversation \d+[\s\S]*?AI replied:[\s\S]*?(?=---|$)/gi,
  
  // Reason/matched keywords lines
  /---Reason: Matched keywords:[\s\S]*?(?=\n\n|Would|$)/gi,
  
  // User asked / AI replied blocks
  /User asked:[\s\S]*?AI replied:[\s\S]*?(?=\n\n---|\n\n\[|Would|$)/gi,
  
  // Generic context markers
  /\[💬 CONVERSATION CONTEXT[\s\S]*?\[END[\s\S]*?\]/gi,
  
  // Project context (if echoed)
  /\[PROJECT CONTEXT\][\s\S]*?\[END PROJECT CONTEXT\]/gi,
  
  // Catch patterns with Chinese text (from your screenshot)
  /\[CONVERSATION HISTORY CONTEXT\]Found \d+ relevant past conversation\(s\):---[\s\S]*?(?=Would|$)/gi,
  
  // Any line starting with "---Reason:" or similar
  /^---Reason:.*$/gm,
  /^---\s*Past Conversation.*$/gm,
];

// ============================================================================
// MAIN FILTER FUNCTION
// ============================================================================

/**
 * Strip any echoed context from AI response
 */
function filterAIResponse(response: string): string {
  if (!response) return response;
  
  let filtered = response;
  let changed = false;
  
  for (const pattern of CONTEXT_PATTERNS) {
    const before = filtered;
    filtered = filtered.replace(pattern, '');
    if (filtered !== before) {
      changed = true;
    }
  }
  
  // Clean up extra whitespace left behind
  if (changed) {
    // Remove multiple consecutive newlines (more than 2)
    filtered = filtered.replace(/\n{3,}/g, '\n\n');
    // Trim leading/trailing whitespace
    filtered = filtered.trim();
    
    console.log('[AI Response Filter] Stripped echoed context from response');
  }
  
  return filtered;
}

/**
 * Check if response contains context that should be stripped
 */
function containsContext(response: string): boolean {
  if (!response) return false;
  
  for (const pattern of CONTEXT_PATTERNS) {
    if (pattern.test(response)) {
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// DOM MUTATION OBSERVER - Auto-filter displayed messages
// ============================================================================

let observerSetup = false;

function setupResponseFilter(): void {
  if (observerSetup) return;
  
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          // Check if this is an assistant message
          const isAssistant = node.classList.contains('assistant-message') ||
                             node.classList.contains('ai-message') ||
                             node.querySelector('.assistant-message, .ai-message');
          
          if (isAssistant) {
            // Find content element
            const contentEl = node.querySelector('.ai-message-content, .message-content') as HTMLElement ||
                             node;
            
            if (contentEl && containsContext(contentEl.innerHTML)) {
              console.log('[AI Response Filter] Filtering displayed message...');
              
              // Filter the HTML content
              let html = contentEl.innerHTML;
              
              // Strip context patterns from HTML
              for (const pattern of CONTEXT_PATTERNS) {
                html = html.replace(pattern, '');
              }
              
              // Also strip any plain text that looks like context
              html = html.replace(/\[CONVERSATION HISTORY CONTEXT\][^<]*/gi, '');
              html = html.replace(/Found \d+ relevant past conversation\(s\):[^<]*/gi, '');
              html = html.replace(/---\s*Past Conversation \d+[^<]*---/gi, '');
              
              // Clean up empty elements
              html = html.replace(/<p>\s*<\/p>/gi, '');
              html = html.replace(/<div>\s*<\/div>/gi, '');
              
              contentEl.innerHTML = html;
              
              console.log('[AI Response Filter] Message filtered successfully');
            }
          }
        }
      }
    }
  });
  
  // Observe the chat container
  const tryObserve = () => {
    const chatContainer = document.querySelector('.ai-chat-container, .chat-messages, .ai-panel');
    if (chatContainer) {
      observer.observe(chatContainer, { 
        childList: true, 
        subtree: true,
        characterData: true 
      });
      observerSetup = true;
      console.log('[AI Response Filter] Observer started');
    } else {
      setTimeout(tryObserve, 500);
    }
  };
  
  tryObserve();
}

// ============================================================================
// HOOK INTO STREAMING RESPONSE
// ============================================================================

/**
 * Filter streaming text chunks
 */
function filterStreamingChunk(chunk: string, buffer: string): { filtered: string; newBuffer: string } {
  const combined = buffer + chunk;
  
  // Check if we have a complete context block to filter
  for (const pattern of CONTEXT_PATTERNS) {
    if (pattern.test(combined)) {
      const filtered = combined.replace(pattern, '');
      return { filtered, newBuffer: '' };
    }
  }
  
  // Check if we're in the middle of a context block
  if (combined.includes('[CONVERSATION HISTORY CONTEXT]') && !combined.includes('[END')) {
    // Buffer this until we get the end
    return { filtered: '', newBuffer: combined };
  }
  
  if (combined.includes('<history_context') && !combined.includes('</history_context>')) {
    return { filtered: '', newBuffer: combined };
  }
  
  return { filtered: combined, newBuffer: '' };
}

// ============================================================================
// CLEAN EXISTING MESSAGES
// ============================================================================

/**
 * Clean all existing messages in chat
 */
function cleanExistingMessages(): void {
  const messages = document.querySelectorAll('.assistant-message, .ai-message');
  let cleaned = 0;
  
  messages.forEach(msg => {
    const contentEl = msg.querySelector('.ai-message-content, .message-content') as HTMLElement || msg as HTMLElement;
    
    if (contentEl && containsContext(contentEl.innerHTML)) {
      let html = contentEl.innerHTML;
      
      for (const pattern of CONTEXT_PATTERNS) {
        html = html.replace(pattern, '');
      }
      
      // Additional cleanup
      html = html.replace(/\[CONVERSATION HISTORY CONTEXT\][^<]*/gi, '');
      html = html.replace(/Found \d+ relevant past conversation\(s\):[^<]*/gi, '');
      
      contentEl.innerHTML = html;
      cleaned++;
    }
  });
  
  if (cleaned > 0) {
    console.log(`[AI Response Filter] Cleaned ${cleaned} existing message(s)`);
  }
}

// ============================================================================
// WINDOW EXPORTS
// ============================================================================

(window as any).aiResponseFilter = {
  filterAIResponse,
  containsContext,
  filterStreamingChunk,
  cleanExistingMessages,
  setupResponseFilter,
  CONTEXT_PATTERNS
};

// Also export at window level for easy access
(window as any).filterAIResponse = filterAIResponse;
(window as any).cleanContextFromChat = cleanExistingMessages;

// ============================================================================
// INITIALIZATION
// ============================================================================

function init(): void {
  console.log('🔧 [AI Response Filter] Initializing...');
  
  // Setup DOM observer to auto-filter new messages
  setupResponseFilter();
  
  // Clean any existing messages
  setTimeout(cleanExistingMessages, 1000);
  
  console.log('✅ [AI Response Filter] Ready!');
  console.log('   Clean chat: window.cleanContextFromChat()');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  filterAIResponse,
  containsContext,
  filterStreamingChunk,
  cleanExistingMessages,
  setupResponseFilter
};
