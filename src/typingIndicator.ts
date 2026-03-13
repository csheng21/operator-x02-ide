// typingIndicator.ts - Simple Line Wave Animation
// ============================================================================

let typingElement: HTMLElement | null = null;

/**
 * Provider color mapping
 */
const providerColors: Record<string, string> = {
  'openai': '#10a37f',
  'claude': '#cc785c',
  'gemini': '#4285f4',
  'groq': '#f55036',
  'deepseek': '#0066ff',
  'cohere': '#ff6b6b',
  'ollama': '#ffffff',
  'custom': '#9c27b0'
};

/**
 * Get current provider color
 */
function getAccentColor(): string {
  try {
    const cfg = JSON.parse(localStorage.getItem('aiApiConfig') || '{}');
    return providerColors[cfg.provider] || '#4fc3f7';
  } catch {
    return '#4fc3f7';
  }
}

/**
 * Create simple wave animation HTML
 */
function createWaveHTML(color: string): string {
  const bars = Array(5).fill(0).map((_, i) => `
    <span style="
      width: 3px;
      height: 8px;
      background: ${color};
      border-radius: 2px;
      animation: waveAnimation 1s ease-in-out infinite;
      animation-delay: ${i * 0.1}s;
    "></span>
  `).join('');

  return `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      height: 24px;
      padding: 16px;
    ">
      ${bars}
    </div>
  `;
}

/**
 * Show simple wave typing indicator
 */
export function showTypingIndicator(): void {
  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) return;
  
  // Remove existing
  hideTypingIndicator();
  
  // Add animation styles if not present
  if (!document.getElementById('wave-animation-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'wave-animation-styles';
    styleEl.textContent = `
      @keyframes waveAnimation {
        0%, 100% { height: 8px; opacity: 0.5; }
        50% { height: 20px; opacity: 1; }
      }
    `;
    document.head.appendChild(styleEl);
  }
  
  // Create indicator
  typingElement = document.createElement('div');
  typingElement.id = 'ai-typing-indicator';
  typingElement.className = 'ai-message assistant-message';
  typingElement.innerHTML = createWaveHTML(getAccentColor());
  
  chatContainer.appendChild(typingElement);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/**
 * Hide typing indicator
 */
export async function hideTypingIndicator(): Promise<void> {
  if (typingElement && typingElement.parentNode) {
    typingElement.parentNode.removeChild(typingElement);
  }
  typingElement = null;
}

/**
 * Check if visible
 */
export function isTypingIndicatorVisible(): boolean {
  return typingElement !== null;
}

// Expose to window
if (typeof window !== 'undefined') {
  (window as any).showTypingIndicator = showTypingIndicator;
  (window as any).hideTypingIndicator = hideTypingIndicator;
}