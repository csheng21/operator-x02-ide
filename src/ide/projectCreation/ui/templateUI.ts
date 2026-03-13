// src/ide/projectCreation/ui/templateUI.ts
import { ProjectTemplate } from '../types';
import { TEMPLATES, getTemplateLogo } from '../templates';
import { currentProjectOptions, updateProjectOptions } from '../projectOptions';
import { updateProjectSummary } from './projectSummary';

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
let currentSearchQuery = '';
let currentCategory = 'all';
let selectedProjectType = '';
let selectedTemplateId = '';

// ============================================================================
// INITIALIZATION
// ============================================================================
export function initializeTemplateUI(): void {
  injectModernStyles();
  setupGlobalEventListeners();
  console.log('✨ Professional Template UI initialized');
}

// ============================================================================
// PROFESSIONAL COMPACT STYLES
// ============================================================================
function injectModernStyles(): void {
  if (document.getElementById('professional-template-ui-styles')) return;

  const style = document.createElement('style');
  style.id = 'professional-template-ui-styles';
  style.textContent = `
    /* ===== GLOBAL RESETS ===== */
    * {
      box-sizing: border-box;
    }

    /* ===== PROJECT TYPE SELECTION (COMPACT) ===== */
    .project-types-container {
      margin-bottom: 20px;
    }

    .project-type-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      margin-top: 12px;
    }

    .project-type-item {
      background: #2d2d30;
      border: 1px solid #3e3e42;
      border-radius: 6px;
      padding: 16px 12px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .project-type-item:hover {
      border-color: #007acc;
      background: #323337;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 122, 204, 0.15);
    }

    .project-type-item.active {
      border-color: #007acc;
      background: linear-gradient(135deg, #094771 0%, #0e639c 100%);
      box-shadow: 0 2px 8px rgba(0, 122, 204, 0.3);
    }

    .project-type-item.active::before {
      content: '';
      position: absolute;
      top: -1px;
      left: -1px;
      right: -1px;
      bottom: -1px;
      background: linear-gradient(135deg, #007acc, #4FC3F7);
      border-radius: 6px;
      z-index: -1;
      opacity: 0.5;
      filter: blur(4px);
    }

    .project-type-icon {
      font-size: 32px;
      line-height: 1;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
    }

    .project-type-name {
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    .project-type-desc {
      color: #969696;
      font-size: 11px;
      line-height: 1.3;
      margin-top: -2px;
    }

    /* ===== COMPACT SEARCH & FILTER BAR ===== */
    .template-controls {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      align-items: center;
      background: #252526;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #3e3e42;
    }

    .search-box {
      flex: 1;
      min-width: 200px;
      position: relative;
    }

    .search-box input {
      width: 100%;
      padding: 8px 32px 8px 12px;
      background: #1e1e1e;
      border: 1px solid #3e3e42;
      border-radius: 4px;
      color: #cccccc;
      font-size: 13px;
      transition: all 0.2s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .search-box input:focus {
      outline: none;
      border-color: #007acc;
      background: #1a1a1a;
      box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.1);
    }

    .search-box input::placeholder {
      color: #6e6e6e;
    }

    .search-icon {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: #6e6e6e;
      font-size: 14px;
      pointer-events: none;
    }

    .clear-search {
      position: absolute;
      right: 30px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #6e6e6e;
      cursor: pointer;
      padding: 2px 6px;
      display: none;
      font-size: 16px;
      border-radius: 3px;
      transition: all 0.2s;
      line-height: 1;
    }

    .clear-search:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #cccccc;
    }

    .search-box input:not(:placeholder-shown) ~ .clear-search {
      display: block;
    }

    /* ===== COMPACT CATEGORY PILLS ===== */
    .category-filters {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .category-btn {
      padding: 6px 12px;
      background: #1e1e1e;
      border: 1px solid #3e3e42;
      border-radius: 16px;
      color: #cccccc;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s;
      white-space: nowrap;
      user-select: none;
      display: flex;
      align-items: center;
      gap: 4px;
      line-height: 1;
    }

    .category-btn:hover {
      background: #007acc;
      border-color: #007acc;
      color: #ffffff;
    }

    .category-btn.active {
      background: #007acc;
      border-color: #007acc;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(0, 122, 204, 0.3);
    }

    /* ===== COMPACT TEMPLATE GRID ===== */
    .template-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
      max-height: 450px;
      overflow-y: auto;
      padding: 4px;
    }

    .template-grid::-webkit-scrollbar {
      width: 8px;
    }

    .template-grid::-webkit-scrollbar-track {
      background: #1e1e1e;
      border-radius: 4px;
    }

    .template-grid::-webkit-scrollbar-thumb {
      background: #3e3e42;
      border-radius: 4px;
      border: 2px solid #1e1e1e;
    }

    .template-grid::-webkit-scrollbar-thumb:hover {
      background: #007acc;
    }

    /* ===== PROFESSIONAL COMPACT TEMPLATE CARDS ===== */
    .template-item {
      background: #2d2d30;
      border: 1px solid #3e3e42;
      border-radius: 6px;
      padding: 14px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 140px;
    }

    .template-item:hover {
      border-color: #007acc;
      background: #323337;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 122, 204, 0.2);
    }

    .template-item.active {
      border-color: #007acc;
      background: linear-gradient(135deg, #094771 0%, #0e639c 100%);
      box-shadow: 0 3px 10px rgba(0, 122, 204, 0.3);
    }

    .template-item.active::after {
      content: '✓';
      position: absolute;
      top: 8px;
      right: 8px;
      width: 20px;
      height: 20px;
      background: #4FC3F7;
      color: #000;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      box-shadow: 0 2px 6px rgba(79, 195, 247, 0.4);
    }

    .template-logo {
      font-size: 36px;
      text-align: center;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    .template-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .template-name {
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      letter-spacing: 0.2px;
      line-height: 1.2;
    }

    .template-description {
      color: #969696;
      font-size: 11px;
      line-height: 1.4;
      text-align: center;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .template-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      justify-content: center;
      margin-top: auto;
    }

    .template-tag {
      background: rgba(79, 195, 247, 0.12);
      color: #4FC3F7;
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      border: 1px solid rgba(79, 195, 247, 0.2);
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .popular-badge {
      position: absolute;
      top: 6px;
      left: 6px;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 2px 6px rgba(245, 87, 108, 0.4);
      line-height: 1;
    }

    .new-badge {
      position: absolute;
      top: 6px;
      left: 6px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 2px 6px rgba(102, 126, 234, 0.4);
      line-height: 1;
    }

    /* ===== EMPTY STATE (COMPACT) ===== */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #969696;
      grid-column: 1 / -1;
    }

    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 12px;
      opacity: 0.4;
    }

    .empty-state-title {
      font-size: 15px;
      font-weight: 600;
      color: #cccccc;
      margin-bottom: 6px;
    }

    .empty-state-description {
      font-size: 12px;
      line-height: 1.4;
    }

    /* ===== SUBTLE ANIMATIONS ===== */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .template-item {
      animation: fadeInUp 0.2s ease forwards;
    }

    /* Staggered animation - fewer items */
    .template-item:nth-child(1) { animation-delay: 0.03s; }
    .template-item:nth-child(2) { animation-delay: 0.06s; }
    .template-item:nth-child(3) { animation-delay: 0.09s; }
    .template-item:nth-child(4) { animation-delay: 0.12s; }
    .template-item:nth-child(5) { animation-delay: 0.15s; }
    .template-item:nth-child(6) { animation-delay: 0.18s; }

    /* ===== RESPONSIVE ADJUSTMENTS ===== */
    @media (max-width: 768px) {
      .template-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 10px;
      }

      .template-controls {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
      }

      .category-filters {
        justify-content: center;
      }

      .project-type-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    /* ===== LOADING SKELETON ===== */
    .template-skeleton {
      background: linear-gradient(90deg, #2d2d30 0%, #3e3e42 50%, #2d2d30 100%);
      background-size: 200% 100%;
      animation: loading 1.2s ease-in-out infinite;
      border-radius: 6px;
      height: 140px;
    }

    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ===== PROFESSIONAL TYPOGRAPHY ===== */
    .modern-template-wrapper {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* ===== FOCUS STATES FOR ACCESSIBILITY ===== */
    .template-item:focus-visible,
    .category-btn:focus-visible,
    .project-type-item:focus-visible {
      outline: 2px solid #007acc;
      outline-offset: 2px;
    }

    /* ===== PROFESSIONAL SHADOWS ===== */
    .template-item,
    .project-type-item {
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .template-item:hover,
    .project-type-item:hover {
      box-shadow: 0 4px 12px rgba(0, 122, 204, 0.2);
    }

    .template-item.active,
    .project-type-item.active {
      box-shadow: 0 3px 10px rgba(0, 122, 204, 0.3), 
                  0 0 0 1px rgba(0, 122, 204, 0.2);
    }
  `;

  document.head.appendChild(style);
}

// ============================================================================
// PROJECT TYPE SELECTION
// ============================================================================
export function handleProjectTypeSelection(e: Event): void {
  const target = e.currentTarget as HTMLElement;
  const projectType = target.getAttribute('data-type');
  
  if (projectType) {
    selectProjectType(projectType);
  }
}

export function selectProjectType(type: string): void {
  console.log(`🎯 Selecting project type: ${type}`);
  selectedProjectType = type;
  currentSearchQuery = '';
  currentCategory = 'all';
  
  // Update active state
  document.querySelectorAll('.project-type-item').forEach(item => {
    if (item.getAttribute('data-type') === type) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Render templates
  renderModernTemplates(type);
  
  // Update project options
  updateProjectOptions({ templateType: type });
  
  // Select first template
  const templates = TEMPLATES[type];
  if (templates && templates.length > 0) {
    setTimeout(() => {
      selectTemplate(templates[0].id, type);
    }, 100);
  }
  
  updateProjectSummary();
}

// ============================================================================
// MODERN TEMPLATE RENDERING
// ============================================================================
export function renderModernTemplates(type: string): void {
  console.log(`🎨 Rendering templates for ${type}`);
  
  let container = document.getElementById('modern-template-container');
  
  if (!container) {
    const parent = document.querySelector('.project-templates');
    if (!parent) {
      console.error('❌ Templates parent container not found');
      return;
    }
    
    // Hide old containers
    document.querySelectorAll('.template-container').forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
    
    container = document.createElement('div');
    container.id = 'modern-template-container';
    parent.appendChild(container);
  }
  
  // Build UI
  container.innerHTML = `
    <div class="modern-template-wrapper">
      <!-- Compact Search & Filter Bar -->
      <div class="template-controls">
        <div class="search-box">
          <input 
            type="text" 
            id="template-search" 
            placeholder="Search templates..."
            autocomplete="off"
          />
          <button class="clear-search" id="clear-search" title="Clear">×</button>
          <span class="search-icon">🔍</span>
        </div>
        
        <div class="category-filters" id="category-filters">
          ${renderCategoryButtons(type)}
        </div>
      </div>

      <!-- Compact Templates Grid -->
      <div class="template-grid" id="templates-grid">
        ${renderTemplateCards(type)}
      </div>
    </div>
  `;
  
  attachTemplateEventListeners(type);
}

// ============================================================================
// CATEGORY BUTTONS
// ============================================================================
function renderCategoryButtons(type: string): string {
  const templates = TEMPLATES[type] || [];
  
  const categories = new Set<string>();
  templates.forEach(template => {
    if (template.category) {
      categories.add(template.category);
    }
  });
  
  let buttons = `
    <button class="category-btn active" data-category="all">
      All
    </button>
  `;
  
  categories.forEach(category => {
    buttons += `
      <button class="category-btn" data-category="${category}">
        ${category}
      </button>
    `;
  });
  
  return buttons;
}

// ============================================================================
// TEMPLATE CARDS
// ============================================================================
function renderTemplateCards(type: string): string {
  const templates = TEMPLATES[type] || [];
  
  if (templates.length === 0) {
    return renderEmptyState('No templates available');
  }
  
  const filteredTemplates = filterTemplates(templates);
  
  if (filteredTemplates.length === 0) {
    return renderEmptyState('No templates match your search');
  }
  
  return filteredTemplates.map((template, index) => {
    const logo = getTemplateLogo(template.id);
    const tags = getTemplateTags(template);
    const isPopular = isPopularTemplate(template.id);
    const isNew = isNewTemplate(template.id);
    
    return `
      <div 
        class="template-item ${index === 0 ? 'active' : ''}" 
        data-template="${template.id}"
        data-category="${template.category || 'basic'}"
        tabindex="0"
      >
        ${isPopular ? '<div class="popular-badge">🔥 Hot</div>' : ''}
        ${isNew ? '<div class="new-badge">✨ New</div>' : ''}
        
        <div class="template-logo">${logo}</div>
        
        <div class="template-details">
          <div class="template-name">${template.name}</div>
          <div class="template-description">${template.description}</div>
        </div>
        
        ${tags.length > 0 ? `
          <div class="template-tags">
            ${tags.slice(0, 2).map(tag => `
              <span class="template-tag">${tag}</span>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderEmptyState(message: string): string {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-title">${message}</div>
      <div class="empty-state-description">
        Try adjusting your search or filters
      </div>
    </div>
  `;
}

// ============================================================================
// FILTERING & SEARCHING
// ============================================================================
function filterTemplates(templates: ProjectTemplate[]): ProjectTemplate[] {
  return templates.filter(template => {
    if (currentCategory !== 'all') {
      if (template.category !== currentCategory) {
        return false;
      }
    }
    
    if (currentSearchQuery) {
      const query = currentSearchQuery.toLowerCase();
      const searchableText = `
        ${template.name} 
        ${template.description} 
        ${template.id}
        ${template.category || ''}
      `.toLowerCase();
      
      if (!searchableText.includes(query)) {
        return false;
      }
    }
    
    return true;
  });
}

function getTemplateTags(template: ProjectTemplate): string[] {
  const tags: string[] = [];
  
  if (template.useTypeScript) tags.push('TS');
  if (template.category) tags.push(template.category);
  
  if (template.defaultOptions) {
    Object.keys(template.defaultOptions).forEach(key => {
      if (key.includes('tailwind')) tags.push('Tailwind');
      if (key.includes('router')) tags.push('Router');
      if (key.includes('pwa')) tags.push('PWA');
    });
  }
  
  return [...new Set(tags)];
}

function isPopularTemplate(templateId: string): boolean {
  const popularTemplates = [
    'react-vite',
    'nextjs-app',
    'fastapi-basic',
    'express-ts'
  ];
  
  return popularTemplates.includes(templateId);
}

function isNewTemplate(templateId: string): boolean {
  const newTemplates = [
    'flutter-app',
    'solid-vite'
  ];
  
  return newTemplates.includes(templateId);
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================
function attachTemplateEventListeners(type: string): void {
  const searchInput = document.getElementById('template-search') as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = (e.target as HTMLInputElement).value;
      refreshTemplateGrid(type);
    });
  }
  
  const clearBtn = document.getElementById('clear-search');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      currentSearchQuery = '';
      refreshTemplateGrid(type);
    });
  }
  
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const category = target.getAttribute('data-category') || 'all';
      
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      target.classList.add('active');
      
      currentCategory = category;
      refreshTemplateGrid(type);
    });
  });
  
  document.querySelectorAll('.template-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const templateId = target.getAttribute('data-template');
      
      if (templateId) {
        selectTemplate(templateId, type);
      }
    });

    // Keyboard support
    item.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
        (e.currentTarget as HTMLElement).click();
      }
    });
  });
}

function refreshTemplateGrid(type: string): void {
  const grid = document.getElementById('templates-grid');
  if (!grid) return;
  
  grid.innerHTML = renderTemplateCards(type);
  
  grid.querySelectorAll('.template-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const templateId = target.getAttribute('data-template');
      
      if (templateId) {
        selectTemplate(templateId, type);
      }
    });
  });
}

// ============================================================================
// TEMPLATE SELECTION
// ============================================================================
export function selectTemplate(templateId: string, type: string): void {
  console.log(`✨ Selecting template: ${templateId}`);
  selectedTemplateId = templateId;
  
  document.querySelectorAll('.template-item').forEach(item => {
    if (item.getAttribute('data-template') === templateId) {
      item.classList.add('active');
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      item.classList.remove('active');
    }
  });
  
  const template = TEMPLATES[type]?.find(t => t.id === templateId);
  if (!template) return;
  
  updateProjectOptions({ 
    template: templateId,
    useTypeScript: template.useTypeScript !== undefined ? template.useTypeScript : true,
    templateOptions: template.defaultOptions ? { ...template.defaultOptions } : {}
  });
  
  const tsCheckbox = document.getElementById('use-typescript') as HTMLInputElement;
  if (tsCheckbox && template.useTypeScript !== undefined) {
    tsCheckbox.checked = template.useTypeScript;
  }
  
  updateTemplateOptions(template);
  updateProjectSummary();
}

// ============================================================================
// TEMPLATE OPTIONS
// ============================================================================
export function updateTemplateOptions(template: ProjectTemplate): void {
  const optionsContainer = document.querySelector('.template-options');
  if (!optionsContainer) return;
  
  optionsContainer.innerHTML = '';
  
  if (!template.defaultOptions || Object.keys(template.defaultOptions).length === 0) {
    optionsContainer.style.display = 'none';
    return;
  }
  
  optionsContainer.style.display = 'block';
  
  const heading = document.createElement('label');
  heading.textContent = `${template.name} Options`;
  heading.style.cssText = 'font-weight: 600; margin-bottom: 12px; display: block; color: #cccccc; font-size: 13px;';
  optionsContainer.appendChild(heading);
  
  for (const [key, value] of Object.entries(template.defaultOptions)) {
    if (typeof value === 'boolean') {
      const optionContainer = document.createElement('div');
      optionContainer.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 10px;';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `option-${key}`;
      checkbox.checked = value;
      checkbox.style.cssText = 'cursor: pointer; width: 16px; height: 16px;';
      checkbox.addEventListener('change', (e) => {
        const updatedOptions = { ...currentProjectOptions.templateOptions };
        updatedOptions[key] = (e.target as HTMLInputElement).checked;
        updateProjectOptions({ templateOptions: updatedOptions });
      });
      
      const label = document.createElement('label');
      label.htmlFor = `option-${key}`;
      label.textContent = formatOptionLabel(key);
      label.style.cssText = 'cursor: pointer; color: #cccccc; font-size: 13px;';
      
      optionContainer.appendChild(checkbox);
      optionContainer.appendChild(label);
      optionsContainer.appendChild(optionContainer);
    } else if (typeof value === 'string') {
      const optionContainer = document.createElement('div');
      optionContainer.style.cssText = 'margin-bottom: 12px;';
      
      const label = document.createElement('label');
      label.htmlFor = `option-${key}`;
      label.textContent = formatOptionLabel(key);
      label.style.cssText = 'display: block; margin-bottom: 6px; color: #cccccc; font-size: 13px;';
      
      const input = document.createElement('input');
      input.type = 'text';
      input.id = `option-${key}`;
      input.value = value;
      input.style.cssText = `
        width: 100%;
        padding: 8px;
        background: #2d2d30;
        border: 1px solid #3e3e42;
        border-radius: 4px;
        color: #cccccc;
        font-size: 13px;
      `;
      input.addEventListener('input', (e) => {
        const updatedOptions = { ...currentProjectOptions.templateOptions };
        updatedOptions[key] = (e.target as HTMLInputElement).value;
        updateProjectOptions({ templateOptions: updatedOptions });
      });
      
      optionContainer.appendChild(label);
      optionContainer.appendChild(input);
      optionsContainer.appendChild(optionContainer);
    }
  }
}

function formatOptionLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/([a-z])([A-Z])/g, '$1 $2');
}

// ============================================================================
// GLOBAL EVENT LISTENERS
// ============================================================================
function setupGlobalEventListeners(): void {
  document.addEventListener('project-type-selected', ((e: CustomEvent) => {
    selectProjectType(e.detail.type);
  }) as EventListener);
  
  document.addEventListener('refresh-templates', (() => {
    if (selectedProjectType) {
      refreshTemplateGrid(selectedProjectType);
    }
  }) as EventListener);
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================
export function renderTemplates(type: string): void {
  renderModernTemplates(type);
}

export function setupTemplateSelectionHandlers(type: string): void {
  console.log('✅ Template handlers auto-attached');
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTemplateUI);
} else {
  initializeTemplateUI();
}

(window as any).modernTemplateUI = {
  initialize: initializeTemplateUI,
  selectProjectType,
  selectTemplate,
  renderModernTemplates
};