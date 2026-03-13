// src/utils/tauriApiClient.ts - Tauri v2 API integration for AI services
// ============================================================================
// FIX: Changed import from '@tauri-apps/api/tauri' to '@tauri-apps/api/core'
// This is required for Tauri v2 compatibility
// ============================================================================

// ✅ CORRECT import for Tauri v2
import { invoke } from '@tauri-apps/api/core';

/**
 * Check if we're running in Tauri environment
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;
}

/**
 * Call Claude API via Tauri backend
 */
export async function callClaudeViaTauri(
  apiKey: string,
  model: string,
  message: string,
  maxTokens: number = 4000,
  temperature: number = 0.7
): Promise<string> {
  if (!isTauriEnvironment()) {
    throw new Error('Tauri environment not available');
  }

  console.log('🚀 Calling Claude API via Tauri backend...');

  try {
    // Use Tauri invoke command to call Rust backend
    const response = await invoke<string>('call_claude_api', {
      request: {
        api_key: apiKey,
        model: model,
        message: message,
        max_tokens: maxTokens,
        temperature: temperature
      }
    });

    console.log('✅ Claude API call successful via Tauri');
    return response;

  } catch (error: any) {
    console.error('❌ Tauri Claude API error:', error);
    
    const errorMsg = error?.message || error?.toString() || 'Unknown error';
    
    if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
      throw new Error('Invalid Claude API key. Please verify your key at console.anthropic.com.');
    }
    if (errorMsg.includes('402') || errorMsg.includes('payment')) {
      throw new Error('Billing required. Please add payment method to your Anthropic account.');
    }
    if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
      throw new Error('Claude API rate limit exceeded. Please wait and try again.');
    }
    
    throw new Error(`Claude API Error: ${errorMsg}`);
  }
}

/**
 * Call any AI API via Tauri backend (generic)
 * Supports: OpenAI, Deepseek, Groq, Operator X02, Kimi, Custom
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
    throw new Error('Tauri environment not available');
  }

  // ✅ FIX: Better logging to debug undefined issues
  console.log(`🚀 Calling ${provider || 'UNKNOWN'} API via Tauri backend...`);
  console.log(`   Provider: ${provider}`);
  console.log(`   Model: ${model}`);
  console.log(`   Base URL: ${baseUrl}`);

  // ✅ FIX: Validate parameters before calling
  if (!provider) {
    throw new Error('Provider is required but was undefined');
  }
  if (!apiKey) {
    throw new Error(`API key is required for ${provider}`);
  }
  if (!baseUrl) {
    throw new Error(`Base URL is required for ${provider}`);
  }
  if (!model) {
    throw new Error(`Model is required for ${provider}`);
  }
  if (!message) {
    throw new Error('Message is required');
  }

  try {
    // ✅ Build request object matching Rust GenericAiRequest struct
    const request = {
      provider: provider,
      api_key: apiKey,        // snake_case to match Rust
      base_url: baseUrl,      // snake_case to match Rust
      model: model,
      message: message,
      max_tokens: maxTokens,  // snake_case to match Rust
      temperature: temperature,
    };

    console.log('📤 Sending request to Tauri backend...');

    // ✅ Call invoke with request wrapped in { request } object
    const response = await invoke<string>('call_ai_api', { request });
    
    console.log(`✅ ${provider} API call successful via Tauri`);
    return response;

  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || 'Unknown error';
    console.error(`❌ Tauri ${provider} API error:`, errorMsg);
    
    // Provide helpful error messages
    if (errorMsg.includes('invalid args') || errorMsg.includes('invalid type')) {
      console.error('💡 Parameter format error - check request structure');
      throw new Error(`${provider} API Error: Invalid request format`);
    }
    if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
      throw new Error(`${provider} API Error: Invalid API key`);
    }
    if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
      throw new Error(`${provider} API Error: Rate limit exceeded`);
    }
    
    throw new Error(`${provider} API Error: ${errorMsg}`);
  }
}

/**
 * Test if Tauri API is working
 */
export async function testTauriApi(): Promise<boolean> {
  try {
    if (!isTauriEnvironment()) {
      return false;
    }

    const response = await invoke<string>('test_tauri_api');
    console.log('🧪 Tauri API test result:', response);
    return true;
  } catch (error) {
    console.error('🧪 Tauri API test failed:', error);
    return false;
  }
}

/**
 * Get Tauri environment info
 */
export function getTauriInfo(): any {
  if (!isTauriEnvironment()) {
    return null;
  }

  return {
    platform: (window as any).__TAURI_INTERNALS__?.metadata?.currentTarget || 'unknown',
    available: true,
  };
}

// Type declarations for Tauri
declare global {
  interface Window {
    __TAURI__: any;
    __TAURI_INTERNALS__: any;
  }
}
