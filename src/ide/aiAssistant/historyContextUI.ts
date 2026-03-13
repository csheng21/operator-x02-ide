// src/ide/aiAssistant/historyContextUI.ts
// Professional UI for History Context Display
// Version: 1.0
// 
// Shows a beautiful animated panel instead of raw text in chat

console.log('🎨 [History Context UI] Loading...');

// ============================================================================
// CONFIGURATION
// ============================================================================

const UI_CONFIG = {
  panelDisplayTime: 15000,       // Fallback time if completion detection fails
  animationDuration: 300,        // Animation speed (ms)
  maxPreviewChars: 150,          // Max chars in preview
  showInChat: false,             // Don't inject raw text into chat
  position: 'bottom-right',      // Panel position
  theme: 'dark',                 // 'dark' | 'light'
  autoHide: false,               // Don't auto-hide, wait for AI completion
  hideOnAIComplete: true         // Hide when AI finishes responding
};

// ============================================================================
// AI RESPONSE COMPLETION DETECTION
// ============================================================================

let completionObserver: MutationObserver | null = null;
let isWaitingForCompletion = false;

/**
 * Start watching for AI response completion
 */
function watchForAICompletion(): void {
  if (!UI_CONFIG.hideOnAIComplete) return;
  if (completionObserver) {
    completionObserver.disconnect();
  }
  
  isWaitingForCompletion = true;
  let lastContentLength = 0;
  let stableCount = 0;
  let checkInterval: number | null = null;
  
  // Method 1: Watch for DOM changes stopping (content stabilized)
  const chatContainer = document.querySelector('.ai-chat-container, .chat-messages, .ai-panel, .conversation-container');
  
  if (chatContainer) {
    completionObserver = new MutationObserver((mutations) => {
      // Reset stable count on any change
      stableCount = 0;
    });
    
    completionObserver.observe(chatContainer, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }
  
  // Method 2: Check for loading indicators disappearing
  checkInterval = window.setInterval(() => {
    // Check if loading indicator is gone
    const loadingIndicator = document.querySelector('.ai-loading, .loading-indicator, .typing-indicator, [class*="loading"], [class*="typing"]');
    const isLoading = !!loadingIndicator;
    
    // Check if content has stabilized
    const currentContent = document.querySelector('.ai-message:last-child, .assistant-message:last-child')?.textContent || '';
    
    if (currentContent.length === lastContentLength && currentContent.length > 0) {
      stableCount++;
    } else {
      stableCount = 0;
      lastContentLength = currentContent.length;
    }
    
    // Consider complete if:
    // 1. No loading indicator AND content is stable for 1.5 seconds (3 checks at 500ms)
    // 2. Or content has been stable for 3 seconds (6 checks)
    if ((!isLoading && stableCount >= 3) || stableCount >= 6) {
      console.log('[History Context UI] AI response complete, hiding panel');
      
      // Cleanup
      if (checkInterval) clearInterval(checkInterval);
      if (completionObserver) completionObserver.disconnect();
      isWaitingForCompletion = false;
      
      // Hide panel with slight delay for smooth UX
      setTimeout(() => {
        hidePanel();
        hideMiniIndicator();
      }, 500);
    }
  }, 500);
  
  // Fallback: Hide after max time if completion detection fails
  setTimeout(() => {
    if (isWaitingForCompletion) {
      console.log('[History Context UI] Fallback timeout, hiding panel');
      if (checkInterval) clearInterval(checkInterval);
      if (completionObserver) completionObserver.disconnect();
      isWaitingForCompletion = false;
      hidePanel();
      hideMiniIndicator();
    }
  }, 60000); // 60 second max
}

/**
 * Manually signal that AI response is complete
 * Call this from your AI response handler
 */
function onAIResponseComplete(): void {
  console.log('[History Context UI] AI response complete signal received');
  isWaitingForCompletion = false;
  
  if (completionObserver) {
    completionObserver.disconnect();
    completionObserver = null;
  }
  
  // Hide with animation
  setTimeout(() => {
    hidePanel();
    hideMiniIndicator();
  }, 800); // Small delay so user can see the panel updated
}

// ============================================================================
// STYLES INJECTION
// ============================================================================

function injectHistoryContextStyles(): void {
  if (document.getElementById('history-context-ui-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'history-context-ui-styles';
  style.textContent = `
    /* ========================================
       HISTORY CONTEXT PANEL
       ======================================== */
    
    .hc-panel-overlay {
      position: fixed;
      bottom: 80px;
      right: 20px;
      z-index: 10001;
      pointer-events: none;
    }
    
    .hc-panel {
      background: linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(31, 41, 55, 0.98));
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 12px;
      box-shadow: 
        0 20px 40px rgba(0, 0, 0, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.05),
        0 0 30px rgba(99, 102, 241, 0.15);
      backdrop-filter: blur(20px);
      width: 380px;
      max-height: 400px;
      overflow: hidden;
      pointer-events: auto;
      transform-origin: bottom right;
      animation: hc-panel-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    .hc-panel.hc-panel-closing {
      animation: hc-panel-out 0.25s ease-in forwards;
    }
    
    @keyframes hc-panel-in {
      0% {
        opacity: 0;
        transform: scale(0.9) translateY(20px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    
    @keyframes hc-panel-out {
      0% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      100% {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
      }
    }
    
    /* ========================================
       PANEL HEADER
       ======================================== */
    
    .hc-panel-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: linear-gradient(90deg, rgba(99, 102, 241, 0.15), transparent);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    
    .hc-panel-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
    
    .hc-panel-title-group {
      flex: 1;
    }
    
    .hc-panel-title {
      font-size: 13px;
      font-weight: 600;
      color: #e5e7eb;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .hc-panel-subtitle {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 2px;
    }
    
    .hc-panel-badge {
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }
    
    .hc-panel-close {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: none;
      background: rgba(255, 255, 255, 0.05);
      color: #9ca3af;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    
    .hc-panel-close:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }
    
    /* ========================================
       SEARCHING STATE
       ======================================== */
    
    .hc-searching {
      padding: 30px 20px;
      text-align: center;
    }
    
    .hc-searching-spinner {
      width: 48px;
      height: 48px;
      margin: 0 auto 16px;
      position: relative;
    }
    
    .hc-searching-spinner::before {
      content: '';
      position: absolute;
      inset: 0;
      border: 3px solid rgba(99, 102, 241, 0.2);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: hc-spin 0.8s linear infinite;
    }
    
    .hc-searching-spinner::after {
      content: '📚';
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      animation: hc-pulse 1s ease-in-out infinite;
    }
    
    @keyframes hc-spin {
      to { transform: rotate(360deg); }
    }
    
    @keyframes hc-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }
    
    .hc-searching-text {
      color: #d1d5db;
      font-size: 13px;
      font-weight: 500;
    }
    
    .hc-searching-subtext {
      color: #6b7280;
      font-size: 11px;
      margin-top: 4px;
    }
    
    /* ========================================
       RESULTS LIST
       ======================================== */
    
    .hc-results {
      max-height: 280px;
      overflow-y: auto;
      padding: 8px;
    }
    
    .hc-results::-webkit-scrollbar {
      width: 6px;
    }
    
    .hc-results::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .hc-results::-webkit-scrollbar-thumb {
      background: rgba(99, 102, 241, 0.3);
      border-radius: 3px;
    }
    
    .hc-result-item {
      padding: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.15s;
      animation: hc-result-in 0.3s ease-out backwards;
    }
    
    .hc-result-item:nth-child(1) { animation-delay: 0.05s; }
    .hc-result-item:nth-child(2) { animation-delay: 0.1s; }
    .hc-result-item:nth-child(3) { animation-delay: 0.15s; }
    .hc-result-item:nth-child(4) { animation-delay: 0.2s; }
    .hc-result-item:nth-child(5) { animation-delay: 0.25s; }
    
    @keyframes hc-result-in {
      from {
        opacity: 0;
        transform: translateX(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    .hc-result-item:hover {
      background: rgba(99, 102, 241, 0.1);
      border-color: rgba(99, 102, 241, 0.3);
    }
    
    .hc-result-item:last-child {
      margin-bottom: 0;
    }
    
    .hc-result-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    
    .hc-result-time {
      font-size: 10px;
      color: #9ca3af;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .hc-result-relevance {
      margin-left: auto;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .hc-result-relevance.high {
      background: rgba(34, 197, 94, 0.2);
      color: #4ade80;
    }
    
    .hc-result-relevance.medium {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
    }
    
    .hc-result-relevance.low {
      background: rgba(156, 163, 175, 0.2);
      color: #9ca3af;
    }
    
    .hc-result-preview {
      font-size: 12px;
      color: #d1d5db;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .hc-result-keywords {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 8px;
    }
    
    .hc-result-keyword {
      background: rgba(99, 102, 241, 0.15);
      color: #a5b4fc;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
    }
    
    /* ========================================
       NO RESULTS STATE
       ======================================== */
    
    .hc-no-results {
      padding: 30px 20px;
      text-align: center;
    }
    
    .hc-no-results-icon {
      font-size: 32px;
      margin-bottom: 12px;
      opacity: 0.5;
    }
    
    .hc-no-results-text {
      color: #9ca3af;
      font-size: 13px;
    }
    
    /* ========================================
       PANEL FOOTER
       ======================================== */
    
    .hc-panel-footer {
      padding: 10px 16px;
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .hc-footer-text {
      font-size: 10px;
      color: #6b7280;
    }
    
    .hc-footer-status {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #a5b4fc;
    }
    
    .hc-footer-spinner {
      width: 10px;
      height: 10px;
      border: 2px solid rgba(99, 102, 241, 0.3);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: hc-spin 0.8s linear infinite;
    }
    
    .hc-footer-action {
      font-size: 11px;
      color: #6366f1;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.15s;
    }
    
    .hc-footer-action:hover {
      background: rgba(99, 102, 241, 0.1);
    }
    
    /* ========================================
       MINI INDICATOR (for quick feedback)
       ======================================== */
    
    .hc-mini-indicator {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      background: rgba(17, 24, 39, 0.95);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 25px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      animation: hc-mini-in 0.25s ease-out;
    }
    
    .hc-mini-indicator.hc-mini-hiding {
      animation: hc-mini-out 0.2s ease-in forwards;
    }
    
    @keyframes hc-mini-in {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(10px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
      }
    }
    
    @keyframes hc-mini-out {
      to {
        opacity: 0;
        transform: translateX(-50%) translateY(-10px) scale(0.95);
      }
    }
    
    .hc-mini-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(99, 102, 241, 0.3);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: hc-spin 0.6s linear infinite;
    }
    
    .hc-mini-check {
      width: 16px;
      height: 16px;
      background: #22c55e;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 10px;
      animation: hc-check-pop 0.3s ease-out;
    }
    
    @keyframes hc-check-pop {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    
    .hc-mini-text {
      font-size: 12px;
      color: #d1d5db;
      font-weight: 500;
    }
    
    .hc-mini-count {
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }
    
    .hc-mini-count.success {
      background: rgba(34, 197, 94, 0.2);
      color: #4ade80;
    }
  `;
  
  document.head.appendChild(style);
  console.log('[History Context UI] Styles injected');
}

// ============================================================================
// PANEL CREATION
// ============================================================================

interface HistoryResult {
  id: string;
  timeAgo: string;
  preview: string;
  userMessage: string;
  relevance: 'high' | 'medium' | 'low';
  relevanceScore: number;
  matchedKeywords: string[];
}

let currentPanel: HTMLElement | null = null;
let panelTimeout: number | null = null;

/**
 * Show searching state panel
 */
function showSearchingPanel(): void {
  injectHistoryContextStyles();
  removeExistingPanel();
  
  const overlay = document.createElement('div');
  overlay.className = 'hc-panel-overlay';
  overlay.id = 'hc-panel-overlay';
  
  overlay.innerHTML = `
    <div class="hc-panel">
      <div class="hc-panel-header">
        <div class="hc-panel-icon">📚</div>
        <div class="hc-panel-title-group">
          <div class="hc-panel-title">
            Searching History
            <span class="hc-panel-badge">AI</span>
          </div>
          <div class="hc-panel-subtitle">Finding relevant past conversations...</div>
        </div>
        <button class="hc-panel-close" onclick="window.hideHistoryContextPanel()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="hc-searching">
        <div class="hc-searching-spinner"></div>
        <div class="hc-searching-text">Analyzing your message...</div>
        <div class="hc-searching-subtext">Matching against conversation history</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  currentPanel = overlay;
}

/**
 * Update panel with results
 */
function showResultsPanel(results: HistoryResult[], triggerReason: string): void {
  injectHistoryContextStyles();
  removeExistingPanel();
  
  const overlay = document.createElement('div');
  overlay.className = 'hc-panel-overlay';
  overlay.id = 'hc-panel-overlay';
  
  const resultsHtml = results.length > 0 
    ? results.map((r, idx) => `
        <div class="hc-result-item" data-index="${idx}">
          <div class="hc-result-header">
            <span class="hc-result-time">📅 ${escapeHtml(r.timeAgo)}</span>
            <span class="hc-result-relevance ${r.relevance}">${r.relevance}</span>
          </div>
          <div class="hc-result-preview">${escapeHtml(truncate(r.preview || r.userMessage, UI_CONFIG.maxPreviewChars))}</div>
          ${r.matchedKeywords && r.matchedKeywords.length > 0 ? `
            <div class="hc-result-keywords">
              ${r.matchedKeywords.slice(0, 4).map(k => `<span class="hc-result-keyword">${escapeHtml(k)}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')
    : `
        <div class="hc-no-results">
          <div class="hc-no-results-icon">🔍</div>
          <div class="hc-no-results-text">No relevant history found</div>
        </div>
      `;
  
  overlay.innerHTML = `
    <div class="hc-panel">
      <div class="hc-panel-header">
        <div class="hc-panel-icon">✨</div>
        <div class="hc-panel-title-group">
          <div class="hc-panel-title">
            Context Found
            <span class="hc-panel-badge">${results.length}</span>
          </div>
          <div class="hc-panel-subtitle">${escapeHtml(triggerReason)}</div>
        </div>
        <button class="hc-panel-close" onclick="window.hideHistoryContextPanel()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="hc-results">
        ${resultsHtml}
      </div>
      <div class="hc-panel-footer">
        <span class="hc-footer-text">
          <span class="hc-footer-status">
            <span class="hc-footer-spinner"></span>
            Waiting for AI response...
          </span>
        </span>
        <button class="hc-footer-action" onclick="window.hideHistoryContextPanel()">Dismiss</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  currentPanel = overlay;
  
  // Start watching for AI response completion
  watchForAICompletion();
  
  // Only auto-hide if configured to do so (fallback)
  if (UI_CONFIG.autoHide) {
    if (panelTimeout) clearTimeout(panelTimeout);
    panelTimeout = window.setTimeout(() => {
      hidePanel();
    }, UI_CONFIG.panelDisplayTime);
  }
  // Otherwise panel stays until AI response completes or user clicks X/Dismiss
}

/**
 * Show mini indicator (less intrusive)
 */
function showMiniIndicator(searching: boolean, resultCount?: number, message?: string): void {
  injectHistoryContextStyles();
  
  // Remove existing mini indicator
  const existing = document.getElementById('hc-mini-indicator');
  if (existing) existing.remove();
  
  const indicator = document.createElement('div');
  indicator.className = 'hc-mini-indicator';
  indicator.id = 'hc-mini-indicator';
  
  if (searching) {
    indicator.innerHTML = `
      <div class="hc-mini-spinner"></div>
      <span class="hc-mini-text">${message || 'Searching history...'}</span>
    `;
  } else {
    indicator.innerHTML = `
      <div class="hc-mini-check">✓</div>
      <span class="hc-mini-text">${message || `Found ${resultCount} relevant chat${resultCount !== 1 ? 's' : ''}`}</span>
      <span class="hc-mini-count success">${resultCount}</span>
    `;
    
    // Start watching for AI completion (don't auto-hide)
    watchForAICompletion();
  }
  
  document.body.appendChild(indicator);
}

/**
 * Hide mini indicator
 */
function hideMiniIndicator(): void {
  const indicator = document.getElementById('hc-mini-indicator');
  if (indicator) {
    indicator.classList.add('hc-mini-hiding');
    setTimeout(() => indicator.remove(), 200);
  }
}

/**
 * Hide panel with animation
 */
function hidePanel(): void {
  if (currentPanel) {
    const panel = currentPanel.querySelector('.hc-panel');
    if (panel) {
      panel.classList.add('hc-panel-closing');
      setTimeout(() => {
        currentPanel?.remove();
        currentPanel = null;
      }, 250);
    } else {
      currentPanel.remove();
      currentPanel = null;
    }
  }
  
  if (panelTimeout) {
    clearTimeout(panelTimeout);
    panelTimeout = null;
  }
}

/**
 * Remove existing panel immediately
 */
function removeExistingPanel(): void {
  const existing = document.getElementById('hc-panel-overlay');
  if (existing) existing.remove();
  currentPanel = null;
  
  if (panelTimeout) {
    clearTimeout(panelTimeout);
    panelTimeout = null;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// ============================================================================
// INTEGRATION WITH aiHistorySearch.ts
// ============================================================================

/**
 * Enhanced version of intelligentHistorySearch that shows UI
 */
function intelligentHistorySearchWithUI(message: string): any {
  const aiHistorySearch = (window as any).aiHistorySearch;
  if (!aiHistorySearch) {
    console.warn('[History Context UI] aiHistorySearch module not found');
    return null;
  }
  
  // Check if should search
  const { should, reason } = aiHistorySearch.shouldSearchHistory(message);
  
  if (!should) {
    console.log('[History Context UI] No search needed:', reason);
    return {
      shouldSearch: false,
      triggerReason: reason,
      results: [],
      contextString: ''
    };
  }
  
  // Show searching indicator
  showMiniIndicator(true, undefined, 'Searching conversation history...');
  
  // Perform search
  const results = aiHistorySearch.searchHistory(message);
  
  // Hide searching, show results
  hideMiniIndicator();
  
  if (results.length > 0) {
    // Show results mini indicator
    showMiniIndicator(false, results.length);
    
    // Optionally show full panel for multiple results
    if (results.length >= 2) {
      setTimeout(() => {
        showResultsPanel(
          results.map((r: any) => ({
            id: r.entry?.id || '',
            timeAgo: getTimeAgo(r.entry?.timestamp || Date.now()),
            preview: r.entry?.userMessage || '',
            userMessage: r.entry?.userMessage || '',
            relevance: r.relevanceScore >= 0.5 ? 'high' : r.relevanceScore >= 0.3 ? 'medium' : 'low',
            relevanceScore: r.relevanceScore,
            matchedKeywords: r.matchedKeywords || []
          })),
          reason
        );
      }, 500);
    }
  } else {
    showMiniIndicator(false, 0, 'No relevant history found');
  }
  
  // Build context (but DON'T inject into chat as raw text)
  const contextString = results.length > 0 
    ? aiHistorySearch.buildHistoryContext(results)
    : '';
  
  return {
    shouldSearch: true,
    triggerReason: reason,
    results,
    contextString
  };
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return `${Math.floor(seconds / 604800)} weeks ago`;
}

// ============================================================================
// WINDOW EXPORTS
// ============================================================================

(window as any).historyContextUI = {
  showSearchingPanel,
  showResultsPanel,
  showMiniIndicator,
  hideMiniIndicator,
  hidePanel,
  intelligentHistorySearchWithUI,
  watchForAICompletion,
  onAIResponseComplete,
  config: UI_CONFIG
};

// Export for direct use
(window as any).showHistoryContextPanel = showResultsPanel;
(window as any).hideHistoryContextPanel = hidePanel;
(window as any).showHistorySearching = () => showMiniIndicator(true);
(window as any).showHistoryResults = (count: number) => showMiniIndicator(false, count);
(window as any).onAIResponseComplete = onAIResponseComplete;

// ============================================================================
// OVERRIDE DEFAULT INDICATOR IN aiHistorySearch.ts
// ============================================================================

function overrideDefaultIndicators(): void {
  // Replace the default indicator functions in aiHistorySearch
  if ((window as any).aiHistorySearch) {
    const original = (window as any).aiHistorySearch;
    
    // Override showHistorySearchIndicator
    original.showHistorySearchIndicator = () => {
      showMiniIndicator(true, undefined, 'Searching history...');
    };
    
    // Override updateHistorySearchIndicator
    original.updateHistorySearchIndicator = (message: string, count?: number) => {
      if (count !== undefined && count > 0) {
        hideMiniIndicator();
        showMiniIndicator(false, count, message);
      }
    };
    
    // Override hideHistorySearchIndicator
    original.hideHistorySearchIndicator = (delay: number = 2000) => {
      setTimeout(() => hideMiniIndicator(), delay);
    };
    
    console.log('[History Context UI] Overridden default indicators');
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init(): void {
  console.log('🎨 [History Context UI] Initializing...');
  
  injectHistoryContextStyles();
  
  // Wait for aiHistorySearch to load, then override indicators
  const checkAndOverride = () => {
    if ((window as any).aiHistorySearch) {
      overrideDefaultIndicators();
    } else {
      setTimeout(checkAndOverride, 500);
    }
  };
  
  setTimeout(checkAndOverride, 100);
  
  console.log('✅ [History Context UI] Ready!');
  console.log('   Test: window.historyContextUI.showMiniIndicator(true)');
  console.log('   Test: window.historyContextUI.showResultsPanel([...], "test")');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  showSearchingPanel,
  showResultsPanel,
  showMiniIndicator,
  hideMiniIndicator,
  hidePanel,
  intelligentHistorySearchWithUI,
  watchForAICompletion,
  onAIResponseComplete,
  UI_CONFIG
};
