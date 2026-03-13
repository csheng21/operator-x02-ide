// ide/aiAssistant/optimizationSettingsUI.ts
// UI for configuring message importance and compression settings

import { conversationManager } from './conversationManager_optimized';
import type { ImportanceConfig } from './messageImportanceAnalyzer';

export class OptimizationSettingsUI {
  private modalElement: HTMLElement | null = null;

  // Show optimization settings modal
  showSettings(): void {
    this.modalElement = this.createModal();
    document.body.appendChild(this.modalElement);
    this.attachEventListeners();
    this.updateStats();
  }

  // Create settings modal
  private createModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'optimization-settings-modal';
    modal.innerHTML = `
      <div class="optimization-modal-overlay">
        <div class="optimization-modal-content">
          <div class="optimization-header">
            <h2>💾 Message Optimization Settings</h2>
            <button class="close-btn" data-action="close">✕</button>
          </div>

          <!-- Current Statistics -->
          <div class="optimization-stats-section">
            <h3>📊 Current Statistics</h3>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">Total Messages:</span>
                <span class="stat-value" id="total-messages">-</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Saved Messages:</span>
                <span class="stat-value" id="saved-messages">-</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Reduction:</span>
                <span class="stat-value" id="reduction-percent">-</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Storage Size:</span>
                <span class="stat-value" id="storage-size">-</span>
              </div>
            </div>
          </div>

          <!-- Optimization Toggle -->
          <div class="optimization-section">
            <div class="setting-row">
              <label class="setting-label">
                <input type="checkbox" id="optimization-enabled" checked>
                <span>Enable Message Optimization</span>
              </label>
              <p class="setting-description">Filter and save only important messages to reduce file size</p>
            </div>
          </div>

          <!-- Importance Criteria -->
          <div class="optimization-section">
            <h3>🎯 Importance Criteria</h3>
            
            <div class="setting-row">
              <label class="setting-label">
                Minimum Message Length (characters)
              </label>
              <input type="number" id="min-message-length" min="0" max="500" value="50" class="setting-input">
              <p class="setting-description">Messages shorter than this are filtered unless they contain code</p>
            </div>

            <div class="setting-row">
              <label class="setting-label">
                Always Keep Recent Messages (count)
              </label>
              <input type="number" id="save-recent-count" min="5" max="100" value="20" class="setting-input">
              <p class="setting-description">Always save this many recent messages, regardless of importance</p>
            </div>

            <div class="setting-row">
              <label class="setting-label">
                <input type="checkbox" id="save-code-messages" checked>
                <span>Save Messages with Code</span>
              </label>
            </div>

            <div class="setting-row">
              <label class="setting-label">
                <input type="checkbox" id="save-file-operations" checked>
                <span>Save File Operation Messages</span>
              </label>
            </div>

            <div class="setting-row">
              <label class="setting-label">
                <input type="checkbox" id="save-technical-content" checked>
                <span>Save Technical Discussions</span>
              </label>
            </div>

            <div class="setting-row">
              <label class="setting-label">
                <input type="checkbox" id="remove-greetings" checked>
                <span>Remove Simple Greetings</span>
              </label>
              <p class="setting-description">Filter out "hi", "hello", "how are you", etc.</p>
            </div>
          </div>

          <!-- Compression Level -->
          <div class="optimization-section">
            <h3>🗜️ Compression Level</h3>
            <div class="setting-row">
              <select id="compression-level" class="setting-select">
                <option value="none">None - Keep all metadata</option>
                <option value="light" selected>Light - Remove empty metadata</option>
                <option value="aggressive">Aggressive - Keep only essentials</option>
              </select>
              <p class="setting-description">Higher compression = smaller file size but less metadata</p>
            </div>
          </div>

          <!-- Estimated Impact -->
          <div class="optimization-impact">
            <h3>📈 Estimated Impact</h3>
            <div class="impact-preview" id="impact-preview">
              <p>Adjust settings to see estimated impact...</p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="optimization-actions">
            <button class="btn btn-secondary" data-action="reset">Reset to Defaults</button>
            <button class="btn btn-primary" data-action="save">Save Settings</button>
          </div>
        </div>
      </div>
    `;

    this.addStyles();
    return modal;
  }

  // Attach event listeners
  private attachEventListeners(): void {
    if (!this.modalElement) return;

    // Close button
    const closeBtn = this.modalElement.querySelector('[data-action="close"]');
    closeBtn?.addEventListener('click', () => this.close());

    // Save button
    const saveBtn = this.modalElement.querySelector('[data-action="save"]');
    saveBtn?.addEventListener('click', () => this.saveSettings());

    // Reset button
    const resetBtn = this.modalElement.querySelector('[data-action="reset"]');
    resetBtn?.addEventListener('click', () => this.resetToDefaults());

    // Enable/disable toggle
    const enableToggle = this.modalElement.querySelector('#optimization-enabled') as HTMLInputElement;
    enableToggle?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      this.toggleSections(enabled);
    });

    // Real-time impact preview
    const inputs = this.modalElement.querySelectorAll('input, select');
    inputs.forEach(input => {
      input.addEventListener('change', () => this.updateImpactPreview());
    });
  }

  // Toggle section visibility based on optimization enabled
  private toggleSections(enabled: boolean): void {
    const sections = this.modalElement?.querySelectorAll('.optimization-section');
    sections?.forEach(section => {
      (section as HTMLElement).style.opacity = enabled ? '1' : '0.5';
      (section as HTMLElement).style.pointerEvents = enabled ? 'auto' : 'none';
    });
  }

  // Update current statistics
  private updateStats(): void {
    const stats = conversationManager.getOptimizationStats();
    
    const totalEl = document.getElementById('total-messages');
    const savedEl = document.getElementById('saved-messages');
    const reductionEl = document.getElementById('reduction-percent');
    const sizeEl = document.getElementById('storage-size');

    if (totalEl) totalEl.textContent = stats.originalMessages.toString();
    if (savedEl) savedEl.textContent = stats.savedMessages.toString();
    if (reductionEl) reductionEl.textContent = `${stats.reductionPercent}%`;
    if (sizeEl) sizeEl.textContent = stats.savedSize;
  }

  // Update impact preview
  private updateImpactPreview(): void {
    const previewEl = document.getElementById('impact-preview');
    if (!previewEl) return;

    const config = this.getCurrentConfig();
    
    let impact = '';
    if (config.removeGreetings && config.minMessageLength > 30) {
      impact = '🟢 High reduction - Very aggressive filtering';
    } else if (config.removeGreetings || config.minMessageLength > 50) {
      impact = '🟡 Moderate reduction - Balanced filtering';
    } else {
      impact = '🔵 Low reduction - Minimal filtering';
    }

    impact += `<br><small>Keeping last ${config.saveRecentCount} messages + important content</small>`;
    previewEl.innerHTML = impact;
  }

  // Get current configuration from UI
  private getCurrentConfig(): ImportanceConfig {
    return {
      minMessageLength: parseInt((document.getElementById('min-message-length') as HTMLInputElement)?.value || '50'),
      saveRecentCount: parseInt((document.getElementById('save-recent-count') as HTMLInputElement)?.value || '20'),
      saveCodeMessages: (document.getElementById('save-code-messages') as HTMLInputElement)?.checked || true,
      saveFileOperations: (document.getElementById('save-file-operations') as HTMLInputElement)?.checked || true,
      saveTechnicalContent: (document.getElementById('save-technical-content') as HTMLInputElement)?.checked || true,
      removeGreetings: (document.getElementById('remove-greetings') as HTMLInputElement)?.checked || true,
      compressionLevel: (document.getElementById('compression-level') as HTMLSelectElement)?.value as any || 'light'
    };
  }

  // Save settings
  private saveSettings(): void {
    const enabled = (document.getElementById('optimization-enabled') as HTMLInputElement)?.checked;
    const config = this.getCurrentConfig();

    conversationManager.setOptimization(enabled);
    conversationManager.updateImportanceConfig(config);

    // Force save with new settings
    conversationManager.saveConversations();

    // Show success message
    this.showNotification('✅ Optimization settings saved!');
    
    // Close after short delay
    setTimeout(() => this.close(), 1500);
  }

  // Reset to defaults
  private resetToDefaults(): void {
    (document.getElementById('optimization-enabled') as HTMLInputElement).checked = true;
    (document.getElementById('min-message-length') as HTMLInputElement).value = '50';
    (document.getElementById('save-recent-count') as HTMLInputElement).value = '20';
    (document.getElementById('save-code-messages') as HTMLInputElement).checked = true;
    (document.getElementById('save-file-operations') as HTMLInputElement).checked = true;
    (document.getElementById('save-technical-content') as HTMLInputElement).checked = true;
    (document.getElementById('remove-greetings') as HTMLInputElement).checked = true;
    (document.getElementById('compression-level') as HTMLSelectElement).value = 'light';
    
    this.updateImpactPreview();
    this.showNotification('🔄 Reset to default settings');
  }

  // Show notification
  private showNotification(message: string): void {
    const notification = document.createElement('div');
    notification.className = 'optimization-notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  // Close modal
  private close(): void {
    if (this.modalElement) {
      this.modalElement.style.opacity = '0';
      setTimeout(() => {
        this.modalElement?.remove();
        this.modalElement = null;
      }, 300);
    }
  }

  // Add styles
  private addStyles(): void {
    if (document.getElementById('optimization-settings-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'optimization-settings-styles';
    styles.textContent = `
      .optimization-settings-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
      }

      .optimization-modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .optimization-modal-content {
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 8px;
        max-width: 700px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      }

      .optimization-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #3c3c3c;
      }

      .optimization-header h2 {
        margin: 0;
        color: #ffffff;
        font-size: 20px;
      }

      .close-btn {
        background: none;
        border: none;
        color: #888;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .close-btn:hover {
        background: #3c3c3c;
        color: #fff;
      }

      .optimization-stats-section {
        padding: 20px;
        background: #252525;
        border-bottom: 1px solid #3c3c3c;
      }

      .optimization-stats-section h3 {
        margin: 0 0 15px 0;
        color: #ffffff;
        font-size: 16px;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
      }

      .stat-item {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .stat-label {
        color: #888;
        font-size: 12px;
      }

      .stat-value {
        color: #4CAF50;
        font-size: 20px;
        font-weight: bold;
      }

      .optimization-section {
        padding: 20px;
        border-bottom: 1px solid #3c3c3c;
      }

      .optimization-section h3 {
        margin: 0 0 15px 0;
        color: #ffffff;
        font-size: 16px;
      }

      .setting-row {
        margin-bottom: 15px;
      }

      .setting-label {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #e0e0e0;
        font-size: 14px;
        cursor: pointer;
        margin-bottom: 5px;
      }

      .setting-label input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }

      .setting-description {
        color: #888;
        font-size: 12px;
        margin: 5px 0 0 0;
        line-height: 1.4;
      }

      .setting-input, .setting-select {
        width: 100%;
        padding: 8px 12px;
        background: #2d2d2d;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 14px;
        margin-top: 5px;
      }

      .setting-input:focus, .setting-select:focus {
        outline: none;
        border-color: #007ACC;
      }

      .optimization-impact {
        padding: 20px;
        background: #252525;
      }

      .optimization-impact h3 {
        margin: 0 0 15px 0;
        color: #ffffff;
        font-size: 16px;
      }

      .impact-preview {
        padding: 15px;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 14px;
        line-height: 1.6;
      }

      .optimization-actions {
        display: flex;
        gap: 10px;
        padding: 20px;
        justify-content: flex-end;
      }

      .btn {
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary {
        background: #007ACC;
        color: white;
      }

      .btn-primary:hover {
        background: #005A9E;
      }

      .btn-secondary {
        background: #3c3c3c;
        color: #e0e0e0;
      }

      .btn-secondary:hover {
        background: #4c4c4c;
      }

      .optimization-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: #4CAF50;
        color: white;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10001;
        transition: opacity 0.3s;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(styles);
  }
}

// Export singleton instance
export const optimizationSettingsUI = new OptimizationSettingsUI();