// conversationSearchUI.ts - Search UI with AI-Powered Search
// ============================================================================
// v22 - Instant AI notice, skeleton loading, faster debounce
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

interface SearchUIState {
  isOpen: boolean;
  query: string;
  scope: 'current' | 'all';
  selectedIndex: number;
  totalMatches: number;
  isSearching: boolean;
}

interface MatchInfo {
  messageEl: HTMLElement | null;
  highlightEl: HTMLElement | null;
  preview: string;
  timestamp: string;
  messageIndex: number;
  isAIResult?: boolean;
  relevanceScore?: number;
}

interface AISearchResult {
  messageIndex: number;
  preview: string;
  relevance: string;
  timestamp: string;
}

interface ApiConfig {
  provider: string;
  apiKey: string;
  apiBaseUrl: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

// ============================================================================
// OPERATOR X02 CONFIG
// ============================================================================

const OPERATOR_X02_CONFIG: ApiConfig = {
  provider: 'operator_x02',
  apiKey: 'PROXY',
  apiBaseUrl: 'PROXY',
  model: 'x02-coder',
  maxTokens: 2000,
  temperature: 0.3
};

// ============================================================================
// API HELPERS
// ============================================================================

function getApiConfig(): ApiConfig {
  try {
    const configStr = localStorage.getItem('aiApiConfig');
    if (configStr) {
      const config = JSON.parse(configStr);
      if (config.provider && config.apiKey && config.apiBaseUrl) {
        return {
          provider: config.provider,
          apiKey: config.apiKey,
          apiBaseUrl: config.apiBaseUrl,
          model: config.model || 'x02-coder',
          maxTokens: 2000,
          temperature: 0.3
        };
      }
    }
  } catch (e) {}
  return OPERATOR_X02_CONFIG;
}

async function callAIViaTauri(message: string, config: ApiConfig): Promise<string> {
  const tauri = (window as any).__TAURI__;
  if (!tauri?.core?.invoke) throw new Error('Tauri not available');

  const response = await tauri.core.invoke('call_ai_api', {
    request: {
      provider: config.provider,
      api_key: config.apiKey,
      base_url: config.apiBaseUrl,
      model: config.model,
      message: message,
      max_tokens: config.maxTokens || 2000,
      temperature: config.temperature || 0.3
    }
  });

  return typeof response === 'string' ? response : JSON.stringify(response);
}

async function callAIViaFetch(message: string, config: ApiConfig): Promise<string> {
  const response = await fetch(config.apiBaseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: 'You are a search assistant.' },
        { role: 'user', content: message }
      ],
      max_tokens: config.maxTokens || 2000,
      temperature: config.temperature || 0.3
    })
  });

  if (!response.ok) throw new Error(`API Error ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ============================================================================
// SEARCH UI MANAGER
// ============================================================================

class ConversationSearchUI {
  private state: SearchUIState = {
    isOpen: false,
    query: '',
    scope: 'current',
    selectedIndex: -1,
    totalMatches: 0,
    isSearching: false
  };

  private container: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private resultsContainer: HTMLElement | null = null;
  private stylesInjected = false;
  private matches: MatchInfo[] = [];
  private searchTimeout: number | null = null;
  private usedAIFallback = false;

  initialize(): void {
    this.injectStyles();
    this.setupKeyboardShortcuts();
    console.log('✅ Conversation Search UI v22 initialized (Instant AI feedback)');
  }

  // ============================================================================
  // UI CREATION
  // ============================================================================

  private createSearchPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'conversation-search-panel';
    panel.className = 'conv-search-panel';
    panel.innerHTML = `
      <div class="conv-search-header">
        <div class="conv-search-input-wrapper">
          <svg class="conv-search-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="M21 21l-4.35-4.35"></path>
          </svg>
          <input 
            type="text" 
            class="conv-search-input" 
            placeholder="Search..." 
            autocomplete="off"
            spellcheck="false"
          />
          <span class="conv-search-count"></span>
          <span class="conv-search-loading">
            <svg width="12" height="12" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4" stroke-linecap="round">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
              </circle>
            </svg>
          </span>
        </div>
        <div class="conv-search-controls">
          <div class="conv-search-scope-toggle">
            <button class="conv-search-scope-btn active" data-scope="current" title="Search current conversation">
              This Chat
            </button>
            <button class="conv-search-scope-btn" data-scope="all" title="Search all conversations">
              All Chats
            </button>
          </div>
          <button class="conv-search-close-btn" title="Close (Esc)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="conv-search-results">
        <div class="conv-search-results-list"></div>
      </div>
    `;
    return panel;
  }

  // ============================================================================
  // SHOW/HIDE
  // ============================================================================

  show(): void {
    if (this.state.isOpen) {
      this.searchInput?.focus();
      this.searchInput?.select();
      return;
    }

    const chatContainer = document.querySelector('.ai-chat-container');
    const chatPanel = chatContainer?.parentElement || 
                      document.querySelector('.ai-assistant-panel') ||
                      document.querySelector('.chat-panel');
    
    if (!chatPanel) {
      console.warn('Could not find chat panel');
      return;
    }

    this.container = this.createSearchPanel();
    
    if (chatContainer) {
      chatPanel.insertBefore(this.container, chatContainer);
    } else {
      chatPanel.prepend(this.container);
    }

    this.searchInput = this.container.querySelector('.conv-search-input');
    this.resultsContainer = this.container.querySelector('.conv-search-results-list');

    this.setupEventListeners();
    this.state.isOpen = true;
    this.state.scope = 'current';
    this.usedAIFallback = false;
    this.updateScopeButtons();

    requestAnimationFrame(() => {
      this.container?.classList.add('visible');
      setTimeout(() => this.searchInput?.focus(), 150);
    });
  }

  hide(): void {
    if (!this.state.isOpen) return;

    this.container?.classList.remove('visible');
    this.container?.classList.add('closing');
    
    setTimeout(() => {
      this.container?.remove();
      this.container = null;
      this.searchInput = null;
      this.resultsContainer = null;
    }, 250);

    this.state.isOpen = false;
    this.state.query = '';
    this.state.selectedIndex = -1;
    this.state.totalMatches = 0;
    this.matches = [];
    this.usedAIFallback = false;
    this.clearAllHighlights();
  }

  toggle(): void {
    this.state.isOpen ? this.hide() : this.show();
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private setupEventListeners(): void {
    if (!this.container) return;

    this.searchInput?.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value;
      this.state.query = query;
      this.usedAIFallback = false;

      if (this.searchTimeout) clearTimeout(this.searchTimeout);
      
      // Show loading immediately for "All Chats" mode
      if (this.state.scope === 'all' && query.trim().length >= 2) {
        this.showLoading(true);
        this.showAllChatsSearchingNotice();
      }
      
      // Faster debounce for All Chats (100ms), normal for This Chat (250ms)
      const debounceMs = this.state.scope === 'all' ? 100 : 250;
      this.searchTimeout = window.setTimeout(() => this.performSearch(), debounceMs);
    });

    this.searchInput?.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          if (this.searchTimeout) clearTimeout(this.searchTimeout);
          if (this.state.selectedIndex >= 0) {
            this.goToMatch(this.state.selectedIndex);
          } else {
            this.performSearch();
          }
          break;
        case 'Escape':
          e.preventDefault();
          this.hide();
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.selectNextMatch();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.selectPrevMatch();
          break;
      }
    });

    // Scope buttons
    this.container.querySelectorAll('.conv-search-scope-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const scope = btn.getAttribute('data-scope') as 'current' | 'all';
        this.setScope(scope);
      });
    });

    this.container.querySelector('.conv-search-close-btn')?.addEventListener('click', () => this.hide());

    this.resultsContainer?.addEventListener('click', (e) => {
      const resultItem = (e.target as HTMLElement).closest('.conv-search-result-item');
      if (resultItem) {
        const index = parseInt(resultItem.getAttribute('data-index') || '0');
        this.state.selectedIndex = index;
        this.updateSelectedResultUI();
        this.goToMatch(index);
      }
    });
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        const chatPanel = document.querySelector('.ai-assistant-panel');
        if (chatPanel && getComputedStyle(chatPanel).display !== 'none') {
          e.preventDefault();
          this.show();
        }
      }
    });
  }

  // ============================================================================
  // SCOPE MANAGEMENT
  // ============================================================================

  private setScope(scope: 'current' | 'all'): void {
    this.state.scope = scope;
    this.updateScopeButtons();
    
    if (scope === 'all') {
      // ✅ Use aiHistorySearch for "All Chats" search
      if (this.state.query) {
        this.performAllChatsSearch();
      } else {
        this.showNoResults('Type to search all conversations...');
      }
    } else if (this.state.query) {
      this.performSearch();
    }
  }

  private updateScopeButtons(): void {
    this.container?.querySelectorAll('.conv-search-scope-btn').forEach(btn => {
      const btnScope = btn.getAttribute('data-scope');
      btn.classList.toggle('active', btnScope === this.state.scope);
    });
  }

  // ============================================================================
  // UNIFIED SEARCH (Text first, then AI fallback)
  // ============================================================================

  private async performSearch(): Promise<void> {
    // ✅ Route to All Chats search if that scope is selected
    if (this.state.scope === 'all') {
      await this.performAllChatsSearch();
      return;
    }

    const query = this.state.query.trim().toLowerCase();
    
    this.clearAllHighlights();
    this.matches = [];
    this.state.selectedIndex = -1;
    this.state.totalMatches = 0;
    this.usedAIFallback = false;
    
    if (query.length < 1) {
      this.updateCount();
      this.renderResults();
      return;
    }

    // Step 1: Text search
    this.performTextSearch(query);

    if (this.matches.length > 0) {
      this.state.totalMatches = this.matches.length;
      this.state.selectedIndex = 0;
      this.updateCount();
      this.renderResults();
      this.markCurrentMatch(0);
      return;
    }

    // Step 2: AI fallback (if no text results and query >= 3 chars)
    if (query.length >= 3) {
      this.usedAIFallback = true;
      await this.performAISearch();
    } else {
      this.updateCount();
      this.renderResults();
    }
  }

  // ============================================================================
  // TEXT SEARCH
  // ============================================================================

  private performTextSearch(query: string): void {
    const chatContainer = this.getChatScrollContainer();
    if (!chatContainer) return;

    const messageSelectors = ['.ai-message', '.assistant-message', '.user-message', '[data-message-id]'];
    let allMessages: Element[] = [];
    
    for (const selector of messageSelectors) {
      const found = chatContainer.querySelectorAll(selector);
      if (found.length > 0) {
        allMessages = Array.from(found);
        break;
      }
    }

    if (allMessages.length === 0) {
      allMessages = Array.from(chatContainer.children).filter(el => 
        el.textContent && el.textContent.length > 20
      );
    }

    allMessages.forEach((messageEl, msgIndex) => {
      this.searchInMessage(messageEl as HTMLElement, query, msgIndex);
    });
  }

  private searchInMessage(messageEl: HTMLElement, query: string, msgIndex: number): void {
    const fullText = messageEl.textContent || '';
    if (!fullText.toLowerCase().includes(query)) return;

    const contentSelectors = ['.ai-message-content', '.message-content', '.user-message-content', 'p', 'span', 'div'];
    let contentEl: HTMLElement | null = null;
    
    for (const selector of contentSelectors) {
      contentEl = messageEl.querySelector(selector) as HTMLElement;
      if (contentEl && contentEl.textContent?.toLowerCase().includes(query)) break;
    }

    if (!contentEl) contentEl = messageEl;
    this.highlightMatchesInElement(contentEl, query, messageEl, msgIndex);
  }

  private highlightMatchesInElement(contentEl: HTMLElement, query: string, messageEl: HTMLElement, msgIndex: number): void {
    const textWalker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent || parent.classList.contains('search-highlight-text')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes: Text[] = [];
    let node: Text | null;
    while ((node = textWalker.nextNode() as Text | null)) textNodes.push(node);

    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      const lowerText = text.toLowerCase();
      
      const positions: number[] = [];
      let pos = 0;
      while ((pos = lowerText.indexOf(query, pos)) !== -1) {
        positions.push(pos);
        pos++;
      }

      if (positions.length === 0) continue;

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      for (const startIdx of positions) {
        if (startIdx > lastIndex) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex, startIdx)));
        }
        
        const highlight = document.createElement('mark');
        highlight.className = 'search-highlight-text';
        highlight.textContent = text.substring(startIdx, startIdx + query.length);
        fragment.appendChild(highlight);
        
        const previewStart = Math.max(0, startIdx - 30);
        const previewEnd = Math.min(text.length, startIdx + query.length + 50);
        const preview = (previewStart > 0 ? '...' : '') + 
                        text.substring(previewStart, previewEnd).trim() + 
                        (previewEnd < text.length ? '...' : '');

        this.matches.push({ 
          messageEl, 
          highlightEl: highlight, 
          preview, 
          timestamp: this.getMessageTimestamp(messageEl),
          messageIndex: msgIndex,
          isAIResult: false
        });
        
        lastIndex = startIdx + query.length;
      }

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
      }

      textNode.parentNode?.replaceChild(fragment, textNode);
    }
  }

  private getMessageTimestamp(messageEl: HTMLElement): string {
    const timeEl = messageEl.querySelector('.message-time, .timestamp, time, [data-time]');
    return timeEl?.textContent?.trim() || '';
  }

  private clearAllHighlights(): void {
    const parents = new Set<HTMLElement>();
    
    document.querySelectorAll('.search-current-result').forEach(el => el.classList.remove('search-current-result'));
    document.querySelectorAll('.search-highlight-text').forEach(el => {
      if (el.parentElement) parents.add(el.parentElement);
      el.replaceWith(document.createTextNode(el.textContent || ''));
    });
    parents.forEach(p => p.normalize());
    document.querySelectorAll('.search-highlight-message').forEach(el => el.classList.remove('search-highlight-message'));
  }

  // ============================================================================
  // AI SEARCH
  // ============================================================================

  private async performAISearch(): Promise<void> {
    const query = this.state.query.trim();
    if (query.length < 2) return;

    const config = getApiConfig();
    this.state.isSearching = true;
    this.showLoading(true);

    try {
      const messages = this.gatherChatMessages();
      if (messages.length === 0) {
        this.showNoResults('No messages to search');
        return;
      }

      const aiResults = await this.callAISearchAPI(query, messages, config);

      this.matches = [];
      for (const result of aiResults) {
        const messageEl = this.getMessageElementByIndex(result.messageIndex);
        this.matches.push({
          messageEl,
          highlightEl: null,
          preview: result.preview,
          timestamp: `Message #${result.messageIndex + 1}`,
          messageIndex: result.messageIndex,
          isAIResult: true,
          relevanceScore: this.parseRelevanceScore(result.relevance)
        });
      }

      this.matches.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      this.state.totalMatches = this.matches.length;
      this.state.selectedIndex = this.matches.length > 0 ? 0 : -1;

      this.updateCount();
      this.renderResults();

    } catch (error: any) {
      console.error('AI Search error:', error);
      this.showNoResults('Search failed. Try again.');
    } finally {
      this.state.isSearching = false;
      this.showLoading(false);
    }
  }

  private async callAISearchAPI(query: string, messages: { role: string; content: string; index: number }[], config: ApiConfig): Promise<AISearchResult[]> {
    const messagesContext = messages.map(msg => 
      `[Message ${msg.index}] (${msg.role}): ${msg.content.substring(0, 300)}${msg.content.length > 300 ? '...' : ''}`
    ).join('\n\n');

    const prompt = `You are a search assistant. Find relevant messages for the user's query.

RESPOND ONLY WITH JSON ARRAY. No other text.

Each result: {"messageIndex": X, "preview": "brief excerpt", "relevance": "high/medium/low"}

If nothing relevant: []

Query: "${query}"

Messages:
${messagesContext}

Return JSON:`;

    try {
      const response = await callAIViaTauri(prompt, config);
      return this.parseAIResponse(response);
    } catch {
      const response = await callAIViaFetch(prompt, config);
      return this.parseAIResponse(response);
    }
  }

  private parseAIResponse(content: string): AISearchResult[] {
    try {
      let clean = content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const match = clean.match(/\[[\s\S]*?\]/);
      if (match) clean = match[0];
      
      const results = JSON.parse(clean);
      if (Array.isArray(results)) {
        return results.map(r => ({
          messageIndex: typeof r.messageIndex === 'number' ? r.messageIndex : parseInt(r.messageIndex) || 0,
          preview: r.preview || '',
          relevance: r.relevance || 'low',
          timestamp: ''
        })).filter(r => r.preview);
      }
      return [];
    } catch {
      return [];
    }
  }

  private gatherChatMessages(): { role: string; content: string; index: number }[] {
    const chatContainer = this.getChatScrollContainer();
    if (!chatContainer) return [];

    const messages: { role: string; content: string; index: number }[] = [];
    const selectors = ['.ai-message', '.assistant-message', '.user-message', '[data-message-id]'];
    
    let messageEls: NodeListOf<Element> | null = null;
    for (const selector of selectors) {
      const found = chatContainer.querySelectorAll(selector);
      if (found.length > 0) { messageEls = found; break; }
    }

    messageEls?.forEach((el, index) => {
      const isUser = el.classList.contains('user-message') || el.getAttribute('data-role') === 'user';
      const content = el.textContent?.trim() || '';
      if (content.length > 10) {
        messages.push({ role: isUser ? 'user' : 'assistant', content, index });
      }
    });

    return messages;
  }

  private getMessageElementByIndex(index: number): HTMLElement | null {
    const chatContainer = this.getChatScrollContainer();
    if (!chatContainer) return null;
    
    const selectors = ['.ai-message', '.assistant-message', '.user-message', '[data-message-id]'];
    for (const selector of selectors) {
      const els = chatContainer.querySelectorAll(selector);
      if (els.length > 0 && els[index]) return els[index] as HTMLElement;
    }
    return null;
  }

  private parseRelevanceScore(relevance: string): number {
    switch (relevance?.toLowerCase()) {
      case 'high': return 3;
      case 'medium': return 2;
      default: return 1;
    }
  }

  // ============================================================================
  // ALL CHATS SEARCH - Uses aiHistorySearch.ts
  // ============================================================================

  private async performAllChatsSearch(): Promise<void> {
    const query = this.state.query.trim();
    
    if (query.length < 2) {
      this.showNoResults('Type at least 2 characters to search all chats...');
      return;
    }

    this.clearAllHighlights();
    this.matches = [];
    this.state.selectedIndex = -1;
    this.state.totalMatches = 0;
    this.state.isSearching = true;
    this.showLoading(true);

    try {
      // Try to use aiHistorySearch module
      const searchFn = (window as any).searchAllChatsHistoryWithAI || 
                       (window as any).searchAllChatsHistory ||
                       (window as any).aiHistorySearch?.searchAllChatsWithAI ||
                       (window as any).aiHistorySearch?.searchAllChats;
      
      if (!searchFn) {
        this.showNoResults('History search module not loaded. Import aiHistorySearch.ts');
        return;
      }

      const results = await searchFn(query);
      
      if (!results || results.length === 0) {
        this.showNoResults(`No results found in past conversations for "${this.escapeHtml(query)}"`);
        return;
      }

      // Convert to MatchInfo format for display
      this.matches = results.map((result: any, index: number) => ({
        messageEl: null,
        highlightEl: null,
        preview: result.preview || result.userMessage?.substring(0, 100) || '',
        timestamp: result.timeAgo || this.formatTimestamp(result.timestamp),
        messageIndex: index,
        isAIResult: true,
        relevanceScore: this.parseRelevanceScore(result.relevance),
        // Store extra data for "All Chats" results
        allChatsData: result
      }));

      this.state.totalMatches = this.matches.length;
      this.state.selectedIndex = this.matches.length > 0 ? 0 : -1;
      this.usedAIFallback = true;

      this.updateCount();
      this.renderAllChatsResults();

    } catch (error: any) {
      console.error('[Search] All Chats search error:', error);
      this.showNoResults('Search failed. Please try again.');
    } finally {
      this.state.isSearching = false;
      this.showLoading(false);
    }
  }

  private formatTimestamp(timestamp: number): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  private renderAllChatsResults(): void {
    if (!this.resultsContainer) return;
    
    const resultsPanel = this.container?.querySelector('.conv-search-results') as HTMLElement;
    if (resultsPanel) resultsPanel.style.display = 'block';
    
    // Add "AI-powered" header
    let html = `
      <div class="conv-search-ai-notice">
        <span class="conv-search-ai-icon">⚡</span>
        <span>AI-powered by <strong>Operator X02</strong></span>
      </div>
    `;
    
    html += this.matches.map((match, idx) => {
      const relevanceClass = match.relevanceScore === 3 ? 'relevance-high' : 
                            match.relevanceScore === 2 ? 'relevance-medium' : 'relevance-low';
      const relevanceLabel = match.relevanceScore === 3 ? 'HIGH' : 
                            match.relevanceScore === 2 ? 'MED' : 'LOW';
      const selectedClass = idx === this.state.selectedIndex ? 'selected' : '';
      const allChatsData = (match as any).allChatsData;
      
      return `
        <div class="conv-search-result-item ${selectedClass} ${relevanceClass}" 
             data-index="${idx}" 
             data-conversation-id="${allChatsData?.conversationId || ''}"
             style="animation-delay: ${idx * 30}ms">
          <div class="conv-search-result-header">
            <span class="conv-search-result-time">📅 ${match.timestamp}</span>
            <span class="conv-search-relevance">${relevanceLabel}</span>
          </div>
          <div class="conv-search-result-preview">
            ${this.highlightQueryInText(match.preview, this.state.query)}
          </div>
          ${allChatsData?.matchedKeywords?.length > 0 ? `
            <div style="margin-top: 4px; font-size: 10px; color: #6b7280;">
              ${allChatsData.matchedKeywords.slice(0, 3).map((k: string) => 
                `<span style="background: rgba(59, 130, 246, 0.1); padding: 1px 4px; border-radius: 3px; margin-right: 4px;">${this.escapeHtml(k)}</span>`
              ).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
    
    this.resultsContainer.innerHTML = html;
  }

  private highlightQueryInText(text: string, query: string): string {
    if (!query || !text) return this.escapeHtml(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return this.escapeHtml(text).replace(regex, '<span class="conv-search-match">$1</span>');
  }

  // Show "AI-powered" notice immediately while searching
  private showAllChatsSearchingNotice(): void {
    if (!this.resultsContainer) return;
    
    const resultsPanel = this.container?.querySelector('.conv-search-results') as HTMLElement;
    if (resultsPanel) resultsPanel.style.display = 'block';
    
    this.resultsContainer.innerHTML = `
      <div class="conv-search-ai-notice">
        <span class="conv-search-ai-icon">⚡</span>
        <span>AI-powered by <strong>Operator X02</strong></span>
      </div>
      <div class="conv-search-searching-placeholder">
        <div class="conv-search-skeleton"></div>
        <div class="conv-search-skeleton" style="animation-delay: 0.1s"></div>
        <div class="conv-search-skeleton" style="animation-delay: 0.2s"></div>
      </div>
    `;
  }

  // ============================================================================
  // UI HELPERS
  // ============================================================================

  private getChatScrollContainer(): HTMLElement | null {
    const selectors = ['.ai-chat-container', '.chat-messages-container', '.ai-chat-messages', '.chat-container'];
    for (const sel of selectors) {
      const el = document.querySelector(sel) as HTMLElement;
      if (el) return el;
    }
    return null;
  }

  private showLoading(show: boolean): void {
    const loading = this.container?.querySelector('.conv-search-loading') as HTMLElement;
    const count = this.container?.querySelector('.conv-search-count') as HTMLElement;
    if (loading) loading.style.opacity = show ? '1' : '0';
    if (count) count.style.opacity = show ? '0' : '1';
  }

  private showNoResults(message: string): void {
    this.matches = [];
    this.state.selectedIndex = -1;
    this.state.isSearching = false;
    this.showLoading(false);
    this.updateCount();
    
    const resultsPanel = this.container?.querySelector('.conv-search-results') as HTMLElement;
    if (resultsPanel) resultsPanel.style.display = 'block';
    if (this.resultsContainer) {
      this.resultsContainer.innerHTML = `<div class="conv-search-no-results">${this.escapeHtml(message)}</div>`;
    }
  }

  private renderResults(): void {
    if (!this.resultsContainer) return;
    
    const resultsPanel = this.container?.querySelector('.conv-search-results') as HTMLElement;
    
    if (this.matches.length === 0) {
      if (this.state.query && this.state.query.length >= 1) {
        if (resultsPanel) {
          resultsPanel.style.display = 'block';
          this.resultsContainer.innerHTML = `<div class="conv-search-no-results">No results for "${this.escapeHtml(this.state.query)}"</div>`;
        }
      } else {
        if (resultsPanel) resultsPanel.style.display = 'none';
        this.resultsContainer.innerHTML = '';
      }
      return;
    }

    if (resultsPanel) resultsPanel.style.display = 'block';

    // AI fallback notice with Operator X02 branding
    const notice = this.usedAIFallback 
      ? `<div class="conv-search-ai-notice">
           <span class="conv-search-ai-icon">⚡</span>
           <span>AI-powered by <strong>Operator X02</strong></span>
         </div>` 
      : '';

    this.resultsContainer.innerHTML = notice + this.matches.slice(0, 50).map((match, index) => {
      const relevanceClass = match.isAIResult && match.relevanceScore 
        ? `relevance-${match.relevanceScore === 3 ? 'high' : match.relevanceScore === 2 ? 'medium' : 'low'}` 
        : '';
      
      return `
        <div class="conv-search-result-item ${index === this.state.selectedIndex ? 'selected' : ''} ${relevanceClass}" 
             data-index="${index}" style="animation-delay: ${index * 30}ms">
          <div class="conv-search-result-header">
            <span class="conv-search-result-time">${this.escapeHtml(match.timestamp || `Message #${match.messageIndex + 1}`)}</span>
            ${match.isAIResult && match.relevanceScore ? `<span class="conv-search-relevance">${'●'.repeat(match.relevanceScore)}${'○'.repeat(3 - match.relevanceScore)}</span>` : ''}
          </div>
          <div class="conv-search-result-preview">
            ${!match.isAIResult ? this.highlightPreview(match.preview, this.state.query) : this.escapeHtml(match.preview)}
          </div>
        </div>
      `;
    }).join('');
  }

  private updateCount(): void {
    const countEl = this.container?.querySelector('.conv-search-count');
    if (!countEl) return;
    
    if (this.matches.length > 0) {
      countEl.textContent = `${this.state.selectedIndex + 1}/${this.matches.length}`;
    } else if (this.state.query && this.state.query.length >= 1) {
      countEl.textContent = '0';
    } else {
      countEl.textContent = '';
    }
  }

  private updateSelectedResultUI(): void {
    this.resultsContainer?.querySelectorAll('.conv-search-result-item').forEach((el, i) => {
      el.classList.toggle('selected', i === this.state.selectedIndex);
    });
    this.resultsContainer?.querySelector('.conv-search-result-item.selected')?.scrollIntoView({ block: 'nearest' });
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  private selectNextMatch(): void {
    if (this.matches.length === 0) return;
    this.state.selectedIndex = (this.state.selectedIndex + 1) % this.matches.length;
    this.updateCount();
    this.updateSelectedResultUI();
    this.goToMatch(this.state.selectedIndex);
  }

  private selectPrevMatch(): void {
    if (this.matches.length === 0) return;
    this.state.selectedIndex = (this.state.selectedIndex - 1 + this.matches.length) % this.matches.length;
    this.updateCount();
    this.updateSelectedResultUI();
    this.goToMatch(this.state.selectedIndex);
  }

  private goToMatch(index: number): void {
    if (index < 0 || index >= this.matches.length) return;
    const match = this.matches[index];
    
    if (match.isAIResult && !match.messageEl) {
      match.messageEl = this.getMessageElementByIndex(match.messageIndex);
    }
    if (!match.messageEl) return;

    if (match.messageEl.classList.contains('ai-message-collapsed')) {
      this.expandMessage(match.messageEl);
      setTimeout(() => this.scrollToMessage(match), 350);
    } else {
      this.scrollToMessage(match);
    }
  }

  private scrollToMessage(match: MatchInfo): void {
    if (match.highlightEl && !match.isAIResult) {
      this.markCurrentMatch(this.state.selectedIndex);
    }
    
    document.querySelectorAll('.search-highlight-message').forEach(el => el.classList.remove('search-highlight-message'));
    
    const targetEl = match.highlightEl || match.messageEl;
    if (targetEl) this.scrollToElementInChat(targetEl);
    
    if (match.messageEl) {
      match.messageEl.classList.add('search-highlight-message');
      setTimeout(() => match.messageEl?.classList.remove('search-highlight-message'), 2500);
    }
  }

  private markCurrentMatch(index: number): void {
    document.querySelectorAll('.search-current-result').forEach(el => el.classList.remove('search-current-result'));
    if (index >= 0 && index < this.matches.length && this.matches[index].highlightEl) {
      this.matches[index].highlightEl!.classList.add('search-current-result');
    }
  }

  private scrollToElementInChat(element: HTMLElement): void {
    const chatContainer = this.getChatScrollContainer();
    if (!chatContainer || !element) return;
    
    const containerRect = chatContainer.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const scrollTarget = elementRect.top - containerRect.top + chatContainer.scrollTop - (chatContainer.clientHeight / 2);
    
    chatContainer.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
  }

  private expandMessage(messageEl: HTMLElement): void {
    const messageId = messageEl.getAttribute('data-message-id');
    if (messageId && typeof (window as any).toggleAIMessageCollapse === 'function') {
      (window as any).toggleAIMessageCollapse(messageId);
      return;
    }
    const header = messageEl.querySelector('.ai-message-collapsed-header, [class*="collapsed"]');
    if (header) (header as HTMLElement).click();
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private highlightPreview(preview: string, query: string): string {
    const escaped = this.escapeHtml(preview);
    return escaped.replace(
      new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), 
      '<mark class="conv-search-match">$1</mark>'
    );
  }

  // ============================================================================
  // STYLES
  // ============================================================================

  private injectStyles(): void {
    if (this.stylesInjected || document.getElementById('conv-search-styles-v19')) {
      this.stylesInjected = true;
      return;
    }

    const style = document.createElement('style');
    style.id = 'conv-search-styles-v19';
    style.textContent = `
      /* ========== Panel ========== */
      .conv-search-panel {
        position: relative;
        background: linear-gradient(180deg, #0c1015 0%, #111820 100%);
        border-bottom: 1px solid #1e2a38;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        padding: 0;
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        transform: translateY(-6px);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 100;
      }
      
      .conv-search-panel.visible {
        max-height: 500px;
        padding: 10px 12px;
        opacity: 1;
        transform: translateY(0);
      }
      
      .conv-search-panel.closing {
        max-height: 0;
        padding: 0 12px;
        opacity: 0;
        transform: translateY(-6px);
      }
      
      /* ========== Header ========== */
      .conv-search-header {
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: flex-start;
      }
      
      /* ========== Input Wrapper ========== */
      .conv-search-input-wrapper {
        flex: 0 1 180px;
        min-width: 140px;
        max-width: 180px;
        display: flex;
        align-items: center;
        background: #060a0f;
        border: 1px solid #1e2a38;
        border-radius: 6px;
        padding: 6px 10px;
        gap: 6px;
        transition: all 0.2s ease;
      }
      
      .conv-search-input-wrapper:focus-within {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
      }
      
      .conv-search-icon {
        color: #4b5563;
        flex-shrink: 0;
        transition: color 0.2s;
      }
      
      .conv-search-input-wrapper:focus-within .conv-search-icon {
        color: #3b82f6;
      }
      
      .conv-search-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: #e5e7eb;
        font-size: 11px;
      }
      
      .conv-search-input::placeholder {
        color: #4b5563;
        font-size: 11px;
      }
      
      .conv-search-count {
        font-size: 11px;
        color: #9ca3af;
        font-weight: 500;
        background: rgba(59, 130, 246, 0.1);
        padding: 2px 8px;
        border-radius: 4px;
        transition: opacity 0.2s;
      }
      
      .conv-search-loading {
        color: #3b82f6;
        opacity: 0;
        transition: opacity 0.2s;
        display: flex;
      }
      
      /* ========== Controls ========== */
      .conv-search-controls {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      
      /* ========== Scope Toggle - Pill Style ========== */
      .conv-search-scope-toggle {
        display: flex;
        background: #0a0f14;
        border: 1px solid #1e2a38;
        border-radius: 5px;
        padding: 2px;
        gap: 2px;
      }
      
      .conv-search-scope-btn {
        background: transparent;
        border: none;
        color: #6b7280;
        padding: 4px 10px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
      }
      
      .conv-search-scope-btn:hover {
        color: #9ca3af;
        background: rgba(255, 255, 255, 0.03);
      }
      
      .conv-search-scope-btn.active {
        background: #3b82f6;
        color: #fff;
        box-shadow: 0 1px 3px rgba(59, 130, 246, 0.3);
      }
      
      /* ========== Close Button ========== */
      .conv-search-close-btn {
        background: transparent;
        border: 1px solid #374151;
        color: #9ca3af;
        padding: 5px;
        border-radius: 5px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
        margin-right: 6px;
      }
      
      .conv-search-close-btn:hover {
        background: rgba(239, 68, 68, 0.1);
        border-color: #ef4444;
        color: #ef4444;
      }
      
      /* ========== Results Panel ========== */
      .conv-search-results {
        display: none;
        margin-top: 10px;
        max-height: 260px;
        overflow-y: auto;
        background: #060a0f;
        border: 1px solid #1e2a38;
        border-radius: 8px;
      }
      
      .conv-search-results-list {
        padding: 6px;
      }
      
      /* ========== AI Notice ========== */
      .conv-search-ai-notice {
        padding: 8px 12px;
        background: linear-gradient(90deg, rgba(34, 197, 94, 0.1), transparent);
        border-bottom: 1px solid rgba(34, 197, 94, 0.2);
        color: #4ade80;
        font-size: 11px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .conv-search-ai-notice strong {
        color: #22c55e;
      }
      
      .conv-search-ai-icon {
        font-size: 12px;
      }
      
      /* ========== Skeleton Loading ========== */
      .conv-search-searching-placeholder {
        padding: 8px;
      }
      
      .conv-search-skeleton {
        height: 48px;
        background: linear-gradient(90deg, #1a1f2e 25%, #252b3d 50%, #1a1f2e 75%);
        background-size: 200% 100%;
        animation: skeleton-shimmer 1.2s ease-in-out infinite;
        border-radius: 6px;
        margin-bottom: 6px;
      }
      
      @keyframes skeleton-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      
      /* ========== Result Items ========== */
      .conv-search-result-item {
        padding: 10px 12px;
        border-radius: 6px;
        cursor: pointer;
        border-left: 2px solid transparent;
        margin-bottom: 2px;
        opacity: 0;
        transform: translateX(-8px);
        animation: slideIn 0.2s ease forwards;
        transition: all 0.12s ease;
      }
      
      @keyframes slideIn {
        to { opacity: 1; transform: translateX(0); }
      }
      
      .conv-search-result-item:hover {
        background: rgba(59, 130, 246, 0.06);
      }
      
      .conv-search-result-item.selected {
        background: rgba(59, 130, 246, 0.12);
        border-left-color: #3b82f6;
      }
      
      .conv-search-result-item.relevance-high { border-left-color: #22c55e; }
      .conv-search-result-item.relevance-medium { border-left-color: #f59e0b; }
      .conv-search-result-item.relevance-low { border-left-color: #6b7280; }
      
      .conv-search-relevance {
        font-size: 9px;
        color: #6b7280;
        margin-left: auto;
        letter-spacing: 1px;
      }
      
      .conv-search-result-header {
        display: flex;
        align-items: center;
        margin-bottom: 4px;
        gap: 6px;
      }
      
      .conv-search-result-time {
        font-size: 10px;
        color: #6b7280;
        font-weight: 500;
      }
      
      .conv-search-result-preview {
        font-size: 12px;
        color: #9ca3af;
        line-height: 1.4;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      
      .conv-search-match {
        background: rgba(59, 130, 246, 0.25);
        color: #60a5fa;
        padding: 0 3px;
        border-radius: 3px;
      }
      
      .conv-search-no-results {
        padding: 24px;
        text-align: center;
        color: #6b7280;
        font-size: 12px;
      }
      
      /* ========== Text Highlights ========== */
      .search-highlight-text {
        background: rgba(251, 191, 36, 0.3) !important;
        color: inherit !important;
        padding: 1px 2px;
        border-radius: 3px;
      }
      
      .search-highlight-text.search-current-result {
        background: #fbbf24 !important;
        color: #000 !important;
        box-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
        animation: pulse 1.5s ease infinite;
      }
      
      @keyframes pulse {
        0%, 100% { box-shadow: 0 0 8px rgba(251, 191, 36, 0.5); }
        50% { box-shadow: 0 0 16px rgba(251, 191, 36, 0.8); }
      }
      
      /* ========== Message Highlight ========== */
      .search-highlight-message {
        position: relative;
        animation: flashMessage 2s ease;
      }
      
      .search-highlight-message::before {
        content: '';
        position: absolute;
        inset: -4px;
        border: 2px solid #3b82f6;
        border-radius: 10px;
        pointer-events: none;
        animation: fadeBorder 2s ease forwards;
      }
      
      @keyframes flashMessage {
        0% { background: rgba(59, 130, 246, 0.1); }
        100% { background: transparent; }
      }
      
      @keyframes fadeBorder {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }
      
      /* ========== Scrollbar ========== */
      .conv-search-results::-webkit-scrollbar { width: 5px; }
      .conv-search-results::-webkit-scrollbar-track { background: transparent; }
      .conv-search-results::-webkit-scrollbar-thumb { background: #1e2a38; border-radius: 3px; }
      .conv-search-results::-webkit-scrollbar-thumb:hover { background: #2d3f52; }
    `;
    document.head.appendChild(style);
    this.stylesInjected = true;
  }

  isOpen(): boolean { return this.state.isOpen; }
  getMatches(): MatchInfo[] { return this.matches; }
  getCurrentQuery(): string { return this.state.query; }
}

// ============================================================================
// SINGLETON & EXPORTS
// ============================================================================

export const conversationSearchUI = new ConversationSearchUI();
export function initializeConversationSearch(): void { conversationSearchUI.initialize(); }

(window as any).conversationSearchUI = conversationSearchUI;
(window as any).showConversationSearch = () => conversationSearchUI.show();
(window as any).hideConversationSearch = () => conversationSearchUI.hide();
(window as any).toggleConversationSearch = () => conversationSearchUI.toggle();

console.log('✅ Conversation Search UI v22 loaded (Instant AI feedback)');
