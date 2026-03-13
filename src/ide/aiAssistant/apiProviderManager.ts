// apiProviderManager.ts - Complete Enhanced Multi-Provider API Management
// UPDATED: Multi-provider support with Supabase proxy

import { getCurrentApiConfiguration, getProviderDisplayName, saveApiConfiguration, validateApiConfiguration } from '../../state';
import { isTauriEnvironment, callClaudeViaTauri, callAiApiViaTauri } from "../../utils/tauriApiClient";
import { buildIntelligentSystemPrompt } from '../../intelligentContextProvider';
import { getIdeScriptAwarePrompt } from '../ideScriptBridge';
import { showCalibrationPanel } from '../../calibrationUI';
import './quickSwitchEffects';
import { callAIViaProxy } from '../../utils/proxyClient';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ApiProvider = 'operator_x02' | 'deepseek' | 'claude' | 'openai' | 'gemini' | 'cohere' | 'groq' | 'kimi' | 'ollama' | 'custom';

export interface ApiConfiguration {
  provider: ApiProvider;
  apiKey: string;
  apiBaseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}
// ============================================================================
// API KEY STORAGE SYSTEM - NEW
// ============================================================================

const API_KEYS_STORAGE_KEY = 'providerApiKeys';

/**
 * Get saved API keys for all providers
 * @returns Map of provider -> API key
 */
function getSavedApiKeys(): Record<string, string> {
  try {
    const saved = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading saved API keys:', error);
  }
  return {};
}

/**
 * Save API key for a specific provider
 * @param provider - Provider name
 * @param apiKey - API key to save
 */
function saveProviderApiKey(provider: string, apiKey: string): void {
  try {
    const savedKeys = getSavedApiKeys();
    savedKeys[provider] = apiKey;
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(savedKeys));
    console.log(`✅ Saved API key for ${provider} to persistent storage`);
  } catch (error) {
    console.error('Error saving API key:', error);
  }
}

/**
 * Get saved API key for a specific provider
 * @param provider - Provider name
 * @returns Saved API key or null if not found
 */
function getProviderApiKey(provider: string): string | null {
  const savedKeys = getSavedApiKeys();
  return savedKeys[provider] || null;
}

/**
 * Remove saved API key for a specific provider
 * @param provider - Provider name
 */
function removeProviderApiKey(provider: string): void {
  try {
    const savedKeys = getSavedApiKeys();
    delete savedKeys[provider];
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(savedKeys));
    console.log(`🗑️ Removed saved API key for ${provider}`);
  } catch (error) {
    console.error('Error removing API key:', error);
  }
}
// ============================================================================
// DEFAULT CONFIGURATIONS - READY-TO-USE PROVIDERS
// ============================================================================

// 🔒 Operator X02 is the DEFAULT IDE provider - always available via Supabase proxy
const OPERATOR_X02_API_CONFIG: ApiConfiguration = {
  provider: 'operator_x02',
  apiKey: 'PROXY',
  apiBaseUrl: 'PROXY',
  model: 'x02-coder',
  maxTokens: 4000,
  temperature: 0.7
};

// Default fallback config - uses Operator X02 as it's the default IDE provider
const DEFAULT_API_CONFIG: ApiConfiguration = OPERATOR_X02_API_CONFIG;

const DEEPSEEK_API_CONFIG: ApiConfiguration = {
  provider: 'deepseek',
  apiKey: '', // User needs to provide their own API key
  apiBaseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  maxTokens: 4000,
  temperature: 0.7
};

const OPENAI_API_CONFIG: ApiConfiguration = {
  provider: 'openai',
  apiKey: '', // User needs to provide their own API key
  apiBaseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  maxTokens: 4000,
  temperature: 0.7
};

// ============================================================================
// PROVIDER DISPLAY HELPERS
// ============================================================================

/**
 * Get SVG icon for provider
 * @param provider - Provider name
 * @returns SVG icon string
 */
function getProviderIcon(provider: string): string {
  const icons: Record<string, string> = {
    groq: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    operator_x02: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
      <path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    deepseek: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    openai: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
      <path d="M12 1V3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 21V23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M4.22 4.22L5.64 5.64" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M18.36 18.36L19.78 19.78" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M1 12H3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M21 12H23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M4.22 19.78L5.64 18.36" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M18.36 5.64L19.78 4.22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    claude: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 16V8C21 6.89543 20.1046 6 19 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18H19C20.1046 18 21 17.1046 21 16Z" stroke="currentColor" stroke-width="2"/>
      <path d="M9 12H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <circle cx="7" cy="12" r="1" fill="currentColor"/>
      <circle cx="17" cy="12" r="1" fill="currentColor"/>
    </svg>`,
    gemini: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    cohere: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="3" stroke="currentColor" stroke-width="2"/>
      <circle cx="8" cy="16" r="3" stroke="currentColor" stroke-width="2"/>
      <circle cx="16" cy="16" r="3" stroke="currentColor" stroke-width="2"/>
      <path d="M12 11L8 13" stroke="currentColor" stroke-width="2"/>
      <path d="M12 11L16 13" stroke="currentColor" stroke-width="2"/>
    </svg>`,
    ollama: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke="currentColor" stroke-width="2"/>
      <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
      <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
      <path d="M8 15C8 15 9.5 17 12 17C14.5 17 16 15 16 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    custom: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
      <path d="M12 1V3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 21V23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M4.22 4.22L5.64 5.64" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M18.36 18.36L19.78 19.78" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M1 12H3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M21 12H23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M4.22 19.78L5.64 18.36" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M18.36 5.64L19.78 4.22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`
  };
  return icons[provider] || `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" stroke-width="2"/>
    <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
    <path d="M8 15H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

/**
 * Get provider color for UI styling
 * @param provider - Provider name
 * @returns Color hex code
 */
function getProviderColor(provider: string): string {
  const colors: Record<string, string> = {
    operator_x02: '#9c27b0',  // Purple
    groq: '#f55036',          // Red-orange
    deepseek: '#0066ff',      // Blue
    openai: '#10a37f',        // Green
    claude: '#cc785c',        // Terracotta
    gemini: '#4285f4',        // Google Blue
    cohere: '#ff6b6b',        // Coral
    ollama: '#ffffff',        // White
    custom: '#607d8b'         // Blue-grey
  };
  return colors[provider] || '#4fc3f7';
}

/**
 * Get provider gradient for button background
 * @param provider - Provider name
 * @returns CSS gradient string
 */
function getProviderGradient(provider: string): string {
  const gradients: Record<string, string> = {
    operator_x02: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
    groq: 'linear-gradient(135deg, #f55036 0%, #ff7043 100%)',
    deepseek: 'linear-gradient(135deg, #0066ff 0%, #4fc3f7 100%)',
    openai: 'linear-gradient(135deg, #10a37f 0%, #1ed760 100%)',
    claude: 'linear-gradient(135deg, #cc785c 0%, #d4a574 100%)',
    gemini: 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)',
    cohere: 'linear-gradient(135deg, #ff6b6b 0%, #ffa07a 100%)',
    ollama: 'linear-gradient(135deg, #424242 0%, #616161 100%)',
    custom: 'linear-gradient(135deg, #607d8b 0%, #78909c 100%)'
  };
  return gradients[provider] || 'linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%)';
}

/**
 * Get display name for provider
 * @param provider - Provider name
 * @returns Human-readable provider name
 */
function getProviderShortName(provider: string): string {
  const names: Record<string, string> = {
    groq: 'Groq',
    operator_x02: 'Operator X02',
    deepseek: 'Deepseek',
    openai: 'OpenAI',
    claude: 'Claude',
    gemini: 'Gemini',
    cohere: 'Cohere',
    ollama: 'Ollama',
    custom: 'Custom'
  };
  return names[provider] || provider;
}

/**
 * Check if provider needs API key configuration
 * @param provider - Provider ID
 * @returns true if provider needs user to add API key
 */
function providerNeedsApiKey(provider: string): boolean {
  const config = DEFAULT_PROVIDER_CONFIGS[provider as ApiProvider];
  if (!config) return false;
  
  // Providers that don't need API keys
  if (provider === 'ollama') return false;
  
  // Check if API key is empty or placeholder
  const hasValidKey = config.apiKey && 
                      config.apiKey !== '' && 
                      config.apiKey !== 'YOUR_OPENAI_KEY_HERE' &&
                      !config.apiKey.startsWith('YOUR_') ||
                      config.apiKey === 'PROXY'; // PROXY counts as valid (Supabase proxy)
  
  return !hasValidKey;
}

/**
 * Check if provider has an API key already configured
 * @param provider - Provider name
 * @returns true if provider has a key saved
 */
function providerHasApiKey(provider: string): boolean {
  // Check if provider doesn't need a key at all
  if (provider === 'ollama') return false;
  
  // Get the current active configuration
  const currentConfig = getCurrentApiConfigurationForced();
  
  // Debug logging
  console.log(`🔍 Checking hasKey for ${provider}:`);
  
  // First check if this is the current provider and if currentConfig has a key
  if (currentConfig && currentConfig.provider === provider) {
    console.log(`  - Is current provider: YES`);
    console.log(`  - Current apiKey:`, currentConfig.apiKey ? `${currentConfig.apiKey.substring(0, 10)}...` : 'EMPTY');
    if (currentConfig.apiKey && 
        currentConfig.apiKey !== '' && 
        currentConfig.apiKey !== 'YOUR_OPENAI_KEY_HERE' &&
        !currentConfig.apiKey.startsWith('YOUR_')) {
      console.log(`  - ✅ Has valid key in currentConfig`);
      return true;
    }
  } else {
    console.log(`  - Is current provider: NO (current is ${currentConfig?.provider})`);
  }
  
  // Check saved keys in localStorage
  const savedKey = getProviderApiKey(provider);
  console.log(`  - Saved key in localStorage:`, savedKey ? `${savedKey.substring(0, 10)}...` : 'NONE');
  if (savedKey && savedKey.length > 0 && 
      savedKey !== 'YOUR_OPENAI_KEY_HERE' &&
      !savedKey.startsWith('YOUR_')) {
    console.log(`  - ✅ Has valid key in localStorage`);
    return true;
  }
  
  // Check default config
  const config = DEFAULT_PROVIDER_CONFIGS[provider as ApiProvider];
  const defaultKey = config?.apiKey || '';
  console.log(`  - Default config key:`, defaultKey ? `${defaultKey.substring(0, 10)}...` : 'EMPTY');
  
  // If key is 'PROXY', check server health cache instead
  if (defaultKey === 'PROXY') {
    const proxyHealth = (window as any).proxyHealth;
    if (proxyHealth) {
      const serverStatus = proxyHealth.isActive(provider);
      if (serverStatus === true) {
        console.log(`  - ✅ PROXY confirmed active on server`);
        return true;
      } else if (serverStatus === false) {
        console.log(`  - ❌ PROXY key NOT configured on server`);
        return false;
      }
      // null = not yet checked, fall through
      console.log(`  - ⏳ PROXY status unknown (checking...)`);
    }
    // If health check not available yet, only trust operator_x02 and deepseek (known configured)
    // If health check not available yet, only trust operator_x02
    if (provider === 'operator_x02') {
      console.log(`  - ✅ Default IDE provider always available`);
    }
    console.log(`  - ❌ PROXY key - server status unknown`);
    return false;
  }
  
  if (config && config.apiKey && config.apiKey !== '' && 
      config.apiKey !== 'YOUR_OPENAI_KEY_HERE' && 
      !config.apiKey.startsWith('YOUR_')) {
    console.log(`  - ✅ Has valid key in DEFAULT_PROVIDER_CONFIGS`);
    return true;
  }
  
  console.log(`  - ❌ No valid key found anywhere`);
  return false;
}

// ============================================================================
// CLAUDE-SPECIFIC HELPER FUNCTIONS
// ============================================================================

/**
 * Format request for Claude API
 * @param message - User message
 * @param model - Claude model name
 * @param maxTokens - Maximum tokens
 * @param temperature - Temperature setting
 * @returns Formatted request object
 */
function formatClaudeRequest(message: string, model: string, maxTokens: number, temperature: number) {
  return {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [{ 
      role: 'user', 
      content: message 
    }],
    system: 'You are a helpful AI coding assistant. Provide clear, detailed responses about programming and software development.',
    stream: false,
  };
}

/**
 * Parse Claude API response
 * @param data - Raw API response
 * @returns Extracted text content
 * @throws Error if response format is invalid
 */
function parseClaudeResponse(data: any): string {
  console.log('Claude API Response:', data);
  
  if (data.content && Array.isArray(data.content) && data.content.length > 0) {
    const textContent = data.content.find(item => item.type === 'text');
    if (textContent && textContent.text) {
      return textContent.text;
    }
  }
  
  if (typeof data === 'string') {
    return data;
  }
  
  if (data.completion) {
    return data.completion;
  }
  
  if (data.message && data.message.content) {
    return data.message.content;
  }
  
  if (data.error) {
    const errorMsg = data.error.message || 'Unknown Claude API error';
    const errorType = data.error.type || 'unknown_error';
    
    if (errorType === 'authentication_error') {
      throw new Error(`Claude authentication failed. Please check your API key.`);
    } else if (errorType === 'permission_error') {
      throw new Error(`Claude permission denied. Ensure your API key has the required permissions.`);
    } else if (errorType === 'rate_limit_error') {
      throw new Error(`Claude rate limit exceeded. Please try again in a moment.`);
    } else if (errorType === 'billing_error') {
      throw new Error(`Claude billing issue. Please check your Anthropic account billing status.`);
    }
    
    throw new Error(`Claude API Error (${errorType}): ${errorMsg}`);
  }
  
  console.error('Unexpected Claude response format:', data);
  throw new Error('Invalid Claude API response format - expected content array with text');
}

/**
 * Validate Claude configuration
 * @param config - API configuration to validate
 * @returns Validation result with errors
 */
function validateClaudeConfig(config: ApiConfiguration): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const cleanKey = config.apiKey.trim();
  
  if (!cleanKey) {
    errors.push('Claude API key is required');
  } else if (!cleanKey.startsWith('sk-ant-')) {
    errors.push('Claude API key should start with "sk-ant-"');
  }
  
  const validClaudeModels = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
    'claude-sonnet-4-20250514',
    'claude-3-5-haiku-latest',
    'claude-3-opus-latest'
  ];
  
  if (!validClaudeModels.includes(config.model)) {
    console.log(`Auto-fixing Claude model from ${config.model} to claude-sonnet-4-20250514`);
    config.model = 'claude-sonnet-4-20250514';
  }
  
  const modelLimits = {
    'claude-3-5-sonnet-20241022': 200000,
    'claude-sonnet-4-20250514': 200000,
    'claude-3-5-haiku-20241022': 200000,
    'claude-3-5-haiku-latest': 200000,
    'claude-3-opus-20240229': 200000,
    'claude-3-opus-latest': 200000,
    'claude-3-sonnet-20240229': 200000,
    'claude-3-haiku-20240307': 200000
  };
  
  const maxAllowed = modelLimits[config.model as keyof typeof modelLimits] || 200000;
  if (config.maxTokens > maxAllowed) {
    console.log(`Auto-fixing max tokens from ${config.maxTokens} to ${Math.min(config.maxTokens, maxAllowed)}`);
    config.maxTokens = Math.min(config.maxTokens, maxAllowed);
  }
  
  return { isValid: errors.length === 0, errors };
}

// ============================================================================
// PROVIDER CONSISTENCY HELPER
// ============================================================================

/**
 * Ensure provider configuration is consistent and valid
 * UPDATED: Now checks for saved API keys before using defaults
 * @param config - API configuration to validate
 * @returns Cleaned and validated configuration
 */
function ensureProviderConsistency(config: ApiConfiguration): ApiConfiguration {
  const cleanConfig = { ...config };
  
  if (cleanConfig.apiKey) {
    cleanConfig.apiKey = cleanConfig.apiKey.trim();
  }
  
  // Check for saved API key FIRST
  const savedKey = getProviderApiKey(cleanConfig.provider);
  
  switch (cleanConfig.provider) {
    case 'groq':
      cleanConfig.apiBaseUrl = 'https://api.groq.com/openai/v1';
      if (!cleanConfig.model.includes('llama') && !cleanConfig.model.includes('mixtral')) {
        cleanConfig.model = 'meta-llama/llama-4-scout-17b-16e-instruct';
      }
      // Use saved key if available, otherwise use proxy
      if (!cleanConfig.apiKey || cleanConfig.apiKey === 'PROXY') {
        cleanConfig.apiKey = savedKey || 'PROXY';
      }
      break;
      
    case 'operator_x02':
      cleanConfig.apiBaseUrl = 'PROXY';
      if (!cleanConfig.model.startsWith('x02')) {
        cleanConfig.model = 'x02-coder';
      }
      // Use saved key if available, otherwise use proxy
      if (!cleanConfig.apiKey || cleanConfig.apiKey === 'PROXY') {
        cleanConfig.apiKey = savedKey || 'PROXY';
      }
      break;
      
    case 'deepseek':
      cleanConfig.apiBaseUrl = 'https://api.deepseek.com/v1';
      if (!cleanConfig.model.includes('deepseek')) {
        cleanConfig.model = 'deepseek-chat';
      }
      // Use saved key if available, otherwise use proxy
      if (!cleanConfig.apiKey || cleanConfig.apiKey === 'PROXY') {
        cleanConfig.apiKey = savedKey || 'PROXY';
      }
      break;
      
    case 'openai':
      cleanConfig.apiBaseUrl = 'https://api.openai.com/v1';
      if (cleanConfig.model.includes('claude') || cleanConfig.model.includes('operator_x02') || cleanConfig.model.includes('llama')) {
        cleanConfig.model = 'gpt-4o-mini';
      }
      // Use saved key if available, otherwise use proxy
      if (!cleanConfig.apiKey || cleanConfig.apiKey === 'PROXY' || cleanConfig.apiKey === 'YOUR_OPENAI_KEY_HERE') {
        cleanConfig.apiKey = savedKey || 'PROXY';
      }
      break;
      
    case 'kimi':
      cleanConfig.apiBaseUrl = 'https://api.moonshot.cn/v1';
      if (!cleanConfig.model.includes('moonshot')) {
        cleanConfig.model = 'moonshot-v1-8k';
      }
      // Use saved key if available, otherwise use proxy
      if (!cleanConfig.apiKey || cleanConfig.apiKey === 'PROXY') {
        cleanConfig.apiKey = savedKey || 'PROXY';
      }
      break;
      
    case 'claude':
      cleanConfig.apiBaseUrl = 'https://api.anthropic.com/v1';
      if (!cleanConfig.model.includes('claude')) {
        cleanConfig.model = 'claude-sonnet-4-20250514';
      }
      // Use saved key if available, otherwise use proxy
      if (!cleanConfig.apiKey || cleanConfig.apiKey === 'PROXY') {
        cleanConfig.apiKey = savedKey || 'PROXY';
      }
      break;
      
    case 'ollama':
      cleanConfig.apiBaseUrl = 'http://localhost:11434/v1';
      if (!cleanConfig.model) {
        cleanConfig.model = 'codellama:7b';
      }
      if (!cleanConfig.apiKey) {
        cleanConfig.apiKey = 'ollama';
      }
      break;
      
    case 'gemini':
      cleanConfig.apiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta';
      if (!cleanConfig.model.includes('gemini')) {
        cleanConfig.model = 'gemini-2.5-flash';
      }
      // Use saved key if available, otherwise use proxy
      if (!cleanConfig.apiKey || cleanConfig.apiKey === 'PROXY') {
        cleanConfig.apiKey = savedKey || 'PROXY';
      }
      break;
      
    case 'cohere':
      cleanConfig.apiBaseUrl = 'https://api.cohere.ai/v1';
      if (!cleanConfig.model.includes('command')) {
        cleanConfig.model = 'command-r-plus';
      }
      // Use saved key if available, otherwise use proxy
      if (!cleanConfig.apiKey || cleanConfig.apiKey === 'PROXY') {
        cleanConfig.apiKey = savedKey || 'PROXY';
      }
      break;
      
    case 'custom':
      // Use saved key if available
      if (!cleanConfig.apiKey && savedKey) {
        cleanConfig.apiKey = savedKey;
      }
      break;
  }
  
  return cleanConfig;
}


// ============================================================================
// PROVIDER DEFAULT CONFIGURATIONS
// ============================================================================

const DEFAULT_PROVIDER_CONFIGS: Record<ApiProvider, Partial<ApiConfiguration>> = {
  groq: {
    apiBaseUrl: 'PROXY',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    maxTokens: 4000,
    temperature: 0.7,
    apiKey: 'PROXY'
  },
  operator_x02: {
    apiBaseUrl: 'PROXY',
    model: 'x02-coder',
    maxTokens: 4000,
    temperature: 0.7,
    apiKey: 'PROXY'
  },
  deepseek: {
    apiBaseUrl: 'PROXY',
    model: 'deepseek-chat',
    maxTokens: 4000,
    temperature: 0.7,
    apiKey: 'PROXY'
  },
  openai: {
    apiBaseUrl: 'PROXY',
    model: 'gpt-4o-mini',
    maxTokens: 4000,
    temperature: 0.7,
    apiKey: 'PROXY'
  },
  kimi: {
    apiBaseUrl: 'PROXY',
    model: 'moonshot-v1-8k',
    maxTokens: 4000,
    temperature: 0.7,
    apiKey: 'PROXY'
  },
  ollama: {
    apiBaseUrl: 'http://localhost:11434/v1',
    model: 'codellama:7b',
    maxTokens: 4000,
    temperature: 0.7
  },
  claude: {
    apiBaseUrl: 'PROXY',
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4000,
    temperature: 0.7,
    apiKey: 'PROXY'
  },
  gemini: {
    apiBaseUrl: 'PROXY',
    model: 'gemini-2.5-flash',
    maxTokens: 4000,
    temperature: 0.7,
    apiKey: 'PROXY'
  },
  cohere: {
    apiBaseUrl: 'PROXY',
    model: 'command-r-plus',
    maxTokens: 4000,
    temperature: 0.7,
    apiKey: 'PROXY'
  },
  custom: {
    apiBaseUrl: '',
    model: '',
    maxTokens: 4000,
    temperature: 0.7
  }
};

// ============================================================================
// GET CURRENT CONFIGURATION (FORCED RELOAD)
// ============================================================================

/**
 * Get current API configuration with forced reload from storage
 * @returns Current API configuration
 */
export function getCurrentApiConfigurationForced(): ApiConfiguration {
  try {
    console.log('Reading current API configuration (forced)...');
    
    const stored = localStorage.getItem('aiApiConfig');
    if (stored) {
      const config = JSON.parse(stored);
      console.log('Loaded config from storage:', config);
      
      if (config.provider === 'operatorX02') {
        console.log('Migrating from OperatorX02 to operator_x02...');
        saveApiConfiguration(OPERATOR_X02_API_CONFIG);
        return OPERATOR_X02_API_CONFIG;
      }
      
      if (config.provider && config.apiBaseUrl && config.model) {
        // 🔒 For operator_x02, ensure API key is always set
        let apiKey = config.apiKey || '';
        if (config.provider === 'operator_x02' && !apiKey) {
          apiKey = OPERATOR_X02_API_CONFIG.apiKey;
        }
        
        return {
          provider: config.provider,
          apiKey: apiKey,
          apiBaseUrl: config.apiBaseUrl,
          model: config.model,
          maxTokens: config.maxTokens || 4000,
          temperature: config.temperature !== undefined ? config.temperature : 0.7
        };
      }
    }
    
    // 🔒 Default to Operator X02 - the default IDE provider
    console.log('No valid config found, using Operator X02 default');
    saveApiConfiguration(OPERATOR_X02_API_CONFIG);
    return OPERATOR_X02_API_CONFIG;
    
  } catch (error) {
    console.error('Error loading API configuration:', error);
    return OPERATOR_X02_API_CONFIG;
  }
}

// ============================================================================
// INITIALIZE DEFAULT PROVIDER
// ============================================================================

/**
 * Initialize default provider on first run
 * @returns Initialized configuration
 */
export function initializeDefaultProvider(): ApiConfiguration {
  try {
    const existingConfig = getCurrentApiConfigurationForced();
    
    // 🔒 Ensure Operator X02 is always available as the default IDE provider
    if (!existingConfig || (existingConfig as any).provider === 'operatorX02' || !existingConfig.apiKey) {
      console.log('Setting Operator X02 as default IDE provider...');
      saveApiConfiguration(OPERATOR_X02_API_CONFIG);
      console.log('Operator X02 configured as default provider');
      return OPERATOR_X02_API_CONFIG;
    }
    
    return existingConfig;
  } catch (error) {
    console.log('Error loading config, using Operator X02 default:', error);
    saveApiConfiguration(OPERATOR_X02_API_CONFIG);
    return OPERATOR_X02_API_CONFIG;
  }
}

// ============================================================================
// MIGRATION FROM BROKEN PROVIDERS
// ============================================================================

/**
 * Migrate from broken OperatorX02 provider to operator_x02
 */
export function migrateFromOperatorX02(): void {
  try {
    const currentConfig = getCurrentApiConfigurationForced();
    
    if ((currentConfig as any).provider === 'operatorX02') {
      console.log('Migrating from broken OperatorX02 to operator_x02...');
      saveApiConfiguration(OPERATOR_X02_API_CONFIG);
      updateProviderIndicator();
      console.log('Successfully migrated to Operator X02');
      
      showSystemMessage('Fixed broken OperatorX02! Now using Operator X02 - the default IDE provider!', 'success');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }
}

// ============================================================================
// PROVIDER SWITCHING
// ============================================================================

/**
 * Switch to a specific provider
 * UPDATED: Now checks for saved API keys before using defaults
 * @param provider - Provider to switch to
 */
export function switchToProvider(provider: ApiProvider): void {
  try {
    console.log(`Switching to ${provider}...`);
    
    // Get default config for the provider
    const defaultProviderConfig = DEFAULT_PROVIDER_CONFIGS[provider];
    if (!defaultProviderConfig) {
      console.error(`No configuration found for provider: ${provider}`);
      return;
    }
    
    // Check for saved API key
    const savedKey = getProviderApiKey(provider);
    
    // Create target config with saved key if available
    const targetConfig: ApiConfiguration = {
      provider: provider,
      apiKey: savedKey || defaultProviderConfig.apiKey || '',
      apiBaseUrl: defaultProviderConfig.apiBaseUrl || '',
      model: defaultProviderConfig.model || '',
      maxTokens: defaultProviderConfig.maxTokens || 4000,
      temperature: defaultProviderConfig.temperature || 0.7
    };
    
    console.log(`Target config for ${provider}:`, {
      provider: targetConfig.provider,
      hasApiKey: !!targetConfig.apiKey,
      apiKeySource: savedKey ? 'saved' : 'default',
      apiKeyLength: targetConfig.apiKey.length
    });
    
    clearConfigCache();
    
    try {
      const configString = JSON.stringify(targetConfig);
      localStorage.setItem('aiApiConfig', configString);
      console.log(`Force saved to localStorage:`, configString);
      
      const savedString = localStorage.getItem('aiApiConfig');
      const savedConfig = JSON.parse(savedString || '{}');
      console.log(`Verified localStorage:`, savedConfig);
      
      if (savedConfig.provider !== provider) {
        throw new Error(`LocalStorage save failed: Expected ${provider}, got ${savedConfig.provider}`);
      }
      
    } catch (storageError) {
      console.error('LocalStorage save failed:', storageError);
      throw storageError;
    }
    
    try {
      saveApiConfiguration(targetConfig);
      console.log(`Normal save also completed`);
    } catch (normalSaveError) {
      console.warn('Normal save failed, but localStorage save worked:', normalSaveError);
    }
    
    const finalConfig = getCurrentApiConfigurationForced();
    console.log(`Final verification:`, finalConfig);
    
    if (finalConfig.provider !== provider) {
      throw new Error(`Final verification failed: Expected ${provider}, got ${finalConfig.provider}`);
    }
    
    updateProviderIndicatorWithConfig(finalConfig);
    
    console.log(`Successfully switched to ${provider} ${savedKey ? 'with saved API key' : 'with default configuration'}`);
  } catch (error) {
    console.error(`Failed to switch to ${provider}:`, error);
  }
}

// ============================================================================
// QUICK PROVIDER SWITCHER (WITH RELOAD)
// ============================================================================

/**
 * Quick switch provider with page reload
 * @param provider - Provider to switch to (groq, operator_x02, deepseek, or openai)
 */
export function quickSwitchProvider(provider: 'groq' | 'operator_x02' | 'deepseek' | 'openai'): void {
  // ✅ FIX: Use DEFAULT_PROVIDER_CONFIGS + saved keys
  const providerDefaults = DEFAULT_PROVIDER_CONFIGS[provider];
  if (!providerDefaults) return;
  
  const savedKey = getProviderApiKey(provider);
  
  const targetConfig: ApiConfiguration = {
    provider: provider,
    apiKey: savedKey || providerDefaults.apiKey || '',
    apiBaseUrl: providerDefaults.apiBaseUrl || '',
    model: providerDefaults.model || '',
    maxTokens: providerDefaults.maxTokens || 4000,
    temperature: providerDefaults.temperature || 0.7
  };
  
  localStorage.setItem('aiApiConfig', JSON.stringify(targetConfig));
  window.location.reload();
}

// ============================================================================
// SEAMLESS PROVIDER SWITCHER (NO RELOAD)
// ============================================================================

/**
 * Switch provider seamlessly without page reload
 * @param provider - Provider to switch to (groq, operator_x02, deepseek, or openai)
 */
export function switchProviderSeamless(provider: 'groq' | 'operator_x02' | 'deepseek' | 'openai'): void {
  try {
    // ✅ FIX: Use DEFAULT_PROVIDER_CONFIGS instead of DEFAULT_API_CONFIG
    const providerDefaults = DEFAULT_PROVIDER_CONFIGS[provider];
    if (!providerDefaults) {
      console.error(`No config for provider: ${provider}`);
      return;
    }
    
    // Get saved API key for this provider
    const savedKey = getProviderApiKey(provider);
    
    const targetConfig: ApiConfiguration = {
      provider: provider,
      apiKey: savedKey || providerDefaults.apiKey || '',
      apiBaseUrl: providerDefaults.apiBaseUrl || '',
      model: providerDefaults.model || '',
      maxTokens: providerDefaults.maxTokens || 4000,
      temperature: providerDefaults.temperature || 0.7
    };
    
    saveApiConfiguration(targetConfig);
    clearConfigCache();
    updateProviderIndicatorWithConfig(targetConfig);
    
    console.log(`Seamlessly switched to ${provider}`);
    
  } catch (error) {
    console.error(`Seamless switch failed:`, error);
  }
}

// ============================================================================
// PER-MESSAGE PROVIDER OVERRIDE (NO PERMANENT SWITCH)
// ============================================================================

/**
 * Supported provider hashtags for per-message override
 */
const PROVIDER_TAG_MAP: Record<string, ApiProvider> = {
  '#groq': 'groq',
  '#x02': 'operator_x02',
  '#operator_x02': 'operator_x02',
  '#deepseek': 'deepseek',
  '#openai': 'openai',
  '#claude': 'claude',
  '#gemini': 'gemini',
  '#ollama': 'ollama',
  '#kimi': 'kimi' as ApiProvider,
  '#cohere': 'cohere',
};

export interface ProviderOverrideResult {
  /** Message text with the #provider tag stripped out */
  cleanMessage: string;
  /** Temporary provider config to use for THIS message only (null = use current default) */
  overrideConfig: ApiConfiguration | null;
  /** Which provider was detected from the tag (null = no tag found) */
  detectedProvider: ApiProvider | null;
}

/**
 * Build a temporary provider config WITHOUT saving to localStorage.
 * Use this when you need a one-shot config for a single API call.
 * @param provider - Provider to build config for
 * @returns ApiConfiguration for the provider, or null if provider not found
 */
export function getTemporaryProviderConfig(provider: ApiProvider): ApiConfiguration | null {
  const providerDefaults = DEFAULT_PROVIDER_CONFIGS[provider];
  if (!providerDefaults) {
    console.error(`No config for provider: ${provider}`);
    return null;
  }

  const savedKey = getProviderApiKey(provider);

  const tempConfig: ApiConfiguration = {
    provider: provider,
    apiKey: savedKey || providerDefaults.apiKey || '',
    apiBaseUrl: providerDefaults.apiBaseUrl || '',
    model: providerDefaults.model || '',
    maxTokens: providerDefaults.maxTokens || 4000,
    temperature: providerDefaults.temperature || 0.7
  };

  console.log(`🔀 Built temporary config for ${provider} (NOT saved to localStorage)`);
  return tempConfig;
}

/**
 * Parse a message for #provider tags and return a per-message override config.
 * 
 * ✅ KEY BEHAVIOR: This does NOT permanently switch the provider.
 *    The override config is for THIS message only.
 *    The saved/default provider remains unchanged.
 * 
 * @param message - Raw message text (e.g. "#groq explain quantum computing")
 * @returns { cleanMessage, overrideConfig, detectedProvider }
 * 
 * @example
 *   const result = parseProviderTagOverride("#groq what is Rust?");
 *   // result.cleanMessage === "what is Rust?"
 *   // result.overrideConfig === { provider: 'groq', apiBaseUrl: 'https://api.groq.com/...', ... }
 *   // result.detectedProvider === 'groq'
 *   
 *   // Then use result.overrideConfig for the API call instead of getCurrentApiConfiguration()
 *   // The default provider (e.g. operator_x02) remains unchanged in localStorage
 */
export function parseProviderTagOverride(message: string): ProviderOverrideResult {
  const trimmed = message.trim();
  
  // Check if message starts with a provider tag
  for (const [tag, provider] of Object.entries(PROVIDER_TAG_MAP)) {
    // Match "#provider" at start, followed by space or end of string
    if (trimmed.toLowerCase().startsWith(tag + ' ') || trimmed.toLowerCase() === tag) {
      const cleanMessage = trimmed.substring(tag.length).trim();
      const overrideConfig = getTemporaryProviderConfig(provider);
      
      if (overrideConfig) {
        console.log(`🏷️ Per-message override: "${tag}" → ${provider} (temporary, NOT saved)`);
        console.log(`📝 Clean message: "${cleanMessage}"`);
        return {
          cleanMessage: cleanMessage || 'hello',  // Default message if only tag was typed
          overrideConfig,
          detectedProvider: provider
        };
      }
    }
  }
  
  // No provider tag found — use default (no override)
  return {
    cleanMessage: message,
    overrideConfig: null,
    detectedProvider: null
  };
}

/**
 * Get the provider display name for a message response badge.
 * If overrideConfig is provided, use that provider name; otherwise use current saved config.
 * @param overrideConfig - Optional temporary config from parseProviderTagOverride
 * @returns Display name string (e.g. "Groq", "Operator X02")
 */
export function getResponseProviderName(overrideConfig?: ApiConfiguration | null): string {
  if (overrideConfig) {
    return getProviderShortName(overrideConfig.provider);
  }
  const currentConfig = getCurrentApiConfigurationForced();
  return getProviderShortName(currentConfig.provider);
}

// ============================================================================
// SERVICE REACHABILITY CHECK
// ============================================================================

/**
 * Check if API service is reachable
 * @param url - Service URL to check
 * @returns Promise resolving to true if reachable
 */
async function isServiceReachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    return true;
  } catch (error) {
    // 🔧 FIX: Don't expose internal API URLs in logs
    const sanitizedUrl = url.includes('deepseek') ? 'API service' : url;
    console.warn(`Service not reachable: ${sanitizedUrl}`, error);
    return false;
  }
}

// ============================================================================
// CLEAR CONFIGURATION CACHE
// ============================================================================

/**
 * Clear all cached configuration data
 */
function clearConfigCache(): void {
  console.log('Clearing configuration cache...');
  
  if (window as any) {
    delete (window as any)._cachedApiConfig;
  }
  
  if (typeof globalThis !== 'undefined') {
    delete (globalThis as any)._lastLoadedConfig;
  }
}

// ============================================================================
// CLAUDE API CALL WITH TAURI
// ============================================================================

/**
 * Call Claude API using Tauri proxy (for desktop version)
 * @param message - User message
 * @param config - API configuration
 * @returns Promise resolving to AI response
 */
async function callClaudeAPIWithProxy(message: string, config: ApiConfiguration): Promise<string> {
  const { apiKey, model, maxTokens, temperature } = config;
  
  console.log(`Calling Claude API: ${model}`);
  console.log(`API Key: ${apiKey.substring(0, 20)}...`);
  
  if (!isTauriEnvironment()) {
    throw new Error('Claude API requires desktop version due to CORS restrictions');
  }
  
  if (!window.__TAURI__ || !window.__TAURI__.http) {
    throw new Error('Tauri HTTP not available. Please restart the application.');
  }
  
  console.log('Using Tauri HTTP for Claude');
  
  try {
    const { fetch } = window.__TAURI__.http;
    
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'messages-2023-12-15'
    };
    
    const requestBody = formatClaudeRequest(message, model, maxTokens, temperature);
    
    console.log('Making Tauri HTTP request to Claude...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    console.log(`Claude Response:`, response);

    if (!response.ok) {
      console.error(`Claude API error:`, response.status, response.data);
      
      if (response.status === 401) {
        throw new Error(`Invalid Claude API key. Please verify your key and billing at console.anthropic.com.`);
      } else if (response.status === 402) {
        throw new Error(`Billing required. Please add payment method to your Anthropic account.`);
      } else if (response.status === 429) {
        throw new Error(`Claude API rate limit exceeded. Please wait and try again.`);
      } else {
        const errorMsg = response.data?.error?.message || `HTTP ${response.status}`;
        throw new Error(`Claude API Error (${response.status}): ${errorMsg}`);
      }
    }

    const data = response.data;
    console.log(`Claude API response data:`, data);

    return parseClaudeResponse(data);
    
  } catch (error) {
    console.error('Tauri HTTP Claude call failed:', error);
    console.error('Error details:', error);
    
    const errorMessage = error?.message || error?.toString() || 'Unknown Tauri HTTP error';
    throw new Error(`Claude API failed: ${errorMessage}`);
  }
}

// ============================================================================
// GENERIC API CLIENT (MAIN FUNCTION)
// ============================================================================

/**
 * Main API call function - routes to appropriate provider
 * @param message - User message to send
 * @param config - Optional API configuration (uses current if not provided)
 * @returns Promise resolving to AI response
 */
export async function callGenericAPI(message: string, config?: ApiConfiguration, messagesWithContext?: Array<{role: string, content: any}>): Promise<string> {
  const apiConfig = config || getCurrentApiConfigurationForced();
  const cleanConfig = ensureProviderConsistency(apiConfig);
  const { provider, apiKey, apiBaseUrl, model, maxTokens, temperature } = cleanConfig;

  console.log(`Making API call to ${provider}:`, { 
    model, 
    apiBaseUrl, 
    keyLength: apiKey.length 
  });

  console.log(`Using provider: ${getProviderIcon(provider)} ${provider}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // ✅ PROXY PATH — Route through Supabase Edge Function when key is 'PROXY'
  // Ollama (local) and custom (user key) skip the proxy
  // If user provides their own key, it bypasses proxy automatically
  // ═══════════════════════════════════════════════════════════════════════════
  if (apiKey === 'PROXY' && provider !== 'ollama' && provider !== 'custom') {
    console.log(`🔒 [Proxy] Routing ${provider} through secure Supabase proxy`);

    try {
      // Build messages array
      const proxyMessages: Array<{role: string, content: any}> = [];

      // 1. System prompt
      proxyMessages.push({
        role: 'system',
        content: buildIntelligentSystemPrompt() + getIdeScriptAwarePrompt()
      });

      // 2. Conversation history (for context like "yes", "2nd option", etc.)
      if (messagesWithContext && messagesWithContext.length > 1) {
        const nonSystemMsgs = messagesWithContext.filter(m => m.role !== 'system');
        const historyMsgs = nonSystemMsgs.slice(0, -1).filter(m => 
          m.role === 'user' || m.role === 'assistant'
        );
        if (historyMsgs.length > 0) {
          for (const m of historyMsgs.slice(-10)) {
            proxyMessages.push({
              role: m.role,
              content: typeof m.content === 'string' ? (m.content.length > 600 ? m.content.substring(0, 600) + '...' : m.content) : m.content
                ? m.content.substring(0, 600) + '...'
                : m.content
            });
          }
          console.log(`[Proxy] Added ${historyMsgs.length} conversation history messages`);
        }
      }

      // 3. AI History Search context (cross-session from localStorage)
      const historySearchProxy = (window as any).aiHistorySearch;
      if (historySearchProxy?.intelligentHistorySearch) {
        try {
          const historyResult = historySearchProxy.intelligentHistorySearch(message);
          if (historyResult?.shouldSearch && historyResult?.results?.length > 0) {
            let ctx = 'You have access to relevant past conversations with this user:\n\n';
            historyResult.results.forEach((result: any, idx: number) => {
              const entry = result.entry;
              ctx += `[Previous conversation ${idx + 1}]\n`;
              ctx += `User asked: ${entry.userMessage?.substring(0, 200) || ''}\n`;
              ctx += `You replied: ${entry.assistantResponse?.substring(0, 400) || ''}\n\n`;
            });
            ctx += 'Use this context to provide a more informed response, but do not mention or quote this context directly.';
            
            proxyMessages.push({
              role: 'system',
              content: ctx
            });
            console.log(`[Proxy] Added ${historyResult.results.length} history context(s)`);
          }
        } catch (e) {
          console.warn('[Proxy] History context error:', e);
        }
      }

      // 4. Current user message
      // 4. Current user message (use multimodal from messagesWithContext if available)
      const lastUserMsg = messagesWithContext?.slice().reverse().find(m => m.role === 'user');
      if (lastUserMsg && Array.isArray(lastUserMsg.content)) {
        proxyMessages.push({ role: 'user', content: lastUserMsg.content });
        console.log('[Proxy] Using multimodal user message with image');
      } else {
        proxyMessages.push({ role: 'user', content: message });
      }

      const result = await callAIViaProxy({
        provider,
        model,
        messages: proxyMessages,
        max_tokens: maxTokens,
        temperature,
      });

      // Signal AI response complete (hide history context panel)
      if ((window as any).onAIResponseComplete) {
        (window as any).onAIResponseComplete();
      }

      return result;

    } catch (error) {
      if ((window as any).onAIResponseComplete) {
        (window as any).onAIResponseComplete();
      }
      console.error(`[Proxy] ${provider} failed:`, error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXISTING DIRECT API PATHS BELOW — for Ollama, custom, user's own keys
  // ═══════════════════════════════════════════════════════════════════════════

  // ✅ FIXED: Claude now goes directly to Tauri invoke path (no http.fetch)
  // This avoids Tauri scope configuration issues
  if (provider === 'claude') {
    if (!isTauriEnvironment()) {
      throw new Error('Claude API requires the desktop app (Tauri) due to CORS restrictions.');
    }
    console.log('🔐 Claude API using Tauri invoke (bypasses CORS and scope issues)');
    try {
      // ✅ NEW: Include conversation history for context continuity
      let claudeMessage = message;
      if (messagesWithContext && messagesWithContext.length > 1) {
        const nonSystemMsgs = messagesWithContext.filter(m => m.role !== 'system');
        const historyMsgs = nonSystemMsgs.slice(0, -1).filter(m => 
          m.role === 'user' || m.role === 'assistant'
        );
        if (historyMsgs.length > 0) {
          let contextStr = '[CONVERSATION HISTORY - Use this context to understand references like "yes", "2nd option", "do it", etc.]\n\n';
          for (const m of historyMsgs.slice(-10)) {
            const label = m.role === 'user' ? 'User' : 'Assistant';
            const preview = typeof m.content === 'string' ? (m.content.length > 600 ? m.content.substring(0, 600) + '...' : m.content) : JSON.stringify(m.content).substring(0, 600);
            contextStr += `${label}: ${preview}\n\n`;
          }
          contextStr += '[END CONVERSATION HISTORY]\n\nCurrent user message:\n';
          claudeMessage = contextStr + message;
          console.log(`[Claude] Added ${historyMsgs.length} history messages for context`);
        }
      }
      const claudeResult = await callClaudeViaTauri(apiKey, model, claudeMessage, maxTokens, temperature);
      console.log('✅ Claude via Tauri invoke responded successfully');
      
      // Signal that AI response is complete (hide history context panel)
      if ((window as any).onAIResponseComplete) {
        (window as any).onAIResponseComplete();
      }
      
      return claudeResult;
    } catch (error) {
      // Signal completion on error too
      if ((window as any).onAIResponseComplete) {
        (window as any).onAIResponseComplete();
      }
      console.error('Claude via Tauri invoke failed:', error);
      throw new Error(`Claude API Error: ${error}`);
    }
  }

  if (!apiBaseUrl.includes('localhost') && !await isServiceReachable(apiBaseUrl)) {
    // 🔧 FIX: Don't expose internal API URLs for operator_x02
    const isX02 = provider === 'operator_x02';
    if (isX02) {
      throw new Error(`Operator X02 service is currently unavailable. Please check your internet connection or try a different provider.`);
    } else {
      throw new Error(`${provider} service is not reachable. Please check your internet connection or try a different provider.`);
    }
  }

  if (isTauriEnvironment()) {
    console.log(`Using Tauri backend for ${provider} API call`);
    
    try {
      switch (provider) {
        case 'operator_x02':
        case 'deepseek':
        case 'openai':
        case 'groq':
        case 'kimi':
        case 'custom':
          // ✅ For Tauri: Build message with conversation history + history search context
          let tauriMessage = message;
          
          // ✅ NEW: Include conversation history from messagesWithContext for context continuity
          if (messagesWithContext && messagesWithContext.length > 1) {
            const nonSystemMsgs = messagesWithContext.filter(m => m.role !== 'system');
            const historyMsgs = nonSystemMsgs.slice(0, -1).filter(m => 
              m.role === 'user' || m.role === 'assistant'
            );
            if (historyMsgs.length > 0) {
              let contextStr = '[CONVERSATION HISTORY - Use this context to understand references like "yes", "2nd option", "do it", etc.]\n\n';
              for (const m of historyMsgs.slice(-10)) {
                const label = m.role === 'user' ? 'User' : 'Assistant';
            const preview = typeof m.content === 'string' ? (m.content.length > 600 ? m.content.substring(0, 600) + '...' : m.content) : JSON.stringify(m.content).substring(0, 600);
                contextStr += `${label}: ${preview}\n\n`;
              }
              contextStr += '[END CONVERSATION HISTORY]\n\nCurrent user message:\n';
              tauriMessage = contextStr + message;
              console.log(`[Tauri API] Added ${historyMsgs.length} conversation history messages for context`);
            }
          }
          
          // Also add AI History Search context (cross-session history from localStorage)
          const historySearchTauri = (window as any).aiHistorySearch;
          if (historySearchTauri?.intelligentHistorySearch) {
            try {
              const historyResult = historySearchTauri.intelligentHistorySearch(message);
              if (historyResult?.shouldSearch && historyResult?.results?.length > 0) {
                // Build context instruction (won't be echoed due to instruction format)
                let contextInstruction = '\n\n---\n[ASSISTANT CONTEXT - DO NOT INCLUDE IN RESPONSE]\n';
                contextInstruction += 'The following is context from previous conversations. Use it to inform your response, but DO NOT display, quote, or reference this context block in your reply:\n\n';
                
                historyResult.results.forEach((result: any, idx: number) => {
                  const entry = result.entry;
                  contextInstruction += `Previous Q${idx + 1}: ${entry.userMessage?.substring(0, 200) || ''}\n`;
                  contextInstruction += `Previous A${idx + 1}: ${entry.assistantResponse?.substring(0, 400) || ''}\n\n`;
                });
                
                contextInstruction += '[END CONTEXT - Now respond to the user naturally]\n---\n\n';
                
                // Prepend context instruction (AI sees it but won't echo due to format)
                tauriMessage = contextInstruction + tauriMessage;
                
                console.log(`[Tauri API] Added ${historyResult.results.length} history context(s)`);
              }
            } catch (e) {
              console.warn('[Tauri API] History context error:', e);
            }
          }
          
          const result = await callAiApiViaTauri(provider, apiKey, apiBaseUrl, model, tauriMessage, maxTokens, temperature);
          console.log(`${provider} via Tauri responded successfully`);
          
          // Signal that AI response is complete (hide history context panel)
          if ((window as any).onAIResponseComplete) {
            (window as any).onAIResponseComplete();
          }
          
          return result;
        
        default:
          console.log(`${provider} not yet implemented in Tauri, falling back to browser`);
          break;
      }
    } catch (error) {
      console.error(`Tauri API call failed for ${provider}:`, error);
      console.log(`Falling back to browser API for ${provider}`);
    }
  }

  let requestBody: any;
  let headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  switch (provider) {
    case 'operator_x02':
        case 'deepseek':
    case 'openai':
    case 'groq':
    case 'kimi':
    case 'ollama':
    case 'custom':
      headers['Authorization'] = `Bearer ${apiKey}`;
      
      // ✅ Build messages array with proper context handling
      const messagesArray: Array<{role: string, content: string}> = [];
      
      // 1. Main system prompt (always use the intelligent one)
      messagesArray.push({
        role: 'system',
        content: buildIntelligentSystemPrompt() + getIdeScriptAwarePrompt()
      });
      
      // 2. ✅ NEW: Inject conversation history from messagesWithContext
      // This is the KEY FIX - includes previous user/assistant messages so the AI
      // understands references like "2nd option", "yes do it", "explain more", etc.
      if (messagesWithContext && messagesWithContext.length > 1) {
        // Extract only user/assistant messages (skip system prompts)
        const nonSystemMessages = messagesWithContext.filter(m => m.role !== 'system');
        
        // Remove the last user message (it's the current one - we add it at the end)
        const conversationHistory = nonSystemMessages.slice(0, -1).filter(m => 
          m.role === 'user' || m.role === 'assistant'
        );
        
        if (conversationHistory.length > 0) {
          // Add conversation history messages in order
          for (const histMsg of conversationHistory) {
            messagesArray.push({
              role: histMsg.role,
              content: histMsg.content
            });
          }
          console.log(`[API] ✅ Added ${conversationHistory.length} conversation history messages for context continuity`);
        }
      }
      
      // 3. History context as separate system message (cross-session, from localStorage)
      // This prevents AI from echoing the context
      const historySearch = (window as any).aiHistorySearch;
      if (historySearch?.intelligentHistorySearch) {
        try {
          const historyResult = historySearch.intelligentHistorySearch(message);
          if (historyResult?.shouldSearch && historyResult?.results?.length > 0) {
            // Build clean context for AI (won't be echoed because it's a system message)
            let historyContext = 'You have access to relevant past conversations with this user:\n\n';
            historyResult.results.forEach((result: any, idx: number) => {
              const entry = result.entry;
              const timeAgo = result.timeAgo || 'recently';
              historyContext += `[Previous conversation ${idx + 1}]\n`;
              historyContext += `User asked: ${entry.userMessage?.substring(0, 300) || ''}\n`;
              historyContext += `You replied: ${entry.assistantResponse?.substring(0, 500) || ''}\n\n`;
            });
            historyContext += 'Use this context to provide a more informed response, but do not mention or quote this context directly.';
            
            messagesArray.push({
              role: 'system',
              content: historyContext
            });
            
            console.log(`[API] Added ${historyResult.results.length} history context(s) as system message`);
          }
        } catch (e) {
          console.warn('[API] History context error:', e);
        }
      }
      
      // 3. User message (clean, no context mixed in!)
      messagesArray.push({
        role: 'user',
        content: message
      });
      
      requestBody = {
        model,
        messages: messagesArray,
        max_tokens: maxTokens,
        temperature,
        stream: false
      };
      break;

    case 'gemini':
      const geminiUrl = `${apiBaseUrl}/models/${model}:generateContent?key=${apiKey}`;
      
      // ✅ NEW: Build multi-turn contents array for Gemini with conversation history
      const geminiContents: Array<{role: string, parts: Array<{text: string}>}> = [];
      
      if (messagesWithContext && messagesWithContext.length > 1) {
        const nonSystemMsgs = messagesWithContext.filter(m => m.role !== 'system');
        const historyMsgs = nonSystemMsgs.slice(0, -1).filter(m => 
          m.role === 'user' || m.role === 'assistant'
        );
        for (const m of historyMsgs.slice(-10)) {
          geminiContents.push({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          });
        }
        if (historyMsgs.length > 0) {
          console.log(`[Gemini] Added ${historyMsgs.length} conversation history messages`);
        }
      }
      
      // Add current user message
      geminiContents.push({
        role: 'user',
        parts: [{ text: message }]
      });
      
      requestBody = {
        contents: geminiContents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens
        }
      };
      
      try {
        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!geminiResponse.ok) {
          throw new Error(`Gemini API Error: ${geminiResponse.status} ${geminiResponse.statusText}`);
        }

        const geminiData = await geminiResponse.json();
        
        // Signal that AI response is complete (hide history context panel)
        if ((window as any).onAIResponseComplete) {
          (window as any).onAIResponseComplete();
        }
        
        return geminiData.candidates[0].content.parts[0].text;
      } catch (error) {
        // Signal completion on error too
        if ((window as any).onAIResponseComplete) {
          (window as any).onAIResponseComplete();
        }
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('Network error: Cannot connect to Gemini API. This might be due to CORS restrictions.');
        }
        throw error;
      }

    case 'cohere':
      headers['Authorization'] = `Bearer ${apiKey}`;
      requestBody = {
        model,
        message,
        max_tokens: maxTokens,
        temperature
      };
      break;

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }

  let url: string;
  if (provider === 'gemini') {
    url = `${apiBaseUrl}/models/${model}:generateContent?key=${apiKey}`;
  } else {
    url = `${apiBaseUrl}/chat/completions`;
  }

  console.log(`Making ${provider} API call to: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      mode: 'cors',
      credentials: 'omit'
    });

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'Could not read error response';
      }
      
      console.error(`${provider} API error:`, response.status, errorText);
      
      if (response.status === 401) {
        throw new Error(`Invalid API key for ${provider}. Please check your credentials.`);
      } else if (response.status === 429) {
        throw new Error(`Rate limit exceeded for ${provider} API. Please try again later.`);
      } else {
        throw new Error(`${provider} API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }
    }

    const data = await response.json();
    console.log(`${provider} API Response received successfully`);

    switch (provider) {
      case 'operator_x02':
        case 'deepseek':
      case 'openai':
      case 'groq':
      case 'kimi':
      case 'ollama':
      case 'custom':
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
          // Signal that AI response is complete (hide history context panel)
          if ((window as any).onAIResponseComplete) {
            (window as any).onAIResponseComplete();
          }
          return data.choices[0].message.content;
        } else {
          throw new Error(`Invalid ${provider} API response format`);
        }

      case 'cohere':
        if (data.text) {
          // Signal that AI response is complete
          if ((window as any).onAIResponseComplete) {
            (window as any).onAIResponseComplete();
          }
          return data.text;
        } else {
          throw new Error('Invalid Cohere API response format');
        }

      default:
        throw new Error(`Unsupported provider response format: ${provider}`);
    }
  } catch (error) {
    // Also signal completion on error (to hide the panel)
    if ((window as any).onAIResponseComplete) {
      (window as any).onAIResponseComplete();
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Network error: Cannot connect to ${provider} API. This might be due to CORS restrictions.`);
    }
    
    throw error;
  }
}

// ============================================================================
// API CAPABILITIES CHECK
// ============================================================================

/**
 * Get API capabilities based on environment
 * @returns Object containing available features
 */
export function getApiCapabilities(): {
  tauriAvailable: boolean;
  recommendedProviders: string[];
  corsIssues: string[];
} {
  const isTauri = isTauriEnvironment();
  
  return {
    tauriAvailable: isTauri,
    recommendedProviders: isTauri 
      ? ['groq', 'operator_x02', 'openai', 'claude', 'ollama', 'custom']
      : ['groq', 'operator_x02', 'openai', 'ollama', 'custom'],
    corsIssues: isTauri ? [] : ['claude']
  };
}

// ============================================================================
// CLEANUP DUPLICATE ELEMENTS
// ============================================================================

/**
 * Remove duplicate UI elements from DOM
 */
export function cleanupDuplicateElements(): void {
  document.querySelectorAll('#api-settings-btn, .api-settings-btn, .api-settings-container, .settings-group').forEach(el => el.remove());
  
  const systemMessages = document.querySelectorAll('.system-message');
  const seen = new Set();
  systemMessages.forEach(msg => {
    const text = msg.textContent?.trim();
    if (text && seen.has(text)) {
      msg.remove();
    } else if (text) {
      seen.add(text);
    }
  });
}

// ============================================================================
// SYSTEM MESSAGE DISPLAY
// ============================================================================

/**
 * Display system message in UI
 * @param message - Message text to display
 * @param type - Message type (info, success, or warning)
 */
export function showSystemMessage(message: string, type: 'info' | 'success' | 'warning' = 'info'): void {
  const existingMessages = document.querySelectorAll('.system-message');
  existingMessages.forEach(msg => {
    if (msg.textContent?.includes(message.substring(0, 20))) {
      msg.remove();
    }
  });

  const messageDiv = document.createElement('div');
  messageDiv.className = `system-message ${type}`;
  messageDiv.textContent = message;

  const assistantPanel = document.querySelector('.assistant-panel');
  const assistantContent = assistantPanel?.querySelector('.assistant-content') || assistantPanel;
  
  if (assistantContent) {
    assistantContent.insertBefore(messageDiv, assistantContent.firstChild);
    
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(-20px)';
        setTimeout(() => messageDiv.remove(), 300);
      }
    }, 5000);
  }
}

// ============================================================================
// SIMPLE API KEY DIALOG
// ============================================================================
// ============================================================================
// ENHANCED API KEY DIALOG - COMPLETE REPLACEMENT
// ============================================================================
// Copy this entire code and replace the showAddKeyDialog function in your file
// Starting at line ~1141
// ============================================================================

/**
 * Get API key signup URL for provider
 */
function getProviderSignupUrl(providerId: string): string {
  const urls: Record<string, string> = {
    'operator_x02': 'https://api.operator-x02.com/keys', // Standalone API
    'deepseek': 'https://platform.deepseek.com/api_keys',
    'openai': 'https://platform.openai.com/api-keys',
    'claude': 'https://console.anthropic.com/settings/keys',
    'gemini': 'https://aistudio.google.com/app/apikey',
    'groq': 'https://console.groq.com/keys',
    'cohere': 'https://dashboard.cohere.com/api-keys',
    'kimi': 'https://platform.moonshot.cn/console/api-keys'
  };
  return urls[providerId] || '#';
}

/**
 * Show dialog to add or update API key for a provider
 * UPDATED: Now saves API key to persistent storage
 * @param providerId - Provider to add key for
 */
function showAddKeyDialog(providerId: string): void {
  console.log('Opening add key dialog for:', providerId);
  
  // Remove any existing dialog
  const existing = document.getElementById('add-key-dialog');
  if (existing) existing.remove();
  
  // Get provider info
  const providerName = getProviderShortName(providerId);
  const providerIcon = getProviderIcon(providerId);
  const signupUrl = getProviderSignupUrl(providerId);
  
  // Check for saved key
  const savedKey = getProviderApiKey(providerId);
  const currentConfig = getCurrentApiConfigurationForced();
  const currentKey = currentConfig.provider === providerId ? currentConfig.apiKey : savedKey;
  const hasExistingKey = !!currentKey && currentKey.length > 0;
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'add-key-dialog';
  overlay.className = 'dialog-overlay';
  overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 10002; display: flex; align-items: center; justify-content: center;';
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = 'background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%); border: 1px solid #404040; border-radius: 12px; padding: 24px; width: 90%; max-width: 500px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);';
  
  dialog.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 8px 0; color: #4fc3f7; display: flex; align-items: center; gap: 10px; font-size: 18px;">
        ${providerIcon}
        <span>${hasExistingKey ? 'Update' : 'Add'} API Key for ${providerName}</span>
      </h3>
      <p style="margin: 0; color: #888; font-size: 13px;">
        ${hasExistingKey ? 'Update or remove your API key' : 'Enter your API key to activate this provider'}
      </p>
    </div>
    
    <!-- Success Message (hidden by default) -->
    <div 
      id="success-message" 
      style="display: none; padding: 12px 16px; background: rgba(76, 175, 80, 0.15); border: 1px solid rgba(76, 175, 80, 0.3); border-radius: 8px; margin-bottom: 16px; animation: slideIn 0.3s ease;"
    >
      <div style="display: flex; align-items: center; gap: 10px; color: #4caf50; font-size: 14px; font-weight: 600;">
        <span style="font-size: 18px;">✓</span>
        <span id="success-text">API key saved successfully!</span>
      </div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <label style="color: #ddd; font-size: 14px; font-weight: 600;">API Key:</label>
        ${signupUrl !== '#' ? `
          <a 
            href="${signupUrl}" 
            target="_blank" 
            rel="noopener noreferrer"
            style="color: #4fc3f7; text-decoration: none; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px; padding: 4px 10px; background: rgba(79, 195, 247, 0.1); border-radius: 4px; border: 1px solid rgba(79, 195, 247, 0.2); transition: all 0.2s;"
            onmouseover="this.style.background='rgba(79, 195, 247, 0.2)'; this.style.borderColor='rgba(79, 195, 247, 0.4)'"
            onmouseout="this.style.background='rgba(79, 195, 247, 0.1)'; this.style.borderColor='rgba(79, 195, 247, 0.2)'"
          >
            <span>🔑</span>
            <span>Get API Key</span>
            <span style="font-size: 11px;">↗</span>
          </a>
        ` : ''}
      </div>
      <div style="position: relative;">
        <input 
          type="password" 
          id="quick-api-key-input" 
          placeholder="${hasExistingKey ? 'Enter new API key...' : 'sk-...'}"
          value="${currentKey || ''}"
          style="width: 100%; padding: 12px 45px 12px 12px; background: rgba(0,0,0,0.3); border: 1px solid #444; border-radius: 8px; color: #fff; font-size: 14px; font-family: 'Courier New', monospace; transition: border-color 0.2s;"
          onfocus="this.style.borderColor='#4fc3f7'"
          onblur="this.style.borderColor='#444'"
        />
        <button 
          id="toggle-key-visibility" 
          type="button"
          style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #888; cursor: pointer; font-size: 16px; padding: 6px 10px; border-radius: 6px; transition: all 0.2s;"
          title="Show/Hide API Key"
          onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.color='#ddd'"
          onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.color='#888'"
        >👁️</button>
      </div>
      <small style="display: block; margin-top: 8px; color: #666; font-size: 12px; line-height: 1.4;">
        ℹ️ Your API key is stored locally and will persist when switching providers
      </small>
    </div>
    
    <div style="display: flex; gap: 10px; justify-content: space-between; align-items: center;">
      <div style="display: flex; gap: 10px;">
        <button 
          id="cancel-add-key" 
          style="padding: 11px 20px; background: #444; color: #ddd; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s;"
          onmouseover="this.style.background='#555'"
          onmouseout="this.style.background='#444'"
        >Cancel</button>
        ${hasExistingKey ? `
          <button 
            id="remove-api-key" 
            style="padding: 11px 20px; background: linear-gradient(135deg, rgba(244, 67, 54, 0.15), rgba(244, 67, 54, 0.08)); border: 1px solid rgba(244, 67, 54, 0.3); color: #f44336; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; display: flex; align-items: center; gap: 6px;"
            onmouseover="this.style.background='linear-gradient(135deg, rgba(244, 67, 54, 0.25), rgba(244, 67, 54, 0.15))'; this.style.borderColor='rgba(244, 67, 54, 0.5)'"
            onmouseout="this.style.background='linear-gradient(135deg, rgba(244, 67, 54, 0.15), rgba(244, 67, 54, 0.08))'; this.style.borderColor='rgba(244, 67, 54, 0.3)'"
          >
            <span>🗑️</span>
            <span>Remove</span>
          </button>
        ` : ''}
      </div>
      <button 
        id="save-api-key" 
        style="padding: 11px 28px; background: linear-gradient(135deg, #4fc3f7, #29b6f6); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; box-shadow: 0 3px 12px rgba(79, 195, 247, 0.4); transition: all 0.2s; display: flex; align-items: center; gap: 8px;"
        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 16px rgba(79, 195, 247, 0.5)'"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 12px rgba(79, 195, 247, 0.4)'"
      >
        <span>✓</span>
        <span>${hasExistingKey ? 'Update Key' : 'Save & Activate'}</span>
      </button>
    </div>
  `;
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  // Get elements
  const input = document.getElementById('quick-api-key-input') as HTMLInputElement;
  const successMessage = document.getElementById('success-message') as HTMLElement;
  const successText = document.getElementById('success-text') as HTMLElement;
  
  // Focus input
  setTimeout(() => {
    input?.focus();
    if (hasExistingKey) {
      input.select(); // Select existing key for easy replacement
    }
  }, 100);
  
  // Toggle visibility button
  const toggleBtn = document.getElementById('toggle-key-visibility');
  toggleBtn?.addEventListener('click', () => {
    input.type = input.type === 'password' ? 'text' : 'password';
    toggleBtn.textContent = input.type === 'password' ? '👁️' : '👁️‍🗨️';
  });
  
  // Cancel button
  document.getElementById('cancel-add-key')?.addEventListener('click', () => {
    overlay.remove();
  });
  
  // Remove button (if exists)
  const removeBtn = document.getElementById('remove-api-key');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      if (confirm(`⚠️ Remove API key for ${providerName}?\n\nYou'll need to add it again to use this provider.`)) {
        // Remove from persistent storage
        removeProviderApiKey(providerId);
        
        // If this is the current provider, clear its config too
        if (currentConfig.provider === providerId) {
          const emptyConfig: ApiConfiguration = {
            provider: providerId as ApiProvider,
            apiKey: '',
            apiBaseUrl: DEFAULT_PROVIDER_CONFIGS[providerId as ApiProvider]?.apiBaseUrl || '',
            model: DEFAULT_PROVIDER_CONFIGS[providerId as ApiProvider]?.model || '',
            maxTokens: 4000,
            temperature: 0.7
          };
          
          localStorage.setItem('aiApiConfig', JSON.stringify(emptyConfig));
          clearConfigCache();
          updateProviderIndicatorWithConfig(emptyConfig);
        }
        
        console.log(`🗑️ Removed API key for ${providerName}`);
        
        // Show success message (orange for removal)
        successText.textContent = `API key removed for ${providerName}`;
        successMessage.style.display = 'block';
        successMessage.style.background = 'rgba(255, 152, 0, 0.15)';
        successMessage.style.borderColor = 'rgba(255, 152, 0, 0.3)';
        const successIcon = successMessage.querySelector('div')!;
        successIcon.style.color = '#ff9800';
        successIcon.querySelector('span')!.textContent = '🗑️';
        
        // Clear input
        input.value = '';
        
        // Close after showing message
        setTimeout(() => {
          overlay.remove();
        }, 1800);
      }
    });
  }
  
  // Save button - UPDATED to save to persistent storage
  document.getElementById('save-api-key')?.addEventListener('click', () => {
    const apiKey = input.value.trim();
    
    if (!apiKey) {
      input.style.borderColor = '#f44336';
      input.style.background = 'rgba(244, 67, 54, 0.05)';
      input.placeholder = '❌ API key is required!';
      setTimeout(() => {
        input.style.borderColor = '#444';
        input.style.background = 'rgba(0,0,0,0.3)';
      }, 2000);
      return;
    }
    
    // Reset styles
    input.style.borderColor = '#4fc3f7';
    input.style.background = 'rgba(0,0,0,0.3)';
    
    // Get default config
    const defaultConfig = DEFAULT_PROVIDER_CONFIGS[providerId as ApiProvider];
    
    if (!defaultConfig) {
      console.error('❌ No default config found for provider:', providerId);
      input.style.borderColor = '#f44336';
      return;
    }
    
    // *** IMPORTANT: Save to persistent storage FIRST ***
    saveProviderApiKey(providerId, apiKey);
    
    // Create new config
    const newConfig: ApiConfiguration = {
      provider: providerId as ApiProvider,
      apiKey: apiKey,
      apiBaseUrl: defaultConfig.apiBaseUrl || '',
      model: defaultConfig.model || '',
      maxTokens: defaultConfig.maxTokens || 4000,
      temperature: defaultConfig.temperature || 0.7
    };
    
    console.log('💾 Saving API configuration for:', providerId);
    
    // Save to localStorage (current provider config)
    try {
      localStorage.setItem('aiApiConfig', JSON.stringify(newConfig));
      console.log('✅ Direct localStorage save completed');
    } catch (error) {
      console.error('❌ Failed to save:', error);
      return;
    }
    
    // Also call normal save function
    try {
      saveApiConfiguration(newConfig);
    } catch (error) {
      console.error('⚠️ saveApiConfiguration failed:', error);
    }
    
    // Clear cache and update UI
    clearConfigCache();
    updateProviderIndicatorWithConfig(newConfig);
    
    // Show success message
    successText.textContent = hasExistingKey ? 
      `✓ API key updated and saved! ${providerName} is ready to use.` : 
      `✓ API key saved! ${providerName} is now active.`;
    successMessage.style.display = 'block';
    
    console.log(`✅ API key ${hasExistingKey ? 'updated' : 'added'} for ${providerName} and saved to persistent storage`);
    
    // Close dialog after success
    setTimeout(() => {
      overlay.remove();
    }, 2000);
  });
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
  
  // Close on Escape key
  const escapeHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

// ============================================================================
// UPDATE ROLE SELECTORS IN PLACE (Smooth animation, no blink)
// ============================================================================

/**
 * Update role selectors without recreating the dropdown
 */
function updateRoleSelectorsInPlace(dropdown: HTMLElement, autoRouteEnabled: boolean): void {
  const providerRoles = [
    { id: 'disabled', name: '—', desc: 'Disabled - not used' },
    { id: 'auto', name: 'Auto', desc: 'Task-based routing' },
    { id: 'architect', name: 'Architect', desc: 'System design & planning' },
    { id: 'developer', name: 'Developer', desc: 'Code implementation' },
    { id: 'reviewer', name: 'Reviewer', desc: 'Code review & quality' },
    { id: 'tester', name: 'Tester', desc: 'Testing & QA' },
    { id: 'debugger', name: 'Debugger', desc: 'Bug fixing & troubleshooting' },
    { id: 'documenter', name: 'Documenter', desc: 'Documentation & comments' },
    { id: 'pm', name: 'PM', desc: 'Project management' },
    { id: 'security', name: 'Security', desc: 'Security analysis' }
  ];
  
  // Get saved roles
  let savedRoles: Record<string, string> = {};
  try {
    savedRoles = JSON.parse(localStorage.getItem('providerRoles') || '{}');
  } catch (e) {}
  
  // Update each role selector
  const roleSelects = dropdown.querySelectorAll('.role-select') as NodeListOf<HTMLSelectElement>;
  roleSelects.forEach(select => {
    const provider = select.getAttribute('data-provider');
    if (!provider) return;
    
    // Check if provider has API key
    const hasKey = providerHasApiKey(provider);
    
    // Role dropdown is enabled when auto-route is ON AND has API key
    const roleEnabled = autoRouteEnabled && hasKey;
    
    let currentRole = savedRoles[provider] || 'auto';
    
    // Animate the transition
    select.style.transition = 'all 0.3s ease';
    
    if (roleEnabled) {
      // Enable the dropdown
      select.disabled = false;
      select.style.background = 'rgba(255,255,255,0.1)';
      select.style.borderColor = 'rgba(255,255,255,0.2)';
      select.style.color = 'white';
      select.style.cursor = 'pointer';
      select.style.opacity = '1';
    select.title = 'Set role (— = don\'t use this provider)';
      
      // Update options - all providers can be disabled
      select.innerHTML = providerRoles.map(role => `
        <option value="${role.id}" ${currentRole === role.id ? 'selected' : ''} style="background: #1e1e1e; ${role.id === 'disabled' ? 'color: #888;' : ''}">
          ${role.name}
        </option>
      `).join('');
    } else {
      // Disable the dropdown
      select.disabled = true;
      select.style.background = 'rgba(255,255,255,0.03)';
      select.style.borderColor = 'rgba(255,255,255,0.08)';
      select.style.color = 'rgba(255,255,255,0.3)';
      select.style.cursor = 'not-allowed';
      select.style.opacity = '0.5';
      select.title = hasKey ? 'Enable Auto-Route first' : 'Add API key first';
      
      // Show only dash
      select.innerHTML = '<option value="" style="background: #1e1e1e;">—</option>';
    }
  });
  
  // Also update the Test Auto-Route button
  const testAutoRouteBtn = dropdown.querySelector('#test-auto-route-btn') as HTMLButtonElement;
  if (testAutoRouteBtn) {
    testAutoRouteBtn.style.transition = 'all 0.3s ease';
    if (autoRouteEnabled) {
      testAutoRouteBtn.disabled = false;
      testAutoRouteBtn.style.background = 'rgba(76,175,80,0.15)';
      testAutoRouteBtn.style.borderColor = 'rgba(76,175,80,0.4)';
      testAutoRouteBtn.style.color = '#4caf50';
      testAutoRouteBtn.style.cursor = 'pointer';
      testAutoRouteBtn.style.opacity = '1';
      testAutoRouteBtn.title = 'Test Auto-Route';
    } else {
      testAutoRouteBtn.disabled = true;
      testAutoRouteBtn.style.background = 'rgba(255,255,255,0.05)';
      testAutoRouteBtn.style.borderColor = 'rgba(255,255,255,0.1)';
      testAutoRouteBtn.style.color = 'rgba(255,255,255,0.3)';
      testAutoRouteBtn.style.cursor = 'not-allowed';
      testAutoRouteBtn.style.opacity = '0.5';
      testAutoRouteBtn.title = 'Enable Auto-Route first';
    }
  }
}

// ============================================================================
// CREATE QUICK PROVIDER DROPDOWN
// ============================================================================

/**
 * Create and display quick provider selection dropdown
 */
function createQuickProviderDropdown(): void {
  const existingDropdown = document.getElementById('quick-provider-dropdown');
  if (existingDropdown) {
    existingDropdown.remove();
    return;
  }

  // Refresh proxy health status when dropdown opens
  if ((window as any).proxyHealth?.fetch) {
    (window as any).proxyHealth.fetch().then(() => {
      // Update status dots after health check completes
      const dots = document.querySelectorAll('.proxy-status-dot');
      dots.forEach((dot: any) => {
        const pid = dot.dataset.provider;
        if (pid) {
          const active = (window as any).proxyHealth.isActive(pid);
          dot.style.color = active ? '#4caf50' : '#666';
          dot.title = active ? 'Active on server' : 'Not configured on server';
        }
      });
    });
  }

  const dropdown = document.createElement('div');
  dropdown.id = 'quick-provider-dropdown';
  dropdown.className = 'quick-provider-dropdown';
  
  const currentConfig = getCurrentApiConfigurationForced();
  
  // Debug: Log all saved keys
  console.log('🔑 Saved API Keys in localStorage:', getSavedApiKeys());
  console.log('📌 Current provider:', currentConfig.provider);
  console.log('📌 Current API key:', currentConfig.apiKey ? `${currentConfig.apiKey.substring(0, 15)}...` : 'NONE');
  
  // Combine all providers into one clean list
  const allProviders = [
    { id: 'operator_x02', name: 'Operator X02', desc: 'Coding Focus' },
    { id: 'groq', name: 'Groq', desc: 'Fast & Free' },
    { id: 'openai', name: 'OpenAI', desc: 'GPT-4o Ready' },
    { id: 'deepseek', name: 'Deepseek', desc: 'AI Reasoning' },
    { id: 'claude', name: 'Claude', desc: 'Advanced AI' },
    { id: 'gemini', name: 'Gemini', desc: 'Google AI' }
  ];

  // Available roles for providers (no icons, text only)
  const providerRoles = [
    { id: 'disabled', name: '—', desc: 'Disabled - not used' },
    { id: 'auto', name: 'Auto', desc: 'Task-based routing' },
    { id: 'architect', name: 'Architect', desc: 'System design & planning' },
    { id: 'developer', name: 'Developer', desc: 'Code implementation' },
    { id: 'reviewer', name: 'Reviewer', desc: 'Code review & quality' },
    { id: 'tester', name: 'Tester', desc: 'Testing & QA' },
    { id: 'debugger', name: 'Debugger', desc: 'Bug fixing & troubleshooting' },
    { id: 'documenter', name: 'Documenter', desc: 'Documentation & comments' },
    { id: 'pm', name: 'PM', desc: 'Project management' },
    { id: 'security', name: 'Security', desc: 'Security analysis' }
  ];
  
  // Load saved roles
  let savedRoles: Record<string, string> = {};
  try {
    savedRoles = JSON.parse(localStorage.getItem('providerRoles') || '{}');
  } catch (e) {}

  let dropdownHTML = `
    <div class="dropdown-header">
      <span class="dropdown-title">Quick Switch</span>
    </div>
    <div class="dropdown-section">
  `;

  allProviders.forEach(provider => {
    const isActive = currentConfig.provider === provider.id;
    const icon = getProviderIcon(provider.id);
    const needsKey = providerNeedsApiKey(provider.id);
    const hasKey = providerHasApiKey(provider.id);
    
    // Check if this is the orchestrator default
    let orchConfig: any = null;
    try {
      orchConfig = JSON.parse(localStorage.getItem('multiProviderOrchestratorConfig') || '{}');
    } catch (e) {}
    const isOrchestratorDefault = orchConfig?.defaultProvider === provider.id;
    
    // Check if this is the default IDE provider (for display badge only)
    const isDefaultIDEProvider = provider.id === 'operator_x02';
    
    // Get current role for this provider
    let currentRole = savedRoles[provider.id] || 'auto';
    const roleInfo = providerRoles.find(r => r.id === currentRole) || providerRoles[1];
    
    // Check if auto-route is enabled
    const autoRouteEnabled = orchConfig?.enableAutoRouting || false;
    
    // Role dropdown is enabled ONLY when: autoRouteEnabled AND hasKey
    const roleEnabled = autoRouteEnabled && hasKey;
    
    // Determine button type - always show role dropdown + button
    let buttonHTML = '';
    
    // Build options based on state
    let optionsHTML = '';
    if (!autoRouteEnabled || !hasKey) {
      // Auto-route OFF or no API key: just show dash (disabled)
      optionsHTML = '<option value="" style="background: #1e1e1e;">—</option>';
    } else {
      // Auto-route ON AND has key: show all role options including "—" (disabled)
      optionsHTML = providerRoles.map(role => `
        <option value="${role.id}" ${currentRole === role.id ? 'selected' : ''} style="background: #1e1e1e; ${role.id === 'disabled' ? 'color: #888;' : ''}">
          ${role.name}
        </option>
      `).join('');
    }
    
    const isProviderDisabled = currentRole === 'disabled';
    
    // Determine tooltip based on state
    let dropdownTitle = '';
    if (!hasKey) {
      dropdownTitle = 'Add API key first';
    } else if (!autoRouteEnabled) {
      dropdownTitle = 'Enable Auto-Route first';
    } else {
      dropdownTitle = 'Set role (— = don\'t use this provider)';
    }
    
    const roleDropdownHTML = `
      <select class="role-select" data-provider="${provider.id}" 
        title="${dropdownTitle}"
        ${roleEnabled ? '' : 'disabled'}
        style="
          background: ${roleEnabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)'};
          border: 1px solid ${roleEnabled ? (isProviderDisabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.08)'};
          border-radius: 4px;
          color: ${roleEnabled ? (isProviderDisabled ? 'rgba(255,255,255,0.4)' : 'white') : 'rgba(255,255,255,0.3)'};
          font-size: 11px;
          padding: 4px 8px;
          cursor: ${roleEnabled ? 'pointer' : 'not-allowed'};
          outline: none;
          min-width: 100px;
          opacity: ${roleEnabled ? (isProviderDisabled ? '0.6' : '1') : '0.5'};
        ">
        ${optionsHTML}
      </select>`;
    
    if (hasKey) {
    // Operator X02 gets a spacer instead of settings button for alignment
    // All providers get settings button for alignment (X02 gets a spacer)
      const settingsButtonHTML = isDefaultIDEProvider ? `
          <div style="width: 32px; height: 24px; display: inline-block;"></div>` : `
          <button class="settings-key-btn" data-provider="${provider.id}" style="padding: 4px 8px; font-size: 11px;" title="Settings">
            ⚙️
          </button>`;
      
      buttonHTML = `
        <div class="provider-controls" style="display: flex; align-items: center; gap: 4px;">
          ${roleDropdownHTML}
          <button class="test-api-btn" data-provider="${provider.id}" title="Test API Connection" style="
            padding: 4px 6px;
            font-size: 10px;
            background: rgba(76, 175, 80, 0.1);
            border: 1px solid rgba(76, 175, 80, 0.3);
            border-radius: 4px;
            color: #4caf50;
            cursor: pointer;
            transition: all 0.2s;
          ">
            ▶
          </button>
          ${settingsButtonHTML}
        </div>`;
    } else if (needsKey) {
      // No key - show role dropdown + disabled test button + Add Key button
      buttonHTML = `
        <div class="provider-controls" style="display: flex; align-items: center; gap: 4px;">
          ${roleDropdownHTML}
          <button class="test-api-btn" data-provider="${provider.id}" title="Add API key first" disabled style="
            padding: 4px 6px;
            font-size: 10px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            color: rgba(255, 255, 255, 0.3);
            cursor: not-allowed;
            opacity: 0.4;
          ">
            ▶
          </button>
          <button class="settings-key-btn" data-provider="${provider.id}" style="padding: 4px 8px; font-size: 11px;" title="Add API Key">
            ⚙️
          </button>
        </div>`;
    } else {
      // Provider doesn't need key - show dropdown + settings for non-X02/non-Ollama
      if (isDefaultIDEProvider || provider.id === 'ollama') {
        buttonHTML = roleDropdownHTML;
      } else {
        const gearBtn = `<button class="settings-key-btn" data-provider="${provider.id}" style="padding: 4px 8px; font-size: 11px;" title="Configure API Key">⚙️</button>`;
        buttonHTML = `<div class="provider-controls" style="display: flex; align-items: center; gap: 4px;">${roleDropdownHTML}${gearBtn}</div>`;
      }
    }
    
    dropdownHTML += `
      <div class="dropdown-item ${isActive ? 'active' : ''}" data-provider="${provider.id}">
        <span class="provider-icon">${icon}</span>
        <div class="provider-info">
          <span class="provider-name">${provider.name}${isOrchestratorDefault && !isDefaultIDEProvider ? ' <span style="color:#2196f3;font-size:10px;">● FALLBACK</span>' : ''} <span class="proxy-status-dot" data-provider="${provider.id}" style="font-size:10px;padding:1px 6px;border-radius:8px;background:${hasKey ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.05)'};color:${hasKey ? '#4caf50' : '#666'};border:1px solid ${hasKey ? 'rgba(76,175,80,0.3)' : 'rgba(255,255,255,0.1)'};" title="${hasKey ? 'Active on server' : 'Not configured'}">${hasKey ? '✓ Active' : 'No Key'}</span></span>
          <span class="provider-desc">${hasKey ? roleInfo.desc : provider.desc}</span>
        </div>
        ${buttonHTML}
      </div>
    `;
  });

  dropdownHTML += `
    </div>
  `;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🎛️ ORCHESTRATOR SETTINGS SECTION
  // ═══════════════════════════════════════════════════════════════════════════
  let orchConfig: any = { enableAutoRouting: false, enableFallback: true, defaultProvider: 'operator_x02' };
  try {
    const saved = localStorage.getItem('multiProviderOrchestratorConfig');
    if (saved) orchConfig = { ...orchConfig, ...JSON.parse(saved) };
  } catch (e) {}
  
  // Count active providers
  let activeCount = 0;
  try {
    if (orchConfig.providers) {
      activeCount = Object.values(orchConfig.providers).filter((p: any) => p.enabled && p.apiKey).length;
    }
  } catch (e) {}
  
  dropdownHTML += `
    <div class="dropdown-divider" style="height: 1px; background: rgba(255,255,255,0.1); margin: 8px 0;"></div>
    
    <div class="orchestrator-settings" style="padding: 8px 16px;">
      <!-- Auto-Routing Toggle -->
      <div class="orch-toggle-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 14px;">🔀</span>
          <div>
            <div style="color: white; font-size: 13px;">Auto-Route</div>
            <div style="color: rgba(255,255,255,0.4); font-size: 10px;">Best provider per task</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="test-auto-route-btn" title="${orchConfig.enableAutoRouting ? 'Test Auto-Route' : 'Enable Auto-Route first'}" style="
            padding: 4px 8px;
            background: ${orchConfig.enableAutoRouting ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.05)'};
            border: 1px solid ${orchConfig.enableAutoRouting ? 'rgba(76,175,80,0.4)' : 'rgba(255,255,255,0.1)'};
            border-radius: 4px;
            color: ${orchConfig.enableAutoRouting ? '#4caf50' : 'rgba(255,255,255,0.3)'};
            font-size: 11px;
            cursor: ${orchConfig.enableAutoRouting ? 'pointer' : 'not-allowed'};
            opacity: ${orchConfig.enableAutoRouting ? '1' : '0.5'};
            transition: all 0.2s;
          " ${orchConfig.enableAutoRouting ? '' : 'disabled'}>
            🧪
          </button>
          <div class="mini-toggle ${orchConfig.enableAutoRouting ? 'active' : ''}" id="orch-auto-toggle" style="
            width: 36px; height: 20px;
            background: ${orchConfig.enableAutoRouting ? '#4caf50' : 'rgba(255,255,255,0.2)'};
            border-radius: 10px;
            position: relative;
            cursor: pointer;
            transition: background 0.3s;
          ">
            <div style="
              position: absolute;
              width: 16px; height: 16px;
              background: white;
              border-radius: 50%;
              top: 2px;
              left: ${orchConfig.enableAutoRouting ? '18px' : '2px'};
              transition: left 0.3s;
            "></div>
          </div>
        </div>
      </div>
      
      <!-- Buttons Row: Set Default + Calibration + Statistics -->
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button id="set-default-btn" style="
          flex: 1;
          padding: 8px 12px;
          background: linear-gradient(135deg, rgba(255,193,7,0.15) 0%, rgba(255,160,0,0.15) 100%);
          border: 1px solid rgba(255,193,7,0.4);
          border-radius: 6px;
          color: #ffc107;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s ease;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span>Set Default</span>
        </button>
        
        <button id="show-calibration-btn" style="
          flex: 1;
          padding: 8px 12px;
          background: linear-gradient(135deg, rgba(156,39,176,0.15) 0%, rgba(123,31,162,0.15) 100%);
          border: 1px solid rgba(156,39,176,0.4);
          border-radius: 6px;
          color: #ba68c8;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s ease;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>
          <span>Calibration</span>
        </button>
        
        <button id="show-stats-btn" style="
          flex: 1;
          padding: 8px 12px;
          background: linear-gradient(135deg, rgba(33,150,243,0.15) 0%, rgba(30,136,229,0.15) 100%);
          border: 1px solid rgba(33,150,243,0.4);
          border-radius: 6px;
          color: #64b5f6;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s ease;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <span>Statistics</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.6;">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>
      
      <!-- Expandable Stats Panel -->
      <div id="stats-panel" style="
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.4s ease, opacity 0.3s ease, margin 0.3s ease;
        opacity: 0;
        margin-top: 0;
      ">
        <div style="padding-top: 12px;">
          <!-- Stats Summary Cards -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;">
            <div class="stat-card" style="
              background: rgba(76,175,80,0.1);
              border: 1px solid rgba(76,175,80,0.2);
              border-radius: 6px;
              padding: 8px;
              text-align: center;
            ">
              <div style="font-size: 16px; font-weight: bold; color: #4caf50;" id="stat-total-calls">0</div>
              <div style="font-size: 9px; color: rgba(255,255,255,0.5);">Total Calls</div>
            </div>
            <div class="stat-card" style="
              background: rgba(33,150,243,0.1);
              border: 1px solid rgba(33,150,243,0.2);
              border-radius: 6px;
              padding: 8px;
              text-align: center;
            ">
              <div style="font-size: 16px; font-weight: bold; color: #2196f3;" id="stat-avg-time">0ms</div>
              <div style="font-size: 9px; color: rgba(255,255,255,0.5);">Avg Time</div>
            </div>
            <div class="stat-card" style="
              background: rgba(255,152,0,0.1);
              border: 1px solid rgba(255,152,0,0.2);
              border-radius: 6px;
              padding: 8px;
              text-align: center;
            ">
              <div style="font-size: 16px; font-weight: bold; color: #ff9800;" id="stat-success-rate">100%</div>
              <div style="font-size: 9px; color: rgba(255,255,255,0.5);">Success</div>
            </div>
          </div>
          
          <!-- Provider Usage Chart -->
          <div style="margin-bottom: 12px;">
            <div style="font-size: 10px; color: rgba(255,255,255,0.5); margin-bottom: 6px;">Provider Usage</div>
              <div id="provider-usage-chart" style="display: flex; flex-direction: column; gap: 4px;">
                <!-- Bars will be injected here -->
              </div>
            </div>
            
            <!-- Recent Activity -->
            <div>
              <div style="font-size: 10px; color: rgba(255,255,255,0.5); margin-bottom: 6px;">Recent Activity</div>
              <div id="recent-activity" style="
                max-height: 80px;
                overflow-y: auto;
                font-size: 10px;
                background: rgba(0,0,0,0.2);
                border-radius: 4px;
                padding: 6px;
              ">
                <div style="color: rgba(255,255,255,0.4); text-align: center; padding: 8px;">No activity yet</div>
              </div>
            </div>
            
            <!-- Reset Stats Button -->
            <button id="reset-stats-btn" style="
              width: 100%;
              margin-top: 10px;
              padding: 6px 10px;
              background: rgba(244,67,54,0.1);
              border: 1px solid rgba(244,67,54,0.3);
              border-radius: 4px;
              color: #ef5350;
              font-size: 10px;
              font-weight: 500;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              transition: all 0.2s;
            ">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
              <span>Reset Statistics</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  dropdown.innerHTML = dropdownHTML;

  const providerDisplay = document.getElementById('provider-display');
  if (providerDisplay) {
    const rect = providerDisplay.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${rect.bottom + 5}px`;
    dropdown.style.right = `${window.innerWidth - rect.right}px`;
    dropdown.style.zIndex = '10001';
  }

  document.body.appendChild(dropdown);

  // Attach click handlers to Add Key buttons
  const addKeyButtons = dropdown.querySelectorAll('.add-key-btn');
  addKeyButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const provider = button.getAttribute('data-provider');
      console.log(`🔑 Add Key button clicked for: ${provider}`);
      dropdown.remove();
      if (provider) {
        showAddKeyDialog(provider);
      }
    });
  });

  // Attach click handlers to Settings buttons
  const settingsButtons = dropdown.querySelectorAll('.settings-key-btn');
  settingsButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const provider = button.getAttribute('data-provider');
      console.log(`⚙️ Settings button clicked for: ${provider}`);
      dropdown.remove();
      if (provider) {
        showAddKeyDialog(provider); // Same dialog, will show existing key
      }
    });
  });
  
  // Attach change handlers to Role selects
  const roleSelects = dropdown.querySelectorAll('.role-select');
  roleSelects.forEach(select => {
    select.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent dropdown item click
    });
    
    select.addEventListener('change', (e) => {
      e.stopPropagation();
      const target = e.target as HTMLSelectElement;
      const provider = target.getAttribute('data-provider');
      let role = target.value;
      
      if (provider) {
  
        
        // Save role to localStorage
        let roles: Record<string, string> = {};
        try {
          roles = JSON.parse(localStorage.getItem('providerRoles') || '{}');
        } catch (err) {}
        
        roles[provider] = role;
        localStorage.setItem('providerRoles', JSON.stringify(roles));
        
        // Also update orchestrator config
        try {
          let orchConfig = JSON.parse(localStorage.getItem('multiProviderOrchestratorConfig') || '{}');
          if (!orchConfig.providerRoles) orchConfig.providerRoles = {};
          orchConfig.providerRoles[provider] = role;
          localStorage.setItem('multiProviderOrchestratorConfig', JSON.stringify(orchConfig));
        } catch (err) {}
        
        const roleInfo = providerRoles.find(r => r.id === role);
        
        if (role === 'disabled') {
          console.log(`⛔ ${provider} DISABLED - will not be used in auto-routing`);
        } else {
          console.log(`🎭 Role for ${provider} set to: ${roleInfo?.name || role}`);
        }
        
        // Update visual styling based on role
        const selectEl = target;
        if (role === 'disabled') {
          selectEl.style.opacity = '0.6';
          selectEl.style.color = 'rgba(255,255,255,0.4)';
        } else {
          selectEl.style.opacity = '1';
          selectEl.style.color = 'white';
        }
        
        // Update description in dropdown
        const item = target.closest('.dropdown-item');
        if (item) {
          const descEl = item.querySelector('.provider-desc');
          if (descEl && roleInfo) {
            descEl.textContent = roleInfo.desc;
          }
        }
        
        // ✅ Update header status info (API count changes when disabled)
        if ((window as any).updateHeaderStatus) {
          (window as any).updateHeaderStatus();
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 🧪 TEST API BUTTON HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const testButtons = dropdown.querySelectorAll('.test-api-btn');
  testButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      const btn = button as HTMLButtonElement;
      const provider = btn.getAttribute('data-provider');
      if (!provider) return;
      
      // Update button to show testing state
      const originalContent = btn.innerHTML;
      btn.innerHTML = '⏳';
      btn.style.color = '#ff9800';
      btn.style.borderColor = 'rgba(255, 152, 0, 0.5)';
      btn.disabled = true;
      
      console.log(`🧪 Testing ${provider} API...`);
      
      try {
        // Get API config for this provider
        const savedKeys = JSON.parse(localStorage.getItem('providerApiKeys') || '{}');
        const apiKey = savedKeys[provider] || '';
        
        if (!apiKey) {
          throw new Error('No API key configured');
        }
        
        // Test message
        const testMessage = 'Say "OK" if you receive this message. Reply with only "OK".';
        
        // Provider-specific test
        let testResult = false;
        let responseTime = 0;
        const startTime = Date.now();
        
        const isTauri = !!(window as any).__TAURI_INTERNALS__;
        
        if (provider === 'gemini') {
          // Test Gemini
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
          const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: testMessage }] }],
              generationConfig: { maxOutputTokens: 10 }
            })
          });
          testResult = response.ok;
          responseTime = Date.now() - startTime;
        } else if (provider === 'groq') {
          // Test Groq
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [{ role: 'user', content: testMessage }],
              max_tokens: 10
            })
          });
          testResult = response.ok;
          responseTime = Date.now() - startTime;
        } else if (isTauri) {
          // Use Tauri backend for other providers
          const { invoke } = await import('@tauri-apps/api/core');
          
          const providerConfigs: Record<string, { baseUrl: string; model: string }> = {
            'operator_x02': { baseUrl: 'PROXY', model: 'x02-coder' },
            'deepseek': { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
            'openai': { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
            'claude': { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' }
          };
          
          const config = providerConfigs[provider];
          if (!config) throw new Error('Unknown provider');
          
          if (provider === 'claude') {
            await invoke('call_claude_api', {
              request: {
                api_key: apiKey,
                model: config.model,
                message: testMessage,
                max_tokens: 10,
                temperature: 0.1
              }
            });
          } else {
            await invoke('call_ai_api', {
              request: {
                provider: provider,
                api_key: apiKey,
                base_url: config.baseUrl,
                model: config.model,
                message: testMessage,
                max_tokens: 10,
                temperature: 0.1
              }
            });
          }
          testResult = true;
          responseTime = Date.now() - startTime;
        } else {
          throw new Error('Requires desktop app for this provider');
        }
        
        // Success!
        btn.innerHTML = '✓';
        btn.style.color = '#4caf50';
        btn.style.borderColor = 'rgba(76, 175, 80, 0.5)';
        btn.style.background = 'rgba(76, 175, 80, 0.15)';
        console.log(`✅ ${provider} API test PASSED (${responseTime}ms)`);
        
        // Show success tooltip
        btn.title = `✓ Working! (${responseTime}ms)`;
        
        // Reset after 3 seconds
        setTimeout(() => {
          btn.innerHTML = '▶';
          btn.style.color = '#4caf50';
          btn.style.borderColor = 'rgba(76, 175, 80, 0.3)';
          btn.style.background = 'rgba(76, 175, 80, 0.1)';
          btn.disabled = false;
          btn.title = 'Test API Connection';
        }, 3000);
        
      } catch (error: any) {
        // Failed
        btn.innerHTML = '✗';
        btn.style.color = '#f44336';
        btn.style.borderColor = 'rgba(244, 67, 54, 0.5)';
        btn.style.background = 'rgba(244, 67, 54, 0.15)';
        console.error(`❌ ${provider} API test FAILED:`, error.message);
        
        // Show error tooltip
        btn.title = `✗ Failed: ${error.message}`;
        
        // Reset after 3 seconds
        setTimeout(() => {
          btn.innerHTML = '▶';
          btn.style.color = '#4caf50';
          btn.style.borderColor = 'rgba(76, 175, 80, 0.3)';
          btn.style.background = 'rgba(76, 175, 80, 0.1)';
          btn.disabled = false;
          btn.title = 'Test API Connection';
        }, 3000);
      }
    });
  });

  dropdown.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Regular dropdown item click (not button)
    const item = (e.target as Element).closest('.dropdown-item');
    if (item && 
        !item.querySelector('.add-key-btn')?.contains(e.target as Node) &&
        !item.querySelector('.settings-key-btn')?.contains(e.target as Node)) {
      const provider = item.getAttribute('data-provider') as ApiProvider;
      
      if (provider && provider !== currentConfig.provider) {
        console.log(`Dropdown switching from ${currentConfig.provider} to ${provider}`);
        
        dropdown.remove();
        
        setTimeout(() => {
          switchToProvider(provider);
        }, 50);
      } else if (provider === currentConfig.provider) {
        dropdown.remove();
      }
    }
  });

  setTimeout(() => {
    document.addEventListener('click', function closeDropdown() {
      dropdown.remove();
      document.removeEventListener('click', closeDropdown);
    });
  }, 100);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🎛️ ORCHESTRATOR TOGGLE HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Auto-Routing Toggle
  const autoToggle = dropdown.querySelector('#orch-auto-toggle');
  if (autoToggle) {
    autoToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      try {
        let config = JSON.parse(localStorage.getItem('multiProviderOrchestratorConfig') || '{}');
        config.enableAutoRouting = !config.enableAutoRouting;
        localStorage.setItem('multiProviderOrchestratorConfig', JSON.stringify(config));
        
        // ✅ FIX: Also sync orchestrator singleton in-memory state
        try {
          const orch = (window as any).orchestrator;
          if (orch?.get) {
            orch.get().updateConfig({ enableAutoRouting: config.enableAutoRouting });
          }
        } catch (syncErr) {
          console.warn('⚠️ Could not sync orchestrator instance:', syncErr);
        }
        
        // Update UI
        const isActive = config.enableAutoRouting;
        (autoToggle as HTMLElement).style.background = isActive ? '#4caf50' : 'rgba(255,255,255,0.2)';
        const knob = autoToggle.querySelector('div') as HTMLElement;
        if (knob) knob.style.left = isActive ? '18px' : '2px';
        
        // ✅ Update header line color (blue → green animation)
        const header = document.querySelector('.assistant-header');
        if (header) {
          if (isActive) {
            header.classList.add('auto-route-on');
          } else {
            header.classList.remove('auto-route-on');
          }
        }
        
        console.log('🔀 Auto-routing:', isActive ? 'ON' : 'OFF');
        
        // ✅ Smooth update of role selectors without recreating dropdown
        updateRoleSelectorsInPlace(dropdown, isActive);
        
        // ✅ Update the 🧪 test button state
        const testBtn = dropdown.querySelector('#test-auto-route-btn') as HTMLButtonElement;
        if (testBtn) {
          testBtn.disabled = !isActive;
          testBtn.style.background = isActive ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.05)';
          testBtn.style.borderColor = isActive ? 'rgba(76,175,80,0.4)' : 'rgba(255,255,255,0.1)';
          testBtn.style.color = isActive ? '#4caf50' : 'rgba(255,255,255,0.3)';
          testBtn.style.cursor = isActive ? 'pointer' : 'not-allowed';
          testBtn.style.opacity = isActive ? '1' : '0.5';
          testBtn.title = isActive ? 'Test Auto-Route' : 'Enable Auto-Route first';
        }
        
        // ✅ Update header status info
        if ((window as any).updateHeaderStatus) {
          (window as any).updateHeaderStatus();
        }
        
        // ✅ Update header provider display to show Auto/specific provider
        updateProviderIndicator();
        
      } catch (err) {
        console.error('Failed to toggle auto-routing:', err);
      }
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🧪 TEST AUTO-ROUTE BUTTON
  // ═══════════════════════════════════════════════════════════════════════════
  const testAutoRouteBtn = dropdown.querySelector('#test-auto-route-btn');
  if (testAutoRouteBtn) {
    testAutoRouteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Check if auto-route is enabled
      try {
        const config = JSON.parse(localStorage.getItem('multiProviderOrchestratorConfig') || '{}');
        if (!config.enableAutoRouting) {
          console.log('⚠️ Auto-Route is disabled. Enable it first to test.');
          return;
        }
      } catch (err) {
        return;
      }
      
      // Close dropdown
      dropdown.remove();
      
      // Show test dialog
      showAutoRouteTestDialog();
    });
  }
  
  // Set Default Button
  const setDefaultBtn = dropdown.querySelector('#set-default-btn');
  if (setDefaultBtn) {
    setDefaultBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      try {
        let config = JSON.parse(localStorage.getItem('multiProviderOrchestratorConfig') || '{}');
        config.defaultProvider = currentConfig.provider;
        
        // Also update provider config
        if (!config.providers) config.providers = {};
        if (!config.providers[currentConfig.provider]) {
          config.providers[currentConfig.provider] = {};
        }
        config.providers[currentConfig.provider].enabled = true;
        config.providers[currentConfig.provider].apiKey = currentConfig.apiKey;
        
        localStorage.setItem('multiProviderOrchestratorConfig', JSON.stringify(config));
        
        console.log('⭐ Default provider set to:', currentConfig.provider);
        
        // Show confirmation
        (setDefaultBtn as HTMLElement).innerHTML = '<span>✅</span><span>Set as Default!</span>';
        (setDefaultBtn as HTMLElement).style.background = 'linear-gradient(135deg, rgba(76,175,80,0.3) 0%, rgba(56,142,60,0.3) 100%)';
        (setDefaultBtn as HTMLElement).style.borderColor = 'rgba(76,175,80,0.5)';
        
        // Refresh dropdown after delay
        setTimeout(() => {
          dropdown.remove();
          createQuickProviderDropdown();
        }, 500);
      } catch (err) {
        console.error('Failed to set default:', err);
      }
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🎯 CALIBRATION BUTTON
  // ═══════════════════════════════════════════════════════════════════════════
  const calibrationBtn = dropdown.querySelector('#show-calibration-btn');
  if (calibrationBtn) {
    calibrationBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Close dropdown first
      dropdown.remove();
      
      // Show calibration panel
      try {
        showCalibrationPanel();
        console.log('🎯 Calibration panel opened');
      } catch (err) {
        console.error('Failed to open calibration panel:', err);
        // Fallback: try window function
        if ((window as any).showCalibrationPanel) {
          (window as any).showCalibrationPanel();
        }
      }
    });
    
    // Hover effect
    calibrationBtn.addEventListener('mouseenter', () => {
      (calibrationBtn as HTMLElement).style.background = 'linear-gradient(135deg, rgba(255,152,0,0.35) 0%, rgba(245,124,0,0.35) 100%)';
    });
    calibrationBtn.addEventListener('mouseleave', () => {
      (calibrationBtn as HTMLElement).style.background = 'linear-gradient(135deg, rgba(255,152,0,0.2) 0%, rgba(245,124,0,0.2) 100%)';
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 STATISTICS PANEL
  // ═══════════════════════════════════════════════════════════════════════════
  const showStatsBtn = dropdown.querySelector('#show-stats-btn');
  const statsPanel = dropdown.querySelector('#stats-panel') as HTMLElement;
  
  if (showStatsBtn && statsPanel) {
    let isExpanded = false;
    
    showStatsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isExpanded = !isExpanded;
      
      const arrow = showStatsBtn.querySelector('span:last-child') as HTMLElement;
      
      if (isExpanded) {
        // Expand panel
        statsPanel.style.maxHeight = '350px';
        statsPanel.style.opacity = '1';
        statsPanel.style.marginTop = '12px';
        if (arrow) arrow.textContent = '▲';
        
        // Load and display stats
        loadAndDisplayStats();
      } else {
        // Collapse panel
        statsPanel.style.maxHeight = '0';
        statsPanel.style.opacity = '0';
        statsPanel.style.marginTop = '0';
        if (arrow) arrow.textContent = '▼';
      }
    });
    
    // Reset stats button
    const resetStatsBtn = dropdown.querySelector('#reset-stats-btn');
    if (resetStatsBtn) {
      resetStatsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        localStorage.removeItem('multiProviderOrchestratorStats');
        localStorage.removeItem('orchestratorActivityLog');
        loadAndDisplayStats();
        console.log('📊 Statistics reset');
      });
    }
  }
  
  function loadAndDisplayStats() {
    const providerIcons: Record<string, string> = {
      operator_x02: '🔮', groq: '⚡', gemini: '✨', 
      deepseek: '🔵', claude: '🟠', openai: '🟢'
    };
    
    const providerColors: Record<string, string> = {
      operator_x02: '#9c27b0', groq: '#4caf50', gemini: '#ff9800',
      deepseek: '#2196f3', claude: '#ff5722', openai: '#00bcd4'
    };
    
    // Load stats from localStorage
    let stats: Record<string, { calls: number; errors: number; totalLatency: number }> = {};
    try {
      stats = JSON.parse(localStorage.getItem('multiProviderOrchestratorStats') || '{}');
    } catch (e) {}
    
    // Load activity log
    let activityLog: Array<{ provider: string; time: number; success: boolean; latency: number }> = [];
    try {
      activityLog = JSON.parse(localStorage.getItem('orchestratorActivityLog') || '[]');
    } catch (e) {}
    
    // Calculate totals
    let totalCalls = 0;
    let totalErrors = 0;
    let totalLatency = 0;
    
    for (const [provider, stat] of Object.entries(stats)) {
      totalCalls += stat.calls || 0;
      totalErrors += stat.errors || 0;
      totalLatency += stat.totalLatency || 0;
    }
    
    const avgTime = totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0;
    const successRate = totalCalls > 0 ? Math.round(((totalCalls - totalErrors) / totalCalls) * 100) : 100;
    
    // Update summary cards with animation
    const totalCallsEl = dropdown.querySelector('#stat-total-calls');
    const avgTimeEl = dropdown.querySelector('#stat-avg-time');
    const successRateEl = dropdown.querySelector('#stat-success-rate');
    
    if (totalCallsEl) animateNumber(totalCallsEl as HTMLElement, totalCalls);
    if (avgTimeEl) animateNumber(avgTimeEl as HTMLElement, avgTime, 'ms');
    if (successRateEl) animateNumber(successRateEl as HTMLElement, successRate, '%');
    
    // Build provider usage chart
    const chartContainer = dropdown.querySelector('#provider-usage-chart');
    if (chartContainer) {
      chartContainer.innerHTML = '';
      
      // Get active providers (has key AND not disabled)
      const savedKeys = JSON.parse(localStorage.getItem('providerApiKeys') || '{}');
      const providerRolesData = JSON.parse(localStorage.getItem('providerRoles') || '{}');
      
      // Get current config for active provider check
      const currentConfig = JSON.parse(localStorage.getItem('aiApiConfig') || '{}');
      
      const isProviderActive = (provider: string): boolean => {
        let hasKey = savedKeys[provider] && savedKeys[provider] !== '';
        // Also consider active if it's the current provider with a valid key
        if (!hasKey && currentConfig.provider === provider && currentConfig.apiKey) {
          hasKey = true;
        }
        const role = providerRolesData[provider] || 'auto';
        return hasKey && role !== 'disabled';
      };
      
      // Sort providers by calls - ONLY include active providers
      const sortedProviders = Object.entries(stats)
        .filter(([provider, s]) => s.calls > 0 && isProviderActive(provider))
        .sort((a, b) => b[1].calls - a[1].calls);
      
      if (sortedProviders.length === 0) {
        chartContainer.innerHTML = '<div style="color: rgba(255,255,255,0.4); text-align: center; padding: 8px; font-size: 10px;">No data yet</div>';
      } else {
        const maxCalls = sortedProviders[0][1].calls;
        
        // Provider display names
        const providerNames: Record<string, string> = {
          operator_x02: 'Operator X02', groq: 'Groq', gemini: 'Gemini',
          deepseek: 'Deepseek', claude: 'Claude', openai: 'OpenAI'
        };
        
        sortedProviders.forEach(([provider, stat], index) => {
          const percentage = (stat.calls / maxCalls) * 100;
          const color = providerColors[provider] || '#888';
          const icon = providerIcons[provider] || '🤖';
          const name = providerNames[provider] || provider;
          const avgLatency = stat.calls > 0 ? Math.round(stat.totalLatency / stat.calls) : 0;
          
          const bar = document.createElement('div');
          bar.style.cssText = 'display: flex; align-items: center; gap: 6px; margin-bottom: 4px;';
          bar.innerHTML = `
            <span style="font-size: 11px; width: 16px;">${icon}</span>
            <div style="flex: 1; height: 22px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; position: relative;">
              <div class="usage-bar" style="
                height: 100%;
                background: linear-gradient(90deg, ${color}, ${color}aa);
                width: 0%;
                border-radius: 4px;
                transition: width 0.8s ease-out;
                transition-delay: ${index * 0.1}s;
                display: flex;
                align-items: center;
                padding-left: 8px;
                box-sizing: border-box;
              ">
                <span style="font-size: 10px; font-weight: 600; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.5); white-space: nowrap;">${name}</span>
              </div>
              <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 10px; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.8); font-weight: 500;">
                ${stat.calls} calls · ${avgLatency}ms
              </span>
            </div>
          `;
          chartContainer.appendChild(bar);
          
          // Animate bar width
          setTimeout(() => {
            const barEl = bar.querySelector('.usage-bar') as HTMLElement;
            if (barEl) barEl.style.width = `${percentage}%`;
          }, 50);
        });
      }
    }
    
    // Build recent activity
    const activityContainer = dropdown.querySelector('#recent-activity');
    if (activityContainer) {
      // Filter activity to only show active providers
      const filteredActivity = activityLog.filter(entry => isProviderActive(entry.provider));
      
      if (filteredActivity.length === 0) {
        activityContainer.innerHTML = '<div style="color: rgba(255,255,255,0.4); text-align: center; padding: 8px;">No activity yet</div>';
      } else {
        activityContainer.innerHTML = filteredActivity
          .slice(-10)
          .reverse()
          .map(entry => {
            const icon = providerIcons[entry.provider] || '🤖';
            const timeAgo = getTimeAgo(entry.time);
            const statusColor = entry.success ? '#4caf50' : '#f44336';
            const statusIcon = entry.success ? '✓' : '✗';
            
            return `
              <div style="display: flex; align-items: center; gap: 6px; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <span>${icon}</span>
                <span style="flex: 1; color: rgba(255,255,255,0.7);">${entry.provider}</span>
                <span style="color: ${statusColor}; font-size: 9px;">${statusIcon} ${entry.latency}ms</span>
                <span style="color: rgba(255,255,255,0.3); font-size: 9px;">${timeAgo}</span>
              </div>
            `;
          })
          .join('');
      }
    }
  }
  
  function animateNumber(el: HTMLElement, target: number, suffix: string = '') {
    const start = parseInt(el.textContent || '0') || 0;
    const duration = 500;
    const startTime = performance.now();
    
    function update(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * easeOut);
      
      el.textContent = current + suffix;
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    
    requestAnimationFrame(update);
  }
  
  function getTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 AUTO-ROUTE TEST DIALOG
// ═══════════════════════════════════════════════════════════════════════════

function showAutoRouteTestDialog(): void {
  // Remove existing dialog
  const existing = document.getElementById('auto-route-test-dialog');
  if (existing) existing.remove();
  
  // SVG icons for providers
  const providerSVGs: Record<string, string> = {
    operator_x02: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
    groq: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    gemini: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    deepseek: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`,
    claude: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
    openai: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><circle cx="12" cy="12" r="3"/></svg>`
  };
  
  // Test questions for different task types
  const testQuestions = [
    { question: "What is 2+2?", task: "quick_answer", desc: "Quick factual" },
    { question: "Write a function to sort an array", task: "code_generation", desc: "Code generation" },
    { question: "Fix this bug in my code", task: "code_fix", desc: "Bug fixing" },
    { question: "Explain how this function works", task: "code_explain", desc: "Code explanation" },
    { question: "Analyze the pros and cons of React vs Vue", task: "complex_reasoning", desc: "Complex reasoning" },
    { question: "What's in this image?", task: "image_analysis", desc: "Image analysis" },
    { question: "Write a blog post about AI", task: "creative_writing", desc: "Creative writing" },
    { question: "Summarize this document", task: "summarize", desc: "Summarization" },
  ];
  
  // Get active providers
  const savedKeys = JSON.parse(localStorage.getItem('providerApiKeys') || '{}');
  const providerRolesData = JSON.parse(localStorage.getItem('providerRoles') || '{}');
  const testScoresData = JSON.parse(localStorage.getItem('providerTestScores') || '{}');
  
  // Also check current active config
  const currentConfig = JSON.parse(localStorage.getItem('aiApiConfig') || '{}');
  
  const allProviders = ['operator_x02', 'groq', 'gemini', 'deepseek', 'claude', 'openai'];
  const activeProvidersList = allProviders.filter(p => {
    // Check if provider has its own stored key
    let hasKey = !!savedKeys[p] && savedKeys[p] !== '';
    
    // Also consider active if it's the current provider with a valid key
    if (!hasKey && currentConfig.provider === p && currentConfig.apiKey) {
      hasKey = true;
      // Store the key so other parts can use it
      savedKeys[p] = currentConfig.apiKey;
    }
    
    const role = providerRolesData[p] || 'auto';
    const isActive = hasKey && role !== 'disabled';
    
    // Debug log
    console.log(`[Test Dialog] Provider ${p}: hasKey=${hasKey}, role=${role}, active=${isActive}`);
    
    return isActive;
  });
  
  const dialog = document.createElement('div');
  dialog.id = 'auto-route-test-dialog';
  dialog.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20000;
  `;
  
  dialog.innerHTML = `
    <div style="
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 8px;
      max-width: 640px;
      width: 95%;
      max-height: 85vh;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    ">
      <!-- Header -->
      <div style="
        padding: 16px 20px;
        border-bottom: 1px solid #3c3c3c;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div style="display: flex; align-items: center; gap: 10px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" stroke-width="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          <span style="color: #e0e0e0; font-size: 14px; font-weight: 500;">Auto-Route Test Center</span>
        </div>
        <button id="close-test-dialog" style="
          background: transparent;
          border: none;
          color: #808080;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <!-- Active Providers -->
      <div style="
        padding: 12px 20px;
        background: #252526;
        border-bottom: 1px solid #3c3c3c;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      ">
        <span style="color: #808080; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Active</span>
        ${(() => {
          const orchConfig = JSON.parse(localStorage.getItem('multiProviderOrchestratorConfig') || '{}');
          const defaultProvider = orchConfig.defaultProvider || 'operator_x02';
          
          return activeProvidersList.map(p => {
            const role = providerRolesData[p] || 'auto';
            const scores = testScoresData[p] || { success: 0, fail: 0 };
            const isDefault = p === defaultProvider;
            
            return `
              <div style="
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 4px 10px;
                background: ${isDefault ? '#1e3a1e' : '#2d2d2d'};
                border: 1px solid ${isDefault ? '#4caf50' : '#3c3c3c'};
                border-radius: 4px;
                font-size: 11px;
                color: #cccccc;
              ">
                <span style="color: #4fc3f7; display: flex;">${providerSVGs[p] || ''}</span>
                <span>${p}</span>
                ${isDefault ? '<span style="color: #4caf50; font-size: 9px;">DEFAULT</span>' : ''}
                <span style="color: #808080;">${role}</span>
                ${scores.success > 0 ? `<span style="color: #4caf50;">✓${scores.success}</span>` : ''}
                ${scores.fail > 0 ? `<span style="color: #f44336;">✗${scores.fail}</span>` : ''}
              </div>
            `;
          }).join('');
        })()}
      </div>
      
      <!-- Custom Test Input -->
      <div style="padding: 16px 20px; border-bottom: 1px solid #3c3c3c;">
        <div style="display: flex; gap: 8px; align-items: center;">
          <div style="color: #4fc3f7; display: flex;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
          </div>
          <input type="text" id="custom-test-input" placeholder="Type message to test routing..." style="
            flex: 1;
            padding: 8px 12px;
            background: #3c3c3c;
            border: 1px solid #4c4c4c;
            border-radius: 4px;
            color: #e0e0e0;
            font-size: 13px;
            outline: none;
          "/>
          <button id="test-custom-btn" style="
            padding: 8px 16px;
            background: #0e639c;
            border: none;
            border-radius: 4px;
            color: white;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Test
          </button>
        </div>
        <div id="custom-test-result" style="
          margin-top: 10px;
          padding: 10px 12px;
          background: #252526;
          border-radius: 4px;
          display: none;
          font-size: 12px;
          color: #cccccc;
          border: 1px solid #3c3c3c;
        "></div>
      </div>
      
      <!-- Sample Questions -->
      <div style="max-height: 320px; overflow-y: auto;">
        <div style="padding: 12px 20px 8px; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #808080; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Sample Questions</span>
          <span style="color: #606060; font-size: 10px;">Click to test</span>
        </div>
        <div id="test-results" style="padding: 0 20px 16px;">
          ${testQuestions.map((t, i) => `
            <div class="test-row" data-index="${i}" style="
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 10px 12px;
              margin-bottom: 4px;
              background: #252526;
              border: 1px solid #3c3c3c;
              border-radius: 4px;
              cursor: pointer;
              transition: background 0.15s;
            ">
              <div style="flex: 1; min-width: 0;">
                <div style="color: #e0e0e0; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.question}</div>
                <div style="color: #606060; font-size: 10px; margin-top: 2px;">${t.desc}</div>
              </div>
              <div class="route-result" style="
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 4px 8px;
                background: #2d2d2d;
                border-radius: 3px;
                min-width: 130px;
                justify-content: flex-end;
              ">
                <span class="result-icon" style="color: #808080; display: flex;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                </span>
                <span class="result-text" style="color: #808080; font-size: 11px;">analyzing...</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Footer -->
      <div style="
        padding: 12px 20px;
        background: #252526;
        border-top: 1px solid #3c3c3c;
        display: flex;
        gap: 8px;
      ">
        <button id="run-all-tests" style="
          flex: 1;
          padding: 8px 12px;
          background: #2d2d2d;
          border: 1px solid #4caf50;
          border-radius: 4px;
          color: #4caf50;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        ">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Run All Tests
        </button>
        <button id="reset-scores-btn" style="
          padding: 8px 16px;
          background: #2d2d2d;
          border: 1px solid #3c3c3c;
          border-radius: 4px;
          color: #808080;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        ">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Reset
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // Initialize provider scores from localStorage
  let providerScores: Record<string, { success: number; fail: number }> = {};
  try {
    providerScores = JSON.parse(localStorage.getItem('providerTestScores') || '{}');
  } catch (e) {}
  
  // Function to update scores display (refresh the dialog's active providers bar)
  function updateScoresDisplay() {
    // The scores are now shown in the active providers bar at top
    // Just refresh the header status
    if ((window as any).updateHeaderStatus) {
      (window as any).updateHeaderStatus();
    }
  }
  
  // Function to record test result
  function recordTestResult(provider: string, success: boolean) {
    if (!providerScores[provider]) {
      providerScores[provider] = { success: 0, fail: 0 };
    }
    if (success) {
      providerScores[provider].success++;
    } else {
      providerScores[provider].fail++;
    }
    localStorage.setItem('providerTestScores', JSON.stringify(providerScores));
    updateScoresDisplay();
    
    // Also update header if function exists
    if ((window as any).updateHeaderStatus) {
      (window as any).updateHeaderStatus();
    }
  }
  
  // Close button
  document.getElementById('close-test-dialog')?.addEventListener('click', () => {
    dialog.remove();
  });
  
  // Reset scores button
  document.getElementById('reset-scores-btn')?.addEventListener('click', () => {
    if (confirm('Reset all test scores to zero?')) {
      providerScores = {};
      localStorage.setItem('providerTestScores', JSON.stringify(providerScores));
      updateScoresDisplay();
      // Refresh dialog to show updated scores
      dialog.remove();
      showAutoRouteTestDialog();
    }
  });
  
  // Click outside to close
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.remove();
  });
  
  // Custom message test handler
  const customInput = dialog.querySelector('#custom-test-input') as HTMLInputElement;
  const customTestBtn = dialog.querySelector('#test-custom-btn');
  const customResult = dialog.querySelector('#custom-test-result') as HTMLElement;
  
  if (customTestBtn && customInput) {
    const runCustomTest = async () => {
      const message = customInput.value.trim();
      if (!message) return;
      
      customResult.style.display = 'block';
      customResult.innerHTML = '<span style="color: #dcdcaa;">Testing...</span>';
      
      try {
        const orchestrator = (window as any).orchestrator;
        if (orchestrator && orchestrator.send) {
          const startTime = Date.now();
          const result = await orchestrator.send(message);
          const elapsed = Date.now() - startTime;
          
          customResult.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              <span style="color: #4caf50;">Success</span>
              <span style="color: #808080;">•</span>
              <span style="color: #e0e0e0;">${result.provider}</span>
              <span style="color: #808080;">•</span>
              <span style="color: #808080;">${elapsed}ms</span>
            </div>
            <div style="color: #9cdcfe; font-size: 11px; max-height: 50px; overflow-y: auto; font-family: monospace;">
              ${result.response.substring(0, 150)}${result.response.length > 150 ? '...' : ''}
            </div>
          `;
          
          // Record success
          recordTestResult(result.provider, true);
          
        } else {
          throw new Error('Orchestrator not available');
        }
      } catch (err: any) {
        customResult.innerHTML = `
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f44336" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
            <span style="color: #f44336;">Error: ${err.message || 'Failed'}</span>
          </div>
        `;
        
        // Try to determine which provider failed
        const orchConfig = JSON.parse(localStorage.getItem('multiProviderOrchestratorConfig') || '{}');
        if (orchConfig.defaultProvider) {
          recordTestResult(orchConfig.defaultProvider, false);
        }
      }
    };
    
    customTestBtn.addEventListener('click', runCustomTest);
    customInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') runCustomTest();
    });
  }
  
  // Analyze each question and show which provider would be selected
  const analyzeRouting = () => {
    // Get current roles assigned to providers
    let providerRoles: Record<string, string> = {};
    try {
      providerRoles = JSON.parse(localStorage.getItem('providerRoles') || '{}');
    } catch (e) {}
    
    const savedKeys = JSON.parse(localStorage.getItem('providerApiKeys') || '{}');
    const orchConfig = JSON.parse(localStorage.getItem('multiProviderOrchestratorConfig') || '{}');
    
    // Build dynamic strengths based on assigned roles
    // Map roles to task types they're best for
    const roleToTasks: Record<string, string[]> = {
      'auto': [], // Will use default strengths
      'architect': ['complex_reasoning', 'code_explain'],
      'developer': ['code_generation', 'code_fix'],
      'reviewer': ['code_explain', 'code_fix'],
      'tester': ['code_fix', 'code_generation'],
      'debugger': ['code_fix', 'code_explain'],
      'documenter': ['summarize', 'creative_writing'],
      'pm': ['summarize', 'complex_reasoning'],
      'security': ['code_explain', 'code_fix'],
      'disabled': [] // Disabled providers
    };
    
    // Default strengths (when role is 'auto')
    const defaultStrengths: Record<string, string[]> = {
      operator_x02: ['code_generation', 'code_fix'],
      groq: ['quick_answer', 'general'],
      gemini: ['image_analysis', 'creative_writing', 'summarize'],
      deepseek: ['code_explain', 'complex_reasoning'],
      claude: ['complex_reasoning', 'summarize'],
      openai: ['general', 'creative_writing']
    };
    
    // Get current config to check for active provider
    const currentConfig = JSON.parse(localStorage.getItem('aiApiConfig') || '{}');
    
    // Build active providers with their effective strengths
    const activeProviders: Array<{name: string, role: string, strengths: string[], hasKey: boolean}> = [];
    
    for (const provider of ['operator_x02', 'groq', 'gemini', 'deepseek', 'claude', 'openai']) {
      let hasKey = !!savedKeys[provider] && savedKeys[provider] !== '';
      
      // Also consider active if it's the current provider with a valid key
      if (!hasKey && currentConfig.provider === provider && currentConfig.apiKey) {
        hasKey = true;
      }
      
      const role = providerRoles[provider] || 'auto';
      
      if (role === 'disabled' || !hasKey) continue;
      
      // Get strengths based on role
      let strengths: string[];
      if (role === 'auto') {
        strengths = defaultStrengths[provider] || ['general'];
      } else {
        strengths = roleToTasks[role] || ['general'];
      }
      
      activeProviders.push({ name: provider, role, strengths, hasKey });
    }
    
    testQuestions.forEach((t, i) => {
      const row = dialog.querySelector(`.test-row[data-index="${i}"]`);
      if (!row) return;
      
      const resultIcon = row.querySelector('.result-icon') as HTMLElement;
      const resultText = row.querySelector('.result-text') as HTMLElement;
      
      try {
        // Detect task type using patterns
        const taskPatterns: Record<string, RegExp[]> = {
          code_generation: [/\b(write|create|generate|make|build|implement)\b.*\b(function|class|component|code)\b/i],
          code_fix: [/\b(fix|debug|repair|solve|error|bug)\b/i],
          code_explain: [/\b(explain|what does|how does|understand)\b.*\b(code|function|this)\b/i],
          quick_answer: [/^(what|who|when|where|how much|how many)\s.{0,50}\??\s*$/i, /\d\s*[\+\-\*\/]\s*\d/],
          complex_reasoning: [/\b(analyze|compare|evaluate|pros.*cons|trade.?off)\b/i],
          image_analysis: [/\b(image|picture|photo|screenshot|what's in)\b/i],
          creative_writing: [/\b(write|create)\b.*\b(story|blog|article|post|poem)\b/i],
          summarize: [/\b(summarize|summary|tldr|brief)\b/i],
        };
        
        // Detect task
        let detectedTask = 'general';
        for (const [task, patterns] of Object.entries(taskPatterns)) {
          if (patterns.some(p => p.test(t.question))) {
            detectedTask = task;
            break;
          }
        }
        
        // Find best provider for this task
        let selectedProvider = orchConfig.defaultProvider || 'operator_x02';
        let selectedRole = 'auto';
        
        if (orchConfig.enableAutoRouting && activeProviders.length > 0) {
          // Find provider whose strengths match this task
          // PRIORITY: Providers with explicit roles (not 'auto') should be preferred
          const specialistsWithRole = activeProviders.filter(p => 
            p.strengths.includes(detectedTask) && p.role !== 'auto'
          );
          const specialistsWithAuto = activeProviders.filter(p => 
            p.strengths.includes(detectedTask) && p.role === 'auto'
          );
          
          if (specialistsWithRole.length > 0) {
            // Prefer provider with explicit role assignment
            selectedProvider = specialistsWithRole[0].name;
            selectedRole = specialistsWithRole[0].role;
          } else if (specialistsWithAuto.length > 0) {
            // Fall back to auto-role provider
            selectedProvider = specialistsWithAuto[0].name;
            selectedRole = specialistsWithAuto[0].role;
          } else {
            // No specialist found, use default provider
            selectedProvider = activeProviders[0].name;
            selectedRole = activeProviders[0].role;
          }
        }
        
        const hasKey = !!savedKeys[selectedProvider] && savedKeys[selectedProvider] !== '';
        const roleLabel = selectedRole !== 'auto' ? `[${selectedRole}]` : '';
        
        // SVG check icon for result
        resultIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
        resultText.innerHTML = `
          <span style="color: ${hasKey ? '#4fc3f7' : '#f44336'}">${selectedProvider}</span>
          ${roleLabel ? `<span style="color: #dcdcaa; font-size: 10px; margin-left: 4px;">${roleLabel}</span>` : ''}
          <span style="color: #606060; font-size: 10px; margin-left: 4px;">${detectedTask}</span>
        `;
        
      } catch (err) {
        resultIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f44336" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`;
        resultText.textContent = 'Error';
        resultText.style.color = '#f44336';
      }
    });
  };
  
  // Run analysis
  setTimeout(analyzeRouting, 100);
  
  // Click row to test actual API
  dialog.querySelectorAll('.test-row').forEach(row => {
    row.addEventListener('click', async () => {
      const index = parseInt(row.getAttribute('data-index') || '0');
      const question = testQuestions[index].question;
      
      const resultIcon = row.querySelector('.result-icon') as HTMLElement;
      const resultText = row.querySelector('.result-text') as HTMLElement;
      
      // Add testing class for line animation
      (row as HTMLElement).classList.add('testing');
      resultIcon.innerHTML = '';
      resultText.innerHTML = '<span style="color: #808080;">testing...</span>';
      
      try {
        // Use orchestrator to send message
        const orchestrator = (window as any).orchestrator;
        if (orchestrator && orchestrator.send) {
          const startTime = Date.now();
          const result = await orchestrator.send(question);
          const elapsed = Date.now() - startTime;
          
          (row as HTMLElement).classList.remove('testing');
          resultIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
          resultText.innerHTML = `<span style="color: #4caf50">${result.provider}</span> <span style="color: #606060; font-size: 10px;">${elapsed}ms</span>`;
          
          // Record success
          recordTestResult(result.provider, true);
          
          console.log(`✅ Test "${question}" → ${result.provider} (${elapsed}ms)`);
        } else {
          throw new Error('Orchestrator not available');
        }
      } catch (err: any) {
        (row as HTMLElement).classList.remove('testing');
        resultIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f44336" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
        resultText.textContent = err.message || 'Failed';
        resultText.style.color = '#f44336';
        
        // Try to determine which provider failed and record
        const orchConfig = JSON.parse(localStorage.getItem('multiProviderOrchestratorConfig') || '{}');
        if (orchConfig.defaultProvider) {
          recordTestResult(orchConfig.defaultProvider, false);
        }
      }
    });
    
    // Hover effect
    (row as HTMLElement).addEventListener('mouseenter', () => {
      (row as HTMLElement).style.background = '#2d2d2d';
      (row as HTMLElement).style.borderColor = '#4c4c4c';
    });
    (row as HTMLElement).addEventListener('mouseleave', () => {
      (row as HTMLElement).style.background = '#252526';
      (row as HTMLElement).style.borderColor = '#3c3c3c';
    });
  });
  
  // Add CSS animation for simple line loading
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes slide-line {
      0% { left: -30%; }
      100% { left: 100%; }
    }
    .test-row.testing {
      position: relative;
      overflow: hidden;
    }
    .test-row.testing::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: -30%;
      width: 30%;
      height: 2px;
      background: linear-gradient(90deg, transparent, #4fc3f7, transparent);
      animation: slide-line 1s ease-in-out infinite;
    }
    .btn-testing {
      position: relative;
      overflow: hidden;
    }
    .btn-testing::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: -30%;
      width: 30%;
      height: 2px;
      background: linear-gradient(90deg, transparent, #4caf50, transparent);
      animation: slide-line 0.8s ease-in-out infinite;
    }
  `;
  document.head.appendChild(styleEl);
  
  // Run All Tests button - PARALLEL testing
  document.getElementById('run-all-tests')?.addEventListener('click', async () => {
    const btn = document.getElementById('run-all-tests') as HTMLButtonElement;
    btn.disabled = true;
    btn.classList.add('btn-testing');
    btn.innerHTML = `<span>Testing...</span>`;
    
    const rows = dialog.querySelectorAll('.test-row');
    let successCount = 0;
    let failCount = 0;
    
    // Prepare all rows for testing
    rows.forEach(row => {
      const resultIcon = row.querySelector('.result-icon') as HTMLElement;
      const resultText = row.querySelector('.result-text') as HTMLElement;
      (row as HTMLElement).classList.add('testing');
      resultIcon.innerHTML = '';
      resultText.innerHTML = '<span style="color: #808080;">waiting...</span>';
    });
    
    // Run ALL tests in parallel
    const testPromises = Array.from(rows).map(async (row, i) => {
      const resultIcon = row.querySelector('.result-icon') as HTMLElement;
      const resultText = row.querySelector('.result-text') as HTMLElement;
      
      try {
        const index = parseInt(row.getAttribute('data-index') || '0');
        const question = testQuestions[index].question;
        
        const orchestrator = (window as any).orchestrator;
        if (orchestrator && orchestrator.send) {
          const startTime = Date.now();
          const result = await orchestrator.send(question);
          const elapsed = Date.now() - startTime;
          
          // Success
          (row as HTMLElement).classList.remove('testing');
          resultIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
          resultText.innerHTML = `<span style="color: #4caf50">${result.provider}</span> <span style="color: #606060; font-size: 10px;">${elapsed}ms</span>`;
          
          recordTestResult(result.provider, true);
          successCount++;
        } else {
          throw new Error('No orchestrator');
        }
      } catch (err: any) {
        // Error
        (row as HTMLElement).classList.remove('testing');
        resultIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f44336" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
        resultText.innerHTML = `<span style="color: #f44336;">Failed</span>`;
        
        const orchConfig = JSON.parse(localStorage.getItem('multiProviderOrchestratorConfig') || '{}');
        if (orchConfig.defaultProvider) {
          recordTestResult(orchConfig.defaultProvider, false);
        }
        failCount++;
      }
    });
    
    // Wait for all tests to complete
    await Promise.all(testPromises);
    
    // All tests complete
    btn.disabled = false;
    btn.classList.remove('btn-testing');
    btn.style.borderColor = '#4caf50';
    btn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span>${successCount}✓ ${failCount > 0 ? failCount + '✗' : ''} Complete</span>
    `;
    
    // Reset button after 3 seconds
    setTimeout(() => {
      btn.style.borderColor = '#4caf50';
      btn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Run All Tests
      `;
    }, 3000);
  });
}

// ============================================================================
// SETUP API SETTINGS BUTTON
// ============================================================================

/**
 * Setup API settings button and header UI
 */
export function setupApiSettingsButton(): void {
  console.log('Setting up API settings button with quick dropdown...');
  
  cleanupDuplicateElements();

  const assistantPanel = document.querySelector('.assistant-panel');
  if (!assistantPanel) {
    console.warn('Assistant panel not found');
    return;
  }

  const existingHeader = assistantPanel.querySelector('.assistant-header');
  if (existingHeader) {
    existingHeader.remove();
  }

  const header = document.createElement('div');
  header.className = 'assistant-header';
  
  // Function to count truly active providers (has key + not disabled)
  function countActiveProviders(): number {
    let count = 0;
    try {
      const savedKeys = JSON.parse(localStorage.getItem('providerApiKeys') || '{}');
      const providerRoles = JSON.parse(localStorage.getItem('providerRoles') || '{}');
      const currentConfig = JSON.parse(localStorage.getItem('aiApiConfig') || '{}');
      
      // All providers - each has its own API key
      const allProviders = ['operator_x02', 'groq', 'gemini', 'deepseek', 'claude', 'openai'];
      
      for (const provider of allProviders) {
        // Check if provider has its own API key
        let hasKey = !!savedKeys[provider] && savedKeys[provider] !== '';
        
        // Also consider active if it's the current provider with a valid key
        if (!hasKey && currentConfig.provider === provider && currentConfig.apiKey) {
          hasKey = true;
        }
        
        if (hasKey) {
          const role = providerRoles[provider] || 'auto';
          if (role !== 'disabled') {
            count++;
          }
        }
      }
    } catch (e) {}
    return count;
  }
  
  // ✅ Check if Auto-Route is enabled and add class for green line
  let autoRouteEnabled = false;
  let activeProviders = countActiveProviders();
  let totalCalls = 0;
  let totalSuccess = 0;
  let totalFail = 0;
  try {
    const orchConfig = JSON.parse(localStorage.getItem('multiProviderOrchestratorConfig') || '{}');
    if (orchConfig.enableAutoRouting) {
      header.classList.add('auto-route-on');
      autoRouteEnabled = true;
    }
    // Get total calls
    const stats = JSON.parse(localStorage.getItem('multiProviderOrchestratorStats') || '{}');
    totalCalls = Object.values(stats).reduce((sum: number, s: any) => sum + (s.calls || 0), 0);
    
    // Get test scores
    const testScores = JSON.parse(localStorage.getItem('providerTestScores') || '{}');
    for (const score of Object.values(testScores) as any[]) {
      totalSuccess += score.success || 0;
      totalFail += score.fail || 0;
    }
  } catch (e) {}
  
  // Build test badge
  const totalTests = totalSuccess + totalFail;
  const testBadgeHTML = totalTests > 0 ? `
    <span style="color: rgba(255,255,255,0.2);">│</span>
    <span title="Test results: ${totalSuccess} passed, ${totalFail} failed" style="display: flex; align-items: center; gap: 3px;">
      <span style="color: #4caf50;">⭐${totalSuccess}</span>
      ${totalFail > 0 ? `<span style="color: #f44336;">✗${totalFail}</span>` : ''}
    </span>
  ` : '';
  
  header.innerHTML = `
    <div class="header-row-main" style="display: flex; align-items: center; width: 100%;">
      <div class="header-left" style="display: flex; align-items: center; gap: 8px; flex: 1; font-size: 11px;">
        <!-- API Calls Badge -->
        <div class="status-badge" id="api-status-section" title="Total API calls" style="
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: rgba(33, 150, 243, 0.1);
          border: 1px solid rgba(33, 150, 243, 0.2);
          border-radius: 4px;
          width: 50px;
          justify-content: center;
        ">
          <span style="font-size: 10px;">📡</span>
          <span id="api-call-count" style="color: #2196f3; font-weight: 500;">${totalCalls}</span>
        </div>
        
        <!-- Messages Badge -->
        <div class="status-badge" id="context-msg-badge" title="Messages in conversation" style="
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          width: 45px;
          justify-content: center;
        ">
          <span style="font-size: 10px;">💬</span>
          <span id="msg-count-value" style="color: rgba(255,255,255,0.7);">0</span>
        </div>
        
        <!-- Context Status Badge -->
        <div class="status-badge context-status-section" id="context-status-section" title="Click to toggle context" style="
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          background: rgba(76, 175, 80, 0.1);
          border: 1px solid rgba(76, 175, 80, 0.2);
          border-radius: 4px;
          width: 180px;
          cursor: pointer;
          transition: all 0.2s ease;
        ">
          <span class="context-toggle" id="context-toggle" title="Toggle Context System" style="display: flex; align-items: center; flex-shrink: 0;">
            <span id="context-dot" style="width: 6px; height: 6px; background: #4caf50; border-radius: 50%;"></span>
          </span>
          <span id="context-activity-text" style="color: rgba(255,255,255,0.6); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Monitoring</span>
          <span id="context-time" style="color: rgba(255,255,255,0.4); font-size: 10px; width: 28px; text-align: right; flex-shrink: 0;">now</span>
        </div>
        
        <!-- Independent Expand Button -->
        <button id="context-expand-btn" style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          padding: 0;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: all 0.2s ease;
        ">
          <svg id="context-expand-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.25s ease;">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
      <div class="header-right">
        <div id="provider-display" class="provider-info-compact clickable">
          <span class="provider-icon" style="background: #9c27b0; width: 6px; height: 6px; border-radius: 50%;"></span>
          <span class="provider-text">Loading...</span>
          <span class="dropdown-arrow">▾</span>
        </div>
      </div>
    </div>
    
    <!-- Expandable Context Details Row - Minimal Buttons -->
    <div id="context-expanded-row" class="context-expanded-row" style="
      display: none;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      padding: 8px 12px;
      margin-top: 8px;
      background: linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(40, 40, 40, 0.95) 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      font-size: 11px;
      opacity: 0;
      transform: translateY(-10px);
      transition: opacity 0.25s ease-out, transform 0.25s ease-out;
      overflow: hidden;
    ">
      <!-- Setup Button -->
      <button id="context-setup-btn" title="Setup Context" style="
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        background: linear-gradient(135deg, rgba(79, 195, 247, 0.15) 0%, rgba(79, 195, 247, 0.1) 100%);
        border: 1px solid rgba(79, 195, 247, 0.3);
        border-radius: 4px;
        color: #4fc3f7;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
        Setup
      </button>
      
      <!-- View Button -->
      <button id="context-view-btn" title="View Context Details" style="
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        background: linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.1) 100%);
        border: 1px solid rgba(76, 175, 80, 0.3);
        border-radius: 4px;
        color: #4caf50;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        View
      </button>
    </div>
  `;
  
  // Expose function to update header status globally
  (window as any).updateHeaderStatus = function() {
    const apiStatusSection = document.getElementById('api-status-section');
    const headerEl = document.querySelector('.assistant-header');
    if (!apiStatusSection || !headerEl) return;
    
    let isAutoRoute = false;
    let calls = 0;
    let totalSuccess = 0;
    let totalFail = 0;
    try {
      const config = JSON.parse(localStorage.getItem('multiProviderOrchestratorConfig') || '{}');
      isAutoRoute = config.enableAutoRouting || false;
      const stats = JSON.parse(localStorage.getItem('multiProviderOrchestratorStats') || '{}');
      calls = Object.values(stats).reduce((sum: number, s: any) => sum + (s.calls || 0), 0);
      
      // Get test scores
      const testScores = JSON.parse(localStorage.getItem('providerTestScores') || '{}');
      for (const score of Object.values(testScores) as any[]) {
        totalSuccess += score.success || 0;
        totalFail += score.fail || 0;
      }
    } catch (e) {}
    
    const activeCount = countActiveProviders();
    
    // Update auto-route class
    if (isAutoRoute) {
      headerEl.classList.add('auto-route-on');
    } else {
      headerEl.classList.remove('auto-route-on');
    }
    
    // Build test scores badge if any tests have been run
    const totalTests = totalSuccess + totalFail;
    
    // Update API call count
    const apiCallCount = document.getElementById('api-call-count');
    if (apiCallCount) {
      apiCallCount.textContent = String(calls);
    }
    
    // Also update context status
    if ((window as any).updateContextStatus) {
      (window as any).updateContextStatus();
    }
  };
  
  // Function to toggle Auto-Route from header
  function toggleAutoRouteFromHeader() {
    try {
      let config = JSON.parse(localStorage.getItem('multiProviderOrchestratorConfig') || '{}');
      config.enableAutoRouting = !config.enableAutoRouting;
      localStorage.setItem('multiProviderOrchestratorConfig', JSON.stringify(config));
      
      // ✅ FIX: Also sync orchestrator singleton in-memory state
      try {
        const orch = (window as any).orchestrator;
        if (orch?.get) {
          orch.get().updateConfig({ enableAutoRouting: config.enableAutoRouting });
        }
      } catch (syncErr) {
        console.warn('⚠️ Could not sync orchestrator instance:', syncErr);
      }
      
      const isActive = config.enableAutoRouting;
      console.log('🔀 Auto-routing:', isActive ? 'ON' : 'OFF');
      
      // Update header
      if ((window as any).updateHeaderStatus) {
        (window as any).updateHeaderStatus();
      }
      
      // ✅ Update header provider display to show Auto/specific provider
      updateProviderIndicator();
      
      // ✅ Sync dropdown toggle if it's open
      const dropdownToggle = document.querySelector('#orch-auto-toggle') as HTMLElement;
      if (dropdownToggle) {
        dropdownToggle.style.background = isActive ? '#4caf50' : 'rgba(255,255,255,0.2)';
        const knob = dropdownToggle.querySelector('div') as HTMLElement;
        if (knob) knob.style.left = isActive ? '18px' : '2px';
        
        // Also update the 🧪 test button state
        const testBtn = document.querySelector('#test-auto-route-btn') as HTMLButtonElement;
        if (testBtn) {
          testBtn.disabled = !isActive;
          testBtn.style.background = isActive ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.05)';
          testBtn.style.borderColor = isActive ? 'rgba(76,175,80,0.4)' : 'rgba(255,255,255,0.1)';
          testBtn.style.color = isActive ? '#4caf50' : 'rgba(255,255,255,0.3)';
          testBtn.style.cursor = isActive ? 'pointer' : 'not-allowed';
          testBtn.style.opacity = isActive ? '1' : '0.5';
          testBtn.title = isActive ? 'Test Auto-Route' : 'Enable Auto-Route first';
        }
        
        // Update role selectors in dropdown
        const dropdown = document.getElementById('quick-provider-dropdown');
        if (dropdown) {
          updateRoleSelectorsInPlace(dropdown, isActive);
        }
      }
    } catch (e) {
      console.error('Failed to toggle auto-route:', e);
    }
  }
  
  // Attach click handler to auto-status toggle
  function attachAutoStatusToggleHandler() {
    const autoStatusToggle = document.getElementById('auto-status-toggle');
    if (autoStatusToggle) {
      autoStatusToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleAutoRouteFromHeader();
      });
      
      // Hover effect
      autoStatusToggle.addEventListener('mouseenter', () => {
        (autoStatusToggle as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
      });
      autoStatusToggle.addEventListener('mouseleave', () => {
        (autoStatusToggle as HTMLElement).style.background = 'transparent';
      });
    }
  }
  
  // Expose toggle function globally
  (window as any).toggleAutoRoute = toggleAutoRouteFromHeader;

  assistantPanel.insertBefore(header, assistantPanel.firstChild);
  
  // Attach initial click handler for auto-status toggle
  attachAutoStatusToggleHandler();
  
  // =========================================================================
  // CONTEXT STATUS INTEGRATION (Unified Header)
  // =========================================================================
  
  // Context status state
  let contextLastUpdate = Date.now();
  const contextActivityMessages = [
    'Monitoring changes...',
    'Ready to assist',
    'Watching for updates',
    'Context active'
  ];
  let contextMessageIndex = 0;
  
  // Function to check if context is enabled
  function isContextEnabled(): boolean {
    try {
      const w = window as any;
      // Try contextManager first (new system)
      if (w.contextManager && w.contextManager.isEnabled) {
        return w.contextManager.isEnabled();
      }
      if (w.isContextEnabled && typeof w.isContextEnabled === 'function') {
        return w.isContextEnabled();
      }
      if (w.contextIntegration && w.contextIntegration.isContextEnabled) {
        return w.contextIntegration.isContextEnabled();
      }
      const stored = localStorage.getItem('contextSystemEnabled');
      return stored !== 'false';
    } catch (e) {
      return true;
    }
  }
  
  // Function to toggle context system
  function toggleContextSystem(): void {
    try {
      const w = window as any;
      const newState = !isContextEnabled();
      
      // Try contextManager first (new system)
      if (w.contextManager) {
        if (newState) {
          w.contextManager.enable();
        } else {
          w.contextManager.disable();
        }
      } else if (w.toggleContextSystem && typeof w.toggleContextSystem === 'function') {
        w.toggleContextSystem(newState);
      } else if (w.contextIntegration && w.contextIntegration.toggleContext) {
        w.contextIntegration.toggleContext(newState);
      } else {
        localStorage.setItem('contextSystemEnabled', newState.toString());
        window.dispatchEvent(new CustomEvent('contextSystemToggled', { detail: { enabled: newState } }));
      }
      
      updateContextStatus();
      console.log('🔄 Context system:', newState ? 'ON' : 'OFF');
    } catch (e) {
      console.error('Failed to toggle context:', e);
    }
  }
  
  // Function to get message count
  function getContextMessageCount(): number {
    try {
      const w = window as any;
      // Try conversationManager first
      if (w.conversationManager && w.conversationManager.getCurrentConversation) {
        const conv = w.conversationManager.getCurrentConversation();
        return conv?.messages?.length || 0;
      }
    } catch (e) {}
    return 0;
  }
  
  // Function to get tracked files count
  function getTrackedFilesCount(): number {
    try {
      const w = window as any;
      if (w.contextManager && w.contextManager.getTrackedFilesCount) {
        return w.contextManager.getTrackedFilesCount();
      }
    } catch (e) {}
    return 0;
  }
  
  // Function to get decisions count
  function getDecisionsCount(): number {
    try {
      const w = window as any;
      if (w.contextManager && w.contextManager.getDecisions) {
        return w.contextManager.getDecisions().length;
      }
    } catch (e) {}
    return 0;
  }
  
  // Function to format time ago
  function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return 'now';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  }
  
  // Function to update context status display
  function updateContextStatus(): void {
    const enabled = isContextEnabled();
    const msgCount = getContextMessageCount();
    
    // Update context dot
    const contextDot = document.getElementById('context-dot');
    if (contextDot) {
      contextDot.style.background = enabled ? '#4caf50' : '#f44336';
      contextDot.title = `Context: ${enabled ? 'ON' : 'OFF'}`;
    }
    
    // Update message count
    const msgCountEl = document.getElementById('msg-count-value');
    if (msgCountEl) {
      msgCountEl.textContent = String(msgCount);
    }
    
    // Update context status badge styling
    const contextSection = document.getElementById('context-status-section');
    if (contextSection) {
      if (enabled) {
        contextSection.style.background = 'rgba(76, 175, 80, 0.1)';
        contextSection.style.borderColor = 'rgba(76, 175, 80, 0.2)';
      } else {
        contextSection.style.background = 'rgba(244, 67, 54, 0.1)';
        contextSection.style.borderColor = 'rgba(244, 67, 54, 0.2)';
      }
    }
    
    // Update activity text - cycle through messages
    const activityText = document.getElementById('context-activity-text');
    if (activityText) {
      if (enabled) {
        activityText.textContent = contextActivityMessages[contextMessageIndex];
        activityText.style.color = 'rgba(255,255,255,0.6)';
      } else {
        activityText.textContent = 'Paused';
        activityText.style.color = 'rgba(255,255,255,0.35)';
      }
    }
    
    // Update time
    const timeEl = document.getElementById('context-time');
    if (timeEl) {
      timeEl.textContent = formatTimeAgo(contextLastUpdate);
    }
  }
  
  // Record activity update
  function recordContextActivity(): void {
    contextLastUpdate = Date.now();
    contextMessageIndex = (contextMessageIndex + 1) % contextActivityMessages.length;
    updateContextStatus();
  }
  
  // Attach context toggle click handler
  const contextToggle = document.getElementById('context-toggle');
  if (contextToggle) {
    contextToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleContextSystem();
    });
    
    contextToggle.style.cursor = 'pointer';
    contextToggle.addEventListener('mouseenter', () => {
      (contextToggle as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
    });
    contextToggle.addEventListener('mouseleave', () => {
      (contextToggle as HTMLElement).style.background = 'transparent';
    });
  }
  
  // Attach click handler to entire context status section
  const contextStatusSection = document.getElementById('context-status-section');
  if (contextStatusSection) {
    contextStatusSection.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleContextSystem();
    });
    
    // Add hover effect for visual feedback
    contextStatusSection.addEventListener('mouseenter', () => {
      contextStatusSection.style.transform = 'scale(1.02)';
      contextStatusSection.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    });
    contextStatusSection.addEventListener('mouseleave', () => {
      contextStatusSection.style.transform = 'scale(1)';
      contextStatusSection.style.boxShadow = 'none';
    });
  }
  
  // Initial context status update
  updateContextStatus();
  
  // Auto-update context status every 5 seconds
  setInterval(() => {
    updateContextStatus();
  }, 5000);
  
  // Cycle activity messages every 8 seconds
  setInterval(() => {
    if (isContextEnabled()) {
      contextMessageIndex = (contextMessageIndex + 1) % contextActivityMessages.length;
      updateContextStatus();
    }
  }, 8000);
  
  // Listen for context changes
  window.addEventListener('contextSystemToggled', () => {
    recordContextActivity();
  });
  
  // Listen for conversation changes
  window.addEventListener('conversationChanged', () => {
    recordContextActivity();
  });
  
  // Listen for messages added
  document.addEventListener('messageAdded', () => {
    recordContextActivity();
  });
  
  // Expose functions globally
  (window as any).updateContextStatus = updateContextStatus;
  (window as any).recordContextActivity = recordContextActivity;
  
  // =========================================================================
  // EXPANDABLE CONTEXT DETAILS
  // =========================================================================
  
  let isContextExpanded = false;
  
  // Get project context safely
  function safeGetProjectContext(): { projectName: string } | null {
    try {
      const w = window as any;
      if (w.contextManager && w.contextManager.getProjectContext) {
        return w.contextManager.getProjectContext();
      }
      if (w.intelligentAssistant && w.intelligentAssistant.projectContext) {
        return w.intelligentAssistant.projectContext;
      }
    } catch (e) {}
    return null;
  }
  
  // Get tracked files count
  function getTrackedFilesCount(): number {
    try {
      const w = window as any;
      if (w.contextManager && w.contextManager.getTrackedFiles) {
        return w.contextManager.getTrackedFiles().length;
      }
      if (w.intelligentAssistant && w.intelligentAssistant.trackedFiles) {
        return w.intelligentAssistant.trackedFiles.length;
      }
    } catch (e) {}
    return 0;
  }
  
  // Update expanded row info (minimal - just for future use)
  function updateExpandedRowInfo(): void {
    // Minimal version - no project info needed
    // Can be extended later if needed
  }
  
  // Toggle expand/collapse with animation
  function toggleContextExpand(): void {
    isContextExpanded = !isContextExpanded;
    const expandedRow = document.getElementById('context-expanded-row');
    const expandArrow = document.getElementById('context-expand-arrow');
    const expandBtn = document.getElementById('context-expand-btn');
    
    if (expandedRow) {
      if (isContextExpanded) {
        // Show with animation
        expandedRow.style.display = 'flex';
        // Force reflow
        expandedRow.offsetHeight;
        expandedRow.style.opacity = '1';
        expandedRow.style.transform = 'translateY(0)';
        // Start auto-hide timer
        startAutoHideTimer();
      } else {
        // Hide with animation
        expandedRow.style.opacity = '0';
        expandedRow.style.transform = 'translateY(-10px)';
        // Wait for animation to complete before hiding
        setTimeout(() => {
          if (!isContextExpanded) {
            expandedRow.style.display = 'none';
          }
        }, 250);
        // Clear auto-hide timer
        clearAutoHideTimer();
      }
    }
    if (expandArrow) {
      expandArrow.style.transform = isContextExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
    }
    if (expandBtn) {
      if (isContextExpanded) {
        (expandBtn as HTMLElement).style.background = 'rgba(79, 195, 247, 0.15)';
        (expandBtn as HTMLElement).style.borderColor = 'rgba(79, 195, 247, 0.3)';
        (expandBtn as HTMLElement).style.color = '#4fc3f7';
      } else {
        (expandBtn as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
        (expandBtn as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.1)';
        (expandBtn as HTMLElement).style.color = 'rgba(255, 255, 255, 0.5)';
      }
    }
    
    if (isContextExpanded) {
      updateExpandedRowInfo();
    }
  }
  
  // =========================================================================
  // AUTO-HIDE FUNCTIONALITY
  // =========================================================================
  
  let autoHideTimer: number | null = null;
  const AUTO_HIDE_DELAY = 1500; // 1.5 seconds
  
  function startAutoHideTimer(): void {
    clearAutoHideTimer();
    autoHideTimer = window.setTimeout(() => {
      if (isContextExpanded) {
        toggleContextExpand(); // Collapse
      }
    }, AUTO_HIDE_DELAY);
  }
  
  function clearAutoHideTimer(): void {
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      autoHideTimer = null;
    }
  }
  
  function resetAutoHideTimer(): void {
    if (isContextExpanded) {
      startAutoHideTimer();
    }
  }
  
  // Attach expand button click handler
  const expandBtn = document.getElementById('context-expand-btn');
  if (expandBtn) {
    // Set title dynamically to avoid HTML rendering issues
    expandBtn.setAttribute('title', 'Expand options');
    
    expandBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleContextExpand();
    });
    
    expandBtn.addEventListener('mouseenter', () => {
      (expandBtn as HTMLElement).style.background = 'rgba(255, 255, 255, 0.1)';
      (expandBtn as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.2)';
    });
    expandBtn.addEventListener('mouseleave', () => {
      if (!isContextExpanded) {
        (expandBtn as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
        (expandBtn as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.1)';
      }
    });
  }
  
  // Setup button handler
  const setupBtn = document.getElementById('context-setup-btn');
  if (setupBtn) {
    setupBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔧 Setup button clicked');
      clearAutoHideTimer();
      
      // Collapse after clicking
      if (isContextExpanded) {
        toggleContextExpand();
      }
      
      // Try to open context setup modal
      const w = window as any;
      if (typeof w.showContextSetupModal === 'function') {
        console.log('✅ Calling showContextSetupModal');
        w.showContextSetupModal();
      } else {
        console.log('⚠️ showContextSetupModal not found, creating inline modal');
        // Create inline setup modal
        createInlineSetupModal();
      }
    });
    
    setupBtn.addEventListener('mouseenter', () => {
      clearAutoHideTimer();
      (setupBtn as HTMLElement).style.background = 'linear-gradient(135deg, rgba(79, 195, 247, 0.3) 0%, rgba(79, 195, 247, 0.2) 100%)';
      (setupBtn as HTMLElement).style.borderColor = 'rgba(79, 195, 247, 0.5)';
      (setupBtn as HTMLElement).style.transform = 'translateY(-1px)';
      (setupBtn as HTMLElement).style.boxShadow = '0 2px 8px rgba(79, 195, 247, 0.2)';
    });
    setupBtn.addEventListener('mouseleave', () => {
      resetAutoHideTimer();
      (setupBtn as HTMLElement).style.background = 'linear-gradient(135deg, rgba(79, 195, 247, 0.15) 0%, rgba(79, 195, 247, 0.1) 100%)';
      (setupBtn as HTMLElement).style.borderColor = 'rgba(79, 195, 247, 0.3)';
      (setupBtn as HTMLElement).style.transform = 'translateY(0)';
      (setupBtn as HTMLElement).style.boxShadow = 'none';
    });
  } else {
    console.warn('⚠️ Setup button not found');
  }
  
  // Inline setup modal function
  function createInlineSetupModal(): void {
    const existingModal = document.querySelector('.context-inline-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.className = 'context-inline-modal';
    modal.innerHTML = `
      <style>
        .context-inline-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .context-inline-modal-content {
          background: linear-gradient(180deg, #2d2d2d 0%, #252526 100%);
          border: 1px solid rgba(79, 195, 247, 0.3);
          border-radius: 12px;
          padding: 24px;
          min-width: 400px;
          max-width: 500px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          animation: slideIn 0.2s ease;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .context-inline-modal h2 {
          color: #4fc3f7;
          margin: 0 0 20px 0;
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .context-inline-modal .setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .context-inline-modal .setting-label {
          color: #ccc;
          font-size: 13px;
        }
        .context-inline-modal .toggle-switch {
          width: 44px;
          height: 24px;
          background: #444;
          border-radius: 12px;
          position: relative;
          cursor: pointer;
          transition: background 0.2s;
        }
        .context-inline-modal .toggle-switch.active {
          background: #4fc3f7;
        }
        .context-inline-modal .toggle-switch::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          top: 2px;
          left: 2px;
          transition: left 0.2s;
        }
        .context-inline-modal .toggle-switch.active::after {
          left: 22px;
        }
        .context-inline-modal .close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          background: transparent;
          border: none;
          color: #888;
          font-size: 24px;
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
        }
        .context-inline-modal .close-btn:hover {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }
      </style>
      <div class="context-inline-modal-content" style="position: relative;">
        <button class="close-btn">×</button>
        <h2>⚙️ Context Settings</h2>
        <div class="setting-row">
          <span class="setting-label">Enable Context Tracking</span>
          <div class="toggle-switch ${(window as any).contextManager?.isEnabled?.() ? 'active' : ''}" id="context-toggle-switch"></div>
        </div>
        <div class="setting-row">
          <span class="setting-label">Track File Changes</span>
          <div class="toggle-switch active"></div>
        </div>
        <div class="setting-row">
          <span class="setting-label">Track Decisions</span>
          <div class="toggle-switch active"></div>
        </div>
        <div style="margin-top: 20px; color: #888; font-size: 12px;">
          Context tracking helps the AI understand your project better by monitoring which files you're working on.
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close handlers
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    // Toggle handler
    const toggleSwitch = modal.querySelector('#context-toggle-switch');
    toggleSwitch?.addEventListener('click', () => {
      toggleSwitch.classList.toggle('active');
      const isActive = toggleSwitch.classList.contains('active');
      const cm = (window as any).contextManager;
      if (cm) {
        isActive ? cm.enable?.() : cm.disable?.();
      }
    });
  }
  
  // View button handler
  const viewBtn = document.getElementById('context-view-btn');
  if (viewBtn) {
    viewBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('👁 View button clicked');
      clearAutoHideTimer();
      
      // Collapse after clicking
      if (isContextExpanded) {
        toggleContextExpand();
      }
      
      // Try to open context view modal (dashboard)
      const w = window as any;
      if (typeof w.showContextViewModal === 'function') {
        console.log('✅ Calling showContextViewModal');
        w.showContextViewModal();
      } else if (typeof w.showContextDashboard === 'function') {
        console.log('✅ Calling showContextDashboard');
        w.showContextDashboard();
      } else {
        console.log('⚠️ View modal not found, creating inline dashboard');
        createInlineDashboard();
      }
    });
    
    viewBtn.addEventListener('mouseenter', () => {
      clearAutoHideTimer();
      (viewBtn as HTMLElement).style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.3) 0%, rgba(76, 175, 80, 0.2) 100%)';
      (viewBtn as HTMLElement).style.borderColor = 'rgba(76, 175, 80, 0.5)';
      (viewBtn as HTMLElement).style.transform = 'translateY(-1px)';
      (viewBtn as HTMLElement).style.boxShadow = '0 2px 8px rgba(76, 175, 80, 0.2)';
    });
    viewBtn.addEventListener('mouseleave', () => {
      resetAutoHideTimer();
      (viewBtn as HTMLElement).style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.1) 100%)';
      (viewBtn as HTMLElement).style.borderColor = 'rgba(76, 175, 80, 0.3)';
      (viewBtn as HTMLElement).style.transform = 'translateY(0)';
      (viewBtn as HTMLElement).style.boxShadow = 'none';
    });
  } else {
    console.warn('⚠️ View button not found');
  }
  
  // Inline dashboard function
  function createInlineDashboard(): void {
    const existingModal = document.querySelector('.context-inline-dashboard');
    if (existingModal) existingModal.remove();
    
    const w = window as any;
    const messagesCount = w.conversationManager?.getCurrentConversation()?.messages?.length || 0;
    const filesCount = w.contextManager?.getTrackedFilesCount?.() || 0;
    const decisionsCount = w.contextManager?.getDecisions?.()?.length || 0;
    const trackedFiles = w.contextManager?.getTrackedFiles?.() || [];
    const decisions = w.contextManager?.getDecisions?.() || [];
    
    const modal = document.createElement('div');
    modal.className = 'context-inline-dashboard';
    modal.innerHTML = `
      <style>
        .context-inline-dashboard {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .dashboard-content {
          background: linear-gradient(180deg, #2d2d2d 0%, #252526 100%);
          border: 1px solid rgba(76, 175, 80, 0.3);
          border-radius: 12px;
          padding: 24px;
          min-width: 600px;
          max-width: 800px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          animation: slideIn 0.2s ease;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dashboard-content h2 {
          color: #4caf50;
          margin: 0 0 20px 0;
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .metric-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }
        .metric-card .value {
          font-size: 28px;
          font-weight: 700;
          color: #fff;
        }
        .metric-card .label {
          font-size: 11px;
          color: #888;
          text-transform: uppercase;
          margin-top: 4px;
        }
        .metric-card.green { border-color: rgba(76, 175, 80, 0.3); }
        .metric-card.green .value { color: #4caf50; }
        .metric-card.blue { border-color: rgba(33, 150, 243, 0.3); }
        .metric-card.blue .value { color: #2196f3; }
        .metric-card.orange { border-color: rgba(255, 152, 0, 0.3); }
        .metric-card.orange .value { color: #ff9800; }
        .metric-card.purple { border-color: rgba(156, 39, 176, 0.3); }
        .metric-card.purple .value { color: #9c27b0; }
        .section {
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .section h3 {
          color: #4fc3f7;
          font-size: 13px;
          margin: 0 0 12px 0;
          text-transform: uppercase;
        }
        .section .item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-size: 12px;
          color: #ccc;
        }
        .section .item:last-child { border-bottom: none; }
        .section .item .time { color: #888; }
        .close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          background: transparent;
          border: none;
          color: #888;
          font-size: 24px;
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
        }
        .close-btn:hover {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }
        .empty-state {
          color: #666;
          text-align: center;
          padding: 20px;
          font-style: italic;
        }
      </style>
      <div class="dashboard-content" style="position: relative;">
        <button class="close-btn">×</button>
        <h2>📊 Context Analytics Dashboard</h2>
        
        <div class="metrics-grid">
          <div class="metric-card green">
            <div class="value">${messagesCount}</div>
            <div class="label">Messages</div>
          </div>
          <div class="metric-card blue">
            <div class="value">${filesCount}</div>
            <div class="label">Tracked Files</div>
          </div>
          <div class="metric-card orange">
            <div class="value">${decisionsCount}</div>
            <div class="label">Decisions</div>
          </div>
          <div class="metric-card purple">
            <div class="value">${Math.round((messagesCount * 500 + filesCount * 1000) / 1024)}</div>
            <div class="label">KB (est.)</div>
          </div>
        </div>
        
        <div class="section">
          <h3>📄 Tracked Files</h3>
          ${trackedFiles.length > 0 ? trackedFiles.slice(0, 10).map((f: any) => `
            <div class="item">
              <span>${f.name || f.path?.split(/[\\\\/]/).pop() || 'Unknown'}</span>
              <span class="time">${f.language || f.extension?.toUpperCase() || '?'}</span>
            </div>
          `).join('') : '<div class="empty-state">No files tracked yet</div>'}
        </div>
        
        <div class="section">
          <h3>✓ Recent Decisions</h3>
          ${decisions.length > 0 ? decisions.slice(0, 10).map((d: any) => `
            <div class="item">
              <span>${d.description?.substring(0, 50) || 'Action'}</span>
              <span class="time">${formatTimeAgoInline(d.timestamp)}</span>
            </div>
          `).join('') : '<div class="empty-state">No decisions recorded yet</div>'}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close handlers
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }
  
  function formatTimeAgoInline(timestamp: number): string {
    if (!timestamp) return '';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
  
  // Add hover handlers on entire expanded row
  const expandedRow = document.getElementById('context-expanded-row');
  if (expandedRow) {
    expandedRow.addEventListener('mouseenter', () => {
      clearAutoHideTimer(); // Pause timer when hovering on row
    });
    expandedRow.addEventListener('mouseleave', () => {
      resetAutoHideTimer(); // Resume timer when leaving row
    });
  }
  
  // Add hover handler on expand button to pause timer
  const expandBtnForTimer = document.getElementById('context-expand-btn');
  if (expandBtnForTimer) {
    expandBtnForTimer.addEventListener('mouseenter', () => {
      clearAutoHideTimer();
    });
    expandBtnForTimer.addEventListener('mouseleave', () => {
      resetAutoHideTimer();
    });
  }
  
  // Update expanded info periodically
  setInterval(() => {
    if (isContextExpanded) {
      updateExpandedRowInfo();
    }
  }, 5000);
  
  // Expose expand toggle globally
  (window as any).toggleContextExpand = toggleContextExpand;
  
  console.log('✅ Unified header with context status initialized');
  
  // =========================================================================
  // END CONTEXT STATUS INTEGRATION
  // =========================================================================

  const providerDisplay = document.getElementById('provider-display');
  if (providerDisplay) {
    providerDisplay.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Provider dropdown clicked...');
      
      try {
        createQuickProviderDropdown();
      } catch (error) {
        console.error('Error opening dropdown:', error);
      }
    });

    // Hover effects now handled by CSS - just add/remove class for open state
    providerDisplay.addEventListener('mouseenter', () => {
      // CSS handles the hover effect via .provider-info-compact:hover
    });

    providerDisplay.addEventListener('mouseleave', () => {
      // CSS handles the hover effect
    });
  }

  const settingsBtn = document.getElementById('api-settings-btn-new');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Settings button clicked - opening modal...');
      
      try {
        createApiSettingsModal();
      } catch (error) {
        console.error('Error opening settings modal:', error);
        alert('Could not open settings. Please refresh the page.');
      }
    });

    settingsBtn.addEventListener('mouseenter', () => {
      settingsBtn.style.background = 'linear-gradient(135deg, rgba(79, 195, 247, 0.2), rgba(79, 195, 247, 0.1))';
      settingsBtn.style.borderColor = 'rgba(79, 195, 247, 0.4)';
      settingsBtn.style.color = '#ffffff';
      settingsBtn.style.transform = 'scale(1.05)';
    });

    settingsBtn.addEventListener('mouseleave', () => {
      settingsBtn.style.background = 'linear-gradient(135deg, rgba(79, 195, 247, 0.1), rgba(79, 195, 247, 0.05))';
      settingsBtn.style.borderColor = 'rgba(79, 195, 247, 0.2)';
      settingsBtn.style.color = '#4fc3f7';
      settingsBtn.style.transform = 'scale(1)';
    });
    
    console.log('Settings button event listener attached');
  } else {
    console.error('Settings button not found after creation');
  }

  updateProviderIndicator();
}

// ============================================================================
// UPDATE PROVIDER INDICATOR WITH CONFIG
// ============================================================================

/**
 * Update provider indicator UI with specific config
 * @param config - API configuration to display
 */
function updateProviderIndicatorWithConfig(config: ApiConfiguration): void {
  try {
    // Check if auto-route is enabled
    let isAutoRoute = false;
    let activeCount = 0;
    try {
      const orchConfig = JSON.parse(localStorage.getItem('multiProviderOrchestratorConfig') || '{}');
      isAutoRoute = orchConfig.enableAutoRouting || false;
      // Count active providers
      if (orchConfig.providers) {
        activeCount = Object.values(orchConfig.providers).filter((p: any) => p.enabled && p.apiKey).length;
      }
    } catch (e) {}
    
    const providerDisplay = document.getElementById('provider-display');
    if (providerDisplay) {
      // Reset to IDE-matching style
      providerDisplay.style.background = '#2d2d2d';
      providerDisplay.style.border = '1px solid #404040';
      providerDisplay.style.boxShadow = 'none';
      
      if (isAutoRoute && activeCount > 1) {
        // Show "Auto" with colored dots indicator
        providerDisplay.innerHTML = `
          <span class="provider-icon auto-icon" style="
            display: flex;
            align-items: center;
            gap: 2px;
          ">
            <span style="width: 4px; height: 4px; background: #4caf50; border-radius: 50%;"></span>
            <span style="width: 4px; height: 4px; background: #2196f3; border-radius: 50%;"></span>
            <span style="width: 4px; height: 4px; background: #ff9800; border-radius: 50%;"></span>
          </span>
          <span class="provider-text">Auto</span>
          <span class="dropdown-arrow">▾</span>
        `;
        console.log(`Updated provider display to Auto mode (${activeCount} providers)`);
      } else {
        // Show specific provider
        const providerColorVal = getProviderColor(config.provider);
        const providerName = getProviderShortName(config.provider);
        
        providerDisplay.innerHTML = `
          <span class="provider-icon" style="background: ${providerColorVal}; width: 6px; height: 6px; border-radius: 50%;"></span>
          <span class="provider-text">${providerName}</span>
          <span class="dropdown-arrow">▾</span>
        `;
        console.log(`Updated provider display to: ${providerName}`);
      }
    }
    
    // Update title
    const title = document.querySelector('title');
    if (title) {
      if (isAutoRoute && activeCount > 1) {
        title.textContent = `AI IDE - Auto (${activeCount} APIs)`;
      } else {
        title.textContent = `AI IDE - ${getProviderShortName(config.provider)}`;
      }
    }
    
  } catch (error) {
    console.error('Error updating provider display:', error);
  }
}

// ============================================================================
// UPDATE PROVIDER INDICATOR
// ============================================================================

/**
 * Update provider indicator UI from current config
 */
export function updateProviderIndicator(): void {
  try {
    setTimeout(() => {
      const config = getCurrentApiConfigurationForced();
      console.log(`updateProviderIndicator called, config:`, config);
      updateProviderIndicatorWithConfig(config);
    }, 100);
  } catch (error) {
    console.error('Error updating provider display:', error);
  }
}

// ============================================================================
// CREATE API SETTINGS MODAL
// ============================================================================

/**
 * Create and display full API settings modal
 */
export function createApiSettingsModal(preselectedProvider?: string): void {
  console.log('Creating API settings modal...', preselectedProvider ? `Pre-selecting: ${preselectedProvider}` : '');
  
  try {
    const existingModal = document.getElementById('api-settings-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'api-settings-modal';
    overlay.className = 'dialog-overlay';

    const modal = document.createElement('div');
    modal.className = 'dialog-content api-settings-modal';

    modal.innerHTML = `
      <div class="dialog-header">
        <h3>AI Provider Settings</h3>
        <button class="dialog-close" id="close-api-settings">×</button>
      </div>
      <div class="dialog-body">
        <div class="form-group">
          <label for="api-provider-select">AI Provider:</label>
          <select id="api-provider-select" class="form-control">
            <option value="groq" ${preselectedProvider === 'groq' ? 'selected' : ''}>🚀 Groq (Fast & Free!)</option>
            <option value="operator_x02" ${preselectedProvider === 'operator_x02' ? 'selected' : ''}>✓ Operator X02 (Coding Focus)</option>
            <option value="deepseek" ${preselectedProvider === 'deepseek' ? 'selected' : ''}>⚡ Deepseek (AI Reasoning)</option>
            <option value="openai" ${preselectedProvider === 'openai' ? 'selected' : ''}>☀️ OpenAI (GPT-4o Ready!)</option>
            <option value="ollama" ${preselectedProvider === 'ollama' ? 'selected' : ''}>😊 Ollama (Local & Free)</option>
            <option value="claude" ${preselectedProvider === 'claude' ? 'selected' : ''}>🤖 Claude (Anthropic)</option>
            <option value="gemini" ${preselectedProvider === 'gemini' ? 'selected' : ''}>⭐ Google Gemini</option>
            <option value="cohere" ${preselectedProvider === 'cohere' ? 'selected' : ''}>🔗 Cohere Command</option>
            <option value="custom" ${preselectedProvider === 'custom' ? 'selected' : ''}>⚙️ Custom Provider</option>
          </select>
        </div>

        <div class="form-group">
          <label for="api-key-input">API Key:</label>
          <div class="input-with-toggle">
            <input type="password" id="api-key-input" class="form-control" placeholder="Enter your API key">
            <button type="button" id="toggle-api-key" class="toggle-btn" title="Click to show/hide API key">👁️</button>
          </div>
          <small class="form-help">Your API key is stored locally and never shared.</small>
        </div>

        <div class="form-group">
          <label for="api-base-url-input">API Base URL:</label>
          <input type="text" id="api-base-url-input" class="form-control" placeholder="https://api.example.com/v1">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="api-model-input">Model:</label>
            <input type="text" id="api-model-input" class="form-control" placeholder="model-name">
          </div>
          <div class="form-group">
            <label for="api-max-tokens-input">Max Tokens:</label>
            <input type="number" id="api-max-tokens-input" class="form-control" value="4000" min="100" max="32000">
          </div>
        </div>

        <div class="form-group">
          <label for="api-temperature-input">Temperature: <span id="temperature-value">0.7</span></label>
          <input type="range" id="api-temperature-input" class="form-range" min="0" max="2" step="0.1" value="0.7">
        </div>

        <div class="provider-info" id="provider-info"></div>

        <div class="test-connection">
          <button type="button" id="test-api-btn" class="btn btn-secondary">Test Connection</button>
          <div id="test-result" class="test-result"></div>
        </div>
      </div>
      <div class="dialog-footer">
        <button type="button" id="save-api-settings" class="btn btn-primary">Save Settings</button>
        <button type="button" id="cancel-api-settings" class="btn btn-secondary">Cancel</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    console.log('Modal created, setting up event listeners...');

    setupModalEventListeners();
    loadCurrentApiSettings();
    updateProviderInfo('groq');

  } catch (error) {
    console.error('Error creating modal:', error);
    alert('Could not create settings modal. Please check console for errors.');
  }
}

// ============================================================================
// UPDATE PROVIDER INFO PANEL
// ============================================================================

/**
 * Update provider information panel in settings modal
 * @param provider - Provider to show info for
 */
function updateProviderInfo(provider: ApiProvider): void {
  const infoPanel = document.getElementById('provider-info');
  if (!infoPanel) return;

  const providerInfos: Record<ApiProvider, string> = {
    groq: `
      <div class="provider-details">
        <h4>🚀 Groq AI</h4>
        <p style="color: #4caf50; font-weight: bold;">✅ DEFAULT - Ready to Use!</p>
        <p>Ultra-fast inference with free tier that includes generous limits.</p>
        <ul>
          <li>Extremely fast inference speed</li>
          <li>Free tier: 6,000 tokens/minute</li>
          <li>Great for coding tasks</li>
          <li>Lightning fast responses</li>
          <li>API key pre-configured!</li>
        </ul>
      </div>
    `,
    deepseek: `
      <div class="provider-details">
        <h4>🔥 Deepseek AI</h4>
        <p style="color: #4caf50; font-weight: bold;">✅ Alternative - Ready to Use!</p>
        <p>Specialized in coding with excellent programming knowledge.</p>
        <ul>
          <li>Best for: Code analysis, debugging, programming help</li>
          <li>Models: deepseek-coder, deepseek-chat</li>
          <li>API key pre-configured!</li>
          <li>Switch anytime in settings</li>
        </ul>
      </div>
    `,
    openai: `
      <div class="provider-details">
        <h4>⚡ OpenAI</h4>
        <p style="color: #4caf50; font-weight: bold;">✅ Ready to Use!</p>
        <p>Industry-leading AI with GPT-4 models.</p>
        <ul>
          <li>Excellent for general coding tasks</li>
          <li>GPT-4o-mini: Fast and affordable</li>
          <li>GPT-4o: Most capable model</li>
          <li>API key pre-configured!</li>
          <li>Get your own key: <a href="https://platform.openai.com" target="_blank">platform.openai.com</a></li>
        </ul>
      </div>
    `,
    kimi: `
      <div class="provider-details">
        <h4>🌙 Kimi (Moonshot AI)</h4>
        <p style="color: #4caf50; font-weight: bold;">✅ Chinese AI - Great for Code!</p>
        <p>Powerful AI from Moonshot with strong coding capabilities.</p>
        <ul>
          <li>Models: moonshot-v1-8k, moonshot-v1-32k, moonshot-v1-128k</li>
          <li>Excellent Chinese language support</li>
          <li>Strong programming knowledge</li>
          <li>Fast response times</li>
          <li>OpenAI-compatible API</li>
          <li>Get API key: <a href="https://platform.moonshot.cn" target="_blank">platform.moonshot.cn</a></li>
        </ul>
        <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 4px; padding: 8px; margin: 8px 0;">
          <strong style="color: #ffc107;">⚠️ Security Note:</strong>
          <p style="margin: 4px 0 0 0;">Replace the default API key with your own from <a href="https://platform.moonshot.cn" target="_blank">platform.moonshot.cn</a></p>
        </div>
      </div>
    `,
    claude: `
      <div class="provider-details">
        <h4>🧠 Claude (Anthropic)</h4>
        <p><strong>Advanced AI with superior reasoning and coding capabilities.</strong></p>
        <ul>
          <li>Exceptional code analysis and debugging</li>
          <li>Deep understanding of programming concepts</li>
          <li>Excellent at explaining complex code</li>
          <li>Get API key: <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a></li>
        </ul>
        <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 4px; padding: 8px; margin: 8px 0;">
          <strong style="color: #ffc107;">Known Issues:</strong>
          <ul style="margin: 8px 0 0 0; padding-left: 16px;">
            <li>May have CORS issues in some environments</li>
            <li>Works best in desktop version</li>
            <li>Requires billing setup at console.anthropic.com</li>
            <li>Consider using Groq for faster responses</li>
          </ul>
        </div>
      </div>
    `,
    ollama: `
      <div class="provider-details">
        <h4>🦙 Ollama (Local AI)</h4>
        <p style="color: #4caf50; font-weight: bold;">✅ 100% FREE - Runs Locally!</p>
        <p>Run AI models locally on your machine. No API keys or internet required.</p>
        <ul>
          <li>Complete privacy - data never leaves your machine</li>
          <li>Completely free - no usage limits</li>
          <li>Fast inference once models are downloaded</li>
          <li>Setup: <a href="https://ollama.com" target="_blank">ollama.com</a></li>
        </ul>
      </div>
    `,
    gemini: `
      <div class="provider-details">
        <h4>✨ Google Gemini</h4>
        <p>Google's advanced AI model.</p>
        <ul>
          <li>Best for: Complex reasoning, code generation</li>
          <li>Models: gemini-2.5-flash</li>
          <li>Get API key: <a href="https://makersuite.google.com" target="_blank">makersuite.google.com</a></li>
        </ul>
      </div>
    `,
    cohere: `
      <div class="provider-details">
        <h4>💫 Cohere</h4>
        <p>Enterprise-focused AI with strong text generation.</p>
        <ul>
          <li>Best for: Text generation, analysis</li>
          <li>Models: command-r-plus</li>
          <li>Get API key: <a href="https://dashboard.cohere.ai" target="_blank">dashboard.cohere.ai</a></li>
        </ul>
      </div>
    `,
    custom: `
      <div class="provider-details">
        <h4>⚙️ Custom Provider</h4>
        <p>Configure your own API endpoint.</p>
        <ul>
          <li>Use any OpenAI-compatible API</li>
          <li>Local models (Ollama, LM Studio, etc.)</li>
          <li>Custom enterprise endpoints</li>
        </ul>
      </div>
    `
  };

  infoPanel.innerHTML = providerInfos[provider] || '';
}

// ============================================================================
// SETUP MODAL EVENT LISTENERS
// ============================================================================

/**
 * Setup event listeners for settings modal
 */
function setupModalEventListeners(): void {
  try {
    const overlay = document.getElementById('api-settings-modal');
    const closeBtn = document.getElementById('close-api-settings');
    const cancelBtn = document.getElementById('cancel-api-settings');
    const saveBtn = document.getElementById('save-api-settings');
    const testBtn = document.getElementById('test-api-btn');
    const toggleBtn = document.getElementById('toggle-api-key');
    const tempSlider = document.getElementById('api-temperature-input') as HTMLInputElement;
    const tempValue = document.getElementById('temperature-value');
    const providerSelect = document.getElementById('api-provider-select') as HTMLSelectElement;

    const closeModal = () => {
      overlay?.remove();
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
        const isPassword = apiKeyInput.type === 'password';
        apiKeyInput.type = isPassword ? 'text' : 'password';
        toggleBtn.textContent = isPassword ? '🙈' : '👁️';
      });
    }

    if (tempSlider && tempValue) {
      tempSlider.addEventListener('input', () => {
        tempValue.textContent = tempSlider.value;
      });
    }

    if (providerSelect) {
      providerSelect.addEventListener('change', () => {
        const provider = providerSelect.value as ApiProvider;
        updateProviderInfo(provider);
        
        const defaultConfig = DEFAULT_PROVIDER_CONFIGS[provider];
        const baseUrlInput = document.getElementById('api-base-url-input') as HTMLInputElement;
        const modelInput = document.getElementById('api-model-input') as HTMLInputElement;
        const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
        
        if (baseUrlInput) baseUrlInput.value = defaultConfig.apiBaseUrl || '';
        if (modelInput) modelInput.value = defaultConfig.model || '';
        
        if (provider === 'ollama') {
          if (apiKeyInput) apiKeyInput.value = 'ollama';
        } else if (apiKeyInput && (!apiKeyInput.value || apiKeyInput.value === 'PROXY')) {
          // Only auto-set PROXY for providers confirmed active on server
          const proxyHealth = (window as any).proxyHealth;
          const isProxyActive = proxyHealth?.isActive?.(provider);
          if (isProxyActive) {
            apiKeyInput.value = 'PROXY';
          } else if (provider === 'operator_x02') {
            // operator_x02 always uses proxy
            apiKeyInput.value = 'PROXY';
          } else {
            // Leave empty so user can enter their own key
            apiKeyInput.value = '';
            apiKeyInput.placeholder = 'Enter your API key (e.g. sk-...)';
          }
        }
      });
    }

    if (testBtn) {
      testBtn.addEventListener('click', async () => {
        const btn = testBtn as HTMLButtonElement;
        const result = document.getElementById('test-result');
        
        btn.disabled = true;
        btn.textContent = 'Testing...';
        
        if (result) {
          result.style.display = 'block';
          result.className = 'test-result testing';
          result.textContent = 'Testing connection...';
        }
        
        try {
          const config = getConfigFromModal();
          const cleanConfig = ensureProviderConsistency(config);
          
          if (cleanConfig.provider !== 'ollama' && !cleanConfig.apiKey) {
            throw new Error('API key is required');
          }
          
          if (cleanConfig.provider === 'claude' && !cleanConfig.apiKey.startsWith('sk-ant-')) {
            throw new Error('Claude API key must start with "sk-ant-"');
          }
          
          const testMessage = 'Hello! Please respond with just "API test successful!"';
          const response = await callGenericAPI(testMessage, cleanConfig);
          
          if (result) {
            result.className = 'test-result success';
            result.innerHTML = `${cleanConfig.provider} connection test successful!<br><small>Response: ${response.substring(0, 100)}...</small>`;
          }
          
        } catch (error) {
          if (result) {
            result.className = 'test-result error';
            result.innerHTML = `Connection failed: ${error.message}`;
          }
        } finally {
          btn.disabled = false;
          btn.textContent = 'Test Connection';
        }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        try {
          saveApiSettingsFromModalEnhanced();
          closeModal();
        } catch (error) {
          console.error('Save failed:', error);
          alert('Failed to save settings: ' + error.message);
        }
      });
    }

    console.log('Modal event listeners attached');

  } catch (error) {
    console.error('Error setting up modal event listeners:', error);
  }
}

// ============================================================================
// LOAD CURRENT API SETTINGS INTO MODAL
// ============================================================================

/**
 * Load current API settings into modal form
 */
function loadCurrentApiSettings(): void {
  try {
    const config = getCurrentApiConfigurationForced();
    
    const providerSelect = document.getElementById('api-provider-select') as HTMLSelectElement;
    const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
    const baseUrlInput = document.getElementById('api-base-url-input') as HTMLInputElement;
    const modelInput = document.getElementById('api-model-input') as HTMLInputElement;
    const maxTokensInput = document.getElementById('api-max-tokens-input') as HTMLInputElement;
    const temperatureInput = document.getElementById('api-temperature-input') as HTMLInputElement;
    const temperatureValue = document.getElementById('temperature-value');

    if (providerSelect) providerSelect.value = config.provider;
    if (apiKeyInput) apiKeyInput.value = config.apiKey || '';
    if (baseUrlInput) baseUrlInput.value = config.apiBaseUrl || '';
    if (modelInput) modelInput.value = config.model || '';
    if (maxTokensInput) maxTokensInput.value = config.maxTokens?.toString() || '4000';
    if (temperatureInput) temperatureInput.value = config.temperature?.toString() || '0.7';
    if (temperatureValue) temperatureValue.textContent = config.temperature?.toString() || '0.7';

    updateProviderInfo(config.provider);

    console.log('Settings loaded into modal');
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// ============================================================================
// GET CONFIGURATION FROM MODAL FORM
// ============================================================================

/**
 * Extract configuration from modal form inputs
 * @returns Configuration object from form
 */
function getConfigFromModal(): ApiConfiguration {
  const providerSelect = document.getElementById('api-provider-select') as HTMLSelectElement;
  const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
  const baseUrlInput = document.getElementById('api-base-url-input') as HTMLInputElement;
  const modelInput = document.getElementById('api-model-input') as HTMLInputElement;
  const maxTokensInput = document.getElementById('api-max-tokens-input') as HTMLInputElement;
  const temperatureInput = document.getElementById('api-temperature-input') as HTMLInputElement;

  return {
    provider: providerSelect.value as ApiProvider,
    apiKey: (apiKeyInput.value || '').trim(),
    apiBaseUrl: baseUrlInput.value,
    model: modelInput.value,
    maxTokens: parseInt(maxTokensInput.value) || 4000,
    temperature: parseFloat(temperatureInput.value) || 0.7
  };
}

// ============================================================================
// SAVE API SETTINGS FROM MODAL (ENHANCED)
// ============================================================================

/**
 * Save API settings from modal with enhanced validation
 */
function saveApiSettingsFromModalEnhanced(): void {
  try {
    console.log('Saving API settings with enhanced state sync...');
    
    const config = getConfigFromModal();
    console.log('New configuration:', config);

    if (config.provider !== 'ollama' && !config.apiKey) {
      alert('Please enter an API key');
      return;
    }

    if (config.provider === 'claude') {
      const claudeValidation = validateClaudeConfig(config);
      if (!claudeValidation.isValid) {
        alert(`Claude configuration issues:\n${claudeValidation.errors.join('\n')}`);
        return;
      }
    }

    const cleanConfig = ensureProviderConsistency(config);
    console.log('Clean configuration:', cleanConfig);

    try {
      saveApiConfiguration(cleanConfig);
      console.log('Configuration saved to storage');
      
      const verifyConfig = getCurrentApiConfigurationForced();
      console.log('Verified saved config:', verifyConfig);
      
      if (verifyConfig.provider !== cleanConfig.provider) {
        throw new Error('Configuration save verification failed');
      }
      
    } catch (saveError) {
      console.error('Save failed:', saveError);
      alert('Failed to save configuration. Please try again.');
      return;
    }

    clearConfigCache();
    
    console.log('Updating UI with new provider...');
    updateProviderIndicatorWithConfig(cleanConfig);
    
    console.log('Settings saved successfully:', cleanConfig.provider);

  } catch (error) {
    console.error('Error saving settings:', error);
    alert('Failed to save settings: ' + error.message);
  }
}

// ============================================================================
// SETTINGS VERIFICATION
// ============================================================================

/**
 * Verify and fix provider settings if needed
 * @returns Verified configuration or null if verification failed
 */
export function verifyProviderSettings(): ApiConfiguration | null {
  try {
    const config = getCurrentApiConfigurationForced();
    const cleanConfig = ensureProviderConsistency(config);
    
    const needsUpdate = JSON.stringify(config) !== JSON.stringify(cleanConfig);
    
    if (needsUpdate) {
      console.log('Fixing inconsistent provider settings...');
      saveApiConfiguration(cleanConfig);
      updateProviderIndicator();
    }
    
    console.log('Provider settings verified:', cleanConfig.provider);
    return cleanConfig;
  } catch (error) {
    console.error('Settings verification failed:', error);
    return null;
  }
}

// ============================================================================
// DEBUG CURRENT CONFIGURATION
// ============================================================================

/**
 * Debug current configuration (for console use)
 */
export function debugCurrentConfiguration(): void {
  console.log('=== CONFIGURATION DEBUG ===');
  
  try {
    const config = getCurrentApiConfigurationForced();
    console.log('Current config:', config);
    
    const providerDisplay = document.getElementById('provider-display');
    console.log('UI display element:', providerDisplay?.innerHTML);
    
    const storedRaw = localStorage.getItem('aiApiConfig');
    console.log('Raw localStorage:', storedRaw);
    
    const indicators = document.querySelectorAll('.provider-indicator');
    console.log('Provider indicators count:', indicators.length);
    indicators.forEach((ind, i) => {
      console.log(`Indicator ${i}:`, ind.textContent);
    });
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
  
  console.log('=== END DEBUG ===');
}

// ============================================================================
// CLAUDE DEBUG AND TESTING FUNCTIONS
// ============================================================================

/**
 * Test Claude API connection
 * @param apiKey - Claude API key to test
 * @param model - Claude model to use
 * @returns Promise resolving to test response
 */
export async function testClaudeAPI(apiKey: string, model: string = 'claude-sonnet-4-20250514'): Promise<string> {
  console.log('Testing Claude API connection...');
  
  const testConfig: ApiConfiguration = {
    provider: 'claude',
    apiKey: apiKey.trim(),
    apiBaseUrl: 'https://api.anthropic.com/v1',
    model: model,
    maxTokens: 100,
    temperature: 0.1
  };
  
  try {
    const response = await callGenericAPI('Hello! Please respond with just "Claude API working correctly!"', testConfig);
    console.log('Claude API test successful:', response);
    return response;
  } catch (error) {
    console.error('Claude API test failed:', error);
    throw error;
  }
}

/**
 * Validate Claude API key format
 * @param apiKey - API key to validate
 * @returns Validation result
 */
export function validateUserClaudeKey(apiKey: string): { isValid: boolean; message: string } {
  const cleanKey = apiKey.trim();
  
  if (!cleanKey) {
    return { isValid: false, message: 'API key is empty' };
  }
  
  if (!cleanKey.startsWith('sk-ant-')) {
    return { isValid: false, message: 'Claude API key must start with "sk-ant-"' };
  }
  
  if (cleanKey.length < 50) {
    return { isValid: false, message: 'API key appears too short' };
  }
  
  return { isValid: true, message: 'API key format appears valid' };
}

/**
 * Check Claude API availability in current environment
 * @returns Availability status with suggestions
 */
export async function checkClaudeAvailability(): Promise<{
  available: boolean;
  reason: string;
  suggestions: string[];
}> {
  
  const isTauri = isTauriEnvironment();
  const hasTauriHttp = window.__TAURI__ && window.__TAURI__.http;
  
  if (isTauri || hasTauriHttp) {
    return {
      available: true,
      reason: 'Desktop environment or Tauri HTTP available',
      suggestions: []
    };
  }
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'OPTIONS',
      mode: 'cors'
    });
    
    return {
      available: true,
      reason: 'CORS preflight successful',
      suggestions: []
    };
  } catch (error) {
    return {
      available: false,
      reason: 'Blocked by browser CORS policy',
      suggestions: [
        'Use the desktop version of the IDE',
        'Switch to Groq (fast and works great)',
        'Switch to Deepseek (coding-focused)',
        'Switch to OpenAI (GPT-4o ready)',
        'Switch to Kimi (Moonshot AI)',
        'Set up a local proxy server'
      ]
    };
  }
}

// ============================================================================
// VISION API SUPPORT
// ============================================================================

/**
 * Call vision API for image analysis
 * @param imageData - Base64 image data
 * @param prompt - Analysis prompt
 * @returns Promise resolving to analysis result
 */
export async function callVisionAPI(imageData: string, prompt: string): Promise<string> {
  try {
    const request = {
      provider: "openai",
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: imageData
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.1
    };

    const response = await invoke('call_ai_api', { 
      request: request
    });

    return response.content || response.message || JSON.stringify(response);
  } catch (error) {
    console.error('Vision API call failed:', error);
    throw new Error(`Vision API failed: ${error.message}`);
  }
}

// ============================================================================
// ADD API SETTINGS STYLES
// ============================================================================

/**
 * Add CSS styles for API settings UI
 */
export function addApiSettingsStyles(): void {
  if (document.getElementById('api-settings-styles')) {
    return;
  }

  const styleElement = document.createElement('style');
  styleElement.id = 'api-settings-styles';
  styleElement.textContent = `
    /* Assistant Header Layout */
    .assistant-header {
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      border-bottom: 1px solid #404040;
      padding: 10px 16px;
      display: flex;
      flex-direction: column;
      gap: 0;
      min-height: auto;
      position: relative;
    }
    
    .header-row-main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
    
    /* Expanded Row - Below main row */
    .context-expanded-row {
      display: none;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      margin-top: 8px;
      background: rgba(255,255,255,0.03);
      border-radius: 4px;
      font-size: 11px;
      border: 1px solid rgba(255,255,255,0.06);
    }
    
    .context-expanded-row.visible {
      display: flex;
      animation: slideDown 0.2s ease-out;
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .assistant-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--header-line-color, #4fc3f7), transparent);
      opacity: 0.8;
      transition: background 0.5s ease, box-shadow 0.5s ease;
    }
    
    /* Auto-Route ON - Green animated line */
    .assistant-header.auto-route-on::before {
      background: linear-gradient(90deg, transparent, #4caf50, #81c784, #4caf50, transparent);
      background-size: 200% 100%;
      animation: autoRouteGlow 2s ease-in-out infinite;
      box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
    }
    
    @keyframes autoRouteGlow {
      0%, 100% {
        background-position: 0% 50%;
        opacity: 0.7;
      }
      50% {
        background-position: 100% 50%;
        opacity: 1;
      }
    }
    
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.5;
        transform: scale(0.8);
      }
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ai-icon {
      font-size: 20px;
      filter: drop-shadow(0 0 4px rgba(79, 195, 247, 0.3));
    }

    .ai-title {
      font-weight: 600;
      color: #ffffff;
      font-size: 13px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Provider Info Compact - Clean IDE-Matching Style */
    .provider-info-compact {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 12px;
      background: #2d2d2d;
      border: 1px solid #404040;
      border-radius: 6px;
      color: #e0e0e0;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      min-width: auto;
    }
    
    .provider-info-compact:hover {
      background: #363636;
      border-color: #505050;
    }
    
    .provider-info-compact:active {
      background: #2a2a2a;
    }

    .provider-info-compact.clickable {
      cursor: pointer;
    }

    .provider-info-compact:focus,
    .provider-info-compact:focus-visible {
      outline: 1px solid #007acc;
      outline-offset: 1px;
    }

    .provider-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .provider-icon svg {
      width: 14px;
      height: 14px;
      display: block;
      color: #cccccc;
      transition: color 0.15s ease;
    }

    .provider-info-compact:hover .provider-icon svg {
      color: #e0e0e0;
    }

    .provider-text {
      font-weight: 500;
      letter-spacing: 0.2px;
      white-space: nowrap;
      color: #e0e0e0;
    }

    .dropdown-arrow {
      font-size: 9px;
      opacity: 0.6;
      margin-left: 2px;
      transition: transform 0.15s ease;
      color: #888;
    }
    
    .provider-info-compact:hover .dropdown-arrow {
      opacity: 0.8;
    }
    
    .provider-info-compact.open .dropdown-arrow {
      transform: rotate(180deg);
    }

    /* Quick Provider Dropdown - Compact Professional Style */
    .quick-provider-dropdown {
      background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
      border: 1px solid #404040;
      border-radius: 6px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
      min-width: 320px;
      max-width: 360px;
      backdrop-filter: blur(10px);
      z-index: 10001;
      animation: dropdownSlideIn 0.15s ease-out;
    }

    @keyframes dropdownSlideIn {
      from {
        opacity: 0;
        transform: translateY(-8px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .dropdown-header {
      padding: 8px 12px 6px;
      border-bottom: 1px solid #404040;
    }

    .dropdown-title {
      font-size: 12px;
      font-weight: 600;
      color: #4fc3f7;
      letter-spacing: 0.3px;
    }

    .dropdown-section {
      padding: 4px 0;
    }

    .section-label {
      padding: 6px 12px 3px;
      font-size: 9px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      cursor: pointer;
      transition: all 0.15s ease;
      border-left: 2px solid transparent;
      position: relative;
    }

    .dropdown-item:hover {
      background: linear-gradient(135deg, rgba(79, 195, 247, 0.08), rgba(79, 195, 247, 0.04));
      border-left-color: #4fc3f7;
    }

    /* Active provider with breathing animation */
    .dropdown-item.active {
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.12), rgba(76, 175, 80, 0.06));
      border-left: 3px solid #4caf50;
      animation: breathingBorder 2.5s ease-in-out infinite;
    }

    .dropdown-item.active:hover {
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.16), rgba(76, 175, 80, 0.08));
    }

    /* Breathing animation - pulsing glow effect */
    @keyframes breathingBorder {
      0%, 100% {
        border-left-color: #4caf50;
        box-shadow: inset 3px 0 0 0 rgba(76, 175, 80, 0.3), 0 0 15px rgba(76, 175, 80, 0.2);
      }
      50% {
        border-left-color: #66bb6a;
        box-shadow: inset 3px 0 0 0 rgba(102, 187, 106, 0.5), 0 0 25px rgba(76, 175, 80, 0.4);
      }
    }

    .dropdown-item .provider-icon {
      font-size: 15px;
      min-width: 18px;
      text-align: center;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .dropdown-item .provider-icon svg {
      width: 18px;
      height: 18px;
      color: #999;
      transition: all 0.2s ease;
    }

    .dropdown-item:hover .provider-icon svg {
      color: #4fc3f7;
      transform: scale(1.15);
    }

    .dropdown-item.active .provider-icon svg {
      color: #4caf50;
    }

    .dropdown-item.active:hover .provider-icon svg {
      color: #66bb6a;
    }

    .provider-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .provider-name {
      font-size: 12px;
      font-weight: 600;
      color: #ffffff;
      line-height: 1.2;
    }

    .provider-desc {
      font-size: 10px;
      color: #777;
      line-height: 1.2;
    }

    .add-key-btn {
      background: linear-gradient(135deg, rgba(79, 195, 247, 0.15), rgba(79, 195, 247, 0.08));
      border: 1px solid rgba(79, 195, 247, 0.3);
      color: #4fc3f7;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    }

    .add-key-btn:hover {
      background: linear-gradient(135deg, rgba(79, 195, 247, 0.25), rgba(79, 195, 247, 0.15));
      border-color: #4fc3f7;
      color: #29b6f6;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(79, 195, 247, 0.3);
    }

    .add-key-btn:active {
      transform: translateY(0);
    }

    /* Settings button for providers with API keys */
    .settings-key-btn {
      background: linear-gradient(135deg, rgba(156, 39, 176, 0.15), rgba(156, 39, 176, 0.08));
      border: 1px solid rgba(156, 39, 176, 0.3);
      color: #9c27b0;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    }

    .settings-key-btn:hover {
      background: linear-gradient(135deg, rgba(156, 39, 176, 0.25), rgba(156, 39, 176, 0.15));
      border-color: #9c27b0;
      color: #ba68c8;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(156, 39, 176, 0.3);
    }

    .settings-key-btn:active {
      transform: translateY(0);
    }

    /* Footer action buttons */
    #set-default-btn:hover {
      background: linear-gradient(135deg, rgba(255,193,7,0.25) 0%, rgba(255,160,0,0.25) 100%);
      border-color: #ffc107;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(255,193,7,0.25);
    }
    
    #set-default-btn:active {
      transform: translateY(0);
    }
    
    #show-calibration-btn:hover {
      background: linear-gradient(135deg, rgba(156,39,176,0.25) 0%, rgba(123,31,162,0.25) 100%);
      border-color: #ba68c8;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(156,39,176,0.25);
    }
    
    #show-calibration-btn:active {
      transform: translateY(0);
    }
    
    #show-stats-btn:hover {
      background: linear-gradient(135deg, rgba(33,150,243,0.25) 0%, rgba(30,136,229,0.25) 100%);
      border-color: #64b5f6;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(33,150,243,0.25);
    }
    
    #show-stats-btn:active {
      transform: translateY(0);
    }
    
    #reset-stats-btn:hover {
      background: rgba(244,67,54,0.2);
      border-color: #ef5350;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(244,67,54,0.2);
    }
    
    #reset-stats-btn:active {
      transform: translateY(0);
    }

    .dropdown-footer {
      border-top: 1px solid #404040;
      padding: 2px 0;
    }

    .settings-link {
      border-left-color: #555 !important;
    }

    .settings-link:hover {
      background: linear-gradient(135deg, rgba(102, 102, 102, 0.08), rgba(102, 102, 102, 0.04)) !important;
      border-left-color: #777 !important;
    }

    /* Legacy elements hiding */
    .api-settings-container,
    .settings-group {
      display: none !important;
    }

    /* System messages styling */
    .system-message {
      background: linear-gradient(135deg, rgba(79, 195, 247, 0.1), rgba(79, 195, 247, 0.05));
      border: 1px solid rgba(79, 195, 247, 0.2);
      border-left: 4px solid #4fc3f7;
      border-radius: 8px;
      padding: 12px 16px;
      margin: 8px 16px;
      color: #4fc3f7;
      font-size: 14px;
      line-height: 1.4;
      position: relative;
      animation: slideInFromTop 0.3s ease-out;
    }

    .system-message.success {
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.05));
      border-color: rgba(76, 175, 80, 0.2);
      border-left-color: #4caf50;
      color: #4caf50;
    }

    .system-message.warning {
      background: linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 193, 7, 0.05));
      border-color: rgba(255, 193, 7, 0.2);
      border-left-color: #ffc107;
      color: #ffc107;
    }

    @keyframes slideInFromTop {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* MODAL STYLING */
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      backdrop-filter: blur(2px);
    }
    
    .dialog-content {
      background-color: #2d2d2d;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      color: white;
      border: 1px solid #444;
    }
    
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 20px 10px;
      border-bottom: 1px solid #444;
    }
    
    .dialog-header h3 {
      margin: 0;
      color: #fff;
      font-size: 18px;
    }
    
    .dialog-close {
      background: none;
      border: none;
      color: #ccc;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }
    
    .dialog-close:hover {
      background-color: #444;
      color: white;
    }
    
    .dialog-body {
      padding: 20px;
    }
    
    .dialog-footer {
      padding: 10px 20px 20px;
      border-top: 1px solid #444;
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: bold;
      color: #ddd;
    }

    .form-control {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #444;
      border-radius: 4px;
      background-color: #2d2d2d;
      color: white;
      font-size: 14px;
    }

    .form-control:focus {
      outline: none;
      border-color: #4fc3f7;
      box-shadow: 0 0 0 2px rgba(79, 195, 247, 0.2);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .input-with-toggle {
      position: relative;
    }

    .toggle-btn {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: #ddd;
      cursor: pointer;
      font-size: 14px;
      padding: 4px 8px;
      border-radius: 3px;
      z-index: 10;
    }

    .toggle-btn:hover {
      background: rgba(255,255,255,0.2);
      color: white;
    }

    .form-help {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: #888;
    }

    .form-range {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #444;
      outline: none;
    }

    .provider-details {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid #444;
      border-radius: 6px;
      padding: 16px;
      margin-top: 16px;
    }

    .provider-details h4 {
      margin: 0 0 8px 0;
      color: #4fc3f7;
    }

    .provider-details p {
      margin: 0 0 12px 0;
      color: #ddd;
    }

    .provider-details ul {
      margin: 0;
      padding-left: 20px;
      color: #ccc;
    }

    .provider-details li {
      margin-bottom: 4px;
    }

    .provider-details a {
      color: #4fc3f7;
      text-decoration: none;
    }

    .provider-details a:hover {
      text-decoration: underline;
    }

    .test-connection {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #444;
    }

    .test-result {
      margin-top: 8px;
      padding: 8px;
      border-radius: 4px;
      font-size: 14px;
      display: none;
    }

    .test-result.testing {
      background: rgba(255, 193, 7, 0.1);
      border: 1px solid rgba(255, 193, 7, 0.3);
      color: #ffc107;
      display: block;
    }

    .test-result.success {
      background: rgba(76, 175, 80, 0.1);
      border: 1px solid rgba(76, 175, 80, 0.3);
      color: #4caf50;
      display: block;
    }

    .test-result.error {
      background: rgba(244, 67, 54, 0.1);
      border: 1px solid rgba(244, 67, 54, 0.3);
      color: #f44336;
      display: block;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    }
    
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .btn-primary {
      background-color: #4fc3f7;
      color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
      background-color: #29b6f6;
    }
    
    .btn-secondary {
      background-color: #666;
      color: white;
    }
    
    .btn-secondary:hover:not(:disabled) {
      background-color: #777;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .assistant-header {
        padding: 8px 12px;
      }
      
      .header-right {
        gap: 8px;
      }

      .quick-provider-dropdown {
        min-width: 200px;
        max-width: 250px;
      }
    }
  `;

  document.head.appendChild(styleElement);
}

// ============================================================================
// INITIALIZE API SETTINGS
// ============================================================================

let isInitialized = false;

/**
 * Initialize API settings system (main entry point)
 */
export function initializeApiSettings(): void {
  if (isInitialized) {
    console.log('API settings already initialized, skipping...');
    return;
  }

  try {
    migrateFromOperatorX02();
    
    const config = initializeDefaultProvider();
    
    addApiSettingsStyles();
    setupApiSettingsButton();
    
    isInitialized = true;
    
    console.log('API Provider Manager initialized successfully');
    console.log('Current provider:', config.provider);
    console.log('API endpoint:', config.apiBaseUrl);
    console.log('Quick dropdown available on provider badge');
    
    setTimeout(cleanupDuplicateElements, 1000);
    
    if (config.provider === 'claude') {
      checkClaudeAvailability().then(availability => {
        if (!availability.available) {
          showSystemMessage(`Claude blocked by browser. Try Groq, Deepseek, OpenAI, or Kimi from the dropdown!`, 'warning');
        }
      });
    }
    
  } catch (error) {
    console.error('Error initializing API settings:', error);
    showSystemMessage('Failed to initialize AI settings. Please refresh the page.', 'warning');
  }
}

// ============================================================================
// AUTO-CLEANUP
// ============================================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cleanupDuplicateElements);
} else {
  cleanupDuplicateElements();
}

// ============================================================================
// WINDOW DEBUG FUNCTIONS
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).debugClaudeAPI = async () => {
    console.log('Starting Claude API Debug Session...');
    
    const currentConfig = getCurrentApiConfigurationForced();
    console.log('Current configuration:', currentConfig);
    
    if (currentConfig.provider === 'claude') {
      const availability = await checkClaudeAvailability();
      console.log('Claude availability:', availability);
      
      const keyValidation = validateUserClaudeKey(currentConfig.apiKey);
      console.log('API key validation:', keyValidation);
      
      if (keyValidation.isValid && availability.available) {
        try {
          const testResult = await testClaudeAPI(currentConfig.apiKey);
          console.log('Claude test successful:', testResult);
        } catch (error) {
          console.error('Claude test failed:', error);
        }
      }
    } else {
      console.log('Current provider is not Claude');
    }
  };
  
  (window as any).debugCurrentConfiguration = debugCurrentConfiguration;
  (window as any).quickSwitchProvider = quickSwitchProvider;
  (window as any).switchProviderSeamless = switchProviderSeamless;
  (window as any).switchToProvider = switchToProvider;
  (window as any).createQuickProviderDropdown = createQuickProviderDropdown;
  (window as any).parseProviderTagOverride = parseProviderTagOverride;
  (window as any).getTemporaryProviderConfig = getTemporaryProviderConfig;
  
  console.log('⚡ Multi-Provider API Integration Complete!');
  console.log('Debug functions available:');
  console.log('- debugClaudeAPI()');
  console.log('- debugCurrentConfiguration()'); 
  console.log('- quickSwitchProvider("groq" | "operator_x02" | "deepseek" | "openai") - With reload');
  console.log('- switchProviderSeamless("groq" | "operator_x02" | "deepseek" | "openai") - No reload');
  console.log('- switchToProvider("provider_name")');
  console.log('- createQuickProviderDropdown() - Test dropdown manually');
  console.log('- parseProviderTagOverride("#groq hello") - Test per-message override');
  console.log('- getTemporaryProviderConfig("groq") - Get temp config without saving');
}