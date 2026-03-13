// state.ts - Enhanced with multi-API support while preserving existing functionality
// Updated with operatorX02 as default provider

import { Conversation } from './types';

// Enhanced API Provider types (operatorX02 as first/default option)
export type ApiProvider = 'operatorX02' | 'deepseek' | 'claude' | 'openai' | 'gemini' | 'cohere' | 'custom';

// Enhanced API Configuration interface (preserved)
export interface ApiConfiguration {
  provider: ApiProvider;
  apiKey: string;
  apiBaseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

// Original API Settings interface (preserved for backward compatibility)
export interface ApiSettings {
  apiKey: string;
  apiBaseUrl: string;
}

// Original state variables (updated defaults to operatorX02)
export let apiKey = '';
export let apiBaseUrl = 'PROXY';
export let conversations: Conversation[] = [];
export let currentConversationId: string | null = null;

// Enhanced storage keys
const API_CONFIGURATION_KEY = 'ai-ide-api-configuration';
const LEGACY_API_KEY = 'apiKey';
const LEGACY_BASE_URL = 'apiBaseUrl';

// Default provider configurations (operatorX02 first as default)
const DEFAULT_PROVIDER_CONFIGS: Record<ApiProvider, Omit<ApiConfiguration, 'apiKey'>> = {
operatorX02: {
    provider: 'operatorX02',
    apiBaseUrl: 'PROXY',
    model: 'deepseek-coder',
    maxTokens: 4000,
    temperature: 0.7
  },
  deepseek: {
    provider: 'deepseek',
    apiBaseUrl: 'PROXY',
    model: 'deepseek-coder',
    maxTokens: 4000,
    temperature: 0.7
  },
  claude: {
    provider: 'claude',
    apiBaseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4000,
    temperature: 0.7
  },
  openai: {
    provider: 'openai',
    apiBaseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4',
    maxTokens: 4000,
    temperature: 0.7
  },
  gemini: {
    provider: 'gemini',
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1',
    model: 'gemini-1.5-pro',
    maxTokens: 4000,
    temperature: 0.7
  },
  cohere: {
    provider: 'cohere',
    apiBaseUrl: 'https://api.cohere.ai/v1',
    model: 'command-r-plus',
    maxTokens: 4000,
    temperature: 0.7
  },
  custom: {
    provider: 'custom',
    apiBaseUrl: '',
    model: '',
    maxTokens: 4000,
    temperature: 0.7
  }
};

// Default API settings (updated to operatorX02)
const defaultApiSettings: ApiSettings = {
  apiKey: '',
  apiBaseUrl: 'PROXY'
};

// Current API configuration (updated to default to operatorX02)
let currentApiConfiguration: ApiConfiguration = {
  ...DEFAULT_PROVIDER_CONFIGS.operatorX02,
  apiKey: ''
};

// Original conversation management functions (preserved exactly as they were)
export function setCurrentConversationId(id: string | null): void {
  currentConversationId = id;
  saveCurrentConversationId();
}

export function addConversation(conversation: Conversation): void {
  conversations.push(conversation);
  saveConversations();
}

export function clearConversations(): void {
  conversations.length = 0;
  saveConversations();
}

export function addConversations(newConversations: Conversation[]): void {
  conversations.push(...newConversations);
  saveConversations();
}

export function getConversations(): Conversation[] {
  return [...conversations]; // Return a copy to prevent direct mutations
}

export function updateConversation(conversationId: string, updatedFields: Partial<Conversation>): void {
  const index = conversations.findIndex(c => c.id === conversationId);
  if (index !== -1) {
    conversations[index] = { ...conversations[index], ...updatedFields };
    saveConversations();
  }
}

export function removeConversation(id: string): Conversation[] {
  const newConversations = conversations.filter(c => c.id !== id);
  conversations.length = 0;
  conversations.push(...newConversations);
  saveConversations();
  return conversations;
}

// Enhanced API Configuration functions (updated with operatorX02 defaults)
export function loadApiConfiguration(): ApiConfiguration {
  try {
    // First try to load new format
    const savedConfig = localStorage.getItem(API_CONFIGURATION_KEY);
    if (savedConfig) {
      const config = JSON.parse(savedConfig) as ApiConfiguration;
      currentApiConfiguration = config;
      
      // Update legacy variables for backward compatibility
      apiKey = config.apiKey;
      apiBaseUrl = config.apiBaseUrl;
      
      return config;
    }
    
    // Fall back to legacy format and migrate to operatorX02
    const legacySettings = loadApiSettingsLegacy();
    if (legacySettings.apiKey || legacySettings.apiBaseUrl !== defaultApiSettings.apiBaseUrl) {
      // Migrate legacy settings to new format - using operatorX02 as default now
      const migratedConfig: ApiConfiguration = {
        ...DEFAULT_PROVIDER_CONFIGS.operatorX02,
        apiKey: legacySettings.apiKey,
        apiBaseUrl: legacySettings.apiBaseUrl
      };
      
      saveApiConfiguration(migratedConfig);
      return migratedConfig;
    }
    
    return currentApiConfiguration;
  } catch (error) {
    console.error('Failed to load API configuration:', error);
    return currentApiConfiguration;
  }
}

export function saveApiConfiguration(config: ApiConfiguration): void {
  currentApiConfiguration = config;
  
  // Update legacy variables for backward compatibility
  apiKey = config.apiKey;
  apiBaseUrl = config.apiBaseUrl;
  
  // Save new format
  localStorage.setItem(API_CONFIGURATION_KEY, JSON.stringify(config));
  
  // Also save in legacy format for backward compatibility
  localStorage.setItem(LEGACY_API_KEY, config.apiKey);
  localStorage.setItem(LEGACY_BASE_URL, config.apiBaseUrl);
}

export function getCurrentApiConfiguration(): ApiConfiguration {
  return { ...currentApiConfiguration };
}

export function switchProvider(provider: ApiProvider, apiKey?: string): ApiConfiguration {
  const newConfig: ApiConfiguration = {
    ...DEFAULT_PROVIDER_CONFIGS[provider],
    apiKey: apiKey || currentApiConfiguration.apiKey
  };
  
  saveApiConfiguration(newConfig);
  return newConfig;
}

// Original API Settings functions (preserved for backward compatibility)
export function loadApiSettings(): ApiSettings {
  try {
    // Load from localStorage using legacy keys
    const savedApiKey = localStorage.getItem(LEGACY_API_KEY) || '';
    const savedBaseUrl = localStorage.getItem(LEGACY_BASE_URL);
    
    // Update global variables for backward compatibility
    apiKey = savedApiKey;
    if (savedBaseUrl) {
      apiBaseUrl = savedBaseUrl;
    }
    
    // Return as ApiSettings object
    return {
      apiKey: savedApiKey,
      apiBaseUrl: savedBaseUrl || defaultApiSettings.apiBaseUrl
    };
  } catch (error) {
    console.error('Failed to load API settings:', error);
    return { ...defaultApiSettings };
  }
}

// For internal migration use
function loadApiSettingsLegacy(): ApiSettings {
  return loadApiSettings();
}

export function saveApiSettings(settings: ApiSettings): void {
  // Create a configuration object from the simple settings - using operatorX02 as default
  const config: ApiConfiguration = {
    ...DEFAULT_PROVIDER_CONFIGS.operatorX02, // Changed from deepseek to operatorX02
    apiKey: settings.apiKey,
    apiBaseUrl: settings.apiBaseUrl || defaultApiSettings.apiBaseUrl
  };
  
  saveApiConfiguration(config);
}

// Legacy function for backward compatibility (preserved exactly)
export function saveApiSettingsLegacy(newApiKey: string, newBaseUrl: string): void {
  const settings: ApiSettings = {
    apiKey: newApiKey,
    apiBaseUrl: newBaseUrl || apiBaseUrl
  };
  saveApiSettings(settings);
}

// Enhanced provider utilities (updated with operatorX02)
export function getProviderDisplayName(provider: ApiProvider): string {
  const names: Record<ApiProvider, string> = {
    operatorX02: 'OperatorX02 (Free)',  // Added "(Free)" tag
    deepseek: 'Deepseek AI',
    claude: 'Claude (Anthropic)',
    openai: 'OpenAI',
    gemini: 'Google Gemini',
    cohere: 'Cohere',
    custom: 'Custom Provider'
  };
  return names[provider] || provider;
}

export function getProviderModels(provider: ApiProvider): string[] {
  const models: Record<ApiProvider, string[]> = {
    operatorX02: ['operatorx02-coder', 'operatorx02-analyzer', 'operatorx02-chat'],  // TODO: Update with your actual models
    deepseek: ['deepseek-coder', 'deepseek-chat', 'deepseek-code-6.7b-instruct'],
    claude: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini'],
    gemini: ['gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-pro-vision'],
    cohere: ['command-r-plus', 'command-r', 'command', 'command-light'],
    custom: []
  };
  return models[provider] || [];
}

export function validateApiConfiguration(config: Partial<ApiConfiguration>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.provider) {
    errors.push('Provider is required');
  }

  if (!config.apiKey || config.apiKey.trim() === '') {
    errors.push('API key is required');
  }

  if (!config.apiBaseUrl || config.apiBaseUrl.trim() === '') {
    errors.push('API base URL is required');
  }

  if (!config.model || config.model.trim() === '') {
    errors.push('Model name is required');
  }

  if (config.maxTokens && (config.maxTokens < 1 || config.maxTokens > 32000)) {
    errors.push('Max tokens must be between 1 and 32000');
  }

  if (config.temperature && (config.temperature < 0 || config.temperature > 2)) {
    errors.push('Temperature must be between 0 and 2');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function isApiConfigured(): boolean {
  return !!(currentApiConfiguration.apiKey && 
           currentApiConfiguration.apiBaseUrl && 
           currentApiConfiguration.model);
}

// Original conversation persistence functions (preserved exactly)
export function loadConversations(): void {
  try {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      const parsed = JSON.parse(savedConversations);
      
      // ✅ FIX: Backfill missing date fields from message timestamps
      // Also normalize ISO string dates to numeric timestamps
      let needsResave = false;
      for (const conv of parsed) {
        // Normalize ISO string dates to numbers (e.g. "2026-02-08T..." → 1738...)
        if (typeof conv.createdAt === 'string') {
          const parsed = new Date(conv.createdAt).getTime();
          conv.createdAt = isNaN(parsed) ? undefined : parsed;
          needsResave = true;
        }
        if (typeof conv.lastUpdated === 'string') {
          const parsed = new Date(conv.lastUpdated).getTime();
          conv.lastUpdated = isNaN(parsed) ? undefined : parsed;
          needsResave = true;
        }
        
        // Derive dates from message timestamps if missing
        if (!conv.createdAt || !conv.lastUpdated) {
          let earliest = Infinity;
          let latest = 0;
          if (conv.messages?.length) {
            for (const msg of conv.messages) {
              if (msg.timestamp) {
                if (msg.timestamp < earliest) earliest = msg.timestamp;
                if (msg.timestamp > latest) latest = msg.timestamp;
              }
            }
          }
          if (!conv.createdAt) {
            conv.createdAt = earliest !== Infinity ? earliest : Date.now();
            needsResave = true;
          }
          if (!conv.lastUpdated) {
            conv.lastUpdated = latest > 0 ? latest : conv.createdAt;
            needsResave = true;
          }
        }
        
        // Ensure lastUpdated is at least as recent as the latest message
        if (conv.messages?.length) {
          const lastMsg = conv.messages[conv.messages.length - 1];
          if (lastMsg?.timestamp && lastMsg.timestamp > conv.lastUpdated) {
            conv.lastUpdated = lastMsg.timestamp;
            needsResave = true;
          }
        }
      }
      
      conversations = parsed;
      
      // Persist the backfilled dates so this only runs once
      if (needsResave) {
        localStorage.setItem('conversations', JSON.stringify(conversations));
        console.log('📅 [DateFix] Backfilled conversation dates in state.ts');
      }
    }
  } catch (error) {
    console.error('Failed to load conversations:', error);
  }
}

export function saveConversations(): void {
  localStorage.setItem('conversations', JSON.stringify(conversations));
}

export function loadCurrentConversationId(): void {
  try {
    const savedCurrentId = localStorage.getItem('currentConversationId');
    if (savedCurrentId) {
      currentConversationId = savedCurrentId;
    }
  } catch (error) {
    console.error('Failed to load current conversation ID:', error);
  }
}

export function saveCurrentConversationId(): void {
  if (currentConversationId) {
    localStorage.setItem('currentConversationId', currentConversationId);
  } else {
    localStorage.removeItem('currentConversationId');
  }
}

// Enhanced API settings UI setup (updated with operatorX02 first)
export function setupApiSettingsUI(): void {
  const settingsButton = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  
  if (!settingsButton || !settingsModal) {
    console.error('Settings elements not found');
    return;
  }
  
  // Load current configuration
  const config = loadApiConfiguration();
  
  // Create enhanced settings form
  if (!document.getElementById('api-settings-form')) {
    const modalContent = settingsModal.querySelector('.modal-content') || settingsModal;
    
    const settingsForm = document.createElement('div');
    settingsForm.id = 'api-settings-form';
    settingsForm.innerHTML = `
      <h3>🤖 AI Assistant API Settings</h3>
      
      <div class="form-group">
        <label for="provider-select">AI Provider</label>
        <select id="provider-select" class="form-control">
          <option value="operatorX02" ${config.provider === 'operatorX02' ? 'selected' : ''}>🚀 OperatorX02 AI (Advanced Coding)</option>
          <option value="deepseek" ${config.provider === 'deepseek' ? 'selected' : ''}>🔥 Deepseek AI (Original)</option>
          <option value="claude" ${config.provider === 'claude' ? 'selected' : ''}>🧠 Claude (Anthropic)</option>
          <option value="openai" ${config.provider === 'openai' ? 'selected' : ''}>⚡ OpenAI (GPT-4)</option>
          <option value="gemini" ${config.provider === 'gemini' ? 'selected' : ''}>✨ Google Gemini</option>
          <option value="cohere" ${config.provider === 'cohere' ? 'selected' : ''}>💫 Cohere</option>
          <option value="custom" ${config.provider === 'custom' ? 'selected' : ''}>⚙️ Custom Provider</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="api-key">API Key</label>
        <div class="input-group">
          <input type="password" id="api-key" class="form-control" 
                 value="${config.apiKey}" placeholder="Enter your API key">
          <button type="button" id="toggle-key-visibility" class="btn btn-outline">👁️</button>
        </div>
      </div>
      
      <div class="form-group">
        <label for="api-base-url">API Base URL</label>
        <input type="text" id="api-base-url" class="form-control" 
               value="${config.apiBaseUrl}" placeholder="https://api.example.com/v1">
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="model-select">Model</label>
          <input type="text" id="model-select" class="form-control" 
                 value="${config.model}" placeholder="Model name">
        </div>
        <div class="form-group">
          <label for="max-tokens">Max Tokens</label>
          <input type="number" id="max-tokens" class="form-control" 
                 value="${config.maxTokens}" min="100" max="32000">
        </div>
      </div>
      
      <div class="form-group">
        <label for="temperature">Temperature: <span id="temp-value">${config.temperature}</span></label>
        <input type="range" id="temperature" class="form-range" 
               value="${config.temperature}" min="0" max="2" step="0.1">
      </div>
      
      <div class="provider-info" id="provider-info"></div>
      
      <div class="button-group">
        <button id="test-connection" class="btn btn-secondary">🔍 Test Connection</button>
        <button id="save-api-settings" class="btn btn-primary">💾 Save Settings</button>
      </div>
      
      <div id="test-result" class="test-result" style="display: none;"></div>
    `;
    
    modalContent.appendChild(settingsForm);
    
    // Setup enhanced event listeners
    setupEnhancedSettingsEventListeners();
    updateProviderInfo(config.provider);
  }
}

function setupEnhancedSettingsEventListeners(): void {
  // Provider selection change
  const providerSelect = document.getElementById('provider-select') as HTMLSelectElement;
  providerSelect?.addEventListener('change', () => {
    const provider = providerSelect.value as ApiProvider;
    const defaultConfig = DEFAULT_PROVIDER_CONFIGS[provider];
    
    // Update form fields with provider defaults
    const baseUrlInput = document.getElementById('api-base-url') as HTMLInputElement;
    const modelInput = document.getElementById('model-select') as HTMLInputElement;
    
    if (baseUrlInput) baseUrlInput.value = defaultConfig.apiBaseUrl;
    if (modelInput) modelInput.value = defaultConfig.model;
    
    updateProviderInfo(provider);
  });
  
  // API key visibility toggle
  const toggleBtn = document.getElementById('toggle-key-visibility');
  const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
  
  toggleBtn?.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    toggleBtn.textContent = isPassword ? '🙈' : '👁️';
  });
  
  // Temperature slider
  const tempSlider = document.getElementById('temperature') as HTMLInputElement;
  const tempValue = document.getElementById('temp-value');
  
  tempSlider?.addEventListener('input', () => {
    if (tempValue) tempValue.textContent = tempSlider.value;
  });
  
  // Test connection
  const testBtn = document.getElementById('test-connection');
  testBtn?.addEventListener('click', testConnection);
  
  // Save settings (enhanced)
  const saveButton = document.getElementById('save-api-settings');
  saveButton?.addEventListener('click', () => {
    const providerSelect = document.getElementById('provider-select') as HTMLSelectElement;
    const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
    const apiBaseUrlInput = document.getElementById('api-base-url') as HTMLInputElement;
    const modelInput = document.getElementById('model-select') as HTMLInputElement;
    const maxTokensInput = document.getElementById('max-tokens') as HTMLInputElement;
    const temperatureInput = document.getElementById('temperature') as HTMLInputElement;
    
    const newConfig: ApiConfiguration = {
      provider: providerSelect.value as ApiProvider,
      apiKey: apiKeyInput.value,
      apiBaseUrl: apiBaseUrlInput.value || DEFAULT_PROVIDER_CONFIGS[providerSelect.value as ApiProvider].apiBaseUrl,
      model: modelInput.value,
      maxTokens: parseInt(maxTokensInput.value) || 4000,
      temperature: parseFloat(temperatureInput.value) || 0.7
    };
    
    // Validate configuration
    const validation = validateApiConfiguration(newConfig);
    if (!validation.isValid) {
      alert('Configuration errors:\n' + validation.errors.join('\n'));
      return;
    }
    
    saveApiConfiguration(newConfig);
    
    // Hide modal
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal instanceof HTMLElement) {
      settingsModal.style.display = 'none';
    }
    
    // Show success notification
    showNotification(`Switched to ${getProviderDisplayName(newConfig.provider)}! Settings saved successfully.`);
  });
}

function updateProviderInfo(provider: ApiProvider): void {
  const infoPanel = document.getElementById('provider-info');
  if (!infoPanel) return;

  const providerInfos: Record<ApiProvider, string> = {
    operatorX02: `
      <div class="provider-details">
        <p><strong>🚀 OperatorX02 AI</strong> - Your advanced AI coding assistant</p>
        <p>Best for: Comprehensive code analysis, intelligent debugging, custom optimizations</p>
        <p>Features: Deep code understanding, advanced error detection, tailored responses</p>
        <p>Custom API with enhanced capabilities for your specific needs</p>
      </div>
    `,
    deepseek: `
      <div class="provider-details">
        <p><strong>🔥 Deepseek AI</strong> - Original Deepseek service</p>
        <p>Best for: General code analysis, debugging, programming help</p>
        <p>Get API key: <a href="https://platform.deepseek.com" target="_blank">platform.deepseek.com</a></p>
      </div>
    `,
    claude: `
      <div class="provider-details">
        <p><strong>🧠 Claude (Anthropic)</strong> - Advanced reasoning</p>
        <p>Best for: Complex analysis, detailed explanations, code review</p>
        <p>Get API key: <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a></p>
      </div>
    `,
    openai: `
      <div class="provider-details">
        <p><strong>⚡ OpenAI</strong> - Popular AI models</p>
        <p>Best for: General coding, creative solutions, broad knowledge</p>
        <p>Get API key: <a href="https://platform.openai.com" target="_blank">platform.openai.com</a></p>
      </div>
    `,
    gemini: `
      <div class="provider-details">
        <p><strong>✨ Google Gemini</strong> - Multimodal AI</p>
        <p>Best for: Complex reasoning, code generation, analysis</p>
        <p>Get API key: <a href="https://makersuite.google.com" target="_blank">makersuite.google.com</a></p>
      </div>
    `,
    cohere: `
      <div class="provider-details">
        <p><strong>💫 Cohere</strong> - Enterprise AI</p>
        <p>Best for: Text generation, summarization, analysis</p>
        <p>Get API key: <a href="https://dashboard.cohere.ai" target="_blank">dashboard.cohere.ai</a></p>
      </div>
    `,
    custom: `
      <div class="provider-details">
        <p><strong>⚙️ Custom Provider</strong> - Your own endpoint</p>
        <p>Use any OpenAI-compatible API, local models, or custom endpoints</p>
      </div>
    `
  };

  infoPanel.innerHTML = providerInfos[provider] || '';
}

async function testConnection(): Promise<void> {
  const testBtn = document.getElementById('test-connection') as HTMLButtonElement;
  const testResult = document.getElementById('test-result');
  
  if (!testBtn || !testResult) return;

  testBtn.disabled = true;
  testBtn.textContent = '🔄 Testing...';
  testResult.style.display = 'block';
  testResult.className = 'test-result testing';
  testResult.textContent = 'Testing connection...';

  try {
    // Get current form values
    const providerSelect = document.getElementById('provider-select') as HTMLSelectElement;
    const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
    const apiBaseUrlInput = document.getElementById('api-base-url') as HTMLInputElement;
    const modelInput = document.getElementById('model-select') as HTMLInputElement;
    
    const testConfig: Partial<ApiConfiguration> = {
      provider: providerSelect.value as ApiProvider,
      apiKey: apiKeyInput.value,
      apiBaseUrl: apiBaseUrlInput.value,
      model: modelInput.value
    };
    
    // Basic validation
    if (!testConfig.apiKey) {
      throw new Error('API key is required');
    }
    
    // Simple test call (you'll need to implement this based on your API client)
    const testMessage = 'Hello! Please respond with "Connection successful!" to test the API.';
    // Note: You'll need to integrate this with your actual API calling function
    
    testResult.className = 'test-result success';
    testResult.innerHTML = `✅ Connection test completed!<br><small>Provider: ${getProviderDisplayName(testConfig.provider!)}</small>`;
  } catch (error) {
    testResult.className = 'test-result error';
    testResult.innerHTML = `❌ Connection failed:<br><small>${error instanceof Error ? error.message : 'Unknown error'}</small>`;
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = '🔍 Test Connection';
  }
}

// Enhanced notification function (enhanced version of your original)
function showNotification(message: string = 'API settings saved successfully', type: 'success' | 'error' | 'info' | 'warning' = 'success'): void {
  // Remove existing notifications to prevent stacking
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notif => notif.remove());

  const notification = document.createElement('div');
  notification.className = `notification notification-${type} slide-in-enhanced`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${getNotificationIcon(type)}</span>
      <span class="notification-message">${message}</span>
    </div>
    <button class="notification-close">×</button>
  `;
  
  document.body.appendChild(notification);
  
  // Enhanced animation
  requestAnimationFrame(() => {
    notification.classList.add('show');
  });
  
  // Close button functionality
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn?.addEventListener('click', () => {
    notification.classList.add('slide-out');
    setTimeout(() => notification.remove(), 300);
  });
  
  // Auto remove after 4 seconds with enhanced animation
  setTimeout(() => {
    if (notification.parentNode) {
      notification.classList.add('slide-out');
      setTimeout(() => notification.remove(), 300);
    }
  }, 4000);
}

function getNotificationIcon(type: 'success' | 'error' | 'info' | 'warning'): string {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  return icons[type];
}

// Helper function to reset to operatorX02 defaults (useful for immediate testing)
export function resetToOperatorX02Default(): void {
  // Clear existing configuration
  localStorage.removeItem(API_CONFIGURATION_KEY);
  localStorage.removeItem(LEGACY_API_KEY);
  localStorage.removeItem(LEGACY_BASE_URL);
  
  // Set new default to operatorX02
  const newConfig: ApiConfiguration = {
    ...DEFAULT_PROVIDER_CONFIGS.operatorX02,
    apiKey: ''
  };
  
  saveApiConfiguration(newConfig);
  
  console.log('Reset to OperatorX02 as default provider');
  showNotification('Reset to OperatorX02 as default provider');
}

// Function to quickly configure your custom operatorX02 API
export function configureOperatorX02(customEndpoint: string, customModel: string, apiKey: string = ''): void {
  // Update the default configuration
  DEFAULT_PROVIDER_CONFIGS.operatorX02 = {
    provider: 'operatorX02',
    apiBaseUrl: customEndpoint,
    model: customModel,
    maxTokens: 4000,
    temperature: 0.7
  };
  
  // Update current configuration
  const newConfig: ApiConfiguration = {
    provider: 'operatorX02',
    apiKey: apiKey,
    apiBaseUrl: customEndpoint,
    model: customModel,
    maxTokens: 4000,
    temperature: 0.7
  };
  
  saveApiConfiguration(newConfig);
  
  // Update legacy variables
  apiBaseUrl = customEndpoint;
  apiKey = apiKey;
  
  console.log(`OperatorX02 configured: ${customEndpoint} with model ${customModel}`);
  showNotification(`OperatorX02 configured with custom endpoint!`);
}

// Enhanced initialization function (enhanced version of your original)
export function initApiSettings(): void {
  // Load API configuration (this will also handle migration to operatorX02)
  const config = loadApiConfiguration();
  console.log(`Loaded API configuration for provider: ${config.provider}`);
  
  // Setup UI
  setupApiSettingsUI();
  
  // Load conversations (preserved from original)
  loadConversations();
  loadCurrentConversationId();
  
  // Show notification if this is first time with operatorX02
  if (config.provider === 'operatorX02' && !config.apiKey) {
    console.log('🎯 Auto-configuring OperatorX02 with Deepseek API...');
    setupOperatorX02WithDeepseek();
  }
}

// Add this function to automatically configure OperatorX02
export function setupOperatorX02WithDeepseek(): void {
  const config: ApiConfiguration = {
    provider: 'operatorX02',
    apiKey: 'sk-9d264acd8e3743e1b4d2dbadf83002cb',
    apiBaseUrl: 'PROXY',
    model: 'deepseek-coder',
    maxTokens: 4000,
    temperature: 0.7
  };
  
  saveApiConfiguration(config);
  console.log('🚀 OperatorX02 permanently configured with Deepseek API');
}

// Initialize on load
initApiSettings();