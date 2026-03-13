// conversationUIFix.ts
// ============================================================================
// FIX: Make loaded messages render exactly like original messages
// ============================================================================
// 
// This fixes:
// 1. Markdown rendering (bold, lists, code blocks, etc.)
// 2. Action buttons matching original layout
// 3. Message structure matching original
//
// Import this in conversationUI.ts or conversationLoadFix.ts:
// import './conversationUIFix';
//
// ============================================================================

import { conversationManager } from './conversationManager';

// ============================================================================
// MARKDOWN PROCESSOR - Converts markdown to HTML
// ============================================================================

export function processMessageContent(content: string): string {
  if (!content) return '';
  
  // If content already has complex HTML, return as-is
  if (content.includes('<div class=') || content.includes('<pre class=') || content.includes('<ol class=')) {
    return content;
  }
  
  let processed = content;
  
  // Process code blocks first (```code```)
  processed = processed.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang || 'plaintext';
    return `<pre class="code-block" data-language="${language}"><code>${escapeHtml(code.trim())}</code></pre>`;
  });
  
  // Process inline code (`code`)
  processed = processed.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  
  // Process bold (**text** or __text__)
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Process italic (*text* or _text_) - be careful not to match inside words
  processed = processed.replace(/(?<![\\w])\*([^*]+)\*(?![\\w])/g, '<em>$1</em>');
  
  // Process numbered lists - wrap in ol
  const numberedListRegex = /^(\d+)\.\s+(.+)$/gm;
  let hasNumberedList = numberedListRegex.test(processed);
  if (hasNumberedList) {
    // Reset regex
    processed = processed.replace(/^(\d+)\.\s+(.+)$/gm, '|||NUMITEM|||<li><strong>$1.</strong> $2</li>');
    // Wrap consecutive items
    processed = processed.replace(/(|||NUMITEM|||<li>[\s\S]*?<\/li>\n?)+/g, (match) => {
      return '<ol class="message-list">' + match.replace(/\|\|\|NUMITEM\|\|\|/g, '') + '</ol>';
    });
    processed = processed.replace(/\|\|\|NUMITEM\|\|\|/g, '');
  }
  
  // Process bullet lists (- item or * item at start of line)
  const bulletListRegex = /^[-•]\s+(.+)$/gm;
  let hasBulletList = bulletListRegex.test(processed);
  if (hasBulletList) {
    processed = processed.replace(/^[-•]\s+(.+)$/gm, '|||BULLETITEM|||<li>$1</li>');
    processed = processed.replace(/(|||BULLETITEM|||<li>[\s\S]*?<\/li>\n?)+/g, (match) => {
      return '<ul class="message-list">' + match.replace(/\|\|\|BULLETITEM\|\|\|/g, '') + '</ul>';
    });
    processed = processed.replace(/\|\|\|BULLETITEM\|\|\|/g, '');
  }
  
  // Process headers
  processed = processed.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  processed = processed.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  processed = processed.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  
  // Process links [text](url)
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // Convert double newlines to paragraph breaks
  processed = processed.replace(/\n\n+/g, '</p><p>');
  
  // Wrap in paragraph if not already wrapped
  if (!processed.startsWith('<')) {
    processed = '<p>' + processed + '</p>';
  }
  
  // Clean up empty paragraphs
  processed = processed.replace(/<p>\s*<\/p>/g, '');
  processed = processed.replace(/<p>(<(?:ol|ul|pre|h[2-4]))/g, '$1');
  processed = processed.replace(/(<\/(?:ol|ul|pre|h[2-4])>)<\/p>/g, '$1');
  
  // Convert single newlines to <br> inside paragraphs
  processed = processed.replace(/<p>([\s\S]*?)<\/p>/g, (match, inner) => {
    return '<p>' + inner.replace(/\n/g, '<br>') + '</p>';
  });
  
  return processed;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================================
// CREATE USER MESSAGE DELETE BUTTON
// ============================================================================

export function createUserMessageDeleteButton(msgId: string): HTMLElement {
  const actionsWrapper = document.createElement('div');
  actionsWrapper.className = 'user-message-actions';
  actionsWrapper.innerHTML = `
    <button class="msg-action-btn delete-msg-btn" title="Delete message" data-msg-id="${msgId}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    </button>
  `;
  
  const deleteBtn = actionsWrapper.querySelector('.delete-msg-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteMessageById(msgId);
    });
  }
  
  return actionsWrapper;
}

// ============================================================================
// CREATE MESSAGE ACTIONS FOR ASSISTANT MESSAGES - Matches Original UI
// ============================================================================

export function createMessageActionsForLoading(
  role: string, 
  content: string, 
  timestamp?: number, 
  msgId?: string, 
  note?: any
): HTMLElement {
  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'message-actions';
  actionsContainer.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0 4px 0;
    margin-top: 8px;
    border-top: 1px solid rgba(255,255,255,0.06);
  `;
  
  // Format timestamp - compact format like "12:42 AM"
  const timeStr = timestamp 
    ? formatMessageTime(timestamp) 
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Get current provider from API config
  let providerName = 'Operator X02';
  let providerColor = '#4fc3f7';
  
  try {
    const config = localStorage.getItem('api_configuration');
    if (config) {
      const parsed = JSON.parse(config);
      const provider = parsed.provider || 'operator_x02';
      
      // Map provider to display name and color
      const providerMap: { [key: string]: { name: string; color: string } } = {
        'operator_x02': { name: 'Operator X02', color: '#4fc3f7' },
        'deepseek': { name: 'Deepseek', color: '#00d4aa' },
        'openai': { name: 'OpenAI', color: '#74aa9c' },
        'claude': { name: 'Claude', color: '#d4a574' },
        'groq': { name: 'Groq', color: '#f55036' },
        'anthropic': { name: 'Anthropic', color: '#d4a574' }
      };
      
      const info = providerMap[provider] || { name: provider, color: '#4fc3f7' };
      providerName = info.name;
      providerColor = info.color;
    }
  } catch (e) {
    // Use defaults
  }
  
  actionsContainer.innerHTML = `
    <div class="message-footer-left" style="display: flex; align-items: center; gap: 8px;">
      <span class="message-time" style="color: #6b6b6b; font-size: 11px;">${timeStr}</span>
      <span class="provider-badge" style="
        color: ${providerColor};
        font-size: 11px;
        font-weight: 500;
        padding: 2px 8px;
        background: ${providerColor}15;
        border-radius: 4px;
        border: 1px solid ${providerColor}30;
      ">${providerName}</span>
    </div>
    <div class="message-action-buttons" style="display: flex; gap: 2px; opacity: 0.6; transition: opacity 0.2s;">
      <button class="message-action-btn copy-btn" title="Copy" style="
        width: 28px; height: 28px; border: none; background: transparent;
        border-radius: 4px; cursor: pointer; display: flex; align-items: center;
        justify-content: center; color: #808080; transition: all 0.15s; position: relative; z-index: 1;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
      <button class="message-action-btn like-btn" title="Good response" style="
        width: 28px; height: 28px; border: none; background: transparent;
        border-radius: 4px; cursor: pointer; display: flex; align-items: center;
        justify-content: center; color: #808080; transition: all 0.15s; position: relative; z-index: 1;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
        </svg>
      </button>
      <button class="message-action-btn dislike-btn" title="Bad response" style="
        width: 28px; height: 28px; border: none; background: transparent;
        border-radius: 4px; cursor: pointer; display: flex; align-items: center;
        justify-content: center; color: #808080; transition: all 0.15s; position: relative; z-index: 1;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
        </svg>
      </button>
      <button class="message-action-btn note-btn" title="Add note" style="
        width: 28px; height: 28px; border: none; background: transparent;
        border-radius: 4px; cursor: pointer; display: flex; align-items: center;
        justify-content: center; color: ${note ? '#ffd700' : '#808080'}; transition: all 0.15s; position: relative; z-index: 1;
      "${note ? ' data-has-note="true"' : ''}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>
      <button class="message-action-btn html-view-btn" title="View as document" style="
        width: 28px; height: 28px; border: none; background: transparent;
        border-radius: 4px; cursor: pointer; display: flex; align-items: center;
        justify-content: center; color: #808080; transition: all 0.15s; position: relative; z-index: 1;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      </button>
    </div>
  `;
  
  // Add hover effect for action buttons container
  const buttonsContainer = actionsContainer.querySelector('.message-action-buttons') as HTMLElement;
  if (buttonsContainer) {
    actionsContainer.addEventListener('mouseenter', () => {
      buttonsContainer.style.opacity = '1';
    });
    actionsContainer.addEventListener('mouseleave', () => {
      buttonsContainer.style.opacity = '0.6';
    });
  }
  
  // Add hover effect for individual buttons
  const buttons = actionsContainer.querySelectorAll('.message-action-btn');
  buttons.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      (btn as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
      (btn as HTMLElement).style.color = '#ffffff';
    });
    btn.addEventListener('mouseleave', () => {
      (btn as HTMLElement).style.background = 'transparent';
      // Restore original color (check for special states)
      const hasNote = btn.classList.contains('note-btn') && btn.getAttribute('data-has-note') === 'true';
      const isLiked = btn.classList.contains('like-btn') && btn.getAttribute('data-liked') === 'true';
      const isDisliked = btn.classList.contains('dislike-btn') && btn.getAttribute('data-disliked') === 'true';
      
      if (hasNote) {
        (btn as HTMLElement).style.color = '#ffd700';
      } else if (isLiked) {
        (btn as HTMLElement).style.color = '#4caf50';
      } else if (isDisliked) {
        (btn as HTMLElement).style.color = '#ff6b6b';
      } else {
        (btn as HTMLElement).style.color = '#808080';
      }
    });
  });
  
  // Add event listeners - matching original behavior
  setupActionListenersOriginal(actionsContainer, content, msgId);
  
  return actionsContainer;
}

// ============================================================================
// SETUP ACTION BUTTON LISTENERS - Matching Original Behavior
// ============================================================================

function setupActionListenersOriginal(container: HTMLElement, content: string, msgId?: string): void {
  // Copy button - with checkmark feedback
  const copyBtn = container.querySelector('.copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const plainText = content.replace(/<[^>]*>/g, '');
        await navigator.clipboard.writeText(plainText);
        // Show checkmark feedback
        copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2" style="pointer-events: none;"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        console.log('📋 Copy successful');
        if ((window as any).showNotification) {
          (window as any).showNotification('Copied to clipboard', 'success');
        }
        setTimeout(() => {
          copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        }, 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    });
  }
  
  // Like button - turns green when clicked
  const likeBtn = container.querySelector('.like-btn');
  if (likeBtn) {
    likeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('👍 Like clicked');
      const isLiked = likeBtn.getAttribute('data-liked') === 'true';
      likeBtn.setAttribute('data-liked', isLiked ? 'false' : 'true');
      (likeBtn as HTMLElement).style.color = isLiked ? '#808080' : '#4caf50';
      
      // Reset dislike if liking
      if (!isLiked) {
        const dislikeBtn = container.querySelector('.dislike-btn');
        if (dislikeBtn) {
          dislikeBtn.setAttribute('data-disliked', 'false');
          (dislikeBtn as HTMLElement).style.color = '#808080';
        }
      }
    });
  }
  
  // Dislike button - turns red when clicked
  const dislikeBtn = container.querySelector('.dislike-btn');
  if (dislikeBtn) {
    dislikeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('👎 Dislike clicked');
      const isDisliked = dislikeBtn.getAttribute('data-disliked') === 'true';
      dislikeBtn.setAttribute('data-disliked', isDisliked ? 'false' : 'true');
      (dislikeBtn as HTMLElement).style.color = isDisliked ? '#808080' : '#ff6b6b';
      
      // Reset like if disliking
      if (!isDisliked) {
        const likeBtn = container.querySelector('.like-btn');
        if (likeBtn) {
          likeBtn.setAttribute('data-liked', 'false');
          (likeBtn as HTMLElement).style.color = '#808080';
        }
      }
    });
  }
  
  // Note button - opens prompt for note, turns gold when note added
  const noteBtn = container.querySelector('.note-btn');
  if (noteBtn) {
    noteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('📝 Note clicked');
      const note = prompt('Add a note for this response:');
      if (note) {
        noteBtn.setAttribute('data-has-note', 'true');
        (noteBtn as HTMLElement).style.color = '#ffd700';
        console.log('Note added:', note);
        if ((window as any).showNotification) {
          (window as any).showNotification('Note added', 'success');
        }
        
        // TODO: Save note to conversation message if needed
        if (msgId) {
          const conv = conversationManager.getCurrentConversation();
          if (conv?.messages) {
            const msg = conv.messages.find((m: any) => m.id === msgId);
            if (msg) {
              msg.note = { content: note, createdAt: Date.now(), lastUpdated: Date.now() };
              conversationManager.saveConversations?.();
            }
          }
        }
      }
    });
  }
  
  // HTML View button - shows content in HTML modal
  const htmlViewBtn = container.querySelector('.html-view-btn');
  if (htmlViewBtn) {
    htmlViewBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('📄 HTML view clicked');
      try {
        // Try to use the global convertResponseToHTML function if available
        const convertFn = (window as any).convertResponseToHTML;
        if (typeof convertFn === 'function') {
          convertFn(content, 'ai-response');
        } else {
          // Fallback: show in simple modal
          showHTMLModal(content);
        }
      } catch (err) {
        console.error('HTML view failed:', err);
      }
    });
  }
}

// Simple HTML Modal fallback - Dark Theme
function showHTMLModal(content: string): void {
  // Remove existing modal if any
  const existingModal = document.querySelector('.html-view-modal');
  if (existingModal) existingModal.remove();
  
  const modal = document.createElement('div');
  modal.className = 'html-view-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100000;
    padding: 20px;
  `;
  
  modal.innerHTML = `
    <div class="html-modal-content" style="
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 8px;
      width: 90%;
      max-width: 900px;
      max-height: 85vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    ">
      <div class="html-modal-header" style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #3c3c3c;
        background: #252526;
      ">
        <span style="font-weight: 500; color: #e0e0e0;">Message Content</span>
        <button class="html-close-btn" style="
          width: 28px; height: 28px;
          background: transparent;
          border: none;
          border-radius: 4px;
          color: #808080;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        ">×</button>
      </div>
      <div class="html-modal-body" style="
        flex: 1;
        overflow: auto;
        padding: 20px;
        background: #1e1e1e;
      ">
        <style>
          .html-view-modal .html-content pre { background: #0d0d0d; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 12px 0; }
          .html-view-modal .html-content code { font-family: 'Cascadia Code', 'Fira Code', monospace; font-size: 13px; color: #d4d4d4; }
          .html-view-modal .html-content p { margin: 0 0 12px 0; }
          .html-view-modal .html-content ul, .html-view-modal .html-content ol { margin: 12px 0; padding-left: 24px; }
          .html-view-modal .html-content li { margin: 4px 0; }
          .html-view-modal .html-content strong { color: #4fc3f7; }
          .html-view-modal .html-content h1, .html-view-modal .html-content h2, .html-view-modal .html-content h3 { color: #e0e0e0; margin: 16px 0 8px 0; }
        </style>
        <div class="html-content" style="
          color: #e0e0e0;
          line-height: 1.6;
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        ">${content}</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close button with hover effect
  const closeBtn = modal.querySelector('.html-close-btn') as HTMLElement;
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.remove());
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = '#c42b1c';
      closeBtn.style.color = '#ffffff';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'transparent';
      closeBtn.style.color = '#808080';
    });
  }
  
  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  // Escape key to close
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
  
  if ((window as any).showNotification) {
    (window as any).showNotification('Document view opened', 'info');
  }
}

function setupActionListeners(container: HTMLElement, content: string, msgId?: string): void {
  setupActionListenersOriginal(container, content, msgId);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

function deleteMessageById(msgId: string): void {
  const conv = conversationManager.getCurrentConversation();
  if (!conv || !conv.messages) return;
  
  const msgIndex = conv.messages.findIndex((m: any) => m.id === msgId);
  if (msgIndex !== -1) {
    conv.messages.splice(msgIndex, 1);
    conv.lastUpdated = Date.now();
    
    // Remove from UI
    const msgElement = document.querySelector(`[data-message-id="${msgId}"]`);
    if (msgElement) {
      msgElement.classList.add('removing');
      setTimeout(() => msgElement.remove(), 200);
    }
    
    // Save
    conversationManager.saveConversations?.();
    showNotification('Message deleted', 'success');
  }
}

function showNotification(message: string, type: string): void {
  if ((window as any).showNotification) {
    (window as any).showNotification(message, type);
  }
}

// ============================================================================
// CSS STYLES FOR PROPER RENDERING - Clean Compact Layout
// ============================================================================

const styles = `
/* ==========================================================================
   CLEAN COMPACT MESSAGE LAYOUT - Matching Screenshot Style
   ========================================================================== */

/* Message Container */
.ai-message {
  padding: 12px 16px;
  margin: 4px 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
}

.ai-message.assistant-message {
  background: rgba(30, 30, 30, 0.6);
  border-color: rgba(255, 255, 255, 0.06);
}

.ai-message.user-message {
  background: rgba(79, 195, 247, 0.08);
  border-color: rgba(79, 195, 247, 0.15);
}

/* Message Content Formatting */
.ai-message-content {
  line-height: 1.6;
  font-size: 14px;
  color: #e0e0e0;
}

.ai-message-content p {
  margin: 0 0 10px 0;
}

.ai-message-content p:last-child {
  margin-bottom: 0;
}

.ai-message-content strong {
  font-weight: 600;
  color: #ffffff;
}

.ai-message-content em {
  font-style: italic;
}

/* Lists */
.ai-message-content .message-list {
  margin: 12px 0;
  padding-left: 8px;
  list-style: none;
}

.ai-message-content .message-list li {
  margin: 8px 0;
  padding-left: 8px;
  line-height: 1.5;
}

.ai-message-content ol.message-list li strong:first-child {
  color: #4fc3f7;
  margin-right: 4px;
}

/* Code */
.ai-message-content .code-block {
  background: #0d0d0d;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 12px;
  margin: 12px 0;
  overflow-x: auto;
}

.ai-message-content .code-block code {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  color: #e0e0e0;
}

.ai-message-content .inline-code {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.9em;
}

/* Links */
.ai-message-content a {
  color: #4fc3f7;
  text-decoration: none;
}

.ai-message-content a:hover {
  text-decoration: underline;
}

/* Message Actions Container - Matching Original */
.message-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 8px;
}

/* Message Actions Footer - Clean Compact Style */
.message-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0 4px 0;
  margin-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.message-footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-time {
  color: #6b6b6b;
  font-size: 11px;
}

.provider-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
}

.message-meta-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #6b6b6b;
}

.message-meta-inline .provider-separator {
  display: none;
}

.message-meta-inline .provider-text-minimal {
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(79, 195, 247, 0.1);
  border: 1px solid rgba(79, 195, 247, 0.2);
}

.message-action-buttons {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.message-actions:hover .message-action-buttons {
  opacity: 1;
}

/* Action Buttons - Compact Style */
.message-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #808080;
  cursor: pointer;
  transition: all 0.15s ease;
}

.message-action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.message-action-btn svg {
  width: 14px;
  height: 14px;
}

/* User Message Actions */
.user-message-actions {
  position: absolute;
  bottom: 8px;
  left: 8px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.user-message:hover .user-message-actions,
.ai-message.user-message:hover .user-message-actions {
  opacity: 1;
}

.user-message-actions .msg-action-btn {
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
}

.user-message-actions .msg-action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.user-message-actions .msg-action-btn svg {
  width: 14px;
  height: 14px;
}

/* Message removal animation */
.ai-message.removing {
  opacity: 0;
  transform: translateX(-20px);
  transition: all 0.2s ease;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('conversation-ui-fix-styles');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  const styleEl = document.createElement('style');
  styleEl.id = 'conversation-ui-fix-styles';
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
}

// ============================================================================
// EXPOSE GLOBALLY
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).processMessageContent = processMessageContent;
  (window as any).createUserMessageDeleteButton = createUserMessageDeleteButton;
  (window as any).createMessageActionsForLoading = createMessageActionsForLoading;
  
  console.log('✅ [UIFix] Message rendering functions loaded');
  console.log('✅ [UIFix] Markdown processing enabled');
}

export {};
