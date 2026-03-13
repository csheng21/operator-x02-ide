// fileHandlers/ocrProvider.ts - AI Vision OCR Provider Integration
// Supports: Claude Vision, OpenAI GPT-4V, DeepSeek, Replicate (DeepSeek-OCR)

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type OCRProvider = 'auto' | 'claude' | 'openai' | 'deepseek' | 'replicate';

export interface OCROptions {
  provider?: OCRProvider;
  prompt?: string;
  outputFormat?: 'text' | 'markdown' | 'json';
  language?: string;
  preserveLayout?: boolean;
}

export interface OCRResult {
  text: string;
  confidence?: number;
  provider: string;
  processingTime?: number;
}

export interface OCRConfig {
  enableOCR: boolean;
  provider: OCRProvider;
  autoOCRImages: boolean;
  autoOCRScannedPDFs: boolean;
  replicateApiKey?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const OCR_CONFIG_KEY = 'ocrConfig';

const DEFAULT_OCR_CONFIG: OCRConfig = {
  enableOCR: true,
  provider: 'auto',
  autoOCRImages: false,  // Don't auto-OCR images by default (can be enabled)
  autoOCRScannedPDFs: true,  // Auto-OCR scanned PDFs
};

let ocrConfig: OCRConfig = { ...DEFAULT_OCR_CONFIG };

/**
 * Load OCR config from localStorage
 */
export function loadOCRConfig(): OCRConfig {
  try {
    const saved = localStorage.getItem(OCR_CONFIG_KEY);
    if (saved) {
      ocrConfig = { ...DEFAULT_OCR_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load OCR config:', e);
  }
  return ocrConfig;
}

/**
 * Save OCR config to localStorage
 */
export function saveOCRConfig(config: Partial<OCRConfig>): void {
  ocrConfig = { ...ocrConfig, ...config };
  try {
    localStorage.setItem(OCR_CONFIG_KEY, JSON.stringify(ocrConfig));
    console.log('✅ OCR config saved:', ocrConfig);
  } catch (e) {
    console.warn('Failed to save OCR config:', e);
  }
}

/**
 * Get current OCR config
 */
export function getOCRConfig(): OCRConfig {
  return { ...ocrConfig };
}

// Initialize config
loadOCRConfig();

// ============================================================================
// API CONFIGURATION HELPER
// ============================================================================

interface ApiConfig {
  provider: string;
  apiKey: string;
  apiBaseUrl: string;
  model: string;
}

/**
 * Gets the current API configuration from the apiProviderManager
 */
function getCurrentApiConfig(): ApiConfig {
  // Try to get from window (apiProviderManager exposes this)
  const w = window as any;
  
  if (w.getCurrentApiConfigurationForced) {
    return w.getCurrentApiConfigurationForced();
  }
  
  // Try localStorage fallback
  try {
    const saved = localStorage.getItem('apiConfiguration');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    // Ignore
  }
  
  // Default fallback
  return {
    provider: 'deepseek',
    apiKey: '',
    apiBaseUrl: 'PROXY',
    model: 'deepseek-chat'
  };
}

// ============================================================================
// OCR PROMPT BUILDER
// ============================================================================

function buildOCRPrompt(options: OCROptions): string {
  const format = options.outputFormat || 'text';
  const preserveLayout = options.preserveLayout !== false;
  
  let prompt = 'Extract all text from this image/document.';
  
  if (preserveLayout) {
    prompt += ' Preserve the original layout, structure, and formatting as much as possible.';
  }
  
  if (format === 'markdown') {
    prompt += ' Output the result in Markdown format, using appropriate headers, lists, tables, and code blocks where applicable.';
  } else if (format === 'json') {
    prompt += ' Output the result as a JSON object with structured fields.';
  }
  
  if (options.language) {
    prompt += ` The document is in ${options.language}.`;
  }
  
  prompt += ' If there are tables, preserve their structure. If there are code snippets, format them properly.';
  
  return prompt;
}

// ============================================================================
// MAIN OCR FUNCTION
// ============================================================================

/**
 * Performs OCR using AI Vision APIs
 * @param base64Data Base64 encoded image data
 * @param mimeType MIME type of the image
 * @param options OCR options
 * @returns OCR result with extracted text
 */
export async function performAIOCR(
  base64Data: string, 
  mimeType: string, 
  options: OCROptions = {}
): Promise<OCRResult> {
  const startTime = Date.now();
  let provider = options.provider || ocrConfig.provider || 'auto';
  
  // Get current API configuration
  const apiConfig = getCurrentApiConfig();
  
  // Determine which provider to use
  if (provider === 'auto') {
    // Priority: Claude > OpenAI > DeepSeek (based on vision quality)
    if (apiConfig.provider === 'claude' && apiConfig.apiKey) {
      provider = 'claude';
    } else if (apiConfig.provider === 'openai' && apiConfig.apiKey) {
      provider = 'openai';
    } else if (['deepseek', 'operator_x02'].includes(apiConfig.provider)) {
      provider = 'deepseek';
    } else if (ocrConfig.replicateApiKey) {
      provider = 'replicate';
    } else {
      // Fall back to whatever is configured
      provider = apiConfig.provider as OCRProvider;
    }
  }
  
  const prompt = options.prompt || buildOCRPrompt(options);
  
  console.log(`📷 Starting OCR with provider: ${provider}`);
  
  try {
    let text: string;
    
    switch (provider) {
      case 'claude':
        text = await performClaudeOCR(base64Data, mimeType, prompt, apiConfig);
        break;
      case 'openai':
        text = await performOpenAIOCR(base64Data, mimeType, prompt, apiConfig);
        break;
      case 'deepseek':
        text = await performDeepSeekOCR(base64Data, mimeType, prompt, apiConfig);
        break;
      case 'replicate':
        text = await performReplicateOCR(base64Data, mimeType, prompt);
        break;
      default:
        // Try DeepSeek as fallback
        text = await performDeepSeekOCR(base64Data, mimeType, prompt, apiConfig);
        provider = 'deepseek';
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ OCR complete in ${processingTime}ms`);
    
    return {
      text,
      provider,
      processingTime
    };
    
  } catch (error) {
    console.error(`❌ OCR failed with ${provider}:`, error);
    throw error;
  }
}

// ============================================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================================

/**
 * Claude Vision OCR via Tauri backend (CORS bypass)
 */
async function performClaudeOCR(
  base64Data: string, 
  mimeType: string, 
  prompt: string,
  apiConfig: ApiConfig
): Promise<string> {
  console.log('🤖 Calling Claude Vision API via Tauri...');
  
  // Use Tauri backend for Claude API calls (CORS bypass)
  // Parameters must match Rust backend: api_key, model, image_base64, media_type, prompt, max_tokens
  const result = await invoke('call_claude_vision_api', {
    api_key: apiConfig.apiKey,
    model: apiConfig.model || 'claude-sonnet-4-20250514',
    image_base64: base64Data,
    media_type: mimeType,
    prompt: prompt,
    max_tokens: 4096
  });
  
  // Result is a JSON string with the content
  if (typeof result === 'string') {
    try {
      const parsed = JSON.parse(result);
      return parsed.content || parsed.text || result;
    } catch {
      return result;
    }
  }
  return (result as any).content || (result as any).text || String(result);
}

/**
 * OpenAI GPT-4 Vision OCR
 */
async function performOpenAIOCR(
  base64Data: string, 
  mimeType: string, 
  prompt: string,
  apiConfig: ApiConfig
): Promise<string> {
  console.log('🧠 Calling OpenAI Vision API...');
  
  const response = await fetch(`${apiConfig.apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiConfig.apiKey}`
    },
    body: JSON.stringify({
      model: apiConfig.model || 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 4096
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`OpenAI OCR failed: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * DeepSeek Vision OCR (OpenAI-compatible API)
 */
async function performDeepSeekOCR(
  base64Data: string, 
  mimeType: string, 
  prompt: string,
  apiConfig: ApiConfig
): Promise<string> {
  console.log('⚡ Calling DeepSeek Vision API...');
  
  const baseUrl = apiConfig.apiBaseUrl || 'PROXY';
  
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiConfig.apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat', // DeepSeek's vision-capable model
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`
              }
            }
          ]
        }
      ],
      max_tokens: 4096
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`DeepSeek OCR failed: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Replicate DeepSeek-OCR API (specialized OCR model)
 */
async function performReplicateOCR(
  base64Data: string, 
  mimeType: string, 
  prompt: string
): Promise<string> {
  console.log('🔬 Calling Replicate DeepSeek-OCR API...');
  
  const replicateKey = ocrConfig.replicateApiKey || localStorage.getItem('replicate_api_key');
  if (!replicateKey) {
    throw new Error('Replicate API key not configured. Please add it in OCR settings.');
  }
  
  // Create prediction
  const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${replicateKey}`
    },
    body: JSON.stringify({
      version: 'lucataco/deepseek-ocr:latest',
      input: {
        image: `data:${mimeType};base64,${base64Data}`,
        prompt: prompt || 'Free OCR.'
      }
    })
  });
  
  if (!createResponse.ok) {
    const error = await createResponse.json().catch(() => ({}));
    throw new Error(`Replicate OCR failed: ${error.detail || createResponse.statusText}`);
  }
  
  let prediction = await createResponse.json();
  
  // Poll for result
  let attempts = 0;
  const maxAttempts = 60; // 60 seconds max
  
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
    
    const pollResponse = await fetch(prediction.urls.get, {
      headers: { 'Authorization': `Token ${replicateKey}` }
    });
    
    if (!pollResponse.ok) {
      throw new Error('Failed to poll Replicate prediction status');
    }
    
    prediction = await pollResponse.json();
    console.log(`🔬 Replicate OCR status: ${prediction.status} (${attempts}s)`);
  }
  
  if (prediction.status === 'failed') {
    throw new Error(`Replicate OCR failed: ${prediction.error || 'Unknown error'}`);
  }
  
  if (prediction.status !== 'succeeded') {
    throw new Error('Replicate OCR timed out');
  }
  
  return prediction.output || '';
}

// ============================================================================
// OCR SETTINGS UI
// ============================================================================

/**
 * Shows the OCR settings modal
 */
export function showOCRSettingsModal(): void {
  // Remove existing modal
  document.getElementById('ocr-settings-modal')?.remove();
  
  const config = getOCRConfig();
  
  const modal = document.createElement('div');
  modal.id = 'ocr-settings-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100000;
    backdrop-filter: blur(4px);
  `;
  
  modal.innerHTML = `
    <div style="
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 12px;
      width: 450px;
      max-width: 90vw;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    ">
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #3c3c3c;
        background: linear-gradient(135deg, rgba(79, 195, 247, 0.1), transparent);
      ">
        <h3 style="margin: 0; font-size: 16px; color: #e6edf3;">📄 OCR Settings</h3>
        <button id="ocr-close-btn" style="
          background: transparent;
          border: none;
          color: #7d8590;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
        ">×</button>
      </div>
      
      <div style="padding: 20px;">
        <!-- Enable OCR -->
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: rgba(255,255,255,0.03);
          border-radius: 8px;
          margin-bottom: 12px;
        ">
          <div>
            <div style="color: #e6edf3; font-size: 14px;">Enable OCR</div>
            <div style="color: #7d8590; font-size: 11px;">Extract text from images and scanned PDFs</div>
          </div>
          <label style="position: relative; width: 44px; height: 24px;">
            <input type="checkbox" id="ocr-enable" ${config.enableOCR ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
            <span style="
              position: absolute;
              cursor: pointer;
              top: 0; left: 0; right: 0; bottom: 0;
              background-color: ${config.enableOCR ? '#4fc3f7' : '#3c3c3c'};
              transition: 0.3s;
              border-radius: 24px;
            "></span>
          </label>
        </div>
        
        <!-- Auto OCR Scanned PDFs -->
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: rgba(255,255,255,0.03);
          border-radius: 8px;
          margin-bottom: 12px;
        ">
          <div>
            <div style="color: #e6edf3; font-size: 14px;">Auto-OCR Scanned PDFs</div>
            <div style="color: #7d8590; font-size: 11px;">Automatically run OCR on PDFs with little text</div>
          </div>
          <label style="position: relative; width: 44px; height: 24px;">
            <input type="checkbox" id="ocr-auto-pdf" ${config.autoOCRScannedPDFs ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
            <span style="
              position: absolute;
              cursor: pointer;
              top: 0; left: 0; right: 0; bottom: 0;
              background-color: ${config.autoOCRScannedPDFs ? '#4fc3f7' : '#3c3c3c'};
              transition: 0.3s;
              border-radius: 24px;
            "></span>
          </label>
        </div>
        
        <!-- Auto OCR Images -->
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: rgba(255,255,255,0.03);
          border-radius: 8px;
          margin-bottom: 12px;
        ">
          <div>
            <div style="color: #e6edf3; font-size: 14px;">Auto-OCR Images</div>
            <div style="color: #7d8590; font-size: 11px;">Automatically extract text from uploaded images</div>
          </div>
          <label style="position: relative; width: 44px; height: 24px;">
            <input type="checkbox" id="ocr-auto-images" ${config.autoOCRImages ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
            <span style="
              position: absolute;
              cursor: pointer;
              top: 0; left: 0; right: 0; bottom: 0;
              background-color: ${config.autoOCRImages ? '#4fc3f7' : '#3c3c3c'};
              transition: 0.3s;
              border-radius: 24px;
            "></span>
          </label>
        </div>
        
        <!-- Provider Selection -->
        <div style="margin-bottom: 16px;">
          <div style="color: #7d8590; font-size: 12px; margin-bottom: 8px; text-transform: uppercase;">OCR Provider</div>
          <select id="ocr-provider" style="
            width: 100%;
            padding: 10px 12px;
            background: #2d2d2d;
            border: 1px solid #3c3c3c;
            border-radius: 6px;
            color: #e6edf3;
            font-size: 13px;
          ">
            <option value="auto" ${config.provider === 'auto' ? 'selected' : ''}>🔄 Auto (use current AI provider)</option>
            <option value="claude" ${config.provider === 'claude' ? 'selected' : ''}>🤖 Claude Vision</option>
            <option value="openai" ${config.provider === 'openai' ? 'selected' : ''}>🧠 OpenAI GPT-4 Vision</option>
            <option value="deepseek" ${config.provider === 'deepseek' ? 'selected' : ''}>⚡ DeepSeek</option>
            <option value="replicate" ${config.provider === 'replicate' ? 'selected' : ''}>🔬 DeepSeek-OCR (Replicate)</option>
          </select>
        </div>
        
        <!-- Replicate API Key -->
        <div id="replicate-key-section" style="display: ${config.provider === 'replicate' ? 'block' : 'none'};">
          <div style="color: #7d8590; font-size: 12px; margin-bottom: 8px; text-transform: uppercase;">Replicate API Key</div>
          <input type="password" id="replicate-key" value="${config.replicateApiKey || ''}" placeholder="r8_xxxxxxxxxxxxx" style="
            width: 100%;
            padding: 10px 12px;
            background: #2d2d2d;
            border: 1px solid #3c3c3c;
            border-radius: 6px;
            color: #e6edf3;
            font-size: 13px;
            font-family: monospace;
            box-sizing: border-box;
          ">
          <div style="color: #7d8590; font-size: 11px; margin-top: 4px;">
            Get your key from <a href="https://replicate.com/account/api-tokens" target="_blank" style="color: #4fc3f7;">replicate.com</a>
          </div>
        </div>
      </div>
      
      <div style="
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 16px 20px;
        border-top: 1px solid #3c3c3c;
        background: rgba(0,0,0,0.2);
      ">
        <button id="ocr-cancel" style="
          padding: 8px 16px;
          background: #3c3c3c;
          border: 1px solid #4c4c4c;
          border-radius: 6px;
          color: #e6edf3;
          cursor: pointer;
        ">Cancel</button>
        <button id="ocr-save" style="
          padding: 8px 16px;
          background: #4fc3f7;
          border: none;
          border-radius: 6px;
          color: #000;
          cursor: pointer;
          font-weight: 500;
        ">Save Settings</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event handlers
  const closeModal = () => modal.remove();
  
  modal.querySelector('#ocr-close-btn')?.addEventListener('click', closeModal);
  modal.querySelector('#ocr-cancel')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  // Provider change - show/hide Replicate key
  const providerSelect = modal.querySelector('#ocr-provider') as HTMLSelectElement;
  const replicateSection = modal.querySelector('#replicate-key-section') as HTMLElement;
  
  providerSelect?.addEventListener('change', () => {
    if (replicateSection) {
      replicateSection.style.display = providerSelect.value === 'replicate' ? 'block' : 'none';
    }
  });
  
  // Toggle styling
  const setupToggle = (inputId: string) => {
    const input = modal.querySelector(`#${inputId}`) as HTMLInputElement;
    const slider = input?.nextElementSibling as HTMLElement;
    if (input && slider) {
      input.addEventListener('change', () => {
        slider.style.backgroundColor = input.checked ? '#4fc3f7' : '#3c3c3c';
      });
    }
  };
  
  setupToggle('ocr-enable');
  setupToggle('ocr-auto-pdf');
  setupToggle('ocr-auto-images');
  
  // Save
  modal.querySelector('#ocr-save')?.addEventListener('click', () => {
    saveOCRConfig({
      enableOCR: (modal.querySelector('#ocr-enable') as HTMLInputElement).checked,
      autoOCRScannedPDFs: (modal.querySelector('#ocr-auto-pdf') as HTMLInputElement).checked,
      autoOCRImages: (modal.querySelector('#ocr-auto-images') as HTMLInputElement).checked,
      provider: (modal.querySelector('#ocr-provider') as HTMLSelectElement).value as OCRProvider,
      replicateApiKey: (modal.querySelector('#replicate-key') as HTMLInputElement).value || undefined
    });
    closeModal();
  });
}

// ============================================================================
// WINDOW EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).ocrProvider = {
    performAIOCR,
    showOCRSettingsModal,
    getOCRConfig,
    saveOCRConfig
  };
}
