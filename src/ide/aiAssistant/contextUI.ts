/**
 * Context UI - User interface for managing context
 */

import { contextManager, ProjectContext } from './contextManager';

export class ContextUI {
  private modal: HTMLDivElement | null = null;

  /**
   * Show context setup modal
   */
  showContextModal(): void {
    this.createModal();
    this.populateCurrentContext();
  }

  /**
   * Create context modal
   */
  private createModal(): void {
    // Remove existing modal if any
    if (this.modal) {
      this.modal.remove();
    }

    const currentContext = contextManager.getProjectContext();

    this.modal = document.createElement('div');
    this.modal.className = 'context-modal-overlay';
    this.modal.innerHTML = `
      <div class="context-modal">
        <div class="context-modal-header">
          <h2>📋 Conversation Context Setup</h2>
          <button class="context-close-btn" title="Close">×</button>
        </div>
        
        <div class="context-modal-body">
          <div class="context-section">
            <label for="context-purpose">Purpose / Goal</label>
            <textarea 
              id="context-purpose" 
              placeholder="e.g., Building AI-powered code editor with real-time assistance"
              rows="3"
            >${currentContext?.purpose || ''}</textarea>
            <small>What are you trying to build or accomplish?</small>
          </div>

          <div class="context-row">
            <div class="context-section">
              <label for="context-project-name">Project Name</label>
              <input 
                type="text" 
                id="context-project-name" 
                placeholder="e.g., AI Code IDE"
                value="${currentContext?.projectName || ''}"
              />
            </div>

            <div class="context-section">
              <label for="context-project-type">Project Type</label>
              <select id="context-project-type">
                <option value="">Select type...</option>
                <option value="desktop-app">Desktop App</option>
                <option value="web-app">Web App</option>
                <option value="mobile-app">Mobile App</option>
                <option value="library">Library/Package</option>
                <option value="api">API/Backend</option>
                <option value="plugin">Plugin/Extension</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div class="context-section">
            <label for="context-tech-stack">Tech Stack</label>
            <input 
              type="text" 
              id="context-tech-stack" 
              placeholder="e.g., TypeScript, React, Monaco, Tauri"
              value="${currentContext?.techStack?.join(', ') || ''}"
            />
            <small>Comma-separated list of technologies</small>
          </div>

          <div class="context-section">
            <label for="context-phase">Development Phase</label>
            <select id="context-phase">
              <option value="planning">Planning</option>
              <option value="development">Development</option>
              <option value="testing">Testing</option>
              <option value="production">Production</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div class="context-info">
            <div class="context-info-icon">ℹ️</div>
            <div>
              <strong>Why set context?</strong>
              <p>This helps AI understand your project across all conversations, providing more relevant and specific assistance.</p>
            </div>
          </div>

          <div class="context-stats">
            <strong>Current Context:</strong>
            <p>${contextManager.getContextSummary()}</p>
          </div>
        </div>

        <div class="context-modal-footer">
          <button class="context-btn context-btn-secondary" id="context-clear-btn">
            Clear Context
          </button>
          <button class="context-btn context-btn-secondary" id="context-export-btn">
            Export
          </button>
          <button class="context-btn context-btn-secondary" id="context-import-btn">
            Import
          </button>
          <button class="context-btn context-btn-primary" id="context-save-btn">
            Save Context
          </button>
        </div>
      </div>
    `;

    // Add styles
    this.addStyles();

    // Add event listeners
    this.attachEventListeners();

    // Append to document
    document.body.appendChild(this.modal);

    // Set current values if they exist
    if (currentContext) {
      const typeSelect = this.modal.querySelector('#context-project-type') as HTMLSelectElement;
      const phaseSelect = this.modal.querySelector('#context-phase') as HTMLSelectElement;
      
      if (typeSelect) typeSelect.value = currentContext.projectType;
      if (phaseSelect) phaseSelect.value = currentContext.developmentPhase;
    }
  }

  /**
   * Populate modal with current context
   */
  private populateCurrentContext(): void {
    const context = contextManager.getProjectContext();
    if (!context || !this.modal) return;

    const purposeInput = this.modal.querySelector('#context-purpose') as HTMLTextAreaElement;
    const nameInput = this.modal.querySelector('#context-project-name') as HTMLInputElement;
    const typeSelect = this.modal.querySelector('#context-project-type') as HTMLSelectElement;
    const techInput = this.modal.querySelector('#context-tech-stack') as HTMLInputElement;
    const phaseSelect = this.modal.querySelector('#context-phase') as HTMLSelectElement;

    if (purposeInput) purposeInput.value = context.purpose;
    if (nameInput) nameInput.value = context.projectName;
    if (typeSelect) typeSelect.value = context.projectType;
    if (techInput) techInput.value = context.techStack.join(', ');
    if (phaseSelect) phaseSelect.value = context.developmentPhase;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.modal) return;

    // Close button
    const closeBtn = this.modal.querySelector('.context-close-btn');
    closeBtn?.addEventListener('click', () => this.closeModal());

    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // Save button
    const saveBtn = this.modal.querySelector('#context-save-btn');
    saveBtn?.addEventListener('click', () => this.saveContext());

    // Clear button
    const clearBtn = this.modal.querySelector('#context-clear-btn');
    clearBtn?.addEventListener('click', () => this.clearContext());

    // Export button
    const exportBtn = this.modal.querySelector('#context-export-btn');
    exportBtn?.addEventListener('click', () => this.exportContext());

    // Import button
    const importBtn = this.modal.querySelector('#context-import-btn');
    importBtn?.addEventListener('click', () => this.importContext());
  }

  /**
   * Save context
   */
  private saveContext(): void {
    if (!this.modal) return;

    const purpose = (this.modal.querySelector('#context-purpose') as HTMLTextAreaElement).value.trim();
    const projectName = (this.modal.querySelector('#context-project-name') as HTMLInputElement).value.trim();
    const projectType = (this.modal.querySelector('#context-project-type') as HTMLSelectElement).value;
    const techStackStr = (this.modal.querySelector('#context-tech-stack') as HTMLInputElement).value.trim();
    const developmentPhase = (this.modal.querySelector('#context-phase') as HTMLSelectElement).value;

    // Validate
    if (!purpose || !projectName || !projectType) {
      alert('Please fill in all required fields (Purpose, Project Name, Project Type)');
      return;
    }

    // Parse tech stack
    const techStack = techStackStr
      .split(',')
      .map(tech => tech.trim())
      .filter(tech => tech.length > 0);

    const projectContext: ProjectContext = {
      purpose,
      projectName,
      projectType,
      techStack,
      developmentPhase,
      timestamp: Date.now()
    };

    contextManager.setProjectContext(projectContext);

    // Show success feedback
    this.showSuccessFeedback();

    // Close modal
    setTimeout(() => this.closeModal(), 1000);
  }

  /**
   * Clear context
   */
  private clearContext(): void {
    if (confirm('Are you sure you want to clear all context? This cannot be undone.')) {
      contextManager.clearContext();
      this.closeModal();
    }
  }

  /**
   * Export context
   */
  private exportContext(): void {
    const contextJson = contextManager.exportContext();
    const blob = new Blob([contextJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-ide-context-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * Import context
   */
  private importContext(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const success = contextManager.importContext(content);
        
        if (success) {
          this.populateCurrentContext();
          alert('Context imported successfully!');
        } else {
          alert('Failed to import context. Please check the file format.');
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  }

  /**
   * Show success feedback
   */
  private showSuccessFeedback(): void {
    if (!this.modal) return;

    const saveBtn = this.modal.querySelector('#context-save-btn');
    if (saveBtn) {
      const originalText = saveBtn.textContent;
      saveBtn.textContent = '✓ Saved!';
      saveBtn.classList.add('context-btn-success');
      
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.classList.remove('context-btn-success');
      }, 2000);
    }
  }

  /**
   * Close modal
   */
  private closeModal(): void {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  /**
   * Add styles
   */
  private addStyles(): void {
    if (document.getElementById('context-ui-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'context-ui-styles';
    styles.textContent = `
      .context-modal-overlay {
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
        backdrop-filter: blur(4px);
      }

      .context-modal {
        background: #1e1e1e;
        border-radius: 12px;
        width: 90%;
        max-width: 600px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid #333;
      }

      .context-modal-header {
        padding: 20px 24px;
        border-bottom: 1px solid #333;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .context-modal-header h2 {
        margin: 0;
        font-size: 20px;
        color: #fff;
      }

      .context-close-btn {
        background: none;
        border: none;
        color: #999;
        font-size: 32px;
        cursor: pointer;
        line-height: 1;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .context-close-btn:hover {
        background: #333;
        color: #fff;
      }

      .context-modal-body {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
      }

      .context-section {
        margin-bottom: 20px;
      }

      .context-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 20px;
      }

      .context-section label {
        display: block;
        margin-bottom: 8px;
        color: #ccc;
        font-size: 14px;
        font-weight: 500;
      }

      .context-section input,
      .context-section textarea,
      .context-section select {
        width: 100%;
        background: #2d2d2d;
        border: 1px solid #444;
        border-radius: 6px;
        padding: 10px 12px;
        color: #fff;
        font-size: 14px;
        font-family: inherit;
        transition: all 0.2s;
      }

      .context-section input:focus,
      .context-section textarea:focus,
      .context-section select:focus {
        outline: none;
        border-color: #007acc;
        background: #333;
      }

      .context-section textarea {
        resize: vertical;
        min-height: 80px;
      }

      .context-section small {
        display: block;
        margin-top: 6px;
        color: #888;
        font-size: 12px;
      }

      .context-info {
        display: flex;
        gap: 12px;
        background: #264f78;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        border-left: 4px solid #007acc;
      }

      .context-info-icon {
        font-size: 24px;
        line-height: 1;
      }

      .context-info strong {
        display: block;
        margin-bottom: 6px;
        color: #fff;
      }

      .context-info p {
        margin: 0;
        color: #ccc;
        font-size: 13px;
        line-height: 1.5;
      }

      .context-stats {
        background: #252525;
        padding: 12px;
        border-radius: 6px;
        border: 1px solid #333;
      }

      .context-stats strong {
        display: block;
        margin-bottom: 6px;
        color: #ccc;
        font-size: 13px;
      }

      .context-stats p {
        margin: 0;
        color: #007acc;
        font-size: 13px;
      }

      .context-modal-footer {
        padding: 16px 24px;
        border-top: 1px solid #333;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }

      .context-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .context-btn-primary {
        background: #007acc;
        color: #fff;
      }

      .context-btn-primary:hover {
        background: #005a9e;
      }

      .context-btn-secondary {
        background: #333;
        color: #ccc;
      }

      .context-btn-secondary:hover {
        background: #444;
        color: #fff;
      }

      .context-btn-success {
        background: #0e7a0d !important;
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Create context indicator button
   */
  createContextIndicator(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'context-indicator-btn';
    button.title = 'Manage Context';
    button.innerHTML = `
      <span class="context-icon">📋</span>
      <span class="context-label">${this.getContextLabel()}</span>
    `;

    button.addEventListener('click', () => this.showContextModal());

    // Add indicator styles
    this.addIndicatorStyles();

    return button;
  }

  /**
   * Get context label
   */
  private getContextLabel(): string {
    const context = contextManager.getProjectContext();
    return context ? context.projectName : 'Set Context';
  }

  /**
   * Add indicator styles
   */
  private addIndicatorStyles(): void {
    if (document.getElementById('context-indicator-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'context-indicator-styles';
    styles.textContent = `
      .context-indicator-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #2d2d2d;
        border: 1px solid #444;
        border-radius: 6px;
        padding: 6px 12px;
        color: #ccc;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .context-indicator-btn:hover {
        background: #333;
        border-color: #007acc;
        color: #fff;
      }

      .context-icon {
        font-size: 16px;
        line-height: 1;
      }

      .context-label {
        font-weight: 500;
      }
    `;

    document.head.appendChild(styles);
  }
}

// Export singleton instance
export const contextUI = new ContextUI();
