// typingIndicator.ts - Typing Indicator Management
// 🔧 SIMPLIFIED: No provider name shown during loading (avoids confusion)

let isTypingIndicatorShown = false;

/**
 * Show typing indicator - simplified without provider name
 */
export function showTypingIndicator(): void {
  if (isTypingIndicatorShown) return;
  
  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) return;
  
  const indicator = document.createElement('div');
  indicator.className = 'ai-message assistant-message typing-indicator';
  indicator.innerHTML = `
    <div class="typing-content" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px;">
      <div class="typing-dots" style="display: flex; gap: 4px;">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>
  `;
  
  chatContainer.appendChild(indicator);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  isTypingIndicatorShown = true;
}

/**
 * Update typing indicator (no-op in simplified version)
 */
export function updateTypingIndicatorProvider(_providerName: string): void {
  // No-op - we don't show provider name anymore
}

export function hideTypingIndicator(delay: number = 0): Promise<void> {
  return new Promise((resolve) => {
    const indicator = document.querySelector('.typing-indicator');
    if (indicator) {
      setTimeout(() => {
        indicator.classList.add('typing-fade-out');
        setTimeout(() => {
          indicator.remove();
          isTypingIndicatorShown = false;
          resolve();
        }, 300);
      }, delay);
    } else {
      isTypingIndicatorShown = false;
      resolve();
    }
  });
}

/**
 * Check if typing indicator is currently shown
 */
export function isTypingIndicatorVisible(): boolean {
  return isTypingIndicatorShown;
}
