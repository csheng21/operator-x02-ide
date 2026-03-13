// conversationSearchIntegration.ts - Easy Integration for Conversation Search
// ============================================================================
// UPDATED: Hide search button when search panel is open
// ============================================================================

import { initializeConversationSearch, conversationSearchUI } from './conversationSearchUI';
import { conversationSearch } from './conversationSearch';
import { conversationManager } from './conversationManager';

// ============================================================================
// AUTO-INITIALIZE
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initializeConversationSearch();
    addSearchButtonToChat();
  }, 1500);
});

setTimeout(() => {
  if (!document.getElementById('chat-search-btn')) {
    addSearchButtonToChat();
  }
}, 3000);

// ============================================================================
// ADD FLOATING SEARCH BUTTON
// ============================================================================

function addSearchButtonToChat(): void {
  if (document.getElementById('chat-search-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'chat-search-btn';
  btn.title = 'Search conversations (Ctrl+F)';
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"></circle>
      <path d="M21 21l-4.35-4.35"></path>
    </svg>
  `;

  Object.assign(btn.style, {
    position: 'absolute',
    bottom: '70px',
    right: '12px',
    width: '36px',
    height: '36px',
    background: 'linear-gradient(135deg, #238636 0%, #2ea043 100%)',
    border: 'none',
    borderRadius: '50%',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    zIndex: '99',
    transition: 'all 0.2s ease',
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.1)';
    btn.style.boxShadow = '0 4px 12px rgba(35, 134, 54, 0.4)';
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
    btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  });

  btn.addEventListener('click', () => {
    toggleSearchWithButton();
  });

  // Add to chat panel
  const chatPanel = document.querySelector('.ai-assistant-panel') || 
                    document.querySelector('.ai-chat-container')?.parentElement;
  
  if (chatPanel) {
    // Make sure parent has position relative for absolute positioning
    (chatPanel as HTMLElement).style.position = 'relative';
    chatPanel.appendChild(btn);
    console.log('✅ Search button added');
  }
}

// ============================================================================
// ✅ TOGGLE SEARCH AND HIDE/SHOW BUTTON
// ============================================================================

function toggleSearchWithButton(): void {
  const btn = document.getElementById('chat-search-btn');
  
  if (conversationSearchUI.isOpen()) {
    // Close search panel, show button
    conversationSearchUI.hide();
    if (btn) btn.style.display = 'flex';
  } else {
    // Open search panel, hide button
    conversationSearchUI.show();
    if (btn) btn.style.display = 'none';
  }
}

// ============================================================================
// ✅ SHOW BUTTON WHEN SEARCH PANEL CLOSES (via Escape or X button)
// ============================================================================

// Override the hide function to also show the button
const originalHide = conversationSearchUI.hide.bind(conversationSearchUI);
conversationSearchUI.hide = function() {
  originalHide();
  const btn = document.getElementById('chat-search-btn');
  if (btn) {
    setTimeout(() => {
      btn.style.display = 'flex';
    }, 50);
  }
};

// Override the show function to also hide the button
const originalShow = conversationSearchUI.show.bind(conversationSearchUI);
conversationSearchUI.show = function() {
  originalShow();
  const btn = document.getElementById('chat-search-btn');
  if (btn) {
    btn.style.display = 'none';
  }
};

// ============================================================================
// KEYBOARD SHORTCUT ALSO HIDES/SHOWS BUTTON
// ============================================================================

document.addEventListener('keydown', (e) => {
  // Ctrl+F
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    const chatPanel = document.querySelector('.ai-assistant-panel');
    if (chatPanel && getComputedStyle(chatPanel).display !== 'none') {
      const btn = document.getElementById('chat-search-btn');
      if (btn) btn.style.display = 'none';
    }
  }
});

// ============================================================================
// LISTEN FOR CONVERSATION SWITCH
// ============================================================================

document.addEventListener('switch-conversation', ((e: CustomEvent) => {
  const { conversationId, messageId, searchQuery } = e.detail;
  
  const conv = conversationManager.getConversationById(conversationId);
  if (conv) {
    conversationManager.setCurrentConversation(conversationId);
    
    if (typeof (window as any).loadConversationToUI === 'function') {
      (window as any).loadConversationToUI(conv);
    }
    
    // After loading, highlight the search term
    setTimeout(() => {
      if (searchQuery) {
        // Re-highlight in the new conversation
        const chatContainer = document.querySelector('.ai-chat-container');
        if (chatContainer) {
          highlightTextInContainer(chatContainer as HTMLElement, searchQuery);
        }
      }
      
      const msgEl = document.querySelector(`[data-message-id="${messageId}"]`);
      if (msgEl) {
        msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        msgEl.classList.add('search-highlight-message');
        setTimeout(() => msgEl.classList.remove('search-highlight-message'), 2000);
      }
    }, 500);
  }
}) as EventListener);

// Helper to highlight text
function highlightTextInContainer(container: HTMLElement, query: string): void {
  // Implementation similar to search UI
  const messageContents = container.querySelectorAll('.ai-message-content');
  
  messageContents.forEach((contentEl) => {
    const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT);
    const nodes: { node: Text; index: number }[] = [];
    let node: Text | null;
    
    while ((node = walker.nextNode() as Text | null)) {
      const text = node.textContent?.toLowerCase() || '';
      const index = text.indexOf(query.toLowerCase());
      if (index !== -1) {
        nodes.push({ node, index });
      }
    }
    
    // Apply highlights in reverse
    for (const { node, index } of nodes.reverse()) {
      const text = node.textContent || '';
      const before = text.substring(0, index);
      const match = text.substring(index, index + query.length);
      const after = text.substring(index + query.length);
      
      const fragment = document.createDocumentFragment();
      if (before) fragment.appendChild(document.createTextNode(before));
      
      const mark = document.createElement('mark');
      mark.className = 'search-highlight-text';
      mark.textContent = match;
      fragment.appendChild(mark);
      
      if (after) fragment.appendChild(document.createTextNode(after));
      
      node.parentNode?.replaceChild(fragment, node);
    }
  });
}

// ============================================================================
// EXPOSE FUNCTIONS
// ============================================================================

(window as any).searchConversations = (query: string, scope: 'current' | 'all' = 'current') => {
  return conversationSearch.search(query, { scope });
};

(window as any).showConversationSearch = () => {
  conversationSearchUI.show();
  const btn = document.getElementById('chat-search-btn');
  if (btn) btn.style.display = 'none';
};

(window as any).hideConversationSearch = () => {
  conversationSearchUI.hide();
  const btn = document.getElementById('chat-search-btn');
  if (btn) btn.style.display = 'flex';
};

(window as any).toggleConversationSearch = () => toggleSearchWithButton();

console.log('✅ Conversation Search Integration loaded');
console.log('🔍 Search button hides when panel is open');
