// embedded-direct.js

// Make the function global so it can be called from anywhere
window.addEmbeddedToProjectDialog = function() {
  console.log("Manual embedded category function called");
  
  // Get the modal and check if it's visible
  const modal = document.getElementById('new-project-modal');
  if (!modal || getComputedStyle(modal).display === 'none') {
    console.log("Project modal not found or not visible");
    return;
  }
  
  // Get the project type list
  const projectTypeList = modal.querySelector('.project-type-list');
  if (!projectTypeList) {
    console.log("Project type list not found");
    return;
  }
  
  // Check if embedded already exists
  if (projectTypeList.querySelector('[data-type="embedded"]')) {
    console.log("Embedded category already exists");
    return;
  }
  
  console.log("Adding embedded category...");
  
  // Create new embedded item
  const embeddedItem = document.createElement('div');
  embeddedItem.className = 'project-type-item';
  embeddedItem.setAttribute('data-type', 'embedded');
  embeddedItem.innerHTML = `
    <div class="project-type-icon">🎛️</div>
    <div class="project-type-name">Embedded Application</div>
  `;
  
  // Add click handler
  embeddedItem.addEventListener('click', function() {
    // Set this as active
    projectTypeList.querySelectorAll('.project-type-item').forEach(item => {
      item.classList.remove('active');
    });
    embeddedItem.classList.add('active');
    
    // Create and show embedded templates
    const templatesArea = modal.querySelector('.project-templates');
    if (templatesArea) {
      // Hide all other template containers
      templatesArea.querySelectorAll('.template-container').forEach(container => {
        container.style.display = 'none';
      });
      
      // Check if embedded container exists
      let embeddedContainer = document.getElementById('embedded-templates');
      if (!embeddedContainer) {
        // Create from scratch
        embeddedContainer = document.createElement('div');
        embeddedContainer.className = 'template-container';
        embeddedContainer.id = 'embedded-templates';
        
        // Add heading
        const heading = document.createElement('h3');
        heading.textContent = 'Embedded Application Templates';
        embeddedContainer.appendChild(heading);
        
        // Create template grid
        const grid = document.createElement('div');
        grid.className = 'template-grid';
        
        // Add templates
        const templates = [
          {id: 'arduino', name: 'Arduino', logo: '⚡', desc: 'Arduino-based embedded project'},
          {id: 'stm32', name: 'STM32', logo: '🔌', desc: 'STM32 microcontroller project with HAL'},
          {id: 'esp32', name: 'ESP32', logo: '📡', desc: 'ESP32 project with Arduino or ESP-IDF'},
          {id: 'generic-embedded', name: 'Generic Embedded', logo: '🎛️', desc: 'Generic embedded C/C++ project with Makefile'}
        ];
        
        templates.forEach(t => {
          const item = document.createElement('div');
          item.className = 'template-item';
          item.setAttribute('data-template', t.id);
          
          item.innerHTML = `
            <div class="template-logo">${t.logo}</div>
            <div class="template-details">
              <div class="template-name">${t.name}</div>
              <div class="template-description">${t.desc}</div>
            </div>
          `;
          
          // Add click handler
          item.addEventListener('click', function() {
            grid.querySelectorAll('.template-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Update selected template info
            const info = modal.querySelector('.selected-template');
            if (info) {
              info.textContent = `${t.name} Embedded Application`;
            }
          });
          
          grid.appendChild(item);
        });
        
        // Make first template active
        const firstTemplate = grid.querySelector('.template-item');
        if (firstTemplate) {
          firstTemplate.classList.add('active');
        }
        
        embeddedContainer.appendChild(grid);
        templatesArea.appendChild(embeddedContainer);
      }
      
      // Show the embedded container
      embeddedContainer.style.display = 'block';
      
      // Update template info
      const templateInfo = modal.querySelector('.selected-template');
      const activeTemplate = embeddedContainer.querySelector('.template-item.active');
      if (templateInfo && activeTemplate) {
        const templateName = activeTemplate.querySelector('.template-name').textContent;
        templateInfo.textContent = `${templateName} Embedded Application`;
      }
    }
  });
  
  // Add to project type list
  projectTypeList.appendChild(embeddedItem);
  
  console.log("Embedded category added successfully");
};

// Add a hook to the "Create New Project" button
document.addEventListener('DOMContentLoaded', function() {
  const createProjectButtons = document.querySelectorAll('.Create.New.Project, #create-new-project-btn, #new-project-btn, button:contains("Create New Project")');
  createProjectButtons.forEach(button => {
    const originalClick = button.onclick;
    button.onclick = function(e) {
      if (originalClick) originalClick.call(this, e);
      
      // Wait for modal to open
      setTimeout(() => {
        window.addEmbeddedToProjectDialog();
      }, 500);
    };
  });
  
  // Also hook the modal directly
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const modal = document.getElementById('new-project-modal');
        if (modal && getComputedStyle(modal).display !== 'none') {
          window.addEmbeddedToProjectDialog();
        }
      }
    }
  });
  
  const modal = document.getElementById('new-project-modal');
  if (modal) {
    observer.observe(modal, { attributes: true });
  }
});

// Try to add immediately in case modal is already open
setTimeout(window.addEmbeddedToProjectDialog, 1000);