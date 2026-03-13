// src/utils/proxyHealthCheck.ts
// Checks which AI providers are actually configured on the Supabase proxy
// Caches results so the Quick Switch panel shows accurate status

const PROXY_HEALTH_URL = 'https://wzxfxpzztracfowtllqq.supabase.co/functions/v1/smart-action?health=1';

// Cache key
const CACHE_KEY = '__proxyProviderStatus';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface ProviderStatus {
  providers: Record<string, boolean>;
  timestamp: number;
}

/**
 * Get cached provider status (synchronous - for UI rendering)
 * Returns which providers have real API keys on the server
 */
export function getProviderStatus(): Record<string, boolean> {
  const cached = (window as any)[CACHE_KEY] as ProviderStatus | undefined;
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.providers;
  }
  // Return empty if no cache - will be populated after fetchProviderStatus()
  return {};
}

/**
 * Check if a specific provider is active on the server
 * Returns: true = has key on server, false = no key, null = unknown (not yet checked)
 */
export function isProviderActive(providerId: string): boolean | null {
  const status = getProviderStatus();
  if (Object.keys(status).length === 0) return null; // Not yet checked
  return status[providerId] ?? false;
}

/**
 * Fetch provider status from the proxy health endpoint (async)
 * Call this on app startup and when Quick Switch opens
 */
export async function fetchProviderStatus(): Promise<Record<string, boolean>> {
  try {
    console.log('🔍 [ProxyHealth] Checking provider status...');
    const response = await fetch(PROXY_HEALTH_URL);
    
    if (!response.ok) {
      console.warn('⚠️ [ProxyHealth] Health check failed:', response.status);
      return {};
    }

    const data = await response.json();
    const providers = data.providers || {};

    // deepseek key on server is for operator_x02 only — separate deepseek provider needs user's own key
    if (providers.deepseek !== undefined) {
      providers.deepseek = false;
    }

    // Cache the results
    (window as any)[CACHE_KEY] = {
      providers,
      timestamp: Date.now()
    } as ProviderStatus;

    console.log('✅ [ProxyHealth] Provider status:', providers);
    return providers;
  } catch (error) {
    console.warn('⚠️ [ProxyHealth] Could not reach proxy:', error);
    return {};
  }
}

/**
 * Force refresh the cache
 */
export async function refreshProviderStatus(): Promise<Record<string, boolean>> {
  (window as any)[CACHE_KEY] = null;
  return await fetchProviderStatus();
}

// ============================================================================
// GLOBAL EXPOSURE
// ============================================================================

(window as any).proxyHealth = {
  fetch: fetchProviderStatus,
  refresh: refreshProviderStatus,
  getStatus: getProviderStatus,
  isActive: isProviderActive
};

// Auto-fetch on load
fetchProviderStatus();

console.log('✅ [ProxyHealth] Loaded — checking provider status...');
