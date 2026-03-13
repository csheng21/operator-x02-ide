/**
 * Enhanced Context UI - Improved interface with status indicators
 * Extends the existing contextUI with better visual feedback
 */

import { contextManager, ProjectContext } from './contextManager';
import { contextIntegration, getContextStatus } from './contextIntegration';
import { contextUI } from './contextUI';

// ============================================================================
// CONTEXT STATUS INDICATOR
// ============================================================================

export class EnhancedContextUI {
  private statusIndicator: HTMLElement | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize enhanced context UI with status indicator
   */
  initialize(): void {
    this.addContextIndicator();
    this.startStatusUpdates();
    
    // Add context button to assistant toolbar
    this.addContextButtonToToolbar();
    
    console.log('✅ Enhanced Context UI initialized');
  }

  /**
   * Add context status indicator to UI
   */
  private addContextIndicator(): void {
    // Find the assistant panel header or input area
    const assistantPanel = document.querySelector('.assistant-panel');
    if (!assistantPanel) {
      console.warn('Assistant panel not found, will retry...');
      setTimeout(() => this.addContextIndicator(), 1000);
      return;
    }

    // Check if already exists
    if (document.getElementById('context-status-indicator')) {
      return;
    }

    // Create indicator
    this.statusIndicator = document.createElement('div');
    this.statusIndicator.id = 'context-status-indicator';
    this.statusIndicator.className = 'context-status-indicator';
    
    // Insert at the top of assistant panel
    const firstChild = assistantPanel.firstChild;
    if (firstChild) {
      assistantPanel.insertBefore(this.statusIndicator, firstChild);
    } else {
      assistantPanel.appendChild(this.statusIndicator);
    }

    this.updateStatusIndicator();
    this.addIndicatorStyles();
  }

  /**
   * Update status indicator content - ICON-ONLY COMPACT MODE
   */
  private updateStatusIndicator(): void {
    if (!this.statusIndicator) return;

    const status = getContextStatus();
    const project = contextManager.getProjectContext();
    const isEnabled = contextIntegration.isContextEnabled();

    // Icon-only compact status bar
    const statusHTML = `
      <div class="context-status-compact">
        <div class="context-icons-row">
          <span class="context-status-icon ${isEnabled ? 'active' : 'inactive'}" 
                title="Context: ${isEnabled ? 'ON' : 'OFF'}\n${project ? '📁 ' + project.projectName : '❌ No project'}\n📄 ${status.sessionFiles} files\n💬 ${status.conversationLength} messages">
            ${isEnabled ? '🟢' : '🔴'}
          </span>
          
          <span class="context-info-icon" 
                title="${project ? project.projectName : 'No project loaded'}">
            ${project ? '📁' : '❌'}
          </span>
          
          <span class="context-msg-icon" title="${status.conversationLength} messages">
            💬 <small>${status.conversationLength}</small>
          </span>
          
          <span class="context-files-icon" title="${status.sessionFiles} files tracked">
            📄 <small>${status.sessionFiles}</small>
          </span>
          
          <div class="context-actions-compact">
            <button class="context-icon-btn" id="context-setup-btn" title="Setup Context">
              ⚙️
            </button>
            <button class="context-icon-btn" id="context-view-btn" title="View Details">
              👁️
            </button>
            <button class="context-icon-btn context-toggle-btn" title="${isEnabled ? 'Disable' : 'Enable'} Context">
              ${isEnabled ? '🔓' : '🔒'}
            </button>
          </div>
        </div>
      </div>
    `;

    this.statusIndicator.innerHTML = statusHTML;

    // Attach event listeners
    this.attachIndicatorEvents();
  }

  /**
   * Attach event listeners to indicator buttons
   */
  private attachIndicatorEvents(): void {
    // Toggle button
    const toggleBtn = this.statusIndicator?.querySelector('.context-toggle-btn');
    toggleBtn?.addEventListener('click', () => {
      const isEnabled = contextIntegration.isContextEnabled();
      contextIntegration.toggleContext(!isEnabled);
      this.updateStatusIndicator();
      
      // Show notification
      const message = !isEnabled 
        ? '✅ Context memory enabled - AI will now remember your project and conversation'
        : '❌ Context memory disabled';
      this.showNotification(message);
    });

    // Setup button
    const setupBtn = this.statusIndicator?.querySelector('#context-setup-btn');
    setupBtn?.addEventListener('click', () => {
      contextUI.showContextModal();
    });

    // View button
    const viewBtn = this.statusIndicator?.querySelector('#context-view-btn');
    viewBtn?.addEventListener('click', () => {
      this.showContextDetails();
    });

    // Clear button
    const clearBtn = this.statusIndicator?.querySelector('#context-clear-btn');
    clearBtn?.addEventListener('click', () => {
      if (confirm('Clear all context? This will remove project info, tracked files, and decisions.')) {
        contextManager.clearContext();
        this.updateStatusIndicator();
        this.showNotification('Context cleared');
      }
    });

    // Enable button
    const enableBtn = this.statusIndicator?.querySelector('#context-enable-btn');
    enableBtn?.addEventListener('click', () => {
      contextIntegration.toggleContext(true);
      this.updateStatusIndicator();
      this.showNotification('✅ Context memory enabled');
    });
  }

  /**
   * Show context details modal
   */
  private showContextDetails(): void {
    const modal = document.createElement('div');
    modal.className = 'context-details-modal-overlay';
    
    const status = getContextStatus();
    const project = contextManager.getProjectContext();
    const trackedFiles = contextManager.getTrackedFiles();
    const decisions = contextManager.getDecisions();
    const recentConv = contextManager.getRecentConversation(10);

    modal.innerHTML = `
      <div class="context-details-modal">
        <div class="modal-header">
          <h2>🧠 Context Memory Details</h2>
          <button class="close-btn">×</button>
        </div>
        <div class="modal-body">
          ${project ? `
            <div class="context-section">
              <h3>📁 Project Context</h3>
              <div class="context-detail-item">
                <strong>Name:</strong> ${project.projectName}
              </div>
              <div class="context-detail-item">
                <strong>Type:</strong> ${project.projectType}
              </div>
              <div class="context-detail-item">
                <strong>Tech Stack:</strong> ${project.techStack.join(', ')}
              </div>
              <div class="context-detail-item">
                <strong>Phase:</strong> ${project.developmentPhase}
              </div>
              <div class="context-detail-item">
                <strong>Purpose:</strong> ${project.purpose}
              </div>
            </div>
          ` : '<div class="context-section"><p>No project context set</p></div>'}

          ${trackedFiles.length > 0 ? `
            <div class="context-section">
              <h3>📄 Tracked Files (${trackedFiles.length})</h3>
              <div class="file-list">
                ${trackedFiles.map(file => `
                  <div class="file-item">
                    <span class="file-icon">📄</span>
                    <div class="file-info">
                      <div class="file-path">${file.path}</div>
                      <div class="file-meta">${file.language} • ${new Date(file.lastModified).toLocaleString()}</div>
                      ${file.summary ? `<div class="file-summary">${file.summary}</div>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${decisions.length > 0 ? `
            <div class="context-section">
              <h3>✅ Key Decisions (${decisions.length})</h3>
              <div class="decision-list">
                ${decisions.map(decision => `
                  <div class="decision-item">
                    <div class="decision-topic">${decision.topic}</div>
                    <div class="decision-content">${decision.decision}</div>
                    ${decision.reasoning ? `<div class="decision-reasoning">${decision.reasoning}</div>` : ''}
                    <div class="decision-date">${new Date(decision.timestamp).toLocaleDateString()}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${recentConv.length > 0 ? `
            <div class="context-section">
              <h3>💬 Recent Conversation (${recentConv.length} messages)</h3>
              <div class="conversation-list">
                ${recentConv.slice(-5).map(msg => `
                  <div class="conversation-item ${msg.role}">
                    <div class="msg-role">${msg.role === 'user' ? 'You' : 'AI'}:</div>
                    <div class="msg-content">${this.truncate(msg.content, 100)}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="context-stats">
            <div class="stat-item">
              <span class="stat-label">Total Messages:</span>
              <span class="stat-value">${status.conversationLength}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Files Tracked:</span>
              <span class="stat-value">${status.sessionFiles}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Decisions Made:</span>
              <span class="stat-value">${decisions.length}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="export-context-btn">📤 Export Context</button>
          <button class="btn-primary" id="close-details-btn">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.addDetailsModalStyles();

    // Event listeners
    const closeBtn = modal.querySelector('.close-btn');
    const closeBtnFooter = modal.querySelector('#close-details-btn');
    const exportBtn = modal.querySelector('#export-context-btn');

    closeBtn?.addEventListener('click', () => modal.remove());
    closeBtnFooter?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    exportBtn?.addEventListener('click', () => {
      const contextJson = contextManager.exportContext();
      const blob = new Blob([contextJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `context-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showNotification('Context exported');
    });
  }

  /**
   * Add context button to assistant toolbar
   */
  private addContextButtonToToolbar(): void {
    const toolbar = document.querySelector('.input-tools');
    if (!toolbar) {
      setTimeout(() => this.addContextButtonToToolbar(), 1000);
      return;
    }

    // Check if already exists
    if (document.getElementById('toolbar-context-btn')) {
      return;
    }

    const btn = document.createElement('button');
    btn.id = 'toolbar-context-btn';
    btn.className = 'tool-button context-tool-button';
    btn.title = 'Manage Context Memory';
    btn.innerHTML = '🧠';

    btn.addEventListener('click', () => {
      contextUI.showContextModal();
    });

    toolbar.appendChild(btn);
  }

  /**
   * Start periodic status updates
   */
  private startStatusUpdates(): void {
    // Update every 30 seconds
    this.updateInterval = setInterval(() => {
      this.updateStatusIndicator();
    }, 30000);
  }

  /**
   * Stop status updates
   */
  stopStatusUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Helper: Truncate text
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Helper: Show notification
   */
  private showNotification(message: string): void {
    // Try to use existing notification system
    if ((window as any).showNotification) {
      (window as any).showNotification(message, 'info');
    } else {
      // Fallback to alert
      console.log(message);
    }
  }

  // ============================================================================
  // STYLES
  // ============================================================================

  private addIndicatorStyles(): void {
    if (document.getElementById('enhanced-context-ui-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'enhanced-context-ui-styles';
    styles.textContent = `
      /* COMPACT ICON-ONLY CONTEXT STATUS */
      .context-status-indicator {
        background: rgba(30, 30, 30, 0.95);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding: 6px 12px;
        margin: 0;
      }

      .context-status-compact {
        width: 100%;
      }

      .context-icons-row {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
      }

      /* Status Icons */
      .context-status-icon {
        font-size: 16px;
        cursor: help;
        transition: all 0.3s;
        filter: drop-shadow(0 0 2px currentColor);
      }

      .context-status-icon.active {
        animation: pulse 2s ease-in-out infinite;
      }

      .context-status-icon:hover {
        transform: scale(1.2);
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }

      .context-info-icon,
      .context-msg-icon,
      .context-files-icon {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
        color: #888;
        cursor: help;
        transition: color 0.2s;
      }

      .context-info-icon:hover,
      .context-msg-icon:hover,
      .context-files-icon:hover {
        color: #4fc3f7;
      }

      .context-msg-icon small,
      .context-files-icon small {
        font-size: 11px;
        color: #4fc3f7;
        font-weight: 500;
      }

      /* Compact Action Buttons */
      .context-actions-compact {
        display: flex;
        gap: 6px;
        margin-left: auto;
      }

      .context-icon-btn {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        color: #888;
      }

      .context-icon-btn:hover {
        background: rgba(79, 195, 247, 0.15);
        border-color: #4fc3f7;
        color: #4fc3f7;
        transform: translateY(-1px);
      }

      .context-icon-btn:active {
        transform: translateY(0);
      }

      /* Toolbar button */
      .context-tool-button {
        font-size: 18px !important;
      }
    `;

    document.head.appendChild(styles);
  }

  private addDetailsModalStyles(): void {
    if (document.getElementById('context-details-modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'context-details-modal-styles';
    styles.textContent = `
      .context-details-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
      }

      .context-details-modal {
        background: #1e1e1e;
        border: 1px solid rgba(79, 195, 247, 0.3);
        border-radius: 12px;
        width: 90%;
        max-width: 800px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }

      .modal-header {
        padding: 20px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(135deg, rgba(79, 195, 247, 0.1), rgba(33, 150, 243, 0.05));
      }

      .modal-header h2 {
        margin: 0;
        color: #4fc3f7;
        font-size: 20px;
      }

      .close-btn {
        background: none;
        border: none;
        color: #999;
        font-size: 32px;
        cursor: pointer;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }

      .modal-body {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
      }

      .context-section {
        margin-bottom: 24px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.05);
      }

      .context-section h3 {
        margin: 0 0 12px 0;
        color: #4fc3f7;
        font-size: 16px;
        font-weight: 600;
      }

      .context-detail-item {
        margin-bottom: 8px;
        color: #ccc;
        font-size: 14px;
      }

      .context-detail-item strong {
        color: #fff;
        margin-right: 8px;
      }

      .file-list, .decision-list, .conversation-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .file-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.05);
      }

      .file-icon {
        font-size: 18px;
      }

      .file-info {
        flex: 1;
      }

      .file-path {
        color: #4fc3f7;
        font-size: 13px;
        font-family: monospace;
        margin-bottom: 4px;
      }

      .file-meta {
        color: #888;
        font-size: 11px;
      }

      .file-summary {
        color: #ccc;
        font-size: 12px;
        margin-top: 6px;
        font-style: italic;
      }

      .decision-item {
        padding: 12px;
        background: rgba(76, 175, 80, 0.1);
        border-left: 3px solid #4caf50;
        border-radius: 4px;
      }

      .decision-topic {
        font-weight: 600;
        color: #4caf50;
        margin-bottom: 6px;
      }

      .decision-content {
        color: #ccc;
        font-size: 14px;
        margin-bottom: 4px;
      }

      .decision-reasoning {
        color: #888;
        font-size: 12px;
        font-style: italic;
        margin-top: 4px;
      }

      .decision-date {
        color: #666;
        font-size: 11px;
        margin-top: 6px;
      }

      .conversation-item {
        padding: 8px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 4px;
        display: flex;
        gap: 8px;
      }

      .conversation-item.user {
        background: rgba(79, 195, 247, 0.1);
      }

      .msg-role {
        font-weight: 600;
        color: #4fc3f7;
        min-width: 40px;
      }

      .msg-content {
        color: #ccc;
        font-size: 13px;
      }

      .context-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-top: 16px;
      }

      .stat-item {
        padding: 12px;
        background: linear-gradient(135deg, rgba(79, 195, 247, 0.1), rgba(33, 150, 243, 0.05));
        border-radius: 6px;
        text-align: center;
      }

      .stat-label {
        display: block;
        color: #999;
        font-size: 11px;
        margin-bottom: 4px;
      }

      .stat-value {
        display: block;
        color: #4fc3f7;
        font-size: 20px;
        font-weight: 600;
      }

      .modal-footer {
        padding: 16px 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }

      .btn-primary, .btn-secondary {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary {
        background: linear-gradient(135deg, #4fc3f7, #42a5f5);
        color: white;
      }

      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(79, 195, 247, 0.4);
      }

      .btn-secondary {
        background: rgba(255, 255, 255, 0.05);
        color: #ccc;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
    `;

    document.head.appendChild(styles);
  }
}

// Export singleton
export const enhancedContextUI = new EnhancedContextUI();