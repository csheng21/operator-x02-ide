/**
 * ====================================================================================================
 * FILE: src/ide/newsSystem/newsService.ts - News Service (Anonymous, Read-Only)
 * ====================================================================================================
 * 
 * Service layer for fetching news items via Supabase. No auth required.
 * 
 * ====================================================================================================
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { 
  getSupabaseClient, 
  isSupabaseConfigured,
  DbNewsItem,
} from './supabaseClient';
import { NewsItem, NewsType } from './newsTypes';

// ====================================
// Type Conversions
// ====================================

/**
 * Convert database news item to app NewsItem
 */
function dbToNewsItem(dbItem: DbNewsItem): NewsItem {
  return {
    id: dbItem.id,
    type: dbItem.type as NewsType,
    icon: dbItem.icon,
    title: dbItem.title,
    content: dbItem.content,
    badge: dbItem.badge,
    linkText: dbItem.link_text,
    linkUrl: dbItem.link_url,
    version: dbItem.version,
    date: new Date(dbItem.created_at),
    isRead: false,
    isPinned: dbItem.is_pinned,
  };
}

// ====================================
// News Fetching
// ====================================

/**
 * Fetch all active news items
 */
export async function fetchNewsItems(): Promise<NewsItem[]> {
  if (!isSupabaseConfigured()) {
    console.warn('[NewsService] Supabase not configured');
    return [];
  }
  
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  
  try {
    const { data: newsItems, error } = await supabase
      .from('news_items')
      .select('*')
      .eq('is_active', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[NewsService] Error fetching news:', error);
      throw error;
    }
    
    if (!newsItems || newsItems.length === 0) {
      return [];
    }
    
    const items = newsItems.map(dbItem => dbToNewsItem(dbItem));
    
    console.log(`[NewsService] ✅ Fetched ${items.length} news items`);
    return items;
    
  } catch (error) {
    console.error('[NewsService] Error in fetchNewsItems:', error);
    throw error;
  }
}

// ====================================
// Real-time Subscriptions
// ====================================

let newsSubscription: RealtimeChannel | null = null;

/**
 * Subscribe to real-time news updates
 */
export function subscribeToNewsUpdates(
  onInsert: (item: NewsItem) => void,
  onUpdate: (item: NewsItem) => void,
  onDelete: (id: string) => void
): () => void {
  if (!isSupabaseConfigured()) {
    return () => {};
  }
  
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};
  
  if (newsSubscription) {
    newsSubscription.unsubscribe();
  }
  
  newsSubscription = supabase
    .channel('news_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'news_items',
      },
      (payload) => {
        const item = dbToNewsItem(payload.new as DbNewsItem);
        onInsert(item);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'news_items',
      },
      (payload) => {
        const item = dbToNewsItem(payload.new as DbNewsItem);
        
        if (!(payload.new as DbNewsItem).is_active) {
          onDelete((payload.new as DbNewsItem).id);
        } else {
          onUpdate(item);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'news_items',
      },
      (payload) => {
        onDelete((payload.old as DbNewsItem).id);
      }
    )
    .subscribe((status) => {
      console.log('[NewsService] Realtime status:', status);
    });
  
  console.log('[NewsService] ✅ Subscribed to real-time updates');
  
  return () => {
    if (newsSubscription) {
      newsSubscription.unsubscribe();
      newsSubscription = null;
    }
  };
}
