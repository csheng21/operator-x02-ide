// conversationHistoryContext.ts
// ============================================================================
// CONVERSATION HISTORY CONTEXT - SUPPLEMENTARY MODULE
// ============================================================================
// This module ADDS conversation history awareness to your existing AI system.
// It does NOT replace any existing functionality.
// Simply import this file in main.ts and it will work automatically.
// ============================================================================

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[💬 ConvHistory]', ...args);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  id?: string;
}

interface ConversationAnalysis {
  isRelated: boolean;
  relationshipType: 'continuation' | 'clarification' | 'follow_up' | 'reference' | 'new_topic';
  confidence: number;
  relatedTopics: string[];
  contextString: string;
  messageCount: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  messagesToRead: 3,
  maxCharsPerMessage: 400,
  minConfidenceForFeedback: 0.3,
  feedbackDisplayTime: 4000,
  showVisualFeedback: true,
  injectContext: true
};

// ============================================================================
// DETECTION PATTERNS
// ============================================================================

const PATTERNS = {
  continuation: [
    /^(and |also |additionally |furthermore |moreover |plus )/i,
    /^(what about |how about |can you also |could you also )/i,
    /^(ok |okay |great |thanks |good |nice |perfect )?(now |then |next |also |so )?/i,
    /(continue|keep going|go on|more of|another|next one)/i,
    /\b(it|this|that|these|those|them|they)\b[^.?!]*\?$/i,
  ],
  
  clarification: [
    /\b(what do you mean|explain that|clarify|elaborate|can you explain)\b/i,
    /\b(don't understand|not clear|confused|didn't get|lost me)\b/i,
    /\b(could you|can you|would you) (explain|clarify|elaborate|expand)/i,
    /\b(more detail|more specific|more info|give me an example)\b/i,
    /^(sorry|wait|hold on|actually|hmm)/i,
    /\?{2,}|huh\?|what\?$/i,
  ],
  
  follow_up: [
    /\b(after that|then what|what next|and then|next step)\b/i,
    /\b(will (it|that|this)|would (it|that|this)|does (it|that|this)) (work|help|fix|solve)/i,
    /\b(one more|another question|any other|anything else|related)\b/i,
    /\b(what if|suppose|assuming|let's say|hypothetically)\b/i,
    /\b(similar|same thing|along those lines|like that)\b/i,
  ],
  
  reference: [
    /\b(you (said|mentioned|showed|wrote|suggested|recommended))\b/i,
    /\b(earlier|before|previously|above|last time|just now)\b/i,
    /\b(your (answer|response|suggestion|code|example|solution))\b/i,
    /\b(that (code|file|function|error|solution|approach))\b/i,
    /\b(the (code|file|function|error|solution) (you|from))\b/i,
  ]
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractTopics(text: string): string[] {
  const topics: string[] = [];
  const lower = text.toLowerCase();
  
  const codeTerms = lower.match(/\b(function|class|component|variable|const|let|interface|type|method|hook|state|props|api|module|import|export)\b/g);
  if (codeTerms) topics.push(...codeTerms);
  
  const files = text.match(/\b[\w-]+\.(tsx?|jsx?|css|scss|html|json|py|rs|go|java|vue|svelte|md)\b/gi);
  if (files) topics.push(...files.map(f => f.toLowerCase()));
  
  const tech = lower.match(/\b(react|vue|angular|node|python|rust|typescript|javascript|css|html|api|database|mongodb|sql|redis|docker|git)\b/g);
  if (tech) topics.push(...tech);
  
  const errors = lower.match(/\b(error|bug|issue|problem|crash|fail|exception|undefined|null|warning)\b/g);
  if (errors) topics.push(...errors);
  
  return [...new Set(topics)];
}

function calculateOverlap(topics1: string[], topics2: string[]): number {
  if (!topics1.length || !topics2.length) return 0;
  const set1 = new Set(topics1);
  const set2 = new Set(topics2);
  let overlap = 0;
  set1.forEach(t => { if (set2.has(t)) overlap++; });
  return overlap / Math.max(set1.size, set2.size);
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

function getRecentMessages(count: number = CONFIG.messagesToRead): ConversationMessage[] {
  try {
    const convManager = (window as any).conversationManager;
    if (convManager?.getCurrentConversation) {
      const conv = convManager.getCurrentConversation();
      if (conv?.messages?.length > 0) {
        const filtered = conv.messages.filter((m: any) => m.role !== 'system');
        return filtered.slice(-count).map((m: any) => ({
          role: m.role,
          content: m.content?.substring(0, CONFIG.maxCharsPerMessage * 2) || '',
          timestamp: m.timestamp,
          id: m.id
        }));
      }
    }
    
    const messages: ConversationMessage[] = [];
    const elements = document.querySelectorAll('.ai-message');
    const recent = Array.from(elements).slice(-(count * 2));
    
    recent.forEach(el => {
      const isUser = el.classList.contains('user-message');
      const isAssistant = el.classList.contains('assistant-message');
      const contentEl = el.querySelector('.ai-message-content');
      const content = contentEl?.textContent?.trim() || '';
      
      if ((isUser || isAssistant) && content) {
        messages.push({
          role: isUser ? 'user' : 'assistant',
          content: content.substring(0, CONFIG.maxCharsPerMessage * 2)
        });
      }
    });
    
    return messages.slice(-count);
  } catch (e) {
    log('Error getting messages:', e);
    return [];
  }
}

function analyzeRelationship(
  newMessage: string,
  previousMessages: ConversationMessage[]
): ConversationAnalysis {
  const result: ConversationAnalysis = {
    isRelated: false,
    relationshipType: 'new_topic',
    confidence: 0,
    relatedTopics: [],
    contextString: '',
    messageCount: previousMessages.length
  };
  
  if (previousMessages.length === 0) {
    return result;
  }
  
  const msgLower = newMessage.toLowerCase();
  const scores = { continuation: 0, clarification: 0, follow_up: 0, reference: 0 };
  
  for (const [type, patterns] of Object.entries(PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(msgLower)) {
        scores[type as keyof typeof scores] += 0.35;
      }
    }
  }
  
  const newTopics = extractTopics(newMessage);
  const prevContent = previousMessages.map(m => m.content).join(' ');
  const prevTopics = extractTopics(prevContent);
  const topicOverlap = calculateOverlap(newTopics, prevTopics);
  
  let maxType: keyof typeof scores = 'continuation';
  let maxScore = 0;
  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxType = type as keyof typeof scores;
    }
  }
  
  const totalScore = maxScore + (topicOverlap * 0.4);
  
  if (totalScore >= CONFIG.minConfidenceForFeedback) {
    result.isRelated = true;
    result.relationshipType = maxType;
    result.confidence = Math.min(totalScore, 1);
    result.relatedTopics = newTopics.filter(t => prevTopics.includes(t));
    result.contextString = buildContextString(previousMessages, result);
  }
  
  log('Analysis:', {
    isRelated: result.isRelated,
    type: result.relationshipType,
    confidence: (result.confidence * 100).toFixed(0) + '%',
    topics: result.relatedTopics.slice(0, 5)
  });
  
  return result;
}

function buildContextString(messages: ConversationMessage[], analysis: ConversationAnalysis): string {
  if (!CONFIG.injectContext || messages.length === 0) return '';
  
  const emoji: Record<string, string> = {
    continuation: '↪️',
    clarification: '❓',
    follow_up: '➡️',
    reference: '🔗',
    new_topic: '🆕'
  };
  
  const label: Record<string, string> = {
    continuation: 'Continuing previous discussion',
    clarification: 'Asking for clarification',
    follow_up: 'Follow-up question',
    reference: 'Referencing previous response',
    new_topic: 'New topic'
  };
  
  let ctx = `\n\n[💬 CONVERSATION CONTEXT - ${emoji[analysis.relationshipType]} ${label[analysis.relationshipType]}]\n`;
  ctx += `Recent conversation (${messages.length} messages):\n\n`;
  
  messages.forEach((msg) => {
    const icon = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
    const content = msg.content.length > CONFIG.maxCharsPerMessage 
      ? msg.content.substring(0, CONFIG.maxCharsPerMessage) + '...'
      : msg.content;
    ctx += `${icon}: ${content}\n\n`;
  });
  
  if (analysis.relatedTopics.length > 0) {
    ctx += `Related topics: ${analysis.relatedTopics.join(', ')}\n`;
  }
  
  ctx += `[END CONVERSATION CONTEXT]\n\n`;
  
  return ctx;
}

// ============================================================================
// VISUAL FEEDBACK
// ============================================================================

let feedbackEl: HTMLElement | null = null;

function showConversationFeedback(analysis: ConversationAnalysis): void {
  if (!CONFIG.showVisualFeedback || !analysis.isRelated) return;
  
  hideConversationFeedback();
  
  // ============================================================================
  // PROFESSIONAL IDE-STYLE UI - Status Bar + Toast Hybrid
  // ============================================================================
  
  const typeConfig: Record<string, { icon: string; label: string; color: string; bgColor: string }> = {
    continuation: { icon: '↪', label: 'Continuing', color: '#a78bfa', bgColor: 'rgba(167, 139, 250, 0.15)' },
    clarification: { icon: '?', label: 'Clarifying', color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.15)' },
    follow_up: { icon: '→', label: 'Follow-up', color: '#34d399', bgColor: 'rgba(52, 211, 153, 0.15)' },
    reference: { icon: '⟲', label: 'Reference', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.15)' },
    new_topic: { icon: '◆', label: 'New', color: '#94a3b8', bgColor: 'rgba(148, 163, 184, 0.15)' }
  };
  
  const config = typeConfig[analysis.relationshipType] || typeConfig.new_topic;
  const confidence = Math.round(analysis.confidence * 100);
  
  // Inject styles once
  injectProfessionalStyles();
  
  // ========================================
  // 1. STATUS BAR INDICATOR (Persistent)
  // ========================================
  updateStatusBarIndicator(config, confidence, analysis.messageCount);
  
  // ========================================
  // 2. TOAST NOTIFICATION (Auto-fade)
  // ========================================
  showToastNotification(config, confidence, analysis);
  
  log('Feedback shown:', analysis.relationshipType, confidence + '%');
}

function hideConversationFeedback(): void {
  // Remove toast
  const toast = document.getElementById('conv-history-toast');
  if (toast) {
    toast.style.animation = 'chf-toast-out 0.2s ease-out forwards';
    setTimeout(() => toast.remove(), 200);
  }
  feedbackEl = null;
}

// ============================================================================
// STATUS BAR INDICATOR
// ============================================================================
function updateStatusBarIndicator(
  config: { icon: string; label: string; color: string; bgColor: string },
  confidence: number,
  messageCount: number
): void {
  const indicatorId = 'conv-history-status';
  let indicator = document.getElementById(indicatorId);
  
  // Find status bar - try multiple selectors
  const statusBar = document.querySelector('.status-bar') || 
                    document.querySelector('.unified-status-bar') ||
                    document.querySelector('[class*="status-bar"]') ||
                    document.querySelector('.editor-statusbar');
  
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = indicatorId;
    indicator.className = 'conv-status-indicator';
    
    // Insert into status bar or create floating mini indicator
    if (statusBar) {
      // Insert at the beginning of status bar
      statusBar.insertBefore(indicator, statusBar.firstChild);
    } else {
      // Fallback: floating mini indicator at bottom-left
      indicator.style.cssText = `
        position: fixed;
        bottom: 4px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
      `;
      document.body.appendChild(indicator);
    }
  }
  
  indicator.innerHTML = `
    <span class="conv-status-dot" style="background: ${config.color};"></span>
    <span class="conv-status-icon" style="color: ${config.color};">${config.icon}</span>
    <span class="conv-status-label">${config.label}</span>
    <span class="conv-status-confidence">${confidence}%</span>
    <span class="conv-status-msgs">${messageCount} msgs</span>
  `;
  
  indicator.style.borderColor = config.color;
  indicator.setAttribute('title', `Context: ${config.label} • Confidence: ${confidence}% • ${messageCount} recent messages`);
  
  // Auto-hide after display time
  setTimeout(() => {
    const el = document.getElementById(indicatorId);
    if (el) {
      el.style.animation = 'chf-status-fade 0.3s ease-out forwards';
      setTimeout(() => el.remove(), 300);
    }
  }, CONFIG.feedbackDisplayTime);
}

// ============================================================================
// TOAST NOTIFICATION
// ============================================================================
function showToastNotification(
  config: { icon: string; label: string; color: string; bgColor: string },
  confidence: number,
  analysis: ConversationAnalysis
): void {
  // Remove existing toast
  const existing = document.getElementById('conv-history-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.id = 'conv-history-toast';
  toast.className = 'conv-toast';
  
  // Position near chat input area
  const chatInput = document.getElementById('ai-assistant-input');
  const chatContainer = document.querySelector('.ai-chat-container');
  
  if (chatInput) {
    const rect = chatInput.getBoundingClientRect();
    toast.style.cssText = `
      position: fixed;
      bottom: ${window.innerHeight - rect.top + 8}px;
      right: 20px;
      z-index: 99999;
    `;
  } else if (chatContainer) {
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 20px;
      z-index: 99999;
    `;
  } else {
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      z-index: 99999;
    `;
  }
  
  toast.innerHTML = `
    <div class="conv-toast-content" style="border-left-color: ${config.color}; background: ${config.bgColor};">
      <div class="conv-toast-header">
        <span class="conv-toast-icon" style="color: ${config.color};">${config.icon}</span>
        <span class="conv-toast-title">${config.label}</span>
        <span class="conv-toast-confidence">${confidence}%</span>
      </div>
      <div class="conv-toast-progress">
        <div class="conv-toast-progress-bar" style="width: ${confidence}%; background: ${config.color};"></div>
      </div>
    </div>
  `;
  
  document.body.appendChild(toast);
  feedbackEl = toast;
  
  // Auto-remove after display time
  setTimeout(() => {
    const el = document.getElementById('conv-history-toast');
    if (el) {
      el.style.animation = 'chf-toast-out 0.2s ease-out forwards';
      setTimeout(() => el.remove(), 200);
    }
  }, CONFIG.feedbackDisplayTime - 200);
}

// ============================================================================
// PROFESSIONAL STYLES
// ============================================================================
function injectProfessionalStyles(): void {
  if (document.getElementById('conv-history-pro-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'conv-history-pro-styles';
  style.textContent = `
    /* ========================================
       STATUS BAR INDICATOR
       ======================================== */
    .conv-status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 10px;
      background: rgba(30, 30, 30, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 11px;
      color: #e0e0e0;
      cursor: default;
      user-select: none;
      animation: chf-status-in 0.2s ease-out;
      margin-right: 8px;
    }
    
    .conv-status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      animation: chf-pulse 2s ease-in-out infinite;
    }
    
    .conv-status-icon {
      font-size: 12px;
      font-weight: 600;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    
    .conv-status-label {
      font-weight: 500;
      color: #ffffff;
    }
    
    .conv-status-confidence {
      color: #888;
      font-size: 10px;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    
    .conv-status-msgs {
      color: #666;
      font-size: 10px;
      padding-left: 6px;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    /* ========================================
       TOAST NOTIFICATION
       ======================================== */
    .conv-toast {
      animation: chf-toast-in 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .conv-toast-content {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px 14px;
      background: rgba(28, 28, 32, 0.98);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-left: 3px solid;
      border-radius: 6px;
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      min-width: 160px;
    }
    
    .conv-toast-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .conv-toast-icon {
      font-size: 14px;
      font-weight: 700;
      font-family: 'Consolas', 'Monaco', monospace;
      width: 18px;
      text-align: center;
    }
    
    .conv-toast-title {
      font-size: 12px;
      font-weight: 600;
      color: #e8e8e8;
      flex: 1;
    }
    
    .conv-toast-confidence {
      font-size: 11px;
      font-weight: 500;
      color: #888;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    
    .conv-toast-progress {
      height: 2px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 1px;
      overflow: hidden;
    }
    
    .conv-toast-progress-bar {
      height: 100%;
      border-radius: 1px;
      transition: width 0.3s ease;
    }
    
    /* ========================================
       ANIMATIONS
       ======================================== */
    @keyframes chf-status-in {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes chf-status-fade {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    
    @keyframes chf-toast-in {
      from { 
        opacity: 0; 
        transform: translateX(20px) scale(0.95); 
      }
      to { 
        opacity: 1; 
        transform: translateX(0) scale(1); 
      }
    }
    
    @keyframes chf-toast-out {
      from { 
        opacity: 1; 
        transform: translateX(0) scale(1); 
      }
      to { 
        opacity: 0; 
        transform: translateX(10px) scale(0.98); 
      }
    }
    
    @keyframes chf-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    /* ========================================
       HOVER STATES
       ======================================== */
    .conv-status-indicator:hover {
      background: rgba(45, 45, 50, 0.98);
      border-color: rgba(255, 255, 255, 0.2);
    }
    
    .conv-toast-content:hover {
      border-color: rgba(255, 255, 255, 0.15);
    }
  `;
  document.head.appendChild(style);
}

function injectFeedbackStyles(): void {
  // Now handled by injectProfessionalStyles
  injectProfessionalStyles();
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function hookIntoMessageSending(): void {
  log('Setting up conversation history hooks...');
  
  // The enhanceWithConversationHistory function is now defined at module level
  // and exposed on window in the exports section
  
  const input = document.getElementById('ai-assistant-input') as HTMLTextAreaElement;
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const result = (window as any).enhanceWithConversationHistory(input.value);
        if (result && result.analysis && result.analysis.isRelated) {
          log('Conversation context will be added');
        }
      }
    }, { capture: true, passive: true });
  }
  
  log('✅ Conversation history hooks installed');
}

function initialize(): void {
  log('Initializing conversation history context module...');
  
  const tryInit = () => {
    const chatContainer = document.querySelector('.ai-chat-container');
    const convManager = (window as any).conversationManager;
    
    if (chatContainer || convManager) {
      hookIntoMessageSending();
      log('✅ Module initialized successfully');
    } else {
      setTimeout(tryInit, 500);
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(tryInit, 1000));
  } else {
    setTimeout(tryInit, 1000);
  }
}

// ============================================================================
// MAIN ENHANCE FUNCTION (must be defined at module level)
// ============================================================================

function enhanceWithConversationHistory(message: string): { 
  enhanced: string; 
  analysis: ConversationAnalysis;
} {
  const recentMessages = getRecentMessages();
  const analysis = analyzeRelationship(message, recentMessages);
  
  // Always show visual feedback if related
  if (analysis.isRelated) {
    showConversationFeedback(analysis);
  }
  
  // Return enhanced message with context if available
  if (analysis.contextString) {
    return {
      enhanced: analysis.contextString + message,
      analysis
    };
  }
  
  return { enhanced: message, analysis };
}

// ============================================================================
// WINDOW EXPORTS (for debugging)
// ============================================================================

if (typeof window !== 'undefined') {
  // Create convHistory object with ALL functions including enhanceWithConversationHistory
  (window as any).convHistory = {
    getRecentMessages,
    analyzeRelationship,
    showConversationFeedback,
    hideConversationFeedback,
    enhanceWithConversationHistory, // ← Added here!
    CONFIG
  };
  
  // Also expose on window directly for the integration code
  (window as any).enhanceWithConversationHistory = enhanceWithConversationHistory;
  (window as any).getConversationHistory = getRecentMessages;
  (window as any).analyzeConversationRelationship = analyzeRelationship;
  
  initialize();
  
  log('Module loaded - access via window.convHistory');
  log('✅ enhanceWithConversationHistory available on window and window.convHistory');
}
