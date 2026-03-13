// conversationDeleteFix.ts
// ============================================================================
// FIX: Add missing deleteConversations (plural) method
// ============================================================================

import { conversationManager } from './conversationManager';

// Add deleteConversations method if it doesn't exist
if (!(conversationManager as any).deleteConversations) {
  (conversationManager as any).deleteConversations = function(ids: string[]): number {
    let deletedCount = 0;
    
    for (const id of ids) {
      if (this.deleteConversation(id)) {
        deletedCount++;
      }
    }
    
    console.log(`🗑️ Deleted ${deletedCount} conversations`);
    return deletedCount;
  };
  
  console.log('✅ [DeleteFix] Added deleteConversations method');
}

export {};
