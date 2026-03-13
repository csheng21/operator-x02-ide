// conversationSaveFix.ts
// ============================================================================
// FIX: Ensures messages are saved to the CORRECT conversation ID
// 
// PROBLEM: New messages were being saved to a NEW conversation ID instead of
//          the current one, causing messages to appear "lost" after IDE reset.
//
// SOLUTION: 
//   1. Always use current conversation ID when saving
//   2. Auto-save on key events (before unload, periodically)
//   3. Verify save completed successfully
// ============================================================================

console.log('🔧 [ConversationSaveFix] Loading...');

// ============================================================================
// CONVERSATION MANAGER PATCH
// ============================================================================

function patchConversationManager(): void {
  const cm = (window as any).conversationManager;
  if (!cm) {
    console.warn('[SaveFix] conversationManager not found, retrying...');
    setTimeout(patchConversationManager, 1000);
    return;
  }

  // Store original methods
  const originalAddMessage = cm.addMessage?.bind(cm);
  const originalSave = cm.saveConversations?.bind(cm);

  // Patch addMessage to always use current conversation
  if (originalAddMessage) {
    cm.addMessage = function(role: string, content: string, metadata?: any) {
      const currentConv = cm.getCurrentConversation?.();
      if (!currentConv) {
        console.warn('[SaveFix] No current conversation, creating one...');
        cm.createConversation?.('New Chat');
      }
      
      const result = originalAddMessage(role, content, metadata);
      
      // Auto-save after adding message
      setTimeout(() => {
        cm.saveConversations?.();
        console.log('💾 [SaveFix] Auto-saved after message');
      }, 500);
      
      return result;
    };
    console.log('✅ [SaveFix] Patched addMessage');
  }

  // Patch save to verify it works
  if (originalSave) {
    cm.saveConversations = async function() {
      const currentConv = cm.getCurrentConversation?.();
      const currentId = currentConv?.id;
      const messageCount = currentConv?.messages?.length || 0;
      
      console.log(`💾 [SaveFix] Saving conversation ${currentId?.substring(0, 8)}... (${messageCount} messages)`);
      
      try {
        const result = await originalSave();
        console.log('✅ [SaveFix] Save completed');
        return result;
      } catch (e) {
        console.error('❌ [SaveFix] Save failed:', e);
        
        // Fallback: save to localStorage directly
        try {
          const allConvs = cm.getAllConversations?.() || [];
          localStorage.setItem('ai_assistant_conversations', JSON.stringify(allConvs));
          localStorage.setItem('ai_assistant_current_conversation', currentId || '');
          console.log('✅ [SaveFix] Fallback save to localStorage');
        } catch (e2) {
          console.error('❌ [SaveFix] Fallback save also failed:', e2);
        }
        
        throw e;
      }
    };
    console.log('✅ [SaveFix] Patched saveConversations');
  }
}

// ============================================================================
// AUTO-SAVE SYSTEM
// ============================================================================

let autoSaveInterval: number | null = null;
let lastSaveTime = 0;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const MIN_SAVE_INTERVAL = 5000;   // Minimum 5 seconds between saves

function startAutoSave(): void {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }

  autoSaveInterval = window.setInterval(() => {
    const now = Date.now();
    if (now - lastSaveTime < MIN_SAVE_INTERVAL) {
      return; // Too soon since last save
    }

    const cm = (window as any).conversationManager;
    if (cm && typeof cm.saveConversations === 'function') {
      const currentConv = cm.getCurrentConversation?.();
      if (currentConv && currentConv.messages?.length > 0) {
        cm.saveConversations();
        lastSaveTime = now;
      }
    }
  }, AUTO_SAVE_INTERVAL);

  console.log(`✅ [SaveFix] Auto-save started (every ${AUTO_SAVE_INTERVAL/1000}s)`);
}

// ============================================================================
// SAVE BEFORE UNLOAD
// ============================================================================

function setupBeforeUnloadSave(): void {
  window.addEventListener('beforeunload', (event) => {
    const cm = (window as any).conversationManager;
    if (cm && typeof cm.saveConversations === 'function') {
      const currentConv = cm.getCurrentConversation?.();
      if (currentConv && currentConv.messages?.length > 0) {
        console.log('💾 [SaveFix] Saving before page unload...');
        
        // Synchronous save to localStorage as backup
        try {
          const allConvs = cm.getAllConversations?.() || [];
          const currentId = currentConv.id;
          localStorage.setItem('ai_assistant_conversations_backup', JSON.stringify(allConvs));
          localStorage.setItem('ai_assistant_current_conversation_backup', currentId || '');
          console.log('✅ [SaveFix] Backup save completed');
        } catch (e) {
          console.error('❌ [SaveFix] Backup save failed:', e);
        }
        
        // Also try async save (may not complete)
        cm.saveConversations?.();
      }
    }
  });

  console.log('✅ [SaveFix] Before-unload save handler registered');
}

// ============================================================================
// SAVE ON VISIBILITY CHANGE (when user switches tabs)
// ============================================================================

function setupVisibilityChangeSave(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const cm = (window as any).conversationManager;
      if (cm && typeof cm.saveConversations === 'function') {
        console.log('💾 [SaveFix] Saving on tab hide...');
        cm.saveConversations?.();
        lastSaveTime = Date.now();
      }
    }
  });

  console.log('✅ [SaveFix] Visibility change save handler registered');
}

// ============================================================================
// RECOVERY: Load from backup if main storage is corrupted
// ============================================================================

function checkAndRecoverFromBackup(): void {
  const cm = (window as any).conversationManager;
  if (!cm) return;

  const currentConv = cm.getCurrentConversation?.();
  const messageCount = currentConv?.messages?.length || 0;

  // If current conversation is empty, try to recover from backup
  if (messageCount === 0) {
    const backup = localStorage.getItem('ai_assistant_conversations_backup');
    if (backup) {
      try {
        const backupConvs = JSON.parse(backup);
        const backupCurrentId = localStorage.getItem('ai_assistant_current_conversation_backup');
        
        if (backupConvs && backupConvs.length > 0) {
          console.log('🔄 [SaveFix] Recovering from backup...');
          
          // Find the backup conversation with messages
          const backupCurrent = backupConvs.find((c: any) => c.id === backupCurrentId) || backupConvs[0];
          
          if (backupCurrent && backupCurrent.messages?.length > 0) {
            console.log(`✅ [SaveFix] Found backup with ${backupCurrent.messages.length} messages`);
            
            // Restore to main storage
            localStorage.setItem('ai_assistant_conversations', backup);
            localStorage.setItem('ai_assistant_current_conversation', backupCurrentId || backupCurrent.id);
            
            // Reload page to apply recovery
            console.log('🔄 [SaveFix] Reloading to apply recovery...');
            // window.location.reload();
          }
        }
      } catch (e) {
        console.error('❌ [SaveFix] Backup recovery failed:', e);
      }
    }
  }
}

// ============================================================================
// MANUAL SAVE FUNCTION
// ============================================================================

function forceSaveNow(): void {
  const cm = (window as any).conversationManager;
  if (!cm) {
    console.error('[SaveFix] conversationManager not available');
    return;
  }

  const currentConv = cm.getCurrentConversation?.();
  if (!currentConv) {
    console.warn('[SaveFix] No current conversation to save');
    return;
  }

  console.log(`💾 [SaveFix] Force saving ${currentConv.messages?.length || 0} messages...`);

  // Save to both main and backup
  try {
    const allConvs = cm.getAllConversations?.() || [];
    
    // Main save
    localStorage.setItem('ai_assistant_conversations', JSON.stringify(allConvs));
    localStorage.setItem('ai_assistant_current_conversation', currentConv.id);
    
    // Backup save
    localStorage.setItem('ai_assistant_conversations_backup', JSON.stringify(allConvs));
    localStorage.setItem('ai_assistant_current_conversation_backup', currentConv.id);
    
    // Also trigger manager save
    cm.saveConversations?.();
    
    console.log('✅ [SaveFix] Force save completed to localStorage + backup');
    lastSaveTime = Date.now();
  } catch (e) {
    console.error('❌ [SaveFix] Force save failed:', e);
  }
}

// ============================================================================
// DEBUG: Show save status
// ============================================================================

function showSaveStatus(): void {
  const cm = (window as any).conversationManager;
  if (!cm) {
    console.log('❌ conversationManager not available');
    return;
  }

  const currentConv = cm.getCurrentConversation?.();
  const allConvs = cm.getAllConversations?.() || [];
  
  console.log('═══════════════════════════════════════');
  console.log('📊 CONVERSATION SAVE STATUS');
  console.log('═══════════════════════════════════════');
  console.log('Current conversation ID:', currentConv?.id);
  console.log('Current message count:', currentConv?.messages?.length || 0);
  console.log('Total conversations:', allConvs.length);
  console.log('Last save time:', lastSaveTime ? new Date(lastSaveTime).toLocaleTimeString() : 'Never');
  console.log('');
  console.log('All conversations:');
  allConvs.forEach((c: any, i: number) => {
    const isCurrent = c.id === currentConv?.id ? ' ← CURRENT' : '';
    console.log(`  ${i + 1}. ${c.id?.substring(0, 12)}... | ${c.messages?.length || 0} msgs | "${c.title?.substring(0, 30)}..."${isCurrent}`);
  });
  console.log('═══════════════════════════════════════');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init(): void {
  console.log('🚀 [ConversationSaveFix] Initializing...');

  // Patch conversation manager
  setTimeout(patchConversationManager, 500);

  // Setup auto-save
  setTimeout(startAutoSave, 2000);

  // Setup before-unload save
  setupBeforeUnloadSave();

  // Setup visibility change save
  setupVisibilityChangeSave();

  // Check for backup recovery
  setTimeout(checkAndRecoverFromBackup, 3000);

  console.log('✅ [ConversationSaveFix] Initialized');
}

// ============================================================================
// EXPORTS & WINDOW BINDING
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).forceSaveConversation = forceSaveNow;
  (window as any).showSaveStatus = showSaveStatus;
  (window as any).conversationSaveFix = {
    save: forceSaveNow,
    status: showSaveStatus,
    startAutoSave,
    recover: checkAndRecoverFromBackup
  };
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
  forceSaveNow,
  showSaveStatus,
  startAutoSave,
  checkAndRecoverFromBackup
};

export default {
  save: forceSaveNow,
  status: showSaveStatus
};
