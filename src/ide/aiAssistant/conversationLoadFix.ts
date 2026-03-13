// conversationLoadFix.ts
// ============================================================================
// AUTO-FIX for Conversation Persistence - Messages becoming blank after reset
// ============================================================================
// 
// This fix ensures conversations are properly saved and loaded
//
// ============================================================================
import './conversationUIFix';
import { conversationManager } from './conversationManager';
import { storageSettingsManager } from './storageSettingsManager';
import './conversationDeleteFix';
console.log('🔧 [ConversationLoadFix] Initializing...');

// ============================================================================
// FIX 1: Patch saveConversations to ensure proper format
// ============================================================================

const originalSave = conversationManager.saveConversations?.bind(conversationManager);

if (originalSave) {
  conversationManager.saveConversations = async function(): Promise<void> {
    const settings = storageSettingsManager.getSettings();
    
    // Memory-only mode - skip save
    if (settings.storageType === 'memory-only') {
      console.log('💭 [LoadFix] Memory-only mode - not saving');
      return;
    }
    
    if (!settings.customPath) {
      console.log('⚠️ [LoadFix] No custom path set');
      return;
    }
    
    try {
      // Get all conversations
      const allConversations = conversationManager.getAllConversations();
      const currentConv = conversationManager.getCurrentConversation();
      
      // Build proper save format with tuples
      const conversationsArray: Array<[string, any]> = allConversations.map(conv => {
        // Ensure messages array exists and is valid
        const cleanConv = {
          id: conv.id,
          title: conv.title,
          messages: Array.isArray(conv.messages) ? conv.messages : [],
          createdAt: conv.createdAt || Date.now(),
          lastUpdated: conv.lastUpdated || Date.now(),
          metadata: conv.metadata || {}
        };
        return [conv.id, cleanConv];
      });
      
      const saveData = {
        conversations: conversationsArray,
        currentConversationId: currentConv?.id || null,
        version: '2.0',
        savedAt: Date.now()
      };
      
      const filePath = `${settings.customPath}/ai_conversations.json`;
      const jsonContent = JSON.stringify(saveData, null, 2);
      
      console.log(`💾 [LoadFix] Saving ${conversationsArray.length} conversations to: ${filePath}`);
      
      // Try Tauri fs first
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        try {
          // Method 1: writeTextFile
          if ((window as any).__TAURI__.fs?.writeTextFile) {
            await (window as any).__TAURI__.fs.writeTextFile(filePath, jsonContent);
            console.log('✅ [LoadFix] Saved via Tauri fs.writeTextFile');
            return;
          }
        } catch (e1) {
          console.warn('[LoadFix] fs.writeTextFile failed:', e1);
        }
        
        try {
          // Method 2: invoke write_file_content
          const { invoke } = (window as any).__TAURI__.core || 
                              await import('@tauri-apps/api/core');
          await invoke('write_file_content', { path: filePath, content: jsonContent });
          console.log('✅ [LoadFix] Saved via invoke write_file_content');
          return;
        } catch (e2) {
          console.warn('[LoadFix] invoke write_file_content failed:', e2);
        }
      }
      
      // Fallback to original
      if (originalSave) {
        await originalSave();
      }
      
    } catch (error) {
      console.error('❌ [LoadFix] Save error:', error);
      // Try original save as last resort
      if (originalSave) {
        try {
          await originalSave();
        } catch (e) {
          console.error('❌ [LoadFix] Original save also failed:', e);
        }
      }
    }
  };
  
  console.log('✅ [LoadFix] saveConversations patched');
}

// ============================================================================
// FIX 2: Auto-save on message add
// ============================================================================

// ✅ FIX: Removed addMessage auto-save patch
// conversationManager.addMessage already calls scheduleSave() internally (500ms debounce)
// The extra save at 300ms was racing with the debounce and causing double saves
// Original patch removed - addMessage now relies on ConversationManager.scheduleSave()
console.log('✅ [LoadFix] addMessage auto-save removed (handled by conversationManager.scheduleSave)');

// ============================================================================
// FIX 3: Auto-save on window unload
// ============================================================================

if (typeof window !== 'undefined') {
  // Save before closing
  window.addEventListener('beforeunload', () => {
    console.log('💾 [LoadFix] Auto-saving before unload...');
    const settings = storageSettingsManager.getSettings();
    if (settings.storageType !== 'memory-only' && settings.customPath) {
      conversationManager.saveConversations?.();
    }
  });
  
  // Also save periodically (every 30 seconds)
  setInterval(() => {
    const settings = storageSettingsManager.getSettings();
    if (settings.storageType !== 'memory-only' && settings.customPath) {
      console.log('⏰ [LoadFix] Periodic auto-save...');
      conversationManager.saveConversations?.();
    }
  }, 30000);
  
  console.log('✅ [LoadFix] Auto-save listeners registered');
}

// ============================================================================
// FIX 4: Listen for storage settings changes
// ============================================================================

if (typeof window !== 'undefined') {
  // Listen for storage path changes
  window.addEventListener('storage-settings-changed', async (event: any) => {
    const { settings, event: changeType } = event.detail || {};
    
    console.log('📁 [LoadFix] Storage settings changed:', changeType, settings);
    
    if (changeType === 'path-changed' || changeType === 'type-changed') {
      console.log('🔄 [LoadFix] Migrating conversations to new path...');
      
      setTimeout(async () => {
        try {
          await conversationManager.saveConversations?.();
          console.log('✅ [LoadFix] Conversations saved to new location');
        } catch (error) {
          console.error('❌ [LoadFix] Migration failed:', error);
        }
      }, 200);
    }
  });
  
  // Listen for explicit migration request
  window.addEventListener('migrate-conversations', async () => {
    console.log('📁 [LoadFix] Migration requested');
    
    setTimeout(async () => {
      try {
        await conversationManager.saveConversations?.();
        console.log('✅ [LoadFix] Conversations migrated');
      } catch (error) {
        console.error('❌ [LoadFix] Migration failed:', error);
      }
    }, 100);
  });
}

// ============================================================================
// FIX 5: Debug helpers
// ============================================================================

if (typeof window !== 'undefined') {
  // Debug: Show current state
  (window as any).debugConversationPersistence = async function() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('CONVERSATION PERSISTENCE DEBUG');
    console.log('═══════════════════════════════════════════════════════');
    
    const settings = storageSettingsManager.getSettings();
    console.log('Storage Type:', settings.storageType);
    console.log('Custom Path:', settings.customPath);
    
    const allConvs = conversationManager.getAllConversations();
    console.log('Total conversations in memory:', allConvs.length);
    
    allConvs.forEach((conv: any, i: number) => {
      console.log(`${i + 1}. ${conv.title}`);
      console.log(`   ID: ${conv.id}`);
      console.log(`   Messages: ${conv.messages?.length || 0}`);
    });
    
    // Try to read file
    if (settings.customPath) {
      const filePath = `${settings.customPath}/ai_conversations.json`;
      console.log('\nTrying to read:', filePath);
      
      try {
        const { invoke } = (window as any).__TAURI__?.core || 
                            await import('@tauri-apps/api/core');
        const content = await invoke('read_file_content', { path: filePath });
        const data = JSON.parse(content);
        console.log('File contents:', data);
        console.log('Conversations in file:', data.conversations?.length || 0);
        
        // Show each conversation's message count
        if (data.conversations) {
          data.conversations.forEach((item: any, i: number) => {
            const conv = Array.isArray(item) ? item[1] : item;
            console.log(`  File conv ${i + 1}: ${conv?.title} - ${conv?.messages?.length || 0} messages`);
          });
        }
      } catch (e) {
        console.log('Could not read file:', e);
      }
    }
    
    console.log('═══════════════════════════════════════════════════════');
  };
  
  // Force save
  (window as any).forceSaveConversations = function() {
    console.log('💾 Force saving...');
    conversationManager.saveConversations?.();
  };
  
  // Debug storage settings
  (window as any).debugStorageSettings = function() {
    const settings = storageSettingsManager.getSettings();
    console.log('═══════════════════════════════════════════════════════');
    console.log('STORAGE SETTINGS DEBUG');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Storage Type:', settings.storageType);
    console.log('Custom Path:', settings.customPath || '(not set)');
    console.log('File Path:', storageSettingsManager.getConversationFilePath());
    console.log('═══════════════════════════════════════════════════════');
  };
  
  console.log('✅ [ConversationLoadFix] Loaded!');
  console.log('💡 Debug commands:');
  console.log('   - debugConversationPersistence()  - Show current state');
  console.log('   - forceSaveConversations()        - Force save now');
  console.log('   - debugStorageSettings()          - Show storage settings');
}

export {};
