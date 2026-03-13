// orchestratorUI.ts - Settings Panel for Multi-Provider Orchestrator
// ============================================================================

import { 
  getOrchestrator, 
  ProviderName, 
  OrchestratorConfig,
  setDefaultProvider,
  setAutoRouting 
} from './multiProviderOrchestrator';

// ============================================================================
// PROVIDER ICONS AND COLORS
// ============================================================================

const PROVIDER_ICONS: Record<ProviderName, string> = {
  operator_x02: '🔮',
  groq: '⚡',
  gemini: '✨',
  deepseek: '🔵',
  claude: '🟠',
  openai: '🟢'
};

const PROVIDER_COLORS: Record<ProviderName, string> = {
  operator_x02: '#9c27b0',
  groq: '#f55036',
  gemini: '#4285f4',
  deepseek: '#0066ff',
  claude: '#cc785c',
  openai: '#10a37f'
};

// ============================================================================
// SETTINGS PANEL
// ============================================================================

/**
 * Show the orchestrator settings panel
 */
export function showOrchestratorSettings(): void {
  // Remove existing panel
  const existing = document.getElementById('orchestrator-settings-panel');
  if (existing) existing.remove();
  
  const orchestrator = getOrchestrator();
  const config = orchestrator.getConfig();
  const stats = orchestrator.getStats();
  
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'orchestrator-settings-panel';
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease;
  `;
  
  // Create panel
  const panel = document.createElement('div');
  panel.style.cssText = `
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 16px;
    width: 600px;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
  `;
  
  panel.innerHTML = `
    <style>
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .orch-header {
        padding: 20px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .orch-header h2 {
        margin: 0;
        color: white;
        font-size: 18px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .orch-close {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 18px;
        transition: background 0.2s;
      }
      .orch-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      .orch-content {
        padding: 20px 24px;
        overflow-y: auto;
        flex: 1;
      }
      .orch-section {
        margin-bottom: 24px;
      }
      .orch-section-title {
        color: rgba(255, 255, 255, 0.6);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 12px;
      }
      .orch-toggle-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        margin-bottom: 8px;
      }
      .orch-toggle-label {
        color: white;
        font-size: 14px;
      }
      .orch-toggle-desc {
        color: rgba(255, 255, 255, 0.5);
        font-size: 12px;
        margin-top: 4px;
      }
      .orch-toggle {
        width: 48px;
        height: 26px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 13px;
        position: relative;
        cursor: pointer;
        transition: background 0.3s;
      }
      .orch-toggle.active {
        background: #4caf50;
      }
      .orch-toggle::after {
        content: '';
        position: absolute;
        width: 22px;
        height: 22px;
        background: white;
        border-radius: 50%;
        top: 2px;
        left: 2px;
        transition: transform 0.3s;
      }
      .orch-toggle.active::after {
        transform: translateX(22px);
      }
      .orch-provider-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .orch-provider {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        border: 2px solid transparent;
        cursor: pointer;
        transition: all 0.2s;
      }
      .orch-provider:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      .orch-provider.default {
        border-color: #4caf50;
        background: rgba(76, 175, 80, 0.1);
      }
      .orch-provider-icon {
        font-size: 24px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
      }
      .orch-provider-info {
        flex: 1;
      }
      .orch-provider-name {
        color: white;
        font-weight: 600;
        font-size: 14px;
      }
      .orch-provider-meta {
        color: rgba(255, 255, 255, 0.5);
        font-size: 11px;
        margin-top: 2px;
      }
      .orch-provider-stats {
        text-align: right;
        color: rgba(255, 255, 255, 0.5);
        font-size: 11px;
      }
      .orch-provider-status {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-left: 8px;
      }
      .orch-provider-status.configured {
        background: #4caf50;
        box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
      }
      .orch-provider-status.not-configured {
        background: #ff5722;
      }
      .orch-key-input {
        width: 100%;
        padding: 10px 14px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: white;
        font-size: 13px;
        margin-top: 8px;
      }
      .orch-key-input:focus {
        outline: none;
        border-color: #4fc3f7;
      }
      .orch-footer {
        padding: 16px 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      .orch-btn {
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
      }
      .orch-btn-primary {
        background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
        color: white;
      }
      .orch-btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
      }
      .orch-btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }
      .orch-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      .orch-default-badge {
        background: #4caf50;
        color: white;
        font-size: 9px;
        padding: 2px 6px;
        border-radius: 4px;
        margin-left: 8px;
      }
    </style>
    
    <div class="orch-header">
      <h2>🎛️ Multi-Provider Orchestrator</h2>
      <button class="orch-close" id="orch-close">×</button>
    </div>
    
    <div class="orch-content">
      <!-- Routing Options -->
      <div class="orch-section">
        <div class="orch-section-title">Routing Options</div>
        
        <div class="orch-toggle-row">
          <div>
            <div class="orch-toggle-label">🔀 Auto-Routing</div>
            <div class="orch-toggle-desc">Automatically route to best provider based on task</div>
          </div>
          <div class="orch-toggle ${config.enableAutoRouting ? 'active' : ''}" id="toggle-auto-routing"></div>
        </div>
        
        <div class="orch-toggle-row">
          <div>
            <div class="orch-toggle-label">🔄 Fallback</div>
            <div class="orch-toggle-desc">Try next provider if current one fails</div>
          </div>
          <div class="orch-toggle ${config.enableFallback ? 'active' : ''}" id="toggle-fallback"></div>
        </div>
        
        <div class="orch-toggle-row">
          <div>
            <div class="orch-toggle-label">📍 Provider Indicator</div>
            <div class="orch-toggle-desc">Show which provider is being used</div>
          </div>
          <div class="orch-toggle ${config.showProviderIndicator ? 'active' : ''}" id="toggle-indicator"></div>
        </div>
      </div>
      
      <!-- Provider List -->
      <div class="orch-section">
        <div class="orch-section-title">Providers (Click to set as default)</div>
        <div class="orch-provider-list" id="provider-list">
          ${Object.entries(config.providers).map(([name, prov]) => {
            const isDefault = name === config.defaultProvider;
            const isConfigured = !!prov.apiKey;
            const stat = stats[name as ProviderName] || { calls: 0, errors: 0, avgLatency: 0 };
            
            return `
              <div class="orch-provider ${isDefault ? 'default' : ''}" data-provider="${name}">
                <div class="orch-provider-icon" style="background: ${PROVIDER_COLORS[name as ProviderName]}20">
                  ${PROVIDER_ICONS[name as ProviderName]}
                </div>
                <div class="orch-provider-info">
                  <div class="orch-provider-name">
                    ${prov.displayName}
                    ${isDefault ? '<span class="orch-default-badge">DEFAULT</span>' : ''}
                  </div>
                  <div class="orch-provider-meta">
                    ${prov.speed} • ${prov.costTier} • ${prov.strengths.slice(0, 2).join(', ')}
                  </div>
                </div>
                <div class="orch-provider-stats">
                  ${stat.calls > 0 ? `${stat.calls} calls • ${stat.avgLatency}ms` : 'No calls yet'}
                </div>
                <div class="orch-provider-status ${isConfigured ? 'configured' : 'not-configured'}"></div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      
      <!-- Quick Setup -->
      <div class="orch-section">
        <div class="orch-section-title">Quick API Key Setup</div>
        <select id="key-provider-select" style="
          width: 100%;
          padding: 10px 14px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          font-size: 13px;
          margin-bottom: 8px;
        ">
          ${Object.entries(config.providers).map(([name, prov]) => `
            <option value="${name}">${PROVIDER_ICONS[name as ProviderName]} ${prov.displayName}</option>
          `).join('')}
        </select>
        <input type="password" class="orch-key-input" id="api-key-input" placeholder="Enter API key...">
        <button class="orch-btn orch-btn-primary" style="width: 100%; margin-top: 8px;" id="save-key-btn">
          💾 Save API Key
        </button>
      </div>
    </div>
    
    <div class="orch-footer">
      <button class="orch-btn orch-btn-secondary" id="reset-stats-btn">📊 Reset Stats</button>
      <button class="orch-btn orch-btn-primary" id="orch-done">Done</button>
    </div>
  `;
  
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  
  // -------------------------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------------------------
  
  // Close button
  document.getElementById('orch-close')?.addEventListener('click', () => overlay.remove());
  document.getElementById('orch-done')?.addEventListener('click', () => overlay.remove());
  
  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  
  // Toggle switches
  document.getElementById('toggle-auto-routing')?.addEventListener('click', function() {
    this.classList.toggle('active');
    orchestrator.updateConfig({ enableAutoRouting: this.classList.contains('active') });
  });
  
  document.getElementById('toggle-fallback')?.addEventListener('click', function() {
    this.classList.toggle('active');
    orchestrator.updateConfig({ enableFallback: this.classList.contains('active') });
  });
  
  document.getElementById('toggle-indicator')?.addEventListener('click', function() {
    this.classList.toggle('active');
    orchestrator.updateConfig({ showProviderIndicator: this.classList.contains('active') });
  });
  
  // Provider selection (set as default)
  document.querySelectorAll('.orch-provider').forEach(el => {
    el.addEventListener('click', function() {
      const provider = this.getAttribute('data-provider') as ProviderName;
      if (provider) {
        setDefaultProvider(provider);
        // Refresh panel
        showOrchestratorSettings();
      }
    });
  });
  
  // Save API key
  document.getElementById('save-key-btn')?.addEventListener('click', () => {
    const select = document.getElementById('key-provider-select') as HTMLSelectElement;
    const input = document.getElementById('api-key-input') as HTMLInputElement;
    
    if (select && input && input.value.trim()) {
      const provider = select.value as ProviderName;
      orchestrator.setProviderApiKey(provider, input.value.trim());
      input.value = '';
      
      // Show success
      alert(`✅ API key saved for ${config.providers[provider]?.displayName || provider}`);
      
      // Refresh
      showOrchestratorSettings();
    }
  });
  
  // Reset stats
  document.getElementById('reset-stats-btn')?.addEventListener('click', () => {
    localStorage.removeItem('multiProviderOrchestratorStats');
    alert('📊 Statistics reset!');
    showOrchestratorSettings();
  });
}

// ============================================================================
// QUICK SWITCH DROPDOWN ENHANCEMENT
// ============================================================================

/**
 * Add orchestrator option to existing Quick Switch menu
 */
export function enhanceQuickSwitch(): void {
  // Find existing quick switch menu
  const quickSwitch = document.querySelector('.quick-switch-menu, [class*="quick-switch"]');
  
  if (quickSwitch && !document.getElementById('orch-quick-btn')) {
    const orchBtn = document.createElement('div');
    orchBtn.id = 'orch-quick-btn';
    orchBtn.innerHTML = `
      <div style="
        padding: 12px 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        color: white;
        transition: background 0.2s;
      " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">
        <span style="font-size: 18px;">🎛️</span>
        <span>Orchestrator Settings</span>
      </div>
    `;
    
    orchBtn.addEventListener('click', () => {
      showOrchestratorSettings();
    });
    
    quickSwitch.appendChild(orchBtn);
  }
}

// ============================================================================
// STATUS BAR INDICATOR
// ============================================================================

/**
 * Create a persistent status bar showing current orchestrator status
 */
export function createOrchestratorStatusBar(): HTMLElement {
  let statusBar = document.getElementById('orchestrator-status-bar');
  
  if (!statusBar) {
    statusBar = document.createElement('div');
    statusBar.id = 'orchestrator-status-bar';
    statusBar.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(20, 20, 30, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 6px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: white;
      cursor: pointer;
      z-index: 9999;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    
    statusBar.addEventListener('click', showOrchestratorSettings);
    statusBar.addEventListener('mouseenter', () => {
      statusBar!.style.transform = 'scale(1.05)';
    });
    statusBar.addEventListener('mouseleave', () => {
      statusBar!.style.transform = 'scale(1)';
    });
    
    document.body.appendChild(statusBar);
  }
  
  // Update content
  const config = getOrchestrator().getConfig();
  const defaultProv = config.providers[config.defaultProvider];
  const enabledCount = Object.values(config.providers).filter(p => p.enabled && p.apiKey).length;
  
  statusBar.innerHTML = `
    <span style="font-size: 14px;">${PROVIDER_ICONS[config.defaultProvider]}</span>
    <span style="font-weight: 600;">${defaultProv?.displayName || 'Not Set'}</span>
    <span style="color: rgba(255,255,255,0.5);">|</span>
    <span style="color: ${config.enableAutoRouting ? '#4caf50' : 'rgba(255,255,255,0.5)'};">
      ${config.enableAutoRouting ? '🔀 Auto' : '📍 Fixed'}
    </span>
    <span style="color: rgba(255,255,255,0.5);">|</span>
    <span style="color: rgba(255,255,255,0.5);">${enabledCount} active</span>
  `;
  
  return statusBar;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the orchestrator UI
 */
export function initializeOrchestratorUI(): void {
  console.log('🎛️ Initializing Multi-Provider Orchestrator UI...');
  
  // ❌ REMOVED: Status bar - now integrated in Quick Switch menu
  // createOrchestratorStatusBar();
  
  // Enhance quick switch menu after a delay (wait for it to render)
  setTimeout(() => {
    enhanceQuickSwitch();
  }, 2000);
  
  // Add keyboard shortcut (Ctrl+Shift+O)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'O') {
      e.preventDefault();
      showOrchestratorSettings();
    }
  });
  
  console.log('✅ Orchestrator UI initialized');
  console.log('   Press Ctrl+Shift+O to open settings');
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  showSettings: showOrchestratorSettings,
  createStatusBar: createOrchestratorStatusBar,
  initialize: initializeOrchestratorUI
};

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  (window as any).showOrchestratorSettings = showOrchestratorSettings;
  (window as any).initOrchestratorUI = initializeOrchestratorUI;
}
