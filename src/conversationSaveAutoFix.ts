// conversationSaveAutoFix.ts
// Auto-applies the save override on startup
// ✅ FIXED: Added debounce + mutex to prevent concurrent save storms

import { conversationManager } from './ide/aiAssistant/conversationManager';
import { storageSettingsManager } from './ide/aiAssistant/storageSettingsManager';

console.log('🔧 Installing conversation save fix...');

// ============================================================================
// SAVE MUTEX — Prevents concurrent saves and debounces rapid calls
// ============================================================================

let _isSaving = false;
let _pendingSave = false;
let _saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 1000; // Wait 1s after last call before actually saving

async function _doSave(): Promise<void> {
  if (_isSaving) {
    _pendingSave = true; // Queue one more save after current completes
    return;
  }

  _isSaving = true;
  _pendingSave = false;

  try {
    const data = {
      conversations: Array.from(conversationManager.getAllConversations().map(c => [c.id, c])),
      currentConversationId: conversationManager.getCurrentConversation()?.id
    };

    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      const { writeTextFile } = (window as any).__TAURI__.fs;
      const settings = storageSettingsManager.getSettings();

      if (settings.customPath) {
        const filePath = `${settings.customPath}/ai_conversations.json`;
        await writeTextFile(filePath, JSON.stringify(data, null, 2));
        console.log(`✅ Saved to: ${filePath}`);
      } else {
        console.warn('⚠️ No custom path configured');
      }
    }
  } catch (e) {
    console.error('💾 Save failed:', e);
  } finally {
    _isSaving = false;

    // If another save was requested during this one, do one final save
    if (_pendingSave) {
      _pendingSave = false;
      _doSave();
    }
  }
}

// Override the save function with debounced version
(conversationManager as any).saveConversations = async function() {
  // Debounce: reset timer on each call, only execute after 1s of quiet
  if (_saveDebounceTimer) {
    clearTimeout(_saveDebounceTimer);
  }

  _saveDebounceTimer = setTimeout(() => {
    _saveDebounceTimer = null;
    _doSave();
  }, SAVE_DEBOUNCE_MS);
};

console.log('✅ Conversation save fix installed (with debounce + mutex)');
