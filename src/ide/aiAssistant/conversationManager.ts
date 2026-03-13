// conversationManager_fixed.ts - Fixed Conversation Persistence Manager
// This file fixes the conversation save/load issues where chats become blank after reset
// ============================================================================

import { storageSettingsManager } from './storageSettingsManager';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessageNote {
  content: string;
  createdAt: number;
  lastUpdated: number;
}

export interface Message {
  role: MessageRole;
  content: string;
  timestamp: number;
  id: string;
  note?: MessageNote;
  metadata?: {
    fileName?: string;
    language?: string;
    codeContext?: boolean;
    isHtml?: boolean;
    messageType?: 'normal' | 'suggestion' | 'code-analysis' | 'debug';
    code?: string;
    liked?: boolean;
    disliked?: boolean;
    provider?: string;
  };
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  lastUpdated: number;
  metadata?: {
    projectPath?: string;
    tags?: string[];
  };
}

interface SavedData {
  conversations: Array<[string, Conversation]> | Conversation[];
  currentConversationId: string | null;
  version?: string;
  savedAt?: number;
  lastUpdated?: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// ============================================================================
// CONVERSATION MANAGER CLASS - FIXED VERSION
// ============================================================================

class ConversationManager {
  private conversations: Map<string, Conversation> = new Map();
  private currentConversationId: string | null = null;
  private saveTimeout: number | null = null;
  private isInitialized: boolean = false;
  private isSaving: boolean = false;
  
  constructor() {
    // ✅ FIX: Backfill dates in localStorage before loading
    // This ensures the sidebar (which reads from localStorage via state.ts)
    // shows correct dates instead of today's date for all conversations
    this.backfillLocalStorageDates();
    this.loadConversations();
  }
  
  // ✅ NEW: Backfill missing dates in localStorage from message timestamps
  private backfillLocalStorageDates(): void {
    try {
      const saved = localStorage.getItem('ai_conversations');
      if (!saved) return;
      
      const data = JSON.parse(saved);
      if (!data.conversations || !Array.isArray(data.conversations)) return;
      
      let modified = false;
      
      for (const entry of data.conversations) {
        const conv = Array.isArray(entry) ? entry[1] : entry;
        if (!conv || !conv.messages?.length) continue;
        
        let earliest = Infinity;
        let latest = 0;
        for (const msg of conv.messages) {
          if (msg.timestamp) {
            if (msg.timestamp < earliest) earliest = msg.timestamp;
            if (msg.timestamp > latest) latest = msg.timestamp;
          }
        }
        
        if (!conv.createdAt && earliest !== Infinity) {
          conv.createdAt = earliest;
          modified = true;
        }
        if (!conv.lastUpdated && latest > 0) {
          conv.lastUpdated = latest;
          modified = true;
        }
        // Also fix: lastUpdated older than latest message
        if (conv.lastUpdated && latest > conv.lastUpdated) {
          conv.lastUpdated = latest;
          modified = true;
        }
      }
      
      if (modified) {
        localStorage.setItem('ai_conversations', JSON.stringify(data));
        console.log('📅 [DateFix] Backfilled conversation dates in localStorage');
      }
    } catch (e) {
      // Silent fail - localStorage might not be available
    }
  }
  
  // ==========================================================================
  // LOAD CONVERSATIONS - FIXED TO HANDLE BOTH FORMATS
  // ==========================================================================
  
  async loadConversations(): Promise<void> {
    console.log('📂 [ConversationManager] Loading conversations...');
    
    try {
      const settings = storageSettingsManager.getSettings();
      
      // Memory-only mode - no file persistence
      if (settings.storageType === 'memory-only') {
        console.log('💭 Memory-only mode - no file persistence');
        this.initializeDefaultConversation();
        this.isInitialized = true;
        return;
      }
      
      // Custom folder mode - load from file
      if (settings.customPath) {
        const filePath = `${settings.customPath}/ai_conversations.json`;
        console.log('📁 Loading from:', filePath);
        
        try {
          let fileContent: string | null = null;
          
          // Try Tauri first
          if (typeof window !== 'undefined' && (window as any).__TAURI__) {
            try {
              const { readTextFile } = (window as any).__TAURI__.fs;
              fileContent = await readTextFile(filePath);
            } catch (tauriError) {
              console.warn('Tauri read failed:', tauriError);
            }
          }
          
          // Fallback to invoke if direct read failed
          if (!fileContent && typeof window !== 'undefined' && (window as any).__TAURI__) {
            try {
              const { invoke } = (window as any).__TAURI__.core || 
                                  await import('@tauri-apps/api/core');
              fileContent = await invoke('read_file_content', { path: filePath });
            } catch (invokeError) {
              console.warn('Invoke read failed:', invokeError);
            }
          }
          
          if (fileContent) {
            const data: SavedData = JSON.parse(fileContent);
            this.parseLoadedData(data);
            console.log(`✅ Loaded ${this.conversations.size} conversations from file`);
          } else {
            console.log('📭 No saved conversations found, creating default');
            this.initializeDefaultConversation();
          }
          
        } catch (error) {
          console.error('❌ Failed to load conversations:', error);
          this.initializeDefaultConversation();
        }
      } else {
        // No custom path set
        console.log('📭 No storage path configured, using memory');
        this.initializeDefaultConversation();
      }
      
    } catch (error) {
      console.error('❌ Error in loadConversations:', error);
      this.initializeDefaultConversation();
    }
    
    this.isInitialized = true;
  }
  
  // ==========================================================================
  // PARSE LOADED DATA - HANDLES BOTH TUPLE AND OBJECT FORMATS
  // ==========================================================================
  
  private parseLoadedData(data: SavedData): void {
    this.conversations.clear();
    
    if (!data.conversations || !Array.isArray(data.conversations)) {
      console.warn('⚠️ Invalid data format, no conversations array');
      this.initializeDefaultConversation();
      return;
    }
    
    // Detect format and parse accordingly
    for (const item of data.conversations) {
      let conversation: Conversation | null = null;
      
      // Format 1: Tuple format [[id, {...}], ...]
      if (Array.isArray(item) && item.length === 2 && typeof item[0] === 'string') {
        const [id, conv] = item as [string, Conversation];
        conversation = conv;
        console.log(`📄 Parsed tuple format: ${conv.title} (${conv.messages?.length || 0} messages)`);
      }
      // Format 2: Object format [{...}, ...]
      else if (typeof item === 'object' && item !== null && 'id' in item) {
        conversation = item as Conversation;
        console.log(`📄 Parsed object format: ${conversation.title} (${conversation.messages?.length || 0} messages)`);
      }
      
      if (conversation && conversation.id) {
        // Ensure messages array exists
        if (!Array.isArray(conversation.messages)) {
          conversation.messages = [];
        }
        
        // ✅ FIX: Backfill missing date fields from message timestamps
        // Without this, conversations loaded from older formats have no dates,
        // causing the UI to fall back to Date.now() → showing today for all items
        if (!conversation.createdAt || !conversation.lastUpdated) {
          let earliest = Infinity;
          let latest = 0;
          for (const msg of conversation.messages) {
            if (msg.timestamp) {
              if (msg.timestamp < earliest) earliest = msg.timestamp;
              if (msg.timestamp > latest) latest = msg.timestamp;
            }
          }
          if (!conversation.createdAt) {
            conversation.createdAt = earliest !== Infinity ? earliest : Date.now();
          }
          if (!conversation.lastUpdated) {
            conversation.lastUpdated = latest > 0 ? latest : conversation.createdAt;
          }
          console.log(`📅 [DateFix] Backfilled dates for "${conversation.title}": created=${new Date(conversation.createdAt).toLocaleDateString()}`);
        }
        
        this.conversations.set(conversation.id, conversation);
      }
    }
    
    // Set current conversation
    if (data.currentConversationId && this.conversations.has(data.currentConversationId)) {
      this.currentConversationId = data.currentConversationId;
    } else if (this.conversations.size > 0) {
      // Use the first conversation
      this.currentConversationId = this.conversations.keys().next().value;
    }
    
    // If no conversations loaded, create default
    if (this.conversations.size === 0) {
      this.initializeDefaultConversation();
    }
    
    console.log(`✅ Parsed ${this.conversations.size} conversations, current: ${this.currentConversationId}`);
  }
  
  // ==========================================================================
  // INITIALIZE DEFAULT CONVERSATION
  // ==========================================================================
  
  private initializeDefaultConversation(): void {
    const defaultConv: Conversation = {
      id: generateId(),
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };
    
    this.conversations.set(defaultConv.id, defaultConv);
    this.currentConversationId = defaultConv.id;
    
    console.log('✅ Created default conversation:', defaultConv.id);
  }
  
  // ==========================================================================
  // SAVE CONVERSATIONS - FIXED WITH PROPER FORMAT
  // ==========================================================================
  
  async saveConversations(): Promise<void> {
    // Prevent concurrent saves
    if (this.isSaving) {
      console.log('⏳ Save already in progress, skipping...');
      return;
    }
    
    const settings = storageSettingsManager.getSettings();
    
    // Memory-only mode - no save
    if (settings.storageType === 'memory-only') {
      console.log('💭 Memory-only mode - not saving to file');
      return;
    }
    
    if (!settings.customPath) {
      console.log('⚠️ No custom path set, cannot save');
      return;
    }
    
    this.isSaving = true;
    
    try {
      // Convert Map to array of tuples for storage
      const conversationsArray: Array<[string, Conversation]> = [];
      
      this.conversations.forEach((conv, id) => {
        // Ensure messages is always an array
        const cleanConv: Conversation = {
          ...conv,
          messages: Array.isArray(conv.messages) ? conv.messages : []
        };
        conversationsArray.push([id, cleanConv]);
      });
      
      const data: SavedData = {
        conversations: conversationsArray,
        currentConversationId: this.currentConversationId,
        version: '2.0',
        savedAt: Date.now()
      };
      
      const jsonContent = JSON.stringify(data, null, 2);
      const filePath = `${settings.customPath}/ai_conversations.json`;
      
      console.log(`💾 Saving ${conversationsArray.length} conversations to:`, filePath);
      
      // Try Tauri write
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        try {
          const { writeTextFile } = (window as any).__TAURI__.fs;
          await writeTextFile(filePath, jsonContent);
          console.log('✅ Conversations saved successfully via Tauri fs');
          this.isSaving = false;
          return;
        } catch (tauriError) {
          console.warn('Tauri fs write failed, trying invoke:', tauriError);
        }
        
        // Fallback to invoke
        try {
          const { invoke } = (window as any).__TAURI__.core || 
                              await import('@tauri-apps/api/core');
          await invoke('write_file_content', { path: filePath, content: jsonContent });
          console.log('✅ Conversations saved successfully via invoke');
          this.isSaving = false;
          return;
        } catch (invokeError) {
          console.error('❌ Invoke write failed:', invokeError);
        }
      }
      
      console.error('❌ No available method to save conversations');
      
    } catch (error) {
      console.error('❌ Failed to save conversations:', error);
    } finally {
      this.isSaving = false;
    }
  }
  
  // ==========================================================================
  // DEBOUNCED SAVE - Prevents too many writes
  // ==========================================================================
  
  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // Debounce saves by 500ms
    this.saveTimeout = window.setTimeout(() => {
      this.saveConversations();
      this.saveTimeout = null;
    }, 500);
  }
  
  // ==========================================================================
  // CREATE CONVERSATION
  // ==========================================================================
  
  createConversation(title?: string): Conversation {
    const conversation: Conversation = {
      id: generateId(),
      title: title || 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };
    
    this.conversations.set(conversation.id, conversation);
    this.currentConversationId = conversation.id;
    
    console.log('✅ Created conversation:', conversation.title, conversation.id);
    
    // Save after creating
    this.scheduleSave();
    
    return conversation;
  }
  
  // ==========================================================================
  // ADD MESSAGE - FIXED TO SAVE PROPERLY
  // ==========================================================================
  
  addMessage(role: MessageRole, content: string, metadata?: Message['metadata']): Message {
    const conversation = this.getCurrentConversation();
    if (!conversation) {
      console.error('❌ No current conversation to add message to');
      throw new Error('No current conversation');
    }
    
    const message: Message = {
      id: generateId(),
      role,
      content,
      timestamp: Date.now(),
      metadata
    };
    
    // Ensure messages array exists
    if (!Array.isArray(conversation.messages)) {
      conversation.messages = [];
    }
    
    conversation.messages.push(message);
    conversation.lastUpdated = Date.now();
    
    // Auto-generate title from first user message
    if (role === 'user' && conversation.messages.length === 1 && conversation.title === 'New Conversation') {
      const firstWords = content.substring(0, 40).trim();
      conversation.title = firstWords.length < content.length ? `${firstWords}...` : firstWords;
    }
    
    console.log(`💬 Added ${role} message to "${conversation.title}" (now ${conversation.messages.length} messages)`);
    
    // Save after adding message
    this.scheduleSave();
    
    return message;
  }
  
  // ==========================================================================
  // GET METHODS
  // ==========================================================================
  
  getCurrentConversation(): Conversation | null {
    if (!this.currentConversationId) return null;
    return this.conversations.get(this.currentConversationId) || null;
  }
  
  getConversationById(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }
  
  getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.lastUpdated - a.lastUpdated);
  }
  
  // ==========================================================================
  // SET CURRENT CONVERSATION
  // ==========================================================================
  
  setCurrentConversation(id: string): boolean {
    if (this.conversations.has(id)) {
      this.currentConversationId = id;
      this.scheduleSave();
      return true;
    }
    return false;
  }
  // ==========================================================================
// SWITCH TO CONVERSATION
// ==========================================================================

switchToConversation(id: string): Conversation | null {
  if (this.setCurrentConversation(id)) {
    return this.getConversationById(id) || null;
  }
  return null;
}

// ==========================================================================
// DELETE MULTIPLE CONVERSATIONS
// ==========================================================================

deleteConversations(ids: string[]): number {
  let deletedCount = 0;
  for (const id of ids) {
    if (this.deleteConversation(id)) {
      deletedCount++;
    }
  }
  return deletedCount;
}
  // ==========================================================================
  // UPDATE CONVERSATION TITLE
  // ==========================================================================
  
  updateConversationTitle(id: string, title: string): boolean {
    const conversation = this.conversations.get(id);
    if (conversation) {
      conversation.title = title;
      conversation.lastUpdated = Date.now();
      this.scheduleSave();
      return true;
    }
    return false;
  }
  
  // ==========================================================================
  // DELETE CONVERSATION
  // ==========================================================================
  
  deleteConversation(id: string): boolean {
    if (!this.conversations.has(id)) {
      return false;
    }
    
    const wasDeleted = this.conversations.delete(id);
    
    // If we deleted the current conversation, switch to another or create new
    if (id === this.currentConversationId) {
      if (this.conversations.size > 0) {
        this.currentConversationId = this.conversations.keys().next().value;
      } else {
        this.initializeDefaultConversation();
      }
    }
    
    if (wasDeleted) {
      console.log('🗑️ Deleted conversation:', id);
      this.scheduleSave();
    }
    
    return wasDeleted;
  }
  
  // ==========================================================================
  // CLEAR ALL CONVERSATIONS
  // ==========================================================================
  
  clearAllConversations(): void {
    this.conversations.clear();
    this.initializeDefaultConversation();
    this.scheduleSave();
    console.log('🗑️ Cleared all conversations');
  }
  
  // ==========================================================================
  // SEARCH CONVERSATIONS
  // ==========================================================================
  
  searchConversations(query: string): Conversation[] {
    const lowerQuery = query.toLowerCase();
    
    return this.getAllConversations().filter(conv => {
      // Search in title
      if (conv.title.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Search in messages
      return conv.messages.some(msg => 
        msg.content.toLowerCase().includes(lowerQuery)
      );
    });
  }
  
  // ==========================================================================
  // FORCE SAVE - For immediate saves without debounce
  // ==========================================================================
  
  async forceSave(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    await this.saveConversations();
  }
  
  // ==========================================================================
  // DEBUG HELPER
  // ==========================================================================
  
  debug(): void {
    console.log('═══════════════════════════════════════════════════════');
    console.log('CONVERSATION MANAGER DEBUG');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Total conversations:', this.conversations.size);
    console.log('Current conversation ID:', this.currentConversationId);
    console.log('Is initialized:', this.isInitialized);
    console.log('Is saving:', this.isSaving);
    console.log('───────────────────────────────────────────────────────');
    
    this.conversations.forEach((conv, id) => {
      console.log(`📄 ${conv.title}`);
      console.log(`   ID: ${id}`);
      console.log(`   Messages: ${conv.messages?.length || 0}`);
      console.log(`   Created: ${new Date(conv.createdAt).toLocaleString()}`);
      console.log(`   Updated: ${new Date(conv.lastUpdated).toLocaleString()}`);
    });
    
    console.log('═══════════════════════════════════════════════════════');
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const conversationManager = new ConversationManager();

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).conversationManager = conversationManager;
  (window as any).debugConversations = () => conversationManager.debug();
  
  console.log('✅ ConversationManager loaded');
  console.log('💡 Debug: window.debugConversations()');
}
