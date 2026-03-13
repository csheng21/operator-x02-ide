// supabase/functions/ai-proxy/index.ts
// Operator X02 — Secure AI Proxy
// All API keys stay here on the server, NEVER shipped in the .exe

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ============================================================================
// CORS HEADERS
// ============================================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-app-token, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================================
// PROVIDER CONFIGURATIONS (keys from Supabase Secrets)
// ============================================================================
interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
}

function getProviderConfig(provider: string): ProviderConfig | null {
  const configs: Record<string, ProviderConfig> = {
    operator_x02: {
      apiKey: Deno.env.get("DEEPSEEK_API_KEY") || "",
      baseUrl: "https://api.deepseek.com/v1",
      defaultModel: "deepseek-coder",
    },
    deepseek: {
      apiKey: Deno.env.get("DEEPSEEK_API_KEY") || "",
      baseUrl: "https://api.deepseek.com/v1",
      defaultModel: "deepseek-chat",
    },
    openai: {
      apiKey: Deno.env.get("OPENAI_API_KEY") || "",
      baseUrl: "https://api.openai.com/v1",
      defaultModel: "gpt-4o-mini",
    },
    groq: {
      apiKey: Deno.env.get("GROQ_API_KEY") || "",
      baseUrl: "https://api.groq.com/openai/v1",
      defaultModel: "meta-llama/llama-4-scout-17b-16e-instruct",
    },
    claude: {
      apiKey: Deno.env.get("CLAUDE_API_KEY") || "",
      baseUrl: "https://api.anthropic.com/v1",
      defaultModel: "claude-sonnet-4-20250514",
    },
    gemini: {
      apiKey: Deno.env.get("GEMINI_API_KEY") || "",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      defaultModel: "gemini-2.5-flash",
    },
    kimi: {
      apiKey: Deno.env.get("KIMI_API_KEY") || "",
      baseUrl: "https://api.moonshot.cn/v1",
      defaultModel: "moonshot-v1-8k",
    },
  };
  return configs[provider] || null;
}

// ============================================================================
// APP TOKEN VERIFICATION
// ============================================================================
function verifyAppToken(token: string | null): boolean {
  const validToken = Deno.env.get("APP_SECRET_TOKEN");
  if (!validToken) {
    console.warn("⚠️ APP_SECRET_TOKEN not set");
    return false;
  }
  return token === validToken;
}

// ============================================================================
// RATE LIMITING (in-memory, resets on cold start)
// ============================================================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, maxPerMinute = 60): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= maxPerMinute) return false;
  entry.count++;
  return true;
}

// ============================================================================
// CLAUDE API (different request/response format)
// ============================================================================
async function callClaudeAPI(
  config: ProviderConfig,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number
): Promise<Response> {
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  const body: any = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: chatMessages,
  };
  if (systemMsg) body.system = systemMsg.content;

  const res = await fetch(`${config.baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  // Normalize to OpenAI-compatible format
  if (data.content && Array.isArray(data.content)) {
    const text = data.content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("");
    return jsonResponse({
      choices: [{ message: { role: "assistant", content: text } }],
      usage: data.usage,
      provider: "claude",
    });
  }

  return jsonResponse(data, res.status);
}

// ============================================================================
// GEMINI API (different request/response format)
// ============================================================================
async function callGeminiAPI(
  config: ProviderConfig,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number
): Promise<Response> {
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  const geminiMessages = chatMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body: any = {
    contents: geminiMessages,
    generationConfig: { maxOutputTokens: maxTokens, temperature },
  };
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  const url = `${config.baseUrl}/models/${model}:generateContent?key=${config.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (data.candidates && data.candidates.length > 0) {
    const text =
      data.candidates[0].content?.parts?.map((p: any) => p.text).join("") || "";
    return jsonResponse({
      choices: [{ message: { role: "assistant", content: text } }],
      usage: data.usageMetadata,
      provider: "gemini",
    });
  }

  return jsonResponse(data, res.status);
}

// ============================================================================
// OPENAI-COMPATIBLE API (Deepseek, OpenAI, Groq, Kimi)
// ============================================================================
async function callOpenAICompatible(
  config: ProviderConfig,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number
): Promise<Response> {
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: false,
    }),
  });

  const data = await res.json();
  return jsonResponse(data, res.status);
}

// ============================================================================
// HELPER: JSON Response with CORS
// ============================================================================
function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================
function handleHealthCheck(): Response {
  const providers: Record<string, boolean> = {};
  for (const p of ["operator_x02","deepseek","openai","groq","claude","gemini","kimi"]) {
    const cfg = getProviderConfig(p);
    providers[p] = !!(cfg && cfg.apiKey);
  }
  return jsonResponse({ status: "ok", providers });
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse URL path for health check
    const url = new URL(req.url);
    if (url.searchParams.get("health") === "1") {
      return handleHealthCheck();
    }

    // 1. Verify app token
    const appToken = req.headers.get("x-app-token");
    if (!verifyAppToken(appToken)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // 2. Rate limit
    const clientIP = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(clientIP)) {
      return jsonResponse({ error: "Rate limit exceeded. Try again in a moment." }, 429);
    }

    // 3. Parse request
    const body = await req.json();
    const {
      provider,
      model,
      messages,
      max_tokens = 4000,
      temperature = 0.7,
    } = body;

    if (!provider || !messages || !Array.isArray(messages)) {
      return jsonResponse({ error: "Missing: provider, messages[]" }, 400);
    }

    // 4. Get provider config (real API key from secrets)
    const config = getProviderConfig(provider);
    if (!config) {
      return jsonResponse({ error: `Unknown provider: ${provider}` }, 400);
    }
    if (!config.apiKey) {
      return jsonResponse({ error: `${provider} not configured. Contact admin.` }, 503);
    }

    const selectedModel = model || config.defaultModel;
    console.log(`🔀 Proxy → ${provider} (${selectedModel})`);

    // 5. Route to handler
    switch (provider) {
      case "claude":
        return await callClaudeAPI(config, selectedModel, messages, max_tokens, temperature);
      case "gemini":
        return await callGeminiAPI(config, selectedModel, messages, max_tokens, temperature);
      default:
        return await callOpenAICompatible(config, selectedModel, messages, max_tokens, temperature);
    }
  } catch (error) {
    console.error("Proxy error:", error);
    return jsonResponse({ error: `Proxy error: ${(error as Error).message}` }, 500);
  }
});
