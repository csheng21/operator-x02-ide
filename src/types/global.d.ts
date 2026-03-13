// types/global.d.ts - Global type definitions for the AI IDE

declare global {
  interface Window {
    // Tauri API
    __TAURI__?: {
      core: {
        invoke: (command: string, args?: any) => Promise<any>;
      };
      fs: {
        readFile: (path: string, options?: { encoding?: string }) => Promise<Uint8Array | string>;
        writeFile: (path: string, data: string | Uint8Array) => Promise<void>;
        readDir: (path: string, options?: { recursive?: boolean }) => Promise<any[]>;
        createDir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
        removeFile: (path: string) => Promise<void>;
        removeDir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
        exists: (path: string) => Promise<boolean>;
      };
      shell: {
        open: (path: string) => Promise<void>;
      };
      dialog: {
        open: (options?: any) => Promise<string | string[] | null>;
        save: (options?: any) => Promise<string | null>;
        message: (message: string, options?: any) => Promise<void>;
        ask: (message: string, options?: any) => Promise<boolean>;
        confirm: (message: string, options?: any) => Promise<boolean>;
      };
      path: {
        join: (...paths: string[]) => Promise<string>;
        dirname: (path: string) => Promise<string>;
        basename: (path: string) => Promise<string>;
        extname: (path: string) => Promise<string>;
      };
      os: {
        platform: () => Promise<string>;
        arch: () => Promise<string>;
        type: () => Promise<string>;
        version: () => Promise<string>;
        tempdir: () => Promise<string>;
        homedir: () => Promise<string>;
      };
    };

    // Monaco Editor
    monaco?: {
      editor: {
        create: (element: HTMLElement, options?: any) => any;
        createModel: (value: string, language?: string, uri?: any) => any;
        setModelLanguage: (model: any, language: string) => void;
        getModels: () => any[];
        defineTheme: (name: string, theme: any) => void;
        setTheme: (name: string) => void;
        onDidCreateEditor: (callback: (editor: any) => void) => void;
        onDidCreateModel: (callback: (model: any) => void) => void;
      };
      languages: {
        register: (language: { id: string; extensions?: string[]; aliases?: string[] }) => void;
        setMonarchTokensProvider: (languageId: string, provider: any) => void;
        registerCompletionItemProvider: (languageId: string, provider: any) => void;
        registerHoverProvider: (languageId: string, provider: any) => void;
        registerDefinitionProvider: (languageId: string, provider: any) => void;
        registerReferenceProvider: (languageId: string, provider: any) => void;
        registerDocumentFormattingEditProvider: (languageId: string, provider: any) => void;
        registerSignatureHelpProvider: (languageId: string, provider: any) => void;
        CompletionItemKind: any;
        CompletionItemInsertTextRule: any;
      };
      KeyMod: any;
      KeyCode: any;
      Range: any;
      Selection: any;
      Position: any;
      Uri: any;
    };

    // File System APIs
    fileSystem?: {
      saveFile: (content: string, defaultPath?: string, fileName?: string) => Promise<string | null>;
      createFile: (path: string, content?: string) => Promise<void>;
      readFile: (path: string) => Promise<string | null>;
      listFiles: (directory: string) => Promise<string[]>;
      openFolderDialog: () => Promise<string | null>;
      openFileDialog: () => Promise<{ content: string; path: string } | null>;
      deleteFile: (path: string) => Promise<void>;
      createDirectory: (path: string) => Promise<void>;
      fileExists: (path: string) => Promise<boolean>;
      isDirectory: (path: string) => Promise<boolean>;
      revealInExplorer: (path: string) => Promise<void>;
      getSystemInfo: () => Promise<any>;
      showMessageDialog: (title: string, message: string, kind?: string) => Promise<void>;
      isTauriAvailable: () => boolean;
      [key: string]: any;
    };

    // Tab Manager
    tabManager?: {
      tabs: any[];
      activeTab: any;
      createTab: (options: any) => any;
      closeTab: (tabId: string) => void;
      getActiveTab: () => any;
      switchToTab: (tabId: string) => void;
      updateTab: (tabId: string, updates: any) => void;
      [key: string]: any;
    };

    // Plugin System
    pluginManager?: {
      plugins: Map<string, any>;
      loadPlugin: (pluginId: string) => Promise<void>;
      unloadPlugin: (pluginId: string) => Promise<void>;
      getPlugin: (pluginId: string) => any;
      listPlugins: () => any[];
      [key: string]: any;
    };

    // Terminal
    terminal?: {
      execute: (command: string) => Promise<string>;
      clear: () => void;
      write: (text: string) => void;
      [key: string]: any;
    };

    // AI Assistant
    aiAssistant?: {
      sendMessage: (message: string) => Promise<string>;
      analyzeCode: (code: string) => Promise<any>;
      generateCode: (prompt: string) => Promise<string>;
      [key: string]: any;
    };

    // Camera
    camera?: {
      start: () => Promise<void>;
      stop: () => Promise<void>;
      capture: () => Promise<string>;
      [key: string]: any;
    };

    // Global event handlers
    showNotification?: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
    showDialog?: (options: any) => Promise<any>;
    showConfirm?: (message: string) => Promise<boolean>;
    
    // Browser APIs
    showDirectoryPicker?: () => Promise<any>;
    showOpenFilePicker?: (options?: any) => Promise<any[]>;
    showSaveFilePicker?: (options?: any) => Promise<any>;
    
    // Other global variables
    [key: string]: any;
  }

  // Node.js globals (for when running in Node environment)
  declare const process: {
    env: { [key: string]: string | undefined };
    platform: string;
    argv: string[];
    cwd: () => string;
    exit: (code?: number) => void;
  };

  // Vite globals
  declare const __DEV__: boolean;
  declare const __PROD__: boolean;
  declare const import: {
    meta: {
      env: { [key: string]: any };
      hot?: {
        accept: (deps?: any, callback?: (modules: any) => void) => void;
        dispose: (callback: () => void) => void;
      };
    };
  };
}

// Common interfaces used throughout the application
export interface FileInfo {
  name: string;
  path: string;
  size?: number;
  isDirectory: boolean;
  lastModified?: Date;
  extension?: string;
  content?: string;
}

export interface TabInfo {
  id: string;
  title: string;
  filePath?: string;
  content?: string;
  isModified?: boolean;
  isActive?: boolean;
  language?: string;
  icon?: string;
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  dependencies?: string[];
  main?: string;
  contributes?: {
    commands?: any[];
    languages?: any[];
    themes?: any[];
    snippets?: any[];
  };
}

export interface ProjectInfo {
  name: string;
  path: string;
  type: string;
  description?: string;
  language?: string;
  framework?: string;
  dependencies?: string[];
  scripts?: { [key: string]: string };
}

export interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  username: string;
  homedir: string;
  tempdir: string;
  hostname?: string;
}

export interface NotificationOptions {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
  actions?: Array<{
    title: string;
    action: () => void;
  }>;
}

export interface DialogOptions {
  title?: string;
  message?: string;
  type?: 'info' | 'warning' | 'error' | 'question';
  buttons?: string[];
  defaultButton?: number;
  cancelButton?: number;
}

export interface TerminalOptions {
  cwd?: string;
  env?: { [key: string]: string };
  shell?: string;
  encoding?: string;
}

export interface EditorOptions {
  language?: string;
  theme?: string;
  fontSize?: number;
  fontFamily?: string;
  wordWrap?: boolean;
  minimap?: boolean;
  lineNumbers?: boolean;
  folding?: boolean;
  autoIndent?: boolean;
  formatOnSave?: boolean;
  tabSize?: number;
  insertSpaces?: boolean;
}

export interface CameraOptions {
  width?: number;
  height?: number;
  facingMode?: 'user' | 'environment';
  deviceId?: string;
  audio?: boolean;
  video?: boolean;
}

// Plugin API interfaces
export interface PluginApi {
  // Core APIs
  fs: {
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<void>;
    exists: (path: string) => Promise<boolean>;
    readDir: (path: string) => Promise<string[]>;
    createDir: (path: string) => Promise<void>;
    remove: (path: string) => Promise<void>;
  };
  
  editor: {
    getActiveEditor: () => any;
    createEditor: (element: HTMLElement, options?: any) => any;
    insertSnippet: (snippet: string) => void;
    getSelection: () => string;
    replace: (text: string) => void;
    format: () => void;
    save: () => Promise<void>;
  };
  
  terminal: {
    execute: (command: string) => Promise<string>;
    write: (text: string) => void;
    clear: () => void;
    on: (event: string, callback: (data: any) => void) => void;
    off: (event: string, callback: (data: any) => void) => void;
  };
  
  ui: {
    showNotification: (options: NotificationOptions) => void;
    showDialog: (options: DialogOptions) => Promise<any>;
    registerCommand: (id: string, title: string, callback: () => void) => void;
    registerView: (id: string, factory: () => HTMLElement) => void;
    showView: (id: string) => void;
    hideView: (id: string) => void;
    createStatusBarItem: (text: string, priority?: number) => any;
  };
  
  workspace: {
    getRootPath: () => string | null;
    findFiles: (pattern: string) => Promise<string[]>;
    openTextDocument: (path: string) => Promise<any>;
    saveTextDocument: (document: any) => Promise<void>;
    onDidChangeTextDocument: (callback: (event: any) => void) => void;
    onDidSaveTextDocument: (callback: (document: any) => void) => void;
  };
  
  languages: {
    registerCompletionItemProvider: (languageId: string, provider: any) => void;
    registerHoverProvider: (languageId: string, provider: any) => void;
    registerDefinitionProvider: (languageId: string, provider: any) => void;
    registerFormattingEditProvider: (languageId: string, provider: any) => void;
  };
  
  // Utility functions
  utils: {
    showMessage: (message: string, type?: string) => void;
    getConfiguration: (section?: string) => any;
    setConfiguration: (section: string, value: any) => void;
    debounce: (func: Function, wait: number) => Function;
    throttle: (func: Function, limit: number) => Function;
  };
}

// Make sure to export the global augmentation
export {};