// conversationLoadingFix.ts
// ============================================================================
// FIX: Missing setConversationLoading function in conversationUI.ts
// ============================================================================
// 
// Add this to your conversationUI.ts file near the top (after imports),
// OR import this file in conversationUI.ts
//
// ============================================================================

// Loading state flag - prevents scroll calls during bulk message render
let isConversationLoading = false;

/**
 * Set the conversation loading state
 * This prevents scroll-to-bottom calls during bulk message loading
 */
export function setConversationLoading(loading: boolean): void {
  isConversationLoading = loading;
  console.log(`📂 Conversation loading: ${loading}`);
}

/**
 * Check if conversation is currently loading
 */
export function isConversationLoadingActive(): boolean {
  return isConversationLoading;
}

// Expose globally for the existing code that calls it
if (typeof window !== 'undefined') {
  (window as any).setConversationLoading = setConversationLoading;
  (window as any).isConversationLoadingActive = isConversationLoadingActive;
}

console.log('✅ [ConversationLoadingFix] setConversationLoading function added');

export { isConversationLoading };
