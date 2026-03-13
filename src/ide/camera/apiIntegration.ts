// ============================================================================
// FILE: src/ide/camera/apiIntegration.ts
// DESCRIPTION: Professional API Configuration Modal with SVG Icons
// ============================================================================

// ============================================================================
// CONSTANTS
// ============================================================================

const API_KEY_STORAGE_KEY = 'openai_api_key';
const API_ENDPOINT_STORAGE_KEY = 'camera_api_endpoint';
const CUSTOM_ENDPOINT_STORAGE_KEY = 'camera_custom_endpoint';

// ============================================================================
// API KEY MANAGEMENT - Basic Operations
// ============================================================================

/**
 * Check if API key is configured
 */
export function hasApiKey(): boolean {
  try {
    const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    return apiKey !== null && apiKey.trim().length > 0;
  } catch (error) {
    console.error('Error checking API key:', error);
    return false;
  }
}

/**
 * Get the configured API key
 */
export function getApiKey(): string {
  try {
    const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    return apiKey || '';
  } catch (error) {
    console.error('Error getting API key:', error);
    return '';
  }
}

/**
 * Set the API key
 */
export function setApiKey(apiKey: string): void {
  try {
    if (apiKey && apiKey.trim()) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Error setting API key:', error);
    throw new Error('Failed to save API key');
  }
}

/**
 * Remove the API key
 */
export function removeApiKey(): void {
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Error removing API key:', error);
  }
}

// ============================================================================
// ENDPOINT MANAGEMENT
// ============================================================================

/**
 * Get the configured API endpoint
 */
export function getApiEndpoint(): string {
  try {
    const endpoint = localStorage.getItem(API_ENDPOINT_STORAGE_KEY);
    return endpoint || 'openai';
  } catch (error) {
    console.error('Error getting API endpoint:', error);
    return 'openai';
  }
}

/**
 * Set the API endpoint
 */
export function setApiEndpoint(endpoint: string): void {
  try {
    localStorage.setItem(API_ENDPOINT_STORAGE_KEY, endpoint);
  } catch (error) {
    console.error('Error setting API endpoint:', error);
  }
}

/**
 * Get custom endpoint URL
 */
export function getCustomEndpoint(): string {
  try {
    const endpoint = localStorage.getItem(CUSTOM_ENDPOINT_STORAGE_KEY);
    return endpoint || '';
  } catch (error) {
    console.error('Error getting custom endpoint:', error);
    return '';
  }
}

/**
 * Set custom endpoint URL
 */
export function setCustomEndpoint(endpoint: string): void {
  try {
    localStorage.setItem(CUSTOM_ENDPOINT_STORAGE_KEY, endpoint);
  } catch (error) {
    console.error('Error setting custom endpoint:', error);
  }
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate API key format (basic validation)
 */
export function validateApiKey(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') return false;
  
  const trimmedKey = apiKey.trim();
  
  if (trimmedKey.startsWith('sk-') && trimmedKey.length >= 40) {
    return true;
  }
  
  if (trimmedKey.length >= 20) {
    return true;
  }
  
  return false;
}

/**
 * Internal validation with detailed messages
 */
function validateKey(key: string): { valid: boolean; message: string } {
  if (!key.trim()) {
    return { valid: false, message: '❌ API key cannot be empty' };
  }
  if (key.length < 20) {
    return { valid: false, message: '❌ API key is too short' };
  }
  if (!key.startsWith('sk-')) {
    return { valid: false, message: '⚠️ OpenAI keys usually start with "sk-"' };
  }
  return { valid: true, message: '✅ API key format looks good!' };
}

// ============================================================================
// SVG ICONS LIBRARY
// ============================================================================

const SVG_ICONS = {
  lock: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  `,
  
  key: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
    </svg>
  `,
  
  eye: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  `,
  
  eyeOff: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  `,
  
  close: `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `,
  
  star: `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  `,
  
  image: `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64B5F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
  `,
  
  document: `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64B5F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  `,
  
  code: `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64B5F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
  `,
  
  monitor: `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64B5F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
  `,
  
  save: `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
  `
};

// ============================================================================
// MODAL STYLES
// ============================================================================

const MODAL_STYLES = `
  <style>
    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideIn {
      from { transform: scale(0.95) translateY(-20px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }
    
    @keyframes headerPulse {
      0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
      50% { transform: translate(-20px, -20px) scale(1.1); opacity: 0.6; }
    }
    
    /* Header Section */
    .api-header {
      background: linear-gradient(135deg, #1e5a8e 0%, #2196F3 50%, #1e88e5 100%);
      padding: 28px 32px;
      position: relative;
      overflow: hidden;
    }
    
    .api-header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
      animation: headerPulse 4s ease-in-out infinite;
    }
    
    .api-title-wrapper {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 8px;
      position: relative;
      z-index: 1;
    }
    
    .api-icon-wrapper {
      width: 44px;
      height: 44px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
    }
    
    .api-title {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: white;
      letter-spacing: -0.5px;
    }
    
    .api-subtitle {
      margin: 0;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.85);
      font-weight: 400;
      position: relative;
      z-index: 1;
    }
    
    /* Body Section */
    .api-body {
      padding: 32px;
      background: #1a1a1a;
    }
    
    /* Features Section */
    .features-section {
      background: linear-gradient(135deg, rgba(33, 150, 243, 0.08) 0%, rgba(30, 136, 229, 0.12) 100%);
      border: 1px solid rgba(33, 150, 243, 0.2);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 28px;
    }
    
    .features-title {
      font-size: 11px;
      font-weight: 700;
      color: #64B5F6;
      margin-bottom: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .features-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    
    .feature-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.85);
      font-weight: 500;
    }
    
    .feature-icon {
      width: 32px;
      height: 32px;
      background: rgba(33, 150, 243, 0.15);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    /* Input Section */
    .input-section {
      margin-bottom: 28px;
    }
    
    .input-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #e5e5e5;
      margin-bottom: 10px;
      letter-spacing: 0.2px;
    }
    
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    
    .api-input {
      width: 100%;
      padding: 14px 50px 14px 46px;
      background: rgba(255, 255, 255, 0.04);
      border: 1.5px solid rgba(255, 255, 255, 0.12);
      color: #ffffff;
      border-radius: 10px;
      font-size: 14px;
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      letter-spacing: 0.3px;
    }
    
    .api-input:focus {
      outline: none;
      border-color: #2196F3;
      background: rgba(33, 150, 243, 0.08);
      box-shadow: 0 0 0 4px rgba(33, 150, 243, 0.15);
    }
    
    .api-input::placeholder {
      color: rgba(255, 255, 255, 0.3);
    }
    
    .input-icon-left {
      position: absolute;
      left: 16px;
      pointer-events: none;
      opacity: 0.5;
    }
    
    .toggle-btn {
      position: absolute;
      right: 14px;
      background: rgba(255, 255, 255, 0.08);
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .toggle-btn:hover {
      background: rgba(33, 150, 243, 0.2);
      color: #2196F3;
    }
    
    /* Help Text */
    .help-text {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 10px;
      line-height: 1.6;
    }
    
    .help-text a {
      color: #64B5F6;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s ease;
    }
    
    .help-text a:hover {
      color: #42A5F5;
      text-decoration: underline;
    }
    
    /* Validation Messages */
    .validation {
      font-size: 12px;
      margin-top: 10px;
      padding: 10px 14px;
      border-radius: 8px;
      display: none;
      font-weight: 500;
    }
    
    .validation-error {
      background: rgba(244, 67, 54, 0.12);
      border: 1px solid rgba(244, 67, 54, 0.3);
      color: #ff6b6b;
    }
    
    .validation-success {
      background: rgba(76, 175, 80, 0.12);
      border: 1px solid rgba(76, 175, 80, 0.3);
      color: #81c784;
    }
    
    /* Action Buttons */
    .actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 28px;
    }
    
    .btn {
      padding: 12px 28px;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      letter-spacing: 0.3px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .btn-cancel {
      background: rgba(255, 255, 255, 0.06);
      color: rgba(255, 255, 255, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .btn-cancel:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      transform: translateY(-1px);
    }
    
    .btn-save {
      background: linear-gradient(135deg, #1e88e5 0%, #2196F3 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(33, 150, 243, 0.35);
    }
    
    .btn-save:hover {
      box-shadow: 0 6px 20px rgba(33, 150, 243, 0.45);
      transform: translateY(-2px);
    }
    
    .btn-save:active {
      transform: translateY(0);
    }
    
    /* Close Button */
    .close-btn {
      position: absolute;
      top: 24px;
      right: 24px;
      background: rgba(255, 255, 255, 0.12);
      border: none;
      color: white;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 2;
    }
    
    .close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: rotate(90deg);
    }
  </style>
`;

// ============================================================================
// MODAL HTML TEMPLATE
// ============================================================================

function getModalHTML(): string {
  return `
    ${MODAL_STYLES}

    <div class="api-header">
      <button class="close-btn" id="close-modal-btn">
        ${SVG_ICONS.close}
      </button>
      
      <div class="api-title-wrapper">
        <div class="api-icon-wrapper">
          ${SVG_ICONS.lock}
        </div>
        <h2 class="api-title">API Configuration</h2>
      </div>
      <p class="api-subtitle">Enable AI-powered camera features</p>
    </div>

    <div class="api-body">
      <div class="features-section">
        <div class="features-title">
          ${SVG_ICONS.star}
          ENABLED FEATURES
        </div>
        <div class="features-grid">
          <div class="feature-item">
            <div class="feature-icon">
              ${SVG_ICONS.image}
            </div>
            <span>Image Analysis</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon">
              ${SVG_ICONS.document}
            </div>
            <span>OCR Text Extract</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon">
              ${SVG_ICONS.code}
            </div>
            <span>Code Detection</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon">
              ${SVG_ICONS.monitor}
            </div>
            <span>UI Analysis</span>
          </div>
        </div>
      </div>

      <form id="api-form">
        <div class="input-section">
          <label class="input-label" for="api-input">
            OpenAI API Key
          </label>
          <div class="input-wrapper">
            <div class="input-icon-left">
              ${SVG_ICONS.key}
            </div>
            <input 
              type="password" 
              id="api-input" 
              class="api-input"
              placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx"
              autocomplete="off"
              spellcheck="false"
            />
            <button type="button" class="toggle-btn" id="toggle-btn">
              ${SVG_ICONS.eye}
            </button>
          </div>
          <div class="help-text">
            Don't have an API key? Get one from 
            <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a>
          </div>
          <div id="validation" class="validation"></div>
        </div>

        <div class="actions">
          <button type="button" class="btn btn-cancel" id="cancel-btn">
            Cancel
          </button>
          <button type="submit" class="btn btn-save" id="save-btn">
            ${SVG_ICONS.save}
            Save API Key
          </button>
        </div>
      </form>
    </div>
  `;
}

// ============================================================================
// MODAL EVENT HANDLERS
// ============================================================================

function setupModalEventHandlers(
  modal: HTMLElement,
  form: HTMLFormElement,
  input: HTMLInputElement,
  toggleBtn: HTMLButtonElement,
  cancelBtn: HTMLButtonElement,
  closeBtn: HTMLButtonElement,
  validationMsg: HTMLElement
): void {
  
  // Load existing key
  const existingKey = getApiKey();
  if (existingKey) {
    input.value = existingKey;
    input.placeholder = 'Current key is configured';
  }

  // Toggle password visibility with SVG update
  let isVisible = false;
  toggleBtn.addEventListener('click', () => {
    isVisible = !isVisible;
    input.type = isVisible ? 'text' : 'password';
    toggleBtn.innerHTML = isVisible ? SVG_ICONS.eyeOff : SVG_ICONS.eye;
  });

  // Real-time validation
  input.addEventListener('input', () => {
    const result = validateKey(input.value);
    validationMsg.style.display = 'block';
    validationMsg.textContent = result.message;
    validationMsg.className = `validation ${result.valid ? 'validation-success' : 'validation-error'}`;
  });

  // Form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const apiKey = input.value.trim();
    const validation = validateKey(apiKey);
    
    if (!validation.valid) {
      validationMsg.style.display = 'block';
      validationMsg.className = 'validation validation-error';
      validationMsg.textContent = validation.message;
      input.focus();
      return;
    }

    try {
      setApiKey(apiKey);
      validationMsg.style.display = 'block';
      validationMsg.className = 'validation validation-success';
      validationMsg.textContent = '✅ API key saved successfully!';
      
      setTimeout(() => {
        modal.remove();
        
        // Try to show notification if available
        try {
          if (typeof (window as any).showNotification === 'function') {
            (window as any).showNotification('success', 'API Settings', 'API key configured!');
          }
        } catch {}
        
        // Try to update button states if available
        try {
          if (typeof (window as any).updateButtonStates === 'function') {
            (window as any).updateButtonStates();
          }
        } catch {}
      }, 1000);
    } catch (error: any) {
      validationMsg.style.display = 'block';
      validationMsg.className = 'validation validation-error';
      validationMsg.textContent = `❌ Failed to save: ${error.message}`;
    }
  });

  // Close handlers
  const closeModal = () => modal.remove();
  cancelBtn.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  
  // Escape key handler
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Auto-focus input
  setTimeout(() => {
    input.focus();
    if (existingKey) input.select();
  }, 150);
}

// ============================================================================
// MAIN MODAL FUNCTION
// ============================================================================

/**
 * Show professional API key configuration modal with SVG icons
 */
export function showApiKeyModal(): void {
  // Remove existing modal
  const existingModal = document.getElementById('api-settings-modal');
  if (existingModal) existingModal.remove();

  // Create modal overlay
  const modal = document.createElement('div');
  modal.id = 'api-settings-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    animation: fadeIn 0.2s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  `;

  // Create modal content
  const content = document.createElement('div');
  content.style.cssText = `
    background: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    max-width: 540px;
    width: 90%;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
    overflow: hidden;
    animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  // Set HTML content
  content.innerHTML = getModalHTML();
  modal.appendChild(content);
  document.body.appendChild(modal);

  // Get DOM elements
  const form = document.getElementById('api-form') as HTMLFormElement;
  const input = document.getElementById('api-input') as HTMLInputElement;
  const toggleBtn = document.getElementById('toggle-btn') as HTMLButtonElement;
  const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
  const closeBtn = document.getElementById('close-modal-btn') as HTMLButtonElement;
  const validationMsg = document.getElementById('validation') as HTMLElement;

  // Setup all event handlers
  setupModalEventHandlers(modal, form, input, toggleBtn, cancelBtn, closeBtn, validationMsg);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize API settings - call this when your app starts
 */
export function initializeApiSettings(): void {
  if (!hasApiKey()) {
    console.log('OpenAI API key not configured. Camera AI features will not work until configured.');
  }
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

if (typeof window !== 'undefined') {
  setTimeout(initializeApiSettings, 1000);
  // Make function globally available
  (window as any).showApiKeyModal = showApiKeyModal;
}

// ============================================================================
// END OF FILE
// ============================================================================