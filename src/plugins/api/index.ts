// src/plugins/builtin/fletAssistant/index.ts

import { Plugin, PluginApi } from '../../core/pluginInterface';
import { detectFletErrors } from './src/errorDetector';
import { fixFletColors } from './src/colorFixer';
import { registerSnippets } from './src/snippets';
import { createComponentsPanel } from './src/componentsPanel';

// Plugin instance that matches the interface
const fletAssistant: Plugin = {
  id: 'deepseek.flet-assistant',
  name: 'Flet Assistant',
  version: '1.0.0',
  description: 'Enhanced Flet development support for Deepseek IDE',
  author: 'Deepseek IDE',
  
  // Activate function
  async activate(api: PluginApi): Promise<void> {
    console.log('Flet Assistant plugin activated');
    
    // Store plugin ID in window to retrieve it later
    (window as any).__currentPluginId = 'deepseek.flet-assistant';
    
    // Register error detector for terminal output
    api.terminal.on('output', (output, isError) => {
      const detectedError = detectFletErrors(output);
      if (detectedError) {
        showErrorNotification(api, detectedError);
      }
    });
    
    // Register commands
    registerCommands(api);
    
    // Register code snippets
    registerSnippets(api);
    
    // Create components panel
    api.ui.registerView('fletComponentsView', () => createComponentsPanel(api));
  },
  
  // Deactivate function
  async deactivate(): Promise<void> {
    console.log('Flet Assistant plugin deactivated');
    // Clean up resources
    delete (window as any).__currentPluginId;
  }
};

// Register commands
function registerCommands(api: PluginApi) {
  // Fix Flet colors command
  api.ui.registerCommand('fletAssistant.fixColors', 'Fix Flet Colors', async () => {
    const editor = api.editor.getActiveEditor();
    if (!editor) {
      api.ui.showNotification({
        message: 'No active editor',
        type: 'error'
      });
      return;
    }
    
    const document = editor.getDocument();
    const text = document.getText();
    const fixed = fixFletColors(text);
    
    await document.setText(fixed);
    
    api.ui.showNotification({
      message: 'Flet colors fixed successfully!',
      type: 'success'
    });
  });
  
  // Insert component command
  api.ui.registerCommand('fletAssistant.insertComponent', 'Insert Flet Component', () => {
    showComponentPicker(api);
  });
  
  // Show components panel command
  api.ui.registerCommand('fletAssistant.showComponentsPanel', 'Show Flet Components Panel', () => {
    api.ui.showView('fletComponentsView');
  });
}

// Show error notification
function showErrorNotification(api: PluginApi, error: any) {
  api.ui.showNotification({
    title: error.title,
    message: error.message,
    type: 'warning',
    actions: error.actions.map((action: any) => ({
      title: action.title,
      action: () => action.callback(api)
    }))
  });
}

// Show component picker dialog
function showComponentPicker(api: PluginApi) {
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
      // Insert snippet
      api.editor.insertSnippet(component.snippet);
      // Close dialog
      document.body.removeChild(dialog);
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
  cancelBtn.style.width = '100%';
  
  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(dialog);
  });
  
  cancelBtn.addEventListener('mouseover', () => {
    cancelBtn.style.backgroundColor = '#555';
  });
  
  cancelBtn.addEventListener('mouseout', () => {
    cancelBtn.style.backgroundColor = '#444';
  });
  
  dialog.appendChild(cancelBtn);
  
  // Add to document
  document.body.appendChild(dialog);
  
  // Close on Escape key
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      document.body.removeChild(dialog);
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

// Export the plugin
export default fletAssistant;
