// eventHandlers/modalEvents.ts - Contains event handlers for modals

import { 
  settingsButton, 
  settingsModal, 
  closeModalButton, 
  saveApiKeyButton,
  apiKeyInput,
  apiBaseUrlInput
} from '../ui';

import { saveApiSettings } from '../state';
import { getDomElement } from './domUtils';

// Set up modal event listeners
export function setupModalEventListeners(): void {
  console.log('Setting up modal event listeners...');
  
  // Settings button
  setupSettingsButtonHandler();
  
  // Close modal button
  setupCloseModalHandler();
  
  // Close modal when clicking outside
  setupOutsideClickHandler();
  
  // Save API key button
  setupSaveApiKeyHandler();
  
  console.log('Modal event listeners set up successfully');
}

// Set up settings button handler
function setupSettingsButtonHandler(): void {
  const settingsModalElement = getDomElement('settings-modal');
  
  const handler = () => {
    console.log('Settings button clicked');
    
    // Try UI reference first
    if (settingsModal) {
      settingsModal.style.display = 'block';
      return;
    }
    
    // Fall back to direct DOM query
    if (settingsModalElement instanceof HTMLElement) {
      settingsModalElement.style.display = 'block';
    }
  };
  
  // Try UI reference first
  if (settingsButton) {
    settingsButton.addEventListener('click', handler);
    console.log('Settings button handler set up (using UI reference)');
    return;
  }
  
  // Fall back to direct DOM query
  const settingsBtn = getDomElement('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', handler);
    console.log('Settings button handler set up (using DOM reference)');
  } else {
    console.error('Settings button not found');
  }
}

// Set up close modal button handler
function setupCloseModalHandler(): void {
  const settingsModalElement = getDomElement('settings-modal');
  
  const handler = () => {
    console.log('Close modal button clicked');
    
    // Try UI reference first
    if (settingsModal) {
      settingsModal.style.display = 'none';
      return;
    }
    
    // Fall back to direct DOM query
    if (settingsModalElement instanceof HTMLElement) {
      settingsModalElement.style.display = 'none';
    }
  };
  
  // Try UI reference first
  if (closeModalButton) {
    closeModalButton.addEventListener('click', handler);
    console.log('Close modal button handler set up (using UI reference)');
    return;
  }
  
  // Fall back to direct DOM query
  const closeModalBtn = document.querySelector('.close-modal');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', handler);
    console.log('Close modal button handler set up (using DOM reference)');
  } else {
    console.error('Close modal button not found');
  }
}

// Set up outside click handler for modal
function setupOutsideClickHandler(): void {
  const settingsModalElement = getDomElement('settings-modal');
  
  window.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Check if click is outside the modal
    if ((settingsModal && target === settingsModal) || 
        (settingsModalElement && target === settingsModalElement)) {
      console.log('Clicked outside modal');
      
      // Hide modal
      if (settingsModal) {
        settingsModal.style.display = 'none';
      }
      
      if (settingsModalElement instanceof HTMLElement) {
        settingsModalElement.style.display = 'none';
      }
    }
  });
  
  console.log('Outside click handler set up');
}

// Set up save API key button handler
function setupSaveApiKeyHandler(): void {
  const apiKeyInputElement = getDomElement('api-key-input');
  const apiBaseUrlInputElement = getDomElement('api-base-url-input');
  const settingsModalElement = getDomElement('settings-modal');
  
  const handler = () => {
    console.log('Save API key button clicked');
    
    // Get values from UI references first
    let newApiKey = apiKeyInput?.value.trim() || '';
    let newBaseUrl = apiBaseUrlInput?.value.trim() || '';
    
    // Fall back to direct DOM queries
    if (!newApiKey && apiKeyInputElement instanceof HTMLInputElement) {
      newApiKey = apiKeyInputElement.value.trim();
    }
    
    if (!newBaseUrl && apiBaseUrlInputElement instanceof HTMLInputElement) {
      newBaseUrl = apiBaseUrlInputElement.value.trim();
    }
    
    if (newApiKey) {
      saveApiSettings(newApiKey, newBaseUrl);
      alert('API settings saved successfully');
      
      // Hide modal
      if (settingsModal) {
        settingsModal.style.display = 'none';
      }
      
      if (settingsModalElement instanceof HTMLElement) {
        settingsModalElement.style.display = 'none';
      }
    }
  };
  
  // Try UI reference first
  if (saveApiKeyButton) {
    saveApiKeyButton.addEventListener('click', handler);
    console.log('Save API key button handler set up (using UI reference)');
    return;
  }
  
  // Fall back to direct DOM query
  const saveApiKeyBtn = getDomElement('save-api-key-btn');
  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', handler);
    console.log('Save API key button handler set up (using DOM reference)');
  } else {
    console.error('Save API key button not found');
  }
}