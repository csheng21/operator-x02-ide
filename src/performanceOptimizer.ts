// performanceOptimizer.ts - Performance Optimizations for AI Code IDE
// ============================================================================
// Improves scrolling, rendering, and overall responsiveness
// ============================================================================

/**
 * Initialize all performance optimizations
 */
export function initPerformanceOptimizations(): void {
  console.log('⚡ Initializing performance optimizations...');
  
  // Run optimizations
  optimizeChatScrolling();
  optimizeAnimations();
  optimizeCodeBlocks();
  setupVirtualScrolling();
  optimizeEventListeners();
  reduceRepaints();
  lazyLoadImages();
  
  console.log('✅ Performance optimizations applied');
}

// ============================================================================
// 1. CHAT SCROLLING OPTIMIZATION
// ============================================================================

function optimizeChatScrolling(): void {
  const chatContainer = document.querySelector('.ai-chat-container') as HTMLElement;
  if (!chatContainer) return;
  
  // Use passive scroll listeners for better performance
  chatContainer.addEventListener('scroll', handleScroll, { passive: true });
  
  // Add CSS optimizations
  chatContainer.style.willChange = 'scroll-position';
  chatContainer.style.overflowAnchor = 'none'; // Prevent scroll anchoring issues
  
  // Use content-visibility for messages outside viewport
  const messages = chatContainer.querySelectorAll('.chat-message, .user-message, .assistant-message');
  messages.forEach((msg) => {
    (msg as HTMLElement).style.contentVisibility = 'auto';
    (msg as HTMLElement).style.containIntrinsicSize = '0 100px'; // Estimate height
  });
  
  console.log('  ✓ Chat scrolling optimized');
}

let scrollTimeout: number | null = null;
function handleScroll(): void {
  // Debounce scroll-related updates
  if (scrollTimeout) return;
  
  scrollTimeout = window.setTimeout(() => {
    scrollTimeout = null;
    // Any scroll-dependent updates go here
  }, 16); // ~60fps
}

// ============================================================================
// 2. ANIMATION OPTIMIZATION
// ============================================================================

function optimizeAnimations(): void {
  // Inject optimized animation CSS
  const style = document.createElement('style');
  style.id = 'perf-animations';
  style.textContent = `
    /* Reduce animation complexity */
    .assistant-panel::before,
    .status-bar::before {
      animation-duration: 8s !important; /* Slower = less CPU */
    }
    
    /* Use GPU acceleration for animated elements */
    .chat-message,
    .user-message,
    .assistant-message,
    .typing-indicator {
      transform: translateZ(0);
      backface-visibility: hidden;
    }
    
    /* Disable animations during scroll */
    .ai-chat-container.scrolling * {
      animation-play-state: paused !important;
      transition: none !important;
    }
    
    /* Reduce motion for users who prefer it */
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }
    
    /* Optimize backdrop-filter (expensive!) */
    .assistant-panel,
    .explorer-panel,
    .editor-panel {
      /* Use simpler blur or remove if causing lag */
      backdrop-filter: blur(8px) !important; /* Reduced from 12px */
    }
  `;
  
  document.head.appendChild(style);
  console.log('  ✓ Animations optimized');
}

// ============================================================================
// 3. CODE BLOCK OPTIMIZATION
// ============================================================================

function optimizeCodeBlocks(): void {
  // Observe for new code blocks and optimize them
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          const codeBlocks = node.querySelectorAll('pre, code, .code-block');
          codeBlocks.forEach(optimizeCodeBlock);
        }
      });
    });
  });
  
  const chatContainer = document.querySelector('.ai-chat-container');
  if (chatContainer) {
    observer.observe(chatContainer, { childList: true, subtree: true });
  }
  
  // Optimize existing code blocks
  document.querySelectorAll('pre, code, .code-block').forEach(optimizeCodeBlock);
  
  console.log('  ✓ Code blocks optimized');
}

function optimizeCodeBlock(element: Element): void {
  const el = element as HTMLElement;
  
  // Use content-visibility for long code blocks
  el.style.contentVisibility = 'auto';
  el.style.containIntrinsicSize = '0 200px';
  
  // Limit syntax highlighting for very long code
  const text = el.textContent || '';
  if (text.length > 5000) {
    el.classList.add('large-code-block');
    // Could disable syntax highlighting here if using a heavy library
  }
}

// ============================================================================
// 4. VIRTUAL SCROLLING FOR LONG CHATS
// ============================================================================

function setupVirtualScrolling(): void {
  const chatContainer = document.querySelector('.ai-chat-container') as HTMLElement;
  if (!chatContainer) return;
  
  // Only apply if there are many messages
  const messageCount = chatContainer.children.length;
  if (messageCount < 50) return;
  
  console.log(`  ⚠ ${messageCount} messages detected - applying virtual scroll optimizations`);
  
  // Use Intersection Observer to hide off-screen content
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          el.style.visibility = 'visible';
          el.style.contentVisibility = 'visible';
        } else {
          // Keep a buffer zone
          const rect = el.getBoundingClientRect();
          const buffer = window.innerHeight * 2;
          if (rect.bottom < -buffer || rect.top > window.innerHeight + buffer) {
            el.style.contentVisibility = 'hidden';
          }
        }
      });
    },
    {
      rootMargin: '200px 0px', // Load items 200px before they're visible
      threshold: 0
    }
  );
  
  // Observe all messages
  chatContainer.querySelectorAll('.chat-message, .user-message, .assistant-message').forEach((msg) => {
    observer.observe(msg);
  });
  
  // Also observe new messages
  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement && 
            (node.classList.contains('chat-message') || 
             node.classList.contains('user-message') ||
             node.classList.contains('assistant-message'))) {
          observer.observe(node);
        }
      });
    });
  });
  
  mutationObserver.observe(chatContainer, { childList: true });
  
  console.log('  ✓ Virtual scrolling enabled');
}

// ============================================================================
// 5. EVENT LISTENER OPTIMIZATION
// ============================================================================

function optimizeEventListeners(): void {
  // Debounce resize events
  let resizeTimeout: number | null = null;
  const originalResize = window.onresize;
  
  window.onresize = (e) => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      if (originalResize) originalResize.call(window, e);
      // Trigger Monaco editor layout
      if ((window as any).monaco?.editor) {
        (window as any).monaco.editor.getEditors().forEach((editor: any) => {
          editor.layout();
        });
      }
    }, 100);
  };
  
  // Throttle mousemove events
  document.addEventListener('mousemove', throttle((e: MouseEvent) => {
    // Any mousemove-dependent code
  }, 16), { passive: true });
  
  console.log('  ✓ Event listeners optimized');
}

function throttle<T extends (...args: any[]) => void>(func: T, limit: number): T {
  let inThrottle = false;
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  } as T;
}

// ============================================================================
// 6. REDUCE REPAINTS
// ============================================================================

function reduceRepaints(): void {
  const style = document.createElement('style');
  style.id = 'perf-repaints';
  style.textContent = `
    /* Contain layout to prevent cascading reflows */
    .assistant-panel,
    .editor-panel,
    .explorer-panel {
      contain: layout style;
    }
    
    .ai-chat-container {
      contain: strict;
    }
    
    .chat-message,
    .user-message,
    .assistant-message {
      contain: content;
    }
    
    /* Optimize frequently changing elements */
    .typing-indicator,
    .status-bar,
    .cursor {
      will-change: transform, opacity;
    }
    
    /* Reduce box-shadow complexity during interactions */
    .assistant-panel:active,
    .chat-message:active {
      box-shadow: none !important;
    }
  `;
  
  document.head.appendChild(style);
  console.log('  ✓ Repaint optimizations applied');
}

// ============================================================================
// 7. LAZY LOAD IMAGES
// ============================================================================

function lazyLoadImages(): void {
  // Use native lazy loading
  document.querySelectorAll('img').forEach((img) => {
    if (!img.loading) {
      img.loading = 'lazy';
    }
  });
  
  // Observe for new images
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          node.querySelectorAll('img').forEach((img) => {
            img.loading = 'lazy';
          });
        }
      });
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  console.log('  ✓ Lazy loading enabled');
}

// ============================================================================
// 8. OPTIONAL: REDUCE BACKDROP BLUR (Major performance gain)
// ============================================================================

export function disableBackdropBlur(): void {
  const style = document.createElement('style');
  style.id = 'perf-no-blur';
  style.textContent = `
    .assistant-panel,
    .explorer-panel,
    .editor-panel,
    .menu-bar,
    .status-bar,
    .assistant-message {
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
  `;
  document.head.appendChild(style);
  console.log('⚡ Backdrop blur disabled for better performance');
}

export function enableBackdropBlur(): void {
  document.getElementById('perf-no-blur')?.remove();
  console.log('✨ Backdrop blur re-enabled');
}

// ============================================================================
// 9. MEMORY MANAGEMENT
// ============================================================================

export function cleanupOldMessages(keepCount: number = 100): void {
  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) return;
  
  const messages = chatContainer.querySelectorAll('.chat-message, .user-message, .assistant-message');
  const toRemove = messages.length - keepCount;
  
  if (toRemove > 0) {
    console.log(`🧹 Removing ${toRemove} old messages from DOM...`);
    for (let i = 0; i < toRemove; i++) {
      messages[i].remove();
    }
    console.log(`✅ Cleaned up ${toRemove} messages`);
  }
}

// ============================================================================
// 10. PERFORMANCE MONITORING
// ============================================================================

export function startPerformanceMonitoring(): void {
  // FPS counter
  let frameCount = 0;
  let lastTime = performance.now();
  
  function measureFPS() {
    frameCount++;
    const now = performance.now();
    
    if (now - lastTime >= 1000) {
      const fps = Math.round(frameCount * 1000 / (now - lastTime));
      console.log(`📊 FPS: ${fps}`);
      
      // Warn if FPS is low
      if (fps < 30) {
        console.warn('⚠️ Low FPS detected. Consider disabling backdrop blur.');
      }
      
      frameCount = 0;
      lastTime = now;
    }
    
    requestAnimationFrame(measureFPS);
  }
  
  requestAnimationFrame(measureFPS);
  
  // Memory usage (if available)
  if ((performance as any).memory) {
    setInterval(() => {
      const memory = (performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
      console.log(`💾 Memory: ${usedMB}MB / ${totalMB}MB`);
    }, 10000);
  }
}

// ============================================================================
// EXPOSE TO WINDOW
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).perfOptimizer = {
    init: initPerformanceOptimizations,
    disableBlur: disableBackdropBlur,
    enableBlur: enableBackdropBlur,
    cleanupMessages: cleanupOldMessages,
    monitor: startPerformanceMonitoring
  };
  
  console.log('💡 Performance optimizer loaded');
  console.log('   Commands:');
  console.log('   - perfOptimizer.disableBlur() - Disable blur effects');
  console.log('   - perfOptimizer.cleanupMessages(50) - Keep only 50 messages');
  console.log('   - perfOptimizer.monitor() - Start FPS monitoring');
}

export default initPerformanceOptimizations;
