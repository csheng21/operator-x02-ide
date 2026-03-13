// tauriApiClient.ts - Tauri Backend API Client for CORS-restricted APIs
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

/**
 * Check if running in Tauri environment
 */
export function isTauriEnvironment(): boolean {
  return !!(window as any).__TAURI_INTERNALS__;
}

// ============================================================================
// CLAUDE API (CORS-RESTRICTED - REQUIRES TAURI)
// ============================================================================

/**
 * Call Claude API via Tauri backend
 * This bypasses CORS restrictions that prevent direct browser calls
 */
export async function callClaudeViaTauri(
  apiKey: string,
  model: string,
  message: string,
  maxTokens: number = 4000,
  temperature: number = 0.7
): Promise<string> {
  if (!isTauriEnvironment()) {
    throw new Error('Claude API requires Tauri desktop environment due to CORS restrictions');
  }

  console.log('🔐 Calling Claude API via Tauri backend...');
  console.log(`   Model: ${model}`);
  console.log(`   Message length: ${message.length} chars`);

  try {
    const result = await invoke<string>('call_claude_api', {
      request: {
        api_key: apiKey,
        model: model || 'claude-sonnet-4-20250514',
        message: message,
        max_tokens: maxTokens,
        temperature: temperature
      }
    });

    console.log('✅ Claude API response received via Tauri');
    console.log(`   Response length: ${result.length} chars`);
    
    return result;
  } catch (error: any) {
    console.error('❌ Claude API Tauri error:', error);
    throw new Error(`Claude API Error: ${error?.message || error}`);
  }
}

// ============================================================================
// GENERIC AI API (FOR OTHER PROVIDERS VIA TAURI)
// ============================================================================

/**
 * Call generic AI API via Tauri backend
 * Supports OpenAI-compatible APIs (Groq, Deepseek, OpenAI, etc.)
 */
export async function callAiApiViaTauri(
  provider: string,
  apiKey: string,
  baseUrl: string,
  model: string,
  message: string,
  maxTokens: number = 4000,
  temperature: number = 0.7
): Promise<string> {
  if (!isTauriEnvironment()) {
    throw new Error('Tauri backend required for this operation');
  }

  console.log(`🤖 Calling ${provider} API via Tauri backend...`);
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   Model: ${model}`);

  try {
    const result = await invoke<string>('call_ai_api', {
      request: {
        provider: provider,
        api_key: apiKey,
        base_url: baseUrl,
        model: model,
        message: message,
        max_tokens: maxTokens,
        temperature: temperature
      }
    });

    console.log(`✅ ${provider} API response received via Tauri`);
    return result;
  } catch (error: any) {
    console.error(`❌ ${provider} API Tauri error:`, error);
    throw new Error(`${provider} API Error: ${error?.message || error}`);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Test Tauri API connection
 */
export async function testTauriConnection(): Promise<boolean> {
  if (!isTauriEnvironment()) {
    console.log('Not in Tauri environment');
    return false;
  }

  try {
    const result = await invoke<string>('test_tauri_api');
    console.log('✅ Tauri API connection test successful:', result);
    return true;
  } catch (error) {
    console.error('❌ Tauri API connection test failed:', error);
    return false;
  }
}

/**
 * Get provider recommendation based on environment
 */
export function getRecommendedProviders(): { provider: string; reason: string }[] {
  const isTauri = isTauriEnvironment();
  
  if (isTauri) {
    return [
      { provider: 'claude', reason: 'Best quality, works via Tauri backend' },
      { provider: 'groq', reason: 'Very fast, free tier available' },
      { provider: 'gemini', reason: 'Good quality, generous free tier' },
      { provider: 'deepseek', reason: 'Good for coding tasks' }
    ];
  } else {
    return [
      { provider: 'groq', reason: 'Very fast, works in browser' },
      { provider: 'gemini', reason: 'Good quality, works in browser' },
      { provider: 'deepseek', reason: 'Good for coding, works in browser' },
      // Claude not recommended in browser mode
    ];
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  isTauriEnvironment,
  callClaudeViaTauri,
  callAiApiViaTauri,
  testTauriConnection,
  getRecommendedProviders
};
