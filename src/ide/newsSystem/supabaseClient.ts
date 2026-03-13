/**
 * ====================================================================================================
 * FILE: src/ide/newsSystem/supabaseClient.ts - Supabase Client Configuration
 * ====================================================================================================
 * 
 * Minimal Supabase client for anonymous news fetching. No auth required.
 * 
 * ====================================================================================================
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ====================================
// CONFIGURATION
// ====================================

const SUPABASE_URL = 'https://wzxfxpzztracfowtllqq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5Vl40XtS1NJW51-ZJSrx5Q_mEwuPv2X';

// ====================================
// Supabase Client Instance
// ====================================

let supabaseInstance: SupabaseClient | null = null;

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && 
         SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
         SUPABASE_URL.startsWith('https://');
}

/**
 * Get or create Supabase client instance
 * Returns null if not configured
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    console.log('[Supabase] ⚠️ Not configured');
    return null;
  }
  
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('[Supabase] ✅ Client initialized');
    } catch (error) {
      console.error('[Supabase] ❌ Failed to create client:', error);
      return null;
    }
  }
  
  return supabaseInstance;
}

// ====================================
// Database Types
// ====================================

export interface DbNewsItem {
  id: string;
  type: string;
  icon: string;
  title: string;
  content: string;
  badge: string | null;
  link_text: string | null;
  link_url: string | null;
  version: string | null;
  is_pinned: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
