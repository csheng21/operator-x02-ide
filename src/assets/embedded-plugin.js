// embedded-plugin.js
console.log("Embedded plugin script loaded");

// Function to add embedded category to project dialog
function addEmbeddedCategory() {
  // Target the project dialog when it opens
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length || mutation.attributeChanged) {
        // Check for project modal
        const projectModal = document.getElementById('new-project-modal');
        if (projectModal && getComputedStyle(projectModal).display !== 'none') {
          // Find the sidebar (project type list)
          const projectTypeList = projectModal.querySelector('.project-type-list');
          if (projectTypeList) {
            // Check if embedded category already exists
            const existingEmbedded = projectTypeList.querySelector('[data-type="embedded"]');
            if (!existingEmbedded) {
              console.log("Adding embedded category to sidebar");
              
              // Get existing project type items to copy style
              const existingItem = projectTypeList.querySelector('.project-type-item');
              if (!existingItem) return;
              
              // Clone an existing item as template
              const embeddedItem = existingItem.cloneNode(true);
              
              // Set data attribute
              embeddedItem.setAttribute('data-type', 'embedded');
              embeddedItem.classList.remove('active');
              
              // Find and update the icon element
              const iconElement = embeddedItem.querySelector('.project-type-icon');
              if (iconElement) {
                iconElement.textContent = '🎛️';
              }
              
              // Find and update the name element
              const nameElement = embeddedItem.querySelector('.project-type-name');
              if (nameElement) {
                nameElement.textContent = 'Embedded Application';
              }
              
              // Add click handler
              embeddedItem.addEventListener('click', () => {
                console.log("Embedded category clicked");
                
                // Remove active class from other items
                projectTypeList.querySelectorAll('.project-type-item').forEach(item => {
                  item.classList.remove('active');
                });
                
                // Add active class to this item
                embeddedItem.classList.add('active');
                
                // Find the templates container
                const templatesContainer = projectModal.querySelector('.project-templates');
                if (templatesContainer) {
                  // Hide all template containers
                  templatesContainer.querySelectorAll('.template-container').forEach(container => {
                    container.style.display = 'none';
                  });
                  
                  // Check if embedded template container exists
                  let embeddedContainer = document.getElementById('embedded-templates');
                  if (!embeddedContainer) {
                    // Create embedded template container
                    embeddedContainer = document.createElement('div');
                    embeddedContainer.id = 'embedded-templates';
                    embeddedContainer.className = 'template-container';
                    
                    // Create heading
                    const heading = document.createElement('h3');
                    heading.textContent = 'Embedded Application Templates';
                    embeddedContainer.appendChild(heading);
                    
                    // Create template grid
                    const templateGrid = document.createElement('div');
                    templateGrid.className = 'template-grid';
                    
                    // Add templates
                    const templates = [
                      {
                        id: 'arduino',
                        name: 'Arduino',
                        logo: '⚡',
                        description: 'Arduino-based embedded project'
                      },
                      {
                        id: 'stm32',
                        name: 'STM32',
                        logo: '🔌',
                        description: 'STM32 microcontroller project with HAL'
                      },
                      {
                        id: 'esp32',
                        name: 'ESP32',
                        logo: '📡',
                        description: 'ESP32 project with Arduino or ESP-IDF'
                      },
                      {
                        id: 'generic-embedded',
                        name: 'Generic Embedded',
                        logo: '🎛️',
                        description: 'Generic embedded C/C++ project with Makefile'
                      }
                    ];
                    
                    templates.forEach(template => {
                      const templateItem = document.createElement('div');
                      templateItem.className = 'template-item';
                      templateItem.setAttribute('data-template', template.id);
                      
                      // Add logo and details divs to match structure
                      templateItem.innerHTML = `
                        <div class="template-logo">${template.logo}</div>
                        <div class="template-details">
                          <div class="template-name">${template.name}</div>
                          <div class="template-description">${template.description}</div>
                        </div>
                      `;
                      
                      // Add click handler to select template
                      templateItem.addEventListener('click', () => {
                        // Remove active class from other templates
                        templateGrid.querySelectorAll('.template-item').forEach(item => {
                          item.classList.remove('active');
                        });
                        
                        // Add active class to this template
                        templateItem.classList.add('active');
                        
                        // Update selected template info
                        const templateInfo = projectModal.querySelector('.selected-template');
                        if (templateInfo) {
                          templateInfo.textContent = `${template.name} Embedded Application`;
                        }
                      });
                      
                      templateGrid.appendChild(templateItem);
                    });
                    
                    // Add first template as selected by default
                    templateGrid.querySelector('.template-item').classList.add('active');
                    
                    embeddedContainer.appendChild(templateGrid);
                    templatesContainer.appendChild(embeddedContainer);
                  }
                  
                  // Show embedded templates
                  embeddedContainer.style.display = 'block';
                  
                  // Update selected template info
                  const selectedTemplate = embeddedContainer.querySelector('.template-item.active');
                  const templateInfo = projectModal.querySelector('.selected-template');
                  if (selectedTemplate && templateInfo) {
                    const templateName = selectedTemplate.querySelector('.template-name').textContent;
                    templateInfo.textContent = `${templateName} Embedded Application`;
                  }
                }
              });
              
              // Add to project types list
              projectTypeList.appendChild(embeddedItem);
              console.log("Embedded category added successfully");
            }
          }
        }
      }
    }
  });
  
  // Start observing the document body for changes
  observer.observe(document.body, { 
    childList: true,
    subtree: true,
    attributes