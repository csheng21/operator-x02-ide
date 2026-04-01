// ide/aiAssistant/storageSettingsUI.ts
// SIMPLIFIED UI - Only Memory-Only and Custom Folder

import { storageSettingsManager } from './storageSettingsManager';

export function createStorageSettingsUI(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'storage-settings-container';
  container.innerHTML = `
    <div class="storage-settings">
      <h3 class="settings-title">
        <span>💾 Storage Settings</span>
        <button class="close-settings" title="Close">×</button>
      </h3>
      
      <div class="settings-section">
        <label class="settings-label">Storage Location</label>
        
        <div class="storage-options">
          <label class="radio-option">
            <input type="radio" name="storage-type" value="memory-only" checked>
            <div>
              <span class="option-title">💭 Memory Only (Default)</span>
              <span class="option-desc">No files saved, cleared on reload</span>
            </div>
          </label>
          
          <label class="radio-option">
            <input type="radio" name="storage-type" value="custom">
            <div>
              <span class="option-title">📁 Custom Folder</span>
              <span class="option-desc">Save to a folder of your choice</span>
            </div>
          </label>
        </div>
        
        <div class="custom-path-section" style="display: none;">
          <div class="path-display">
            <input type="text" class="custom-path-input" placeholder="No folder selected" readonly>
            <button class="browse-btn">📁 Browse</button>
          </div>
          <small class="path-hint">Conversations will be saved to: [folder]/ai_conversations.json</small>
        </div>
      </div>
      
      <div class="current-storage-info">
        <div class="info-label">Current Storage:</div>
        <div class="info-value" id="current-storage-display">Memory Only</div>
      </div>
      
      <div class="settings-actions">
        <button class="btn-secondary reset-btn">Reset to Memory Only</button>
        <button class="btn-primary save-btn">Save Settings</button>
      </div>
      
      <div class="settings-info">
        <small>💡 Reload the IDE after changing settings</small>
      </div>
    </div>
  `;

  // Add styles
  addStorageSettingsStyles();

  // Setup event listeners
  setupStorageSettingsEvents(container);

  // Load current settings
  loadCurrentSettings(container);

  return container;
}

function setupStorageSettingsEvents(container: HTMLElement): void {
  // Close button
  const closeBtn = container.querySelector('.close-settings');
  closeBtn?.addEventListener('click', () => {
    container.remove();
  });

  // Storage type radio buttons
  const radioButtons = container.querySelectorAll('input[name="storage-type"]');
  const customPathSection = container.querySelector('.custom-path-section') as HTMLElement;
  
  radioButtons.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.value === 'custom') {
        customPathSection.style.display = 'block';
      } else {
        customPathSection.style.display = 'none';
      }
    });
  });

  // Browse button
  const browseBtn = container.querySelector('.browse-btn');
  const pathInput = container.querySelector('.custom-path-input') as HTMLInputElement;
  
  browseBtn?.addEventListener('click', async () => {
    const selectedPath = await storageSettingsManager.selectCustomPath();
    if (selectedPath) {
      pathInput.value = selectedPath;
      // Auto-select custom radio
      const customRadio = container.querySelector('input[value="custom"]') as HTMLInputElement;
      if (customRadio) {
        customRadio.checked = true;
        customPathSection.style.display = 'block';
      }
    }
  });

  // Save button
  const saveBtn = container.querySelector('.save-btn');
  saveBtn?.addEventListener('click', () => {
    saveStorageSettings(container);
  });

  // Reset button
  const resetBtn = container.querySelector('.reset-btn');
  resetBtn?.addEventListener('click', () => {
    if (confirm('Reset storage to Memory Only mode?')) {
      storageSettingsManager.resetToDefaults();
      loadCurrentSettings(container);
      showNotification('Reset to Memory Only mode', 'success');
    }
  });

  // Close on overlay click
  container.addEventListener('click', (e) => {
    if (e.target === container) {
      container.remove();
    }
  });
}

function loadCurrentSettings(container: HTMLElement): void {
  // patched: re-render when async Rust init completes
  const onInit = (e: Event) => {
    if (!document.body.contains(container)) { window.removeEventListener('storage-settings-initialized', onInit as EventListener); return; }
    const d = (e as CustomEvent).detail as { storageType: string; customPath?: string };
    const rb = d.storageType === 'custom'
      ? container.querySelector('input[value="custom"]') as HTMLInputElement | null
      : container.querySelector('input[value="memory-only"]') as HTMLInputElement | null;
    if (rb) { rb.checked = true;
      if (d.storageType === 'custom') {
        const sec = container.querySelector('.custom-path-section') as HTMLElement | null;
        if (sec) sec.style.display = 'block';
        const inp = container.querySelector('.custom-path-input') as HTMLInputElement | null;
        if (inp && d.customPath) inp.value = d.customPath;
      }
    }
    updateCurrentStorageDisplay(container);
    window.removeEventListener('storage-settings-initialized', onInit as EventListener);
  };
  window.addEventListener('storage-settings-initialized', onInit as EventListener);
  const settings = storageSettingsManager.getSettings();
  
  // Set storage type radio
  const radioButton = container.querySelector(
    `input[value="${settings.storageType}"]`
  ) as HTMLInputElement;
  if (radioButton) {
    radioButton.checked = true;
    
    // Show custom path section if custom is selected
    if (settings.storageType === 'custom') {
      const customPathSection = container.querySelector('.custom-path-section') as HTMLElement;
      customPathSection.style.display = 'block';
      
      const pathInput = container.querySelector('.custom-path-input') as HTMLInputElement;
      if (pathInput && settings.customPath) {
        pathInput.value = settings.customPath;
      }
    }
  }
  
  // Update current storage display
  updateCurrentStorageDisplay(container);
}

function updateCurrentStorageDisplay(container: HTMLElement): void {
  const settings = storageSettingsManager.getSettings();
  const displayElement = container.querySelector('#current-storage-display');
  
  if (displayElement) {
    if (settings.storageType === 'memory-only') {
      displayElement.textContent = '💭 Memory Only (No files saved)';
      displayElement.style.color = '#888';
    } else if (settings.customPath) {
      displayElement.textContent = `📁 ${settings.customPath}`;
      displayElement.style.color = '#0e639c';
    }
  }
}

function saveStorageSettings(container: HTMLElement): void {
  // Get selected storage type
  const selectedRadio = container.querySelector(
    'input[name="storage-type"]:checked'
  ) as HTMLInputElement;
  
  if (selectedRadio) {
    const storageType = selectedRadio.value as 'memory-only' | 'custom';
    
    // If custom, ensure path is set
    if (storageType === 'custom') {
      const pathInput = container.querySelector('.custom-path-input') as HTMLInputElement;
      if (!pathInput.value) {
        alert('Please select a custom folder path');
        return;
      }
    }
    
    storageSettingsManager.setStorageType(storageType);
  }
  
  showNotification('Settings saved! Reload IDE to apply changes.', 'success');
  
  // Update display
  updateCurrentStorageDisplay(container);
  
  // Close settings after 2 seconds
  setTimeout(() => {
    container.remove();
  }, 2000);
}

function showNotification(message: string, type: 'success' | 'error' = 'success'): void {
  const notification = document.createElement('div');
  notification.className = `storage-notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function addStorageSettingsStyles(): void {
  if (document.getElementById('storage-settings-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'storage-settings-styles';
  style.textContent = `
    .storage-settings-container {
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
    
    .storage-settings {
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 8px;
      width: 500px;
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      animation: slideIn 0.3s ease;
    }
    
    .settings-title {
      margin: 0;
      padding: 16px 20px;
      border-bottom: 1px solid #3c3c3c;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 16px;
      font-weight: 600;
      color: #e0e0e0;
    }
    
    .close-settings {
      background: none;
      border: none;
      color: #888;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    }
    
    .close-settings:hover {
      background: #333;
      color: #fff;
    }
    
    .settings-section {
      padding: 20px;
      border-bottom: 1px solid #2d2d2d;
    }
    
    .settings-label {
      display: block;
      margin-bottom: 12px;
      font-weight: 500;
      color: #e0e0e0;
      font-size: 14px;
    }
    
    .storage-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .radio-option {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px;
      background: #252525;
      border: 2px solid #2d2d2d;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .radio-option:hover {
      background: #2d2d2d;
      border-color: #3c3c3c;
    }
    
    .radio-option input:checked ~ div {
      color: #0e639c;
    }
    
    .radio-option input:checked {
      accent-color: #0e639c;
    }
    
    .radio-option input {
      cursor: pointer;
      margin-top: 2px;
    }
    
    .radio-option div {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .option-title {
      font-size: 14px;
      font-weight: 500;
      color: #e0e0e0;
    }
    
    .option-desc {
      font-size: 12px;
      color: #888;
    }
    
    .custom-path-section {
      margin-top: 15px;
      padding: 15px;
      background: #252525;
      border-radius: 6px;
    }
    
    .path-display {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }
    
    .custom-path-input {
      flex: 1;
      padding: 8px 12px;
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 4px;
      color: #e0e0e0;
      font-size: 13px;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    
    .browse-btn {
      padding: 8px 16px;
      background: #0e639c;
      border: none;
      border-radius: 4px;
      color: white;
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.2s;
    }
    
    .browse-btn:hover {
      background: #1177bb;
    }
    
    .path-hint {
      display: block;
      color: #888;
      font-size: 12px;
      font-style: italic;
    }
    
    .current-storage-info {
      padding: 16px 20px;
      background: #252525;
      border-bottom: 1px solid #2d2d2d;
    }
    
    .info-label {
      font-size: 12px;
      color: #888;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .info-value {
      font-size: 13px;
      color: #e0e0e0;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    
    .settings-actions {
      padding: 20px;
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
    
    .btn-primary,
    .btn-secondary {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background: #0e639c;
      color: white;
    }
    
    .btn-primary:hover {
      background: #1177bb;
    }
    
    .btn-secondary {
      background: #333;
      color: #e0e0e0;
    }
    
    .btn-secondary:hover {
      background: #404040;
    }
    
    .settings-info {
      padding: 0 20px 20px;
      text-align: center;
    }
    
    .settings-info small {
      color: #888;
      font-size: 12px;
    }
    
    .storage-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transform: translateX(400px);
      transition: transform 0.3s ease;
      z-index: 10001;
    }
    
    .storage-notification.show {
      transform: translateX(0);
    }
    
    .storage-notification.success {
      background: #2d7d46;
    }
    
    .storage-notification.error {
      background: #d32f2f;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideIn {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `;
  
  document.head.appendChild(style);
}

// Helper function to add settings button
export function addStorageSettingsButton(parentElement: HTMLElement): void {
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'storage-settings-btn';
  settingsBtn.innerHTML = '⚙️';
  settingsBtn.title = 'Storage Settings';
  settingsBtn.style.cssText = `
    background: transparent;
    border: 1px solid #3c3c3c;
    border-radius: 4px;
    color: #888;
    cursor: pointer;
    padding: 6px 10px;
    font-size: 16px;
    transition: all 0.2s;
    margin-left: 8px;
  `;
  
  settingsBtn.addEventListener('mouseenter', () => {
    settingsBtn.style.background = '#2d2d2d';
    settingsBtn.style.color = '#e0e0e0';
  });
  
  settingsBtn.addEventListener('mouseleave', () => {
    settingsBtn.style.background = 'transparent';
    settingsBtn.style.color = '#888';
  });
  
  settingsBtn.addEventListener('click', () => {
    const settingsUI = createStorageSettingsUI();
    document.body.appendChild(settingsUI);
  });
  
  parentElement.appendChild(settingsBtn);
}