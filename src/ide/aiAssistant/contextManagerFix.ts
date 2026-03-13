// contextManagerFix.ts
// Fix for: contextManager.getRecentConversation is not a function
// 
// This file patches the contextManager to add the missing function
// ============================================================================

/**
 * Apply this fix by:
 * 1. Import this file in main.ts after contextManager imports
 * 2. Or copy the patchContextManager() call to your initialization
 */

export function patchContextManager(): void {
  const w = window as any;
  
  if (!w.contextManager) {
    console.warn('⚠️ contextManager not found, cannot patch');
    return;
  }
  
  // Add missing getRecentConversation function
  if (!w.contextManager.getRecentConversation) {
    w.contextManager.getRecentConversation = function(): any {
      try {
        // Try to get from conversationManager first
        if (w.conversationManager?.getCurrentConversation) {
          return w.conversationManager.getCurrentConversation();
        }
        
        // Try to get from window.currentConversation
        if (w.currentConversation) {
          return w.currentConversation;
        }
        
        // Try to get from localStorage
        const stored = localStorage.getItem('currentConversation');
        if (stored) {
          return JSON.parse(stored);
        }
        
        // Try to get from conversations list
        const conversationsStr = localStorage.getItem('conversations');
        if (conversationsStr) {
          const conversations = JSON.parse(conversationsStr);
          if (Array.isArray(conversations) && conversations.length > 0) {
            // Return the most recent one
            return conversations[conversations.length - 1];
          }
        }
        
        return null;
      } catch (e) {
        console.warn('Failed to get recent conversation:', e);
        return null;
      }
    };
    console.log('✅ [ContextManagerFix] Added getRecentConversation function');
  }
  
  // Add any other missing functions that might be needed
  if (!w.contextManager.getConversationContext) {
    w.contextManager.getConversationContext = function(): string {
      try {
        const conversation = w.contextManager.getRecentConversation();
        if (!conversation || !conversation.messages) {
          return '';
        }
        
        // Build context from recent messages
        const recentMessages = conversation.messages.slice(-5);
        return recentMessages.map((m: any) => 
          `${m.role}: ${typeof m.content === 'string' ? m.content.substring(0, 200) : ''}`
        ).join('\n');
      } catch (e) {
        return '';
      }
    };
    console.log('✅ [ContextManagerFix] Added getConversationContext function');
  }
}

// Auto-patch on load
if (typeof window !== 'undefined') {
  // Wait for contextManager to be available
  const tryPatch = () => {
    if ((window as any).contextManager) {
      patchContextManager();
    } else {
      // Retry in 500ms
      setTimeout(tryPatch, 500);
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(tryPatch, 100));
  } else {
    setTimeout(tryPatch, 100);
  }
}

export default patchContextManager;
