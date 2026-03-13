/**
 * ====================================================================================================
 * FILE: src/ide/newsSystem/statusBarNewsSupabase.ts - Supabase Integration for Status Bar News
 * ====================================================================================================
 * 
 * DESCRIPTION:
 * Extends the status bar news system with Supabase integration for:
 * - Fetching news from database (anonymous, no login required)
 * - Real-time updates
 * 
 * USAGE:
 * import { initStatusBarNewsWithSupabase } from './newsSystem';
 * await initStatusBarNewsWithSupabase();
 * 
 * ====================================================================================================
 */

import {
  initStatusBarNews,
  setNewsItems,
  showNews,
  hideNews,
  getNewsState,
} from './statusBarNews';

import {
  isSupabaseConfigured,
} from './supabaseClient';

import {
  fetchNewsItems,
  subscribeToNewsUpdates,
} from './newsService';

import { NewsItem, StatusBarNewsConfig } from './newsTypes';

// ====================================
// State
// ====================================

let isInitialized = false;
let unsubscribeRealtime: (() => void) | null = null;

// ====================================
// Main Initialization
// ====================================

/**
 * Initialize status bar news with Supabase integration
 */
export async function initStatusBarNewsWithSupabase(
  config: Partial<StatusBarNewsConfig> = {}
): Promise<void> {
  if (isInitialized) {
    console.log('[NewsSupabase] Already initialized');
    return;
  }
  
  console.log('[NewsSupabase] 🚀 Initializing...');
  
  // Initialize the base status bar news system
  initStatusBarNews({
    ...config,
    
    onNewsClick: (item: NewsItem) => {
      config.onNewsClick?.(item);
    },
    
    onLinkClick: (item: NewsItem) => {
      config.onLinkClick?.(item);
      // URL opening is handled by statusBarNews.ts openExternalUrl
    },
  });
  
  // Load news from Supabase if configured
  if (isSupabaseConfigured()) {
    await loadNewsFromSupabase();
    setupRealtimeSubscription();
    console.log('[NewsSupabase] ✅ Supabase integration enabled');
  } else {
    console.log('[NewsSupabase] ⚠️ Supabase not configured, no news to display');
  }
  
  isInitialized = true;
}

// ====================================
// News Loading
// ====================================

/**
 * Load news from Supabase
 */
async function loadNewsFromSupabase(): Promise<void> {
  try {
    const items = await fetchNewsItems();
    setNewsItems(items);
    
    if (items.length > 0) {
      showNews();
    }
    
    console.log(`[NewsSupabase] ✅ Loaded ${items.length} news items`);
  } catch (error) {
    console.error('[NewsSupabase] Error loading news:', error);
  }
}

// ====================================
// Real-time Updates
// ====================================

/**
 * Setup real-time subscription for news updates
 */
function setupRealtimeSubscription(): void {
  unsubscribeRealtime = subscribeToNewsUpdates(
    // On insert
    (item: NewsItem) => {
      console.log('[NewsSupabase] 📥 New news:', item.title);
      const state = getNewsState();
      setNewsItems([item, ...state.items]);
      showNews();
    },
    
    // On update
    (item: NewsItem) => {
      console.log('[NewsSupabase] 📝 News updated:', item.title);
      const state = getNewsState();
      const updatedItems = state.items.map(i => i.id === item.id ? item : i);
      setNewsItems(updatedItems);
    },
    
    // On delete
    (id: string) => {
      console.log('[NewsSupabase] 🗑️ News deleted:', id);
      const state = getNewsState();
      const filteredItems = state.items.filter(i => i.id !== id);
      setNewsItems(filteredItems);
    }
  );
}

// ====================================
// Public API
// ====================================

/**
 * Refresh news from Supabase
 */
export async function refreshNews(): Promise<void> {
  if (isSupabaseConfigured()) {
    await loadNewsFromSupabase();
  }
}

/**
 * Destroy and cleanup
 */
export function destroyStatusBarNewsWithSupabase(): void {
  if (unsubscribeRealtime) {
    unsubscribeRealtime();
    unsubscribeRealtime = null;
  }
  
  isInitialized = false;
  console.log('[NewsSupabase] 🗑️ Destroyed');
}

// ====================================
// Re-exports
// ====================================

export {
  showNews,
  hideNews,
  getNewsState,
  setNewsItems,
} from './statusBarNews';

export {
  isSupabaseConfigured,
} from './supabaseClient';

export {
  fetchNewsItems,
} from './newsService';
