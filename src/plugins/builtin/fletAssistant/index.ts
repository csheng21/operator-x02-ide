// src/plugins/builtin/fletAssistant/index.ts
import { PluginApi } from '../../core/pluginInterface';
import { detectFletErrors } from './src/errorDetector';
import { fixFletColors } from './src/colorFixer';
import { registerSnippets } from './src/snippets';
import { createComponentsPanel } from './src/componentsPanel';

// Plugin activation function
export const activate = async (api: PluginApi): Promise<void> => {
  console.log('Flet Assistant plugin activated');
  
  // Store plugin ID for storage access
  (window as any).__currentPluginId = 'deepseek.flet-assistant';
  
  // Register terminal output handler for error detection
  try {
    api.terminal.onOutput((output, isError) => {
      console.log(`Terminal output received, isError: ${isError}`);
      try {
        const detectedError = detectFletErrors(output);
        if (detectedError) {
          showErrorNotification(api, detectedError);
        }
      } catch (error) {
        console.error('Error in Flet error detection:', error);
      }
    });
    console.log('Terminal output handler registered successfully');
  } catch (error) {
    console.error('Failed to register terminal output handler:', error);
  }
  
  // Register commands
  registerCommands(api);
  
  // Register code snippets
  registerSnippets(api);
  
  // Register components panel
  api.ui.registerView('fletComponentsView', () => createComponentsPanel(api));
  
  // Add toolbar button for Fix Flet Colors
  try {
    // Try multiple possible container elements
    const possibleToolbarContainers = [
      document.querySelector('.toolbar'),
      document.querySelector('.menu-bar'),
      document.querySelector('.ide-controls'),
      document.querySelector('.actions-container'),
      document.querySelector('header'),
      document.querySelector('.top-controls'),
      document.body
    ];

    // Find the first valid container
    const toolbar = possibleToolbarContainers.find(el => el !== null);
    console.log('Found toolbar container:', toolbar);

    if (toolbar) {
      const colorFixButton = document.createElement('button');
      colorFixButton.textContent = 'Fix Flet Colors';
      colorFixButton.className = 'toolbar-button flet-colors-fix-btn';
      colorFixButton.style.padding = '5px 10px';
      colorFixButton.style.backgroundColor = '#2962ff';
      colorFixButton.style.color = 'white';
      colorFixButton.style.border = 'none';
      colorFixButton.style.borderRadius = '4px';
      colorFixButton.style.cursor = 'pointer';
      colorFixButton.style.margin = '0 5px';

      // Add hover effects
      colorFixButton.addEventListener('mouseover', () => {
        colorFixButton.style.backgroundColor = '#1565c0';
      });
      colorFixButton.addEventListener('mouseout', () => {
        colorFixButton.style.backgroundColor = '#2962ff';
      });

      // Connect button to the command
      colorFixButton.addEventListener('click', () => {
        api.ui.executeCommand('fletAssistant.fixColors');
      });

      // Add to toolbar
      toolbar.appendChild(colorFixButton);
      console.log('Fix Flet Colors button added to toolbar');
    } else {
      console.error('Could not find a suitable toolbar container');
    }
  } catch (error) {
    console.error('Error adding toolbar button:', error);
  }
  
  // Show welcome notification
  api.ui.showNotification({
    title: 'Flet Assistant',
    message: 'Flet Assistant plugin is now active. Right-click in the editor for Flet options.',
    type: 'info',
    duration: 5000
  });
};

// Plugin deactivation function
export const deactivate = async (): Promise<void> => {
  console.log('Flet Assistant plugin deactivated');
  
  try {
    // Clean up toolbar button
    const colorFixButton = document.querySelector('.flet-colors-fix-btn');
    if (colorFixButton) {
      colorFixButton.parentNode?.removeChild(colorFixButton);
      console.log('Fix Flet Colors button removed');
    }
  } catch (error) {
    console.error('Error removing toolbar button:', error);
  }
  
  // Clean up resources
  delete (window as any).__currentPluginId;
};

// Register plugin commands
function registerCommands(api: PluginApi): void {
  // Fix Flet colors command
  api.ui.registerCommand('fletAssistant.fixColors', 'Fix Flet Colors', async () => {
    try {
      const editor = api.editor.getActiveEditor();
      if (!editor) {
        api.ui.showNotification({
          message: 'No active editor',
          type: 'error'
        });
        return;
      }
      
      const document = api.editor.getDocument();
      const text = document.getText();
      const fixed = fixFletColors(text);
      
      if (text === fixed) {
        api.ui.showNotification({
          message: 'No Flet color references found to fix',
          type: 'info'
        });
        return;
      }
      
      await document.setText(fixed);
      
      api.ui.showNotification({
        message: 'Flet colors fixed successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error('Error in fixColors command:', error);
      api.ui.showNotification({
        title: 'Error',
        message: 'Failed to fix Flet colors: ' + (error.message || 'Unknown error'),
        type: 'error'
      });
    }
  });
  
  // Insert component command
  api.ui.registerCommand('fletAssistant.insertComponent', 'Insert Flet Component', () => {
    showComponentPicker(api);
  });
  
  // Show components panel command
  api.ui.registerCommand('fletAssistant.showComponentsPanel', 'Show Flet Components Panel', () => {
    api.ui.showView('fletComponentsView');
  });
  
  console.log('Flet Assistant commands registered successfully');
}

// Show error notification
function showErrorNotification(api: PluginApi, error: any): void {
  try {
    api.ui.showNotification({
      title: error.title,
      message: error.message,
      type: 'warning',
      actions: error.actions.map((action: any) => ({
        title: action.title,
        action: () => action.callback(api)
      }))
    });
  } catch (notifyError) {
    console.error('Error showing notification:', notifyError);
  }
}

// Show component picker dialog
function showComponentPicker(api: PluginApi): void {
  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'flet-component-picker';
  dialog.style.position = 'fixed';
  dialog.style.top = '50%';
  dialog.style.left = '50%';
  dialog.style.transform = 'translate(-50%, -50%)';
  dialog.style.backgroundColor = '#252525';
  dialog.style.color = '#e1e1e1';
  dialog.style.padding = '20px';
  dialog.style.borderRadius = '5px';
  dialog.style.zIndex = '9999';
  dialog.style.minWidth = '400px';
  dialog.style.maxHeight = '80vh';
  dialog.style.overflow = 'auto';
  
  // Add header
  const header = document.createElement('div');
  header.innerHTML = `<h2>Flet Components</h2>`;
  dialog.appendChild(header);
  
  // Add component list
  const componentsList = document.createElement('div');
  componentsList.style.display = 'grid';
  componentsList.style.gridTemplateColumns = 'repeat(2, 1fr)';
  componentsList.style.gap = '10px';
  componentsList.style.marginTop = '15px';
  
  // Component data
  const components = [
    { name: 'Text', snippet: 'ft.Text("${1:Text content}", size=${2:16})' },
    { name: 'ElevatedButton', snippet: 'ft.ElevatedButton("${1:Button}", on_click=${2:button_clicked})' },
    { name: 'TextField', snippet: 'ft.TextField(label="${1:Label}", hint_text="${2:Enter text}")' },
    { name: 'Container', snippet: 'ft.Container(\n\tcontent=${1:None},\n\twidth=${2:200},\n\theight=${3:200}\n)' },
    { name: 'Row', snippet: 'ft.Row([\n\t${1:ft.Text("Item 1")},\n\t${2:ft.Text("Item 2")}\n])' },
    { name: 'Column', snippet: 'ft.Column([\n\t${1:ft.Text("Item 1")},\n\t${2:ft.Text("Item 2")}\n])' }
  ];
  
  // Add component items
  components.forEach(component => {
    const componentItem = document.createElement('div');
    componentItem.className = 'component-item';
    componentItem.style.padding = '10px';
    componentItem.style.backgroundColor = '#333';
    componentItem.style.borderRadius = '4px';
    componentItem.style.cursor = 'pointer';
    
    componentItem.innerHTML = `<div>${component.name}</div>`;
    
    componentItem.addEventListener('click', () => {
      try {
        // Insert snippet
        api.editor.insertText(component.snippet);
        // Close dialog
        document.body.removeChild(dialog);
      } catch (error) {
        console.error('Error inserting component:', error);
      }
    });
    
    componentItem.addEventListener('mouseover', () => {
      componentItem.style.backgroundColor = '#444';
    });
    
    componentItem.addEventListener('mouseout', () => {
      componentItem.style.backgroundColor = '#333';
    });
    
    componentsList.appendChild(componentItem);
  });
  
  dialog.appendChild(componentsList);
  
  // Add cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.marginTop = '20px';
  cancelBtn.style.padding = '8px 12px';
  cancelBtn.style.backgroundColor = '#444';
  cancelBtn.style.color = '#e1e1e1';
  cancelBtn.style.border = 'none';
  cancelBtn.style.borderRadius = '4px';
  cancelBtn.style.cursor = 'pointer';
  
  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(dialog);
  });
  
  dialog.appendChild(cancelBtn);
  
  // Add to document
  document.body.appendChild(dialog);
}