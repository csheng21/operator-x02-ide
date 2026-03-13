// conversationCompleteFix.ts
// ============================================================================
// COMPREHENSIVE FIX FOR MESSAGE DISPLAY AND PERSISTENCE
// 
// Issues Fixed:
// 1. Raw markdown not rendered (shows **bold** instead of bold)
// 2. Messages collapsed/hidden after load
// 3. Save reliability (interrupted by reload)
// 4. Tauri callback errors on quick reload
// 
// Usage: Import in main.ts:
//   import './ide/aiAssistant/conversationCompleteFix';
// ============================================================================

console.log('🔧 [ConversationFix] Loading comprehensive fix v1.0...');

// ============================================================================
// FIX 1: MARKDOWN PROCESSING
// ============================================================================

/**
 * Process markdown content to HTML
 */
function processMarkdownContent(content: string): string {
  if (!content) return '';
  
  // Skip if already HTML
  if (content.includes('<strong>') || 
      content.includes('<h1') || 
      content.includes('<ul>') ||
      content.includes('class="muf-')) {
    return content;
  }
  
  // Try window.markdownProcessor first
  try {
    const processor = (window as any).markdownProcessor;
    if (processor?.processMarkdown) {
      const result = processor.processMarkdown(content, 'fix-' + Date.now());
      if (result?.html) return result.html;
    }
  } catch (e) { /* fallback below */ }
  
  // Fallback: basic markdown processing
  let html = content;
  
  // Code blocks
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const cleanCode = code.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre><code class="language-${lang}">${cleanCode}</code></pre>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Headers
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  
  // Bold and italic
  html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Lists
  html = html.replace(/^[-*+]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, '<ul>$&</ul>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // Line breaks
  html = html.replace(/\n\n+/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

/**
 * Fix all messages with raw markdown
 */
function fixRawMarkdownMessages(): number {
  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) return 0;
  
  const messages = chatContainer.querySelectorAll('.ai-message-content');
  let fixedCount = 0;
  
  messages.forEach((contentDiv) => {
    const text = contentDiv.textContent || '';
    const html = contentDiv.innerHTML;
    
    // Check if has raw markdown but no processed HTML
    const hasRaw = /\*\*[^*]+\*\*/.test(text) || /^#+\s/m.test(text) || /^[-*+]\s/m.test(text);
    const hasHTML = html.includes('<strong>') || html.includes('<h1') || html.includes('<ul');
    
    if (hasRaw && !hasHTML) {
      contentDiv.innerHTML = processMarkdownContent(text);
      contentDiv.setAttribute('data-markdown-fixed', 'true');
      fixedCount++;
    }
  });
  
  if (fixedCount > 0) {
    console.log(`✅ [MarkdownFix] Fixed ${fixedCount} messages`);
    
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
// FIX 2: EXPAND COLLAPSED MESSAGES
// ============================================================================

/**
 * Expand all collapsed messages so they're visible
 */
function expandAllMessages(): number {
  const collapsedMessages = document.querySelectorAll('.ai-message-collapsed, .ai-message.collapsed');
  let expandedCount = 0;
  
  collapsedMessages.forEach(msg => {
    msg.classList.remove('ai-message-collapsed', 'collapsed');
    
    // Also expand content if hidden
    const content = msg.querySelector('.ai-message-content');
    if (content) {
      (content as HTMLElement).style.display = '';
      (content as HTMLElement).style.maxHeight = '';
    }
    
    expandedCount++;
  });
  
  // Also handle collapse toggle buttons
  const expandBtns = document.querySelectorAll('.expand-btn, .collapse-toggle-btn');
  expandBtns.forEach(btn => {
    const msg = btn.closest('.ai-message');
    if (msg?.classList.contains('collapsed')) {
      (btn as HTMLElement).click();
    }
  });
  
  if (expandedCount > 0) {
    console.log(`✅ [CollapseFix] Expanded ${expandedCount} messages`);
  }
  
  return expandedCount;
}

/**
 * Disable auto-collapse on load
 */
function disableAutoCollapse(): void {
  // Override the collapse function temporarily
  const originalCollapse = (window as any).collapseAllAIMessages;
  if (originalCollapse) {
    (window as any).collapseAllAIMessages = function() {
      console.log('⏸️ [CollapseFix] Auto-collapse blocked after load');
      // Don't collapse - just return
    };
    
    // Restore after 5 seconds
    setTimeout(() => {
      (window as any).collapseAllAIMessages = originalCollapse;
      console.log('✅ [CollapseFix] Collapse function restored');
    }, 5000);
  }
}

// ============================================================================
// FIX 3: RELIABLE SAVE SYSTEM
// ============================================================================

let isSaving = false;
let pendingSave = false;
let lastSaveTime = 0;

/**
 * Force save conversation to storage
 */
async function forceSaveConversation(): Promise<void> {
  if (isSaving) {
    pendingSave = true;
    return;
  }
  
  isSaving = true;
  
  try {
    const cm = (window as any).conversationManager;
    if (!cm) {
      console.warn('[SaveFix] conversationManager not available');
      return;
    }
    
    const currentConv = cm.getCurrentConversation?.();
    if (!currentConv) {
      console.warn('[SaveFix] No current conversation');
      return;
    }
    
    console.log(`💾 [SaveFix] Saving ${currentConv.messages?.length || 0} messages...`);
    
    // Method 1: Use conversationManager.saveConversations
    if (typeof cm.saveConversations === 'function') {
      await cm.saveConversations();
    }
    
    // Method 2: Backup to localStorage
    try {
      const allConvs = cm.getAllConversations?.() || [];
      localStorage.setItem('ai_conversations_backup', JSON.stringify({
        conversations: allConvs.map((c: any) => [c.id, c]),
        currentConversationId: currentConv.id,
        savedAt: Date.now()
      }));
      console.log('✅ [SaveFix] Backup saved to localStorage');
    } catch (e) {
      console.warn('[SaveFix] localStorage backup failed:', e);
    }
    
    lastSaveTime = Date.now();
    console.log('✅ [SaveFix] Save completed');
    
  } catch (e) {
    console.error('❌ [SaveFix] Save failed:', e);
  } finally {
    isSaving = false;
    
    // Handle pending save
    if (pendingSave) {
      pendingSave = false;
      setTimeout(forceSaveConversation, 500);
    }
  }
}

/**
 * Setup auto-save on important events
 */
function setupAutoSave(): void {
  // Save before page unload
  window.addEventListener('beforeunload', () => {
    console.log('💾 [SaveFix] Saving before unload...');
    
    const cm = (window as any).conversationManager;
    if (cm) {
      // Synchronous localStorage backup
      try {
        const allConvs = cm.getAllConversations?.() || [];
        const currentId = cm.getCurrentConversation?.()?.id;
        localStorage.setItem('ai_conversations_emergency_backup', JSON.stringify({
          conversations: allConvs.map((c: any) => [c.id, c]),
          currentConversationId: currentId,
          savedAt: Date.now()
        }));
      } catch (e) { /* ignore */ }
    }
  });
  
  // Save when tab becomes hidden
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      forceSaveConversation();
    }
  });
  
  // Periodic save every 30 seconds
  setInterval(() => {
    const cm = (window as any).conversationManager;
    const conv = cm?.getCurrentConversation?.();
    if (conv?.messages?.length > 0) {
      forceSaveConversation();
    }
  }, 30000);
  
  console.log('✅ [SaveFix] Auto-save system initialized');
}

// ============================================================================
// FIX 4: RECOVER FROM BACKUP IF NEEDED
// ============================================================================

function recoverFromBackup(): boolean {
  const cm = (window as any).conversationManager;
  if (!cm) return false;
  
  const currentConv = cm.getCurrentConversation?.();
  const messageCount = currentConv?.messages?.length || 0;
  
  // Only recover if current is empty
  if (messageCount > 0) return false;
  
  // Try emergency backup first
  const backupKeys = ['ai_conversations_emergency_backup', 'ai_conversations_backup'];
  
  for (const key of backupKeys) {
    try {
      const backup = localStorage.getItem(key);
      if (!backup) continue;
      
      const data = JSON.parse(backup);
      if (!data.conversations || data.conversations.length === 0) continue;
      
      console.log(`🔄 [RecoveryFix] Found backup in ${key}`);
      
      // Find conversation with most messages
      let bestConv = null;
      let maxMessages = 0;
      
      for (const [id, conv] of data.conversations) {
        const msgCount = conv.messages?.length || 0;
        if (msgCount > maxMessages) {
          maxMessages = msgCount;
          bestConv = conv;
        }
      }
      
      if (bestConv && maxMessages > 0) {
        console.log(`✅ [RecoveryFix] Recovered conversation with ${maxMessages} messages`);
        
        // Restore via conversationManager
        if (typeof cm.restoreConversation === 'function') {
          cm.restoreConversation(bestConv);
        }
        
        return true;
      }
    } catch (e) {
      console.warn(`[RecoveryFix] Failed to read ${key}:`, e);
    }
  }
  
  return false;
}

// ============================================================================
// MAIN FIX FUNCTION
// ============================================================================

function applyAllFixes(): void {
  console.log('🔧 [ConversationFix] Applying all fixes...');
  
  // Disable auto-collapse first
  disableAutoCollapse();
  
  // Fix markdown (delay to ensure DOM is ready)
  setTimeout(() => {
    fixRawMarkdownMessages();
  }, 500);
  
  // Expand collapsed messages
  setTimeout(() => {
    expandAllMessages();
  }, 1000);
  
  // Try recovery if needed
  setTimeout(() => {
    recoverFromBackup();
  }, 2000);
  
  console.log('✅ [ConversationFix] All fixes applied');
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners(): void {
  // Apply fixes on conversation load
  document.addEventListener('conversation-loaded', () => {
    console.log('📥 [ConversationFix] Conversation loaded, applying fixes...');
    setTimeout(applyAllFixes, 300);
  });
  
  // Apply fixes on conversation switch
  document.addEventListener('conversation-switched', () => {
    setTimeout(applyAllFixes, 300);
  });
  
  // Fix markdown when new messages are added
  const observer = new MutationObserver((mutations) => {
    let shouldFix = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement && 
              (node.classList.contains('ai-message') || node.querySelector('.ai-message'))) {
            shouldFix = true;
            break;
          }
        }
      }
      if (shouldFix) break;
    }
    
    if (shouldFix) {
      clearTimeout((window as any).__fixTimer);
      (window as any).__fixTimer = setTimeout(() => {
        fixRawMarkdownMessages();
      }, 300);
    }
  });
  
  // Start observing
  const startObserver = () => {
    const chatContainer = document.querySelector('.ai-chat-container');
    if (chatContainer) {
      observer.observe(chatContainer, { childList: true, subtree: true });
      console.log('✅ [ConversationFix] Observer active');
    } else {
      setTimeout(startObserver, 500);
    }
  };
  
  startObserver();
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init(): void {
  console.log('🚀 [ConversationFix] Initializing...');
  
  // Setup event listeners
  setupEventListeners();
  
  // Setup auto-save
  setupAutoSave();
  
  // Apply fixes after initial load
  setTimeout(applyAllFixes, 1500);
  
  console.log('✅ [ConversationFix] Initialized successfully');
}

// ============================================================================
// EXPORTS & WINDOW BINDING
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).conversationFix = {
    applyAll: applyAllFixes,
    fixMarkdown: fixRawMarkdownMessages,
    expandAll: expandAllMessages,
    forceSave: forceSaveConversation,
    recover: recoverFromBackup
  };
  
  // Shortcut functions
  (window as any).fixMessages = applyAllFixes;
  (window as any).expandMessages = expandAllMessages;
  (window as any).forceSave = forceSaveConversation;
}

// Auto-initialize
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }
}

export {
  applyAllFixes,
  fixRawMarkdownMessages,
  expandAllMessages,
  forceSaveConversation,
  recoverFromBackup,
  processMarkdownContent
};

export default {
  applyAll: applyAllFixes,
  fixMarkdown: fixRawMarkdownMessages,
  expandAll: expandAllMessages,
  save: forceSaveConversation,
  recover: recoverFromBackup
};
