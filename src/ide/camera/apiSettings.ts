// src/ide/camera/apiSettings.ts - Fix missing export

/**
 * API settings for camera integration with external services
 */

import { showNotification } from '../layout';

// Secure storage key for the API key
const API_KEY_STORAGE_KEY = 'deepseek_camera_api_key';

/**
 * Initialize API settings UI
 * This adds an API settings button to the camera panel
 */
export function initializeApiSettings(cameraPanel: HTMLElement) {
  // Add API settings button to the camera panel header
  const panelHeader = cameraPanel.querySelector('.panel-header');
  const actionsContainer = panelHeader?.querySelector('.panel-actions');
  
  if (actionsContainer) {
    // Create API settings button
    const apiSettingsBtn = document.createElement('button');
    apiSettingsBtn.className = 'icon-button';
    apiSettingsBtn.id = 'api-settings-btn';
    apiSettingsBtn.title = 'API Settings';
    apiSettingsBtn.innerHTML = '⚙️';
    apiSettingsBtn.style.marginRight = '5px';
    
    // Add click handler
    apiSettingsBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent panel collapse
      showApiSettingsModal();
    });
    
    // Add to panel
    actionsContainer.insertBefore(apiSettingsBtn, actionsContainer.firstChild);
  }
}

/**
 * Show API settings modal - EXPORT THIS FUNCTION so it can be called from other files
 */
export function showApiSettingsModal() {
  // Remove any existing modal
  const existingModal = document.getElementById('api-settings-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create modal container
  const modal = document.createElement('div');
  modal.id = 'api-settings-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '9999';
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'api-settings-content';
  modalContent.style.backgroundColor = 'var(--bg-color, #1e1e1e)';
  modalContent.style.borderRadius = '5px';
  modalContent.style.padding = '20px';
  modalContent.style.width = '400px';
  modalContent.style.maxWidth = '90%';
  modalContent.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
  modalContent.style.position = 'relative';
  
  // Add title
  const title = document.createElement('h2');
  title.textContent = 'API Settings';
  title.style.margin = '0 0 15px 0';
  title.style.padding = '0 0 10px 0';
  title.style.borderBottom = '1px solid var(--border-color, #333)';
  title.style.color = 'var(--title-color, #e1e1e1)';
  modalContent.appendChild(title);
  
  // Add API description
  const description = document.createElement('p');
  description.textContent = 'Enter your API key to enable advanced image processing features for camera integration.';
  description.style.margin = '0 0 15px 0';
  description.style.color = 'var(--text-color, #ccc)';
  modalContent.appendChild(description);
  
  // Create form
  const form = document.createElement('form');
  form.onsubmit = (e) => {
    e.preventDefault();
    saveApiKey();
  };
  
  // API Key input
  const inputGroup = document.createElement('div');
  inputGroup.style.marginBottom = '15px';
  
  const inputLabel = document.createElement('label');
  inputLabel.textContent = 'API Key';
  inputLabel.htmlFor = 'api-key';
  inputLabel.style.display = 'block';
  inputLabel.style.marginBottom = '5px';
  inputLabel.style.fontWeight = 'bold';
  inputLabel.style.color = 'var(--label-color, #e1e1e1)';
  
  const apiKeyInput = document.createElement('input');
  apiKeyInput.type = 'password';
  apiKeyInput.id = 'api-key';
  apiKeyInput.className = 'form-control';
  apiKeyInput.placeholder = 'Enter your API key';
  apiKeyInput.style.width = '100%';
  apiKeyInput.style.padding = '8px 10px';
  apiKeyInput.style.backgroundColor = 'var(--input-bg, #252525)';
  apiKeyInput.style.color = 'var(--input-color, #e1e1e1)';
  apiKeyInput.style.border = '1px solid var(--input-border, #3c3c3c)';
  apiKeyInput.style.borderRadius = '3px';
  apiKeyInput.style.fontSize = '14px';
  
  // Set current value if exists
  const currentApiKey = getApiKey();
  if (currentApiKey) {
    apiKeyInput.value = currentApiKey;
  }
  
  // Show password toggle
  const toggleContainer = document.createElement('div');
  toggleContainer.style.display = 'flex';
  toggleContainer.style.alignItems = 'center';
  toggleContainer.style.marginTop = '5px';
  
  const showPasswordCheckbox = document.createElement('input');
  showPasswordCheckbox.type = 'checkbox';
  showPasswordCheckbox.id = 'show-password';
  showPasswordCheckbox.style.marginRight = '5px';
  
  showPasswordCheckbox.addEventListener('change', () => {
    apiKeyInput.type = showPasswordCheckbox.checked ? 'text' : 'password';
  });
  
  const showPasswordLabel = document.createElement('label');
  showPasswordLabel.htmlFor = 'show-password';
  showPasswordLabel.textContent = 'Show API key';
  showPasswordLabel.style.fontSize = '12px';
  showPasswordLabel.style.color = 'var(--text-color, #ccc)';
  
  toggleContainer.appendChild(showPasswordCheckbox);
  toggleContainer.appendChild(showPasswordLabel);
  
  // Build input group
  inputGroup.appendChild(inputLabel);
  inputGroup.appendChild(apiKeyInput);
  inputGroup.appendChild(toggleContainer);
  form.appendChild(inputGroup);
  
  // API endpoint selection (for future expansion)
  const endpointGroup = document.createElement('div');
  endpointGroup.style.marginBottom = '15px';
  
  const endpointLabel = document.createElement('label');
  endpointLabel.textContent = 'API Service';
  endpointLabel.htmlFor = 'api-endpoint';
  endpointLabel.style.display = 'block';
  endpointLabel.style.marginBottom = '5px';
  endpointLabel.style.fontWeight = 'bold';
  endpointLabel.style.color = 'var(--label-color, #e1e1e1)';
  
  const endpointSelect = document.createElement('select');
  endpointSelect.id = 'api-endpoint';
  endpointSelect.className = 'form-control';
  endpointSelect.style.width = '100%';
  endpointSelect.style.padding = '8px 10px';
  endpointSelect.style.backgroundColor = 'var(--input-bg, #252525)';
  endpointSelect.style.color = 'var(--input-color, #e1e1e1)';
  endpointSelect.style.border = '1px solid var(--input-border, #3c3c3c)';
  endpointSelect.style.borderRadius = '3px';
  endpointSelect.style.fontSize = '14px';
  
  // Add options
  const endpoints = [
    { value: 'default', label: 'Default Image API' },
    { value: 'openai', label: 'OpenAI Vision API' },
    { value: 'google', label: 'Google Cloud Vision' },
    { value: 'custom', label: 'Custom Endpoint' }
  ];
  
  endpoints.forEach(endpoint => {
    const option = document.createElement('option');
    option.value = endpoint.value;
    option.textContent = endpoint.label;
    endpointSelect.appendChild(option);
  });
  
  // Set initial selection (to be improved with actual storage)
  endpointSelect.value = localStorage.getItem('camera_api_endpoint') || 'default';
  
  // Custom endpoint input (hidden by default)
  const customEndpointContainer = document.createElement('div');
  customEndpointContainer.id = 'custom-endpoint-container';
  customEndpointContainer.style.marginTop = '10px';
  customEndpointContainer.style.display = 'none';
  
  const customEndpointInput = document.createElement('input');
  customEndpointInput.type = 'text';
  customEndpointInput.id = 'custom-endpoint';
  customEndpointInput.className = 'form-control';
  customEndpointInput.placeholder = 'https://api.example.com/v1/vision';
  customEndpointInput.style.width = '100%';
  customEndpointInput.style.padding = '8px 10px';
  customEndpointInput.style.backgroundColor = 'var(--input-bg, #252525)';
  customEndpointInput.style.color = 'var(--input-color, #e1e1e1)';
  customEndpointInput.style.border = '1px solid var(--input-border, #3c3c3c)';
  customEndpointInput.style.borderRadius = '3px';
  customEndpointInput.style.fontSize = '14px';
  
  // Set current value if exists
  const currentEndpoint = localStorage.getItem('camera_custom_endpoint');
  if (currentEndpoint) {
    customEndpointInput.value = currentEndpoint;
  }
  
  // Show/hide custom endpoint input based on selection
  endpointSelect.addEventListener('change', () => {
    customEndpointContainer.style.display = endpointSelect.value === 'custom' ? 'block' : 'none';
    localStorage.setItem('camera_api_endpoint', endpointSelect.value);
  });
  
  // Show if custom endpoint is selected
  if (endpointSelect.value === 'custom') {
    customEndpointContainer.style.display = 'block';
  }
  
  customEndpointContainer.appendChild(customEndpointInput);
  
  // Build endpoint group
  endpointGroup.appendChild(endpointLabel);
  endpointGroup.appendChild(endpointSelect);
  endpointGroup.appendChild(customEndpointContainer);
  form.appendChild(endpointGroup);
  
  // Add buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.justifyContent = 'flex-end';
  buttonsContainer.style.gap = '10px';
  buttonsContainer.style.marginTop = '20px';
  
  // Cancel button
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.className = 'btn btn-secondary';
  cancelButton.style.padding = '6px 12px';
  cancelButton.style.backgroundColor = 'var(--btn-secondary-bg, #3c3c3c)';
  cancelButton.style.color = 'var(--btn-secondary-color, #e1e1e1)';
  cancelButton.style.border = 'none';
  cancelButton.style.borderRadius = '3px';
  cancelButton.style.cursor = 'pointer';
  
  cancelButton.addEventListener('click', () => {
    modal.remove();
  });
  
  // Save button
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.type = 'submit';
  saveButton.className = 'btn btn-primary';
  saveButton.style.padding = '6px 12px';
  saveButton.style.backgroundColor = 'var(--btn-primary-bg, #0e639c)';
  saveButton.style.color = 'var(--btn-primary-color, #ffffff)';
  saveButton.style.border = 'none';
  saveButton.style.borderRadius = '3px';
  saveButton.style.cursor = 'pointer';
  
  // Add buttons to container
  buttonsContainer.appendChild(cancelButton);
  buttonsContainer.appendChild(saveButton);
  
  // Add form to modal
  form.appendChild(buttonsContainer);
  modalContent.appendChild(form);
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '10px';
  closeButton.style.right = '10px';
  closeButton.style.backgroundColor = 'transparent';
  closeButton.style.border = 'none';
  closeButton.style.color = 'var(--close-btn-color, #999)';
  closeButton.style.fontSize = '20px';
  closeButton.style.cursor = 'pointer';
  
  closeButton.addEventListener('click', () => {
    modal.remove();
  });
  
  modalContent.appendChild(closeButton);
  
  // Add modal to document
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // Auto-focus API key input
  setTimeout(() => {
    apiKeyInput.focus();
  }, 100);
  
  // Function to save the API key
  function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    const endpoint = endpointSelect.value;
    const customEndpoint = customEndpointInput.value.trim();
    
    // Save API key securely
    if (apiKey) {
      setApiKey(apiKey);
    } else {
      // If empty, clear the API key
      clearApiKey();
    }
    
    // Save endpoint settings
    localStorage.setItem('camera_api_endpoint', endpoint);
    if (endpoint === 'custom' && customEndpoint) {
      localStorage.setItem('camera_custom_endpoint', customEndpoint);
    }
    
    // Show success notification
    showNotification('success', 'API Settings', 'API settings saved successfully');
    
    // Close modal
    modal.remove();
  }
}

/**
 * Get the stored API key
 */
export function getApiKey(): string | null {
  // Try to get from sessionStorage first (more secure, but lost on page refresh)
  let apiKey = sessionStorage.getItem(API_KEY_STORAGE_KEY);
  
  // If not in sessionStorage, try localStorage
  if (!apiKey) {
    apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    
    // If found in localStorage, move to sessionStorage for better security
    if (apiKey) {
      sessionStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
      // Optional: Clear from localStorage for added security
      // localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }
  
  return apiKey;
}

/**
 * Set the API key
 */
export function setApiKey(apiKey: string): void {
  // Store in sessionStorage (more secure)
  sessionStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  
  // Also store in localStorage to persist across page refreshes
  // In a production app, consider more secure storage options
  localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
}

/**
 * Clear the stored API key
 */
export function clearApiKey(): void {
  sessionStorage.removeItem(API_KEY_STORAGE_KEY);
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

/**
 * Check if API key is configured
 */
export function hasApiKey(): boolean {
  return !!getApiKey();
}