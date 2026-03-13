/**
 * ====================================================================================================
 * FILE: src/ide/newsSystem/index.ts - News System Module Exports
 * ====================================================================================================
 * 
 * USAGE (Local mode - no Supabase):
 * import { initStatusBarNews, setNewsItems, addNewsItem } from './newsSystem';
 * initStatusBarNews();
 * 
 * USAGE (With Supabase):
 * import { initStatusBarNewsWithSupabase } from './newsSystem';
 * await initStatusBarNewsWithSupabase();
 * 
 * ====================================================================================================
 */

// Export all types
export * from './newsTypes';

// Export base status bar news functions (local mode)
export {
  initStatusBarNews,
  setNewsItems,
  addNewsItem,
  showNews,
  hideNews,
  toggleNews,
  markAllAsRead,
  markAsRead,
  getNewsState,
  clearNews,
  destroyStatusBarNews,
} from './statusBarNews';

// Export Supabase client functions
export {
  getSupabaseClient,
  isSupabaseConfigured,
} from './supabaseClient';

// Export news service functions
export {
  fetchNewsItems,
  subscribeToNewsUpdates,
} from './newsService';

// Export Supabase-integrated status bar news functions
export {
  initStatusBarNewsWithSupabase,
  refreshNews,
  destroyStatusBarNewsWithSupabase,
} from './statusBarNewsSupabase';
