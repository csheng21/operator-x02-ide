// plugins/core/externalPluginManager.ts
// ENHANCED VERSION - Proper UI cleanup on deactivation

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
}

export interface PluginContext {
  subscriptions: any[];
  globalState?: Map<string, any>;
  workspaceState?: Map<string, any>;
  createdElements?: HTMLElement[];  // Track created UI elements
}

export interface ExternalPlugin {
  manifest: PluginManifest;
  activate: (context: PluginContext) => void;
  deactivate?: () => void;
}

export class ExternalPluginManager {
  private loadedPlugins = new Map<string, ExternalPlugin>();
  private activePlugins = new Map<string, ExternalPlugin>();
  public pluginContexts = new Map<string, PluginContext>();

  /**
   * Load plugin from JavaScript code
   */
  async loadFromCode(code: string): Promise<string> {
    try {
      console.log('📄 Loading plugin...');
      
      // Create a safe way to execute plugin code
      const exports: any = {};
      const pluginFunction = new Function('exports', code + '\nreturn exports;');
      const pluginModule = pluginFunction(exports);

      // Check if plugin is valid
      if (!pluginModule.manifest || !pluginModule.activate) {
        throw new Error('Invalid plugin: must have manifest and activate');
      }

      const pluginId = pluginModule.manifest.id;
      
      // Store the plugin
      this.loadedPlugins.set(pluginId, {
        manifest: pluginModule.manifest,
        activate: pluginModule.activate,
        deactivate: pluginModule.deactivate
      });

      console.log(`✅ Plugin loaded: ${pluginModule.manifest.name}`);
      return pluginId;
      
    } catch (error) {
      console.error('❌ Failed to load plugin:', error);
      throw error;
    }
  }

  /**
   * Load plugin from file
   */
  async loadFromFile(file: File): Promise<string> {
    const code = await this.readFile(file);
    return this.loadFromCode(code);
  }

  /**
   * Activate a plugin
   */
  async activatePlugin(pluginId: string): Promise<void> {
    const plugin = this.loadedPlugins.get(pluginId);
    
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (this.activePlugins.has(pluginId)) {
      console.log('Plugin already active');
      return;
    }

    // Create context for the plugin
    const context: PluginContext = {
      subscriptions: [],
      globalState: new Map(),
      workspaceState: new Map(),
      createdElements: []  // Initialize element tracking
    };

    // Store context BEFORE activating
    this.pluginContexts.set(pluginId, context);

    // Activate the plugin
    await plugin.activate(context);
    this.activePlugins.set(pluginId, plugin);
    
    console.log(`✅ Plugin activated: ${plugin.manifest.name}`);
  }

  /**
   * Deactivate a plugin with proper cleanup
   */
  async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.activePlugins.get(pluginId);
    const context = this.pluginContexts.get(pluginId);
    
    if (!plugin) {
      return;
    }

    console.log(`🔄 Deactivating plugin: ${plugin.manifest.name}`);

    // Call plugin's deactivate function
    if (plugin.deactivate) {
      try {
        await plugin.deactivate();
      } catch (error) {
        console.error('Error in plugin deactivate:', error);
      }
    }

    // Cleanup subscriptions
    if (context && context.subscriptions) {
      context.subscriptions.forEach(sub => {
        if (sub && typeof sub.dispose === 'function') {
          try {
            sub.dispose();
          } catch (error) {
            console.error('Error disposing subscription:', error);
          }
        }
      });
    }

    // Cleanup created UI elements
    if (context && context.createdElements) {
      console.log(`🧹 Cleaning up ${context.createdElements.length} UI elements`);
      context.createdElements.forEach(element => {
        try {
          if (element && element.parentElement) {
            element.remove();
          }
        } catch (error) {
          console.error('Error removing element:', error);
        }
      });
    }

    // Additional cleanup: remove elements by plugin ID
    this.forceCleanupPluginUI(pluginId);

    this.activePlugins.delete(pluginId);
    this.pluginContexts.delete(pluginId);
    
    console.log(`✅ Plugin deactivated: ${plugin.manifest.name}`);
  }

  /**
   * Force cleanup of plugin UI elements by ID
   */
  private forceCleanupPluginUI(pluginId: string): void {
    // Remove elements with data-plugin attribute
    document.querySelectorAll(`[data-plugin="${pluginId}"]`).forEach(el => {
      console.log('Removing plugin element:', el);
      el.remove();
    });

    // Remove tabs with data-plugin-id attribute
    document.querySelectorAll(`.tab-item[data-plugin-id="${pluginId}"]`).forEach(el => {
      console.log('Removing plugin tab:', el);
      el.remove();
    });

    // Remove menu items with data-plugin-id attribute
    document.querySelectorAll(`.menu-item[data-plugin-id="${pluginId}"]`).forEach(el => {
      console.log('Removing plugin menu item:', el);
      el.remove();
    });

    // Additional cleanup for common patterns
    document.querySelectorAll(`[id*="${pluginId}"]`).forEach(el => {
      // Only remove if it looks like a plugin-created element
      if (el.hasAttribute('data-plugin-created')) {
        console.log('Removing plugin-created element:', el);
        el.remove();
      }
    });
  }

  /**
   * Get all loaded plugins
   */
  getLoadedPlugins(): Array<PluginManifest & { active: boolean }> {
    return Array.from(this.loadedPlugins.entries()).map(([id, plugin]) => ({
      ...plugin.manifest,
      active: this.activePlugins.has(id)
    }));
  }

  /**
   * Read file content
   */
  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}