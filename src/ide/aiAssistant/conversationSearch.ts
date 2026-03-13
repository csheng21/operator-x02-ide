// conversationSearch.ts - Conversation Search System for AI IDE
// ============================================================================

import { conversationManager, Conversation, Message } from './conversationManager';

// ============================================================================
// TYPES
// ============================================================================

export interface SearchResult {
  conversationId: string;
  conversationTitle: string;
  messageId: string;
  messageRole: 'user' | 'assistant';
  content: string;
  matchedText: string;
  matchIndex: number;
  timestamp: number;
  preview: string;
}

export interface SearchOptions {
  scope: 'current' | 'all';
  caseSensitive: boolean;
  matchWholeWord: boolean;
  maxResults: number;
}

// ============================================================================
// SEARCH ENGINE
// ============================================================================

class ConversationSearchEngine {
  private searchIndex: Map<string, string[]> = new Map();
  private lastQuery: string = '';
  private lastResults: SearchResult[] = [];

  // ============================================================================
  // SEARCH METHODS
  // ============================================================================

  /**
   * Main search function
   */
  search(query: string, options: Partial<SearchOptions> = {}): SearchResult[] {
    const opts: SearchOptions = {
      scope: options.scope ?? 'current',
      caseSensitive: options.caseSensitive ?? false,
      matchWholeWord: options.matchWholeWord ?? false,
      maxResults: options.maxResults ?? 50
    };

    if (!query || query.trim().length < 2) {
      return [];
    }

    this.lastQuery = query;
    const results: SearchResult[] = [];
    const searchTerm = opts.caseSensitive ? query : query.toLowerCase();

    // Get conversations to search
    const conversations = opts.scope === 'current'
      ? [conversationManager.getCurrentConversation()].filter(Boolean) as Conversation[]
      : conversationManager.getAllConversations();

    for (const conv of conversations) {
      if (results.length >= opts.maxResults) break;

      for (const msg of conv.messages) {
        if (results.length >= opts.maxResults) break;

        const content = opts.caseSensitive ? msg.content : msg.content.toLowerCase();
        const matchIndex = this.findMatch(content, searchTerm, opts.matchWholeWord);

        if (matchIndex !== -1) {
          results.push({
            conversationId: conv.id,
            conversationTitle: conv.title,
            messageId: msg.id,
            messageRole: msg.role,
            content: msg.content,
            matchedText: query,
            matchIndex,
            timestamp: msg.timestamp,
            preview: this.generatePreview(msg.content, matchIndex, query.length)
          });
        }
      }
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp - a.timestamp);

    this.lastResults = results;
    return results;
  }

  /**
   * Search with highlighting info
   */
  searchWithHighlights(query: string, options: Partial<SearchOptions> = {}): {
    results: SearchResult[];
    highlightRanges: Map<string, { start: number; end: number }[]>;
  } {
    const results = this.search(query, options);
    const highlightRanges = new Map<string, { start: number; end: number }[]>();

    const searchTerm = options.caseSensitive ? query : query.toLowerCase();

    for (const result of results) {
      const content = options.caseSensitive ? result.content : result.content.toLowerCase();
      const ranges: { start: number; end: number }[] = [];
      
      let pos = 0;
      while (pos < content.length) {
        const idx = content.indexOf(searchTerm, pos);
        if (idx === -1) break;
        ranges.push({ start: idx, end: idx + query.length });
        pos = idx + 1;
      }

      highlightRanges.set(result.messageId, ranges);
    }

    return { results, highlightRanges };
  }

  /**
   * Find next/previous match in current conversation
   */
  findInCurrentConversation(query: string, direction: 'next' | 'prev' = 'next'): SearchResult | null {
    const results = this.search(query, { scope: 'current' });
    if (results.length === 0) return null;

    // Get current scroll position to find nearest result
    const chatContainer = document.querySelector('.ai-chat-container');
    if (!chatContainer) return results[0];

    const scrollTop = chatContainer.scrollTop;
    
    // Find messages and their positions
    const messagePositions: { result: SearchResult; top: number }[] = [];
    for (const result of results) {
      const msgEl = document.querySelector(`[data-message-id="${result.messageId}"]`);
      if (msgEl) {
        messagePositions.push({
          result,
          top: (msgEl as HTMLElement).offsetTop
        });
      }
    }

    if (messagePositions.length === 0) return results[0];

    // Find nearest message based on direction
    if (direction === 'next') {
      const next = messagePositions.find(m => m.top > scrollTop + 100);
      return next?.result ?? messagePositions[0].result;
    } else {
      const prev = [...messagePositions].reverse().find(m => m.top < scrollTop - 50);
      return prev?.result ?? messagePositions[messagePositions.length - 1].result;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private findMatch(content: string, searchTerm: string, wholeWord: boolean): number {
    if (wholeWord) {
      const regex = new RegExp(`\\b${this.escapeRegex(searchTerm)}\\b`);
      const match = content.match(regex);
      return match ? content.indexOf(match[0]) : -1;
    }
    return content.indexOf(searchTerm);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private generatePreview(content: string, matchIndex: number, matchLength: number): string {
    const previewLength = 100;
    const start = Math.max(0, matchIndex - 40);
    const end = Math.min(content.length, matchIndex + matchLength + 60);
    
    let preview = content.substring(start, end);
    
    // Clean up preview
    preview = preview.replace(/```[\s\S]*?```/g, '[code block]');
    preview = preview.replace(/\n+/g, ' ');
    preview = preview.trim();
    
    if (start > 0) preview = '...' + preview;
    if (end < content.length) preview = preview + '...';
    
    return preview;
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  /**
   * Scroll to and highlight a search result
   */
  scrollToResult(result: SearchResult): void {
    // If different conversation, switch to it first
    const currentConv = conversationManager.getCurrentConversation();
    if (currentConv?.id !== result.conversationId) {
      // Trigger conversation switch
      const event = new CustomEvent('switch-conversation', {
        detail: { conversationId: result.conversationId, messageId: result.messageId }
      });
      document.dispatchEvent(event);
      return;
    }

    // Find and scroll to message
    const messageEl = document.querySelector(`[data-message-id="${result.messageId}"]`);
    if (messageEl) {
      messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Highlight the message temporarily
      messageEl.classList.add('search-highlight-message');
      setTimeout(() => {
        messageEl.classList.remove('search-highlight-message');
      }, 2000);

      // Highlight the matched text
      this.highlightTextInElement(messageEl, result.matchedText);
    }
  }

  /**
   * Highlight matched text within an element
   */
  highlightTextInElement(element: Element, searchTerm: string): void {
    const contentEl = element.querySelector('.ai-message-content');
    if (!contentEl) return;

    // Remove existing highlights
    contentEl.querySelectorAll('.search-highlight-text').forEach(el => {
      const text = el.textContent || '';
      el.replaceWith(document.createTextNode(text));
    });

    // Add new highlights using TreeWalker for text nodes
    const walker = document.createTreeWalker(
      contentEl,
      NodeFilter.SHOW_TEXT,
      null
    );

    const nodesToHighlight: { node: Text; index: number }[] = [];
    let node: Text | null;

    while ((node = walker.nextNode() as Text | null)) {
      const text = node.textContent || '';
      const lowerText = text.toLowerCase();
      const lowerTerm = searchTerm.toLowerCase();
      let index = lowerText.indexOf(lowerTerm);
      
      if (index !== -1) {
        nodesToHighlight.push({ node, index });
      }
    }

    // Apply highlights (reverse order to preserve indices)
    for (const { node, index } of nodesToHighlight.reverse()) {
      const text = node.textContent || '';
      const before = text.substring(0, index);
      const match = text.substring(index, index + searchTerm.length);
      const after = text.substring(index + searchTerm.length);

      const span = document.createElement('span');
      span.className = 'search-highlight-text';
      span.textContent = match;

      const fragment = document.createDocumentFragment();
      if (before) fragment.appendChild(document.createTextNode(before));
      fragment.appendChild(span);
      if (after) fragment.appendChild(document.createTextNode(after));

      node.parentNode?.replaceChild(fragment, node);
    }

    // Auto-remove highlights after delay
    setTimeout(() => {
      contentEl.querySelectorAll('.search-highlight-text').forEach(el => {
        const text = el.textContent || '';
        el.replaceWith(document.createTextNode(text));
      });
    }, 5000);
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  getLastQuery(): string {
    return this.lastQuery;
  }

  getLastResults(): SearchResult[] {
    return this.lastResults;
  }

  getResultCount(): number {
    return this.lastResults.length;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const conversationSearch = new ConversationSearchEngine();

// ============================================================================
// EXPOSE FOR DEBUGGING
// ============================================================================

(window as any).conversationSearch = conversationSearch;

console.log('✅ Conversation Search Engine loaded');
