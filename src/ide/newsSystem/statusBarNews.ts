/**
 * ====================================================================================================
 * FILE: src/ide/newsSystem/statusBarNews.ts - Status Bar News/Notification System
 * ====================================================================================================
 * 
 * DESCRIPTION:
 * Integrates news/announcement system into the IDE status bar.
 * Supports auto-rotation and expandable news panel. No login required.
 * 
 * FEATURES:
 * - ✅ Inline news display in status bar (right side)
 * - ✅ Auto-rotate announcements
 * - ✅ Bell icon with unread badge
 * - ✅ Expandable news panel
 * - ✅ Mark as read functionality
 * - ✅ Hide/show news toggle
 * 
 * USAGE:
 * import { initStatusBarNews, setNewsItems, addNewsItem } from './newsSystem';
 * initStatusBarNews({ containerId: 'status-bar' });
 * 
 * ====================================================================================================
 */

import {
  NewsItem,
  NewsState,
  StatusBarNewsConfig,
  NEWS_TYPE_CONFIG,
  DEFAULT_NEWS_CONFIG,
} from './newsTypes';

// Re-export types for convenience
export * from './newsTypes';

// ====================================
// State Management
// ====================================

let state: NewsState = {
  items: [],
  currentIndex: 0,
  isVisible: true,
  isPanelOpen: false,
  unreadCount: 0,
};

let config: Required<StatusBarNewsConfig> = { ...DEFAULT_NEWS_CONFIG };
let autoRotateTimer: ReturnType<typeof setInterval> | null = null;
let elements: Record<string, HTMLElement | null> = {};

// ====================================
// CSS Styles
// ====================================

const CSS_STYLES = `
/* Status Bar News System Styles */
.status-bar-news-container {
  display: flex;
  align-items: center;
  height: 100%;
  position: relative;
}

.sbn-news-area {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 12px;
  gap: 8px;
  background: linear-gradient(90deg, transparent, rgba(79, 195, 247, 0.08), rgba(79, 195, 247, 0.08));
  border-left: 1px solid #333;
  transition: opacity 0.2s;
  width: 600px;
  min-width: 600px;
  max-width: 600px;
  flex-shrink: 0;
}

.sbn-news-area.hidden { display: none; }

.sbn-news-icon {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  flex-shrink: 0;
}

.sbn-news-icon.update { background: #4caf50; }
.sbn-news-icon.feature { background: #2196f3; }
.sbn-news-icon.tip { background: #9c27b0; }
.sbn-news-icon.warning { background: #ff9800; }
.sbn-news-icon.maintenance { background: #607d8b; }
.sbn-news-icon.news { background: #00bcd4; }
.sbn-news-icon.info { background: #2196f3; }

.sbn-news-text {
  color: #e0e0e0;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.sbn-news-text strong {
  color: #fff;
  margin-right: 6px;
  font-weight: 600;
}

.sbn-news-badge {
  background: #4fc3f7;
  color: #1a1a2e;
  font-size: 8px;
  font-weight: bold;
  padding: 1px 4px;
  border-radius: 2px;
  flex-shrink: 0;
}

.sbn-news-badge.hidden { display: none; }

.sbn-news-link {
  color: #4fc3f7;
  font-size: 10px;
  text-decoration: none;
  padding: 2px 5px;
  border-radius: 2px;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 0.15s;
}

.sbn-news-link:hover { background: rgba(79, 195, 247, 0.2); }
.sbn-news-link.hidden { display: none; }

.sbn-news-nav {
  display: flex;
  align-items: center;
  gap: 1px;
  flex-shrink: 0;
  margin-left: 4px;
}

.sbn-news-nav-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 10px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 2px;
  transition: all 0.15s;
}

.sbn-news-nav-btn:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

.sbn-news-nav-counter {
  font-size: 9px;
  color: #555;
  min-width: 20px;
  text-align: center;
}

.sbn-news-close {
  background: none;
  border: none;
  color: #555;
  font-size: 12px;
  cursor: pointer;
  padding: 0 4px;
  margin-left: 2px;
  transition: color 0.15s;
}

.sbn-news-close:hover { color: #fff; }

.sbn-bell {
  position: relative;
  padding: 0 8px;
  height: 100%;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background 0.15s;
  border-left: 1px solid #333;
}

.sbn-bell:hover { background: rgba(255,255,255,0.1); }

.sbn-bell svg {
  width: 14px;
  height: 14px;
  fill: #666;
  transition: fill 0.15s;
}

.sbn-bell.has-news svg { fill: #4fc3f7; }

.sbn-bell-badge {
  position: absolute;
  top: 2px;
  right: 4px;
  background: #f44336;
  color: white;
  font-size: 8px;
  font-weight: bold;
  min-width: 12px;
  height: 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}

.sbn-bell-badge.hidden { display: none; }

.sbn-panel {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 4px;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 10px;
  width: 420px;
  max-height: 520px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(20px);
}

.sbn-panel.hidden { display: none; }

.sbn-panel-header {
  padding: 14px 16px;
  border-bottom: 1px solid #3c3c3c;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(180deg, rgba(79,195,247,0.06) 0%, transparent 100%);
}

.sbn-panel-header h3 { font-size: 13px; margin: 0; color: #e0e0e0; font-weight: 600; }

.sbn-panel-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sbn-panel-action-btn {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  color: #999;
  font-size: 11px;
  cursor: pointer;
  padding: 3px 8px;
  border-radius: 4px;
  transition: all 0.15s;
}

.sbn-panel-action-btn:hover {
  background: rgba(79,195,247,0.15);
  border-color: rgba(79,195,247,0.3);
  color: #4fc3f7;
}

.sbn-panel-close {
  background: none;
  border: none;
  color: #888;
  font-size: 16px;
  cursor: pointer;
  transition: color 0.15s;
  padding: 2px 4px;
  border-radius: 4px;
}

.sbn-panel-close:hover { color: #fff; background: rgba(255,255,255,0.08); }

.sbn-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  scroll-behavior: smooth;
}

.sbn-panel-content::-webkit-scrollbar { width: 4px; }
.sbn-panel-content::-webkit-scrollbar-track { background: transparent; }
.sbn-panel-content::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
.sbn-panel-content::-webkit-scrollbar-thumb:hover { background: #555; }

.sbn-panel-empty {
  padding: 40px 24px;
  text-align: center;
  color: #666;
  font-size: 12px;
}

.sbn-panel-empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.5;
}

/* ---- Card Styles ---- */

.sbn-card {
  background: #252526;
  border: 1px solid #333;
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
}

.sbn-card:hover {
  background: #2a2a2c;
  border-color: #444;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.sbn-card.unread {
  border-left: 3px solid #4fc3f7;
}

.sbn-card.pinned {
  background: linear-gradient(135deg, #252526 0%, rgba(79,195,247,0.04) 100%);
  border-color: rgba(79,195,247,0.2);
}

.sbn-card-accent {
  height: 3px;
  width: 100%;
}

.sbn-card-body {
  padding: 12px 14px;
}

.sbn-card-top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 8px;
}

.sbn-card-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.sbn-card-meta {
  flex: 1;
  min-width: 0;
}

.sbn-card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.sbn-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.sbn-card-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
  letter-spacing: 0.5px;
  flex-shrink: 0;
  text-transform: uppercase;
}

.sbn-card-badge.badge-new { background: #4fc3f7; color: #0a1929; }
.sbn-card-badge.badge-urgent { background: #f44336; color: #fff; }
.sbn-card-badge.badge-hot { background: #ff9800; color: #1a1a2e; }
.sbn-card-badge.badge-default { background: rgba(255,255,255,0.1); color: #aaa; }

.sbn-card-date {
  font-size: 10px;
  color: #666;
}

.sbn-card-content {
  font-size: 12px;
  color: #999;
  line-height: 1.5;
  margin-bottom: 8px;
}

.sbn-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sbn-card-type {
  font-size: 10px;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.sbn-card-type-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.sbn-card-link {
  font-size: 11px;
  color: #4fc3f7;
  text-decoration: none;
  padding: 3px 10px;
  border-radius: 4px;
  background: rgba(79,195,247,0.08);
  border: 1px solid rgba(79,195,247,0.15);
  transition: all 0.15s;
  cursor: pointer;
  white-space: nowrap;
}

.sbn-card-link:hover {
  background: rgba(79,195,247,0.18);
  border-color: rgba(79,195,247,0.35);
  color: #81d4fa;
}

.sbn-card-version {
  font-size: 10px;
  color: #555;
  background: rgba(255,255,255,0.05);
  padding: 1px 6px;
  border-radius: 3px;
}

.sbn-card-pin {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  opacity: 0.4;
}
`;

// ====================================
// SVG Icons
// ====================================

const ICONS = {
  bell: `<svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/></svg>`,
};

// ====================================
// Helper Functions
// ====================================

/**
 * Open URL externally - works in both browser and Tauri
 */
function openExternalUrl(url: string): void {
  if (!url) return;
  
  try {
    // Try Tauri v2 shell API first
    if ((window as any).__TAURI__) {
      const { open } = (window as any).__TAURI__.shell || {};
      if (open) {
        open(url);
        return;
      }
      // Tauri v2 alternative import path
      const tauri = (window as any).__TAURI__;
      if (tauri.core?.invoke) {
        tauri.core.invoke('plugin:shell|open', { path: url });
        return;
      }
    }
  } catch (err) {
    console.warn('[StatusBarNews] Tauri shell not available, falling back to window.open');
  }
  
  // Fallback: browser window.open
  window.open(url, '_blank');
}

function generateId(): string {
  return `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function getUnreadCount(): number {
  return state.items.filter(item => !item.isRead).length;
}

// ====================================
// DOM Creation
// ====================================

function injectStyles(): void {
  if (document.getElementById('sbn-styles')) return;
  
  const styleEl = document.createElement('style');
  styleEl.id = 'sbn-styles';
  styleEl.textContent = CSS_STYLES;
  document.head.appendChild(styleEl);
}

function createNewsContainer(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'status-bar-news-container';
  container.id = 'sbn-container';
  
  container.innerHTML = `
    <!-- News inline area -->
    <div class="sbn-news-area" id="sbn-news-area">
      <div class="sbn-news-icon" id="sbn-news-icon"></div>
      <span class="sbn-news-text" id="sbn-news-text">
        <strong id="sbn-news-title"></strong>
        <span id="sbn-news-content"></span>
      </span>
      <span class="sbn-news-badge hidden" id="sbn-news-badge"></span>
      <span class="sbn-news-link hidden" id="sbn-news-link"></span>
      <div class="sbn-news-nav">
        <button class="sbn-news-nav-btn" id="sbn-prev-btn">‹</button>
        <span class="sbn-news-nav-counter" id="sbn-news-counter">0/0</span>
        <button class="sbn-news-nav-btn" id="sbn-next-btn">›</button>
      </div>
      <button class="sbn-news-close" id="sbn-news-close" title="Hide">×</button>
    </div>
    
    <!-- Bell icon -->
    <div class="sbn-bell" id="sbn-bell">
      ${ICONS.bell}
      <span class="sbn-bell-badge hidden" id="sbn-bell-badge">0</span>
    </div>
    
    <!-- News panel -->
    <div class="sbn-panel hidden" id="sbn-panel">
      <div class="sbn-panel-header">
        <h3>📢 Announcements</h3>
        <div class="sbn-panel-actions">
          <button class="sbn-panel-action-btn" id="sbn-mark-read" title="Mark all as read">✓ Read all</button>
          <button class="sbn-panel-close" id="sbn-panel-close">×</button>
        </div>
      </div>
      <div class="sbn-panel-content" id="sbn-panel-content">
        <div class="sbn-panel-empty">No announcements</div>
      </div>
    </div>
  `;
  
  return container;
}

function cacheElements(): void {
  elements = {
    container: document.getElementById('sbn-container'),
    newsArea: document.getElementById('sbn-news-area'),
    newsIcon: document.getElementById('sbn-news-icon'),
    newsTitle: document.getElementById('sbn-news-title'),
    newsContent: document.getElementById('sbn-news-content'),
    newsBadge: document.getElementById('sbn-news-badge'),
    newsLink: document.getElementById('sbn-news-link'),
    newsCounter: document.getElementById('sbn-news-counter'),
    prevBtn: document.getElementById('sbn-prev-btn'),
    nextBtn: document.getElementById('sbn-next-btn'),
    newsClose: document.getElementById('sbn-news-close'),
    bell: document.getElementById('sbn-bell'),
    bellBadge: document.getElementById('sbn-bell-badge'),
    panel: document.getElementById('sbn-panel'),
    panelContent: document.getElementById('sbn-panel-content'),
    panelClose: document.getElementById('sbn-panel-close'),
    markRead: document.getElementById('sbn-mark-read'),
  };
}

function bindEvents(): void {
  // Navigation
  elements.prevBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    prevNews();
  });
  
  elements.nextBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    nextNews();
  });
  
  // Close news
  elements.newsClose?.addEventListener('click', (e) => {
    e.stopPropagation();
    hideNews();
  });
  
  // Bell click
  elements.bell?.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePanel();
  });
  
  // Panel close
  elements.panelClose?.addEventListener('click', (e) => {
    e.stopPropagation();
    closePanel();
  });
  
  // Mark all read
  elements.markRead?.addEventListener('click', (e) => {
    e.stopPropagation();
    markAllAsRead();
  });
  
  // News link click
  elements.newsLink?.addEventListener('click', (e) => {
    e.stopPropagation();
    const currentItem = state.items[state.currentIndex];
    if (currentItem) {
      config.onLinkClick(currentItem);
      if (currentItem.linkUrl) {
        openExternalUrl(currentItem.linkUrl);
      }
    }
  });
  
  // Close panel on outside click
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.status-bar-news-container')) {
      closePanel();
    }
  });
  
  // Pause rotation on hover
  elements.newsArea?.addEventListener('mouseenter', () => {
    stopAutoRotate();
  });
  
  elements.newsArea?.addEventListener('mouseleave', () => {
    if (config.autoRotate) {
      startAutoRotate();
    }
  });
}

// ====================================
// UI Update Functions
// ====================================

function updateNewsDisplay(): void {
  if (state.items.length === 0) {
    if (elements.newsArea) {
      elements.newsArea.classList.add('hidden');
    }
    return;
  }
  
  const item = state.items[state.currentIndex];
  if (!item) return;
  
  const typeConfig = NEWS_TYPE_CONFIG[item.type] || NEWS_TYPE_CONFIG.info;
  
  if (elements.newsIcon) {
    elements.newsIcon.className = `sbn-news-icon ${item.type}`;
    elements.newsIcon.textContent = item.icon || typeConfig.icon;
  }
  
  if (elements.newsTitle) {
    elements.newsTitle.textContent = item.title;
  }
  
  if (elements.newsContent) {
    elements.newsContent.textContent = truncateText(item.content, config.maxVisibleChars);
  }
  
  if (elements.newsBadge) {
    if (item.badge) {
      elements.newsBadge.textContent = item.badge;
      elements.newsBadge.classList.remove('hidden');
    } else {
      elements.newsBadge.classList.add('hidden');
    }
  }
  
  if (elements.newsLink) {
    if (item.linkText) {
      elements.newsLink.textContent = item.linkText;
      elements.newsLink.classList.remove('hidden');
    } else {
      elements.newsLink.classList.add('hidden');
    }
  }
  
  if (elements.newsCounter) {
    elements.newsCounter.textContent = `${state.currentIndex + 1}/${state.items.length}`;
  }
}

function updateBellBadge(): void {
  state.unreadCount = getUnreadCount();
  
  if (elements.bellBadge) {
    if (state.unreadCount > 0) {
      elements.bellBadge.textContent = state.unreadCount > 9 ? '9+' : String(state.unreadCount);
      elements.bellBadge.classList.remove('hidden');
    } else {
      elements.bellBadge.classList.add('hidden');
    }
  }
  
  if (elements.bell) {
    elements.bell.classList.toggle('has-news', state.unreadCount > 0);
  }
}

function updatePanelContent(): void {
  if (!elements.panelContent) return;
  
  if (state.items.length === 0) {
    elements.panelContent.innerHTML = `
      <div class="sbn-panel-empty">
        <div class="sbn-panel-empty-icon">📭</div>
        No announcements yet
      </div>`;
    return;
  }
  
  elements.panelContent.innerHTML = state.items.map((item, index) => {
    const typeConfig = NEWS_TYPE_CONFIG[item.type] || NEWS_TYPE_CONFIG.info;
    const badgeClass = item.badge ? 
      (item.badge.toUpperCase() === 'NEW' ? 'badge-new' : 
       item.badge.toUpperCase() === 'URGENT' ? 'badge-urgent' : 
       item.badge.toUpperCase() === 'HOT' ? 'badge-hot' : 'badge-default') : '';
    
    return `
      <div class="sbn-card ${item.isRead ? '' : 'unread'} ${item.isPinned ? 'pinned' : ''}" data-index="${index}">
        <div class="sbn-card-accent" style="background: linear-gradient(90deg, ${typeConfig.color}, transparent)"></div>
        ${item.isPinned ? '<span class="sbn-card-pin">📌</span>' : ''}
        <div class="sbn-card-body">
          <div class="sbn-card-top">
            <div class="sbn-card-icon" style="background: ${typeConfig.color}20; color: ${typeConfig.color}; border: 1px solid ${typeConfig.color}30;">
              ${item.icon || typeConfig.icon}
            </div>
            <div class="sbn-card-meta">
              <div class="sbn-card-title-row">
                <span class="sbn-card-title">${item.title}</span>
                ${item.badge ? `<span class="sbn-card-badge ${badgeClass}">${item.badge}</span>` : ''}
              </div>
              <span class="sbn-card-date">${formatDate(item.date)}</span>
            </div>
          </div>
          <div class="sbn-card-content">${item.content}</div>
          <div class="sbn-card-footer">
            <span class="sbn-card-type">
              <span class="sbn-card-type-dot" style="background: ${typeConfig.color}"></span>
              ${item.type}
              ${item.version ? `<span class="sbn-card-version">${item.version}</span>` : ''}
            </span>
            ${item.linkText ? `<span class="sbn-card-link" data-url="${item.linkUrl || ''}">${item.linkText} →</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Bind card click events
  elements.panelContent.querySelectorAll('.sbn-card').forEach(el => {
    el.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      // If clicking a link button, handle link
      if (target.classList.contains('sbn-card-link')) {
        const url = target.getAttribute('data-url');
        if (url) {
          openExternalUrl(url);
        }
        e.stopPropagation();
        return;
      }
      const index = parseInt(el.getAttribute('data-index') || '0', 10);
      selectNews(index);
    });
  });
}

// ====================================
// Navigation Functions
// ====================================

function nextNews(): void {
  if (state.items.length === 0) return;
  state.currentIndex = (state.currentIndex + 1) % state.items.length;
  updateNewsDisplay();
}

function prevNews(): void {
  if (state.items.length === 0) return;
  state.currentIndex = (state.currentIndex - 1 + state.items.length) % state.items.length;
  updateNewsDisplay();
}

function selectNews(index: number): void {
  if (index < 0 || index >= state.items.length) return;
  
  state.currentIndex = index;
  updateNewsDisplay();
  closePanel();
  showNews();
  
  const item = state.items[index];
  if (item && !item.isRead) {
    item.isRead = true;
    updateBellBadge();
    updatePanelContent();
  }
  
  config.onNewsClick(item);
}

// ====================================
// Panel Functions
// ====================================

function togglePanel(): void {
  state.isPanelOpen = !state.isPanelOpen;
  elements.panel?.classList.toggle('hidden', !state.isPanelOpen);
}

function closePanel(): void {
  state.isPanelOpen = false;
  elements.panel?.classList.add('hidden');
}

// ====================================
// Auto-Rotate Functions
// ====================================

function startAutoRotate(): void {
  stopAutoRotate();
  if (config.autoRotate && state.items.length > 1) {
    autoRotateTimer = setInterval(nextNews, config.rotateInterval);
  }
}

function stopAutoRotate(): void {
  if (autoRotateTimer) {
    clearInterval(autoRotateTimer);
    autoRotateTimer = null;
  }
}

// ====================================
// Public API Functions
// ====================================

/**
 * Initialize the status bar news system
 */
export function initStatusBarNews(userConfig: StatusBarNewsConfig = {}): void {
  config = { ...DEFAULT_NEWS_CONFIG, ...userConfig };
  
  injectStyles();
  
  let container = document.getElementById('status-right');
  
  if (!container) {
    container = document.getElementById(config.containerId) || document.querySelector('.status-bar');
  }
  
  if (!container) {
    console.error(`[StatusBarNews] Container not found`);
    return;
  }
  
  const newsContainer = createNewsContainer();
  container.appendChild(newsContainer);
  
  cacheElements();
  bindEvents();
  
  updateNewsDisplay();
  updateBellBadge();
  
  if (config.autoRotate) {
    startAutoRotate();
  }
  
  console.log('[StatusBarNews] ✅ Initialized successfully');
}

export function setNewsItems(items: NewsItem[]): void {
  state.items = items;
  state.currentIndex = 0;
  updateNewsDisplay();
  updateBellBadge();
  updatePanelContent();
  
  if (items.length > 0) {
    showNews();
  }
}

export function addNewsItem(item: Omit<NewsItem, 'id' | 'date' | 'isRead'>): void {
  const newItem: NewsItem = {
    ...item,
    id: generateId(),
    date: new Date(),
    isRead: false,
  };
  
  state.items.unshift(newItem);
  state.currentIndex = 0;
  updateNewsDisplay();
  updateBellBadge();
  updatePanelContent();
  showNews();
}

export function showNews(): void {
  state.isVisible = true;
  elements.newsArea?.classList.remove('hidden');
}

export function hideNews(): void {
  state.isVisible = false;
  elements.newsArea?.classList.add('hidden');
}

export function toggleNews(): void {
  if (state.isVisible) {
    hideNews();
  } else {
    showNews();
  }
}

export function markAllAsRead(): void {
  state.items.forEach(item => {
    item.isRead = true;
  });
  updateBellBadge();
  updatePanelContent();
}

export function markAsRead(itemId: string): void {
  const item = state.items.find(i => i.id === itemId);
  if (item) {
    item.isRead = true;
    updateBellBadge();
    updatePanelContent();
  }
}

export function getNewsState(): NewsState {
  return { ...state };
}

export function clearNews(): void {
  state.items = [];
  state.currentIndex = 0;
  updateNewsDisplay();
  updateBellBadge();
  updatePanelContent();
  hideNews();
}

export function destroyStatusBarNews(): void {
  stopAutoRotate();
  elements.container?.remove();
  document.getElementById('sbn-styles')?.remove();
  
  state = {
    items: [],
    currentIndex: 0,
    isVisible: true,
    isPanelOpen: false,
    unreadCount: 0,
  };
  
  elements = {};
  
  console.log('[StatusBarNews] 🗑️ Destroyed');
}
