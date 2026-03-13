// conversationUI.ts - Complete Professional Conversation Management UI with Enhanced Export
import { initMessageCollapse } from './ide/aiAssistant/messageCollapseManager';
import { conversationManager } from './conversationManager';
import { 
  Message, 
  MessageNote,
  generateId, 
  formatTime, 
  escapeHtml,
  getProviderInfo
} from './assistantUI';
import { getCurrentApiConfiguration } from '../../state';
import { getCurrentApiConfigurationForced, callGenericAPI } from './apiProviderManager';
import { showNotification } from './notificationManager';
import { messageNotes } from './noteManager';
import { setIsSavingEnabled } from './messageQueueManager';
import { setCodeAnalysisMode } from './codeContextManager';
import { addMessageToChat, addSystemMessage } from './messageUI';
import { 
  getConversationSize, 
  formatByteSize, 
  getStorageStats 
} from './storageUtils';
import { 
  formatConversationTime, 
  formatConversationDate 
} from './dateFormatUtils';
import { addStorageSettingsButton } from './storageSettingsUI';
import { storageSettingsManager } from './storageSettingsManager';
import { setConversationLoading } from './conversationLoadingFix';
 import './conversationListCompact.css';
 import './conversationUIFix';

// ============================================================================
// DEDUPLICATION STATE - Prevents duplicate message rendering after IDE reset
// ============================================================================
// Problem: Messages were displayed 2-3 times because loadConversationToUI() 
// was called from multiple places during initialization:
//   1. renderCurrentConversation() in main.ts
//   2. initializeAssistantUI() in assistantUI.ts
//   3. initializeConversationModule() delayed call
// Solution: Track loaded conversations and skip if already loaded recently
// ============================================================================
let __lastLoadedConvId: string | null = null;
let __lastLoadedTime: number = 0;
let __isCurrentlyLoading: boolean = false;
const __LOAD_DEBOUNCE_MS = 500; // Minimum time between loads of same conversation

/**
 * Check if we should skip loading this conversation (already loaded recently)
 */
function __shouldSkipConversationLoad(convId: string): boolean {
  const now = Date.now();
  
  // If currently in the middle of loading, skip
  if (__isCurrentlyLoading) {
    console.log('⏳ [Dedup] Skipping load - already loading in progress');
    return true;
  }
  
  // If same conversation was loaded within debounce window, skip
  if (convId === __lastLoadedConvId && (now - __lastLoadedTime) < __LOAD_DEBOUNCE_MS) {
    console.log('⏳ [Dedup] Skipping load - conversation loaded recently:', convId.substring(0, 8) + '...');
    return true;
  }
  
  return false;
}

/**
 * Reset deduplication state (call this when user explicitly switches conversations)
 */
export function resetConversationDedup(): void {
  __lastLoadedConvId = null;
  __lastLoadedTime = 0;
  __isCurrentlyLoading = false;
  console.log('🔄 [Dedup] State reset');
}

/**
 * Force reload current conversation (bypasses dedup)
 */
export function forceReloadCurrentConversation(): void {
  resetConversationDedup();
  const conv = conversationManager.getCurrentConversation();
  if (conv) {
    loadConversationToUI(conv);
  }
}

// Expose dedup functions globally for debugging
if (typeof window !== 'undefined') {
  (window as any).__conversationDedup = {
    reset: resetConversationDedup,
    forceReload: forceReloadCurrentConversation,
    getState: () => ({
      lastLoadedConvId: __lastLoadedConvId,
      lastLoadedTime: __lastLoadedTime,
      isCurrentlyLoading: __isCurrentlyLoading,
      timeSinceLastLoad: Date.now() - __lastLoadedTime
    })
  };
}

// Selection mode state
let isSelectionMode = false;
let selectedConversations = new Set<string>();

// ============================================================================
// Main Conversation Controls
// ============================================================================

export function addConversationControls(): void {
  const assistantPanel = document.querySelector('.assistant-panel');
  if (!assistantPanel) return;
  
  if (document.querySelector('.conversation-header')) return;
  
  const conversationHeader = document.createElement('div');
  conversationHeader.className = 'conversation-header';
  conversationHeader.innerHTML = `
    <style>
      .conversation-header {
        display: flex;
        flex-direction: column;
        background: linear-gradient(180deg, #1e1e1e 0%, #252526 100%);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding: 0;
        user-select: none;
      }
      .conversation-header-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 10px;
        gap: 10px;
      }
      .conversation-title-section {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        min-width: 0;
      }
      .conversation-title {
        font-size: 12px;
        font-weight: 600;
        color: #4fc3f7;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 160px;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 3px;
        transition: all 0.2s ease;
      }
      .conversation-title:hover {
        background: rgba(79, 195, 247, 0.1);
      }
      .title-edit-btn {
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        padding: 2px;
        cursor: pointer;
        color: #808080;
        transition: color 0.2s;
      }
      .title-edit-btn:hover {
        color: #4fc3f7;
      }
      .conversation-info-badges {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .info-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 3px;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.6);
        white-space: nowrap;
      }
      .info-badge svg {
        opacity: 0.6;
        flex-shrink: 0;
      }
      .info-badge .badge-value {
        color: rgba(255, 255, 255, 0.8);
        font-weight: 500;
        min-width: 28px;
        text-align: right;
      }
      .info-badge .badge-value.size-value {
        min-width: 50px;
      }
      .conversation-controls {
        display: flex;
        align-items: center;
        gap: 3px;
      }
      .conv-ctrl-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 3px;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .conv-ctrl-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.15);
        color: rgba(255, 255, 255, 0.9);
        transform: translateY(-1px);
      }
      .conv-ctrl-btn:active {
        transform: translateY(0);
      }
      .conv-ctrl-btn.primary {
        background: rgba(79, 195, 247, 0.15);
        border-color: rgba(79, 195, 247, 0.3);
        color: #4fc3f7;
      }
      .conv-ctrl-btn.primary:hover {
        background: rgba(79, 195, 247, 0.25);
        border-color: rgba(79, 195, 247, 0.5);
        box-shadow: 0 2px 8px rgba(79, 195, 247, 0.2);
      }
      .control-separator {
        width: 1px;
        height: 14px;
        background: rgba(255, 255, 255, 0.1);
        margin: 0 2px;
      }
    </style>
    <div class="conversation-header-top">
      <div class="conversation-title-section">
        <span class="conversation-title" id="conversation-title" title="Click to edit">New Conversation</span>
        <button class="title-edit-btn" id="edit-title-btn" title="Edit title" style="display: flex !important; visibility: visible !important; opacity: 1 !important; background: transparent; border: none; padding: 2px; color: #808080;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <div class="conversation-info-badges" id="conversation-info">
          <span id="message-count" style="display:none;">0</span>
          <span id="conversation-size" style="display:none;">0 B</span>
        </div>
      </div>
      <div class="conversation-controls">
        <button id="new-conversation-btn" class="conv-ctrl-btn" title="New Conversation (Ctrl+Shift+N)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button id="conversation-list-btn" class="conv-ctrl-btn" title="History (Ctrl+Shift+H)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>
        <button id="export-conversation-btn" class="conv-ctrl-btn" title="Export (Ctrl+Shift+E)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
        <button id="storage-settings-bar-btn" class="conv-ctrl-btn" title="Storage Settings">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
        </button>
        <div class="control-separator"></div>
        <button id="conversation-menu-btn" class="conv-ctrl-btn menu-btn" title="More options">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="12" cy="5" r="1"></circle>
            <circle cx="12" cy="19" r="1"></circle>
          </svg>
        </button>
      </div>
    </div>

  `;
  
  // Create dropdown menu
  const dropdownMenu = document.createElement('div');
  dropdownMenu.id = 'conversation-dropdown-menu';
  dropdownMenu.className = 'dropdown-menu';
  dropdownMenu.style.display = 'none';
  dropdownMenu.innerHTML = `
    <button class="dropdown-item" id="rename-conversation">
      <span class="dropdown-icon">✏️</span>
      <span>Rename conversation</span>
    </button>
    <button class="dropdown-item" id="duplicate-conversation">
      <span class="dropdown-icon">📋</span>
      <span>Duplicate conversation</span>
    </button>
    <div class="dropdown-separator"></div>
    <button class="dropdown-item" id="clear-messages">
      <span class="dropdown-icon">🧹</span>
      <span>Clear messages</span>
    </button>
    <button class="dropdown-item danger" id="delete-conversation">
      <span class="dropdown-icon">🗑️</span>
      <span>Delete conversation</span>
    </button>
    <div class="dropdown-separator"></div>
    <button class="dropdown-item danger" id="clear-all-conversations">
      <span class="dropdown-icon">⚠️</span>
      <span>Clear all conversations</span>
    </button>
  `;
  
  conversationHeader.appendChild(dropdownMenu);
  assistantPanel.insertBefore(conversationHeader, assistantPanel.firstChild);
  
  // Expose conversationManager globally for context dashboard
  (window as any).conversationManager = conversationManager;
  
  setupConversationEventListeners();
  addConversationListModal();
  updateConversationInfo();
}

function setupConversationEventListeners(): void {
  // New conversation button
  const newConvBtn = document.getElementById('new-conversation-btn');
  if (newConvBtn) {
    newConvBtn.addEventListener('click', () => {
      const conv = conversationManager.createConversation();
      loadConversationToUI(conv);
      showNotification('New conversation started', 'success');
      updateConversationInfo();
    });
  }
  
  // Conversation list button
  const listBtn = document.getElementById('conversation-list-btn');
  if (listBtn) {
    listBtn.addEventListener('click', showConversationList);
  }
  
  // Export button - now shows options dialog
  const exportBtn = document.getElementById('export-conversation-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const currentConv = conversationManager.getCurrentConversation();
      if (currentConv) {
        showProfessionalExportDialog(currentConv);
      } else {
        showNotification('No conversation to export', 'warning');
      }
    });
  }
  
  // Storage Settings button
  const storageBarBtn = document.getElementById('storage-settings-bar-btn');
  if (storageBarBtn) {
    // Set initial color based on storage mode
    const updateStorageBtnColor = () => {
      import('./storageSettingsManager').then(mod => {
        const settings = mod.storageSettingsManager.getSettings();
        const isCustom = settings.storageType !== 'memory-only' && settings.customPath;
        const svg = storageBarBtn.querySelector('svg');
        if (svg) {
          svg.style.stroke = isCustom ? '#48bb78' : '#f56565';
          svg.style.filter = isCustom ? 'drop-shadow(0 0 3px rgba(72,187,120,0.5))' : 'drop-shadow(0 0 3px rgba(245,101,101,0.5))';
        }
        storageBarBtn.title = isCustom ? 'Storage: Custom Folder' : 'Storage: Memory Only (not saved)';
      });
    };
    updateStorageBtnColor();

    storageBarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const existing = document.querySelector('.storage-settings-container');
      if (existing) { existing.remove(); updateStorageBtnColor(); return; }
      import('./storageSettingsUI').then(mod => {
        const ui = mod.createStorageSettingsUI();
        document.body.appendChild(ui);
        // Update color when settings modal closes
        const observer = new MutationObserver(() => {
          if (!document.querySelector('.storage-settings-container')) {
            updateStorageBtnColor();
            observer.disconnect();
          }
        });
        observer.observe(document.body, { childList: true });
      }).catch(err => {
        console.error('Failed to load storage settings:', err);
      });
    });

    // Listen for storage changes
    window.addEventListener('storage-settings-changed', () => updateStorageBtnColor());
  }

  // Menu button and dropdown
  const menuBtn = document.getElementById('conversation-menu-btn');
  const dropdownMenu = document.getElementById('conversation-dropdown-menu') as HTMLElement;
  
  if (menuBtn && dropdownMenu) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = dropdownMenu.style.display !== 'none';
      dropdownMenu.style.display = isVisible ? 'none' : 'block';
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      if (dropdownMenu) {
        dropdownMenu.style.display = 'none';
      }
    });
    
    // Prevent dropdown from closing when clicking inside
    dropdownMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  
  // Edit title button
  const editTitleBtn = document.getElementById('edit-title-btn');
  if (editTitleBtn) {
    editTitleBtn.addEventListener('click', handleRenameConversation);
  }
  
  // Dropdown menu items
  document.getElementById('rename-conversation')?.addEventListener('click', () => {
    handleRenameConversation();
    if (dropdownMenu) dropdownMenu.style.display = 'none';
  });
  
  document.getElementById('duplicate-conversation')?.addEventListener('click', () => {
    handleDuplicateConversation();
    if (dropdownMenu) dropdownMenu.style.display = 'none';
  });
  
  document.getElementById('clear-messages')?.addEventListener('click', () => {
    if (confirm('Clear all messages in this conversation?')) {
      const conv = conversationManager.getCurrentConversation();
      if (conv) {
        conv.messages = [];
        conv.lastUpdated = Date.now();
        conversationManager.saveConversations();
        loadConversationToUI(conv);
        showNotification('Messages cleared', 'info');
        updateConversationInfo();
      }
    }
    if (dropdownMenu) dropdownMenu.style.display = 'none';
  });
  
  document.getElementById('delete-conversation')?.addEventListener('click', () => {
    const conv = conversationManager.getCurrentConversation();
    if (conv && confirm('Delete this conversation?')) {
      conversationManager.deleteConversation(conv.id);
      const newConv = conversationManager.getCurrentConversation();
      if (newConv) {
        loadConversationToUI(newConv);
      }
      showNotification('Conversation deleted', 'info');
      updateConversationInfo();
    }
    if (dropdownMenu) dropdownMenu.style.display = 'none';
  });
  
  document.getElementById('clear-all-conversations')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear ALL conversations? This cannot be undone.')) {
      conversationManager.clearAllConversations();
      const conv = conversationManager.getCurrentConversation();
      if (conv) {
        loadConversationToUI(conv);
      }
      showNotification('All conversations cleared', 'info');
      updateConversationInfo();
    }
    if (dropdownMenu) dropdownMenu.style.display = 'none';
  });
}

function handleRenameConversation(): void {
  const conv = conversationManager.getCurrentConversation();
  if (!conv) return;
  
  showRenameModal(conv.title, (newTitle) => {
    if (newTitle && newTitle.trim()) {
      conversationManager.updateConversationTitle(conv.id, newTitle.trim());
      updateConversationTitle(newTitle.trim());
      showNotification('Conversation renamed', 'success');
    }
  });
}

// Custom rename modal dialog
function showRenameModal(currentTitle: string, onConfirm: (newTitle: string) => void): void {
  // Remove existing modal if any
  const existingModal = document.getElementById('rename-modal-overlay');
  if (existingModal) existingModal.remove();
  
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'rename-modal-overlay';
  modalOverlay.innerHTML = `
    <style>
      #rename-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.15s ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(-20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .rename-modal {
        background: linear-gradient(180deg, #2d2d2d 0%, #252526 100%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 0;
        min-width: 360px;
        max-width: 450px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        animation: slideIn 0.2s ease-out;
        overflow: hidden;
      }
      .rename-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: rgba(0, 0, 0, 0.2);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .rename-modal-header h3 {
        margin: 0;
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .rename-modal-header h3 svg {
        color: #4fc3f7;
      }
      .rename-modal-close {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      }
      .rename-modal-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.9);
      }
      .rename-modal-body {
        padding: 16px;
      }
      .rename-modal-label {
        display: block;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .rename-modal-input {
        width: 100%;
        padding: 10px 12px;
        background: #1e1e1e;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        color: rgba(255, 255, 255, 0.9);
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
      }
      .rename-modal-input:focus {
        border-color: #4fc3f7;
        box-shadow: 0 0 0 3px rgba(79, 195, 247, 0.15);
      }
      .rename-modal-input::placeholder {
        color: rgba(255, 255, 255, 0.3);
      }
      .rename-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 12px 16px;
        background: rgba(0, 0, 0, 0.15);
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
      .rename-modal-btn {
        padding: 8px 16px;
        border-radius: 5px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .rename-modal-btn-cancel {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: rgba(255, 255, 255, 0.7);
      }
      .rename-modal-btn-cancel:hover {
        background: rgba(255, 255, 255, 0.12);
        color: rgba(255, 255, 255, 0.9);
      }
      .rename-modal-btn-confirm {
        background: linear-gradient(180deg, #4fc3f7 0%, #29b6f6 100%);
        border: 1px solid #4fc3f7;
        color: #000;
      }
      .rename-modal-btn-confirm:hover {
        background: linear-gradient(180deg, #81d4fa 0%, #4fc3f7 100%);
        box-shadow: 0 2px 8px rgba(79, 195, 247, 0.3);
      }
    </style>
    <div class="rename-modal">
      <div class="rename-modal-header">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Rename Conversation
        </h3>
        <button class="rename-modal-close" id="rename-modal-close" title="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="rename-modal-body">
        <label class="rename-modal-label">Conversation Title</label>
        <input type="text" class="rename-modal-input" id="rename-modal-input" placeholder="Enter title..." value="${escapeHtml(currentTitle)}">
      </div>
      <div class="rename-modal-footer">
        <button class="rename-modal-btn rename-modal-btn-cancel" id="rename-modal-cancel">
          Cancel
        </button>
        <button class="rename-modal-btn rename-modal-btn-confirm" id="rename-modal-confirm">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Save
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modalOverlay);
  
  const input = document.getElementById('rename-modal-input') as HTMLInputElement;
  const closeBtn = document.getElementById('rename-modal-close');
  const cancelBtn = document.getElementById('rename-modal-cancel');
  const confirmBtn = document.getElementById('rename-modal-confirm');
  
  // Focus and select input
  setTimeout(() => {
    input?.focus();
    input?.select();
  }, 50);
  
  // Close modal function
  const closeModal = () => {
    modalOverlay.style.animation = 'fadeIn 0.15s ease-out reverse';
    setTimeout(() => modalOverlay.remove(), 150);
  };
  
  // Confirm function
  const confirmRename = () => {
    const newTitle = input?.value;
    closeModal();
    if (newTitle) {
      onConfirm(newTitle);
    }
  };
  
  // Event listeners
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  confirmBtn?.addEventListener('click', confirmRename);
  
  // Click outside to close
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });
  
  // Enter to confirm, Escape to close
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmRename();
    } else if (e.key === 'Escape') {
      closeModal();
    }
  });
}

function handleDuplicateConversation(): void {
  const conv = conversationManager.getCurrentConversation();
  if (!conv) return;
  
  const newConv = conversationManager.createConversation(`${conv.title} (Copy)`);
  
  // Copy messages
  conv.messages.forEach(msg => {
    conversationManager.addMessage(msg.role, msg.content, msg.metadata);
  });
  
  loadConversationToUI(newConv);
  showNotification('Conversation duplicated', 'success');
  updateConversationInfo();
}

// ============================================================================
// Professional Export Dialog with AI Memory and Enhanced Dropdown
// ============================================================================

async function generateAIMemorySummary(conversation: any): Promise<string> {
  try {
    const conversationText = conversation.messages
      .map((msg: Message) => {
        let cleanContent = msg.content
          .replace(/<[^>]*>/g, '')
          .replace(/```[\s\S]*?```/g, '[CODE BLOCK]')
          .trim();
        
        return `${msg.role.toUpperCase()}: ${cleanContent}`;
      })
      .join('\n\n');
    
    const maxLength = 10000;
    const truncatedText = conversationText.length > maxLength 
      ? conversationText.substring(0, maxLength) + '...[TRUNCATED]'
      : conversationText;
    
    const memoryPrompt = `Analyze this conversation to create an AI Memory profile. Focus on learning patterns, user behavior, preferences, and knowledge gained.

Structure your analysis as follows:

## User Profile & Behavior Patterns
- Working style and preferences
- Communication patterns
- Technical skill level and areas of expertise
- Problem-solving approach
- Learning style

## Knowledge & Skills Demonstrated
- Technologies and tools mentioned/used
- Domains of interest
- Skill progression observed
- Areas of strength and growth

## User Goals & Objectives
- Stated goals
- Implicit objectives
- Project priorities
- Success criteria mentioned

## Key Insights & Learning Points
- Important discoveries made
- Solutions that worked well
- Challenges encountered and overcome
- Lessons learned

## Recurring Patterns & Preferences
- Common questions or issues
- Preferred solutions or approaches
- Workflow preferences
- Decision-making patterns

## Progress & Development
- Skills developed during conversation
- Problems solved
- Understanding gained
- Next steps identified

## AI Interaction Preferences
- Preferred response style
- Level of detail needed
- Types of help most valued
- Communication effectiveness

## Memory Notes for Future Interactions
- Important context to remember
- User-specific preferences
- Effective approaches that worked
- Areas to focus on in future

Conversation to analyze:
${truncatedText}`;

    const config = getCurrentApiConfiguration();
    if (!config.apiKey || !config.apiBaseUrl) {
      return '';
    }

    const memorySummary = await callGenericAPI(memoryPrompt, config);
    return memorySummary;
  } catch (error) {
    console.error('Failed to generate AI memory summary:', error);
    return '';
  }
}

async function generateConversationSummary(conversation: any): Promise<string> {
  try {
    const conversationText = conversation.messages
      .map((msg: Message) => {
        let cleanContent = msg.content
          .replace(/<[^>]*>/g, '')
          .replace(/```[\s\S]*?```/g, '[CODE BLOCK]')
          .trim();
        
        return `${msg.role.toUpperCase()}: ${cleanContent}`;
      })
      .join('\n\n');
    
    const maxLength = 8000;
    const truncatedText = conversationText.length > maxLength 
      ? conversationText.substring(0, maxLength) + '...[TRUNCATED]'
      : conversationText;
    
    const summaryPrompt = `Please analyze and provide a comprehensive summary of this conversation.

Format your response with these sections:

## Overview
[2-3 sentence high-level summary]

## Key Topics
[Bullet list of main topics discussed]

## Technical Solutions
[Any code, algorithms, or technical approaches provided]

## Decisions & Conclusions
[Important decisions made or conclusions reached]

## Action Items
[Any next steps or todo items identified]

## Notable Insights
[Key insights, learnings, or important information shared]

Conversation to summarize:
${truncatedText}`;

    const config = getCurrentApiConfiguration();
    if (!config.apiKey || !config.apiBaseUrl) {
      return '';
    }

    const summary = await callGenericAPI(summaryPrompt, config);
    return summary;
  } catch (error) {
    console.error('Failed to generate summary:', error);
    return '';
  }
}

function showProfessionalExportDialog(conversation: any): void {
  // Remove any existing dialog
  const existingDialog = document.getElementById('export-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }

  const dialog = document.createElement('div');
  dialog.id = 'export-dialog';
  dialog.className = 'professional-export-dialog-overlay';
  dialog.innerHTML = `
    <div class="professional-export-dialog">
      <div class="export-header">
        <div class="header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </div>
        <h2>Export Conversation</h2>
        <button class="close-btn" id="close-export-dialog">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="export-body">
        <!-- Export Method Selection -->
        <div class="export-section">
          <h3 class="section-title">Export Method</h3>
          
          <div class="export-method-cards">
            <!-- AI Memory Card -->
            <label class="method-card ai-memory-card">
              <input type="radio" name="export-method" value="ai-memory" checked>
              <div class="card-content">
                <div class="card-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#gradient1)" stroke-width="1.5">
                    <defs>
                      <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                      </linearGradient>
                    </defs>
                    <path d="M12 2L2 7L12 12L22 7L12 2Z"></path>
                    <path d="M2 17L12 22L22 17"></path>
                    <path d="M2 12L12 17L22 12"></path>
                  </svg>
                </div>
                <div class="card-text">
                  <h4>AI Memory Analysis</h4>
                  <p>Intelligent analysis focusing on learning patterns, user behavior, and knowledge gained</p>
                </div>
                <div class="card-badge">Recommended</div>
              </div>
            </label>
            
            <!-- Content Options Card -->
            <label class="method-card content-card">
              <input type="radio" name="export-method" value="content-options">
              <div class="card-content">
                <div class="card-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="9" y1="9" x2="15" y2="9"></line>
                    <line x1="9" y1="12" x2="15" y2="12"></line>
                    <line x1="9" y1="15" x2="13" y2="15"></line>
                  </svg>
                </div>
                <div class="card-text">
                  <h4>Content Options</h4>
                  <p>Customize export content with specific elements and standard summary</p>
                </div>
              </div>
            </label>
          </div>
          
          <!-- Content Options Panel (Hidden by default) -->
          <div class="content-options-panel" id="content-options-panel" style="display: none;">
            <div class="options-grid">
              <label class="option-item">
                <input type="checkbox" id="include-summary" checked>
                <span class="option-checkbox"></span>
                <span class="option-label">Include Standard Summary</span>
              </label>
              <label class="option-item">
                <input type="checkbox" id="include-notes" checked>
                <span class="option-checkbox"></span>
                <span class="option-label">Include Notes & Comments</span>
              </label>
              <label class="option-item">
                <input type="checkbox" id="include-timestamps" checked>
                <span class="option-checkbox"></span>
                <span class="option-label">Include Timestamps</span>
              </label>
              <label class="option-item">
                <input type="checkbox" id="include-metadata" checked>
                <span class="option-checkbox"></span>
                <span class="option-label">Include Metadata</span>
              </label>
            </div>
          </div>
        </div>
        
        <!-- Enhanced Format Selection -->
        <div class="export-section">
          <h3 class="section-title">Export Format</h3>
          
          <div class="format-dropdown-container">
            <button type="button" class="format-dropdown-trigger" id="format-dropdown-trigger">
              <div class="format-selected">
                <div class="format-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                  </svg>
                </div>
                <div class="format-info">
                  <div class="format-name">Markdown (.md)</div>
                  <div class="format-description">Best for documentation</div>
                </div>
              </div>
              <svg class="dropdown-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            
            <div class="format-dropdown-menu" id="format-dropdown-menu" style="display: none;">
              <div class="format-option" data-value="markdown" data-active="true">
                <div class="format-option-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                  </svg>
                </div>
                <div class="format-option-content">
                  <div class="format-option-name">Markdown (.md)</div>
                  <div class="format-option-desc">Best for documentation and version control</div>
                </div>
                <div class="format-option-check">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
              
              <div class="format-option" data-value="html">
                <div class="format-option-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                </div>
                <div class="format-option-content">
                  <div class="format-option-name">HTML (.html)</div>
                  <div class="format-option-desc">Best for viewing in browser with rich formatting</div>
                </div>
                <div class="format-option-check">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
              
              <div class="format-option" data-value="json">
                <div class="format-option-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                </div>
                <div class="format-option-content">
                  <div class="format-option-name">JSON (.json)</div>
                  <div class="format-option-desc">Best for data processing and API integration</div>
                </div>
                <div class="format-option-check">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
              
              <div class="format-option" data-value="txt">
                <div class="format-option-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </div>
                <div class="format-option-content">
                  <div class="format-option-name">Plain Text (.txt)</div>
                  <div class="format-option-desc">Universal compatibility, no formatting</div>
                </div>
                <div class="format-option-check">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
            </div>
            
            <!-- Hidden select for form value -->
            <select id="export-format" style="display: none;">
              <option value="markdown" selected>Markdown</option>
              <option value="html">HTML</option>
              <option value="json">JSON</option>
              <option value="txt">Plain Text</option>
            </select>
          </div>
        </div>
        
        <!-- Conversation Info -->
        <div class="export-section info-section">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Title</span>
              <span class="info-value">${escapeHtml(conversation.title)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Messages</span>
              <span class="info-value">${conversation.messages.length}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Created</span>
              <span class="info-value">${new Date(conversation.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Size</span>
              <span class="info-value">${formatByteSize(getConversationSize(conversation))}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="export-footer">
        <button class="btn btn-secondary" id="cancel-export">Cancel</button>
        <button class="btn btn-primary" id="confirm-export">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span id="export-btn-text">Export</span>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // Add professional styles if not already present
  addProfessionalExportStyles();
  
  // Setup method card interactions
  const methodCards = dialog.querySelectorAll('input[name="export-method"]');
  const contentPanel = document.getElementById('content-options-panel');
  
  methodCards.forEach((input) => {
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (contentPanel) {
        if (target.value === 'content-options') {
          contentPanel.style.display = 'block';
          setTimeout(() => {
            contentPanel.classList.add('expanded');
          }, 10);
        } else {
          contentPanel.classList.remove('expanded');
          setTimeout(() => {
            contentPanel.style.display = 'none';
          }, 300);
        }
      }
    });
  });
  
  // Setup custom dropdown
  setupFormatDropdown();
  
  // Event handlers
  document.getElementById('close-export-dialog')?.addEventListener('click', () => {
    dialog.classList.add('closing');
    setTimeout(() => dialog.remove(), 300);
  });
  
  document.getElementById('cancel-export')?.addEventListener('click', () => {
    dialog.classList.add('closing');
    setTimeout(() => dialog.remove(), 300);
  });
  
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.classList.add('closing');
      setTimeout(() => dialog.remove(), 300);
    }
  });
  
  document.getElementById('confirm-export')?.addEventListener('click', async () => {
    const selectedMethod = (document.querySelector('input[name="export-method"]:checked') as HTMLInputElement)?.value;
    const format = (document.getElementById('export-format') as HTMLSelectElement)?.value || 'markdown';
    
    // Update button to show loading state
    const exportBtn = document.getElementById('export-btn-text');
    const exportBtnParent = exportBtn?.parentElement as HTMLButtonElement;
    if (exportBtn && exportBtnParent) {
      exportBtn.textContent = 'Processing...';
      exportBtnParent.disabled = true;
      exportBtnParent.classList.add('loading');
    }
    
    if (selectedMethod === 'ai-memory') {
      await exportWithAIMemory(conversation, format);
    } else {
      const includeSummary = (document.getElementById('include-summary') as HTMLInputElement)?.checked;
      const includeNotes = (document.getElementById('include-notes') as HTMLInputElement)?.checked;
      const includeTimestamps = (document.getElementById('include-timestamps') as HTMLInputElement)?.checked;
      const includeMetadata = (document.getElementById('include-metadata') as HTMLInputElement)?.checked;
      
      await exportWithOptions(conversation, {
        includeSummary,
        includeNotes,
        includeTimestamps,
        includeMetadata,
        format
      });
    }
    
    dialog.classList.add('closing');
    setTimeout(() => dialog.remove(), 300);
  });
  
  // Add entrance animation
  setTimeout(() => {
    dialog.classList.add('open');
  }, 10);
}

function setupFormatDropdown(): void {
  const trigger = document.getElementById('format-dropdown-trigger');
  const menu = document.getElementById('format-dropdown-menu');
  const hiddenSelect = document.getElementById('export-format') as HTMLSelectElement;
  
  if (!trigger || !menu || !hiddenSelect) return;
  
  // Toggle dropdown
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.style.display !== 'none';
    menu.style.display = isOpen ? 'none' : 'block';
    trigger.classList.toggle('open', !isOpen);
  });
  
  // Handle option selection
  menu.querySelectorAll('.format-option').forEach(option => {
    option.addEventListener('click', () => {
      const value = option.getAttribute('data-value');
      if (!value) return;
      
      // Update hidden select
      hiddenSelect.value = value;
      
      // Update active state
      menu.querySelectorAll('.format-option').forEach(opt => {
        opt.removeAttribute('data-active');
      });
      option.setAttribute('data-active', 'true');
      
      // Update trigger display
      const name = option.querySelector('.format-option-name')?.textContent || '';
      const desc = option.querySelector('.format-option-desc')?.textContent || '';
      const icon = option.querySelector('.format-option-icon svg')?.outerHTML || '';
      
      const selectedDisplay = trigger.querySelector('.format-selected');
      if (selectedDisplay) {
        selectedDisplay.innerHTML = `
          <div class="format-icon">${icon}</div>
          <div class="format-info">
            <div class="format-name">${name}</div>
            <div class="format-description">${desc.split('for ')[1] || desc}</div>
          </div>
        `;
      }
      
      // Close dropdown
      menu.style.display = 'none';
      trigger.classList.remove('open');
    });
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!trigger.contains(e.target as Node) && !menu.contains(e.target as Node)) {
      menu.style.display = 'none';
      trigger.classList.remove('open');
    }
  });
}

async function exportWithAIMemory(conversation: any, format: string): Promise<void> {
  showNotification('AI is analyzing conversation memory...', 'info');
  const memorySummary = await generateAIMemorySummary(conversation);
  
  let content = '';
  let mimeType = 'text/plain';
  let extension = 'txt';
  
  switch (format) {
    case 'markdown':
      content = generateMarkdownExportWithMemory(conversation, memorySummary);
      mimeType = 'text/markdown';
      extension = 'md';
      break;
    case 'html':
      content = generateHTMLExportWithMemory(conversation, memorySummary);
      mimeType = 'text/html';
      extension = 'html';
      break;
    case 'json':
      content = generateJSONExportWithMemory(conversation, memorySummary);
      mimeType = 'application/json';
      extension = 'json';
      break;
    default:
      content = generatePlainTextExportWithMemory(conversation, memorySummary);
      break;
  }
  
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${conversation.title.replace(/[^a-z0-9]/gi, '-')}-memory-${new Date().toISOString().slice(0,10)}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showNotification(`Conversation exported with AI Memory as ${format.toUpperCase()}!`, 'success');
}

async function exportWithOptions(
  conversation: any, 
  options: {
    includeSummary: boolean;
    includeNotes: boolean;
    includeTimestamps: boolean;
    includeMetadata: boolean;
    format: string;
  }
): Promise<void> {
  let summary = '';
  
  if (options.includeSummary) {
    showNotification('Generating conversation summary...', 'info');
    summary = await generateConversationSummary(conversation);
  }
  
  let content = '';
  let mimeType = 'text/plain';
  let extension = 'txt';
  
  switch (options.format) {
    case 'markdown':
      content = generateMarkdownExport(conversation, summary, options);
      mimeType = 'text/markdown';
      extension = 'md';
      break;
    case 'html':
      content = generateHTMLExport(conversation, summary, options);
      mimeType = 'text/html';
      extension = 'html';
      break;
    case 'json':
      content = generateJSONExport(conversation, summary, options);
      mimeType = 'application/json';
      extension = 'json';
      break;
    default:
      content = generatePlainTextExport(conversation, summary, options);
      break;
  }
  
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${conversation.title.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().slice(0,10)}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showNotification(`Conversation exported as ${options.format.toUpperCase()}!`, 'success');
}

// Export generation functions
function generateMarkdownExportWithMemory(conversation: any, memorySummary: string): string {
  let markdown = `# AI Memory Export: ${conversation.title}\n\n`;
  
  markdown += `## Export Information\n\n`;
  markdown += `- **Export Type:** AI Memory Analysis\n`;
  markdown += `- **Export Date:** ${new Date().toLocaleString()}\n`;
  markdown += `- **Total Messages:** ${conversation.messages.length}\n`;
  markdown += `- **Conversation Started:** ${new Date(conversation.createdAt).toLocaleString()}\n`;
  markdown += `- **Last Activity:** ${new Date(conversation.lastUpdated).toLocaleString()}\n\n`;
  
  markdown += `---\n\n`;
  
  if (memorySummary) {
    markdown += `# AI Memory Analysis\n\n`;
    markdown += memorySummary;
    markdown += `\n\n---\n\n`;
  }
  
  markdown += `# Full Conversation Transcript\n\n`;
  
  conversation.messages.forEach((msg: Message, index: number) => {
    const timestamp = new Date(msg.timestamp).toLocaleTimeString();
    
    if (msg.role === 'system') {
      markdown += `### System [${timestamp}]\n\n`;
      markdown += `${msg.content}\n\n`;
    } else if (msg.role === 'user') {
      markdown += `### User [${timestamp}]\n\n`;
      markdown += `${msg.content}\n\n`;
    } else if (msg.role === 'assistant') {
      markdown += `### Assistant [${timestamp}]\n\n`;
      markdown += `${msg.content}\n\n`;
    }
    
    if (msg.note) {
      markdown += `> **Note:** ${msg.note.content}\n\n`;
    }
    
    if (index < conversation.messages.length - 1) {
      markdown += `---\n\n`;
    }
  });
  
  return markdown;
}

function generateHTMLExportWithMemory(conversation: any, memorySummary: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Memory Export: ${escapeHtml(conversation.title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 {
      font-size: 2.5em;
      font-weight: 700;
      margin-bottom: 10px;
    }
    .header .subtitle {
      font-size: 1.1em;
      opacity: 0.9;
    }
    .content {
      padding: 40px;
    }
    .metadata {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }
    .metadata-item {
      display: flex;
      flex-direction: column;
    }
    .metadata-label {
      font-size: 0.85em;
      color: #6c757d;
      margin-bottom: 4px;
    }
    .metadata-value {
      font-size: 1.1em;
      font-weight: 600;
      color: #495057;
    }
    .ai-memory {
      background: linear-gradient(135deg, rgba(102,126,234,0.05) 0%, rgba(118,75,162,0.05) 100%);
      border: 1px solid rgba(102,126,234,0.2);
      border-radius: 16px;
      padding: 30px;
      margin: 30px 0;
    }
    .ai-memory h2 {
      color: #667eea;
      margin-bottom: 20px;
      font-size: 1.8em;
    }
    .ai-memory h3 {
      color: #495057;
      margin-top: 25px;
      margin-bottom: 15px;
      font-size: 1.3em;
    }
    .ai-memory ul {
      margin-left: 20px;
      color: #495057;
    }
    .ai-memory li {
      margin: 8px 0;
    }
    .conversation {
      margin-top: 40px;
    }
    .conversation h2 {
      color: #212529;
      margin-bottom: 25px;
      font-size: 1.8em;
      border-bottom: 2px solid #e9ecef;
      padding-bottom: 10px;
    }
    .message {
      margin: 20px 0;
      padding: 20px;
      border-radius: 12px;
      position: relative;
      transition: transform 0.2s;
    }
    .message:hover {
      transform: translateX(5px);
    }
    .message.user {
      background: linear-gradient(135deg, #e3f2fd, #bbdefb);
      border-left: 4px solid #2196f3;
    }
    .message.assistant {
      background: linear-gradient(135deg, #f3e5f5, #e1bee7);
      border-left: 4px solid #9c27b0;
    }
    .message.system {
      background: linear-gradient(135deg, #fff3e0, #ffe0b2);
      border-left: 4px solid #ff9800;
    }
    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .message-role {
      font-weight: 600;
      font-size: 1.1em;
    }
    .message-time {
      font-size: 0.85em;
      color: #6c757d;
    }
    .message-content {
      color: #212529;
      line-height: 1.7;
    }
    .note {
      background: #fffbf0;
      border-left: 3px solid #ffc107;
      padding: 12px 15px;
      margin-top: 15px;
      border-radius: 6px;
      font-style: italic;
    }
    pre {
      background: #282c34;
      color: #abb2bf;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 10px 0;
    }
    code {
      background: #f1f3f5;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(conversation.title)}</h1>
      <div class="subtitle">AI Memory Analysis Export</div>
    </div>
    
    <div class="content">
      <div class="metadata">
        <div class="metadata-item">
          <span class="metadata-label">Export Date</span>
          <span class="metadata-value">${new Date().toLocaleDateString()}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Total Messages</span>
          <span class="metadata-value">${conversation.messages.length}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Started</span>
          <span class="metadata-value">${new Date(conversation.createdAt).toLocaleDateString()}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Last Activity</span>
          <span class="metadata-value">${new Date(conversation.lastUpdated).toLocaleDateString()}</span>
        </div>
      </div>
      
      ${memorySummary ? `
      <div class="ai-memory">
        <h2>AI Memory Analysis</h2>
        ${memorySummary.replace(/\n/g, '<br>').replace(/## /g, '<h3>').replace(/\n\n/g, '</p><p>')}
      </div>
      ` : ''}
      
      <div class="conversation">
        <h2>Conversation Transcript</h2>
        ${conversation.messages.map((msg: Message) => `
          <div class="message ${msg.role}">
            <div class="message-header">
              <span class="message-role">${msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System'}</span>
              <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="message-content">
              ${escapeHtml(msg.content).replace(/\n/g, '<br>')}
            </div>
            ${msg.note ? `<div class="note">Note: ${escapeHtml(msg.note.content)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  </div>
</body>
</html>`;
}

function generateJSONExportWithMemory(conversation: any, memorySummary: string): string {
  const exportData = {
    exportType: 'ai-memory',
    title: conversation.title,
    exportDate: new Date().toISOString(),
    created: conversation.createdAt,
    lastUpdated: conversation.lastUpdated,
    messageCount: conversation.messages.length,
    aiMemoryAnalysis: memorySummary,
    messages: conversation.messages.map((msg: Message) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      metadata: msg.metadata,
      note: msg.note
    }))
  };
  
  return JSON.stringify(exportData, null, 2);
}

function generatePlainTextExportWithMemory(conversation: any, memorySummary: string): string {
  let text = `AI MEMORY EXPORT: ${conversation.title}\n${'='.repeat(50)}\n\n`;
  
  text += `Export Date: ${new Date().toLocaleString()}\n`;
  text += `Total Messages: ${conversation.messages.length}\n`;
  text += `Started: ${new Date(conversation.createdAt).toLocaleString()}\n`;
  text += `Last Activity: ${new Date(conversation.lastUpdated).toLocaleString()}\n\n`;
  text += `${'='.repeat(50)}\n\n`;
  
  if (memorySummary) {
    text += `AI MEMORY ANALYSIS\n${'-'.repeat(20)}\n\n`;
    text += memorySummary;
    text += `\n\n${'='.repeat(50)}\n\n`;
  }
  
  text += `CONVERSATION TRANSCRIPT\n${'-'.repeat(23)}\n\n`;
  
  conversation.messages.forEach((msg: Message) => {
    const timestamp = new Date(msg.timestamp).toLocaleTimeString();
    const role = msg.role.toUpperCase();
    
    text += `[${timestamp}] ${role}:\n`;
    text += `${msg.content}\n`;
    
    if (msg.note) {
      text += `[NOTE: ${msg.note.content}]\n`;
    }
    
    text += `\n${'-'.repeat(30)}\n\n`;
  });
  
  return text;
}

function generateMarkdownExport(conversation: any, summary: string, options: any): string {
  let markdown = `# ${conversation.title}\n\n`;
  
  markdown += `## Metadata\n\n`;
  markdown += `- **Export Date:** ${new Date().toLocaleString()}\n`;
  markdown += `- **Total Messages:** ${conversation.messages.length}\n`;
  markdown += `- **Created:** ${new Date(conversation.createdAt).toLocaleString()}\n`;
  markdown += `- **Last Updated:** ${new Date(conversation.lastUpdated).toLocaleString()}\n\n`;
  
  if (summary && options.includeSummary) {
    markdown += `---\n\n## Summary\n\n${summary}\n\n`;
  }
  
  markdown += `---\n\n## Conversation\n\n`;
  
  conversation.messages.forEach((msg: Message) => {
    const timestamp = options.includeTimestamps 
      ? ` [${new Date(msg.timestamp).toLocaleTimeString()}]` 
      : '';
    
    if (msg.role === 'system') {
      markdown += `### System${timestamp}\n\n${msg.content}\n\n`;
    } else if (msg.role === 'user') {
      markdown += `### User${timestamp}\n\n${msg.content}\n\n`;
    } else if (msg.role === 'assistant') {
      const provider = options.includeMetadata && msg.metadata?.provider 
        ? ` (${msg.metadata.provider})` 
        : '';
      markdown += `### Assistant${provider}${timestamp}\n\n${msg.content}\n\n`;
    }
    
    if (options.includeNotes && msg.note) {
      markdown += `> **Note:** ${msg.note.content}\n\n`;
    }
    
    markdown += `---\n\n`;
  });
  
  return markdown;
}

function generateHTMLExport(conversation: any, summary: string, options: any): string {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(conversation.title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; }
    .message {
      margin: 20px 0;
      padding: 15px;
      border-radius: 8px;
    }
    .message.user { background: #e3f2fd; border-left: 4px solid #2196f3; }
    .message.assistant { background: #f3e5f5; border-left: 4px solid #9c27b0; }
    .message.system { background: #fff3e0; border-left: 4px solid #ff9800; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(conversation.title)}</h1>`;
  
  if (summary && options.includeSummary) {
    html += `<div class="summary"><h2>Summary</h2>${summary.replace(/\n/g, '<br>')}</div>`;
  }
  
  html += `<h2>Conversation</h2>`;
  
  conversation.messages.forEach((msg: Message) => {
    const timestamp = options.includeTimestamps 
      ? `<span style="float: right; font-size: 0.85em; color: #666;">${new Date(msg.timestamp).toLocaleTimeString()}</span>` 
      : '';
    
    html += `<div class="message ${msg.role}">
      <strong>${msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}</strong> ${timestamp}
      <div>${escapeHtml(msg.content).replace(/\n/g, '<br>')}</div>`;
    
    if (options.includeNotes && msg.note) {
      html += `<div style="margin-top: 10px; padding: 10px; background: #fffde7; border-radius: 6px;">
        <strong>Note:</strong> ${escapeHtml(msg.note.content)}
      </div>`;
    }
    
    html += `</div>`;
  });
  
  html += `</div></body></html>`;
  
  return html;
}

function generateJSONExport(conversation: any, summary: string, options: any): string {
  const exportData: any = {
    title: conversation.title,
    exportDate: new Date().toISOString(),
    created: conversation.createdAt,
    lastUpdated: conversation.lastUpdated,
    messageCount: conversation.messages.length
  };
  
  if (summary && options.includeSummary) {
    exportData.summary = summary;
  }
  
  exportData.messages = conversation.messages.map((msg: Message) => {
    const msgData: any = {
      role: msg.role,
      content: msg.content
    };
    
    if (options.includeTimestamps) {
      msgData.timestamp = msg.timestamp;
    }
    
    if (options.includeMetadata && msg.metadata) {
      msgData.metadata = msg.metadata;
    }
    
    if (options.includeNotes && msg.note) {
      msgData.note = msg.note;
    }
    
    return msgData;
  });
  
  return JSON.stringify(exportData, null, 2);
}

function generatePlainTextExport(conversation: any, summary: string, options: any): string {
  let text = `${conversation.title}\n${'='.repeat(conversation.title.length)}\n\n`;
  
  text += `Export Date: ${new Date().toLocaleString()}\n`;
  text += `Total Messages: ${conversation.messages.length}\n`;
  text += `Created: ${new Date(conversation.createdAt).toLocaleString()}\n`;
  text += `Last Updated: ${new Date(conversation.lastUpdated).toLocaleString()}\n\n`;
  text += `${'-'.repeat(50)}\n\n`;
  
  if (summary && options.includeSummary) {
    text += `SUMMARY\n${'-'.repeat(7)}\n\n${summary}\n\n`;
    text += `${'-'.repeat(50)}\n\n`;
  }
  
  text += `CONVERSATION\n${'-'.repeat(12)}\n\n`;
  
  conversation.messages.forEach((msg: Message) => {
    const timestamp = options.includeTimestamps 
      ? ` [${new Date(msg.timestamp).toLocaleTimeString()}]` 
      : '';
    
    text += `${msg.role.toUpperCase()}${timestamp}:\n`;
    text += `${msg.content}\n`;
    
    if (options.includeNotes && msg.note) {
      text += `[NOTE: ${msg.note.content}]\n`;
    }
    
    text += `\n${'-'.repeat(50)}\n\n`;
  });
  
  return text;
}

// Simple export function (fallback)
export async function exportCurrentConversation(): Promise<void> {
  const currentConv = conversationManager.getCurrentConversation();
  if (!currentConv) {
    showNotification('No conversation to export', 'warning');
    return;
  }
  
  showProfessionalExportDialog(currentConv);
}

// ============================================================================
// Professional Export Dialog Styles with Enhanced Dropdown
// ============================================================================

function addProfessionalExportStyles(): void {
  if (document.getElementById('professional-export-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'professional-export-styles';
  styles.textContent = `
    .professional-export-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10002;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .professional-export-dialog-overlay.open {
      opacity: 1;
    }
    
    .professional-export-dialog-overlay.closing {
      opacity: 0;
    }
    
    .professional-export-dialog {
      background: #1e1e1e;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      width: 600px;
      max-width: 90vw;
      max-height: 85vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
      transform: scale(0.9);
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    .professional-export-dialog-overlay.open .professional-export-dialog {
      transform: scale(1);
    }
    
    /* Header */
    .export-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.02);
    }
    
    .export-header .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 10px;
      margin-right: 16px;
    }
    
    .export-header h2 {
      flex: 1;
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #ffffff;
      letter-spacing: -0.3px;
    }
    
    .export-header .close-btn {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.4);
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .export-header .close-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ff6b6b;
    }
    
    /* Body */
    .export-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
    
    .export-body::-webkit-scrollbar {
      width: 8px;
    }
    
    .export-body::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
    }
    
    .export-body::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    
    .export-body::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    
    /* Sections */
    .export-section {
      margin-bottom: 28px;
    }
    
    .section-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: rgba(255, 255, 255, 0.4);
      margin-bottom: 16px;
    }
    
    /* Method Cards */
    .export-method-cards {
      display: grid;
      gap: 12px;
    }
    
    .method-card {
      display: block;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .method-card input[type="radio"] {
      position: absolute;
      opacity: 0;
    }
    
    .card-content {
      display: flex;
      align-items: center;
      padding: 20px;
      background: rgba(255, 255, 255, 0.03);
      border: 2px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      transition: all 0.3s ease;
      position: relative;
    }
    
    .method-card:hover .card-content {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.12);
      transform: translateY(-2px);
    }
    
    .method-card input:checked ~ .card-content {
      background: rgba(102, 126, 234, 0.1);
      border-color: #667eea;
    }
    
    .ai-memory-card input:checked ~ .card-content {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
      border-color: #667eea;
    }
    
    .card-icon {
      margin-right: 16px;
      flex-shrink: 0;
    }
    
    .card-text {
      flex: 1;
    }
    
    .card-text h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: #ffffff;
    }
    
    .card-text p {
      margin: 0;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.5);
      line-height: 1.5;
    }
    
    .card-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      font-size: 10px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Content Options Panel */
    .content-options-panel {
      margin-top: 16px;
      padding: 16px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      max-height: 0;
      overflow: hidden;
      opacity: 0;
      transition: all 0.3s ease;
    }
    
    .content-options-panel.expanded {
      max-height: 300px;
      opacity: 1;
    }
    
    .options-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    
    .option-item {
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      transition: background 0.2s;
    }
    
    .option-item:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    
    .option-item input[type="checkbox"] {
      position: absolute;
      opacity: 0;
    }
    
    .option-checkbox {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      margin-right: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    
    .option-item input:checked ~ .option-checkbox {
      background: #667eea;
      border-color: #667eea;
    }
    
    .option-item input:checked ~ .option-checkbox::after {
      content: '✓';
      color: white;
      font-size: 12px;
      font-weight: 600;
    }
    
    .option-label {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.8);
    }
    
    /* Enhanced Format Dropdown */
    .format-dropdown-container {
      position: relative;
      width: 100%;
    }
    
    .format-dropdown-trigger {
      width: 100%;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 2px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      color: #ffffff;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: inherit;
    }
    
    .format-dropdown-trigger:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.12);
      transform: translateY(-1px);
    }
    
    .format-dropdown-trigger.open {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.05);
    }
    
    .format-selected {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }
    
    .format-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: rgba(102, 126, 234, 0.1);
      border-radius: 10px;
      color: #667eea;
    }
    
    .format-info {
      flex: 1;
      text-align: left;
    }
    
    .format-name {
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 2px;
    }
    
    .format-description {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }
    
    .dropdown-arrow {
      color: rgba(255, 255, 255, 0.4);
      transition: transform 0.3s ease;
    }
    
    .format-dropdown-trigger.open .dropdown-arrow {
      transform: rotate(180deg);
    }
    
    /* Dropdown Menu */
    .format-dropdown-menu {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      right: 0;
      background: #1a1a1a;
      border: 2px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      overflow: hidden;
      z-index: 100;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      animation: dropdownSlide 0.3s ease;
    }
    
    @keyframes dropdownSlide {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .format-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    
    .format-option:last-child {
      border-bottom: none;
    }
    
    .format-option:hover {
      background: rgba(102, 126, 234, 0.08);
    }
    
    .format-option[data-active="true"] {
      background: rgba(102, 126, 234, 0.05);
    }
    
    .format-option-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.6);
      transition: all 0.2s ease;
    }
    
    .format-option:hover .format-option-icon {
      background: rgba(102, 126, 234, 0.15);
      color: #667eea;
    }
    
    .format-option[data-active="true"] .format-option-icon {
      background: rgba(102, 126, 234, 0.2);
      color: #667eea;
    }
    
    .format-option-content {
      flex: 1;
    }
    
    .format-option-name {
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 2px;
    }
    
    .format-option-desc {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.4);
      line-height: 1.4;
    }
    
    .format-option-check {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #667eea;
      color: white;
      opacity: 0;
      transform: scale(0);
      transition: all 0.2s ease;
    }
    
    .format-option[data-active="true"] .format-option-check {
      opacity: 1;
      transform: scale(1);
    }
    
    /* Info Section */
    .info-section {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      padding: 16px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    
    .info-item {
      display: flex;
      flex-direction: column;
    }
    
    .info-label {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .info-value {
      font-size: 14px;
      color: #ffffff;
      font-weight: 500;
    }
    
    /* Footer */
    .export-footer {
      padding: 20px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.02);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    
    /* Buttons */
    .btn {
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: inherit;
    }
    
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.12);
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: 1px solid transparent;
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
    }
    
    .btn-primary:active {
      transform: translateY(0);
    }
    
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    
    .btn-primary.loading::after {
      content: '';
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid white;
      border-radius: 50%;
      border-top-color: transparent;
      animation: spin 0.8s linear infinite;
      margin-left: 8px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Mobile responsiveness */
    @media (max-width: 640px) {
      .professional-export-dialog {
        width: 95vw;
        max-height: 90vh;
        border-radius: 12px;
      }
      
      .export-header {
        padding: 20px;
      }
      
      .export-body {
        padding: 20px;
      }
      
      .options-grid {
        grid-template-columns: 1fr;
      }
      
      .info-grid {
        grid-template-columns: 1fr;
      }
      
      .export-footer {
        padding: 16px 20px;
        flex-direction: column;
      }
      
      .btn {
        width: 100%;
        justify-content: center;
      }
      
      .format-dropdown-menu {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        top: auto;
        border-radius: 20px 20px 0 0;
        max-height: 70vh;
        overflow-y: auto;
        animation: slideUp 0.3s ease;
      }
      
      @keyframes slideUp {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(0);
        }
      }
      
      .format-option {
        padding: 16px 20px;
      }
    }
  `;
  
  document.head.appendChild(styles);
}

// ============================================================================
// Conversation Info Updates (unchanged)
// ============================================================================

export function updateConversationInfo(): void {
  const conv = conversationManager.getCurrentConversation();
  if (!conv) return;
  
  
    // Auto-rotate merged badge every 5 seconds
    let mergedBadgeShowingMessages = true;
    const mergedBadge = document.getElementById('merged-info-badge');
    if (mergedBadge) {
      const toggleBadgeView = () => {
        const msgView = document.getElementById('badge-view-messages');
        const sizeView = document.getElementById('badge-view-size');
        if (!msgView || !sizeView) return;
        mergedBadgeShowingMessages = !mergedBadgeShowingMessages;
        msgView.style.opacity = mergedBadgeShowingMessages ? '1' : '0';
        msgView.style.pointerEvents = mergedBadgeShowingMessages ? 'auto' : 'none';
        sizeView.style.opacity = mergedBadgeShowingMessages ? '0' : '1';
        sizeView.style.pointerEvents = mergedBadgeShowingMessages ? 'none' : 'auto';
        mergedBadge.title = mergedBadgeShowingMessages ? 'Messages (click for size)' : 'Size (click for messages)';
      };
      mergedBadge.addEventListener('click', (e) => { e.stopPropagation(); toggleBadgeView(); });
      setInterval(toggleBadgeView, 5000);
    }
    const messageCountEl = document.getElementById('message-count');
  const sizeEl = document.getElementById('conversation-size');
  
  if (messageCountEl) {
    messageCountEl.textContent = conv.messages.length.toString();
  }
  
  if (sizeEl) {
    const size = getConversationSize(conv);
    sizeEl.textContent = formatCompactSize(size);
  }
}

// Compact size formatter - shows kB/MB when >= 1000
function formatCompactSize(bytes: number): string {
  if (bytes < 1000) {
    return `${bytes} B`;
  } else if (bytes < 10000) {
    // 1.00kB - 9.99kB
    return `${(bytes / 1000).toFixed(2)}kB`;
  } else if (bytes < 100000) {
    // 10.0kB - 99.9kB
    return `${(bytes / 1000).toFixed(1)}kB`;
  } else if (bytes < 1000000) {
    // 100kB - 999kB
    return `${Math.round(bytes / 1000)}kB`;
  } else if (bytes < 10000000) {
    // 1.00MB - 9.99MB
    return `${(bytes / 1000000).toFixed(2)}MB`;
  } else if (bytes < 100000000) {
    // 10.0MB - 99.9MB
    return `${(bytes / 1000000).toFixed(1)}MB`;
  } else {
    // 100MB+
    return `${Math.round(bytes / 1000000)}MB`;
  }
}

export function updateConversationTitle(title: string): void {
  const titleElement = document.getElementById('conversation-title');
  if (titleElement) {
    titleElement.textContent = title;
    titleElement.title = title;
  }
}

// ============================================================================
// Conversation Loading (with deduplication fix)
// ============================================================================
// ============================================================================
// CEM (Compact Edit Message) Reconstruction for Reload
// ============================================================================
// During live session, aiDirectEditor creates compact notification bars.
// But it saves only markdown text to the conversation store.
// On reload, we need to reconstruct the compact CEM HTML from metadata.
// ============================================================================

function reconstructCEMMessage(msg: any, chatContainer: Element): boolean {
  const messageType = msg.metadata?.messageType;
  if (!messageType || !messageType.startsWith('ai-edit-')) return false;
  
  const revision = msg.metadata?.revision || '?';
  const timestamp = msg.metadata?.timestamp 
    ? new Date(msg.metadata.timestamp) 
    : (msg.timestamp ? new Date(msg.timestamp) : new Date());
  const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = timestamp.toLocaleDateString();
  const messageId = msg.id || `ai-edit-reload-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  
  // Extract instruction from markdown content
  const content = typeof msg.content === 'string' ? msg.content : '';
  const instructionMatch = content.match(/\*\*Instruction:\*\*\s*(.+?)(?:\n|$)/);
  const instruction = instructionMatch ? instructionMatch[1].trim() : 'AI Edit';
  const shortInstruction = instruction.length > 50 ? instruction.substring(0, 47) + '…' : instruction;
  
  // Extract lines info  
  const linesMatch = content.match(/\*\*lines?\s*([\d\-]+)\*\*/);
  const lines = linesMatch ? linesMatch[1] : '';
  
  const messageDiv = document.createElement('div');
  messageDiv.id = messageId;
  messageDiv.setAttribute('data-revision', String(revision));
  messageDiv.setAttribute('data-timestamp', timestamp.toISOString());
  messageDiv.setAttribute('data-cem-protected', 'true');
  messageDiv.setAttribute('data-no-collapse', 'true');
  
  const escHtml = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  
  switch (messageType) {
    case 'ai-edit-request':
      messageDiv.className = 'system-message ai-edit-message success'; // completed request
      messageDiv.innerHTML = `
        <div class="cem-row">
          <span class="cem-icon cem-icon-ok">✓</span>
          <span class="cem-label">Sent</span>
          <span class="cem-rev">R${revision}</span>
          <span class="cem-detail" title="${escHtml(instruction)}">${escHtml(shortInstruction)}</span>
          <span class="cem-time" title="${dateStr} ${timeStr}">${timeStr}</span>
        </div>`;
      break;
      
    case 'ai-edit-accepted':
      messageDiv.className = 'system-message ai-edit-message success';
      messageDiv.innerHTML = `
        <div class="cem-row">
          <span class="cem-icon cem-icon-ok">✓</span>
          <span class="cem-label">Applied</span>
          <span class="cem-rev">R${revision}</span>
          ${lines ? `<span class="cem-lines">L${lines}</span>` : ''}
          <span class="cem-detail" title="${escHtml(instruction)}">${escHtml(shortInstruction)}</span>
          <span class="cem-time" title="${dateStr} ${timeStr}">${timeStr}</span>
        </div>`;
      break;
      
    case 'ai-edit-rejected':
      messageDiv.className = 'system-message ai-edit-message rejected';
      messageDiv.innerHTML = `
        <div class="cem-row">
          <span class="cem-icon cem-icon-err">✕</span>
          <span class="cem-label">Rejected</span>
          <span class="cem-rev">R${revision}</span>
          ${lines ? `<span class="cem-lines">L${lines}</span>` : ''}
          <span class="cem-detail" title="${escHtml(instruction)}">${escHtml(shortInstruction)}</span>
          <span class="cem-time" title="${dateStr} ${timeStr}">${timeStr}</span>
        </div>`;
      break;
      
    case 'ai-edit-error':
      messageDiv.className = 'system-message ai-edit-message rejected';
      messageDiv.innerHTML = `
        <div class="cem-row">
          <span class="cem-icon cem-icon-err">⚠</span>
          <span class="cem-label">Failed</span>
          <span class="cem-rev">R${revision}</span>
          <span class="cem-detail" title="${escHtml(instruction)}">${escHtml(shortInstruction)}</span>
          <span class="cem-time" title="${dateStr} ${timeStr}">${timeStr}</span>
        </div>`;
      break;
      
    case 'ai-edit-cancelled':
      messageDiv.className = 'system-message ai-edit-message rejected';
      messageDiv.innerHTML = `
        <div class="cem-row">
          <span class="cem-icon cem-icon-err">⏹</span>
          <span class="cem-label">Cancelled</span>
          <span class="cem-rev">R${revision}</span>
          <span class="cem-detail" title="${escHtml(instruction)}">${escHtml(shortInstruction)}</span>
          <span class="cem-time" title="${dateStr} ${timeStr}">${timeStr}</span>
        </div>`;
      break;
      
    default:
      return false;
  }
  
  chatContainer.appendChild(messageDiv);
  return true;
}

export async function loadConversationToUI(conversation: any): Promise<void> {
  // =========================================================================
  // DEDUPLICATION CHECK - Prevents duplicate message rendering
  // =========================================================================
  if (!conversation?.id) {
    console.warn('[Dedup] Invalid conversation object - missing id');
    return;
  }
  
  if (__shouldSkipConversationLoad(conversation.id)) {
    return; // Skip - already loaded recently
  }
  
  // Mark as loading started
  __isCurrentlyLoading = true;
  console.log('🔄 [Dedup] Loading conversation:', conversation.id.substring(0, 8) + '...', 
              '(' + conversation.messages?.length + ' messages)');
  // =========================================================================

  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) {
    __isCurrentlyLoading = false;
    return;
  }
  
  // FIXED: Set loading flag to prevent scroll calls during bulk render
  setConversationLoading(true);
  
  chatContainer.innerHTML = '';
  messageNotes.clear();
  hideConversationLoading();
  setIsSavingEnabled(false);
  
  // =========================================================================
  // 🔧 FIX: Deduplicate messages BEFORE rendering
  // Some messages get double-saved to conversation data. Filter them out.
  // =========================================================================
  const seenMessages = new Set<string>();
  const dedupedMessages: any[] = [];
  
  for (const msg of (conversation.messages || [])) {
    // Build a fingerprint from role + first 200 chars of content + approximate timestamp
    const contentStr = typeof msg.content === 'string' ? msg.content : '';
    const contentPreview = contentStr.substring(0, 200).trim();
    // Round timestamp to nearest 5 seconds to catch near-duplicate saves
    const timeKey = msg.timestamp ? Math.floor(msg.timestamp / 5000) : 0;
    const fingerprint = `${msg.role}|${contentPreview}|${timeKey}`;
    
    if (seenMessages.has(fingerprint)) {
      console.log(`🔧 [Dedup] Skipping duplicate message: ${msg.role} "${contentPreview.substring(0, 40)}..."`);
      continue;
    }
    
    seenMessages.add(fingerprint);
    dedupedMessages.push(msg);
  }
  
  if (dedupedMessages.length < (conversation.messages?.length || 0)) {
    console.log(`🔧 [Dedup] Removed ${conversation.messages.length - dedupedMessages.length} duplicate message(s)`);
  }
  // =========================================================================

  // ✅ FIX: Use addMessageToChat for ALL messages (unified rendering)
  // This ensures loaded messages look identical to live messages
  for (const msg of dedupedMessages) {
    if (msg.note) {
      messageNotes.set(msg.id, msg.note);
    }
    
    const contentStr = typeof msg.content === 'string' ? msg.content : '';
    
    // Skip corrupted messages
    if (contentStr.includes('[object Promise]')) {
      console.warn(`🔧 [LoadUI] Skipping corrupted message: "${contentStr.substring(0, 40)}..."`);
      continue;
    }
    
    // ✅ FIX: Reconstruct compact CEM messages for ai-edit-* types
    // Without this, saved ai-edit messages render as raw markdown after restart
    if (msg.metadata?.messageType?.startsWith('ai-edit-') && chatContainer) {
      if (reconstructCEMMessage(msg, chatContainer)) {
        continue; // Successfully reconstructed as compact notification bar
      }
    }
    
    // Use the same addMessageToChat that renders live messages
    await addMessageToChat(msg.role, contentStr, {
      shouldSave: false,        // CRITICAL: Don't re-save loaded messages
      messageId: msg.id || generateId(),
      providerName: msg.metadata?.provider || ''
    });
  }
  
  setTimeout(() => {
    setIsSavingEnabled(true);
  }, 100);
  
  updateConversationTitle(conversation.title);
  updateConversationInfo();
  
  const lastCodeMessage = [...conversation.messages].reverse().find((msg: Message) => 
    msg.metadata?.codeContext && msg.metadata?.code
  );
  
  if (lastCodeMessage && lastCodeMessage.metadata) {
    setCodeAnalysisMode(true, {
      code: lastCodeMessage.metadata.code || '',
      language: lastCodeMessage.metadata.language || '',
      fileName: lastCodeMessage.metadata.fileName || '',
      lastAnalyzedTimestamp: lastCodeMessage.timestamp
    });
  }
  
  // FIXED: Scroll to bottom AFTER ALL messages are rendered
  // Use double RAF to ensure DOM is fully updated
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      chatContainer.scrollTop = chatContainer.scrollHeight;
      // FIXED: Clear loading flag
      setConversationLoading(false);
      
      // =========================================================================
      // DEDUPLICATION: Mark this conversation as loaded
      // =========================================================================
      __lastLoadedConvId = conversation.id;
      __lastLoadedTime = Date.now();
      __isCurrentlyLoading = false;
      // Also set global flag to prevent other modules from re-rendering
      if (typeof window !== 'undefined') {
        (window as any).__conversationRendered = true;
      }
      // =========================================================================
      
      console.log('✅ Conversation loaded with', conversation.messages.length, 'messages');
      
      // 🔧 FIX: Enhance code blocks after loading (syntax highlighting, copy buttons)
      if (typeof (window as any).enhanceCodeBlocks === 'function') {
        setTimeout(() => (window as any).enhanceCodeBlocks(), 200);
      }
      
      // 🔧 FIX: Dispatch event for other modules (markdown fix, etc.)
      document.dispatchEvent(new CustomEvent('conversation-loaded', {
        detail: { conversationId: conversation.id }
      }));
    });
  });
    if ((window as any).forceCollapseAfterLoad) {
    (window as any).forceCollapseAfterLoad();
  }
}
function addMessageToChatForLoadingDirect(
  role: 'user' | 'assistant' | 'system', 
  content: string, 
  timestamp?: number, 
  messageId?: string, 
  note?: MessageNote,
  chatContainer?: Element,
  provider?: string  // 🆕 Added provider parameter
): void {
  if (!chatContainer) {
    chatContainer = document.querySelector('.ai-chat-container') as Element;
    if (!chatContainer) return;
  }

  const msgId = messageId || generateId();

  if (role === 'system') {
    const systemMessage = document.createElement('div');
    systemMessage.className = 'system-message';
    
    if (content.includes('<') && content.includes('>')) {
      systemMessage.innerHTML = content;
    } else {
      systemMessage.textContent = content;
    }
    
    // NO animation - instant render
    systemMessage.style.opacity = '1';
    chatContainer.appendChild(systemMessage);
    return;
  }

  // Create message element directly (no scroll, no animation)
  const messageElement = document.createElement('div');
  messageElement.className = `ai-message ${role}-message`;
  messageElement.setAttribute('data-message-id', msgId);
  
  // 🆕 Set data-timestamp for collapse manager
  if (timestamp) {
    messageElement.setAttribute('data-timestamp', String(timestamp));
  }
  
  // 🆕 Set data-provider for AI messages (for collapse manager)
  if (role === 'assistant' && provider) {
    messageElement.setAttribute('data-provider', provider);
  }

  const messageContent = document.createElement('div');
  messageContent.className = 'ai-message-content';
  
  // Process content
  const processedContent = processMessageContent(content);
  messageContent.innerHTML = processedContent;
  messageElement.appendChild(messageContent);

  // Add action buttons
  if (role === 'user') {
    const deleteBtn = createUserMessageDeleteButton(msgId);
    messageElement.appendChild(deleteBtn);
  } else {
    const actionsContainer = createMessageActionsForLoading(role, content, timestamp, msgId, note);
    messageElement.appendChild(actionsContainer);
    
    // 🔧 FIX: Add provider badge element for loaded messages
    // The collapse manager reads from .provider-text-minimal as fallback
    if (provider) {
      const providerBadge = document.createElement('span');
      providerBadge.className = 'provider-text-minimal';
      providerBadge.textContent = provider;
      providerBadge.style.display = 'none'; // Hidden, but readable by collapse manager
      messageElement.appendChild(providerBadge);
    }
  }

  // NO animation, NO scroll - just append
  messageElement.style.opacity = '1';
  chatContainer.appendChild(messageElement);
}

function showConversationLoading(): void {
  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) return;
  
  const existingLoading = document.getElementById('conversation-loading');
  if (existingLoading) return;
  
  const loadingElement = document.createElement('div');
  loadingElement.id = 'conversation-loading';
  loadingElement.className = 'conversation-loading-overlay';
  loadingElement.innerHTML = `
    <div class="loading-animation">
      <div class="loading-dots">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
      <div class="loading-text">Loading conversation...</div>
    </div>
  `;
  
  chatContainer.appendChild(loadingElement);
}

function hideConversationLoading(): void {
  const loadingElement = document.getElementById('conversation-loading');
  if (loadingElement) {
    loadingElement.style.opacity = '0';
    setTimeout(() => {
      if (loadingElement.parentNode) {
        loadingElement.remove();
      }
    }, 300);
  }
}

function addConversationListModal(): void {
  if (document.getElementById('conversation-list-modal')) return;
  
  const modal = document.createElement('div');
  modal.id = 'conversation-list-modal';
  modal.className = 'conversation-modal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content">
    <div class="modal-header-compact">
  <h2>Conversation History</h2>
  <div class="header-buttons-group" style="display: flex; gap: 8px; align-items: center;">
    <div id="storage-settings-btn-container"></div>
    <button class="modal-close">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>
</div>
      
      <div class="modal-search-bar-compact">
        <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input type="text" id="conversation-search" placeholder="Search conversations...">
      </div>
      
      <div class="storage-stats-compact">
        <div class="stat-compact">
          <div class="stat-label">Total Size</div>
          <div class="stat-value" id="total-size">0 B</div>
        </div>
        <div class="stat-compact">
          <div class="stat-label">Messages</div>
          <div class="stat-value" id="total-messages">0</div>
        </div>
        <div class="stat-compact">
          <div class="stat-label">Conversations</div>
          <div class="stat-value" id="total-conversations-stat">0</div>
        </div>
      </div>
      
      <div class="conversation-list-container">
        <div class="list-toolbar-compact">
          <span class="list-count" id="total-conversations">0 conversations</span>
          <button id="toggle-selection-mode" class="toolbar-btn-compact">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
            </svg>
            <span>Select</span>
          </button>
        </div>
        
        <div class="selection-toolbar-compact" id="selection-toolbar" style="display: none;">
          <label class="select-all-checkbox-compact">
            <input type="checkbox" id="select-all-conversations">
            <span>Select All</span>
          </label>
          <button id="delete-selected-btn" class="delete-selected-btn-compact" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
            </svg>
            Delete (<span id="selected-count">0</span>)
          </button>
        </div>
        
        <div class="conversation-list" id="conversation-list">
          <!-- Conversations will be populated here -->
        </div>
      </div>
    </div>
  `;
  
document.body.appendChild(modal);

// ⭐ ADD STORAGE SETTINGS BUTTON
const storageButtonContainer = modal.querySelector('#storage-settings-btn-container');
if (storageButtonContainer) {
  addStorageSettingsButton(storageButtonContainer as HTMLElement);
}

setupModalEventListeners(modal);
}

function setupModalEventListeners(modal: HTMLElement): void {
  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      exitSelectionMode();
      modal.style.display = 'none';
    });
  }
  
  const overlay = modal.querySelector('.modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      exitSelectionMode();
      modal.style.display = 'none';
    });
  }
  
  const searchInput = document.getElementById('conversation-search') as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value;
      if (query.trim()) {
        const filtered = conversationManager.searchConversations(query);
        renderConversationList(filtered);
      } else {
        renderConversationList(conversationManager.getAllConversations());
      }
    });
  }
  
  const toggleBtn = document.getElementById('toggle-selection-mode');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleSelectionMode);
  }
  
  const selectAllCheckbox = document.getElementById('select-all-conversations') as HTMLInputElement;
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', handleSelectAll);
  }
  
  const deleteSelectedBtn = document.getElementById('delete-selected-btn');
  if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener('click', handleDeleteSelected);
  }
}

// Loading indicator element
let loadingOverlay: HTMLElement | null = null;

function showLoadingIndicator(): void {
  // Create loading overlay if doesn't exist
  if (!loadingOverlay) {
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'conversation-loading-overlay';
    loadingOverlay.innerHTML = `
      <div style="
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
      ">
        <div style="
          background: #252526;
          padding: 24px 32px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          border: 1px solid #3c3c3c;
        ">
          <div class="loading-spinner" style="
            width: 32px;
            height: 32px;
            border: 3px solid #3c3c3c;
            border-top-color: #0e639c;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          "></div>
          <div style="color: #cccccc; font-size: 14px;">Loading conversations...</div>
        </div>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
  }
  document.body.appendChild(loadingOverlay);
}

function hideLoadingIndicator(): void {
  if (loadingOverlay && loadingOverlay.parentNode) {
    loadingOverlay.parentNode.removeChild(loadingOverlay);
  }
}

export function showConversationList(): void {
  const modal = document.getElementById('conversation-list-modal');
  if (!modal) return;
  
  // Show loading immediately
  showLoadingIndicator();
  
  // Use requestAnimationFrame to allow loading UI to render first
  requestAnimationFrame(() => {
    setTimeout(() => {
      const searchInput = document.getElementById('conversation-search') as HTMLInputElement;
      if (searchInput) {
        searchInput.value = '';
      }
      
      // Get conversations and render
      const conversations = conversationManager.getAllConversations();
      renderConversationList(conversations);
      updateStorageStats();
      
      // Hide loading and show modal
      hideLoadingIndicator();
      modal.style.display = 'flex';
    }, 50); // Small delay to ensure loading UI is visible
  });
}

function renderConversationList(conversations: any[]): void {
  const listContainer = document.getElementById('conversation-list');
  const totalSpan = document.getElementById('total-conversations');
  
  if (!listContainer) return;
  
  if (totalSpan) {
    totalSpan.textContent = `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`;
  }
  
  const currentConvId = conversationManager.getCurrentConversation()?.id;
  
  if (conversations.length === 0) {
    listContainer.innerHTML = `
      <div class="no-conversations">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
        </svg>
        <p>No conversations found</p>
        <span class="empty-hint">Start a new conversation to begin</span>
      </div>
    `;
    return;
  }
  
  listContainer.innerHTML = conversations.map(conv => {
    const date = new Date(conv.lastUpdated);
    const timeStr = formatConversationTime(date);
    const convSize = getConversationSize(conv);
    const preview = getConversationPreview(conv);
    
    return `
      <div class="conversation-item ${conv.id === currentConvId ? 'current' : ''}" data-id="${conv.id}">
        <div class="item-checkbox" style="display: ${isSelectionMode ? 'flex' : 'none'};">
          <input type="checkbox" class="conv-checkbox" data-id="${conv.id}">
        </div>
        
        <div class="item-icon">
          ${getConversationIcon(conv)}
        </div>
        
        <div class="item-content">
          <div class="item-header">
            <span class="item-title">${escapeHtml(truncateTitle(conv.title, 45))}</span>
            ${conv.id === currentConvId ? '<span class="current-badge">Current</span>' : ''}
          </div>
          
          ${preview ? `<div class="item-preview">${escapeHtml(preview)}</div>` : ''}
          
          <div class="item-metadata">
            <span class="meta-item">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path>
              </svg>
              ${conv.messages.length}
            </span>
            <span class="meta-item">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"></path>
                <polyline points="13 2 13 9 20 9"></polyline>
              </svg>
              ${formatByteSize(convSize)}
            </span>
            <span class="meta-item">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              ${timeStr}
            </span>
          </div>
        </div>
        
        <button class="item-delete-btn" data-id="${conv.id}" title="Delete conversation">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
          </svg>
        </button>
      </div>
    `;
  }).join('');
  
  setupConversationItemListeners();
}

function setupConversationItemListeners(): void {
  const listContainer = document.getElementById('conversation-list');
  if (!listContainer) return;
  
  listContainer.querySelectorAll('.conversation-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      if (target.classList.contains('conv-checkbox') || 
          target.closest('.item-delete-btn') ||
          target.closest('.item-checkbox')) {
        return;
      }
      
      if (!isSelectionMode) {
        const id = item.getAttribute('data-id');
        if (id) {
          showConversationLoading();
          setTimeout(() => {
            const conv = conversationManager.switchToConversation(id);
            if (conv) {
              loadConversationToUI(conv);
              const modal = document.getElementById('conversation-list-modal');
              if (modal) {
                modal.style.display = 'none';
              }
              showNotification(`Switched to: ${conv.title}`, 'success');
            }
          }, 100);
        }
      }
    });
    
    const checkbox = item.querySelector('.conv-checkbox') as HTMLInputElement;
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        const convId = checkbox.getAttribute('data-id');
        if (!convId) return;
        
        if (checkbox.checked) {
          selectedConversations.add(convId);
          item.classList.add('selected');
        } else {
          selectedConversations.delete(convId);
          item.classList.remove('selected');
        }
        
        updateDeleteButton();
        updateSelectAllState();
      });
    }
  });
  

// ============================================================================
// STEP 4: Update the UI handlers (in conversationUI.ts)
// ============================================================================

// Replace the delete button handler (around line 2580-2602)
listContainer.querySelectorAll('.item-delete-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const id = btn.getAttribute('data-id');
    if (!id) return;
    
    const conv = conversationManager.getConversationById(id);
    if (!conv) return;
    
    // Show detailed confirmation
    const confirmed = confirm(
      `🗑️ Delete "${conv.title}"?\n\n` +
      `📊 ${conv.messages.length} messages\n` +
      `📅 Last updated: ${new Date(conv.lastUpdated).toLocaleString()}\n\n` +
      `⚠️ This action CANNOT be undone!\n` +
      `The conversation will be permanently deleted from disk.`
    );
    
    if (!confirmed) return;
    
    try {
      // Show loading state
      btn.innerHTML = `<div class="spinner-small"></div>`;
      btn.setAttribute('disabled', 'true');
      
      // Actually delete (now includes disk deletion)
      const success = await conversationManager.deleteConversation(id);
      
      if (success) {
        // Update UI
        renderConversationList(conversationManager.getAllConversations());
        updateStorageStats();
        showNotification(`Deleted "${conv.title}"`, 'success');
      } else {
        showNotification('Failed to delete conversation', 'error');
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      showNotification(`Error: ${error}`, 'error');
    }
  });
});
}
// ============================================================================
// Selection Mode Functions (unchanged)
// ============================================================================

function toggleSelectionMode(): void {
  isSelectionMode = !isSelectionMode;
  const modal = document.getElementById('conversation-list-modal');
  if (!modal) return;
  
  const selectionToolbar = document.getElementById('selection-toolbar') as HTMLElement;
  const toggleBtn = document.getElementById('toggle-selection-mode') as HTMLElement;
  const conversationItems = modal.querySelectorAll('.conversation-item');
  
  if (isSelectionMode) {
    selectionToolbar.style.display = 'flex';
    toggleBtn.classList.add('active');
    toggleBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
      <span>Cancel</span>
    `;
    
    conversationItems.forEach(item => {
      const checkbox = item.querySelector('.item-checkbox') as HTMLElement;
      if (checkbox) checkbox.style.display = 'flex';
    });
  } else {
    exitSelectionMode();
  }
}

function exitSelectionMode(): void {
  isSelectionMode = false;
  selectedConversations.clear();
  
  const modal = document.getElementById('conversation-list-modal');
  if (!modal) return;
  
  const selectionToolbar = document.getElementById('selection-toolbar') as HTMLElement;
  const toggleBtn = document.getElementById('toggle-selection-mode') as HTMLElement;
  const conversationItems = modal.querySelectorAll('.conversation-item');
  const selectAllCheckbox = document.getElementById('select-all-conversations') as HTMLInputElement;
  const deleteBtn = document.getElementById('delete-selected-btn') as HTMLButtonElement;
  
  if (selectionToolbar) selectionToolbar.style.display = 'none';
  
  if (toggleBtn) {
    toggleBtn.classList.remove('active');
    toggleBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 11 12 14 22 4"></polyline>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
      </svg>
      <span>Select</span>
    `;
  }
  
  conversationItems.forEach(item => {
    const checkbox = item.querySelector('.item-checkbox') as HTMLElement;
    const input = item.querySelector('.conv-checkbox') as HTMLInputElement;
    if (checkbox) checkbox.style.display = 'none';
    if (input) input.checked = false;
    item.classList.remove('selected');
  });
  
  if (selectAllCheckbox) selectAllCheckbox.checked = false;
  
  if (deleteBtn) {
    deleteBtn.disabled = true;
    const countSpan = deleteBtn.querySelector('#selected-count');
    if (countSpan) countSpan.textContent = '0';
  }
}

function handleSelectAll(e: Event): void {
  const checkbox = e.target as HTMLInputElement;
  const conversationItems = document.querySelectorAll('.conversation-item');
  
  selectedConversations.clear();
  
  conversationItems.forEach(item => {
    const convId = item.getAttribute('data-id');
    const convCheckbox = item.querySelector('.conv-checkbox') as HTMLInputElement;
    
    if (convCheckbox && convId) {
      convCheckbox.checked = checkbox.checked;
      if (checkbox.checked) {
        selectedConversations.add(convId);
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    }
  });
  
  updateDeleteButton();
}

function updateDeleteButton(): void {
  const deleteBtn = document.getElementById('delete-selected-btn') as HTMLButtonElement;
  const countSpan = deleteBtn?.querySelector('#selected-count');
  
  if (deleteBtn && countSpan) {
    const count = selectedConversations.size;
    countSpan.textContent = count.toString();
    deleteBtn.disabled = count === 0;
    
    if (count > 0) {
      deleteBtn.classList.add('danger');
    } else {
      deleteBtn.classList.remove('danger');
    }
  }
}

async function handleDeleteSelected(): Promise<void> {
  const count = selectedConversations.size;
  if (count === 0) return;
  

  
  try {
    // Show loading notification
    showNotification(`Deleting ${count} conversations...`, 'info');
    
    // Delete all selected
    const idsToDelete = Array.from(selectedConversations);
    const deletedCount = await conversationManager.deleteConversations(idsToDelete);
    
    // Update UI
    selectedConversations.clear();
    exitSelectionMode();
    renderConversationList(conversationManager.getAllConversations());
    updateStorageStats();
    
    // Show success
    showNotification(
      `✅ Successfully deleted ${deletedCount} conversation${deletedCount > 1 ? 's' : ''}`,
      'success'
    );
  } catch (error) {
    console.error('Failed to delete conversations:', error);
    showNotification(`❌ Failed to delete: ${error}`, 'error');
  }
}

function updateSelectAllState(): void {
  const selectAllCheckbox = document.getElementById('select-all-conversations') as HTMLInputElement;
  const allCheckboxes = document.querySelectorAll('.conv-checkbox') as NodeListOf<HTMLInputElement>;
  
  if (selectAllCheckbox && allCheckboxes.length > 0) {
    const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
    const someChecked = Array.from(allCheckboxes).some(cb => cb.checked);
    
    selectAllCheckbox.checked = allChecked;
    selectAllCheckbox.indeterminate = someChecked && !allChecked;
  }
}

function updateStorageStats(): void {
  console.log('📊 updateStorageStats called');
  
  const conversations = conversationManager.getAllConversations();
  console.log('📊 Conversations from manager:', conversations?.length || 0);
  
  const stats = getStorageStats(conversations);
  console.log('📊 Stats calculated:', stats);
  
  const totalSizeEl = document.getElementById('total-size');
  const totalMessagesEl = document.getElementById('total-messages');
  const totalConversationsEl = document.getElementById('total-conversations-stat');
  
  console.log('📊 Elements found:', {
    totalSizeEl: !!totalSizeEl,
    totalMessagesEl: !!totalMessagesEl,
    totalConversationsEl: !!totalConversationsEl
  });
  
  if (totalSizeEl) {
    totalSizeEl.textContent = formatByteSize(stats.totalSize);
    console.log('📊 Set total-size to:', formatByteSize(stats.totalSize));
  }
  
  if (totalMessagesEl) {
    totalMessagesEl.textContent = stats.messageCount.toString();
    console.log('📊 Set total-messages to:', stats.messageCount);
  }
  
  if (totalConversationsEl) {
    totalConversationsEl.textContent = stats.conversationCount.toString();
    console.log('📊 Set total-conversations-stat to:', stats.conversationCount);
  }
}

// ============================================================================
// Helper Functions (unchanged)
// ============================================================================

// Helper to safely get text content from a message
function getMessageTextContent(message: any): string {
  if (!message || !message.content) return '';
  
  if (typeof message.content === 'string') {
    return message.content;
  }
  
  if (Array.isArray(message.content)) {
    const textPart = message.content.find((part: any) => part.type === 'text');
    return textPart?.text || '';
  }
  
  return String(message.content);
}

function getConversationIcon(conv: any): string {
  if (!conv.messages || conv.messages.length === 0) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.5">
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
    </svg>`;
  }
  
  const firstMessage = getMessageTextContent(conv.messages[0]).toLowerCase();
  
  if (firstMessage.includes('create') || firstMessage.includes('project')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" stroke-width="2">
      <path d="M22 2L11 13"></path>
      <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
    </svg>`;
  }
  
  if (firstMessage.includes('debug') || firstMessage.includes('fix')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2">
      <path d="M9 11l-6 6v3h9l3-3"></path>
      <path d="M22 12l-4.6 4.6a2 2 0 01-2.8 0l-5.2-5.2a2 2 0 010-2.8L14 4"></path>
    </svg>`;
  }
  
  if (firstMessage.includes('help') || firstMessage.includes('how')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f39c12" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"></path>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>`;
  }
  
  if (firstMessage.includes('code') || firstMessage.includes('function')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3498db" stroke-width="2">
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>`;
  }
  
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.7">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path>
  </svg>`;
}

function truncateTitle(title: string, maxLength: number): string {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength - 3) + '...';
}

function getConversationPreview(conv: any): string {
  if (!conv.messages || conv.messages.length === 0) return '';
  
  const lastUserMessage = [...conv.messages].reverse().find(m => m.role === 'user');
  if (lastUserMessage) {
    const contentText = getMessageTextContent(lastUserMessage);
    if (!contentText) return '';
    
    const cleaned = contentText
      .replace(/```[\s\S]*?```/g, '[code]')
      .replace(/\n/g, ' ')
      .substring(0, 80);
    return cleaned.length < contentText.length ? cleaned + '...' : cleaned;
  }
  
  return '';
}

// Stub functions for missing implementations
function setupSuggestionEventHandlers(element: HTMLElement): void {
  console.log('Setting up suggestion handlers for:', element);
}

function processMessageContent(content: string): string {
  if (!content) return '';
  
  // Skip if content is already HTML
  if (content.includes('<strong>') || 
      content.includes('<h1') || 
      content.includes('<ul>') ||
      content.includes('class="muf-')) {
    return content;
  }
  
  try {
    // Try using the unified markdown processor (if available)
    const processor = (window as any).markdownProcessor;
    if (processor && typeof processor.processMarkdown === 'function') {
      const result = processor.processMarkdown(content, 'loaded-msg');
      return result.html || content;
    }
    
    // Try using processMessageContent from messageUI (if available on window)
    if (typeof (window as any).processMessageContentFromUI === 'function') {
      return (window as any).processMessageContentFromUI(content);
    }
    
    // Fallback: basic markdown to HTML conversion
    return basicMarkdownToHtml(content);
  } catch (e) {
    console.warn('[processMessageContent] Error:', e);
    return basicMarkdownToHtml(content);
  }
}

/**
 * Basic markdown to HTML conversion (fallback when no processor available)
 */
function basicMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Escape HTML entities first (but preserve existing HTML)
  if (!html.includes('<')) {
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  
  // Code blocks (must be first to protect content inside)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const langClass = lang ? ` class="language-${lang}"` : '';
    const cleanCode = code.trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre><code${langClass}>${cleanCode}</code></pre>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Headers
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  
  // Bold and italic
  html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  
  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
  
  // Unordered lists
  html = html.replace(/^[-*+]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  
  // Numbered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  
  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^\*\*\*$/gm, '<hr>');
  
  // Paragraphs
  html = html.replace(/\n\n+/g, '</p><p>');
  html = html.replace(/(?<!<\/li>)\n(?!<)/g, '<br>');
  
  if (!html.startsWith('<')) {
    html = `<p>${html}</p>`;
  }
  
  html = html.replace(/<p>\s*<\/p>/g, '');
  
  return html;
}

function setupMessageActions(element: HTMLElement, message: Message): void {
  console.log('Setting up message actions for:', message.id);
}


// ============================================
// OPTION 1: Add to Conversation History Header
// ============================================

// Based on your screenshot, add the button here:

export function createConversationHistoryModal() {
  const modal = document.createElement('div');
  modal.className = 'conversation-history-modal';
  modal.innerHTML = `
    <div class="modal-overlay" style="
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    ">
      <div class="modal-content" style="
        background: #1e1e1e;
        border-radius: 8px;
        width: 700px;
        max-width: 90vw;
        max-height: 80vh;
      ">
        <!-- Header -->
        <div class="modal-header" style="
          padding: 16px 20px;
          border-bottom: 1px solid #3c3c3c;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <h2>Conversation History</h2>
          
          <!-- ⭐ ADD THIS DIV for buttons -->
          <div class="header-buttons" style="display: flex; gap: 8px; align-items: center;">
            <!-- Storage Settings Button will be added here -->
            <div id="storage-btn-container"></div>
            
            <!-- Your existing Select button -->
            <button class="select-btn">Select</button>
            
            <!-- Close button -->
            <button class="close-btn">×</button>
          </div>
        </div>
        
        <!-- Search -->
        <div style="padding: 16px 20px;">
          <input type="text" placeholder="Search conversations..." 
                 class="search-input">
        </div>
        
        <!-- Stats -->
        <div class="stats-section" style="
          display: flex;
          justify-content: space-around;
          padding: 16px 20px;
          background: #252525;
          border-top: 1px solid #2d2d2d;
          border-bottom: 1px solid #2d2d2d;
        ">
          <div style="text-align: center;">
            <div style="color: #888; font-size: 12px;">TOTAL SIZE</div>
            <div id="total-size" style="color: #0e639c; font-size: 16px; font-weight: 600;">0 B</div>
          </div>
          <div style="text-align: center;">
            <div style="color: #888; font-size: 12px;">MESSAGES</div>
            <div id="total-messages" style="color: #0e639c; font-size: 16px; font-weight: 600;">0</div>
          </div>
          <div style="text-align: center;">
            <div style="color: #888; font-size: 12px;">CONVERSATIONS</div>
            <div id="total-conversations-stat" style="color: #0e639c; font-size: 16px; font-weight: 600;">0</div>
          </div>
        </div>
        
        <!-- Storage Status (Optional) -->
        <div id="storage-status" style="
          padding: 8px 20px;
          background: #2d2d2d;
          font-size: 12px;
          color: #888;
          border-bottom: 1px solid #3c3c3c;
        "></div>
        
        <!-- Conversations List -->
        <div class="conversations-list" style="
          padding: 16px 20px;
          overflow-y: auto;
          max-height: 400px;
        ">
          <!-- Your conversations list items -->
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // ⭐⭐⭐ ADD THE STORAGE SETTINGS BUTTON ⭐⭐⭐
  const btnContainer = modal.querySelector('#storage-btn-container');
  if (btnContainer) {
    addStorageSettingsButton(btnContainer as HTMLElement);
  }
  
  // Optional: Display current storage status
  updateStorageStatus(modal);
  
  // Your existing event listeners
  setupModalEventListeners(modal);
  
  return modal;
}

// ============================================
// OPTIONAL: Show Storage Status
// ============================================

function updateStorageStatus(modal: HTMLElement) {
  const statusElement = modal.querySelector('#storage-status');
  if (statusElement) {
    const settings = storageSettingsManager.getSettings();
    
    if (settings.storageType === 'memory-only') {
      statusElement.innerHTML = '💭 <strong>Memory Only</strong> - Conversations are not saved';
    } else if (settings.customPath) {
      statusElement.innerHTML = `💾 <strong>Saving to:</strong> <code style="font-family: monospace; background: #1e1e1e; padding: 2px 6px; border-radius: 3px;">${settings.customPath}</code>`;
    }
  }
}

// ============================================
// COMPLETE EXAMPLE WITH ALL FEATURES
// ============================================

export function initializeConversationUI() {
  // Storage settings bar button
  setTimeout(() => {
    const storageBtn = document.getElementById('storage-settings-bar-btn');
    if (storageBtn) {
      storageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const existing = document.querySelector('.storage-settings-overlay');
        if (existing) { existing.remove(); return; }
        import('./storageSettingsUI').then(mod => {
          const ui = mod.createStorageSettingsUI();
          document.body.appendChild(ui);
        }).catch(() => {
          console.error('Failed to load storage settings UI');
        });
      });
    }
  }, 500);

  // Log storage mode on startup
  const settings = storageSettingsManager.getSettings();
  console.log('💾 Storage Mode:', settings.storageType);
  
  if (settings.storageType === 'memory-only') {
    console.log('📌 Memory Only: Conversations will not be saved');
  } else {
    console.log('📌 Saving to:', settings.customPath);
  }
}

// ============================================
// ALTERNATIVE: Add as Menu Item
// ============================================

export function addStorageSettingsMenuItem() {
  // If you have a dropdown menu, add it there:
  const menu = document.querySelector('.conversation-menu');
  if (menu) {
    const menuItem = document.createElement('button');
    menuItem.className = 'menu-item';
    menuItem.innerHTML = '⚙️ Storage Settings';
    menuItem.onclick = () => {
      const { createStorageSettingsUI } = require('./storageSettingsUI');
      document.body.appendChild(createStorageSettingsUI());
    };
    menu.appendChild(menuItem);
  }
}

// ============================================
// SHOW STORAGE INFO IN ASSISTANT PANEL
// ============================================

export function addStorageInfoToPanel(panel: HTMLElement) {
  const settings = storageSettingsManager.getSettings();
  
  const infoBar = document.createElement('div');
  infoBar.style.cssText = `
    padding: 6px 12px;
    background: #252525;
    border-bottom: 1px solid #2d2d2d;
    font-size: 11px;
    color: #888;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  
  const statusText = document.createElement('span');
  if (settings.storageType === 'memory-only') {
    statusText.textContent = '💭 Memory Only Mode';
  } else {
    statusText.textContent = `💾 Saving to: ${settings.customPath}`;
  }
  
  const settingsLink = document.createElement('button');
  settingsLink.textContent = 'Change';
  settingsLink.style.cssText = `
    background: transparent;
    border: 1px solid #3c3c3c;
    color: #888;
    padding: 2px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
  `;
  settingsLink.onclick = () => {
    const { createStorageSettingsUI } = require('./storageSettingsUI');
    document.body.appendChild(createStorageSettingsUI());
  };
  
  infoBar.appendChild(statusText);
  infoBar.appendChild(settingsLink);
  
  panel.insertBefore(infoBar, panel.firstChild);
}