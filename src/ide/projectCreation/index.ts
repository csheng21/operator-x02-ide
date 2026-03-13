// ide/projectCreation/index.ts
// Updated to support plugin-based project templates including Android Support

import { setupFormInputListeners } from './ui/formHandlers';
import { createNewProjectButton, setupNewProjectMenuItem } from './ui/menuHandlers';
import { handleProjectTypeSelection } from './ui/templateUI';
import { PluginManager, ProjectTemplate } from '../../plugins/core/pluginManager';

// Project creation manager with plugin support
export class ProjectCreationManager {
  private static instance: ProjectCreationManager;
  private pluginManager: PluginManager;
  private coreTemplates: ProjectTemplate[] = [];

  private constructor() {
    this.pluginManager = PluginManager.getInstance();
    this.initializeCoreTemplates();
  }

  public static getInstance(): ProjectCreationManager {
    if (!ProjectCreationManager.instance) {
      ProjectCreationManager.instance = new ProjectCreationManager();
    }
    return ProjectCreationManager.instance;
  }

  // Initialize core (non-plugin) templates
  private initializeCoreTemplates(): void {
    this.coreTemplates = [
      {
        id: 'python-basic',
        name: 'Python Project',
        description: 'Basic Python project with virtual environment',
        category: 'data-science',
        framework: 'Python',
        icon: '🐍'
      },
      {
        id: 'react-app',
        name: 'React Application',
        description: 'Modern React app with TypeScript',
        category: 'web',
        framework: 'React',
        icon: '⚛️'
      },
      {
        id: 'node-api',
        name: 'Node.js API',
        description: 'RESTful API with Express and TypeScript',
        category: 'web',
        framework: 'Node.js',
        icon: '🟢'
      },
      {
        id: 'flutter-app',
        name: 'Flutter App',
        description: 'Cross-platform mobile app with Flutter',
        category: 'mobile',
        framework: 'Flutter',
        icon: '💙'
      }
    ];
  }

  // 🆕 Get all available templates (core + plugins)
  public getAvailableTemplates(): ProjectTemplate[] {
    const pluginTemplates = this.pluginManager.getProjectTemplates();
    return [...this.coreTemplates, ...pluginTemplates];
  }

  // 🆕 Get templates by category (including plugin templates)
  public getTemplatesByCategory(category?: string): ProjectTemplate[] {
    const allTemplates = this.getAvailableTemplates();
    if (!category) return allTemplates;
    return allTemplates.filter(t => t.category === category);
  }

  // 🆕 Get a specific template
  public getTemplate(templateId: string): ProjectTemplate | undefined {
    return this.getAvailableTemplates().find(t => t.id === templateId);
  }

  // 🆕 Create project (handles both core and plugin templates)
  public async createProject(templateId: string, projectData: any, projectPath: string): Promise<any> {
    console.log(`Creating project with template: ${templateId}`);
    
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Check if it's a plugin template with custom creation logic
    if (template.createProject) {
      return await template.createProject(projectPath, projectData);
    }

    // Check if it's a wizard-based template
    if (template.wizard) {
      return await this.showTemplateWizard(template);
    }

    // Otherwise, use standard project creation
    return await this.createStandardProject(templateId, projectData, projectPath);
  }

  // 🆕 Show wizard for complex templates (like Android)
  private async showTemplateWizard(template: ProjectTemplate): Promise<any> {
    console.log(`Showing wizard for template: ${template.name}`);
    
    if (template.showWizard) {
      return await template.showWizard();
    }

    // Default wizard behavior
    return await this.showDefaultWizard(template);
  }

  // Show default wizard (can be enhanced based on template type)
  private async showDefaultWizard(template: ProjectTemplate): Promise<any> {
    // For mobile templates, show enhanced wizard
    if (template.category === 'mobile') {
      return await this.showMobileWizard(template);
    }

    // For other templates, show basic form
    return await this.showBasicProjectForm(template);
  }

  // Enhanced wizard for mobile projects
  private async showMobileWizard(template: ProjectTemplate): Promise<any> {
    console.log(`Showing mobile wizard for template: ${template.name}`);
    
    // TODO: Implement React-based wizard component
    // For now, fall back to basic form until MobileProjectWizard component is created
    
    // Future implementation will load the wizard component like this:
    // const wizardContainer = document.createElement('div');
    // wizardContainer.id = 'mobile-wizard-container';
    // document.body.appendChild(wizardContainer);
    // const { default: MobileWizard } = await import('../components/MobileProjectWizard');
    
    console.log('Mobile wizard component not yet implemented, using basic form');
    return await this.showBasicProjectForm(template);
  }

  // Basic project form for simpler templates
  private async showBasicProjectForm(template: ProjectTemplate): Promise<any> {
    // Show the existing project creation modal with this template pre-selected
    document.dispatchEvent(new CustomEvent('show-project-modal', { 
      detail: { selectedTemplate: template.id } 
    }));
    
    return new Promise((resolve) => {
      // Listen for project creation completion
      const handler = (event: CustomEvent) => {
        if (event.detail.templateId === template.id) {
          document.removeEventListener('project-created', handler);
          resolve(event.detail);
        }
      };
      document.addEventListener('project-created', handler);
    });
  }

  // Standard project creation for core templates
  private async createStandardProject(templateId: string, projectData: any, projectPath: string): Promise<any> {
    // Import your existing project creation logic
    const { createProject } = await import('./services/projectGenerator');
    
    return await createProject({
      name: projectData.name,
      location: projectPath,
      template: templateId,
      templateType: this.getTemplateCategory(templateId),
      useTypeScript: projectData.useTypeScript || false,
      templateOptions: projectData.templateOptions || {}
    });
  }

  // Get category for a template
  private getTemplateCategory(templateId: string): string {
    const template = this.getTemplate(templateId);
    return template?.category || 'other';
  }

  // 🆕 Get available project categories
  public getAvailableCategories(): string[] {
    const templates = this.getAvailableTemplates();
    const categories = new Set(templates.map(t => t.category));
    return Array.from(categories);
  }

  // 🆕 Get templates grouped by category
  public getTemplatesGroupedByCategory(): Record<string, ProjectTemplate[]> {
    const templates = this.getAvailableTemplates();
    const grouped: Record<string, ProjectTemplate[]> = {};
    
    for (const template of templates) {
      const category = template.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(template);
    }
    
    return grouped;
  }
}

// Initialize the project creation system
export function initializeProjectCreation(): void {
  console.log('Initializing project creation module with plugin support');
  
  // Initialize the project creation manager
  const manager = ProjectCreationManager.getInstance();
  
  // Setup event listeners
  setupEventListeners();
  
  // Setup plugin integration
  setupPluginIntegration();
  
  console.log('Project creation module initialized with', 
    manager.getAvailableTemplates().length, 'templates');
}

// Set up event listeners for the project creation dialog
function setupEventListeners(): void {
  console.log('Setting up project creation event listeners');
  
  // Add 'New Project' button to the menu bar
  setupNewProjectMenuItem();
  
  // Show project modal when "New Project" is clicked
  const newProjectBtn = document.getElementById('new-project-btn');
  if (newProjectBtn) {
    newProjectBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('show-project-modal'));
    });
    console.log('New project button found and handler attached');
  } else {
    console.log('New project button not found, creating one');
    createNewProjectButton();
  }

  // File -> New Project menu item
  document.addEventListener('menu-new-project', () => {
    document.dispatchEvent(new CustomEvent('show-project-modal'));
  });
  
  // Project type selection (enhanced to support plugin templates)
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains('project-type-item')) {
      handleProjectTypeSelection(event);
    }
  });
  
  // Register modal listener (enhanced)
  document.addEventListener('show-project-modal', (event: CustomEvent) => {
    import('./ui/modalHandlers').then(module => {
      const selectedTemplate = event.detail?.selectedTemplate;
      module.showProjectModal(selectedTemplate);
    });
  });
  
  // 🆕 Handle plugin template selection
  document.addEventListener('template-selected', async (event: CustomEvent) => {
    const { templateId, projectData, projectPath } = event.detail;
    const manager = ProjectCreationManager.getInstance();
    
    try {
      await manager.createProject(templateId, projectData, projectPath);
      
      // Dispatch success event
      document.dispatchEvent(new CustomEvent('project-created', {
        detail: { templateId, projectData, projectPath, success: true }
      }));
    } catch (error) {
      console.error('Failed to create project:', error);
      
      // Dispatch error event
      document.dispatchEvent(new CustomEvent('project-creation-error', {
        detail: { templateId, error: error.message }
      }));
    }
  });
  
  // Initialize with enhanced template loading
  setTimeout(() => {
    const manager = ProjectCreationManager.getInstance();
    const categories = manager.getAvailableCategories();
    
    import('./ui/templateUI').then(module => {
      // Select first available category or default to 'web'
      const defaultCategory = categories.includes('web') ? 'web' : categories[0];
      module.selectProjectType(defaultCategory);
      console.log(`Default project type (${defaultCategory}) selected`);
    });
  }, 500);
  
  // Cancel button
  const cancelBtn = document.getElementById('cancel-project');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      import('./ui/modalHandlers').then(module => {
        module.hideProjectModal();
      });
    });
  }
  
  // Close modal button
  const closeModalBtns = document.querySelectorAll('#new-project-modal .close-modal');
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      import('./ui/modalHandlers').then(module => {
        module.hideProjectModal();
      });
    });
  });
  
  // Form inputs
  setupFormInputListeners();
  
  console.log('All project creation event listeners set up');
}

// 🆕 Setup plugin integration
function setupPluginIntegration(): void {
  console.log('Setting up plugin integration for project creation');
  
  const pluginManager = PluginManager.getInstance();
  
  // Listen for plugin state changes
  document.addEventListener('plugin:enabled', (event: CustomEvent) => {
    const { pluginId } = event.detail;
    console.log(`Plugin ${pluginId} enabled - refreshing templates`);
    refreshProjectTemplates();
  });
  
  document.addEventListener('plugin:disabled', (event: CustomEvent) => {
    const { pluginId } = event.detail;
    console.log(`Plugin ${pluginId} disabled - refreshing templates`);
    refreshProjectTemplates();
  });
}

// 🆕 Refresh project templates when plugins change
function refreshProjectTemplates(): void {
  const manager = ProjectCreationManager.getInstance();
  const templates = manager.getAvailableTemplates();
  
  console.log(`Refreshed templates - now have ${templates.length} available`);
  
  // Update UI if project modal is open
  const projectModal = document.getElementById('new-project-modal');
  if (projectModal && projectModal.style.display === 'block') {
    import('./ui/templateUI').then(module => {
      module.refreshTemplateCategories();
    });
  }
}

// Enhanced embedded project support
function setupEmbeddedProjectSupport(): void {
  // Add direct embedded project button
  setTimeout(() => {
    const ideControls = document.querySelector('.ide-controls') || 
                        document.querySelector('.toolbar') ||
                        document.querySelector('header');
    
    if (ideControls) {
      const embeddedButton = document.createElement('button');
      embeddedButton.textContent = '🎛️ Create Embedded';
      embeddedButton.className = 'embedded-project-button';
      embeddedButton.style.backgroundColor = '#2d2d30';
      embeddedButton.style.border = '1px solid #3e3e42';
      embeddedButton.style.color = '#cccccc';
      embeddedButton.style.padding = '5px 10px';
      embeddedButton.style.borderRadius = '4px';
      embeddedButton.style.cursor = 'pointer';
      embeddedButton.style.marginLeft = '10px';
      
      embeddedButton.addEventListener('click', () => {
        // Show embedded project creation
        showEmbeddedProjectDialog();
      });
      
      ideControls.appendChild(embeddedButton);
      console.log('Added embedded project button');
    }
  }, 2000);
}

// Show embedded project dialog
function showEmbeddedProjectDialog(): void {
  const manager = ProjectCreationManager.getInstance();
  const embeddedTemplates = manager.getTemplatesByCategory('embedded');
  
  if (embeddedTemplates.length === 0) {
    // Fallback to legacy embedded templates
    import('./templates').then(templateModule => {
      const legacyEmbeddedTemplates = templateModule.TEMPLATES?.embedded || [];
      if (legacyEmbeddedTemplates.length > 0) {
        showLegacyEmbeddedDialog(legacyEmbeddedTemplates);
      } else {
        console.error('No embedded templates found');
        alert('No embedded templates available');
      }
    });
    return;
  }
  
  // Show modern embedded dialog
  showModernEmbeddedDialog(embeddedTemplates);
}

// Modern embedded dialog for plugin-based templates
function showModernEmbeddedDialog(templates: ProjectTemplate[]): void {
  // Create modal with modern embedded templates
  console.log('Showing modern embedded dialog with', templates.length, 'templates');
  
  // Trigger the standard project creation flow with embedded category
  document.dispatchEvent(new CustomEvent('show-project-modal', {
    detail: { selectedCategory: 'embedded' }
  }));
}

// Legacy embedded dialog (fallback)
function showLegacyEmbeddedDialog(templates: any[]): void {
  // Create modal container
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '9999';
  
  // Create dialog content
  const dialog = document.createElement('div');
  dialog.style.backgroundColor = '#252526';
  dialog.style.borderRadius = '5px';
  dialog.style.padding = '20px';
  dialog.style.width = '700px';
  dialog.style.maxWidth = '90%';
  dialog.style.maxHeight = '80%';
  dialog.style.overflow = 'auto';
  dialog.style.color = '#e1e1e1';
  
  // Add title
  const title = document.createElement('h2');
  title.textContent = 'Create Embedded Project';
  title.style.margin = '0 0 20px 0';
  title.style.borderBottom = '1px solid #3e3e42';
  title.style.paddingBottom = '10px';
  
  // Add template selection
  const templateSelection = document.createElement('div');
  templateSelection.innerHTML = '<label style="display:block;margin-bottom:10px;">Select Template:</label>';
  
  const templateSelect = document.createElement('select');
  templateSelect.style.width = '100%';
  templateSelect.style.padding = '8px';
  templateSelect.style.backgroundColor = '#3c3c3c';
  templateSelect.style.color = '#e1e1e1';
  templateSelect.style.border = '1px solid #5a5a5a';
  templateSelect.style.borderRadius = '4px';
  templateSelect.style.marginBottom = '20px';
  
  templates.forEach(template => {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = `${template.name} - ${template.description}`;
    templateSelect.appendChild(option);
  });
  
  templateSelection.appendChild(templateSelect);
  
  // Add project name input
  const nameField = document.createElement('div');
  nameField.innerHTML = '<label style="display:block;margin-bottom:10px;">Project Name:</label>';
  
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'my-embedded-project';
  nameInput.style.width = '100%';
  nameInput.style.padding = '8px';
  nameInput.style.backgroundColor = '#3c3c3c';
  nameInput.style.color = '#e1e1e1';
  nameInput.style.border = '1px solid #5a5a5a';
  nameInput.style.borderRadius = '4px';
  nameInput.style.marginBottom = '20px';
  
  nameField.appendChild(nameInput);
  
  // Add location input
  const locationField = document.createElement('div');
  locationField.innerHTML = '<label style="display:block;margin-bottom:10px;">Location:</label>';
  
  const locationInput = document.createElement('input');
  locationInput.type = 'text';
  locationInput.placeholder = '/path/to/project';
  locationInput.style.width = 'calc(100% - 100px)';
  locationInput.style.padding = '8px';
  locationInput.style.backgroundColor = '#3c3c3c';
  locationInput.style.color = '#e1e1e1';
  locationInput.style.border = '1px solid #5a5a5a';
  locationInput.style.borderRadius = '4px';
  locationInput.style.marginBottom = '20px';
  
  const browseButton = document.createElement('button');
  browseButton.textContent = 'Browse';
  browseButton.style.padding = '8px 12px';
  browseButton.style.backgroundColor = '#3e3e42';
  browseButton.style.color = '#e1e1e1';
  browseButton.style.border = 'none';
  browseButton.style.borderRadius = '4px';
  browseButton.style.marginLeft = '10px';
  browseButton.style.cursor = 'pointer';
  
  browseButton.onclick = async () => {
    if ((window as any).dialog?.open) {
      try {
        const path = await (window as any).dialog.open({
          directory: true,
          multiple: false,
          title: 'Select Project Location'
        });
        
        if (path) {
          locationInput.value = Array.isArray(path) ? path[0] : path;
        }
      } catch (err) {
        console.error('Error selecting location:', err);
      }
    }
  };
  
  locationField.appendChild(locationInput);
  locationField.appendChild(browseButton);
  
  // Add buttons
  const buttons = document.createElement('div');
  buttons.style.display = 'flex';
  buttons.style.justifyContent = 'flex-end';
  buttons.style.marginTop = '20px';
  
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.padding = '8px 16px';
  cancelButton.style.backgroundColor = '#3e3e42';
  cancelButton.style.color = '#e1e1e1';
  cancelButton.style.border = 'none';
  cancelButton.style.borderRadius = '4px';
  cancelButton.style.marginRight = '10px';
  cancelButton.style.cursor = 'pointer';
  
  const createButton = document.createElement('button');
  createButton.textContent = 'Create Project';
  createButton.style.padding = '8px 16px';
  createButton.style.backgroundColor = '#0e639c';
  createButton.style.color = '#e1e1e1';
  createButton.style.border = 'none';
  createButton.style.borderRadius = '4px';
  createButton.style.cursor = 'pointer';
  
  cancelButton.onclick = () => {
    document.body.removeChild(modal);
  };
  
  createButton.onclick = async () => {
    const templateId = templateSelect.value;
    const projectName = nameInput.value.trim();
    const projectPath = locationInput.value.trim();
    
    if (!projectName) {
      alert('Please enter a project name');
      return;
    }
    
    if (!projectPath) {
      alert('Please select a project location');
      return;
    }
    
    // Create the project
    try {
      // Close the dialog
      document.body.removeChild(modal);
      
      // Use the project creation manager
      const manager = ProjectCreationManager.getInstance();
      await manager.createProject(templateId, {
        name: projectName,
        templateOptions: templates.find(t => t.id === templateId)?.defaultOptions || {}
      }, projectPath);
      
      // Show success message
      import('./ui/modalHandlers').then(module => {
        module.showSuccessMessage(projectName);
      });
    } catch (err) {
      console.error('Error creating project:', err);
      alert(`Error creating project: ${err.message}`);
    }
  };
  
  buttons.appendChild(cancelButton);
  buttons.appendChild(createButton);
  
  // Assemble the dialog
  dialog.appendChild(title);
  dialog.appendChild(templateSelection);
  dialog.appendChild(nameField);
  dialog.appendChild(locationField);
  dialog.appendChild(buttons);
  
  modal.appendChild(dialog);
  document.body.appendChild(modal);
}

// Add enhanced project creation support
function enhanceProjectCreationWithPlugins(): void {
  console.log('Enhancing project creation with plugin support');
  
  // Create an observer that will look for the project creation modal when it opens
  const observer = new MutationObserver((mutations, obs) => {
    // Look for the project modal
    const projectModal = document.getElementById('new-project-modal');
    if (projectModal && projectModal.style.display === 'block') {
      console.log('Project creation modal detected - adding plugin categories');
      
      // Look for the project types container (sidebar)
      const projectTypes = projectModal.querySelector('.project-types');
      if (projectTypes) {
        addPluginCategoriesToModal(projectTypes);
      } else {
        console.log('Project types container not found');
      }
    }
  });
  
  // Start observing the document for changes
  observer.observe(document.body, { childList: true, subtree: true });
  console.log('Observer started for project creation enhancement');
}

// Add plugin categories to the project modal
function addPluginCategoriesToModal(projectTypes: Element): void {
  const manager = ProjectCreationManager.getInstance();
  const categories = manager.getAvailableCategories();
  
  // Get existing project type items to match their style
  const existingItems = projectTypes.querySelectorAll('[data-type]');
  
  if (existingItems.length === 0) return;
  
  // Add each new category that doesn't exist
  categories.forEach(category => {
    const existing = projectTypes.querySelector(`[data-type="${category}"]`);
    if (!existing) {
      addCategoryToModal(projectTypes, category, existingItems[0] as HTMLElement);
    }
  });
}

// Add a specific category to the modal
function addCategoryToModal(projectTypes: Element, category: string, template: HTMLElement): void {
  // Clone the template item to maintain styling
  const categoryItem = template.cloneNode(true) as HTMLElement;
  
  // Set category properties
  categoryItem.setAttribute('data-type', category);
  
  // Set icon and text based on category
  const categoryConfig = getCategoryConfig(category);
  
  // Try to find the icon and text elements
  const icon = categoryItem.querySelector('.type-icon, span, i');
  const text = categoryItem.querySelector('.type-name, div:not(.type-icon)');
  
  if (icon) {
    icon.textContent = categoryConfig.icon;
  }
  
  if (text) {
    text.textContent = categoryConfig.name;
  } else {
    // If we can't find separate elements, update the whole content
    categoryItem.textContent = `${categoryConfig.icon} ${categoryConfig.name}`;
  }
  
  // Add click handler
  categoryItem.addEventListener('click', async () => {
    console.log(`${category} category selected`);
    
    // Clear active class from all items
    projectTypes.querySelectorAll('[data-type]').forEach(item => item.classList.remove('active'));
    categoryItem.classList.add('active');
    
    // Render templates for this category
    const templateUI = await import('./ui/templateUI');
    templateUI.renderTemplates(category);
  });
  
  // Add to project types
  projectTypes.appendChild(categoryItem);
  console.log(`${category} category added successfully`);
}

// Get category configuration (icon and display name)
function getCategoryConfig(category: string): { icon: string; name: string } {
  const configs: Record<string, { icon: string; name: string }> = {
    'mobile': { icon: '📱', name: 'Mobile Application' },
    'web': { icon: '🌐', name: 'Web Application' },
    'desktop': { icon: '🖥️', name: 'Desktop Application' },
    'data-science': { icon: '📊', name: 'Data Science' },
    'embedded': { icon: '🎛️', name: 'Embedded Application' },
    'game': { icon: '🎮', name: 'Game Development' },
    'other': { icon: '📁', name: 'Other' }
  };
  
  return configs[category] || { icon: '📁', name: category.charAt(0).toUpperCase() + category.slice(1) };
}

// Call initialization functions when the module loads
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initializeProjectCreation();
    // setupEmbeddedProjectSupport(); // Removed: Create Embedded button no longer needed
    enhanceProjectCreationWithPlugins();
  }, 1000);
});

// Export utilities for use elsewhere
export * from './types';
export { currentProjectOptions } from './projectOptions';