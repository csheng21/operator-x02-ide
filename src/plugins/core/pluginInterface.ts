// src/plugins/core/pluginInterface.ts

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  
  // Lifecycle hooks
  activate: (api: PluginApi) => Promise<void> | void;
  deactivate: () => Promise<void> | void;
}

export interface PluginApi {
  // Core services
  editor: EditorApi;
  fileSystem: FileSystemApi;
  ui: UiApi;
  terminal: TerminalApi;
  
  // Event subscription
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
  
  // Plugin data storage
  storage: {
    get: (key: string) => any;
    set: (key: string, value: any) => void;
  };
  
  // Plugin communication
  invoke: (pluginId: string, method: string, ...args: any[]) => Promise<any>;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  main: string;
  dependencies?: string[];
  extensionPoints?: string[];
  contributes?: {
    commands?: PluginCommand[];
    menus?: PluginMenu[];
    views?: PluginView[];
    // Other contribution points
  };
}

// Additional interfaces for extension points
export interface PluginCommand {
  id: string;
  title: string;
  shortcut?: string;
  callback: string; // Name of callback function in plugin
}

export interface PluginMenu {
  id: string;
  location: string; // e.g., 'menubar', 'contextmenu', etc.
  items: PluginMenuItem[];
}

export interface PluginMenuItem {
  commandId: string;
  label?: string;
  icon?: string;
  group?: string;
  order?: number;
}

export interface PluginView {
  id: string;
  name: string;
  location: string; // e.g., 'sidebar', 'panel', etc.
}