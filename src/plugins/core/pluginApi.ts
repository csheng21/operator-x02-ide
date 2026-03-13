// src/plugins/core/pluginApi.ts

import { EditorApi } from '../api/editorApi';
import { FileSystemApi } from '../api/fileSystemApi';
import { UiApi } from '../api/uiApi';
import { TerminalApi } from '../api/terminalApi';
import { PluginApi } from './pluginInterface';

// Create a plugin API instance with all available APIs
export function createPluginApi(pluginManager: any): PluginApi {
  // Initialize sub-APIs
  const editorApi = new EditorApi();
  const fileSystemApi = new FileSystemApi();
  const uiApi = new UiApi();
  const terminalApi = new TerminalApi();
  
  // Plugin storage (per-plugin)
  const pluginStorage = new Map<string, Map<string, any>>();
  
  const getCurrentPluginId = (): string => {
    // This would be set during plugin activation
    return (window as any).__currentPluginId || 'unknown';
  };
  
  // Create the API object
  const api: PluginApi = {
    // Expose sub-APIs
    editor: editorApi,
    fileSystem: fileSystemApi,
    ui: uiApi,
    terminal: terminalApi,
    
    // Event subscription
    on: (event: string, callback: (...args: any[]) => void) => {
      document.addEventListener(`plugin:${event}`, ((e: CustomEvent) => {
        callback(...(e.detail || []));
      }) as EventListener);
    },
    
    off: (event: string, callback: (...args: any[]) => void) => {
      document.removeEventListener(`plugin:${event}`, callback as EventListener);
    },
    
    // Plugin data storage
    storage: {
      get: (key: string) => {
        const pluginId = getCurrentPluginId();
        if (!pluginStorage.has(pluginId)) {
          return undefined;
        }
        return pluginStorage.get(pluginId)?.get(key);
      },
      
      set: (key: string, value: any) => {
        const pluginId = getCurrentPluginId();
        if (!pluginStorage.has(pluginId)) {
          pluginStorage.set(pluginId, new Map());
        }
        pluginStorage.get(pluginId)?.set(key, value);
      }
    },
    
    // Plugin communication
    invoke: async (pluginId: string, method: string, ...args: any[]) => {
      return pluginManager.invokePluginMethod(pluginId, method, ...args);
    }
  };
  
  return api;
}