// ui.ts - Contains UI related functionality, DOM elements and rendering logic

import { Conversation, Message } from './types';
import { 
  conversations, 
  currentConversationId, 
  saveConversations, 
  saveCurrentConversationId,
  setCurrentConversationId
} from './state';
import { startRenamingConversation } from './utils';
import { createNewConversation } from './conversation';
// Update the import path to point to the aiAssistant folder
import { markdownProcessor } from './ide/aiAssistant/unifiedMarkdownProcessor';
import { formatConversationTime } from './ide/aiAssistant/dateFormatUtils';

// ============================================================================
// DOM ELEMENTS
// ============================================================================

export let conversationList: HTMLDivElement | null = null;
export let chatContainer: HTMLDivElement | null = null;
export let welcomeScreen: HTMLDivElement | null = null;
export let messageInput: HTMLTextAreaElement | null = null;
export let sendButton: HTMLButtonElement | null = null;
export let newChatButton: HTMLButtonElement | null = null;
export let settingsButton: HTMLButtonElement | null = null;
export let settingsModal: HTMLDivElement | null = null;
export let closeModalButton: HTMLSpanElement | null = null;
export let apiKeyInput: HTMLInputElement | null = null;
export let apiBaseUrlInput: HTMLInputElement | null = null;
export let saveApiKeyButton: HTMLButtonElement | null = null;
export let exportButton: HTMLButtonElement | null = null;
export let importButton: HTMLButtonElement | null = null;

// ============================================================================
// INITIALIZE DOM ELEMENTS
// ============================================================================

export function initDomElements(): void {
  console.log('Initializing DOM elements...');
  
  conversationList = document.getElementById('conversation-list') as HTMLDivElement;
  chatContainer = document.getElementById('chat-container') as HTMLDivElement;
  welcomeScreen = document.getElementById('welcome-screen') as HTMLDivElement;
  messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
  sendButton = document.getElementById('send-btn') as HTMLButtonElement;
  newChatButton = document.getElementById('new-chat-btn') as HTMLButtonElement;
  settingsButton = document.getElementById('settings-btn') as HTMLButtonElement;
  settingsModal = document.getElementById('settings-modal') as HTMLDivElement;
  closeModalButton = document.querySelector('.close-modal') as HTMLSpanElement;
  apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
  apiBaseUrlInput = document.getElementById('api-base-url-input') as HTMLInputElement;
  saveApiKeyButton = document.getElementById('save-api-key-btn') as HTMLButtonElement;
  exportButton = document.getElementById('export-btn') as HTMLButtonElement;
  importButton = document.getElementById('import-btn') as HTMLButtonElement;
  
  console.log('DOM elements initialized:', {
    conversationList: !!conversationList,
    chatContainer: !!chatContainer,
    welcomeScreen: !!welcomeScreen,
    messageInput: !!messageInput,
    sendButton: !!sendButton,
    newChatButton: !!newChatButton,
    settingsButton: !!settingsButton,
    settingsModal: !!settingsModal
  });
}

// ============================================================================
// RENDER CONVERSATION LIST
// ============================================================================

export function renderConversationList(): void {
  if (!conversationList) {
    console.warn('Conversation list element not found');
    return;
  }
  
  conversationList.innerHTML = '';

  conversations.forEach(conversation => {
    const conversationItem = document.createElement('div');
    conversationItem.className = `conversation-item ${conversation.id === currentConversationId ? 'active' : ''}`;
    conversationItem.dataset.id = conversation.id;
    
    // Create title and metadata elements
    const titleElement = document.createElement('span');
    titleElement.className = 'conversation-title';
    titleElement.textContent = conversation.title || 'New Chat';
    
    // Create metadata container
    const metadataContainer = document.createElement('div');
    metadataContainer.className = 'conversation-metadata';
    
    // Add message count
    const messageCount = document.createElement('span');
    messageCount.className = 'message-count';
    messageCount.textContent = `${conversation.messages.length} messages`;
    
    // Add timestamp
    const timestamp = document.createElement('span');
    timestamp.className = 'conversation-time';
    // ✅ FIX: Use lastUpdated (most recent activity), then createdAt, then derive from messages
    const convTimestamp = conversation.lastUpdated 
      || conversation.createdAt 
      || conversation.messages?.[conversation.messages.length - 1]?.timestamp
      || conversation.messages?.[0]?.timestamp;
    const date = new Date(convTimestamp || Date.now());
    // ✅ FIX: Use shared formatConversationTime for consistent date display
    timestamp.textContent = formatConversationTime(date);
    
    metadataContainer.appendChild(messageCount);
    metadataContainer.appendChild(timestamp);
    
    // Create actions container
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'conversation-actions';
    actionsContainer.innerHTML = `
      <button class="edit-conversation-btn" title="Rename">✏️</button>
      <button class="delete-conversation" title="Delete">×</button>
    `;

    // Build conversation item structure
    conversationItem.appendChild(titleElement);
    conversationItem.appendChild(metadataContainer);
    conversationItem.appendChild(actionsContainer);

    // Add event handler for selecting conversation
    conversationItem.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('delete-conversation') && 
          !target.classList.contains('edit-conversation-btn')) {
        console.log('Conversation selected:', conversation.id);
        setCurrentConversationId(conversation.id);
        saveCurrentConversationId();
        renderConversationList();
        renderCurrentConversation();
      }
    });

    // Add delete button handler
    const deleteButton = conversationItem.querySelector('.delete-conversation');
    if (deleteButton) {
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('Delete button clicked for:', conversation.id);
        deleteConversation(conversation.id);
      });
    }

    // Add edit button handler
    const editButton = conversationItem.querySelector('.edit-conversation-btn');
    if (editButton) {
      editButton.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('Edit button clicked for:', conversation.id);
        startRenamingConversation(conversation.id, conversations, renderConversationList, saveConversations);
      });
    }

    conversationList.appendChild(conversationItem);
  });
}

// ============================================================================
// DELETE CONVERSATION
// ============================================================================

export function deleteConversation(id: string): void {
  if (confirm('Are you sure you want to delete this conversation?')) {
    // Filter out the deleted conversation
    const newConversations = conversations.filter(c => c.id !== id);
    
    // Update the conversations array
    conversations.length = 0;
    conversations.push(...newConversations);
    
    // If we deleted the current conversation, select another one or create new
    if (currentConversationId === id) {
      if (conversations.length > 0) {
        setCurrentConversationId(conversations[0].id);
      } else {
        setCurrentConversationId(null);
      }
    }
    
    saveConversations();
    saveCurrentConversationId();
    
    // Re-render UI components
    renderConversationList();
    renderCurrentConversation();
  }
}

// ============================================================================
// RENDER CURRENT CONVERSATION - WITH UNIFIED MARKDOWN PROCESSING
// ============================================================================

export function renderCurrentConversation(): void {
  if (!chatContainer) {
    console.warn('Chat container not found');
    return;
  }
  
  // Clear chat container
  chatContainer.innerHTML = '';
  
  // If no conversation is selected, show welcome screen
  if (!currentConversationId) {
    chatContainer.innerHTML = `
      <div class="welcome-screen">
        <h2>Welcome to Deepseek AI Chat</h2>
        <p>Start a new conversation or select an existing one.</p>
        <div class="feature-tips">
          <h3>Tips</h3>
          <div class="tip-item">
            <h4>System Commands</h4>
            <p>Run system commands directly in the chat:</p>
            <ul>
              <li><code>/cmd dir</code> - Run a CMD command</li>
              <li><code>/ps Get-Process</code> - Run a PowerShell command</li>
            </ul>
          </div>
          <div class="tip-item">
            <h4>File Uploads</h4>
            <p>Upload files to include in your conversations.</p>
          </div>
          <div class="tip-item">
            <h4>Code Assistance</h4>
            <p>Get help with code, including syntax highlighting and copy/insert functionality.</p>
          </div>
        </div>
      </div>
    `;
    
    setupWelcomeScreenSendButton();
    return;
  }
  
  // Find the selected conversation
  const conversation = conversations.find(c => c.id === currentConversationId);
  if (!conversation) {
    console.warn('Conversation not found:', currentConversationId);
    return;
  }
  
  // Render messages
  conversation.messages.forEach((message, index) => {
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${message.role}`;
    messageElement.setAttribute('data-message-id', message.id || `msg-${index}`);
    
    // Add role indicator
    const roleElement = document.createElement('div');
    roleElement.className = 'message-role';
    roleElement.textContent = message.role === 'user' ? 'You' : 'Deepseek AI';
    messageElement.appendChild(roleElement);
    
    // Add message content
    const contentElement = document.createElement('div');
    contentElement.className = 'message-content markdown-content';
    
    // CRITICAL: Check if content is already processed HTML
    const isAlreadyProcessed = 
      message.content.includes('class="cmd-response"') ||
      message.content.includes('<pre><code>') ||
      message.content.includes('code-block-container') ||
      message.content.includes('data-code-id=') ||
      message.content.includes('hidden-code-data');
    
    if (isAlreadyProcessed) {
      // Already processed HTML from conversation.ts - use as-is
      console.log('[ui.ts] Content already processed, using as-is');
      contentElement.innerHTML = message.content;
    } else {
      // Legacy or unprocessed content - process it with unified processor
      console.log('[ui.ts] Processing content with unified markdown processor');
      const processed = markdownProcessor.processMarkdown(message.content, message.id);
      contentElement.innerHTML = processed.html;
    }
    
    messageElement.appendChild(contentElement);
    
    // Add timestamp if available
    if (message.timestamp) {
      const timestampElement = document.createElement('div');
      timestampElement.className = 'message-timestamp';
      timestampElement.textContent = formatTime(new Date(message.timestamp));
      messageElement.appendChild(timestampElement);
    }
    
    chatContainer.appendChild(messageElement);
  });
  
  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  // Setup code block handlers after rendering
  setTimeout(() => {
    markdownProcessor.setupCodeBlockHandlers();
  }, 100);
}

// ============================================================================
// WELCOME SCREEN SEND BUTTON HANDLER
// ============================================================================

function setupWelcomeScreenSendButton(): void {
  if (sendButton && messageInput) {
    const welcomeScreenSendHandler = () => {
      if (!currentConversationId && messageInput && messageInput.value.trim()) {
        console.log('Creating new conversation from welcome screen');
        createNewConversation();
      }
    };
    
    // Store original handlers if they exist
    const originalClickHandlers = [...(sendButton as any)._events?.click || []];
    
    if ((sendButton as any)._events?.click) {
      (sendButton as any)._events.click = [];
    }
    
    sendButton.addEventListener('click', welcomeScreenSendHandler);
    
    originalClickHandlers.forEach(handler => {
      sendButton?.addEventListener('click', handler);
    });
    
    const keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        welcomeScreenSendHandler();
      }
    };
    
    messageInput.addEventListener('keydown', keydownHandler);
    
    // Clean up handlers when conversation changes
    document.addEventListener('conversation-changed', () => {
      sendButton?.removeEventListener('click', welcomeScreenSendHandler);
      messageInput?.removeEventListener('keydown', keydownHandler);
    }, { once: true });
  }
}

// ============================================================================
// COMMAND HINT
// ============================================================================

export function showCommandHint(hint: string): void {
  let hintElement = document.getElementById('command-hint');
  
  if (!hintElement) {
    hintElement = document.createElement('div');
    hintElement.id = 'command-hint';
    hintElement.className = 'command-hint';
    document.body.appendChild(hintElement);
  }
  
  hintElement.textContent = hint;
  
  if (messageInput) {
    const rect = messageInput.getBoundingClientRect();
    hintElement.style.position = 'absolute';
    hintElement.style.top = `${rect.top - 30}px`;
    hintElement.style.left = `${rect.left}px`;
    hintElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    hintElement.style.color = 'white';
    hintElement.style.padding = '5px 10px';
    hintElement.style.borderRadius = '4px';
    hintElement.style.fontSize = '12px';
    hintElement.style.zIndex = '1000';
  }
  
  setTimeout(() => {
    if (hintElement && hintElement.parentNode) {
      hintElement.parentNode.removeChild(hintElement);
    }
  }, 3000);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 7) {
    return date.toLocaleDateString();
  } else if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initDomElements,
  renderConversationList,
  renderCurrentConversation,
  deleteConversation,
  showCommandHint
};