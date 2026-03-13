// src/ide/projectCreation/ui/modalHandlers.ts
import { selectProjectType } from './templateUI';
import { projectCategories } from '../projectOptions';
import { TEMPLATES } from '../templates';

// Show the project creation modal
export function showProjectModal(): void {
  console.log('Showing project modal');
  const modal = document.getElementById('new-project-modal');
  if (modal) {
    modal.style.display = 'block';
    
    // Add embedded category if it doesn't exist
    const sidebarContainer = modal.querySelector('.project-types');
    if (sidebarContainer) {
      // Get all existing sidebar items
      const sidebarItems = sidebarContainer.querySelectorAll('[role="button"], .project-type-item');
      
      // Check if embedded category already exists
      const existingEmbedded = Array.from(sidebarItems).find(item => 
        item.textContent.includes('Embedded Application')
      );
      
      if (!existingEmbedded) {
        console.log('Adding embedded category to project creation sidebar');
        
        // Clone an existing item to match styling (using the first item as template)
        const template = sidebarItems[0];
        if (template) {
          const embeddedItem = template.cloneNode(true);
          
          // Update content
          // If there's an icon element, update it
          const icon = embeddedItem.querySelector('img, i, span:first-child');
          if (icon) {
            if (icon.tagName === 'IMG') {
              icon.src = ''; // Clear src if it's an image
              icon.textContent = '🎛️';
            } else {
              icon.textContent = '🎛️';
            }
          } else {
            // If no icon element, just update the whole text
            embeddedItem.textContent = '🎛️ Embedded Application';
          }
          
          // If there's a text element separate from the icon, update it
          const text = embeddedItem.querySelector('span:not(:first-child), div:not(:first-child)');
          if (text) {
            text.textContent = 'Embedded Application';
          }
          
          // Set data attribute
          embeddedItem.setAttribute('data-type', 'embedded');
          
          // Add click handler
          embeddedItem.addEventListener('click', () => {
            // 1. Update active state in sidebar
            sidebarItems.forEach(item => {
              item.classList.remove('active');
              item.setAttribute('aria-selected', 'false');
              item.style.backgroundColor = '';
            });
            embeddedItem.classList.add('active');
            embeddedItem.setAttribute('aria-selected', 'true');
            
            // 2. Show embedded templates
            const templates = TEMPLATES.embedded || [];
            
            // Find the content area
            const contentArea = document.querySelector('.template-container, .template-grid');
            if (contentArea) {
              const parent = contentArea.parentElement;
              
              // Clear existing templates
              parent.innerHTML = '';
              
              // Add header
              const header = document.createElement('h3');
              header.textContent = 'Embedded Application Templates';
              parent.appendChild(header);
              
              // Create grid for templates
              const grid = document.createElement('div');
              grid.className = 'template-grid';
              grid.style.display = 'grid';
              grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
              grid.style.gap = '15px';
              
              // Add embedded templates
              templates.forEach((template) => {
                const card = document.createElement('div');
                card.className = 'template-item';
                card.setAttribute('data-template', template.id);
                card.style.backgroundColor = '#1e2431';
                card.style.borderRadius = '5px';
                card.style.padding = '15px';
                card.style.cursor = 'pointer';
                
                card.innerHTML = `
                  <div style="font-size: 24px;">${template.id === 'arduino' ? '⚡' : 
                              template.id === 'stm32' ? '🔌' : 
                              template.id === 'esp32' ? '📡' : '🎛️'}</div>
                  <h4 style="margin: 10px 0;">${template.name}</h4>
                  <p style="color: #aaa; margin: 0;">${template.description}</p>
                `;
                
                // Add selection behavior
                card.addEventListener('click', () => {
                  // Select this template
                  document.querySelectorAll('.template-item').forEach(
                    item => item.classList.remove('active')
                  );
                  card.classList.add('active');
                  
                  // Update project options
                  import('../projectOptions').then(module => {
                    module.updateProjectOptions({
                      template: template.id,
                      templateType: 'embedded',
                      useTypeScript: false,
                      templateOptions: template.defaultOptions || {}
                    });
                  });
                });
                
                grid.appendChild(card);
              });
              
              parent.appendChild(grid);
              
              // Select first template by default
              const firstTemplate = grid.querySelector('.template-item');
              if (firstTemplate) {
                firstTemplate.classList.add('active');
                const templateId = firstTemplate.getAttribute('data-template');
                if (templateId) {
                  import('../projectOptions').then(module => {
                    const template = templates.find(t => t.id === templateId);
                    module.updateProjectOptions({
                      template: templateId,
                      templateType: 'embedded',
                      useTypeScript: false,
                      templateOptions: template?.defaultOptions || {}
                    });
                  });
                }
              }
            }
          });
          
          // Add to sidebar
          sidebarContainer.appendChild(embeddedItem);
          console.log('Embedded Application category added successfully');
        }
      }
    }
    
    // Focus the project name input
    const projectNameInput = document.getElementById('project-name');
    if (projectNameInput) {
      projectNameInput.focus();
    }
    
    // Ensure the templates are rendered for the default type
    selectProjectType('web');
  } else {
    console.error('Project modal not found');
  }
}

// Hide the project creation modal
export function hideProjectModal(): void {
  const modal = document.getElementById('new-project-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Show success message after project creation
export function showSuccessMessage(projectName: string): void {
  const messageElement = document.createElement('div');
  messageElement.className = 'success-message';
  messageElement.textContent = `Project "${projectName}" created successfully!`;
  messageElement.style.position = 'fixed';
  messageElement.style.bottom = '20px';
  messageElement.style.right = '20px';
  messageElement.style.backgroundColor = '#10a37f';
  messageElement.style.color = 'white';
  messageElement.style.padding = '12px 20px';
  messageElement.style.borderRadius = '4px';
  messageElement.style.zIndex = '9999';
  messageElement.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.2)';
  
  document.body.appendChild(messageElement);
  
  setTimeout(() => {
    messageElement.style.opacity = '0';
    messageElement.style.transition = 'opacity 0.5s';
    
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, 500);
  }, 3000);
}