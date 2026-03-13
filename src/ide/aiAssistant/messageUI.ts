// ============================================================================
// INTEGRATED VERSION - IDE Message Styles (January 24, 2026)
// Added:
//   - 🎨 ideMarkdownTransformer import (line ~28)
//   - 🎨 transformContentForIDE() in addMessageToChat()
//   - 🎨 postProcessHTML() after markdown processing
// ============================================================================

// messageUI.ts - Message UI Management with Unified Markdown Processing
// FIXED: Scroll issues during AI streaming - debounced scroll with RAF
// FIXED: Removed convertResponseToHTML import to avoid circular dependency
// FIXED: Added conversation loading check to prevent scroll during bulk load
// FIXED: Auto-scroll to bottom during AI processing to keep loading bar visible
// UPDATED: Now delegates scroll to chatScrollManager for smart scroll behavior
// NEW: Auto-collapse previous AI messages when new AI message arrives
// FIXED: Added CSS injection for collapse styles

import { 
  MessageRole, 
  MessageNote,
  generateId,
  formatTime,
  escapeHtml,
  getProviderInfo
  // REMOVED: convertResponseToHTML - using window function instead to avoid circular import
} from './assistantUI';
import { getCurrentApiConfigurationForced } from './apiProviderManager';
import { conversationManager } from './conversationManager';
import { showNotification } from './notificationManager';
import { messageNotes, showNoteDialog } from './noteManager';
import { queueMessageForSaving, getIsSavingEnabled } from './messageQueueManager';
import { getCurrentCodeContext, isInCodeAnalysis } from './codeContextManager';
// Since they're in the same folder, use relative import
import { markdownProcessor } from './unifiedMarkdownProcessor';
// 🎨 IDE Message Transformer - Apply IDE-style formatting
import { transformContentForIDE, postProcessHTML } from './ideMarkdownTransformer';
// 📜 Import scroll manager - delegates all scrolling to smart scroll system
import {
  scrollChatToBottom as scrollManagerToBottom,
  forceScrollChatToBottom,
  startStreamingMode,
  endStreamingMode,
  scrollDuringStreaming
} from './chatScrollManager';

// ============================================================================
// SCROLL UTILITY - Now delegates to chatScrollManager
// ============================================================================

// FIXED: Global flag to track if conversation is being bulk loaded
let isConversationLoading = false;

// Tracking flag for AI processing
let isAIProcessing = false;

// NEW: Flag to control auto-collapse behavior
let autoCollapseEnabled = true;

// NEW: Flag to track if styles have been injected
let collapseStylesInjected = false;

/**
 * Set the conversation loading state
 * Called by conversationUI.ts during bulk load
 */
export function setConversationLoading(loading: boolean): void {
  isConversationLoading = loading;
  if (loading) {
    console.log('🔒 Scroll locked - conversation loading');
  } else {
    console.log('🔓 Scroll unlocked - conversation loaded');
  }
}

/**
 * Check if conversation is currently loading
 */
export function getConversationLoading(): boolean {
  return isConversationLoading;
}

/**
 * Enable or disable auto-collapse for AI messages
 */
export function setAutoCollapseEnabled(enabled: boolean): void {
  autoCollapseEnabled = enabled;
  console.log(`📦 Auto-collapse ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Get auto-collapse state
 */
export function getAutoCollapseEnabled(): boolean {
  return autoCollapseEnabled;
}

/**
 * Start auto-scroll during AI processing
 * Now delegates to chatScrollManager
 */
export function startAIProcessingScroll(): void {
  if (isConversationLoading) return;
  
  isAIProcessing = true;
  startStreamingMode();
  console.log('🔄 Auto-scroll started for AI processing (via scroll manager)');
}

/**
 * Stop auto-scroll when AI processing is complete
 * Now delegates to chatScrollManager
 */
export function stopAIProcessingScroll(): void {
  isAIProcessing = false;
  endStreamingMode();
  console.log('✅ Auto-scroll stopped - AI processing complete (via scroll manager)');
}

/**
 * Scroll to bottom with debouncing - now delegates to scroll manager
 */
function scrollToBottomDebounced(chatContainer: Element | null, immediate: boolean = false): void {
  if (!chatContainer) return;
  if (isConversationLoading) return;
  
  // During streaming, use streaming scroll
  if (isAIProcessing) {
    scrollDuringStreaming();
  } else {
    scrollManagerToBottom();
  }
}

/**
 * Force scroll to bottom - now delegates to scroll manager
 */
function scrollToBottomForced(chatContainer: Element | null): void {
  if (!chatContainer) return;
  if (isConversationLoading) return;
  
  forceScrollChatToBottom();
}

// ============================================================================
// AI MESSAGE AUTO-COLLAPSE STYLES - INJECT CSS
// ============================================================================

/**
 * Inject CSS styles for collapsed AI messages and action buttons
 * This is called automatically when collapsing messages
 * ✅ FIX: More robust - checks if style element actually exists
 */
function injectCollapseStyles(): void {
  // ✅ FIX: Check if style element actually exists, reset flag if not
  const existingStyle = document.getElementById('ai-message-collapse-styles');
  if (!existingStyle) {
    collapseStylesInjected = false;
  }
  
  if (collapseStylesInjected && existingStyle) return;
  
  // Remove old style if exists but was inconsistent
  if (existingStyle) {
    existingStyle.remove();
  }
  
  const style = document.createElement('style');
  style.id = 'ai-message-collapse-styles';
  style.textContent = `
    /* AI Message Collapsed State */
    .ai-message.ai-message-collapsed {
      background: linear-gradient(135deg, #1a1f25 0%, #171b21 100%);
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 0 !important;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .ai-message.ai-message-collapsed:hover {
      border-color: #58a6ff;
      background: linear-gradient(135deg, #1e252d 0%, #1a1f25 100%);
    }

    /* Hide content and actions when collapsed */
    .ai-message.ai-message-collapsed .ai-message-content,
    .ai-message.ai-message-collapsed .message-actions {
      display: none !important;
    }

    /* Collapsed Header */
    .ai-message-collapsed-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      cursor: pointer;
      user-select: none;
    }

    /* Collapse Indicator */
    .collapsed-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .collapsed-chevron {
      color: #58a6ff;
      transition: transform 0.2s ease;
    }

    .ai-message-collapsed:hover .collapsed-chevron {
      transform: translateX(2px);
    }

    /* Preview Text */
    .collapsed-preview {
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }

    .collapsed-preview-text {
      display: block;
      font-size: 13px;
      color: #8b949e;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.4;
    }

    .ai-message-collapsed:hover .collapsed-preview-text {
      color: #c9d1d9;
    }

    /* Collapsed Metadata */
    .collapsed-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .collapsed-provider {
      font-size: 11px;
      font-weight: 500;
    }

    .collapsed-time {
      font-size: 11px;
      color: #6e7681;
    }

    /* Expand animation */
    .ai-message.assistant-message:not(.ai-message-collapsed) {
      animation: messageExpand 0.3s ease-out;
    }

    @keyframes messageExpand {
      from {
        opacity: 0.8;
        transform: translateY(-5px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* ================================================================
       🎨 ULTRA COMPACT CHAT STYLES - Q&A Grouped Together
       User question + AI answer = one connected block
       Gap only between different Q&A pairs
    ================================================================ */
    
    /* Base message styling - ULTRA COMPACT padding */
    .ai-message {
      margin: 0;
      padding: 4px 10px !important;
    }
    
    /* User message - rounded top, flat bottom (connects to answer) */
    .ai-message.user-message {
      margin-bottom: 0 !important;
      border-radius: 8px 8px 0 0 !important;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      padding: 5px 10px !important;
    }
    
    /* Assistant message - flat top, rounded bottom (connects to question) */
    .ai-message.assistant-message {
      margin-top: 0 !important;
      margin-bottom: 0;
      border-radius: 0 0 8px 8px !important;
      padding: 5px 10px !important;
    }
    
    /* Collapsed assistant - ultra compact */
    .ai-message.ai-message-collapsed {
      padding: 0 !important;
      border-radius: 0 0 8px 8px !important;
    }
    
    .ai-message.ai-message-collapsed .ai-message-collapsed-header {
      padding: 4px 10px !important;
      gap: 6px !important;
    }
    
    /* NEW Q&A BLOCK: User message after assistant gets top spacing */
    .ai-message.assistant-message + .ai-message.user-message {
      margin-top: 10px !important;
      border-radius: 8px 8px 0 0 !important;
    }
    
    /* First message in chat - no top margin */
    .ai-chat-container > .ai-message:first-child {
      margin-top: 0;
    }
    
    /* Collapsed + next user */
    .ai-message.ai-message-collapsed + .ai-message.user-message {
      margin-top: 10px !important;
    }
    
    /* Typing indicator spacing */
    .ai-message.typing-indicator {
      margin-top: 0 !important;
      margin-bottom: 0;
      border-radius: 0 0 8px 8px !important;
      padding: 4px 10px !important;
    }
    
    /* System messages */
    .ai-message.system-message {
      margin: 6px 0;
      border-radius: 6px !important;
      padding: 4px 10px !important;
    }
    
    /* Message content - tighter spacing */
    .ai-message .ai-message-content {
      padding: 0 !important;
      margin: 0 !important;
      line-height: 1.4 !important;
    }
    
    .ai-message .ai-message-content p {
      margin: 2px 0 !important;
    }
    
    .ai-message .ai-message-content p:first-child {
      margin-top: 0 !important;
    }
    
    .ai-message .ai-message-content p:last-child {
      margin-bottom: 0 !important;
    }
    
    /* Message actions/footer - compact */
    .ai-message .message-actions {
      padding: 2px 0 0 0 !important;
      margin-top: 2px !important;
    }
    
    .ai-message .message-meta-inline {
      font-size: 10px !important;
    }
    
    /* ================================================================
       🎨 MESSAGE ACTION BUTTONS - Essential Styles
       These styles MUST be present for action buttons to display
    ================================================================ */
    
    .message-action-buttons {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .message-action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      color: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      transition: all 0.15s ease;
      padding: 0;
    }
    
    .message-action-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.25);
      color: #ffffff;
    }
    
    .message-action-btn:active {
      background: rgba(255, 255, 255, 0.12);
      transform: scale(0.95);
    }
    
    .message-action-btn svg {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }
    
    /* Specific button states */
    .message-action-btn.like-btn.active {
      color: #4ade80;
      border-color: rgba(74, 222, 128, 0.3);
    }
    
    .message-action-btn.dislike-btn.active {
      color: #f87171;
      border-color: rgba(248, 113, 113, 0.3);
    }
    
    .message-action-btn.note-btn[data-has-note="true"] {
      color: #fbbf24;
      border-color: rgba(251, 191, 36, 0.3);
    }
    
    /* Copy button success state */
    .message-action-btn.copy-btn.copied {
      color: #4ade80;
      border-color: rgba(74, 222, 128, 0.3);
    }
    
    /* User message actions */
    .user-message-actions {
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    
    .ai-message.user-message:hover .user-message-actions {
      opacity: 1;
    }
    
    /* Message metadata inline */
    .message-meta-inline {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
    }
    
    .message-meta-inline .meta-time {
      color: rgba(255, 255, 255, 0.35);
    }
    
    .message-meta-inline .meta-separator {
      color: rgba(255, 255, 255, 0.2);
    }
    
    .message-meta-inline .meta-provider {
      font-weight: 500;
    }
  `;
  
  document.head.appendChild(style);
  collapseStylesInjected = true;
  console.log('✅ AI message collapse styles injected');
}

// ============================================================================
// AI MESSAGE AUTO-COLLAPSE FEATURE
// ============================================================================

/**
 * Collapse all previous AI messages when a new one arrives
 */
function collapsePreviousAIMessages(): void {
  if (!autoCollapseEnabled) return;
  
  // Ensure styles are injected
  injectCollapseStyles();
  
  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) return;
  
  // Find all assistant messages that are not collapsed
  const assistantMessages = chatContainer.querySelectorAll('.assistant-message:not(.ai-message-collapsed)');
  
  let collapsedCount = 0;
  assistantMessages.forEach((message) => {
    // Skip if already collapsed or currently streaming
    if (message.classList.contains('ai-message-collapsed') || 
        message.classList.contains('streaming')) {
      return;
    }
    
    collapseAIMessage(message as HTMLElement);
    collapsedCount++;
  });
  
  if (collapsedCount > 0) {
    console.log(`📦 Collapsed ${collapsedCount} previous AI messages`);
  }
}

/**
 * Collapse a single AI message
 */
function collapseAIMessage(messageElement: HTMLElement): void {
  if (messageElement.classList.contains('ai-message-collapsed')) return;
  
  // Ensure styles are injected
  injectCollapseStyles();
  
  const contentDiv = messageElement.querySelector('.ai-message-content');
  const actionsDiv = messageElement.querySelector('.message-actions');
  
  if (!contentDiv) return;
  
  // Get preview text (first ~80 chars)
  const originalText = contentDiv.textContent || '';
  const previewText = createPreviewText(originalText, 80);
  
  // Get timestamp from actions
  const timeElement = actionsDiv?.querySelector('.message-time');
  const timestamp = timeElement?.textContent || '';
  
  // Get provider info
  const providerElement = actionsDiv?.querySelector('.provider-text-minimal');
  const providerName = providerElement?.textContent || 'AI';
  const providerColor = (providerElement as HTMLElement)?.style.color || '#888';
  
  // Create collapsed header
  const collapsedHeader = document.createElement('div');
  collapsedHeader.className = 'ai-message-collapsed-header';
  collapsedHeader.innerHTML = `
    <div class="collapsed-indicator">
      <svg class="collapsed-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
    <div class="collapsed-preview">
      <span class="collapsed-preview-text">${escapeHtml(previewText)}</span>
    </div>
    <div class="collapsed-meta">
      <span class="collapsed-provider" style="color: ${providerColor}">${providerName}</span>
      <span class="collapsed-time">${timestamp}</span>
    </div>
  `;
  
  // Add click handler to expand
  collapsedHeader.addEventListener('click', () => {
    expandAIMessage(messageElement);
  });
  
  // Add collapsed header and class
  messageElement.insertBefore(collapsedHeader, messageElement.firstChild);
  messageElement.classList.add('ai-message-collapsed');
}

/**
 * Expand a collapsed AI message
 */
function expandAIMessage(messageElement: HTMLElement): void {
  if (!messageElement.classList.contains('ai-message-collapsed')) return;
  
  const collapsedHeader = messageElement.querySelector('.ai-message-collapsed-header');
  const contentDiv = messageElement.querySelector('.ai-message-content');
  const actionsDiv = messageElement.querySelector('.message-actions');
  
  // Remove collapsed header
  if (collapsedHeader) {
    collapsedHeader.remove();
  }
  
  // Remove collapsed class (CSS will show content and actions)
  messageElement.classList.remove('ai-message-collapsed');
  
  // Smooth scroll to this message
  messageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Create preview text from content
 */
function createPreviewText(text: string, maxLength: number): string {
  // Clean up the text
  let preview = text
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .replace(/```[\s\S]*?```/g, '[code]')  // Replace code blocks
    .replace(/`[^`]+`/g, '[code]')  // Replace inline code
    .trim();
  
  if (preview.length > maxLength) {
    preview = preview.substring(0, maxLength).trim() + '...';
  }
  
  return preview || 'AI Response';
}

/**
 * Toggle collapse state for an AI message
 */
export function toggleAIMessageCollapse(messageElement: HTMLElement): void {
  if (messageElement.classList.contains('ai-message-collapsed')) {
    expandAIMessage(messageElement);
  } else {
    collapseAIMessage(messageElement);
  }
}

/**
 * Expand all collapsed AI messages
 */
export function expandAllAIMessages(): void {
  const collapsedMessages = document.querySelectorAll('.ai-message-collapsed');
  collapsedMessages.forEach(msg => expandAIMessage(msg as HTMLElement));
  console.log(`📖 Expanded ${collapsedMessages.length} AI messages`);
}

/**
 * Collapse all AI messages except the last one
 */
export function collapseAllAIMessages(): void {
  // Ensure styles are injected
  injectCollapseStyles();
  
  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) return;
  
  const assistantMessages = chatContainer.querySelectorAll('.assistant-message');
  const lastIndex = assistantMessages.length - 1;
  
  assistantMessages.forEach((msg, index) => {
    if (index < lastIndex && !msg.classList.contains('ai-message-collapsed')) {
      collapseAIMessage(msg as HTMLElement);
    }
  });
}

// ============================================================================
// MESSAGE ADDING FUNCTIONS
// ============================================================================

// 🔧 NEW: Options interface for addMessageToChat
interface AddMessageOptions {
  shouldSave?: boolean;
  messageId?: string;
  providerName?: string;  // Provider name to display in footer
}

export function addMessageToChat(
  role: 'user' | 'assistant' | 'system', 
  content: string, 
  optionsOrShouldSave?: boolean | AddMessageOptions,  // 🔧 Backward compatible
  messageId?: string
): Promise<HTMLElement | null> {
  // 🔧 Parse options (backward compatible)
  let shouldSave = true;
  let msgId = messageId;
  let providerName: string | undefined;
  
  if (typeof optionsOrShouldSave === 'boolean') {
    shouldSave = optionsOrShouldSave;
  } else if (optionsOrShouldSave && typeof optionsOrShouldSave === 'object') {
    shouldSave = optionsOrShouldSave.shouldSave ?? true;
    msgId = optionsOrShouldSave.messageId || messageId;
    providerName = optionsOrShouldSave.providerName;
  }

  return new Promise((resolve) => {
    const chatContainer = document.querySelector('.ai-chat-container');
    if (!chatContainer) {
      console.warn('Chat container not found');
      resolve(null);
      return;
    }

    msgId = msgId || generateId();
    
    // Check if content is already HTML (for system messages with special formatting)
    const isHtmlContent = content.includes('suggested-actions-container') || 
                         content.includes('class="') ||
                         (role === 'system' && content.includes('<'));

    // Handle system messages
    if (role === 'system') {
      const systemMessage = document.createElement('div');
      systemMessage.className = 'system-message';
      systemMessage.setAttribute('data-message-id', msgId);
      
      if (isHtmlContent) {
        systemMessage.innerHTML = content;
      } else {
        systemMessage.textContent = content;
      }
      
      chatContainer.appendChild(systemMessage);
      
      // FIXED: Use RAF-based scroll instead of direct assignment
      scrollToBottomForced(chatContainer);
      
      if (shouldSave && getIsSavingEnabled()) {
        queueMessageForSaving('system', content, {
          isHtml: isHtmlContent
        });
      }
      
      resolve(systemMessage);
      return;
    }

    // NEW: Auto-collapse previous AI messages when adding new assistant message
    if (role === 'assistant' && !isConversationLoading && autoCollapseEnabled) {
      collapsePreviousAIMessages();
    }

    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `ai-message ${role}-message`;
    messageElement.setAttribute('data-message-id', msgId);

    // Add message content
    const messageContent = document.createElement('div');
    messageContent.className = 'ai-message-content';
    
    // 🎨 IDE TRANSFORMATION: Apply IDE-style formatting for assistant messages
    let ideContent = content;
    if (role === 'assistant') {
      try {
        ideContent = transformContentForIDE(content);
      } catch (e) {
        console.warn('[IDE Transform] Failed, using original:', e);
      }
    }
    
    // Process content with unified markdown processor
    const processedContent = processMessageContent(ideContent, msgId);
    
    // 🎨 IDE POST-PROCESSING: Add IDE-specific classes to HTML
    let finalContent = processedContent;
    if (role === 'assistant') {
      try {
        finalContent = postProcessHTML(processedContent);
      } catch (e) {
        console.warn('[IDE PostProcess] Failed:', e);
      }
    }
    
    messageContent.innerHTML = finalContent;

    messageElement.appendChild(messageContent);

    // Add action buttons based on role
    if (role === 'user') {
      const deleteBtn = createUserMessageDeleteButton(msgId);
      messageElement.appendChild(deleteBtn);
    } else {
      // 🔧 FIXED: Pass providerName override to createMessageActions
      const actionsContainer = createMessageActions(role, content, Date.now(), msgId, undefined, providerName);
      messageElement.appendChild(actionsContainer);
    }

    // FIXED: Skip animation during bulk load for performance
    if (isConversationLoading) {
      messageElement.style.opacity = '1';
      messageElement.style.transform = 'translateY(0)';
      chatContainer.appendChild(messageElement);
      
      // Setup code block handlers
      setupCodeBlockEventListeners(messageElement);
      
      // Check and apply collapse for user messages
      if (role === 'user') {
        setTimeout(() => checkAndApplyCollapse(messageElement, messageContent), 150);
      }
      
      // Save message if needed
      if (shouldSave && getIsSavingEnabled()) {
        queueMessageForSaving(role, content, {
          messageId: msgId,
          timestamp: Date.now()
        });
      }
      
      resolve(messageElement);
      return;
    }

    // Animate message appearance (only when not bulk loading)
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateY(20px)';
    
    chatContainer.appendChild(messageElement);
    
    // Trigger animation after append
    requestAnimationFrame(() => {
      messageElement.style.transition = 'all 0.3s ease-out';
      messageElement.style.opacity = '1';
      messageElement.style.transform = 'translateY(0)';
      
      // FIXED: Scroll AFTER animation frame starts
      scrollToBottomForced(chatContainer);
      
      // Setup code block handlers using unified processor
      setupCodeBlockEventListeners(messageElement);
      
      // Check and apply collapse for user messages
      if (role === 'user') {
        setTimeout(() => checkAndApplyCollapse(messageElement, messageContent), 150);
      }
      
      // Save message if needed
      if (shouldSave && getIsSavingEnabled()) {
        queueMessageForSaving(role, content, {
          messageId: msgId,
          timestamp: Date.now()
        });
      }
      
      // Resolve after animation completes
      setTimeout(() => resolve(messageElement), 300);
    });
  });
}

// ============================================================================
// EXPAND/COLLAPSE FOR USER MESSAGES >3 LINES
// ============================================================================

function checkAndApplyCollapse(messageElement: HTMLElement, contentDiv: HTMLElement): void {
  const lineHeight = parseFloat(getComputedStyle(contentDiv).lineHeight) || 20;
  const maxHeight = lineHeight * 3;
  const actualHeight = contentDiv.scrollHeight;
  
  if (actualHeight > maxHeight + 5) {
    contentDiv.classList.add('message-collapsed');
    contentDiv.style.maxHeight = `${maxHeight}px`;
    
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'message-expand-btn';
    toggleBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
      <span>Show more</span>
    `;
    
    toggleBtn.addEventListener('click', () => {
      const isCollapsed = contentDiv.classList.contains('message-collapsed');
      
      if (isCollapsed) {
        contentDiv.classList.remove('message-collapsed');
        contentDiv.style.maxHeight = 'none';
        toggleBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
          <span>Show less</span>
        `;
      } else {
        contentDiv.classList.add('message-collapsed');
        contentDiv.style.maxHeight = `${maxHeight}px`;
        toggleBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <span>Show more</span>
        `;
      }
    });
    
    messageElement.appendChild(toggleBtn);
  }
}

export function addSystemMessage(content: string): void {
  addMessageToChat('system', content, true);
}

// ============================================================================
// MESSAGE ACTION BUTTONS
// ============================================================================

export function createMessageActions(
  role: 'user' | 'assistant', 
  content: string, 
  timestamp?: number, 
  messageId?: string, 
  note?: MessageNote,
  providerNameOverride?: string  // 🔧 NEW: Override provider name
): HTMLElement {
  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'message-actions';
  actionsContainer.setAttribute('data-message-id', messageId || generateId());
  
  if (role === 'assistant') {
    // Create metadata container
    const metadataContainer = document.createElement('div');
    metadataContainer.className = 'message-meta-inline';
    
    // Add timestamp
    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = timestamp ? formatTime(new Date(timestamp)) : formatTime(new Date());
    
    // 🔧 FIXED: Check multiple sources for provider info
    let providerInfo;
    let providerSource = '';
    
    // Priority 1: Explicit override
    if (providerNameOverride) {
      providerInfo = getProviderInfo(providerNameOverride);
      providerSource = 'override';
    } 
    // Priority 2: Try to find message element and get data-provider attribute
    else if (messageId) {
      const msgElement = document.querySelector(`[data-message-id="${messageId}"]`);
      const dataProvider = msgElement?.getAttribute('data-provider');
      if (dataProvider) {
        providerInfo = getProviderInfo(dataProvider);
        providerSource = 'data-attr';
      }
    }
    // Priority 3: Fall back to current config (only for new messages)
    if (!providerInfo) {
      const config = getCurrentApiConfigurationForced();
      providerInfo = getProviderInfo(config.provider);
      providerSource = 'config';
    }
    
    console.log(`🏷️ [MessageUI] Provider: ${providerInfo.name} (source: ${providerSource})`);
    
    const separator = document.createElement('span');
    separator.className = 'provider-separator';
    separator.textContent = ' • ';
    
    const providerText = document.createElement('span');
    providerText.className = 'provider-text-minimal';
    providerText.textContent = providerInfo.name;
    providerText.style.color = providerInfo.color;
    
    metadataContainer.appendChild(time);
    metadataContainer.appendChild(separator);
    metadataContainer.appendChild(providerText);
    
    // Create action buttons container
    const actionButtonsContainer = document.createElement('div');
    actionButtonsContainer.className = 'message-action-buttons';
    actionButtonsContainer.style.display = 'flex';
    actionButtonsContainer.style.gap = '4px';
    actionButtonsContainer.style.alignItems = 'center';
    
    // HTML export button
    const htmlExportBtn = document.createElement('button');
    htmlExportBtn.className = 'message-action-btn html-export-btn';
    htmlExportBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    `;
    htmlExportBtn.title = 'View as HTML document';
    
    htmlExportBtn.addEventListener('click', () => {
      if (typeof (window as any).convertResponseToHTML === 'function') {
        (window as any).convertResponseToHTML(content);
      } else {
        console.error('convertResponseToHTML not available on window');
        showNotification('HTML viewer not ready. Please try again.', 'error');
      }
    });
    
    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'message-action-btn copy-btn';
    copyBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    `;
    copyBtn.title = 'Copy response';
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(content);
        showNotification('Copied to clipboard!', 'success');
        copyBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        `;
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          `;
        }, 2000);
      } catch (err) {
        showNotification('Failed to copy', 'error');
      }
    });
    
    // Create other action buttons
    const likeBtn = createLikeButton();
    const dislikeBtn = createDislikeButton(actionButtonsContainer);
    const noteBtn = createNoteButton(messageId, note);
    const deleteBtn = createDeleteButton(timestamp);
    
    // Add all buttons
    actionButtonsContainer.appendChild(htmlExportBtn);
    actionButtonsContainer.appendChild(copyBtn);
    actionButtonsContainer.appendChild(likeBtn);
    actionButtonsContainer.appendChild(dislikeBtn);
    actionButtonsContainer.appendChild(noteBtn);
    actionButtonsContainer.appendChild(deleteBtn);
    
    actionsContainer.appendChild(metadataContainer);
    actionsContainer.appendChild(actionButtonsContainer);
  }
  
  return actionsContainer;
}

function createLikeButton(): HTMLElement {
  const likeBtn = document.createElement('button');
  likeBtn.className = 'message-action-btn like-btn';
  likeBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
    </svg>
  `;
  likeBtn.title = 'Like this response';
  
  likeBtn.addEventListener('click', () => {
    const isLiked = likeBtn.classList.contains('liked');
    if (isLiked) {
      likeBtn.classList.remove('liked');
      likeBtn.style.color = '';
    } else {
      likeBtn.classList.add('liked');
      likeBtn.style.color = '#10b981';
      showNotification('Response liked!', 'success');
    }
  });
  
  return likeBtn;
}

function createDislikeButton(container: HTMLElement): HTMLElement {
  const dislikeBtn = document.createElement('button');
  dislikeBtn.className = 'message-action-btn dislike-btn';
  dislikeBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
    </svg>
  `;
  dislikeBtn.title = 'Dislike this response';
  
  dislikeBtn.addEventListener('click', () => {
    const isDisliked = dislikeBtn.classList.contains('disliked');
    if (isDisliked) {
      dislikeBtn.classList.remove('disliked');
      dislikeBtn.style.color = '';
    } else {
      dislikeBtn.classList.add('disliked');
      dislikeBtn.style.color = '#ef4444';
      showNotification('Feedback recorded', 'info');
    }
  });
  
  return dislikeBtn;
}

function createNoteButton(messageId?: string, existingNote?: MessageNote): HTMLElement {
  const noteBtn = document.createElement('button');
  noteBtn.className = 'message-action-btn note-btn';
  noteBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  `;
  noteBtn.title = existingNote ? 'Edit note' : 'Add note';
  
  if (messageId) {
    noteBtn.addEventListener('click', () => showNoteDialog(messageId, existingNote));
  }
  
  return noteBtn;
}

function createDeleteButton(timestamp?: number): HTMLElement {
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'message-action-btn delete-btn';
  deleteBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  `;
  deleteBtn.title = 'Delete this message';
  
  deleteBtn.addEventListener('click', async () => {
    if (confirm('Delete this message?')) {
      const messageElement = deleteBtn.closest('.ai-message');
      if (messageElement) {
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateX(-20px)';
        setTimeout(() => messageElement.remove(), 300);
      }
    }
  });
  
  return deleteBtn;
}

function createUserMessageDeleteButton(messageId: string): HTMLElement {
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'user-message-delete-btn';
  deleteBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  `;
  deleteBtn.title = 'Delete message';
  
  deleteBtn.addEventListener('click', async () => {
    if (confirm('Delete this message?')) {
      const messageElement = deleteBtn.closest('.ai-message');
      if (messageElement) {
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateX(-20px)';
        setTimeout(() => messageElement.remove(), 300);
      }
    }
  });
  
  return deleteBtn;
}

// ============================================================================
// MESSAGE CONTENT PROCESSING
// ============================================================================

export function processMessageContent(content: string, messageId: string): string {
  const processed = markdownProcessor.processMarkdown(content, messageId);
  return processed.html;
}

// ============================================================================
// CODE BLOCK EVENT LISTENERS
// ============================================================================

export function setupCodeBlockEventListeners(messageElement: HTMLElement): void {
  markdownProcessor.setupCodeBlockHandlers();
}

// ============================================================================
// MESSAGE METADATA CREATION
// ============================================================================

export function createMessageMetadata(role: 'user' | 'assistant'): HTMLElement {
  const metadata = document.createElement('span');
  metadata.className = 'message-meta';
  
  const time = document.createElement('span');
  time.className = 'message-time';
  time.textContent = formatTime(new Date());
  
  metadata.appendChild(time);
  
  if (role === 'assistant') {
    const config = getCurrentApiConfigurationForced();
    const providerInfo = getProviderInfo(config.provider);
    
    const separator = document.createElement('span');
    separator.className = 'provider-separator';
    separator.textContent = ' • ';
    
    const providerText = document.createElement('span');
    providerText.className = 'provider-text-minimal';
    providerText.textContent = providerInfo.name;
    providerText.style.color = providerInfo.color;
    
    metadata.appendChild(separator);
    metadata.appendChild(providerText);
  }
  
  return metadata;
}

// ============================================================================
// SUGGESTION HANDLERS
// ============================================================================

function setupSuggestionEventHandlers(element: HTMLElement): void {
  const suggestionButtons = element.querySelectorAll('.suggestion-item');
  suggestionButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const action = target.getAttribute('data-action');
      const prompt = target.getAttribute('data-prompt');
      
      if (action && prompt) {
        switch(action) {
          case 'analyze':
            handleAnalyzeSuggestion(prompt);
            break;
          case 'generate':
            handleGenerateSuggestion(prompt);
            break;
          case 'explain':
            handleExplainSuggestion(prompt);
            break;
          default:
            handleDefaultSuggestion(prompt);
        }
      }
    });
  });
}

function handleAnalyzeSuggestion(prompt: string): void {
  const editor = (window as any).monaco?.editor?.getEditors()?.[0];
  if (editor) {
    const code = editor.getValue();
    const fullPrompt = `${prompt}\n\nCode to analyze:\n\`\`\`\n${code}\n\`\`\``;
    sendSuggestionMessage(fullPrompt);
  } else {
    sendSuggestionMessage(prompt);
  }
}

function handleGenerateSuggestion(prompt: string): void {
  sendSuggestionMessage(prompt);
}

function handleExplainSuggestion(prompt: string): void {
  const editor = (window as any).monaco?.editor?.getEditors()?.[0];
  if (editor) {
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (model && selection && !selection.isEmpty()) {
      const selectedText = model.getValueInRange(selection);
      const fullPrompt = `${prompt}\n\nCode:\n\`\`\`\n${selectedText}\n\`\`\``;
      sendSuggestionMessage(fullPrompt);
    } else {
      sendSuggestionMessage(prompt);
    }
  } else {
    sendSuggestionMessage(prompt);
  }
}

function handleDefaultSuggestion(prompt: string): void {
  sendSuggestionMessage(prompt);
}

function sendSuggestionMessage(prompt: string): void {
  const messageInput = document.getElementById('ai-assistant-input') as HTMLTextAreaElement;
  if (messageInput) {
    messageInput.value = prompt;
    const sendBtn = document.querySelector('.ai-send-button') as HTMLButtonElement;
    if (sendBtn) {
      sendBtn.click();
    }
  }
}

// ============================================================================
// STREAM MESSAGE HANDLING
// ============================================================================

export function createStreamingMessage(): HTMLElement {
  const messageElement = document.createElement('div');
  messageElement.className = 'ai-message assistant-message streaming';
  messageElement.setAttribute('data-message-id', generateId());
  
  const messageContent = document.createElement('div');
  messageContent.className = 'ai-message-content';
  messageContent.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
  
  messageElement.appendChild(messageContent);
  
  const chatContainer = document.querySelector('.ai-chat-container');
  if (chatContainer) {
    // NEW: Collapse previous AI messages when streaming starts
    if (autoCollapseEnabled) {
      collapsePreviousAIMessages();
    }
    
    chatContainer.appendChild(messageElement);
    scrollToBottomForced(chatContainer);
  }
  
  return messageElement;
}

export function updateStreamingMessage(element: HTMLElement, content: string, isComplete: boolean = false): void {
  const contentDiv = element.querySelector('.ai-message-content');
  if (!contentDiv) return;
  
  const chatContainer = document.querySelector('.ai-chat-container');
  
  if (isComplete) {
    element.classList.remove('streaming');
    const msgId = element.getAttribute('data-message-id') || generateId();
    const processed = markdownProcessor.processMarkdown(content, msgId);
    contentDiv.innerHTML = processed.html;
    
    const actionsContainer = createMessageActions('assistant', content, Date.now(), msgId);
    element.appendChild(actionsContainer);
    
    markdownProcessor.setupCodeBlockHandlers();
    scrollToBottomForced(chatContainer);
  } else {
    contentDiv.innerHTML = content + '<span class="cursor-blink">▊</span>';
    scrollToBottomDebounced(chatContainer);
  }
}

// ============================================================================
// TYPE DECLARATIONS
// ============================================================================

declare global {
  interface Window {
    monaco?: {
      editor?: {
        getEditors?: () => any[];
      };
      Range?: new (
        startLineNumber: number,
        startColumn: number,
        endLineNumber: number,
        endColumn: number
      ) => any;
    };
    convertResponseToHTML?: (content: string) => Promise<void>;
    viewResponseAsHTML?: (content: string) => Promise<void>;
  }
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

/**
 * Force re-inject all message UI styles
 * Call this after conversation reset to ensure styles are present
 */
export function forceReinjectStyles(): void {
  collapseStylesInjected = false;
  const existingStyle = document.getElementById('ai-message-collapse-styles');
  if (existingStyle) {
    existingStyle.remove();
  }
  injectCollapseStyles();
  console.log('🎨 [MessageUI] Styles force re-injected');
}

// Expose to window for global access
(window as any).forceReinjectMessageStyles = forceReinjectStyles;
(window as any).injectMessageStyles = injectCollapseStyles;

export default {
  addMessageToChat,
  addSystemMessage,
  createMessageActions,
  processMessageContent,
  setupCodeBlockEventListeners,
  createMessageMetadata,
  createStreamingMessage,
  updateStreamingMessage,
  setConversationLoading,
  getConversationLoading,
  startAIProcessingScroll,
  stopAIProcessingScroll,
  // NEW: Auto-collapse exports
  setAutoCollapseEnabled,
  getAutoCollapseEnabled,
  toggleAIMessageCollapse,
  expandAllAIMessages,
  collapseAllAIMessages,
  // NEW: Manual style injection (for debugging)
  injectCollapseStyles,
  forceReinjectStyles
};

// Export the style injection function for manual use
export { injectCollapseStyles };

// 🎨 AUTO-INJECT COMPACT STYLES ON MODULE LOAD
// This ensures styles are applied before any messages are rendered
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectCollapseStyles();
      console.log('🎨 Compact chat styles auto-injected (DOMContentLoaded)');
    });
  } else {
    // DOM already loaded
    injectCollapseStyles();
    console.log('🎨 Compact chat styles auto-injected (immediate)');
  }
  
  // ✅ NEW: Listen for conversation reset events to re-inject styles
  document.addEventListener('conversation-loaded', () => {
    setTimeout(() => {
      injectCollapseStyles();
      console.log('🎨 [MessageUI] Styles re-injected after conversation load');
    }, 100);
  });
  
  document.addEventListener('conversation-reset', () => {
    setTimeout(() => {
      forceReinjectStyles();
    }, 100);
  });
}
