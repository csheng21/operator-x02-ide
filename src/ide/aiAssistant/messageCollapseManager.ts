// messageCollapseManager.ts
// Version 4.0 - LINKED USER-AI BUNDLES
// - USER message: NO buttons
// - Expand AI → expand USER too
// - Delete AI → delete USER too
// ============================================

let isInitialized = false;
let isManualExpanding = false;

const removedElementsMap = new WeakMap<HTMLElement, HTMLElement[]>();

/**
 * Look up the actual timestamp for a DOM message element from conversationManager.
 * This is needed because data-timestamp is not always set on DOM elements.
 */
function lookupMessageTimestamp(msgElement: HTMLElement): number | null {
  try {
    const cm = (window as any).conversationManager;
    if (!cm) return null;
    
    const conv = cm.getCurrentConversation?.();
    if (!conv?.messages?.length) return null;
    
    // Method 1: Match by data-message-id
    const msgId = msgElement.getAttribute('data-message-id');
    if (msgId) {
      const found = conv.messages.find((m: any) => m.id === msgId);
      if (found?.timestamp) return found.timestamp;
    }
    
    // Method 2: Match by index position in the chat container
    const container = msgElement.closest('.ai-chat-container, .chat-messages, #chat-container');
    if (container) {
      const allMsgs = container.querySelectorAll('.ai-message');
      const index = Array.from(allMsgs).indexOf(msgElement);
      if (index >= 0 && index < conv.messages.length) {
        const msg = conv.messages[index];
        if (msg?.timestamp) return msg.timestamp;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// Format timestamp to TIME for AI messages (e.g., "9:07 PM")
function formatToTime(timestamp?: string): string {
  try {
    if (!timestamp || timestamp.trim() === '') return '';
    
    let date: Date;
    const numericTimestamp = Number(timestamp);
    if (!isNaN(numericTimestamp) && numericTimestamp > 1000000000000) {
      date = new Date(numericTimestamp);
    } else if (!isNaN(numericTimestamp) && numericTimestamp > 1000000000) {
      date = new Date(numericTimestamp * 1000);
    } else {
      date = new Date(timestamp);
    }
    
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

// Format timestamp to DATE for user messages (e.g., "Feb 4")
function formatToDate(timestamp?: string): string {
  try {
    if (!timestamp || timestamp.trim() === '') return '';
    
    let date: Date;
    const numericTimestamp = Number(timestamp);
    if (!isNaN(numericTimestamp) && numericTimestamp > 1000000000000) {
      date = new Date(numericTimestamp);
    } else if (!isNaN(numericTimestamp) && numericTimestamp > 1000000000) {
      date = new Date(numericTimestamp * 1000);
    } else {
      date = new Date(timestamp);
    }
    
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const isThisYear = date.getFullYear() === now.getFullYear();
    if (isThisYear) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch {
    return '';
  }
}

function removeOriginalButtons(msg: HTMLElement): void {
  const selectorsToRemove = [
    '.enh-message-actions', '.message-actions', '.ai-message-footer',
    '.user-message-actions', '.message-toolbar', '[class*="action-button"]',
    '[class*="delete-btn"]', '.enh-delete-btn', '.enh-action-btn',
    'button[title="Delete"]', 'button[title*="Delete"]',
  ];
  const removed: HTMLElement[] = [];
  selectorsToRemove.forEach(selector => {
    msg.querySelectorAll(selector).forEach(el => {
      const element = el as HTMLElement;
      element.remove();
      removed.push(element);
    });
  });
  if (removed.length > 0) removedElementsMap.set(msg, removed);
}

function restoreOriginalButtons(msg: HTMLElement): void {
  const removed = removedElementsMap.get(msg);
  if (!removed || removed.length === 0) return;
  removed.reverse().forEach(element => msg.appendChild(element));
  removedElementsMap.delete(msg);
}

function removeAllGaps(): void {
  const containers = document.querySelectorAll('.ai-chat-container, .chat-messages, #chat-container');
  containers.forEach(container => {
    const el = container as HTMLElement;
    el.style.setProperty('gap', '0', 'important');
    el.style.setProperty('row-gap', '0', 'important');
  });

  document.querySelectorAll('.ai-message.ai-message-collapsed').forEach(msg => {
    const el = msg as HTMLElement;
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('margin-top', '0', 'important');
    el.style.setProperty('margin-bottom', '0', 'important');
    el.style.setProperty('border-top', 'none', 'important');
  });

  // USER after AI = NEW BUNDLE = add gap
  document.querySelectorAll('.ai-message.assistant-message.ai-message-collapsed + .ai-message.user-message.ai-message-collapsed').forEach(msg => {
    const el = msg as HTMLElement;
    el.style.setProperty('margin-top', '12px', 'important');
    el.style.setProperty('border-top', '1px solid rgba(255,255,255,0.08)', 'important');
  });

  // Style expanded messages
  styleExpandedMessages();
  
  console.log('🔧 [Gaps] Applied');
}

function removeAllGapsSilent(): void {
  const containers = document.querySelectorAll('.ai-chat-container, .chat-messages, #chat-container');
  containers.forEach(container => {
    const el = container as HTMLElement;
    el.style.setProperty('gap', '0', 'important');
    el.style.setProperty('row-gap', '0', 'important');
  });

  document.querySelectorAll('.ai-message.ai-message-collapsed').forEach(msg => {
    const el = msg as HTMLElement;
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('margin-top', '0', 'important');
    el.style.setProperty('margin-bottom', '0', 'important');
    el.style.setProperty('border-top', 'none', 'important');
  });

  document.querySelectorAll('.ai-message.assistant-message.ai-message-collapsed + .ai-message.user-message.ai-message-collapsed').forEach(msg => {
    const el = msg as HTMLElement;
    el.style.setProperty('margin-top', '12px', 'important');
    el.style.setProperty('border-top', '1px solid rgba(255,255,255,0.08)', 'important');
  });

  // Style expanded/new messages
  styleExpandedMessages();
}

/**
 * Style all expanded (non-collapsed) messages - IDE STYLE
 */
function styleExpandedMessages(): void {
  // Style expanded USER messages - IDE STYLE
  document.querySelectorAll('.ai-message.user-message:not(.ai-message-collapsed)').forEach(msg => {
    const el = msg as HTMLElement;
    if (el.dataset.expandedStyled === 'true') return;
    
    el.style.cssText = `
      width: 100% !important;
      max-width: 100% !important;
      min-width: 100% !important;
      background: rgba(59, 130, 246, 0.04) !important;
      border: none !important;
      border-radius: 0 !important;
      padding: 6px 10px !important;
      margin: 0 !important;
      margin-top: 8px !important;
      position: relative !important;
      box-sizing: border-box !important;
      font-size: 13px !important;
      line-height: 1.4 !important;
    `;
    
    el.dataset.expandedStyled = 'true';
  });
  
  // Style expanded AI messages - IDE STYLE
  document.querySelectorAll('.ai-message.assistant-message:not(.ai-message-collapsed)').forEach(msg => {
    const el = msg as HTMLElement;
    if (el.dataset.expandedStyled === 'true' || el.classList.contains('streaming')) return;
    
    el.style.cssText = `
      width: 100% !important;
      max-width: 100% !important;
      min-width: 100% !important;
      background: rgba(139, 92, 246, 0.03) !important;
      border: none !important;
      border-radius: 0 !important;
      padding: 6px 10px !important;
      margin: 0 !important;
      margin-top: 2px !important;
      position: relative !important;
      box-sizing: border-box !important;
      font-size: 13px !important;
      line-height: 1.4 !important;
    `;
    
    // Minimal collapse button - IDE style
    if (!el.querySelector('.message-collapse-btn-bottom')) {
      const bottomBtn = document.createElement('div');
      bottomBtn.className = 'message-collapse-btn-bottom';
      bottomBtn.innerHTML = '▲';
      bottomBtn.title = 'Collapse';
      bottomBtn.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-top: 4px;
        padding: 2px 6px;
        background: transparent;
        color: #6b7280;
        font-size: 9px;
        cursor: pointer;
        border-radius: 2px;
        border: 1px solid rgba(255,255,255,0.08);
      `;
      bottomBtn.onmouseenter = () => {
        bottomBtn.style.background = 'rgba(255,255,255,0.05)';
        bottomBtn.style.color = '#9ca3af';
      };
      bottomBtn.onmouseleave = () => {
        bottomBtn.style.background = 'transparent';
        bottomBtn.style.color = '#6b7280';
      };
      bottomBtn.onclick = (e) => { 
        e.stopPropagation(); 
        const userMsg = el.previousElementSibling as HTMLElement;
        const hasUserPair = userMsg?.classList.contains('user-message');
        
        el.dataset.expandedStyled = 'false';
        if (hasUserPair) userMsg.dataset.expandedStyled = 'false';
        
        if (hasUserPair) collapseSingleMessage(userMsg);
        collapseSingleMessage(el); 
      };
      el.appendChild(bottomBtn);
    }
    
    el.dataset.expandedStyled = 'true';
  });
}

export function initMessageCollapse(): void {
  if (isInitialized) return;

  if (!document.getElementById('ai-message-collapse-styles')) {
    const style = document.createElement('style');
    style.id = 'ai-message-collapse-styles';
    style.textContent = `
      .ai-message.ai-message-collapsed {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
      }
      
      .ai-message.assistant-message.ai-message-collapsed + .ai-message.user-message.ai-message-collapsed {
        margin-top: 12px !important;
        border-top: 1px solid rgba(255,255,255,0.08) !important;
      }
      
      .ai-message:not(.ai-message-collapsed) {
        margin-top: 20px !important;
        margin-bottom: 8px !important;
      }
      
      .ai-message.ai-message-collapsed .ai-message-content,
      .ai-message.ai-message-collapsed .user-message-content,
      .ai-message.ai-message-collapsed .message-content {
        display: none !important;
      }
      
      /* ===== EXPANDED MESSAGE STYLES ===== */
      
      /* Expanded USER message */
      .ai-message.user-message:not(.ai-message-collapsed) {
        background: rgba(59, 130, 246, 0.04) !important;
        border: none !important;
        border-radius: 4px !important;
        padding: 8px 12px !important;
        margin-top: 12px !important;
        margin-bottom: 4px !important;
      }
      
      /* Expanded AI message */
      .ai-message.assistant-message:not(.ai-message-collapsed) {
        background: rgba(139, 92, 246, 0.03) !important;
        border: none !important;
        border-radius: 4px !important;
        padding: 8px 12px !important;
        margin-top: 4px !important;
        margin-bottom: 4px !important;
      }
      
      /* Expanded message header label */
      .expanded-message-label {
        display: inline-flex !important;
        align-items: center !important;
        gap: 8px !important;
        margin-bottom: 8px !important;
        padding-bottom: 8px !important;
        border-bottom: 1px solid rgba(255,255,255,0.06) !important;
        width: 100% !important;
      }
      
      .expanded-role-badge {
        font-size: 10px !important;
        font-weight: 700 !important;
        padding: 3px 8px !important;
        border-radius: 4px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
      }
      
      .expanded-role-badge.user {
        background: rgba(59, 130, 246, 0.3) !important;
        color: #93c5fd !important;
      }
      
      .expanded-role-badge.assistant {
        background: rgba(139, 92, 246, 0.3) !important;
        color: #c4b5fd !important;
      }
      
      .expanded-date {
        font-size: 11px !important;
        color: #6b7280 !important;
        margin-left: auto !important;
      }
      
      .message-collapse-btn-top {
        position: absolute !important;
        top: 8px !important;
        right: 8px !important;
        width: 26px !important;
        height: 26px !important;
        background: rgba(255,255,255,0.08) !important;
        color: #9ca3af !important;
        font-size: 11px !important;
        cursor: pointer !important;
        border-radius: 5px !important;
        border: 1px solid rgba(255,255,255,0.1) !important;
        opacity: 0 !important;
        z-index: 5 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: all 0.15s !important;
      }
      
      .ai-message:hover .message-collapse-btn-top {
        opacity: 1 !important;
      }
      
      .message-collapse-btn-top:hover {
        background: rgba(88, 166, 255, 0.2) !important;
        border-color: rgba(88, 166, 255, 0.4) !important;
        color: #58a6ff !important;
      }
      
      .message-collapse-btn-bottom {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        margin-top: 12px !important;
        padding: 6px 14px !important;
        background: rgba(255,255,255,0.06) !important;
        color: #9ca3af !important;
        font-size: 11px !important;
        cursor: pointer !important;
        border-radius: 5px !important;
        border: 1px solid rgba(255,255,255,0.1) !important;
        transition: all 0.15s !important;
      }
      
      .message-collapse-btn-bottom:hover {
        background: rgba(88, 166, 255, 0.15) !important;
        border-color: rgba(88, 166, 255, 0.3) !important;
        color: #58a6ff !important;
      }
      
      .ai-chat-container, .chat-messages {
        gap: 0 !important;
      }
    `;
    document.head.appendChild(style);
  }

  removeAllGaps();
  setInterval(removeAllGapsSilent, 1000);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement && node.classList.contains('ai-message')) {
          setTimeout(() => {
            if (isManualExpanding) return;
            const messages = document.querySelectorAll('.ai-message:not(.ai-message-collapsed):not(.streaming)');
            if (messages.length > 1) {
              messages.forEach((msg, index) => {
                if (index < messages.length - 1) collapseSingleMessage(msg as HTMLElement);
              });
            }
            removeAllGapsSilent();
          }, 100);
        }
      });
    });
  });

  const chatContainer = document.querySelector('.ai-chat-container, .chat-messages, #chat-container');
  if (chatContainer) observer.observe(chatContainer, { childList: true, subtree: false });

  isInitialized = true;
  console.log('✅ [MessageCollapse] v4.0 - Linked Bundles');
}

export function collapseAllMessages(): void {
  const messages = document.querySelectorAll('.ai-message:not(.ai-message-collapsed):not(.streaming)');
  messages.forEach(msg => collapseSingleMessage(msg as HTMLElement));
  removeAllGapsSilent();
}

export function expandAllMessages(): void {
  document.querySelectorAll('.ai-message.ai-message-collapsed').forEach(msg => {
    const header = msg.querySelector('.ai-message-collapsed-header');
    if (header) (header as HTMLElement).click();
  });
}

export function forceCollapseAfterLoad(): void {
  setTimeout(() => {
    const messages = document.querySelectorAll('.ai-message:not(.ai-message-collapsed):not(.streaming)');
    if (messages.length > 1) collapseAllMessages();
    removeAllGapsSilent();
  }, 100);
}

/**
 * Expand a message bundle (USER + AI) - COMPACT
 */
function expandBundle(aiMsg: HTMLElement, userMsg: HTMLElement | null): void {
  isManualExpanding = true;
  
  // Expand USER message first (if exists)
  if (userMsg && userMsg.classList.contains('ai-message-collapsed')) {
    const userHeader = userMsg.querySelector('.ai-message-collapsed-header');
    if (userHeader) userHeader.remove();
    userMsg.classList.remove('ai-message-collapsed');
    restoreOriginalButtons(userMsg);
    
    // IDE STYLE USER - flat, compact
    userMsg.style.cssText = `
      width: 100% !important;
      max-width: 100% !important;
      min-width: 100% !important;
      background: rgba(59, 130, 246, 0.04) !important;
      border: none !important;
      border-radius: 0 !important;
      padding: 6px 10px !important;
      margin: 0 !important;
      margin-top: 8px !important;
      position: relative !important;
      box-sizing: border-box !important;
      font-size: 13px !important;
      line-height: 1.4 !important;
    `;
    
    userMsg.dataset.expandedStyled = 'true';
  }
  
  // Expand AI message
  const aiHeader = aiMsg.querySelector('.ai-message-collapsed-header');
  if (aiHeader) aiHeader.remove();
  aiMsg.classList.remove('ai-message-collapsed');
  restoreOriginalButtons(aiMsg);
  
  // IDE STYLE AI - flat, compact
  aiMsg.style.cssText = `
    width: 100% !important;
    max-width: 100% !important;
    min-width: 100% !important;
    background: rgba(139, 92, 246, 0.03) !important;
    border: none !important;
    border-radius: 0 !important;
    padding: 6px 10px !important;
    margin: 0 !important;
    margin-top: 2px !important;
    position: relative !important;
    box-sizing: border-box !important;
    font-size: 13px !important;
    line-height: 1.4 !important;
  `;
  
  // IDE style collapse button (top) - minimal
  const topBtn = document.createElement('span');
  topBtn.className = 'message-collapse-btn-top';
  topBtn.innerHTML = '▲';
  topBtn.style.cssText = `
    position: absolute;
    top: 4px;
    right: 4px;
    width: 18px;
    height: 18px;
    background: transparent;
    color: #6b7280;
    font-size: 9px;
    cursor: pointer;
    border-radius: 2px;
    border: 1px solid rgba(255,255,255,0.08);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
  `;
  topBtn.onmouseenter = () => {
    topBtn.style.background = 'rgba(255,255,255,0.05)';
    topBtn.style.color = '#9ca3af';
  };
  topBtn.onmouseleave = () => {
    topBtn.style.background = 'transparent';
    topBtn.style.color = '#6b7280';
  };
  topBtn.onclick = (e) => { 
    e.stopPropagation(); 
    if (userMsg) {
      userMsg.dataset.expandedStyled = 'false';
      collapseSingleMessage(userMsg);
    }
    aiMsg.dataset.expandedStyled = 'false';
    collapseSingleMessage(aiMsg); 
  };
  aiMsg.appendChild(topBtn);
  
  // Show top button on hover
  aiMsg.onmouseenter = () => { topBtn.style.opacity = '1'; };
  aiMsg.onmouseleave = () => { topBtn.style.opacity = '0'; };
  
  const bottomBtn = document.createElement('div');
  bottomBtn.className = 'message-collapse-btn-bottom';
  bottomBtn.innerHTML = '▲';
  bottomBtn.title = 'Collapse';
  bottomBtn.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: 4px;
    padding: 2px 6px;
    background: transparent;
    color: #6b7280;
    font-size: 9px;
    cursor: pointer;
    border-radius: 2px;
    border: 1px solid rgba(255,255,255,0.08);
  `;
  bottomBtn.onmouseenter = () => {
    bottomBtn.style.background = 'rgba(255,255,255,0.05)';
    bottomBtn.style.color = '#9ca3af';
  };
  bottomBtn.onmouseleave = () => {
    bottomBtn.style.background = 'transparent';
    bottomBtn.style.color = '#6b7280';
  };
  bottomBtn.onclick = (e) => { 
    e.stopPropagation(); 
    if (userMsg) {
      userMsg.dataset.expandedStyled = 'false';
      collapseSingleMessage(userMsg);
    }
    aiMsg.dataset.expandedStyled = 'false';
    collapseSingleMessage(aiMsg); 
  };
  aiMsg.appendChild(bottomBtn);
  aiMsg.dataset.expandedStyled = 'true';
  
  // 🔧 FIX PROVIDER BADGE: Update to match data-provider attribute
  const savedProvider = aiMsg.getAttribute('data-provider');
  if (savedProvider) {
    const providerEl = aiMsg.querySelector('.provider-text-minimal, .provider-badge, .provider-text');
    if (providerEl) {
      // Get display name and color for the saved provider
      const providerMap: Record<string, { name: string; color: string }> = {
        'groq': { name: 'Groq', color: '#f55036' },
        'openai': { name: 'OpenAI', color: '#10a37f' },
        'claude': { name: 'Claude', color: '#cc785c' },
        'anthropic': { name: 'Claude', color: '#cc785c' },
        'gemini': { name: 'Gemini', color: '#4285f4' },
        'deepseek': { name: 'DeepSeek', color: '#0066ff' },
        'ollama': { name: 'Ollama', color: '#888888' },
        'operator_x02': { name: 'X02', color: '#8b5cf6' },
        'x02': { name: 'X02', color: '#8b5cf6' },
      };
      
      const lowerProvider = savedProvider.toLowerCase();
      let displayInfo = { name: savedProvider, color: '#808080' };
      
      for (const [key, info] of Object.entries(providerMap)) {
        if (lowerProvider.includes(key) || key.includes(lowerProvider)) {
          displayInfo = info;
          break;
        }
      }
      
      (providerEl as HTMLElement).textContent = displayInfo.name;
      (providerEl as HTMLElement).style.color = displayInfo.color;
      console.log(`🔧 [Expand] Fixed provider badge: ${savedProvider} → ${displayInfo.name}`);
    }
  }

  setTimeout(() => { isManualExpanding = false; }, 100);
}

/**
 * Delete a message bundle (USER + AI)
 */
function deleteBundle(aiMsg: HTMLElement, userMsg: HTMLElement | null): void {
  if (userMsg) userMsg.remove();
  aiMsg.remove();
}

/**
 * Collapse a single message - USER has no buttons, AI has buttons
 */
export function collapseSingleMessage(msg: HTMLElement): void {
  if (msg.classList.contains('ai-message-collapsed') || msg.classList.contains('streaming')) return;
  
  const content = msg.querySelector('.ai-message-content, .user-message-content, .message-content');
  if (!content) return;

  const isUser = msg.classList.contains('user-message');
  
  // 🔧 SAVE PROVIDER INFO BEFORE COLLAPSING (for AI messages)
  if (!isUser && !msg.getAttribute('data-provider')) {
    const providerEl = msg.querySelector('.provider-text-minimal, .provider-badge, .provider-text, .enh-provider-badge');
    if (providerEl?.textContent) {
      msg.setAttribute('data-provider', providerEl.textContent.trim());
    }
  }

  removeOriginalButtons(msg);
  msg.querySelector('.message-collapse-btn-top')?.remove();
  msg.querySelector('.message-collapse-btn-bottom')?.remove();
  
  let preview = (content.textContent || '').replace(/\s+/g, ' ').trim();
  if (preview.length > 35) preview = preview.substring(0, 35) + '...';
  if (preview.length === 0) preview = isUser ? 'User message' : 'AI Response';

  // Get timestamp from multiple sources
  const actions = msg.querySelector('.message-actions, .enh-message-actions, .ai-message-footer');
  const timeElement = actions?.querySelector('.message-time, .enh-message-time') || 
                      msg.querySelector('.message-time, .enh-message-time');
  const timeText = timeElement?.textContent?.trim() || '';
  const msgTimestamp = msg.getAttribute('data-timestamp') || '';
  
  // Try to look up the actual timestamp from conversationManager
  const lookedUpTimestamp = !msgTimestamp ? lookupMessageTimestamp(msg) : null;
  
  // Try to parse timestamp from timeText if it looks like a time (e.g., "9:44 PM")
  let dateStr = '';
  let timeStr = '';
  
  if (msgTimestamp) {
    // Have numeric timestamp from DOM attribute
    dateStr = formatToDate(msgTimestamp);
    timeStr = formatToTime(msgTimestamp);
  } else if (lookedUpTimestamp) {
    // Found timestamp from conversationManager
    dateStr = formatToDate(String(lookedUpTimestamp));
    timeStr = formatToTime(String(lookedUpTimestamp));
  } else if (timeText) {
    // Try to parse existing time text
    // If it looks like just time (e.g., "9:44 PM"), try nearby messages for date
    if (/^\d{1,2}:\d{2}\s*(AM|PM)?$/i.test(timeText)) {
      timeStr = timeText;
      // Don't use new Date() - leave dateStr empty, will be resolved below
      dateStr = '';
    } else {
      // Try to parse as full date/time
      dateStr = formatToDate(timeText);
      timeStr = formatToTime(timeText) || timeText;
    }
  }

  // ========== CREATE HEADER ==========
  const header = document.createElement('div');
  header.className = 'ai-message-collapsed-header';
  header.style.cssText = `
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    width: 100%;
    height: 32px;
    padding: 0 12px;
    box-sizing: border-box;
    cursor: ${isUser ? 'default' : 'pointer'};
  `;

  // PREVIEW TEXT (no role badge - cleaner look)
  const previewSpan = document.createElement('span');
  previewSpan.textContent = preview;
  previewSpan.style.cssText = `
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: #9ca3af;
  `;

  header.appendChild(previewSpan);
  
  // DATE - Only for USER messages
  if (isUser) {
    // If no date, try to get from the paired AI message (next sibling)
    let displayDate = dateStr;
    if (!displayDate) {
      const aiMsg = msg.nextElementSibling as HTMLElement | null;
      if (aiMsg?.classList.contains('assistant-message')) {
        const aiTimestamp = aiMsg.getAttribute('data-timestamp') || '';
        const aiLookedUp = !aiTimestamp ? lookupMessageTimestamp(aiMsg) : null;
        
        if (aiTimestamp) {
          displayDate = formatToDate(aiTimestamp);
        } else if (aiLookedUp) {
          displayDate = formatToDate(String(aiLookedUp));
        }
      }
    }
    
    // Fallback: try looking up THIS message's timestamp from conversationManager
    if (!displayDate) {
      const selfTimestamp = lookupMessageTimestamp(msg);
      if (selfTimestamp) {
        displayDate = formatToDate(String(selfTimestamp));
      }
    }
    
    // Last resort fallback - only if all lookups failed
    if (!displayDate) {
      displayDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    const dateSpan = document.createElement('span');
    dateSpan.textContent = displayDate;
    dateSpan.style.cssText = `
      flex-shrink: 0;
      white-space: nowrap;
      font-size: 11px;
      color: #6b7280;
      margin: 0 12px;
      min-width: 50px;
      text-align: right;
    `;
    header.appendChild(dateSpan);
  }

  // ========== AI MESSAGE: ADD PROVIDER BADGE + BUTTONS ==========
  if (!isUser) {
    // Find paired USER message (previous sibling)
    const userMsg = msg.previousElementSibling as HTMLElement | null;
    const hasUserPair = userMsg?.classList.contains('user-message') || false;

    // Get provider name - ONLY from data-provider attribute
    let providerName = msg.getAttribute('data-provider') || '';
    
    // ⚠️ NO FALLBACK METHODS - Old messages without data-provider show no badge
    // This is intentional to avoid showing wrong provider info
    
    // Format provider name nicely
    if (providerName) {
      // Special formatting for known providers - check BEFORE other transformations
      const lowerName = providerName.toLowerCase();
      const displayNames: Record<string, string> = {
        'operator x02': 'X02',
        'operator_x02': 'X02',
        'operatorx02': 'X02',
        'x02': 'X02',
        'openai': 'OpenAI',
        'deepseek': 'DeepSeek',
        'groq': 'Groq',
        'claude': 'Claude',
        'gemini': 'Gemini',
        'ollama': 'Ollama',
      };
      
      let matched = false;
      for (const [key, display] of Object.entries(displayNames)) {
        if (lowerName.includes(key)) {
          providerName = display;
          matched = true;
          break;
        }
      }
      
      // If not matched, clean up the name
      if (!matched) {
        providerName = providerName
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c: string) => c.toUpperCase());
      }
    }
    
    // Provider colors mapping
    const providerColors: Record<string, { bg: string; text: string }> = {
      'groq': { bg: 'rgba(245, 80, 54, 0.2)', text: '#f55036' },
      'openai': { bg: 'rgba(16, 163, 127, 0.2)', text: '#10a37f' },
      'gpt': { bg: 'rgba(16, 163, 127, 0.2)', text: '#10a37f' },
      'claude': { bg: 'rgba(204, 120, 92, 0.2)', text: '#cc785c' },
      'anthropic': { bg: 'rgba(204, 120, 92, 0.2)', text: '#cc785c' },
      'gemini': { bg: 'rgba(66, 133, 244, 0.2)', text: '#4285f4' },
      'google': { bg: 'rgba(66, 133, 244, 0.2)', text: '#4285f4' },
      'deepseek': { bg: 'rgba(0, 102, 255, 0.2)', text: '#0066ff' },
      'ollama': { bg: 'rgba(128, 128, 128, 0.2)', text: '#888888' },
      'operator': { bg: 'rgba(139, 92, 246, 0.2)', text: '#8b5cf6' },
      'x02': { bg: 'rgba(139, 92, 246, 0.2)', text: '#8b5cf6' },
      'llama': { bg: 'rgba(245, 80, 54, 0.2)', text: '#f55036' },
    };
    
    // Find matching color
    const providerLower = providerName.toLowerCase();
    let providerStyle = { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa' }; // Default purple
    for (const [key, style] of Object.entries(providerColors)) {
      if (providerLower.includes(key)) {
        providerStyle = style;
        break;
      }
    }

    // ========== META WRAPPER (Badge + Time) - Visible by default ==========
    const metaWrapper = document.createElement('span');
    metaWrapper.className = 'collapse-meta-wrapper';
    metaWrapper.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      transition: opacity 0.15s ease;
    `;

    // PROVIDER BADGE
    if (providerName) {
      const providerBadge = document.createElement('span');
      providerBadge.className = 'collapse-provider-badge';
      providerBadge.textContent = providerName;
      providerBadge.style.cssText = `
        flex-shrink: 0;
        padding: 2px 8px;
        font-size: 10px;
        font-weight: 500;
        border-radius: 4px;
        background: ${providerStyle.bg};
        color: ${providerStyle.text};
        white-space: nowrap;
      `;
      metaWrapper.appendChild(providerBadge);
    }
    
    // TIME
    if (timeStr) {
      const timeSpan = document.createElement('span');
      timeSpan.textContent = timeStr;
      timeSpan.style.cssText = `
        flex-shrink: 0;
        white-space: nowrap;
        font-size: 11px;
        color: #6b7280;
        min-width: 60px;
        text-align: right;
      `;
      metaWrapper.appendChild(timeSpan);
    }

    header.appendChild(metaWrapper);

    // ========== BUTTON WRAPPER (Expand + Delete) - Hidden by default ==========
    const btnWrapper = document.createElement('span');
    btnWrapper.className = 'collapse-btn-wrapper';
    btnWrapper.style.cssText = `
      display: none;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    `;

    // EXPAND BUTTON (with SVG icon)
    const expandBtn = document.createElement('span');
    expandBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    expandBtn.title = 'Expand';
    expandBtn.className = 'collapse-expand-btn';
    expandBtn.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: rgba(88, 166, 255, 0.15);
      color: #58a6ff;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
    `;
    expandBtn.onmouseenter = () => {
      expandBtn.style.background = 'rgba(88, 166, 255, 0.3)';
    };
    expandBtn.onmouseleave = () => {
      expandBtn.style.background = 'rgba(88, 166, 255, 0.15)';
    };

    // DELETE BUTTON (with SVG icon)
    const deleteBtn = document.createElement('span');
    deleteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    deleteBtn.title = 'Delete';
    deleteBtn.className = 'collapse-delete-btn';
    deleteBtn.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: rgba(248, 81, 73, 0.15);
      color: #f85149;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
    `;
    deleteBtn.onmouseenter = () => {
      deleteBtn.style.background = 'rgba(248, 81, 73, 0.3)';
    };
    deleteBtn.onmouseleave = () => {
      deleteBtn.style.background = 'rgba(248, 81, 73, 0.15)';
    };

    btnWrapper.appendChild(expandBtn);
    btnWrapper.appendChild(deleteBtn);
    header.appendChild(btnWrapper);
    
    // ========== HOVER SWAP: Meta ↔ Buttons ==========
    header.onmouseenter = () => {
      metaWrapper.style.display = 'none';
      btnWrapper.style.display = 'inline-flex';
    };
    header.onmouseleave = () => {
      metaWrapper.style.display = 'inline-flex';
      btnWrapper.style.display = 'none';
    };

    // Event handlers for AI message
    expandBtn.onclick = (e) => { 
      e.stopPropagation(); 
      expandBundle(msg, hasUserPair ? userMsg : null);
    };
    
    deleteBtn.onclick = (e) => { 
      e.stopPropagation(); 
      deleteBundle(msg, hasUserPair ? userMsg : null);
    };
    
    header.onclick = (e) => {
      if (e.target !== deleteBtn && e.target !== expandBtn) {
        expandBundle(msg, hasUserPair ? userMsg : null);
      }
    };
  }
  // USER MESSAGE: NO BUTTONS, NO CLICK HANDLERS

  // Apply to message
  msg.insertBefore(header, msg.firstChild);
  msg.classList.add('ai-message-collapsed');
  
  msg.style.cssText = `
    width: 100% !important;
    max-width: 100% !important;
    min-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    height: 32px !important;
    min-height: 32px !important;
    max-height: 32px !important;
    border-radius: 0 !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
    background: ${isUser 
      ? 'rgba(59, 130, 246, 0.06)' 
      : 'rgba(139, 92, 246, 0.04)'} !important;
    border: none !important;
    border-bottom: 1px solid rgba(255,255,255,0.04) !important;
  `;
}

export function forceNoGap(): void {
  removeAllGaps();
  console.log('🔧 [ForceNoGap] Applied');
}

export function fixButtonStyles(): void {
  console.log('🔧 Button styles fixed');
}

export function fixMessageWidths(): void {
  document.querySelectorAll('.ai-message.ai-message-collapsed').forEach(msg => {
    const el = msg as HTMLElement;
    el.style.width = '100%';
    el.style.maxWidth = '100%';
  });
}

/**
 * Refresh all collapsed messages with new format
 * Call this after updating the collapse code to apply new styling
 */
export function refreshAllCollapsed(): void {
  console.log('🔄 [MessageCollapse] Refreshing all collapsed messages...');
  
  // Get all collapsed messages
  const collapsedMessages = document.querySelectorAll('.ai-message.ai-message-collapsed');
  const count = collapsedMessages.length;
  
  if (count === 0) {
    console.log('ℹ️ [MessageCollapse] No collapsed messages to refresh');
    return;
  }
  
  // Expand all first
  collapsedMessages.forEach(msg => {
    const el = msg as HTMLElement;
    const header = el.querySelector('.ai-message-collapsed-header');
    if (header) header.remove();
    el.classList.remove('ai-message-collapsed');
    
    // Restore content visibility
    const content = el.querySelector('.ai-message-content, .user-message-content, .message-content') as HTMLElement;
    if (content) {
      content.style.display = '';
    }
  });
  
  // Small delay then re-collapse
  setTimeout(() => {
    document.querySelectorAll('.ai-message:not(.streaming)').forEach(msg => {
      const el = msg as HTMLElement;
      // Skip the last AI message (keep it expanded)
      const isLastAI = el.classList.contains('assistant-message') && !el.nextElementSibling?.classList.contains('assistant-message');
      if (!isLastAI) {
        collapseSingleMessage(el);
      }
    });
    console.log(`✅ [MessageCollapse] Refreshed ${count} messages`);
  }, 100);
}

if (typeof window !== 'undefined') {
  (window as any).messageCollapse = {
    init: initMessageCollapse,
    collapseAll: collapseAllMessages,
    expandAll: expandAllMessages,
    forceCollapse: forceCollapseAfterLoad,
    collapseSingle: collapseSingleMessage,
    fixStyles: fixButtonStyles,
    fixWidths: fixMessageWidths,
    forceNoGap: forceNoGap,
    refresh: refreshAllCollapsed,  // 🆕 Add refresh function
  };
  (window as any).collapseAllMessages = collapseAllMessages;
  (window as any).expandAllMessages = expandAllMessages;
  (window as any).forceNoGap = forceNoGap;
  (window as any).refreshCollapsedMessages = refreshAllCollapsed;  // 🆕 Expose globally
}
