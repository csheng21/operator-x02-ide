// ============================================================================
// 🎮 NEW GAME PROJECT WIZARD - Operator X02 Code IDE
// ============================================================================
// Beautiful wizard UI for creating new game projects
// ============================================================================

import { gameProjectManager, GAME_ENGINES, GAME_TEMPLATES, GameEngine, GameTemplate, GameProjectConfig } from '../gameProjectManager';

// ============================================================================
// WIZARD CLASS
// ============================================================================

class NewGameProjectWizard {
  private modal: HTMLElement | null = null;
  private currentStep: number = 1;
  private totalSteps: number = 3;
  
  private config: Partial<GameProjectConfig> = {
    engine: 'phaser',
    template: 'platformer',
    name: 'my-awesome-game',
    packageId: 'com.example.myawesomegame',
    version: '1.0.0',
    description: 'An awesome game made with Operator X02',
    author: '',
    resolution: { width: 800, height: 600 },
    orientation: 'landscape'
  };

  constructor() {
    this.injectStyles();
    console.log('[NewGameWizard] ✅ Initialized');
  }

  // ==========================================================================
  // SHOW/HIDE
  // ==========================================================================

  show(): void {
    if (this.modal) return;
    
    this.currentStep = 1;
    this.createModal();
    this.renderStep();
    
    // Animate in
    requestAnimationFrame(() => {
      this.modal?.classList.add('ngw-visible');
    });
  }

  hide(): void {
    if (!this.modal) return;
    
    this.modal.classList.remove('ngw-visible');
    setTimeout(() => {
      this.modal?.remove();
      this.modal = null;
    }, 300);
  }

  // ==========================================================================
  // CREATE MODAL
  // ==========================================================================

  private createModal(): void {
    this.modal = document.createElement('div');
    this.modal.className = 'ngw-overlay';
    this.modal.innerHTML = `
      <div class="ngw-modal">
        <div class="ngw-header">
          <div class="ngw-header-icon">🎮</div>
          <div class="ngw-header-text">
            <h2>New Game Project</h2>
            <p>Create a new game with AI-powered templates</p>
          </div>
          <button class="ngw-close" id="ngwClose">✕</button>
        </div>
        
        <div class="ngw-progress">
          <div class="ngw-progress-step active" data-step="1">
            <div class="ngw-step-num">1</div>
            <div class="ngw-step-label">Engine</div>
          </div>
          <div class="ngw-progress-line"></div>
          <div class="ngw-progress-step" data-step="2">
            <div class="ngw-step-num">2</div>
            <div class="ngw-step-label">Template</div>
          </div>
          <div class="ngw-progress-line"></div>
          <div class="ngw-progress-step" data-step="3">
            <div class="ngw-step-num">3</div>
            <div class="ngw-step-label">Details</div>
          </div>
        </div>
        
        <div class="ngw-content" id="ngwContent">
          <!-- Dynamic content -->
        </div>
        
        <div class="ngw-footer">
          <button class="ngw-btn ngw-btn-secondary" id="ngwBack" style="visibility: hidden;">
            ← Back
          </button>
          <div class="ngw-footer-spacer"></div>
          <button class="ngw-btn ngw-btn-secondary" id="ngwCancel">Cancel</button>
          <button class="ngw-btn ngw-btn-primary" id="ngwNext">
            Next →
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    if (!this.modal) return;

    this.modal.querySelector('#ngwClose')?.addEventListener('click', () => this.hide());
    this.modal.querySelector('#ngwCancel')?.addEventListener('click', () => this.hide());
    this.modal.querySelector('#ngwBack')?.addEventListener('click', () => this.prevStep());
    this.modal.querySelector('#ngwNext')?.addEventListener('click', () => this.nextStep());
    
    // Close on overlay click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.hide();
    });

    // ESC key
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.modal) {
      this.hide();
    }
  }

  // ==========================================================================
  // STEP NAVIGATION
  // ==========================================================================

  private nextStep(): void {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.renderStep();
    } else {
      this.createProject();
    }
  }

  private prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.renderStep();
    }
  }

  private renderStep(): void {
    const content = this.modal?.querySelector('#ngwContent') as HTMLElement;
    if (!content) return;

    // Update progress indicators
    this.modal?.querySelectorAll('.ngw-progress-step').forEach((step, index) => {
      step.classList.toggle('active', index + 1 <= this.currentStep);
      step.classList.toggle('current', index + 1 === this.currentStep);
    });

    // Update buttons
    const backBtn = this.modal?.querySelector('#ngwBack') as HTMLElement;
    const nextBtn = this.modal?.querySelector('#ngwNext') as HTMLElement;
    
    if (backBtn) backBtn.style.visibility = this.currentStep > 1 ? 'visible' : 'hidden';
    if (nextBtn) nextBtn.textContent = this.currentStep === this.totalSteps ? '✨ Create Project' : 'Next →';

    // Render step content
    switch (this.currentStep) {
      case 1:
        content.innerHTML = this.renderEngineStep();
        this.attachEngineListeners();
        break;
      case 2:
        content.innerHTML = this.renderTemplateStep();
        this.attachTemplateListeners();
        break;
      case 3:
        content.innerHTML = this.renderDetailsStep();
        this.attachDetailsListeners();
        break;
    }
  }

  // ==========================================================================
  // STEP 1: ENGINE SELECTION
  // ==========================================================================

  private renderEngineStep(): string {
    const engines = Object.values(GAME_ENGINES);
    
    return `
      <div class="ngw-step-content">
        <h3>Choose Game Engine</h3>
        <p class="ngw-step-desc">Select the game engine for your project</p>
        
        <div class="ngw-engine-grid">
          ${engines.map(engine => `
            <div class="ngw-engine-card ${this.config.engine === engine.id ? 'selected' : ''}" 
                 data-engine="${engine.id}">
              <div class="ngw-engine-icon">${engine.icon}</div>
              <div class="ngw-engine-name">${engine.name}</div>
              <div class="ngw-engine-desc">${engine.description}</div>
              <div class="ngw-engine-meta">
                <span class="ngw-engine-lang">${engine.languages[0]}</span>
                <span class="ngw-engine-diff ngw-diff-${engine.difficulty}">${engine.difficulty}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private attachEngineListeners(): void {
    this.modal?.querySelectorAll('.ngw-engine-card').forEach(card => {
      card.addEventListener('click', () => {
        this.modal?.querySelectorAll('.ngw-engine-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.config.engine = card.getAttribute('data-engine') as GameEngine;
      });
    });
  }

  // ==========================================================================
  // STEP 2: TEMPLATE SELECTION
  // ==========================================================================

  private renderTemplateStep(): string {
    const templates = Object.values(GAME_TEMPLATES);
    
    return `
      <div class="ngw-step-content">
        <h3>Choose Template</h3>
        <p class="ngw-step-desc">Start with a pre-built game template</p>
        
        <div class="ngw-template-grid">
          ${templates.map(template => `
            <div class="ngw-template-card ${this.config.template === template.id ? 'selected' : ''}" 
                 data-template="${template.id}">
              <div class="ngw-template-icon">${template.icon}</div>
              <div class="ngw-template-info">
                <div class="ngw-template-name">${template.name}</div>
                <div class="ngw-template-desc">${template.description}</div>
                <div class="ngw-template-features">
                  ${template.features.slice(0, 3).map(f => `<span>${f}</span>`).join('')}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private attachTemplateListeners(): void {
    this.modal?.querySelectorAll('.ngw-template-card').forEach(card => {
      card.addEventListener('click', () => {
        this.modal?.querySelectorAll('.ngw-template-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.config.template = card.getAttribute('data-template') as GameTemplate;
      });
    });
  }

  // ==========================================================================
  // STEP 3: PROJECT DETAILS
  // ==========================================================================

  private renderDetailsStep(): string {
    return `
      <div class="ngw-step-content ngw-details-step">
        <h3>Project Details</h3>
        <p class="ngw-step-desc">Configure your game project settings</p>
        
        <div class="ngw-form">
          <div class="ngw-form-row">
            <div class="ngw-form-group">
              <label>Project Name</label>
              <input type="text" id="ngwName" value="${this.config.name}" 
                     placeholder="my-awesome-game" />
            </div>
            <div class="ngw-form-group">
              <label>Version</label>
              <input type="text" id="ngwVersion" value="${this.config.version}" 
                     placeholder="1.0.0" />
            </div>
          </div>
          
          <div class="ngw-form-group">
            <label>Package ID</label>
            <input type="text" id="ngwPackageId" value="${this.config.packageId}" 
                   placeholder="com.example.mygame" />
            <span class="ngw-form-hint">Used for mobile builds</span>
          </div>
          
          <div class="ngw-form-group">
            <label>Description</label>
            <textarea id="ngwDescription" rows="2" 
                      placeholder="An awesome game...">${this.config.description}</textarea>
          </div>
          
          <div class="ngw-form-row">
            <div class="ngw-form-group">
              <label>Resolution</label>
              <div class="ngw-resolution-input">
                <input type="number" id="ngwWidth" value="${this.config.resolution?.width}" /> 
                <span>×</span>
                <input type="number" id="ngwHeight" value="${this.config.resolution?.height}" />
              </div>
            </div>
            <div class="ngw-form-group">
              <label>Orientation</label>
              <select id="ngwOrientation">
                <option value="landscape" ${this.config.orientation === 'landscape' ? 'selected' : ''}>Landscape</option>
                <option value="portrait" ${this.config.orientation === 'portrait' ? 'selected' : ''}>Portrait</option>
              </select>
            </div>
          </div>
          
          <div class="ngw-form-group">
            <label>Project Location</label>
            <div class="ngw-path-input">
              <input type="text" id="ngwPath" value="${this.config.path || ''}" 
                     placeholder="C:\\Projects" />
              <button class="ngw-btn-browse" id="ngwBrowse">Browse</button>
            </div>
          </div>
        </div>
        
        <div class="ngw-summary">
          <div class="ngw-summary-title">Summary</div>
          <div class="ngw-summary-item">
            <span>Engine:</span> 
            <strong>${GAME_ENGINES[this.config.engine!]?.name}</strong>
          </div>
          <div class="ngw-summary-item">
            <span>Template:</span> 
            <strong>${GAME_TEMPLATES[this.config.template!]?.name}</strong>
          </div>
        </div>
      </div>
    `;
  }

  private attachDetailsListeners(): void {
    const inputs = {
      name: this.modal?.querySelector('#ngwName') as HTMLInputElement,
      version: this.modal?.querySelector('#ngwVersion') as HTMLInputElement,
      packageId: this.modal?.querySelector('#ngwPackageId') as HTMLInputElement,
      description: this.modal?.querySelector('#ngwDescription') as HTMLTextAreaElement,
      width: this.modal?.querySelector('#ngwWidth') as HTMLInputElement,
      height: this.modal?.querySelector('#ngwHeight') as HTMLInputElement,
      orientation: this.modal?.querySelector('#ngwOrientation') as HTMLSelectElement,
      path: this.modal?.querySelector('#ngwPath') as HTMLInputElement
    };

    inputs.name?.addEventListener('input', (e) => {
      this.config.name = (e.target as HTMLInputElement).value;
      // Auto-generate package ID
      const cleanName = this.config.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      inputs.packageId.value = `com.example.${cleanName}`;
      this.config.packageId = inputs.packageId.value;
    });

    inputs.version?.addEventListener('input', (e) => {
      this.config.version = (e.target as HTMLInputElement).value;
    });

    inputs.packageId?.addEventListener('input', (e) => {
      this.config.packageId = (e.target as HTMLInputElement).value;
    });

    inputs.description?.addEventListener('input', (e) => {
      this.config.description = (e.target as HTMLTextAreaElement).value;
    });

    inputs.width?.addEventListener('input', (e) => {
      this.config.resolution!.width = parseInt((e.target as HTMLInputElement).value) || 800;
    });

    inputs.height?.addEventListener('input', (e) => {
      this.config.resolution!.height = parseInt((e.target as HTMLInputElement).value) || 600;
    });

    inputs.orientation?.addEventListener('change', (e) => {
      this.config.orientation = (e.target as HTMLSelectElement).value as 'landscape' | 'portrait';
    });

    inputs.path?.addEventListener('input', (e) => {
      this.config.path = (e.target as HTMLInputElement).value;
    });

    // Browse button
    this.modal?.querySelector('#ngwBrowse')?.addEventListener('click', async () => {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({ directory: true });
        if (selected) {
          inputs.path.value = selected as string;
          this.config.path = selected as string;
        }
      } catch (e) {
        // Fallback for non-Tauri
        console.log('Directory picker not available');
      }
    });
  }

  // ==========================================================================
  // CREATE PROJECT
  // ==========================================================================

  private async createProject(): Promise<void> {
    const nextBtn = this.modal?.querySelector('#ngwNext') as HTMLButtonElement;
    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.innerHTML = '<span class="ngw-spinner-small"></span> Creating...';
    }

    try {
      const result = await gameProjectManager.createProject(this.config as GameProjectConfig);
      
      if (result.success) {
        this.showSuccess(result.path!);
      } else {
        this.showError(result.error!);
      }
    } catch (error) {
      this.showError(String(error));
    }
  }

  private showSuccess(path: string): void {
    const content = this.modal?.querySelector('#ngwContent') as HTMLElement;
    if (!content) return;

    content.innerHTML = `
      <div class="ngw-success">
        <div class="ngw-success-icon">🎉</div>
        <h3>Project Created Successfully!</h3>
        <p>Your new game project is ready at:</p>
        <code>${path}</code>
        
        <div class="ngw-success-actions">
          <button class="ngw-btn ngw-btn-primary" id="ngwOpenProject">
            📂 Open Project
          </button>
          <button class="ngw-btn ngw-btn-secondary" id="ngwCloseSuccess">
            Close
          </button>
        </div>
        
        <div class="ngw-next-steps">
          <h4>Next Steps:</h4>
          <ol>
            <li>Run <code>npm install</code> to install dependencies</li>
            <li>Run <code>npm run dev</code> to start the dev server</li>
            <li>Open the Game Preview panel to see your game!</li>
          </ol>
        </div>
      </div>
    `;

    // Hide footer buttons
    const footer = this.modal?.querySelector('.ngw-footer') as HTMLElement;
    if (footer) footer.style.display = 'none';

    // Add listeners
    content.querySelector('#ngwOpenProject')?.addEventListener('click', () => {
      // Emit event to open project
      window.dispatchEvent(new CustomEvent('x02-open-project', { detail: { path } }));
      this.hide();
    });

    content.querySelector('#ngwCloseSuccess')?.addEventListener('click', () => {
      this.hide();
    });
  }

  private showError(error: string): void {
    const nextBtn = this.modal?.querySelector('#ngwNext') as HTMLButtonElement;
    if (nextBtn) {
      nextBtn.disabled = false;
      nextBtn.textContent = '✨ Create Project';
    }

    // Show error toast
    const toast = document.createElement('div');
    toast.className = 'ngw-toast ngw-toast-error';
    toast.innerHTML = `❌ ${error}`;
    this.modal?.appendChild(toast);

    setTimeout(() => toast.remove(), 5000);
  }

  // ==========================================================================
  // STYLES
  // ==========================================================================

  private injectStyles(): void {
    if (document.getElementById('ngw-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'ngw-styles';
    styles.textContent = `
      .ngw-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s;
        backdrop-filter: blur(4px);
      }
      
      .ngw-overlay.ngw-visible {
        opacity: 1;
      }
      
      .ngw-modal {
        background: #1e1e2e;
        border-radius: 16px;
        width: 700px;
        max-width: 95vw;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        border: 1px solid #333;
        transform: scale(0.95);
        transition: transform 0.3s;
      }
      
      .ngw-overlay.ngw-visible .ngw-modal {
        transform: scale(1);
      }
      
      .ngw-header {
        display: flex;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid #333;
        gap: 16px;
      }
      
      .ngw-header-icon {
        font-size: 40px;
      }
      
      .ngw-header-text h2 {
        margin: 0;
        color: #fff;
        font-size: 20px;
      }
      
      .ngw-header-text p {
        margin: 4px 0 0;
        color: #888;
        font-size: 14px;
      }
      
      .ngw-close {
        margin-left: auto;
        background: none;
        border: none;
        color: #666;
        font-size: 20px;
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        transition: all 0.2s;
      }
      
      .ngw-close:hover {
        background: #333;
        color: #fff;
      }
      
      .ngw-progress {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        gap: 8px;
        background: #252536;
      }
      
      .ngw-progress-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        opacity: 0.4;
        transition: opacity 0.3s;
      }
      
      .ngw-progress-step.active {
        opacity: 1;
      }
      
      .ngw-step-num {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #333;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: #888;
        transition: all 0.3s;
      }
      
      .ngw-progress-step.active .ngw-step-num {
        background: #00ff88;
        color: #000;
      }
      
      .ngw-progress-step.current .ngw-step-num {
        box-shadow: 0 0 0 4px rgba(0, 255, 136, 0.3);
      }
      
      .ngw-step-label {
        font-size: 12px;
        color: #888;
      }
      
      .ngw-progress-line {
        width: 60px;
        height: 2px;
        background: #333;
      }
      
      .ngw-content {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
      }
      
      .ngw-step-content h3 {
        margin: 0 0 8px;
        color: #fff;
        font-size: 18px;
      }
      
      .ngw-step-desc {
        margin: 0 0 20px;
        color: #888;
        font-size: 14px;
      }
      
      /* Engine Grid */
      .ngw-engine-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }
      
      .ngw-engine-card {
        background: #252536;
        border: 2px solid #333;
        border-radius: 12px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
      }
      
      .ngw-engine-card:hover {
        border-color: #444;
        transform: translateY(-2px);
      }
      
      .ngw-engine-card.selected {
        border-color: #00ff88;
        background: rgba(0, 255, 136, 0.1);
      }
      
      .ngw-engine-icon {
        font-size: 36px;
        margin-bottom: 8px;
      }
      
      .ngw-engine-name {
        font-weight: 600;
        color: #fff;
        margin-bottom: 4px;
      }
      
      .ngw-engine-desc {
        font-size: 12px;
        color: #888;
        margin-bottom: 8px;
      }
      
      .ngw-engine-meta {
        display: flex;
        justify-content: center;
        gap: 8px;
        font-size: 11px;
      }
      
      .ngw-engine-lang {
        background: #333;
        padding: 2px 8px;
        border-radius: 4px;
        color: #aaa;
      }
      
      .ngw-engine-diff {
        padding: 2px 8px;
        border-radius: 4px;
        text-transform: capitalize;
      }
      
      .ngw-diff-easy { background: #00aa66; color: #fff; }
      .ngw-diff-medium { background: #aa8800; color: #fff; }
      .ngw-diff-hard { background: #aa4444; color: #fff; }
      
      /* Template Grid */
      .ngw-template-grid {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .ngw-template-card {
        display: flex;
        align-items: center;
        gap: 16px;
        background: #252536;
        border: 2px solid #333;
        border-radius: 12px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .ngw-template-card:hover {
        border-color: #444;
      }
      
      .ngw-template-card.selected {
        border-color: #00ff88;
        background: rgba(0, 255, 136, 0.1);
      }
      
      .ngw-template-icon {
        font-size: 32px;
        width: 50px;
        text-align: center;
      }
      
      .ngw-template-name {
        font-weight: 600;
        color: #fff;
      }
      
      .ngw-template-desc {
        font-size: 13px;
        color: #888;
        margin: 4px 0;
      }
      
      .ngw-template-features {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      
      .ngw-template-features span {
        background: #333;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        color: #aaa;
      }
      
      /* Form */
      .ngw-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .ngw-form-row {
        display: flex;
        gap: 16px;
      }
      
      .ngw-form-group {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      
      .ngw-form-group label {
        font-size: 13px;
        color: #aaa;
        font-weight: 500;
      }
      
      .ngw-form-group input,
      .ngw-form-group select,
      .ngw-form-group textarea {
        background: #252536;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 10px 12px;
        color: #fff;
        font-size: 14px;
        transition: border-color 0.2s;
      }
      
      .ngw-form-group input:focus,
      .ngw-form-group select:focus,
      .ngw-form-group textarea:focus {
        outline: none;
        border-color: #00ff88;
      }
      
      .ngw-form-hint {
        font-size: 11px;
        color: #666;
      }
      
      .ngw-resolution-input {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .ngw-resolution-input input {
        width: 80px;
        text-align: center;
      }
      
      .ngw-resolution-input span {
        color: #666;
      }
      
      .ngw-path-input {
        display: flex;
        gap: 8px;
      }
      
      .ngw-path-input input {
        flex: 1;
      }
      
      .ngw-btn-browse {
        background: #333;
        border: none;
        padding: 10px 16px;
        border-radius: 8px;
        color: #fff;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .ngw-btn-browse:hover {
        background: #444;
      }
      
      .ngw-summary {
        margin-top: 20px;
        padding: 16px;
        background: #252536;
        border-radius: 8px;
        border: 1px solid #333;
      }
      
      .ngw-summary-title {
        font-weight: 600;
        color: #fff;
        margin-bottom: 12px;
      }
      
      .ngw-summary-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        color: #888;
        font-size: 14px;
      }
      
      .ngw-summary-item strong {
        color: #00ff88;
      }
      
      /* Footer */
      .ngw-footer {
        display: flex;
        align-items: center;
        padding: 16px 24px;
        border-top: 1px solid #333;
        gap: 12px;
      }
      
      .ngw-footer-spacer {
        flex: 1;
      }
      
      .ngw-btn {
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
      }
      
      .ngw-btn-primary {
        background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
        color: #000;
      }
      
      .ngw-btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
      }
      
      .ngw-btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      
      .ngw-btn-secondary {
        background: #333;
        color: #fff;
      }
      
      .ngw-btn-secondary:hover {
        background: #444;
      }
      
      /* Success */
      .ngw-success {
        text-align: center;
        padding: 20px;
      }
      
      .ngw-success-icon {
        font-size: 64px;
        margin-bottom: 16px;
      }
      
      .ngw-success h3 {
        color: #00ff88;
        margin-bottom: 12px;
      }
      
      .ngw-success p {
        color: #888;
        margin-bottom: 8px;
      }
      
      .ngw-success code {
        display: block;
        background: #252536;
        padding: 12px;
        border-radius: 8px;
        color: #fff;
        font-family: monospace;
        margin-bottom: 20px;
        word-break: break-all;
      }
      
      .ngw-success-actions {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin-bottom: 24px;
      }
      
      .ngw-next-steps {
        text-align: left;
        background: #252536;
        padding: 16px;
        border-radius: 8px;
      }
      
      .ngw-next-steps h4 {
        color: #fff;
        margin: 0 0 12px;
      }
      
      .ngw-next-steps ol {
        margin: 0;
        padding-left: 20px;
        color: #888;
      }
      
      .ngw-next-steps li {
        margin: 8px 0;
      }
      
      .ngw-next-steps code {
        background: #333;
        padding: 2px 6px;
        border-radius: 4px;
        color: #00ff88;
      }
      
      /* Toast */
      .ngw-toast {
        position: absolute;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        animation: ngw-toast-in 0.3s ease;
      }
      
      .ngw-toast-error {
        background: #aa4444;
        color: #fff;
      }
      
      @keyframes ngw-toast-in {
        from { opacity: 0; transform: translate(-50%, 20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
      
      .ngw-spinner-small {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid #333;
        border-top-color: #000;
        border-radius: 50%;
        animation: ngw-spin 1s linear infinite;
        vertical-align: middle;
        margin-right: 8px;
      }
      
      @keyframes ngw-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styles);
  }
}

// ============================================================================
// SINGLETON & GLOBAL ACCESS
// ============================================================================

export const newGameProjectWizard = new NewGameProjectWizard();
(window as any).newGameProjectWizard = newGameProjectWizard;

// Add menu command
(window as any).showNewGameProjectWizard = () => newGameProjectWizard.show();

console.log('[NewGameProjectWizard] Module loaded');
