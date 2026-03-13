// conversationRenderCoordinator.ts
// ============================================================================
// SINGLE RENDER COORDINATOR - Eliminates all race conditions
// ============================================================================
//
// PURPOSE: Replace the 5+ competing render paths with ONE coordinated entry.
//
// BEFORE (race condition):
//   0ms:    renderCurrentConversation()     → ui.ts basic renderer
//   0ms:    initializeConversationModule()  → triggers yet another load
//   1000ms: autoRenderSavedConversation()   → main.ts custom renderer
//   2000ms: autoRenderSavedConversation()   → main.ts retry
//   3000ms: autoRenderSavedConversation()   → main.ts retry
//   ???ms:  COMPREHENSIVE_CONVERSATION_FIX  → yet another renderer
//
// AFTER (coordinated):
//   Single call → coordinatedRender() → addMessageToChat() for each message
//
// ============================================================================

import { conversationManager } from './conversationManager';
import { addMessageToChat, setConversationLoading } from './messageUI';

// ============================================================================
// STATE
// ============================================================================

let __renderLock = false;
let __renderComplete = false;
let __renderAttempts = 0;
const MAX_RENDER_ATTEMPTS = 5;

// v7: Deferred rendering — only render recent messages, store older ones for lazy load
const INITIAL_RENDER_COUNT = 8; // Render last 8 messages on startup (enough for viewport)

// ============================================================================
// DEFERRED MESSAGE STORAGE (consumed by chatPagination.ts showMore)
// ============================================================================

export interface DeferredMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  messageId?: string;
  providerName?: string;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * The ONLY function that should render saved conversations after init.
 * All other render paths should be removed or redirected here.
 * 
 * v7: Only renders the last INITIAL_RENDER_COUNT messages.
 * Older messages are stored in window.__deferredMessages for lazy rendering
 * by chatPagination.ts when user scrolls up.
 */
export async function coordinatedRender(): Promise<boolean> {
  // Already rendered successfully
  if (__renderComplete) {
    console.log('✅ [RenderCoord] Already rendered - skipping');
    return true;
  }

  // Another render is in progress
  if (__renderLock) {
    console.log('⏳ [RenderCoord] Render in progress - skipping');
    return false;
  }

  __renderAttempts++;
  if (__renderAttempts > MAX_RENDER_ATTEMPTS) {
    console.warn('⚠️ [RenderCoord] Max attempts reached');
    return false;
  }

  __renderLock = true;
  console.log(`🔄 [RenderCoord] Attempt ${__renderAttempts}/${MAX_RENDER_ATTEMPTS}...`);

  try {
    const cm = conversationManager;
    if (!cm) {
      console.warn('[RenderCoord] conversationManager not available');
      return false;
    }

    const current = cm.getCurrentConversation?.();
    if (!current?.messages?.length) {
      console.log('[RenderCoord] No messages to render');
      __renderComplete = true;
      return true;
    }

    const container = document.querySelector('.ai-chat-container');
    if (!container) {
      console.warn('[RenderCoord] Chat container not found');
      return false;
    }

    // Already rendered by another path (e.g. conversationUI dedup)
    const existingMessages = container.querySelectorAll('.ai-message');
    if (existingMessages.length >= current.messages.length) {
      console.log('[RenderCoord] Messages already rendered, marking complete');
      __renderComplete = true;
      (window as any).__conversationRendered = true;
      return true;
    }

    // ================================================================
    // v7: DEFERRED RENDER — only render recent, store older for lazy load
    // ================================================================
    
    // Deduplicate first
    const dedupedMessages = deduplicateMessages(current.messages);
    if (dedupedMessages.length < current.messages.length) {
      console.log(`🔧 [RenderCoord] Removed ${current.messages.length - dedupedMessages.length} duplicate(s)`);
    }

    // Filter out empty/corrupted messages
    const validMessages = dedupedMessages.filter(msg => {
      const contentStr = typeof msg.content === 'string' ? msg.content : String(msg.content || '');
      if (!contentStr.trim() && msg.role !== 'system') return false;
      if (contentStr.includes('[object Promise]')) {
        console.warn(`🔧 [RenderCoord] Skipping corrupted: "${contentStr.substring(0, 50)}..."`);
        return false;
      }
      return true;
    });

    // Split: deferred (older) vs recent (to render now)
    const splitIndex = Math.max(0, validMessages.length - INITIAL_RENDER_COUNT);
    const deferredMessages = validMessages.slice(0, splitIndex);
    const recentMessages = validMessages.slice(splitIndex);

    // Store deferred messages for chatPagination.ts to render on-demand
    const deferredData: DeferredMessage[] = deferredMessages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : String(msg.content || ''),
      messageId: msg.id,
      providerName: msg.metadata?.provider || ''
    }));
    (window as any).__deferredMessages = deferredData;

    console.log(`🎯 [RenderCoord] Rendering ${recentMessages.length} recent messages (${deferredMessages.length} deferred for lazy load)`);

    setConversationLoading(true);
    container.innerHTML = '';

    // Only render recent messages — this is where the speed comes from!
    for (const msg of recentMessages) {
      const contentStr = typeof msg.content === 'string' ? msg.content : String(msg.content || '');

      await addMessageToChat(msg.role, contentStr, {
        shouldSave: false,
        messageId: msg.id,
        providerName: msg.metadata?.provider || ''
      });
    }

    // Scroll to bottom after render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
        setConversationLoading(false);
      });
    });

    __renderComplete = true;
    (window as any).__conversationRendered = true;

    console.log(`✅ [RenderCoord] Rendered ${recentMessages.length} messages (${deferredData.length} deferred)`);

    // Notify other modules
    document.dispatchEvent(new CustomEvent('conversation-loaded', {
      detail: { conversationId: current.id }
    }));

    return true;

  } catch (error) {
    console.error('❌ [RenderCoord] Render failed:', error);
    return false;
  } finally {
    __renderLock = false;
  }
}

/**
 * Reset state — call when switching conversations
 */
export function resetRenderState(): void {
  __renderLock = false;
  __renderComplete = false;
  __renderAttempts = 0;
  (window as any).__conversationRendered = false;
  (window as any).__deferredMessages = []; // v7: Clear deferred messages
  console.log('🔄 [RenderCoord] State reset (deferred messages cleared)');
}

/**
 * Check if initial render is complete
 */
export function isRenderComplete(): boolean {
  return __renderComplete;
}

// ============================================================================
// DEDUPLICATION
// ============================================================================

function deduplicateMessages(messages: any[]): any[] {
  const seen = new Set<string>();
  const result: any[] = [];

  for (const msg of messages) {
    const contentStr = typeof msg.content === 'string' ? msg.content : '';
    const contentPreview = contentStr.substring(0, 200).trim();
    const timeKey = msg.timestamp ? Math.floor(msg.timestamp / 5000) : 0;
    const fingerprint = `${msg.role}|${contentPreview}|${timeKey}`;

    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    result.push(msg);
  }

  return result;
}

// ============================================================================
// DATA CLEANUP — run once on startup to fix corrupted stored data
// ============================================================================

/**
 * Clean up corrupted data in all conversations:
 * - Remove [object Promise] from message content
 * - Remove duplicate messages
 * - Remove empty messages
 */
export function cleanupConversationData(): number {
  const cm = conversationManager;
  if (!cm) return 0;

  let fixCount = 0;
  const allConversations = cm.getAllConversations?.() || [];

  for (const conv of allConversations) {
    if (!Array.isArray(conv.messages)) continue;

    // Fix [object Promise]
    for (const msg of conv.messages) {
      if (typeof msg.content === 'string' && msg.content.includes('[object Promise]')) {
        msg.content = msg.content.replace(/\[object Promise\]/g, '');
        msg.content = msg.content.replace(/^\s*\n\n---\n/, '');
        fixCount++;
        console.log(`🔧 [Cleanup] Fixed [object Promise] in: ${msg.id}`);
      }
    }

    // Deduplicate
    const deduped = deduplicateMessages(conv.messages);
    if (deduped.length < conv.messages.length) {
      fixCount += conv.messages.length - deduped.length;
      conv.messages = deduped;
    }

    // Remove empties
    const before = conv.messages.length;
    conv.messages = conv.messages.filter((msg: any) => {
      const content = typeof msg.content === 'string' ? msg.content.trim() : '';
      return content.length > 0 || msg.role === 'system';
    });
    fixCount += before - conv.messages.length;
  }

  if (fixCount > 0) {
    console.log(`🔧 [Cleanup] Applied ${fixCount} fixes, saving...`);
    cm.saveConversations?.();
  } else {
    console.log('✅ [Cleanup] No issues found');
  }

  return fixCount;
}

// ============================================================================
// v7: DEFERRED BATCH RENDERER — called by chatPagination.ts showMore()
// ============================================================================

/**
 * Render a batch of deferred messages into the chat container.
 * Messages are popped from the END of __deferredMessages (newest-deferred first,
 * which are the ones closest to the already-rendered messages).
 * 
 * @param count Number of messages to render
 * @param insertBeforeEl Optional: insert rendered messages before this element
 * @returns Array of rendered HTMLElements
 */
async function renderDeferredBatch(
  count: number, 
  insertBeforeEl?: Element | null
): Promise<HTMLElement[]> {
  const deferred: DeferredMessage[] = (window as any).__deferredMessages || [];
  if (deferred.length === 0) return [];

  const container = document.querySelector('.ai-chat-container');
  if (!container) return [];

  // Pop from the end (newest deferred = closest to visible messages)
  const batch = deferred.splice(-count, count);
  
  console.log(`🔄 [RenderCoord] Rendering ${batch.length} deferred messages (${deferred.length} remaining)`);

  // Set conversation loading to skip animations in addMessageToChat
  setConversationLoading(true);

  const rendered: HTMLElement[] = [];

  for (const msg of batch) {
    const el = await addMessageToChat(msg.role, msg.content, {
      shouldSave: false,
      messageId: msg.messageId,
      providerName: msg.providerName
    });

    if (el) {
      // addMessageToChat appends to bottom — move to correct position
      if (insertBeforeEl && insertBeforeEl.parentNode === container) {
        container.insertBefore(el, insertBeforeEl);
      }
      rendered.push(el);
    }
  }

  setConversationLoading(false);

  console.log(`✅ [RenderCoord] Rendered ${rendered.length} deferred. ${deferred.length} still deferred.`);
  return rendered;
}

/**
 * Get count of deferred (not yet rendered) messages
 */
function getDeferredCount(): number {
  return ((window as any).__deferredMessages || []).length;
}

// ============================================================================
// AUTO-INIT
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).__renderCoordinator = {
    render: coordinatedRender,
    reset: resetRenderState,
    isComplete: isRenderComplete,
    cleanup: cleanupConversationData,
    renderDeferredBatch,  // v7: For chatPagination.ts lazy loading
    getDeferredCount,     // v7: For chatPagination.ts load-more bar count
    getState: () => ({
      renderLock: __renderLock,
      renderComplete: __renderComplete,
      renderAttempts: __renderAttempts,
      deferredCount: getDeferredCount()
    })
  };

  // Run cleanup once after load
  setTimeout(() => cleanupConversationData(), 1000);
}

export default {
  coordinatedRender,
  resetRenderState,
  isRenderComplete,
  cleanupConversationData
};
