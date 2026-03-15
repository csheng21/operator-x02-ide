// typingIndicator.ts - Spinner + Wave Background (X02 v2)
// ============================================================================

let typingElement: HTMLElement | null = null;
let statusInterval: number | null = null;

const providerColors: Record<string, string> = {
  'openai': '#10a37f',
  'claude': '#cc785c',
  'gemini': '#4285f4',
  'groq': '#f55036',
  'deepseek': '#0066ff',
  'cohere': '#ff6b6b',
  'ollama': '#aaaaaa',
  'operator_x02': '#3b82f6',
  'custom': '#9c27b0'
};

function getAccentColor(): string {
  try {
    const cfg = JSON.parse(localStorage.getItem('aiApiConfig') || '{}');
    return providerColors[cfg.provider] || '#3b82f6';
  } catch {
    return '#3b82f6';
  }
}

const STATUS_MESSAGES = [
  'AI is thinking...',
  'Reading project files...',
  'Analyzing context...',
  'Preparing response...',
  'Almost ready...'
];

function injectWaveStyles(color: string): void {
  const id = 'x02-typing-styles';
  if (document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
    @keyframes x02-wave-bg {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @keyframes x02-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes x02-fade-in {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .x02-typing-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid rgba(59,130,246,0.25);
      overflow: hidden;
      animation: x02-fade-in 0.2s ease;
      min-width: 180px;
    }
    .x02-wave-bg {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg,
        transparent 0%,
        rgba(59,130,246,0.07) 25%,
        rgba(59,130,246,0.18) 50%,
        rgba(59,130,246,0.07) 75%,
        transparent 100%);
      background-size: 200% 100%;
      animation: x02-wave-bg 2s ease-in-out infinite;
    }
    .x02-spinner {
      width: 13px;
      height: 13px;
      border: 1.5px solid rgba(59,130,246,0.25);
      border-top-color: ACCENT_COLOR;
      border-radius: 50%;
      animation: x02-spin 0.75s linear infinite;
      flex-shrink: 0;
      position: relative;
      z-index: 1;
    }
    .x02-status-text {
      font-size: 12px;
      color: #8b9dc3;
      position: relative;
      z-index: 1;
      transition: opacity 0.3s ease;
    }
  `.replace('ACCENT_COLOR', color);
  document.head.appendChild(s);
}

export function showTypingIndicator(): void {
  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) return;

  hideTypingIndicator();

  const color = getAccentColor();
  injectWaveStyles(color);

  typingElement = document.createElement('div');
  typingElement.id = 'ai-typing-indicator';
  typingElement.className = 'ai-message assistant-message';
  typingElement.style.cssText = 'padding: 10px 16px; display: flex; align-items: center;';

  typingElement.innerHTML = `
    <div class="x02-typing-wrap">
      <div class="x02-wave-bg"></div>
      <div class="x02-spinner"></div>
      <span class="x02-status-text">AI is thinking...</span>
    </div>
  `;

  chatContainer.appendChild(typingElement);
  (chatContainer as HTMLElement).scrollTop = (chatContainer as HTMLElement).scrollHeight;

  let idx = 0;
  statusInterval = window.setInterval(() => {
    const el = typingElement?.querySelector('.x02-status-text') as HTMLElement | null;
    if (el) {
      el.style.opacity = '0';
      setTimeout(() => {
        idx = (idx + 1) % STATUS_MESSAGES.length;
        if (el) {
          el.textContent = STATUS_MESSAGES[idx];
          el.style.opacity = '1';
        }
      }, 300);
    }
  }, 2500);

  console.log('[ðŸŽ¨ AssistantUI] Typing indicator shown');
}

export async function hideTypingIndicator(): Promise<void> {
  if (statusInterval !== null) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
  if (typingElement && typingElement.parentNode) {
    typingElement.parentNode.removeChild(typingElement);
  }
  typingElement = null;
}

export function isTypingIndicatorVisible(): boolean {
  return typingElement !== null;
}

if (typeof window !== 'undefined') {
  (window as any).showTypingIndicator = showTypingIndicator;
  (window as any).hideTypingIndicator = hideTypingIndicator;
}
