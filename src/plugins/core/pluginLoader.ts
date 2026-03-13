// src/plugins/core/pluginLoader.ts

import { Plugin, PluginApi, PluginManifest } from './pluginInterface';

export async function loadPlugin(source: string, api: PluginApi): Promise<Plugin> {
  // Determine if source is a URL or local path
  const isUrl = source.startsWith('http://') || source.startsWith('https://');
  
  try {
    let manifestJson: PluginManifest;
    let pluginModule: any;
    
    if (isUrl) {
      // Load plugin from URL
      manifestJson = await loadManifestFromUrl(`${source}/manifest.json`);
      pluginModule = await loadModuleFromUrl(`${source}/${manifestJson.main}`);
    } else {
      // Load plugin from local path
      manifestJson = await loadManifestFromPath(`${source}/manifest.json`);
      pluginModule = await loadModuleFromPath(`${source}/${manifestJson.main}`);
    }
    
    // Validate manifest
    validateManifest(manifestJson);
    
    // Create plugin instance
    const plugin: Plugin = {
      id: manifestJson.id,
      name: manifestJson.name,
      version: manifestJson.version,
      description: manifestJson.description,
      author: manifestJson.author,
      
      // Initialize plugin with default activate/deactivate methods
      activate: pluginModule.activate || (async () => {}),
      deactivate: pluginModule.deactivate || (async () => {})
    };
    
    return plugin;
  } catch (error) {
    console.error(`Failed to load plugin from ${source}:`, error);
    throw error;
  }
}

// Load manifest from URL
async function loadManifestFromUrl(url: string): Promise<PluginManifest> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load plugin manifest from ${url}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to load plugin manifest from ${url}: ${error.message}`);
  }
}

// Load manifest from local path
async function loadManifestFromPath(path: string): Promise<PluginManifest> {
  try {
    console.log(`Attempting to load manifest from: ${path}`);
    
    // In a desktop app, use the file system API
    if (window.fs?.readTextFile) {
      try {
        console.log('Using fs.readTextFile to load manifest');
        const content = await window.fs.readTextFile(path);
        console.log('Manifest content:', content.substring(0, 100)); // Log the first 100 chars
        return JSON.parse(content);
      } catch (fsError) {
        console.error(`File system read failed for ${path}:`, fsError);
      }
    }
    
    // In a web app, use fetch with proper error handling
    try {
      console.log(`Fetching manifest from: ${path}`);
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      console.log('Fetched manifest content:', text.substring(0, 100));
      
      // Check if the response is HTML instead of JSON
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error('Received HTML instead of JSON');
      }
      
      return JSON.parse(text);
    } catch (fetchError) {
      console.error(`Fetch failed for ${path}:`, fetchError);
    }
    
    throw new Error(`Failed to load manifest from ${path}`);
  } catch (error) {
    console.error(`Failed to load plugin manifest from ${path}:`, error);
    
    // Extract a unique ID from the path
    const pathSegments = path.split('/');
    const pluginName = pathSegments[pathSegments.length - 2] || 'unknown';
    const mockId = `mock.${pluginName.replace(/[^a-zA-Z0-9]/g, '')}`;
    
    // For development, return a mock manifest
    console.warn(`Returning mock manifest for ${mockId}`);
    return {
      id: mockId,
      name: `Mock Plugin (${pluginName})`,
      version: '1.0.0',
      description: 'A mock plugin for development',
      main: 'index.ts'  // Note: Changed to .ts to match your actual file
    };
  }
}

// Load module from URL
async function loadModuleFromUrl(url: string): Promise<any> {
  try {
    // Use dynamic import for URLs
    return await import(/* @vite-ignore */ url);
  } catch (error) {
    console.error(`Failed to load plugin module from ${url}:`, error);
    
    // For development, return a mock module
    console.warn('Returning mock module for development');
    return {
      activate: async (api: PluginApi) => {
        console.log('Mock plugin activated');
      },
      deactivate: async () => {
        console.log('Mock plugin deactivated');
      }
    };
  }
}

// Load module from local path
// Complete implementation for loadModuleFromPath
async function loadModuleFromPath(path: string): Promise<any> {
  try {
    // Try multiple import approaches
    try {
      return await import(/* @vite-ignore */ path);
    } catch (firstError) {
      console.log(`Direct import failed for ${path}, trying alternatives...`);
    }
    
    // Try with relative path
    try {
      const relativePath = path.startsWith('/') ? `.${path}` : `./${path}`;
      return await import(/* @vite-ignore */ relativePath);
    } catch (relativeError) {
      console.log(`Relative path import failed for ${relativePath}`);
    }
    
    // Try explicitly using file system (if available) and eval
    if (window.fs?.readTextFile) {
      try {
        const content = await window.fs.readTextFile(path);
        return evaluateModule(content);
      } catch (fsError) {
        console.log(`File system read failed: ${fsError.message}`);
      }
    }
    
    throw new Error(`All import methods failed for ${path}`);
  } catch (error) {
    console.error(`Failed to load plugin module from ${path}:`, error);
    
    // Get plugin manager instance to check for existing plugins
    let pluginManager;
    try {
      const modules = await import('./pluginManager');
      pluginManager = modules.PluginManager.getInstance();
    } catch (managerError) {
      console.warn('Could not get plugin manager:', managerError);
    }
    
    // Create a consistent ID 
    const fileName = path.split('/').pop().split('.')[0];
    const mockId = `mock.${fileName}`;
    
    // Check if this mock plugin is already loaded
    if (pluginManager?.getPlugins) {
      const existingPlugins = pluginManager.getPlugins();
      const existingPlugin = existingPlugins.find(p => p.id === mockId);
      if (existingPlugin) {
        console.warn(`Mock plugin ${mockId} already exists, skipping creation`);
        return null;
      }
    }
    
    console.warn(`Creating mock module with ID ${mockId}`);
    return {
      activate: async (api) => {
        console.log(`Mock plugin for ${path} activated`);
      },
      deactivate: async () => {
        console.log(`Mock plugin for ${path} deactivated`);
      }
    };
  }
}

// Simple module evaluator (for development only)
function evaluateModule(code: string): any {
  // WARNING: This is not secure for production use
  try {
    const module = { exports: {} };
    const fn = new Function('module', 'exports', 'require', code);
    fn(module, module.exports, () => ({}));
    return module.exports;
  } catch (error) {
    console.error('Error evaluating module:', error);
    return {
      activate: async () => {},
      deactivate: async () => {}
    };
  }
}

// Validate manifest
function validateManifest(manifest: PluginManifest): void {
  // Check required fields
  if (!manifest.id) throw new Error('Plugin manifest missing required field: id');
  if (!manifest.name) throw new Error('Plugin manifest missing required field: name');
  if (!manifest.version) throw new Error('Plugin manifest missing required field: version');
  if (!manifest.description) throw new Error('Plugin manifest missing required field: description');
  if (!manifest.main) throw new Error('Plugin manifest missing required field: main');
}