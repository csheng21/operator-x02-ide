// storageUtils.ts - Storage Calculation Utilities
// ============================================================================
// Enhanced version with conversation context support and accurate stats
// ============================================================================

/**
 * Get the byte size of a string
 * @param str - String to measure
 * @returns Size in bytes
 */
export function getStringByteSize(str: string): number {
  if (!str) return 0;
  try {
    return new Blob([str]).size;
  } catch {
    // Fallback for environments without Blob
    return str.length * 2; // Approximate UTF-16
  }
}

/**
 * Format byte size for human-readable display
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.5 KB")
 */
export function formatByteSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (isNaN(bytes) || bytes < 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  if (i === 0) {
    return `${bytes} B`;
  }
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Calculate the size of a single conversation
 * @param conversation - Conversation object
 * @returns Size in bytes
 */
export function getConversationSize(conversation: any): number {
  if (!conversation) return 0;
  
  let totalSize = 0;
  
  try {
    // Title and ID
    totalSize += getStringByteSize(conversation.title || '');
    totalSize += getStringByteSize(conversation.id || '');
    
    // Timestamps (2 * 8 bytes for 64-bit numbers)
    totalSize += 16;
    
    // Messages
    if (conversation.messages && Array.isArray(conversation.messages)) {
      conversation.messages.forEach((msg: any) => {
        // Content is the main payload
        totalSize += getStringByteSize(msg.content || '');
        
        // Role (user, assistant, system)
        totalSize += getStringByteSize(msg.role || '');
        
        // Message ID
        totalSize += getStringByteSize(msg.id || '');
        
        // Timestamp (8 bytes)
        totalSize += 8;
        
        // Metadata object
        if (msg.metadata) {
          try {
            totalSize += getStringByteSize(JSON.stringify(msg.metadata));
          } catch {
            totalSize += 100; // Estimate
          }
        }
        
        // Note object
        if (msg.note) {
          try {
            totalSize += getStringByteSize(JSON.stringify(msg.note));
          } catch {
            totalSize += 50; // Estimate
          }
        }
      });
    }
    
    // Conversation metadata
    if (conversation.metadata) {
      try {
        totalSize += getStringByteSize(JSON.stringify(conversation.metadata));
      } catch {
        totalSize += 50; // Estimate
      }
    }
    
  } catch (error) {
    console.error('Error calculating conversation size:', error);
  }
  
  return totalSize;
}

/**
 * Calculate total size of all conversations
 * @param conversations - Array of conversation objects
 * @returns Total size in bytes
 */
export function getTotalConversationsSize(conversations: any[]): number {
  if (!conversations || !Array.isArray(conversations)) return 0;
  
  let totalSize = 0;
  conversations.forEach(conv => {
    totalSize += getConversationSize(conv);
  });
  return totalSize;
}

/**
 * Get comprehensive storage statistics
 * @param conversations - Array of conversation objects
 * @returns Statistics object with size, counts, and dates
 */
export function getStorageStats(conversations: any[]): { 
  totalSize: number; 
  conversationCount: number; 
  messageCount: number;
  averageMessagesPerConversation: number;
  averageConversationSize: number;
  oldestConversation: Date | null;
  newestConversation: Date | null;
  userMessageCount: number;
  assistantMessageCount: number;
  systemMessageCount: number;
} {
  // Default empty stats
  const emptyStats = {
    totalSize: 0,
    conversationCount: 0,
    messageCount: 0,
    averageMessagesPerConversation: 0,
    averageConversationSize: 0,
    oldestConversation: null,
    newestConversation: null,
    userMessageCount: 0,
    assistantMessageCount: 0,
    systemMessageCount: 0
  };
  
  if (!conversations || !Array.isArray(conversations) || conversations.length === 0) {
    return emptyStats;
  }
  
  let messageCount = 0;
  let userMessageCount = 0;
  let assistantMessageCount = 0;
  let systemMessageCount = 0;
  let oldestTimestamp = Infinity;
  let newestTimestamp = 0;
  
  conversations.forEach(conv => {
    if (conv.messages && Array.isArray(conv.messages)) {
      messageCount += conv.messages.length;
      
      // Count by role
      conv.messages.forEach((msg: any) => {
        switch (msg.role) {
          case 'user':
            userMessageCount++;
            break;
          case 'assistant':
            assistantMessageCount++;
            break;
          case 'system':
            systemMessageCount++;
            break;
        }
      });
    }
    
    // Track oldest/newest
    if (conv.createdAt) {
      const timestamp = typeof conv.createdAt === 'number' ? conv.createdAt : new Date(conv.createdAt).getTime();
      if (timestamp < oldestTimestamp) oldestTimestamp = timestamp;
      if (timestamp > newestTimestamp) newestTimestamp = timestamp;
    }
    
    if (conv.lastUpdated) {
      const timestamp = typeof conv.lastUpdated === 'number' ? conv.lastUpdated : new Date(conv.lastUpdated).getTime();
      if (timestamp > newestTimestamp) newestTimestamp = timestamp;
    }
  });
  
  const totalSize = getTotalConversationsSize(conversations);
  const conversationCount = conversations.length;
  
  return {
    totalSize,
    conversationCount,
    messageCount,
    averageMessagesPerConversation: conversationCount > 0 
      ? Math.round(messageCount / conversationCount * 10) / 10
      : 0,
    averageConversationSize: conversationCount > 0 
      ? Math.round(totalSize / conversationCount)
      : 0,
    oldestConversation: oldestTimestamp !== Infinity 
      ? new Date(oldestTimestamp) 
      : null,
    newestConversation: newestTimestamp !== 0 
      ? new Date(newestTimestamp) 
      : null,
    userMessageCount,
    assistantMessageCount,
    systemMessageCount
  };
}

/**
 * Get storage usage summary as formatted string
 * @param conversations - Array of conversation objects
 * @returns Formatted summary string
 */
export function getStorageSummary(conversations: any[]): string {
  const stats = getStorageStats(conversations);
  
  return [
    `📊 Storage Summary`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `💾 Total Size: ${formatByteSize(stats.totalSize)}`,
    `📝 Conversations: ${stats.conversationCount}`,
    `💬 Messages: ${stats.messageCount}`,
    `   • User: ${stats.userMessageCount}`,
    `   • Assistant: ${stats.assistantMessageCount}`,
    `   • System: ${stats.systemMessageCount}`,
    `📈 Avg per conversation: ${stats.averageMessagesPerConversation} messages`,
    stats.oldestConversation ? `📅 Oldest: ${stats.oldestConversation.toLocaleDateString()}` : '',
    stats.newestConversation ? `📅 Newest: ${stats.newestConversation.toLocaleDateString()}` : ''
  ].filter(Boolean).join('\n');
}

/**
 * Estimate storage after adding content
 * @param conversations - Current conversations
 * @param newContent - Content to be added
 * @returns Estimated new total size
 */
export function estimateStorageAfterAdd(conversations: any[], newContent: string): number {
  const currentSize = getTotalConversationsSize(conversations);
  const newContentSize = getStringByteSize(newContent) + 100; // Content + overhead
  return currentSize + newContentSize;
}

/**
 * Check if storage is getting large (warning threshold)
 * @param conversations - Array of conversation objects
 * @param warningThresholdMB - Warning threshold in MB (default 50MB)
 * @returns Object with warning status and details
 */
export function checkStorageHealth(
  conversations: any[], 
  warningThresholdMB: number = 50
): {
  isHealthy: boolean;
  currentSizeMB: number;
  warningThresholdMB: number;
  percentUsed: number;
  recommendation: string;
} {
  const stats = getStorageStats(conversations);
  const currentSizeMB = stats.totalSize / (1024 * 1024);
  const percentUsed = (currentSizeMB / warningThresholdMB) * 100;
  
  let recommendation = 'Storage usage is healthy.';
  let isHealthy = true;
  
  if (percentUsed >= 100) {
    isHealthy = false;
    recommendation = 'Storage is over threshold. Consider deleting old conversations.';
  } else if (percentUsed >= 80) {
    isHealthy = false;
    recommendation = 'Storage is getting full. Consider cleanup soon.';
  } else if (percentUsed >= 50) {
    recommendation = 'Storage is at moderate usage. No action needed yet.';
  }
  
  return {
    isHealthy,
    currentSizeMB: Math.round(currentSizeMB * 100) / 100,
    warningThresholdMB,
    percentUsed: Math.round(percentUsed * 10) / 10,
    recommendation
  };
}

/**
 * Find largest conversations (for cleanup suggestions)
 * @param conversations - Array of conversation objects
 * @param limit - Number of results to return
 * @returns Array of conversations sorted by size (largest first)
 */
export function findLargestConversations(
  conversations: any[], 
  limit: number = 5
): Array<{ id: string; title: string; size: number; messageCount: number }> {
  if (!conversations || !Array.isArray(conversations)) return [];
  
  return conversations
    .map(conv => ({
      id: conv.id,
      title: conv.title || 'Untitled',
      size: getConversationSize(conv),
      messageCount: conv.messages?.length || 0
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, limit);
}

/**
 * Find oldest conversations (for cleanup suggestions)
 * @param conversations - Array of conversation objects
 * @param limit - Number of results to return
 * @returns Array of conversations sorted by date (oldest first)
 */
export function findOldestConversations(
  conversations: any[], 
  limit: number = 5
): Array<{ id: string; title: string; createdAt: Date; messageCount: number }> {
  if (!conversations || !Array.isArray(conversations)) return [];
  
  return conversations
    .filter(conv => conv.createdAt)
    .map(conv => ({
      id: conv.id,
      title: conv.title || 'Untitled',
      createdAt: new Date(conv.createdAt),
      messageCount: conv.messages?.length || 0
    }))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, limit);
}

// ============================================================================
// DEBUG HELPERS
// ============================================================================

/**
 * Log storage stats to console
 * @param conversations - Array of conversation objects
 */
export function debugStorageStats(conversations: any[]): void {
  console.log('\n' + getStorageSummary(conversations));
  console.log('\n🔍 Largest conversations:');
  findLargestConversations(conversations).forEach((conv, i) => {
    console.log(`   ${i + 1}. "${conv.title}" - ${formatByteSize(conv.size)} (${conv.messageCount} msgs)`);
  });
  console.log('\n📅 Oldest conversations:');
  findOldestConversations(conversations).forEach((conv, i) => {
    console.log(`   ${i + 1}. "${conv.title}" - ${conv.createdAt.toLocaleDateString()} (${conv.messageCount} msgs)`);
  });
}

// Expose debug function globally
if (typeof window !== 'undefined') {
  (window as any).debugStorageStats = debugStorageStats;
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  getStringByteSize,
  formatByteSize,
  getConversationSize,
  getTotalConversationsSize,
  getStorageStats,
  getStorageSummary,
  estimateStorageAfterAdd,
  checkStorageHealth,
  findLargestConversations,
  findOldestConversations,
  debugStorageStats
};