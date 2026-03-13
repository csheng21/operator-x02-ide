// src/plugins/core/pluginDevelopment.ts

import { PluginManager } from './pluginManager';

// Show plugin development tools
export function showPluginDevelopmentTools() {
  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'plugin-dev-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '9999';
  
  // Create modal content
  const content = document.createElement('div');
  content.style.backgroundColor = '#252525';
  content.style.borderRadius = '5px';
  content.style.padding = '20px';
  content.style.width = '700px';
  content.style.maxWidth = '90%';
  content.style.maxHeight = '80%';
  content.style.overflow = 'auto';
  content.style.color = '#e1e1e1';
  
  // Create header
  const header = document.createElement('div');
  header.innerHTML = `
    <h2 style="margin-top:0;color:#75beff;border-bottom:1px solid #444;padding-bottom:8px;">
      Create New Plugin
    </h2>
  `;
  
  // Create form
  const form = document.createElement('div');
  form.innerHTML = `
    <div style="margin:15px 0;">
      <label style="display:block;margin-bottom:5px;font-weight:bold;">Plugin Name:</label>
      <input id="plugin-name" type="text" placeholder="My Awesome Plugin" style="width:100%;padding:8px;background:#333;color:#eee;border:1px solid #555;border-radius:3px;">
    </div>
    
    <div style="margin:15px 0;">
      <label style="display:block;margin-bottom:5px;font-weight:bold;">Plugin ID:</label>
      <input id="plugin-id" type="text" placeholder="com.yourusername.awesome-plugin" style="width:100%;padding:8px;background:#333;color:#eee;border:1px solid #555;border-radius:3px;">
      <div style="color:#999;font-size:12px;margin-top:4px;">Use reverse domain notation (e.g., com.example.plugin-name)</div>
    </div>
    
    <div style="margin:15px 0;">
      <label style="display:block;margin-bottom:5px;font-weight:bold;">Description:</label>
      <textarea id="plugin-description" placeholder="What does your plugin do?" style="width:100%;padding:8px;background:#333;color:#eee;border:1px solid #555;border-radius:3px;height:60px;"></textarea>
    </div>
    
    <div style="margin:15px 0;">
      <label style="display:block;margin-bottom:5px;font-weight:bold;">Author:</label>
      <input id="plugin-author" type="text" placeholder="Your Name" style="width:100%;padding:8px;background:#333;color:#eee;border:1px solid #555;border-radius:3px;">
    </div>
    
    <div style="margin:15px 0;">
      <label style="display:block;margin-bottom:5px;font-weight:bold;">Plugin Template:</label>
      <select id="plugin-template" style="width:100%;padding:8px;background:#333;color:#eee;border:1px solid #555;border-radius:3px;">
        <option value="basic">Basic Plugin</option>
        <option value="editor">Editor Extension</option>
        <option value="ui">UI Components</option>
        <option value="language">Language Support</option>
      </select>
    </div>
    
    <div style="margin:15px 0;">
      <label style="display:block;margin-bottom:5px;font-weight:bold;">Output Directory:</label>
      <div style="display:flex;gap:10px;">
        <input id="plugin-output" type="text" readonly placeholder="/path/to/plugins" style="flex:1;padding:8px;background:#333;color:#eee;border:1px solid #555;border-radius:3px;">
        <button id="browse-output" style="padding:8px 12px;background:#2962ff;color:white;border:none;border-radius:4px;cursor:pointer;">Browse</button>
      </div>
    </div>
  `;
  
  // Create buttons
  const buttons = document.createElement('div');
  buttons.style.display = 'flex';
  buttons.style.justifyContent = 'flex-end';
  buttons.style.marginTop = '20px';
  buttons.style.gap = '10px';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.padding = '8px 15px';
  cancelBtn.style.backgroundColor = '#444';
  cancelBtn.style.color = 'white';
  cancelBtn.style.border = 'none';
  cancelBtn.style.borderRadius = '4px';
  cancelBtn.style.cursor = 'pointer';
  
  const createBtn = document.createElement('button');
  createBtn.textContent = 'Create Plugin';
  createBtn.style.padding = '8px 15px';
  createBtn.style.backgroundColor = '#2962ff';
  createBtn.style.color = 'white';
  createBtn.style.border = 'none';
  createBtn.style.borderRadius = '4px';
  createBtn.style.cursor = 'pointer';
  
  buttons.appendChild(cancelBtn);
  buttons.appendChild(createBtn);
  
  // Assemble modal
  content.appendChild(header);
  content.appendChild(form);
  content.appendChild(buttons);
  modal.appendChild(content);
  
  // Add to document
  document.body.appendChild(modal);
  
  // Add event listeners
  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  createBtn.addEventListener('click', () => {
    createPluginTemplate();
  });
  
  const browseBtn = document.getElementById('browse-output');
  if (browseBtn) {
    browseBtn.addEventListener('click', async () => {
      await browseForOutputDir();
    });
  }
  
  // Automatically generate plugin ID from name
  const nameInput = document.getElementById('plugin-name') as HTMLInputElement;
  const idInput = document.getElementById('plugin-id') as HTMLInputElement;
  
  if (nameInput && idInput) {
    nameInput.addEventListener('input', () => {
      const name = nameInput.value.trim();
      if (name) {
        // Convert to kebab-case and add prefix
        const id = 'com.yourusername.' + name.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        idInput.value = id;
      }
    });
  }
}

// Browse for output directory
async function browseForOutputDir() {
  if (!window.dialog?.open) {
    alert('File dialog is not available. Please enter the path manually.');
    return;
  }
  
  try {
    const path = await window.dialog.open({
      directory: true,
      title: 'Select Output Directory for Plugin'
    });
    
    if (path) {
      const outputInput = document.getElementById('plugin-output') as HTMLInputElement;
      if (outputInput) {
        outputInput.value = Array.isArray(path) ? path[0] : path;
      }
    }
  } catch (error) {
    console.error('Error selecting output directory:', error);
    alert('Failed to select output directory: ' + error.message);
  }
}

// Create the plugin template
async function createPluginTemplate() {
  // Get form values
  const nameInput = document.getElementById('plugin-name') as HTMLInputElement;
  const idInput = document.getElementById('plugin-id') as HTMLInputElement;
  const descInput = document.getElementById('plugin-description') as HTMLTextAreaElement;
  const authorInput = document.getElementById('plugin-author') as HTMLInputElement;
  const templateSelect = document.getElementById('plugin-template') as HTMLSelectElement;
  const outputInput = document.getElementById('plugin-output') as HTMLInputElement;
  
  const name = nameInput?.value?.trim();
  const id = idInput?.value?.trim();
  const description = descInput?.value?.trim();
  const author = authorInput?.value?.trim();
  const template = templateSelect?.value;
  const outputDir = outputInput?.value?.trim();
  
  // Validate inputs
  if (!name || !id || !description || !template) {
    alert('Please fill out all required fields');
    return;
  }
  
  if (!outputDir) {
    alert('Please select an output directory');
    return;
  }
  
  try {
    // Create plugin directory structure
    await createPluginDirectory(outputDir, id, name, description, author, template);
    
    // Show success message
    alert(`Plugin "${name}" created successfully at ${outputDir}/${id}!`);
    
    // Close the modal
    const modal = document.querySelector('.plugin-dev-modal');
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  } catch (error) {
    console.error('Error creating plugin:', error);
    alert('Failed to create plugin: ' + error.message);
  }
}

// Create plugin directory structure
async function createPluginDirectory(
  outputDir: string, 
  id: string, 
  name: string, 
  description: string, 
  author: string, 
  template: string
) {
  if (!window.fs?.writeFile) {
    throw new Error('File system API is not available');
  }
  
  // Create plugin directory
  const pluginDir = `${outputDir}/${id}`;
  
  // Create manifest.json
  const manifest = {
    id,
    name,
    version: '1.0.0',
    description,
    author: author || 'Unknown',
    main: 'index.ts',
    dependencies: [],
    contributes: {
      commands: []
    }
  };
  
  const manifestJson = JSON.stringify(manifest, null, 2);
  
  await window.fs.writeFile(`${pluginDir}/manifest.json`, manifestJson);
  
  // Create src directory
  await window.fs.createDir(`${pluginDir}/src`);
  
  // Create template-specific files
  let indexContent = '';
  
  switch (template) {
    case 'basic':
      indexContent = getBasicTemplateContent(name);
      break;
    case 'editor':
      indexContent = getEditorTemplateContent(name);
      break;
    case 'ui':
      indexContent = getUiTemplateContent(name);
      break;
    case 'language':
      indexContent = getLanguageTemplateContent(name);
      break;
    default:
      indexContent = getBasicTemplateContent(name);
  }
  
  await window.fs.writeFile(`${pluginDir}/index.ts`, indexContent);
  
  // Create README.md
  const readme = `# ${name}\n\n${description}\n\n## Installation\n\nAdd installation instructions here.\n\n## Features\n\n- Feature 1\n- Feature 2\n\n## Usage\n\nAdd usage instructions here.\n`;
  
  await window.fs.writeFile(`${pluginDir}/README.md`, readme);
}

// Template content generators
function getBasicTemplateContent(pluginName: string): string {
  return `import { Plugin, PluginApi } from '../../core/pluginInterface';

export const activate = async (api: PluginApi): Promise<void> => {
  console.log('${pluginName} plugin activated');
  
  // Register a simple command
  api.ui.registerCommand('${pluginName.toLowerCase()}.hello', 'Hello from ${pluginName}', () => {
    api.ui.showNotification({
      title: '${pluginName}',
      message: 'Hello from ${pluginName} plugin!',
      type: 'info'
    });
  });
};

export const deactivate = async (): Promise<void> => {
  console.log('${pluginName} plugin deactivated');
};
`;
}

// Add template content generators for other types
function getEditorTemplateContent(pluginName: string): string {
  return `import { Plugin, PluginApi } from '../../core/pluginInterface';

export const activate = async (api: PluginApi): Promise<void> => {
  console.log('${pluginName} plugin activated');
  
  // Register a command to insert a code snippet
  api.ui.registerCommand('${pluginName.toLowerCase()}.insertSnippet', 'Insert Code Snippet', () => {
    const editor = api.editor.getActiveEditor();
    if (!editor) {
      api.ui.showNotification({
        message: 'No active editor',
        type: 'error'
      });
      return;
    }
    
    // Insert a code snippet
    api.editor.insertSnippet('console.log("Hello from ${pluginName}");');
    
    api.ui.showNotification({
      message: 'Snippet inserted',
      type: 'success'
    });
  });
  
  // Listen for document changes
  api.editor.onDocumentChanged((document) => {
    console.log('Document changed:', document.getFileName());
  });
};

export const deactivate = async (): Promise<void> => {
  console.log('${pluginName} plugin deactivated');
};
`;
}

function getUiTemplateContent(pluginName: string): string {
  return `import { Plugin, PluginApi } from '../../core/pluginInterface';

export const activate = async (api: PluginApi): Promise<void> => {
  console.log('${pluginName} plugin activated');
  
  // Register a custom view
  api.ui.registerView('${pluginName.toLowerCase()}.mainView', createMainView);
  
  // Register a command to show the view
  api.ui.registerCommand('${pluginName.toLowerCase()}.showView', 'Show ${pluginName} View', () => {
    api.ui.showView('${pluginName.toLowerCase()}.mainView');
  });
};

export const deactivate = async (): Promise<void> => {
  console.log('${pluginName} plugin deactivated');
};

// Create a custom view
function createMainView(): HTMLElement {
  const container = document.createElement('div');
  container.style.padding = '20px';
  
  const title = document.createElement('h2');
  title.textContent = '${pluginName}';
  title.style.color = '#75beff';
  title.style.marginTop = '0';
  
  const content = document.createElement('div');
  content.innerHTML = '<p>This is a custom view from ${pluginName} plugin.</p>';
  
  const button = document.createElement('button');
  button.textContent = 'Click Me';
  button.style.padding = '8px 15px';
  button.style.backgroundColor = '#2962ff';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.marginTop = '20px';
  button.style.cursor = 'pointer';
  
  button.addEventListener('click', () => {
    content.innerHTML += '<p>Button clicked!</p>';
  });
  
  container.appendChild(title);
  container.appendChild(content);
  container.appendChild(button);
  
  return container;
}
`;
}

function getLanguageTemplateContent(pluginName: string): string {
  return `import { Plugin, PluginApi } from '../../core/pluginInterface';

export const activate = async (api: PluginApi): Promise<void> => {
  console.log('${pluginName} plugin activated');
  
  // Register syntax highlighting
  registerSyntaxHighlighting(api);
  
  // Register code completion
  registerCodeCompletion(api);
  
  // Register commands
  api.ui.registerCommand('${pluginName.toLowerCase()}.runFile', 'Run Current File', () => {
    runCurrentFile(api);
  });
};

export const deactivate = async (): Promise<void> => {
  console.log('${pluginName} plugin deactivated');
};

// Register syntax highlighting
function registerSyntaxHighlighting(api: PluginApi): void {
  // Example implementation - would need to be customized for your language
  console.log('Registered syntax highlighting');
}

// Register code completion
function registerCodeCompletion(api: PluginApi): void {
  // Example implementation - would need to be customized for your language
  console.log('Registered code completion');
}

// Run current file
async function runCurrentFile(api: PluginApi): Promise<void> {
  const editor = api.editor.getActiveEditor();
  if (!editor) {
    api.ui.showNotification({
      message: 'No active editor',
      type: 'error'
    });
    return;
  }
  
  const document = editor.getDocument();
  const fileName = document.getFileName();
  
  try {
    // Example: Run the file using the terminal
    const output = await api.terminal.execute(\`node \${fileName}\`);
    
    api.ui.showNotification({
      title: 'File Output',
      message: 'File executed successfully',
      type: 'success'
    });
  } catch (error) {
    api.ui.showNotification({
      title: 'Error',
      message: \`Failed to run file: \${error.message}\`,
      type: 'error'
    });
  }
}
`;
}