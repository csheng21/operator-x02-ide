// ide/projectCreation/ui/modernModal.ts
// Complete Modern Project Creation Modal with AI-Generated README

// ============================================================================
// IMPORTS
// ============================================================================
import { getTemplateFiles } from './modernModalTemplates';
import { injectModalStyles } from './modernModalStyles';
import { invoke } from '@tauri-apps/api/core';
import {
  buildAiPrompt,
  callAiForSuggestions,
  parseAiResponse,
  validateSuggestion,
  getRandomExample,
  type ProjectTypeTemplates,
  type AiSuggestion
} from '../ai/aiProjectAdvisor';
import { notifyAIDirectly } from '../../../projectCreationIntegration';
//import { invoke } from '@tauri-apps/api/core';
// ============================================================================
// MAIN CLASS: ModernProjectModal
// ============================================================================
/**
 * Modern Project Creation Modal
 * Main class for project creation UI and logic
 */
export class ModernProjectModal {
  private modal: HTMLElement | null = null;
  private selectedType: string = 'web';
  private selectedTemplate: string = '';
  private projectName: string = 'my-awesome-app';
  private projectPath: string = 'C:\\Users\\hi\\Desktop\\projects';
  private currentProjectIdea: string = '';

  // ==========================================================================
  // PUBLIC METHOD: show
  // ==========================================================================
  /**
   * Show the modal dialog
   */
  show(): void {
    this.createModal();
    document.body.appendChild(this.modal!);
    this.attachEventListeners();
    this.loadTemplates(this.selectedType);
  }

  // ==========================================================================
  // PRIVATE METHOD: createModal
  // ==========================================================================
  /**
   * Create the modal HTML structure
   */
  private createModal(): void {
    const modal = document.createElement('div');
    modal.id = 'modern-project-modal';
    modal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-container">
          <div class="modal-header">
            <div class="header-content">
              <span class="header-icon">🚀</span>
              <h1 class="header-title">Create New Project</h1>
            </div>
            <button class="close-btn" id="close-modal">×</button>
          </div>

          <div class="modal-body">
            <div class="sidebar-section">
              <h3 class="section-title">PROJECT TYPE</h3>
              <div class="project-types" id="project-types">
                ${this.renderProjectTypes()}
              </div>
            </div>

            <div class="templates-section">
              ${this.renderAiAdvisor()}
              
              <h3 class="section-title">
                <span class="title-icon">🎨</span>
                Choose a Template
              </h3>
              <div class="templates-grid" id="templates-grid"></div>
            </div>

            <div class="preview-section">
              <h3 class="section-title">
                <span class="title-icon">👁️</span>
                Preview
              </h3>
              <div class="preview-content" id="preview-content">
                ${this.renderPreview()}
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <div class="footer-info">
              <span class="info-icon">⏱️</span>
              <span>Project will be created in ~5 seconds</span>
            </div>
            <div class="footer-actions">
              <button class="btn-cancel" id="cancel-btn">Cancel</button>
              <button class="btn-create" id="create-btn">
                <span>🚀</span>
                Create Project
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.injectStyles();
    this.modal = modal;
  }

  // ==========================================================================
  // PRIVATE METHOD: renderProjectTypes
  // ==========================================================================
  /**
   * Render project type sidebar items
   */
  private renderProjectTypes(): string {
    const types = [
      { id: 'web', icon: '🌐', name: 'Web Application', desc: 'Build modern web apps' },
      { id: 'desktop', icon: '🖥', name: 'Desktop App', desc: 'Cross-platform desktop' },
      { id: 'mobile', icon: '📱', name: 'Mobile App', desc: 'iOS & Android apps' },
      { id: 'backend', icon: '⚙️', name: 'Backend Service', desc: 'APIs & microservices' },
      { id: 'fullstack', icon: '🔄', name: 'Full-Stack', desc: 'Complete application' },
      { id: 'library', icon: '📦', name: 'Library/Package', desc: 'Reusable component' },
      { id: 'embedded', icon: '🔌', name: 'Embedded System', desc: 'IoT & hardware' }
    ];

    return types.map((type, index) => `
      <div class="project-type-item ${index === 0 ? 'active' : ''}" data-type="${type.id}">
        <span class="type-icon">${type.icon}</span>
        <div class="type-info">
          <div class="type-name">${type.name}</div>
          <div class="type-desc">${type.desc}</div>
        </div>
      </div>
    `).join('');
  }

  // ==========================================================================
  // PRIVATE METHOD: renderAiAdvisor
  // ==========================================================================
  /**
   * Render AI Advisor section
   */
  private renderAiAdvisor(): string {
    const randomExample = getRandomExample();
    
    return `
      <div class="ai-advisor-section-pro">
        <div class="advisor-header-pro">
          <div class="advisor-title-group">
            <svg class="advisor-icon-pro" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="advisor-text-group">
              <h3 class="advisor-title-pro">AI Project Advisor</h3>
              <span class="advisor-subtitle">Get intelligent template recommendations</span>
            </div>
          </div>
          <span class="advisor-badge-pro">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" fill="currentColor"/>
              <circle cx="6" cy="6" r="2" fill="white"/>
            </svg>
            BETA
          </span>
        </div>

        <div class="advisor-input-area-pro">
          <div class="input-wrapper-pro">
            <svg class="input-icon-pro" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <textarea 
              id="project-idea-input" 
              class="advisor-input-pro"
              placeholder="Describe your project (e.g., ${randomExample})"
              rows="2"
            ></textarea>
          </div>
          <button id="ask-ai-btn" class="ask-ai-btn-pro">
            <svg class="btn-icon-pro" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
            </svg>
            <span class="btn-text-pro">Analyze</span>
            <kbd class="btn-kbd-pro">Ctrl+Enter</kbd>
          </button>
        </div>

        <div id="ai-suggestions" class="ai-suggestions-pro" style="display: none;">
          <div class="suggestions-header-pro">
            <svg class="suggestions-icon-pro" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 8V12L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span class="suggestions-title-pro">Recommendations</span>
            <span class="minimized-badge" style="display: none;">1 result</span>
            <div class="suggestions-pulse"></div>
            <button id="minimize-suggestions-btn" class="minimize-btn-pro" title="Minimize recommendations">
              <svg class="minimize-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 15L12 9L6 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          <div id="ai-response" class="ai-response-content-pro"></div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // PRIVATE METHOD: setupAiAdvisor
  // ==========================================================================
  /**
   * Setup AI Advisor event listeners
   */
  private setupAiAdvisor(): void {
    const askBtn = document.getElementById('ask-ai-btn');
    const ideaInput = document.getElementById('project-idea-input') as HTMLTextAreaElement;

    if (askBtn && ideaInput) {
      askBtn.addEventListener('click', async () => {
        const idea = ideaInput.value.trim();
        if (!idea) {
          this.showAiError('Please describe your project idea first!');
          ideaInput.focus();
          return;
        }
        await this.getAiSuggestions(idea);
      });

      ideaInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          askBtn.click();
        }
      });

      ideaInput.addEventListener('input', () => {
        ideaInput.style.height = 'auto';
        ideaInput.style.height = Math.min(ideaInput.scrollHeight, 140) + 'px';
      });
    }

    this.setupMinimizeToggle();
  }

  // ==========================================================================
  // PRIVATE METHOD: setupMinimizeToggle
  // ==========================================================================
  /**
   * Setup minimize/expand toggle for AI suggestions
   */
  private setupMinimizeToggle(): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const minimizeBtn = target.closest('#minimize-suggestions-btn');
      
      if (minimizeBtn) {
        e.stopPropagation();
        this.toggleSuggestionsMinimize();
        return;
      }
      
      const headerClicked = target.closest('.suggestions-header-pro');
      const suggestionsDiv = document.getElementById('ai-suggestions');
      
      if (headerClicked && suggestionsDiv && suggestionsDiv.classList.contains('minimized')) {
        this.toggleSuggestionsMinimize();
      }
    });
  }

  // ==========================================================================
  // PRIVATE METHOD: toggleSuggestionsMinimize
  // ==========================================================================
  /**
   * Toggle minimize/expand state of suggestions
   */
  private toggleSuggestionsMinimize(): void {
    const responseDiv = document.getElementById('ai-response');
    const minimizeBtn = document.getElementById('minimize-suggestions-btn');
    const suggestionsDiv = document.getElementById('ai-suggestions');
    const minimizedBadge = document.querySelector('.minimized-badge') as HTMLElement;
    const pulseDot = document.querySelector('.suggestions-pulse') as HTMLElement;
    
    if (!responseDiv || !minimizeBtn || !suggestionsDiv) return;
    
    const isMinimized = suggestionsDiv.classList.contains('minimized');
    
    if (isMinimized) {
      suggestionsDiv.classList.remove('minimized');
      responseDiv.style.display = 'block';
      minimizeBtn.setAttribute('title', 'Minimize recommendations');
      if (minimizedBadge) minimizedBadge.style.display = 'none';
      if (pulseDot) pulseDot.style.display = 'block';
      responseDiv.style.animation = 'expandDown 0.3s ease-out';
    } else {
      suggestionsDiv.classList.add('minimized');
      responseDiv.style.display = 'none';
      minimizeBtn.setAttribute('title', 'Expand recommendations');
      if (minimizedBadge) minimizedBadge.style.display = 'inline-block';
      if (pulseDot) pulseDot.style.display = 'none';
      responseDiv.style.animation = 'collapseUp 0.3s ease-out';
    }
  }

  // ==========================================================================
  // PRIVATE METHOD: getAiSuggestions
  // ==========================================================================
  /**
   * Get AI suggestions for project idea
   */
  private async getAiSuggestions(projectIdea: string): Promise<void> {
    const askBtn = document.getElementById('ask-ai-btn') as HTMLButtonElement;
    const suggestionsDiv = document.getElementById('ai-suggestions');
    const responseDiv = document.getElementById('ai-response');

    if (!askBtn || !suggestionsDiv || !responseDiv) return;

    try {
      this.currentProjectIdea = projectIdea;

      askBtn.disabled = true;
      askBtn.innerHTML = `
        <svg class="spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 19.07L16.24 16.24M19.07 4.93L16.24 7.76M4.93 19.07L7.76 16.24M4.93 4.93L7.76 7.76" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>Analyzing...</span>
      `;
      suggestionsDiv.style.display = 'block';
      responseDiv.innerHTML = `
        <div class="ai-loading">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="60" stroke-dashoffset="40" opacity="0.3"/>
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="60" stroke-dashoffset="0" stroke-linecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
            </circle>
          </svg>
          Analyzing your project idea...
        </div>
      `;

      const templates: ProjectTypeTemplates = {
        web: this.getTemplatesForType('web'),
        mobile: this.getTemplatesForType('mobile'),
        backend: this.getTemplatesForType('backend'),
        desktop: this.getTemplatesForType('desktop'),
        fullstack: this.getTemplatesForType('fullstack'),
        library: this.getTemplatesForType('library'),
        embedded: this.getTemplatesForType('embedded')
      };

      const prompt = buildAiPrompt(projectIdea, templates);
      const aiResponse = await callAiForSuggestions(prompt);
      const suggestion = parseAiResponse(aiResponse);

      if (!validateSuggestion(suggestion.recommendedTemplate, templates)) {
        console.warn('?? AI suggested invalid template:', suggestion.recommendedTemplate);
      }

      this.displayAiSuggestions(suggestion, projectIdea);

    } catch (error) {
      console.error('? AI suggestion failed:', error);
      this.showAiError(
        error.message || 'Failed to get AI suggestions. Please try again or select a template manually.'
      );
    } finally {
      askBtn.disabled = false;
      askBtn.innerHTML = `
        <svg class="btn-icon-pro" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
        </svg>
        <span class="btn-text-pro">Analyze</span>
        <kbd class="btn-kbd-pro">Ctrl+Enter</kbd>
      `;
    }
  }

  // ==========================================================================
  // PRIVATE METHOD: displayAiSuggestions
  // ==========================================================================
  /**
   * Display AI suggestions in the UI
   */
  private displayAiSuggestions(suggestion: AiSuggestion, originalIdea: string): void {
    const responseDiv = document.getElementById('ai-response');
    if (!responseDiv) return;

    const html = this.generateProfessionalSuggestionHTML(suggestion, originalIdea);
    responseDiv.innerHTML = html;

    const applyBtn = responseDiv.querySelector('.apply-suggestion-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', async () => {
        const templateId = applyBtn.getAttribute('data-template');
        const typeId = applyBtn.getAttribute('data-type');
        
        if (templateId && typeId) {
          await this.applyAiSuggestion(typeId, templateId, suggestion);
        }
      });
    }

    responseDiv.style.animation = 'fadeInUp 0.3s ease-out';
  }

  // ==========================================================================
  // PRIVATE METHOD: generateProfessionalSuggestionHTML
  // ==========================================================================
  /**
   * Generate professional HTML for AI suggestion card
   */
  private generateProfessionalSuggestionHTML(suggestion: AiSuggestion, originalIdea: string): string {
    return `
      <div class="ai-suggestion-card">
        <div class="suggestion-main">
          <div class="suggestion-badge">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            RECOMMENDED
          </div>
          <h4 class="suggestion-title">Perfect Match Found</h4>
          <p class="suggestion-idea"><strong>Your Idea:</strong> "${originalIdea}"</p>
        </div>

        ${suggestion.recommendedTemplate ? `
        <div class="suggestion-template">
          <div class="template-info-pro">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <strong>Best Match: ${suggestion.recommendedTemplate}</strong>
          </div>
          <button class="apply-suggestion-btn" data-template="${suggestion.recommendedTemplate}" data-type="${suggestion.projectType}">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 7L18 12L13 17M6 12H18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Use Template
          </button>
        </div>
        ` : ''}

        ${suggestion.reasoning ? `
        <div class="suggestion-reasoning">
          <strong>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Why This Works
          </strong>
          <p>${suggestion.reasoning}</p>
        </div>
        ` : ''}

        ${suggestion.keyTechnologies ? `
        <div class="suggestion-tech">
          <strong>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.7 6.3C15.3 5.7 15.3 4.7 14.7 4.1C14.1 3.5 13.1 3.5 12.5 4.1L4 12.6L7.4 16L14.7 6.3ZM9.6 14.7L7.4 16L4 12.6L6.2 10.4L9.6 14.7ZM20 12.6L16.6 16L9.3 6.3C8.7 5.7 8.7 4.7 9.3 4.1C9.9 3.5 10.9 3.5 11.5 4.1L20 12.6Z" fill="currentColor"/>
            </svg>
            Key Technologies
          </strong>
          <p>${suggestion.keyTechnologies}</p>
        </div>
        ` : ''}

        ${suggestion.additionalSuggestions ? `
        <div class="suggestion-alternatives">
          <strong>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 12H20M4 6H20M4 18H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Alternatives
          </strong>
          <p>${suggestion.additionalSuggestions}</p>
        </div>
        ` : ''}
      </div>

      ${this.generateEnhancedAiResponseView(suggestion)}
    `;
  }

  // ==========================================================================
  // PRIVATE METHOD: generateEnhancedAiResponseView
  // ==========================================================================
  /**
   * Generate enhanced AI response viewer with structured sections
   */
  private generateEnhancedAiResponseView(suggestion: AiSuggestion): string {
    const sections = this.parseAiResponseIntoSections(suggestion.rawResponse);
    
    return `
      <div class="enhanced-ai-response">
        <details class="ai-response-details">
          <summary class="ai-response-summary">
            <div class="summary-left">
              <svg class="summary-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5" stroke="currentColor" stroke-width="2"/>
              </svg>
              <span class="summary-text">View Full AI Analysis</span>
              <span class="summary-badge">${sections.length} sections</span>
            </div>
            <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 9L12 16L5 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </summary>
          
          <div class="ai-response-content">
            <div class="response-header">
              <div class="response-meta">
                <div class="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                  <span>Generated just now</span>
                </div>
                <div class="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span>AI-powered recommendation</span>
                </div>
              </div>
              <button class="copy-response-btn" onclick="navigator.clipboard.writeText(\`${suggestion.rawResponse.replace(/`/g, '\\`')}\`)">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                  <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
                </svg>
                📋Copy
              </button>
            </div>

            <div class="response-sections">
              ${sections.map(section => this.renderResponseSection(section)).join('')}
            </div>

            <div class="response-footer">
              <div class="footer-note">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>This recommendation is based on your project description and current best practices.</span>
              </div>
            </div>
          </div>
        </details>
      </div>
    `;
  }

  // ==========================================================================
  // PRIVATE METHOD: parseAiResponseIntoSections
  // ==========================================================================
  /**
   * Parse AI response into structured sections
   */
  private parseAiResponseIntoSections(rawResponse: string): Array<{title: string, content: string, type: 'info' | 'code' | 'list'}> {
    const sections: Array<{title: string, content: string, type: 'info' | 'code' | 'list'}> = [];
    
    const lines = rawResponse.split('\n');
    let currentSection: {title: string, content: string, type: 'info' | 'code' | 'list'} | null = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.match(/^(RECOMMENDED TEMPLATE|PROJECT TYPE|WHY THIS TEMPLATE|ADDITIONAL SUGGESTIONS|KEY TECHNOLOGIES|REASONING|EXPLANATION):/i)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        
        const [title, ...contentParts] = trimmed.split(':');
        currentSection = {
          title: title.trim(),
          content: contentParts.join(':').trim(),
          type: 'info'
        };
      } else if (currentSection && trimmed) {
        currentSection.content += '\n' + trimmed;
      }
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    if (sections.length === 0) {
      sections.push({
        title: 'AI Response',
        content: rawResponse,
        type: 'info'
      });
    }
    
    return sections;
  }

  // ==========================================================================
  // PRIVATE METHOD: renderResponseSection
  // ==========================================================================
  /**
   * Render individual response section with icon
   */
  private renderResponseSection(section: {title: string, content: string, type: string}): string {
    const iconMap: Record<string, string> = {
      'RECOMMENDED TEMPLATE': `<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
      'PROJECT TYPE': `<svg viewBox="0 0 24 24" fill="none"><path d="M7 21h10M12 3v18m0-18L8 7m4-4l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
      'WHY THIS TEMPLATE': `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2"/></svg>`,
      'ADDITIONAL SUGGESTIONS': `<svg viewBox="0 0 24 24" fill="none"><path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="currentColor" stroke-width="2"/></svg>`,
      'KEY TECHNOLOGIES': `<svg viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3C15.3 5.7 15.3 4.7 14.7 4.1C14.1 3.5 13.1 3.5 12.5 4.1L4 12.6L7.4 16L14.7 6.3Z" fill="currentColor"/></svg>`
    };
    
    const icon = iconMap[section.title.toUpperCase()] || `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/></svg>`;
    
    return `
      <div class="response-section section-${section.type}">
        <div class="section-header">
          <div class="section-icon">${icon}</div>
          <h4 class="section-title">${this.formatSectionTitle(section.title)}</h4>
        </div>
        <div class="section-content">
          ${this.formatSectionContent(section.content, section.type)}
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // PRIVATE METHOD: formatSectionTitle
  // ==========================================================================
  /**
   * Format section title to title case
   */
  private formatSectionTitle(title: string): string {
    return title
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // ==========================================================================
  // PRIVATE METHOD: formatSectionContent
  // ==========================================================================
  /**
   * Format section content based on type
   */
  private formatSectionContent(content: string, type: string): string {
    content = content.trim();
    
    if (content.includes('\n-') || content.includes('\n•') || /\n\d+\./.test(content)) {
      const items = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          return line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '');
        });
      
      return `
        <ul class="content-list">
          ${items.map(item => `<li>${this.highlightContent(item)}</li>`).join('')}
        </ul>
      `;
    }
    
    return `<p class="content-text">${this.highlightContent(content)}</p>`;
  }

  // ==========================================================================
  // PRIVATE METHOD: highlightContent
  // ==========================================================================
  /**
   * Highlight important words and technical terms
   */
  private highlightContent(text: string): string {
    text = text.replace(/\b(react-vite|nextjs|vue3|svelte|angular|react-native|flutter|fastapi|express|django|raspberry|arduino|esp32)\b/gi, 
      '<code class="inline-code">$1</code>');
    
    text = text.replace(/\b(Python|JavaScript|TypeScript|GPIO|API|REST|GraphQL|MongoDB|PostgreSQL|React|Vue|Angular|Node\.js)\b/g, 
      '<span class="tech-term">$&</span>');
    
    return text;
  }

  // ==========================================================================
  // PRIVATE METHOD: applyAiSuggestion
  // ==========================================================================
  /**
   * Apply AI suggestion to UI
   */
  private async applyAiSuggestion(projectType: string, templateId: string, suggestion: AiSuggestion): Promise<void> {
    console.log('+---------------------------------------+');
    console.log(`?? Applying AI suggestion: ${projectType} -> ${templateId}`);
    console.log('+---------------------------------------+');

    const typeItems = document.querySelectorAll('.project-type-item');
    typeItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-type') === projectType) {
        item.classList.add('active');
        console.log(`? Activated sidebar item: ${projectType}`);
      }
    });

    this.selectedType = projectType;
    console.log(`? this.selectedType = "${this.selectedType}"`);
    
    console.log(`?? Loading templates for type: "${projectType}"`);
    this.loadTemplates(projectType);

    setTimeout(async () => {
      console.log(`?? Now selecting template: "${templateId}"`);
      
      const templateCards = document.querySelectorAll('.template-card');
      console.log(`?? Found ${templateCards.length} template cards after loading`);
      
      let templateFound = false;
      
      templateCards.forEach(card => {
        const cardTemplateId = card.getAttribute('data-template');
        console.log(`  Checking card: "${cardTemplateId}"`);
        
        card.classList.remove('active');
        card.querySelector('.selected-badge')?.remove();
        
        if (cardTemplateId === templateId) {
          console.log(`  ? MATCH! Activating card: "${cardTemplateId}"`);
          
          card.classList.add('active');
          
          const badge = document.createElement('div');
          badge.className = 'selected-badge';
          badge.textContent = '✅';
          card.appendChild(badge);
          
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (card as HTMLElement).style.animation = 'pulse 0.5s ease-out';
          
          templateFound = true;
        }
      });

      if (templateFound) {
        this.selectedTemplate = templateId;
        console.log(`? this.selectedTemplate = "${this.selectedTemplate}"`);
        
        const createBtn = document.getElementById('create-btn') as HTMLButtonElement;
        if (createBtn) {
          createBtn.disabled = true;
          createBtn.style.opacity = '0.6';
          createBtn.style.cursor = 'not-allowed';
          createBtn.innerHTML = `
            <svg class="spinner" style="width: 16px; height: 16px; animation: spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="60" stroke-dashoffset="40" opacity="0.3"/>
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="60" stroke-dashoffset="0" stroke-linecap="round">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
              </circle>
            </svg>
            <span>Generating AI README...</span>
          `;
        }
        
        console.log('? Waiting for AI README generation...');
        await this.generateCustomReadme(suggestion);
        console.log('? README generation complete!');
        
        if (createBtn) {
          createBtn.disabled = false;
          createBtn.style.opacity = '1';
          createBtn.style.cursor = 'pointer';
          createBtn.innerHTML = `
            <span>🚀</span>
            Create Project
          `;
        }
        
        this.showAiSuccess('? Template applied! Custom README ready. Click "Create Project" to proceed.');
        
        console.log('+---------------------------------------+');
        console.log('? AI SUGGESTION APPLIED SUCCESSFULLY');
        console.log('+---------------------------------------+');
      } else {
        console.error(`? Template "${templateId}" not found in loaded templates!`);
        this.showAiError(`Template "${templateId}" not found. Please select manually.`);
      }
    }, 500);
  }

  // ==========================================================================
  // PRIVATE METHOD: generateCustomReadme
  // ==========================================================================
  /**
   * Generate custom README using AI
   */
  private async generateCustomReadme(suggestion: AiSuggestion): Promise<void> {
    console.log('?? Generating custom README...');
    console.log('?? Project Idea:', this.currentProjectIdea);
    console.log('?? Template:', suggestion.recommendedTemplate);

    try {
      const readmePrompt = this.buildReadmePrompt(suggestion);
      console.log('?? Sending README prompt to AI...');
      
      const readmeContent = await callAiForSuggestions(readmePrompt);
      
      if (readmeContent && readmeContent.trim().length > 100) {
        const timestamp = new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const simpleFooter = `

---

*Generated: ${timestamp} | Project: ${this.projectName} | Location: ${this.projectPath}*
`;

        const finalReadme = readmeContent + simpleFooter;
        (window as any).__customReadme = finalReadme;
        
        console.log('? Custom README generated successfully with simple footer');
        console.log('?? Generation timestamp:', timestamp);
      } else {
        console.warn('?? AI returned empty or short README, using enhanced fallback');
        (window as any).__customReadme = this.generateEnhancedReadme(suggestion);
      }
    } catch (error) {
      console.error('? README generation failed:', error);
      console.log('?? Using enhanced fallback README with project details');
      (window as any).__customReadme = this.generateEnhancedReadme(suggestion);
    }
  }

  // ==========================================================================
  // PRIVATE METHOD: generateEnhancedReadme
  // ==========================================================================
  /**
   * Generate enhanced fallback README
   */
  private generateEnhancedReadme(suggestion: AiSuggestion): string {
    const projectIdea = this.currentProjectIdea || 'A new project';
    const template = suggestion.recommendedTemplate || this.selectedTemplate;
    const technologies = suggestion.keyTechnologies || 'Modern technologies';
    const reasoning = suggestion.reasoning || 'This template provides a solid foundation for your project.';
    const hardware = this.selectedType === 'embedded' || this.selectedType === 'mobile';

    const techDetails = this.getTechnologyDetails(template);

    let readme = `# ${this.projectName}

> ${projectIdea}

## ?? Project Overview

**Project Idea:** ${projectIdea}

**Recommended Template:** ${template}

**Why This Stack:** ${reasoning}

## ? Features

Based on your project requirements, this application will include:

- **Core Functionality**: Implementation of the main features described in your project idea
- **Modern Architecture**: Clean, maintainable code structure following best practices
- **Type Safety**: Full TypeScript support for better development experience
- **Developer Experience**: Hot Module Replacement (HMR) for fast development
- **Production Ready**: Optimized build configuration for deployment

## ??? Technologies Used

${technologies}

### Technology Stack Details

${techDetails}

## ?? Project Structure

\`\`\`
${this.projectName}/
${this.getProjectStructure(template)}
\`\`\`

## ??? Architecture

This project follows modern architectural patterns:

${this.getArchitectureDescription(template)}

## ?? Getting Started

### Prerequisites

${this.getPrerequisites(template)}

### Installation

\`\`\`bash
# Clone or navigate to the project directory
cd ${this.projectName}

# Install dependencies
${this.getInstallCommand(template)}
\`\`\`

## ?? Development

### Running the Development Server

\`\`\`bash
${this.getDevCommand(template)}
\`\`\`

${this.getDevServerInfo(template)}

### Building for Production

\`\`\`bash
${this.getBuildCommand(template)}
\`\`\`

## ?? Available Scripts

${this.getScripts(template)}

${hardware ? this.getHardwareSection(template) : ''}

## ?? Testing

\`\`\`bash
${this.getTestCommand(template)}
\`\`\`

## ?? Troubleshooting

### Common Issues

**Dependencies not installing**
- Delete \`node_modules\` and lock files
- Run the install command again
- Ensure you're using the correct Node.js version

**Development server not starting**
- Check if the port is already in use
- Verify all dependencies are installed
- Check for syntax errors in configuration files

${hardware && this.selectedType !== 'mobile' ? `
**Hardware connection issues**
- Verify physical connections
- Check device permissions
- Ensure drivers are installed
` : ''}

## ?? Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: \`git checkout -b feature-name\`
3. Commit your changes: \`git commit -am 'Add feature'\`
4. Push to the branch: \`git push origin feature-name\`
5. Submit a Pull Request

## ?? License

MIT License - feel free to use this project for learning or commercial purposes.
`;

    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    readme += `

---

*Generated: ${timestamp} | Project: ${this.projectName} | Location: ${this.projectPath}*
`;

    return readme;
  }

  // ==========================================================================
  // PRIVATE METHOD: getTechnologyDetails
  // ==========================================================================
  /**
   * Get technology details for template
   */
  private getTechnologyDetails(template: string): string {
    const details: Record<string, string> = {
      'react-vite': '- **React 18**: Latest React with concurrent features\n- **Vite**: Lightning-fast build tool with HMR\n- **TypeScript**: Type safety and better IDE support\n- **ESLint**: Code quality and consistency',
      'nextjs': '- **Next.js 14**: React framework with App Router\n- **Server Components**: Improved performance\n- **TypeScript**: Full type safety\n- **File-based Routing**: Intuitive page structure',
      'react-native': '- **React Native**: Cross-platform mobile development\n- **TypeScript**: Type-safe mobile apps\n- **Metro Bundler**: Fast refresh for mobile\n- **Native Modules**: Access to device features',
      'fastapi': '- **FastAPI**: Modern Python web framework\n- **Pydantic**: Data validation\n- **Uvicorn**: ASGI server\n- **Async Support**: High-performance async/await',
      'express': '- **Express.js**: Minimal Node.js framework\n- **TypeScript**: Type-safe backend\n- **CORS**: Cross-origin support\n- **Middleware**: Extensible architecture'
    };
    return details[template] || `- **${template}**: Professional-grade framework\n- **TypeScript**: Full type safety\n- **Modern tooling**: Latest development tools`;
  }

  // ==========================================================================
  // PRIVATE METHOD: getProjectStructure
  // ==========================================================================
  /**
   * Get project structure for template
   */
  private getProjectStructure(template: string): string {
    const structures: Record<string, string> = {
      'react-vite': '+-- src/\n¦   +-- App.tsx\n¦   +-- main.tsx\n¦   +-- components/\n+-- public/\n+-- index.html\n+-- vite.config.ts\n+-- package.json',
      'nextjs': '+-- src/\n¦   +-- app/\n¦       +-- page.tsx\n¦       +-- layout.tsx\n+-- public/\n+-- package.json',
      'react-native': '+-- App.tsx\n+-- index.js\n+-- android/\n+-- ios/\n+-- package.json',
      'fastapi': '+-- main.py\n+-- requirements.txt\n+-- .env',
      'express': '+-- src/\n¦   +-- index.ts\n+-- tsconfig.json\n+-- package.json'
    };
    return structures[template] || '+-- src/\n+-- config/\n+-- package.json';
  }

  // ==========================================================================
  // PRIVATE METHOD: getArchitectureDescription
  // ==========================================================================
  /**
   * Get architecture description for template
   */
  private getArchitectureDescription(template: string): string {
    if (template.includes('react')) {
      return '- **Component-Based**: Reusable UI components\n- **Unidirectional Data Flow**: Predictable state management\n- **Virtual DOM**: Efficient rendering';
    } else if (template.includes('api')) {
      return '- **RESTful API**: Standard HTTP methods\n- **Middleware Pattern**: Request/response processing\n- **Layered Architecture**: Separation of concerns';
    }
    return '- **Modular Design**: Clear separation of concerns\n- **Scalable Structure**: Easy to extend and maintain\n- **Best Practices**: Industry-standard patterns';
  }

  // ==========================================================================
  // PRIVATE METHOD: getPrerequisites
  // ==========================================================================
  /**
   * Get prerequisites for template
   */
  private getPrerequisites(template: string): string {
    if (template.includes('python') || template === 'fastapi' || template === 'django') {
      return '- Python 3.8 or higher\n- pip (Python package manager)';
    } else if (template === 'flutter') {
      return '- Flutter SDK\n- Dart SDK\n- Android Studio or Xcode';
    }
    return '- Node.js 18.x or higher\n- npm or yarn package manager';
  }

  // ==========================================================================
  // PRIVATE METHOD: getInstallCommand
  // ==========================================================================
  /**
   * Get install command for template
   */
  private getInstallCommand(template: string): string {
    if (template.includes('python') || template === 'fastapi' || template === 'django') {
      return 'pip install -r requirements.txt';
    }
    return 'npm install\n# or\nyarn install';
  }

  // ==========================================================================
  // PRIVATE METHOD: getDevCommand
  // ==========================================================================
  /**
   * Get dev command for template
   */
  private getDevCommand(template: string): string {
    const commands: Record<string, string> = {
      'react-vite': 'npm run dev',
      'nextjs': 'npm run dev',
      'react-native': 'npm start\n# Then in another terminal:\nnpm run android  # or npm run ios',
      'fastapi': 'uvicorn main:app --reload',
      'express': 'npm run dev'
    };
    return commands[template] || 'npm run dev';
  }

  // ==========================================================================
  // PRIVATE METHOD: getDevServerInfo
  // ==========================================================================
  /**
   * Get dev server info for template
   */
  private getDevServerInfo(template: string): string {
    if (template.includes('react') || template === 'vue3' || template === 'nextjs') {
      return 'The development server will start at `http://localhost:3000` with hot module replacement enabled.';
    } else if (template === 'fastapi') {
      return 'The API server will start at `http://localhost:8000` with auto-reload enabled.\nInteractive docs available at `http://localhost:8000/docs`';
    }
    return 'The development server will start with hot reload enabled.';
  }

  // ==========================================================================
  // PRIVATE METHOD: getBuildCommand
  // ==========================================================================
  /**
   * Get build command for template
   */
  private getBuildCommand(template: string): string {
    if (template.includes('python') || template === 'fastapi' || template === 'django') {
      return '# No build step required for Python\n# Deploy directly or use Docker';
    }
    return 'npm run build';
  }

  // ==========================================================================
  // PRIVATE METHOD: getScripts
  // ==========================================================================
  /**
   * Get scripts description for template
   */
  private getScripts(template: string): string {
    const scripts: Record<string, string> = {
      'react-vite': '- `npm run dev` - Start development server\n- `npm run build` - Build for production\n- `npm run preview` - Preview production build\n- `npm run lint` - Run ESLint',
      'nextjs': '- `npm run dev` - Start development server\n- `npm run build` - Build for production\n- `npm start` - Start production server\n- `npm run lint` - Run linting',
      'react-native': '- `npm start` - Start Metro bundler\n- `npm run android` - Run on Android\n- `npm run ios` - Run on iOS\n- `npm test` - Run tests',
      'fastapi': '- `uvicorn main:app --reload` - Start dev server\n- `uvicorn main:app` - Start production server\n- `pytest` - Run tests',
      'express': '- `npm run dev` - Start development with hot reload\n- `npm run build` - Compile TypeScript\n- `npm start` - Start production server'
    };
    return scripts[template] || '- `npm run dev` - Development mode\n- `npm run build` - Production build\n- `npm start` - Start application';
  }

  // ==========================================================================
  // PRIVATE METHOD: getTestCommand
  // ==========================================================================
  /**
   * Get test command for template
   */
  private getTestCommand(template: string): string {
    if (template.includes('python') || template === 'fastapi' || template === 'django') {
      return 'pytest';
    }
    return 'npm test';
  }

  // ==========================================================================
  // PRIVATE METHOD: getHardwareSection
  // ==========================================================================
  /**
   * Get hardware section for embedded/mobile templates
   */
  private getHardwareSection(template: string): string {
    if (this.selectedType === 'mobile') {
      return `
## ?? Mobile Development

### iOS Setup
1. Install Xcode from the Mac App Store
2. Install CocoaPods: \`sudo gem install cocoapods\`
3. Navigate to ios folder and run: \`pod install\`
4. Open \`.xcworkspace\` file in Xcode
5. Configure signing certificate
6. Connect your iOS device
7. Select your device and run

### Android Setup
1. Install Android Studio
2. Configure Android SDK (API 33 or higher)
3. Create a virtual device or connect a physical device
4. Enable USB debugging on your device
5. Run \`npm run android\`

### Device Requirements
- iOS 13.0 or higher / Android 6.0 (API 23) or higher
- Minimum 2GB RAM recommended
- Development machine: Mac for iOS, Mac/Windows/Linux for Android
`;
    } else if (this.selectedType === 'embedded') {
      return `
## ?? Hardware Setup

### Required Components
- Raspberry Pi 4 (recommended) or compatible board
- Power supply (5V, 3A minimum)
- MicroSD card (16GB minimum, 32GB recommended)
- Sensors/modules specific to your project

### Initial Setup
1. Flash Raspberry Pi OS to microSD card using Raspberry Pi Imager
2. Boot the Pi and complete initial configuration
3. Update system packages:
   \`\`\`bash
   sudo apt-get update
   sudo apt-get upgrade
   \`\`\`

4. Install project dependencies:
   \`\`\`bash
   sudo apt-get install python3-pip python3-dev
   pip3 install -r requirements.txt
   \`\`\`

### Wiring and Connections
- Refer to your specific sensor documentation
- Use GPIO pinout diagram for Raspberry Pi
- Test connections with a multimeter before powering on
- Follow proper ESD precautions

### GPIO Pin Reference
- Pin numbering: BCM (Broadcom) mode recommended
- Common pins: GPIO 2/3 (I2C), GPIO 14/15 (UART)
- Always check voltage levels (3.3V logic)
`;
    }
    return '';
  }

  // ==========================================================================
  // PRIVATE METHOD: buildReadmePrompt
  // ==========================================================================
  /**
   * Build README generation prompt for AI
   */
  private buildReadmePrompt(suggestion: AiSuggestion): string {
    const projectIdea = this.currentProjectIdea || 'A new project';
    const template = suggestion.recommendedTemplate || this.selectedTemplate;
    const technologies = suggestion.keyTechnologies || '';
    const hardware = this.selectedType === 'embedded' || this.selectedType === 'mobile';

    const templateFiles = getTemplateFiles(template);
    const fileList = Object.keys(templateFiles).sort();

    return `Generate a professional and comprehensive README.md file for this project:

  **Project Idea:** ${projectIdea}
  **Template:** ${template}
  **Key Technologies:** ${technologies}
  **Project Type:** ${this.selectedType}
  **Project Name:** ${this.projectName}

  **IMPORTANT - Files Created by This Template:**
  ${fileList.map(file => `- ${file}`).join('\n')}

  Please create a detailed README.md with the following sections:

  1. **Project Title and Description**
     - Clear introduction based on the project idea
     - Brief overview of what the project does

  2. **Features**
     - List specific features this project will have based on the idea
     - Include both current and planned features

  3. **Technologies Used**
     - Detailed list of technologies and why they were chosen
     - Version numbers and compatibility notes

  4. **?? Files Created by This Template**
     - Show the complete file structure in a code block
     - **CRITICAL: For EACH file listed above, explain:**
       * **What it does** - Purpose of the file
       * **Why it's needed** - Why this file is important
       * **How to use it** - How to work with this file
       * **When to edit it** - When you'd modify this file
     
     Example format:
     \`\`\`
     my-project/
     +-- README.md          # Project documentation (this file)
     +-- main.py            # Main application entry point
     +-- config.py          # Configuration settings
     +-- requirements.txt   # Python dependencies
     \`\`\`

     Then for each file:
     
     ### \`main.py\`
     **Purpose:** Main application entry point that controls...
     **What it does:** Initializes the system, runs the main loop...
     **How to use:** Run with \`python3 main.py\` to start...
     **When to edit:** Modify this when you want to change...

  5. **Project Structure Details**
     - Explain the folder organization
     - Show how files relate to each other
     - Describe the data flow between files

  6. **Architecture**
     - High-level architecture explanation
     - How different components interact
     - Data flow diagram (in text/ASCII if possible)

  7. **Installation & Setup**
     - Step-by-step installation instructions
     - Environment setup
     - Dependency installation
     - **IDE Integration Instructions:**
       * How to open this project in your IDE (VS Code, Cursor, etc.)
       * Recommended IDE extensions/plugins
       * How to configure the IDE for this project
       * Debug configuration steps
       * How to use the built-in terminal

  8. **Development Workflow**
     - How to run the project in development mode
     - **IDE-Specific Instructions:**
       * How to run from the IDE (click Run button, use terminal, etc.)
       * How to debug in the IDE (breakpoints, debug console)
       * Hot reload/auto-refresh setup
       * Terminal commands to use within the IDE
     - File watching and auto-reload

  9. **Usage Examples**
     - Code examples showing how to use the project
     - Common use cases
     - Sample output

  10. **Building & Deployment**
      - How to build for production
      - Deployment instructions
      - Environment variables

  11. **Scripts Explanation**
      - Explain each script in package.json (or equivalent)
      - When to use each script
      - What each script does internally

  ${hardware ? `
  12. **Hardware Requirements & Setup**
      - Required hardware components with specifications
      - Wiring diagrams (ASCII art or text description)
      - Pin mappings and GPIO reference
      - Hardware troubleshooting

  13. **Hardware Integration**
      - How to connect hardware to the system
      - Testing hardware connections
      - Safety precautions
  ` : ''}

  14. **Troubleshooting**
      - Common issues and solutions
      - Error messages and fixes
      - Debug tips specific to this setup

  15. **Development Tips**
      - Best practices for this project
      - Code organization tips
      - Testing recommendations
      - IDE tips and shortcuts

  16. **Contributing**
      - How to contribute
      - Code style guide
      - Pull request process

  17. **Resources & Documentation**
      - Links to official documentation
      - Useful tutorials
      - Community resources

  18. **License**
      - MIT License

  **CRITICAL REQUIREMENTS:**
  - Use clear, beginner-friendly language
  - Include code examples with syntax highlighting
  - The "Files Created" section MUST explain ALL ${fileList.length} files listed above
  - Provide actual file paths and file names
  - Explain technical terms when first used
  - Make it comprehensive enough that someone new can understand the entire project
  - Include specific IDE tips (VS Code, cursor.ai, or similar modern IDEs)
  - Add terminal commands that can be run directly in the IDE
  - Include debug configuration examples
  - Make it production-ready and professional

  **Style:**
  - Use emoji sparingly for section headers (?? ??? ?? etc.)
  - Use code blocks with language tags
  - Use tables for comparisons
  - Use checkboxes for setup steps
  - Make it scannable with clear headers

  IMPORTANT: Output ONLY the README.md content in markdown format, no additional commentary.`;
  }

  // ==========================================================================
  // PRIVATE METHOD: showAiError
  // ==========================================================================
  /**
   * Show AI error message
   */
  private showAiError(message: string): void {
    const responseDiv = document.getElementById('ai-response');
    const suggestionsDiv = document.getElementById('ai-suggestions');
    
    if (responseDiv && suggestionsDiv) {
      suggestionsDiv.style.display = 'block';
      responseDiv.innerHTML = `
        <div class="ai-error">
          <div class="error-icon-pro">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="12" cy="16" r="1" fill="currentColor"/>
            </svg>
          </div>
          <div class="error-content">
            <strong>Unable to Process Request</strong>
            <p>${message}</p>
          </div>
        </div>
      `;
    }
  }

  // ==========================================================================
  // PRIVATE METHOD: showAiSuccess
  // ==========================================================================
  /**
   * Show AI success message
   */
  private showAiSuccess(message: string): void {
    const responseDiv = document.getElementById('ai-response');
    
    if (responseDiv) {
      const successMsg = document.createElement('div');
      successMsg.className = 'ai-success-toast';
      successMsg.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ${message}
      `;
      responseDiv.insertBefore(successMsg, responseDiv.firstChild);
      
      setTimeout(() => {
        successMsg.style.opacity = '0';
        setTimeout(() => successMsg.remove(), 300);
      }, 3000);
    }
  }

  // ==========================================================================
  // PRIVATE METHOD: renderPreview
  // ==========================================================================
  /**
   * Render preview section
   */
  private renderPreview(): string {
    return `
      <div class="preview-block">
        <div class="preview-label">PROJECT NAME</div>
        <input 
          type="text" 
          id="project-name-input" 
          class="preview-input"
          value="${this.projectName}"
          placeholder="my-awesome-app"
        />
        <div class="input-hint">Use lowercase with hyphens (e.g., my-app)</div>
      </div>

      <div class="preview-block">
        <div class="preview-label">PROJECT LOCATION</div>
        <div class="preview-path-container">
          <input 
            type="text" 
            id="project-path-input" 
            class="preview-path-input"
            value="${this.projectPath}"
            placeholder="C:\\Users\\hi\\Desktop\\projects"
            readonly
          />
          <button id="browse-path-btn" class="browse-btn" title="Browse for folder">📂</button>
        </div>
        
        <div class="quick-paths">
          <button class="quick-path-btn" data-path="desktop" title="Set to Desktop">🖥️ Desktop</button>
          <button class="quick-path-btn" data-path="documents" title="Set to Documents">📄 Documents</button>
          <button class="quick-path-btn" data-path="home" title="Set to Home">🏠 Home</button>
        </div>
        
        <div class="input-hint">Click 📂 to browse or use quick buttons</div>
      </div>

      <div class="preview-block">
        <div class="preview-label">FULL PATH</div>
        <div class="preview-path-display" id="full-path-display">
          ${this.projectPath}\\${this.projectName}
        </div>
        <div class="input-hint">Final project location</div>
      </div>

      <div class="preview-block">
        <div class="preview-label">WILL CREATE</div>
        <div class="preview-list" id="preview-list">
          <div class="preview-item">✔️ Project folder structure</div>
          <div class="preview-item">✔️ Package.json with dependencies</div>
          <div class="preview-item">✔️ TypeScript configuration</div>
          <div class="preview-item">✔️ Source files & components</div>
          <div class="preview-item">✔️ Custom AI-generated README.md</div>
        </div>
      </div>

      <div class="preview-block">
        <div class="preview-label">TECHNOLOGIES</div>
        <div class="preview-list" id="preview-tech">
          <div class="preview-item">✔️ React 18</div>
          <div class="preview-item">✔️ TypeScript 5</div>
          <div class="preview-item">✔️ Vite 5</div>
          <div class="preview-item">✔️ ESLint</div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // PRIVATE METHOD: loadTemplates
  // ==========================================================================
  /**
   * Load templates for selected type
   */
  private loadTemplates(type: string): void {
    console.log('+---------------------------------------+');
    console.log(`?? Loading templates for type: "${type}"`);
    console.log('+---------------------------------------+');
    
    const grid = document.getElementById('templates-grid');
    if (!grid) {
      console.error('? templates-grid element not found!');
      return;
    }

    const templates = this.getTemplatesForType(type);
    console.log(`?? Found ${templates.length} templates for type "${type}":`);
    templates.forEach((t, idx) => {
      console.log(`  ${idx + 1}. id: "${t.id}", name: "${t.name}"`);
    });
    
    grid.innerHTML = templates.map((template, index) => {
      console.log(`?? Rendering card ${index + 1}: "${template.id}" ${index === 0 ? '(default active)' : ''}`);
      return `
        <div class="template-card ${index === 0 ? 'active' : ''}" data-template="${template.id}">
          <div class="template-icon-wrapper">
            <span class="template-icon">${template.icon}</span>
          </div>
          <div class="template-info">
            <div class="template-name">${template.name}</div>
            <div class="template-desc">${template.description}</div>
          </div>
          ${index === 0 ? '<div class="selected-badge">✅</div>' : ''}
        </div>
      `;
    }).join('');

    console.log('? Template cards HTML generated');

    this.attachTemplateListeners();
    
    if (templates.length > 0) {
      const defaultTemplate = templates[0].id;
      this.selectedTemplate = defaultTemplate;
      console.log(`? Default template auto-selected: "${this.selectedTemplate}"`);
    } else {
      console.warn('?? No templates found for this type!');
    }
    
    console.log('+---------------------------------------+');
  }

  // ==========================================================================
  // PRIVATE METHOD: getTemplatesForType
  // ==========================================================================
  /**
   * Get templates array for project type
   */
  private getTemplatesForType(type: string): any[] {
    const templates: Record<string, any[]> = {
      web: [
        { id: 'react-vite', icon: '⚛️', name: 'React + Vite', description: 'Fast, modern React with Vite bundler' },
        { id: 'nextjs', icon: '▲', name: 'Next.js', description: 'React framework with SSR' },
        { id: 'vue3', icon: '💚', name: 'Vue 3', description: 'Progressive JavaScript framework' },
        { id: 'svelte', icon: '🔥', name: 'Svelte', description: 'Cybernetically enhanced web apps' },
        { id: 'angular', icon: '🅰️', name: 'Angular', description: 'Platform for building mobile and desktop' }
      ],
      mobile: [
        { id: 'react-native', icon: '📱', name: 'React Native', description: 'Build native apps with React' },
        { id: 'flutter', icon: '🦋', name: 'Flutter', description: 'Beautiful native apps' },
        { id: 'ionic', icon: '⚡', name: 'Ionic', description: 'Hybrid mobile apps' },
        { id: 'expo', icon: '📲', name: 'Expo', description: 'React Native with managed workflow' },
        { id: 'android-kotlin', icon: '🤖', name: 'Android Kotlin', description: 'Native Android with Jetpack Compose' }
      ],
      backend: [
        { id: 'fastapi', icon: '⚡', name: 'FastAPI', description: 'Modern Python API framework' },
        { id: 'express', icon: '🚂', name: 'Express.js', description: 'Node.js web framework' },
        { id: 'django', icon: '🐍', name: 'Django', description: 'High-level Python framework' },
        { id: 'nestjs', icon: '🐱', name: 'NestJS', description: 'Progressive Node.js framework' }
      ],
      desktop: [
        { id: 'electron', icon: '⚡', name: 'Electron', description: 'Build cross-platform desktop apps' },
        { id: 'tauri', icon: '🦀', name: 'Tauri', description: 'Build smaller, faster desktop apps' },
        { id: 'neutralino', icon: '🧊', name: 'Neutralino', description: 'Lightweight cross-platform apps' }
      ],
      fullstack: [
        { id: 'mern', icon: '🥞', name: 'MERN Stack', description: 'MongoDB, Express, React, Node.js' },
        { id: 't3', icon: '🔺', name: 'T3 Stack', description: 'Next.js, tRPC, Prisma, Tailwind' },
        { id: 'redwood', icon: '🌲', name: 'RedwoodJS', description: 'Full-stack React framework' }
      ],
      library: [
        { id: 'npm-lib', icon: '📦', name: 'NPM Package', description: 'JavaScript/TypeScript library' },
        { id: 'react-lib', icon: '⚛️', name: 'React Component', description: 'Reusable React component library' },
        { id: 'vue-lib', icon: '💚', name: 'Vue Component', description: 'Vue 3 component library' }
      ],
      embedded: [
        { id: 'arduino', icon: '🔌', name: 'Arduino', description: 'Arduino project' },
        { id: 'esp32', icon: '📡', name: 'ESP32', description: 'ESP32 IoT project' },
        { id: 'raspberry', icon: '🍓', name: 'Raspberry Pi', description: 'Raspberry Pi project' },
      { id: 'jetson-cuda', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="28" height="28" style="display:inline-block;vertical-align:middle;"> <!-- outer chip body --> <rect x="7" y="7" width="18" height="18" rx="3" fill="#76B900"/> <!-- inner dark recess --> <rect x="10" y="10" width="12" height="12" rx="2" fill="#1a1a1a"/> <!-- GPU cores grid (4 green squares) --> <rect x="11.5" y="11.5" width="4" height="4" rx="0.8" fill="#76B900"/> <rect x="16.5" y="11.5" width="4" height="4" rx="0.8" fill="#76B900"/> <rect x="11.5" y="16.5" width="4" height="4" rx="0.8" fill="#76B900"/> <rect x="16.5" y="16.5" width="4" height="4" rx="0.8" fill="#76B900"/> <!-- pins left --> <rect x="3" y="10" width="3" height="2" rx="0.5" fill="#76B900"/> <rect x="3" y="15" width="3" height="2" rx="0.5" fill="#76B900"/> <rect x="3" y="20" width="3" height="2" rx="0.5" fill="#76B900"/> <!-- pins right --> <rect x="26" y="10" width="3" height="2" rx="0.5" fill="#76B900"/> <rect x="26" y="15" width="3" height="2" rx="0.5" fill="#76B900"/> <rect x="26" y="20" width="3" height="2" rx="0.5" fill="#76B900"/> <!-- pins top --> <rect x="10" y="3" width="2" height="3" rx="0.5" fill="#76B900"/> <rect x="15" y="3" width="2" height="3" rx="0.5" fill="#76B900"/> <rect x="20" y="3" width="2" height="3" rx="0.5" fill="#76B900"/> <!-- pins bottom --> <rect x="10" y="26" width="2" height="3" rx="0.5" fill="#76B900"/> <rect x="15" y="26" width="2" height="3" rx="0.5" fill="#76B900"/> <rect x="20" y="26" width="2" height="3" rx="0.5" fill="#76B900"/> </svg>', name: 'Jetson / CUDA', description: 'NVIDIA Jetson AI project' }
      ]
    };

    return templates[type] || templates.web;
  }

  // ==========================================================================
  // PRIVATE METHOD: setupPathSelection
  // ==========================================================================
  /**
   * Setup path selection event listeners
   */
  private setupPathSelection(): void {
    const nameInput = document.getElementById('project-name-input') as HTMLInputElement;
    const pathInput = document.getElementById('project-path-input') as HTMLInputElement;
    const browseBtn = document.getElementById('browse-path-btn');
    const fullPathDisplay = document.getElementById('full-path-display');

    if (nameInput) {
      nameInput.addEventListener('input', (e) => {
        this.projectName = (e.target as HTMLInputElement).value.trim();
        this.updateFullPath(fullPathDisplay);
      });

      nameInput.addEventListener('blur', () => {
        let name = nameInput.value.trim();
        name = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        if (name) {
          nameInput.value = name;
          this.projectName = name;
          this.updateFullPath(fullPathDisplay);
        }
      });
    }

    if (browseBtn) {
      browseBtn.addEventListener('click', async () => {
        await this.selectFolder(pathInput, fullPathDisplay);
      });
    }

    if (pathInput) {
      pathInput.addEventListener('dblclick', () => {
        pathInput.removeAttribute('readonly');
        pathInput.select();
        pathInput.style.cursor = 'text';
      });

      pathInput.addEventListener('blur', () => {
        pathInput.setAttribute('readonly', 'readonly');
        pathInput.style.cursor = 'pointer';
        this.projectPath = pathInput.value;
        this.updateFullPath(fullPathDisplay);
      });

      pathInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          pathInput.blur();
        } else if (e.key === 'Escape') {
          pathInput.value = this.projectPath;
          pathInput.blur();
        }
      });
    }

    document.querySelectorAll('.quick-path-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pathType = (btn as HTMLElement).dataset.path;
        let quickPath = '';
        
        switch(pathType) {
          case 'desktop':
            quickPath = this.getDesktopPath();
            break;
          case 'documents':
            quickPath = this.getDocumentsPath();
            break;
          case 'home':
            quickPath = this.getHomePath();
            break;
        }
        
        if (quickPath && pathInput) {
          this.projectPath = quickPath;
          pathInput.value = quickPath;
          this.updateFullPath(fullPathDisplay);
        }
      });
    });
  }

  // ==========================================================================
  // PRIVATE METHOD: selectFolder
  // ==========================================================================
  /**
   * Open folder selection dialog
   */
  private async selectFolder(pathInput: HTMLInputElement, fullPathDisplay: HTMLElement | null): Promise<void> {
    console.log('?? Opening folder picker...');
    
    if ((window as any).__TAURI__?.dialog) {
      try {
        const dialog = (window as any).__TAURI__.dialog;
        
        const selected = await dialog.open({
          directory: true,
          multiple: false,
          title: 'Select Project Location',
          defaultPath: this.projectPath
        });
        
        if (selected && typeof selected === 'string') {
          this.projectPath = selected;
          pathInput.value = selected;
          this.updateFullPath(fullPathDisplay);
          console.log('? Selected path:', selected);
          return;
        }
      } catch (error) {
        console.error('? Tauri dialog failed:', error);
      }
    }
    
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'desktop'
        });
        
        if (dirHandle) {
          const path = await this.getFullPathFromHandle(dirHandle);
          
          this.projectPath = path;
          pathInput.value = path;
          this.updateFullPath(fullPathDisplay);
          console.log('? Selected directory:', path);
          
          (window as any).__selectedDirHandle = dirHandle;
          return;
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('? Directory picker failed:', error);
        }
      }
    }
    
    console.log('?? Using fallback manual input');
    this.showFallbackPathDialog(pathInput, fullPathDisplay);
  }

  // ==========================================================================
  // PRIVATE METHOD: getFullPathFromHandle
  // ==========================================================================
  /**
   * Get full path from directory handle
   */
  private async getFullPathFromHandle(dirHandle: any): Promise<string> {
    try {
      if (dirHandle.getFilePath) {
        return await dirHandle.getFilePath();
      }
      
      const dirName = dirHandle.name;
      
      if (this.projectPath && this.projectPath !== 'C:\\Users\\hi\\Desktop\\projects') {
        const separator = this.projectPath.includes('\\') ? '\\' : '/';
        return `${this.projectPath}${separator}${dirName}`;
      }
      
      return dirName;
    } catch (error) {
      return dirHandle.name;
    }
  }

  // ==========================================================================
  // PRIVATE METHOD: showFallbackPathDialog
  // ==========================================================================
  /**
   * Show fallback path input dialog
   */
  private showFallbackPathDialog(pathInput: HTMLInputElement, fullPathDisplay: HTMLElement | null): void {
    const modalHTML = `
      <div id="path-input-modal" style="
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: #1e1e1e; border: 2px solid #007acc; border-radius: 8px;
        padding: 24px; z-index: 20000; min-width: 500px; box-shadow: 0 10px 40px rgba(0,0,0,0.8);
      ">
        <h3 style="margin: 0 0 16px 0; color: #fff; font-size: 16px;">📂 Enter Project Location</h3>
        <input 
          type="text" 
          id="manual-path-input" 
          value="${this.projectPath}"
          placeholder="C:\\Users\\YourName\\Desktop\\projects"
          style="width: 100%; padding: 12px; background: #0a0a0a; border: 1px solid #3e3e42;
                 border-radius: 4px; color: #4FC3F7; font-family: 'Consolas', monospace;
                 font-size: 13px; box-sizing: border-box;"
        />
        <div style="margin-top: 12px; font-size: 11px; color: #666; line-height: 1.6;">
          <strong style="color: #999;">Common locations:</strong><br>
          • Desktop: <code style="background: #0a0a0a; padding: 2px 6px; border-radius: 3px;">${this.getDesktopPath()}</code><br>
          • Documents: <code style="background: #0a0a0a; padding: 2px 6px; border-radius: 3px;">${this.getDocumentsPath()}</code><br>
          • Home: <code style="background: #0a0a0a; padding: 2px 6px; border-radius: 3px;">${this.getHomePath()}</code>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;">
          <button id="cancel-path-btn" style="padding: 10px 20px; background: transparent;
                  border: 1px solid #3e3e42; color: #ccc; border-radius: 4px; cursor: pointer;">Cancel</button>
          <button id="confirm-path-btn" style="padding: 10px 20px; background: #007acc; border: none;
                  color: white; border-radius: 4px; cursor: pointer;">Confirm</button>
        </div>
      </div>
      <div id="path-modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0;
           background: rgba(0,0,0,0.7); backdrop-filter: blur(3px); z-index: 19999;"></div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.getElementById('path-input-modal');
    const overlay = document.getElementById('path-modal-overlay');
    const input = document.getElementById('manual-path-input') as HTMLInputElement;
    const confirmBtn = document.getElementById('confirm-path-btn');
    const cancelBtn = document.getElementById('cancel-path-btn');
    
    input?.focus();
    input?.select();
    
    const closeModal = () => {
      modal?.remove();
      overlay?.remove();
    };
    
    confirmBtn?.addEventListener('click', () => {
      const newPath = input?.value.trim();
      if (newPath) {
        this.projectPath = newPath;
        pathInput.value = newPath;
        this.updateFullPath(fullPathDisplay);
      }
      closeModal();
    });
    
    cancelBtn?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', closeModal);
    
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        confirmBtn?.click();
      } else if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  // ==========================================================================
  // PRIVATE METHOD: getDesktopPath
  // ==========================================================================
  /**
   * Get desktop path
   */
  private getDesktopPath(): string {
    const userProfile = (window as any).__systemInfo?.homedir || '';
    if (userProfile) {
      const isWindows = userProfile.includes('\\');
      return isWindows ? `${userProfile}\\Desktop` : `${userProfile}/Desktop`;
    }
    return 'C:\\Users\\YourName\\Desktop';
  }

  // ==========================================================================
  // PRIVATE METHOD: getDocumentsPath
  // ==========================================================================
  /**
   * Get documents path
   */
  private getDocumentsPath(): string {
    const userProfile = (window as any).__systemInfo?.homedir || '';
    if (userProfile) {
      const isWindows = userProfile.includes('\\');
      return isWindows ? `${userProfile}\\Documents` : `${userProfile}/Documents`;
    }
    return 'C:\\Users\\YourName\\Documents';
  }

  // ==========================================================================
  // PRIVATE METHOD: getHomePath
  // ==========================================================================
  /**
   * Get home path
   */
  private getHomePath(): string {
    return (window as any).__systemInfo?.homedir || 'C:\\Users\\YourName';
  }

  // ==========================================================================
  // PRIVATE METHOD: updateFullPath
  // ==========================================================================
  /**
   * Update full path display
   */
  private updateFullPath(fullPathDisplay: HTMLElement | null): void {
    if (fullPathDisplay) {
      const separator = this.projectPath.includes('\\') ? '\\' : '/';
      const fullPath = `${this.projectPath}${separator}${this.projectName}`;
      fullPathDisplay.textContent = fullPath;
    }
  }

  // ==========================================================================
  // PRIVATE METHOD: attachEventListeners
  // ==========================================================================
  /**
   * Attach all event listeners
   */
  private attachEventListeners(): void {
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-btn');
    const overlay = document.querySelector('.modal-overlay');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        console.log('? Close button clicked');
        this.forceClose();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        console.log('? Cancel button clicked');
        this.forceClose();
      });
    }

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
          console.log('? Overlay clicked');
          this.forceClose();
        }
      });
    }

    document.querySelectorAll('.project-type-item').forEach(item => {
      item.addEventListener('click', (e) => {
        document.querySelectorAll('.project-type-item').forEach(i => i.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        
        const type = (e.currentTarget as HTMLElement).dataset.type || 'web';
        this.selectedType = type;
        this.loadTemplates(type);
      });
    });

    const createBtn = document.getElementById('create-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        this.createProject();
      });
    }

    this.setupPathSelection();
    this.setupAiAdvisor();

    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.forceClose();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // ==========================================================================
  // PRIVATE METHOD: attachTemplateListeners
  // ==========================================================================
  /**
   * Attach template card click listeners
   */
  private attachTemplateListeners(): void {
    console.log('?? Attaching template listeners...');
    
    const templateCards = document.querySelectorAll('.template-card');
    console.log(`?? Found ${templateCards.length} template cards`);
    
    templateCards.forEach((card, index) => {
      const templateId = (card as HTMLElement).dataset.template;
      console.log(`  ${index + 1}. Template card: "${templateId}"`);
      
      card.addEventListener('click', (e) => {
        console.log('+---------------------------------------+');
        console.log('??? Template card clicked!');
        console.log('+---------------------------------------+');
        
        document.querySelectorAll('.template-card').forEach(c => {
          c.classList.remove('active');
          c.querySelector('.selected-badge')?.remove();
        });
        
        (e.currentTarget as HTMLElement).classList.add('active');
        
        const badge = document.createElement('div');
        badge.className = 'selected-badge';
        badge.textContent = '✅';
        (e.currentTarget as HTMLElement).appendChild(badge);
        
        const newTemplateId = (e.currentTarget as HTMLElement).dataset.template;
        
        console.log('?? Previous selectedTemplate:', this.selectedTemplate);
        console.log('?? New selectedTemplate:', newTemplateId);
        console.log('?? Selected card element:', e.currentTarget);
        
        this.selectedTemplate = newTemplateId || '';
        
        console.log('? this.selectedTemplate is now:', this.selectedTemplate);
        console.log('+---------------------------------------+');
      });
    });
    
    console.log('? Template listeners attached successfully');
  }

  // ==========================================================================
  // PRIVATE METHOD: createProject
  // ==========================================================================
  /**
   * Create project with selected template
   */
// ==========================================================================
// PRIVATE METHOD: createProject
// ==========================================================================
/**
 * Create project with selected template
 */
private async createProject(): Promise<void> {
  const nameInput = document.getElementById('project-name-input') as HTMLInputElement;
  const pathInput = document.getElementById('project-path-input') as HTMLInputElement;
  
  const projectName = nameInput?.value.trim() || this.projectName;
  const projectPath = pathInput?.value || this.projectPath;
  const separator = projectPath.includes('\\') ? '\\' : '/';
  const fullPath = `${projectPath}${separator}${projectName}`;
  
  console.log('+---------------------------------------+');
  console.log('?? CREATE PROJECT BUTTON CLICKED');
  console.log('+---------------------------------------+');
  console.log('?? Current State:');
  console.log('  - selectedType:', this.selectedType);
  console.log('  - selectedTemplate:', this.selectedTemplate);
  console.log('  - projectName:', projectName);
  console.log('  - projectPath:', projectPath);
  console.log('  - fullPath:', fullPath);
  console.log('+---------------------------------------+');
  
  if (!this.selectedTemplate) {
    console.error('? ERROR: No template selected!');
    alert('Please select a template first!');
    return;
  }
  
  this.showProgressModal();
  
  // ? FIX 1: Safety timeout — force close everything after 8s max
  const safetyTimeout = setTimeout(() => {
    console.warn('?? Safety timeout: Force closing after 8s');
    this.hideProgressModal();
    this.forceClose();
  }, 8000);
  
  // ? FIX 2: Capture selected values before async (modal may close)
  const selectedType = this.selectedType;
  const selectedTemplate = this.selectedTemplate;
  
  try {
    console.log(`?? Calling executeProjectCreation with template: "${selectedTemplate}"`);
    
    // ? FIX 3: Skip broken executeViaTauri, go direct to createViaFileSystem
    await this.createViaFileSystem(projectName, fullPath, selectedTemplate);
    
    console.log('? Project creation succeeded!');
    
    // ? FIX 4: IMMEDIATELY close modal — don't wait for explorer/AI
    clearTimeout(safetyTimeout);
    this.hideProgressModal();
    this.forceClose();
    
    // Show success notification right away
    setTimeout(() => {
      this.showSuccessNotification(projectName, fullPath);
    }, 100);
    
    // ? FIX 5: Load explorer + notify AI in BACKGROUND (non-blocking)
    setTimeout(async () => {
      try {
        console.log('?? [Background] Loading project into file explorer...');
        await this.loadProjectIntoExplorer(fullPath);

      // [X02 AutoInstall] Auto-run npm install after project creation
      try {
        const _t = ["react-vite","react","nextjs","vue3","vue","svelte","angular","vite"];
        if (_t.some(t => (selectedTemplate||"").toLowerCase().includes(t))) {
          const _n = (window as any).showNotification;
          if (_n) _n("Installing dependencies...", "info");
          const { invoke: _i } = await import("@tauri-apps/api/core");
          await _i("execute_build_command", { command: "npm install", workingDir: fullPath });
          if (_n) _n("Ready! Click Run to start.", "success");
          console.log("[X02 AutoInstall] Done!");
        }
      } catch (_e) { console.warn("[X02 AutoInstall] Failed:", _e); }

      // [X02 AutoInstall] Auto-run npm install after project creation
      try {
        const _nodeT = ["react-vite","react","nextjs","vue3","vue","svelte","angular","vite"];
        if (_nodeT.some(t => (selectedTemplate||"").toLowerCase().includes(t))) {
          console.log("[X02 AutoInstall] Running npm install in:", fullPath);
          const _n = (window as any).showNotification;
          if (_n) _n("Installing dependencies...", "info");
          const { invoke: _inv } = await import("@tauri-apps/api/core");
          await _inv("execute_build_command", { command: "npm install", cwd: fullPath });
          console.log("[X02 AutoInstall] Done!");
          if (_n) _n("Ready! Click Run to start.", "success");
        }
      } catch (_e) {
        console.warn("[X02 AutoInstall] Failed:", _e);
      }

      // [X02 AutoInstall] Auto-run npm install after project creation
      try {
        const nodeTemplates = ["react-vite","react","nextjs","vue3","vue","svelte","angular","vite"];
        const needsInstall = nodeTemplates.some(t => (selectedTemplate||"").toLowerCase().includes(t));
        if (needsInstall) {
          console.log("[X02 AutoInstall] Starting npm install in:", fullPath);
          const notify = (window as any).showNotification;
          if (notify) notify("Installing dependencies...", "info");
          const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
          await tauriInvoke("execute_build_command", { command: "npm install", cwd: fullPath });
          console.log("[X02 AutoInstall] npm install complete!");
          if (notify) notify("Dependencies installed! Click Run to start.", "success");
        }
      } catch (installErr) {
        console.warn("[X02 AutoInstall] npm install failed:", installErr);
        const notify = (window as any).showNotification;
        if (notify) notify("Run npm install manually before starting.", "warning");
      }
      } catch (e) {
        console.warn('?? [Background] Explorer load failed:', e);
      }
      
      // 🔧 FIX: Auto-open main file in editor after project creation
      setTimeout(() => {
        try {
          const sep = fullPath.includes('/') ? '/' : '\\';
          let mainFile = '';
          
          if (selectedTemplate.toLowerCase() === 'arduino') {
            // Arduino: open {projectName}.ino
            mainFile = `${fullPath}${sep}${projectName}.ino`;
          } else if (selectedTemplate.toLowerCase() === 'esp32') {
            // ESP32: open src/main.cpp
            mainFile = `${fullPath}${sep}src${sep}main.cpp`;
          } else if (selectedTemplate.toLowerCase() === 'esp8266') {
            mainFile = `${fullPath}${sep}src${sep}main.cpp`;
          } else {
            // Other templates: try common entry files
            const commonEntries: Record<string, string> = {
              'react': `src${sep}App.tsx`,
              'react-js': `src${sep}App.jsx`,
              'vue': `src${sep}App.vue`,
              'svelte': `src${sep}App.svelte`,
              'next': `src${sep}app${sep}page.tsx`,
              'python': 'main.py',
              'flask': 'app.py',
              'django': 'manage.py',
              'rust': `src${sep}main.rs`,
              'node': 'index.js',
              'express': 'index.js',
              'typescript': `src${sep}index.ts`,
              'html': 'index.html',
              'csharp': 'Program.cs',
              'go': 'main.go',
              'kotlin': `src${sep}main${sep}kotlin${sep}Main.kt`,
              'flet': 'main.py',
            };
            const entry = commonEntries[selectedTemplate.toLowerCase()];
            if (entry) {
              mainFile = `${fullPath}${sep}${entry}`;
            }
          }
          
          if (mainFile) {
            console.log(`📂 Auto-opening in editor: ${mainFile}`);
            document.dispatchEvent(new CustomEvent('file-selected', {
              detail: { path: mainFile }
            }));
          }
        } catch (e) {
          console.warn('📂 Auto-open failed (non-critical):', e);
        }
      }, 500); // Wait for explorer to finish loading
      
      try {
        await notifyAIDirectly(projectName, projectPath, selectedType, selectedTemplate);
        console.log('? [Background] AI notified');
      } catch (e) {
        console.warn('?? [Background] AI notification failed:', e);
      }
    }, 50);
    
  } catch (error) {
    console.error('? Project creation failed:', error);
    clearTimeout(safetyTimeout);
    this.hideProgressModal();
    this.showErrorNotification(error);
  }
}
private async loadProjectIntoExplorer(projectPath: string): Promise<void> {
  try {
    console.log('?? Loading project into file explorer...');
    
    // Import fileSystem
    const fileSystemModule = await import('../../../fileSystem');
    console.log('? fileSystem module imported');
    
    // Read directory tree
    const files = await fileSystemModule.getDirectoryTree(projectPath, 5);
    console.log('? Directory tree loaded:', files);
    
    // Dispatch 'project-opened' event (menuSystem listens for this!)
    const event = new CustomEvent('project-opened', {
      detail: { 
        path: projectPath,
        files: files  // Include files!
      }
    });
    
    document.dispatchEvent(event);
    console.log('? project-opened event dispatched!');
    
  } catch (error) {
    console.error('? Error:', error);
  }
}
  // ==========================================================================
  // PRIVATE METHOD: updateFileExplorerDirectly
  // ==========================================================================
  /**
   * Update file explorer by directly manipulating the DOM
   */
  private updateFileExplorerDirectly(projectPath: string, files: any): void {
    console.log('?? Starting direct DOM update...');
    
    // Find file tree container
    const fileTree = document.querySelector('.file-tree') || 
                     document.querySelector('.explorer-content') ||
                     document.querySelector('#file-explorer');
    
    if (!fileTree) {
      console.error('? File tree container not found');
      throw new Error('File tree container not found');
    }
    
    console.log('? Found file tree container');
    
    // Clear content
    fileTree.innerHTML = '';
    
    // Create header
    const projectName = files.name || projectPath.split(/[/\\]/).pop();
    const header = document.createElement('div');
    header.className = 'project-header';
    header.style.cssText = 'padding:8px; font-weight:bold; color:#ccc; background:#252526; border-bottom:1px solid #3e3e42;';
    header.textContent = projectName;
    fileTree.appendChild(header);
    
    console.log('? Project header created');
    
    // Create container
    const container = document.createElement('div');
    container.className = 'file-container';
    container.style.cssText = 'padding:4px 0;';
    
    // Render files
    if (files.children && files.children.length > 0) {
      this.renderFileTreeDirectly(container, files.children, projectPath, 0);
      console.log(`? Rendered ${files.children.length} items`);
    }
    
    fileTree.appendChild(container);
    console.log('? File tree rendered');
  }
  
  // ==========================================================================
  // PRIVATE METHOD: renderFileTreeDirectly
  // ==========================================================================
  /**
   * Recursively render file tree
   */
  private renderFileTreeDirectly(container: HTMLElement, items: any[], basePath: string, depth: number): void {
    // Sort: directories first, then alphabetically
    const sorted = [...items].sort((a, b) => {
      if (a.is_directory && !b.is_directory) return -1;
      if (!a.is_directory && b.is_directory) return 1;
      return a.name.localeCompare(b.name);
    });
    
    for (const item of sorted) {
      const div = document.createElement('div');
      div.className = item.is_directory ? '📂' : '📄';
      div.style.cssText = `padding:4px 8px 4px ${8+depth*16}px; cursor:pointer; user-select:none; display:flex; align-items:center; color:#ccc;`;
      
      // Hover
      div.addEventListener('mouseenter', () => div.style.backgroundColor = '#2a2d2e');
      div.addEventListener('mouseleave', () => div.style.backgroundColor = 'transparent');
      
      // Icon
      const icon = item.is_directory ? '??' : '??';
      const iconSpan = document.createElement('span');
      iconSpan.textContent = icon + ' ';
      iconSpan.style.marginRight = '4px';
      div.appendChild(iconSpan);
      
      // Name
      const nameSpan = document.createElement('span');
      nameSpan.textContent = item.name;
      nameSpan.style.flex = '1';
      div.appendChild(nameSpan);
      
      // Size
      if (!item.is_directory && item.size !== undefined) {
        const sizeSpan = document.createElement('span');
        sizeSpan.textContent = this.formatFileSize(item.size);
        sizeSpan.style.cssText = 'color:#858585; font-size:11px; margin-left:8px;';
        div.appendChild(sizeSpan);
      }
      
      // Path
      div.dataset.path = item.path || `${basePath}/${item.name}`;
      div.dataset.isDirectory = item.is_directory ? '📂' : '📄';
      
      // Click handler
      if (!item.is_directory) {
        div.addEventListener('click', () => {
          console.log('?? File clicked:', div.dataset.path);
          const event = new CustomEvent('file-open-request', {
            detail: { path: div.dataset.path }
          });
          document.dispatchEvent(event);
        });
      } else {
        // Folder toggle
        let expanded = false;
        const childDiv = document.createElement('div');
        childDiv.style.display = 'none';
        
        div.addEventListener('click', () => {
          expanded = !expanded;
          childDiv.style.display = expanded ? 'block' : 'none';
          iconSpan.textContent = (expanded ? '📂' : '📁') + ' ';
        });
        
        if (item.children && item.children.length > 0) {
          this.renderFileTreeDirectly(childDiv, item.children, div.dataset.path, depth + 1);
        }
        
        container.appendChild(div);
        container.appendChild(childDiv);
        continue;
      }
      
      container.appendChild(div);
    }
  }
  
  // ==========================================================================
  // PRIVATE METHOD: formatFileSize
  // ==========================================================================
  /**
   * Format file size
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  }
  // ==========================================================================
  // PRIVATE METHOD: dispatchProjectLoadedEvent
  // ==========================================================================
  /**
   * Fallback: Dispatch custom event when direct loading fails
   */
  private dispatchProjectLoadedEvent(projectPath: string): void {
    try {
      console.log('?? Dispatching project-loaded event as fallback...');
      
      const event = new CustomEvent('project-loaded', {
        detail: { 
          path: projectPath,
          timestamp: Date.now()
        }
      });
      
      document.dispatchEvent(event);
      console.log('? project-loaded event dispatched');
      
    } catch (fallbackError) {
      console.error('? Fallback event dispatch also failed:', fallbackError);
    }
  }
  
  // ==========================================================================
  // PRIVATE METHOD: showSuccessNotification
  // ==========================================================================
  /**
   * Show success notification (if not already present)
   */
  private showSuccessNotification(message: string): void {
    // Check if showNotification method exists
    if (typeof (this as any).showNotification === 'function') {
      (this as any).showNotification(message, 'success');
    } else {
      // Fallback to alert or console
      console.log('? SUCCESS:', message);
      
      // Try to show a simple toast notification
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        animation: slideIn 0.3s ease-out;
      `;
      toast.textContent = message;
      
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
  }
  // ==========================================================================
  // PRIVATE METHOD: executeProjectCreation
  // ==========================================================================
  /**
   * Execute project creation
   */
  private async executeProjectCreation(
    projectName: string, 
    projectPath: string, 
    template: string
  ): Promise<void> {
    console.log('?? Executing project creation...');
    
    if ((window as any).__TAURI__?.invoke) {
      try {
        await this.executeViaTauri(projectName, projectPath, template);
        return;
      } catch (error) {
        console.warn('?? Tauri execution failed, falling back to File System API');
      }
    }
    
    await this.createViaFileSystem(projectName, projectPath, template);
  }

  // ==========================================================================
  // PRIVATE METHOD: executeViaTauri
  // ==========================================================================
  /**
   * Execute project creation via Tauri
   */
  private async executeViaTauri(
    projectName: string, 
    projectPath: string, 
    template: string
  ): Promise<void> {
   // const { invoke } = (window as any).__TAURI__;
    
    const result = await invoke('create_project', {
      projectName: projectName,
      projectPath: projectPath,
      template: template
    });
    
    console.log('? Tauri execution result:', result);
    
    if (result.error) {
      throw new Error(result.error);
    }
  }

  private async createViaFileSystem(
  projectName: string, 
  projectPath: string, 
  template: string
): Promise<void> {
  console.log('?? Creating project files...');
  
  // Check if Tauri is available
  if ((window as any).__TAURI__) {
    console.log('? Using Tauri file system');
    const startTime = performance.now();
    
    try {
      const fullPath = projectPath;
      
      // Get template files
      const files = getTemplateFiles(template);
      
      if (!files || Object.keys(files).length === 0) {
        throw new Error(`Template "${template}" not found or has no files`);
      }
      
      // 🔧 FIX: Arduino .ino file MUST match folder name
      // Arduino CLI requires: folder "myProject" → "myProject.ino"
      if (files['sketch.ino'] && template.toLowerCase() === 'arduino') {
        const inoContent = files['sketch.ino'];
        delete files['sketch.ino'];
        files[`${projectName}.ino`] = inoContent;
        console.log(`🔧 Renamed sketch.ino → ${projectName}.ino (Arduino requirement)`);
        
        // Also fix README references to sketch.ino
        if (files['README.md']) {
          files['README.md'] = files['README.md'].replace(/sketch\.ino/g, `${projectName}.ino`);
          console.log(`📝 Updated README.md references to ${projectName}.ino`);
        }
      }
      
      // ? Check for AI-generated custom README
      const customReadme = (window as any).__customReadme;
      if (customReadme) {
        files['README.md'] = customReadme;
        console.log('? USING AI-GENERATED README.md');
      } else {
        console.log('?? No custom README found - using template default');
      }
      
      const fileCount = Object.keys(files).length;

      // Show optimistic file tree while explorer loads
      try {
        const { showOptimisticTree } = await import('../../../explorerLoadingState');
        showOptimisticTree(files, projectName);
        console.log('[ExplorerLoading] Optimistic tree displayed');
      } catch(e) { console.warn('[ExplorerLoading] Could not show preview:', e); }

      console.log(`?? Creating ${fileCount} files via Tauri (INSTANT BATCH)...`);

      // ?? Use single batch command instead of N sequential invokes
      try {
        const batchFiles = Object.entries(files).map(([filePath, content]) => ({
          path: filePath,
          content: content as string,
        }));

        const created = await invoke('create_files_batch', {
          baseDir: fullPath,
          files: batchFiles,
        }) as string[];

        created.forEach(f => console.log(`  ? ${f}`));
        console.log(`? All ${created.length} files created in single batch!`);

        // [PERF FIX] Clear optimistic loading state and refresh real file tree
        try {
          const { clearExplorerLoading } = await import('../../../explorerLoadingState');
          clearExplorerLoading();
          console.log('[ExplorerLoading] Optimistic tree cleared after batch creation');
        } catch(e) { console.warn("[ExplorerLoading] Clear failed:", e); }
        // Trigger real file tree refresh
        document.dispatchEvent(new CustomEvent('file-tree-refresh', { detail: { path: fullPath } }));
        document.dispatchEvent(new CustomEvent('folder-changed', { detail: { path: fullPath } }));
      } catch (batchErr) {
        console.warn('?? Batch create failed, falling back to sequential:', batchErr);
        // Fallback: create files one by one (old method)
      
      // ? STEP 1: Create project root directory
      try {
        await invoke('create_directory', { path: fullPath });
        console.log(`? Created project directory: ${fullPath}`);
      } catch (error) {
        console.log(`?? Directory might already exist`);
      }
      
      // ? STEP 2: Collect all unique subdirectories needed
      const dirsNeeded = new Set<string>();
      for (const filePath of Object.keys(files)) {
        const pathParts = filePath.split('/');
        if (pathParts.length > 1) {
          let currentPath = fullPath;
          for (let i = 0; i < pathParts.length - 1; i++) {
            currentPath += `\\${pathParts[i]}`;
            dirsNeeded.add(currentPath);
          }
        }
      }
      
      // ? STEP 3: Create subdirectories (sequential — parents before children)
      if (dirsNeeded.size > 0) {
        const sortedDirs = Array.from(dirsNeeded).sort((a, b) => a.length - b.length);
        for (const dir of sortedDirs) {
          try { await invoke('create_directory', { path: dir }); } catch (e) { /* exists */ }
        }
        console.log(`?? Created ${dirsNeeded.size} subdirectories`);
      }
      
      // ? STEP 4: Write ALL files in PARALLEL (single await for all)
      const writePromises = Object.entries(files).map(([filePath, content]) => {
        const fullFilePath = `${fullPath}\\${filePath.replace(/\//g, '\\\\')}`;
        return invoke('write_file', { path: fullFilePath, content: content })
          .then(() => console.log(`  ? ${filePath}`))
          .catch((err: any) => { console.error(`  ? ${filePath}:`, err); throw err; });
      });
      
      await Promise.all(writePromises);
      }

      const elapsed = Math.round(performance.now() - startTime);
      console.log(`? Project created via Tauri in ${elapsed}ms (${fileCount} files)`);
      
      // Clean up custom README
      if ((window as any).__customReadme) {
        delete (window as any).__customReadme;
        console.log('?? Cleaned up __customReadme');
      }
      
      return;
      
    } catch (error) {
      console.error('? Tauri file creation failed:', error);
      throw error;
    }
  }
  
  // Fallback to File System Access API (browser)
  console.log('?? Creating project via File System API...');
  
  let dirHandle = (window as any).__selectedDirHandle;
  
  if (!dirHandle && 'showDirectoryPicker' in window) {
    try {
      dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'desktop'
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error('Folder selection cancelled');
      }
      throw error;
    }
  }
  
  if (!dirHandle) {
    throw new Error('Cannot access file system. Please grant folder access or use the desktop version.');
  }
  
  const projectFolder = await dirHandle.getDirectoryHandle(projectName, { create: true });
  
  await this.generateProjectFiles(projectFolder, template);
  
  console.log('? Project created via File System API');
}
  // ==========================================================================
  // PRIVATE METHOD: generateProjectFiles
  // ==========================================================================
  /**
   * Generate project files from template
   */
  private async generateProjectFiles(dirHandle: any, template: string): Promise<void> {
    console.log(`?? Generating files for template: ${template}`);
    
    const files = getTemplateFiles(template);
    
    if (!files || Object.keys(files).length === 0) {
      console.error(`? No template files found for: ${template}`);
      throw new Error(`Template "${template}" not found or has no files.`);
    }
    
    const customReadme = (window as any).__customReadme;
    if (customReadme) {
      files['README.md'] = customReadme;
      console.log('? Using AI-generated README.md');
    }
    
    console.log(`?? Creating ${Object.keys(files).length} files...`);
    
    for (const [filePath, content] of Object.entries(files)) {
      const parts = filePath.split('/');
      let currentDir = dirHandle;
      
      for (let i = 0; i < parts.length - 1; i++) {
        try {
          currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true });
        } catch (error) {
          console.error(`Failed to create directory: ${parts[i]}`, error);
          throw error;
        }
      }
      
      const fileName = parts[parts.length - 1];
      try {
        const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        console.log(`? Created: ${filePath}`);
      } catch (error) {
        console.error(`Failed to create file: ${filePath}`, error);
        throw error;
      }
    }
    
    delete (window as any).__customReadme;
    
    console.log(`? Successfully generated all files for template: ${template}`);
  }

  // ==========================================================================
  // PRIVATE METHOD: openCreatedProject
  // ==========================================================================
  /**
   * Open created project folder
   */
  private async openCreatedProject(projectPath: string): Promise<void> {
    console.log('?? Opening created project at:', projectPath);
    
    if ((window as any).__TAURI__?.invoke) {
      try {
        await (window as any).__TAURI__.invoke('open_folder_dialog', { 
          defaultPath: projectPath 
        });
        
        console.log('? Project opened via Tauri');
        return;
      } catch (error) {
        console.error('Tauri open failed:', error);
      }
    }
    
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'desktop',
        });
        
        if (dirHandle && (window as any).fileSystem?.loadFolder) {
          await (window as any).fileSystem.loadFolder(dirHandle);
          console.log('? Project loaded into IDE');
          return;
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('File System API open failed:', error);
        }
      }
    }
    
    if ((window as any).fileSystem?.openFolderDialog) {
      await (window as any).fileSystem.openFolderDialog(projectPath);
      console.log('? Opening folder via fileSystem.openFolderDialog');
      return;
    }
    
    this.showManualOpenPrompt(projectPath);
  }

  // ==========================================================================
  // PRIVATE METHOD: showManualOpenPrompt
  // ==========================================================================
  /**
   * Show manual open prompt
   */
  private showManualOpenPrompt(projectPath: string): void {
    const promptHTML = `
      <div id="manual-open-prompt" style="
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: #1e1e1e; border: 2px solid #007acc; border-radius: 8px;
        padding: 30px; z-index: 25000; min-width: 500px; max-width: 600px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.8);
      ">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
          <h3 style="margin: 0 0 8px 0; color: #fff; font-size: 18px;">
            Project Created Successfully!
          </h3>
          <p style="color: #969696; margin: 0; font-size: 13px;">
            Your project is ready to use
          </p>
        </div>
        
        <div style="background: #252526; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <div style="color: #8e8e8e; font-size: 10px; text-transform: uppercase; 
                      letter-spacing: 1px; margin-bottom: 8px; font-weight: 700;">
            Project Location
          </div>
          <div style="
            background: #0a0a0a; padding: 12px; border-radius: 4px;
            font-family: 'Consolas', monospace; color: #4FC3F7;
            font-size: 12px; word-break: break-all; border: 1px solid #3e3e42;
            position: relative;
          ">
            ${projectPath}
            <button id="copy-path-btn" style="
              position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
              padding: 4px 8px; background: rgba(0, 122, 204, 0.2);
              border: 1px solid #007acc; border-radius: 4px; color: #4FC3F7;
              font-size: 10px; cursor: pointer; transition: all 0.2s;
            ">
              📋 Copy
            </button>
          </div>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button id="open-project-btn" style="
            flex: 1; padding: 12px 24px; 
            background: linear-gradient(135deg, #0078d4, #1e88e5);
            border: none; border-radius: 6px; color: white; font-size: 14px;
            font-weight: 600; cursor: pointer; transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(0, 122, 204, 0.3);
            display: flex; align-items: center; justify-content: center; gap: 8px;
          ">
            <span>📂</span>
            <span>Open Folder</span>
          </button>
          
          <button id="open-explorer-btn" style="
            padding: 12px 20px; background: rgba(255, 255, 255, 0.05);
            border: 1px solid #3e3e42; border-radius: 6px; color: #ccc;
            font-size: 14px; font-weight: 600; cursor: pointer;
            transition: all 0.2s; display: flex; align-items: center;
            justify-content: center; gap: 8px;
          " title="Open in File Explorer">
            <span>???</span>
          </button>
          
          <button id="close-prompt-btn" style="
            padding: 12px 20px; background: transparent;
            border: 1px solid #3e3e42; border-radius: 6px; color: #ccc;
            font-size: 14px; font-weight: 600; cursor: pointer;
            transition: all 0.2s;
          ">
            ?
          </button>
        </div>
        
        <p style="
          text-align: center; margin: 16px 0 0 0; font-size: 11px;
          color: #666; font-style: italic;
        ">
          Or use <strong style="color: #4FC3F7;">File > Open Folder</strong> and navigate to the path above
        </p>
      </div>
      <div id="prompt-overlay" style="
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(3px); z-index: 24999;
      "></div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', promptHTML);
    
    const openBtn = document.getElementById('open-project-btn');
    const openExplorerBtn = document.getElementById('open-explorer-btn');
    const closeBtn = document.getElementById('close-prompt-btn');
    const copyPathBtn = document.getElementById('copy-path-btn');
    const prompt = document.getElementById('manual-open-prompt');
    const overlay = document.getElementById('prompt-overlay');
    
    const closePrompt = () => {
      prompt?.remove();
      overlay?.remove();
    };
    
    if (openBtn) {
      openBtn.addEventListener('click', async () => {
        closePrompt();
        await this.triggerFolderOpen(projectPath);
      });
      
      openBtn.addEventListener('mouseenter', () => {
        openBtn.style.transform = 'translateY(-2px)';
        openBtn.style.boxShadow = '0 6px 20px rgba(0, 122, 204, 0.5)';
      });
      
      openBtn.addEventListener('mouseleave', () => {
        openBtn.style.transform = 'translateY(0)';
        openBtn.style.boxShadow = '0 4px 12px rgba(0, 122, 204, 0.3)';
      });
    }
    
    if (openExplorerBtn) {
      openExplorerBtn.addEventListener('click', async () => {
        await this.openInFileExplorer(projectPath);
      });
      
      openExplorerBtn.addEventListener('mouseenter', () => {
        openExplorerBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        openExplorerBtn.style.borderColor = '#007acc';
      });
      
      openExplorerBtn.addEventListener('mouseleave', () => {
        openExplorerBtn.style.background = 'rgba(255, 255, 255, 0.05)';
        openExplorerBtn.style.borderColor = '#3e3e42';
      });
    }
    
    if (copyPathBtn) {
      copyPathBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(projectPath);
          copyPathBtn.textContent = '✅Copied';
          copyPathBtn.style.background = 'rgba(16, 185, 129, 0.2)';
          copyPathBtn.style.borderColor = '#10b981';
          copyPathBtn.style.color = '#6ee7b7';
          
          setTimeout(() => {
            copyPathBtn.textContent = '📋 Copy';
            copyPathBtn.style.background = 'rgba(0, 122, 204, 0.2)';
            copyPathBtn.style.borderColor = '#007acc';
            copyPathBtn.style.color = '#4FC3F7';
          }, 2000);
        } catch (error) {
          console.error('Failed to copy:', error);
        }
      });
    }
    
    closeBtn?.addEventListener('click', closePrompt);
    overlay?.addEventListener('click', closePrompt);
  }

// ==========================================================================
// PRIVATE METHOD: triggerFolderOpen
// ==========================================================================
// ==========================================================================
// PRIVATE METHOD: triggerFolderOpen
// ==========================================================================
/**
 * Show folder picker starting at the created project location
 */
private async triggerFolderOpen(projectPath: string): Promise<void> {
  console.log('?? Opening folder picker at:', projectPath);
  
  try {
    let selectedPath: string | null = null;
    
    // ? METHOD 1: Tauri (supports exact path navigation)
    if ((window as any).__TAURI__?.dialog) {
      console.log('?? Using Tauri dialog with defaultPath');
      
      try {
        selectedPath = await (window as any).__TAURI__.dialog.open({
          directory: true,
          multiple: false,
          defaultPath: projectPath, // ? Opens directly at this path!
          title: 'Select Project Folder'
        });
        
        if (selectedPath && typeof selectedPath === 'string') {
          console.log('? Folder selected via Tauri:', selectedPath);
          await this.loadSelectedFolder(selectedPath);
          return;
        }
      } catch (error) {
        console.error('Tauri dialog failed:', error);
      }
    }
    
    // ? METHOD 2: File System Access API (browser)
    // Note: Browser API doesn't support custom paths, but we can use the stored handle
    if ('showDirectoryPicker' in window) {
      console.log('?? Using File System Access API');
      
      // Get the parent directory handle
      const parentHandle = (window as any).__selectedDirHandle;
      const projectName = projectPath.split(/[/\\]/).pop();
      
      if (parentHandle && projectName) {
        try {
          // Show picker starting at the parent folder
          const dirHandle = await (window as any).showDirectoryPicker({
            mode: 'readwrite',
            startIn: parentHandle, // ? Start at parent directory
            id: 'project-folder' // Remembers last location
          });
          
          if (dirHandle) {
            console.log('? Folder selected via browser:', dirHandle.name);
            
            // Build folder tree from handle
            const folderTree = await this.buildTreeFromHandle(
              dirHandle, 
              dirHandle.name, 
              dirHandle.name
            );
            
            if (folderTree) {
              await this.loadProjectIntoIDE(dirHandle.name, folderTree);
              return;
            }
          }
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            console.error('Browser picker failed:', error);
          } else {
            console.log('User cancelled folder selection');
            return;
          }
        }
      }
      
      // Fallback: Show picker at Desktop
      try {
        console.log('??? Showing picker at Desktop (fallback)');
        
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'desktop', // ? Start at Desktop (closest we can get)
          id: 'project-folder'
        });
        
        if (dirHandle) {
          const folderTree = await this.buildTreeFromHandle(
            dirHandle,
            dirHandle.name,
            dirHandle.name
          );
          
          if (folderTree) {
            await this.loadProjectIntoIDE(dirHandle.name, folderTree);
          }
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Fallback picker failed:', error);
        }
      }
    }
    
    // ? No picker API available
    if (!selectedPath) {
      console.warn('?? No folder picker API available');
      this.showManualInstructions(projectPath);
    }
    
  } catch (error) {
    console.error('? Folder picker error:', error);
    this.showManualInstructions(projectPath);
  }
}

// ==========================================================================
// PRIVATE METHOD: loadSelectedFolder
// ==========================================================================
/**
 * Load the selected folder into the IDE
 */
private async loadSelectedFolder(folderPath: string): Promise<void> {
  try {
    console.log('?? Loading folder:', folderPath);
    
    // Import file system functions
    const { getDirectoryTree, setCurrentFolderRootPath } = await import("../../../fileSystem");
    
    // Set current path
    setCurrentFolderRootPath(folderPath);
    
    // Get directory tree
    const folderTree = await getDirectoryTree(folderPath, 5);
    
    if (folderTree && folderTree.children) {
      console.log(`? Loaded ${folderTree.children.length} items from folder`);
      
      // Load into IDE
      await this.loadProjectIntoIDE(folderPath, folderTree);
    } else {
      throw new Error('Failed to read folder contents');
    }
    
  } catch (error) {
    console.error('? Failed to load folder:', error);
    alert(`Failed to load folder: ${error.message}`);
  }
}

// ==========================================================================
// PRIVATE METHOD: buildTreeFromHandle
// ==========================================================================
/**
 * Build folder tree from File System Access API handle
 */
private async buildTreeFromHandle(
  handle: any,
  name: string,
  path: string
): Promise<any> {
  const children: any[] = [];
  
  try {
    for await (const entry of handle.values()) {
      const childPath = `${path}/${entry.name}`;
      
      if (entry.kind === 'directory') {
        const subTree = await this.buildTreeFromHandle(entry, entry.name, childPath);
        if (subTree) {
          children.push(subTree);
        }
      } else {
        children.push({
          name: entry.name,
          path: childPath,
          is_directory: false,
          children: []
        });
      }
    }
    
    return {
      name,
      path,
      is_directory: true,
      children
    };
    
  } catch (error) {
    console.error('Error reading directory handle:', error);
    return null;
  }
}

// ==========================================================================
// PRIVATE METHOD: loadProjectIntoIDE
// ==========================================================================
/**
 * Load the project into the IDE file explorer
 */
private async loadProjectIntoIDE(projectPath: string, folderTree: any): Promise<void> {
  try {
    console.log('?? Loading project into IDE:', folderTree.name);
    
    // Store in localStorage
    localStorage.setItem('currentProjectPath', projectPath);
    localStorage.setItem('currentProject', folderTree.name);
    
    // Dispatch events
    document.dispatchEvent(new CustomEvent('folder-structure-loaded', {
      detail: folderTree
    }));
    
    document.dispatchEvent(new CustomEvent('project-opened', {
      detail: { path: projectPath, files: folderTree }
    }));
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Success notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      z-index: 30000;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: slideInRight 0.3s ease;
    `;
    
    toast.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <div>
        <div style="font-weight: 700; margin-bottom: 2px;">Project Loaded!</div>
        <div style="opacity: 0.9; font-size: 12px;">${folderTree.name}</div>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
    
    console.log('?? Project loaded successfully!');
    
  } catch (error) {
    console.error('Failed to load into IDE:', error);
    throw error;
  }
}

// ==========================================================================
// PRIVATE METHOD: showManualInstructions
// ==========================================================================
/**
 * Show manual instructions if picker fails
 */
private showManualInstructions(projectPath: string): void {
  const message = `Project created successfully!\n\nLocation: ${projectPath}\n\nPlease use File > Open Folder to load the project.`;
  alert(message);
}

// ==========================================================================
// PRIVATE METHOD: tryLoadFromStoredHandle  
// ==========================================================================
/**
 * Try to load using the stored directory handle from project creation
 */
private async tryLoadFromStoredHandle(projectPath: string): Promise<boolean> {
  console.log('?? Trying to load from stored directory handle...');
  
  try {
    const dirHandle = (window as any).__selectedDirHandle;
    
    if (!dirHandle) {
      console.warn('?? No stored directory handle found');
      return false;
    }
    
    // Get the project folder name from the path
    const projectName = projectPath.split(/[/\\]/).pop();
    
    if (!projectName) {
      return false;
    }
    
    // Try to get the project folder handle
    const projectHandle = await dirHandle.getDirectoryHandle(projectName, { create: false });
    
    if (projectHandle) {
      console.log('? Found project folder via handle:', projectName);
      
      // Read the folder structure
      const folderTree = await this.readDirectoryHandleTree(projectHandle, projectName, projectPath);
      
      if (folderTree) {
        await this.updateFileExplorerWithProject(projectPath, folderTree);
        this.showSuccessToast(`Project loaded: ${projectName}`);
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    console.error('? Failed to load from stored handle:', error);
    return false;
  }
}

// ==========================================================================
// PRIVATE METHOD: readDirectoryHandleTree
// ==========================================================================
/**
 * Read directory structure from File System Access API handle
 */
private async readDirectoryHandleTree(
  dirHandle: any, 
  name: string, 
  path: string
): Promise<any> {
  const children: any[] = [];
  
  try {
    for await (const entry of dirHandle.values()) {
      const childPath = `${path}/${entry.name}`;
      
      if (entry.kind === 'directory') {
        const subTree = await this.readDirectoryHandleTree(entry, entry.name, childPath);
        if (subTree) {
          children.push(subTree);
        }
      } else {
        children.push({
          name: entry.name,
          path: childPath,
          is_directory: false,
          children: []
        });
      }
    }
    
    return {
      name,
      path,
      is_directory: true,
      children
    };
    
  } catch (error) {
    console.error('Error reading directory:', error);
    return null;
  }
}

// ==========================================================================
// PRIVATE METHOD: showManualFolderPicker
// ==========================================================================
/**
 * Last resort: show manual folder picker if auto-load fails
 */
private async showManualFolderPicker(defaultPath: string): Promise<void> {
  console.log('?? Auto-load failed, showing manual folder picker...');
  
  const confirmMsg = `Unable to automatically load the project folder.\n\nWould you like to manually select the folder?\n\nPath: ${defaultPath}`;
  
  if (!confirm(confirmMsg)) {
    console.log('User cancelled manual selection');
    return;
  }
  
  try {
    // Try Tauri dialog first
    if ((window as any).__TAURI__?.dialog) {
      const selectedPath = await (window as any).__TAURI__.dialog.open({
        directory: true,
        multiple: false,
        defaultPath: defaultPath,
        title: 'Select Your Project Folder'
      });
      
      if (selectedPath && typeof selectedPath === 'string') {
        const { getDirectoryTree, setCurrentFolderRootPath } = await import("../../../fileSystem");
        setCurrentFolderRootPath(selectedPath);
        const folderTree = await getDirectoryTree(selectedPath, 5);
        
        if (folderTree) {
          await this.updateFileExplorerWithProject(selectedPath, folderTree);
          this.showSuccessToast(`Project loaded: ${folderTree.name}`);
          return;
        }
      }
    }
    
    // Fallback to File System Access API
    if ('showDirectoryPicker' in window) {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'desktop'
      });
      
      if (dirHandle) {
        const folderTree = await this.readDirectoryHandleTree(dirHandle, dirHandle.name, dirHandle.name);
        
        if (folderTree) {
          await this.updateFileExplorerWithProject(dirHandle.name, folderTree);
          this.showSuccessToast(`Project loaded: ${dirHandle.name}`);
        }
      }
    }
    
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Manual folder selection failed:', error);
      alert('Failed to load folder. Please use File > Open Folder from the menu.');
    }
  }
}

// ==========================================================================
// PRIVATE METHOD: showSuccessToast
// ==========================================================================
/**
 * Show a success toast notification
 */
private showSuccessToast(message: string): void {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 30000;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideInRight 0.3s ease;
  `;
  
  toast.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==========================================================================
// PRIVATE METHOD: updateFileExplorerWithProject
// ==========================================================================
// ==========================================================================
// PRIVATE METHOD: updateFileExplorerWithProject
// ==========================================================================
/**
 * Update file explorer with project files
 */
private async updateFileExplorerWithProject(projectPath: string, files: any): Promise<void> {
  console.log('?? Updating file explorer with project:', projectPath);
  
  try {
    // ? Store the path in localStorage for menuSystem to use
    localStorage.setItem('currentProjectPath', projectPath);
    localStorage.setItem('currentProject', files.name);
    
    // ? Dispatch the folder-structure-loaded event
    // menuSystem.ts is already listening for this event
    console.log('?? Dispatching folder-structure-loaded event');
    document.dispatchEvent(new CustomEvent('folder-structure-loaded', {
      detail: files
    }));
    
    // ? Also dispatch project-opened event for other listeners
    document.dispatchEvent(new CustomEvent('project-opened', {
      detail: { path: projectPath, files }
    }));
    
    // Small delay to ensure events are processed
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // ? Show success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 30000;
      animation: slideInRight 0.3s ease;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
    `;
    notification.innerHTML = `
      <div style="font-size: 24px;">🎉</div>
      <div>
        <div style="font-weight: 600; margin-bottom: 4px;">Folder Loaded!</div>
        <div style="opacity: 0.9; font-size: 13px;">${files.name}</div>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
    
    console.log('?? File explorer updated successfully');
    
  } catch (error) {
    console.error('? Error updating file explorer:', error);
    alert(`Failed to update file explorer: ${error.message}`);
  }
}

// ==========================================================================
// PRIVATE METHOD: renderFileTree
// ==========================================================================
/**
 * Render file tree recursively
 */
private renderFileTree(container: HTMLElement, files: any[], parentPath: string = ''): void {
  console.log('?? renderFileTree called but menuSystem handles rendering');
  console.log(`?? Rendering ${files.length} items`);
  
  if (!files || files.length === 0) {
    return;
  }
  
  files.forEach((file) => {
    const fileElement = document.createElement('div');
    fileElement.className = 'file-item';
    
    const fullPath = file.path || `${parentPath}/${file.name}`;
    
    fileElement.setAttribute('data-path', fullPath);
    fileElement.setAttribute('data-name', file.name);
    fileElement.setAttribute('data-file-name', file.name);
    fileElement.setAttribute('data-is-directory', file.is_directory ? '📂' : '📄');
    
    if (file.is_directory) {
      fileElement.classList.add('folder-item', 'directory');
    }
    
    fileElement.style.cssText = `
      padding: 6px 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: background-color 0.2s;
      border-radius: 4px;
      margin: 2px 4px;
    `;
    
    const icon = document.createElement('span');
    icon.style.cssText = `
      margin-right: 8px;
      font-size: 16px;
    `;
    icon.textContent = file.is_directory ? '📂' : '📄';
    
    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = file.name;
    name.style.cssText = `
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #cccccc;
    `;
    
    fileElement.appendChild(icon);
    fileElement.appendChild(name);
    
    // Click handler for files
    if (!file.is_directory) {
      fileElement.addEventListener('click', async () => {
        console.log(`?? Opening file: ${fullPath}`);
        
        try {
          // Import and use readFile
          const { readFile } = await import('../../../fileSystem');
          const content = await readFile(fullPath);
          
          if (content !== null) {
            // Add to tab manager
            const tabManager = (window as any).tabManager;
            if (tabManager && typeof tabManager.addTab === 'function') {
              tabManager.addTab(fullPath, content);
              console.log(`? File opened: ${file.name}`);
            }
          }
        } catch (error) {
          console.error(`? Error opening file:`, error);
          alert(`Failed to open ${file.name}`);
        }
      });
    }
    
    // Hover effects
    fileElement.addEventListener('mouseenter', () => {
      fileElement.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    });
    
    fileElement.addEventListener('mouseleave', () => {
      fileElement.style.backgroundColor = 'transparent';
    });
    
    container.appendChild(fileElement);
    
    // Recursively render children for directories
    if (file.is_directory && file.children && file.children.length > 0) {
      const childContainer = document.createElement('div');
      childContainer.style.marginLeft = '20px';
      this.renderFileTree(childContainer, file.children, fullPath);
      container.appendChild(childContainer);
    }
  });
}

  // ==========================================================================
  // PRIVATE METHOD: openInFileExplorer
  // ==========================================================================
  /**
   * Open in system file explorer
   */
  private async openInFileExplorer(path: string): Promise<void> {
    if ((window as any).__TAURI__?.invoke) {
      try {
        await (window as any).__TAURI__.invoke('open_folder', { path });
        console.log('? Opened in file explorer');
      } catch (error) {
        console.error('Failed to open in explorer:', error);
        if ((window as any).__TAURI__?.shell) {
          await (window as any).__TAURI__.shell.open(path);
        }
      }
    } else {
      alert(`Project location:\n${path}\n\nPlease navigate to this folder manually.`);
    }
  }

  // ==========================================================================
  // PRIVATE METHOD: showProgressModal
  // ==========================================================================
  /**
   * Show progress modal
   */
  private showProgressModal(): void {
    const progressHTML = `
      <div id="project-progress-modal" style="
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: #1e1e1e; border: 2px solid #007acc; border-radius: 8px;
        padding: 30px; z-index: 25000; min-width: 400px; text-align: center;
        box-shadow: 0 10px 40px rgba(0,0,0,0.8);
      ">
        <div style="font-size: 48px; margin-bottom: 20px; animation: spin 1s linear infinite;">🎉</div>
        <h3 style="margin: 0 0 10px 0; color: #fff; font-size: 18px;">Creating Project...</h3>
        <p style="color: #969696; font-size: 14px; margin: 0;">Please wait while we set up your project</p>
        <div style="margin-top: 20px; height: 4px; background: #2d2d30; border-radius: 2px; overflow: hidden;">
          <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #007acc 0%, #4FC3F7 100%); animation: progress 2s ease-in-out infinite;"></div>
        </div>
      </div>
      <div id="progress-overlay" style="
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); z-index: 24999;
      "></div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', progressHTML);
    
    if (!document.getElementById('progress-animations')) {
      const style = document.createElement('style');
      style.id = 'progress-animations';
      style.textContent = `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // ==========================================================================
  // PRIVATE METHOD: hideProgressModal
  // ==========================================================================
  /**
   * Hide progress modal
   */
  private hideProgressModal(): void {
    console.log('Hiding progress modal...');
    document.getElementById('project-progress-modal')?.remove();
    document.getElementById('progress-overlay')?.remove();
  }

  // ==========================================================================
  // PRIVATE METHOD: showErrorNotification
  // ==========================================================================
  /**
   * Show error notification
   */
  private showErrorNotification(error: any): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px;
      background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
      color: white; padding: 20px 24px; border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 30000;
      font-size: 14px; animation: slideInRight 0.3s ease; max-width: 400px;
    `;
    notification.innerHTML = `
      <div style="display: flex; align-items: start; gap: 12px;">
        <div style="font-size: 32px;">🎉</div>
        <div>
          <strong style="display: block; margin-bottom: 5px; font-size: 16px;">Project Creation Failed</strong>
          <div style="opacity: 0.95; font-size: 13px;">${error?.message || 'Unknown error occurred'}</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  // ==========================================================================
  // PRIVATE METHOD: forceClose
  // ==========================================================================
  /**
   * Force close modal
   */
  private forceClose(): void {
    console.log('?? Force closing modal...');
    
    const modals = document.querySelectorAll('#modern-project-modal');
    modals.forEach(modal => modal.remove());
    
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(overlay => overlay.remove());
    
    const progressModals = document.querySelectorAll('#project-progress-modal, #progress-overlay');
    progressModals.forEach(modal => modal.remove());
    
    this.modal = null;
    
    console.log('? Modal force closed');
  }

  // ==========================================================================
  // PRIVATE METHOD: injectStyles
  // ==========================================================================
  /**
   * Inject modal styles
   */
  private injectStyles(): void {
    if (document.getElementById('modern-project-modal-styles')) return;
    injectModalStyles();
  }
}

// ============================================================================
// GLOBAL WINDOW FUNCTION
// ============================================================================
(window as any).showModernProjectModal = () => {
  const modal = new ModernProjectModal();
  modal.show();
};

console.log('? Modern project modal with AI-generated README ready');