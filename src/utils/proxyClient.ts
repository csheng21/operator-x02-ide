// proxyClient.ts
// Operator X02 — Secure AI Proxy Client
// Drop this into your src/ide/ folder
// NO API keys stored in the app — all keys live on Supabase

// ============================================================================
// 🔧 CONFIGURATION — UPDATE THESE TWO VALUES
// ============================================================================

// Your Supabase project URL (same one you use for news system)
const PROXY_BASE_URL = 'https://wzxfxpzztracfowtllqq.supabase.co/functions/v1/smart-action';

// App token — authenticates requests as coming from OperatorX02
// This is NOT an API key. It just proves the request is from your app.
// Safe to ship in .exe — your proxy has its own rate limits.
const APP_TOKEN = 'opx02-2026-abc123xyz';

// ============================================================================
// TYPES
// ============================================================================

export interface ProxyRequest {
  provider: string;
  model?: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
  temperature?: number;
}

export interface ProxyResponse {
  choices: Array<{
    message: { role: string; content: string };
  }>;
  usage?: any;
  provider?: string;
  error?: string;
}

// ============================================================================
// CORE PROXY CALL
// ============================================================================

/**
 * Call any AI provider through the secure Supabase proxy.
 * The proxy adds the real API key server-side.
 * 
 * @example
 * const reply = await callAIViaProxy({
 *   provider: 'operator_x02',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 */
export async function callAIViaProxy(request: ProxyRequest): Promise<string> {
  console.log(`🔒 [Proxy] Calling ${request.provider}...`);

  const response = await fetch(PROXY_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-app-token': APP_TOKEN,
    },
    body: JSON.stringify({
      provider: request.provider,
      model: request.model,
      messages: request.messages,
      max_tokens: request.max_tokens || 4000,
      temperature: request.temperature || 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));

    if (response.status === 401) throw new Error('App authentication failed. Please update the app.');
    if (response.status === 429) throw new Error('Rate limit exceeded. Please wait a moment.');
    if (response.status === 503) throw new Error(err.error || `${request.provider} is not available.`);

    throw new Error(err.error || `Proxy error: ${response.status}`);
  }

  const data: ProxyResponse = await response.json();

  if (data.choices && data.choices.length > 0) {
    console.log(`✅ [Proxy] ${request.provider} responded`);
    return data.choices[0].message.content;
  }

  throw new Error('Empty response from AI provider');
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

/**
 * Simple: just provider + message
 */
export async function proxyChat(
  provider: string,
  message: string,
  systemPrompt?: string,
  model?: string
): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: message });

  return callAIViaProxy({ provider, model, messages });
}

/**
 * With full conversation history
 */
export async function proxyChatWithHistory(
  provider: string,
  messages: Array<{ role: string; content: string }>,
  model?: string,
  maxTokens?: number,
  temperature?: number
): Promise<string> {
  return callAIViaProxy({
    provider,
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  });
}

/**
 * Test if a specific provider is working
 */
export async function testProxyProvider(provider: string): Promise<{ ok: boolean; error?: string; latencyMs?: number }> {
  const start = Date.now();
  try {
    await callAIViaProxy({
      provider,
      messages: [{ role: 'user', content: 'Say "ok"' }],
      max_tokens: 5,
      temperature: 0,
    });
    return { ok: true, latencyMs: Date.now() - start };
  } catch (error) {
    return { ok: false, error: (error as Error).message, latencyMs: Date.now() - start };
  }
}

/**
 * Health check — which providers are configured on the server
 */
export async function checkProxyHealth(): Promise<Record<string, boolean>> {
  try {
    const res = await fetch(`${PROXY_BASE_URL}?health=1`);
    const data = await res.json();
    return data.providers || {};
  } catch {
    return {};
  }
}
