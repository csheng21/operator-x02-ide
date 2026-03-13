// src/plugins/ui/pluginManagerUI.ts

import { PluginManager } from '../core/pluginManager';

export function createPluginManagerUI(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'plugin-manager-ui';
  
  // Header
  const header = document.createElement('div');
  header.className = 'plugin-manager-header';
  header.innerHTML = `
    <h2>Plugin Manager</h2>
    <div class="plugin-manager-actions">
      <button id="install-plugin-btn">Install Plugin</button>
      <button id="refresh-plugins-btn">Refresh</button>
    </div>
  `;
  container.appendChild(header);
  
  // Plugin list
  const pluginList = document.createElement('div');
  pluginList.className = 'plugin-list';
  container.appendChild(pluginList);
  
  // Populate plugin list
  populatePluginList(pluginList);
  
  // Add event listeners
  const installBtn = container.querySelector('#install-plugin-btn');
  installBtn?.addEventListener('click', () => showInstallPluginDialog());
  
  const refreshBtn = container.querySelector('#refresh-plugins-btn');
  refreshBtn?.addEventListener('click', () => populatePluginList(pluginList));
  
  return container;
}

function populatePluginList(container: HTMLElement): void {
  // Clear container
  container.innerHTML = '';
  
  // Get plugins
  const pluginManager = PluginManager.getInstance();
  const plugins = pluginManager.getPlugins();
  
  if (plugins.length === 0) {
    container.innerHTML = '<div class="no-plugins">No plugins installed</div>';
    return;
  }
  
  // Create plugin items
  for (const plugin of plugins) {
    const pluginElement = document.createElement('div');
    pluginElement.className = `plugin-item ${plugin.enabled ? 'enabled' : 'disabled'}`;
    
    const pluginInfo = pluginManager.getPlugin(plugin.id);
    
    pluginElement.innerHTML = `
      <div class="plugin-info">
        <div class="plugin-name">${plugin.name}</div>
        <div class="plugin-id">${plugin.id}</div>
        <div class="plugin-version">${pluginInfo?.version || 'Unknown'}</div>
        <div class="plugin-description">${pluginInfo?.description || 'No description'}</div>
      </div>
      <div class="plugin-actions">
        <button class="toggle-plugin-btn">${plugin.enabled ? 'Disable' : 'Enable'}</button>
        <button class="uninstall-plugin-btn">Uninstall</button>
      </div>
    `;
    
    // Add event listeners
    const toggleBtn = pluginElement.querySelector('.toggle-plugin-btn');
    toggleBtn?.addEventListener('click', async () => {
      try {
        if (plugin.enabled) {
          await pluginManager.disablePlugin(plugin.id);
        } else {
          await pluginManager.enablePlugin(plugin.id);
        }
        // Update UI
        populatePluginList(container);
      } catch (error) {
        console.error(`Failed to toggle plugin ${plugin.id}:`, error);
        showNotification(`Failed to ${plugin.enabled ? 'disable' : 'enable'} plugin: ${error.message}`, 'error');
      }
    });
    
    const uninstallBtn = pluginElement.querySelector('.uninstall-plugin-btn');
    uninstallBtn?.addEventListener('click', () => {
      // Show confirmation dialog
      if (confirm(`Are you sure you want to uninstall plugin ${plugin.name}?`)) {
        // Uninstall plugin logic here
        // ...
        populatePluginList(container);
      }
    });
    
    container.appendChild(pluginElement);
  }
}

function showInstallPluginDialog(): void {
  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'plugin-install-dialog';
  dialog.innerHTML = `
    <h3>Install Plugin</h3>
    <div class="install-options">
      <div class="install-option">
        <h4>Install from URL</h4>
        <input type="text" id="plugin-url" placeholder="https://example.com/myplugin">
        <button id="install-url-btn">Install</button>
      </div>
      <div class="install-option">
        <h4>Upload Plugin</h4>
        <input type="file" id="plugin-file" accept=".zip">
        <button id="install-file-btn">Install</button>
      </div>
    </div>
    <button id="close-dialog-btn">Cancel</button>
  `;
  
  // Add to document
  document.body.appendChild(dialog);
  
  // Add event listeners
  const closeBtn = dialog.querySelector('#close-dialog-btn');
  closeBtn?.addEventListener('click', () => {
    document.body.removeChild(dialog);
  });
  
  const installUrlBtn = dialog.querySelector('#install-url-btn');
  installUrlBtn?.addEventListener('click', async () => {
    const urlInput = dialog.querySelector('#plugin-url') as HTMLInputElement;
    const url = urlInput?.value;
    
    if (!url) {
      showNotification('Please enter a plugin URL', 'error');
      return;
    }
    
    try {
      const pluginManager = PluginManager.getInstance();
      await pluginManager.loadPlugin(url);
      showNotification('Plugin installed successfully', 'success');
      document.body.removeChild(dialog);
      
      // Update plugin list
      const pluginList = document.querySelector('.plugin-list');
      if (pluginList) {
        populatePluginList(pluginList as HTMLElement);
      }
    } catch (error) {
      console.error('Failed to install plugin:', error);
      showNotification(`Failed to install plugin: ${error.message}`, 'error');
    }
  });
  
  // Handle file upload
  const installFileBtn = dialog.querySelector('#install-file-btn');
  installFileBtn?.addEventListener('click', () => {
    const fileInput = dialog.querySelector('#plugin-file') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    
    if (!file) {
      showNotification('Please select a plugin file', 'error');
      return;
    }
    
    // Process plugin file (unzip, install)
    // This would need to be implemented with a file system API
    // ...
    
    showNotification('Plugin file upload not implemented yet', 'error');
  });
}

function showNotification(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Add to document
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 3000);
}