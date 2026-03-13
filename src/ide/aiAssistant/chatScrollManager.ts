// chatScrollManager.ts - Professional Chat Scroll Manager for Operator X02 IDE
// ============================================================================
// LOCATION: src/ide/aiAssistant/chatScrollManager.ts
// ============================================================================
// FEATURES:
// 1. ✅ User scroll detection - doesn't interrupt reading history
// 2. ✅ Smart auto-scroll during streaming
// 3. ✅ "Scroll to Bottom" floating button
// 4. ✅ Smooth scroll animations
// 5. ✅ Message highlight on scroll-to
// 6. ✅ Centralized scroll control (replaces all scattered scrollTop calls)
// 7. ✅ Anti-jump protection - prevents scroll reset during DOM updates
// ============================================================================

console.log('📜 [ChatScrollManager] Loading...');

// ============================================================================
// TYPES
// ============================================================================

interface ScrollManagerConfig {
  containerSelector: string;
  autoScrollThreshold?: number;      // pixels from bottom to consider "at bottom"
  streamingScrollInterval?: number;  // ms between scroll updates during streaming
  userIdleTimeout?: number;          // ms before resuming auto-scroll after user stops
  enableScrollButton?: boolean;      // show floating "scroll to bottom" button
  enableSmoothScroll?: boolean;      // use smooth scrolling
  debugMode?: boolean;               // log scroll events
}

interface ScrollState {
  isUserScrolling: boolean;
  isStreaming: boolean;
  lastScrollTop: number;
  streamingIntervalId: number | null;
  userIdleTimeoutId: number | null;
  wasAtBottom: boolean;              // Track if user was at bottom before DOM changes
  scrollLocked: boolean;             // Prevent scroll during DOM updates
  pendingScrollRAF: number | null;   // requestAnimationFrame ID for debouncing
}

// ============================================================================
// CHAT SCROLL MANAGER CLASS
// ============================================================================

export class ChatScrollManager {
  private container: HTMLElement | null = null;
  private config: Required<ScrollManagerConfig>;
  private state: ScrollState;
  private scrollButton: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  
  // Default configuration
  private static readonly DEFAULT_CONFIG: Required<ScrollManagerConfig> = {
    containerSelector: '.ai-chat-container',
    autoScrollThreshold: 150,
    streamingScrollInterval: 100,
    userIdleTimeout: 3000,
    enableScrollButton: true,
    enableSmoothScroll: true,
    debugMode: false
  };

  constructor(config: ScrollManagerConfig) {
    this.config = { ...ChatScrollManager.DEFAULT_CONFIG, ...config };
    this.state = {
      isUserScrolling: false,
      isStreaming: false,
      lastScrollTop: 0,
      streamingIntervalId: null,
      userIdleTimeoutId: null,
      wasAtBottom: true,
      scrollLocked: false,
      pendingScrollRAF: null
    };
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  public init(): boolean {
    this.container = document.querySelector(this.config.containerSelector);
    
    if (!this.container) {
      console.warn(`[ChatScrollManager] Container not found: ${this.config.containerSelector}`);
      // Retry after DOM is ready
      setTimeout(() => this.init(), 500);
      return false;
    }

    this.setupScrollListener();
    this.setupWheelListener();
    this.setupTouchListener();
    this.setupResizeObserver();
    this.setupMutationObserver();
    
    if (this.config.enableScrollButton) {
      this.createScrollButton();
    }

    this.injectStyles();
    
    // Initialize state
    this.state.wasAtBottom = this.isNearBottom();
    this.state.lastScrollTop = this.container.scrollTop;
    
    this.log('✅ Initialized');
    return true;
  }

  public destroy(): void {
    this.stopStreaming();
    this.clearUserIdleTimeout();
    this.cancelPendingScroll();
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.scrollButton?.remove();
    this.log('🛑 Destroyed');
  }

  // ============================================================================
  // SCROLL LISTENERS
  // ============================================================================

  private setupScrollListener(): void {
    if (!this.container) return;

    this.container.addEventListener('scroll', () => {
      if (this.state.scrollLocked) return;
      
      const { scrollTop, scrollHeight, clientHeight } = this.container!;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // User scrolled UP = they want to read history
      if (scrollTop < this.state.lastScrollTop && distanceFromBottom > this.config.autoScrollThreshold) {
        this.state.isUserScrolling = true;
        this.log(`📖 User scrolling up (distance: ${Math.round(distanceFromBottom)}px)`);
      }

      // User scrolled back to bottom = resume auto-scroll
      if (distanceFromBottom <= this.config.autoScrollThreshold) {
        this.state.isUserScrolling = false;
        this.state.wasAtBottom = true;
      } else {
        this.state.wasAtBottom = false;
      }

      this.state.lastScrollTop = scrollTop;
      this.updateScrollButton();
    }, { passive: true });
  }

  private setupWheelListener(): void {
    if (!this.container) return;

    this.container.addEventListener('wheel', (e) => {
      // Only mark as user scrolling if scrolling up
      if (e.deltaY < 0) {
        this.handleUserInteraction();
      }
    }, { passive: true });
  }

  private setupTouchListener(): void {
    if (!this.container) return;

    let touchStartY = 0;

    this.container.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    this.container.addEventListener('touchmove', (e) => {
      const touchY = e.touches[0].clientY;
      // Scrolling up (finger moving down)
      if (touchY > touchStartY) {
        this.handleUserInteraction();
      }
    }, { passive: true });
  }

  // ============================================================================
  // RESIZE & MUTATION OBSERVERS
  // ============================================================================

  private setupResizeObserver(): void {
    if (!this.container) return;

    this.resizeObserver = new ResizeObserver(() => {
      // Auto-scroll on resize if user was at bottom
      if (this.state.wasAtBottom && !this.state.isUserScrolling) {
        this.scrollToBottomInstant();
      }
    });

    this.resizeObserver.observe(this.container);
  }

  private setupMutationObserver(): void {
    if (!this.container) return;

    this.mutationObserver = new MutationObserver((mutations) => {
      // Check if new content was added (not just attribute changes)
      const hasNewContent = mutations.some(m => 
        m.addedNodes.length > 0 && 
        Array.from(m.addedNodes).some(n => n.nodeType === Node.ELEMENT_NODE)
      );
      
      if (hasNewContent && this.state.wasAtBottom && !this.state.isUserScrolling && !this.state.isStreaming) {
        // New message added, scroll to bottom using RAF to batch operations
        this.scheduleScrollToBottom();
      }
    });

    this.mutationObserver.observe(this.container, {
      childList: true,
      subtree: false  // Only watch direct children to avoid excessive triggers
    });
  }

  // ============================================================================
  // USER INTERACTION HANDLING
  // ============================================================================

  private handleUserInteraction(): void {
    this.state.isUserScrolling = true;
    this.state.wasAtBottom = false;
    this.clearUserIdleTimeout();

    // Resume auto-scroll after idle timeout IF near bottom
    this.state.userIdleTimeoutId = window.setTimeout(() => {
      if (this.isNearBottom()) {
        this.state.isUserScrolling = false;
        this.state.wasAtBottom = true;
        this.log('⏰ User idle, resuming auto-scroll');
      }
    }, this.config.userIdleTimeout);

    this.updateScrollButton();
  }

  private clearUserIdleTimeout(): void {
    if (this.state.userIdleTimeoutId) {
      clearTimeout(this.state.userIdleTimeoutId);
      this.state.userIdleTimeoutId = null;
    }
  }

  // ============================================================================
  // SCROLL DEBOUNCING (Anti-Jump Protection)
  // ============================================================================

  private cancelPendingScroll(): void {
    if (this.state.pendingScrollRAF) {
      cancelAnimationFrame(this.state.pendingScrollRAF);
      this.state.pendingScrollRAF = null;
    }
  }

  private scheduleScrollToBottom(): void {
    // Cancel any pending scroll to debounce rapid calls
    this.cancelPendingScroll();
    
    this.state.pendingScrollRAF = requestAnimationFrame(() => {
      this.state.pendingScrollRAF = null;
      this.scrollToBottomInstant();
    });
  }

  // ============================================================================
  // SCROLL LOCK (Prevents scroll during DOM updates)
  // ============================================================================

  /**
   * Lock scroll position during DOM updates to prevent jumps
   */
  public lockScroll(): void {
    if (!this.container) return;
    this.state.scrollLocked = true;
    this.state.wasAtBottom = this.isNearBottom();
    this.log('🔒 Scroll locked');
  }

  /**
   * Unlock scroll and restore position if needed
   */
  public unlockScroll(): void {
    this.state.scrollLocked = false;
    
    // If user was at bottom before lock, scroll to bottom now
    if (this.state.wasAtBottom && !this.state.isUserScrolling) {
      this.scrollToBottomInstant();
    }
    
    this.log('🔓 Scroll unlocked');
  }

  // ============================================================================
  // SCROLL METHODS (PUBLIC API)
  // ============================================================================

  /**
   * Check if scroll is near bottom
   */
  public isNearBottom(): boolean {
    if (!this.container) return true;
    const { scrollTop, scrollHeight, clientHeight } = this.container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= this.config.autoScrollThreshold;
  }

  /**
   * Scroll to bottom with smooth animation (respects user scrolling)
   */
  public scrollToBottom(): void {
    if (this.state.isUserScrolling) {
      this.log('⏸️ Skipping scroll - user is reading');
      return;
    }

    if (!this.container) return;

    const maxScroll = this.container.scrollHeight - this.container.clientHeight;
    const currentScroll = this.container.scrollTop;
    const distanceFromBottom = maxScroll - currentScroll;
    
    // ✅ KEY FIX: If already at bottom (within threshold), just snap instantly
    // This prevents the "scroll up then down" visual jump
    if (distanceFromBottom < this.config.autoScrollThreshold) {
      this.container.scrollTop = maxScroll;
      this.state.wasAtBottom = true;
      return;
    }
    
    // Smooth scroll if far from bottom
    this.container.scrollTo({
      top: maxScroll,
      behavior: this.config.enableSmoothScroll ? 'smooth' : 'instant'
    });
    
    this.state.wasAtBottom = true;
    this.log('⬇️ Scrolled to bottom');
  }

  /**
   * Instant scroll to bottom (no animation, for streaming)
   */
  public scrollToBottomInstant(): void {
    if (this.state.isUserScrolling) return;
    if (!this.container) return;

    const maxScroll = this.container.scrollHeight - this.container.clientHeight;
    
    // ✅ Only scroll if not already at bottom (prevents unnecessary reflow)
    if (Math.abs(this.container.scrollTop - maxScroll) > 5) {
      this.container.scrollTop = maxScroll;
    }
    
    this.state.wasAtBottom = true;
  }

  /**
   * Force scroll to bottom (ignores user scrolling state)
   * Use when user sends a new message or clicks scroll button
   */
  public forceScrollToBottom(): void {
    if (!this.container) return;

    const maxScroll = this.container.scrollHeight - this.container.clientHeight;
    const currentScroll = this.container.scrollTop;
    const distanceFromBottom = maxScroll - currentScroll;

    this.state.isUserScrolling = false;
    this.state.wasAtBottom = true;
    
    // ✅ KEY FIX: If already at or very near bottom, just snap instantly
    // No animation = no visible jump
    if (distanceFromBottom < 80) {
      this.container.scrollTop = maxScroll;
      this.updateScrollButton();
      this.log('⬇️ Already near bottom, snapped instantly');
      return;
    }
    
    // If far from bottom (user was reading history), do smooth animated scroll
    this.container.scrollTo({
      top: maxScroll,
      behavior: 'smooth'
    });
    
    // Verify after animation completes
    setTimeout(() => {
      if (!this.container) return;
      const finalMax = this.container.scrollHeight - this.container.clientHeight;
      if (this.container.scrollTop < finalMax - 5) {
        this.container.scrollTop = finalMax;
      }
      this.updateScrollButton();
    }, 350);
    
    this.log('⬇️ Force scrolled to bottom (animated)');
    this.updateScrollButton();
  }

  /**
   * Scroll to a specific message element
   */
  public scrollToMessage(messageId: string, highlight = true): void {
    if (!this.container) return;

    const message = this.container.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement;
    if (!message) {
      this.log(`❌ Message not found: ${messageId}`);
      return;
    }

    // Temporarily disable user scrolling detection
    this.state.isUserScrolling = false;

    message.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });

    if (highlight) {
      message.classList.add('csm-highlight-flash');
      setTimeout(() => message.classList.remove('csm-highlight-flash'), 2000);
    }

    this.log(`📍 Scrolled to message: ${messageId}`);
  }

  // ============================================================================
  // STREAMING MODE
  // ============================================================================

  /**
   * Start streaming mode - auto-scroll during AI response
   */
  public startStreaming(): void {
    if (this.state.isStreaming) return;
    
    this.state.isStreaming = true;
    this.state.isUserScrolling = false;
    this.state.wasAtBottom = true;
    
    this.log('🌊 Streaming mode started');
    
    // Periodic scroll during streaming (if not user scrolling)
    this.state.streamingIntervalId = window.setInterval(() => {
      if (!this.state.isUserScrolling) {
        this.scrollToBottomInstant();
      }
    }, this.config.streamingScrollInterval);
  }

  /**
   * Stop streaming mode
   */
  public stopStreaming(): void {
    if (!this.state.isStreaming) return;

    this.state.isStreaming = false;
    
    if (this.state.streamingIntervalId) {
      clearInterval(this.state.streamingIntervalId);
      this.state.streamingIntervalId = null;
    }

    // Final scroll to bottom
    if (!this.state.isUserScrolling) {
      this.scrollToBottomInstant();
    }
    
    this.log('🏁 Streaming mode stopped');
  }

  /**
   * Manual scroll during streaming (call on each chunk if not using interval)
   */
  public scrollDuringStream(): void {
    if (this.state.isUserScrolling) return;
    this.scrollToBottomInstant();
  }

  // ============================================================================
  // STATE QUERIES
  // ============================================================================

  public isUserCurrentlyScrolling(): boolean {
    return this.state.isUserScrolling;
  }

  public isCurrentlyStreaming(): boolean {
    return this.state.isStreaming;
  }

  public wasUserAtBottom(): boolean {
    return this.state.wasAtBottom;
  }

  // ============================================================================
  // SCROLL BUTTON
  // ============================================================================

  private createScrollButton(): void {
    if (!this.container) return;

    // Remove existing button if any
    this.scrollButton?.remove();

    // Create button
    this.scrollButton = document.createElement('button');
    this.scrollButton.className = 'csm-scroll-button';
    this.scrollButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 5v14M5 12l7 7 7-7"/>
      </svg>
    `;
    this.scrollButton.title = 'Scroll to bottom';

    // Position relative to container
    const parent = this.container.parentElement;
    if (parent) {
      parent.style.position = 'relative';
      parent.appendChild(this.scrollButton);
    }

    // Click handler
    this.scrollButton.addEventListener('click', () => {
      this.forceScrollToBottom();
    });

    // Initial visibility
    this.updateScrollButton();
  }

  private updateScrollButton(): void {
    if (!this.scrollButton || !this.container) return;

    const { scrollTop, scrollHeight, clientHeight } = this.container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const showButton = distanceFromBottom > this.config.autoScrollThreshold;

    this.scrollButton.classList.toggle('visible', showButton);
  }

  /**
   * Notify that a new message arrived (pulse the button if scrolled up)
   */
  public notifyNewMessage(): void {
    if (!this.scrollButton) return;
    
    if (!this.isNearBottom()) {
      this.scrollButton.classList.add('csm-has-new');
      setTimeout(() => {
        this.scrollButton?.classList.remove('csm-has-new');
      }, 3000);
    }
  }

  // ============================================================================
  // LOGGING
  // ============================================================================

  private log(message: string): void {
    if (this.config.debugMode) {
      console.log(`[ChatScrollManager] ${message}`);
    }
  }

  // ============================================================================
  // STYLES
  // ============================================================================

  private injectStyles(): void {
    if (document.getElementById('csm-styles')) return;

    const style = document.createElement('style');
    style.id = 'csm-styles';
    style.textContent = `
      /* Scroll to Bottom Button - Compact 28px with Cyan Glow */
      .csm-scroll-button {
        position: absolute;
        bottom: 70px;
        right: 16px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
        border: none;
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
        opacity: 0;
        transform: translateY(10px) scale(0.8);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
        box-shadow: 
          0 2px 8px rgba(6, 182, 212, 0.4),
          0 0 12px rgba(6, 182, 212, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
      }

      .csm-scroll-button svg {
        width: 14px;
        height: 14px;
        stroke-width: 2.5;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
      }

      .csm-scroll-button.visible {
        pointer-events: auto;
        opacity: 1;
        transform: translateY(0) scale(1);
        animation: csmPulseGlow 2s ease-in-out infinite;
      }

      .csm-scroll-button:hover {
        background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%);
        box-shadow: 
          0 4px 16px rgba(6, 182, 212, 0.5),
          0 0 20px rgba(6, 182, 212, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.3);
        transform: scale(1.15);
        animation: none;
      }

      .csm-scroll-button:active {
        transform: scale(0.95);
        box-shadow: 
          0 2px 6px rgba(6, 182, 212, 0.3),
          0 0 8px rgba(6, 182, 212, 0.2);
      }

      /* Pulse Glow Animation */
      @keyframes csmPulseGlow {
        0%, 100% {
          box-shadow: 
            0 2px 8px rgba(6, 182, 212, 0.4),
            0 0 12px rgba(6, 182, 212, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          transform: scale(1);
        }
        50% {
          box-shadow: 
            0 4px 16px rgba(6, 182, 212, 0.6),
            0 0 24px rgba(6, 182, 212, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          transform: scale(1.08);
        }
      }

      /* New Message Pulse - More Intense */
      .csm-scroll-button.csm-has-new {
        animation: csmNewMessagePulse 1s ease-in-out infinite;
      }

      @keyframes csmNewMessagePulse {
        0%, 100% {
          box-shadow: 
            0 2px 8px rgba(6, 182, 212, 0.4),
            0 0 12px rgba(6, 182, 212, 0.3);
          transform: scale(1);
        }
        50% {
          box-shadow: 
            0 4px 20px rgba(6, 182, 212, 0.7),
            0 0 30px rgba(6, 182, 212, 0.6),
            0 0 40px rgba(6, 182, 212, 0.3);
          transform: scale(1.12);
        }
      }

      /* Message Highlight Animation */
      .csm-highlight-flash {
        animation: csmHighlightFlash 2s ease-out;
      }

      @keyframes csmHighlightFlash {
        0%, 20% { 
          background-color: rgba(6, 182, 212, 0.2);
          box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.4);
        }
        100% { 
          background-color: transparent;
          box-shadow: none;
        }
      }

      /* Chat container scroll behavior */
      .ai-chat-container {
        scroll-behavior: auto; /* Use instant scroll, we handle smooth manually */
        overflow-anchor: none; /* We handle scroll anchoring manually */
      }

      /* New Message Indicator (optional) */
      .csm-new-message-indicator {
        position: absolute;
        bottom: 70px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
        color: #fff;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 100;
      }

      .csm-new-message-indicator.visible {
        opacity: 1;
      }
    `;

    document.head.appendChild(style);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let scrollManagerInstance: ChatScrollManager | null = null;

export function getChatScrollManager(): ChatScrollManager {
  if (!scrollManagerInstance) {
    scrollManagerInstance = new ChatScrollManager({
      containerSelector: '.ai-chat-container',
      debugMode: false,
      enableScrollButton: true
    });
  }
  return scrollManagerInstance;
}

export function initChatScrollManager(): ChatScrollManager {
  const manager = getChatScrollManager();
  manager.init();
  return manager;
}

// ============================================================================
// CONVENIENCE FUNCTIONS (Drop-in replacements for existing code)
// ============================================================================

/**
 * Drop-in replacement for: chatContainer.scrollTop = chatContainer.scrollHeight
 * ✅ Now with anti-jump protection - only scrolls if not already at bottom
 */
export function scrollChatToBottom(): void {
  getChatScrollManager().scrollToBottom();
}

/**
 * Drop-in replacement for scroll after user sends message
 * ✅ Forces scroll but uses instant snap when near bottom (no animation = no jump)
 */
export function scrollChatAfterUserMessage(): void {
  getChatScrollManager().forceScrollToBottom();
}

/**
 * Drop-in replacement for startAIProcessingScroll
 */
export function startAIProcessingScroll(): void {
  getChatScrollManager().startStreaming();
}

/**
 * Drop-in replacement for stopAIProcessingScroll
 */
export function stopAIProcessingScroll(): void {
  getChatScrollManager().stopStreaming();
}

/**
 * Scroll during streaming (call on each chunk)
 */
export function scrollDuringAIStream(): void {
  getChatScrollManager().scrollDuringStream();
}

/**
 * Scroll to a specific message
 */
export function scrollToMessage(messageId: string, highlight = true): void {
  getChatScrollManager().scrollToMessage(messageId, highlight);
}

/**
 * Check if user is currently scrolling (reading history)
 */
export function isUserScrolling(): boolean {
  return getChatScrollManager().isUserCurrentlyScrolling();
}

/**
 * Notify that a new message arrived (triggers pulse if scrolled up)
 */
export function notifyNewMessage(): void {
  getChatScrollManager().notifyNewMessage();
}

/**
 * Lock scroll during DOM updates (prevents jump)
 */
export function lockChatScroll(): void {
  getChatScrollManager().lockScroll();
}

/**
 * Unlock scroll after DOM updates
 */
export function unlockChatScroll(): void {
  getChatScrollManager().unlockScroll();
}

// ============================================================================
// EXPORT ALIASES (for compatibility with different naming conventions)
// ============================================================================

/** Alias for scrollChatAfterUserMessage - forces scroll regardless of user state */
export const forceScrollChatToBottom = scrollChatAfterUserMessage;

/** Alias for scrollDuringAIStream */
export const scrollDuringStreaming = scrollDuringAIStream;

/** Alias for startAIProcessingScroll */
export const startStreamingMode = startAIProcessingScroll;

/** Alias for stopAIProcessingScroll */
export const endStreamingMode = stopAIProcessingScroll;

/** Alias for getChatScrollManager */
export const getScrollManager = getChatScrollManager;

// ============================================================================
// GLOBAL EXPOSURE
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).chatScrollManager = getChatScrollManager;
  (window as any).initChatScrollManager = initChatScrollManager;
  (window as any).scrollChatToBottom = scrollChatToBottom;
  (window as any).scrollChatAfterUserMessage = scrollChatAfterUserMessage;
  (window as any).forceScrollChatToBottom = forceScrollChatToBottom;
  (window as any).startAIProcessingScroll = startAIProcessingScroll;
  (window as any).stopAIProcessingScroll = stopAIProcessingScroll;
  (window as any).scrollDuringAIStream = scrollDuringAIStream;
  (window as any).scrollDuringStreaming = scrollDuringStreaming;
  (window as any).scrollToMessage = scrollToMessage;
  (window as any).isUserScrolling = isUserScrolling;
  (window as any).notifyNewMessage = notifyNewMessage;
  (window as any).getScrollManager = getScrollManager;
  (window as any).lockChatScroll = lockChatScroll;
  (window as any).unlockChatScroll = unlockChatScroll;
}

// ============================================================================
// AUTO-INITIALIZE
// ============================================================================

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => initChatScrollManager(), 100);
    });
  } else {
    setTimeout(() => initChatScrollManager(), 100);
  }
}

console.log('📜 [ChatScrollManager] Module loaded');

export default ChatScrollManager;
