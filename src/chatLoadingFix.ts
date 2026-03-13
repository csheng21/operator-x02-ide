// ============================================================================
// chatLoadingFix.ts - Fix for Stuck Chat Loading Skeleton
// ============================================================================
//
// PROBLEM: After reset, chat panel sometimes shows gray loading bars that
//          never get replaced with actual content.
//
// SOLUTION: 
// 1. Detect stuck skeleton/loading placeholders
// 2. Remove them after a timeout
// 3. Force re-render conversation
// 4. Show welcome message if no conversation exists
//
// USAGE: Import in main.ts:
//   import './chatLoadingFix';
// ============================================================================

console.log('🔧 [ChatLoadingFix] Loading...');

// ============================================================================
// CONFIGURATION
// ============================================================================

const SKELETON_TIMEOUT = 3000;      // Remove skeleton after 3 seconds
const CHECK_INTERVAL = 1000;        // Check every 1 second
const MAX_CHECKS = 10;              // Maximum 10 checks (10 seconds)

// ============================================================================
// DETECT STUCK LOADING STATE
// ============================================================================

function isLoadingStuck(): boolean {
  const chatContainer = document.querySelector('.ai-chat-container, .chat-messages, .messages-container');
  if (!chatContainer) return false;
  
  // Check for skeleton/loading placeholders
  const skeletonSelectors = [
    '.skeleton',
    '.loading-skeleton',
    '.message-skeleton',
    '.loading-placeholder',
    '.shimmer',
    '[class*="skeleton"]',
    '[class*="loading"]',
    '[class*="placeholder"]'
  ];
  
  for (const selector of skeletonSelectors) {
    const elements = chatContainer.querySelectorAll(selector);
    if (elements.length > 0) {
      return true;
    }
  }
  
  // Check for gray bars pattern (common skeleton UI)
  const children = chatContainer.children;
  let grayBarCount = 0;
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i] as HTMLElement;
    const style = getComputedStyle(child);
    const bg = style.backgroundColor;
    
    // Check if it's a gray/dark placeholder bar
    if (bg.includes('rgb(60') || bg.includes('rgb(50') || bg.includes('rgb(45') ||
        bg.includes('#3c3c3c') || bg.includes('#2d2d2d') || bg.includes('#333')) {
      if (child.textContent?.trim() === '' || !child.textContent) {
        grayBarCount++;
      }
    }
  }
  
  // If more than 3 empty gray bars, likely stuck
  return grayBarCount > 3;
}

// ============================================================================
// REMOVE SKELETON LOADING
// ============================================================================

function removeSkeletonLoading(): void {
  const chatContainer = document.querySelector('.ai-chat-container, .chat-messages, .messages-container');
  if (!chatContainer) return;
  
  // Remove skeleton elements
  const skeletonSelectors = [
    '.skeleton',
    '.loading-skeleton',
    '.message-skeleton',
    '.loading-placeholder',
    '.shimmer',
    '[class*="skeleton"]'
  ];
  
  let removed = 0;
  skeletonSelectors.forEach(selector => {
    chatContainer.querySelectorAll(selector).forEach(el => {
      el.remove();
      removed++;
    });
  });
  
  // Remove empty placeholder divs
  Array.from(chatContainer.children).forEach(child => {
    const el = child as HTMLElement;
    if (el.textContent?.trim() === '' && 
        !el.querySelector('input, textarea, button, svg') &&
        !el.classList.contains('welcome-screen') &&
        !el.classList.contains('chat-input')) {
      el.remove();
      removed++;
    }
  });
  
  if (removed > 0) {
    console.log(`🗑️ [ChatLoadingFix] Removed ${removed} skeleton elements`);
  }
}

// ============================================================================
// FORCE RENDER CONVERSATION
// ============================================================================

function forceRenderConversation(): void {
  console.log('🔄 [ChatLoadingFix] Force rendering conversation...');
  
  try {
    // Try multiple render methods
    const cm = (window as any).conversationManager;
    
    if (cm) {
      const current = cm.getCurrentConversation?.();
      
      if (current?.messages?.length > 0) {
        // Has messages - trigger render
        if (typeof (window as any).renderCurrentConversation === 'function') {
          (window as any).renderCurrentConversation();
          console.log('✅ [ChatLoadingFix] Rendered via renderCurrentConversation()');
          return;
        }
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('conversation-loaded', {
          detail: { conversation: current }
        }));
        console.log('✅ [ChatLoadingFix] Dispatched conversation-loaded event');
        return;
      }
    }
    
    // No messages - show welcome screen
    showWelcomeScreen();
    
  } catch (error) {
    console.error('❌ [ChatLoadingFix] Error rendering:', error);
    showWelcomeScreen();
  }
}

// ============================================================================
// SHOW WELCOME SCREEN
// ============================================================================

function showWelcomeScreen(): void {
  const chatContainer = document.querySelector('.ai-chat-container, .chat-messages, .messages-container');
  if (!chatContainer) return;
  
  // Check if welcome screen already exists
  if (chatContainer.querySelector('.welcome-screen, .ai-welcome')) {
    return;
  }
  
  // Check if there are actual messages
  if (chatContainer.querySelector('.ai-message, .user-message, .assistant-message')) {
    return;
  }
  
  console.log('👋 [ChatLoadingFix] Showing welcome screen');
  
  chatContainer.innerHTML = `
    <div class="welcome-screen" style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 40px;
      text-align: center;
      color: #888;
    ">
      <div style="font-size: 48px; margin-bottom: 20px;">✨</div>
      <h2 style="color: #fff; font-size: 20px; font-weight: 500; margin-bottom: 8px;">
        AI Code IDE - Operator X02
      </h2>
      <p style="color: #6b7280; font-size: 14px; max-width: 400px; line-height: 1.6;">
        Ask me anything about your code, or let me help you build something new.
      </p>
    </div>
  `;
}

// ============================================================================
// MAIN FIX LOGIC
// ============================================================================

let checkCount = 0;
let checkInterval: number | null = null;

function startLoadingCheck(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
  }
  
  checkCount = 0;
  
  checkInterval = window.setInterval(() => {
    checkCount++;
    
    if (isLoadingStuck()) {
      console.log(`⚠️ [ChatLoadingFix] Stuck loading detected (check ${checkCount})`);
      
      if (checkCount >= 3) {
        // Stuck for 3+ seconds - fix it
        console.log('🔧 [ChatLoadingFix] Fixing stuck loading...');
        removeSkeletonLoading();
        forceRenderConversation();
        
        if (checkInterval) {
          clearInterval(checkInterval);
          checkInterval = null;
        }
      }
    } else {
      // Not stuck anymore
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
    }
    
    if (checkCount >= MAX_CHECKS) {
      console.log('✅ [ChatLoadingFix] Max checks reached, stopping');
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
    }
  }, CHECK_INTERVAL);
}

// ============================================================================
// QUICK FIX FUNCTION (can be called manually)
// ============================================================================

function fixStuckChat(): void {
  console.log('🔧 [ChatLoadingFix] Manual fix triggered');
  removeSkeletonLoading();
  forceRenderConversation();
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init(): void {
  console.log('🚀 [ChatLoadingFix] Initializing...');
  
  // Start checking after page load
  setTimeout(startLoadingCheck, 1000);
  
  // Also check after conversation events
  document.addEventListener('conversation-switched', () => {
    setTimeout(startLoadingCheck, 500);
  });
  
  // Expose fix function globally
  (window as any).fixStuckChat = fixStuckChat;
  (window as any).removeSkeletonLoading = removeSkeletonLoading;
  (window as any).forceRenderConversation = forceRenderConversation;
  
  console.log('✅ [ChatLoadingFix] Ready! Use fixStuckChat() if chat is stuck.');
}

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { fixStuckChat, removeSkeletonLoading, forceRenderConversation };
