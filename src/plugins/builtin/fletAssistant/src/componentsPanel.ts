// src/plugins/builtin/fletAssistant/src/componentsPanel.ts

/**
 * Create and return a components panel element
 */
export function createComponentsPanel(api: any): HTMLElement {
  // Create panel container
  const panel = document.createElement('div');
  panel.className = 'flet-components-panel';
  panel.style.padding = '10px';
  panel.style.height = '100%';
  panel.style.overflow = 'auto';
  
  // Add header
  const header = document.createElement('div');
  header.innerHTML = `
    <h3 style="margin-top: 0;">Flet Components</h3>
    <div style="margin-bottom: 15px;">Click to insert components</div>
  `;
  panel.appendChild(header);
  
  // Add search input
  const searchBox = document.createElement('div');
  searchBox.style.marginBottom = '15px';
  searchBox.innerHTML = `
    <input type="text" id="component-search" placeholder="Search components..." 
           style="width: 100%; padding: 5px; border-radius: 3px; border: 1px solid #444; background: #333; color: #eee;">
  `;
  panel.appendChild(searchBox);
  
  // Create components container
  const componentsContainer = document.createElement('div');
  componentsContainer.style.display = 'flex';
  componentsContainer.style.flexDirection = 'column';
  componentsContainer.style.gap = '10px';
  
  // Component data with more complete list
  const components = [
    { 
      name: 'Text', 
      description: 'Display text with various styles',
      snippet: 'ft.Text("${1:Text content}", size=${2:16})',
      icon: '📝'
    },
    { 
      name: 'ElevatedButton', 
      description: 'A button with elevation effect',
      snippet: 'ft.ElevatedButton("${1:Button}", on_click=${2:button_clicked})',
      icon: '🔘'
    },
    { 
      name: 'TextField', 
      description: 'Input field for text entry',
      snippet: 'ft.TextField(label="${1:Label}", hint_text="${2:Enter text}")',
      icon: '✏️'
    },
    { 
      name: 'Container', 
      description: 'Content container with various styling options',
      snippet: 'ft.Container(\n\tcontent=${1:None},\n\twidth=${2:200},\n\theight=${3:200}\n)',
      icon: '📦'
    },
    { 
      name: 'Row', 
      description: 'Horizontal layout for multiple controls',
      snippet: 'ft.Row([\n\t${1:ft.Text("Item 1")},\n\t${2:ft.Text("Item 2")}\n])',
      icon: '⬅️➡️'
    },
    { 
      name: 'Column', 
      description: 'Vertical layout for multiple controls',
      snippet: 'ft.Column([\n\t${1:ft.Text("Item 1")},\n\t${2:ft.Text("Item 2")}\n])',
      icon: '⬆️⬇️'
    },
    { 
      name: 'AppBar', 
      description: 'Application bar for navigation and actions',
      snippet: 'ft.AppBar(title=ft.Text("${1:App Title}"), bgcolor="${2:#2196F3}")',
      icon: '🔝'
    },
    { 
      name: 'Image', 
      description: 'Display images from various sources',
      snippet: 'ft.Image(\n\tsrc="${1:https://example.com/image.jpg}",\n\twidth=${2:100},\n\theight=${3:100}\n)',
      icon: '🖼️'
    },
    { 
      name: 'Stack', 
      description: 'Stack controls on top of each other',
      snippet: 'ft.Stack([\n\t${1:ft.Container(width=100, height=100, bgcolor="#ff0000")},\n\t${2:ft.Container(width=50, height=50, bgcolor="#00ff00")}\n])',
      icon: '📚'
    }
  ];
  
  // Add search functionality
  const searchInput = searchBox.querySelector('#component-search') as HTMLInputElement;
  searchInput?.addEventListener('input', () => {
    const searchTerm = searchInput.value.toLowerCase();
    
    // Filter components based on search
    Array.from(componentsContainer.children).forEach((componentEl: HTMLElement) => {
      const componentName = componentEl.getAttribute('data-name')?.toLowerCase() || '';
      const componentDesc = componentEl.getAttribute('data-description')?.toLowerCase() || '';
      
      if (componentName.includes(searchTerm) || componentDesc.includes(searchTerm)) {
        componentEl.style.display = 'flex';
      } else {
        componentEl.style.display = 'none';
      }
    });
  });
  
  // Add component items
  components.forEach(component => {
    const componentItem = document.createElement('div');
    componentItem.className = 'component-item';
    componentItem.setAttribute('data-name', component.name);
    componentItem.setAttribute('data-description', component.description);
    componentItem.style.padding = '10px';
    componentItem.style.backgroundColor = '#333';
    componentItem.style.borderRadius = '4px';
    componentItem.style.cursor = 'pointer';
    componentItem.style.display = 'flex';
    componentItem.style.alignItems = 'center';
    
    // Component content
    componentItem.innerHTML = `
      <div style="font-size: 24px; margin-right: 10px;">${component.icon}</div>
      <div>
        <div style="font-weight: bold;">${component.name}</div>
        <div style="font-size: 12px; color: #aaa;">${component.description}</div>
      </div>
    `;
    
    // Add click event to insert component
    componentItem.addEventListener('click', () => {
      insertComponent(api, component.snippet);
    });
    
    // Add hover effect
    componentItem.addEventListener('mouseover', () => {
      componentItem.style.backgroundColor = '#444';
    });
    
    componentItem.addEventListener('mouseout', () => {
      componentItem.style.backgroundColor = '#333';
    });
    
    // Add to container
    componentsContainer.appendChild(componentItem);
  });
  
  panel.appendChild(componentsContainer);
  
  return panel;
}

/**
 * Insert a component snippet into the active editor
 */
function insertComponent(api: any, snippet: string): void {
  if (api.editor.insertSnippet) {
    api.editor.insertSnippet(snippet);
  } else {
    // Fallback for simple text insertion
    api.editor.insertText(snippet.replace(/\$\{\d+:([^}]*)\}/g, '$1'));
  }
}