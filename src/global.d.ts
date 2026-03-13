// src/global.d.ts
// Central type declarations for global variables

/// <reference types="vite/client" />

// Monaco Editor
declare const monaco: typeof import('monaco-editor');

// Tauri API
declare global {
  interface Window {
    __TAURI__?: any;
    __TAURI_IPC__?: (message: unknown) => void;
    monaco?: typeof import('monaco-editor');
    
    // Project globals
    currentFolderPath?: string;
    callGenericAPI?: (...args: any[]) => Promise<any>;
    openFileInEditor?: (path: string) => void;
    conversationManager?: any;
    fileSystem?: any;
    activateSVN?: () => void;
    scanFileExplorer?: () => void;
    __lastProject?: any;
    __currentPluginId?: string;
    __nextUserResponse?: any;
    __csharpTemplates?: any;
    CSharpSupportPlugin?: any;
    fileHandleStore?: Map<string, FileSystemFileHandle>;
  }
}

// Vite HMR
interface ImportMeta {
  hot?: {
    accept: (callback?: (mod: any) => void) => void;
    dispose: (callback: (data: any) => void) => void;
    data: any;
  };
}

// SystemInfo from Rust backend
interface SystemInfo {
  username: string;
  home_dir: string;
  documents_dir: string;
  downloads_dir: string;
  app_data_dir: string;
  temp_dir: string;
  hostname: string | null;
  os_name: string;
  os_version: string | null;
  exe_dir: string | null;
}

// Message type
interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

// Notification type
type NotificationType = 'error' | 'success' | 'info' | 'warning';

// API Provider type
type ApiProvider = 
  | 'deepseek' 
  | 'claude' 
  | 'openai' 
  | 'gemini' 
  | 'cohere' 
  | 'custom' 
  | 'operator_x02' 
  | 'groq' 
  | 'ollama'
  | 'kimi';

export {};
