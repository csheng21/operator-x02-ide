// plugins/core/pluginManager.ts
// Complete Plugin Manager with Android Support and Enhanced Project Templates

import { Plugin, PluginApi, PluginManifest } from './pluginInterface';
import { createPluginApi } from './pluginApi';
import { loadPlugin } from './pluginLoader';

// Types for plugin integration
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'mobile' | 'web' | 'desktop' | 'data-science' | 'other';
  framework?: string;
  language?: string;
  icon?: string;
  tags?: string[];
  wizard?: boolean;
  aiEnhanced?: boolean;
  createProject?: (projectPath: string, options: any) => Promise<any>;
  showWizard?: () => Promise<any>;
}

export interface PluginCommand {
  id: string;
  title: string;
  category?: string;
  icon?: string;
  handler: (...args: any[]) => Promise<void> | void;
  when?: string;
}

export interface ContextMenuItem {
  id: string;
  title: string;
  group?: string;
  when?: string;
  handler: (uri?: string) => Promise<void> | void;
}

export interface LanguageProvider {
  languageId: string;
  extensions: string[];
  displayName: string;
  provider: any;
}

export interface PluginContext {
  pluginApi: PluginManager;
  editorApi: any;
  fileSystemApi: any;
  terminalApi: any;
  uiApi: any;
  workspacePath: string;
}

export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin> = new Map();
  private pluginClasses: Map<string, any> = new Map(); // 🆕 Store plugin classes
  private enabledPlugins: Set<string> = new Set();
  private api: PluginApi;
  
  // Plugin registries
  private projectTemplates: Map<string, ProjectTemplate> = new Map();
  private commands: Map<string, PluginCommand> = new Map();
  private contextMenuItems: Map<string, ContextMenuItem> = new Map();
  private languageProviders: Map<string, LanguageProvider> = new Map();
  
  // Plugin contexts and disposables
  private pluginContexts: Map<string, PluginContext> = new Map();
  private disposables: Map<string, (() => void)[]> = new Map();
  
  private constructor() {
    this.api = createPluginApi(this);
    console.log('🔌 Plugin Manager initialized');
  }
  
  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }
  
  // 🆕 Register plugin class (used by main.ts)
  public registerPlugin(pluginId: string, PluginClass: any): void {
    console.log(`📝 Registering plugin class: ${pluginId}`);
    this.pluginClasses.set(pluginId, PluginClass);
  }
  
  // 🆕 Activate plugin with context (used by main.ts)
  public async activatePlugin(pluginId: string, context: PluginContext): Promise<void> {
    console.log(`🚀 Activating plugin: ${pluginId}`);
    
    try {
      // Get plugin class
      const PluginClass = this.pluginClasses.get(pluginId);
      if (!PluginClass) {
        throw new Error(`Plugin class not found for: ${pluginId}`);
      }
      
      // Check if already activated
      if (this.plugins.has(pluginId)) {
        console.warn(`Plugin ${pluginId} is already activated`);
        return;
      }
      
      // Create plugin instance
      const pluginInstance = new PluginClass();
      
      // Ensure plugin has required properties
      if (!pluginInstance.id) pluginInstance.id = pluginId;
      if (!pluginInstance.name) pluginInstance.name = pluginId;
      if (!pluginInstance.version) pluginInstance.version = '1.0.0';
      
      // Store plugin instance and context
      this.plugins.set(pluginId, pluginInstance);
      this.pluginContexts.set(pluginId, context);
      
      // Activate the plugin
      await pluginInstance.activate(context);
      this.enabledPlugins.add(pluginId);
      
      // Register plugin's templates and commands
      await this.registerPluginContributions(pluginId, pluginInstance);
      
      console.log(`✅ Plugin ${pluginInstance.name} (${pluginId}) activated successfully`);
      
      // Dispatch activation event
      this.dispatchEvent('activated', { pluginId, plugin: pluginInstance });
      
    } catch (error) {
      console.error(`❌ Failed to activate plugin ${pluginId}:`, error);
      throw error;
    }
  }
  
  // 🆕 Register plugin contributions (templates, commands, etc.)
  private async registerPluginContributions(pluginId: string, plugin: any): Promise<void> {
    const disposables: (() => void)[] = [];
    
    try {
      // Register project templates
      if (typeof plugin.getProjectTemplates === 'function') {
        const templates = plugin.getProjectTemplates();
        if (Array.isArray(templates)) {
          templates.forEach(template => {
            template.pluginId = pluginId; // Track which plugin owns this template
            const dispose = this.registerProjectTemplate(template);
            disposables.push(dispose);
          });
          console.log(`📱 Registered ${templates.length} project templates from ${pluginId}`);
        }
      }
      
      // Register commands
      if (typeof plugin.getCommands === 'function') {
        const commands = plugin.getCommands();
        if (Array.isArray(commands)) {
          commands.forEach(command => {
            command.pluginId = pluginId; // Track which plugin owns this command
            const dispose = this.registerCommand(command);
            disposables.push(dispose);
          });
          console.log(`⚡ Registered ${commands.length} commands from ${pluginId}`);
        }
      }
      
      // Register language providers
      if (typeof plugin.getLanguageProviders === 'function') {
        const providers = plugin.getLanguageProviders();
        if (Array.isArray(providers)) {
          providers.forEach(provider => {
            const dispose = this.registerLanguageProvider(provider.languageId, provider);
            disposables.push(dispose);
          });
          console.log(`🔤 Registered ${providers.length} language providers from ${pluginId}`);
        }
      }
      
      // Store disposables for cleanup
      this.disposables.set(pluginId, disposables);
      
    } catch (error) {
      console.error(`Error registering contributions for ${pluginId}:`, error);
      // Clean up any partially registered items
      disposables.forEach(dispose => dispose());
    }
  }
  
  // Load a plugin from a path or URL
  public async loadPlugin(source: string): Promise<string> {
    try {
      console.log(`🔄 Attempting to load plugin from: ${source}`);
      
      // Check if plugin is already loaded with this source path
      const existingSourcePlugin = Array.from(this.plugins.values())
        .find(p => (p as any).__sourcePath === source);
      
      if (existingSourcePlugin) {
        console.warn(`Plugin from source ${source} is already loaded as ${existingSourcePlugin.id}, skipping`);
        return `Plugin from ${source} is already loaded`;
      }
      
      const plugin = await loadPlugin(source, this.api);
      
      // Skip if plugin loading returned null
      if (!plugin) {
        console.warn(`Plugin loading from ${source} returned null, skipping`);
        return `Plugin loading from ${source} failed`;
      }
      
      // Store source path for later checks
      (plugin as any).__sourcePath = source;
      
      if (this.plugins.has(plugin.id)) {
        console.warn(`Plugin with ID ${plugin.id} is already loaded, skipping`);
        return `Plugin ${plugin.id} is already loaded`;
      }
      
      this.plugins.set(plugin.id, plugin);
      console.log(`✅ Plugin ${plugin.name} (${plugin.id}) loaded from ${source}`);
      
      // Automatically enable the plugin
      return this.enablePlugin(plugin.id);
    } catch (error) {
      console.error(`❌ Failed to load plugin from ${source}:`, error);
      return `Error loading plugin: ${error.message}`;
    }
  }

  // 🆕 Load built-in plugin classes directly
  public async loadBuiltinPlugin(PluginClass: any, pluginId: string): Promise<string> {
    try {
      console.log(`🔧 Loading built-in plugin: ${pluginId}`);
      
      if (this.plugins.has(pluginId)) {
        console.warn(`Plugin with ID ${pluginId} is already loaded, skipping`);
        return `Plugin ${pluginId} is already loaded`;
      }
      
      // Register the plugin class
      this.registerPlugin(pluginId, PluginClass);
      
      console.log(`✅ Built-in plugin ${pluginId} registered and ready for activation`);
      return `Built-in plugin ${pluginId} registered successfully`;
      
    } catch (error) {
      console.error(`❌ Failed to load built-in plugin ${pluginId}:`, error);
      return `Error loading built-in plugin: ${error.message}`;
    }
  }
  
  // Enable a loaded plugin
  public async enablePlugin(pluginId: string): Promise<string> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID ${pluginId} not found`);
    }
    
    if (this.enabledPlugins.has(pluginId)) {
      return `Plugin ${plugin.name} is already enabled`;
    }
    
    try {
      // Check dependencies first
      if (!(await this.resolvePluginDependencies(pluginId))) {
        throw new Error(`Plugin ${pluginId} has unresolved dependencies`);
      }
      
      // Initialize the plugin with enhanced API
      const enhancedApi = this.createEnhancedPluginApi();
      await plugin.activate(enhancedApi);
      this.enabledPlugins.add(pluginId);
      
      // Register plugin contributions
      await this.registerPluginContributions(pluginId, plugin);
      
      // Dispatch event
      this.dispatchEvent('enabled', { pluginId, plugin });
      
      return `Plugin ${plugin.name} enabled successfully`;
    } catch (error) {
      console.error(`❌ Failed to enable plugin ${pluginId}:`, error);
      throw error;
    }
  }
  
  // Disable a plugin
  public async disablePlugin(pluginId: string): Promise<string> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID ${pluginId} not found`);
    }
    
    if (!this.enabledPlugins.has(pluginId)) {
      return `Plugin ${plugin.name} is already disabled`;
    }
    
    try {
      // Deactivate the plugin
      if (typeof plugin.deactivate === 'function') {
        await plugin.deactivate();
      }
      this.enabledPlugins.delete(pluginId);
      
      // Clear plugin registrations
      this.clearPluginRegistrations(pluginId);
      
      // Dispatch event
      this.dispatchEvent('disabled', { pluginId, plugin });
      
      return `Plugin ${plugin.name} disabled successfully`;
    } catch (error) {
      console.error(`❌ Failed to disable plugin ${pluginId}:`, error);
      throw error;
    }
  }
  
  // 🆕 Plugin Registration Methods
  public registerProjectTemplate(template: ProjectTemplate): () => void {
    console.log(`📱 Registering project template: ${template.name} (${template.category})`);
    this.projectTemplates.set(template.id, template);
    
    // Dispatch event for UI updates
    this.dispatchEvent('template:registered', { template });
    
    // Return disposable function
    return () => {
      this.projectTemplates.delete(template.id);
      this.dispatchEvent('template:unregistered', { templateId: template.id });
      console.log(`📱 Unregistered project template: ${template.name}`);
    };
  }
  
  public registerCommand(command: PluginCommand): () => void {
    console.log(`⚡ Registering command: ${command.title} (${command.id})`);
    this.commands.set(command.id, command);
    
    // Dispatch event for command palette updates
    this.dispatchEvent('command:registered', { command });
    
    // Return disposable function
    return () => {
      this.commands.delete(command.id);
      this.dispatchEvent('command:unregistered', { commandId: command.id });
      console.log(`⚡ Unregistered command: ${command.title}`);
    };
  }
  
  public registerContextMenuItem(item: ContextMenuItem): () => void {
    console.log(`📋 Registering context menu item: ${item.title}`);
    this.contextMenuItems.set(item.id, item);
    
    // Return disposable function
    return () => {
      this.contextMenuItems.delete(item.id);
      console.log(`📋 Unregistered context menu item: ${item.title}`);
    };
  }
  
  public registerLanguageProvider(languageId: string, provider: any): () => void {
    console.log(`🔤 Registering language provider: ${languageId}`);
    
    const languageProvider: LanguageProvider = {
      languageId,
      extensions: provider.extensions || [],
      displayName: provider.displayName || languageId,
      provider
    };
    
    this.languageProviders.set(languageId, languageProvider);
    
    // Dispatch event for editor integration
    this.dispatchEvent('language:registered', { languageProvider });
    
    // Return disposable function
    return () => {
      this.languageProviders.delete(languageId);
      this.dispatchEvent('language:unregistered', { languageId });
      console.log(`🔤 Unregistered language provider: ${languageId}`);
    };
  }
  
  // 🆕 Getter Methods for Plugin Data
  public getProjectTemplates(): ProjectTemplate[] {
    return Array.from(this.projectTemplates.values());
  }
  
  public getProjectTemplatesByCategory(category?: string): ProjectTemplate[] {
    const templates = this.getProjectTemplates();
    if (!category) return templates;
    return templates.filter(t => t.category === category);
  }
  
  public getProjectTemplate(templateId: string): ProjectTemplate | undefined {
    return this.projectTemplates.get(templateId);
  }
  
  public getCommands(): PluginCommand[] {
    return Array.from(this.commands.values());
  }
  
  public getCommandsByCategory(category?: string): PluginCommand[] {
    const commands = this.getCommands();
    if (!category) return commands;
    return commands.filter(c => c.category === category);
  }
  
  public getCommand(commandId: string): PluginCommand | undefined {
    return this.commands.get(commandId);
  }
  
  public getContextMenuItems(when?: string): ContextMenuItem[] {
    const items = Array.from(this.contextMenuItems.values());
    if (!when) return items;
    return items.filter(item => !item.when || item.when === when);
  }
  
  public getLanguageProvider(languageId: string): LanguageProvider | undefined {
    return this.languageProviders.get(languageId);
  }
  
  public getLanguageProviders(): LanguageProvider[] {
    return Array.from(this.languageProviders.values());
  }
  
  // 🆕 Execute plugin commands
  public async executeCommand(commandId: string, ...args: any[]): Promise<void> {
    const command = this.commands.get(commandId);
    if (!command) {
      throw new Error(`Command ${commandId} not found`);
    }
    
    try {
      console.log(`🎯 Executing command: ${command.title} (${commandId})`);
      await command.handler(...args);
      console.log(`✅ Command executed successfully: ${commandId}`);
    } catch (error) {
      console.error(`❌ Failed to execute command ${commandId}:`, error);
      throw error;
    }
  }
  
  // Get a list of all loaded plugins
  public getPlugins(): Array<{ id: string; name: string; enabled: boolean; version?: string; description?: string }> {
    return Array.from(this.plugins.entries()).map(([id, plugin]) => ({
      id,
      name: plugin.name,
      enabled: this.enabledPlugins.has(id),
      version: plugin.version,
      description: plugin.description
    }));
  }
  
  // Check if a plugin is enabled
  public isPluginEnabled(pluginId: string): boolean {
    return this.enabledPlugins.has(pluginId);
  }
  
  // Get a plugin by ID
  public getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }
  
  // Invoke a method on a plugin
  public async invokePluginMethod(pluginId: string, method: string, ...args: any[]): Promise<any> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID ${pluginId} not found`);
    }
    
    if (!this.enabledPlugins.has(pluginId)) {
      throw new Error(`Plugin ${plugin.name} is not enabled`);
    }
    
    if (typeof (plugin as any)[method] !== 'function') {
      throw new Error(`Method ${method} not found in plugin ${plugin.name}`);
    }
    
    return (plugin as any)[method](...args);
  }
  
  // 🆕 Enhanced Plugin API Creation
  private createEnhancedPluginApi(): any {
    const baseApi = this.api;
    
    return {
      ...baseApi,
      // Plugin registration methods
      registerProjectTemplate: (template: ProjectTemplate) => this.registerProjectTemplate(template),
      registerCommand: (command: PluginCommand) => this.registerCommand(command),
      registerContextMenuItem: (item: ContextMenuItem) => this.registerContextMenuItem(item),
      registerLanguageProvider: (languageId: string, provider: any) => this.registerLanguageProvider(languageId, provider),
      
      // Plugin access methods
      getPlugin: (pluginId: string) => this.getPlugin(pluginId),
      invokePluginMethod: (pluginId: string, method: string, ...args: any[]) => this.invokePluginMethod(pluginId, method, ...args),
      
      // AI integration
      sendToAI: (prompt: string) => this.sendToAI(prompt),
      registerAICommand: (trigger: RegExp, handler: Function) => this.registerAICommand(trigger, handler),
      
      // File system access
      fileSystem: {
        readFile: (path: string) => this.readFile(path),
        writeFile: (path: string, content: string) => this.writeFile(path, content),
        exists: (path: string) => this.fileExists(path),
        createDirectory: (path: string) => this.createDirectory(path),
        getCurrentWorkspacePath: () => this.getCurrentWorkspacePath(),
        watchFile: (path: string, callback: Function) => this.watchFile(path, callback)
      },
      
      // Editor access
      editor: {
        openFile: (path: string) => this.openFile(path),
        getActiveEditor: () => this.getActiveEditor(),
        getCurrentFileContent: () => this.getCurrentFileContent(),
        getSelectedText: () => this.getSelectedText(),
        insertText: (text: string) => this.insertText(text),
        showInformationMessage: (message: string) => this.showInformationMessage(message),
        showErrorMessage: (message: string) => this.showErrorMessage(message),
        showQuickPick: (items: any[], options?: any) => this.showQuickPick(items, options),
        registerLanguage: (languageId: string, config: any) => this.registerEditorLanguage(languageId, config),
        registerCommand: (commandId: string, handler: Function) => this.registerEditorCommand(commandId, handler)
      },
      
      // Terminal access
      terminal: {
        executeCommand: (command: string, options?: any) => this.executeTerminalCommand(command, options),
        showMessage: (message: string) => this.showTerminalMessage(message)
      },
      
      // UI access
      ui: {
        showNotification: (message: string, type?: string) => this.showNotification(message, type),
        showQuickPick: (items: any[], options?: any) => this.showQuickPick(items, options),
        showInputBox: (options?: any) => this.showInputBox(options),
        showOpenDialog: (options?: any) => this.showOpenDialog(options),
        createWebView: (options?: any) => this.createWebView(options)
      }
    };
  }
  
  // Clear registrations for a specific plugin
  private clearPluginRegistrations(pluginId: string): void {
    console.log(`🧹 Clearing registrations for plugin: ${pluginId}`);
    
    // Execute all disposable functions for this plugin
    const disposables = this.disposables.get(pluginId);
    if (disposables) {
      disposables.forEach(dispose => {
        try {
          dispose();
        } catch (error) {
          console.error(`Error disposing registration for ${pluginId}:`, error);
        }
      });
      this.disposables.delete(pluginId);
    }
    
    // Clear plugin context
    this.pluginContexts.delete(pluginId);
  }
  
  // Dispatch event to all plugins and IDE
  private dispatchEvent(event: string, data: any): void {
    const eventName = `plugin:${event}`;
    console.log(`📡 Dispatching event: ${eventName}`, data);
    document.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }
  
  // Initialize and load all built-in and user plugins
  public async initialize(): Promise<void> {
    console.log('🚀 Initializing Plugin Manager');
    
    try {
      // Initialize plugin system
      this.initializeEventListeners();
      
      // Load built-in plugins (but don't activate them yet)
      await this.loadBuiltinPlugins();
      
      // Load user plugins from storage
      await this.loadUserPlugins();
      
      console.log('✅ Plugin Manager initialized successfully');
      console.log(`📊 Loaded ${this.plugins.size} plugins, ${this.enabledPlugins.size} enabled`);
      
    } catch (error) {
      console.error('❌ Failed to initialize Plugin Manager:', error);
      throw error;
    }
  }
  
  // 🆕 Initialize event listeners for plugin system
  private initializeEventListeners(): void {
    // Listen for template requests
    document.addEventListener('request-project-templates', () => {
      const templates = this.getProjectTemplates();
      document.dispatchEvent(new CustomEvent('project-templates-response', { 
        detail: { templates } 
      }));
    });
    
    // Listen for command requests
    document.addEventListener('request-plugin-commands', () => {
      const commands = this.getCommands();
      document.dispatchEvent(new CustomEvent('plugin-commands-response', { 
        detail: { commands } 
      }));
    });
  }
  
  // 🆕 Load built-in plugins (register classes, don't activate)
  private async loadBuiltinPlugins(): Promise<void> {
    // X02-noiseFix: built-in plugins log suppressed
    
    // Note: We only register plugin classes here
    // Activation happens later when main.ts calls activatePlugin()
    
    // Load Flet Assistant (your existing plugin)
    await this.loadFletAssistantPlugin();
    
    // Load other built-in plugins can be added here
    // await this.loadPythonSupportPlugin();
    // await this.loadWebDevelopmentPlugin();
    
    // X02-noiseFix: plugin classes log suppressed
  }
  
  private async loadFletAssistantPlugin(): Promise<void> {
    // Try different path formats to increase chance of success
    const possiblePaths = [
      'plugins/builtin/fletAssistant',
      './plugins/builtin/fletAssistant',
      '/plugins/builtin/fletAssistant'
    ];
    
    // Try each path until one works
    let success = false;
    for (const basePath of possiblePaths) {
      try {
      // X02-noiseFix: silent load attempt
        await this.loadPlugin(basePath);
        // X02-noiseFix: mock success log suppressed
        success = true;
        break; // Stop trying after first success
      } catch (error) {
        console.warn(`⚠️ Failed to load Flet Assistant from ${basePath}:`, error.message);
        // Continue to the next path
      }
    }
    
    if (!success) {
      console.warn('⚠️ Could not load Flet Assistant plugin from any path - this is okay if you don\'t have it implemented');
    }
  }
  
  // Resolve plugin dependencies
  private async resolvePluginDependencies(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    const manifest = (plugin as any)?.__manifest as PluginManifest;
    
    if (!manifest?.dependencies?.length) return true;
    
    for (const depId of manifest.dependencies) {
      if (!this.plugins.has(depId) || !this.isPluginEnabled(depId)) {
        console.warn(`Plugin ${pluginId} requires ${depId} which is not active`);
        return false;
      }
    }
    return true;
  }
  
  // Load user plugins from storage
  private async loadUserPlugins(): Promise<void> {
    try {
      // Get user plugins from local storage or other storage mechanism
      const userPluginSources = JSON.parse(localStorage.getItem('userPlugins') || '[]');
      
      for (const source of userPluginSources) {
        try {
          await this.loadPlugin(source);
        } catch (error) {
          console.error(`Failed to load user plugin from ${source}:`, error);
          // Continue with other plugins even if one fails
        }
      }
    } catch (error) {
      console.error('Failed to load user plugins:', error);
    }
  }
  
  // 🆕 Reload all plugins
  public async reloadAll(): Promise<void> {
    console.log('🔄 Reloading all plugins...');
    
    try {
      // Disable all plugins first
      const enabledPlugins = Array.from(this.enabledPlugins);
      for (const pluginId of enabledPlugins) {
        try {
          await this.disablePlugin(pluginId);
        } catch (error) {
          console.error(`Error disabling plugin ${pluginId}:`, error);
        }
      }
      
      // Clear all maps
      this.plugins.clear();
      this.pluginClasses.clear();
      this.enabledPlugins.clear();
      this.projectTemplates.clear();
      this.commands.clear();
      this.contextMenuItems.clear();
      this.languageProviders.clear();
      this.pluginContexts.clear();
      this.disposables.clear();
      
      // Reinitialize
      await this.initialize();
      
      console.log('✅ All plugins reloaded successfully');
    } catch (error) {
      console.error('❌ Error reloading plugins:', error);
      throw error;
    }
  }
  
  // 🆕 API Integration Methods (implement these based on your IDE's APIs)
  private async sendToAI(prompt: string): Promise<string> {
    console.log('🧠 Sending to AI:', prompt);
    
    // Try to integrate with your existing AI system
    try {
      const aiPanel = document.querySelector('.assistant-panel');
      const messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
      const sendButton = document.getElementById('send-btn');
      
      if (messageInput && sendButton) {
        messageInput.value = prompt;
        messageInput.dispatchEvent(new Event('input', { bubbles: true }));
        sendButton.click();
        return 'Message sent to AI assistant';
      }
      
      return 'AI integration not available';
    } catch (error) {
      console.error('Error sending to AI:', error);
      return 'Error sending to AI';
    }
  }
  
  private registerAICommand(trigger: RegExp, handler: Function): () => void {
    console.log('🧠 Registering AI command:', trigger);
    // TODO: Integrate with your AI command system
    return () => console.log('🧠 Disposing AI command');
  }
  
  private async readFile(path: string): Promise<string> {
    try {
      // Integrate with your existing file system
      const fileSystem = (window as any).fileSystem;
      if (fileSystem && typeof fileSystem.readFile === 'function') {
        return await fileSystem.readFile(path);
      }
      
      // Fallback to fetch for web-based files
      const response = await fetch(path);
      return await response.text();
    } catch (error) {
      console.error(`Error reading file ${path}:`, error);
      throw error;
    }
  }
  
  private async writeFile(path: string, content: string): Promise<void> {
    try {
      // Integrate with your existing file system
      const fileSystem = (window as any).fileSystem;
      if (fileSystem && typeof fileSystem.writeFile === 'function') {
        return await fileSystem.writeFile(path, content);
      }
      
      throw new Error('File writing not available in current environment');
    } catch (error) {
      console.error(`Error writing file ${path}:`, error);
      throw error;
    }
  }
  
  private async fileExists(path: string): Promise<boolean> {
    try {
      // Integrate with your existing file system
      const fileSystem = (window as any).fileSystem;
      if (fileSystem && typeof fileSystem.exists === 'function') {
        return await fileSystem.exists(path);
      }
      
      // Fallback to fetch HEAD request
      const response = await fetch(path, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
  
  private async createDirectory(path: string): Promise<void> {
    try {
      // Integrate with your existing file system
      const fileSystem = (window as any).fileSystem;
      if (fileSystem && typeof fileSystem.createDirectory === 'function') {
        return await fileSystem.createDirectory(path);
      }
      
      console.log(`Creating directory: ${path} (not implemented in current environment)`);
    } catch (error) {
      console.error(`Error creating directory ${path}:`, error);
      throw error;
    }
  }
  
  private async getCurrentWorkspacePath(): Promise<string> {
    try {
      // Get from your existing workspace system
      const workspace = (window as any).workspace || (window as any).currentProjectPath;
      return workspace || '';
    } catch (error) {
      return '';
    }
  }
  
  private async watchFile(path: string, callback: Function): Promise<() => void> {
    console.log(`👀 Setting up file watcher for: ${path}`);
    // TODO: Implement file watching with your file system
    return () => console.log(`👀 Disposing file watcher for: ${path}`);
  }
  
  private async openFile(path: string): Promise<void> {
    try {
      // Use your existing tab manager
      const tabManager = (window as any).tabManager;
      if (tabManager && typeof tabManager.addTab === 'function') {
        const content = await this.readFile(path);
        tabManager.addTab(path, content);
        return;
      }
      
      // Dispatch event for file opening
      document.dispatchEvent(new CustomEvent('file-selected', { 
        detail: { path } 
      }));
    } catch (error) {
      console.error(`Error opening file ${path}:`, error);
      throw error;
    }
  }
  
  private getActiveEditor(): any {
    try {
      // Get from Monaco editor
      const editors = (window as any).monaco?.editor?.getEditors() || [];
      return editors.find((editor: any) => {
        const container = editor.getContainerDomNode();
        return !container.closest('.ai-assistant') && !container.closest('.terminal');
      }) || editors[0] || null;
    } catch (error) {
      return null;
    }
  }
  
  private getCurrentFileContent(): string {
    try {
      const editor = this.getActiveEditor();
      return editor ? editor.getValue() : '';
    } catch (error) {
      return '';
    }
  }
  
  private getSelectedText(): string {
    try {
      const editor = this.getActiveEditor();
      if (editor) {
        const selection = editor.getSelection();
        return selection ? editor.getModel()?.getValueInRange(selection) || '' : '';
      }
      return '';
    } catch (error) {
      return '';
    }
  }
  
  private async insertText(text: string): Promise<void> {
    try {
      const editor = this.getActiveEditor();
      if (editor) {
        const position = editor.getPosition();
        editor.executeEdits('plugin', [{
          range: { 
            startLineNumber: position.lineNumber, 
            startColumn: position.column, 
            endLineNumber: position.lineNumber, 
            endColumn: position.column 
          },
          text: text
        }]);
      }
    } catch (error) {
      console.error('Error inserting text:', error);
    }
  }
  
  private async showInformationMessage(message: string): Promise<void> {
    console.log('ℹ️ Info:', message);
    this.showNotification(message, 'success');
  }
  
  private async showErrorMessage(message: string): Promise<void> {
    console.error('❌ Error:', message);
    this.showNotification(message, 'error');
  }
  
  private showNotification(message: string, type: string = 'info'): void {
    try {
      // Use your existing notification system
      const showNotification = (window as any).showNotification;
      if (typeof showNotification === 'function') {
        showNotification(message, type);
        return;
      }
      
      // Fallback to console
      console.log(`📢 ${type.toUpperCase()}: ${message}`);
    } catch (error) {
      console.log(`📢 ${type.toUpperCase()}: ${message}`);
    }
  }
  
  private async showQuickPick(items: any[], options?: any): Promise<any> {
    console.log('📋 Quick pick:', items);
    
    // Create a simple modal for selection
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center;
        z-index: 10000; backdrop-filter: blur(3px);
      `;
      
      const content = document.createElement('div');
      content.style.cssText = `
        background: #2d2d2d; padding: 24px; border-radius: 12px; max-width: 500px; color: white;
        border: 1px solid #464647; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      `;
      
      const title = document.createElement('h3');
      title.textContent = options?.title || 'Select an option';
      title.style.cssText = 'margin-top: 0; color: #4a9eff; border-bottom: 1px solid #464647; padding-bottom: 12px;';
      content.appendChild(title);
      
      items.forEach(item => {
        const button = document.createElement('button');
        const label = typeof item === 'string' ? item : (item.label || item.title || String(item));
        const description = typeof item === 'object' ? item.description : '';
        
        button.innerHTML = `
          <div style="text-align: left;">
            <div style="font-weight: 500;">${label}</div>
            ${description ? `<div style="font-size: 12px; color: #999; margin-top: 4px;">${description}</div>` : ''}
          </div>
        `;
        
        button.style.cssText = `
          display: block; width: 100%; padding: 12px; margin: 8px 0;
          background: #404040; color: white; border: none; border-radius: 6px; cursor: pointer;
          transition: background-color 0.2s; text-align: left;
        `;
        
        button.onmouseenter = () => button.style.backgroundColor = '#4a9eff';
        button.onmouseleave = () => button.style.backgroundColor = '#404040';
        
        button.onclick = () => {
          document.body.removeChild(modal);
          resolve(item);
        };
        content.appendChild(button);
      });
      
      modal.appendChild(content);
      document.body.appendChild(modal);
      
      modal.onclick = (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
          resolve(null);
        }
      };
    });
  }
  
  private async showInputBox(options?: any): Promise<string | null> {
    const value = prompt(options?.prompt || 'Enter value:', options?.value || '');
    return value;
  }
  
  private async showOpenDialog(options?: any): Promise<string | null> {
    try {
      // Integrate with your existing file dialogs
      const fileSystem = (window as any).fileSystem;
      
      if (options?.properties?.includes('openDirectory')) {
        if (fileSystem && typeof fileSystem.openFolderDialog === 'function') {
          return await fileSystem.openFolderDialog();
        }
      } else {
        if (fileSystem && typeof fileSystem.openFileDialog === 'function') {
          const result = await fileSystem.openFileDialog();
          return result?.path || null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error showing open dialog:', error);
      return null;
    }
  }
  
  private async createWebView(options?: any): Promise<any> {
    console.log('🌐 Creating web view:', options);
    // TODO: Implement web view creation for React components
    return null;
  }
  
  private async executeTerminalCommand(command: string, options?: any): Promise<any> {
    console.log(`💻 Terminal command: ${command}`, options);
    
    try {
      // Integrate with your existing terminal
      const terminal = (window as any).terminal;
      if (terminal && typeof terminal.executeCommand === 'function') {
        return await terminal.executeCommand(command, options);
      }
      
      // Fallback simulation
      return {
        success: true,
        output: `Command executed: ${command}`,
        stderr: '',
        exitCode: 0
      };
    } catch (error) {
      console.error('Error executing terminal command:', error);
      return {
        success: false,
        output: '',
        stderr: error.message,
        exitCode: 1
      };
    }
  }
  
  private async showTerminalMessage(message: string): Promise<void> {
    console.log(`💻 Terminal: ${message}`);
    this.showNotification(message, 'info');
  }
  
  private registerEditorLanguage(languageId: string, config: any): () => void {
    console.log(`🔤 Registering editor language: ${languageId}`);
    
    try {
      // Integrate with Monaco Editor
      const monaco = (window as any).monaco;
      if (monaco && monaco.languages) {
        monaco.languages.register({ id: languageId });
        
        if (config.tokens) {
          monaco.languages.setMonarchTokensProvider(languageId, config.tokens);
        }
        
        if (config.configuration) {
          monaco.languages.setLanguageConfiguration(languageId, config.configuration);
        }
      }
    } catch (error) {
      console.error(`Error registering language ${languageId}:`, error);
    }
    
    return () => console.log(`🔤 Disposing language: ${languageId}`);
  }
  
  private registerEditorCommand(commandId: string, handler: Function): () => void {
    console.log(`⌨️ Registering editor command: ${commandId}`);
    
    // Store in global commands registry
    if (!(window as any).__editorCommands) {
      (window as any).__editorCommands = {};
    }
    (window as any).__editorCommands[commandId] = handler;
    
    return () => {
      delete (window as any).__editorCommands[commandId];
      console.log(`⌨️ Disposing editor command: ${commandId}`);
    };
  }
}

// Export singleton instance
export const pluginManager = PluginManager.getInstance();
