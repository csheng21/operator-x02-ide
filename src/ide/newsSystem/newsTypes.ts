/**
 * ====================================================================================================
 * FILE: src/ide/newsSystem/newsTypes.ts - News System Type Definitions
 * ====================================================================================================
 */

export type NewsType = 'update' | 'feature' | 'tip' | 'warning' | 'maintenance' | 'news' | 'info';

export interface NewsItem {
  id: string;
  type: NewsType;
  icon: string;
  title: string;
  content: string;
  badge?: string | null;
  link?: string | null;
  linkText?: string | null;
  linkUrl?: string | null;
  date: Date;
  isRead: boolean;
  isPinned?: boolean;
  version?: string | null;
}

export interface StatusBarNewsConfig {
  containerId?: string;
  autoRotate?: boolean;
  rotateInterval?: number;
  maxVisibleChars?: number;
  onNewsClick?: (item: NewsItem) => void;
  onLinkClick?: (item: NewsItem) => void;
}

export interface NewsState {
  items: NewsItem[];
  currentIndex: number;
  isVisible: boolean;
  isPanelOpen: boolean;
  unreadCount: number;
}

export const NEWS_TYPE_CONFIG: Record<NewsType, { icon: string; color: string }> = {
  update: { icon: '🚀', color: '#4caf50' },
  feature: { icon: '✨', color: '#2196f3' },
  tip: { icon: '💡', color: '#9c27b0' },
  warning: { icon: '⚠️', color: '#ff9800' },
  maintenance: { icon: '🔧', color: '#607d8b' },
  news: { icon: '📰', color: '#00bcd4' },
  info: { icon: 'ℹ️', color: '#2196f3' },
};

export const DEFAULT_NEWS_CONFIG: Required<StatusBarNewsConfig> = {
  containerId: 'status-bar',
  autoRotate: true,
  rotateInterval: 10000,
  maxVisibleChars: 100,
  onNewsClick: () => {},
  onLinkClick: () => {},
};
