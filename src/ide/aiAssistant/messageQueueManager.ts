// messageQueueManager.ts - Fixed version with conversation ID tracking

import { conversationManager } from './conversationManager';
import { MessageRole } from './assistantUI';

interface QueuedMessage {
  role: MessageRole;
  content: string;
  metadata?: any;
  messageId: string;
  conversationId: string; // ✅ NEW: Track which conversation this message belongs to
}

let saveQueue: QueuedMessage[] = [];
let isSaving = false;
let isSavingEnabled = true;
let processedMessageIds = new Set<string>();

export function setIsSavingEnabled(enabled: boolean): void {
  isSavingEnabled = enabled;
}

export function getIsSavingEnabled(): boolean {
  return isSavingEnabled;
}

export async function processSaveQueue(): Promise<void> {
  if (isSaving || saveQueue.length === 0) return;
  
  isSaving = true;
  
  while (saveQueue.length > 0) {
    const message = saveQueue.shift();
    if (message) {
      // Check if we already saved this message
      if (!processedMessageIds.has(message.messageId)) {
        // ✅ FIXED: Switch to the correct conversation before adding the message
        const targetConversation = conversationManager.getConversationById(message.conversationId);
        
        if (targetConversation) {
          // Switch to this conversation temporarily
          const originalConvId = conversationManager.getCurrentConversation()?.id;
          conversationManager.switchToConversation(message.conversationId);
          
          // Add the message to the correct conversation
          conversationManager.addMessage(message.role, message.content, message.metadata);
          
          // Switch back to original if different
          if (originalConvId && originalConvId !== message.conversationId) {
            conversationManager.switchToConversation(originalConvId);
          }
          
          processedMessageIds.add(message.messageId);
          
          console.log(`✅ Message saved to conversation: ${message.conversationId.substring(0, 8)}...`);
        } else {
          console.warn(`❌ Conversation ${message.conversationId} not found, skipping message`);
        }
        
        // Clean up old IDs (keep only last 1000)
        if (processedMessageIds.size > 1000) {
          const idsArray = Array.from(processedMessageIds);
          processedMessageIds = new Set(idsArray.slice(-1000));
        }
      } else {
        console.log('Skipping duplicate message:', message.messageId);
      }
    }
  }
  
  isSaving = false;
}

export function queueMessageForSaving(
  role: MessageRole, 
  content: string, 
  metadata?: any,
  messageId?: string,
  conversationId?: string // ✅ NEW: Optional conversation ID parameter
): void {
  if (!isSavingEnabled) return;
  
  // Generate unique ID if not provided
  const id = messageId || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // ✅ FIXED: Get the current conversation ID if not provided
  const convId = conversationId || conversationManager.getCurrentConversation()?.id;
  
  if (!convId) {
    console.warn('❌ No conversation ID available, message not queued');
    return;
  }
  
  // Check if already in queue
  const existsInQueue = saveQueue.some(msg => msg.messageId === id);
  if (existsInQueue) {
    console.log('Message already in queue:', id);
    return;
  }
  
  saveQueue.push({ 
    role, 
    content, 
    metadata, 
    messageId: id,
    conversationId: convId // ✅ NEW: Store the conversation ID
  });
  
  processSaveQueue();
}

// Add cleanup function
export function clearProcessedMessages(): void {
  processedMessageIds.clear();
  saveQueue = [];
}

// ✅ NEW: Export function to get queue stats for debugging
export function getQueueStats() {
  return {
    queueLength: saveQueue.length,
    processedCount: processedMessageIds.size,
    isSaving,
    isEnabled: isSavingEnabled
  };
}