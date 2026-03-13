// messageCollapseManager.ts
// Auto-collapse previous AI messages when new response arrives
// Features: Toggle collapse/expand, collapse button (top + bottom)
// INSTANT collapse/expand - no animations
// FIXED: z-index to not block code block buttons
// ============================================
// 🔧 FIXED: Now collapses on conversation load/IDE reset
// ============================================

let isInitialized = false;
let isManualExpanding = false;

/**
 * Initialize the auto-collapse system
 * Call this once in main.ts init()
 */
export function initMessageCollapse(): void {
  if (isInitialized) return;

  // Inject CSS - no animations, proper z-index
  if (!document.getElementById('ai-message-collapse-styles')) {
    const style = document.createElement('style');
    style.id = 'ai-message-collapse-styles';
    style.textContent = `
      /* ============================================ */
      /* BASE MESSAGE                                 */
      /* ============================================ */
      .ai-message.assistant-message {
        position: relative;
      }

      /* ============================================ */
      /* COLLAPSED STATE                              */
      /* ============================================ */
      .ai-message.ai-message-collapsed {
        background: linear-gradient(135deg, #1a1f25 0%, #171b21 100%) !important;
        border: 1px solid #30363d !important;
        border-left: 3px solid #ffc107 !important;
        border-radius: 8px !important;
        padding: 0 !important;
        margin-bottom: 8px !important;
        cursor: pointer !important;
        overflow: hidden;
        min-height: 44px !important;
      }

      .ai-message.ai-message-collapsed:hover {
        border-color: #58a6ff !important;
        border-left-color: #58a6ff !important;
        background: linear-gradient(135deg, #1e252d 0%, #1a1f25 100%) !important;
      }

      .ai-message.ai-message-collapsed .ai-message-content,
      .ai-message.ai-message-collapsed .message-actions,
      .ai-message.ai-message-collapsed .enh-message-actions,
      .ai-message.ai-message-collapsed .ai-message-footer {
        display: none !important;
      }

      /* ============================================ */
      /* COLLAPSED HEADER                             */
      /* ============================================ */
      .ai-message-collapsed-header {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        padding: 12px 14px !important;
        cursor: pointer !important;
        min-height: 44px !important;
        box-sizing: border-box;
      }

      .collapsed-chevron { 
        color: #58a6ff; 
        flex-shrink: 0;
        width: 16px;
        height: 16px;
        transition: transform 0.2s ease;
      }

      .ai-message.ai-message-collapsed:hover .collapsed-chevron {
        transform: translateX(3px);
      }

      .collapsed-preview-text {
        color: #8b949e;
        font-size: 13px !important;
        line-height: 1.4 !important;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
      }

      .ai-message.ai-message-collapsed:hover .collapsed-preview-text {
        color: #c9d1d9;
      }

      .collapsed-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px !important;
        color: #6e7681;
        flex-shrink: 0;
        white-space: nowrap;
      }

      .collapsed-badge {
        padding: 2px 6px;
        background: rgba(255, 193, 7, 0.15);
        border: 1px solid rgba(255, 193, 7, 0.3);
        border-radius: 3px;
        font-size: 9px;
        font-weight: 600;
        color: #ffc107;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* ============================================ */
      /* TOP COLLAPSE BUTTON (shows on hover)         */
      /* Low z-index to not block code blocks         */
      /* ============================================ */
      .message-collapse-btn-top {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 28px;
        height: 28px;
        padding: 0;
        background: rgba(30, 37, 45, 0.9);
        border: 1px solid #30363d;
        border-radius: 6px;
        color: #8b949e;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.15s ease;
        z-index: 5;  /* LOW z-index - code blocks are higher */
      }

      .ai-message.assistant-message:hover .message-collapse-btn-top {
        opacity: 1;
      }

      .message-collapse-btn-top:hover {
        background: #30363d;
        border-color: #58a6ff;
        color: #58a6ff;
      }

      /* ============================================ */
      /* BOTTOM COLLAPSE BAR (always visible)         */
      /* Low z-index to not block code blocks         */
      /* ============================================ */
      .message-collapse-bottom {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        margin-top: 12px;
        padding: 8px 16px;
        background: linear-gradient(180deg, rgba(30, 37, 45, 0.3) 0%, rgba(30, 37, 45, 0.6) 100%);
        border: 1px solid #30363d;
        border-radius: 6px;
        color: #6e7681;
        font-size: 12px;
        cursor: pointer;
        user-select: none;
        position: relative;
        z-index: 1;  /* LOW z-index - code blocks are higher */
      }

      .message-collapse-bottom:hover {
        background: linear-gradient(180deg, rgba(88, 166, 255, 0.1) 0%, rgba(88, 166, 255, 0.15) 100%);
        border-color: #58a6ff;
        color: #58a6ff;
      }

      .message-collapse-bottom span {
        font-weight: 500;
      }

      /* ============================================ */
      /* HIDE BUTTONS ON COLLAPSED MESSAGES           */
      /* ============================================ */
      .ai-message.ai-message-collapsed .message-collapse-btn-top,
      .ai-message.ai-message-collapsed .message-collapse-bottom {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Wait for chat container
  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) {
    setTimeout(initMessageCollapse, 1000);
    return;
  }

  // Add collapse buttons (top + bottom) to a message
  const addCollapseButtons = (msg: HTMLElement) => {
    if (!msg.querySelector('.message-collapse-btn-top')) {
      const topBtn = document.createElement('button');
      topBtn.className = 'message-collapse-btn-top';
      topBtn.title = 'Collapse this message';
      topBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>`;
      topBtn.onclick = (e) => {
        e.stopPropagation();
        collapseMessage(msg);
      };
      msg.appendChild(topBtn);
    }

    if (!msg.querySelector('.message-collapse-bottom')) {
      const bottomBar = document.createElement('div');
      bottomBar.className = 'message-collapse-bottom';
      bottomBar.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg><span>Collapse message</span>`;
      bottomBar.onclick = (e) => {
        e.stopPropagation();
        collapseMessage(msg);
      };
      msg.appendChild(bottomBar);
    }
  };

  // Remove collapse buttons from a message
  const removeCollapseButtons = (msg: HTMLElement) => {
    const topBtn = msg.querySelector('.message-collapse-btn-top');
    const bottomBar = msg.querySelector('.message-collapse-bottom');
    if (topBtn) topBtn.remove();
    if (bottomBar) bottomBar.remove();
  };

  // Collapse a single message - INSTANT
  const collapseMessage = (msg: HTMLElement) => {
    if (msg.classList.contains('ai-message-collapsed') || msg.classList.contains('streaming')) return;
    
    const content = msg.querySelector('.ai-message-content');
    const actions = msg.querySelector('.message-actions, .enh-message-actions, .ai-message-footer');
    if (!content) return;

    // Remove buttons first
    removeCollapseButtons(msg);

    // Get data for collapsed header
    let preview = (content.textContent || '').replace(/\s+/g, ' ').trim();
    const charCount = preview.length;
    if (preview.length > 60) preview = preview.substring(0, 60) + '...';
    if (preview.length === 0) preview = 'AI Response';
    const time = actions?.querySelector('.message-time, .enh-message-time')?.textContent || '';
    const provider = actions?.querySelector('.provider-text-minimal, .enh-provider-badge')?.textContent || 'AI';
    const color = (actions?.querySelector('.provider-text-minimal') as HTMLElement)?.style?.color || '#888';

    // Create collapsed header
    const header = document.createElement('div');
    header.className = 'ai-message-collapsed-header';
    header.innerHTML = `
      <svg class="collapsed-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
      <span class="collapsed-preview-text">${preview.replace(/</g, '&lt;')}</span>
      <div class="collapsed-meta">
        <span class="collapsed-badge">${charCount > 500 ? Math.round(charCount/100)/10 + 'K' : charCount} chars</span>
        <span style="color: ${color}">${provider}</span>
        ${time ? `<span>${time}</span>` : ''}
      </div>
    `;

    header.onclick = () => {
      expandMessage(msg);
    };

    // INSTANT collapse
    msg.insertBefore(header, msg.firstChild);
    msg.classList.add('ai-message-collapsed');
  };

  // Expand a message - INSTANT
  const expandMessage = (msg: HTMLElement) => {
    if (!msg.classList.contains('ai-message-collapsed')) return;

    isManualExpanding = true;

    const header = msg.querySelector('.ai-message-collapsed-header');
    if (header) header.remove();

    // INSTANT expand
    msg.classList.remove('ai-message-collapsed');

    // Add collapse buttons
    addCollapseButtons(msg);

    // Reset flag
    setTimeout(() => {
      isManualExpanding = false;
    }, 100);

    // Don't auto-scroll - keeps UI stable
  };

  // Collapse all previous messages (keep latest expanded)
  const collapsePrevious = () => {
    if (isManualExpanding) {
      console.log('⏭️ Skipping collapse - manual expand in progress');
      return;
    }

    const messages = Array.from(
      chatContainer.querySelectorAll('.assistant-message:not(.ai-message-collapsed):not(.streaming)')
    );
    
    // Add collapse buttons to the latest message
    if (messages.length > 0) {
      addCollapseButtons(messages[messages.length - 1] as HTMLElement);
    }

    // Collapse all except the last one - INSTANT
    messages.slice(0, -1).forEach(msg => {
      collapseMessage(msg as HTMLElement);
    });
    
    if (messages.length > 1) {
      console.log(`📦 Collapsed ${messages.length - 1} previous AI messages`);
    }
  };

  // ============================================
  // 🔧 FIX: Collapse on initial load / conversation load
  // ============================================
  const collapseOnLoad = () => {
    const messages = Array.from(
      chatContainer.querySelectorAll('.assistant-message:not(.ai-message-collapsed):not(.streaming)')
    );

    console.log(`📦 [Load] Found ${messages.length} messages to process`);

    if (messages.length <= 1) {
      // Only 1 message - just add buttons, don't collapse
      if (messages.length === 1) {
        addCollapseButtons(messages[0] as HTMLElement);
      }
      return;
    }

    // Collapse ALL except the last one
    messages.slice(0, -1).forEach(msg => {
      collapseMessage(msg as HTMLElement);
    });

    // Add buttons to the last (expanded) message
    addCollapseButtons(messages[messages.length - 1] as HTMLElement);

    console.log(`📦 [Load] Collapsed ${messages.length - 1} messages, kept last expanded`);
  };

  // Track for bulk additions (conversation load detection)
  let bulkAddCount = 0;
  let bulkAddTimer: number | null = null;
  let lastMessageCount = chatContainer.querySelectorAll('.assistant-message').length;

  // Observer for new messages
  const observer = new MutationObserver((mutations) => {
    if (isManualExpanding) return;

    const currentMessageCount = chatContainer.querySelectorAll('.assistant-message').length;
    let newMessagesAdded = 0;

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (node.classList?.contains('assistant-message')) {
              newMessagesAdded++;
            } else if (node.querySelectorAll) {
              newMessagesAdded += node.querySelectorAll('.assistant-message').length;
            }
          }
        });
      }
      
      // Handle streaming complete
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target as HTMLElement;
        if (target.classList.contains('assistant-message') && 
            !target.classList.contains('streaming') &&
            !target.classList.contains('ai-message-collapsed')) {
          const wasStreaming = (mutation.oldValue || '').includes('streaming');
          if (wasStreaming) {
            setTimeout(collapsePrevious, 100);
            lastMessageCount = currentMessageCount;
            return;
          }
        }
      }
    }

    // Detect bulk addition (conversation load)
    if (newMessagesAdded > 0) {
      bulkAddCount += newMessagesAdded;
      
      if (bulkAddTimer) clearTimeout(bulkAddTimer);
      
      bulkAddTimer = window.setTimeout(() => {
        console.log(`📦 [Observer] Detected ${bulkAddCount} new messages`);
        
        if (bulkAddCount >= 2) {
          // Multiple messages = conversation load
          collapseOnLoad();
        } else {
          // Single message = new response
          collapsePrevious();
        }
        
        bulkAddCount = 0;
        lastMessageCount = chatContainer.querySelectorAll('.assistant-message').length;
      }, 200);
    }
  });

  observer.observe(chatContainer, { 
    childList: true, 
    subtree: true, 
    attributes: true, 
    attributeFilter: ['class'],
    attributeOldValue: true
  });

  // ============================================
  // 🔧 FIX: Auto-collapse on initial load
  // This is the key fix - was only adding buttons before!
  // ============================================
  setTimeout(() => {
    const messageCount = chatContainer.querySelectorAll('.assistant-message:not(.ai-message-collapsed)').length;
    console.log(`📦 [Init] Found ${messageCount} expanded messages`);
    
    if (messageCount > 1) {
      collapseOnLoad();
    } else if (messageCount === 1) {
      const msg = chatContainer.querySelector('.assistant-message:not(.ai-message-collapsed)');
      if (msg) addCollapseButtons(msg as HTMLElement);
    }
  }, 300);

  isInitialized = true;
  console.log('✅ Message auto-collapse initialized (with load detection)');
}

/**
 * Manually collapse all AI messages except the last one
 */
export function collapseAllMessages(): void {
  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) return;

  const messages = Array.from(
    chatContainer.querySelectorAll('.assistant-message:not(.ai-message-collapsed):not(.streaming)')
  );

  messages.slice(0, -1).forEach(msg => {
    const content = msg.querySelector('.ai-message-content');
    const actions = msg.querySelector('.message-actions, .enh-message-actions');
    if (!content) return;

    // Remove buttons
    const topBtn = msg.querySelector('.message-collapse-btn-top');
    const bottomBar = msg.querySelector('.message-collapse-bottom');
    if (topBtn) topBtn.remove();
    if (bottomBar) bottomBar.remove();

    // Get data
    let preview = (content.textContent || '').replace(/\s+/g, ' ').trim();
    const charCount = preview.length;
    if (preview.length > 60) preview = preview.substring(0, 60) + '...';
    if (preview.length === 0) preview = 'AI Response';
    const time = actions?.querySelector('.message-time')?.textContent || '';
    const provider = actions?.querySelector('.provider-text-minimal')?.textContent || 'AI';
    const color = (actions?.querySelector('.provider-text-minimal') as HTMLElement)?.style?.color || '#888';

    // Create header
    const header = document.createElement('div');
    header.className = 'ai-message-collapsed-header';
    header.innerHTML = `
      <svg class="collapsed-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
      <span class="collapsed-preview-text">${preview.replace(/</g, '&lt;')}</span>
      <div class="collapsed-meta">
        <span class="collapsed-badge">${charCount > 500 ? Math.round(charCount/100)/10 + 'K' : charCount} chars</span>
        <span style="color: ${color}">${provider}</span>
        ${time ? `<span>${time}</span>` : ''}
      </div>
    `;

    header.onclick = () => {
      isManualExpanding = true;
      header.remove();
      msg.classList.remove('ai-message-collapsed');
      
      // Add buttons
      const newTopBtn = document.createElement('button');
      newTopBtn.className = 'message-collapse-btn-top';
      newTopBtn.title = 'Collapse this message';
      newTopBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>`;
      newTopBtn.onclick = (e) => { e.stopPropagation(); collapseAllMessages(); };
      msg.appendChild(newTopBtn);

      const newBottomBar = document.createElement('div');
      newBottomBar.className = 'message-collapse-bottom';
      newBottomBar.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg><span>Collapse message</span>`;
      newBottomBar.onclick = (e) => { e.stopPropagation(); collapseAllMessages(); };
      msg.appendChild(newBottomBar);

      setTimeout(() => { isManualExpanding = false; }, 100);
      // Don't auto-scroll - keeps UI stable
    };

    msg.insertBefore(header, msg.firstChild);
    msg.classList.add('ai-message-collapsed');
  });

  // Add buttons to last message if not already
  if (messages.length > 0) {
    const lastMsg = messages[messages.length - 1] as HTMLElement;
    if (!lastMsg.querySelector('.message-collapse-btn-top')) {
      const topBtn = document.createElement('button');
      topBtn.className = 'message-collapse-btn-top';
      topBtn.title = 'Collapse this message';
      topBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>`;
      topBtn.onclick = (e) => { e.stopPropagation(); collapseAllMessages(); };
      lastMsg.appendChild(topBtn);
    }
    if (!lastMsg.querySelector('.message-collapse-bottom')) {
      const bottomBar = document.createElement('div');
      bottomBar.className = 'message-collapse-bottom';
      bottomBar.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg><span>Collapse message</span>`;
      bottomBar.onclick = (e) => { e.stopPropagation(); collapseAllMessages(); };
      lastMsg.appendChild(bottomBar);
    }
  }

  if (messages.length > 1) {
    console.log(`📦 Collapsed ${messages.length - 1} messages`);
  }
}

/**
 * Expand all collapsed AI messages
 */
export function expandAllMessages(): void {
  isManualExpanding = true;
  
  const collapsed = document.querySelectorAll('.ai-message-collapsed');
  
  collapsed.forEach(msg => {
    const header = msg.querySelector('.ai-message-collapsed-header');
    if (header) header.remove();
    msg.classList.remove('ai-message-collapsed');

    // Add buttons
    const topBtn = document.createElement('button');
    topBtn.className = 'message-collapse-btn-top';
    topBtn.title = 'Collapse this message';
    topBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>`;
    topBtn.onclick = (e) => { e.stopPropagation(); collapseAllMessages(); };
    msg.appendChild(topBtn);

    const bottomBar = document.createElement('div');
    bottomBar.className = 'message-collapse-bottom';
    bottomBar.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg><span>Collapse message</span>`;
    bottomBar.onclick = (e) => { e.stopPropagation(); collapseAllMessages(); };
    msg.appendChild(bottomBar);
  });

  setTimeout(() => { isManualExpanding = false; }, 100);
  console.log(`📖 Expanded ${collapsed.length} messages`);
}

/**
 * 🔧 NEW: Force collapse after conversation load
 * Call this from loadConversationToUI() or conversationUI.ts
 */
export function forceCollapseAfterLoad(): void {
  setTimeout(() => {
    const chatContainer = document.querySelector('.ai-chat-container');
    if (!chatContainer) return;

    const messages = chatContainer.querySelectorAll('.assistant-message:not(.ai-message-collapsed):not(.streaming)');
    console.log(`📦 [Force] Found ${messages.length} messages to collapse`);
    
    if (messages.length > 1) {
      collapseAllMessages();
    }
  }, 100);
}

// ============================================
// 🔧 Expose to window for debugging and hooks
// ============================================
if (typeof window !== 'undefined') {
  (window as any).messageCollapse = {
    init: initMessageCollapse,
    collapseAll: collapseAllMessages,
    expandAll: expandAllMessages,
    forceCollapse: forceCollapseAfterLoad,
  };
  
  // Also expose directly for easier access
  (window as any).collapseAllMessages = collapseAllMessages;
  (window as any).expandAllMessages = expandAllMessages;
  (window as any).forceCollapseAfterLoad = forceCollapseAfterLoad;
}
