// src/utils/proxyAwareCall.ts
// Operator X02 — Universal proxy-aware AI call
// Use this instead of direct invoke/fetch with hardcoded keys
// When apiKey is 'PROXY', routes through Supabase Edge Function
// When apiKey is a real key, uses Tauri invoke or direct fetch

import { callAIViaProxy } from './proxyClient';

/**
 * Smart AI call — routes through proxy when key is 'PROXY',
 * otherwise uses Tauri invoke or direct fetch as fallback.
 *
 * Drop-in replacement for invoke('call_ai_api', {...})
 */
export async function smartAICall(params: {
  provider?: string;
  apiKey?: string;
  apiBaseUrl?: string;
  baseUrl?: string;
  model?: string;
  message?: string;
  messages?: Array<{ role: string; content: string }>;
  maxTokens?: number;
  max_tokens?: number;
  temperature?: number;
  systemPrompt?: string;
}): Promise<string> {
  const provider = params.provider || 'operator_x02';
  const apiKey = params.apiKey || 'PROXY';
  const model = params.model || 'x02-coder';
  const maxTokens = params.maxTokens || params.max_tokens || 4000;
  const temperature = params.temperature || 0.7;

  // ✅ PROXY PATH — Route through Supabase
  if (apiKey === 'PROXY') {
    console.log(`🔒 [smartAICall] Routing ${provider} through proxy`);

    const messages: Array<{ role: string; content: string }> = [];

    // Add system prompt if provided
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }

    // Add messages array if provided (check if any are system messages)
    if (params.messages && params.messages.length > 0) {
      for (const msg of params.messages) {
        messages.push(msg);
      }
    }

    // Add single message if provided (and not already in messages)
    if (params.message && !params.messages?.length) {
      messages.push({ role: 'user', content: params.message });
    }

    // Ensure at least one message exists
    if (messages.length === 0) {
      throw new Error('[smartAICall] No message or messages provided');
    }

    return await callAIViaProxy({
      provider,
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    });
  }

  // ⬇️ DIRECT PATH — User has their own key
  console.log(`🔑 [smartAICall] Direct call to ${provider}`);

  // Try Tauri invoke
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const response = await invoke('call_ai_api', {
      provider,
      apiKey,
      baseUrl: params.apiBaseUrl || params.baseUrl || '',
      model,
      message: params.message || params.messages?.[params.messages.length - 1]?.content || '',
      maxTokens,
      temperature,
    });
    if (response && typeof response === 'string') {
      return response;
    }
    if (response && typeof response === 'object' && (response as any).content) {
      return (response as any).content;
    }
    return String(response || '');
  } catch (e) {
    console.warn('[smartAICall] Tauri failed, trying fetch:', e);
  }

  // Fallback: direct fetch
  const baseUrl = params.apiBaseUrl || params.baseUrl || 'PROXY';
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: params.messages || [{ role: 'user', content: params.message }],
      max_tokens: maxTokens,
      temperature,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response';
}

/**
 * Get current API config — returns PROXY config by default,
 * or user's saved key if they have one
 */
export function getProxyAwareConfig(provider: string = 'operator_x02'): any {
  const DEFAULTS: Record<string, any> = {
    operator_x02: {
      provider: 'operator_x02',
      apiKey: 'PROXY',
      apiBaseUrl: 'PROXY',
      model: 'x02-coder',
      maxTokens: 4000,
      temperature: 0.7,
    },
    groq: {
      provider: 'groq',
      apiKey: 'PROXY',
      apiBaseUrl: 'https://api.groq.com/openai/v1',
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      maxTokens: 4000,
      temperature: 0.7,
    },
    deepseek: {
      provider: 'deepseek',
      apiKey: 'PROXY',
      apiBaseUrl: 'PROXY',
      model: 'deepseek-chat',
      maxTokens: 4000,
      temperature: 0.7,
    },
    openai: {
      provider: 'openai',
      apiKey: 'PROXY',
      apiBaseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      maxTokens: 4000,
      temperature: 0.7,
    },
    claude: {
      provider: 'claude',
      apiKey: 'PROXY',
      apiBaseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-sonnet-4-20250514',
      maxTokens: 4000,
      temperature: 0.7,
    },
    kimi: {
      provider: 'kimi',
      apiKey: 'PROXY',
      apiBaseUrl: 'https://api.moonshot.cn/v1',
      model: 'moonshot-v1-8k',
      maxTokens: 4000,
      temperature: 0.7,
    },
    gemini: {
      provider: 'gemini',
      apiKey: 'PROXY',
      apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.5-flash',
      maxTokens: 4000,
      temperature: 0.7,
    },
    cohere: {
      provider: 'cohere',
      apiKey: 'PROXY',
      apiBaseUrl: 'https://api.cohere.ai/v1',
      model: 'command-r-plus',
      maxTokens: 4000,
      temperature: 0.7,
    },
  };

  // Check if user has their own key saved
  try {
    const saved = localStorage.getItem('providerApiKeys');
    if (saved) {
      const keys = JSON.parse(saved);
      if (keys[provider] && keys[provider] !== 'PROXY') {
        return { ...DEFAULTS[provider], apiKey: keys[provider] };
      }
    }
  } catch {}

  // Check aiApiConfig (Quick Switch active provider)
  try {
    const s = localStorage.getItem('aiApiConfig');
    if (s) {
      const c = JSON.parse(s);
      if (c.provider === provider && c.apiKey && c.apiKey !== 'PROXY') {
        return c;
      }
    }
  } catch {}

  return DEFAULTS[provider] || DEFAULTS.operator_x02;
}

// ============================================================================
// GLOBAL EXPOSURE — So all existing files can use it without imports
// ============================================================================

(window as any).smartAICall = smartAICall;
(window as any).getProxyAwareConfig = getProxyAwareConfig;

console.log('✅ [proxyAwareCall] Loaded — window.smartAICall available');
